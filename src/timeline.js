// The cut. Every scene boundary sits on a 120 BPM beat (0.5 s).

import { createInk } from './scenes/ink.js';
import { createSheet } from './scenes/sheet.js';
import { createPress } from './scenes/press.js';
import { createPeel } from './scenes/peel.js';
import { createCards } from './scenes/cards.js';
import { createLogo } from './scenes/logo.js';

export const FPS = 30;
export const DURATION = 20;

export function buildTimeline(ctx) {
  const list = [
    [0.0, 2.5, createInk],
    [2.5, 6.0, createSheet],
    [6.0, 10.0, createPress],
    [10.0, 13.0, createPeel],
    [13.0, 17.0, createCards],
    [17.0, 20.0, createLogo],
  ];
  return list.map(([start, end, make]) => Object.assign(make(ctx), { start, end }));
}
