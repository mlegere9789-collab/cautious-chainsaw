// DATA fixes: key_action sentences of order-of-battle regiments that quote a casualty percentage, or a ranking, that the corrected casualties (oobcas.mjs) or
// commanders (oobcmd.mjs) no longer support.  The percentage is recomputed with the same rule as casualty_percentage (casualties / the file's strength).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { groups as casGroups } from './oobcas.mjs';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const BASE = path.join(ROOT, 'baseline', 'dist', 'data');
const U = 'OR 27/1 pp.155-186 (order of battle and return of casualties)';

const newPct = {};
const newCas = {};
for (const g of casGroups) for (const r of g.rows) { if ('casualty_percentage' in r.set) newPct[r.id] = r.set.casualty_percentage; if ('casualties' in r.set) newCas[r.id] = r.set.casualties; }

// hand-written replacements (id -> [find fragment, replacement, reason])
const MAN = {
  'U-105PA': ['Over 50% casualties.', null, 'percentage'],
  'U-73NY': ['hardest hit regiment in brigade.', `${newCas['U-73NY']} casualties in the Official Records return (the 120th New York of the same brigade lost 203).`, 'ranking contradicted by the return'],
  'U-2US': ['52.8% casualties in the Wheatfield. Hardest-hit Regular Army unit.', `${newCas['U-2US']} casualties (${newPct['U-2US']}% of the strength in the file) in the Wheatfield; the 11th and 17th U.S. of the same brigade lost more (120 and 150).`, 'percentage and ranking contradicted by the return'],
  'U-6PA-R': ['most casualties in brigade during Crawford\'s charge.', `${newCas['U-6PA-R']} casualties in the Official Records return (the 13th Pennsylvania Reserves lost the most in the brigade, 48).`, 'ranking contradicted by the return'],
  'U-37MA': ['army reserve.', `Eustis's Second Brigade, Third Division, VI Corps (Official Records roster, p.163); the return lists ${newCas['U-37MA']} casualties.`, 'record showed no casualties; the return lists 47'],
  'U-123NY': ['regiment led by Major Lester Willson.', 'regiment led by Lieutenant Colonel James C. Rogers (Official Records roster).', 'commander'],
  'U-150NY': ['THE LARGEST SINGLE INFANTRY REGIMENT AT GETTYSBURG by strength. 765 men.', '765 men by the strength in the file (Busey and Martin basis; the "largest regiment" superlative is not verified here).', 'unverified superlative'],
  'U-149NY': ['Nearly 40% casualties across Culp\'s Hill fighting.', `${newCas['U-149NY']} casualties (${newPct['U-149NY']}% of the strength in the file) at Culp's Hill.`, 'percentage'],
  'U-27IN': ['Colgrove commanded brigade -- regiment led by Lieutenant Colonel John Colgrove. July 3 morning Colgrove controversially ordered charge across open meadow. Heavy losses.', 'Colonel Silas Colgrove commanded Ruger\'s Third Brigade; the regiment was led by Lieutenant Colonel John R. Fesler (Official Records roster, p.165). July 3 morning the brigade charged across the open meadow. Heavy losses.', 'regimental commander'],
};

const files = ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps'];
const byFile = {};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(BASE, 'oob', f + '.json'), 'utf8'));
  for (const r of j.regiments) {
    const ka = r.key_action || '';
    let out = ka, why = null;
    if (MAN[r.regiment_id]) {
      const [find, repl, reason] = MAN[r.regiment_id];
      if (!ka.includes(find)) throw new Error('oobtext: fragment not found for ' + r.regiment_id);
      out = ka.replace(find, repl === null ? `${newPct[r.regiment_id]}% casualties.` : repl); why = reason;
    } else if (r.regiment_id in newPct && /\d+(?:\.\d+)?%/.test(ka)) {
      const p = newPct[r.regiment_id];
      out = ka.replace(/(\d+(?:\.\d+)?)%/, (m, n) => (n.includes('.') ? p.toFixed(1) : String(Math.round(p))) + '%');
      why = 'percentage';
    }
    if (out === ka) continue;
    (byFile[f] ||= []).push({ id: r.regiment_id, set: { key_action: out }, cls: 'wrong-claim', before: `key_action "${ka.slice(0, 160)}" -- ${why} (casualties are now ${newCas[r.regiment_id] ?? 'unchanged'})`, src: U });
  }
}
// 27th Indiana: the regimental commander is Lieutenant Colonel John R. Fesler (Colgrove had the brigade)
(byFile.union_regiments_vi_xi_xii_corps ||= []).push({ id: 'U-27IN', set: { 'commander.name': 'Lieutenant Colonel John R. Fesler', 'commander.fate': null }, cls: 'wrong-name', before: 'commander "Colonel Silas Colgrove" (he commanded the Third Brigade)', src: 'OR 27/1 p.165 (roster: 27th Indiana, Col. Silas Colgrove, Lieut. Col. John R. Fesler); p.12 report list' });
(byFile.confederate_regiments_second_corps ||= []).push({ id: 'C-2NC-B', set: { key_action: "Daniel's brigade -- battalion. 63.8% casualties (153 of 240 in the file; the Official Records return prints 153)." }, cls: 'wrong-claim', before: 'key_action quoted 50.8% casualties; the return prints 153 for 240 men', src: 'OR 27/2 p.342' });
export const groups = Object.entries(byFile).map(([file, rows]) => ({ file: 'oob/' + file + '.json', key: 'regiment_id', rows }));
export default [];
