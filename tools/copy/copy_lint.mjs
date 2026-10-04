#!/usr/bin/env node
// copy_lint: dependency-free linter for the words a visitor reads (HTML, inline and bundled JS string literals, JSON data,
// Markdown/text). Rules come from docs/content/STYLEGUIDE.md; the ratchet baseline works like tools/data/baseline.json.
//
//   node tools/copy/copy_lint.mjs                          lint baseline/dist against tools/copy/baseline.json (exit 1 on new/stale/expired)
//   node tools/copy/copy_lint.mjs DIR|FILE... --no-baseline   strict: every finding fails (candidate pages, the guide)
//   --rules DASH,TICK      only these rules (the ratchet judges them only; an unknown id exits 2)
//   --strict               warning rules (W) fail too
//   --init-baseline        write the baseline from today's findings (refuses to overwrite; --force)
//   --tighten              delete baseline entries that no longer occur (never adds)
//   --rebaseline RULE --reason "why"      replace one rule's baseline with today's findings (logged)
//   --renew RULE --until YYYY-MM-DD --reason "why"   move one rule's expiry (logged; at most 366 days ahead)
//   --report FILE.md       write the counts-by-rule report;  --json  machine output;  -v  list every finding
//   options: --root DIR (path keys are relative to it)  --baseline FILE  --now YYYY-MM-DD  --facts FILE|none  --examples N
// Exit codes: 0 pass, 1 findings fail the run, 2 usage or unreadable input.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { REPO, RULES, makeEnv, lintTree, lintSource, walk, posix, countBy, wanted } from './lib/lint.mjs';
import { buildBaseline, evaluateRatchet, tightenBaseline, parseIso, groupFindings } from './lib/ratchet.mjs';

export const DEFAULT_BASELINE = path.join(REPO, 'tools', 'copy', 'baseline.json');
const DEFAULT_TARGET = 'baseline/dist';
// Known violations are debt with a due date. Mechanical text rules are due before the identity train (S2), data-text rules with the data pack.
export const EXPIRIES = {
  default: '2027-03-31',
  DASH: '2027-03-31', TICK: '2026-12-31', UNDEFINED: '2026-12-31', TODO: '2026-12-31', ALIAS: '2026-12-31', IDLEAK: '2027-03-31', DEVLOG: '2026-12-31', AIPERSONA: '2026-12-31',
  COUNT: '2026-12-31', QUOTES: '2027-03-31', NAME: '2026-12-31', TIMEFMT: '2027-03-31', REALTIME: '2026-12-31', CASUALTY: '2027-03-31', EMOJI: '2026-12-31', WE: '2026-12-31', PERSONAL_EMAIL: '2026-12-31', CLAIM: '2026-12-31',
};

const VALUE_OPTS = new Set(['--root', '--baseline', '--now', '--facts', '--rules', '--rebaseline', '--renew', '--until', '--reason', '--report', '--examples']);
export function parseArgs(argv) {
  const opts = {}; const flags = new Set(); const paths = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) { if (VALUE_OPTS.has(a)) opts[a.slice(2)] = argv[++i]; else flags.add(a); } else if (a === '-v') flags.add('-v'); else paths.push(a);
  }
  return { opts, flags, paths };
}

const prettyJson = (o) => JSON.stringify(o, null, 1) + '\n';
const isoToday = () => new Date().toISOString().slice(0, 10);

function summaryTable(findings, perRule) {
  const byRule = countBy(findings, 'rule');
  const rows = RULES.map((r) => ({ id: r.id, sev: r.sev, count: byRule[r.id] || 0, files: new Set(findings.filter((f) => f.rule === r.id).map((f) => f.file)).size, title: r.title, p: perRule?.get(r.id) }));
  return rows;
}

export function main(argv = process.argv.slice(2), { log = console.log, err = console.error } = {}) {
  const { opts, flags, paths } = parseArgs(argv);
  const now = opts.now ?? isoToday();
  if (parseIso(now) === null) { err(`--now must be YYYY-MM-DD, got ${JSON.stringify(opts.now)}`); return 2; }
  const only = opts.rules ? new Set(opts.rules.split(',').map((s) => s.trim()).filter(Boolean)) : null;
  if (only) for (const id of only) if (!RULES.some((r) => r.id === id)) { err(`unknown rule ${id}; known: ${RULES.map((r) => r.id).join(', ')}`); return 2; }
  const strict = flags.has('--strict');
  const noBaseline = flags.has('--no-baseline');
  const baselinePath = opts.baseline ? path.resolve(opts.baseline) : DEFAULT_BASELINE;

  // ---- targets
  const targets = (paths.length ? paths : [DEFAULT_TARGET]).map((p) => path.resolve(p));
  for (const t of targets) if (!fs.existsSync(t)) { err(`no such path: ${t}`); return 2; }
  const root = opts.root ? path.resolve(opts.root) : (targets.length === 1 && fs.statSync(targets[0]).isDirectory() ? targets[0] : REPO);
  const rootRel = posix(path.relative(REPO, root)) || '.';

  let env;
  try { env = makeEnv({ root: REPO, factsPath: opts.facts ? (opts.facts === 'none' ? 'none' : path.resolve(opts.facts)) : null, only }); } catch (e) { err(`cannot read the configuration under tools/copy: ${e.message}`); return 2; }

  // ---- run
  const findings = []; const notes = []; let suppressed = 0; let strings = 0; let fileCount = 0;
  for (const t of targets) {
    if (fs.statSync(t).isDirectory()) {
      const rels = walk(t).map((r) => posix(path.relative(root, path.join(t, r))));
      const r = lintTree(root, { env, files: rels });
      findings.push(...r.findings); notes.push(...r.notes); suppressed += r.suppressed; strings += r.strings; fileCount += r.files;
    } else {
      const rel = posix(path.relative(root, t));
      if (!wanted(rel, env.scan)) { fileCount += 0; continue; }
      const r = lintSource(rel, fs.readFileSync(t, 'utf8'), env);
      findings.push(...r.findings); notes.push(...r.notes.map((n) => `${rel}: ${n}`)); suppressed += r.suppressed; strings += r.strings; fileCount++;
    }
  }

  // ---- baseline maintenance commands
  const target = { root: rootRel, files: fileCount };
  const writeBaseline = (b, msg) => { fs.writeFileSync(baselinePath, prettyJson(b)); log(msg); };
  const loadBaseline = () => { try { return JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch (e) { err(`cannot read the baseline ${baselinePath}: ${e.message}`); return null; } };
  if (flags.has('--init-baseline')) {
    if (only) { err('--init-baseline judges every rule: it cannot be combined with --rules'); return 2; }
    if (fs.existsSync(baselinePath) && !flags.has('--force')) { err(`${baselinePath} exists (use --force to overwrite; prefer --tighten or --rebaseline)`); return 2; }
    const prev = fs.existsSync(baselinePath) ? loadBaseline() : null;
    let b;
    try { b = buildBaseline(findings, { generated: now, target, ruleDefs: RULES, expiries: EXPIRIES, previous: prev }); } catch (e) { err(e.message); return 2; }
    b.history.push({ date: now, action: 'init-baseline', forced: Boolean(prev), findings: findings.length });
    writeBaseline(b, `wrote ${path.relative(REPO, baselinePath)}: ${Object.keys(b.rules).length} rules, ${findings.length} fingerprints for ${rootRel}`);
    return 0;
  }
  if (flags.has('--tighten') || opts.rebaseline || opts.renew) {
    const base = loadBaseline(); if (!base) return 2;
    if (base.target?.root !== rootRel) { err(`the baseline is for ${base.target?.root}, this run targets ${rootRel}`); return 2; }
    if (flags.has('--tighten')) {
      const { baseline: nb, removed } = tightenBaseline(findings, base, { ruleDefs: RULES, only });
      nb.history.push({ date: now, action: 'tighten', removed });
      writeBaseline(nb, `tightened: ${removed} stale fingerprint(s) deleted`);
      return 0;
    }
    if (opts.rebaseline) {
      if (!opts.reason) { err('--rebaseline needs --reason "why"'); return 2; }
      const id = opts.rebaseline; if (!RULES.some((r) => r.id === id)) { err(`unknown rule ${id}`); return 2; }
      const only1 = findings.filter((f) => f.rule === id);
      const fresh = buildBaseline(only1, { generated: now, target, ruleDefs: RULES, expiries: EXPIRIES, previous: base });
      const before = base.rules[id]?.count ?? 0;
      if (fresh.rules[id]) base.rules[id] = fresh.rules[id]; else delete base.rules[id];
      base.history.push({ date: now, action: 'rebaseline', rule: id, before, after: only1.length, reason: opts.reason });
      writeBaseline(base, `rebaselined ${id}: ${before} -> ${only1.length}`);
      return 0;
    }
    if (opts.renew) {
      const id = opts.renew; const until = opts.until;
      if (!base.rules[id]) { err(`${id} has no baseline entry`); return 2; }
      if (!opts.reason) { err('--renew needs --reason "why"'); return 2; }
      if (parseIso(until) === null) { err('--until must be YYYY-MM-DD'); return 2; }
      if ((parseIso(until) - parseIso(now)) / 86400000 > 366) { err('--until may be at most 366 days ahead'); return 2; }
      base.history.push({ date: now, action: 'renew', rule: id, from: base.rules[id].expires, to: until, reason: opts.reason });
      base.rules[id].expires = until;
      writeBaseline(base, `renewed ${id} until ${until}`);
      return 0;
    }
  }

  // ---- judge
  let verdict = null;
  if (!noBaseline) {
    const base = loadBaseline();
    if (!base) { err('no baseline: run with --init-baseline, or use --no-baseline for strict mode'); return 2; }
    if (base.target?.root !== rootRel) { err(`the baseline at ${path.relative(REPO, baselinePath)} is for ${base.target?.root}; this run targets ${rootRel}. Use --baseline FILE or --no-baseline (strict).`); return 2; }
    verdict = evaluateRatchet(findings, base, { now, strict, ruleDefs: RULES, only });
  } else {
    const failing = findings.filter((f) => (strict ? true : f.sev === 'E') && (!only || only.has(f.rule)));
    verdict = { pass: failing.length === 0, failures: failing.length ? [{ type: 'findings', count: failing.length, message: `${failing.length} finding(s) with --no-baseline` }] : [], warnings: [], perRule: new Map() };
  }

  const table = summaryTable(findings, verdict.perRule);
  if (flags.has('--json')) {
    log(JSON.stringify({ target, now, facts: env.factsSource, strings, suppressed, notes, counts: Object.fromEntries(table.map((r) => [r.id, r.count])), pass: verdict.pass, failures: verdict.failures.map((f) => ({ ...f, items: undefined })), findings: flags.has('-v') ? findings : undefined }, null, 1));
  } else {
    log(`copy_lint: ${rootRel} (${fileCount} files, ${strings.toLocaleString('en-US')} strings, facts: ${env.factsSource})`);
    for (const n of notes) log(`  note: ${n}`);
    log('rule'.padEnd(15) + 'sev  ' + 'count'.padStart(7) + 'files'.padStart(7) + (noBaseline ? '' : 'baseline'.padStart(10) + 'new'.padStart(6) + 'stale'.padStart(7)) + '  title');
    for (const r of table) {
      if (only && !only.has(r.id)) continue;
      log(r.id.padEnd(15) + r.sev.padEnd(5) + String(r.count).padStart(7) + String(r.files).padStart(7) + (noBaseline ? '' : String(r.p?.baseline ?? 0).padStart(10) + String(r.p?.new ?? 0).padStart(6) + String(r.p?.stale ?? 0).padStart(7)) + '  ' + r.title);
    }
    log(`total ${findings.length} finding(s)${suppressed ? `, ${suppressed} suppressed by copy-lint-disable` : ''}`);
    const ex = Number(opts.examples ?? (flags.has('-v') ? 1e9 : 0));
    if (ex > 0) {
      const shown = {};
      for (const f of findings) { shown[f.rule] = (shown[f.rule] || 0) + 1; if (shown[f.rule] <= ex) log(`  ${f.rule} ${f.file}:${f.line || f.where} "${f.match}"${f.detail ? ' ' + f.detail : ''}`); }
    }
    for (const f of verdict.failures) log(`FAIL ${f.rule ?? ''} ${f.type}: ${f.message}`);
    for (const f of verdict.warnings) log(`warn ${f.rule} ${f.type}: ${f.message}`);
    if (!noBaseline) for (const r of verdict.perRule.values()) if (r.expires && r.count) { const days = Math.round((parseIso(r.expires) - parseIso(now)) / 86400000); if (days <= 30 && days >= 0) log(`WARNING ${r.id} baseline expires ${r.expires} (${days} day(s))`); }
    log(verdict.pass ? 'PASS' : 'FAIL');
  }
  if (opts.report) { fs.writeFileSync(path.resolve(opts.report), renderReport({ rootRel, now, fileCount, strings, env, findings, table, notes, suppressed, examples: Number(opts.examples ?? 3) })); }
  return verdict.pass ? 0 : 1;
}

export function renderReport({ rootRel, now, fileCount, strings, env, findings, table, notes, suppressed, examples = 3 }) {
  const lines = [];
  lines.push(`# copy_lint report: ${rootRel}`, '', `Generated ${now} by \`node tools/copy/copy_lint.mjs ${rootRel} --report\`. ${fileCount} files, ${strings.toLocaleString('en-US')} user-facing strings, facts from \`${env.factsSource}\` (${env.factsNote}).`, '');
  if (notes.length) lines.push(...notes.map((n) => `- note: ${n}`), '');
  lines.push('| Rule | Sev | Findings | Files | What it catches |', '|---|---|---:|---:|---|');
  for (const r of table) lines.push(`| ${r.id} | ${r.sev} | ${r.count.toLocaleString('en-US')} | ${r.files} | ${r.title} |`);
  lines.push(`| **Total** | | **${findings.length.toLocaleString('en-US')}** | | ${suppressed ? `${suppressed} more suppressed by copy-lint-disable` : ''} |`, '');
  const kinds = countBy(findings, 'kind');
  lines.push('By string kind: ' + Object.entries(kinds).sort().map(([k, v]) => `${k} ${v.toLocaleString('en-US')}`).join(', '), '');
  lines.push('## Examples', '');
  for (const r of table) {
    if (!r.count) continue;
    lines.push(`### ${r.id}: ${r.title}`);
    const ex = findings.filter((f) => f.rule === r.id).slice(0, examples);
    for (const f of ex) lines.push(`- \`${f.file}${f.line ? ':' + f.line : f.where ? ' ' + f.where : ''}\`: \`${f.match.replace(/`/g, "'")}\`${f.detail ? ' (' + f.detail.replace(/`/g, "'") + ')' : ''}`);
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exit(main());
