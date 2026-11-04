// Check 1: the candidate zip is the deterministic packer's output - its SHA-256 equals the previous pass's, equals the sidecar / expected hash, and (when the
// train's dist exists) re-packing that dist with tools/ship/pack_zip.py gives the identical bytes.  Also the zip's own structure (no wrapper folder, no
// directory entries, CRCs, one fixed timestamp, no comments, portable names).
import fs from 'node:fs';
import path from 'node:path';
import { Check, readZip, runCmd, sha256File, readJson } from '../lib/util.mjs';

export async function run(ctx) {
  const c = new Check('1', 'Deterministic zip');
  const cand = ctx.candidate;
  if (!cand.isZip) return c.notRun('the candidate is a directory, not a zip; the hash/determinism check applies to the zip that will be dropped on Netlify. Pass the zip.').finish();
  const sha = sha256File(cand.path);
  c.metrics.candidateSha256 = sha; c.metrics.bytes = fs.statSync(cand.path).size;
  if (sha !== cand.sha256) c.defect('zip-changed-during-pass', cand.path, `hash at start ${cand.sha256}, now ${sha}`);

  // structure
  const z = readZip(fs.readFileSync(cand.path));
  const names = z.entries.map((e) => e.name);
  const problems = (cand.extraction && cand.extraction.problems) || [];
  for (const p of problems) c.defect('zip-structure', path.basename(cand.path), p);
  if (!names.includes('index.html')) c.defect('zip-structure', path.basename(cand.path), 'index.html is not at the zip root (wrapper folder?)');
  if (z.comment) c.defect('zip-comment', path.basename(cand.path), `zip comment present: ${z.comment.slice(0, 100)}`);
  if (z.entries.some((e) => e.comment)) c.defect('zip-entry-comment', path.basename(cand.path), 'an entry carries a comment');
  const sorted = [...names].sort();
  if (JSON.stringify(sorted) !== JSON.stringify(names)) c.defect('zip-not-sorted', path.basename(cand.path), 'entries are not in sorted order (the packer sorts them)');
  c.metrics.entries = names.length;

  // comparisons
  const cmp = [];
  const prevFile = path.join(ctx.outDir, `pass-${ctx.N - 1}.json`);
  if (ctx.args['prev-sha']) cmp.push(['--prev-sha', String(ctx.args['prev-sha'])]);
  else if (ctx.N > 1 && fs.existsSync(prevFile)) { try { const pj = readJson(prevFile); cmp.push([`pass-${ctx.N - 1}.json`, pj.candidate && pj.candidate.sha256]); } catch (e) { c.defect('previous-pass-unreadable', prevFile, e.message); } }
  if (ctx.args['expect-sha']) cmp.push(['--expect-sha', String(ctx.args['expect-sha'])]);
  const sidecar = cand.path + '.sha256';
  if (fs.existsSync(sidecar)) { const m = /^[0-9a-f]{64}/i.exec(fs.readFileSync(sidecar, 'utf8').trim()); if (m) cmp.push([path.basename(sidecar), m[0].toLowerCase()]); }
  if (ctx.N > 1 && !ctx.args['prev-sha'] && !fs.existsSync(prevFile)) c.defect('no-previous-pass', prevFile, `pass ${ctx.N} needs pass ${ctx.N - 1}'s hash (or --prev-sha) to prove determinism`);
  for (const [src, h] of cmp) {
    if (!h) { c.defect('hash-source-empty', src, 'no hash recorded'); continue; }
    if (h !== sha) c.defect('zip-hash-differs', src, `${src} says ${h}, the candidate is ${sha}`); else c.note('zip-hash-equal', src, `equals ${src}`);
  }
  c.metrics.comparedAgainst = cmp.map(([s]) => s);
  if (!cmp.length) c.notRun('nothing to compare the hash with: no previous pass, no --prev-sha/--expect-sha and no <zip>.sha256 sidecar');

  // re-pack from the built dist with the deterministic packer
  const mode = ctx.args.repack || 'auto';
  if (mode !== 'none') {
    const train = mode === 'auto' ? ((/-(R\d[a-z0-9]*|S\d)-/i.exec(path.basename(cand.path)) || [])[1]) : mode;
    const dist = train ? path.join(ctx.repoRoot, 'release', train, 'dist') : null;
    if (!train || !fs.existsSync(dist)) {
      c.note('repack-skipped', '-', `no release/<train>/dist to repack (train ${train || 'unknown'})`);
      if (mode !== 'auto') c.defect('repack-impossible', dist || mode, 'requested --repack but release/<train>/dist does not exist');
    } else {
      const out = path.join(ctx.scratch, 'repack.zip');
      const staging = /STAGING/i.test(path.basename(cand.path));
      const r = runCmd('python', ['tools/ship/pack_zip.py', '--train', train, '--out', out, ...(staging ? ['--staging'] : [])], { timeoutMs: 300000 });
      c.commands.push({ cmd: r.cmd, exit: r.exit, ms: r.ms });
      c.raw.packerOutput = (r.stdout + r.stderr).slice(-3000);
      if (r.exit !== 0) c.defect('repack-failed', 'tools/ship/pack_zip.py', (r.stdout + r.stderr).slice(-300));
      else {
        const h2 = sha256File(out);
        c.metrics.repackSha256 = h2;
        if (h2 !== sha) c.defect('repack-differs', `release/${train}/dist`, `re-packing release/${train}/dist gives ${h2}, the candidate is ${sha}: either the dist changed since the candidate was packed or the packer is not deterministic`);
        else c.note('repack-identical', `release/${train}/dist`, 'a fresh pack of the built dist is byte-identical to the candidate');
      }
    }
  }
  return c.finish();
}
