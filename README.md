# Cifra Online School

Learn guitar scales step by step. A static site (plain HTML/CSS/JS, no build step).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Backing tracks are loaded with `fetch()`, so use a local server (or GitHub Pages).
The single file `cifra-online.html` works offline for everything except the audio
(put the `audio/` folder next to it for that).

## What's inside

- **School** (`js/school.js`): the *Scales for Beginners* learning trail with 10 lessons in 4 units:
  foundations, minor pentatonic, major scale, major pentatonic, blues and a jam session.
  Each lesson has theory, an interactive neck, a metronome, a practice checklist and,
  from lesson 4 on, a looping backing track in any of the 12 keys. Progress is saved in the browser.
- **Fretboard & Tuner** (`js/fretboard.js`): retune strings by dragging, chords with every playable shape,
  scales across the neck, finger suggestions.
- **Chords** and **Basics** pages.

## Backing tracks

Each track was generated once with ElevenLabs Music (30 s, instrumental) and processed with
`tools/make_tracks.py` (needs ffmpeg with Rubber Band):

1. detects the real key (chromagram + key profiles) and tempo,
2. cuts a whole number of bars and cross-fades the end into the start for a seamless loop,
3. pitch-shifts the loop into all 12 keys **without changing the tempo** → `audio/tracks/<id>/<Key>.mp3`.

```bash
python3 tools/make_tracks.py original.mp3 my-track            # auto-detect key
python3 tools/make_tracks.py original.mp3 my-track --root E   # override the key
```

Then add the track to `TRACKS` in `js/school.js` (root, mode and chords as heard).

## Archived

The song pages (chord charts, public-domain lyrics) are in `archive/` and not loaded by the site.
