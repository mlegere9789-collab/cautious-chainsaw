// Fourth pass of GATE-SPEC-B.md (2026-11-14, about 00:50 UTC): calls the two vegetation gate hooks of app/docs/GATE-HOOKS.md exactly as app/tests/vegetation.test.mjs and
// vegetation-scene.test.mjs do, on the committed data with their default sample times and choice sets: checkVegetation (Q21.1, Q21.3, Q21.4) and checkScene (Q21.2 scene equals schedule).
// Read-only: imports pure modules, reads one JSON file and the terrain through the tests' node world, writes nothing.
//   node docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass4/veg_scene_check.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '../../../../app');
const { VegModel, checkVegetation, sampleTimes } = await import(path.join(APP, 'src/ext/vegetation/model.mjs'));
const { checkScene } = await import(path.join(APP, 'src/ext/vegetation/scene-check.mjs'));
const { buildTrees, buildDecals } = await import(path.join(APP, 'src/ext/vegetation/mesh.mjs'));
const { nodeWorld } = await import(path.join(APP, 'tests/node-world.mjs'));
const data = JSON.parse(fs.readFileSync(path.join(APP, 'data/vegetation.json'), 'utf8'));
const M = new VegModel(data);
const t0 = process.hrtime.bigint();
const a = checkVegetation(M);
const { T: TER } = await nodeWorld(), FLAT = (lng, lat) => TER.xz(lng, lat), GROUND = { W: TER.W, H: TER.H };
const trees = buildTrees(M, FLAT, GROUND), decals = buildDecals(M, FLAT, { maxEdge: 34 });
const b = checkScene(M, { project: FLAT, ground: GROUND, trees, decals });
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(JSON.stringify({
  data_bytes: fs.statSync(path.join(APP, 'data/vegetation.json')).size, units: data.units.length, claims: data.claims.length,
  checkVegetation: { gate: a.gate, ok: a.ok, checked: a.checked, failures: a.failures.length, first_failures: a.failures.slice(0, 3), notRun: a.notRun, summary: a.summary },
  checkScene: { gate: b.gate, part: b.part, ok: b.ok, checked: b.checked, failures: b.failures.length, first_failures: b.failures.slice(0, 3), notRun: b.notRun, facts: { ...b.facts, lrt: b.facts && b.facts.lrt ? Object.keys(b.facts.lrt).length + ' entries' : undefined } },
  wall_ms: Math.round(ms),
}, null, 1));
