// dtsweep.mjs - does the layout come to rest at every frame rate?  The engine is stepped with a CONSTANT frame time (dt) after a jump to the field view; after 900 frames the next 120 are measured (marks that move more than 0.5 px between frames).
//   node dtsweep.mjs  -> results/dtsweep.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, HERE } from './lib.mjs';
import { initOff, installHelpers, FIELD } from './pagelib.mjs';
const srv = await serve(); const out = [];
const DTS = [16.667, 20, 22, 25, 28, 30, 33.333, 40, 50];
for (const [d, look] of [['d1', 'day'], ['d4', 'paper']]) for (const vp of ['desktop', 'phone']) {
  const dims = vp === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
  for (const dt of DTS) {
    const b = await launch({ ...dims, dpr: 2, profile: `dt-${d}`, init: initOff });
    try {
      await openDir(b.page, d, look); await installHelpers(b.page);
      const r = await b.page.evaluate(async ({ dt, zoom }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.select(null); E.transport.pause(); E.transport.seek(551, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: true });
        for (let k = 0; k < 900; k++) window.__adv(1, dt);
        const prev = new Map(); const worst = new Map(); let framesWith = 0; let busy = 0; const N = 120;
        for (let k = 0; k < N; k++) { window.__adv(1, dt); const f = E.frame; let any = false; if (E.busy()) busy++; const v = f.view; for (const t of f.tiles) { if (t.life !== 'live') continue; const x = t.x + v.dx; const y = t.y + v.dy; const p = prev.get(t.key); if (p) { const dd = Math.hypot(x - p[0], y - p[1]); if (dd > 0.5) { any = true; const w = worst.get(t.key) || { n: 0, max: 0 }; w.n++; w.max = Math.max(w.max, dd); worst.set(t.key, w); } } prev.set(t.key, [x, y]); } if (any) framesWith++; }
        const a = [...worst.values()];
        return { framesMoving: framesWith, tilesMoving: a.length, maxStep: a.length ? +Math.max(...a.map((w) => w.max)).toFixed(1) : 0, busyFrames: busy, live: E.frame.tiles.filter((t) => t.life === 'live').length };
      }, { dt, zoom: vp === 'phone' ? 13 : 13.5 });
      out.push({ dir: d, look, vp, dt, fps: +(1000 / dt).toFixed(1), ...r }); console.log(d, vp, 'dt', dt, JSON.stringify(r));
    } finally { await b.close(); }
  }
}
fs.writeFileSync(path.join(HERE, 'results', 'dtsweep.json'), JSON.stringify(out, null, 1)); srv.close(); process.exit(0);
