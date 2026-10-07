// tools/zoom-test.mjs - does anything jump when every mark grows to its name?  A camera glide from zoom 15.2 to 16.8 (across form.nameZoom) at 60 fps, against a control glide of the same length that never
// crosses it (14.2 to 15.8): the engine's own recorder (pops, teleports, one-frame steps, overlapping frames) and the independent check on every frame.
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib.mjs';
const srv = await startServer(); const s = await launch({ dpr: 1, profile: 'zoom', query: 'manual=1' }); const out = [];
try {
  for (const [name, z0, z1, lat, lng, tick] of [['across the name zoom (15.2 to 16.8)', 15.2, 16.8, 39.8117, -77.2347, 551], ['control, no form change (14.2 to 15.0)', 14.2, 15.0, 39.8117, -77.2347, 551], ['across, at Cemetery Hill (15.2 to 16.8)', 15.2, 16.8, 39.8189, -77.2262, 346]]) {
    const r = await s.page.evaluate(({ z0, z1, lat, lng, tick }) => {
      const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat, lng, zoom: z0 }, { glide: false, safe: false }); for (let i = 0; i < 120; i++) S.step(1, 16.667);
      E.metricsOf('after').reset(); E.zoomTo(z1, { glide: true }); let overlapFrames = 0; let unrep = 0; let maxStep = 0; let prev = new Map(); let named = 0; let frames = 0; let flips = 0; let lastNamed = null;
      for (let i = 0; i < 240; i++) {
        const f = S.step(1, 16.667); frames++; if (f.overlaps) overlapFrames++; unrep += f.unrepresented;
        const cur = new Map(); for (const t of f.tiles) if (t.solid) { cur.set(t.key, [t.x, t.y, t.scale]); const p = prev.get(t.key); if (p && Math.abs(p[2] - t.scale) < 0.02) maxStep = Math.max(maxStep, Math.hypot(t.x - p[0], t.y - p[1])); }
        prev = cur; const n = f.tiles.filter((t) => t.named).length; if (lastNamed !== null && (n > 0) !== (lastNamed > 0)) flips++; lastNamed = n; named = n;
      }
      const m = E.metricsOf('after').summary(); return { frames, zoomEnd: +E.camera.zoom.toFixed(2), overlapFrames, unrepresentedUnitFrames: unrep, namedAtEnd: named, formFlips: flips, popsPerSec: m.popsPerSec, teleportsPerSec: m.teleportsPerSec, maxExcessPx: m.maxExcessPx, jumpsSolidPerSec: m.jumpsSolidPerSec, maxStepPx: m.maxStepPx, jerkP99: m.jerkP99, travelsPerSec: m.travelsPerSec, blinks: m.blinks, overlapPairs: m.overlapPairs };
    }, { z0, z1, lat, lng, tick });
    out.push({ name, ...r }); console.log(name, JSON.stringify(r));
  }
  fs.writeFileSync(path.join(ROOT, 'results', 'zoom-test.json'), JSON.stringify({ generated: new Date().toISOString(), runs: out, errors: s.errors }, null, 1)); console.log('errors', s.errors.length);
} finally { await s.close(); srv.close(); }
