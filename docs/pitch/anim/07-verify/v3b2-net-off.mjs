// v3b2-net-off.mjs - causal check for the "unit with no tile" finding: the same runs as v3b with the display layer's safety net switched off (dial motion.safetyNet = false).  If the gaps disappear and overlaps appear,
// the repair step is what blanks the tiles.   -> results/v3b2-net-off.json
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
import { loadKeyframes, firstTicks } from './srcdata.mjs';
import { SCENES } from './scenes.mjs';
const first = firstTicks(loadKeyframes().units); const PORT = +(args.port || 9732); const srv = await serve(PROTO, PORT); const s = await launch({ port: PORT, query: 'welcome=0&manual=1', witness: true, profile: 'netoff' }); const rows = [];
try {
  await s.page.evaluate(() => { window.__rec.keep = false; window.__rec.install({ dom: [] }); window.__studio.engine.tuning.set('popup.enabled', false); });
  for (const net of [true, false]) for (const name of ['the-angle', 'rose-woods', 'cemetery-hill', 'evening']) {
    const r = await s.page.evaluate(({ first, sc, net }) => { const S = window.__studio; const E = S.engine; const R = window.__rec; E.tuning.set('motion.safetyNet', net); E.transport.pause(); E.select(null); E.transport.seek(sc.tick, { glide: false }); E.moveTo({ lat: sc.lat, lng: sc.lng, zoom: sc.zoom }, { glide: false, safe: true }); for (let i = 0; i < 260; i++) S.step(1, 16.667); E.transport.setSpeed(4); E.transport.play(); for (let i = 0; i < 40; i++) S.step(1, 16.667);
      let gapFrames = 0; let gapUnitFrames = 0; let ssFrames = 0; let sdFrames = 0; for (let i = 0; i < 1200; i++) { const f = S.step(1, 16.667); const any = new Set(); for (const t of f.tiles) if (t.opacity >= 0.02) for (const id of t.ids) any.add(id); let g = 0; for (const id in first) if (f.tau >= first[id] && !any.has(id)) g++; if (g) { gapFrames++; gapUnitFrames += g; } const q = R.last; if (q.ss.cc + q.ss.lc + q.ss.lp + q.ss.cp + q.ss.ll > 0) ssFrames++; if (q.sd.cc + q.sd.lc + q.sd.lp + q.sd.cp + q.sd.ll > 0) sdFrames++; }
      E.tuning.set('motion.safetyNet', true); return { gapFrames, gapUnitFrames, solidSolidFrames: ssFrames, solidDimFrames: sdFrames }; }, { first, sc: SCENES[name], net });
    rows.push({ safetyNet: net, scene: name, ...r }); console.log('safetyNet', net, name, JSON.stringify(r));
  }
  writeJson('v3b2-net-off.json', { generated: new Date().toISOString(), rows });
} finally { await s.close(); srv.close(); }
