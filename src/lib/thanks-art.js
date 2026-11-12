// Original artwork for the Thanksgiving reel: six sample transfer designs,
// the gang sheet they sit on, flat-lay garments, autumn leaves and the heat
// platen. Everything is drawn with Canvas 2D so it stays sharp at any size.

import { arcText, star, roundRect } from './overlay.js';
import { mulberry32 } from './util.js';

export const AUT = {
  pumpkin: '#F2811D', orange: '#E8601C', rust: '#C4421A', cranberry: '#A51E2D', wine: '#6E1420',
  gold: '#F6B12E', butter: '#FFD772', cream: '#FFF1D6', brown: '#6B3A1E', cocoa: '#4A2816', espresso: '#2B1B14',
  sage: '#8FA86A', forest: '#3F6B45', teal: '#1F8A82', deepTeal: '#12383C',
};

function make(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c, w, h);
  return cv;
}

// ---- leaves --------------------------------------------------------------------

/** Leaf outline in unit space: tip at (0,-1), stem end at (0,1). */
export function leafPath(c, kind) {
  c.beginPath();
  if (kind === 'maple') {
    const R = [[0, -1], [0.15, -0.66], [0.34, -0.78], [0.30, -0.40], [0.62, -0.60], [0.64, -0.38], [0.96, -0.34], [0.78, -0.14], [0.88, 0.0], [0.52, 0.16], [0.58, 0.38], [0.20, 0.27], [0.05, 0.36]];
    c.moveTo(0, -1);
    for (let i = 1; i < R.length; i++) c.lineTo(R[i][0], R[i][1]);
    for (let i = R.length - 1; i >= 1; i--) c.lineTo(-R[i][0], R[i][1]);
    c.closePath();
  } else if (kind === 'oak') {
    const N = 72, pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const w = 0.44 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.97 + 0.02)), 0.6) * (0.68 + 0.32 * Math.cos(t * Math.PI * 2 * 4.5 + Math.PI));
      pts.push([w, -1 + 1.62 * t]);
    }
    c.moveTo(0, -1);
    for (const [x, y] of pts) c.lineTo(x, y);
    for (let i = pts.length - 1; i >= 0; i--) c.lineTo(-pts[i][0], pts[i][1]);
    c.closePath();
  } else {
    c.moveTo(0, -1);
    c.bezierCurveTo(0.66, -0.55, 0.62, 0.3, 0, 0.66);
    c.bezierCurveTo(-0.62, 0.3, -0.66, -0.55, 0, -1);
    c.closePath();
  }
}

const LEAF_COLORS = [
  ['#F2811D', '#FFB347', '#B4480F'], // pumpkin
  ['#C8321E', '#F0603A', '#7E1A10'], // red
  ['#F6B12E', '#FFDD7A', '#B9761A'], // gold
  ['#A51E2D', '#D8463F', '#5E0F18'], // cranberry
  ['#D9781F', '#F3AE55', '#8A4411'], // amber
];

/** One leaf, centred at (x, y); `s` = half length, `rot` in radians. */
export function drawLeaf(c, kind, x, y, s, rot, col = 0, opt = {}) {
  const [base, light, dark] = Array.isArray(col) ? col : LEAF_COLORS[col % LEAF_COLORS.length];
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // stem
  c.strokeStyle = dark; c.lineWidth = 0.055;
  c.beginPath(); c.moveTo(0, 0.2); c.quadraticCurveTo(0.02, 0.7, kind === 'ovate' ? 0.06 : 0.0, 1.0); c.stroke();
  const g = c.createLinearGradient(-0.6, -0.9, 0.5, 0.6);
  g.addColorStop(0, light); g.addColorStop(0.55, base); g.addColorStop(1, dark);
  c.fillStyle = g;
  leafPath(c, kind); c.fill();
  if (opt.flat) { c.restore(); return; }
  // veins
  c.strokeStyle = dark; c.globalAlpha = 0.6; c.lineWidth = 0.035;
  c.beginPath(); c.moveTo(0, -0.86); c.lineTo(0, 0.4); c.stroke();
  c.lineWidth = 0.024;
  c.beginPath();
  if (kind === 'maple') {
    for (const [x1, y1] of [[0.26, -0.56], [0.5, -0.46], [0.74, -0.26], [0.42, 0.08]]) { c.moveTo(0, 0.18); c.lineTo(x1, y1); c.moveTo(0, 0.18); c.lineTo(-x1, y1); }
  } else {
    for (let i = 0; i < 5; i++) {
      const y0 = -0.5 + i * 0.22, r = kind === 'oak' ? 0.26 : 0.36 * Math.sin(Math.PI * (0.25 + i * 0.13));
      c.moveTo(0, y0 + 0.12); c.lineTo(r, y0 - 0.06); c.moveTo(0, y0 + 0.12); c.lineTo(-r, y0 - 0.06);
    }
  }
  c.stroke();
  c.restore();
}

/** Leaf sprites for the falling-leaf system: kinds x colours, 256 px each. */
export function buildLeafSprites(size = 256) {
  const out = [];
  for (const kind of ['maple', 'oak', 'ovate']) for (let col = 0; col < LEAF_COLORS.length; col++) {
    out.push(make(size, size, (c) => drawLeaf(c, kind, size / 2, size / 2, size * 0.46, 0, col)));
  }
  return out;
}

// ---- the designs ---------------------------------------------------------------

const an = (size) => ({ family: 'Anton', size, weight: 400 });

function cowboyHat(c, x, y, s, fill, band) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = fill;
  // brim: wide, ends curled up
  c.beginPath();
  c.moveTo(-1.0, -0.14);
  c.bezierCurveTo(-0.86, 0.2, -0.42, 0.25, 0, 0.25);
  c.bezierCurveTo(0.42, 0.25, 0.86, 0.2, 1.0, -0.14);
  c.bezierCurveTo(0.8, 0.04, 0.46, 0.08, 0, 0.08);
  c.bezierCurveTo(-0.46, 0.08, -0.8, 0.04, -1.0, -0.14);
  c.closePath(); c.fill();
  // crown with a centre crease
  c.beginPath();
  c.moveTo(-0.5, 0.12);
  c.bezierCurveTo(-0.5, -0.3, -0.46, -0.62, -0.26, -0.64);
  c.bezierCurveTo(-0.14, -0.65, -0.08, -0.52, 0, -0.52);
  c.bezierCurveTo(0.08, -0.52, 0.14, -0.65, 0.26, -0.64);
  c.bezierCurveTo(0.46, -0.62, 0.5, -0.3, 0.5, 0.12);
  c.closePath(); c.fill();
  // band
  c.fillStyle = band;
  c.beginPath();
  c.moveTo(-0.5, -0.02); c.quadraticCurveTo(0, 0.1, 0.5, -0.02); c.lineTo(0.5, 0.12); c.quadraticCurveTo(0, 0.24, -0.5, 0.12); c.closePath(); c.fill();
  c.restore();
}

/** A turkey in a cowboy hat. (x, y) = body centre, s = overall size. */
function turkey(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // tail fan
  const cols = [AUT.cranberry, AUT.pumpkin, AUT.gold, AUT.rust, AUT.butter, AUT.rust, AUT.gold, AUT.pumpkin, AUT.cranberry];
  const n = cols.length, L = 0.41, w = 0.088;
  for (let pass = 0; pass < 2; pass++) for (let k = 0; k < n; k++) {
    // draw outside-in so the centre feathers overlap the outer ones
    const order = [0, 8, 1, 7, 2, 6, 3, 5, 4][k];
    const a = (-80 + (160 * order) / (n - 1)) * Math.PI / 180;
    c.save(); c.translate(0, 0.1); c.rotate(a);
    const fp = (len, ww) => { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-ww, -len * 0.42, -ww * 1.05, -len * 0.92, 0, -len); c.bezierCurveTo(ww * 1.05, -len * 0.92, ww, -len * 0.42, 0, 0); c.closePath(); };
    if (pass === 0) { c.fillStyle = AUT.espresso; fp(L + 0.024, w + 0.02); c.fill(); }
    else {
      c.fillStyle = cols[order]; fp(L, w); c.fill();
      // tip band and eye
      c.save(); fp(L, w); c.clip();
      c.fillStyle = AUT.espresso; c.globalAlpha = 0.85; c.fillRect(-0.2, -L * 0.8, 0.4, 0.035);
      c.globalAlpha = 1; c.fillStyle = AUT.cream; c.beginPath(); c.arc(0, -L * 0.875, 0.026, 0, Math.PI * 2); c.fill();
      c.restore();
      c.strokeStyle = 'rgba(43,27,20,0.45)'; c.lineWidth = 0.008;
      c.beginPath(); c.moveTo(0, -0.06); c.lineTo(0, -L * 0.74); c.stroke();
    }
    c.restore();
  }
  // feet
  c.strokeStyle = AUT.gold; c.lineWidth = 0.022;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 0.06, 0.26); c.lineTo(sx * 0.06, 0.345);
    c.moveTo(sx * 0.06, 0.345); c.lineTo(sx * 0.06 - 0.045, 0.372);
    c.moveTo(sx * 0.06, 0.345); c.lineTo(sx * 0.06, 0.382);
    c.moveTo(sx * 0.06, 0.345); c.lineTo(sx * 0.06 + 0.045, 0.372); c.stroke();
  }
  // body
  c.fillStyle = AUT.espresso;
  c.beginPath(); c.ellipse(0, 0.115, 0.178, 0.198, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.arc(0, -0.105, 0.112, 0, Math.PI * 2); c.fill();
  const bg = c.createLinearGradient(0, -0.1, 0, 0.3);
  bg.addColorStop(0, '#8A4B26'); bg.addColorStop(1, '#5E3219');
  c.fillStyle = bg;
  c.beginPath(); c.ellipse(0, 0.115, 0.158, 0.178, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#B06A38';
  c.beginPath(); c.ellipse(0, 0.15, 0.092, 0.118, 0, 0, Math.PI * 2); c.fill();
  // belly scallops
  c.strokeStyle = 'rgba(94,50,25,0.55)'; c.lineWidth = 0.009;
  for (let r = 0; r < 3; r++) for (let i = -1; i <= 1; i++) {
    const xx = i * 0.05 + (r % 2 ? 0.025 : 0), yy = 0.1 + r * 0.045;
    if (Math.abs(xx) > 0.07) continue;
    c.beginPath(); c.arc(xx, yy, 0.02, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }
  // wings
  c.fillStyle = '#6F3B1D';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 0.15, 0.1, 0.05, 0.105, sx * -0.3, 0, Math.PI * 2); c.fill(); }
  // head
  c.fillStyle = '#8A4B26';
  c.beginPath(); c.arc(0, -0.105, 0.094, 0, Math.PI * 2); c.fill();
  c.fillRect(-0.06, -0.06, 0.12, 0.1);
  // eyes
  for (const sx of [-1, 1]) {
    c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * 0.037, -0.118, 0.029, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#1b100b'; c.beginPath(); c.arc(sx * 0.037 + 0.004, -0.114, 0.014, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * 0.037 + 0.009, -0.12, 0.005, 0, Math.PI * 2); c.fill();
  }
  // wattle, then beak on top
  c.fillStyle = '#D92B2B';
  c.beginPath(); c.moveTo(0.012, -0.07); c.bezierCurveTo(0.06, -0.06, 0.058, 0.02, 0.03, 0.03); c.bezierCurveTo(0.004, 0.02, 0.0, -0.03, 0.012, -0.07); c.fill();
  c.fillStyle = AUT.gold;
  c.beginPath(); c.moveTo(-0.034, -0.082); c.lineTo(0.034, -0.082); c.lineTo(0, -0.025); c.closePath(); c.fill();
  // hat
  cowboyHat(c, 0, -0.2, 0.2, AUT.espresso, AUT.gold);
  c.fillStyle = AUT.cream; star(c, 0, -0.187, 0.02); c.fill();
  c.restore();
}

/** Hero: round "Gobble Gobble" badge. Reads on any shirt colour. */
function badge(c, S) {
  const cx = S / 2, cy = S / 2, R = S * 0.475;
  c.fillStyle = AUT.deepTeal; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.fill();
  c.strokeStyle = AUT.cream; c.lineWidth = S * 0.012; c.beginPath(); c.arc(cx, cy, R - S * 0.016, 0, Math.PI * 2); c.stroke();
  // sun disc with rays
  const r = S * 0.305;
  c.save();
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
  const g = c.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0, '#FFE39A'); g.addColorStop(0.55, '#FFC052'); g.addColorStop(1, '#F58A2A');
  c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.fillStyle = 'rgba(255,255,255,0.2)';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, da = Math.PI / 32;
    c.beginPath(); c.moveTo(cx, cy + r * 0.2); c.lineTo(cx + Math.cos(a - da) * r * 1.6, cy + r * 0.2 + Math.sin(a - da) * r * 1.6); c.lineTo(cx + Math.cos(a + da) * r * 1.6, cy + r * 0.2 + Math.sin(a + da) * r * 1.6); c.closePath(); c.fill();
  }
  // ground
  c.fillStyle = '#C4561B'; c.beginPath(); c.ellipse(cx, cy + r * 1.2, r * 1.25, r * 0.42, 0, 0, Math.PI * 2); c.fill();
  c.restore();
  turkey(c, cx, cy + S * 0.02, S * 0.7);
  c.strokeStyle = AUT.cream; c.lineWidth = S * 0.01; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
  // lettering
  arcText(c, 'GOBBLE GOBBLE', cx, cy, S * 0.343, -Math.PI / 2, { ...an(S * 0.112), tracking: S * 0.012, fill: AUT.cream });
  arcText(c, 'TURKEY DAY CREW', cx, cy, S * 0.425, Math.PI / 2, { ...an(S * 0.07), tracking: S * 0.013, fill: AUT.gold, inward: true });
  c.fillStyle = AUT.pumpkin;
  star(c, cx - S * 0.385, cy + S * 0.03, S * 0.026); c.fill(); star(c, cx + S * 0.385, cy + S * 0.03, S * 0.026); c.fill();
}

/** Script "Thankful" with a block shadow. For dark garments. */
function thankful(c, W, H) {
  c.save();
  c.translate(W / 2, H * 0.47); c.rotate(-0.07);
  let size = 300;
  c.font = `400 ${size}px "Pacifico"`;
  size *= Math.min(1, (W * 0.86) / c.measureText('Thankful').width);
  c.font = `400 ${size}px "Pacifico"`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const y = size * 0.3;
  c.lineJoin = 'round';
  for (let i = 18; i >= 1; i--) { c.fillStyle = i > 9 ? AUT.rust : AUT.pumpkin; c.fillText('Thankful', i * 0.8, y + i * 0.9); }
  const g = c.createLinearGradient(0, y - size * 0.8, 0, y + size * 0.2);
  g.addColorStop(0, '#FFFAEC'); g.addColorStop(1, '#FFE2B0');
  c.fillStyle = g; c.fillText('Thankful', 0, y);
  // swash
  c.strokeStyle = AUT.gold; c.lineWidth = 13;
  c.beginPath(); c.moveTo(-W * 0.36, y + size * 0.42); c.bezierCurveTo(-W * 0.1, y + size * 0.3, W * 0.14, y + size * 0.52, W * 0.38, y + size * 0.36); c.stroke();
  // small caps line
  c.font = `400 ${size * 0.2}px "Anton"`; c.letterSpacing = `${size * 0.06}px`;
  c.fillStyle = AUT.gold; c.fillText('GRATEFUL  ·  BLESSED', size * 0.03, y + size * 0.78);
  c.letterSpacing = '0px';
  c.restore();
  drawLeaf(c, 'maple', W * 0.9, H * 0.2, W * 0.058, 0.5, 0);
  drawLeaf(c, 'ovate', W * 0.085, H * 0.71, W * 0.046, -0.9, 2);
}

/** Stacked "FEAST MODE". */
function feast(c, S) {
  const cx = S / 2;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = `400 ${S * 0.085}px "Anton"`; c.letterSpacing = `${S * 0.022}px`;
  c.fillStyle = AUT.cream; c.fillText('THANKSGIVING', cx + S * 0.011, S * 0.125);
  c.letterSpacing = '0px';
  c.fillStyle = AUT.pumpkin; star(c, cx - S * 0.395, S * 0.095, S * 0.024); c.fill(); star(c, cx + S * 0.395, S * 0.095, S * 0.024); c.fill();
  const big = (str, y) => {
    let size = S * 0.4;
    c.font = `400 ${size}px "Anton"`; c.letterSpacing = `${S * 0.012}px`;
    size *= (S * 0.84) / (c.measureText(str).width - S * 0.012);
    c.font = `400 ${size}px "Anton"`;
    const x = cx + S * 0.006;
    for (let i = 20; i >= 1; i--) { c.fillStyle = i > 10 ? AUT.wine : AUT.rust; c.fillText(str, x + i * S / 1000, y + i * 1.1 * S / 1000); }
    const g = c.createLinearGradient(0, y - size * 0.75, 0, y);
    g.addColorStop(0, '#FFE28A'); g.addColorStop(1, AUT.gold);
    c.fillStyle = g; c.fillText(str, x, y);
    c.letterSpacing = '0px';
    return size;
  };
  big('FEAST', S * 0.5);
  c.strokeStyle = AUT.cream; c.lineWidth = S * 0.01;
  c.beginPath(); c.moveTo(S * 0.09, S * 0.565); c.lineTo(cx - S * 0.06, S * 0.565); c.moveTo(cx + S * 0.06, S * 0.565); c.lineTo(S * 0.91, S * 0.565); c.stroke();
  c.fillStyle = AUT.cream; star(c, cx, S * 0.565, S * 0.03); c.fill();
  big('MODE', S * 0.955);
}

/** Pumpkin with "PIE SEASON". */
function pumpkin(c, W, H, lettering = true) {
  const cx = W / 2, cy = lettering ? H * 0.47 : H * 0.6, u = lettering ? W / 900 : W / 760;
  // vine and leaf behind
  c.strokeStyle = AUT.forest; c.lineWidth = 12 * u;
  c.beginPath(); c.moveTo(cx + 20 * u, cy - 230 * u); c.bezierCurveTo(cx + 150 * u, cy - 330 * u, cx + 250 * u, cy - 250 * u, cx + 200 * u, cy - 200 * u);
  c.bezierCurveTo(cx + 170 * u, cy - 170 * u, cx + 150 * u, cy - 215 * u, cx + 185 * u, cy - 225 * u); c.stroke();
  drawLeaf(c, 'ovate', cx - 120 * u, cy - 262 * u, 86 * u, -1.15, ['#4F8A52', '#86B86B', '#2C5633']);
  const lobe = (dx, rx, ry, k) => {
    const g = c.createRadialGradient(cx + dx - rx * 0.3, cy - ry * 0.45, rx * 0.1, cx + dx, cy, ry * 1.05);
    g.addColorStop(0, k ? '#FFB24A' : '#FFA63D'); g.addColorStop(0.6, AUT.pumpkin); g.addColorStop(1, '#C4501A');
    c.fillStyle = g; c.strokeStyle = '#8E3410'; c.lineWidth = 9 * u;
    c.beginPath(); c.ellipse(cx + dx, cy + (k ? 0 : 8 * u), rx, ry, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  };
  lobe(-225 * u, 130 * u, 205 * u, 0); lobe(225 * u, 130 * u, 205 * u, 0);
  lobe(-118 * u, 140 * u, 232 * u, 0); lobe(118 * u, 140 * u, 232 * u, 0);
  lobe(0, 128 * u, 244 * u, 1);
  // highlight
  c.strokeStyle = 'rgba(255,240,200,0.75)'; c.lineWidth = 14 * u;
  c.beginPath(); c.arc(cx - 235 * u, cy - 20 * u, 96 * u, Math.PI * 0.95, Math.PI * 1.32); c.stroke();
  // stem
  c.fillStyle = AUT.brown; c.strokeStyle = '#3D1F0F'; c.lineWidth = 8 * u;
  c.beginPath(); c.moveTo(cx - 34 * u, cy - 232 * u); c.bezierCurveTo(cx - 30 * u, cy - 300 * u, cx - 60 * u, cy - 320 * u, cx - 72 * u, cy - 350 * u);
  c.lineTo(cx - 14 * u, cy - 362 * u); c.bezierCurveTo(cx + 2 * u, cy - 320 * u, cx + 36 * u, cy - 290 * u, cx + 36 * u, cy - 232 * u); c.closePath(); c.fill(); c.stroke();
  if (!lettering) return;
  // lettering
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  let size = 150 * u;
  c.font = `400 ${size}px "Rye"`; c.letterSpacing = `${4 * u}px`;
  size *= Math.min(1, (W * 0.94) / c.measureText('PIE SEASON').width);
  c.font = `400 ${size}px "Rye"`;
  const ty = H * 0.965;
  c.fillStyle = AUT.rust; c.fillText('PIE SEASON', cx + 2 * u + 6 * u, ty + 7 * u);
  c.fillStyle = AUT.cream; c.fillText('PIE SEASON', cx + 2 * u, ty);
  c.letterSpacing = '0px';
}

/** Leaf wreath around "give thanks". */
function wreath(c, S) {
  const cx = S / 2, cy = S / 2, R = S * 0.385;
  const rnd = mulberry32(11);
  c.strokeStyle = AUT.brown; c.lineWidth = S * 0.012;
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  const n = 30;
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + ring * (Math.PI / n);
    const rr = R + (ring ? -1 : 1) * S * 0.032;
    const tilt = (ring ? -1 : 1) * 0.95;
    const kind = ['ovate', 'ovate', 'oak', 'maple'][(i + ring) % 4];
    drawLeaf(c, kind, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, S * (0.05 + rnd() * 0.012), a + Math.PI + tilt, (i * 2 + ring) % 5);
  }
  c.fillStyle = AUT.cranberry;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.2;
    for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(cx + Math.cos(a + k * 0.06) * (R - S * 0.004 + k * S * 0.02), cy + Math.sin(a + k * 0.06) * (R - S * 0.004 + k * S * 0.02), S * 0.013, 0, Math.PI * 2); c.fill(); }
  }
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = `400 ${S * 0.105}px "Anton"`; c.letterSpacing = `${S * 0.045}px`;
  c.fillStyle = AUT.cream; c.fillText('GIVE', cx + S * 0.022, cy - S * 0.07);
  c.letterSpacing = '0px';
  c.font = `400 ${S * 0.19}px "Pacifico"`;
  c.fillStyle = AUT.rust; c.fillText('thanks', cx + S * 0.006, cy + S * 0.128);
  c.fillStyle = AUT.gold; c.fillText('thanks', cx, cy + S * 0.12);
}

/** Sunburst with a "FRIENDSGIVING" ribbon. */
function friends(c, W, H) {
  const cx = W / 2, cy = H * 0.5, R = H * 0.42;
  c.save();
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
  c.fillStyle = AUT.gold; c.fillRect(0, 0, W, H);
  c.fillStyle = AUT.pumpkin;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 - Math.PI / 2, da = Math.PI / 28;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a - da) * R * 1.2, cy + Math.sin(a - da) * R * 1.2); c.lineTo(cx + Math.cos(a + da) * R * 1.2, cy + Math.sin(a + da) * R * 1.2); c.closePath(); c.fill();
  }
  c.restore();
  c.strokeStyle = AUT.cranberry; c.lineWidth = H * 0.032; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = AUT.cream; c.lineWidth = H * 0.008; c.beginPath(); c.arc(cx, cy, R - H * 0.034, 0, Math.PI * 2); c.stroke();
  // ribbon
  c.save();
  c.translate(cx, cy + H * 0.02); c.rotate(-0.12);
  const bw = W * 0.94, bh = H * 0.19;
  c.fillStyle = AUT.wine;
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * bw * 0.42, -bh * 0.3); c.lineTo(sx * bw * 0.5, -bh * 0.3); c.lineTo(sx * bw * 0.465, bh * 0.2); c.lineTo(sx * bw * 0.5, bh * 0.7); c.lineTo(sx * bw * 0.42, bh * 0.7); c.closePath(); c.fill();
  }
  c.fillStyle = AUT.espresso; roundRect(c, -bw * 0.45, -bh / 2, bw * 0.9, bh, 4); c.fill();
  let size = bh * 0.72;
  c.font = `400 ${size}px "Anton"`; c.letterSpacing = `${size * 0.05}px`;
  size *= Math.min(1, (bw * 0.84) / c.measureText('FRIENDSGIVING').width);
  c.font = `400 ${size}px "Anton"`; c.letterSpacing = `${size * 0.05}px`;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = AUT.cream; c.fillText('FRIENDSGIVING', size * 0.025, bh * 0.045);
  c.letterSpacing = '0px';
  c.restore();
  c.fillStyle = AUT.cranberry;
  star(c, cx - R * 0.42, cy - R * 0.5, H * 0.04); c.fill(); star(c, cx, cy - R * 0.66, H * 0.05); c.fill(); star(c, cx + R * 0.42, cy - R * 0.5, H * 0.04); c.fill();
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.font = `400 ${H * 0.062}px "Anton"`; c.letterSpacing = `${H * 0.008}px`;
  c.fillStyle = AUT.wine; c.fillText('EAT · LAUGH · REPEAT', cx + H * 0.004, cy + R * 0.62);
  c.letterSpacing = '0px';
}

export function buildThanksDesigns() {
  return {
    badge: make(1280, 1280, (c, w) => badge(c, w)),
    thankful: make(1280, 860, thankful),
    feast: make(1000, 1000, (c, w) => feast(c, w)),
    pumpkin: make(900, 900, pumpkin),
    wreath: make(1000, 1000, (c, w) => wreath(c, w)),
    friends: make(1100, 900, friends),
    // decorations for the end card (not on the sheet)
    mascot: make(1000, 900, (c, w, h) => turkey(c, w / 2, h * 0.5, h * 1.02)),
    pumpkinOnly: make(700, 640, (c, w, h) => pumpkin(c, w, h, false)),
  };
}

// ---- gang sheet ------------------------------------------------------------------

export const SHEET_PX = { w: 1320, h: 1800 };
/** Cell centres and the largest box each design may fill, in sheet pixels. */
const CELLS = [
  { id: 'badge', x: 352, y: 345, w: 560, h: 560 },
  { id: 'thankful', x: 968, y: 345, w: 590, h: 480 },
  { id: 'feast', x: 352, y: 925, w: 520, h: 520 },
  { id: 'pumpkin', x: 968, y: 925, w: 500, h: 540 },
  { id: 'wreath', x: 352, y: 1478, w: 540, h: 540 },
  { id: 'friends', x: 968, y: 1478, w: 590, h: 500 },
];

/** All six designs on one transparent canvas, plus each one's rect in UV (y up). */
export function buildSheetArt(designs) {
  const rects = [];
  const canvas = make(SHEET_PX.w, SHEET_PX.h, (c) => {
    c.imageSmoothingQuality = 'high';
    for (const cell of CELLS) {
      const d = designs[cell.id];
      const s = Math.min(cell.w / d.width, cell.h / d.height);
      const w = d.width * s, h = d.height * s;
      c.drawImage(d, cell.x - w / 2, cell.y - h / 2, w, h);
      const pad = 26;
      rects.push({
        id: cell.id,
        x0: (cell.x - w / 2 - pad) / SHEET_PX.w, x1: (cell.x + w / 2 + pad) / SHEET_PX.w,
        y0: 1 - (cell.y + h / 2 + pad) / SHEET_PX.h, y1: 1 - (cell.y - h / 2 - pad) / SHEET_PX.h,
      });
    }
  });
  return { canvas, rects };
}

// ---- garments --------------------------------------------------------------------

const GARMENT_PATHS = {
  tee(c) {
    c.beginPath();
    c.moveTo(0.385, 0.108); c.quadraticCurveTo(0.5, 0.205, 0.615, 0.108);
    c.lineTo(0.795, 0.158);
    c.quadraticCurveTo(0.905, 0.215, 0.978, 0.365);
    c.lineTo(0.857, 0.458);
    c.quadraticCurveTo(0.80, 0.405, 0.762, 0.375);
    c.quadraticCurveTo(0.752, 0.65, 0.772, 0.925);
    c.quadraticCurveTo(0.5, 0.952, 0.228, 0.925);
    c.quadraticCurveTo(0.248, 0.65, 0.238, 0.375);
    c.quadraticCurveTo(0.20, 0.405, 0.143, 0.458);
    c.lineTo(0.022, 0.365);
    c.quadraticCurveTo(0.095, 0.215, 0.205, 0.158);
    c.closePath();
  },
  crew(c) {
    c.beginPath();
    c.moveTo(0.39, 0.112); c.quadraticCurveTo(0.5, 0.2, 0.61, 0.112);
    c.lineTo(0.77, 0.16);
    c.quadraticCurveTo(0.868, 0.2, 0.9, 0.34);
    c.lineTo(0.972, 0.8);
    c.lineTo(0.868, 0.83);
    c.lineTo(0.752, 0.43);
    c.quadraticCurveTo(0.745, 0.68, 0.756, 0.935);
    c.quadraticCurveTo(0.5, 0.955, 0.244, 0.935);
    c.quadraticCurveTo(0.255, 0.68, 0.248, 0.43);
    c.lineTo(0.132, 0.83);
    c.lineTo(0.028, 0.8);
    c.lineTo(0.1, 0.34);
    c.quadraticCurveTo(0.132, 0.2, 0.23, 0.16);
    c.closePath();
  },
};

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

let noiseTile = null;
function fabricNoise() {
  if (noiseTile) return noiseTile;
  const rnd = mulberry32(5);
  noiseTile = make(256, 256, (c) => {
    const img = c.createImageData(256, 256);
    for (let i = 0; i < 256 * 256; i++) {
      const v = rnd() > 0.5 ? 255 : 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = Math.round(rnd() * 26);
    }
    c.putImageData(img, 0, 0);
  });
  return noiseTile;
}

/**
 * Flat-lay garment, 1024 px. kind: 'tee' | 'crew'. Returns { canvas, shadow }.
 * `print` (optional) = { art, x, y, w } in unit space, baked under the fold shading.
 */
export function buildGarment(kind, color, print = null, S = 1024) {
  const path = GARMENT_PATHS[kind];
  const dark = shade(color, -0.42), mid = shade(color, -0.2), light = shade(color, 0.16);
  const canvas = make(S, S, (c) => {
    c.save(); c.scale(S, S);
    // base, with rounded corners from a same-colour stroke
    c.fillStyle = color; c.strokeStyle = color; c.lineWidth = 0.012; c.lineJoin = 'round';
    path(c); c.fill(); c.stroke();
    c.save(); path(c); c.clip();
    // inside of the back neck
    c.fillStyle = dark;
    c.beginPath(); c.moveTo(0.36, 0.09); c.lineTo(0.64, 0.09); c.lineTo(0.64, 0.2); c.lineTo(0.36, 0.2); c.closePath(); c.fill();
    c.fillStyle = color; c.strokeStyle = color;
    c.beginPath(); c.moveTo(0.3, 0.1); c.quadraticCurveTo(0.5, 0.215, 0.7, 0.1); c.lineTo(0.7, 0.3); c.lineTo(0.3, 0.3); c.closePath(); c.fill();
    // woven label
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(0.478, 0.118, 0.044, 0.022);
    // broad light: top-left key, darker toward hem and right side
    let g = c.createLinearGradient(0.15, 0.1, 0.85, 0.95);
    g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.16)');
    c.fillStyle = g; c.fillRect(0, 0, 1, 1);
    if (print) {
      const d = print.art, w = print.w, h = w * d.height / d.width;
      c.imageSmoothingQuality = 'high';
      c.drawImage(d, print.x - w / 2, print.y - h / 2, w, h);
    }
    // soft folds
    c.filter = `blur(${0.016 * S}px)`;
    const fold = (pts, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); c.bezierCurveTo(pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]); c.stroke(); };
    const D = 'rgba(0,0,0,0.20)', L = 'rgba(255,255,255,0.12)';
    if (kind === 'tee') {
      fold([0.26, 0.38, 0.33, 0.5, 0.33, 0.7, 0.3, 0.9], 0.03, D); fold([0.3, 0.38, 0.37, 0.5, 0.37, 0.7, 0.34, 0.9], 0.03, L);
      fold([0.74, 0.38, 0.67, 0.5, 0.68, 0.7, 0.7, 0.9], 0.03, D); fold([0.7, 0.38, 0.63, 0.5, 0.64, 0.7, 0.66, 0.9], 0.026, L);
      fold([0.2, 0.2, 0.16, 0.3, 0.1, 0.36, 0.06, 0.42], 0.028, D); fold([0.8, 0.2, 0.84, 0.3, 0.9, 0.36, 0.94, 0.42], 0.028, D);
      fold([0.4, 0.72, 0.5, 0.78, 0.58, 0.8, 0.7, 0.76], 0.024, D); fold([0.4, 0.75, 0.5, 0.81, 0.58, 0.83, 0.7, 0.79], 0.02, L);
    } else {
      fold([0.27, 0.44, 0.33, 0.56, 0.33, 0.72, 0.3, 0.88], 0.03, D); fold([0.31, 0.44, 0.37, 0.56, 0.37, 0.72, 0.34, 0.88], 0.028, L);
      fold([0.73, 0.44, 0.67, 0.56, 0.68, 0.72, 0.7, 0.88], 0.03, D); fold([0.69, 0.44, 0.63, 0.56, 0.64, 0.72, 0.66, 0.88], 0.026, L);
      fold([0.15, 0.36, 0.13, 0.5, 0.1, 0.62, 0.08, 0.76], 0.03, D); fold([0.85, 0.36, 0.87, 0.5, 0.9, 0.62, 0.92, 0.76], 0.03, D);
      fold([0.19, 0.4, 0.17, 0.52, 0.15, 0.62, 0.13, 0.74], 0.022, L); fold([0.81, 0.4, 0.83, 0.52, 0.86, 0.62, 0.88, 0.74], 0.022, L);
    }
    c.filter = 'none';
    // edge darkening
    c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.05; c.filter = `blur(${0.02 * S}px)`;
    path(c); c.stroke(); c.filter = 'none';
    // seams and stitching
    c.strokeStyle = 'rgba(0,0,0,0.26)'; c.lineWidth = 0.0035;
    c.beginPath();
    if (kind === 'tee') {
      c.moveTo(0.795, 0.158); c.quadraticCurveTo(0.752, 0.26, 0.762, 0.375);
      c.moveTo(0.205, 0.158); c.quadraticCurveTo(0.248, 0.26, 0.238, 0.375);
    } else {
      c.moveTo(0.77, 0.16); c.quadraticCurveTo(0.735, 0.29, 0.752, 0.43);
      c.moveTo(0.23, 0.16); c.quadraticCurveTo(0.265, 0.29, 0.248, 0.43);
    }
    c.stroke();
    c.setLineDash([0.008, 0.006]); c.lineWidth = 0.0028; c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.beginPath();
    if (kind === 'tee') {
      c.moveTo(0.232, 0.9); c.quadraticCurveTo(0.5, 0.927, 0.768, 0.9);
      c.moveTo(0.04, 0.35); c.lineTo(0.158, 0.44); c.moveTo(0.96, 0.35); c.lineTo(0.842, 0.44);
    }
    c.stroke(); c.setLineDash([]);
    if (kind === 'crew') {
      // ribbed waistband and cuffs
      c.fillStyle = 'rgba(0,0,0,0.10)';
      c.beginPath(); c.moveTo(0.24, 0.885); c.quadraticCurveTo(0.5, 0.905, 0.76, 0.885); c.lineTo(0.76, 0.96); c.lineTo(0.24, 0.96); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 0.003;
      c.beginPath();
      for (let x = 0.25; x < 0.755; x += 0.0115) { c.moveTo(x, 0.89 + 0.012 * Math.sin((x - 0.25) / 0.51 * Math.PI)); c.lineTo(x, 0.95); }
      for (const sx of [0, 1]) {
        const ax = sx ? 0.972 : 0.028, ay = 0.8, bx = sx ? 0.868 : 0.132, by = 0.83, ux = sx ? -0.012 : 0.012, uy = -0.062;
        for (let k = 0.06; k < 1; k += 0.11) { const x = ax + (bx - ax) * k, y = ay + (by - ay) * k; c.moveTo(x, y); c.lineTo(x + ux, y + uy); }
      }
      c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.10)';
      for (const sx of [0, 1]) {
        const m = (x) => (sx ? 1 - x : x);
        c.beginPath(); c.moveTo(m(0.028), 0.8); c.lineTo(m(0.132), 0.83); c.lineTo(m(0.146), 0.768); c.lineTo(m(0.037), 0.738); c.closePath(); c.fill();
      }
    }
    // fabric grain
    c.restore();
    c.restore();
    c.save();
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = 0.5;
    c.fillStyle = c.createPattern(fabricNoise(), 'repeat'); c.fillRect(0, 0, S, S);
    c.restore();
    // collar rib
    c.save(); c.scale(S, S);
    const rib = kind === 'crew' ? 0.034 : 0.026;
    const ny = kind === 'crew' ? 0.112 : 0.108, nx0 = kind === 'crew' ? 0.39 : 0.385, cyq = kind === 'crew' ? 0.2 : 0.205;
    c.lineCap = 'butt';
    c.strokeStyle = mid; c.lineWidth = rib;
    c.beginPath(); c.moveTo(nx0 - 0.004, ny + 0.004); c.quadraticCurveTo(0.5, 0.118 + rib * 0.2, 1 - nx0 + 0.004, ny + 0.004); c.stroke();
    c.strokeStyle = light; c.lineWidth = rib;
    c.beginPath(); c.moveTo(nx0 - 0.002, ny + rib * 0.42); c.quadraticCurveTo(0.5, cyq + rib * 0.5, 1 - nx0 + 0.002, ny + rib * 0.42); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 0.003;
    c.beginPath(); c.moveTo(nx0 - 0.014, ny + rib * 0.95); c.quadraticCurveTo(0.5, cyq + rib * 1.06, 1 - nx0 + 0.014, ny + rib * 0.95); c.stroke();
    c.beginPath(); c.moveTo(nx0 + 0.008, ny - 0.002); c.quadraticCurveTo(0.5, cyq - 0.004, 1 - nx0 - 0.008, ny - 0.002); c.stroke();
    c.restore();
  });
  // soft drop shadow, on a canvas with extra margin (1.3x)
  const shadow = make(512, 512, (c) => {
    c.save();
    c.filter = 'blur(14px)';
    c.translate(256, 256); c.scale(512 / 1.3, 512 / 1.3); c.translate(-0.5, -0.5);
    c.fillStyle = '#000'; path(c); c.fill();
    c.restore();
  });
  return { canvas, shadow };
}

// ---- heat platen (seen from above) -------------------------------------------------

export const PLATEN = { w: 900, h: 1400, plate: 860, cy: 450 };   // plate centre in canvas px
export function buildPlaten(hatImg) {
  const W = PLATEN.w, H = PLATEN.h, P = PLATEN.plate, top = PLATEN.cy - P / 2;
  return make(W, H, (c) => {
    // handle arm, running down out of frame toward the operator
    let g = c.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, 0);
    g.addColorStop(0, '#3b4150'); g.addColorStop(0.35, '#aab2c2'); g.addColorStop(0.6, '#6d7586'); g.addColorStop(1, '#2a2f3b');
    c.fillStyle = g; roundRect(c, W / 2 - 80, top + P - 160, 160, H, 30); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(W / 2 - 80, top + P, 160, 26);
    // steel plate
    g = c.createLinearGradient(0, top, W, top + P);
    g.addColorStop(0, '#c9cfdb'); g.addColorStop(0.5, '#7f8797'); g.addColorStop(1, '#4b5262');
    c.fillStyle = g; roundRect(c, 20, top, P, P, 46); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 3; roundRect(c, 24, top + 4, P - 8, P - 8, 43); c.stroke();
    // navy housing
    g = c.createLinearGradient(0, top + 50, W, top + P - 60);
    g.addColorStop(0, '#2c4488'); g.addColorStop(0.5, '#1b2d63'); g.addColorStop(1, '#101c44');
    c.fillStyle = g; roundRect(c, 78, top + 58, P - 116, P - 116, 58); c.fill();
    c.strokeStyle = 'rgba(140,170,255,0.5)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(140, top + 66); c.lineTo(W - 220, top + 66); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 5; roundRect(c, 78, top + 58, P - 116, P - 116, 58); c.stroke();
    // badge: tinted brand hat
    const tmp = document.createElement('canvas'); tmp.width = 420; tmp.height = Math.round(420 * hatImg.height / hatImg.width);
    const t = tmp.getContext('2d'); t.imageSmoothingQuality = 'high';
    t.drawImage(hatImg, 0, 0, tmp.width, tmp.height);
    t.globalCompositeOperation = 'source-in'; t.fillStyle = '#f4ead8'; t.fillRect(0, 0, tmp.width, tmp.height);
    c.globalAlpha = 0.92; c.drawImage(tmp, W / 2 - 210, PLATEN.cy - tmp.height / 2 - 30);
    c.globalAlpha = 1;
    c.font = '800 34px "Montserrat"'; c.textAlign = 'center'; c.letterSpacing = '12px'; c.fillStyle = 'rgba(244,234,216,0.9)';
    c.fillText('COWBOY DTF', W / 2 + 6, PLATEN.cy + 120);
    c.letterSpacing = '0px';
    // bolts
    c.fillStyle = '#d9dee8';
    for (const [x, y] of [[62, top + 42], [W - 62, top + 42], [62, top + P - 42], [W - 62, top + P - 42]]) { c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill(); }
  });
}

/** Debug: everything on one board. */
export function debugThanks(images, which) {
  const d = buildThanksDesigns();
  if (which === 'sheet') {
    const { canvas } = buildSheetArt(d);
    return make(canvas.width, canvas.height, (c) => { c.fillStyle = '#1a191d'; c.fillRect(0, 0, canvas.width, canvas.height); c.drawImage(canvas, 0, 0); }).toDataURL('image/png');
  }
  if (which === 'garments') {
    const a = buildGarment('tee', '#3a2a22', { art: d.thankful, x: 0.5, y: 0.42, w: 0.4 });
    const b = buildGarment('tee', '#f1e6d2', { art: d.badge, x: 0.5, y: 0.43, w: 0.36 });
    const e = buildGarment('crew', '#3f5a3c', { art: d.feast, x: 0.5, y: 0.5, w: 0.3 });
    const p = buildPlaten(images.hat);
    const leaves = buildLeafSprites(256);
    return make(3072, 2248, (c) => {
      c.fillStyle = '#e9dfcc'; c.fillRect(0, 0, 3072, 2248);
      [a, b, e].forEach((g, i) => { c.globalAlpha = 0.5; c.drawImage(g.shadow, i * 1024 - 154 + 20, -154 + 30, 1331, 1331); c.globalAlpha = 1; c.drawImage(g.canvas, i * 1024, 0); });
      c.fillStyle = '#1a191d'; c.fillRect(0, 1024, 3072, 1224);
      c.drawImage(p, 40, 1090, 720, 1120);
      leaves.forEach((l, i) => c.drawImage(l, 1000 + (i % 5) * 300, 1100 + Math.floor(i / 5) * 300));
    }).toDataURL('image/png');
  }
  return d[which].toDataURL('image/png');
}
