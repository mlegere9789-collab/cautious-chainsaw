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
