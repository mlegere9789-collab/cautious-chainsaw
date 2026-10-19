// DATA fixes: placement rows that show a unit on the field before the Official Records say it arrived (rules and sources in tools/t0/data/idmap.mjs, PRE).
// The unit then first appears at its first row on or after the arrival tick.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preArrival } from '../idmap.mjs';
export const kind = 'text';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data');
const LINE = new RegExp(String.raw`^\s*\{"unit_id":"([^"]+)","tick":(\d+),`);
const NL = String.fromCharCode(10);
const out = [];
for (const f of fs.readdirSync(DATA).filter((x) => /^(placements_|density_).*\.json$/.test(x)).sort()) {
  const lines = fs.readFileSync(path.join(DATA, f), 'utf8').split(NL);
  lines.forEach((l, i) => {
    const m = LINE.exec(l);
    if (!m) return;
    const src = preArrival(m[1], m[2]);
    if (!src) return;
    const id = `DATA-pre-${f.replace(/\.json$/, '').replace(/_/g, '-')}-${m[1]}-${m[2]}`;
    const before = `row for ${m[1]} at tick ${m[2]}: the unit was not on the field yet`;
    if (l.trimEnd().endsWith(',')) { out.push({ id, target: 'data/' + f, find: l + NL, repl: '', expect: 1, cls: 'before-arrival', before, src }); return; }
    // last element of the array: drop it together with the comma of the row before it
    const prev = lines[i - 1];
    const pm = LINE.exec(prev);
    if (pm && preArrival(pm[1], pm[2])) throw new Error(`prearrival: ${f} line ${i + 1}: the previous row is also removed`);
    out.push({ id, target: 'data/' + f, find: prev + NL + l + NL, repl: prev.replace(/,\s*$/, '') + NL, expect: 1, cls: 'before-arrival', before, src });
  });
}
export default out;
if (process.argv[1] && process.argv[1].endsWith('prearrival.mjs')) console.log(out.length, 'rows removed');
