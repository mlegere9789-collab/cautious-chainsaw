// DATA fixes: casualties of the Union infantry regiments in the order of battle (data/oob/union_regiments_*.json), set to the Official Records' return
// (OR 27/1 pp.173-186; the transcription is tools/t0/data/sources/or27_union_losses.json, read from the page images, brigade and corps totals checked).
// 123 of 213 compared regiments differed from the return by more than 15 percent or 6 men (many by a factor of two to ten); every compared regiment is set to
// the printed aggregate (killed + wounded + captured or missing) and casualty_percentage is recomputed from the file's own strength (Computed).
// Strength (men engaged) is not changed: it is the Busey and Martin basis the file cites and is not independently verified here (AUDIT.md section 7).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const OR = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 't0', 'data', 'sources', 'or27_union_losses.json'), 'utf8')).rows;
const ord = (n) => { const x = +n; if (x % 100 >= 11 && x % 100 <= 13) return n + 'th'; return n + (x % 10 === 1 ? 'st' : x % 10 === 2 ? 'd' : x % 10 === 3 ? 'd' : 'th'); };
function key(r) {
  let d = r.designation.replace(/\s+(Volunteer Infantry|Volunteers|Infantry|Regiment)\b.*$/, '').replace(/\s*\(.*$/, '').replace(/(\d+)(st|nd|rd|th)\b/g, (m, n) => ord(n)).trim();
  if (/Pennsylvania Reserves/.test(r.designation) || /-R(-|$)/.test(r.regiment_id)) d = d.replace(/ Reserves.*$/, '').replace(/ detachment.*$/, '') + ' Reserves';
  if (/Michigan/.test(d) && /Cavalry/.test(r.designation)) d += ' Cavalry';
  if (/Sharpshooters/.test(r.designation)) d = d.replace(/ \(.*$/, '');
  return d;
}
// handled by hand below (duplicate, relabelled or split records)
const MANUAL = new Set(['U-107NY', 'U-11NY', 'U-11PA', 'U-11PA-B', 'U-3US-1', 'U-3US-2', 'U-12US-1', 'U-12US-2', 'U-11PA-R', 'U-11PA-R-F', 'U-1US-SS']);
const files = ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps'];
const pct = (c, s) => (s > 0 ? Math.round((1000 * c) / s) / 10 : null);
export const groups = [];
export const orIds = new Set(); // regiments whose casualties now equal the Official Records return

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'baseline', 'dist', 'data', 'oob', f + '.json'), 'utf8'));
  const rows = [];
  for (const r of j.regiments) {
    if (MANUAL.has(r.regiment_id)) continue;
    const k = key(r);
    const o = OR[k];
    if (o !== undefined) orIds.add(r.regiment_id);
    if (o === undefined || o === r.casualties) continue;
    const set = { casualties: o };
    if (r.strength > 0) set.casualty_percentage = pct(o, r.strength); else set.casualty_percentage = null;
    rows.push({ id: r.regiment_id, set, cls: 'wrong-number', before: `casualties ${r.casualties} against ${o} in the Official Records return (${k})`, src: 'OR 27/1 pp.173-186 (return of casualties), transcription tools/t0/data/sources/or27_union_losses.json' });
  }
  groups.push({ file: 'oob/' + f + '.json', key: 'regiment_id', rows });
}
// manual rows
const man = (id, set, before, src) => ({ id, set, cls: 'wrong-claim', before, src });
const U = 'OR 27/1 pp.155-186';
const byFile = {};
const add = (file, row) => { (byFile[file] ||= []).push(row); };
add('union_regiments_i_ii_corps', man('U-107NY', { designation: '107th Pennsylvania Volunteer Infantry', state: 'Pennsylvania', 'commander.name': 'Lieutenant Colonel James MacThomson', 'commander.fate': null, casualties: 165, casualty_percentage: pct(165, 122), key_action: 'Oak Ridge -- Paul\'s brigade (the record was labelled 107th New York; that regiment served in the XII Corps).' },
  'record labelled 107th New York but placed in Paul\'s brigade, which held the 107th Pennsylvania; the 107th New York is U-107NY-XII', `${U} (roster: 107th Pennsylvania, Lieut. Col. James MacThomson; return: 165)`));
add('union_regiments_i_ii_corps', man('U-11PA', { casualties: 15, casualty_percentage: pct(15, 135), key_action: 'Paul\'s brigade after its transfer on the afternoon of July 1 (its earlier losses are reported with Baxter\'s brigade, U-11PA-B).' },
  'casualties 53 against 15 in the return for the 11th Pennsylvania in Paul\'s brigade; key_action described the brigade commander', `${U} (return p.173 footnote: losses after July 1 reported with the First Brigade)`));
add('union_regiments_i_ii_corps', man('U-11PA-B', { casualties: 117, key_action: 'Baxter\'s brigade, Oak Ridge stone wall, before the regiment\'s transfer to Paul\'s brigade on the afternoon of July 1.' },
  'casualties 80 against 117 in the return for the 11th Pennsylvania in Baxter\'s brigade', `${U} (return p.174: 11th Pennsylvania 117)`));
add('union_regiments_iii_v_corps', man('U-11NY', { designation: '11th Massachusetts Volunteer Infantry', state: 'Massachusetts', 'commander.name': 'Lieutenant Colonel Porter D. Tripp', 'commander.fate': null, casualties: 127, casualty_percentage: pct(127, 216), key_action: 'Carr\'s brigade -- Emmitsburg Road fighting. (The record was labelled 11th New York, Fire Zouaves; no such regiment fought at Gettysburg.)' },
  'record named the 11th New York (Fire Zouaves) in Carr\'s brigade; Carr\'s brigade held the 11th Massachusetts', `${U} (roster p.160: Carr's brigade, 11th Massachusetts, Lieut. Col. Porter D. Tripp; return p.178: 127)`));
add('union_regiments_iii_v_corps', man('U-3US-1', { casualties: 38 }, 'unchanged split; see U-3US-2', U));
add('union_regiments_iii_v_corps', man('U-3US-2', { casualties: 35, 'commander.name': 'Captain Henry W. Freedley', 'commander.fate': null }, 'casualties 28; the two battalion records of the 3rd U.S. Infantry added to 66 against 73 in the return for the regiment (the split between the battalions is the project\'s)', `${U} (return p.179: 3d United States 73)`));
add('union_regiments_iii_v_corps', man('U-12US-1', { casualties: 47 }, 'unchanged split; see U-12US-2', U));
add('union_regiments_iii_v_corps', man('U-12US-2', { casualties: 45 }, 'casualties 44; the two battalion records added to 91 against 92 in the return', `${U} (return p.179: 12th United States 92)`));
add('union_regiments_iii_v_corps', man('U-11PA-R', { casualties: 41, casualty_percentage: pct(41, 327) }, 'casualties 20 against 41 in the return for the 11th Pennsylvania Reserves (which stood in Fisher\'s brigade)', `${U} (return p.180: 11th Pennsylvania Reserves 41)`));
add('union_regiments_iii_v_corps', man('U-1US-SS', { casualties: 49, casualty_percentage: pct(49, 490) }, 'casualties 61 against 49 in the return', `${U} (return p.177: 1st United States Sharpshooters 49)`));
for (const m of MANUAL) orIds.add(m);
for (const g of groups) {
  const manual = byFile[g.file.replace(/^oob\//, '').replace(/\.json$/, '')] || [];
  for (const m of manual) {
    // only rows that exist in this file
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'baseline', 'dist', 'data', g.file), 'utf8'));
    if (j.regiments.some((r) => r.regiment_id === m.id)) g.rows.push(m);
  }
}
export default [];
