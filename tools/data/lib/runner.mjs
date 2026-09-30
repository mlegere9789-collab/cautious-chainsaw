// Runs rules over a context and returns structured results (no I/O besides what rules do).
import { loadAllRules, ruleSortKey } from '../rules/index.mjs';

/**
 * @returns {Promise<{rules:any[], results:Map<string,{rule:any, ran:boolean, violations:any[], error?:string}>}>}
 */
export async function runRules(ctx, { only = null } = {}) {
  const rules = (await loadAllRules()).sort((a, b) => ruleSortKey(a.id) - ruleSortKey(b.id));
  // judging zero rules is not a pass: an empty or unknown selection is an error here, for every caller (CLI, report, tests)
  if (only !== null) {
    if (!Array.isArray(only) || only.length === 0) throw new Error('runRules: `only` selects no rule; judging zero rules is not a pass');
    const unknown = only.filter((id) => !rules.some((r) => r.id === id));
    if (unknown.length) throw new Error(`runRules: unknown rule id ${unknown.join(', ')}`);
  }
  const results = new Map();
  for (const rule of rules) {
    if (only && !only.includes(rule.id)) continue;
    if (rule.status === 'deferred') {
      results.set(rule.id, { rule, ran: false, violations: [], reason: rule.blocked_by || 'deferred' });
      continue;
    }
    let vs;
    try {
      vs = rule.run(ctx);
    } catch (e) {
      results.set(rule.id, { rule, ran: false, violations: [], error: String(e.stack || e), reason: 'rule threw' });
      continue;
    }
    if (vs === null || vs === undefined) {
      results.set(rule.id, { rule, ran: false, violations: [], reason: 'input not available' });
      continue;
    }
    if (!Array.isArray(vs)) {
      if (vs.notApplicable) { results.set(rule.id, { rule, ran: false, notApplicable: true, violations: [], reason: vs.reason || 'not applicable' }); continue; }
      results.set(rule.id, { rule, ran: false, violations: [], error: `rule ${rule.id} returned ${typeof vs}, expected an array, null or notApplicable()`, reason: 'rule returned a bad value' });
      continue;
    }
    // key uniqueness within a rule is part of the contract
    const seen = new Set();
    for (const v of vs) {
      if (seen.has(v.key)) v.key = `${v.key}#${[...seen].filter((k) => k === v.key || k.startsWith(v.key + '#')).length}`;
      seen.add(v.key);
    }
    results.set(rule.id, { rule, ran: true, violations: vs });
  }
  return { rules, results };
}

export const rowsOf = (violations) => violations.reduce((n, v) => n + (v.rows ?? 1), 0);
