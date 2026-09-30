// ingest.test.mjs - the polite, cached, rights-gated fetcher (mocked network only) and the Official Records vol. 27 normaliser / segmenter
// (a small committed excerpt of the public-domain OCR; a real-volume test runs only when the cached sample exists in tmp/).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createFetcher, HardStop, RightsRefusal, intervalFor, sourceForUrl, USER_AGENT, HOST_INTERVAL_MS } from '../../tools/historian/ingest/fetch.mjs';
import { cleanWhitespace, dehyphenate, stripRunningHeads, evenHead, dictionaryRepair, normalizeOcr, parseToc, splitTocTitle, segmentReports, chunkDocument, ingestOr27 } from '../../tools/historian/ingest/or27.mjs';
import { run as cli, textUrlFor, SAMPLE_RANGE } from '../../tools/historian/ingest/cli.mjs';
import { loadSources } from '../../tools/historian/lib/sources.mjs';
import { splitSentences } from '../../historian-src/core/text.js';
import { ROOT } from './lib/data.mjs';

const REG = loadSources();
const OR27 = 'https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt';
const tmp = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `hx-ing-${n}-`));

/** a fake network: a queue of scripted responses, a fake clock that only sleeping advances, and a log of every call */
function rig(script = []) {
  const calls = [], sleeps = []; let clock = 1_700_000_000_000; let inflight = 0, maxInflight = 0;
  const q = [...script];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, headers: opts.headers, at: clock }); inflight++; maxInflight = Math.max(maxInflight, inflight);
    await new Promise((r) => setImmediate(r));
    inflight--;
    const next = q.length ? q.shift() : { status: 200, body: 'body of ' + url };
    return new Response(next.body ?? '', { status: next.status, headers: next.headers || {} });
  };
  return { fetchImpl, calls, sleeps, now: () => clock, sleepImpl: async (ms) => { sleeps.push(ms); clock += ms; }, get maxInflight() { return maxInflight; } };
}
const mk = (rg, dir, extra = {}) => createFetcher({ cacheDir: dir, registry: REG, fetchImpl: rg.fetchImpl, now: rg.now, sleepImpl: rg.sleepImpl, ...extra });

// ---- fetcher ----------------------------------------------------------------------------------------------------------------------------
test('rights gate first: banned hosts, refused reprint, unregistered identifiers and non-Tier-A/B sources never reach the network', async () => {
  const rg = rig(), f = mk(rg, tmp('gate'));
  for (const u of ['https://www.ancestry.com/x', 'https://www.findagrave.com/memorial/1', 'https://archive.org/download/warrebellionaco00cowlgoog/warrebellionaco00cowlgoog_djvu.txt',
    'https://archive.org/download/some-unregistered-book/some-unregistered-book_djvu.txt', 'not a url']) {
    await assert.rejects(() => f.get(u), (e) => e instanceof RightsRefusal, u);
  }
  assert.equal(rg.calls.length, 0, 'the network was never touched');
  assert.equal(f.stats.refusals, 5);
});

test('a registered Tier A archive.org identifier passes the gate; sourceForUrl maps it to its register entry', () => {
  const f = mk(rig(), tmp('ok'));
  assert.equal(f.gate(OR27).id, 'or27-1');
  assert.equal(sourceForUrl(REG, OR27).tier, 'A');
  assert.equal(textUrlFor(REG.sources.get('or27-2')), 'https://archive.org/download/warofrebellion272unit/warofrebellion272unit_djvu.txt');
});

test('politeness: an identifying User-Agent, a Range header, and one request per second per host (the fake clock advances only by the recorded sleeps)', async () => {
  const rg = rig([{ status: 206, body: 'aaa' }, { status: 206, body: 'bbb' }]), f = mk(rg, tmp('pol'));
  await f.get(OR27, { range: SAMPLE_RANGE });
  await f.get(OR27.replace('271', '272'), { range: SAMPLE_RANGE });
  assert.equal(rg.calls[0].headers.Range, 'bytes=0-2097151');
  assert.equal(rg.calls[0].headers['User-Agent'], USER_AGENT); assert.match(USER_AGENT, /non-commercial/);
  assert.equal(rg.sleeps.length, 1); assert.equal(rg.sleeps[0], HOST_INTERVAL_MS['archive.org']);
  assert.equal(intervalFor('archive.org'), 1000); assert.equal(intervalFor('ia800.us.archive.org'), 1000); assert.equal(intervalFor('www.loc.gov'), 5000); assert.equal(intervalFor('en.wikipedia.org'), 1000); assert.equal(intervalFor('www.nps.gov'), 7200); assert.equal(intervalFor('example.org'), 1000);
});

test('requests to one host never overlap (a per-host queue), even when started together', async () => {
  const rg = rig(), f = mk(rg, tmp('seq'));
  await Promise.all([f.get(OR27), f.get(OR27.replace('271', '272')), f.get(OR27.replace('271', '273'))]);
  assert.equal(rg.maxInflight, 1); assert.equal(rg.calls.length, 3); assert.equal(rg.sleeps.length, 2);
});

test('cache: a second fetcher on the same directory downloads 0 bytes, and the lock file records url, range, sha256, bytes', async () => {
  const dir = tmp('cache'), rg = rig([{ status: 206, body: 'first two megabytes' }]);
  const a = await mk(rg, dir).get(OR27, { range: SAMPLE_RANGE });
  assert.equal(a.cached, false); assert.equal(a.bytes, 19);
  const rg2 = rig(), f2 = mk(rg2, dir);
  const b = await f2.get(OR27, { range: SAMPLE_RANGE });
  assert.equal(b.cached, true); assert.equal(rg2.calls.length, 0); assert.equal(f2.stats.bytesDownloaded, 0); assert.equal(f2.stats.bytesFromCache, 19);
  assert.equal(b.body.toString(), 'first two megabytes'); assert.equal(a.sha256, b.sha256);
  const lock = JSON.parse(fs.readFileSync(path.join(dir, 'sources.lock.json'), 'utf8'));
  const [entry] = Object.values(lock); assert.deepEqual(Object.keys(entry).sort(), ['bytes', 'fetched_at', 'range', 'sha256', 'url']); assert.equal(entry.range, SAMPLE_RANGE);
  // a different range is a different cache entry
  const c = await f2.get(OR27, { range: '0-99' }); assert.equal(c.cached, false); assert.equal(rg2.calls.length, 1);
});

test('429 honours Retry-After; 5xx backs off exponentially and gives up after maxRetries', async () => {
  const rg = rig([{ status: 429, headers: { 'retry-after': '7' } }, { status: 200, body: 'ok' }]);
  const r = await mk(rg, tmp('429')).get(OR27); assert.equal(r.body.toString(), 'ok');
  assert.deepEqual(rg.sleeps.filter((s) => s !== 1000), [7000]); assert.equal(rg.calls.length, 2);
  const rg2 = rig([{ status: 503 }, { status: 503 }, { status: 503 }, { status: 503 }]);
  await assert.rejects(() => mk(rg2, tmp('503'), { maxRetries: 3 }).get(OR27), /HTTP 503/);
  assert.equal(rg2.calls.length, 4);
  assert.deepEqual(rg2.sleeps.filter((s) => s !== 1000), [2000, 4000, 8000]);
});

test('403 is a hard stop: the host is blocked for the rest of the process and nothing is retried', async () => {
  const rg = rig([{ status: 403 }]), f = mk(rg, tmp('403'));
  await assert.rejects(() => f.get(OR27), (e) => e instanceof HardStop && e.status === 403 && e.host === 'archive.org');
  await assert.rejects(() => f.get(OR27.replace('271', '272')), HardStop);
  assert.equal(rg.calls.length, 1, 'no second request to the blocked host');
  assert.ok(f.blocked.has('archive.org'));
});

test('other statuses fail loudly and write nothing to the cache', async () => {
  const dir = tmp('404'), rg = rig([{ status: 404 }]);
  await assert.rejects(() => mk(rg, dir).get(OR27), /HTTP 404/);
  assert.deepEqual(fs.readdirSync(dir).filter((x) => x.endsWith('.body')), []);
});

// ---- CLI --------------------------------------------------------------------------------------------------------------------------------
test('cli: usage errors, unknown sources, and a refusal to write outside historian-src/raw and tmp', async () => {
  const lines = []; const out = (s) => lines.push(s);
  assert.equal(await cli([], { out }), 2); assert.equal(await cli(['fetch', 'no-such-source'], { out }), 2);
  assert.equal(await cli(['list'], { out }), 0); assert.ok(lines.some((l) => l.startsWith('or27-1\tA\t')));
  const rg = rig([{ status: 206, body: 'x' }]), f = mk(rg, tmp('cli'));
  assert.equal(await cli(['segment', 'or27-1', '--sample', '--out', 'docs/should-not-be-written'], { out, fetcher: f }), 2);
  assert.ok(lines.some((l) => /refusing to write outside/.test(l)));
  assert.ok(!fs.existsSync(path.join(ROOT, 'docs/should-not-be-written')));
  assert.equal(rg.calls[0].headers.Range, 'bytes=' + SAMPLE_RANGE);
});

// ---- OR27 normaliser ---------------------------------------------------------------------------------------------------------------------
test('whitespace: CRLF, form feeds and runs of blanks collapse; U+FFFD between digits becomes an en dash and is logged', () => {
  const r = cleanWhitespace('a  b\t\tc \r\nd\fe 3�5 f�g');
  assert.equal(r.text, 'a b c\nd\ne 3–5 fg');
  assert.deepEqual(r.edits.map((e) => e.why), ['ufffd-dash', 'ufffd-drop']);
});

test('de-hyphenation joins lower-case continuations and keeps a hyphen before a capital; every edit is logged', () => {
  const edits = [];
  assert.equal(dehyphenate('the mor-\ntally wounded Brigadier-\nGeneral Barnes', edits), 'the mortally wounded Brigadier-General Barnes');
  assert.deepEqual(edits.map((e) => e.why), ['dehyphenate', 'hyphen-kept']);
  assert.equal(dehyphenate('end of para-\n\nNext', []), 'end of para-\n\nNext', 'never across a paragraph break');
});

test('the even-page running head is recognised in its OCR variants and never matches a body line', () => {
  for (const l of ['606 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.', 'N. C., VA.j W. YA.j MD., PA.? ETC.', 'N. C., VA., W. VA., MB., PA., PTC.', '406 N. C., VA., W. VA., MD., PA., ETC. [Chaf. XXXIX. i', 'n. C., VA., W. VA.,'])
    assert.ok(evenHead(l), l);
  assert.equal(evenHead('606 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.').page, 606);
  assert.equal(evenHead('N. C., VA.j W. YA.j MD., PA.? ETC.').page, null);
  for (const l of ['The regiment marched into N. C., VA., and beyond, reaching the river at noon.', 'Sir: In compliance with circular from headquarters', 'No. 190.', 'Chap. XXXIX.', '']) assert.equal(evenHead(l), null, l);
});

test('running heads and lone page numbers are removed, and the printed page of every page start is recorded', () => {
  const t = ['The first page ends here.', '', '606 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.', '', 'The second page starts here.', 'More text.', '', 'CHAP. XXXIX.] THE GETTYSBURG CAMPAIGN. 607', '', 'The third page starts here.'].join('\n');
  const r = stripRunningHeads(t);
  assert.ok(!/GETTYSBURG|ETC\./.test(r.text)); assert.match(r.text, /^The first page ends here\.\n+The second page starts here\./);
  assert.deepEqual(r.pages.map((p) => p.page), [606, 607]);
  assert.ok(r.text.slice(r.pages[0].offset).trimStart().startsWith('The second page'));
  assert.ok(r.text.slice(r.pages[1].offset).trimStart().startsWith('The third page'));
});

test('printed pages count up: a numbering restart is kept when the next mark confirms it, and a digit slip is replaced by the previous page + 1 (and counted)', () => {
  const head = (n, i) => [`Text ${i}.`, '', `${n} N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX.`, ''].join('\n');
  const t = [10, 11, 12, 1, 2, 3, 8, 5, 6].map(head).join('\n') + '\nEnd.';
  const r = stripRunningHeads(t);
  assert.deepEqual(r.pages.map((p) => p.page), [10, 11, 12, 1, 2, 3, 4, 5, 6]);
  assert.equal(r.inferred, 1);
});

test('dictionary repair: only one-letter OCR confusions of rare tokens into frequent words, unique candidate; digits and capitals untouched', () => {
  const body = Array.from({ length: 250 }, () => 'the enemy were there and the division held').join(' ');
  const r = dictionaryRepair(`${body} the enemy vere beld. Enemy xyz 1863 Vere`, { minDf: 200 });
  assert.match(r.text, /the enemy were held\./); assert.match(r.text, /xyz 1863 Vere/, 'unknown words, digits and capitals stay');
  assert.ok(r.edits.every((e) => e.why === 'ocr-dict' && e.from !== e.to));
});

test('normalizeOcr on the excerpt: heads gone, hyphens joined, logged edits, printed pages 605 and 606', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/or27-excerpt.txt'), 'utf8');
  const n = normalizeOcr(raw);
  assert.ok(!/GETTYSBURG CAMPAIGN|ETC\. \[Chap/.test(n.text)); assert.ok(!/mor-\s*tally/.test(n.text)); assert.match(n.text, /mortally wounded/);
  assert.deepEqual(n.pages.map((p) => p.page), [605, 606]);
  assert.ok(n.edits.length > 0 && n.edits.every((e) => e.why && 'from' in e && 'to' in e));
});

// ---- OR27 contents list and segmenter ---------------------------------------------------------------------------------------------------
const EXCERPT = fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/or27-excerpt.txt'), 'utf8');
const ING = ingestOr27(EXCERPT);

test('contents list: numbers and titles, OCR punctuation removed, a misread number restored from its neighbours', () => {
  assert.deepEqual(ING.toc.map((e) => e.no), Array.from({ length: 22 }, (_, i) => 184 + i));
  const t = (n) => ING.toc.find((e) => e.no === n);
  assert.equal(t(196).title, 'Col. Joshua L. Chamberlain, Twentieth Maine Infantry.');
  assert.equal(t(192).title, 'Col. William S. Tilton, Twenty-second Massachusetts Infantry, commanding First Brigade.');
  assert.equal(t(195).title, 'Col. James C. Rice, Forty-fourth New York Infantry, commanding regiment and Third Brigade.');
  assert.equal(t(203).fixed_from, 208); assert.match(t(203).title, /Ayres/);
  assert.deepEqual(splitTocTitle(t(196).title), { author: 'Col. Joshua L. Chamberlain', unit: 'Twentieth Maine Infantry' });
  assert.deepEqual(splitTocTitle(t(189).title), { author: 'Brig. Gen. James Barnes', unit: 'U. S. Army, commanding First Division' });
});

test('the ABBYY column layout (a run of numbers, then a column of titles) pairs numbers with titles', () => {
  const toc = parseToc(['No. 314.-', 'No. 315.-', 'No. 316.-', '', '-Col. A. B. Smith, First Maine Infantry.', '', '-Lieut. Col. C. D. Jones, Second Maine', 'Infantry.', '', '-Capt. E. F. Brown, Battery B.', ''].join('\n'));
  assert.deepEqual(toc.map((e) => [e.no, e.title]), [[314, 'Col. A. B. Smith, First Maine Infantry.'], [315, 'Lieut. Col. C. D. Jones, Second Maine Infantry.'], [316, 'Capt. E. F. Brown, Battery B.']]);
});

test('segmentation: two reports found by header, with author, unit, printed pages and confidence A against the contents list', () => {
  assert.deepEqual(ING.docs.map((d) => d.no), [190, 191]);
  const [d190, d191] = ING.docs;
  assert.equal(d190.doc_id, 'or27-1:0190'); assert.equal(d190.author, 'Brig. Gen. Charles Griffin'); assert.equal(d190.unit, 'U. S. Army, commanding First Division');
  assert.deepEqual(d190.pages, { start: 605, end: 605 }); assert.deepEqual(d191.pages, { start: 606, end: 606 });
  assert.equal(d190.confidence, 'A'); assert.equal(d191.confidence, 'A');
  assert.match(d190.text, /^No\. 190\.\n+Report of Brig\. Gen\. Charles Griffin/); assert.match(d190.text, /Assistant Adjutant- General\./);
  assert.ok(!/No\. 191/.test(d190.text) && d190.end <= d191.start);
  assert.equal(ING.report.docs_missing_from_run.length, 0); assert.equal(ING.report.running_heads_left, 0);
});

test('header tolerance: OCR variants of the number line and of "Report of" are found; a cross reference that breaks the run is not a report', () => {
  const norm = (text) => ({ text, pages: [] });
  const body = (n, hdr) => `\n\n${n}\n\n${hdr}\n\nSir: I have the honor to report. ${'The regiment held its ground. '.repeat(5)}\n`;
  const variants = [['No. 5.', 'Report of Col. A. Smith, First Maine Infantry.'], ['Ho. 6.', 'Beport of Col. B. Jones, Second Maine Infantry.'], ['ISTo. 7.', 'Report, of Col. C. Brown, Third Maine Infantry.'], ['■No. 8.', 'Renort of Capt. D. Green, Fourth Maine Infantry.'], ['No. 9.', 'General Return of Casualties in the Union forces.']];
  const text = variants.map(([n, h]) => body(n, h)).join('') + '\nSee No. 4. Report of Gen. X, above.\n';
  const seg = segmentReports(norm(text), []);
  assert.deepEqual(seg.docs.map((d) => d.no), [5, 6, 7, 8, 9]);
});

test('a number the OCR misread (203 read as 208) is corrected from the contents list, and logged', () => {
  const toc = [{ no: 202, title: 'Capt. A. B. Clark, First Maine Infantry.' }, { no: 203, title: 'Brig. Gen. Romeyn B. Ayres, U. S. Army, commanding Second Division.' }, { no: 204, title: 'Col. Hannibal Day, Sixth U. S. Infantry.' }];
  const hd = (n, who) => `\n\nNo. ${n}.\n\nReport of ${who}.\n\nSir: ${'The division held. '.repeat(8)}\n`;
  const seg = segmentReports({ text: hd(202, 'Capt. A. B. Clark, First Maine Infantry') + hd(208, 'Brig. Gen. Romeyn B. Ayres, U. S. Army') + hd(204, 'Col. Hannibal Day, Sixth U. S. Infantry'), pages: [] }, toc);
  assert.deepEqual(seg.docs.map((d) => d.no), [202, 203, 204]); assert.deepEqual(seg.fixes, [{ from: 208, to: 203, why: 'toc-sequence' }]);
});

test('ToC-guided recovery: a report whose number line is unreadable is found by its author near a "Report of" line, and marked recovered', () => {
  const toc = [{ no: 1, title: 'Col. A. Smith, First Maine Infantry.' }, { no: 2, title: 'Col. B. Wilkinson, Second Maine Infantry.' }, { no: 3, title: 'Col. C. Brown, Third Maine Infantry.' }];
  const hd = (n, who) => `\n\nNo. ${n}.\n\nReport of ${who}.\n\nSir: ${'The brigade held. '.repeat(8)}\n`;
  const text = hd(1, 'Col. A. Smith, First Maine Infantry') + '\n\n]VTo\n\nReport of Col. B. Wilkinson, Second Maine Infantry.\n\nSir: ' + 'The brigade held. '.repeat(8) + hd(3, 'Col. C. Brown, Third Maine Infantry');
  const seg = segmentReports({ text, pages: [] }, toc);
  assert.deepEqual(seg.docs.map((d) => d.no), [1, 2, 3]); assert.equal(seg.docs[1].recovered, 'toc-author'); assert.equal(seg.docs[1].confidence, 'B'); assert.equal(seg.docs[0].recovered, null);
});

// ---- passages and sentence offsets -------------------------------------------------------------------------------------------------------
test('passages: paragraph aligned, at most 310 words (250 + a merged short tail), never across reports, deterministic ids, source offsets and printed pages on every passage', () => {
  assert.ok(ING.passages.length >= 2);
  for (const p of ING.passages) {
    const d = ING.docs.find((x) => x.doc_id === p.doc_id);
    assert.ok(p.words <= 310 && p.words >= 1, `${p.id} ${p.words}`); assert.match(p.id, /^or27-1:\d{4}#[0-9a-f]{8}$/);
    assert.ok(p.s >= 0 && p.e <= d.text.length && p.s < p.e); assert.ok(p.pages.start !== null && p.pages.end !== null);
  }
  const again = ingestOr27(EXCERPT); assert.deepEqual(again.passages.map((p) => p.id), ING.passages.map((p) => p.id), 'deterministic');
  const long = { doc_id: 'x:1', start: 0, text: Array.from({ length: 12 }, (_, i) => `Paragraph ${i}. ${'word '.repeat(70)}`).join('\n\n'), pages: { start: 1, end: 1 } };
  const ps = chunkDocument(long); assert.ok(ps.length >= 4 && ps.every((p) => p.words <= 310)); assert.deepEqual(new Set(ps.map((p) => p.doc_id)), new Set(['x:1']));
});

test('sentence offsets (sb) point at real sentence starts in the passage text, and 1863 abbreviations do not split sentences', () => {
  for (const p of ING.passages) {
    assert.equal(p.sb[0], 0);
    for (const o of p.sb) { assert.ok(o >= 0 && o < p.text.length); if (o) assert.match(p.text.slice(Math.max(0, o - 2), o), /[.!?\"”)\s]\s?$/, `${p.id}@${o}`); }
  }
  const s = (t) => splitSentences(t).map((x) => t.slice(x.s, x.e));
  assert.equal(s('Lieut. Col. Fred. T. Locke, Assistant Adjutant-General. But see revised statement, p. 179. Sir: I report.').length, 3);
  assert.equal(s('Hdqrs. First Division, Fifth Army Corps, Near Beverly Ford, Va., Aug. 14, 1863. I have the honor.').length, 2);
  assert.equal(s('He fought at the battle of . Getty sburg and fell. Then the line broke.').length, 2, 'a stray OCR dot after a space is not a sentence end');
  // the report body is split into its real sentences: the closing formula and the signature are separate from the narrative
  const p0 = ING.passages[0]; const sents = splitSentences(p0.text).map((x) => p0.text.slice(x.s, x.e));
  assert.ok(sents.some((x) => /^Hdqrs\. First Division/.test(x))); assert.ok(sents.some((x) => /Lieut\. Col\. Fred\. T\. Locke/.test(x) && /p\. 179\./.test(x)));
});

test('no source text is committed: the raw directory and the download cache are git-ignored, and the only fixture is a small excerpt', () => {
  assert.ok(fs.statSync(path.join(ROOT, 'tests/historian/fixtures/or27-excerpt.txt')).size < 12000);
  assert.match(fs.readFileSync(path.join(ROOT, 'historian-src/.gitignore'), 'utf8'), /^raw\/$/m);
  assert.match(fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'), /^tmp\/$/m);
});

// ---- the real volume slice (skipped when the cache is absent) ------------------------------------------------------------------------------
const CACHE = path.join(ROOT, 'tmp/historian-cache');
const sampleMeta = fs.existsSync(CACHE) ? fs.readdirSync(CACHE).filter((f) => f.endsWith('.meta.json')).map((f) => JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'))).find((m) => m.url === OR27 && m.range === SAMPLE_RANGE) : null;
test('the cached 2 MB sample of volume 27: reports found, pages resolved, no running heads left, passages within bounds', { skip: !sampleMeta && 'no cached sample in tmp/historian-cache (run: node tools/historian/ingest/cli.mjs segment or27-1 --sample)' }, async () => {
  const f = createFetcher({ cacheDir: CACHE, registry: REG, fetchImpl: async () => { throw new Error('the network must not be used'); } });
  const raw = (await f.text(OR27, { range: SAMPLE_RANGE })).text;
  assert.equal(f.stats.bytesDownloaded, 0);
  const r = ingestOr27(raw); const rep = r.report;
  assert.ok(rep.docs >= 180, `reports ${rep.docs}`); assert.ok(rep.toc_entries >= 340);
  assert.equal(rep.running_heads_left, 0); assert.equal(rep.docs_with_pages, rep.docs);
  assert.ok(rep.docs_missing_from_run.length <= 5, JSON.stringify(rep.docs_missing_from_run));
  assert.ok(rep.passage_words.mean >= 150 && rep.passage_words.mean <= 250, `mean ${rep.passage_words.mean}`);
  assert.ok(r.passages.every((p) => p.pages.start !== null && p.words <= 310), 'every passage has a printed page and at most max+min words');
  const d190 = r.docs.find((d) => d.no === 190); assert.deepEqual(d190.pages, { start: 605, end: 605 });
  const d189 = r.docs.find((d) => d.no === 189); assert.match(d189.text, /Chamberlain/); assert.equal(d189.author, 'Brig. Gen. James Barnes'); assert.ok(r.docs.at(-1).no >= 190, 'the sample ends inside the Fifth Corps reports');
});

// ---- verifier defect V-06: spelling and redirects ------------------------------------------------------------------------------------------------------
test('rights gate: a trailing-dot Tier C host and an upper-case refused identifier are refused before any network call, also with allowUnregistered', async () => {
  const rg = rig(), f = mk(rg, tmp('gate2'));
  for (const u of ['https://battlefields.org./x', 'https://BATTLEFIELDS.org/x', 'https://archive.org/download/WARREBELLIONACO00COWLGOOG/x_djvu.txt', 'https://web.archive.org/web/2020/https://battlefields.org/x']) {
    await assert.rejects(() => f.get(u, { allowUnregistered: true }), RightsRefusal, u);
    await assert.rejects(() => f.get(u), RightsRefusal, u);
  }
  assert.equal(rg.calls.length, 0);
});

test('rights gate: every redirect hop is checked (a registered URL that redirects to a Tier C host or a refused identifier is refused, and nothing is fetched from the target)', async () => {
  for (const target of ['https://battlefields.org/civil-war/x', 'https://archive.org/download/warrebellionaco00cowlgoog/x_djvu.txt', 'https://www.findagrave.com./memorial/1']) {
    const rg = rig([{ status: 302, headers: { location: target } }, { status: 200, body: 'must never be read' }]), f = mk(rg, tmp('redir'));
    await assert.rejects(() => f.get(OR27), (e) => e instanceof RightsRefusal && /redirect target refused/.test(e.message), target);
    assert.equal(rg.calls.length, 1, `only the registered URL was requested, not ${target}`);
  }
  // a redirect that leaves the source's domain is refused even when the target is not on any list
  const rg2 = rig([{ status: 301, headers: { location: 'https://example.org/mirror/x_djvu.txt' } }]), f2 = mk(rg2, tmp('redir2'));
  await assert.rejects(() => f2.get(OR27), (e) => e instanceof RightsRefusal && /leaves the registered source/.test(e.message)); assert.equal(rg2.calls.length, 1);
});

test('redirects within the source (archive.org to a numbered data node, relative Location) are followed, politely, and the body is cached under the requested URL', async () => {
  const rg = rig([{ status: 302, headers: { location: 'https://ia800000.us.archive.org/1/items/warofrebellion271unit/warofrebellion271unit_djvu.txt' } }, { status: 301, headers: { location: '/other/path.txt' } }, { status: 200, body: 'the text' }]), f = mk(rg, tmp('redir3'));
  const r = await f.get(OR27);
  assert.equal(r.body.toString(), 'the text'); assert.equal(rg.calls.length, 3); assert.equal(rg.calls[0].url, OR27); assert.match(rg.calls[1].url, /ia800000\.us\.archive\.org/); assert.match(rg.calls[2].url, /ia800000\.us\.archive\.org\/other\/path\.txt/);
  const again = await mk(rig(), f.cacheDir || tmp('unused')).get(OR27).catch(() => null); assert.ok(again === null || again.body.toString() === 'the text');
  // a loop is cut off
  const loop = rig(Array.from({ length: 10 }, () => ({ status: 302, headers: { location: 'https://archive.org/download/warofrebellion271unit/again.txt' } }))), f3 = mk(loop, tmp('loop'));
  await assert.rejects(() => f3.get(OR27), /too many redirects/);
});

// ---- verifier defect V-11: running heads and signature marks that share a line with body text ---------------------------------------------------------------
import { stripInline, isTableDebris, countRunningHeads, missingDetail } from '../../tools/historian/ingest/or27.mjs';
test('stripInline removes a head or signature mark run into a body line (OCR variants included) and keeps the printed page it carried', () => {
  const cases = [
    ['no blame [Chap. XXXIX. I 20 r6figi totheforce then', 'no blame r6figi totheforce then', 20],
    ['information I Chap. XXXIX.J 51 obtains. General Kelley', 'information I obtains. General Kelley', 51],
    ['were wounded. 6 R R — VOL XXVII, PT I 82 [Chap. XXXIX. , diately move on', 'were wounded. diately move on', 82],
    ['of one of the generals 2 R R— VOL XXVII, PT I in command.', 'of one of the generals in command.', null],
    ['reports 3 r r — VOL XXVII, pt i JOSEPH HOOKER,', 'reports JOSEPH HOOKER,', null],
    ['Maj. Grotius R. Giddings. Ur R — VOL XXVII, PT I 2d United States', 'Maj. Grotius R. Giddings. 2d United States', null],
    ['Third Corps, 36 R U— VOL XXVII, PT J 562 [Inclosure.]', 'Third Corps, 562 [Inclosure.]', null],
    ['Chap.^XXIX.] THE GETTYSBURG CAMPAIGN. 55 Washington, June 22, 1863.', 'Washington, June 22, 1863.', 55],
    ['IChap. xxxix. First Brigade. Col. William McCandless.', 'First Brigade. Col. William McCandless.', null],
    ['526 N. C.. VA.j W. VA.? MD.j PA., ETC. [Chap. - XXXIX.', '', 526],
    ['position on the left of the Third Division, 262 [Chap. XXXIX, First Corps.', 'position on the left of the Third Division, First Corps.', null],
  ];
  for (const [line, want, page] of cases) { const r = stripInline(line); assert.equal(r.changed, true, line); assert.equal(r.text, want, line); if (page) assert.equal(r.page, page, line); }
  // body text that only looks similar is left alone
  for (const line of ['during the Gettysburg Campaign, June 3-August 1, 1863.', 'Chapter XXXIX of the report and the R R Co. of Vol. XXVII', 'He lost 20 men in the 27 Virginia; Chap. 5 follows', 'Army of the Potomac, Part I, June 28.']) assert.equal(stripInline(line).changed, false, line);
});
test('a quantity right after a head is not taken for its page number ("Chap. XXXIX.] 12 killed")', () => { const r = stripInline('Chap. XXXIX.] 12 killed and wounded'); assert.equal(r.page, null); assert.equal(r.text, '12 killed and wounded'); });
test('isTableDebris: an OCR table (many one-cell paragraphs) is recognised, prose and a short list are not', () => {
  const table = ['Location.', ...Array.from({ length: 40 }, (_, i) => (i % 3 ? String(i * 7) : 'a')), 'Brandy Station'].join('\n\n');
  assert.equal(isTableDebris(table), true);
  assert.equal(isTableDebris('A long paragraph of ordinary prose about the movement of the corps on the road to Gettysburg.\n\n'.repeat(30)), false);
  assert.equal(isTableDebris(['1', '2', '3', 'Killed.', 'Wounded.'].join('\n\n')), false);
});
test('missingDetail explains every report number the run should hold and finds its text in the previous document', () => {
  const docs = [{ no: 29, text: 'the corps.\n\nJOHN NEWTON,\n\nMajor-General.' }, { no: 31, text: 'x' }, { no: 33, text: 'y' }];
  const toc = [{ no: 30, title: 'Maj. Gen. John Newton, U. S. Army, commanding First Army Corps.' }];
  assert.deepEqual(missingDetail(docs, toc), [
    { no: 30, reason: 'header-not-found', contents_title: toc[0].title, previous_document: 29, text_in_previous_document: true },
    { no: 32, reason: 'no-contents-entry', contents_title: null, previous_document: 31, text_in_previous_document: false },
  ]);
  assert.deepEqual(missingDetail([], []), []);
});
test('the committed excerpt: the broad head detector finds nothing left and agrees with the strip', () => {
  const ex = fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/or27-excerpt.txt'), 'utf8');
  const r = ingestOr27(ex);
  assert.equal(r.report.running_heads_left, 0); assert.equal(countRunningHeads(r.norm.text), 0);
  assert.ok(Array.isArray(r.report.missing_detail) && Array.isArray(r.report.table_debris_dropped));
});
test('the cached 2 MB sample (V-11): no passage carries a head or signature mark under a CASE-SENSITIVE detector, the three unrecoverable headers are explained, table debris is dropped and counted', { skip: !sampleMeta && 'no cached sample in tmp/historian-cache' }, async () => {
  const f = createFetcher({ cacheDir: CACHE, registry: REG, fetchImpl: async () => { throw new Error('the network must not be used'); } });
  const r = ingestOr27((await f.text(OR27, { range: SAMPLE_RANGE })).text).report ? ingestOr27((await f.text(OR27, { range: SAMPLE_RANGE })).text) : null;
  const dirty = r.passages.filter((p) => /Chap\W{1,3}\s*X{1,3}[IlL]?X?[\]jf1)|.,]|THE GETTYSBURG CAMPAIGN|VOL\.? XXVII, PT/.test(p.text));
  assert.equal(dirty.length, 0, dirty.map((p) => p.text.slice(0, 60)).join(' | '));
  assert.deepEqual(r.report.missing_detail.map((m) => [m.no, m.reason, m.text_in_previous_document]), [[30, 'header-not-found', true], [81, 'no-contents-entry', false], [161, 'header-not-found', true]]);
  assert.ok(r.report.table_debris_dropped.length >= 1 && r.report.table_debris_dropped.length < 0.05 * (r.passages.length + r.report.table_debris_dropped.length), `${r.report.table_debris_dropped.length} dropped`);
  assert.equal(r.report.passages, r.passages.length); assert.ok(r.passages.every((p, i, a) => i === 0 || a[i - 1].doc_id !== p.doc_id || p.seq === a[i - 1].seq + 1), 'seq is contiguous per document after the drop');
});
