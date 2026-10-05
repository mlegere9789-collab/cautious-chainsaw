// Per-leaf OCR text of an Internet Archive item: from its djvu.xml (preferred) or ABBYY XML, the OCR layers IA itself serves as the text of the scan.
// A "leaf" is the 0-based image index in the item (IA scandata leafNum, which is also the order of pages in djvu.xml/ABBYY). The BookReader URL uses a
// different index ("#page/n<N>") because cover, colour-card and deleted leaves are not shown: readerIndex() computes N from scandata when it is cached.
// Cached under tmp/env-cache/ via fetch.mjs; the committed data stores only short verbatim quotes with their leaf and printed page.
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fetchCached } from './fetch.mjs';

const ent = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unesc = (s) => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => (n in ent ? ent[n] : m));

/** parse ABBYY XML text into an array of pages; each page is an array of line strings */
export function parseAbbyy(xml) {
  const pages = [];
  const pageRe = /<page [^>]*>([\s\S]*?)<\/page>/g;
  let pm;
  while ((pm = pageRe.exec(xml))) {
    const lines = [];
    const lineRe = /<line [^>]*>([\s\S]*?)<\/line>/g;
    let lm;
    while ((lm = lineRe.exec(pm[1]))) {
      let s = '';
      const chRe = /<charParams([^>]*)>([^<]*)<\/charParams>/g;
      let cm;
      while ((cm = chRe.exec(lm[1]))) {
        if (/wordStart="true"/.test(cm[1]) && s && !s.endsWith(' ')) s += ' ';
        s += cm[2] === '' ? ' ' : unesc(cm[2]);
      }
      s = s.replace(/\s+/g, ' ').trim();
      if (s) lines.push(s);
    }
    pages.push(lines);
  }
  return pages;
}

/** parse DjVuXML into an array of pages (one per OBJECT, in leaf order); each page is an array of line strings */
export function parseDjvuXml(xml) {
  const pages = [];
  const objRe = /<OBJECT [^>]*>([\s\S]*?)<\/OBJECT>/g;
  let om;
  while ((om = objRe.exec(xml))) {
    const lines = [];
    const lineRe = /<LINE>([\s\S]*?)<\/LINE>/g;
    let lm;
    while ((lm = lineRe.exec(om[1]))) {
      const words = [];
      const wRe = /<WORD[^>]*>([^<]*)<\/WORD>/g;
      let wm;
      while ((wm = wRe.exec(lm[1]))) words.push(unesc(wm[1]).trim());
      const s = words.join(' ').replace(/\s+/g, ' ').trim();
      if (s) lines.push(s);
    }
    pages.push(lines);
  }
  return pages;
}

const memo = new Map();
/** { leaves: string[][], meta, kind } for an IA identifier. kind 'djvu' (<id>_djvu.xml) or 'abbyy' (<id>_abbyy.gz). */
export async function loadIaLeaves(id, { kind = 'djvu', cacheName, offline = false } = {}) {
  const key = id + '|' + kind;
  if (memo.has(key)) return memo.get(key);
  let out;
  if (kind === 'djvu') {
    const r = await fetchCached(`https://archive.org/download/${id}/${id}_djvu.xml`, { name: cacheName || `ia-${id}-djvu.xml`, offline });
    out = { leaves: parseDjvuXml(fs.readFileSync(r.file, 'utf8')), meta: r.meta, kind };
  } else {
    const r = await fetchCached(`https://archive.org/download/${id}/${id}_abbyy.gz`, { name: cacheName || `ia-${id}-abbyy.gz`, offline });
    out = { leaves: parseAbbyy(zlib.gunzipSync(fs.readFileSync(r.file)).toString('utf8')), meta: r.meta, kind };
  }
  memo.set(key, out);
  return out;
}

/** leafNum -> printed page string from IA's <id>_page_numbers.json (machine-detected; may be wrong, so callers verify against the leaf's own text) */
export async function loadIaPageNumbers(id) {
  const r = await fetchCached(`https://archive.org/download/${id}/${id}_page_numbers.json`, { name: `ia-${id}-page_numbers.json` });
  const j = JSON.parse(fs.readFileSync(r.file, 'utf8'));
  const m = new Map();
  for (const p of j.pages) if (p.pageNumber !== '' && p.pageNumber != null) m.set(p.leafNum, String(p.pageNumber));
  return m;
}

/** leaves that BookReader does not show (scandata addToAccessFormats=false), from a cached scandata.xml; null if not cached */
export function excludedLeaves(file) {
  if (!fs.existsSync(file)) return null;
  const s = fs.readFileSync(file, 'utf8');
  return [...s.matchAll(/<page leafNum="(\d+)">([\s\S]*?)<\/page>/g)].filter((m) => /<addToAccessFormats>false/.test(m[2])).map((m) => +m[1]);
}
/** BookReader index N (the "#page/n<N>" of archive.org/details/<id>/page/n<N>) of a leaf, given the excluded leaf numbers */
export const readerIndex = (leaf, excluded) => (excluded ? leaf - excluded.filter((x) => x < leaf).length : null);

/** the text of a leaf as one string, with end-of-line hyphenation joined */
export const leafText = (lines) => lines.join(' ').replace(/(\w)- (\w)/g, '$1$2').replace(/\s+/g, ' ');
/** comparison key: letters and digits only, so line breaks, hyphens, spacing and punctuation cannot cause or hide a mismatch */
export const alnumKey = (s) => s.replace(/[^A-Za-z0-9]/g, '');
/** leaves whose text contains the quote (compared by alnumKey); returns [{ leaf, count }] */
export function findQuote(leaves, quote) {
  const q = alnumKey(quote), out = [];
  if (!q) return out;
  leaves.forEach((lines, leaf) => {
    const t = alnumKey(lines.join(' '));
    let n = 0, i = t.indexOf(q);
    while (i >= 0) { n++; i = t.indexOf(q, i + 1); }
    if (n) out.push({ leaf, count: n });
  });
  return out;
}
/** quotes can span a page break: look for the quote across the join of leaf and leaf+1 (end of one, start of the next) */
export function findQuoteAcross(leaves, quote) {
  const q = alnumKey(quote), out = [];
  for (let leaf = 0; leaf + 1 < leaves.length; leaf++) {
    const a = alnumKey(leaves[leaf].join(' ')), b = alnumKey(leaves[leaf + 1].join(' '));
    const t = a.slice(-q.length) + b.slice(0, q.length);
    if (t.includes(q) && !a.includes(q) && !b.includes(q)) out.push({ leaf, spans: leaf + 1 });
  }
  return out;
}
