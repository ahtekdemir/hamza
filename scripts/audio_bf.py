#!/usr/bin/env python3
"""Sound track for the Black Friday reel (15 s, 120 BPM, D minor).

A punchy four-on-the-floor beat with synth stabs and a sub bass, plus
effects timed to the picture: the 30% slam, the heat press, the peel, the
code typing itself in and a cash-register ring when it locks. Everything is
synthesised here: no samples and no licensed music.

    python3 scripts/audio_bf.py [output.wav]
"""
import sys
import numpy as np
import sfx
from sfx import place, tt, band_noise, env, boom, blip, whoosh, bell, pad, SR

# python3 scripts/audio_bf.py [output.wav] [--key N]   (N = semitones to transpose the music)
ARGS = sys.argv[1:]
KEY = 0.0
if '--key' in ARGS:
    i = ARGS.index('--key')
    KEY = float(ARGS[i + 1])
    del ARGS[i:i + 2]
OUT = ARGS[0] if ARGS else 'output/cowboydtf-black-friday-sfx.wav'

sfx.start(15.0)
rng = np.random.default_rng(5)
BEAT = 0.5


def hz(semi):
    """Frequency `semi` semitones above D2."""
    return 73.416 * 2 ** ((semi + KEY) / 12)


def kick(d=0.42):
    t = tt(d)
    f = 46 + 110 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7.5)
    return np.tanh((body + band_noise(d, 1500, 6000) * np.exp(-t * 120) * 0.3) * 1.5)


def clap(d=0.25):
    x = np.zeros(int(d * SR))
    n = band_noise(d, 900, 6000)
    t = tt(d)
    for k, dt in enumerate((0.0, 0.01, 0.021)):
        i = int(dt * SR)
        x[i:] += n[: len(x) - i] * np.exp(-t[: len(x) - i] * (80 if k < 2 else 22))
    return x * 0.6


def hat(d=0.06, open_=False):
    d = 0.22 if open_ else d
    return band_noise(d, 6500, 15000) * np.exp(-tt(d) * (14 if open_ else 70))


def sub(f, d):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return np.tanh(x * 1.4) * env(d, 0.006, 0.05, 1.0)


def stab(freqs, d=0.32, cutoff=1.0):
    """Detuned saw-ish chord stab with a closing filter (additive)."""
    t = tt(d)
    out = np.zeros_like(t)
    for f in freqs:
        for det in (0.997, 1.003):
            for h in range(1, 14):
                bright = np.exp(-h * (0.35 + 6 * t / cutoff))
                out += np.sin(2 * np.pi * f * det * h * t + h) / h * bright
    return out / len(freqs) * np.exp(-t * 7) * np.minimum(t / 0.004, 1)


def riser(d, lo=300, hi=6000):
    t = tt(d) / d
    f = lo * (hi / lo) ** t
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (tone + band_noise(d, 2000, 12000) * 0.6) * t ** 2.2


def coin_ring(d=1.2):
    """Cash-register ring: a bright bell plus a short metallic rattle."""
    x = bell([2637, 3520, 5274, 7040], d, 3.2)
    rattle = band_noise(0.18, 3000, 11000) * env(0.18, 0.003, 0.16, 1.5)
    x[: len(rattle)] += rattle * 0.8
    return x


# chords (semitones above D2): Dm  Bb  F  C  Dm
CHORDS = [[12, 15, 19, 24], [8, 12, 15, 20], [15, 19, 22, 27], [10, 14, 17, 22], [12, 15, 19, 24]]
ROOTS = [0, -4, 3, -2, 0]

# ---- intro: riser into the 30% slam ------------------------------------------------
place(riser(0.5, 400, 5000), 0.0, 0.25)
place(whoosh(0.5, lo=(100, 600), hi=(1500, 9000), peak=0.95, sharp=3), 0.02, 0.3)
place(boom(1.6, 120, 30, drop=7, decay=2.6), 0.5, 1.0)
place(band_noise(1.4, 3000, 14000) * env(1.4, 0.002, 1.3, 2.2), 0.5, 0.18)           # crash
place(stab([hz(s) for s in CHORDS[0]], 0.9, 2.0), 0.5, 0.22)
place(boom(0.8, 140, 45), 0.78, 0.5)
place(band_noise(0.3, 1500, 9000) * env(0.3, 0.002, 0.28, 2), 0.78, 0.12)

# ---- groove: 1.0 - 10.5 s -----------------------------------------------------------
for b in range(int((10.5 - 1.0) / BEAT)):
    t0 = 1.0 + b * BEAT
    bar = int((t0 - 1.0) // 2.0)
    ci = min(bar, len(CHORDS) - 1)
    place(kick(), t0, 0.5)
    place(hat(open_=True), t0 + 0.25, 0.05, pan=0.3)                                   # off-beat open hat
    place(hat(), t0 + 0.125, 0.03, pan=-0.3); place(hat(), t0 + 0.375, 0.03, pan=-0.3)
    if b % 2 == 1:
        place(clap(), t0, 0.22, pan=0.05)
    place(sub(hz(ROOTS[ci]), 0.22), t0 + 0.25, 0.32)                                   # off-beat bass
    if b % 4 in (0, 3):                                                                # stabs: 1 and the "and" of 4
        place(stab([hz(s) for s in CHORDS[ci]], 0.3), t0 + (0 if b % 4 == 0 else 0.25), 0.11, pan=-0.15 if b % 2 else 0.15)
place(pad([hz(12), hz(19)], 10.0, 0.6, 1.0, 0.25), 1.0, 0.06)   # open fifth: fits every chord

# ---- press shot (3.5 - 7.5 s) ---------------------------------------------------------
P = 3.5
place(whoosh(0.4, lo=(300, 1200), hi=(1500, 6000), peak=0.8), P + 0.1, 0.1, pan=0.3)       # film lands
place(whoosh(0.45, lo=(70, 350), hi=(250, 1300), peak=0.96, sharp=2.5), P + 0.42, 0.28)    # platen swings in
place(boom(1.1, 105, 34, drop=7, decay=3.8), P + 0.85, 0.6)                                 # clamp
place(bell([318, 517, 811, 1243], 0.45, 9), P + 0.85, 0.12)
place(band_noise(0.9, 3500, 12000) * env(0.9, 0.04, 0.7, 1.3), P + 0.87, 0.08)              # sizzle
place(band_noise(0.8, 1500, 10000) * env(0.8, 0.1, 0.6, 1.5), P + 1.6, 0.11)                # steam
pt = tt(0.95)
place(band_noise(0.95, 1800, 9000) * env(0.95, 0.25, 0.2, 1.2) * (0.55 + 0.45 * np.sin(2 * np.pi * (30 + 40 * pt) * pt)), P + 2.0, 0.12)  # peel
place(bell([1174.7, 1760, 2349.3, 3520], 1.4, 2.8), P + 3.0, 0.09)                          # reveal
place(whoosh(0.3, peak=0.92, sharp=3), P + 3.72, 0.26)

# ---- code shot (7.5 - 11 s) --------------------------------------------------------------
C = 7.5
place(whoosh(0.55, lo=(200, 900), hi=(1200, 7000), peak=0.7), C + 0.05, 0.2)               # ticket swings in
for i in range(8):                                                                         # typing
    click = band_noise(0.035, 2500, 9000) * env(0.035, 0.001, 0.03, 2.5) + blip(1800 + 60 * i, 0.035, 120) * 0.4
    place(click, C + 0.72 + i * 0.1, 0.22, pan=-0.2 + i * 0.05)
place(coin_ring(), C + 1.6, 0.16)                                                          # cha-ching
place(boom(0.6, 150, 60), C + 1.6, 0.25)
place(riser(0.5, 300, 7000), 10.5, 0.22)                                                   # into the end card
place(whoosh(0.32, peak=0.92, sharp=3), C + 3.2, 0.3)

# ---- end card (11 - 15 s): hat draws, logo hits ------------------------------------------
E = 11.0
place(pad([hz(12), hz(19), hz(24)], 1.5, 0.3, 0.3, 0.2), E, 0.08)
draw = tt(1.27)
gl = np.sin(2 * np.pi * np.cumsum(hz(24) + hz(24) * (draw / 1.27) ** 2) / SR) * env(1.27, 0.2, 0.15) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * draw))
place(gl, E + 0.15, 0.04)
place(band_noise(1.27, 4000, 12000) * env(1.27, 0.6, 0.1), E + 0.15, 0.05)
place(whoosh(0.5, peak=0.95, sharp=3), E + 1.0, 0.32)
place(boom(1.8, 100, 30, drop=6, decay=2.4), E + 1.5, 0.9)
place(stab([hz(s) for s in [12, 15, 19, 24, 26]], 2.4, 4.0), E + 1.5, 0.2)
place(pad([hz(0), hz(12), hz(15), hz(19), hz(26)], 2.5, 0.02, 1.8, 0.3), E + 1.5, 0.14)
place(bell([hz(36) * 2, hz(43) * 2], 1.6, 2.5), E + 1.5, 0.05)
place(coin_ring(0.9), E + 2.12, 0.07)                                                       # code box pops in

sfx.finish(OUT)
