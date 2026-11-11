// Node tests, audio round 2 (horde shard vis-audio): the 1863 woods mask feeding the planner (AUD-G08), woods data integrity.
//   node --test docs/battle-theatre/app/tests/audio3d-round2.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..'), A = path.join(BT, 'app/src/audio3d/'), D = path.join(BT, 'app/data/audio3d/');
const imp = (f) => import(pathToFileURL(path.join(A, f)).href);
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const Ph = await imp('physics.mjs'), Pl = await imp('planner.mjs'), Tr = await imp('terrain.mjs'), Wd = await imp('woods.mjs'), Idx = await imp('index.mjs'), Cat = await imp('catalog.mjs');
const mkPlanner = (o = {}) => Pl.createPlanner({ atmosphere: Ph.makeAtmosphere({ tC: 26, RH: 60, pKpa: 99.3 }), listener: { pos: [0, 2, 0] }, ...o });
const fire = (id, x, z, extra = {}) => ({ type: 'fire', id, t: 10, weapon: 'm1861_springfield', x, y: 1.5, z, ...extra });
const woodsData = J(path.join(D, 'woods-mask.json'));

test('woods-mask.json: derived from the repository 1863 woods layer (sha256 matches), tier inferred, 276 polygons, rings closed, coordinates inside the Gettysburg area', () => {
  const src = path.join(BT, '../basemap1863/features/landcover/woods_1863.geojson');
  if (fs.existsSync(src)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex'), woodsData.sourceSha256, 'woods layer changed: rebuild with app/tools/build-audio3d-woods.mjs');
  assert.equal(woodsData.tier, 'inferred'); assert.equal(woodsData.polygons.length, 276); assert.equal(woodsData.features, 276);
  for (const p of woodsData.polygons) for (const r of p.rings) {
    assert.ok(r.length >= 4, p.id); assert.deepEqual(r[0], r[r.length - 1], `${p.id} ring closed`);
    for (const [lng, lat] of r) { assert.ok(lng > -77.3 && lng < -77.1 && lat > 39.75 && lat < 39.88, `${p.id} ${lng},${lat}`); }
  }
  assert.match(woodsData._doc, /Warren/); assert.match(woodsData._doc, /30 to 40 m/);
});

test("woods mask on the real world frame: polygon interiors are found, the Culp's Hill polygon contains woods cells, the mask is neither empty nor everything; lookups are memoised", async () => {
  const { nodeWorld } = await import('./node-world.mjs'); const { T } = await nodeWorld();
  const m = Wd.makeWoodsMask(woodsData, (lng, lat) => T.xz(lng, lat));
  assert.equal(m.count, 276);
  // every polygon's own interior point (area centroid of its first ring's bbox may be outside a concave ring, so take a vertex nudged inward) is found by woodsAt in most cases
  let inside = 0, tried = 0;
  for (const p of woodsData.polygons.slice(0, 120)) { const r = p.rings[0].map(([a, b]) => T.xz(a, b)); let cx = 0, cz = 0; for (const q of r) { cx += q[0]; cz += q[1]; } cx /= r.length; cz /= r.length; const hit = m.woodsAt(cx, cz); tried++; inside += hit; }
  assert.ok(inside / tried > 0.5, `most polygon centroids fall inside their own polygon (${inside}/${tried})`);
  const culp = woodsData.polygons.find((p) => /Culp/.test(p.name || '')); assert.ok(culp, "a polygon named for Culp's Hill exists");
  { const r = culp.rings[0].map(([a, b]) => T.xz(a, b)), xs = r.map((q) => q[0]), zs = r.map((q) => q[1]); let hit = 0; for (let x = Math.min(...xs); x <= Math.max(...xs); x += 20) for (let z = Math.min(...zs); z <= Math.max(...zs); z += 20) hit += m.woodsAt(x, z); assert.ok(hit > 20, `Culp polygon cells ${hit}`); }
  // a point well inside the mask: find any woods cell by scan and confirm repeat lookups agree
  let found = null; for (let x = -3000; x < 3000 && !found; x += 60) for (let z = -3000; z < 3000; z += 60) if (m.woodsAt(x, z)) { found = [x, z]; break; }
  assert.ok(found, 'some woods cell exists in the frame'); assert.equal(m.woodsAt(found[0], found[1]), 1); assert.equal(m.woodsAt(found[0], found[1]), 1);
  assert.ok(m.stats().hits > 0);
  const open = [0, 0]; // frame origin is the middle of the theatre; only assert that the mask is neither empty nor everything
  let w = 0, n = 0; for (let x = -2500; x <= 2500; x += 100) for (let z = -2500; z <= 2500; z += 100) { n++; w += m.woodsAt(x, z); }
  assert.ok(w / n > 0.03 && w / n < 0.6, `woods share of the frame ${(w / n).toFixed(3)} is plausible (not empty, not everything)`); void open;
});

test('planner: a source in woods raises the reverb send, and the plan says so (tier plausible-procedural); boost 0 or no mask leaves the plan unchanged', () => {
  const inWoods = (x, z) => x > 100 && x < 300;          // synthetic woods band
  const flat = (woodsAt) => Tr.makeTerrain({ heightAt: () => 0, woodsAt, extent: { halfW: 6000, halfH: 6000 } });
  const pOpen = mkPlanner({ terrain: flat(null) }).planEvent(fire(1, 200, 0));
  const pWood = mkPlanner({ terrain: flat(inWoods) }).planEvent(fire(1, 200, 0));
  const pOff = mkPlanner({ terrain: flat(inWoods), budget: { woodsReverbBoost: 0 } }).planEvent(fire(1, 200, 0));
  assert.equal(pOpen.woods, null); assert.ok(pWood.woods && pWood.woods.applied && pWood.woods.tier === 'plausible-procedural');
  assert.ok(pWood.reverbSend > pOpen.reverbSend, `${pWood.reverbSend} > ${pOpen.reverbSend}`); assert.ok(Math.abs(pWood.reverbSend - pOpen.reverbSend - 0.15 * pWood.woods.weight) < 1e-12);
  assert.equal(pOff.reverbSend, pOpen.reverbSend); assert.equal(pOff.woods, null);
  // physics untouched: delay, level, filter are identical (no foliage attenuation is invented)
  for (const k of ['delay', 'levelDb', 'tArrive']) assert.equal(pWood[k], pOpen[k]);
  assert.deepEqual(pWood.filter, pOpen.filter);
});

test('woodsEffect weights: source 0.5, listener 0.25, path share 0.5, capped at 1', () => {
  assert.equal(Wd.woodsEffect({ srcIn: true, lstIn: false, fraction: 0 }, 0.2).weight, 0.5);
  assert.equal(Wd.woodsEffect({ srcIn: false, lstIn: true, fraction: 0 }, 0.2).weight, 0.25);
  assert.equal(Wd.woodsEffect({ srcIn: true, lstIn: true, fraction: 1 }, 0.2).weight, 1);
  assert.equal(Wd.woodsEffect({ srcIn: false, lstIn: false, fraction: 0 }, 0.2).applied, false);
});

test('createAudio3D wires the mask from woods-mask.json when the terrain can convert lon/lat; woods:false switches it off; the panel row says what is modelled', async () => {
  const { nodeWorld } = await import('./node-world.mjs'); const { T } = await nodeWorld();
  const data = { sources: J(path.join(D, 'sources.json')), commands: J(path.join(D, 'commands.json')), calls: J(path.join(D, 'calls.json')) };
  const a = await Idx.createAudio3D({ T, data, woods: woodsData }); assert.ok(a.woods && a.woods.count === 276); assert.ok(a.terrain.woodsAt);
  const b = await Idx.createAudio3D({ T, data, woods: false }); assert.equal(b.woods, null); assert.equal(b.terrain.woodsAt, null);
  const c = await Idx.createAudio3D({ data }); assert.equal(c.woods, null);
  const row = a.panel().rows.find((r) => r.id === 'propagation'); assert.match(row.gap, /woods echo is a reverb boost/); assert.match(row.gap, /no foliage attenuation/);
});

// ------------------------------------------------------------------ round 3 (horde shard vis-audio, 2026-11-04): AUD-G11 ledger, DEC-001 as an in-page setting
const srcJson = J(path.join(D, 'sources.json')), callsJson = J(path.join(D, 'calls.json'));
const R3 = ['WC-DRILLCALL', 'WC-SCHOOLCALL', 'WC-FATIGUECALL', 'WC-CHURCHCALL', 'WC-FIRSTCALL', 'WC-TOARMS', 'WC-FIRECALL', 'WC-DOUBLETIME'];

test('AUD-G11: the eight Commons calls are ledgered (file on disk, sha256 and byte count match, public domain, in LEDGER2.csv, in the catalogue); BL-COMMONS-RATE is closed', () => {
  const csv = fs.readFileSync(path.join(BT, 'audio/pilot2/LEDGER2.csv'), 'utf8');
  for (const id of R3) {
    const s = srcJson.sources.find((x) => x.ledgerId === id); assert.ok(s, id); const buf = fs.readFileSync(path.join(BT, s.file));
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), s.sha256, id); assert.equal(buf.length, s.bytes, id);
    assert.equal(crypto.createHash('sha1').update(buf).digest('hex'), s.commonsSha1, `${id}: sha1 equals the Commons value`);
    assert.equal(s.licence, 'Public domain'); assert.equal(s.shippable, true); assert.equal(s.family, 'signals_bugle'); assert.equal(s.round, 3); assert.match(s.caveats, /not verified|no manual call is mapped/);
    assert.ok(csv.includes(s.sha256), `${id} in LEDGER2.csv`);
  }
  const fam = Cat.FAMILIES.find((f) => f.id === 'signals_bugle'); for (const id of R3) assert.ok(fam.ledger.includes(id), id);
  assert.equal(srcJson.blocked.find((b) => b.id === 'BL-COMMONS-RATE').status, 'closed');
});

test('bugle calls map to recordings by EXACT name only: Fatigue, Church, Drill, School are mapped; First Call, To Arms, Fire Call and the Marine Double Time are mapped to no manual call; no notation appears', () => {
  const by = Object.fromEntries(callsJson.bugle.map((c) => [c.name, c]));
  assert.deepEqual(by['Fatigue call'].recordings, ['WC-FATIGUECALL']); assert.deepEqual(by['Church call'].recordings, ['WC-CHURCHCALL']); assert.deepEqual(by['Drill call'].recordings, ['WC-DRILLCALL']); assert.deepEqual(by['School call'].recordings, ['WC-SCHOOLCALL']);
  const mapped = new Set([...callsJson.bugle, ...callsJson.bugle_skirmishers, ...callsJson.other_calls].flatMap((c) => c.recordings || []));
  for (const id of ['WC-FIRSTCALL', 'WC-TOARMS', 'WC-FIRECALL', 'WC-DOUBLETIME']) assert.ok(!mapped.has(id), `${id} must not be assigned to a manual call by guesswork`);
  assert.equal(callsJson.bugle.filter((c) => c.recordings.length).length, 15, '15 of the 26 general calls have a same-name stand-in');
  assert.ok(callsJson.bugle.concat(callsJson.bugle_skirmishers).every((c) => c.notation === null));
});

test('DEC-001 as an in-page setting: setLabelMode switches badge and per-sound tags, the panel rows stay identical, unknown values change nothing, the engine follows', async () => {
  const a = await Idx.createAudio3D({ data: { sources: srcJson, commands: J(path.join(D, 'commands.json')), calls: callsJson } });
  assert.equal(a.mode, 'panel-only'); assert.equal(a.badge(), null); const p2 = a.panel(); assert.ok(p2.rows.every((r) => r.onSound == null));
  assert.equal(a.setLabelMode('pdf'), 'pdf'); assert.equal(a.mode, 'pdf'); assert.equal(a.override, true); assert.ok(a.badge());
  const p1 = a.panel(); assert.ok(p1.rows.every((r) => r.onSound)); assert.deepEqual(p2.rows.map((r) => [r.id, r.kind, r.tier, r.gap]), p1.rows.map((r) => [r.id, r.kind, r.tier, r.gap]), 'nothing is hidden: the panel is identical');
  assert.equal(a.setLabelMode('nonsense'), 'pdf'); assert.equal(a.setLabelMode('panel-only'), 'panel-only'); assert.equal(a.override, false);
  const s = a.labelSetting(); assert.equal(s.decision, 'DEC-001'); assert.equal(s.default, 'panel-only'); assert.deepEqual(s.options.map((o) => o.id), ['pdf', 'panel-only']); assert.match(s.decisionStatus, /delegated authority/);
  const b = await Idx.createAudio3D({ data: { sources: srcJson, commands: J(path.join(D, 'commands.json')), calls: callsJson }, search: '?audioLabel=pdf' }); assert.equal(b.mode, 'pdf'); assert.equal(b.override, true);
});
