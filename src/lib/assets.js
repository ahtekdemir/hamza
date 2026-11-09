// Loads fonts and brand images, and builds the textures shared by scenes.

import * as THREE from 'three';
import { buildDesigns, LAYOUT, SHEET } from './designs.js';

const FONTS = [
  '400 100px "Sancreek"', '400 100px "Rye"', '400 100px "Anton"',
  '500 100px "Montserrat"', '600 100px "Montserrat"', '700 100px "Montserrat"', '800 100px "Montserrat"',
  'italic 500 100px "Playfair Display"', 'italic 700 100px "Playfair Display"',
];

const loadImage = (src) => new Promise((ok, fail) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = () => fail(new Error('image failed: ' + src));
  im.src = src;
});

export function canvasTexture(canvas, { mip = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mip;
  t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

/** Recolour an image using only its alpha channel. */
export function tint(img, color, scale = 1) {
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
  const c = cv.getContext('2d');
  c.imageSmoothingQuality = 'high';
  c.drawImage(img, 0, 0, cv.width, cv.height);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color; c.fillRect(0, 0, cv.width, cv.height);
  return cv;
}

export async function loadAssets() {
  await Promise.all(FONTS.map((f) => document.fonts.load(f, 'AaBb0123–·★')));
  await document.fonts.ready;
  const [hat, wordmark, logoFull] = await Promise.all([
    loadImage('/assets/brand/hat.png'), loadImage('/assets/brand/wordmark.png'), loadImage('/assets/brand/logo-full.png'),
  ]);
  const images = { hat, wordmark, logoFull };
  const designs = buildDesigns(images);
  return { images, designs, LAYOUT, SHEET };
}

/** Debug: the gang sheet as a flat image (used to review the artwork). */
export function debugSheet(assets) {
  const s = 44;
  const cv = document.createElement('canvas');
  cv.width = SHEET.w * s; cv.height = SHEET.h * s;
  const c = cv.getContext('2d');
  c.fillStyle = '#0b0d14'; c.fillRect(0, 0, cv.width, cv.height);
  for (const it of LAYOUT) {
    c.drawImage(assets.designs[it.id], it.x * s, it.y * s, it.w * s, it.h * s);
    c.strokeStyle = 'rgba(255,255,255,0.12)'; c.strokeRect(it.x * s, it.y * s, it.w * s, it.h * s);
  }
  return cv.toDataURL('image/png');
}
