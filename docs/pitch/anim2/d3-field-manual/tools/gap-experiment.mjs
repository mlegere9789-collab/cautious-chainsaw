// tools/gap-experiment.mjs - how much does the 2 px design clearance between footprints cost?  The footprint already carries the 2 px selection band on every side, so two plates stand 4 px apart (the
// 4 px module) at layout.gapPx = 0 and 6 px apart at the default 2.  Same scenes, three values of the dial: marks, units standing as themselves, overlaps (the independent check).
import { startServer, launch, verify, ROOT } from './lib.mjs';
import fs from 'node:fs'; import path from 'node:path';
const srv = await startServer(); const s = await launch({ dpr: 1, profile: 'gap', query: 'manual=1&backdrop=ink' }); const out = [];
try {
  for (const gap of [2, 1, 0]) {
    await s.page.evaluate((gap) => { window.__studio.engine.tuning.set('layout.gapPx', gap); window.__studio.engine.tuning.set('popup.enabled', false); }, gap);
    for (const [zoom, tick] of [[13.5, 551], [15, 551], [15, 295]]) {
      await s.page.evaluate(({ zoom, tick }) => { const S = window.__studio; const E = S.engine; E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false }); for (let n = 0; n < 300; n++) { const f = S.step(1, 16.667); if (n > 6 && f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !E.busy()) break; } }, { zoom, tick });
      const v = await verify(s.page); const share = await s.page.evaluate(() => { const f = window.__studio.engine.frame; const live = f.tiles.filter((t) => t.life === 'live'); const stacks = live.filter((t) => t.kind === 'agg'); return { marks: live.length, stacks: stacks.length, unitsInStacks: stacks.reduce((a, t) => a + t.n, 0), units: f.onField }; });
      out.push({ gap, zoom, tick, ...share, share: +(1 - share.unitsInStacks / share.units).toFixed(3), coreOverlaps: v.coreOverlaps, pinCovered: v.pinCovered, unrepresented: v.unrepresented, minClearancePx: v.minClearancePx }); console.log(JSON.stringify(out.at(-1)));
    }
  }
  fs.writeFileSync(path.join(ROOT, 'results', 'gap-experiment.json'), JSON.stringify({ generated: new Date().toISOString(), runs: out }, null, 1));
} finally { await s.close(); srv.close(); }
