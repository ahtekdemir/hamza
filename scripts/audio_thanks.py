#!/usr/bin/env python3
"""Sound track for the Thanksgiving reel (16 s, 120 BPM, D major).

A warm plucked-string bed with a light stomp-and-clap groove, plus sound
effects timed to the picture. Everything is synthesised here: no samples
and no licensed music.

    python3 scripts/audio_thanks.py [output.wav]
"""
import sys
import numpy as np
import sfx
from sfx import place, tt, band_noise, env, boom, blip, whoosh, bell, pad, SR

sfx.start(16.0)
rng = np.random.default_rng(11)
BEAT = 0.5


def note(semi):
    """Frequency of a note `semi` semitones above D2."""
    return 73.416 * 2 ** (semi / 12)


def pluck(f, d=1.6, damp=0.9965, bright=0.55, seed_noise=None):
    """Karplus-Strong string, tuned exactly by resampling."""
    n = max(2, int(round(SR / f)))
    ratio = f / (SR / n)                      # how far the integer period is off pitch
    total = int(d * SR * ratio) + n
    p = rng.standard_normal(n) if seed_noise is None else seed_noise[:n].copy()
    # soften the excitation: fewer highs = mellower pick
    k = int(1 + (1 - bright) * 6)
    for _ in range(k):
        p = 0.5 * (p + np.roll(p, 1))
    p -= p.mean()
    p /= np.max(np.abs(p)) + 1e-9
    out = np.empty(total)
    i = 0
    while i < total:
        m = min(n, total - i)
        out[i:i + m] = p[:m]
        p = damp * 0.5 * (p + np.roll(p, 1))
        i += n
    x = np.interp(np.arange(int(d * SR)) * ratio, np.arange(total), out)
    t = np.arange(len(x)) / SR
    return x * np.minimum(t / 0.002, 1) * np.clip((d - t) / 0.08, 0, 1)


def kick(d=0.45):
    t = tt(d)
    f = 48 + 90 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + band_noise(d, 60, 400) * np.exp(-t * 60) * 0.25


def clap(d=0.22):
    x = np.zeros(int(d * SR))
    n = band_noise(d, 900, 5200)
    t = tt(d)
    for k, dt in enumerate((0.0, 0.011, 0.023)):
        i = int(dt * SR)
        x[i:] += n[: len(x) - i] * np.exp(-t[: len(x) - i] * (70 if k < 2 else 26))
    return x * 0.6


def shaker(d=0.09):
    return band_noise(d, 5000, 12000) * env(d, 0.012, d - 0.012, 1.6)


# ---- music -----------------------------------------------------------------------
# one chord per bar (2 s): D  G  D  A | Bm  G  A  D
# chord tones in semitones above D2
TONES = {
    'D': [12, 16, 19, 24, 28], 'G': [12, 17, 21, 24, 29], 'A': [11, 14, 19, 23, 26], 'Bm': [12, 16, 21, 24, 28],
}
ROOT = {'D': 0, 'G': 5, 'A': 7, 'Bm': 9}
PROG = ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D']
PATTERN = [0, 2, 1, 3, 2, 4, 3, 1]            # picking pattern over the chord tones (8ths)

for bar, name in enumerate(PROG):
    t0 = bar * 4 * BEAT
    tones = TONES[name]
    last = bar == len(PROG) - 1
    level = 0.85 if bar < 2 else 1.0
    # picked guitar
    for k in range(8):
        if last and k > 4:
            break
        f = note(tones[PATTERN[k]])
        acc = 1.0 if k % 2 == 0 else 0.72
        place(pluck(f, 1.5 if not last else 2.6, bright=0.62), t0 + k * 0.25 + 0.004 * (k % 2), 0.31 * acc * level, pan=-0.28 + 0.14 * (k % 3))
    # strum on the downbeat from bar 3
    if bar >= 2:
        for j, s in enumerate(tones[:4]):
            place(pluck(note(s), 2.0 if not last else 3.2, bright=0.75), t0 + j * 0.014, 0.16, pan=0.3)
    # bass
    for b in ((0, 2) if not last else (0,)):
        place(pluck(note(ROOT[name] - (12 if ROOT[name] > 6 else 0)), 1.1 if not last else 2.6, damp=0.9985, bright=0.3), t0 + b * BEAT, 0.42 * level)
    # stomp, clap, shaker
    if bar == 1:                                   # the groove sneaks in
        place(kick(), t0, 0.2)
        place(kick(), t0 + 2 * BEAT, 0.22)
        for k in range(8):
            place(shaker(), t0 + k * 0.25, 0.03 + 0.004 * k, pan=0.45)
    if bar >= 2:
        for b in range(4):
            if last and b > 0:
                break
            if b % 2 == 0:
                place(kick(), t0 + b * BEAT, 0.3)
            else:
                place(clap(), t0 + b * BEAT, 0.16 if bar < 4 else 0.22, pan=0.1)
        if not last:
            for k in range(8):
                place(shaker(), t0 + k * 0.25, 0.035 if k % 2 == 0 else 0.055, pan=0.45)

# a simple bell tune over the second half
TUNE = [(8.0, 28), (8.5, 26), (9.0, 24), (9.5, 26), (10.0, 29), (10.5, 31), (11.0, 33), (11.5, 31),
        (12.0, 31), (12.5, 35), (13.0, 38), (13.5, 35), (14.0, 36)]
for t0, s in TUNE:
    f = note(s) * 2
    place(bell([f, f * 2.0, f * 3.01], 1.3, 3.6), t0, 0.05, pan=-0.15)
# warm pad swell into the end card, and the final chord
place(pad([note(0), note(7), note(12), note(16)], 4.2, 1.2, 1.6, 0.28), 11.4, 0.1)
place(pad([note(0), note(12), note(16), note(19)], 2.2, 0.05, 1.8, 0.3), 14.0, 0.09)

# ---- sound effects -----------------------------------------------------------------
# shot 1: the sheet (0-4 s)
place(whoosh(0.9, lo=(150, 700), hi=(900, 5000), peak=0.75, sharp=2), 0.2, 0.2)
for i in range(6):                                  # designs pop on
    place(blip(note([24, 28, 31, 33, 36, 40][i]) * 2, 0.16, 26), 0.8 + i * 0.16, 0.12, pan=-0.4 if i % 2 == 0 else 0.4)
    place(band_noise(0.05, 1500, 7000) * env(0.05, 0.002, 0.045, 2), 0.8 + i * 0.16, 0.07)
place(band_noise(0.9, 2500, 9000) * env(0.9, 0.5, 0.3, 1.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tt(0.9))), 1.8, 0.035, pan=0.5)   # corner curls
place(bell([2349, 3136, 3951], 1.2, 3.2), 2.4, 0.035, pan=0.3)                                                                      # sheen
place(whoosh(0.42, peak=0.9, sharp=3), 3.6, 0.3)

# shot 2: press and peel (4-8 s)
place(boom(0.9, 80, 40), 4.0, 0.28)
place(whoosh(0.5, lo=(300, 1200), hi=(1500, 6000), peak=0.8), 4.1, 0.1, pan=0.3)                # film lands
place(whoosh(0.45, lo=(70, 350), hi=(250, 1300), peak=0.96, sharp=2.5), 4.42, 0.3)              # platen swings in
place(boom(1.2, 105, 34, drop=7, decay=3.6), 4.85, 0.55)                                        # clamp
place(bell([318, 517, 811, 1243], 0.45, 9), 4.85, 0.14)
place(band_noise(1.0, 3500, 12000) * env(1.0, 0.04, 0.75, 1.3), 4.87, 0.085)                    # sizzle
place(band_noise(0.8, 1500, 10000) * env(0.8, 0.1, 0.6, 1.5), 5.6, 0.13)                        # steam as it lifts
place(whoosh(0.4, lo=(250, 1300), hi=(70, 350), peak=0.15, sharp=1.5), 5.62, 0.2)
peel = tt(0.95)
place(band_noise(0.95, 1800, 9000) * env(0.95, 0.25, 0.2, 1.2) * (0.55 + 0.45 * np.sin(2 * np.pi * (30 + 40 * peel) * peel)), 6.0, 0.13, pan=-0.2)
place(whoosh(0.95, lo=(600, 2500), hi=(2500, 11000), peak=0.8, sharp=1.2), 6.0, 0.12, pan=0.2)
place(bell([1174.7, 1760, 2349.3, 3520], 1.6, 2.6), 7.0, 0.11)                                  # the reveal
place(bell([2349.3, 3136, 4698.6], 0.9, 4), 7.18, 0.05, pan=0.4)
place(whoosh(0.3, peak=0.92, sharp=3), 7.72, 0.3)

# shot 3: the line-up (8-11.5 s)
place(boom(0.9, 90, 42), 8.0, 0.32)
for i, t0 in enumerate((8.42, 8.6, 8.8)):                                                       # garments land
    place(band_noise(0.16, 120, 900) * env(0.16, 0.004, 0.15, 2.2), t0, 0.3, pan=(-0.5, 0.5, 0.0)[i])
    place(whoosh(0.3, lo=(300, 1500), hi=(900, 4000), peak=0.85), t0 - 0.3, 0.09, pan=(-0.5, 0.5, 0.0)[i])
place(whoosh(0.3, lo=(500, 2000), hi=(2000, 8000), peak=0.7), 8.92, 0.12, pan=-0.4)             # highlight bar
place(whoosh(0.36, peak=0.9, sharp=3), 11.18, 0.22)

# end card (11.5-16 s)
place(bell([note(24) * 2, note(28) * 2, note(31) * 2], 1.6, 2.4), 11.56, 0.06)
place(boom(0.9, 85, 40), 11.8, 0.26)
for i, t0 in enumerate((13.8, 13.92, 14.0)):                                                    # pumpkins and the turkey pop up
    t = tt(0.2)
    f = (300 + i * 90) + 420 * (t / 0.2) ** 0.6
    place(np.sin(2 * np.pi * np.cumsum(f) / SR) * env(0.2, 0.005, 0.18, 1.6), t0, 0.1, pan=(-0.5, 0.5, 0.0)[i])

sfx.finish(sys.argv[1] if len(sys.argv) > 1 else 'output/cowboydtf-thanksgiving-sfx.wav')
