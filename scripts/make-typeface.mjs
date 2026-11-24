#!/usr/bin/env node
// Converts the Anton font into the three.js "typeface" JSON used for the 3D
// lettering in the Black Friday reel (only the characters the reel needs).
//
//   npm i --no-save opentype.js@1.3.4 @fontsource/anton@5.1.0
//   node scripts/make-typeface.mjs [font.woff] [out.json]

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.join(process.cwd(), 'x.js'));
const opentype = require('opentype.js');

const src = process.argv[2] || require.resolve('@fontsource/anton/files/anton-latin-400-normal.woff');
const out = process.argv[3] || 'assets/fonts/anton-typeface.json';
const CHARS = '0123456789%$OFFBLACKRIDY ';

const buf = fs.readFileSync(src);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const scale = 1000 / font.unitsPerEm;
const r = (v) => Math.round(v * scale);
const glyphs = {};
for (const ch of new Set(CHARS)) {
  const g = font.charToGlyph(ch);
  const p = g.getPath(0, 0, font.unitsPerEm);   // y down; flip below
  const o = [];
  for (const cmd of p.commands) {
    // three.js order: end point first, then control point(s)
    if (cmd.type === 'M') o.push('m', r(cmd.x), r(-cmd.y));
    else if (cmd.type === 'L') o.push('l', r(cmd.x), r(-cmd.y));
    else if (cmd.type === 'Q') o.push('q', r(cmd.x), r(-cmd.y), r(cmd.x1), r(-cmd.y1));
    else if (cmd.type === 'C') o.push('b', r(cmd.x), r(-cmd.y), r(cmd.x1), r(-cmd.y1), r(cmd.x2), r(-cmd.y2));
  }
  const bb = g.getBoundingBox();
  glyphs[ch] = { ha: r(g.advanceWidth), x_min: r(bb.x1), x_max: r(bb.x2), o: o.join(' ') };
}
const json = {
  glyphs, familyName: 'Anton', resolution: 1000,
  ascender: r(font.ascender), descender: r(font.descender),
  underlinePosition: r(font.tables.post.underlinePosition), underlineThickness: r(font.tables.post.underlineThickness),
  boundingBox: { xMin: r(font.tables.head.xMin), yMin: r(font.tables.head.yMin), xMax: r(font.tables.head.xMax), yMax: r(font.tables.head.yMax) },
  original_font_information: { format: 0, copyright: 'Anton, SIL Open Font License 1.1' },
};
fs.writeFileSync(out, JSON.stringify(json));
console.log(`wrote ${out}: ${Object.keys(glyphs).length} glyphs`);
