// 2D canvas layer for typography and graphic elements. It is drawn in
// 1080x1920 design units and composited into the 3D frame before bloom,
// motion blur and grain, so type sits "in" the picture rather than on it.

import { sat, lerp, prog, ease } from './util.js';

export const FONT = {
  display: 'Sancreek',
  label: 'Montserrat',
  serif: 'Playfair Display',
};

export const CREAM = '#f4ead8';

export class Overlay {
  constructor(scale) {
    this.scale = scale;
    this.canvas = document.createElement('canvas');
    this.canvas.width = Math.round(1080 * scale);
    this.canvas.height = Math.round(1920 * scale);
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
  }

  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.filter = 'none'; c.globalCompositeOperation = 'source-over';
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    return c;
  }
}

export const fontStr = (family, size, weight = 400, style = 'normal') => `${style} ${weight} ${size}px "${family}"`;

function setFont(c, o) {
  c.font = fontStr(o.family || FONT.label, o.size || 40, o.weight || 400, o.style || 'normal');
  c.letterSpacing = `${o.tracking || 0}px`;
  c.textBaseline = o.baseline || 'alphabetic';
}

/** Width of a string, without the trailing letter-spacing. */
export function measure(c, str, o) {
  setFont(c, o);
  return c.measureText(str).width - (o.tracking || 0);
}

function applyFill(c, o, x, y) {
  if (o.gradient) {
    const g = c.createLinearGradient(0, y - (o.size || 40) * 0.8, 0, y + (o.size || 40) * 0.1);
    o.gradient.forEach((col, i) => g.addColorStop(i / (o.gradient.length - 1), col));
    c.fillStyle = g;
  } else {
    c.fillStyle = o.fill || CREAM;
  }
}

function applyShadow(c, o) {
  if (o.glow) { c.shadowColor = o.glow.color; c.shadowBlur = o.glow.blur; c.shadowOffsetX = 0; c.shadowOffsetY = 0; }
  else if (o.shadow !== false) {
    const s = o.shadow || {};
    c.shadowColor = s.color || 'rgba(0,0,0,0.55)'; c.shadowBlur = s.blur ?? 28; c.shadowOffsetX = 0; c.shadowOffsetY = s.y ?? 6;
  }
}

/** Draw one line of text. o: family,size,weight,style,tracking,align,fill,gradient,alpha,blur,glow,shadow,stroke */
export function text(c, str, x, y, o = {}) {
  const a = o.alpha ?? 1;
  if (a <= 0.003) return;
  c.save();
  setFont(c, o);
  const w = c.measureText(str).width - (o.tracking || 0);
  let x0 = x;
  if ((o.align || 'center') === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
  c.textAlign = 'left';
  c.globalAlpha = a;
  if (o.blur > 0.2) c.filter = `blur(${o.blur.toFixed(2)}px)`;
  applyShadow(c, o);
  if (o.stroke) {
    c.lineWidth = o.stroke.width; c.strokeStyle = o.stroke.color; c.lineJoin = 'round';
    c.strokeText(str, x0, y);
    if (o.stroke.only) { c.restore(); return w; }
  }
  applyFill(c, o, x0, y);
  c.fillText(str, x0, y);
  c.restore();
  return w;
}

/**
 * Draw text character by character. fn(i, n) returns per-character
 * { dx, dy, a, s, blur } so letters can be staggered.
 */
export function chars(c, str, x, y, o = {}, fn = null) {
  c.save();
  setFont(c, o);
  const tr = o.tracking || 0;
  c.letterSpacing = '0px';
  const xs = [0];
  for (let i = 1; i <= str.length; i++) xs.push(c.measureText(str.slice(0, i)).width + tr * i);
  const w = xs[str.length] - tr;
  let x0 = x;
  if ((o.align || 'center') === 'center') x0 = x - w / 2; else if (o.align === 'right') x0 = x - w;
  c.textAlign = 'left';
  const n = str.length;
  for (let i = 0; i < n; i++) {
    const ch = str[i];
    if (ch === ' ') continue;
    const k = fn ? fn(i, n) : {};
    const a = (o.alpha ?? 1) * (k.a ?? 1);
    if (a <= 0.003) continue;
    c.save();
    c.globalAlpha = a;
    const cw = xs[i + 1] - xs[i] - tr;
    const px = x0 + xs[i] + (k.dx || 0), py = y + (k.dy || 0);
    if (k.s !== undefined && k.s !== 1) {
      c.translate(px + cw / 2, py - (o.size || 40) * 0.35);
      c.scale(k.s, k.s);
      c.translate(-(px + cw / 2), -(py - (o.size || 40) * 0.35));
    }
    const b = (o.blur || 0) + (k.blur || 0);
    if (b > 0.2) c.filter = `blur(${b.toFixed(2)}px)`;
    applyShadow(c, o);
    if (o.stroke) { c.lineWidth = o.stroke.width; c.strokeStyle = o.stroke.color; c.lineJoin = 'round'; c.strokeText(ch, px, py); }
    if (!(o.stroke && o.stroke.only)) { applyFill(c, o, px, py); c.fillText(ch, px, py); }
    c.restore();
  }
  c.restore();
  return w;
}

/**
 * Headline reveal: letters rise out of a baseline mask with a stagger.
 * p = seconds since the line starts; out = seconds since exit starts (or <0).
 */
export function riseLine(c, str, x, y, o, p, out = -1, opt = {}) {
  if (p <= 0) return;
  const size = o.size || 40;
  const stagger = opt.stagger ?? 0.028, dur = opt.dur ?? 0.55;
  const exit = out > 0 ? ease.inCubic(sat(out / (opt.outDur ?? 0.22))) : 0;
  if (exit >= 1) return;
  c.save();
  c.beginPath();
  c.rect(0, y - size * 1.08, 1080, size * 1.42);
  c.clip();
  chars(c, str, x, y, { ...o, alpha: (o.alpha ?? 1) * (1 - exit), blur: (o.blur || 0) + exit * 10 }, (i) => {
    const e = ease.outExpo(sat((p - i * stagger) / dur));
    return { dy: (1 - e) * size * 1.05 - exit * size * 0.25, a: sat(e * 1.6), blur: (1 - e) * 6 };
  });
  c.restore();
}

/** Small tracked caps label that fades in while its tracking settles. */
export function label(c, str, x, y, o, p, out = -1, opt = {}) {
  if (p <= 0) return;
  const e = ease.outCubic(sat(p / (opt.dur ?? 0.6)));
  const exit = out > 0 ? ease.inCubic(sat(out / (opt.outDur ?? 0.22))) : 0;
  if (exit >= 1) return;
  const tr = (o.tracking || 0) * lerp(1.7, 1, e);
  text(c, str, x, y, { ...o, tracking: tr, alpha: (o.alpha ?? 1) * e * (1 - exit), blur: (1 - e) * 5 + exit * 8 });
}

/** Thin horizontal rule that grows from its centre, with an optional centre star. */
export function rule(c, x, y, w, p, o = {}) {
  const e = ease.outExpo(sat(p / (o.dur ?? 0.7)));
  if (e <= 0) return;
  const a = (o.alpha ?? 0.8) * sat(e * 2);
  c.save();
  c.globalAlpha = a;
  c.strokeStyle = o.color || CREAM; c.lineWidth = o.width || 2;
  const half = (w / 2) * e;
  const gap = o.star ? 26 : 0;
  c.beginPath();
  c.moveTo(x - half, y); c.lineTo(x - gap, y);
  c.moveTo(x + gap, y); c.lineTo(x + half, y);
  c.stroke();
  if (o.star) { c.fillStyle = o.color || CREAM; star(c, x, y, 11 * sat(e * 1.5), 5); c.fill(); }
  c.restore();
}

export function star(c, x, y, r, n = 5, inner = 0.42, rot = -Math.PI / 2) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / n;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}

export function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

/** Text set along a circle. angle = centre angle (radians, -PI/2 = top). */
export function arcText(c, str, cx, cy, r, angle, o = {}) {
  c.save();
  setFont(c, o);
  c.letterSpacing = '0px';
  const tr = o.tracking || 0;
  const widths = [...str].map((ch) => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tr * (str.length - 1);
  const dir = o.inward ? -1 : 1; // inward = text along the bottom, reading left to right
  let a = angle - dir * (total / 2) / r;
  c.textAlign = 'center';
  c.fillStyle = o.fill || CREAM;
  for (let i = 0; i < str.length; i++) {
    const half = widths[i] / 2;
    a += dir * half / r;
    c.save();
    c.translate(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    c.rotate(a + (dir > 0 ? Math.PI / 2 : -Math.PI / 2));
    if (o.stroke) { c.lineWidth = o.stroke.width; c.strokeStyle = o.stroke.color; c.lineJoin = 'round'; c.strokeText(str[i], 0, 0); }
    c.fillText(str[i], 0, 0);
    c.restore();
    a += dir * (half + tr) / r;
  }
  c.restore();
}

export { sat, lerp, prog, ease };
