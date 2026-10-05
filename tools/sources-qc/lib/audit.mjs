// What the audit reviewers (R2-audit-A, R3-audit-A and the two second-pass audits A-OR-*) found about the Official Records
// entries (Parts I-III, n = 1..543) and the Part XIII page pointers (n = 658..1714). Pure functions over the loaded reviews.
//
// The audits are samples, not complete reviews, so they never change a status by themselves except where a reviewer who
// looked at the page image says the listed first page is wrong (see registry.mjs applyLocatorCorrection). What they do is
//   - rate the description template: a systematic sample (every ninth Official Records entry, every 35th page pointer) says
//     how much of the template can be trusted;
//   - record, per audited entry, what each auditor found;
//   - count the pages of the volume the list does not cover (items numbered beyond 1714 are NOT entries: they are notes
//     about the list's incompleteness).

import { DESCRIPTION_RANK, descriptionSystemic, wilson } from './registry.mjs';

export const LIST_LENGTH = 1714;
export const OR_LAST = 543;
export const PART_XIII_FIRST = 658;
export const PAGE_OFFSET = 655; // n = printed page + 655 in Part XIII

const worst = (ratings) => ratings.filter((a) => a in DESCRIPTION_RANK && a !== 'unverifiable').sort((a, b) => DESCRIPTION_RANK[b] - DESCRIPTION_RANK[a])[0] ?? 'unverifiable';

function groupBy(reviews) {
  const m = new Map();
  for (const r of reviews) {
    if (!m.has(r.n)) m.set(r.n, []);
    m.get(r.n).push(r);
  }
  return m;
}

const tally = (xs) => xs.reduce((o, x) => { o[x] = (o[x] ?? 0) + 1; return o; }, {});

/** the audit record of one entry: what each auditor said, and the worst description rating among them */
export function auditRecord(rs) {
  const ratings = rs.map((r) => r.item.description_accuracy);
  return {
    reviewers: rs.map((r) => r.id),
    verdicts: Object.fromEntries(rs.map((r) => [r.id, r.item.verdict])),
    description_ratings: Object.fromEntries(rs.map((r) => [r.id, r.item.description_accuracy])),
    description_rating: worst(ratings),
    description_raters_differ: new Set(ratings).size > 1,
    reviews: rs.map((r) => ({
      id: r.id,
      pass: r.pass,
      ref: r.ref,
      verdict: r.item.verdict,
      bibliographic_match: r.item.bibliographic_match,
      description_accuracy: r.item.description_accuracy,
      kind: r.item.kind,
      side: r.item.side,
      gettysburg_relevance: r.item.gettysburg_relevance,
      written: r.item.written ?? null,
      rights_tier: r.item.rights_tier,
      usable_for: r.item.usable_for ?? [],
      link_status: r.item.link_status,
      replacement_url: r.item.replacement_url || null,
      issues: r.item.issues ?? [],
      evidence: r.item.evidence,
      extraction_notes: r.item.extraction_notes,
    })),
  };
}

/** audit records for the Official Records entries n = 1..543 */
export function orAudit(reviews) {
  const by = groupBy(reviews.filter((r) => r.n >= 1 && r.n <= OR_LAST));
  const records = new Map([...by].map(([n, rs]) => [n, auditRecord(rs)]));
  const systematicNs = [...by.keys()].filter((n) => n % 9 === 1 && n <= 541);
  const extraNs = [...by.keys()].filter((n) => !(n % 9 === 1 && n <= 541));
  const count = (ns) => tally(ns.map((n) => records.get(n).description_rating));
  const firstPassOnly = (ns) => tally(ns.map((n) => { const rec = records.get(n); const first = rec.reviews.find((x) => x.pass === 1); return first.description_accuracy; }));
  const doubly = [...by].filter(([, rs]) => rs.length > 1).map(([n]) => n);
  const agree = doubly.filter((n) => records.get(n).description_raters_differ === false);
  const secondStricter = doubly.filter((n) => { const rec = records.get(n); const a = rec.reviews.find((x) => x.pass === 1).description_accuracy; const b = rec.reviews.find((x) => x.pass === 2).description_accuracy; return DESCRIPTION_RANK[b] > DESCRIPTION_RANK[a]; });
  const sys = descriptionSystemic(count(systematicNs));
  const sysFirstPass = descriptionSystemic(firstPassOnly(systematicNs));
  const doublyFirst = descriptionSystemic(tally(doubly.map((n) => records.get(n).reviews.find((x) => x.pass === 1).description_accuracy)));
  const doublyWorst = descriptionSystemic(count(doubly));
  const verdicts = tally([...by.values()].flat().map((r) => r.item.verdict));
  const nhr = [...by].filter(([, rs]) => rs.some((r) => r.item.verdict !== 'APPROVE')).map(([n]) => n);
  return {
    records,
    summary: {
      audited_entries: by.size,
      audit_reviews: [...by.values()].flat().length,
      systematic_sample: { rule: 'n = 1 mod 9 within 1..541 (every ninth entry)', entries: systematicNs.length, ratings_worst_of_all_auditors: count(systematicNs), ratings_first_auditor_only: firstPassOnly(systematicNs), systemic_test: sys, systemic_test_first_auditor_only: sysFirstPass },
      extra_entries: extraNs,
      all_audited_ratings_worst_of: count([...by.keys()]),
      all_audited_ratings_first_auditor_only: firstPassOnly([...by.keys()]),
      doubly_audited: { entries: doubly, same_description_rating: agree.length, second_auditor_stricter: secondStricter.length, second_auditor_stricter_entries: secondStricter, first_auditor_non_accurate_share: doublyFirst.share, worst_of_non_accurate_share: doublyWorst.share },
      verdicts,
      entries_with_a_verdict_other_than_approve: nhr,
      expected_not_accurate_among_543: { point: Math.round((sys.share ?? 0) * OR_LAST), lo: Math.round((sys.wilson95[0] ?? 0) * OR_LAST), hi: Math.round((sys.wilson95[1] ?? 0) * OR_LAST), basis: '61-entry systematic sample, worst-of-all-auditors, Wilson 95% interval' },
    },
  };
}

/** audit records for the Part XIII pointers n = 658..1714, plus the pages beyond the list (items numbered > 1714) */
export function pointerAudit(reviews) {
  const listed = groupBy(reviews.filter((r) => r.n >= PART_XIII_FIRST && r.n <= LIST_LENGTH));
  const beyond = groupBy(reviews.filter((r) => r.n > LIST_LENGTH));
  const records = new Map([...listed].map(([n, rs]) => [n, auditRecord(rs)]));
  const isSys = (n) => (n - PART_XIII_FIRST) % 35 === 0;
  const sysNs = [...listed.keys()].filter(isSys);
  const targNs = [...listed.keys()].filter((n) => !isSys(n));
  const count = (ns) => tally(ns.map((n) => records.get(n).description_rating));
  const verdicts = tally([...listed.values()].flat().map((r) => r.item.verdict));
  const unlisted = [...beyond].map(([n, rs]) => ({
    n_in_review: n,
    printed_page: n - PAGE_OFFSET,
    not_a_list_entry: true,
    verdicts: Object.fromEntries(rs.map((r) => [r.id, r.item.verdict])),
    kind: rs[0].item.kind,
    side_by_reviewer: Object.fromEntries(rs.map((r) => [r.id, r.item.side])),
    rights_tier_by_reviewer: Object.fromEntries(rs.map((r) => [r.id, r.item.rights_tier])),
    written: rs[0].item.written ?? null,
    description_accuracy_by_reviewer: Object.fromEntries(rs.map((r) => [r.id, r.item.description_accuracy])),
    evidence_excerpt: String(rs[0].item.evidence ?? '').replace(/\s+/g, ' ').slice(0, 320),
    refs: rs.map((r) => r.ref),
    replacement_url: rs.map((r) => r.item.replacement_url).find(Boolean) ?? null,
    issues: rs.flatMap((r) => r.item.issues ?? []),
  })).sort((a, b) => a.printed_page - b.printed_page);
  const sysCount = count(sysNs);
  return {
    records,
    unlisted,
    summary: {
      audited_listed_pages: listed.size,
      pages_read_by_two_auditors: [...listed.values()].filter((rs) => rs.length > 1).length,
      audit_reviews_on_listed_pages: [...listed.values()].flat().length,
      systematic_sample: { rule: 'n = 658 + 35k (every 35th page pointer)', pages: sysNs.length, ratings: sysCount, non_accurate_share: wilson((sysCount['partly-inaccurate'] ?? 0) + (sysCount.inaccurate ?? 0), sysNs.length) },
      targeted_pages: { pages: targNs.length, ratings: count(targNs), note: 'chosen by the reviewer because they carry a page-specific note, sit on a boundary, or are the one plate; not a random sample' },
      all_audited_ratings_worst_of: count([...listed.keys()]),
      verdicts_on_listed_pages: verdicts,
      unlisted_pages: { count: unlisted.length, first_printed_page: unlisted[0]?.printed_page ?? null, last_printed_page: unlisted.at(-1)?.printed_page ?? null, note: 'Items numbered beyond 1714 are printed pages 1060 onward: they exist in the Part 3 volume but are NOT entries in the list. They are recorded as notes about the list\'s incompleteness and never as entries.' },
    },
  };
}
