#!/usr/bin/env node
// Build the vetted registry of Gettysburg_Sources_v2.docx.
//
//   node tools/sources-qc/build-registry.mjs [--date 2026-10-05]
//
// Reads (all under data-src/sources-v2/):
//   entries.json                          the 1714 entries exactly as the document states them (parse.mjs)
//   qc/review-pass1.json, review-pass2.json          first partial run: entries 586-597, two reviewers (flat arrays)
//   qc/review-pass1-r2.json, review-pass2-r2.json    second run: first-pass batches R1n-0..8 (R1n-4/5 and R1n-7/8 cover the same
//                                         entries, so those have two first-pass reviews), R2-audit-A (Official Records
//                                         description audit), R3-audit-A (Part XIII page sample), and the second-pass audits
//   qc/r3/pass1-a.json, pass1-b.json, pass2-a.json, pass2-b.json   the 14 entries missed earlier
//   qc/review-norm.json                   hand-written first-run overlay for entries 586-597 only (corrected titles, ingest recipes)
//   qc/reviewer-attested.json             facts the reviewers stated in prose, each anchored by a verbatim phrase (checked here)
//   qc/structural.json                    OR entries and page pointers against the OCR index (structural-check.mjs)
//   qc/structural-refresh.json            what re-running the structural check against the current historian corpus changed
//   qc/link-probe.json                    the first run's link probe and the HathiTrust catalog records of the OR volumes
//   qc/ia-verify.json                     the Internet Archive metadata of every item a reviewer named (verify-ia.mjs)
// Writes:
//   registry.json, ingest-queue.json, qc/registry-stats.json, qc/review-queue-next.json and docs/historian/sources-v2/QC-REPORT.md
//
// Nothing here touches the network or the historian workstream's files.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orAudit, pointerAudit } from './lib/audit.mjs';
import { attestedIndex, checkAnchors } from './lib/attested.mjs';
import { classOf, overlapOf, SELF_REFERENTIAL, WORK_GROUPS } from './lib/classes.mjs';
import { buildVocab, deriveReview, keyOfToken } from './lib/derive.mjs';
import { mergeReviewed, RELEVANCE_RANK } from './lib/nonor.mjs';
import { applyLocatorCorrection, blockingIssue, decideCrosswalk, decidePointer, rightsHint, STATUSES } from './lib/registry.mjs';
import { renderQcReport } from './lib/report.mjs';
import { loadReviews, makeReader, REVIEW_FILES } from './lib/reviews.mjs';
import { hathiIdOf } from './lib/urlnorm.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SV2 = 'data-src/sources-v2';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

const excerpt = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

const OR_RESOURCE = { report: 'official-report', return: 'casualty-or-strength-return', itinerary: 'itinerary', organization: 'order-of-battle', honors: 'roster-of-honor', proceedings: 'court-of-inquiry-record', other: 'other-official-document' };
const MIN_REVIEWERS = 2;

export function build({ date, root = ROOT } = {}) {
  const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const sha = (p) => createHash('sha256').update(readFileSync(join(root, p))).digest('hex');

  const entriesDoc = readJson(`${SV2}/entries.json`);
  const entries = entriesDoc.entries;
  const norm = readJson(`${SV2}/qc/review-norm.json`);
  const attested = readJson(`${SV2}/qc/reviewer-attested.json`);
  const structural = readJson(`${SV2}/qc/structural.json`);
  const structuralRefresh = readJson(`${SV2}/qc/structural-refresh.json`);
  const probe = readJson(`${SV2}/qc/link-probe.json`);
  const iaVerify = readJson(`${SV2}/qc/ia-verify.json`);
  const sres = new Map(structural.results.map((r) => [r.n, r]));
  const hathiApi = probe.api.hathi_catalog;
  const iaApi = iaVerify.items;

  const loaded = loadReviews(makeReader(root));
  const anchors = checkAnchors(attested, loaded);
  if (anchors.missing.length) throw new Error(`reviewer-attested.json: ${anchors.missing.length} anchor phrase(s) not found in the reviewer text: ${JSON.stringify(anchors.missing.slice(0, 3))}`);
  const att = attestedIndex(attested);

  const reviewsByN = new Map();
  for (const r of loaded.reviews) { if (!reviewsByN.has(r.n)) reviewsByN.set(r.n, []); reviewsByN.get(r.n).push(r); }
  const nonOrReviews = loaded.reviews.filter((r) => r.n >= 544 && r.n <= 657);
  const vocab = buildVocab(nonOrReviews.flatMap((r) => [r.item.replacement_url, r.item.extraction_notes]));
  const orAud = orAudit(loaded.reviews);
  const ptAud = pointerAudit(loaded.reviews);
  const descSystemic = orAud.summary.systematic_sample.systemic_test;

  const inputFiles = [`${SV2}/entries.json`, ...REVIEW_FILES.map((f) => `${SV2}/qc/${f.file}`), `${SV2}/qc/review-norm.json`, `${SV2}/qc/reviewer-attested.json`, `${SV2}/qc/structural.json`, `${SV2}/qc/structural-refresh.json`, `${SV2}/qc/link-probe.json`, `${SV2}/qc/ia-verify.json`];
  const absent = ['qc/auto.json', 'qc/review-queues.json'].filter((f) => !existsSync(join(root, SV2, f)));

  // ------------------------------------------------------------------ hard duplicates (identical volume / document identity)
  const hathiVolumeByPart = structural.meta.hathi_volume_ids_from_historian_manifest; // {1,2,3}
  const firstOf = (part) => entries.find((e) => e.part === part);
  const volumeDup = {
    572: { id: hathiVolumeByPart[1], part: 1, into: firstOf('I'), enum: 'ser.1:v.27:pt.1' },
    573: { id: hathiVolumeByPart[2], part: 2, into: firstOf('II'), enum: 'ser.1:v.27:pt.2' },
    657: { id: hathiVolumeByPart[3], part: 3, into: firstOf('XIII'), enum: 'ser.1:v.27:pt.3' },
  };
  const canonicalDup = { 599: 595 };

  // ------------------------------------------------------------------ work groups
  const groupOf = new Map();
  for (const g of WORK_GROUPS) for (const m of g.members) groupOf.set(m, g);

  const out = [];
  for (const e of entries) {
    const base = { id: e.id, n: e.n, part: e.part, part_title: e.part_title, entry_kind: e.kind, title: e.title, listed_description: e.kind === 'non_or' ? e.description : null };
    if (e.kind === 'or_report') out.push(orReport(e, base));
    else if (e.kind === 'or_page') out.push(orPage(e, base));
    else out.push(nonOr(e, base));
  }

  // ---------------------------------------------------------------- Parts I-III
  function orReport(e, base) {
    const f = e.fields;
    const s = sres.get(e.n);
    const aud = orAud.records.get(e.n) ?? null;
    let d = decideCrosswalk(s);
    const corr = att.locatorCorrections.get(e.n);
    if (d.status === 'APPROVED-CROSSWALK') d = applyLocatorCorrection(d, corr);
    if (d.status === 'APPROVED-CROSSWALK' && aud && Object.values(aud.verdicts).some((v) => v !== 'APPROVE')) {
      d = { status: 'NEEDS-HUMAN-REVIEW', rule: 'R11c-audit-reviewer-asked-for-review', reason: `An audit reviewer did not approve this entry (${Object.entries(aud.verdicts).map(([k, v]) => `${k}: ${v}`).join('; ')}); their rationale is kept in audit.reviews.` };
    }
    const hv = hathiApi[f.hathi_id];
    const item = hv?.record?.items?.[0];
    const flagsOut = [];
    if (s?.ocr?.scope && s.ocr.scope !== 'gettysburg') flagsOut.push('description-claims-gettysburg-campaign-but-ocr-scope-is-other');
    if (s?.ocr?.composite) flagsOut.push('composite-document-several-papers-under-one-heading');
    if (['return', 'itinerary', 'order_of_battle', 'roster', 'testimony'].includes(f.doc_kind_from_description) || (s?.ocr && s.ocr.kind !== 'report')) flagsOut.push('not-an-after-action-report');
    flagsOut.push('description-is-a-generic-template');
    if (descSystemic.systemic) flagsOut.push('description-untrusted-template-inaccurate-in-the-audit-sample');
    const doubts = att.locatorDoubts.get(e.n) ?? [];
    for (const x of doubts) flagsOut.push(`locator-doubt-${x.kind}`);
    const notes = att.ocrNotes.get(e.n) ?? [];
    for (const x of notes) flagsOut.push('ocr-defect-noted-by-audit');
    const written = s?.ocr?.written ? { iso: s.ocr.written, lag_days_after_battle: s.ocr.persp?.lag_days ?? null, basis: 'OCR header of the scan (historian ingestion)' } : null;
    const ocrPages = s?.ocr?.pages ? [s.ocr.pages.start, s.ocr.pages.end] : null;
    const trust = aud
      ? (aud.description_rating === 'accurate' ? (aud.reviewers.length >= 2 ? 'audited-accurate-by-two-reviewers' : 'audited-accurate-by-one-reviewer') : `audited-${aud.description_rating}`)
      : descSystemic.systemic ? 'untrusted' : 'unaudited';
    const verifiers = ['structural-check', ...(aud?.reviewers ?? [])];
    return {
      ...base,
      links: e.links.map((l) => ({ url: l.url, host: l.host, listed_kind: l.kind, link_class: 'blocked_to_bots', class_basis: 'host refuses automated fetches (HTTP 403, task brief); not probed, not circumvented; only the link shape was checked structurally' })),
      resource_class: OR_RESOURCE[s?.ocr?.kind] ?? 'official-report',
      counts_as_writing_piece: true,
      final_status: d.status,
      status_rule: d.rule,
      status_reason: d.reason,
      tier: 'A1',
      tier_basis: `US Government publication (War Department / GPO, 1889), public domain (17 U.S.C. 105; the plan's Tier A basis). HathiTrust catalog API fetched in the first run for ${f.hathi_id}: ${item ? `${item.enumcron}, ${item.orig}, rights "${item.rights}"` : 'record not available'}. The text source is the Internet Archive OCR (historian manifest license_id PD-US-Gov), not the linked HathiTrust or eHistory pages.`,
      usable_for: ['citation-crosswalk', 'link-out-citation'],
      side: f.side === 'other_federal' ? 'union' : f.side,
      genre: OR_RESOURCE[s?.ocr?.kind] ?? 'official-report',
      written,
      retrospective: s?.ocr?.persp ? !!s.ocr.persp.retrospective : null,
      persp_tags: [f.side === 'other_federal' ? 'union' : f.side, s?.ocr?.level ?? null, s?.ocr?.scope ?? null].filter(Boolean),
      flags: flagsOut,
      description_trust: trust,
      description_audit: aud ? { rating: aud.description_rating, ratings_by_reviewer: aud.description_ratings, raters_differ: aud.description_raters_differ } : null,
      verification: { verifiers, structural: s ? { status: s.status, flags: s.flags, notes: s.notes, summary: { pages: s.checks.pages ? { cls: s.checks.pages.cls, docx: s.checks.pages.docx, ocr: s.checks.pages.ocr } : null, author_ok: s.checks.author?.ok ?? null, side_ok: s.checks.side?.ok ?? null, kind_ok: s.checks.kind?.ok ?? null, hathi_seq_offset: s.checks.hathi_seq_offset?.offset ?? null, fallback: s.checks.fallback ? { ok: s.checks.fallback.ok, contents_list: s.checks.fallback.contents_list?.contents_line ?? null, signature_pages: s.checks.fallback.signature_pages } : null } } : null, passes: null, agreement: null },
      audit: aud ? { ...aud, locator_correction: corr ? { kind: corr.kind, listed_first_page: corr.listed_first_page, first_page: corr.first_page, anchor: { batch: corr.batch, phrase: corr.phrase } } : null } : null,
      locator_doubts: doubts.map((x) => ({ kind: x.kind, listed: x.listed_first_page ?? x.listed_end_page, found: x.first_page ?? x.end_page, image_viewed: x.image_viewed, anchor: { batch: x.batch, phrase: x.phrase } })),
      ocr_notes: notes.map((x) => ({ note: x.note, anchor: { batch: x.batch, phrase: x.phrase } })),
      or_locator: {
        or_ser: 'I', or_vol: 27, or_part: f.or_part, report_no: f.report_no,
        listed_pages: [f.page_start, f.page_end], ocr_pages: ocrPages,
        first_page_to_use: corr ? corr.first_page : ocrPages ? ocrPages[0] : f.page_start,
        first_page_corrected_by_audit: !!corr,
        ocr_id: s?.ocr?.id ?? (s?.checks?.fallback?.ok ? `unindexed (header lost); signature on printed p. ${s.checks.fallback.signature_pages.join(',')}` : null),
        scan: s?.ocr?.scan ?? null,
      },
      evidence: [
        { type: 'structural-check', ref: `${SV2}/qc/structural.json#n=${e.n}`, summary: `status ${s?.status}; pages ${s?.checks?.pages?.cls ?? 'n/a'}; author ${s?.checks?.author?.ok ? 'agrees' : 'differs'}; side ${s?.checks?.side?.ok ? 'agrees' : 'differs'}` },
        { type: 'ocr-index', ref: 'historian-src/corpus/or27/reports.json', summary: s?.ocr ? `${s.ocr.id} pp. ${s.ocr.pages.start}-${s.ocr.pages.end}, scope ${s.ocr.scope}, ${s.ocr.words ?? '?'} words` : 'header not in the OCR index; confirmed through the contents list and the signature on the claimed pages' },
        { type: 'hathitrust-catalog-api', ref: `${SV2}/qc/link-probe.json#api.hathi_catalog.${f.hathi_id}`, summary: item ? `${item.enumcron}; ${item.orig}; "${item.rights}"` : 'not available' },
        ...(aud?.reviews ?? []).map((r) => ({ type: `audit-pass${r.pass}`, ref: r.ref, summary: `${r.verdict}; description ${r.description_accuracy}; ${excerpt(r.evidence, 200)}` })),
      ],
      replacement_urls: (aud?.reviews ?? []).filter((r) => r.replacement_url).map((r) => ({ url: r.replacement_url, kind: 'internet-archive-deep-link', proposed_by: [r.id], verified_by: [r.id], strength: 'the audit reviewer fetched and viewed this page image', status: 'reviewer-verified' })),
      duplicate_of: null,
      work_group: `or27-part${f.or_part}`,
      catalog_overlap: { catalog_ids: ['H1:SRC-01', 'H1:SRC-02', 'H2:SRC-19'], why: 'already ingested from the Internet Archive OCR (reports.json holds the report); this entry adds a citation crosswalk and a scan link-out only', basis: 'historian manifest' },
      description_issues: [...flagsOut, ...(aud?.reviews ?? []).flatMap((r) => (r.issues ?? []).slice(0, 2))],
      next_step: d.status === 'APPROVED-CROSSWALK' ? 'use as the citation crosswalk to the OR27 ingestion; do not rely on the listed description (see description_trust)' : corr ? `a human confirms that this report begins on printed p. ${corr.first_page} (the list says p. ${corr.listed_first_page}); the audit reviewer viewed the scan` : 'a human decides which page is the first page of the report (see or_locator) before the link is used',
    };
  }

  // ---------------------------------------------------------------- Part XIII
  function orPage(e, base) {
    const f = e.fields;
    const s = sres.get(e.n);
    const aud = ptAud.records.get(e.n) ?? null;
    let d = decidePointer(s);
    if (d.status === 'APPROVED-POINTER' && aud && Object.values(aud.verdicts).some((v) => v !== 'APPROVE-LINKOUT-ONLY' && v !== 'APPROVE')) {
      d = { status: 'NEEDS-HUMAN-REVIEW', rule: 'R13b-audit-reviewer-asked-for-review', reason: `An audit reviewer did not approve this pointer (${Object.entries(aud.verdicts).map(([k, v]) => `${k}: ${v}`).join('; ')}).` };
    }
    const trust = aud ? (aud.description_rating === 'accurate' ? 'audited-accurate' : `audited-${aud.description_rating}`) : 'unaudited-template-held-in-the-systematic-sample';
    return {
      ...base,
      links: e.links.map((l) => ({ url: l.url, host: l.host, listed_kind: l.kind, link_class: 'blocked_to_bots', class_basis: 'host refuses automated fetches (HTTP 403, task brief); not probed, not circumvented; only the link shape was checked structurally' })),
      resource_class: 'page-pointer',
      counts_as_writing_piece: false,
      final_status: d.status,
      status_rule: d.rule,
      status_reason: d.reason,
      tier: 'A1',
      tier_basis: 'Page of an 1889 US Government publication (OR Ser. I vol. 27 pt. 3); the dispatches on it are already ingested from the Internet Archive OCR (historian manifest license_id PD-US-Gov). A pointer carries no text of its own.',
      usable_for: ['page-pointer', 'link-out-citation'],
      side: s?.checks?.side?.corrected ?? s?.checks?.side?.ocr_side ?? null,
      genre: 'page-pointer',
      written: null,
      retrospective: null,
      persp_tags: ['or27-part3', s?.checks?.side?.ocr_side ?? null].filter(Boolean),
      flags: ['description-is-a-generic-template', ...(s?.notes ?? []).filter((x) => /hedged|no_dispatch/.test(x)).map((x) => x.replace(/_/g, '-')), ...(aud && aud.description_rating !== 'accurate' ? [`description-${aud.description_rating}-per-audit`] : [])],
      description_trust: trust,
      description_audit: aud ? { rating: aud.description_rating, ratings_by_reviewer: aud.description_ratings, raters_differ: aud.description_raters_differ } : null,
      verification: { verifiers: ['structural-check', ...(aud?.reviewers ?? [])], structural: s ? { status: s.status, flags: s.flags, notes: s.notes, summary: { side: { label: s.checks.side.label, ocr_side: s.checks.side.ocr_side, corrected: s.checks.side.corrected ?? null, basis: s.checks.side.basis }, ehistory_ok: s.checks.ehistory.ok, in_folio_map: s.checks.page_in_ia_folios.ok } } : null, passes: null, agreement: null },
      audit: aud,
      or_locator: { or_ser: 'I', or_vol: 27, or_part: 3, printed_page: f.page, dispatches_starting_on_page: s?.dispatches ?? null, listed_side_label: f.page_label, ocr_side: s?.checks?.side?.ocr_side ?? null, corrected_side_label: s?.checks?.side?.corrected ?? null },
      evidence: [
        { type: 'structural-check', ref: `${SV2}/qc/structural.json#n=${e.n}`, summary: `status ${s?.status}; side label ${s?.label_state}; ${s?.dispatches ?? 0} dispatch(es) begin on this page` },
        { type: 'ia-folio-map', ref: 'tmp/historian-cache (warofrebellion273unit_page_numbers.json)', summary: s?.checks?.page_in_ia_folios?.ok ? 'printed page found in the Archive folio map' : 'printed page not in the folio map' },
        ...(aud?.reviews ?? []).map((r) => ({ type: `audit-pass${r.pass}`, ref: r.ref, summary: `${r.verdict}; description ${r.description_accuracy}; ${excerpt(r.evidence, 200)}` })),
      ],
      replacement_urls: (aud?.reviews ?? []).filter((r) => r.replacement_url).slice(0, 1).map((r) => ({ url: r.replacement_url, kind: 'internet-archive-deep-link', proposed_by: [r.id], verified_by: [r.id], strength: 'the audit reviewer viewed this page image', status: 'reviewer-verified' })),
      duplicate_of: null,
      work_group: 'or27-part3',
      catalog_overlap: { catalog_ids: ['H1:SRC-06', 'H2:SRC-19'], why: 'Part 3 is already ingested; a page pointer adds no text', basis: 'historian manifest' },
      description_issues: ['description-is-a-generic-template', ...(f.page_side === 'union' && /transition/i.test(f.page_label) ? ['side-label-is-a-hedge-not-a-fact'] : []), ...(aud?.reviews ?? []).flatMap((r) => (r.issues ?? []).slice(0, 2))],
      next_step: 'none: a pointer, not a writing',
    };
  }

  // ---------------------------------------------------------------- Parts IV-XII
  function nonOr(e, base) {
    const n = e.n;
    const cls = classOf(n);
    const grp = groupOf.get(n) ?? null;
    const ov = overlapOf(n);
    const rs = reviewsByN.get(n) ?? [];
    const common = {
      ...base,
      resource_class: cls?.resource_class ?? 'writing',
      counts_as_writing_piece: ['writing', 'scholarship', 'volume'].includes(cls?.resource_class ?? 'writing'),
      scope_hint: cls ? { value: cls.scope_hint, basis: cls.basis, note: cls.note ?? null } : null,
      work_group: grp ? grp.id : null,
      work_group_relation: grp ? { relation: grp.relation, basis: grp.basis } : null,
      catalog_overlap: ov,
      self_referential: SELF_REFERENTIAL[n] ?? null,
      or_text_overlap: att.orOverlap.get(n) ? { scope: att.orOverlap.get(n).scope, or_ref: att.orOverlap.get(n).or_ref, anchor: { reviewer: att.orOverlap.get(n).reviewer, phrase: att.orOverlap.get(n).phrase } } : null,
      same_text_as: (att.sameText.get(n) ?? []).map((x) => ({ entry: x.same_as, relation: x.relation, ingest: x.ingest, anchor: { reviewer: x.reviewer, phrase: x.phrase } })),
    };

    // hard duplicates
    if (volumeDup[n]) {
      const v = volumeDup[n];
      const rec = hathiApi[v.id]?.record?.items?.[0];
      const ok = rec && String(rec.enumcron).startsWith(v.enum);
      const listedId = e.links.map((l) => hathiIdOf(l.url)).find(Boolean)?.id;
      const proven = ok && listedId === v.id;
      return {
        ...common,
        links: e.links.map((l) => ({ url: l.url, host: l.host, listed_kind: l.kind, link_class: 'blocked_to_bots', class_basis: 'HathiTrust refuses automated fetches (403); identity taken from the catalog API instead' })),
        counts_as_writing_piece: false,
        final_status: proven ? 'DUPLICATE' : 'NOT-VERIFIED',
        status_rule: proven ? 'R14-duplicate-hard-identity' : 'R15-duplicate-not-proven',
        status_reason: proven ? `The link is the HathiTrust volume ${v.id}, which the HathiTrust catalog API (fetched in the first run) names "${rec.enumcron}" and which is the volume the ${v.part === 3 ? 'Part XIII' : v.part === 1 ? 'Part I' : 'Part II and III'} entries already use: merged into ${v.into.id}.` : 'Could not prove the volume identity.',
        tier: 'A1', tier_basis: `US Government publication of 1889; HathiTrust catalog API: ${rec ? `"${rec.rights}", ${rec.orig}` : 'n/a'}`,
        usable_for: ['link-out-citation'],
        side: null, genre: 'volume', written: null, retrospective: null, persp_tags: [], flags: [],
        verification: { verifiers: ['hathitrust-catalog-api'], structural: null, passes: null, agreement: null },
        evidence: [{ type: 'hathitrust-catalog-api', ref: `${SV2}/qc/link-probe.json#api.hathi_catalog.${v.id}`, summary: rec ? `${rec.enumcron}; ${rec.orig}; "${rec.rights}"` : 'not available' }],
        replacement_urls: [], duplicate_of: proven ? v.into.id : null, description_issues: [],
        next_step: 'none: merged',
      };
    }
    if (canonicalDup[n]) {
      const into = canonicalDup[n];
      const a = (att.sameText.get(n) ?? []).find((x) => x.same_as === into);
      const target = reviewsByN.get(a?.review_n ?? into)?.find((r) => r.reviewer === a?.reviewer);
      return {
        ...common,
        links: probeLinks(e, probe.results[n]),
        counts_as_writing_piece: false,
        final_status: 'DUPLICATE',
        status_rule: 'R14-duplicate-hard-identity',
        status_reason: `Same Cornell document id (idno=39923305) and same title as entry ${into}; the second reviewer of entry ${into} wrote that the two "are two pages of the same report and should be merged". Merged into sv2-${String(into).padStart(4, '0')}, whose own status governs.`,
        tier: null, tier_basis: null, usable_for: [], side: null, genre: 'official-report', written: null, retrospective: null, persp_tags: [], flags: [],
        verification: { verifiers: [], structural: null, passes: null, agreement: null },
        evidence: [
          { type: 'url-identity', ref: `${SV2}/entries.json#n=${n}`, summary: 'same idno=39923305 as entry 595; only seq (page) differs' },
          { type: `review-pass${target?.pass ?? 2}`, ref: target?.ref ?? `${SV2}/qc/review-pass2.json#n=${into}`, summary: excerpt(a?.phrase ?? '') },
        ],
        replacement_urls: [], duplicate_of: `sv2-${String(into).padStart(4, '0')}`, description_issues: [], next_step: 'none: merged',
      };
    }

    // reviewed by at least two reviewers
    if (rs.length >= MIN_REVIEWERS) {
      const derived = rs.map((r) => deriveReview(r, e, vocab));
      const m = mergeReviewed({ entry: e, rs, derived, listedKey: keyOfToken(e.links[0].url), iaVerify: iaApi, overlay: norm.items[String(n)] ?? null });
      const rec = m.record;
      const l0 = e.links[0];
      return {
        ...common,
        ...rec,
        links: [{ url: l0.url, host: l0.host, listed_kind: l0.kind, link_class: rec.link_class, class_basis: 'the reviewers\' own fetches of the listed URL (link_status_by_reviewer)', link_status_by_reviewer: rec.link_status_by_reviewer, insecure_http: /^http:/i.test(l0.url) }],
        duplicate_of: null,
        next_step: nextStep(m, rec, n),
      };
    }

    // not enough reviewers
    const pr = probe.results[String(n)] ?? null;
    const issue = blockingIssue(pr);
    const hint = rightsHint(pr, e);
    return {
      ...common,
      links: probeLinks(e, pr),
      final_status: 'NOT-VERIFIED',
      status_rule: 'R16-fewer-than-two-reviewers',
      status_reason: rs.length ? 'Only one reviewer examined this entry; nothing is approved on one reviewer\'s word.' : 'No reviewer output was received for this entry. Only automated link and identity checks exist, and nothing is approved on those alone.',
      tier: null, tier_basis: null, rights_hint: hint, usable_for: [], side: null, genre: null, written: null, retrospective: null, persp_tags: [],
      flags: issue ? [issue] : [], blocking_issue: issue,
      verification: { verifiers: rs.map((r) => r.id), structural: null, passes: null, agreement: null },
      evidence: [{ type: 'link-probe', ref: `${SV2}/qc/link-probe.json#results.${n}`, summary: pr ? `${pr.link_class}${pr.status ? ` (HTTP ${pr.status})` : ''}` : 'not probed' }, ...rs.map((r) => ({ type: `review-pass${r.pass}`, ref: r.ref, summary: `${r.item.verdict}; ${excerpt(r.item.evidence, 200)}` }))],
      replacement_urls: [], duplicate_of: null, description_issues: [], next_step: 'two independent reviews required',
    };
  }

  const registry = {
    meta: {
      schema: 'sources-v2-registry/2',
      generator: 'tools/sources-qc/build-registry.mjs',
      date: date ?? new Date().toLocaleDateString('en-CA'),
      source_document: entriesDoc.meta.source_file,
      source_sha256: entriesDoc.meta.source_sha256,
      inputs: Object.fromEntries(inputFiles.map((f) => [f, sha(f)])),
      inputs_absent: absent.map((f) => `${SV2}/${f}`),
      inputs_absent_note: absent.length ? 'These were named as inputs for an earlier stage but do not exist on disk: no stage wrote them. They are not needed: every other-works entry now has two to four independent reviews on disk.' : null,
      rules: {
        'R1-R8 (other works, all reviewers count)': 'APPROVED (quote corpus) only if EVERY reviewer who examined the entry says APPROVE for verbatim use and all agree on identity (same text source, or the same imprint year for different scans of one edition), rights tier (the same class, A1 or A2) and extraction path (an adapter all of them name); APPROVED-LINKOUT-ONLY if every reviewer says link-out only and all agree on identity, the recorded tier being the MORE restrictive one when they differ; REJECTED only if every reviewer rejects, each with evidence; any other disagreement, any request for human review and any REJECT against a non-REJECT is NEEDS-HUMAN-REVIEW with every rationale kept; fewer than two reviewers is NOT-VERIFIED',
        'R17 (guard)': 'an APPROVED entry whose Internet Archive text source did not answer HTTP 200, or whose own metadata is dated after 1930, goes to a human',
        'R9-R13 (Official Records)': 'APPROVED-CROSSWALK iff report number, author, side and first page agree with the OCR header index of the Internet Archive scan and no audit reviewer found the first page wrong; APPROVED-POINTER for Part XIII pages iff the page exists and its side label agrees; otherwise NEEDS-HUMAN-REVIEW. The description of an OR entry is marked untrusted when the audit sample shows the template is systemically inaccurate (95% Wilson lower bound of the not-accurate share above 10%)',
        'R14': 'DUPLICATE only on a hard identity (same HathiTrust volume id confirmed by the catalog API, or the same document id)',
        'R16': 'NOT-VERIFIED: nothing is approved on automated checks alone or on one reviewer',
      },
      statuses: STATUSES,
      entry_count: out.length,
      reviews: {
        files: REVIEW_FILES.map((f) => f.file),
        batches: loaded.batches.map((b) => ({ id: b.id, file: b.file, pass: b.pass, items: b.items, phase: b.phase })),
        reviews_total: loaded.reviews.length,
        other_works_reviews: nonOrReviews.length,
        reviewer_ids: [...new Set(loaded.reviews.map((r) => r.reviewer))],
      },
      anchors_checked: anchors.checked,
      or_description_audit: orAud.summary,
      part_xiii_audit: { ...ptAud.summary, structural_dispatches_on_unlisted_pages: { dispatches: structural.meta.part_xiii.dispatches_on_pages_not_listed, pages_with_dispatches_current_corpus: structural.meta.part_xiii.pages_not_listed_with_dispatches, pages_with_dispatches_previous_structural_run: structuralRefresh.part_xiii_old.pages_not_listed_with_dispatches, auditor_hand_count: 'about 60 dispatches begin on 22 of the 33 pages (R3-audit-A systemic finding 1)' } },
      list_incompleteness: {
        what: 'The list stops at printed page 1059 of OR Ser. I vol. 27 pt. 3. The volume\'s correspondence runs to printed page 1092, followed by index matter. The pages after 1059 are not entries and are recorded here as notes only.',
        part_xiii_unlisted_pages: ptAud.unlisted,
        listed_last_page: 1059,
        volume_correspondence_last_page: 1092,
        unlisted_page_count: ptAud.unlisted.length,
        dispatches_beginning_on_unlisted_pages: structural.meta.part_xiii.dispatches_on_pages_not_listed,
        pages_with_dispatches: structural.meta.part_xiii.pages_not_listed_with_dispatches,
        brief_figure_note: 'The task brief names pages 1060-1091 and "24 unlisted pages" with 61 dispatches: the review items run to printed page 1092 (33 pages), and 61 dispatches begin on 22 of them in the current historian dispatch table (24 in the earlier structural run, which read an older table; the auditor\'s hand count is about 60 on 22). Both figures are kept.',
        side_note: 'the pages after 1075 start an Appendix whose Union section (about pp. 1076-1090) breaks the list\'s own side rule (Union through p. 857, Confederate from p. 858): extending Part XIII by that rule would mislabel them',
        owner_decision: 'extend Part XIII to p. 1092 with the corrected sides, or leave the list as it is and say that it covers pp. 3-1059 only',
      },
      structural_refresh: { statuses_changed: structuralRefresh.status_changes.length, ocr_page_ranges_changed: structuralRefresh.ocr_page_range_changes.length, pointers_whose_dispatch_count_changed: structuralRefresh.or_page_pointers_whose_dispatch_count_changed, tallies_old: structuralRefresh.tallies_old, tallies_new: structuralRefresh.tallies_new },
      known_defects_of_inputs: attested.known_defects_of_inputs.map((x) => ({ id: x.id, what: x.what, anchor: { batch: x.batch, phrase: x.phrase } })),
    },
    entries: out,
  };

  const stats = computeStats({ entries, out, structural, probe, reviewsByN, orAud, ptAud, iaVerify });
  registry.meta.counts = stats.counts;

  const queue = buildQueue(out, stats, att);
  const reviewQueue = buildReviewQueue(out, queue);
  return { registry, queue, stats, reviewQueue };
}

// ---------------------------------------------------------------------- helpers
function probeLinks(e, pr) {
  return e.links.map((l) => ({
    url: l.url, host: l.host, listed_kind: l.kind,
    link_class: pr?.link_class ?? 'not_probed',
    class_basis: pr ? (pr.how ?? (pr.skipped ? `skipped: ${pr.skipped.why}` : `GET, HTTP ${pr.status ?? 'n/a'}`)) : 'no probe result',
    status: pr?.status ?? null,
    final_url: pr?.final_url ?? null,
    insecure_http: /^http:/i.test(l.url),
  }));
}

function nextStep(m, rec, n) {
  const s = m.status;
  if (s === 'APPROVED') {
    const st = rec.ingest.state;
    if (st === 'ready') return `ingest through the ${rec.ingest.adapter} adapter (see ingest); check every quote against the page image`;
    if (st.startsWith('blocked')) return 'a human transcribes the page images and a second person checks the transcription against them; then ingest';
    if (st.includes('manual-transcription')) return 'rights review by the owner or counsel (tier A2), then a human transcription checked by a second person, then ingest';
    return 'rights review by the owner or counsel (tier A2), then ingest';
  }
  if (s === 'APPROVED-LINKOUT-ONLY') return 'link-out citation only; never quote';
  if (s === 'NEEDS-HUMAN-REVIEW') return 'a human resolves the disagreement (every reviewer\'s rationale is in verification.reviews)';
  if (s === 'REJECTED') return 'none: every reviewer rejected it';
  return null;
}

// ---------------------------------------------------------------------- stats
function iaDates(approvedNonOr, iaVerify) {
  const ids = new Set();
  for (const r of approvedNonOr) for (const x of [r.ingest?.primary_key, ...(r.verification.reviews.flatMap((v) => v.derived.text_sources.map((t) => t.id)))]) if (x?.startsWith('ia:')) ids.add(x.slice(3));
  const yr = (id) => { const m = iaVerify.items[id]?.metadata; return Number(m?.year ?? String(m?.date ?? '').slice(0, 4)) || null; };
  const dated = [...ids].map((id) => ({ id, year: yr(id) })).filter((x) => x.year);
  const stated = [...ids].filter((id) => iaVerify.items[id]?.metadata?.possible_copyright_status).length;
  return { items: ids.size, dated: dated.length, undated: ids.size - dated.length, latest_year: dated.length ? Math.max(...dated.map((x) => x.year)) : null, latest_items: dated.filter((x) => x.year === Math.max(...dated.map((y) => y.year))).map((x) => x.id), with_a_copyright_status_field: stated };
}

function tally(xs) { const o = {}; for (const x of xs) o[x] = (o[x] ?? 0) + 1; return o; }

function computeStats({ entries, out, structural, probe, reviewsByN, orAud, ptAud, iaVerify }) {
  const by = (f) => tally(out.map(f));
  const status = by((r) => r.final_status);
  const byPart = {};
  for (const r of out) { byPart[r.part] ??= {}; byPart[r.part][r.final_status] = (byPart[r.part][r.final_status] ?? 0) + 1; }
  const tierByKind = by((r) => `${r.entry_kind}:${r.tier ?? 'not-assessed'}`);
  const nonOr = out.filter((r) => r.entry_kind === 'non_or');
  const reviewed = nonOr.filter((r) => r.verification.reviews);
  const approvedNonOr = nonOr.filter((r) => r.final_status === 'APPROVED');
  const linkOut = nonOr.filter((r) => r.final_status === 'APPROVED-LINKOUT-ONLY');
  const links = entries.reduce((a, e) => a + e.links.length, 0);
  const hostCount = {};
  for (const e of entries) for (const l of e.links) hostCount[l.host] = (hostCount[l.host] ?? 0) + 1;
  const blockedHosts = ['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net'];
  const blockedLinks = blockedHosts.reduce((a, h) => a + (hostCount[h] ?? 0), 0);
  const dickinson = entries.filter((e) => e.links.some((l) => l.host === 'archives.dickinson.edu'));
  const dickRecs = dickinson.map((e) => out[e.n - 1]);
  const orStruct = structural.meta.tallies.or_report.by_status;
  const pgStruct = structural.meta.tallies.or_page.by_status;
  const orRes = structural.results.filter((r) => r.type === 'or_report');
  const pageClass = {};
  for (const r of orRes) { const c = r.checks.pages?.cls ?? 'fallback'; pageClass[c] = (pageClass[c] ?? 0) + 1; }
  const lags = orRes.map((r) => r.ocr?.persp?.lag_days).filter((x) => x != null).sort((a, b) => a - b);
  const q = (p) => lags[Math.min(lags.length - 1, Math.floor(lags.length * p))];
  const dupGroups = [];
  const keyMap = new Map();
  for (const e of entries) for (const l of e.links) { if (!keyMap.has(l.key)) keyMap.set(l.key, []); keyMap.get(l.key).push(e.n); }
  for (const [k, ns] of keyMap) if (new Set(ns).size > 1) dupGroups.push({ key: k, entries: [...new Set(ns)] });
  const orNs = new Set(entries.filter((e) => e.kind !== 'non_or').map((e) => e.n));
  const dupAmongOr = dupGroups.filter((g) => g.entries.every((x) => orNs.has(x)));
  const dupInvolvingNonOr = dupGroups.filter((g) => !g.entries.every((x) => orNs.has(x)));
  const works = nonOr.filter((r) => r.counts_as_writing_piece && r.final_status !== 'DUPLICATE');
  const orEntries = out.filter((r) => r.entry_kind === 'or_report');
  const readyNow = approvedNonOr.filter((r) => r.ingest?.state === 'ready');

  const sideOf = (r) => r.side ?? 'unknown';
  const cov = (list) => ({
    by_side: tally(list.map(sideOf)),
    by_relevance: tally(list.map((r) => r.gettysburg_relevance)),
    by_timing: tally(list.map((r) => (r.retrospective ? 'retrospective' : 'contemporaneous'))),
    by_side_and_timing: tally(list.map((r) => `${sideOf(r)}:${r.retrospective ? 'retrospective' : 'contemporaneous'}`)),
    by_tier: tally(list.map((r) => r.tier)),
  });
  const overlapFull = approvedNonOr.filter((r) => r.or_text_overlap?.scope === 'full');
  const overlapPartial = approvedNonOr.filter((r) => r.or_text_overlap?.scope === 'partial');
  const inCatalogue = approvedNonOr.filter((r) => r.catalog_overlap);
  const newBeyond = approvedNonOr.filter((r) => !r.or_text_overlap || r.or_text_overlap.scope === 'partial');
  const newBeyondNotInCatalogue = newBeyond.filter((r) => !r.catalog_overlap);
  const reviewerCounts = tally(nonOr.filter((r) => r.final_status !== 'DUPLICATE').map((r) => (reviewsByN.get(r.n) ?? []).length));
  const verdictAgree = reviewed.filter((r) => r.verification.agreement.verdict.agree).length;
  const dead = reviewed.filter((r) => r.listed_link_dead);
  const deadReplaced = dead.filter((r) => r.replacement_urls.some((x) => x.verified_by.length));

  const counts = {
    total_entries: out.length,
    by_status: status,
    by_part_and_status: byPart,
    by_entry_kind: by((r) => r.entry_kind),
    by_tier_and_kind: tierByKind,
    non_or_reviewed: reviewed.length,
    non_or_reviewers_per_entry: reviewerCounts,
    non_or_never_reviewed: nonOr.filter((r) => !r.verification.reviews && r.final_status !== 'DUPLICATE').length,
    non_or_total: nonOr.length,
    non_or_verdict_unanimous: verdictAgree,
    approved_for_quote_corpus: approvedNonOr.length,
    approved_for_quote_corpus_by_tier: tally(approvedNonOr.map((r) => r.tier)),
    approved_link_out_only: linkOut.length,
    approved_link_out_only_by_tier: tally(linkOut.map((r) => r.tier)),
    ready_to_ingest_now: readyNow.map((r) => r.n),
    blocked_ingest: approvedNonOr.filter((r) => r.ingest?.state !== 'ready').map((r) => ({ n: r.n, state: r.ingest?.state })),
    pointers_not_counted_as_writings: out.filter((r) => !r.counts_as_writing_piece).length,
    distinct_writings_or_works_in_list: out.filter((r) => r.counts_as_writing_piece && r.final_status !== 'DUPLICATE').length,
    distinct_non_or_works: works.length,
    non_or_by_resource_class: tally(nonOr.map((r) => r.resource_class)),
    non_or_by_scope_hint: tally(nonOr.map((r) => r.scope_hint?.value ?? 'n/a')),
    non_or_overlap_with_historian_catalogue: nonOr.filter((r) => r.catalog_overlap && r.final_status !== 'DUPLICATE').length,
    reviewed_gettysburg_relevance: tally(reviewed.map((r) => r.gettysburg_relevance)),
    coverage_quote_corpus: cov(approvedNonOr),
    coverage_quote_corpus_ready_now: cov(readyNow),
    coverage_link_out_only: cov(linkOut),
    coverage_all_reviewed_non_rejected: cov(reviewed.filter((r) => ['APPROVED', 'APPROVED-LINKOUT-ONLY', 'NEEDS-HUMAN-REVIEW'].includes(r.final_status))),
    new_beyond_or: {
      approved_quote_corpus: approvedNonOr.length,
      duplicating_or_text_in_full: overlapFull.map((r) => r.n),
      duplicating_or_text_in_part: overlapPartial.map((r) => r.n),
      new_text_works: newBeyond.map((r) => r.n),
      new_text_works_by_side: tally(newBeyond.map(sideOf)),
      new_text_works_in_a_historian_catalogue_already: newBeyond.filter((r) => r.catalog_overlap).map((r) => r.n),
      new_text_works_not_in_any_catalogue: newBeyondNotInCatalogue.map((r) => r.n),
    },
    derivation_notes: {
      approved_with_identity_by_imprint_year: approvedNonOr.filter((r) => r.verification.agreement.identity.basis.startsWith('same-edition')).map((r) => r.n),
      approved_with_an_adapter_taken_from_the_kind_of_the_source: approvedNonOr.filter((r) => r.verification.reviews.some((x) => x.derived.adapters_from === 'kind-of-named-source')).map((r) => r.n),
      reviews_with_no_adapter_named_at_all: reviewed.reduce((a, r) => a + r.verification.reviews.filter((x) => !x.derived.adapters.length).length, 0),
      reviews_with_no_adapter_by_final_status: reviewed.reduce((o, r) => { const k = r.verification.reviews.filter((x) => !x.derived.adapters.length).length; if (k) o[r.final_status] = (o[r.final_status] ?? 0) + k; return o; }, {}),
      reviews_total: reviewed.reduce((a, r) => a + r.verification.reviews.length, 0),
    },
    dead_links: { entries_with_a_dead_listed_link: dead.map((r) => r.n), with_a_reviewer_verified_replacement: deadReplaced.map((r) => r.n), without: dead.filter((r) => !deadReplaced.includes(r)).map((r) => r.n) },
    description_accuracy_other_works: tally(reviewed.map((r) => r.description_accuracy)),
    or_description_trust: tally(orEntries.map((r) => r.description_trust)),
    pointer_description_trust: tally(out.filter((r) => r.entry_kind === 'or_page').map((r) => r.description_trust)),
  };
  const evidence = {
    links_total: links,
    links_by_host: Object.entries(hostCount).sort((a, b) => b[1] - a[1]),
    blocked_to_bots_links: blockedLinks,
    blocked_share: blockedLinks / links,
    probe_link_class_tally: probe.meta.link_class_tally,
    probe_entries: probe.meta.entries_probed,
    dickinson_archives_entries: dickinson.length,
    dickinson_archives_listed_link_dead: dickRecs.filter((r) => r.listed_link_dead).map((r) => r.n),
    dickinson_archives_reviewed: dickRecs.filter((r) => r.verification.reviews).length,
    structural_or: orStruct,
    structural_pointers: pgStruct,
    structural_or_pages: pageClass,
    or_written_lag_days: { n: lags.length, median: q(0.5), p10: q(0.1), p90: q(0.9), max: lags.at(-1), min: lags[0] },
    or_scope_other: orRes.filter((r) => r.ocr?.scope && r.ocr.scope !== 'gettysburg').length,
    or_composite: orRes.filter((r) => r.ocr?.composite).length,
    or_non_report_documents: entries.filter((e) => e.kind === 'or_report' && e.fields.doc_kind_from_description !== 'report').length,
    or_generic_template_entries: entries.filter((e) => e.kind === 'or_report' && /^Official after-action report/.test(e.description)).length,
    or_entries_total: orEntries.length,
    or_in_ocr_index: orRes.filter((r) => r.checks.number_in_ocr_index.ok).length,
    historian_index_reports: structural.meta.ocr_index.reports,
    historian_index_dispatches: structural.meta.ocr_index.dispatches,
    part_xiii: structural.meta.part_xiii,
    hathi_seq_offsets: structural.meta.hathi_seq_modal_offset_by_part,
    pointers_no_dispatch: structural.results.filter((r) => r.type === 'or_page' && r.notes.includes('no_dispatch_begins_on_page')).length,
    pointers_hedged_label: structural.results.filter((r) => r.type === 'or_page' && r.notes.includes('label_hedged_section_transition')).length,
    pointers_hedged_corrected: tally(structural.results.filter((r) => r.type === 'or_page' && r.checks.side.corrected).map((r) => r.checks.side.corrected)),
    part_i_entries: entries.filter((e) => e.part === 'I').length,
    part_ii_iii_entries: entries.filter((e) => e.part === 'II' || e.part === 'III').length,
    host_links: { ehistory: hostCount['ehistory.osu.edu'] ?? 0, hathitrust: (hostCount['babel.hathitrust.org'] ?? 0) + (hostCount['hdl.handle.net'] ?? 0) },
    scholarship_by_part: tally(nonOr.filter((r) => r.resource_class === 'scholarship').map((r) => r.part)),
    duplicate_url_groups: { total: dupGroups.length, among_or_entries_same_first_page: dupAmongOr.length, involving_non_or: dupInvolvingNonOr },
    ia_items_checked: iaVerify.items_checked,
    ia_dates_behind_approved_works: iaDates(approvedNonOr, iaVerify),
    ia_items_dated_after_1930: Object.entries(iaVerify.items).map(([id, v]) => ({ id, year: Number(v.metadata?.year ?? String(v.metadata?.date ?? '').slice(0, 4)) || null, entries: v.named_by_entries })).filter((x) => x.year && x.year > 1930),
    ia_status_tally: iaVerify.status_tally,
    or_locator_audit: { corrected: out.filter((r) => r.audit?.locator_correction).map((r) => ({ n: r.n, listed: r.audit.locator_correction.listed_first_page, first_page: r.audit.locator_correction.first_page })), doubts: out.filter((r) => r.locator_doubts?.length).map((r) => r.n) },
  };
  return { counts, evidence };
}

// ---------------------------------------------------------------------- ingest queue
const relRank = (r) => { const i = RELEVANCE_RANK.indexOf(r.gettysburg_relevance); return i <= 1 ? 0 : 1; };

function queueItem(r, rank, alsoEntries = []) {
  const ing = r.ingest;
  return {
    rank,
    n: r.n, id: r.id,
    entries: [r.n, ...alsoEntries.map((x) => x.n)],
    title: r.corrected_title ?? r.title,
    listed_title: r.title,
    tier: r.tier,
    status: r.final_status,
    ingest_state: ing.state,
    adapter: ing.adapter,
    scale: r.resource_class === 'volume' ? 'whole-volume (segment by article or chapter range)' : 'single piece',
    primary_url: ing.primary_url,
    primary_basis: ing.primary_basis,
    cross_check_urls: [...new Set([...(ing.cross_check ?? []), ...alsoEntries.map((x) => x.ingest?.primary_url).filter(Boolean)])],
    listed_url: r.links[0].url,
    listed_link_class: r.links[0].link_class,
    replacement_urls: r.replacement_urls,
    segmentation: ing.segmentation,
    citation: ing.citation,
    citation_proposals: ing.citation_proposals ?? [],
    before_shipping: ing.before_shipping,
    expected_passages: r.expected_passages,
    or_text_overlap: r.or_text_overlap,
    catalog_overlap: r.catalog_overlap?.catalog_ids ?? [],
    same_text_as: alsoEntries.map((x) => x.n),
    perspective: { side: r.side, side_votes: r.side_votes, genre: r.genre, written: r.written, retrospective: r.retrospective, relative_to_battle: r.written?.relative_to_battle ?? null, tags: r.persp_tags, flags: r.flags, gettysburg_relevance: r.gettysburg_relevance },
    rights_basis: r.rights_basis,
    evidence: r.evidence.map((x) => x.ref),
  };
}

function orderForIngest(list) {
  // value first: text the OR corpus does not hold, contemporaneous before retrospective, the fighting before the campaign,
  // single pieces before whole volumes, Union and Confederate (and civilian) alternating inside equal groups, then entry number
  const key = (r) => [r.or_text_overlap?.scope === 'full' ? 1 : 0, r.retrospective ? 1 : 0, relRank(r), r.resource_class === 'volume' ? 1 : 0];
  const groups = new Map();
  for (const r of [...list].sort((a, b) => a.n - b.n)) { const k = key(r).join('|'); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const ordered = [];
  for (const [, g] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const lanes = { union: [], confederate: [], other: [] };
    for (const r of g) (lanes[r.side] ?? lanes.other).push(r);
    while (lanes.union.length || lanes.confederate.length || lanes.other.length) {
      for (const k of ['union', 'confederate', 'other']) if (lanes[k].length) ordered.push(lanes[k].shift());
    }
  }
  return ordered;
}

function buildQueue(out, stats, att) {
  const approved = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'APPROVED');
  // entries the reviewers say are one text (ingest once): the lowest entry number carries the work, the others ride along
  const byN = new Map(out.map((r) => [r.n, r]));
  const parent = new Map(approved.map((r) => [r.n, r.n]));
  const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (const [n, list] of att.sameText) for (const x of list) if (x.ingest === 'once' && parent.has(n) && parent.has(x.same_as)) { const a = find(n), b = find(x.same_as); if (a !== b) parent.set(Math.max(a, b), Math.min(a, b)); }
  const members = new Map();
  for (const r of approved) { const root = find(r.n); if (!members.has(root)) members.set(root, []); members.get(root).push(r); }
  const works = [...members.entries()].map(([root, ms]) => ({ lead: byN.get(root), also: ms.filter((m) => m.n !== root).sort((a, b) => a.n - b.n) }));
  const orderedWorks = orderForIngest(works.map((w) => w.lead)).map((lead) => works.find((w) => w.lead.n === lead.n));
  const isReady = (w) => w.lead.ingest.state === 'ready';
  const ready = orderedWorks.filter(isReady);
  const blocked = orderedWorks.filter((w) => !isReady(w));
  const pending = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'NEEDS-HUMAN-REVIEW');
  const linkOut = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'APPROVED-LINKOUT-ONLY');
  const rejected = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'REJECTED');
  const lean = (r) => {
    const v = Object.values(r.verification.agreement.verdict.values);
    const t = tally(v);
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${c} of ${v.length} ${k}`).join('; ');
  };
  return {
    meta: {
      schema: 'sources-v2-ingest-queue/2',
      rule: 'Only entries with final_status APPROVED may be ingested; tier A1 and extractable text means ready. Tier A2 holds for a rights review. Image-only items wait for a human transcription and a second person\'s check. Entries the reviewers say are one text are ingested once (the lead entry carries the work). Nothing outside ready/blocked may be ingested.',
      ordering: 'text the Official Records corpus does not already hold first; contemporaneous before retrospective; the fighting (battle July 1-3, campaign and battle) before the campaign, the aftermath and the tangential; single pieces before whole volumes; Union, Confederate and civilian alternating inside equal groups; then entry number',
      adapters: ['archive-fulltext', 'gutenberg', 'pdf-text', 'html', 'loc-ocr', 'manual-transcription'],
      note_perseus: 'There is NO perseus adapter. www.perseus.tufts.edu/robots.txt says "Disallow: /" and the 12 SHSP links in this list point there. Every SHSP item is taken from the University of Florida Internet Archive scans (archive-fulltext), which is what the reviewers read; no queue item has a perseus, ehistory or HathiTrust text source.',
      ready_works: ready.length,
      ready_entries: ready.reduce((a, w) => a + 1 + w.also.length, 0),
      blocked_works: blocked.length,
      pending_decision_count: pending.length,
      link_out_only_count: linkOut.length,
      rejected_count: rejected.length,
    },
    ready: ready.map((w, i) => queueItem(w.lead, i + 1, w.also)),
    blocked: blocked.map((w, i) => ({ ...queueItem(w.lead, ready.length + i + 1, w.also), blocked_by: w.lead.ingest.state })),
    pending_decision: pending.map((r) => ({
      n: r.n, id: r.id, title: r.corrected_title ?? r.title, status: r.final_status, rule: r.status_rule, why: r.status_reason,
      verdicts_by_reviewer: r.verification.agreement.verdict.values,
      lean: lean(r),
      tier_by_reviewer: r.tier_by_reviewer,
      divergence_fields: r.verification.divergences.map((d) => d.field),
      reviewers: r.verification.verifiers,
      listed_url: r.links[0].url,
      replacement_urls: r.replacement_urls,
    })),
    link_out_only: linkOut.map((r) => ({ n: r.n, id: r.id, title: r.title, tier: r.tier, listed_url: r.links[0].url, listed_link_class: r.links[0].link_class, replacement_urls: r.replacement_urls, side: r.side, kind: r.kind })),
    rejected: rejected.map((r) => ({ n: r.n, id: r.id, title: r.title, why: r.status_reason, kind: r.kind })),
    or27_crosswalk: {
      approved: out.filter((r) => r.final_status === 'APPROVED-CROSSWALK').length,
      flagged: out.filter((r) => r.entry_kind === 'or_report' && r.final_status === 'NEEDS-HUMAN-REVIEW').map((r) => r.n),
      description_trust: stats.counts.or_description_trust,
      note: 'Not text to ingest: the OR27 corpus text comes from the Internet Archive OCR. These entries are an independent index (report number, author, first page) and scan link-outs; registry.json holds the OCR id and the first page for each. The listed descriptions are untrusted (see meta.or_description_audit).',
    },
  };
}

/** what a human or a third reviewer should look at next, most valuable first */
function buildReviewQueue(out, queue) {
  const nhr = out.filter((r) => r.final_status === 'NEEDS-HUMAN-REVIEW');
  const rows = nhr.map((r) => {
    const orLike = r.entry_kind !== 'non_or';
    const cls = orLike ? 'or-first-page' : r.status_rule === 'R2-reject-vs-other' ? 'reject-vs-approve' : r.status_rule.startsWith('R4') ? 'quote-vs-linkout' : r.status_rule.startsWith('R3') ? 'reviewer-asked-for-review' : r.status_rule.startsWith('R7') ? 'approve-but-criteria-differ' : 'other';
    return { n: r.n, id: r.id, title: r.corrected_title ?? r.title, entry_kind: r.entry_kind, class: cls, rule: r.status_rule, why: r.status_reason, side: r.side, tier_recorded: r.tier_most_restrictive ?? r.tier ?? null, reviewers: r.verification.verifiers.length };
  });
  const order = { 'reject-vs-approve': 0, 'approve-but-criteria-differ': 1, 'quote-vs-linkout': 2, 'reviewer-asked-for-review': 3, 'or-first-page': 4, other: 5 };
  rows.sort((a, b) => (order[a.class] ?? 9) - (order[b.class] ?? 9) || a.n - b.n);
  return {
    meta: { schema: 'sources-v2-review-queue/2', generator: 'tools/sources-qc/build-registry.mjs', note: 'Entries whose reviewers disagree or asked for a human, in the order a person should take them. Nothing is waiting for a first review: every other-works entry has two to four reviews on disk. A third independent reviewer, or the owner, settles these.', entries: rows.length, by_class: tally(rows.map((x) => x.class)), unreviewed_other_works: out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'NOT-VERIFIED').map((r) => r.n) },
    items: rows,
  };
}

// ---------------------------------------------------------------------- main
function main() {
  const date = arg('--date', null) ?? new Date().toLocaleDateString('en-CA');
  const { registry, queue, stats, reviewQueue } = build({ date });
  const dir = join(ROOT, SV2);
  mkdirSync(join(dir, 'qc'), { recursive: true });
  writeFileSync(join(dir, 'registry.json'), JSON.stringify(registry, null, 1) + '\n');
  writeFileSync(join(dir, 'ingest-queue.json'), JSON.stringify(queue, null, 1) + '\n');
  writeFileSync(join(dir, 'qc/registry-stats.json'), JSON.stringify(stats, null, 1) + '\n');
  writeFileSync(join(dir, 'qc/review-queue-next.json'), JSON.stringify(reviewQueue, null, 1) + '\n');
  const docDir = join(ROOT, 'docs/historian/sources-v2');
  mkdirSync(docDir, { recursive: true });
  writeFileSync(join(docDir, 'QC-REPORT.md'), renderQcReport({ registry, queue, stats, reviewQueue, date }));
  console.log(JSON.stringify({ counts: stats.counts.by_status, quote_corpus: stats.counts.approved_for_quote_corpus, link_out_only: stats.counts.approved_link_out_only, ready_works: queue.meta.ready_works, blocked_works: queue.meta.blocked_works }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
