/*
 * Fretboard explorer & custom tuner.
 *
 * Notes are handled as MIDI numbers: one integer per semitone, middle C = 60,
 * A4 (440 Hz) = 69. The note on string s at fret f is simply tuning[s] + f,
 * and its pitch class (C, C#, … B) is that number modulo 12.
 */

const STANDARD_TUNING = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4 (low → high)

const TUNING_PRESETS = [
  { id: "standard", name: "Standard (E A D G B E)", notes: [40, 45, 50, 55, 59, 64] },
  { id: "drop-d", name: "Drop D (D A D G B E)", notes: [38, 45, 50, 55, 59, 64] },
  { id: "half-down", name: "Half step down (E♭ A♭ D♭ G♭ B♭ E♭)", notes: [39, 44, 49, 54, 58, 63] },
  { id: "d-standard", name: "Whole step down (D G C F A D)", notes: [38, 43, 48, 53, 57, 62] },
  { id: "dadgad", name: "DADGAD (D A D G A D)", notes: [38, 45, 50, 55, 57, 62] },
  { id: "open-g", name: "Open G (D G D G B D)", notes: [38, 43, 50, 55, 59, 62] },
  { id: "open-d", name: "Open D (D A D F♯ A D)", notes: [38, 45, 50, 54, 57, 62] },
  { id: "open-e", name: "Open E (E B E G♯ B E)", notes: [40, 47, 52, 56, 59, 64] },
  { id: "open-c", name: "Open C (C G C G C E)", notes: [36, 43, 48, 55, 60, 64] }
];

const CHORD_TYPES = [
  { id: "", name: "Major", iv: [0, 4, 7] },
  { id: "m", name: "Minor", iv: [0, 3, 7] },
  { id: "7", name: "Dominant 7", iv: [0, 4, 7, 10] },
  { id: "maj7", name: "Major 7", iv: [0, 4, 7, 11] },
  { id: "m7", name: "Minor 7", iv: [0, 3, 7, 10] },
  { id: "sus2", name: "Sus2", iv: [0, 2, 7] },
  { id: "sus4", name: "Sus4", iv: [0, 5, 7] },
  { id: "6", name: "Major 6", iv: [0, 4, 7, 9] },
  { id: "m6", name: "Minor 6", iv: [0, 3, 7, 9] },
  { id: "add9", name: "Add9", iv: [0, 4, 7, 2] },
  { id: "dim", name: "Diminished", iv: [0, 3, 6] },
  { id: "aug", name: "Augmented", iv: [0, 4, 8] },
  { id: "5", name: "Power chord (5)", iv: [0, 7] }
];

const SCALE_TYPES = [
  { id: "major", name: "Major (Ionian)", iv: [0, 2, 4, 5, 7, 9, 11] },
  { id: "minor", name: "Natural minor (Aeolian)", iv: [0, 2, 3, 5, 7, 8, 10] },
  { id: "maj-pent", name: "Major pentatonic", iv: [0, 2, 4, 7, 9] },
  { id: "min-pent", name: "Minor pentatonic", iv: [0, 3, 5, 7, 10] },
  { id: "blues", name: "Blues", iv: [0, 3, 5, 6, 7, 10] },
  { id: "harm-minor", name: "Harmonic minor", iv: [0, 2, 3, 5, 7, 8, 11] },
  { id: "dorian", name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10] },
  { id: "mixolydian", name: "Mixolydian", iv: [0, 2, 4, 5, 7, 9, 10] }
];

const ROOT_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const CHORD_INTERVALS = ["R", "♭2", "9", "♭3", "3", "4", "♭5", "5", "♯5", "6", "♭7", "7"];
const SCALE_INTERVALS = ["R", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];

const pretty = n => n.replace("#", "♯").replace(/([A-G])b/, "$1♭");
const pc = m => ((m % 12) + 12) % 12;

function intervalRole(i) {
  if (i === 0) return "root";
  if (i === 3 || i === 4) return "third";
  if (i === 6 || i === 7 || i === 8) return "fifth";
  if (i === 10 || i === 11) return "seventh";
  return "other";
}

// Choose sharps or flats: for 7-note scales use the spelling that gives each
// letter exactly once (e.g. F major has B♭, not A♯); otherwise follow the root.
function chooseFlats(rootPc, pcs) {
  const letters = arr => new Set(pcs.map(p => arr[p][0])).size;
  const s = letters(SHARPS), f = letters(FLATS);
  if (pcs.length === 7 && s !== f) return f > s;
  return ROOT_NAMES[rootPc].includes("b") || rootPc === 5;
}

/*
 * Correct spelling from intervals: a 3rd always uses the letter two steps above
 * the root, a 5th four steps, a 7th six steps… So C minor's 3rd is E♭ (letter E),
 * never D♯. Returns a Map pitch-class → name for the notes of a chord/scale.
 */
function spellSet(rootPc, iv, isChord) {
  const LETTERS = "CDEFGAB";
  const NATURAL = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const letterSteps = { 0: 0, 1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 4, 8: isChord ? 4 : 5, 9: 5, 10: 6, 11: 6 };
  // Name of pitch class p using letter L (adds ♯/♭ as needed; E♯, B♯, C♭, F♭ allowed).
  const nameWith = (p, L) => {
    const d = ((p - NATURAL[L] + 18) % 12) - 6;     // -6..5 semitones away from the natural
    return d === 0 ? L : d === 1 ? L + "#" : d === -1 ? L + "b" : d === 2 ? L + "##" : d === -2 ? L + "bb" : null;
  };
  // Try both spellings of the root (e.g. C♯ and D♭) and keep the one whose notes
  // use each letter once with the fewest sharps/flats — C♯ major becomes D♭ major.
  const roots = [...new Set([SHARPS[rootPc], FLATS[rootPc], ROOT_NAMES[rootPc]])];
  let best = null;
  for (const rn of roots) {
    const r = LETTERS.indexOf(rn[0]);
    const map = new Map();
    let cost = 0, bad = false;
    for (const i of iv) {
      const p = pc(rootPc + i);
      const n = nameWith(p, LETTERS[(r + letterSteps[pc(i)]) % 7]);
      if (!n || n.length > 2) { bad = true; break; }
      if (n.length === 2) cost += 1;
      if (["E#", "B#", "Cb", "Fb"].includes(n)) cost += 0.5;
      map.set(p, n);
    }
    if (bad) continue;
    if (rn !== ROOT_NAMES[rootPc]) cost += 0.25;         // tie-break: keep the usual root name
    if (!best || cost < best.cost) best = { cost, map };
  }
  const out = new Map();
  if (best) { for (const [p, n] of best.map) out.set(p, pretty(n)); return out; }
  for (const i of iv) { const p = pc(rootPc + i); out.set(p, pretty(SHARPS[p])); }
  return out;
}

const noteName = (p, flats) => pretty((flats ? FLATS : SHARPS)[pc(p)]);
const midiName = (m, flats) => `${noteName(m, flats)}<sub>${Math.floor(m / 12) - 1}</sub>`;
const midiText = (m, flats) => `${noteName(m, flats)}${Math.floor(m / 12) - 1}`;

/*
 * Search every playable shape of a chord for a given tuning.
 * We slide a 4-fret window up the neck; on each string we may mute it, play it
 * open, or press a fret inside the window — but only on notes of the chord.
 * A shape is kept if: it has every needed chord note, there are no muted
 * strings in the middle, and it needs ≤ 4 fingers
 * (a barre counts as one finger).
 */
function findVoicings(tuning, rootPc, iv, { maxFret = 15, limit = 12 } = {}) {
  // Shapes whose lowest note is not the root (inversions, e.g. C/E) are allowed
  // but ranked lower — except in open tunings, where they are often the best shapes.
  const chordPcs = iv.map(i => pc(rootPc + i));
  // With 4+ notes, the 5th may be left out (guitarists do this all the time).
  const required = iv.length >= 4 ? chordPcs.filter((_, k) => iv[k] !== 7) : chordPcs;
  const minStrings = iv.length === 2 ? 2 : 3;
  const seen = new Map();

  for (let w = 1; w <= maxFret - 3; w++) {
    const cands = tuning.map(open => {
      const c = [-1];
      if (chordPcs.includes(pc(open))) c.push(0);
      for (let f = w; f <= w + 3; f++) if (chordPcs.includes(pc(open + f))) c.push(f);
      return c;
    });
    const cur = [];
    (function rec(s) {
      if (s === 6) {
        const v = evaluateVoicing(cur, tuning, rootPc, required, minStrings);
        if (v && !seen.has(v.key)) seen.set(v.key, v);
        return;
      }
      for (const f of cands[s]) { cur[s] = f; rec(s + 1); }
    })(0);
  }

  let list = [...seen.values()];
  // Drop shapes that are just another shape with strings removed.
  // (only if the bigger shape is no harder to play).
  list = list.filter(a => !list.some(b => b !== a && b.played > a.played && b.fingers <= a.fingers && (!b.inversion || a.inversion) &&
    a.frets.every((f, s) => f === -1 || b.frets[s] === f)));
  list.sort((a, b) => a.score - b.score);
  return list.slice(0, limit);
}

function evaluateVoicing(frets, tuning, rootPc, required, minStrings) {
  const played = frets.map((f, s) => (f >= 0 ? s : -1)).filter(s => s >= 0);
  if (played.length < minStrings) return null;
  const first = played[0], last = played[played.length - 1];
  for (let s = first; s <= last; s++) if (frets[s] < 0) return null;       // no muted string in the middle
  const bassPc = pc(tuning[first] + frets[first]);
  const inversion = bassPc !== rootPc;                                      // another chord note in the bass
  const present = new Set(played.map(s => pc(tuning[s] + frets[s])));
  if (!required.every(p => present.has(p))) return null;

  const fretted = played.map(s => frets[s]).filter(f => f > 0);
  const opens = played.length - fretted.length;
  let fingers = 0, minFingers = 0, barre = false, barreCount = 0, minF = 0, maxF = 0, columns = 0;
  if (fretted.length) {
    minF = Math.min(...fretted); maxF = Math.max(...fretted);
    if (maxF - minF > 3) return null;
    // One finger can press several notes on the same fret (barre) — see autoFingering.
    const plan = autoFingering(frets);
    fingers = plan.count;
    if (fingers > 4) return null;
    barreCount = plan.barres.length;
    barre = plan.barres.some(b => b.fret === minF);
    columns = new Set(fretted).size; // how many different frets ("columns") the hand covers
    minFingers = plan.minCount;     // fewest fingers if one finger takes each barrable column
  }
  // Lower score = better. Fewer columns and fewer fingers are rewarded, so
  // shapes where one finger covers several notes rank higher.
  const score = minF * 1.4 + (maxF - minF) + minFingers * 1.0 + columns * 0.7
    - played.length * 1.5 - opens * 0.7 + (inversion ? 4 : 0)
    + (5 - last) * 1.5; // muting thin strings while strumming is hard
  return { frets: [...frets], key: frets.join(","), played: played.length, fingers, barre, barreCount, columns, minF, score, bassPc, inversion };
}

// Which chord do the open strings make? (Open tunings are designed for this.)
function detectChord(pcsList) {
  const set = [...new Set(pcsList.map(pc))].sort((a, b) => a - b);
  for (const t of CHORD_TYPES) {
    for (let r = 0; r < 12; r++) {
      const c = [...new Set(t.iv.map(i => pc(r + i)))].sort((a, b) => a - b);
      if (c.length === set.length && c.every((p, k) => p === set[k])) return { root: r, type: t };
    }
  }
  return null;
}

const fretsText = frets => frets.map(f => (f < 0 ? "x" : f)).join(frets.some(f => f > 9) ? "-" : "");

/* ---------------- Page ---------------- */

function renderTuner() {
  setActiveNav("tuner");
  document.title = "Fretboard & Tuner — Cifra Online";

  const saved = store.get("fb", {});
  const st = {
    tuning: Array.isArray(saved.tuning) && saved.tuning.length === 6 ? saved.tuning : [...STANDARD_TUNING],
    mode: saved.mode || "chord",
    chordRoot: saved.chordRoot ?? 0,
    chordType: saved.chordType ?? "",
    scaleRoot: saved.scaleRoot ?? 9,
    scaleType: saved.scaleType ?? "min-pent",
    scalePos: saved.scalePos ?? null, // hand position for scale fingering (fret of finger 1)
    scaleView: saved.scaleView || "shapes", // "neck" | "pattern" | "shapes" | "octave" | "all"
    scaleShape: saved.scaleShape ?? 0,      // which hand-position shape is selected
    fretRange: Array.isArray(saved.fretRange) ? saved.fretRange : [0, 15], // revealed frets (scale mode)
    labels: saved.labels || "names",
    showAll: saved.showAll ?? false,
    voicing: 0,
    focus: null, // { pc, midi } — the note the user tapped
    custom: null, // frets of a shape the user is building by tapping notes
    activeString: null // string whose options are highlighted
  };
  const FRETS = 15;
  const save = () => store.set("fb", {
    tuning: st.tuning, mode: st.mode, chordRoot: st.chordRoot, chordType: st.chordType,
    scaleRoot: st.scaleRoot, scaleType: st.scaleType, scalePos: st.scalePos, scaleView: st.scaleView, scaleShape: st.scaleShape, fretRange: st.fretRange, labels: st.labels, showAll: st.showAll
  });

  app.innerHTML = `
    <h1>Fretboard &amp; Tuner</h1>
    <p class="lead">Retune any string by <strong>dragging it sideways</strong> (or with − / +), then pick a chord or a scale to see where its notes are — and which shapes work in your tuning.</p>

    <section class="panel fb-panel">
      <div class="fb-tuning-bar">
        <label class="tool"><span class="tool-label">Tuning</span>
          <select id="preset"></select></label>
        <button class="btn" id="strumOpen">▶ Strum open strings</button>
        <button class="btn" id="resetTuning">↺ Standard tuning (E A D G B E)</button>
      </div>
      <div id="tuningInfo" class="fb-tuning-info"></div>
    </section>

    <div class="fb-mode-row">
      <span class="tool-label">Show on the neck</span>
      <div class="fb-seg fb-modes" role="tablist">
        <button class="tab" data-mode="notes">All notes</button>
        <button class="tab" data-mode="chord">Chord</button>
        <button class="tab" data-mode="scale">Scale</button>
      </div>
    </div>
    <section id="pickers" class="fb-pickers"></section>

    <div class="fb-options">
      <div class="chips" role="group" aria-label="Labels">
        <button class="chip" data-labels="names">Note names</button>
        <button class="chip" data-labels="intervals">Intervals</button>
        <button class="chip" data-labels="fingers" id="fingersChip">Fingers ✋</button>
      </div>
      <label class="toggle"><input type="checkbox" id="showAll"> Show other notes</label>
      <label class="toggle"><input type="checkbox" id="fbLefty"> Left-handed</label>
      <button class="btn small" id="fullBtn" hidden>⛶ Full screen</button>
    </div>
    <p class="hint rotate-hint">📱↻ Turn your phone sideways to see the whole neck.</p>

    <div class="fb-stage" id="stage">
      <div class="fb-stage-bar">
        <span class="fb-stage-tuning" id="stageTuning"></span>
        <button class="btn small" id="stdBtn">↺ Standard tuning (E A D G B E)</button>
      </div>
      <div class="fb-wrap"><div class="fb" id="fb"></div></div>
      <div id="shapeInfo"></div>
      <div id="focusInfo" class="fb-focus"></div>
      <div id="legend" class="fb-legend"></div>
    </div>

    <section id="voicings"></section>
  `;

  $("#preset").innerHTML = TUNING_PRESETS.map(p => `<option value="${p.id}">${p.name}</option>`).join("") +
    `<option value="custom">Custom</option>`;

  const chordType = () => CHORD_TYPES.find(t => t.id === st.chordType) || CHORD_TYPES[0];
  const scaleType = () => SCALE_TYPES.find(t => t.id === st.scaleType) || SCALE_TYPES[0];

  // The "active" set of notes for chord / scale mode.
  function activeSet() {
    if (st.mode === "chord") {
      const t = chordType();
      const pcs = t.iv.map(i => pc(st.chordRoot + i));
      return withSpelling({ root: st.chordRoot, iv: t.iv, pcs, flats: chooseFlats(st.chordRoot, pcs), names: CHORD_INTERVALS }, true);
    }
    if (st.mode === "scale") {
      const t = scaleType();
      const pcs = t.iv.map(i => pc(st.scaleRoot + i));
      return withSpelling({ root: st.scaleRoot, iv: t.iv, pcs, flats: chooseFlats(st.scaleRoot, pcs), names: SCALE_INTERVALS }, false);
    }
    return null;
  }

  function withSpelling(a, isChord) {
    a.spell = spellSet(a.root, a.iv, isChord);
    a.nm = p => a.spell.get(pc(p)) || noteName(p, a.flats);
    return a;
  }
  // Name a note: use the chord/scale spelling when the note belongs to it.
  const nameIn = (a, p) => (a ? a.nm(p) : noteName(p, false));

  // Default hand position for a scale: where the root sits on the 6th string.
  const scalePos = () => (st.scalePos !== null ? st.scalePos : pc(st.scaleRoot - st.tuning[0]));
  // One finger per fret: a 4-fret window starting at the position.
  // Position 0 = open position (open strings + frets 1–4).
  function scaleFinger(f) {
    const pos = scalePos();
    if (pos === 0) return f <= 4 ? f : null;
    return f >= pos && f <= pos + 3 ? f - pos + 1 : null;
  }
  /*
   * Scale views (all built by js/scales.js, shared with the School and Jam room):
   *  neck    – Across the neck: every pitch once, a diagonal "travel route"
   *  pattern – One position: the root's shape on its own
   *  shapes  – Shapes: pick any of the hand positions; the rest of the scale is faded
   *  octave  – one octave from the root
   */
  function scalePattern(a) {
    if (st.mode !== "scale" || st.scaleView === "all") return null;
    const iv = [...a.iv].sort((x, y) => x - y);
    if (st.scaleView === "neck") return finishPattern(acrossNeck(a.root, iv, st.tuning, FRETS));
    if (st.scaleView === "octave") return finishPattern(oneOctave(a.root, iv, st.tuning, FRETS));
    const shapes = scaleShapes(a.root, iv, st.tuning, FRETS);
    if (!shapes.length) return null;
    const idx = st.scaleView === "pattern" ? 0 : Math.min(st.scaleShape || 0, shapes.length - 1);
    const sel = shapes[idx];
    if (st.scaleView === "pattern") return finishPattern(sel.cells, { band: [sel.lo, sel.hi], shape: sel, shapes });
    const inShape = (s, f) => sel.cells.some(c => c.s === s && c.f === f);
    return finishPattern(sel.cells, { has: () => true, inShape, band: [sel.lo, sel.hi], shape: sel, shapes });
  }

  function finishPattern(cells, extra = {}) {
    const fingerOf = new Map(cells.map(c => [c.s + ":" + c.f, c.finger]));
    return {
      cells, ...extra,
      has: extra.has || ((s, f) => cells.some(c => c.s === s && c.f === f)),
      finger: (f, s) => (f === 0 ? 0 : fingerOf.get(s + ":" + f) || 1)
    };
  }

  const fingerText = v => v.fingers === 0 ? "No fingers — all open"
    : `${v.fingers} finger${v.fingers === 1 ? "" : "s"}` +
      (v.barreCount ? ` · ${v.barreCount === 1 ? "1 finger presses several notes" : v.barreCount + " fingers press several notes"}` : "");

  // The shape shown on the neck: the user's own, or the selected suggestion.
  function currentShape() {
    if (st.custom && st.mode !== "notes") return { frets: st.custom, custom: true };
    return st.mode === "chord" ? voicings[st.voicing] : null;
  }

  let voicings = [];

  /* ----- Tuning panel ----- */
  function drawTuningInfo() {
    const preset = TUNING_PRESETS.find(p => p.notes.every((n, k) => n === st.tuning[k]));
    $("#preset").value = preset ? preset.id : "custom";
    const isStd = st.tuning.every((m, k) => m === STANDARD_TUNING[k]);
    $("#stageTuning").innerHTML = `Tuning: <strong>${st.tuning.map(m => noteName(m, false)).join(" ")}</strong>${isStd ? " (standard)" : ""}`;
    for (const id of ["#stdBtn", "#resetTuning"]) {
      $(id).disabled = isStd;
      $(id).title = isStd ? "Already in standard tuning" : "Retune all strings to E A D G B E";
    }
    const flats = false;
    const changes = st.tuning.map((m, s) => ({ s, m, d: m - STANDARD_TUNING[s] })).filter(x => x.d !== 0);
    const openChord = detectChord(st.tuning);
    const ordinal = s => ["6th", "5th", "4th", "3rd", "2nd", "1st"][s];

    $("#tuningInfo").innerHTML = `
      <p class="fb-tuning-names">${st.tuning.map(m => `<span>${midiName(m, flats)}</span>`).join("")}</p>
      ${openChord ? `<p class="callout">🎸 Strummed open, your strings form a <strong>${noteName(openChord.root, chooseFlats(openChord.root, openChord.type.iv))}${openChord.type.id}</strong> chord (${openChord.type.name}). That's an <em>open tuning</em>: one finger across all strings (a barre) gives you a new chord at every fret.</p>` : ""}
      ${changes.length ? `<ul class="fb-changes">${changes.slice().reverse().map(c => {
        const dir = c.d < 0 ? "down" : "up";
        const n = Math.abs(c.d);
        const warn = c.d > 2 ? ` <span class="warn">⚠ ${c.d} semitones above standard — high string tension, it may break.</span>`
          : c.d < -5 ? ` <span class="warn">⚠ very slack — the string may buzz.</span>` : "";
        return `<li><strong>${ordinal(c.s)} string</strong>: ${midiText(STANDARD_TUNING[c.s])} → ${midiText(c.m)} (tuned ${dir} ${n} semitone${n > 1 ? "s" : ""}).
          Every note on this string is now ${n} fret${n > 1 ? "s" : ""} ${c.d < 0 ? "<em>higher up</em>" : "<em>lower down</em>"} the neck than in standard tuning.${warn}</li>`;
      }).join("")}</ul>` : `<p class="hint">Standard tuning. Drag a string left or right (or use − / +) to retune it.</p>`}
    `;
  }

  /* ----- Mode pickers ----- */
  function drawPickers() {
    document.querySelectorAll(".fb-modes .tab").forEach(t => t.classList.toggle("on", t.dataset.mode === st.mode));
    const p = $("#pickers");
    if (st.mode === "notes") {
      p.innerHTML = `<p class="hint">Every note on the neck. Natural notes (no ♯/♭) are highlighted — learning where they are is the first step to knowing the fretboard.</p>`;
      return;
    }
    const isChord = st.mode === "chord";
    const root = isChord ? st.chordRoot : st.scaleRoot;
    const types = isChord ? CHORD_TYPES : SCALE_TYPES;
    const typeId = isChord ? st.chordType : st.scaleType;
    const a = activeSet();
    const names = a.pcs.map(x => `<button class="note-link ${st.focus && st.focus.pc === x ? "on" : ""}" data-focus-pc="${x}">${a.nm(x)}</button>`);
    const ivNames = a.iv.map(i => a.names[i]);
    let formula = "";
    if (isChord) {
      formula = `<strong>${a.nm(root)}${chordType().id}</strong> = ${names.join(" · ")} <span class="hint">(${ivNames.join(" · ")})</span>`;
    } else {
      const sorted = [...a.iv].sort((x, y) => x - y);
      const steps = sorted.map((v, k) => (k + 1 < sorted.length ? sorted[k + 1] : 12) - v)
        .map(d => ({ 1: "H", 2: "W", 3: "W+H", 4: "2W" }[d] || d));
      formula = `<strong>${a.nm(root)} ${scaleType().name}</strong> = ${names.join(" · ")}
        <span class="hint">(steps: ${steps.join(" ")} — W = whole tone = 2 frets, H = half tone = 1 fret)</span>`;
    }
    p.innerHTML = `
      <div class="chips fb-roots" role="group" aria-label="Root note">
        ${ROOT_NAMES.map((n, i) => `<button class="chip ${i === root ? "on" : ""}" data-root="${i}">${pretty(n)}</button>`).join("")}
      </div>
      <div class="chips fb-types" role="group" aria-label="${isChord ? "Chord type" : "Scale type"}">
        ${types.map(t => `<button class="chip ${t.id === typeId ? "on" : ""}" data-type="${t.id}">${isChord ? (a.nm(root) + t.id) : t.name}</button>`).join("")}
      </div>
      <p class="fb-formula">${formula}
        ${isChord ? `<button class="btn small" id="playChord">▶ Play</button>` : `<button class="btn small" id="playScale">▶ Play scale</button>`}</p>
      ${isChord ? "" : `<div class="fb-pos"><span class="tool-label">View</span>
        ${[["neck", "Across the neck"], ["pattern", "One position"], ["shapes", "Shapes"], ["octave", "One octave"], ["all", "Every note"]]
          .map(([id, l]) => `<button class="chip ${st.scaleView === id ? "on" : ""}" data-view="${id}">${l}</button>`).join("")}</div>`}
      ${!isChord && st.scaleView === "neck" ? `<p class="hint">A travel route: each pitch once, from the open 6th string to fret ${FRETS} of the 1st string. Your hand slides along the strings as it climbs — to play without moving the hand, use <strong>Shapes</strong>.</p>` : ""}
      ${!isChord && st.scaleView === "pattern" ? `<p class="hint">The root's shape: the hand position that starts on the root on the 6th string. Every note within reach, one finger per fret.</p>` : ""}
      ${!isChord && st.scaleView === "shapes" ? shapesHTML(a) : ""}
      ${!isChord && st.labels === "fingers" && st.scaleView === "all" ? positionsHTML() : ""}
      ${isChord ? "" : fretRangeHTML(st.fretRange, FRETS)}
      ${isChord ? "" : scaleChordsHTML(a)}
    `;
    p.querySelectorAll("[data-view]").forEach(b => b.onclick = () => {
      st.scaleView = b.dataset.view; st.custom = null; st.activeString = null; save(); drawPickers(); drawFretboard(); drawShapeInfo();
    });
    if (!isChord) bindFretRange(p, () => st.fretRange, r => { st.fretRange = r; save(); drawFretboard(); }, FRETS, () => {
      // "One position" / "One octave" only ever show one shape — switch to Shapes so the whole neck fills up.
      if (st.scaleView === "pattern" || st.scaleView === "octave") { st.scaleView = "shapes"; st.scaleShape = 0; save(); drawPickers(); drawFretboard(); }
    });
    p.querySelectorAll("[data-shape]").forEach(b => b.onclick = () => {
      const n = scalePattern(activeSet()).shapes.length, v = b.dataset.shape;
      st.scaleShape = v === "prev" ? (st.scaleShape + n - 1) % n : v === "next" ? (st.scaleShape + 1) % n : Number(v);
      st.custom = null; st.activeString = null; save(); drawPickers(); drawFretboard(); drawShapeInfo();
    });
    p.querySelectorAll("[data-pos]").forEach(b => b.onclick = () => {
      const v = b.dataset.pos;
      const cur = scalePos();
      st.scalePos = v === "prev" ? Math.max(0, cur - 1) : v === "next" ? Math.min(12, cur + 1) : Number(v);
      st.custom = null; st.activeString = null;
      save(); drawPickers(); drawFretboard(); drawShapeInfo();
    });
    p.querySelectorAll("[data-root]").forEach(b => b.onclick = () => {
      if (isChord) st.chordRoot = Number(b.dataset.root); else { st.scaleRoot = Number(b.dataset.root); st.scalePos = null; st.scaleShape = 0; }
      st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll();
      if (isChord && voicings[0]) playVoicing(voicings[0]);
    });
    p.querySelectorAll("[data-type]").forEach(b => b.onclick = () => {
      if (isChord) st.chordType = b.dataset.type; else { st.scaleType = b.dataset.type; st.scaleShape = 0; }
      st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll();
      if (isChord && voicings[0]) playVoicing(voicings[0]);
    });
    p.querySelectorAll("[data-focus-pc]").forEach(b => b.onclick = () => {
      const x = Number(b.dataset.focusPc);
      st.focus = st.focus && st.focus.pc === x && st.focus.midi === null ? null : { pc: x, midi: null };
      drawPickers(); drawFretboard(); drawFocus();
    });
    // Chords of the scale → jump to chord mode.
    p.querySelectorAll("[data-goto-chord]").forEach(b => b.onclick = () => {
      const [r, t] = b.dataset.gotoChord.split("|");
      st.mode = "chord"; st.chordRoot = Number(r); st.chordType = t; st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll();
      if (voicings[0]) playVoicing(voicings[0]);
    });
    if ($("#playChord")) $("#playChord").onclick = () => { if (voicings[st.voicing]) playVoicing(voicings[st.voicing]); };
    if ($("#playScale")) $("#playScale").onclick = () => {
      const pat = scalePattern(a);
      if (pat) { GuitarAudio.playSequence(pat.cells.map(c => c.m), 0.24); return; }
      // Whole neck: start from the lowest root on the 6th string, go up one octave.
      let start = st.tuning[0];
      while (pc(start) !== st.scaleRoot) start++;
      const seq = [...a.iv].sort((x, y) => x - y).map(i => start + i).concat(start + 12);
      GuitarAudio.playSequence(seq);
    };
  }

  /* ----- The neck ----- */
  function drawFretboard() {
    const a = activeSet();
    const flats = a ? a.flats : false;
    const v = currentShape();
    const fing = v ? autoFingering(v.frets) : null;
    const pat = a ? scalePattern(a) : null;
    const fb = $("#fb");
    fb.classList.toggle("lefty", prefs.lefty);
    const rows = [];
    for (let s = 5; s >= 0; s--) {
      const open = st.tuning[s];
      const d = open - STANDARD_TUNING[s];
      const cells = [];
      for (let f = 0; f <= FRETS; f++) {
        const m = open + f, p = pc(m);
        let dot = "";
        let cls = "";
        let label = nameIn(a, p);
        const fingersMode = st.labels === "fingers" && a;
        const revealed = st.mode !== "scale" || inFretRange(f, st.fretRange);
        const inSet = a && revealed && a.pcs.includes(p) && (!pat || v || pat.has(s, f));
        if (!a) {
          cls = (flats ? FLATS : SHARPS)[p].length === 1 ? "natural" : "accidental";
        } else if (inSet) {
          const i = pc(p - a.root);
          cls = "role-" + intervalRole(i);
          if (st.labels === "intervals") label = a.names[i];
          if (v) cls += v.frets[s] === f ? " pick" : " faded";
          if (!v && pat && pat.inShape && !pat.inShape(s, f)) cls += " faded";
          // Options: the other chord/scale notes on the string the user tapped.
          if (st.activeString === s && !(v && v.frets[s] === f)) cls += " option";
          if (fingersMode && v && v.frets[s] === f) {
            // Finger from the same logic as the chord diagrams (1 index … 4 pinky, 0 open).
            const fg = fing;
            label = f === 0 ? "0" : String(fg.fingers[s]);
            cls += " finger" + (f === 0 ? " open-string" : "");
            if (fg.barres.some(b => f === b.fret && s >= b.from && s <= b.to)) cls += " barre-note";
          } else if (fingersMode && pat && !v && (!pat.inShape || pat.inShape(s, f))) {
            label = String(pat.finger(f, s));
            cls += " finger" + (f === 0 ? " open-string" : "");
          } else if (fingersMode && st.mode === "scale" && !v) {
            const fg = scaleFinger(f);
            if (fg !== null) { label = String(fg); cls += " finger pick" + (f === 0 ? " open-string" : ""); }
            else cls += " faded";
          }
        } else if (st.showAll) {
          cls = "ghost";
        } else {
          label = null;
        }
        if (st.focus && st.focus.pc === p) {
          if (label === null) { label = nameIn(a, p); cls = "ghost"; }
          cls += st.focus.midi === m ? " focus focus-exact" : " focus";
        }
        if (label !== null) dot = `<span class="fb-dot ${cls}">${label}</span>`;
        if (f === 0 && v && v.frets[s] === -1 && !(st.activeString === s && a && a.pcs.includes(p))) dot = `<span class="fb-mute">×</span>`;
        const inBand = pat && pat.band && !v && f >= pat.band[0] && f <= pat.band[1] && f > 0;
        cells.push(`<div class="fb-cell ${f === 0 ? "open" : ""} ${inBand ? "in-band" : ""} ${revealed ? "" : "out-range"}" data-f="${f}">${dot}</div>`);
      }
      rows.push(`
        <div class="fb-row ${st.activeString === s ? "active-string" : ""}" data-s="${s}" style="--thick:${(1 + (5 - s) * 0.45).toFixed(2)}px">
          <div class="fb-tune">
            <button class="fb-btn" data-tune="1" data-s="${s}" aria-label="Tune string up">+</button>
            <button class="fb-note ${d ? "changed" : ""}" data-open="${s}" title="Play open string">${midiName(open, false)}</button>
            <button class="fb-btn" data-tune="-1" data-s="${s}" aria-label="Tune string down">−</button>
          </div>
          <div class="fb-strings">${cells.join("")}</div>
        </div>`);
    }
    const marks = [];
    for (let f = 0; f <= FRETS; f++) {
      const dots = [3, 5, 7, 9, 15].includes(f) ? "●" : f === 12 ? "●●" : "";
      marks.push(`<div class="fb-cell mark"><span>${f}</span><b>${dots}</b></div>`);
    }
    rows.push(`<div class="fb-row markers"><div class="fb-tune"></div><div class="fb-strings">${marks.join("")}</div></div>`);
    fb.innerHTML = rows.join("");
  }

  function drawLegend() {
    const a = activeSet();
    if (!a) {
      $("#legend").innerHTML = `<span><i class="fb-dot natural">C</i> natural note</span><span><i class="fb-dot accidental">C♯</i> sharp / flat</span>`;
      return;
    }
    const roles = [...new Set(a.iv.map(intervalRole))];
    const label = { root: "root (R)", third: "3rd — major/minor colour", fifth: "5th", seventh: "7th", other: "other notes" };
    $("#legend").innerHTML = ["root", "third", "fifth", "seventh", "other"].filter(r => roles.includes(r))
      .map(r => `<span><i class="fb-dot role-${r}"></i> ${label[r]}</span>`).join("") +
      (st.mode === "chord" ? `<span><i class="fb-dot role-root pick"></i> selected shape</span>` : "") +
      (st.labels === "fingers" ? `<span class="fb-finger-legend"><i class="fb-dot role-other finger">1</i> index · 2 middle · 3 ring · 4 pinky
        <i class="fb-dot finger open-string">0</i> open string · same number on several strings = barre (pestana)</span>` : "");
  }

  /* ----- Chord shapes ----- */
  function playVoicing(v) {
    GuitarAudio.strumMidis(v.frets.map((f, s) => (f < 0 ? null : st.tuning[s] + f)));
  }

  function shapeLabel(v) {
    if (v.minF === 0 || v.frets.some(f => f === 0)) return v.minF <= 3 ? "Open position" : `Fret ${v.minF} + open strings`;
    return v.barre ? `Barre, fret ${v.minF}` : `Fret ${v.minF}`;
  }

  function drawVoicings() {
    const box = $("#voicings");
    if (st.mode !== "chord") { box.innerHTML = ""; return; }
    const a = activeSet();
    const name = a.nm(st.chordRoot) + chordType().id;
    const isStandard = st.tuning.every((m, s) => m === STANDARD_TUNING[s]);
    const card = (v, i, small) => `
      <button class="diagram-card ${i === st.voicing && !small && !st.custom ? "on" : ""}" ${small ? "" : `data-v="${i}"`}
        title="${v.inversion ? "Inversion: the lowest note is " + a.nm(v.bassPc) + ", not the root" : ""}">
        <span class="diagram-name">${name}${v.inversion ? "/" + a.nm(v.bassPc) : ""}</span>
        ${fingeringSVG(autoFingering(v.frets), name, { lefty: prefs.lefty })}
        <small>${shapeLabel(v)}<span class="finger-count">${fingerText(v)}</span><code>${fretsText(v.frets)}</code></small>
      </button>`;

    let compare = "";
    if (!isStandard && voicings.length) {
      const std = findVoicings(STANDARD_TUNING, st.chordRoot, chordType().iv, { limit: 1 })[0];
      if (std) {
        const same = std.key === voicings[0].key;
        compare = `
          <div class="panel fb-compare">
            <h2>What your tuning changes</h2>
            <div class="fb-compare-row">
              <div><p class="tool-label">Standard tuning</p>${card(std, -1, true)}</div>
              <div class="fb-arrow">→</div>
              <div><p class="tool-label">Your tuning</p>${card(voicings[0], -1, true)}</div>
            </div>
            <p class="hint">${same ? "The easiest shape is the same in both tunings." :
              "Same chord, same notes — but because the open strings changed, your fingers go to different frets. Compare the two shapes string by string."}</p>
          </div>`;
      }
    }

    box.innerHTML = `
      <div class="panel">
        <h2>${voicings.length} shape${voicings.length === 1 ? "" : "s"} for ${name} in this tuning <small>(tap to see it on the neck and hear it · “/X” = X is the lowest note)</small></h2>
        ${voicings.length ? `<div class="diagrams big">${voicings.map((v, i) => card(v, i)).join("")}</div>`
          : `<p class="hint">No comfortable shape found (max 4 fingers, max 4 frets wide). Try another tuning or chord.</p>`}
      </div>
      ${compare}`;
    box.querySelectorAll("[data-v]").forEach(b => b.onclick = () => {
      st.voicing = Number(b.dataset.v); st.custom = null; st.activeString = null;
      drawFretboard(); drawVoicings();
      playVoicing(voicings[st.voicing]);
    });
  }

  /*
   * Tap a fret. If the note belongs to the chord/scale, it becomes that
   * string's note in YOUR shape (tap it again to mute the string), and all the
   * other options on that string light up. Otherwise the note just glows
   * everywhere it appears on the neck.
   */
  function tapCell(s, f) {
    const m = st.tuning[s] + f;
    const a = activeSet();
    if (!a || !a.pcs.includes(pc(m))) return tapNote(m);
    GuitarAudio.playMidi(m);
    const sugg = st.mode === "chord" && voicings[st.voicing];
    const shape = st.custom ? [...st.custom] : sugg ? [...sugg.frets] : [-1, -1, -1, -1, -1, -1];
    if (st.activeString === s) {
      // Choosing among the highlighted options: the tapped note replaces the
      // old one and the options close (chosen note solid, the rest faded).
      shape[s] = f;
      st.activeString = null;
    } else {
      // First tap on this string: select the note and show the other options.
      shape[s] = f;
      st.activeString = s;
    }
    st.custom = shape;
    st.focus = null;
    drawFretboard(); drawShapeInfo(); drawFocus();
    if (st.mode === "chord") drawVoicings();
  }

  function drawShapeInfo() {
    const box = $("#shapeInfo");
    const a = activeSet();
    if (!a) { box.innerHTML = ""; return; }
    if (!st.custom) {
      box.innerHTML = `<p class="hint fb-edit-hint">✎ Tap a ${st.mode} note to build your own shape — the other ${st.mode} notes on that string light up; tap one to swap it in.</p>`;
      return;
    }
    const frets = st.custom;
    const played = frets.map((f, s) => (f >= 0 ? s : -1)).filter(s => s >= 0);
    const midis = played.map(s => st.tuning[s] + frets[s]);
    const plan = autoFingering(frets);
    const fretted = frets.filter(f => f > 0);
    const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) + 1 : 0;
    const det = played.length >= 2 ? detectChord(midis) : null;
    let name = "";
    if (det) {
      const sp = spellSet(det.root, det.type.iv, true);
      const bass = pc(midis[0]);
      name = sp.get(det.root) + det.type.id + (bass !== det.root ? "/" + (sp.get(bass) || noteName(bass, false)) : "");
    }
    const warns = [];
    if (plan.count > 4) warns.push(`needs ${plan.count} fingers — you only have 4`);
    if (span > 4) warns.push(`stretches over ${span} frets`);
    if (played.length && frets.slice(played[0], played[played.length - 1] + 1).some(f => f < 0)) warns.push("a muted string sits between played strings (hard to strum)");
    if (st.mode === "chord") {
      const present = new Set(midis.map(pc));
      const miss = a.pcs.filter(p => !present.has(p)).map(p => a.nm(p));
      if (miss.length) warns.push(`missing ${miss.join(", ")}`);
    }
    box.innerHTML = `
      <div class="fb-shape-info">
        <span>✎ <strong>Your shape</strong> <code>${fretsText(frets)}</code>
          ${name ? `→ <strong class="chord-name">${name}</strong>` : played.length >= 2 ? "→ not a standard chord" : ""}
          · notes: ${midis.map(m => nameIn(a, m)).join(" ")}
          · ${plan.count} finger${plan.count === 1 ? "" : "s"}${plan.barres.length ? ` (${plan.barres.length === 1 ? "one presses" : plan.barres.length + " press"} several notes)` : ""}</span>
        ${warns.length ? `<span class="warn">⚠ ${warns.join(" · ")}</span>` : `<span class="ok">✓ Playable with ${plan.count} finger${plan.count === 1 ? "" : "s"}</span>`}
        <span class="fb-shape-btns">
          ${st.activeString !== null ? `<button class="btn small" id="muteString">✕ Mute ${["6th", "5th", "4th", "3rd", "2nd", "1st"][st.activeString]} string</button>` : ""}
          <button class="btn small" id="playShape">▶ Play</button>
          <button class="btn small" id="clearShape">${st.mode === "chord" ? "↺ Back to suggested shape" : "Clear shape"}</button>
        </span>
      </div>`;
    if ($("#muteString")) $("#muteString").onclick = () => {
      const shape = [...st.custom];
      shape[st.activeString] = -1;
      st.custom = shape.every(x => x === -1) ? null : shape;
      st.activeString = null;
      drawFretboard(); drawShapeInfo(); if (st.mode === "chord") drawVoicings();
    };
    $("#playShape").onclick = () => GuitarAudio.strumMidis(frets.map((f, s) => (f < 0 ? null : st.tuning[s] + f)));
    $("#clearShape").onclick = () => {
      st.custom = null; st.activeString = null;
      drawFretboard(); drawShapeInfo(); if (st.mode === "chord") drawVoicings();
    };
  }

  // Tap a note: hear it and highlight every place it lives on the neck.
  function tapNote(m) {
    GuitarAudio.playMidi(m);
    st.focus = st.focus && st.focus.midi === m ? null : { pc: pc(m), midi: m };
    drawFretboard(); drawFocus();
    if (st.mode !== "notes") drawPickers();
  }

  function drawFocus() {
    const box = $("#focusInfo");
    if (!st.focus) { box.innerHTML = `<span class="hint">Tap any note to hear it and see everywhere it appears on the neck.</span>`; return; }
    const a = activeSet();
    const flats = a ? a.flats : false;
    const name = nameIn(a, st.focus.pc);
    const ordinal = s => ["6th", "5th", "4th", "3rd", "2nd", "1st"][s];
    let all = 0;
    const same = [];
    st.tuning.forEach((open, s) => {
      for (let f = 0; f <= FRETS; f++) {
        if (pc(open + f) === st.focus.pc) all++;
        if (st.focus.midi !== null && open + f === st.focus.midi) same.push(`${ordinal(s)} string ${f === 0 ? "open" : "fret " + f}`);
      }
    });
    let role = "";
    if (a && a.pcs.includes(st.focus.pc)) {
      const i = pc(st.focus.pc - a.root);
      role = ` It is the <strong>${i === 0 ? "root (R)" : a.names[i]}</strong> of ${st.mode === "chord" ? "this chord" : "this scale"}.`;
    } else if (a) role = ` It is <em>not</em> in this ${st.mode}.`;
    box.innerHTML = `
      <span><span class="fb-dot focus focus-exact inline">${name}</span>
      ${st.focus.midi !== null
        ? `<strong>${name}${Math.floor(st.focus.midi / 12) - 1}</strong> (${GuitarAudio.midiFreq(st.focus.midi).toFixed(1)} Hz) — the exact same pitch is at: ${same.join(", ")}.`
        : `All <strong>${name}</strong> notes.`}
      ${all} ${name} spots on this neck (different octaves are glowing).${role}</span>
      <button class="btn small" id="clearFocus">Clear</button>`;
    $("#clearFocus").onclick = () => { st.focus = null; drawFretboard(); drawFocus(); if (st.mode !== "notes") drawPickers(); };
  }

  // Shape chooser: where the hand sits for each position of the scale.
  function shapesHTML(a) {
    const pat = scalePattern(a);
    if (!pat || !pat.shapes) return "";
    const sel = pat.shape;
    const startNote = a.nm(pc(a.root + sel.degree));
    const idx = a.names[sel.degree] || "R";
    return `<div class="fb-pos"><span class="tool-label">Shape</span>
      <button class="chip" data-shape="prev" aria-label="Previous shape">◀</button>
      ${pat.shapes.map((sh, i) => `<button class="chip ${sh === sel ? "on" : ""}" data-shape="${i}">${sh.n} <small>fr ${sh.lo}–${sh.hi}</small></button>`).join("")}
      <button class="chip" data-shape="next" aria-label="Next shape">▶</button></div>
      <p class="hint">✋ <strong>Shape ${sel.n}</strong>: hand on frets <strong>${sel.lo}–${sel.hi}</strong>, index finger on fret <strong>${Math.max(1, sel.anchor <= 1 ? 1 : sel.lo)}</strong>.
        It starts on <strong>${startNote}</strong> (the ${idx}) on the 6th string. The highlighted band is your hand; the faded notes belong to the other shapes —
        each shape shares notes with the next one, which is how they link up along the neck.</p>`;
  }

  function positionsHTML() {
    const cur = scalePos();
    return `<div class="fb-pos"><span class="tool-label">${st.scaleView === "all" ? "Hand position" : "Start position"}</span>
      <button class="chip" data-pos="prev" aria-label="Previous position">◀</button>
      ${Array.from({ length: 13 }, (_, i) => `<button class="chip ${i === cur ? "on" : ""}" data-pos="${i}">${i === 0 ? "Open" : i}</button>`).join("")}
      <button class="chip" data-pos="next" aria-label="Next position">▶</button></div>
      <p class="hint">${st.scaleView === "all"
        ? `One finger per fret: finger 1 on fret ${cur === 0 ? "1" : cur}, finger 2 on the next fret, and so on. Only the notes your hand reaches here are numbered.`
        : st.scaleView === "octave"
          ? `One octave from the first root on the 6th string at or after fret ${cur}.`
          : `The pattern starts on the first scale note on the 6th string at or after fret ${cur}. Move it to learn every position of the scale.`}</p>`;
  }

  // Diatonic chords: stack every other note of a 7-note scale (1-3-5, 2-4-6, …).
  function scaleChordsHTML(a) {
    const sorted = [...a.iv].sort((x, y) => x - y);
    if (sorted.length !== 7) return "";
    const roman = ["I", "II", "III", "IV", "V", "VI", "VII"];
    const chips = sorted.map((iv, k) => {
      const third = (sorted[(k + 2) % 7] - iv + 12) % 12;
      const fifth = (sorted[(k + 4) % 7] - iv + 12) % 12;
      const type = CHORD_TYPES.find(t => t.iv.length === 3 && t.iv[1] === third && t.iv[2] === fifth);
      if (!type) return "";
      const r = pc(a.root + iv);
      const numeral = type.id === "m" || type.id === "dim" ? roman[k].toLowerCase() : roman[k];
      return `<button class="chip" data-goto-chord="${r}|${type.id}"><small>${numeral}${type.id === "dim" ? "°" : ""}</small> ${a.nm(r)}${type.id}</button>`;
    }).join("");
    return `<p class="tool-label fb-sub">Chords in this scale <span class="hint">(tap to open)</span></p><div class="chips">${chips}</div>`;
  }

  function drawAll() {
    if (st.mode === "chord") voicings = findVoicings(st.tuning, st.chordRoot, chordType().iv);
    else voicings = [];
    if (st.voicing >= voicings.length) st.voicing = 0;
    drawTuningInfo(); drawPickers(); drawFretboard(); drawShapeInfo(); drawFocus(); drawLegend(); drawVoicings();
    document.querySelectorAll("[data-labels]").forEach(b => b.classList.toggle("on", b.dataset.labels === st.labels));
    $("#fingersChip").hidden = st.mode === "notes";
    $("#showAll").checked = st.showAll;
    $("#fbLefty").checked = prefs.lefty;
  }

  function retune(s, delta) {
    const target = st.tuning[s] + delta;
    const lo = STANDARD_TUNING[s] - 12, hi = STANDARD_TUNING[s] + 7;
    st.tuning[s] = Math.max(lo, Math.min(hi, target));
    st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll();
    GuitarAudio.playMidi(st.tuning[s]);
  }

  /* ----- Events ----- */
  $("#preset").onchange = e => {
    const p = TUNING_PRESETS.find(x => x.id === e.target.value);
    if (!p) return;
    st.tuning = [...p.notes]; st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll();
    GuitarAudio.strumMidis(st.tuning);
  };
  const toStandard = () => { st.tuning = [...STANDARD_TUNING]; st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll(); GuitarAudio.strumMidis(st.tuning); };
  $("#resetTuning").onclick = toStandard;
  $("#stdBtn").onclick = toStandard;
  $("#strumOpen").onclick = () => GuitarAudio.strumMidis(st.tuning);
  document.querySelectorAll(".fb-modes .tab").forEach(t => t.onclick = () => { st.mode = t.dataset.mode; st.voicing = 0; st.custom = null; st.activeString = null; save(); drawAll(); });
  document.querySelectorAll("[data-labels]").forEach(b => b.onclick = () => { st.labels = b.dataset.labels; save(); drawAll(); });
  $("#showAll").onchange = e => { st.showAll = e.target.checked; save(); drawAll(); };
  $("#fbLefty").onchange = e => { prefs.lefty = e.target.checked; store.set("lefty", prefs.lefty); drawAll(); };

  const fb = $("#fb");
  fb.addEventListener("click", e => {
    const t = e.target.closest("[data-tune]");
    if (t) return retune(Number(t.dataset.s), Number(t.dataset.tune));
    const o = e.target.closest("[data-open]");
    if (o) tapNote(st.tuning[Number(o.dataset.open)]);
  });

  /*
   * Drag a string sideways to retune it. Moving the notes one fret to the RIGHT
   * means every note now needs one more fret → the string was tuned DOWN a semitone.
   */
  let drag = null;
  fb.addEventListener("pointerdown", e => {
    const strings = e.target.closest(".fb-row:not(.markers) .fb-strings");
    if (!strings) return;
    const row = strings.parentElement;
    const cell = strings.querySelector(".fb-cell:not(.open)");
    drag = { row, s: Number(row.dataset.s), x0: e.clientX, dx: 0, moved: false, width: cell.getBoundingClientRect().width, target: e.target, id: e.pointerId };
  });
  fb.addEventListener("pointermove", e => {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(drag.dx) > 6) {
      drag.moved = true;
      drag.row.classList.add("dragging");
      try { drag.row.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    }
    if (drag.moved) {
      const dir = prefs.lefty ? -1 : 1;
      const steps = Math.round(drag.dx / drag.width) * dir;
      drag.row.style.setProperty("--dx", drag.dx + "px");
      const preview = st.tuning[drag.s] - steps;
      drag.row.querySelector(".fb-note").innerHTML = midiName(preview, false) +
        (steps ? `<em>${steps > 0 ? "−" : "+"}${Math.abs(steps)}</em>` : "");
    }
  });
  const endDrag = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    d.row.classList.remove("dragging");
    d.row.style.removeProperty("--dx");
    if (d.moved) {
      const dir = prefs.lefty ? -1 : 1;
      const steps = Math.round(d.dx / d.width) * dir;
      if (steps) retune(d.s, -steps); else drawFretboard();
    } else if (e.type === "pointerup") {
      const cell = d.target.closest(".fb-cell");
      if (cell) tapCell(d.s, Number(cell.dataset.f));
    }
  };
  fb.addEventListener("pointerup", endDrag);
  fb.addEventListener("pointercancel", endDrag);

  // Full screen (where supported) + try to lock landscape on phones.
  const stage = $("#stage");
  if (document.fullscreenEnabled || document.webkitFullscreenEnabled) {
    $("#fullBtn").hidden = false;
    $("#fullBtn").onclick = async () => {
      try {
        if (document.fullscreenElement) { await document.exitFullscreen(); return; }
        await (stage.requestFullscreen ? stage.requestFullscreen() : stage.webkitRequestFullscreen());
        if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape").catch(() => {});
      } catch { /* not allowed — ignore */ }
    };
  }
  // When the phone turns sideways, bring the whole neck into view.
  const landscape = window.matchMedia("(orientation: landscape) and (max-height: 540px)");
  const onRotate = () => { if (landscape.matches) setTimeout(() => stage.scrollIntoView({ block: "start", behavior: "smooth" }), 250); };
  landscape.addEventListener("change", onRotate);
  cleanup = () => landscape.removeEventListener("change", onRotate);

  drawAll();
}
