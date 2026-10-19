// Row reconstruction of OR casualty tables from the Internet Archive djvu XML word boxes (x/y of every word), so that columns survive the OCR text layer.
// usage: node tools/t0/data/ortable.mjs <or1|or2> <leaf> [<leaf2>]   (prints one text row per line: name | numbers...)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const CACHE = path.join(REPO, 'tmp', 'env-cache');
const IDS = { or1: 'warofrebellion271unit', or2: 'warofrebellion272unit' };
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const xmlCache = {};
export function pageWords(key, leaf) {
  const xml = (xmlCache[key] ||= fs.readFileSync(path.join(CACHE, 'ia-' + IDS[key] + '-djvu.xml'), 'utf8'));
  // find the leaf-th <OBJECT
  let idx = -1;
  const parts = (xmlCache[key + ':parts'] ||= xml.split('<OBJECT '));
  const o = parts[leaf];
  if (!o) return [];
  const w = [];
  for (const m of o.matchAll(/<WORD coords="(\d+),(\d+),(\d+),(\d+)"[^>]*>([^<]*)<\/WORD>/g)) {
    w.push({ x1: +m[1], yb: +m[2], x2: +m[3], yt: +m[4], t: dec(m[5]).trim() });
  }
  return w;
}
export function rows(key, leaf, tol = 22) {
  const words = pageWords(key, leaf).filter((w) => w.t);
  words.sort((a, b) => (a.yb + a.yt) / 2 - (b.yb + b.yt) / 2 || a.x1 - b.x1);
  const out = [];
  for (const w of words) {
    const yc = (w.yb + w.yt) / 2;
    const last = out[out.length - 1];
    if (last && Math.abs(last.yc - yc) <= tol) { last.w.push(w); last.yc = (last.yc * (last.w.length - 1) + yc) / last.w.length; }
    else out.push({ yc, w: [w] });
  }
  return out.map((r) => r.w.sort((a, b) => a.x1 - b.x1));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , key, a, b] = process.argv;
  for (let leaf = +a; leaf <= +(b || a); leaf++) {
    console.log('=== leaf', leaf);
    for (const r of rows(key, leaf)) console.log(r.map((w) => w.t).join(' '));
  }
}
