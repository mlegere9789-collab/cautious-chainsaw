// How many placement unit_ids resolve in the OOB map the app builds (iF), and what the label function shows for them.
import fs from 'node:fs';
import { rawRows } from './rawrows.mjs';
import { loadModel } from './model.mjs';
const D = 'C:/Users/mlege/gettysburg-map/baseline/dist/data/';
const eF = ['oob/union_oob_corps_division.json', 'oob/union_oob_brigades.json', 'oob/union_regiments_i_ii_corps.json', 'oob/union_regiments_iii_v_corps.json', 'oob/union_regiments_vi_xi_xii_corps.json', 'oob/union_cavalry_artillery.json', 'oob/union_artillery.json', 'oob/confederate_oob_corps_div_bde.json', 'oob/confederate_regiments_first_corps.json', 'oob/confederate_regiments_second_corps.json', 'oob/confederate_regiments_third_corps.json', 'oob/confederate_cavalry.json', 'oob/confederate_artillery.json', 'oob/commander_successions.json'];
const f = {};
for (const file of eF) {
  const x = JSON.parse(fs.readFileSync(D + file, 'utf8'));
  [x.regiments, x.brigades, x.corps, x.divisions, x.cavalry_regiments, x.horse_artillery].forEach((l) => { l && l.forEach((R) => { const id = R.regiment_id || R.brigade_id || R.corps_id || R.division_id || R.battery_id; id && (f[id] = R); }); });
  ['first_corps_artillery', 'second_corps_artillery', 'third_corps_artillery'].forEach((l) => { const b = x[l] && x[l].battalions; b && b.forEach((bn) => bn.batteries && bn.batteries.forEach((bt) => { f[bt.battery_id] = bt; })); });
  const ar = x.artillery_reserve && x.artillery_reserve.brigades; ar && ar.forEach((br) => br.batteries && br.batteries.forEach((bt) => { f[bt.battery_id] = bt; }));
  x.corps_artillery_brigades && x.corps_artillery_brigades.forEach((br) => br.batteries && br.batteries.forEach((bt) => { f[bt.battery_id] = bt; }));
}
const rows = rawRows(); const ids = [...new Set(rows.map((r) => r.unit_id))];
const api = loadModel('r1c');
const resolved = ids.filter((i) => f[i]);
const labelOf = (id) => api.cx({ unit_id: id });
const unresolved = ids.filter((i) => !f[i]);
const out = {
  oob_entries: Object.keys(f).length, placement_units: ids.length, resolved_in_oob: resolved.length, unresolved: unresolved.length,
  unresolved_examples: unresolved.slice(0, 12).map((i) => `${i} -> label "${labelOf(i)}"`),
  resolved_examples: resolved.slice(0, 8).map((i) => `${i} -> label "${labelOf(i)}" ; OOB designation "${f[i].designation || f[i].name || ''}"`),
  label_forms: { regimentLike: ids.filter((i) => /^\d+ [A-Z]{2,}$/.test(labelOf(i))).length, slashForms: ids.filter((i) => labelOf(i).includes('/')).length, other: ids.filter((i) => !/^\d+ [A-Z]{2,}$/.test(labelOf(i)) && !labelOf(i).includes('/')).length },
  designation_ever_shown_by_label_routine: false,
  note: 'lS passes an empty object as the OOB table to Y4, so designation/name are never used: every label is derived from the unit_id',
};
fs.writeFileSync('C:/Users/mlege/gettysburg-map/tmp/pitch-anim/a1/oob-join.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 1));
