// leaf-check.mjs - an INDEPENDENT re-derivation of the printed page of every sentence start of the Official Records corpus, from the Internet Archive's per-leaf OCR.
//
// Independent of the build in three ways (verifier finding HIGH 1: the builder's own invariants Q2/Q3 compare a quote with the corpus's own page list and cannot see a wrong page list):
//   * it reads no page list, no folio, no leaf number from the corpus: only the TEXT of each passage and the offset of each sentence start;
//   * it finds the sentence in the Archive's hOCR search text (hocr_searchtext + hocr_pageindex: the same OCR as the djvu text, but delivered LEAF BY LEAF) by its letters, not by position: the first 40
//     letters and digits of the sentence (case folded, spaces and punctuation ignored, so a hyphen or a blank the normaliser changed does not matter) are looked for at the start of a word in the volume's
//     text; a sentence counts only when they occur exactly once in the whole volume, and only when the other sentences of its passage are found on the same leaf or within a few leaves of it (a sentence
//     the volume prints twice, in a report and again in a dispatch, can match the other copy: such a sentence is set aside, counted, and not held against the corpus);
//   * the printed page of the leaf is read twice, from the leaf's own text (the number in its running head: first lines of the leaf) and from the Archive's page_numbers.json, and a leaf counts only when
//     the two agree (or the chain of folios of leaves whose two readings agree runs through it); the build uses the Archive's reading and the folio count, never the head.
// (The build, in tools/historian/ingest/leaves.mjs, places a passage's text on its leaf by counting non-whitespace characters; this places it by looking its letters up.)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ROOT } from './data.mjs';

export const CACHE = path.join(ROOT, 'tmp/historian-cache');
export const PASSAGES = path.join(ROOT, 'historian-src/raw/or27/passages.jsonl');

const lockOf = () => { const f = path.join(CACHE, 'sources.lock.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; };
/** the cached body of an Archive file of volume `part` (1..3): kind 'hocr_searchtext.txt.gz' | 'hocr_pageindex.json.gz' | 'page_numbers.json'; null when it was never fetched */
export function cachedFile(part, kind) {
  const lock = lockOf();
  for (const [k, v] of Object.entries(lock)) if (v.url.endsWith(`warofrebellion27${part}unit_${kind}`) && !v.range) { const f = path.join(CACHE, k + '.body'); if (fs.existsSync(f)) return fs.readFileSync(f); }
  return null;
}
export const haveLeafOcr = () => [1, 2, 3].every((p) => cachedFile(p, 'hocr_searchtext.txt.gz') && cachedFile(p, 'hocr_pageindex.json.gz') && cachedFile(p, 'page_numbers.json'));

const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** the printed folio a leaf's own text carries: a number of 1 to 4 digits at the start or end of one of its first three lines, next to the running head's words or alone; null when none is clean */
export function headFolio(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 3);
  const found = [];
  for (const l of lines) {
    let m = l.match(/^[^\w]{0,3}(\d{1,4})(?![\w\d])(.*)$/);
    if (m && (m[2].trim() === '' || /ETC|CAMPAIGN|CORRESP|Chap|VA\.|N\. ?[CO0]|\[/i.test(m[2]))) found.push(+m[1]);
    m = l.match(/^(.*?)[^\w]{0,3}(\d{1,4})[^\w]{0,3}$/);
    if (m && /ETC|CAMPAIGN|CORRESP|CONFEDERATE|UNION/i.test(m[1])) found.push(+m[2]);
  }
  return found.length ? found[0] : null;
}

/** the folio a leaf's own text prints in parentheses at its foot ("(3)"): the first page of a part prints no running head, only this */
export function footFolio(text) {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(-3);
  for (const l of lines.reverse()) { const m = l.match(/(?:^|\s)\((\d{1,4})\)\s*$/); if (m) return +m[1]; }
  return null;
}

/** one volume's leaves: { chars (the letters and digits of the whole volume), leafAt(pos), starts: word-start positions, folio: Map leaf -> { page, basis } (the leaf's checked printed page), stats } */
export function loadVolume(part) {
  const st = zlib.gunzipSync(cachedFile(part, 'hocr_searchtext.txt.gz')).toString('utf8');
  const pi = JSON.parse(zlib.gunzipSync(cachedFile(part, 'hocr_pageindex.json.gz')).toString('utf8'));
  const pn = JSON.parse(cachedFile(part, 'page_numbers.json').toString('utf8')).pages;
  const archive = new Map(pn.filter((p) => /^\d{1,4}$/.test(String(p.pageNumber || ''))).map((p) => [p.leafNum, +p.pageNumber]));
  const cps = /[\ud800-\udfff]/.test(st) ? Array.from(st) : null;
  const chunks = []; const starts = []; const leafStart = []; const folio = new Map(); let n = 0;
  const stats = { leaves: pi.length, agree: 0, head_only: 0, archive_only: 0, disagree: 0, neither: 0, chain: 0 };
  pi.forEach((e, leaf) => {
    const text = cps ? cps.slice(e[0], e[1]).join('') : st.slice(e[0], e[1]);
    leafStart.push(n);
    for (const w of text.match(/\S+/g) || []) { const a = alnum(w); if (!a) continue; starts.push(n); chunks.push(a); n += a.length; }
    const f = footFolio(text); const h = f !== null ? f : headFolio(text), a = archive.has(leaf) ? archive.get(leaf) : null;   // a printed "(N)" at the foot outranks a number read at the top (the first page of a part has no head: its top is the library stamp)
    if (h !== null && a !== null) { if (h === a) { folio.set(leaf, { page: a, basis: 'both' }); stats.agree++; } else stats.disagree++; }
    else if (a !== null) { folio.set(leaf, { page: a, basis: 'archive' }); stats.archive_only++; }
    else if (h !== null) { folio.set(leaf, { page: h, basis: 'head' }); stats.head_only++; }
    else stats.neither++;
  });
  // a leaf whose head and the Archive disagree (the head's digits are damaged: "2" for 27, 810 for 310) is accepted only when the leaves on both sides are checked by both readings and the chain runs through it
  for (let leaf = 1; leaf < pi.length - 1; leaf++) {
    if (folio.has(leaf) || !archive.has(leaf)) continue;
    const a = folio.get(leaf - 1), b = folio.get(leaf + 1);
    if (a && b && a.basis === 'both' && b.basis === 'both' && a.page + 1 === archive.get(leaf) && b.page - 1 === archive.get(leaf)) { folio.set(leaf, { page: archive.get(leaf), basis: 'chain' }); stats.chain++; stats.disagree--; }
  }
  const chars = chunks.join('');
  const leafAt = (pos) => { let lo = 0, hi = leafStart.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (leafStart[mid] <= pos) lo = mid; else hi = mid - 1; } return lo; };
  return { part, chars, starts, leafAt, folio, stats };
}

/** index of the volume's word starts by their next K letters: Map key -> position, or -1 when the key occurs at more than one word start */
export function startIndex(vol, K) {
  const idx = new Map();
  for (const pos of vol.starts) { if (pos + K > vol.chars.length) continue; const k = vol.chars.slice(pos, pos + K); idx.set(k, idx.has(k) ? -1 : pos); }
  return idx;
}

/**
 * Every sentence start of every passage, located in its volume by its first letters and compared with the corpus's page.
 * pageOf(passage, offset) -> the page the corpus cites for the sentence start (the caller passes pageSpan over the passage's page list).
 */
export function checkPages(passages, vols, pageOf, { K = 40, minK = 28, spread = 4, inner = 40 } = {}) {
  const res = { passages_total: 0, passages_unlocated: [], sentences: 0, located: 0, located_inner: 0, unlocated: 0, set_aside: 0, folio_unchecked: 0, wrong: [], passages: new Set(), passages_wrong: new Set(), by_part: {} };
  const idx = new Map(); const get = (part, k) => { const key = part + ':' + k; if (!idx.has(key)) idx.set(key, startIndex(vols[part], k)); return idx.get(key); };
  const WORD = /[A-Za-z0-9][^\s]*/g;
  for (const p of passages) {
    const vol = vols[p.part]; if (!vol) continue;
    res.passages_total++;
    const sb = p.sb && p.sb.length ? p.sb : [0];
    const found = [];
    for (const s of sb) {
      res.sentences++;
      // the sentence's first letters; when they are not found once (a word the normaliser changed, a phrase the volume prints twice), the next words of the sentence, up to `inner` words in
      let hit = null, n = 0;
      const seg = p.text.slice(s, s + 700); WORD.lastIndex = 0; let m;
      while ((m = WORD.exec(seg)) && n++ < inner && !hit) {
        const a = alnum(seg.slice(m.index, m.index + 160));
        for (const k of [K, minK]) { if (a.length < k) continue; const at = get(p.part, k).get(a.slice(0, k)); if (at !== undefined && at >= 0) { hit = { s: s + m.index, pos: at, inner: n > 1 }; break; } }
      }
      if (!hit) { res.unlocated++; continue; }
      found.push({ s: hit.s, inner: hit.inner, leaf: vol.leafAt(hit.pos) });
    }
    if (!found.length) { res.passages_unlocated.push(p.id); continue; }
    const leaves = found.map((x) => x.leaf).sort((x, y) => x - y); const med = leaves[leaves.length >> 1];
    for (const f of found) {
      if (Math.abs(f.leaf - med) > spread) { res.set_aside++; continue; }
      const fo = vol.folio.get(f.leaf);
      if (!fo) { res.folio_unchecked++; continue; }
      res.located++; if (f.inner) res.located_inner++; res.passages.add(p.id);
      const got = pageOf(p, f.s);
      (res.by_part[p.part] ||= { located: 0, wrong: 0 }).located++;
      if (got !== fo.page) { res.wrong.push({ id: p.id, off: f.s, got, want: fo.page, leaf: f.leaf, start: p.text.slice(f.s, f.s + 60).replace(/\s+/g, ' ') }); res.passages_wrong.add(p.id); res.by_part[p.part].wrong++; }
    }
  }
  return res;
}

// command line: node tests/historian/lib/leaf-check.mjs [--raw historian-src/raw/or27] [--show 25]
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { pageSpan } = await import('../../../historian-src/core/select.js');
  const a = process.argv.slice(2); const rawDir = path.resolve(ROOT, a.includes('--raw') ? a[a.indexOf('--raw') + 1] : 'historian-src/raw/or27');
  const vols = {}; for (const p of [1, 2, 3]) { vols[p] = loadVolume(p); console.log('volume', p, JSON.stringify(vols[p].stats)); }
  const P = fs.readFileSync(path.join(rawDir, 'passages.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const t0 = Date.now();
  const r = checkPages(P, vols, (p, s) => { const sp = pageSpan(p.pg, s, s + 1, null); return sp ? +String(sp.pages).split(/[–-]/)[0] : null; });
  console.log(`passages ${r.passages_total} (none located: ${r.passages_unlocated.length}); sentence starts ${r.sentences}; located ${r.located} (${r.located_inner} by a later word of the sentence); unlocated ${r.unlocated}; set aside ${r.set_aside}; folio unchecked ${r.folio_unchecked}; WRONG ${r.wrong.length} (${(100 * r.wrong.length / Math.max(1, r.located)).toFixed(3)}%) in ${r.passages_wrong.size} of ${r.passages.size} passages; ${Date.now() - t0} ms`);
  console.log(JSON.stringify(r.by_part));
  for (const w of r.wrong.slice(0, +(a.includes('--show') ? a[a.indexOf('--show') + 1] : 25))) console.log(' ', JSON.stringify(w));
}
