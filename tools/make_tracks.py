"""
Turn one generated backing track into a seamless loop in all 12 keys.

Usage:
    python3 tools/make_tracks.py <input.mp3> <track-id> [--bars N] [--bpm BPM] [--root Db] [--mode major]

What it does (needs ffmpeg built with the Rubber Band library):
  1. Decodes the audio and DETECTS ITS KEY: it measures how much energy each of
     the 12 note names (C, C#, … B) has (a "chromagram") and compares that
     profile with the classic Krumhansl key profiles for every major and minor
     key. The best correlation wins.
  2. DETECTS THE TEMPO from the rhythm (autocorrelation of note onsets) unless
     --bpm is given, and cuts a whole number of bars so the loop stays in time.
  3. Makes the loop SEAMLESS: the last half-second is cross-faded into the start.
  4. PITCH-SHIFTS the loop to every key from -5 to +6 semitones with Rubber Band,
     which changes pitch WITHOUT changing speed, and saves one MP3 per key:
        audio/tracks/<track-id>/<Key>.mp3
  5. Prints a JSON snippet with the detected key, mode, tempo and loop length.
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 22050
NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
# Krumhansl–Kessler key profiles (how strongly each scale degree is heard in a key).
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def decode(path, sr=SR):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def chroma(y, sr=SR, n_fft=8192, hop=2048):
    win = np.hanning(n_fft)
    freqs = np.fft.rfftfreq(n_fft, 1 / sr)
    valid = (freqs > 60) & (freqs < 2000)
    midi = 69 + 12 * np.log2(freqs[valid] / 440.0)
    pcs = np.mod(np.round(midi).astype(int), 12)
    total = np.zeros(12)
    for start in range(0, len(y) - n_fft, hop):
        mag = np.abs(np.fft.rfft(y[start:start + n_fft] * win))[valid]
        np.add.at(total, pcs, mag ** 2)
    return total / total.max()


def detect_key(c):
    best = None
    for root in range(12):
        for mode, prof in (("major", MAJOR), ("minor", MINOR)):
            r = np.corrcoef(np.roll(prof, root), c)[0, 1]
            if best is None or r > best[0]:
                best = (r, root, mode)
    return best


def detect_bpm(y, sr=SR, hop=512):
    # Onset strength: positive change in energy between frames.
    frames = len(y) // hop
    energy = np.array([np.sum(y[i * hop:(i + 1) * hop] ** 2) for i in range(frames)])
    onset = np.maximum(0, np.diff(np.log1p(energy * 1000)))
    onset -= onset.mean()
    ac = np.correlate(onset, onset, mode="full")[len(onset) - 1:]
    fps = sr / hop
    lags = np.arange(len(ac))
    bpms = 60 * fps / np.maximum(lags, 1)
    mask = (bpms >= 70) & (bpms <= 160)
    lag = lags[mask][np.argmax(ac[mask])]
    return 60 * fps / lag


def main():
    args = sys.argv[1:]
    src, track_id = args[0], args[1]
    bars = int(args[args.index("--bars") + 1]) if "--bars" in args else None
    bpm = float(args[args.index("--bpm") + 1]) if "--bpm" in args else None

    y = decode(src)
    dur = len(y) / SR
    corr, root, mode = detect_key(chroma(y))
    # Manual override when the detector is fooled (e.g. a blues full of
    # dominant-7th chords, or a progression that fits two keys): check the
    # bass line by ear or with an analysis, then pass --root D# --mode minor.
    if "--root" in args:
        root = NOTE_NAMES.index(args[args.index("--root") + 1]); corr = float("nan")
    if "--mode" in args:
        mode = args[args.index("--mode") + 1]
    if bpm is None:
        bpm = detect_bpm(y)
    bar = 4 * 60 / bpm
    skip = min(1.0, bar / 2)                       # skip a possible soft start
    if bars is None:
        bars = int((min(dur - skip - 0.6, 30.5)) // bar)
    loop = bars * bar
    xfade = 0.5

    out_dir = os.path.join("audio", "tracks", track_id)
    os.makedirs(out_dir, exist_ok=True)
    tmp = os.path.join(out_dir, "_loop.wav")
    # Seamless loop, done sample-accurately with numpy:
    #   body = audio[skip : skip+loop]          (a whole number of bars)
    #   tail = audio[skip+loop : skip+loop+x]   (what would come next)
    # The tail fades out while the start of the body fades in (equal-power
    # cross-fade), so when the loop jumps back to the start it sounds continuous.
    sr_out = 44100
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "2", "-ar", str(sr_out),
                          "-f", "f32le", "-"], check=True, capture_output=True).stdout
    st = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    a, n, x = int(skip * sr_out), int(round(loop * sr_out)), int(xfade * sr_out)
    body = st[a:a + n].copy()
    tail = st[a + n:a + n + x]
    t = np.linspace(0, np.pi / 2, len(tail))[:, None]
    body[:len(tail)] = body[:len(tail)] * np.sin(t) + tail * np.cos(t)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(sr_out), "-ac", "2",
                    "-i", "-", tmp], input=body.astype(np.float32).tobytes(), check=True)

    keys = []
    for shift in range(-5, 7):
        key = NOTE_NAMES[(root + shift) % 12]
        out = os.path.join(out_dir, f"{key}.mp3")
        ratio = 2 ** (shift / 12)
        af = f"rubberband=pitch={ratio:.6f}:pitchq=quality:formant=preserved" if shift else "anull"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", af,
                        "-codec:a", "libmp3lame", "-b:a", "128k", out], check=True)
        keys.append(key)
    os.remove(tmp)

    print(json.dumps({
        "id": track_id,
        "detectedKey": NOTE_NAMES[root],
        "mode": mode,
        "keyConfidence": None if corr != corr else round(float(corr), 3),
        "bpm": round(bpm, 1),
        "bars": bars,
        "loopSeconds": round(loop, 3),
        "keys": keys,
    }, indent=2))


if __name__ == "__main__":
    main()
