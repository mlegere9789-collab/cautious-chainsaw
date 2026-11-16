// Node side of the runners of gates Q04, Q05 and Q06 (workstream bt-gates): builds the REAL history layer, the world built from it and the stage exactly as the page does
// (app/tests/history.test.mjs, crowd.test.mjs), and the scenario set S* of GATE-SPEC.md 1.5, so that a runner judges the code the page runs and not a copy of it.
// No network, no clock, no random number: two runs on the same tree give the same dump. Nothing is written except the JSON file named by --out.
//
// A test injects a defect into the REAL code path with `--mutate <file.mjs>`; the module may export
//   mutateRaw(raw)                 the raw inputs of the layer (history/units.json, arrivals.json, ...) before the layer is built
//   mutateLayer(layer)             the layer, before the world is built (it may wrap layer.both / layer.arrivals / layer.events to alter what the layer says)
//   mutateWorld(world, layer)      the world built from the layer, before the stage reads it
//   mutateStage(stage, layer)      the stage, once built
//   afterLoad(stage, scenario, layer)   after every stage.loadScenario (before the scan reads the stage)
// Without --mutate nothing is changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { syncBuiltinESMExports } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = process.env.BT_GATES_ROOT ? path.resolve(process.env.BT_GATES_ROOT) : path.resolve(HERE, '..', '..', '..');
// every file of the repository that the run reads through fs.readFileSync (the data the layer, the world and the loaders of the application read): the python runner hashes each of them into the record (GATE-SPEC 1.6 `inputs`).
// The hook is installed before any application module is imported, and the named exports of `node:fs` are brought in line with it.
const READ_FILES = new Set(), realRead = fs.readFileSync;
fs.readFileSync = function (p, ...rest) {
  try { const f = typeof p === 'string' ? p : p instanceof URL ? fileURLToPath(p) : null; if (f && f.startsWith(ROOT + path.sep) && !f.includes(path.sep + 'node_modules' + path.sep)) READ_FILES.add(f); } catch { /* a path that is not a file */ }
  return realRead.call(this, p, ...rest);
};
syncBuiltinESMExports();
export const inputsRead = () => [...READ_FILES].filter(f => { try { return fs.statSync(f).isFile(); } catch { return false; } }).map(f => path.relative(ROOT, f).split(path.sep).join('/')).sort();
export const BT = path.join(ROOT, 'docs', 'battle-theatre');
export const APP = path.join(BT, 'app');
export const imp = rel => import(pathToFileURL(path.join(APP, rel)).href);

export function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) { const k = t.slice(2); const v = (i + 1 < argv.length && !argv[i + 1].startsWith('--')) ? argv[++i] : true; a[k] = v; } else a._.push(t);
  }
  return a;
}
export async function loadMutation(file) { return file ? await import(pathToFileURL(path.resolve(file)).href) : {}; }
export function writeOut(file, obj) {
  const body = JSON.stringify(obj);
  if (file && file !== true) fs.writeFileSync(file, body); else process.stdout.write(body);
}
export const r6 = x => (x == null || !Number.isFinite(x) ? x : Math.round(x * 1e6) / 1e6);
export const sha = s => crypto.createHash('sha256').update(s).digest('hex');
export const short = s => sha(s).slice(0, 12);
export const readJSON = rel => JSON.parse(fs.readFileSync(path.join(BT, rel), 'utf8'));

// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// the product: raw inputs -> layer -> world -> stage (the application's own pipeline)
export async function buildProduct({ mutate = {}, stage = true } = {}) {
  const { nodeWorld } = await imp('tests/node-world.mjs');                 // installs the fetch shim (file: URLs) that the application's own loaders use
  const { makeGeo } = await imp('src/geo.mjs');
  const { loadRawFromDisk, terrainMeta } = await imp('tools/history-report.mjs');
  const { createRealHistory } = await imp('src/history/real.mjs');
  const { worldFromUnits } = await imp('src/world-from-units.mjs');
  const { loadConflicts } = await imp('src/data.mjs');
  const clock = await imp('src/clock.mjs');
  const raw = loadRawFromDisk();
  if (mutate.mutateRaw) await mutate.mutateRaw(raw);
  const { T } = await nodeWorld();
  const geo = makeGeo(T);
  const helpers = { civilDawn: m => m + 4 * 60 + 3 };
  const layer = createRealHistory({ raw, T: terrainMeta(), helpers });
  if (mutate.mutateLayer) await mutate.mutateLayer(layer);
  const world = worldFromUnits(T, geo, layer);
  if (mutate.mutateWorld) await mutate.mutateWorld(world, layer);
  const conflicts = await loadConflicts();
  const P = { raw, T, geo, layer, world, clock, BATTLE: clock.BATTLE, conflicts, helpers, mutate, ground: { W: T.W / 2, H: T.H / 2 }, box: terrainMeta().meta };
  if (stage) {
    const { Stage } = await imp('src/stage.mjs');
    P.Stage = Stage; P.HIDDEN = (await imp('src/stage.mjs')).HIDDEN;
    P.stage = new Stage({ layer, world, T, geo });
    if (mutate.mutateStage) await mutate.mutateStage(P.stage, layer);
  }
  return P;
}
export function loadScenario(P, sc) {
  const info = P.stage.loadScenario({ id: sc.id, choices: sc.choices, optionText: sc.optionText });
  if (P.mutate.afterLoad) P.mutate.afterLoad(P.stage, sc, P.layer);
  return info;
}
export const outsideGround = (P, x, z) => Math.abs(x) > P.ground.W || Math.abs(z) > P.ground.H;

// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// the scenario set S* (GATE-SPEC 1.5)
//   * the conflicts that reach an arrival or a leg are `layer.meta.linkedConflicts`; the options of each are the ones the page offers (data.mjs loadConflicts + scenario-defaults.mjs: the delegated default, the plan's
//     recommended value, every printed value, every value added from the record, "show every value")
//   * a scenario is what theatre.applyScenario builds: choices[id] = option key, optionText[id] = the option's text, for every linked conflict
//   * interaction groups: conflicts that bear on a common unit (a unit's arrival depends on the conflicts of its own gate and, for a unit with no gate of its own or with a floor gate, on its parent's: the
//     same rule as ArrivalModel.effective; its legs on `stop.conflict`). Units of different groups cannot see each other's conflicts, so the property "presence of unit u" factors over groups: every group is enumerated
//     in full (Cartesian product of its options) with every other conflict on its delegated default
//   * extremal scenarios and both named defaults are always in the set
//   * the factorisation is not taken on trust: the per-unit behaviour (arrival record and events) of EVERY scenario is compared with the default, and a unit that changes without depending on a conflict the scenario varies is reported
const FLOOR_KINDS = new Set(['date_floor', 'event_floor', 'named_period_convention']);        // as arrivals.mjs: a gate of these kinds is lifted to its parent's time

export function conflictOptions(P) {
  const byId = new Map(P.conflicts.map(c => [c.id, c])), out = {};
  for (const id of P.layer.meta.linkedConflicts) {
    const c = byId.get(id);
    out[id] = c ? c.options.map(o => ({ key: o.key, text: String(o.text ?? '') })) : [{ key: 'recommended', text: '' }];
  }
  return out;
}
export function unitDeps(P) {
  const am = P.layer.model, memo = new Map();
  const stopConf = new Map();
  for (const [id, plan] of P.layer.plans) for (const s of plan.stops || []) if (s.conflict) { if (!stopConf.has(id)) stopConf.set(id, new Set()); stopConf.get(id).add(s.conflict); }
  const deps = id => {
    if (memo.has(id)) return memo.get(id);
    const u = am.by.get(id), parent = u && u.parent ? deps(u.parent) : new Set(), own = am.ownGate(id), s = new Set();
    if (!own) for (const c of parent) s.add(c);
    else { for (const c of am.linked.get(id) || []) s.add(c); if (FLOOR_KINDS.has(own.kind)) for (const c of parent) s.add(c); }
    memo.set(id, s); return s;
  };
  const out = new Map();
  for (const u of P.layer.units) { const s = new Set(deps(u.id)); for (const c of stopConf.get(u.id) || []) s.add(c); out.set(u.id, [...s].sort()); }
  return out;
}
export function interactionGroups(P, deps) {
  const ids = P.layer.meta.linkedConflicts.slice().sort(), parent = new Map(ids.map(c => [c, c])), find = x => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)));
  for (const ds of deps.values()) for (let i = 1; i < ds.length; i++) if (parent.has(ds[i]) && parent.has(ds[0])) parent.set(find(ds[i]), find(ds[0]));
  const g = new Map(); for (const c of ids) { const r = find(c); if (!g.has(r)) g.set(r, []); g.get(r).push(c); }
  return [...g.values()].map(cs => cs.sort()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
}
const scenarioOf = (id, opts, pick, meta = {}) => {
  const choices = {}, optionText = {};
  for (const [c, os] of Object.entries(opts)) { const key = pick[c] ?? 'delegated', o = os.find(x => x.key === key) || os[0]; choices[c] = o.key; optionText[c] = o.text; }
  return { id, choices, optionText, ...meta };
};
// every scenario of S*: [{ id, choices, optionText, kind, group, varied }]
export function buildScenarioSet(P, { mode = 'S*' } = {}) {
  const opts = conflictOptions(P), deps = unitDeps(P), groups = interactionGroups(P, deps), seen = new Set(), list = [];
  const add = (sc) => { const k = JSON.stringify([sc.choices, sc.optionText]); if (seen.has(k)) return null; seen.add(k); list.push(sc); return sc; };
  add(scenarioOf('delegated', opts, {}, { kind: 'named', group: null, varied: [], note: 'every conflict on its delegated default (the view the page opens on; reversible by the owner)' }));
  add(scenarioOf('pdf', opts, Object.fromEntries(Object.keys(opts).map(c => [c, 'recommended'])), { kind: 'named', group: null, varied: [], note: "every conflict on the plan's recommended value (PENDING OWNER)" }));
  if (mode === 'default') return { opts, deps, groups, list };
  // extremal scenarios: for each conflict the option that gives the earliest (latest) summed default arrival of the units that depend on it (the layer's own model decides, not a parse of mine)
  const am = P.layer.model, dependents = c => P.layer.units.filter(u => (deps.get(u.id) || []).includes(c)).map(u => u.id);
  const extreme = (sign) => {
    const pick = {};
    for (const c of Object.keys(opts)) {
      const us = dependents(c); let best = null;
      for (const o of opts[c]) {
        const sc = scenarioOf('x', opts, { [c]: o.key }); let sum = 0;
        for (const id of us) { const e = am.effective(id, sc, P.helpers); sum += e ? e.default : 0; }
        if (best == null || sign * sum < sign * best.sum) best = { key: o.key, sum };
      }
      pick[c] = best ? best.key : 'delegated';
    }
    return pick;
  };
  add(scenarioOf('earliest', opts, extreme(1), { kind: 'named', group: null, varied: Object.keys(opts), note: 'every conflict at the option that gives the earliest arrival of the units that depend on it' }));
  add(scenarioOf('latest', opts, extreme(-1), { kind: 'named', group: null, varied: Object.keys(opts), note: 'every conflict at the option that gives the latest arrival of the units that depend on it' }));
  add(scenarioOf('range', opts, Object.fromEntries(Object.keys(opts).map(c => [c, 'range'])), { kind: 'named', group: null, varied: Object.keys(opts), note: 'every conflict on "show every value" (drawn from the earliest printed value)' }));
  groups.forEach((g, gi) => {
    const prod = [{}];
    for (const c of g) { const next = []; for (const p of prod) for (const o of opts[c]) next.push({ ...p, [c]: o.key }); prod.length = 0; prod.push(...next); }
    for (const p of prod) {
      const id = 'G' + (gi + 1) + ':' + g.map(c => c + '=' + p[c]).join(',');
      add(scenarioOf(id, opts, p, { kind: 'group', group: gi + 1, varied: g.slice() }));
    }
  });
  return { opts, deps, groups, list };
}

// the behaviour of one unit in one scenario: its arrival record and its events (a sufficient statistic of everything the page draws for the unit: the stage, the guns, the crews, the train,
// the manifests and the animation read nothing else of the scenario)
export function unitBehaviours(layer, sc) {
  const { arrivals, events } = layer.both({ choices: sc.choices, optionText: sc.optionText });
  const by = new Map(), ev = new Map();
  for (const a of arrivals) by.set(a.unit, [a]);
  for (const e of events) { if (!ev.has(e.unit)) ev.set(e.unit, []); ev.get(e.unit).push(e); }
  const out = new Map();
  for (const u of layer.units) out.set(u.id, short(JSON.stringify([by.get(u.id) || null, ev.get(u.id) || []])));
  return { hashes: out, arrivals, events, arrivalOf: new Map(arrivals.map(a => [a.unit, a])), eventsOf: ev };
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// the time grid (GATE-SPEC 1.5): every integer minute of the window, plus one second either side of every boundary
export function buildGrid(P, { mode = 'dense', boundaries = [], coarseStep = 60 } = {}) {
  const { from, to } = P.BATTLE, set = new Set(), sec = 1 / 60, step = mode === 'dense' ? 1 : coarseStep;
  for (let t = Math.ceil(from); t <= to; t += step) set.add(t);
  set.add(from); set.add(to);
  for (const b of boundaries) if (b != null && Number.isFinite(b)) for (const d of [-sec, 0, sec]) { const t = b + d; if (t >= from && t <= to) set.add(t); }       // exact doubles: a sample AT a boundary must be the boundary (an event at t is in force at t)
  return [...set].sort((a, b) => a - b);
}

export class Runs {                                // presence as maximal runs of consecutive grid samples
  constructor(n) { this.n = n; this.on = new Uint8Array(n); this.a = new Float64Array(n); this.b = new Float64Array(n); this.k = new Int32Array(n); this.runs = Array.from({ length: n }, () => []); }
  put(i, present, t) {
    if (present) { this.k[i]++; if (!this.on[i]) { this.on[i] = 1; this.a[i] = t; } this.b[i] = t; }
    else if (this.on[i]) { this.runs[i].push([this.a[i], this.b[i]]); this.on[i] = 0; }
  }
  done() { for (let i = 0; i < this.n; i++) if (this.on[i]) { this.runs[i].push([this.a[i], this.b[i]]); this.on[i] = 0; } return this; }
  of(i) { return { runs: this.runs[i].map(([a, b]) => [r6(a), r6(b)]), samples: this.k[i] }; }
}

// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// the scenarios of one run, their per-unit behaviours and the check of the factorisation (shared by the runners of Q05 and Q06; the child of Q04 carries its own copy of the same steps)
export function prepareScenarios(P, S, { only = null } = {}) {
  const { layer } = P, U = layer.units;
  let scenarios = S.list;
  if (only) { const w = new Set(String(only).split(',')); scenarios = scenarios.filter(s => w.has(s.id) || s.id === 'delegated'); }
  const behaviours = new Map(), hashDefault = new Map();
  for (const sc of scenarios) { const b = unitBehaviours(layer, sc); behaviours.set(sc.id, b); if (sc.id === 'delegated') for (const [id, h] of b.hashes) hashDefault.set(id, h); }
  const base = scenarios.find(s => s.id === 'delegated');
  const factor = { scenarios: scenarios.length, violations: [], joint: [], checked_units: U.length, rule: 'a unit depends on the conflicts of its own gate, on its parent\'s when its gate is a floor or absent (ArrivalModel.effective), and on stop.conflict for its legs' };
  for (const sc of scenarios) {
    const varied = Object.keys(sc.choices).filter(c => sc.choices[c] !== base.choices[c] || sc.optionText[c] !== base.optionText[c]);
    sc.varied_vs_default = varied;
    const b = behaviours.get(sc.id), changed = [];
    for (const u of U) if (b.hashes.get(u.id) !== hashDefault.get(u.id)) changed.push(u.id);
    sc.changed = changed;
    const bad = changed.filter(id => !(S.deps.get(id) || []).some(c => varied.includes(c)));
    if (bad.length) factor.violations.push({ scenario: sc.id, units: bad.slice(0, 20), n: bad.length });
  }
  const groupOfConflict = new Map(); S.groups.forEach((g, gi) => g.forEach(c => groupOfConflict.set(c, gi)));
  const groupScenarioHash = new Map();
  for (const sc of scenarios) if (sc.kind === 'group') groupScenarioHash.set(sc.group - 1 + '|' + S.groups[sc.group - 1].map(c => sc.choices[c]).join(','), behaviours.get(sc.id).hashes);
  const unitGroup = new Map();
  for (const u of U) { const ds = S.deps.get(u.id) || []; unitGroup.set(u.id, ds.length ? groupOfConflict.get(ds[0]) : null); }
  for (const sc of scenarios) if (sc.kind === 'named' && sc.id !== 'delegated') {
    const b = behaviours.get(sc.id); let compared = 0; const bad = [];
    for (const u of U) {
      const gi = unitGroup.get(u.id); if (gi == null) { if (b.hashes.get(u.id) !== hashDefault.get(u.id)) bad.push(u.id); compared++; continue; }
      const ref = groupScenarioHash.get(gi + '|' + S.groups[gi].map(c => sc.choices[c]).join(','));
      if (!ref) continue; compared++; if (ref.get(u.id) !== b.hashes.get(u.id)) bad.push(u.id);
    }
    factor.joint.push({ scenario: sc.id, compared, mismatches: bad.slice(0, 20), n_mismatch: bad.length });
  }
  return { scenarios, behaviours, hashDefault, factor, unitGroup };
}
// the scenario part of a dump: the set, the groups, the options, the factorisation, the hashes of every unit under every scenario (only the units that differ from the default are listed)
export function scenarioDump(P, S, R, extra = {}) {
  const U = P.layer.units;
  const unitsMeta = U.map((u, i) => ({ id: u.id, name: u.name, side: u.side, arm: u.arm, level: u.level, parent: u.parent, status: u.status, drawn: !!u.drawn, render: u.render.status, count: P.world.units[i].count, klass: P.world.units[i].klass, slot_kind: P.world.units[i].kind, formation_kind: u.formation && u.formation.kind, register: u.register, tier: u.tier, deps: S.deps.get(u.id) || [], group: R.unitGroup.get(u.id) == null ? null : R.unitGroup.get(u.id) + 1 }));
  const hashes = { default: Object.fromEntries(R.hashDefault), scenarios: {} };
  for (const sc of R.scenarios) { const b = R.behaviours.get(sc.id), o = {}; for (const id of sc.changed) o[id] = b.hashes.get(id); hashes.scenarios[sc.id] = o; }
  return {
    units: unitsMeta, hashes,
    scenarios: Object.fromEntries(R.scenarios.map(s => [s.id, { id: s.id, kind: s.kind, group: s.group, varied: s.varied_vs_default, choices: s.choices, optionText: s.optionText, changed: s.changed.length, note: s.note || null }])),
    scenario_set: { id: extra.id || 'S*', complete: !!extra.complete, count: R.scenarios.length, groups: S.groups.map((g, gi) => ({ id: gi + 1, conflicts: g, options: Object.fromEntries(g.map(c => [c, S.opts[c].map(o => o.key)])), product: g.reduce((p, c) => p * S.opts[c].length, 1), units: unitsMeta.filter(u => u.group === gi + 1).length })),
      options: Object.fromEntries(Object.entries(S.opts).map(([c, os]) => [c, os.map(o => ({ key: o.key, text: o.text }))])), factorisation: R.factor, restriction_check: extra.restriction || { checked: false } },
  };
}
export function withUnits(P, keep, fn) {                       // the layer says only what the unit set needs (the stage reads layer.both)
  if (!keep) return fn();
  const layer = P.layer, orig = layer.both;
  layer.both = sc => { const r = orig(sc); return { ...r, arrivals: r.arrivals.filter(a => keep.has(a.unit)), events: r.events.filter(e => keep.has(e.unit)) }; };
  try { return fn(); } finally { layer.both = orig; }
}
// visit the scenarios in order; for each, the units whose (unit, behaviour) has not been scanned yet are `need`; scanFn(sc, keepOrNull, need) returns {units:{id:record}, ...scan info}
export function driveScans(P, R, scanFn, { selectedUnits = null } = {}) {
  const U = P.layer.units, scanned = new Set(), records = {}, scans = [], t0 = Date.now();
  for (const sc of R.scenarios) {
    const B = R.behaviours.get(sc.id), need = new Set();
    for (const u of U) { if (selectedUnits && !selectedUnits.has(u.id)) continue; const key = u.id + '|' + B.hashes.get(u.id); if (!scanned.has(key)) need.add(u.id); }
    if (!need.size) { scans.push({ scenario: sc.id, scanned_units: 0, skipped: 'every unit behaves as in a scan already made' }); continue; }
    const full = !selectedUnits && (need.size >= U.length * 0.9 || sc.id === 'delegated');
    const res = scanFn(sc, full ? null : need, need);
    for (const [id, rec] of Object.entries(res.units)) { if (!need.has(id)) continue; scanned.add(id + '|' + rec.hash); (records[id] = records[id] || {})[rec.hash] = { ...rec, scanned_in: sc.id }; }
    scans.push({ scenario: sc.id, scanned_units: need.size, full, ...res.info, ms: Date.now() - t0 });
  }
  return { records, scans };
}
