// Render pipeline: each output frame is the average of several sub-frames
// (motion blur + anti-aliasing), followed by bloom, anamorphic streaks,
// tone mapping, vignette and film grain.

import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VS = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const mat = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({
  vertexShader: VS, fragmentShader, uniforms, depthTest: false, depthWrite: false, ...extra,
});

const target = (w, h, depth = false) => new THREE.WebGLRenderTarget(
  Math.max(2, Math.round(w)), Math.max(2, Math.round(h)),
  { type: THREE.HalfFloatType, depthBuffer: depth, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter },
);

const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, transparent: true };

export const POST_DEFAULTS = {
  exposure: 1.0,
  bloom: 0.55,          // bloom strength
  bloomThreshold: 0.85,
  streak: 0.35,         // anamorphic streak strength
  vignette: 0.9,
  grain: 0.045,
  ca: 0.6,              // chromatic aberration
  flash: 0.0,           // additive flash (0..n)
  flashColor: [1.0, 0.95, 0.88],
  fade: 1.0,            // multiply (1 = none, 0 = black)
  aces: 1.0,            // 1 = filmic tone map, 0 = straight
  zoomBlur: 0.0,
  hazeAmt: 0.0, hazeY0: 0.0, hazeY1: 1.0,
  contrast: 0.12,
  saturation: 1.06,
  tint: 0.5,            // split-tone amount
  overlayGain: 1.0,
};

export class Pipeline {
  constructor(renderer, W, H) {
    this.renderer = renderer; this.W = W; this.H = H;
    this.quad = new FullScreenQuad(null);
    this.rtScene = target(W, H, true);
    this.rtAccum = target(W, H);

    this.accMat = mat(/* glsl */`
      uniform sampler2D tDiffuse; uniform float weight; varying vec2 vUv;
      void main() { gl_FragColor = vec4(min(texture2D(tDiffuse, vUv).rgb, vec3(40.0)) * weight, 1.0); }`,
    { tDiffuse: { value: null }, weight: { value: 1 } }, ADD);

    this.overlayMat = mat(/* glsl */`
      uniform sampler2D tOverlay; uniform float gain; varying vec2 vUv;
      void main() { vec4 c = texture2D(tOverlay, vUv); gl_FragColor = vec4(c.rgb * gain, c.a); }`,
    { tOverlay: { value: null }, gain: { value: 1 } }, { transparent: true, blending: THREE.NormalBlending });

    // ---- bloom chain -------------------------------------------------
    this.mips = [];
    let w = W / 2, h = H / 2;
    for (let i = 0; i < 6; i++) { this.mips.push(target(w, h)); w /= 2; h /= 2; }
    this.preMat = mat(/* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
      vec3 pf(vec2 uv) {
        vec3 c = min(texture2D(tDiffuse, uv).rgb, vec3(30.0));
        float br = max(c.r, max(c.g, c.b));
        float knee = threshold * 0.6;
        float soft = clamp(br - threshold + knee, 0.0, 2.0 * knee);
        soft = soft * soft / (4.0 * knee + 1e-4);
        return c * max(soft, br - threshold) / max(br, 1e-4);
      }
      void main() {
        vec3 s = pf(vUv + texel * vec2(-0.5, -0.5)) + pf(vUv + texel * vec2(0.5, -0.5))
               + pf(vUv + texel * vec2(-0.5, 0.5)) + pf(vUv + texel * vec2(0.5, 0.5));
        gl_FragColor = vec4(s * 0.25, 1.0);
      }`, { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 1 } });
    this.downMat = mat(/* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
      void main() {
        vec3 s = texture2D(tDiffuse, vUv).rgb * 4.0;
        s += texture2D(tDiffuse, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tDiffuse, vUv + texel * vec2(1.0, -1.0)).rgb;
        s += texture2D(tDiffuse, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tDiffuse, vUv + texel * vec2(1.0, 1.0)).rgb;
        gl_FragColor = vec4(s / 8.0, 1.0);
      }`, { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() } });
    this.upMat = mat(/* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 texel; uniform float weight; varying vec2 vUv;
      void main() {
        vec4 d = texel.xyxy * vec4(1.0, 1.0, -1.0, 0.0);
        vec3 s = texture2D(tDiffuse, vUv - d.xy).rgb + texture2D(tDiffuse, vUv - d.zy).rgb
               + texture2D(tDiffuse, vUv + d.zy).rgb + texture2D(tDiffuse, vUv + d.xy).rgb;
        s += 2.0 * (texture2D(tDiffuse, vUv - d.wy).rgb + texture2D(tDiffuse, vUv + d.wy).rgb
               + texture2D(tDiffuse, vUv - d.xw).rgb + texture2D(tDiffuse, vUv + d.xw).rgb);
        s += 4.0 * texture2D(tDiffuse, vUv).rgb;
        gl_FragColor = vec4(s / 16.0 * weight, 1.0);
      }`, { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, weight: { value: 1 } }, ADD);

    // ---- anamorphic streak -------------------------------------------
    this.rtStreakA = target(W / 8, H / 8);
    this.rtStreakB = target(W / 8, H / 8);
    this.streakMat = mat(/* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 texel; uniform float spread; varying vec2 vUv;
      void main() {
        vec3 s = vec3(0.0); float wsum = 0.0;
        for (int i = -8; i <= 8; i++) {
          float f = float(i); float w = exp(-f * f / 18.0);
          s += texture2D(tDiffuse, vUv + vec2(f * spread * texel.x, 0.0)).rgb * w; wsum += w;
        }
        gl_FragColor = vec4(s / wsum, 1.0);
      }`, { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, spread: { value: 1 } });

    // ---- final composite ---------------------------------------------
    this.finalMat = mat(/* glsl */`
      precision highp float;
      uniform sampler2D tDiffuse, tBloom, tStreak;
      uniform vec2 res;
      uniform float time, exposure, bloom, streak, vignette, grain, ca, flash, fade, aces, zoomBlur;
      uniform float hazeAmt, hazeY0, hazeY1, contrast, saturation, tint;
      uniform vec3 flashColor;
      varying vec2 vUv;

      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      vec3 tonemap(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      vec3 toSRGB(vec3 c) { return mix(12.92 * c, 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

      vec3 fetch(vec2 uv) {
        return texture2D(tDiffuse, uv).rgb + texture2D(tBloom, uv).rgb * bloom
             + texture2D(tStreak, uv).rgb * streak * vec3(0.55, 0.75, 1.0);
      }

      void main() {
        vec2 uv = vUv;
        // heat haze
        if (hazeAmt > 0.0) {
          float band = smoothstep(hazeY0, hazeY0 + 0.08, uv.y) * (1.0 - smoothstep(hazeY1 - 0.25, hazeY1, uv.y));
          vec2 q = vec2(uv.x * 14.0, uv.y * 9.0 - time * 1.6);
          vec2 n = vec2(vnoise(q) - 0.5, vnoise(q + 17.3) - 0.5) + 0.5 * vec2(vnoise(q * 2.3 + 4.1) - 0.5, vnoise(q * 2.3 + 9.7) - 0.5);
          uv += n * hazeAmt * band * 0.012;
        }
        vec2 d = uv - 0.5;
        float r2 = dot(d, d);
        vec3 col;
        if (zoomBlur > 0.0) {
          col = vec3(0.0);
          float j = hash(gl_FragCoord.xy + time);
          for (int i = 0; i < 14; i++) {
            float f = (float(i) + j) / 14.0;
            col += fetch(0.5 + d * (1.0 - zoomBlur * f));
          }
          col /= 14.0;
        } else {
          vec2 o = d * r2 * ca * 0.012;
          col.r = fetch(uv + o).r; col.g = fetch(uv).g; col.b = fetch(uv - o).b;
        }
        col *= exposure;
        col += flashColor * flash;

        // vignette (elliptical, follows the 9:16 frame)
        vec2 v = d * vec2(1.25, 0.95);
        float vig = smoothstep(0.82, 0.18, length(v));
        col *= mix(1.0, vig, vignette);

        vec3 mapped = tonemap(col);
        col = mix(clamp(col, 0.0, 1.0), mapped, aces);

        // grade: gentle S-curve, split tone (cool shadows / warm highlights), saturation
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(col, col * col * (3.0 - 2.0 * col), contrast);
        col += tint * (vec3(-0.012, 0.000, 0.022) * (1.0 - smoothstep(0.0, 0.45, l)) + vec3(0.016, 0.006, -0.014) * smoothstep(0.45, 1.0, l));
        l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, saturation);
        col *= fade;

        col = toSRGB(clamp(col, 0.0, 1.0));

        // film grain (slightly soft, stronger in the mids)
        vec2 gp = gl_FragCoord.xy / max(res.y / 1920.0, 0.5);
        float g = (hash(floor(gp / 1.6) + fract(time * 7.13) * 311.0) + hash(floor(gp) + fract(time * 3.71) * 173.0)) * 0.5 - 0.5;
        float lum2 = dot(col, vec3(0.299, 0.587, 0.114));
        col += g * grain * (0.55 + 0.9 * (1.0 - abs(lum2 * 2.0 - 1.0)));
        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
    {
      tDiffuse: { value: this.rtAccum.texture }, tBloom: { value: this.mips[0].texture }, tStreak: { value: this.rtStreakB.texture },
      res: { value: new THREE.Vector2(W, H) }, time: { value: 0 },
      exposure: { value: 1 }, bloom: { value: 0.5 }, streak: { value: 0.3 }, vignette: { value: 0.9 }, grain: { value: 0.04 },
      ca: { value: 0.5 }, flash: { value: 0 }, flashColor: { value: new THREE.Vector3(1, 1, 1) }, fade: { value: 1 }, aces: { value: 1 },
      zoomBlur: { value: 0 }, hazeAmt: { value: 0 }, hazeY0: { value: 0 }, hazeY1: { value: 1 },
      contrast: { value: 0.1 }, saturation: { value: 1 }, tint: { value: 0.5 },
    });
  }

  pass(material, rt, clear = true) {
    const r = this.renderer;
    r.setRenderTarget(rt);
    if (clear) { r.setClearColor(0x000000, 0); r.clear(); }
    this.quad.material = material;
    this.quad.render(r);
  }

  begin() {
    const r = this.renderer;
    r.setRenderTarget(this.rtAccum);
    r.setClearColor(0x000000, 0);
    r.clear();
  }

  /** Render one sub-frame and add it to the accumulator. */
  addSample(scene, camera, overlayTex, weight, overlayGain = 1) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.autoClear = true;
    r.render(scene, camera);
    r.autoClear = false;
    if (overlayTex) {
      this.overlayMat.uniforms.tOverlay.value = overlayTex;
      this.overlayMat.uniforms.gain.value = overlayGain;
      this.pass(this.overlayMat, this.rtScene, false);
    }
    this.accMat.uniforms.tDiffuse.value = this.rtScene.texture;
    this.accMat.uniforms.weight.value = weight;
    this.pass(this.accMat, this.rtAccum, false);
  }

  /** Post-process the accumulated frame to the canvas. */
  finish(p, time) {
    const r = this.renderer;
    r.autoClear = false;
    // bloom prefilter + downsample chain
    this.preMat.uniforms.tDiffuse.value = this.rtAccum.texture;
    this.preMat.uniforms.texel.value.set(1 / this.W, 1 / this.H);
    this.preMat.uniforms.threshold.value = p.bloomThreshold;
    this.pass(this.preMat, this.mips[0]);
    for (let i = 1; i < this.mips.length; i++) {
      const src = this.mips[i - 1];
      this.downMat.uniforms.tDiffuse.value = src.texture;
      this.downMat.uniforms.texel.value.set(1 / src.width, 1 / src.height);
      this.pass(this.downMat, this.mips[i]);
    }
    // streak from the 1/8 mip, before the upsample chain modifies it
    const s = this.mips[2];
    this.streakMat.uniforms.tDiffuse.value = s.texture;
    this.streakMat.uniforms.texel.value.set(1 / s.width, 1 / s.height);
    this.streakMat.uniforms.spread.value = 1.5;
    this.pass(this.streakMat, this.rtStreakA);
    this.streakMat.uniforms.tDiffuse.value = this.rtStreakA.texture;
    this.streakMat.uniforms.spread.value = 6.0;
    this.pass(this.streakMat, this.rtStreakB);
    // upsample chain (additive)
    const weights = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5];
    for (let i = this.mips.length - 1; i >= 1; i--) {
      const src = this.mips[i];
      this.upMat.uniforms.tDiffuse.value = src.texture;
      this.upMat.uniforms.texel.value.set(1 / src.width, 1 / src.height);
      this.upMat.uniforms.weight.value = weights[i];
      this.pass(this.upMat, this.mips[i - 1], false);
    }
    // final
    const u = this.finalMat.uniforms;
    u.time.value = time;
    for (const k of ['exposure', 'bloom', 'streak', 'vignette', 'grain', 'ca', 'flash', 'fade', 'aces', 'zoomBlur', 'hazeAmt', 'hazeY0', 'hazeY1', 'contrast', 'saturation', 'tint']) u[k].value = p[k];
    u.flashColor.value.set(...p.flashColor);
    this.pass(this.finalMat, null);
  }
}
