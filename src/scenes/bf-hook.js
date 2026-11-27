// Black Friday reel, shot 1 — the hook. A gold 3D "30%" spins in out of the
// dark and slams into place, "OFF" lands under it, "BLACK FRIDAY" rises on
// top and gold confetti starts to fall.

import * as THREE from 'three';
import { makeBackdrop, makeDust } from '../lib/stage.js';
import { makeLeaves, smoothGlow, fitSize, capHeight, HEAD, CREAMY } from '../lib/autumn.js';
import { buildConfettiSprites, goldText, goldMaterials, BF } from '../lib/bf-art.js';
import { tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, deg, pulse } from '../lib/util.js';
import { riseLine, text, rule, roundRect, FONT } from '../lib/overlay.js';
import { wx, wy, brandMark } from './tg-sheet.js';
import { GOLD } from '../lib/bf-themes.js';

export const LAND = 0.5, OFF_LAND = 0.78;
const OUT = 3.2;

export function createBfHook(ctx, T = GOLD) {
  const scene = new THREE.Scene();
  scene.environment = ctx.env; scene.environmentIntensity = 1.0;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: T.hookBg, outer: 0x030203, center: [0.5, 0.45], radius: 0.9 });
  scene.add(backdrop);
  const glowTex = smoothGlow(256, 1.5);

  const mats = goldMaterials(T);
  const big = goldText(ctx.assets.typeface, '30%', 3.4, mats, { depth: 0.3 });
  const off = goldText(ctx.assets.typeface, 'OFF', 1.75, mats, { depth: 0.22 });
  const BIG_Y = wy(830), OFF_Y = wy(1118);
  const bigG = new THREE.Group(); bigG.add(big.mesh); scene.add(bigG);
  const offG = new THREE.Group(); offG.add(off.mesh); scene.add(offG);

  const key = new THREE.DirectionalLight(T.key[0], T.key[1]); key.position.set(-3, 5, 8); scene.add(key);
  const sweep = new THREE.PointLight(T.sweep[0], 0, 0, 2); scene.add(sweep);
  const rim = new THREE.PointLight(T.rim[0], T.rim[1], 0, 2); rim.position.set(3.5, -1, -1.5); scene.add(rim);
  const fill = new THREE.DirectionalLight(T.fill[0], T.fill[1]); fill.position.set(2, -4, 7); scene.add(fill);

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(...T.halo), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(0, wy(1000), -2.5); halo.renderOrder = -10; scene.add(halo);
  // shockwave ring when "30%" lands
  const ringCv = document.createElement('canvas'); ringCv.width = ringCv.height = 512;
  { const c = ringCv.getContext('2d'); const g = c.createRadialGradient(256, 256, 180, 256, 256, 250); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 512, 512); }
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ringCv), color: new THREE.Color(...T.ring), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.position.set(0, BIG_Y, -0.4); ring.renderOrder = -5; scene.add(ring);

  const confetti = makeLeaves({ count: 46, seed: 7, area: [5.6, 9.6], zr: [-3, 8.5], size: [0.16, 0.36], fall: 0.95, sprites: buildConfettiSprites(T), avoid: [wx(70), wx(1010), wy(470), wy(270)] });
  scene.add(confetti.group);
  const dust = makeDust({ count: 160, box: [9, 14, 12], seed: 3, size: 0.04, color: T.dust, intensity: 0.9, focus: 17, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 5; scene.add(dust);
  const hat = tint(ctx.assets.images.hat, T.headline, 0.25);

  function update(t) {
    backdrop.material.uniforms.time.value = t;
    dust.material.uniforms.time.value = t + 2;
    // confetti bursts in when "30%" lands
    const burst = smooth(prog(t, LAND - 0.1, LAND + 0.5));
    confetti.update(t + 3.0);
    for (const it of confetti.items) it.mesh.visible = burst > 0.01;
    confetti.group.scale.setScalar(lerp(0.4, 1, burst));

    // 30%: spins in from deep space and slams down
    const a = prog(t, 0.0, LAND), e = ease.inQuad(a);
    const settle = t > LAND ? Math.exp(-(t - LAND) * 7) * Math.cos((t - LAND) * 30) : 0;
    const out = ease.inCubic(prog(t, OUT, 3.5));
    bigG.position.set(0, lerp(BIG_Y + 1.2, BIG_Y, e) + settle * 0.06, lerp(-60, 0, e) + out * 12);
    bigG.rotation.set(deg(lerp(-25, 0, e)), deg(lerp(-300, 0, ease.outCubic(a))) + Math.sin(t * 1.1) * deg(10) * smooth(prog(t, LAND, LAND + 0.8)), deg(lerp(18, 0, e)) - settle * 0.04);
    bigG.visible = t >= 0.02;
    // OFF drops from above
    const b = prog(t, OFF_LAND - 0.28, OFF_LAND), eb = ease.inCubic(b);
    const sb = t > OFF_LAND ? Math.exp(-(t - OFF_LAND) * 8) * Math.cos((t - OFF_LAND) * 34) : 0;
    offG.position.set(0, lerp(OFF_Y + 5, OFF_Y, eb) - sb * 0.05, out * 12);
    offG.rotation.set(deg(lerp(40, -10, eb)), Math.sin(t * 1.1 + 0.6) * deg(8) * smooth(prog(t, OFF_LAND, OFF_LAND + 0.8)), 0);
    offG.visible = t > OFF_LAND - 0.28;

    // light sweep across the metal
    const sw = prog(t, 0.9, 2.6);
    sweep.position.set(lerp(-5, 5, ease.inOutSine(sw)), wy(1000) + 1.5, 4.5);
    sweep.intensity = Math.sin(Math.PI * sw) * T.sweep[1];
    halo.material.opacity = smooth(prog(t, LAND - 0.1, LAND + 0.3)) * 0.32 * (1 - out);
    const r = prog(t, LAND, LAND + 0.6);
    ring.scale.setScalar(lerp(2, 11, ease.outCubic(r)));
    ring.material.opacity = r > 0 && r < 1 ? (1 - r) * 0.28 : 0;

    const shake = t > LAND ? Math.exp(-(t - LAND) * 9) : 0;
    camera.position.set(Math.sin(t * 61) * 0.05 * shake, Math.cos(t * 53) * 0.05 * shake, 17 - prog(t, 0, 3.5) * 0.3);
    camera.lookAt(0, 0, 0);
  }

  function drawOverlay(c, t) {
    const out = t - OUT;
    brandMark(c, hat, smooth(prog(t, 0.0, 0.3)) * (1 - smooth(prog(t, OUT, OUT + 0.2))), T.headline);
    const s = fitSize(c, 'BLACK FRIDAY', 888, 190), cap = capHeight(c, s);
    const y1 = 300 + cap;
    riseLine(c, 'BLACK FRIDAY', 540, y1, { ...HEAD, size: s, fill: T.headline, shadow: { color: 'rgba(0,0,0,0.6)', blur: 30, y: 8 } }, t - 0.05, out, { stagger: 0.03, dur: 0.45 });
    // "SPECIAL" chip
    const p = t - 0.95;
    if (p > 0) {
      const e = ease.outExpo(sat(p / 0.5)), ex = out > 0.05 ? ease.inCubic(sat((out - 0.05) / 0.2)) : 0;
      const lbl = T.chipLabel;
      c.save();
      c.font = `800 30px "${FONT.label}"`; c.letterSpacing = '6px';
      const tw = c.measureText(lbl).width - 6, cw = tw + 60, ch = 66, cy = y1 + 36;
      c.globalAlpha = 1 - ex;
      c.beginPath(); c.rect(540 - cw / 2 * e, cy, cw * e, ch); c.clip();
      c.fillStyle = T.chip; roundRect(c, 540 - cw / 2, cy, cw, ch, 6); c.fill();
      c.restore();
      text(c, lbl, 540, cy + 45, { family: FONT.label, weight: 800, size: 30, tracking: 6, fill: T.chipText, alpha: sat((p - 0.15) / 0.3) * (1 - ex), shadow: false });
    }
  }

  function post(t) {
    return {
      fade: smooth(prog(t, 0, 0.12)),
      flash: pulse(t, LAND + 0.02, 0.04) * 0.28 + pulse(t, OFF_LAND + 0.02, 0.04) * 0.12 + ease.inCubic(prog(t, 3.3, 3.5)) * 0.55,
      flashColor: T.flash,
      zoomBlur: pulse(t, LAND, 0.06) * 0.12 + ease.inCubic(prog(t, OUT, 3.5)) * 0.25,
      bloom: 0.45, bloomThreshold: 0.95, streak: 0.22, exposure: 1.05, vignette: 1.0, saturation: 1.12, tint: 0.15, ca: 0.5,
    };
  }

  return { name: 'bf-hook', scene, camera, update, drawOverlay, post, samples: 6 };
}
