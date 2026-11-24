// Black Friday reel, end card — the hat draws itself, the frame blooms to
// cream and the logo settles in, with the code in a box under it.

import { createLogo } from './logo.js';
import { BF, CODE } from '../lib/bf-art.js';
import { ease, sat, prog } from '../lib/util.js';
import { roundRect } from '../lib/overlay.js';

const FLASH = 1.5;

export function createBfCard(ctx) {
  const base = createLogo(ctx, {
    hatY: 430, wordY: 598,
    tagline: 'Black Friday special.',
    lines: [['30% OFF  ·  COWBOYDTF.COM', 1176, 34, 800, 6, 'navy'], ['BLACK FRIDAY  ·  NOV 27', 1230, 24, 700, 6, 'ox']],
  });
  const draw = base.drawOverlay;
  base.drawOverlay = (c, t) => {
    draw(c, t);
    const u = t - FLASH - 0.62;
    if (u <= 0) return;
    const e = ease.outBack(sat(u / 0.5), 1.4), a = sat(u * 4);
    const zoom = 1 + prog(t, 0, 3) * 0.012;
    c.save();
    c.translate(540, 960); c.scale(zoom, zoom); c.translate(-540, -960);
    c.translate(540, 1062); c.scale(0.85 + 0.15 * e, 0.85 + 0.15 * e); c.translate(-540, -1062);
    c.globalAlpha = a;
    const bw = 660, bh = 112, bx = 540 - bw / 2, by = 1062 - bh / 2;
    c.fillStyle = BF.navy; roundRect(c, bx, by, bw, bh, 14); c.fill();
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.font = '800 24px "Montserrat"'; c.letterSpacing = '6px'; c.fillStyle = BF.gold;
    c.fillText('CODE', bx + 84, by + bh / 2 + 9);
    c.strokeStyle = 'rgba(246,177,46,0.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(bx + 160, by + 22); c.lineTo(bx + 160, by + bh - 22); c.stroke();
    c.font = '400 78px "Anton"'; c.letterSpacing = '8px'; c.fillStyle = '#FFF3DC';
    c.fillText(CODE, bx + 160 + (bw - 160) / 2 + 4, by + bh / 2 + 29);
    c.letterSpacing = '0px';
    c.restore();
  };
  return base;
}
