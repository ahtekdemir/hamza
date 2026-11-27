// Artwork for the Black Friday reel: the "30% OFF" transfer printed on the
// shirt, confetti sprites, 3D gold lettering and the coupon ticket.

import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { star, roundRect } from './overlay.js';
import { mulberry32 } from './util.js';
import { GOLD } from './bf-themes.js';

export const BF = {
  gold: '#F6B12E', goldLight: '#FFE08A', goldDeep: '#B9761A', red: '#D7262E', wine: '#7A0F1A',
  cream: '#FFF3DC', ink: '#0B0A0C', navy: '#203869', ox: '#762c2b',
};
export const CODE = 'COWBOY30';

function make(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.lineJoin = 'round'; c.lineCap = 'round';
  draw(c, w, h);
  return cv;
}

/** Draw `str` in Anton, centred at x, fitted to `width`, with a stacked block shadow. */
function blockText(c, str, x, y, width, maxSize, depth, faceStops, shadeA, shadeB, tracking = 0) {
  let size = maxSize;
  c.font = `400 ${size}px "Anton"`; c.letterSpacing = `${tracking}px`;
  size = Math.min(maxSize, maxSize * width / (c.measureText(str).width - tracking));
  c.font = `400 ${size}px "Anton"`;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const xx = x + tracking / 2;
  for (let i = depth; i >= 1; i--) { c.fillStyle = i > depth / 2 ? shadeB : shadeA; c.fillText(str, xx + i * 0.9, y + i); }
  const g = c.createLinearGradient(0, y - size * 0.75, 0, y);
  faceStops.forEach((col, i) => g.addColorStop(i / (faceStops.length - 1), col));
  c.fillStyle = g; c.fillText(str, xx, y);
  c.letterSpacing = '0px';
  return size;
}

/** The transfer on the shirt: "BLACK FRIDAY" ribbon, a huge "30%" and "OFF". */
export function buildOfferDesign(T = GOLD) {
  const O = T.offer, up = O.sub ? 46 : 0;
  return make(1000, 1000, (c, S) => {
    const cx = S / 2;
    // ribbon
    const by = 120 - up, bh = 118, bw = 800;
    c.fillStyle = O.ribbonDark;
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(cx + sx * bw * 0.44, by + 22); c.lineTo(cx + sx * bw * 0.56, by + 22); c.lineTo(cx + sx * bw * 0.52, by + bh / 2 + 22);
      c.lineTo(cx + sx * bw * 0.56, by + bh + 22); c.lineTo(cx + sx * bw * 0.44, by + bh + 22); c.closePath(); c.fill();
    }
    c.fillStyle = O.ribbon; roundRect(c, cx - bw / 2, by, bw, bh, 8); c.fill();
    c.font = '400 86px "Anton"'; c.letterSpacing = '14px'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = O.ribbonText; c.fillText('BLACK FRIDAY', cx + 7, by + bh / 2 + 4);
    c.letterSpacing = '0px';
    // 30% and OFF
    blockText(c, '30%', cx, 640 - up, 820, 560, 22, O.big, O.bigShade[0], O.bigShade[1]);
    blockText(c, 'OFF', cx, 905 - up * 1.6, 600, O.sub ? 250 : 290, 16, O.off, O.offShade[0], O.offShade[1], 30);
    if (O.sub) {
      c.font = '400 64px "Anton"'; c.letterSpacing = '10px'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillStyle = O.ribbonDark; c.fillText(O.sub, cx + 5 + 3, 975 + 3);
      c.fillStyle = O.off[1]; c.fillText(O.sub, cx + 5, 975);
      c.letterSpacing = '0px';
    }
    // stars
    c.fillStyle = O.star;
    for (const [x, y, r] of [[80, 470 - up, 26], [920, 470 - up, 26], [120, 820 - up, 18], [880, 820 - up, 18]]) { star(c, x, y, r); c.fill(); }
  });
}

/** Confetti: gold, cream and red rectangles, curls and stars (256 px sprites). */
export function buildConfettiSprites(T = GOLD) {
  const cols = T.confetti;
  const out = [];
  cols.forEach(([l, m, d], i) => {
    const grad = (c) => { const g = c.createLinearGradient(60, 60, 196, 196); g.addColorStop(0, l); g.addColorStop(0.5, m); g.addColorStop(1, d); return g; };
    out.push(make(256, 256, (c) => { c.fillStyle = grad(c); roundRect(c, 92, 40, 72, 176, 6); c.fill(); }));
    out.push(make(256, 256, (c) => { c.strokeStyle = grad(c); c.lineWidth = 30; c.beginPath(); c.moveTo(40, 150); c.bezierCurveTo(90, 40, 150, 230, 216, 110); c.stroke(); }));
    if (i !== 2) out.push(make(256, 256, (c) => { c.fillStyle = grad(c); star(c, 128, 132, 100); c.fill(); }));
  });
  return out;
}

/**
 * Centred, bevelled 3D text from the Anton typeface. `width` = final width in
 * world units. Returns { mesh, w, h } (mesh centred on its bounding box).
 */
export function goldText(typeface, str, width, mats, { depth = 0.26, bevel = 0.028 } = {}) {
  const font = new Font(typeface);
  const geo = new TextGeometry(str, { font, size: 1, depth, curveSegments: 12, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 4 });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const s = width / (bb.max.x - bb.min.x);
  geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
  geo.scale(s, s, s);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mats);
  return { mesh, w: width, h: (bb.max.y - bb.min.y) * s };
}

export function goldMaterials(T = GOLD) {
  const face = new THREE.MeshPhysicalMaterial({ ...T.metalFace });
  const side = new THREE.MeshPhysicalMaterial({ ...T.metalSide });
  return [face, side];
}

/** Ink-stamp grain mask, so the stamp on the coupon looks printed. */
export function stampMask(w, h, seed = 3) {
  const rnd = mulberry32(seed);
  return make(w, h, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 900; i++) {
      c.globalAlpha = 0.25 + rnd() * 0.6;
      c.beginPath(); c.arc(rnd() * w, rnd() * h, 1 + rnd() * 3.5, 0, Math.PI * 2); c.fill();
    }
  });
}
