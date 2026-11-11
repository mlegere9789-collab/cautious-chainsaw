// Node tests (no browser) for workstream 6: the artillery train (every gun of a drawn battery, limbers, caissons, teams) and the construction states of the field works.
// Gates covered: Q04/Q06 (nothing before its earliest arrival; arrival is a march), Q05 (continuity), Q08 (no pre-placed works, stage order, crew in the construction interval, completion flagged),
// Q07 (pre-existing features have no construction state), Q14 (per-battery gun counts match the verified battery table), purity (the answer depends on time and choices only).
//   node --test docs/battle-theatre/app/tests/structures-ws6.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, BT } from './node-world.mjs';
import { nodeTerrain } from '../tools/node-terrain.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { createRealHistory } from '../src/history/real.mjs';
import { worldFromUnits, CREW_POSTS, GUN_INTERVAL_M as WORLD_GUN_INTERVAL } from '../src/world-from-units.mjs';
import { Stage } from '../src/stage.mjs';
import { Gazetteer } from '../src/history/gazetteer.mjs';
import { makeStateEngine, parseIso, isoOf } from '../src/structures/state.mjs';
import { planArtillery, ArtilleryTrain, hashLists, KIND, STRIDE, GUN_INTERVAL_M } from '../src/structures/artillery.mjs';
import { buildWorks3D, mergeWorks, FLAG, SEG_STRIDE, CREW_STRIDE } from '../src/structures/works3d.mjs';
import { Structures } from '../src/structures/index.mjs';
import { msOfMin } from '../src/structures/model.mjs';

const rj = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8')), rt = f => fs.readFileSync(path.join(BT, f), 'utf8');
const raw = loadRawFromDisk(), TM = terrainMeta(), { T } = await nodeWorld(), geo = makeGeo(T), helpers = { civilDawn: m => m + 4 * 60 + 3 };
const L = createRealHistory({ raw, T: TM, helpers }), world = worldFromUnits(T, geo, L), stage = new Stage({ layer: L, world, T, geo }); stage.loadScenario({});
const both = L.both({}), arrivals = both.arrivals, events = both.events;
const train = rj('app/data/artillery-train.json'), bg = rj('app/data/battery-guns.json'), d3 = rj('app/data/works3d.json');
const inputs = { structures: rj('structures/structures.json'), sched: rj('structures/state_schedule.json'), works: rj('structures/works_stages.json'), hospitals: rj('structures/hospitals.json') };
const gaz = new Gazetteer(rj('app/data/gazetteer.json')), kitArt = rj('kit/artillery_batteries.json');
const plan = planArtillery({ units: L.units, train, batteryGuns: bg, arrivals }), AT = new ArtilleryTrain({ plan, train, units: L.units });
const W = buildWorks3D({ data: d3, inputs, T, gaz, units: L.units, events });
const t0 = (d, h = 0, m = 0) => (d - 1) * 1440 + h * 60 + m + 30 * 1440;            // minutes since 1 June 00:00 for July day d
const pose = (i, o) => { if (stage.present[i] !== 1) return false; o.x = stage.cx[i]; o.z = stage.cz[i]; o.h = stage.ch[i]; return true; };
const at = (t, ch = null) => { stage.apply(t); return AT.at(t, pose, ch); };
const copy = d => ({ guns: d.guns.slice(), limbers: d.limbers.slice(), caissons: d.caissons.slice(), wagons: d.wagons.slice(), horses: d.horses.slice(), drivers: d.drivers.slice(), counts: { ...d.counts } });
const grid = []; for (let t = t0(1, 0); t <= t0(4, 12); t += 97) grid.push(t);

// ======================================================================================================== the artillery train
test('Q14: every drawn battery has a gun count with a basis (stated, Official Records, joined entry, printed default) or is listed as a gap; a stated count is never overridden and the kit table is matched', () => {
  const drawn = L.units.filter(u => u.arm === 'artillery' && !(u.children && u.children.length) && u.drawn);
  assert.equal(plan.batteries.length, drawn.length); assert.ok(drawn.length >= 70);
  const gapIds = new Set(plan.gaps.map(g => g.unit));
  for (const b of plan.batteries) {
    const u = L.units[b.unit]; assert.equal(u.id, b.id);
    if (u.guns.status === 'drawn') { assert.equal(b.stated, u.guns.count); assert.equal(b.fill, null); const m = bg.matched.find(x => x.history === b.id); assert.ok(m && m.total === b.stated, `${b.id}: the kit table says ${m && m.total}`); }
    else if (b.unresolved) assert.ok(gapIds.has(b.id), b.id + ' has no count and is not listed as a gap');
    else { assert.ok(b.fill && b.fill.basis && b.fill.tier && b.fill.count > 0, b.id); assert.notEqual(b.fill.tier, 'documented', b.id + ': a filled count is never documented'); assert.ok(['or_report', 'combined_entry_split', 'printed_total', 'battalion_fill', 'pdf_default_fill'].includes(b.fill.source)); }
  }
  assert.deepEqual([...gapIds].sort(), ['cs-2c-johnson-andrews', 'cs-3c-anderson-cutts', 'cs-3c-pender-poague']);
  // the stated pieces are exactly the 124 the history layer reports
  assert.equal(plan.batteries.reduce((s, b) => s + b.stated, 0), L.units.reduce((s, u) => s + (u.guns && u.guns.status === 'drawn' ? u.guns.count : 0), 0)); assert.equal(plan.batteries.reduce((s, b) => s + b.stated, 0), 124);
  // a joined kit entry keeps its printed total across the drawn batteries it joins
  for (const c of bg.combined) { const mem = plan.batteries.filter(b => (c.history || []).includes(b.id) && b.fill); if (mem.length) assert.equal(mem.reduce((s, b) => s + b.fill.count, 0), c.total, c.kit); }
  // the Official Records counts are tier inferred and only for the four kit gap batteries
  for (const [id, v] of Object.entries(train.or_counts)) if (typeof v === 'object') { const b = plan.batteries.find(x => x.id === id); assert.ok(b && !b.stated && b.fill.source === 'or_report' && b.fill.tier === 'inferred', id); }
});

test('the battalion table equals the kit data (batteries per formation) and the printed defaults are the PDF ones; no default is applied to a battalion with no kit battery list', () => {
  const nBy = new Map(); for (const b of Object.values(kitArt.batteries)) { const f = kitArt.formations.find(x => x.army === b.army && b.parent.includes(x.name.split(' (')[0].replace(/'s$/, "'s")) ); void f; }
  const byParent = new Map(); for (const b of Object.values(kitArt.batteries)) byParent.set(b.parent, (byParent.get(b.parent) || 0) + 1);
  const count = (formation) => { const f = kitArt.formations.find(x => x.id === formation); assert.ok(f, formation); const hits = [...byParent].filter(([p]) => p.includes(f.name.split(' (')[0].replace(/ battalion$/, ''))); return hits.reduce((s, [, n]) => s + n, 0); };
  void nBy;
  for (const [id, v] of Object.entries(train.battalions)) { if (id.startsWith('_')) continue; assert.ok(L.units.some(u => u.id === id), id + ' is not in the roster'); if (!v.printed_total_guns) assert.equal(v.batteries, count(v.formation), `${id}: ${v.formation}`); }
  assert.equal(train.gun_policies.plausible_fill.union_guns_per_battery, 6); assert.equal(train.gun_policies.plausible_fill.confederate_guns_per_battery, 4);
  assert.match(rt('BIBLE/plan-clean.txt').replace(/\s+/g, ' '), /Union batteries usually six guns \(some four\), Confederate often four/);
  assert.match(rt('BIBLE/plan-clean.txt').replace(/\s+/g, ' '), /Stuart had 13 guns on East Cavalry Field/);
  for (const g of plan.gaps) assert.equal(plan.batteries.find(b => b.id === g.unit).unresolved, true);
});

test('the constants agree with the stage and the world builder (crew of nine, gun interval) and the source keys exist in the kit data', () => {
  assert.equal(train.layout.crew_per_gun, CREW_POSTS.length); assert.equal(GUN_INTERVAL_M, WORLD_GUN_INTERVAL); assert.equal(train.layout.gun_interval_m, WORLD_GUN_INTERVAL);
  const keys = new Set(); for (const f of ['kit/artillery_batteries.json', 'kit/weapons.json', 'kit/kit_specs.json']) { const s = rj(f).sources; if (s) for (const k of Object.keys(s)) keys.add(k); }
  const used = JSON.stringify(train).match(/"(?:source_keys)":\s*\[([^\]]*)\]/g).flatMap(m => m.match(/"([^"]+)"/g).slice(1).map(x => x.replace(/"/g, '')));
  for (const k of used) assert.ok(keys.has(k), `source key ${k} is not a key of the kit data`);
  // the printed PDF numbers the data quotes are in the PDF text
  const pdf = rt('BIBLE/plan-clean.txt').replace(/\s+/g, ' ');
  for (const s of ['Each gun uses two six-horse teams', 'three drivers riding the left horses', 'Each battery had one battery wagon and one forge', 'limbers about 10-15 yd behind (second line), caissons farther back (third line)', 'A 12-pdr battery adds 6 caissons (12 total)']) assert.ok(pdf.includes(s), s);
  assert.ok(Math.abs(train.layout.limber_back_from_axle_m - (train.layout.trail_end_from_axle_m + train.layout.limber_pole_end_from_trail_yd * 0.9144 + train.layout.limber_pole_m)) < 0.02);
  assert.ok(train.layout.limber_back_from_axle_m / 0.9144 >= 10 && train.layout.limber_back_from_axle_m / 0.9144 <= 15);
  const drill = rj('drill/drill_artillery.json').items; for (const id of ['ART-FA-01', 'ART-FA-09', 'ART-FA-72', 'ART-FA-80']) assert.ok(drill.some(x => x.id === id), id);
});

test('totals: the default reading draws every stated and filled gun, never more than the printed inventory, and says how far it is from it; stated_only draws exactly the 124', () => {
  const t = AT.totals(null), so = AT.totals({ gun_policy: 'stated_only' });
  assert.equal(so.union.guns + so.confederate.guns, 124); assert.equal(so.union.extra + so.confederate.extra, 0);
  assert.equal(t.union.stated, 124); assert.ok(t.union.guns > 124 && t.confederate.guns > 0);
  assert.ok(t.union.guns <= t.union.inventory.high && t.confederate.guns <= t.confederate.inventory.high, 'more guns drawn than the printed inventory');
  assert.ok(t.union.guns + t.confederate.guns > 400, 'total ' + (t.union.guns + t.confederate.guns));
  console.log(`# guns drawn: Union ${t.union.guns} (stated ${t.union.stated}, extra ${t.union.extra}) of the inventory ${t.union.inventory.low}-${t.union.inventory.high}; Confederate ${t.confederate.guns} of ${t.confederate.inventory.low}-${t.confederate.inventory.high}; ${t.union.byBasis ? JSON.stringify(t.union.byBasis) : ''} ${JSON.stringify(t.confederate.byBasis)}`);
  const w = AT.totals({ caisson_rule: 'war_establishment' }); assert.equal(w.union.caissons, 2 * w.union.guns); assert.equal(t.union.caissons, t.union.guns);
  assert.deepEqual(AT.resolve({ gun_policy: 'nonsense', caisson_rule: 7 }), AT.resolve(null));
});

test('Q04/Q06: nothing of a battery exists before its earliest documented arrival; the train arrives with the battery (every entity of every battery is present only at or after its gate, at every sampled time)', () => {
  const earliest = new Map(arrivals.map(a => [a.unit, a.earliest])); let checked = 0, first = new Map();
  for (const t of [...grid, ...plan.batteries.flatMap(b => [b.earliest - 1, b.earliest, b.earliest + 1])].sort((a, b) => a - b)) {
    const d = at(t); for (const k of ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers']) { const a = d[k]; for (let i = 0; i < a.length; i += STRIDE) { const u = L.units[a[i + 4]].id; assert.ok(t >= earliest.get(u), `${k} of ${u} at ${t} before ${earliest.get(u)}`); checked++; if (!first.has(u) || first.get(u) > t) first.set(u, t); } }
  }
  assert.ok(checked > 1e5); assert.ok(first.size >= 65);
  for (const b of plan.batteries.filter(x => x.earliest != null).slice(0, 12)) { const d = at(b.earliest - 0.5); for (const k of ['guns', 'limbers', 'caissons', 'wagons', 'horses', 'drivers']) for (let i = 0; i < d[k].length; i += STRIDE) assert.notEqual(L.units[d[k][i + 4]].id, b.id, `${k} of ${b.id} exists half a minute before its gate`); }
  // a battery absent from the stage is absent here, even after its gate
  const hid = copy(AT.at(t0(2, 12), () => false)); assert.equal(hid.counts.present, 0); assert.equal(hid.horses.length, 0);
  // before the first gate of the whole roster nothing exists at all
  assert.equal(at(t0(1, 0) - 600).counts.present, 0);
});

test('composition: per gun one limber, caissons by the chosen rule, two or more six-horse teams, three drivers riding the left horses; the battery wagon and the forge have a team each; the lists equal compose()', () => {
  const t = t0(3, 12);
  for (const rule of ['teams_row', 'war_establishment']) {
    const d = copy(at(t, { caisson_rule: rule })), per = new Map(); const add = (k, u) => { const r = per.get(u) || { gun: 0, limber: 0, caisson: 0, wagon: 0, forge: 0, horse: 0, driver: 0, leftHorse: 0 }; r[k]++; per.set(u, r); return r; };
    for (let i = 0; i < d.guns.length; i += STRIDE) add('gun', d.guns[i + 4]); for (let i = 0; i < d.limbers.length; i += STRIDE) add('limber', d.limbers[i + 4]); for (let i = 0; i < d.caissons.length; i += STRIDE) add('caisson', d.caissons[i + 4]);
    for (let i = 0; i < d.wagons.length; i += STRIDE) add(d.wagons[i + 3] === KIND.wagon ? 'wagon' : 'forge', d.wagons[i + 4]); for (let i = 0; i < d.horses.length; i += STRIDE) { const r = add('horse', d.horses[i + 4]); if (d.horses[i + 6] & 1) r.leftHorse++; } for (let i = 0; i < d.drivers.length; i += STRIDE) add('driver', d.drivers[i + 4]);
    for (const b of plan.batteries) {
      const c = AT.compose(b, { caisson_rule: rule }); if (!c.guns || !pose(b.unit, { x: 0, z: 0, h: 0 })) continue; const r = per.get(b.unit); assert.ok(r, b.id);
      assert.equal(r.gun, c.extra); assert.equal(r.limber, c.limbers); assert.equal(r.caisson, c.caissons); assert.equal(r.wagon, 1); assert.equal(r.forge, 1);
      assert.equal(r.horse, c.horses); assert.equal(r.horse, c.teams * 6); assert.equal(r.driver, c.teams * 3); assert.equal(r.leftHorse, r.driver, 'the drivers ride the left horses'); assert.equal(c.teams, c.guns * (1 + (rule === 'teams_row' ? 1 : 2)) + 2);
    }
  }
  assert.equal(train.rules.teams_row.horses_per_gun, 12); assert.equal(train.rules.war_establishment.horses_per_gun, 18);
});

test('figures: the nine-man detachment of an extra gun and the drivers are men of the battery\'s own strength figure; where the strength cannot cover them the draw list says so and draws fewer drivers (no cap on the strength, no man invented)', () => {
  let uncovered = 0, covered = 0;
  for (const b of plan.batteries) { const c = AT.compose(b, null); if (!c.guns) continue; const f = c.figures; assert.ok(f.stageCrew + f.extraCrewDrawn + f.driversDrawn <= f.available, b.id); if (f.covered) { covered++; assert.equal(f.driversDrawn, f.driversNeeded); } else { uncovered++; assert.ok(f.driversDrawn < f.driversNeeded || f.extraCrewDrawn < f.extraCrewNeeded, b.id); } }
  console.log(`# batteries whose strength figure covers crew and drivers: ${covered}; not covered (drivers shown in part, flagged): ${uncovered}`);
  assert.ok(covered + uncovered > 60);
});

test('purity: the draw lists depend only on the time and the choices; scrubbing forwards, backwards and shuffled gives the same lists', () => {
  const times = grid.filter((_, i) => i % 3 === 0).slice(0, 30), ref = new Map(); for (const t of times) ref.set(t, hashLists(at(t)));
  const rev = [...times].reverse(); for (const t of rev) assert.equal(hashLists(at(t)), ref.get(t), 'reversed ' + t);
  let x = 99; const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647, sh = [...times]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } for (const t of sh) assert.equal(hashLists(at(t)), ref.get(t), 'shuffled ' + t);
  assert.notEqual(hashLists(at(t0(3, 12), { caisson_rule: 'war_establishment' })), hashLists(at(t0(3, 12))));
});

test('Q05: the train moves only with its battery: no entity jumps (displacement between two stage frames is bounded) and it keeps its place relative to the battery', () => {
  // the stage rigidly attaches the block to a path; vehicles are rigid in the same frame, so between two frames each moves at most the battery's march speed plus the swing of a turn
  let maxV = 0; const dt = 20 / 60;                                                        // 20 s frames
  for (const w of [[t0(1, 8), t0(1, 14)], [t0(2, 6), t0(2, 9)]]) {
    let prev = null; for (let t = w[0]; t < w[1]; t += dt) { const d = copy(at(t)); if (prev && prev.counts.horses === d.counts.horses && prev.counts.guns === d.counts.guns) for (const k of ['guns', 'limbers', 'caissons', 'wagons', 'horses']) for (let i = 0; i < d[k].length; i += STRIDE) { const v = Math.hypot(d[k][i] - prev[k][i], d[k][i + 1] - prev[k][i + 1]) / 20; if (v > maxV) maxV = v; } prev = d; }
  }
  console.log(`# fastest entity of the train between frames: ${maxV.toFixed(2)} m/s (battery march 1.25 m/s; the stage turns a block over 25 s, so the rear of a rigid train swings faster)`);
  assert.ok(maxV < 12, 'an entity moved at ' + maxV + ' m/s: a jump');
});

test('hand-over to the host: the draw lists are exposed through the Structures API (drawLists with the stage\'s poses, summary with the totals and the gaps) and a failure of the inputs is reported, not thrown', () => {
  const th = { layer: L, stage, T, state: { layers: { roads: true, fences: true, buildings: true, masses: true, markers: true }, settings: {}, scenario: { id: 'pdf-recommended', choices: {} }, structPD: {}, structChoice: {} }, bus: { emit() {} } };
  const inp = { ...inputs, data: rj('app/data/structures3d.json'), train, works3d: d3, batteryGuns: bg, gazetteer: rj('app/data/gazetteer.json'), ws6Errors: [] };
  const S = new Structures(th, inp, T); stage.apply(t0(2, 12)); const dl = S.drawLists(t0(2, 12));
  assert.ok(!dl.error, dl.error); assert.ok(dl.artillery.counts.horses > 1000 && dl.works.counts.segments > 0 && dl.preexisting.length >= 12);
  assert.equal(hashLists(dl.artillery), hashLists(at(t0(2, 12))));
  const sm = S.summary(); assert.ok(sm.ws6 && sm.ws6.artillery.union.guns > 124 && sm.ws6.works.drawn >= 10 && sm.ws6.artilleryGaps.length === 3);
  const S2 = new Structures(th, { ...inp, train: { error: 'HTTP 404' }, ws6Errors: ['HTTP 404'] }, T); assert.match(S2.drawLists(t0(2, 12)).error, /inputs missing/);
});

// ======================================================================================================== the works
const dayCheck = (id, sc) => W.works.find(o => o.id === id);
test('Q08 coverage: every E, G and P record of the record has a decision and a reason (drawn, drawn as another, pre-existing, or not drawn with the reason); nothing is unexplained', () => {
  const ids = inputs.structures.structures.filter(s => /^(E|G)-\d\d$/.test(s.id) || s.kind === 'preexisting_wall_or_fence').map(s => s.id);
  for (const id of ids) { const c = W.coverage.find(x => x.id === id); assert.ok(c, id + ' has no decision'); assert.notEqual(c.decision, 'unexplained', id); assert.ok(c.reason && c.reason.length > 10, id); }
  const drawn = W.coverage.filter(c => c.decision === 'drawn').map(c => c.id).sort(); assert.deepEqual(drawn, ['E-01', 'E-02', 'E-03', 'E-04', 'E-05', 'E-06', 'E-07', 'E-08', 'E-09', 'E-12', 'E-14']);
  for (const id of drawn) assert.equal(inputs.works.works[id].construction_applies, true, id); assert.equal(W.coverage.filter(c => c.decision === 'gap').length, 0, JSON.stringify(W.coverage.filter(c => c.decision === 'gap')));
  for (const id of ['E-10', 'E-11', 'E-13', 'E-15', 'E-16', 'E-17', 'E-18', 'G-12']) assert.equal(W.coverage.find(c => c.id === id).decision, 'not_drawn');
  assert.equal(W.coverage.find(c => c.id === 'G-03').decision, 'drawn_as');
  assert.deepEqual(W.works.filter(o => o.unknownBuilders.length).map(o => o.id), [], 'a builder unit id is not in the roster');
});

test('Q07/B.7.3: every pre-existing wall and fence is present from the first frame with no construction state, and no work of the draw list is a pre-existing feature', () => {
  const pre = W.preexisting(); assert.ok(pre.length >= 12);
  for (const p of pre) { assert.equal(p.present, true); assert.equal(p.construction, false); assert.equal(p.progress, 1); assert.ok(!('stage' in p)); }
  const preIds = new Set(inputs.structures.structures.filter(s => s.kind === 'preexisting_wall_or_fence').map(s => s.id)); assert.ok(preIds.has('P-01'));
  for (const o of W.works) { assert.ok(!preIds.has(o.id), o.id); assert.ok(!o.alias.some(a => preIds.has(a))); assert.equal(inputs.structures.structures.find(s => s.id === o.id).preexisting, false, o.id); }
  for (const id of preIds) assert.ok(!Object.keys(d3.works).includes(id), id + ' is given construction data');
  // the engine agrees: a pre-existing feature has no scheduled construction and is present at the first and the last time
  const E = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: inputs.works, hospitals: inputs.hospitals });
  for (const id of preIds) if (!(E.rowsByObj.get(id) || []).length) for (const t of [parseIso('1863-06-01T00:00'), parseIso('1863-07-03T12:00'), parseIso('1863-11-19T12:00')]) assert.equal(E.stateAt(id, t).present, true, id);
});

const sampleTimes = (() => { const s = []; for (let t = t0(1, 0) - 300; t <= t0(4, 6); t += 7) s.push(t); return s; })();
test('Q08: no work or segment exists before its documented start (in any scenario), the state never regresses before damage, and the engine and the draw list agree', () => {
  for (const o of W.works) for (const sc of o.scenarios) {
    const choice = { [o.id]: sc }; let first = null, prevFrac = new Map();
    for (const t of sampleTimes) {
      const r = W.engine.stateAt(o.id, msOfMin(t), sc), list = W.at(t, choice); let n = 0, ghosts = 0;
      for (let i = 0; i < list.segs.length; i += SEG_STRIDE) if (list.segs[i] === o.index) { n++; if (list.segs[i + 8] & FLAG.ghost) ghosts++; const k = list.segs[i + 1], f = list.segs[i + 10], dm = list.segs[i + 8] & FLAG.damaged; if (!dm && prevFrac.has(k)) assert.ok(f >= prevFrac.get(k) - 1e-9, `${o.id}/${sc} segment ${k} regressed at ${t}`); if (!dm) prevFrac.set(k, f); }
      if (r.present === false || r.status === 'open_gap' || r.status === 'certain_before_documented_start') assert.equal(n, 0, `${o.id}/${sc} drawn at ${isoOf(msOfMin(t))} while the engine says ${r.state}`);
      if (n && first == null) first = t;
    }
    const w = W.merged.works[o.id], b = { ...w.begin }, s = (w.scenarios || {})[sc]; if (s) { if ('begin_earliest' in s) { b.earliest = s.begin_earliest; b.default = null; } if ('begin_latest' in s) b.latest = s.begin_latest; }
    const floors = [b.earliest, b.default, b.date, b.latest].filter(Boolean).map(parseIso); if (first != null && floors.length) assert.ok(msOfMin(first) >= Math.min(...floors) - 60000, `${o.id}/${sc} first drawn ${isoOf(msOfMin(first))} before its start window`);
  }
});

test('Q08: a work with a clock window rises on screen through layout, felling and gathering, stacking and head logs to completed in the order of PDF B.7.4 (E-05 in every scenario), then is damaged on 3 July from 04:00', () => {
  const o = W.byId.get('E-05'); assert.ok(o.scenarios.length >= 4);
  for (const sc of o.scenarios) {
    const seen = new Set(); let lastMax = 0;
    for (let t = t0(2, 4); t <= t0(3, 9); t += 1) { const list = W.at(t, { 'E-05': sc }); const st = []; for (let i = 0; i < list.segs.length; i += SEG_STRIDE) if (list.segs[i] === o.index) st.push(list.segs[i + 7]); if (st.length) { for (const s of st) seen.add(s); const m = Math.max(...st); assert.ok(m >= lastMax, `${sc}: the most advanced segment regressed`); lastMax = m; } }
    for (const s of [1, 2, 3, 4, 5, 6]) assert.ok(seen.has(s), `${sc}: stage ${s} is never shown (${[...seen]})`);
  }
  const before = W.at(t0(3, 3, 50)), after = W.at(t0(3, 7, 30)); const h = l => { let m = 0; for (let i = 0; i < l.segs.length; i += SEG_STRIDE) if (l.segs[i] === o.index) m = Math.max(m, l.segs[i + 6]); return m; };
  assert.ok(h(after) < h(before) && h(after) > 0, 'the damaged work is lower than the complete one');
  const dmg = (t, id) => { const l = W.at(t); for (let i = 0; i < l.segs.length; i += SEG_STRIDE) if (l.segs[i] === W.byId.get(id).index && (l.segs[i + 8] & FLAG.damaged)) return true; return false; };
  for (const id of ['E-05', 'E-09']) { assert.equal(dmg(t0(3, 3, 59), id), false, id); assert.equal(dmg(t0(3, 7, 1), id), true, id); }
  assert.equal(dmg(t0(3, 12), 'E-03'), false);
});

test('Q08: a crew works on every work while the engine says it is being built (the builder\'s own units in a build_works activity, else a labelled stand-in crew); an unbounded window gets no invented crew and a work with no finish is flagged unfinished', () => {
  const rows = []; let stand = 0, unitCrew = 0, building = 0;
  for (const o of W.works) {
    for (let t = t0(1, 0); t <= t0(4, 0); t += 5) {
      const list = W.at(t), st = W.stateOf(o, t, null); const segs = []; for (let i = 0; i < list.segs.length; i += SEG_STRIDE) if (list.segs[i] === o.index) segs.push(i);
      const crewing = segs.filter(i => list.segs[i + 8] & FLAG.crewing); if (!crewing.length) continue; building++;
      const ub = list.status.find(s => s.id === o.id).unitsBuilding, standIn = crewing.reduce((s, i) => s + list.segs[i + 11], 0);
      assert.ok(ub.length > 0 || standIn > 0, `${o.id} is being built at ${t} with no crew`); if (ub.length) unitCrew++; else stand++;
      for (let c = 0; c < list.crew.length; c += CREW_STRIDE) if (list.crew[c + 3] === o.index) assert.equal(list.crew[c + 6], 1, 'a stand-in crew is flagged');
    }
    const lastSegs = (() => { const l = W.at(t0(4, 12)); let n = 0, u = 0; for (let i = 0; i < l.segs.length; i += SEG_STRIDE) if (l.segs[i] === o.index) { n++; if (l.segs[i + 8] & FLAG.unfinished) u++; } return { n, u }; })();
    if (!o.hasFinish && lastSegs.n) assert.equal(lastSegs.u, lastSegs.n, o.id + ' has no finish and must be flagged unfinished'); rows.push(`${o.id}:${o.hasFinish ? 'finish' : 'no finish'}`);
  }
  assert.ok(building > 50); console.log(`# crewed samples: ${building} (builder units building ${unitCrew}, stand-in crew ${stand}); ${rows.join(' ')}`);
  for (const t of sampleTimes.filter((_, i) => i % 40 === 0)) { const l = W.at(t); for (let c = 0; c < l.crew.length; c += CREW_STRIDE) assert.ok([0, 1, 2, 3].includes(l.crew[c + 5])); }
  const clips = fs.readFileSync(path.join(BT, 'app/src/anim3d/clips-misc.mjs'), 'utf8'); for (const c of ['chop_axe', 'dig_shovel', 'march_carry_rail']) assert.ok(clips.includes(c), c + ' is not a clip of the animation library');
});

test('footprints and profiles: every footprint is a plausible-procedural line on the loaded ground that follows the contour, carries the place sigma, and no work has a documented profile (the only inferred profile is the sourced Culp\'s Hill log close-fence, about 5 ft); nothing is read from the modern works', () => {
  for (const o of W.works) {
    assert.equal(o.footprint.tier, 'plausible-procedural'); assert.ok(o.footprint.sigma_m > 0); assert.ok(o.pts.length >= 2);
    for (const p of o.pts) assert.ok(Math.abs(p[0]) < T.W / 2 && Math.abs(p[1]) < T.H / 2, o.id);
    const hs = o.pts.map(p => T.h(p[0], p[1])), spread = Math.max(...hs) - Math.min(...hs); assert.ok(spread < 6, `${o.id} leaves the contour by ${spread.toFixed(1)} m`);
    assert.ok(Math.abs(o.length_m - d3.works[o.id].length_m) / d3.works[o.id].length_m < 0.02 || o.length_m <= d3.works[o.id].length_m, `${o.id}: line length ${o.length_m} vs ${d3.works[o.id].length_m}`);
    assert.notEqual(o.profile_tier, 'documented', o.id); assert.ok(['inferred', 'plausible-procedural'].includes(o.profile_tier)); assert.ok(o.height_basis.length > 10 && o.length_basis.length > 10);
    assert.ok(o.segs.every(s => s.len > 0.4 && s.len <= d3.params.segment_run_m + 1e-6), o.id);
  }
  const inferred = W.works.filter(o => o.profile_tier === 'inferred').map(o => o.id).sort(); assert.deepEqual(inferred, ['E-02', 'E-03', 'E-05', 'E-07', 'E-08', 'E-09']);
  for (const id of inferred) { assert.ok(Math.abs(W.byId.get(id).height_m - 5 * 0.3048) < 1e-3, id); assert.match(W.byId.get(id).height_basis, /5 ft/); }
  for (const id of ['E-01', 'E-04', 'E-06', 'E-12', 'E-14']) assert.equal(W.byId.get(id).profile_tier, 'plausible-procedural');
  assert.equal(W.byId.get('E-14').material, 'stone'); assert.ok(W.byId.get('E-14').height_m < 48 * 0.0254, 'the stone breastwork is as tall as a rebuilt park wall'); assert.match(W.byId.get('E-14').height_basis, /NOT derived from the modern/);
  const src = fs.readFileSync(path.join(BT, 'app/src/structures/works3d.mjs'), 'utf8'), imports = src.match(/^import .*$/gm).join('\n'); assert.ok(!/elev1863|lidar|terrain_pipeline/i.test(imports), 'works3d imports a terrain or lidar source'); assert.match(d3._doc, /nothing is taken from the modern lidar surface/);
  // the documented lengths are the printed ones
  assert.ok(Math.abs(W.byId.get('E-01').length_m - 600 * 0.9144) < 12); assert.ok(Math.abs(W.byId.get('E-05').length_m - 300 * 0.9144) < 8); assert.ok(Math.abs(W.byId.get('E-05').length_m + W.byId.get('E-09').length_m - 800 * 0.9144) < 16);
});

test('the labelled conventions and the scenario overlays: E-01/E-04 start at noon (afternoon), E-12 at 19:32 (evening, the placement convention), no other time is added; the overlays move E-03 to 2 July and E-12 to 1 July without a clock; the shared works file is untouched', () => {
  const before = JSON.stringify(inputs.works), M = mergeWorks(inputs.works, d3); assert.equal(JSON.stringify(inputs.works), before);
  assert.equal(M.works['E-01'].begin.earliest, '1863-07-01T12:00'); assert.equal(M.works['E-04'].begin.earliest, '1863-07-01T12:00'); assert.equal(M.works['E-12'].begin.earliest, '1863-07-01T19:32');
  for (const id of ['E-01', 'E-04', 'E-12']) assert.ok(M.works[id].begin.convention);
  for (const id of Object.keys(M.works)) if (!['E-01', 'E-04', 'E-12'].includes(id)) assert.deepEqual(M.works[id].begin, inputs.works.works[id].begin, id + ' begin changed');
  const E0 = makeStateEngine({ structures: inputs.structures, sched: inputs.sched, works: inputs.works, hospitals: inputs.hospitals });
  for (const id of ['E-02', 'E-03', 'E-05', 'E-06', 'E-07', 'E-08', 'E-09', 'E-14']) for (const sc of E0.scenariosFor(id)) for (const t of sampleTimes.filter((_, i) => i % 9 === 0)) assert.deepEqual(W.engine.stateAt(id, msOfMin(t), sc), E0.stateAt(id, msOfMin(t), sc), `${id}/${sc} at ${t}`);
  const o3 = W.byId.get('E-03'); assert.ok(o3.scenarios.includes('or_morning_jul2')); const cnt = (id, t, sc) => { const l = W.at(t, { [id]: sc }); let n = 0; for (let i = 0; i < l.segs.length; i += SEG_STRIDE) if (l.segs[i] === W.byId.get(id).index) n++; return n; };
  assert.ok(cnt('E-03', t0(1, 12), 'default') > 0); assert.equal(cnt('E-03', t0(1, 12), 'or_morning_jul2'), 0); assert.ok(cnt('E-03', t0(2, 12), 'or_morning_jul2') > 0);
  assert.ok(cnt('E-12', t0(2, 3), 'default') > 0); assert.ok(cnt('E-12', t0(1, 5), 'or_small_earthworks_jul1_evening') > 0 || cnt('E-12', t0(1, 12), 'or_small_earthworks_jul1_evening') > 0); assert.equal(cnt('E-12', t0(1, 5), 'default'), 0);
});

test('works purity: the draw list depends only on the time and the scenario choice, in any order; the mesh of the visible segments is valid and drapes on the ground', () => {
  const times = sampleTimes.filter((_, i) => i % 11 === 0), hs = t => { const l = W.at(t, { 'E-05': 'start_night_jul1_2_dmna' }); return JSON.stringify([Array.from(l.segs).map(v => Math.round(v * 1000)), Array.from(l.crew).map(v => Math.round(v * 1000))]); };
  const ref = new Map(times.map(t => [t, hs(t)])); for (const t of [...times].reverse()) assert.equal(hs(t), ref.get(t), 'reversed ' + t);
  let x = 5; const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647, sh = [...times]; for (let i = sh.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; } for (const t of sh) assert.equal(hs(t), ref.get(t), 'shuffled ' + t);
  const m = W.mesh(W.at(t0(3, 3))); assert.ok(m.verts.length > 1000 && m.idx.length > 1000 && m.verts.every(Number.isFinite)); let mx = 0; for (const i of m.idx) mx = Math.max(mx, i); assert.ok(mx < m.verts.length / 10);
  for (let i = 0; i < m.verts.length; i += 10) assert.ok(m.verts[i + 1] > T.hmin - 5 && m.verts[i + 1] < T.hmax + 10);
  assert.equal(W.mesh(W.at(t0(1, 0) - 600)).idx.length, 0);
});

test('the register is complete: every ws6-EG id the data files cite has a proposed register entry, and no entry claims a documented tier for a procedural value', () => {
  const dir = path.join(BT, 'GOVERNANCE/horde/ws6-structures/proposed-register'), files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const cited = new Set((JSON.stringify(train) + JSON.stringify(d3)).match(/ws6-EG-\d\d/g) || []); assert.ok(cited.size >= 4);
  for (const id of cited) assert.ok(files.some(f => f.startsWith(id)), `${id} has no proposed register entry`);
  for (const f of files) { const s = fs.readFileSync(path.join(dir, f), 'utf8'); assert.match(s, /\| Confidence tier \|/); assert.match(s, /\| Owner decision requested \|/); assert.ok(!/\| Confidence tier \| documented \|/.test(s), f + ' claims a documented tier'); }
});
