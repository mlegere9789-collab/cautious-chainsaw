// The ratchet: CI fails on NEW violations and on STALE allowlist entries; baseline entries carry an expiry.
// Baseline entries are fingerprints (`rule|key`) of today's known violations. A fix must delete exactly its entry.
//
// The ratchet also guards the GUARD: a rule that stops running must never read as a clean tree.
//   - a rule that threw / returned no input / has baseline entries and did not run      -> failure
//   - a rule that is `deferred` now but was running when the baseline was written        -> failure (rule_state)
//   - an E rule that was lowered to W                                                    -> failure (rule_state)
//   - a rule that vanished from the code                                                 -> failure (catalogue)
//   - a baseline that lost `catalogue` / `rule_state` (so none of the above can be told) -> failure (baseline_malformed)
//   - a full run in which a rule reports "not applicable"                                -> failure
//   - a run that judged zero rules                                                       -> failure
import { rowsOf } from './runner.mjs';
import { parseIsoDate, expiryReport } from './expiry.mjs';

export const BASELINE_SCHEMA = 'gtbg/data-baseline/1';
const SEVS = ['E', 'W'];
const STATUSES = ['implemented', 'partial', 'deferred'];

/** The state of one rule that the baseline records: its severity and whether it runs. */
export const ruleStateOf = (rule) => ({ sev: rule.sev, status: rule.status });

/**
 * Build a fresh baseline document from run results (used by --init-baseline).
 * `catalogue` = ids of every registered rule at the time; `ruleState` = their { sev, status }. The ratchet later fails if a rule is
 * no longer registered, stopped running (deferred) or was lowered from E to W without a logged `--accept-rule-change`.
 */
export function buildBaseline(results, { generated, dataInfo, previous = null, catalogue = null, ruleState = null }) {
  const rules = {};
  for (const [id, r] of results) {
    if (!r.ran) continue;
    const vs = r.violations;
    if (!vs.length) continue;
    const expires = previous?.rules?.[id]?.expires ?? r.rule.expires;
    // a baseline must not be born expired: the family expiry in rules/define.mjs is a proposal that has to be moved deliberately
    if (parseIsoDate(expires) === null || (parseIsoDate(generated) !== null && parseIsoDate(expires) < parseIsoDate(generated))) {
      throw new Error(`${id}: baseline expiry ${JSON.stringify(expires)} is not a date after the baseline date ${generated}: move FAMILY_EXPIRY (tools/data/rules/define.mjs) deliberately`);
    }
    const entry = {
      sev: r.rule.sev,
      wp: r.rule.wp,
      expires,
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
    note: 'Ratchet baseline of KNOWN violations in the legacy tree. CI (tools/data/validate.mjs) fails on new violations, on entries that no longer occur (delete them with --tighten), and on a rule that stops running (catalogue, rule_state). Entries carry an expiry: tools/data/expiry.mjs warns 30 days before it and fails after it (renew with --renew <RULE> --until <date> --reason "..."). Never add an entry by hand: use --rebaseline <RULE> --reason "...", which logs to history.',
    data: dataInfo,
    catalogue: catalogue ?? previous?.catalogue ?? [...results.keys()],
    rule_state: ruleState ?? previous?.rule_state ?? Object.fromEntries([...results].map(([id, r]) => [id, ruleStateOf(r.rule)])),
    history: previous?.history ?? [],
    rules,
  };
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Everything the ratchet relies on being present in the baseline file. A baseline that lost a field must fail, not relax the checks
 * that field feeds (deleting `catalogue` used to switch the unregistered-rule guard off).
 * @returns {string[]} one sentence per problem
 */
export function baselineShapeProblems(b) {
  if (!isObject(b)) return ['the baseline is not a JSON object'];
  const p = [];
  if (b.schema !== BASELINE_SCHEMA) p.push(`"schema" is ${JSON.stringify(b.schema)}, expected "${BASELINE_SCHEMA}"`);
  if (parseIsoDate(b.generated) === null) p.push(`"generated" is not an ISO date (${JSON.stringify(b.generated)})`);
  const cat = b.catalogue;
  if (!Array.isArray(cat) || cat.length === 0 || !cat.every((x) => typeof x === 'string')) p.push('"catalogue" (the ids of every registered rule) is missing or not a non-empty array of ids: without it a rule that vanishes from the code goes unnoticed');
  else if (new Set(cat).size !== cat.length) p.push('"catalogue" lists a rule id twice');
  if (!isObject(b.rule_state)) p.push('"rule_state" (severity and status of every registered rule) is missing: without it a rule switched to deferred, or lowered to W, goes unnoticed');
  else {
    for (const [id, s] of Object.entries(b.rule_state)) {
      if (!isObject(s) || !SEVS.includes(s.sev) || !STATUSES.includes(s.status)) p.push(`"rule_state.${id}" is not { sev: E|W, status: implemented|partial|deferred }`);
      if (Array.isArray(cat) && !cat.includes(id)) p.push(`"rule_state.${id}" is not in the catalogue`);
    }
    if (Array.isArray(cat)) for (const id of cat) if (typeof id === 'string' && !(id in b.rule_state)) p.push(`catalogue id ${id} has no "rule_state"`);
  }
  if (!Array.isArray(b.history)) p.push('"history" is missing');
  if (!isObject(b.rules)) p.push('"rules" is missing');
  else {
    for (const [id, e] of Object.entries(b.rules)) {
      if (!isObject(e) || !Array.isArray(e.keys) || typeof e.count !== 'number') { p.push(`baseline entry ${id} has no keys/count`); continue; }
      if (parseIsoDate(e.expires) === null) p.push(`baseline entry ${id} has no usable "expires" date (${JSON.stringify(e.expires)}): an entry that never expires never comes due`);
    }
  }
  return p;
}

const isBaselined = (base) => Boolean(base) && ((base.count ?? 0) > 0 || (base.keys?.length ?? 0) > 0);

/**
 * @param {Map<string,any>} results  output of runRules (possibly filtered by --rules / --no-site)
 * @param {object} baseline          tools/data/baseline.json
 * @param {object} o
 * @param {string} o.now             ISO date for baseline expiry
 * @param {boolean} [o.strict]       W rules fail too
 * @param {string[]|null} [o.registered] ids of every rule registered in the code base (rules/index.mjs). When given, the ratchet also
 *        fails on baseline entries and catalogue ids that are no longer registered even if `results` was filtered, and on a baseline
 *        that lacks the fields this guard needs (baseline_malformed).
 * @param {Record<string,{sev:string,status:string}>|null} [o.ruleStates] { id: {sev,status} } of every registered rule (rules/index.mjs
 *        ruleStates()). Default: the rules present in `results`.
 * @param {boolean} [o.fullRun]      the run judges the whole tree with every input switched on (the CLI): a rule that reports
 *        "not applicable" then is a rule that did not run, and fails. Tests that feed in-memory data leave it off.
 * @param {'enforce'|'report'} [o.expiry] 'enforce' (default, the library contract): an entry past `expires` with violations still present
 *        fails. 'report': expiry is not judged here; tools/data/expiry.mjs is the explicit gate and validate.mjs prints the report.
 * @returns {{failures:any[], warnings:any[], perRule:Map<string,any>, pass:boolean, expiry:object|null}}
 *
 * A rule that did not run never counts as clean:
 *  - it threw                                          -> failure (rule_error)
 *  - it has baseline entries                           -> failure (baselined_rule_not_run): the known violations vanished because
 *                                                         nothing looked, not because they were fixed
 *  - status deferred                                   -> informational (reported as SKIPPED) unless it was running when the baseline
 *                                                         was written (rule_deferred, see rule_state)
 *  - notApplicable() by design                         -> informational, except in a full run (not_applicable_in_full_run)
 *  - anything else (run() returned null: input missing) -> failure for E rules, warning for W (failure with --strict) (not_run)
 */
export function evaluateRatchet(results, baseline, { now, strict = false, registered = null, ruleStates = null, fullRun = false, expiry = 'enforce' } = {}) {
  const failures = [];
  const warnings = [];
  const perRule = new Map();
  const push = (rule, item) => ((rule.sev === 'E' || strict) ? failures : warnings).push({ rule: rule.id, sev: rule.sev, ...item });

  if (results.size === 0) failures.push({ rule: '-', sev: 'E', type: 'no_rules_judged', message: 'no rule was judged: judging zero rules is not a pass' });

  // the guard's own record must be intact before anything it feeds can be trusted
  if (registered) for (const message of baselineShapeProblems(baseline)) failures.push({ rule: '-', sev: 'E', type: 'baseline_malformed', message });

  for (const [id, r] of results) {
    const base = baseline?.rules?.[id] ?? null;
    const summary = { id, ran: r.ran, sev: r.rule.sev, count: r.violations.length, rows: rowsOf(r.violations), baseline: base?.count ?? 0, new: 0, stale: 0, expired: false };
    perRule.set(id, summary);
    if (!r.ran) {
      if (r.error) failures.push({ rule: id, sev: r.rule.sev, type: 'rule_error', message: r.error.split('\n')[0] });
      else if (isBaselined(base)) failures.push({ rule: id, sev: r.rule.sev, type: 'baselined_rule_not_run', message: `${id} has ${base.count} baselined violation(s) but did not run (${r.reason}): the ratchet cannot tell fixed from unchecked` });
      // not a finding but a malfunction of the guard, so it fails whatever the severity
      else if (r.notApplicable) { if (fullRun) failures.push({ rule: id, sev: r.rule.sev, type: 'not_applicable_in_full_run', message: `${id} reported "not applicable" (${r.reason}) in a full run: every input is switched on, so the rule did not judge the tree` }); }
      else if (r.rule.status !== 'deferred') push(r.rule, { type: 'not_run', message: `${id} could not run (${r.reason}): a rule that cannot run cannot vouch for the tree` });
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
      if (expiry === 'enforce') push(r.rule, { type: 'expired', message: `baseline for ${id} expired ${base.expires} with ${nowKeys.size} violation(s) still present: fix them or renew with a reason` });
    }
  }
  // baseline entries for rules that no longer exist
  for (const id of Object.keys(baseline?.rules ?? {})) {
    if (registered ? !registered.includes(id) : !results.has(id)) failures.push({ rule: id, sev: 'E', type: 'unknown_rule', message: `baseline has entries for unknown rule ${id}` });
  }
  if (registered) {
    // rules that were registered when the baseline was written must still be registered (a deleted rule file is not a fix)
    for (const id of Array.isArray(baseline?.catalogue) ? baseline.catalogue : []) {
      if (!registered.includes(id)) failures.push({ rule: id, sev: 'E', type: 'unregistered_rule', message: `rule ${id} is in the baseline catalogue but is no longer registered in tools/data/rules: a rule cannot be dropped by deleting its code (retire it with --retire-rule ${id} --reason "...")` });
    }
    // ... and must still run, at the severity they had (a rule is not disabled by flipping `status`, nor softened by flipping `sev`)
    const states = ruleStates ?? Object.fromEntries([...results].map(([id, r]) => [id, ruleStateOf(r.rule)]));
    for (const [id, was] of Object.entries(isObject(baseline?.rule_state) ? baseline.rule_state : {})) {
      const cur = states[id];
      if (!cur || !isObject(was)) continue;
      if (was.status !== 'deferred' && cur.status === 'deferred') failures.push({ rule: id, sev: was.sev === 'W' ? 'W' : 'E', type: 'rule_deferred', message: `rule ${id} was ${was.status} when the baseline was written and is deferred now: a deferred rule judges nothing, so it would pass on any tree. Re-enable it, or record the decision with --accept-rule-change ${id} --reason "..."` });
      if (was.sev === 'E' && cur.sev === 'W') failures.push({ rule: id, sev: 'E', type: 'severity_lowered', message: `rule ${id} was an E rule (fails CI) when the baseline was written and is W now: record the decision with --accept-rule-change ${id} --reason "..."` });
    }
  }
  let exp = null;
  try { exp = parseIsoDate(now) === null ? null : expiryReport(baseline, { now }); } catch { exp = null; }
  return { failures, warnings, perRule, pass: failures.length === 0, expiry: exp };
}

/**
 * Remove stale entries and improved metric values from a baseline. Never adds a violation. May add newly registered ids (and their
 * rule_state) and record a rule that became stricter (deferred -> running, W -> E); never removes or relaxes anything in the guard.
 * Throws when the baseline lost its catalogue / rule_state: rebuilding it here would launder exactly what the guard is for.
 */
export function tightenBaseline(results, baseline, { registered = null, ruleStates = null } = {}) {
  if (registered) {
    if (!Array.isArray(baseline.catalogue)) throw new Error('the baseline has no "catalogue": refusing to rebuild it from the code (that would forgive every rule that vanished); restore it from git, or re-create the baseline deliberately with --init-baseline --force');
    if (!isObject(baseline.rule_state)) throw new Error('the baseline has no "rule_state": refusing to rebuild it from the code (that would forgive every rule that was switched off); restore it from git, or re-create the baseline deliberately with --init-baseline --force');
  }
  const out = structuredClone(baseline);
  let removed = 0;
  if (registered) out.catalogue = [...new Set([...(out.catalogue ?? []), ...registered])];
  if (ruleStates) {
    out.rule_state = out.rule_state ?? {};
    for (const [id, cur] of Object.entries(ruleStates)) {
      const was = out.rule_state[id];
      if (!was) { out.rule_state[id] = { ...cur }; continue; }
      const stricter = (was.status === 'deferred' && cur.status !== 'deferred') || (was.sev === 'W' && cur.sev === 'E');
      if (stricter) out.rule_state[id] = { sev: was.sev === 'W' && cur.sev === 'E' ? 'E' : was.sev, status: was.status === 'deferred' && cur.status !== 'deferred' ? cur.status : was.status };
    }
  }
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
