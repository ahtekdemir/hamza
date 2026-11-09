// Scene 5 — four punch cards, one per beat.

import * as THREE from 'three';
import { makeDust, makeBackdrop } from '../lib/stage.js';
import { ease, prog, lerp, sat, smooth, hash1 } from '../lib/util.js';
import { text, riseLine, label, rule, star, measure, FONT, CREAM } from '../lib/overlay.js';

const GOLD = '#f1c26b';
const HEAD = ['#fff8ea', '#f4ead8', '#dcc9a6'];
const TINTS = [[0.10, 0.22, 0.75], [0.75, 0.12, 0.10], [0.10, 0.22, 0.75], [0.8, 0.5, 0.12]];

/** Largest size (<= want) at which the string fits in maxW. */
function fit(c, str, want, maxW, tracking = 0) {
  const w = measure(c, str, { family: FONT.display, size: want, tracking });
  return w > maxW ? want * maxW / w : want;
}

export function createCards(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 100);
  camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0);
  const backdrop = makeBackdrop({ inner: 0x0a1228, outer: 0x010204, center: [0.5, 0.56], radius: 0.7 });
  scene.add(backdrop);
  const dust = makeDust({ count: 260, box: [9, 15, 12], seed: 51, size: 0.035, intensity: 1.2, focus: 12, blur: 0.035, fov: 30, pixelH: ctx.pixelH });
  scene.add(dust);

  function update(t) {
    const i = Math.min(3, Math.floor(t)), u = t - i;
    dust.material.uniforms.time.value = t * 3 + i * 17;
    backdrop.material.uniforms.time.value = t + i * 5;
    backdrop.material.uniforms.tintA.value.setRGB(...TINTS[i]);
    backdrop.material.uniforms.tintAmt.value = 0.2 + 0.25 * Math.exp(-u * 5);
    camera.position.z = 12 - ease.outExpo(sat(u / 0.5)) * 0.8 - u * 0.3;
  }

  function sub(c, str, y, u, color = '#c9d3ea') {
    label(c, str, 540, y, { family: FONT.label, weight: 700, size: 28, tracking: 9, fill: color }, u - 0.16, -1, { dur: 0.35 });
  }
  const R = { stagger: 0.012, dur: 0.36 };

  const cards = [
    (c, u) => {
      // giant outlined numeral behind
      const g = ease.outExpo(sat(u / 0.6));
      text(c, '1', 540, 1190, { family: FONT.display, size: 1050 * lerp(0.9, 1, g), stroke: { color: 'rgba(120,160,255,0.55)', width: 3, only: true }, alpha: 0.5 * g, shadow: false });
      riseLine(c, 'NO', 540, 800, { family: FONT.display, size: 330, tracking: 8, gradient: HEAD }, u, -1, R);
      riseLine(c, 'MINIMUMS', 540, 985, { family: FONT.display, size: fit(c, 'MINIMUMS', 176, 930, 4), tracking: 4, gradient: HEAD }, u - 0.06, -1, R);
      rule(c, 540, 1050, 520, u - 0.12, { star: true, color: GOLD, dur: 0.4 });
      sub(c, 'ORDER EXACTLY WHAT YOU NEED', 1112, u);
    },
    (c, u) => {
      // location pin with pulse rings
      const px = 540, py = 560;
      for (let k = 0; k < 3; k++) {
        const r = ((u * 1.3 + k / 3) % 1);
        c.save(); c.globalAlpha = (1 - r) * 0.6 * sat(u * 6);
        c.strokeStyle = '#ff6a5c'; c.lineWidth = 4;
        c.beginPath(); c.ellipse(px, py + 78, 40 + r * 190, (40 + r * 190) * 0.32, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      }
      const drop = ease.outBack(sat(u / 0.3), 2.2);
      c.save(); c.translate(px, py - (1 - drop) * 160); c.globalAlpha = sat(u * 8);
      c.shadowColor = 'rgba(255,90,70,0.8)'; c.shadowBlur = 40;
      c.fillStyle = '#ef4b3d';
      c.beginPath(); c.arc(0, -22, 62, Math.PI * 0.85, Math.PI * 0.15, false); c.lineTo(0, 78); c.closePath(); c.fill();
      c.shadowBlur = 0; c.fillStyle = '#fff4e2'; c.beginPath(); c.arc(0, -24, 24, 0, Math.PI * 2); c.fill();
      c.restore();
      riseLine(c, 'SAME-DAY', 540, 850, { family: FONT.display, size: fit(c, 'SAME-DAY', 190, 930, 4), tracking: 4, gradient: HEAD }, u, -1, R);
      riseLine(c, 'PICKUP', 540, 1052, { family: FONT.display, size: fit(c, 'PICKUP', 250, 930, 6), tracking: 6, gradient: HEAD }, u - 0.06, -1, R);
      sub(c, '24/7 LOCAL PICKUP  ·  ARLINGTON, TX', 1132, u);
    },
    (c, u) => {
      // speed streaks
      for (let k = 0; k < 16; k++) {
        const y = 330 + hash1(k * 3.1) * 1050, len = 160 + hash1(k * 7.7) * 420, sp = 1500 + hash1(k * 1.9) * 2200;
        const x = ((hash1(k * 5.3) * 1600 + u * sp) % 1900) - 500;
        const g = c.createLinearGradient(x, 0, x + len, 0);
        g.addColorStop(0, 'rgba(110,160,255,0)'); g.addColorStop(1, `rgba(170,205,255,${0.25 + hash1(k) * 0.4})`);
        c.fillStyle = g; c.fillRect(x, y, len, 2 + hash1(k * 9.1) * 3);
      }
      riseLine(c, 'NATIONWIDE', 540, 850, { family: FONT.display, size: fit(c, 'NATIONWIDE', 160, 940, 3), tracking: 3, gradient: HEAD }, u, -1, R);
      riseLine(c, 'SHIPPING', 540, 1040, { family: FONT.display, size: fit(c, 'SHIPPING', 210, 940, 5), tracking: 5, gradient: HEAD }, u - 0.06, -1, R);
      rule(c, 540, 1100, 520, u - 0.12, { star: true, color: GOLD, dur: 0.4 });
      sub(c, 'SAME-DAY SHIPPING AVAILABLE', 1162, u);
    },
    (c, u) => {
      for (let k = 0; k < 5; k++) {
        const e = ease.outBack(sat((u - 0.05 - k * 0.055) / 0.26), 2.6);
        if (e <= 0) continue;
        c.save(); c.shadowColor = 'rgba(255,190,80,0.9)'; c.shadowBlur = 36; c.fillStyle = GOLD; c.globalAlpha = sat(e * 2);
        star(c, 540 + (k - 2) * 128, 590, 54 * e, 5, 0.45); c.fill(); c.restore();
      }
      riseLine(c, '4.92', 540, 960, { family: FONT.display, size: 400, tracking: 2, gradient: ['#fff3d2', '#f1c26b', '#cf9440'] }, u, -1, R);
      sub(c, 'VERIFIED CUSTOMER REVIEWS', 1060, u, '#f4ead8');
    },
  ];

  function drawOverlay(c, t) {
    const i = Math.min(3, Math.floor(t)), u = t - i;
    const punch = lerp(1.14, 1.0, ease.outExpo(sat(u / 0.4))) + u * 0.025;
    const exit = sat((u - 0.93) / 0.07);
    c.save();
    c.translate(540, 900); c.scale(punch + exit * 0.08, punch + exit * 0.08); c.translate(-540, -900);
    c.globalAlpha = 1 - exit * 0.7;
    cards[i](c, u);
    c.restore();
  }

  function post(t) {
    const i = Math.min(3, Math.floor(t)), u = t - i;
    return {
      flash: Math.exp(-u * 11) * 0.75,
      flashColor: i === 1 ? [1.0, 0.82, 0.78] : i === 3 ? [1.0, 0.93, 0.78] : [0.86, 0.92, 1.0],
      zoomBlur: Math.exp(-u * 14) * 0.2 + ease.inCubic(sat((u - 0.9) / 0.1)) * 0.08,
      fade: t > 3.9 ? 1 - smooth(prog(t, 3.9, 4.0)) : 1,
      bloom: 0.6, streak: 0.5, overlayGain: 1.15,
    };
  }

  return { name: 'cards', scene, camera, update, drawOverlay, post, samples: 6 };
}
