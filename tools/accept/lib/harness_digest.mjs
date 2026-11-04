// tools/accept/lib/harness_digest.mjs - one digest over everything that decides a pass: this harness, the project browser harness, the static server, the
// verifier and the packer. run_eight compares it before and after every pass: if it moves, "no code change in between" is false and the run aborts.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, ACCEPT, walk, sha256File, sha256 } from './util.mjs';

export function harnessDigest() {
  const own = walk(ACCEPT).filter((f) => !f.startsWith('node_modules')).map((f) => path.join(ACCEPT, f));
  const extra = ['tests/t0/lib.mjs', 'tools/t0/serve.mjs', 'tools/t0/verify_release.mjs', 'tools/ship/pack_zip.py', 'package.json'].map((f) => path.join(REPO, f));
  const lines = [...own, ...extra].filter((f) => fs.existsSync(f)).sort().map((f) => `${path.relative(REPO, f).split(path.sep).join('/')} ${sha256File(f)}`);
  return { digest: sha256(lines.join('\n')), files: lines.length };
}

/** digest of a directory tree (path + sha256 per file) */
export function treeDigest(dir) {
  if (!fs.existsSync(dir)) return null;
  return sha256(walk(dir).map((f) => `${f} ${sha256File(path.join(dir, f))}`).join('\n'));
}
