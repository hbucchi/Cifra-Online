/*
 * Jam room: pick a rhythm, a key and a tempo; the backing track loops while the
 * page shows the chord being played, the next chord, and the scale on the neck
 * with the current chord's notes highlighted as "target notes".
 *
 * Tempo changes use WSOLA time-stretching (below), so the key stays the same.
 */

const JAM_SCALES = {
  "min-pent": { name: "Minor pentatonic", iv: [0, 3, 5, 7, 10] },
  "blues": { name: "Blues scale", iv: [0, 3, 5, 6, 7, 10] },
  "minor": { name: "Natural minor", iv: [0, 2, 3, 5, 7, 8, 10] },
  "dorian": { name: "Dorian", iv: [0, 2, 3, 5, 7, 9, 10] },
  "maj-pent": { name: "Major pentatonic", iv: [0, 2, 4, 7, 9] },
  "major": { name: "Major scale", iv: [0, 2, 4, 5, 7, 9, 11] },
  "mixolydian": { name: "Mixolydian", iv: [0, 2, 4, 5, 7, 9, 10] }
};

/*
 * WSOLA (Waveform-Similarity Overlap-Add) time-stretching.
 *
 * Cut the sound into overlapping windowed frames (~46 ms) and lay them down
 * at a FIXED output spacing (Hs), but read them from the input at a spacing of
 * Hs × rate. Reading further apart than we write = shorter = faster, and
 * the pitch is untouched because each frame is played at its normal speed.
 * The trick that avoids a "phasey" sound: before taking each frame, search a
 * small neighbourhood (±tol samples) for the position whose waveform best
 * matches what naturally followed the previous frame (cross-correlation), so
 * the overlapping waves line up instead of cancelling each other out.
 * The loop is treated as circular, so the stretched loop is seamless too.
 */
function wsolaStretch(ctx, buffer, rate) {
  const N = 2048, Hs = 1024, tol = 512, dec = 4;
  const chs = buffer.numberOfChannels, inLen = buffer.length;
  const outLen = Math.round(inLen / rate);
  const input = [...Array(chs)].map((_, c) => buffer.getChannelData(c));
  const mono = new Float32Array(inLen);
  for (let c = 0; c < chs; c++) for (let i = 0; i < inLen; i++) mono[i] += input[c][i] / chs;
  const at = i => mono[((i % inLen) + inLen) % inLen];
  const win = new Float32Array(N);
  for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);

  const out = [...Array(chs)].map(() => new Float32Array(outLen));
  const norm = new Float32Array(outLen);
  const frames = Math.ceil(outLen / Hs);
  let prev = 0;
  for (let k = 0; k < frames; k++) {
    let pos = Math.round(k * Hs * rate);
    if (k > 0) {
      const target = prev + Hs; // where the previous frame "wanted" to continue
      let best = -Infinity, bestPos = pos;
      for (let d = -tol; d <= tol; d += 8) {
        let s = 0;
        for (let i = 0; i < N / 2; i += dec) s += at(target + i) * at(pos + d + i);
        if (s > best) { best = s; bestPos = pos + d; }
      }
      pos = bestPos;
    }
    const o = k * Hs;
    for (let i = 0; i < N; i++) {
      const w = win[i], j = (o + i) % outLen, src = ((pos + i) % inLen + inLen) % inLen;
      for (let c = 0; c < chs; c++) out[c][j] += input[c][src] * w;
      norm[j] += w;
    }
    prev = pos;
  }
  const res = ctx.createBuffer(chs, outLen, buffer.sampleRate);
  for (let c = 0; c < chs; c++) {
    const d = out[c];
    for (let i = 0; i < outLen; i++) d[i] /= norm[i] || 1;
    res.copyToChannel(d, c);
  }
  return res;
}

/* Gapless looping player that knows where it is in the music. */
const JamPlayer = (() => {
  let ctx = null, src = null, gain = null, vol = 0.8;
  let startAt = 0, rate = 1, loopLen = 0, playing = false;
  const decoded = new Map(), stretched = new Map();
  const audio = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

  async function getBuffer(trackId, keyPc, r) {
    const url = `audio/tracks/${trackId}/${KEY_FILES[keyPc]}.mp3`;
    if (!decoded.has(url)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      decoded.set(url, await audio().decodeAudioData(await res.arrayBuffer()));
    }
    const base = decoded.get(url);
    // Trim to exactly the loop (whole bars) before stretching.
    const t = TRACKS[trackId];
    const n = Math.min(base.length, Math.round(t.loopSeconds * base.sampleRate));
    const key = url + "@" + r.toFixed(3);
    if (Math.abs(r - 1) < 0.001) {
      if (!stretched.has(key)) {
        const b = audio().createBuffer(base.numberOfChannels, n, base.sampleRate);
        for (let c = 0; c < base.numberOfChannels; c++) b.copyToChannel(base.getChannelData(c).subarray(0, n), c);
        stretched.set(key, b);
      }
      return stretched.get(key);
    }
    if (!stretched.has(key)) {
      const b = audio().createBuffer(base.numberOfChannels, n, base.sampleRate);
      for (let c = 0; c < base.numberOfChannels; c++) b.copyToChannel(base.getChannelData(c).subarray(0, n), c);
      await new Promise(r2 => setTimeout(r2, 0)); // let the UI show "preparing…"
      stretched.set(key, wsolaStretch(audio(), b, r));
    }
    return stretched.get(key);
  }

  return {
    /** Musical position in ORIGINAL-tempo seconds since the loop start (0 … loopSeconds). */
    position() {
      if (!playing) return null;
      const el = (audio().currentTime - startAt - (ctx.outputLatency || ctx.baseLatency || 0)) % loopLen;
      return ((el + loopLen) % loopLen) * rate;
    },
    async play(trackId, keyPc, r, fromMusicalSec = 0) {
      await audio().resume();
      const buf = await getBuffer(trackId, keyPc, r);
      this.stop();
      gain = gain || ctx.createGain();
      gain.gain.value = vol;
      gain.connect(ctx.destination);
      src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain);
      rate = r;
      loopLen = buf.duration;
      const offset = (fromMusicalSec / r) % loopLen;
      startAt = ctx.currentTime + 0.03 - offset;
      src.start(ctx.currentTime + 0.03, offset);
      playing = true;
    },
    stop() {
      if (src) { try { src.stop(); } catch { /* ok */ } src.disconnect(); src = null; }
      playing = false;
    },
    setVolume(v) { vol = v; if (gain) gain.gain.value = v; },
    get playing() { return playing; }
  };
})();

function renderJam() {
  setActiveNav("jam");
  document.title = "Jam room — Cifra Online School";
  const saved = store.get("jam", {});
  const ids = Object.keys(TRACKS);
  const st = {
    track: ids.includes(saved.track) ? saved.track : ids[0],
    key: saved.key ?? 9,
    tempo: saved.tempo ?? 1,
    scale: saved.scale || null,
    view: saved.view || "neck",
    labels: saved.labels || "names"
  };
  const save = () => store.set("jam", st);
  let raf = null, lastBar = -1, lastBeat = -1;

  app.innerHTML = `
    <h1>Jam room</h1>
    <p class="lead">Choose a rhythm, a key and a tempo, press play and improvise. The page follows the band: it shows the chord being played, what comes next, and lights up the chord's notes inside your scale.</p>

    <section class="panel jam-controls">
      <div class="jam-row"><span class="tool-label">Rhythm</span><div class="chips" id="jamTracks"></div></div>
      <div class="jam-row"><span class="tool-label">Key</span><div class="chips" id="jamKeys"></div></div>
      <div class="jam-row"><span class="tool-label">Tempo</span>
        <input type="range" id="jamTempo" min="0.7" max="1.3" step="0.01">
        <strong id="jamBpm"></strong> <button class="chip" id="jamTempoReset">Original</button>
      </div>
      <div class="jam-row"><span class="tool-label">Scale</span><div class="chips" id="jamScales"></div></div>
    </section>

    <section class="jam-stage">
      <button class="play-btn big" id="jamPlay" aria-label="Play">▶</button>
      <div class="jam-now">
        <span class="tool-label">Now playing</span>
        <div class="jam-chord" id="jamNow">—</div>
        <div class="beats big" id="jamBeats"><i></i><i></i><i></i><i></i></div>
        <span class="song-meta" id="jamBar"></span>
      </div>
      <div class="jam-next"><span class="tool-label">Next</span><div class="jam-chord small" id="jamNext">—</div></div>
      <div class="jam-diagram" id="jamDiagram"></div>
      <label class="tool vol"><span class="tool-label">Vol</span><input type="range" id="jamVol" min="0" max="1" step="0.05" value="0.8"></label>
    </section>
    <div class="jam-strip" id="jamStrip"></div>
    <p class="hint" id="jamStatus"></p>

    <section class="panel">
      <div class="neck-tools">
        <div class="chips">${[["neck", "Across the neck"], ["box", "One position"]].map(([v, t]) => `<button class="chip" data-view="${v}">${t}</button>`).join("")}</div>
        <div class="chips">${[["names", "Note names"], ["intervals", "Intervals"], ["fingers", "Fingers ✋"]].map(([v, t]) => `<button class="chip" data-lab="${v}">${t}</button>`).join("")}</div>
      </div>
      <div id="jamNeck"></div>
      <div class="fb-legend" id="jamLegend"></div>
    </section>
  `;

  const T = () => TRACKS[st.track];
  const shift = () => pc(st.key - T().root);
  const keyFlats = () => keyUsesFlats(transposeKey(ROOT_NAMES[T().root] + (T().mode === "minor" ? "m" : ""), shift()));
  const chordAt = bar => {
    const t = T(), p = t.prog;
    const name = p[((bar % p.length) + p.length) % p.length];
    return transposeChord(name, shift(), keyFlats());
  };
  const prettyChord = c => c.replace("#", "♯").replace(/([A-G])b/, "$1♭");
  const scaleFor = () => (T().scales.includes(st.scale) ? st.scale : T().scales[0]);

  function drawControls() {
    $("#jamTracks").innerHTML = ids.map(id => {
      const t = TRACKS[id];
      return `<button class="chip ${id === st.track ? "on" : ""}" data-track="${id}" title="${t.style}">${t.title} <small>${Math.round(t.bpm)}</small></button>`;
    }).join("");
    const minor = T().mode === "minor";
    $("#jamKeys").innerHTML = ROOT_NAMES.map((n, i) => `<button class="chip ${i === st.key ? "on" : ""}" data-key="${i}">${pretty(n)}${minor ? "m" : ""}</button>`).join("") +
      `<button class="chip" id="jamRandom" title="Random key">🎲</button>`;
    $("#jamTempo").value = st.tempo;
    $("#jamBpm").textContent = `${Math.round(T().bpm * st.tempo)} BPM`;
    const sc = scaleFor();
    $("#jamScales").innerHTML = T().scales.map((id, i) => `<button class="chip ${id === sc ? "on" : ""}" data-scale="${id}">${JAM_SCALES[id].name}${i === 0 ? " ★" : ""}</button>`).join("");
    document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("on", b.dataset.view === st.view));
    document.querySelectorAll("[data-lab]").forEach(b => b.classList.toggle("on", b.dataset.lab === st.labels));
    // whole progression strip
    const p = T().prog;
    $("#jamStrip").innerHTML = p.map((_, i) => `<span class="jam-bar" data-bar="${i}">${prettyChord(chordAt(i))}</span>`).join("");
    $("#jamStatus").innerHTML = `${T().title} · ${T().style}. Key of <strong>${pretty(ROOT_NAMES[st.key])}${minor ? " minor" : " major"}</strong> — ★ marks the scale that fits best.`;
  }

  function drawNeck(currentChord) {
    const sc = JAM_SCALES[scaleFor()];
    const root = st.key;
    const cells = schoolShape(root, sc.iv, st.view);
    const fingers = schoolFingers(cells);
    const spell = spellSet(root, sc.iv, false);
    const chordPcs = currentChord ? chordTones(currentChord) : [];
    const dots = new Map();
    cells.forEach(c => {
      const i = pc(c.m - root);
      const label = st.labels === "fingers" ? String(c.f === 0 ? 0 : fingers.get(c.s + ":" + c.f))
        : st.labels === "intervals" ? SCALE_INTERVALS[i] : spell.get(pc(c.m));
      const target = chordPcs.includes(pc(c.m));
      dots.set(c.s + ":" + c.f, { label, cls: "role-" + intervalRole(i) + (target ? " target" : chordPcs.length ? " dim" : "") + (st.labels === "fingers" ? " finger" : "") });
    });
    $("#jamNeck").innerHTML = miniNeckHTML(dots);
    $("#jamLegend").innerHTML = `<span class="legend-title"><strong>${spell.get(root)} ${sc.name}</strong>: ${sc.iv.map(i => spell.get(pc(root + i))).join(" · ")}</span>
      <span><i class="fb-dot role-root target"></i> notes of the chord playing now — great places to land</span>`;
  }

  function chordTones(name) {
    const p = parseChord(name);
    if (!p) return [];
    const ivs = { "": [0, 4, 7], m: [0, 3, 7], "7": [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11] }[p.suffix] || [0, 4, 7];
    return ivs.map(i => pc(noteIndex(p.root) + i));
  }

  function showChord(bar) {
    const now = chordAt(bar), next = chordAt(bar + 1);
    $("#jamNow").textContent = prettyChord(now);
    $("#jamNext").textContent = prettyChord(next);
    $("#jamDiagram").innerHTML = chordDiagramSVG(now, { lefty: prefs.lefty });
    const p = T().prog.length;
    $("#jamBar").textContent = `Bar ${(bar % p) + 1} of ${p}`;
    document.querySelectorAll(".jam-bar").forEach(el => el.classList.toggle("on", +el.dataset.bar === bar % p));
    drawNeck(now);
  }

  function tick() {
    const pos = JamPlayer.position();
    if (pos !== null) {
      const beatLen = 60 / T().bpm;
      const beat = Math.floor(pos / beatLen);
      const bar = Math.floor(beat / 4) % T().loopBars;
      if (bar !== lastBar) { lastBar = bar; showChord(bar); }
      if (beat !== lastBeat) {
        lastBeat = beat;
        document.querySelectorAll("#jamBeats i").forEach((x, i) => x.className = i === beat % 4 ? "on" : "");
      }
    }
    raf = requestAnimationFrame(tick);
  }

  async function start(fromPos = 0) {
    $("#jamPlay").textContent = "…";
    const needsStretch = Math.abs(st.tempo - 1) > 0.001;
    if (needsStretch) $("#jamStatus").textContent = "Preparing the new tempo…";
    try {
      await JamPlayer.play(st.track, st.key, st.tempo, fromPos);
    } catch (e) {
      $("#jamStatus").textContent = "Could not load the backing track (open the site through a web server, not as a local file).";
    }
    $("#jamPlay").textContent = JamPlayer.playing ? "❚❚" : "▶";
    drawControls();
    lastBar = -1; lastBeat = -1;
  }
  // Change something while playing: restart at the same musical position.
  async function restart(keepPos = true) {
    if (!JamPlayer.playing) { drawControls(); showChord(0); return; }
    const t = TRACKS[st.track];
    const pos = keepPos ? (JamPlayer.position() || 0) % t.loopSeconds : 0;
    await start(pos);
  }

  /* events */
  $("#jamPlay").onclick = () => {
    if (JamPlayer.playing) { JamPlayer.stop(); $("#jamPlay").textContent = "▶"; document.querySelectorAll("#jamBeats i").forEach(x => x.className = ""); return; }
    start(0);
  };
  app.addEventListener("click", onClick);
  function onClick(e) {
    const b = e.target.closest("[data-track],[data-key],[data-scale],[data-view],[data-lab],#jamRandom,#jamTempoReset");
    if (!b) return;
    if (b.dataset.track) { st.track = b.dataset.track; save(); restart(false); return; }
    if (b.dataset.key) { st.key = +b.dataset.key; save(); restart(); return; }
    if (b.id === "jamRandom") { st.key = Math.floor(Math.random() * 12); save(); restart(); return; }
    if (b.id === "jamTempoReset") { st.tempo = 1; save(); restart(); return; }
    if (b.dataset.scale) { st.scale = b.dataset.scale; save(); drawControls(); drawNeck(JamPlayer.playing ? chordAt(lastBar) : chordAt(0)); return; }
    if (b.dataset.view) { st.view = b.dataset.view; save(); drawControls(); drawNeck(JamPlayer.playing ? chordAt(lastBar) : chordAt(0)); return; }
    if (b.dataset.lab) { st.labels = b.dataset.lab; save(); drawControls(); drawNeck(JamPlayer.playing ? chordAt(lastBar) : chordAt(0)); }
  }
  $("#jamTempo").oninput = e => { st.tempo = +e.target.value; $("#jamBpm").textContent = `${Math.round(T().bpm * st.tempo)} BPM`; };
  $("#jamTempo").onchange = () => { save(); restart(); };
  $("#jamVol").oninput = e => JamPlayer.setVolume(+e.target.value);
  $("#jamNeck").addEventListener("click", e => {
    const c = e.target.closest(".fb-cell[data-s]");
    if (c) GuitarAudio.playMidi(STANDARD_TUNING[+c.dataset.s] + +c.dataset.f);
  });

  cleanup = () => { JamPlayer.stop(); cancelAnimationFrame(raf); app.removeEventListener("click", onClick); };
  drawControls(); showChord(0);
  raf = requestAnimationFrame(tick);
}
