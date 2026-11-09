// Scene 4 — the peel. The film lifts off in one clean motion and the print
// is revealed on the shirt.

import * as THREE from 'three';
import { makeDust, softSprite, fabricNormalMap } from '../lib/stage.js';
import { canvasTexture } from '../lib/assets.js';
import { ease, prog, lerp, sat, smooth, pulse } from '../lib/util.js';
import { riseLine, FONT } from '../lib/overlay.js';

const FILM = 4.5, PRINT = 3.7, SEG = 90, R = 0.42;

export function createPeel(ctx) {
  const scene = new THREE.Scene();
  scene.environment = ctx.env; scene.environmentIntensity = 0.55;
  scene.background = new THREE.Color(0x010204);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 200);

  const nm = fabricNormalMap(); nm.repeat.set(46, 46);
  const cloth = new THREE.MeshPhysicalMaterial({ color: 0x34363f, roughness: 0.88, metalness: 0, sheen: 1, sheenColor: new THREE.Color(0x3a3f4a), sheenRoughness: 0.55, normalMap: nm, normalScale: new THREE.Vector2(1.3, 1.3), envMapIntensity: 1.0 });
  // shirt with soft, broad wrinkles
  const sg = new THREE.PlaneGeometry(26, 26, 120, 120);
  const sp = sg.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i);
    const far = smooth((Math.hypot(x, y) - 2.9) / 4.0);
    sp.setZ(i, far * (Math.sin(x * 0.9 + y * 0.35) * 0.16 + Math.sin(y * 1.3 - x * 0.5 + 1.7) * 0.11) - far * 0.05);
  }
  sg.computeVertexNormals();
  const shirt = new THREE.Mesh(sg, cloth); scene.add(shirt);

  const tex = canvasTexture(ctx.assets.designs.sunset);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(PRINT, PRINT), new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.5, metalness: 0.0, transparent: true, depthWrite: false, envMapIntensity: 0.6 }));
  print.position.z = 0.012; print.renderOrder = 2; scene.add(print);

  // film
  const fg = new THREE.PlaneGeometry(FILM, FILM, SEG, SEG);
  const rest = fg.attributes.position.array.slice();
  const filmMat = new THREE.MeshPhysicalMaterial({ color: 0xe6edf8, roughness: 0.26, metalness: 0.0, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.15 });
  const film = new THREE.Mesh(fg, filmMat); film.renderOrder = 4; scene.add(film);
  // contact shadow under the lifted film
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(FILM * 1.6, 1.6), new THREE.MeshBasicMaterial({ map: softSprite(128, 1.4), color: 0x000000, transparent: true, opacity: 0, depthWrite: false }));
  shadow.renderOrder = 3; shadow.rotation.z = Math.PI / 4; scene.add(shadow);

  const dx = -Math.SQRT1_2, dy = Math.SQRT1_2;      // peel direction: bottom-right -> top-left
  const cx0 = FILM / 2, cy0 = -FILM / 2;            // start corner
  const DIAG = FILM * Math.SQRT2;

  function deform(front) {
    const p = fg.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = rest[i * 3], y = rest[i * 3 + 1];
      const s = (x - cx0) * dx + (y - cy0) * dy;   // distance along the peel direction
      const u = front - s;
      if (u <= 0) { p.setXYZ(i, x, y, 0.03); continue; }
      let along, z;
      if (u < Math.PI * R) { along = front - R * Math.sin(u / R); z = R * (1 - Math.cos(u / R)); }
      else { const e = u - Math.PI * R; along = front + e * 0.9; z = 2 * R + e * 0.42; }
      const shift = along - s;
      p.setXYZ(i, x + dx * shift, y + dy * shift, z + 0.03);
    }
    p.needsUpdate = true;
    fg.computeVertexNormals();
  }

  const key = new THREE.DirectionalLight(0xffe6c8, 3.2); key.position.set(-7, 6, 5); scene.add(key);
  const rimB = new THREE.PointLight(0x4d7dff, 120, 0, 2); rimB.position.set(7, 5, 3); scene.add(rimB);
  const rimR = new THREE.PointLight(0xe2473c, 60, 0, 2); rimR.position.set(-7, -5, 2.5); scene.add(rimR);
  const sweepL = new THREE.PointLight(0xfff0d8, 0, 0, 2); scene.add(sweepL);
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 12), new THREE.MeshBasicMaterial({ map: softSprite(128, 2.2), color: new THREE.Color(1.0, 0.93, 0.8), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  sweep.rotation.z = -0.5; sweep.position.z = 0.05; sweep.renderOrder = 6; scene.add(sweep);

  const dust = makeDust({ count: 150, box: [12, 16, 8], seed: 41, size: 0.04, intensity: 0.7, focus: 15, blur: 0.03, fov: 30, pixelH: ctx.pixelH });
  dust.position.z = 6; scene.add(dust);

  function update(t) {
    dust.material.uniforms.time.value = t + 30;
    const pe = ease.inOutCubic(prog(t, 0.2, 1.75));
    const front = pe * (DIAG + 2.4);
    deform(front);
    filmMat.opacity = 0.36 * (1 - smooth(prog(t, 1.6, 1.95)));
    film.visible = filmMat.opacity > 0.003;
    // the film drifts up and away once free
    const away = ease.inQuad(prog(t, 1.45, 2.0));
    film.position.set(dx * away * 3, dy * away * 3, away * 2.5);
    const fx = cx0 + dx * front, fy = cy0 + dy * front;
    shadow.position.set(fx, fy, 0.02);
    shadow.material.opacity = 0.55 * smooth(prog(t, 0.25, 0.5)) * (1 - smooth(prog(t, 1.4, 1.75)));
    print.material.emissiveIntensity = lerp(0.3, 0.6, smooth(prog(t, 1.2, 2.0)));

    const sw = prog(t, 1.75, 2.6);
    const sx = lerp(-4.5, 4.5, ease.inOutSine(sw));
    sweep.position.x = sx; sweep.position.y = 0;
    sweep.material.opacity = Math.sin(Math.PI * sw) * 0.34;
    sweepL.position.set(sx, 0.5, 1.6);
    sweepL.intensity = Math.sin(Math.PI * sw) * 9;

    // camera: starts tight on the lifting corner, pulls back to the full print
    const pull = ease.inOutCubic(prog(t, 0.0, 2.0));
    const drift = prog(t, 0, 3);
    camera.position.set(lerp(2.6, 0.5, pull) - drift * 0.3, lerp(-5.6, -4.6, pull), lerp(8.2, 13.8, pull) - drift * 0.5);
    camera.lookAt(lerp(1.0, 0.0, pull), lerp(-1.0, 0.95, pull), 0);
    camera.rotation.z += lerp(-0.1, 0.0, pull);
  }

  function drawOverlay(c, t) {
    const out = t - 2.72;
    const h = { family: FONT.display, size: 112, tracking: 5, gradient: ['#fff8ea', '#f4ead8', '#dcc9a6'] };
    riseLine(c, 'VIBRANT.', 540, 400, h, t - 0.5, out);
    riseLine(c, 'DURABLE.', 540, 528, h, t - 1.0, out);
    riseLine(c, '50+ WASHES.', 540, 664, { ...h, size: 122, gradient: ['#ffe9b8', '#f1c26b', '#d9a04a'] }, t - 1.5, out);
  }

  function post(t) {
    return {
      flash: Math.exp(-t * 5.5) * 1.25 + ease.inCubic(prog(t, 2.82, 3.0)) * 0.7,
      flashColor: [1.0, 0.95, 0.9],
      bloom: 0.55, streak: 0.45, exposure: 1.1, saturation: 1.12,
    };
  }

  return { name: 'peel', scene, camera, update, drawOverlay, post, samples: 5 };
}
