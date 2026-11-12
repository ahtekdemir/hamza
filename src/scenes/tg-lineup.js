// Thanksgiving reel, shot 3 — three finished garments drop onto cream paper:
// "For family feasts. Friendsgiving. Turkey trots."

import * as THREE from 'three';
import { makeLeaves, makePaper, bleedTexture, fitSize, capHeight, HEAD, INK, GOLD } from '../lib/autumn.js';
import { buildThanksDesigns, buildGarment } from '../lib/thanks-art.js';
import { canvasTexture, tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, deg, spring } from '../lib/util.js';
import { riseLine } from '../lib/overlay.js';
import { wx, wy, brandMark } from './tg-sheet.js';
import { SHIRT_COLOR } from './tg-press.js';

const PX = 1920 / (2 * 17 * Math.tan(deg(15)));
const OUT = 3.2;
export const PAPER_POST = { aces: 0, tint: 0, contrast: 0.04, saturation: 1.06, bloom: 0.05, bloomThreshold: 1.2, streak: 0, vignette: 0.3, grain: 0.03, ca: 0.15 };

export function createTgLineup(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const paper = makePaper({ glow: [0.5, 0.42] });
  scene.add(paper);
  const d = ctx.assets.thanks || (ctx.assets.thanks = buildThanksDesigns());

  const specs = [
    { g: buildGarment('tee', '#3a2a22', { art: d.thankful, x: 0.5, y: 0.42, w: 0.4 }), x: 300, y: 1078, size: 735, rot: -7, t0: 0.1, from: [-2.4, 2.0] },
    { g: buildGarment('tee', SHIRT_COLOR, { art: d.badge, x: 0.5, y: 0.43, w: 0.36 }), x: 778, y: 1138, size: 735, rot: 6, t0: 0.28, from: [2.6, 1.6] },
    { g: buildGarment('crew', '#3f5a3c', { art: d.feast, x: 0.5, y: 0.5, w: 0.3 }), x: 536, y: 1532, size: 695, rot: -3, t0: 0.48, from: [0.3, -3.2] },
  ];
  const items = specs.map((s, i) => {
    const G = s.size / PX;
    const grp = new THREE.Group(); scene.add(grp);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(G * 1.3, G * 1.3), new THREE.MeshBasicMaterial({ map: canvasTexture(s.g.shadow), color: 0x2a1708, transparent: true, opacity: 0.4, depthWrite: false }));
    shadow.renderOrder = 1 + i * 2; scene.add(shadow);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(G, G), new THREE.MeshBasicMaterial({ map: bleedTexture(s.g.canvas), transparent: true, depthWrite: false }));
    mesh.renderOrder = 2 + i * 2; grp.add(mesh);
    return { ...s, grp, mesh, shadow, G };
  });

  const leaves = makeLeaves({ count: 14, seed: 21, area: [5.4, 9.4], zr: [-1, 8.5], size: [0.4, 0.8], fall: 0.55, avoid: [wx(60), wx(1010), wy(780), wy(270)] });
  scene.add(leaves.group);
  const hat = tint(ctx.assets.images.hat, '#203869', 0.25);

  function update(t) {
    leaves.update(t + 11.5);
    const drift = prog(t, 0, 3.5);
    items.forEach((it, i) => {
      const e = ease.outExpo(prog(t, it.t0, it.t0 + 0.75));
      const wob = Math.exp(-Math.max(0, t - it.t0) * 5) * Math.sin(Math.max(0, t - it.t0) * 9);
      const out = ease.inCubic(prog(t, OUT + i * 0.03, OUT + 0.28 + i * 0.03));
      const h = (1 - e) * 3.2 + out * 2.5;                        // height above the paper
      const x = wx(it.x) + it.from[0] * (1 - e) + it.from[0] * out * 1.6;
      const y = wy(it.y) + it.from[1] * (1 - e) + (it.from[1] > 0 ? 1 : -1) * out * 7 + drift * 0.03 * (i - 1);
      it.grp.position.set(x, y, 0.05 + i * 0.02 + h);
      it.grp.rotation.z = deg(it.rot + (1 - e) * (i % 2 ? -16 : 16) + wob * 2.2 + out * (i % 2 ? 10 : -10));
      it.grp.visible = t > it.t0;
      const k = 1 - h / 17;                                       // perspective at that height
      it.shadow.position.set((x + 0.07 + h * 0.16) , (y - 0.1 - h * 0.22), 0.01 + i * 0.02);
      it.shadow.rotation.z = it.grp.rotation.z;
      it.shadow.scale.setScalar((1 + h * 0.05) / k * 0 + 1 + h * 0.07);
      it.shadow.material.opacity = t > it.t0 ? 0.42 / (1 + h * 0.9) : 0;
    });
    camera.position.set(lerp(-0.12, 0.12, drift), lerp(0.08, -0.05, drift), 17 - drift * 0.35);
    camera.lookAt(0, 0, 0);
  }

  function drawOverlay(c, t) {
    const out = t - OUT;
    brandMark(c, hat, smooth(prog(t, 0.05, 0.4)) * (1 - smooth(prog(t, OUT, OUT + 0.2))), '#203869');
    const X = 96, lines = ['FOR FAMILY FEASTS.', 'FRIENDSGIVING.', 'TURKEY TROTS.'];
    const s = fitSize(c, lines[0], 884, 150), cap = capHeight(c, s), gap = 34;
    const y1 = 292 + cap, y2 = y1 + gap + cap, y3 = y2 + gap + cap + 8;
    const o = { ...HEAD, size: s, align: 'left', fill: INK, shadow: false };
    riseLine(c, lines[0], X, y1, o, t - 0.3, out, { stagger: 0.018 });
    riseLine(c, lines[1], X, y2, o, t - 0.62, out - 0.03, { stagger: 0.02 });
    // highlight box behind the last line
    const p = t - 0.94;
    if (p > 0) {
      const e = ease.outExpo(sat(p / 0.5)), ex = out > 0.06 ? ease.inCubic(sat((out - 0.06) / 0.22)) : 0;
      c.save();
      c.font = `400 ${s}px "Anton"`; c.letterSpacing = '0px';
      const w = c.measureText(lines[2]).width;
      c.globalAlpha = 1 - ex;
      c.fillStyle = GOLD;
      c.fillRect(X - 18, y3 - cap - 20, (w + 36) * e, cap + 40);
      c.restore();
    }
    riseLine(c, lines[2], X, y3, o, t - 1.0, out - 0.06, { stagger: 0.02 });
  }

  function post(t) {
    return { ...PAPER_POST, flash: Math.exp(-t * 6) * 1.0, flashColor: [0.96, 0.9, 0.78] };
  }

  return { name: 'tg-lineup', scene, camera, update, drawOverlay, post, samples: 6 };
}
