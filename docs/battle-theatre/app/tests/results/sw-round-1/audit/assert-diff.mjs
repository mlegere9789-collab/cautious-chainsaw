// Lists the assertions of a spec file at two git refs (balanced-paren extraction of assert.xxx( ... ) calls) and prints the ones that exist only in one of them.
//   node tmp/bt-spec/audit/assert-diff.mjs <oldref> <newref|WORKTREE> <spec file names...>
import { execFileSync } from 'node:child_process'; import fs from 'node:fs';
const [oldRef, newRef, ...files] = process.argv.slice(2);
const get = (ref, f) => ref === 'WORKTREE' ? fs.readFileSync('docs/battle-theatre/app/tests/' + f, 'utf8') : execFileSync('git', ['show', `${ref}:docs/battle-theatre/app/tests/${f}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
function asserts(src) {
  const out = []; const re = /\bassert(?:\.[a-zA-Z]+)?\(|\bt\.gpuOnly\(/g; let m;
  while ((m = re.exec(src))) { let i = re.lastIndex, d = 1, q = null; for (; i < src.length && d > 0; i++) { const c = src[i]; if (q) { if (c === '\\') i++; else if (c === q) q = null; } else if (c === '"' || c === "'" || c === '`') q = c; else if (c === '(') d++; else if (c === ')') d--; } out.push(src.slice(m.index, i).replace(/\s+/g, ' ')); }
  return out;
}
for (const f of files) {
  let a, b; try { a = asserts(get(oldRef, f)); } catch { a = null; } b = asserts(get(newRef, f));
  if (!a) { console.log(`## ${f}: not at ${oldRef}`); continue; }
  const A = new Map(), B = new Map(); for (const x of a) A.set(x, (A.get(x) || 0) + 1); for (const x of b) B.set(x, (B.get(x) || 0) + 1);
  const gone = [...A].filter(([x, n]) => (B.get(x) || 0) < n), added = [...B].filter(([x, n]) => (A.get(x) || 0) < n);
  console.log(`## ${f}: ${a.length} assertions at ${oldRef}, ${b.length} at ${newRef}; only in old: ${gone.length}, only in new: ${added.length}`);
  for (const [x] of gone) console.log('   - OLD ONLY  ' + x.slice(0, 330)); for (const [x] of added) console.log('   + NEW ONLY  ' + x.slice(0, 330));
}
