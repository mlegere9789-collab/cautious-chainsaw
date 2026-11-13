// Third pass of GATE-SPEC-B.md (2026-11-13, after 23:00 UTC): calls the vegetation gate hook of app/docs/GATE-HOOKS.md (checkVegetation, gate Q21) exactly as app/tests/vegetation.test.mjs does,
// on the committed data, with its default sample times and scenario sets, and prints what it returns. Read-only: imports a pure module, reads one JSON file, writes nothing.
//   node docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass3/veg_check.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '../../../../app');
const { VegModel, checkVegetation, sampleTimes, GATE_HOOKS } = await import(path.join(APP, 'src/ext/vegetation/model.mjs'));
const data = JSON.parse(fs.readFileSync(path.join(APP, 'data/vegetation.json'), 'utf8'));
const t0 = process.hrtime.bigint();
const M = new VegModel(data);
const r = checkVegetation(M);
const ms = Number(process.hrtime.bigint() - t0) / 1e6;
const times = sampleTimes(M);
console.log(JSON.stringify({
  gate: r.gate, ok: r.ok, checked: r.checked, failures: r.failures.length, first_failures: r.failures.slice(0, 3),
  notRun: r.notRun, summary: r.summary, sample_times: times.length, units: data.units.length, claims: data.claims.length,
  schema: data.schema, wall_ms: Math.round(ms), hooks_declared: GATE_HOOKS.map(h => h.gate + ' ' + h.fn),
}, null, 1));
