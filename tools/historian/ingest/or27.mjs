// or27.mjs - Official Records, Series I, vol. 27 (Gettysburg Campaign): OCR normaliser, table-of-contents parser and report-level segmenter for the
// Internet Archive djvu.txt OCR (ABBYY, UIUC scans). Chapter 14 WP-HIST-04 (normalize_ocr, page map) and WP-HIST-12 (segmenters), first slice.
//
//   normalizeOcr(raw)        NFC, U+FFFD by context, collapse whitespace, de-hyphenate line breaks, strip running heads while recording the printed page of every
//                            page start, conservative dictionary repair (single edit, unique candidate, df >= 50, never digits or capitalised tokens); every edit is logged
//   parseToc(text)           the "No. 196.-- Col. Joshua L. Chamberlain, Twentieth Maine Infantry." list of reports (Nos. 1-378 in Part 1)
//   segmentReports(n, toc)   report-level documents: header "No. N. / Report of ...", the body up to the next header, printed page range, ToC reconciliation
//   chunkDocument(doc)       passages of about 150-250 words, paragraph aligned, never across documents, with sentence boundaries (sb) and printed pages
//   ingestOr27(text, opts)   the whole pipeline; returns documents, passages, edits and a quality report
// Nothing here downloads anything (see fetch.mjs) and nothing is committed except code and small fixtures.
import crypto from 'node:crypto';
import { splitSentences, dl } from '../../../historian-src/core/text.js';
import { stripHeads, countHeads } from './heads.mjs';
import { findHeader, titleOverlap } from './or27-headers.mjs';
import { segmentDispatches } from './or27-dispatch.mjs';
import { leafChar, leafOfLine } from './leaves.mjs';
import { stripNotes, isHeadFragment, dropHeadRemnants } from './notes.mjs';

const sha8 = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
const words = (s) => (s.match(/\S+/g) || []).length;

// ---------------------------------------------------------------------------------------------------------------------------------------
// normalise
// ---------------------------------------------------------------------------------------------------------------------------------------
const HEAD_CHAP = /^\W{0,3}(?:Chap|CHAP|Ohap|Cnap)\.?\s+[XLIVC]{1,8}\.?\]?/;               // "Chap.  XXXIX.]" (with common OCR variants), optionally followed by the running title
const HEAD_TITLE = /^\W{0,3}(?:THE\s+)?GETTYSBURG\s+CAMPAIGN\.?\W{0,3}(?:\[?\s*Chap\.?\s+[XLIVC]{1,8}\.?)?\W{0,3}$/i;
const LONE_NUM = /^\s*(\d{1,4})\s*$/;
// the even-page running head "606 N. C., VA., W. VA., MD., PA., ETC. [Chap. XXXIX." survives OCR in dozens of variants ("VA.j", "MB.", "YA.", "PTC.", a glued digit or bracket): it is recognised by fuzzy
// comparison of its letters with the fixed title, so it is dropped without ever touching a body line
const EVEN_TITLE = 'NCVAWVAMDPAETC';
export function evenHead(l) {
  if (l.length > 100) return null;
  const mm = l.match(/^\W{0,4}(?:(\d{1,4})(?![A-Za-z0-9]))?\W{0,3}(.*)$/); if (!mm) return null;
  let body = mm[2]; const cut = body.search(/[\[lt]?\s*C[a-zA-Z]{2,3}\.?\s+[XLIVCD]{2,}/); if (cut >= 0) body = body.slice(0, cut);
  const core = body.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (core.length < 4 || !(core.length >= 10 ? dl(core, EVEN_TITLE, 5) <= 5 : core.startsWith('NCVA'))) return null;
  return { page: mm[1] ? +mm[1] : null };
}
// Part 3 prints "CORRESPONDENCE, ETC. UNION." (or "CONFEDERATE.") on every right-hand page, with the page number before or after it and often the chapter bracket run into the same line
const CORR_CORES = ['CORRESPONDENCEETCUNION', 'CORRESPONDENCEETCCONFEDERATE'];
export function corrHead(l) {
  if (l.length > 80) return null;
  const mm = l.match(/^\W{0,4}(\d{1,4})?\W{0,3}([^\d]*?)\W{0,3}(\d{1,4})?\W{0,3}$/); if (!mm) return null;
  const core = mm[2].replace(/[^A-Za-z]/g, '').toUpperCase();
  if (core.length < 14 || core.length > 30 || !CORR_CORES.some((c) => dl(core, c, 4) <= 4)) return null;
  const pg = mm[1] || mm[3] || null;
  return { page: pg ? +pg : null };
}
const HEAD_TITLE_UP = /^\W{0,3}\w{0,5}\s*GETTYSBURG\s+CAMPAIGN\.?\W{0,3}$/;                // all capitals, OCR-tolerant: never a body line

// Running heads and signature marks that share a line with body text (the ABBYY layout runs a page's head into the first line of its column, and the sheet signature "2 R R - VOL XXVII, PT I"
// into the last): removed with the page number that comes with them. Found by comparing the OR27 sample with its running heads: 80 of 1,513 passages still carried one after the line-based pass.
const INLINE_CHAP = new RegExp(String.raw`(?:(?<![A-Za-z0-9])(\d{1,4})\s+(?=\[\s*(?:Chap|CHAP|ChAp|hap)))?(?<![A-Za-z])(?:[IL](?=Chap|CHAP|hap)|[\[\]•t]?\s*)(?:Chap|CHAP|ChAp|Ohap|Cnap|hap)[.,;:^\s-]{0,4}[Xx]{1,3}[IlL1iXxf]{0,2}(?:\s?(?:[.,;:\]jJ)fI|?!]|1(?!\d))){0,3}(?:\s*(?:THE\s+)?GETTYSBURG\s+CAMPAIGN\.?)?(?:\s*(\d{1,4})\b(?!\s*(?:men|killed|wounded|missing|miles?|per|horses|guns|rounds|prisoners|days?|hours?|o.clock|a\.?\s?m|p\.?\s?m)\b))?`, 'g');
const INLINE_SIG = new RegExp(String.raw`(?<![A-Za-z0-9])(?:\d{1,2}\s*)?[A-Za-z]{1,2}\s*[A-Za-z]\s*[—–-]{0,2}\s*VOL\.?\s*XXVII,?\s*[Pp][Tt]\.?\s*[IlJ1i]{1,3}(?![A-Za-z])`, 'g');
const INLINE_EVEN = new RegExp(String.raw`(?<![A-Za-z0-9])(\d{1,4})?\s*N[\W_jJ]{0,3}C[\W_jJ]{0,3}\s*V[AY][\W_jJ]{0,3}\s*W[\W_jJ]{0,3}\s*V[AY][\W_jJ]{0,3}\s*M[DB][\W_jJ]{0,3}\s*P[AT][\W_jJ]{0,3}\s*[EP]TC[\W_jJ]{0,3}`, 'g');
const INLINE_TITLE = new RegExp(String.raw`(?<![A-Za-z])(?:THE\s+)?GETTYSBURG\s+CAMPAIGN\.?\s*(\d{1,4})?\b`, 'g');
export function stripInline(line) {
  let t = line, page = null, changed = false;
  const take = (re, pageGroup) => { t = t.replace(re, (m, a, b) => { changed = true; const p = a && /^\d/.test(a) ? a : b && /^\d/.test(b) ? b : null; if (pageGroup && p && +p <= 1400) page = page || +p; return ' '; }); };
  take(INLINE_SIG, false); take(INLINE_EVEN, true); take(INLINE_CHAP, true); take(INLINE_TITLE, true);   // the running title is in capitals; the body says "the Gettysburg Campaign"
  return { text: changed ? t.replace(/\s{2,}/g, ' ').trim() : line, changed, page };
}

/** collapse OCR whitespace and join hyphenated line breaks; returns {text, edits} */
export function cleanWhitespace(raw) {
  const edits = [];
  let t = String(raw).normalize('NFC').replace(/\r\n?/g, '\n').replace(/\f/g, '\n');
  // U+FFFD: a dash between digits (page and date ranges), otherwise dropped; logged
  t = t.replace(/(\d)\uFFFD(\d)/g, (m, a, b) => { edits.push({ why: 'ufffd-dash', from: m, to: `${a}\u2013${b}` }); return `${a}\u2013${b}`; }).replace(/\uFFFD/g, () => { edits.push({ why: 'ufffd-drop', from: '\uFFFD', to: '' }); return ''; });
  t = t.replace(/[ \t]+/g, ' ').replace(/ +\n/g, '\n').replace(/\n +/g, '\n');
  return { text: t, edits };
}

/** join "Confed-\nerate" -> "Confederate"; keep "Brigadier-\nGeneral" as "Brigadier-General" */
const TENS = new Set(['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']);
const UNITS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth']);
/**
 * How the volume itself spells the words that a line break splits at a hyphen: for every "xx-yy" the number of times "xx-yy" stands whole inside a line and the number of times "xxyy" does. A line-end
 * hyphen keeps its place when the hyphenated word is the volume's own spelling ("to-day", "Court-House", "re-enforcements": whole inside a line more often than the joined word is) and, whatever the counts,
 * in the compound numbers that are always hyphenated ("thirty-seventh": tens and a unit). Without this the join read "thirtyseventh" (a regiment "Twentyseventh Indiana") and "to-day" as "today".
 */
export function compoundVotes(text) {
  const hy = new Map(), joined = new Map();
  for (const m of text.matchAll(/(?<![A-Za-z-])([A-Za-z]{2,})-([A-Za-z]{2,})(?![A-Za-z-])/g)) { const k = (m[1] + '-' + m[2]).toLowerCase(); hy.set(k, (hy.get(k) || 0) + 1); }
  for (const m of text.matchAll(/(?<![A-Za-z-])([a-z]{4,})(?![A-Za-z-])/g)) joined.set(m[1], (joined.get(m[1]) || 0) + 1);
  return { hy, joined };
}
const keepsHyphen = (a, rest, votes) => {
  const al = a.toLowerCase(), rl = rest.toLowerCase();
  if (TENS.has(al) && UNITS.has(rl)) return true;
  return !!votes && (votes.hy.get(al + '-' + rl) || 0) > (votes.joined.get(al + rl) || 0);
};
export function dehyphenate(t, edits = [], votes = null) {
  // a page mark (MARK, see normalizeOcr) standing at the start of the continuation is carried to the end of the joined word
  return t.replace(/([A-Za-z]{2,})-\n(?!\n)(*)([A-Za-z])([A-Za-z]*)/g, (m, a, b0, b, c) => {
    const lowerNext = b === b.toLowerCase();
    const keep = lowerNext && keepsHyphen(a, b + c, votes);
    const out = lowerNext && !keep ? a + b + c : `${a}-${b}${c}`;
    edits.push({ why: lowerNext && !keep ? 'dehyphenate' : 'hyphen-kept', from: m.replace('\n', '\\n').replace(//g, ''), to: out });
    return out + b0;
  });
}

/** remove running heads / page numbers; returns {text, pages:[{offset, page}]} where offset is the position in the returned text where that printed page begins */
export function stripRunningHeads(t, { folio = null } = {}) {
  const lines = t.split('\n');
  // leaf mode (leaves.mjs): a line that is one private-use character is the start of a scan leaf; the page of every stretch of text is the folio of the leaf it stands on, read from the Archive's own per-leaf
  // text and page numbers, never from the heads (which are still taken out of the text, by what they say)
  const leafAt = folio ? lines.map(leafOfLine) : null;
  const drop = new Set();
  const marks = []; // {line, page}
  const headLine = new Set();   // every line dropped as a page head (not signature marks): one cluster of them is one page boundary
  // what a head SAYS is read first (heads.mjs: CHAP + XXXIX, GETTYSBURG CAMPAIGN in capitals, "R R - VOL XXVII, PT I", in any OCR spelling within a few edits); the older exact-spelling detectors below see what is left.
  // Reading it first matters: an exact-spelling pass that cuts only part of a corrupted head ("Chap. XX!" out of "Chap. XX!XIX.]") leaves a fragment that nothing recognises afterwards.
  const takeHeads = (i) => {
    const fz = stripHeads(lines[i], 1);
    if (!fz.found.length) return false;
    const kinds = new Set(fz.found.map((x) => x.kind));
    lines[i] = fz.text;
    if (fz.page) marks.push({ line: i, page: fz.page });
    if (!/[A-Za-z0-9]{2}/.test(fz.text)) {
      drop.add(i); if (kinds.has('chap') || kinds.has('title')) headLine.add(i);
      if (fz.page === null && (kinds.has('chap') || kinds.has('title'))) { const n = nearNumber(lines, i, 4); if (n && !drop.has(n.line)) { drop.add(n.line); marks.push({ line: Math.min(i, n.line), page: n.page }); } }
      return true;
    }
    return false;
  };
  for (let i = 0; i < lines.length; i++) {
    if (leafAt && leafAt[i] >= 0) continue;
    if (takeHeads(i)) continue;
    {                                                                                              // a page number alone in the middle of a sentence ("... I communicated my views to him," / 470 / "and was informed ..."): the page break's own number
      const num = lines[i].match(/^\s*(\d{3,4})\s*$/);
      if (num && +num[1] <= 1400) {
        const blanks = (from, step) => { let n = 0; for (let k = from; k >= 0 && k < lines.length && !lines[k].trim(); k += step) n++; return n; };
        const prevI = (() => { let k = i - 1; while (k >= 0 && !lines[k].trim()) k--; return k; })(), nextI = (() => { let k = i + 1; while (k < lines.length && !lines[k].trim()) k++; return k; })();
        if (prevI >= 0 && nextI < lines.length && lines[prevI].trim().length >= 30 && !/[.!?:;"\u201d)\]]\s*$/.test(lines[prevI]) && /^[a-z]/.test(lines[nextI].trim()) && blanks(i - 1, -1) >= 2 && blanks(i + 1, 1) >= 2) { drop.add(i); marks.push({ line: i, page: +num[1] }); continue; }
      }
    }
    const l = lines[i];
    const one = l.match(/^\W{0,3}(?:Chap|CHAP|Ohap|Cnap)\.?\s+[XLIVC]{1,8}\.?\]?\s+(?:THE\s+)?GETTYSBURG\s+CAMPAIGN\.?\s*(\d{1,4})?\s*$/i);
    const corr = corrHead(l);
    if (corr) { drop.add(i); headLine.add(i); if (corr.page) marks.push({ line: i, page: corr.page }); else { const n = nearNumber(lines, i, 4); if (n && !drop.has(n.line)) { drop.add(n.line); marks.push({ line: Math.min(i, n.line), page: n.page }); } } continue; }
    if (one) { drop.add(i); headLine.add(i); if (one[1]) marks.push({ line: i, page: +one[1] }); else { const n = nearNumber(lines, i, 4); if (n) { drop.add(n.line); marks.push({ line: i, page: n.page }); } } continue; }
    const even = evenHead(l);
    if (even) { drop.add(i); headLine.add(i); if (even.page) marks.push({ line: i, page: even.page }); else { const n = nearNumber(lines, i, 4); if (n && !drop.has(n.line)) { drop.add(n.line); marks.push({ line: Math.min(i, n.line), page: n.page }); } } continue; }
    if (HEAD_TITLE_UP.test(l)) { drop.add(i); headLine.add(i); const n = nearNumber(lines, i, 2); if (n && !drop.has(n.line)) { drop.add(n.line); marks.push({ line: Math.min(i, n.line), page: n.page }); } continue; }
    const two = HEAD_CHAP.test(l) && l.replace(HEAD_CHAP, '').trim() === '';
    const three = HEAD_TITLE.test(l) && (lines.slice(Math.max(0, i - 5), i).some((x) => HEAD_CHAP.test(x)) || /\[?\s*Chap/i.test(l) || !!nearNumber(lines, i, 4));
    if (two || three) {
      // the head lines and the lone page number around them
      drop.add(i); headLine.add(i);
      if (two) for (let k = i + 1; k <= Math.min(lines.length - 1, i + 6); k++) { if (HEAD_TITLE.test(lines[k])) drop.add(k); }
      const n = nearNumber(lines, i, 6);
      if (n && !drop.has(n.line)) { drop.add(n.line); marks.push({ line: Math.min(i, n.line), page: n.page }); }
      continue;
    }
    // a head or signature mark run into a body line: cut it out of the line (and keep the printed page it carried)
    const inl = stripInline(l);
    if (inl.changed) { lines[i] = inl.text; if (inl.page) marks.push({ line: i, page: inl.page }); if (!inl.text.trim()) drop.add(i); }
    takeHeads(i);                                                                                 // what the exact-spelling passes left or changed
  }
  if (leafAt) {
    // the pieces of a running head the OCR broke across lines and the head strippers did not take ("N. C.," and the page number on lines of their own at the top of the leaf): dropped, the leaf's folio being known
    { let cur = -1, seen = 0;
      for (let i = 0; i < lines.length; i++) {
        if (leafAt[i] >= 0) { cur = leafAt[i]; seen = 0; continue; }
        // the first page of a part prints no running head, only its folio in parentheses at the foot ("(3)"): the page number, not text
        { const pf = /^\(\s*(\d{1,4})\s*\)$/.exec(lines[i].trim()); if (pf && cur >= 0 && folio(cur) !== null && Math.abs(+pf[1] - folio(cur)) <= 1) { drop.add(i); continue; } }
        if (drop.has(i) || !lines[i].trim() || seen >= 4) continue;
        seen++;
        if (isHeadFragment(lines[i], folio(cur))) { let more = false; for (let k = i + 1; k < lines.length && leafAt[k] < 0 && !more; k++) if (!drop.has(k) && lines[k].trim() && !isHeadFragment(lines[k], folio(cur))) more = true; if (more) drop.add(i); }
        else if (!/^\d{1,4}$/.test(lines[i].trim())) seen = 99;
      } }
    const out = []; const pages = []; let off = 0, pending = null;
    for (let i = 0; i < lines.length; i++) {
      if (leafAt[i] >= 0) { pending = leafAt[i]; continue; }
      if (drop.has(i)) continue;
      if (pending !== null) { pages.push({ offset: off, page: folio(pending), leaf: pending }); pending = null; }
      out.push(lines[i]); off += lines[i].length + 1;
    }
    return { text: out.join('\n'), pages, inferred: 0 };
  }
  // ---- page numbers ---------------------------------------------------------------------------------------------------------------------------------------
  // Every printed page has one head cluster (the head lines dropped above) and most carry a page number somewhere around it. The marks are candidates; a chain is chosen:
  //   events   one per head cluster (with the numbers found within 6 lines of it), plus every stand-alone mark (a number read inline in a body line); two events that share a number are one
  //   chain    the longest consistent run of numbered events: each page 1 to 4 above the one before it, a restart (front matter, then page 1) costing two marks; found by dynamic programming
  //   fill     an event that is not on the chain (an OCR digit slip: 894 for 394; or a head whose number was not read) takes the page counted off between its chain neighbours, when exactly as many
  //            events lie between them as pages are missing there; when the counts disagree it is left unmarked rather than guessed
  marks.sort((a, b) => a.line - b.line);
  const gap = (k) => !lines[k].trim() || drop.has(k);
  const events = [];
  for (const i of [...headLine].sort((x, y) => x - y)) { const c = events[events.length - 1]; if (c && c.cluster) { let ok = true; for (let k = c.last + 1; k < i && ok; k++) if (!gap(k)) ok = false; if (ok) { c.last = i; continue; } } events.push({ cluster: true, first: i, last: i, cand: [] }); }
  for (const m of marks) {
    let e = null, dmin = 7;                                                           // the nearest head cluster within six lines (the head the number belongs to)
    for (const x of events) if (x.cluster) { const d = m.line < x.first ? x.first - m.line : m.line > x.last ? m.line - x.last : 0; if (d < dmin) { dmin = d; e = x; } }
    if (e) e.cand.push(m.page); else events.push({ cluster: false, first: m.line, last: m.line, cand: [m.page] });
  }
  events.sort((x, y) => x.first - y.first);
  const merged = [];
  for (const e of events) { const q = merged[merged.length - 1]; if (q && e.cand.length && q.cand.length && q.cand[0] === e.cand[0] && e.first - q.last <= 15) { q.last = Math.max(q.last, e.last); continue; } merged.push(e); }
  const num = merged.map((e, i) => ({ i, p: e.cand.length ? e.cand[0] : null })).filter((x) => x.p !== null);
  const best = new Array(num.length).fill(0), from = new Array(num.length).fill(-1); let prefix = -Infinity, prefixAt = -1;
  for (let k = 0; k < num.length; k++) {
    let sc = 1, fr = -1;                                                             // a chain that starts here
    if (prefixAt >= 0 && prefix - 2 + 1 > sc) { sc = prefix - 2 + 1; fr = prefixAt; }  // a restart: the best chain so far, two marks lost
    for (let j = Math.max(0, k - 8); j < k; j++) { const d = num[k].p - num[j].p; if (d >= 1 && d <= 4) { const v = best[j] + 1 - 0.2 * (d - 1); if (v > sc) { sc = v; fr = j; } } }
    best[k] = sc; from[k] = fr;
    if (sc > prefix) { prefix = sc; prefixAt = k; }
  }
  const onChain = new Set(); for (let k = prefixAt; k >= 0; k = from[k]) onChain.add(num[k].i);
  let inferred = 0;
  const chainIdx = [...onChain].sort((x, y) => x - y);
  const finalPage = new Map(); for (const i of chainIdx) finalPage.set(i, merged[i].cand[0]);
  for (let q = 0; q + 1 < chainIdx.length; q++) {
    const lo = chainIdx[q], hi = chainIdx[q + 1], n = hi - lo - 1;
    if (n > 0 && finalPage.get(hi) - finalPage.get(lo) - 1 === n) for (let t = 1; t <= n; t++) { finalPage.set(lo + t, finalPage.get(lo) + t); if (merged[lo + t].cand.length) inferred++; }
  }
  marks.length = 0;
  for (const [i, pg] of finalPage) marks.push({ line: merged[i].cluster ? merged[i].first : merged[i].first, page: pg });
  marks.sort((x, y) => x.line - y.line);
  const out = []; const pages = []; let off = 0;
  const markAt = new Map(); for (const m of marks) if (m.page !== null) markAt.set(m.line, m.page);
  // page marks refer to the first kept line after them
  let pending = null;
  for (let i = 0; i < lines.length; i++) {
    if (markAt.has(i)) pending = markAt.get(i);
    if (drop.has(i)) continue;
    if (pending !== null) { pages.push({ offset: off, page: pending }); pending = null; }
    out.push(lines[i]); off += lines[i].length + 1;
  }
  return { text: out.join('\n'), pages, inferred };
}
function nearNumber(lines, i, span) {
  for (let d = -span; d <= span; d++) { const k = i + d; if (k < 0 || k >= lines.length || d === 0) continue; const m = lines[k].match(LONE_NUM); if (m) return { line: k, page: +m[1] }; }
  return null;
}

/**
 * Conservative dictionary repair: a lower-case alphabetic token that occurs at most twice is replaced only when exactly one token with df >= minDf lies at edit distance 1.
 * Digits, capitalised words and short tokens are never touched. Every edit is returned.
 */
// substitutions that are typical OCR confusions on this scan (ABBYY, 1889 type): u/n, b/h, c/e, i/l, v/w, and the like; a substitution outside this list is never repaired
const CONFUSIONS = new Set(['un', 'nu', 'bh', 'hb', 'ce', 'ec', 'il', 'li', 'vw', 'wv', 'ao', 'oa', 'rt', 'tr', 'ij', 'ji', 'sf', 'fs', 'ls', 'sl', 'ta', 'at']);
function isOcrEdit(w, c) {
  if (w.length === c.length) { let d = -1; for (let i = 0; i < w.length; i++) if (w[i] !== c[i]) { if (d >= 0) return false; d = i; } return d >= 0 && CONFUSIONS.has(w[d] + c[d]); } // one substitution from the list
  const [a, b] = w.length > c.length ? [w, c] : [c, w]; // one stray or missing letter: b is a with one letter removed
  for (let i = 0; i < a.length; i++) if (a.slice(0, i) + a.slice(i + 1) === b) return true;
  return false;
}
export function dictionaryRepair(text, { minDf = 200, maxRareDf = 1, minLen = 4 } = {}) {
  const df = new Map();
  for (const m of text.matchAll(/\b[a-z]{2,}\b/g)) df.set(m[0], (df.get(m[0]) || 0) + 1);
  const common = [...df.entries()].filter(([, n]) => n >= minDf).map(([w]) => w);
  const byLen = new Map(); for (const w of common) (byLen.get(w.length) || byLen.set(w.length, []).get(w.length)).push(w);
  const cache = new Map();
  const fix = (w) => {
    if (cache.has(w)) return cache.get(w);
    let res = null;
    if (w.length >= minLen && (df.get(w) || 0) <= maxRareDf) {
      const cands = [];
      for (const L of [w.length - 1, w.length, w.length + 1]) for (const c of byLen.get(L) || []) if (dl(w, c, 1) === 1 && isOcrEdit(w, c)) cands.push(c);
      if (cands.length === 1) res = cands[0];
    }
    cache.set(w, res); return res;
  };
  const edits = [];
  const out = text.replace(/(?<![A-Za-z0-9'\u2019-])[a-z]{4,}(?![A-Za-z0-9'\u2019-])/g, (w, off) => {
    const to = fix(w);
    if (!to) return w;
    edits.push({ why: 'ocr-dict', from: w, to, at: off });
    return to;
  });
  return { text: out, edits };
}

export function insertLeafMarks(raw, marks) {
  let out = '', at = 0;
  for (const m of marks) { out += raw.slice(at, m.off) + leafChar(m.leaf) + '\n'; at = m.off; }
  return out + raw.slice(at);
}
export function normalizeOcr(raw, { repair = true, leaves = null } = {}) {
  // leaves: { marks: [{ leaf, off }] (raw offsets of the leaf starts), folio(leaf) } from leaves.mjs; without it the page of a stretch is read from the running heads (the old way, kept for text with no leaf data)
  const leafMode = !!(leaves && leaves.marks && leaves.marks.length);
  const a = cleanWhitespace(leafMode ? insertLeafMarks(raw, leaves.marks) : raw);
  const edits = [...a.edits];
  // leaf mode: the notes the compilers printed (foot-of-page notes, '- Compiler.', cross references) and the pieces of a head the OCR left in the text are taken out and counted (notes.mjs)
  let notes = [];
  if (leafMode) { const nz = stripNotes(a.text); a.text = nz.text; notes = nz.removed; for (const n of notes) edits.push({ why: n.kind, leaf: n.leaf, from: n.text.slice(0, 200), to: '' }); }
  const h = stripRunningHeads(a.text, leaves && leaves.marks && leaves.marks.length ? { folio: leaves.folio } : {});
  // the page marks travel through the joining of hyphenated words, the squeeze of blanks and the dictionary repair as one private-use character each (MARK) at their offset, so that every mark keeps its exact place:
  // the earlier way (find the first four words after the mark again in the changed text) put two pages whose first lines read alike ("Headquarters Army of the Potomac,") on one offset or on the wrong one
  let hs = h.text;
  for (const p of h.pages.map((q, i) => ({ ...q, i })).sort((x, y) => y.offset - x.offset || y.i - x.i)) hs = hs.slice(0, p.offset) + MARK + hs.slice(p.offset);
  const d = dehyphenate(hs, edits, compoundVotes(hs));
  let text = d.replace(/[ \t]+/g, ' ');
  text = dropHeadRemnants(text, MARK);                                                                  // the pieces of a head the head stripper left ("[Chap. YYYTY-", "TJNION.", "30 R R - VOL XII.VII, PT III"), page marks kept
  if (repair) { const r = dictionaryRepair(text); text = r.text; edits.push(...r.edits); }
  const parts = text.split(MARK);
  if (parts.length - 1 !== h.pages.length) return { text: text.replace(//g, ''), pages: remapPages(h.text, h.pages, text.replace(//g, '')), edits, notes, pages_inferred: h.inferred || 0 };       // a mark was lost: the anchor search
  const clean = parts.join(''); const pages = []; let off = 0;
  parts.forEach((s, k) => { off += s.length; if (k < h.pages.length) { let o = off; while (o < clean.length && /\s/.test(clean[o])) o++; pages.push({ offset: o, page: h.pages[k].page, ...(h.pages[k].leaf !== undefined ? { leaf: h.pages[k].leaf } : {}) }); } });   // a page begins at its first printed character, not at the blank lines before it
  return { text: clean, pages, edits, notes, pages_inferred: h.inferred || 0 };
}
const MARK = '';
/** page marks were recorded against the head-stripped text; after de-hyphenation and repair, locate each mark again by a short anchor of the text that follows it */
function remapPages(before, pages, after) {
  const out = []; let from = 0;
  for (const p of pages) {
    const anchor = before.slice(p.offset, p.offset + 60).replace(/\s+/g, ' ').trim().split(' ').slice(0, 4).join(' ');
    let idx = -1;
    if (anchor) { const re = new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'), 'g'); re.lastIndex = from; const m = re.exec(after.replace(/\n/g, '\n')); if (m) idx = m.index; }
    if (idx >= 0) { out.push({ offset: idx, page: p.page, ...(p.leaf !== undefined ? { leaf: p.leaf } : {}) }); from = idx + 1; }                  // strictly after: two pages whose first lines read alike ("Headquarters Third Army Corps,") must not land on one offset
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// table of contents
// ---------------------------------------------------------------------------------------------------------------------------------------
const TOC_ENTRY = /^\s*No\.?\s*(\d{1,3})\s*\.?\s*[\u2014\u2013\-]{1,3}\s*(.+)$/;
// the contents list in worse OCR: "N0. 64.— Lieut.", "No‘ 69!— Brig.", "No 70 —Col", "No; 71 1 — Col.", "No’ 74 -Lieut.", "No*. 80.— Lieut.", "No 75. Capt." (no dash at all): read only when the title that follows starts like a person's rank or a known item
const TOC_FUZZY = /^\s*[NH][o0O°*'‘’!;pP]{0,2}[.,:;!'*‘’]?\s*(\d{1,3})\s*[.,:;!'*‘’]{0,2}\s*\d?\s*[—–\-]{0,3}\s*(\S.*)$/;
const TOC_TITLE_OK = /^-?\s*(?:Lieut|Col|Maj|Capt|Brig|Gen|Surg|Rev|Hon|Dr|Sergt|Prof|Mr|Medical|Assist|Return|Abstract|Itinerary|Organization|Congratulatory|Medals|Record|Extract|General|Report|Statement|Roll|Lieutenant|Colonel|Captain|Major|Commodore|Acting|First|Second|Corporal)\b/;
const TOC_NUM_ONLY = /^\s*No\.?\s*(\d{1,3})\s*[.,\-—–]{0,3}\s*$/;
const RANK_START = /^-?\s*(?:Lieut\.?|Col\.?|Maj\.?|Capt\.?|Brig\.?|Gen\.?|Surg\.?|Rev\.?|Hon\.?|Dr\.?|Sergt\.?|Prof\.?|Mr\.?|Maj\.\s*Gen)/;
export function parseToc(text) {
  const lines = text.split('\n');
  const out = []; let cur = null;
  const pendingNums = []; // the ABBYY column layout prints a run of "No. 314.-" lines first and the titles as a separate column afterwards
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m = l.match(TOC_ENTRY);
    if (!m) { const f = l.match(TOC_FUZZY); if (f && f[1].length <= 3 && TOC_TITLE_OK.test(f[2])) m = f; }
    if (m) { if (cur) out.push(cur); cur = { no: +m[1], title: m[2].trim() }; continue; }
    const only = l.match(TOC_NUM_ONLY);
    if (only) { if (cur) { out.push(cur); cur = null; } pendingNums.push(+only[1]); continue; }
    if (pendingNums.length >= 3 && RANK_START.test(l.trim()) && /^-/.test(l.trim())) {
      // a column of titles follows: split on lines that start a new "-Rank Name" item
      const items = []; let item = null; let k = i;
      for (; k < lines.length; k++) {
        const t = lines[k].trim();
        if (!t) { if (item && items.length >= pendingNums.length) break; continue; }
        if (/^-/.test(t) && RANK_START.test(t)) { if (item) items.push(item); item = t.replace(/^-\s*/, ''); }
        else if (item && !TOC_NUM_ONLY.test(t) && !TOC_ENTRY.test(t)) item += ' ' + t;
        else break;
      }
      if (item) items.push(item);
      pendingNums.slice(0, items.length).forEach((no, j) => out.push({ no, title: items[j], layout: 'column' }));
      pendingNums.length = 0; i = k - 1; continue;
    }
    if (cur) {
      if (!l.trim() || /^No\.?\s*\d/.test(l) || /^[A-Z][A-Z .,\-]{8,}$/.test(l.trim())) { out.push(cur); cur = null; } else cur.title += ' ' + l.trim();
    }
  }
  if (cur) out.push(cur);
  // a misread number that breaks the run (203 read as 208) is restored from its neighbours when one digit differs and the next entry confirms it
  for (let i = 1; i + 1 < out.length; i++) { const want = out[i - 1].no + 1, e = out[i]; if (e.no !== want && out[i + 1].no === want + 1 && dl(String(e.no), String(want), 1) === 1) { e.fixed_from = e.no; e.no = want; } }
  // keep the first run of entries that increases (the report list, not later cross references)
  const seq = []; let prev = 0;
  for (const e of out) { if (e.no >= prev - 3 && e.no <= prev + 8 || !seq.length) { seq.push(e); prev = e.no; } }
  const clean = (t) => t.replace(/\s+/g, ' ')
    .replace(/([a-z])-\s*[:;|.,]?\s+(?=[a-z])/g, '$1')            // "command-: ing", "regi-; ment": a line-end hyphen with OCR punctuation, joined
    .replace(/(?<=\s)[ijl|:;\u25a0_](?=\s)/g, ' ').replace(/\s+/g, ' ').replace(/-\s+/g, '-').trim();
  return seq.map((e) => ({ ...e, title: clean(e.title) }));
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// report segmentation
// ---------------------------------------------------------------------------------------------------------------------------------------
// "No. 196." on its own line, then "Report of ..." - tolerant of the OCR variants seen in the volume: "Ho. 48.", "ISTo. 68.", "■No. 107.", "No. 134. W,", "No. 187.-", "Beport of", "Deport of"
const HEADER = /(?:^|\n)[ \t]*[^\w\n]{0,3}(?:N|H|K|X|IST|ISI|IS|iS)[oO0][.,:]?[ \t]*(\d{1,3})[ \t]*[.,:\-—]{0,2}[ \t]*\S{0,3}[ \t]*\n+[ \t]*((?:(?:[A-Z][a-z]?port|[BDRK]e[pnoi]{1,2}rt)s?[,.]?[ \t]+of|General[ \t]+Return|Abstracts?|Itinerar\w+|Organization|Congratulatory|Address|Circular|Return|Extracts?)[^\n]*(?:\n(?!\n)[^\n]*){0,3})/g;

/** author part of a ToC title ("Col. Joshua L. Chamberlain, Twentieth Maine Infantry.") -> {author, unit} */
export function splitTocTitle(title) {
  const m = title.match(/^((?:Lieut\.?\s+Col\.?|Brig\.?\s+Gen\.?|Maj\.?\s+Gen\.?|Lieut\.?\s+Gen\.?|Col\.?|Maj\.?|Capt\.?|Lieut\.?|Gen\.?|Surg\.?|Rev\.?|Hon\.?|Dr\.?|Sergt\.?|Prof\.?|Mr\.?)[^,]*),\s*(.*)$/);
  return m ? { author: m[1].trim(), unit: m[2].replace(/\.$/, '').trim() } : { author: title.replace(/\.$/, '').trim(), unit: '' };
}

export function segmentReports(norm, toc = [], { part = 1 } = {}) {
  const text = norm.text;
  const tocByNo = new Map(toc.map((e) => [e.no, e]));
  const found = [];
  for (const m of text.matchAll(HEADER)) {
    const start = m.index + (m[0].startsWith('\n') ? 1 : 0);
    found.push({ no: +m[1], header: m[2].replace(/\s+/g, ' ').trim(), start, headerEnd: m.index + m[0].length });
  }
  // reconcile numbers against the ToC sequence: OCR turns 203 into 208; a number that breaks the run but whose ToC neighbour fits is corrected and logged
  const fixes = [];
  const docs = [];
  let prevNo = null;
  for (let i = 0; i < found.length; i++) {
    const f = found[i];
    let no = f.no;
    if (prevNo !== null && no !== prevNo + 1) {
      const want = prevNo + 1, w = tocByNo.get(want);
      const author = w ? splitTocTitle(w.title).author.replace(/[^A-Za-z ]/g, '').split(/\s+/).pop() : null;
      const isNear = String(want).length === String(no).length && dl(String(no), String(want), 1) === 1;
      // the number as read is itself a contents entry whose title this header carries better than it carries the wanted entry's: it is not a misread (No. 424 "Organization of the Army of Northern Virginia at the battle of Gettysburg" is not No. 423 "Medals of Honor for battle of Gettysburg")
      const own = tocByNo.get(no);
      const ownBetter = own && titleOverlap(f.header, own.title) >= Math.max(0.5, w ? titleOverlap(f.header, w.title) : 0);
      if (w && isNear && author && !ownBetter && new RegExp(author, 'i').test(f.header)) { fixes.push({ from: no, to: want, why: 'toc-sequence' }); no = want; }
    }
    if (prevNo !== null && no <= prevNo) continue; // a cross reference, not a new report
    prevNo = no;
    docs.push({ no, header: f.header, start: f.start, headerEnd: f.headerEnd });
  }
  // ToC-guided recovery: a report whose "No. N." line the OCR mangled is found again by its author's surname near a "Report of" line inside the gap between its neighbours
  const recovered = [];
  for (let i = 0; i + 1 < docs.length; i++) {
    for (let n = docs[i].no + 1; n < docs[i + 1].no; n++) {
      const w = tocByNo.get(n); if (!w) continue;
      const nameOnly = splitTocTitle(w.title).author.replace(/[^A-Za-z .'\-]/g, ' ').trim();
      const sur = nameOnly.split(/\s+/).filter((x) => x.length > 2 && !/^(Col|Maj|Gen|Capt|Lieut|Brig|Surg|Rev|Hon)\.?$/i.test(x)).pop();
      if (!sur) continue;
      const lo = docs[i].headerEnd, hi = docs[i + 1].start;
      const re = new RegExp(`(?:^|\\n)[ \\t]*((?:[A-Z][a-z]?port(?:s)?[ \\t]+of|Extracts? from)[^\\n]{0,90}\\b${sur.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\\n]*)`, 'g');
      re.lastIndex = 0; const gap = text.slice(lo, hi); const m = re.exec(gap);
      if (m) recovered.push({ no: n, header: m[1].replace(/\s+/g, ' ').trim(), start: lo + m.index + (m[0].startsWith('\n') ? 1 : 0), headerEnd: lo + m.index + m[0].length, recovered: 'toc-author' });
    }
  }
  if (recovered.length) { docs.push(...recovered); docs.sort((a, b) => a.start - b.start); }
  // header gap filling (or27-headers.mjs): a number the contents list (or the run) expects whose header is damaged in a way the strict detector does not read: words lost from "Report of", columns scrambled, "Record of ...", "Organization of ..."
  const expected = [...new Set([...toc.map((e) => e.no), ...(docs.length ? Array.from({ length: docs[docs.length - 1].no - docs[0].no + 1 }, (_, i) => docs[0].no + i) : [])])].filter((n) => !docs.length || (n >= docs[0].no)).sort((a, b) => a - b);
  const have = new Set(docs.map((d) => d.no));
  for (const n of expected) {
    if (have.has(n) || n > (docs.length ? docs[docs.length - 1].no + 40 : 0)) continue;
    const prev = [...docs].reverse().find((d) => d.no < n), next = docs.find((d) => d.no > n);
    const lo = prev ? prev.headerEnd : 0, hi = next ? next.start : text.length;
    if (hi <= lo) continue;
    const h = findHeader(text, lo, hi, n, tocByNo.get(n) || null);
    if (!h) continue;
    docs.push({ no: n, header: h.header, start: h.start, headerEnd: h.headerEnd, recovered: h.rule }); have.add(n);
    docs.sort((a, b) => a.start - b.start);
  }
  docs.forEach((d, i) => { d.end = i + 1 < docs.length ? docs[i + 1].start : text.length; });
  // the end of the volume is not the end of its last report: the finding aids (ALTERNATE DESIGNATIONS OF ORGANIZATIONS, the INDEX) follow it, and in Part 2 the numbered reports are followed by
  // unnumbered sections about operations elsewhere (a skirmish at Seneca Mills, expeditions to the South Anna and Wytheville, the New York draft riots). Neither is a source about Gettysburg:
  // the finding aids are cut from the last document, and the unnumbered operations are cut at their first heading and counted, not ingested.
  const tail = { back_matter_at: null, back_matter_chars: 0, addenda_at: null, addenda_chars: 0 };
  if (docs.length) {
    const last = docs[docs.length - 1];
    const bm = /\n[ \t]*ALTERNATE DESIGNATIONS[ \t]*\n/.exec(text.slice(last.start, last.end));
    if (bm) { tail.back_matter_at = last.start + bm.index; tail.back_matter_chars = last.end - tail.back_matter_at; last.end = tail.back_matter_at; }
    if (last.end - last.start > 100000) {
      const ad = /\n[ \t]*(?:SKIRMISH|EXPEDITIONS?|SCOUT|DESCENT|RAID|RECORDS AND EVENTS|DRAFT RIOTS|CONFEDERATE EXPEDITION|ENGAGEMENT|AFFAIR)\b[A-Z0-9 ,.\-:'’&]{6,70}\.?[ \t]*\n/.exec(text.slice(last.start + 3000, last.end));
      if (ad) { tail.addenda_at = last.start + 3000 + ad.index; tail.addenda_chars = last.end - tail.addenda_at; last.end = tail.addenda_at; }
    }
  }
  const pageAt = (off) => { let p = null; for (const m of norm.pages) { if (m.offset <= off) p = m.page; else break; } return p; };
  const segs = docs.map((d) => {
    const toc = tocByNo.get(d.no) || null;
    const sp = toc ? splitTocTitle(toc.title) : splitTocTitle(d.header.replace(/^Reports? of /i, ''));
    const body = text.slice(d.start, d.end).replace(/\s+$/, '');
    return {
      doc_id: `or27-${part}:${String(d.no).padStart(4, '0')}`, no: d.no, title: d.header, toc_title: toc ? toc.title : null, author: sp.author, unit: sp.unit,
      start: d.start, end: d.end, text: body, pages: { start: pageAt(d.start), end: pageAt(Math.max(d.start, d.end - 1)) },
      confidence: d.recovered ? 'B' : toc && dl(d.header.toLowerCase().slice(0, 40), ('report of ' + toc.title).toLowerCase().slice(0, 40), 40) < 28 ? 'A' : toc ? 'B' : 'C', recovered: d.recovered || null,
    };
  });
  return { docs: segs, fixes, tail };
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// chunking
// ---------------------------------------------------------------------------------------------------------------------------------------
/** printed-page breaks inside one flattened paragraph: absolute page marks that fall inside raw (the paragraph's slice of the normalised text, at absolute offset absStart) mapped to offsets in flatten(raw) */
export function pageBreaks(raw, absStart, pageMarks) {
  if (!pageMarks || !pageMarks.length) return [];
  const marks = pageMarks.filter((m) => m.offset > absStart && m.offset < absStart + raw.length && m.page !== null);
  if (!marks.length) return [];
  const out = []; let flat = 0, pend = false, mi = 0;
  for (let i = 0; i < raw.length && mi < marks.length; i++) {
    if (/\s/.test(raw[i])) { if (flat > 0) pend = true; continue; }
    if (pend) { flat++; pend = false; }
    while (mi < marks.length && absStart + i >= marks[mi].offset) { out.push({ at: flat, page: marks[mi].page, ...(marks[mi].leaf !== undefined ? { leaf: marks[mi].leaf } : {}) }); mi++; }
    flat++;
  }
  return out;
}
/** pg of a passage: [[offset in the passage text, printed page], ...], the first entry at 0; a new entry wherever the printed page changes (at a paragraph start or inside a paragraph) */
export function pageList(paras) {
  const pg = []; let at = 0, last = null;
  paras.forEach((p, k) => {
    if (p.startPage !== null && p.startPage !== undefined && p.startPage !== last) { pg.push(p.startLeaf !== undefined && p.startLeaf !== null ? [k === 0 ? 0 : at, p.startPage, p.startLeaf] : [k === 0 ? 0 : at, p.startPage]); last = p.startPage; }
    for (const b of p.breaks || []) if (b.page !== last) { pg.push(b.leaf !== undefined ? [at + b.at, b.page, b.leaf] : [at + b.at, b.page]); last = b.page; }
    at += p.text.length + 2;
  });
  return pg;
}

/** passages of ~150-250 words, paragraph aligned, never across documents; sb = sentence starts inside the passage. A short tail (< min words) is merged into the previous passage, so a passage never exceeds max + min - 1 words. */
export function chunkDocument(doc, { target = 200, max = 250, min = 60, pageAt = null, pageMarks = null, leafAt = null } = {}) {
  const paras = []; let off = 0;
  const flatten = (x) => x.replace(/\s+/g, ' ').trim();
  for (const part of doc.text.split(/\n{2,}/)) {
    const i = doc.text.indexOf(part, off);
    off = i + part.length;
    if (!part.trim()) continue;
    if (words(part) <= max) { paras.push({ s: i, e: i + part.length, text: flatten(part) }); continue; }
    // a paragraph longer than a passage (a long OCR block, a table) is cut at sentence boundaries, and inside a sentence that is itself too long at a word boundary
    const one = part.replace(/\n/g, ' ');                       // same length as the original, so sentence offsets are document offsets
    let g = null; const emit = () => { if (g) paras.push({ s: i + g.s, e: i + g.e, text: flatten(one.slice(g.s, g.e)) }); g = null; };
    const pieces = [];
    for (const x of splitSentences(one)) {
      if (words(one.slice(x.s, x.e)) <= max) { pieces.push(x); continue; }
      let k = x.s, n = 0;
      for (const m of one.slice(x.s, x.e).matchAll(/\S+/g)) { n++; if (n === target) { pieces.push({ s: k, e: x.s + m.index + m[0].length }); k = x.s + m.index + m[0].length; n = 0; } }
      if (k < x.e && one.slice(k, x.e).trim()) pieces.push({ s: k, e: x.e });
    }
    for (const x of pieces) {
      const w = words(one.slice(x.s, x.e)), have = g ? words(one.slice(g.s, g.e)) : 0;
      if (g && have + w > max) emit();
      g = g ? { s: g.s, e: x.e } : { s: x.s, e: x.e };
      if (words(one.slice(g.s, g.e)) >= target) emit();
    }
    emit();
  }
  // where each paragraph starts and which printed pages begin inside it (for the citation of a quoted span)
  if (pageAt) for (const p of paras) { p.startPage = pageAt(doc.start + p.s); if (leafAt) p.startLeaf = leafAt(doc.start + p.s); p.breaks = pageBreaks(doc.text.slice(p.s, p.e), doc.start + p.s, pageMarks); }
  const passages = []; let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((p) => p.text).join('\n\n');
    const seq = passages.length;
    const sb = splitSentences(text).map((x) => x.s);
    passages.push({ id: `${doc.doc_id}#${sha8(text)}`, doc_id: doc.doc_id, seq, text, sb: sb.length ? sb : [0], words: words(text), s: cur[0].s, e: cur[cur.length - 1].e, pages: pageAt ? { start: pageAt(doc.start + cur[0].s), end: pageAt(doc.start + cur[cur.length - 1].e) } : doc.pages, pg: pageAt ? pageList(cur) : undefined, _paras: pageAt ? cur : undefined });
    cur = [];
  };
  for (const p of paras) {
    const w = words(p.text);
    const curW = cur.reduce((a, x) => a + words(x.text), 0);
    if (cur.length && curW + w > max) flush();
    cur.push(p);
    if (words(cur.map((x) => x.text).join(' ')) >= target) flush();
  }
  if (cur.length) { if (passages.length && cur.reduce((a, x) => a + words(x.text), 0) < min) { const last = passages.pop(); if (last._paras) cur.unshift(...last._paras); else cur.unshift({ text: last.text, s: last.s, e: last.e }); } flush(); }
  // a passage that starts with a lone header line is fine; passages never cross documents by construction
  return passages;
}

// ---------------------------------------------------------------------------------------------------------------------------------------
// pipeline
// ---------------------------------------------------------------------------------------------------------------------------------------
/**
 * Lines that still carry a running head or a sheet signature after normalisation, by the SAME detectors the stripper uses plus the narrow whole-line ones. The first version of this
 * count used only the whole-line detectors and reported 0 while 80 of 1,513 passages still carried a head inside a body line (verifier defect V-11).
 */
export function countRunningHeads(text) {
  return String(text).split('\n').filter((l) => evenHead(l) || HEAD_TITLE_UP.test(l) || /^.{0,6}GETTYSBURG CAMPAIGN\.?$/.test(l) || stripInline(l).changed || countHeads(l) > 0).length;
}

/**
 * Why each report number that the run should contain is not a document of its own, and where its text went. A report whose header the segmenter could not read is not lost: its text sits
 * at the end of the PREVIOUS document (the segmenter starts a document only at a header it can read). Reported per number so that nothing is silently absent:
 *   no-contents-entry   the number is not in the contents list, so there is no author to look for
 *   header-not-found    the contents list names the author but the "No. N. / Report of ..." header is unreadable (scrambled columns, a damaged scan)
 * text_in_previous_document: the ALL-CAPS signature of the contents author (or nothing, without an entry) is found in the previous document's text.
 */
export function missingDetail(docs, toc) {
  if (!docs.length) return [];
  const have = new Set(docs.map((d) => d.no)); const out = [];
  for (let n = docs[0].no; n <= docs[docs.length - 1].no; n++) {
    if (have.has(n)) continue;
    const t = toc.find((x) => x.no === n) || null;
    const prev = [...docs].reverse().find((d) => d.no < n) || null;
    const author = t ? (t.title.split(',')[0].match(/([A-Z][A-Za-z'-]+)\s*$/) || [])[1] || null : null;
    out.push({ no: n, reason: t ? 'header-not-found' : 'no-contents-entry', contents_title: t ? t.title : null, previous_document: prev ? prev.no : null, text_in_previous_document: !!(author && prev && new RegExp('\\b' + author.toUpperCase() + '\\b').test(prev.text)) });
  }
  return out;
}

// ---- tables: the OCR of a table is hundreds of one-cell paragraphs ("B", "0)", "57", "Killed.", "2d United States"). They are taken out; the prose around them stays.
//   strong cell   a paragraph of four characters or fewer, or only digits and punctuation ("2,296 1,540 1 1,013 96")
//   label cell    a short row or column label (40 characters, 6 words at most: "Total Second Brigade", "Col. John R. Brooke.")
//   table region  a run of consecutive cells with at least six strong ones making up two fifths of it (eight paragraphs at least), or five strong cells in a row
// Prose never has that shape; the regions are removed wherever they sit, so a chunk that holds a paragraph of report and a table keeps the paragraph.
const CELL_PUNCT = /^[\d\s.,;:|~\-—–_*'"“”‘’()\[\]<>!?$£&®#/\\=+•■]+$/;
const strongCell = (p) => { const t = p.trim(); return t.length <= 4 || (t.length <= 120 && CELL_PUNCT.test(t)); };
const labelCell = (p) => { const t = p.trim(); return t.length <= 40 && (t.match(/\S+/g) || []).length <= 6; };
export function tableRegions(paras) {
  const out = [];
  let i = 0;
  while (i < paras.length) {
    if (!(strongCell(paras[i]) || labelCell(paras[i]))) { i++; continue; }
    let j = i, strong = 0, run = 0, maxRun = 0;
    while (j < paras.length && (strongCell(paras[j]) || labelCell(paras[j]))) { if (strongCell(paras[j])) { strong++; run++; maxRun = Math.max(maxRun, run); } else run = 0; j++; }
    const len = j - i;
    if ((len >= 8 && strong >= 6 && strong / len >= 0.4) || maxRun >= 5) out.push([i, j]);
    i = j;
  }
  return out;
}
// Two measures of what is left of a chunk once its table is taken out:
//   textWords       words in paragraphs of eight tokens or more that are mostly letters: anything a reader could read as text (prose, a footnote, a title, a list of officers killed with their units).
//                   It decides whether a chunk is DROPPED: a chunk with a paragraph of text in it is never discarded.
//   narrativeWords  the part of that which is report prose: at least three fifths of its tokens are lower-case words (the, of, and, was, regiment, ...). A table title, a row of unit names or a list of
//                   places is mostly capitals, digits and abbreviations ("Return of Casualties in the Union forces at Upperville, Va., June"; "Maj. Gen. Henry W. Slocum.* Brig. Gen. Alpheus S. Williams.").
//                   Reported, and used to count low-value passages that were kept; a verb list was tried for this first and it missed "performed", "mention", "skirmishing".
const LOWER_WORD = /^[(["'“‘]*[a-z]{2,}[.,;:!?)"'”’\]*]*$/;
const paraWords = (paras, ratioOf, minRatio) => {
  let n = 0;
  for (const p of paras) {
    const toks = p.trim().match(/\S+/g) || [];
    if (toks.length < 8 || CELL_PUNCT.test(p.trim())) continue;
    if (toks.filter(ratioOf).length / toks.length >= minRatio) n += toks.length;
  }
  return n;
};
// the titles the Official Records print above a table are not text for this purpose ("No. 15.", "General Return of Casualties in the Union forces ...", "[Compiled from nominal list ...]", "Abstract from returns ...")
const TABLE_TITLE = /^(?:No\.\s*\d+\.?$|\[?\s*Compiled\b|(?:General |Consolidated )?(?:Return|Abstract|Recapitulation)\b|.{0,80}\bContinued\.?$)/i;
export const textWords = (paras) => paraWords(paras.filter((p) => !TABLE_TITLE.test(p.trim())), (t) => /[A-Za-z]{2,}/.test(t), 0.6);
export const narrativeWords = (paras) => paraWords(paras, (t) => LOWER_WORD.test(t), 0.6);
/** text without its table regions: { text, removed (paragraphs), regions, narrative (words left) } */
export function stripTableCells(text) {
  const paras = String(text).split(/\n{2,}/).map((x) => x.trim()).filter(Boolean);
  const regions = tableRegions(paras);
  // a passage never opens with a bare number: the cell of a table or the page number a head left behind ("510 / [Inclosure No. 2.] Return of Casualties ...") is cut off the front. These cells are taken out but are no table
  // region of their own (a short list that opens with numbers is not a table and is never dropped as one)
  let lead = 0; while (lead < paras.length - 1 && CELL_PUNCT.test(paras[lead]) && paras[lead].length <= 12) lead++;
  if (regions.length && regions[0][0] === 0) lead = 0;
  if (!regions.length && !lead) return { text: paras.join('\n\n'), removed: 0, regions: 0, narrative: narrativeWords(paras), text_words: textWords(paras), keptIdx: paras.map((_, k) => k) };
  const gone = new Set(); for (let k = 0; k < lead; k++) gone.add(k);
  for (const [a, b] of regions) for (let k = a; k < b; k++) gone.add(k);
  const kept = paras.filter((_, k) => !gone.has(k));
  return { text: kept.join('\n\n'), removed: gone.size, regions: regions.length, narrative: narrativeWords(kept), text_words: textWords(kept), keptIdx: paras.map((_, k) => k).filter((k) => !gone.has(k)) };
}
/**
 * A chunk is table debris when it holds a table and what is left once the table is taken out is not worth keeping: fewer than `minText` words of text, or fewer than `minText` words of report prose
 * together with less than `listText` words of text (a table title, a row of unit names). A chunk with a paragraph of report prose, or with a real list of names (officers killed, with their units), is cleaned, never dropped.
 */
export function isTableDebris(text, { minText = 15, listText = 25 } = {}) {
  const r = stripTableCells(text);
  return r.regions > 0 && (r.text_words < minText || (r.narrative < minText && r.text_words < listText));
}

export function ingestOr27(raw, { repair = true, part = 1, leaves = null } = {}) {
  const norm = normalizeOcr(raw, { repair, leaves });
  // Part 3 holds dispatches, not numbered reports: its documents are cut at datelines (or27-dispatch.mjs)
  const dispatchMode = part === 3;
  // The first page of Part 3's text (the "CORRESPONDENCE, ETC." heading and the first dispatches) prints no running head, so no page mark stands in front of it: the text up to the first folio read (page 4) is one
  // page, and it is the page before that folio (page 3). Taken only when the stretch is as short as one page (it is 1,500 characters; the first folio is at p. 4 and the leaf before its leaf holds no folio of its own).
  let leadingPage = null;
  if (!leaves && dispatchMode && norm.pages.length && norm.pages[0].page > 1) {
    const h = /\nCORRESPONDENCE, ETC\.?\s*\n/.exec(norm.text);
    if (h && h.index < norm.pages[0].offset && norm.pages[0].offset - h.index < 4000) { leadingPage = { offset: h.index + 1, page: norm.pages[0].page - 1, inferred: true }; norm.pages.unshift(leadingPage); norm.pages_inferred = (norm.pages_inferred || 0) + 1; }
  }
  const toc = dispatchMode ? [] : parseToc(norm.text);
  const seg = dispatchMode ? segmentDispatches(norm, { part }) : segmentReports(norm, toc, { part });
  const pageAt = (off) => { let p = null; for (const m of norm.pages) { if (m.offset <= off) p = m.page; else break; } return p; };
  const leafAt = (off) => { let p = null; for (const m of norm.pages) { if (m.offset <= off) p = m.leaf === undefined ? null : m.leaf; else break; } return p; };
  const chunked = seg.docs.flatMap((d) => chunkDocument(d, { pageAt, pageMarks: norm.pages, leafAt: leaves ? leafAt : null }));
  // an OCR'd table comes out as hundreds of one-cell paragraphs ("B", "0)", "a", "57", ...): worthless as a quotable passage, so it is dropped and counted (never silently)
  const debris = chunked.filter((p) => isTableDebris(p.text));
  // a chunk that holds a table AND prose keeps the prose: the cells are taken out, the sentence offsets and the id (a hash of the text) are recomputed
  let cleanedChunks = 0, cellParas = 0;
  const cleaned = chunked.filter((p) => !debris.includes(p)).map((p) => {
    const r = stripTableCells(p.text);
    if (!r.removed) return p;
    if (r.regions) cleanedChunks++; cellParas += r.removed;
    const sb = splitSentences(r.text).map((x) => x.s);
    const keptParas = p._paras ? r.keptIdx.map((k) => p._paras[k]) : null;
    return { ...p, id: `${p.doc_id}#${sha8(r.text)}`, text: r.text, sb: sb.length ? sb : [0], words: words(r.text), pg: keptParas ? pageList(keptParas) : p.pg, _paras: keptParas || undefined };
  });
  for (const p of cleaned) delete p._paras;
  const seqOf = new Map(); const passages = cleaned.map((p) => { const k = seqOf.get(p.doc_id) || 0; seqOf.set(p.doc_id, k + 1); return { ...p, seq: k }; });
  const bad = (x) => !Number.isFinite(x);
  const report = {
    chars_in: raw.length, chars_out: norm.text.length, edits: norm.edits.length, edit_kinds: norm.edits.reduce((m, e) => { m[e.why] = (m[e.why] || 0) + 1; return m; }, {}),
    page_marks: norm.pages.length, page_marks_inferred: norm.pages_inferred, running_heads_left: countRunningHeads(norm.text), running_heads_left_passages: passages.filter((p) => countRunningHeads(p.text) > 0).length, toc_entries: toc.length, toc_range: toc.length ? [toc[0].no, toc[toc.length - 1].no] : null, docs: seg.docs.length,
    tail: seg.tail || null, doc_range: !dispatchMode && seg.docs.length ? [seg.docs[0].no, seg.docs[seg.docs.length - 1].no] : null, dispatch: dispatchMode ? seg.report : null, number_fixes: seg.fixes, recovered_from_toc: seg.docs.filter((d) => d.recovered && d.no !== null).map((d) => d.no),
    docs_with_pages: seg.docs.filter((d) => d.pages.start !== null).length, passages: passages.length, table_debris_dropped: debris.map((p) => p.id), table_debris_text_words: debris.reduce((a, p) => a + stripTableCells(p.text).text_words, 0), low_value_kept: passages.filter((p) => narrativeWords(p.text.split(/\n{2,}/)) < 15).length, table_chunks_cleaned: cleanedChunks, table_paragraphs_removed: cellParas, passage_words: { mean: passages.length ? Math.round(passages.reduce((a, p) => a + p.words, 0) / passages.length) : 0 },
    confidence: seg.docs.reduce((m, d) => { m[d.confidence] = (m[d.confidence] || 0) + 1; return m; }, {}),
    missing_detail: dispatchMode ? [] : missingDetail(seg.docs, toc),
    docs_missing_from_run: (() => { if (dispatchMode || !seg.docs.length) return []; const have = new Set(seg.docs.map((d) => d.no)); const miss = []; for (let n = seg.docs[0].no; n <= seg.docs[seg.docs.length - 1].no; n++) if (!have.has(n)) miss.push(n); return miss; })(),
  };
  return { norm, toc, docs: seg.docs, passages, report };
}
