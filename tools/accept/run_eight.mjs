#!/usr/bin/env node
// tools/accept/run_eight.mjs - the END-OF-MISSION ACCEPTANCE: eight consecutive fresh clean passes against ONE unchanged candidate.
//
//   node tools/accept/run_eight.mjs --candidate deliver/gettysburg-R1c-2531699e-PRODUCTION.zip --baseline baseline/dist [--soak-seconds 600] [--full]
//        [--dry-run] [--passes 8] [--out-dir docs/accept/passes] [--port-base 8700] [any other run_pass.mjs option is passed through]
//
// Rules enforced here (docs/battle-theatre/GOVERNANCE/FINAL-ACCEPTANCE.md):
//  * passes run strictly one after the other, each a brand-new process (fresh unzip, fresh Chrome profiles, nothing cached);
//  * the candidate zip's SHA-256 is recorded before every pass and after it; if it, the harness digest, the baseline tree or the built dist of the candidate's
//    train change between passes the run ABORTS (no code or candidate change is allowed in between);
//  * the consecutive-clean counter goes to 0 on any defect (or any check that did not run) and the run STOPS at the first such pass;
//  * success is reported only after N (default 8) consecutive CLEAN passes with the full 10-minute soak; --dry-run never reports success;
//  * earlier runs are archived (docs/accept/passes/archive/<time>/) and listed in docs/accept/EIGHT-PASS-LOG.md, never overwritten silently.
import fs from 'node:fs';
import path from 'node:path';
import { REPO, parseArgs, runCmdAsync, sha256File, readJson, writeJson, mdEscape, loadText } from './lib/util.mjs';
import { harnessDigest, treeDigest } from './lib/harness_digest.mjs';

const args = parseArgs(process.argv.slice(2), { 'dry-run': 'bool', full: 'bool' });
if (!args.candidate) { console.error('usage: node tools/accept/run_eight.mjs --candidate <zip> --baseline baseline/dist [--soak-seconds 600] [--full] [--dry-run]'); process.exit(2); }
const dry = !!args['dry-run'];
const want = Number(args.passes || 8);
const soak = Number(args['soak-seconds'] || (dry ? 120 : 600));
const candidate = path.resolve(args.candidate);
if (!fs.existsSync(candidate) || !candidate.toLowerCase().endsWith('.zip')) { console.error('--candidate must be the zip that will be handed over (the hash identity is part of the acceptance)'); process.exit(2); }
if (!dry && soak < 600) { console.error('the acceptance soak is 10 minutes: --soak-seconds must be >= 600 (use --dry-run for shorter runs)'); process.exit(2); }
const outDir = path.resolve(REPO, args['out-dir'] || (dry ? 'docs/accept/dryrun' : 'docs/accept/passes'));
const logFile = path.resolve(REPO, dry ? 'docs/accept/EIGHT-PASS-LOG.dryrun.md' : 'docs/accept/EIGHT-PASS-LOG.md');
const stateFile = path.join(path.dirname(logFile), dry ? 'eight-pass-state.dryrun.json' : 'eight-pass-state.json');
const train = (/-(R\d[a-z0-9]*|S\d)-/i.exec(path.basename(candidate)) || [])[1] || null;
const baselineDir = args.baseline ? path.resolve(REPO, args.baseline) : null;

const snapshot = () => ({ zip: sha256File(candidate), harness: harnessDigest().digest, baseline: baselineDir ? treeDigest(baselineDir) : null, builtDist: train ? treeDigest(path.join(REPO, 'release', train, 'dist')) : null });
const state = fs.existsSync(stateFile) ? readJson(stateFile) : { runs: [] };

// archive the previous run's pass files
fs.mkdirSync(outDir, { recursive: true });
const old = fs.readdirSync(outDir).filter((f) => /^pass-\d+\.(json|md)$/.test(f) || /^pass-\d+-artifacts$/.test(f));
if (old.length) {
  const arch = path.join(outDir, 'archive', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(arch, { recursive: true });
  for (const f of old) fs.renameSync(path.join(outDir, f), path.join(arch, f));
}

const run = { startedAt: new Date().toISOString(), dryRun: dry, wantPasses: want, soakSeconds: soak, fullAccuracy: !!args.full, candidate: path.relative(REPO, candidate), train, passes: [], status: 'RUNNING', consecutiveClean: 0 };
const start = snapshot();
run.snapshot = start;
state.runs.unshift(run);
const save = () => { writeJson(stateFile, state); fs.writeFileSync(logFile, renderLog(state)); };
save();
console.log(`${dry ? 'DRY RUN - ' : ''}acceptance run: ${want} consecutive clean passes of ${path.basename(candidate)} sha256 ${start.zip}`);

const passthrough = [];
for (const [k, v] of Object.entries(args)) { if (['_', 'candidate', 'dry-run', 'passes', 'out-dir', 'pass'].includes(k)) continue; passthrough.push(`--${k}`); if (v !== true) passthrough.push(String(v)); }
if (!args['soak-seconds']) passthrough.push('--soak-seconds', String(soak));

let abort = null;
for (let n = 1; n <= want; n++) {
  const before = snapshot();
  for (const k of Object.keys(start)) if (before[k] !== start[k]) { abort = `${k} changed before pass ${n}: ${start[k]} -> ${before[k]}`; break; }
  if (abort) break;
  console.log(`\n######## pass ${n} of ${want} (consecutive clean so far: ${run.consecutiveClean}) ########`);
  const t0 = Date.now();
  const r = await runCmdAsync(process.execPath, ['tools/accept/run_pass.mjs', '--candidate', candidate, '--pass', String(n), '--out-dir', outDir, ...passthrough], { timeoutMs: 6 * 3600 * 1000 });
  process.stdout.write(r.stdout.split('\n').filter((l) => /^===|^    ->|^PASS|^written/.test(l)).join('\n') + '\n');
  const pj = path.join(outDir, `pass-${n}.json`);
  let rec = { n, exit: r.exit, seconds: Math.round((Date.now() - t0) / 1000), load1Start: r.load1Start ?? null, load1End: r.load1End ?? null, verdict: 'NO RESULT', defects: null, notRun: null };   // load1*: the machine's 1-minute load average when the pass started and ended (null on Windows)
  if (fs.existsSync(pj)) {
    const j = readJson(pj);
    rec = { ...rec, verdict: j.verdict, zipSha256: j.candidate.sha256, harness: j.harness.digest, soakSeconds: j.env.soakSeconds, defects: j.checks.reduce((a, c) => a + c.defectCount, 0), notRun: j.checks.filter((c) => c.status !== 'RAN' || (c.notRunParts || []).length).map((c) => `${c.id} ${c.title}`), perCheck: j.checks.map((c) => ({ id: c.id, title: c.title, status: c.status, defects: c.defectCount, partial: (c.notRunParts || []).length })), file: path.relative(REPO, pj), firstDefects: j.checks.flatMap((c) => c.defects.slice(0, 3).map((d) => `[${c.id}] ${d.code} @ ${d.where}: ${d.detail.slice(0, 160)}`)).slice(0, 12) };
  }
  const after = snapshot();
  for (const k of Object.keys(start)) if (after[k] !== start[k]) abort = `${k} changed DURING pass ${n}: ${start[k]} -> ${after[k]}`;
  if (rec.zipSha256 && rec.zipSha256 !== start.zip) abort = `pass ${n} recorded zip ${rec.zipSha256}, expected ${start.zip}`;
  run.passes.push(rec);
  if (abort) break;
  if (rec.verdict === 'CLEAN' && (dry || rec.soakSeconds >= 600)) { run.consecutiveClean++; console.log(`pass ${n}: CLEAN (${run.consecutiveClean} consecutive)`); }
  else { console.log(`pass ${n}: ${rec.verdict} - the consecutive counter resets to 0 and the run stops. ${rec.defects ?? '?'} defect(s); not-run: ${(rec.notRun || []).join('; ') || 'none'}`); run.consecutiveClean = 0; run.stoppedAt = n; break; }
  save();
}
run.finishedAt = new Date().toISOString();
if (abort) { run.status = 'ABORTED'; run.abortReason = abort; run.consecutiveClean = 0; }
else if (run.stoppedAt) run.status = 'DEFECT FOUND (counter reset to 0)';
else if (run.consecutiveClean >= want && !dry) run.status = `ACCEPTED: ${want} consecutive clean passes`;
else if (run.consecutiveClean >= want && dry) run.status = `DRY RUN COMPLETE: ${want} clean passes, does NOT count (short soak / dry run)`;
else run.status = 'INCOMPLETE';
save();
console.log(`\n${run.status}${run.abortReason ? ': ' + run.abortReason : ''}\nlog: ${path.relative(REPO, logFile)}`);
process.exit(run.status.startsWith('ACCEPTED') ? 0 : 1);

function renderLog(st) {
  const L = [];
  L.push(dry ? '# Eight-pass log (DRY RUN - nothing here counts toward the acceptance)' : '# Eight-pass log: end-of-mission acceptance', '');
  L.push('Rule (owner, FINAL-ACCEPTANCE.md): eight CONSECUTIVE fresh clean passes; any defect resets the count to 0; no code or candidate change in between. This file is written by `tools/accept/run_eight.mjs` only; it reports success only if the latest run below says ACCEPTED.', '');
  const latest = st.runs[0];
  L.push(`## Status: ${latest ? latest.status : 'no run yet'}`, '');
  if (latest) L.push(`Consecutive clean passes in the latest run: **${latest.consecutiveClean} of ${latest.wantPasses}**.`, '');
  for (const r of st.runs) {
    L.push(`### Run started ${r.startedAt}${r.dryRun ? ' (dry run)' : ''}`, '', `- Candidate: \`${r.candidate}\`, SHA-256 \`${r.snapshot.zip}\``, `- Harness digest \`${r.snapshot.harness}\`; baseline tree \`${r.snapshot.baseline}\`; built dist of ${r.train || '?'} \`${r.snapshot.builtDist}\``, `- Soak ${r.soakSeconds} s; accuracy ${r.fullAccuracy ? 'FULL run_suites' : 'fast subset (accuracy_subset.json)'}`, `- Result: **${r.status}**${r.abortReason ? ' - ' + r.abortReason : ''}${r.finishedAt ? ` (finished ${r.finishedAt})` : ''}`, '');
    L.push('| pass | verdict | defects | checks not (fully) run | seconds | detail |', '|---|---|---|---|---|---|');
    for (const p of r.passes) L.push(`| ${p.n} | ${p.verdict} | ${p.defects ?? '?'} | ${mdEscape((p.notRun || []).join('; ') || 'none')} | ${p.seconds} | ${p.file ? `\`${p.file}\`` : ''} |`);
    L.push('');
    // runs recorded before the load was measured (and runs on Windows, which has no load average) have no such line
    const loads = r.passes.filter((p) => p.load1Start != null || p.load1End != null);
    if (loads.length) L.push(`Load average (1 min) of the machine at the start > end of each pass: ${loads.map((p) => `pass ${p.n} ${loadText(p.load1Start, p.load1End)}`).join('; ')}.`, '');
    const bad = r.passes.find((p) => p.verdict !== 'CLEAN');
    if (bad && bad.firstDefects && bad.firstDefects.length) { L.push(`First defects of pass ${bad.n}:`, ''); for (const d of bad.firstDefects) L.push(`- ${mdEscape(d)}`); L.push(''); }
  }
  L.push('## What this acceptance does NOT cover', '', '- Real devices (iOS/WebKit, Android Chrome, Samsung Internet), real touch hardware, dvh/safe-area insets, notches, keyboards.', '- Safari and Firefox (only Chrome, the system build recorded in each pass, headless, with software or whatever GPU the host has).', '- Lighthouse CI proper (scores, throttled network, mobile emulation profile); the vitals here are measured with the Performance API on a local server.', '- Netlify edge behaviour: only the generated `_headers`/`_redirects` are emulated; compression, CDN caching and header merging are not.', '- A screen reader, real users, or anything after publication.', '- External links and third-party services (Google, NPS, Mapbox outside the capped side channel) are not exercised for correctness.', '- The accuracy check runs the fast subset unless `--full`: see `tools/accept/accuracy_subset.json` for what was left out and why.', '');
  return L.join('\n');
}
