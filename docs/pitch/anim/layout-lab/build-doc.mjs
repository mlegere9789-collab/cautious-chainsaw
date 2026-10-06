// layout-lab/build-doc.mjs - docs-as-code: builds docs/pitch/anim/06-layout.md from doc/06-layout.template.md and the merged results, so no number in the
// document is typed by hand.   Markers in the template:
//     {{v path|fmt}}       a number from layout-results.json (fmt: i = integer with thousands separators, d1/d2 = decimals, p0/p1 = percent of a 0..1 value, raw)
//     {{table name}}       a table generated below
//   node docs/pitch/anim/layout-lab/build-doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const DATA = path.join(HERE, '..', 'data');
const R = JSON.parse(fs.readFileSync(path.join(DATA, 'layout-results.json'), 'utf8'));
const tpl = fs.readFileSync(path.join(HERE, 'doc', '06-layout.template.md'), 'utf8');
const Z = [11, 12, 13, 14, 15, 16, 17];

// ---- formatting ---------------------------------------------------------------------------------------------------------------------------------
const thousands = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function fmt(x, f = 'raw') {
  if (x == null || Number.isNaN(x)) return 'n/a';
  switch (f) { case 'i': return thousands(x); case 'd1': return Number(x).toFixed(1); case 'd2': return Number(x).toFixed(2); case 'd3': return Number(x).toFixed(3); case 'p0': return (x * 100).toFixed(0) + '%'; case 'p1': return (x * 100).toFixed(1) + '%'; default: return String(x); }
}
const mpp = (z) => 40075016.686 * Math.cos(39.8206 * Math.PI / 180) / (512 * 2 ** z);
const get1 = (p) => { p = p.trim(); if (/^-?[\d.]+$/.test(p)) return Number(p); if (p.startsWith('mpp.')) return mpp(Number(p.slice(4))); return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), R); };
const get = (expr) => { const parts = expr.split('*'); let v = 1; for (const part of parts) { const x = get1(part); if (x === undefined) return undefined; v *= x; } return v; };
const md = (head, rows, align) => ['| ' + head.join(' | ') + ' |', '|' + head.map((_, i) => (align && align[i] === 'l' ? ':---' : '---:')).join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n');
const E1 = (rule, z, s, k) => R.e1.rules[rule][z].strategies[s][k];
const LG = (rule, z, k) => R.e1.rules[rule][z].legacy[k];
const q = (o, a = 'p50', b = 'max', f = 'i') => `${fmt(o[a], f)} / ${fmt(o[b], f)}`;
const zhead = (z) => `z${z}`;

// ---- tables -------------------------------------------------------------------------------------------------------------------------------------------
const T = {};
T.visibility = () => md(['visibility rule', 'what is drawn', 'units on the field: max (tick) / typical'], [
  ['A carry-forward (what production draws)', 'every unit with a keyframe up to the tick, at its last / interpolated position, forever', `${fmt(R.data.visibleUnits.A.max, 'i')} (${R.data.visibleUnits.A.atTick}) / ${fmt(R.data.visibleUnits.A.median, 'i')}`],
  ['B latest keyframe snapshot', 'only the units recorded at the most recent populated tick', `${fmt(R.data.visibleUnits.B.max, 'i')} (${R.data.visibleUnits.B.atTick}) / ${fmt(R.data.visibleUnits.B.median, 'i')}`],
  ['C carry-forward, 24-tick window', 'a unit disappears 24 ticks after its latest keyframe', `${fmt(R.data.visibleUnits.C24.max, 'i')} (${R.data.visibleUnits.C24.atTick}) / ${fmt(R.data.visibleUnits.C24.median, 'i')}`],
], ['l', 'l', 'r']);

T.problem = (rule = 'A') => md(['', ...Z.map((z) => `${zhead(z)}<br>${mpp(z).toFixed(1)} m/px`)], [
  ['**Shipped canvas**: overlapping pairs, typical tick / worst tick', ...Z.map((z) => q(LG(rule, z, 'overlapsTotal')))],
  ['Shipped canvas: largest relaxation move, px (typical / worst)', ...Z.map((z) => q(LG(rule, z, 'maxDispPx')))],
  ['**New tiles at true positions**: overlapping chip pairs, typical / worst', ...Z.map((z) => q(E1(rule, z, 'raw', 'overlapsChipChip')))],
  ['New tiles at true positions: tiles overlapped by another, typical / worst', ...Z.map((z) => q(E1(rule, z, 'raw', 'tilesInOverlap')))],
], ['l']);

T.strategiesA = (zooms = [11, 13, 14, 15, 17], rule = 'A') => {
  const rows = [];
  const label = { disclose: '(d) progressive disclosure only', displace: '(b) constrained displacement only', aggregate: '(a) aggregation, data-driven', aggregateTier: '(a) aggregation, semantic-zoom tiers', fanout: '(c) fixed-slot fan-out rosters', hybrid: '**certified hybrid (a+b+c+d)**' };
  for (const s of ['disclose', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid']) {
    rows.push([label[s], ...zooms.map((z) => { const e = (k) => E1(rule, z, s, k); return `${fmt(e('overlaps').max, 'i')} / ${fmt(e('dropped').p50, 'i')} (${fmt(e('dropped').max, 'i')}) / ${fmt(e('maxDispPx').max, 'i')}`; })]);
  }
  return md(['strategy: **overlap pairs, worst tick** / **units hidden, typical (worst)** / **largest displacement, px**', ...zooms.map((z) => `${zhead(z)}`)], rows, ['l']);
};

T.hybridFull = (rule = 'A') => md(['', ...Z.map((z) => `${zhead(z)}<br>${mpp(z).toFixed(1)} m/px`)], [
  ['units on the field, typical / worst', ...Z.map((z) => q(E1(rule, z, 'hybrid', 'visible')))],
  ['tiles drawn, typical / worst', ...Z.map((z) => q(E1(rule, z, 'hybrid', 'tiles')))],
  ['units inside aggregate tiles, typical / worst', ...Z.map((z) => q(E1(rule, z, 'hybrid', 'unitsInAggs')))],
  ['**overlapping pairs, worst tick**', ...Z.map((z) => fmt(E1(rule, z, 'hybrid', 'overlaps').max, 'i'))],
  ['**units hidden, worst tick**', ...Z.map((z) => fmt(E1(rule, z, 'hybrid', 'dropped').max + E1(rule, z, 'hybrid', 'unrepresented').max, 'i'))],
  ['displaced tiles (typical / worst)', ...Z.map((z) => q(E1(rule, z, 'hybrid', 'displacedTiles')))],
  ['largest displacement: px = metres', ...Z.map((z) => `${fmt(E1(rule, z, 'hybrid', 'maxDispPx').max, 'i')} px = ${fmt(E1(rule, z, 'hybrid', 'maxDispPx').max * mpp(z), 'i')} m`)],
  ['name labels shown, share of leaf tiles', ...Z.map((z) => (z < 12 ? 'off (<z12)' : fmt(E1(rule, z, 'hybrid', 'labelFrac').mean, 'p0')))],
  ['aggregate spread, typical tick: p95 / worst, px', ...Z.map((z) => (E1(rule, z, 'hybrid', 'aggTiles').max ? `${fmt(E1(rule, z, 'hybrid', 'aggSpreadP95Px').p50, 'i')} / ${fmt(E1(rule, z, 'hybrid', 'maxAggSpreadPx').max, 'i')}` : '-'))],
  ['leader crossings, worst tick', ...Z.map((z) => fmt(E1(rule, z, 'hybrid', 'leaderCrossings').max, 'i'))],
], ['l']);

T.rules = () => md(['rule', 'measure', ...[11, 12, 13, 14, 15, 17].map(zhead)], ['A', 'B', 'C'].flatMap((rule) => [
  [rule, 'units on the field typical / worst', ...[11, 12, 13, 14, 15, 17].map((z) => q(E1(rule, z, 'hybrid', 'visible')))],
  ['', 'tiles drawn typical / worst', ...[11, 12, 13, 14, 15, 17].map((z) => q(E1(rule, z, 'hybrid', 'tiles')))],
  ['', 'units in aggregates typical / worst', ...[11, 12, 13, 14, 15, 17].map((z) => q(E1(rule, z, 'hybrid', 'unitsInAggs')))],
  ['', 'overlap pairs worst tick', ...[11, 12, 13, 14, 15, 17].map((z) => fmt(E1(rule, z, 'hybrid', 'overlaps').max, 'i'))],
]), ['l', 'l']);

T.timing = () => {
  if (!R.e5) return '_(timing not yet run)_';
  const rows = Z.map((z) => { const c = R.e5.cold[z]; return [`z${z}`, ...['raw', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid'].map((s) => `${fmt(c[s].p50, 'd1')} / ${fmt(c[s].p95, 'd1')}`)]; });
  return md(['zoom', 'raw', '(b) displace', '(a) aggregate', '(a) tiers', '(c) fan-out', '**hybrid**'], rows, ['l']);
};
T.warm = () => {
  if (!R.e5) return '_(timing not yet run)_';
  const rows = [];
  for (const z of [12, 13, 14, 15]) for (const sp of ['1x', '4x', '16x']) { const w = R.e5.warm[z][sp]; rows.push([`z${z}`, sp, fmt(w.avgVisible, 'i'), fmt(w.avgTiles, 'i'), fmt(w.ms.mean, 'd1'), fmt(w.ms.p95, 'd1'), fmt(w.ms.p99, 'd1'), fmt(w.ms.max, 'i'), fmt(w.framesWithOverlap, 'i')]); }
  return md(['zoom', 'speed', 'units', 'tiles', 'mean ms', 'p95 ms', 'p99 ms', 'max ms', 'frames with overlap'], rows, ['l', 'l']);
};

T.playback = () => {
  if (!R.e2) return '_(playback not yet run)_';
  const variants = [['legacy-shipped', 'shipped renderer, shipped data path (hold + stateless relaxation)'], ['legacy-smooth-data', 'shipped relaxation on smoothly interpolated positions'], ['hybrid-no-hysteresis', 'hybrid without inertia, sticky aggregates or seniority'], ['hybrid', '**certified hybrid**'], ['displace', '(b) displacement only'], ['aggregate', '(a) aggregation only']];
  const rows = [];
  for (const sp of ['1x', '4x', '16x']) for (const [v, name] of variants) {
    const rs = R.e2.runs.filter((r) => r.variant === v && r.speed === sp); if (!rs.length) continue;
    const mean = (k) => rs.reduce((a, r) => a + (r.acc[k] ?? 0), 0) / rs.length; const mx = (k) => Math.max(...rs.map((r) => r.acc[k] ?? 0)); const sum = (k) => rs.reduce((a, r) => a + (r.acc[k] ?? 0), 0);
    const isLegacy = v.startsWith('legacy');
    rows.push([sp, name, fmt(rs.length, 'i'), fmt(sum('overlapPairsTotal') / sum('frames'), 'd1'), fmt(sum('framesWithOverlap'), 'i') + ' of ' + fmt(sum('frames'), 'i'),
      isLegacy ? 'n/a' : fmt(mean('tileChurnPerSec'), 'd1'), fmt(mean('popsPerSec'), 'd1'), fmt(mean('jerkP99'), 'd3'), fmt(mx('jerkMax'), 'i'), fmt(mean('jerkShareOver1px'), 'p2' in {} ? 'raw' : 'p1'), fmt(mean('msMean'), 'd1')]);
  }
  return md(['speed', 'variant', 'runs', 'overlap pairs per frame', 'frames with any overlap', 'tile churn /s', 'pops /s', 'jerk p99 (px/frame^2)', 'jerk max', 'tile-frames with jerk > 1 px', 'solve ms/frame'], rows, ['l', 'l']);
};

T.sens = (dial) => {
  if (!R.e4) return '_(sensitivity not yet run)_';
  const runs = R.e4.runs.filter((r) => r.dial === dial); const vals = [...new Set(runs.map((r) => String(r.value)))]; const zs = [...new Set(runs.map((r) => r.z))].sort((a, b) => a - b);
  const rows = vals.map((v) => [v, ...zs.map((z) => { const r = runs.find((x) => String(x.value) === v && x.z === z); const s = r.summary; return `${fmt(s.tiles.p50, 'i')} t / ${fmt(s.unitsInAggs.p50 / Math.max(1, s.visible.p50), 'p0')} agg / ${fmt(s.maxDispPx.max, 'i')} px / formation ${fmt(s.aggFormationShare.mean, 'p0')}${s.overlaps.max ? ' / **' + fmt(s.overlaps.max, 'i') + ' overlap pairs**' : ''}`; })]);
  return md([dial, ...zs.map((z) => `z${z}: tiles (median tick) / units inside aggregates / largest displacement / share of aggregate units with a formation name`)], rows, ['l']);
};

T.e7 = () => {
  if (!R.e7) return '_(experiments not yet run)_';
  const names = [...new Set(R.e7.rows.map((r) => r.variant))];
  const rows = names.map((n) => { const rs = R.e7.rows.filter((r) => r.variant === n); const mean = (k) => rs.reduce((a, r) => a + r.acc[k], 0) / rs.length; return [n, fmt(mean('avgTiles'), 'i'), fmt(mean('tileChurnPerSec'), 'd1'), fmt(mean('popsPerSec'), 'd1'), fmt(mean('jerkP99'), 'd3'), fmt(Math.max(...rs.map((r) => r.acc.jerkMax)), 'i'), fmt(rs.reduce((a, r) => a + r.acc.overlapPairsTotal, 0), 'i')]; });
  return md(['variant (three 10 s windows at 4x: H1 z13, H2 z13, H3 z14)', 'tiles', 'tile churn /s', 'pops /s', 'jerk p99', 'jerk max', 'overlap pairs'], rows, ['l']);
};

T.e6 = () => {
  if (!R.e6) return '_(stress not yet run)_';
  const rows = R.e6.rows.filter((r) => r.mode === 'hybrid' && [10, 100, 478].includes(r.n)).map((r) => { const d = R.e6.rows.find((x) => x.pattern === r.pattern && x.n === r.n && x.mode === 'displaceOnly'); return [r.pattern, fmt(r.n, 'i'), fmt(r.tiles, 'i'), `${fmt(r.aggTiles, 'i')} (${fmt(r.unitsInAggs, 'i')} units, largest ${r.maxAggN})`, fmt(r.overlaps, 'i'), fmt(r.unrepresented, 'i'), fmt(r.maxDispPx, 'i'), fmt(r.ms, 'i'), fmt(d.hiddenUnits, 'i')]; });
  return md(['pattern', 'tiles in', 'tiles out', 'aggregates', 'overlaps', 'hidden', 'max displacement px', 'ms', 'hidden if displacement only'], rows, ['l']);
};

T.hotspots = () => {
  if (!R.e3) return '_(hotspots not yet run)_';
  const rows = [];
  for (const h of R.e3.hotspots) for (const z of [13, 14, 15]) {
    const c = h.rules.A[z]; const L = c.strategies.legacy; const rw = c.strategies.raw; const hy = c.strategies.hybrid; const dp = c.strategies.displace; const ag = c.strategies.aggregate; const fo = c.strategies.fanout;
    rows.push([`**${h.id}** t${h.tick}`, `z${z}`, fmt(c.visible, 'i') + ` (${fmt(c.visibleInViewport, 'i')} in view)`, fmt(L.overlapPairs, 'i'), fmt(rw.overlapsChipChip, 'i'), `${fmt(dp.overlaps, 'i')} / ${fmt(dp.hiddenUnits, 'i')}`, `${fmt(ag.overlaps, 'i')} / ${fmt(ag.tiles, 'i')}`, `${fmt(fo.overlaps, 'i')} / ${fmt(fo.hiddenUnits, 'i')}`, `**${fmt(hy.overlaps, 'i')}** / ${fmt(hy.hiddenUnits, 'i')} / ${fmt(hy.tiles, 'i')} (${fmt(hy.aggTiles, 'i')} agg, ${fmt(hy.unitsInAggs, 'i')} units) / ${fmt(hy.maxDispPx, 'i')}`]);
  }
  return md(['hotspot', 'zoom', 'units on field', 'shipped: overlap pairs', 'raw: chip pairs overlapping', '(b): overlaps / hidden', '(a): overlaps / tiles', '(c): overlaps / hidden', '**hybrid: overlaps** / hidden / tiles / max displacement px'], rows, ['l', 'l']);
};

T.hotspotRules = () => {
  if (!R.e3) return '_(hotspots not yet run)_';
  const rows = [];
  for (const h of R.e3.hotspots) for (const rule of ['A', 'B', 'C']) { const c = h.rules[rule][14]; const hy = c.strategies.hybrid; rows.push([`**${h.id}**`, rule, fmt(c.visible, 'i'), fmt(c.strategies.legacy.overlapPairs, 'i'), fmt(c.strategies.raw.overlapsChipChip, 'i'), fmt(hy.overlaps, 'i'), `${fmt(hy.tiles, 'i')} (${fmt(hy.aggTiles, 'i')} agg / ${fmt(hy.unitsInAggs, 'i')} units)`, `${fmt(hy.displacedTiles, 'i')} / ${fmt(hy.maxDispPx, 'i')}`]); }
  return md(['hotspot', 'rule', 'units', 'shipped overlap pairs', 'raw chip pairs', 'hybrid overlaps', 'hybrid tiles', 'displaced tiles / max px'], rows, ['l', 'l']);
};

T.browser = () => {
  const b = R.browser; if (!b) return '_(browser run not yet done)_';
  const rows = b.densest.map((d) => { const bn = b.bench.find((x) => x.z === d.z); return [`z${d.z}`, fmt(d.visible, 'i'), fmt(d.tiles, 'i'), `${fmt(d.aggTiles, 'i')} (${fmt(d.unitsInAggs, 'i')} units)`, fmt(d.overlaps, 'i'), fmt(d.unrepresented + d.duplicated, 'i'), fmt(d.maxDispPx, 'i'), fmt(bn.p50, 'd1'), fmt(bn.p95, 'd1')]; });
  return md(['zoom', 'units', 'tiles', 'aggregates', 'overlaps (page verifier)', 'unrepresented + duplicated', 'max displacement px', 'solve p50 ms (V8)', 'p95 ms'], rows, ['l']);
};
T.browserPlayback = () => {
  const b = R.browser; if (!b) return '_(browser run not yet done)_';
  return md(['window', 'zoom', 'frames', 'overlap pairs', 'frames with overlap', 'unrepresented', 'solve ms mean / p95 / max'], b.playback.map((p) => [`${p.id} from tick ${p.tick0} at 4x`, `z${p.z}`, fmt(p.frames, 'i'), fmt(p.overlapPairs, 'i'), fmt(p.framesWithOverlap, 'i'), fmt(p.unrepresented, 'i'), `${fmt(p.msMean, 'd1')} / ${fmt(p.msP95, 'd1')} / ${fmt(p.msMax, 'i')}`]), ['l']);
};
T.validate = () => {
  const v = R.validateLegacy; if (!v) return '_(validation not yet run)_';
  return md(['scene', 'zoom', 'glyphs drawn by the app in view', 'matched by the port', 'within 0.5 px', 'within 2 px', 'median error px', 'worst error px'], v.results.map((r) => [`tick ${r.tick}`, fmt(r.mapZoom, 'd2'), fmt(r.appGlyphsInView, 'i'), fmt(r.matched, 'i'), fmt(r.within05px, 'i'), fmt(r.within2px, 'i'), fmt(r.errPx.p50, 'd3'), fmt(r.errPx.max, 'd1')]), ['l']);
};
T.selftest = () => { const s = R.selftest; if (!s) return '_(selftest not yet run)_'; return s.checks.map((c) => `- ${c}`).join('\n'); };
T.sideflags = () => md(['id', 'prefix says', 'order of battle / state suffix says'], R.data.sideFlagged.map((f) => [`\`${f.id}\``, f.prefixSide, f.side]), ['l', 'l', 'l']);

// ---- resolve markers ------------------------------------------------------------------------------------------------------------------------------
let out = tpl.replace(/\{\{table ([\w:.-]+)\}\}/g, (m, name) => { const [fn, arg] = name.split(':'); if (!T[fn]) throw new Error('unknown table ' + name); return T[fn](arg); });
out = out.replace(/\{\{v ([^}|]+)(?:\|(\w+))?\}\}/g, (m, p, f) => { const v = get(p.trim()); if (v === undefined) throw new Error('unresolved value ' + p); return fmt(v, f || 'raw'); });
fs.writeFileSync(path.join(HERE, '..', '06-layout.md'), out);
console.log('wrote docs/pitch/anim/06-layout.md', out.length, 'chars', out.split('\n').length, 'lines');
