// DATA fixes: the position notes of data/placements_*.json and data/density_*.json -- one regex patch per (file, unit, tick) line whose note a rule changes.
// The rules and their sources are in tools/t0/data/notes-rules.mjs.  `node tools/t0/data/fixes/notes.mjs` prints the flagged notes no rule covers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXACT } from '../notes-rules.mjs';
import { remapId, preArrival } from '../idmap.mjs';
export const kind = 'text';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data');
const BS = String.fromCharCode(92);
const META = '.*+?^${}()|[]' + BS;
const esc = (s) => { let o = ''; for (const ch of s) o += META.includes(ch) ? BS + ch : ch; return o; };
const LINE = new RegExp(String.raw`^\s*\{"unit_id":"([^"]+)","tick":(\d+),.*?"notes":"((?:[^"\\]|\\.)*)"`);
const FLAG = new RegExp(String.raw`\d{1,2}:\d{2}|\b[ap]\.?m\b|\d{2,}|first|last|only|largest|highest|killed|wounded|will |reportedly|famous|never|died|dying|worst|destroyed|captured|surrender`, 'i');
const out = [];
const uncovered = [];
const seen = new Set();
for (const f of fs.readdirSync(DATA).filter((x) => /^(placements_|density_).*\.json$/.test(x)).sort()) {
  for (const l of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')) {
    const m = LINE.exec(l);
    if (!m) continue;
    const [, unit, tick, rawNote] = m;
    const note = JSON.parse('"' + rawNote + '"');
    if (preArrival(unit, tick)) continue;   // the row is removed by fixes/prearrival.mjs
    const r = EXACT.get(note);
    if (!r) { if (FLAG.test(note)) uncovered.push(`${f} t${tick} ${unit} | ${note}`); continue; }
    if (r.cls === 'keep' || r.repl === note) continue;
    const unit2 = remapId(f, unit, tick, note);   // fixes/ids.mjs runs first and has already corrected the id on this row
    const key = `${f}|${unit2}|${tick}|${note}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const newRaw = JSON.stringify(r.repl).slice(1, -1);
    out.push({
      id: `DATA-note-${f.replace(/\.json$/, '').replace(/_/g, '-')}-${unit2}-${tick}`,
      target: 'data/' + f, regex: true,
      find: `("unit_id":"${esc(unit2)}","tick":${tick},[^${BS}n]*?"notes":")${esc(rawNote)}"`,
      repl: BS + 'g<1>' + newRaw.split(BS).join(BS + BS) + '"',
      expect: 1, cls: r.cls, before: note, src: r.src,
    });
  }
}
export const notesUncovered = uncovered;
export default out;
if (process.argv[1] && process.argv[1].endsWith('notes.mjs')) { console.log('patches', out.length, 'uncovered flagged', uncovered.length); console.log(uncovered.join('\n')); }
