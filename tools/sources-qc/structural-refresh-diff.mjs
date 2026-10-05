#!/usr/bin/env node
// What did re-running the structural check against the current historian corpus change?
//
//   node tools/sources-qc/structural-refresh-diff.mjs --old <old structural.json> [--new data-src/sources-v2/qc/structural.json] [--out data-src/sources-v2/qc/structural-refresh.json]
//
// The auditors (R2-audit-A, R3-audit-A) found the stored structural result stale against the committed historian files
// (reports.json and dispatches.json were rebuilt on 2026-10-04). Re-running structural-check.mjs is offline and read-only on
// the historian workstream's files; this script records, in one small file, exactly what moved so nothing changes silently.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const oldPath = arg('--old', null);
if (!oldPath) { console.error('usage: structural-refresh-diff.mjs --old <path>'); process.exit(2); }
const newPath = resolve(ROOT, arg('--new', 'data-src/sources-v2/qc/structural.json'));
const outPath = resolve(ROOT, arg('--out', 'data-src/sources-v2/qc/structural-refresh.json'));

const a = JSON.parse(readFileSync(resolve(oldPath), 'utf8'));
const b = JSON.parse(readFileSync(newPath, 'utf8'));
const sa = new Map(a.results.map((r) => [r.n, r]));
const sb = new Map(b.results.map((r) => [r.n, r]));

const statusChanges = [];
const pageChanges = [];
let dispatchCountChanges = 0;
let dispatchPagesCompared = 0;
for (const [n, r] of sa) {
  const q = sb.get(n);
  if (!q) continue;
  if (r.status !== q.status) statusChanges.push({ n, old: r.status, new: q.status, old_flags: r.flags, new_flags: q.flags });
  const pa = JSON.stringify(r.ocr?.pages ?? null);
  const pb = JSON.stringify(q.ocr?.pages ?? null);
  if (pa !== pb) pageChanges.push({ n, old_ocr_pages: r.ocr?.pages ?? null, new_ocr_pages: q.ocr?.pages ?? null });
  if (r.type === 'or_page') {
    dispatchPagesCompared++;
    if ((r.dispatches ?? 0) !== (q.dispatches ?? 0)) dispatchCountChanges++;
  }
}

const out = {
  schema: 'sources-v2-structural-refresh/1',
  generator: 'tools/sources-qc/structural-refresh-diff.mjs',
  note: 'The old result is the one committed in 3af9094 (computed 2026-09-30 against the first build of the historian OR27 corpus); the new one is structural.json as it stands (computed against the second build, committed 2026-10-04). Nothing in the list or in the reviews changed; only the historian files that the structural check compares against.',
  inputs_old: Object.fromEntries(Object.entries(a.meta.inputs ?? {}).map(([k, v]) => [k, { path: v.path, sha256: v.sha256 }])),
  inputs_new: Object.fromEntries(Object.entries(b.meta.inputs ?? {}).map(([k, v]) => [k, { path: v.path, sha256: v.sha256 }])),
  inputs_changed: Object.keys(b.meta.inputs ?? {}).filter((k) => a.meta.inputs?.[k]?.sha256 !== b.meta.inputs?.[k]?.sha256),
  tallies_old: a.meta.tallies,
  tallies_new: b.meta.tallies,
  part_xiii_old: a.meta.part_xiii,
  part_xiii_new: b.meta.part_xiii,
  status_changes: statusChanges,
  ocr_page_range_changes: pageChanges,
  or_page_pointers_compared: dispatchPagesCompared,
  or_page_pointers_whose_dispatch_count_changed: dispatchCountChanges,
};
writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ status_changes: statusChanges.length, ocr_page_range_changes: pageChanges.length, pointers_dispatch_count_changed: dispatchCountChanges, inputs_changed: out.inputs_changed, part_xiii_old: a.meta.part_xiii, part_xiii_new: b.meta.part_xiii }, null, 1));
