// layout-lab/merge.mjs - out/*.json -> docs/pitch/anim/data/layout-results.json (+ layout-per-tick.json, layout-tile-spec.json)
//   node docs/pitch/anim/layout-lab/merge.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAll, visibleAt } from './lib/data.mjs';
import { SPECS, TEXT_SOURCE } from './lib/spec.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)); const OUT = path.join(HERE, 'out'); const DATA = path.join(HERE, '..', 'data'); fs.mkdirSync(DATA, { recursive: true });
const rd = (n, soft = false) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, n), 'utf8')); } catch (e) { if (soft) return null; throw e; } };
const all = loadAll();

// ---- the input data, as the lab sees it -----------------------------------------------------------------------------------------------------------------
const counts = { A: [], B: [], C: [] };
for (let t = 1; t <= 675; t++) { counts.A.push(visibleAt(all, t, { rule: 'A' }).length); counts.B.push(visibleAt(all, t, { rule: 'B' }).length); counts.C.push(visibleAt(all, t, { rule: 'C', window: 24 }).length); }
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1]; const argmax = (a) => a.indexOf(Math.max(...a)) + 1;
const tally = (f) => { const m = {}; for (const u of all.units.values()) { const k = f(u); m[k] = (m[k] || 0) + 1; } return m; };
const data = {
  placementRows: all.rows, uniqueUnitTickKeys: all.kept, repeatedRows: all.rows - all.kept, repeatedRowsThatDiffer: all.conflicts.length, units: all.units.size, orderOfBattleNodes: all.nodes.size,
  unitsByKind: tally((u) => u.kind), unitsByArm: tally((u) => u.arm), unitsBySide: tally((u) => u.side), parentSource: tally((u) => u.parentSource),
  sideFlagged: [...all.units.values()].filter((u) => u.sideFlag).map((u) => ({ id: u.id, prefixSide: u.prefixSide, side: u.side, flag: u.sideFlag })),
  visibleUnits: { A: { max: Math.max(...counts.A), atTick: argmax(counts.A), median: med(counts.A) }, B: { max: Math.max(...counts.B), atTick: argmax(counts.B), median: med(counts.B) }, C24: { max: Math.max(...counts.C), atTick: argmax(counts.C), median: med(counts.C) } },
};

const e1 = rd('e1.json'); const e2 = rd('e2.json', true); const e3 = rd('e3.json', true); const e4 = rd('e4.json', true); const e5 = rd('e5.json', true); const e6 = rd('e6.json', true);
const st = rd('selftest.json', true); const browser = rd('browser.json', true); const vl = rd('validate-legacy.json', true); const facts = rd('figs-facts.json', true);

// ---- derived summaries used by the document -------------------------------------------------------------------------------------------------------
const e2meta = e2 ? (() => { const hy = e2.runs.filter((r) => r.variant === 'hybrid'); return { runs: e2.runs.length, frames: e2.runs.reduce((a, r) => a + r.acc.frames, 0), hybridRuns: hy.length, hybridFrames: hy.reduce((a, r) => a + r.acc.frames, 0), hybridOverlapPairs: hy.reduce((a, r) => a + r.acc.overlapPairsTotal, 0), hybridFramesWithOverlap: hy.reduce((a, r) => a + r.acc.framesWithOverlap, 0), hybridUnrepresented: hy.reduce((a, r) => a + r.acc.unrepresentedTotal, 0), hybridClearanceViolations: hy.reduce((a, r) => a + r.acc.clearanceViolations, 0) }; })() : null;
const e2agg = e2 ? Object.fromEntries([['legacyShipped', 'legacy-shipped'], ['legacySmooth', 'legacy-smooth-data'], ['hybrid', 'hybrid'], ['hybridStateless', 'hybrid-no-hysteresis'], ['displace', 'displace'], ['aggregate', 'aggregate'], ['aggregateTier', 'aggregateTier']].map(([k, v]) => { const rs = e2.runs.filter((r) => r.variant === v); const mean = (f) => rs.reduce((a, r) => a + (r.acc[f] ?? 0), 0) / Math.max(1, rs.length); return [k, { runs: rs.length, popsPerSec: mean('popsPerSec'), jerkP99: mean('jerkP99'), jerkP95: mean('jerkP95'), tileChurnPerSec: mean('tileChurnPerSec'), tileChurnPer100TilesPerSec: mean('tileChurnPer100TilesPerSec'), flickerPerSec: mean('flickerPerSec'), msMean: mean('msMean'), avgTiles: mean('avgTiles') }]; })) : null;
if (facts && facts.expansion) facts.expansion.share = facts.expansion.ok / Math.max(1, facts.expansion.total);
const e2by = e2 ? Object.fromEntries(['1x', '4x', '16x'].map((sp) => [sp, Object.fromEntries([['legacyShipped', 'legacy-shipped'], ['legacySmooth', 'legacy-smooth-data'], ['hybrid', 'hybrid'], ['hybridStateless', 'hybrid-no-hysteresis'], ['displace', 'displace'], ['aggregate', 'aggregate'], ['aggregateTier', 'aggregateTier']].map(([k, v]) => { const rs = e2.runs.filter((r) => r.variant === v && r.speed === sp); const mean = (f) => rs.reduce((a, r) => a + (r.acc[f] ?? 0), 0) / Math.max(1, rs.length); const sum = (f) => rs.reduce((a, r) => a + (r.acc[f] ?? 0), 0); return [k, { runs: rs.length, avgTiles: mean('avgTiles'), overlapPairsPerFrame: sum('overlapPairsTotal') / Math.max(1, sum('frames')), framesWithOverlap: sum('framesWithOverlap'), frames: sum('frames'), droppedUnitsPerFrame: sum('droppedTotal') / Math.max(1, sum('frames')), avgVisible: mean('avgVisible'), popsPerSec: mean('popsPerSec'), jerkP99: mean('jerkP99'), jerkMax: Math.max(...rs.map((r) => r.acc.jerkMax)), tileChurnPerSec: mean('tileChurnPerSec'), labelTogglesPerSec: mean('labelTogglesPerSec'), slotChangesPerSec: mean('slotChangesPerSec'), msMean: mean('msMean') }]; }))])) : null;
const e1meta = { zooms: 7, ticks: 675, rules: 3, strategies: 7, hybridSolvesRuleA: 7 * 675, hybridSolves: 3 * 7 * 675, solves: 3 * 7 * 675 * 7 };
const e7 = rd('e7.json', true);
// stacks: tiles on an identical coordinate (hold model = what the shipped data path draws and what the sibling page counts)
data.stacks = {};
for (const rule of ['A', 'B']) { let mx = 0; let at = 0; let big = 0; const shares = []; for (let t = 1; t <= 675; t++) { const m = new Map(); for (const { st: s2 } of visibleAt(all, t, { rule, mode: 'hold' })) { const k = s2.lat.toFixed(6) + ',' + s2.lng.toFixed(6); m.set(k, (m.get(k) || 0) + 1); } let sh = 0; for (const c of m.values()) { if (c > 1) sh += c; big = Math.max(big, c); } shares.push(sh); if (sh > mx) { mx = sh; at = t; } } shares.sort((a, b) => a - b); data.stacks[rule] = { max: mx, atTick: at, median: shares[337], largestStack: big }; }
// the hybrid's headline over ALL zooms, per rule
const e1agg = {}; for (const rule of ['A', 'B', 'C']) { const zs = Object.values(e1.rules[rule]); const mx = (s, k) => Math.max(...zs.map((r) => r.strategies[s][k].max)); e1agg[rule] = { hybridOverlapsMax: mx('hybrid', 'overlaps'), hybridDroppedMax: mx('hybrid', 'dropped'), hybridUnrepresentedMax: mx('hybrid', 'unrepresented'), hybridClearanceMax: mx('hybrid', 'clearanceViolations'), hybridMaxDispPx: mx('hybrid', 'maxDispPx'), solves: 675 * zs.length, discloseOverlapsMax: mx('disclose', 'overlaps'), legacyOverlapsMax: Math.max(...zs.map((r) => r.legacy.overlapsTotal.max)) }; }
const e4s = {}; if (e4) for (const r of e4.runs) { ((e4s[r.dial] ||= {})[String(r.value)] ||= {})[r.z] = r.summary; }
const e7s = e7 ? (() => { const out = {}; for (const r of e7.rows) { const k = r.variant.split(' ')[0] + (r.variant.startsWith('growth') ? 'Growth' : ''); (out[r.variant] ||= []).push(r.acc); } const m = (arr, f) => arr.reduce((a, x) => a + (x[f] ?? 0), 0) / arr.length; const res = {}; for (const [v, arr] of Object.entries(out)) { const key = v.startsWith('easing') ? 'easing' : v.startsWith('lookahead') ? 'lookahead' : v.startsWith('default') ? 'base' : v.startsWith('no seniority') ? 'noSeniority' : v.startsWith('growth') ? 'growth' : v.startsWith('escalated') ? 'escalated' : 'tiers'; res[key] = { pops: m(arr, 'popsPerSec'), churn: m(arr, 'tileChurnPerSec'), jerkP99: m(arr, 'jerkP99'), easedShare: m(arr, 'smoothEasedShare'), snapBackShare: m(arr, 'smoothSnapShare'), changedTilesPerFrame: m(arr, 'changedTilesPerFrame'), snappedBackPerFrame: m(arr, 'snappedBackPerFrame') }; } return res; })() : null;
let textCheck = null; try { textCheck = JSON.parse(fs.readFileSync(path.join(OUT, 'text-widths.json'), 'utf8')).check; } catch { /* optional */ }
const results = {
  generated: new Date().toISOString(), node: process.version, machine: { cpu: os.cpus()[0].model, cores: os.cpus().length, platform: process.platform }, textWidths: TEXT_SOURCE(),
  note: 'Every number is produced by the scripts in docs/pitch/anim/layout-lab; see 06-layout.md for definitions. Solve times in e1 are measured with 6 workers running at once (contended): use e5 for time claims.',
  definitions: {
    overlap: 'two items of different tiles whose rectangles have a Euclidean clearance < 0 (interiors intersect); items = chip, name label, true-position pin (only for displaced tiles); pin-pin pairs are exempt',
    clearanceViolation: 'clearance < 2 px (the design gap) but >= 0',
    hiddenUnit: 'a unit on the field that is neither drawn as a tile nor counted inside an aggregate tile',
    displacement: 'distance from a leaf tile centre to the true position of its unit (px, and metres at the latitude of the field)',
    aggregateSpread: 'largest distance from an aggregate tile centre to the true position of one of its members',
    churn: 'tile keys that appear or disappear between consecutive frames while carrying a unit that was on the field in both frames',
    pop: 'a leaf tile whose rendered centre moves by more than 3 px beyond the motion of its true position in one frame',
    jerk: '|c(f+1) - 2 c(f) + c(f-1)| of the rendered centre, px per frame^2',
  },
  spec: SPECS, data, selftest: st, validateLegacy: vl, browser, e1meta, e1agg, e2meta, e2agg, e2by, e4s, e7s, textCheck, e1: { generated: e1.generated, rules: e1.rules }, e2, e3, e4, e5, e6, e7, figures: facts,
};
fs.writeFileSync(path.join(DATA, 'layout-results.json'), JSON.stringify(results));
fs.writeFileSync(path.join(DATA, 'layout-per-tick.json'), JSON.stringify({ note: 'per-tick series (675 values each, tick 1 first), rule A, hybrid and a few comparison strategies; zoom -> strategy -> metric', perTick: e1.perTick.A }));
const policy = { dMax: 'spec.dMax', note: 'defaults of the recommended pipeline; every dial can be overridden per strategy instance (see lib/strategies.mjs)', cfg: { pinProtect: true, inertia: true, sticky: true, labels: true, seniority: 1e7, kCap: 60, maxSplitTries: 2, aggregate: true, dMax2: null, tier: null, grow: 0 } };
fs.writeFileSync(path.join(DATA, 'layout-tile-spec.json'), JSON.stringify({ specs: SPECS, policy, vitalCore: ['side (hue + frame)', 'arm glyph', 'short name (inside the chip)', 'echelon / aggregate badge', 'strength-state bar', 'selection ring (footprint reserved)', 'true position (the chip itself, or a pin when displaced)'], secondary: ['name label', 'posture mark', 'facing', 'engaged ring', 'numeric strength', 'corps badge', 'leader line', 'member hull'] }, null, 1));
console.log('wrote layout-results.json', (fs.statSync(path.join(DATA, 'layout-results.json')).size / 1e6).toFixed(2) + ' MB;', 'layout-per-tick.json', (fs.statSync(path.join(DATA, 'layout-per-tick.json')).size / 1e3).toFixed(0) + ' KB');
