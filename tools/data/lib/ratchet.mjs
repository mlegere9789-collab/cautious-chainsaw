// The ratchet: CI fails on NEW violations and on STALE allowlist entries; baseline entries carry an expiry.
// Baseline entries are fingerprints (`rule|key`) of today's known violations. A fix must delete exactly its entry.
import { rowsOf } from './runner.mjs';

export const BASELINE_SCHEMA = 'gtbg/data-baseline/1';

/** Build a fresh baseline document from run results (used by --init-baseline). */
export function buildBaseline(results, { generated, dataInfo, previous = null }) {
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
    history: previous?.history ?? [],
    rules,
  };
}

/**
 * @returns {{failures:any[], warnings:any[], perRule:Map<string,any>, pass:boolean}}
 */
export function evaluateRatchet(results, baseline, { now, strict = false } = {}) {
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
    if (!results.has(id)) failures.push({ rule: id, sev: 'E', type: 'unknown_rule', message: `baseline has entries for unknown rule ${id}` });
  }
  return { failures, warnings, perRule, pass: failures.length === 0 };
}

/** Remove stale entries and improved metric values from a baseline. Never adds. */
export function tightenBaseline(results, baseline) {
  const out = structuredClone(baseline);
  let removed = 0;
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
