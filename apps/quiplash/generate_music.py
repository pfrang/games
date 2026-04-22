#!/usr/bin/env python3
"""
Quiplash Funky Background Music Generator
Requires: numpy  (pip install numpy)
Usage:    python3 generate_music.py [output.wav]
Output defaults to static/music.wav
"""

import sys
import wave
import numpy as np

SR = 44100
BPM = 110
BEAT = 60.0 / BPM
S16 = BEAT / 4          # 16th-note duration
BARS = 8                # bars per loop
LOOPS = 2
TOTAL_BARS = BARS * LOOPS
TOTAL_DURATION = TOTAL_BARS * 4 * BEAT
N = int(SR * TOTAL_DURATION)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def hz(semitones):
    """Semitones above A4 → frequency."""
    return 440.0 * (2.0 ** (semitones / 12.0))


PITCH = {
    'E2': hz(-29), 'G2': hz(-26), 'A2': hz(-24), 'B2': hz(-22),
    'C3': hz(-21), 'D3': hz(-19), 'E3': hz(-17), 'Fs3': hz(-15),
    'G3': hz(-14), 'A3': hz(-12), 'B3': hz(-10), 'C4': hz(-9),
    'D4': hz(-7),  'E4': hz(-5),  'G4': hz(-2),  'A4': hz(0),
    'Bb4': hz(1),  'B4': hz(2),   'D5': hz(5),   'E5': hz(7),
}


def alloc():
    return np.zeros(N)


def place(buf, sig, t_sec):
    start = int(t_sec * SR)
    if start >= N:
        return
    end = min(start + len(sig), N)
    buf[start:end] += sig[:end - start]


def t_at(bar, step16):
    """Absolute time for a bar + 16th-note step (both 0-indexed)."""
    return bar * 4 * BEAT + step16 * S16


def adsr(n, attack, decay, sustain, release):
    env = np.zeros(n)
    a = min(int(attack * SR), n)
    d = min(int(decay * SR), n - a)
    r = min(int(release * SR), n)
    s_end = max(a + d, n - r)
    if a:
        env[:a] = np.linspace(0, 1, a)
    if d:
        env[a:a + d] = np.linspace(1, sustain, d)
    env[a + d:s_end] = sustain
    if r:
        env[n - r:] = np.linspace(env[n - r - 1] if n - r > 0 else sustain, 0, r)
    return env


def sine(freq, dur):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    return np.sin(2 * np.pi * freq * t)


def saw(freq, dur, harmonics=7):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros(len(t))
    for h in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * freq * h * t) / h
    return out * (2 / np.pi)


def square(freq, dur, harmonics=5):
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    out = np.zeros(len(t))
    for h in range(1, harmonics + 1, 2):
        out += np.sin(2 * np.pi * freq * h * t) / h
    return out * (4 / np.pi)


# ---------------------------------------------------------------------------
# Simple comb-filter reverb
# ---------------------------------------------------------------------------

def reverb(sig, room=0.4, damp=0.5):
    delays = [int(SR * d) for d in [0.029, 0.037, 0.041, 0.043]]
    out = sig.copy()
    for d in delays:
        buf = np.zeros(len(sig) + d)
        buf[:len(sig)] += sig
        for i in range(d, len(buf)):
            buf[i] += buf[i - d] * room * (1 - damp)
        out += buf[:len(sig)] * 0.15
    return out


# ---------------------------------------------------------------------------
# Drum synthesis
# ---------------------------------------------------------------------------

def make_kick():
    dur = 0.55
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq_env = 155 * np.exp(-22 * t) + 48
    phase = 2 * np.pi * np.cumsum(freq_env) / SR
    sig = np.sin(phase) * np.exp(-8 * t)
    click = np.exp(-600 * t) * 0.25
    return (sig + click) * 0.88


def make_snare():
    dur = 0.28
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    rng = np.random.default_rng(42)
    noise = rng.standard_normal(len(t))
    tone = np.sin(2 * np.pi * 190 * t) * 0.45
    env = np.exp(-18 * t)
    return (noise * 0.65 + tone) * env * 0.68


def make_hihat(open_=False):
    dur = 0.14 if open_ else 0.04
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    rng = np.random.default_rng(7 if open_ else 13)
    sig = rng.standard_normal(len(t))
    decay = 18 if open_ else 100
    return sig * np.exp(-decay * t) * (0.20 if open_ else 0.24)


def make_rimshot():
    dur = 0.08
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    sig = np.sin(2 * np.pi * 800 * t) + np.sin(2 * np.pi * 1200 * t) * 0.5
    env = np.exp(-80 * t)
    return sig * env * 0.3


KICK = make_kick()
SNARE = make_snare()
HH_C = make_hihat(False)
HH_O = make_hihat(True)
RIM = make_rimshot()


# ---------------------------------------------------------------------------
# Instrument voices
# ---------------------------------------------------------------------------

def bass_note(note, dur, amp=0.72):
    freq = PITCH[note]
    sig = saw(freq, dur, harmonics=5)
    env = adsr(len(sig), 0.004, 0.06, 0.65, 0.04)
    return sig * env * amp


def chord_stab(notes, dur=0.14, amp=0.42):
    n = int(SR * dur)
    sig = np.zeros(n)
    for note in notes:
        freq = PITCH[note]
        s = (sine(freq, dur) * 0.4 + saw(freq, dur, harmonics=4) * 0.6)[:n]
        sig += s
    env = adsr(n, 0.003, 0.07, 0.25, 0.05)
    return sig * env * amp / max(len(notes), 1)


def lead_note(note, dur, amp=0.5):
    freq = PITCH[note]
    n = int(SR * dur)
    sig = (square(freq, dur, harmonics=4) * 0.45
           + sine(freq * 2, dur) * 0.3
           + sine(freq, dur) * 0.25)[:n]
    env = adsr(n, 0.008, 0.12, 0.55, 0.09)
    return sig * env * amp


def pad_note(notes, dur, amp=0.28):
    n = int(SR * dur)
    sig = np.zeros(n)
    for note in notes:
        freq = PITCH[note]
        s = (sine(freq, dur) * 0.7 + sine(freq * 1.003, dur) * 0.3)[:n]
        sig += s
    env = adsr(n, 0.35, 0.1, 0.85, 0.5)
    return sig * env * amp / max(len(notes), 1)


# ---------------------------------------------------------------------------
# Sequences  (bar = 0..TOTAL_BARS-1,  step = 0..15 in 16th notes)
# ---------------------------------------------------------------------------

def build_drums(buf):
    # Kick: funky displaced pattern
    kick_steps  = [0, 6, 8, 10, 14]
    snare_steps = [4, 12]
    hh_steps    = list(range(0, 16, 2))   # 8th notes
    hh_o_steps  = [6]                     # open hat on the + of 2
    rim_steps   = [9]                     # ghost rimshot

    for bar in range(TOTAL_BARS):
        for s in kick_steps:
            place(buf, KICK, t_at(bar, s))
        for s in snare_steps:
            place(buf, SNARE, t_at(bar, s))
        for s in hh_steps:
            place(buf, HH_C, t_at(bar, s))
        for s in hh_o_steps:
            place(buf, HH_O, t_at(bar, s))
        for s in rim_steps:
            place(buf, RIM, t_at(bar, s))


def build_bass(buf):
    # 8-bar pattern (repeated LOOPS times) in E minor
    # (step16, note, dur_16ths)
    patterns = [
        # bar 0 – main groove
        [(0,'E2',2),(3,'E2',1),(5,'A2',1),(7,'G2',1),(9,'E2',2),(12,'A2',1),(14,'G2',2)],
        # bar 1
        [(0,'E2',2),(3,'G2',1),(5,'A2',2),(8,'E2',1),(10,'D3',1),(12,'B2',1),(14,'E2',2)],
        # bar 2 – same as 0
        [(0,'E2',2),(3,'E2',1),(5,'A2',1),(7,'G2',1),(9,'E2',2),(12,'A2',1),(14,'G2',2)],
        # bar 3 – move to A
        [(0,'A2',2),(3,'A2',1),(5,'G2',1),(7,'E2',1),(9,'D3',2),(12,'E2',2),(14,'G2',1)],
        # bar 4 – same as 0
        [(0,'E2',2),(3,'E2',1),(5,'A2',1),(7,'G2',1),(9,'E2',2),(12,'A2',1),(14,'G2',2)],
        # bar 5 – same as 1
        [(0,'E2',2),(3,'G2',1),(5,'A2',2),(8,'E2',1),(10,'D3',1),(12,'B2',1),(14,'E2',2)],
        # bar 6 – ascending run
        [(0,'E2',1),(2,'G2',1),(4,'A2',2),(7,'B2',1),(9,'A2',1),(11,'G2',1),(13,'E2',2)],
        # bar 7 – turnaround
        [(0,'D3',2),(3,'B2',1),(5,'A2',1),(7,'G2',1),(9,'E2',3),(13,'G2',1),(15,'A2',1)],
    ]

    for loop in range(LOOPS):
        for bar_i, pattern in enumerate(patterns):
            bar = loop * BARS + bar_i
            bar_start = bar * 4 * BEAT
            for step, note, dur16 in pattern:
                t = bar_start + step * S16
                dur = dur16 * S16 * 0.88
                place(buf, bass_note(note, dur), t)


def build_chords(buf):
    Em7 = ['E3', 'G3', 'B3', 'D4']
    Am7 = ['A3', 'C4', 'E4', 'G4']

    # (bar_in_8, step16, chord)
    pattern = [
        (0, 2, Em7), (0, 6, Em7), (0, 10, Em7),
        (1, 2, Em7), (1, 6, Em7), (1, 14, Am7),
        (2, 2, Em7), (2, 6, Em7), (2, 10, Em7),
        (3, 2, Am7), (3, 6, Am7), (3, 10, Em7), (3, 14, Em7),
        (4, 2, Em7), (4, 6, Em7), (4, 10, Em7),
        (5, 2, Em7), (5, 10, Am7),
        (6, 2, Em7), (6, 6, Em7), (6, 10, Am7),
        (7, 2, Am7), (7, 6, Em7), (7, 10, Em7), (7, 14, Em7),
    ]

    for loop in range(LOOPS):
        for bar_i, step, chord in pattern:
            bar = loop * BARS + bar_i
            place(buf, chord_stab(chord), t_at(bar, step))


def build_lead(buf):
    # E minor pentatonic / blues scale melody
    # (bar_in_8, step16, note, dur_16ths)
    pattern = [
        (0,  0, 'E4', 2), (0,  3, 'G4', 1), (0,  5, 'A4', 2),
        (0,  8, 'G4', 1), (0, 10, 'E4', 2), (0, 13, 'D4', 1), (0, 15, 'E4', 1),

        (1,  0, 'G4', 3), (1,  4, 'A4', 2), (1,  7, 'G4', 1),
        (1,  9, 'E4', 2), (1, 12, 'D4', 2),

        (2,  0, 'E4', 2), (2,  3, 'G4', 1), (2,  5, 'Bb4', 1), (2,  6, 'A4', 2),
        (2,  9, 'G4', 2), (2, 12, 'E4', 1), (2, 14, 'D4', 2),

        (3,  0, 'A4', 4), (3,  5, 'G4', 1), (3,  7, 'E4', 1),
        (3,  9, 'D4', 2), (3, 12, 'E4', 4),

        (4,  0, 'E5', 1), (4,  2, 'D5', 1), (4,  4, 'B4', 2), (4,  7, 'A4', 1),
        (4,  9, 'G4', 2), (4, 12, 'E4', 2),

        (5,  0, 'G4', 2), (5,  3, 'A4', 1), (5,  5, 'G4', 2),
        (5,  8, 'E4', 2), (5, 11, 'D4', 1), (5, 13, 'E4', 3),

        (6,  0, 'E4', 1), (6,  2, 'G4', 1), (6,  4, 'A4', 1), (6,  6, 'B4', 1),
        (6,  8, 'A4', 2), (6, 11, 'G4', 1), (6, 13, 'E4', 3),

        (7,  0, 'B4', 2), (7,  3, 'A4', 1), (7,  5, 'G4', 2), (7,  8, 'E4', 2),
        (7, 11, 'G4', 1), (7, 13, 'A4', 3),
    ]

    for loop in range(LOOPS):
        for bar_i, step, note, dur16 in pattern:
            bar = loop * BARS + bar_i
            t = t_at(bar, step)
            dur = dur16 * S16 * 0.82
            place(buf, lead_note(note, dur), t)


def build_pad(buf):
    Em7 = ['E3', 'G3', 'B3', 'D4']
    Am7 = ['A3', 'C4', 'E4', 'G4']

    chords_by_bar = [Em7, Em7, Em7, Am7, Em7, Em7, Am7, Em7]
    bar_dur = 4 * BEAT

    for loop in range(LOOPS):
        for bar_i, chord in enumerate(chords_by_bar):
            bar = loop * BARS + bar_i
            place(buf, pad_note(chord, bar_dur), bar * bar_dur)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    output = sys.argv[1] if len(sys.argv) > 1 else 'static/music.wav'

    print(f"Generating funky Quiplash music — {TOTAL_DURATION:.1f}s @ {BPM} BPM, key E minor")

    drums  = alloc()
    bass   = alloc()
    chords = alloc()
    lead   = alloc()
    pad    = alloc()

    print("  drums...")
    build_drums(drums)
    print("  bass...")
    build_bass(bass)
    print("  chord stabs...")
    build_chords(chords)
    print("  lead...")
    build_lead(lead)
    print("  pad...")
    build_pad(pad)
    print("  reverb + mix...")

    mix = (drums * 0.82
           + reverb(bass,   room=0.15) * 0.70
           + reverb(chords, room=0.30) * 0.52
           + reverb(lead,   room=0.25) * 0.60
           + reverb(pad,    room=0.45) * 0.38)

    peak = np.max(np.abs(mix))
    if peak > 0:
        mix = mix / peak * 0.88

    # Fade in / fade out (0.5 s each)
    fade = int(0.5 * SR)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)

    pcm = (mix * 32767).astype(np.int16)

    with wave.open(output, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())

    print(f"Done → {output}")


if __name__ == '__main__':
    main()
