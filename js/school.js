/*
 * Cifra Online School — "Scales for Beginners" learning trail.
 *
 * Each lesson has: goals, a short theory text, an interactive neck that shows
 * the lesson's shape, and a practice block (checklist, metronome and, from
 * lesson 4 on, a looping backing track that can be played in any key).
 *
 * Backing tracks: one ElevenLabs-generated loop per style, pitch-shifted
 * offline into all 12 keys (tools/make_tracks.py) → audio/tracks/<id>/<Key>.mp3
 */

const KEY_FILES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]; // file names per pitch class

/* ---------- Backing tracks (key = detected key of the generated original) ---------- */
// Everything here was MEASURED from the generated audio by tools/make_tracks.py
// (key, tempo to 0.01 BPM, bar-aligned loop, chords recognised bar by bar) —
// the AI does not always follow its prompt, so we never trust the prompt.
// prog = chords of one cycle of the progression (one per bar, in the original key).
const TRACKS = {
  "minor-groove": {
    title: "Minor rock groove", style: "Relaxed rock · drums, bass & rhythm guitar",
    root: 2, mode: "minor", bpm: 96.02, loopSeconds: 29.9938, loopBars: 12,
    prog: ["Dm", "Dm", "F", "Gm"],
    scales: ["min-pent", "blues", "minor", "dorian"]
  },
  "blues-shuffle": {
    title: "Blues shuffle", style: "12-bar blues with a boogie bass",
    root: 4, mode: "major", bpm: 95.97, loopSeconds: 30.0094, loopBars: 12,
    prog: ["E7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7", "E7"],
    scales: ["blues", "min-pent", "maj-pent", "mixolydian"]
  },
  "pop-major": {
    title: "Pop", style: "Bright pop-rock with strummed acoustic",
    root: 7, mode: "major", bpm: 96.02, loopSeconds: 29.9938, loopBars: 12,
    prog: ["G", "Am", "Em", "C"],
    scales: ["maj-pent", "major"]
  },
  "folk-major": {
    title: "Folk", style: "Acoustic folk-country",
    root: 0, mode: "major", bpm: 96.01, loopSeconds: 19.9979, loopBars: 8,
    prog: ["C", "C", "C", "C", "C", "Am", "G", "G"],
    scales: ["maj-pent", "major", "mixolydian"]
  },
  "funk-vamp": {
    title: "Funk vamp", style: "Tight sixteenth-note funk on one chord",
    root: 4, mode: "minor", bpm: 100.02, loopSeconds: 28.7942, loopBars: 12,
    prog: ["Em7", "Em7", "Em7", "Em7"],
    scales: ["min-pent", "dorian", "blues"]
  },
  "reggae": {
    title: "Reggae", style: "Laid-back one-drop reggae",
    root: 2, mode: "major", bpm: 80.0, loopSeconds: 24.0, loopBars: 8,
    prog: ["D", "A", "Bm7", "A", "D", "A", "D", "D"],
    scales: ["maj-pent", "major"]
  },
  "latin-pop": {
    title: "Latin pop", style: "Nylon-string guitar and cajón",
    root: 2, mode: "major", bpm: 99.98, loopSeconds: 28.8058, loopBars: 12,
    prog: ["D", "A", "D", "G"],
    scales: ["maj-pent", "major", "mixolydian"]
  }
};

/* ---------- The course ---------- */
const COURSE = {
  id: "scales-beginners",
  title: "Scales for Beginners",
  blurb: "From your first notes on the neck to improvising over a band — in 10 short lessons. Each lesson takes 10–20 minutes; practise a little every day.",
  units: [
    { title: "Unit 1 · Foundations", lessons: ["notes-and-frets", "what-is-a-scale"] },
    { title: "Unit 2 · The minor pentatonic", lessons: ["minor-pentatonic", "play-over-a-groove", "move-the-shape"] },
    { title: "Unit 3 · The major scale", lessons: ["major-scale", "major-three-per-string"] },
    { title: "Unit 4 · Connecting scales", lessons: ["major-pentatonic-relative", "blues-scale", "jam-session"] }
  ]
};

const LESSONS = {
  "notes-and-frets": {
    title: "Notes, frets and semitones",
    minutes: 10,
    goals: ["Know the 12 notes and the half-steps E–F and B–C", "Find any natural note on the 6th and 5th strings"],
    theory: `
      <p>Music uses only <strong>12 different notes</strong>. After the 12th, the names repeat one <em>octave</em> higher:</p>
      <p class="formula">C · C♯/D♭ · D · D♯/E♭ · E · F · F♯/G♭ · G · G♯/A♭ · A · A♯/B♭ · B · <em>C again</em></p>
      <p>The distance from one note to the next is a <strong>semitone</strong> (half step). On the guitar a semitone is exactly <strong>one fret</strong>. Two semitones make a <strong>tone</strong> (whole step).</p>
      <p>The 7 <em>natural</em> notes are A B C D E F G. Between most of them there is a sharp/flat note — <strong>except E–F and B–C</strong>, which are only one fret apart. Remember that and you can work out every note on the neck.</p>
      <div class="deep-dive"><strong>Why one fret = one semitone (the maths).</strong> A string's pitch is its vibration frequency. An octave is <em>double</em> the frequency, and it is split into 12 equal steps, so each step multiplies the frequency by the same number r with r¹² = 2 → r = 2^(1/12) ≈ 1.0595. Frets are placed so each one shortens the vibrating string by that ratio: fret 12 halves the string and doubles the frequency (A string: 110 Hz open → 220 Hz at fret 12).</div>`,
    neck: { type: "naturals", strings: [0, 1] },
    practice: {
      metronome: 60,
      steps: [
        "Play the 6th string from open to fret 12 and say each note name out loud (E, F, F♯, G…).",
        "Do the same on the 5th string (A, A♯, B, C…).",
        "With the metronome at 60, play only the natural notes on the 6th string, one per click.",
        "Quiz yourself: where is G on the 6th string? C on the 5th string? (Tap the neck to check.)"
      ]
    }
  },

  "what-is-a-scale": {
    title: "What is a scale?",
    minutes: 12,
    goals: ["Understand scales as step patterns", "Use one finger per fret"],
    theory: `
      <p>A <strong>scale</strong> is a chosen set of notes played in order, starting from a home note called the <strong>root</strong> (or tonic). What gives each scale its sound is its <strong>pattern of steps</strong>: which gaps are 1 fret (H = half step) and which are 2 frets (W = whole step) or more.</p>
      <p>If you play all 12 notes you get the <em>chromatic</em> scale — every step is H. It has no "mood" because it uses everything. Real scales leave notes out, and that choice creates the colour: happy, sad, bluesy…</p>
      <p>Before learning scales, train your hand with the <strong>one finger per fret</strong> rule: finger 1 (index) on the first fret of a 4-fret zone, finger 2 on the next, 3 and 4 on the following ones. Your hand stays still and the fingers do the work.</p>
      <div class="deep-dive"><strong>Intervals.</strong> The distance from the root to each note is an <em>interval</em>, counted in semitones: 3 = minor 3rd (♭3), 4 = major 3rd (3), 5 = perfect 4th, 7 = perfect 5th, 10 = minor 7th (♭7), 12 = octave. Scales are lists of intervals — that's why the same scale can start on any root.</div>`,
    neck: { type: "chromatic", from: 1 },
    practice: {
      metronome: 60,
      steps: [
        "The 1-2-3-4 exercise: on the 6th string play frets 1, 2, 3, 4 with fingers 1, 2, 3, 4.",
        "Move to the 5th string and repeat, then all the way to the 1st string. Then come back down (4-3-2-1).",
        "Keep each finger pressed until you need it again. Play one note per click at 60 BPM.",
        "When it feels easy, raise the metronome to 80 and play two notes per click."
      ]
    }
  },

  "minor-pentatonic": {
    title: "Your first scale: the minor pentatonic",
    minutes: 15,
    goals: ["Play the A minor pentatonic box", "Know its 5 notes: R ♭3 4 5 ♭7"],
    theory: `
      <p>The <strong>minor pentatonic</strong> ("penta" = five) is the most used scale in rock, blues and pop solos. It has only <strong>5 notes</strong>:</p>
      <p class="formula">R · ♭3 · 4 · 5 · ♭7 &nbsp;→&nbsp; in A: A · C · D · E · G</p>
      <p>It has <strong>no half steps</strong> (every gap is 3 or 2 frets), so no two neighbouring notes clash. That's why it sounds good over almost anything in its key — perfect for beginners.</p>
      <p>On the neck it makes a <strong>box</strong> of two notes per string. In A, the box starts on fret 5 (the A on the 6th string). Fingers: 1 and 4 on the outer strings, 1 and 3 on the middle strings. The <span class="tag root">red</span> notes are the root A — your "home".</p>
      <div class="deep-dive"><strong>Why only 5 notes?</strong> The pentatonic is the minor scale with its two "tense" notes removed (the 2nd and the ♭6, which sit a half step from their neighbours). Fewer notes = fewer wrong notes.</div>`,
    neck: { type: "scale", scale: "min-pent", root: 9, view: "box", labels: "fingers" },
    practice: {
      metronome: 60,
      steps: [
        "Play the box from the lowest note to the highest, one note per click (60 BPM). Then back down.",
        "Say the interval names while you play: R, ♭3, 4, 5, ♭7, R…",
        "Play only the red root notes (3 of them). Then root → next note → root.",
        "Raise the metronome to 80 BPM. Use alternate picking: down, up, down, up."
      ]
    }
  },

  "play-over-a-groove": {
    title: "Play over a groove",
    minutes: 15,
    goals: ["Improvise short phrases over a backing track", "End phrases on the root"],
    theory: `
      <p>Now the fun part: make music! Press play on the backing track below. It loops every 30 seconds, so you can practise as long as you like.</p>
      <p>Three rules for your first solos:</p>
      <ol>
        <li><strong>Play less.</strong> Short phrases of 3–5 notes, then rest. Silence is part of the music.</li>
        <li><strong>Question & answer.</strong> Play a phrase (question), rest, then play a similar one that ends somewhere else (answer).</li>
        <li><strong>Land on the root.</strong> Ending a phrase on a red note sounds "finished" — it is the note the whole song gravitates to.</li>
      </ol>
      <div class="deep-dive"><strong>Why the root feels like home.</strong> The bass and chords keep returning to the root, so your ear uses it as a reference. Notes far from the root create tension; landing on it releases the tension — that push-and-pull is what makes melodies interesting.</div>`,
    neck: { type: "scale", scale: "min-pent", root: 9, view: "box", labels: "names", followTrack: true },
    practice: {
      track: "minor-groove", key: 9, scale: "min-pent",
      steps: [
        "Listen to the track once without playing. Tap your foot to the beat.",
        "Play only root notes, on beat 1 of each bar.",
        "Play 3-note phrases that end on a root. Rest for a bar between phrases.",
        "Try question & answer: phrase one ends on the 5th, phrase two ends on the root."
      ]
    }
  },

  "move-the-shape": {
    title: "Change key: move the shape",
    minutes: 15,
    goals: ["Play the pentatonic in any key", "Find the root on the 6th string"],
    theory: `
      <p>Here is the guitar's superpower: <strong>shapes are movable</strong>. The box you learned starts on the root on the 6th string. Slide the whole box so it starts on a different note and you are playing the minor pentatonic in that key.</p>
      <table class="mini-table"><tr><th>Key</th><td>E</td><td>F</td><td>G</td><td>A</td><td>B</td><td>C</td><td>D</td></tr>
      <tr><th>Root fret (6th string)</th><td>0 / 12</td><td>1</td><td>3</td><td>5</td><td>7</td><td>8</td><td>10</td></tr></table>
      <p>Choose a key in the backing track player below: the track changes key <em>and</em> the neck moves the box for you. Find the new root on the 6th string, then play the same patterns as before.</p>
      <div class="deep-dive"><strong>How the track changes key.</strong> Every note's frequency is multiplied by 2^(n/12) to move it n semitones — the same maths as frets. The audio is shifted with a pitch-shifting algorithm that keeps the speed constant, so a track in A becomes a track in C (n = 3) at the same tempo.</div>`,
    neck: { type: "scale", scale: "min-pent", root: 9, view: "box", labels: "intervals", followTrack: true },
    practice: {
      track: "minor-groove", key: 0, scale: "min-pent",
      steps: [
        "Pick the key of C in the player. Find C on the 6th string (fret 8) and play the box from there.",
        "Switch to G (fret 3) and repeat. Then E (open strings or fret 12).",
        "Let a friend (or the shuffle button) pick a random key; find the root before the track loops.",
        "Improvise 1 minute in each of 3 different keys."
      ]
    }
  },

  "major-scale": {
    title: "The major scale",
    minutes: 15,
    goals: ["Know the formula W W H W W W H", "Play G major over one octave"],
    theory: `
      <p>The <strong>major scale</strong> is the "do-re-mi" scale and the base of Western harmony. It has 7 notes, built with this step pattern:</p>
      <p class="formula">W · W · H · W · W · W · H &nbsp;→&nbsp; in G: G A B C D E F♯ G</p>
      <p>Count it on one string: from G, +2 frets (A), +2 (B), +1 (C), +2 (D), +2 (E), +2 (F♯), +1 (G). On the neck we play it across strings so the hand doesn't have to travel.</p>
      <p>Compared with the minor pentatonic it has a <strong>major 3rd</strong> (4 semitones above the root) — that single note is what makes it sound bright and happy.</p>
      <div class="deep-dive"><strong>Major vs minor 3rd.</strong> Our ear judges a chord or scale as "happy" or "sad" mostly by its 3rd: 4 semitones above the root (major) or 3 (minor). The frequency ratio of a major 3rd is close to 5:4; a minor 3rd is close to 6:5.</div>`,
    neck: { type: "scale", scale: "major", root: 7, view: "octave", labels: "names" },
    practice: {
      metronome: 60,
      steps: [
        "Play the 8 notes from G to G slowly, saying the note names.",
        "Sing 'do-re-mi-fa-sol-la-ti-do' while you play — your ear already knows this scale.",
        "Play it descending (G F♯ E D C B A G).",
        "Play it at 80 BPM, one note per click, without stopping."
      ]
    }
  },

  "major-three-per-string": {
    title: "Major scale: three notes per string",
    minutes: 20,
    goals: ["Play two octaves of G major", "Improvise over a pop progression"],
    theory: `
      <p>To cover more of the neck, guitarists play the major scale with <strong>three notes on every string</strong>. Each string uses one of two finger patterns: <strong>1-3-4</strong> (whole, whole steps) or <strong>1-2-4</strong> (half, whole step).</p>
      <p>The backing track uses a classic pop progression built from the major key's own chords: <strong>I – ii – vi – IV</strong> (in G: G – Am – Em – C). Every note of the G major scale fits over it.</p>
      <div class="deep-dive"><strong>Where chords come from.</strong> Stack every other note of the scale: G-B-D (G major), A-C-E (A minor), B-D-F♯ (B minor), C-E-G (C), D-F♯-A (D), E-G-B (E minor), F♯-A-C (F♯ dim). Songs in G mostly use these 7 chords — that's why the scale fits them all.</div>`,
    neck: { type: "scale", scale: "major", root: 7, view: "box", labels: "fingers", followTrack: true },
    practice: {
      track: "pop-major", key: 7, scale: "major",
      steps: [
        "Play the pattern up and down at 60 BPM with the metronome (fingers 1-3-4 / 1-2-4).",
        "Start the backing track. Play the notes of each chord when it comes: G on the G chord, D on the D chord…",
        "Improvise phrases that end on G (the root).",
        "Change the key in the player and move the pattern."
      ]
    }
  },

  "major-pentatonic-relative": {
    title: "Major pentatonic & the relative minor",
    minutes: 15,
    goals: ["Play the major pentatonic", "Understand relative major/minor"],
    theory: `
      <p>Remove the two half-step notes (4th and 7th) from the major scale and you get the <strong>major pentatonic</strong>:</p>
      <p class="formula">R · 2 · 3 · 5 · 6 &nbsp;→&nbsp; in C: C D E G A</p>
      <p>Look closely: <strong>C major pentatonic has exactly the same notes as A minor pentatonic</strong> (A C D E G). They are <em>relatives</em>: every major key has a relative minor 3 semitones (3 frets) below it. Same notes, different home note — and the home note decides the mood.</p>
      <p>So the A-minor box you already know also works over a C major song: just treat <strong>C</strong> as home instead of A.</p>
      <div class="deep-dive"><strong>Relative keys.</strong> C major and A minor share the same 7 notes (no sharps or flats). G major ↔ E minor, D major ↔ B minor, F major ↔ D minor. Move 3 frets down from a major root to find its relative minor.</div>`,
    neck: { type: "scale", scale: "maj-pent", root: 0, view: "box", labels: "intervals", followTrack: true },
    practice: {
      track: "folk-major", key: 0, scale: "maj-pent",
      steps: [
        "Play the C major pentatonic box (starting on C, fret 8 of the 6th string).",
        "Now play the A minor pentatonic box at fret 5 over the same track — same notes!",
        "Improvise and end phrases on C. Notice how it sounds sweet and country-like.",
        "Change key and find the major root on the 6th string."
      ]
    }
  },

  "blues-scale": {
    title: "The blues scale",
    minutes: 15,
    goals: ["Add the 'blue note' to the minor pentatonic", "Play over a 12-bar blues"],
    theory: `
      <p>Add one note to the minor pentatonic — the <strong>♭5</strong> — and you get the <strong>blues scale</strong>:</p>
      <p class="formula">R · ♭3 · 4 · ♭5 · 5 · ♭7 &nbsp;→&nbsp; in A: A C D E♭ E G</p>
      <p>The ♭5 is the "blue note". It sounds tense and gritty, so use it as a <strong>passing note</strong>: slide through it from the 4 to the 5 (D → E♭ → E) instead of stopping on it.</p>
      <p>The backing track is a <strong>12-bar blues</strong>: 12 bars using three chords (I7, IV7, V7 — in A: A7, D7, E7), repeated over and over. It is the foundation of blues, rock'n'roll and jazz.</p>
      <div class="deep-dive"><strong>Why the ♭5 sounds so tense.</strong> It sits exactly half an octave above the root (6 semitones, frequency ratio √2 ≈ 1.414 — an irrational number, far from any simple ratio). Simple ratios like 3:2 (the 5th) sound stable; √2 sounds unresolved, so the ear wants to move on.</div>`,
    neck: { type: "scale", scale: "blues", root: 9, view: "box", labels: "intervals", followTrack: true },
    practice: {
      track: "blues-shuffle", key: 9, scale: "blues",
      steps: [
        "Play the blues scale box up and down slowly. Find the ♭5 on the 5th and 3rd strings.",
        "Practise the slide 4 → ♭5 → 5 several times.",
        "Over the shuffle, improvise with the minor pentatonic and add the blue note now and then.",
        "Count the 12 bars: try to play a phrase that ends on the root exactly when the form starts again."
      ]
    }
  },

  "jam-session": {
    title: "Jam session",
    minutes: 20,
    goals: ["Choose a scale for any track", "Improvise across the whole neck"],
    theory: `
      <p>Congratulations — you know four scales! Now put them together. Pick any backing track and key below, choose a scale that fits, and improvise. For more grooves, a tempo control and live chord display, open the <a href="#/jam">Jam room</a>.</p>
      <table class="mini-table">
        <tr><th>Track</th><th>Scales that fit</th></tr>
        <tr><td>Minor groove</td><td>Minor pentatonic, blues scale</td></tr>
        <tr><td>Blues shuffle</td><td>Blues scale, minor pentatonic (and major pentatonic for a sweeter sound)</td></tr>
        <tr><td>Pop (major)</td><td>Major scale, major pentatonic</td></tr>
        <tr><td>Folk (major)</td><td>Major pentatonic, major scale</td></tr>
      </table>
      <p>The neck below shows the scale <strong>across the whole neck</strong> — every pitch once — so you can connect the boxes you know and travel up and down while you play.</p>
      <div class="deep-dive"><strong>Next steps.</strong> Learn the other 4 pentatonic boxes (Fretboard &amp; Tuner → Scale → One position, move the start position), try bends and vibrato, and transcribe short melodies by ear.</div>`,
    neck: { type: "scale", scale: "min-pent", root: 9, view: "neck", labels: "names", followTrack: true },
    practice: {
      track: "minor-groove", key: 9, scale: "min-pent", free: true,
      steps: [
        "Improvise 2 minutes over each track.",
        "Use at least two different boxes in one solo.",
        "Record yourself on your phone and listen back: which phrases sound best?"
      ]
    }
  }
};

const SCHOOL_SCALES = {
  "min-pent": { name: "Minor pentatonic", iv: [0, 3, 5, 7, 10] },
  "maj-pent": { name: "Major pentatonic", iv: [0, 2, 4, 7, 9] },
  "blues": { name: "Blues scale", iv: [0, 3, 5, 6, 7, 10] },
  "major": { name: "Major scale", iv: [0, 2, 4, 5, 7, 9, 11] },
  "minor": { name: "Natural minor", iv: [0, 2, 3, 5, 7, 8, 10] }
};

const allLessonIds = () => COURSE.units.flatMap(u => u.lessons);
const doneLessons = () => store.get("school:done", []);

/* ---------- Scale shapes (standard tuning) ---------- */

// Returns [{s, f, m}] for a scale shape. view: "box" (2–3 notes/string from the root
// on the 6th string), "octave" (root to root), "neck" (whole range, each pitch once).
function schoolShape(rootPc, iv, view) {
  const T = STANDARD_TUNING, FRETS = 15;
  const pcs = iv.map(i => pc(rootPc + i));
  const cells = [];
  if (view === "neck") {
    const seq = [];
    for (let m = T[0]; m <= T[5] + FRETS; m++) if (pcs.includes(pc(m))) seq.push(m);
    const per = Math.ceil(seq.length / 6);
    let s = 0, n = 0;
    for (const m of seq) {
      while (s < 5 && (n >= per || m - T[s] > FRETS) && m - T[s + 1] >= 0) { s++; n = 0; }
      const f = m - T[s];
      if (f >= 0 && f <= FRETS) { cells.push({ s, f, m }); n++; }
    }
    return cells;
  }
  const per = iv.length >= 7 ? 3 : 2;
  let f0 = pc(rootPc - T[0]);                // root on the 6th string (0–11)
  if (f0 === 0 && view === "box" && iv.length < 7) f0 = 0;
  const start = T[0] + f0;
  const limit = view === "octave" ? start + 12 : start + 40;
  const seq = [];
  for (let m = start; m <= limit; m++) if (pcs.includes(pc(m))) seq.push(m);
  let k = 0;
  for (let s = 0; s < 6 && k < seq.length; s++) {
    let placed = 0;
    while (placed < per && k < seq.length) {
      const f = seq[k] - T[s];
      if (f < 0) { k++; continue; }
      if (f > FRETS) break;
      cells.push({ s, f, m: seq[k] }); k++; placed++;
    }
  }
  return cells;
}

// Finger per string: one finger per fret when it fits, otherwise in order.
function schoolFingers(cells) {
  const out = new Map();
  for (let s = 0; s < 6; s++) {
    const fs = cells.filter(c => c.s === s && c.f > 0).map(c => c.f).sort((a, b) => a - b);
    if (!fs.length) continue;
    const first = fs[0], last = fs[fs.length - 1];
    fs.forEach((f, k) => {
      let fg;
      if (last - first <= 3) fg = f - first + 1;
      else if (fs.length >= 4) fg = Math.min(4, k + 1);
      else if (fs.length === 3) fg = k === 0 ? 1 : k === 2 ? 4 : (f - first <= last - f ? 2 : 3);
      else fg = k === 0 ? 1 : 4;
      out.set(s + ":" + f, fg);
    });
  }
  return out;
}

/* ---------- Mini neck (display only, tap to hear) ---------- */
function miniNeckHTML(dots, frets = 15) {
  const rows = [];
  for (let s = 5; s >= 0; s--) {
    const cells = [];
    for (let f = 0; f <= frets; f++) {
      const d = dots.get(s + ":" + f);
      cells.push(`<div class="fb-cell ${f === 0 ? "open" : ""}" data-s="${s}" data-f="${f}">${d ? `<span class="fb-dot ${d.cls}">${d.label}</span>` : ""}</div>`);
    }
    rows.push(`<div class="fb-row" style="--thick:${(1 + (5 - s) * 0.45).toFixed(2)}px">
      <div class="fb-tune"><span class="fb-note mini">${noteName(STANDARD_TUNING[s], false)}</span></div>
      <div class="fb-strings static">${cells.join("")}</div></div>`);
  }
  const marks = [];
  for (let f = 0; f <= frets; f++) {
    const m = [3, 5, 7, 9, 15].includes(f) ? "●" : f === 12 ? "●●" : "";
    marks.push(`<div class="fb-cell mark"><span>${f}</span><b>${m}</b></div>`);
  }
  rows.push(`<div class="fb-row markers"><div class="fb-tune"></div><div class="fb-strings">${marks.join("")}</div></div>`);
  return `<div class="fb-wrap"><div class="fb mini-neck">${rows.join("")}</div></div>`;
}

/* ---------- Metronome (Web Audio, scheduled ahead for steady timing) ---------- */
const Metronome = (() => {
  let ctx, timer = null, next = 0, beat = 0, bpm = 60, onBeat = null;
  function click(time, accent) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = accent ? 1600 : 1000;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(accent ? 0.5 : 0.3, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    o.connect(g).connect(ctx.destination);
    o.start(time); o.stop(time + 0.07);
  }
  function tick() {
    while (next < ctx.currentTime + 0.12) {
      click(next, beat % 4 === 0);
      const b = beat % 4, delay = (next - ctx.currentTime) * 1000;
      if (onBeat) setTimeout(() => onBeat(b), Math.max(0, delay));
      next += 60 / bpm; beat++;
    }
  }
  return {
    start(newBpm, cb) {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume();
      bpm = newBpm; onBeat = cb; beat = 0; next = ctx.currentTime + 0.05;
      clearInterval(timer); timer = setInterval(tick, 25); tick();
    },
    setBpm(b) { bpm = b; },
    stop() { clearInterval(timer); timer = null; },
    get running() { return !!timer; }
  };
})();

/* ---------- Backing track player (gapless loop with Web Audio) ---------- */
const Backing = (() => {
  let ctx, src = null, gain = null, el = null, vol = 0.8;
  const cache = new Map();
  async function load(url) {
    if (cache.has(url)) return cache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    cache.set(url, buf);
    return buf;
  }
  function stop() {
    if (src) { try { src.stop(); } catch { /* already stopped */ } src = null; }
    if (el) { el.pause(); el = null; }
  }
  return {
    async play(trackId, keyPc) {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      await ctx.resume();
      stop();
      const t = TRACKS[trackId];
      const url = `audio/tracks/${trackId}/${KEY_FILES[keyPc]}.mp3`;
      try {
        const buf = await load(url);
        gain = gain || ctx.createGain();
        gain.gain.value = vol;
        gain.connect(ctx.destination);
        src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.loopStart = 0;
        src.loopEnd = Math.min(buf.duration, t.loopSeconds || buf.duration);
        src.connect(gain);
        src.start();
      } catch {
        // file:// pages can't fetch(): fall back to a plain looping <audio> element.
        el = new Audio(url); el.loop = true; el.volume = vol;
        await el.play();
      }
    },
    stop,
    setVolume(v) { vol = v; if (gain) gain.gain.value = v; if (el) el.volume = v; },
    get playing() { return !!(src || el); }
  };
})();

/* ---------- Pages ---------- */

function renderSchool() {
  setActiveNav("school");
  document.title = "Scales for Beginners — Cifra Online School";
  const ids = allLessonIds();
  const done = doneLessons();
  const nextId = ids.find(id => !done.includes(id)) || ids[ids.length - 1];
  const pct = Math.round(done.filter(id => ids.includes(id)).length / ids.length * 100);
  let n = 0;
  app.innerHTML = `
    <section class="hero school-hero">
      <p class="eyebrow">Cifra Online School · Learning trail</p>
      <h1>${COURSE.title}</h1>
      <p class="lead">${COURSE.blurb}</p>
      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <p class="stats"><strong>${pct}%</strong> complete · ${done.length} of ${ids.length} lessons</p>
      <a class="btn primary" href="#/lesson/${nextId}">${done.length ? "Continue" : "Start the course"}: ${LESSONS[nextId].title} →</a>
    </section>
    ${COURSE.units.map(u => `
      <h2>${u.title}</h2>
      <div class="trail">${u.lessons.map(id => {
        n++;
        const l = LESSONS[id], isDone = done.includes(id), isNext = id === nextId;
        return `<a class="lesson-card ${isDone ? "done" : ""} ${isNext ? "next" : ""}" href="#/lesson/${id}">
          <span class="lesson-num">${isDone ? "✓" : n}</span>
          <span class="lesson-main"><span class="lesson-title">${l.title}</span>
            <span class="song-meta">${l.minutes} min · ${l.goals[0]}</span></span>
          ${l.practice.track ? `<span class="badge">🎧 Backing track</span>` : ""}
        </a>`;
      }).join("")}</div>`).join("")}
  `;
}

function renderLesson(id) {
  const l = LESSONS[id];
  if (!l) return renderNotFound();
  setActiveNav("school");
  const ids = allLessonIds(), idx = ids.indexOf(id);
  document.title = `${l.title} — Cifra Online School`;
  const P = l.practice;
  const st = {
    labels: l.neck.labels || "names",
    key: store.get("school:key:" + id, P.key ?? l.neck.root ?? 9),
    track: store.get("school:track:" + id, P.track || null),
    scale: store.get("school:scale:" + id, P.scale || l.neck.scale || "min-pent"),
    bpm: P.metronome || 60
  };
  const checks = store.get("school:steps:" + id, []);

  app.innerHTML = `
    <nav class="crumbs"><a href="#/">${COURSE.title}</a> › <span>Lesson ${idx + 1} of ${ids.length}</span></nav>
    <header class="lesson-header">
      <h1>${l.title}</h1>
      <p class="song-meta">⏱ ${l.minutes} min</p>
      <ul class="goals">${l.goals.map(g => `<li>🎯 ${g}</li>`).join("")}</ul>
    </header>

    <section class="panel lesson-theory"><h2>Learn</h2>${l.theory}</section>

    <section class="panel">
      <h2>On the neck <small>(tap a note to hear it)</small></h2>
      <div class="neck-tools" id="neckTools"></div>
      <div id="neck"></div>
      <div id="neckLegend" class="fb-legend"></div>
    </section>

    <section class="panel">
      <h2>Practice</h2>
      ${P.track ? `<div class="player" id="player"></div>` : ""}
      <div class="metronome" id="metro">
        <button class="btn" id="metroBtn">▶ Metronome</button>
        <label class="tool"><span class="tool-label">BPM</span>
          <input type="range" id="bpm" min="40" max="160" value="${st.bpm}"> <strong id="bpmVal">${st.bpm}</strong></label>
        <span class="beats" id="beats"><i></i><i></i><i></i><i></i></span>
      </div>
      <ol class="checklist">${P.steps.map((s, i) => `
        <li><label><input type="checkbox" data-step="${i}" ${checks.includes(i) ? "checked" : ""}> <span>${s}</span></label></li>`).join("")}
      </ol>
    </section>

    <div class="lesson-nav">
      ${idx > 0 ? `<a class="btn" href="#/lesson/${ids[idx - 1]}">← ${LESSONS[ids[idx - 1]].title}</a>` : `<span></span>`}
      <button class="btn primary" id="completeBtn"></button>
      ${idx < ids.length - 1 ? `<a class="btn" href="#/lesson/${ids[idx + 1]}">${LESSONS[ids[idx + 1]].title} →</a>` : `<a class="btn" href="#/">Back to the trail</a>`}
    </div>
  `;

  /* neck */
  function drawNeck() {
    const N = l.neck;
    const dots = new Map();
    let legend = "";
    if (N.type === "naturals") {
      for (const s of N.strings) for (let f = 0; f <= 12; f++) {
        const m = STANDARD_TUNING[s] + f, name = SHARPS[pc(m)];
        dots.set(s + ":" + f, { label: pretty(name), cls: name.length === 1 ? "natural" : "accidental" });
      }
      legend = `<span><i class="fb-dot natural">C</i> natural note</span><span><i class="fb-dot accidental">C♯</i> sharp / flat</span><span>E–F and B–C: no note in between</span>`;
    } else if (N.type === "chromatic") {
      for (let s = 0; s < 6; s++) for (let f = N.from; f < N.from + 4; f++) dots.set(s + ":" + f, { label: String(f - N.from + 1), cls: "role-other finger" });
      legend = `<span>Numbers = fingers: 1 index · 2 middle · 3 ring · 4 pinky</span>`;
    } else {
      const sc = SCHOOL_SCALES[N.followTrack ? st.scale : N.scale];
      const root = N.followTrack ? pc(st.key + (P.rootOffset || 0)) : N.root;
      const cells = schoolShape(root, sc.iv, N.view);
      const fingers = schoolFingers(cells);
      const spell = spellSet(root, sc.iv, false);
      const names = SCALE_INTERVALS;
      cells.forEach(c => {
        const i = pc(c.m - root);
        const label = st.labels === "fingers" ? String(c.f === 0 ? 0 : fingers.get(c.s + ":" + c.f))
          : st.labels === "intervals" ? names[i] : spell.get(pc(c.m));
        dots.set(c.s + ":" + c.f, { label, cls: "role-" + intervalRole(i) + (st.labels === "fingers" ? " finger" : "") + (c.f === 0 && st.labels === "fingers" ? " open-string" : "") });
      });
      legend = `<span class="legend-title"><strong>${spell.get(root)} ${sc.name}</strong>: ${sc.iv.map(i => spell.get(pc(root + i))).join(" · ")}</span>
        <span><i class="fb-dot role-root"></i> root</span><span><i class="fb-dot role-third"></i> 3rd</span><span><i class="fb-dot role-fifth"></i> 5th</span><span><i class="fb-dot role-seventh"></i> 7th</span><span><i class="fb-dot role-other"></i> other</span>`;
      $("#neckTools").innerHTML = `
        <div class="chips">${[["names", "Note names"], ["intervals", "Intervals"], ["fingers", "Fingers ✋"]].map(([v, t]) =>
          `<button class="chip ${st.labels === v ? "on" : ""}" data-lab="${v}">${t}</button>`).join("")}</div>
        <button class="btn small" id="playShape">▶ Play the scale</button>
        <a class="btn small" href="#/tuner" id="openTuner">Open in Fretboard &amp; Tuner →</a>`;
      $("#neckTools").querySelectorAll("[data-lab]").forEach(b => b.onclick = () => { st.labels = b.dataset.lab; drawNeck(); });
      $("#playShape").onclick = () => GuitarAudio.playSequence(cells.map(c => c.m).sort((a, b) => a - b), 0.26);
      $("#openTuner").onclick = () => {
        store.set("fb", { ...store.get("fb", {}), tuning: [...STANDARD_TUNING], mode: "scale", scaleRoot: root,
          scaleType: { "min-pent": "min-pent", "maj-pent": "maj-pent", blues: "blues", major: "major", minor: "minor" }[N.followTrack ? st.scale : N.scale],
          scaleView: N.view === "box" ? "pattern" : N.view, scalePos: null });
      };
    }
    $("#neck").innerHTML = miniNeckHTML(dots);
    $("#neckLegend").innerHTML = legend;
  }
  $("#neck").addEventListener("click", e => {
    const c = e.target.closest(".fb-cell[data-s]");
    if (c) GuitarAudio.playMidi(STANDARD_TUNING[+c.dataset.s] + +c.dataset.f);
  });

  /* backing track player */
  function drawPlayer() {
    if (!P.track) return;
    const t = TRACKS[st.track];
    const box = $("#player");
    if (!t) { box.innerHTML = `<p class="hint">This backing track is still being prepared.</p>`; return; }
    const shift = pc(st.key - t.root);
    // Spell chords like the key signature: C minor / F major use flats (E♭, B♭), E major sharps.
    const flats = keyUsesFlats(transposeKey(ROOT_NAMES[t.root] + (t.mode === "minor" ? "m" : ""), shift));
    const runs = [];
    t.prog.forEach(c => { const last = runs[runs.length - 1]; if (last && last[0] === c) last[1]++; else runs.push([c, 1]); });
    const chords = runs.map(([c, n]) => transposeChord(c, shift, flats).replace("#", "♯").replace(/([A-G])b/, "$1♭") + (n > 1 ? ` <small>×${n}</small>` : ""));
    const keyName = pretty(ROOT_NAMES[st.key]) + (t.mode === "minor" ? "m" : "");
    const trackOptions = P.free ? Object.entries(TRACKS).map(([id, tr]) => `<button class="chip ${id === st.track ? "on" : ""}" data-track="${id}">${tr.title}</button>`).join("") : "";
    const scaleOptions = P.free ? Object.entries(SCHOOL_SCALES).map(([id, sc]) => `<button class="chip ${id === st.scale ? "on" : ""}" data-scale="${id}">${sc.name}</button>`).join("") : "";
    box.innerHTML = `
      <div class="player-head">
        <button class="play-btn" id="playBtn" aria-label="Play backing track">${Backing.playing ? "❚❚" : "▶"}</button>
        <div><strong>🎧 ${t.title}</strong> <span class="song-meta">· ${t.style} · ${Math.round(t.bpm)} BPM · loops every ${Math.round(t.loopSeconds)} s</span>
          <div class="chord-pills">${chords.map(c => `<span class="pill">${c}</span>`).join("")}</div></div>
        <label class="tool vol"><span class="tool-label">Vol</span><input type="range" id="vol" min="0" max="1" step="0.05" value="0.8"></label>
      </div>
      ${P.free ? `<div class="chips player-row"><span class="tool-label">Track</span>${trackOptions}</div>
        <div class="chips player-row"><span class="tool-label">Scale</span>${scaleOptions}</div>` : ""}
      <div class="chips player-row"><span class="tool-label">Key</span>
        ${ROOT_NAMES.map((n, i) => `<button class="chip ${i === st.key ? "on" : ""}" data-key="${i}">${pretty(n)}</button>`).join("")}
        <button class="chip" id="shuffleKey" title="Random key">🎲</button></div>
      <p class="hint">Key: <strong>${keyName}</strong> — play the ${SCHOOL_SCALES[st.scale].name.toLowerCase()} from
        <strong>${pretty(ROOT_NAMES[pc(st.key + (P.rootOffset || 0))])}</strong> (6th string, fret ${pc(st.key + (P.rootOffset || 0) - STANDARD_TUNING[0])}). The neck above follows the key.</p>`;
    $("#playBtn").onclick = async () => {
      if (Backing.playing) Backing.stop();
      else { $("#playBtn").textContent = "…"; try { await Backing.play(st.track, st.key); } catch { box.querySelector(".hint").textContent = "Could not load the audio file."; } }
      drawPlayer();
    };
    $("#vol").oninput = e => Backing.setVolume(+e.target.value);
    const restart = async () => { const was = Backing.playing; drawPlayer(); drawNeck(); if (was) { await Backing.play(st.track, st.key); drawPlayer(); } };
    box.querySelectorAll("[data-key]").forEach(b => b.onclick = () => { st.key = +b.dataset.key; store.set("school:key:" + id, st.key); restart(); });
    $("#shuffleKey").onclick = () => { st.key = Math.floor(Math.random() * 12); store.set("school:key:" + id, st.key); restart(); };
    box.querySelectorAll("[data-track]").forEach(b => b.onclick = () => { st.track = b.dataset.track; store.set("school:track:" + id, st.track); restart(); });
    box.querySelectorAll("[data-scale]").forEach(b => b.onclick = () => { st.scale = b.dataset.scale; store.set("school:scale:" + id, st.scale); drawPlayer(); drawNeck(); });
  }

  /* metronome */
  const beats = [...document.querySelectorAll("#beats i")];
  $("#metroBtn").onclick = () => {
    if (Metronome.running) { Metronome.stop(); $("#metroBtn").textContent = "▶ Metronome"; beats.forEach(b => b.className = ""); return; }
    Metronome.start(st.bpm, b => beats.forEach((x, i) => x.className = i === b ? "on" : ""));
    $("#metroBtn").textContent = "❚❚ Stop";
  };
  $("#bpm").oninput = e => { st.bpm = +e.target.value; $("#bpmVal").textContent = st.bpm; Metronome.setBpm(st.bpm); };

  /* checklist + completion */
  app.querySelectorAll("[data-step]").forEach(c => c.onchange = () => {
    const list = [...app.querySelectorAll("[data-step]")].filter(x => x.checked).map(x => +x.dataset.step);
    store.set("school:steps:" + id, list);
  });
  function drawComplete() {
    const done = doneLessons().includes(id);
    $("#completeBtn").textContent = done ? "✓ Completed" : "Mark lesson as complete";
    $("#completeBtn").classList.toggle("done", done);
  }
  $("#completeBtn").onclick = () => {
    const d = doneLessons();
    const i = d.indexOf(id);
    if (i === -1) d.push(id); else d.splice(i, 1);
    store.set("school:done", d);
    drawComplete();
  };

  cleanup = () => { Metronome.stop(); Backing.stop(); };
  drawNeck(); drawPlayer(); drawComplete();
}
