// leaves.mjs - which scan LEAF every character of the Internet Archive's OCR text is on, and which printed page that leaf is.
//
// Why (verifier finding HIGH 1, 2026-10-01): the first build read the printed page of a stretch of text from the running heads inside the OCR text and a dynamic-programming chain over them. A head the
// reader did not recognise ("230 N. o., YA., W. YA.y MD.j PA.? ETC. [Chap.") set no mark, and every word after it kept the page before: 1,060 of 56,648 sentence starts (1.9%) were cited a page too low.
//
// What the Internet Archive publishes for each scan that settles it without guessing:
//   <id>_djvu.txt                   the OCR text the corpus is cut from (one run of text, no page breaks)
//   <id>_hocr_searchtext.txt.gz     the SAME OCR text, leaf by leaf
//   <id>_hocr_pageindex.json.gz     [start char, end char, start byte, end byte] of every leaf in that search text; the index of the entry is the leaf number (leafNum of page_numbers.json)
//   <id>_page_numbers.json          the printed folio the Archive read for each leaf ("" on a plate, a blank, a leaf it could not read)
// The two texts differ only in whitespace (checked for all three volumes: with every run of whitespace collapsed to one blank the 3,370,808 / 3,291,539 / 2,891,286 characters are identical), so the number
// of non-whitespace characters before a leaf in the search text is the number of non-whitespace characters before it in the djvu text, and the leaf's first line is found in the djvu text EXACTLY: no
// matching, no search, no tolerance. A leaf boundary always falls at the start of a line (checked: 0 exceptions over the 2,500 leaves that hold text).
//
// The printed folio of a leaf is the one the Archive read. Across the 3 x ~1,150 leaves of the body the Archive's readings run in one unbroken chain (folio minus leaf number is constant, apart from the
// two places in Part 1 where leaves 470-471 and 886-887 are plates with no folio); a leaf it could not read is given a folio only when the neighbouring leaf's folio and the leaf's OWN printed text
// agree on it (the first page of each part prints its folio in parentheses at its foot: "(1)", "(3)"). Anything else has no folio (page null) and is counted, never guessed.
import { excludedLeaves } from './pagemap.mjs';

export const LEAF_BASE = 0xe100;           // one private-use character per leaf, a line of its own, in front of the leaf's first line (the page marks of the normaliser use U+E000)
export const leafChar = (k) => String.fromCharCode(LEAF_BASE + k);
export const leafOfLine = (line) => (line.length === 1 && line.charCodeAt(0) >= LEAF_BASE && line.charCodeAt(0) < LEAF_BASE + 4000 ? line.charCodeAt(0) - LEAF_BASE : -1);
export const LEAF_MARK_RE = /[-]/g;

const WS = /\s/;
const isWs = (ch) => WS.test(ch);
const codePoints = (s) => (/[\ud800-\udfff]/.test(s) ? Array.from(s) : null);

/** the leaves of the hOCR search text: [{ leaf, text, nws (non-whitespace characters), before (non-whitespace characters before this leaf in the whole text) }] */
export function parseLeafOcr({ searchText, pageIndex }) {
  const cps = codePoints(searchText);
  const slice = (a, b) => (cps ? cps.slice(a, b).join('') : searchText.slice(a, b));
  const leaves = []; let before = 0;
  pageIndex.forEach((e, k) => {
    const text = slice(e[0], e[1]);
    let n = 0; for (const ch of text) if (!isWs(ch)) n++;
    leaves.push({ leaf: k, text, nws: n, before }); before += n;
  });
  return { leaves, total: before };
}

/**
 * Where each leaf that holds text starts in `raw` (the djvu text): the start of the line of its first non-whitespace character. Throws when the two texts do not carry the same number of
 * non-whitespace characters (they are then not the same OCR run and nothing here is exact).
 */
export function leafRawOffsets(raw, parsed) {
  const want = parsed.leaves.filter((l) => l.nws > 0);
  const marks = []; let k = 0, w = 0, i = 0;
  for (const ch of raw) {
    if (!isWs(ch)) {
      while (w < want.length && want[w].before === k) { marks.push({ leaf: want[w].leaf, pos: i }); w++; }
      k++;
    }
    i += ch.length;
  }
  if (k !== parsed.total || w !== want.length) throw new Error(`the djvu text holds ${k} non-whitespace characters and the hOCR search text ${parsed.total}: not the same OCR run`);
  return marks.map((m) => {
    let a = raw.lastIndexOf('\n', m.pos - 1) + 1; if (m.pos === 0) a = 0;
    const exact = !raw.slice(a, m.pos).trim();            // always true on these volumes; if it were not, the mark goes right before the character
    return { leaf: m.leaf, off: exact ? a : m.pos, mid_line: !exact };
  });
}

const bareFolio = (text, c) => {
  const lines = text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const edge = [...lines.slice(0, 3), ...lines.slice(-3)];
  return edge.some((l) => new RegExp(`(?:^|[\\s])\\(${c}\\)(?:$|[\\s])`).test(l) || l === String(c));
};

/**
 * leaf -> printed page. { page (number or null), basis } per leaf; `anomalies` lists consecutive folios the Archive read whose distance is not their leaves' (the plates), `unread_with_text` the leaves that hold
 * text and got no folio.
 */
export function folioMap({ pageNumbers, parsed }) {
  const read = new Map();
  for (const p of (pageNumbers && pageNumbers.pages) || []) if (Number.isInteger(p.leafNum) && /^\d{1,4}$/.test(String(p.pageNumber || ''))) read.set(p.leafNum, +p.pageNumber);
  const out = new Map(); const unreadWithText = []; const inferred = [];
  for (const [leaf, page] of read) out.set(leaf, { page, basis: 'archive' });
  for (const l of parsed.leaves) {
    if (out.has(l.leaf) || l.nws === 0) continue;
    let got = null;
    for (const [nb, delta] of [[l.leaf + 1, -1], [l.leaf - 1, +1]]) {
      if (!read.has(nb)) continue;
      const c = read.get(nb) + delta;
      if (c >= 1 && bareFolio(l.text, c)) { got = { page: c, basis: 'folio-count+printed-foot' }; break; }
    }
    if (got) { out.set(l.leaf, got); inferred.push({ leaf: l.leaf, page: got.page }); }
    else if (l.nws > 100) unreadWithText.push({ leaf: l.leaf, chars: l.nws });
  }
  const anomalies = []; const keys = [...read.keys()].sort((a, b) => a - b);
  for (let i = 1; i < keys.length; i++) { const d = (read.get(keys[i]) - read.get(keys[i - 1])) - (keys[i] - keys[i - 1]); if (d !== 0) anomalies.push({ from: keys[i - 1], to: keys[i], folio_from: read.get(keys[i - 1]), folio_to: read.get(keys[i]) }); }
  return { map: out, inferred, anomalies, unread_with_text: unreadWithText };
}

/**
 * Everything the normaliser and the page map need for one volume:
 *   marks       [{ leaf, off }] raw offsets of the leaf starts (ascending)
 *   folio(leaf) -> printed page or null
 *   reader(leaf) -> the BookReader index (leaf minus the leaves the Archive left out of the access formats), pagemap.mjs
 *   pageOfLeaf, leafOfPage (printed page -> leaf, exact for every folio the map holds)
 */
export function createLeafMap({ raw, searchText, pageIndex, pageNumbers, scandata = null, iaId }) {
  const parsed = parseLeafOcr({ searchText, pageIndex });
  const marks = leafRawOffsets(raw, parsed);
  const f = folioMap({ pageNumbers, parsed });
  const excluded = scandata ? excludedLeaves(scandata) : [];
  const reader = (leaf) => { let n = 0; for (const x of excluded) { if (x < leaf) n++; else break; } return leaf - n; };
  const byPage = new Map(); for (const [leaf, v] of f.map) if (!byPage.has(v.page)) byPage.set(v.page, leaf);
  const folio = (leaf) => { const v = f.map.get(leaf); return v ? v.page : null; };
  const url = (leaf) => `https://archive.org/details/${iaId}/page/n${reader(leaf)}/mode/1up`;
  return {
    iaId, parsed, marks, folio, reader, url, leafOfPage: (page) => (byPage.has(page) ? byPage.get(page) : null),
    texts: new Map(parsed.leaves.map((l) => [l.leaf, l.text])),
    report: { leaves: parsed.leaves.length, leaves_with_text: marks.length, folios_read: [...f.map.values()].filter((v) => v.basis === 'archive').length, folios_inferred: f.inferred, folio_chain_breaks: f.anomalies, unread_with_text: f.unread_with_text, mid_line_starts: marks.filter((m) => m.mid_line).length },
  };
}
