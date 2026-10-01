#!/usr/bin/env node
// Build the vetted registry of Gettysburg_Sources_v2.docx.
//
//   node tools/sources-qc/build-registry.mjs [--date 2026-09-30]
//
// Reads (all under data-src/sources-v2/):
//   entries.json                 the 1714 entries exactly as the document states them (parse.mjs)
//   qc/review-pass1.json         first reviewer outputs (verbatim as relayed by the workflow)
//   qc/review-pass2.json         second reviewer outputs (verbatim)
//   qc/review-norm.json          machine-readable normalisation of the two passes (basis phrases checked by the test)
//   qc/structural.json           OR entries and page pointers against the OCR index (structural-check.mjs)
//   qc/link-probe.json           polite link probe of the entries nobody reviewed (probe-links.mjs)
//   qc/auto.json, qc/review-queues.json   expected from other stages; used if present, their absence is recorded
// Writes:
//   registry.json, ingest-queue.json, qc/registry-stats.json and docs/historian/sources-v2/QC-REPORT.md
//
// Nothing here touches the network or the historian workstream's files.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classOf, overlapOf, SELF_REFERENTIAL, WORK_GROUPS } from './lib/classes.mjs';
import { blockingIssue, decideCrosswalk, decideNonOr, decidePointer, rightsHint, tierClass } from './lib/registry.mjs';
import { renderQcReport } from './lib/report.mjs';
import { hathiIdOf } from './lib/urlnorm.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SV2 = 'data-src/sources-v2';
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const sha = (p) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');
const excerpt = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

const OR_RESOURCE = { report: 'official-report', return: 'casualty-or-strength-return', itinerary: 'itinerary', organization: 'order-of-battle', honors: 'roster-of-honor', proceedings: 'court-of-inquiry-record', other: 'other-official-document' };
const BATTLE_LAST_DAY = '1863-07-03';

export function build({ date } = {}) {
  const entriesDoc = readJson(`${SV2}/entries.json`);
  const entries = entriesDoc.entries;
  const pass1 = new Map(readJson(`${SV2}/qc/review-pass1.json`).map((r) => [r.n, r]));
  const pass2 = new Map(readJson(`${SV2}/qc/review-pass2.json`).map((r) => [r.n, r]));
  const norm = readJson(`${SV2}/qc/review-norm.json`);
  const structural = readJson(`${SV2}/qc/structural.json`);
  const probe = readJson(`${SV2}/qc/link-probe.json`);
  const sres = new Map(structural.results.map((r) => [r.n, r]));
  const hathiApi = probe.api.hathi_catalog;
  const iaApi = probe.api.archive_org_metadata;

  const inputFiles = [`${SV2}/entries.json`, `${SV2}/qc/review-pass1.json`, `${SV2}/qc/review-pass2.json`, `${SV2}/qc/review-norm.json`, `${SV2}/qc/structural.json`, `${SV2}/qc/link-probe.json`];
  const absent = ['qc/auto.json', 'qc/review-queues.json'].filter((f) => !existsSync(join(ROOT, SV2, f)));
  const presentOptional = ['qc/auto.json', 'qc/review-queues.json'].filter((f) => existsSync(join(ROOT, SV2, f)));
  for (const f of presentOptional) inputFiles.push(`${SV2}/${f}`);

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
    const base = {
      id: e.id,
      n: e.n,
      part: e.part,
      entry_kind: e.kind,
      title: e.title,
      listed_description: e.kind === 'non_or' ? e.description : null,
    };
    if (e.kind === 'or_report') out.push(orReport(e, base, sres.get(e.n), hathiApi));
    else if (e.kind === 'or_page') out.push(orPage(e, base, sres.get(e.n), structural));
    else out.push(nonOr(e, base));
  }

  // the writing's kind in the reviewers' vocabulary (eyewitness-contemporary, civilian-account, newspaper...); '|' joins two different answers
  for (const r of out) {
    if (r.entry_kind === 'non_or' && r.verification.verifiers.length === 2) {
      const k1 = pass1.get(r.n).kind;
      const k2 = pass2.get(r.n).kind;
      r.kind = k1 === k2 ? k1 : `pass1:${k1}|pass2:${k2}`;
    } else r.kind = r.entry_kind === 'non_or' ? null : r.genre;
  }

  // ---------------------------------------------------------------- Parts I-III
  function orReport(e, base, s, hathi) {
    const f = e.fields;
    const d = decideCrosswalk(s);
    const hv = hathi[f.hathi_id];
    const item = hv?.record?.items?.[0];
    const flagsOut = [];
    if (s?.ocr?.scope && s.ocr.scope !== 'gettysburg') flagsOut.push('description-claims-gettysburg-campaign-but-ocr-scope-is-other');
    if (s?.ocr?.composite) flagsOut.push('composite-document-several-papers-under-one-heading');
    if (['return', 'itinerary', 'order_of_battle', 'roster', 'testimony'].includes(f.doc_kind_from_description) || (s?.ocr && s.ocr.kind !== 'report')) flagsOut.push('not-an-after-action-report');
    flagsOut.push('description-is-a-generic-template');
    const written = s?.ocr?.written ? { iso: s.ocr.written, lag_days_after_battle: s.ocr.persp?.lag_days ?? null, basis: 'OCR header of the scan (historian ingestion)' } : null;
    const ocrPages = s?.ocr?.pages ? [s.ocr.pages.start, s.ocr.pages.end] : null;
    return {
      ...base,
      links: e.links.map((l) => ({ url: l.url, host: l.host, listed_kind: l.kind, link_class: 'blocked_to_bots', class_basis: 'host refuses automated fetches (HTTP 403, task brief); not probed, not circumvented; only the link shape was checked structurally' })),
      resource_class: OR_RESOURCE[s?.ocr?.kind] ?? 'official-report',
      counts_as_writing_piece: true,
      final_status: d.status,
      status_rule: d.rule,
      status_reason: d.reason,
      tier: 'A1',
      tier_basis: `US Government publication (War Department / GPO, 1889), public domain (17 U.S.C. 105; the plan's Tier A basis). HathiTrust catalog API fetched this run for ${f.hathi_id}: ${item ? `${item.enumcron}, ${item.orig}, rights "${item.rights}"` : 'record not available'}. The text source is the Internet Archive OCR (historian manifest license_id PD-US-Gov), not the linked HathiTrust or eHistory pages.`,
      usable_for: ['citation-crosswalk', 'link-out-citation'],
      side: f.side === 'other_federal' ? 'union' : f.side,
      genre: OR_RESOURCE[s?.ocr?.kind] ?? 'official-report',
      written,
      retrospective: s?.ocr?.persp ? !!s.ocr.persp.retrospective : null,
      persp_tags: [f.side === 'other_federal' ? 'union' : f.side, s?.ocr?.level ?? null, s?.ocr?.scope ?? null].filter(Boolean),
      flags: flagsOut,
      verification: { verifiers: ['structural-check'], structural: s ? { status: s.status, flags: s.flags, notes: s.notes, summary: { pages: s.checks.pages ? { cls: s.checks.pages.cls, docx: s.checks.pages.docx, ocr: s.checks.pages.ocr } : null, author_ok: s.checks.author?.ok ?? null, side_ok: s.checks.side?.ok ?? null, kind_ok: s.checks.kind?.ok ?? null, hathi_seq_offset: s.checks.hathi_seq_offset?.offset ?? null, fallback: s.checks.fallback ? { ok: s.checks.fallback.ok, contents_list: s.checks.fallback.contents_list?.contents_line ?? null, signature_pages: s.checks.fallback.signature_pages } : null } } : null, passes: null, agreement: null },
      or_locator: {
        or_ser: 'I', or_vol: 27, or_part: f.or_part, report_no: f.report_no,
        listed_pages: [f.page_start, f.page_end], ocr_pages: ocrPages,
        first_page_to_use: ocrPages ? ocrPages[0] : f.page_start,
        ocr_id: s?.ocr?.id ?? (s?.checks?.fallback?.ok ? `unindexed (header lost); signature on printed p. ${s.checks.fallback.signature_pages.join(',')}` : null),
        scan: s?.ocr?.scan ?? null,
      },
      evidence: [
        { type: 'structural-check', ref: `${SV2}/qc/structural.json#n=${e.n}`, summary: `status ${s?.status}; pages ${s?.checks?.pages?.cls ?? 'n/a'}; author ${s?.checks?.author?.ok ? 'agrees' : 'differs'}; side ${s?.checks?.side?.ok ? 'agrees' : 'differs'}` },
        { type: 'ocr-index', ref: 'historian-src/corpus/or27/reports.json', summary: s?.ocr ? `${s.ocr.id} pp. ${s.ocr.pages.start}-${s.ocr.pages.end}, scope ${s.ocr.scope}, ${s.ocr.words ?? '?'} words` : 'header not in the OCR index; confirmed through the contents list and the signature on the claimed pages' },
        { type: 'hathitrust-catalog-api', ref: `${SV2}/qc/link-probe.json#api.hathi_catalog.${f.hathi_id}`, summary: item ? `${item.enumcron}; ${item.orig}; "${item.rights}"` : 'not available' },
      ],
      replacement_urls: [],
      duplicate_of: null,
      work_group: `or27-part${f.or_part}`,
      catalog_overlap: { catalog_ids: ['H1:SRC-01', 'H1:SRC-02', 'H2:SRC-19'], why: 'already ingested from the Internet Archive OCR (reports.json holds the report); this entry adds a citation crosswalk and a scan link-out only', basis: 'historian manifest' },
      description_issues: flagsOut,
      next_step: d.status === 'APPROVED-CROSSWALK' ? 'use as the citation crosswalk to the OR27 ingestion' : 'a human decides which page is the first page of the report (see or_locator) before the link is used',
    };
  }

  // ---------------------------------------------------------------- Part XIII
  function orPage(e, base, s) {
    const f = e.fields;
    const d = decidePointer(s);
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
      flags: ['description-is-a-generic-template', ...(s?.notes ?? []).filter((x) => /hedged|no_dispatch/.test(x)).map((x) => x.replace(/_/g, '-'))],
      verification: { verifiers: ['structural-check'], structural: s ? { status: s.status, flags: s.flags, notes: s.notes, summary: { side: { label: s.checks.side.label, ocr_side: s.checks.side.ocr_side, corrected: s.checks.side.corrected ?? null, basis: s.checks.side.basis }, ehistory_ok: s.checks.ehistory.ok, in_folio_map: s.checks.page_in_ia_folios.ok } } : null, passes: null, agreement: null },
      or_locator: { or_ser: 'I', or_vol: 27, or_part: 3, printed_page: f.page, dispatches_starting_on_page: s?.dispatches ?? null, listed_side_label: f.page_label, ocr_side: s?.checks?.side?.ocr_side ?? null, corrected_side_label: s?.checks?.side?.corrected ?? null },
      evidence: [
        { type: 'structural-check', ref: `${SV2}/qc/structural.json#n=${e.n}`, summary: `status ${s?.status}; side label ${s?.label_state}; ${s?.dispatches ?? 0} dispatch(es) begin on this page` },
        { type: 'ia-folio-map', ref: 'tmp/historian-cache (warofrebellion273unit_page_numbers.json)', summary: s?.checks?.page_in_ia_folios?.ok ? 'printed page found in the Archive folio map' : 'printed page not in the folio map' },
      ],
      replacement_urls: [],
      duplicate_of: null,
      work_group: 'or27-part3',
      catalog_overlap: { catalog_ids: ['H1:SRC-06', 'H2:SRC-19'], why: 'Part 3 is already ingested (2,945 dispatches); a page pointer adds no text', basis: 'historian manifest' },
      description_issues: ['description-is-a-generic-template', ...(f.page_side === 'union' && /transition/i.test(f.page_label) ? ['side-label-is-a-hedge-not-a-fact'] : [])],
      next_step: 'none: a pointer, not a writing',
    };
  }

  // ---------------------------------------------------------------- Parts IV-XII
  function nonOr(e, base) {
    const n = e.n;
    const cls = classOf(n);
    const grp = groupOf.get(n) ?? null;
    const ov = overlapOf(n);
    const p1 = pass1.get(n);
    const p2 = pass2.get(n);
    const nm = norm.items[String(n)];
    const common = {
      ...base,
      resource_class: cls?.resource_class ?? 'writing',
      counts_as_writing_piece: ['writing', 'scholarship', 'volume'].includes(cls?.resource_class ?? 'writing'),
      scope_hint: cls ? { value: cls.scope_hint, basis: cls.basis, note: cls.note ?? null } : null,
      work_group: grp ? grp.id : null,
      work_group_relation: grp ? { relation: grp.relation, basis: grp.basis } : null,
      catalog_overlap: ov,
      self_referential: SELF_REFERENTIAL[n] ?? null,
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
        status_reason: proven ? `The link is the HathiTrust volume ${v.id}, which the HathiTrust catalog API (fetched this run) names "${rec.enumcron}" and which is the volume the ${v.part === 3 ? 'Part XIII' : v.part === 1 ? 'Part I' : 'Part II and III'} entries already use: merged into ${v.into.id}.` : 'Could not prove the volume identity.',
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
      return {
        ...common,
        links: probeLinks(e, probe.results[n]),
        counts_as_writing_piece: false,
        final_status: 'DUPLICATE',
        status_rule: 'R14-duplicate-hard-identity',
        status_reason: `Same Cornell document id (idno=39923305) and same title as entry ${into}; the second reviewer wrote that the two "are two pages of the same report and should be merged". Merged into sv2-${String(into).padStart(4, '0')}, whose own status governs.`,
        tier: null, tier_basis: null, usable_for: [], side: null, genre: 'official-report', written: null, retrospective: null, persp_tags: [], flags: [],
        verification: { verifiers: [], structural: null, passes: null, agreement: null },
        evidence: [
          { type: 'url-identity', ref: `${SV2}/entries.json#n=${n}`, summary: 'same idno=39923305 as entry 595; only seq (page) differs' },
          { type: 'review-pass2', ref: `${SV2}/qc/review-pass2.json#n=${into}`, summary: excerpt('Entries 595 and 599 are two pages of the same report and should be merged.') },
        ],
        replacement_urls: [], duplicate_of: `sv2-${String(into).padStart(4, '0')}`, description_issues: [], next_step: 'none: merged',
      };
    }

    // double-reviewed
    if (p1 && p2 && nm) {
      const d = decideNonOr(p1, p2, nm);
      const tierShared = d.tier;
      const rep = replacementUrls(p1, p2);
      const rec = {
        ...common,
        title: base.title,
        corrected_title: nm.retitle ?? null,
        links: [{ url: e.links[0].url, host: e.links[0].host, listed_kind: e.links[0].kind, link_class: p1.link_status === p2.link_status ? p1.link_status : `pass1:${p1.link_status}|pass2:${p2.link_status}`, class_basis: 'both reviewers fetched the listed URL (see their evidence)' }],
        final_status: d.status,
        status_rule: d.rule,
        status_reason: d.reason,
        tier: tierShared ?? (d.agreement.tier.agree ? d.agreement.tier.pass1 : 'unknown'),
        tier_basis: null,
        tier_pass_values: { pass1: tierClass(p1.rights_tier), pass2: tierClass(p2.rights_tier) },
        rights_basis: { pass1: p1.rights_basis, pass2: p2.rights_basis },
        usable_for: d.status === 'APPROVED' ? intersect(p1.usable_for, p2.usable_for) : d.status === 'APPROVED-LINKOUT-ONLY' ? intersect(p1.usable_for, p2.usable_for).filter((x) => x !== 'verbatim-quote-corpus') : [],
        usable_for_by_pass: { pass1: p1.usable_for, pass2: p2.usable_for },
        side: p1.side === p2.side ? p1.side : (p2.side !== 'unclear' ? p2.side : p1.side),
        genre: nm.genre,
        written: { ...nm.written, basis: 'review-norm.json from the reviewers\' dates' },
        retrospective: nm.retrospective,
        persp_tags: nm.persp_tags,
        flags: nm.flags,
        gettysburg_relevance: p1.gettysburg_relevance === p2.gettysburg_relevance ? p1.gettysburg_relevance : `pass1:${p1.gettysburg_relevance}|pass2:${p2.gettysburg_relevance}`,
        verification: {
          verifiers: ['review-pass1', 'review-pass2'],
          structural: null,
          passes: { 1: passSummary(p1), 2: passSummary(p2) },
          agreement: d.agreement,
          divergences: d.divergences,
        },
        evidence: [
          { type: 'review-pass1', ref: `${SV2}/qc/review-pass1.json#n=${n}`, summary: `${p1.verdict}; ${tierClass(p1.rights_tier)}; ${excerpt(p1.evidence, 260)}` },
          { type: 'review-pass2', ref: `${SV2}/qc/review-pass2.json#n=${n}`, summary: `${p2.verdict}; ${tierClass(p2.rights_tier)}; ${excerpt(p2.evidence, 260)}` },
          ...iaEvidence(nm, iaApi),
        ],
        replacement_urls: rep,
        duplicate_of: null,
        description_issues: [p1.description_accuracy !== 'accurate' ? `pass1:${p1.description_accuracy}` : null, p2.description_accuracy !== 'accurate' ? `pass2:${p2.description_accuracy}` : null, ...(p1.issues ?? []).filter((x) => /title|description|says|omits/i.test(x)).slice(0, 2)].filter(Boolean),
        issues_pass1: p1.issues,
        issues_pass2: p2.issues,
        expected_passages: nm.expected_passages ?? null,
        ingest: d.status === 'APPROVED' ? { state: d.ingest_state, adapter: d.adapter, ...(nm.ingest ?? {}) } : null,
        next_step: nextStep(d, nm, n),
      };
      rec.tier_basis = d.status === 'NEEDS-HUMAN-REVIEW' && d.rule === 'R2-reject-vs-other'
        ? 'unresolved: pass 1 could not identify the work (rights unknown); pass 2 read the 1864 title page of the Library of Congress copy (A1). See rights_basis.'
        : `pass 1: ${excerpt(p1.rights_basis, 420)} | pass 2: ${excerpt(p2.rights_basis, 420)}`;
      return rec;
    }

    // not reviewed
    const pr = probe.results[String(n)] ?? null;
    const issue = blockingIssue(pr);
    const hint = rightsHint(pr, e);
    const wb = pr?.wayback?.available && pr.wayback.snapshot_status === 200 ? pr.wayback : null;
    const wbMatch = !!(wb && wb.title_overlap != null && wb.title_overlap >= 0.6);
    const reps = wb ? [{ url: wb.snapshot_url, proposed_by: ['auto:wayback-availability-api'], verified_by: [], strength: `automated title match only (overlap ${wb.title_overlap == null ? 'n/a (non-HTML)' : wb.title_overlap.toFixed(2)}); capture ${wb.timestamp}; sha256 ${wb.snapshot_sha256}`, status: wbMatch ? 'candidate-title-matches' : 'candidate-title-unclear' }] : [];
    const partial = partialCorroboration(n, pass1, pass2);
    return {
      ...common,
      links: probeLinks(e, pr),
      final_status: 'NOT-VERIFIED',
      status_rule: 'R16-no-verifier',
      status_reason: 'No reviewer output was received for this entry. Only automated link and identity checks exist, and nothing is approved on those alone.',
      tier: null,
      tier_basis: null,
      rights_hint: hint,
      usable_for: [],
      side: null,
      genre: null,
      written: null,
      retrospective: null,
      persp_tags: [],
      flags: [...(issue ? [issue] : []), ...(partial.length ? ['partly-corroborated-by-a-reviewer-note'] : [])],
      blocking_issue: issue,
      verification: { verifiers: [], structural: null, passes: null, agreement: null },
      evidence: [
        { type: 'link-probe', ref: `${SV2}/qc/link-probe.json#results.${n}`, summary: pr ? `${pr.link_class}${pr.status ? ` (HTTP ${pr.status})` : ''}${pr.title ? `; page title: ${excerpt(pr.title, 100)}` : ''}${pr.skipped ? `; skipped: ${pr.skipped.why} ${excerpt(pr.skipped.detail, 60)}` : ''}` : 'not probed' },
        ...hostApiEvidence(e, hathiApi, iaApi),
        ...partial,
      ],
      replacement_urls: reps,
      duplicate_of: null,
      description_issues: (hint?.class === 'C-candidate' || hint?.class === 'reprint-candidate') && pr?.gb_viewability ? ['listed-link-is-a-modern-edition-not-the-period-text'] : [],
      next_step: nextStepUnreviewed(issue, hint, wb),
    };
  }

  // the entries in review-queue order (what a reviewer should look at first)
  const registry = {
    meta: {
      schema: 'sources-v2-registry/1',
      generator: 'tools/sources-qc/build-registry.mjs',
      date: date ?? new Date().toLocaleDateString('en-CA'),
      source_document: entriesDoc.meta.source_file,
      source_sha256: entriesDoc.meta.source_sha256,
      inputs: Object.fromEntries(inputFiles.map((f) => [f, sha(f)])),
      inputs_absent: absent.map((f) => `${SV2}/${f}`),
      inputs_absent_note: absent.length ? 'These were named as inputs for this stage but do not exist on disk: they were produced by no stage that wrote to the repository. The structural check and link probe in this directory (structural.json, link-probe.json) stand in for the automated part; no reviewer output exists for any entry beyond the 12 in review-pass1/2.json.' : null,
      rules: {
        'R1-R8': 'non-OR entries: APPROVED only if two verifiers agree on identity (same edition, both identified), rights tier (A1 or A2, same class) and extraction path (intersecting adapters, both say verbatim use); APPROVED-LINKOUT-ONLY if both say link-out only and agree on identity and tier; any REJECT-vs-other, any request for human review or any disagreement is NEEDS-HUMAN-REVIEW with both rationales kept; both REJECT is REJECTED',
        'R9-R13': 'OR entries: APPROVED-CROSSWALK iff report number, author, side and first page agree with the OCR header index of the Internet Archive scan; APPROVED-POINTER for Part XIII pages iff the page exists and its side label agrees; otherwise NEEDS-HUMAN-REVIEW',
        'R14': 'DUPLICATE only on a hard identity (same HathiTrust volume id confirmed by the catalog API, or same document id)',
        'R16': 'NOT-VERIFIED: nothing is approved on automated checks alone',
      },
      statuses: ['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER', 'NEEDS-HUMAN-REVIEW', 'REJECTED', 'NOT-VERIFIED', 'DUPLICATE'],
      entry_count: out.length,
    },
    entries: out,
  };

  // ---------------------------------------------------------------- stats
  const stats = computeStats({ entries, out, structural, probe, pass1, pass2, norm });
  registry.meta.counts = stats.counts;

  const queue = buildQueue(out, stats, norm);
  const reviewQueue = buildReviewQueue(out);
  for (const b of reviewQueue.batches) for (const it of b.items) { const r = out.find((x) => x.n === it.n); if (r) r.review_priority = { batch: b.batch, rank: it.rank, class: it.class, reason: it.reason }; }
  return { registry, queue, stats, reviewQueue };
}

// ---------------------------------------------------------------------- helpers
function intersect(a = [], b = []) { const sb = new Set(b); return a.filter((x) => sb.has(x)); }

function passSummary(p) {
  return {
    verdict: p.verdict, rights_tier: p.rights_tier, bibliographic_match: p.bibliographic_match, link_status: p.link_status,
    description_accuracy: p.description_accuracy, kind: p.kind, side: p.side, gettysburg_relevance: p.gettysburg_relevance,
    written: p.written, replacement_url: p.replacement_url || null, usable_for: p.usable_for, issue_count: (p.issues ?? []).length,
  };
}

function replacementUrls(p1, p2) {
  const a = p1.replacement_url ? p1.replacement_url.trim() : '';
  const b = p2.replacement_url ? p2.replacement_url.trim() : '';
  const canon = (u) => u.replace(/^http:/i, 'https:').replace(/\/+$/, '');
  const out = [];
  if (a && b && canon(a) === canon(b)) out.push({ url: b, proposed_by: ['pass1', 'pass2'], verified_by: ['pass1', 'pass2'], strength: 'both reviewers fetched it' });
  else {
    if (a) out.push({ url: a, proposed_by: ['pass1'], verified_by: ['pass1'], strength: 'one reviewer' });
    if (b) out.push({ url: b, proposed_by: ['pass2'], verified_by: ['pass2'], strength: 'one reviewer' });
  }
  return out;
}

function iaEvidence(nm, iaApi) {
  const ids = new Set();
  for (const u of [nm.ingest?.primary_url, ...(nm.ingest?.cross_check ?? [])]) {
    const m = /archive\.org\/details\/([^/?#]+)/.exec(u ?? '');
    if (m) ids.add(m[1]);
  }
  const out = [];
  for (const id of ids) {
    const r = iaApi[id];
    const md = r?.metadata;
    if (md) out.push({ type: 'archive-org-metadata-api', ref: `data-src/sources-v2/qc/link-probe.json#api.archive_org_metadata.${id}`, summary: `${id}: "${excerpt(md.title, 70)}", ${md.date ?? ''}, ${excerpt(md.publisher, 40)}${md.possible_copyright_status ? `, possible-copyright-status ${excerpt(md.possible_copyright_status, 50)}` : ''}; djvu text ${md.has_djvu_txt ? 'yes' : 'no'}, page_numbers.json ${md.has_page_numbers ? 'yes' : 'no'} (this builder's own fetch)` });
  }
  return out;
}

function hostApiEvidence(e, hathiApi, iaApi) {
  const out = [];
  const l = e.links[0];
  const h = hathiIdOf(l.url);
  if (h?.id && hathiApi[h.id]?.record) {
    const r = hathiApi[h.id].record;
    const it = r.items?.[0];
    out.push({ type: 'hathitrust-catalog-api', ref: `data-src/sources-v2/qc/link-probe.json#api.hathi_catalog.${h.id}`, summary: `${excerpt(r.titles?.[0], 90)} (${r.publish_dates?.[0] ?? '?'}); ${it?.enumcron ?? ''}; ${it?.orig ?? ''}; "${it?.rights ?? ''}" (this builder's own fetch; the page itself is blocked to bots)` });
  }
  const m = /archive\.org\/(?:details|stream)\/([^/?#]+)/.exec(l.url);
  if (m && iaApi[m[1]]?.metadata) {
    const md = iaApi[m[1]].metadata;
    out.push({ type: 'archive-org-metadata-api', ref: `data-src/sources-v2/qc/link-probe.json#api.archive_org_metadata.${m[1]}`, summary: `"${excerpt(md.title, 70)}", ${md.date ?? ''}, ${excerpt(md.publisher, 40)}${md.possible_copyright_status ? `, possible-copyright-status ${excerpt(md.possible_copyright_status, 50)}` : ''}` });
  }
  return out;
}

/** reviewer notes that mention an unreviewed entry's work: recorded as corroboration, never as verification */
function partialCorroboration(n, pass1, pass2) {
  const out = [];
  const find = (map, key, phrase, label) => {
    const r = map.get(key);
    if (r && JSON.stringify(r).includes(phrase)) out.push({ type: 'reviewer-side-note', ref: `data-src/sources-v2/qc/${label}.json#n=${key}`, summary: `a reviewer of another entry wrote: "${phrase}" (corroboration only, not a review of this entry)` });
  };
  if (n === 598) find(pass2, 594, 'he also wrote to Col. T. S. Garnett for the Confederate side', 'review-pass2');
  if (n === 604) find(pass1, 595, 'a letter by C. Stuart Patterson of Landis\' Battery', 'review-pass1');
  return out;
}

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

function nextStep(d, nm, n) {
  if (d.status === 'APPROVED') {
    if (d.ingest_state === 'ready') return `ingest through the ${d.adapter} adapter (see ingest); verbatim check every quote against the scan`;
    if (d.ingest_state?.startsWith('blocked')) return 'a human transcribes the page images and a second person checks the transcription against them; then ingest';
    return 'rights review by the owner or counsel (tier A2), then ingest';
  }
  if (d.status === 'APPROVED-LINKOUT-ONLY') return 'link-out citation only; never quote';
  if (d.status === 'NEEDS-HUMAN-REVIEW') {
    if (n === 595) return 'a human confirms the second reviewer\'s identification (Landis report in Pleasonton\'s Third Annual Report, 1864, Library of Congress scan reportofbrigadie00phil); if confirmed this becomes an A1 ingest and entry 599 follows it';
    if (n === 587 || n === 588) return 'a human accepts the Wayback capture as the link-out (the Dickinson page is gone) and the "all rights reserved" host notice; entry 588\'s quotable text is OR vol. 27 pt. 3 p. 912, already ingested';
    return 'a human resolves the disagreement';
  }
  return null;
}

function nextStepUnreviewed(issue, hint, wb) {
  if (issue === 'dead_link' || issue === 'dead_link_redirects_to_generic_page') return wb ? 'a reviewer reads the Wayback capture named in replacement_urls and confirms it is the same item; two independent reviews are still required' : 'find a replacement link, then two independent reviews';
  if (issue === 'robots_disallow_automated_access') return 'the host\'s robots.txt forbids automated access: use a different copy (for SHSP, the Internet Archive scans) or a human reads it; two independent reviews required';
  if (issue === 'blocked_to_bots' || issue === 'host_unreachable_robots_unreadable' || issue === 'host_error') return 'a human reads the page (the host refuses or cannot be reached by the automated check); two independent reviews required';
  if (hint?.class === 'A-candidate') return 'two independent reviews (identity, imprint year on the title page, extraction path); then it can enter the ingest queue';
  if (hint?.class === 'C-candidate') return 'treat as link-out unless a licence is found; two independent reviews required for any other use';
  return 'two independent reviews required';
}

// ---------------------------------------------------------------------- stats
function computeStats({ entries, out, structural, probe, pass1, pass2 }) {
  const by = (f) => { const o = {}; for (const r of out) { const k = f(r); o[k] = (o[k] ?? 0) + 1; } return o; };
  const status = by((r) => r.final_status);
  const byPart = {};
  for (const r of out) { byPart[r.part] ??= {}; byPart[r.part][r.final_status] = (byPart[r.part][r.final_status] ?? 0) + 1; }
  const tierByKind = {};
  for (const r of out) { const k = `${r.entry_kind}:${r.tier ?? 'not-assessed'}`; tierByKind[k] = (tierByKind[k] ?? 0) + 1; }
  const nonOr = out.filter((r) => r.entry_kind === 'non_or');
  const approvedNonOr = nonOr.filter((r) => r.final_status === 'APPROVED');
  const reviewed = nonOr.filter((r) => r.verification.verifiers.includes('review-pass1'));
  const links = entries.reduce((a, e) => a + e.links.length, 0);
  const hostCount = {};
  for (const e of entries) for (const l of e.links) hostCount[l.host] = (hostCount[l.host] ?? 0) + 1;
  const blockedHosts = ['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net'];
  const blockedLinks = blockedHosts.reduce((a, h) => a + (hostCount[h] ?? 0), 0);
  const dickinson = entries.filter((e) => e.links.some((l) => l.host === 'archives.dickinson.edu'));
  const dickDead = dickinson.filter((e) => (probe.results[e.n]?.link_class === 'dead') || [587, 588].includes(e.n)).length;
  const probeTally = probe.meta.link_class_tally;
  const resClass = {};
  for (const r of nonOr) resClass[r.resource_class] = (resClass[r.resource_class] ?? 0) + 1;
  const scope = {};
  for (const r of nonOr) { const k = r.scope_hint?.value ?? 'n/a'; scope[k] = (scope[k] ?? 0) + 1; }
  const reviewedRel = {};
  for (const r of reviewed) reviewedRel[r.gettysburg_relevance] = (reviewedRel[r.gettysburg_relevance] ?? 0) + 1;
  const descAcc = { pass1: {}, pass2: {} };
  for (const [k, m] of [['pass1', pass1], ['pass2', pass2]]) for (const r of m.values()) descAcc[k][r.description_accuracy] = (descAcc[k][r.description_accuracy] ?? 0) + 1;
  const orStruct = structural.meta.tallies.or_report.by_status;
  const pgStruct = structural.meta.tallies.or_page.by_status;
  const orRes = structural.results.filter((r) => r.type === 'or_report');
  const pageClass = {};
  for (const r of orRes) { const c = r.checks.pages?.cls ?? 'fallback'; pageClass[c] = (pageClass[c] ?? 0) + 1; }
  const lags = orRes.map((r) => r.ocr?.persp?.lag_days).filter((x) => x != null).sort((a, b) => a - b);
  const q = (p) => lags[Math.min(lags.length - 1, Math.floor(lags.length * p))];
  const scopeOther = orRes.filter((r) => r.ocr?.scope && r.ocr.scope !== 'gettysburg').length;
  const composite = orRes.filter((r) => r.ocr?.composite).length;
  const nonReportDocs = entries.filter((e) => e.kind === 'or_report' && e.fields.doc_kind_from_description !== 'report').length;
  const templateCount = entries.filter((e) => e.kind === 'or_report' && /^Official after-action report/.test(e.description)).length;
  const dupGroups = [];
  const keyMap = new Map();
  for (const e of entries) for (const l of e.links) { if (!keyMap.has(l.key)) keyMap.set(l.key, []); keyMap.get(l.key).push(e.n); }
  for (const [k, ns] of keyMap) if (new Set(ns).size > 1) dupGroups.push({ key: k, entries: [...new Set(ns)] });
  const orNs = new Set(entries.filter((e) => e.kind !== 'non_or').map((e) => e.n));
  const dupAmongOr = dupGroups.filter((g) => g.entries.every((x) => orNs.has(x)));
  const dupInvolvingNonOr = dupGroups.filter((g) => !g.entries.every((x) => orNs.has(x)));
  const writings = nonOr.filter((r) => r.counts_as_writing_piece && r.final_status !== 'DUPLICATE');
  const overlapIn = nonOr.filter((r) => r.catalog_overlap && r.final_status !== 'DUPLICATE');
  const orEntries = out.filter((r) => r.entry_kind === 'or_report');
  const approvedA1Ready = approvedNonOr.filter((r) => r.ingest?.state === 'ready');
  const counts = {
    total_entries: out.length,
    by_status: status,
    by_part_and_status: byPart,
    by_entry_kind: by((r) => r.entry_kind),
    by_tier_and_kind: tierByKind,
    non_or_reviewed_twice: reviewed.length,
    non_or_never_reviewed: nonOr.filter((r) => !r.verification.verifiers.includes('review-pass1') && r.final_status !== 'DUPLICATE').length,
    non_or_total: nonOr.length,
    approved_for_quote_corpus: approvedNonOr.length,
    approved_for_quote_corpus_by_tier: approvedNonOr.reduce((o, r) => { o[r.tier] = (o[r.tier] ?? 0) + 1; return o; }, {}),
    ready_to_ingest_now: approvedA1Ready.map((r) => r.n),
    blocked_ingest: approvedNonOr.filter((r) => r.ingest?.state !== 'ready').map((r) => ({ n: r.n, state: r.ingest?.state })),
    pointers_not_counted_as_writings: out.filter((r) => !r.counts_as_writing_piece).length,
    distinct_writings_or_works_in_list: out.filter((r) => r.counts_as_writing_piece && r.final_status !== 'DUPLICATE').length,
    distinct_non_or_works: writings.length,
    non_or_by_resource_class: resClass,
    non_or_by_scope_hint: scope,
    non_or_overlap_with_historian_catalogue: overlapIn.length,
    reviewed_gettysburg_relevance: reviewedRel,
    description_accuracy_by_pass: descAcc,
  };
  const evidence = {
    links_total: links,
    links_by_host: Object.entries(hostCount).sort((a, b) => b[1] - a[1]),
    blocked_to_bots_links: blockedLinks,
    blocked_share: blockedLinks / links,
    probe_link_class_tally: probeTally,
    probe_entries: probe.meta.entries_probed,
    dickinson_archives_entries: dickinson.length,
    dickinson_archives_dead: dickDead,
    robots_disallowed_perseus: Object.values(probe.results).filter((r) => r.host === 'perseus.tufts.edu' && r.link_class === 'robots_disallowed').length,
    structural_or: orStruct,
    structural_pointers: pgStruct,
    structural_or_pages: pageClass,
    or_written_lag_days: { n: lags.length, median: q(0.5), p10: q(0.1), p90: q(0.9), max: lags.at(-1), min: lags[0] },
    or_scope_other: scopeOther,
    or_composite: composite,
    or_non_report_documents: nonReportDocs,
    or_generic_template_entries: templateCount,
    or_entries_total: orEntries.length,
    or_in_ocr_index: orRes.filter((r) => r.checks.number_in_ocr_index.ok).length,
    historian_index_reports: structural.meta.ocr_index.reports,
    part_xiii: structural.meta.part_xiii,
    hathi_seq_offsets: structural.meta.hathi_seq_modal_offset_by_part,
    pointers_no_dispatch: structural.results.filter((r) => r.type === 'or_page' && r.notes.includes('no_dispatch_begins_on_page')).length,
    pointers_hedged_label: structural.results.filter((r) => r.type === 'or_page' && r.notes.includes('label_hedged_section_transition')).length,
    pointers_hedged_corrected: structural.results.filter((r) => r.type === 'or_page' && r.checks.side.corrected).reduce((o, r) => { o[r.checks.side.corrected] = (o[r.checks.side.corrected] ?? 0) + 1; return o; }, {}),
    part_i_entries: entries.filter((e) => e.part === 'I').length,
    part_ii_iii_entries: entries.filter((e) => e.part === 'II' || e.part === 'III').length,
    host_links: { ehistory: hostCount['ehistory.osu.edu'] ?? 0, hathitrust: (hostCount['babel.hathitrust.org'] ?? 0) + (hostCount['hdl.handle.net'] ?? 0) },
    scholarship_by_part: nonOr.filter((r) => r.resource_class === 'scholarship').reduce((o, r) => { o[r.part] = (o[r.part] ?? 0) + 1; return o; }, {}),
    duplicate_url_groups: { total: dupGroups.length, among_or_entries_same_first_page: dupAmongOr.length, involving_non_or: dupInvolvingNonOr },
  };
  return { counts, evidence };
}

// ---------------------------------------------------------------------- ingest queue
function perspective(r) {
  return { side: r.side, genre: r.genre, written: r.written, retrospective: r.retrospective, relative_to_battle: r.written?.relative_to_battle ?? null, tags: r.persp_tags, flags: r.flags, gettysburg_relevance: r.gettysburg_relevance };
}

function queueItem(r, rank) {
  return {
    rank,
    n: r.n, id: r.id,
    title: r.corrected_title ?? r.title,
    listed_title: r.title,
    tier: r.tier,
    status: r.final_status,
    ingest_state: r.ingest?.state ?? null,
    adapter: r.ingest?.adapter ?? null,
    primary_url: r.ingest?.primary_url ?? null,
    cross_check_urls: r.ingest?.cross_check ?? [],
    listed_url: r.links[0].url,
    segmentation: r.ingest?.segmentation ?? null,
    citation: r.ingest?.citation ?? null,
    before_shipping: r.ingest?.before_shipping ?? null,
    expected_passages: r.expected_passages,
    perspective: perspective(r),
    rights_basis: r.rights_basis,
    evidence: r.evidence.map((x) => x.ref),
  };
}

function buildQueue(out, stats, norm) {
  const approved = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'APPROVED');
  // rank: contemporaneous before retrospective; fighting before campaign-only; Union/Confederate alternation breaks ties
  const rel = (r) => (r.gettysburg_relevance === 'campaign-and-battle' ? 0 : 1);
  const contemporaneous = (r) => (r.retrospective ? 1 : 0);
  const ready = approved.filter((r) => r.ingest.state === 'ready').sort((a, b) => contemporaneous(a) - contemporaneous(b) || rel(a) - rel(b) || a.n - b.n);
  // Union/Confederate balance: interleave sides inside equal (contemporaneous, relevance) groups
  const ordered = [];
  const groups = new Map();
  for (const r of ready) { const k = `${contemporaneous(r)}|${rel(r)}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  for (const g of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const un = g[1].filter((r) => r.side === 'union');
    const rest = g[1].filter((r) => r.side !== 'union');
    while (un.length || rest.length) { if (un.length) ordered.push(un.shift()); if (rest.length) ordered.push(rest.shift()); }
  }
  const blocked = approved.filter((r) => r.ingest.state !== 'ready').sort((a, b) => a.n - b.n);
  const pending = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'NEEDS-HUMAN-REVIEW');
  const candidates = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'NOT-VERIFIED' && r.rights_hint?.class === 'A-candidate' && !r.blocking_issue);
  return {
    meta: {
      schema: 'sources-v2-ingest-queue/1',
      rule: 'Only entries with final_status APPROVED may be ingested; tier A1 and extractable text means ready. Tier A2 holds for a rights review. Image-only items wait for a human transcription and a second person\'s check. Nothing in candidates_pending_verification may be ingested: it is a to-do list for reviewers.',
      ordering: 'contemporaneous before retrospective, then campaign-and-battle before campaign-only, then Union and Confederate alternating, then entry number',
      adapters: ['html', 'gutenberg', 'archive-fulltext', 'perseus', 'pdf-text', 'manual-transcription'],
      note_perseus: 'The perseus adapter is NOT usable: www.perseus.tufts.edu/robots.txt says "Disallow: /" and the 12 SHSP links in this list point there. Use the Internet Archive SHSP scans (hist-sources-1 SRC-08) instead.',
      ready_count: ordered.length, blocked_count: blocked.length, pending_decision_count: pending.length, candidates_count: candidates.length,
    },
    ready: ordered.map((r, i) => queueItem(r, i + 1)),
    blocked: blocked.map((r, i) => ({ ...queueItem(r, ordered.length + i + 1), blocked_by: r.ingest.state })),
    pending_decision: pending.map((r) => ({
      n: r.n, id: r.id, title: r.corrected_title ?? r.title, status: r.final_status, why: r.status_reason,
      pass1_verdict: r.verification.passes[1].verdict, pass2_verdict: r.verification.passes[2].verdict,
      recommendation: recommendation(r), duplicate_members: out.filter((x) => x.duplicate_of === r.id).map((x) => x.n),
      ingest_if_approved: r.ingest ?? (norm.items[String(r.n)]?.ingest ?? null),
    })),
    or27_crosswalk: {
      approved: out.filter((r) => r.final_status === 'APPROVED-CROSSWALK').length,
      flagged: out.filter((r) => r.entry_kind === 'or_report' && r.final_status === 'NEEDS-HUMAN-REVIEW').map((r) => r.n),
      note: 'Not text to ingest: the OR27 corpus text comes from the Internet Archive OCR. These entries are an independent index (report number, author, first page) and scan link-outs; registry.json holds the OCR id and the corrected first page for each.',
    },
    candidates_pending_verification: candidates.map((r) => ({ n: r.n, id: r.id, title: r.title, rights_hint: r.rights_hint, listed_url: r.links[0].url, in_historian_catalogue: r.catalog_overlap?.catalog_ids ?? [], ingest_allowed: false, needs: 'two independent reviews' })),
  };
}

function recommendation(r) {
  if (r.n === 595) return 'approve as A1 after a human confirms pass 2: the document is Landis\'s report printed as Appendix C of Pleasonton\'s Third Annual Report (1864); pass 1 could not find it because the Cornell page is gone, not because it does not exist; the first-pass reject premise ("no such report exists") was refuted by pass 2\'s fetch of the Library of Congress scan';
  if (r.n === 587) return 'approve as link-out via the Wayback capture (pass 2 downloaded the complete 6-page PDF, 2,685,477 bytes, sha256 recorded); never quote the dealer essay or the host description';
  if (r.n === 588) return 'approve as a provenance link-out only; the quotable text is OR vol. 27 pt. 3 p. 912, already ingested';
  return null;
}

// ---------------------------------------------------------------------- what to verify next
/**
 * The entries nobody has reviewed, in the order a reviewer should take them, 12 to a batch (the size the first reviewers
 * worked in). Value first: new accounts of the fighting, then new campaign accounts that are reachable, then the dead and
 * blocked ones, then collections and scholarship that will be link-out anyway.
 */
function buildReviewQueue(out) {
  const todo = out.filter((r) => r.entry_kind === 'non_or' && r.final_status === 'NOT-VERIFIED');
  const classify = (r) => {
    const scope = r.scope_hint?.value;
    const inCat = !!r.catalog_overlap;
    const issue = r.blocking_issue;
    const hint = r.rights_hint?.class;
    if (['index', 'guide'].includes(r.resource_class)) return [8, 'index-or-guide', 'a finding aid or collection page: review only to extract its member items'];
    if (r.resource_class === 'scholarship') return [7, 'scholarship', 'modern article: link-out unless a licence is found; facts only'];
    if (issue === 'dead_link' || issue === 'dead_link_redirects_to_generic_page') return [5, 'dead-link', r.replacement_urls.length ? 'dead link; a Wayback capture with a matching title exists: a reviewer reads it' : 'dead link and no replacement found'];
    if (issue === 'robots_disallow_automated_access' && r.links[0].host === 'perseus.tufts.edu') return [scope === 'battle' ? 2 : 4, 'shsp-find-internet-archive-copy', 'Perseus forbids automated access: a reviewer finds the same SHSP article in the Internet Archive scans the plan lists (SRC-08) and reviews that copy'];
    if (issue) return [6, 'host-blocks-automation', `host cannot be read by the automated check (${issue}): a human or a different copy is needed`];
    if (scope === 'resource') return [inCat ? 7 : 4, inCat ? 'volume-already-planned' : 'volume-resource', inCat ? "a whole volume the historian's catalogue already ingests or lists" : 'a whole volume or finding aid covering the subject'];
    if (scope === 'battle' && hint === 'A-candidate' && !inCat) return [1, 'new-battle-account-reachable', 'about the fighting, reachable, original imprint likely, not already planned'];
    if (scope === 'battle' && !inCat) return [2, 'new-battle-account', 'about the fighting, reachable, not already planned'];
    if (scope === 'battle') return [3, 'battle-already-planned', "about the fighting but the historian's catalogue already plans this source: verify it once, through that route"];
    if (scope === 'post-battle') return [4, 'post-battle-context', 'after the battle (Lincoln, the 1913 reunion, a postwar order): context, not fighting'];
    return [4, 'campaign-context-reachable', 'invasion and occupation accounts (Carlisle, Chambersburg, York): context the plan does not have'];
  };
  const rows = todo.map((r) => { const [pri, cls, why] = classify(r); return { n: r.n, id: r.id, title: r.title, pri, class: cls, reason: why }; })
    .sort((a, b) => a.pri - b.pri || a.n - b.n);
  const batches = [];
  for (let i = 0; i < rows.length; i += 12) batches.push({ batch: batches.length + 1, items: rows.slice(i, i + 12).map((x, k) => ({ rank: i + k + 1, n: x.n, id: x.id, title: x.title, class: x.class, reason: x.reason })) });
  return { meta: { schema: 'sources-v2-review-queue/1', generator: 'tools/sources-qc/build-registry.mjs', note: 'Entries with no reviewer output, in the order a reviewer should take them; the batch size (12) is the one the first reviewers used. Each entry needs two independent reviewers before it can be approved.', entries: rows.length, by_class: rows.reduce((o, x) => { o[x.class] = (o[x.class] ?? 0) + 1; return o; }, {}) }, batches };
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
  console.log(JSON.stringify({ counts: stats.counts.by_status, quote_corpus: stats.counts.approved_for_quote_corpus, ready: stats.counts.ready_to_ingest_now }, null, 1));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
