// Small math / easing / RNG helpers. Everything in the reel is a pure
// function of time, so a frame can be rendered in isolation.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const sat = (x) => clamp(x, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0..1 progress of t between a and b (clamped). */
export const prog = (t, a, b) => sat((t - a) / (b - a));
export const smooth = (t) => { t = sat(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = sat(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const smoothstep = (a, b, x) => smooth((x - a) / (b - a));
export const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export const ease = {
  linear: (t) => sat(t),
  inQuad: (t) => { t = sat(t); return t * t; },
  outQuad: (t) => { t = sat(t); return 1 - (1 - t) * (1 - t); },
  inCubic: (t) => { t = sat(t); return t * t * t; },
  outCubic: (t) => { t = sat(t); return 1 - Math.pow(1 - t, 3); },
  inOutCubic: (t) => { t = sat(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
  outQuart: (t) => { t = sat(t); return 1 - Math.pow(1 - t, 4); },
  inQuart: (t) => { t = sat(t); return t * t * t * t; },
  inOutQuart: (t) => { t = sat(t); return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; },
  outQuint: (t) => { t = sat(t); return 1 - Math.pow(1 - t, 5); },
  inOutQuint: (t) => { t = sat(t); return t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2; },
  outExpo: (t) => { t = sat(t); return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); },
  inExpo: (t) => { t = sat(t); return t <= 0 ? 0 : Math.pow(2, 10 * t - 10); },
  inOutExpo: (t) => {
    t = sat(t);
    if (t <= 0) return 0; if (t >= 1) return 1;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  outBack: (t, s = 1.70158) => { t = sat(t); const u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; },
  inBack: (t, s = 1.70158) => { t = sat(t); return (s + 1) * t * t * t - s * t * t; },
  outSine: (t) => Math.sin(sat(t) * Math.PI / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * sat(t)) - 1) / 2,
};

/** Critically-damped spring settle: 0 -> 1 with a small overshoot. */
export const spring = (t, freq = 3.2, damp = 5.5) => {
  if (t <= 0) return 0;
  return 1 - Math.exp(-damp * t) * Math.cos(freq * Math.PI * 2 * t * 0.5);
};

/** Bell-shaped pulse centred on c with half-width w. */
export const pulse = (t, c, w) => { const x = (t - c) / w; return Math.exp(-x * x); };

/** Rises over `a`, holds, falls over `b` within [t0, t1]. */
export const window_ = (t, t0, t1, a = 0.2, b = 0.2) => smooth(prog(t, t0, t0 + a)) * (1 - smooth(prog(t, t1 - b, t1)));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); };

/** Cheap smooth 1D value noise (deterministic). */
export function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash1(i + seed * 57.3), b = hash1(i + 1 + seed * 57.3);
  return lerp(a, b, f * f * (3 - 2 * f)) * 2 - 1;
}

/** Halton sequence for sub-pixel jitter. */
export function halton(i, base) {
  let f = 1, r = 0;
  while (i > 0) { f /= base; r += f * (i % base); i = Math.floor(i / base); }
  return r;
}

export const TAU = Math.PI * 2;
export const deg = (d) => d * Math.PI / 180;

// Brand palette (from cowboydtf.com)
export const BRAND = {
  navy: '#203869',
  oxblood: '#762c2b',
  cream: '#f4ead8',
  paper: '#f6efe2',
  ink: '#05070d',
  // brighter tints used as light on the dark stage
  blueLight: '#4d7dff',
  redLight: '#e2473c',
  gold: '#f1c26b',
  warm: '#ffd9a8',
};
