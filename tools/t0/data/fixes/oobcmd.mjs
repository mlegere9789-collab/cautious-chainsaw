// DATA fixes: regimental commanders in the order of battle (data/oob/*_regiments_*.json) that disagree with the Official Records' order of battle
// (OR 27/1 pp.155-168 for the Union, OR 27/2 pp.283-292 for the Confederates; the roster names the commander of each regiment, in order if it changed).
// Method (tools/t0/data/README / docs/data-audit/AUDIT.md section 6): the surname of every regiment's commander was searched in the roster window of that regiment
// (OCR repaired for hyphenation, fuzzy match for OCR spelling) and, for the failures, in all of the Official Records near the regiment's name.  The 51 below are
// not found there; the roster's first-named commander is used.  Cases where the Official Records elsewhere confirm the data (7th Michigan, 70th New York,
// 11th U.S., 55th Ohio, 1st Louisiana) are left alone.  `fate` is removed where it described the commander replaced.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.join(HERE, '..', '..', '..', '..', 'baseline', 'dist', 'data', 'oob');
const U = 'OR 27/1 pp.155-168 (order of battle)', C = 'OR 27/2 pp.283-292 (order of battle)';
const T = { Col: 'Colonel', LtCol: 'Lieutenant Colonel', Maj: 'Major', Capt: 'Captain' };
const D = [
  // id, new commander name, source, note
  ['U-56PA', `${T.Col} J. William Hofmann`, U, 'spelling: the Official Records print Hofmann'],
  ['U-52NY', `${T.LtCol} C. G. Freudenberg`, U],
  ['U-125NY', `${T.LtCol} Levin Crandell`, U, 'Willard commanded the brigade'],
  ['U-17ME', `${T.LtCol} Charles B. Merrill`, U],
  ['U-73NY', `${T.Maj} Michael W. Burns`, U],
  ['U-115PA', `${T.Maj} John P. Dunne`, U],
  ['U-3US-1', `${T.Capt} Henry W. Freedley`, U],
  ['U-12US-2', `${T.Capt} Thomas S. Dunn`, U],
  ['U-17US', `${T.LtCol} J. Durell Greene`, U],
  ['U-2PA-R', `${T.LtCol} George A. Woodward`, U, 'McCandless commanded the brigade'],
  ['U-95PA', `${T.LtCol} Edward Carroll`, U],
  ['U-96PA', `${T.Maj} William H. Lessig`, U],
  ['U-3NJ', `${T.LtCol} Edward L. Campbell`, U],
  ['U-4NJ', `${T.Capt} William R. Maxwell`, U],
  ['U-3VT', `${T.Col} Thomas O. Seaver`, U],
  ['U-6VT', `${T.Col} Elisha L. Barney`, U],
  ['U-102PA', `${T.Col} John W. Patterson`, U],
  ['U-7MA', `${T.LtCol} Franklin P. Harlow`, U],
  ['U-134NY', `${T.LtCol} Allan H. Jackson`, U, 'Coster commanded the brigade'],
  ['U-123NY', `${T.LtCol} James C. Rogers`, U],
  ['U-5OH', `${T.Col} John H. Patrick`, U],
  ['U-78NY', `${T.LtCol} Herbert von Hammerstein`, U],
  ['C-15SC', `${T.Col} W. D. De Saussure`, C],
  ['C-53GA', `${T.Col} James P. Simms`, C],
  ['C-4AL', `${T.LtCol} L. H. Scruggs`, C],
  ['C-47AL', `${T.Col} James W. Jackson`, C],
  ['C-14VA', `${T.Col} James G. Hodges`, C],
  ['C-53VA', `${T.Col} W. R. Aylett`, C],
  ['C-57VA', `${T.Col} John Bowie Magruder`, C],
  ['C-38GA-E', `${T.Capt} William L. McLeod`, C],
  ['C-27VA', `${T.LtCol} D. M. Shriver`, C],
  ['C-48VA', `${T.LtCol} R. H. Dungan`, C],
  ['C-50VA', `${T.LtCol} L. H. N. Salyer`, C],
  ['C-15LA', `${T.Maj} Andrew Brady`, C],
  ['C-37VA', `${T.Maj} H. C. Wood`, C],
  ['C-2NC-B', `${T.LtCol} H. L. Andrews`, C],
  ['C-4GA', `${T.LtCol} D. R. E. Winn`, C],
  ['C-44GA', `${T.Col} S. P. Lumpkin`, C],
  ['C-2NC', `${T.Maj} D. W. Hurtt`, C],
  ['C-48GA', `${T.Col} William Gibson`, C],
  ['C-41VA', `${T.Col} William A. Parham`, C],
  ['C-61VA', `${T.Col} V. D. Groner`, C],
  ['C-22VA-B', `${T.Maj} John S. Bowles`, C],
  ['C-14TN', `${T.Capt} B. L. Phillips`, C],
  ['C-49GA', `${T.Col} S. T. Player`, C],
  ['C-1SC-P', `${T.Maj} C. W. McCreary`, C],
  ['C-1SC-R', `${T.Capt} William M. Hadden`, C],
  ['C-38NC-S', `${T.Col} W. J. Hoke`, C, 'the roster names Hoke for the 38th North Carolina'],
];
// regiment id -> file
const files = ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps', 'confederate_regiments_first_corps', 'confederate_regiments_second_corps', 'confederate_regiments_third_corps'];
const where = {};
const names = {};
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(BASE, f + '.json'), 'utf8'));
  for (const r of j.regiments) { where[r.regiment_id] = f + '.json'; names[r.regiment_id] = r.commander && r.commander.name; }
}
const byFile = {};
for (const [id, name, src, note] of D) {
  const f = where[id];
  if (!f) throw new Error('unknown regiment ' + id);
  (byFile[f] ||= []).push({ id, set: { 'commander.name': name, 'commander.fate': null }, cls: 'wrong-name',
    before: `commander "${names[id]}" is not the regiment's commander in the Official Records${note ? ' (' + note + ')' : ''}`, src });
}
export const groups = Object.entries(byFile).map(([file, rows]) => ({ file: 'oob/' + file, key: 'regiment_id', rows }));
export default [];
