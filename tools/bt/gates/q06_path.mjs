// Gate Q06, node side: what the real product holds of the march of every unit from its previous position to its fighting position (GATE-SPEC.md 2, Q06.1 to Q06.5).
//   node tools/bt/gates/q06_path.mjs --out dump.json [--scenarios S*|default] [--units a,b] [--only sid,sid] [--mutate file.mjs]
// It reports, it does not judge (q06_path.py judges). For every leaf unit of the layer (the units that carry figures) under every scenario of S* (q456_lib.mjs; the unit's behaviour decides, as in Q04 and Q05) it records
//   how the layer shows the unit      render status (moving, edge_only, not_drawn, not_on_field), the plan the placement module made of it (status, the reason it gives when it has none, stops, day positions, departures)
//   the road of approach              the card of the unit's approach (road, tier, owner, inherited, modelled, register entry) and how far the entry point lies from that road
//   the chain                         every leg the layer gives the unit (the path events), projected with the application's own geo: times, ends, mean speed, tier and sources, the joins between legs and with the entry,
//                                     and where the last leg ends against the unit's own fighting position (layer.slotOf)
//   the entry                         the enter event and whether it lies outside the loaded ground
//   the deployment                    the layout the unit is built in, the second layout it blends to, every change of formation (time, duration, tier, clause)
//   the departure                     the leave event and the march before it
import { buildProduct, buildScenarioSet, prepareScenarios, scenarioDump, driveScans, imp, parseArgs, loadMutation, writeOut, r6 } from './q456_lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const P = await buildProduct({ mutate, stage: false });
const { layer, world, geo, BATTLE } = P, U = layer.units, nL = U.length;
const idx = new Map(U.map((u, i) => [u.id, i]));
const selectedUnits = args.units && args.units !== true ? new Set(String(args.units).split(',')) : null;
const { nearestOnLine, distM } = await imp('src/history/gazetteer.mjs');
const { FORMATION_SECONDS } = await imp('src/history/contract.mjs');
const inBox = p => p && p.lng >= P.box.lng0 && p.lng <= P.box.lng1 && p.lat >= P.box.lat0 && p.lat <= P.box.lat1;
const outsideXZ = (x, z) => Math.abs(x) > P.ground.W || Math.abs(z) > P.ground.H;

const S = buildScenarioSet(P, { mode: args.scenarios === 'default' ? 'default' : 'S*' });
const R = prepareScenarios(P, S, { only: args.only && args.only !== true ? args.only : null });
const leaves = U.filter(u => !u.children.length);

function legsOf(evs) {
  const acts = evs.filter(e => e.type === 'activity'), paths = evs.filter(e => e.type === 'path'), enter = evs.find(e => e.type === 'enter') || null;
  const legs = paths.map((e, k) => {
    const wp = e.wp, pts = wp.map(w => geo.xz(w.lng, w.lat)); let len = 0, maxSeg = 0;
    for (let j = 0; j + 1 < wp.length; j++) { const d = Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]), dt = (wp[j + 1].t - wp[j].t) * 60; len += d; if (dt > 0 && d / dt > maxSeg) maxSeg = d / dt; }
    const t0 = wp[0].t, t1 = wp[wp.length - 1].t; let gait = null;
    for (const a of acts) { if (a.t > t0 + 1e-9) break; if (a.activity === 'march' || a.activity === 'double_quick') gait = a.activity; }
    return { i: k, t0, t1, length_m: r6(len), mean_ms: t1 > t0 ? r6(len / ((t1 - t0) * 60)) : null, max_seg_ms: r6(maxSeg), gait, tier: e.tier, sources: (e.sources || []).slice(0, 4), start: pts[0].map(r6), end: pts[pts.length - 1].map(r6), start_ll: [wp[0].lng, wp[0].lat], end_ll: [wp[wp.length - 1].lng, wp[wp.length - 1].lat] };
  });
  return { legs, enter };
}

function recordsFor(sc, need) {
  const B = R.behaviours.get(sc.id), out = {};
  for (const id of need) {
    const i = idx.get(id), u = U[i];
    if (u.children.length) continue;
    const plan = layer.plans.get(id) || null, evs = B.eventsOf.get(id) || [], { legs, enter } = legsOf(evs), a = B.arrivalOf.get(id) || null, w = world.units[i];
    const ap = u.approach ? { id: u.approach.id, road: u.approach.road, tier: u.approach.tier, owner: u.approach.owner, owner_level: u.approach.owner_level, inherited: !!u.approach.inherited, modelled: !!u.approach.modelled, register: u.approach.register || null, claim: u.approach.claim || null, row: u.approach.row || null, kind: u.approach.kind || null, has_sources: !!(u.approach.claim || u.approach.row || (u.approach.siblings && u.approach.siblings.length)) } : null;
    const slot = layer.slotOf(id), slotXZ = slot ? geo.xz(slot.lng, slot.lat) : null;
    const joins = legs.map((l, k) => { const prev = k ? legs[k - 1] : null, from = prev ? prev.end : enter ? geo.xz(enter.at.lng, enter.at.lat) : null, tPrev = prev ? prev.t1 : enter ? enter.t : null; return { i: k, d_m: from ? r6(Math.hypot(l.start[0] - from[0], l.start[1] - from[1])) : null, gap_s: tPrev != null ? r6((l.t0 - tPrev) * 60) : null, after: prev ? 'leg' : 'entry' }; });
    const last = legs.length ? legs[legs.length - 1] : null;
    let entry = null;
    if (enter) {
      const exz = geo.xz(enter.at.lng, enter.at.lat), near = plan && plan.line ? nearestOnLine(plan.line, enter.at) : null;
      entry = { t: enter.t, lng: enter.at.lng, lat: enter.at.lat, x: r6(exz[0]), z: r6(exz[1]), outside_box: !inBox(enter.at), outside_ground: outsideXZ(exz[0], exz[1]), d_road_m: near ? r6(near.d) : null, road: plan ? plan.road : null, queue_offset_m: plan ? plan.queueOffsetM : null, crossing_s: plan ? plan.crossingS ?? null : null, clamped: plan ? !!plan.clamped : null };
    }
    const forms = evs.filter(e => e.type === 'formation').map(e => ({ t: e.t, formation: e.formation, duration_s: e.duration_s, tier: e.tier, clause: e.clause, sources: (e.sources || []).slice(0, 3) }));
    const leave = evs.filter(e => e.type === 'leave').pop() || null;
    const lastPathBeforeLeave = leave ? legs.filter(l => l.t1 <= leave.t + 1e-9).pop() || null : null;
    out[id] = {
      hash: B.hashes.get(id), arm: u.arm, level: u.level, status: u.status, render: u.render.status, render_reason: String(u.render.reason || '').slice(0, 420), tier: u.tier, register: u.register, drawn: !!u.drawn, count: w.count,
      plan: plan ? { status: plan.status, reason: String(plan.reason || '').slice(0, 300), road: plan.road || null, column_index: plan.columnIndex ?? null, column_size: plan.columnSize ?? null, n_stops: (plan.stops || []).length, n_days: (plan.days || []).length, n_days_feasible: (plan.days || []).filter(d => d.feasible).length, n_skipped: (plan.skipped || []).length, n_departures: (plan.departures || []).length, approach: plan.approach || null } : null,
      stops: (plan ? plan.stops || [] : []).map(s => ({ po: s.po, place: s.place, t_doc: s.t_doc, depart_doc: s.depart_doc ?? null, place_tier: s.placeObj ? s.placeObj.tier : null, conflict: s.conflict || null, heading_deg: s.headingDeg ?? null })).slice(0, 12),
      days: (plan ? plan.days || [] : []).map(d => ({ id: d.id, kind: d.kind, claim: d.claim, feasible: !!d.feasible, why_not: d.why_not || null, reachable_default: d.reachable_default ?? null })).slice(0, 12),
      approach: ap, arrival: a ? { earliest: a.earliest, default: a.default, latest: a.latest, tier: a.tier, entry_status: a.entry_status, entry: a.entry } : null, entry, legs, joins,
      slot: slot ? { lng: slot.lng, lat: slot.lat, x: r6(slotXZ[0]), z: r6(slotXZ[1]), heading_deg: slot.heading_deg } : null, end_vs_slot_m: last && slotXZ ? r6(Math.hypot(last.end[0] - slotXZ[0], last.end[1] - slotXZ[1])) : null,
      layout: { kind: w.kind, has_alt: !!w.alt, base: w.baseFormation || null, alt: w.altFormation || null, formation_kind: u.formation && u.formation.kind }, formations: forms, formation_default_s: FORMATION_SECONDS,
      leave: leave ? { t: leave.t, march_before: lastPathBeforeLeave ? { t1: lastPathBeforeLeave.t1, end_ll: lastPathBeforeLeave.end_ll, end_in_box: inBox({ lng: lastPathBeforeLeave.end_ll[0], lat: lastPathBeforeLeave.end_ll[1] }), start_vs_last_slot_m: null } : null } : null,
      n_events: evs.length,
    };
  }
  return out;
}

const { records, scans } = driveScans(P, R, (sc, keep, need) => ({ units: recordsFor(sc, [...need].filter(id => leaves.some(l => l.id === id)).map(id => id)), info: { leaves: need.size } }), { selectedUnits });
const sd = scenarioDump(P, S, R, { id: args.scenarios === 'default' ? 'default' : 'S*', complete: args.scenarios !== 'default' && !args.only && !selectedUnits });
const { SPEED } = await imp('src/history/real.mjs');
writeOut(args.out, { schema: 'q06-dump/1', layer: { id: layer.meta.id, contract: layer.meta.contract, units: nL, counts: layer.counts }, ground: P.ground, battle: BATTLE, ...sd, behaviours: records, scans, selected_units: selectedUnits ? [...selectedUnits] : null,
  product: { speed: { march: SPEED.march, double_quick: SPEED.double_quick }, formation_seconds: FORMATION_SECONDS }, resolution_m: 1.0 });
