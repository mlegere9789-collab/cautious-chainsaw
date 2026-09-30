// Preload for `node --import`: records every file the process opens through fs (read, exists, stat) under TRACE_ROOT into the file named
// by TRACE_OUT (one repo-relative path per line, written at exit). Used by class_sweeps.test.mjs to DISCOVER the validator's inputs
// instead of listing the ones somebody remembered. Read-only: nothing is created except TRACE_OUT.
import fs from 'node:fs';
import path from 'node:path';

const out = process.env.TRACE_OUT;
const root = path.resolve(process.env.TRACE_ROOT ?? process.cwd());
const writeFileSync = fs.writeFileSync.bind(fs);
const seen = new Set();
const note = (p) => {
  try {
    const abs = path.resolve(String(p));
    const rel = path.relative(root, abs);
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) seen.add(rel.split(path.sep).join('/'));
  } catch { /* not a path */ }
};
for (const fn of ['readFileSync', 'existsSync', 'statSync', 'readdirSync']) {
  const original = fs[fn];
  fs[fn] = function patched(p, ...rest) { if (typeof p === 'string') note(p); return original.call(this, p, ...rest); };
}
process.on('exit', () => { if (out) writeFileSync(out, [...seen].sort().join('\n') + '\n'); });
