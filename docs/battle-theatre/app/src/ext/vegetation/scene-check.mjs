// Gate Q21, second check: "scene equals schedule" (GATE-SPEC Q21.2). A pure function (no DOM, no GPU, no clock): it compares what the layer hands to the graphics card with the schedule of
// the data. The schedule is the state function of model.mjs (checkVegetation looks at that); the scene is the 20 floats per unit that gl.mjs writes to the state texture
// (packUnitState, at the scene minute), the trees the build places (buildTrees) with the share of them a reading of Little Round Top keeps, and the ground-cover mesh (buildDecals).
// What it cannot see: what the shaders make of those numbers (a browser looks at pictures: tests/vegetation-browser.mjs) and any real-GPU timing.
import { stateAt, sampleTimes, sceneMinute, TIERS, minToIso } from './model.mjs';
import { packUnitState, STATE_K, CROPCODE, STAGECODE } from './gl.mjs';
import { buildDecals, buildTrees, TREE_STRIDE } from './mesh.mjs';

const near = (a, b) => Math.abs(a - b) <= 2e-5 + 2e-6 * Math.abs(b);
const mid = h => (h[0] + h[1]) / 2;

/**
 * checkScene(model, { project, ground, times, choicesList, trees, decals }) -> { gate: 'Q21', part: 'Q21.2 scene equals schedule', ok, checked, failures[{unit, t, iso, why}], facts, notRun[] }
 *   project(lng, lat) -> [x, z] and ground {W, H}: the theatre's own terrain projection and size (without them the trees and the ground cover are not built and are reported in notRun);
 *   trees / decals: the results of buildTrees / buildDecals when the caller has them already.
 * Checked: at every sampled minute and every set of choices, for every unit, the state texture holds exactly the schedule's colour, crop code, height, trampled, cut and laid-flat shares, stage code,
 * leaf cover, stripped share, canopy colour of a wood and kept share of trees; a unit with no ground state holds zeros; the scene draws crops and trees at all (counts), every unit has ground cover,
 * the trees placed on a wood or orchard are about its density, and the trees a reading of Little Round Top draws are the share it keeps.
 */
export function checkScene(model, opts = {}) {
  const times = opts.times || sampleTimes(model).filter((_, i) => i % 3 === 0), choicesList = opts.choicesList || [{}, { 'CF-VEG-LRT': 'wiki_unwooded' }, { 'CF-VEG-LRT': 'wiki_light_summit' }, { 'CF-VEG-RAIN': 'pdf_flattened' }, { 'CF-VEG-HARVEST': 'early' }];
  const failures = [], notRun = ['what the shaders make of these numbers (pictures are looked at in tests/vegetation-browser.mjs, on a software renderer only)', 'real-GPU timing'];
  const fail = (u, t, why) => { if (failures.length < 200) failures.push({ unit: u.id, t, iso: minToIso(t), why }); };
  const units = model.units, out = new Float32Array(STATE_K * 4), canopy = new Float32Array((units.length + 1) * 3); let checked = 0;
  units.forEach((u, i) => { if (!u.woods) return; let w = 0, c = [0, 0, 0]; for (const [n, share] of Object.entries(u.woods.species)) { const sp = model.species[n]; if (!sp) continue; for (let k = 0; k < 3; k++) c[k] += share * (sp.color[0][k] + sp.color[1][k]) / 2; w += share; } for (let k = 0; k < 3; k++) canopy[i * 3 + k] = w ? c[k] / w : [0.2, 0.34, 0.13][k]; });
  for (const t0 of times) for (const choices of choicesList) {
    const t = sceneMinute(t0);
    for (let i = 0; i < units.length; i++) {
      const u = units[i], s = stateAt(model, u, t, choices); checked++;
      packUnitState(model, u, t, choices, canopy, out, 0, i * 3);
      const g = s.ground, tr = s.trees;
      if (g) {
        for (let k = 0; k < 3; k++) if (!near(out[k], g.color[k])) fail(u, t, `colour ${k} in the scene ${out[k]} is not the schedule's ${g.color[k]}`);
        if (out[3] !== (CROPCODE[g.crop] ?? 0)) fail(u, t, 'crop code in the scene is not the schedule\'s crop ' + g.crop);
        if (!near(out[4], mid(g.h))) fail(u, t, 'height in the scene is not the schedule\'s');
        if (!near(out[5], g.trample)) fail(u, t, 'trampled share in the scene is not the schedule\'s');
        if (!near(out[6], g.cut)) fail(u, t, 'cut share in the scene is not the schedule\'s');
        if (!near(out[7], g.lodging)) fail(u, t, 'laid-flat share in the scene is not the schedule\'s');
        if (out[12] !== (STAGECODE[g.stage] ?? 0)) fail(u, t, 'stage code in the scene is not the schedule\'s stage ' + g.stage);
        if (!(u.woods && tr) && !near(out[14], g.hStanding ? mid(g.hStanding) : 0)) fail(u, t, 'standing height in the scene is not the schedule\'s');      // (in a wood the floats of texel 3 hold the canopy colour)
      } else for (let k = 0; k < 8; k++) if (out[k] !== 0) fail(u, t, 'a unit with no ground state has ground in the scene');
      if (!near(out[9], tr ? tr.leaf : 1)) fail(u, t, 'leaf cover in the scene is not the schedule\'s');
      if (!near(out[10], tr ? tr.strip : 0)) fail(u, t, 'stripped share in the scene is not the schedule\'s');
      if (!near(out[16], tr && tr.keep != null ? tr.keep : 1)) fail(u, t, 'share of trees kept in the scene is not the schedule\'s');
      if (g && g.crop === 'forest_floor' && tr) { const k = Math.min(1, Math.max(0, (tr.leaf - 0.35) / 0.45)), sm = k * k * (3 - 2 * k); for (let c = 0; c < 3; c++) { const bare = [0.27, 0.22, 0.17][c], want = bare + (canopy[i * 3 + c] - bare) * sm; if (!near(out[13 + c], want)) fail(u, t, 'canopy colour of the wood in the scene is not the schedule\'s leaf cover'); } }
      if (!TIERS.includes(s.tier)) fail(u, t, 'no tier');
    }
  }
  const facts = { units: units.length, times: times.length, choiceSets: choicesList.length, stateFloatsPerUnit: STATE_K * 4 };
  if (opts.project && opts.ground) {
    const trees = opts.trees || buildTrees(model, opts.project, opts.ground), decals = opts.decals || buildDecals(model, opts.project, { maxEdge: 34 });
    facts.trees = trees.n; facts.decalTriangles = decals.triangles;
    if (!(trees.n > 60000)) fail({ id: 'scene' }, 0, 'the scene draws too few trees: ' + trees.n);
    if (!(decals.triangles > 50000)) fail({ id: 'scene' }, 0, 'the scene draws too little ground cover: ' + decals.triangles + ' triangles');
    units.forEach((u, i) => { if (!(decals.perUnit[i] > 0)) fail(u, 0, 'a unit with no ground cover in the scene'); });
    // trees placed per unit: about the unit's density; and what a reading of Little Round Top draws is the share it keeps
    const per = new Map(), seedKept = new Map();
    for (let o = 0; o < trees.n * TREE_STRIDE; o += TREE_STRIDE) { const ui = trees.data[o + 8]; per.set(ui, (per.get(ui) || 0) + 1); }
    let densityChecked = 0;
    units.forEach((u, i) => {
      if (!(u.woods || u.orchard)) return; const n = per.get(i) || 0, ha = u.area_ac * 0.404686;
      // a wood: its trees per hectare plus the understory shrubs its account of the undergrowth gives (moderate 30, thick 140 per hectare); an orchard: one tree to a square of the spacing
      const want = u.orchard ? ha * 1e4 / (u.orchard.spacing_m * u.orchard.spacing_m) : (u.woods.per_ha + ({ moderate: 30, thick: 140 }[u.woods.understory] || 0)) * ha, lo = u.orchard ? 0.6 : 0.75, hi = u.orchard ? 1.5 : 1.25;
      if (want >= (u.orchard ? 60 : 30)) { densityChecked++; if (n < lo * want || n > hi * want) fail(u, 0, `${n} trees placed where the schedule's density gives about ${Math.round(want)}`); }
    });
    facts.densityChecked = densityChecked;
    for (const ch of choicesList) for (const id of model.lrtUnits) {
      const u = model.unit(id), i = units.indexOf(u), keep = stateAt(model, u, sceneMinute(36000 + 40 * 1440), ch).trees.keep; let n = 0, drawn = 0;
      for (let o = 0; o < trees.n * TREE_STRIDE; o += TREE_STRIDE) if (trees.data[o + 8] === i) { n++; if (trees.data[o + 5] <= keep) drawn++; }
      if (n >= 20 && Math.abs(drawn - keep * n) > 0.15 * n + 3) fail(u, 0, `${drawn} of ${n} trees drawn under the reading ${JSON.stringify(ch)} where the schedule keeps ${keep}`);
      seedKept.set(id + JSON.stringify(ch), [n, drawn, keep]);
    }
    facts.lrt = Object.fromEntries([...seedKept.entries()].map(([k, v]) => [k, v]));
  } else notRun.push('the trees placed and the ground-cover mesh (no projection given)');
  return { gate: 'Q21', part: 'Q21.2 scene equals schedule', ok: failures.length === 0, checked, failures, facts, notRun };
}

export const SCENE_HOOK = { gate: 'Q21', module: 'src/ext/vegetation/scene-check.mjs', fn: 'checkScene(model, { project, ground, times, choicesList })', inputs: 'model = new VegModel(JSON of data/vegetation.json); project(lng, lat) -> [x, z] and ground {W, H} of the theatre\'s terrain (optional: without them the trees and the mesh are not built)', output: '{ gate, part, ok, checked, failures[], facts, notRun[] }' };
