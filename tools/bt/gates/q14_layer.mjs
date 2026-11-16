// Gate Q14, node side: what the real product holds of ordnance (GATE-SPEC Q14.1 to Q14.7).
//   node tools/bt/gates/q14_layer.mjs --out dump.json [--scenarios default|sample|ofat] [--mutate file.mjs]
// It reports, and does not judge:
//   * batteries: the layer's gun record of every artillery leaf unit, the guns the world draws for it (world units with `guns`, crew detachments of nine)
//   * ballistics: the printed range table the product's `ballistics.mjs` holds, its elevation for each documented range (the inverse), what it does beyond the table and the derived flight time
//   * plans: every FirePlan the crowd driver (`src/crowd/anim.mjs`, the code the page runs) builds for every world unit in every scenario, with its parameters and, over the plan's whole window, the
//     largest number of shots one figure fires in any 60-second window (exact: every shot time of every figure is enumerated) and the total number of shots
//   * crew: the posts of a detachment and the crew constants of the world builder and of the crowd driver
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, loadMutation, parseArgs, scenarioList, writeOut, APP, r6 } from './oob_layer_lib.mjs';

const imp = rel => import(pathToFileURL(path.join(APP, rel)).href);
const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const kind = args.scenarios === true || !args.scenarios ? 'sample' : args.scenarios;
const B = await build({ mutate, stage: true });
const { raw, T, geo, layer, world, Stage, BATTLE } = B;
const U = layer.units;
const { RANGE_TABLE_YD, elevationForRange, flightTimeS, gunImpact } = await imp('src/anim3d/ballistics.mjs');
const { CREW_POSTS, GUN_INTERVAL_M, GUN_PERIOD_S } = await imp('src/world-from-units.mjs');
const { CrowdAnim, CREW_PER_GUN } = await imp('src/crowd/anim.mjs');
const YD = 0.9144;

// ---- batteries
const crewOf = new Map();
world.units.forEach((w, j) => { if (w.crew) { if (!crewOf.has(w.parent)) crewOf.set(w.parent, []); crewOf.get(w.parent).push(j); } });
const batteries = [];
let unionGuns = 0, csGuns = 0;
U.forEach((u, i) => {
  if (u.children.length || u.arm !== 'artillery') return;
  const g = u.guns, G = world.units[i].guns || 0, crew = crewOf.get(i) || [];
  batteries.push({ id: u.id, name: u.name, army: u.side === 'union' ? 'US' : 'CS', level: u.level, parent: u.parent, status: u.status, drawn: !!u.drawn, render: u.render.status, strength_drawn: u.strength.drawn,
    guns: { status: g.status, count: g.count ?? null, types: (g.types || []).map(t => ({ type_id: t.type_id, count: t.count ?? null, printed_type: t.printed_type })), printed: g.printed ?? null, kit_battery: g.kit_battery ?? null, tier: g.tier, weak_source: g.weak_source ?? null, sources: g.sources, reason: g.reason ?? null },
    world: { guns: G, crew_groups: crew.length, crew_total: crew.reduce((s, j) => s + world.units[j].count, 0) } });
  if (G) { if (u.side === 'union') unionGuns += G; else csGuns += G; }
});

// ---- ballistics (the product's own table and functions)
const rows = [], inverse = [], beyond = [];
for (const [piece, T_] of Object.entries(RANGE_TABLE_YD)) {
  for (const round of ['shot', 'shell', 'case']) {
    const tab = T_[round]; if (!tab) continue;
    for (const [e, yd] of tab) {
      rows.push({ piece, round, elev_deg: e, range_yd: yd, src: T_.src });
      const back = elevationForRange(yd * YD, piece, round);
      inverse.push({ piece, round, elev_deg: e, range_yd: yd, elev_back: r6(back), ok: Number.isFinite(back) && Math.abs(back - e) < 1e-6, flight_s: r6(flightTimeS(yd * YD, e)) });
    }
    const top = Math.max(...tab.map(r => r[1]));
    const e2 = elevationForRange(top * 1.02 * YD, piece, round), imp2 = gunImpact(piece, round, top * 1.02 * YD, 0, {});
    beyond.push({ piece, round, top_yd: top, probe_yd: r6(top * 1.02), elevation_beyond: Number.isNaN(e2) ? 'NaN' : r6(e2), impact_beyond: imp2 === null ? null : 'object' });
  }
}

// ---- fire plans of the crowd driver, per scenario
const skeleton = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'figures3d', 'skeleton.json'), 'utf8'));
const st = new Stage({ layer, world, T, geo });
const D = new CrowdAnim({ skeleton, world, layer, stage: st });
const tEnd = BATTLE.to * 60;
function analyse(p) {
  const t1 = Math.min(p.endS, tEnd);
  let max = 0, fig = -1, at = 0, total = 0;
  if (!(t1 > p.startS)) return { window_s: 0, shots: 0, max_in_60s: { count: 0, figure: -1, t_s: 0 } };
  for (let i = 0; i < p.n; i++) {
    const ts = []; const last = p.lastCycle(i);
    for (let k = 0; k <= last; k++) { const t = p.shotTime(i, k); if (t >= t1) break; ts.push(t); }
    total += ts.length;
    let j = 0; for (let a = 0; a < ts.length; a++) { while (ts[a] - ts[j] >= 60) j++; const c = a - j + 1; if (c > max) { max = c; fig = i; at = ts[j]; } }
  }
  return { window_s: r6(t1 - p.startS), shots: total, max_in_60s: { count: max, figure: fig, t_s: r6(at) } };
}
const plans = {};
const scenarios = scenarioList(kind, raw, layer);
for (const sc of scenarios) {
  st.loadScenario({ id: sc.id, choices: sc.choices, optionText: sc.optionText }); D.reset();
  const list = [];
  for (let ui = 0; ui < world.units.length; ui++) {
    const segs = D._segsOf(ui);
    segs.forEach((s, si) => {
      const p = s.plan; if (!p) return;
      const crew = ui >= U.length, parent = crew ? world.units[ui].parent : ui;
      list.push({ unit: U[parent].id, animator: D.unitId(ui), crew, activity: s.activity, seg: si, mode: p.mode, weapon: p.weapon, weapon_id: p.weaponId ?? null, round: p.round ?? null, target: p.target ?? null, n: p.n, start_s: r6(p.startS), end_s: Number.isFinite(p.endS) ? r6(p.endS) : null,
        cycle_min: p.cycleMin, cycle_max: p.cycleMax, floor_s: p.floor, pace_spread: p.paceSpread, tier: p.tier, basis: p.basis, dismounted_share: s.dm || 0, ...analyse(p) });
    });
  }
  plans[sc.id] = list;
}

writeOut(args.out, { schema: 'q14-layer-dump/1', layer: { id: layer.meta.id, units: U.length }, scenarios: scenarios.map(s => s.id),
  scenario_set: { id: kind, kind, count: scenarios.length, complete: false, note: kind === 'default' ? 'the default scenario only' : kind === 'ofat' ? 'default and every value of every linked conflict taken alone, not the Cartesian product inside the interaction groups' : 'default and the six sample scenarios of history.test.mjs: a sample, never S*' },
  batteries, drawn_guns: { union: unionGuns, confederate: csGuns }, world: { guns: world.guns ? world.guns.length : null, comp: world.comp },
  ballistics: { table: RANGE_TABLE_YD, rows, inverse, beyond }, plans, crew: { posts: CREW_POSTS.map(p => p[0]), per_gun: CREW_POSTS.length, crowd_per_gun: CREW_PER_GUN, gun_interval_m: GUN_INTERVAL_M, gun_period_s: GUN_PERIOD_S },
  window: { from_s: BATTLE.from * 60, to_s: BATTLE.to * 60 } });
