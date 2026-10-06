import fs from 'node:fs';
import { loadModel } from './model.mjs';
import { rawRows } from './rawrows.mjs';
const api = loadModel('r1c'); const rows = rawRows();
const ids = [...new Set(rows.map((r) => r.unit_id))];
const lastRow = {}; rows.forEach((r) => { if (!lastRow[r.unit_id] || r.tick > lastRow[r.unit_id].tick) lastRow[r.unit_id] = r; });
const out = {};
for (const [name, z] of [['z12-13.99 (6 chars)', 13], ['z14-16.49 (full id label)', 14.5], ['z16.5+ (id label + strength)', 17]]) {
  const labs = ids.map((id) => api.Y4({ ...lastRow[id] }, z, {}));
  const base = ids.map((id, i) => (z >= 16.5 ? labs[i].replace(/ \d+$/, '') : labs[i]));
  const cnt = {}; base.forEach((l) => (cnt[l] = (cnt[l] || 0) + 1));
  const dup = base.filter((l) => cnt[l] > 1).length;
  out[name] = { units: ids.length, distinctIdLabels: Object.keys(cnt).length, unitsSharingALabelWithAnotherUnit: dup, examples: Object.entries(cnt).filter(([, c]) => c > 1).slice(0, 8).map(([l, c]) => `"${l}" x${c}`) };
}
out.note = 'label text always derives from unit_id (cx); OOB designation/name is never used because lS passes an empty object to Y4';
fs.writeFileSync('label-calcs.json', JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 1));
