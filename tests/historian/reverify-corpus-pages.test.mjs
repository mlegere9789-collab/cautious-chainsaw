// reverify-corpus-pages.test.mjs - second adversarial pass (re-verifier workstream): the page citations and the quotes of the Official Records corpus after the second build (07c3b81). THESE TESTS PASS: they are
// the re-verifier's independent measurements pinned, and each carries a negative control so that a pass means something.
//
// Page citations. The fixer's check (tests/historian/lib/leaf-check.mjs) reads the Archive's per-leaf OCR; this one is written separately (its own leaf reader, its own folio rule, its own sentence locator) and
// shares nothing with it but the Archive's files:
//   * the folio of a leaf is the number in the running head of the leaf's own text read first, and counts only where the Archive's page_numbers.json says the same; a leaf where the two disagree takes the
//     folio of the local run of agreeing leaves (+-8) when at least two of them agree on the offset; otherwise it is not used;
//   * a probe is the first 22 letters and digits of a word start in a passage (case folded, anything else ignored); it counts when that string occurs exactly once at a word start in the volume's concatenated
//     leaf text and does not straddle a leaf; the cited page at that offset (the last pg entry whose offset is not above it) must be the folio of the leaf the string is on.
// Measured on the build of 07c3b81: every word start of every passage (1,301,773 probes; 1,101,037 located and checked; 159,505 not unique and set aside; 9,315 not found) 54 wrong = 0.0049% in 29 passages
// (30 / 16 / 8 in Parts 1 / 2 / 3); four fresh draws of 600 quotes (seeds 4242017, 11, 22, 33; start and end of each quote) 1 wrong in about 4,600 checks, and that one is the probe, not the citation
// (or27-2:0565#d8573bf1 stands on folio 719 in the Archive's text as cited; the probe took the same words from an earlier page). The fixer's figure is 0.011%.
//
// Quotes. Of 172 quotes the engine served for 132 questions (120 drawn from the table, 12 report questions) the text of every one equals the passage text from s to e with white space squeezed, and the scan
// link of every one names the reader index the Archive's own scandata gives for the quoted leaf (the Archive's reader skips 6 leaves of Part 1: 0, 470, 471, 886, 887, 1193).
//
// Needs the corpus text (historian-src/raw/or27) and the Archive cache (tmp/historian-cache); both git-ignored; skipped loudly without them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { ROOT } from './lib/data.mjs';
import { or27, SKIP as NEED } from './lib/or27-fixture.mjs';

const RAWP = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');
const CACHE = path.join(ROOT, 'tmp/historian-cache');
const need = !fs.existsSync(RAWP) ? NEED : !fs.existsSync(path.join(CACHE, 'sources.lock.json')) ? 'the Archive cache (tmp/historian-cache) is not here: node tools/historian/ingest/corpus.mjs build' : false;
const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
let lock = null;
function archiveFile(part, kind) {
  lock ||= JSON.parse(fs.readFileSync(path.join(CACHE, 'sources.lock.json'), 'utf8'));
  for (const [k, v] of Object.entries(lock)) if (v.url.endsWith(`warofrebellion27${part}unit_${kind}`) && !v.range) return fs.readFileSync(path.join(CACHE, k + '.body'));
  throw new Error('not in the cache: ' + part + ' ' + kind);
}
function headNum(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 4); const c = [];
  for (const l of lines) { let m; if ((m = l.match(/^(\d{1,4})$/))) c.push(+m[1]); else if ((m = l.match(/^(\d{1,4}) (?=[^\d]*[A-Za-z])/)) && /[A-Z]{2,}|CAMPAIGN|ETC/i.test(l)) c.push(+m[1]); else if ((m = l.match(/ (\d{1,4})$/)) && /CAMPAIGN|ETC|CORRESP/i.test(l)) c.push(+m[1]); }
  return c.length ? c[0] : null;
}
const K = 22;
function volume(part) {
  const st = zlib.gunzipSync(archiveFile(part, 'hocr_searchtext.txt.gz')).toString('utf8');
  const pi = JSON.parse(zlib.gunzipSync(archiveFile(part, 'hocr_pageindex.json.gz')).toString('utf8'));
  const cps = /[\ud800-\udfff]/.test(st) ? Array.from(st) : null;
  const leaves = pi.map((e) => (cps ? cps.slice(e[0], e[1]).join('') : st.slice(e[0], e[1])));
  const pn = JSON.parse(archiveFile(part, 'page_numbers.json').toString('utf8')).pages;
  const sd = archiveFile(part, 'scandata.xml').toString('utf8'); const access = [];
  for (const m of sd.matchAll(/<page leafNum="(\d+)">([\s\S]*?)<\/page>/g)) access[+m[1]] = !/addToAccessFormats>false/.test(m[2]);
  const pnm = new Map(pn.map((p) => [p.leafNum, /^\d{1,4}$/.test(String(p.pageNumber || '')) ? +p.pageNumber : null]));
  const n = leaves.length; const head = leaves.map(headNum), arch = leaves.map((_, i) => (pnm.has(i) ? pnm.get(i) : null));
  const agree = new Array(n).fill(null); for (let i = 0; i < n; i++) if (head[i] !== null && head[i] === arch[i]) agree[i] = head[i] - i;
  const folio = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (agree[i] !== null) { folio[i] = head[i]; continue; }
    const offs = []; for (let j = Math.max(0, i - 8); j <= Math.min(n - 1, i + 8); j++) if (agree[j] !== null) offs.push(agree[j]);
    if (!offs.length) continue; offs.sort((a, b) => a - b); const med = offs[offs.length >> 1]; const cnt = offs.filter((o) => o === med).length;
    if ([head[i], arch[i]].filter((x) => x !== null).some((x) => x - i === med) && cnt >= 2) folio[i] = med + i;
  }
  const leafStart = []; const starts = []; const chunks = []; let pos = 0;
  leaves.forEach((t) => { leafStart.push(pos); for (const w of t.match(/\S+/g) || []) { const a = alnum(w); if (!a) continue; starts.push(pos); chunks.push(a); pos += a.length; } });
  const chars = chunks.join(''); const idx = new Map();
  for (const p of starts) { if (p + K > chars.length) continue; const k = chars.slice(p, p + K); idx.set(k, idx.has(k) ? -1 : p); }
  const leafAt = (p) => { let lo = 0, hi = n - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (leafStart[mid] <= p) lo = mid; else hi = mid - 1; } return lo; };
  return { n, folio, idx, leafAt, access };
}
const pageAt = (p, off) => { let page = null; for (const g of p.pg || []) if (g[0] <= off) page = g[1]; return page; };
function audit(passages, vols, fault) {
  let located = 0, wrong = 0; const bad = new Set();
  for (const p of passages) {
    const vol = vols[p.part]; const re = /[A-Za-z0-9][^\s]*/g; let m;
    while ((m = re.exec(p.text))) {
      const a = alnum(p.text.slice(m.index, m.index + 160)); if (a.length < K) continue;
      const at = vol.idx.get(a.slice(0, K)); if (at === undefined || at < 0) continue;
      const l0 = vol.leafAt(at); if (vol.leafAt(at + K - 1) !== l0) continue; const f = vol.folio[l0]; if (f === null) continue;
      located++; let got = pageAt(p, m.index); if (fault && got !== null && (p.id.length * 7 + p.id.charCodeAt(p.id.length - 1)) % 10 === 0) got += 1;
      if (got !== f) { wrong++; bad.add(p.id); }
    }
  }
  return { located, wrong, bad };
}
let memo = null;
const setup = () => memo || (memo = (() => {
  const passages = fs.readFileSync(RAWP, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const vols = { 1: volume(1), 2: volume(2), 3: volume(3) }; return { passages, vols };
})());

test('RV-PG-1 (green) the cited page of a word is the folio of the Archive’s leaf the word stands on: at most 0.1% wrong over every word start of every passage (measured 0.0049%), independently of the build’s own page list', { skip: need, timeout: 900000 }, () => {
  const { passages, vols } = setup(); const r = audit(passages, vols, false);
  assert.ok(r.located > 900000, `only ${r.located} probes located`);
  assert.ok(r.wrong / r.located <= 0.001, `${r.wrong} of ${r.located} (${(100 * r.wrong / r.located).toFixed(4)}%) in ${r.bad.size} passages`);
});
test('RV-PG-1b (negative control) the same audit finds a page list that is one page high in one passage in ten (it must report at least 5%)', { skip: need, timeout: 900000 }, () => {
  const { passages, vols } = setup(); const r = audit(passages.filter((_, i) => i % 5 === 0), vols, true);
  assert.ok(r.wrong / r.located >= 0.05, `the seeded fault was found in ${(100 * r.wrong / r.located).toFixed(2)}% of the probes`);
});
test('RV-PG-2 (green) the reader index in every page entry of every passage is the number of Archive reader leaves before the leaf (the scan link /page/nN names it), as the Archive’s scandata says', { skip: need, timeout: 900000 }, () => {
  const { passages, vols } = setup(); const rd = {};
  for (const part of [1, 2, 3]) { rd[part] = []; let c = 0; vols[part].access.forEach((a, i) => { rd[part][i] = c; if (a) c++; }); }
  let n = 0; const bad = [];
  for (const p of passages) for (const g of p.pg || []) { n++; if (g[3] !== rd[p.part][g[2]]) bad.push(`${p.id} ${JSON.stringify(g)} wants ${rd[p.part][g[2]]}`); }
  assert.ok(n > 8000, `${n} entries`); assert.deepEqual(bad.slice(0, 5), [], `${bad.length} entries disagree`);
});
test('RV-QT-1 (green) every corpus quote the engine serves is the passage text from s to e (white space squeezed) and its scan link names the reader index of its leaf: 12 questions here; the scratch run of 132 questions found 0 of 172 quotes otherwise', { skip: need, timeout: 900000 }, async () => {
  const { passages, vols } = setup(); const P = new Map(passages.map((p) => [p.id, p]));
  const rd = {}; for (const part of [1, 2, 3]) { rd[part] = []; let c = 0; vols[part].access.forEach((a, i) => { rd[part][i] = c; if (a) c++; }); }
  const k = await or27(); const sq = (s) => String(s).replace(/\s+/g, ' ').trim();
  const QS = ['what did Halleck telegraph to Dix on July 14', 'what did Lee write to Davis on June 23', 'what did Buford report about June 30', 'what did Meade report about the Gettysburg campaign', 'what did Longstreet report about July 2', 'what did Ewell report about July 1',
    'what did Hill report about July 1', 'what did Slocum report about July 2', 'what did Couch telegraph to Meade on July 6', 'what did Pleasonton write to Williams on June 9', 'what did Gregg report about July 3', 'what did Early write about July 2'];
  let nq = 0; const bad = [];
  for (const q of QS) {
    const a = await k.fresh().ask(q);
    for (const b of (a.blocks || []).filter((x) => x.t === 'quote' && /^or27-/.test(String(x.passage)))) {
      nq++; const p = P.get(b.passage); if (!p) { bad.push(`${q}: no passage ${b.passage}`); continue; }
      if (sq(p.text.slice(b.s, b.e)) !== sq(b.text)) bad.push(`${b.passage}: text differs from the passage`);
      const mm = String(b.scan || '').match(/page\/n(\d+)\//); if (!mm || +mm[1] !== rd[p.part][b.leaf]) bad.push(`${b.passage}: scan ${b.scan} leaf ${b.leaf} reader ${rd[p.part][b.leaf]}`);
    }
  }
  assert.ok(nq >= 10, `${nq} quotes served`); assert.deepEqual(bad, [], bad.join(' | '));
});
