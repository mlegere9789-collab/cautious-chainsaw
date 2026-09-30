// The rule catalogue. Order = report order.
import { rules as schemaRules } from './schema_rules.mjs';
import { rules as refsRules } from './refs_rules.mjs';

const modules = [schemaRules, refsRules];

// later families register themselves here as they are added (see tools/data/rules/*.mjs)
export async function loadAllRules() {
  const extra = [];
  for (const name of ['coverage_rules', 'geometry_rules', 'numbers_rules', 'time_rules', 'text_rules', 'prov_rules', 'facts_rules', 'v2_rules']) {
    try {
      const m = await import(`./${name}.mjs`);
      extra.push(m.rules);
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    }
  }
  const all = [...modules, ...extra].flat();
  const seen = new Set();
  for (const r of all) {
    if (seen.has(r.id)) throw new Error(`duplicate rule id ${r.id}`);
    seen.add(r.id);
  }
  return all;
}

export function ruleSortKey(id) {
  const m = id.match(/^([A-Z]+)(\d+)$/);
  const order = ['S', 'R', 'C', 'G', 'N', 'T', 'X', 'P', 'F', 'K', 'L', 'D', 'M', 'E', 'U', 'H'];
  return (order.indexOf(m[1]) + 1) * 1000 + Number(m[2]);
}
