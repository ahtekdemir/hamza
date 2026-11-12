# Cowboy DTF — motion reels

Three 1080×1920 (9:16) motion reels for [cowboydtf.com](https://cowboydtf.com),
rendered entirely from code: Three.js scenes, frame-by-frame capture in headless
Chromium, motion blur by sub-frame accumulation, then bloom, lens streaks,
filmic tone mapping, vignette and grain.

## Output

| File | What it is |
|---|---|
| `output/cowboydtf-reel.mp4` | Final video with the original sound-effects track |
| `output/cowboydtf-reel-silent.mp4` | Same picture, no audio (for adding trending audio in the app) |
| `output/cowboydtf-reel-sfx.wav` | The sound track on its own |
| `output/cowboydtf-dtf-vs-uv.mp4` | "Fabric or hard surface?" — DTF vs UV DTF ad, 15 s, with sound |
| `output/cowboydtf-dtf-vs-uv-silent.mp4` | Same picture, no audio |
| `output/cowboydtf-dtf-vs-uv-sfx.wav` | Its sound track on its own |
| `output/cowboydtf-thanksgiving.mp4` | "Thanksgiving designs, ready to press." — seasonal reel, 16 s, with music and sound |
| `output/cowboydtf-thanksgiving-silent.mp4` | Same picture, no audio |
| `output/cowboydtf-thanksgiving-sfx.wav` | Its sound track on its own |

## "Press. Peel. Done." — the cut (20 s, 120 BPM grid)

| Time | Scene | File |
|---|---|---|
| 0.0–2.5 s | Ink drops bloom into colour — "Your art." | `src/scenes/ink.js` |
| 2.5–6.0 s | AI gang sheet builder | `src/scenes/sheet.js` |
| 6.0–10.0 s | Heat press, hot peel in 6–8 seconds | `src/scenes/press.js` |
| 10.0–13.0 s | The peel — vibrant, durable, 50+ washes | `src/scenes/peel.js` |
| 13.0–17.0 s | Four punch cards | `src/scenes/cards.js` |
| 17.0–20.0 s | Logo and web address | `src/scenes/logo.js` |

## "Fabric or hard surface?" — DTF vs UV DTF (15 s)

A split-screen ad for Facebook and Instagram Reels: regular DTF on a shirt on the
left, UV DTF on a tumbler on the right. All text stays out of the top 270 px,
the bottom 670 px and 65 px at each side, where the ad interface sits.

| Time | Shot | File |
|---|---|---|
| 0–2 s | Hook — "Same design. Two transfers." | `src/scenes/versus.js` |
| 2–5 s | What it goes on: tee, hoodie, tote vs tumbler, mug, sign | `src/scenes/versus.js` |
| 5–9 s | How it goes on: heat press 6–8 s vs no heat, peel and stick | `src/scenes/versus.js` |
| 9–12 s | Both films peel together | `src/scenes/versus.js` |
| 12–15 s | Logo, "Both at Cowboy DTF. No minimums." | `src/scenes/logo.js` |

## "Thanksgiving designs, ready to press." — seasonal reel (16 s)

A Thanksgiving follow-up to the store-opening Short, in the same language
(bold condensed headlines, a sheet of transfers with a curling corner, the
designs on shirts) on a warm autumn stage with falling leaves. Headlines stay
between 270 px from the top and 1310 px, clear of the Reels interface.

| Time | Shot | File |
|---|---|---|
| 0–4 s | Hook — "Thanksgiving designs, ready to press." Six designs pop onto a transfer sheet | `src/scenes/tg-sheet.js` |
| 4–8 s | "Press. Peel. Give thanks." Film lands, the platen clamps (hot peel, 6–8 s), the film peels off | `src/scenes/tg-press.js` |
| 8–11.5 s | "For family feasts. Friendsgiving. Turkey trots." Three finished garments | `src/scenes/tg-lineup.js` |
| 11.5–16 s | "Happy Thanksgiving from all of us at Cowboy DTF", logo and web address | `src/scenes/tg-card.js` |

The six Thanksgiving designs, the garments and the leaves are original sample
art drawn in `src/lib/thanks-art.js`; the film, leaf and paper pieces shared by
the four shots are in `src/lib/autumn.js`. The sound track
(`scripts/audio_thanks.py`) is a synthesised plucked-string tune at 120 BPM with
effects timed to the picture — no samples, no licensed music.

All on-screen claims come from the live site. The artwork on the transfers is
original sample art drawn in `src/lib/designs.js`; the logo files in
`assets/brand/` are the site's own.

## Re-rendering

Requires Node 20+, ffmpeg, Python 3 with numpy, and Playwright with Chromium.

```bash
npm install
npm run still -- 4.6,11.9 --scale 0.5      # quick single frames into .stills/
npm run preview                             # half-size, low-sample full pass
npm run render -- --workers 3 --no-encode   # full-quality frames into .frames/
npm run audio                               # writes output/cowboydtf-reel-sfx.wav
node scripts/render.mjs --encode-only --audio output/cowboydtf-reel-sfx.wav
```

For the DTF vs UV DTF ad, add `--reel uv` to the render commands and use
`npm run audio:uv`; its frames go to `.frames-uv/`. For the Thanksgiving reel
use `--reel thanks` and `npm run audio:thanks`; its frames go to
`.frames-thanks/`. `node scripts/render.mjs --designs sheet.png --art sheet`
exports the Thanksgiving design sheet as a flat image.

To change wording, edit the `drawOverlay` function of the scene; timings are in
seconds from the start of that scene. A single scene can be re-rendered with
`--from <frame> --to <frame>` (30 frames per second).
