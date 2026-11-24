// Gate Q05, node side: how the real product moves every entity (GATE-SPEC.md 2, Q05.1 to Q05.5).
//   node tools/bt/gates/q05_speed.mjs --out dump.json [--scenarios S*|default] [--grid dense|coarse] [--units a,b] [--only sid,sid] [--no-train] [--mutate file.mjs]
// It reports, it does not judge (q05_speed.py judges). For every scenario of S* (q456_lib.mjs) and every unit whose behaviour has not been scanned yet it measures
//   legs      every path the layer gives the unit (src/history/real.mjs eventsFor), projected with the application's own geo into the stage frame: length, mean speed, the fastest and slowest segment, the gait the layer
//             declares for it (the activity event at its start), where it starts and ends
//   joins     where each leg starts against where the one before ended (and against the unit's entry for the first), the time between them, an overlap in time
//   turns     every change of heading as the stage's own reducer (Stage._step on the admitted events) sees it: the angle, the turn time the stage gives it, the radius of the figure farthest from the unit's origin
//             (soldiers, gun pieces and gun crews), and the peak speed of that far end: the unit's own speed plus 1.5 x angle / turn time x radius (a smoothstep turns fastest in the middle)
//   steps     the Stage's own positions at every grid time (every integer minute of the window and one second either side of each leg boundary, enter and leave): the speed between two consecutive samples at which the
//             unit is present, and every pair whose displacement is more than v_max x dt plus the position resolution; the same for every gun piece
//   train     for every battery the draw lists of ArtilleryTrain (limbers, caissons, wagon and forge, teams of horses, drivers, extra guns) every 5 s while the battery moves or turns: the fastest entity of each list
//   offsets   the layer's own report of lateness (report().offsets, defects, state_offsets): where a documented time cannot be met at a documented rate
import { buildProduct, buildScenarioSet, prepareScenarios, scenarioDump, driveScans, withUnits, buildGrid, loadScenario, imp, parseArgs, loadMutation, writeOut, r6, readJSON, inputsRead } from './q456_lib.mjs';

const args = parseArgs(process.argv.slice(2));
const mutate = await loadMutation(args.mutate);
const gridMode = args.grid === 'coarse' ? 'coarse' : 'dense';
const P = await buildProduct({ mutate, stage: true });
const { layer, world, geo, BATTLE } = P, st = P.stage, U = layer.units, nL = U.length, nW = world.units.length, HID = P.HIDDEN / 2;
const idx = new Map(U.map((u, i) => [u.id, i]));
const selectedUnits = args.units && args.units !== true ? new Set(String(args.units).split(',')) : null;
const art = await imp('src/structures/artillery.mjs');
const train = await (async () => { try { return readJSON('app/data/artillery-train.json'); } catch { return null; } })();
const haveTrain = !!(train && P.raw.batteryGuns) && !args['no-train'];
const TRAIN_LISTS = ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers'];
const RESOLUTION_M = 1.0;                                    // T-Q05-1 (DD-G01): the position resolution of the displacement test is the 1 m of the path joins
const wrap = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
// the documented bounds (drill-timing.json: Hardee and Casey cadences and steps; gait-sources.json: Wheeler 1863, Cooper 1861, Instruction for Field Artillery 1863), read from the same files the python judge reads
const DT = readJSON('app/data/anim3d/drill-timing.json'), GS = readJSON('app/data/anim3d/gait-sources.json');
const BOUNDS = { foot_upper: DT.march.double_quick_urgent.speedMs, cavalry_upper: Math.min(...Object.values(GS.bases).filter(b => b.speeds_ms).map(b => b.speeds_ms.gallop)), team_upper: GS.bases.fa_1863.speeds_ms.gallop, factor: 1.0001 };
const boundOf = i => (U[i].arm === 'cavalry' ? BOUNDS.cavalry_upper : BOUNDS.foot_upper) * BOUNDS.factor;

// ---- the extent of every unit: the figure farthest from its origin (soldiers; gun pieces and their crews)
const sold0 = st.sold0;
const rCrew = j => { const w = world.units[j]; let r = 0; for (let k = 0; k < w.count; k++) { const s = (w.first + k) * 4; r = Math.max(r, Math.hypot(sold0[s], sold0[s + 1])); } return r; };
const extent = new Float64Array(nL), crewOf = new Map();
for (let i = 0; i < nL; i++) {
  const w = world.units[i]; let r = 0;
  for (let k = 0; k < w.count; k++) { const s = (w.first + k) * 4; r = Math.max(r, Math.hypot(sold0[s], sold0[s + 1])); }
  if (w.alt) for (let k = 0; k < w.count; k++) r = Math.max(r, Math.hypot(w.alt[k * 2], w.alt[k * 2 + 1]));
  extent[i] = r;
}
world.units.forEach((w, j) => { if (j >= nL && w.crew) { const e = world.extra[j - nL]; const rg = Math.hypot(e.dx, e.dz) + rCrew(j); extent[w.parent] = Math.max(extent[w.parent], rg); if (!crewOf.has(w.parent)) crewOf.set(w.parent, []); crewOf.get(w.parent).push(j); } });

const S = buildScenarioSet(P, { mode: args.scenarios === 'default' ? 'default' : 'S*' });
const R = prepareScenarios(P, S, { only: args.only && args.only !== true ? args.only : null });

function legsOf(evs) {
  const acts = evs.filter(e => e.type === 'activity'), paths = evs.filter(e => e.type === 'path'), enter = evs.find(e => e.type === 'enter') || null;
  const legs = paths.map((e, k) => {
    const wp = e.wp, pts = wp.map(w => geo.xz(w.lng, w.lat)); let len = 0, maxSeg = 0, minSeg = Infinity, zeroDt = 0;
    for (let j = 0; j + 1 < wp.length; j++) {
      const d = Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]), dt = (wp[j + 1].t - wp[j].t) * 60; len += d;
      if (dt > 0) { const v = d / dt; if (v > maxSeg) maxSeg = v; if (v < minSeg) minSeg = v; } else if (d > 0) zeroDt++;
    }
    const t0 = wp[0].t, t1 = wp[wp.length - 1].t; let gait = null;
    for (const a of acts) { if (a.t > t0 + 1e-9) break; if (a.activity === 'march' || a.activity === 'double_quick') gait = a.activity; }
    return { i: k, t0, t1, dur_s: (t1 - t0) * 60, length_m: r6(len), mean_ms: t1 > t0 ? r6(len / ((t1 - t0) * 60)) : null, max_seg_ms: r6(maxSeg), min_seg_ms: minSeg === Infinity ? null : r6(minSeg), n_wp: wp.length, zero_time_moves: zeroDt, gait, tier: e.tier, sources: (e.sources || []).slice(0, 3), start: pts[0].map(r6), end: pts[pts.length - 1].map(r6) };
  });
  return { legs, enter: enter ? { t: enter.t, xz: geo.xz(enter.at.lng, enter.at.lat).map(r6) } : null };
}
const speedAt = (legs, t) => { for (const l of legs) if (t >= l.t0 - 1e-9 && t <= l.t1 + 1e-9) return l.max_seg_ms; return 0; };

function turnsOf(i, legs) {
  const tr = st.track[i]; if (!tr) return [];
  const out = []; let rec = null;
  for (const e of tr) {
    rec = st._step(rec, e);
    if (e.type !== 'activity' || !rec || rec.head == null || rec.headFrom == null) continue;
    const dA = Math.abs(wrap(rec.head - rec.headFrom)); if (dA < 1e-6) continue;
    const v = speedAt(legs, e.t / 60), omega = 1.5 * dA / rec.turnS;
    out.push({ t: r6(e.t / 60), dA: r6(dA), turn_s: r6(rec.turnS), r_m: r6(extent[i]), v_ms: v, omega_peak: r6(omega), rot_peak_ms: r6(omega * extent[i]), edge_peak_ms: r6(Math.hypot(v, omega * extent[i])), edge_sum_ms: r6(v + omega * extent[i]), edge_mean_ms: r6(Math.hypot(v, dA / rec.turnS * extent[i])) });
  }
  return out;
}

// the draw lists of the train, every 5 s while a battery moves or turns (outside those windows nothing of it moves: the pose is constant between the unit's events)
function trainOf(sc, B, batts, AT, pose, choice) {
  const out = {}, STEP = 5 / 60;
  for (const b of batts) {
    const evs = B.eventsOf.get(b.id) || [], wins = [];
    for (const e of evs) { if (e.type === 'path') wins.push([e.wp[0].t - STEP, e.wp[e.wp.length - 1].t + train.layout.train_turn_s / 60 + STEP]); else if (e.type === 'activity') wins.push([e.t - STEP, e.t + train.layout.train_turn_s / 60 + STEP]); }
    wins.sort((a, c) => a[0] - c[0]); const merged = []; for (const w of wins) { const l = merged[merged.length - 1]; if (l && w[0] <= l[1]) l[1] = Math.max(l[1], w[1]); else merged.push(w.slice()); }
    const stats = Object.fromEntries(TRAIN_LISTS.map(l => [l, { max_ms: 0, at: null, n: 0 }])); let samples = 0, rMax = 0, hMax = 0;
    for (const [a0, a1] of merged) {
      let prev = null;
      for (let t = Math.max(a0, BATTLE.from); t <= Math.min(a1, BATTLE.to); t += STEP) {
        const d = AT.at(t, pose, choice), snap = {}; samples++;
        for (const l of TRAIN_LISTS) { const a = d[l]; snap[l] = Float32Array.from(a); }
        if (prev && prev.t === t - STEP + 0) { /* consecutive */ }
        if (prev) for (const l of TRAIN_LISTS) { const p = prev.s[l], c = snap[l]; if (p.length !== c.length) continue; for (let q = 0; q < c.length; q += art.STRIDE) { const v = Math.hypot(c[q] - p[q], c[q + 1] - p[q + 1]) / (STEP * 60); if (v > stats[l].max_ms) { stats[l].max_ms = r6(v); stats[l].at = r6(t); } stats[l].n++; } }
        prev = { t, s: snap };
      }
    }
    out[b.id] = { windows: merged.length, samples, lists: stats };
  }
  return out;
}

function scanScenario(sc, keep) {
  const B = R.behaviours.get(sc.id), set = keep ? [...keep] : U.map(u => u.id);
  const info = withUnits(P, keep, () => loadScenario(P, sc));
  const rep = layer.report({ choices: sc.choices, optionText: sc.optionText });
  const legsBy = new Map(), bnd = [];
  for (const id of set) {
    const L = legsOf(B.eventsOf.get(id) || []); legsBy.set(id, L);
    for (const l of L.legs) bnd.push(l.t0, l.t1);
    for (const e of B.eventsOf.get(id) || []) if (e.type === 'enter' || e.type === 'leave') bnd.push(e.t);
  }
  const grid = buildGrid(P, { mode: gridMode, boundaries: bnd });
  const inSet = new Uint8Array(nW), on = new Uint8Array(nW), px = new Float64Array(nW), pz = new Float64Array(nW), pt = new Float64Array(nW);
  for (const id of set) inSet[idx.get(id)] = 1;
  const step = Array.from({ length: nL }, () => ({ max: 0, at: null, n_over: 0, pairs: 0, offenders: [], vmax_at_pair: null }));
  const nG = world.gunF.length / 8, gunOwner = new Int32Array(nG).fill(-1); world.units.forEach(w => { if (w.gun != null) gunOwner[w.gun] = w.parent; });
  const gOn = new Uint8Array(nG), gx = new Float64Array(nG), gz = new Float64Array(nG), gt = new Float64Array(nG);
  const gstep = Array.from({ length: nL }, () => ({ max: 0, at: null, n_over: 0, pairs: 0 }));
  const bound = new Float64Array(nL).fill(Infinity);                // the bound the dump carries per class is applied in python; here the raw measure is kept and the pairs above 2.6 m/s (the foot urgent bound with margin) are listed
  for (const t of grid) {
    st.apply(t, t * 60);
    const pr = st.present;
    for (let i = 0; i < nL; i++) {
      if (!inSet[i]) continue;
      const now = pr[i] === 1;
      if (now && on[i]) {
        const dt = (t - pt[i]) * 60, d = Math.hypot(st.cx[i] - px[i], st.cz[i] - pz[i]), v = dt > 0 ? d / dt : 0, s = step[i];
        s.pairs++; if (v > s.max) { s.max = r6(v); s.at = r6(t); s.vmax_at_pair = { d: r6(d), dt: r6(dt) }; }
        s.pairs_d = (s.pairs_d || 0); if (d > boundOf(i) * dt + RESOLUTION_M) { s.n_over++; if (s.offenders.length < 4) s.offenders.push({ t: r6(t), d_m: r6(d), dt_s: r6(dt), v_ms: r6(v) }); }
      }
      on[i] = now ? 1 : 0; if (now) { px[i] = st.cx[i]; pz[i] = st.cz[i]; pt[i] = t; }
    }
    for (let g = 0; g < nG; g++) {
      const o = gunOwner[g]; if (o < 0 || !inSet[o]) continue; const now = world.gunF[g * 8] < HID;
      if (now && gOn[g]) { const dt = (t - gt[g]) * 60, d = Math.hypot(world.gunF[g * 8] - gx[g], world.gunF[g * 8 + 1] - gz[g]), v = dt > 0 ? d / dt : 0, s = gstep[o]; s.pairs++; if (v > s.max) { s.max = r6(v); s.at = r6(t); } if (d > boundOf(o) * dt + RESOLUTION_M) s.n_over++; }
      gOn[g] = now ? 1 : 0; if (now) { gx[g] = world.gunF[g * 8]; gz[g] = world.gunF[g * 8 + 1]; gt[g] = t; }
    }
  }
  // the train
  let trainOut = {};
  if (haveTrain) {
    const plan = art.planArtillery({ units: U, train, batteryGuns: P.raw.batteryGuns, arrivals: B.arrivals });
    const batts = plan.batteries.filter(b => set.includes(b.id)), AT = new art.ArtilleryTrain({ plan: { ...plan, batteries: batts }, train, units: U }), pose = art.stagePoseAt(st, U.map(u => u.id), train.layout.train_turn_s);
    trainOut = trainOf(sc, B, batts, AT, pose, null);
  }
  const out = {};
  for (const id of set) {
    const i = idx.get(id), u = U[i], { legs, enter } = legsBy.get(id), joins = [];
    legs.forEach((l, k) => {
      const prev = k ? legs[k - 1] : null, from = prev ? prev.end : enter ? enter.xz : null, tPrev = prev ? prev.t1 : enter ? enter.t : null;
      joins.push({ i: k, d_m: from ? r6(Math.hypot(l.start[0] - from[0], l.start[1] - from[1])) : null, gap_s: tPrev != null ? r6((l.t0 - tPrev) * 60) : null, after: prev ? 'leg' : 'entry' });
    });
    const turns = turnsOf(i, legs), ev = B.eventsOf.get(id) || [];
    const offs = [...(rep.offsets || []).filter(o => o.unit === id).map(o => ({ ...o, list: 'offsets' })), ...(rep.defects || []).filter(o => o.unit === id).map(o => ({ ...o, list: 'defects' })), ...(rep.state_offsets || []).filter(o => o.unit === id).map(o => ({ ...o, list: 'state_offsets' }))];
    const a = B.arrivalOf.get(id) || null;
    out[id] = { hash: B.hashes.get(id), arm: u.arm, drawn: !!u.drawn, render: u.render.status, klass: world.units[i].klass, extent_m: r6(extent[i]), n_events: ev.length, arrival: a ? { earliest: a.earliest, default: a.default, latest: a.latest } : null,
      enter, legs, joins, turns, step: step[i], gun_step: gstep[i].pairs ? gstep[i] : null, train: trainOut[id] || null, offsets: offs, n_crew_groups: (crewOf.get(i) || []).length,
      max_turn_edge_ms: turns.reduce((m, t) => Math.max(m, t.edge_peak_ms), 0) };
  }
  return { units: out, info: { grid: { mode: gridMode, samples: grid.length, integer_minutes: Math.floor(BATTLE.to) - Math.ceil(BATTLE.from) + 1 }, load: info, refused_total: st.rejected.length } };
}

const { records, scans } = driveScans(P, R, (sc, keep) => scanScenario(sc, keep), { selectedUnits });
const sd = scenarioDump(P, S, R, { id: args.scenarios === 'default' ? 'default' : 'S*', complete: args.scenarios !== 'default' && !args.only && !selectedUnits });
// the documented figures the python side judges against are read there from drill-timing.json and gait-sources.json (inputs with hashes); the product's own constants are reported here
const { SPEED } = await imp('src/history/real.mjs');
const { TURN_S, MAX_TURN_EDGE_MS } = await imp('src/stage.mjs');
const stageConst = { TURN_S, MAX_TURN_EDGE_MS, note: 'read from src/stage.mjs (the shortest turn and the fastest the outer edge of a formation may move while it turns, by the stage\'s own words)' };
writeOut(args.out, {
  schema: 'q05-dump/1', layer: { id: layer.meta.id, contract: layer.meta.contract, units: nL, counts: layer.counts }, ground: P.ground, battle: BATTLE,
  grid: { mode: gridMode, from: BATTLE.from, to: BATTLE.to, boundary_s: 1, resolution_m: RESOLUTION_M }, inputs_read: inputsRead(), ...sd, behaviours: records, scans, selected_units: selectedUnits ? [...selectedUnits] : null,
  bounds: BOUNDS, product: { speed: { march: SPEED.march, double_quick: SPEED.double_quick }, stage: stageConst, train: haveTrain ? { layout_turn_s: train.layout.train_turn_s, file: 'app/data/artillery-train.json' } : null }, train_run: haveTrain,
});
