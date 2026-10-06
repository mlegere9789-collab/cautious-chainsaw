// Position-only replay of the shipped playback loop (Ed + y1 + F4), no drawing (filters.sides = [] makes lS return nothing heavy).
// Runs the WHOLE battle 1 -> 675 at each speed with synthetic frame timestamps (60 Hz or any list) and analyses every unit's true screen position.
import fs from 'node:fs';
import { makeApp, mercator } from './sim.mjs';
import { storeFor, SPEED } from './replay.mjs';
const q = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const stats = (arr, d = 2) => (arr.length ? { n: arr.length, mean: +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(d), p50: +q(arr, 0.5).toFixed(d), p95: +q(arr, 0.95).toFixed(d), p99: +q(arr, 0.99).toFixed(d), max: +Math.max(...arr).toFixed(d) } : { n: 0 });
const mPerPx = (zoom, lat) => (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

export function motion(which, { speed = 1, startTick = 1, endTick = 675, hz = 60, stamps = null, zoom = 13.5, center = [-77.235, 39.812], hopPx = 8, phoneCap = false } = {}) {
  const st = storeFor(which); const pbt = st.pbt;
  const has = (id, t) => { const a = pbt[t]; if (!a) return false; for (const r of a) if (r.unit_id === id) return true; return false; };
  const app = makeApp(which, { pbt, W: phoneCap ? 390 : 1440, H: 852, center, zoom, tick: startTick, speed, filters: { sides: [], dispositions: undefined, minStrength: 0 } });
  app.drawStill(startTick); app.ctx.frames.length = 0;
  app.state.isPlaying = true; app.state.currentTick = startTick; app.start();
  const proj = mercator(center, zoom, 1440, 852).project;
  const seenBefore = new Set(), goneAt = new Map(), recovering = new Set();
  const ev = { reappear: 0, reappearAfterOneFrame: 0, recover: [], handover: [], snap: [], hop: [], back: [], interp: [], appear: 0, static: 0, small: 0, unitFrames: 0, jerk: [], accel: [], boundary: 0 };
  const prof = new Map();
  let prev = null; let frame = 0; let t = 0; let frames = 0; const t0 = stamps ? stamps[0] : 0; const simFrames = []; let lastTickSeen = startTick;
  const next = () => { if (stamps) return frame < stamps.length ? stamps[frame++] : null; const v = t; t += 1000 / hz; frame++; return v; };
  const hist = new Map(); // id -> last three {x,y,dt,boundary}
  let ts;
  while ((ts = next()) != null) {
    if (!app.step(ts)) break; // loop ended (tick 675 reached -> isPlaying false and no re-arm)
    frames++;
    const y = app.api.getLastY1(); const [f, x] = app.api.getLastArgs(); const tick = app.state.currentTick; const boundary = tick !== lastTickSeen; lastTickSeen = tick; if (boundary) ev.boundary++;
    const cur = new Map();
    for (const u of y) { const p = proj([u.lng, u.lat]); cur.set(u.unit_id, { x: p.x, y: p.y, f, xf: x, lat: u.lat }); }
    if (prev) {
      const dt = ts - prev.ts;
      for (const [id, c] of cur) {
        const p = prev.map.get(id);
        if (!p) { if (seenBefore.has(id)) { ev.reappear++; if (goneAt.get(id) === frames - 1) ev.reappearAfterOneFrame++; } else { ev.appear++; seenBefore.add(id); } continue; }
        seenBefore.add(id);
        ev.unitFrames++;
        const dx = c.x - p.x, dy = c.y - p.y, step = Math.hypot(dx, dy);
        if (step < 0.01) { ev.static++; hist.delete(id); continue; }
        const interpNow = c.xf > 0 && has(id, c.f) && has(id, c.f + 1), interpPrev = p.xf > 0 && has(id, p.f) && has(id, p.f + 1);
        const samePair = interpNow && interpPrev && c.f === p.f;
        if (samePair && c.xf < p.xf) { ev.snap.push({ step, boundary }); hist.delete(id); recovering.add(id); continue; }
        if (recovering.has(id)) { recovering.delete(id); ev.recover.push(step); hist.delete(id); continue; }
        if (samePair && c.xf > p.xf && !boundary) {
          ev.interp.push(step);
          const key = id + '|' + c.f; (prof.get(key) || prof.set(key, []).get(key)).push({ step, boundary });
          const h = hist.get(id) || []; h.push({ v: step / dt, dt }); if (h.length > 3) h.shift(); hist.set(id, h);
          if (h.length === 3) { const a1 = (h[1].v - h[0].v) / ((h[0].dt + h[1].dt) / 2), a2 = (h[2].v - h[1].v) / ((h[1].dt + h[2].dt) / 2); ev.accel.push(Math.abs(a2) * 1e6); ev.jerk.push((Math.abs(a2 - a1) / ((h[0].dt + h[1].dt + h[2].dt) / 3)) * 1e9); }
        } else if (interpNow || interpPrev) { ev.handover.push(step); hist.delete(id); }
        else if (step >= hopPx) { ev.hop.push({ step, m: step * mPerPx(zoom, c.lat), boundary, frame: frames }); hist.delete(id); }
        else { ev.small++; hist.delete(id); }
      }
      for (const id of prev.map.keys()) if (!cur.has(id)) goneAt.set(id, frames);
    }
    prev = { map: cur, ts };
  }
  const seconds = (frames / hz);
  const ratios = [], near = [];
  for (const [, arr] of prof) { const v = arr.filter((a) => !a.boundary).map((a) => a.step); if (v.length >= 4) { const mean = v.reduce((a, b) => a + b, 0) / v.length; ratios.push(Math.max(...v) / mean); near.push(v.filter((s) => s < 0.1 * mean).length / v.length); } }
  const perFrame = {}; ev.hop.forEach((h) => (perFrame[h.frame] = (perFrame[h.frame] || 0) + 1));
  return {
    build: which, speed, startTick, endTick: app.state.currentTick, frames, seconds: +seconds.toFixed(1), zoom,
    unitFrames: ev.unitFrames, staticShare: +(ev.static / ev.unitFrames).toFixed(3), smallNonInterpMoves: ev.small,
    interpolatedStepsWithinATick: stats(ev.interp),
    hops: { count: ev.hop.length, framesWithAHop: Object.keys(perFrame).length, perSecond: +(ev.hop.length / seconds).toFixed(2), stepPx: stats(ev.hop.map((h) => h.step)), meters: stats(ev.hop.map((h) => h.m), 0), maxSimultaneousInOneFrame: Object.keys(perFrame).length ? Math.max(...Object.values(perFrame)) : 0 },
    tickBoundaryFrames: ev.boundary,
    snapBacks: { note: 'a unit that is interpolating between keyframes of ticks f and f+1 is drawn LATER on its path than in the previous frame (same f, smaller fraction): the stale tick snapshot in Ed', count: ev.snap.length, atTickBoundaryFrame: ev.snap.filter((b) => b.boundary).length, stepPx: stats(ev.snap.map((b) => b.step)), perSecond: +(ev.snap.length / seconds).toFixed(2) },
    easing: { pairs: ratios.length, peakOverMeanStep_median: ratios.length ? +q(ratios, 0.5).toFixed(2) : null, peakOverMeanStep_p90: ratios.length ? +q(ratios, 0.9).toFixed(2) : null, shareOfFramesBelow10pcOfMeanSpeed_median: near.length ? +q(near, 0.5).toFixed(3) : null },
    smoothFrames: { accel_px_per_s2: stats(ev.accel, 0), jerk_px_per_s3: stats(ev.jerk, 0), note: 'px/s^2 and px/s^3 of the true (projected) position on runs of 3+ consecutive frames inside one interpolated tick (same keyframe pair, fraction increasing, not the boundary frame); constant-speed motion would give 0' },
    afterSnapBackFrame: { note: 'the frame after a snap-back: the unit jumps forward again', stepPx: stats(ev.recover) },
    pairHandoverSteps: stats(ev.handover),
    firstAppearances: ev.appear, reappearances: ev.reappear, reappearedAfterExactlyOneFrameAbsent: ev.reappearAfterOneFrame,
  };
}
if ((process.argv[1] || '').endsWith('fast-motion.mjs')) {
  const which = process.argv[2] || 'r1c'; const out = [];
  for (const sp of ['1/4x', '1/2x', '1x', '2x', '4x', '8x']) for (const hz of [60]) {
    for (const zoom of [13.5]) { const t0 = Date.now(); const m = motion(which, { speed: SPEED[sp], hz, zoom }); m.speedLabel = sp; m.hz = hz; out.push(m); console.log(sp, 'z' + zoom, ((Date.now() - t0) / 1000).toFixed(1) + 's', 'hops', m.hops.count, 'hop/s', m.hops.perSecond, 'snapbacks', m.snapBacks.count, 'at boundary', m.snapBacks.atTickBoundaryFrame, 'median px', m.snapBacks.stepPx.p50, 'max', m.snapBacks.stepPx.max, 'end', m.endTick); }
  }
  fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/fast-motion.json', JSON.stringify(out, null, 2));
}
