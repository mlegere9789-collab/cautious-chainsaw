// DATA fixes: casualty totals of brigades, divisions and corps in the order of battle (data/oob/*_oob_*.json), set to the Official Records' return.
//   Union brigades: the sum of the regiments' printed aggregates (return of casualties, OR 27/1 pp.173-186; the Union return has no unassigned missing).
//   Confederate brigades, divisions, corps: the printed totals of OR 27/2 pp.338-346 (transcription tools/t0/data/sources/or27_confed_losses.json).
// Not changed: strengths (Busey and Martin basis, not independently verified), Union division totals where a brigade could not be re-derived, cavalry and artillery.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { groups as casGroups, orIds } from './oobcas.mjs';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const BASE = path.join(ROOT, 'baseline', 'dist', 'data', 'oob');
const rd = (f) => JSON.parse(fs.readFileSync(path.join(BASE, f), 'utf8'));
const pct = (c, s) => (s > 0 ? Math.round((1000 * c) / s) / 10 : null);
const U1 = 'OR 27/1 pp.173-186 (return of casualties)';
const C2 = 'OR 27/2 pp.338-346 (return of casualties; transcription tools/t0/data/sources/or27_confed_losses.json)';

// ---- Union brigades
const newCas = {};
for (const f of ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps']) for (const r of rd(f + '.json').regiments) newCas[r.regiment_id] = r.casualties;
for (const g of casGroups) for (const r of g.rows) if ('casualties' in r.set) newCas[r.id] = r.set.casualties;
const ub = rd('union_oob_brigades.json').brigades;
export const unionBrigades = {};
const OVERRIDE = {
  'U-III-2-2': { total: null, add: 203, note: 'sum of the five regiments in this file plus the 120th New York (203, return p.178), which this file does not list' },
  'U-V-3-1': { total: 155, note: 'return: 1st 46, 2d 37, 6th 24, 13th Pennsylvania Reserves 48 (OR 27/1 p.162 roster: the 11th Reserves served in Fisher\'s brigade)' },
  'U-V-3-2': { total: 55, note: 'return: 5th 2, 9th 5, 10th 5, 11th 41, 12th Pennsylvania Reserves 2 (OR 27/1 p.162 roster)' },
};
const brRows = [];
for (const b of ub) {
  const ids = (b.regiment_ids || []).filter((i) => i !== 'U-11PA-R-F');
  let total = null, note = 'sum of the regiments\' printed aggregates';
  if (OVERRIDE[b.brigade_id]) {
    const o = OVERRIDE[b.brigade_id];
    note = o.note;
    total = o.total ?? ids.reduce((a, i) => a + newCas[i], 0) + o.add;
  } else if (ids.length && ids.every((i) => orIds.has(i))) total = ids.reduce((a, i) => a + newCas[i], 0);
  if (total === null) continue;
  unionBrigades[b.brigade_id] = total;
  if (Math.abs(total - b.casualties) <= Math.max(5, 0.03 * total)) continue;
  const set = { casualties: total };
  if ('casualty_percentage' in b) set.casualty_percentage = pct(total, b.strength);
  brRows.push({ id: b.brigade_id, set, cls: 'wrong-number', before: `brigade casualties ${b.casualties} against ${total} (${note})`, src: U1 });
}

// ---- Confederate brigades, divisions, corps
const cf = rd('confederate_oob_corps_div_bde.json');
const BR = { 'C-I-1-1': 630, 'C-I-1-2': 747, 'C-I-1-3': 430, 'C-I-1-4': 334, 'C-I-2-1': 496, 'C-I-2-2': 597, 'C-I-2-3': 671, 'C-I-2-4': 497, 'C-I-3-1': 941, 'C-I-3-2': 731, 'C-I-3-3': 1191,
  'C-II-1-1': 313, 'C-II-1-2': 345, 'C-II-1-3': 380, 'C-II-1-4': 142, 'C-II-2-1': 330, 'C-II-2-2': 421, 'C-II-2-3': 388, 'C-II-2-4': 682, 'C-II-3-1': 916, 'C-II-3-2': 179, 'C-II-3-3': 820, 'C-II-3-4': 177, 'C-II-3-5': 696,
  'C-III-1-1': 777, 'C-III-1-2': 455, 'C-III-1-3': 668, 'C-III-1-4': 83, 'C-III-1-5': 102, 'C-III-2-1': 1105, 'C-III-2-2': 148, 'C-III-2-3': 677, 'C-III-2-4': 897, 'C-III-3-1': 389, 'C-III-3-2': 152, 'C-III-3-3': 577, 'C-III-3-4': 535 };
const DV = { 'C-I-1': 2178, 'C-I-2': 2289, 'C-I-3': 2888, 'C-II-1': 1188, 'C-II-2': 1873, 'C-II-3': 2853, 'C-III-1': 2115, 'C-III-2': 2850, 'C-III-3': 1690 };
const CP = { 'C-I': 7539, 'C-II': 5937, 'C-III': 6735 };
const cb = [], cd = [], cc = [];
for (const b of cf.brigades) {
  const t = BR[b.brigade_id]; if (t === undefined || t === b.casualties) continue;
  cb.push({ id: b.brigade_id, set: { casualties: t, casualty_percentage: pct(t, b.strength) }, cls: 'wrong-number', before: `brigade casualties ${b.casualties} against ${t} in the return${b.brigade_id === 'C-II-3-3' ? ' (the printed total; its rows add to 763)' : ''}${b.brigade_id === 'C-III-3-1' ? ' (General Lane reports 660; the printed footnote)' : ''}`, src: C2 });
}
for (const d of cf.divisions) { const t = DV[d.division_id]; if (t !== undefined && t !== d.casualties) cd.push({ id: d.division_id, set: { casualties: t }, cls: 'wrong-number', before: `division casualties ${d.casualties} against ${t} in the return`, src: C2 }); }
for (const c of cf.corps) { const t = CP[c.corps_id]; if (t !== undefined && t !== c.casualties) cc.push({ id: c.corps_id, set: { casualties: t }, cls: 'wrong-number', before: `corps casualties ${c.casualties} against ${t} in the return`, src: C2 }); }
// key_action sentences that quoted the old totals, and a Contested note where this file's regiment records still sum to more than the printed brigade total
const regC = {};
for (const f of ['first', 'second', 'third']) for (const r of rd(`confederate_regiments_${f}_corps.json`).regiments) regC[r.regiment_id] = r;
for (const g of casGroups) for (const r of g.rows) if ('casualties' in r.set && regC[r.id]) regC[r.id] = { ...regC[r.id], casualties: r.set.casualties };
const KA = {
  'C-III-1-2': ['52.3% casualties.', (t, s) => `${pct(t, s)}% casualties (${t} of ${s} by the return).`],
  'C-III-2-4': ['suffering 52% casualties total.', (t, s) => `The return prints ${t} casualties for the brigade (${pct(t, s)}% of ${s}); the regiment records in this file sum to 1,200 (Contested).`],
  'C-III-3-4': ['66.5% casualties.', (t, s) => `The return prints ${t} casualties (${pct(t, s)}% of ${s}); the regiment records in this file sum to 898 (Contested).`],
  'C-II-3-3': ['~900 men killed, wounded, or captured in minutes.', () => 'The return prints 820 men killed, wounded or missing for the brigade (its own rows add to about 765); the regiment records in this file sum to 903 (Contested).'],
};
const kaRows = new Map();
for (const b of cf.brigades) {
  const t = BR[b.brigade_id]; if (t === undefined) continue;
  const ids = b.regiment_ids || [];
  const S = ids.reduce((a, i) => a + (regC[i] ? regC[i].casualties : 0), 0);
  let ka = b.key_action || '', out = ka;
  if (KA[b.brigade_id]) { const [f, fn] = KA[b.brigade_id]; if (!ka.includes(f)) throw new Error('oobtotals: key_action fragment not found ' + b.brigade_id); out = ka.replace(f, fn(t, b.strength)); }
  else if (S > 1.1 * t + 5) out = ka.replace(/\s+$/, '') + ` Contested: the return prints ${t} casualties for the brigade; the regiment records in this file sum to ${S}.`;
  if (out !== ka) kaRows.set(b.brigade_id, out);
}
for (const r of cb) if (kaRows.has(r.id)) { r.set.key_action = kaRows.get(r.id); kaRows.delete(r.id); }
for (const [id, out] of kaRows) cb.push({ id, set: { key_action: out }, cls: 'contested-number', before: 'brigade key_action', src: C2 });
// Union brigades
const UKA = {
  'U-V-2-2': ['41.6% casualties.', (t, s) => `${pct(t, s)}% casualties (${t} of ${s} by the return).`],
  'U-XII-1-2': ['the single largest infantry regiment at Gettysburg with 765 men.', () => 'a regiment of 765 men by the strength in the file (Busey and Martin basis; the "largest regiment" superlative is not verified here).'],
};
for (const b of ub) { const u = UKA[b.brigade_id]; if (!u) continue; if (!(b.key_action || '').includes(u[0])) throw new Error('oobtotals: UKA ' + b.brigade_id);
  const t = unionBrigades[b.brigade_id] ?? b.casualties; const out = b.key_action.replace(u[0], u[1](t, b.strength));
  const ex = brRows.find((r) => r.id === b.brigade_id); if (ex) ex.set.key_action = out; else brRows.push({ id: b.brigade_id, set: { key_action: out }, cls: 'wrong-claim', before: 'brigade key_action quoted a superseded figure or an unverified superlative', src: U1 }); }
// Union divisions (infantry, not the Sixth Corps or cavalry): the sum of the final brigade totals
const ud = rd('union_oob_corps_division.json').divisions;
const udRows = [];
for (const d of ud) {
  if (/^U-(VI|CAV)-/.test(d.division_id)) continue;
  const bs = ub.filter((b) => b.parent_division_id === d.division_id);
  if (!bs.length) continue;
  const t = bs.reduce((a, b) => a + (unionBrigades[b.brigade_id] ?? b.casualties), 0);
  if (Math.abs(t - d.casualties) <= Math.max(5, 0.03 * t)) continue;
  const set = { casualties: t }; if ('casualty_percentage' in d) set.casualty_percentage = pct(t, d.strength);
  udRows.push({ id: d.division_id, set, cls: 'sum-mismatch', before: `division casualties ${d.casualties} against ${t}, the sum of its brigades' totals in the return`, src: U1 });
}
export const groups = [
  { file: 'oob/union_oob_corps_division.json', key: 'division_id', rows: udRows },
  { file: 'oob/union_oob_brigades.json', key: 'brigade_id', rows: brRows },
  { file: 'oob/confederate_oob_corps_div_bde.json', key: 'brigade_id', rows: cb },
  { file: 'oob/confederate_oob_corps_div_bde.json', key: 'division_id', rows: cd },
  { file: 'oob/confederate_oob_corps_div_bde.json', key: 'corps_id', rows: cc },
];
export default [];
if (process.argv[1] && process.argv[1].endsWith('oobtotals.mjs')) { console.log(brRows.map((r) => r.id + ':' + r.set.casualties).join(' ')); console.log(cb.length, cd.length, cc.length); }
