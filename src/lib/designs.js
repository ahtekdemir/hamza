// Original sample artwork for the transfers shown in the reel (the designs
// on the gang sheet and the print on the shirt). Drawn with Canvas 2D so
// they stay sharp at any size.

import { arcText, star, roundRect } from './overlay.js';

const C = {
  mustard: '#F7B538', orange: '#F26B21', red: '#E23D28', pink: '#FF4F8B', magenta: '#D81E78',
  purple: '#6A2C91', deep: '#34175F', night: '#1E0E3A', teal: '#17B5A6', turq: '#3FE0D0', sky: '#2D9BF0',
  cream: '#FFF4DC', white: '#FFFFFF',
};

function make(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c, w, h);
  return cv;
}

const f = (family, size, weight = 400) => ({ family, size, weight });

function saguaro(c, x, base, h, w, col, hi) {
  const r = w / 2;
  c.fillStyle = col;
  roundRect(c, x - r, base - h, w, h + 4, r); c.fill();
  // left arm
  const aw = w * 0.72, ly = base - h * 0.42, ll = w * 1.25, lh = h * 0.3;
  roundRect(c, x - r - ll, ly, ll + r, aw, aw / 2); c.fill();
  roundRect(c, x - r - ll, ly - lh, aw, lh + aw, aw / 2); c.fill();
  // right arm
  const ry = base - h * 0.6, rl = w * 1.1, rh = h * 0.24;
  roundRect(c, x, ry, rl + r, aw, aw / 2); c.fill();
  roundRect(c, x + r + rl - aw, ry - rh, aw, rh + aw, aw / 2); c.fill();
  // ribs
  c.strokeStyle = hi; c.lineWidth = Math.max(2, w * 0.07); c.globalAlpha = 0.75;
  c.beginPath();
  c.moveTo(x - w * 0.16, base - h + r * 0.9); c.lineTo(x - w * 0.16, base - 6);
  c.moveTo(x + w * 0.18, base - h + r * 0.9); c.lineTo(x + w * 0.18, base - 6);
  c.stroke();
  c.globalAlpha = 1;
}

/** Hero design: retro desert sunset badge. */
function sunset(c, S) {
  const cx = S / 2, cy = S * 0.535, R = S * 0.31;
  // disc
  c.save();
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
  const sky = c.createLinearGradient(0, cy - R, 0, cy + R * 0.45);
  sky.addColorStop(0, '#2A0F5C'); sky.addColorStop(0.38, '#A3187E'); sky.addColorStop(0.62, '#F0452E');
  sky.addColorStop(0.84, '#F9912A'); sky.addColorStop(1, '#FFD166');
  c.fillStyle = sky; c.fillRect(cx - R, cy - R, R * 2, R * 2);
  // stars
  c.fillStyle = C.cream;
  const pts = [[-0.55, -0.62, 5], [-0.2, -0.78, 4], [0.3, -0.7, 5], [0.62, -0.45, 4], [-0.72, -0.3, 3], [0.05, -0.55, 3], [0.48, -0.82, 3]];
  for (const [px, py, r] of pts) { star(c, cx + px * R, cy + py * R, r * S / 512, 4, 0.35); c.fill(); }
  // sun with slits
  const sy = cy + R * 0.12, sr = R * 0.56;
  c.save();
  c.beginPath();
  c.rect(cx - sr, sy - sr, sr * 2, sr * 1.02);
  const bars = [[0.06, 0.10], [0.22, 0.09], [0.37, 0.08], [0.50, 0.07], [0.62, 0.055], [0.72, 0.045]];
  for (const [o, h] of bars) c.rect(cx - sr, sy + sr * o, sr * 2, sr * h);
  c.clip();
  const sg = c.createLinearGradient(0, sy - sr, 0, sy + sr);
  sg.addColorStop(0, '#FFF3A3'); sg.addColorStop(0.5, '#FFC84A'); sg.addColorStop(1, '#FF7A3D');
  c.fillStyle = sg; c.beginPath(); c.arc(cx, sy, sr, 0, Math.PI * 2); c.fill();
  c.restore();
  // far mesas
  const base = cy + R * 0.42;
  c.fillStyle = '#7B2D8E';
  c.beginPath(); c.moveTo(cx - R, base);
  const far = [[-1, -0.1], [-0.82, -0.1], [-0.76, -0.26], [-0.5, -0.26], [-0.44, -0.12], [-0.12, -0.12], [-0.06, -0.2], [0.2, -0.2], [0.26, -0.08], [0.52, -0.08], [0.58, -0.3], [0.86, -0.3], [0.9, -0.1], [1, -0.1]];
  for (const [px, py] of far) c.lineTo(cx + px * R, base + py * R);
  c.lineTo(cx + R, cy + R); c.lineTo(cx - R, cy + R); c.closePath(); c.fill();
  // near ground
  c.fillStyle = '#3D1766';
  c.beginPath(); c.moveTo(cx - R, base + R * 0.1);
  const near = [[-1, 0.06], [-0.6, 0.0], [-0.2, 0.08], [0.15, 0.02], [0.55, 0.1], [1, 0.03]];
  for (const [px, py] of near) c.lineTo(cx + px * R, base + py * R);
  c.lineTo(cx + R, cy + R); c.lineTo(cx - R, cy + R); c.closePath(); c.fill();
  c.fillStyle = '#220C45';
  c.beginPath(); c.ellipse(cx, cy + R * 1.08, R * 1.2, R * 0.42, 0, 0, Math.PI * 2); c.fill();
  // cacti
  saguaro(c, cx - R * 0.5, cy + R * 0.86, R * 0.74, R * 0.15, C.teal, C.turq);
  saguaro(c, cx + R * 0.55, cy + R * 0.8, R * 0.5, R * 0.105, '#12A093', C.turq);
  c.restore();
  // rings
  c.strokeStyle = C.cream; c.lineWidth = S * 0.012;
  c.beginPath(); c.arc(cx, cy, R + S * 0.006, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = C.turq; c.lineWidth = S * 0.006;
  c.beginPath(); c.arc(cx, cy, R + S * 0.03, 0, Math.PI * 2); c.stroke();
  // arched title
  const title = f('Sancreek', S * 0.118);
  arcText(c, 'WILD WEST', cx + S * 0.006, cy + S * 0.007, R + S * 0.062, -Math.PI / 2, { ...title, tracking: S * 0.012, fill: C.red });
  arcText(c, 'WILD WEST', cx, cy, R + S * 0.062, -Math.PI / 2, { ...title, tracking: S * 0.012, fill: C.cream });
  // lower arc
  const sub = f('Anton', S * 0.05);
  arcText(c, 'SUNSETS  ·  SADDLES  ·  TEXAS', cx, cy, R + S * 0.098, Math.PI / 2, { ...sub, tracking: S * 0.007, fill: C.mustard, inward: true });
  // side stars
  c.fillStyle = C.mustard;
  star(c, cx - R - S * 0.085, cy + S * 0.01, S * 0.022); c.fill();
  star(c, cx + R + S * 0.085, cy + S * 0.01, S * 0.022); c.fill();
}

function howdy(c, W, H) {
  const cx = W / 2;
  const title = f('Rye', H * 0.265);
  const R = W * 1.05;
  arcText(c, 'HOWDY', cx + 6, H * 0.5 + R + 7, R, -Math.PI / 2, { ...title, tracking: 4, fill: C.red });
  arcText(c, 'HOWDY', cx, H * 0.5 + R, R, -Math.PI / 2, { ...title, tracking: 4, fill: C.mustard });
  // banner
  const by = H * 0.63, bh = H * 0.2, bw = W * 0.62;
  c.fillStyle = C.teal; roundRect(c, cx - bw / 2, by, bw, bh, 10); c.fill();
  c.font = `400 ${bh * 0.74}px "Anton"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '10px';
  c.fillStyle = C.cream; c.fillText("Y'ALL", cx + 5, by + bh * 0.54);
  c.fillStyle = C.mustard;
  star(c, cx - bw / 2 - W * 0.07, by + bh / 2, H * 0.07); c.fill();
  star(c, cx + bw / 2 + W * 0.07, by + bh / 2, H * 0.07); c.fill();
  c.strokeStyle = C.red; c.lineWidth = 6;
  c.beginPath(); c.moveTo(W * 0.14, H * 0.93); c.lineTo(W * 0.86, H * 0.93); c.stroke();
}

function loneStar(c, S) {
  const cx = S / 2, cy = S / 2, R = S * 0.46;
  c.fillStyle = '#1F4FBF'; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  c.strokeStyle = C.cream; c.lineWidth = S * 0.02; c.beginPath(); c.arc(cx, cy, R - S * 0.012, 0, Math.PI * 2); c.stroke();
  c.fillStyle = C.red; c.beginPath(); c.arc(cx, cy, R * 0.63, 0, Math.PI * 2); c.fill();
  c.strokeStyle = C.cream; c.lineWidth = S * 0.012; c.beginPath(); c.arc(cx, cy, R * 0.63, 0, Math.PI * 2); c.stroke();
  c.fillStyle = C.cream; star(c, cx, cy + S * 0.012, R * 0.5); c.fill();
  const t = f('Anton', S * 0.085);
  arcText(c, 'LONE STAR STATE', cx, cy, R * 0.745, -Math.PI / 2, { ...t, tracking: S * 0.012, fill: C.cream });
  arcText(c, 'TEXAS', cx, cy, R * 0.9, Math.PI / 2, { ...t, tracking: S * 0.03, fill: C.cream, inward: true });
  c.fillStyle = C.mustard;
  star(c, cx - R * 0.8, cy + S * 0.02, S * 0.03); c.fill(); star(c, cx + R * 0.8, cy + S * 0.02, S * 0.03); c.fill();
}

function wildcats(c, W, H) {
  const cx = W / 2;
  const R = W * 1.25;
  const t = f('Anton', H * 0.33);
  const o = { ...t, tracking: 4 };
  arcText(c, 'WILDCATS', cx + 6, H * 0.52 + R + 7, R, -Math.PI / 2, { ...o, fill: '#0E2A66', stroke: { color: '#0E2A66', width: 22 } });
  arcText(c, 'WILDCATS', cx, H * 0.52 + R, R, -Math.PI / 2, { ...o, fill: C.orange, stroke: { color: C.white, width: 16 } });
  arcText(c, 'WILDCATS', cx, H * 0.52 + R, R, -Math.PI / 2, { ...o, fill: C.orange });
  const by = H * 0.63, bh = H * 0.19, bw = W * 0.78;
  c.fillStyle = C.white; roundRect(c, cx - bw / 2, by, bw, bh, 6); c.fill();
  c.font = `400 ${bh * 0.7}px "Anton"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '14px';
  c.fillStyle = '#0E2A66'; c.fillText('VOLLEYBALL', cx + 7, by + bh * 0.55);
  c.letterSpacing = '0px';
  c.fillStyle = C.orange;
  for (let i = -1; i <= 1; i++) { star(c, cx + i * W * 0.09, H * 0.93, H * 0.045); c.fill(); }
}

function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.3);
  c.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x - s * 0.5, y + s * 0.6, x - s * 0.2, y + s * 0.78, x, y + s);
  c.bezierCurveTo(x + s * 0.2, y + s * 0.78, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  c.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  c.closePath();
}

function mama(c, S) {
  const g = c.createLinearGradient(0, S * 0.1, 0, S * 0.9);
  g.addColorStop(0, '#FF7AA8'); g.addColorStop(1, '#E91E73');
  c.fillStyle = g; heart(c, S / 2, S * 0.1, S * 0.84); c.fill();
  c.strokeStyle = C.cream; c.lineWidth = S * 0.018; heart(c, S / 2, S * 0.1, S * 0.84); c.stroke();
  c.font = `400 ${S * 0.25}px "Anton"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = '6px';
  c.fillStyle = '#8E0F45'; c.fillText('MAMA', S / 2 + 6, S * 0.445 + 5);
  c.fillStyle = C.white; c.fillText('MAMA', S / 2 + 3, S * 0.445);
  c.letterSpacing = '0px';
  c.fillStyle = C.mustard;
  star(c, S * 0.2, S * 0.14, S * 0.04, 4, 0.3); c.fill(); star(c, S * 0.84, S * 0.74, S * 0.035, 4, 0.3); c.fill();
}

function flower(c, S) {
  const cx = S / 2, cy = S / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.fillStyle = i % 2 ? C.orange : C.pink;
    c.beginPath(); c.arc(cx + Math.cos(a) * S * 0.27, cy + Math.sin(a) * S * 0.27, S * 0.15, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = C.mustard; c.beginPath(); c.arc(cx, cy, S * 0.215, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#3A1A00';
  c.beginPath(); c.ellipse(cx - S * 0.075, cy - S * 0.045, S * 0.022, S * 0.04, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(cx + S * 0.075, cy - S * 0.045, S * 0.022, S * 0.04, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#3A1A00'; c.lineWidth = S * 0.022;
  c.beginPath(); c.arc(cx, cy + S * 0.01, S * 0.115, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
}

function bolt(c, W, H) {
  const p = [[0.62, 0.02], [0.14, 0.56], [0.46, 0.56], [0.3, 0.98], [0.88, 0.4], [0.54, 0.4], [0.78, 0.02]];
  const path = (ox, oy) => { c.beginPath(); p.forEach(([x, y], i) => (i ? c.lineTo(x * W + ox, y * H + oy) : c.moveTo(x * W + ox, y * H + oy))); c.closePath(); };
  c.fillStyle = C.magenta; path(10, 10); c.fill();
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FFF07A'); g.addColorStop(1, C.orange);
  c.fillStyle = g; path(0, 0); c.fill();
}

function horseshoe(c, S) {
  const cx = S / 2, cy = S * 0.44, R = S * 0.3;
  const g = c.createLinearGradient(0, cy - R, 0, cy + R * 1.2); g.addColorStop(0, '#F4F7FA'); g.addColorStop(1, '#9AA7B8');
  c.strokeStyle = g; c.lineWidth = S * 0.13; c.lineCap = 'butt';
  c.beginPath(); c.arc(cx, cy, R, Math.PI * 0.82, Math.PI * 0.18, false); c.stroke();
  c.fillStyle = '#2A3140';
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * 0.9 + (i / 6) * Math.PI * 1.2;
    c.beginPath(); c.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, S * 0.02, 0, Math.PI * 2); c.fill();
  }
  c.font = `400 ${S * 0.2}px "Rye"`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#7A1420'; c.fillText('LUCKY', cx + 5, S * 0.93 + 5);
  c.fillStyle = C.red; c.fillText('LUCKY', cx, S * 0.93);
  c.fillStyle = C.mustard; star(c, cx, cy + S * 0.03, S * 0.09); c.fill();
}

function rodeo(c, W, H) {
  const g = c.createLinearGradient(0, H * 0.1, 0, H * 0.75);
  g.addColorStop(0, '#FFE066'); g.addColorStop(0.5, C.orange); g.addColorStop(1, C.magenta);
  c.font = `400 ${H * 0.62}px "Sancreek"`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.letterSpacing = '8px';
  c.fillStyle = C.deep; c.fillText('RODEO', W / 2 + 12, H * 0.66 + 9);
  c.fillStyle = g; c.fillText('RODEO', W / 2 + 4, H * 0.66);
  c.font = `400 ${H * 0.2}px "Anton"`; c.letterSpacing = '26px';
  c.fillStyle = C.turq; c.fillText('SOCIAL CLUB', W / 2 + 13, H * 0.93);
  c.letterSpacing = '0px';
  c.fillStyle = C.mustard; star(c, W * 0.06, H * 0.4, H * 0.1); c.fill(); star(c, W * 0.94, H * 0.4, H * 0.1); c.fill();
}

function hatSticker(c, W, H, hatImg) {
  // tinted brand hat
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const t = tmp.getContext('2d');
  const s = Math.min(W / hatImg.width, H / hatImg.height) * 0.96;
  const w = hatImg.width * s, h = hatImg.height * s;
  t.drawImage(hatImg, (W - w) / 2, (H - h) / 2, w, h);
  t.globalCompositeOperation = 'source-in';
  t.fillStyle = C.cream; t.fillRect(0, 0, W, H);
  c.drawImage(tmp, 0, 0);
}

function cactusPot(c, W, H) {
  c.fillStyle = C.orange; roundRect(c, W * 0.2, H * 0.72, W * 0.6, H * 0.26, 12); c.fill();
  c.fillStyle = '#C24E12'; c.fillRect(W * 0.15, H * 0.7, W * 0.7, H * 0.06);
  saguaro(c, W * 0.5, H * 0.7, H * 0.56, W * 0.2, C.teal, C.turq);
  c.fillStyle = C.pink;
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; c.beginPath(); c.arc(W * 0.5 + Math.cos(a) * W * 0.07, H * 0.115 + Math.sin(a) * W * 0.07, W * 0.06, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = C.mustard; c.beginPath(); c.arc(W * 0.5, H * 0.115, W * 0.045, 0, Math.PI * 2); c.fill();
}

export function buildDesigns(images) {
  return {
    sunset: make(1280, 1280, (c, w) => sunset(c, w)),
    howdy: make(800, 640, howdy),
    star: make(512, 512, (c, w) => loneStar(c, w)),
    wildcats: make(840, 560, wildcats),
    mama: make(512, 512, (c, w) => mama(c, w)),
    flower: make(512, 512, (c, w) => flower(c, w)),
    bolt: make(360, 512, bolt),
    horseshoe: make(512, 512, (c, w) => horseshoe(c, w)),
    rodeo: make(1040, 400, rodeo),
    hat: make(600, 280, (c, w, h) => hatSticker(c, w, h, images.hat)),
    cactus: make(320, 512, cactusPot),
  };
}

/**
 * Gang sheet layout in inches on a 22 x 36 in sheet (x, y = top-left).
 * Sizes keep each design's aspect ratio.
 */
export const SHEET = { w: 22, h: 36 };
export const LAYOUT = [
  { id: 'sunset', x: 0.6, y: 0.6, w: 10.4, h: 10.4 },
  { id: 'howdy', x: 11.5, y: 0.7, w: 9.9, h: 7.92 },
  { id: 'hat', x: 11.5, y: 9.0, w: 4.7, h: 2.19 },
  { id: 'hat', x: 16.7, y: 9.0, w: 4.7, h: 2.19 },
  { id: 'wildcats', x: 0.6, y: 11.6, w: 9.3, h: 6.2 },
  { id: 'mama', x: 10.4, y: 11.7, w: 5.6, h: 5.6 },
  { id: 'flower', x: 16.4, y: 11.7, w: 5.0, h: 5.0 },
  { id: 'rodeo', x: 0.6, y: 18.3, w: 12.6, h: 4.85 },
  { id: 'star', x: 13.7, y: 17.6, w: 7.7, h: 7.7 },
  { id: 'bolt', x: 0.7, y: 23.7, w: 3.9, h: 5.55 },
  { id: 'horseshoe', x: 4.9, y: 23.6, w: 5.6, h: 5.6 },
  { id: 'cactus', x: 10.7, y: 23.9, w: 2.7, h: 4.32 },
  { id: 'mama', x: 10.5, y: 28.6, w: 3.0, h: 3.0 },
  { id: 'sunset', x: 13.8, y: 25.7, w: 7.6, h: 7.6 },
  { id: 'howdy', x: 0.6, y: 29.7, w: 7.0, h: 5.6 },
  { id: 'flower', x: 7.8, y: 29.6, w: 2.5, h: 2.5 },
  { id: 'flower', x: 7.8, y: 32.4, w: 2.5, h: 2.5 },
  { id: 'bolt', x: 10.6, y: 31.9, w: 2.4, h: 3.41 },
  { id: 'hat', x: 13.8, y: 33.6, w: 3.7, h: 1.73 },
  { id: 'hat', x: 17.7, y: 33.6, w: 3.7, h: 1.73 },
];
