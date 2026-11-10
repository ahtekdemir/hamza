#!/usr/bin/env node
// Renders the reel frame by frame in headless Chromium (WebGL via SwiftShader)
// and encodes it with ffmpeg.
//
//   node scripts/render.mjs                         full 1080x1920 render -> output/
//   node scripts/render.mjs --scale 0.5 --samples 2 fast preview
//   node scripts/render.mjs --still 1.2,4.5 --scale 0.5   contact sheet of single frames
//   node scripts/render.mjs --from 180 --to 300     re-render a frame range only
//   node scripts/render.mjs --encode-only           re-encode existing frames
//
// Options: --reel <main|uv> --scale <f> --samples <n> --from <frame> --to <frame> --workers <n>
//          --frames <dir> --out <file> --crf <n> --audio <wav> --no-encode

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadPlaywright() {
  try { return require('playwright'); } catch { /* fall through */ }
  try { return require(path.join(ROOT, 'node_modules', 'playwright')); } catch { /* fall through */ }
  console.error('Playwright is required: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

const scale = parseFloat(opt('scale', '1'));
const reel = opt('reel', 'main'); // main | uv
const samples = parseInt(opt('samples', '0'), 10); // 0 = per-scene default
const workers = parseInt(opt('workers', '2'), 10);
const framesDir = path.resolve(opt('frames', path.join(ROOT, reel === 'main' ? '.frames' : `.frames-${reel}`)));
const outFile = path.resolve(opt('out', path.join(ROOT, 'output', reel === 'main' ? 'cowboydtf-reel.mp4' : 'cowboydtf-dtf-vs-uv.mp4')));
const crf = opt('crf', '14');
const audio = opt('audio', null);
const still = opt('still', null);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.svg': 'image/svg+xml' };

function serve() {
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(ROOT, u === '/' ? 'src/index.html' : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, d) => {
      if (e) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(d);
    });
  });
  return new Promise((ok) => srv.listen(0, '127.0.0.1', () => ok(srv)));
}

async function openPage(chromium, port) {
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--disable-gpu-vsync', '--hide-scrollbars'],
  });
  const W = Math.round(1080 * scale), H = Math.round(1920 * scale);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || t.startsWith('[reel]')) console.log('[page]', t); });
  await page.goto(`http://127.0.0.1:${port}/src/index.html?scale=${scale}&reel=${reel}`);
  await page.waitForFunction('window.__reel && window.__reel.isReady === true', null, { timeout: 180000 });
  return { browser, page };
}

function encode(info) {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const a = ['-y', '-framerate', String(info.fps), '-i', path.join(framesDir, 'f_%05d.png')];
  if (audio) a.push('-i', audio);
  a.push('-c:v', 'libx264', '-preset', 'slow', '-crf', crf, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart');
  if (audio) a.push('-c:a', 'aac', '-b:a', '256k', '-shortest');
  a.push(outFile);
  const r = spawnSync('ffmpeg', a, { stdio: ['ignore', 'ignore', 'pipe'] });
  if (r.status !== 0) { console.error(r.stderr.toString().slice(-2000)); process.exit(1); }
  console.log('encoded', outFile);
}

const { chromium } = loadPlaywright();
const srv = await serve();
const port = srv.address().port;

try {
  if (flag('encode-only')) {
    encode({ fps: 30 });
  } else if (opt('designs', null)) {
    const { browser, page } = await openPage(chromium, port);
    const url = await page.evaluate(() => window.__reel.debugDesigns());
    fs.writeFileSync(path.resolve(opt('designs')), Buffer.from(url.split(',')[1], 'base64'));
    await browser.close();
  } else if (still) {
    const times = still.split(',').map(Number);
    const dir = path.resolve(opt('out', path.join(ROOT, '.stills')));
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await openPage(chromium, port);
    for (const t of times) {
      const t0 = Date.now();
      await page.evaluate(([tt, s]) => window.__reel.renderTime(tt, s), [t, samples]);
      const f = path.join(dir, `t_${t.toFixed(3).padStart(7, '0')}.png`);
      await page.screenshot({ path: f, type: 'png' });
      console.log(f, `${Date.now() - t0}ms`);
    }
    await browser.close();
  } else {
    fs.mkdirSync(framesDir, { recursive: true });
    const first = await openPage(chromium, port);
    const info = await first.page.evaluate(() => ({ fps: window.__reel.fps, frames: window.__reel.frames }));
    const from = parseInt(opt('from', '0'), 10);
    const to = parseInt(opt('to', String(info.frames)), 10); // exclusive
    const queue = []; for (let f = from; f < to; f++) queue.push(f);
    const total = queue.length; let done = 0; const t0 = Date.now();
    const run = async ({ browser, page }) => {
      for (;;) {
        const f = queue.shift();
        if (f === undefined) break;
        await page.evaluate(([ff, s]) => window.__reel.renderFrame(ff, s), [f, samples]);
        await page.screenshot({ path: path.join(framesDir, `f_${String(f).padStart(5, '0')}.png`), type: 'png' });
        done++;
        if (done % 20 === 0 || done === total) {
          const el = (Date.now() - t0) / 1000;
          console.log(`${done}/${total} frames  ${(el / done).toFixed(2)}s/frame  eta ${Math.round((total - done) * el / done)}s`);
        }
      }
      await browser.close();
    };
    const pool = [run(first)];
    for (let i = 1; i < workers; i++) pool.push(openPage(chromium, port).then(run));
    await Promise.all(pool);
    if (!flag('no-encode')) encode(info);
  }
} finally {
  srv.close();
}
