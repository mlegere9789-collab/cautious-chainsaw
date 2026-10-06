// layout-lab/e1-worker.mjs - E1: every strategy x one zoom x all 675 ticks, cold start per tick (static), real data.
// Run through measure.mjs (worker_threads); can also be run directly:  node e1-worker.mjs <zoom> [specName]
import { parentPort, workerData, isMainThread } from 'node:worker_threads';
import { loadAll } from './lib/data.mjs';
import { visibleAt } from './lib/data.mjs';
import { SPECS } from './lib/spec.mjs';
import { makeStrategy } from './lib/strategies.mjs';
import { frameLeaves, measure, pct } from './lib/metrics.mjs';
import { legacyLayout, legacyOverlaps } from './lib/legacy.mjs';
import { mpp } from './lib/tiles.mjs';

export function e1(z, { specName = 'standard', strategies = ['raw', 'disclose', 'displace', 'aggregate', 'fanout', 'hybrid'], ticks = null, opts = {}, window = null, legacy = true } = {}) {
  const all = loadAll(); const spec = SPECS[specName];
  const T = ticks || Array.from({ length: 675 }, (_, i) => i + 1);
  const series = {}; const worst = {};
  const keys = ['visible', 'tiles', 'leafTiles', 'aggTiles', 'unitsInAggs', 'overlaps', 'clearanceViolations', 'dropped', 'unrepresented', 'displacedTiles', 'maxDispPx', 'p95DispPx', 'maxAggSpreadPx', 'labelFrac', 'leaderCrossings', 'rounds', 'ms'];
  for (const s of strategies) { series[s] = {}; for (const k of keys) series[s][k] = new Float64Array(T.length); }
  const legacySeries = { glyphGlyph: new Float64Array(T.length), glyphLabel: new Float64Array(T.length), labelLabel: new Float64Array(T.length), maxDispPx: new Float64Array(T.length), pairsDisplaced: new Float64Array(T.length), ms: new Float64Array(T.length), visible: new Float64Array(T.length) };
  const order = [...all.units.values()].sort((a, b) => a.kfs[0].tick - b.kfs[0].tick).map((u) => u.id); const rank = new Map(order.map((id, i) => [id, i]));
  T.forEach((tau, ti) => {
    const { leaves } = frameLeaves(all, tau, z, spec, { window });
    for (const s of strategies) {
      const strat = makeStrategy(s, all, spec, opts[s] || null);
      const res = strat.step(leaves, { z, dt: 1, static: true });
      const m = measure(res, leaves, z, spec);
      for (const k of keys) series[s][k][ti] = m[k];
    }
    if (legacy) {
      const vis = visibleAt(all, tau, { mode: 'hold', window }); vis.sort((a, b) => rank.get(a.u.id) - rank.get(b.u.id));
      const t0 = performance.now(); const L = legacyLayout(vis, z); const ms = performance.now() - t0; const ov = legacyOverlaps(L);
      legacySeries.glyphGlyph[ti] = ov['glyph+glyph']; legacySeries.glyphLabel[ti] = ov['glyph+label']; legacySeries.labelLabel[ti] = ov['label+label'];
      legacySeries.maxDispPx[ti] = Math.max(0, ...L.disp); legacySeries.pairsDisplaced[ti] = L.disp.filter((d) => d >= 3).length; legacySeries.ms[ti] = ms; legacySeries.visible[ti] = vis.length;
    }
  });
  const sum = (a) => { const x = Array.from(a); const n = x.length; let mx = -1e18; let am = 0; let tot = 0; x.forEach((v, i) => { tot += v; if (v > mx) { mx = v; am = i; } }); return { max: mx, argmaxTick: T[am], mean: tot / n, p50: pct(x, 0.5), p95: pct(x, 0.95), p99: pct(x, 0.99), sum: tot }; };
  const out = { z, metresPerPx: mpp(z), spec: specName, ticks: T.length, strategies: {}, legacy: null };
  for (const s of strategies) { out.strategies[s] = {}; for (const k of keys) out.strategies[s][k] = sum(series[s][k]); }
  if (legacy) { out.legacy = {}; for (const k of Object.keys(legacySeries)) out.legacy[k] = sum(legacySeries[k]); out.legacy.overlapsTotal = sum(Array.from(legacySeries.glyphGlyph, (v, i) => v + legacySeries.glyphLabel[i] + legacySeries.labelLabel[i])); }
  return { out, series, legacySeries, T };
}

if (!isMainThread && workerData && workerData.e1) {
  const { z, specName, strategies, ticks, opts, window, legacy, keepSeries } = workerData;
  const r = e1(z, { specName, strategies, ticks, opts, window, legacy });
  const pack = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.from(v)]));
  parentPort.postMessage({ out: r.out, series: keepSeries ? Object.fromEntries(Object.entries(r.series).map(([s, o]) => [s, pack(o)])) : null, legacySeries: keepSeries ? pack(r.legacySeries) : null });
}
