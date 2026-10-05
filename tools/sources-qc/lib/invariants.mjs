// The machine-checkable guarantees of the vetted registry, as one function: checkRegistry(registry, queue) returns the list
// of violations (empty when the registry keeps every guarantee). tests/sources-qc runs it on the real registry (must be empty)
// and on deliberately corrupted copies (each corruption must be caught by the named invariant), so the guarantees are
// themselves tested. A registry that does not satisfy them is wrong, whoever or whatever produced it.
//
//   node --test "tests/sources-qc/*.test.mjs"
//   SOURCES_QC_REGISTRY=path/to/corrupted.json node --test "tests/sources-qc/*.test.mjs"   # shows the suite red on a bad copy

import { tierClass, mostRestrictiveTier, STATUSES } from './registry.mjs';

export const FORBIDDEN_HOST_RE = /(?:^|\.)(?:ehistory\.osu\.edu|babel\.hathitrust\.org|hdl\.handle\.net|perseus\.tufts\.edu)(?:[/:]|$)/i;
export const ALLOWED_ADAPTERS = ['archive-fulltext', 'gutenberg', 'pdf-text', 'html', 'loc-ocr', 'manual-transcription'];
export const SIDE_VOCAB = ['union', 'confederate', 'civilian', 'mixed-or-neutral', 'contested'];
const APPROVED = new Set(['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER']);

const hostOfUrl = (u) => { try { return new URL(u).hostname.toLowerCase(); } catch { return ''; } };
const evidenceNamesReplacement = (url, text) => {
  const stamp = /\/web\/(\d{8,14})/.exec(url)?.[1] ?? null;
  const ia = /archive\.org\/(?:details|stream|download)\/([^/?#]+)/.exec(url)?.[1] ?? null;
  const segs = String(url).replace(/^https?:\/\/[^/]+/i, '').split(/[/?#]/).filter((s) => s.length >= 10 && !/^\d+$/.test(s));
  const slug = segs.at(-1) ?? null;
  return !!((stamp && text.includes(stamp)) || (ia && text.includes(ia)) || (slug && text.includes(slug)));
};

/**
 * @param {object} registry parsed registry.json
 * @param {object} queue    parsed ingest-queue.json
 * @returns {{id: string, entry: number|null, message: string}[]}
 */
export function checkRegistry(registry, queue) {
  const V = [];
  const bad = (id, entry, message) => V.push({ id, entry, message });
  const E = registry.entries;
  const byN = new Map(E.map((e) => [e.n, e]));

  // ---- list shape: exactly the 1714 entries, in order; nothing numbered beyond the list
  if (E.length !== 1714) bad('list-shape', null, `registry holds ${E.length} entries, the list has 1714`);
  E.forEach((e, i) => {
    if (e.n !== i + 1 || e.id !== `sv2-${String(i + 1).padStart(4, '0')}`) bad('list-shape', e.n, `entry out of order or misnumbered at position ${i + 1}`);
    if (e.n > 1714) bad('no-entry-beyond-the-list', e.n, 'an entry numbered beyond 1714 exists: pages after 1059 are notes about the list\'s incompleteness, not entries');
    if (e.or_locator?.printed_page > 1059) bad('no-entry-beyond-the-list', e.n, `a pointer to printed page ${e.or_locator.printed_page}, after the list's last page 1059`);
  });
  const li = registry.meta.list_incompleteness;
  for (const u of li?.part_xiii_unlisted_pages ?? []) {
    if (u.not_a_list_entry !== true || u.printed_page <= 1059) bad('unlisted-pages-are-notes', null, `unlisted page record ${u.printed_page} is not marked as a note`);
  }

  for (const e of E) {
    // ---- every entry: vocabulary, rule, reason, evidence
    if (!STATUSES.includes(e.final_status)) bad('status-vocabulary', e.n, `status ${e.final_status}`);
    if (!e.status_rule || !/^R\d/.test(e.status_rule)) bad('status-rule', e.n, 'no rule');
    if (typeof e.status_reason !== 'string' || e.status_reason.length < 20) bad('status-rule', e.n, 'no reason');
    if (!Array.isArray(e.evidence) || !e.evidence.length || e.evidence.some((x) => !x.type || !x.ref || !x.summary)) bad('evidence', e.n, 'missing or incomplete evidence');
    if (!Array.isArray(e.links) || e.links.some((l) => !l.link_class)) bad('evidence', e.n, 'a link without a link_class');

    // ---- rights: no A1 or A2 without a basis
    if (['A1', 'A2'].includes(e.tier) && !(typeof e.tier_basis === 'string' && e.tier_basis.length >= 40)) bad('rights-basis', e.n, `tier ${e.tier} has no tier_basis`);

    // ---- only APPROVED text is quotable; unverified is usable for nothing
    if (e.usable_for?.includes('verbatim-quote-corpus') && e.final_status !== 'APPROVED') bad('quote-only-if-approved', e.n, `status ${e.final_status} is marked usable for the quote corpus`);
    if (e.final_status === 'NOT-VERIFIED' && (e.usable_for.length || e.tier != null)) bad('unverified-is-unusable', e.n, 'an unverified entry has a tier or a use');
    if (e.entry_kind === 'non_or' && e.final_status === 'NEEDS-HUMAN-REVIEW' && e.usable_for.length) bad('unverified-is-unusable', e.n, 'an entry sent to a human is marked usable');

    if (e.entry_kind === 'non_or' && e.verification.reviews) {
      const rs = e.verification.reviews;
      const ids = rs.map((r) => r.id);
      const batches = new Set(rs.map((r) => `${r.round}/${r.batch}`));
      const tiers = rs.map((r) => tierClass(r.rights_tier));
      if (rs.length < 2 || batches.size !== rs.length || !rs.some((r) => r.pass === 1) || !rs.some((r) => r.pass === 2)) bad('independent-reviewers', e.n, 'fewer than two independent reviewers, or no reviewer from each pass');
      if (JSON.stringify(e.verification.verifiers) !== JSON.stringify(ids)) bad('independent-reviewers', e.n, 'verifiers do not match the reviews');
      // rights tiers: the recorded tier is the MORE restrictive one when reviewers differ
      const most = mostRestrictiveTier(tiers);
      if (e.tier_most_restrictive !== most) bad('restrictive-tier', e.n, `tier_most_restrictive ${e.tier_most_restrictive}, reviewers say ${tiers.join('/')}`);
      if (e.tier !== most) bad('restrictive-tier', e.n, `recorded tier ${e.tier} is not the most restrictive tier given (${most}; reviewers ${tiers.join('/')})`);
      const a = e.verification.agreement;

      if (e.final_status === 'APPROVED') {
        // unanimity on verdict, identity, tier and extraction path
        if (rs.some((r) => r.verdict !== 'APPROVE')) bad('unanimity', e.n, `approved for the quote corpus but a reviewer said ${rs.map((r) => r.verdict).join('/')}`);
        if (rs.some((r) => !r.usable_for.includes('verbatim-quote-corpus'))) bad('unanimity', e.n, 'a reviewer does not allow verbatim use');
        if (new Set(tiers).size !== 1 || !['A1', 'A2'].includes(tiers[0])) bad('unanimity', e.n, `reviewers differ on the tier (${tiers.join('/')}) or it is not A1/A2`);
        if (rs.some((r) => !['confirmed', 'partial'].includes(r.bibliographic_match)) || !a.identity.agree) bad('unanimity', e.n, 'identity not agreed by every reviewer');
        if (!a.path.agree || !a.path.agreed_adapter) bad('unanimity', e.n, 'extraction path not agreed');
        else if (rs.some((r) => !r.derived.adapters.some((x) => x.adapter === a.path.agreed_adapter))) bad('unanimity', e.n, 'a reviewer does not name the agreed adapter');
        if (!e.ingest || !ALLOWED_ADAPTERS.includes(e.ingest.adapter)) bad('allowed-adapter', e.n, `adapter ${e.ingest?.adapter}`);
        if (e.ingest) {
          const state = e.ingest.state;
          const expect = e.tier === 'A2' ? 'hold:rights-review' : e.ingest.adapter === 'manual-transcription' || Object.values(a.path.text_state_by_reviewer).includes('image-only') ? 'blocked:manual-transcription' : 'ready';
          if (!state.startsWith(expect)) bad('ingest-state', e.n, `ingest state ${state}, expected ${expect}`);
        }
      }
      if (e.final_status === 'APPROVED-LINKOUT-ONLY') {
        if (rs.some((r) => r.verdict !== 'APPROVE-LINKOUT-ONLY')) bad('unanimity', e.n, `link-out only but a reviewer said ${rs.map((r) => r.verdict).join('/')}`);
        if (!a.identity.agree) bad('unanimity', e.n, 'link-out only without agreed identity');
        if (e.usable_for.includes('verbatim-quote-corpus')) bad('quote-only-if-approved', e.n, 'a link-out entry is quotable');
      }
      if (e.final_status === 'REJECTED') {
        if (rs.length < 2 || rs.some((r) => r.verdict !== 'REJECT')) bad('reject-needs-all', e.n, 'rejected but not every reviewer rejected it');
      }
      if (e.final_status === 'NEEDS-HUMAN-REVIEW' && !e.status_rule.startsWith('R17') && rs.every((r) => r.verdict === 'APPROVE') && a.identity.agree && a.tier.agree && a.path.agree && ['A1', 'A2'].includes(most)) bad('human-review-reason', e.n, 'sent to a human although every criterion is met');
      if (e.final_status === 'NEEDS-HUMAN-REVIEW' && !e.verification.reviews.every((r) => r.rationale?.evidence)) bad('rationale-kept', e.n, 'a reviewer\'s rationale is missing from an entry sent to a human');

      // perspective fields the Historian needs
      if (['APPROVED', 'APPROVED-LINKOUT-ONLY'].includes(e.final_status)) {
        if (!SIDE_VOCAB.includes(e.side)) bad('perspective', e.n, `side ${e.side}`);
        if (!e.kind || !e.genre || !e.written?.text || typeof e.retrospective !== 'boolean' || !Array.isArray(e.persp_tags) || !e.persp_tags.length) bad('perspective', e.n, 'missing kind, genre, written, retrospective or tags');
      }

      // dead links: a replacement is accepted only where a reviewer fetched it and their own evidence names it
      for (const r of e.replacement_urls ?? []) {
        if (!r.url || !r.strength) bad('replacement-verified', e.n, 'replacement without url or strength');
        if (e.final_status === 'APPROVED' && e.listed_link_dead && !e.replacement_urls.some((x) => x.verified_by.length)) bad('replacement-verified', e.n, 'approved entry with a dead listed link and no reviewer-verified replacement');
        for (const who of r.verified_by) {
          const rev = rs.find((x) => x.id === who);
          if (!rev) { bad('replacement-verified', e.n, `verified_by names ${who}, not a reviewer of this entry`); continue; }
          if (!['confirmed', 'partial'].includes(rev.bibliographic_match) || !evidenceNamesReplacement(r.url, `${rev.rationale.evidence ?? ''}\n${rev.rationale.extraction_notes ?? ''}`)) bad('replacement-verified', e.n, `${who} is listed as having fetched ${r.url} but their evidence does not name it`);
        }
      }
      if (e.final_status === 'APPROVED' && e.listed_link_dead && !(e.replacement_urls ?? []).some((x) => x.verified_by.length)) bad('replacement-verified', e.n, 'approved entry whose listed link is dead has no verified replacement');
    }

    // ---- Official Records crosswalk and page pointers
    if (['or_report', 'or_page'].includes(e.entry_kind) && ['APPROVED-CROSSWALK', 'APPROVED-POINTER'].includes(e.final_status)) {
      if (e.verification.verifiers[0] !== 'structural-check') bad('structural-pass', e.n, 'approved without the structural check');
      if (!['pass', 'pass_notes'].includes(e.verification.structural?.status)) bad('structural-pass', e.n, `structural status ${e.verification.structural?.status}`);
      for (const f of e.verification.structural?.flags ?? []) if (f !== 'hathi_seq_offset_outlier') bad('structural-pass', e.n, `hard flag ${f}`);
      if (e.usable_for.includes('verbatim-quote-corpus')) bad('quote-only-if-approved', e.n, 'a crosswalk or pointer carries quotable text');
      if (e.audit && Object.values(e.audit.verdicts).some((v) => !['APPROVE', 'APPROVE-LINKOUT-ONLY'].includes(v))) bad('structural-pass', e.n, 'approved although an audit reviewer did not approve it');
      if (e.audit?.locator_correction) bad('structural-pass', e.n, 'approved although the audit found the first page wrong');
    }
    if (e.entry_kind === 'or_page' && (e.counts_as_writing_piece !== false || e.resource_class !== 'page-pointer')) bad('pointers-not-writings', e.n, 'a page pointer counted as a writing');
  }

  // ---- the description template of the OR entries: untrusted when the audit sample says it is systemically inaccurate
  const oa = registry.meta.or_description_audit;
  const sys = oa?.systematic_sample?.systemic_test;
  if (sys) {
    const recount = (sys.accurate ?? 0) + (sys.not_accurate ?? 0);
    if (recount !== sys.sample_n) bad('description-trust', null, 'systemic test counts do not add up');
    if (sys.systemic !== (sys.wilson95[0] > sys.threshold)) bad('description-trust', null, 'systemic flag does not follow from the interval');
    for (const e of E.filter((x) => x.entry_kind === 'or_report')) {
      const t = e.description_trust;
      if (sys.systemic && !e.audit && t !== 'untrusted') bad('description-trust', e.n, `unaudited description is ${t}, expected untrusted`);
      if (e.audit) {
        const r = e.audit.description_rating;
        const okT = r === 'accurate' ? /^audited-accurate/.test(t) : t === `audited-${r}`;
        if (!okT) bad('description-trust', e.n, `description_trust ${t} does not match the audit rating ${r}`);
      }
    }
  }

  // ---- duplicates only on a hard identity, pointing at a real entry
  for (const e of E.filter((x) => x.final_status === 'DUPLICATE')) {
    if (!E.some((x) => x.id === e.duplicate_of) || e.counts_as_writing_piece !== false || e.status_rule !== 'R14-duplicate-hard-identity') bad('duplicates', e.n, 'a duplicate that does not point at a real entry on a hard identity');
  }
  for (const e of E.filter((x) => x.duplicate_of && x.final_status !== 'DUPLICATE')) bad('duplicates', e.n, 'duplicate_of set on an entry that is not a DUPLICATE');

  // ---- the ingest queue
  const approvedNonOr = E.filter((e) => e.entry_kind === 'non_or' && e.final_status === 'APPROVED').map((e) => e.n).sort((a, b) => a - b);
  const queued = [];
  const allowed = new Set(queue.meta.adapters);
  if (queue.meta.adapters.includes('perseus') || JSON.stringify(queue.meta.adapters).includes('perseus')) bad('no-perseus-adapter', null, 'the queue lists a perseus adapter');
  for (const q of queue.ready) {
    const e = byN.get(q.n);
    if (!e || e.final_status !== 'APPROVED' || e.tier !== 'A1' || e.ingest?.state !== 'ready') bad('queue-ready', q.n, 'a ready item is not an APPROVED, A1, ready entry');
    if (!ALLOWED_ADAPTERS.includes(q.adapter) || q.adapter === 'perseus' || !allowed.has(q.adapter)) bad('allowed-adapter', q.n, `adapter ${q.adapter}`);
    if (!q.primary_url || FORBIDDEN_HOST_RE.test(hostOfUrl(q.primary_url) + '/') || q.cross_check_urls.some((u) => FORBIDDEN_HOST_RE.test(hostOfUrl(u) + '/'))) bad('no-forbidden-source', q.n, `primary ${q.primary_url}`);
    if (!q.segmentation || !q.citation) bad('queue-ready', q.n, 'incomplete queue item');
    if (!q.perspective.side || !q.perspective.genre) bad('queue-ready', q.n, 'no perspective');
    for (const m of q.entries) queued.push(m);
  }
  for (const q of queue.blocked) {
    const e = byN.get(q.n);
    if (!e || e.final_status !== 'APPROVED' || e.ingest?.state === 'ready') bad('queue-blocked', q.n, 'a blocked item is not an approved, not-ready entry');
    if (!ALLOWED_ADAPTERS.includes(q.adapter) || q.adapter === 'perseus') bad('allowed-adapter', q.n, `adapter ${q.adapter}`);
    if (q.primary_url && FORBIDDEN_HOST_RE.test(hostOfUrl(q.primary_url) + '/')) bad('no-forbidden-source', q.n, `primary ${q.primary_url}`);
    for (const m of q.entries) queued.push(m);
  }
  if (JSON.stringify([...queued].sort((a, b) => a - b)) !== JSON.stringify(approvedNonOr)) bad('queue-complete', null, 'the queue does not hold every APPROVED other work exactly once');
  const ranks = [...queue.ready, ...queue.blocked].map((q) => q.rank);
  if (JSON.stringify(ranks) !== JSON.stringify(ranks.map((_, i) => i + 1))) bad('queue-ranks', null, 'ranks are not 1..n in order');
  for (const q of queue.pending_decision) if (byN.get(q.n)?.final_status !== 'NEEDS-HUMAN-REVIEW') bad('queue-pending', q.n, 'pending item is not NEEDS-HUMAN-REVIEW');
  for (const q of queue.link_out_only) if (byN.get(q.n)?.final_status !== 'APPROVED-LINKOUT-ONLY') bad('queue-linkout', q.n, 'link-out item is not APPROVED-LINKOUT-ONLY');
  for (const q of queue.rejected) if (byN.get(q.n)?.final_status !== 'REJECTED') bad('queue-rejected', q.n, 'rejected item is not REJECTED');

  // ---- counts add up
  const c = registry.meta.counts;
  const recount = {};
  for (const e of E) recount[e.final_status] = (recount[e.final_status] ?? 0) + 1;
  if (JSON.stringify(recount) !== JSON.stringify(c.by_status) && JSON.stringify(Object.entries(recount).sort()) !== JSON.stringify(Object.entries(c.by_status).sort())) bad('counts', null, 'by_status does not match the entries');
  if (Object.values(c.by_status).reduce((a, b) => a + b, 0) !== E.length) bad('counts', null, 'by_status does not add up');
  if (c.by_entry_kind.or_report !== E.filter((e) => e.entry_kind === 'or_report').length) bad('counts', null, 'or_report count');
  return V;
}

export { APPROVED };
