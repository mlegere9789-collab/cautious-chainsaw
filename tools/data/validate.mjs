#!/usr/bin/env node
// Data-quality suite (WP-DATA-03): 60 core rules + 8 v2 rules over the served data tree, with a ratchet baseline.
//
//   node tools/data/validate.mjs                       run all rules, compare with tools/data/baseline.json (exit 1 on new/stale/not-run/rule-state; the expiry report is printed, not judged)
//   node tools/data/validate.mjs --list                print the rule catalogue
//   node tools/data/validate.mjs --rules R001,S007     run only these rules (ratchet judged for them only; an unknown id exits 2; so does a selection --no-site leaves empty)
//   node tools/data/validate.mjs --init-baseline       create baseline.json from today's violations (refuses if it exists; --force; never with --rules/--no-site)
//   node tools/data/validate.mjs --tighten             delete stale baseline entries / improved metrics (never adds)
//   node tools/data/validate.mjs --rebaseline R001 --reason "why"   replace one rule's baseline (logged in baseline history)
//   node tools/data/validate.mjs --retire-rule R001 --reason "why"  drop a rule that was deliberately removed from the code (needs the id to be unregistered; logged)
//   node tools/data/validate.mjs --accept-rule-change R001 --reason "why"  record that a rule was deliberately deferred / lowered from E to W (logged; drops its baseline entries when it no longer runs)
//   node tools/data/validate.mjs --renew R001 --until 2027-06-30 --reason "why"  move one baseline expiry (logged; at most 366 days ahead of the clock)
//   node tools/data/validate.mjs --report docs/data/baseline-report.md   (re)generate the machine report
//   options: --data-dir DIR  --baseline FILE  --now YYYY-MM-DD  --strict (W also fails)  --json  --no-site (skip html/bundle scans and the rules that need them)
//            --enforce-expiry (also fail on an expired baseline entry; the explicit gate for that is tools/data/expiry.mjs)  -v
//
// The verdict does not depend on the wall clock: `data:check` cannot start failing on a date. Expiry is reported on every run and
// enforced by `node tools/data/expiry.mjs` (warns 30 days before an `expires` date, fails after it).
import fs from 'node:fs';
import path from 'node:path';
import { runValidation } from './lib/validation.mjs';
import { loadAllRules, ruleSortKey, catalogueIds, siteRuleIds, ruleStates } from './rules/index.mjs';
import { buildBaseline, evaluateRatchet, tightenBaseline } from './lib/ratchet.mjs';
import { DEFAULT_DATA_DIR, REPO_ROOT, isoDate, prettyJson, isMainModule } from './lib/util.mjs';
import { hashTree, contentHash, readJsonIfExists, PATHS } from './lib/manifest.mjs';
import { parseIsoDate, addDays, expiryReport, renderExpiryReport, githubAnnotations, MAX_RENEWAL_DAYS } from './lib/expiry.mjs';

export const DEFAULT_BASELINE = path.join(REPO_ROOT, 'tools', 'data', 'baseline.json');

function parseArgs(argv) {
  const a = { flags: new Set(), opts: {} };
  const withValue = new Set(['--rules', '--data-dir', '--baseline', '--now', '--rebaseline', '--retire-rule', '--accept-rule-change', '--renew', '--until', '--reason', '--report', '--json-out']);
  for (let i = 0; i < argv.length; i++) {
    if (withValue.has(argv[i])) a.opts[argv[i].slice(2)] = argv[++i];
    else a.flags.add(argv[i]);
  }
  return a;
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  const verbose = flags.has('-v');
  if (flags.has('--list')) {
    const rules = (await loadAllRules()).sort((x, y) => ruleSortKey(x.id) - ruleSortKey(y.id));
    for (const r of rules) console.log(`${r.id.padEnd(5)} ${r.sev} ${r.status.padEnd(11)} ${r.tier.padEnd(4)} ${r.wp.padEnd(11)} ${r.title}`);
    console.log(`\n${rules.length} rules (${rules.filter((r) => r.tier === 'core').length} core, ${rules.filter((r) => r.tier === 'v2').length} v2); ${rules.filter((r) => r.status === 'deferred').length} deferred, ${rules.filter((r) => r.status === 'partial').length} partial`);
    return 0;
  }
  if ('now' in opts && parseIsoDate(opts.now) === null) { console.error(`--now must be a calendar date YYYY-MM-DD, got ${JSON.stringify(opts.now)}`); return 2; }
  const now = opts.now ?? isoDate();
  const dataDir = opts['data-dir'] ? path.resolve(opts['data-dir']) : DEFAULT_DATA_DIR;
  const baselinePath = opts.baseline ? path.resolve(opts.baseline) : DEFAULT_BASELINE;
  const registered = await catalogueIds();
  const states = await ruleStates();
  // rules that read the deploy html or the bundle (flag `site: true` on the rule): not comparable with the baseline when --no-site is used, so they are left out
  const SITE_RULES = await siteRuleIds();
  let only = opts.rules ? [...new Set(opts.rules.split(',').map((x) => x.trim()).filter(Boolean))] : null;
  if ('rules' in opts && (!only || only.length === 0)) { console.error('--rules needs at least one rule id'); return 2; }
  const unknown = (only ?? []).filter((id) => !registered.includes(id));
  if (unknown.length) { console.error(`unknown rule id${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')} (registered: ${registered.join(' ')}). Judging zero rules is not a pass.`); return 2; }
  if (flags.has('--no-site')) {
    const asked = (only ?? []).filter((id) => SITE_RULES.includes(id));
    if (asked.length) { console.error(`--no-site cannot judge ${asked.join(', ')}: ${asked.length > 1 ? 'they read' : 'it reads'} the deploy tree or the bundle that --no-site switches off. A rule that was asked for and skipped is not a pass: drop --no-site.`); return 2; }
    only = (only ?? registered).filter((id) => !SITE_RULES.includes(id));
    (flags.has('--json') ? console.error : console.log)('--no-site: skipping ' + SITE_RULES.join(', ') + ' (they read legacy/dist html and the bundle)');
  }
  const partialRun = only !== null;
  const { ctx, results } = await runValidation({ dataDir, now, only, site: !flags.has('--no-site') });
  const treeInfo = (() => { try { const e = hashTree(dataDir); return { dir: path.relative(REPO_ROOT, dataDir).split(path.sep).join('/'), files: e.length, bytes: e.reduce((a, x) => a + x.bytes, 0), content_sha256: contentHash(e), data_version: readJsonIfExists(PATHS.version)?.data_version ?? null }; } catch { return { dir: dataDir }; } })();

  if (flags.has('--init-baseline')) {
    if (partialRun) { console.error('--init-baseline judges every rule: it cannot be combined with --rules or --no-site (a baseline built from a subset would silently drop every other rule\'s entries)'); return 2; }
    if (fs.existsSync(baselinePath) && !flags.has('--force')) { console.error(`${baselinePath} exists (use --force to overwrite; prefer --tighten or --rebaseline)`); return 2; }
    const prev = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
    let b;
    try { b = buildBaseline(results, { generated: now, dataInfo: treeInfo, previous: prev, catalogue: registered, ruleState: states }); } catch (e) { console.error(e.message); return 2; }
    b.history.push({ date: now, action: 'init-baseline', forced: Boolean(prev), note: prev ? 'rebuilt from the code and the tree: catalogue and rule_state re-recorded' : 'first baseline' });
    fs.writeFileSync(baselinePath, prettyJson(b));
    console.log(`wrote ${path.relative(REPO_ROOT, baselinePath)}: ${Object.keys(b.rules).length} rules with entries, ${Object.values(b.rules).reduce((a, r) => a + r.count, 0)} fingerprints`);
    return 0;
  }
  let baseline = null;
  if (fs.existsSync(baselinePath)) {
    try { baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch (e) { console.error(`${baselinePath} is not valid JSON: ${e.message}`); return 2; }
  }
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) { console.error(`no baseline at ${baselinePath}: run --init-baseline`); return 2; }

  if (flags.has('--tighten')) {
    let nb, removed;
    try { ({ baseline: nb, removed } = tightenBaseline(results, baseline, { registered, ruleStates: states })); } catch (e) { console.error(e.message); return 2; }
    nb.history.push({ date: now, action: 'tighten', removed });
    nb.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(nb));
    console.log(`tightened: ${removed} entr${removed === 1 ? 'y' : 'ies'} removed`);
    return 0;
  }
  if (opts['retire-rule']) {
    const id = opts['retire-rule'];
    if (!opts.reason) { console.error('--retire-rule requires --reason "..."'); return 2; }
    if (registered.includes(id)) { console.error(`${id} is still registered in tools/data/rules: remove the rule from the code first (retiring a live rule would hide it)`); return 2; }
    if (!(baseline.catalogue ?? []).includes(id) && !baseline.rules?.[id]) { console.error(`${id} is neither in the baseline catalogue nor in the baseline rules`); return 2; }
    const before = baseline.rules?.[id]?.count ?? 0;
    baseline.catalogue = (baseline.catalogue ?? []).filter((x) => x !== id);
    if (baseline.rule_state) delete baseline.rule_state[id];
    delete baseline.rules[id];
    baseline.history.push({ date: now, action: 'retire-rule', rule: id, before, reason: opts.reason });
    baseline.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(baseline));
    console.log(`retired rule ${id} (${before} baseline fingerprint(s) dropped; logged)`);
    return 0;
  }
  if (opts['accept-rule-change']) {
    const id = opts['accept-rule-change'];
    if (!opts.reason) { console.error('--accept-rule-change requires --reason "..."'); return 2; }
    const cur = states[id];
    if (!cur) { console.error(`${id} is not a registered rule`); return 2; }
    if (!Array.isArray(baseline.catalogue) || !baseline.rule_state || typeof baseline.rule_state !== 'object') { console.error('the baseline has no catalogue / rule_state: restore it from git or re-create it with --init-baseline --force'); return 2; }
    const was = baseline.rule_state[id] ?? null;
    if (was && was.sev === cur.sev && was.status === cur.status) { console.error(`${id} is unchanged since the baseline (${cur.sev} ${cur.status}): nothing to accept`); return 2; }
    const dropped = cur.status === 'deferred' ? (baseline.rules[id]?.count ?? 0) : 0;
    if (cur.status === 'deferred') delete baseline.rules[id];
    if (!baseline.catalogue.includes(id)) baseline.catalogue.push(id);
    baseline.rule_state[id] = { ...cur };
    baseline.history.push({ date: now, action: 'accept-rule-change', rule: id, before: was, after: { ...cur }, baseline_entries_dropped: dropped, reason: opts.reason });
    baseline.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(baseline));
    console.log(`accepted the state of ${id}: ${was ? `${was.sev} ${was.status}` : 'unrecorded'} -> ${cur.sev} ${cur.status}${dropped ? ` (${dropped} baseline fingerprint(s) dropped)` : ''} (logged)`);
    return 0;
  }
  if (opts.renew) {
    const id = opts.renew;
    if (!opts.reason) { console.error('--renew requires --reason "..."'); return 2; }
    const until = opts.until;
    if (parseIsoDate(until) === null) { console.error('--renew requires --until YYYY-MM-DD (a calendar date)'); return 2; }
    const entry = baseline.rules?.[id];
    if (!entry) { console.error(`${id} has no baseline entries: nothing to renew`); return 2; }
    const horizon = addDays(now, MAX_RENEWAL_DAYS);
    if (until <= now) { console.error(`--until ${until} is not after the clock (${now})`); return 2; }
    if (entry.expires && until <= entry.expires) { console.error(`--until ${until} does not extend the current expiry ${entry.expires}`); return 2; }
    if (until > horizon) { console.error(`--until ${until} is more than ${MAX_RENEWAL_DAYS} days ahead of the clock (${now}; latest ${horizon}): a baseline is debt with a due date, not a permanent allowlist`); return 2; }
    const from = entry.expires ?? null;
    entry.expires = until;
    baseline.history.push({ date: now, action: 'renew', rule: id, from, to: until, reason: opts.reason });
    baseline.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(baseline));
    console.log(`renewed ${id}: expires ${from ?? '(none)'} -> ${until} (logged)`);
    return 0;
  }
  if (opts.rebaseline) {
    if (!opts.reason) { console.error('--rebaseline requires --reason "..."'); return 2; }
    const id = opts.rebaseline;
    const r = results.get(id);
    if (!r) { console.error(`unknown or not-run rule ${id}`); return 2; }
    if (!r.ran) { console.error(`${id} did not run (${r.reason}): a rule that did not run cannot be rebaselined`); return 2; }
    let fresh;
    try { fresh = buildBaseline(new Map([[id, r]]), { generated: now, dataInfo: treeInfo, previous: baseline }); } catch (e) { console.error(e.message); return 2; }
    const before = baseline.rules[id]?.count ?? 0;
    if (fresh.rules[id]) baseline.rules[id] = fresh.rules[id]; else delete baseline.rules[id];
    baseline.history.push({ date: now, action: 'rebaseline', rule: id, before, after: r.violations.length, reason: opts.reason });
    baseline.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(baseline));
    console.log(`rebaselined ${id}: ${before} -> ${r.violations.length} (logged)`);
    return 0;
  }

  const judged = only ? new Map([...results].filter(([id]) => only.includes(id))) : results;
  // the WHOLE baseline is judged even when only some rules ran: with `registered` the ratchet looks up entries per judged rule, and its
  // shape / catalogue / rule_state checks must see the file as it is (filtering it used to re-create a deleted `rules` field as {})
  const verdict = evaluateRatchet(judged, baseline, {
    now, strict: flags.has('--strict'), registered, ruleStates: states, fullRun: true, expiry: flags.has('--enforce-expiry') ? 'enforce' : 'report',
  });
  // the expiry report always describes the WHOLE baseline, whatever subset of rules was judged
  const expiry = expiryReport(baseline, { now });

  if (opts.report) {
    const { writeBaselineReport } = await import('./lib/report.mjs');
    writeBaselineReport({ ctx, results, verdict, baseline, treeInfo, outPath: path.resolve(opts.report), now: baseline.generated });
    console.log(`wrote ${opts.report}`);
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ pass: verdict.pass, failures: verdict.failures, warnings: verdict.warnings, expiry, rules: [...verdict.perRule.values()] }, null, 2));
    return verdict.pass ? 0 : 1;
  }

  const line = (s) => console.log(s);
  line(`data: ${treeInfo.dir} (${treeInfo.files} files, ${treeInfo.bytes} B)  baseline: ${path.relative(REPO_ROOT, baselinePath)} (${baseline.generated})  now: ${now}`);
  line('rule  sev status       found  rows  baseline  new stale');
  for (const s of verdict.perRule.values()) {
    const r = results.get(s.id);
    line(`${s.id.padEnd(5)} ${s.sev}   ${(r.ran ? (r.rule.status === 'partial' ? 'partial' : 'ok') : 'SKIPPED').padEnd(9)} ${String(s.count).padStart(6)} ${String(s.rows).padStart(5)} ${String(s.baseline).padStart(9)} ${String(s.new).padStart(4)} ${String(s.stale).padStart(5)}${s.expired ? '  EXPIRED' : ''}${r.ran ? '' : `  (${r.reason})`}`);
  }
  const show = (label, list) => {
    if (!list.length) return;
    line(`\n${label} (${list.length})`);
    const byRule = new Map();
    for (const f of list) { if (!byRule.has(f.rule)) byRule.set(f.rule, []); byRule.get(f.rule).push(f); }
    for (const [rule, fs2] of byRule) {
      line(`  ${rule}: ${fs2.length}`);
      for (const f of fs2.slice(0, verbose ? 1000 : 5)) line(`    [${f.type}] ${f.message}`);
      if (!verbose && fs2.length > 5) line(`    ... ${fs2.length - 5} more (-v)`);
    }
  };
  show('FAILURES', verdict.failures);
  show('warnings (W rules; --strict makes them fail)', verdict.warnings);
  line('');
  if (expiry) {
    for (const l of renderExpiryReport(expiry)) line(l);
    if (process.env.GITHUB_ACTIONS === 'true') for (const l of githubAnnotations(expiry)) line(l);
    if ((expiry.expired.length || expiry.warning.length) && !flags.has('--enforce-expiry')) line('expiry is not part of this verdict (it depends on the date): `node tools/data/expiry.mjs` is the gate that fails after an expiry, or add --enforce-expiry here');
  }
  line(verdict.pass ? '\nPASS: no new violations, no stale baseline entries, every rule that has to run ran.' : '\nFAIL: see failures above.');
  return verdict.pass ? 0 : 1;
}

if (isMainModule(import.meta.url)) {
  main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(2); });
}
