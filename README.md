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
- **Jam room** (`js/jam.js`): pick a rhythm (7 grooves), a key (12) and a tempo (±30 %), choose a scale
  and improvise. Shows the chord playing now, the next chord, the progression and highlights the
  current chord's notes inside the scale. Tempo changes use a WSOLA time-stretch (key unchanged).
- **Fretboard & Tuner** (`js/fretboard.js`): retune strings by dragging, chords with every playable shape,
  scales across the neck, finger suggestions.
- **Chords** and **Basics** pages.

## Backing tracks

Each track was generated once with ElevenLabs Music (30 s, instrumental) and processed with
`tools/make_tracks.py` (needs ffmpeg with Rubber Band):

1. measures the tempo to 0.01 BPM (beat grid fitted to the onsets) and finds beat 1 of each bar,
2. starts the loop exactly on a downbeat, keeps a whole number of bars and cross-fades the end into the start,
3. detects the key (chromagram + key profiles) and recognises the chord of every bar,
4. pitch-shifts the loop into all 12 keys **without changing the tempo** → `audio/tracks/<id>/<Key>.mp3`,
5. prints the JSON used in `TRACKS` (js/school.js).

```bash
python3 tools/make_tracks.py original.mp3 my-track --bpm 96                       # tempo hint from the prompt
python3 tools/make_tracks.py original.mp3 my-track --bpm 96 --root E --mode major  # override the key
python3 tools/make_tracks.py original.mp3 blues --bpm 96 --root E --style blues --period 12 --bars 12
python3 tools/make_tracks.py original.mp3 my-track --analyse-only                 # just print the analysis
```

Then add the printed values to `TRACKS` in `js/school.js` (plus a title, style and the scales that fit).
Always check the result: the AI often ignores the key/progression asked for in the prompt, and
harmonically ambiguous tracks (e.g. jazzy chords) should be left out rather than mislabelled.

## Archived

The song pages (chord charts, public-domain lyrics) are in `archive/` and not loaded by the site.
