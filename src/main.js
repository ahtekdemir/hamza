// Entry point. Builds every scene once, then renders any frame on demand:
//   window.__reel.renderFrame(frameIndex, samples)
// Rendering is deterministic, so frames can be produced in any order.

import * as THREE from 'three';
import { Pipeline, POST_DEFAULTS } from './lib/pipeline.js';
import { Overlay } from './lib/overlay.js';
import { loadAssets, debugSheet } from './lib/assets.js';
import { makeStudioEnv } from './lib/stage.js';
import { halton } from './lib/util.js';
import { buildTimeline, reelDuration, FPS } from './timeline.js';
import { debugThanks } from './lib/thanks-art.js';

const params = new URLSearchParams(location.search);
const scale = parseFloat(params.get('scale') || '1');
const REEL = params.get('reel') || 'main';
const DURATION = reelDuration(REEL);
const W = Math.round(1080 * scale), H = Math.round(1920 * scale);
const SHUTTER = 0.5; // 180 degree shutter

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement);

const pipeline = new Pipeline(renderer, W, H);
const overlay = new Overlay(scale);
const overlayTex = new THREE.CanvasTexture(overlay.canvas);
overlayTex.colorSpace = THREE.SRGBColorSpace;
overlayTex.generateMipmaps = false;
overlayTex.minFilter = THREE.LinearFilter;

let timeline = null;
let assets = null;

function sceneAt(t) {
  for (const s of timeline) if (t >= s.start && t < s.end) return s;
  return timeline[timeline.length - 1];
}

function renderAt(frameTime, samples) {
  const sc0 = sceneAt(frameTime);
  const K = samples > 0 ? samples : (sc0.samples || 6);
  pipeline.begin();
  let post = null;
  for (let s = 0; s < K; s++) {
    const t = frameTime + (SHUTTER * (s + 0.5) / K) / FPS;
    const sc = sceneAt(Math.min(t, DURATION - 1e-4));
    const local = t - sc.start;
    sc.update(local, t);
    // sub-pixel jitter for anti-aliasing
    const jx = halton(s + 1, 2) - 0.5, jy = halton(s + 1, 3) - 0.5;
    sc.camera.setViewOffset(W, H, K > 1 ? jx : 0, K > 1 ? jy : 0, W, H);
    sc.camera.updateProjectionMatrix();
    let tex = null;
    if (sc.drawOverlay) {
      const c = overlay.begin();
      sc.drawOverlay(c, local, t);
      overlayTex.needsUpdate = true;
      tex = overlayTex;
    }
    const p = { ...POST_DEFAULTS, ...(sc.post ? sc.post(local, t) : {}) };
    if (s === Math.floor(K / 2)) post = p;
    pipeline.addSample(sc.scene, sc.camera, tex, 1 / K, p.overlayGain);
  }
  pipeline.finish(post, frameTime);
}

window.__reel = {
  fps: FPS,
  duration: DURATION,
  frames: Math.round(FPS * DURATION),
  isReady: false,
  renderFrame(frame, samples = 0) { renderAt(frame / FPS, samples); return true; },
  renderTime(t, samples = 0) { renderAt(Math.round(t * FPS) / FPS, samples); return true; },
  debugDesigns(which) { return which ? debugThanks(assets.images, which) : debugSheet(assets); },
};

(async () => {
  assets = await loadAssets();
  const env = makeStudioEnv(renderer);
  const ctx = { THREE, renderer, assets, env, W: 1080, H: 1920, aspect: 1080 / 1920, pixelH: H };
  timeline = buildTimeline(ctx, REEL);
  // warm up: compile every scene's shaders once
  for (const s of timeline) { s.update(0.01, s.start + 0.01); renderer.compile(s.scene, s.camera); }
  window.__reel.isReady = true;
  console.log('[reel] ready', W, H);
})().catch((e) => { console.error('[reel] init failed', e && e.stack || e); });
