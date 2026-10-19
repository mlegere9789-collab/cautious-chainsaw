// DATA fixes: unit ids in the density_* position files that name a different unit than the note on the same row, or that are not order-of-battle ids at all.
// The unit panel looks the id up in the order of battle, so a wrong id shows another unit's commander, strength and casualties on the row, and an unknown id shows none.
// Each rule is [file, old id, new id, tick list or 'all', reason]; one plain find/replace per row, anchored on the row's own position so the rules cannot chain.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL, noteOf, preArrival } from '../idmap.mjs';
export const kind = 'text';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data');
const SRC = 'order of battle ids (data/oob/*.json) against the unit named in the row\'s own note; OR 27/1 pp.155-168 and OR 27/2 pp.283-292 for the brigade and division names';
const out = [];
const seen = new Set();
const files = fs.readdirSync(DATA).filter((x) => /^(placements_|density_).*\.json$/.test(x)).sort();
for (const [fileKey, from, to, ticks, why, nre] of ALL) {
  for (const f of files) {
    if (fileKey !== '*' && f !== fileKey + '.json') continue;
    for (const l of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')) {
      const m = new RegExp('^\\s*\\{"unit_id":"' + from.replace(/[-]/g, '\\-') + '","tick":(\\d+),"lat":([\\d.-]+),"lng":([\\d.-]+),').exec(l);
      if (!m) continue;
      if (ticks !== 'all' && !ticks.includes(+m[1])) continue;
      if (nre && !nre.test(noteOf(l))) continue;
      if (preArrival(from, m[1])) continue;   // the row is removed by fixes/prearrival.mjs
      const find = `"unit_id":"${from}","tick":${m[1]},"lat":${m[2]},"lng":${m[3]},`;
      const key = f + '|' + find;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ id: `DATA-id-${f.replace(/\.json$/, '').replace(/_/g, '-')}-${from}-${m[1]}`, target: 'data/' + f, find, repl: `"unit_id":"${to}","tick":${m[1]},"lat":${m[2]},"lng":${m[3]},`, expect: 1, cls: 'wrong-id', before: `unit id ${from}: ${why}`, src: SRC });
    }
  }
}
export default out;
if (process.argv[1] && process.argv[1].endsWith('ids.mjs')) console.log(out.length, 'rows remapped');
