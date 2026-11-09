// Scene 2 — the AI gang sheet builder. Designs fly in, snap into a packed
// 22 x 36 in sheet, and a scan line passes over them.

import * as THREE from 'three';
import { makeDust, makeBackdrop, softSprite } from '../lib/stage.js';
import { canvasTexture } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, mulberry32, pulse, deg } from '../lib/util.js';
import { riseLine, label, rule, FONT, CREAM } from '../lib/overlay.js';

const U = 0.2; // world units per inch
const SCAN0 = 1.75, SCAN1 = 2.75;

export function createSheet(ctx) {
  const { LAYOUT, SHEET, designs } = ctx.assets;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: 0x0d1a3c, outer: 0x010205, center: [0.5, 0.45], radius: 0.8 });
  scene.add(backdrop);

  const rig = new THREE.Group();
  scene.add(rig);
  const SW = SHEET.w * U, SH = SHEET.h * U;

  // film sheet
  const sheetMat = new THREE.ShaderMaterial({
    uniforms: { scan: { value: -1 }, size: { value: new THREE.Vector2(SHEET.w, SHEET.h) }, reveal: { value: 1 } },
    vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float scan, reveal; uniform vec2 size; varying vec2 vUv;
      void main() {
        vec2 p = vUv * size;                       // inches
        vec2 g = abs(fract(p) - 0.5);
        float fw = fwidth(p.x) * 1.2;
        float grid = 1.0 - smoothstep(0.5 - fw * 1.5, 0.5, max(g.x, g.y));
        vec2 g5 = abs(fract(p / 4.0) - 0.5) * 4.0;
        float major = 1.0 - smoothstep(2.0 - fw * 2.5, 2.0, max(g5.x, g5.y));
        vec2 e = min(p, size - p);
        float border = 1.0 - smoothstep(0.0, 0.12, min(e.x, e.y) - 0.02);
        float y = 1.0 - vUv.y;                     // 0 top .. 1 bottom
        float done = smoothstep(scan + 0.01, scan - 0.02, y);
        vec3 base = mix(vec3(0.008, 0.012, 0.028), vec3(0.012, 0.024, 0.052), done);
        vec3 col = base + vec3(0.10, 0.16, 0.34) * (grid * 0.07 + major * 0.2) * (0.7 + 0.5 * done);
        col += vec3(0.95, 0.9, 0.8) * border * 0.9;
        float band = exp(-pow((y - scan) * 26.0, 2.0));
        col += vec3(0.35, 0.75, 1.0) * band * 0.9;
        gl_FragColor = vec4(col, 0.93 * reveal);
      }`,
    transparent: true, depthWrite: false,
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), sheetMat);
  sheet.renderOrder = 1;
  rig.add(sheet);

  // soft glow under the sheet
  const glowTex = softSprite(256, 1.6);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2.3, SH * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.05, 0.11, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  under.position.z = -0.4; under.renderOrder = 0;
  rig.add(under);

  // tiles
  const rnd = mulberry32(42);
  const texes = {};
  for (const id of Object.keys(designs)) texes[id] = canvasTexture(designs[id]);
  const order = LAYOUT.map((_, i) => i).sort((a, b) => (LAYOUT[a].y + LAYOUT[a].x * 0.35) - (LAYOUT[b].y + LAYOUT[b].x * 0.35));
  const tiles = LAYOUT.map((it, i) => {
    const w = it.w * U, h = it.h * U;
    const x = (it.x + it.w / 2 - SHEET.w / 2) * U, y = (SHEET.h / 2 - it.y - it.h / 2) * U;
    const mat = new THREE.MeshBasicMaterial({ map: texes[it.id], transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); mesh.renderOrder = 3; rig.add(mesh);
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.5, h * 1.5), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    flash.renderOrder = 4; rig.add(flash);
    // selection frame drawn when the scan line passes
    const pts = [];
    const hw = w / 2 + 0.03, hh = h / 2 + 0.03, L = Math.min(w, h) * 0.2;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      pts.push(sx * hw, sy * hh, 0, sx * (hw - L), sy * hh, 0, sx * hw, sy * hh, 0, sx * hw, sy * (hh - L), 0);
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const frame = new THREE.LineSegments(fg, new THREE.LineBasicMaterial({ color: new THREE.Color(0.6, 1.3, 1.9), transparent: true, opacity: 0, depthWrite: false }));
    frame.renderOrder = 5; frame.position.set(x, y, 0.03); rig.add(frame);
    const rank = order.indexOf(i);
    const a = rnd() * Math.PI * 2;
    return {
      mesh, flash, frame, x, y, yN: (it.y + it.h / 2) / SHEET.h,
      t0: 0.02 + rank * 0.062,
      from: new THREE.Vector3(x * 0.4 + Math.cos(a) * (3 + rnd() * 5), y * 0.3 + Math.sin(a) * (4 + rnd() * 7) + 2, 9 + rnd() * 9),
      rot: new THREE.Vector3((rnd() - 0.5) * 2.4, (rnd() - 0.5) * 2.4, (rnd() - 0.5) * 3.0),
    };
  });

  // scan bar
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(SW * 1.5, 0.9), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.5, 1.2, 2.4), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  bar.renderOrder = 6; bar.position.z = 0.06; rig.add(bar);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(SW * 1.04, 0.022), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 4.5, 7.0), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  core.renderOrder = 7; core.position.z = 0.07; rig.add(core);

  const dust = makeDust({ count: 200, box: [14, 22, 16], seed: 23, size: 0.05, intensity: 0.9, focus: 16, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 6;
  scene.add(dust);

  function update(t) {
    dust.material.uniforms.time.value = t + 10;
    backdrop.material.uniforms.time.value = t;
    const scanP = prog(t, SCAN0, SCAN1);
    const scan = t < SCAN0 ? -1 : lerp(-0.03, 1.05, ease.inOutSine(scanP));
    sheetMat.uniforms.scan.value = scan;
    sheetMat.uniforms.reveal.value = smooth(prog(t, 0.0, 0.25));
    const sy = SH / 2 - scan * SH;
    const on = t >= SCAN0 && scanP < 1 ? 1 : 0;
    bar.position.y = sy; core.position.y = sy;
    bar.material.opacity = on * 0.55; core.material.opacity = on;

    for (const tl of tiles) {
      const p = prog(t, tl.t0, tl.t0 + 0.62);
      const e = ease.outExpo(p);
      tl.mesh.visible = t > tl.t0;
      tl.mesh.position.set(lerp(tl.from.x, tl.x, e), lerp(tl.from.y, tl.y, e), lerp(tl.from.z, 0.02, e));
      tl.mesh.rotation.set(tl.rot.x * (1 - e), tl.rot.y * (1 - e), tl.rot.z * (1 - e));
      tl.mesh.material.opacity = sat(p * 4);
      const land = t - (tl.t0 + 0.34);
      tl.flash.position.set(tl.x, tl.y, 0.04);
      tl.flash.material.opacity = land > 0 ? Math.exp(-land * 9) * 0.5 : 0;
      const sp = scan - tl.yN;
      tl.frame.material.opacity = sp > 0 ? (0.25 + 0.75 * Math.exp(-sp * 7)) : 0;
    }

    // rig: tilted back like a sheet on a light table; ends by dropping away
    const out = ease.inCubic(prog(t, 3.2, 3.5));
    rig.rotation.set(deg(lerp(-46, -34, ease.outCubic(prog(t, 0, 3.5)))), deg(lerp(-16, 9, ease.inOutSine(prog(t, 0, 3.5)))), deg(lerp(7, -3, ease.inOutSine(prog(t, 0, 3.5)))));
    rig.position.set(0, -2.1 - out * 9, 0);
    const pull = ease.outQuart(prog(t, 0, 2.2));
    const drift = prog(t, 0, 3.5);
    camera.position.set(lerp(0.9, -0.3, drift), lerp(-0.6, 0.9, pull), lerp(8.5, 17.2, pull) + drift * 0.8);
    camera.lookAt(0, lerp(-1.6, 0.35, pull), 0);
  }

  function drawOverlay(c, t) {
    const out = t - 3.18;
    label(c, "WORLD'S FIRST", 540, 318, { family: FONT.label, weight: 700, size: 30, tracking: 14, fill: '#f1c26b' }, t - 0.45, out);
    rule(c, 540, 352, 420, t - 0.5, { star: true, color: '#f1c26b', alpha: out > 0 ? sat(1 - out / 0.2) * 0.8 : 0.8 });
    const h = { family: FONT.display, size: 122, tracking: 3, gradient: ['#fff8ea', '#f4ead8', '#dcc9a6'] };
    riseLine(c, 'AI GANG SHEET', 540, 492, h, t - 0.55, out);
    riseLine(c, 'BUILDER', 540, 618, h, t - 0.7, out);
    label(c, 'AI LAYOUT  ·  AUTO DPI  ·  BG REMOVAL  ·  BEST PRICE', 540, 690, { family: FONT.label, weight: 600, size: 23, tracking: 5, fill: '#b9c7e6', alpha: 0.95 }, t - 1.75, out);
  }

  function post(t) {
    return {
      flash: Math.exp(-t * 9) * 0.9 + ease.inCubic(prog(t, 3.3, 3.5)) * 0.35,
      zoomBlur: Math.exp(-t * 10) * 0.2,
      bloom: 0.5, streak: 0.4, exposure: 1.05,
    };
  }

  return { name: 'sheet', scene, camera, update, drawOverlay, post, samples: 6 };
}
