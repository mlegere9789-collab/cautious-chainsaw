#!/usr/bin/env node
// Parse docs/historian/sources-v2/Gettysburg_Sources_v2.docx into data-src/sources-v2/entries.json
//
//   node tools/sources-qc/parse.mjs [--docx <path>] [--out <path>]
//
// The document is treated as UNVERIFIED input. This stage only parses structure and records
// every count and claim the document makes about itself so later stages can test them.

import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocx } from './lib/docx.mjs';
import { canonicalKey, hostOf, normalizeUrl, urlSyntax, hathiIdOf, ehistoryOf } from './lib/urlnorm.mjs';
import {
  classifyLink, parseNonOrTitle, parseOrDescription, parseOrTitle, parsePageEntryTitle, parsePageRange,
} from './lib/entry-parse.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Roman numeral part headings. `expected` comes from the task brief (not from the document). */
export const PARTS = {
  I: { num: 1, side: 'union', or_part: 1, expected: 332 },
  II: { num: 2, side: 'other_federal', or_part: 2, expected: 45 },
  III: { num: 3, side: 'confederate', or_part: 2, expected: 166 },
  IV: { num: 4, expected: 9 },
  V: { num: 5, expected: 4 },
  VI: { num: 6, expected: 3 },
  VII: { num: 7, expected: 12 },
  VIII: { num: 8, expected: 7 },
  IX: { num: 9, expected: 47 },
  X: { num: 10, expected: 14 },
  XI: { num: 11, expected: 12 },
  XII: { num: 12, expected: 6 },
  XIII: { num: 13, or_part: 3, expected: 1057 },
};

function partIdFromHeading(text) {
  const m = /^Part\s+([IVX]+)\.\s*/.exec(text);
  return m && PARTS[m[1]] ? m[1] : null;
}

/**
 * Build the entry list from a paragraph list (from parseDocx or a synthetic one in tests).
 * Returns { entries, preamble, partHeadings, orphans }.
 */
export function buildEntries(paragraphs) {
  const entries = [];
  const preamble = [];
  const partHeadings = [];
  const partNotes = {};
  const orphans = [];
  let part = null;
  let cur = null;
  for (const p of paragraphs) {
    if (p.style === 'Heading1') {
      const id = partIdFromHeading(p.text);
      if (id) { part = { id, title: p.text }; partHeadings.push({ id, title: p.text, paragraph: p.index }); }
      else part = null;
      cur = null;
      continue;
    }
    if (p.style === 'Entry') {
      const m = /^(\d+)\.\s+([\s\S]*)$/.exec(p.text);
      if (!m) { orphans.push({ paragraph: p.index, text: p.text.slice(0, 120), why: 'entry_without_number' }); cur = null; continue; }
      cur = { n: Number(m[1]), title: m[2].trim(), title_raw: p.text, part, paragraph: p.index, detail: [] };
      entries.push(cur);
      continue;
    }
    if (p.style === 'Detail') {
      if (cur) cur.detail.push(p); else orphans.push({ paragraph: p.index, text: p.text.slice(0, 120), why: 'detail_without_entry' });
      continue;
    }
    // Title, Subtitle, unstyled paragraphs
    if (!part) preamble.push({ style: p.style, text: p.text });
    else if (p.text.trim()) { (partNotes[part.id] ||= []).push(p.text); cur = null; }
  }
  return { entries: entries.map(finishEntry), preamble, partHeadings, partNotes, orphans };
}

function finishEntry(raw) {
  const part = raw.part;
  const partId = part?.id ?? null;
  const meta = partId ? PARTS[partId] : null;
  const links = [];
  const descLines = [];
  for (const p of raw.detail) {
    const lab = /^(Link|Transcribed text|Transcribed issue|Transcribed page)\s*:\s*/.exec(p.text);
    const hrefSeg = p.segments.find((s) => s.rid);
    if (lab && hrefSeg) {
      const url = hrefSeg.href ?? hrefSeg.text.trim();
      links.push({ label: lab[1], url, display: hrefSeg.text.trim(), display_matches_target: hrefSeg.href == null ? null : hrefSeg.href === hrefSeg.text.trim() });
    } else if (lab && /^https?:\/\//i.test(p.text.slice(lab[0].length).trim())) {
      links.push({ label: lab[1], url: p.text.slice(lab[0].length).trim(), display: p.text.slice(lab[0].length).trim(), display_matches_target: null, not_a_hyperlink: true });
    } else {
      descLines.push(p.text);
      // a hyperlink in a free-text line would be missed otherwise
      for (const s of p.segments) if (s.rid) links.push({ label: 'inline', url: s.href ?? s.text.trim(), display: s.text.trim(), display_matches_target: s.href == null ? null : s.href === s.text.trim() });
    }
  }
  const description = descLines.join('\n');
  const kindOfEntry = !partId ? 'unknown' : meta.num <= 3 ? 'or_report' : meta.num === 13 ? 'or_page' : 'non_or';
  const entry = {
    id: `sv2-${String(raw.n).padStart(4, '0')}`,
    n: raw.n,
    part: partId,
    part_num: meta?.num ?? null,
    part_title: part?.title ?? null,
    kind: kindOfEntry,
    title: raw.title,
    description,
    links: links.map((l) => {
      const host = hostOf(l.url);
      const syn = urlSyntax(l.url);
      return {
        label: l.label,
        url: l.url,
        display: l.display,
        display_matches_target: l.display_matches_target,
        host,
        normal: normalizeUrl(l.url),
        key: canonicalKey(l.url),
        syntax: syn.problems,
        kind: classifyLink({ label: l.label, host, url: l.url, title: raw.title, description }),
      };
    }),
    fields: {},
  };
  if (l0(entry) && meta?.side) entry.fields.side = meta.side;
  if (kindOfEntry === 'or_report') {
    const t = parseOrTitle(raw.title);
    const d = parseOrDescription(descLines);
    const hathi = entry.links.map((l) => hathiIdOf(l.url)).find(Boolean) ?? null;
    const eh = entry.links.map((l) => ehistoryOf(l.url)).find(Boolean) ?? null;
    entry.fields = {
      ...entry.fields,
      or_vol: 27,
      or_part: meta.or_part,
      report_no: t?.report_no ?? null,
      doc_kind: t?.doc_kind ?? null,
      doc_kind_from_description: d.doc_kind_desc,
      rank: t?.rank ?? null,
      author: t?.author ?? null,
      unit_text: t?.unit_text ?? null,
      title_after_number: t?.raw ?? null,
      page_start: d.range?.start ?? null,
      page_end: d.range?.end ?? null,
      desc_vol: d.range?.vol ?? null,
      desc_part: d.range?.part ?? null,
      report_no_in_description: d.report_no_in_desc,
      dixon_flag: d.dixon_flag,
      description_template: d.template,
      hathi_id: hathi?.id ?? null,
      hathi_seq: hathi?.seq ?? null,
      ehistory_serial: eh?.serial ?? null,
      ehistory_page: eh?.page ?? null,
    };
  } else if (kindOfEntry === 'or_page') {
    const t = parsePageEntryTitle(raw.title);
    const eh = entry.links.map((l) => ehistoryOf(l.url)).find(Boolean) ?? null;
    entry.fields = {
      ...entry.fields,
      or_vol: t?.vol ?? null,
      or_part: t?.part ?? null,
      page: t?.page ?? null,
      page_label: t?.label ?? null,
      page_side: t?.side ?? null,
      ehistory_serial: eh?.serial ?? null,
      ehistory_page: eh?.page ?? null,
      description_template: description.replace(/\d[\d,]*/g, '#').replace(/\s+/g, ' ').slice(0, 160),
    };
  } else if (kindOfEntry === 'non_or') {
    const f = parseNonOrTitle(raw.title);
    entry.fields = { ...entry.fields, ...f };
    const r = parsePageRange(description);
    if (r) entry.fields.or_pages_in_description = r;
    const hathi = entry.links.map((l) => hathiIdOf(l.url)).find(Boolean);
    if (hathi) entry.fields.hathi_id = hathi.id;
  }
  return entry;
}
const l0 = () => true;

/** Statements the document makes about itself, parsed from its preamble. */
export function documentClaims(preamble) {
  const text = preamble.map((p) => p.text).join('\n');
  const total = /(\d[\d,]*)\s+numbered entries/.exec(text);
  const docs = /\((\d[\d,]*)\s+individual documents\/works\s*\+\s*(\d[\d,]*)\s+page-level entries/.exec(text);
  const gap = /Union Reports Nos\.\s*(\d+)\D+(\d+)[^.]*omitted except (\w+)/.exec(text);
  return {
    total_entries: total ? Number(total[1].replace(/,/g, '')) : null,
    individual_documents: docs ? Number(docs[1]) : null,
    page_level_entries: docs ? Number(docs[2]) : null,
    gap_union_reports: gap ? { from: Number(gap[1]), to: Number(gap[2]), exceptions: gap[3] } : null,
    asked_for_4000: /4,000 entries/.test(text),
    mentions_link_provenance: /I did not generate URLs from guesswork/.test(text),
  };
}

export function validateParse({ entries, partHeadings }, claims) {
  const issues = [];
  const byPart = {};
  for (const e of entries) byPart[e.part] = (byPart[e.part] || 0) + 1;
  for (const [id, meta] of Object.entries(PARTS)) {
    if ((byPart[id] || 0) !== meta.expected) issues.push({ code: 'part_count', part: id, expected: meta.expected, actual: byPart[id] || 0 });
  }
  entries.forEach((e, i) => { if (e.n !== i + 1) issues.push({ code: 'numbering', index: i, n: e.n }); });
  const ids = new Set(entries.map((e) => e.id));
  if (ids.size !== entries.length) issues.push({ code: 'duplicate_ids' });
  if (claims.total_entries != null && claims.total_entries !== entries.length) issues.push({ code: 'doc_total_mismatch', claimed: claims.total_entries, actual: entries.length });
  const docs = entries.filter((e) => e.part_num !== 13).length;
  const pages = entries.filter((e) => e.part_num === 13).length;
  if (claims.individual_documents != null && claims.individual_documents !== docs) issues.push({ code: 'doc_individual_mismatch', claimed: claims.individual_documents, actual: docs });
  if (claims.page_level_entries != null && claims.page_level_entries !== pages) issues.push({ code: 'doc_page_level_mismatch', claimed: claims.page_level_entries, actual: pages });
  if (partHeadings.length !== Object.keys(PARTS).length) issues.push({ code: 'part_heading_count', expected: Object.keys(PARTS).length, actual: partHeadings.length });
  for (const e of entries) if (!e.links.length) issues.push({ code: 'entry_without_link', n: e.n });
  return { issues, by_part: byPart, documents: docs, page_entries: pages };
}

function main(argv) {
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const docxPath = resolve(ROOT, arg('--docx', 'docs/historian/sources-v2/Gettysburg_Sources_v2.docx'));
  const outPath = resolve(ROOT, arg('--out', 'data-src/sources-v2/entries.json'));
  const bytes = readFileSync(docxPath);
  const doc = parseDocx(docxPath);
  const built = buildEntries(doc.paragraphs);
  const claims = documentClaims(built.preamble);
  const validation = validateParse(built, claims);
  const out = {
    meta: {
      schema: 'sources-v2-entries/1',
      source_file: 'docs/historian/sources-v2/Gettysburg_Sources_v2.docx',
      source_sha256: createHash('sha256').update(bytes).digest('hex'),
      source_bytes: bytes.length,
      docx_parts: doc.zipNames,
      docx_paragraphs: doc.paragraphs.length,
      docx_relationships: doc.relCount,
      parser: 'tools/sources-qc/parse.mjs',
      note: 'Every field is what the document says. Nothing here is verified; see qc/auto.json.',
      entry_count: built.entries.length,
      part_counts: validation.by_part,
      expected_part_counts: Object.fromEntries(Object.entries(PARTS).map(([k, v]) => [k, v.expected])),
      document_claims: claims,
      validation: validation.issues,
      orphans: built.orphans,
      preamble: built.preamble,
      part_notes: built.partNotes,
    },
    parts: built.partHeadings.map((h) => {
      const es = built.entries.filter((e) => e.part === h.id);
      return { id: h.id, title: h.title, first_n: es[0]?.n ?? null, last_n: es.at(-1)?.n ?? null, count: es.length, expected: PARTS[h.id].expected };
    }),
    entries: built.entries,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 1) + '\n');
  console.log(`entries: ${built.entries.length}  links: ${built.entries.reduce((a, e) => a + e.links.length, 0)}`);
  console.log('per part:', JSON.stringify(validation.by_part));
  console.log('document claims:', JSON.stringify(claims));
  console.log('validation issues:', validation.issues.length ? JSON.stringify(validation.issues) : 'none');
  if (built.orphans.length) console.log('orphans:', built.orphans.length);
  return validation.issues.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exit(main(process.argv.slice(2)));
