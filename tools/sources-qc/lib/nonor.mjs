// The merged record of one other-works entry (Parts IV-XII) from all of its reviews. Pure functions: no I/O, no network.
//
// Everything a reviewer wrote is kept (verification.reviews[]): the merge rules in registry.mjs decide the status from the
// reviewers' structured fields and from what lib/derive.mjs parsed out of their prose; this file turns the decision plus the
// reviews into the fields the Historian's ingestion and the report need (perspective, replacement links, ingest recipe).

import { canonReplacement, FORBIDDEN_TEXT_HOSTS, sameItem, urlForKey } from './derive.mjs';
import { decideNonOrN, DESCRIPTION_RANK, divergencesOf, tierClass, voteOf } from './registry.mjs';

const excerpt = (s, n = 300) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export const RELEVANCE_RANK = ['battle-july-1-3', 'campaign-and-battle', 'aftermath', 'campaign-only', 'tangential'];
const LINK_CLASS = { live: 'live', redirected: 'redirected', dead: 'dead', 'not-fetched': 'not_fetched', 'blocked-to-bots': 'blocked_to_bots', 'robots-disallowed': 'robots_disallowed' };
const PRECISION_RANK = { day: 3, month: 2, year: 1 };
const SOURCE_PREFERENCE = ['ia:', 'pg:', 'lccn:', 'url:', 'gb:'];

/** the value most reviewers gave: unanimous, or a strict majority, else null (contested) */
export function modal(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const top = Math.max(...Object.values(counts));
  const winners = Object.keys(counts).filter((k) => counts[k] === top);
  const unanimous = Object.keys(counts).length === 1;
  const value = unanimous ? winners[0] : winners.length === 1 && top * 2 > values.length ? winners[0] : null;
  return { value, unanimous, votes: counts };
}

const forbiddenKey = (key) => FORBIDDEN_TEXT_HOSTS.some((h) => key.includes(h.replace(/^www\./, ''))) || /^(?:perseus|hathi|ehistory):/.test(key);

/**
 * The text source to ingest from, chosen among what the reviewers named: prefer the source the most reviewers named, then
 * the one that matches the agreed adapter (archive-fulltext -> an Internet Archive item, gutenberg -> a Gutenberg number,
 * loc-ocr -> a newspaper page), then Internet Archive over Gutenberg over page URLs. Never a forbidden host.
 */
export function chooseSources(votes, derived, rs, adapter, listedUrl) {
  const named = new Map(); // key -> {count, tokens:[{token, field, reviewer}]}
  derived.forEach((d, i) => {
    const seenHere = new Set();
    for (const s of d.source.text_ids) {
      if (forbiddenKey(s.id)) continue;
      if (!named.has(s.id)) named.set(s.id, { count: 0, tokens: [] });
      const e = named.get(s.id);
      if (!seenHere.has(s.id)) { e.count++; seenHere.add(s.id); }
      e.tokens.push({ id: s.id, token: s.token, field: s.field, reviewer: votes[i].id });
    }
    if (d.source.listed_id && !forbiddenKey(d.source.listed_id)) {
      if (!named.has(d.source.listed_id)) named.set(d.source.listed_id, { count: 0, tokens: [] });
      if (!seenHere.has(d.source.listed_id)) { named.get(d.source.listed_id).count++; seenHere.add(d.source.listed_id); }
    }
  });
  const want = adapter === 'archive-fulltext' ? 'ia:' : adapter === 'gutenberg' ? 'pg:' : adapter === 'loc-ocr' ? 'lccn:' : null;
  // a source a reviewer gave as the replacement for a dead or moved listed link is the one to use, not the listed link
  const recommended = new Set(derived.flatMap((d) => d.source.text_ids.filter((s) => s.field === 'replacement_url').map((s) => s.id)));
  const rank = (k) => {
    const pref = SOURCE_PREFERENCE.findIndex((p) => k.startsWith(p));
    return [want && k.startsWith(want) ? 0 : 1, -named.get(k).count, recommended.has(k) ? 0 : 1, pref < 0 ? 9 : pref];
  };
  const keys = [...named.keys()].sort((a, b) => { const ra = rank(a), rb = rank(b); for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i]; return a.localeCompare(b); });
  const primaryKey = keys[0] ?? null;
  const allTokens = [...named.values()].flatMap((x) => x.tokens);
  // a replacement_url token (a Wayback capture or a moved page) is preferred over a bare mention when the listed link is dead
  const tokenFor = (key) => {
    const cand = allTokens.filter((t) => t.id === key);
    const rep = cand.find((t) => t.field === 'replacement_url');
    return (rep ?? cand[0])?.token;
  };
  const urlOf = (key) => {
    if (!key) return null;
    if (key.startsWith('ia:') || key.startsWith('pg:')) return urlForKey(key, allTokens);
    const t = tokenFor(key);
    if (t) return /^https?:\/\//i.test(t) ? t : `https://${t}`;
    return key.startsWith('url:') ? `https://${key.slice(4)}` : null;
  };
  let primaryUrl = urlOf(primaryKey);
  let basis = primaryKey ? `named by ${named.get(primaryKey).count} of ${votes.length} reviewers` : null;
  if (!primaryUrl && listedUrl && !FORBIDDEN_TEXT_HOSTS.some((h) => listedUrl.includes(h))) { primaryUrl = listedUrl; basis = 'the listed link (no reviewer named another source)'; }
  const cross = keys.slice(1).map(urlOf).filter(Boolean).filter((u) => !/(ehistory\.osu\.edu|babel\.hathitrust\.org|perseus\.tufts\.edu)/.test(u));
  return { primary_key: primaryKey, primary_url: primaryUrl, primary_basis: basis, cross_check: [...new Set(cross)] };
}

const hostSlugs = (url) => {
  const stamp = /\/web\/(\d{8,14})/.exec(url)?.[1] ?? null;
  const ia = /archive\.org\/(?:details|stream|download)\/([^/?#]+)/.exec(url)?.[1] ?? null;
  const segs = String(url).replace(/^https?:\/\/[^/]+/i, '').split(/[/?#]/).filter((s) => s.length >= 10 && !/^\d+$/.test(s));
  return { stamp, ia, slug: segs.at(-1) ?? null };
};

/** which reviewers' own evidence names the replacement (its capture stamp, its Archive id or its page slug): they fetched it */
export function replacementTable(rs, ids) {
  const groups = new Map();
  rs.forEach((r, i) => {
    const u = String(r.item.replacement_url ?? '').trim();
    if (!u) return;
    const key = canonReplacement(u);
    if (!groups.has(key)) groups.set(key, { url: u, proposed_by: [], verified_by: [], statuses: [] });
    const g = groups.get(key);
    g.proposed_by.push(ids[i]);
    const text = `${r.item.evidence ?? ''}\n${r.item.extraction_notes ?? ''}`;
    const h = hostSlugs(u);
    const named = (h.stamp && text.includes(h.stamp)) || (h.ia && text.includes(h.ia)) || (h.slug && text.includes(h.slug));
    if (named && ['confirmed', 'partial'].includes(r.item.bibliographic_match)) g.verified_by.push(ids[i]);
    g.statuses.push(r.item.bibliographic_match);
  });
  return [...groups.values()].map((g) => ({
    url: g.url,
    kind: /web\.archive\.org\/web\//.test(g.url) ? 'wayback-capture' : /archive\.org\//.test(g.url) ? 'internet-archive-item' : 'live-page',
    proposed_by: g.proposed_by,
    verified_by: g.verified_by,
    strength: g.verified_by.length >= 2 ? `fetched and matched by ${g.verified_by.length} reviewers` : g.verified_by.length === 1 ? 'fetched and matched by one reviewer' : 'proposed only: no reviewer\'s evidence names it',
    status: g.verified_by.length ? 'reviewer-verified' : 'proposed-not-confirmed',
  })).sort((a, b) => b.verified_by.length - a.verified_by.length || b.proposed_by.length - a.proposed_by.length);
}

/**
 * Citations the reviewers propose ("Cite as L. L. Polk to his wife, 28 June 1863, ..."): the 220 characters after the words,
 * copied verbatim and cut at a word boundary. They are shown to the person who writes the ingest recipe; nothing is parsed,
 * because a citation cut at the wrong abbreviation is worse than none.
 */
export function citationProposals(rs) {
  const out = [];
  for (const r of rs) {
    const t = String(r.item.extraction_notes ?? '');
    const m = /\bCite\s+(?:it\s+)?as\s+/i.exec(t);
    if (!m) continue;
    let rest = t.slice(m.index + m[0].length).replace(/\s+/g, ' ').trim().slice(0, 220);
    if (rest.length === 220) rest = rest.replace(/\s+\S*$/, '');
    if (rest.length >= 12) out.push({ reviewer: r.id, verbatim: rest });
  }
  return out;
}

const passagesFrom = (rs) => {
  const hits = [];
  for (const r of rs) {
    const t = String(r.item.extraction_notes ?? '');
    const m = /\babout (\d+)(?:\s*(?:to|-|–)\s*(\d+))?\s+(passages|paragraphs|items|articles|letters|sections|entries|divisions)/i.exec(t);
    if (m) hits.push({ min: Number(m[1]), max: Number(m[2] ?? m[1]), phrase: m[0], reviewer: r.id });
  }
  if (!hits.length) return null;
  return { min: Math.min(...hits.map((h) => h.min)), max: Math.max(...hits.map((h) => h.max)), basis: hits.map((h) => `${h.reviewer}: "${h.phrase}"`).join('; ') };
};

/**
 * @param {object} p
 * @param {object} p.entry        the entry from entries.json
 * @param {object[]} p.rs         its reviews (from loadReviews)
 * @param {object[]} p.derived    deriveReview() of each, same order
 * @param {string|null} p.listedKey
 * @param {object} p.iaVerify     qc/ia-verify.json items (id -> record), may be {}
 * @param {object|null} p.overlay hand-written first-run normalisation for this entry (review-norm.json items[n]) or null
 */
export function mergeReviewed({ entry, rs, derived, listedKey, iaVerify = {}, overlay = null }) {
  const ids = rs.map((r) => r.id);
  const items = rs.map((r) => r.item);
  const votes = rs.map((r, i) => voteOf(r.item, derived[i], r.id, r.pass));
  const dec = decideNonOrN(votes, { listedKey, sameItem, divergences: divergencesOf(items, ids) });
  const listedUrl = entry.links[0].url;

  // sources and the guard against the Archive's own metadata
  const src = chooseSources(votes, derived, rs, dec.adapter ?? dec.agreement.path.agreed_adapter, listedUrl);
  let { status, rule, reason } = dec;
  let iaGuard = null;
  const iaId = src.primary_key?.startsWith('ia:') ? src.primary_key.slice(3) : null;
  if (iaId && status === 'APPROVED') {
    const rec = iaVerify[iaId];
    const yr = Number(rec?.metadata?.year ?? String(rec?.metadata?.date ?? '').slice(0, 4)) || null;
    iaGuard = { item: iaId, status: rec?.status ?? null, year: yr, possible_copyright_status: rec?.metadata?.possible_copyright_status ?? null };
    if (rec && rec.status !== 200) { status = 'NEEDS-HUMAN-REVIEW'; rule = 'R17-ia-item-not-found'; reason = `All reviewers approved, but the Internet Archive item ${iaId} named as the text source did not answer HTTP 200 when this builder asked (${rec.status ?? rec.skipped?.why}).`; }
    else if (yr && yr > 1930) { status = 'NEEDS-HUMAN-REVIEW'; rule = 'R17-ia-metadata-contradicts-tier'; reason = `All reviewers approved, but the Internet Archive's own metadata dates the item ${iaId} ${yr}, after the 1930 line the plan draws for original imprints.`; }
  }

  const tiers = votes.map((v) => v.tier);
  const tier = status === 'APPROVED' || status === 'APPROVED-LINKOUT-ONLY' ? dec.tier : dec.tier_recorded;
  const ratings = items.map((p) => p.description_accuracy);
  const worstRating = ratings.filter((a) => a in DESCRIPTION_RANK && a !== 'unverifiable').sort((a, b) => DESCRIPTION_RANK[b] - DESCRIPTION_RANK[a])[0] ?? 'unverifiable';
  const side = modal(items.map((p) => p.side));
  const kind = modal(items.map((p) => p.kind));
  const rel = modal(items.map((p) => p.gettysburg_relevance));
  const relevance = rel.value ?? [...Object.keys(rel.votes)].sort((a, b) => RELEVANCE_RANK.indexOf(a) - RELEVANCE_RANK.indexOf(b))[0];
  const genre = modal(derived.map((d) => d.genre));
  const retrospective = derived.some((d) => d.retrospective);
  // the date of writing: from the reviewers who agree with the merged retrospective flag (a work one reviewer calls a memoir
  // and another a diary is retrospective, so its date is the composition date, not the date of the events), then the most precise
  const dateCandidates = derived.map((d, i) => ({ d, i })).filter((x) => x.d.retrospective === retrospective);
  const writtenBest = (dateCandidates.length ? dateCandidates : derived.map((d, i) => ({ d, i }))).sort((a, b) => (PRECISION_RANK[b.d.written.precision] ?? 0) - (PRECISION_RANK[a.d.written.precision] ?? 0) || a.i - b.i)[0];
  const linkStatuses = items.map((p) => LINK_CLASS[p.link_status] ?? p.link_status);
  const linkModal = modal(linkStatuses);
  const dead = items.some((p) => p.link_status === 'dead');
  const replacements = replacementTable(rs, ids);

  const usable = (() => {
    const lists = items.map((p) => p.usable_for ?? []);
    const inter = lists.reduce((a, b) => a.filter((x) => b.includes(x)));
    if (status === 'APPROVED') return inter.includes('verbatim-quote-corpus') ? inter : ['verbatim-quote-corpus', ...inter];
    if (status === 'APPROVED-LINKOUT-ONLY') { const x = inter.filter((u) => u !== 'verbatim-quote-corpus'); return x.length ? x : ['link-out-citation']; }
    return [];
  })();

  const issueRe = /title|description|says|omits|wrong|not about|misdescrib|overstat|understat|only|not the/i;
  const descriptionIssues = [
    ...rs.map((r) => (r.item.description_accuracy !== 'accurate' ? `${r.id}:${r.item.description_accuracy}` : null)),
    ...[...new Set(rs.flatMap((r) => (r.item.issues ?? []).filter((x) => issueRe.test(x)).slice(0, 1)))].slice(0, 4),
  ].filter(Boolean);

  const adapter = status === 'APPROVED' ? dec.adapter : null;
  const ingest = status === 'APPROVED' ? {
    state: dec.ingest_state,
    adapter,
    primary_url: overlay?.ingest?.primary_url ?? src.primary_url,
    primary_key: src.primary_key,
    primary_basis: overlay?.ingest?.primary_url ? 'hand-written in the first run (qc/review-norm.json), checked against the reviewers' : src.primary_basis,
    cross_check: [...new Set(overlay?.ingest?.cross_check ?? src.cross_check)].filter((u) => u !== (overlay?.ingest?.primary_url ?? src.primary_url)),
    segmentation: overlay?.ingest?.segmentation ?? rs.map((r) => `[${r.id}] ${String(r.item.extraction_notes ?? '').trim()}`).join('\n'),
    citation: overlay?.ingest?.citation ?? `${entry.title} (as listed); text read from ${src.primary_url ?? 'the source named by the reviewers'}; cite the printed page, checked against the page image`,
    citation_proposals: citationProposals(rs),
    before_shipping: overlay?.ingest?.before_shipping ?? [...new Set(rs.flatMap((r) => r.item.issues ?? []))].slice(0, 8).join(' | '),
    notes_by_reviewer: Object.fromEntries(rs.map((r) => [r.id, r.item.extraction_notes ?? null])),
    text_state_by_reviewer: dec.agreement.path.text_state_by_reviewer,
    ia_guard: iaGuard,
  } : null;

  const flags = [
    ...(overlay?.flags ?? []),
    ...(worstRating === 'inaccurate' ? ['description-inaccurate'] : worstRating === 'partly-inaccurate' ? ['description-partly-inaccurate'] : []),
    ...(dead ? ['listed-link-dead'] : []),
    ...(linkStatuses.some((s) => ['blocked_to_bots', 'robots_disallowed'].includes(s)) ? ['listed-host-blocks-automation'] : []),
    ...(tier === 'A2' ? ['rights-review-before-quoting'] : []),
    ...(dec.agreement.path.text_state_by_reviewer && Object.values(dec.agreement.path.text_state_by_reviewer).includes('image-only') ? ['text-is-image-only'] : []),
    ...(!dec.agreement.tier.agree ? ['reviewers-differ-on-tier'] : []),
    ...(!side.unanimous ? ['reviewers-differ-on-side'] : []),
  ];

  return {
    status, rule, reason, dec, votes,
    record: {
      corrected_title: overlay?.retitle ?? null,
      final_status: status,
      status_rule: rule,
      status_reason: reason,
      tier,
      tier_basis: ids.map((id, i) => `${id}: ${excerpt(items[i].rights_basis, 300)}`).join(' | '),
      tier_by_reviewer: Object.fromEntries(ids.map((id, i) => [id, tiers[i]])),
      tier_most_restrictive: dec.agreement.tier.most_restrictive,
      rights_basis: Object.fromEntries(ids.map((id, i) => [id, items[i].rights_basis])),
      usable_for: usable,
      usable_for_by_reviewer: Object.fromEntries(ids.map((id, i) => [id, items[i].usable_for ?? []])),
      side: side.value ?? 'contested',
      side_votes: side.votes,
      kind: kind.value ?? `mixed:${Object.keys(kind.votes).sort().join('|')}`,
      kind_votes: kind.votes,
      genre: genre.value ?? derived[0].genre,
      written: { ...writtenBest.d.written, basis: `${writtenBest.d.written.basis} (${ids[writtenBest.i]}; the most precise date any reviewer stated)`, by_reviewer: Object.fromEntries(ids.map((id, i) => [id, items[i].written ?? null])) },
      retrospective,
      persp_tags: [...new Set([side.value ?? 'contested-side', relevance, genre.value ?? derived[0].genre, retrospective ? 'retrospective' : 'contemporaneous'])],
      flags,
      gettysburg_relevance: relevance,
      gettysburg_relevance_votes: rel.votes,
      description_accuracy: worstRating,
      description_accuracy_by_reviewer: Object.fromEntries(ids.map((id, i) => [id, ratings[i]])),
      description_issues: descriptionIssues,
      issues_by_reviewer: Object.fromEntries(ids.map((id, i) => [id, items[i].issues ?? []])),
      link_class: linkModal.value ?? `mixed:${Object.keys(linkModal.votes).sort().join('|')}`,
      link_status_by_reviewer: Object.fromEntries(ids.map((id, i) => [id, items[i].link_status])),
      listed_link_dead: dead,
      replacement_urls: dead ? replacements : [],
      text_source_urls: dead ? [] : replacements,
      expected_passages: overlay?.expected_passages ?? passagesFrom(rs),
      ingest,
      verification: {
        verifiers: ids,
        structural: null,
        passes: null,
        agreement: dec.agreement,
        divergences: dec.divergences,
        reviews: rs.map((r, i) => ({
          id: r.id, pass: r.pass, round: r.round, batch: r.batch, ref: r.ref,
          verdict: items[i].verdict, rights_tier: items[i].rights_tier, bibliographic_match: items[i].bibliographic_match,
          link_status: items[i].link_status, description_accuracy: items[i].description_accuracy, kind: items[i].kind, side: items[i].side,
          gettysburg_relevance: items[i].gettysburg_relevance, written: items[i].written ?? null, usable_for: items[i].usable_for ?? [],
          replacement_url: items[i].replacement_url || null,
          derived: { text_sources: derived[i].source.text_ids.map((x) => ({ id: x.id, token: x.token, field: x.field })), listed_source: derived[i].source.listed_id, adapters: derived[i].adapters.map((a) => ({ adapter: a.adapter, phrase: a.phrase })), adapters_from: derived[i].adapters_from, text_state: derived[i].text_state, imprint_years: derived[i].years },
          rationale: { evidence: items[i].evidence, rights_basis: items[i].rights_basis, extraction_notes: items[i].extraction_notes ?? null, issues: items[i].issues ?? [] },
        })),
      },
      evidence: [
        ...rs.map((r, i) => ({ type: `review-pass${r.pass}`, ref: r.ref, summary: `${items[i].verdict}; ${tiers[i]}; ${excerpt(items[i].evidence, 240)}` })),
        ...iaEvidence([src.primary_key, ...[...new Set(derived.flatMap((d) => d.source.text_ids.map((x) => x.id)))].filter((k) => k.startsWith('ia:'))], iaVerify),
      ],
      source_choice: src,
    },
  };
}

function iaEvidence(keys, iaVerify) {
  const out = [];
  for (const k of [...new Set(keys.filter(Boolean))]) {
    if (!k.startsWith('ia:')) continue;
    const id = k.slice(3);
    const rec = iaVerify[id];
    const md = rec?.metadata;
    if (md) out.push({ type: 'archive-org-metadata-api', ref: `data-src/sources-v2/qc/ia-verify.json#items.${id}`, summary: `${id}: "${excerpt(md.title, 70)}", ${md.date ?? md.year ?? 'no date field'}, ${excerpt(md.publisher, 40)}${md.possible_copyright_status ? `, possible-copyright-status ${excerpt(md.possible_copyright_status, 50)}` : ''}; OCR text ${md.has_djvu_txt ? 'yes' : 'no'}, page_numbers.json ${md.has_page_numbers ? 'yes' : 'no'} (this builder's own metadata fetch)` });
  }
  return out;
}

export { tierClass };
