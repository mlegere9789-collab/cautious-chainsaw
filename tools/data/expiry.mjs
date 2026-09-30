#!/usr/bin/env node
// The explicit expiry gate for tools/data/baseline.json (run it in CI next to `npm run data:check`).
//
//   node tools/data/expiry.mjs [--baseline FILE] [--now YYYY-MM-DD] [--warn-days 30] [--json]
//
// Known violations are debt with a due date. This prints every baselined rule with its date and the days left, then:
//   exit 0  nothing expired. Entries within --warn-days (default 30) of their date are listed as WARNING (and as GitHub annotations under Actions).
//   exit 1  at least one baseline entry is past its date and still has violations (the day AFTER `expires`), or has no usable date.
//   exit 2  usage error / unreadable baseline / a clock that is not a calendar date.
// `node tools/data/validate.mjs` (and so `npm run data:check`) does not depend on the date: it prints the same report but never fails on it.
// Renew with: node tools/data/validate.mjs --renew RULE --until YYYY-MM-DD --reason "..."   (logged in baseline.history, at most 366 days ahead).
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, isoDate, isMainModule } from './lib/util.mjs';
import { parseIsoDate, expiryReport, renderExpiryReport, githubAnnotations, EXPIRY_WARN_DAYS } from './lib/expiry.mjs';

export function main(argv = process.argv.slice(2), { log = console.log, err = console.error, env = process.env } = {}) {
  const opt = {}; const flags = new Set();
  for (let i = 0; i < argv.length; i++) { if (['--baseline', '--now', '--warn-days'].includes(argv[i])) opt[argv[i].slice(2)] = argv[++i]; else flags.add(argv[i]); }
  const now = opt.now ?? isoDate();
  if (parseIsoDate(now) === null) { err(`--now must be a calendar date YYYY-MM-DD, got ${JSON.stringify(now)}`); return 2; }
  const warnDays = opt['warn-days'] === undefined ? EXPIRY_WARN_DAYS : Number(opt['warn-days']);
  if (!Number.isInteger(warnDays) || warnDays < 0 || warnDays > 366) { err(`--warn-days must be an integer 0..366, got ${JSON.stringify(opt['warn-days'])}`); return 2; }
  const file = opt.baseline ? path.resolve(opt.baseline) : path.join(REPO_ROOT, 'tools', 'data', 'baseline.json');
  let baseline;
  try { baseline = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err(`cannot read the baseline ${file}: ${e.message}`); return 2; }
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline.rules) || typeof baseline.rules !== 'object' || baseline.rules === null) { err(`${file} has no "rules" object`); return 2; }
  const rep = expiryReport(baseline, { now, warnDays });
  if (flags.has('--json')) log(JSON.stringify(rep, null, 2));
  else {
    for (const l of renderExpiryReport(rep, { detail: true, renew: 'node tools/data/validate.mjs --renew RULE --until YYYY-MM-DD --reason "..."' })) log(l);
    if (env.GITHUB_ACTIONS === 'true') for (const l of githubAnnotations(rep)) log(l);
    log(rep.expired.length || rep.invalid.length ? `\nFAIL: ${rep.expired.length} expired, ${rep.invalid.length} without a usable date` : `\nPASS: nothing expired${rep.warning.length ? ` (${rep.warning.length} within ${warnDays} days: see WARNING above)` : ''}`);
  }
  return rep.expired.length || rep.invalid.length ? 1 : 0;
}

if (isMainModule(import.meta.url)) process.exit(main());
