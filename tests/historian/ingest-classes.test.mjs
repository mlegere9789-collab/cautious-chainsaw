// ingest-classes.test.mjs - class sweeps for the Official Records ingest defects the re-verifier found (R-01 .. R-03, R-17): running heads and signature marks in every OCR spelling, table cells taken out of a
// chunk without taking the prose with them (measured against a HAND-CHECKED sample of 60 chunks committed as a fixture), and the rights gate on every redirect hop and every spelling of a refused
// identifier or banned host. The OR27 text itself is a git-ignored 2 MB cache: the tests that need it SKIP LOUDLY when it is absent (never pass vacuously); everything else runs from fixtures and generators.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './lib/data.mjs';
import { stripRunningHeads, stripInline, countRunningHeads, ingestOr27, isTableDebris, stripTableCells, tableRegions, narrativeWords, textWords, chunkDocument, normalizeOcr, segmentReports, parseToc } from '../../tools/historian/ingest/or27.mjs';
import { headSpans, stripHeads, countHeads } from '../../tools/historian/ingest/heads.mjs';
import { createFetcher, RightsRefusal, sourceForUrl } from '../../tools/historian/ingest/fetch.mjs';
import { loadSources, fetchAllowed } from '../../tools/historian/lib/sources.mjs';

const OR27_CACHE = path.join(ROOT, 'tmp/historian-cache/f11f20ae12aa762c081bfa37941181caf600c8a5.body');
const HAVE_CACHE = fs.existsSync(OR27_CACHE);
const SKIP = HAVE_CACHE ? false : 'the cached OR27 sample is absent (tmp/historian-cache; fetch it with: node tools/historian/ingest/cli.mjs segment or27-1 --sample). This test did NOT run.';
if (!HAVE_CACHE) console.log(`# SKIPPED, not passed: ${SKIP}`);

// ---- running heads: a generator of OCR spellings ---------------------------------------------------------------------------------------------------------------------------------------------
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const CONFUSE = { C: 'GOE', H: 'IBN', A: 'AO4', P: 'FR', T: 'IJ1', G: 'CUO', E: 'FBR', S: 'ZE5', B: 'RE', R: 'BKH', M: 'NH', I: 'L1J', L: 'I1', X: 'K', V: 'YU', O: '0Q', N: 'HM' };
/** k OCR-like edits of a head: a letter read as a look-alike, a stray mark, a lost letter, a word split in two, a bracket turned into j / f / 1 */
function corrupt(s, k, r) {
  let t = s;
  for (let n = 0; n < k; n++) {
    const letters = [...t].map((c, i) => [c, i]).filter(([c]) => /[A-Za-z]/.test(c)); if (!letters.length) break;
    const [c, i] = letters[Math.floor(r() * letters.length)];
    const kind = Math.floor(r() * 5);
    if (kind === 0 && CONFUSE[c.toUpperCase()]) { const opts = CONFUSE[c.toUpperCase()]; const sub = opts[Math.floor(r() * opts.length)]; t = t.slice(0, i) + (c === c.toLowerCase() ? sub.toLowerCase() : sub) + t.slice(i + 1); }
    else if (kind === 1) t = t.slice(0, i) + ['-', '!', '.', '*', "'", ',', '"'][Math.floor(r() * 7)] + t.slice(i);
    else if (kind === 2 && letters.length > 6) t = t.slice(0, i) + t.slice(i + 1);
    else if (kind === 3 && i > 0 && /[A-Za-z]/.test(t[i - 1])) t = t.slice(0, i) + ' ' + t.slice(i);
    else t = t.replace(/[\]\.](?=\s|$)/, ['j', 'f', '1', ')', '|'][Math.floor(r() * 5)]);
  }
  return t;
}
const HEADS = [
  { s: 'Chap. XXXIX.]', kind: 'chap' }, { s: 'CHAP. XXXIX.]', kind: 'chap' }, { s: '[Chap. XXXIX.', kind: 'chap' }, { s: 'THE GETTYSBURG CAMPAIGN.', kind: 'title' }, { s: 'Chap. XXXIX.] THE GETTYSBURG CAMPAIGN.', kind: 'both' },
  { s: '2 R R - VOL XXVII, PT I', kind: 'sig' }, { s: '14 R R— VOL XXVII, PT I', kind: 'sig' }, { s: '31 R R — VOL XXVII, PT I', kind: 'sig' }, { s: '5 R R - VOL XXVII, PT II', kind: 'sig' },
];
const BODY = ['The regiment held its ground until relieved by the brigade on the left.', 'About 4 p. m. the enemy advanced in force upon our line, and we fell back.', 'Colonel Smith, commanding, reported a loss of 21 killed and 90 wounded.'];
const markOf = (s) => /GETTY|CAMPAIGN|CHAP|HAP|VOL|XXXI|XXVI/i.test(s);
const bodyIntact = (out, body) => body.split(/\s+/).every((w) => out.includes(w));

test('running heads are removed in every OCR spelling within two edits, as a whole line, at the start of a body line and at its end (R-02 probed the spellings that happened to be in the sample)', () => {
  const r = rng(27); const stats = {}; const fails = [];
  for (const k of [0, 1, 2]) for (const h of HEADS) for (let rep = 0; rep < (k === 0 ? 1 : 25); rep++) {
    const head = corrupt(h.s, k, r); const body = BODY[rep % BODY.length];
    for (const [where, line] of [['whole line', head], ['line start', `${head} ${body}`], ['line end', `${body} ${head}`]]) {
      const text = ['Previous page ends here.', '', line, '', 'Next page starts here.'].join('\n');
      const out = stripRunningHeads(text).text;
      const left = out.split('\n').some((l) => countHeads(l) > 0 || markOf(l.replace(/Previous page ends here\.|Next page starts here\./g, '')));
      const key = `k=${k}`; stats[key] = stats[key] || { n: 0, ok: 0 }; stats[key].n++;
      const bodyOk = where === 'whole line' || bodyIntact(out, body);
      if (!left && bodyOk) stats[key].ok++; else fails.push(`${where} k=${k}: ${JSON.stringify(line)} -> ${JSON.stringify(out.split('\n').filter((l) => l.trim() && !/Previous page|Next page/.test(l)).join(' | '))}`);
    }
  }
  const rate = (k) => stats[`k=${k}`].ok / stats[`k=${k}`].n;
  console.log(`# running-head removal: 0 edits ${(100 * rate(0)).toFixed(1)}%  1 edit ${(100 * rate(1)).toFixed(1)}%  2 edits ${(100 * rate(2)).toFixed(1)}%; misses: ${fails.slice(0, 6).join(' || ')}`);
  assert.equal(rate(0), 1, 'the canonical heads'); assert.ok(rate(1) >= 0.97, `1 edit ${rate(1)}: ${fails.slice(0, 5).join(' || ')}`); assert.ok(rate(2) >= 0.9, `2 edits ${rate(2)}: ${fails.slice(0, 5).join(' || ')}`);
});

test('the head counter is honest: a head the stripper leaves is counted, for every spelling of up to three edits (the stripper and the counter are different detectors)', () => {
  const r = rng(7); let left = 0, counted = 0; const missed = [];
  for (const k of [1, 2, 3]) for (const h of HEADS) for (let rep = 0; rep < 40; rep++) {
    const head = corrupt(h.s, k, r); const text = ['Body text of the page.', '', head, '', 'More body text.'].join('\n');
    const out = stripRunningHeads(text).text;
    const stillThere = out.split('\n').filter((l) => !/Body text of the page|More body text/.test(l) && l.trim());
    if (!stillThere.length) continue;                                  // fully removed
    left++; if (countRunningHeads(out) > 0) counted++; else missed.push(JSON.stringify(head));
  }
  console.log(`# heads left by the stripper over 1-3 edits: ${left}; counted by the counter: ${counted}${missed.length ? '; uncounted: ' + missed.slice(0, 5).join(' ') : ''}`);
  assert.ok(counted === left, `${left - counted} heads left in the text and not counted: ${missed.slice(0, 6).join(' ')}`);
});

test('body text that mentions the campaign, a chapter or a volume is never cut: references to other volumes, "the Gettysburg Campaign" in mixed case, "Chapter XXXIX" spelled out, a quantity after a head', () => {
  const BODY_LINES = ['during the Gettysburg Campaign, June 3-August 1, 1863.', 'For orders, etc., in relation to, see Series I, Vol. XVIII, pp. 711, 712, 717, 718.', '*See Series I, Vol. XXV, Part II, p. 12.', 'See Davis to Beauregard, Series I, Vol. XXVIII, Part II.',
    'Chapter XXXIX of the report and the R R Co. of Vol. XXVII', 'He lost 20 men in the 27 Virginia; Chap. 5 follows', 'Army of the Potomac, Part I, June 28.', 'The Gettysburg Campaign was fought in July.', 'in the campaign of Gettysburg our loss was heavy',
    'Voluntary service in the Twenty-seventh Regiment, Part of the First Corps, I believe.', 'the volume of fire at part I of the line was heavy', 'chap that I am, said Colonel X, I reported at 4 p. m.'];
  for (const l of BODY_LINES) { assert.equal(headSpans(l, 1).length, 0, l); assert.equal(stripRunningHeads(['a', l, 'b'].join('\n')).text.includes(l.split(' ').slice(0, 4).join(' ')), true, l); }
  const q = stripHeads('Chap. XXXIX.] 12 killed and wounded', 1); assert.equal(q.page, null); assert.ok(/12 killed and wounded/.test(q.text));
  assert.equal(stripInline('during the Gettysburg Campaign, June 3-August 1, 1863.').changed, false);
});

// ---- tables ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const FIX = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/historian/fixtures/or27-chunks.json'), 'utf8'));
const paras = (t) => t.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);

test('table filter vs a HAND-CHECKED sample of 60 chunks: no chunk with prose, a footnote or a list of names is dropped (false drops 0), prose chunks are untouched, cleaned chunks keep what they must and hold no table', () => {
  assert.equal(FIX.chunks.length, 60); assert.deepEqual(FIX.labels, { table: 32, mixed: 16, prose: 12 });
  const falseDrops = [], changed = [], lost = [], residual = []; let tableDropped = 0; const keptTables = [];
  for (const c of FIX.chunks) {
    const drop = isTableDebris(c.text); const r = stripTableCells(c.text);
    if (c.label === 'table') { if (drop) tableDropped++; else keptTables.push(c.id); continue; }
    if (drop) { falseDrops.push(c.id); continue; }
    if (c.label === 'prose' && r.text !== paras(c.text).join('\n\n')) changed.push(c.id);
    if (c.label === 'mixed') { if (!r.text.includes(c.keep)) lost.push(`${c.id}: ${c.keep}`); if (tableRegions(paras(r.text)).length) residual.push(c.id); }
  }
  const recall = tableDropped / FIX.labels.table;
  console.log(`# table filter on the hand-checked sample: false drops ${falseDrops.length} of ${FIX.labels.mixed + FIX.labels.prose}; table chunks dropped ${tableDropped} of ${FIX.labels.table} (${(100 * recall).toFixed(0)}%); kept although they are only a table: ${keptTables.join(' ')}`);
  assert.deepEqual(falseDrops, [], 'a chunk with prose, a footnote or a list of names was dropped'); assert.deepEqual(changed, [], 'a prose chunk was altered'); assert.deepEqual(lost, [], 'the text a mixed chunk must keep was cut'); assert.deepEqual(residual, [], 'a cleaned chunk still holds a table');
  assert.ok(recall >= 0.7, `only ${tableDropped} of ${FIX.labels.table} table chunks dropped`);
});

test('table regions: numeric cells and row labels go, prose between two tables stays, a short list of names and a signature block are not tables', () => {
  const cells = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? String(i * 17) : i % 3 === 1 ? 'a' : '2,296 1,540 1 1,013 96'));
  const T = (extra) => [...cells, ...extra, ...cells].join('\n\n');
  assert.equal(stripTableCells(cells.join('\n\n')).text, '', 'a table alone leaves nothing');
  const between = stripTableCells(T(['The regiment then moved to the left, where it formed line of battle and remained until dark.'])); assert.match(between.text, /^The regiment then moved to the left/); assert.equal(between.regions, 2);
  const labelled = stripTableCells(['Col. John R. Brooke.', '27th Connecticut', '2d Delaware', '64th New York', ...cells].join('\n\n')); assert.equal(labelled.text, '');
  const list = ['Capt. Smith,', 'Lieut. Jones,', 'Lieut. Brown,', 'Maj. Gray,', 'Capt. White,', 'Capt. Black,', 'Lieut. Green.'].join('\n\n'); assert.equal(stripTableCells(list).regions, 0);
  const sig = ['I have the honor to be, very respectfully, your obedient servant,', 'JOHN SMITH,', 'Colonel, Commanding.', 'Capt. A. B. CLARK,', 'Assistant Adjutant-General.'].join('\n\n'); assert.equal(stripTableCells(sig).regions, 0);
  assert.equal(isTableDebris(cells.join('\n\n')), true); assert.equal(isTableDebris('A paragraph of ordinary prose about the march of the corps to Gettysburg.\n\n'.repeat(30)), false);
  assert.equal(isTableDebris([...cells, 'The corps marched at dawn along the pike toward Gettysburg, where it went into position on the left of the line.'].join('\n\n')), false, 'one real sentence keeps the chunk');
  assert.ok(narrativeWords(paras('Respectfully submitted, the regiment went into action with 400 men and lost 120 killed, wounded, and missing.')) >= 15); assert.equal(textWords(['No. 15.', 'General Return of Casualties in the Union forces during the Gettysburg Campaign, June 3-August 1, 1863.']), 0, 'a table title is not text');
});

test('the real sample: table cells are taken out with the prose kept, nothing that is narrative is dropped, no head is left in a passage, and the report says what was done', { skip: SKIP }, () => {
  const r = ingestOr27(fs.readFileSync(OR27_CACHE, 'utf8'), { repair: true }); const rep = r.report;
  assert.equal(rep.running_heads_left, 0); assert.equal(rep.running_heads_left_passages, 0);
  assert.ok(rep.table_chunks_cleaned >= 30 && rep.table_paragraphs_removed >= 1000, `cleaned ${rep.table_chunks_cleaned}, cells ${rep.table_paragraphs_removed}`);
  assert.ok(rep.table_debris_dropped.length >= 10 && rep.table_debris_dropped.length < 0.03 * (r.passages.length + rep.table_debris_dropped.length), `${rep.table_debris_dropped.length} dropped`);
  assert.ok(rep.table_debris_text_words < 400, `${rep.table_debris_text_words} words of text were in the dropped chunks`); assert.ok(typeof rep.low_value_kept === 'number');
  assert.ok(rep.docs_with_pages === rep.docs && r.passages.every((p) => p.pages.start !== null));
  for (const p of r.passages) assert.equal(countRunningHeads(p.text), 0, p.id);
  // the fixture's chunks come from this very sample: their ids exist among its raw chunks
  const norm = normalizeOcr(fs.readFileSync(OR27_CACHE, 'utf8'), { repair: true }); const seg = segmentReports(norm, parseToc(norm.text));
  const pageAt = (off) => { let p = null; for (const x of norm.pages) { if (x.offset <= off) p = x.page; else break; } return p; };
  const raw = seg.docs.flatMap((d) => chunkDocument(d, { pageAt })); const ids = new Set(raw.map((p) => p.id)); const starts = new Set(raw.map((p) => p.text.slice(0, 50)));
  for (const c of FIX.chunks) assert.ok(ids.has(c.id) || starts.has(c.text.slice(0, 50)), `fixture chunk ${c.id} is not in the sample (the pipeline changed: regenerate the fixture)`);
});

// ---- the rights gate -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const REG = loadSources();
const OR27 = 'https://archive.org/download/warofrebellion271unit/warofrebellion271unit_djvu.txt';
const enc = (s, n) => { let x = s; for (let i = 0; i < n; i++) x = encodeURIComponent(x); return x; };
const fullwidth = (s) => [...s].map((c) => (/[a-z0-9]/.test(c) ? String.fromCodePoint(c.charCodeAt(0) + 0xFEE0) : c)).join('');

test('the fetch gate refuses a refused identifier and a banned host in every spelling: case, trailing dot, user-info, port, percent-encoding to any depth, wrapper URLs, compatibility forms (R-17 probed double encoding)', () => {
  const ids = REG.refused_identifiers; assert.ok(ids.length >= 1);
  const hosts = REG.banned_hosts; assert.ok(hosts.length >= 20);
  const bad = [];
  for (const id of ids) for (const u of [`https://archive.org/download/${id}/x_djvu.txt`, `https://archive.org/download/${id.toUpperCase()}/x`, `https://archive.org/download/${enc(id, 1)}/x`, `https://archive.org/download/${enc(id, 2)}/x`, `https://archive.org/download/${enc(id, 3)}/x`, `https://archive.org/details/${id}`,
    `https://archive.org/download/${id[0].toUpperCase()}${id.slice(1)}/x`, `https://archive.org/download/${[...id].map((c, i) => (i % 3 === 0 ? '%' + c.charCodeAt(0).toString(16) : c)).join('')}/x`, `https://example.org/?u=${enc('https://archive.org/download/' + id + '/x', 2)}`, `https://web.archive.org/web/2020/https://archive.org/download/${id}/x`, `https://archive.org/download/${fullwidth(id)}/x`]) if (fetchAllowed(REG, u).ok) bad.push(u);
  for (const h of hosts) for (const u of [`https://${h}/x`, `https://${h}./x`, `https://${h.toUpperCase()}/x`, `https://www.${h}/x`, `https://user:pw@${h}/x`, `https://${h}:443/x`, `https://sub.${h}/x`, `http://${h}/x`, `https://web.archive.org/web/2020/https://${h}/x`, `https://example.org/?u=${enc('https://' + h + '/x', 1)}`, `https://example.org/?u=${enc('https://' + h + '/x', 2)}`, `https://example.org/?u=${enc('https://' + h + '/x', 3)}`]) if (fetchAllowed(REG, u).ok) bad.push(u);
  assert.deepEqual(bad.slice(0, 6), [], `${bad.length} spellings passed the gate`);
  for (const u of [OR27, 'https://archive.org/download/warofrebellion272unit/x', `https://example.org/?u=${enc('https://www.loc.gov/item/2003666161/', 2)}`, 'https://www.loc.gov/item/2003666161/']) assert.equal(fetchAllowed(REG, u).ok, true, u);
});

test('every redirect hop is judged by the gate that judged the first request: a banned host, a refused identifier (in any spelling) or an unregistered archive.org item on ANY hop is refused with no further request; a hop inside the source is followed', async () => {
  const H = (m) => ({ get: (k) => m[k.toLowerCase()] ?? null });
  const run = async (targets) => {
    const seen = []; const fetchImpl = async (url) => { seen.push(url); const t = targets.shift(); return t ? { status: 302, headers: H({ location: t }), arrayBuffer: async () => new ArrayBuffer(0) } : { status: 200, headers: H({}), arrayBuffer: async () => new TextEncoder().encode('body').buffer }; };
    const f = createFetcher({ cacheDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ic-f-')), fetchImpl, sleepImpl: async () => {}, now: (() => { let t = 0; return () => (t += 1e6); })() });
    try { const r = await f.get(OR27); return { ok: true, seen, body: r.body.toString() }; } catch (e) { return { ok: false, seen, error: e }; }
  };
  const refused = [...REG.banned_hosts.slice(0, 6).map((h) => `https://${h}/x`), ...REG.refused_identifiers.map((id) => `https://archive.org/download/${id}/x_djvu.txt`), ...REG.refused_identifiers.map((id) => `https://ia800000.us.archive.org/1/items/${id.toUpperCase()}/x`),
    'https://archive.org/download/someunregisteredbook99/x_djvu.txt', 'https://ia800000.us.archive.org/7/items/anotherunregisteredbook/x.txt', 'https://archive.org/details/unregistered-item', `https://archive.org/download/${enc(REG.refused_identifiers[0], 2)}/x`];
  const bad = [];
  for (const t of refused) { const r = await run([t]); if (r.ok || !(r.error instanceof RightsRefusal) || r.seen.length !== 1) bad.push(`${t} -> ${r.ok ? 'followed' : r.error.name} after ${r.seen.length} requests`); }
  // a bad target on the SECOND hop is refused too
  for (const t of ['https://battlefields.org/x', 'https://archive.org/download/unregisteredsecondhop/x']) { const r = await run(['https://ia800000.us.archive.org/1/items/warofrebellion271unit/x_djvu.txt', t]); if (r.ok || !(r.error instanceof RightsRefusal) || r.seen.length !== 2) bad.push(`second hop ${t} -> ${r.ok ? 'followed' : r.error.name} after ${r.seen.length}`); }
  assert.deepEqual(bad, []);
  const fine = await run(['https://ia800000.us.archive.org/1/items/warofrebellion271unit/warofrebellion271unit_djvu.txt', '/relative/path.txt']); assert.equal(fine.ok, true); assert.equal(fine.body, 'body'); assert.equal(fine.seen.length, 3);
  const other = await run(['https://archive.org/download/warofrebellion272unit/x_djvu.txt']); assert.equal(other.ok, true, 'another REGISTERED identifier is a legitimate hop');
  assert.equal(sourceForUrl(REG, 'https://ia800000.us.archive.org/12/items/warofrebellion271unit/x.txt').id, 'or27-1');
});
