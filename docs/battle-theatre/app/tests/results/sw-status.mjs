// Reads the TAP logs of a software-rendering round (tests/results/sw-round-<n>/*.log, written by the queue runner) and the hand-kept verdicts (sw-round-<n>/verdicts.json) and prints the
// per-test table of SW-STATUS.md. Nothing is inferred beyond the log: a test with no hand verdict is PASS only when its latest run passed, NEEDS_GPU when the harness reported it NOT RUN,
// and UNCLASSIFIED when it failed or gave no result.
//   node docs/battle-theatre/app/tests/results/sw-status.mjs <round> [--json]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), round = process.argv[2] || '1', dir = path.join(here, 'sw-round-' + round);
export function parseLog(file) {
  const L = fs.readFileSync(file, 'utf8').split('\n'), run = { file: path.basename(file), tests: [], n: {}, console: [] };
  const h = /^# run (\S+): (\S+)\s+env: (.*?)\s+start (\S+)\s+HEAD (\S+)/.exec(L[0] || ''); if (h) Object.assign(run, { label: h[1], spec: path.basename(h[2]), env: h[3], start: h[4], head: h[5] });
  run.target = /BT_DIST=/.test(run.env || '') ? 'dist' : 'src';
  for (let i = 0; i < L.length; i++) {
    const l = L[i]; let m;
    if ((m = /^# end (\S+)\s+seconds (\d+)\s+exit (\d+)\s+source changed during the run: (.*)$/.exec(l))) Object.assign(run, { end: m[1], seconds: +m[2], exit: +m[3], srcChanged: m[4] });
    else if (/^# TIME LIMIT/.test(l)) run.timeLimit = true;
    else if ((m = /^# (tests|pass|fail|skipped|cancelled) (\d+)$/.exec(l))) run.n[m[1]] = +m[2];
    else if ((m = /^# \\# (.*)$/.exec(l))) run.console.push(m[1]);
    else if ((m = /^(ok|not ok) (\d+) - (.*?)(?: # SKIP ?(.*))?$/.exec(l))) {
      const t = { n: +m[2], name: m[3], result: m[4] !== undefined ? (m[1] === 'ok' ? 'not run' : 'FAIL') : m[1] === 'ok' ? 'pass' : 'FAIL', skip: m[4] || null, error: null, ms: null };
      for (let j = i + 1; j < L.length && !/^(ok|not ok|# Subtest|1\.\.)/.test(L[j]); j++) {
        const d = /^\s+duration_ms: ([\d.]+)/.exec(L[j]); if (d) t.ms = +d[1];
        if (/^\s+error: /.test(L[j])) { const one = /^\s+error: '?(.*?)'?$/.exec(L[j])[1]; const lines = /^\|/.test(one) ? [] : [one]; if (!lines.length) for (let k = j + 1; k < L.length && /^\s{4}/.test(L[k]) || L[k] === ''; k++) { if (L[k].trim()) lines.push(L[k].trim()); if (lines.length >= 4) break; } t.error = lines.join(' / ').slice(0, 420); }
      }
      run.tests.push(t);
    }
  }
  return run;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const runs = fs.readdirSync(dir).filter(f => f.endsWith('.log')).map(f => parseLog(path.join(dir, f))).filter(r => r.spec).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  const V = fs.existsSync(path.join(dir, 'verdicts.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'verdicts.json'), 'utf8')) : { specs: {} };
  if (process.argv.includes('--json')) { console.log(JSON.stringify(runs, null, 1)); process.exit(0); }
  const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const specs = [...new Set([...Object.keys(V.specs || {}), ...runs.map(r => r.spec)])].sort();
  for (const spec of specs) {
    const mine = runs.filter(r => r.spec === spec), last = t => mine.filter(r => r.target === t).at(-1), src = last('src'), dist = last('dist'), hand = (V.specs[spec] || {}).tests || [];
    const names = [...new Set([...hand.map(h => h.test), ...mine.flatMap(r => r.tests.map(t => t.name))])];
    console.log(`\n### ${spec}\n`);
    const line = r => r ? `\`${r.file}\`: ${r.n.pass ?? '?'} passed, ${r.n.fail ?? '?'} failed, ${r.n.skipped ?? '?'} not run, of ${r.n.tests ?? '?'}; ${r.seconds ?? '?'} s${r.timeLimit ? '; STOPPED AT THE TIME LIMIT' : ''}${r.srcChanged && r.srcChanged !== 'no' ? '; the source changed during the run' : ''}` : 'not run';
    console.log(`Source shell, latest run: ${line(src)}.  \nPacked dist, latest run: ${line(dist)}.${mine.length > (src ? 1 : 0) + (dist ? 1 : 0) ? `  \nEarlier runs of this round: ${mine.filter(r => r !== src && r !== dist).map(r => `\`${r.file}\` (${r.n.pass ?? '?'}/${r.n.tests ?? '?'} passed${r.timeLimit ? ', stopped at the time limit' : ''})`).join(', ')}.` : ''}\n`);
    console.log('| test | source | dist | verdict | evidence |\n|---|---|---|---|---|');
    for (const name of names) {
      const find = r => r && r.tests.find(t => t.name === name), a = find(src), b = find(dist), h = hand.find(x => x.test === name) || hand.find(x => x.match && name.includes(x.match));
      const cell = (t, r) => !r ? 'not run' : !t ? 'NO RESULT' : t.result + (t.ms != null ? ` (${Math.round(t.ms / 1000)} s)` : '');
      let verdict = h ? h.verdict : a ? (a.result === 'pass' ? 'PASS' : a.result === 'not run' ? 'NEEDS_GPU' : 'UNCLASSIFIED') : 'UNCLASSIFIED';
      const ev = [h && h.evidence, a && a.result === 'FAIL' && a.error && `source run: ${a.error}`, a && a.skip && `harness: ${a.skip}`, b && b.result === 'FAIL' && b.error && `dist run: ${b.error}`].filter(Boolean).join(' ');
      console.log(`| ${esc(name.length > 150 ? name.slice(0, 147) + '...' : name)} | ${cell(a, src)} | ${cell(b, dist)} | ${esc(verdict)} | ${esc(ev)} |`);
    }
  }
}
