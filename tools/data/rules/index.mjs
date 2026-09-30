// The rule catalogue. Order = report order.
//
// Registration is STRICT: every family module below must exist and export `rules`. A missing or broken module used to be skipped
// silently (ERR_MODULE_NOT_FOUND was swallowed), which turned a deleted rule file into a green run. Now it throws, and the ratchet
// additionally compares the live catalogue with the ids recorded in tools/data/baseline.json (`catalogue`), so a rule that vanishes
// from the code fails CI even if it had no baseline entries.
import { rules as schemaRules } from './schema_rules.mjs';
import { rules as refsRules } from './refs_rules.mjs';
import { rules as coverageRules } from './coverage_rules.mjs';
import { rules as geometryRules } from './geometry_rules.mjs';
import { rules as numbersRules } from './numbers_rules.mjs';
import { rules as timeRules } from './time_rules.mjs';
import { rules as textRules } from './text_rules.mjs';
import { rules as provRules } from './prov_rules.mjs';
import { rules as factsRules } from './facts_rules.mjs';
import { rules as v2Rules } from './v2_rules.mjs';

export const FAMILY_MODULES = { schema: schemaRules, refs: refsRules, coverage: coverageRules, geometry: geometryRules, numbers: numbersRules, time: timeRules, text: textRules, prov: provRules, facts: factsRules, v2: v2Rules };

export async function loadAllRules() {
  const all = Object.entries(FAMILY_MODULES).flatMap(([name, rs]) => {
    if (!Array.isArray(rs) || rs.length === 0) throw new Error(`rule family module "${name}" registered no rules`);
    return rs;
  });
  const seen = new Set();
  for (const r of all) {
    if (seen.has(r.id)) throw new Error(`duplicate rule id ${r.id}`);
    seen.add(r.id);
  }
  return all;
}

/** Sorted ids of every registered rule (deferred ones included). Stored in baseline.json as `catalogue`. */
export async function catalogueIds() {
  return (await loadAllRules()).map((r) => r.id).sort((a, b) => ruleSortKey(a) - ruleSortKey(b));
}

/** Ids of the rules that read the deploy tree or the bundle (flag `site: true` on the rule; `validate.mjs --no-site` leaves them out). */
export async function siteRuleIds() {
  return (await loadAllRules()).filter((r) => r.site).map((r) => r.id).sort((a, b) => ruleSortKey(a) - ruleSortKey(b));
}

/**
 * { id: { sev, status } } for every registered rule. tools/data/baseline.json records this as `rule_state` when it is written; the
 * ratchet fails a rule that was running and is `deferred` now, and an E rule that became W (a rule is not switched off or softened by
 * editing one word: `validate.mjs --accept-rule-change ID --reason "..."` records the change in the baseline history).
 */
export async function ruleStates() {
  return Object.fromEntries((await loadAllRules()).sort((a, b) => ruleSortKey(a.id) - ruleSortKey(b.id)).map((r) => [r.id, { sev: r.sev, status: r.status }]));
}

export function ruleSortKey(id) {
  const m = id.match(/^([A-Z]+)(\d+)$/);
  const order = ['S', 'R', 'C', 'G', 'N', 'T', 'X', 'P', 'F', 'K', 'L', 'D', 'M', 'E', 'U', 'H'];
  return (order.indexOf(m[1]) + 1) * 1000 + Number(m[2]);
}
