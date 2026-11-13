// Read access to the tree a candidate test looks at.
//
//   import { openTree } from '../_lib/tree.mjs';
//   const t = openTree();            // reads R1H_TREE (scratch overlay written by apply_group.py) and R1H_BASE (default release/R1g/dist)
//   t.text('manifest.json')          // the candidate's version of a file when the group touched it, else the R1g file
//
// With R1H_TREE unset (or empty) the tree IS the base: that is the red run of a red-first test. candidates/r1h/_lib/prove.mjs sets both
// variables for the red and the green run. Files the group deletes (the _deleted.json list of the overlay) read as absent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const abs = (p) => (p ? path.resolve(REPO, p) : '');

export function openTree({ base = process.env.R1H_BASE || 'release/R1g/dist', tree = process.env.R1H_TREE || '' } = {}) {
  const baseDir = abs(base);
  const treeDir = abs(tree);
  let deleted = new Set();
  if (treeDir) {
    try { deleted = new Set(JSON.parse(fs.readFileSync(path.join(treeDir, '_deleted.json'), 'utf8'))); } catch { /* none */ }
  }
  const clean = (rel) => {
    const r = String(rel).replace(/\\/g, '/').replace(/^\/+/, '');
    if (!r || r.split('/').some((s) => s === '..')) throw new Error(`bad tree path: ${rel}`);
    return r;
  };
  const where = (rel) => {
    const r = clean(rel);
    if (deleted.has(r)) return null;
    if (treeDir) { const q = path.join(treeDir, r); if (fs.existsSync(q) && fs.statSync(q).isFile()) return q; }
    const b = path.join(baseDir, r);
    return fs.existsSync(b) && fs.statSync(b).isFile() ? b : null;
  };
  const walk = (dir, prefix, acc) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel, acc);
      else acc.add(rel);
    }
  };
  return {
    baseDir, treeDir, patched: Boolean(treeDir),
    exists: (rel) => where(rel) !== null,
    file: (rel) => where(rel),
    buffer: (rel) => { const f = where(rel); if (!f) throw new Error(`not in tree: ${rel}`); return fs.readFileSync(f); },
    text: (rel) => { const f = where(rel); if (!f) throw new Error(`not in tree: ${rel}`); return fs.readFileSync(f, 'utf8'); },
    json: (rel) => JSON.parse(fs.readFileSync(where(rel) ?? (() => { throw new Error(`not in tree: ${rel}`); })(), 'utf8')),
    // true when the candidate changed or added this file (always false in the red run)
    touched: (rel) => Boolean(treeDir) && fs.existsSync(path.join(treeDir, clean(rel))),
    // every file under a directory of the tree (union of base and overlay, minus deletions), posix paths relative to the dist root
    list: (dir = '') => {
      const acc = new Set();
      const d = clean(dir || '.').replace(/^\.$/, '');
      walk(path.join(baseDir, d), d, acc);
      if (treeDir) walk(path.join(treeDir, d), d, acc);
      return [...acc].filter((r) => !deleted.has(r)).sort();
    },
  };
}
