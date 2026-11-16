// Owner-run harness (not a gate): the whole real-GPU procedure of BROWSER-VERIFICATION-LIST-WEATHER.md section E in one command, for a machine that HAS a GPU. The build machine has none, so nothing here has run on
// hardware; the stored evidence is software only (WEATHER3D-WEBGPU-NOTES.md). What the command does, in order, each step in a child process with its output in <outDir>/logs/<step>.log, a failed step never stops the next one:
//   1. main-webgpu, main-webgl2   the 16 cases at the size asked for (default 1920 x 1080), Chrome without the software-rasteriser flags, the real canvas, the compositor's picture of the canvas against the read-back of each frame (W-E7)
//   2. main-compare               WebGL2 against WebGPU, per case, montage per case (W-E2)
//   2b. timing-webgpu, timing-webgl2   the timing harness (weather3d-gpu-timing.mjs): 600 frames after 120 warm-up frames, a quiet sky and a dense cannonade, the layer's passes on and off and each alone, two rounds (W-E4, W-C1, W-C2)
//   3. close-webgpu, close-webgl2, close-compare    the six close views (--extra: shell burst, ground strike with clods, fresh volley, dust at falls, the barn fire close and at night) (W-E2)
//   4. shell-webgpu, shell-webgl2, shell-compare    the shell itself, entered like a visitor enters it, the weather and effects installed by the shell (W-E3); --real-crowd adds the real crowd of figures (long)
//   then REAL-GPU-RESULT.json and REAL-GPU-RESULT.md: per row of section E what the machine could check (run checker, parity numbers, the adapter, the pass time, the canvas pictures) and what is still owed. A run on a
//   machine without a GPU says so in the first line and counts for nothing: the run checker refuses to call a software adapter a real-GPU result.
//   node docs/battle-theatre/app/tests/weather3d-gpu-realrun.mjs <outDir> [--headed] [--w=1920] [--h=1080] [--soldiers=12000] [--skip-close] [--skip-shell] [--skip-timing] [--real-crowd] [--dry] [--report-only]
// --headed: a visible Chrome window (where headless Chrome has no GPU access; on Windows and macOS headless Chrome usually has it). --dry: print the plan and stop. --report-only: only (re)write the result files from what is in <outDir>.
// What no script can do and what stays with a person: LOOK at the montages (the machine only measures them), and the rows for Safari, Firefox, a phone, a device without float32-filterable and the 600-frame timing split.
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { checkRun, checkCompare, checkNegativeControl } from './weather3d-gpu-check.mjs';
import { adapterVerdict } from './weather3d-gpu-lib.mjs';
import { checkTiming, derive } from './weather3d-gpu-timing-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// the steps, as data: { name, script, args, kind }
export function planSteps(o) {
  const out = path.resolve(o.out), w = o.w || 1920, h = o.h || 1080, soldiers = o.soldiers || 12000, head = o.headed ? ['--headed'] : [], size = [`--w=${w}`, `--h=${h}`], steps = [];
  const sub = d => path.join(out, d);
  steps.push({ name: 'main-webgpu', script: 'weather3d-gpu.mjs', args: [sub('main'), 'webgpu', '--real-gpu', ...head, ...size, `--soldiers=${soldiers}`], kind: 'run', dir: 'main', api: 'webgpu' });
  steps.push({ name: 'main-webgl2', script: 'weather3d-gpu.mjs', args: [sub('main'), 'webgl2', '--real-gpu', ...head, ...size, `--soldiers=${soldiers}`], kind: 'run', dir: 'main', api: 'webgl2' });
  steps.push({ name: 'main-compare', script: 'weather3d-gpu-compare.mjs', args: [sub('main')], kind: 'compare', dir: 'main' });
  if (!o.skipTiming) for (const api of ['webgpu', 'webgl2']) steps.push({ name: 'timing-' + api, script: 'weather3d-gpu-timing.mjs', args: [sub('timing'), api, '--real-gpu', ...head, ...size, `--soldiers=${soldiers}`], kind: 'timing', dir: 'timing', api });
  if (!o.skipClose) {
    for (const api of ['webgpu', 'webgl2']) steps.push({ name: 'close-' + api, script: 'weather3d-gpu.mjs', args: [sub('close'), api, '--extra', '--no-screenshot', '--real-gpu', ...head, ...size, `--soldiers=${soldiers}`], kind: 'run', dir: 'close', api });
    steps.push({ name: 'close-compare', script: 'weather3d-gpu-compare.mjs', args: [sub('close')], kind: 'compare', dir: 'close' });
  }
  if (!o.skipShell) {
    for (const api of ['webgpu', 'webgl2']) steps.push({ name: 'shell-' + api, script: 'weather3d-gpu-theatre.mjs', args: [sub('shell'), api, '--real-gpu', ...head, ...size], kind: 'shell', dir: 'shell', api });
    steps.push({ name: 'shell-compare', script: 'weather3d-gpu-compare.mjs', args: [sub('shell'), '--prefix=theatre-'], kind: 'compare', dir: 'shell', prefix: 'theatre-' });
    if (o.realCrowd) {
      for (const api of ['webgpu', 'webgl2']) steps.push({ name: 'crowd-' + api, script: 'weather3d-gpu-theatre.mjs', args: [sub('crowd'), api, '--real', '--real-gpu', ...head, ...size, '--entry-timeout=1500'], kind: 'shell', dir: 'crowd', api, real: true });
      steps.push({ name: 'crowd-compare', script: 'weather3d-gpu-compare.mjs', args: [sub('crowd'), '--prefix=theatre-real-'], kind: 'compare', dir: 'crowd', prefix: 'theatre-real-' });
    }
  }
  return steps;
}

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// what the machine could check, from the files the steps wrote. Pure (reads files only). Nothing in the result is a visual judgment.
export function summarize(out, o = {}) {
  const root = path.resolve(out), R = { generated: o.now || null, out: root, runs: {}, compare: {}, timing: {}, shell: {}, rows: {}, owed: [], problems: [], realGpu: null };
  // one entry per run that is present, whatever its record says (a run with no record, an empty one or 'unknown' is an entry that names nothing: it can never be counted as hardware, and it is never skipped)
  const adapters = [], addAdapter = (run, ...recs) => { const v = adapterVerdict(...recs); adapters.push({ run, adapter: v.text, named: v.named, software: v.software }); };
  for (const [dir, cases] of [['main', 16], ['close', 6]]) {
    for (const api of ['webgpu', 'webgl2']) {
      const s = readJson(path.join(root, dir, api, 'summary.json')); if (!s) { if (dir === 'main' || !o.skipClose) R.runs[dir + '-' + api] = { present: false }; continue; }
      const c = checkRun(s, { cases }), passMs = api === 'webgpu' ? Object.values(s.cases || {}).map(x => x.gpuStats && x.gpuStats.passMs).filter(v => typeof v === 'number') : [];
      R.runs[dir + '-' + api] = { present: true, ok: c.ok, problems: c.problems, facts: c.facts, realGpuRun: !!s.realGpu, size: [s.w, s.h], gpuLayer: s.diagInit && s.diagInit.gpu ? { ok: s.diagInit.gpu.ok, weatherOk: s.diagInit.gpu.weatherOk, fxOk: s.diagInit.gpu.fxOk, log: s.diagInit.gpu.log, warnings: s.diagInit.gpu.warnings } : null,
        passMs: passMs.length ? { n: passMs.length, median: +median(passMs).toFixed(3), p95: +pct(passMs, 0.95).toFixed(3), max: Math.max(...passMs) } : null };
      addAdapter(dir + '-' + api, s.diagEnd && s.diagEnd.adapter, s.diagInit && s.diagInit.adapter);
    }
    const cmp = readJson(path.join(root, dir, 'compare', 'summary.json')); if (cmp) { const k = checkCompare(cmp); R.compare[dir] = { ok: k.ok, problems: k.problems, facts: k.facts, worst: cmp.rows.slice().sort((a, b) => b.all.meanAbs - a.all.meanAbs).slice(0, 3).map(r => ({ case: r.case, meanAbs: r.all.meanAbs })) }; }
  }
  for (const api of ['webgpu', 'webgl2']) {                       // the timing runs: figures of the run, adapters recorded like the others
    const t = readJson(path.join(root, 'timing', 'timing-' + api, 'summary.json')); if (!t) { if (!o.skipTiming) R.timing[api] = { present: false }; continue; }
    const c = checkTiming(t); R.timing[api] = { present: true, ok: c.ok, problems: c.problems, realGpuRun: !!t.realGpu, size: [t.w, t.h], frames: t.frames, warm: t.warm, rounds: t.rounds, tier: t.tier, dense: t.dense, timestampQueries: !!t.timestampQueries, derived: Object.fromEntries(Object.entries(t.scenarios || {}).map(([k, v]) => [k, derive(v)])) };
    addAdapter('timing-' + api, t.diagEnd && t.diagEnd.adapter, t.diagInit && t.diagInit.adapter);
  }
  for (const dir of ['shell', 'crowd']) for (const api of ['webgpu', 'webgl2']) {
    const s = readJson(path.join(root, dir, (dir === 'crowd' ? 'theatre-real-' : 'theatre-') + api, 'summary.json')); if (!s) continue;
    const e = s.entered || {}, ad = e.adapter ? JSON.stringify(e.adapter) : null, st = e.status || null;
    const nc = checkNegativeControl(s.negativeControl);
    const shots = Object.values(s.cases || {}).filter(x => x.canvasShot), shotFacts = shots.length ? { cases: shots.length, failed: shots.filter(x => x.canvasShot.error).length, worstMeanAbs: Math.max(...shots.map(x => (x.canvasShot.meanAbs == null ? Infinity : x.canvasShot.meanAbs))) } : null;
    R.shell[dir + '-' + api] = { present: true, entered: !!e.ready, ribbon: e.ribbon || null, weatherDrawn: st ? !!st.weather : null, effectsDrawn: st ? !!st.effects : null, gpuLayer: e.gpu || null, glLayer: e.gl || null, errors: s.errors || [], consoleProblems: s.consoleProblems || [], gpuErrors: ((s.diagEnd || {}).gpuErrors || []).length, wgslMessages: ((s.diagEnd || {}).wgsl || []).length, cases: Object.keys(s.cases || {}).length, realGpuRun: !!s.realGpu, adapter: ad, negativeControl: nc.ran ? (nc.ok ? 'seen' : 'NOT SEEN: ' + nc.problems.slice(0, 3).join('; ')) : 'not run', canvasShot: shotFacts };
    addAdapter(dir + '-' + api, e.adapter);
  }
  const shellCmp = readJson(path.join(root, 'shell', 'theatre-compare', 'summary.json')); if (shellCmp) { const k = checkCompare(shellCmp); R.compare.shell = { ok: k.ok, problems: k.problems, facts: k.facts }; }
  const crowdCmp = readJson(path.join(root, 'crowd', 'theatre-real-compare', 'summary.json')); if (crowdCmp) { const k = checkCompare(crowdCmp); R.compare.crowd = { ok: k.ok, problems: k.problems, facts: k.facts }; }
  // the answer to "was this a real-GPU run": every present run (main, close, shell, crowd) carries an adapter record that NAMES hardware and is not a software one, was started with --real-gpu, and the two main runs are there.
  // An empty record ({}), empty strings or 'unknown' name nothing and count as no hardware (the same rule as the run checker: adapterVerdict in weather3d-gpu-lib.mjs).
  const mainMissing = ['main-webgpu', 'main-webgl2'].filter(k => !(R.runs[k] && R.runs[k].present)), listOf = a => a.map(x => x.run).join(', ');
  const notRealRun = [...Object.entries(R.runs).filter(([, x]) => x.present && !x.realGpuRun).map(([k]) => k), ...Object.entries(R.timing).filter(([, x]) => x.present && !x.realGpuRun).map(([k]) => 'timing-' + k), ...Object.entries(R.shell).filter(([, x]) => !x.realGpuRun).map(([k]) => k)];
  R.adapters = adapters; R.realGpu = adapters.length > 0 && mainMissing.length === 0 && adapters.every(a => a.named && !a.software) && notRealRun.length === 0;
  const run = k => R.runs[k] || { present: false }, mark = x => (!x.present ? 'not run' : x.ok ? 'clean' : 'PROBLEMS');
  const E = R.rows, snap = (k) => { const r = run(k); return r.present ? { run: mark(r), problems: r.problems.slice(0, 5), negativeControl: (r.facts && r.facts.negativeControl) || undefined } : { run: 'not run' }; };
  E['W-E1'] = { what: 'the layer builds and runs on the hardware, both APIs: no validation error, no compiler message, no device loss', webgpu: snap('main-webgpu'), webgl2: snap('main-webgl2'), closeWebgpu: snap('close-webgpu'), closeWebgl2: snap('close-webgl2'), gpuLayer: run('main-webgpu').gpuLayer || null, owed: 'the other devices of the row (Intel Arc, AMD, Apple Chrome and Safari, a mid-range Android phone): run this command on each' };
  E['W-E2'] = { what: 'picture parity of WebGL2 and WebGPU', main: R.compare.main || 'not run', close: R.compare.close || 'not run', owed: 'LOOK at <out>/main/compare/*.png and <out>/close/compare/*.png (WebGL2 | WebGPU | difference x4): sky, stars, moon, cloud, mist, wet ground, smoke, flash light, dust, fire; in the close views burst, strike with clods, volley, falls dust, flames and sparks, fire light at night; no layer missing or doubled, no halo at the far plane' };
  E['W-E3'] = { what: 'the shell on WebGPU', shellWebgpu: R.shell['shell-webgpu'] || 'not run', shellWebgl2: R.shell['shell-webgl2'] || 'not run', compare: R.compare.shell || 'not run', crowd: R.shell['crowd-webgpu'] || 'not run (use --real-crowd)', owed: 'LOOK at <out>/shell/theatre-compare/*.png; 390 x 844 (a phone-size window) with ?api=webgpu by hand; the crowd of figures on WebGPU is the crowd lane\'s own item (BROWSER-VERIFICATION-LIST-CROWD.md 2)' };
  const pm = run('main-webgpu').passMs, tm = R.timing; E['W-E4'] = { what: 'GPU time of the pass (timestamp queries), 600 frames, a quiet sky and a dense cannonade, the split with the weather pass and the sprite pass alone', measured: pm ? { ...pm, note: 'one measured frame per case at the size asked for (the 16 cases of the main run)' } : 'not available (the device has no timestamp-query feature, or the run is missing)', timing: { webgpu: tm.webgpu || 'not run', webgl2: tm.webgl2 || 'not run' }, owed: 'the figures above are the timing harness (stand-in world of 12,000 soldiers, no crowd, not presented); the same measurement in the shell on the real crowd of about 127,000 figures is not covered by this command' };
  E['W-E5'] = { what: 'a device without float32-filterable', owed: 'needs such a device (the run on any machine that has the feature cannot show it); not covered by this command' };
  E['W-E6'] = { what: 'Safari and Firefox', owed: 'needs those browsers; the software evidence is a second implementation only (second-implementation-build.json); not covered by this command' };
  const cs = run('main-webgpu').facts && run('main-webgpu').facts.canvasShot, cg = run('main-webgl2').facts && run('main-webgl2').facts.canvasShot; E['W-E7'] = { what: 'the real canvas shows what the read-back shows (page.screenshot of the page against the read-back, per case)', webgpu: cs || 'no canvas pictures in the run', webgl2: cg || 'no canvas pictures in the run', owed: 'LOOK at one canvas picture by hand next to its montage' };
  E['W-E8'] = { what: 'the optional GPU-cull compute shader', webgpuComputeCheck: (readJson(path.join(root, 'main', 'webgpu', 'summary.json')) || {}).computeCheck || null, owed: 'wiring it (indirect draws) and comparing it with the CPU cull is open; this command only checks that its pipeline builds' };
  E['W-E9'] = { what: 'the adapters the runs recorded are the hardware of the row', adapters, realGpu: R.realGpu };
  if (!R.realGpu) {
    const P = m => R.problems.push('NOT A REAL-GPU RESULT: ' + m);
    if (!adapters.length) P('no run recorded an adapter');
    if (adapters.some(a => a.software)) P('a run recorded a software adapter (' + listOf(adapters.filter(a => a.software)) + ')');
    if (adapters.some(a => !a.named && !a.software)) P('a run recorded no adapter that names hardware, the record is missing, empty or says unknown (' + listOf(adapters.filter(a => !a.named && !a.software)) + ')');
    if (adapters.length && mainMissing.length) P('a main run is missing (' + mainMissing.join(', ') + ')');
    if (notRealRun.length) P('a run is not a --real-gpu run (' + notRealRun.join(', ') + ')');
  }
  for (const [k, v] of Object.entries(R.runs)) if (v.present && !v.ok) R.problems.push(k + ': ' + v.problems.slice(0, 3).join('; '));
  for (const [k, v] of Object.entries(R.compare)) if (!v.ok) R.problems.push('compare ' + k + ': ' + v.problems.slice(0, 3).join('; '));
  for (const [k, v] of Object.entries(R.timing)) { if (!v.present) R.problems.push('timing ' + k + ': no summary (the step did not run or failed: see logs/timing-' + k + '.log)'); else if (!v.ok) R.problems.push('timing ' + k + ': ' + v.problems.slice(0, 3).join('; ')); }
  for (const [k, v] of Object.entries(R.shell)) { if (!v.entered) R.problems.push(k + ': the shell did not start'); if (v.errors.length) R.problems.push(k + ': ' + String(v.errors[0]).slice(0, 160)); if (v.gpuErrors) R.problems.push(k + ': ' + v.gpuErrors + ' WebGPU error(s)'); if (/^NOT SEEN/.test(v.negativeControl || '')) R.problems.push(k + ': negative control ' + v.negativeControl); }
  return R;
}

export function renderMarkdown(R) {
  const L = [];
  L.push(R.realGpu ? '# Real-GPU run of the weather and effects layers: machine results' : '# NOT A REAL-GPU RESULT: ' + R.problems.filter(p => /^NOT A REAL/.test(p)).map(p => p.replace(/^NOT A REAL-GPU RESULT: /, '')).join('; '));
  L.push('', 'This file is what the machine could check. It contains no visual judgment: the pictures still have to be looked at (section E of `BROWSER-VERIFICATION-LIST-WEATHER.md`). Rows are ticked there, by a person who has looked, never by this file.', '');
  L.push('Adapters recorded: ' + (R.adapters.length ? R.adapters.map(a => `${a.run}: ${(a.adapter || 'no record').slice(0, 140)}${a.software ? ' (SOFTWARE)' : ''}${!a.named && !a.software ? ' (NAMES NO HARDWARE)' : ''}`).join(' | ') : 'none'), '');
  if (R.problems.length) { L.push('## Problems', ...R.problems.map(p => '* ' + p), ''); } else L.push('No problem found by the checks.', '');
  for (const [id, row] of Object.entries(R.rows)) { L.push(`## ${id}: ${row.what}`, '```json', JSON.stringify(Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'what')), null, 1), '```', ''); }
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), pos = a.filter(x => !x.startsWith('--')), flag = (k, d) => { const x = a.find(y => y.startsWith('--' + k + '=')); return x ? x.split('=')[1] : d; };
  if (!pos[0]) { console.log('usage: node docs/battle-theatre/app/tests/weather3d-gpu-realrun.mjs <outDir> [--headed] [--w=1920] [--h=1080] [--soldiers=12000] [--skip-close] [--skip-shell] [--skip-timing] [--real-crowd] [--dry] [--report-only]'); process.exit(2); }
  const o = { out: pos[0], w: +flag('w', 1920), h: +flag('h', 1080), soldiers: +flag('soldiers', 12000), headed: a.includes('--headed'), skipClose: a.includes('--skip-close'), skipShell: a.includes('--skip-shell'), skipTiming: a.includes('--skip-timing'), realCrowd: a.includes('--real-crowd') }, steps = planSteps(o);
  if (a.includes('--dry')) { for (const s of steps) console.log(s.name.padEnd(16), 'node', s.script, s.args.join(' ')); process.exit(0); }
  fs.mkdirSync(path.join(path.resolve(o.out), 'logs'), { recursive: true });
  if (!a.includes('--report-only')) for (const s of steps) {
    const log = path.join(path.resolve(o.out), 'logs', s.name + '.log'), t0 = Date.now(); process.stdout.write(`${s.name.padEnd(16)} ... `);
    const fd = fs.openSync(log, 'w'), r = spawnSync(process.execPath, [path.join(HERE, s.script), ...s.args], { stdio: ['ignore', fd, fd], env: process.env }); fs.closeSync(fd);
    console.log(r.status === 0 ? 'ok' : 'exit ' + r.status + (r.error ? ' (' + r.error.message + ')' : ''), ((Date.now() - t0) / 1000).toFixed(0) + ' s', '->', log);
  }
  const R = summarize(o.out, { now: new Date().toISOString(), skipClose: o.skipClose, skipTiming: o.skipTiming }); fs.writeFileSync(path.join(path.resolve(o.out), 'REAL-GPU-RESULT.json'), JSON.stringify(R, null, 1)); fs.writeFileSync(path.join(path.resolve(o.out), 'REAL-GPU-RESULT.md'), renderMarkdown(R));
  console.log('\n' + renderMarkdown(R).split('\n').slice(0, 14).join('\n') + '\n\nwritten: ' + path.join(path.resolve(o.out), 'REAL-GPU-RESULT.md') + ' and .json'); process.exit(R.problems.length ? 1 : 0);
}
