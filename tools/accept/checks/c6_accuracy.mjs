// Check 6: accuracy. (a) tools/t0/verify_release.mjs on the CANDIDATE bytes (a throw-away release dir whose <train>/dist is the unzipped candidate and whose
// manifest.json etc. are copied from release/), (b) the selected fast subset of tests/t0 suites and the Node-only data / clock / historian suites
// (tools/accept/accuracy_subset.json, with the reason for every entry), (c) with --full the whole tools/t0/run_suites.mjs (about 2.5 hours).
import fs from 'node:fs';
import path from 'node:path';
import { Check, ACCEPT, REPO, readJson, runCmdAsync, tail, sha256File, walk, loadOf } from '../lib/util.mjs';

const summaryLine = (out) => { const m = [...out.matchAll(/^(.+?): (\d+)\/(\d+) passed(?:, (\d+) skipped)?(?:, (\d+) FAILED)?$/gm)]; return m.length ? m[m.length - 1].slice(0, 6).join('|') : null; };

export async function run(ctx) {
  const c = new Check('6', 'Accuracy');
  c.notRunParts = [];
  const sub = readJson(path.join(ACCEPT, 'accuracy_subset.json'));
  const train = ctx.args.train || (/-(R\d[a-z0-9]*|S\d)-/i.exec(path.basename(ctx.candidate.path)) || [])[1] || null;
  const base = ctx.portBase + 100;
  c.metrics.train = train;

  // ---------------------------------------------------------------- (a) verify_release on the candidate
  if (!train || !fs.existsSync(path.join(REPO, 'release', train))) {
    c.notRunParts.push(`verify_release: the train of the candidate cannot be determined (use --train) or release/${train}/ does not exist`);
  } else {
    const rd = path.join(ctx.scratch, 'release-dir'); fs.mkdirSync(rd, { recursive: true });
    for (const t of fs.readdirSync(path.join(REPO, 'release'), { withFileTypes: true })) {
      if (!t.isDirectory() || !/^R\d/.test(t.name)) continue;
      fs.cpSync(path.join(REPO, 'release', t.name), path.join(rd, t.name), { recursive: true, filter: (src) => !(src.endsWith(path.sep + 'dist') && t.name === train) });
    }
    fs.cpSync(ctx.dist, path.join(rd, train, 'dist'), { recursive: true });
    const jsonOut = path.join(ctx.artDir, 'verify_release.json');
    const r = await runCmdAsync(process.execPath, ['tools/t0/verify_release.mjs', '--train', train, '--release-dir', rd, '--port', String(base), '--json', jsonOut], { timeoutMs: 600000 });
    c.commands.push({ cmd: r.cmd.replace(rd, '<scratch>/release-dir'), exit: r.exit, ms: r.ms, ...loadOf(r), note: 'candidate bytes substituted for release/' + train + '/dist' });
    c.raw.verify_release = tail(r.stdout + r.stderr, 6000);
    if (r.exit !== 0) {
      const lines = (r.stdout + r.stderr).split('\n').filter((l) => /^FAIL|FAIL /.test(l));
      c.defect('verify_release', 'tools/t0/verify_release.mjs', `exit ${r.exit}: ${(lines.slice(0, 6).join(' | ') || tail(r.stdout + r.stderr, 500)).slice(0, 600)}`);
    }
    // is the candidate the built dist? (the other suites and release notes describe release/<train>/dist)
    const rdist = path.join(REPO, 'release', train, 'dist');
    if (fs.existsSync(rdist)) {
      const a = new Map(walk(rdist).map((f) => [f, sha256File(path.join(rdist, f))])), b = new Map(ctx.files.map((f) => [f, sha256File(path.join(ctx.dist, f))]));
      const diff = [...new Set([...a.keys(), ...b.keys()])].filter((f) => a.get(f) !== b.get(f));
      c.metrics.candidateEqualsBuiltDist = diff.length === 0;
      // the suites read the build record that stands next to a dist (anchors.json, gate.json, manifest.json of release/<train>): when the candidate is byte-identical to the built dist those records describe it,
      // so they are placed next to the unzipped candidate (without them T0-CP-01, T0-DATA-01 and others have nothing to read)
      if (diff.length === 0) for (const f of ['anchors.json', 'gate.json', 'manifest.json']) { try { fs.copyFileSync(path.join(REPO, 'release', train, f), path.join(path.dirname(ctx.dist), f)); } catch { /* the record is missing: the suites that need it say so */ } }
      if (diff.length) c.defect('candidate-differs-from-built-dist', `release/${train}/dist`, `${diff.length} file(s) differ between the candidate and release/${train}/dist (${diff.slice(0, 5).join(', ')}); build-time gate results do not describe the candidate`);
    }
  }

  // ---------------------------------------------------------------- (b) subset (or --full)
  if (ctx.args.full) {
    if (!train) c.notRunParts.push('--full: train unknown');
    else {
      const eq = c.metrics.candidateEqualsBuiltDist;
      if (!eq) c.notRunParts.push(`--full: run_suites.mjs tests release/${train}/dist, which is not byte-identical to the candidate; the full run would not describe the candidate`);
      else {
        const out = path.join(ctx.artDir, 'run_suites-summary.json');
        const r = await runCmdAsync(process.execPath, ['tools/t0/run_suites.mjs', '--json', out, '--port-base', String(base + 300), '--no-network'], { timeoutMs: 4 * 3600 * 1000, env: { T0_AGENT: path.relative(path.join(REPO, 'tmp'), ctx.scratch) } });
        c.commands.push({ cmd: r.cmd, exit: r.exit, ms: r.ms, ...loadOf(r) });
        c.raw.run_suites = tail(r.stdout, 5000);
        if (r.exit !== 0) c.defect('run_suites', 'tools/t0/run_suites.mjs', `exit ${r.exit}: ${tail(r.stdout + r.stderr, 500)}`);
        try { const sj = readJson(out); c.metrics.fullSuites = sj.totals; } catch { /* no summary */ }
      }
    }
  } else {
    c.metrics.subsetNote = 'fast subset only; use --full for tools/t0/run_suites.mjs';
    let i = 0;
    const only = ctx.args['accuracy-filter'] ? new RegExp(ctx.args['accuracy-filter']) : null;
    if (only) c.notRunParts.push(`--accuracy-filter ${ctx.args['accuracy-filter']}: development switch, the other suites were NOT run`);
    for (const s of sub.node) {
      if (only && !only.test(s.id)) continue;
      i++;
      const args = s.args.map((a) => a.replace('{dist}', ctx.dist));
      const env = { T0_PORT_BASE: String(base + 20 + i * 12), T0_AGENT: path.relative(path.join(REPO, 'tmp'), ctx.scratch), T0_TILE_CAP: String(ctx.args['suite-tile-cap'] || 300) };
      let r; try { r = await runCmdAsync(process.execPath, args, { timeoutMs: Math.max(900, (s.approxSeconds || 300) * 5) * 1000, env }); } catch (e) { c.notRunParts.push(`${s.id}: could not start (${e.message})`); continue; }
      const sum = summaryLine(r.stdout);
      c.commands.push({ cmd: `node ${s.args.join(' ').replace('{dist}', '<candidate>')}`, exit: r.exit, ms: r.ms, ...loadOf(r), note: sum });
      (c.raw.suites ||= []).push({ id: s.id, exit: r.exit, seconds: Math.round(r.ms / 1000), ...loadOf(r), summary: sum, why: s.why, tail: tail(r.stdout + r.stderr, 1500) });
      if (r.exit !== 0 || r.timedOut) {
        const fails = (r.stdout.match(/^FAIL .*$/gm) || []).slice(0, 6).join(' | ');
        c.defect('suite-failed', s.id, `exit ${r.exit}${r.timedOut ? ' (timed out)' : ''}; ${sum || ''}; ${fails || tail(r.stdout + r.stderr, 400)}`);
      }
    }
    for (const s of sub.npm) {
      if (only && !only.test(s.id)) continue;
      for (const step of s.steps) {
        const r = await runCmdAsync(process.execPath, step, { timeoutMs: 15 * 60000 });
        c.commands.push({ cmd: `node ${step.join(' ')}`, exit: r.exit, ms: r.ms, ...loadOf(r) });
        (c.raw.suites ||= []).push({ id: `${s.id}: ${step.join(' ')}`, exit: r.exit, seconds: Math.round(r.ms / 1000), ...loadOf(r), why: s.why, tail: tail(r.stdout + r.stderr, 1200) });
        if (r.exit !== 0) c.defect('suite-failed', `${s.id}: ${step.join(' ')}`, `exit ${r.exit}: ${tail(r.stdout + r.stderr, 500)}`);
      }
    }
    c.note('subset', '-', `ran ${sub.node.length + sub.npm.length} suites; NOT in the subset: ${sub.notInSubset.map((n) => n.id).join('; ')} (see accuracy_subset.json for why)`);
  }
  c.note('claims', '-', 'Passing these suites shows the machinery is consistent with its own expectations; it does not prove the historical anchors are correct (that needs the named reviewer).');
  return c.finish();
}
