// v3h-rest-cadence.mjs - is the "paused picture never rests" finding (v3g) caused by the default solve cadence ('auto') or by the engine itself?  The same samples with layout.solveEvery = 1 (what the prototype's own
// sweeps force) and with the default, and also exactly the README scene (The Angle, zoom 14, tick 556) watched for 60 s after a 5 s settle, the way the README measured it.   -> results/v3h-rest-cadence.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9723); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'restcad' }); const rows = [];
try {
  await s.page.evaluate(() => { window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const every of ['auto', '1']) for (const [zoom, tick] of [[14, 556], [14, 558], [15, 556], [15, 548]]) {
    const r = await s.page.evaluate(({ every, zoom, tick }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('layout.solveEvery', every); E.transport.pause(); E.select(null); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.8117, lng: -77.2347, zoom }, { glide: false, safe: true }); for (let i = 0; i < 700; i++) S.step(1, 16.667);
      const snap = (f) => new Map(f.tiles.map((t) => [t.key, [t.x, t.y, t.opacity]])); let prev = snap(E.frame); let busy = 0; let moved = 0; let maxStep = 0; const FR = 3600; let firstBusy = -1; let episodes = 0; let inEp = false;
      for (let i = 0; i < FR; i++) { const f = S.step(1, 16.667); const cur = snap(f); const b = E.busy(); if (b) { busy++; if (firstBusy < 0) firstBusy = i; } if (b && !inEp) { episodes++; inEp = true; } if (!b) inEp = false; for (const [k, v] of cur) { const p = prev.get(k); if (!p) continue; const d = Math.hypot(v[0] - p[0], v[1] - p[1]); if (d > 0.001 || Math.abs(v[2] - p[2]) > 1e-4) { moved++; if (d > maxStep) maxStep = d; } } prev = cur; }
      return { busyFramesOf3600: busy, firstBusyFrame: firstBusy, busyEpisodes: episodes, movedTileFrames: moved, maxStepPx: +maxStep.toFixed(3), autoEvery: E.autoEvery() };
    }, { every, zoom, tick });
    rows.push({ solveEvery: every, zoom, tick, ...r }); console.log('solveEvery', every, 'z' + zoom, 'tick', tick, JSON.stringify(r));
  }
  writeJson('v3h-rest-cadence.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
