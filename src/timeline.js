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
};

export const reelDuration = (name) => (REELS[name] || REELS.main).duration;

export function buildTimeline(ctx, name = 'main') {
  const reel = REELS[name] || REELS.main;
  return reel.scenes.map(([start, end, make]) => Object.assign(make(ctx), { start, end }));
}
