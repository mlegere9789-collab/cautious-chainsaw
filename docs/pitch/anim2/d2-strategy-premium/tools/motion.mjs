// tools/motion.mjs - jitter, pacing and cost of the Strategy Premium page in real Chrome, measured by the engine's own recorder (engine.metricsOf('after')):
//   A. real-time playback (the page's own animation loop) at three places and speeds, DPR 2 and DPR 1: fps, frame p95, frames over 20 ms, pops and teleports per second, largest one-frame step, overlap frames
//   B. a zoom glide through the range in which names unfold into the marks (14.5 -> 16.5 -> 14.5), driven frame by frame at 60 Hz
//   C. a selection and a deselection at zoom 16.5 (the name unfolds in the layout)
// "pop" = a mark that moves more than 3 px beyond its unit's own motion in one frame, "teleport" more than 12 px (the lab's definitions, metrics/metrics.mjs).
//   node tools/motion.mjs [--secs=8] [--only=A|B|C]
import fs from 'node:fs';
import path from 'node:path';
import { launch, args, D2, sleep } from './lib.mjs';

const SECS = +(args.secs || 8); const out = { made: 'node tools/motion.mjs', secs: SECS, A: [], B: [], C: [] };
const pick = (s) => ({ frames: s.frames, fps: +s.fpsMean?.toFixed?.(1) || s.fpsMean, p95ms: s.dtMsP95, over20Pct: s.framesOver20msPct, enginems: s.engineMsMean, popsPerSec: s.popsPerSec, teleportsPerSec: s.teleportsPerSec, maxExcessPx: s.maxExcessPx, jumpsPerSec: s.jumpsPerSec, jumpsSolidPerSec: s.jumpsSolidPerSec, maxStepPx: s.maxStepPx, overlapFrames: s.overlapFrames, unrepresentedUnitFrames: s.unrepresentedUnitFrames, travelsPerSec: s.travelsPerSec, travellingTilesMean: s.travellingTilesMean, tilesMean: s.tilesMean });
const only = args.only || 'ABC';
if (only.includes('A')) {
  for (const dpr of [2, 1]) for (const [name, q] of [['The Angle z15 1x', 'scene=fresh2&zoom=15&speed=1'], ['The Angle z15 4x', 'scene=fresh2&zoom=15&speed=4'], ['Whole field z13.5 4x', 'scene=field&zoom=13.5&speed=4'], ['Cemetery Hill z15.5 1x', 'scene=evening1&zoom=15.5&speed=1']]) {
    const run = await launch({ w: 1440, h: 900, dpr, query: q + '&play=1&popups=0', inject: false, profile: 'motion' });
    try {
      await run.page.evaluate(() => { window.__studio.tuning.set('popup.enabled', false); });
      const t0 = Date.now(); await run.page.evaluate(() => globalThis.__realBackdrop.whenIdle(60000)); const loadMs = Date.now() - t0; await sleep(2500); await run.page.evaluate(() => { window.__studio.engine.metricsOf('after').reset(); }); await sleep(SECS * 1000);
      const s = await run.page.evaluate(() => window.__studio.engine.metricsOf('after').summary({ maxAgeMs: 0 }));
      const r = { scene: name, dpr, ground_ready_after_ms: loadMs, ...pick(s), errors: run.errors.filter((m) => !/404/.test(m)).length, external: run.requests.length }; out.A.push(r); console.log('A', JSON.stringify(r));
    } finally { await run.close(); }
  }
}
if (only.includes('B') || only.includes('C')) {
  const run = await launch({ w: 1440, h: 900, dpr: 2, query: 'manual=1&scene=fresh2&zoom=14.5', profile: 'motion' });
  try {
    await run.page.evaluate(() => { const S = window.__studio; S.tuning.set('popup.enabled', false); const e = S.engine; e.transport.pause(); e.transport.seek(556, { glide: false }); e.moveTo({ lat: 39.8117, lng: -77.2347, zoom: 14.5 }, { glide: false, safe: true }); window.__adv(120); });
    const seg = async (label, fn, bucket, frames) => { const r = await run.page.evaluate(async ({ fn, frames }) => { const S = window.__studio; const e = S.engine; e.metricsOf('after').reset(); const f = new Function('e', 'S', 'adv', fn); f(e, S, window.__adv); window.__adv(frames, 1000 / 60); const s = e.metricsOf('after').summary({ maxAgeMs: 0 }); return s; }, { fn, frames }); const row = { label, ...pick(r) }; out[bucket].push(row); console.log(bucket, JSON.stringify(row)); };
    if (only.includes('B')) {
      await seg('zoom 14.5 -> 16.5 (180 ms glide, 2 s)', 'e.zoomTo(16.5, { at: [720, 380] });', 'B', 130);
      await seg('zoom 16.5 -> 14.5 (2 s)', 'e.zoomTo(14.5, { at: [720, 380] });', 'B', 130);
      await seg('wheel-like slow zoom 15 -> 16.2 over 3 s', 'e.zoomTo(15, { glide: false }); for (let i = 0; i < 180; i++) { e.zoomTo(15 + 1.2 * i / 179, { at: [720, 380], glide: false }); adv(1, 1000 / 60); }', 'B', 20);
    }
    if (only.includes('C')) {
      await run.page.evaluate(() => { const e = window.__studio.engine; e.zoomTo(16.5, { glide: false }); window.__adv(150); });
      await seg('select a unit at zoom 16.5', "const f = e.frame; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf').sort((a, b) => Math.hypot(a.x + f.view.dx - 720, a.y + f.view.dy - 380) - Math.hypot(b.x + f.view.dx - 720, b.y + f.view.dy - 380))[0]; e.select(t.ids[0]); S.host.setSelected(t.ids[0]);", 'C', 90);
      await seg('deselect', "e.select(null); S.host.setSelected(null);", 'C', 90);
      await seg('select at zoom 15 (name unfolds in a crowded place)', "e.zoomTo(15, { glide: false }); adv(90); const f = e.frame; const t = f.tiles.filter((q) => q.solid && q.kind === 'leaf').sort((a, b) => Math.hypot(a.x + f.view.dx - 720, a.y + f.view.dy - 380) - Math.hypot(b.x + f.view.dx - 720, b.y + f.view.dy - 380))[0]; e.metricsOf('after').reset(); e.select(t.ids[0]); S.host.setSelected(t.ids[0]);", 'C', 90);
    }
  } finally { await run.close(); }
}
fs.mkdirSync(path.join(D2, 'results'), { recursive: true }); fs.writeFileSync(path.join(D2, 'results', 'motion.json'), JSON.stringify(out, null, 1));
