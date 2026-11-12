// Thanksgiving reel, shot 2 — "Press. Peel. Give thanks." The hero design
// goes onto a shirt: the film lands, the heat platen clamps down, the film
// peels away from one corner and the print is left behind.

import * as THREE from 'three';
import { makeBackdrop, softSprite, puffSprite, makeDust } from '../lib/stage.js';
import { makeFilm, makeLeaves, bleedTexture, smoothGlow, fitSize, capHeight, HEAD, GOLD, CREAMY } from '../lib/autumn.js';
import { buildThanksDesigns, buildGarment, buildPlaten, PLATEN } from '../lib/thanks-art.js';
import { canvasTexture, tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, deg, pulse, mulberry32 } from '../lib/util.js';
import { riseLine, text, label, star, FONT } from '../lib/overlay.js';
import { wx, wy, brandMark } from './tg-sheet.js';

const PX = 1920 / (2 * 17 * Math.tan(deg(15)));
const SHIRT_PX = 1500, PRINT_U = [0.5, 0.43, 0.36];           // print centre and width in garment units
const PRINT_X = 540, PRINT_Y = 1262;                            // where the print sits on screen
const FILM_PX = 624;
const CONTACT = 0.85, LIFT = 1.62, PEEL0 = 2.0, PEEL1 = 2.95, DONE = 3.0, OUT = 3.74;
export const SHIRT_COLOR = '#e3d2b4';

export function createTgPress(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: 0x4a2209, outer: 0x060302, center: [0.5, 0.36], radius: 0.95 });
  scene.add(backdrop);
  const designs = ctx.assets.thanks || (ctx.assets.thanks = buildThanksDesigns());
  const glowTex = smoothGlow(256, 1.5);

  const rig = new THREE.Group(); scene.add(rig);
  const G = SHIRT_PX / PX;
  const shirtY = PRINT_Y + (0.5 - PRINT_U[1]) * SHIRT_PX;
  rig.position.set(wx(PRINT_X), wy(shirtY), 0);

  // warm light pooling behind the shirt
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(G * 1.5, G * 1.5), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.55, 0.22, 0.05), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(0, 0.6, -0.5); halo.renderOrder = -2; rig.add(halo);

  // shirt: blank, and with the print (swapped in under the closed press)
  const blank = buildGarment('tee', SHIRT_COLOR, null, 1536);
  const printed = buildGarment('tee', SHIRT_COLOR, { art: designs.badge, x: PRINT_U[0], y: PRINT_U[1], w: PRINT_U[2] }, 1536);
  const shirtGeo = new THREE.PlaneGeometry(G, G);
  const shirtA = new THREE.Mesh(shirtGeo, new THREE.MeshBasicMaterial({ map: canvasTexture(blank.canvas), color: 0xe2e2e2, transparent: true, depthWrite: false }));
  shirtA.renderOrder = 1; rig.add(shirtA);
  const shirtB = new THREE.Mesh(shirtGeo, new THREE.MeshBasicMaterial({ map: canvasTexture(printed.canvas), color: 0xe2e2e2, transparent: true, depthWrite: false, opacity: 0 }));
  shirtB.renderOrder = 2; shirtB.position.z = 0.002; rig.add(shirtB);

  // film carrying the design
  const FS = FILM_PX / PX;
  const art = document.createElement('canvas'); art.width = art.height = 832;
  {
    const c = art.getContext('2d'); c.imageSmoothingQuality = 'high';
    const w = 832 * (PRINT_U[2] * SHIRT_PX) / FILM_PX;
    c.drawImage(designs.badge, (832 - w) / 2, (832 - w) / 2, w, w);
  }
  const film = makeFilm({ w: FS, h: FS, seg: [72, 72], art: bleedTexture(art), base: [0.8, 0.86, 0.95], alpha: 0.1, back: [0.86, 0.9, 0.96], backAlpha: 0.46, rim: 0.9, gloss: 0.85 });
  film.mesh.renderOrder = 5;
  const filmGrp = new THREE.Group(); rig.add(filmGrp); filmGrp.add(film.mesh);
  const printOff = new THREE.Vector3((PRINT_U[0] - 0.5) * G, (0.5 - PRINT_U[1]) * G, 0);
  film.u.cdir.value.set(-0.76, -0.65).normalize();
  film.u.crad.value = 0.26;
  film.u.warm.value.set(1, 0.95, 0.88);
  const filmShadow = new THREE.Mesh(new THREE.PlaneGeometry(FS * 1.5, FS * 1.5), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x1a0e06, transparent: true, opacity: 0, depthWrite: false }));
  filmShadow.renderOrder = 3; rig.add(filmShadow);

  // heat platen
  const plateS = 716 / PLATEN.plate;                           // screen px per canvas px
  const PW = PLATEN.w * plateS / PX, PH = PLATEN.h * plateS / PX;
  const platen = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: canvasTexture(buildPlaten(ctx.assets.images.hat)), transparent: true, depthWrite: false }));
  platen.renderOrder = 8;
  const plateGrp = new THREE.Group(); rig.add(plateGrp); plateGrp.add(platen);
  platen.position.y = -(PLATEN.h / 2 - PLATEN.cy) * plateS / PX;   // plate centre at the group origin
  const plateShadow = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.7, PW * 1.7), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
  plateShadow.renderOrder = 6; rig.add(plateShadow);
  const heat = new THREE.Mesh(new THREE.PlaneGeometry(PW * 2.1, PW * 2.1), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(3.2, 1.0, 0.16), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  heat.renderOrder = 7; rig.add(heat);

  // steam
  const puffTex = puffSprite(256, 5);
  const rnd = mulberry32(31);
  const puffs = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puffTex, color: new THREE.Color(1.0, 0.9, 0.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.renderOrder = 9; rig.add(m);
    const side = i % 4, k = (rnd() - 0.5) * 1.5;
    const hw = 716 / PX / 2;
    const x = side < 2 ? k * hw : (side === 2 ? -hw : hw), y = side < 2 ? (side === 0 ? hw : -hw) : k * hw;
    puffs.push({ m, x, y, t0: (i < 8 ? CONTACT + 0.02 : LIFT - 0.05) + rnd() * 0.35, vx: x * 0.35 + (rnd() - 0.5) * 0.4, vy: 0.9 + rnd() * 0.9, s: 0.9 + rnd() * 1.1, rot: rnd() * 6 });
  }

  // gleam that crosses the finished print
  const gleam = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 5.2), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(1.0, 0.92, 0.75), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  gleam.renderOrder = 10; gleam.rotation.z = deg(-28); rig.add(gleam);

  const leaves = makeLeaves({ count: 16, seed: 12, area: [5.4, 9.4], zr: [-3, 8.5], size: [0.42, 0.85], fall: 0.6, tintDark: 0.95, keepOut: 1.5, avoid: [wx(70), wx(980), wy(760), wy(270)] });
  scene.add(leaves.group);
  const dust = makeDust({ count: 130, box: [9, 14, 12], seed: 14, size: 0.04, color: 0xffc98a, intensity: 0.8, focus: 17, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 5; scene.add(dust);
  const hat = tint(ctx.assets.images.hat, CREAMY, 0.25);
  const maxOff = FS / 2 * (0.76 + 0.65) / Math.hypot(0.76, 0.65);

  function update(t) {
    backdrop.material.uniforms.time.value = t + 4;
    dust.material.uniforms.time.value = t + 9;
    leaves.update(t + 7.3);

    // shirt settles in
    const inn = ease.outExpo(prog(t, 0.0, 0.8));
    const push = prog(t, 0, 4);
    rig.position.y = wy(shirtY) - (1 - inn) * 2.2;
    rig.scale.setScalar(lerp(1.06, 1.0, inn) * (1 + push * 0.035));
    rig.rotation.z = deg(lerp(-3, 0, inn));
    halo.material.opacity = 0.55 * inn;

    // film drops onto the chest
    const drop = ease.outCubic(prog(t, 0.12, 0.62));
    filmGrp.position.set(printOff.x + lerp(0.5, 0, drop), printOff.y + lerp(1.3, 0, drop), lerp(2.6, 0.02, drop));
    filmGrp.rotation.set(deg(lerp(-34, 0, drop)), deg(lerp(18, 0, drop)), deg(lerp(14, 0, drop)));
    filmShadow.position.set(printOff.x + 0.05, printOff.y - 0.08, 0.004);
    filmShadow.material.opacity = 0.4 * smooth(prog(t, 0.1, 0.45)) * (1 - smooth(prog(t, PEEL0 + 0.1, PEEL1)));
    const pressed = smooth(prog(t, CONTACT + 0.1, CONTACT + 0.4));
    film.u.artOn.value = 1 - pressed;
    shirtB.material.opacity = pressed;

    // peel: the fold line sweeps from the lower-left corner to the upper-right one
    const pe = ease.inOutSine(prog(t, PEEL0, PEEL1));
    film.u.coff.value = lerp(maxOff + 0.02, -maxOff - 0.25, pe);
    const away = ease.inQuad(prog(t, PEEL1 - 0.25, PEEL1 + 0.3));
    if (pe > 0) { filmGrp.position.x += away * 2.6; filmGrp.position.y += away * 2.2; filmGrp.position.z = 0.02 + pe * 0.25 + away * 2.0; }
    film.u.opacity.value = 1 - smooth(prog(t, PEEL1 - 0.1, PEEL1 + 0.28));
    film.u.sheenPos.value = lerp(-0.9, 0.9, prog(t, 0.1, 0.7));
    film.u.sheenAmt.value = 0.5;

    // platen: up from the operator's side, clamps, lifts away
    const close = t < LIFT ? ease.inOutCubic(prog(t, 0.42, CONTACT)) : 1 - ease.inOutCubic(prog(t, LIFT, LIFT + 0.4));
    const bounce = Math.exp(-Math.max(0, t - CONTACT) * 16) * Math.sin(Math.max(0, t - CONTACT) * 46) * 0.012;
    plateGrp.position.set(printOff.x, printOff.y - (1 - close) * 6.4, 0.3 + (1 - close) * 2.4);
    plateGrp.scale.setScalar(1 + bounce);
    plateGrp.visible = close > 0.001;
    plateShadow.position.set(printOff.x, printOff.y - (1 - close) * 5.2, 0.01);
    plateShadow.material.opacity = 0.75 * close * close;
    const hot = smooth(prog(t, CONTACT - 0.02, CONTACT + 0.12)) * (1 - smooth(prog(t, LIFT - 0.05, LIFT + 0.42)));
    heat.position.set(printOff.x, printOff.y, 0.25);
    heat.material.opacity = hot * (t > LIFT - 0.05 ? 0.55 : 1) * (0.5 + 0.12 * Math.sin(t * 22) + pulse(t, CONTACT + 0.05, 0.1) * 0.6);

    for (const p of puffs) {
      const a = t - p.t0;
      if (a <= 0 || a > 1.5) { p.m.material.opacity = 0; continue; }
      const k = a / 1.5;
      p.m.position.set(printOff.x + p.x + p.vx * a, printOff.y + p.y + p.vy * a * (0.6 + k), 0.6);
      const s = p.s * (0.7 + k * 1.9); p.m.scale.set(s, s, 1); p.m.rotation.z = p.rot + a * 0.5;
      p.m.material.opacity = Math.sin(Math.PI * Math.pow(k, 0.6)) * 0.13;
    }

    const gl = prog(t, DONE - 0.02, DONE + 0.62);
    gleam.position.set(printOff.x + lerp(-2.6, 2.6, ease.inOutSine(gl)), printOff.y, 0.05);
    gleam.material.opacity = Math.sin(Math.PI * gl) * 0.26;

    camera.position.set(lerp(-0.15, 0.15, push), 0, 17);
    camera.lookAt(0, 0, 0);
  }

  function drawOverlay(c, t) {
    const out = t - OUT;
    brandMark(c, hat, 1 - smooth(prog(t, OUT, OUT + 0.2)));
    const X = 96;
    const s = fitSize(c, 'GIVE THANKS.', 640, 160), cap = capHeight(c, s), gap = 30;
    const y1 = 292 + cap, y2 = y1 + gap + cap, y3 = y2 + gap + cap;
    const o = { ...HEAD, size: s, align: 'left', fill: CREAMY, shadow: { color: 'rgba(0,0,0,0.5)', blur: 30, y: 8 } };
    riseLine(c, 'PRESS.', X, y1, o, t - (CONTACT - 0.06), out, { stagger: 0.03, dur: 0.4 });
    riseLine(c, 'PEEL.', X, y2, o, t - (PEEL0 + 0.05), out - 0.03, { stagger: 0.03, dur: 0.4 });
    riseLine(c, 'GIVE THANKS.', X, y3, { ...o, gradient: ['#ffe08a', GOLD, '#ef9a1c'], fill: undefined }, t - (DONE - 0.08), out - 0.06, { stagger: 0.024, dur: 0.45 });

    // hot-peel timer ring
    const p = t - (CONTACT + 0.05);
    if (p > 0 && out < 0.3) {
      const e = ease.outBack(sat(p / 0.4), 1.6), ex = out > 0 ? ease.inCubic(sat(out / 0.22)) : 0;
      const cx = 838, cy = y1 + (y2 - y1) / 2 - cap / 2 + 6, R = 112;
      c.save();
      c.globalAlpha = sat(p * 5) * (1 - ex);
      c.translate(cx, cy); c.scale(0.7 + 0.3 * e, 0.7 + 0.3 * e);
      c.lineWidth = 12; c.strokeStyle = 'rgba(255,243,220,0.2)';
      c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke();
      const sweep = ease.inOutSine(prog(t, CONTACT, LIFT));
      c.strokeStyle = GOLD; c.lineCap = 'round'; c.shadowColor = 'rgba(246,177,46,0.8)'; c.shadowBlur = 18;
      c.beginPath(); c.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.002, sweep)); c.stroke();
      c.restore();
      const a = sat(p * 5) * (1 - ex);
      text(c, 'HOT PEEL', cx, cy - 42, { family: FONT.label, weight: 800, size: 19, tracking: 5, fill: GOLD, alpha: a, shadow: false });
      text(c, '6–8', cx, cy + 34, { ...HEAD, size: 82, fill: CREAMY, alpha: a, shadow: false });
      text(c, 'SECONDS', cx, cy + 66, { family: FONT.label, weight: 800, size: 19, tracking: 5, fill: CREAMY, alpha: a, shadow: false });
    }

    // sparkles around the finished print
    const sp = t - DONE;
    if (sp > 0 && sp < 1.2) {
      const pts = [[-330, -250, 30, 0], [318, -292, 38, 0.08], [352, 120, 24, 0.2], [-352, 190, 30, 0.14], [-250, -338, 18, 0.26], [262, 300, 20, 0.3], [0, -372, 22, 0.18], [-300, 330, 16, 0.36]];
      c.save();
      c.fillStyle = '#ffe9b0'; c.shadowColor = 'rgba(255,200,90,0.9)'; c.shadowBlur = 22;
      for (const [dx, dy, r, d] of pts) {
        const k = (sp - d) / 0.55;
        if (k <= 0 || k >= 1) continue;
        const sc = Math.sin(Math.PI * k);
        c.globalAlpha = sc;
        star(c, PRINT_X + dx * (1 + k * 0.12), PRINT_Y + dy * (1 + k * 0.12), r * (0.4 + sc), 4, 0.22, k * 1.2);
        c.fill();
      }
      c.restore();
    }
  }

  function post(t) {
    return {
      flash: Math.exp(-t * 9) * 0.55 + pulse(t, CONTACT + 0.03, 0.07) * 0.22 + pulse(t, DONE + 0.02, 0.09) * 0.16 + ease.inCubic(prog(t, 3.78, 4.0)) * 1.0,
      flashColor: t > 3.5 ? [0.96, 0.9, 0.78] : [1.0, 0.8, 0.55],
      zoomBlur: Math.exp(-t * 9) * 0.2 + ease.inCubic(prog(t, 3.75, 4.0)) * 0.12,
      bloom: 0.3, bloomThreshold: 0.98, streak: 0.16, vignette: 0.95, saturation: 1.1, tint: 0.2, ca: 0.4,
    };
  }

  return { name: 'tg-press', scene, camera, update, drawOverlay, post, samples: 6 };
}
