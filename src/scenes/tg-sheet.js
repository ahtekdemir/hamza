// Thanksgiving reel, shot 1 — the hook. A sheet of Thanksgiving transfers
// slides onto a warm dark stage, the designs pop on one by one and the
// corner of the film curls up.

import * as THREE from 'three';
import { makeBackdrop, softSprite, makeDust } from '../lib/stage.js';
import { makeFilm, makeLeaves, bleedTexture, smoothGlow, fitSize, capHeight, HEAD, GOLD, CREAMY } from '../lib/autumn.js';
import { buildThanksDesigns, buildSheetArt } from '../lib/thanks-art.js';
import { tint } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, deg } from '../lib/util.js';
import { riseLine, text, roundRect, FONT } from '../lib/overlay.js';

const PX = 1920 / (2 * 17 * Math.tan(deg(15)));      // pixels per world unit at z = 0
export const wx = (px) => (px - 540) / PX, wy = (py) => (960 - py) / PX;

const SW = 3.5, SH = SW * 1800 / 1320;
const POP0 = 0.8, POP_STEP = 0.16;
const OUT = 3.62;

/** Small brand mark shared by the dark shots. */
export function brandMark(c, hat, alpha, color = CREAMY) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha * 0.92;
  const w = 74, h = w * hat.height / hat.width;
  c.drawImage(hat, 96, 236 - h, w, h);
  c.restore();
  text(c, 'COWBOY DTF', 186, 229, { family: FONT.label, weight: 800, size: 22, tracking: 6, align: 'left', fill: color, alpha: alpha * 0.92, shadow: false });
}

export function createTgSheet(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);
  const backdrop = makeBackdrop({ inner: 0x4a2209, outer: 0x060302, center: [0.5, 0.36], radius: 0.95 });
  scene.add(backdrop);

  const designs = ctx.assets.thanks || (ctx.assets.thanks = buildThanksDesigns());
  const { canvas, rects } = buildSheetArt(designs);
  const film = makeFilm({ w: SW, h: SH, art: bleedTexture(canvas, { mip: false }), rects, base: [0.02, 0.018, 0.02], alpha: 1, back: [0.58, 0.56, 0.55], rim: 0.07, gloss: 0.42 });
  film.mesh.renderOrder = 2;
  const rig = new THREE.Group(); scene.add(rig);
  rig.add(film.mesh);

  const glowTex = smoothGlow(256, 1.5);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(SW * 1.75, SH * 1.6), new THREE.MeshBasicMaterial({ map: glowTex, color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false }));
  shadow.position.set(0.12, -0.18, -0.25); shadow.renderOrder = 0; rig.add(shadow);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(SW * 2.6, SH * 2.0), new THREE.MeshBasicMaterial({ map: glowTex, color: new THREE.Color(0.5, 0.2, 0.05), transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  under.position.z = -0.6; under.renderOrder = -1; rig.add(under);

  const leaves = makeLeaves({ count: 26, seed: 4, area: [5.4, 9.4], zr: [-3, 8.5], size: [0.42, 0.85], fall: 0.6, tintDark: 0.95, keepOut: 2.2, keepOutTop: wy(800), avoid: [wx(70), wx(1010), wy(800), wy(270)] });
  scene.add(leaves.group);
  const dust = makeDust({ count: 150, box: [9, 14, 12], seed: 9, size: 0.04, color: 0xffc98a, intensity: 0.8, focus: 17, blur: 0.02, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 5; scene.add(dust);

  const hat = tint(ctx.assets.images.hat, CREAMY, 0.25);
  const corner = SW / 2 * 0.75 + SH / 2 * 0.66;
  film.u.cdir.value.set(0.75, -0.66).normalize();
  film.u.crad.value = 0.3;

  function update(t) {
    backdrop.material.uniforms.time.value = t;
    dust.material.uniforms.time.value = t + 3;
    leaves.update(t + 2.2);

    const inn = ease.outExpo(prog(t, 0.1, 1.1));
    const out = ease.inCubic(prog(t, OUT, 4.0));
    const drift = prog(t, 0, 4);
    rig.position.set(wx(560) + lerp(0.5, 0, inn), wy(1330) - (1 - inn) * 7.5 + out * 9.5, out * 5);
    rig.rotation.set(deg(lerp(-58, -15, inn) - drift * 3 + out * 30), deg(lerp(-18, 4, inn) - drift * 5), deg(lerp(16, -6.5, inn) + drift * 1.5));

    for (let i = 0; i < 6; i++) {
      const t0 = POP0 + i * POP_STEP, p = (t - t0) / 0.42;
      film.u.pops.value[i].set(p <= 0 ? 0 : lerp(0.55, 1, ease.outBack(sat(p), 2.4)), sat(p * 3.2), t > t0 ? Math.exp(-(t - t0) * 7.5) : 0);
    }
    const curl = ease.outCubic(prog(t, 1.75, 2.7)) * 0.78 + Math.sin(t * 1.7) * 0.035 * smooth(prog(t, 2.4, 3.0)) + out * 1.2;
    film.u.coff.value = corner - curl;
    film.u.sheenPos.value = lerp(-0.95, 0.95, ease.inOutSine(prog(t, 2.15, 3.25)));
    film.u.sheenAmt.value = 0.2;
    under.material.opacity = 0.5 * inn * (1 - out);
    shadow.material.opacity = 0.85 * inn * (1 - out);

    camera.position.set(lerp(0.25, -0.2, drift), lerp(-0.15, 0.1, drift), 17 - drift * 0.55);
    camera.lookAt(0, 0, 0);
  }

  function drawOverlay(c, t) {
    const out = t - OUT;
    brandMark(c, hat, smooth(prog(t, 0.0, 0.4)) * (1 - smooth(prog(t, OUT, OUT + 0.25))));
    const X = 96, BW = 884;
    const s1 = fitSize(c, 'THANKSGIVING', BW, 152);
    const s3 = fitSize(c, 'READY TO PRESS.', BW, s1);
    const cap = capHeight(c, s1), cap3 = capHeight(c, s3), gap = 34;
    const y1 = 292 + cap, y2 = y1 + gap + cap, y3 = y2 + gap + cap3;
    const o = { ...HEAD, size: s1, align: 'left', fill: CREAMY, shadow: { color: 'rgba(0,0,0,0.5)', blur: 30, y: 8 } };
    riseLine(c, 'THANKSGIVING', X, y1, o, t + 0.12, out, { stagger: 0.02 });
    riseLine(c, 'DESIGNS,', X, y2, o, t - 0.14, out - 0.03, { stagger: 0.026 });
    riseLine(c, 'READY TO PRESS.', X, y3, { ...o, size: s3, gradient: ['#ffe08a', GOLD, '#ef9a1c'], fill: undefined }, t - 0.36, out - 0.06, { stagger: 0.022 });
    // chip
    const p = t - 1.05;
    if (p > 0) {
      const e = ease.outExpo(sat(p / 0.6)), ex = out > 0.08 ? ease.inCubic(sat((out - 0.08) / 0.22)) : 0;
      const label = 'DTF TRANSFERS   ·   NO MINIMUMS';
      const lo = { family: FONT.label, weight: 800, size: 27, tracking: 5, align: 'left', fill: '#1a0f08', shadow: false };
      c.save();
      c.font = `800 27px "${FONT.label}"`; c.letterSpacing = '5px';
      const tw = c.measureText(label).width - 5;
      const cy = y3 + 40, ch = 62, cw = tw + 52;
      c.globalAlpha = 1 - ex;
      c.beginPath(); c.rect(X, cy, cw * e, ch); c.clip();
      c.fillStyle = CREAMY; roundRect(c, X, cy, cw, ch, 6); c.fill();
      c.restore();
      text(c, label, X + 26, cy + 41, { ...lo, alpha: sat((p - 0.18) / 0.3) * (1 - ex) });
    }
  }

  function post(t) {
    return {
      fade: lerp(0.45, 1, smooth(prog(t, 0.0, 0.25))),
      flash: ease.inCubic(prog(t, 3.8, 4.0)) * 0.55,
      flashColor: [1.0, 0.8, 0.55],
      zoomBlur: ease.inCubic(prog(t, OUT, 4.0)) * 0.22,
      bloom: 0.3, bloomThreshold: 0.98, streak: 0.16, exposure: 1.0, vignette: 0.95, saturation: 1.1, tint: 0.2, ca: 0.4,
    };
  }

  return { name: 'tg-sheet', scene, camera, update, drawOverlay, post, samples: 6 };
}
