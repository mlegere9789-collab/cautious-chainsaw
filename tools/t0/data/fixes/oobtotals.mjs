// DATA fixes: casualty totals of brigades, divisions and corps in the order of battle (data/oob/*_oob_*.json), set to the Official Records' return.
//   Union brigades: the sum of the regiments' printed aggregates (return of casualties, OR 27/1 pp.173-186; the Union return has no unassigned missing).
//   Confederate brigades, divisions, corps: the printed totals of OR 27/2 pp.338-346 (transcription tools/t0/data/sources/or27_confed_losses.json).
// Not changed: strengths (Busey and Martin basis, not independently verified), Union division totals where a brigade could not be re-derived, cavalry and artillery.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { groups as casGroups, orIds } from './oobcas.mjs';
import { U as BKA_U, C as BKA_C } from '../bka.mjs';
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
  'U-XII-1-2': { total: 174, note: 'return: 1st Maryland Potomac Home Brigade 104, 1st Maryland Eastern Shore 25, 150th New York 45 (p.184); the Potomac Home Brigade regiment is not in this file' },
  'U-V-3-1': { total: 155, note: 'return: 1st 46, 2d 37, 6th 24, 13th Pennsylvania Reserves 48 (OR 27/1 p.162 roster: the 11th Reserves served in Fisher\'s brigade)' },
  'U-V-3-2': { total: 55, note: 'return: 5th 2, 9th 5, 10th 5, 11th 41, 12th Pennsylvania Reserves 2 (OR 27/1 p.162 roster)' },
};
const CAVB = { "U-CAV-1-1": [99, "Gamble's First Brigade (p.185)"], "U-CAV-1-2": [28, "Devin's Second Brigade (p.185)"], "U-CAV-1-R": [291, "Merritt's Reserve Brigade, which includes the 6th U.S. Cavalry's 242 at Fairfield (p.185)"], "U-CAV-2-1": [35, "McIntosh's First Brigade (p.186)"], "U-CAV-2-2": [0, "no loss of record; the roster notes the brigade was at Westminster, not engaged (p.166)"], "U-CAV-3-1": [98, "Farnsworth's (Richmond's) First Brigade (p.186)"] };
// Printed brigade and division totals of the Union return (OR 27/1 pp.173-186), read from the page images; a printed total includes the brigade's staff row.
// [total, page]
const PB = {
  'U-I-1-1': [1153, 173], 'U-I-1-2': [1002, 173], 'U-I-2-1': [1041, 173], 'U-I-2-2': [648, 174], 'U-I-3-1': [898, 174], 'U-I-3-2': [853, 174], 'U-I-3-3': [351, 174],
  'U-II-1-1': [330, 175], 'U-II-1-2': [198, 175], 'U-II-1-3': [358, 175], 'U-II-1-4': [389, 175], 'U-II-2-1': [768, 176], 'U-II-2-2': [491, 176], 'U-II-2-3': [377, 176],
  'U-II-3-1': [211, 176], 'U-II-3-2': [366, 176], 'U-II-3-3': [714, 177],
  'U-III-1-1': [781, 177], 'U-III-1-2': [490, 178], 'U-III-1-3': [740, 177], 'U-III-2-1': [790, 178], 'U-III-2-2': [778, 178], 'U-III-2-3': [513, 178],
  'U-V-1-1': [125, 179], 'U-V-1-2': [427, 179], 'U-V-1-3': [352, 179], 'U-V-2-1': [382, 179], 'U-V-2-2': [447, 179], 'U-V-2-3': [200, 180], 'U-V-3-1': [155, 180], 'U-V-3-2': [55, 180],
  'U-XI-1-1': [527, 182], 'U-XI-1-2': [778, 182], 'U-XI-2-1': [597, 183], 'U-XI-2-2': [348, 183], 'U-XI-3-1': [669, 183], 'U-XI-3-2': [807, 183],
  'U-XII-1-1': [80, 184], 'U-XII-1-2': [174, 184], 'U-XII-1-3': [279, 184], 'U-XII-2-1': [139, 184], 'U-XII-2-2': [98, 184], 'U-XII-2-3': [303, 185],
};
const PD = {
  'U-I-1': [2155, 173], 'U-I-2': [1690, 174], 'U-I-3': [2103, 174], 'U-II-1': [1275, 175], 'U-II-2': [1647, 176], 'U-II-3': [1291, 177], 'U-III-1': [2011, 178], 'U-III-2': [2092, 178],
  'U-V-1': [904, 179], 'U-V-2': [1029, 180], 'U-V-3': [210, 180], 'U-VI-1': [18, 181], 'U-VI-2': [16, 181], 'U-VI-3': [196, 182], 'U-XI-1': [1306, 182], 'U-XI-2': [946, 183], 'U-XI-3': [1476, 183],
  'U-XII-1': [533, 184], 'U-XII-2': [540, 185], 'U-CAV-1': [418, 185], 'U-CAV-2': [56, 186], 'U-CAV-3': [355, 186],
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
  if (CAVB[b.brigade_id]) { total = CAVB[b.brigade_id][0]; note = CAVB[b.brigade_id][1]; }
  if (PB[b.brigade_id]) { total = PB[b.brigade_id][0]; note = `the printed total of the brigade, including its staff row (p.${PB[b.brigade_id][1]})`; }
  if (total === null) continue;
  unionBrigades[b.brigade_id] = total;
  if (total === b.casualties) continue;
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
  const bk = BKA_C[b.brigade_id];
  if (bk !== undefined) { out = typeof bk === 'function' ? bk(t, b.strength, pct) : bk; if (S > 1.1 * t + 5 && !out.includes('Contested')) out = out.replace(/\s+$/, '') + ` Contested: the return prints ${t} casualties for the brigade; the regiment records in this file sum to ${S}.`; }
  else if (KA[b.brigade_id]) { const [f, fn] = KA[b.brigade_id]; if (!ka.includes(f)) throw new Error('oobtotals: key_action fragment not found ' + b.brigade_id); out = ka.replace(f, fn(t, b.strength)); }
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
for (const b of ub) { const text = BKA_U[b.brigade_id]; if (!text) continue;
  const ex = brRows.find((r) => r.id === b.brigade_id); if (ex) ex.set.key_action = text; else brRows.push({ id: b.brigade_id, set: { key_action: text }, cls: 'unsupported-claim', before: 'brigade key_action carried a quotation, a superlative, a later story or a claim no source read supports', src: U1 }); }
// Union divisions: the printed division totals (PD); the brigades of the cavalry and Sixth Corps divisions in this file do not map one-to-one to the return's, so those use the printed division figure
const ud = rd('union_oob_corps_division.json').divisions;
const udRows = [];
for (const d of ud) {
  const pd = PD[d.division_id]; if (!pd) continue;
  const t = pd[0]; if (t === d.casualties) continue;
  const set = { casualties: t }; if ('casualty_percentage' in d) set.casualty_percentage = pct(t, d.strength);
  udRows.push({ id: d.division_id, set, cls: 'wrong-number', before: `division casualties ${d.casualties} against ${t}, the printed division total (p.${pd[1]})`, src: U1 });
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
