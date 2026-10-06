// layout-lab/lib/metrics.mjs - everything that is measured about a solved frame, computed from the solver's OUTPUT only.
import { verifyFrame } from './geom.mjs';
import { visibleAt } from './data-core.mjs';
import { buildLeaves, mpp } from './tiles.mjs';

export function frameLeaves(all, tau, z, spec, opts = {}) {
  const vis = visibleAt(all, tau, opts);
  return { vis, leaves: buildLeaves(vis, z, spec, opts.selectedId || null) };
}

const pct = (arr, p) => { if (!arr.length) return 0; const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * (a.length - 1) + 0.5))]; };

function segX(a, b, c, d) { // proper intersection of segments ab and cd
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(a, b, c); const d2 = o(a, b, d); const d3 = o(c, d, a); const d4 = o(c, d, b);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** metrics of one solved frame.  nVisible = number of units on the field (the units that MUST be represented). */
export function measure(res, leaves, z, spec) {
  const v = verifyFrame(res.items, spec.gap - 1e-6, true);
  const owners = new Set(); for (const [i, j] of v.pairs) { owners.add(res.items[i].owner); owners.add(res.items[j].owner); }
  const nVisible = leaves.length;
  const repIds = new Map(); let dup = 0;
  for (const p of res.placed) for (const id of p.t.ids) { if (repIds.has(id)) dup++; repIds.set(id, p.t.key); }
  const unrepresented = nVisible - repIds.size;      // units neither drawn nor counted in an aggregate (hidden)
  const m = mpp(z);
  const leafDisp = []; const aggSpread = []; let displaced = 0; let leaders = [];
  let aggs = 0; let aggMembers = 0; let aggMembers2 = 0; let maxAggN = 0; const byKind = { formation: 0, lead: 0, contact: 0 }; let sameFormationUnits = 0;
  for (const p of res.placed) {
    if (p.t.kind === 'leaf') {
      const d = Math.hypot(p.off.ox, p.off.oy);
      if (d > 1.5) { displaced++; leafDisp.push(d); leaders.push([[p.t.ax, p.t.ay], [p.cx, p.cy]]); }
    } else {
      aggs++; aggMembers += p.t.n; maxAggN = Math.max(maxAggN, p.t.n); if (p.t.nameKind === 'lead') byKind.lead += p.t.n; else if (p.t.nameKind === 'contact') byKind.contact += p.t.n; else { byKind.formation += p.t.n; sameFormationUnits += p.t.n; }
      let sp = 0; for (const mem of p.t.members) { const stack = [mem]; while (stack.length) { const q = stack.pop(); if (q.members) { stack.push(...q.members); } else sp = Math.max(sp, Math.hypot(q.ax - p.cx, q.ay - p.cy)); } }
      aggSpread.push(sp); if (p.t.n >= 2) aggMembers2 += 1;
    }
  }
  let crossings = 0;
  for (let i = 0; i < leaders.length; i++) for (let j = i + 1; j < leaders.length; j++) if (segX(leaders[i][0], leaders[i][1], leaders[j][0], leaders[j][1])) crossings++;
  const leafTiles = res.placed.filter((p) => p.t.kind === 'leaf');
  const withLabel = leafTiles.filter((p) => p.label).length;
  return {
    visible: nVisible, aggUnitsFormation: byKind.formation, aggUnitsLead: byKind.lead, aggUnitsContact: byKind.contact, aggFormationShare: aggMembers ? sameFormationUnits / aggMembers : 1, tiles: res.placed.length, leafTiles: leafTiles.length, aggTiles: aggs, unitsInAggs: aggMembers, maxAggN,
    dropped: res.dropped.reduce((s, t) => s + t.n, 0), unrepresented, duplicated: dup,
    overlaps: v.overlaps, overlapsChipChip: v.byKind['chip+chip'] || 0, tilesInOverlap: owners.size, clearanceViolations: v.clearanceViolations, overlapsByKind: v.byKind,
    displacedTiles: displaced, maxDispPx: leafDisp.length ? Math.max(...leafDisp) : 0, p95DispPx: pct(leafDisp, 0.95), meanDispPx: leafDisp.length ? leafDisp.reduce((a, b) => a + b, 0) / leafDisp.length : 0,
    maxDispM: (leafDisp.length ? Math.max(...leafDisp) : 0) * m,
    aggSpreadP50Px: pct(aggSpread, 0.5), aggSpreadP95Px: pct(aggSpread, 0.95), aggsSpreadOver2Chips: aggSpread.filter((v) => v > 2 * (spec.chipH + 40)).length,
    maxAggSpreadPx: aggSpread.length ? Math.max(...aggSpread) : 0, maxAggSpreadM: (aggSpread.length ? Math.max(...aggSpread) : 0) * m,
    leafWithLabel: withLabel, labelFrac: leafTiles.length ? withLabel / leafTiles.length : 0, leaderCrossings: crossings, rounds: res.rounds, ms: res.ms,
  };
}

export { pct };
