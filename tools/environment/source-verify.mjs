// Shared checks used by the builders, the validators and the tests of tools/environment and tools/ledger:
// locate a verbatim quote on the leaves of an Internet Archive scan, derive the printed page of a leaf from its own running head,
// and cut the small text window that is committed as an offline snapshot of what the source said.
import { alnumKey, loadIaLeaves, excludedLeaves, readerIndex, leafText } from './ia-pages.mjs';
import { CACHE_DIR } from './fetch.mjs';
import path from 'node:path';

/** the printed page number found in a leaf's running head or foot, or null. Looks at the first two and last two OCR lines only. */
export function headerPage(lines) {
  if (!lines || !lines.length) return null;
  const cands = [lines[0], lines[1], lines[lines.length - 1], lines[lines.length - 2]].filter(Boolean);
  for (const raw of cands) {
    const s = raw.trim(), letters = (s.match(/[A-Za-z]/g) || []).length;
    let m = /^\[?(\d{1,4})\]?$/.exec(s);                                   // a line that is only a page number: "[20]" or "403"
    if (!m && letters >= 6) m = /^\[?(\d{1,4})\]?\s+\S/.exec(s) || /\S\s+\[?(\d{1,4})\]?$/.exec(s); // "346 N. C., VA. ..." or "... CAMPAIGN. 187"
    if (m) { const n = +m[1]; if (n >= 1 && n <= 2000) return n; }
  }
  return null;
}

/**
 * printed page of a leaf. Every leaf within 3 positions votes: a header number h at offset k implies page h - k (consecutive leaves are consecutive pages).
 * The most-voted page wins, so one OCR-garbled header ("82" for 32) is outvoted by its neighbours; a leaf with no header of its own (a chapter-opening
 * page) takes its neighbours' page. Ties go to the leaf's own header. Returns { page, basis: 'header' | 'neighbours' | 'none', own }.
 */
export function pageOfLeaf(leaves, leaf) {
  const own = headerPage(leaves[leaf]);
  const votes = new Map();
  if (own != null) votes.set(own, 1.5); // the leaf's own header counts a little more than one neighbour
  for (const k of [-3, -2, -1, 1, 2, 3]) {
    const h = leaves[leaf + k] ? headerPage(leaves[leaf + k]) : null;
    if (h != null) votes.set(h - k, (votes.get(h - k) || 0) + 1);
  }
  if (!votes.size) return { page: null, basis: 'none', own };
  const [page, v] = [...votes.entries()].sort((a, b) => b[1] - a[1])[0];
  if (own != null && page === own) return { page, basis: 'header', own };
  return v >= 2 ? { page, basis: own == null ? 'neighbours' : 'neighbours (own header disagrees)', own } : { page: own, basis: 'header', own };
}

/** leaves (0-based) whose text contains the quote (alnum comparison), also looking across a page break; returns [{ leaf, spans }] */
const keyCache = new WeakMap(); // leaves array -> per-leaf alnum keys (computed once: the big volumes have over a thousand leaves)
export function locateQuote(leaves, quote) {
  const q = alnumKey(quote), out = [];
  if (!q) return out;
  if (!keyCache.has(leaves)) keyCache.set(leaves, leaves.map((l) => alnumKey(l.join(' '))));
  const keys = keyCache.get(leaves);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].includes(q)) out.push({ leaf: i, spans: false });
    else if (i + 1 < keys.length) {
      const join = keys[i].slice(-q.length) + keys[i + 1].slice(0, q.length);
      if (join.includes(q)) out.push({ leaf: i, spans: true });
    }
  }
  return out;
}

/** a window of the leaf's OCR text around the quote (for the committed offline snapshot) */
export function windowAround(leaves, leaf, quote, radius = 160) {
  const text = leafText(leaves[leaf]);
  // find the quote's start by matching the first 24 alnum characters through a regex that tolerates punctuation and spaces between them
  const q = alnumKey(quote);
  const head = q.slice(0, 24).split('').map((c) => c.replace(/[^A-Za-z0-9]/g, '')).join('[^A-Za-z0-9]*');
  const m = new RegExp(head).exec(text);
  const at = m ? m.index : 0;
  return text.slice(Math.max(0, at - radius), Math.min(text.length, at + quote.length + radius)).trim();
}

/** all witnesses for one IA scan are described by { ia, kind } ('djvu' or 'abbyy'); returns { leaves } or throws if the cache is empty and fetching fails */
export async function witnessLeaves(w, offline = false) {
  const r = await loadIaLeaves(w.ia, { kind: w.kind || 'djvu', offline });
  return r.leaves;
}
export const scandataFile = (ia) => path.join(CACHE_DIR, `ia-${ia}-scandata.xml`);
export function readerN(ia, leaf) { const ex = excludedLeaves(scandataFile(ia)); return ex ? readerIndex(leaf, ex) : null; }

/** check one recorded witness { ia, kind, leaf, printed_page } against its cached scan; returns an array of problem strings (empty = ok) */
export async function checkWitness(w, quoteText, offline = false) {
  const problems = [];
  const leaves = await witnessLeaves(w, offline);
  if (w.leaf < 0 || w.leaf >= leaves.length) return [`leaf ${w.leaf} is outside the scan (${leaves.length} leaves)`];
  const hits = locateQuote(leaves, quoteText).map((h) => h.leaf);
  if (!hits.includes(w.leaf)) problems.push(`quote not found on leaf ${w.leaf} of ${w.ia}` + (hits.length ? ` (found on leaf ${hits.join(',')})` : ' (found nowhere in the scan)'));
  if (w.printed_page != null && !w.page_note) {
    const p = pageOfLeaf(leaves, w.leaf);
    if (p.page == null) problems.push(`cannot derive the printed page of leaf ${w.leaf} from its header or neighbours`);
    else if (p.page !== Number(w.printed_page) && !(w.spans && p.page + 1 === Number(w.printed_page))) problems.push(`printed page ${w.printed_page} recorded, header of leaf ${w.leaf} says ${p.page} (${p.basis})`);
  }
  return problems;
}
