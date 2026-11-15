/*
 * One source of truth for scales and their shapes on the neck.
 * Used by the Fretboard, the School and the Jam room.
 *
 * A "shape" (or position / box) is where the hand sits: a zone of about
 * 4–5 frets in which you can play every note of the scale across all six
 * strings without moving the hand. Learning the 5 shapes of a scale and how
 * they connect is how guitarists learn to play a scale all over the neck.
 *
 *  - Pentatonic scales (5 notes): the classic 5 "boxes", 2 notes per string.
 *    Box k starts on the k-th note of the scale on the 6th string.
 *  - Blues scale: the minor-pentatonic boxes plus the "blue note" (♭5) where
 *    it falls inside the box.
 *  - 7-note scales: one-finger-per-fret positions. The index finger sits at
 *    the box's first fret (it may stretch one fret back), so each string has
 *    3 (sometimes 2 or 4) notes and the hand never covers more than 5 frets.
 */

const SCALE_LIBRARY = {
  "min-pent": { name: "Minor pentatonic", iv: [0, 3, 5, 7, 10] },
  "maj-pent": { name: "Major pentatonic", iv: [0, 2, 4, 7, 9] },
  "blues": { name: "Blues scale", iv: [0, 3, 5, 6, 7, 10] },
  "major": { name: "Major scale (Ionian)", iv: [0, 2, 4, 5, 7, 9, 11] },
  "minor": { name: "Natural minor (Aeolian)", iv: [0, 2, 3, 5, 7, 8, 10] },
  "harm-minor": { name: "Harmonic minor", iv: [0, 2, 3, 5, 7, 8, 11] },
  "dorian": { name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10] },
  "mixolydian": { name: "Mixolydian", iv: [0, 2, 4, 5, 7, 9, 10] }
};

// Scale notes from `fromMidi` upwards (inclusive) up to `toMidi`.
function scaleRun(pcs, fromMidi, toMidi) {
  const out = [];
  for (let m = fromMidi; m <= toMidi; m++) if (pcs.includes(pc(m))) out.push(m);
  return out;
}

// Frets on the 6th string where each scale degree sits, starting from the root
// and going up the neck (each anchor = the start of one shape).
function shapeAnchors(rootPc, iv, tuning, maxFret) {
  const rootFret = pc(rootPc - tuning[0]);
  return [...iv].sort((a, b) => a - b).map(i => {
    let f = pc(rootPc + i - tuning[0]);
    if (f < rootFret) f += 12;
    if (f > maxFret - 3) f -= 12;           // keep the whole box on the neck
    return { degree: i, fret: f };
  });
}

/* --- Pentatonic: 2 notes per string from the anchor --- */
function pentBox(pcs, startMidi, tuning, maxFret) {
  const seq = scaleRun(pcs, startMidi, startMidi + 48);
  const cells = [];
  let k = 0;
  for (let s = 0; s < 6 && k < seq.length; s++) {
    let n = 0;
    while (n < 2 && k < seq.length) {
      const f = seq[k] - tuning[s];
      if (f < 0) {
        // too low for this string (open position): it belongs on the string below
        const fp = seq[k] - tuning[s - 1];
        if (s > 0 && fp <= maxFret) cells.push({ s: s - 1, f: fp, m: seq[k] });
        k++; continue;
      }
      if (f > maxFret) break;
      cells.push({ s, f, m: seq[k] }); k++; n++;
    }
  }
  return cells;
}

/* --- 7-note scales: one finger per fret, index at `anchor`, may stretch 1 back --- */
function windowBox(pcs, anchor, tuning, maxFret) {
  // Open position (anchor 0 or 1): open strings + frets 1–4. Otherwise index at
  // the anchor with a one-fret stretch back.
  const lo = anchor <= 1 ? 0 : anchor - 1, hi = Math.min(maxFret, anchor <= 1 ? 4 : anchor + 3);
  let cells = [];
  for (let s = 0; s < 6; s++) {
    for (let f = lo; f <= hi; f++) if (pcs.includes(pc(tuning[s] + f))) cells.push({ s, f, m: tuning[s] + f });
  }
  // The same pitch can appear on two strings (e.g. fret 4 on the B string and
  // fret 9 on the G string). Keep one: the one inside the core frets, else the lower string.
  const byPitch = new Map();
  for (const c of cells) {
    const core = c.f >= anchor && c.f <= anchor + 3;
    const prev = byPitch.get(c.m);
    if (!prev) byPitch.set(c.m, { c, core });
    else if (core && !prev.core) byPitch.set(c.m, { c, core });
  }
  cells = [...byPitch.values()].map(x => x.c);
  // Start the box on the anchor (the 6th-string note), drop lower notes on the 6th string.
  return cells.filter(c => !(c.s === 0 && c.f < anchor && anchor - c.f > 0 && c.m < tuning[0] + anchor));
}

// Fingers per string: one finger per fret from where the index sits (the box's
// first fret, or one fret behind it for a stretch). Fingers always go up along
// a string (1→2→3→4); if the notes are wider than the hand, they are numbered
// in order and the hand stretches or slides.
function assignFingers(cells, kind) {
  // If the whole box fits in 4 frets, the hand doesn't move: number every note
  // from the box's first fret (index finger), on every string.
  const fretted = cells.filter(c => c.f > 0).map(c => c.f);
  const boxLo = Math.min(...fretted), boxHi = Math.max(...fretted);
  const still = kind === "box" && fretted.length && boxHi - boxLo <= 3;
  for (let s = 0; s < 6; s++) {
    const row = cells.filter(c => c.s === s && c.f > 0).sort((a, b) => a.f - b.f);
    if (!row.length) continue;
    const first = row[0].f, last = row[row.length - 1].f;
    const base = still ? boxLo : kind === "window" ? Math.min(first, row[0].box) : first;
    let fg = row.map(c => c.f - base + 1);
    const ok = fg.every((x, i) => x >= 1 && x <= 4 && (i === 0 || x > fg[i - 1]));
    if (!ok) {
      const n = row.length;
      fg = row.map((c, k) => n >= 4 ? Math.min(4, k + 1)
        : n === 3 ? (k === 0 ? 1 : k === 2 ? 4 : (c.f - first <= last - c.f ? 2 : 3))
        : (k === 0 ? 1 : (last - first <= 2 ? 3 : 4)));
    }
    row.forEach((c, i) => { c.finger = fg[i]; });
  }
  cells.forEach(c => { if (c.f === 0) c.finger = 0; });
  return cells;
}

/**
 * All the shapes of a scale, ordered from the root's shape up the neck.
 * Each shape: { n, degree, lo, hi, anchor, cells:[{s,f,m,finger}] }
 */
function scaleShapes(rootPc, iv, tuning = STANDARD_TUNING, maxFret = 15) {
  const sorted = [...iv].sort((a, b) => a - b);
  const pcs = sorted.map(i => pc(rootPc + i));
  const isBlues = sorted.length === 6 && sorted.includes(6) && sorted.includes(3);
  const pentIv = isBlues ? sorted.filter(i => i !== 6) : sorted;
  const pentPcs = pentIv.map(i => pc(rootPc + i));
  const shapes = [];

  if (pentIv.length === 5) {
    for (const a of shapeAnchors(rootPc, pentIv, tuning, maxFret)) {
      let cells = pentBox(pentPcs, tuning[0] + a.fret, tuning, maxFret);
      if (isBlues) {
        // Add the blue note (♭5) in every octave of the box, right after each 4th:
        // on the same string one fret up, or else one fret below the 5th.
        const fourth = pc(rootPc + 5);
        for (const c of [...cells]) {
          if (pc(c.m) !== fourth) continue;
          const m = c.m + 1;
          if (cells.some(x => x.m === m)) continue;
          const five = cells.find(x => x.m === c.m + 2);
          const fr = cells.map(x => x.f), lo = Math.min(...fr), hi = Math.max(...fr);
          if (c.f + 1 <= Math.min(maxFret, hi + 1)) cells.push({ s: c.s, f: c.f + 1, m });   // classic spot
          else if (five && five.f - 1 >= Math.max(0, lo - 1)) cells.push({ s: five.s, f: five.f - 1, m });
        }
      }
      cells.forEach(c => { c.box = a.fret; });
      shapes.push({ degree: a.degree, anchor: a.fret, cells: assignFingers(cells, "box") });
    }
  } else {
    const kept = [];
    for (const a of shapeAnchors(rootPc, sorted, tuning, maxFret)) {
      if (kept.some(k => Math.abs(k - a.fret) < 2)) continue;   // nearly the same hand position
      kept.push(a.fret);
      const cells = windowBox(pcs, a.fret, tuning, maxFret);
      cells.forEach(c => { c.box = a.fret; });
      shapes.push({ degree: a.degree, anchor: a.fret, cells: assignFingers(cells, "window") });
    }
  }
  // Repair: if a scale note is missing between the lowest and highest note of a
  // shape, place it at the nearest fret within one fret of the box.
  shapes.forEach(sh => {
    const ms = sh.cells.map(c => c.m), fr = sh.cells.map(c => c.f);
    const lo = Math.min(...fr), hi = Math.max(...fr);
    let added = false;
    for (const m of scaleRun(pcs, Math.min(...ms), Math.max(...ms))) {
      if (ms.includes(m)) continue;
      let best = null;
      for (let s = 0; s < 6; s++) {
        const f = m - tuning[s];
        if (f < Math.max(0, lo - 1) || f > Math.min(maxFret, hi + 1)) continue;
        const d = f < lo ? lo - f : f > hi ? f - hi : 0;
        if (!best || d < best.d) best = { s, f, d };
      }
      if (best) { sh.cells.push({ s: best.s, f: best.f, m, box: sh.anchor }); added = true; }
    }
    if (added) assignFingers(sh.cells, pentIv.length === 5 ? "box" : "window");
  });
  // Drop shapes that repeat another one (the same box an octave apart wraps to the same frets).
  const seen = new Set();
  for (let i = shapes.length - 1; i >= 0; i--) {
    const sig = shapes[i].cells.map(c => c.s + ":" + c.f).sort().join(" ");
    if (seen.has(sig)) shapes.splice(i, 1); else seen.add(sig);
  }
  shapes.forEach((sh, i) => {
    sh.cells.sort((a, b) => a.m - b.m);
    const fr = sh.cells.map(c => c.f);
    sh.n = i + 1; sh.lo = Math.min(...fr); sh.hi = Math.max(...fr);
  });
  return shapes;
}

/**
 * Across the neck: a "travel route" with every pitch the guitar can play in
 * the scale, each once, climbing diagonally from the open 6th string to the top
 * of the 1st string. Covering ~3 octaves on 6 strings means the hand must slide
 * along some strings (that's what this view teaches); for hand positions that
 * never move, use the shapes.
 */
function acrossNeck(rootPc, iv, tuning = STANDARD_TUNING, maxFret = 15) {
  const pcs = iv.map(i => pc(rootPc + i));
  const seq = scaleRun(pcs, tuning[0], tuning[5] + maxFret);
  const per = Math.ceil(seq.length / 6);
  const cells = [];
  let s = 0, n = 0;
  for (const m of seq) {
    while (s < 5 && (n >= per || m - tuning[s] > maxFret) && m - tuning[s + 1] >= 0) { s++; n = 0; }
    const f = m - tuning[s];
    if (f < 0 || f > maxFret) continue;
    cells.push({ s, f, m });
    n++;
  }
  return assignFingers(cells, "box");
}

/** One octave from the root (the first root on the 6th string), using the root's shape. */
function oneOctave(rootPc, iv, tuning = STANDARD_TUNING, maxFret = 15) {
  const shape = scaleShapes(rootPc, iv, tuning, maxFret)[0];
  const start = tuning[0] + pc(rootPc - tuning[0]);
  return shape.cells.filter(c => c.m >= start && c.m <= start + 12);
}

/* ---------- Fret range ("reveal window") slider, shared by the Fretboard and the Jam room ---------- */

// Two-handle slider: frets lo..hi are revealed, the rest of the neck is hidden.
// ◀ ▶ slide the whole window along the neck keeping its width.
function fretRangeHTML(range, maxFret = 15) {
  const [lo, hi] = range;
  const pct = f => (f / maxFret) * 100;
  return `<div class="fret-range" data-fret-range>
    <span class="tool-label">Show frets</span>
    <button class="chip" data-fr="left" aria-label="Slide window towards the nut">◀</button>
    <div class="dual">
      <div class="dual-track"></div>
      <div class="dual-fill" style="left:${pct(lo)}%;width:${pct(hi) - pct(lo)}%"></div>
      <input type="range" min="0" max="${maxFret}" step="1" value="${lo}" data-fr="lo" aria-label="From fret">
      <input type="range" min="0" max="${maxFret}" step="1" value="${hi}" data-fr="hi" aria-label="To fret">
    </div>
    <button class="chip" data-fr="right" aria-label="Slide window towards the body">▶</button>
    <strong class="fr-label">${lo === 0 ? "open" : lo}–${hi}</strong>
    <button class="chip ${lo === 0 && hi === maxFret ? "on" : ""}" data-fr="all" title="Show the scale on all frets">Whole neck</button>
  </div>`;
}

// Wire a slider rendered by fretRangeHTML. getRange() → [lo, hi]; onChange([lo, hi]) on every move.
// onWholeNeck (optional) runs after "Whole neck" — e.g. to leave a single-shape view.
function bindFretRange(container, getRange, onChange, maxFret = 15, onWholeNeck = null) {
  const box = container.querySelector("[data-fret-range]");
  if (!box) return;
  const loIn = box.querySelector('[data-fr="lo"]'), hiIn = box.querySelector('[data-fr="hi"]');
  const paint = ([lo, hi]) => {
    loIn.value = lo; hiIn.value = hi;
    const fill = box.querySelector(".dual-fill");
    fill.style.left = (lo / maxFret) * 100 + "%";
    fill.style.width = ((hi - lo) / maxFret) * 100 + "%";
    box.querySelector(".fr-label").textContent = `${lo === 0 ? "open" : lo}–${hi}`;
    box.querySelector('[data-fr="all"]').classList.toggle("on", lo === 0 && hi === maxFret);
  };
  const set = r => { paint(r); onChange(r); };
  loIn.oninput = () => { const hi = getRange()[1]; set([Math.min(+loIn.value, hi), hi]); };
  hiIn.oninput = () => { const lo = getRange()[0]; set([lo, Math.max(+hiIn.value, lo)]); };
  box.querySelectorAll("button[data-fr]").forEach(b => b.onclick = () => {
    const [lo, hi] = getRange(), w = hi - lo;
    if (b.dataset.fr === "all") { set([0, maxFret]); if (onWholeNeck) onWholeNeck(); }
    if (b.dataset.fr === "left") { const nlo = Math.max(0, lo - 1); set([nlo, nlo + w]); }
    if (b.dataset.fr === "right") { const nhi = Math.min(maxFret, hi + 1); set([nhi - w, nhi]); }
  });
}

const inFretRange = (f, range) => !range || (f >= range[0] && f <= range[1]);
