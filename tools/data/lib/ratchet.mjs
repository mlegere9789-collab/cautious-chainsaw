// The ratchet: CI fails on NEW violations and on STALE allowlist entries; baseline entries carry an expiry.
// Baseline entries are fingerprints (`rule|key`) of today's known violations. A fix must delete exactly its entry.
import { rowsOf } from './runner.mjs';

export const BASELINE_SCHEMA = 'gtbg/data-baseline/1';

/**
 * Build a fresh baseline document from run results (used by --init-baseline).
 * `catalogue` = ids of every registered rule at the time; the ratchet later fails if one of them is no longer registered.
 */
export function buildBaseline(results, { generated, dataInfo, previous = null, catalogue = null }) {
  const rules = {};
  for (const [id, r] of results) {
    if (!r.ran) continue;
    const vs = r.violations;
    if (!vs.length) continue;
    const entry = {
      sev: r.rule.sev,
      wp: r.rule.wp,
      expires: previous?.rules?.[id]?.expires ?? r.rule.expires,
      count: vs.length,
      rows: rowsOf(vs),
      keys: vs.map((v) => v.key).sort(),
    };
    const values = {};
    for (const v of vs) if (v.metric) values[v.key] = v.metric.value;
    if (Object.keys(values).length) entry.values = values;
    rules[id] = entry;
  }
  return {
    schema: BASELINE_SCHEMA,
    generated,
    note: 'Ratchet baseline of KNOWN violations in the legacy tree. CI (tools/data/validate.mjs) fails on new violations, on entries that no longer occur (delete them with --tighten), and on entries past their expiry. Never add an entry by hand: use --rebaseline <RULE> --reason "...", which logs to history.',
    data: dataInfo,
    catalogue: catalogue ?? previous?.catalogue ?? [...results.keys()],
    history: previous?.history ?? [],
    rules,
  };
}

const isBaselined = (base) => Boolean(base) && ((base.count ?? 0) > 0 || (base.keys?.length ?? 0) > 0);

/**
 * @param {Map<string,any>} results  output of runRules (possibly filtered by --rules / --no-site)
 * @param {object} baseline          tools/data/baseline.json
 * @param {object} o
 * @param {string} o.now             ISO date for baseline expiry
 * @param {boolean} [o.strict]       W rules fail too
 * @param {string[]|null} [o.registered] ids of every rule registered in the code base (rules/index.mjs). When given, the ratchet also
 *        fails on baseline entries and catalogue ids that are no longer registered even if `results` was filtered.
 * @returns {{failures:any[], warnings:any[], perRule:Map<string,any>, pass:boolean}}
 *
 * A rule that did not run never counts as clean:
 *  - it threw                                          -> failure (rule_error)
 *  - it has baseline entries                           -> failure (baselined_rule_not_run): the known violations vanished because
 *                                                         nothing looked, not because they were fixed
 *  - status deferred, or notApplicable() by design     -> informational (reported as SKIPPED)
 *  - anything else (run() returned null: input missing) -> failure for E rules, warning for W (failure with --strict) (not_run)
 */
export function evaluateRatchet(results, baseline, { now, strict = false, registered = null } = {}) {
  const failures = [];
  const warnings = [];
  const perRule = new Map();
  const push = (rule, item) => ((rule.sev === 'E' || strict) ? failures : warnings).push({ rule: rule.id, sev: rule.sev, ...item });

  for (const [id, r] of results) {
    const base = baseline?.rules?.[id] ?? null;
    const summary = { id, ran: r.ran, sev: r.rule.sev, count: r.violations.length, rows: rowsOf(r.violations), baseline: base?.count ?? 0, new: 0, stale: 0, expired: false };
    perRule.set(id, summary);
    if (!r.ran) {
      if (r.error) failures.push({ rule: id, sev: r.rule.sev, type: 'rule_error', message: r.error.split('\n')[0] });
      else if (isBaselined(base)) failures.push({ rule: id, sev: r.rule.sev, type: 'baselined_rule_not_run', message: `${id} has ${base.count} baselined violation(s) but did not run (${r.reason}): the ratchet cannot tell fixed from unchecked` });
      else if (r.rule.status !== 'deferred' && !r.notApplicable) push(r.rule, { type: 'not_run', message: `${id} could not run (${r.reason}): a rule that cannot run cannot vouch for the tree` });
      continue;
    }
    const baseKeys = new Set(base?.keys ?? []);
    const nowKeys = new Map(r.violations.map((v) => [v.key, v]));
    const newKeys = [...nowKeys.keys()].filter((k) => !baseKeys.has(k));
    const staleKeys = [...baseKeys].filter((k) => !nowKeys.has(k));
    // metric entries: worse => new violation, better => stale (tighten)
    const worse = [], better = [];
    for (const [k, v] of nowKeys) {
      if (!v.metric || !baseKeys.has(k) || !base.values || !(k in base.values)) continue;
      const was = base.values[k];
      const dir = v.metric.better === 'higher' ? 1 : -1;
      if (dir * (v.metric.value - was) < 0) worse.push([k, was, v.metric.value]);
      else if (dir * (v.metric.value - was) > 0) better.push([k, was, v.metric.value]);
    }
    summary.new = newKeys.length + worse.length;
    summary.stale = staleKeys.length + better.length;
    for (const k of newKeys) push(r.rule, { type: 'new', key: k, message: nowKeys.get(k).message });
    for (const [k, was, val] of worse) push(r.rule, { type: 'worse', key: k, message: `${k}: metric ${was} -> ${val} (worse)` });
    // stale entries fail for both severities: the baseline must not overstate the problem
    for (const k of staleKeys) failures.push({ rule: id, sev: r.rule.sev, type: 'stale', key: k, message: `baseline entry ${k} no longer occurs: delete it (--tighten)` });
    for (const [k, was, val] of better) failures.push({ rule: id, sev: r.rule.sev, type: 'stale', key: k, message: `${k}: metric improved ${was} -> ${val}: tighten the baseline` });
    if (base && base.expires && base.expires < now && nowKeys.size > 0) {
      summary.expired = true;
      push(r.rule, { type: 'expired', message: `baseline for ${id} expired ${base.expires} with ${nowKeys.size} violation(s) still present: fix them or renew with a reason` });
    }
  }
  // baseline entries for rules that no longer exist
  for (const id of Object.keys(baseline?.rules ?? {})) {
    if (registered ? !registered.includes(id) : !results.has(id)) failures.push({ rule: id, sev: 'E', type: 'unknown_rule', message: `baseline has entries for unknown rule ${id}` });
  }
  // rules that were registered when the baseline was written must still be registered (a deleted rule file is not a fix)
  if (registered) {
    for (const id of baseline?.catalogue ?? []) {
      if (!registered.includes(id)) failures.push({ rule: id, sev: 'E', type: 'unregistered_rule', message: `rule ${id} is in the baseline catalogue but is no longer registered in tools/data/rules: a rule cannot be dropped by deleting its code (retire it with --retire-rule ${id} --reason "...")` });
    }
  }
  return { failures, warnings, perRule, pass: failures.length === 0 };
}

/** Remove stale entries and improved metric values from a baseline. Never adds a violation; may add newly registered rule ids to the catalogue. */
export function tightenBaseline(results, baseline, { registered = null } = {}) {
  const out = structuredClone(baseline);
  let removed = 0;
  if (registered) out.catalogue = [...new Set([...(out.catalogue ?? []), ...registered])];
  for (const [id, r] of results) {
    const base = out.rules[id];
    if (!base || !r.ran) continue;
    const nowKeys = new Map(r.violations.map((v) => [v.key, v]));
    const kept = base.keys.filter((k) => nowKeys.has(k));
    removed += base.keys.length - kept.length;
    base.keys = kept;
    if (base.values) {
      for (const k of Object.keys(base.values)) {
        const v = nowKeys.get(k);
        if (!v) { delete base.values[k]; continue; }
        const dir = v.metric.better === 'higher' ? 1 : -1;
        if (dir * (v.metric.value - base.values[k]) > 0) { base.values[k] = v.metric.value; removed++; }
      }
    }
    base.count = kept.length;
    base.rows = rowsOf(r.violations.filter((v) => kept.includes(v.key)));
    if (kept.length === 0) delete out.rules[id];
  }
  return { baseline: out, removed };
}
