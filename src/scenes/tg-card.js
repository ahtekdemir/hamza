// Thanksgiving reel, end card — "Happy Thanksgiving" from Cowboy DTF, with
// the real logo and web address, on the same cream paper as the line-up.

import * as THREE from 'three';
import { makeLeaves, makePaper, fitSize } from '../lib/autumn.js';
import { drawLeaf, buildThanksDesigns } from '../lib/thanks-art.js';
import { tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth } from '../lib/util.js';
import { riseLine, label, rule, FONT } from '../lib/overlay.js';
import { PAPER_POST } from './tg-lineup.js';

const NAVY = '#203869', OX = '#762c2b', PUMPKIN = '#e2671b', RUST = '#9c3414';

export function createTgCard(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const paper = makePaper({ glow: [0.5, 0.6], glowAmt: 0.1 });
  scene.add(paper);
  const leaves = makeLeaves({ count: 30, seed: 33, area: [5.6, 9.6], zr: [-1, 8.5], size: [0.42, 0.9], fall: 0.6, keepOut: 2.05 });
  scene.add(leaves.group);
  const { wordmark } = ctx.assets.images;
  const hat = tint(ctx.assets.images.hat, NAVY, 0.6);
  const deco = ctx.assets.thanks || (ctx.assets.thanks = buildThanksDesigns());

  function update(t) {
    leaves.update(t + 20);
    for (const it of leaves.items) it.mesh.material.opacity = smooth(prog(t, -0.2, 0.3)) * (it.z > 4.2 ? 0.85 : 1);
    camera.position.set(0, 0, 17 - prog(t, 0, 4.5) * 0.3);
    camera.lookAt(0, 0, 0);
  }

  /** Fade + rise + de-blur for an image. */
  function img(c, im, cx, y, w, p, dur = 0.7) {
    if (p <= 0) return;
    const e = ease.outQuint(sat(p / dur)), h = w * im.height / im.width;
    c.save();
    c.globalAlpha = sat(e * 1.4);
    if (e < 0.98) c.filter = `blur(${((1 - e) * 10).toFixed(2)}px)`;
    c.drawImage(im, cx - w / 2, y + (1 - e) * 34, w, h);
    c.restore();
    return h;
  }

  function drawOverlay(c, t) {
    const zoom = 1 + prog(t, 0, 4.5) * 0.014;
    c.save();
    c.translate(540, 900); c.scale(zoom, zoom); c.translate(-540, -900);

    // "Happy" — written on from the left
    const p = t - 0.04;
    if (p > 0) {
      const e = ease.outCubic(sat(p / 0.75));
      c.save();
      c.translate(540, 428); c.rotate(-0.075);
      c.font = '400 186px "Pacifico"'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      const w = c.measureText('Happy').width;
      c.beginPath(); c.rect(-w / 2 - 40, -260, (w + 110) * e, 420); c.clip();
      c.globalAlpha = sat(p * 6);
      for (let i = 9; i >= 1; i--) { c.fillStyle = RUST; c.fillText('Happy', i * 0.8, i * 0.9); }
      const g = c.createLinearGradient(0, -170, 0, 30);
      g.addColorStop(0, '#f08a2c'); g.addColorStop(1, PUMPKIN);
      c.fillStyle = g; c.fillText('Happy', 0, 0);
      c.restore();
      // leaves tucked beside the word
      const le = ease.outBack(sat((t - 0.6) / 0.5), 2);
      if (le > 0) {
        drawLeaf(c, 'maple', 826, 300, 46 * le, 0.45, 0);
        drawLeaf(c, 'ovate', 872, 372, 30 * le, 1.0, 2);
        drawLeaf(c, 'oak', 232, 452, 40 * le, -0.8, 3);
      }
    }
    const s = fitSize(c, 'THANKSGIVING', 872, 170, 3);
    riseLine(c, 'THANKSGIVING', 540, 668, { family: 'Anton', weight: 400, size: s, tracking: 3, fill: NAVY, shadow: false }, t - 0.3, -1, { stagger: 0.03, dur: 0.6 });

    rule(c, 540, 738, 520, t - 0.85, { star: true, color: OX, alpha: 0.9, width: 2.5 });
    label(c, 'FROM ALL OF US AT', 540, 802, { family: FONT.label, weight: 700, size: 25, tracking: 9, fill: OX, shadow: false }, t - 0.95, -1, { dur: 0.6 });
    img(c, hat, 540, 834, 330, t - 1.1);
    img(c, wordmark, 540, 998, 590, t - 1.25);
    label(c, 'COWBOYDTF.COM', 540, 1252, { family: FONT.label, weight: 800, size: 50, tracking: 9, fill: NAVY, shadow: false }, t - 1.7, -1, { dur: 0.6 });
    label(c, 'ARLINGTON, TX   ·   NATIONWIDE SHIPPING', 540, 1306, { family: FONT.label, weight: 700, size: 23, tracking: 6, fill: OX, shadow: false }, t - 1.9, -1, { dur: 0.6 });
    // the turkey and two pumpkins pop up along the bottom edge
    const pop = (im, cx, by, w, p0, rot = 0) => {
      const p = t - p0;
      if (p <= 0) return;
      const e = ease.outBack(sat(p / 0.6), 1.5), h = w * im.height / im.width;
      c.save();
      c.translate(cx, by + (1 - e) * (h + 80)); c.rotate(rot + Math.sin(t * 1.6 + cx) * 0.012);
      c.fillStyle = 'rgba(70,40,15,0.16)';
      c.beginPath(); c.ellipse(0, -h * 0.04, w * 0.4, h * 0.05, 0, 0, Math.PI * 2); c.fill();
      c.drawImage(im, -w / 2, -h, w, h);
      c.restore();
    };
    pop(deco.pumpkinOnly, 236, 1822, 330, 2.3, -0.05);
    pop(deco.pumpkinOnly, 852, 1836, 280, 2.42, 0.06);
    pop(deco.mascot, 540, 1880, 590, 2.5);
    c.restore();
  }

  function post() { return { ...PAPER_POST }; }

  return { name: 'tg-card', scene, camera, update, drawOverlay, post, samples: 5 };
}
