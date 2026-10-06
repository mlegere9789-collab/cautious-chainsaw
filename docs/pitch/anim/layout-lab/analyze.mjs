// layout-lab/analyze.mjs - prints the tables used in 06-layout.md from out/*.json (so every table in the document can be regenerated and checked).
//   node docs/pitch/anim/layout-lab/analyze.mjs e1 [A|B|C]     node ... e2     node ... e4     node ... e3
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)); const rd = (n) => JSON.parse(fs.readFileSync(path.join(HERE, 'out', n), 'utf8'));
const [cmd, arg] = process.argv.slice(2);
const f = (x, d = 0) => (x == null || Number.isNaN(x) ? '-' : Number(x).toFixed(d));
const Z = [11, 12, 13, 14, 15, 16, 17];

if (cmd === 'e1') {
  const e = rd('e1.json'); const rule = arg || 'A'; const R = e.rules[rule];
  const row = (label, fn) => console.log('| ' + label + ' | ' + Z.map((z) => fn(R[z], z)).join(' | ') + ' |');
  console.log(`\n## rule ${rule}: ${R[11].ticks} ticks, zooms 11-17 (static, cold start per tick)\n`);
  console.log('| | ' + Z.map((z) => 'z' + z + ' (' + R[z].metresPerPx.toFixed(1) + ' m/px)').join(' | ') + ' |'); console.log('|---|' + Z.map(() => '---').join('|') + '|');
  row('units on the field p50 / max', (r) => `${f(r.strategies.raw.visible.p50)} / ${f(r.strategies.raw.visible.max)}`);
  row('SHIPPED legacy: overlapping pairs p50 / max', (r) => `${f(r.legacy.overlapsTotal.p50)} / ${f(r.legacy.overlapsTotal.max)}`);
  row('SHIPPED legacy: max displacement px (p50 / max)', (r) => `${f(r.legacy.maxDispPx.p50)} / ${f(r.legacy.maxDispPx.max)}`);
  row('raw new chips: overlapping chip pairs p50 / max', (r) => `${f(r.strategies.raw.overlapsChipChip.p50)} / ${f(r.strategies.raw.overlapsChipChip.max)}`);
  row('raw new chips: tiles in an overlap p50 / max', (r) => `${f(r.strategies.raw.tilesInOverlap.p50)} / ${f(r.strategies.raw.tilesInOverlap.max)}`);
  for (const s of ['disclose', 'displace', 'aggregate', 'aggregateTier', 'fanout', 'hybrid']) {
    console.log(`\n### ${s}`);
    row('overlap pairs max (sum over ticks)', (r) => `${f(r.strategies[s].overlaps.max)} (${f(r.strategies[s].overlaps.sum)})`);
    row('chip-chip overlap pairs max', (r) => f(r.strategies[s].overlapsChipChip.max));
    row('units hidden (not represented) p50 / max', (r) => `${f(r.strategies[s].dropped.p50)} / ${f(r.strategies[s].dropped.max)}`);
    row('tiles p50 / max', (r) => `${f(r.strategies[s].tiles.p50)} / ${f(r.strategies[s].tiles.max)}`);
    row('units inside aggregates p50 / max (of visible)', (r) => `${f(r.strategies[s].unitsInAggs.p50)} / ${f(r.strategies[s].unitsInAggs.max)}`);
    row('max displacement px (max over ticks) = metres', (r, z) => `${f(r.strategies[s].maxDispPx.max)} px = ${f(r.strategies[s].maxDispPx.max * r.metresPerPx)} m`);
    row('p95 displacement px of displaced tiles (p50 / max)', (r) => `${f(r.strategies[s].p95DispPx.p50)} / ${f(r.strategies[s].p95DispPx.max)}`);
    row('labels shown % of leaf tiles (mean)', (r) => f(r.strategies[s].labelFrac.mean * 100));
    row('max aggregate spread px = m (max)', (r) => `${f(r.strategies[s].maxAggSpreadPx.max)} px = ${f(r.strategies[s].maxAggSpreadPx.max * r.metresPerPx)} m`);
    row('leader crossings p50 / max', (r) => `${f(r.strategies[s].leaderCrossings.p50)} / ${f(r.strategies[s].leaderCrossings.max)}`);
    row('solve ms cold p50 / p95 / max (contended, 6 workers)', (r) => `${f(r.strategies[s].ms.p50, 1)} / ${f(r.strategies[s].ms.p95, 1)} / ${f(r.strategies[s].ms.max, 0)}`);
    row('rounds p50 / max', (r) => `${f(r.strategies[s].rounds.p50)} / ${f(r.strategies[s].rounds.max)}`);
  }
}
if (cmd === 'e2') {
  const e = rd('e2.json');
  const by = {}; for (const r of e.runs) (by[`${r.h} z${r.z} ${r.speed}`] ||= {})[r.variant] = r.acc;
  const keys = Object.keys(by);
  for (const k of keys) { console.log('\n' + k); for (const [v, a] of Object.entries(by[k])) console.log('  ' + v.padEnd(24), `tiles ${f(a.avgTiles)}/${f(a.avgVisible)} ov ${a.overlapPairsTotal} (frames ${a.framesWithOverlap}) unrep ${a.unrepresentedTotal} drop ${a.droppedTotal} | churn/s ${f(a.tileChurnPerSec, 1)} label/s ${f(a.labelTogglesPerSec, 1)} slot/s ${f(a.slotChangesPerSec, 1)} | pops/s ${f(a.popsPerSec, 1)} jerk p95 ${f(a.jerkP95, 3)} p99 ${f(a.jerkP99, 3)} max ${f(a.jerkMax, 0)} >1px ${f(a.jerkShareOver1px * 100, 2)}% | ms ${f(a.msMean, 1)}/${f(a.msP95, 1)}/${f(a.msMax, 0)}`); }
}
if (cmd === 'e4') {
  const e = rd('e4.json');
  for (const dial of [...new Set(e.runs.map((r) => r.dial))]) { console.log('\n' + dial); for (const r of e.runs.filter((x) => x.dial === dial)) { const s = r.summary; console.log('  ' + String(r.value).padEnd(10), 'z' + r.z, `tiles p50 ${f(s.tiles.p50)} agg p50 ${f(s.aggTiles.p50)} unitsInAgg p50 ${f(s.unitsInAggs.p50)} vis p50 ${f(s.visible.p50)} hidden ${f(s.dropped.max)} ov ${f(s.overlaps.max)} maxDisp ${f(s.maxDispPx.max)} p95D ${f(s.p95DispPx.p50)} labels ${f(s.labelFrac.mean * 100)}% formationShare ${f(s.aggFormationShare.mean * 100)}% ms p50 ${f(s.ms.p50, 1)}`); } }
}
if (cmd === 'e3') {
  const e = rd('e3.json');
  for (const h of e.hotspots) { console.log(`\n${h.id} tick ${h.tick} ${h.note} (nearest key location ${JSON.stringify(h.nearestKeyLocation)})`);
    for (const rule of ['A', 'B', 'C']) for (const z of [13, 14, 15]) { const c = h.rules[rule][z]; console.log(` rule ${rule} z${z}: visible ${c.visible} inViewport ${c.visibleInViewport} | legacy overlaps ${c.strategies.legacy.overlapPairs} | ` + ['raw', 'displace', 'aggregate', 'fanout', 'hybrid'].map((s) => { const x = c.strategies[s]; return `${s}: tiles ${x.tiles} (vp ${x.tilesInViewport}) ov ${x.overlaps} hidden ${x.hiddenUnits} agg ${x.aggTiles}/${x.unitsInAggs}u maxD ${f(x.maxDispPx)}`; }).join(' | ')); } }
}
