"""Shared synthesis helpers for the reel sound tracks (no samples, no licensed music)."""
import sys
import wave
import numpy as np

SR = 48000
DUR = 20.0
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def start(dur):
    """Reset the mix buffer for a track of `dur` seconds."""
    global DUR, N, mix, rng
    DUR = dur
    N = int(SR * dur)
    rng = np.random.default_rng(7)
    mix = np.zeros((N, 2))


def place(sig, t0, gain=1.0, pan=0.0):
    """Add a mono signal at time t0 (seconds). pan: -1 left .. 1 right."""
    i = int(t0 * SR)
    if i >= N or i < 0:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i:i + len(sig), 0] += sig * gain * l * 1.414
    mix[i:i + len(sig), 1] += sig * gain * r * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def band_noise(d, lo, hi):
    n = int(d * SR)
    spec = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    mask = 1 / (1 + (lo / np.maximum(f, 1)) ** 6) / (1 + (f / hi) ** 6)
    x = np.fft.irfft(spec * mask, n)
    return x / (np.max(np.abs(x)) + 1e-9)


def env(d, a, r, curve=2.0):
    t = tt(d)
    e = np.minimum(t / max(a, 1e-4), 1) * np.clip((d - t) / max(r, 1e-4), 0, 1) ** curve
    return e


def boom(d=1.1, f0=95, f1=36, drop=9.0, decay=4.5):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * drop)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * decay)
    click = band_noise(d, 800, 6000) * np.exp(-t * 90) * 0.35
    return np.tanh((body + click) * 1.6) * 0.8


def blip(f=1200, d=0.07, decay=60):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * decay)


def bloop(f0=620, f1=170, d=0.28):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 16)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def whoosh(d, lo=(200, 900), hi=(1500, 7000), peak=0.6, sharp=2.0):
    """Noise sweep that crossfades from a low band to a high band."""
    t = tt(d) / d
    a, b = band_noise(d, *lo), band_noise(d, *hi)
    x = a * (1 - t) + b * t
    e = np.where(t < peak, (t / peak) ** sharp, ((1 - t) / (1 - peak)) ** 1.5)
    return x * e


def bell(freqs, d=2.2, decay=2.2):
    t = tt(d)
    out = np.zeros_like(t)
    for i, f in enumerate(freqs):
        out += np.sin(2 * np.pi * f * t + i) * np.exp(-t * decay * (1 + i * 0.35)) / (1 + i * 0.6)
    return out * np.minimum(t / 0.004, 1)


def pad(freqs, d, a, r, bright=0.35):
    t = tt(d)
    out = np.zeros_like(t)
    for i, f in enumerate(freqs):
        for h in range(1, 6):
            det = 1 + 0.0025 * np.sin(i * 3.1 + h)
            out += np.sin(2 * np.pi * f * h * det * t + i * 1.7 + h) * (bright ** (h - 1)) / len(freqs)
    return out * env(d, a, r, 1.5) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.23 * t))



D2, A2, D3, F3, A3, D4, Fs4 = 73.42, 110.0, 146.83, 174.61, 220.0, 293.66, 369.99


def finish(out):
    """Soft-limit, normalise to about -1.5 dBFS and write a 16-bit stereo WAV."""
    m = np.tanh(mix * 1.15)
    fade = int(0.03 * SR)
    m[:fade] *= np.linspace(0, 1, fade)[:, None]
    m[-fade:] *= np.linspace(1, 0, fade)[:, None]
    m *= 0.84 / np.max(np.abs(m))
    with wave.open(out, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((m * 32767).astype('<i2').tobytes())
    rms = float(np.sqrt(np.mean(m ** 2)))
    print(f'{out}: peak {20 * np.log10(np.max(np.abs(m))):.1f} dBFS, rms {20 * np.log10(rms):.1f} dBFS, {DUR:.1f}s')
