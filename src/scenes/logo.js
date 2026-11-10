// Scene 6 — the hat draws itself as a line of light, the frame blooms to
// cream and the real logo settles in with the web address.

import * as THREE from 'three';
import { canvasTexture, tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, pulse } from '../lib/util.js';
import { text, label, rule, FONT } from '../lib/overlay.js';

const NAVY = '#203869', OX = '#762c2b';
const DRAW0 = 0.15, DRAW1 = 1.42, FLASH = 1.5;
const HAT_W = 600; // px, design space

/** Geodesic "burn" order through the hat's line art, so it draws like a fuse. */
function timeField(img, w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); c.drawImage(img, 0, 0, w, h);
  const a = c.getImageData(0, 0, w, h).data;
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = a[i * 4 + 3] > 60 ? 1 : 0;
  const dist = new Float32Array(w * h).fill(-1);
  let max = 1;
  // components, left to right; each starts when the sweep reaches its left edge
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    const s = y * w + x;
    if (!mask[s] || dist[s] >= 0) continue;
    const q = [s]; dist[s] = x * 1.6;
    for (let k = 0; k < q.length; k++) {
      const p = q[k], px = p % w, py = (p - px) / w, d = dist[p];
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = px + ox, ny = py + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!mask[n] || dist[n] >= 0) continue;
        dist[n] = d + (ox && oy ? 1.414 : 1); q.push(n);
      }
    }
  }
  for (let i = 0; i < w * h; i++) if (dist[i] > max) max = dist[i];
  // spread values into the transparent neighbourhood so filtering stays clean
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let v = dist[i];
    if (v < 0) {
      let best = -1;
      for (let r = 1; r <= 3 && best < 0; r++) for (let oy = -r; oy <= r; oy++) for (let ox = -r; ox <= r; ox++) {
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const d = dist[ny * w + nx]; if (d >= 0 && (best < 0 || d < best)) best = d;
      }
      v = best < 0 ? max : best;
    }
    out[(h - 1 - y) * w + x] = v / max; // flip for GL
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RedFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

export function createLogo(ctx, opts = {}) {
  const HAT_Y = opts.hatY ?? 690, WORD_Y = opts.wordY ?? 890;
  const COL = { navy: NAVY, ox: OX };
  const { hat, wordmark } = ctx.assets.images;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-540, 540, 960, -960, -10, 10);

  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1080, 1920), new THREE.ShaderMaterial({
    uniforms: { wipe: { value: 0 }, time: { value: 0 }, c: { value: new THREE.Vector2(0, 960 - HAT_Y) }, glow: { value: 0 } },
    vertexShader: /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float wipe, time, glow; uniform vec2 c; varying vec2 vP;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main() {
        float r = length(vP - c);
        vec3 dark = mix(vec3(0.004, 0.006, 0.014), vec3(0.02, 0.04, 0.10), exp(-r * r / 260000.0));
        dark += vec3(1.0, 0.72, 0.4) * glow * exp(-r * r / 60000.0) * 0.12;
        // cream paper (linear values of ~#f6efe2) with a faint fibre texture
        float fib = vnoise(vP * 0.9) * 0.6 + vnoise(vP * vec2(0.12, 2.4)) * 0.4;
        vec3 paper = vec3(0.925, 0.862, 0.76) * (0.985 + 0.03 * fib);
        paper *= 1.0 - 0.10 * smoothstep(500.0, 1250.0, length((vP - vec2(0.0, 120.0)) * vec2(1.0, 0.72)));
        float edge = wipe * 1500.0;
        float m = smoothstep(edge, edge - 260.0, r) * step(0.001, wipe);
        vec3 col = mix(dark, paper, m);
        col += vec3(1.0, 0.9, 0.75) * exp(-pow((r - edge) / 90.0, 2.0)) * step(0.001, wipe) * (1.0 - wipe) * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  }));
  bg.renderOrder = 0; scene.add(bg);

  const fw = 486, fh = Math.round(486 * hat.height / hat.width);
  const hatH = HAT_W * hat.height / hat.width;
  const hatMat = new THREE.ShaderMaterial({
    uniforms: {
      tAlpha: { value: canvasTexture(tint(hat, '#ffffff')) }, tTime: { value: timeField(hat, fw, fh) },
      p: { value: 0 }, solid: { value: 0 }, navy: { value: new THREE.Color(NAVY) }, heat: { value: 1 },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tAlpha, tTime; uniform float p, solid, heat; uniform vec3 navy; varying vec2 vUv;
      void main() {
        float a = texture2D(tAlpha, vUv).a;
        float tt = texture2D(tTime, vUv).r;
        float shown = smoothstep(p, p - 0.012, tt);
        float head = exp(-pow((tt - p) * 22.0, 2.0)) * step(p, 1.02);
        vec3 light = vec3(1.0, 0.86, 0.62) * (1.5 + 5.0 * head) * heat;
        vec3 col = mix(light, navy, solid);
        gl_FragColor = vec4(col, a * shown);
      }`,
    transparent: true, depthTest: false, depthWrite: false,
  });
  const hatMesh = new THREE.Mesh(new THREE.PlaneGeometry(HAT_W, hatH), hatMat);
  hatMesh.position.set(0, 960 - HAT_Y, 0); hatMesh.renderOrder = 2; scene.add(hatMesh);

  function update(t) {
    const m = bg.material.uniforms;
    m.time.value = t;
    m.wipe.value = t < FLASH ? 0 : ease.outCubic(prog(t, FLASH, FLASH + 0.55));
    m.glow.value = smooth(prog(t, DRAW0, DRAW1));
    hatMat.uniforms.p.value = lerp(-0.02, 1.04, ease.inOutSine(prog(t, DRAW0, DRAW1)));
    hatMat.uniforms.solid.value = smooth(prog(t, FLASH + 0.02, FLASH + 0.3));
    hatMat.uniforms.heat.value = 1 + pulse(t, FLASH, 0.08) * 2.5;
    const settle = ease.outCubic(prog(t, FLASH, FLASH + 0.8));
    const s = lerp(1.06, 1.0, settle) + prog(t, 0, 3) * 0.012;
    hatMesh.scale.set(s, s, 1);
    hatMesh.position.y = 960 - HAT_Y;
  }

  function drawOverlay(c, t) {
    const u = t - FLASH;
    if (u <= 0.1) return;
    const zoom = 1 + prog(t, 0, 3) * 0.012;
    c.save();
    c.translate(540, 960); c.scale(zoom, zoom); c.translate(-540, -960);
    // wordmark
    const e = ease.outQuint(sat((u - 0.12) / 0.7));
    const W = 800, H = W * wordmark.height / wordmark.width;
    c.save();
    c.globalAlpha = sat(e * 1.4);
    if (e < 0.98) c.filter = `blur(${((1 - e) * 10).toFixed(2)}px)`;
    c.drawImage(wordmark, 540 - W / 2, WORD_Y + (1 - e) * 36, W, H);
    c.restore();
    if (opts.lines) {
      // ad layout: tagline + address, kept above the ad interface
      const ty = WORD_Y + H + 86;
      label(c, opts.tagline, 540, ty, { family: FONT.serif, style: 'italic', weight: 700, size: 46, tracking: 1, fill: NAVY, shadow: false }, u - 0.45, -1, { dur: 0.6 });
      rule(c, 540, ty + 42, 460, u - 0.55, { star: true, color: OX, alpha: 0.9, width: 2.5 });
      opts.lines.forEach(([s, y, size, weight, tracking, col], i) => {
        label(c, s, 540, y, { family: FONT.label, weight, size, tracking, fill: COL[col], shadow: false }, u - 0.65 - i * 0.18, -1, { dur: 0.6 });
      });
    } else {
      rule(c, 540, 1206, 460, u - 0.5, { star: true, color: OX, alpha: 0.9, width: 2.5 });
      label(c, 'COWBOYDTF.COM', 540, 1290, { family: FONT.label, weight: 800, size: 56, tracking: 10, fill: NAVY, shadow: false }, u - 0.6, -1, { dur: 0.6 });
      label(c, 'ARLINGTON, TX   ·   NATIONWIDE SHIPPING', 540, 1362, { family: FONT.label, weight: 700, size: 25, tracking: 6, fill: OX, shadow: false }, u - 0.8, -1, { dur: 0.6 });
    }
    c.restore();
  }

  function post(t) {
    const cream = smooth(prog(t, FLASH, FLASH + 0.35));
    return {
      fade: smooth(prog(t, 0.0, 0.2)),
      flash: pulse(t, FLASH + 0.03, 0.09) * 0.9,
      flashColor: [1.0, 0.95, 0.86],
      aces: 1 - cream, tint: 0.5 * (1 - cream), contrast: 0.12 * (1 - cream), saturation: 1.06,
      bloom: lerp(0.9, 0.06, cream), streak: lerp(0.8, 0.0, cream), bloomThreshold: lerp(0.85, 1.2, cream),
      vignette: lerp(0.9, 0.22, cream), grain: lerp(0.045, 0.03, cream), ca: lerp(0.6, 0.15, cream),
      overlayGain: 1.0,
    };
  }

  return { name: 'logo', scene, camera, update, drawOverlay, post, samples: 5 };
}
