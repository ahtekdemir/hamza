// Scene 3 — the heat press closes, glows, and the counter ticks 6… 7… 8.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeDust, makeBackdrop, softSprite, puffSprite, fabricNormalMap } from '../lib/stage.js';
import { canvasTexture, tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, mulberry32, pulse, spring } from '../lib/util.js';
import { text, riseLine, label, rule, FONT, CREAM } from '../lib/overlay.js';

const CLOSE = 1.0, OPEN = 3.3;

export function createPress(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.env; scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: 0x101a38, outer: 0x010205, center: [0.5, 0.42], radius: 0.75 });
  scene.add(backdrop);

  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1.0, roughness: 0.28 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x0c1222, metalness: 0.75, roughness: 0.36 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x14275a, metalness: 0.55, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x3a1414, metalness: 0.0, roughness: 0.85 });
  const cloth = new THREE.MeshPhysicalMaterial({ color: 0x08080b, roughness: 0.95, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0x30343c), sheenRoughness: 0.6, normalMap: fabricNormalMap(), normalScale: new THREE.Vector2(0.6, 0.6) });
  cloth.normalMap.repeat.set(10, 8);
  const box = (w, h, d, m, r = 0.08) => new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), m);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x05060b, roughness: 0.22, metalness: 0.0, envMapIntensity: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.0; scene.add(floor);

  const press = new THREE.Group(); scene.add(press);
  const base = box(6.0, 0.6, 5.0, dark, 0.12); base.position.y = -0.7; press.add(base);
  const neck = box(2.2, 0.5, 2.2, metal, 0.06); neck.position.y = -0.2; press.add(neck);
  const lower = box(5.0, 0.36, 4.0, metal, 0.06); lower.position.y = 0.2; press.add(lower);
  const pad = box(4.9, 0.1, 3.9, rubber, 0.04); pad.position.y = 0.42; press.add(pad);
  const shirt = box(5.5, 0.06, 4.3, cloth, 0.03); shirt.position.y = 0.49; press.add(shirt);
  // transfer film on the shirt
  const art = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0), new THREE.MeshBasicMaterial({ map: canvasTexture(ctx.assets.designs.sunset), transparent: true, depthWrite: false }));
  art.rotation.x = -Math.PI / 2; art.position.y = 0.527; art.renderOrder = 2; press.add(art);
  const film = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), new THREE.MeshPhysicalMaterial({ color: 0xdfe6f2, roughness: 0.35, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, envMapIntensity: 1.2 }));
  film.rotation.x = -Math.PI / 2; film.position.y = 0.532; film.renderOrder = 3; press.add(film);
  // column + arm
  const column = box(1.0, 9.0, 1.0, dark, 0.1); column.position.set(0, 3.4, -2.9); press.add(column);

  const head = new THREE.Group(); press.add(head);
  const heater = box(5.0, 0.34, 4.0, metal, 0.05); heater.position.y = 0.72; head.add(heater);
  const hot = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 3.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.55, 0.08) }));
  hot.rotation.x = Math.PI / 2; hot.position.y = 0.545; head.add(hot);
  const housing = box(4.6, 0.9, 3.6, navy, 0.14); housing.position.y = 1.34; head.add(housing);
  const arm = box(1.1, 0.7, 3.4, dark, 0.1); arm.position.set(0, 2.05, -1.4); head.add(arm);
  const slider = box(1.5, 1.4, 1.5, metal, 0.1); slider.position.set(0, 2.05, -2.9); head.add(slider);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 24), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.6, metalness: 0.2 }));
  handle.rotation.z = Math.PI / 2; handle.position.set(0, 1.55, 2.25); head.add(handle);
  for (const sx of [-1.5, 1.5]) { const st = box(0.16, 0.16, 0.6, metal, 0.03); st.position.set(sx, 1.55, 1.98); head.add(st); }
  // brand badge on the housing front
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9 * 456 / 972), new THREE.MeshBasicMaterial({ map: canvasTexture(tint(ctx.assets.images.hat, '#f4ead8', 0.5)), transparent: true, opacity: 0.92, depthWrite: false }));
  badge.position.set(0, 1.34, 1.806); head.add(badge);

  // heat glow
  const glowTex = softSprite(256, 1.5);
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.5), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(3.2, 0.9, 0.12), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  seam.position.set(0, 0.55, 2.1); seam.renderOrder = 10; press.add(seam);
  const seamCore = new THREE.Mesh(new THREE.BoxGeometry(5.04, 0.03, 4.04), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.9, 0.12), transparent: true, opacity: 0 }));
  seamCore.position.y = 0.535; press.add(seamCore);
  const heatL = new THREE.PointLight(0xff6a1a, 0, 0, 2); heatL.position.set(0, 0.7, 3.2); scene.add(heatL);
  const heatL2 = new THREE.PointLight(0xff6a1a, 0, 0, 2); heatL2.position.set(3.6, 0.7, 0); scene.add(heatL2);

  const key = new THREE.DirectionalLight(0xffe3c0, 1.6); key.position.set(-5, 9, 6); scene.add(key);
  const rimB = new THREE.PointLight(0x4d7dff, 260, 0, 2); rimB.position.set(7, 4, -5); scene.add(rimB);
  const rimR = new THREE.PointLight(0xe2473c, 160, 0, 2); rimR.position.set(-7, 2, -3); scene.add(rimR);

  // steam
  const puff = puffSprite(256, 5);
  const rnd = mulberry32(77);
  const steam = [];
  const addPuff = (t0, life, big) => {
    const m = new THREE.SpriteMaterial({ map: puff, color: new THREE.Color(1.0, 0.94, 0.88), transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(m); s.renderOrder = 20; scene.add(s);
    const side = rnd();
    let x, z, vx, vz;
    if (side < 0.6) { x = (rnd() - 0.5) * 5; z = 2.05; vx = (rnd() - 0.5) * 0.8; vz = 0.9 + rnd() * 1.3; }
    else if (side < 0.8) { x = 2.55; z = (rnd() - 0.5) * 4; vx = 0.9 + rnd() * 1.2; vz = (rnd() - 0.5) * 0.6; }
    else { x = -2.55; z = (rnd() - 0.5) * 4; vx = -(0.9 + rnd() * 1.2); vz = (rnd() - 0.5) * 0.6; }
    steam.push({ s, t0, life, x, z, vx, vz, vy: 0.7 + rnd() * 1.3, size: (big ? 2.2 : 1.2) * (0.7 + rnd() * 0.8), rot: rnd() * 6.28, a: big ? 0.5 : 0.3 });
  };
  for (let i = 0; i < 16; i++) addPuff(CLOSE + rnd() * 0.25, 1.1 + rnd() * 0.7, false);
  for (let i = 0; i < 16; i++) addPuff(CLOSE + 0.3 + rnd() * 2.0, 1.2 + rnd() * 0.8, false);
  for (let i = 0; i < 34; i++) addPuff(OPEN - 0.05 + rnd() * 0.35, 1.0 + rnd() * 0.7, true);

  const dust = makeDust({ count: 180, box: [16, 16, 16], seed: 31, size: 0.06, intensity: 0.8, focus: 21, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.set(0, 5, 4);
  scene.add(dust);

  function update(t) {
    dust.material.uniforms.time.value = t + 20;
    backdrop.material.uniforms.time.value = t;
    // head travel: drop, small settle on contact, lift at the end
    const down = ease.inCubic(prog(t, 0.05, CLOSE));
    const settle = t > CLOSE ? Math.exp(-(t - CLOSE) * 14) * Math.sin((t - CLOSE) * 38) * 0.035 : 0;
    const up = ease.inOutCubic(prog(t, OPEN, OPEN + 0.6));
    head.position.y = lerp(3.3, 0, down) + settle + up * 3.0;
    const closed = t >= CLOSE && t < OPEN ? 1 : 0;
    const heat = closed * smooth(prog(t, CLOSE, CLOSE + 0.35)) + (t >= OPEN ? Math.exp(-(t - OPEN) * 3.0) : 0);
    const flick = 0.9 + 0.1 * Math.sin(t * 23) * Math.sin(t * 7.3);
    seam.material.opacity = heat * 0.42 * flick;
    seamCore.material.opacity = closed ? sat(heat) : 0;
    seamCore.visible = closed > 0;
    heatL.intensity = heat * 20 * flick; heatL2.intensity = heat * 12 * flick;
    film.visible = art.visible = true;

    for (const p of steam) {
      const a = (t - p.t0) / p.life;
      p.s.visible = a > 0 && a < 1;
      if (!p.s.visible) continue;
      const e = 1 - Math.pow(1 - a, 2);
      p.s.position.set(p.x + p.vx * e * 1.6, 0.55 + p.vy * a * 2.2 + e * 0.4, p.z + p.vz * e * 1.6);
      const sc = p.size * (0.5 + a * 2.4);
      p.s.scale.set(sc, sc, 1);
      p.s.material.rotation = p.rot + a * 0.8;
      p.s.material.opacity = p.a * Math.sin(Math.PI * Math.pow(a, 0.6)) ;
    }

    // camera: low three-quarter angle, slow push toward the seam
    const push = ease.inOutSine(prog(t, 0, 4));
    const shake = t > CLOSE ? Math.exp(-(t - CLOSE) * 9) * Math.sin((t - CLOSE) * 60) * 0.05 : 0;
    camera.position.set(lerp(7.0, 5.6, push), lerp(4.6, 4.0, push) + shake, lerp(20.0, 18.2, push));
    camera.lookAt(0, lerp(3.3, 3.05, push) + shake * 0.6, 0);
  }

  function drawOverlay(c, t) {
    const out = t - 3.62;
    const gold = '#f1c26b';
    label(c, 'HOT PEEL IN', 540, 322, { family: FONT.label, weight: 700, size: 32, tracking: 16, fill: gold }, t - 0.3, out);
    rule(c, 540, 356, 380, t - 0.35, { star: true, color: gold, alpha: out > 0 ? sat(1 - out / 0.2) * 0.8 : 0.8 });
    const exit = out > 0 ? ease.inCubic(sat(out / 0.22)) : 0;
    const num = { family: FONT.display, size: 330, gradient: ['#fffaf0', '#f4ead8', '#d9c39b'], shadow: { blur: 50, y: 10, color: 'rgba(0,0,0,0.6)' } };
    const steps = [['6', CLOSE], ['7', CLOSE + 0.5], ['8', CLOSE + 1.0], ['6–8', CLOSE + 1.5]];
    for (let i = 0; i < steps.length; i++) {
      const [s, t0] = steps[i];
      const t1 = i < steps.length - 1 ? steps[i + 1][1] : 99;
      if (t < t0 || t >= t1 + 0.1) continue;
      const p = t - t0;
      const e = ease.outExpo(sat(p / 0.32));
      const leave = sat((t - t1 + 0.02) / 0.1);
      c.save();
      c.translate(540, 560); c.scale(lerp(1.35, 1, e) + leave * 0.1, lerp(1.35, 1, e) + leave * 0.1); c.translate(-540, -560);
      text(c, s, 540, 672, { ...num, alpha: sat(p / 0.08) * (1 - leave) * (1 - exit), blur: (1 - e) * 10 + leave * 8 + exit * 12, tracking: s.length > 1 ? -6 : 0 });
      c.restore();
    }
    riseLine(c, 'SECONDS', 540, 800, { family: FONT.display, size: 100, tracking: 12, gradient: ['#fff8ea', '#f4ead8', '#dcc9a6'] }, t - CLOSE - 0.05, out);
  }

  function post(t) {
    const closed = t >= CLOSE && t < OPEN + 0.5;
    return {
      flash: Math.exp(-t * 10) * 0.5 + pulse(t, CLOSE + 0.02, 0.06) * 0.22 + ease.inQuad(prog(t, 3.55, 4.0)) * 1.25,
      flashColor: [1.0, 0.95, 0.9],
      zoomBlur: Math.exp(-t * 12) * 0.15,
      hazeAmt: closed ? smooth(prog(t, CLOSE, CLOSE + 0.4)) * 1.0 : 0, hazeY0: 0.3, hazeY1: 0.82,
      bloom: 0.6, streak: 0.5, exposure: 1.0,
    };
  }

  return { name: 'press', scene, camera, update, drawOverlay, post, samples: 5 };
}
