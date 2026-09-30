#!/usr/bin/env node
// Data-quality suite (WP-DATA-03): 60 core rules + 8 v2 rules over the served data tree, with a ratchet baseline.
//
//   node tools/data/validate.mjs                       run all rules, compare with tools/data/baseline.json (exit 1 on new/stale/expired)
//   node tools/data/validate.mjs --list                print the rule catalogue
//   node tools/data/validate.mjs --rules R001,S007     run only these rules (ratchet judged for them only)
//   node tools/data/validate.mjs --init-baseline       create baseline.json from today's violations (refuses if it exists; --force)
//   node tools/data/validate.mjs --tighten             delete stale baseline entries / improved metrics (never adds)
//   node tools/data/validate.mjs --rebaseline R001 --reason "why"   replace one rule's baseline (logged in baseline history)
//   node tools/data/validate.mjs --report docs/data/baseline-report.md   (re)generate the machine report
//   options: --data-dir DIR  --baseline FILE  --now YYYY-MM-DD  --strict (W also fails)  --json  --no-site (skip html/bundle scans and the rules that need them)  -v
import fs from 'node:fs';
import path from 'node:path';
import { runValidation } from './lib/validation.mjs';
import { loadAllRules, ruleSortKey } from './rules/index.mjs';
import { buildBaseline, evaluateRatchet, tightenBaseline } from './lib/ratchet.mjs';
import { DEFAULT_DATA_DIR, REPO_ROOT, isoDate, prettyJson } from './lib/util.mjs';
import { hashTree, contentHash, readJsonIfExists, PATHS } from './lib/manifest.mjs';

export const DEFAULT_BASELINE = path.join(REPO_ROOT, 'tools', 'data', 'baseline.json');

function parseArgs(argv) {
  const a = { flags: new Set(), opts: {} };
  const withValue = new Set(['--rules', '--data-dir', '--baseline', '--now', '--rebaseline', '--reason', '--report', '--json-out']);
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
  const now = opts.now ?? isoDate();
  const dataDir = opts['data-dir'] ? path.resolve(opts['data-dir']) : DEFAULT_DATA_DIR;
  const baselinePath = opts.baseline ? path.resolve(opts.baseline) : DEFAULT_BASELINE;
  // rules that read the deploy html or the bundle: not comparable with the baseline when --no-site is used, so they are left out
  const SITE_RULES = ['R008', 'F001', 'F002', 'K001', 'U001', 'M001', 'L001', 'P001'];
  let only = opts.rules ? opts.rules.split(',') : null;
  if (flags.has('--no-site')) {
    const all = (await loadAllRules()).map((r) => r.id);
    only = (only ?? all).filter((id) => !SITE_RULES.includes(id));
    console.log('--no-site: skipping ' + SITE_RULES.join(', ') + ' (they read legacy/dist html and the bundle)');
  }
  const { ctx, results } = await runValidation({ dataDir, now, only, site: !flags.has('--no-site') });
  const treeInfo = (() => { try { const e = hashTree(dataDir); return { dir: path.relative(REPO_ROOT, dataDir).split(path.sep).join('/'), files: e.length, bytes: e.reduce((a, x) => a + x.bytes, 0), content_sha256: contentHash(e), data_version: readJsonIfExists(PATHS.version)?.data_version ?? null }; } catch { return { dir: dataDir }; } })();

  if (flags.has('--init-baseline')) {
    if (fs.existsSync(baselinePath) && !flags.has('--force')) { console.error(`${baselinePath} exists (use --force to overwrite; prefer --tighten or --rebaseline)`); return 2; }
    const prev = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
    const b = buildBaseline(results, { generated: now, dataInfo: treeInfo, previous: prev });
    fs.writeFileSync(baselinePath, prettyJson(b));
    console.log(`wrote ${path.relative(REPO_ROOT, baselinePath)}: ${Object.keys(b.rules).length} rules with entries, ${Object.values(b.rules).reduce((a, r) => a + r.count, 0)} fingerprints`);
    return 0;
  }
  const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
  if (!baseline) { console.error(`no baseline at ${baselinePath}: run --init-baseline`); return 2; }

  if (flags.has('--tighten')) {
    const { baseline: nb, removed } = tightenBaseline(results, baseline);
    nb.history.push({ date: now, action: 'tighten', removed });
    nb.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(nb));
    console.log(`tightened: ${removed} entr${removed === 1 ? 'y' : 'ies'} removed`);
    return 0;
  }
  if (opts.rebaseline) {
    if (!opts.reason) { console.error('--rebaseline requires --reason "..."'); return 2; }
    const id = opts.rebaseline;
    const r = results.get(id);
    if (!r) { console.error(`unknown or not-run rule ${id}`); return 2; }
    const fresh = buildBaseline(new Map([[id, r]]), { generated: now, dataInfo: treeInfo, previous: baseline });
    const before = baseline.rules[id]?.count ?? 0;
    if (fresh.rules[id]) baseline.rules[id] = fresh.rules[id]; else delete baseline.rules[id];
    baseline.history.push({ date: now, action: 'rebaseline', rule: id, before, after: r.violations.length, reason: opts.reason });
    baseline.generated = now;
    fs.writeFileSync(baselinePath, prettyJson(baseline));
    console.log(`rebaselined ${id}: ${before} -> ${r.violations.length} (logged)`);
    return 0;
  }

  const judged = only ? new Map([...results].filter(([id]) => only.includes(id))) : results;
  const verdict = evaluateRatchet(judged, only ? { ...baseline, rules: Object.fromEntries(Object.entries(baseline.rules).filter(([k]) => only.includes(k))) } : baseline, { now, strict: flags.has('--strict') });

  if (opts.report) {
    const { writeBaselineReport } = await import('./lib/report.mjs');
    writeBaselineReport({ ctx, results, verdict, baseline, treeInfo, outPath: path.resolve(opts.report), now: baseline.generated });
    console.log(`wrote ${opts.report}`);
  }

  if (flags.has('--json')) {
    console.log(JSON.stringify({ pass: verdict.pass, failures: verdict.failures, warnings: verdict.warnings, rules: [...verdict.perRule.values()] }, null, 2));
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
  line(verdict.pass ? '\nPASS: no new violations, no stale or expired baseline entries.' : '\nFAIL: see failures above.');
  return verdict.pass ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('validate.mjs')) {
  main().then((code) => process.exit(code), (e) => { console.error(e); process.exit(2); });
}
