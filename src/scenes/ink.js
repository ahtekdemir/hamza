// Scene 1 — "Your art."  Ink drops fall in slow motion onto a glossy black
// surface and bloom into colour.

import * as THREE from 'three';
import { makeDust, makeBackdrop } from '../lib/stage.js';
import { ease, prog, lerp, sat, smooth, mulberry32, pulse } from '../lib/util.js';
import { text, chars, FONT, CREAM } from '../lib/overlay.js';

const INKS = [
  { color: [1.0, 0.04, 0.42], x: 0.0, z: 0.0, hit: 1.0, r: 0.24, R: 2.3, seed: 1.3 },   // magenta (hero)
  { color: [0.0, 0.62, 1.0], x: -0.95, z: -1.3, hit: 1.27, r: 0.19, R: 1.9, seed: 4.1 }, // cyan
  { color: [1.0, 0.78, 0.04], x: 0.9, z: 0.75, hit: 1.5, r: 0.17, R: 1.7, seed: 8.6 },   // yellow
];
const FALL = 5.6; // units per second (slow motion)

export function createInk(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.env;
  scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(32, ctx.aspect, 0.1, 100);

  const backdrop = makeBackdrop({ inner: 0x0b1634, outer: 0x010205, center: [0.5, 0.6], radius: 0.7 });
  scene.add(backdrop);

  // glossy floor (slightly transparent so the mirrored drops read as reflections)
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x04050a, roughness: 0.16, metalness: 0.0, transparent: true, opacity: 0.72, envMapIntensity: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = 2;
  scene.add(floor);

  const key = new THREE.DirectionalLight(0xffe3c0, 2.2); key.position.set(-4, 8, 5); scene.add(key);
  const rimB = new THREE.PointLight(0x4d7dff, 60, 0, 2); rimB.position.set(4.5, 2.5, -3); scene.add(rimB);
  const rimR = new THREE.PointLight(0xe2473c, 40, 0, 2); rimR.position.set(-4.5, 1.5, -2.5); scene.add(rimR);

  // ---- ink pool on the floor ---------------------------------------
  const poolMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      hits: { value: INKS.map((k) => new THREE.Vector4(k.x, k.z, k.hit, k.R)) },
      cols: { value: INKS.map((k) => new THREE.Vector3(...k.color)) },
      seeds: { value: INKS.map((k) => k.seed) },
      gain: { value: 1.0 },
    },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float time, gain; uniform vec4 hits[3]; uniform vec3 cols[3]; uniform float seeds[3];
      varying vec3 vW;
      float sat(float x) { return clamp(x, 0.0, 1.0); }
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
      void main() {
        vec2 p = vW.xz;
        vec3 col = vec3(0.0); float alpha = 0.0; float rim = 0.0;
        for (int i = 0; i < 3; i++) {
          float age = time - hits[i].z;
          if (age <= 0.0) continue;
          vec2 q = p - hits[i].xy;
          float sd = seeds[i];
          float grow = 1.0 - exp(-age * 2.6);
          float radius = hits[i].w * (0.12 + 0.88 * grow) * (1.0 + age * 0.05);
          // swirling domain warp that keeps evolving
          vec2 w = vec2(fbm(q * 1.3 + sd + age * 0.22), fbm(q * 1.3 + sd + 5.2 - age * 0.18)) - 0.5;
          vec2 w2 = vec2(fbm(q * 3.1 + w * 2.0 + sd * 2.0), fbm(q * 3.1 + w * 2.0 + sd * 3.0 + 3.3)) - 0.5;
          float d = length(q + w * 1.5 * grow + w2 * 0.45 * grow);
          float edge = 1.0 - smoothstep(radius * 0.72, radius, d);
          float veins = fbm(q * 2.6 + w * 3.5 - age * 0.25 + sd);
          float fine = fbm(q * 7.0 + w2 * 4.0 + sd * 1.7);
          vec3 ink = cols[i] * (0.22 + 1.05 * veins + 0.35 * fine * fine);
          // bright meniscus at the leading edge
          float ring = smoothstep(radius * 0.80, radius * 0.93, d) * (1.0 - smoothstep(radius * 0.93, radius * 1.0, d));
          rim += ring * (0.4 + 0.6 * exp(-age * 1.5));
          col = mix(col, ink, edge * 0.86);
          alpha = max(alpha, edge);
        }
        col += rim * (col * 0.9 + 0.12);
        gl_FragColor = vec4(col * gain, sat(alpha + rim * 0.4));
      }
      `,
    transparent: true, depthWrite: false,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), poolMat);
  pool.rotation.x = -Math.PI / 2; pool.position.y = 0.004; pool.renderOrder = 3;
  scene.add(pool);

  // ---- drops ---------------------------------------------------------
  const sphere = new THREE.SphereGeometry(1, 64, 48);
  const drops = INKS.map((k) => {
    const c = new THREE.Color(...k.color);
    const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.06, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.6, emissive: c, emissiveIntensity: 0.45 });
    const mesh = new THREE.Mesh(sphere, m); scene.add(mesh);
    const refl = new THREE.Mesh(sphere, m); refl.renderOrder = 1; scene.add(refl);
    // crown ring + ejected droplets
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 12, 96), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2), transparent: true, opacity: 0, depthWrite: false }));
    ring.rotation.x = Math.PI / 2; ring.renderOrder = 4; scene.add(ring);
    const rnd = mulberry32(Math.round(k.seed * 100));
    const bits = [];
    for (let i = 0; i < 16; i++) {
      const b = new THREE.Mesh(sphere, m); scene.add(b);
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.4;
      bits.push({ mesh: b, a, v: 1.1 + rnd() * 1.5, up: 2.2 + rnd() * 2.4, r: 0.022 + rnd() * 0.04 });
    }
    return { k, mesh, refl, ring, bits };
  });

  const dust = makeDust({ count: 240, box: [9, 9, 12], seed: 11, size: 0.03, intensity: 1.1, focus: 9, blur: 0.03, fov: 32, pixelH: ctx.pixelH });
  dust.position.y = 3.5;
  scene.add(dust);

  function update(t) {
    poolMat.uniforms.time.value = t;
    dust.material.uniforms.time.value = t;
    backdrop.material.uniforms.time.value = t;

    for (const d of drops) {
      const { k } = d;
      const dt = t - k.hit; // <0 falling, >0 after impact
      const y = k.r - dt * FALL;
      const falling = dt < 0;
      d.mesh.visible = falling && y < 9;
      d.refl.visible = d.mesh.visible;
      if (falling) {
        const wob = Math.sin(t * 9 + k.seed) * 0.05;
        d.mesh.scale.set(k.r * (1 - wob), k.r * (1.06 + wob * 2), k.r * (1 - wob));
        d.mesh.position.set(k.x, y, k.z);
        d.refl.scale.copy(d.mesh.scale);
        d.refl.position.set(k.x, -y, k.z);
      }
      // crown ring
      const rp = prog(dt, 0, 0.75);
      d.ring.visible = dt > 0 && rp < 1;
      if (d.ring.visible) {
        const s = lerp(0.12, k.R * 0.62, ease.outCubic(rp));
        d.ring.scale.set(s, s, 1 + (1 - rp) * 1.5);
        d.ring.position.set(k.x, 0.02, k.z);
        d.ring.material.opacity = (1 - rp) * (1 - rp) * 0.9;
      }
      // ejected droplets (ballistic)
      for (const b of d.bits) {
        const life = dt;
        const by = b.up * life - 5.5 * life * life;
        b.mesh.visible = life > 0 && by > -0.02;
        if (!b.mesh.visible) continue;
        const rr = 0.1 + b.v * life;
        b.mesh.position.set(k.x + Math.cos(b.a) * rr, by + 0.02, k.z + Math.sin(b.a) * rr);
        const s = b.r * (1 - sat(life * 0.6));
        b.mesh.scale.set(s, s * 1.25, s);
      }
    }

    // camera: slow push in, then a dive into the ink for the cut
    const push = ease.inOutSine(prog(t, 0, 2.3));
    const dive = ease.inExpo(prog(t, 2.12, 2.5));
    camera.position.set(lerp(0.25, -0.1, push), lerp(2.9, 2.55, push) - dive * 1.9, lerp(9.4, 8.5, push) - dive * 6.2);
    camera.lookAt(0, lerp(1.15, 1.0, push) - dive * 0.9, 0);
  }

  function drawOverlay(c, t) {
    const p = t - 1.3;
    if (p <= 0) return;
    const out = t - 2.14;
    const exit = out > 0 ? ease.inCubic(sat(out / 0.24)) : 0;
    const o = { family: FONT.serif, style: 'italic', weight: 700, size: 168, fill: CREAM, alpha: 1 - exit, blur: exit * 14, shadow: { blur: 40, y: 8, color: 'rgba(0,0,0,0.6)' } };
    chars(c, 'Your art.', 540, 610 - exit * 30, o, (i) => {
      const e = ease.outQuint(sat((p - i * 0.045) / 0.7));
      return { dy: (1 - e) * 46, a: e, blur: (1 - e) * 16 };
    });
  }

  function post(t) {
    const dive = prog(t, 2.2, 2.5);
    const hit = pulse(t, 1.02, 0.07) * 0.35 + pulse(t, 1.29, 0.06) * 0.16 + pulse(t, 1.52, 0.06) * 0.14;
    return {
      fade: smooth(prog(t, 0.0, 0.3)),
      flash: hit + ease.inCubic(dive) * 0.9,
      flashColor: [1.0, 0.92, 0.86],
      zoomBlur: ease.inQuad(dive) * 0.22,
      bloom: 0.7, streak: 0.5, exposure: 1.05,
    };
  }

  return { name: 'ink', scene, camera, update, drawOverlay, post, samples: 5 };
}
