// Black Friday reel, shot 3 — "USE CODE". A coupon ticket swings in, the code
// COWBOY30 types itself into the code box and locks in with a gold flash.

import * as THREE from 'three';
import { makeBackdrop, makeDust } from '../lib/stage.js';
import { makeLeaves, fitSize, capHeight, HEAD, CREAMY } from '../lib/autumn.js';
import { buildConfettiSprites, BF, CODE } from '../lib/bf-art.js';
import { tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, pulse, mulberry32 } from '../lib/util.js';
import { riseLine, text, star, roundRect, FONT } from '../lib/overlay.js';
import { wx, wy, brandMark } from './tg-sheet.js';

export const TYPE0 = 0.72, TYPE_STEP = 0.1, LOCK = TYPE0 + CODE.length * TYPE_STEP + 0.08;
const OUT = 3.22;
const TW = 900, TH = 470, TX = 540, TY = 880;          // ticket size and centre (px)
const STUB = 250;

function ticketPath(c, x, y, w, h) {
  const r = 26, n = 30;                                // corner radius, notch radius
  const sx = x + STUB;
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(sx - n, y); c.arc(sx, y, n, Math.PI, 0, true);
  c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(sx + n, y + h); c.arc(sx, y + h, n, 0, Math.PI, true);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

/** The ticket without the code (static parts), drawn once. */
function buildTicket(hat) {
  const pad = 60;
  const cv = document.createElement('canvas'); cv.width = TW + pad * 2; cv.height = TH + pad * 2;
  const c = cv.getContext('2d');
  c.translate(pad, pad);
  // shadow
  c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  c.fillStyle = '#f6ecd8'; ticketPath(c, 0, 0, TW, TH); c.fill(); c.restore();
  // paper
  c.save(); ticketPath(c, 0, 0, TW, TH); c.clip();
  let g = c.createLinearGradient(0, 0, TW, TH); g.addColorStop(0, '#FFF8EA'); g.addColorStop(1, '#F1E2C4');
  c.fillStyle = g; c.fillRect(0, 0, TW, TH);
  const rnd = mulberry32(9);
  for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(120,90,50,${rnd() * 0.05})`; c.fillRect(rnd() * TW, rnd() * TH, 2, 2); }
  // stub
  g = c.createLinearGradient(0, 0, 0, TH); g.addColorStop(0, '#E5333A'); g.addColorStop(1, '#B21C25');
  c.fillStyle = g; c.fillRect(0, 0, STUB, TH);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = BF.cream;
  c.font = '400 104px "Anton"'; c.fillText('30%', STUB / 2, TH / 2 + 16);
  c.font = '400 70px "Anton"'; c.letterSpacing = '8px'; c.fillText('OFF', STUB / 2 + 4, TH / 2 + 96); c.letterSpacing = '0px';
  c.fillStyle = BF.gold; star(c, STUB / 2, TH / 2 - 112, 20); c.fill();
  c.restore();
  // perforation
  c.strokeStyle = 'rgba(80,50,30,0.45)'; c.lineWidth = 4; c.setLineDash([12, 12]);
  c.beginPath(); c.moveTo(STUB, 34); c.lineTo(STUB, TH - 34); c.stroke(); c.setLineDash([]);
  // inner border
  c.strokeStyle = 'rgba(118,44,43,0.35)'; c.lineWidth = 2;
  roundRect(c, STUB + 22, 20, TW - STUB - 42, TH - 40, 14); c.stroke();
  // header
  const mx = STUB + (TW - STUB) / 2;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.globalAlpha = 0.9; const hw = 60, hh = hw * hat.height / hat.width; c.drawImage(hat, mx - hw / 2, 44, hw, hh); c.globalAlpha = 1;
  c.font = `800 26px "${FONT.label}"`; c.letterSpacing = '7px'; c.fillStyle = BF.ox;
  c.fillText('BLACK FRIDAY SPECIAL', mx + 3, 118);
  c.font = `700 21px "${FONT.label}"`; c.letterSpacing = '6px'; c.fillStyle = 'rgba(32,56,105,0.85)';
  c.fillText('ENTER AT CHECKOUT', mx + 3, TH - 50);
  c.letterSpacing = '0px';
  return { canvas: cv, pad };
}

export function createBfCode(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: 0x34100a, outer: 0x030203, center: [0.5, 0.52], radius: 0.95 });
  scene.add(backdrop);
  const confetti = makeLeaves({ count: 40, seed: 19, area: [5.6, 9.6], zr: [-3, 8.5], size: [0.16, 0.36], fall: 0.9, sprites: buildConfettiSprites(), avoid: [wx(60), wx(1020), wy(1140), wy(270)] });
  scene.add(confetti.group);
  const dust = makeDust({ count: 150, box: [9, 14, 12], seed: 41, size: 0.04, color: 0xffcf8a, intensity: 0.9, focus: 17, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 5; scene.add(dust);
  const hatNavy = tint(ctx.assets.images.hat, BF.navy, 0.2);
  const hatCream = tint(ctx.assets.images.hat, CREAMY, 0.25);
  const ticket = buildTicket(hatNavy);

  function update(t) {
    backdrop.material.uniforms.time.value = t + 6;
    dust.material.uniforms.time.value = t + 13;
    confetti.update(t + 9);
    camera.position.set(0, 0, 17 - prog(t, 0, 3.5) * 0.3);
    camera.lookAt(0, 0, 0);
  }

  function drawOverlay(c, t) {
    const out = t - OUT;
    brandMark(c, hatCream, smooth(prog(t, 0.0, 0.3)) * (1 - smooth(prog(t, OUT, OUT + 0.2))));
    const s = fitSize(c, 'USE CODE', 700, 180), cap = capHeight(c, s);
    riseLine(c, 'USE CODE', 540, 300 + cap, { ...HEAD, size: s, fill: CREAMY, shadow: { color: 'rgba(0,0,0,0.6)', blur: 30, y: 8 } }, t - 0.05, out, { stagger: 0.035, dur: 0.45 });

    // ticket: swings in, floats, leaves upward at the end
    const a = prog(t, 0.08, 0.62), e = ease.outBack(a, 1.3);
    if (a <= 0) return;
    const ex = ease.inCubic(prog(t, OUT, 3.5));
    const rot = lerp(-0.42, -0.035, e) + Math.sin(t * 1.7) * 0.008 + ex * 0.25;
    const sc = lerp(0.7, 1, e) * (1 + ex * 0.5);
    const cx = TX, cy = lerp(TY + 900, TY, ease.outCubic(a)) - ex * 1300;
    c.save();
    c.translate(cx, cy); c.rotate(rot); c.scale(sc, sc);
    c.globalAlpha = sat(a * 4);
    c.drawImage(ticket.canvas, -TW / 2 - ticket.pad, -TH / 2 - ticket.pad);
    // code box
    const mx = -TW / 2 + STUB + (TW - STUB) / 2, bw = 580, bh = 160, bx = mx - bw / 2, by = -bh / 2 + 6;
    const lock = t - LOCK;
    const lk = lock > 0 ? Math.exp(-lock * 5) : 0;
    c.fillStyle = lock > 0 ? `rgba(246,177,46,${0.16 + lk * 0.4})` : 'rgba(32,56,105,0.06)';
    roundRect(c, bx, by, bw, bh, 16); c.fill();
    c.lineWidth = 5; c.strokeStyle = lock > 0 ? BF.gold : BF.navy;
    if (lock <= 0) c.setLineDash([18, 12]);
    roundRect(c, bx, by, bw, bh, 16); c.stroke(); c.setLineDash([]);
    // typed code
    const n = Math.max(0, Math.min(CODE.length, Math.floor((t - TYPE0) / TYPE_STEP) + 1));
    c.font = '400 112px "Anton"'; c.letterSpacing = '9px'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const full = c.measureText(CODE).width - 9;
    const x0 = mx - full / 2, base = by + bh / 2 + 41;
    if (t >= TYPE0) {
      const typed = CODE.slice(0, n);
      // the newest letter pops
      const k = sat((t - TYPE0 - (n - 1) * TYPE_STEP) / 0.08);
      const before = CODE.slice(0, n - 1);
      c.fillStyle = BF.navy; c.fillText(before, x0, base);
      const wb = n > 1 ? c.measureText(before).width : 0;
      c.save();
      const lw = c.measureText(CODE[n - 1]).width;
      c.translate(x0 + wb + lw / 2, base - 45); c.scale(1.25 - 0.25 * k, 1.25 - 0.25 * k); c.translate(-(x0 + wb + lw / 2), -(base - 45));
      c.fillText(CODE[n - 1], x0 + wb, base);
      c.restore();
      // cursor
      const cxr = x0 + c.measureText(typed).width + 2;
      if (t < LOCK) { c.fillStyle = BF.red; c.fillRect(cxr, base - 90, 7, 100); }
    } else if (Math.floor(t * 5) % 2 === 0) { c.fillStyle = BF.red; c.fillRect(x0, base - 90, 7, 100); }
    c.letterSpacing = '0px';
    // check badge
    if (lock > 0) {
      const pe = ease.outBack(sat(lock / 0.35), 2.2);
      c.save();
      c.translate(bx + bw - 6, by + 6); c.scale(pe, pe);
      c.fillStyle = BF.gold; c.beginPath(); c.arc(0, 0, 34, 0, Math.PI * 2); c.fill();
      c.strokeStyle = BF.ink; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(-14, 1); c.lineTo(-4, 12); c.lineTo(15, -11); c.stroke();
      c.restore();
    }
    // sheen across the paper after the code locks
    const sh = prog(t, LOCK + 0.1, LOCK + 0.75);
    if (sh > 0 && sh < 1) {
      c.save(); ticketPath(c, -TW / 2, -TH / 2, TW, TH); c.clip();
      const x = lerp(-TW, TW, ease.inOutSine(sh));
      const g = c.createLinearGradient(x - 160, 0, x + 160, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,235,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.rotate(0.3); c.fillRect(-TW * 1.5, -TH * 2, TW * 3, TH * 4);
      c.restore();
    }
    c.restore();
    // sparkles
    const sp = t - LOCK;
    if (sp > 0 && sp < 1.0) {
      c.save(); c.fillStyle = '#ffe9b0'; c.shadowColor = 'rgba(255,200,90,0.9)'; c.shadowBlur = 20;
      for (const [dx, dy, r, d] of [[-430, -250, 30, 0], [420, -270, 36, 0.06], [440, 200, 26, 0.14], [-420, 230, 24, 0.1], [0, -300, 20, 0.2]]) {
        const k = (sp - d) / 0.55; if (k <= 0 || k >= 1) continue;
        const s2 = Math.sin(Math.PI * k); c.globalAlpha = s2;
        star(c, TX + dx, TY + dy, r * (0.4 + s2), 4, 0.22, k); c.fill();
      }
      c.restore();
    }
  }

  function post(t) {
    return {
      flash: Math.exp(-t * 9) * 0.6 + pulse(t, LOCK + 0.02, 0.05) * 0.05 + ease.inCubic(prog(t, 3.3, 3.5)) * 0.5,
      flashColor: [1.0, 0.85, 0.6],
      zoomBlur: Math.exp(-t * 9) * 0.15 + ease.inCubic(prog(t, OUT, 3.5)) * 0.2,
      bloom: 0.3, bloomThreshold: 1.05, streak: 0.15, vignette: 0.95, saturation: 1.08, tint: 0.15, ca: 0.35,
    };
  }

  return { name: 'bf-code', scene, camera, update, drawOverlay, post, samples: 5 };
}
