# Cowboy DTF — "Press. Peel. Done." reel

A 20-second, 1080×1920 (9:16) motion reel for [cowboydtf.com](https://cowboydtf.com),
rendered entirely from code: Three.js scenes, frame-by-frame capture in headless
Chromium, motion blur by sub-frame accumulation, then bloom, lens streaks,
filmic tone mapping, vignette and grain.

## Output

| File | What it is |
|---|---|
| `output/cowboydtf-reel.mp4` | Final video with the original sound-effects track |
| `output/cowboydtf-reel-silent.mp4` | Same picture, no audio (for adding trending audio in the app) |
| `output/cowboydtf-reel-sfx.wav` | The sound track on its own |

## The cut (120 BPM grid)

| Time | Scene | File |
|---|---|---|
| 0.0–2.5 s | Ink drops bloom into colour — "Your art." | `src/scenes/ink.js` |
| 2.5–6.0 s | AI gang sheet builder | `src/scenes/sheet.js` |
| 6.0–10.0 s | Heat press, hot peel in 6–8 seconds | `src/scenes/press.js` |
| 10.0–13.0 s | The peel — vibrant, durable, 50+ washes | `src/scenes/peel.js` |
| 13.0–17.0 s | Four punch cards | `src/scenes/cards.js` |
| 17.0–20.0 s | Logo and web address | `src/scenes/logo.js` |

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

To change wording, edit the `drawOverlay` function of the scene; timings are in
seconds from the start of that scene. A single scene can be re-rendered with
`--from <frame> --to <frame>` (30 frames per second).
