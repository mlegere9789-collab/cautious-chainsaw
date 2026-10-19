// Resolves the rules of okey-rules.mjs against the baseline order-of-battle files: a rule whose fragment sits in a one-object-per-line record becomes a row edit
// (applied by the generator to the merged value of that record's member, after every other module's sets), any other becomes an exact text patch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from './okey-rules.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OOB = path.join(HERE, '..', '..', '..', 'baseline', 'dist', 'data', 'oob');
const BS = String.fromCharCode(92);
const META = '.*+?^${}()|[]' + BS;
export const esc = (s) => { let o = ''; for (const ch of s) META.includes(ch) ? (o += BS + ch) : (o += ch); return o; };
const IDK = ['regiment_id', 'battery_id', 'brigade_id', 'division_id', 'corps_id'];
const files = fs.readdirSync(OOB).filter((f) => f.endsWith('.json'));
const lines = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(OOB, f), 'utf8').split('\n')]));
function findPath(o, frag, pre = '') {
  if (typeof o === 'string') return o.includes(frag) ? pre : null;
  if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) { const r = findPath(v, frag, pre ? pre + '.' + k : k); if (r) return r; }
  return null;
}
export const rowEdits = [], textEdits = [], problems = [];
RULES.forEach(([old, repl, cls, src], i) => {
  const raw = JSON.stringify(old).slice(1, -1);
  const hits = [];
  for (const f of files) lines[f].forEach((l, n) => { const c = l.split(raw).length - 1; for (let k = 0; k < c; k++) hits.push([f, n]); });
  if (hits.length !== 1) { problems.push(`rule ${i + 1} (${old.slice(0, 50)}): ${hits.length} matches in baseline`); return; }
  const [f, n] = hits[0]; const line = lines[f][n].trim().replace(/,$/, '');
  const before = old.length > 160 ? old.slice(0, 157) + '...' : old;
  let obj = null; if (line.startsWith('{')) { try { obj = JSON.parse(line); } catch { obj = null; } }
  const idk = obj && IDK.find((k) => typeof obj[k] === 'string');
  if (obj && idk) {
    const field = findPath(obj, old);
    if (!field) { problems.push(`rule ${i + 1}: fragment not inside one string member`); return; }
    rowEdits.push({ file: f, key: idk, id: obj[idk], field, old, repl, cls, before, src, rule: i + 1 });
  } else {
    const newRaw = JSON.stringify(repl).slice(1, -1);
    textEdits.push({ id: 'DATA-okey-' + String(i + 1).padStart(3, '0'), target: 'data/oob/' + f, regex: true, find: esc(raw), repl: newRaw.split(BS).join(BS + BS), expect: 1, cls, before, src });
  }
});
if (problems.length) throw new Error('okey rules that do not match exactly once:\n' + problems.join('\n'));
