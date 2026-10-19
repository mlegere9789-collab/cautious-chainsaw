// Every regiment commander of the order of battle against the roster text of the Official Records (OR 27/1 pp.155-168, OR 27/2 pp.283-292): node tools/t0/data/cmdcheck.mjs <dist> [out.json]
// status ok = the commander surname is in the roster entry of the regiment; MISMATCH = it is not (a human reads each); noroster = the regiment designation is not found in the roster text.
import fs from 'fs';
import { loadBook } from './sources.mjs';
const or1 = loadBook('or1'), or2 = loadBook('or2');
const norm = (t) => t.replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/’/g, "'");
// roster text: Union leaves 173..186 (p.155-168), Confederate leaves 289..298 (p.283-292)
const rosterU = norm(or1.pages.filter((p) => p.leaf >= 173 && p.leaf <= 186).map((p) => p.text).join(' '));
const rosterC = norm(or2.pages.filter((p) => p.leaf >= 289 && p.leaf <= 298).map((p) => p.text).join(' '));
const ord = (n) => { const x = +n; if (x % 100 >= 11 && x % 100 <= 13) return n + 'th'; return n + (x % 10 === 1 ? 'st' : x % 10 === 2 ? 'd' : x % 10 === 3 ? 'd' : 'th'); };
function designKey(d) {
  return d.replace(/\s+(Infantry|Volunteers|Volunteer Infantry|Cavalry|Regiment)\b.*$/, '').replace(/(\d+)(st|nd|rd|th)\b/g, (m, n) => ord(n)).trim();
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const files = { U: ['union_regiments_i_ii_corps', 'union_regiments_iii_v_corps', 'union_regiments_vi_xi_xii_corps'], C: ['confederate_regiments_first_corps', 'confederate_regiments_second_corps', 'confederate_regiments_third_corps'] };
const out = [];
for (const side of ['U', 'C']) {
  const roster = side === 'U' ? rosterU : rosterC;
  for (const f of files[side]) {
    const j = JSON.parse(fs.readFileSync((process.argv[2] || 'baseline/dist') + '/data/oob/' + f + '.json', 'utf8'));
    for (const r of j.regiments) {
      const key = designKey(r.designation);
      const sur = ((r.commander && r.commander.name) || '').split(/[\s,]+/).filter(Boolean).pop() || '';
      const re = new RegExp(esc(key).replace(/ /g, '\\s+') + '[,:.]?\\s', 'g');
      const hits = [...roster.matchAll(re)];
      let status = 'noroster', win = '';
      if (hits.length) {
        win = roster.slice(hits[0].index, hits[0].index + 170);
        status = sur && new RegExp(sur.replace(/[^A-Za-z]/g, '.?'), 'i').test(win) ? 'ok' : 'MISMATCH';
      }
      out.push({ id: r.regiment_id, des: r.designation, cmd: r.commander && r.commander.name, key, status, win: win.slice(0, 150) });
    }
  }
}
const c = {};
for (const o of out) c[o.status] = (c[o.status] || 0) + 1;
console.log(c);
if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 0));
for (const o of out.filter((o) => o.status === 'MISMATCH').slice(0, 200)) console.log(o.id, '|', o.cmd, '|', o.win);
