// Node tests (no browser) for the real history layer: converter, gazetteer provenance, strengths, Q04 on every unit, purity under shuffled evaluation, the world built from units.
//   node --test docs/battle-theatre/app/tests/history.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import crypto from 'node:crypto';
import { nodeWorld, cloneWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs';
import { loadRawFromDisk, terrainMeta, candidatePlaces, report } from '../tools/history-report.mjs';
import { notesText } from '../tools/history-notes.mjs';
import { createRealHistory, SPEED } from '../src/history/real.mjs';
import { Gazetteer, norm, insideBox, distM, boxCrossings, nearestOnLine, M_LAT, M_LNG } from '../src/history/gazetteer.mjs';
import { Placement } from '../src/history/placement.mjs';
import { ArrivalModel } from '../src/history/arrivals.mjs';
import { allocateStrengths, BASIS_PROCEDURAL } from '../src/history/strength.mjs';
import { validateLayer, validateUnits, validateArrivals, validateEvents, validateKit, TIERS, ACTIVITIES } from '../src/history/contract.mjs';
import { worldFromUnits } from '../src/world-from-units.mjs';
import { Stage, HIDDEN } from '../src/stage.mjs';
import { scrubTest } from '../../sim/cache.mjs'; import { rand } from '../../sim/rng.mjs';
import { minOf, isoToMin, BATTLE } from '../src/clock.mjs';

const ROOT = path.resolve(BT, '../..'); const fwd = p => p.split(path.sep).join('/');
const raw = loadRawFromDisk(), TM = terrainMeta();
const { T } = await nodeWorld(); const geo = makeGeo(T);
const build = (extra = {}) => createRealHistory({ raw, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 }, ...extra });
const L = build(); const ids = new Set(L.units.map(u => u.id));
const SCENARIOS = [
  {}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-004': 'v1' }, optionText: { 'C-004': 'at dawn' } }, { choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } },
  { choices: { 'C-003': 'v1', 'C-005': 'v2' }, optionText: { 'C-003': '08:00 (head of column)', 'C-005': '07:30 (EPP, FREE, PADRE)' } }, { choices: { 'C-043': 'v3' }, optionText: { 'C-043': '17:00' } },
  { choices: { 'C-023': 'v1', 'C-021': 'range' }, optionText: { 'C-023': 'mid-afternoon', 'C-021': 'night of Jul 2 (W-D2, PHIF); Jul 3 (SS2)' } },
];

test('contract: the real layer validates (units, arrivals, events, kit) in every scenario; 726 units, ids unique', () => {
  assert.deepEqual(validateLayer(L), []); assert.equal(L.units.length, 726); assert.equal(ids.size, 726); assert.deepEqual(validateUnits(L.units), []);
  for (const sc of SCENARIOS) { const { arrivals, events } = L.both(sc); assert.deepEqual(validateArrivals(arrivals, ids), []); assert.deepEqual(validateEvents(events, ids), []); }
  for (const u of L.units) assert.deepEqual(validateKit(L.kit(u.id, 0)), [], u.id);
  assert.equal(L.meta.stub, false); assert.ok(L.meta.scenarioAware);
});

test('contract 1.1 extensions are strict: a strength with no figure needs an integer drawn and may not be documented; a null entry needs a reason; the 1.0 forms still validate', () => {
  const u = JSON.parse(JSON.stringify(L.units.find(x => x.drawn))); assert.deepEqual(validateUnits([u]), []);
  const bad1 = { ...u, strength: { ...u.strength, drawn: 12.5 } }; assert.match(validateUnits([bad1])[0], /integer drawn/);
  const bad2 = { ...u, strength: { ...u.strength, tier: 'documented' } }; assert.match(validateUnits([bad2])[0], /cannot be documented/);
  const bad3 = { ...u, strength: { min: null, max: null, drawn: 5 } }; assert.match(validateUnits([bad3])[0], /basis/);
  const bad4 = { ...u, strength: { min: 10, max: 5, basis: 'x' } }; assert.match(validateUnits([bad4])[0], /range/);
  assert.deepEqual(validateUnits([{ ...u, strength: { min: 358, max: 386, basis: 'OR, range kept (C-047)', tier: 'documented' } }]), [], 'the 1.0 range form is unchanged');
  const a = L.arrivals({}).find(x => x.entry === null), ok = L.arrivals({}).find(x => x.entry); assert.deepEqual(validateArrivals([a, ok], ids), []);
  assert.match(validateArrivals([{ ...a, entry_status: undefined }], ids)[0], /entry_status/); assert.match(validateArrivals([{ ...ok, entry: { lng: 999, lat: 0, sigma_m: 1 } }], ids)[0], /entry/);
});

test('sources: every key a unit, arrival or event cites resolves; weak keys are flagged weak; no unit is documented on weak or lead sources only', () => {
  const S = L.sources, weak = [/^W-/, /^OOB-/, /^EPP$/, /^CWT/, /^PADRE$/, /^WHB/, /^SS/, /^STONE-RES$/, /^SStone/];
  const { arrivals, events } = L.both({});
  for (const u of L.units) for (const k of u.sources) assert.ok(S[k], `${u.id}: unknown source key ${k}`);
  for (const a of arrivals) for (const k of a.sources) assert.ok(S[k], `${a.unit}: unknown source key ${k}`);
  for (const e of events) for (const k of e.sources) assert.ok(S[k], `${e.unit}: unknown source key ${k}`);
  for (const [k, s] of Object.entries(S)) { assert.equal(s.key, k); assert.ok(['primary', 'secondary', 'lead', 'register', 'placeholder'].includes(s.kind)); if (weak.some(r => r.test(k))) assert.equal(s.weak, true, `${k} must be flagged weak`); }
  for (const u of L.units) if (u.tier === 'documented') assert.ok(u.sources.some(k => S[k].kind !== 'lead' && !S[k].weak), `${u.id} documented without a firm source`);
  for (const a of arrivals) if (a.tier === 'documented') assert.ok(a.sources.some(k => S[k].kind !== 'lead' && !S[k].weak), `${a.unit} arrival documented without a firm source`);
});

test('strengths: printed figures are single figures with no invented range; shares are procedural, weak, never documented, and add up to their pool', () => {
  const printed = raw.units.units.filter(u => u.strength && Number.isFinite(u.strength.strength)); assert.equal(printed.length, 21);
  for (const p of printed) { const u = L.units.find(x => x.id === p.id); assert.equal(u.strength.min, p.strength.strength); assert.equal(u.strength.max, p.strength.strength); assert.equal(u.strength.kind, 'printed'); assert.ok(u.strength.weak_source); assert.notEqual(u.tier, 'documented'); }
  const leaves = L.units.filter(u => u.strength.kind === 'procedural'); assert.ok(leaves.length > 400);
  for (const u of leaves) { assert.equal(u.strength.min, null); assert.equal(u.strength.max, null); assert.equal(u.strength.tier, 'plausible-procedural'); assert.equal(u.strength.weak_source, true); assert.ok(u.strength.basis.startsWith(BASIS_PROCEDURAL)); assert.ok(Number.isInteger(u.strength.share) && u.strength.share > 0); }
  for (const p of L.pools) { const members = leaves.filter(u => u.strength.share === p.share && L.strengths.get(u.id).pool_owner === p.owner); assert.equal(members.length, p.leaves_on_field); assert.ok(Math.abs(members.length * p.share - p.pool) <= members.length / 2 + 1, `${p.owner}: shares add up to the pool within rounding`); }
  const I = L.pools.find(p => p.owner === 'us-1c'); assert.equal(I.figure, 12160); assert.equal(I.sub_figured.length, 3); assert.equal(I.pool, 12160 - 1830 - 2015 - 1540);
});

test('gazetteer provenance: every place has source files that exist, members with coordinates found in those files, sigma_m, and no coordinate of its own', () => {
  const G = raw.gazetteer, book = JSON.parse(fs.readFileSync(path.join(BT, 'app/data/site-bookmarks.json'), 'utf8'));
  assert.ok(G.places.length >= 60); const seen = new Set();
  for (const p of G.places) {
    assert.ok(!seen.has(p.id)); seen.add(p.id); assert.ok(p.sigma_m > 0 && Number.isFinite(p.sigma_m), `${p.name}: sigma`); assert.ok(TIERS.includes(p.tier)); assert.notEqual(p.tier, 'documented'); assert.ok(p.basis && p.basis.length > 20);
    assert.ok(p.members.length >= 1); assert.ok(Number.isFinite(p.center.lng) && Number.isFinite(p.center.lat));
    for (const m of p.members) {
      const file = path.join(ROOT, m.file); assert.ok(fs.existsSync(file), `${p.name}: ${m.file} exists`); assert.ok(Number.isFinite(m.lng) && Number.isFinite(m.lat), `${p.name}: member coordinates`);
      const id = /^(RD|LC|STR|WF|RL|WT|BR)-[\w-]+/.exec(m.ref); if (id && !m.ref.startsWith('borough') && !/^\d+ features/.test(m.ref)) assert.ok(fs.readFileSync(file, 'utf8').includes(`"${id[0]}"`), `${p.name}: ${id[0]} is in ${m.file}`);
      const mon = /^monument (\d+) /.exec(m.ref); if (mon) { const b = book.monuments.find(x => x.no === +mon[1]); assert.ok(b && Math.abs(b.lat - m.lat) < 1e-5 && Math.abs(b.lng - m.lng) < 1e-5, `${p.name}: monument ${mon[1]} matches the site data`); }
      const tour = /^tour stop (\d+) /.exec(m.ref); if (tour) { const b = book.tour.find(x => x.id === +tour[1]); assert.ok(b && Math.abs(b.lat - m.lat) < 1e-5 && Math.abs(b.lng - m.lng) < 1e-5, `${p.name}: tour stop ${tour[1]} matches the site data`); }
    }
    if (p.resolution === 'aggregate' && !p.stream) { const near = p.members.filter(m => distM(m, p.center) <= p.sigma_m * 1.0001 + 1).length; assert.ok(near >= Math.floor(p.members.length * 0.85), `${p.name}: sigma holds at least 85% of its members`); }
    if (p.line) for (const q of p.line) assert.ok(Number.isFinite(q.lng) && Number.isFinite(q.lat));
  }
  for (const [f, h] of Object.entries(G.sources)) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  assert.ok(G.places.filter(p => p.resolution === 'proxy').length === 2, 'the two proxies (Seminary Ridge, Herr Ridge) are marked as proxies');
});

test('gazetteer is reproducible: rebuilding it from the repository files gives byte-identical output', () => {
  const out = path.join(process.env.TEMP || '/tmp', `gazetteer-check-${process.pid}.json`);
  const r = spawnSync(process.execPath, [path.join(BT, 'app/tools/build-gazetteer.mjs')], { encoding: 'utf8', env: { ...process.env, GAZ_OUT: out } }); assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.readFileSync(out).equals(fs.readFileSync(path.join(BT, 'app/data/gazetteer.json'))), 'data/gazetteer.json is stale: run node docs/battle-theatre/app/tools/build-gazetteer.mjs'); fs.unlinkSync(out);
});

test('gazetteer: a name it cannot resolve stays unresolved (no guess); an ambiguous name is not resolved; the ledger place names it lacks are listed', () => {
  const gz = new Gazetteer(raw.gazetteer);
  for (const n of ['Moritz’s Tavern', 'Goulden Road', 'Cress Ridge', 'Benner’s Hill', 'Granite Schoolhouse', 'Fairfield Road', 'Nowhere Ridge', 'Taneytown', 'Westminster', 'Hanover', 'Falling Waters', 'Monterey Pass', 'Beitler farm']) assert.equal(gz.resolve(n), null, n);
  for (const n of ['Emmitsburg Road', 'McPherson Ridge', 'Culp’s Hill', 'Seminary Ridge', 'Herr Ridge', 'Cemetery Hill', 'Little Round Top', 'the town', 'Cashtown', 'Hunterstown', 'Heidlersburg', 'Bryan farm', 'Baltimore Pike, 1 mile east of Rock Creek']) assert.ok(gz.resolve(n), n);
  assert.equal(gz.resolve('Seminary Ridge').resolution, 'proxy'); assert.equal(gz.resolve('Herr Ridge').resolution, 'proxy');
  const c = candidatePlaces(raw); assert.ok(c.reliable.size > 30 && c.loose.size > 10);
  const un = [...c.reliable.keys()].filter(k => !gz.resolve(k)); assert.ok(un.includes('Moritz’s Tavern') && un.includes('Goulden Road') && !un.includes('Bryan farm'));
});

test('villages come from the Hopkins 1858 control points: the converted coordinates reproduce the distances of the file and the position of the Diamond, and the derived Baltimore Pike point lies 1 mile along the pike from the bridge', () => {
  const gcp = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/basemap1863/maps/gcps/hopkins_county.json'), 'utf8')).gcps, byName = n => gcp.find(g => g.name === n), gz = new Gazetteer(raw.gazetteer);
  const C = gz.resolve('Cashtown'), H = gz.resolve('Hunterstown'), E = gz.resolve('Heidlersburg');
  for (const [p, nm] of [[C, 'Cashtown'], [H, 'Hunterstown'], [E, 'Heidlersburg']]) { const g = byName(nm); assert.ok(p.members[0].ref.includes(`E ${g.en[0]}, N ${g.en[1]}`), nm); assert.equal(p.members[0].file, 'docs/basemap1863/maps/gcps/hopkins_county.json'); assert.equal(p.sigma_m, 500); }
  const planar = (a, b) => Math.hypot(a.en[0] - b.en[0], a.en[1] - b.en[1]) / 0.9996;                // UTM grid distance to ground distance (scale factor 0.9996 at this longitude, to 0.1%)
  for (const [a, b, pa, pb] of [['Cashtown', 'Hunterstown', C, H], ['Hunterstown', 'Heidlersburg', H, E]]) assert.ok(Math.abs(distM(pa.center, pb.center) / planar(byName(a), byName(b)) - 1) < 0.002, `${a}-${b} distance agrees with the map's own grid to 0.2%`);
  // the borough GCP is the Diamond within the 376 m the map README gives: place it from Cashtown by the file's own E,N offsets
  const G = byName('Gettysburg'), pred = { lng: C.center.lng + (G.en[0] - byName('Cashtown').en[0]) / M_LNG, lat: C.center.lat + (G.en[1] - byName('Cashtown').en[1]) / M_LAT };
  assert.ok(distM(pred, gz.resolve('The Diamond').center) < 500, `Gettysburg control point is ${Math.round(distM(pred, gz.resolve('The Diamond').center))} m from the Diamond`);
  const bp = gz.resolve('Baltimore Pike, 1 mile east of Rock Creek'), pike = gz.resolve('Baltimore Pike'), br = bp.members[0]; assert.equal(br.ref.slice(0, 6), 'BR-002');
  { const d = distM(bp.center, { lng: br.lng, lat: br.lat }); assert.ok(d > 1300 && d < 1615, `a mile along the pike is ${Math.round(d)} m in a straight line (the pike bends)`); } assert.ok(bp.center.lng > br.lng, 'east of the creek'); assert.ok(nearestOnLine(pike.line, bp.center).d < 2, 'on the pike');
});

test('placement: every curated phrase is printed in its ledger cell; a doctored phrase, unit, place, sigma, date or clause is refused', () => {
  const gz = new Gazetteer(raw.gazetteer), mk = doc => new Placement({ doc, gaz: gz, units: raw.units.units, rows: raw.arrivals.rows, box: TM.meta });
  assert.deepEqual(mk(raw.placement).validate(), []);
  const bad = JSON.parse(JSON.stringify(raw.placement)), pick = (arr, id) => arr.find(e => e.id === id);
  pick(bad.approach, 'AP-01').phrase = 'on the Chambersburg Pike'; pick(bad.positions, 'PO-01').place = 'Narnia'; pick(bad.positions, 'PO-02').units = ['no-such-unit']; pick(bad.positions, 'PO-03').t = '1863-07-01T16:45';
  bad.clauses[0].phrase = 'Jul 9 invented'; const unr = bad.clauses.find(c => c.status === 'unresolved'); unr.reason = ''; const tr = bad.clauses.find(c => c.status === 'transcribed' && c.place); tr.sigma_m += 1; const dt = bad.clauses.find(c => c.status === 'transcribed' && c.t_basis === 'printed' && c.t); dt.t = dt.t.slice(0, 8) + '28' + dt.t.slice(10);
  const problems = mk(bad).validate(); assert.ok(problems.some(p => /AP-01.*phrase/.test(p)) && problems.some(p => /PO-01.*Narnia/.test(p)) && problems.some(p => /PO-02.*unknown unit/.test(p)) && problems.some(p => /PO-03.*16:45/.test(p)), problems.join('\n'));
  assert.ok(problems.some(p => new RegExp(`${bad.clauses[0].id}.*phrase`).test(p)) && problems.some(p => new RegExp(`${unr.id}.*reason`).test(p)) && problems.some(p => new RegExp(`${tr.id}.*sigma_m`).test(p)) && problems.some(p => new RegExp(`${dt.id}.*date`).test(p)), problems.join('\n'));
  assert.throws(() => createRealHistory({ raw: { ...raw, placement: bad }, T: TM }), /placement\.json does not hold/);
});

test('clauses: all 44 rows, every key-position, night-position, first-on-field and left-or-moved clause is transcribed or unresolved with its reason; every phrase is literally in its cell; no text of a cell is left uncovered; the file is reproducible', () => {
  const P = raw.placement, rows = new Map(raw.arrivals.rows.map(r => [r.id, r])), CELLS = ['key_positions', 'night_positions', 'first_on_field', 'left_or_moved'];
  assert.equal(P.version, 2); assert.equal(rows.size, 44); assert.equal(new Set(P.clauses.map(c => c.row)).size, 44, 'every ledger row has clauses');
  // literal phrases (exact text, no folding) in every clause and every driving entry
  for (const e of [...P.clauses, ...P.approach, ...P.positions, ...P.activities, ...P.departures]) { assert.ok(CELLS.includes(e.cell), e.id); assert.ok(String(rows.get(e.row).raw[e.cell]).includes(e.phrase), `${e.id}: "${e.phrase}" is not literally in ${e.row}/${e.cell}`); }
  // coverage: what is left of each cell when the clauses are taken out is only date labels and punctuation
  for (const row of raw.arrivals.rows) for (const cell of CELLS) {
    const text = String(row.raw[cell] ?? ''); if (!text.trim()) continue; const used = P.clauses.filter(c => c.row === row.id && c.cell === cell).map(c => { const i = text.indexOf(c.phrase); assert.ok(i >= 0); return [i, i + c.phrase.length]; }).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < used.length; i++) assert.ok(used[i][0] >= used[i - 1][1], `${row.id}/${cell}: two clauses overlap`);
    let rest = '', pos = 0; for (const [a, b] of used) { rest += text.slice(pos, a) + ' '; pos = b; } rest += text.slice(pos);
    rest = rest.replace(/\b(Jun|Jul)\s+\d{1,2}(?:\s*-\s*(?:(?:Jun|Jul)\s+)?\d{1,2})?(?:\s+night)?\s*:?/g, ' ').replace(/[\s,.;:()\-–“”"']+/g, ' ').trim(); assert.equal(rest, '', `${row.id}/${cell}: text not covered`);
  }
  // statuses, reasons, tiers, sources as printed, gazetteer sigma
  const gz = new Gazetteer(raw.gazetteer); let nT = 0, nU = 0;
  for (const c of P.clauses) {
    assert.deepEqual(c.sources, rows.get(c.row).source_keys.all, `${c.id}: sources as printed in the row`);
    if (c.status === 'unresolved') { nU++; assert.ok(c.reason.length > 8, c.id); assert.ok(!c.drives, c.id); const m = /“([^”]+)” has no coordinate/.exec(c.reason); if (m) assert.equal(gz.resolve(m[1]), null, `${c.id}: ${m[1]} is in the gazetteer after all`); }
    else { nT++; assert.equal(c.status, 'transcribed'); assert.ok(['inferred', 'plausible-procedural'].includes(c.tier), `${c.id}: no clause is documented (claim_support_verified is false for every row)`); assert.ok(c.units.length); if (c.place) assert.equal(gz.resolve(c.place).sigma_m, c.sigma_m); for (const q of c.places || []) assert.equal(gz.resolve(q.place).sigma_m, q.sigma_m); assert.ok((c.drives || []).length || c.not_driving, c.id); }
  }
  assert.equal(nT + nU, P.clauses.length); assert.ok(P.clauses.length >= 371, 'at least the 371 clauses of the semicolon/sentence split'); assert.ok(raw.arrivals.rows.reduce((a, r) => a + String(r.raw.key_positions || '').split(';').filter(x => x.trim()).length, 0) <= P.clauses.filter(c => c.cell === 'key_positions').length);
  // every driving entry names its clause and the clause names it
  const ids = new Set(P.clauses.map(c => c.id)); for (const e of [...P.approach, ...P.positions, ...P.activities, ...P.departures]) { assert.ok(ids.has(e.clause), `${e.id}: clause`); assert.ok(P.clauses.find(c => c.id === e.clause).drives.includes(e.id), `${e.id}: listed by its clause`); }
  // reproducible from the table
  const out = path.join(process.env.TEMP || '/tmp', `placement-check-${process.pid}.json`);
  const r = spawnSync(process.execPath, [path.join(BT, 'app/tools/build-placement.mjs')], { encoding: 'utf8', env: { ...process.env, PLACEMENT_OUT: out } }); assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.readFileSync(out).equals(fs.readFileSync(path.join(BT, 'app/data/placement.json'))), 'data/placement.json is stale: run node docs/battle-theatre/app/tools/build-placement.mjs'); fs.unlinkSync(out);
  console.log(`# ${P.clauses.length} clauses: ${nT} transcribed, ${nU} unresolved; ${P.approach.length} approaches, ${P.positions.length} stops, ${P.activities.length} activities, ${P.departures.length} departures`);
});

test('Q04 on every unit: nothing exists before its earliest arrival, in every scenario; children never before their parent unless they carry their own printed time; JS gates never earlier than the Python checker', () => {
  const am = new ArrivalModel({ units: raw.units.units, arrivals: raw.arrivals, notOnField: raw.notOnField });
  for (const sc of SCENARIOS) {
    const { arrivals, events } = L.both(sc), first = new Map(arrivals.map(a => [a.unit, a]));
    for (const e of events) { const a = first.get(e.unit); assert.ok(a, `${e.unit} has events but no arrival`); assert.ok(e.t >= a.earliest, `${e.unit} ${e.type} at ${e.t} before earliest ${a.earliest}`); }
    for (const a of arrivals) { assert.ok(a.earliest <= a.default && a.default <= a.latest); const u = raw.units.units.find(x => x.id === a.unit); if (u.parent) { const pa = first.get(u.parent), g = raw.arrivals.gates[a.unit]; if (pa && !(g && g.kind === 'printed_clock')) assert.ok(a.earliest >= pa.earliest, `${a.unit} before its parent ${u.parent} (${sc.choices ? JSON.stringify(sc.choices) : 'default'})`); } }
    assert.deepEqual([...first.keys()].filter(id => am.notOnField(id)), [], 'a unit listed as never on the field has an arrival');
  }
  // Python checker: gate_time per unit and selector
  const py = `import sys,json; sys.path.insert(0, r'${path.join(ROOT, 'tools/bt').replace(/\\/g, '/')}'); import check_arrivals as c; D=c.load(); print(json.dumps({u:{s:c.gate_time(u,s)[0] for s in ('earliest','default','latest')} for u in D['u']}))`;
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }); assert.equal(r.status, 0, r.stderr);
  const gates = JSON.parse(r.stdout); let equal = 0, later = 0; const { arrivals } = L.both({});
  for (const a of arrivals) { const g = gates[a.unit]; if (!g || !g.default) continue; const own = raw.arrivals.gates[a.unit];
    for (const [k, v] of [['earliest', a.earliest], ['default', a.default]]) { const pyT = isoToMin(g[k]); assert.ok(v >= pyT, `${a.unit} ${k}: layer ${v} earlier than checker ${pyT}`); if (v === pyT) equal++; else { later++; assert.ok(!own || ['date_floor', 'event_floor', 'named_period_convention'].includes(own.kind), `${a.unit}: later than the checker without a floor gate`); } } }
  console.log(`# gates: ${equal} equal to the Python checker, ${later} later (floor gates lifted to their parent's time)`);
});

test('scenarios: a conflict choice moves exactly the gates linked to it, uses only a clock the chosen value prints (or a labelled convention), and says so when it cannot', () => {
  const eff = (sc, id) => L.model.effective(id, sc, { civilDawn: m => m + 4 * 60 + 3 });
  const base = eff({}, 'us-2c'); assert.equal(base.default, minOf(7, 2, 6)); assert.equal(base.earliest, minOf(7, 1, 22, 30));
  assert.equal(eff(SCENARIOS[1], 'us-2c').default, minOf(7, 1, 22, 30));
  assert.equal(eff(SCENARIOS[2], 'us-2c').default, minOf(7, 2, 4, 3), 'at dawn: civil dawn of that date from the ephemeris helper'); assert.match(eff(SCENARIOS[2], 'us-2c').notes.join(' '), /civil dawn/);
  assert.equal(eff(SCENARIOS[3], 'us-2c').default, minOf(7, 2, 7)); assert.equal(eff(SCENARIOS[3], 'us-2c').latest, minOf(7, 2, 7));
  assert.equal(eff({ choices: { 'C-004': 'range' } }, 'us-2c').default, minOf(7, 1, 22, 30), 'range: drawn from the earliest value'); assert.match(eff({ choices: { 'C-004': 'range' } }, 'us-2c').notes.join(' '), /every value shown/);
  assert.equal(eff(SCENARIOS[3], 'us-2c-2d').default, minOf(7, 2, 7), 'the division the ledger links to C-004 follows too');
  assert.equal(eff(SCENARIOS[3], 'us-3c-2d').default, eff({}, 'us-3c-2d').default, 'a printed gate not linked to C-004 does not move');
  assert.ok(eff(SCENARIOS[3], 'us-2c-1d').default >= eff(SCENARIOS[3], 'us-2c').default, 'a floor gate (date only) follows its parent and is never drawn before it');
  assert.equal(eff(SCENARIOS[4], 'cs-1c-hood').default, minOf(7, 2, 7, 30)); assert.equal(eff(SCENARIOS[4], 'us-5c').default, minOf(7, 2, 8));
  const c23 = eff(SCENARIOS[6], 'cs-cav-hampton'); assert.equal(c23.default, eff({}, 'cs-cav-hampton').default); assert.match(c23.notes.join(' '), /carries no clock/, 'a value with no clock leaves the gate and says so');
  // children follow their parent's chosen time unless they have their own printed time
  const a1 = L.both(SCENARIOS[3]).arrivals, a0 = L.both({}).arrivals; const k = id => a1.find(a => a.unit === id).default - a0.find(a => a.unit === id).default;
  assert.ok(k('us-2c-2d-harrow') > 0 || k('us-2c-2d-harrow') === 0); assert.equal(k('us-1c-1d'), 0);
  // C-043 moves the retreat's step-off only: the Iron Brigade's 19th Indiana has stops PO-01, PO-11, PO-03 (the retreat), PO-07; the retreat is its third path
  const uid = 'us-1c-1d-meredith-19in', legIdx = L.plans.get(uid).stops.findIndex(s => s.po === 'PO-03'), paths = sc => L.events(sc).filter(e => e.unit === uid && e.type === 'path' && e.sources.includes('PLACEMENT'));   // the ledger legs only (from v7 the regiment also marches to its two state-ordered troop-map positions of 1 Jul, legs tagged with the sheet's source)
  const ev0 = paths({}), ev1 = paths(SCENARIOS[5]); assert.equal(ev0.length, L.plans.get(uid).stops.length); assert.equal(ev1.length, ev0.length);
  for (let i = 0; i < legIdx; i++) assert.deepEqual(ev0[i], ev1[i], 'the legs before the retreat do not depend on C-043');
  assert.ok(ev0[legIdx].t < minOf(7, 1, 17), 'default: the retreat steps off before 17:00 and arrives on the printed 17:00'); assert.ok(Math.abs(ev0[legIdx].wp.at(-1).t - minOf(7, 1, 17)) < 1e-6);
  assert.ok(ev1[legIdx].t >= minOf(7, 1, 17) - 1e-9, 'C-043 = 17:00: step-off at the chosen clock'); assert.ok(ev1[legIdx].wp.at(-1).t > minOf(7, 1, 17), 'so it cannot arrive by 17:00 and is reported late');
  assert.ok(L.report(SCENARIOS[5]).defects.some(d => d.stop === 'PO-03'), 'the late retreat is in the defect list'); assert.ok(!L.report({}).defects.some(d => d.stop === 'PO-03'));
});

test('purity: arrivals, events and the world are the same whatever the order of evaluation (shuffled scenarios, fresh layers, repeated calls)', () => {
  const key = sc => JSON.stringify(sc), hash = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
  const ref = new Map(SCENARIOS.map(sc => [key(sc), hash(L.both(sc))]));
  for (let round = 0; round < 3; round++) {
    const layer = build(); const order = SCENARIOS.map((s, i) => [rand(11, round, i), s]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    for (const sc of order) { assert.equal(hash(layer.both(sc)), ref.get(key(sc)), `scenario ${key(sc)} differs (round ${round})`); layer.arrivals(sc); layer.events(sc); }
  }
  const a = hash(L.both({})), b = hash(L.both({})); assert.equal(a, b);
  const w1 = worldFromUnits(T, geo, build()), w2 = worldFromUnits(T, geo, build()); assert.equal(hash([...w1.unitF, ...w1.sold]), hash([...w2.unitF, ...w2.sold]));
  const d = hash(L.report({ choices: {} })); assert.equal(d, hash(L.report({})));
});

test('events: time ordered, no leave, every enter is off the loaded ground and at the unit\'s path start, no movement faster than double-quick, arrival is a march', () => {
  for (const sc of SCENARIOS.slice(0, 3)) {
    const { events, arrivals } = L.both(sc), A = new Map(arrivals.map(a => [a.unit, a]));
    const departing = new Set(L.placement.dep.flatMap(d => d.units)), chainOf = id => L.placement.chain(id);
    let last = -Infinity; for (const e of events) { assert.ok(e.t >= last); last = e.t; if (e.type === 'leave') assert.ok(chainOf(e.unit).some(x => departing.has(x)), `${e.unit} leaves without a departure entry`); }
    const enter = new Map(); for (const e of events) if (e.type === 'enter') { assert.ok(!enter.has(e.unit), 'one enter per unit'); enter.set(e.unit, e); assert.ok(!insideBox(e.at, TM.meta), `${e.unit} enters inside the loaded ground`); assert.equal(e.t, A.get(e.unit).default); assert.ok(e.t >= A.get(e.unit).earliest); }
    for (const e of events) if (e.type === 'path') { assert.ok(enter.has(e.unit) && enter.get(e.unit).t <= e.t); for (let i = 1; i < e.wp.length; i++) { const v = distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60); assert.ok(v <= SPEED.double_quick * 1.0001 + 1e-9, `${e.unit}: ${v.toFixed(2)} m/s`); } }
    const firstPath = new Map(); for (const e of events) if (e.type === 'path' && !firstPath.has(e.unit)) firstPath.set(e.unit, e);
    for (const [u, p] of firstPath) assert.ok(distM(p.wp[0], enter.get(u).at) < 1, `${u}: first path starts where it entered (it waits in its column until it marches)`);
  }
});

test('ledger time versus the edge of the loaded ground is a reported data property, not a hidden defect: the gate is not moved, the march is not shortened, the offset is on the report and on the card; defects are only other lateness', () => {
  const rep = L.report({}), A = new Map(L.both({}).arrivals.map(a => [a.unit, a])), ev = L.events({}), enter = new Map(ev.filter(e => e.type === 'enter').map(e => [e.unit, e]));
  const late = rep.offsets.filter(o => o.late_min > 0); assert.ok(late.length >= 30, `${late.length} units whose first ledger place is farther than the ledger time allows`); assert.equal(rep.defects.length, 0, 'no lateness of another cause in the default scenario');
  for (const o of rep.offsets) {
    assert.ok(['ledger_vs_edge', 'cascade'].includes(o.kind)); assert.ok(o.distance_m > 0); const a = A.get(o.unit);
    assert.equal(enter.get(o.unit).t, a.default, `${o.unit}: the unit exists from its gate, not earlier`); assert.ok(enter.get(o.unit).t >= a.earliest);
    if (o.kind === 'ledger_vs_edge') {   // late iff the march from the gate at double-quick cannot make the printed time
      const lateness = a.default + o.distance_m / SPEED.double_quick / 60 - o.documented; assert.ok(Math.abs(o.late_min - Math.max(0, Math.round(lateness))) <= 1 || (lateness <= 0.5 && o.late_min === 0), `${o.unit} ${o.stop}: late ${o.late_min} vs ${lateness.toFixed(1)}`);
      if (o.late_min > 0) { const p = ev.find(e => e.unit === o.unit && e.type === 'path'); assert.ok(Math.abs(p.t - a.default) < 1e-6, 'the march starts at the gate'); assert.ok(o.arrives > o.documented); assert.ok((o.distance_m - 0.5) / ((o.arrives - p.t) * 60) <= SPEED.double_quick * 1.0001, 'at double-quick, never faster (the reported distance is rounded to a metre; the waypoint speeds are checked unrounded in the pop test)'); }
    }
  }
  for (const u of L.units.filter(u => u.drawn && L.plans.get(u.id).stops.length)) {
    assert.match(u.notes, /Enters the map where .+ leaves the loaded ground; the ledger time \(\d\d:\d\d at .+\) refers to a place [\d.]+ km farther on/, u.id); assert.match(A.get(u.id).entry_status, /ledger time \(\d\d:\d\d at .+\) refers to a place [\d.]+ km farther on/);
  }
  const first = rep.offsets.find(o => o.stop === 'PO-01' && o.late_min > 0); assert.ok(first.distance_m > 7000, 'the McPherson Ridge offset is the 7.5 to 8.5 km of the notes (more for units farther back in the column)');
});

test('approaches: every drawn unit takes the nearest printed road of its own line of command; the tier is inferred below the corps and plausible-procedural under a corps-level road; the card says so; no unit without a printed road in its chain is drawn', () => {
  const P = { approach: L.placement.ap }, byAp = new Map(P.approach.map(a => [a.id, a])), U = new Map(raw.units.units.map(u => [u.id, u]));
  const chain = id => { const o = []; for (let u = U.get(id); u; u = U.get(u.parent)) o.push(u.id); return o; };
  let inf = 0, proc = 0, mod = 0;
  for (const u of L.units) {
    const own = chain(u.id).map(x => P.approach.find(a => a.unit === x)).find(Boolean);
    if (!u.drawn) { if (u.render.status === 'not_drawn') assert.ok(!own || !L.plans.get(u.id) || L.plans.get(u.id).status === 'unresolved', `${u.id}: not drawn although a road is printed in its chain`); continue; }
    assert.ok(own, `${u.id} is drawn without a printed road in its chain`); assert.equal(u.approach.id, own.id); const owner = U.get(own.unit), corps = owner.level === 'corps';
    const modelled = own.kind === 'sibling'; assert.equal(u.approach.tier, corps || modelled ? 'plausible-procedural' : own.tier); assert.equal(u.approach.modelled, modelled); assert.equal(u.approach.inherited, own.unit !== u.id); assert.equal(u.approach.owner, own.unit); if (modelled) mod++; else if (corps) proc++; else inf++;
    assert.match(u.notes, new RegExp(`Approach ${own.id}: ${own.road}`)); assert.match(u.notes, /order of march within a column is an open gap/); assert.match(u.notes, modelled ? /MODELLED APPROACH \(plausible-procedural; evidence gap EG-0070/ : corps ? /only the corps-level road is printed/ : /Approach tier inferred/); assert.match(u.notes, /EG-0005/);
    assert.ok(u.approach.column.index >= 1 && u.approach.column.index <= u.approach.column.size);
    const a = L.arrivals({}).find(x => x.unit === u.id); assert.ok(a.entry && a.entry_status.includes(own.id)); if (corps) assert.equal(a.tier, 'plausible-procedural'); assert.ok(['inferred', 'plausible-procedural'].includes(a.tier));
  }
  assert.ok(inf >= 30 && proc >= 30 && mod >= 30, `${inf} inferred, ${proc} plausible-procedural (corps-level road), ${mod} modelled`);
  // an approach whose road never enters the loaded ground gives no entry and says why on the card (AP-07)
  const u = L.units.find(x => x.id === 'us-3c-2d-carr-1ma'); assert.equal(u.drawn, false); assert.match(u.render.reason, /Black Horse Tavern Road.*does not cross into the loaded ground/);
  // column order is roster (ledger) order within one road
  const col = L.units.filter(x => x.drawn && x.approach.id === 'AP-01'); assert.deepEqual(col.map(x => x.approach.column.index), col.map((_, i) => i + 1)); assert.deepEqual(col.map(x => x.id), L.units.filter(x => col.includes(x)).map(x => x.id));
});

test('stops respect the gates: a unit is never given a place that falls before its own ledger gate (Stannard is not at McPherson Ridge at 10:20), a place it already stands at is not repeated, and the stops of a unit are time ordered', () => {
  const stan = L.plans.get('us-1c-3d-stannard-13vt'); assert.deepEqual(stan.stops.map(s => s.po), ['PO-13'], 'Stannard (gate Jul 2 18:00) has only the Cemetery Ridge place');
  for (const [id, p] of L.plans) { if (!p.stops.length) continue; const g = L.model.effective(id, {}, { civilDawn: m => m + 4 * 60 + 3 }).earliest; let last = -Infinity, lastPlace = null; for (const s of p.stops) { assert.ok(s.t_doc >= g - 1e-6, `${id} ${s.po} at ${s.t_doc} before its gate ${g}`); assert.ok(s.t_doc >= last, `${id}: stops out of order`); assert.notEqual(s.place, lastPlace, `${id}: repeated place ${s.place}`); last = s.t_doc; lastPlace = s.place; } }
  const w = L.plans.get('us-1c-1d-meredith-6wi'); assert.deepEqual(w.skipped.map(x => x.reason), ['already at this place'], 'the “same” entry of Jul 2 night is dropped: the unit already stands at Culp’s Hill');
});

test('positions are continuous and no faster than double-quick: every path begins where the last one ended (or where the unit entered), within a metre, and a unit is never between two places without a path', () => {
  for (const sc of SCENARIOS) {
    const ev = L.events(sc), by = new Map(); for (const e of ev) { if (!by.has(e.unit)) by.set(e.unit, []); by.get(e.unit).push(e); }
    for (const [id, list] of by) {
      let at = null, tEnd = -Infinity; for (const e of list) {
        if (e.type === 'enter') { at = e.at; tEnd = e.t; continue; }
        if (e.type === 'path') { assert.ok(distM(e.wp[0], at) < 1, `${id}: path starts ${distM(e.wp[0], at).toFixed(1)} m from where the unit stood`); assert.ok(e.t >= tEnd - 1e-9, `${id}: path starts before the previous one ended`); for (let i = 1; i < e.wp.length; i++) { const v = distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60); assert.ok(v <= SPEED.double_quick * 1.0001 + 1e-9); } at = e.wp.at(-1); tEnd = e.wp.at(-1).t; }
      }
    }
  }
});

test('activities and departures exist only where a clause prints them: every build_works / camp / rest / serve_guns / gallop event traces to an activity entry that covers the unit and is not earlier than the entry; no unit leaves without a departure clause; a constructed departure marches the unit out along its road and removes it', () => {
  const special = new Set(['build_works', 'camp', 'rest', 'serve_guns', 'gallop']), P = raw.placement, U = new Map(raw.units.units.map(u => [u.id, u])), chain = id => { const o = []; for (let u = U.get(id); u; u = U.get(u.parent)) o.push(u.id); return o; };
  const ev = L.events({}); let n = 0;
  for (const e of ev) if (e.type === 'activity' && special.has(e.activity)) { n++; const ch = chain(e.unit), src = P.activities.filter(a => a.activity === e.activity && a.units.some(u => ch.includes(u))); assert.ok(src.length, `${e.unit}: ${e.activity} at ${e.t} has no clause`); assert.ok(src.some(a => e.t >= isoToMin(a.t) - 1e-9), `${e.unit}: ${e.activity} before every clause that names it`); }
  assert.ok(n > 5, `${n} printed activities drawn`); assert.equal(P.departures.length, 0, 'no left-or-moved clause of the PDF ledger names a destination the gazetteer can place with a road'); { const dep = L.placement.dep; assert.ok(dep.every(d => d.claim), 'every departure comes from a position-ledger claim'); const leaves = ev.filter(e => e.type === 'leave'); for (const e of leaves) assert.ok(dep.some(d => chain(e.unit).some(x => d.units.includes(x))), `${e.unit} leaves without a departure entry`); for (const d of dep) assert.ok(isoToMin(d.t) != null && d.claim && d.road, d.id); }
  // every activity word of the table maps to a clip the renderer has
  for (const a of P.activities) assert.ok(a.activity in ACTIVITIES, a.id);
  // a constructed departure (the phrase is a printed left-or-moved clause; the unit and the road are the test's): the unit walks to the road, along it to the edge of the ground, and is gone
  const doc = JSON.parse(JSON.stringify(P)), tcl = doc.clauses.find(c => c.status === 'transcribed' && c.drives && c.drives.length); doc.departures.push({ id: 'DP-99', units: ['us-1c-1d-meredith-19in'], row: 'us-cav-3d', cell: 'left_or_moved', phrase: 'Jul 4 10:00 Kilpatrick moves out (Monterey Pass)', t: '1863-07-04T10:00', t_basis: 'printed', road: 'Emmitsburg Road', tier: 'inferred', note: 'constructed for the test', clause: tcl.id }); tcl.drives.push('DP-99');
  const Ld = createRealHistory({ raw: { ...raw, placement: doc }, T: TM, helpers: { civilDawn: m => m + 4 * 60 + 3 } }), evd = Ld.events({}).filter(e => e.unit === 'us-1c-1d-meredith-19in'), leave = evd.filter(e => e.type === 'leave'), paths = evd.filter(e => e.type === 'path');
  assert.equal(leave.length, 1); assert.ok(leave[0].t >= minOf(7, 4, 10), 'not before the printed 10:00'); assert.ok(evd.at(-1) === leave[0], 'nothing after the leave'); assert.ok(paths.at(-1).wp.at(-1).t === leave[0].t, 'the leave is at the end of the march out');
  const lastWp = paths.at(-1).wp.at(-1); assert.ok(!insideBox(lastWp, TM.meta), 'the unit ends outside the loaded ground'); assert.ok(distM(paths.at(-1).wp[0], paths.at(-2).wp.at(-1)) < 1, 'it starts from where it stood');
  const { st } = (() => { const layer = Ld, world = worldFromUnits(T, geo, layer), s = new Stage({ layer, world, T, geo }); s.loadScenario({}); return { st: s }; })(); assert.equal(st.rejected.length, 0);
  const i = st.index.get('us-1c-1d-meredith-19in'); st.apply(minOf(7, 4, 9)); assert.equal(st.present[i], 1); st.apply(leave[0].t + 1); assert.equal(st.present[i], 0, 'gone after it left');
  // a departure from a unit that never entered the ground just ends it; a road that does not leave the ground from where the unit stood is reported, not guessed
  const doc2 = JSON.parse(JSON.stringify(doc)); doc2.departures[0].road = 'Table Rock Road'; const L2 = createRealHistory({ raw: { ...raw, placement: doc2 }, T: TM }); assert.ok(L2.plans.get('us-1c-1d-meredith-19in').departures[0].error, 'a road that does not leave the ground is reported');
});

test('what is drawn: only units with a printed road of approach; every drawn unit has an entry, every other leaf says why not; counts add up', () => {
  const c = L.counts; assert.equal(c.total, 726); assert.equal(c.moving + c.edge_only + c.not_drawn + c.aggregate + c.not_on_field, 726); assert.ok(c.moving > 0 && c.edge_only > 0 && c.not_drawn > 100);
  const { arrivals } = L.both({}), A = new Map(arrivals.map(a => [a.unit, a]));
  for (const u of L.units) {
    if (u.drawn) { assert.ok(A.get(u.id).entry, `${u.id}: drawn without an entry`); assert.ok(u.strength.drawn > 0); assert.equal(u.tier, 'plausible-procedural'); }
    else { assert.equal(u.strength.drawn, 0); if (u.render.status === 'not_drawn') { assert.equal(u.tier, 'open gap'); assert.match(u.render.reason, /^Open gap: /); assert.equal(A.get(u.id).entry, null); assert.ok(A.get(u.id).entry_status.length > 20); } }
    if (u.children.length) assert.equal(u.drawn, false);
  }
  // the roads that give an entry are exactly the curated approaches
  const withEntry = new Set(arrivals.filter(a => a.entry).map(a => a.unit)); for (const id of withEntry) assert.ok(L.placement.approachOf(id), `${id} has an entry without a printed approach`);
});

test('world from units: one world unit per layer unit, one soldier per figure (no cap), undrawn units have none', () => {
  const w = worldFromUnits(T, geo, L), G0 = L.units.filter(u => u.guns.status === 'drawn').reduce((a, u) => a + u.guns.count, 0); assert.equal(w.units.length, 726 + G0, 'one world unit per layer unit, then one per drawn gun piece (its detachment)');
  const want = L.units.reduce((a, u) => a + (u.drawn ? u.strength.drawn : 0), 0); assert.equal(w.count, want); assert.ok(want > 5000);
  L.units.forEach((u, i) => { assert.equal(w.units[i].count, u.drawn ? u.strength.drawn - (u.guns.status === 'drawn' ? 9 * u.guns.count : 0) : 0, u.id); assert.equal(w.unitF[i * 12 + 11], w.units[i].count); });
  for (let i = 0; i < w.count; i++) { const ui = w.sold[i * 4 + 3]; assert.ok(i >= w.units[ui].first && i < w.units[ui].first + w.units[ui].count); }
  assert.equal(w.units.filter(u => u.klass === 1).reduce((a, u) => a + u.count, 0), L.units.filter(u => u.drawn && u.arm === 'cavalry').reduce((a, u) => a + u.strength.drawn, 0));
});

const mkStage = (sc = {}) => { const layer = build(), world = worldFromUnits(T, geo, layer), st = new Stage({ layer, world, T, geo }); st.loadScenario(sc); return { layer, st, world }; };
test('stage with the real layer: Q04 at every sampled minute, entries off the ground, a march in, no event refused, no pops (movement within double-quick), purity (Q12)', () => {
  for (const sc of [{}, SCENARIOS[3]]) {
    const { layer, st } = mkStage(sc); assert.equal(st.rejected.length, 0, 'no event is refused'); const A = new Map(layer.arrivals(sc).map(a => [a.unit, a])), W = T.W / 2, H = T.H / 2;
    for (let t = BATTLE.from; t < BATTLE.to; t += 17) { st.apply(t); for (let i = 0; i < layer.units.length; i++) { const id = layer.units[i].id, p = st.presence[id]; if (st.present[i]) { assert.ok(p && t * 60 >= p.from, `${id} drawn at ${t} before its window`); assert.ok(layer.units[i].drawn, `${id} present but not a drawn unit`); } else assert.equal(st.w.unitF[i * 12], HIDDEN); } }
    // exactly at its default time a drawn unit is present and outside the loaded ground; one second earlier it is not there
    for (const u of layer.units) if (u.drawn) { const a = A.get(u.id); st.apply(a.default - 1 / 60); const i = st.index.get(u.id); assert.equal(st.present[i], 0, `${u.id} present a second before it enters`); st.apply(a.default); assert.equal(st.present[i], 1); assert.ok(Math.abs(st.cx[i]) > W || Math.abs(st.cz[i]) > H, `${u.id} enters on the loaded ground`); }
    // one-minute steps: no unit moves further than double-quick allows; units that are placed only at the edge stay outside the ground
    st.apply(BATTLE.from); let px = Float32Array.from(st.cx), pz = Float32Array.from(st.cz), pp = Uint8Array.from(st.present), worst = 0;
    for (let t = BATTLE.from + 1; t < BATTLE.to; t++) { st.apply(t); for (let i = 0; i < layer.units.length; i++) { if (st.present[i] && pp[i]) worst = Math.max(worst, Math.hypot(st.cx[i] - px[i], st.cz[i] - pz[i])); if (st.present[i] && layer.plans.get(layer.units[i].id).status === 'edge_only') assert.ok(Math.abs(st.cx[i]) > W || Math.abs(st.cz[i]) > H, 'edge-only unit inside the loaded ground'); } px.set(st.cx); pz.set(st.cz); pp.set(st.present); }
    assert.ok(worst <= SPEED.double_quick * 60 * 1.01 + 0.5, `largest one-minute move ${worst.toFixed(1)} m`);
    let k = 0; const r = scrubTest(st.cache, BATTLE.from * 60, BATTLE.to * 60, 120, () => rand(7, 3, k++)); assert.deepEqual(r.mismatches, []);
  }
});

test('works and structures follow tools/bt/check_structures.py state_at: a pre-existing wall is present from frame one with no construction; a work is never drawn before the checker says it exists and is complete after its finish', () => {
  const pre = L.objects.filter(o => o.pre_existing), works = L.objects.filter(o => !o.pre_existing); assert.ok(pre.length >= 10 && works.length >= 5);
  for (const o of pre) { assert.equal(o.built, null); assert.equal(L.objectProgress(o, BATTLE.from), 1); assert.equal(L.objectProgress(o, BATTLE.to), 1); }
  for (const o of works) { assert.equal(L.objectProgress(o, BATTLE.from), 0); assert.equal(L.objectProgress(o, o.built.to), 1); assert.ok(o.line === null && (o.at === null || o.at.sigma_m > 0)); if (o.built.from != null && o.built.from < o.built.to) assert.equal(L.objectProgress(o, o.built.from), 0); }
  const times = []; for (let t = BATTLE.from; t < BATTLE.to; t += 97) times.push(t);
  const iso = t => { const d = Math.floor(t / 1440), m = t - d * 1440, dt = new Date(Date.UTC(1863, 5, 1 + d, Math.floor(m / 60), Math.floor(m % 60))); return dt.toISOString().slice(0, 16); };
  const ids = [...pre, ...works].map(o => o.ref), py = `import sys,json; sys.path.insert(0, r'${fwd(path.join(ROOT, 'tools/bt'))}'); import check_structures as c; ids=${JSON.stringify(ids)}; ts=${JSON.stringify(times.map(iso))}; print(json.dumps({i:[(lambda r:[r.get('present'), r.get('status'), r.get('stage')])(c.state_at(i,t)) for t in ts] for i in ids}))`;
  const r = spawnSync('python', ['-c', py], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' }, maxBuffer: 1 << 26 }); assert.equal(r.status, 0, r.stderr);
  const S = JSON.parse(r.stdout); let early = 0, checked = 0;
  for (const o of [...pre, ...works]) times.forEach((t, k) => { const [present, status, stage] = S[o.ref][k], prog = L.objectProgress(o, t); checked++;
    if (o.pre_existing) { assert.equal(prog, 1); if (status === 'certain') assert.equal(present, true); return; }
    if (present === false) assert.equal(prog, 0, `${o.ref} drawn at ${iso(t)} while the checker says it does not exist yet`);
    if (prog > 0) { assert.equal(present, true, `${o.ref} drawn at ${iso(t)} where the checker says ${present}`); } else if (present === true) early++;
    if (stage === 5 && status !== 'inferred_damage_state_derived_window') assert.equal(prog, 1, `${o.ref} not complete at ${iso(t)} after its finish`); });
  console.log(`# ${checked} object/time pairs checked against state_at; ${early} where the checker already shows a work present and the layer, being stricter, does not yet`);
  assert.equal(L.objectsSkipped.length + works.length, 11, 'every work with a construction is either drawn or listed as skipped'); assert.ok(L.objectsSkipped.every(x => x.reason === 'no finish time in the record'));
});

test('report: counts, lists and defects are computable and consistent with the layer', () => {
  const r = report(raw); assert.equal(r.counts.total, 726); assert.equal(r.moving.length + r.edge_only.length, r.counts.drawn); assert.equal(r.units_without_position.length, r.counts.not_drawn);
  const reasons = Object.values(r.unresolved_reasons).reduce((a, b) => a + b, 0); assert.ok(reasons <= r.counts.not_drawn && r.counts.not_drawn - reasons <= 10, 'every open-gap leaf has a stated reason except headquarters and staff entries');
  console.log(`# ${r.counts.moving} units placed, ${r.counts.edge_only} at the arrival edge only, ${r.counts.not_drawn} open gap, ${r.counts.aggregate} formations, ${r.counts.not_on_field} not on the field; ${r.figures_drawn} figures drawn; ${r.late_arrivals.length} late arrivals; ${r.place_candidates.unresolved.length + r.place_candidates.loose_unresolved.length} printed place names unresolved`);
});

test('HISTORY-LAYER-NOTES.md is current: it equals what tools/history-notes.mjs writes from the layer and data now', () => {
  assert.equal(fs.readFileSync(path.join(BT, 'app/HISTORY-LAYER-NOTES.md'), 'utf8'), notesText(raw), 'stale: run node docs/battle-theatre/app/tools/history-notes.mjs');
});
