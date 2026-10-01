#!/usr/bin/env node
// Structural check of the Official Records entries (Parts I-III) and page pointers (Part XIII) against the
// OCR-derived index of the Internet Archive scans. Read-only on the historian workstream's files.
//
//   node tools/sources-qc/structural-check.mjs [--out data-src/sources-v2/qc/structural.json]
//
// Inputs (read only, never written here; their sha256 is recorded so a stale result is detectable):
//   data-src/sources-v2/entries.json
//   historian-src/corpus/or27/reports.json       (588 reports segmented from the OCR headers)
//   historian-src/corpus/or27/dispatches.json    (2,945 Part 3 dispatches with their printed pages)
//   historian-src/raw/or27/passages.jsonl        (passage text with printed-page spans; used for the one report whose header was lost)
//   historian-src/raw/or27/normalized-1.txt      (OCR text of Part 1; contents list)
//   tmp/historian-cache/*page_numbers.json       (the Archive's own folio maps for the three parts)

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPageSides, checkPagePointer, checkReportEntry, contentsLineCheck, surnameOf } from './lib/structural.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => join(ROOT, p);
const sha = (b) => createHash('sha256').update(b).digest('hex');

export const INPUTS = {
  entries: 'data-src/sources-v2/entries.json',
  reports: 'historian-src/corpus/or27/reports.json',
  dispatches: 'historian-src/corpus/or27/dispatches.json',
  passages: 'historian-src/raw/or27/passages.jsonl',
  normalized1: 'historian-src/raw/or27/normalized-1.txt',
  normalized2: 'historian-src/raw/or27/normalized-2.txt',
};

function loadFolios() {
  const dir = rel('tmp/historian-cache');
  const out = {};
  const files = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.meta.json')) continue;
    const m = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const mm = /warofrebellion27(\d)unit_page_numbers\.json$/.exec(m.url ?? '');
    if (!mm) continue;
    const bodyPath = join(dir, f.replace('.meta.json', '.body'));
    const j = JSON.parse(readFileSync(bodyPath, 'utf8'));
    const set = new Set((j.pages ?? []).filter((x) => /^\d{1,4}$/.test(String(x.pageNumber ?? ''))).map((x) => Number(x.pageNumber)));
    out[Number(mm[1])] = set;
    files[mm[1]] = { url: m.url, sha256: m.sha256, folios: set.size, leaves: (j.pages ?? []).length, max_folio: Math.max(...set) };
  }
  return { sets: out, files };
}

export function run({ outPath } = {}) {
  const hashes = {};
  const raw = {};
  for (const [k, p] of Object.entries(INPUTS)) {
    if (!existsSync(rel(p))) throw new Error(`missing input ${p}`);
    const b = readFileSync(rel(p));
    hashes[k] = { path: p, bytes: b.length, sha256: sha(b) };
    raw[k] = b;
  }
  const entries = JSON.parse(raw.entries.toString('utf8')).entries;
  const reports = JSON.parse(raw.reports.toString('utf8')).reports;
  const dsp = JSON.parse(raw.dispatches.toString('utf8'));
  const dRows = dsp.rows.map((r) => Object.fromEntries(dsp.fields.map((f, i) => [f, r[i]])));
  const passages = raw.passages.toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const n1 = raw.normalized1.toString('utf8');
  const fol = loadFolios();

  const repMap = new Map(reports.map((r) => [`${r.part}:${r.no}`, r]));
  // the HathiTrust volume ids as the historian manifest verified them (rights statement URL of each OCR source)
  const manifest = JSON.parse(readFileSync(rel('historian-src/corpus/or27/manifest.json'), 'utf8'));
  hashes.manifest = { path: 'historian-src/corpus/or27/manifest.json', sha256: sha(readFileSync(rel('historian-src/corpus/or27/manifest.json'))) };
  const hathiVolume = {};
  for (const s of manifest.sources) {
    const m = /htid\/([^/]+?)\.json$/.exec(s.rights_statement_url ?? '');
    const p = /^or27-(\d)$/.exec(s.source ?? '');
    if (m && p) hathiVolume[Number(p[1])] = m[1];
  }
  // Parts II and III of the list are both "OR vol. 27 Part 2"; Part XIII is Part 3
  const orEntries = entries.filter((e) => e.kind === 'or_report');
  const hathiOffsetMode = {};
  for (const part of [1, 2]) {
    const cnt = new Map();
    for (const e of orEntries.filter((x) => x.fields.or_part === part)) cnt.set(e.fields.hathi_seq - e.fields.page_start, (cnt.get(e.fields.hathi_seq - e.fields.page_start) ?? 0) + 1);
    hathiOffsetMode[part] = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // fallback for a report whose header the OCR index missed: contents-list line + signature on the claimed pages
  const fallback = (e) => {
    const c = contentsLineCheck(n1, e);
    const sur = (surnameOf(e.fields.author) ?? '').toUpperCase();
    const hit = passages.filter((p) => p.part === e.fields.or_part && p.pg?.some((g) => g[1] >= e.fields.page_start && g[1] <= e.fields.page_end) && sur && p.text.includes(sur));
    const pages = [...new Set(hit.flatMap((p) => p.pg.map((g) => g[1])))].sort((a, b) => a - b);
    return {
      ok: !!c.ok && hit.length > 0,
      contents_list: c,
      signature_passages: hit.map((p) => p.id),
      signature_pages: pages,
      note: 'signature surname in capitals found in a passage whose printed-page span overlaps the claimed pages',
    };
  };

  const results = [];
  const rctx = { reports: repMap, folios: fol.sets, hathiVolume, hathiOffsetMode, fallback };
  for (const e of orEntries) results.push({ n: e.n, id: e.id, type: 'or_report', ...checkReportEntry(e, rctx) });

  const pageEntries = entries.filter((e) => e.kind === 'or_page');
  const lastFolio = fol.files[3]?.max_folio ?? 1241;
  const pageSides = buildPageSides(dRows, lastFolio);
  const pctx = { pageSides, folios3: fol.sets[3], lastFolio };
  for (const e of pageEntries) results.push({ n: e.n, id: e.id, type: 'or_page', ...checkPagePointer(e, pctx) });

  const covered = new Set(pageEntries.map((e) => e.fields.page));
  const beyond = dRows.filter((r) => r.page != null && !covered.has(r.page) && r.page > 3);
  const firstConf = Math.min(...dRows.filter((r) => r.side === 'confederate' && r.page != null).map((r) => r.page));
  const lastUnion = Math.max(...dRows.filter((r) => r.side === 'union' && r.page != null && r.page < firstConf).map((r) => r.page));

  const tally = (type) => {
    const rs = results.filter((r) => r.type === type);
    const by = {};
    for (const r of rs) by[r.status] = (by[r.status] ?? 0) + 1;
    return { total: rs.length, by_status: by };
  };
  const flagCounts = {};
  const noteCounts = {};
  for (const r of results) {
    for (const f of r.flags) flagCounts[f] = (flagCounts[f] ?? 0) + 1;
    for (const f of r.notes) { const k = f.replace(/\d+/g, '#'); noteCounts[k] = (noteCounts[k] ?? 0) + 1; }
  }
  const out = {
    meta: {
      schema: 'sources-v2-structural/1',
      generator: 'tools/sources-qc/structural-check.mjs',
      note: 'Independent derivation: OCR header index of the Internet Archive scans (historian ingestion) vs the list. HathiTrust and eHistory links are not fetched (403 to bots); only their shape is checked.',
      inputs: hashes,
      ia_folio_maps: fol.files,
      hathi_volume_ids_from_historian_manifest: hathiVolume,
      hathi_seq_modal_offset_by_part: hathiOffsetMode,
      ocr_index: { reports: reports.length, part1: reports.filter((r) => r.part === 1).length, part2: reports.filter((r) => r.part === 2).length, dispatches: dRows.length },
      part_xiii: {
        pages_listed: pageEntries.length,
        first_page: Math.min(...covered),
        last_page: Math.max(...covered),
        contiguous: Math.max(...covered) - Math.min(...covered) + 1 === covered.size,
        volume_last_folio: lastFolio,
        first_confederate_dispatch_page: firstConf,
        last_union_dispatch_before_it: lastUnion,
        dispatches_on_pages_not_listed: beyond.length,
        pages_not_listed_with_dispatches: [...new Set(beyond.map((r) => r.page))].length,
      },
      tallies: { or_report: tally('or_report'), or_page: tally('or_page') },
      flag_counts: flagCounts,
      note_counts: noteCounts,
    },
    results,
  };
  const p = outPath ?? rel('data-src/sources-v2/qc/structural.json');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 1) + '\n');
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const i = process.argv.indexOf('--out');
  const out = run({ outPath: i >= 0 ? resolve(process.argv[i + 1]) : undefined });
  console.log(JSON.stringify({ tallies: out.meta.tallies, flag_counts: out.meta.flag_counts, note_counts: out.meta.note_counts, part_xiii: out.meta.part_xiii }, null, 1));
}
