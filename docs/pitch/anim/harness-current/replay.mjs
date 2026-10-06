// Replays a recorded browser run through the app's own Ed/y1/lS code (extracted from the bundle) using the REAL rAF timestamps of that run,
// and compares per-frame digests (tile count, sum x, sum y, sum angle, sum width) with what the page really drew.
import fs from 'node:fs';
import { makeApp } from './sim.mjs';
import { buildStore, dayRows } from './model.mjs';
const WORK = 'C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/';
const R = (v) => Math.round(v * 100) / 100;
export function storeFor(which, days = [1, 2, 3]) { const st = buildStore(which); days.forEach((d) => st.add(d, dayRows(d))); return st; }
export const SPEED = { '1/4x': 0.25, '1/2x': 0.5, '1x': 1, '2x': 2, '4x': 4, '8x': 8 };
export function digestOf(f) { let sx = 0, sy = 0, sa = 0, sw = 0; for (const t of f.tiles) { sx += t.x; sy += t.y; sa += t.ang || 0; sw += t.w; } return { n: f.tiles.length, sx: R(sx), sy: R(sy), sa: R(sa), sw: R(sw), nl: f.labels.length, leaders: f.leaders }; }
export function replay(which, run, { W = 1440, H = 852, center, zoom, collect = false, pbt } = {}) {
  const st = storeFor(which);
  const app = makeApp(which, { pbt: pbt || st.pbt, W, H, center: center || run.center, zoom: zoom || run.zoom, tick: run.start, speed: SPEED[run.speed] });
  app.drawStill(run.start); // the page drew the start tick while paused before play began (primes the carry-forward cache)
  app.ctx.frames.length = 0;
  app.state.isPlaying = true; app.state.currentTick = run.start;
  app.start();
  const rafs = run.frames.map((f) => f.raf);
  const sim = [];
  for (const t of rafs) {
    app.step(t);
    const fr = app.ctx.frames[app.ctx.frames.length - 1];
    sim.push({ raf: t, tick: app.state.currentTick, ...digestOf(fr), ...(collect ? { tiles: fr.tiles, labels: fr.labels, dots: fr.dots, y1: app.api.getLastY1(), args: app.api.getLastArgs(), Hc: app.api.getHc() } : {}) });
  }
  return { sim, app };
}
export function compare(run, sim) {
  let worst = { n: 0, sx: 0, sy: 0, sa: 0, sw: 0, nl: 0 }; let firstBad = null; let exact = 0;
  const bad = [];
  run.frames.forEach((f, i) => {
    const s = sim[i]; if (!s) return;
    const d = { n: Math.abs(f.n - s.n), sx: Math.abs(f.sx - s.sx), sy: Math.abs(f.sy - s.sy), sa: Math.abs(f.sa - s.sa), sw: Math.abs(f.sw - s.sw), nl: Math.abs(f.nl - s.nl) };
    for (const k in d) worst[k] = Math.max(worst[k], d[k]);
    if (d.n === 0 && d.sx < 0.05 && d.sy < 0.05 && d.sa < 0.05 && d.sw === 0 && d.nl === 0) exact++; else { bad.push(i); if (firstBad == null) firstBad = i; }
  });
  return { frames: run.frames.length, matching: exact, mismatching: bad.length, firstBad, worstAbsDiff: worst, badIdx: bad.slice(0, 10) };
}
if ((process.argv[1] || '').endsWith('replay.mjs')) {
  const which = process.argv[2] || 'r1c';
  const file = JSON.parse(fs.readFileSync(`${WORK}runs-${which}-trace-desktop.json`, 'utf8'));
  for (const run of file.runs) {
    const { sim } = replay(which, run);
    const c = compare(run, sim);
    console.log(run.label, JSON.stringify(c));
  }
}
