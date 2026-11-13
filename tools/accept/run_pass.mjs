#!/usr/bin/env node
// tools/accept/run_pass.mjs - ONE fresh acceptance pass (docs/battle-theatre/GOVERNANCE/FINAL-ACCEPTANCE.md).
//
//   node tools/accept/run_pass.mjs --candidate deliver/gettysburg-R1c-2531699e-PRODUCTION.zip --pass 1 --baseline baseline/dist
//        [--out-dir docs/accept/passes] [--only 1,2,3] [--soak-seconds 600] [--full] [--port-base 8700] [--tile-cap 600]
//        [--repack auto|none|<train>] [--expect-sha <sha256>] [--prev-sha <sha256>] [--keep-scratch] [--shots] [--cpu-throttle 1]
//
// Fresh means: the candidate is unzipped into a brand-new temp directory, served from there, every Chrome session uses a brand-new profile directory
// (no cache, no storage), and nothing from another pass is read except the zip hash of the previous pass (check 1).  Output: <out-dir>/pass-N.json and pass-N.md.
// Exit code: 0 CLEAN (all 8 checks ran, zero defects), 1 DEFECTS, 3 INCOMPLETE (a check did not run or --only was used).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { REPO, ACCEPT, parseArgs, freshTmp, extractZip, sha256File, walk, writeJson, readJson, loadThresholds, runCmd, sha256, mdEscape, Check, load1, loadText } from './lib/util.mjs';
import { startNetlifyServer } from './lib/netlify_server.mjs';
import { initLib, Sessions } from './lib/browser.mjs';
import { harnessDigest } from './lib/harness_digest.mjs';

const args = parseArgs(process.argv.slice(2), { full: 'bool', 'keep-scratch': 'bool', shots: 'bool' });
const require = createRequire(import.meta.url);
const N = Number(args.pass || 1);
if (!args.candidate) { console.error('usage: node tools/accept/run_pass.mjs --candidate <zip|dist-dir> --pass N [--baseline baseline/dist] (see header of this file)'); process.exit(2); }
const candidatePath = path.resolve(args.candidate);
const outDir = path.resolve(REPO, args['out-dir'] || 'docs/accept/passes');
const only = args.only ? String(args.only).split(',').map((s) => s.trim()) : null;
const thresholds = loadThresholds();
const portBase = Number(args['port-base'] || 8700);
const tileCap = Number(args['tile-cap'] || thresholds.setup.tileCapPerRun);
const soakSeconds = Number(args['soak-seconds'] || 120);

export const CHECKS = [
  ['1', 'c1_hash', 'Deterministic zip (hash equals the previous pass)'],
  ['2', 'c2_hygiene', 'Static hygiene'],
  ['3', 'c3_regression', 'Regression against the published build'],
  ['4', 'c4_input', 'Input matrix (desktop + phone)'],
  ['5', 'c5_perf', 'Performance'],
  ['6', 'c6_accuracy', 'Accuracy (verify_release + test subset)'],
  ['7', 'c7_visual', 'Visual QA at six widths'],
  ['8', 'c8_copy', 'Copy audit'],
];

const gitHead = () => { const r = runCmd('git', ['rev-parse', 'HEAD'], { timeoutMs: 10000 }); return r.exit === 0 ? r.stdout.trim() : null; };

async function main() {
  const startedAt = new Date().toISOString();
  const passLoadStart = load1();          // 1-minute load average of the machine (null on Windows); also recorded around every check: a timing result is only evidence with its load
  const scratch = freshTmp(`accept-pass${N}`);
  const distDir = path.join(scratch, 'dist');
  const isZip = fs.statSync(candidatePath).isFile();
  let extraction = null; let candidateSha = null; let candidateSize = null;
  if (isZip) {
    candidateSha = sha256File(candidatePath); candidateSize = fs.statSync(candidatePath).size;
    extraction = extractZip(candidatePath, distDir);
  } else {
    fs.cpSync(candidatePath, distDir, { recursive: true });
  }
  const files = walk(distDir);
  const treeSha = sha256(files.map((f) => `${f} ${sha256File(path.join(distDir, f))}`).join('\n'));
  const baselineDir = args.baseline ? path.resolve(REPO, args.baseline) : null;

  // routes of the candidate
  const routes = [];
  for (const f of files.filter((x) => x.endsWith('.html') && !x.includes('/') && !/^google[0-9a-f]+\.html$/.test(x))) {
    const html = fs.readFileSync(path.join(distDir, f), 'utf8');
    const name = f.replace(/\.html$/, '');
    const r = { file: f, path: name === 'index' ? '/' : '/' + name, url: name === 'index' ? '/' : '/' + name, app: name === 'index', hasMapbox: /mapbox-gl|mapboxgl/i.test(html) };
    if (name === '404') { r.url = '/this-page-does-not-exist-acceptance'; r.expectStatus = 404; }
    routes.push(r);
  }

  const partial = !!args.routes;
  if (args.routes) { const keep = String(args.routes).split(','); for (let i = routes.length - 1; i >= 0; i--) if (!keep.some((k) => k === routes[i].path || k === routes[i].path.slice(1) || (routes[i].app && /^(index|app)$/.test(k)))) routes.splice(i, 1); }
  const lib = await initLib({ scratchRoot: scratch, portBase, tileCap });
  const cand = await startNetlifyServer({ root: distDir, port: portBase });
  const base = baselineDir && fs.existsSync(baselineDir) ? await lib.createStaticServer({ root: baselineDir, port: portBase + 1 }) : null;
  const sessions = new Sessions(lib, portBase);
  const ctx = { args, N, scratch, dist: distDir, files, routes, treeSha, thresholds, lib, sessions, cand, base, baselineDir, outDir, soakSeconds, portBase, candidate: { path: candidatePath, isZip, sha256: candidateSha, size: candidateSize, extraction }, repoRoot: REPO, artDir: path.join(outDir, `pass-${N}-artifacts`) };
  fs.mkdirSync(ctx.artDir, { recursive: true });

  const results = [];
  for (const [id, mod, title] of CHECKS) {
    if (only && !only.includes(id)) continue;
    const t0 = Date.now(), checkLoadStart = load1();
    console.log(`\n=== pass ${N}: check ${id} - ${title}`);
    let c;
    try { c = await (await import(`./checks/${mod}.mjs`)).run(ctx); }
    catch (e) { c = new Check(id, title); c.notRun(`harness error (the check did not finish): ${e && e.stack ? e.stack.split('\n').slice(0, 5).join(' | ') : e}`); c.finish(); }
    c.id = id; c.title = title; c.ms = Date.now() - t0; c.load1Start = checkLoadStart; c.load1End = load1();
    const ld = loadText(c.load1Start, c.load1End);
    console.log(`    -> ${c.status}${(c.notRunParts || []).length ? ' (PARTIAL: ' + c.notRunParts.length + ' part(s) not run)' : ''}${c.reason ? ' (' + c.reason.slice(0, 160) + ')' : ''}; defects: ${c.defects.length}; notes: ${c.notes.length}; ${(c.ms / 1000).toFixed(1)} s${ld ? `; load ${ld}` : ''}`);
    results.push(c);
    await sessions.closeAll();
  }

  const complete = !only && !partial && results.length === CHECKS.length && results.every((c) => c.status === 'RAN' && !(c.notRunParts || []).length);
  const defects = results.reduce((a, c) => a + c.defects.length, 0);
  const verdict = !complete ? (defects ? 'DEFECTS (incomplete)' : 'INCOMPLETE') : defects ? 'DEFECTS' : 'CLEAN';

  const chromeVer = results.map((c) => c.metrics && c.metrics.chrome).find(Boolean) || null;
  const env = {
    node: process.version, python: (runCmd('python', ['--version'], { timeoutMs: 10000 }).stdout || '').trim(), chrome: chromeVer, os: `${os.type()} ${os.release()} ${os.arch()}`,
    playwrightCore: require(path.join(REPO, 'node_modules/playwright-core/package.json')).version, axeCore: require(path.join(REPO, 'node_modules/axe-core/package.json')).version,
    cpus: os.cpus().length, cpuModel: os.cpus()[0] && os.cpus()[0].model, memGB: Math.round(os.totalmem() / 1e9), gitHead: gitHead(),
    portBase, tileCap, tilesUsed: lib.tileBudget.used, mapboxMapLoadsSkus: sessions.allSkus.size, tilesCapBlocked: lib.tileBudget.blocked, soakSeconds, serverHeadersApplied: cand.applied,
    load1Start: passLoadStart, load1End: load1(),
  };
  const out = {
    pass: N, verdict, startedAt, finishedAt: new Date().toISOString(), args: { ...args }, harness: harnessDigest(), countsTowardAcceptance: verdict === 'CLEAN' && soakSeconds >= 600, env,
    candidate: { path: path.relative(REPO, candidatePath), kind: isZip ? 'zip' : 'dir', sha256: candidateSha, bytes: candidateSize, files: files.length, treeSha256: treeSha, zipComment: extraction ? extraction.zip.comment : null },
    baseline: baselineDir ? path.relative(REPO, baselineDir) : null, thresholds, routes: routes.map((r) => r.path),
    checks: results.map((c) => ({ id: c.id, title: c.title, status: c.status, reason: c.reason, defectCount: c.defects.length, noteCount: c.notes.length, notRunParts: c.notRunParts || [], ms: c.ms, load1Start: c.load1Start ?? null, load1End: c.load1End ?? null, started: c.started, finished: c.finished, commands: c.commands, metrics: c.metrics, defects: c.defects, notes: c.notes, raw: c.raw })),
  };
  fs.mkdirSync(outDir, { recursive: true });
  writeJson(path.join(outDir, `pass-${N}.json`), out);
  fs.writeFileSync(path.join(outDir, `pass-${N}.md`), renderMd(out));
  console.log(`\nPASS ${N}: ${verdict}   (${defects} defects; ${results.filter((c) => c.status !== 'RAN').length} checks not run)`);
  console.log(`written: ${path.relative(REPO, path.join(outDir, `pass-${N}.json`))}, pass-${N}.md`);

  await sessions.closeAll();
  await cand.close().catch(() => {}); if (base) await base.close().catch(() => {});
  if (!args['keep-scratch']) { try { fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 }); } catch { /* chrome profile still locked: harmless temp dir */ } }
  process.exitCode = verdict === 'CLEAN' ? 0 : verdict.startsWith('DEFECTS') ? 1 : 3;
  setTimeout(() => process.exit(process.exitCode), 500);
}

function renderMd(o) {
  const L = [];
  L.push(`# Acceptance pass ${o.pass}: ${o.verdict}`, '');
  L.push(`Started ${o.startedAt}, finished ${o.finishedAt}.`, '');
  L.push('| | |', '|---|---|');
  L.push(`| Candidate | \`${o.candidate.path}\` (${o.candidate.kind}) |`, `| Candidate SHA-256 | \`${o.candidate.sha256 || '(directory)'}\` |`, `| Tree digest (sha256 of path+hash list) | \`${o.candidate.treeSha256}\` |`, `| Files | ${o.candidate.files} |`);
  L.push(`| Baseline (published build) | \`${o.baseline || 'NOT GIVEN'}\` |`, `| Harness digest | \`${o.harness.digest}\` (${o.harness.files} files) |`);
  L.push(`| Node / Python | ${o.env.node} / ${o.env.python} |`, `| Chrome | ${o.env.chrome || 'n/a'} |`, `| Playwright-core / axe-core | ${o.env.playwrightCore} / ${o.env.axeCore} |`, `| OS / CPU | ${o.env.os}; ${o.env.cpus} x ${o.env.cpuModel}; ${o.env.memGB} GB |`, `| Repo HEAD | ${o.env.gitHead} |`, `| Mapbox tile requests | ${o.env.tilesUsed} of cap ${o.env.tileCap} (cap-blocked ${o.env.tilesCapBlocked}) |`, `| Soak | ${o.env.soakSeconds} s |`,
    `| Load average (1 min) | ${o.env.load1Start == null && o.env.load1End == null ? 'not available on this platform' : `${o.env.load1Start ?? '?'} at the start, ${o.env.load1End ?? '?'} at the end of the pass`} |`, '');
  L.push('A pass is CLEAN only if all eight checks RAN and found zero defects. A check that did not run is never a pass.', '');
  L.push('## Summary', '', '| # | Check | Status | Defects | Notes | Time | Load (1 min) start > end |', '|---|---|---|---|---|---|---|');
  for (const c of o.checks) L.push(`| ${c.id} | ${c.title} | ${c.status === 'RAN' ? ((c.notRunParts || []).length ? 'PARTIAL (parts NOT RUN)' : c.defectCount ? 'RAN, DEFECTS' : 'RAN, clean') : 'NOT RUN'} | ${c.defectCount} | ${c.noteCount} | ${(c.ms / 1000).toFixed(0)} s | ${loadText(c.load1Start, c.load1End) || 'n/a'} |`);
  L.push('');
  for (const c of o.checks) {
    L.push(`## Check ${c.id}: ${c.title}`, '', `Status: **${c.status}**${c.reason ? ` - ${c.reason}` : ''}. Defects: ${c.defectCount}. Notes: ${c.noteCount}.`, '');
    if ((c.notRunParts || []).length) { L.push('**Parts of this check that did NOT run (a pass cannot be clean with these):**', ''); for (const p of c.notRunParts) L.push(`- ${mdEscape(p)}`); L.push(''); }
    if (c.commands && c.commands.length) { L.push('Commands:', ''); for (const cm of c.commands) L.push(`- \`${cm.cmd}\` -> exit ${cm.exit} in ${(cm.ms / 1000).toFixed(1)} s${loadText(cm.load1Start, cm.load1End) ? `, load ${loadText(cm.load1Start, cm.load1End)}` : ''}${cm.note ? ' (' + cm.note + ')' : ''}`); L.push(''); }
    if (c.metrics && Object.keys(c.metrics).length) { L.push('Metrics:', '', '```json', JSON.stringify(c.metrics, null, 1).slice(0, 6000), '```', ''); }
    if (c.defects.length) {
      const byCode = {}; for (const d of c.defects) byCode[d.code] = (byCode[d.code] || 0) + 1;
      L.push('Defects by code: ' + Object.entries(byCode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} x${v}`).join(', '), '', '| code | where | detail |', '|---|---|---|');
      for (const d of c.defects.slice(0, 120)) L.push(`| ${mdEscape(d.code)} | ${mdEscape(d.where)} | ${mdEscape(d.detail).slice(0, 300)} |`);
      if (c.defects.length > 120) L.push(`| ... | | ${c.defects.length - 120} more in pass-${o.pass}.json |`);
      L.push('');
    }
    if (c.notes.length) { L.push('<details><summary>Notes (information, not defects)</summary>', ''); for (const n of c.notes.slice(0, 60)) L.push(`- ${mdEscape(n.code)} @ ${mdEscape(n.where)}: ${mdEscape(n.detail).slice(0, 300)}`); L.push('', '</details>', ''); }
  }
  L.push('Raw outputs: the machine-readable `raw` sections of the JSON file of this pass, and the files in `pass-' + o.pass + '-artifacts/` (screenshots, diffs, tool output).', '');
  return L.join('\n');
}

main().catch((e) => { console.error('run_pass crashed:', e); process.exit(4); });
