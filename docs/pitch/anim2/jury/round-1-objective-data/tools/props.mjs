// props.mjs - what share of the units on screen stands as its OWN mark and what share is merged into a formation or crowd mark, at zoom 13.5, 15 and 16.5, at several ticks and places.
//   node props.mjs [--vp=desktop|phone] [--dir=d1,...]     writes results/props-<vp>.json
import fs from 'node:fs';
import path from 'node:path';
import { serve, launch, openDir, DIRS, HERE } from './lib.mjs';
const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), '1'] : [a.slice(2, i), a.slice(i + 1)]; }));
const VP = args.vp || 'desktop'; const dims = VP === 'phone' ? { w: 390, h: 844, mobile: true } : { w: 1440, h: 900, mobile: false };
const ANGLE = { lat: 39.8117, lng: -77.2347 }; const FIELD = { lat: 39.81592, lng: -77.23677 }; const WHEAT = { lat: 39.7992, lng: -77.2414 }; const CEM = { lat: 39.8189, lng: -77.2262 };
const PLACES = [['field', FIELD], ['angle', ANGLE], ['wheatfield', WHEAT], ['cemetery-hill', CEM]];
const TICKS = [295, 346, 551, 556];
const ZOOMS = [13.5, 15, 16.5];
const configs = [['d1', 'day'], ['d1', 'night'], ['d4', 'paper'], ['d4', 'aerial']].filter(([d]) => !args.dir || args.dir.split(',').includes(d));
await serve(); const rows = [];
for (const [d, look] of configs) {
  const b = await launch({ ...dims, dpr: 2, profile: `props-${d}-${look}-${VP}` });
  try {
    await openDir(b.page, d, look);
    await b.page.evaluate(() => { window.__studio.engine.tuning.set('popup.enabled', false); });
    for (const tick of TICKS) for (const [pname, pos] of PLACES) for (const zoom of ZOOMS) {
      const r = await b.page.evaluate(async ({ tick, pos, zoom }) => {
        const S = window.__studio; const E = S.engine; E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: pos.lat, lng: pos.lng, zoom }, { glide: false, safe: true });
        window.__adv(40, 50); window.__adv(110, 16.7);
        const f = E.frame; const v = f.view; const dx = v.dx; const dy = v.dy;
        const live = f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5);
        const inView = live.filter((t) => { const x0 = t.x + dx - t.w * t.scale / 2; const x1 = t.x + dx + t.w * t.scale / 2; const y0 = t.y + dy - t.h * t.scale / 2; const y1 = t.y + dy + t.h * t.scale / 2; return x1 > 0 && x0 < v.w && y1 > 0 && y0 < v.h; });
        const units = (t) => (t.kind === 'agg' ? t.n : 1);
        const own = inView.filter((t) => t.kind !== 'agg'); const agg = inView.filter((t) => t.kind === 'agg');
        const uOwn = own.reduce((s, t) => s + units(t), 0); const uAgg = agg.reduce((s, t) => s + units(t), 0);
        const allOwn = live.filter((t) => t.kind !== 'agg').length; const allAgg = live.filter((t) => t.kind === 'agg').reduce((s, t) => s + t.n, 0);
        const named = inView.filter((t) => t.kind === 'agg' && t.fname).length;
        const crowds = agg.map((t) => ({ n: t.n, kind: t.nameKind || null, text: ((t.fname || t.short || '') + (t.ftail || '')), side: t.side }));
        return { crowds, marksInView: inView.length, ownMarks: own.length, crowdMarks: agg.length, unitsOwn: uOwn, unitsMerged: uAgg, unitsInView: uOwn + uAgg, unitsOnFieldAll: allOwn + allAgg, ownAll: allOwn, mergedAll: allAgg, onField: f.onField, unrep: f.unrepresented, overlaps: f.overlaps, nIdsCheck: agg.every((t) => t.ids.length === t.n), widest: agg.reduce((m, t) => Math.max(m, t.n), 0) };
      }, { tick, pos, zoom });
      rows.push({ dir: d, look, vp: VP, tick, place: pname, zoom, ...r });
    }
    console.log(d, look, VP, 'done', rows.length);
  } finally { await b.close(); }
}
fs.mkdirSync(path.join(HERE, 'results'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'results', `props-${VP}${args.dir ? '-' + args.dir : ''}.json`), JSON.stringify(rows, null, 1));
process.exit(0);
