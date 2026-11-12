// Shared pieces of the Thanksgiving reel: a transfer film that can curl and
// peel, tumbling autumn leaves with depth blur, and a cream paper backdrop.

import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { buildLeafSprites } from './thanks-art.js';

/**
 * Texture from a canvas whose colour is bled outward into the transparent
 * pixels, so bilinear filtering never pulls black into soft edges.
 */
export function bleedTexture(canvas, { passes = 4, mip = true } = {}) {
  const w = canvas.width, h = canvas.height;
  const src = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const px = new Uint8Array(src.length);
  // flip rows to match the UV convention of CanvasTexture
  for (let y = 0; y < h; y++) px.set(src.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  let known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = px[i * 4 + 3] > 0 ? 1 : 0;
  // un-premultiply error is large at very low alpha: treat alpha < 24 as unknown colour
  for (let i = 0; i < w * h; i++) if (px[i * 4 + 3] < 24) known[i] = 0;
  for (let p = 0; p < passes; p++) {
    const next = known.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (known[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox, ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!known[j]) continue;
        r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++;
      }
      if (n) { px[i * 4] = r / n; px[i * 4 + 1] = g / n; px[i * 4 + 2] = b / n; next[i] = 1; }
    }
    known = next;
  }
  const t = new THREE.DataTexture(px, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Scale a canvas down with high-quality resampling. */
export function resample(canvas, w) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = Math.round(w * canvas.height / canvas.width);
  const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high';
  c.drawImage(canvas, 0, 0, cv.width, cv.height);
  return cv;
}

/**
 * Transfer film / gang sheet. A plane that curls around a moving fold line
 * (`cdir`, `coff`): everything beyond the line wraps onto a cylinder of
 * radius `crad`, then lies flat again on top (a page turn).
 * Up to six designs can pop on individually (`rects` + `pops`).
 */
export function makeFilm({ w, h, seg = [64, 80], art, rects = null, base = [0.012, 0.011, 0.013], alpha = 1, back = [0.5, 0.5, 0.53], backAlpha = 1, rim = 0.05, gloss = 0.5 }) {
  const R = new Array(6).fill(0).map((_, i) => (rects && rects[i] ? new THREE.Vector4(rects[i].x0, rects[i].y0, rects[i].x1, rects[i].y1) : new THREE.Vector4()));
  const P = new Array(6).fill(0).map(() => new THREE.Vector3(1, 1, 0));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      tArt: { value: art }, artOn: { value: 1 }, nRects: { value: rects ? rects.length : 0 }, rects: { value: R }, pops: { value: P },
      base: { value: new THREE.Color(...base) }, back: { value: new THREE.Color(...back) }, alpha: { value: alpha }, backAlpha: { value: backAlpha },
      size: { value: new THREE.Vector2(w, h) }, rim: { value: rim }, gloss: { value: gloss }, opacity: { value: 1 },
      cdir: { value: new THREE.Vector2(0.7071, -0.7071) }, coff: { value: 1e3 }, crad: { value: 0.3 },
      lightDir: { value: new THREE.Vector3(-0.45, 0.6, 0.66).normalize() }, sheenPos: { value: -2 }, sheenAmt: { value: 0.5 }, warm: { value: new THREE.Color(1, 0.86, 0.66) },
    },
    vertexShader: /* glsl */`
      uniform vec2 cdir; uniform float coff, crad;
      varying vec2 vUv; varying vec3 vN, vV; varying float vD;
      void main() {
        vUv = uv;
        vec3 p = position; vec3 n = vec3(0.0, 0.0, 1.0);
        float d = dot(p.xy, cdir) - coff;
        vD = d;
        if (d > 0.0) {
          float th = d / crad;
          if (th < 3.14159265) {
            p.xy += cdir * (crad * sin(th) - d);
            p.z += crad * (1.0 - cos(th));
            n = vec3(-cdir * sin(th), cos(th));
          } else {
            p.xy += cdir * (-(d - 3.14159265 * crad) - d);
            p.z += 2.0 * crad + (d - 3.14159265 * crad) * 0.12;
            n = vec3(0.0, 0.0, -1.0);
          }
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalMatrix * n; vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tArt; uniform float artOn, alpha, backAlpha, rim, gloss, opacity, sheenPos, sheenAmt;
      uniform int nRects; uniform vec4 rects[6]; uniform vec3 pops[6];
      uniform vec3 base, back, lightDir, warm; uniform vec2 size;
      varying vec2 vUv; varying vec3 vN, vV; varying float vD;
      void main() {
        vec3 N = normalize(vN), V = normalize(vV), L = normalize(lightDir);
        bool front = dot(N, V) > 0.0;
        if (!front) N = -N;
        float ndl = max(dot(N, L), 0.0);
        float spec = pow(max(dot(N, normalize(L + V)), 0.0), 48.0);
        vec3 col; float a;
        if (front) {
          vec4 art = vec4(0.0);
          if (nRects == 0) art = texture2D(tArt, vUv);
          else {
            for (int i = 0; i < 6; i++) {
              if (i >= nRects) break;
              vec4 r = rects[i]; float s = pops[i].x;
              if (s < 0.01) continue;
              vec2 c = (r.xy + r.zw) * 0.5;
              vec2 q = c + (vUv - c) / s;
              if (q.x > r.x && q.x < r.z && q.y > r.y && q.y < r.w) {
                vec4 t = texture2D(tArt, q);
                t.rgb = t.rgb * (1.0 + pops[i].z * 1.6) + warm * pops[i].z * 0.5;
                art = vec4(t.rgb, t.a * pops[i].y);
              }
            }
          }
          art.a *= artOn;
          vec2 e = min(vUv, 1.0 - vUv) * size;
          float border = 1.0 - smoothstep(0.0, 0.035, min(e.x, e.y));
          vec3 body = base + vec3(rim) * border;
          a = alpha + (1.0 - alpha) * art.a;
          col = mix(body * alpha, art.rgb, art.a);            // premultiplied
          col *= 0.5 + 0.56 * ndl;
          float band = exp(-pow((dot(vUv - 0.5, vec2(0.62, -0.78)) - sheenPos) * 4.2, 2.0));
          float fres = pow(1.0 - abs(dot(N, V)), 2.0);
          float glint = gloss * (spec * 0.9 + band * sheenAmt + fres * 1.1);
          col += warm * glint;
          a = min(1.0, a + glint * 0.6);
          // contact shadow thrown by the curl onto the flat part
          col *= 1.0 - 0.5 * smoothstep(-0.6, 0.0, vD) * step(vD, 0.0);
          // inside of the curl, facing away from the light
          col *= 1.0 - 0.35 * smoothstep(0.0, 0.4, vD);
        } else {
          float shade = 0.3 + 0.95 * ndl;
          float fres = pow(1.0 - abs(dot(N, V)), 2.0);
          a = min(1.0, backAlpha + fres * 0.5);
          col = back * shade * a + warm * (spec * 0.5 + fres * 0.45 * gloss);
        }
        gl_FragColor = vec4(col * opacity, a * opacity);
      }`,
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h, seg[0], seg[1]), mat);
  return { mesh, u: mat.uniforms };
}

/**
 * Tumbling leaves. Positions are a pure function of time. Leaves far from
 * `focus` (camera distance) use pre-blurred sprites, which reads as depth of field.
 * area = [width, height] at z = 0; `zr` = [near, far] offsets toward the camera.
 */
export function makeLeaves({ count = 26, seed = 1, area = [7, 11], zr = [-3, 7], size = [0.32, 0.6], fall = 0.55, tintDark = 1, opacity = 1, keepOut = null, nearKeepOut = null, keepOutTop = null, avoid = null }) {
  const rnd = mulberry32(seed);
  const sprites = buildLeafSprites(256);
  const levels = [0, 5, 13].map((b) => sprites.map((sp) => {
    if (!b) return bleedTexture(sp);
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d'); c.filter = `blur(${b}px)`; c.drawImage(sp, 20, 20, 216, 216);
    return bleedTexture(cv, { passes: 2 });
  }));
  const geo = new THREE.PlaneGeometry(1, 1);
  const group = new THREE.Group();
  const items = [];
  for (let i = 0; i < count; i++) {
    const z = zr[0] + Math.pow(rnd(), 1.4) * (zr[1] - zr[0]);
    const lvl = z > 4.2 ? 2 : (z > 1.8 || z < -1.6 ? 1 : 0);
    const sp = Math.floor(rnd() * sprites.length);
    const baseOpacity = opacity * (lvl === 2 ? 0.85 : 1);
    const mat = new THREE.MeshBasicMaterial({ map: levels[lvl][sp], transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: baseOpacity });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = z > 0.5 ? 60 : -50;
    const s = (size[0] + rnd() * (size[1] - size[0])) * (lvl === 2 ? 1.25 : 1);
    mesh.scale.set(s, s, 1);
    group.add(mesh);
    items.push({
      mesh, z, s, lvl, baseOpacity, x0: rnd(), y0: rnd(), vy: fall * (0.6 + rnd() * 0.8), sway: 0.25 + rnd() * 0.5, f: 0.5 + rnd() * 0.9, ph: rnd() * 6.28,
      wx: (rnd() - 0.5) * 3.2, wz: (rnd() - 0.5) * 1.6, rz: rnd() * 6.28, rx: rnd() * 6.28, drift: (rnd() - 0.5) * 0.25, dark: tintDark * (z < -1 ? 0.55 : 1),
    });
  }
  function update(t) {
    for (const it of items) {
      // perspective: the visible area shrinks toward the camera
      const k = 1 - it.z / 17;
      const W = area[0] * k + 1.2, H = area[1] * k + 1.6;
      const fy = ((it.y0 + t * it.vy / H) % 1 + 1) % 1;
      let x = (((it.x0 + t * it.drift / W) % 1 + 1) % 1 - 0.5) * W + Math.sin(t * it.f + it.ph) * it.sway;
      const y = (0.5 - fy) * H;
      const ko = it.lvl === 2 && nearKeepOut ? nearKeepOut : keepOut;
      if (ko) {
        // push leaves sideways out of a central column so they frame the subject
        // with keepOutTop, the column only starts below that height (eased in, so leaves glide around it)
        const g = keepOutTop === null ? 1 : Math.min(1, Math.max(0, (keepOutTop + 1.3 - y / k) / 1.5));
        const half = ko * k * g * g * (3 - 2 * g);
        if (Math.abs(x) < half) x = (x < 0 ? -1 : 1) * (half + (half - Math.abs(x)) * 0.35);
      }
      it.mesh.position.set(x, y, it.z);
      const rx = it.rx + t * it.wx, rz = it.rz + t * it.wz + Math.sin(t * it.f * 1.3 + it.ph) * 0.5;
      it.mesh.rotation.set(rx, Math.sin(t * it.f * 0.8 + it.ph * 2) * 0.7, rz);
      const face = 0.6 + 0.4 * Math.abs(Math.cos(rx));
      it.mesh.material.color.setScalar(face * it.dark);
      if (avoid) {
        // fade leaves out as they cross the headline block: avoid = [x0, x1, y0, y1] at z = 0
        const px = x / k, py = y / k, m = it.s * 0.6;
        const dx = Math.max(avoid[0] - px, 0, px - avoid[1]), dy = Math.max(avoid[2] - py, 0, py - avoid[3]);
        const g = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - m) / 0.45));
        it.mesh.material.opacity = it.baseOpacity * g * g * (3 - 2 * g);
      }
    }
  }
  return { group, update, items };
}

/** Cream paper with faint fibres and a soft warm centre. */
export function makePaper({ color = [0.9, 0.82, 0.69], glow = [0.5, 0.52], glowAmt = 0.08 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(...color) }, glow: { value: new THREE.Vector2(...glow) }, glowAmt: { value: glowAmt }, dim: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform vec2 glow; uniform float glowAmt, dim; varying vec2 vUv;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main() {
        vec2 px = vUv * vec2(1080.0, 1920.0);
        float fib = vnoise(px * 0.9) * 0.5 + vnoise(px * vec2(0.12, 2.4)) * 0.3 + vnoise(px * vec2(2.2, 0.1)) * 0.2;
        vec3 col = color * (0.975 + 0.05 * fib);
        vec2 d = (vUv - glow) * vec2(1.0, 1.7778);
        col *= 1.0 + glowAmt * exp(-dot(d, d) * 2.2) - 0.11 * smoothstep(0.35, 1.25, length(d));
        gl_FragColor = vec4(col * dim, 1.0);
      }`,
    depthTest: true, depthWrite: false,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false; mesh.renderOrder = -100;
  return mesh;
}

// ---- headline helpers (2D overlay) ------------------------------------------------

export const HEAD = { family: 'Anton', weight: 400 };
export const INK = '#2a1a12', GOLD = '#f6b12e', CREAMY = '#fff3dc', PUMPKIN = '#e8601c';

/** Largest font size (<= max) at which `str` fits `width`. */
export function fitSize(c, str, width, max, tracking = 0) {
  c.save();
  c.font = `400 100px "Anton"`; c.letterSpacing = '0px';
  const w100 = c.measureText(str).width;
  c.restore();
  return Math.min(max, (width - tracking * (str.length - 1)) / w100 * 100);
}

/** Cap height of Anton at `size` px. */
export function capHeight(c, size) {
  c.save();
  c.font = `400 100px "Anton"`; c.letterSpacing = '0px';
  const h = c.measureText('H').actualBoundingBoxAscent;
  c.restore();
  return h * size / 100;
}

/** Radial falloff sprite stored in half floats, so big soft glows do not band. */
export function smoothGlow(size = 256, power = 1.5) {
  const data = new Uint16Array(size * size * 4);
  const one = THREE.DataUtils.toHalfFloat(1);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5) / size * 2 - 1, dy = (y + 0.5) / size * 2 - 1;
    const r = Math.min(1, Math.hypot(dx, dy));
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = one;
    data[i + 3] = THREE.DataUtils.toHalfFloat(Math.pow(1 - r, power) * (1 - r * r * 0.0));
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.HalfFloatType);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
