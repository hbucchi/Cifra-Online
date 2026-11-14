/* Cifra Online — single-page app with hash routing. No build step needed. */

const $ = (sel, el = document) => el.querySelector(sel);
const app = $("#app");

const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("cifra:" + key);
      return v === null ? fallback : JSON.parse(v);
    } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("cifra:" + key, JSON.stringify(value)); } catch { /* ignore */ }
  }
};

const LEVELS = { 1: "Beginner", 2: "Easy", 3: "Intermediate" };
const EASY_KEYS = ["C", "G", "D", "A", "E", "Am", "Em", "Dm"];

const prefs = {
  lefty: store.get("lefty", false),
  fontSize: store.get("fontSize", 18),
  showDiagrams: store.get("showDiagrams", true)
};

let scrollTimer = null;
function stopAutoScroll() {
  if (scrollTimer) cancelAnimationFrame(scrollTimer);
  scrollTimer = null;
}

/* ---------- Helpers ---------- */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setActiveNav(route) {
  document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
}

/* ---------- Chord library ---------- */

function renderChords() {
  setActiveNav("chords");
  document.title = "Chord library — Cifra Online";
  const groups = {
    "Major": ["C", "D", "E", "F", "G", "A", "Bb"],
    "Minor": ["Am", "Bm", "Dm", "Em"],
    "Seventh (7)": ["A7", "B7", "C7", "D7", "E7", "G7"],
    "Minor seventh (m7)": ["Am7", "Dm7", "Em7", "F#m7"]
  };
  app.innerHTML = `
    <h1>Chord library</h1>
    <p class="lead">Every chord used on this site, in beginner-friendly shapes. Tap a chord to hear it.</p>
    <div class="legend">
      <span><b class="dot-sample"></b> press here (number = finger: 1 index, 2 middle, 3 ring, 4 pinky)</span>
      <span><b class="open-sample"></b> play the open string</span>
      <span><b>×</b> don't play this string</span>
    </div>
    ${Object.entries(groups).map(([g, list]) => `
      <h2>${g}</h2>
      <div class="diagrams big">${list.map(c => `
        <button class="diagram-card" data-chord="${c}">
          <span class="diagram-name">${c}</span>
          ${chordDiagramSVG(c, { lefty: prefs.lefty })}
          ${CHORD_LIBRARY[c].note ? `<small>${CHORD_LIBRARY[c].note}</small>` : ""}
        </button>`).join("")}
      </div>`).join("")}
  `;
  const onClick = e => {
    const b = e.target.closest("[data-chord]");
    if (b) GuitarAudio.strum(getFingering(b.dataset.chord).frets);
  };
  app.addEventListener("click", onClick);
  cleanup = () => app.removeEventListener("click", onClick);
}

/* ---------- Learn ---------- */

function renderLearn() {
  setActiveNav("learn");
  document.title = "Start here — Cifra Online";
  app.innerHTML = `
    <h1>Start here</h1>
    <p class="lead">Five things to know before your first lesson.</p>

    <section class="learn-card">
      <h2>1. Tune your guitar</h2>
      <p>Standard tuning, from the thickest string to the thinnest: <strong>E A D G B E</strong>. Tap a string to hear its reference note and tune until they match.</p>
      <div class="tuner">${OPEN_STRINGS.map((s, i) => `
        <button class="string-btn" data-string="${i}"><b>${s.name}<sub>${s.octave}</sub></b><small>${s.freq.toFixed(1)} Hz</small></button>`).join("")}
      </div>
      <p class="hint">Each string is 5 frets (semitones) above the previous one — except G→B, which is 4. That's why the 5th-fret tuning trick works.</p>
      <p><a class="btn" href="#/tuner">Open the Fretboard &amp; Tuner →</a> to try other tunings and see what they change.</p>
    </section>

    <section class="learn-card">
      <h2>2. Read a chord diagram</h2>
      <div class="learn-row">
        <div class="diagram-card static">${chordDiagramSVG("C")}</div>
        <ul>
          <li>Vertical lines are the <strong>strings</strong> (thick low E on the left).</li>
          <li>Horizontal lines are the <strong>frets</strong>; the thick bar at the top is the nut.</li>
          <li>Dots show where to press; the number is the <strong>finger</strong>.</li>
          <li><strong>○</strong> = play open, <strong>×</strong> = don't play.</li>
        </ul>
      </div>
    </section>

    <section class="learn-card">
      <h2>3. Read a chord chart</h2>
      <div class="bars demo"><span class="bar"><span class="chord">C</span></span><span class="bar"><span class="chord">G</span></span><span class="bar"><span class="chord">Am</span><span class="chord">F</span></span></div>
      <p>Each box is one <strong>bar</strong> (4 beats). Two chords in one box share it: 2 beats each. <span class="repeat">×2</span> means play the section twice.</p>
    </section>

    <section class="learn-card">
      <h2>4. Strumming</h2>
      <p>Count <strong>1 &amp; 2 &amp; 3 &amp; 4 &amp;</strong>. Your hand goes <strong>down on the numbers</strong> and <strong>up on the “&amp;”</strong> — always, like a pendulum. A pattern just tells you which swings actually hit the strings.</p>
      <p>Start with all down-strums (<code>↓ · ↓ · ↓ · ↓ ·</code>), then try the most common pattern in pop: <code>↓ · ↓ ↑ · ↑ ↓ ↑</code>.</p>
    </section>

    <section class="learn-card">
      <h2>5. Capo &amp; changing key</h2>
      <p>A capo clamps all strings at one fret — like a moveable nut. Each fret raises the pitch by one <strong>semitone</strong>, so you can play easy shapes (C, G, D…) and still match the record.</p>
      <p>In the school's backing-track player you can pick any key: the track is pitch-shifted and the scale on the neck moves with it.</p>
    </section>

    <p><a class="btn primary" href="#/">Start the course: Scales for Beginners →</a></p>
  `;
  const onClick = e => {
    const b = e.target.closest("[data-string]");
    if (b) GuitarAudio.playString(Number(b.dataset.string));
  };
  app.addEventListener("click", onClick);
  cleanup = () => app.removeEventListener("click", onClick);
}

function renderNotFound() {
  app.innerHTML = `<h1>Page not found</h1><p><a href="#/">Back to the school</a></p>`;
}

/* ---------- Router ---------- */

let cleanup = () => {};
function route() {
  cleanup(); cleanup = () => {};
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] === "school") renderSchool();
  else if (parts[0] === "lesson" && parts[1]) renderLesson(parts[1]);
  else if (parts[0] === "chords") renderChords();
  else if (parts[0] === "tuner") renderTuner();
  else if (parts[0] === "learn") renderLearn();
  else renderNotFound();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
