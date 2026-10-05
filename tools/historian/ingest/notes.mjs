// notes.mjs - the printed matter of the Official Records that is not the author's words: the foot-of-page notes, the compilers' notes, the cross-reference brackets and the heads the OCR set in the middle of a line.
//
// Why (verifier finding MEDIUM, 2026-10-01): the first build kept every line of the OCR that was not a recognised running head. The Official Records print, at the foot of many pages, notes the
// compilers added ("* Embodied in revised statement, p. 173." "* But see revised statement, p. 179." "- Compiler."), and the OCR delivers a foot-of-page note as the last paragraph of its leaf, so the
// sentence that runs over the page break had the note spliced into it: "I moved to Middleburg * Embodied in revised statement, p. 179. during the morning of Sunday" (118 passages), and a quote showed
// "see pp. 180-182. - Compiler." under the name of Meade. Four things are taken out here, each by the layout of the page and never by guessing at words:
//   footnote zone     the trailing paragraphs of a leaf, from the first one that opens with a footnote mark (*, a dagger, a section mark) to the end of the leaf's text (what follows is only the sheet signature,
//                     a page number or stray marks): at most 8 lines and 150 words, no table row, no signature, no dateline. Leaf boundaries are exact (leaves.mjs), so "the foot of the page" is not a guess.
//   compiler's note   a paragraph that ends "- Compiler." (the compilers sign their own notes)
//   cross-reference   a bracketed paragraph of the compilers that points to another part of the volume ("[June 4-27, 1863. - For Hooker's correspondence ... see Part I, pp. 29-60.]")
//   head fragment     the pieces of a running head the OCR left behind at the top of a leaf (a page number and "N. C.," alone) and the "CORRESPONDENCE, ETC. - UNION." head run into a body line
// Every removal is returned (kind, leaf, the text) and counted in the build report; nothing is dropped silently, and the removed text is written next to the passages (notes-removed.jsonl).
import { leafOfLine } from './leaves.mjs';
import { dl } from '../../../historian-src/core/text.js';

const MARK_STRICT = /^(?:\*{1,3}|[†‡§¶]|\|\|)\s*(?=\S)/;                       // the marks the foot of a page opens a note with
const MARK_BROAD = /^(?:(?:\*{1,3}|[†‡§¶|\\%$+<>]{1,2})\s*|[fFtTXJjIi]{1,2}(?=[A-Z])|[fFtTXJjIi]{1,2}\s+(?=[A-Z]))\S/;   // the same, as the OCR reads the daggers ("f Omitted", "\ One battery", "X Not engaged")
const SIG_LINE = /VOL\.?\s*XXVII|\bR\.?\s*R\.?\s*[-—–]\s*VOL|PT\.?\s*[IVX]{1,3}\s*[;.]?\s*$/i;
const ellipsisRow = (t) => !/[A-Za-z]{3}/.test(t);
const upperRatio = (s) => { const l = s.replace(/[^A-Za-z]/g, ''); return l.length ? l.replace(/[^A-Z]/g, '').length / l.length : 0; };
const MONTHS = /\b(?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/;

const paragraphsOf = (lines, a, b) => {
  const paras = []; let cur = null;
  for (let i = a; i < b; i++) { if (!lines[i].trim()) { cur = null; continue; } if (!cur) { cur = { s: i, e: i }; paras.push(cur); } cur.e = i; }
  return paras;
};
const textOf = (lines, p) => lines.slice(p.s, p.e + 1).map((x) => x.trim()).join(' ');
const wordsIn = (s) => (s.match(/\S+/g) || []).length;

/** a trailing paragraph that is no text of the page (the sheet signature "19 R R - VOL XXVII, PT I", a page number, a stray mark, the OCR's debris "■•••■vt 1 f ..I-.") */
const isTrailer = (t) => SIG_LINE.test(t) && t.length <= 60 || /^\W{0,3}\d{1,4}\W{0,3}$/.test(t) || (t.length <= 3 && !/[A-Za-z]{2}/.test(t)) || (t.length <= 28 && !(t.match(/[A-Za-z]{3,}/g) || []).length);

/** is this stretch of lines a foot-of-page note: its first line (after the mark) is sentence-case text, not an ellipsis row, a signature, an addressee or a dateline; short */
const noteLike = (lines, from, to, paras) => {
  const text = lines.slice(from, to).map((x) => x.trim()).filter(Boolean).join(' ');
  const first = text.replace(MARK_STRICT, '');
  const nlines = lines.slice(from, to).filter((x) => x.trim()).length;
  if (nlines > 8 || wordsIn(text) > 150 || (paras && paras.some((p) => p.e - p.s + 1 > 6))) return false;
  if (ellipsisRow(first.slice(0, 60)) || upperRatio(first.slice(0, 40)) > 0.6) return false;                       // an ellipsis row of stars; a signature
  if (/:\s*$/.test(first.slice(0, 80)) && first.length < 80) return false;                                           // an addressee
  if (MONTHS.test(first.slice(0, 40)) && /\b1[8I]\s?[6G]\s?\d\b/.test(first.slice(0, 60))) return false;           // a dateline
  return true;
};

/**
 * The foot-of-page notes of one leaf: { from, to } line range (to exclusive) of the footnote zone, or null.
 * `lines` is the cleaned text split by line; the leaf's own lines are [a, b) (the line after the leaf mark up to the next leaf mark).
 * Two layouts: the note stands in a paragraph of its own (after a blank line), or it is the last line(s) of the last paragraph of text, with no blank line in front of it.
 */
export function footnoteZone(lines, a, b) {
  const paras = paragraphsOf(lines, a, b); if (paras.length < 1) return null;
  let k = paras.length - 1;
  while (k >= 0 && isTrailer(textOf(lines, paras[k]))) k--;
  if (k < 0) return null;
  // (1) paragraphs of their own
  if (k >= 1) {
    // walk up from the foot over paragraphs that open with a mark and over the short continuations of a note the OCR parted from its first line ("Beaufort."); the topmost star paragraph of the stack opens the zone
    let top = -1;
    for (let i = k; i >= 1; i--) {
      const t = lines[paras[i].s].trim();
      if (MARK_BROAD.test(t)) { if (MARK_STRICT.test(t)) top = i; continue; }
      if (wordsIn(textOf(lines, paras[i])) <= 12 && k - i <= 3) continue;
      break;
    }
    if (top < 0) {
      // a lone dagger note ("f Omitted,") on its own at the foot, of the commonest wording
      const t = textOf(lines, paras[k]);
      if (/^(?:f|t|†|‡)\s+(?:Omitted|Loss|See|Embodied|But see|Not\b|Also|Including|Reported|Killed|Wounded)/.test(t) && paras[k].e - paras[k].s <= 1) top = k;
    }
    if (top >= 0) { const zone = paras.slice(top, k + 1); if (noteLike(lines, zone[0].s, paras[k].e + 1, zone)) return { from: zone[0].s, to: paras[k].e + 1 }; }
  }
  // (2) the last lines of the last paragraph of text: "...at Gettysburg, after / *But see revised statement, p. 176,"
  const P = paras[k];
  for (let j = P.s + 1; j <= P.e; j++) {
    if (P.e - j + 1 > 3 || !MARK_STRICT.test(lines[j].trim())) continue;
    if (noteLike(lines, j, P.e + 1, null)) return { from: j, to: P.e + 1 };
  }
  return null;
}

const COMPILER_END = /(?:[—–-]\s*|\s)Compiler\.?,?\s*$/;
const CROSSREF = /^\[\s*(?:(?:[A-Z][a-z]+\.?\s*[\d\-–. ]+(?:,?\s*\d{4})?\.?\s*[—–-]+\s*)?(?:For|See)\b[^\]]{8,320}\bsee\b[^\]]{0,120}|Note\.?\s*[—–-]+\s*For additional[^\]]{5,200}\bsee\b[^\]]{0,120})\]\.?$/;

const SECTION_HEAD = /^(?:(?:UNION|CONFEDERATE)\s+)?CORRESPONDENCE,?\s*ETC\.?(?:\s*[—–-]*\s*(?:UNION|CONFEDERATE)\.?)?$/i;
// the head of the right-hand pages of Part 3 run into a body line, in the OCR's spellings: [Chap. XXXIX.] CORRESPONDENCE, ETC. - UNION. 631, then the OCR's reading of the page number
const INLINE_CORR = /(?:\[?\s*(?:Chap|CHAP|Ohap|hap|Mat)[.,;:^\s-]{0,3}[\w|]{1,8}[.\]jJ|]{0,3}\s*)?(?:(?:UNION|CONFEDERATE)[’'.]?\s+)?CORRESPONDENCE\s*,?\s*ETC\.?\s*(?:[—–-]{1,3}\s*)?(?:UNION|CONFEDERATE)?\.?(?:\s*(?=[^\s]*\d)[0-9A-Za-z*?'’.,]{1,6}(?:\s[0-9]{1,2}\b)?)?/g;
// "Chap. IXXDLj TJNiON. 318": a head whose middle the OCR lost, run in after a signature
const INLINE_CHAP_UNION = /(?:Chap|CHAP)\.?\s+[\w|]{3,8}[.\]jJ|]{0,2}\s*(?:T?JN?iON|UNION|CONFEDERATE)\.?\s*[0-9A-Za-z*?'’]{0,5}/g;
const INLINE_EVEN_PART = /(?<![A-Za-z0-9])N\.?\s*[CO]\.?,?\s*V[AY]\.?,?\s*W\.?\s*V[AY]\.?,?(?:\s*M[DB]\.?,?)?(?:\s*P[AT]\.?,?)?(?:\s*[EP]TC\.?)?/g;
// the left-hand heads of Part 1 and 2 ("N. C., VA., W. VA., MD., PA., ETC.") in the OCR's broken spellings run into the end of a body line: "upon  V PA., ETC.", "to  JID., PA., ETC.", "626 ? AID., PA., ETC.".
// The one sure anchor is the capitals "ETC." (prose never prints it in capitals) after a state fragment; the run goes left over every token that is a piece of the head (capitals, digits, the OCR's
// one-letter debris) and stops at the first real word.
const ETC_AT = /(?<![A-Za-z0-9])[EP]TC[.,*]?(?![A-Za-z])/g;
const STATE_FRAG = /^[A-Z0-9^*]{1,3}\.?[,.jvyV?;:*^]{0,3}$/;
const HEAD_TOK = /^(?:[A-Z0-9][A-Za-z0-9.]{0,4}[,.;:jvy?]{0,3}|[vyjw*•^|~?'’"]{1,3}|c[vy])$/;
export function stripEtcRun(t) {
  let out = t, hit = false; ETC_AT.lastIndex = 0;
  for (;;) {
    ETC_AT.lastIndex = 0; let m, cut = null;
    while ((m = ETC_AT.exec(out))) {
      const left = out.slice(0, m.index); const toks = []; const re = /\S+/g; let x; while ((x = re.exec(left))) toks.push({ s: x.index, w: x[0] });
      if (!toks.length || !STATE_FRAG.test(toks[toks.length - 1].w)) continue;
      let q = toks.length - 1; while (q - 1 >= 0 && toks.length - q < 9 && HEAD_TOK.test(toks[q - 1].w)) q--;
      // a run that starts at a word the sentence needs ("the") never reaches here (a lower-case word of two letters or more is no token); initials in front of a state fragment are left alone when they are the only company
      cut = { from: toks[q].s, to: m.index + m[0].length }; break;
    }
    if (!cut) break;
    out = out.slice(0, cut.from) + ' ' + out.slice(cut.to); hit = true;
  }
  return { text: out, hit };
}
const HEAD_VOCAB = ['N', 'C', 'O', 'VA', 'YA', 'W', 'MD', 'MB', 'PA', 'ETC', 'PTC', 'CHAP', 'THE', 'GETTYSBURG', 'CAMPAIGN', 'CORRESPONDENCE', 'UNION', 'CONFEDERATE', 'XXXIX', 'XXXLX', 'XXX', 'XL', 'IX'];
// one token alone is a fragment only when it is a word no sentence breaks off with ("Pa.," and "Va.," end a place line that wraps over a page)
const ALONE_OK = new Set(['YA', 'MB', 'PTC', 'ETC', 'CHAP', 'XXXIX', 'XXXLX', 'GETTYSBURG', 'CAMPAIGN', 'CORRESPONDENCE']);
/** a line made only of pieces of a running head ("N. C.,", "YA.j", "Chap. XXXIX.]"), optionally with the page number: the leftovers of a head the OCR broke across lines */
export function isHeadFragment(line, folio = null) {
  const t = line.trim(); if (!t || t.length > 40) return false;
  if (/^\W*(?:UNION|CONFEDERATE)\W{0,2}\s+CORRESPONDENCE/i.test(t) || /^\W*CORRESPONDENCE,?\s*ETC\.?\W*$/i.test(t)) return false;           // a section heading of the volume is the segmenter's, not a head fragment
  if (/^\d{1,4}$/.test(t)) return folio !== null && Math.abs(+t - folio) <= 2;
  // the tail of the right-hand head of Part 3, its first half taken out: '" — CONFEDERATE.', '- UNION.'
  { const m = /^[^A-Za-z0-9]{0,4}[—–-]{1,3}\s*([A-Za-z]{4,12})\.?\W{0,3}$/.exec(t); if (m) { const w = m[1].toUpperCase(); if (dl(w, 'UNION', 2) <= 2 || dl(w, 'CONFEDERATE', 3) <= 3) return true; } }
  { const m = /^([A-Za-z|]{4,8})[.,]?\s*(\d{1,4})$/.exec(t); if (m && dl(m[1].toUpperCase(), 'UNION', 2) <= 2 && folio !== null && Math.abs(+m[2] - folio) <= 2) return true; }     // "TJNiON. 318": the end of a head, garbled
  const toks = t.split(/[\s.,;:\[\]()'’|j?\\]+/).filter((x) => /[A-Za-z]/.test(x));
  if (!toks.length || toks.length > 8) return false;
  if (toks.length === 1 && !ALONE_OK.has(toks[0].toUpperCase())) return false;
  const inVocab = (x) => { const u = x.toUpperCase(); return HEAD_VOCAB.some((h) => h === u || (u.length >= 3 && h.length >= 3 && dl(u, h, 1) <= 1)); };
  // the OCR's debris inside a head ("428 N. C.J VA.j \V. [": a J, a V and a backslash where the commas and the W. VA. were) is no reason to read it as text, when two real pieces of the head stand beside it
  const real = toks.filter((x) => !/^[JVY]$/i.test(x));
  return real.length >= 2 && real.length < toks.length ? real.every(inVocab) : toks.every(inVocab);
}

/**
 * Take the notes out of a cleaned text that carries leaf marks (leaves.mjs: one private-use character per line in front of every leaf).
 * @returns { text, removed: [{ kind, leaf, text }] }
 */
export function stripNotes(text) {
  const lines = text.split('\n'); const drop = new Set(); const removed = [];
  const leafAt = lines.map(leafOfLine);
  const starts = []; leafAt.forEach((l, i) => { if (l >= 0) starts.push(i); });
  const take = (kind, leaf, a, b) => { const t = lines.slice(a, b).map((x) => x.trim()).filter(Boolean).join(' '); for (let i = a; i < b; i++) drop.add(i); removed.push({ kind, leaf, text: t }); };
  starts.forEach((s, n) => {
    const e = n + 1 < starts.length ? starts[n + 1] : lines.length; const leaf = leafAt[s];
    // the foot of the page
    const z = footnoteZone(lines, s + 1, e); if (z) take('footnote', leaf, z.from, z.to);
  });
  // compilers' notes and cross references, wherever they stand: paragraphs of the cleaned text
  for (let i = 0; i < lines.length; i++) {
    if (drop.has(i) || !lines[i].trim() || leafAt[i] >= 0) continue;
    let j = i; while (j + 1 < lines.length && lines[j + 1].trim() && leafAt[j + 1] < 0) j++;
    const para = lines.slice(i, j + 1).map((x) => x.trim()).join(' ');
    const leaf = (() => { for (let q = starts.length - 1; q >= 0; q--) if (starts[q] <= i) return leafAt[starts[q]]; return null; })();
    if (para.length <= 700 && COMPILER_END.test(para) && !/\bthe\s+Compiler\b/.test(para)) take('compiler-note', leaf, i, j + 1);
    else if (CROSSREF.test(para)) take('cross-reference', leaf, i, j + 1);
    i = j;
  }
  // a head run into the middle of a line
  const out = lines.map((l, i) => {
    if (drop.has(i) || leafAt[i] >= 0) return l;
    // a section heading on a line of its own ("CONFEDERATE CORRESPONDENCE, ETC.") is the segmenter's cue for the side of the correspondence; the heads of the pages are taken by the head stripper with their page numbers
    if (SECTION_HEAD.test(l.trim()) || /^\W*(?:UNION|CONFEDERATE)\W{0,2}\s+CORRESPONDENCE,?\s*ETC\.?\W*$/i.test(l.trim())) return l;
    { const um = /^\W*([A-Za-z|]{4,8})[.,]?\s*\d{1,4}\W*$/.exec(l.trim()); if (um && !/^(?:UNION|Union)$/.test(um[1]) && dl(um[1].toUpperCase(), 'UNION', 2) <= 2) { removed.push({ kind: 'head-line', leaf: null, text: l.trim() }); return ''; } }       // "TJNiON. 318": the end of a head, garbled, on a line of its own
    let t = l, dropped = false, moved = false, etcOnly = false;
    // "UNION' CORRESPONDENCE, ETC." and "CONFEDERATE CORRESPONDENCE, ETC." run into a body line are headings of the volume's sections: kept, on a line of their own
    t = t.replace(/(?:Chap|CHAP)\.?\s+[IXLDVCljJ|!1]{3,8}[.\]jJ|!]{0,2}\s*$/, () => { dropped = true; return ' '; });                  // "General . Chap. IXXDLj" at the end of a line: the head's chapter bracket, its rest on the next line
    t = t.replace(/(?<![A-Za-z])([A-Z][A-Za-z]{8,15}),?\s*ETC\.?[-—^\s.]{0,5}(?:UN[A-Za-z]{2,3}|CON[A-Za-z]{3,10})?\.?/g, (m, w) => { if (dl(w.toUpperCase(), 'CORRESPONDENCE', 3) <= 3 && !/^CORRESPONDENCE$/i.test(w)) { dropped = true; return ' '; } return m; });
    { const r = stripEtcRun(t); if (r.hit) { t = r.text; dropped = true; etcOnly = true; } }
    t = t.replace(INLINE_CORR, (m) => { const h = /^\W*(UNION|CONFEDERATE)\W{0,2}\s+CORRESPONDENCE/i.exec(m); if (h) { moved = true; return '\n' + h[1].toUpperCase() + ' CORRESPONDENCE, ETC.\n'; } dropped = true; return ' '; }).replace(INLINE_CHAP_UNION, () => { dropped = true; return ' '; }).replace(INLINE_EVEN_PART, () => { dropped = true; return ' '; });
    if (t !== l) {
      const rest = t.replace(/\n(?:UNION|CONFEDERATE) CORRESPONDENCE, ETC\.\n/g, ' ');
      if (rest.replace(/[^A-Za-z]/g, '').length < 3) {
        // a line that is only a head: left to the head stripper, which takes the page number on a line of its own with it; but a head that carries its own (garbled) page number in the line
        // ("CORRESPONDENCE, ETC. - UNION. 19lT") is one the head stripper cannot read, and goes here
        if (etcOnly && !moved) { removed.push({ kind: 'head-line', leaf: null, text: l.trim().slice(0, 160) }); return ''; }
        if (dropped && (/\d/.test(l) || /Chap|hap\.|Mat\s?\./.test(l))) { removed.push({ kind: 'head-line', leaf: null, text: l.trim().slice(0, 160) }); return ''; }
        return l;
      }
      if (dropped) removed.push({ kind: 'inline-head', leaf: null, text: l.trim().slice(0, 160) }); else if (moved) removed.push({ kind: 'section-heading-moved', leaf: null, text: l.trim().slice(0, 160) });
      t = t.split('\n').map((x) => x.replace(/\s{2,}/g, ' ').trim()).join('\n');
    }
    return t;
  });
  const kept = []; out.forEach((l, i) => { if (!drop.has(i)) kept.push(l); });
  return { text: kept.join('\n'), removed };
}
export { SECTION_HEAD };
