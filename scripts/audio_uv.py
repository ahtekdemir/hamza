#!/usr/bin/env python3
"""Sound-design track for the DTF vs UV DTF ad (15 s).

    python3 scripts/audio_uv.py [output.wav]
"""
import sys
import numpy as np
from sfx import *  # noqa: F401,F403

start(15.0)

# bed
place(pad([D2 / 2, D2, A2], 12.6, 1.5, 1.0, 0.3), 0.0, 0.15)
for k in range(int((12.0 - 2.0) / 0.25)):
    t0 = 2.0 + k * 0.25
    place(blip(D3 * 2 if k % 2 else D3, 0.09, 45), t0, 0.014 + 0.02 * min(1, (t0 - 2.0) / 7.0), pan=0.3 if k % 2 else -0.3)

# shot 1: hook
place(whoosh(0.7, peak=0.85, sharp=3), 0.05, 0.18)
place(boom(1.0, 85, 40), 0.3, 0.6)
place(bell([D4 * 2, A3 * 4], 1.2, 3), 0.62, 0.06)
place(whoosh(0.3, peak=0.92, sharp=3), 1.72, 0.3)

# shot 2: what it goes on (item swaps on the beat)
for i, t0 in enumerate((2.0, 3.0, 4.0)):
    place(boom(0.8, 100, 42), t0, 0.75 if i == 0 else 0.55)
    place(whoosh(0.28, lo=(300, 1200), hi=(2000, 9000), peak=0.8), t0 - 0.12, 0.2, -0.5)
    place(whoosh(0.28, lo=(300, 1200), hi=(2000, 9000), peak=0.8), t0 - 0.08, 0.2, 0.5)
    place(blip(1500 + i * 220, 0.06, 60), t0 + 0.05, 0.1)

# shot 3: how it goes on (press left, peel-and-stick right)
place(boom(0.9, 90, 40), 5.0, 0.8)
place(whoosh(0.55, lo=(80, 400), hi=(300, 1500), peak=0.97, sharp=2.5), 5.45, 0.3, -0.6)
place(boom(1.3, 110, 34, drop=7, decay=3.5), 6.0, 1.0, -0.4)
place(bell([318, 517, 811, 1243], 0.5, 9), 6.0, 0.18, -0.6)
place(band_noise(1.6, 3500, 12000) * env(1.6, 0.05, 1.0, 1.2), 6.0, 0.09, -0.6)
for i, t0 in enumerate((6.0, 6.5, 7.0)):
    place(blip(1900, 0.06, 70), t0, 0.2, -0.5)
for k in range(5):  # rubbing the UV transfer down
    place(band_noise(0.22, 900, 4000) * env(0.22, 0.08, 0.12), 6.08 + k * 0.3, 0.07, 0.6)
hum = tt(2.6)
place(np.sin(2 * np.pi * 220 * hum) * (0.6 + 0.4 * np.sin(2 * np.pi * 6 * hum)) * env(2.6, 0.4, 0.8), 5.4, 0.03, 0.6)
place(band_noise(0.7, 1500, 10000) * env(0.7, 0.1, 0.55, 1.5), 7.5, 0.16, -0.6)
place(whoosh(0.4, peak=0.92, sharp=3), 8.62, 0.32)

# shot 4: the reveal
place(boom(1.0, 85, 40), 9.0, 0.75)
place(whoosh(1.5, lo=(600, 2500), hi=(2500, 11000), peak=0.8, sharp=1.2), 9.3, 0.18, -0.5)
place(whoosh(1.5, lo=(700, 2800), hi=(2800, 11000), peak=0.8, sharp=1.2), 9.3, 0.18, 0.5)
place(bell([1318.5, 1975.5, 2637, 3951], 1.6, 2.6), 10.85, 0.10)
place(whoosh(0.45, peak=0.94, sharp=3), 11.55, 0.4)

# logo
draw = tt(1.27)
gl = np.sin(2 * np.pi * np.cumsum(D4 + D4 * (draw / 1.27) ** 2) / SR) * env(1.27, 0.2, 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * draw))
place(gl, 12.15, 0.04)
place(band_noise(1.27, 4000, 12000) * env(1.27, 0.6, 0.1), 12.15, 0.05)
place(whoosh(0.5, peak=0.95, sharp=3), 13.0, 0.36)
place(boom(1.5, 100, 32, drop=6, decay=2.8), 13.5, 1.0)
place(pad([D3, A3, D4, Fs4], 1.5, 0.02, 1.2, 0.3), 13.5, 0.20)
place(bell([D4 * 2, A3 * 4, Fs4 * 4], 1.5, 2.5), 13.5, 0.07)

finish(sys.argv[1] if len(sys.argv) > 1 else 'output/cowboydtf-dtf-vs-uv-sfx.wav')
