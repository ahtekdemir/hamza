// The cut. Every scene boundary sits on a 120 BPM beat (0.5 s).

import { createInk } from './scenes/ink.js';
import { createSheet } from './scenes/sheet.js';
import { createPress } from './scenes/press.js';
import { createPeel } from './scenes/peel.js';
import { createCards } from './scenes/cards.js';
import { createLogo } from './scenes/logo.js';
import { createVersus } from './scenes/versus.js';
import { createTgSheet } from './scenes/tg-sheet.js';
import { createTgPress } from './scenes/tg-press.js';
import { createTgLineup } from './scenes/tg-lineup.js';
import { createTgCard } from './scenes/tg-card.js';
import { createBfHook } from './scenes/bf-hook.js';
import { createBfCode } from './scenes/bf-code.js';
import { createBfCard } from './scenes/bf-card.js';
import { buildOfferDesign, buildConfettiSprites } from './lib/bf-art.js';
import { NEON } from './lib/bf-themes.js';

export const FPS = 30;

const REELS = {
  // "Press. Peel. Done." brand reel
  main: {
    duration: 20,
    scenes: [
      [0.0, 2.5, createInk],
      [2.5, 6.0, createSheet],
      [6.0, 10.0, createPress],
      [10.0, 13.0, createPeel],
      [13.0, 17.0, createCards],
      [17.0, 20.0, createLogo],
    ],
  },
  // "Fabric or hard surface?" DTF vs UV DTF ad (Facebook / Instagram Reels)
  uv: {
    duration: 15,
    scenes: [
      [0.0, 12.0, createVersus],
      [12.0, 15.0, (ctx) => createLogo(ctx, {
        hatY: 500, wordY: 668,
        tagline: 'Both at Cowboy DTF. No minimums.',
        lines: [['COWBOYDTF.COM', 1142, 52, 800, 10, 'navy'], ['DTF  ·  UV DTF  ·  NO MINIMUMS', 1206, 24, 700, 6, 'ox']],
      })],
    ],
  },
  // "Thanksgiving designs, ready to press." seasonal reel (Facebook / Instagram Reels)
  thanks: {
    duration: 16,
    scenes: [
      [0.0, 4.0, createTgSheet],
      [4.0, 8.0, createTgPress],
      [8.0, 11.5, createTgLineup],
      [11.5, 16.0, createTgCard],
    ],
  },
  // "Black Friday special — 30% off, code COWBOY30" (Facebook / Instagram Reels)
  bf: {
    duration: 15,
    scenes: [
      [0.0, 3.5, createBfHook],
      [3.5, 7.5, (ctx) => createTgPress(ctx, {
        art: buildOfferDesign(), shirt: '#1c1b1f', shirtTint: 0xffffff, bg: 0x3a0d08, halo: [0.6, 0.16, 0.05],
        lines: ['PRESS.', 'PEEL.', 'SAVE 30%.'], fall: { sprites: buildConfettiSprites(), count: 34, size: [0.16, 0.36], fall: 0.9 },
        dust: 0xffcf8a, outFlash: [1.0, 0.85, 0.6], outFlashAmt: 0.5, filmBack: 0.2,
      })],
      [7.5, 11.0, createBfCode],
      [11.0, 15.0, createBfCard],
    ],
  },
  // "30% off your first order" Black Friday reel in neon (pink / cyan / chrome)
  bf2: {
    duration: 15,
    scenes: [
      [0.0, 3.5, (ctx) => createBfHook(ctx, NEON)],
      [3.5, 7.5, (ctx) => createTgPress(ctx, {
        art: buildOfferDesign(NEON), shirt: NEON.shirt, shirtTint: NEON.shirtTint, bg: NEON.pressBg, halo: NEON.pressHalo,
        lines: ['PRESS.', 'PEEL.', 'SAVE 30%.'], fall: { sprites: buildConfettiSprites(NEON), count: 34, size: [0.16, 0.36], fall: 0.9 },
        dust: NEON.dust, outFlash: NEON.codeFlash, outFlashAmt: 0.5, filmBack: 0.3,
        accent: NEON.accent, ring: NEON.accentHex, ringGlow: NEON.accentGlow, sparkle: NEON.sparkle, headline: NEON.headline, heat: NEON.heat,
      })],
      [7.5, 11.0, (ctx) => createBfCode(ctx, NEON)],
      [11.0, 15.0, (ctx) => createBfCard(ctx, NEON)],
    ],
  },
};

export const reelDuration = (name) => (REELS[name] || REELS.main).duration;

export function buildTimeline(ctx, name = 'main') {
  const reel = REELS[name] || REELS.main;
  return reel.scenes.map(([start, end, make]) => Object.assign(make(ctx), { start, end }));
}
