// Machine-checkable guarantees of the vetted registry of Gettysburg_Sources_v2.docx.
//
//   node --test "tests/sources-qc/*.test.mjs"
//
// Pure Node: no network, no browser. It reads data-src/sources-v2/{registry.json, ingest-queue.json, qc/*.json}.
// It fails when:
//   - an entry has no final status or no evidence,
//   - anything is APPROVED without two agreeing verifiers (non-OR) or a passing structural check (OR / page pointer),
//   - an A1 or A2 tier has no rights basis,
//   - the ingest queue holds anything that is not APPROVED, A1 and ready (or uses the forbidden perseus adapter),
//   - registry.json was edited by hand or is stale against its inputs (it is rebuilt in memory and compared),
//   - the link probe touched a host it must not touch.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from '../../tools/sources-qc/build-registry.mjs';
import { adapterIntersection, decideCrosswalk, decideNonOr, decidePointer, divergences, STATUSES, tierClass } from '../../tools/sources-qc/lib/registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SV2 = join(ROOT, 'data-src', 'sources-v2');
const read = (p) => JSON.parse(readFileSync(join(SV2, p), 'utf8'));

const registry = read('registry.json');
const queue = read('ingest-queue.json');
const entriesDoc = read('entries.json');
const pass1 = new Map(read('qc/review-pass1.json').map((r) => [r.n, r]));
const pass2 = new Map(read('qc/review-pass2.json').map((r) => [r.n, r]));
const norm = read('qc/review-norm.json');
const structural = read('qc/structural.json');
const probe = read('qc/link-probe.json');
const E = registry.entries;
const byN = new Map(E.map((e) => [e.n, e]));
const APPROVED = new Set(['APPROVED', 'APPROVED-LINKOUT-ONLY', 'APPROVED-CROSSWALK', 'APPROVED-POINTER']);

test('every one of the 1714 entries is in the registry exactly once, in order', () => {
  assert.equal(E.length, 1714);
  assert.equal(entriesDoc.entries.length, 1714);
  E.forEach((e, i) => {
    assert.equal(e.n, i + 1);
    assert.equal(e.id, `sv2-${String(i + 1).padStart(4, '0')}`);
    assert.equal(e.title, entriesDoc.entries[i].title, `title of entry ${e.n} differs from entries.json`);
  });
  assert.equal(new Set(E.map((e) => e.id)).size, 1714);
  assert.equal(registry.meta.source_sha256, entriesDoc.meta.source_sha256);
});

test('every entry has a final status from the closed vocabulary, a rule, a reason and evidence', () => {
  for (const e of E) {
    assert.ok(STATUSES.includes(e.final_status), `entry ${e.n}: status ${e.final_status}`);
    assert.ok(e.status_rule && /^R\d/.test(e.status_rule), `entry ${e.n}: no rule`);
    assert.ok(typeof e.status_reason === 'string' && e.status_reason.length > 20, `entry ${e.n}: no reason`);
    assert.ok(Array.isArray(e.evidence) && e.evidence.length > 0, `entry ${e.n}: no evidence`);
    for (const ev of e.evidence) {
      assert.ok(ev.type && ev.ref && ev.summary, `entry ${e.n}: evidence item incomplete`);
    }
    assert.ok(Array.isArray(e.links) && e.links.length === entriesDoc.entries[e.n - 1].links.length, `entry ${e.n}: links`);
    for (const l of e.links) assert.ok(l.link_class, `entry ${e.n}: link without a link_class`);
  }
});

test('no APPROVED item without two agreeing verifiers or a passing structural check', () => {
  for (const e of E) {
    if (!APPROVED.has(e.final_status)) continue;
    if (e.final_status === 'APPROVED' || e.final_status === 'APPROVED-LINKOUT-ONLY') {
      assert.equal(e.entry_kind, 'non_or');
      assert.deepEqual(e.verification.verifiers, ['review-pass1', 'review-pass2'], `entry ${e.n}: needs both reviewers`);
      const a = e.verification.agreement;
      assert.ok(a.identity.agree, `entry ${e.n}: identity not agreed`);
      assert.ok(a.tier.agree, `entry ${e.n}: tier not agreed`);
      assert.equal(e.verification.passes[1].verdict, e.verification.passes[2].verdict, `entry ${e.n}: verdicts differ`);
      if (e.final_status === 'APPROVED') {
        assert.ok(a.path.agree, `entry ${e.n}: extraction path not agreed`);
        assert.equal(e.verification.passes[1].verdict, 'APPROVE');
        assert.ok(['A1', 'A2'].includes(e.tier), `entry ${e.n}: tier ${e.tier}`);
        assert.ok(e.usable_for.includes('verbatim-quote-corpus'));
        assert.ok(a.path.agreed_adapter && a.path.agreed_adapter !== 'perseus');
      } else {
        assert.equal(e.verification.passes[1].verdict, 'APPROVE-LINKOUT-ONLY');
        assert.ok(!e.usable_for.includes('verbatim-quote-corpus'), `entry ${e.n}: link-out entry must not be quotable`);
      }
    } else {
      assert.ok(['or_report', 'or_page'].includes(e.entry_kind));
      assert.deepEqual(e.verification.verifiers, ['structural-check']);
      assert.ok(['pass', 'pass_notes'].includes(e.verification.structural.status), `entry ${e.n}: structural ${e.verification.structural.status}`);
      for (const f of e.verification.structural.flags) assert.equal(f, 'hathi_seq_offset_outlier', `entry ${e.n}: hard flag ${f}`);
      assert.ok(!e.usable_for.includes('verbatim-quote-corpus'), 'a crosswalk or pointer never carries quotable text');
    }
  }
});

test('only APPROVED items are usable for the quote corpus; unverified items are usable for nothing', () => {
  for (const e of E) {
    if (e.usable_for.includes('verbatim-quote-corpus')) assert.equal(e.final_status, 'APPROVED', `entry ${e.n}`);
    if (e.final_status === 'NOT-VERIFIED') {
      assert.deepEqual(e.usable_for, [], `entry ${e.n}`);
      assert.deepEqual(e.verification.verifiers, [], `entry ${e.n}`);
      assert.equal(e.tier, null, `entry ${e.n}: an unverified entry has no tier`);
    }
    if (e.final_status === 'NEEDS-HUMAN-REVIEW' && e.entry_kind === 'non_or') assert.deepEqual(e.usable_for, []);
  }
});

test('no A1 or A2 without a rights basis', () => {
  for (const e of E) {
    if (!['A1', 'A2'].includes(e.tier)) continue;
    assert.ok(typeof e.tier_basis === 'string' && e.tier_basis.length >= 40, `entry ${e.n}: tier ${e.tier} has no tier_basis`);
    if (e.entry_kind === 'non_or' && e.verification.verifiers.length === 2) {
      assert.ok(e.rights_basis.pass1.length >= 40 && e.rights_basis.pass2.length >= 40, `entry ${e.n}: reviewed entry lacks a reviewer rights basis`);
    }
  }
  // the OR entries' A1 basis names the volume record the HathiTrust catalog API returned in this run
  const or1 = byN.get(1);
  assert.match(or1.tier_basis, /ser\.1:v\.27:pt\.1/);
});

test('every rule applied to the raw reviewer outputs reproduces the registry (no hand edits)', () => {
  let n = 0;
  for (const e of E.filter((x) => x.verification.verifiers.length === 2)) {
    const d = decideNonOr(pass1.get(e.n), pass2.get(e.n), norm.items[String(e.n)]);
    assert.equal(e.final_status, d.status, `entry ${e.n}`);
    assert.equal(e.status_rule, d.rule, `entry ${e.n}`);
    n++;
  }
  assert.equal(n, pass1.size);
  assert.equal(pass1.size, pass2.size);
  for (const k of pass1.keys()) assert.ok(pass2.has(k), `entry ${k} has a first pass but no second pass`);
});

test('the structural results reproduce every OR and page-pointer status', () => {
  const sres = new Map(structural.results.map((r) => [r.n, r]));
  for (const e of E.filter((x) => x.entry_kind !== 'non_or')) {
    const s = sres.get(e.n);
    assert.ok(s, `entry ${e.n}: no structural result`);
    const d = e.entry_kind === 'or_report' ? decideCrosswalk(s) : decidePointer(s);
    assert.equal(e.final_status, d.status, `entry ${e.n}`);
  }
});

test('the reviewer normalisation is anchored in the reviewers\' own words', () => {
  const vocab = norm.meta.vocab;
  for (const [k, it] of Object.entries(norm.items)) {
    for (const [ps, v] of Object.entries(it.passes)) {
      const rec = (ps === '1' ? pass1 : pass2).get(Number(k));
      assert.ok(rec, `entry ${k}: no pass ${ps}`);
      const text = JSON.stringify(rec);
      for (const a of v.adapters_read) assert.ok(vocab.adapters.includes(a), `entry ${k}: adapter ${a}`);
      assert.ok(vocab.text_state.includes(v.text_state), `entry ${k}: text_state ${v.text_state}`);
      assert.ok(v.basis.length > 0);
      for (const b of v.basis) assert.ok(text.includes(JSON.stringify(b).slice(1, -1)), `entry ${k} pass ${ps}: basis phrase not found in the reviewer output: ${b}`);
    }
    assert.ok(vocab.genre.includes(it.genre), `entry ${k}: genre`);
    assert.ok(vocab.relative_to_battle.includes(it.written.relative_to_battle), `entry ${k}: relative_to_battle`);
  }
});

test('the truth table of the merge rules', () => {
  const mk = (over = {}) => ({ n: 1, verdict: 'APPROVE', rights_tier: 'A1-public-domain-quotable', bibliographic_match: 'confirmed', usable_for: ['verbatim-quote-corpus'], link_status: 'live', kind: 'x', side: 'union', description_accuracy: 'accurate', replacement_url: '', ...over });
  const nm = (a = {}, b = {}) => ({ passes: { 1: { adapters_read: ['archive-fulltext'], text_state: 'ocr-text', source_key: 'k', ...a }, 2: { adapters_read: ['archive-fulltext'], text_state: 'ocr-text', source_key: 'k', ...b } } });
  const st = (p1, p2, n) => decideNonOr(p1, p2, n).status;
  assert.equal(st(mk(), mk(), nm()), 'APPROVED');
  assert.equal(st(mk(), mk({ rights_tier: 'A2-public-domain-needs-review' }), nm()), 'NEEDS-HUMAN-REVIEW', 'tiers differ');
  assert.equal(st(mk(), mk(), nm({}, { source_key: 'other' })), 'NEEDS-HUMAN-REVIEW', 'identity differs');
  assert.equal(st(mk(), mk({ bibliographic_match: 'unverifiable' }), nm()), 'NEEDS-HUMAN-REVIEW', 'one could not identify the work');
  assert.equal(st(mk(), mk(), nm({ adapters_read: ['html'] }, { adapters_read: ['pdf-text'] })), 'NEEDS-HUMAN-REVIEW', 'paths do not intersect');
  assert.equal(st(mk(), mk({ usable_for: ['link-out-citation'] }), nm()), 'NEEDS-HUMAN-REVIEW', 'one reviewer does not allow verbatim use');
  assert.equal(st(mk(), mk({ verdict: 'NEEDS-HUMAN-REVIEW' }), nm()), 'NEEDS-HUMAN-REVIEW');
  assert.equal(st(mk(), mk({ verdict: 'REJECT' }), nm()), 'NEEDS-HUMAN-REVIEW', 'REJECT against APPROVE is a disagreement');
  assert.equal(st(mk({ verdict: 'REJECT' }), mk({ verdict: 'REJECT' }), nm()), 'REJECTED');
  assert.equal(st(mk(), mk({ verdict: 'APPROVE-LINKOUT-ONLY' }), nm()), 'NEEDS-HUMAN-REVIEW', 'one allows quoting, one does not');
  const lo = { verdict: 'APPROVE-LINKOUT-ONLY', usable_for: ['link-out-citation'] };
  assert.equal(st(mk(lo), mk(lo), nm()), 'APPROVED-LINKOUT-ONLY');
  assert.equal(st(mk(lo), mk({ ...lo, rights_tier: 'C-link-out-only' }), nm()), 'NEEDS-HUMAN-REVIEW');
  assert.equal(st(mk({ rights_tier: 'C-link-out-only' }), mk({ rights_tier: 'C-link-out-only' }), nm()), 'NEEDS-HUMAN-REVIEW', 'tier C is never approved for verbatim use');
  assert.equal(decideNonOr(mk(), mk(), nm({ text_state: 'image-only' }, { text_state: 'image-only' })).ingest_state, 'blocked:manual-transcription');
  assert.equal(decideNonOr(mk({ rights_tier: 'A2-public-domain-needs-review' }), mk({ rights_tier: 'A2-public-domain-needs-review' }), nm()).ingest_state, 'hold:rights-review');
  assert.equal(decideNonOr(mk(), mk(), nm()).ingest_state, 'ready');
  assert.deepEqual(adapterIntersection(['html', 'archive-fulltext'], ['archive-fulltext']), ['archive-fulltext']);
  assert.equal(tierClass('A1-public-domain-quotable'), 'A1');
  assert.equal(tierClass('unknown-needs-counsel'), 'unknown');
  assert.equal(divergences(mk(), mk({ verdict: 'REJECT' })).some((d) => d.field === 'verdict'), true);
});

test('the ingest queue holds only APPROVED, A1, ready entries and never the perseus adapter', () => {
  assert.ok(queue.ready.length > 0);
  const seen = new Set();
  for (const q of queue.ready) {
    const e = byN.get(q.n);
    assert.equal(e.final_status, 'APPROVED');
    assert.equal(e.tier, 'A1');
    assert.equal(e.ingest.state, 'ready');
    assert.ok(['html', 'gutenberg', 'archive-fulltext', 'pdf-text'].includes(q.adapter), `entry ${q.n}: adapter ${q.adapter}`);
    assert.ok(q.primary_url && q.segmentation && q.citation, `entry ${q.n}: incomplete queue item`);
    assert.ok(q.perspective.side && q.perspective.genre, `entry ${q.n}: no perspective`);
    assert.ok(!seen.has(q.n));
    seen.add(q.n);
  }
  const ranks = queue.ready.map((q) => q.rank);
  assert.deepEqual(ranks, ranks.map((_, i) => i + 1));
  for (const q of queue.blocked) {
    assert.equal(byN.get(q.n).final_status, 'APPROVED');
    assert.notEqual(byN.get(q.n).ingest.state, 'ready');
  }
  for (const c of queue.candidates_pending_verification) {
    assert.equal(c.ingest_allowed, false);
    assert.equal(byN.get(c.n).final_status, 'NOT-VERIFIED');
  }
  // every APPROVED non-OR entry is in exactly one of ready / blocked
  const approvedN = E.filter((e) => e.final_status === 'APPROVED').map((e) => e.n).sort((a, b) => a - b);
  const queued = [...queue.ready, ...queue.blocked].map((q) => q.n).sort((a, b) => a - b);
  assert.deepEqual(queued, approvedN);
});

test('the Part XIII page entries are pointers, never counted as writings', () => {
  const pages = E.filter((e) => e.entry_kind === 'or_page');
  assert.equal(pages.length, 1057);
  for (const e of pages) {
    assert.equal(e.counts_as_writing_piece, false);
    assert.equal(e.resource_class, 'page-pointer');
  }
  const pageNums = pages.map((e) => e.or_locator.printed_page);
  assert.equal(Math.min(...pageNums), 3);
  assert.equal(Math.max(...pageNums), 1059);
  assert.equal(new Set(pageNums).size, 1057);
  // the side labels are the OCR's, and every hedged "transition" label carries a corrected side
  for (const e of pages.filter((x) => /transition/i.test(x.or_locator.listed_side_label))) assert.ok(['union', 'confederate'].includes(e.or_locator.corrected_side_label), `page ${e.or_locator.printed_page}`);
});

test('dead links are replaced only by verified URLs; automated candidates are labelled as candidates', () => {
  for (const e of E) {
    for (const r of e.replacement_urls ?? []) {
      assert.ok(r.url && r.strength, `entry ${e.n}`);
      if (APPROVED.has(e.final_status)) assert.ok(r.verified_by.length > 0, `entry ${e.n}: approved entry with an unverified replacement`);
      if (e.final_status === 'NOT-VERIFIED') {
        assert.deepEqual(r.verified_by, [], `entry ${e.n}`);
        assert.match(r.status, /^candidate/, `entry ${e.n}`);
      }
    }
  }
});

test('duplicates point at real entries and are not counted', () => {
  const dups = E.filter((e) => e.final_status === 'DUPLICATE');
  assert.deepEqual(dups.map((e) => e.n).sort((a, b) => a - b), [572, 573, 599, 657]);
  for (const e of dups) {
    assert.ok(E.some((x) => x.id === e.duplicate_of), `entry ${e.n}`);
    assert.equal(e.counts_as_writing_piece, false);
  }
});

test('the link probe stayed inside the rules', () => {
  const sent = Object.keys(probe.meta.requests_actually_sent_by_host);
  for (const forbidden of ['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net', 'www.perseus.tufts.edu', 'perseus.tufts.edu']) {
    assert.ok(!sent.includes(forbidden), `the probe sent a request to ${forbidden}`);
  }
  assert.match(probe.meta.user_agent, /Gettysburg-sources-QC/);
  assert.match(probe.meta.user_agent, /mlegere9789@gmail\.com/);
  // every non-OR link that is blocked by policy or by robots.txt was recorded as such, not fetched
  for (const r of Object.values(probe.results)) {
    if (['ehistory.osu.edu', 'babel.hathitrust.org', 'hdl.handle.net'].includes(r.host)) assert.equal(r.link_class, 'blocked_to_bots');
    if (r.host === 'perseus.tufts.edu') assert.equal(r.link_class, 'robots_disallowed');
  }
  // every OR link is recorded as blocked, not as live
  for (const e of E.filter((x) => x.entry_kind !== 'non_or')) for (const l of e.links) assert.equal(l.link_class, 'blocked_to_bots');
});

test('the structural check agrees with the registry about what it found', () => {
  const t = structural.meta.tallies;
  assert.equal(t.or_report.total, 543);
  assert.equal(t.or_page.total, 1057);
  const flagged = structural.results.filter((r) => r.status === 'flag').map((r) => r.n);
  assert.deepEqual(flagged, E.filter((e) => e.entry_kind !== 'non_or' && e.final_status === 'NEEDS-HUMAN-REVIEW').map((e) => e.n));
  // the one report whose header the OCR index lost is confirmed by the contents list and the signature, not skipped
  const r161 = structural.results.find((r) => r.n === 161);
  assert.equal(r161.checks.number_in_ocr_index.ok, false);
  assert.equal(r161.checks.fallback.ok, true);
});

test('registry.json is exactly what the builder produces from its inputs (not hand-edited, not stale)', () => {
  const { registry: fresh, queue: freshQueue } = build({ date: registry.meta.date });
  assert.deepEqual(JSON.parse(JSON.stringify(fresh)), registry);
  assert.deepEqual(JSON.parse(JSON.stringify(freshQueue)), queue);
});

test('the counts in the registry meta add up', () => {
  const c = registry.meta.counts;
  assert.equal(c.total_entries, 1714);
  assert.equal(Object.values(c.by_status).reduce((a, b) => a + b, 0), 1714);
  for (const s of Object.keys(c.by_status)) assert.ok(STATUSES.includes(s));
  const recount = {};
  for (const e of E) recount[e.final_status] = (recount[e.final_status] ?? 0) + 1;
  assert.deepEqual(recount, c.by_status);
  assert.equal(c.by_entry_kind.or_report, 543);
  assert.equal(c.by_entry_kind.or_page, 1057);
  assert.equal(c.by_entry_kind.non_or, 114);
});

test('the review queue covers exactly the unreviewed other works, in batches of at most 12', () => {
  const rq = read('qc/review-queue-next.json');
  const queued = rq.batches.flatMap((b) => b.items.map((i) => i.n)).sort((a, b) => a - b);
  const notVerified = E.filter((e) => e.entry_kind === 'non_or' && e.final_status === 'NOT-VERIFIED').map((e) => e.n).sort((a, b) => a - b);
  assert.deepEqual(queued, notVerified);
  assert.equal(new Set(queued).size, queued.length);
  for (const b of rq.batches) assert.ok(b.items.length >= 1 && b.items.length <= 12);
  for (const e of E.filter((x) => x.final_status === 'NOT-VERIFIED' && x.entry_kind === 'non_or')) assert.ok(e.review_priority && e.review_priority.batch >= 1, `entry ${e.n}`);
});

test('every approved other work carries the perspective fields the Historian needs', () => {
  for (const e of E.filter((x) => x.entry_kind === 'non_or' && ['APPROVED', 'APPROVED-LINKOUT-ONLY'].includes(x.final_status))) {
    assert.ok(['union', 'confederate', 'civilian'].includes(e.side), `entry ${e.n}: side ${e.side}`);
    assert.ok(e.kind && e.genre, `entry ${e.n}: kind or genre`);
    assert.ok(e.written?.text, `entry ${e.n}: written`);
    assert.equal(typeof e.retrospective, 'boolean', `entry ${e.n}: retrospective flag`);
    assert.ok(e.corrected_title, `entry ${e.n}: corrected title`);
    assert.ok(Array.isArray(e.persp_tags) && e.persp_tags.length > 0, `entry ${e.n}: tags`);
    assert.ok(e.replacement_urls.length > 0 || e.links[0].link_class === 'live' || e.links[0].link_class === 'redirected', `entry ${e.n}: no working link and no replacement`);
  }
});
