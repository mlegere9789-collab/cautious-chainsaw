// Merge rules for the vetted registry of Gettysburg_Sources_v2.docx. Pure functions: no I/O, no clock, no network.
//
// The rules are the whole point, so they are stated here in code and in docs/historian/sources-v2/VERIFICATION-METHOD.md:
//
//   Official Records entries (Parts I-III, 543):   APPROVED-CROSSWALK  iff the structural check against the OCR passed and no
//                                                                       audit reviewer found the listed locator wrong; the
//                                                                       description is marked untrusted when the description
//                                                                       audit shows the template is systemically inaccurate
//   Page pointers (Part XIII, 1,057):              APPROVED-POINTER    iff structurally consistent; never counted as writings
//   Other works (Parts IV-XII, 114):               every reviewer who examined the entry counts (two to four of them):
//                                                  APPROVED            iff ALL reviewers say APPROVE for verbatim use and ALL agree
//                                                                       on identity, rights tier (the same one, A1 or A2) and
//                                                                       extraction path (unanimity)
//                                                  APPROVED-LINKOUT-ONLY iff ALL say link-out only and agree on identity; the
//                                                                       tier recorded is the MORE restrictive one
//                                                  REJECTED            iff ALL reject (and at least two do), each with evidence
//                                                  NEEDS-HUMAN-REVIEW  on any other disagreement, any request for review, any
//                                                                       REJECT against a non-REJECT (every rationale kept)
//                                                  NOT-VERIFIED        fewer than two reviewers: nothing is approved on one
//                                                                       reviewer's word or on automated checks alone
//   Duplicates are merged (DUPLICATE) only on a hard identity (same HathiTrust volume id, same document id).

import { ADAPTER_PREFERENCE } from './derive.mjs';

/** order adapters the way the ingest queue prefers them (Internet Archive scans first, hand transcription last) */
const adaptersPreferred = (list) => [...list].sort((a, b) => ADAPTER_PREFERENCE.indexOf(a) - ADAPTER_PREFERENCE.indexOf(b));

export const STATUSES = ['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER', 'NEEDS-HUMAN-REVIEW', 'REJECTED', 'NOT-VERIFIED', 'DUPLICATE'];
export const APPROVED_STATUSES = new Set(['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER']);
export const TIERS = ['A1', 'A2', 'B', 'C', 'unknown'];
/** how restrictive a tier is: higher means fewer things may be done with the text */
export const TIER_RANK = { A1: 0, A2: 1, B: 2, C: 3, unknown: 4 };

export const tierClass = (s) => {
  const m = /^(A1|A2|B|C)\b/.exec(String(s ?? ''));
  return m ? m[1] : 'unknown';
};

/** the most restrictive of several tier classes (A1 < A2 < B < C < unknown) */
export const mostRestrictiveTier = (tiers) => tiers.reduce((a, b) => (TIER_RANK[b] > TIER_RANK[a] ? b : a), tiers[0] ?? 'unknown');

export const verdictClass = (v) => (['APPROVE', 'APPROVE-LINKOUT-ONLY', 'NEEDS-HUMAN-REVIEW', 'REJECT'].includes(v) ? v : 'UNKNOWN');

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canonUrl = (u) => String(u ?? '').trim().replace(/^http:/i, 'https:').replace(/\/web\/(\d+)[a-z]{1,3}_\//i, '/web/$1/').replace(/\/+$/, '');

/** how much worse one description rating is than another */
export const DESCRIPTION_RANK = { accurate: 0, unverifiable: 0, 'partly-inaccurate': 1, inaccurate: 2 };

/** the first-pass and second-pass vocabulary of one review, as the merge rules read it */
export function voteOf(item, derived, id, pass) {
  return {
    id,
    pass,
    verdict: verdictClass(item.verdict),
    tier: tierClass(item.rights_tier),
    match: item.bibliographic_match,
    quote: (item.usable_for ?? []).includes('verbatim-quote-corpus'),
    evidence_ok: String(item.evidence ?? '').trim().length >= 40,
    sources: [...new Set([...(derived?.source?.text_ids ?? []).map((x) => x.id), ...(derived?.source?.listed_id ? [derived.source.listed_id] : [])])],
    adapters: [...new Set((derived?.adapters ?? []).map((x) => x.adapter))],
    text_state: derived?.text_state ?? 'none',
    years: derived?.years ?? [],
  };
}

/**
 * Divergences between any number of reviews of one entry, worth showing a human. Computed, not hand-written.
 * @param {object[]} items the raw reviewer outputs
 * @param {string[]} ids   the reviewer ids, in the same order
 */
export function divergencesOf(items, ids) {
  const out = [];
  const fields = [
    ['verdict', (p) => p.verdict],
    ['rights_tier_class', (p) => tierClass(p.rights_tier)],
    ['bibliographic_match', (p) => p.bibliographic_match],
    ['description_accuracy', (p) => p.description_accuracy],
    ['link_status', (p) => p.link_status],
    ['kind', (p) => p.kind],
    ['side', (p) => p.side],
    ['gettysburg_relevance', (p) => p.gettysburg_relevance],
    ['replacement_url', (p) => canonUrl(p.replacement_url) || null],
  ];
  for (const [field, get] of fields) {
    const vals = items.map((p) => get(p) ?? null);
    if (new Set(vals.map((v) => JSON.stringify(v))).size > 1) out.push({ field, values: Object.fromEntries(ids.map((id, i) => [id, vals[i]])) });
  }
  return out;
}

/** two-reviewer form kept for the truth-table tests and for callers that hold exactly two reviews */
export function divergences(p1, p2) {
  return divergencesOf([p1, p2], ['pass1', 'pass2']).map((d) => ({ field: d.field, pass1: d.values.pass1, pass2: d.values.pass2 }));
}

export function adapterIntersection(a, b) {
  const sb = new Set(b);
  return a.filter((x) => sb.has(x) && x !== 'none');
}

/** the adapters every reviewer names, in the queue's order of preference */
export function commonAdapters(lists) {
  if (!lists.length) return [];
  let acc = lists[0].filter((x) => x !== 'none');
  for (const l of lists.slice(1)) acc = adapterIntersection(acc, l);
  return adaptersPreferred(acc);
}

/** do two source-key sets name the same item? (same key; or the same long page slug on one host) */
function sharedSource(a, b, sameItem) {
  for (const x of a) for (const y of b) if (sameItem(x, y)) return x === y ? x : `${x} = ${y}`;
  return null;
}

/**
 * Identity: every reviewer identified the work (confirmed or partial) AND every pair of reviewers names the same text source
 * or, where the scans differ, the same imprint year (a different scan of one edition). A reviewer who names no source stands
 * for the listed link itself.
 * @param {object[]} votes
 * @param {{listedKey?: string|null, sameItem: (a:string,b:string)=>boolean}} ctx
 */
export function identityAgreement(votes, ctx) {
  const identified = votes.map((v) => ['confirmed', 'partial'].includes(v.match));
  const eff = votes.map((v) => (v.sources.length ? v.sources : ctx.listedKey ? [ctx.listedKey] : []));
  const pairs = [];
  for (let i = 0; i < votes.length; i++) {
    for (let j = i + 1; j < votes.length; j++) {
      const shared = eff[i].length && eff[j].length ? sharedSource(eff[i], eff[j], ctx.sameItem) : null;
      const yrs = votes[i].years.filter((y) => votes[j].years.includes(y));
      let basis = null;
      if (shared) basis = 'same-source';
      else if (eff[i].length && eff[j].length && yrs.length && identified[i] && identified[j]) basis = 'same-edition-by-imprint-year';
      pairs.push({ a: votes[i].id, b: votes[j].id, basis, shared: shared ?? null, imprint_years: basis === 'same-edition-by-imprint-year' ? yrs : undefined });
    }
  }
  const allIdentified = identified.every(Boolean);
  const allPairs = pairs.every((p) => p.basis);
  const agree = votes.length >= 2 && allIdentified && allPairs;
  const bases = new Set(pairs.map((p) => p.basis).filter(Boolean));
  return {
    agree,
    basis: !agree ? (allIdentified ? 'sources-differ' : 'a-reviewer-could-not-identify-the-work') : bases.has('same-edition-by-imprint-year') ? 'same-edition-by-imprint-year (different scans)' : 'same-source',
    per_reviewer: votes.map((v, i) => ({ reviewer: v.id, bibliographic_match: v.match, sources: eff[i] })),
    pairs,
  };
}

/** Rights tier: every reviewer gives the same class; the recorded tier is the more restrictive one when they differ. */
export function tierAgreement(votes) {
  const tiers = votes.map((v) => v.tier);
  const distinct = [...new Set(tiers)];
  return { agree: distinct.length === 1, values: Object.fromEntries(votes.map((v) => [v.id, v.tier])), most_restrictive: mostRestrictiveTier(tiers) };
}

/** Extraction path: every reviewer allows verbatim use and the adapters they read from have one in common. */
export function pathAgreement(votes) {
  const common = commonAdapters(votes.map((v) => v.adapters));
  const allQuote = votes.every((v) => v.quote);
  return {
    agree: votes.length >= 2 && allQuote && common.length > 0,
    agreed_adapter: common[0] ?? null,
    common_adapters: common,
    verbatim_quote_corpus_by_reviewer: Object.fromEntries(votes.map((v) => [v.id, v.quote])),
    adapters_by_reviewer: Object.fromEntries(votes.map((v) => [v.id, v.adapters])),
    text_state_by_reviewer: Object.fromEntries(votes.map((v) => [v.id, v.text_state])),
  };
}

/**
 * Decide a non-OR entry from all of its reviews.
 * @param {object[]} votes  from voteOf()
 * @param {{listedKey?: string|null, sameItem?: (a:string,b:string)=>boolean, divergences?: object[]}} ctx
 * @returns {{status, rule, reason, agreement, divergences, tier, tier_recorded, ingest_state, adapter}}
 */
export function decideNonOrN(votes, ctx = {}) {
  const sameItem = ctx.sameItem ?? ((a, b) => a === b);
  const n = votes.length;
  const identity = identityAgreement(votes, { listedKey: ctx.listedKey ?? null, sameItem });
  const tier = tierAgreement(votes);
  const path = pathAgreement(votes);
  const verdicts = votes.map((v) => v.verdict);
  const verdict = { agree: new Set(verdicts).size === 1, values: Object.fromEntries(votes.map((v) => [v.id, v.verdict])) };
  const agreement = { reviewers: n, verdict, identity, tier, path };
  const base = { agreement, divergences: ctx.divergences ?? [], tier: null, tier_recorded: n ? tier.most_restrictive : null, ingest_state: null, adapter: null };
  const out = (status, rule, reason, extra = {}) => ({ status, rule, reason, ...base, ...extra });
  const who = (pred) => votes.filter(pred).map((v) => v.id).join(', ');

  if (n < 2) return out('NOT-VERIFIED', 'R16-fewer-than-two-reviewers', n ? 'Only one reviewer examined this entry; nothing is approved on one reviewer\'s word.' : 'No reviewer output was received for this entry; nothing is approved on automated checks alone.');

  const rejects = votes.filter((v) => v.verdict === 'REJECT' && v.evidence_ok);
  if (rejects.length >= 2 && rejects.length === n) return out('REJECTED', 'R1-all-reject', `All ${n} reviewers rejected the entry, each with evidence.`);
  if (verdicts.includes('REJECT')) {
    const rej = verdicts.filter((x) => x === 'REJECT').length;
    return out('NEEDS-HUMAN-REVIEW', 'R2-reject-vs-other', `${rej} of ${n} reviewers rejected the entry (${who((v) => v.verdict === 'REJECT')})${rej < n ? `; the other ${n - rej} did not (${who((v) => v.verdict !== 'REJECT')})` : ', but a reject without evidence does not count'}: the reviewers disagree, every rationale is kept.`);
  }
  if (verdicts.includes('NEEDS-HUMAN-REVIEW') || verdicts.includes('UNKNOWN')) {
    return out('NEEDS-HUMAN-REVIEW', 'R3-reviewer-asked-for-review', `${who((v) => v.verdict === 'NEEDS-HUMAN-REVIEW' || v.verdict === 'UNKNOWN')} asked for human review; the stricter verdict holds.`);
  }
  if (!verdict.agree) return out('NEEDS-HUMAN-REVIEW', 'R4-verbatim-use-disputed', `Reviewers split between verbatim use (${who((v) => v.verdict === 'APPROVE')}) and link-out only (${who((v) => v.verdict === 'APPROVE-LINKOUT-ONLY')}).`);

  if (verdicts[0] === 'APPROVE-LINKOUT-ONLY') {
    if (!identity.agree) return out('NEEDS-HUMAN-REVIEW', 'R5-linkout-identity-disagreement', `All say link-out only but the reviewers do not agree on identity (${identity.basis}).`);
    return out('APPROVED-LINKOUT-ONLY', 'R6-linkout-agreed', `All ${n} reviewers agree on identity and that the entry may be linked but not quoted; the recorded tier is the more restrictive one (${tier.most_restrictive}${tier.agree ? '' : ', the reviewers differ'}).`, { tier: tier.most_restrictive });
  }

  // all APPROVE
  const fails = [!identity.agree && 'identity', !(tier.agree && ['A1', 'A2'].includes(tier.most_restrictive)) && 'rights tier', !path.agree && 'extraction path'].filter(Boolean);
  if (fails.length) return out('NEEDS-HUMAN-REVIEW', 'R7-approve-but-criteria-differ', `All said APPROVE but the reviewers do not agree on: ${fails.join(', ')}.`);
  const t = tier.most_restrictive;
  const imageOnly = path.agreed_adapter === 'manual-transcription' || votes.some((v) => v.text_state === 'image-only');
  const ingest_state = t === 'A2' ? (imageOnly ? 'hold:rights-review+manual-transcription' : 'hold:rights-review') : imageOnly ? 'blocked:manual-transcription' : 'ready';
  return out('APPROVED', 'R8-quote-corpus-agreed', `All ${n} reviewers agree on identity (${identity.basis}), rights tier ${t} and extraction path (${path.agreed_adapter}).`, { tier: t, ingest_state, adapter: path.agreed_adapter });
}

/**
 * Two-reviewer form kept for callers (and the truth-table tests) that hold exactly two raw reviewer outputs plus a
 * normalisation block: p1, p2 = raw outputs; norm = review-norm.json items[n] (source_key, adapters_read, text_state).
 */
export function decideNonOr(p1, p2, norm) {
  const mk = (p, i) => {
    const np = norm?.passes?.[String(i)];
    return voteOf(p, { source: { text_ids: np?.source_key ? [{ id: np.source_key }] : [], listed_id: null }, adapters: (np?.adapters_read ?? []).filter((a) => a !== 'none').map((adapter) => ({ adapter })), text_state: np?.text_state ?? 'none', years: [] }, `pass${i}`, i);
  };
  const d = decideNonOrN([mk(p1, 1), mk(p2, 2)], { divergences: divergences(p1, p2) });
  // the old shape: agreement.identity / tier / path with pass1 and pass2 sub-objects
  return d;
}

/** Official Records entry (Parts I-III): crosswalk approval from the structural result */
export function decideCrosswalk(s) {
  if (!s) return { status: 'NOT-VERIFIED', rule: 'R9-no-structural-result', reason: 'No structural result for this entry.' };
  if (s.status === 'pass' || s.status === 'pass_notes') {
    return { status: 'APPROVED-CROSSWALK', rule: 'R10-structural-pass', reason: s.status === 'pass' ? 'Report number, author, side and page range agree with the OCR header index of the Internet Archive scan.' : `Identity agrees with the OCR header index; notes: ${s.notes.join('; ')}.` };
  }
  return { status: 'NEEDS-HUMAN-REVIEW', rule: 'R11-structural-flag', reason: `Structural check flagged: ${s.flags.join(', ')}.` };
}

export function decidePointer(s) {
  if (!s) return { status: 'NOT-VERIFIED', rule: 'R9-no-structural-result', reason: 'No structural result for this entry.' };
  if (s.status === 'pass' || s.status === 'pass_notes') {
    return { status: 'APPROVED-POINTER', rule: 'R12-pointer-consistent', reason: s.status === 'pass' ? 'The printed page exists in the Archive folio map and its side label agrees with the dispatch headers on it.' : `The page exists; notes: ${s.notes.join('; ')}.` };
  }
  return { status: 'NEEDS-HUMAN-REVIEW', rule: 'R13-pointer-flag', reason: `Structural check flagged: ${s.flags.join(', ')}.` };
}

/**
 * An audit reviewer who looked at the page image and says the listed first page is wrong overrides a structural pass: a
 * crosswalk whose first page does not agree is not approved. `correction` is the reviewer's own statement (anchored in the
 * batch text, see qc/or-locator-corrections.json); the status goes to a human with the corrected page recorded.
 */
export function applyLocatorCorrection(decision, correction) {
  if (!correction || correction.kind !== 'wrong-first-page') return decision;
  return {
    status: 'NEEDS-HUMAN-REVIEW',
    rule: 'R11b-audit-locator-wrong',
    reason: `The audit reviewer viewed the scan and found the listed first page wrong (listed p. ${correction.listed_first_page}, first page of this report p. ${correction.first_page}); the structural check had ${decision.status === 'APPROVED-CROSSWALK' ? 'passed it within its one-page tolerance' : 'also flagged it'}. Identity and page range are kept in the record, a human confirms the corrected page.`,
  };
}

/** Wilson score interval for a proportion k/n (z = 1.96 for 95%) */
export function wilson(k, n, z = 1.96) {
  if (!n) return { p: null, lo: null, hi: null };
  const p = k / n;
  const z2 = z * z;
  const den = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den;
  return { p, lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

/**
 * Is the description template of the Official Records entries systemically inaccurate? Yes when the 95% Wilson lower bound
 * of the share of audited descriptions that are not "accurate" exceeds the threshold. The rule is stated so that it can be
 * tested and argued with; the threshold is 10%.
 */
export const DESCRIPTION_SYSTEMIC_THRESHOLD = 0.1;
export function descriptionSystemic(counts) {
  const n = (counts.accurate ?? 0) + (counts['partly-inaccurate'] ?? 0) + (counts.inaccurate ?? 0);
  const bad = (counts['partly-inaccurate'] ?? 0) + (counts.inaccurate ?? 0);
  const w = wilson(bad, n);
  return { sample_n: n, not_accurate: bad, accurate: counts.accurate ?? 0, share: w.p, wilson95: [w.lo, w.hi], threshold: DESCRIPTION_SYSTEMIC_THRESHOLD, systemic: n > 0 && w.lo > DESCRIPTION_SYSTEMIC_THRESHOLD };
}

/** rights hint for an unreviewed entry from what the probe itself fetched. A hint is never a tier. */
export function rightsHint(probe, e) {
  if (!probe) return null;
  if (probe.gb_viewability) {
    const info = probe.gb_bookinfo ?? '';
    // the first plausible publication year in the bibliographic block ("Publisher , Oct 1, 2001 - History")
    const yr = /\b(1[5-9]\d\d|20[0-2]\d)\b/.exec(info)?.[1];
    const view = probe.gb_viewability;
    if (yr && Number(yr) <= 1930) return { class: 'A-candidate', edition: info.slice(0, 70), basis: `Google Books edition on the linked page: "${info.slice(0, 90)}" (${yr}, ${view}); confirm the title page, then take the text from the Internet Archive copy` };
    if (yr && view === 'full_view') return { class: 'reprint-candidate', edition: info.slice(0, 70), basis: `Google Books shows Full view of a ${yr} reprint ("${info.slice(0, 90)}"); the plan accepts original imprints only, so an original-imprint scan has to be found` };
    if (yr) return { class: 'C-candidate', edition: info.slice(0, 70), basis: `Google Books edition on the linked page: "${info.slice(0, 90)}" (published ${yr}, ${view}); a modern edition is not free to reuse` };
    return { class: null, basis: `Google Books viewability ${view}; edition year not read` };
  }
  if (probe.ia_id && probe.link_class === 'live') return { class: 'A-candidate', basis: 'Internet Archive item exists; its own date field must be confirmed on the title page before any tier (the date field is sometimes the series start)' };
  if (probe.host === 'gutenberg.org' && probe.link_class === 'live') return { class: 'A-candidate', basis: 'Project Gutenberg e-text (the project treats it as public domain in the US); the original imprint year must be confirmed' };
  if (['cupola.gettysburg.edu', 'journals.psu.edu'].includes(probe.host)) return { class: 'C-candidate', basis: 'journal article: free to read is not free to reuse; no licence was read' };
  return null;
}

export function blockingIssue(probe) {
  if (!probe) return null;
  switch (probe.link_class) {
    case 'dead': return 'dead_link';
    case 'redirected_to_generic_page': return 'dead_link_redirects_to_generic_page';
    case 'robots_disallowed': return 'robots_disallow_automated_access';
    case 'blocked_to_bots': return 'blocked_to_bots';
    case 'not_fetched_robots_unreadable': return 'host_unreachable_robots_unreadable';
    case 'timeout': case 'network_error': case 'server_error': return 'host_error';
    default: return null;
  }
}

export { same };
