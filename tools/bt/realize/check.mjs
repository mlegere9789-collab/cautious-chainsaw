#!/usr/bin/env node
// Runs every realization record against the product and writes GOVERNANCE/realizations/RESULTS.json (gate Q17).
//
//   node tools/bt/realize/check.mjs                         all shard files GOVERNANCE/realizations/<shard>.jsonl (+ EXAMPLES.jsonl for rows with no shard record)
//   node tools/bt/realize/check.mjs --shard tl-03,tl-04     only these shards (RESULTS.json is then NOT overwritten unless --write is given; the report is printed)
//   node tools/bt/realize/check.mjs --file some.jsonl       check a records file (tests use this); never writes RESULTS.json
//   node tools/bt/realize/check.mjs --row T1-004            only this row (report only)
//   options: --write (write RESULTS.json even for a partial run: it is then merged over the previous file), --update (write each record's "result" field back into its shard file),
//            --quiet, --json (print the whole report as JSON), --out <path>
// Exit code: 0 when the run completed (a row that is not realized is a result, not an error); 1 when a record file cannot be read; 2 on a harness error.
// The result of a row: realized true only when its record is valid, bound to the row's words, and every check holds in the product; q17_covered = realized or an open register entry (the two
// halves of the gate). Nothing here sets a `passes` flag: Q17 is passing only when q17.ok is true AND the gate runner says so.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto';
import { ROOT, GOV, REAL, HARNESS, readJSON, readJSONL, exists, rel, sha256, sha256File, minOf } from './lib.mjs';
import { loadTimeline } from './timeline.mjs';
import { openProduct } from './query.mjs';
import { Runner } from './checks.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_FILES = ['lib.mjs', 'timeline.mjs', 'gazetteer.mjs', 'query.mjs', 'schema.mjs', 'checks.mjs', 'check.mjs', 'tolerances.json', 'adapters.json'];
const CARD_KINDS = new Set(['event_card', 'epilogue']);
const trimEv = ev => { if (!ev) return undefined; const t = JSON.stringify(ev); return t.length > 260 ? t.slice(0, 257) + '...' : ev; };
export const harnessDigest = () => sha256(Buffer.from(HARNESS_FILES.map(f => f + ':' + sha256File(path.join(here, f))).join('\n'))).slice(0, 16);

// ---- the register half of the gate: the same rule as tools/bt/check_coverage.py (a sub-requirement of the row linked to an open register entry)
export function registerCoverage() {
  const req = readJSON(path.join(GOV, 'requirements.json')), reg = readJSON(path.join(GOV, 'register_index.json')), open = new Set(reg.filter(e => e.status !== 'closed').map(e => e.id)), by = new Map();
  for (const s of req.sub_requirements) { const m = /^(?:Timeline row|Epilogue row) ((?:T\d-\d+)|(?:E-\d+))/.exec(s.text); if (m && (s.requirement_id === 'R11' || s.requirement_id === 'R22')) by.set(m[1], { sub: s.id, open: (s.register_ids || []).filter(i => open.has(i)), all: s.register_ids || [] }); }
  return by;
}

export function epilogueRows(TL) {   // the 14 epilogue rows (epilogue_seed.jsonl) as timeline rows, so that records of kind epilogue are checked the same way
  const p = path.join(GOV, 'epilogue_seed.jsonl'); if (!exists(p)) return [];
  const rows = [];
  for (const [n, s] of readJSONL(p).entries()) {
    const cells = (s.text_raw || '').split(' | '); let head = cells[0] || s.time_window_raw || ''; if (/\bto\s*$/.test(head) && cells[1]) head += ' ' + cells[1];     // "Nov 19, about 09:30 to | 11:00"
    const what = cells.slice(head === cells[0] ? 1 : 2).join(' ');
    rows.push({ id: s.id, n, shard: 'epilogue', page: s.page || null, tier_seed: s.tier, tier: s.tier, status_effective: s.status, verdict: null, weak: false, text_raw: s.text_raw, time_cell: head, what: [what], what_text: what, notes_text: '', tier_cell_found: true, seed_window: {}, window: epilogueWindow(head, TL), correction: null, claim_text: (s.text_raw || '').replace(/ \| /g, ' ') });
  }
  return rows;
}
// Nov 18 / Nov 19 rows: a printed clock time or clock range is widened by the clock tolerance at each end; a row with no clock time gets the whole printed date(s)
function epilogueWindow(head, TL) {
  const CT = TL.tolerances.time.clock_tolerance_min, dates = [...new Set([...String(head).matchAll(/Nov(?:ember)? (\d{1,2})/g)].map(m => +m[1]))], clocks = [...String(head).matchAll(/(\d{1,2}):(\d{2})/g)].map(m => +m[1] * 60 + +m[2]);
  if (!dates.length) return { intervals: [[minOf(11, 18), minOf(11, 20)]], basis: ['no date printed in the cell: Nov 18 and 19'], flags: ['no_date'], kind: 'date', source: 'seed time cell', in_clock: true };
  const iv = dates.map(d => clocks.length ? [minOf(11, d) + Math.min(...clocks) - CT, minOf(11, d) + Math.max(...clocks) + CT] : [minOf(11, d), minOf(11, d) + 1440]);
  return { intervals: iv, basis: [`epilogue time cell "${head}": ${clocks.length ? 'printed clock time(s) with the clock tolerance of ' + CT + ' min' : 'the whole printed date'}`], flags: [], kind: clocks.length ? 'clock' : 'date', source: 'seed time cell', in_clock: true };
}

export function readRecordFile(file) {
  const out = [], errors = [];
  if (!exists(file)) return { records: out, errors };
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((l, i) => { if (!l.trim()) return; try { out.push({ rec: JSON.parse(l), line: i + 1 }); } catch (e) { errors.push({ file: rel(file), line: i + 1, error: String(e.message) }); } });
  return { records: out, errors };
}

export async function runAll({ shards = null, files = null, rows = null, quiet = true, product = null } = {}) {
  const TL = loadTimeline(), EP = epilogueRows(TL); for (const r of EP) { TL.byId.set(r.id, r); }
  const P = product || await openProduct(), R = new Runner(P, TL);
  const reg = registerCoverage(), fileList = [];
  if (files) for (const f of files) fileList.push({ file: path.resolve(f), shard: path.basename(f).replace(/\.jsonl$/, '') });
  else {
    const all = exists(REAL) ? fs.readdirSync(REAL).filter(f => /^(tl-\d\d|epilogue)\.jsonl$/.test(f)).sort() : [];
    for (const f of all) { const s = f.replace(/\.jsonl$/, ''); if (!shards || shards.includes(s)) fileList.push({ file: path.join(REAL, f), shard: s }); }
    if (exists(path.join(REAL, 'EXAMPLES.jsonl'))) fileList.push({ file: path.join(REAL, 'EXAMPLES.jsonl'), shard: 'EXAMPLES', examples: true });
  }
  const results = new Map(), problems = [], examples = new Map(), seen = new Map();
  for (const { file, shard, examples: isEx } of fileList) {
    const { records, errors } = readRecordFile(file); problems.push(...errors);
    for (const { rec, line } of records) {
      if (rows && !rows.includes(rec.id)) continue;
      const src = `${rel(file)}:${line}`, res = await R.runRecord(rec, { source: src });
      if (isEx) { examples.set(rec.id, res); continue; }
      if (results.has(rec.id)) { problems.push({ file: rel(file), line, error: `duplicate record for ${rec.id} (first in ${results.get(rec.id).source})` }); continue; }
      results.set(rec.id, res);
    }
  }
  // rows with no shard record but a worked example: the example stands for the row (the shard file overrides it as soon as it has the row)
  for (const [id, r] of examples) if (!results.has(id)) results.set(id, { ...r, from_examples: true });
  const universe = [...TL.rows, ...EP].filter(r => (!rows || rows.includes(r.id)) && (!shards || shards.includes(r.shard))), out = {};     // a partial run reports the rows it was asked about only
  for (const r of universe) {
    const res = results.get(r.id), rg = reg.get(r.id) || { open: [], all: [] };
    const entry = res ? { realized: !!res.realized, kind: res.kind, why: res.why, codes: res.codes, record: res.source, window: res.window || null, scenarios: res.scenarios, declared_bindings: res.bindings ? res.bindings.declared : 0, problems: res.problems.map(p => p.code + ': ' + p.detail).slice(0, 6), failing: (res.assertions || []).filter(a => !a.ok).map(a => ({ i: a.i, type: a.type, code: a.code, detail: a.detail })).slice(0, 8), assertions: (res.assertions || []).map(a => ({ i: a.i, type: a.type, ok: a.ok, ...(a.ok ? {} : { code: a.code }), evidence: trimEv(a.ok ? a.evidence : null) })), ...(res.stale_result ? { stale_result: res.stale_result } : {}), ...(res.missing ? { missing: res.missing } : {}), ...(res.from_examples ? { from_examples: true } : {}), }
      : { realized: false, kind: null, why: 'no realization record', codes: ['no_record'], record: null, window: null };
    entry.realization_class = entry.realized ? (CARD_KINDS.has(entry.kind) ? 'card' : 'scene') : null; if (res && res.spec_view) entry.spec_view = res.spec_view;
    entry.tier = r.tier; entry.status = r.status_effective; entry.shard = r.shard || null; entry.register_open = rg.open; entry.q17_covered = !!entry.realized || rg.open.length > 0; entry.q17_covered_strict = entry.realization_class === 'scene' || rg.open.length > 0; entry.coverage = entry.realized ? (entry.realization_class === 'card' ? 'card' : 'realization') : rg.open.length ? 'open_register_entry' : 'none';
    out[r.id] = entry;
  }
  return { R, TL, EP, P, results, examples, problems, fileList, out, reg };
}

function summarize(out, TL, EP) {
  const tl = TL.rows.map(r => out[r.id]).filter(Boolean), by = (f) => { const m = {}; for (const e of tl) { const k = f(e); m[k] = (m[k] || 0) + 1; } return Object.fromEntries(Object.entries(m).sort()); };
  const ep = EP.map(r => out[r.id]).filter(Boolean);
  const cnt = a => ({ rows: a.length, realized: a.filter(e => e.realized).length, realized_by_scene: a.filter(e => e.realization_class === 'scene').length, realized_by_card_only: a.filter(e => e.realization_class === 'card').length, uncovered_strict: a.filter(e => !e.q17_covered_strict).length, not_realized: a.filter(e => !e.realized).length, with_record: a.filter(e => e.record).length, no_record: a.filter(e => !e.record).length, covered_by_open_register_entry_only: a.filter(e => !e.realized && e.register_open.length).length, uncovered: a.filter(e => !e.q17_covered).length });
  const codes = {}; for (const e of tl) if (!e.realized) for (const c of e.codes || []) codes[c] = (codes[c] || 0) + 1;
  return { timeline: cnt(tl), epilogue: cnt(ep), realized_by_kind: by(e => (e.realized ? e.kind : 'not_realized')), not_realized_by_code: Object.fromEntries(Object.entries(codes).sort((a, b) => b[1] - a[1])) };
}

async function main() {
  const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
  const shards = opt('--shard') ? String(opt('--shard')).split(',') : null, files = opt('--file') ? String(opt('--file')).split(',') : null, rows = opt('--row') ? String(opt('--row')).split(',') : null;
  const partial = !!(shards || files || rows), write = opt('--write') === true || (!partial && !argv.includes('--no-write') && !files), quiet = argv.includes('--quiet');
  const run = await runAll({ shards, files, rows });
  const { out, TL, EP, problems } = run, S = summarize(out, TL, EP);
  const universeCount = TL.rows.filter(r => out[r.id]).length, q17 = { _doc: 'ok: every timeline row and every epilogue row is realized (a scene or a tier-marked card) or covered by an open register entry. ok_strict: the same, but a row realized by a card alone counts only if an open register entry also covers it (GATE-SPEC-A TL-4 and TL-11 read a card as no visual realization). Neither sets a passes flag.', ok: S.timeline.uncovered === 0 && S.epilogue.uncovered === 0 && !problems.length, ok_strict: S.timeline.uncovered_strict === 0 && S.epilogue.uncovered_strict === 0 && !problems.length, rows: universeCount, epilogue_rows: EP.length, realized: S.timeline.realized, realized_by_scene: S.timeline.realized_by_scene, realized_by_card_only: S.timeline.realized_by_card_only, covered_by_open_register_entry_only: S.timeline.covered_by_open_register_entry_only, uncovered: S.timeline.uncovered, uncovered_strict: S.timeline.uncovered_strict, epilogue_uncovered: S.epilogue.uncovered };
  const doc = { harness: HARNESS, harness_digest: harnessDigest(), inputs_digest: sha256(Buffer.from(JSON.stringify(run.P.inputDigest()))).slice(0, 16), scope: { timeline_rows: universeCount, epilogue_rows: EP.filter(r => out[r.id]).length, files: run.fileList.map(f => rel(f.file)), partial }, totals: S, q17, record_file_problems: problems, rows: Object.fromEntries(TL.rows.map(r => [r.id, out[r.id]]).filter(([, v]) => v)), epilogue: Object.fromEntries(EP.map(r => [r.id, out[r.id]]).filter(([, v]) => v)), examples: Object.fromEntries([...run.examples].map(([id, r]) => [id, { realized: r.realized, kind: r.kind, why: r.why, codes: r.codes, record: r.source }])) };
  if (write) {
    let merged = doc;
    if (partial && exists(path.join(REAL, 'RESULTS.json'))) { const old = readJSON(path.join(REAL, 'RESULTS.json')); merged = { ...old, harness_digest: doc.harness_digest, rows: { ...old.rows, ...doc.rows }, epilogue: { ...old.epilogue, ...doc.epilogue }, examples: { ...old.examples, ...doc.examples }, record_file_problems: doc.record_file_problems }; const all = [...Object.values(merged.rows)]; merged.totals = { ...merged.totals, note: 'merged from a partial run; run check.mjs without --shard for the totals of every shard' }; }
    fs.mkdirSync(REAL, { recursive: true }); const target = typeof opt('--out') === 'string' ? opt('--out') : path.join(REAL, 'RESULTS.json'); fs.writeFileSync(target, JSON.stringify(merged, null, 1) + '\n');
  }
  if (argv.includes('--update')) {                                    // write each record's "result" back into its shard file (only the "result" field of records that validated or failed; nothing else changes)
    for (const f of run.fileList) { if (f.examples) continue; const { records } = readRecordFile(f.file); const lines = fs.readFileSync(f.file, 'utf8').split(/\r?\n/); for (const { rec, line } of records) { const res = run.results.get(rec.id); if (!res || res.source !== `${rel(f.file)}:${line}`) continue; rec.result = { realized: !!res.realized, why: String(res.why || '').slice(0, 300), digest: doc.harness_digest }; lines[line - 1] = JSON.stringify(rec); } fs.writeFileSync(f.file, lines.join('\n')); }
  }
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(doc, null, 1) + '\n');
  else if (!quiet) {
    console.log(`bt-realize ${HARNESS} digest ${doc.harness_digest}: ${universeCount} timeline rows, ${doc.scope.epilogue_rows} epilogue rows, ${run.fileList.length} record file(s)${partial ? ' (partial run)' : ''}`);
    console.log(`  realized ${S.timeline.realized}; with a record ${S.timeline.with_record}; not realized ${S.timeline.not_realized} (open register entry only: ${S.timeline.covered_by_open_register_entry_only}); uncovered ${S.timeline.uncovered}`);
    console.log(`  by kind: ${JSON.stringify(S.realized_by_kind)}`); console.log(`  not realized, by code: ${JSON.stringify(S.not_realized_by_code)}`);
    for (const p of problems) console.log(`  FILE PROBLEM ${p.file}:${p.line}: ${p.error}`);
    if (rows || (shards && shards.length === 1)) for (const [id, e] of Object.entries(doc.rows)) console.log(`  ${id} ${e.realized ? 'REALIZED' : 'not realized'} [${e.kind || '-'}] ${e.why}`);
  }
  process.exitCode = problems.some(p => /duplicate|JSON|Unexpected/.test(p.error)) ? 1 : 0;       // not process.exit: a large --json write to a pipe must be flushed first
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e => { console.error(e && e.stack || e); process.exitCode = 2; });
