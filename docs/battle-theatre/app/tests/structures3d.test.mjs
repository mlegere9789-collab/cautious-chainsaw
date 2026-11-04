// Node tests (no browser) for the 3D structures: the JS port of check_structures.state_at against the Python function, the builder's data, the geometry reader,
// no pre-placement, no construction animation for a pre-existing feature, purity under shuffled evaluation.
//   node --test docs/battle-theatre/app/tests/structures3d.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { BT } from '../tools/node-terrain.mjs';
import { makeStateEngine, parseIso, isoOf } from '../src/structures/state.mjs';
import { nodeTerrain } from '../tools/node-terrain.mjs';
import { buildModel, FENCE_GEN, msOfMin, CLASSES } from '../src/structures/model.mjs';
import { extrude, triangulate, minRect, panelsAlong, clipRuns, polyArea, signedArea, splitTriByLine, GEN, railPanelMesh, wormPanelMesh, stonePanelMesh, markerMesh } from '../src/structures/geom.mjs';
import { classify, unmapped, visualOf } from '../src/structures/visual-state.mjs';
import { Gazetteer } from '../src/history/gazetteer.mjs';
import { buildObjects } from '../src/history/objects.mjs';

const ROOT = path.resolve(BT, '../..'), fwd = p => p.split(path.sep).join('/');
const rj = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const structures = rj('structures/structures.json'), sched = rj('structures/state_schedule.json'), works = rj('structures/works_stages.json'), hospitals = rj('structures/hospitals.json');
const E = makeStateEngine({ structures, sched, works, hospitals });

// ---- the ids and times both sides evaluate
const ids = [...new Set([...structures.structures.map(s => s.id), ...structures.structures.flatMap(s => (s.parts || []).map(p => p.id)), ...hospitals.hospitals.map(h => h.id)])];
const times = (() => {
  const s = new Set(); const t0 = parseIso('1863-06-26T00:00'), t1 = parseIso('1863-07-14T23:59');
  for (let t = t0; t <= t1; t += 311 * 60000) s.add(t);                                       // a grid over the battle window
  for (const iso of ['1863-07-20T12:00', '1863-07-22T12:00', '1863-08-06T12:00', '1863-11-10T12:00', '1863-11-19T12:00', '1863-11-20T23:59']) s.add(parseIso(iso));
  for (const r of sched.rows) {                                                               // every bound of every row and scenario, and a minute either side
    const ws = [r.time.window, r.time.begin, r.time.finish, ...Object.values(r.scenarios || {}).flatMap(x => [x.window, x.begin, x.finish, x.phase_open]), ...(r.phases || []).flatMap(p => [p.window, ...Object.values(p.scenarios || {}).map(q => q.window)])];
    for (const w of ws) for (const x of w || []) if (x) { const m = parseIso(x); s.add(m - 60000); s.add(m); s.add(m + 60000); }
  }
  for (const w of Object.values(works.works)) for (const b of [w.begin, w.finish, w.damage_stage, ...Object.values(w.scenarios || {})]) for (const x of Object.values(b || {})) if (typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(x)) { const m = parseIso(x); s.add(m - 60000); s.add(m); s.add(m + 60000); }
  for (const h of hospitals.hospitals) for (const w of [h.setup_window, h.closing_window]) for (const x of (w && w.window) || []) if (x) { const m = parseIso(x); s.add(m - 60000); s.add(m); s.add(m + 60000); }
  return [...s].sort((a, b) => a - b).filter(t => t >= parseIso('1863-06-01T00:00') && t <= parseIso('1863-12-01T00:00'));
})();

function pythonResults() {
  const py = `import sys,json; sys.path.insert(0, r'${fwd(path.join(ROOT, 'tools/bt'))}'); import check_structures as c, datetime as dt
ids=${JSON.stringify(ids)}; ts=${JSON.stringify(times.map(isoOf))}
out={}
for i in ids:
    for sc in c.scenarios_for(i):
        res=[]
        for t in ts:
            try:
                r=c.state_at(i,t,sc); res.append([r.get('state'),r.get('status'),r.get('present'),r.get('rows'),r.get('stage'),r.get('progress'),r.get('from_state'),r.get('to_state'),r.get('flag')])
            except KeyError as e: res.append(['KeyError'])
        out[i+'|'+sc]=res
sys.stdout.write(json.dumps(out))`;
  const r = spawnSync('python', ['-I', '-c', py], { encoding: 'utf8', maxBuffer: 1 << 29, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout);
}

test('state_at: the JS port equals tools/bt/check_structures.py for every record, part, hospital and scenario at a grid of times and at every bound of every row (+-1 minute)', () => {
  const py = pythonResults(); let n = 0, bad = [];
  for (const key of Object.keys(py)) {
    const [id, sc] = key.split('|'); const col = py[key];
    const js = E.scenariosFor(id); assert.ok(js.includes(sc), `scenario ${sc} of ${id} is unknown to the port`);
    times.forEach((t, k) => {
      const exp = col[k]; let r; try { r = E.stateAt(id, t, sc); } catch (e) { r = null; }
      if (exp.length === 1) { if (r) bad.push(`${key} ${isoOf(t)}: python KeyError, JS answered`); return; }
      if (!r) { bad.push(`${key} ${isoOf(t)}: JS threw`); return; }
      const got = [r.state, r.status, r.present ?? null, r.rows ?? null, r.stage ?? null, r.progress ?? null, r.from_state ?? null, r.to_state ?? null, r.flag ?? null];
      const ok = got.every((v, j) => (j === 5 ? (v === null && exp[j] === null) || (v !== null && exp[j] !== null && Math.abs(v - exp[j]) < 1e-5) : JSON.stringify(v) === JSON.stringify(exp[j])));
      n++; if (!ok && bad.length < 12) bad.push(`${key} ${isoOf(t)}: python ${JSON.stringify(exp)} JS ${JSON.stringify(got)}`); else if (!ok) bad.push('+');
    });
  }
  console.log(`# ${n} (id, scenario, time) evaluations equal to the Python function; ${Object.keys(py).length} id/scenario series, ${times.length} times each`);
  assert.equal(bad.length, 0, bad.slice(0, 12).join('\n'));
  assert.ok(n > 60000);
});

test('state_at is pure: the answer at a time does not depend on the order of evaluation (shuffled, reversed and interleaved passes)', () => {
  const sample = ids.filter(i => E.knows(i)).slice(0, 200), seeds = [1, 2, 3];
  const ref = new Map(); for (const id of sample) for (const sc of E.scenariosFor(id)) for (const t of times) ref.set(`${id}|${sc}|${t}`, JSON.stringify(E.stateAt(id, t, sc)));
  const keys = [...ref.keys()]; let x = 12345; const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
  for (const pass of seeds) {
    const order = [...keys]; if (pass === 1) order.reverse(); else for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (const k of order.slice(0, 40000)) { const [id, sc, t] = k.split('|'); assert.equal(JSON.stringify(E.stateAt(id, +t, sc)), ref.get(k), k); }
  }
});

test('Q08: no work exists before its documented start, and a pre-existing wall or fence is present from the first frame with no construction', () => {
  for (const [id, w] of Object.entries(works.works)) {
    if (!w.construction_applies) continue;
    for (const sc of E.scenariosFor(id)) {
      let prev = -1;
      for (const t of times) { const r = E.stateAt(id, t, sc); if (r.present === true) { prev = Math.max(prev, t); } }
      const earliest = [w.begin.earliest, w.begin.default, w.begin.date, w.begin.latest].filter(Boolean).map(parseIso).filter(x => x != null);
      const first = times.find(t => E.stateAt(id, t, sc).present === true);
      if (first != null && earliest.length) assert.ok(first >= Math.min(...earliest) - 60000, `${id} (${sc}) present at ${isoOf(first)} before its start window`);
    }
  }
  for (const s of structures.structures.filter(s => s.kind === 'preexisting_wall_or_fence' && !(E.rowsByObj.get(s.id) || []).length)) {
    for (const t of [times[0], times.at(-1)]) { const r = E.stateAt(s.id, t); assert.equal(r.present, true); assert.match(r.state, /no construction/); }
  }
});

// ======================================================================================================== the geometry reader and the model
const T = await nodeTerrain(), data = rj('app/data/structures3d.json'), inv = rj('app/data/structures3d-inventory.json');
const BM = path.join(ROOT, 'docs/basemap1863/features'), bm = f => JSON.parse(fs.readFileSync(path.join(BM, f), 'utf8'));
const gaz = new Gazetteer(rj('app/data/gazetteer.json')), OB = buildObjects({ raw: { structures, works }, gaz });
const model = buildModel({ data, T, engine: E, workObjs: OB.list.filter(o => o.at), workProgress: OB.progress });
const t0m = (d, h = 0, mi = 0) => ((d - 1) * 1440 + h * 60 + mi) + 30 * 1440;        // minutes since 1 June 00:00 for July day d

test('the builder output is current (tools/build-structures3d.mjs --check) and every number in the inventory matches the model', () => {
  const r = spawnSync(process.execPath, [path.join(BT, 'app/tools/build-structures3d.mjs'), '--check'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stdout + r.stderr);
  const c = model.counts, drawn = k => inv.features.filter(f => f.decision === 'drawn' && f.class === k).length, markers = inv.features.filter(f => f.decision === 'marker').length;
  assert.equal(c.buildings + c.masses, drawn('buildings')); assert.equal(c.fences, drawn('fences')); assert.equal(c.roads, drawn('roads')); assert.equal(c.markers, markers); assert.equal(c.dropped, 0);
  for (const f of inv.features) assert.ok(f.decision && f.reason, `${f.id} has no decision or reason`);
  for (const r2 of inv.records) assert.ok(r2.decision && r2.reason, `${r2.id} has no decision or reason`); assert.equal(inv.records.length, structures.structures.length);
});

test('no geometry is invented: every drawn building ring, fence line, point and road line is a copy of a feature of the basemap layers, with its sources, error and confidence', () => {
  const str = new Map(bm('structures/structures.geojson').features.map(f => [f.properties.id, f])), fen = new Map(bm('roads-rail-water/fences.geojson').features.map(f => [f.properties.id, f]));
  const rd2 = new Map([...bm('roads-rail-water/roads.geojson').features, ...bm('roads-rail-water/lanes.geojson').features, ...bm('roads-rail-water/railways.geojson').features, ...bm('roads-rail-water/bridges.geojson').features].map(f => [f.properties.id, f]));
  const r6 = v => Math.round(v * 1e6) / 1e6;
  for (const b of data.buildings) { const f = str.get(b.id); assert.ok(f && f.geometry.type === 'Polygon', b.id); assert.deepEqual(b.ring, f.geometry.coordinates[0].map(c => [r6(c[0]), r6(c[1])]), b.id + ' ring differs from the basemap polygon'); assert.ok(b.src.length && b.err != null && b.conf && b.tier, b.id + ' lacks sources, error, confidence or tier'); assert.equal(b.present, true); }
  for (const p of data.points) { const f = str.get(p.id) || rd2.get(p.id); assert.ok(f && f.geometry.type === 'Point', p.id); assert.deepEqual(p.pt, f.geometry.coordinates.map(r6), p.id); assert.ok(p.src.length && p.err != null && p.tier, p.id); }
  for (const f of data.fences) { const g = fen.get(f.id); assert.ok(g && g.properties.present_1863 === true && g.properties.draw === true, f.id + ' is not a confirmed fence'); assert.deepEqual(f.coords, g.geometry.coordinates.map(c => [r6(c[0]), r6(c[1])]), f.id); assert.equal(f.err, g.properties.positional_error_m); assert.ok(f.src.length && f.check.verdict === 'confirmed'); }
  for (const r of data.roads) { const g = rd2.get(r.id); assert.ok(g && g.properties.present_1863 === true && g.properties.confidence !== 'Unknown', r.id); assert.ok(r.src.length && r.err != null && r.surface_basis && r.width_basis); }
  assert.ok(!data.roads.some(r => r.id === 'RL-003' || r.id === 'RL-005'), 'a post-1863 railway is drawn');
  // a point is a marker, never a building: no point has a mesh footprint
  const mk = model.objects.filter(o => o.cls === 'markers'); assert.ok(mk.length > 100); for (const o of mk) assert.ok(!o.ring && !o.form.eaveH, o.id);
  // a mass is labelled a schematic mass and is flat-topped
  for (const o of model.objects.filter(o => o.cls === 'masses')) { assert.equal(o.form.wall, 'schematic'); assert.equal(o.form.rise, 0); assert.match(o.geometry.represents, /extent of drawn building symbols/); }
});

test('dimensions: only printed ones are used as printed; the generic ones are labelled plausible-procedural and none is taken from the modern rebuilt walls (48-52 in.)', () => {
  assert.ok(FENCE_GEN.stone.h < 48 * 0.0254 * 0.7, 'the generic stone wall is as tall as a rebuilt park wall'); assert.ok(Math.abs(FENCE_GEN.rail.h - 5 * 0.3048) < 0.01); assert.ok(Math.abs(FENCE_GEN.rail.len - 11 * 0.3048) < 0.01);
  assert.match(FENCE_GEN.rail.basis, /generic/); assert.match(FENCE_GEN.stone.basis, /NOT the 48-52 in/);
  for (const o of model.objects.filter(o => o.cls === 'fences')) { assert.equal(o.form.tier, 'plausible-procedural'); assert.match(o.form.basis, /generic/); }
  for (const o of model.objects.filter(o => o.cls === 'buildings' || o.cls === 'masses')) { assert.ok(/generic|documented/.test(o.form.basis), o.id); assert.equal(o.form.tier, o.form.storeys_doc ? 'inferred' : 'plausible-procedural'); }
  const doc = model.objects.filter(o => o.form && o.form.storeys_doc).map(o => o.id); assert.deepEqual(doc.sort(), ['STR-KLINGEL-HOUSE1', 'STR-SHERFY-HOUSE1', 'STR-TOWN-COURTHOUSE', 'STR-TOWN-PENN_HALL', 'STR-BRYAN-HOUSE1'].filter(id => model.byId.has(id)).sort());
  for (const r of data.roads) assert.ok(r.width_m > 0 && /generic/.test(r.width_basis));
});

test('geometry: the extruded buildings are valid meshes (finite, indexed in range, gable ends closed), fence panels cover their lines, culling equals brute force', () => {
  const { verts, idx } = model.mesh.buildings; assert.ok(verts.every(Number.isFinite)); assert.ok(idx.every(i => i < verts.length / 10));
  for (let i = 0; i < verts.length; i += 10) assert.ok(verts[i + 1] > T.hmin - 5 && verts[i + 1] < T.hmax + 40, 'height out of range');
  const bad = model.objects.filter(o => o.form && o.cls === 'buildings' && !o.form.clipOk); assert.equal(bad.length, 0, 'triangulation fell back to a fan for ' + bad.map(o => o.id));
  for (const o of model.objects.filter(o => o.cls === 'buildings')) { assert.ok(o.form.eaveH >= 2 && o.form.eaveH <= 12, o.id + ' eave'); assert.ok(o.form.rise >= 0 && o.form.rise <= o.form.eaveH); }
  for (const o of model.objects.filter(o => o.cls === 'fences')) { let L = 0; for (const r of o.runs) for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); let P = 0; const pa = model.mesh.panels; for (const c of model.mesh.chunks.filter(c => c.oid === o.oid)) for (let k = c.start; k < c.start + c.count; k++) P += Math.hypot(pa[k * 8 + 2] - pa[k * 8], pa[k * 8 + 3] - pa[k * 8 + 1]); assert.ok(Math.abs(L - P) < 0.5 + L * 0.001, `${o.id}: panels ${P} vs line ${L}`); }
  const cam = { x: -900, y: 60, z: 200, planes: new Float32Array([1, 0, 0, 2000, -1, 0, 0, 2000, 0, 1, 0, 500, 0, -1, 0, 500, 0, 0, 1, 2000, 0, 0, -1, 2000]) };
  const v = model.cullFences(cam, true), dist = c => Math.max(0, Math.hypot(c.cx - cam.x, c.cz - cam.z, cam.y - T.h(c.cx, c.cz) - 2) - c.r);
  const nearWant = model.mesh.chunks.filter(c => dist(c) <= model.lod.nearD + 30).reduce((a, c) => a + c.count, 0), farWant = model.mesh.chunks.filter(c => dist(c) <= model.lod.farD && dist(c) > model.lod.nearD - 30).reduce((a, c) => a + c.count, 0);
  assert.ok(v.chunks > 0); assert.equal(v.near + v.stone + v.worm, nearWant); assert.equal(v.far, farWant); const off = model.cullFences(cam, false); assert.equal(off.near + off.far + off.stone, 0);
  const sq = [[0, 0], [10, 0], [10, 6], [0, 6]]; assert.equal(polyArea(sq), 60); assert.equal(triangulate(sq).tris.length, 6); const R = minRect(sq); assert.ok(Math.abs(R.hu - 5) < 1e-9 && Math.abs(R.hv - 3) < 1e-9);
  const L2 = [[0, 0], [6, 0], [6, 2], [2, 2], [2, 6], [0, 6]]; const tr = triangulate(L2); assert.ok(tr.ok); let a = 0; for (let i = 0; i < tr.tris.length; i += 3) a += polyArea([L2[tr.tris[i]], L2[tr.tris[i + 1]], L2[tr.tris[i + 2]]]); assert.ok(Math.abs(a - polyArea(L2)) < 1e-9);
  const m = extrude(sq, { groundAt: () => 100, obj: 0, wallMat: 1, roofMat: 5, flat: false, storeys: 2 }); assert.ok(m.info.rise > 0 && Math.abs(m.info.rise - 3 * GEN.pitch) < 1e-9);
  assert.equal(clipRuns([[0, 0], [10, 0], [20, 0]], 12, 12).length, 1); assert.equal(clipRuns([[0, 0], [10, 0], [20, 0]], 12, 12)[0].at(-1)[0], 12);
  assert.equal(panelsAlong([[0, 0], [10, 0]], 3.35).length, 3); void signedArea; void splitTriByLine; void CLASSES;
});

test('state integration: the buffer the shaders read equals state_at + the visual map for every object at every time, in any evaluation order (purity), with scenarios', () => {
  const times = [t0m(1, 12), t0m(2, 12), t0m(2, 20), t0m(3, 8), t0m(3, 8, 30), t0m(3, 12), t0m(3, 15, 45), t0m(3, 16), t0m(3, 17), t0m(4, 12), t0m(10, 12), t0m(20, 12), t0m(5, 0, 1)];
  const choices = [null, { 'bld-sherfy-farm#barn': 'jul2_evening_c026' }, { 'bld-bliss-farm#barn': 'late_morning_forum_unreliable', 'FEN-emmitsburg-road': 'default' }];
  const ref = new Map(); const snap = () => model.stateBuf.slice();
  for (const ch of choices) for (const t of times) { model.update(t, ch, null, true); ref.set(JSON.stringify([t, ch]), snap()); }
  let x = 7; const rnd = () => (x = (x * 48271) % 2147483647) / 2147483647; const keys = [...ref.keys()]; for (let k = keys.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [keys[k], keys[j]] = [keys[j], keys[k]]; }
  for (const key of keys.concat(keys.slice().reverse())) { const [t, ch] = JSON.parse(key); model.update(t, ch, null, true); assert.deepEqual(Array.from(model.stateBuf), Array.from(ref.get(key)), 'state differs for ' + key); }
  const t = t0m(3, 16, 0); model.update(t, null, null, true);
  for (const o of model.objects) {
    if (o.dropped || !o.state_id || o.cls === 'works') continue; const r = E.stateAt(o.state_id, msOfMin(Math.floor(t * 4) / 4), 'default'), v = visualOf(o.cls === 'fences' ? 'fence' : 'building', r), i = o.oid * 8;
    assert.equal(model.stateBuf[i], v.vis, o.id); assert.ok(Math.abs(model.stateBuf[i + 1] - v.A[0]) < 1e-6 && Math.abs(model.stateBuf[i + 2] - v.A[1]) < 1e-6 && Math.abs(model.stateBuf[i + 4] - v.B[0]) < 1e-6 && Math.abs(model.stateBuf[i + 5] - v.B[1]) < 1e-6 && Math.abs(model.stateBuf[i + 3] - v.mix) < 1e-6, o.id);
  }
  model.update(t, null, { fences: false }, true); for (const o of model.objects.filter(o => o.cls === 'fences')) assert.equal(model.stateBuf[o.oid * 8], 0); model.update(t, null, null, true);
});

test('the state changes are the ones the schedule prints: Bliss buildings burn only on 3 July (never on 2 July), the McPherson barn never burns, the Sherfy barn follows its scenario, the Emmitsburg Road fences are intact before 3 July 15:30', () => {
  const lvl = (id, t, sc = 'default') => visualOf('building', E.stateAt(id, msOfMin(t), sc));
  for (const id of ['bld-bliss-farm#house', 'bld-bliss-farm#barn']) { assert.deepEqual([lvl(id, t0m(2, 23, 59)).A[0], lvl(id, t0m(2, 23, 59)).B[0]], [0, 0]); assert.equal(lvl(id, t0m(3, 12)).uncertain, true); assert.equal(lvl(id, t0m(4, 0, 0)).B[0], 1); assert.equal(lvl(id, t0m(4, 0, 0)).mix, 0); }
  for (let t = t0m(-3); t < t0m(40); t += 97) { const v = lvl('bld-mcpherson-farm#barn', t); assert.equal(Math.max(v.A[0], v.B[0]), 0); }
  const sherfy = id => lvl('bld-sherfy-farm#barn', t0m(2, 22), id); assert.equal(sherfy('jul2_evening_c026').uncertain, true); assert.equal(sherfy('default').uncertain, false); assert.equal(lvl('bld-sherfy-farm#barn', t0m(4, 1), 'jul2_evening_c026').B[0], 1);
  const f = t => visualOf('fence', E.stateAt('FEN-emmitsburg-road', msOfMin(t))); const early = f(t0m(3, 15, 29)); assert.equal(early.A[1], 0); assert.equal(early.B[1], 0);
  const mid = f(t0m(3, 16, 0)); assert.ok(mid.mix > 0.5 && mid.mix < 0.8); assert.equal(f(t0m(3, 17)).A[0], 0.5);
  assert.ok(model.objects.some(o => o.cls === 'fences' && o.state_id === 'FEN-emmitsburg-road'), 'no fence line is attributed to the Emmitsburg Road record');
});

test('every state string of a drawn building, marker or fence maps to a drawn change or is a role state (no physical state is silently left undrawn)', () => {
  const seen = new Set(), ids = new Set(model.objects.filter(o => o.state_id && o.cls !== 'works').map(o => o.state_id));
  for (const r of sched.rows) if (r.object_ids.some(o => ids.has(o))) for (const st of [r.from_state, r.to_state, ...(r.phases || []).map(p => p.state)]) seen.add(st);
  for (const s of structures.structures) if (ids.has(s.id)) for (const ch of s.state_changes || []) seen.add(ch.to_state);
  assert.ok(seen.size > 10); const bad = [...seen].filter(st => unmapped('building', st) && unmapped('fence', st)); assert.deepEqual(bad, [], 'unmapped physical states: ' + bad.join(' | '));
  assert.equal(classify('building', 'Burned').burn, 1); assert.equal(classify('fence', 'Destroyed').gone, 1); assert.equal(classify('building', 'Farm').rule, 'role');
});

test('no pre-placement and no construction animation for what pre-existed: every pre-existing wall or fence has progress 1 at every time and is present from the first frame; no work is drawn before its start', () => {
  const pre = model.objects.filter(o => o.cls === 'works' && o.work.pre_existing), works2 = model.objects.filter(o => o.cls === 'works' && !o.work.pre_existing); assert.ok(pre.length >= 10 && works2.length >= 4);
  for (const o of pre) for (let t = t0m(-3); t < t0m(60); t += 331) { assert.equal(OB.progress(o.work, t), 1); const r = E.stateAt(o.rec, msOfMin(t)); assert.notEqual(r.present, false, o.id + ' is absent at ' + t); }
  for (const o of works2) { const first = o.work.built.from; if (first != null) for (const t of [first - 600, first - 1]) assert.equal(OB.progress(o.work, t), 0, o.id + ' is drawn before its start'); const r = E.stateAt(o.rec, msOfMin(first != null ? first - 5 : t0m(-3))); assert.ok(r.present === false || r.present === null, o.id + ' present early in the schedule'); }
  assert.equal(model.stateBuf.length, model.nObj * 8);
  assert.ok(!model.objects.some(o => o.state_id === 'RD-avenues' || /Hancock Avenue|Pleasonton Avenue/.test(o.name)), 'a park avenue is drawn');
});

test('hospitals are marked from hospitals.json (its own structure ids and windows): opening inside a printed date window, open after it, closed after the closing window', () => {
  const o = model.objects.find(o => o.id === 'STR-HUMMELBAUGH-HOUSE1'); assert.ok(o); const ph = t => model.hospitalsOf(o, t).find(h => h.id === 'H-12').phase;
  assert.equal(ph(t0m(1, 12)), 'none'); assert.equal(ph(t0m(2, 12)), 'opening'); assert.equal(ph(t0m(3, 0)), 'open');
  const sp = model.objects.find(o => o.id === 'STR-SPANGLER_H-HOUSE1'); const hp = t => model.hospitalsOf(sp, t).find(h => h.id === 'H-06').phase; assert.equal(hp(t0m(1, 8)), 'none'); assert.equal(hp(t0m(1, 16)), 'open'); assert.equal(hp(t0m(40, 12)), 'closed');
  const hosts = new Set(data.hospitals.flatMap(h => h.host)); for (const h of hosts) assert.ok(structures.structures.some(s => s.id === h));
});

test('the panel and marker meshes are valid, and a line the record styles worm is drawn with the worm panel (style 2) and a stone line with the stone panel', () => {
  for (const m of [railPanelMesh(), wormPanelMesh(), stonePanelMesh(), markerMesh()]) { const stride = m.v.length / (Math.max(...m.i) + 1); assert.ok(Number.isInteger(stride) || stride >= 6, 'vertex stride'); assert.ok(m.v.every(Number.isFinite)); assert.ok(Math.max(...m.i) < (m.nv ?? m.v.length / 6)); }
  const d2 = JSON.parse(JSON.stringify(data)); d2.fences.find(f => f.rec).recStyle = 'worm'; const m2 = buildModel({ data: d2, T, engine: E }); assert.ok(m2.counts.panelsByStyle.worm > 0 && m2.counts.panelsByStyle.rail + m2.counts.panelsByStyle.worm === model.counts.panelsByStyle.rail);
  const styles = new Set(); for (let k = 0; k < m2.mesh.panels.length; k += 8) styles.add(m2.mesh.panels[k + 5]); assert.ok(styles.has(2) && styles.has(0) && styles.has(1), [...styles].join());
});
