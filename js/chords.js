/*
 * Chord theory helpers: parsing, transposition, fingering lookup and
 * SVG chord diagrams.
 *
 * Fret arrays go from the LOW E string (6th) to the HIGH E string (1st).
 *   -1 = don't play the string (x), 0 = open string (o), n = press fret n
 * Finger numbers: 1 index, 2 middle, 3 ring, 4 pinky, 0 = none.
 */

const SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

// Open-string pitches in Hz for standard tuning E2 A2 D3 G3 B3 E4.
const OPEN_STRINGS = [
  { name: "E", octave: 2, freq: 82.41 },
  { name: "A", octave: 2, freq: 110.0 },
  { name: "D", octave: 3, freq: 146.83 },
  { name: "G", octave: 3, freq: 196.0 },
  { name: "B", octave: 3, freq: 246.94 },
  { name: "E", octave: 4, freq: 329.63 }
];

// Beginner-friendly open shapes. `barre` = {fret, from, to} string indices.
const CHORD_LIBRARY = {
  // Major
  C:  { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  D:  { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  E:  { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  F:  { frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], barre: { fret: 1, from: 4, to: 5 }, note: "Easy 'mini F' (4 strings)" },
  G:  { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  A:  { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  Bb: { frets: [-1, 1, 3, 3, 3, 1], fingers: [0, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 } },
  // Minor
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  Bm: { frets: [-1, -1, 4, 4, 3, 2], fingers: [0, 0, 3, 4, 2, 1], note: "Easy 4-string Bm" },
  // Sevenths
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  // Minor sevenths
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], barre: { fret: 1, from: 4, to: 5 } },
  Em7: { frets: [0, 2, 0, 0, 0, 0], fingers: [0, 2, 0, 0, 0, 0] },
  "F#m7": { frets: [-1, -1, 2, 2, 2, 2], fingers: [0, 0, 1, 1, 1, 1], barre: { fret: 2, from: 2, to: 5 }, note: "Easy 4-string F#m7" }
};

// Movable barre templates (relative to the barre fret).
const BARRE_SHAPES = {
  E: {
    rootString: 0, openRoot: 4, // E
    maj: { frets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
    min: { frets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
    "7": { frets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
    m7: { frets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] }
  },
  A: {
    rootString: 1, openRoot: 9, // A
    maj: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 3, 3, 3, 1] },
    min: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
    "7": { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
    m7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] }
  }
};

function noteIndex(note) {
  let i = SHARPS.indexOf(note);
  if (i === -1) i = FLATS.indexOf(note);
  return i;
}

function parseChord(name) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(name.trim());
  if (!m) return null;
  return { root: m[1], suffix: m[2] || "", bass: m[3] || null };
}

// Keys that are conventionally written with flats.
const FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm"];

function transposeNote(note, semitones, useFlats) {
  const i = noteIndex(note);
  if (i === -1) return note;
  const j = ((i + semitones) % 12 + 12) % 12; // modulo that also works for negatives
  return (useFlats ? FLATS : SHARPS)[j];
}

function transposeKey(key, semitones) {
  const p = parseChord(key);
  if (!p) return key;
  // Choose spelling of the resulting key: try sharps, switch to flats if conventional.
  const sharpName = transposeNote(p.root, semitones, false) + p.suffix;
  const flatName = transposeNote(p.root, semitones, true) + p.suffix;
  return FLAT_KEYS.includes(flatName) ? flatName : sharpName;
}

function transposeChord(name, semitones, useFlats) {
  if (semitones === 0) return name;
  const p = parseChord(name);
  if (!p) return name;
  let out = transposeNote(p.root, semitones, useFlats) + p.suffix;
  if (p.bass) out += "/" + transposeNote(p.bass, semitones, useFlats);
  return out;
}

function keyUsesFlats(key) {
  return FLAT_KEYS.includes(key);
}

function quality(suffix) {
  if (suffix === "" || suffix.startsWith("maj") || suffix.startsWith("sus") || suffix === "6" || suffix === "add9") return "maj";
  if (suffix === "7" || suffix === "9") return "7";
  if (suffix === "m7") return "m7";
  if (suffix.startsWith("m") || suffix.startsWith("dim")) return "min";
  return "maj";
}

const SUFFIX_FOR_QUALITY = { maj: "", min: "m", "7": "7", m7: "m7" };

/*
 * Find a fingering for any chord name.
 * 1. Use the open-chord library (also trying the enharmonic spelling, e.g. A# = Bb).
 * 2. Otherwise build a movable barre chord on the E or A string, whichever is lower on the neck.
 */
function getFingering(name) {
  const p = parseChord(name);
  if (!p) return null;
  const base = p.root + p.suffix;
  if (CHORD_LIBRARY[base]) return { name: base, ...CHORD_LIBRARY[base] };

  const idx = noteIndex(p.root);
  const q = quality(p.suffix);
  const simple = SHARPS[idx] + SUFFIX_FOR_QUALITY[q];
  const simpleFlat = FLATS[idx] + SUFFIX_FOR_QUALITY[q];
  for (const n of [simple, simpleFlat]) {
    if (CHORD_LIBRARY[n]) return { name: n, ...CHORD_LIBRARY[n], simplified: SUFFIX_FOR_QUALITY[q] !== p.suffix };
  }

  let best = null;
  for (const shapeName of ["E", "A"]) {
    const shape = BARRE_SHAPES[shapeName];
    let fret = ((idx - shape.openRoot) % 12 + 12) % 12;
    if (fret === 0) fret = 12;
    if (!best || fret < best.fret) best = { shapeName, shape, fret };
  }
  const t = best.shape[q];
  const frets = t.frets.map(f => (f < 0 ? -1 : f + best.fret));
  const from = best.shape.rootString;
  return {
    name: simple,
    frets,
    fingers: t.fingers,
    barre: { fret: best.fret, from, to: 5 },
    note: `Barre chord (${best.shapeName}-shape, fret ${best.fret})`,
    simplified: SUFFIX_FOR_QUALITY[q] !== p.suffix
  };
}

/* ---------- SVG chord diagram ---------- */

function chordDiagramSVG(name, opts = {}) {
  const f = getFingering(name);
  if (!f) return "";
  return fingeringSVG(f, name, opts);
}

/*
 * Guess a natural fingering for any fret pattern: if the lowest fret is
 * pressed on 2+ strings with nothing lower in between, use a barre (finger 1);
 * the remaining notes get fingers 2, 3, 4 from low fret to high fret.
 */
function autoFingering(frets) {
  const fretted = frets.map((f, s) => ({ f, s })).filter(x => x.f > 0);
  const fingers = frets.map(() => 0);
  if (!fretted.length) return { frets, fingers, barre: null };
  const minF = Math.min(...fretted.map(x => x.f));
  const atMin = fretted.filter(x => x.f === minF).map(x => x.s);
  let barre = null;
  if (atMin.length >= 2) {
    const from = Math.min(...atMin), to = Math.max(...atMin);
    let ok = true;
    for (let s = from; s <= to; s++) if (frets[s] < minF) ok = false;
    if (ok) barre = { fret: minF, from, to };
  }
  let next = 1;
  if (barre) { atMin.forEach(s => { fingers[s] = 1; }); next = 2; }
  fretted
    .filter(x => !(barre && x.f === minF))
    .sort((a, b) => a.f - b.f || a.s - b.s)
    .forEach(x => { fingers[x.s] = Math.min(4, next++); });
  return { frets, fingers, barre };
}

function fingeringSVG(f, name, opts = {}) {
  const lefty = !!opts.lefty;
  const frets = lefty ? [...f.frets].reverse() : f.frets;
  const fingers = lefty ? [...f.fingers].reverse() : f.fingers;
  let barre = f.barre;
  if (barre && lefty) barre = { fret: barre.fret, from: 5 - barre.to, to: 5 - barre.from };

  const played = frets.filter(x => x > 0);
  const maxFret = played.length ? Math.max(...played) : 0;
  const minFret = played.length ? Math.min(...played) : 0;
  const startFret = maxFret > 4 ? minFret : 1; // window of 4 frets
  const nFrets = 4;

  const W = 110, H = 130;
  const left = 18, top = 30, gridW = 76, gridH = 84;
  const sx = gridW / 5, fy = gridH / nFrets;
  const x = s => left + s * sx;
  const y = fr => top + (fr - startFret + 0.5) * fy;

  let svg = `<svg class="diagram" viewBox="0 0 ${W} ${H}" role="img" aria-label="${name} chord diagram">`;
  // nut or start fret label
  if (startFret === 1) {
    svg += `<rect x="${left - 1}" y="${top - 4}" width="${gridW + 2}" height="4" class="nut"/>`;
  } else {
    svg += `<text x="${left - 6}" y="${top + fy * 0.5 + 4}" class="fret-label" text-anchor="end">${startFret}</text>`;
  }
  for (let i = 0; i <= nFrets; i++) svg += `<line x1="${left}" y1="${top + i * fy}" x2="${left + gridW}" y2="${top + i * fy}" class="fret"/>`;
  for (let s = 0; s < 6; s++) svg += `<line x1="${x(s)}" y1="${top}" x2="${x(s)}" y2="${top + gridH}" class="string"/>`;

  // open / muted markers
  frets.forEach((fr, s) => {
    if (fr === 0) svg += `<circle cx="${x(s)}" cy="${top - 12}" r="4" class="open"/>`;
    if (fr === -1) svg += `<text x="${x(s)}" y="${top - 8}" class="mute" text-anchor="middle">×</text>`;
  });

  if (barre) {
    svg += `<rect x="${x(barre.from) - 6}" y="${y(barre.fret) - 6}" width="${x(barre.to) - x(barre.from) + 12}" height="12" rx="6" class="dot"/>`;
  }
  frets.forEach((fr, s) => {
    if (fr > 0) {
      const onBarre = barre && fr === barre.fret && s >= barre.from && s <= barre.to;
      if (!onBarre) svg += `<circle cx="${x(s)}" cy="${y(fr)}" r="6.5" class="dot"/>`;
      if (fingers[s] && (!onBarre || s === barre.from)) {
        svg += `<text x="${x(s)}" y="${y(fr) + 3.5}" class="finger" text-anchor="middle">${fingers[s]}</text>`;
      }
    }
  });
  svg += `</svg>`;
  return svg;
}
