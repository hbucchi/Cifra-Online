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

function songChords(song) {
  const set = [];
  song.sections.forEach(sec => sec.lines.forEach(line =>
    line.split("|").forEach(bar => bar.trim().split(/\s+/).forEach(ch => {
      if (ch && !set.includes(ch)) set.push(ch);
    }))
  ));
  return set;
}

function levelDots(level) {
  return `<span class="level level-${level}" title="${LEVELS[level]}">${[1, 2, 3].map(i => `<i class="${i <= level ? "on" : ""}"></i>`).join("")}<span>${LEVELS[level]}</span></span>`;
}

function favorites() { return store.get("favorites", []); }
function toggleFavorite(id) {
  const f = favorites();
  const i = f.indexOf(id);
  if (i === -1) f.push(id); else f.splice(i, 1);
  store.set("favorites", f);
  return i === -1;
}

function setActiveNav(route) {
  document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("active", a.dataset.route === route));
}

/* ---------- Home ---------- */

function renderHome() {
  setActiveNav("home");
  document.title = "The Beatles — Cifra Online";
  const query = store.get("query", "");
  const levelFilter = store.get("levelFilter", 0);
  const favOnly = store.get("favOnly", false);

  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Artist</p>
        <h1>${ARTIST.name}</h1>
        <p class="lead">${ARTIST.blurb}</p>
        <p class="stats"><strong>${SONGS.length}</strong> songs · chord charts, diagrams &amp; strumming patterns</p>
      </div>
    </section>

    <section class="filters">
      <input type="search" id="search" placeholder="Search a song or chord (e.g. “Hey Jude” or “Am”)" value="${escapeHtml(query)}" aria-label="Search songs">
      <div class="chips" role="group" aria-label="Difficulty">
        ${[[0, "All"], [1, "Beginner"], [2, "Easy"], [3, "Intermediate"]].map(([v, l]) =>
          `<button class="chip ${levelFilter === v ? "on" : ""}" data-level="${v}">${l}</button>`).join("")}
        <button class="chip ${favOnly ? "on" : ""}" id="favOnly">★ Favourites</button>
      </div>
    </section>

    <section id="songList" class="song-list"></section>
  `;

  const draw = () => {
    const q = store.get("query", "").trim().toLowerCase();
    const lv = store.get("levelFilter", 0);
    const fo = store.get("favOnly", false);
    const favs = favorites();
    const list = SONGS
      .filter(s => !lv || s.level === lv)
      .filter(s => !fo || favs.includes(s.id))
      .filter(s => {
        if (!q) return true;
        const chords = songChords(s).map(c => c.toLowerCase());
        return s.title.toLowerCase().includes(q) || s.album.toLowerCase().includes(q) || chords.includes(q);
      })
      .sort((a, b) => a.level - b.level || a.title.localeCompare(b.title));

    $("#songList").innerHTML = list.length ? list.map((s, i) => `
      <a class="song-card" href="#/song/${s.id}">
        <span class="rank">${i + 1}</span>
        <span class="song-main">
          <span class="song-title">${escapeHtml(s.title)} ${favs.includes(s.id) ? '<span class="star">★</span>' : ""}</span>
          <span class="song-meta">${escapeHtml(s.album)} · ${s.year} · Key ${s.key}${s.capo ? ` · Capo ${s.capo}` : ""}</span>
          <span class="chord-pills">${songChords(s).map(c => `<span class="pill">${c}</span>`).join("")}</span>
        </span>
        ${levelDots(s.level)}
      </a>`).join("") : `<p class="empty">No songs match. Try another search.</p>`;
  };

  $("#search").addEventListener("input", e => { store.set("query", e.target.value); draw(); });
  document.querySelectorAll(".chip[data-level]").forEach(btn => btn.addEventListener("click", () => {
    store.set("levelFilter", Number(btn.dataset.level));
    document.querySelectorAll(".chip[data-level]").forEach(b => b.classList.toggle("on", b === btn));
    draw();
  }));
  $("#favOnly").addEventListener("click", e => {
    const v = !store.get("favOnly", false);
    store.set("favOnly", v);
    e.currentTarget.classList.toggle("on", v);
    draw();
  });
  draw();
}

/* ---------- Song page ---------- */

function renderSong(id) {
  const song = SONGS.find(s => s.id === id);
  if (!song) return renderNotFound();
  setActiveNav("home");
  document.title = `${song.title} — ${ARTIST.name} — Cifra Online`;

  const saved = store.get("song:" + id, {});
  const state = {
    transpose: saved.transpose ?? 0,
    capo: saved.capo ?? song.capo,
    scrolling: false,
    speed: store.get("scrollSpeed", 3)
  };
  const save = () => store.set("song:" + id, { transpose: state.transpose, capo: state.capo });

  app.innerHTML = `
    <nav class="crumbs"><a href="#/">${ARTIST.name}</a> › <span>${escapeHtml(song.title)}</span></nav>
    <header class="song-header">
      <div>
        <h1>${escapeHtml(song.title)}</h1>
        <p class="song-artist">${ARTIST.name} · <em>${escapeHtml(song.album)}</em> (${song.year})</p>
        <p class="song-facts">${levelDots(song.level)} <span>♩ = ${song.bpm}</span> <span>Record key: ${song.originalKey}</span></p>
      </div>
      <button class="icon-btn fav ${favorites().includes(id) ? "on" : ""}" id="favBtn" aria-label="Toggle favourite">★</button>
    </header>

    <div class="toolbar" id="toolbar">
      <div class="tool">
        <span class="tool-label">Key</span>
        <button class="btn" id="tDown" aria-label="Half step down">−½</button>
        <strong id="keyName" class="key-name"></strong>
        <button class="btn" id="tUp" aria-label="Half step up">+½</button>
      </div>
      <div class="tool">
        <span class="tool-label">Capo</span>
        <button class="btn" id="cDown" aria-label="Capo down">−</button>
        <strong id="capoVal" class="key-name"></strong>
        <button class="btn" id="cUp" aria-label="Capo up">+</button>
      </div>
      <button class="btn" id="easyBtn" title="Keep the same sound, but use the easiest chord shapes (with a capo)">Easy shapes</button>
      <button class="btn" id="resetBtn">Reset</button>
      <div class="tool">
        <span class="tool-label">Text</span>
        <button class="btn" id="fDown" aria-label="Smaller text">A−</button>
        <button class="btn" id="fUp" aria-label="Bigger text">A+</button>
      </div>
      <div class="tool">
        <button class="btn" id="scrollBtn">▶ Auto-scroll</button>
        <input type="range" id="speed" min="1" max="10" value="${state.speed}" aria-label="Scroll speed">
      </div>
      <label class="toggle"><input type="checkbox" id="diagToggle" ${prefs.showDiagrams ? "checked" : ""}> Diagrams</label>
      <label class="toggle"><input type="checkbox" id="leftyToggle" ${prefs.lefty ? "checked" : ""}> Left-handed</label>
      <button class="btn" onclick="window.print()">Print</button>
    </div>

    <p class="sounding" id="sounding"></p>
    ${song.tuning ? `<p class="callout">🎸 ${escapeHtml(song.tuning)}</p>` : ""}

    <div class="song-layout">
      <article class="sheet" id="sheet"></article>
      <aside class="sidebar">
        <section class="panel" id="diagramPanel">
          <h2>Chords <small>(tap to hear)</small></h2>
          <div class="diagrams" id="diagrams"></div>
        </section>
        <section class="panel">
          <h2>Strumming</h2>
          <div class="strum" id="strum"></div>
          <button class="btn small" id="playStrum">▶ Hear it</button>
          <p class="hint">Count “1 &amp; 2 &amp; 3 &amp; 4 &amp;”. Keep your hand moving down-up all the time — only touch the strings on the arrows.</p>
        </section>
        <section class="panel">
          <h2>Tips</h2>
          <ul class="tips">${song.tips.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        </section>
        <p class="hint copyright">Lyrics aren't shown for copyright reasons — play along with the recording.</p>
      </aside>
    </div>
  `;

  const shapesKey = () => transposeKey(song.key, state.transpose);
  const soundingKey = () => transposeKey(song.key, state.transpose + state.capo);
  const flats = () => keyUsesFlats(shapesKey());
  const chordName = c => transposeChord(c, state.transpose, flats());

  function drawSheet() {
    $("#keyName").textContent = shapesKey();
    $("#capoVal").textContent = state.capo === 0 ? "None" : state.capo;
    $("#sounding").innerHTML = state.capo
      ? `Play <strong>${shapesKey()}</strong> shapes with the capo on fret <strong>${state.capo}</strong> → sounds in <strong>${soundingKey()}</strong>.`
      : `Sounds in <strong>${soundingKey()}</strong> (no capo).`;

    const sheet = $("#sheet");
    sheet.style.fontSize = prefs.fontSize + "px";
    sheet.innerHTML = song.sections.map(sec => `
      <section class="section">
        <h3>${escapeHtml(sec.name)} ${sec.repeat ? `<span class="repeat">×${sec.repeat}</span>` : ""}</h3>
        ${sec.lines.map(line => `
          <div class="bars">${line.split("|").map(bar => `
            <span class="bar">${bar.trim().split(/\s+/).map(c => {
              const n = chordName(c);
              return `<button class="chord" data-chord="${n}">${n}</button>`;
            }).join("")}</span>`).join("")}
          </div>`).join("")}
        ${sec.note ? `<p class="note">${escapeHtml(sec.note)}</p>` : ""}
      </section>`).join("");

    const chords = songChords(song).map(chordName);
    $("#diagramPanel").style.display = prefs.showDiagrams ? "" : "none";
    $("#diagrams").innerHTML = chords.map(c => {
      const f = getFingering(c);
      return `<button class="diagram-card" data-chord="${c}" title="${f && f.note ? escapeHtml(f.note) : c}">
        <span class="diagram-name">${c}${f && f.simplified ? "*" : ""}</span>
        ${chordDiagramSVG(c, { lefty: prefs.lefty })}
      </button>`;
    }).join("");

    $("#strum").innerHTML = ["1", "&", "2", "&", "3", "&", "4", "&"].map((count, i) => {
      const s = song.strum[i];
      const arrow = s === "D" ? "↓" : s === "U" ? "↑" : "·";
      return `<span class="beat ${s === "-" ? "rest" : ""}"><b>${arrow}</b><small>${count}</small></span>`;
    }).join("");
  }

  function playChord(name, direction = "D") {
    const f = getFingering(name);
    if (f) GuitarAudio.strum(f.frets, { capo: state.capo, direction });
    document.querySelectorAll(`[data-chord="${CSS.escape(name)}"]`).forEach(el => {
      el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
    });
  }

  app.addEventListener("click", onSongClick);
  function onSongClick(e) {
    const btn = e.target.closest("[data-chord]");
    if (btn && app.contains(btn)) playChord(btn.dataset.chord);
  }
  cleanup = () => { app.removeEventListener("click", onSongClick); stopAutoScroll(); };

  const update = () => { save(); drawSheet(); };
  $("#tUp").onclick = () => { state.transpose = (state.transpose + 1) % 12; update(); };
  $("#tDown").onclick = () => { state.transpose = (state.transpose + 11) % 12; update(); };
  $("#cUp").onclick = () => { if (state.capo < 11) { state.capo++; update(); } };
  $("#cDown").onclick = () => { if (state.capo > 0) { state.capo--; update(); } };
  $("#resetBtn").onclick = () => { state.transpose = 0; state.capo = song.capo; update(); };

  // Keep the sounding pitch the same, but find the lowest capo giving easy open shapes.
  $("#easyBtn").onclick = () => {
    const total = state.transpose + state.capo;
    for (let c = 0; c <= 9; c++) {
      const t = ((total - c) % 12 + 12) % 12;
      if (EASY_KEYS.includes(transposeKey(song.key, t))) {
        state.transpose = t; state.capo = c; update(); return;
      }
    }
  };

  $("#fUp").onclick = () => { prefs.fontSize = Math.min(30, prefs.fontSize + 2); store.set("fontSize", prefs.fontSize); drawSheet(); };
  $("#fDown").onclick = () => { prefs.fontSize = Math.max(12, prefs.fontSize - 2); store.set("fontSize", prefs.fontSize); drawSheet(); };
  $("#diagToggle").onchange = e => { prefs.showDiagrams = e.target.checked; store.set("showDiagrams", prefs.showDiagrams); drawSheet(); };
  $("#leftyToggle").onchange = e => { prefs.lefty = e.target.checked; store.set("lefty", prefs.lefty); drawSheet(); };
  $("#favBtn").onclick = e => e.currentTarget.classList.toggle("on", toggleFavorite(id));
  $("#speed").oninput = e => { state.speed = Number(e.target.value); store.set("scrollSpeed", state.speed); };

  $("#scrollBtn").onclick = () => {
    state.scrolling = !state.scrolling;
    $("#scrollBtn").textContent = state.scrolling ? "❚❚ Stop" : "▶ Auto-scroll";
    if (!state.scrolling) return stopAutoScroll();
    let acc = 0, last = performance.now();
    const step = now => {
      const dt = (now - last) / 1000; last = now;
      acc += dt * state.speed * 8; // pixels per second
      const px = Math.floor(acc);
      if (px > 0) { window.scrollBy(0, px); acc -= px; }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
        state.scrolling = false; $("#scrollBtn").textContent = "▶ Auto-scroll"; return stopAutoScroll();
      }
      scrollTimer = requestAnimationFrame(step);
    };
    scrollTimer = requestAnimationFrame(step);
  };

  $("#playStrum").onclick = () => {
    const first = getFingering(chordName(songChords(song)[0]));
    if (!first) return;
    const beats = [...$("#strum").children];
    const eighth = 60 / song.bpm / 2;
    const total = GuitarAudio.playPattern(first.frets, song.strum, song.bpm, state.capo);
    beats.forEach((b, i) => setTimeout(() => {
      beats.forEach(x => x.classList.remove("now")); b.classList.add("now");
    }, i * eighth * 1000));
    setTimeout(() => beats.forEach(x => x.classList.remove("now")), total * 1000);
  };

  drawSheet();
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
    <p class="lead">Five things to know before your first song.</p>

    <section class="learn-card">
      <h2>1. Tune your guitar</h2>
      <p>Standard tuning, from the thickest string to the thinnest: <strong>E A D G B E</strong>. Tap a string to hear its reference note and tune until they match.</p>
      <div class="tuner">${OPEN_STRINGS.map((s, i) => `
        <button class="string-btn" data-string="${i}"><b>${s.name}<sub>${s.octave}</sub></b><small>${s.freq.toFixed(1)} Hz</small></button>`).join("")}
      </div>
      <p class="hint">Each string is 5 frets (semitones) above the previous one — except G→B, which is 4. That's why the 5th-fret tuning trick works.</p>
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
      <p>On every song page, <strong>Key ±½</strong> changes the chord shapes, <strong>Capo ±</strong> moves the capo, and <strong>Easy shapes</strong> keeps the same sound but picks the simplest shapes for you.</p>
    </section>

    <p><a class="btn primary" href="#/song/love-me-do">Try your first song: Love Me Do →</a></p>
  `;
  const onClick = e => {
    const b = e.target.closest("[data-string]");
    if (b) GuitarAudio.playString(Number(b.dataset.string));
  };
  app.addEventListener("click", onClick);
  cleanup = () => app.removeEventListener("click", onClick);
}

function renderNotFound() {
  app.innerHTML = `<h1>Page not found</h1><p><a href="#/">Back to songs</a></p>`;
}

/* ---------- Router ---------- */

let cleanup = () => {};
function route() {
  cleanup(); cleanup = () => {};
  const hash = location.hash.replace(/^#/, "") || "/";
  const parts = hash.split("/").filter(Boolean);
  if (parts.length === 0) renderHome();
  else if (parts[0] === "song" && parts[1]) renderSong(parts[1]);
  else if (parts[0] === "chords") renderChords();
  else if (parts[0] === "learn") renderLearn();
  else renderNotFound();
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
