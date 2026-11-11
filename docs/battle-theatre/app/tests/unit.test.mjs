// Node-side tests: contract, event cache purity, arrival rule, sky, geometry, data files. No browser.
//   node --test docs/battle-theatre/app/tests/unit.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { nodeWorld, cloneWorld, BT } from './node-world.mjs';
import { makeGeo } from '../src/geo.mjs'; import { createStubHistory, optionTime } from '../src/history/stub.mjs'; import { Stage, HIDDEN } from '../src/stage.mjs';
import { validateLayer, validateUnits, validateArrivals, validateEvents, validateKit } from '../src/history/contract.mjs';
import { minOf, isoToMin, parts, fmtDate, fmtTime, BATTLE, EPILOGUE } from '../src/clock.mjs'; import { sunMoon } from '../src/astro.mjs'; import { Environment } from '../src/environment.mjs';
import { scrubTest } from '../../sim/cache.mjs'; import { rand } from '../../sim/rng.mjs';

const { T, base } = await nodeWorld(); const geo = makeGeo(T);
const mk = (o = {}) => { const layer = createStubHistory({ base, T, geo, ...o }); const st = new Stage({ layer, world: cloneWorld(base), T, geo }); return { layer, st }; };
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));

test('clock: minute arithmetic and weekdays (3 Jul 1863 was a Friday)', () => {
  assert.equal(minOf(6, 25, 1), 34620); assert.equal(isoToMin('1863-07-03T13:30'), minOf(7, 3, 13, 30));
  assert.equal(fmtDate(minOf(7, 3, 13), true), 'Friday 3 July 1863'); assert.equal(fmtDate(minOf(11, 19)), 'Thu 19 Nov 1863'); assert.equal(fmtTime(minOf(7, 3, 13, 5)), '13:05');
  assert.equal(parts(BATTLE.to - 1).dom, 14); assert.equal(parts(EPILOGUE.from).mon, 'Nov');
});

test('geo: lng/lat round trip through the terrain frame', () => {
  for (const [x, z] of [[0, 0], [1500, -1200], [-2900, 2800]]) { const [lng, lat] = geo.lnglat(x, z), [x2, z2] = geo.xz(lng, lat); assert.ok(Math.hypot(x - x2, z - z2) < 1e-3); }
});

test('history contract: units, arrivals, events and kit of the stub validate; the demo tiers exist only on request', () => {
  const { layer } = mk(); assert.deepEqual(validateLayer(layer), []); assert.deepEqual(validateUnits(layer.units), []);
  const { arrivals, events } = layer.both({}); const ids = new Set(layer.units.map(u => u.id));
  assert.deepEqual(validateArrivals(arrivals, ids), []); assert.deepEqual(validateEvents(events, ids), []); assert.deepEqual(validateKit(layer.kit(layer.units[0].id, 0)), []);
  assert.equal(layer.units.length, 992); assert.ok(layer.units.every(u => u.tier === 'plausible-procedural' && u.stub), 'every stub unit is a placeholder tier');
  assert.ok(mk({ tiersDemo: true }).layer.units.some(u => u.tier === 'documented'), 'demo mode shows all tiers');
});

test('arrival rule Q04: nothing is present before its earliest arrival, in every scenario, over the whole range; the early event is refused', () => {
  const scenarios = [{}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1', 'C-005': '05:30' } }];
  for (const sc of scenarios) {
    const { layer, st } = mk(); const info = st.loadScenario(sc); assert.equal(info.rejected, 1, 'the deliberately early path is refused'); assert.match(st.rejected[0].reason, /Q04/);
    const first = new Map(); let checked = 0;
    for (let t = BATTLE.from; t < BATTLE.to; t += 11) {
      st.apply(t);
      for (let i = 0; i < st.n; i++) {
        const id = layer.units[i].id, p = st.presence[id];
        if (st.present[i]) { assert.ok(t * 60 >= p.from, `${id} drawn at ${t} before ${p.from / 60}`); if (!first.has(id)) first.set(id, [t, st.cx[i], st.cz[i]]); checked++; }
        else assert.equal(st.w.unitF[i * 12], HIDDEN);
      }
    }
    assert.equal(first.size, 992); assert.ok(checked > 1e5);
    for (const [id, [, x, z]] of first) assert.ok(Math.abs(x) > T.W / 2 - 1000 || Math.abs(z) > T.H / 2 - 1000, `${id} must first be seen near the edge (within one 11-minute step of marching), not in the middle of the field`);
  }
});

test('scenario: conflict C-004 moves the arrival window of its placeholder group; earliest follows the chosen printed time', () => {
  const { layer } = mk();
  const a0 = layer.arrivals({ choices: {}, optionText: { 'C-004': '06:00 Jul 2 (head), tails later' } }), a1 = layer.arrivals({ choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } });
  const g = a0.filter(a => a.conflict === 'C-004'); assert.ok(g.length > 20); assert.ok(g.every(a => a.earliest === minOf(7, 2, 6)));
  assert.ok(a1.filter(a => a.conflict === 'C-004').every(a => a.earliest === minOf(7, 1, 22, 30)));
  assert.equal(optionTime('at dawn', { day: [7, 2] }, {}), null);
  assert.equal(optionTime('at dawn', { day: [7, 2] }, { civilDawn: m => m + 240 }), minOf(7, 2, 4));
});

test('Q12 scrub: random-access seeks give the state of sequential playback (cache level and live tables), forward and backward', () => {
  const { st } = mk(); st.loadScenario({}); let k = 0; const rnd = () => rand(7, 1, k++);
  const r = scrubTest(st.cache, BATTLE.from * 60, BATTLE.to * 60, 120, rnd); assert.deepEqual(r.mismatches, []);
  const times = Array.from({ length: 60 }, (_, i) => BATTLE.from + Math.floor(rand(3, 9, i) * (BATTLE.to - BATTLE.from))); const seq = new Map();
  { const s2 = mk().st; s2.loadScenario({}); for (const t of [...times].sort((a, b) => a - b)) { s2.apply(t); seq.set(t, s2.liveHash()); } }
  for (const t of times) { st.apply(t); assert.equal(st.liveHash(), seq.get(t), `live tables at ${t}`); st.apply(BATTLE.from + 5); st.apply(t); assert.equal(st.liveHash(), seq.get(t), `live tables at ${t} after a detour`); }
  assert.equal(st.header().code, 'bt-sim-0.1'); assert.equal(st.header().seed, 1863);
});

test('sky: the table is read where it exists; the formula for 7-14 Jul agrees with the table where both exist', () => {
  const e = J('environment/ephemeris_1863.json'), seg = e.segments[0], c = seg.columns, m0 = minOf(6, 26); let ds = 0, dm = 0, n = 0;
  for (let q = 0; q < seg.n_rows; q += 41) { const r = sunMoon(m0 + q); ds = Math.max(ds, Math.abs(r.sunAlt - c.sun_alt_deg[q])); dm = Math.max(dm, Math.abs(r.moonAlt - c.moon_alt_deg[q])); n++; }
  console.log(`# formula against the table, ${n} minutes: sun altitude max error ${ds.toFixed(3)} deg, moon altitude max error ${dm.toFixed(3)} deg`); assert.ok(ds < 0.05 && dm < 0.2);
  const env = new Environment(e, J('environment/weather_timeline.json')), s = {};
  assert.equal(env.sample(minOf(7, 3, 15), s).src, 'table'); assert.ok(Math.abs(s.sunAz - 259) < 2 && Math.abs(s.sunAlt - 49) < 1.5, 'sun az 259 alt 49 at 15:00 on 3 Jul (PDF B.10.2)');
  assert.equal(env.sample(minOf(7, 10, 12), s).src, 'formula'); assert.equal(env.sample(minOf(11, 19, 12), s).src, 'table');
});

test('night is dimmed but never black: exposure never falls below the floor, and falls with the sun', () => {
  const env = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json')), s = {}, o = {}; let min = 9, max = 0;
  for (let t = minOf(6, 26); t < minOf(7, 15); t += 13) { env.sample(t, s); env.light(s, { nightFloor: 0.34 }, null, o); min = Math.min(min, o.exposure); max = Math.max(max, o.exposure); assert.ok(o.exposure >= 0.34 - 1e-9); assert.ok(Number.isFinite(o.sunDir[0]) && o.sunDir[1] > 0); }
  assert.ok(max > 0.9 && min < 0.5, `exposure range ${min.toFixed(2)}..${max.toFixed(2)}`);
  env.sample(minOf(7, 3, 1), s); env.light(s, { nightFloor: 0.5 }, null, o); assert.ok(o.exposure >= 0.5);
});

test('weather: states come from the weather file; gaps are said; conflicts are choices', () => {
  const env = new Environment(J('environment/ephemeris_1863.json'), J('environment/weather_timeline.json'));
  assert.equal(env.weatherAt(minOf(7, 3, 18)).precip.kind, 'storm'); assert.equal(env.weatherAt(minOf(7, 10, 12)).record, false);
  assert.ok(env.weatherAt(minOf(7, 4, 15), {}).precip.intensity > 0.5); assert.equal(env.weatherAt(minOf(7, 4, 15), { 'CF-JUL4-RAIN-TIMING': 'opt1' }).precip.kind, 'rain');
  assert.equal(env.weatherAt(minOf(7, 3, 14)).tempF, 87); assert.deepEqual(env.weatherAt(minOf(7, 3, 12)).wind.mph, [2, 6]); assert.deepEqual(env.weatherAt(minOf(7, 3, 12), { 'CF-WIND-SPEED': 'opt0' }).wind.mph, [12, 12]);
});

test('timeline file: 691 rows; phrase-only rows have no minute; ids unique; tiers valid', () => {
  const rows = fs.readFileSync(path.join(BT, 'GOVERNANCE/timeline_windows.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
  assert.equal(rows.length, 691); const phrase = rows.filter(r => r.parse_status === 'phrase_only'); assert.equal(phrase.length, 295); assert.ok(phrase.every(r => r.default === null));
  assert.equal(new Set(rows.map(r => r.id)).size, 691); assert.ok(rows.every(r => ['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(r.tier)));
});

test('site bookmarks: 16 tour stops and 512 monuments, derived read-only; the embed key, narration and pano ids are not copied', () => {
  const file = path.join(BT, 'app/data/site-bookmarks.json'), raw = fs.readFileSync(file, 'utf8'), b = JSON.parse(raw);
  assert.equal(b.tour.length, 16); assert.equal(b.monuments.length, 512); assert.ok(!/AIza/.test(raw) && !/"history"/.test(raw) && !/pano/.test(raw));
  assert.equal(b.monuments.filter(m => m.side === 'Union').length, 457); assert.equal(b.monuments.filter(m => m.side === 'Confederate').length, 40);
  assert.deepEqual(b.tour.map(s => s.id), Array.from({ length: 16 }, (_, i) => i + 1));
});

test('conflict register: all 47 are present, and the weather file adds its own carried conflicts', () => {
  assert.equal(J('GOVERNANCE/conflict_register.json').length, 47); assert.ok(J('environment/weather_timeline.json').conflicts_carried_as_ranges.length >= 5);
});

test('no pops over the whole window: in 1-minute steps every unit moves at most marching speed; units enter and leave only off the loaded ground', () => {
  const { st } = mk(); st.loadScenario({}); const n = st.n, W = T.W / 2, H = T.H / 2; st.apply(BATTLE.from);
  let px = Float32Array.from(st.cx), pz = Float32Array.from(st.cz), pp = Uint8Array.from(st.present), worst = 0, enters = 0, leaves = 0, bad = 0;
  for (let t = BATTLE.from + 1; t < BATTLE.to; t++) {
    st.apply(t);
    for (let i = 0; i < n; i++) {
      if (st.present[i] && pp[i]) worst = Math.max(worst, Math.hypot(st.cx[i] - px[i], st.cz[i] - pz[i]));
      else if (st.present[i] && !pp[i]) { enters++; if (!(Math.abs(st.cx[i]) > W - 150 || Math.abs(st.cz[i]) > H - 150)) bad++; }
      else if (!st.present[i] && pp[i]) { leaves++; if (!(Math.abs(px[i]) > W - 150 || Math.abs(pz[i]) > H - 150)) bad++; }
    }
    px.set(st.cx); pz.set(st.cz); pp.set(st.present);
  }
  console.log(`# ${BATTLE.to - BATTLE.from} one-minute steps: largest move ${worst.toFixed(2)} m (marching speed allows 75 m), ${enters} entries, ${leaves} exits, ${bad} on the loaded ground`);
  assert.ok(worst <= 75.01 && enters === 992 && leaves === 992 && bad === 0);
});

test('scenario options carry every printed value: all 47 register rows split into values / plan recommendation / others, and nothing printed is lost', async () => {
  const { loadConflicts, tidy } = await import('../src/data.mjs'); const conf = await loadConflicts(), reg = J('GOVERNANCE/conflict_register.json'), norm = s => tidy(s).replace(/\s+/g, ' ');
  const r = conf.filter(c => c.kind === 'register'); assert.equal(r.length, 47);
  for (const c of r) {
    const src = reg.find(x => x.id === c.id).text.split(' | ').slice(1).join(' '); assert.ok(c.printed.values != null, `${c.id} split into columns`);
    assert.equal(norm(`${c.printed.values} ${c.printed.recommended} ${c.printed.others}`), norm(src), `${c.id}: printed columns equal the register text`);
    assert.equal(c.options[0].key, 'delegated'); assert.equal(c.options[1].key, 'recommended'); assert.equal(c.options.at(-1).key, 'range'); assert.ok(c.options.length >= 3, `${c.id} offers its values`);
  }
  const c4 = r.find(c => c.id === 'C-004'); assert.deepEqual(c4.options.filter(o => /^v\d/.test(o.key)).map(o => o.label), ['22:30 Jul 1', 'at dawn', '06:00', '07:00 Jul 2']);
  const w = conf.filter(c => c.kind === 'weather'); assert.ok(w.length >= 5 && w.every(c => c.options[0].key === 'recommended' && c.options.length >= 2));
});
