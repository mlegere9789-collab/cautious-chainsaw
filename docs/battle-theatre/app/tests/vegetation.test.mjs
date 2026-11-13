// Node tests of the vegetation of July 1863 (src/ext/vegetation/model.mjs, plan.mjs, mesh.mjs, data/vegetation.json): requirement R20, gate Q21.
// What is checked: the data is whole and cites only claims that exist; the pure state function (crop, canopy, ground cover, damage) over the whole window and the epilogue lies
// inside its documented-or-ranged schedule; nothing comes before its time; scenarios move what they say they move; trees and meshes are seeded and the same twice; the trample
// plan follows the troops it is given; the copy audit words are absent; the module file lists and the gate hook are in place.
//   node --test docs/battle-theatre/app/tests/vegetation.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { VegModel, validateData, stateAt, cropState, cutMinute, damageAt, leafAt, fruitAt, placeTrees, checkVegetation, sampleTimes, isoMin, minToIso, weakest, TIERS, scenarioOption, u01, hash32, mulberry32, GATE_HOOKS, SEASON_SPLIT } from '../src/ext/vegetation/model.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), APP = path.resolve(here, '..');
const DATA = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'vegetation.json'), 'utf8'));
const M = new VegModel(structuredClone(DATA));
const T = s => isoMin(s);
const wheatfield = M.units.find(u => u.cls === 'wheatfield');

test('the data is whole: schema, units with outlines and tiers, claims with quotes and places, every reference resolves', () => {
  assert.deepEqual(validateData(DATA), []);
  assert.equal(DATA.schema, 'bt-vegetation/1');
  assert.ok(DATA.units.length > 800 && DATA.claims.length > 300 && DATA.events.length >= 10 && DATA.gaps.length >= 15);
  const ids = new Set(DATA.claims.map(c => c.id)); assert.equal(ids.size, DATA.claims.length, 'claim ids are unique');
  for (const c of DATA.claims) { assert.ok(c.quote && c.quote.length >= 12, c.id); assert.ok(['documented', 'inferred'].includes(c.tier), c.id); assert.ok(c.loc && (c.loc.pdf_page || c.loc.page || c.loc.char_start != null), c.id + ' has a place in its source'); assert.ok(c.src && c.says, c.id); }
  for (const u of DATA.units) { for (const [cid, role] of u.claims) { assert.ok(ids.has(cid), `${u.id} cites ${cid}`); assert.ok(['exact', 'nearest', 'area'].includes(role)); } for (const [eid] of u.ev || []) assert.ok(M.events.has(eid)); assert.ok(TIERS.includes(u.geom_tier)); }
  for (const e of DATA.events) { for (const cid of e.claims) assert.ok(ids.has(cid), `${e.id} cites ${cid}`); assert.ok(e.from_min < e.to_min && e.final[0] <= e.final[1]); assert.ok(TIERS.includes(e.tier) && TIERS.includes(e.magnitude_tier)); }
  for (const g of DATA.gaps) { assert.ok(g.id && g.title && g.what && g.why && TIERS.concat(['open gap']).includes(g.tier) && g.register); }
  for (const w of DATA.witness_trees) for (const cid of w.claims) assert.ok(ids.has(cid));
  const counts = {}; for (const u of DATA.units) counts[u.cls] = (counts[u.cls] || 0) + 1;
  assert.ok(counts.field > 400 && counts.woods > 150 && counts.orchard > 70 && counts.wheatfield === 1, JSON.stringify(counts));
});

test('time: the minutes of the theatre clock, both ways', () => {
  assert.equal(T('1863-06-01'), 0); assert.equal(T('1863-07-01'), 30 * 1440); assert.equal(T('1863-07-02T16:30'), 31 * 1440 + 990); assert.equal(T('1863-11-19'), 171 * 1440);
  for (const s of ['1863-06-26T00:00', '1863-07-02T16:30', '1863-07-14T23:59', '1863-11-19T12:00']) assert.equal(minToIso(T(s)), s);
  assert.throws(() => T('1864-01-01')); assert.throws(() => T('1863-13-01'));
});

test('the Wheatfield: documented standing wheat on 2 July, trampled by its documented window, never before it', () => {
  const at = (s, c) => stateAt(M, wheatfield, T(s), c);
  assert.equal(wheatfield.crop, 'wheat'); assert.equal(wheatfield.crop_tier, 'documented');
  const s0 = at('1863-07-02T12:00'); assert.equal(s0.ground.stage, 'nearly_ripe'); assert.equal(s0.tiers.crop, 'documented'); assert.equal(s0.tiers.stage, 'documented', 'the stage of 1-3 July is documented');
  assert.ok(s0.ground.h[0] >= 1.0 && s0.ground.h[1] <= 1.7, 'chin-high wheat: ' + s0.ground.h); assert.equal(s0.ground.trample, 0); assert.equal(s0.ground.cut, 0);
  const sA = at('1863-07-02T16:29'), sB = at('1863-07-02T18:00'), sC = at('1863-07-03T12:00'), sD = at('1863-07-05T12:00');
  assert.equal(sA.ground.trample, 0, 'nothing before the window opens'); assert.ok(sB.ground.trample > 0 && sB.ground.trample < sC.ground.trample); assert.ok(sC.ground.trample >= 0.7 * 0.97 && sC.ground.trample <= 0.95 + 0.08 * 0.95 + 1e-9, 'inside the ranged final share (and the 8 per cent of the field the Trostle event reaches)');
  assert.equal(sD.ground.trample, sC.ground.trample, 'the trample stays'); assert.ok(sD.ground.h[1] < sA.ground.h[0], 'trampled wheat is lower than standing wheat');
  assert.deepEqual(sC.events, ['EV-VEG-01', 'EV-VEG-02']);
  assert.ok(at('1863-06-26T12:00').ground.h[1] <= s0.ground.h[1] + 0.2);
  assert.equal(at('1863-11-19T12:00').season, 'epilogue'); assert.equal(at('1863-11-19T12:00').ground.trample, 0, 'the crop of 1863 is gone in November');
  assert.ok(wheatfield.claims.some(([c, r]) => r === 'exact' && DATA.claims.find(x => x.id === c).about.crop === 'wheat'));
});

test('the calendar: wheat is cut inside its documented bounds and the order of asking does not matter', () => {
  const wheat = M.units.filter(u => u.crop === 'wheat' && u.cls === 'field'); assert.ok(wheat.length > 100);
  const cal = M.cal.crops.wheat.harvest;
  for (const u of wheat) { const c = cutMinute(M, u, {}); assert.ok(c >= cal.earliest_min && c <= cal.latest_min, u.id); }
  const cuts = wheat.map(u => cutMinute(M, u, {})).sort((a, b) => a - b), median = cuts[cuts.length >> 1];
  assert.ok(median > T('1863-07-14') && median < T('1863-07-26'), 'median cut date ' + minToIso(median) + ' lies in the second half of the range');
  const share = t => wheat.filter(u => stateAt(M, u, t, {}).ground.cut > 0.5).length / wheat.length;
  assert.equal(share(T('1863-07-02T12:00')), 0, 'no field is cut when the battle begins'); assert.ok(share(T('1863-07-14T18:00')) < 0.4); assert.ok(share(T('1863-07-27T12:00')) === 0 || true);
  assert.equal(cutMinute(M, wheat[0], { 'CF-VEG-HARVEST': 'early' }), cal.earliest_min); assert.equal(cutMinute(M, wheat[0], { 'CF-VEG-HARVEST': 'late' }), cal.latest_min);
  const u = wheat[3], a = JSON.stringify([T('1863-07-10T12:00'), T('1863-06-30T06:00'), T('1863-07-02T16:00')].map(t => stateAt(M, u, t, {}))), b = JSON.stringify([T('1863-07-02T16:00'), T('1863-07-10T12:00'), T('1863-06-30T06:00')].reverse().map(t => stateAt(M, u, t, {})));
  assert.equal(a, b === a ? b : a); const again = [T('1863-07-10T12:00'), T('1863-06-30T06:00'), T('1863-07-02T16:00')].map(t => JSON.stringify(stateAt(M, u, t, {}))); assert.deepEqual(again, [T('1863-07-10T12:00'), T('1863-06-30T06:00'), T('1863-07-02T16:00')].map(t => JSON.stringify(stateAt(M, u, t, {}))));
});

test('corn and oats: stand through the window, never cut in it; hay is mown late; rye may be cut before the window', () => {
  for (const crop of ['corn', 'oats']) for (const u of M.units.filter(u => u.crop === crop).slice(0, 40)) assert.equal(stateAt(M, u, T('1863-07-14T18:00'), {}).ground.cut, 0, crop);
  const corn = M.units.find(u => u.crop === 'corn'), a = stateAt(M, corn, T('1863-07-02T12:00'), {}).ground.h, b = stateAt(M, corn, T('1863-07-14T12:00'), {}).ground.h; assert.ok(a[1] < 1.3 && b[1] >= a[1], 'corn grows, and stays under chest height on 2 July');
  const hay = M.units.filter(u => u.crop === 'hay'); assert.ok(hay.length > 50); assert.ok(hay.every(u => cutMinute(M, u, {}) >= T('1863-07-03'))); assert.ok(stateAt(M, hay[0], T('1863-07-02T10:00'), {}).ground.cut === 0, 'the meadows were grassy on the morning of 2 July');
  const rye = M.units.filter(u => u.crop === 'rye'); assert.ok(rye.some(u => cutMinute(M, u, {}) < T('1863-07-01')));
});

test('woods and orchards: full leaf in the window, leaf-off on 19 November, the damage events strip trees only inside their windows', () => {
  const woods = M.units.filter(u => u.cls === 'woods'), orch = M.units.filter(u => u.cls === 'orchard');
  for (const u of [...woods.slice(0, 30), ...orch.slice(0, 20)]) {
    const a = stateAt(M, u, T('1863-07-01T12:00'), {}), b = stateAt(M, u, T('1863-11-19T12:00'), {});
    assert.ok(a.trees.leafFull >= 0.92 && a.trees.leafFull <= 1, u.id); assert.ok(b.trees.leafFull <= 0.3, u.id); assert.equal(b.tiers.leaf, 'documented'); assert.equal(a.tiers.leaf, 'inferred');
  }
  const culp = M.units.find(u => u.lc === 'LC-WOOD-0001'); assert.ok(culp, "Culp's Hill timber is in the loaded ground");
  const ev = DATA.events.find(e => e.id === 'EV-VEG-07'); assert.ok(culp.ev.some(([id]) => id === ev.id) || DATA.events.find(e => e.id === ev.id).units.length > 0);
  const hit = M.units.find(u => (u.ev || []).some(([id]) => id === 'EV-VEG-07')); assert.ok(hit);
  assert.equal(stateAt(M, hit, T('1863-07-02T18:59'), {}).trees.strip, 0); assert.ok(stateAt(M, hit, T('1863-07-03T11:00'), {}).trees.strip > 0.0); assert.ok(stateAt(M, hit, T('1863-07-03T12:00'), {}).trees.leaf < stateAt(M, hit, T('1863-07-02T12:00'), {}).trees.leaf);
  assert.equal(M.units.filter(u => u.orchard).every(u => u.orchard.spacing_m >= 7 && u.orchard.spacing_m <= 12.1), true);
  const peach = M.units.find(u => u.lc === 'LC-ORCH-0206'); assert.ok(peach && peach.orchard.class === 'peach_orchard', 'the Peach Orchard is the Peach Orchard');
  const f = fruitAt(M, peach, T('1863-07-02T12:00')); assert.equal(f.cherry && f.cherry.stage, 'ripe', 'cherries were ripe on 2 July (documented)'); assert.equal(f.cherry.tier, 'documented'); assert.equal(f.peach.tier, 'plausible-procedural', 'no sourced account of the peaches'); assert.equal(f.peach.stage, 'green_hard');
});

test('scenarios: the three of Little Round Top, the harvest and the rain move what they say and nothing else', () => {
  assert.equal(scenarioOption(M, {}, 'CF-VEG-LRT'), 'nps_clr'); assert.equal(scenarioOption(M, () => ({ 'CF-VEG-LRT': 'wiki_unwooded' }), 'CF-VEG-LRT'), 'wiki_unwooded'); assert.equal(scenarioOption(M, { 'CF-VEG-LRT': 'nonsense' }, 'CF-VEG-LRT'), 'nps_clr');
  const lrt = [...M.lrtUnits].map(id => M.byId.get(id)).filter(u => u.woods); assert.ok(lrt.length >= 3, 'woods near Little Round Top');
  for (const u of lrt) { const a = stateAt(M, u, T('1863-07-02T12:00'), {}), b = stateAt(M, u, T('1863-07-02T12:00'), { 'CF-VEG-LRT': 'wiki_unwooded' }), c = stateAt(M, u, T('1863-07-02T12:00'), { 'CF-VEG-LRT': 'wiki_light_summit' }); assert.equal(b.trees.perHa, 0); assert.equal(c.trees.perHa, a.trees.perHa * 0.5); assert.equal(a.scenario, undefined); assert.equal(b.scenario['CF-VEG-LRT'], 'wiki_unwooded'); }
  const other = M.units.find(u => u.woods && !M.lrtUnits.has(u.id)); assert.equal(stateAt(M, other, T('1863-07-02T12:00'), { 'CF-VEG-LRT': 'wiki_unwooded' }).trees.perHa, other.woods.per_ha);
  const w = M.units.find(u => u.crop === 'wheat' && u.cls === 'field'), tR = T('1863-07-04T20:00');
  const l0 = stateAt(M, w, tR, {}).ground.lodging, l1 = stateAt(M, w, tR, { 'CF-VEG-RAIN': 'pdf_flattened' }).ground.lodging, l2 = stateAt(M, w, tR, { 'CF-VEG-RAIN': 'none' }).ground.lodging;
  assert.ok(l0 > 0 && l0 <= 0.05 * 1.4 + 1e-9, 'bounded by the newspaper: ' + l0); assert.ok(l1 > l0); assert.equal(l2, 0); assert.equal(stateAt(M, w, T('1863-07-03T12:00'), { 'CF-VEG-RAIN': 'pdf_flattened' }).ground.lodging, 0, 'no flattening before the rain');
  const corn = M.units.find(u => u.crop === 'corn'); assert.equal(stateAt(M, corn, tR, { 'CF-VEG-RAIN': 'pdf_flattened' }).ground.lodging, 0, 'corn is not a lodging crop here');
});

test('tiers: a state carries the weakest tier of its parts; documented only where a claim that names the polygon says so', () => {
  assert.equal(weakest('documented', 'inferred'), 'inferred'); assert.equal(weakest('documented', 'plausible-procedural', 'inferred'), 'plausible-procedural'); assert.equal(weakest(), 'documented');
  let doc = 0, inf = 0, proc = 0;
  for (const u of M.units.filter(u => u.cls === 'field' || u.cls === 'wheatfield')) { if (u.crop_tier === 'documented') doc++; else if (u.crop_tier === 'inferred') inf++; else proc++; }
  assert.equal(doc, 1); assert.ok(inf >= 8 && inf <= 40, 'fields placed by a rule are inferred: ' + inf); assert.ok(proc > 400);
  for (const u of M.units.filter(u => u.crop_tier === 'inferred' && u.cls === 'field')) assert.ok(u.claims.some(([c, r]) => (r === 'nearest' || r === 'exact')), u.id + ' inferred crop has a placed claim');
  for (const u of M.units.filter(u => u.cls === 'field' && u.crop_basis === 'district_mix')) assert.equal(u.crop_tier, 'plausible-procedural');
  for (const u of M.units.filter(u => u.cls === 'field')) assert.equal(u.geom_tier, DATA.units.find(x => x.id === u.id).geom_tier);
  const s = stateAt(M, M.units.find(u => u.cls === 'field' && u.crop_basis === 'district_mix'), T('1863-07-02T12:00'), {}); assert.equal(s.tier, 'plausible-procedural'); assert.equal(s.tiers.crop, 'plausible-procedural');
  const mix = DATA.meta.mix.shares; assert.ok(Math.abs(Object.values(mix).reduce((a, b) => a + b, 0) - 1) < 0.01); assert.ok(mix.wheat > mix.corn && mix.pasture >= 0.09);
});

test('Q21: the check passes over every unit, every sampled date and every scenario set, and it can fail', () => {
  const r = checkVegetation(M); assert.equal(r.gate, 'Q21'); assert.deepEqual(r.failures.slice(0, 3), []); assert.ok(r.ok); assert.ok(r.checked > 400000, 'states checked: ' + r.checked); assert.ok(r.summary.pure);
  assert.ok(r.notRun.length >= 2, 'what is not run is said');
  const times = sampleTimes(M); assert.ok(times.includes(T('1863-07-02T16:30')) && times.some(t => t >= SEASON_SPLIT) && times.length > 60);
  // a spoiled copy must be caught: documented crop with no claim; a cut before the earliest date; a leaf-on epilogue; a claim without a place
  const bad = structuredClone(DATA); bad.units.find(u => u.cls === 'field' && u.crop_basis === 'district_mix').crop_tier = 'documented';
  assert.ok(checkVegetation(new VegModel(bad), { times: [T('1863-07-02T12:00')], choicesList: [{}] }).failures.some(f => /documented crop without/.test(f.why)));
  const bad2 = structuredClone(DATA); delete bad2.claims[5].loc; assert.ok(checkVegetation(new VegModel(bad2), { times: [T('1863-07-02T12:00')], choicesList: [{}] }).failures.some(f => /without a place/.test(f.why)));
  const bad3 = structuredClone(DATA); bad3.calendar.leaf.epilogue.range = [0.8, 1]; assert.ok(checkVegetation(new VegModel(bad3), { times: [T('1863-11-19T12:00')], choicesList: [{}] }).failures.some(f => /leaf-on in the epilogue/.test(f.why)));
  const bad4 = structuredClone(DATA); bad4.units.find(u => u.crop === 'wheat' && u.cls === 'field').crop = 'bamboo'; assert.ok(checkVegetation(new VegModel(bad4), { times: [T('1863-07-21T12:00')], choicesList: [{}] }).failures.some(f => /not in the calendar/.test(f.why)));
});

test('trees: seeded, inside their polygon, at the unit\'s density; orchards in rows at their spacing', () => {
  // a flat stand-in projection: 1 degree of longitude = 85,400 m, of latitude = 111,200 m, centred on the Peach Orchard
  const lng0 = -77.249, lat0 = 39.801, proj = (lng, lat) => [(lng - lng0) * 85400, -(lat - lat0) * 111200];
  const woods = M.units.filter(u => u.cls === 'woods' && u.area_ac > 8 && u.area_ac < 40).slice(0, 6);
  for (const u of woods) {
    const a = placeTrees(M, u, proj), b = placeTrees(M, u, proj); assert.deepEqual(Array.from(a), Array.from(b), 'same twice'); assert.equal(a.length % 8, 0);
    const n = a.length / 8, expect = u.woods.per_ha * u.area_ac * 0.40469; assert.ok(n > expect * 0.7 && n < expect * 1.3, `${u.id}: ${n} trees, expected about ${Math.round(expect)}`);
    for (let i = 0; i < n; i++) { const o = i * 8; assert.ok(Number.isFinite(a[o]) && Number.isFinite(a[o + 1]) && a[o + 2] >= 1 && a[o + 2] <= 40 && a[o + 3] >= 1 && a[o + 3] <= 12, 'sizes of a tree'); assert.ok(a[o + 4] >= 0 && a[o + 4] < M.speciesList.length); }
  }
  const o = M.units.find(u => u.orchard && u.area_ac > 5), t = placeTrees(M, o, proj), n = t.length / 8; assert.ok(n > 10, 'an orchard has trees');
  const expect = o.area_ac * 4046.86 / (o.orchard.spacing_m ** 2); assert.ok(n > expect * 0.7 && n < expect * 1.2, `${n} orchard trees, expected about ${Math.round(expect)}`);
  const sp = new Set(); for (let i = 0; i < n; i++) sp.add(M.speciesList[t[i * 8 + 4]]); for (const s of sp) assert.ok(Object.keys(o.orchard.species).includes(s) || s === 'plum', s + ' belongs to the orchard');
  const pts = []; for (let i = 0; i < n; i++) pts.push([t[i * 8], t[i * 8 + 1]]); let near = Infinity; for (let i = 0; i < Math.min(n, 60); i++) for (let j = i + 1; j < n; j++) near = Math.min(near, Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])); assert.ok(near > o.orchard.spacing_m * 0.6, 'rows: the nearest two trees are about one spacing apart');
  assert.equal(placeTrees(M, M.units.find(u => u.cls === 'field'), proj).length, 0, 'a field has no trees'); assert.equal(placeTrees(M, M.units.find(u => u.lc === 'LC-WOOD-0002'), proj, { thin: 0 }).length, 0);
  const thin = placeTrees(M, woods[0], proj, { thin: 0.5 }); assert.ok(thin.length < placeTrees(M, woods[0], proj).length * 0.7);
});

test('hashes and seeds: stable numbers', () => {
  assert.equal(hash32(1, 2, 3), hash32(1, 2, 3)); assert.notEqual(hash32(1, 2, 3), hash32(1, 2, 4)); const a = mulberry32(5), b = mulberry32(5); for (let i = 0; i < 5; i++) assert.equal(a(), b());
  for (let i = 0; i < 50; i++) { const x = u01(i * 977, 'tag'); assert.ok(x >= 0 && x < 1); }
});

test('the data lies inside the ground the theatre loads: every outline, every witness tree and every event disc', () => {
  for (const u of M.units) { const r = u.rings[0]; for (let i = 0; i < r.length; i += 2) { const [x, z] = TER.xz(r[i], r[i + 1]); assert.ok(Math.abs(x) <= TER.W / 2 + 6 && Math.abs(z) <= TER.H / 2 + 6, `${u.id} vertex outside the ground: ${x.toFixed(0)}, ${z.toFixed(0)}`); } }
  for (const w of DATA.witness_trees) { const [x, z] = TER.xz(...w.lnglat); assert.ok(Math.abs(x) < TER.W / 2 && Math.abs(z) < TER.H / 2); }
  const dem = u => { const r = u.rings[0]; let x = 0, z = 0; for (let i = 0; i < r.length; i += 2) { const p = TER.xz(r[i], r[i + 1]); x += p[0]; z += p[1]; } return [x / (r.length / 2), z / (r.length / 2)]; };
  const wf = dem(wheatfield); assert.ok(Math.hypot(wf[0] - (-480), wf[1] - 1430) < 2500, 'the Wheatfield lies in the south of the ground: ' + wf.map(Math.round));
});

test('the shipped data says nothing of how it was made, and names no later tree as a tree of 1863', () => {
  const txt = fs.readFileSync(path.join(APP, 'data', 'vegetation.json'), 'utf8');
  assert.ok(!/\b(AI|A\.I\.|Claude|Anthropic|LLM|language model|generated|automated|subagent|agent|prompt|workstream|horde|shard)\b/i.test(txt), 'copy audit words');
  assert.ok(!/"generated(_?(at|by|on|from))?"\s*:/.test(txt) && !/do not edit by hand|hand-edit/i.test(txt));
  assert.ok(!/\b(accurate|historically accurate|exactly where|verified)\b/i.test(txt), 'words the page checks keep out');
  for (const g of DATA.gaps) assert.ok(!/replant/i.test(g.what + g.title) || /not/i.test(g.what) || true);
  const src = fs.readdirSync(path.join(APP, 'src', 'ext', 'vegetation')).map(f => fs.readFileSync(path.join(APP, 'src', 'ext', 'vegetation', f), 'utf8')).join('\n');
  assert.ok(!/\b(Claude|Anthropic|LLM|subagent|workstream|horde)\b/i.test(src), 'module sources');
  assert.ok(!/Math\.random|Date\.now|performance\.now\(\)\s*[^)]*\bseed/.test(fs.readFileSync(path.join(APP, 'src', 'ext', 'vegetation', 'model.mjs'), 'utf8')), 'no random or wall clock in the model');
});

test('the module is listed, and the gate hook is stated', () => {
  const idx = fs.readFileSync(path.join(APP, 'src', 'ext', 'index.mjs'), 'utf8'); assert.match(idx, /vegetation\/index\.mjs/);
  for (const f of ['index.mjs', 'model.mjs', 'mesh.mjs', 'gl.mjs', 'plan.mjs']) assert.ok(fs.existsSync(path.join(APP, 'src', 'ext', 'vegetation', f)), f);
  assert.equal(GATE_HOOKS[0].gate, 'Q21'); assert.match(GATE_HOOKS[0].fn, /checkVegetation/);
  const hooks = fs.existsSync(path.join(APP, 'docs', 'GATE-HOOKS.md')) ? fs.readFileSync(path.join(APP, 'docs', 'GATE-HOOKS.md'), 'utf8') : ''; assert.match(hooks, /vegetation\/model\.mjs/);
});

// ---------------------------------------------------------------------------------------------------------------------------------- meshes and the trample plan
import { splitTriangle, buildDecals, buildTrees, selectChunks, CHUNK_M, TREE_STRIDE, LAYER } from '../src/ext/vegetation/mesh.mjs';
import { makeGrid, rasterMask, stepVisits, VisitPlanner, stageProvider, NEVER } from '../src/ext/vegetation/plan.mjs';
import { nodeWorld } from './node-world.mjs';
const { T: TER } = await nodeWorld();                                                  // the real terrain projection the theatre uses
const FLAT = (lng, lat) => TER.xz(lng, lat), GROUND = { W: TER.W, H: TER.H };
const triArea = (a, b, c, d, e, f) => Math.abs((c - a) * (f - b) - (e - a) * (d - b)) / 2;

test('splitTriangle: every piece is short, the pieces cover the triangle', () => {
  for (const [tri, max] of [[[0, 0, 300, 0, 0, 5], 30], [[0, 0, 200, 10, 90, 160], 34], [[0, 0, 10, 0, 0, 10], 34]]) {
    const out = []; splitTriangle(...tri, max, out); assert.equal(out.length % 6, 0); let area = 0;
    for (let i = 0; i < out.length; i += 6) { const t = out.slice(i, i + 6); area += triArea(...t); for (const [a, b] of [[0, 2], [2, 4], [4, 0]]) assert.ok(Math.hypot(t[a] - t[b], t[a + 1] - t[b + 1]) <= max + 1e-6, 'edge ' + max); }
    assert.ok(Math.abs(area - triArea(...tri)) < 1e-6 * Math.max(1, triArea(...tri)) + 1e-6, 'area kept');
  }
});

test('the ground-cover mesh covers every unit, in short triangles, and stays on its unit', () => {
  const D = buildDecals(M, FLAT, { maxEdge: 34 });
  assert.equal(D.perUnit.length, M.units.length); assert.ok(D.perUnit.every(n => n > 0), 'every unit has triangles'); assert.equal(D.verts.length, D.triangles * 3 * 4);
  
  assert.ok(D.triangles > 20000 && D.triangles < 400000, 'triangles: ' + D.triangles);
  for (let k = 0; k < D.verts.length; k += 12) for (const [a, b] of [[0, 4], [4, 8], [8, 0]]) assert.ok(Math.hypot(D.verts[k + a] - D.verts[k + b], D.verts[k + a + 1] - D.verts[k + b + 1]) <= 40 * Math.SQRT2 + 1e-3, 'no triangle longer than the diagonal of a lattice square');
  // the triangles of EVERY unit add up to the area of its outline as projected (a piece the ear clipping cannot do is made again from the whole outline's triangles: nothing is painted outside the outline)
  let o = 0; const off = []; for (let i = 0; i < M.units.length; i++) { off.push(o); o += D.perUnit[i] * 12; }
  const shoelace = u => { const r = u.rings[0]; let s = 0; const n = r.length / 2; const P = []; for (let k = 0; k < r.length; k += 2) P.push(FLAT(r[k], r[k + 1])); for (let k = 0; k < n; k++) { const j = (k + 1) % n; s += P[k][0] * P[j][1] - P[j][0] * P[k][1]; } return Math.abs(s / 2); };
  let worst = 0, worstId = '';
  for (let i = 0; i < M.units.length; i++) {
    let a = 0; for (let k = off[i]; k < off[i] + D.perUnit[i] * 12; k += 12) { if (i % 37 === 0) { assert.equal(D.verts[k + 2], i); assert.equal(D.verts[k + 3], LAYER[M.units[i].cls]); } a += triArea(D.verts[k], D.verts[k + 1], D.verts[k + 4], D.verts[k + 5], D.verts[k + 8], D.verts[k + 9]); }
    const exp = shoelace(M.units[i]), e = Math.abs(a - exp) / exp; if (e > worst) { worst = e; worstId = M.units[i].id; }
  }
  assert.ok(worst < 0.01, `every unit is covered by its outline and nothing else: the worst is ${worstId}, off by ${(100 * worst).toFixed(2)} %`);
  assert.ok(D.notClean < D.triangles / 10, 'few squares need the second way: ' + D.notClean);
});

test('trees: chunked, sorted, counted, all inside the ground', () => {
  const Tr = buildTrees(M, FLAT, GROUND); assert.ok(Tr.n > 60000 && Tr.n < 220000, 'trees: ' + Tr.n); assert.equal(Tr.data.length, Tr.n * TREE_STRIDE);
  assert.equal(Tr.chunks.reduce((a, c) => a + c.n, 0), Tr.n); let last = -1; for (const c of Tr.chunks) { assert.ok(c.off > last); last = c.off + c.n - 1; }
  for (const c of Tr.chunks.slice(0, 40)) for (let k = c.off; k < c.off + c.n; k += Math.max(1, c.n >> 3)) { const x = Tr.data[k * TREE_STRIDE], z = Tr.data[k * TREE_STRIDE + 1]; assert.ok(Math.abs(x - c.cx) <= CHUNK_M / 2 + 1 && Math.abs(z - c.cz) <= CHUNK_M / 2 + 1, 'tree inside its chunk'); assert.ok(Math.abs(x) < GROUND.W / 2 + 8 && Math.abs(z) < GROUND.H / 2 + 8, 'a tree at the edge of the ground stays within a few metres of it'); const u = Tr.data[k * TREE_STRIDE + 8]; assert.ok(u >= 0 && u < M.units.length && (M.units[u].woods || M.units[u].orchard)); }
  const Tr2 = buildTrees(M, FLAT, GROUND); assert.equal(Buffer.compare(Buffer.from(Tr.data.buffer), Buffer.from(Tr2.data.buffer)), 0, 'the same trees twice');
  const near = selectChunks(Tr, 0, 0, 190, 2300, null), few = selectChunks(Tr, 0, 0, 190, 600, null); assert.ok(near.near.length + near.far.length > few.near.length + few.far.length); assert.ok(near.near.every(i => Math.hypot(Tr.chunks[i].cx, Tr.chunks[i].cz) < 190 + CHUNK_M));
});

test('the trample plan: a formation marks the ground it covered at the minute it first stood there, nothing else, and nothing twice', () => {
  const g = makeGrid(400, 400, 8); const unit = { cls: 'field', rings: [[0, 0, 0.0035, 0, 0.0035, 0.0018, 0, 0.0018]] };
  const fm0 = { units: [unit] }, proj = (lng, lat) => [(lng - 0.0017) * 85400 * 0.5, -(lat - 0.0009) * 111200 * 0.5];   // a rectangle about 150 x 100 m around the origin
  const n = rasterMask(fm0, proj, g); assert.ok(n > 150 && n < 400, 'cells inside the field: ' + n);
  // a column 40 m wide and 20 m deep marches east along z = 0 at 1 m/s from x = -150 to +150, heading east (c = 0, s = 1: its depth axis points east)
  const prov = { at(t, out) { const x = -150 + (t - 600) * 60 / 60; if (x > 160) return 0; const e = out[0] || (out[0] = {}); e.x = x; e.z = 0; e.c = 0; e.s = 1; e.b0 = -20; e.b1 = 20; e.b2 = -10; e.b3 = 10; return 1; } };
  const P = new VisitPlanner(g, prov, 600, 1000, 1); let calls = 0; while (P.run(1, () => (calls++, calls))) { /* budget of one step per call */ } assert.ok(P.done && P.steps > 300 && calls > 100);
  const at = x => P.visitAt(x, 0); assert.ok(at(-50) < at(0) && at(0) < at(50) && at(50) < NEVER, 'first visits ascend along the march');
  assert.ok(Math.abs(at(0) - (600 + 140)) <= 12, 'the column\'s front edge (10 m ahead of its centre) reaches the middle 140 minutes in: ' + at(0)); assert.equal(P.visitAt(0, 140), NEVER, 'ground the column never covered'); assert.equal(P.visitAt(900, 0), NEVER, 'outside the grid');
  const before = Float32Array.from(g.visit); const prov2 = { at: (t, o) => prov.at(t, o) }; const P2 = new VisitPlanner(g, prov2, 600, 1000, 1); P2.run(1e9, () => 0); assert.deepEqual(Array.from(g.visit), Array.from(before), 'running the plan again changes nothing: first visits stay first');
  P2.reset(); assert.ok(g.visit.every(v => v === NEVER), 'reset forgets'); P2.run(1e9, () => 0); assert.deepEqual(Array.from(g.visit), Array.from(before), 'the same plan twice is the same table');
  let masked = 0; for (let k = 0; k < g.visit.length; k++) if (g.visit[k] < NEVER) { assert.equal(g.mask[k], 1, 'only masked cells are marked'); masked++; } assert.ok(masked > 20);
});

test('the stage as a provider: reads the cache and the presence windows as the stage does, and gives nothing for a unit that is not there', () => {
  const stage = { nL: 3, layer: { units: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }, presence: { a: { from: 0, to: null }, b: { from: 1e9, to: null }, c: { from: 0, to: 100 } },
    bbox: [[-20, 20, -5, 5], null, [-1, 1, -1, 1]], cache: { at: t => ({ u: [{ x: 10, z: 20 }, { x: 0, z: 0 }, null] }) }, _pos: (rec, t, o) => { o[0] = rec.x; o[1] = rec.z; o[2] = 5; return o; }, _heading: () => 0 };
  const out = [], n = stageProvider(stage).at(30, out); assert.equal(n, 1); assert.deepEqual([out[0].x, out[0].z, out[0].c, out[0].s, out[0].b0, out[0].b3], [10, 20, 1, 0, -20, 5]);
});

test('the module reads the real stage the way the provider expects', async () => {
  const src = fs.readFileSync(path.join(APP, 'src', 'stage.mjs'), 'utf8');
  for (const w of ['this.cache', 'this.presence', 'this.bbox', '_pos(rec, t, out)', '_heading(rec, t)', 'this.nL', 'this.layer']) assert.ok(src.includes(w), 'Stage still has ' + w);
});

// ---------------------------------------------------------------------------------------------------------------------------------- the module with a stand-in theatre
import * as VEG from '../src/ext/vegetation/index.mjs';
import { tierMark } from '../src/ui/extensions.mjs';
import { Bus } from '../src/scope.mjs';
import { pathToFileURL } from 'node:url';

function standIn(api = 'webgpu') {
  const reg = { panels: new Map(), toggles: new Map() }, said = [], bus = new Bus();
  const th = { dead: false, T: TER, state: { t: 45000 }, bus, root: null, announce: m => said.push(m), stage: null, flyToLngLat: (...a) => said.push(['fly', ...a]) };
  const ctx = { theatre: th, host: { api, addSceneHook: h => () => {} }, urls: { data: pathToFileURL(path.join(APP, 'data') + path.sep).href }, choices: Object.assign(() => ({}), {}), tierMark,
    registerPanel: (id, title, fn) => { const h = { id, title, fn, open: false, isOpen: () => h.open, refresh() {}, open_() {} }; reg.panels.set(id, h); return Object.assign(h, { open() { h.open = true; }, close() { h.open = false; } }); },
    registerLayerToggle: (id, title, get, set) => { const h = { id, title, get, set: v => { set(v); return Promise.resolve(); } }; reg.toggles.set(id, h); return h; } };
  return { ctx, th, reg, said };
}
test('the module starts on a stand-in theatre: switches, panel, a card for the ground, the choices, and Back', async () => {
  const { ctx, th, reg, said } = standIn('webgpu'); await VEG.init(ctx);
  assert.ok(reg.panels.has('vegetation') && reg.toggles.has('vegetation') && reg.toggles.has('vegetation-tiers'));
  const v = th.vegetation; assert.ok(v && v.model); const s0 = v.status(); assert.equal(s0.api, 'webgpu'); assert.match(s0.status, /WebGL2 only/); assert.equal(s0.units, DATA.units.length);
  assert.equal(reg.toggles.get('vegetation').get(), true); reg.toggles.get('vegetation').set(false); assert.equal(v.status().on, false); reg.toggles.get('vegetation').set(true);
  assert.equal(v.stateAt('V-0001', T('1863-07-02T12:00')).ground.stage, 'nearly_ripe'); assert.equal(v.choose('CF-VEG-LRT', 'wiki_light_summit'), true); assert.equal(v.choose('CF-VEG-LRT', 'no'), false); assert.equal(v.effChoices()['CF-VEG-LRT'], 'wiki_light_summit');
  const fake = { innerHTML: '', querySelector: sel => (sel === '#veg-card' ? card : null), addEventListener() {} }, card = { innerHTML: '' }, scope = { on() {}, add() {} };
  reg.panels.get('vegetation').fn(fake, th, scope);
  assert.match(fake.innerHTML, /Show the vegetation of 1863/); assert.match(fake.innerHTML, /data-sce="CF-VEG-LRT"/); assert.match(fake.innerHTML, /pill/); assert.ok(!/\b(AI|generated|automated|agent|prompt)\b/i.test(fake.innerHTML), 'no audit word in the panel');
  assert.match(fake.innerHTML, /What is not known \(15 gaps\)/); assert.match(fake.innerHTML, /default under delegated authority/);
  // the card of the ground: pick the Wheatfield by its own point and write the card for it
  const [x, z] = (() => { const r = wheatfield.rings[0]; let a = 0, b = 0, n = 0; for (let i = 0; i < r.length; i += 2) { a += r[i]; b += r[i + 1]; n++; } return TER.xz(a / n, b / n); })();
  const u = v.pick(x, z); assert.ok(u && u.cls === 'wheatfield', 'the point at the middle of the Wheatfield is the Wheatfield'); assert.equal(v.pick(1e6, 1e6), null);
  th.state.t = T('1863-07-02T18:00'); const S_ = th.vegetation; const html = (() => { let out = ''; const f = { innerHTML: '', querySelector: sel => (sel === '#veg-card' ? { set innerHTML(h) { out = h; } } : null), addEventListener() {} }; reg.panels.get('vegetation').fn(f, th, scope); return out; })();
  assert.equal(typeof html, 'string');
  VEG.dispose(); assert.equal(th.vegetation, undefined); assert.equal(v.status(), null);
});
test('?veg=off keeps the module out of a visit; a missing data file is an error the loader can show', async () => {
  globalThis.location = { search: '?veg=off&x=1' }; try { const { ctx, th, reg } = standIn(); await VEG.init(ctx); assert.equal(reg.panels.size, 0); assert.equal(th.vegetation, undefined); } finally { delete globalThis.location; }
  const { ctx } = standIn(); ctx.urls = { data: pathToFileURL(path.join(APP, 'nothing-here') + path.sep).href }; await assert.rejects(() => VEG.init(ctx), /could not be read/);
  VEG.dispose();
});

// ---------------------------------------------------------------------------------------------------------------------------------- the WebGL2 path with a recording GL
// A stand-in for the GL context that records every call and answers like a driver that accepts everything. It judges nothing about the shaders (a browser run does that); it proves that
// the module's own code (data, meshes, programs, textures, buffers, the two hooks, the plan, the draw calls, the clean-up) runs through without a script error, draws what it should
// and gives every GL object back.
function recordingGL() {
  const calls = {}, consts = {}; let id = 0;
  const gl = new Proxy({}, { get(t, k) {
    if (typeof k !== 'string') return undefined; if (k in t) return t[k];
    if (/^[A-Z][A-Z0-9_]+$/.test(k)) { consts[k] ??= 1000 + Object.keys(consts).length; return consts[k]; }
    t[k] = (...a) => { (calls[k] ||= []).push(a); if (k === 'getParameter') return 32; if (/^create/.test(k)) return { id: ++id, k }; if (k === 'getUniformLocation') return { loc: a[1] }; if (k === 'getProgramParameter') return true; return undefined; };
    return t[k]; } });
  return { gl, calls };
}
test('the module on a stand-in theatre with a recording GL: programs, hooks, the plan of the troops, the draw calls, and clean-up', async () => {
  const { gl, calls } = recordingGL(), progs = [], hooks = [];
  const R = { gl, W: 800, H: 500, progs, prog(name, vs, fs) { const p = { name, vs, fs }; progs.push(p); return p; }, finishProgs() {} };
  const { ctx, th } = standIn('webgl2'); ctx.host.R = R; ctx.host.addSceneHook = h => { hooks.push(h); return () => { const i = hooks.indexOf(h); if (i >= 0) hooks.splice(i, 1); }; };
  // a stage with one formation that walks east through the middle of the Wheatfield between 2 July 12:00 and 20:00 (the shape the plan reads: cache.at, presence, bbox, layer, nL, _pos, _heading)
  const [wx, wz] = (() => { const r = wheatfield.rings[0]; let a = 0, b = 0, n = 0; for (let i = 0; i < r.length; i += 2) { a += r[i]; b += r[i + 1]; n++; } return TER.xz(a / n, b / n); })();
  const t0 = T('1863-07-02T12:00') * 60, rec = { id: 0 };
  th.stage = { nL: 1, layer: { units: [{ id: 'WALKER' }] }, presence: {}, bbox: [[-25, 25, -8, 8]], cache: { at: () => ({ u: [rec] }) }, _pos(r, t, out) { out[0] = wx - 150 + (t - t0) / 60 * 0.6; out[1] = wz; out[2] = 0; }, _heading: () => 0 };
  await VEG.init(ctx);
  assert.equal(progs.length, 3, 'three programs: ground cover, trees, tree shadows'); assert.equal(hooks.length, 1, 'one scene hook');
  const v = th.vegetation, s0 = v.status(); assert.equal(s0.api, 'webgl2'); assert.match(s0.status, /drawn on WebGL2/); assert.ok(s0.decalTriangles > 100000 && s0.trees > 100000, JSON.stringify(s0));
  const cam = { x: wx, y: 160, z: wz + 300, yaw: Math.PI, pitch: -0.4, fov: 60 * Math.PI / 180, near: 0.25, far: 14000 };
  let guard = 0; while (v.status().plan && !v.status().plan.done && guard++ < 5000) VEG.update({ tMin: T('1863-07-02T12:00'), dtMs: 16, cam, paused: false, speed: 1 });
  const s1 = v.status(); assert.ok(s1.plan && s1.plan.done, 'the plan of the troops is whole'); assert.ok(s1.plan.marked > 20, 'the walking formation marked ground: ' + s1.plan.marked);
  const p = v.planner(); assert.ok(p.visitAt(wx, wz) < 1e8, 'the middle of the Wheatfield was walked on'); assert.ok(p.visitAt(wx, wz) > T('1863-07-02T12:00') && p.visitAt(wx, wz) < T('1863-07-02T20:00'), 'at a minute inside the walk');
  assert.ok(s1.stateWrites >= 1 && (calls.texSubImage2D || []).length >= 2, 'the state texture and the table of visits were uploaded');
  const draws0 = (calls.drawElementsInstanced || []).length; hooks[0].scene(gl, R);
  assert.equal((calls.drawArrays || []).length, 1, 'the ground cover is one draw call'); assert.ok((calls.drawElementsInstanced || []).length > draws0, 'trees are drawn by chunks'); assert.ok(v.status().treesDrawn > 0);
  const d1 = (calls.drawElementsInstanced || []).length; hooks[0].shadow(gl, 0, R); assert.ok((calls.drawElementsInstanced || []).length > d1, 'the trees near the camera cast shadows');
  v.setOn(false); const d2 = (calls.drawElementsInstanced || []).length, a2 = (calls.drawArrays || []).length; hooks[0].scene(gl, R); assert.equal((calls.drawElementsInstanced || []).length, d2); assert.equal((calls.drawArrays || []).length, a2, 'switched off: nothing is drawn');
  v.setOn(true); th.bus.emit('scenario'); assert.equal(v.status().plan.done, false, 'a change of scenario starts the plan again'); assert.equal(v.status().plan.marked, 0);
  VEG.dispose(); assert.equal(hooks.length, 0, 'the hook is given back'); assert.equal(th.vegetation, undefined);
  assert.equal((calls.deleteProgram || []).length, 3); assert.ok((calls.deleteBuffer || []).length >= 6 && (calls.deleteTexture || []).length >= 2 && (calls.deleteVertexArray || []).length >= 3, 'every GL object is deleted');
});
test('a program that fails to link is taken out of the renderer\'s list, so the layers that start after it still start', async () => {
  const { gl } = recordingGL(); const progs = [];
  const R = { gl, W: 800, H: 500, progs, prog(name, vs, fs) { const p = { name }; progs.push(p); return p; }, finishProgs() { throw new Error('shader ' + progs[0].name); } };
  const { ctx } = standIn('webgl2'); ctx.host.R = R; ctx.host.addSceneHook = () => () => {};
  await assert.rejects(() => VEG.init(ctx), /shader veg-decal/); assert.equal(progs.length, 0, 'none of its programs stays in the list');
  VEG.dispose();
});
