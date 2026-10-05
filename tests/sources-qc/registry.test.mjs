// Machine-checkable guarantees of the vetted registry of Gettysburg_Sources_v2.docx.
//
//   node --test "tests/sources-qc/*.test.mjs"
//   SOURCES_QC_REGISTRY=path/to/corrupted-registry.json node --test "tests/sources-qc/registry.test.mjs"   # the suite goes red on a bad copy
//
// Pure Node: no network, no browser. It reads data-src/sources-v2/{registry.json, ingest-queue.json, qc/*.json}.
// It fails when:
//   - an entry has no final status, rule, reason or evidence,
//   - anything is APPROVED without EVERY reviewer who examined it agreeing on identity, rights tier (A1 or A2, the same one)
//     and extraction path (other works), or without a passing structural check (OR entries and page pointers),
//   - a rights tier is not the MORE restrictive one the reviewers gave, or an A1 or A2 has no rights basis,
//   - the ingest queue holds anything that is not APPROVED, A1 and ready, or uses the forbidden perseus adapter or host,
//   - an entry numbered beyond the list's 1714 exists (the pages after p. 1059 are notes about the list's incompleteness),
//   - the OR descriptions are not marked untrusted although the audit sample says the template is systemically inaccurate,
//   - registry.json was edited by hand or is stale against its inputs (it is rebuilt in memory and compared),
//   - the registry's copy of any reviewer's fields differs from the reviewer's own file,
//   - a reviewer-attested fact has no verbatim anchor in the reviewer's text,
//   - the link probe touched a host it must not touch.
// The guarantees live in tools/sources-qc/lib/invariants.mjs; the "mutation" tests below corrupt copies of the registry
// and require each corruption to be caught by the invariant that names it.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from '../../tools/sources-qc/build-registry.mjs';
import { checkAnchors } from '../../tools/sources-qc/lib/attested.mjs';
import { adaptersOf, buildVocab, deriveReview, firstDate, imprintYears, keyOfToken, sameItem, urlTokens } from '../../tools/sources-qc/lib/derive.mjs';
import { checkRegistry } from '../../tools/sources-qc/lib/invariants.mjs';
import { decideCrosswalk, decideNonOr, decideNonOrN, decidePointer, descriptionSystemic, divergencesOf, mostRestrictiveTier, STATUSES, tierClass, voteOf, wilson, applyLocatorCorrection } from '../../tools/sources-qc/lib/registry.mjs';
import { loadReviews, makeReader } from '../../tools/sources-qc/lib/reviews.mjs';
import { orAudit, pointerAudit } from '../../tools/sources-qc/lib/audit.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SV2 = join(ROOT, 'data-src', 'sources-v2');
const read = (p) => JSON.parse(readFileSync(join(SV2, p), 'utf8'));
const registryPath = process.env.SOURCES_QC_REGISTRY ? resolve(process.env.SOURCES_QC_REGISTRY) : join(SV2, 'registry.json');
const queuePath = process.env.SOURCES_QC_QUEUE ? resolve(process.env.SOURCES_QC_QUEUE) : join(SV2, 'ingest-queue.json');
const CORRUPTED_RUN = !!process.env.SOURCES_QC_REGISTRY;

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
const entriesDoc = read('entries.json');
const norm = read('qc/review-norm.json');
const structural = read('qc/structural.json');
const probe = read('qc/link-probe.json');
const attested = read('qc/reviewer-attested.json');
const iaVerify = read('qc/ia-verify.json');
const reader = makeReader(ROOT);
const loaded = loadReviews(reader);
const E = registry.entries;
const byN = new Map(E.map((e) => [e.n, e]));
const APPROVED = new Set(['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER']);

const violations = checkRegistry(registry, queue);
const only = (...ids) => violations.filter((v) => ids.includes(v.id));
const show = (vs) => vs.slice(0, 8).map((v) => `${v.id} entry ${v.entry}: ${v.message}`).join('\n');

// ---------------------------------------------------------------------------------------------------- shape
test('every one of the 1714 entries is in the registry exactly once, in order, and none is numbered beyond the list', () => {
  assert.equal(E.length, 1714);
  assert.equal(entriesDoc.entries.length, 1714);
  E.forEach((e, i) => {
    assert.equal(e.n, i + 1);
    assert.equal(e.id, `sv2-${String(i + 1).padStart(4, '0')}`);
    assert.equal(e.title, entriesDoc.entries[i].title, `title of entry ${e.n} differs from entries.json`);
  });
  assert.equal(new Set(E.map((e) => e.id)).size, 1714);
  assert.equal(registry.meta.source_sha256, entriesDoc.meta.source_sha256);
  assert.deepEqual(only('list-shape', 'no-entry-beyond-the-list'), [], show(only('list-shape', 'no-entry-beyond-the-list')));
});

test('every entry has a final status from the closed vocabulary, a rule, a reason and evidence', () => {
  for (const e of E) assert.ok(STATUSES.includes(e.final_status), `entry ${e.n}: status ${e.final_status}`);
  assert.deepEqual(only('status-vocabulary', 'status-rule', 'evidence'), [], show(only('status-vocabulary', 'status-rule', 'evidence')));
  for (const e of E) assert.ok(e.links.length === entriesDoc.entries[e.n - 1].links.length, `entry ${e.n}: links`);
});

// ---------------------------------------------------------------------------------------------------- unanimity
test('no APPROVED other work without every reviewer agreeing; no OR entry or pointer approved without a passing structural check', () => {
  const vs = only('unanimity', 'independent-reviewers', 'structural-pass', 'ingest-state', 'reject-needs-all', 'human-review-reason', 'rationale-kept');
  assert.deepEqual(vs, [], show(vs));
  for (const e of E.filter((x) => x.entry_kind === 'non_or' && ['APPROVED', 'APPROVED-LINKOUT-ONLY'].includes(x.final_status))) {
    assert.ok(e.verification.reviews.length >= 2, `entry ${e.n}`);
    const tiers = e.verification.reviews.map((r) => tierClass(r.rights_tier));
    if (e.final_status === 'APPROVED') assert.equal(new Set(tiers).size, 1, `entry ${e.n}: tiers ${tiers}`);
  }
});

test('only APPROVED items are usable for the quote corpus; unverified items are usable for nothing', () => {
  const vs = only('quote-only-if-approved', 'unverified-is-unusable');
  assert.deepEqual(vs, [], show(vs));
});

test('rights tiers: the recorded tier is the MORE restrictive one the reviewers gave; no A1 or A2 without a basis', () => {
  const vs = only('restrictive-tier', 'rights-basis');
  assert.deepEqual(vs, [], show(vs));
  // entries where the reviewers differed exist, and the recorded tier is the stricter one
  const differing = E.filter((e) => e.entry_kind === 'non_or' && e.verification.reviews && new Set(e.verification.reviews.map((r) => tierClass(r.rights_tier))).size > 1);
  assert.ok(differing.length >= 5, 'the data contain reviewers who differ on the tier');
  for (const e of differing) {
    const tiers = e.verification.reviews.map((r) => tierClass(r.rights_tier));
    assert.equal(e.tier, mostRestrictiveTier(tiers), `entry ${e.n}`);
    assert.notEqual(e.final_status, 'APPROVED', `entry ${e.n}: reviewers differ on the tier but the entry is approved for quoting`);
  }
  const or1 = byN.get(1);
  assert.match(or1.tier_basis, /ser\.1:v\.27:pt\.1/);
});

test('every rule applied to the raw reviewer outputs reproduces the registry (no hand edits)', () => {
  // independent of the builder's own code path: raw reviews -> derive -> votes -> decideNonOrN
  const nonOrReviews = loaded.reviews.filter((r) => r.n >= 544 && r.n <= 657);
  const vocab = buildVocab(nonOrReviews.flatMap((r) => [r.item.replacement_url, r.item.extraction_notes]));
  const by = new Map();
  for (const r of nonOrReviews) { if (!by.has(r.n)) by.set(r.n, []); by.get(r.n).push(r); }
  let n = 0;
  for (const [num, rs] of by) {
    const e = byN.get(num);
    if (e.final_status === 'DUPLICATE') continue;
    const entry = entriesDoc.entries[num - 1];
    const votes = rs.map((r) => voteOf(r.item, deriveReview(r, entry, vocab), r.id, r.pass));
    const d = decideNonOrN(votes, { listedKey: keyOfToken(entry.links[0].url), sameItem });
    if (!/^R17/.test(e.status_rule)) {
      assert.equal(e.final_status, d.status, `entry ${num}`);
      assert.equal(e.status_rule, d.rule, `entry ${num}`);
    }
    n++;
  }
  assert.equal(n, E.filter((e) => e.entry_kind === 'non_or' && e.verification.reviews).length);
  assert.equal(n, 110);
});

test('the registry\'s copy of every reviewer field is the reviewer\'s own (stored verbatim, not retyped)', () => {
  let checked = 0;
  for (const e of E.filter((x) => x.verification?.reviews)) {
    for (const r of e.verification.reviews) {
      const raw = loaded.reviews.find((x) => x.id === r.id);
      assert.ok(raw, `entry ${e.n}: no raw review ${r.id}`);
      for (const [mine, theirs] of [['verdict', 'verdict'], ['rights_tier', 'rights_tier'], ['bibliographic_match', 'bibliographic_match'], ['link_status', 'link_status'], ['description_accuracy', 'description_accuracy'], ['kind', 'kind'], ['side', 'side']]) {
        assert.equal(r[mine], raw.item[theirs], `entry ${e.n} ${r.id} ${mine}`);
      }
      assert.equal(r.rationale.evidence, raw.item.evidence, `entry ${e.n} ${r.id} evidence`);
      assert.equal(r.rationale.rights_basis, raw.item.rights_basis, `entry ${e.n} ${r.id} rights_basis`);
      assert.deepEqual(r.usable_for, raw.item.usable_for ?? [], `entry ${e.n} ${r.id} usable_for`);
      checked++;
    }
  }
  assert.ok(checked >= 260, `checked ${checked} reviews`);
});

test('what the builder derived from the reviewers\' prose is anchored in their own words', () => {
  let tokens = 0;
  for (const e of E.filter((x) => x.verification?.reviews)) {
    for (const r of e.verification.reviews) {
      const raw = loaded.reviews.find((x) => x.id === r.id).item;
      const text = [raw.replacement_url, raw.extraction_notes, raw.extraction_notes_extra, raw.extraction_notes_note].filter(Boolean).join('\n');
      for (const s of r.derived.text_sources) { assert.ok(text.includes(s.token), `entry ${e.n} ${r.id}: source token not in the reviewer's text: ${s.token}`); tokens++; }
      for (const a of r.derived.adapters) {
        if (r.derived.adapters_from === 'extraction_notes') assert.ok(text.toLowerCase().includes(String(a.phrase).toLowerCase()), `entry ${e.n} ${r.id}: adapter phrase not in the notes: ${a.phrase}`);
        assert.ok(['archive-fulltext', 'gutenberg', 'pdf-text', 'html', 'loc-ocr', 'manual-transcription'].includes(a.adapter), `adapter ${a.adapter}`);
      }
    }
  }
  assert.ok(tokens > 100);
});

test('calibration: the derived agreement fields reproduce the 12 hand-normalised decisions of the first run (entries 586-597)', () => {
  const p1 = new Map(read('qc/review-pass1.json').map((r) => [r.n, r]));
  const p2 = new Map(read('qc/review-pass2.json').map((r) => [r.n, r]));
  assert.equal(p1.size, 12);
  let same = 0;
  for (const [num, a] of p1) {
    const hand = decideNonOr(a, p2.get(num), norm.items[String(num)]);
    const e = byN.get(num);
    // 599 is merged into 595; 595 itself is the one reject-vs-approve split
    assert.equal(e.final_status, hand.status, `entry ${num}: derived ${e.final_status}, hand-normalised ${hand.status}`);
    assert.equal(e.status_rule, hand.rule, `entry ${num}`);
    if (hand.status === 'APPROVED') {
      assert.equal(e.tier, hand.tier, `entry ${num}`);
      assert.equal(e.ingest.state, hand.ingest_state, `entry ${num}`);
      assert.equal(e.ingest.adapter, hand.adapter, `entry ${num}: adapter derived ${e.ingest.adapter}, hand ${hand.adapter}`);
    }
    same++;
  }
  assert.equal(same, 12);
});

test('the reviewer-attested facts are anchored by verbatim phrases in the reviewers\' own text', () => {
  const r = checkAnchors(attested, loaded);
  assert.ok(r.checked >= 25);
  assert.deepEqual(r.missing, [], JSON.stringify(r.missing));
  assert.equal(registry.meta.anchors_checked, r.checked);
});

// ---------------------------------------------------------------------------------------------------- merge rules (synthetic)
const mkItem = (over = {}) => ({ n: 1, verdict: 'APPROVE', rights_tier: 'A1-public-domain-quotable', bibliographic_match: 'confirmed', usable_for: ['verbatim-quote-corpus'], link_status: 'live', kind: 'x', side: 'union', description_accuracy: 'accurate', replacement_url: '', evidence: 'x'.repeat(60), ...over });
const mkDer = (over = {}) => ({ source: { text_ids: [{ id: 'ia:work', token: 'archive.org/details/work', field: 'replacement_url' }], listed_id: null }, adapters: [{ adapter: 'archive-fulltext', phrase: 'djvu' }], text_state: 'ocr-text', years: [1896], ...over });
const vote = (id, item = {}, der = {}) => voteOf(mkItem(item), mkDer(der), id, id.endsWith('1') || id === 'a' || id === 'b' ? 1 : 2);
const decide = (...votes) => decideNonOrN(votes, { listedKey: 'url:example.org/x', sameItem });

test('the truth table of the merge rules, for two to four reviewers', () => {
  const A = (id, i, d) => vote(id, i, d);
  // unanimity of three and four
  assert.equal(decide(A('a'), A('b'), A('c')).status, 'APPROVED');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d')).status, 'APPROVED');
  assert.equal(decide(A('a'), A('b'), A('c', { verdict: 'NEEDS-HUMAN-REVIEW' })).status, 'NEEDS-HUMAN-REVIEW', 'one of three asks for a human');
  assert.equal(decide(A('a'), A('b'), A('c', { verdict: 'REJECT' })).status, 'NEEDS-HUMAN-REVIEW', 'one reject of three is a disagreement');
  assert.equal(decide(A('a'), A('b', { verdict: 'REJECT' }), A('c', { verdict: 'REJECT' })).status, 'NEEDS-HUMAN-REVIEW', 'two rejects against an approve are still a disagreement');
  assert.equal(decide(A('a', { verdict: 'REJECT' }), A('b', { verdict: 'REJECT' })).status, 'REJECTED', 'two of two reject');
  assert.equal(decide(A('a', { verdict: 'REJECT' }), A('b', { verdict: 'REJECT' }), A('c', { verdict: 'REJECT' }), A('d', { verdict: 'REJECT' })).status, 'REJECTED');
  assert.equal(decide(A('a', { verdict: 'REJECT', evidence: 'short' }), A('b', { verdict: 'REJECT' })).status, 'NEEDS-HUMAN-REVIEW', 'a reject with no evidence does not count');
  // one reviewer is never enough
  assert.equal(decide(A('a')).status, 'NOT-VERIFIED');
  assert.equal(decide().status, 'NOT-VERIFIED');
  // each of the three criteria, with the fourth reviewer the odd one out
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', { rights_tier: 'A2-public-domain-needs-review' })).status, 'NEEDS-HUMAN-REVIEW', 'tier A2 against A1');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', {}, { source: { text_ids: [{ id: 'ia:other' }], listed_id: null }, years: [1912] })).status, 'NEEDS-HUMAN-REVIEW', 'a different source and a different year');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', {}, { adapters: [{ adapter: 'html' }] })).status, 'NEEDS-HUMAN-REVIEW', 'no adapter all four name');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', { usable_for: ['link-out-citation'] })).status, 'NEEDS-HUMAN-REVIEW', 'one reviewer does not allow verbatim use');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', { bibliographic_match: 'unverifiable' })).status, 'NEEDS-HUMAN-REVIEW', 'one could not identify the work');
  assert.equal(decide(A('a'), A('b'), A('c'), A('d', { verdict: 'APPROVE-LINKOUT-ONLY', usable_for: ['link-out-citation'] })).status, 'NEEDS-HUMAN-REVIEW', 'three allow quoting, one a link');
  // different scans of one edition agree only on the same imprint year
  const diffScan = { source: { text_ids: [{ id: 'ia:otherscan' }], listed_id: null } };
  assert.equal(decide(A('a'), A('b', {}, { ...diffScan, years: [1896] })).status, 'APPROVED', 'two scans, the same year');
  assert.equal(decide(A('a'), A('b', {}, { ...diffScan, years: [1915] })).status, 'NEEDS-HUMAN-REVIEW', 'two scans, different years');
  assert.equal(decide(A('a'), A('b', {}, { ...diffScan, years: [] })).status, 'NEEDS-HUMAN-REVIEW', 'two scans, no year');
  // tier C is never approved for verbatim use
  assert.equal(decide(A('a', { rights_tier: 'C-link-out-only' }), A('b', { rights_tier: 'C-link-out-only' })).status, 'NEEDS-HUMAN-REVIEW');
  // ingest states
  assert.equal(decide(A('a'), A('b')).ingest_state, 'ready');
  const a2 = { rights_tier: 'A2-public-domain-needs-review' };
  assert.equal(decide(A('a', a2), A('b', a2)).ingest_state, 'hold:rights-review');
  const img = { adapters: [{ adapter: 'manual-transcription' }], text_state: 'image-only' };
  assert.equal(decide(A('a', {}, img), A('b', {}, img)).ingest_state, 'blocked:manual-transcription');
  assert.equal(decide(A('a', a2, img), A('b', a2, img)).ingest_state, 'hold:rights-review+manual-transcription');
  assert.equal(decide(A('a', {}, img), A('b', {}, { adapters: [{ adapter: 'manual-transcription' }, { adapter: 'pdf-text' }], text_state: 'machine-text' })).ingest_state, 'blocked:manual-transcription', 'an image-only reviewer blocks the ingest');
  // link-out: unanimous verdict and identity; the recorded tier is the more restrictive one
  const lo = { verdict: 'APPROVE-LINKOUT-ONLY', usable_for: ['link-out-citation'] };
  assert.equal(decide(A('a', lo), A('b', lo)).status, 'APPROVED-LINKOUT-ONLY');
  assert.equal(decide(A('a', lo), A('b', { ...lo, rights_tier: 'C-link-out-only' })).status, 'APPROVED-LINKOUT-ONLY');
  assert.equal(decide(A('a', lo), A('b', { ...lo, rights_tier: 'C-link-out-only' })).tier, 'C', 'the more restrictive tier is recorded');
  assert.equal(decide(A('a', { ...lo, rights_tier: 'B-facts-only' }), A('b', { ...lo, rights_tier: 'C-link-out-only' }), A('c', { ...lo, rights_tier: 'unknown-needs-counsel' })).tier, 'unknown');
  assert.equal(decide(A('a', lo), A('b', lo, { source: { text_ids: [{ id: 'ia:else' }], listed_id: null }, years: [] })).status, 'NEEDS-HUMAN-REVIEW', 'link-out with different sources');
  assert.equal(decide(A('a', lo), A('b', { ...lo, bibliographic_match: 'mismatch' })).status, 'NEEDS-HUMAN-REVIEW');
  assert.equal(decide(A('a', lo), A('b', lo), A('c', { verdict: 'APPROVE' })).status, 'NEEDS-HUMAN-REVIEW', 'two link-out, one quote');
  // helpers
  assert.equal(tierClass('A1-public-domain-quotable'), 'A1');
  assert.equal(tierClass('unknown-needs-counsel'), 'unknown');
  assert.equal(mostRestrictiveTier(['A1', 'A2']), 'A2');
  assert.equal(mostRestrictiveTier(['A1', 'C', 'B']), 'C');
  assert.equal(mostRestrictiveTier(['C', 'unknown']), 'unknown');
  assert.equal(divergencesOf([mkItem(), mkItem({ verdict: 'REJECT' })], ['a', 'b']).some((d) => d.field === 'verdict'), true);
  assert.deepEqual(divergencesOf([mkItem(), mkItem()], ['a', 'b']), []);
  // the two-reviewer legacy form still works
  const nm = (a = {}, b = {}) => ({ passes: { 1: { adapters_read: ['archive-fulltext'], text_state: 'ocr-text', source_key: 'k', ...a }, 2: { adapters_read: ['archive-fulltext'], text_state: 'ocr-text', source_key: 'k', ...b } } });
  assert.equal(decideNonOr(mkItem(), mkItem(), nm()).status, 'APPROVED');
  assert.equal(decideNonOr(mkItem(), mkItem(), nm({}, { source_key: 'other' })).status, 'NEEDS-HUMAN-REVIEW');
});

test('the Official Records rules: crosswalk, pointer, audit locator correction and the description-trust threshold', () => {
  assert.equal(decideCrosswalk({ status: 'pass', notes: [], flags: [] }).status, 'APPROVED-CROSSWALK');
  assert.equal(decideCrosswalk({ status: 'flag', notes: [], flags: ['first_page_differs'] }).status, 'NEEDS-HUMAN-REVIEW');
  assert.equal(decideCrosswalk(null).status, 'NOT-VERIFIED');
  assert.equal(decidePointer({ status: 'pass', notes: [], flags: [] }).status, 'APPROVED-POINTER');
  const ok = decideCrosswalk({ status: 'pass', notes: [], flags: [] });
  assert.equal(applyLocatorCorrection(ok, { kind: 'wrong-first-page', listed_first_page: 842, first_page: 843 }).status, 'NEEDS-HUMAN-REVIEW');
  assert.equal(applyLocatorCorrection(ok, null).status, 'APPROVED-CROSSWALK');
  assert.equal(applyLocatorCorrection(ok, { kind: 'end-page-from-ocr-scan' }).status, 'APPROVED-CROSSWALK', 'a doubt is not a correction');
  assert.equal(descriptionSystemic({ accurate: 37, 'partly-inaccurate': 24, inaccurate: 1 }).systemic, true);
  assert.equal(descriptionSystemic({ accurate: 29, 'partly-inaccurate': 2 }).systemic, false, 'the Part XIII systematic sample');
  assert.equal(descriptionSystemic({ accurate: 60 }).systemic, false);
  assert.equal(descriptionSystemic({}).systemic, false);
  const w = wilson(24, 61);
  assert.ok(w.lo > 0.27 && w.lo < 0.29 && w.hi > 0.51 && w.hi < 0.53);
});

test('the derivation helpers read what they claim to read', () => {
  assert.equal(keyOfToken('https://archive.org/details/southernhistoric7187sout/page/401'), 'ia:southernhistoric7187sout');
  assert.equal(keyOfToken('https://archive.org/download/foo00bar/foo00bar_djvu.txt'), 'ia:foo00bar');
  assert.equal(keyOfToken('https://web.archive.org/web/20231207203932id_/https://archives.dickinson.edu/civil-war-resources/x-y'), 'url:archives.dickinson.edu/civil-war-resources/x-y');
  assert.equal(keyOfToken('https://www.gutenberg.org/files/33121/33121-h/33121-h.htm'), 'pg:33121');
  assert.equal(keyOfToken('https://www.loc.gov/item/sn83030313/1863-07-11/ed-1/?fo=json'), 'lccn:sn83030313/1863-07-11');
  assert.equal(keyOfToken('https://books.google.com/robots.txt'), null, 'a robots.txt is not a text source');
  assert.equal(keyOfToken('https://archive.org/'), null);
  assert.ok(urlTokens('see archive.org/details/abc123def and https://www.gutenberg.org/ebooks/32013.').length >= 2);
  assert.deepEqual(imprintYears('Original imprint, New York 1896; author d. 1897 (1837-1892)'), [1896]);
  assert.deepEqual(imprintYears('a 2008 reprint'), []);
  assert.equal(firstDate('Staunton Va July 10th 1863').iso, '1863-07-10');
  assert.equal(firstDate('1863-06-28').precision, 'day');
  assert.equal(adaptersOf({ extraction_notes: 'Use the IA djvu.txt; never Gutenberg' }).map((a) => a.adapter).join(), 'archive-fulltext', 'a path mentioned only to be refused is skipped');
  assert.ok(adaptersOf({ extraction_notes: 'Perseus is not usable; use archive-fulltext' }).every((a) => a.adapter !== 'perseus'));
  assert.equal(sameItem('url:a.org/x/very-long-page-slug-here', 'url:a.org/y/very-long-page-slug-here'), true);
  assert.equal(sameItem('ia:a', 'ia:b'), false);
});

// ---------------------------------------------------------------------------------------------------- OR entries, pointers, audits, notes-only extras
test('the structural results and the audits reproduce every OR and page-pointer status', () => {
  const sres = new Map(structural.results.map((r) => [r.n, r]));
  const att = attested;
  for (const e of E.filter((x) => x.entry_kind !== 'non_or')) {
    const s = sres.get(e.n);
    assert.ok(s, `entry ${e.n}: no structural result`);
    let d = e.entry_kind === 'or_report' ? decideCrosswalk(s) : decidePointer(s);
    if (e.entry_kind === 'or_report') {
      const corr = (att.or_locator_corrections ?? []).find((x) => x.n === e.n);
      if (d.status === 'APPROVED-CROSSWALK') d = applyLocatorCorrection(d, corr);
    }
    assert.equal(e.final_status, d.status, `entry ${e.n}`);
  }
  assert.deepEqual(only('structural-pass'), [], show(only('structural-pass')));
  // the two entries the audit viewed on the scan are with a human, with the corrected first page recorded
  for (const [n, first] of [[10, 168], [298, 843]]) {
    const e = byN.get(n);
    assert.equal(e.final_status, 'NEEDS-HUMAN-REVIEW');
    assert.equal(e.or_locator.first_page_to_use, first);
  }
});

test('the Official Records descriptions are untrusted, and the audit result is quantified', () => {
  const oa = registry.meta.or_description_audit;
  // recomputed from the raw audit reviews, not read back from the registry
  const fresh = orAudit(loaded.reviews).summary;
  assert.deepEqual(oa, fresh);
  const sys = fresh.systematic_sample.systemic_test;
  assert.equal(sys.sample_n, 61);
  assert.equal(sys.systemic, true);
  assert.ok(sys.wilson95[0] > 0.10);
  assert.deepEqual(only('description-trust'), [], show(only('description-trust')));
  const orRep = E.filter((e) => e.entry_kind === 'or_report');
  assert.equal(orRep.filter((e) => e.description_trust === 'untrusted').length, 543 - fresh.audited_entries);
  for (const e of orRep) assert.ok(e.flags.includes('description-is-a-generic-template'));
  // the audit's own double check: a second auditor was stricter on some entries
  assert.ok(fresh.doubly_audited.second_auditor_stricter >= 1);
});

test('the Part XIII pointers are pointers, never counted as writings; the unlisted pages are notes only', () => {
  const pages = E.filter((e) => e.entry_kind === 'or_page');
  assert.equal(pages.length, 1057);
  for (const e of pages) { assert.equal(e.counts_as_writing_piece, false); assert.equal(e.resource_class, 'page-pointer'); }
  const pageNums = pages.map((e) => e.or_locator.printed_page);
  assert.equal(Math.min(...pageNums), 3);
  assert.equal(Math.max(...pageNums), 1059);
  assert.equal(new Set(pageNums).size, 1057);
  for (const e of pages.filter((x) => /transition/i.test(x.or_locator.listed_side_label))) assert.ok(['union', 'confederate'].includes(e.or_locator.corrected_side_label), `page ${e.or_locator.printed_page}`);
  // the audit items numbered beyond 1714 are recorded as notes about the list's incompleteness, never as entries
  const fresh = pointerAudit(loaded.reviews);
  assert.equal(fresh.unlisted.length, 33);
  const li = registry.meta.list_incompleteness;
  assert.equal(li.part_xiii_unlisted_pages.length, 33);
  assert.deepEqual(li.part_xiii_unlisted_pages.map((p) => p.printed_page), Array.from({ length: 33 }, (_, i) => 1060 + i));
  for (const u of li.part_xiii_unlisted_pages) { assert.equal(u.not_a_list_entry, true); assert.ok(u.n_in_review > 1714); }
  assert.ok(!E.some((e) => e.n > 1714));
  assert.equal(byN.get(1715), undefined);
  assert.deepEqual(only('no-entry-beyond-the-list', 'unlisted-pages-are-notes', 'pointers-not-writings'), []);
  // the audit of the template: not systemically wrong in the systematic sample
  assert.equal(registry.meta.part_xiii_audit.systematic_sample.pages, 31);
  assert.ok(registry.meta.part_xiii_audit.structural_dispatches_on_unlisted_pages.dispatches >= 60);
  // every hedged "section transition" label is corrected by the structural check
  assert.equal(registry.meta.counts.by_entry_kind.or_page, 1057);
});

// ---------------------------------------------------------------------------------------------------- queue, dead links, duplicates
test('the ingest queue holds only APPROVED, A1, ready entries, never the perseus adapter or a forbidden host', () => {
  assert.ok(queue.ready.length > 0);
  const vs = only('queue-ready', 'queue-blocked', 'allowed-adapter', 'no-forbidden-source', 'no-perseus-adapter', 'queue-complete', 'queue-ranks', 'queue-pending', 'queue-linkout', 'queue-rejected');
  assert.deepEqual(vs, [], show(vs));
  assert.ok(!queue.meta.adapters.includes('perseus'));
  assert.ok(!JSON.stringify(queue.ready.map((q) => [q.adapter, q.primary_url, q.cross_check_urls])).includes('perseus.tufts.edu'));
  // every SHSP (Part IV) item in the queue is taken from an Internet Archive scan
  for (const q of [...queue.ready, ...queue.blocked]) {
    const e = byN.get(q.n);
    if (e.part === 'IV') { assert.equal(q.adapter, 'archive-fulltext'); assert.match(q.primary_url, /^https:\/\/archive\.org\/details\//); }
  }
  // the queue is ordered: contemporaneous text the OR corpus lacks comes before the printings of OR text
  const full = queue.ready.filter((q) => q.or_text_overlap?.scope === 'full').map((q) => q.rank);
  const rest = queue.ready.filter((q) => q.or_text_overlap?.scope !== 'full').map((q) => q.rank);
  assert.ok(Math.min(...full) > Math.max(...rest), 'entries that only reprint OR text come last');
  // entries the reviewers say are one text ride along with the lead entry
  const haskell = queue.ready.find((q) => q.entries.includes(553));
  assert.deepEqual(haskell.entries, [553, 554]);
  const ny = queue.ready.find((q) => q.entries.includes(653));
  assert.deepEqual(ny.entries, [653, 654]);
  assert.ok(queue.ready.some((q) => q.n === 655), '655 is Vol. III, a different volume, not a copy');
});

test('dead links are replaced only by URLs a reviewer fetched and named in their own evidence', () => {
  const vs = only('replacement-verified');
  assert.deepEqual(vs, [], show(vs));
  const dead = E.filter((e) => e.listed_link_dead);
  assert.ok(dead.length >= 15);
  // every Dickinson Archives entry with a dead listed link has a verified replacement
  for (const e of dead.filter((x) => x.links[0].host === 'archives.dickinson.edu')) assert.ok(e.replacement_urls.some((r) => r.verified_by.length > 0), `entry ${e.n}`);
  // no automated Wayback candidate is promoted: the probe's candidates are not replacement_urls of any entry
  for (const e of E) for (const r of e.replacement_urls ?? []) assert.ok(r.proposed_by.length > 0 && !('proposed_by' in r && r.proposed_by.some((x) => /^auto:/.test(x))), `entry ${e.n}`);
});

test('duplicates are merged only on a hard identity, and point at real entries', () => {
  const dups = E.filter((e) => e.final_status === 'DUPLICATE');
  assert.deepEqual(dups.map((e) => e.n).sort((a, b) => a - b), [572, 573, 599, 657]);
  assert.deepEqual(only('duplicates'), []);
  assert.equal(byN.get(599).duplicate_of, 'sv2-0595');
  assert.equal(byN.get(654).final_status, 'APPROVED', 'a soft duplicate stays an entry (it is ingested once through the queue)');
});

test('the Internet Archive items behind the approved works exist and are not dated after 1930', () => {
  for (const e of E.filter((x) => x.final_status === 'APPROVED' && x.ingest?.primary_key?.startsWith('ia:'))) {
    const id = e.ingest.primary_key.slice(3);
    const rec = iaVerify.items[id];
    assert.ok(rec, `entry ${e.n}: ${id} was never checked`);
    assert.equal(rec.status, 200, `entry ${e.n}: ${id}`);
    const yr = Number(rec.metadata?.year ?? String(rec.metadata?.date ?? '').slice(0, 4)) || null;
    if (yr) assert.ok(yr <= 1930, `entry ${e.n}: ${id} is dated ${yr}`);
    assert.ok(rec.metadata.has_djvu_txt, `entry ${e.n}: ${id} has no OCR text file`);
  }
  assert.equal(iaVerify.items_checked, Object.keys(iaVerify.items).length);
});

test('the link probe stayed inside the rules', () => {
  const sent = Object.keys(probe.meta.requests_actually_sent_by_host);
  for (const forbidden of ['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net', 'www.perseus.tufts.edu', 'perseus.tufts.edu']) assert.ok(!sent.includes(forbidden), `the probe sent a request to ${forbidden}`);
  assert.match(probe.meta.user_agent, /Gettysburg-sources-QC/);
  assert.match(probe.meta.user_agent, /mlegere9789@gmail\.com/);
  for (const r of Object.values(probe.results)) {
    if (['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net'].includes(r.host)) assert.equal(r.link_class, 'blocked_to_bots');
    if (r.host === 'perseus.tufts.edu') assert.equal(r.link_class, 'robots_disallowed');
  }
  for (const e of E.filter((x) => x.entry_kind !== 'non_or')) for (const l of e.links) assert.equal(l.link_class, 'blocked_to_bots');
  // the IA verification asked only archive.org, politely
  assert.match(iaVerify.user_agent, /Gettysburg-sources-QC/);
  for (const v of Object.values(iaVerify.items)) assert.match(v.url, /^https:\/\/archive\.org\/metadata\//);
  // no reviewer-named text source is a forbidden host in any approved entry's queue record
  for (const e of E.filter((x) => x.final_status === 'APPROVED')) assert.ok(!/perseus\.tufts\.edu|ehistory\.osu\.edu|babel\.hathitrust\.org/.test(`${e.ingest.primary_url} ${(e.ingest.cross_check ?? []).join(' ')}`), `entry ${e.n}`);
});

test('the structural check agrees with the registry about what it found', () => {
  const t = structural.meta.tallies;
  assert.equal(t.or_report.total, 543);
  assert.equal(t.or_page.total, 1057);
  const flagged = structural.results.filter((r) => r.status === 'flag').map((r) => r.n);
  for (const n of flagged) assert.equal(byN.get(n).final_status, 'NEEDS-HUMAN-REVIEW', `flagged entry ${n}`);
  const r161 = structural.results.find((r) => r.n === 161);
  assert.equal(r161.checks.number_in_ocr_index.ok, false);
  assert.equal(r161.checks.fallback.ok, true);
  const refresh = read('qc/structural-refresh.json');
  assert.deepEqual(refresh.tallies_new, structural.meta.tallies, 'structural-refresh.json describes the structural.json on disk');
  assert.ok(refresh.inputs_changed.includes('reports'), 'the refresh was made against a changed historian corpus');
});

test('the counts in the registry meta add up, and the list\'s shape is what the document says', () => {
  const c = registry.meta.counts;
  assert.equal(c.total_entries, 1714);
  assert.equal(Object.values(c.by_status).reduce((a, b) => a + b, 0), 1714);
  for (const s of Object.keys(c.by_status)) assert.ok(STATUSES.includes(s));
  assert.equal(c.by_entry_kind.or_report, 543);
  assert.equal(c.by_entry_kind.or_page, 1057);
  assert.equal(c.by_entry_kind.non_or, 114);
  assert.deepEqual(only('counts'), []);
  assert.equal(c.non_or_never_reviewed, 0, 'every other work has reviewers on disk');
  assert.equal(c.non_or_reviewed + c.by_status.DUPLICATE, 114);
  assert.equal(Object.entries(c.non_or_reviewers_per_entry).reduce((a, [k, v]) => a + Number(k) * v, 0), loaded.reviews.filter((r) => r.n >= 544 && r.n <= 657).length - 0, 'every review of an other work is counted');
});

test('the review queue lists exactly the entries a person must look at', () => {
  const rq = read('qc/review-queue-next.json');
  const listed = rq.items.map((i) => i.n).sort((a, b) => a - b);
  const nhr = E.filter((e) => e.final_status === 'NEEDS-HUMAN-REVIEW').map((e) => e.n).sort((a, b) => a - b);
  assert.deepEqual(listed, nhr);
  assert.deepEqual(rq.meta.unreviewed_other_works, []);
});

// ---------------------------------------------------------------------------------------------------- freshness
test('registry.json is exactly what the builder produces from its inputs (not hand-edited, not stale)', { skip: CORRUPTED_RUN ? 'running against a supplied (corrupted) registry' : false }, () => {
  const { registry: fresh, queue: freshQueue, stats, reviewQueue } = build({ date: registry.meta.date });
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)), registry);
  assert.deepEqual(JSON.parse(JSON.stringify(freshQueue)), queue);
  assert.deepEqual(JSON.parse(JSON.stringify(stats)), read('qc/registry-stats.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(reviewQueue)), read('qc/review-queue-next.json'));
  const inputsExist = Object.keys(registry.meta.inputs).every((f) => existsSync(join(ROOT, f)));
  assert.ok(inputsExist);
});

// ---------------------------------------------------------------------------------------------------- the guarantees are themselves tested
test('the real registry violates no invariant', () => {
  assert.deepEqual(violations, [], show(violations));
});

// each corruption below must be caught by the invariant that names it: the suite goes red on a corrupted registry
const clone = (x) => JSON.parse(JSON.stringify(x));
const caught = (mutate, id, label) => {
  const r = clone(registry);
  const q = clone(queue);
  mutate(r, q);
  const v = checkRegistry(r, q);
  assert.ok(v.some((x) => x.id === id), `${label}: expected invariant "${id}" to fire, got ${[...new Set(v.map((x) => x.id))].join(', ') || 'nothing'}`);
};
const approvedOther = E.filter((e) => e.final_status === 'APPROVED').sort((a, b) => a.n - b.n);
const firstApproved = approvedOther.find((e) => e.verification.reviews.length === 2 && e.tier === 'A1');
const entryOf = (r, n) => r.entries.find((e) => e.n === n);

test('mutation: a reviewer\'s rights tier edited after approval is caught (unanimity, restrictive tier)', () => {
  caught((r) => { entryOf(r, firstApproved.n).verification.reviews[1].rights_tier = 'A2-public-domain-needs-review'; }, 'unanimity', 'one reviewer says A2');
  caught((r) => { entryOf(r, firstApproved.n).verification.reviews[1].rights_tier = 'A2-public-domain-needs-review'; }, 'restrictive-tier', 'one reviewer says A2');
});
test('mutation: an approved entry whose reviewer asked for a human is caught', () => {
  caught((r) => { entryOf(r, firstApproved.n).verification.reviews[0].verdict = 'NEEDS-HUMAN-REVIEW'; }, 'unanimity', 'verdict');
});
test('mutation: a reviewer removed from an approved entry (one reviewer is not enough) is caught', () => {
  caught((r) => { const e = entryOf(r, firstApproved.n); e.verification.reviews.pop(); e.verification.verifiers.pop(); }, 'independent-reviewers', 'single reviewer');
});
test('mutation: a recorded tier less restrictive than the reviewers gave is caught', () => {
  const differing = E.find((e) => e.entry_kind === 'non_or' && e.verification.reviews && new Set(e.verification.reviews.map((r) => tierClass(r.rights_tier))).size > 1 && e.tier !== 'A1');
  caught((r) => { entryOf(r, differing.n).tier = 'A1'; }, 'restrictive-tier', `entry ${differing.n} tier lowered to A1`);
});
test('mutation: identity or extraction path not agreed is caught', () => {
  caught((r) => { entryOf(r, firstApproved.n).verification.agreement.identity.agree = false; }, 'unanimity', 'identity');
  caught((r) => { entryOf(r, firstApproved.n).verification.agreement.path.agree = false; }, 'unanimity', 'path');
});
test('mutation: an entry sent to a human is promoted to APPROVED without agreement (caught)', () => {
  const n = E.find((e) => e.final_status === 'NEEDS-HUMAN-REVIEW' && e.entry_kind === 'non_or').n;
  caught((r) => { const e = entryOf(r, n); e.final_status = 'APPROVED'; e.usable_for = ['verbatim-quote-corpus']; }, 'unanimity', 'promoted');
});
test('mutation: something unapproved marked usable for the quote corpus is caught', () => {
  const lo = E.find((e) => e.final_status === 'APPROVED-LINKOUT-ONLY');
  caught((r) => { entryOf(r, lo.n).usable_for = ['verbatim-quote-corpus']; }, 'quote-only-if-approved', 'link-out quotable');
});
test('mutation: a rejected entry that not every reviewer rejected is caught', () => {
  const rej = E.find((e) => e.final_status === 'REJECTED');
  caught((r) => { entryOf(r, rej.n).verification.reviews[0].verdict = 'APPROVE'; }, 'reject-needs-all', 'reject');
});
test('mutation: the perseus adapter or a forbidden source in the queue is caught', () => {
  caught((r, q) => { q.ready[0].adapter = 'perseus'; }, 'allowed-adapter', 'perseus adapter');
  caught((r, q) => { q.meta.adapters.push('perseus'); }, 'no-perseus-adapter', 'perseus in the adapter list');
  caught((r, q) => { q.ready[0].primary_url = 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus:text:2001.05.0120'; }, 'no-forbidden-source', 'perseus url');
  caught((r, q) => { q.ready[1].primary_url = 'https://babel.hathitrust.org/cgi/pt?id=coo.31924077700262'; }, 'no-forbidden-source', 'hathitrust url');
});
test('mutation: an A2 or image-only item in the ready lane, or a missing approved item, is caught', () => {
  const held = E.find((e) => e.final_status === 'APPROVED' && e.tier === 'A2');
  caught((r, q) => { q.ready.push({ ...q.ready[0], n: held.n, entries: [held.n], rank: q.ready.length + q.blocked.length + 1 }); }, 'queue-ready', 'A2 item in ready');
  caught((r, q) => { q.ready.pop(); }, 'queue-complete', 'approved entry dropped from the queue');
});
test('mutation: an entry numbered beyond the list, or an unlisted page promoted to an entry, is caught', () => {
  caught((r) => { const e = clone(r.entries.at(-1)); e.n = 1715; e.id = 'sv2-1715'; r.entries.push(e); }, 'no-entry-beyond-the-list', 'entry 1715');
  caught((r) => { r.meta.list_incompleteness.part_xiii_unlisted_pages[0].not_a_list_entry = false; }, 'unlisted-pages-are-notes', 'unlisted page as an entry');
});
test('mutation: OR descriptions not marked untrusted, or a crosswalk approved after an audit found the page wrong, is caught', () => {
  const unaudited = E.find((e) => e.entry_kind === 'or_report' && !e.audit);
  caught((r) => { entryOf(r, unaudited.n).description_trust = 'unaudited'; }, 'description-trust', 'description trusted');
  caught((r) => { const e = entryOf(r, 298); e.final_status = 'APPROVED-CROSSWALK'; e.audit.locator_correction = e.audit.locator_correction ?? { first_page: 843 }; }, 'structural-pass', 'locator correction ignored');
  caught((r) => { entryOf(r, unaudited.n).verification.structural.status = 'flag'; }, 'structural-pass', 'structural flag ignored');
});
test('mutation: an unverified dead-link replacement, an A1 with no rights basis, a bad duplicate and a page pointer counted as a writing are caught', () => {
  const dead = E.find((e) => e.final_status === 'APPROVED' && e.listed_link_dead);
  caught((r) => { const rep = entryOf(r, dead.n).replacement_urls[0]; rep.verified_by = ['r9/p9/invented#1']; }, 'replacement-verified', 'invented verifier');
  caught((r) => { entryOf(r, dead.n).replacement_urls = []; }, 'replacement-verified', 'approved with a dead link and no replacement');
  caught((r) => { entryOf(r, firstApproved.n).tier_basis = ''; }, 'rights-basis', 'no basis');
  caught((r) => { entryOf(r, 599).duplicate_of = 'sv2-9999'; }, 'duplicates', 'duplicate of nothing');
  caught((r) => { const p = r.entries.find((e) => e.entry_kind === 'or_page'); p.counts_as_writing_piece = true; }, 'pointers-not-writings', 'pointer as writing');
  caught((r) => { entryOf(r, 7).final_status = 'MAYBE'; }, 'status-vocabulary', 'status outside the vocabulary');
});
