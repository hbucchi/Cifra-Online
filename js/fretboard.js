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
  let fingers = 0, barre = false, minF = 0, maxF = 0;
  if (fretted.length) {
    minF = Math.min(...fretted); maxF = Math.max(...fretted);
    if (maxF - minF > 3) return null;
    const atMin = played.filter(s => frets[s] === minF);
    if (atMin.length >= 2) {
      barre = true;
      for (let s = atMin[0]; s <= atMin[atMin.length - 1]; s++) if (frets[s] < minF) barre = false;
    }
    fingers = barre ? 1 + fretted.filter(f => f > minF).length : fretted.length;
    if (fingers > 4) return null;
  }
  const score = minF * 1.4 + (maxF - minF) + fingers * 0.8 - played.length * 1.5 - opens * 0.7 + (barre ? 1.5 : 0) + (inversion ? 4 : 0) + (5 - last) * 1.5; // muting thin strings while strumming is hard
  return { frets: [...frets], key: frets.join(","), played: played.length, fingers, barre, minF, score, bassPc, inversion };
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
    labels: saved.labels || "names",
    showAll: saved.showAll ?? false,
    voicing: 0
  };
  const FRETS = 15;
  const save = () => store.set("fb", {
    tuning: st.tuning, mode: st.mode, chordRoot: st.chordRoot, chordType: st.chordType,
    scaleRoot: st.scaleRoot, scaleType: st.scaleType, labels: st.labels, showAll: st.showAll
  });

  app.innerHTML = `
    <h1>Fretboard &amp; Tuner</h1>
    <p class="lead">Retune any string by <strong>dragging it sideways</strong> (or with − / +), then pick a chord or a scale to see where its notes are — and which shapes work in your tuning.</p>

    <section class="panel fb-panel">
      <div class="fb-tuning-bar">
        <label class="tool"><span class="tool-label">Tuning</span>
          <select id="preset"></select></label>
        <button class="btn" id="strumOpen">▶ Strum open strings</button>
        <button class="btn" id="resetTuning">Reset to standard</button>
      </div>
      <div id="tuningInfo" class="fb-tuning-info"></div>
    </section>

    <div class="view-tabs fb-modes" role="tablist">
      <button class="tab" data-mode="notes">All notes</button>
      <button class="tab" data-mode="chord">Chords</button>
      <button class="tab" data-mode="scale">Scales</button>
    </div>
    <section id="pickers" class="fb-pickers"></section>

    <div class="fb-options">
      <div class="chips" role="group" aria-label="Labels">
        <button class="chip" data-labels="names">Note names</button>
        <button class="chip" data-labels="intervals">Intervals</button>
      </div>
      <label class="toggle"><input type="checkbox" id="showAll"> Show other notes</label>
      <label class="toggle"><input type="checkbox" id="fbLefty"> Left-handed</label>
      <span class="hint">Tip: tap any fret to hear it.</span>
    </div>

    <div class="fb-wrap"><div class="fb" id="fb"></div></div>
    <div id="legend" class="fb-legend"></div>

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
      return { root: st.chordRoot, iv: t.iv, pcs, flats: chooseFlats(st.chordRoot, pcs), names: CHORD_INTERVALS };
    }
    if (st.mode === "scale") {
      const t = scaleType();
      const pcs = t.iv.map(i => pc(st.scaleRoot + i));
      return { root: st.scaleRoot, iv: t.iv, pcs, flats: chooseFlats(st.scaleRoot, pcs), names: SCALE_INTERVALS };
    }
    return null;
  }

  let voicings = [];

  /* ----- Tuning panel ----- */
  function drawTuningInfo() {
    const preset = TUNING_PRESETS.find(p => p.notes.every((n, k) => n === st.tuning[k]));
    $("#preset").value = preset ? preset.id : "custom";
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
    const names = a.pcs.map(x => noteName(x, a.flats));
    const ivNames = a.iv.map(i => a.names[i]);
    let formula = "";
    if (isChord) {
      formula = `<strong>${noteName(root, a.flats)}${chordType().id}</strong> = ${names.join(" · ")} <span class="hint">(${ivNames.join(" · ")})</span>`;
    } else {
      const sorted = [...a.iv].sort((x, y) => x - y);
      const steps = sorted.map((v, k) => (k + 1 < sorted.length ? sorted[k + 1] : 12) - v)
        .map(d => ({ 1: "H", 2: "W", 3: "W+H", 4: "2W" }[d] || d));
      formula = `<strong>${noteName(root, a.flats)} ${scaleType().name}</strong> = ${names.join(" · ")}
        <span class="hint">(steps: ${steps.join(" ")} — W = whole tone = 2 frets, H = half tone = 1 fret)</span>`;
    }
    p.innerHTML = `
      <div class="chips fb-roots" role="group" aria-label="Root note">
        ${ROOT_NAMES.map((n, i) => `<button class="chip ${i === root ? "on" : ""}" data-root="${i}">${pretty(n)}</button>`).join("")}
      </div>
      <div class="fb-type-row">
        <label class="tool"><span class="tool-label">${isChord ? "Chord" : "Scale"}</span>
          <select id="typeSel">${types.map(t => `<option value="${t.id}" ${t.id === typeId ? "selected" : ""}>${t.name}</option>`).join("")}</select>
        </label>
        ${isChord ? "" : `<button class="btn" id="playScale">▶ Play scale</button>`}
      </div>
      <p class="fb-formula">${formula}</p>
    `;
    p.querySelectorAll("[data-root]").forEach(b => b.onclick = () => {
      if (isChord) st.chordRoot = Number(b.dataset.root); else st.scaleRoot = Number(b.dataset.root);
      st.voicing = 0; save(); drawAll();
      if (isChord && voicings[0]) playVoicing(voicings[0]);
    });
    $("#typeSel").onchange = e => {
      if (isChord) st.chordType = e.target.value; else st.scaleType = e.target.value;
      st.voicing = 0; save(); drawAll();
      if (isChord && voicings[0]) playVoicing(voicings[0]);
    };
    if ($("#playScale")) $("#playScale").onclick = () => {
      // Start from the lowest root on the 6th string, go up one octave.
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
    const v = st.mode === "chord" ? voicings[st.voicing] : null;
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
        let label = noteName(p, flats);
        if (!a) {
          cls = (flats ? FLATS : SHARPS)[p].length === 1 ? "natural" : "accidental";
        } else if (a.pcs.includes(p)) {
          const i = pc(p - a.root);
          cls = "role-" + intervalRole(i);
          if (st.labels === "intervals") label = a.names[i];
          if (v) cls += v.frets[s] === f ? " pick" : " faded";
        } else if (st.showAll) {
          cls = "ghost";
        } else {
          label = null;
        }
        if (label !== null) dot = `<span class="fb-dot ${cls}">${label}</span>`;
        if (f === 0 && v && v.frets[s] === -1) dot = `<span class="fb-mute">×</span>`;
        cells.push(`<div class="fb-cell ${f === 0 ? "open" : ""}" data-f="${f}">${dot}</div>`);
      }
      rows.push(`
        <div class="fb-row" data-s="${s}" style="--thick:${(1 + (5 - s) * 0.45).toFixed(2)}px">
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
      (st.mode === "chord" ? `<span><i class="fb-dot role-root pick"></i> selected shape</span>` : "");
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
    const name = noteName(st.chordRoot, a.flats) + chordType().id;
    const isStandard = st.tuning.every((m, s) => m === STANDARD_TUNING[s]);
    const card = (v, i, small) => `
      <button class="diagram-card ${i === st.voicing && !small ? "on" : ""}" ${small ? "" : `data-v="${i}"`}
        title="${v.inversion ? "Inversion: the lowest note is " + noteName(v.bassPc, a.flats) + ", not the root" : ""}">
        <span class="diagram-name">${name}${v.inversion ? "/" + noteName(v.bassPc, a.flats) : ""}</span>
        ${fingeringSVG(autoFingering(v.frets), name, { lefty: prefs.lefty })}
        <small>${shapeLabel(v)}<br><code>${fretsText(v.frets)}</code></small>
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
      st.voicing = Number(b.dataset.v);
      drawFretboard(); drawVoicings();
      playVoicing(voicings[st.voicing]);
    });
  }

  function drawAll() {
    if (st.mode === "chord") voicings = findVoicings(st.tuning, st.chordRoot, chordType().iv);
    else voicings = [];
    if (st.voicing >= voicings.length) st.voicing = 0;
    drawTuningInfo(); drawPickers(); drawFretboard(); drawLegend(); drawVoicings();
    document.querySelectorAll("[data-labels]").forEach(b => b.classList.toggle("on", b.dataset.labels === st.labels));
    $("#showAll").checked = st.showAll;
    $("#fbLefty").checked = prefs.lefty;
  }

  function retune(s, delta) {
    const target = st.tuning[s] + delta;
    const lo = STANDARD_TUNING[s] - 12, hi = STANDARD_TUNING[s] + 7;
    st.tuning[s] = Math.max(lo, Math.min(hi, target));
    st.voicing = 0; save(); drawAll();
    GuitarAudio.playMidi(st.tuning[s]);
  }

  /* ----- Events ----- */
  $("#preset").onchange = e => {
    const p = TUNING_PRESETS.find(x => x.id === e.target.value);
    if (!p) return;
    st.tuning = [...p.notes]; st.voicing = 0; save(); drawAll();
    GuitarAudio.strumMidis(st.tuning);
  };
  $("#resetTuning").onclick = () => { st.tuning = [...STANDARD_TUNING]; st.voicing = 0; save(); drawAll(); };
  $("#strumOpen").onclick = () => GuitarAudio.strumMidis(st.tuning);
  document.querySelectorAll(".fb-modes .tab").forEach(t => t.onclick = () => { st.mode = t.dataset.mode; st.voicing = 0; save(); drawAll(); });
  document.querySelectorAll("[data-labels]").forEach(b => b.onclick = () => { st.labels = b.dataset.labels; save(); drawAll(); });
  $("#showAll").onchange = e => { st.showAll = e.target.checked; save(); drawAll(); };
  $("#fbLefty").onchange = e => { prefs.lefty = e.target.checked; store.set("lefty", prefs.lefty); drawAll(); };

  const fb = $("#fb");
  fb.addEventListener("click", e => {
    const t = e.target.closest("[data-tune]");
    if (t) return retune(Number(t.dataset.s), Number(t.dataset.tune));
    const o = e.target.closest("[data-open]");
    if (o) GuitarAudio.playMidi(st.tuning[Number(o.dataset.open)]);
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
      if (cell) GuitarAudio.playMidi(st.tuning[d.s] + Number(cell.dataset.f));
    }
  };
  fb.addEventListener("pointerup", endDrag);
  fb.addEventListener("pointercancel", endDrag);

  drawAll();
}
