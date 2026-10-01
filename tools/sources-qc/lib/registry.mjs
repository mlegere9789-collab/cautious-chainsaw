// Merge rules for the vetted registry of Gettysburg_Sources_v2.docx. Pure functions: no I/O, no clock, no network.
//
// The rules are the whole point, so they are stated here in code and in docs/historian/sources-v2/VERIFICATION-METHOD.md:
//
//   Official Records entries (Parts I-III, 543):   APPROVED-CROSSWALK  iff the structural check against the OCR passed
//   Page pointers (Part XIII, 1,057):              APPROVED-POINTER    iff structurally consistent; never counted as writings
//   Other works (Parts IV-XII, 114):               APPROVED            iff two independent verifiers agree on identity, rights tier (A1/A2)
//                                                                       and extraction path, and both say APPROVE for verbatim use
//                                                  APPROVED-LINKOUT-ONLY iff both say link-out only and agree on identity and tier
//                                                  NEEDS-HUMAN-REVIEW  on any disagreement, any request for review, any REJECT-vs-other
//                                                  REJECTED            iff both reject
//                                                  NOT-VERIFIED        no verifier has looked: nothing is approved on automated checks alone
//   Duplicates are merged (DUPLICATE) only on a hard identity (same HathiTrust volume id, same document id).

export const STATUSES = ['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER', 'NEEDS-HUMAN-REVIEW', 'REJECTED', 'NOT-VERIFIED', 'DUPLICATE'];
export const APPROVED_STATUSES = new Set(['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER']);
export const TIERS = ['A1', 'A2', 'B', 'C', 'unknown'];

export const tierClass = (s) => {
  const m = /^(A1|A2|B|C)\b/.exec(String(s ?? ''));
  return m ? m[1] : 'unknown';
};

export const verdictClass = (v) => (['APPROVE', 'APPROVE-LINKOUT-ONLY', 'NEEDS-HUMAN-REVIEW', 'REJECT'].includes(v) ? v : 'UNKNOWN');

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canonUrl = (u) => String(u ?? '').trim().replace(/^http:/i, 'https:').replace(/\/+$/, '');

/** divergences between two passes worth showing a human; computed, not hand-written */
export function divergences(p1, p2) {
  const out = [];
  const cmp = (field, a, b, label = field) => { if (!same(a, b)) out.push({ field: label, pass1: a ?? null, pass2: b ?? null }); };
  cmp('verdict', p1.verdict, p2.verdict);
  cmp('rights_tier', tierClass(p1.rights_tier), tierClass(p2.rights_tier), 'rights_tier_class');
  cmp('bibliographic_match', p1.bibliographic_match, p2.bibliographic_match);
  cmp('description_accuracy', p1.description_accuracy, p2.description_accuracy);
  cmp('link_status', p1.link_status, p2.link_status);
  cmp('kind', p1.kind, p2.kind);
  cmp('side', p1.side, p2.side);
  if (canonUrl(p1.replacement_url) !== canonUrl(p2.replacement_url)) out.push({ field: 'replacement_url', pass1: p1.replacement_url || null, pass2: p2.replacement_url || null });
  return out;
}

export function adapterIntersection(a, b) {
  const sb = new Set(b);
  return a.filter((x) => sb.has(x) && x !== 'none');
}

/**
 * Decide a double-reviewed non-OR entry. p1, p2 = raw reviewer outputs; norm = review-norm.json items[n].
 * Returns { status, rule, reason, agreement, tier, ingest_state, adapter }.
 */
export function decideNonOr(p1, p2, norm) {
  const v1 = verdictClass(p1.verdict);
  const v2 = verdictClass(p2.verdict);
  const t1 = tierClass(p1.rights_tier);
  const t2 = tierClass(p2.rights_tier);
  const n1 = norm?.passes?.['1'];
  const n2 = norm?.passes?.['2'];

  const idOk = (p) => ['confirmed', 'partial'].includes(p.bibliographic_match);
  const identity = {
    agree: !!(n1?.source_key && n2?.source_key && n1.source_key === n2.source_key && idOk(p1) && idOk(p2)),
    pass1: { bibliographic_match: p1.bibliographic_match, source_key: n1?.source_key ?? null },
    pass2: { bibliographic_match: p2.bibliographic_match, source_key: n2?.source_key ?? null },
  };
  const tier = { agree: t1 === t2, pass1: t1, pass2: t2 };
  const inter = adapterIntersection(n1?.adapters_read ?? [], n2?.adapters_read ?? []);
  const quote1 = (p1.usable_for ?? []).includes('verbatim-quote-corpus');
  const quote2 = (p2.usable_for ?? []).includes('verbatim-quote-corpus');
  const path = {
    agree: inter.length > 0 && quote1 && quote2,
    pass1: { adapters_read: n1?.adapters_read ?? [], verbatim_quote_corpus: quote1 },
    pass2: { adapters_read: n2?.adapters_read ?? [], verbatim_quote_corpus: quote2 },
    agreed_adapter: inter.length ? inter[0] : null,
  };
  const agreement = { identity, tier, path };
  const div = divergences(p1, p2);

  const out = (status, rule, reason, extra = {}) => ({ status, rule, reason, agreement, divergences: div, tier: null, ingest_state: null, adapter: null, ...extra });

  if (v1 === 'REJECT' && v2 === 'REJECT') return out('REJECTED', 'R1-both-reject', 'Both verifiers rejected the entry.');
  if (v1 === 'REJECT' || v2 === 'REJECT') {
    const who = v1 === 'REJECT' ? 'pass 1' : 'pass 2';
    return out('NEEDS-HUMAN-REVIEW', 'R2-reject-vs-other', `${who} rejected the entry and the other verifier did not: the verifiers disagree, both rationales are kept.`);
  }
  if (v1 === 'NEEDS-HUMAN-REVIEW' || v2 === 'NEEDS-HUMAN-REVIEW') {
    const who = [v1 === 'NEEDS-HUMAN-REVIEW' ? 'pass 1' : null, v2 === 'NEEDS-HUMAN-REVIEW' ? 'pass 2' : null].filter(Boolean).join(' and ');
    return out('NEEDS-HUMAN-REVIEW', 'R3-verifier-asked-for-review', `${who} asked for human review; the stricter verdict holds.`);
  }
  if (v1 !== v2) return out('NEEDS-HUMAN-REVIEW', 'R4-verbatim-use-disputed', 'One verifier allows verbatim use and the other allows link-out only.');

  if (v1 === 'APPROVE-LINKOUT-ONLY') {
    const fails = [!identity.agree && 'identity', !tier.agree && 'rights tier'].filter(Boolean);
    if (fails.length) return out('NEEDS-HUMAN-REVIEW', 'R5-linkout-disagreement', `Both say link-out only but the verifiers differ on ${fails.join(' and ')}.`);
    return out('APPROVED-LINKOUT-ONLY', 'R6-linkout-agreed', 'Both verifiers agree on identity and rights tier and that the entry may be linked but not quoted.', { tier: t1 });
  }

  // both APPROVE
  const fails = [!identity.agree && 'identity', !(tier.agree && ['A1', 'A2'].includes(t1)) && 'rights tier', !path.agree && 'extraction path'].filter(Boolean);
  if (fails.length) return out('NEEDS-HUMAN-REVIEW', 'R7-approve-but-criteria-differ', `Both said APPROVE but the verifiers do not agree on: ${fails.join(', ')}.`);
  const imageOnly = [n1, n2].every((n) => n?.text_state === 'image-only');
  const adapter = path.agreed_adapter;
  let ingest_state;
  if (t1 === 'A2') ingest_state = imageOnly ? 'hold:rights-review+manual-transcription' : 'hold:rights-review';
  else ingest_state = imageOnly ? 'blocked:manual-transcription' : 'ready';
  return out('APPROVED', 'R8-quote-corpus-agreed', `Two verifiers agree on identity, rights tier ${t1} and extraction path (${adapter}).`, { tier: t1, ingest_state, adapter });
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

/** rights hint for an unreviewed entry from what the probe itself fetched. A hint is never a tier. */
export function rightsHint(probe, e) {
  if (!probe) return null;
  const yearsOk = (ys) => ys.length && ys.every((y) => y <= 1930);
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
