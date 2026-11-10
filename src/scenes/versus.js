// "Fabric or hard surface?" — split screen: regular DTF on a shirt (left)
// against UV DTF on a tumbler (right). One scene, four shots:
//   0-2 s   hook            "Same design. Two transfers."
//   2-5 s   what it goes on (tee / hoodie / tote  vs  tumbler / mug / sign)
//   5-9 s   how it goes on  (heat press 6-8 s     vs  no heat, peel and stick)
//   9-12 s  the reveal      (both films peel together)

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeDust, softSprite, puffSprite, fabricNormalMap } from '../lib/stage.js';
import { canvasTexture, tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, mulberry32, pulse, deg } from '../lib/util.js';
import { text, chars, riseLine, label, rule, roundRect, FONT, CREAM } from '../lib/overlay.js';

const LX = -0.96, RX = 0.96, CY = 0.36;      // stage centres (world units)
const G = 1.75;                              // garment card size
const PRESS0 = 5.45, CONTACT = 6.0, LIFT = 7.5;
const PEEL0 = 9.3, PEEL1 = 10.8;
const GOLD = '#f1c26b';

// ---- garment silhouettes ------------------------------------------------------
function silhouette(draw) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 768;
  const c = cv.getContext('2d'); c.scale(768, 768);
  c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c);
  const t = canvasTexture(cv);
  return t;
}
const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
const seam = (c) => { c.strokeStyle = 'rgba(150,150,150,1)'; c.lineWidth = 0.006; };

const GARMENTS = {
  tee: {
    print: [0, 0.12, 0.74],
    tex: () => silhouette((c) => {
      c.beginPath(); c.moveTo(0.36, 0.10); c.quadraticCurveTo(0.5, 0.21, 0.64, 0.10);
      [[0.80, 0.14], [0.98, 0.34], [0.84, 0.47], [0.76, 0.39], [0.76, 0.93], [0.24, 0.93], [0.24, 0.39], [0.16, 0.47], [0.02, 0.34], [0.20, 0.14]].forEach(([x, y]) => c.lineTo(x, y));
      c.closePath(); c.fill();
      seam(c); c.beginPath(); c.moveTo(0.345, 0.115); c.quadraticCurveTo(0.5, 0.235, 0.655, 0.115); c.stroke();
    }),
  },
  hoodie: {
    print: [0, 0.14, 0.58],
    tex: () => silhouette((c) => {
      poly(c, [[0.33, 0.2], [0.67, 0.2], [0.82, 0.26], [0.97, 0.78], [0.84, 0.82], [0.76, 0.5], [0.76, 0.94], [0.24, 0.94], [0.24, 0.5], [0.16, 0.82], [0.03, 0.78], [0.18, 0.26]]);
      c.beginPath(); c.ellipse(0.5, 0.15, 0.175, 0.125, 0, 0, Math.PI * 2); c.fill();
      seam(c);
      c.beginPath(); c.moveTo(0.37, 0.71); c.lineTo(0.63, 0.71); c.lineTo(0.67, 0.87); c.lineTo(0.33, 0.87); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(0.4, 0.2); c.quadraticCurveTo(0.5, 0.33, 0.6, 0.2); c.stroke();
      c.beginPath(); c.moveTo(0.46, 0.27); c.lineTo(0.455, 0.42); c.moveTo(0.54, 0.27); c.lineTo(0.545, 0.42); c.stroke();
    }),
  },
  tote: {
    print: [0, -0.3, 0.72],
    tex: () => silhouette((c) => {
      c.lineWidth = 0.05;
      c.beginPath(); c.moveTo(0.34, 0.4); c.bezierCurveTo(0.34, 0.02, 0.66, 0.02, 0.66, 0.4); c.stroke();
      roundRect(c, 0.19, 0.37, 0.62, 0.59, 0.02); c.fill();
      seam(c); c.beginPath(); c.moveTo(0.19, 0.415); c.lineTo(0.81, 0.415); c.stroke();
    }),
  },
};

export function createVersus(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.env; scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(24, ctx.aspect, 0.1, 100);

  // ---- split backdrop --------------------------------------------------
  const bgMat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, heat: { value: 0 }, uvl: { value: 0 }, open: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float time, heat, uvl, open; varying vec2 vUv;
      float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
      float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main() {
        float fog = 0.75 + 0.5 * vnoise(vUv * vec2(3.0, 5.0) + vec2(time * 0.03, -time * 0.02));
        vec2 dl = (vUv - vec2(0.25, 0.545)) * vec2(1.0, 1.7778);
        vec2 dr = (vUv - vec2(0.75, 0.545)) * vec2(1.0, 1.7778);
        float gl = exp(-dot(dl, dl) * 9.0), gr = exp(-dot(dr, dr) * 9.0);
        vec3 col = vec3(0.004, 0.006, 0.014);
        col += (vec3(0.085, 0.036, 0.018) + vec3(0.30, 0.09, 0.015) * heat) * gl * fog * step(vUv.x, 0.5 + 0.5 * (1.0 - open));
        col += (vec3(0.018, 0.034, 0.105) + vec3(0.13, 0.03, 0.34) * uvl) * gr * fog * step(0.5 - 0.5 * (1.0 - open), vUv.x);
        vec2 pl = (vUv - vec2(0.25, 0.2)) * vec2(1.0, 3.2), pr = (vUv - vec2(0.75, 0.2)) * vec2(1.0, 3.2);
        col += (vec3(0.05, 0.02, 0.01) + vec3(0.16, 0.05, 0.01) * heat) * exp(-dot(pl, pl) * 16.0) * open;
        col += (vec3(0.012, 0.02, 0.06) + vec3(0.07, 0.02, 0.18) * uvl) * exp(-dot(pr, pr) * 16.0) * open;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthWrite: false,
  });
  const bgGeo = new THREE.BufferGeometry();
  bgGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  bgGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  const bg = new THREE.Mesh(bgGeo, bgMat); bg.frustumCulled = false; bg.renderOrder = -100; scene.add(bg);

  const key = new THREE.DirectionalLight(0xffe6c8, 2.4); key.position.set(-4, 6, 9); scene.add(key);
  const warm = new THREE.PointLight(0xff8a3c, 26, 0, 2); warm.position.set(LX - 2.2, CY + 1.5, 2.5); scene.add(warm);
  const cool = new THREE.PointLight(0x5d7dff, 34, 0, 2); cool.position.set(RX + 2.4, CY + 1.2, 2.0); scene.add(cool);
  const uvLight = new THREE.PointLight(0x8a4dff, 0, 0, 2); uvLight.position.set(RX - 0.6, CY + 0.4, 2.2); scene.add(uvLight);
  const heatLight = new THREE.PointLight(0xff6a1a, 0, 0, 2); heatLight.position.set(LX, CY - 0.4, 1.6); scene.add(heatLight);

  const glowTex = softSprite(256, 1.6);
  const artTex = canvasTexture(ctx.assets.designs.sunset);
  const printMat = () => new THREE.MeshStandardMaterial({ map: artTex, emissiveMap: artTex, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.5, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 0.5 });
  const filmMat = () => new THREE.MeshPhysicalMaterial({ color: 0xe6edf8, roughness: 0.26, metalness: 0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2.4, clearcoat: 1, clearcoatRoughness: 0.15 });

  // ======================= LEFT: garments =================================
  const L = new THREE.Group(); L.position.set(LX, CY, 0); scene.add(L);
  const nm = fabricNormalMap(); nm.repeat.set(9, 9);
  const garments = {};
  for (const [id, g] of Object.entries(GARMENTS)) {
    const grp = new THREE.Group(); L.add(grp);
    const cloth = new THREE.MeshPhysicalMaterial({ color: 0x3a3c47, map: g.tex(), roughness: 0.9, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0x565c6c), sheenRoughness: 0.55, normalMap: nm, normalScale: new THREE.Vector2(0.9, 0.9), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.9 });
    const body = new THREE.Mesh(new THREE.PlaneGeometry(G, G), cloth); grp.add(body);
    const [px, py, ps] = g.print;
    const print = new THREE.Mesh(new THREE.PlaneGeometry(ps, ps), printMat());
    print.position.set(px, py, 0.008); print.renderOrder = 2; grp.add(print);
    garments[id] = { grp, print };
  }
  const tee = garments.tee;

  // heat press parts, in the tee's local space (z = out of the fabric)
  const metal = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 1, roughness: 0.28 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x14275a, metalness: 0.55, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const lower = new THREE.Mesh(new RoundedBoxGeometry(1.36, 1.5, 0.16, 3, 0.04), metal); lower.position.set(0, 0.02, -0.1); tee.grp.add(lower);
  const head = new THREE.Group(); tee.grp.add(head);
  const heater = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.44, 0.16, 3, 0.04), metal); heater.position.z = 0.1; head.add(heater);
  const housing = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.26, 0.3, 3, 0.07), navy); housing.position.z = 0.33; head.add(housing);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72 * 456 / 972), new THREE.MeshBasicMaterial({ map: canvasTexture(tint(ctx.assets.images.hat, '#f4ead8', 0.5)), transparent: true, opacity: 0.92, depthWrite: false }));
  badge.position.z = 0.482; head.add(badge);
  const heatGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(3.0, 0.85, 0.12), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  heatGlow.position.set(0, 0.02, 0.03); heatGlow.renderOrder = 3; tee.grp.add(heatGlow);

  // film on the tee
  const FS_L = 0.98;
  const filmLGeo = new THREE.PlaneGeometry(FS_L, FS_L, 56, 56);
  const filmL = new THREE.Mesh(filmLGeo, filmMat()); filmL.renderOrder = 4;
  const filmLHolder = new THREE.Group(); filmLHolder.position.set(0, 0.12, 0.014); filmLHolder.add(filmL); tee.grp.add(filmLHolder);
  const restL = filmLGeo.attributes.position.array.slice();

  // steam
  const puff = puffSprite(256, 9);
  const rnd = mulberry32(91);
  const steam = [];
  for (let i = 0; i < 26; i++) {
    const big = i >= 10;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puff, color: new THREE.Color(1.0, 0.93, 0.86), transparent: true, opacity: 0, depthWrite: false }));
    s.renderOrder = 20; scene.add(s);
    const a = rnd() * Math.PI * 2;
    steam.push({ s, t0: (big ? LIFT - 0.05 : CONTACT) + rnd() * 0.3, life: 0.9 + rnd() * 0.6, a, v: 0.35 + rnd() * 0.5, vy: 0.4 + rnd() * 0.7, size: (big ? 0.7 : 0.5) * (0.7 + rnd() * 0.7), rot: rnd() * 6.28, o: big ? 0.24 : 0.2 });
  }

  // ======================= RIGHT: hard goods ==============================
  const R = new THREE.Group(); R.position.set(RX, CY, 0); scene.add(R);
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xc9ced6, metalness: 1, roughness: 0.24, envMapIntensity: 1.3 });
  const coat = new THREE.MeshPhysicalMaterial({ color: 0x1b1e27, metalness: 0.1, roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.3, envMapIntensity: 1.0 });
  const TB = { h: 1.5, r0: 0.36, r1: 0.47 };
  const rAt = (y) => lerp(TB.r0, TB.r1, (y + TB.h / 2) / TB.h);
  const tumbler = new THREE.Group(); R.add(tumbler);
  tumbler.add(new THREE.Mesh(new THREE.CylinderGeometry(TB.r1, TB.r0, TB.h, 72, 1), coat));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(TB.r0 + 0.004, TB.r0 - 0.012, 0.16, 72), steel); band.position.y = -TB.h / 2 + 0.06; tumbler.add(band);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.11, 72), new THREE.MeshPhysicalMaterial({ color: 0x0b0d14, roughness: 0.35, metalness: 0.2, clearcoat: 0.6 }));
  lid.position.y = TB.h / 2 + 0.05; tumbler.add(lid);
  // the transfer (print + film) wraps the tumbler
  const TS = 0.68, TY = 0.02;
  const rMid = rAt(TY);
  const transfer = new THREE.Group(); tumbler.add(transfer);
  const th = TS / rMid;
  const decalT = new THREE.Mesh(new THREE.CylinderGeometry(rAt(TY + TS / 2) + 0.004, rAt(TY - TS / 2) + 0.004, TS, 48, 1, true, -th / 2, th), printMat());
  decalT.position.y = TY; decalT.renderOrder = 2; transfer.add(decalT);
  const FS_R = 0.84;
  const filmRGeo = new THREE.PlaneGeometry(FS_R, FS_R, 56, 56);
  const filmR = new THREE.Mesh(filmRGeo, filmMat()); filmR.renderOrder = 4; filmR.frustumCulled = false; transfer.add(filmR);
  const restR = filmRGeo.attributes.position.array.slice();

  const mug = new THREE.Group(); R.add(mug);
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf1ede4, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 });
  mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 1.1, 72), ceramic));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.07, 20, 48, Math.PI * 1.25), ceramic);
  handle.position.set(0.5, 0, 0); handle.rotation.z = -Math.PI * 0.625; mug.add(handle);
  const mth = 0.62 / 0.52;
  const decalM = new THREE.Mesh(new THREE.CylinderGeometry(0.524, 0.524, 0.62, 48, 1, true, -mth / 2, mth), printMat());
  decalM.renderOrder = 2; mug.add(decalM);

  const sign = new THREE.Group(); R.add(sign);
  sign.add(new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.15, 0.07, 3, 0.03), new THREE.MeshPhysicalMaterial({ color: 0xefe6d2, roughness: 0.3, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.1 })));
  for (const [sx, sy] of [[-0.66, 0.48], [0.66, 0.48], [-0.66, -0.48], [0.66, -0.48]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 20), steel); b.rotation.x = Math.PI / 2; b.position.set(sx, sy, 0.045); sign.add(b);
  }
  const decalS = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), printMat()); decalS.position.z = 0.04; decalS.renderOrder = 2; sign.add(decalS);

  const uvGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.6), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.55, 0.2, 1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  uvGlow.position.set(RX, CY, -0.8); uvGlow.renderOrder = -5; scene.add(uvGlow);
  const rub = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.3, 1.1, 2.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  rub.renderOrder = 8; scene.add(rub);

  // light sweeps for the reveal
  const sweeps = [LX, RX].map((x) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4.2), new THREE.MeshBasicMaterial({ map: softSprite(128, 2.2), color: new THREE.Color(1.0, 0.94, 0.82), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.z = -0.45; m.position.set(x, CY, 0.7); m.renderOrder = 9; scene.add(m);
    return { m, x };
  });

  const dust = makeDust({ count: 170, box: [5, 8, 8], seed: 61, size: 0.014, intensity: 0.9, focus: 16, blur: 0.012, fov: 24, pixelH: ctx.pixelH });
  dust.position.z = 5; scene.add(dust);

  // ---- film peel (shared by the flat tee and the curved tumbler) ----------
  const PR = 0.085, dxp = -Math.SQRT1_2, dyp = Math.SQRT1_2;
  function peel(geo, rest, size, front, map) {
    const p = geo.attributes.position;
    const cx0 = size / 2, cy0 = -size / 2;
    for (let i = 0; i < p.count; i++) {
      let x = rest[i * 3], y = rest[i * 3 + 1], z = 0;
      const s = (x - cx0) * dxp + (y - cy0) * dyp, u = front - s;
      if (u > 0) {
        let along;
        if (u < Math.PI * PR) { along = front - PR * Math.sin(u / PR); z = PR * (1 - Math.cos(u / PR)); }
        else { const e = u - Math.PI * PR; along = front + e * 0.9; z = 2 * PR + e * 0.42; }
        x += dxp * (along - s); y += dyp * (along - s);
      }
      map(p, i, x, y, z);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  }
  const mapFlat = (p, i, x, y, z) => p.setXYZ(i, x, y, z);
  const mapCyl = (p, i, x, y, z) => { const r = rAt(TY + y) + 0.008 + z, a = x / rMid; p.setXYZ(i, Math.sin(a) * r, TY + y, Math.cos(a) * r); };

  /** Visibility + turn for an item on screen during [a, b). */
  function cycle(grp, t, wins, spin) {
    let on = false;
    for (const [a, b] of wins) {
      if (t < a || t >= b) continue;
      on = true;
      const e = ease.outExpo(sat((t - a) / 0.42)), o = ease.inCubic(sat((t - (b - 0.14)) / 0.14));
      grp.rotation.y = a === 0 ? 0 : lerp(-spin, 0, e) + spin * o;
      const s = a === 0 ? ease.outBack(prog(t, 0.2, 0.8), 1.3) : lerp(0.82, 1, e) * (1 - o * 0.15);
      grp.scale.setScalar(Math.max(s, 0.001));
    }
    grp.visible = on;
  }

  function update(t) {
    bgMat.uniforms.time.value = t;
    dust.material.uniforms.time.value = t + 40;
    camera.position.set(0, 0.25 - prog(t, 0, 12) * 0.2, 16.4 - ease.inOutSine(prog(t, 0, 12)) * 0.5);
    camera.lookAt(0, 0, 0);

    // items
    cycle(tee.grp, t, [[0, 3], [5, 99]], deg(100));
    cycle(garments.hoodie.grp, t, [[3, 4]], deg(100));
    cycle(garments.tote.grp, t, [[4, 5]], deg(100));
    cycle(tumbler, t, [[0, 3], [5, 99]], deg(150));
    cycle(mug, t, [[3, 4]], deg(150));
    cycle(sign, t, [[4, 5]], deg(110));
    const bob = Math.sin(t * 1.3) * 0.02;
    L.position.y = CY + bob; R.position.y = CY - bob;
    if (t < 5) { tumbler.rotation.y += Math.sin(t * 0.9) * 0.18; mug.rotation.y += Math.sin(t * 0.9) * 0.2 - 0.25; sign.rotation.y += Math.sin(t * 0.9) * 0.2; }

    // ---- left: press ----
    const tilt = ease.inOutCubic(prog(t, 5.0, 5.5)) * (1 - 0.7 * ease.inOutCubic(prog(t, 8.1, 8.8)));
    L.rotation.x = deg(-56) * tilt;
    L.position.z = tilt * 0.3;
    const pressOn = t > 5.05 && t < 8.3;
    lower.visible = t >= 5.0 && t < 8.75; head.visible = pressOn;
    const down = ease.inCubic(prog(t, PRESS0, CONTACT)), up = ease.inOutCubic(prog(t, LIFT, LIFT + 0.6));
    const settle = t > CONTACT ? Math.exp(-(t - CONTACT) * 14) * Math.sin((t - CONTACT) * 38) * 0.02 : 0;
    head.position.z = lerp(2.6, 0.02, down) + settle + up * 3.4;
    head.position.y = 0.02 + up * 1.2;
    const closed = t >= CONTACT && t < LIFT;
    const heat = (closed ? smooth(prog(t, CONTACT, CONTACT + 0.3)) : 0) + (t >= LIFT ? Math.exp(-(t - LIFT) * 3.5) : 0);
    const flick = 0.9 + 0.1 * Math.sin(t * 23) * Math.sin(t * 7.3);
    heatGlow.material.opacity = heat * 0.6 * flick;
    heatLight.intensity = heat * 9 * flick;
    bgMat.uniforms.heat.value = heat * 0.8;
    filmL.material.opacity = 0.4 * smooth(prog(t, 5.0, 5.3)) * (1 - smooth(prog(t, PEEL1 - 0.25, PEEL1 + 0.1)));
    filmL.visible = filmL.material.opacity > 0.003;
    for (const p of steam) {
      const a = (t - p.t0) / p.life;
      p.s.visible = a > 0 && a < 1;
      if (!p.s.visible) continue;
      const e = 1 - (1 - a) * (1 - a);
      p.s.position.set(LX + Math.cos(p.a) * (0.5 + p.v * e), CY - 0.25 + Math.sin(p.a) * 0.25 + p.vy * a, 0.9);
      const sc = p.size * (0.5 + a * 2.2); p.s.scale.set(sc, sc, 1);
      p.s.material.rotation = p.rot + a; p.s.material.opacity = p.o * Math.sin(Math.PI * Math.pow(a, 0.6));
    }

    // ---- right: peel and stick ----
    const arrive = ease.outCubic(prog(t, 5.25, CONTACT));
    transfer.position.z = t >= 5 ? (1 - arrive) * 1.5 : 0;
    transfer.position.y = t >= 5 ? (1 - arrive) * 0.25 : 0;
    const tOp = t < 5 ? 1 : sat(prog(t, 5.25, 5.6));
    decalT.material.opacity = tOp;
    filmR.material.opacity = t < 5 ? 0 : 0.42 * tOp * (1 - smooth(prog(t, PEEL1 - 0.25, PEEL1 + 0.1)));
    filmR.visible = filmR.material.opacity > 0.003;
    if (t >= 5) tumbler.rotation.y += Math.sin((t - 5) * 0.8) * 0.1 * smooth(prog(t, 8, 9));
    const rubP = prog(t, CONTACT + 0.05, LIFT + 0.1);
    const rubOn = Math.sin(Math.PI * sat(rubP)) > 0 && rubP > 0 && rubP < 1;
    rub.material.opacity = rubOn ? 0.75 * Math.min(1, Math.sin(Math.PI * rubP) * 3) : 0;
    rub.position.set(RX + Math.sin(rubP * Math.PI * 5) * 0.27, CY + TY + lerp(0.26, -0.26, rubP), 0.6);
    const uvl = smooth(prog(t, 5.2, 5.8)) * (1 - smooth(prog(t, 8.2, 9.0)));
    uvGlow.material.opacity = uvl * (0.5 + 0.12 * Math.sin(t * 9));
    uvLight.intensity = uvl * 22;
    bgMat.uniforms.uvl.value = uvl * 0.8;

    // ---- reveal ----
    const pe = ease.inOutCubic(prog(t, PEEL0, PEEL1));
    peel(filmLGeo, restL, FS_L, pe * (FS_L * Math.SQRT2 + 0.55), mapFlat);
    peel(filmRGeo, restR, FS_R, pe * (FS_R * Math.SQRT2 + 0.55), mapCyl);
    const pop = smooth(prog(t, PEEL0 + 0.6, PEEL1 + 0.3));
    tee.print.material.emissiveIntensity = lerp(0.4, 0.62, pop);
    decalT.material.emissiveIntensity = lerp(0.4, 0.62, pop);
    const sw = prog(t, 10.85, 11.65);
    for (const s of sweeps) {
      s.m.position.x = s.x + lerp(-1.2, 1.2, ease.inOutSine(sw));
      s.m.material.opacity = Math.sin(Math.PI * sw) * 0.4;
    }
    bgMat.uniforms.open.value = 1 - ease.inCubic(prog(t, 11.6, 12.0));
  }

  // ---- typography ---------------------------------------------------------
  const hatBug = tint(ctx.assets.images.hat, '#f4ead8', 0.25);
  const SUBS = [
    [2.0, 4.9, 'FABRIC', 'HARD SURFACES'],
    [5.0, 8.9, 'HEAT PRESS  ·  6–8 SEC', 'NO HEAT  ·  PEEL & STICK'],
    [9.0, 11.6, '50+ WASHES', 'STRONG ADHESION'],
  ];
  const HEADS = [[2.0, 4.86, 'WHAT IT GOES ON'], [5.0, 8.86, 'HOW IT GOES ON'], [9.0, 11.55, 'THE RESULT']];
  const NAMES = [[2.0, 3.0, 'T-SHIRTS', 'TUMBLERS'], [3.0, 4.0, 'HOODIES', 'MUGS'], [4.0, 5.0, 'TOTE BAGS', 'SIGNS']];

  function drawOverlay(c, t) {
    const end = t - 11.6;
    const endA = end > 0 ? 1 - ease.inCubic(sat(end / 0.3)) : 1;
    // brand bug (name on screen from the first second)
    const ba = smooth(prog(t, 0.25, 0.8)) * endA;
    if (ba > 0) {
      c.save(); c.globalAlpha = ba * 0.95;
      const bw = 104, bh = bw * hatBug.height / hatBug.width;
      c.drawImage(hatBug, 540 - bw / 2, 282, bw, bh);
      c.restore();
      text(c, 'COWBOY DTF', 540, 366, { family: FONT.label, weight: 800, size: 22, tracking: 9, fill: CREAM, alpha: ba * 0.95 });
    }
    // divider
    const dv = ease.outExpo(prog(t, 0.1, 0.9)) * (1 - ease.inCubic(prog(t, 11.55, 11.95)));
    if (dv > 0) {
      const y0 = 925 - 325 * dv, y1 = 925 + 325 * dv;
      const g = c.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, 'rgba(244,234,216,0)'); g.addColorStop(0.2, 'rgba(244,234,216,0.9)'); g.addColorStop(0.8, 'rgba(244,234,216,0.9)'); g.addColorStop(1, 'rgba(244,234,216,0)');
      c.save(); c.shadowColor = 'rgba(255,225,180,0.9)'; c.shadowBlur = 18; c.fillStyle = g; c.fillRect(539, y0, 2, y1 - y0); c.restore();
    }
    // hook
    if (t < 2.2) {
      const out = t - 1.78, ex = out > 0 ? ease.inCubic(sat(out / 0.22)) : 0;
      const o = { family: FONT.serif, style: 'italic', weight: 700, size: 88, fill: CREAM, alpha: 1 - ex, blur: ex * 12 };
      [['Same design.', 470, 0.3], ['Two transfers.', 570, 0.62]].forEach(([s, y, t0]) => {
        chars(c, s, 540, y, o, (i) => { const e = ease.outQuint(sat((t - t0 - i * 0.03) / 0.6)); return { dy: (1 - e) * 40, a: e, blur: (1 - e) * 12 }; });
      });
    }
    // shot headlines
    for (const [a, b, s] of HEADS) {
      if (t < a || t > b + 0.3) continue;
      riseLine(c, s, 540, 505, { family: FONT.display, size: 80, tracking: 4, gradient: ['#fff8ea', '#f4ead8', '#dcc9a6'] }, t - a - 0.05, t - b, { stagger: 0.016, dur: 0.45 });
      rule(c, 540, 548, 380, t - a - 0.12, { star: true, color: GOLD, alpha: t > b ? sat(1 - (t - b) / 0.2) * 0.8 : 0.8, dur: 0.5 });
    }
    // half titles
    const ha = t - 0.7;
    if (ha > 0 && endA > 0) {
      c.save(); c.globalAlpha = endA;
      riseLine(c, 'DTF', 292, 1182, { family: FONT.display, size: 96, tracking: 5, gradient: ['#fff3dc', '#ffcf8a', '#f08a3c'] }, ha, -1);
      riseLine(c, 'UV DTF', 788, 1182, { family: FONT.display, size: 96, tracking: 5, gradient: ['#f4f0ff', '#b9c4ff', '#7d6bff'] }, ha - 0.08, -1);
      c.restore();
    }
    for (const [a, b, l, r] of SUBS) {
      if (t < a || t > b + 0.3) continue;
      const o = { family: FONT.label, weight: 700, size: 23, tracking: 4, fill: CREAM };
      label(c, l, 292, 1236, o, t - a - 0.15, t - b, { dur: 0.4 });
      label(c, r, 788, 1236, o, t - a - 0.22, t - b, { dur: 0.4 });
    }
    // item names in shot 2
    for (const [a, b, l, r] of NAMES) {
      if (t < a || t > b) continue;
      const o = { family: FONT.label, weight: 700, size: 21, tracking: 6, fill: GOLD };
      label(c, l, 292, 606, o, t - a - 0.05, t - (b - 0.12), { dur: 0.3, outDur: 0.12 });
      label(c, r, 788, 606, o, t - a - 0.1, t - (b - 0.12), { dur: 0.3, outDur: 0.12 });
    }
    // counter over the press
    const steps = [['6', CONTACT], ['7', CONTACT + 0.5], ['8', CONTACT + 1.0]];
    for (let i = 0; i < steps.length; i++) {
      const [s, t0] = steps[i], t1 = t0 + 0.5;
      if (t < t0 || t >= t1 + 0.1) continue;
      const p = t - t0, e = ease.outExpo(sat(p / 0.3)), leave = sat((t - t1 + 0.02) / 0.1);
      c.save(); c.translate(292, 700); c.scale(lerp(1.4, 1, e), lerp(1.4, 1, e)); c.translate(-292, -700);
      text(c, s, 292, 760, { family: FONT.display, size: 170, gradient: ['#fffaf0', '#ffd9a0', '#f08a3c'], alpha: sat(p / 0.08) * (1 - leave), blur: (1 - e) * 8 + leave * 8, shadow: { blur: 40, y: 6, color: 'rgba(0,0,0,0.7)' } });
      c.restore();
    }
    // "no heat" stamp on the UV side while the press runs
    const nh = t - CONTACT;
    if (nh > 0 && t < LIFT + 0.6) {
      const e = ease.outBack(sat(nh / 0.3), 2), o2 = sat((t - LIFT - 0.4) / 0.2);
      c.save(); c.translate(788, 590); c.scale(e, e); c.translate(-788, -590);
      text(c, 'NO HEAT', 788, 612, { family: FONT.display, size: 64, tracking: 4, gradient: ['#f4f0ff', '#b9c4ff', '#8f7dff'], alpha: (1 - o2) * sat(nh / 0.08), shadow: { blur: 30, y: 4, color: 'rgba(0,0,0,0.75)' } });
      c.restore();
    }
  }

  function post(t) {
    const cut = (x, k = 0.5) => (t >= x ? Math.exp(-(t - x) * 10) * k : 0);
    return {
      fade: smooth(prog(t, 0.0, 0.25)),
      flash: cut(2.0, 0.35) + cut(5.0, 0.4) + pulse(t, CONTACT + 0.02, 0.06) * 0.2 + cut(9.0, 0.4) + ease.inCubic(prog(t, 11.7, 12.0)) * 0.5,
      flashColor: [1.0, 0.95, 0.9],
      zoomBlur: cut(2.0, 0.08) + cut(5.0, 0.1) + cut(9.0, 0.1),
      bloom: 0.5, streak: 0.4, exposure: 1.08, saturation: 1.1,
    };
  }

  return { name: 'versus', scene, camera, update, drawOverlay, post, samples: 5 };
}
