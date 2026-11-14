// Scale audit (run with a local server on :8000):  node tools/audit_scales.js
// Scale audit: checks every scale × every root, for shapes, across-the-neck and spelling.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8000/#/tuner'); await p.waitForSelector('.fb-row');
const r = await p.evaluate(() => {
  const REF = { // textbook definitions, independent of the code
    "min-pent": [0,3,5,7,10], "maj-pent": [0,2,4,7,9], "blues": [0,3,5,6,7,10], "major": [0,2,4,5,7,9,11],
    "minor": [0,2,3,5,7,8,10], "harm-minor": [0,2,3,5,7,8,11], "dorian": [0,2,3,5,7,9,10], "mixolydian": [0,2,4,5,7,9,10] };
  const problems = []; const stats = {};
  // 1. definitions in every place the site defines scales
  for (const [id, iv] of Object.entries(REF)) {
    for (const [src, lib] of [["SCALE_LIBRARY", SCALE_LIBRARY], ["SCALE_TYPES", Object.fromEntries(SCALE_TYPES.map(t => [t.id, t]))], ["SCHOOL_SCALES", SCHOOL_SCALES], ["JAM_SCALES", JAM_SCALES]]) {
      if (lib[id] && JSON.stringify([...lib[id].iv].sort((a,b)=>a-b)) !== JSON.stringify(iv)) problems.push(`${src}.${id} intervals ${lib[id].iv} ≠ ${iv}`);
    }
  }
  for (const [id, iv] of Object.entries(REF)) {
    stats[id] = { shapes: 0, maxSpan: 0, maxPerString: 0, neckMaxSpan: 0 };
    for (let root = 0; root < 12; root++) {
      const pcs = iv.map(i => (root + i) % 12);
      const shapes = scaleShapes(root, iv);
      stats[id].shapes = shapes.length;
      shapes.forEach(sh => {
        const ms = sh.cells.map(c => c.m);
        const tag = `${id} root ${root} shape ${sh.n}`;
        if (sh.cells.some(c => !pcs.includes(c.m % 12))) problems.push(tag + ': note outside the scale');
        if (new Set(ms.map(m => m % 12)).size !== pcs.length) problems.push(tag + ': missing scale notes');
        if (new Set(ms).size !== ms.length) problems.push(tag + ': duplicate pitch');
        // contiguous: every scale pitch between lowest and highest present
        const run = []; for (let m = Math.min(...ms); m <= Math.max(...ms); m++) if (pcs.includes(m % 12)) run.push(m);
        if (run.length !== ms.length) problems.push(tag + `: gap in the run (${run.length - ms.length} missing)`);
        const fr = sh.cells.filter(c => c.f > 0).map(c => c.f);
        const span = Math.max(...fr) - Math.min(...fr) + 1;
        stats[id].maxSpan = Math.max(stats[id].maxSpan, span);
        for (let s = 0; s < 6; s++) {
          const row = sh.cells.filter(c => c.s === s);
          stats[id].maxPerString = Math.max(stats[id].maxPerString, row.length);
          const fg = row.filter(c => c.f > 0).sort((a, c) => a.f - c.f).map(c => c.finger);
          for (let i = 1; i < fg.length; i++) if (fg[i] <= fg[i-1]) problems.push(tag + `: fingers not increasing on string ${s}`);
        }
        if (span > 6) problems.push(tag + `: span ${span} frets`);
      });
      // root shape contains the root on the 6th string
      if (!shapes[0].cells.some(c => c.s === 0 && c.m % 12 === root)) problems.push(`${id} root ${root}: shape 1 doesn't start on the root`);
      // across the neck
      const neck = acrossNeck(root, iv); const nm = neck.map(c => c.m);
      if (new Set(nm).size !== nm.length) problems.push(`${id} ${root}: across-neck duplicates`);
      const full = []; for (let m = 40; m <= 79; m++) if (pcs.includes(m % 12)) full.push(m);
      const missing = full.filter(m => !nm.includes(m)).length;
      if (missing > 1) problems.push(`${id} ${root}: across-neck misses ${missing} pitches`);
      for (let s = 0; s < 6; s++) { const fr = neck.filter(c => c.s === s && c.f > 0).map(c => c.f); if (fr.length) stats[id].neckMaxSpan = Math.max(stats[id].neckMaxSpan, Math.max(...fr) - Math.min(...fr) + 1); }
      // spelling: 7-note scales should use 7 different letters
      if (iv.length === 7) { const sp = spellSet(root, iv, false); const letters = new Set([...sp.values()].map(n => n[0])); if (letters.size !== 7) problems.push(`${id} ${ROOT_NAMES[root]}: spelling ${[...sp.values()].join(' ')}`); }
    }
  }
  // famous reference shapes
  const show = (root, id, n) => scaleShapes(root, SCALE_LIBRARY[id].iv)[n - 1].cells.map(c => `${c.s}:${c.f}`).join(' ');
  return { problems, stats,
    Am_pent_box1: show(9, 'min-pent', 1), Am_pent_box2: show(9, 'min-pent', 2),
    A_blues_box1: show(9, 'blues', 1), G_major_shape1: show(7, 'major', 1), C_major_shape1: show(0, 'major', 1) };
});
console.log('STATS', JSON.stringify(r.stats, null, 0));
for (const k of ['Am_pent_box1','Am_pent_box2','A_blues_box1','G_major_shape1','C_major_shape1']) console.log(k.padEnd(16), r[k]);
console.log(`PROBLEMS (${r.problems.length}):`); const g = {}; r.problems.forEach(x => { const k = x.replace(/root \d+ /, '').replace(/ \d+:/, ':').replace(/[A-G][#b♯♭]?: /,''); g[k] = (g[k]||0)+1; }); Object.entries(g).forEach(([k,v]) => console.log('  -', v, '×', k)); r.problems.slice(0,8).forEach(x=>console.log('    e.g.', x));
console.log('errors', errs); await b.close(); })();
