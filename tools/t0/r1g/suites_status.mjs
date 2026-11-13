#!/usr/bin/env node
// tools/t0/r1g/suites_status.mjs - writes docs/accept/R1G-SUITES.json: every suite id that tools/t0/run_suites.mjs defines for the R1g regression
// (--r1-dist release/R1g/dist --no-red --no-network), each with its LAST KNOWN result and the log that result comes from; a suite that has no row in any
// log is marked never reached.  Nothing is judged here: no result is classified, weighted or dropped; the file only says what the logs say.
//
//   node tools/t0/r1g/suites_status.mjs            write docs/accept/R1G-SUITES.json
//   node tools/t0/r1g/suites_status.mjs --check    exit 1 if the file on disk differs from what the logs give now (ignoring the "generated" time)
//   node tools/t0/r1g/suites_status.mjs --out <file>
//
// Inputs: (1) the runner's own table (run_suites.mjs --list with the flags of suites_sources.json), (2) the console logs listed in tools/t0/r1g/suites_sources.json
// and, where the summary JSON of the same run exists, its rows (exit codes, parallel parts, the last output lines of a row).  The logs are byte-identical copies in
// docs/accept/r1g-suite-logs/ (the originals are in git-ignored tmp/), so everything this reads is in git and --check works on a fresh checkout.  A log line is read
// with the runner's own format ("PASS  id  N/M (+K skipped) F failed  S s  load a>b  tiles c/d  title"); the indented "FAIL  <test id> ..." lines after a row are its failing
// tests as far as the runner printed them (at most 8 per suite, 6 per parallel slice: a longer list is marked truncated).  The runs are ordered by the "time_utc" of their
// source entry (a log has no time of its own and a checkout has no file times); "last" is the row of the newest run that has one for the suite.  A source whose log is
// missing is listed as missing and its rows are not used (the check then differs).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) : d; };
const OUT = path.resolve(REPO, opt('out', 'docs/accept/R1G-SUITES.json'));
const CHECK = !!opt('check', false);
const cfg = JSON.parse(fs.readFileSync(path.join(HERE, 'suites_sources.json'), 'utf8'));
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex');
const abs = (p) => path.resolve(REPO, p);
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;

// ------------------------------------------------------------------ (1) the table
const list = spawnSync(process.execPath, [path.join(REPO, 'tools', 't0', 'run_suites.mjs'), ...cfg.flags, '--list'], { cwd: REPO, encoding: 'utf8' });
if (list.status !== 0) { console.error(`run_suites.mjs --list failed (exit ${list.status}): ${list.stderr}`); process.exit(2); }
const table = list.stdout.split(/\r?\n/).filter(Boolean).map((l) => { const m = /^(\S+)\s+(green|red|check)\s+(.*)$/.exec(l); if (!m) { console.error(`cannot read the --list line: ${l}`); process.exit(2); } return { id: m[1], kind: m[2], title: m[3] }; });
const ids = new Set(table.map((s) => s.id));
if (ids.size !== table.length) { console.error('the runner table has a duplicate suite id'); process.exit(2); }

// ------------------------------------------------------------------ (2) the logs
const LINE = /^(PASS|FAIL|RED-OK|NOT-RED)\s+(\S+)\s+(.*?)\s+([0-9.]+) s\s+(?:load ([0-9.]+|\?)>([0-9.]+|\?)\s+)?(?:tiles (\d+)\/(\d+)\s+)?(.*)$/;
const num = (s) => (s === undefined || s === '?' ? null : Number(s));
function readLog(src) {
  if (!TIME.test(src.time_utc || '')) { console.error(`${src.log}: the source needs "time_utc" as YYYY-MM-DDTHH:MM:SSZ (the file time of the original; a checkout has no file times)`); process.exit(2); }
  const file = abs(src.log);
  const out = { log: src.log, original_log: src.original_log || null, time_utc: src.time_utc, summary: src.summary || null, original_summary: src.original_summary || null, present: fs.existsSync(file), conditions: src.conditions };
  if (src.same_bytes_as) out.same_bytes_as = src.same_bytes_as;
  if (!out.present) return { ...out, timeMs: Date.parse(src.time_utc), rows: [] };
  const buf = fs.readFileSync(file), text = buf.toString('utf8'), lines = text.split(/\r?\n/);
  Object.assign(out, { bytes: buf.length, sha256: sha256(buf), timeMs: Date.parse(src.time_utc) });
  const head = lines.map((l) => /^run_suites: (\d+) suite\(s\), port base (\d+), agent (\S+)/.exec(l)).find(Boolean);
  const end = lines.map((l) => /^run_suites: (\d+)\/(\d+) suites OK; green tests (\d+)\/(\d+);.*?; (\d+)s -> (\S+)/.exec(l)).find(Boolean);
  out.suites_selected = head ? Number(head[1]) : null;
  out.final_line = end ? end[0] : null;                      // the runner prints it only when it reaches the end of its selection
  out.load_recorded = false;
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const m = LINE.exec(lines[i]);
    if (!m) continue;
    const res = m[3].trim(), t = /^(\d+)\/(\d+)(?: \(\+(\d+) skipped\))?(?: (\d+) failed)?/.exec(res), e = /^exit (\S+)/.exec(res);
    const row = { id: m[2], status: m[1], ok: m[1] === 'PASS' || m[1] === 'RED-OK', result: res, passed: t ? Number(t[1]) : null, total: t ? Number(t[2]) : null, skipped: t ? Number(t[3] || 0) : null, failed: t ? Number(t[4] || 0) : null,
      exit: e ? (Number.isNaN(Number(e[1])) ? e[1] : Number(e[1])) : null, seconds: Number(m[4]), load1Start: num(m[5]), load1End: num(m[6]), tiles: m[7] ? Number(m[7]) : null, line: i + 1 };
    if (m[5] !== undefined) out.load_recorded = true;
    const fails = [], failLines = [];
    for (let k = i + 1; k < lines.length && /^\s{8}\S/.test(lines[k]) && !LINE.test(lines[k]); k++) { const f = /^\s{8}FAIL\s+(\S+)/.exec(lines[k]); if (f) { fails.push(f[1]); failLines.push(lines[k].trim()); } }
    row.failing_tests_printed = [...new Set(fails)];
    row.failing_lines_printed = failLines;
    row.failing_tests_truncated = row.failed !== null && row.failed > row.failing_tests_printed.length;
    rows.push(row);
  }
  // the summary JSON of the same run, when it is there: exit codes, parallel parts and the last output lines (never a different verdict: a disagreement with the log is reported)
  if (src.summary && fs.existsSync(abs(src.summary))) {
    const sbuf = fs.readFileSync(abs(src.summary)); let j = null;
    try { j = JSON.parse(sbuf.toString('utf8')); } catch { out.summary_error = 'not valid JSON'; }
    if (j) {
      Object.assign(out, { summary_sha256: sha256(sbuf), summary_finished: j.finished, summary_seconds: j.seconds, summary_totals: j.totals, summary_child_env: j.childEnv || null, summary_load1: j.load1 || null, summary_machine: j.machine || null });
      const by = new Map((j.results || []).map((r) => [r.id, r]));
      for (const row of rows) {
        const r = by.get(row.id); if (!r) { row.summary_row = 'absent'; continue; }
        if (!!r.ok !== row.ok || (r.seconds !== row.seconds)) row.summary_row = `DISAGREES with the log line (summary: ok ${r.ok}, ${r.seconds} s)`;
        if (row.exit === null && r.exit !== undefined) row.exit = r.exit;
        if (r.parts) row.parts = r.parts.map((p) => ({ exit: p.exit, seconds: p.seconds, passed: p.passed, total: p.total, skipped: p.skipped, failed: p.failed, tiles: p.tiles }));
        if (Array.isArray(r.tail) && r.tail.length) row.summary_tail = r.tail;
      }
    }
  } else if (src.summary) out.summary_error = 'file missing';
  if (src.selection_file) {
    if (fs.existsSync(abs(src.selection_file))) out.selection = fs.readFileSync(abs(src.selection_file), 'utf8').trim().split(/[,\s]+/).filter(Boolean);
    else out.selection_error = 'file missing';
    out.selection_file = src.selection_file; if (src.original_selection_file) out.original_selection_file = src.original_selection_file;
  }
  out.rows_in_log = rows.length;
  out.rows_not_in_table = rows.filter((r) => !ids.has(r.id)).map((r) => r.id);
  out.complete = out.final_line !== null && out.suites_selected !== null && rows.length === out.suites_selected;
  return { ...out, rows };
}
const sources = cfg.sources.map(readLog).sort((a, b) => a.timeMs - b.timeMs || a.log.localeCompare(b.log));

// ------------------------------------------------------------------ per suite
// rows that joined the table later (suites_sources.json "rows_added"): a run older than that date did not have them
const addedAfter = (id, src) => (cfg.rows_added || []).some((a) => a.id === id && src.time_utc < a.date);
const existedAt = (id, src) => !addedAfter(id, src);
const tableSizeAt = (src) => table.filter((x) => existedAt(x.id, src)).length;
const pub = (src, row, withText) => ({ log: src.log, log_original: src.original_log, log_line: row.line, log_time_utc: src.time_utc, summary: src.summary && !src.summary_error ? src.summary : null,
  status: row.status, ok: row.ok, result: row.result, passed: row.passed, total: row.total, skipped: row.skipped, failed: row.failed, exit: row.exit, seconds: row.seconds, tiles: row.tiles,
  load1Start: row.load1Start, load1End: row.load1End, failing_tests_printed: row.failing_tests_printed, ...(row.failing_tests_truncated ? { failing_tests_truncated: true } : {}),
  ...(withText && row.failing_lines_printed.length ? { failing_lines_printed: row.failing_lines_printed } : {}), ...(withText && !row.ok && row.summary_tail ? { summary_tail: row.summary_tail } : {}),
  ...(row.parts ? { parts: row.parts } : {}), ...(row.summary_row ? { summary_row: row.summary_row } : {}) });
const suites = table.map((s) => {
  const runs = [];
  for (const src of sources) for (const row of src.rows) if (row.id === s.id) runs.push({ src, row });
  const lastRun = runs.length ? runs[runs.length - 1] : null;
  const last = lastRun ? pub(lastRun.src, lastRun.row, true) : null;
  const earlier = runs.slice(0, -1).reverse().map((r) => pub(r.src, r.row, false));
  // stopped runs, newer than the last result, that had selected this suite and ended before it (its last result is then older than the latest attempt)
  const lastMs = lastRun ? lastRun.src.timeMs : -Infinity;
  const selected = (src) => (src.selection ? src.selection.includes(s.id) : src.suites_selected !== null && src.suites_selected === tableSizeAt(src) && existedAt(s.id, src));
  const stopped = sources.filter((src) => src.present && !src.complete && src.timeMs > lastMs && !src.rows.some((r) => r.id === s.id) && selected(src)).map((src) => src.log);
  return { id: s.id, kind: s.kind, title: s.title, reached: runs.length > 0, ...(runs.length ? {} : { never_reached: true }), last, earlier, ...(stopped.length ? { newer_runs_that_stopped_before_it: stopped } : {}) };
});

const never = suites.filter((s) => !s.reached).map((s) => s.id);
const glance = suites.map((s) => (s.last ? `${s.id} | ${s.last.status} | ${s.last.result} | ${s.last.log.split('/').pop()}:${s.last.log_line}${s.last.load1Start !== null ? ` | load ${s.last.load1Start}>${s.last.load1End}` : ''}` : `${s.id} | NEVER REACHED`));
const doc = {
  what: 'Release 1 train R1g: every suite id that tools/t0/run_suites.mjs defines for the command below, with its last known result and the log that result is read from. A suite with no row in any log is marked never_reached. This file records; it does not judge: no row is classified here.',
  command: `node tools/t0/run_suites.mjs ${cfg.flags.join(' ')}`,
  generated: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  generated_by: 'node tools/t0/r1g/suites_status.mjs (inputs: the runner\'s --list and the logs of tools/t0/r1g/suites_sources.json; regenerate after every new run, check with --check)',
  how_to_read: [
    'last = the row of the newest run (by time_utc of its source entry) that has a row for the suite; earlier = its rows in older runs, newest first. status, result, seconds, tiles and load are copied from the log line (log_line is its line number in the archived log; log_original is where the log was written).',
    'ok true means the runner printed PASS (for a green row: every selected test passed, skips are counted separately; for a check row: the expected exit code).',
    'failing_tests_printed are the test ids on the indented FAIL lines under the row and failing_lines_printed those lines as the runner printed them (last only); the runner prints at most 8 per suite and 6 per parallel slice, so failing_tests_truncated marks a longer list. summary_tail (last only, rows that are not ok) is the last output lines the runner stored in the summary JSON of the same run.',
    'seconds are the wall-clock time of the suite as the runner printed it. Every log was written on the cloud machine (4 vCPU container, software GL), so no duration is comparable with the Windows acceptance machine. load1Start / load1End are the machine\'s 1-minute load average at the start and end of the suite; null in every log written before the runner recorded it (2026-11-13). A timing failure measured at a load above 3 is not evidence and is re-run later.',
    'newer_runs_that_stopped_before_it names the stopped runs, newer than the last result, that had selected the suite and ended before reaching it: the last result is then older than the latest attempt.',
    'The logs and summaries are byte-identical copies (cmp, 2026-11-13) of files written under tmp/ (git-ignored); sources[].conditions says under which conditions each run was made and which record says so. A result is the state of the tree and of the runner of its own run, not of today.',
    'To run one suite alone: the command with --only <id>. --only matches by prefix (static.legal also selects static.legal.optin, r1.polish also r1.polish.pair, a11y.R1c also a11y.R1c.tiles, pagescore.R1c also pagescore.R1c.real and .full).',
  ],
  table: { suites: table.length, list_sha256: sha256(list.stdout), note: 'list_sha256 is the sha256 of the runner\'s --list output for the command above (the table this file describes; an edit of the runner that does not change the table does not change it). static.runner was added to the table on 2026-11-13 (the runner self-test); the runs before that date selected 79 suites.' },
  counts: {
    suites: suites.length, reached: suites.length - never.length, never_reached: never,
    last_ok: suites.filter((s) => s.last && s.last.ok).length, last_not_ok: suites.filter((s) => s.last && !s.last.ok).map((s) => s.id),
    last_result_by_log: Object.fromEntries(sources.filter((src) => src.present).map((src) => [src.log, suites.filter((s) => s.last && s.last.log === src.log).length])),
  },
  at_a_glance: glance,
  sources: sources.map(({ rows, timeMs, ...s }) => s),
  suites,
};

const text = JSON.stringify(doc, null, 1) + '\n';
if (CHECK) {
  const strip = (t) => t.replace(/^ "generated": "[^"]*",\n/m, '');
  const have = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  const same = strip(have) === strip(text);
  console.log(`${path.relative(REPO, OUT).split(path.sep).join('/')}: ${same ? 'in step with the logs' : 'DIFFERS from what the logs give now (regenerate)'}`);
  process.exit(same ? 0 : 1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
console.log(`${path.relative(REPO, OUT).split(path.sep).join('/')}: ${suites.length} suites, ${suites.length - never.length} reached, ${never.length} never reached${never.length ? ` (${never.join(', ')})` : ''}; last result ok ${doc.counts.last_ok}, not ok ${doc.counts.last_not_ok.length}`);
for (const s of sources) console.log(`  ${s.present ? `${String(s.rows_in_log).padStart(3)} rows` : 'MISSING '} ${s.complete ? 'complete' : 'partial '} ${s.time_utc}  ${s.log}`);
