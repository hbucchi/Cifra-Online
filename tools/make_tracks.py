"""
Turn one generated backing track into a seamless, bar-aligned loop in all 12 keys,
and work out its tempo, key and chords (bar by bar).

Usage:
    python3 tools/make_tracks.py <input.mp3> <track-id> [--bpm 96] [--bars 12]
                                 [--root E] [--mode major] [--style blues] [--period 12] [--analyse-only]

Needs ffmpeg built with the Rubber Band library, and numpy.

Steps
  1. ONSETS  — "spectral flux": how much the spectrum suddenly gets louder from
               one short frame (11.6 ms) to the next. Drum hits and new notes
               make peaks.
  2. TEMPO   — slide a grid of evenly spaced beats over the onset curve and keep
               the period (to 0.01 BPM) and offset where the grid lands on the
               most peaks. An error of only 0.3 % would make a 30 s loop drift
               by 0.09 s every time it repeats, so precision matters.
  3. BAR LINE— chords usually change on beat 1, so of the 4 possible beat
               positions we take the one where the harmony changes most.
  4. LOOP    — start exactly on a downbeat, keep a whole number of bars (a
               multiple of 4), cross-fade the next half-second into the start.
  5. KEY     — chromagram (energy of each of the 12 note names) correlated with
               the Krumhansl major/minor key profiles.
  6. CHORDS  — for every bar, compare its chromagram (+ bass note) with
               major / minor / 7 / m7 templates on all 12 roots.
  7. KEYS    — pitch-shift the loop to every key from -5 to +6 semitones with
               Rubber Band (tempo unchanged) → audio/tracks/<id>/<Key>.mp3
  8. Prints JSON for js/school.js (TRACKS).
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 22050
NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
CHORD_TYPES = {"": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10]}
FLAT_KEYS = {"F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"}


def decode(path, sr=SR):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def stft_mag(y, n_fft, hop):
    win = np.hanning(n_fft)
    frames = 1 + (len(y) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    return np.abs(np.fft.rfft(y[idx] * win, axis=1))


def chroma_matrix(mag, n_fft, fmin, fmax, sr=SR):
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    band = (freqs >= fmin) & (freqs <= fmax)
    pcs = np.mod(np.round(69 + 12 * np.log2(freqs[band] / 440.0)).astype(int), 12)
    m = np.zeros((12, band.sum()))
    m[pcs, np.arange(band.sum())] = 1
    return (mag[:, band] ** 2) @ m.T  # frames × 12


def chroma(y, sr=SR, n_fft=8192, hop=2048):
    c = chroma_matrix(stft_mag(y, n_fft, hop), n_fft, 60, 2000, sr).sum(axis=0)
    return c / c.max()


def detect_key(c):
    best = None
    for root in range(12):
        for mode, prof in (("major", MAJOR), ("minor", MINOR)):
            r = np.corrcoef(np.roll(prof, root), c)[0, 1]
            if best is None or r > best[0]:
                best = (r, root, mode)
    return best


def onset_envelope(y, n_fft=1024, hop=256):
    mag = np.log1p(stft_mag(y, n_fft, hop) * 100)
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16) / 16, mode="same")  # remove slow trend
    return np.maximum(flux, 0), SR / hop


def beat_grid(env, fps, bpm_hint=None):
    """Return (bpm, phase_seconds) of the evenly spaced beat grid that best fits the onsets."""
    t_env = np.arange(len(env)) / fps
    dur = t_env[-1]

    def score(bpm, phases):
        period = 60 / bpm
        ks = np.arange(int(dur / period))
        times = phases[:, None] + ks[None, :] * period
        times = times[times.max(axis=1) < dur] if False else times
        vals = np.interp(times, t_env, env, right=0)
        return vals.mean(axis=1)

    if bpm_hint:
        grid = np.arange(bpm_hint - 3, bpm_hint + 3, 0.01)
    else:
        # coarse: autocorrelation in 60–180 BPM, then refine
        ac = np.correlate(env - env.mean(), env - env.mean(), mode="full")[len(env) - 1:]
        lags = np.arange(len(ac)); bpms = 60 * fps / np.maximum(lags, 1)
        ok = (bpms >= 60) & (bpms <= 180)
        coarse = bpms[ok][np.argmax(ac[ok])]
        grid = np.arange(coarse - 3, coarse + 3, 0.01)
    best = (-1, None, None)
    for bpm in grid:
        period = 60 / bpm
        phases = np.linspace(0, period, 48, endpoint=False)
        s = score(bpm, phases)
        i = int(np.argmax(s))
        if s[i] > best[0]:
            best = (s[i], bpm, phases[i])
    # refine the phase finely
    bpm = best[1]; period = 60 / bpm
    phases = np.linspace(best[2] - period / 48, best[2] + period / 48, 41) % period
    s = score(bpm, phases)
    return float(bpm), float(phases[int(np.argmax(s))])


def candidate_chords(root, mode, style):
    """Chords a song in this key normally uses (musicians narrow the search the same way)."""
    if style == "blues":                         # I7, IV7, V7
        return [((root + d) % 12, "7") for d in (0, 5, 7)]
    if mode == "major":                          # I ii iii IV V vi (+ V7, ii7, vi7)
        degs = [(0, ""), (2, "m"), (4, "m"), (5, ""), (7, ""), (9, "m"), (7, "7"), (2, "m7"), (9, "m7"),
                # secondary dominants (common in folk/country/soul): II7, VI7, III7
                (2, "7"), (9, "7"), (4, "7")]
    else:                                        # i III iv v VI VII, harmonic V, i7 iv7
        degs = [(0, "m"), (3, ""), (5, "m"), (7, "m"), (8, ""), (10, ""), (7, ""), (7, "7"), (0, "m7"), (5, "m7")]
    return [((root + d) % 12, t) for d, t in degs]


def recognise(ch, bass, cands):
    """Best chord among the candidates for a chromagram + bass chromagram. Returns (score, root, type)."""
    ch = ch / (np.linalg.norm(ch) + 1e-9)
    bass = bass / (bass.max() + 1e-9)
    best = (-9, 0, "")
    for r, name in cands:
        t = np.zeros(12); t[[(r + i) % 12 for i in CHORD_TYPES[name]]] = 1
        t /= np.linalg.norm(t)
        s = float(ch @ t) + 0.35 * bass[r] - (0.03 if name in ("7", "m7") else 0)
        if s > best[0]:
            best = (s, r, name)
    return best


def main():
    args = sys.argv[1:]
    src, track_id = args[0], args[1]
    opt = lambda k, cast=str: cast(args[args.index(k) + 1]) if k in args else None
    bars = opt("--bars", int)
    bpm_hint = opt("--bpm", float)

    y = decode(src)
    dur = len(y) / SR

    # --- key ---
    corr, root, mode = detect_key(chroma(y))
    if opt("--root"):
        root = NOTE_NAMES.index(opt("--root")); corr = float("nan")
    if opt("--mode"):
        mode = opt("--mode")

    # --- tempo & beats ---
    env, fps = onset_envelope(y)
    bpm, phase = beat_grid(env, fps, bpm_hint)
    period = 60 / bpm
    beats = np.arange(phase, dur, period)

    # chroma per beat (harmony 60–2000 Hz, bass 35–200 Hz)
    n_fft, hop = 4096, 512
    mag = stft_mag(y, n_fft, hop)
    t_fr = (np.arange(mag.shape[0]) * hop + n_fft / 2) / SR
    harm = chroma_matrix(mag, n_fft, 60, 2000)
    low = chroma_matrix(mag, n_fft, 35, 200)

    def seg(mat, a, b):
        m = (t_fr >= a) & (t_fr < b)
        return mat[m].sum(axis=0) if m.any() else np.zeros(12)

    bar_len = 4 * period
    cands = candidate_chords(root, mode, opt("--style") or "")

    def bar_vectors(first, nbars):
        H = np.array([seg(harm, first + i * bar_len, first + (i + 1) * bar_len) for i in range(nbars)])
        L = np.array([seg(low, first + i * bar_len, first + (i + 1) * bar_len) for i in range(nbars)])
        return H, L

    # Bar line: chords change on beat 1, so with the right bar line the first and
    # second half of each bar contain the SAME chord. Try the 4 possible positions
    # and keep the one where the two halves of every bar sound most alike.
    if opt("--downbeat") is not None:
        bar_phase = opt("--downbeat", int)
    else:
        half = bar_len / 2
        scores = []
        for p in range(4):
            first = beats[p]
            n = int((dur - first) // bar_len)
            sims = []
            for i in range(n):
                a0 = first + i * bar_len
                h1 = seg(harm, a0, a0 + half) + 2 * seg(low, a0, a0 + half)
                h2 = seg(harm, a0 + half, a0 + bar_len) + 2 * seg(low, a0 + half, a0 + bar_len)
                sims.append(h1 @ h2 / (np.linalg.norm(h1) * np.linalg.norm(h2) + 1e-9))
            scores.append(np.mean(sims))
        bar_phase = int(np.argmax(scores))

    # Loop start: the downbeat (allow the very start of the file) that fits the most bars.
    downbeats = beats[bar_phase::4]
    downbeats = np.concatenate([[downbeats[0] - bar_len], downbeats])  # the bar line just before the file starts
    options = []
    for d in downbeats[downbeats >= -0.12][:4]:
        st0 = max(0.0, float(d))
        n = int((dur - st0 - 0.52) // bar_len)   # need loop + 0.5 s for the cross-fade
        n = n - n % 4
        options.append((n, -st0, st0))
    nbars, _, start = max(options)
    if bars is None:
        bars = max(4, nbars)
    loop = bars * bar_len
    xfade = 0.5

    # Chords per bar. Progressions repeat, so average each bar position over its
    # repeats (period 4, 8 or 12 bars, whichever repeats best) before deciding.
    H, L = bar_vectors(start, bars)
    Hn = H / (np.linalg.norm(H, axis=1, keepdims=True) + 1e-9)
    best_p, best_sim = bars, -1
    if opt("--period"):
        best_p = opt("--period", int)
    else:
        for P in (4, 8, 12):
            if P < bars and bars % P == 0:
                sim = np.mean([Hn[i] @ Hn[i + P] for i in range(bars - P)])
                if sim > 0.93 and sim > best_sim + 0.02:   # only average if it really repeats
                    best_p, best_sim = P, sim
    key_name = NOTE_NAMES[root] + ("m" if mode == "minor" else "")
    names = NOTE_NAMES if key_name in FLAT_KEYS else SHARP_NAMES
    pattern = []
    if (opt("--style") or "") == "blues" and bars % 12 == 0:
        # A 12-bar blues has a fixed form. Find which bar of the form the loop
        # starts on (standard and "quick change" versions) instead of guessing bar by bar.
        I, IV, V = [(root + d) % 12 for d in (0, 5, 7)]
        forms = {"standard": [I, I, I, I, IV, IV, I, I, V, IV, I, V],
                 "quick change": [I, IV, I, I, IV, IV, I, I, V, IV, I, V]}
        def fit(r, Hb, Lb):
            return recognise(Hb, Lb, [(r, "7")])[0]
        best = (-9, None, None)
        for fname, form in forms.items():
            for rot in range(12):
                sc = sum(fit(form[(i + rot) % 12], H[i], L[i]) for i in range(bars))
                if sc > best[0]:
                    best = (sc, fname, rot)
        _, fname, rot = best
        form = forms[fname]
        pattern = [names[form[(i + rot) % 12]] + "7" for i in range(12)]
        best_p = 12
    else:
        for pos in range(best_p):
            _, r, t = recognise(H[pos::best_p].sum(axis=0), L[pos::best_p].sum(axis=0), cands)
            pattern.append(names[r] + t)
    chords = [pattern[i % best_p] for i in range(bars)]

    out_dir = os.path.join("audio", "tracks", track_id)
    report = {
        "id": track_id, "root": root, "key": NOTE_NAMES[root], "mode": mode,
        "keyConfidence": None if corr != corr else round(float(corr), 3),
        "bpm": round(bpm, 2), "bars": bars, "loopSeconds": round(loop, 4),
        "loopStartInOriginal": round(start, 3), "progressionBars": best_p, "chordsPerBar": chords,
    }
    if "--analyse-only" in args:
        print(json.dumps(report, indent=2)); return

    # --- seamless loop (sample-accurate, numpy) ---
    os.makedirs(out_dir, exist_ok=True)
    tmp = os.path.join(out_dir, "_loop.wav")
    sr_out = 44100
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(sr_out),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    a, n, x = int(round(start * sr_out)), int(round(loop * sr_out)), int(xfade * sr_out)
    body = st[a:a + n].copy()
    tail = st[a + n:a + n + x]
    w = np.linspace(0, np.pi / 2, len(tail))[:, None]
    body[:len(tail)] = body[:len(tail)] * np.sin(w) + tail * np.cos(w)  # equal-power cross-fade
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr_out), "-ac", "2",
                    "-i", "-", tmp], input=body.astype(np.float32).tobytes(), check=True)

    for shift in range(-5, 7):
        key = NOTE_NAMES[(root + shift) % 12]
        ratio = 2 ** (shift / 12)
        af = f"rubberband=pitch={ratio:.6f}:pitchq=quality:formant=preserved" if shift else "anull"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", af,
                        "-codec:a", "libmp3lame", "-b:a", "128k",
                        os.path.join(out_dir, f"{key}.mp3")], check=True)
    os.remove(tmp)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
