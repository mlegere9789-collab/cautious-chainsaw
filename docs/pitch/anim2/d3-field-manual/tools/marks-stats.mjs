// tools/marks-stats.mjs - what the marks measure on the real data (footprints in CSS px at 1x, and how many units stand as themselves or inside a stack), read from the engine frame of the page.
//   node tools/marks-stats.mjs  ->  results/marks.json
import fs from 'node:fs';
import path from 'node:path';
import { startServer, launch, ROOT } from './lib.mjs';

const srv = await startServer(); const s = await launch({ dpr: 1, profile: 'marks', query: 'manual=1&backdrop=ink' });
try {
  const out = await s.page.evaluate(() => {
    const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); const rows = []; const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[Math.min(b.length - 1, Math.floor(b.length * p))] : null; };
    for (const [zoom, tick] of [[13.5, 551], [13.5, 620], [15, 551], [15, 295], [16.5, 551]]) {
      E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false }); for (let n = 0; n < 200; n++) { const f = S.step(1, 16.667); if (n > 6 && f.tiles.every((t) => t.life === 'live' && t.opacity > 0.999 && !t.travelling && !t.entering) && !E.busy()) break; }
      const f = E.frame; const live = f.tiles.filter((t) => t.life === 'live');
      const cls = { unit: live.filter((t) => t.kind === 'leaf' && t.unit && !['brigade', 'division', 'corps', 'army'].includes(t.unit.kind)), formation: live.filter((t) => t.kind === 'leaf' && t.unit && ['brigade', 'division', 'corps', 'army'].includes(t.unit.kind)), stack: live.filter((t) => t.kind === 'agg') };
      const dims = (a) => ({ n: a.length, w: { min: Math.min(...a.map((t) => t.w)), p50: q(a.map((t) => t.w), 0.5), max: Math.max(...a.map((t) => t.w)) }, h: { min: Math.min(...a.map((t) => t.h)), p50: q(a.map((t) => t.h), 0.5), max: Math.max(...a.map((t) => t.h)) } });
      const unitsInStacks = cls.stack.reduce((a, t) => a + t.n, 0); const asThemselves = cls.unit.length + cls.formation.length;
      rows.push({ zoom, tick, unitsOnField: f.onField, marks: live.length, namedMarks: live.filter((t) => t.named).length, unitMarks: dims(cls.unit), formationMarks: cls.formation.length ? dims(cls.formation) : null, stacks: cls.stack.length ? dims(cls.stack) : null, unitsStandingAsThemselves: asThemselves, unitsInsideStacks: unitsInStacks, shareStandingAsThemselves: +(asThemselves / f.onField).toFixed(3), largestStack: Math.max(0, ...cls.stack.map((t) => t.n)), fresh: live.filter((t) => t.kind === 'leaf' && t.ageTicks < 112.5).length, carried: live.filter((t) => t.kind === 'leaf' && t.ageTicks >= 225).length });
    }
    return rows;
  });
  fs.writeFileSync(path.join(ROOT, 'results', 'marks.json'), JSON.stringify({ generated: new Date().toISOString(), note: 'footprints include the 2 px selection band on every side (4 px in each direction)', rows: out }, null, 1));
  for (const r of out) console.log(JSON.stringify({ z: r.zoom, t: r.tick, units: r.unitsOnField, marks: r.marks, named: r.namedMarks, asThem: r.unitsStandingAsThemselves, inStacks: r.unitsInsideStacks, share: r.shareStandingAsThemselves, unitW: r.unitMarks.w, unitH: r.unitMarks.h }));
} finally { await s.close(); srv.close(); }
