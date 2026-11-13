// A scratch copy of the repository for tests and mutation runs. The harness finds its data relative to its own location (lib.mjs ROOT), so a copy of the harness works on a copy of the tree: here
// tools/bt/realize and tests/governance/realize* are COPIED, every other file the harness reads is reached through symbolic links into the real tree, and a file named in `files` is replaced by a private
// copy (changed by the caller's function). Nothing here writes into the real tree: the scratch tree lives under tmp/ (gitignored) and is removed by removeTree.
//
//   const root = makeTree('tmp/realize/scratch-1', { files: { 'docs/battle-theatre/GOVERNANCE/timeline_seed.jsonl': t => t + '\n' } });
//   spawnSync('node', [path.join(root, 'tools/bt/realize/check.mjs'), '--digests'])
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from './lib.mjs';

const copyDir = (src, dst, re = null) => { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { if (e.isDirectory()) continue; if (!re || re.test(e.name)) fs.copyFileSync(path.join(src, e.name), path.join(dst, e.name)); } };
// make `rel` (a file of the real tree) a private copy inside `dst`: every directory on its way is real and holds links to its other entries
function privatize(dst, rel) {
  const parts = rel.split('/'); let real = ROOT, here = dst;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = path.join(here, parts[i]);
    if (fs.existsSync(next) && fs.lstatSync(next).isSymbolicLink()) fs.unlinkSync(next);
    if (!fs.existsSync(next)) { fs.mkdirSync(next, { recursive: true }); for (const e of fs.readdirSync(path.join(real, parts[i]))) { if (e === parts[i + 1]) continue; const l = path.join(next, e); if (!fs.existsSync(l)) fs.symlinkSync(path.join(real, parts[i], e), l); } }
    else for (const e of fs.readdirSync(path.join(real, parts[i]))) { if (e === parts[i + 1]) continue; const l = path.join(next, e); if (!fs.existsSync(l)) fs.symlinkSync(path.join(real, parts[i], e), l); }
    real = path.join(real, parts[i]); here = next;
  }
  const f = path.join(here, parts[parts.length - 1]); if (fs.existsSync(f) && fs.lstatSync(f).isSymbolicLink()) fs.unlinkSync(f);
  return f;
}
export function makeTree(dst, { files = {} } = {}) {
  dst = path.resolve(ROOT, dst); fs.rmSync(dst, { recursive: true, force: true }); fs.mkdirSync(dst, { recursive: true });
  copyDir(path.join(ROOT, 'tools/bt/realize'), path.join(dst, 'tools/bt/realize')); copyDir(path.join(ROOT, 'tests/governance'), path.join(dst, 'tests/governance'), /^realize.*\.mjs$/);
  // top level links: docs (and anything else a path in `files` does not need privately)
  for (const e of fs.readdirSync(ROOT)) { if (['tools', 'tests', 'tmp', '.git', 'node_modules'].includes(e)) continue; const l = path.join(dst, e); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ROOT, e), l); }
  fs.mkdirSync(path.join(dst, 'tools/bt'), { recursive: true });
  for (const e of fs.readdirSync(path.join(ROOT, 'tools/bt'))) { if (e === 'realize') continue; const l = path.join(dst, 'tools/bt', e); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ROOT, 'tools/bt', e), l); }
  for (const e of fs.readdirSync(path.join(ROOT, 'tools'))) { if (e === 'bt') continue; const l = path.join(dst, 'tools', e); if (!fs.existsSync(l)) fs.symlinkSync(path.join(ROOT, 'tools', e), l); }
  for (const [rel, edit] of Object.entries(files)) {
    let target;
    if (rel.startsWith('tools/bt/realize/') || rel.startsWith('tests/governance/')) target = path.join(dst, rel);
    else { target = privatize(dst, rel); fs.copyFileSync(path.join(ROOT, rel), target); }
    const before = fs.readFileSync(target, 'utf8'), after = typeof edit === 'function' ? edit(before) : String(edit);
    if (after === before) throw new Error(`makeTree: the edit of ${rel} changed nothing`); fs.writeFileSync(target, after);
  }
  return dst;
}
export const removeTree = dst => fs.rmSync(path.resolve(ROOT, dst), { recursive: true, force: true });
