// v3d-cut.mjs - what a HARD CUT looks like frame by frame (the showcase and the tours cut with seek({glide:false}) + camera glide:false at every step; so do scene jumps without glide).  Manual mode, 60 Hz,
// witness on: per frame the number of chips actually PAINTED in view, and the share of the final picture's chip ink that is on screen (ink area of painted chips, weighted by their alpha).
//   node v3d-cut.mjs -> results/v3d-cut.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { SCENES } from './scenes.mjs';

const PORT = +(args.port || 9716); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'cut' });
const pairs = [['default', 'field'], ['field', 'the-angle'], ['the-angle', 'cemetery-hill'], ['cemetery-hill', 'rose-woods'], ['rose-woods', 'evening'], ['evening', 'opening'], ['opening', 'default'], ['default', 'rose-woods']];
const rows = [];
try {
  await s.page.evaluate(() => { const R = window.__rec; R.keep = true; R.install({ dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const [a, b] of pairs) {
    const r = await s.page.evaluate(({ A, B }) => {
      const S = window.__studio; const E = S.engine; const R = window.__rec; const W = window.__witness; const inkOf = (rec, dpr) => { let ink = 0; for (let i = 1; i < rec.epochs.length; i++) { const bx = rec.box[i]; const e = rec.epochs[i]; if (!bx || (Math.abs(e[4]) < 1e-6 && Math.abs(e[5]) < 1e-6)) continue; ink += (bx[2] - bx[0]) * (bx[3] - bx[1]) * bx[4] / (dpr * dpr); } return ink; };
      const go = (sc) => { E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); };
      go(A); for (let i = 0; i < 260; i++) S.step(1, 16.667); const before = { chips: R.last.chips, ink: inkOf(R.rec, S.renderer.dpr) };
      go(B); const series = []; for (let i = 0; i < 120; i++) { S.step(1, 16.667); series.push({ chips: R.last.chips, solid: R.last.solidChips, ink: inkOf(R.rec, S.renderer.dpr), tiles: R.last.tiles }); }
      const after = series[series.length - 1]; return { before, after, series };
    }, { A: SCENES[a], B: SCENES[b] });
    const fin = r.after.ink; const ratio = r.series.map((q) => q.ink / Math.max(1, fin)); const minRatio = Math.min(...ratio.slice(0, 40)); const frames50 = ratio.slice(0, 60).filter((x) => x < 0.5).length; const frames20 = ratio.slice(0, 60).filter((x) => x < 0.2).length; const settle90 = ratio.findIndex((x, i) => i > 3 && x >= 0.9);
    const chipMin = Math.min(...r.series.slice(0, 40).map((q) => q.chips)); rows.push({ from: a, to: b, chipsBefore: r.before.chips, chipsAfter: r.after.chips, minInkShareOfFinal: +minRatio.toFixed(3), framesBelow50pct: frames50, framesBelow20pct: frames20, framesTo90pct: settle90, firstFrames: ratio.slice(0, 14).map((x) => +x.toFixed(2)) });
    console.log(a + ' -> ' + b + ': chips ' + r.before.chips + ' -> ' + r.after.chips + '; chip ink on screen as a share of the final picture: min ' + minRatio.toFixed(2) + '; frames below 50%: ' + frames50 + ', below 20%: ' + frames20 + '; frames to reach 90%: ' + settle90 + '; first 14 frames ' + ratio.slice(0, 14).map((x) => x.toFixed(2)).join(' '));
  }
  writeJson('v3d-cut.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
