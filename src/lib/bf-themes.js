// Colour themes and wording for the Black Friday reels. GOLD is the original
// black / gold / red reel; NEON is the "30% off your first order" version in
// midnight violet, hot pink, electric cyan and chrome.

const CREAMY = '#fff3dc';

export const GOLD = {
  hookBg: 0x3a0d08, pressBg: 0x3a0d08, codeBg: 0x34100a,
  halo: [0.8, 0.22, 0.06], pressHalo: [0.6, 0.16, 0.05], ring: [1.6, 1.0, 0.45],
  flash: [1.0, 0.82, 0.5], codeFlash: [1.0, 0.85, 0.6],
  metalFace: { color: 0xffc95a, metalness: 1, roughness: 0.2, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 1.5 },
  metalSide: { color: 0xd08a22, metalness: 1, roughness: 0.32, clearcoat: 0.4, envMapIntensity: 1.2 },
  key: [0xffe2b0, 2.2], fill: [0xffd9a0, 1.6], rim: [0xff3b2a, 30], sweep: [0xfff0d0, 9],
  dust: 0xffcf8a,
  confetti: [['#FFE08A', '#F6B12E', '#B9761A'], ['#FFF8E8', '#F1E2C2', '#B8A27A'], ['#FF5A5F', '#D7262E', '#7A0F1A'], ['#FFD36B', '#E8A21E', '#8C5A10']],
  headline: CREAMY, accent: ['#ffe08a', '#f6b12e', '#ef9a1c'], accentHex: '#f6b12e', accentGlow: 'rgba(246,177,46,0.8)',
  sparkle: ['#ffe9b0', 'rgba(255,200,90,0.9)'],
  chip: '#D7262E', chipText: CREAMY, chipLabel: 'SPECIAL  ·  CODE COWBOY30',
  shirt: '#1c1b1f', shirtTint: 0xffffff,
  offer: {
    ribbon: '#D7262E', ribbonDark: '#7A0F1A', ribbonText: '#FFF3DC',
    big: ['#FFF1B0', '#F6B12E', '#E8901A'], bigShade: ['#B9761A', '#6B3A0E'],
    off: ['#FFF3DC', '#F3DDB4'], offShade: ['#9C8A6A', '#4B4030'], star: '#F6B12E', sub: null,
  },
  ticket: {
    paper: ['#FFF8EA', '#F1E2C4'], noise: '120,90,50', stub: ['#E5333A', '#B21C25'], stubText: '#FFF3DC', star: '#F6B12E',
    border: 'rgba(118,44,43,0.35)', perf: 'rgba(80,50,30,0.45)', hat: '#203869',
    header: 'BLACK FRIDAY SPECIAL', headerColor: '#762c2b', footer: 'ENTER AT CHECKOUT', footerColor: 'rgba(32,56,105,0.85)',
    code: '#203869', idleFill: 'rgba(32,56,105,0.06)', idleStroke: '#203869', lockRGB: '246,177,46', lock: '#F6B12E',
    cursor: '#D7262E', check: '#F6B12E', checkMark: '#0B0A0C', sheen: '255,250,235',
  },
  card: {
    tagline: 'Black Friday special.',
    lines: [['30% OFF  ·  COWBOYDTF.COM', 1176, 34, 800, 6, 'navy'], ['BLACK FRIDAY  ·  NOV 27', 1230, 24, 700, 6, 'ox']],
    box: '#203869', label: '#F6B12E', divider: 'rgba(246,177,46,0.6)', code: '#FFF3DC',
  },
};

const PINK = '#FF2E88', CYAN = '#22E3FF', VIOLET = '#2A1466', WHITE = '#F7F4FF';

export const NEON = {
  hookBg: 0x24094d, pressBg: 0x200845, codeBg: 0x1e0a44,
  halo: [0.7, 0.08, 0.45], pressHalo: [0.45, 0.08, 0.4], ring: [1.0, 0.45, 1.6],
  flash: [1.0, 0.62, 0.92], codeFlash: [0.85, 0.75, 1.0],
  metalFace: { color: 0xf2f4ff, metalness: 1, roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1.35 },
  metalSide: { color: 0xff2e88, metalness: 0.55, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 1.0 },
  key: [0xc8ecff, 2.4], fill: [0xd8a8ff, 1.4], rim: [0xff2e88, 46], sweep: [0xd6f8ff, 2.6],   // chrome reflects more than gold: dimmer sweep
  dust: 0xd8a8ff,
  confetti: [['#FF9BCB', PINK, '#A3105A'], ['#FFFFFF', '#E8E6F5', '#9A96B8'], ['#B2F6FF', CYAN, '#0A7FA0'], ['#C9A6FF', '#8E4DFF', '#4A1E99']],
  headline: WHITE, accent: ['#C4F8FF', CYAN, '#13A6D6'], accentHex: CYAN, accentGlow: 'rgba(34,227,255,0.85)',
  sparkle: ['#E9FCFF', 'rgba(34,227,255,0.9)'],
  chip: PINK, chipText: '#FFFFFF', chipLabel: 'YOUR FIRST ORDER  ·  CODE COWBOY30',
  shirt: '#F3F1F6', shirtTint: 0xe6e6e6, heat: [3.0, 0.62, 0.9],
  offer: {
    ribbon: CYAN, ribbonDark: '#0A6C88', ribbonText: '#140A2E',
    big: ['#FFA6D2', PINK, '#C8106A'], bigShade: ['#7A0A45', '#2A0A3E'],
    off: ['#5A33B8', VIOLET], offShade: [CYAN, '#0A7FA0'], star: PINK, sub: 'ON YOUR FIRST ORDER',
  },
  ticket: {
    paper: ['#FFFFFF', '#EEEAF8'], noise: '90,70,140', stub: ['#FF4FA0', '#C8156E'], stubText: '#FFFFFF', star: CYAN,
    border: 'rgba(200,21,110,0.35)', perf: 'rgba(60,30,110,0.45)', hat: VIOLET,
    header: 'FIRST ORDER  ·  BLACK FRIDAY', headerColor: '#C8156E', footer: 'ENTER AT CHECKOUT', footerColor: 'rgba(42,20,102,0.85)',
    code: VIOLET, idleFill: 'rgba(42,20,102,0.06)', idleStroke: VIOLET, lockRGB: '34,227,255', lock: '#13B8E0',
    cursor: PINK, check: CYAN, checkMark: '#140A2E', sheen: '235,250,255',
  },
  card: {
    tagline: '30% off your first order.',
    lines: [['COWBOYDTF.COM', 1176, 38, 800, 9, 'navy'], ['BLACK FRIDAY  ·  NOV 27', 1230, 24, 700, 6, 'ox']],
    box: PINK, label: '#FFFFFF', divider: 'rgba(255,255,255,0.55)', code: '#FFFFFF',
    // cool lilac-white paper, violet dark, cyan line-light and a pink glow
    palette: { paper: [0.905, 0.88, 0.94], darkA: [0.008, 0.003, 0.02], darkB: [0.06, 0.015, 0.12], glow: [1.0, 0.3, 0.75],
      edge: [0.85, 0.9, 1.0], light: [0.7, 0.95, 1.0], flash: [0.95, 0.93, 1.0] },
  },
};
