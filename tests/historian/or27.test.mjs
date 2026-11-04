// or27.test.mjs - the Official Records corpus (Ser. I, vol. 27, parts 1-3): provenance and counts, the classes of defect found while finishing it (page marks, report metadata, dispatch senders, links), the
// hand-checked samples (links, time proposals), the golden sets, the first-paint bytes and the promise that a site question is answered as before.
// Tests that need the corpus KB build it once into a temporary directory from historian-src/raw/or27 (git-ignored) and are skipped, loudly and with the commands, when that text is not here.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { or27, available, SKIP } from './lib/or27-fixture.mjs';
import { loadGolden, runGolden, summarize, nf, quoteProblems } from './lib/or27-golden.mjs';
import { openKB, nodeFetcher } from '../../historian-src/core/kb.js';
import { createEngine } from '../../historian-src/core/engine.js';
import { pageSpan } from '../../historian-src/core/select.js';
import { normalizeOcr, ingestOr27 } from '../../tools/historian/ingest/or27.mjs';
import { createPageMap } from '../../tools/historian/ingest/pagemap.mjs';
import { reportMeta, dispatchMeta } from '../../tools/historian/ingest/meta.mjs';
import { loadLinker } from '../../tools/historian/ingest/t1setup.mjs';
import { createOrLinker } from '../../tools/historian/ingest/link.mjs';
import { signatureLines } from '../../tools/historian/ingest/or27-dispatch.mjs';
import { nameStems } from '../../tools/historian/lib/corpus-or.mjs';
import { stem } from '../../historian-src/core/text.js';
import { loadSources } from '../../tools/historian/lib/sources.mjs';

const J = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const MAN = J('historian-src/corpus/or27/manifest.json');
const need = available() ? false : SKIP;
if (need) console.log(`# SKIPPED, not passed: ${SKIP}`);

// ---- provenance and counts (committed tables: no raw text needed) ------------------------------------------------------------------------------------------------------------------------
test('OR-1 provenance: every file fetched has its URL, fetch time, sha256, size, content type and the rights statement of its volume; all three volumes are Tier A, public domain, registered', () => {
  const REG = loadSources();
  const files = MAN.sources.filter((p) => p.url);
  assert.equal(files.length, 15, '3 volumes x (OCR text, page numbers, scandata, and the per-leaf text and per-leaf index of the Archive that the page of every sentence is read from)');
  assert.deepEqual([...new Set(files.map((p) => p.role))].sort(), ['leaf-index', 'leaf-text', 'ocr-text', 'page-numbers', 'scandata']);
  for (const p of files) {
    assert.match(p.url, /^https:\/\/archive\.org\/download\/warofrebellion27[123]unit\//); assert.match(p.sha256, /^[0-9a-f]{64}$/); assert.ok(p.bytes > 1000 && p.fetched_at && p.content_type, p.url);
    assert.equal(p.rights_tier, 'A'); assert.equal(p.license_id, 'PD-US-Gov'); assert.match(p.rights_statement_url, /^https:\/\/catalog\.hathitrust\.org\/api\/volumes\/brief\/htid\//);
    const s = REG.sources.get(p.source); assert.equal(s.tier, 'A'); assert.equal(s.status, 'ingested'); assert.equal(s.imprint.reprint, false);
    assert.equal(s.ingest.files.find((x) => x.url === p.url).sha256, p.sha256, 'the register carries the hash the ingestion read');
  }
  assert.ok(!files.some((p) => /warrebellionaco00cowlgoog/.test(p.url)), 'never the 1971 reprint');
  assert.deepEqual(MAN.sources.find((p) => p.source === 'or27-1' && p.role === 'run-report').missing_numbers, [161], 'the one report not found is named, not hidden');
});

test('OR-2 counts: 588 of the 589 numbered reports, 3,222 dispatches, 8,414 passages; a document\'s passages are its words; every report has its page and its scan', () => {
  // the first build held 3,533 documents, 8,232 passages and 2,945 dispatches (2,939 with text); the rebuild cuts Part 3 at 3,178 dispatches and counts the one table with no text apart
  // R1e (2026-10-22), the third build: Part 3 is cut at 3,222 dispatches (3,178 before: 21 documents glued under one signature were parted by datelines the OCR damaged - "June z4", "4.5.0 p. m.", "1863^-5", a bracketed day -, and 23 more returns are
  // cut at their table headings: 34 rows of kind 'return', 11 before), 15 tables apart with no text (1 before), 8,414 passages (8,405) of 1,321,161 words (1,323,095: the running-head fragments, the footnotes and the printer's
  // sheet marks that were still in the text are out). Counted independently of the manifest from the files of the build: historian-src/raw/or27/docs.jsonl 3,810 lines (588 + 3,222), passages.jsonl 8,414 lines whose words add to 1,321,161.
  assert.deepEqual(MAN.totals, {"documents":3810,"passages":8414,"words":1321161,"reports_found":588,"dispatches":3222,"tables_without_text":15});
  const reports = J('historian-src/corpus/or27/reports.json').reports; assert.equal(reports.length, 588);
  assert.equal(reports.filter((r) => r.kind === 'report').length, 573);
  for (const r of reports) { assert.ok(r.pages && Number.isFinite(r.pages.start) || r.confidence !== 'A', r.id); if (r.scan) assert.match(r.scan.url, /^https:\/\/archive\.org\/details\/warofrebellion27[12]unit\/page\/n\d+\/mode\/1up$/); }
  assert.ok(reports.filter((r) => r.scan).length >= 560, 'a scan link for nearly every report');
  const d = J('historian-src/corpus/or27/dispatches.json'); assert.equal(d.rows.length, 3222); assert.ok(d.rows.every((r) => r[d.fields.indexOf('passages')] > 0), 'every row of the dispatch table has text'); assert.ok(d.fields.includes('signer_link') && d.fields.includes('signer_tier'));
  const t = J('historian-src/corpus/or27/time_claims.json'); assert.equal(t.rows.length, MAN.time.claims); assert.ok(t.fields.includes('leaf') && t.fields.includes('page'), 'a claim carries the printed page and the scan leaf of ITS page, not of the report\'s first page');
});

// ---- the classes of defect found while finishing it ---------------------------------------------------------------------------------------------------------------------------------------------
test('OR-3 page marks: two pages whose first lines read alike keep their own offsets, a mark in a hyphenated word is carried, no page is lost (the page 464/465 defect: a mark looked up again by its next words landed two pages on one offset)', () => {
  const raw = ['Headquarters Third Army Corps,', 'Emmitsburg, July 1, 1863.', 'General Williams :', 'The first dispatch of the page ends here and carries on to the next. Respectfully,', '', '', 'Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 465', '', 'Headquarters Third Army Corps,', 'Emmitsburg, July 1, 1863 - 3.30 p. m.', 'General Birney :', 'You will move your division to Gettysburg, the road is Rit-', 'tenhouse Lane, and report at once.'].join('\n');
  const n = normalizeOcr('Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 464\n\n' + raw, { repair: false });
  assert.deepEqual(n.pages.map((p) => p.page), [464, 465]);
  assert.ok(n.pages[1].offset > n.pages[0].offset + 60, JSON.stringify(n.pages));
  assert.match(n.text.slice(n.pages[1].offset), /^Headquarters Third Army Corps,\nEmmitsburg, July 1, 1863 - 3\.30/, 'page 465 begins at ITS first line, not at the first line that reads alike');
  assert.match(n.text.slice(n.pages[0].offset), /^Headquarters Third Army Corps,\nEmmitsburg, July 1, 1863\.\n/, 'page 464 begins at its own');
  const h = normalizeOcr('Chap. XXXIX.] THE GETTYSBURG CAMPAIGN. 238\n\nI had just finished my inspection, and was with Lieutenant Ritten-\nChap. XXXIX.] THE GETTYSBURG CAMPAIGN. 239\nhouse on the top of Round Top, when the enemy opened.\n', { repair: false });
  assert.deepEqual(h.pages.map((p) => p.page), [238, 239]); assert.ok(h.text.includes('Rittenhouse'), 'the hyphenated word is joined across the page break'); assert.ok(h.pages[1].offset > h.text.indexOf('Rittenhouse') && h.pages[1].offset <= h.text.length);
  assert.ok(!//.test(h.text), 'no private mark is left in the text');
});

test('OR-3b the first page of Part 3 prints no running head: the dispatches on it are on the page before the first folio read (3, confirmed by the "(3)" the page prints at its foot), with the scan leaf the folio count gives', () => {
  const part3 = fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/or27-part3-first-pages.txt'), 'utf8') + '\n\nChap.  XXXIX.] \n\n\nCORRESPONDENCE,  ETC. — UNION. \n\n\n5 \n\n\nballoon at Banks’ Ford will probably be able to give you information if you get in communication.\n';
  assert.match(part3, /\(3\) *\n/, 'the page prints its own folio in parentheses at its foot');
  const r = ingestOr27(part3, { part: 3, repair: false });
  assert.deepEqual(r.norm.pages.map((p) => p.page), [3, 4, 5]); assert.equal(r.norm.pages[0].inferred, true);
  assert.deepEqual(r.docs.slice(0, 3).map((d) => [d.pages.start, d.pages.end]), [[3, 3], [3, 3], [3, 4]], 'the first two dispatches are on page 3; the third runs onto page 4');
  assert.deepEqual(r.passages.filter((p) => !p.pg.length).map((p) => p.id), [], 'no passage is left without a page');
  assert.equal(r.report.dispatch.pages_missing, 0);
  const pm = createPageMap({ pageNumbers: { pages: [...Array(9).fill(0).map((_, i) => ({ leafNum: i + 1, pageNumber: '' })), { leafNum: 10, pageNumber: '4' }, { leafNum: 11, pageNumber: '5' }] }, iaId: 'warofrebellion273unit' });
  assert.deepEqual([pm.leafOf(3).leaf, pm.leafOf(3).exact], [9, false], 'a page whose folio the Archive could not read takes its leaf from the folio count');
});

test('OR-4 report metadata: "Reports of" and a timed dispatch heading mark a composite document (its first dateline is not the date of the report); a report dated before the battle is not about the battle; "; U. S. Army" is not the author', () => {
  const m = (title, text, toc = null, part = 1) => reportMeta({ doc_id: 'x', no: 76, title, toc_title: toc, text, pages: { start: 366, end: 379 }, confidence: 'A' }, { part });
  const hancock = m('Reports of Maj. Gen. Winfield S. Hancock, U. S. Army, commanding Second Army Corps.', '5.25 [p. M., July 1, 1863.]\n\nGeneral: When I arrived here an hour since, I found that our troops had given up the front.', 'Maj. Gen. Winfield S. Hancock, U. S. Army, commanding Second Army');
  assert.equal(hancock.composite, true); assert.match(hancock.persp.label, /several documents/); assert.equal(hancock.persp.lag_days, null);
  const howard = m('Report of Maj. Gen. Oliver O. Howard , U. S. Army, commanding Eleventh Army Corps, with congratulatory order.', 'July 1, 1863—5 p. m.\n\nGeneral: General Reynolds attacked the enemy.', null, 1, 243);
  assert.equal(howard.composite, true); assert.equal(howard.persp.lag_days, null);
  const plain = m('Report of Col. Joshua L. Chamberlain, Twentieth Maine Infantry.', 'Headquarters Twentieth Maine, July 6, 1863.\n\nSir: In compliance with the request.');
  assert.equal(plain.composite, false); assert.equal(plain.persp.lag_days, 3); assert.equal(plain.scope, 'gettysburg');
  const aldie = m('Report of Col. Strong Vincent , Eighty -third Pennsylvania Infantry , commanding Third Brigade.', 'Camp near Aldie , Va., June 22, 1863.\n\nSir: I have the honor to report the action of the 17th.', 'Col. Strong Vincent, Eighty-third Pennsylvania Infantry, commanding Third Brigade, of action at Aldie, Va.');
  assert.equal(aldie.scope, 'other'); assert.equal(aldie.written.iso, '1863-06-22'); assert.equal(aldie.persp.lag_days, null, 'a June report has no lag behind the battle');
  const gibbon = m('Report of Brig. Gen. John Gibbon; U. S. Army, commanding Second Division.', 'August 7, 1863.\n\nColonel: I have the honor to submit.', 'Brig. Gen. John Gibbon; U. S. Army, commanding Second Division of, and Second Corps');
  assert.equal(gibbon.author.name, 'John Gibbon');
  const disp = dispatchMeta({ doc_id: 'or27-3:p0499.1', header: 'Headquarters Army of the Potomac', date: { y: 1863, m: 7, d: 3 }, date_text: 'July 3, 1863 — 8.30 a. m.', place: null, addressee: 'General Couch', signer: 'GEO. G. MEADE', side: 'union', clock: { text: '8.30 a. m.', min: 510 }, pages: { start: 499, end: 499 }, kind: 'dispatch' }, { part: 3 });
  assert.equal(disp.persp.contemporaneous, true); assert.match(disp.persp.label, /written at the time/);
});

const T = loadLinker(); const L = createOrLinker({ idx: T.idx, link: T.link });
const sigText = (sig, title, addr = 'General Halleck:') => `Headquarters Army of the Potomac,\nJuly 3, 1863.\n\n${addr}\n\nThe enemy has withdrawn.\n\n${sig},\n${title}.`;
test('OR-5 dispatch senders: one signature, the segmenter\'s own signer, a title that agrees with the registry\'s rank; never a staff officer with a general\'s surname, never two signatures, never a surname that only stems alike', () => {
  const sg = (text, o = {}) => L.resolveSigner([text], { side: 'union', ...o });
  assert.equal(sg(sigText('GEO. G. MEADE', 'Major-General'), { signer: 'GEO. G. MEADE' }).person.id, 'P:george-meade');
  assert.equal(sg(sigText('0. O. HOWARD', 'Major-General'), { signer: 'O. O. HOWARD' }).person.id, 'P:oliver-howard', 'the OCR zero of the first initial');
  assert.equal(sg(sigText('S. WILLIAMS', 'Assistant Adjutant-General'), { signer: 'S. WILLIAMS' }).person, null, 'a staff officer is not the site\'s Col. Samuel Williams or Brig. Gen. Alpheus Williams');
  assert.equal(sg(sigText('GEO. G. MEADE', 'Major-General') + '\nDANL. BUTTERFIELD,\nMajor-General.', { signer: 'GEO. G. MEADE' }).person, null, 'two signatures: no single sender');
  assert.equal(sg(sigText('GEO. G. MEADE', 'Major-General'), { signer: 'JOHN NEWTON' }).person, null, 'the segmenter read another signer: not guessed');
  assert.equal(sg(sigText('JEFFERSON DAVIS', 'President'), { signer: 'JEFFERSON DAVIS', side: 'confederate' }).person, null, 'a title that is no rank: not Brig. Gen. Joseph R. Davis');
  assert.equal(sg(sigText('W. H. C. WHITING', 'Major-General'), { signer: 'W. H. C. WHITING', side: 'confederate' }).person, null, 'Whiting is not the site\'s White');
  assert.deepEqual(signatureLines('Text.\nGEO. G. MEADE,\nMajor-General.\nGENERAL ORDERS,\nHEADQUARTERS ARMY').length, 1, 'order headings are not signatures');
  assert.ok(nameStems('Brig. Gen. J. D. Imboden, Commanding, &c.').includes('imboden') && !nameStems('Brig. Gen. J. D. Imboden, Commanding, &c.').includes('command')); assert.deepEqual(nameStems('H. W. HALLECK', { upper: true }), ['halleck']);
  assert.deepEqual([nameStems('Brig. Gen. S. Williams').includes('william'), nameStems('GEO. SYKES', { upper: true }).includes(stem('sykes'))], [true, true], 'the stems are the question side\'s: "Williams" is looked up as william (an index of "williams" never matched, and the stem "william" matched every William)');
  const sg2 = L.resolveSigner(['Hdqrs. Cavalry Corps,\n\nJune 3, 1863.\n\nBrig. Gen. S. Williams,\n\nText.\n\nA. PLEASONTON,\nBrigadier- General, Commanding.\n\n[Inclosure.]'], { side: 'union', signer: 'A. PLEASONTON' });
  assert.equal(sg2.person && sg2.person.id, 'P:alfred-pleasonton', 'a Brigadier-General of June 3 who is the registry\'s Major-General Pleasonton: the same class of rank');
  assert.equal(L.resolveSigner(['Text.\n\nJAS. S. HALL,\nCaptain, Signal Officer.'], { side: 'union', signer: 'JAS. S. HALL' }).person, null, 'a signal officer is not the captain of the 2nd Maine Battery');
  assert.equal(L.resolveSigner(['Text.\n\nWILLIAM H. HILL,\nCaptain, Commanding Battery.'], { side: 'union', signer: 'WILLIAM H. HILL' }).person, null, 'William is not Wallace');
  assert.equal(L.resolveSigner(['Text.\n\nJ. S. ROBINSON,\nColonel, Commanding Post.'], { side: 'union', signer: 'J. S. ROBINSON' }).person, null, 'a colonel signing as a colonel is not the registry\'s brigadier general');
  assert.equal(L.resolveSigner(['Text.\n\nWINF’D S. HANCOCK,\nMajor-General.\n\nWINFD S.. HANCOCK,\nMajor-General.'], { side: 'union', signer: 'WINFD S.. HANCOCK' }).person.id, 'P:winfield-hancock', 'one man twice, in two OCR spellings, is one signature');
});

test('OR-6 links: a battery that carries its parent regiment\'s name, the militia, a "Major-General Hill" (D. H.) and "General Williams, Assistant Adjutant-General" are not the site\'s regiments and generals', () => {
  const ids = (s, side = 'union') => L.mentionsOf(s, { side }).filter((m) => m.tier !== 'C').map((m) => T.idx.R[m.i].id);
  assert.ok(!ids('Cooper’s (First Pennsylvania Reserve Volunteer) battery').includes('U-1PA-R'));
  assert.ok(ids('the First Pennsylvania Reserves held the line').includes('U-1PA-R'), 'the regiment itself is still linked');
  assert.deepEqual(ids('Col. Jacob G. Frick, Twenty-seventh Pennsylvania Militia'), []);
  assert.ok(!ids('Major-General Hill, Comdg. Dept. of N. C.', 'confederate').includes('P:ambrose-hill'));
  assert.ok(ids('General Hill’s corps advanced', 'confederate').includes('P:ambrose-hill'));
  assert.ok(!ids('General Williams, Assistant Adjutant-General : A colored boy captured on the 9th states').includes('P:alpheus-williams'));
  assert.ok(ids('General Williams commanded the First Division').includes('P:alpheus-williams'));
  assert.ok(!ids('Capt. J. M. Knap, Battery A, Pennsylvania militia, will report at Beverly, Va.').some((x) => /ART/.test(x)));
});

// ---- the hand-checked samples ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const wilson = (k, n) => { const z = 1.96, ph = k / n; return (ph + z * z / (2 * n) - z * Math.sqrt((ph * (1 - ph) + z * z / (4 * n)) / n)) / (1 + z * z / n); };
test('OR-7 link precision on 200 emitted links read by hand (35+20 tier A and 45+20 tier B passage entities, 35 report authors (person), 20 report authors (unit), 25 dispatch senders): at least 93% right overall and 90% in every family; every link read as right is still made, every wrong one that was fixed is not', () => {
  const F = J('tests/historian/fixtures/or27-links-checked.json');
  const S12 = F.items.filter((i) => i.family !== 'signer-doc'), S3 = F.items.filter((i) => i.family === 'signer-doc');
  const emitted = S12.filter((i) => i.tier !== 'C'); assert.equal(emitted.length, 200);
  const right = emitted.filter((i) => i.label === 'correct'); const p = right.length / emitted.length;
  const C = S12.filter((i) => i.tier === 'C');
  console.log(`   links: ${right.length}/${emitted.length} right (${(100 * p).toFixed(1)}%, 95% interval from ${(100 * wilson(right.length, emitted.length)).toFixed(1)}%); tier A ${emitted.filter((i) => i.tier === 'A' && i.label === 'correct').length}/${emitted.filter((i) => i.tier === 'A').length}, tier B ${emitted.filter((i) => i.tier === 'B' && i.label === 'correct').length}/${emitted.filter((i) => i.tier === 'B').length}; tier C (never emitted) ${C.filter((i) => i.label === 'correct').length}/${C.length}`);
  assert.ok(p >= 0.93, `precision ${p}`);
  for (const fam of ['mention', 'author-person', 'author-unit', 'signer']) { const a = emitted.filter((i) => i.family === fam); const k = a.filter((i) => i.label === 'correct').length; assert.ok(a.length >= 20 && k / a.length >= 0.9, `${fam}: ${k}/${a.length}`); }
  assert.ok(emitted.some((i) => i.label === 'wrong') && emitted.some((i) => i.label === 'uncertain'), 'the sample keeps its errors: it is not a list of what works');
  assert.ok(C.filter((i) => i.label !== 'correct').length >= 3, 'tier C holds wrong links, which is why it is not emitted');
  // regression: replay each link with the code as it is now. A link read as right is made again; a wrong one that was fixed is not
  const reports = new Map(J('historian-src/corpus/or27/reports.json').reports.map((r) => [r.id, r]));
  const made = (i) => {
    if (i.family === 'mention') return L.mentionsOf(i.sentence, { side: i.side }).some((m) => T.idx.R[m.i].id === i.entity && m.tier !== 'C');
    if (i.family === 'signer' || i.family === 'signer-doc') return L.resolveSigner([['Headquarters', 'July 1, 1863.', (i.addressee || 'General') + ':', 'Text of the dispatch.', '', i.signature, ...i.title_lines].join('\n')], { side: i.side, signer: i.signature.replace(/[,\s]+$/, '') }).person?.id === i.entity;
    const au = L.resolveAuthor(reports.get(i.doc), { side: i.side });
    return i.family === 'author-person' ? !!(au.person && au.person.id === i.entity) : au.units.some((u) => u.id === i.entity);
  };
  const lost = [], back = [];
  for (const i of emitted) {
    const m = made(i);
    if (i.label === 'correct' && !m && !i.lost_after_fix) lost.push(i.id);
    if (i.fixed_after_label && m) back.push(i.id);
  }
  assert.deepEqual(lost, [], 'a link read as right is no longer made');
  assert.deepEqual(back, [], 'a wrong link that was fixed is made again');
  const nFixed = emitted.filter((i) => i.fixed_after_label).length, nLost = emitted.filter((i) => i.lost_after_fix).length;
  assert.ok(nFixed >= 5 && nLost <= 2, `${nFixed} fixed, ${nLost} given up`);
  // the senders added when a dispatch's signature is read from the document's own lines (a paragraph of a passage joins "A. PLEASONTON," and "Brigadier-General, Commanding." into one line): every one read, none drawn
  const right3 = S3.filter((i) => i.label === 'correct');
  console.log(`   senders read from the document's lines: ${right3.length}/${S3.length} right at first reading, the ${S3.length - right3.length} wrong fixed (staff title below a general, given names that differ, a colonel who signs as a colonel)`);
  assert.equal(S3.length, 105); assert.equal(S3.length - right3.length, 5);
  const dt = J('historian-src/corpus/or27/dispatches.json'); const link = new Map(dt.rows.map((r) => [r[dt.fields.indexOf('id')], r[dt.fields.indexOf('signer_link')]]));
  assert.deepEqual(S3.filter((i) => (i.label === 'correct') !== (link.get(i.doc) === i.entity)).map((i) => i.id), [], 'in the built table: every sender read as right is linked, every wrong one is not');
  assert.deepEqual(S3.filter((i) => (i.label === 'correct') !== made(i)).map((i) => i.id), [], 'and so is a replay of its signature');
  assert.ok([...link.values()].filter(Boolean).length >= 460, 'the sender links of the built table');
});

test('OR-8 time proposals: 36 attached claims read against their events; tier F (a part of the unit, the same kind of thing, within an hour of the site\'s own minute) is about the event at least half the time, tiers A and B are few; the table says it is a set of proposals, and every claim carries its minute, page and scan leaf', () => {
  const F = J('tests/historian/fixtures/or27-time-evidence-checked.json'); const TE = J('historian-src/corpus/time_evidence.json');
  const by = (t) => F.items.filter((i) => i.tier === t); const ok = (a) => a.filter((i) => i.label === 'about the event').length;
  console.log(`   time proposals: tier F ${ok(by('F'))}/${by('F').length} about the event, tiers A+B ${ok(by('A')) + ok(by('B'))}/${by('A').length + by('B').length}`);
  assert.ok(by('F').length >= 30 && ok(by('F')) / by('F').length >= 0.5, 'tier F precision');
  const flat = (x) => String(x).replace(/\s+/g, ' ');
  for (const i of F.items) {
    const ev = TE.events[i.event]; assert.ok(ev, i.event);
    const c = ev.claims.find((x) => x.text === i.claim.text && x.author === i.claim.author && flat(x.sentence).startsWith(i.claim.sentence.slice(0, 80)));
    // a claim the hand check labelled "not about the event" may drop out (R1e: the site's own minute of D3T515 moved from 11:00 to 10:30 AM with the adjudicated clock, so Col. Packer's "12 m." is 90 minutes away and no longer
    // a tier F candidate: a false positive less); one the check found "about the event" must still be proposed, in the tier it was checked in
    if (!c && i.label === 'not about the event') continue;
    assert.ok(c, `${i.event}: "${i.claim.text}" by ${i.claim.author} is no longer proposed`); assert.equal(c.tier, i.tier, `${i.event}: the tier of a hand-checked claim moved`);
  }
  assert.match(TE.status, /^PROPOSALS: nothing here is shown to a reader/); assert.equal(Object.keys(TE.events).length, 137);
  const tiers = { A: 0, B: 0, F: 0, C: 0 }; let n = 0;
  for (const e of Object.values(TE.events)) for (const k of 'ABFC') tiers[k] += e.tiers[k];
  // the hand check was drawn from a table of A 1, B 5, F 68, C 434 (494 claims); the day register has been corrected since (a bare ordinal that turns over the end of June, "the 1st instant" in a document of two reports, a clock followed by "on the following morning"), which moved 4 claims into tier F and 19 into C; every one of the 36 checked claims is still proposed, in its tier (above)
  // R1e: C 453 -> 454: the knowledge base is rebuilt with the adjudicated clock (hx is no longer stale), which moves the site's own minute of three events and so their tiers: D2T248 F 1 -> 2, D2T304 C 13 -> 14, D3T515 F 3 -> 2 (compared with the table before the rebuild). Counted from the table: A 1, B 5, F 72, C 454.
  assert.deepEqual(tiers, { A: 1, B: 5, F: 72, C: 454 }, 'the tier counts of the rebuilt table');
  for (const e of Object.values(TE.events)) for (const c of e.claims) {
    n++; assert.ok(Number.isInteger(c.min) && c.min >= 0 && c.min < 1440, 'a minute of the day'); assert.ok(Number.isInteger(c.page) && Number.isInteger(c.leaf), `${c.passage}: printed page and scan leaf`);
    assert.ok(['A', 'B', 'F', 'C'].includes(c.tier)); assert.ok(['report', 'dispatch-header', 'dispatch-body'].includes(c.evidence)); assert.ok(/^or27-[123]:/.test(c.passage));
  }
  assert.equal(n, 516);
});

// ---- the corpus KB: verbatim quotes, citations, golden sets, first paint, additivity ---------------------------------------------------------------------------------------------------------------
test('OR-9 the corpus tiers: every passage is a verbatim slice of the normalised OCR of its report (validator V03: all checked, 0 failed), the KB opens with no corpus request, and the first request that reaches into the corpus loads the file list once', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const c = k.man.corpora.or27;
  assert.ok(c.count === MAN.totals.passages && c.files && /^f\/or27\/files\.[0-9a-f]+\.json$/.test(c.files.path), 'a descriptor and a lazy file list, not 1,189 inline paths');
  if (k.report) { const v = k.report.corpora.or27.validation; assert.deepEqual([v.passages, v.v03_verbatim_checked, v.v03_verbatim_failed, v.no_scan], [MAN.totals.passages, MAN.totals.passages, 0, 0]); assert.equal(k.report.ok, true); assert.deepEqual(k.report.findings.filter((x) => x.level === 'error'), []); }
  let n = 0; for (const p of k.C.passages.values()) { n++; assert.match(p.id, /^or27-[123]:[^#]+#[0-9a-f]{8}/); assert.ok(p.text.length > 0 && p.sb[0] === 0 && p.pg.length > 0 && p.pg.every((e) => Number.isInteger(e[1]) && Number.isInteger(e[2]) && Number.isInteger(e[3])), `${p.id}: a printed page, a scan leaf and a reader index`); }
  assert.equal(n, MAN.totals.passages);
  const fetched = []; const fn = async (rel) => { fetched.push(rel); return JSON.parse(fs.readFileSync(path.join(k.hx, rel), 'utf8')); };
  const kb = await openKB(fn, {});
  assert.deepEqual(fetched.filter((r) => /\/or27\//.test(r)), [], 'opening the KB reads no corpus file');
  assert.ok(kb.hasCorpus('or27') && kb.corpusOf(c.base + 5).name === 'or27' && kb.corpusOf(5) === null);
  await kb.scorePassages(['chamberlain'], true); assert.equal(fetched.filter((r) => /\/or27\/files\./.test(r)).length, 1, 'the file list is fetched by the first request that reaches into the corpus');
  await kb.scorePassages(['bayonet'], true); assert.equal(fetched.filter((r) => /\/or27\/files\./.test(r)).length, 1, 'and only once');
  fetched.length = 0; await kb.scorePassages(['bayonet'], false); assert.deepEqual(fetched.filter((r) => /\/or27\//.test(r)), [], 'a request that does not ask for the corpus never reads it');
});

for (const [which, floor, minItems] of [['A', 0.9, 60], ['H', 0.85, 24]]) {
  test(`OR-10${which === 'A' ? 'a' : 'b'} golden set ${which}: ${which === 'A' ? 'questions verified against the text, written before the engine ran on them (in-sample after the fixes)' : 'questions written after the engine was final, run once (held out)'}: pass rate >= ${100 * floor}%, no quote breaks the invariants (words at their offsets, hash, printed page, scan leaf), a question recorded as passing still passes`, { skip: need, timeout: 600000 }, async () => {
    const k = await or27(); const g = loadGolden(which); assert.ok(g.items.length >= minItems, `${g.items.length} questions`);
    const rows = await runGolden(k.fresh(), g.items, k.C); const s = summarize(rows);
    console.log(`   OR golden ${which}: ${s.pass}/${s.n} (${(100 * s.pass / s.n).toFixed(1)}%) ${Object.entries(s.by).map(([a, v]) => `${a} ${v.pass}/${v.n}`).join(', ')}`);
    for (const r of rows.filter((x) => !x.pass)) console.log(`   FAIL ${r.id} ${r.q}: ${r.reasons.join(' | ')}`);
    assert.ok(s.pass / s.n >= floor, `${s.pass}/${s.n}`);
    assert.deepEqual(rows.filter((r) => r.reasons.some((x) => /^Q[123]/.test(x))).map((r) => [r.id, r.reasons.filter((x) => /^Q[123]/.test(x))]), [], 'every quote of every answer holds Q1-Q3');
    const rec = J('tests/historian/fixtures/golden-or27.recorded.json')[which];
    assert.deepEqual(Object.keys(rec).sort(), g.items.map((i) => i.id).sort(), 'the recorded result covers every question');
    assert.deepEqual(rows.filter((r) => !r.pass && rec[r.id] === 'pass').map((r) => r.id), [], 'a question that passed when the result was recorded fails now');
    // the evidence of every question is in the corpus at the page the question says, and its words are in the passage
    for (const it of g.items) for (const e of it.evidence) {
      const p = k.C.passages.get(e.passage); assert.ok(p, `${it.id}: evidence passage ${e.passage}`);
      assert.ok(nf(p.text).includes(nf(e.text)), `${it.id}: the evidence sentence is in its passage`);
      if (e.pages_ok && e.pages_ok.length) { const sp = pageSpan(p.pg, e.s, e.e, p.ia); assert.ok(e.pages_ok.map(String).includes(String(sp.pages).split('–')[0]), `${it.id}: printed page ${sp.pages}`); }
    }
  });
}

test('OR-11 first paint: the T1 files are byte-identical to the site\'s own build, the manifest grows by under 2 KB, and a site question fetches the same files as without the corpus (a corpus file only for a question that asks for a report)', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const baseDir = path.join(ROOT, 'historian-src/dist/hx'); const base = J('historian-src/dist/hx/manifest.json');
  for (const t of ['entity', 'entix', 'facts', 'lexicon']) assert.equal(k.man.tiers[t].path, base.tiers[t].path, `${t} is the same file`);
  const grown = fs.statSync(path.join(k.hx, 'manifest.json')).size - fs.statSync(path.join(baseDir, 'manifest.json')).size;
  console.log(`   manifest grows by ${grown} bytes; T1 files identical`); assert.ok(grown > 0 && grown < 2048, `${grown}`);
  const cost = async (dir, q) => { const seen = []; const kb = await openKB(async (rel) => { seen.push(rel); return JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8')); }, {}); await createEngine(kb).ask(q); return seen.filter((r) => !/^manifest|^f\/(entity|entix|facts|lexicon)\./.test(r)); };
  for (const q of ['20th Maine', 'who commanded the Iron Brigade?', 'what happened at the Peach Orchard', 'where was the 24th Michigan on July 1']) {
    const a = await cost(baseDir, q), b = await cost(k.hx, q);
    assert.deepEqual(b.filter((r) => /\/or27\//.test(r)), [], `${q}: no corpus file`); assert.deepEqual(b, a, `${q}: the same files`);
  }
  const rep = await cost(k.hx, 'what did Chamberlain report'); assert.ok(rep.some((r) => /\/or27\//.test(r)), 'a question for a report does read the corpus');
});

test('OR-12 additive: over the 274 questions of the three site batteries and the 150 of the golden core, the answer is the same with and without the corpus, except where the question asks for what someone wrote or reported (at most 1.5%)', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const base = createEngine(await openKB(await nodeFetcher(path.join(ROOT, 'historian-src/dist/hx')), { cache: 512 })); const withC = k.fresh();
  const bat = [...(await import('./batteries/primary.mjs')).default, ...(await import('./batteries/heldout.mjs')).default, ...(await import('./batteries/fresh.mjs')).default].map((x) => x.q);
  const gold = J('docs/plan/data/hist-golden-set.json'); const gq = (gold.questions || gold.items || []).map((x) => x.question || x.q).filter(Boolean);
  const Q = [...new Set([...bat, ...gq])]; assert.ok(bat.length >= 274 && gq.length >= 150, `${bat.length} + ${gq.length}`);
  const diff = [];
  for (const q of Q) { const a = await base.ask(q), b = await withC.ask(q); if (a.text !== b.text || a.mode !== b.mode) diff.push(q); }
  console.log(`   ${Q.length} questions, ${diff.length} answers differ: ${JSON.stringify(diff)}`);
  assert.ok(diff.length <= Math.ceil(0.015 * Q.length), `${diff.length} answers differ`);
  for (const q of diff) assert.match(q, /\b(?:report|wrote|write|dispatch|telegraph|own words)\b/i, `a differing answer must be to a question about what someone wrote or reported: ${q}`);
});

test('OR-13 whom a dispatch is from and to: a surname that ends in s is found (the index and the question stem it alike), a sender whose title sits on the line under his name is found, and the quote of the first page of Part 3 carries its page 3 and its scan', { skip: need, timeout: 600000 }, async () => {
  const k = await or27(); const eng = k.fresh();
  const ask = async (q) => { const a = await eng.ask(q); const qs = (a.blocks || []).filter((b) => b.t === 'quote'); for (const b of qs) assert.deepEqual(quoteProblems(b, k.C), [], `${q}: ${b.passage}`); return { a, qs }; };
  let r = await ask('What did Pleasonton write to Williams on June 3?');
  assert.equal(r.a.intent, 'report-of'); assert.ok(r.qs.length >= 1 && r.qs.every((b) => b.passage.startsWith('or27-3:p0003.1#')), r.qs.map((b) => b.passage).join()); assert.equal(r.qs[0].page, '3'); assert.match(r.qs[0].scan, /^https:\/\/archive\.org\/details\/warofrebellion273unit\/page\/n8\/mode\/1up$/);
  assert.match(r.a.text, /wrote a dispatch dated June 3, 1863/);
  r = await ask('what did Humphreys write to Howard on July 12');
  assert.ok(r.qs.length >= 1 && r.qs.every((b) => b.passage.startsWith('or27-3:p0664.2#')), r.qs.map((b) => b.passage).join());
  r = await ask('what did Sykes write to Meade on July 6');
  // refinement with the engine fix (c): none of his dispatches of July 6 is addressed to Meade (all three went to Howard), which the answer now says, and it shows them, the one that names Meade among them.
  // R1e-ACC (2026-10-22): a day asked of a sender shows up to four dispatches (it showed two), so all three of the day are quoted, in the order of the volume; the one that names Meade is no longer first by being one of two.
  assert.ok(r.qs.length === 3 && r.qs.some((b) => b.passage.startsWith('or27-3:p0560.3#')) && r.qs.length >= 1 && r.qs.every((b) => /^or27-3:p05[56]\d\.\d#/.test(b.passage)), r.qs.map((b) => b.passage).join());
  assert.match(r.a.text, /None of .*Sykes.* dispatches of July 6 is addressed to “Meade”; the 3 he wrote that day went to General Howard/);
  r = await ask('what did Pleasonton write to Williams on June 4');
  // the wording changed with the engine fix (c): the answer says what was searched, not only that nothing was found
  assert.equal(r.qs.length, 0); assert.match(r.a.text, /did not find a dispatch or letter from .*Pleasonton to Williams dated June 4, 1863/, 'a day he wrote none to him is said, not answered with another day'); assert.match(r.a.text, /What I searched: the \d+ passages? of dispatches/);
});
