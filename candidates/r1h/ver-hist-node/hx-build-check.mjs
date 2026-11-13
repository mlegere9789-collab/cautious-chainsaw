#!/usr/bin/env node
// hx-build-check.mjs - the knowledge base of Ask the Historian is built by the same tool under the default Node and under Node 24 and comes out the same, byte for byte, as the committed historian-src/dist/hx.
//   node candidates/r1h/ver-hist-node/hx-build-check.mjs     builds into tmp/r1h-cand/ver-hist-node/hx-node22 and hx-node24 (about 15 s of CPU each), compares, writes hx-build.json, removes the two directories
// Exit 0 when the two builds are identical and every file the committed directory shares with them is identical.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const W = path.join(REPO, 'tmp/r1h-cand/ver-hist-node');
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), base) : [path.relative(base, path.join(d, e.name))])).sort();
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const tree = (d) => Object.fromEntries(walk(d).map((f) => [f, sha(path.join(d, f))]));
const runs = [['node22', process.execPath], ['node24', '/opt/node24/bin/node']]; const built = {};
for (const [name, bin] of runs) {
  const out = path.join(W, `hx-${name}`); fs.rmSync(out, { recursive: true, force: true });
  const r = spawnSync(bin, ['tools/historian/build.mjs', '--out', out, '--quiet'], { cwd: REPO, encoding: 'utf8' });
  if (r.status !== 0) { console.error(`${name}: build exit ${r.status}\n${(r.stdout + r.stderr).slice(-600)}`); process.exit(1); }
  built[name] = { node: spawnSync(bin, ['--version'], { encoding: 'utf8' }).stdout.trim(), dir: out, files: tree(out) };
}
const committed = tree(path.join(REPO, 'historian-src/dist/hx'));
const a = built.node22.files, b = built.node24.files;
const names = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
const differ22vs24 = names.filter((f) => a[f] !== b[f]);
const shared = Object.keys(a).filter((f) => f in committed); const differCommitted = shared.filter((f) => a[f] !== committed[f]);
const onlyBuilt = Object.keys(a).filter((f) => !(f in committed)); const onlyCommitted = Object.keys(committed).filter((f) => !(f in a));
const res = { command: 'node tools/historian/build.mjs --out <dir> --quiet', node22: built.node22.node, node24: built.node24.node, files_built: names.length, manifest_sha256: a['manifest.json'], identical_22_vs_24: differ22vs24.length === 0, differing_22_vs_24: differ22vs24,
  shared_with_committed: shared.length, identical_to_committed_on_shared: differCommitted.length === 0, differing_from_committed: differCommitted, only_in_build: onlyBuilt, only_in_committed: onlyCommitted,
  note: 'the committed directory keeps the previous manifests and older content-hashed files; they are not part of a build' };
fs.writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'hx-build.json'), JSON.stringify(res, null, 1) + '\n');
for (const [name] of runs) fs.rmSync(built[name].dir, { recursive: true, force: true });
fs.rmSync(path.join(W, 'validation-report.json'), { force: true });
console.log(JSON.stringify({ ...res, differing_22_vs_24: res.differing_22_vs_24.length, only_in_build: res.only_in_build.length, only_in_committed: res.only_in_committed }, null, 1));
process.exit(res.identical_22_vs_24 && res.identical_to_committed_on_shared && onlyBuilt.length === 0 ? 0 : 1);
