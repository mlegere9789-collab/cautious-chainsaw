// DATA fixes: casualties of the Confederate infantry regiments in the order of battle (data/oob/confederate_regiments_*.json) against the Official Records'
// "Return of Casualties in the Army of Northern Virginia" (OR 27/2 pp.338-346; transcription tools/t0/data/sources/or27_confed_losses.json, read from the page images).
// The return is itself only approximate (p.338 note; missing men are often counted only at brigade level), so the rule is:
//   * a figure below the regiment's printed killed + wounded (+ missing), or below the regimental-report total in the return's footnote, is impossible: set to the printed figure;
//   * a figure within the printed figure plus the brigade's unassigned missing (and 10 percent / 3 men of slack) is consistent with the return: left alone;
//   * a figure above that is not supported by the return: left alone but marked Contested in key_action, with the printed figure.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const kind = 'rows';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..', '..', '..');
const OR = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 't0', 'data', 'sources', 'or27_confed_losses.json'), 'utf8')).brigades;
const MAP = { Kershaw: 'C-I-1-1', Barksdale: 'C-I-1-2', Semmes: 'C-I-1-3', Wofford: 'C-I-1-4', Law: 'C-I-2-1', Robertson: 'C-I-2-2', 'Anderson (G. T.)': 'C-I-2-3', Benning: 'C-I-2-4', Garnett: 'C-I-3-1', Kemper: 'C-I-3-2', Armistead: 'C-I-3-3', Hays: 'C-II-1-1', Hoke: 'C-II-1-2', Gordon: 'C-II-1-3', Smith: 'C-II-1-4', Stonewall: 'C-II-2-1', 'Jones (J. M.)': 'C-II-2-2', Nicholls: 'C-II-2-3', Steuart: 'C-II-2-4', Daniel: 'C-II-3-1', Doles: 'C-II-3-2', Iverson: 'C-II-3-3', Ramseur: 'C-II-3-4', "O'Neal": 'C-II-3-5', Wilcox: 'C-III-1-1', Perry: 'C-III-1-2', Wright: 'C-III-1-3', Posey: 'C-III-1-4', Mahone: 'C-III-1-5', Pettigrew: 'C-III-2-1', Brockenbrough: 'C-III-2-2', Archer: 'C-III-2-3', Davis: 'C-III-2-4', Lane: 'C-III-3-1', Thomas: 'C-III-3-2', Perrin: 'C-III-3-3', Scales: 'C-III-3-4' };
const PAGE = { 'First': 'p.338-340' };
const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/\b(infantry|volunteer|regiment|battalion)\b/g, '').replace(/(\d+)(st|nd|rd|th|d)\b/g, '$1').replace(/\s+/g, ' ').trim();
const files = ['first', 'second', 'third'].map((n) => `confederate_regiments_${n}_corps`);
const oob = [];
for (const f of files) for (const r of JSON.parse(fs.readFileSync(path.join(ROOT, 'baseline', 'dist', 'data', 'oob', f + '.json'), 'utf8')).regiments) oob.push({ ...r, _f: f });
const pct = (c, s) => (s > 0 ? Math.round((1000 * c) / s) / 10 : null);
const rowsByFile = {};
const stats = { floor: 0, contested: 0, kept: 0 };
export const log = [];
for (const [bk, b] of Object.entries(OR)) {
  const pid = MAP[bk]; if (!pid) continue;
  const rs = oob.filter((r) => r.parent_brigade_id === pid);
  const base = {}; let sum = 0;
  for (const [nm, v] of Object.entries(b.regs)) { base[nm] = v[4] ?? v[3]; sum += base[nm]; }
  const U = Math.max(0, b.total - sum);
  const used = new Set();
  for (const [nm, v] of Object.entries(b.regs)) {
    const n = norm(nm);
    let hit = rs.find((r) => !used.has(r.regiment_id) && norm(r.designation) === n) || rs.find((r) => !used.has(r.regiment_id) && norm(r.designation).startsWith(n)) || rs.find((r) => !used.has(r.regiment_id) && norm(r.designation).includes(n));
    if (!hit) throw new Error('oobccas: no OOB record for ' + bk + ' / ' + nm);
    used.add(hit.regiment_id);
    const bv = base[nm], c = hit.casualties;
    const slack = Math.max(3, Math.round(0.1 * (bv + U)));
    const printed = v[4] ? `${v[4]} total loss per the regimental report quoted in the return's footnote (${v[3]} printed in the table)` : `${v[3]} printed`;
    const src = `OR 27/2 pp.338-346 (return of casualties; transcription tools/t0/data/sources/or27_confed_losses.json)`;
    if (c < bv) {
      stats.floor++;
      (rowsByFile[hit._f] ||= []).push({ id: hit.regiment_id, set: { casualties: bv, casualty_percentage: pct(bv, hit.strength) }, cls: 'wrong-number', before: `casualties ${c}, below the ${printed} in the Official Records return`, src });
    } else if (c > bv + U + slack) {
      stats.contested++;
      const note = ` Casualties: this file gives ${c}; the Official Records return prints ${v[4] ? v[4] + ' (regimental report)' : v[3]} for the regiment${U > 0 ? ' (the brigade return counts ' + U + ' more men missing without assigning them to regiments)' : ''}. Contested.`;
      (rowsByFile[hit._f] ||= []).push({ id: hit.regiment_id, set: { key_action: (hit.key_action || '').replace(/\s+$/, '') + note }, cls: 'contested-number', before: `casualties ${c} against ${printed} in the Official Records return (brigade return 'approximative', p.338)`, src });
    } else stats.kept++;
    log.push({ id: hit.regiment_id, brigade: bk, oob: c, or: bv, U });
  }
}
// 58th Virginia: not in the Gettysburg roster or return for Smith's brigade
{
  const r = oob.find((x) => x.regiment_id === 'C-58VA');
  if (r) (rowsByFile[r._f] ||= []).push({ id: r.regiment_id, set: { key_action: (r.key_action || '').replace(/\s+$/, '') + ' Not named in the Official Records order of battle (27/2 p.285: 31st, 49th and 52d Virginia) or in the return of casualties (p.340) for Smith\'s brigade at Gettysburg; this record and its casualties are not confirmed by the Official Records.' }, cls: 'unverified-record', before: 'regiment and casualties (13) not in the Official Records roster or return for Smith\'s brigade', src: 'OR 27/2 p.285 and p.340' });
}
export const groups = Object.entries(rowsByFile).map(([f, rows]) => ({ file: 'oob/' + f + '.json', key: 'regiment_id', rows }));
export default [];
if (process.argv[1] && process.argv[1].endsWith('oobccas.mjs')) console.log(stats);
