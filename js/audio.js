/*
 * Tiny guitar synthesiser using the Karplus–Strong algorithm.
 *
 * A plucked string is modelled as a short delay line filled with noise.
 * Each pass, neighbouring samples are averaged (a low-pass filter) and
 * slightly damped, so high frequencies die first — just like a real string.
 * The length of the delay line sets the pitch: N = sampleRate / frequency.
 *
 * Pitch of a fretted note: f = f_open × 2^(fret / 12)
 * (each fret raises the pitch by one semitone, and 12 semitones = double frequency).
 */
const GuitarAudio = (() => {
  let ctx = null;
  const cache = new Map();

  function context() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function pluckBuffer(freq) {
    const key = freq.toFixed(2);
    if (cache.has(key)) return cache.get(key);
    const c = context();
    const sr = c.sampleRate;
    const dur = 2.5;
    const buffer = c.createBuffer(1, Math.floor(sr * dur), sr);
    const data = buffer.getChannelData(0);
    const N = Math.max(2, Math.round(sr / freq));
    const ring = new Float32Array(N);
    for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
    const decay = 0.996;
    for (let i = 0; i < data.length; i++) {
      const a = i % N, b = (i + 1) % N;
      data[i] = ring[a];
      ring[a] = decay * 0.5 * (ring[a] + ring[b]);
    }
    cache.set(key, buffer);
    return buffer;
  }

  function playFreq(freq, when = 0, gainValue = 0.35) {
    const c = context();
    const src = c.createBufferSource();
    src.buffer = pluckBuffer(freq);
    const g = c.createGain();
    g.gain.value = gainValue;
    src.connect(g).connect(c.destination);
    src.start(c.currentTime + when);
  }

  function fretFreq(stringIdx, fret, capo = 0) {
    return OPEN_STRINGS[stringIdx].freq * Math.pow(2, (fret + capo) / 12);
  }

  // Strum a chord: down = low→high, up = high→low.
  function strum(frets, { capo = 0, direction = "D", when = 0, spread = 0.03, gain = 0.3 } = {}) {
    const order = [0, 1, 2, 3, 4, 5];
    if (direction === "U") order.reverse();
    let k = 0;
    for (const s of order) {
      if (frets[s] < 0) continue;
      playFreq(fretFreq(s, frets[s], capo), when + k * spread, gain);
      k++;
    }
  }

  function playString(stringIdx) {
    playFreq(OPEN_STRINGS[stringIdx].freq, 0, 0.5);
  }

  // Play a strum pattern (8 eighth-note slots) once over a chord.
  function playPattern(frets, pattern, bpm, capo = 0) {
    const eighth = 60 / bpm / 2;
    [...pattern].forEach((slot, i) => {
      if (slot === "D" || slot === "U") {
        strum(frets, { capo, direction: slot, when: i * eighth, gain: slot === "U" ? 0.18 : 0.3, spread: 0.018 });
      }
    });
    return pattern.length * eighth;
  }

  // MIDI note number → frequency. A4 = MIDI 69 = 440 Hz; each semitone ×2^(1/12).
  const midiFreq = m => 440 * Math.pow(2, (m - 69) / 12);

  function playMidi(m, when = 0, gain = 0.4) {
    playFreq(midiFreq(m), when, gain);
  }

  // Strum a list of MIDI notes (low → high); null entries are skipped.
  function strumMidis(midis, { direction = "D", spread = 0.035, gain = 0.3 } = {}) {
    const list = midis.filter(m => m !== null && m !== undefined);
    if (direction === "U") list.reverse();
    list.forEach((m, k) => playFreq(midiFreq(m), k * spread, gain));
  }

  function playSequence(midis, gap = 0.28) {
    midis.forEach((m, k) => playFreq(midiFreq(m), k * gap, 0.4));
  }

  return { strum, playString, playPattern, playMidi, strumMidis, playSequence, midiFreq };
})();
