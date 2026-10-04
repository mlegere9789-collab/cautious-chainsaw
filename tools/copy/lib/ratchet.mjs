// The copy_lint ratchet, modelled on tools/data/lib/ratchet.mjs: CI fails on NEW violations and on STALE baseline entries, and a
// baseline entry carries an expiry after which the known violations fail too. Entries are fingerprints (no line numbers, so a file
// can be edited without churning the baseline).
import crypto from 'node:crypto';

export const BASELINE_SCHEMA = 'gtbg/copy-baseline/1';

// rule + JSON path (or attribute name) + the matched text, lower-cased. Deliberately no surrounding context and no line number: a
// file can be edited around a known violation without churning the baseline; a second identical violation in the same file gets the
// suffix .2 and is therefore new.
export const fingerprint = (f) => crypto.createHash('sha1').update([f.rule, f.where || '', (f.match || '').toLowerCase()].join('|')).digest('hex').slice(0, 8);

/** Group findings: { rule -> { file -> string[] fingerprints (duplicates suffixed .2 .3) } } */
export function groupFindings(findings) {
  const out = {};
  const seen = new Map();
  for (const f of findings) {
    const fp = fingerprint(f);
    const k = `${f.rule}|${f.file}|${fp}`;
    const n = (seen.get(k) || 0) + 1; seen.set(k, n);
    ((out[f.rule] ||= {})[f.file] ||= []).push(n === 1 ? fp : `${fp}.${n}`);
  }
  for (const r of Object.values(out)) for (const a of Object.keys(r)) r[a].sort();
  return out;
}

const parseIso = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) ? Date.parse(s + 'T00:00:00Z') : null);
export { parseIso };

export function buildBaseline(findings, { generated, target, ruleDefs, expiries, previous = null }) {
  const grouped = groupFindings(findings);
  const rules = {};
  for (const [id, files] of Object.entries(grouped)) {
    const count = Object.values(files).reduce((a, v) => a + v.length, 0);
    const expires = previous?.rules?.[id]?.expires ?? expiries[id] ?? expiries.default;
    if (parseIso(expires) === null || parseIso(expires) < parseIso(generated)) throw new Error(`${id}: baseline expiry ${JSON.stringify(expires)} is not a date after ${generated}`);
    rules[id] = { sev: ruleDefs.find((r) => r.id === id).sev, expires, count, files };
  }
  return {
    schema: BASELINE_SCHEMA,
    generated,
    note: 'Ratchet baseline of KNOWN copy violations in the target tree. node tools/copy/copy_lint.mjs fails on new violations, on entries that no longer occur (delete them with --tighten) and, after its date, on every known violation of a rule (renew with --renew RULE --until DATE --reason "..."). Never add an entry by hand: use --rebaseline RULE --reason "...", which logs to history.',
    target,
    catalogue: ruleDefs.map((r) => r.id),
    rule_state: Object.fromEntries(ruleDefs.map((r) => [r.id, { sev: r.sev }])),
    history: previous?.history ?? [],
    rules,
  };
}

export function baselineShapeProblems(b) {
  const p = [];
  if (!b || typeof b !== 'object' || Array.isArray(b)) return ['the baseline is not a JSON object'];
  if (b.schema !== BASELINE_SCHEMA) p.push(`"schema" is ${JSON.stringify(b.schema)}, expected "${BASELINE_SCHEMA}"`);
  if (parseIso(b.generated) === null) p.push('"generated" is not an ISO date');
  if (!Array.isArray(b.catalogue) || !b.catalogue.length) p.push('"catalogue" (ids of every rule) is missing: a rule that vanishes would go unnoticed');
  if (!b.rule_state || typeof b.rule_state !== 'object') p.push('"rule_state" is missing: a rule lowered from E to W would go unnoticed');
  if (!b.target || typeof b.target.root !== 'string') p.push('"target.root" is missing');
  if (!b.rules || typeof b.rules !== 'object') p.push('"rules" is missing');
  else for (const [id, e] of Object.entries(b.rules)) { if (parseIso(e.expires) === null) p.push(`baseline entry ${id} has no usable "expires"`); if (!e.files || typeof e.files !== 'object') p.push(`baseline entry ${id} has no "files"`); }
  return p;
}

const multiset = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return m; };

/**
 * @param {object[]} findings   all findings of the run (already filtered by --rules if any)
 * @param {object} baseline
 * @param {object} o  { now, strict, ruleDefs, only:Set|null }
 * @returns {{failures:object[], warnings:object[], perRule:Map, pass:boolean}}
 */
export function evaluateRatchet(findings, baseline, { now, strict = false, ruleDefs, only = null, enforceExpiry = true }) {
  const failures = []; const warnings = []; const perRule = new Map();
  for (const m of baselineShapeProblems(baseline)) failures.push({ rule: '-', type: 'baseline_malformed', message: m });
  const current = groupFindings(findings);
  const ids = ruleDefs.map((r) => r.id);
  if (baseline?.catalogue) for (const id of baseline.catalogue) if (!ids.includes(id)) failures.push({ rule: id, type: 'rule_vanished', message: `${id} is in the baseline catalogue but no longer in the code: a rule that disappears reads as a clean tree` });
  for (const def of ruleDefs) {
    if (only && !only.has(def.id)) continue;
    const base = baseline?.rules?.[def.id];
    const baseState = baseline?.rule_state?.[def.id];
    if (baseState && baseState.sev === 'E' && def.sev === 'W') failures.push({ rule: def.id, type: 'rule_lowered', message: `${def.id} was lowered from E to W without a logged --accept-rule-change` });
    const cur = current[def.id] || {};
    const push = (item) => ((def.sev === 'E' || strict) ? failures : warnings).push({ rule: def.id, sev: def.sev, ...item });
    let nNew = 0; let nStale = 0; const newItems = []; const staleItems = [];
    const files = new Set([...Object.keys(cur), ...Object.keys(base?.files || {})]);
    for (const file of files) {
      const c = multiset(cur[file] || []); const b = multiset(base?.files?.[file] || []);
      for (const [k, v] of c) { const d = v - (b.get(k) || 0); if (d > 0) { nNew += d; newItems.push({ file, fp: k, n: d }); } }
      for (const [k, v] of b) { const d = v - (c.get(k) || 0); if (d > 0) { nStale += d; staleItems.push({ file, fp: k, n: d }); } }
    }
    const total = Object.values(cur).reduce((a, v) => a + v.length, 0);
    const expired = Boolean(base) && enforceExpiry && parseIso(base.expires) !== null && parseIso(now) > parseIso(base.expires) && total > 0;
    perRule.set(def.id, { id: def.id, sev: def.sev, count: total, baseline: base?.count ?? 0, new: nNew, stale: nStale, expires: base?.expires ?? null, expired });
    if (nNew) push({ type: 'new', count: nNew, message: `${nNew} new violation(s) not in the baseline`, items: newItems });
    if (nStale) failures.push({ rule: def.id, sev: def.sev, type: 'stale', count: nStale, message: `${nStale} baseline entr${nStale === 1 ? 'y' : 'ies'} no longer occur: delete with --tighten`, items: staleItems });
    if (expired) failures.push({ rule: def.id, sev: def.sev, type: 'expired', count: total, message: `baseline expired ${base.expires}: ${total} known violation(s) still present` });
  }
  return { failures, warnings, perRule, pass: failures.length === 0 };
}

export function tightenBaseline(findings, baseline, { ruleDefs, only = null }) {
  const current = groupFindings(findings);
  const nb = JSON.parse(JSON.stringify(baseline));
  let removed = 0;
  for (const def of ruleDefs) {
    if (only && !only.has(def.id)) continue;
    const base = nb.rules[def.id]; if (!base) continue;
    for (const file of Object.keys(base.files)) {
      const c = multiset(current[def.id]?.[file] || []);
      const keep = [];
      for (const k of base.files[file]) { const left = c.get(k) || 0; if (left > 0) { keep.push(k); c.set(k, left - 1); } else removed++; }
      if (keep.length) base.files[file] = keep.sort(); else delete base.files[file];
    }
    base.count = Object.values(base.files).reduce((a, v) => a + v.length, 0);
    if (!base.count) delete nb.rules[def.id];
  }
  return { baseline: nb, removed };
}
