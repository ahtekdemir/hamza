// Shared "film set" pieces: studio lighting environment, floating dust with
// bokeh, soft sprites, procedural fabric and a gradient backdrop.

import * as THREE from 'three';
import { mulberry32 } from './util.js';

/** Dark studio with a warm key softbox and blue / red rim strips (brand colours). */
export function makeStudioEnv(renderer) {
  const s = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 40, 40), new THREE.MeshBasicMaterial({ color: 0x020308, side: THREE.BackSide }));
  s.add(room);
  const panel = (w, h, pos, rgb) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(rgb[0], rgb[1], rgb[2]), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(9, 5, [-6, 12, 7], [14, 12.2, 9.6]);      // warm key, top-left-front
  panel(2.2, 14, [13, 2, -3], [1.6, 4.0, 15]);    // blue rim, right
  panel(2.0, 10, [-13, -1, -5], [12, 1.6, 1.0]);  // red rim, left
  panel(10, 3, [0, 3, 16], [2.2, 2.1, 2.0]);      // soft front fill
  panel(14, 2, [0, 16, -6], [3.5, 3.6, 4.2]);     // top back strip
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(s, 0.035).texture;
  pmrem.dispose();
  return tex;
}

/** Radial falloff sprite. */
export function softSprite(size = 256, power = 2.0) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x + 0.5) / size * 2 - 1, dy = (y + 0.5) / size * 2 - 1;
    const r = Math.min(1, Math.hypot(dx, dy));
    const a = Math.pow(1 - r, power);
    const i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = Math.round(a * 255);
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Blotchy puff for steam. */
export function puffSprite(size = 256, seed = 7) {
  const rnd = mulberry32(seed);
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  for (let i = 0; i < 46; i++) {
    const a = rnd() * Math.PI * 2, d = Math.pow(rnd(), 0.8) * size * 0.26;
    const x = size / 2 + Math.cos(a) * d, y = size / 2 + Math.sin(a) * d, r = size * (0.1 + rnd() * 0.17);
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.1 + rnd() * 0.12})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Floating dust motes with depth-of-field bokeh. Animated from `time` only. */
export function makeDust({ count = 260, box = [10, 18, 10], seed = 1, size = 0.035, color = 0xffe2b8, intensity = 1.0, focus = 8, blur = 0.02, speed = 1, pixelH = 1920, fov = 30 } = {}) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3), sd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { sd[i * 4] = rnd(); sd[i * 4 + 1] = rnd(); sd[i * 4 + 2] = rnd(); sd[i * 4 + 3] = rnd(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(sd, 4));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }, box: { value: new THREE.Vector3(...box) }, size: { value: size }, color: { value: new THREE.Color(color) },
      intensity: { value: intensity }, focus: { value: focus }, blur: { value: blur }, speed: { value: speed },
      pxScale: { value: pixelH / (2 * Math.tan((fov * Math.PI) / 360)) },
    },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float time, size, focus, blur, pxScale, speed; uniform vec3 box;
      varying float vA; varying float vCoc;
      void main() {
        vec3 p = seed.xyz;
        p.y = fract(p.y + time * 0.012 * speed * (0.4 + seed.w));
        p.x = fract(p.x + 0.025 * sin(time * 0.25 * speed + seed.w * 30.0));
        p.z = fract(p.z + 0.02 * cos(time * 0.2 * speed + seed.x * 30.0));
        p = (p - 0.5) * box;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float depth = max(-mv.z, 0.05);
        float coc = abs(depth - focus) * blur;
        float s = size * (0.35 + seed.w * 1.3) + coc;
        gl_PointSize = clamp(s * pxScale / depth, 1.0, 380.0);
        float tw = 0.55 + 0.45 * sin(time * (0.7 + seed.w * 2.0) + seed.x * 50.0);
        vA = tw * clamp(pow(size / s, 1.35), 0.02, 1.0);
        vCoc = clamp(coc / s, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform float intensity;
      varying float vA; varying float vCoc;
      void main() {
        float r = length(gl_PointCoord - 0.5) * 2.0;
        float disc = smoothstep(1.0, mix(0.2, 0.86, vCoc), r);
        float ring = mix(1.0, 0.6 + 0.4 * smoothstep(0.45, 0.95, r), vCoc);
        gl_FragColor = vec4(color * intensity * vA * disc * ring, 1.0);
      }`,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, transparent: true,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 50;
  return pts;
}

/** Tileable knit-fabric normal map. */
export function fabricNormalMap(size = 512, seed = 3) {
  const rnd = mulberry32(seed);
  const h = new Float32Array(size * size);
  const N = 64; // threads per tile
  const jitter = new Float32Array(N); for (let i = 0; i < N; i++) jitter[i] = rnd() * 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const col = Math.floor(u * N);
    const fu = u * N - col;
    // knit "V" columns
    const vshape = Math.abs(fu - 0.5) * 2;
    const loop = Math.sin((v * N * 1.6 + vshape * 0.9 + jitter[col]) * Math.PI * 2);
    const ridge = Math.sin(fu * Math.PI);
    h[y * size + x] = ridge * 0.6 + loop * 0.28 * ridge + (rnd() - 0.5) * 0.12;
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const c = cv.getContext('2d');
  const img = c.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  const k = 2.2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * size + x) * 4;
    img.data[i] = Math.round((-dx / l * 0.5 + 0.5) * 255);
    img.data[i + 1] = Math.round((dy / l * 0.5 + 0.5) * 255);
    img.data[i + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Big soft gradient behind everything so blacks are never flat. */
export function makeBackdrop({ inner = 0x0c1630, outer = 0x020308, center = [0.5, 0.55], radius = 0.75, intensity = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      inner: { value: new THREE.Color(inner) }, outer: { value: new THREE.Color(outer) },
      center: { value: new THREE.Vector2(...center) }, radius: { value: radius }, intensity: { value: intensity }, time: { value: 0 },
      tintA: { value: new THREE.Color(0x000000) }, tintAmt: { value: 0 },
    },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 inner, outer, tintA; uniform vec2 center; uniform float radius, intensity, time, tintAmt; varying vec2 vUv;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main() {
        vec2 d = (vUv - center) * vec2(1.0, 1.7778);
        float r = length(d) / radius;
        float g = exp(-r * r * 1.6);
        float fog = vnoise(vUv * vec2(2.5, 4.0) + vec2(time * 0.03, -time * 0.02)) * 0.5 + vnoise(vUv * vec2(6.0, 9.0) - time * 0.02) * 0.25;
        vec3 col = mix(outer, inner, g) * (0.8 + 0.5 * fog);
        col += tintA * tintAmt * g;
        gl_FragColor = vec4(col * intensity, 1.0);
      }`,
    depthTest: true, depthWrite: false,
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const mesh = new THREE.Mesh(geo, m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -100;
  return mesh;
}
