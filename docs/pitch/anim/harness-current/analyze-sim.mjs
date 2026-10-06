// Exact jitter analysis: replays a recorded run (real rAF timestamps) through the app's own code, with unit identity known.
import fs from 'node:fs';
import { replay, SPEED, storeFor } from './replay.mjs';
import { mercator } from './sim.mjs';

const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stats = (arr, d = 2) => (arr.length ? { n: arr.length, mean: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(d), p50: +q(arr, 0.5).toFixed(d), p95: +q(arr, 0.95).toFixed(d), p99: +q(arr, 0.99).toFixed(d), max: +Math.max(...arr).toFixed(d) } : { n: 0 });
const mPerPx = (zoom, lat) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

export function analyzeRun(which, run, { W = 1440, H = 852, hopPx = 8 } = {}) {
  const frames = run.frames || run.draws.map((d) => ({ raf: d.raf }));
  const rr = { ...run, frames };
  const { sim, app } = replay(which, rr, { W, H, collect: true });
  const proj = mercator(rr.center, rr.zoom, W, H).project;
  const st = storeFor(which); const pbt = st.pbt;
  const has = (id, t) => { const a = pbt[t]; return !!a && a.some((r) => r.unit_id === id); };
  const series = new Map(); // id -> last record
  const cur = []; // per frame: Map id -> rec
  let misaligned = 0;
  const events = { hop: [], backstep: [], appear: [], interpSteps: [], relaxJump: [], staticFrames: 0, smallMove: 0, frames: 0, unitFrames: 0, tickBoundaryFrames: 0 };
  const pairProfiles = new Map(); // key id|f -> steps in order
  let prev = null;
  for (let i = 0; i < sim.length; i++) {
    const s = sim[i];
    const [f, x] = s.args; // tick and fraction y1 used this frame
    const ids = [];
    for (const u of s.y1) { const p = proj([u.lng, u.lat]); if (p.x > -200 && p.x < W + 200 && p.y > -40 && p.y < H + 40) ids.push({ u, tx: p.x, ty: p.y }); }
    if (ids.length !== s.tiles.length) misaligned++;
    const map = new Map();
    ids.forEach((o, k) => { const t = s.tiles[k]; if (!t) return; map.set(o.u.unit_id, { tx: o.tx, ty: o.ty, x: t.x, y: t.y, w: t.w, f, xfrac: x, lat: o.u.lat, lng: o.u.lng, strength: o.u.strength, label: s.labels[k] ? s.labels[k].text : null, raf: s.raf }); });
    events.frames++;
    const boundary = prev && s.tick !== prev.tick;
    if (boundary) events.tickBoundaryFrames++;
    if (prev) {
      const dt = s.raf - prev.raf;
      for (const [id, c] of map) {
        const p = prev.map.get(id);
        if (!p) { events.appear.push({ id, frame: i, tick: s.tick, interior: c.tx > 30 && c.tx < W - 30 && c.ty > 30 && c.ty < H - 30 }); continue; }
        events.unitFrames++;
        const dx = c.tx - p.tx, dy = c.ty - p.ty; const step = Math.hypot(dx, dy);
        // interpolating = unit has rows at tick f and f+1 (y1 used F4 for it) in both frames; f may differ between frames at a boundary
        const interpNow = c.xfrac > 0 && has(id, c.f) && has(id, c.f + 1);
        const interpPrev = p.xfrac > 0 && has(id, p.f) && has(id, p.f + 1);
        const ox = c.x - c.tx, oy = c.y - c.ty, pox = p.x - p.tx, poy = p.y - p.ty;
        const relaxJump = Math.hypot(ox - pox, oy - poy);
        if (relaxJump > 0.01) events.relaxJump.push(relaxJump);
        if (step < 0.01) { events.staticFrames++; continue; }
        if (interpNow || interpPrev) {
          events.interpSteps.push(step);
          // direction of the unit's own keyframe pair (the intended direction of travel)
          const a = (pbt[p.f] || []).find((r) => r.unit_id === id), b = (pbt[p.f + 1] || []).find((r) => r.unit_id === id);
          let intended = null;
          if (a && b) { const ap = proj([a.lng, a.lat]), bp = proj([b.lng, b.lat]); intended = [bp.x - ap.x, bp.y - ap.y]; }
          if (intended && Math.hypot(...intended) > 3) { const dot = dx * intended[0] + dy * intended[1]; if (dot < 0 && step > 0.5) events.backstep.push({ id, frame: i, step, tick: s.tick, boundary: !!boundary, pairPx: Math.hypot(...intended) }); }
          const key = id + '|' + Math.min(p.f, c.f);
          (pairProfiles.get(key) || pairProfiles.set(key, []).get(key)).push({ step, boundary: !!boundary });
        } else if (step >= hopPx) events.hop.push({ id, frame: i, step, meters: step * mPerPx(rr.zoom, c.lat), tick: s.tick, boundary: !!boundary, dt });
        else events.smallMove++;
      }
    }
    cur.push(map); prev = { map, tick: s.tick, raf: s.raf };
  }
  // easing profile per interpolated pair (excluding the boundary frame): peak/mean step ratio, share of near-stopped frames
  const ratios = [], nearStop = [];
  for (const [, arr] of pairProfiles) { const v = arr.filter((a) => !a.boundary).map((a) => a.step); if (v.length >= 4) { const mean = v.reduce((a, b) => a + b, 0) / v.length; ratios.push(Math.max(...v) / mean); nearStop.push(v.filter((x) => x < 0.1 * mean).length / v.length); } }
  const rafDts = []; for (let i = 1; i < sim.length; i++) rafDts.push(sim[i].raf - sim[i - 1].raf);
  const seconds = (sim[sim.length - 1].raf - sim[0].raf) / 1000;
  const backBoundary = events.backstep.filter((b) => b.boundary).length;
  const interiorPop = events.appear.filter((a) => a.interior).length;
  const out = {
    build: which, label: run.label, speed: run.speed, start: run.start, zoom: rr.zoom, frames: sim.length, seconds: +seconds.toFixed(2), ticksAdvanced: sim[sim.length - 1].tick - sim[0].tick,
    tilesInView: stats(sim.map((s) => s.tiles.length), 0), misalignedFrames: misaligned,
    unitFrames: events.unitFrames, staticShare: +(events.staticFrames / events.unitFrames).toFixed(3),
    interpolatedUnitFrames: events.interpSteps.length, interpStepPx: stats(events.interpSteps),
    hops: { count: events.hop.length, perSecond: +(events.hop.length / seconds).toFixed(2), stepPx: stats(events.hop.map((h) => h.step)), stepMeters: stats(events.hop.map((h) => h.meters), 0), simultaneousMax: (() => { const c = {}; events.hop.forEach((h) => (c[h.frame] = (c[h.frame] || 0) + 1)); const v = Object.values(c); return v.length ? Math.max(...v) : 0; })(), framesWithHop: new Set(events.hop.map((h) => h.frame)).size },
    backsteps: { count: events.backstep.length, atTickBoundary: backBoundary, stepPx: stats(events.backstep.map((b) => b.step)), perSecond: +(events.backstep.length / seconds).toFixed(2), tickBoundaryFramesInRun: events.tickBoundaryFrames },
    easing: { pairs: ratios.length, peakOverMeanStep_median: ratios.length ? +q(ratios, 0.5).toFixed(2) : null, peakOverMeanStep_p90: ratios.length ? +q(ratios, 0.9).toFixed(2) : null, shareOfFramesBelow10pcOfMeanSpeed_median: nearStop.length ? +q(nearStop, 0.5).toFixed(3) : null },
    relaxation: { redrawsWithOffsetChange: events.relaxJump.length, jumpPx: stats(events.relaxJump), over3px: events.relaxJump.filter((v) => v > 3).length, over3pxPerSecond: +(events.relaxJump.filter((v) => v > 3).length / seconds).toFixed(2) },
    appear: { total: events.appear.length, interior: interiorPop },
    frameDtMs: stats(rafDts),
  };
  return { metrics: out, events, sim };
}
if ((process.argv[1] || '').endsWith('analyze-sim.mjs')) {
  const which = process.argv[2]; const file = process.argv[3]; const only = process.argv[4];
  const runs = JSON.parse(fs.readFileSync(file, 'utf8')).runs;
  const all = [];
  for (const run of runs) {
    if (only && !run.label.includes(only)) continue;
    const t0 = Date.now();
    const { metrics } = analyzeRun(which, run);
    all.push(metrics);
    console.log(run.label, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify({ hops: metrics.hops.count, back: metrics.backsteps, inView: metrics.tilesInView.p50 }));
  }
  fs.writeFileSync(file.replace('.json', '.analysis' + (only ? '-' + only.replace(/[^a-z0-9.]/gi, '_') : '') + '.json'), JSON.stringify(all, null, 2));
}
