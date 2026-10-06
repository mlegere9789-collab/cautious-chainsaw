// layout-lab/hotspots.mjs - E3: the three densest hotspots (physical density, rule A) and what every strategy does there.
//   node docs/pitch/anim/layout-lab/hotspots.mjs [--find]      --find recomputes the ranking (all 675 ticks) before running
// Outputs: out/e3.json (metrics per hotspot x zoom x strategy, global and for a 1440x900 viewport centred on the hotspot) and out/figs/*.png
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, visibleAt, project, metresPerPx } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { makeStrategy } from './lib/strategies.mjs';
import { frameLeaves, measure } from './lib/metrics.mjs';
import { worldOrigin, mpp } from './lib/tiles.mjs';
import { renderSvg, renderLegacySvg } from './lib/render.mjs';
import { legacyLayout, legacyOverlaps, legacyOrder } from './lib/legacy.mjs';
import { svgsToPng } from './shot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const OUT = path.join(HERE, 'out'); const FIGS = path.join(OUT, 'figs'); fs.mkdirSync(FIGS, { recursive: true });
const all = loadAll(); const spec = SPECS.standard;

// ---- 1. hotspot ranking: units within R metres of a unit, per tick, rule A (zoom independent) ------------------------------------------
function findHotspots() {
  const R = 120; const mp = metresPerPx(39.82, 17); const rows = [];
  for (let tau = 1; tau <= 675; tau++) {
    const vis = visibleAt(all, tau); const pts = vis.map(({ u, st }) => { const [x, y] = project(st.lng, st.lat, 17); return [x * mp, y * mp, u.id, st]; });
    const g = new Map(); pts.forEach((p, i) => { const k = Math.floor(p[0] / R) + ',' + Math.floor(p[1] / R); (g.get(k) || g.set(k, []).get(k)).push(i); });
    let best = 0; let bi = -1;
    for (let i = 0; i < pts.length; i++) { const cx = Math.floor(pts[i][0] / R); const cy = Math.floor(pts[i][1] / R); let c = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const a = g.get((cx + dx) + ',' + (cy + dy)); if (!a) continue; for (const j of a) if (Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]) <= R) c++; } if (c > best) { best = c; bi = i; } }
    rows.push({ tick: tau, visible: vis.length, within120m: best, lat: pts[bi][3].lat, lng: pts[bi][3].lng, seed: pts[bi][2] });
  }
  return rows;
}
let ranking = null;
if (process.argv.includes('--find')) { ranking = findHotspots(); fs.writeFileSync(path.join(OUT, 'hotspot-ranking.json'), JSON.stringify(ranking)); }

export const HOTSPOTS = [
  { id: 'H1', tick: 346, lat: 39.8189, lng: -77.2262, note: 'Cemetery Hill / Evergreen Cemetery, Day 2 evening' },
  { id: 'H2', tick: 293, lat: 39.7994, lng: -77.2417, note: 'Rose Woods / Plum Run, Day 2 afternoon' },
  { id: 'H3', tick: 556, lat: 39.8117, lng: -77.2347, note: 'Copse of Trees / the Angle, Day 3' },
];
// terrain.json key locations, only to NAME the place (a label, not a claim: placements sit in a different frame than the served key locations)
const terrain = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'baseline', 'dist', 'data', 'terrain.json'), 'utf8'));
const nearest = (lat, lng) => { let best = null; for (const k of terrain.key_locations) { const d = Math.hypot((k.lat - lat) * 111195, (k.lng - lng) * 111195 * Math.cos(lat * Math.PI / 180)); if (!best || d < best.d) best = { name: k.name, d: Math.round(d) }; } return best; };

const STRATS = ['raw', 'disclose', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid'];
const W = 1440; const H = 900;                                    // the desktop viewport used for "what is on screen"
const e3 = { generated: new Date().toISOString(), hotspots: [] }; const jobs = [];
for (const h of HOTSPOTS) {
  const near = nearest(h.lat, h.lng);
  const rec = { ...h, nearestKeyLocation: near, rules: {} };
  for (const rule of ['A', 'B', 'C']) {
    const tickR = h.tick; rec.rules[rule] = {};
    for (const z of [12, 13, 14, 15, 16]) {
      const { leaves, vis } = frameLeaves(all, tickR, z, spec, { rule, window: rule === 'C' ? 24 : null });
      const [ox, oy] = worldOrigin(z); const [cx, cy] = project(h.lng, h.lat, z); const view = { x0: cx - ox - W / 2, y0: cy - oy - H / 2, w: W, h: H };
      const inV = (r) => r.x1 > view.x0 && r.x0 < view.x0 + W && r.y1 > view.y0 && r.y0 < view.y0 + H;
      const cell = { visible: leaves.length, visibleInViewport: leaves.filter((t) => t.ax > view.x0 && t.ax < view.x0 + W && t.ay > view.y0 && t.ay < view.y0 + H).length, strategies: {} };
      // legacy
      { const rank = legacyOrder(all);
        const lv = visibleAt(all, tickR, { mode: 'hold', rule, window: rule === 'C' ? 24 : null }); lv.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id)); const L = legacyLayout(lv, z); const ov = legacyOverlaps(L);
        const inView = L.pe.map((p, i) => ({ p, g: L.glyphs[i] })).filter(({ g }) => g.cx > view.x0 && g.cx < view.x0 + W && g.cy > view.y0 && g.cy < view.y0 + H);
        cell.strategies.legacy = { overlapPairs: ov['glyph+glyph'] + ov['glyph+label'] + ov['label+label'], byKind: ov, maxDispPx: Math.max(0, ...L.disp), maxDispM: Math.max(0, ...L.disp) * mpp(z), unitsInViewport: inView.length };
        if (rule === 'A' && [13, 14, 15].includes(z)) jobs.push({ svg: renderLegacySvg(L, { x0: view.x0 + W / 2 - 380, y0: view.y0 + H / 2 - 220, w: 760, h: 440 }, { title: `as shipped (legacy canvas port) - ${h.id} tick ${tickR} z${z}` }), out: path.join(FIGS, `${h.id}-legacy-z${z}.png`), width: 760, height: 440 }); }
      for (const s of STRATS) {
        const strat = makeStrategy(s, all, spec); const res = strat.step(leaves, { z, dt: 1, static: true }); const m = measure(res, leaves, z, spec);
        const placedInView = res.placed.filter((p) => inV(p.chip));
        cell.strategies[s] = { tiles: m.tiles, tilesInViewport: placedInView.length, aggTiles: m.aggTiles, aggTilesInViewport: placedInView.filter((p) => p.t.kind === 'agg').length, unitsInAggs: m.unitsInAggs, maxAggN: m.maxAggN, aggFormationShare: m.aggFormationShare,
          overlaps: m.overlaps, overlapsChipChip: m.overlapsChipChip, tilesInOverlap: m.tilesInOverlap, hiddenUnits: m.dropped, displacedTiles: m.displacedTiles, maxDispPx: m.maxDispPx, maxDispM: m.maxDispM, p95DispPx: m.p95DispPx, labelFrac: m.labelFrac, leaderCrossings: m.leaderCrossings, maxAggSpreadPx: m.maxAggSpreadPx, maxAggSpreadM: m.maxAggSpreadM, aggSpreadP50Px: m.aggSpreadP50Px, aggSpreadP95Px: m.aggSpreadP95Px, aggsSpreadOver2Chips: m.aggsSpreadOver2Chips, aggUnitsContact: m.aggUnitsContact, aggUnitsLead: m.aggUnitsLead, aggUnitsFormation: m.aggUnitsFormation, rounds: m.rounds, ms: m.ms, rosters: res.rosters ? res.rosters.length : 0 };
        if (rule === 'A' && [13, 14, 15].includes(z) && ['raw', 'hybrid', 'aggregate', 'displace', 'fanout', 'disclose'].includes(s)) jobs.push({ svg: renderSvg(res, { x0: view.x0 + W / 2 - 380, y0: view.y0 + H / 2 - 220, w: 760, h: 440 }, { spec, title: `${s} - ${h.id} tick ${tickR} z${z}`, marks: !['hybrid', 'aggregate'].includes(s), hulls: true }), out: path.join(FIGS, `${h.id}-${s}-z${z}.png`), width: 760, height: 440 });
      }
      rec.rules[rule][z] = cell;
    }
  }
  e3.hotspots.push(rec); console.log(h.id, 'done', JSON.stringify(near));
}
if (ranking) e3.ranking = ranking.sort((a, b) => b.within120m - a.within120m).slice(0, 12);
fs.writeFileSync(path.join(OUT, 'e3.json'), JSON.stringify(e3, null, 1));
await svgsToPng(jobs);
console.log('wrote out/e3.json and', jobs.length, 'figures');
