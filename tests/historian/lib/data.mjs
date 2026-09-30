// data.mjs - raw loader for the deployed data files (read-only), used by the evaluation harness.
// Deliberately independent of tools/historian (the build): relevance labels must not depend on any system's own index.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../../..');
export const DEPLOY = process.env.HISTORIAN_EVAL_DEPLOY || path.join(ROOT, 'legacy/dist');
export const D = path.join(DEPLOY, 'data');
export const J = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'));
export const OOB_FILES = [
  'union_regiments_i_ii_corps.json', 'union_regiments_iii_v_corps.json', 'union_regiments_vi_xi_xii_corps.json',
  'confederate_regiments_first_corps.json', 'confederate_regiments_second_corps.json', 'confederate_regiments_third_corps.json',
  'union_cavalry_artillery.json', 'confederate_cavalry.json',
];
export function load() {
  const regs = []; for (const f of OOB_FILES) for (const r of J('oob/' + f).regiments) regs.push({ ...r, _file: f });
  const vigs = []; for (const f of ['vignettes_part1.json', 'vignettes_part2.json', 'vignettes_part3.json']) for (const v of J(f).vignettes) vigs.push(v);
  const chron = []; [1, 2, 3].forEach((d) => { const j = J(`chronology_day${d}.json`); for (const e of j.events) chron.push({ ...e, day: d }); });
  const terrain = J('terrain.json');
  return {
    regs, vigs, chron, terrain,
    ubde: J('oob/union_oob_brigades.json'), cbde: J('oob/confederate_oob_corps_div_bde.json'), ucorps: J('oob/union_oob_corps_division.json'),
    uart: J('oob/union_artillery.json'), cart: J('oob/confederate_artillery.json'), succ: J('oob/commander_successions.json'), cas: J('casualty_apportionment.json'),
    monuments: J('monuments.json'), ucav: J('oob/union_cavalry_artillery.json'), ccav: J('oob/confederate_cavalry.json'),
  };
}
export const words = (s) => (String(s || '').match(/[A-Za-z0-9']+/g) || []).length;
