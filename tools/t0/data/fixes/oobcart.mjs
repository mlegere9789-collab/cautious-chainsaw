// DATA fixes: casualties of Confederate cavalry regiments and of the batteries the Official Records return lists individually
// (OR 27/2 pp.338-346, read from the page images; most artillery battalions are 'not reported in detail' and cannot be checked per battery).
// Cavalry: the return prints a loss per regiment; a figure above it is marked Contested (the return is approximate, p.338); the 5th Virginia, Jenkins's brigade
// and Imboden's command have no loss of record in it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'baseline', 'dist', 'data', 'oob', f), 'utf8'));
const SRC = 'OR 27/2 pp.345-346 (return of casualties)';
const CAV = { 'C-1SC-CAV': 14, 'C-2SC-CAV': 7, 'C-Cobb-CAV': 21, 'C-Phil-CAV': 10, 'C-Jeff-MS-CAV': 15, 'C-1VA-CAV': 22, 'C-2VA-CAV': 5, 'C-3VA-CAV': 6, 'C-4VA-CAV': 17, 'C-9VA-CAV': 12, 'C-10VA-CAV': 12, 'C-13VA-CAV': 17 };
const NOREC = new Set(['C-5VA-CAV', 'C-14VA-CAV', 'C-16VA-CAV', 'C-17VA-CAV', 'C-34VA-CAV-B', 'C-36VA-CAV-B', 'C-18VA-CAV', 'C-62VA-MTD', 'C-VA-PA-CAV', 'C-McClanahan-ART']);
const cavRows = [];
for (const r of rd('confederate_cavalry.json').regiments) {
  const ka = (r.key_action || '').replace(/\s+$/, '');
  if (CAV[r.regiment_id] !== undefined) {
    const o = CAV[r.regiment_id];
    if (r.casualties < o) cavRows.push({ id: r.regiment_id, set: { casualties: o }, cls: 'wrong-number', before: `casualties ${r.casualties} below the ${o} in the return`, src: SRC });
    else if (r.casualties > Math.max(o + 3, Math.round(o * 1.1))) cavRows.push({ id: r.regiment_id, set: { key_action: `${ka} Casualties: this file gives ${r.casualties}; the Official Records return prints ${o} for the regiment (its loss of record). Contested.` }, cls: 'contested-number', before: `casualties ${r.casualties} against ${o} in the return`, src: SRC });
  } else if (NOREC.has(r.regiment_id) && r.casualties > 0) {
    cavRows.push({ id: r.regiment_id, set: { key_action: `${ka} Casualties: this file gives ${r.casualties}; the Official Records return has no loss of record for the regiment (loss, if any, not of record). Contested.` }, cls: 'contested-number', before: `casualties ${r.casualties}; the return lists none of record`, src: SRC });
  }
}
// batteries the return prints individually: Cabell's (McLaws's division, p.338) and Andrews's (Johnson's division, p.341; the return's 'Clement's (First Maryland)' is Dement's battery)
const ART = { 'C-ART-Manly': 7, 'C-ART-Carlton': 7, 'C-ART-McCarthy': 5, 'C-ART-Fraser': 18, 'C-ART-Dement': 5, 'C-ART-Carpenter': 24, 'C-ART-Brown-J': 16, 'C-ART-Raine': 4, 'C-ART-Garber': 1, 'C-ART-Tanner': 0, 'C-ART-Carrington': 0 };
const art = rd('confederate_artillery.json');
const artRows = [];
for (const k of ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery']) for (const b of art[k].battalions) for (const y of b.batteries) {
  const o = ART[y.battery_id]; if (o === undefined || o === y.casualties) continue;
  artRows.push({ id: y.battery_id, set: { casualties: o }, cls: 'wrong-number', before: `casualties ${y.casualties} against ${o} for the battery in the return`, src: 'OR 27/2 p.338 and p.341 (return of casualties)' });
}
export const groups = [
  { file: 'oob/confederate_cavalry.json', key: 'regiment_id', rows: cavRows },
  { file: 'oob/confederate_artillery.json', key: 'battery_id', rows: artRows },
];
export default [];
if (process.argv[1] && process.argv[1].endsWith('oobcart.mjs')) console.log(cavRows.length, artRows.length);
