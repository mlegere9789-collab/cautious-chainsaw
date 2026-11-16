// Gate Q04, node side: what the real product shows of every unit before its arrival window opens (GATE-SPEC.md 2, Q04.1 to Q04.7).
//   node tools/bt/gates/q04_arrival.mjs --out dump.json [--scenarios S*|default] [--grid dense|coarse] [--units a,b] [--only sid,sid] [--no-train] [--no-manifest] [--no-effects] [--mutate file.mjs]
// It reports, it does not judge (the python runner q04_arrival.py judges). For every scenario of S* (q456_lib.mjs buildScenarioSet: the Cartesian product inside each interaction group, the two named defaults, the
// extremal scenarios) and every unit whose behaviour differs from the one already scanned, it drives the application's own code over the time grid (every integer minute of 26 June to 14 July and one second either side of
// every boundary) and records, per entity class, the maximal runs of grid times at which the class is present:
//   soldiers   Stage.present (the unit table the renderer draws; officers, colour bearers and musicians are figures of the unit)       crew     the gun detachments (world units after the layer's), which follow their battery
//   guns       world.gunF (the pieces the stage draws)                                                                                 horses   the ridden horses of a mounted unit (one per mounted figure: world.comp.horses)
//   train      ArtilleryTrain.at(), the code Structures.drawLists runs: extra guns, limbers, caissons, battery wagon and forge, teams of horses, drivers (a battery's whole train, in the viewer's four readings)
//   manifest   layer.figureManifest: the per-figure record that dresses officers, colour bearers, musicians and flags, read at every grid time before the unit enters
//   casualties the men lying on the ground (the stage's own fall table), counted by Stage._detail                                       effects  every event the real AnimSystem emits (shots, smoke, march sounds, falls, commands) before the arrival
// The scan of a scenario is restricted to the units whose arrival record and events differ from a scan already made (a unit's behaviour is a pure function of its own record and events: the stage reduces per unit,
// guns and crews follow their own battery); the equality of a restricted and a full scan is itself scanned (`restriction_check`).
import path from 'node:path';
import { buildProduct, buildScenarioSet, unitBehaviours, buildGrid, Runs, loadScenario, imp, parseArgs, loadMutation, writeOut, r6, readJSON, ROOT, inputsRead } from './q456_lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const gridMode = args.grid === 'coarse' ? 'coarse' : 'dense';
const P = await buildProduct({ mutate, stage: true });
const { layer, world, T, BATTLE } = P, st = P.stage;
const U = layer.units, nL = U.length, nW = world.units.length, HID = P.HIDDEN / 2;
const idx = new Map(U.map((u, i) => [u.id, i]));
const selectedUnits = args.units && args.units !== true ? new Set(String(args.units).split(',')) : null;

// ---- the product's own readers of the scenario
const train = await (async () => { try { return readJSON('app/data/artillery-train.json'); } catch { return null; } })();
const art = await imp('src/structures/artillery.mjs');
const { CrowdAnim } = await imp('src/crowd/anim.mjs');
const { EVENT_TYPES } = await imp('src/anim3d/events.mjs');
const haveTrain = !!(train && P.raw.batteryGuns) && !args['no-train'];
const TRAIN_LISTS = ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers'];
const TRAIN_READINGS = [null, { gun_policy: 'stated_only' }, { caisson_rule: 'war_establishment' }, { gun_policy: 'stated_only', caisson_rule: 'war_establishment' }];
const crowd = args['no-effects'] ? null : new CrowdAnim({ skeleton: readJSON('app/data/figures3d/skeleton.json'), world, layer, stage: st });
const tally = { n: 0, min: Infinity, types: {} };
if (crowd) for (const type of EVENT_TYPES) { const ti = (type === 'unit_march' || type === 'activity') ? 1 : 2; crowd.anim.bus.on(type, (...a) => { tally.n++; const t = a[ti]; if (t < tally.min) tally.min = t; tally.types[type] = (tally.types[type] || 0) + 1; }); }

function withUnits(keep, fn) {                       // the layer says only what the unit set needs (the stage reads layer.both)
  if (!keep) return fn();
  const orig = layer.both;
  layer.both = sc => { const r = orig(sc); return { ...r, arrivals: r.arrivals.filter(a => keep.has(a.unit)), events: r.events.filter(e => keep.has(e.unit)) }; };
  try { return fn(); } finally { layer.both = orig; }
}
const inBox = p => p && p.lng >= P.box.lng0 && p.lng <= P.box.lng1 && p.lat >= P.box.lat0 && p.lat <= P.box.lat1;

// ---- the unit set, the scenarios, the behaviours
const S = buildScenarioSet(P, { mode: args.scenarios === 'default' ? 'default' : 'S*' });
let scenarios = S.list;
if (args.only && args.only !== true) { const w = new Set(String(args.only).split(',')); scenarios = scenarios.filter(s => w.has(s.id) || s.id === 'delegated'); }
const behaviours = new Map(), hashDefault = new Map();
for (const sc of scenarios) { const b = unitBehaviours(layer, sc); behaviours.set(sc.id, b); if (sc.id === 'delegated') for (const [id, h] of b.hashes) hashDefault.set(id, h); }
// the factorisation (GATE-SPEC 1.5): a unit may change in a scenario only if it depends on a conflict the scenario varies from the default
const factor = { scenarios: scenarios.length, violations: [], joint: [], checked_units: U.length, rule: 'a unit depends on the conflicts of its own gate, on its parent\'s when its gate is a floor or absent (ArrivalModel.effective), and on stop.conflict for its legs' };
const base = scenarios.find(s => s.id === 'delegated');
for (const sc of scenarios) {
  const varied = Object.keys(sc.choices).filter(c => sc.choices[c] !== base.choices[c] || sc.optionText[c] !== base.optionText[c]);
  sc.varied_vs_default = varied;
  const b = behaviours.get(sc.id), changed = [];
  for (const u of U) if (b.hashes.get(u.id) !== hashDefault.get(u.id)) changed.push(u.id);
  sc.changed = changed;
  const bad = changed.filter(id => !(S.deps.get(id) || []).some(c => varied.includes(c)));
  if (bad.length) factor.violations.push({ scenario: sc.id, units: bad.slice(0, 20), n: bad.length });
}
// a joint scenario (named: every conflict varied at once) must give every unit the behaviour of the scenario of its own group with the same coordinates
const groupOfConflict = new Map(); S.groups.forEach((g, gi) => g.forEach(c => groupOfConflict.set(c, gi)));
const groupScenarioHash = new Map();                 // `${gi}|${coords}` -> Map(unit -> hash)
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

// ---- the scan of one scenario over a unit set
function scanScenario(sc, keep, mode) {
  const B = behaviours.get(sc.id), set = keep ? [...keep] : U.map(u => u.id), ui = set.map(id => idx.get(id));
  const info = withUnits(keep, () => loadScenario(P, sc));
  const refused = st.rejected.map(r => ({ unit: r.ev.unit, t: r.ev.t / 60, type: r.ev.type, reason: r.reason }));
  // boundaries: every window boundary of the arrival and of the presence, one second either side
  const bnd = [];
  for (const id of set) {
    const a = B.arrivalOf.get(id); if (a) bnd.push(a.earliest, a.default, a.latest);
    const p = st.presence && st.presence[id]; if (p) { bnd.push(p.from / 60); if (p.to != null) bnd.push(p.to / 60); }
    for (const e of B.eventsOf.get(id) || []) if (e.type === 'enter' || e.type === 'leave') bnd.push(e.t);
    const fi = st.fallInfo(idx.get(id)); if (fi && fi.t.length) { bnd.push(fi.t[0] / 60); bnd.push(fi.t[fi.t.length - 1] / 60); }
  }
  const grid = buildGrid(P, { mode, boundaries: bnd });
  const soldiers = new Runs(nW), guns = new Runs(world.gunF.length / 8), horses = new Runs(nL), cas = new Runs(nL), hidden = new Int32Array(nW), hiddenFirst = new Float64Array(nW).fill(NaN);
  const firstPos = new Array(nW).fill(null), lastPos = new Array(nW).fill(null), gunOwner = new Int32Array(world.gunF.length / 8).fill(-1);
  world.units.forEach((w, j) => { if (w.gun != null) gunOwner[w.gun] = j < nL ? j : w.parent; });
  const mounted = new Uint8Array(nW); world.units.forEach((w, j) => { mounted[j] = w.klass === 1 && w.count > 0 ? 1 : 0; });
  const inSet = new Uint8Array(nW); for (const i of ui) inSet[i] = 1; world.units.forEach((w, j) => { if (j >= nL && inSet[w.parent]) inSet[j] = 1; });
  let downMismatch = 0, downFirst = null, mountedMismatch = 0, soldiersMismatch = 0;
  const detailIdx = st.detail.slice();
  let k = 0;
  for (const t of grid) {
    if (k++ === 0) st.apply(t); else st.apply(t, t * 60);
    const pr = st.present, uf = world.unitF; let downSum = 0, mountedSum = 0, soldierSum = 0;
    for (let i = 0; i < nW; i++) {
      if (!inSet[i]) continue;
      const on = pr[i] === 1; soldiers.put(i, on, t);
      if (on) { if (firstPos[i] == null) firstPos[i] = { t, x: st.cx[i], z: st.cz[i] }; lastPos[i] = { t, x: st.cx[i], z: st.cz[i] }; soldierSum += world.units[i].count; if (mounted[i]) mountedSum += world.units[i].count; }
      if (i < nL && mounted[i]) horses.put(i, on, t);
      if (on === (uf[i * 12] >= HID)) { hidden[i]++; if (Number.isNaN(hiddenFirst[i])) hiddenFirst[i] = t; }
    }
    for (let g = 0; g < guns.n; g++) if (gunOwner[g] >= 0 && inSet[gunOwner[g]]) guns.put(g, world.gunF[g * 8] < HID, t);
    for (const i of detailIdx) { if (!inSet[i]) continue; const d = st.dt[i]; let down = 0; if (d && d.loss && pr[i] === 1) down = d.loss.cum[d.k]; downSum += down; if (i < nL) cas.put(i, down > 0, t); }
    if (downSum !== st.stats.down) { downMismatch++; if (downFirst == null) downFirst = { t, stage: st.stats.down, summed: downSum }; }
    if (mountedSum !== st.stats.mounted) mountedMismatch++;
    if (soldierSum !== st.stats.soldiers) soldiersMismatch++;
  }
  [soldiers, guns, horses, cas].forEach(r => r.done());
  // ---- the train (what Structures.drawLists draws), a battery's whole train under each of the viewer's readings
  const trainOut = {};
  if (haveTrain) {
    const both = B, plan = art.planArtillery({ units: U, train, batteryGuns: P.raw.batteryGuns, arrivals: both.arrivals });
    const batts = plan.batteries.filter(b => keep == null || keep.has(b.id)), restricted = { ...plan, batteries: batts };
    const AT = new art.ArtilleryTrain({ plan: restricted, train, units: U }), pose = art.stagePoseAt(st, U.map(u => u.id), train.layout.train_turn_s);
    const bIdx = new Map(batts.map(b => [b.unit, b]));
    TRAIN_READINGS.forEach((reading, ri) => {
      if (ri > 0 && sc.id !== 'delegated') return;                 // the three other readings change what is drawn, not when a battery exists: scanned once, in the default scenario
      const rs = Object.fromEntries(TRAIN_LISTS.map(l => [l, new Runs(nL)]));
      for (const t of grid) {
        const d = AT.at(t, pose, reading), seen = Object.fromEntries(TRAIN_LISTS.map(l => [l, new Set()]));
        for (const l of TRAIN_LISTS) { const a = d[l]; for (let q = 0; q < a.length; q += art.STRIDE) seen[l].add(a[q + 4]); }
        for (const l of TRAIN_LISTS) for (const b of batts) rs[l].put(b.unit, seen[l].has(b.unit), t);
      }
      for (const l of TRAIN_LISTS) rs[l].done();
      for (const b of batts) { const key = ri === 0 ? 'default' : JSON.stringify(reading); (trainOut[b.id] = trainOut[b.id] || {})[key] = Object.fromEntries(TRAIN_LISTS.map(l => [l, rs[l].of(b.unit)])); }
    });
    for (const b of batts) { const c = AT.compose(b, null); trainOut[b.id].composition = { guns: c.guns, extra: c.extra, limbers: c.limbers, caissons: c.caissons, horses: c.horses, earliest_in_plan: b.earliest }; }
  }
  // ---- the manifests (flags, colour bearers, musicians, officers): read at every grid time before the unit enters, and at three times after
  const manifest = {};
  if (!args['no-manifest']) {
    const scObj = { choices: sc.choices, optionText: sc.optionText };
    for (const id of set) {
      const u = U[idx.get(id)]; if (!u.drawn) continue;
      const a = B.arrivalOf.get(id), e = a ? layer.enterOf(id, scObj) : null, run = []; let on = false, a0 = 0, b0 = 0, n = 0, stop = (e == null ? BATTLE.to : e + 3);
      for (const t of grid) {
        if (t > stop) break;
        const m = layer.figureManifest(id, 0, t, scObj), present = m != null; n++;
        if (present) { if (!on) { on = true; a0 = t; } b0 = t; } else if (on) { run.push([a0, b0]); on = false; }
      }
      if (on) run.push([a0, b0]);
      manifest[id] = { runs: run, samples: n, enters: e, scanned_to: Math.min(stop, BATTLE.to) };
    }
  }
  // ---- the effects: every event the real AnimSystem emits before the unit's arrival window opens (the animation reads the stage's admitted events, so a cause cannot be missed)
  const effects = {};
  if (crowd) {
    const A = crowd.anim, saved = A.unitList;
    for (const id of set) {
      const i = idx.get(id), a = B.arrivalOf.get(id), cand = [i, ...world.units.map((w, j) => (j >= nL && w.parent === i ? j : -1)).filter(j => j >= 0)];
      if (!U[i].drawn || !a) continue;
      const rec = { events_before: 0, types_before: {}, first_before: null, first_after_s: null, first_segment_s: null, windows: [] };
      for (const j of cand) {
        const ua = crowd.get(j), old = ua.uidx, segs = ua.segs || []; if (segs.length && (rec.first_segment_s == null || segs[0].t0 < rec.first_segment_s)) rec.first_segment_s = segs[0].t0;
        A.unitList = [ua]; ua.uidx = 0;
        try {
          tally.n = 0; tally.min = Infinity; tally.types = {}; A.advance(BATTLE.from * 60 - 7200, a.earliest * 60);
          if (tally.n) { rec.events_before += tally.n; if (rec.first_before == null || tally.min < rec.first_before) rec.first_before = tally.min; for (const [ty, c] of Object.entries(tally.types)) rec.types_before[ty] = (rec.types_before[ty] || 0) + c; }
          tally.n = 0; tally.min = Infinity; tally.types = {}; A.advance(a.earliest * 60, Math.max(a.default, a.earliest) * 60 + 7200);
          if (tally.n && (rec.first_after_s == null || tally.min < rec.first_after_s)) rec.first_after_s = tally.min;
        } finally { A.unitList = saved; ua.uidx = old; }
      }
      rec.windows = [[BATTLE.from * 60 - 7200, a.earliest * 60]];
      effects[id] = rec;
    }
  }
  // ---- per unit records
  const out = {};
  for (const id of set) {
    const i = idx.get(id), u = U[i], a = B.arrivalOf.get(id) || null, evs = B.eventsOf.get(id) || [];
    const crewIdx = world.units.map((w, j) => (j >= nL && w.parent === i ? j : -1)).filter(j => j >= 0);
    const gunIdx = []; world.units.forEach((w, j) => { if (w.gun != null && (j === i || (j >= nL && w.parent === i))) gunIdx.push(w.gun); });
    const enter = evs.find(e => e.type === 'enter') || null, leaves = evs.filter(e => e.type === 'leave'), paths = evs.filter(e => e.type === 'path'), forms = evs.filter(e => e.type === 'formation'), states = evs.filter(e => e.type === 'state');
    const lastPathBefore = t => { let p = null; for (const e of paths) if (e.t <= t + 1e-9) p = e; return p; };
    const leave = leaves.length ? leaves[leaves.length - 1] : null, lp = leave ? lastPathBefore(leave.t) : null, lpEnd = lp && lp.wp.length ? lp.wp[lp.wp.length - 1] : null;
    const fi = st.fallInfo(i), mc = soldiers.of(i);
    const classes = {};
    if (u.drawn || mc.samples) classes.soldiers = mc;
    if (crewIdx.length) classes.crew = { runs: mergeRuns(crewIdx.map(j => soldiers.of(j).runs)), samples: crewIdx.reduce((s, j) => s + soldiers.of(j).samples, 0), groups: crewIdx.length };
    if (gunIdx.length) classes.guns = { runs: mergeRuns(gunIdx.map(g => guns.of(g).runs)), samples: gunIdx.reduce((s, g) => s + guns.of(g).samples, 0), pieces: gunIdx.length };
    if (mounted[i]) classes.horses = { ...horses.of(i), horses: world.units[i].count };
    if (cas.k[i] || (fi && fi.t.length)) classes.casualties = { ...cas.of(i), falls: fi ? fi.t.length : 0, first_fall_s: fi && fi.t.length ? fi.t[0] : null, last_fall_s: fi && fi.t.length ? fi.t[fi.t.length - 1] : null };
    if (trainOut[id]) { for (const l of TRAIN_LISTS) classes['train.' + l] = trainOut[id].default[l]; }
    if (manifest[id]) classes.manifest = manifest[id];
    out[id] = {
      hash: B.hashes.get(id), classes, effects: effects[id] || null, train: trainOut[id] ? { composition: trainOut[id].composition, readings: Object.fromEntries(Object.entries(trainOut[id]).filter(([k2]) => k2 !== 'default' && k2 !== 'composition').map(([k2, v]) => [k2, Object.fromEntries(TRAIN_LISTS.map(l => [l, v[l]]))])) } : null,
      arrival: a ? { earliest: a.earliest, default: a.default, latest: a.latest, tier: a.tier, sources: a.sources, conflict: a.conflict, entry: a.entry, entry_status: a.entry_status } : null,
      enter: enter ? { t: enter.t, at: enter.at } : null, enter_in_box: enter ? inBox(enter.at) : null,
      first_sample: firstPos[i], last_sample: lastPos[i], first_path: paths.length ? { t: paths[0].t, wp0: paths[0].wp[0] } : null, n_paths: paths.length,
      leave: leave ? { t: leave.t, last_path_end: lpEnd ? { lng: lpEnd.lng, lat: lpEnd.lat, t: lpEnd.t } : null, last_path_end_in_box: lpEnd ? inBox(lpEnd) : null, path_t_end: lp ? lp.wp[lp.wp.length - 1].t : null } : null,
      formations: forms.map(e => ({ t: e.t, formation: e.formation, duration_s: e.duration_s, tier: e.tier, clause: e.clause })),
      events: { n: evs.length, before_earliest: a ? evs.filter(e => e.t < a.earliest - 1e-9).length : evs.length, first_before_earliest: a ? (evs.find(e => e.t < a.earliest - 1e-9) || null) && { t: evs.find(e => e.t < a.earliest - 1e-9).t, type: evs.find(e => e.t < a.earliest - 1e-9).type } : null, state_before_enter: enter ? states.filter(e => e.t < enter.t - 1e-9).length : states.length },
      refused: refused.filter(r => r.unit === id).slice(0, 5), n_refused: refused.filter(r => r.unit === id).length,
      hidden_flag: { mismatch_samples: hidden[i], first: Number.isNaN(hiddenFirst[i]) ? null : hiddenFirst[i] },
    };
  }
  return { units: out, grid: { mode, samples: grid.length, integer_minutes: Math.floor(BATTLE.to) - Math.ceil(BATTLE.from) + 1, boundaries: new Set(bnd.filter(x => x != null && Number.isFinite(x))).size, from: BATTLE.from, to: BATTLE.to },
    consistency: { down_mismatch_samples: downMismatch, down_first: downFirst, mounted_mismatch_samples: mountedMismatch, soldiers_mismatch_samples: soldiersMismatch }, load: info, refused_total: refused.length };
}
function mergeRuns(lists) {                           // union of run lists (crew groups of one battery are present together; a union still shows a run that only one group has)
  const all = lists.flat().sort((a, b) => a[0] - b[0] || a[1] - b[1]), out = [];
  for (const r of all) { const l = out[out.length - 1]; if (l && r[0] <= l[1]) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); }
  return out;
}

// ---- drive the scans: the default scenario over every unit, then every scenario over the units whose behaviour has not been scanned yet
const scanned = new Set(), behaviourRecords = {}, scans = [], t0 = Date.now();
const wanted = id => !selectedUnits || selectedUnits.has(id);
for (const sc of scenarios) {
  const B = behaviours.get(sc.id), need = new Set();
  for (const u of U) { if (!wanted(u.id)) continue; const h = B.hashes.get(u.id), key = u.id + '|' + h; if (!scanned.has(key)) need.add(u.id); }
  if (!need.size) { scans.push({ scenario: sc.id, scanned_units: 0, skipped: 'every unit behaves as in a scan already made' }); continue; }
  const full = need.size >= U.length * 0.9 || sc.id === 'delegated';
  const res = scanScenario(sc, full && !selectedUnits ? null : need, gridMode);
  for (const [id, rec] of Object.entries(res.units)) { if (!need.has(id)) continue; scanned.add(id + '|' + rec.hash); (behaviourRecords[id] = behaviourRecords[id] || {})[rec.hash] = { ...rec, scanned_in: sc.id }; }
  scans.push({ scenario: sc.id, scanned_units: need.size, full, grid: res.grid, consistency: res.consistency, load: res.load, refused_total: res.refused_total, ms: Date.now() - t0 });
}
// the restriction is exact: a full scan and a scan of the changed units give the same runs for those units (checked on the first group scenario that changes units)
const restriction = { checked: false };
{
  const sc = scenarios.find(s => s.kind === 'group' && s.changed.length && s.changed.length < U.length / 3);
  if (sc && !selectedUnits && !args['no-restriction-check']) {
    const keep = new Set(sc.changed), a = scanScenario(sc, keep, gridMode), b = scanScenario(sc, null, gridMode);
    const diff = [];
    for (const id of keep) { const x = a.units[id], y = b.units[id]; const pick = r => JSON.stringify([r.classes, r.effects, r.arrival, r.enter, r.leave, r.events]); if (pick(x) !== pick(y)) diff.push(id); }
    restriction.checked = true; restriction.scenario = sc.id; restriction.units = keep.size; restriction.differences = diff.slice(0, 20); restriction.n_differences = diff.length;
  }
}
const unitsMeta = U.map((u, i) => ({ id: u.id, name: u.name, side: u.side, arm: u.arm, level: u.level, parent: u.parent, status: u.status, drawn: !!u.drawn, render: u.render.status, count: world.units[i].count, klass: world.units[i].klass, slot_kind: world.units[i].kind, formation_kind: u.formation && u.formation.kind, register: u.register, tier: u.tier, deps: S.deps.get(u.id) || [], group: unitGroup.get(u.id) == null ? null : unitGroup.get(u.id) + 1 }));
const hashes = { default: Object.fromEntries(hashDefault), scenarios: {} };
for (const sc of scenarios) { const b = behaviours.get(sc.id), o = {}; for (const id of sc.changed) o[id] = b.hashes.get(id); hashes.scenarios[sc.id] = o; }
writeOut(args.out, {
  schema: 'q04-dump/1', layer: { id: layer.meta.id, contract: layer.meta.contract, units: nL, counts: layer.counts }, ground: P.ground, battle: BATTLE,
  grid: { mode: gridMode, from: BATTLE.from, to: BATTLE.to, boundary_s: 1, note: gridMode === 'dense' ? 'every integer minute and one second either side of every window boundary of the unit set of the scan' : 'coarse: every ' + 60 + 'th minute and the boundaries (a test mode: never a PASS)' },
  scenario_set: { id: args.scenarios === 'default' ? 'default' : 'S*', complete: args.scenarios !== 'default' && !args.only && !selectedUnits, count: scenarios.length, groups: S.groups.map((g, gi) => ({ id: gi + 1, conflicts: g, options: Object.fromEntries(g.map(c => [c, S.opts[c].map(o => o.key)])), product: g.reduce((p, c) => p * S.opts[c].length, 1), units: unitsMeta.filter(u => u.group === gi + 1).length })),
    options: Object.fromEntries(Object.entries(S.opts).map(([c, os]) => [c, os.map(o => ({ key: o.key, text: o.text }))])), factorisation: factor, restriction_check: restriction },
  scenarios: Object.fromEntries(scenarios.map(s => [s.id, { id: s.id, kind: s.kind, group: s.group, varied: s.varied_vs_default, choices: s.choices, optionText: s.optionText, changed: s.changed.length, note: s.note || null }])),
  units: unitsMeta, hashes, behaviours: behaviourRecords, scans, train: haveTrain ? { readings: TRAIN_READINGS.map(r => r), file: 'app/data/artillery-train.json' } : null,
  inputs_read: inputsRead(), effects_run: !!crowd, manifest_run: !args['no-manifest'], selected_units: selectedUnits ? [...selectedUnits] : null, root: path.basename(ROOT), r6: r6(0),
});
