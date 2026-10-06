// Counts every `find` string of dist/ANIM-proto.json in the entry bundle of each built tree (the builder asserts the same with `expect: 1`; this shows WHERE each hook holds).
//   node docs/pitch/anim/05-proto/test/anchors-count.mjs
// Trees: release/R1a, R1b, R1c (the integrator's builds, read only) and the R1c + MON control tree built by anim_build.py --control.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..', '..');
const patches = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'dist', 'ANIM-proto.json'), 'utf8')).patches;
const trees = { R1a: 'release/R1a/dist', R1b: 'release/R1b/dist', R1c: 'release/R1c/dist', 'R1c+MON': 'tmp/pitch-anim/arch/anim-R1c-control/dist' };
const entry = (d) => { const a = fs.readdirSync(path.join(REPO, d, 'assets')).find((f) => /^index-[A-Za-z0-9]+\.js$/.test(f)); return fs.readFileSync(path.join(REPO, d, 'assets', a), 'utf8'); };
const text = Object.fromEntries(Object.entries(trees).map(([k, d]) => [k, entry(d)]));
console.log('patch'.padEnd(22), Object.keys(trees).join(' / '));
for (const p of patches) {
  const row = Object.keys(trees).map((k) => { let n = 0, i = -1; while ((i = text[k].indexOf(p.find, i + 1)) >= 0) n++; return n; });
  console.log(p.id.padEnd(22), row.join(' / '));
}
