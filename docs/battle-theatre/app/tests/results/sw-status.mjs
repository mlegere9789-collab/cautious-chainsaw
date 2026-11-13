// Reads the TAP logs of a software-rendering round (tests/results/sw-round-<n>/*.log, written by the queue runner) and the hand-kept verdicts (sw-round-<n>/verdicts.json) and prints the
// per-test table of SW-STATUS.md. Nothing is inferred beyond the log: a test with no hand verdict is PASS only when its latest run passed, NEEDS_GPU when the harness reported it NOT RUN,
// and UNCLASSIFIED when it failed or gave no result.
//   node docs/battle-theatre/app/tests/results/sw-status.mjs <round> [--json | --write]
//   --write   assembles tests/results/SW-STATUS.md from sw-round-<n>/notes.md (the hand-written sections; the markers <!-- SUMMARY --> and <!-- TABLES --> are replaced) and the tables below
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), round = process.argv[2] || '1', dir = path.join(here, 'sw-round-' + round);
export function parseLog(file) {
  const L = fs.readFileSync(file, 'utf8').split('\n'), run = { file: path.basename(file), tests: [], n: {}, console: [] };
  const h = /^# run (\S+): (\S+)\s+env: (.*?)\s+start (\S+)\s+HEAD (\S+)/.exec(L[0] || ''); if (h) Object.assign(run, { label: h[1], spec: path.basename(h[2]), env: h[3], start: h[4], head: h[5] });
  run.target = /BT_DIST=/.test(run.env || '') ? 'dist' : 'src'; { const sm = /BT_SNAPSHOT=\S*snap-([0-9a-f]+)\//.exec(run.env || ''); if (sm) run.snapshot = sm[1]; { const dm = /BT_DIST=\S*dist-([0-9a-f]+)\//.exec(run.env || ''); if (dm) run.snapshot = dm[1]; } }
  let buf = [];                                              // console lines of the test process: printed live, so they stand before the "# Subtest:" marker of the test that wrote them
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; let m;
    if ((m = /^# end (\S+)\s+seconds (\d+)\s+exit (\d+)\s+source changed during the run: (.*)$/.exec(l))) Object.assign(run, { end: m[1], seconds: +m[2], exit: +m[3], srcChanged: m[4] });
    else if (/^# TIME LIMIT/.test(l)) run.timeLimit = true;
    else if ((m = /^# (tests|pass|fail|skipped|cancelled) (\d+)$/.exec(l))) run.n[m[1]] = +m[2];
    else if ((m = /^# \\# (.*)$/.exec(l))) { run.console.push(m[1]); buf.push(m[1]); }
    else if ((m = /^(ok|not ok) (\d+) - (.*?)(?: # SKIP ?(.*))?$/.exec(l))) {
      const t = { console: buf, n: +m[2], name: m[3], result: m[4] !== undefined ? (m[1] === 'ok' ? 'not run' : 'FAIL') : m[1] === 'ok' ? 'pass' : 'FAIL', skip: m[4] || null, error: null, ms: null };
      for (let j = i + 1; j < L.length && !/^(ok|not ok|# Subtest|1\.\.)/.test(L[j]); j++) {
        const d = /^\s+duration_ms: ([\d.]+)/.exec(L[j]); if (d) t.ms = +d[1];
        if (/^\s+error: /.test(L[j])) { const one = /^\s+error: '?(.*?)'?$/.exec(L[j])[1]; const lines = /^\|/.test(one) ? [] : [one]; if (!lines.length) for (let k = j + 1; k < L.length && /^\s{4}/.test(L[k]) || L[k] === ''; k++) { if (L[k].trim()) lines.push(L[k].trim()); if (lines.length >= 4) break; } t.error = lines.join(' / ').slice(0, 420); }
      }
      buf = []; run.tests.push(t);
    }
  }
  return run;
}

export function build(round, dir) {
  const runs = fs.readdirSync(dir).filter(f => f.endsWith('.log')).map(f => parseLog(path.join(dir, f))).filter(r => r.spec).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const V = fs.existsSync(path.join(dir, 'verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'verdicts.json'), 'utf8')) : { specs: {} };
  const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const specs = [...new Set([...Object.keys(V.specs || {}), ...runs.map(r => r.spec)])].sort(), out = [], tally = {};
  const label = r => r.file.replace(/\.log$/, '');
  const how = r => `${r.n.pass ?? '?'} passed, ${r.n.fail ?? '?'} failed, ${r.n.skipped ?? '?'} not run of ${r.n.tests ?? '?'}; ${r.seconds != null ? (r.seconds / 60).toFixed(0) + ' min' : 'running, or no end line'}${r.timeLimit ? '; STOPPED AT THE TIME LIMIT' : ''}${r.snapshot ? (r.target === 'dist' ? '; packed dist of commit ' : '; frozen source snapshot of commit ') + r.snapshot : r.srcChanged && r.srcChanged !== 'no' ? '; live source tree, changed during the run' : r.target === 'src' ? '; live source tree' : ''}`;
  for (const spec of specs) {
    const mine = runs.filter(r => r.spec === spec), hand = (V.specs[spec] || {}).tests || [];
    const names = [...new Set([...hand.filter(h => h.test).map(h => h.test), ...mine.flatMap(r => r.tests.map(t => t.name))])];
    out.push(`\n### ${spec}\n`);
    for (const [t, what] of [['src', 'Source shell'], ['dist', 'Packed dist']]) { const rs = mine.filter(r => r.target === t); out.push(`${what}: ${rs.length ? rs.map(r => `\`${label(r)}\` (${r.start ? r.start.replace('T', ' ').replace(/:\d\dZ$/, 'Z') : '?'}; ${how(r)})`).join('; ') : 'not run'}.  `); }
    out.push('\nEach result cell is taken from the LATEST run that contains the test (the run is named when it is not the only one).\n');
    out.push('| test | source | dist | verdict | evidence |\n|---|---|---|---|---|');
    for (const name of names) {
      const latest = t => { const rs = mine.filter(r => r.target === t && r.tests.some(x => x.name === name)); const r = rs.at(-1); return r ? { r, t: r.tests.find(x => x.name === name), many: mine.filter(x => x.target === t).length > 1 } : null; };
      const A = latest('src'), B = latest('dist'), h = hand.find(x => x.test === name) || hand.find(x => x.match && name.includes(x.match)), a = A && A.t, b = B && B.t;
      const cell = X => !X ? 'not run' : X.t.result + (X.t.ms != null ? ` (${Math.round(X.t.ms / 60000)} min)` : '') + (X.many ? ` [${label(X.r)}]` : '');
      const verdict = h && h.verdict ? h.verdict : a ? (a.result === 'pass' ? 'PASS' : a.result === 'not run' ? 'NEEDS_GPU' : 'UNCLASSIFIED') : 'NOT RUN YET';
      const auto = a && a.result === 'pass' && a.console.length ? `log: ${a.console.length} line(s) of numbers, e.g. ${a.console.at(-1).slice(0, 170)}` : '';
      const ev = [h && h.evidence, a && a.result === 'FAIL' && a.error && `source run: ${a.error}`, a && a.skip && `harness: ${a.skip}`, b && b.result === 'FAIL' && b.error && `dist run: ${b.error}`, !h && auto].filter(Boolean).join(' ');
      tally[verdict.split(/[ (:]/)[0]] = (tally[verdict.split(/[ (:]/)[0]] || 0) + 1;
      out.push(`| ${esc(name.length > 170 ? name.slice(0, 167) + '...' : name)} | ${cell(A)} | ${cell(B)} | ${esc(verdict)} | ${esc(ev)} |`);
    }
  }
  return { tables: out.join('\n'), tally, runs, specs };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = build(round, dir);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(r.runs, null, 1)); process.exit(0); }
  if (process.argv.includes('--write')) {
    const notes = fs.readFileSync(path.join(dir, 'notes.md'), 'utf8'), n = Object.values(r.tally).reduce((a, b) => a + b, 0);
    const summary = `${n} tests in ${r.specs.length} specs: ` + Object.entries(r.tally).sort().map(([k, v]) => `${v} ${k}`).join(', ');
    const md = notes.replace('<!-- SUMMARY -->', summary).replace('<!-- TABLES -->', r.tables.trim());
    fs.writeFileSync(path.join(here, 'SW-STATUS.md'), md); console.log('written ' + path.join(here, 'SW-STATUS.md') + ' (' + summary + ')');
  } else console.log(r.tables);
}
