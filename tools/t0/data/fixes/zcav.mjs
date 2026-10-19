// DATA fixes: data/density_day3_cavalry.json (East Cavalry Field, 21 placement rows, pretty-printed: one key per line, so the one-row-per-line patches of fixes/zpos.mjs never
// reach it).  Three defects, all found by the position audit (AUDIT.md section 8):
//   * seven unit ids are not order-of-battle ids (C-CAV-2-1 .. C-CAV-2-4, U-CAV-2-M, U-CAV-2-G): Hampton's, Fitz Lee's, Chambliss's and Jenkins's brigades, Custer's Michigan brigade
//     and Gregg's division are the order-of-battle ids C-CAV-1 .. C-CAV-4, U-CAV-2-3 and U-CAV-2, which have their own rows elsewhere, so each brigade was on the map twice;
//   * every row lies 3.0-3.4 km west of the NPS monuments of East Cavalry Field (see fixes/zpos.mjs section D2 and fixes/terrain3.mjs);
//   * the rows "Stuart's corps reforming" and "Stuart withdrawing" (ticks 540 and 555) are on the id of Fitz Lee's brigade, whose own rows say otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'text';
const BS = String.fromCharCode(92);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROWS = JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data', 'density_day3_cavalry.json'), 'utf8')).placements;
export const CAV3_REMAP = { 'C-CAV-2-1': 'C-CAV-1', 'C-CAV-2-2': 'C-CAV-2', 'C-CAV-2-3': 'C-CAV-3', 'C-CAV-2-4': 'C-CAV-4', 'U-CAV-2-M': 'U-CAV-2-3', 'U-CAV-2-G': 'U-CAV-2' };
const SRC_E = 'NPS monuments as mapped in OpenStreetMap (ODbL), fetched 2026-10-19: Custer HQ marker 39.82669,-77.16524, Michigan Cavalry Brigade monument 39.82615,-77.16529, McIntosh 39.82589,-77.16307, Gregg shaft 39.82641,-77.16300, Stuart division 39.83499,-77.17024, Hampton 39.83649,-77.16888, Fitz Lee 39.83837,-77.16697, Jenkins 39.83247,-77.17391, Chambliss 39.83360,-77.17211; data/oob/confederate_cavalry.json and union_oob_brigades.json for the ids';
const num = (x) => String(x).replace('.', BS + '.');
const FILE = 'data/density_day3_cavalry.json';
const out = [];
// Stuart's division rows sit on the id of Fitz Lee's brigade (there is no order-of-battle id for the division): they are removed, the brigades' own rows show the fight
const DEL = new Set(['C-CAV-2|505', 'C-CAV-2|540', 'C-CAV-2|555']);
// each unit's rows move by (NPS marker - the unit's first row), so the motion within the file is kept
const TARGET = { 'C-CAV-2-1': [39.83649, -77.16888], 'C-CAV-2-2': [39.83837, -77.16697], 'C-CAV-2-3': [39.8336, -77.17211], 'C-CAV-2-4': [39.83247, -77.17391], 'U-CAV-2-M': [39.82669, -77.16524], 'U-CAV-2-G': [39.82641, -77.163] };
const FIRST = {}; for (const r of ROWS) FIRST[r.unit_id] ||= r;
const D = (id) => ({ dlat: +(TARGET[id][0] - FIRST[id].lat).toFixed(4), dlng: +(TARGET[id][1] - FIRST[id].lng).toFixed(4) });
for (const r of ROWS) {
  const key = `${r.unit_id}|${r.tick}`;
  if (DEL.has(key)) {
    out.push({ id: `DATA-cav3-del-${r.unit_id}-${r.tick}`, target: FILE, regex: true, expect: 1, cls: 'wrong-id',
      before: `${r.unit_id} tick ${r.tick}: "${r.notes}" on the id of Fitz Lee's brigade, which has its own rows`, src: SRC_E,
      // the first row of the array has no comma before it: take the comma after it instead
      find: r === ROWS[0] ? `${BS}{${BS}s*"unit_id": "${r.unit_id}",${BS}s*"tick": ${r.tick},[^}]*${BS}},${BS}s*` : `,${BS}s*${BS}{${BS}s*"unit_id": "${r.unit_id}",${BS}s*"tick": ${r.tick},[^}]*${BS}}`, repl: '' });
    continue;
  }
  let lat, lng, why;
  { const d = D(r.unit_id); lat = +(r.lat + d.dlat).toFixed(4); lng = +(r.lng + d.dlng).toFixed(4); why = `(${d.dlat}, ${d.dlng}) degrees, the offset between the unit's first row of the file and its NPS marker`; }
  out.push({ id: `DATA-cav3-pos-${r.unit_id}-${r.tick}`, target: FILE, regex: true, expect: 1, cls: 'wrong-place',
    before: `${r.unit_id} tick ${r.tick} at ${r.lat}, ${r.lng}: 3.0-3.4 km west of the NPS monuments of East Cavalry Field; moved by ${why}`, src: SRC_E,
    find: `("unit_id": "${r.unit_id}",${BS}s+"tick": ${r.tick},${BS}s+"lat": )${num(r.lat)},(${BS}s+"lng": )${num(r.lng)},`, repl: `${BS}g<1>${lat},${BS}g<2>${lng},` });
}
for (const [from, to] of Object.entries(CAV3_REMAP)) {
  const n = ROWS.filter((r) => r.unit_id === from && !DEL.has(`${r.unit_id}|${r.tick}`)).length;
  out.push({ id: `DATA-cav3-id-${from}`, target: FILE, expect: n, cls: 'wrong-id', find: `"unit_id": "${from}",`, repl: `"unit_id": "${to}",`,
    before: `unit id ${from} is not an order-of-battle id; the row is about ${to}`, src: SRC_E });
}
export default out;
if (process.argv[1] && process.argv[1].endsWith('zcav.mjs')) console.log('patches', out.length);
