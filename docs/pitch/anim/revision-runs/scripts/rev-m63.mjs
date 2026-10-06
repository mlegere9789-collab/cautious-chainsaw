// rev-m63.mjs (revision: the reviewer's r-agg.mjs for 1863 Map only, which the review did not run)
// r-agg.mjs (reviewer) - how many of the units on the field have a tile of their own, by style / nudge budget / zoom / tick (settled, popups off).
import { serve, launch, PROTO, args, writeJson } from './lib.mjs';
const PORT = +(args.port || 9776);
const srv = await serve(PROTO, PORT);
const s = await launch({ port: PORT, query: 'welcome=0&manual=1', profile: 'm63' });
const TICKS = [1, 56, 120, 226, 293, 346, 400, 451, 538, 551, 604, 650];
const ZOOMS = [13, 13.5, 14, 15, 16];
const rows = [];
try {
  for (const cfg of [{ style: 'map-1863', set: {} }, { style: 'map-1863', set: { 'layout.dMaxPx': 0 } }]) {
    for (const zoom of ZOOMS) {
      const r = await s.page.evaluate(({ cfg, zoom, TICKS }) => {
        const S = window.__studio; const E = S.engine; E.tuning.set('popup.enabled', false); E.tuning.set('compare.mode', 'after'); S.ui.chooseStyle(cfg.style, 'standard');
        E.tuning.set('layout.dMaxPx', 48); for (const [k, v] of Object.entries(cfg.set)) E.tuning.set(k, v);
        const out = [];
        for (const tick of TICKS) {
          E.select(null); E.transport.pause(); E.transport.seek(tick, { glide: false }); E.moveTo({ lat: 39.81592, lng: -77.23677, zoom }, { glide: false, safe: false });
          let f; let last = -1; let still = 0; for (let i = 0; i < 400; i++) { f = S.step(1); if (!E.busy() && f.tiles.length === last) { if (++still >= 4) break; } else still = 0; last = f.tiles.length; }
          const live = f.tiles.filter((t) => t.life === 'live' && t.opacity >= 0.5);
          const leaves = live.filter((t) => t.kind === 'leaf'); const aggs = live.filter((t) => t.kind === 'agg');
          const unitsLeaf = leaves.length; const unitsAgg = aggs.reduce((a, t) => a + t.ids.length, 0);
          const named = aggs.filter((t) => /formation|corps|div|bde|bri/i.test(String(t.nameKind))).reduce((a, t) => a + t.ids.length, 0);
          const kinds = {}; for (const t of aggs) kinds[t.nameKind] = (kinds[t.nameKind] || 0) + t.ids.length;
          const mixed = aggs.filter((t) => t.side === 'mixed').reduce((a, t) => a + t.ids.length, 0);
          out.push({ tick, onField: f.onField && (f.onField.length ?? f.onField), tiles: live.length, leaves: unitsLeaf, aggs: aggs.length, unitsInAgg: unitsAgg, shareAgg: unitsAgg / Math.max(1, unitsAgg + unitsLeaf), kinds, mixedUnits: mixed, maxN: Math.max(0, ...aggs.map((t) => t.ids.length)) });
        }
        return out;
      }, { cfg, zoom, TICKS });
      for (const o of r) rows.push({ style: cfg.style, set: JSON.stringify(cfg.set), zoom, ...o });
      const mean = r.reduce((a, o) => a + o.shareAgg, 0) / r.length; const maxs = Math.max(...r.map((o) => o.shareAgg));
      console.log(cfg.style, JSON.stringify(cfg.set), 'zoom', zoom, 'mean share of units inside counted tiles', (100 * mean).toFixed(1) + '%', 'max', (100 * maxs).toFixed(1) + '%', 'tiles mean', (r.reduce((a, o) => a + o.tiles, 0) / r.length).toFixed(0), 'units mean', (r.reduce((a, o) => a + o.leaves + o.unitsInAgg, 0) / r.length).toFixed(0));
    }
  }
  writeJson('rev-m63.json', { generated: new Date().toISOString(), ticks: TICKS, zooms: ZOOMS, rows });
} finally { await s.close(); srv.close(); }
