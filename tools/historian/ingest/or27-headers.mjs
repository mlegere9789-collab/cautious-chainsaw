// or27-headers.mjs - finding the header of a report the strict detector (or27.mjs HEADER) did not read.
//
// The strict detector wants "No. 196." alone on a line and a line that starts "Report of" right after it. The volumes print the headers in a few damaged shapes, and each is a CLASS, not a one-off:
//   words lost       "No. 389.\n\nport of Col. William H. Ball"  "Eeporf o/ Brig. Gen."  "Bevort of Surg."  "Be ports of Col."  "report of" (lower case)
//   columns scrambled "No. 225.\n\n\nyytt\n\n\nReports of Brig.\n\n\nGen. Alfred T. A. Torbert ,\nmanding First Brigade."   "Reports of Mctj. Gen.\n\n\nHo. 30.\n\nJohn Newton, TJ. S."
//   not a "Report"    "No. 400.\n\nRecord of a Court of Inquiry"  "No. 424.\n\nOrganization of the Army of Northern Virginia"  "No. 423.\n\nMedals of Honor for battle of Gettysburg."
//   number unreadable  "]VTo\n\nReport of Col. B. Wilkinson" (the contents-author recovery in or27.mjs already handles this one)
// What they share is what the contents list says: the number the run expects next and the author's name. A header is accepted for a number the contents list (or the run) EXPECTS and for no other,
// between two reports already found, so a cross reference ("see No. 212 F Street") can never open a report. Every report found here is marked `recovered` with the rule that found it.
import { dl } from '../../../historian-src/core/text.js';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// the number line in its OCR spellings ("No. 30.", "Ho. 30.", "N0. 30", "■No. 107.", "ISTo. 68.", "No* 81 —"): the number alone on the line, or followed by two punctuation marks and a stray glyph
// the prefix is whatever 1 to 5 characters the OCR made of "No." (N, H, K, X or I first: "Np. 81.", "Ho. 30.", "ISTo. 68.", "N0. 64"); only the EXPECTED number can match, so a liberal prefix cannot open a wrong report
const numLine = (n) => new RegExp(String.raw`(?:^|\n)[ \t]*[^\w\n]{0,3}[NHKXI][A-Za-z0-9*'‘’!;]{0,4}[.,:;]?[ \t]*${n}(?!\d)[ \t]*[.,:\-—]{0,2}[ \t]*\S{0,3}[ \t]*(?=\n)`, 'g');
// the words a report header starts with, in the ways the OCR spelled them
const REPORTISH = /^(?:[A-Za-z]{0,3}e?p[oa]r[tfl]s?|[Rr]e?po?rt|[Bb]e?vort|[Rr]ecord|Organization|Abstracts?|Itinerar\w+|General|Return|Extracts?|Congratulatory|Address|Circular|Medals?|Proceedings|Roll|Orders?|Statement|Telegrams?|Letters?|Correspondence|Journal|Diary|Notes?|Summary|Memorandum)\b/;
const surnameOf = (title) => {
  const author = String(title || '').split(',')[0].replace(/[^A-Za-z .'\-]/g, ' ');
  return author.split(/\s+/).filter((x) => x.length > 2 && !/^(?:Col|Maj|Gen|Capt|Lieut|Brig|Surg|Rev|Hon|Sergt|Prof|Dr|Mr|jr|Medical|Inspector|Asst|Assistant)\.?$/i.test(x)).pop() || null;
};
/** how much of what the contents list names for report `no` is in `s` (0..1): its author's surname, then the words of the title */
export function titleOverlap(s, title) {
  const tok = (x) => (String(x).toLowerCase().match(/[a-z]{3,}/g) || []);
  const a = new Set(tok(s)), b = tok(title).filter((w) => !/^(?:the|and|army|col|maj|gen|capt|lieut|brig|commanding|infantry|volunteers)$/.test(w));
  if (!b.length) return 0;
  let hit = 0; for (const w of b) if (a.has(w) || [...a].some((v) => v.length > 4 && w.length > 4 && dl(v, w, 1) <= 1)) hit++;
  return hit / b.length;
}

/**
 * @param text   normalised volume text
 * @param lo,hi  the window between the two neighbouring reports (the previous header's end, the next header's start)
 * @param no     the report number being looked for
 * @param toc    its contents entry or null
 * @returns { start, headerEnd, header, rule } or null
 */
export function findHeader(text, lo, hi, no, toc) {
  const gap = text.slice(lo, hi);
  const sur = toc ? surnameOf(toc.title) : null;
  // (a) the number line itself, then a header-ish line (or the author's surname) within six lines
  const re = numLine(no); let m;
  while ((m = re.exec(gap))) {
    const lineStart = m.index + (m[0].startsWith('\n') ? 1 : 0), after = gap.slice(m.index + m[0].length, m.index + m[0].length + 700);
    const lines = after.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 6);
    const head = lines.join(' ');
    const first = (lines[0] || '').replace(/^[^A-Za-z]+/, '');
    const ok = REPORTISH.test(first) || (sur && new RegExp('\\b' + esc(sur) + '\\b', 'i').test(head)) || (toc && titleOverlap(head, toc.title) >= 0.5) || (!toc && lines.length && /\b(?:Col|Maj|Gen|Capt|Lieut|Brig|Surg)\b/.test(head) && /[Rr]eport|[Rr]eports/.test(head));
    if (!ok) continue;
    // the header text: the lines up to the first blank gap that follows the title (a title may break over lines), at most 4 lines
    const hdr = []; let pos = m.index + m[0].length; let blanks = 0;
    for (const raw of gap.slice(pos, pos + 600).split('\n')) {
      pos += raw.length + 1;
      if (!raw.trim()) { blanks++; if (hdr.length && blanks >= 2) break; continue; }
      blanks = 0; hdr.push(raw.trim()); if (hdr.length >= 4) break;
    }
    return { start: lo + lineStart, headerEnd: lo + Math.min(gap.length, pos), header: hdr.join(' ').replace(/\s+/g, ' ').trim(), rule: 'number-line' };
  }
  // (b) the title scrambled across columns: "Reports of" (any spelling) then, within 160 characters over a few lines, the author's surname
  if (sur) {
    const re2 = new RegExp(String.raw`(?:^|\n)[ \t]*((?:[A-Za-z]{0,3}e?p[oa]r[tfl]s?|[Rr]e?po?rt|[Bb]e?vort)[ \t]+(?:of|o/|ot)\b[^\n]*(?:\n[ \t]*[^\n]*){0,5}?[^\n]*?\b${esc(sur)}\b[^\n]*)`, 'g');
    let k;
    while ((k = re2.exec(gap))) {
      const block = k[1];
      if (block.length > 260) continue;
      if (toc && titleOverlap(block, toc.title) < 0.34) continue;
      const lineStart = k.index + (k[0].startsWith('\n') ? 1 : 0);
      return { start: lo + lineStart, headerEnd: lo + k.index + k[0].length, header: block.replace(/\s+/g, ' ').trim(), rule: 'author-columns' };
    }
  }
  return null;
}
