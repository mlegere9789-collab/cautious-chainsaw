#!/usr/bin/env node
// Runs every realization record against the product and writes GOVERNANCE/realizations/RESULTS.json (gate Q17).
//
//   node tools/bt/realize/check.mjs                         all shard files GOVERNANCE/realizations/<shard>.jsonl (+ EXAMPLES.jsonl for rows with no shard record)
//   node tools/bt/realize/check.mjs --shard tl-03,tl-04     only these shards (RESULTS.json is then NOT overwritten unless --write is given; the report is printed)
//   node tools/bt/realize/check.mjs --file some.jsonl       check a records file (tests use this); never writes RESULTS.json unless --write is given
//   node tools/bt/realize/check.mjs --row T1-004            only this row (report only)
//   node tools/bt/realize/check.mjs --digests               print the digests of the harness and of the inputs (every file read, the shell's source tree, the record files) and stop
//   options: --write (write RESULTS.json even for a partial run: the rows of the run replace their rows in the previous file and the totals, q17 and scope are recomputed from the merged rows; rows carried over
//            from an earlier run under other digests are listed and q17.ok is then false), --update (write each record's "result" field back into its shard file), --quiet,
//            --json (print the whole report as JSON), --out <path> (write there instead of RESULTS.json; a gate runner does this for a full run)
// Exit code: 0 when the run completed (a row that is not realized is a result, not an error); 1 when a record file cannot be read; 2 on a harness error.
// The result of a row: realized true only when its record is valid, bound to the row's words, and every check holds in the product; q17_covered = realized or an open register entry (the two
// halves of the gate). Nothing here sets a `passes` flag: Q17 is passing only when q17.ok is true AND the gate runner says so.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import crypto from 'node:crypto';
import { ROOT, GOV, REAL, HARNESS, readJSON, readJSONL, readText, exists, rel, sha256, sha256File, minOf, toMin } from './lib.mjs';
import { loadTimeline, coversInterval } from './timeline.mjs';
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

// the two halves of the gate for one row: the visual realization (a scene; a card alone is a different CLASS) and the open register entry. q17_covered: realized (a card counts) or an open entry; q17_covered_strict: a row
// realized by a card alone, or only partially, counts only with an open entry as well (GATE-SPEC TL-4, TL-11, DD-G08)
export function coverageOf(entry, regOpen) {
  entry.realization_class = entry.realized ? (CARD_KINDS.has(entry.kind) ? 'card' : 'scene') : null; entry.register_open = regOpen;
  entry.q17_covered = !!entry.realized || regOpen.length > 0; entry.q17_covered_strict = (entry.realization_class === 'scene' && !entry.partial) || regOpen.length > 0;
  entry.coverage = entry.realized ? (entry.realization_class === 'card' ? 'card' : 'realization') : regOpen.length ? 'open_register_entry' : 'none';
  return entry;
}
export function epilogueRows(TL) {   // the 14 epilogue rows (epilogue_seed.jsonl) as timeline rows, so that records of kind epilogue are checked the same way
  const p = path.join(GOV, 'epilogue_seed.jsonl'); if (!exists(p)) return [];
  const rows = [];
  for (const [n, s] of readJSONL(p).entries()) {
    const cells = (s.text_raw || '').split(' | '); let head = cells[0] || s.time_window_raw || ''; if (/\bto\s*$/.test(head) && cells[1]) head += ' ' + cells[1];     // "Nov 19, about 09:30 to | 11:00"
    const what = cells.slice(head === cells[0] ? 1 : 2).join(' ');
    rows.push({ id: s.id, n, shard: 'epilogue', page: s.page || null, tier_seed: s.tier, tier: s.tier, status_effective: s.status, verdict: null, weak: false, text_raw: s.text_raw, time_cell: head, what: [what], what_text: what, after: [], notes_text: '', tier_cell_found: true, seed_window: {}, window: epilogueWindow(head, TL), correction: null, claim_text: (s.text_raw || '').replace(/ \| /g, ' ') });
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
  const lines = readText(file).split(/\r?\n/);
  lines.forEach((l, i) => { if (!l.trim()) return; try { out.push({ rec: JSON.parse(l), line: i + 1 }); } catch (e) { errors.push({ file: rel(file), line: i + 1, error: String(e.message) }); } });
  return { records: out, errors };
}

export async function runAll({ shards = null, files = null, rows = null, quiet = true, product = null } = {}) {
  const TL = loadTimeline(), EP = epilogueRows(TL); for (const r of EP) { TL.byId.set(r.id, r); }
  const P = product || await openProduct(), R = new Runner(P, TL); if (typeof P.warm === 'function') await P.warm();     // every lazy load happens now, so that the digest of the inputs does not depend on which records ran
  // the allowed windows WITHOUT the clock margin (the plan: the armies' clocks differ by about 20 minutes, which "is not applied to any row, it is carried as uncertainty"): a record whose window lies inside the widened window
  // and outside the exact one has used the margin (clock_tolerance_used); GATE-SPEC 6.4 V4 and DD-G09 do not accept it for a Q17 PASS
  const tol0 = JSON.parse(JSON.stringify(TL.tolerances)); tol0.time.clock_tolerance_min = 0; const TL0 = loadTimeline({ tolerances: tol0 }), exact = new Map([...TL0.rows, ...epilogueRows(TL0)].map(r => [r.id, r.window.intervals]));
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
    const entry = res ? { realized: !!res.realized, kind: res.kind, why: res.why, codes: res.codes, record: res.source, window: res.window || null, scenarios: res.scenarios, ...(res.excluded_scenarios && res.excluded_scenarios.length ? { excluded_scenarios: res.excluded_scenarios } : {}), declared_bindings: res.bindings ? res.bindings.declared : 0, problems: res.problems.map(p => p.code + ': ' + p.detail).slice(0, 6), failing: (res.assertions || []).filter(a => !a.ok).map(a => ({ i: a.i, type: a.type, code: a.code, detail: a.detail })).slice(0, 8), assertions: (res.assertions || []).map(a => ({ i: a.i, scenario: a.scenario, type: a.type, ok: a.ok, ...(a.ok ? {} : { code: a.code }), evidence: trimEv(a.ok ? a.evidence : null) })), ...(res.partial ? { partial: true, not_shown: res.partial } : {}), ...(res.stale_result ? { stale_result: res.stale_result } : {}), ...(res.missing ? { missing: res.missing } : {}), ...(res.from_examples ? { from_examples: true } : {}), }
      : { realized: false, kind: null, why: 'no realization record', codes: ['no_record'], record: null, window: null };
    if (res && res.spec_view) entry.spec_view = res.spec_view;
    entry.clock_tolerance_used = res && res.window ? !coversInterval(exact.get(r.id) || [], toMin(res.window.from), toMin(res.window.to)) : null;
    entry.in_clock = !!(r.window && r.window.in_clock); entry.tier = r.tier; entry.status = r.status_effective; entry.shard = r.shard || null; coverageOf(entry, rg.open);
    out[r.id] = entry;
  }
  return { R, TL, EP, P, results, examples, problems, fileList, out, reg };
}

// ---- the totals and the Q17 verdict are computed from the ROWS of the document (the rows of this run, or the rows of a partial run merged over the earlier file), never carried over from an earlier file
const cnt = a => ({ rows: a.length, realized: a.filter(e => e.realized).length, realized_by_scene: a.filter(e => e.realization_class === 'scene').length, realized_partial: a.filter(e => e.partial).length, realized_by_card_only: a.filter(e => e.realization_class === 'card').length, uncovered_strict: a.filter(e => !e.q17_covered_strict).length, not_realized: a.filter(e => !e.realized).length, with_record: a.filter(e => e.record).length, no_record: a.filter(e => !e.record).length, covered_by_open_register_entry_only: a.filter(e => !e.realized && e.register_open.length).length, uncovered: a.filter(e => !e.q17_covered).length });
export function summarize(rows, epilogue) {
  const tl = Object.values(rows), ep = Object.values(epilogue), by = f => { const m = {}; for (const e of tl) { const k = f(e); m[k] = (m[k] || 0) + 1; } return Object.fromEntries(Object.entries(m).sort()); };
  const codes = {}; for (const e of tl) if (!e.realized) for (const c of e.codes || []) codes[c] = (codes[c] || 0) + 1;
  return { timeline: cnt(tl), epilogue: cnt(ep), realized_by_kind: by(e => (e.realized ? e.kind : 'not_realized')), not_realized_by_code: Object.fromEntries(Object.entries(codes).sort((a, b) => b[1] - a[1])), outside_clock: Object.entries(rows).filter(([, e]) => e.in_clock === false).map(([id]) => id) };
}
const Q17_DOC = 'ok: every timeline row and every epilogue row is realized (a scene or a tier-marked card) or covered by an open register entry. ok_strict: the same, but a row realized by a card alone, or only partially (not_shown parts), counts only if an open register entry also covers it (GATE-SPEC TL-4, TL-11, DD-G08 read a card as no visual realization). Both are false unless `complete` (every one of the expected rows is in this document) and the record files are free of problems. Neither sets a passes flag.';
export function q17Of(S, { problems = [], timelineRows, epilogueRows: epCount }) {
  const complete = S.timeline.rows === timelineRows && S.epilogue.rows === epCount, clean = !problems.length;
  return { _doc: Q17_DOC, complete, rows_expected: timelineRows, epilogue_rows_expected: epCount, ok: complete && clean && S.timeline.uncovered === 0 && S.epilogue.uncovered === 0, ok_strict: complete && clean && S.timeline.uncovered_strict === 0 && S.epilogue.uncovered_strict === 0,
    rows: S.timeline.rows, epilogue_rows: S.epilogue.rows, realized: S.timeline.realized, realized_by_scene: S.timeline.realized_by_scene, realized_partial: S.timeline.realized_partial, realized_by_card_only: S.timeline.realized_by_card_only, covered_by_open_register_entry_only: S.timeline.covered_by_open_register_entry_only, uncovered: S.timeline.uncovered, uncovered_strict: S.timeline.uncovered_strict, epilogue_uncovered: S.epilogue.uncovered, epilogue_uncovered_strict: S.epilogue.uncovered_strict };
}

// ---- the digest of the record files: the records as written, without the "result" that --update writes back (so that writing it does not change the digest it was computed under)
export function recordFilesDigest(extra = []) {
  const list = [...(exists(REAL) ? fs.readdirSync(REAL).filter(f => /^(tl-\d\d|epilogue|EXAMPLES)\.jsonl$/.test(f)).sort().map(f => path.join(REAL, f)) : []), ...extra.map(f => path.resolve(f)).filter(f => !path.resolve(f).startsWith(REAL + path.sep))].sort(), out = {};
  for (const f of list) { const { records, errors } = readRecordFile(f); out[rel(f)] = sha256(Buffer.from(JSON.stringify([records.map(({ rec, line }) => { const { result, ...r } = rec && typeof rec === 'object' ? rec : { _not_an_object: rec }; return [line, r]; }), errors.map(e => [e.line, e.error])]))).slice(0, 16); }
  return { digest: sha256(Buffer.from(JSON.stringify(out))).slice(0, 16), files: Object.keys(out).length };
}
export function inputsDigest(P, extraRecordFiles = []) {
  const parts = P.inputsParts(), records = recordFilesDigest(extraRecordFiles), digests = { ...parts.digests, records: records.digest };
  return { digest: sha256(Buffer.from(JSON.stringify(digests))).slice(0, 16), parts: digests, files: { ...parts.files, records: records.files } };
}

async function main() {
  const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
  if (argv.includes('--digests')) { const P = await openProduct(); await P.warm(); const d = inputsDigest(P); process.stdout.write(JSON.stringify({ harness: HARNESS, harness_digest: harnessDigest(), inputs_digest: d.digest, inputs_parts: d.parts, inputs_files: d.files }, null, 1) + '\n'); return; }
  const shards = opt('--shard') ? String(opt('--shard')).split(',') : null, files = opt('--file') ? String(opt('--file')).split(',') : null, rows = opt('--row') ? String(opt('--row')).split(',') : null;
  const partial = !!(shards || files || rows), write = opt('--write') === true || (!partial && !argv.includes('--no-write')), quiet = argv.includes('--quiet');
  const run = await runAll({ shards, files, rows });
  const { out, TL, EP, problems } = run, TLcount = TL.rows.length, EPcount = EP.length;
  const inRows = Object.fromEntries(TL.rows.map(r => [r.id, out[r.id]]).filter(([, v]) => v)), inEp = Object.fromEntries(EP.map(r => [r.id, out[r.id]]).filter(([, v]) => v));
  const ID = inputsDigest(run.P, files || []);
  let doc = { harness: HARNESS, harness_digest: harnessDigest(), inputs_digest: ID.digest, inputs_parts: ID.parts, inputs_files: ID.files, scope: { timeline_rows: Object.keys(inRows).length, epilogue_rows: Object.keys(inEp).length, files: run.fileList.map(f => rel(f.file)), partial }, totals: null, q17: null, record_file_problems: problems, rows: inRows, epilogue: inEp, examples: Object.fromEntries([...run.examples].map(([id, r]) => [id, { realized: r.realized, kind: r.kind, why: r.why, codes: r.codes, record: r.source }])) };
  if (partial && write) {                                    // a partial run written over the earlier file: the rows of this run replace their old rows; everything derived (totals, q17, scope) is recomputed from the merged rows
    const target = typeof opt('--out') === 'string' ? opt('--out') : path.join(REAL, 'RESULTS.json');
    if (exists(target)) {
      let old = null; try { old = readJSON(target); } catch { old = null; }
      if (old && old.rows) {
        const sameDigests = old.harness === doc.harness && old.harness_digest === doc.harness_digest && old.inputs_digest === doc.inputs_digest, carried = [...Object.keys(old.rows).filter(id => !(id in doc.rows)), ...Object.keys(old.epilogue || {}).filter(id => !(id in doc.epilogue))];
        doc = { ...doc, rows: { ...old.rows, ...doc.rows }, epilogue: { ...(old.epilogue || {}), ...doc.epilogue }, examples: { ...(old.examples || {}), ...doc.examples } };
        const order = TL.rows.map(r => r.id).filter(id => id in doc.rows); doc.rows = Object.fromEntries(order.map(id => [id, doc.rows[id]]));
        doc.scope = { ...doc.scope, timeline_rows: Object.keys(doc.rows).length, epilogue_rows: Object.keys(doc.epilogue).length, files: [...new Set([...(old.scope && old.scope.files || []), ...doc.scope.files])].sort(), partial: Object.keys(doc.rows).length < TLcount || Object.keys(doc.epilogue).length < EPcount, merged_over_earlier_file: true, rows_replaced: Object.keys(inRows).length + Object.keys(inEp).length, rows_carried_over: carried.length };
        if (!sameDigests && carried.length) doc.rows_from_other_digests = { _doc: 'these rows were computed by an earlier run under other digests (previous_digests); the file is not valid for a gate until a full run (check.mjs without --shard) replaces them', ids: carried, previous_digests: { harness_digest: old.harness_digest, inputs_digest: old.inputs_digest } };
      }
    }
  }
  const S = summarize(doc.rows, doc.epilogue); doc.totals = S; doc.q17 = q17Of(S, { problems, timelineRows: TLcount, epilogueRows: EPcount });
  if (doc.rows_from_other_digests) { doc.q17.ok = false; doc.q17.ok_strict = false; doc.q17.note = `false because ${doc.rows_from_other_digests.ids.length} row(s) of this file come from an earlier run under other digests: run check.mjs without --shard`; }
  if (write) {
    fs.mkdirSync(REAL, { recursive: true }); const target = typeof opt('--out') === 'string' ? opt('--out') : path.join(REAL, 'RESULTS.json'), tmp = target + '.' + process.pid + '.tmp'; fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(doc, null, 1) + '\n'); fs.renameSync(tmp, target);       // written whole, then renamed: a reader never sees half a file
  }
  if (argv.includes('--update')) {                                    // write each record's "result" back into its shard file (only the "result" field of records that validated or failed; nothing else changes)
    for (const f of run.fileList) { if (f.examples) continue; const { records } = readRecordFile(f.file); const lines = readText(f.file).split(/\r?\n/); for (const { rec, line } of records) { const res = run.results.get(rec.id); if (!res || res.source !== `${rel(f.file)}:${line}`) continue; rec.result = { realized: !!res.realized, why: String(res.why || '').slice(0, 300), digest: doc.harness_digest }; lines[line - 1] = JSON.stringify(rec); } fs.writeFileSync(f.file, lines.join('\n')); }
  }
  if (argv.includes('--json')) process.stdout.write(JSON.stringify(doc, null, 1) + '\n');
  else if (!quiet) {
    console.log(`bt-realize ${HARNESS} digest ${doc.harness_digest}, inputs ${doc.inputs_digest}: ${doc.scope.timeline_rows} timeline rows, ${doc.scope.epilogue_rows} epilogue rows, ${run.fileList.length} record file(s)${partial ? ' (partial run)' : ''}`);
    console.log(`  realized ${S.timeline.realized}; with a record ${S.timeline.with_record}; not realized ${S.timeline.not_realized} (open register entry only: ${S.timeline.covered_by_open_register_entry_only}); uncovered ${S.timeline.uncovered}; q17 ok ${doc.q17.ok}, ok_strict ${doc.q17.ok_strict}, complete ${doc.q17.complete}`);
    console.log(`  by kind: ${JSON.stringify(S.realized_by_kind)}`); console.log(`  not realized, by code: ${JSON.stringify(S.not_realized_by_code)}`);
    for (const p of problems) console.log(`  FILE PROBLEM ${p.file}:${p.line}: ${p.error}`);
    if (rows || (shards && shards.length === 1)) for (const [id, e] of Object.entries(inRows)) console.log(`  ${id} ${e.realized ? 'REALIZED' : 'not realized'} [${e.kind || '-'}] ${e.why}`);
  }
  process.exitCode = problems.some(p => /duplicate|JSON|Unexpected/.test(p.error)) ? 1 : 0;       // not process.exit: a large --json write to a pipe must be flushed first
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(e => { console.error(e && e.stack || e); process.exitCode = 2; });
