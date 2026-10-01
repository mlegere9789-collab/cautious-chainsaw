// heads.mjs - running heads and signature marks of the Official Records, found by what they SAY and not by the exact way one OCR run happened to misspell them.
// Vol. 27 prints three kinds of mark on every page, and the ABBYY text carries each of them in dozens of spellings ("Chap. XXXIX.]", "/Hap. XXXIX]", "Chap. iXXIX.]", "THE GETTYSBURG- CAMPAIGN.",
// "THE GETTYSBURG! CAMPAIGN", "THE GETTY SBU KG CAMPAIGN", "32 R R- VOL XXVPI, PT I", "21 R R- VOL XXVII, FT I", "38 R R - VOL XXVII, RX I"):
//   chap    "[CHAP. XXXIX.]"                       the chapter head: a word within one edit of CHAP, then a roman numeral within two edits of XXXIX
//   title   "THE GETTYSBURG CAMPAIGN."             the running title: capitals, GETTYSBURG then CAMPAIGN (each within three edits, either may be split in two or three pieces by the OCR)
//   sig     "2 R R - VOL XXVII, PT I"              the sheet signature: VOL then a roman numeral within two edits of XXVII, with the short tokens (sheet number, "R R", "PT I") around it
// Two detectors share the code and differ in tolerance: the STRIPPER (tol 1) removes what it is sure is a head; the COUNTER (tol 1.6) reports anything that still looks like one, so a head
// that is left in the text is counted even when the stripper did not recognise it (verifier defect R-02: the counter used the stripper's own spellings and reported 0 while 11 heads remained).
import { dl } from '../../../historian-src/core/text.js';

const core = (t) => t.replace(/[^A-Za-z]/g, '').toUpperCase();
const digitsOnly = (t) => /^\d{1,4}$/.test(t.replace(/[^\dA-Za-z]/g, '')) && /\d/.test(t) && !/[A-Za-z]/.test(t);
const tokensOf = (line) => [...line.matchAll(/\S+/g)].map((m) => ({ t: m[0], s: m.index, e: m.index + m[0].length, c: core(m[0]) }));
const upperRatio = (s) => { const l = s.replace(/[^A-Za-z]/g, ''); return l.length ? l.replace(/[^A-Z]/g, '').length / l.length : 0; };
// a quantity after a head is not its page number ("Chap. XXXIX.] 12 killed")
const QUANTITY = /^(?:MEN|KILLED|WOUNDED|MISSING|MILES?|PER|HORSES|GUNS|ROUNDS|PRISONERS|DAYS?|HOURS?|OCLOCK|AM|PM)$/;

/** the best reading of tokens i.. (1 to maxSpan tokens glued) as the word `canon`: { end, d } (end = index after the last token used) or null */
function word(tokens, i, canon, tol, maxSpan = 1) {
  let best = null, acc = '';
  for (let k = 0; k < maxSpan && i + k < tokens.length; k++) {
    acc += tokens[i + k].c;
    if (acc.length > canon.length + tol) break;
    if (Math.abs(acc.length - canon.length) > tol) continue;
    const d = dl(acc, canon, tol);
    if (d <= tol && (!best || d < best.d)) best = { end: i + k + 1, d };
  }
  return best;
}
// a roman numeral in the OCR's hands: the canonical numeral's first letter, at least three letters, within `tol` edits
const roman = (c, canon, tol) => c.length >= 3 && (c[0] === canon[0] || (canon[0] === 'X' && c[0] === 'K') || /XX/.test(c)) && dl(c, canon, tol) <= tol;
// a numeral that ends the way a chapter head ends: a bracket-like character after it ("XXXIX.]", "XXXlX.j", "XXXIX]", "XXXIX.f")
const BRACKETED = /X{2,3}[IlLxX1]{0,2}[.,]?[\]\)jJfF|!1]/;
const SIGPRE = /^(?:[RUBK]|UR|RR)$/;                            // the printer's "R R", and what the OCR made of it ("R U", "Ur R", "r r", "R r")
const SIGTAIL = /^(?:[PFR][TIXJL]|P|T|[IJL1]{1,3})$/;   // "PT I", "FT I", "RX I", "PT II"

/** spans [s, e) of the heads in `line`; kind 'chap' | 'title' | 'sig'; `page` when a page number was adjacent. tol 1 = the stripper, 1.6 = the counter */
export function headSpans(line, tol = 1) {
  const T = tokensOf(line); const out = []; const used = new Array(T.length).fill(false);
  const take = (kind, a, b, extra = {}) => { for (let k = a; k < b; k++) used[k] = true; out.push({ kind, s: T[a].s, e: T[b - 1].e, a, b, ...extra }); };
  const page = (b) => (b < T.length && !used[b] && digitsOnly(T[b].t) && !QUANTITY.test(T[b + 1] ? T[b + 1].c : '') ? +T[b].t.replace(/\D/g, '') : undefined);
  const tc = Math.max(1, Math.round(1 * tol)), tt = Math.round(3 * tol), ts = Math.max(1, Math.round(2 * tol / 1.0));
  // ---- signature: VOL, a roman numeral near XXVII, then the short tokens around it
  for (let i = 0; i < T.length; i++) {
    if (used[i] || T[i].c.length > 4 || T[i].c.length < 1) continue;
    const vw = word(T, i, 'VOL', tc, 2); if (!vw) continue;                                               // "VOL", "VO L", "V0L"
    let r = null; for (const span of [1, 2]) { const w = word(T, vw.end, 'XXVII', tc, span); if (w && roman(T.slice(vw.end, w.end).map((x) => x.c).join(''), 'XXVII', tc)) { r = w; break; } }
    if (!r) continue;
    let b = r.end; for (let g = 0; g < 4 && b < T.length && !used[b] && (SIGTAIL.test(T[b].c) || (T[b].c === '' && /^[,.;:\-—–]+$/.test(T[b].t))); g++) b++;      // "PT I", "XXVI , PT II": a stray comma is part of it
    let a = i, marks = 0; for (let g = 0; g < 4 && a > 0 && !used[a - 1] && (T[a - 1].c.length === 1 || SIGPRE.test(T[a - 1].c) || digitsOnly(T[a - 1].t) || /^[-—–_.]+$/.test(T[a - 1].t)); g++) { if (SIGPRE.test(T[a - 1].c)) marks++; a--; }
    if (!marks && b === r.end) continue;                                                              // neither "R R" before it nor "PT I" after it: a reference to a volume, not the sheet signature
    take('sig', a, b);
  }
  // ---- chapter head: CHAP-ish (one token, or two: "Ch ap.") then a numeral near XXXIX within three tokens (in one to three pieces: "XXX IX.]"); or a bracketed numeral with a short junk word before it
  // the numeral starts with an X, or carries the head's closing bracket ("KXXIX.]"); "than six" is not "Chap. XXXIX"
  const numeral = (j) => {
    const lim = Math.max(2, Math.round(2 * tol)); let best = null;
    for (const span of [1, 2, 3]) {
      if (T.length < j + span) break;
      const c = T.slice(j, j + span).map((x) => x.c).join('');
      if (c.length < 3 || c.length > 8 || !/X/.test(c) || !(c[0] === 'X' || /XX/.test(c) || BRACKETED.test(T[j].t) || BRACKETED.test(T[j + span - 1].t)) || !T.slice(j, j + span).every((x) => !used[j] && x.c.length > 0 && x.t.length <= 9)) continue;
      const d = dl(c, 'XXXIX', lim); if (d <= lim && (!best || d < best.d || (d === best.d && span > best.span))) best = { d, span };     // the best reading, the longer on a tie: "XXX IX.]" is one numeral
    }
    return best ? j + best.span : -1;
  };
  for (let i = 0; i < T.length; i++) {
    if (used[i]) continue;
    // a CHAP word two edits away must still hold "AP" ("CriAP", "IfiAP", "Cnap", "Ceap"): "than", "chip", "chat" are words
    const capish = (w) => (w && (w.d <= 1 || /AP/.test(T.slice(i, w.end).map((x) => x.c).join(''))) ? w : null);
    const cw = T[i].c.length >= 2 && T[i].c.length <= 5 ? capish(word(T, i, 'CHAP', Math.max(1, Math.round(1 * tol)), 2)) : null;
    const nextStrong = i + 1 < T.length && !used[i + 1] && roman(T[i + 1].c, 'XXXIX', 1);
    const cw2 = !cw && T[i].c.length >= 3 && T[i].c.length <= 5 && nextStrong ? capish(word(T, i, 'CHAP', 2, 1)) : null;
    const chapEnd = (cw || cw2) ? (cw || cw2).end : -1;
    const junk = chapEnd < 0 && T[i].c.length >= 2 && T[i].c.length <= 6 && i + 1 < T.length && !used[i + 1] && BRACKETED.test(T[i + 1].t) && roman(T[i + 1].c, 'XXXIX', Math.max(2, Math.round(2 * tol)));
    if (chapEnd < 0 && !junk) continue;
    for (let j = chapEnd >= 0 ? chapEnd : i + 1; j < Math.min(T.length, (chapEnd >= 0 ? chapEnd : i + 1) + 3); j++) {
      if (used[j]) break;
      const e = numeral(j);
      if (e > 0 && (chapEnd >= 0 || BRACKETED.test(T[j].t))) {
        const pg = page(e);
        take('chap', i > 0 && !used[i - 1] && /^[\[\]/#•'"~-]+$/.test(T[i - 1].t) ? i - 1 : i, pg !== undefined ? e + 1 : e, pg !== undefined ? { page: pg } : {});
        break;
      }
      if (T[j].c.length > 8) break;
    }
  }
  if (!out.length && T.length >= 2 && T.length <= 3 && word(T, 0, 'CHAP', 2, 1) && /^X[XILTJF1]{2,6}$/.test(T[1].c) && T.every((x) => x.t.length <= 12)) take('chap', 0, T.length);
  // ---- running title: (THE) GETTYSBURG CAMPAIGN in capitals
  for (let i = 0; i < T.length; i++) {
    if (used[i]) continue;
    const g = word(T, i, 'GETTYSBURG', tt, 3); if (!g) continue;
    const cm = word(T, g.end, 'CAMPAIGN', tt, 3); if (!cm) continue;
    const spanText = line.slice(T[i].s, T[cm.end - 1].e);
    if (upperRatio(spanText) < 0.6 && !(i <= 1 && cm.end >= T.length - 1)) continue;                 // the body says "the Gettysburg Campaign"; only the capitals are the head
    let a = i; if (a > 0 && !used[a - 1] && T[a - 1].c.length <= 5 && dl(T[a - 1].c, 'THE', 2) <= 2) a--;   // "THE", "TllE", "ME", "tiLHE"
    const pg = page(cm.end);
    take('title', a, pg !== undefined ? cm.end + 1 : cm.end, pg !== undefined ? { page: pg } : {});
  }
  return out.sort((x, y) => x.s - y.s);
}

/** remove every head from a line: { text, found: [spans], page } (page = the printed page a head carried, when it carried one) */
export function stripHeads(line, tol = 1) {
  const sp = headSpans(line, tol);
  if (!sp.length) return { text: line, found: sp, page: null };
  let t = '', at = 0, page = null;
  for (const x of sp) { t += line.slice(at, x.s) + ' '; at = x.e; if (x.page && x.page <= 1400 && page === null) page = x.page; }
  t += line.slice(at);
  t = t.replace(/\s{2,}/g, ' ').trim();
  // what a head leaves of a line that held nothing else is a fragment of the head ("IJ", ", PT II", "Cba"), not text: a remainder with no word of four letters and fewer than twelve letters goes with it
  if (t && t.replace(/[^A-Za-z]/g, '').length < 12 && !/[A-Za-z]{4,}/.test(t) && !/\d{2,}/.test(t)) t = '';
  return { text: t, found: sp, page };
}

// ---- the counter ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// The counter reports anything that still LOOKS like a head or the remnant of one. It is deliberately generous (it only has to be right when it says "none left") and it is a different detector from the
// stripper: the head detectors at their loose tolerance, plus these structural remnants, which need no CHAP / VOL word at all:
//   a roman-looking token of the chapter head's kind that ends in the head's closing bracket ("XIX.]", "KXIX.]", "XXIX]", "XKXIX.]")
//   VOL (within two edits, possibly split) next to a roman-looking token of three letters or more and a short token of the signature ("VOL XVII, PT IJ", "VO L XXVI , PT II", "R R - VOL KXVII")
const ROMANISH = /^[XKIL1JVTF]{3,8}$/;
const CLOSER = /[\]\)jJfF|!]$/;
export function countHeads(line) {
  let n = headSpans(line, 1.6).length;
  const T = tokensOf(line);
  for (let i = 0; i < T.length; i++) {
    const c = T[i].c;
    if (c.length >= 2 && /X|K/.test(c) && ROMANISH.test(c) && CLOSER.test(T[i].t.replace(/[.,;:]+$/, '')) && (c.replace(/[^XK]/g, '').length >= 2 || /^X?[IL1J]{1,3}[.,]?[\]\)jJfF|!]/.test(T[i].t))) n++;   // "XXIX.]", "KXIX.]", "IX.]"
  }
  for (let i = 0; i < T.length; i++) {
    if (!word(T, i, 'VOL', 2, 2)) continue;
    const w = word(T, i, 'VOL', 2, 2); const nx = T.slice(w.end, w.end + 2);
    if (nx.some((x) => ROMANISH.test(x.c) && /X|V/.test(x.c) && dl(x.c, 'XXVII', 3) <= 3) && (T.slice(Math.max(0, i - 4), i).some((x) => /^[RUBKH]$/.test(x.c)) || T.slice(w.end, w.end + 5).some((x) => /^(?:[PFR][TIXJL]|IL|LI)$/.test(x.c)))) n++;
  }
  return n;
}
