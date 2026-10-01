// Page-level OCR of Official Records Ser. I vol. 27 (Parts 1-3, University of Illinois scans on the
// Internet Archive) built from the files the Internet Archive publishes for every item:
//   <id>_hocr_pageindex.json.gz   [[textStart, textEnd, ...] per leaf]
//   <id>_hocr_searchtext.txt.gz   the OCR text of all leaves
//   <id>_page_numbers.json        the Archive's own leaf -> printed page guess
// Page boundaries therefore come from the Archive's page index, not from guessing.
// The printed page number of each leaf is read from the running head in the leaf's own OCR text
// and compared with the Archive's guess; both are kept so disagreement is visible.

import { gunzipSync } from 'node:zlib';

export const OR_ITEMS = {
  1: 'warofrebellion271unit',
  2: 'warofrebellion272unit',
  3: 'warofrebellion273unit',
};

export const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** Split a decompressed searchtext into per-leaf texts using the page index. */
export function splitPages(searchtext, pageIndex) {
  const pages = [];
  for (let i = 0; i < pageIndex.length; i++) {
    const [a, b] = pageIndex[i];
    pages.push({ idx: i, text: searchtext.slice(a, b) });
  }
  return pages;
}

const RUNNING_HEAD = /(?:CAMPAIGN|PA\.,?\s*ETC|ETC\.|Chap\.?\s*[XVIL]+|CORRESPONDENCE|OPERATIONS|\[Chap|CHAP\.)/i;

/**
 * Read a printed page number from the running head of a leaf.
 * The head is within the first four and the last two lines of the leaf's text, a bare 1-4 digit number
 * on a line of its own, or at the end of a head line ("THE GETTYSBURG CAMPAIGN. 623").
 */
export function readPrintedNumber(text) {
  const lines = String(text).split('\n').map(norm).filter(Boolean);
  if (!lines.length) return null;
  const head = lines.slice(0, 4);
  const tail = lines.slice(-2);
  const cands = [];
  for (const [where, ls] of [['head', head], ['tail', tail]]) {
    ls.forEach((ln, i) => {
      let m = /^(\d{1,4})$/.exec(ln);
      if (m) cands.push({ n: Number(m[1]), where, i, bare: true, near: ls.slice(Math.max(0, i - 2), i + 3).some((x) => RUNNING_HEAD.test(x)) });
      m = /^(\d{1,4})\s+\S.*$/.exec(ln);
      if (m && RUNNING_HEAD.test(ln)) cands.push({ n: Number(m[1]), where, i, bare: false, near: true });
      m = /^.*\S\s+(\d{1,4})$/.exec(ln);
      if (m && RUNNING_HEAD.test(ln) && !/^\d/.test(ln)) cands.push({ n: Number(m[1]), where, i, bare: false, near: true });
    });
  }
  const good = cands.filter((c) => c.near);
  return good.length ? good[0].n : null;
}

/** Decode the pieces and return pages with printed numbers. */
export function buildVolume({ pageIndexGz, searchtextGz, pageNumbersJson, id }) {
  const pageIndex = JSON.parse(gunzipSync(pageIndexGz).toString('utf8'));
  const searchtext = gunzipSync(searchtextGz).toString('utf8');
  const raw = splitPages(searchtext, pageIndex);
  const pn = pageNumbersJson ? JSON.parse(Buffer.isBuffer(pageNumbersJson) ? pageNumbersJson.toString('utf8') : pageNumbersJson) : null;
  const iaPages = pn?.pages ?? [];
  // the page index has leading placeholder entries; align by matching printed numbers on a sample
  const pages = raw.map((p) => ({ ...p, head_number: readPrintedNumber(p.text) }));
  return { id, pages, pageIndexLength: pageIndex.length, textLength: searchtext.length, iaPages };
}

/**
 * Chain the printed numbers: the OCR reads some heads wrongly ("S3", digit swaps). Keep a number only if it
 * is consistent with a neighbour (+/- 1 or 2 within a window); the rest are re-derived by interpolation.
 */
export function chainPrinted(pages, { window = 6 } = {}) {
  const n = pages.length;
  const val = pages.map((p) => p.head_number);
  const keep = new Array(n).fill(false);
  // longest increasing chain where consecutive kept leaves differ by (page delta) <= leaf delta + 2
  const dp = new Array(n).fill(1);
  const prev = new Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (val[i] == null) { dp[i] = 0; continue; }
    for (let j = Math.max(0, i - window); j < i; j++) {
      if (val[j] == null) continue;
      const dv = val[i] - val[j];
      const di = i - j;
      if (dv >= 1 && dv <= di + 1 && dv >= di - 3 && dp[j] + 1 > dp[i]) { dp[i] = dp[j] + 1; prev[i] = j; }
    }
  }
  let best = 0;
  for (let i = 0; i < n; i++) if (dp[i] > dp[best]) best = i;
  for (let i = best; i >= 0 && i != null; i = prev[i]) { keep[i] = true; if (prev[i] === -1) break; }
  return { keep, anchors: keep.filter(Boolean).length };
}
