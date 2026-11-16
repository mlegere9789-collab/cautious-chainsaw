// Gate Q01, node side: what the real history layer, the world built from it and the stage hold, per unit (GATE-SPEC Q01.2 to Q01.7).
//   node tools/bt/gates/q01_layer.mjs --out dump.json [--scenarios default|sample|ofat] [--mutate file.mjs]
// The python runner (q01_oob.py) compares this dump with the verified OOB table. Nothing here judges: it reports what the product holds.
import { build, loadMutation, parseArgs, scenarioList, writeOut, capScan, ROOT, r6 } from './oob_layer_lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const kind = args.scenarios === true || !args.scenarios ? 'sample' : args.scenarios;
const B = await build({ mutate, stage: true });
const { raw, T, geo, layer, world, Stage, BATTLE } = B;
const U = layer.units;

// ---- units
const units = U.map(u => ({
  id: u.id, name: u.name, army: u.side === 'union' ? 'US' : 'CS', level: u.level, arm: u.arm === 'headquarters' || u.arm === 'staff' ? null : u.arm, parent: u.parent, status: u.status,
  status_ledger: (raw.units.units.find(x => x.id === u.id) || {}).status, commanders: u.commanders || [],
  strength: { min: u.strength.min, max: u.strength.max, drawn: u.strength.drawn, share: u.strength.share, kind: u.strength.kind, basis: u.strength.basis, tier: u.strength.tier, sources: u.strength.sources, weak_source: u.strength.weak_source, ...(u.strength.basis_key ? { basis_key: u.strength.basis_key } : {}) },
  drawn: !!u.drawn, render: u.render.status, children: u.children, guns: { status: u.guns.status, count: u.guns.count ?? null }, register: u.register, tier: u.tier, sources: u.sources,
}));

// ---- arrivals of the default scenario and the road of approach
const arrivals = { default: {} };
for (const a of layer.arrivals({})) arrivals.default[a.unit] = { earliest: a.earliest, default: a.default, latest: a.latest, entry: a.entry, entry_status: a.entry_status, tier: a.tier, sources: a.sources, conflict: a.conflict };
const approach = {};
for (const u of U) approach[u.id] = u.approach ? { id: u.approach.id, road: u.approach.road, tier: u.approach.tier, owner: u.approach.owner, inherited: u.approach.inherited, modelled: !!u.approach.modelled } : null;

// ---- units the record puts off the field: history/not_on_field.json, and the documented absences of data/placement-claims.json
const notOnField = {};
for (const n of (raw.notOnField.units || [])) notOnField[n.id] = { status: n.status, source: 'history/not_on_field.json', table_row: n.table_row };
for (const n of (raw.notOnField.listed_in_ledger_as_not_on_field || [])) notOnField[n.id] = { ...(notOnField[n.id] || {}), status: n.status, detached_role: n.detached_role || null, source: 'history/not_on_field.json' };
for (const a of (((raw.placementClaims || {}).documented_absent) || [])) notOnField[a.unit] = { status: 'documented_absent', register: a.register, decision: a.decision, source: 'data/placement-claims.json' };

// ---- one-to-one: rendered instances against present strength (Q01.6)
const idx = new Map(U.map((u, i) => [u.id, i]));
const crewOf = new Map();                                     // layer index -> world indices of its gun detachments
world.units.forEach((w, j) => { if (w.crew) { if (!crewOf.has(w.parent)) crewOf.set(w.parent, []); crewOf.get(w.parent).push(j); } });
const snapshotCounts = () => world.units.map(w => w.count).join(',');
const countsBefore = snapshotCounts();
const eventIntervals = events => {                              // present from the layer's events only: enter .. leave (minutes since 1863-06-01 00:00)
  const m = new Map();
  for (const e of events) if (e.type === 'enter') { if (!m.has(e.unit)) m.set(e.unit, []); m.get(e.unit).push([e.t, null]); } else if (e.type === 'leave') { const a = m.get(e.unit); if (a && a.length && a[a.length - 1][1] == null) a[a.length - 1][1] = e.t; }
  return m;
};
const inIv = (iv, t) => (iv || []).some(([a, b]) => t >= a && (b == null || t < b));
const onetoone = { scenarios: {}, grid: null, world_static: null, world: { total_soldiers: world.count, sum_strength_drawn: U.reduce((s, u) => s + (u.drawn ? u.strength.drawn : 0), 0), world_units: world.units.length, layer_units: U.length }, cap_scan: null };
const scenarios = scenarioList(kind, raw, layer);
const sec = 1 / 60, gridMinutes = BATTLE.to - BATTLE.from;
let evaluated = 0;
for (const sc of scenarios) {
  const st = new Stage({ layer, world, T, geo }); st.loadScenario({ id: sc.id, choices: sc.choices, optionText: sc.optionText });
  const iv = eventIntervals(layer.events({ choices: sc.choices, optionText: sc.optionText }));
  const times = new Set();
  for (let t = BATTLE.from; t <= BATTLE.to; t += 60) times.add(t);                         // hourly grid (every scenario)
  times.add(BATTLE.from); times.add(BATTLE.to);
  if (sc.id === 'default') for (const ivs of iv.values()) for (const [a, b] of ivs) for (const x of [a, b]) if (x != null) for (const d of [-sec, 0, sec]) { const t = x + d; if (t >= BATTLE.from && t <= BATTLE.to) times.add(r6(t)); }
  const ts = [...times].sort((a, b) => a - b);
  const per = {}; for (const u of U) per[u.id] = { violations: [], nviol: 0 };
  for (const t of ts) {
    st.apply(t); evaluated++;
    for (let i = 0; i < U.length; i++) {
      const u = U[i], p = per[u.id], present = st.present[i] === 1 ? 1 : 0;
      let got = present ? world.units[i].count : 0; for (const j of crewOf.get(i) || []) got += st.present[j] === 1 ? world.units[j].count : 0;
      const exp = inIv(iv.get(u.id), t) && u.drawn ? u.strength.drawn : 0;
      if (got !== exp) { p.nviol++; if (p.violations.length < 5) p.violations.push({ t_min: r6(t), expected: exp, rendered: got, why: present ? 'rendered count differs from the present strength' : 'not drawn although the layer events put the unit on the field' }); }
    }
  }
  const sp = st.presence || {};
  const units_ = {};
  for (let i = 0; i < U.length; i++) {
    const u = U[i], p = per[u.id], pr = sp[u.id] || null;
    let rendered = world.units[i].count; for (const j of crewOf.get(i) || []) rendered += world.units[j].count;
    units_[u.id] = { expected_drawn: u.drawn ? u.strength.drawn : 0, drawn_flag: !!u.drawn, world_count: world.units[i].count, crew_groups: (crewOf.get(i) || []).length, rendered_when_present: rendered,
      present_intervals: pr ? [[r6(pr.from / 60), pr.to == null ? null : r6(pr.to / 60)]] : [], event_intervals: (iv.get(u.id) || []).map(([a, b]) => [r6(a), b == null ? null : r6(b)]), violations: p.violations, n_violations: p.nviol };
  }
  onetoone.scenarios[sc.id] = { units: units_, times: ts.length };
}
onetoone.world_static = snapshotCounts() === countsBefore;
onetoone.grid = { mode: 'breakpoints+hourly', step_s: 60, grid_minutes: gridMinutes, evaluated_points: evaluated, evaluated_minutes: evaluated, exact_by_breakpoints: false,
  note: 'each scenario is evaluated on the hourly grid; the default scenario also at one second either side of every enter and leave of every unit. The dense scan of every integer minute and the full scenario set S* are owed.' };
onetoone.cap_scan = capScan();

writeOut(args.out, { schema: 'q01-layer-dump/1', root: ROOT.split('/').pop(), layer: { id: layer.meta.id, contract: layer.meta.contract, units: U.length, counts: layer.counts }, scenarios: scenarios.map(s => s.id),
  scenario_set: { id: kind, kind, count: scenarios.length, complete: false, note: kind === 'default' ? 'the default scenario only' : kind === 'ofat' ? 'default and every value of every linked conflict taken alone (one factor at a time), not the Cartesian product inside the interaction groups' : 'default and the six sample scenarios of history.test.mjs: a sample, never S*' },
  units, arrivals, approach, source_keys: Object.keys(layer.sources).sort(), not_on_field: notOnField, onetoone, cap_scan: onetoone.cap_scan });
