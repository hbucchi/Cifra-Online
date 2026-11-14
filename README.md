# Cifra Online

Acoustic guitar chord charts for beginners, starting with The Beatles.

A static site (plain HTML/CSS/JS, no build step).

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Or publish it with GitHub Pages (Settings → Pages → deploy from branch, root folder).

## Features

- Song list with search (by title or chord), difficulty filter and favourites
- Chord charts as bars, with section repeats and notes
- Chord diagrams for every chord. Tap one to hear it (synthesised guitar)
- Transpose (±½ step), capo control, and an **Easy shapes** button that keeps the same pitch but picks easy open shapes plus a capo
- Strumming pattern with a "hear it" preview
- Auto-scroll, text size, left-handed diagrams, print view
- Chord library and a "Start here" page with tuning reference notes
- **My lyrics sheet**: each user can add the words from their own copy in ChordPro style (`[C]word`). Chords render above the words and follow transpose. Saved only in that browser; no lyrics ship with the site

## Adding a song

Add an object to `js/songs.js`. Write each section line as bars separated by `|`. Chords in the same bar are separated by spaces:

```js
{ name: "Verse", lines: ["C | G | Am | F", "C G | F C"], repeat: 2 }
```

Lyrics are intentionally not included (copyright).
