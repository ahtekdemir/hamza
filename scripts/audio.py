#!/usr/bin/env python3
"""Sound-design track for the "Press. Peel. Done." reel. Every hit sits on the
same 120 BPM grid as the cut.

    python3 scripts/audio.py [output.wav]
"""
import sys
import numpy as np
from sfx import *  # noqa: F401,F403

start(20.0)

# ---- bed: low drone through the dark scenes ---------------------------------
place(pad([D2 / 2, D2, A2], 17.6, 2.0, 1.2, 0.3), 0.0, 0.16)
place(pad([D3, F3, A3], 11.0, 3.0, 1.0, 0.25), 6.0, 0.05)
# pulse: soft eighth-note tick that builds from the press onward
for k in range(int((17.0 - 6.0) / 0.25)):
    t0 = 6.0 + k * 0.25
    g = 0.012 + 0.03 * min(1, (t0 - 6.0) / 7.0)
    place(blip(D3 * 2 if k % 2 else D3, 0.09, 45), t0, g, pan=0.3 if k % 2 else -0.3)

# ---- scene 1: ink -----------------------------------------------------------
place(whoosh(0.9, peak=0.85, sharp=3), 0.1, 0.10)
for t0, f, p in [(1.0, 620, 0.0), (1.27, 760, -0.5), (1.5, 880, 0.5)]:
    place(bloop(f), t0, 0.38, p)
    place(boom(0.9, 80, 40), t0, 0.5 if t0 == 1.0 else 0.22, p * 0.5)
place(whoosh(0.42, peak=0.92, sharp=3), 2.08, 0.42)

# ---- scene 2: gang sheet ----------------------------------------------------
place(boom(1.2), 2.5, 0.85)
for i in range(20):
    t0 = 2.5 + 0.02 + i * 0.062
    p = np.sin(i * 2.3) * 0.7
    place(whoosh(0.3, lo=(300, 1200), hi=(2000, 9000), peak=0.75), t0 + 0.05, 0.07, p)
    place(blip(1500 + (i % 5) * 180, 0.05, 80), t0 + 0.34, 0.09, p)
scan = tt(1.0)
hum = np.sin(2 * np.pi * np.cumsum(320 + 620 * scan) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 26 * scan)) * env(1.0, 0.08, 0.2)
place(hum, 4.25, 0.05)
place(band_noise(1.0, 3000, 9000) * env(1.0, 0.1, 0.25), 4.25, 0.035)
place(blip(2400, 0.12, 30), 5.25, 0.08)
place(whoosh(0.35, peak=0.9, sharp=3), 5.67, 0.4)

# ---- scene 3: heat press ----------------------------------------------------
place(boom(0.9, 70, 40), 6.0, 0.6)
place(whoosh(0.95, lo=(80, 400), hi=(300, 1500), peak=0.97, sharp=2.5), 6.05, 0.3)
place(boom(1.4, 110, 34, drop=7, decay=3.5), 7.0, 1.0)
place(bell([318, 517, 811, 1243], 0.5, 9), 7.0, 0.2)
hiss = band_noise(2.4, 3500, 12000) * env(2.4, 0.05, 1.6, 1.2)
place(hiss, 7.0, 0.11)
for i, t0 in enumerate([7.0, 7.5, 8.0, 8.5]):
    place(blip(1900 if i < 3 else 2500, 0.06, 70), t0, 0.22)
    place(band_noise(0.03, 2000, 9000) * np.exp(-tt(0.03) * 150), t0, 0.12)
place(band_noise(0.9, 1500, 10000) * env(0.9, 0.12, 0.7, 1.5), 9.28, 0.24)
place(whoosh(0.45, peak=0.92, sharp=3), 9.55, 0.35)

# ---- scene 4: peel ----------------------------------------------------------
place(boom(1.0, 85, 40), 10.0, 0.7)
place(whoosh(1.55, lo=(600, 2500), hi=(2500, 11000), peak=0.8, sharp=1.2), 10.2, 0.2, -0.2)
for t0 in (10.5, 11.0, 11.5):
    place(boom(0.5, 120, 55, decay=9), t0, 0.32)
place(bell([1318.5, 1975.5, 2637, 3951], 2.0, 2.4), 11.75, 0.10)
place(whoosh(0.7, peak=0.95, sharp=3), 12.3, 0.42)

# ---- scene 5: punch cards ---------------------------------------------------
for i, t0 in enumerate((13.0, 14.0, 15.0, 16.0)):
    place(boom(1.0, 105, 38), t0, 0.95)
    place(band_noise(0.12, 1200, 9000) * np.exp(-tt(0.12) * 38), t0, 0.3)
    place(whoosh(0.25, peak=0.9, sharp=3), t0 + 0.74, 0.22, (-1) ** i * 0.5)
for k in range(5):
    place(blip(1760 * 2 ** (k * 2 / 12), 0.12, 28), 16.05 + k * 0.055, 0.07)

# ---- scene 6: logo ----------------------------------------------------------
draw = tt(1.27)
gl = np.sin(2 * np.pi * np.cumsum(D4 + (D4 * 1.0) * (draw / 1.27) ** 2) / SR) * env(1.27, 0.2, 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * draw))
place(gl, 17.15, 0.04)
place(band_noise(1.27, 4000, 12000) * env(1.27, 0.6, 0.1), 17.15, 0.05)
place(whoosh(0.5, peak=0.95, sharp=3), 18.0, 0.36)
place(boom(1.8, 100, 32, drop=6, decay=2.6), 18.5, 1.0)
place(pad([D3, A3, D4, Fs4], 1.5, 0.02, 1.2, 0.3), 18.5, 0.20)
place(bell([D4 * 2, A3 * 4, Fs4 * 4], 1.5, 2.5), 18.5, 0.07)

finish(sys.argv[1] if len(sys.argv) > 1 else 'output/cowboydtf-reel-sfx.wav')
