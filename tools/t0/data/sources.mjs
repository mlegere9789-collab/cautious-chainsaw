// Page-indexed search over the open source texts cached by earlier streams (tmp/env-cache, git-ignored; re-fetch with the stream's fetchers).
// Official Records Series I vol. 27 parts 1 and 2 (Internet Archive warofrebellion271unit / 272unit) and Fox, Regimental Losses (IA reglossescivilwar00foxwrich).
// usage: node tools/t0/data/sources.mjs or1|or2|fox|liv "regex" [ctxChars=220] [maxHits=8]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..');
const CACHE = path.join(REPO, 'tmp', 'env-cache');
const OUT = path.join(REPO, 'tmp', 'data-audit', 'srcidx');
const BOOKS = {
  or1: { id: 'warofrebellion271unit', name: 'OR 27 pt.1' },
  or2: { id: 'warofrebellion272unit', name: 'OR 27 pt.2' },
  fox: { id: 'reglossescivilwar00foxwrich', name: 'Fox, Regimental Losses' },
  liv: { id: 'numberslosses00liverich', name: 'Livermore, Numbers and Losses' },
  has: { id: 'battleofgettysbu00haskuoft', name: 'Haskell, The Battle of Gettysburg' },
};
const dec = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

export function loadBook(key) {
  const b = BOOKS[key];
  fs.mkdirSync(OUT, { recursive: true });
  const cacheFile = path.join(OUT, key + '.json');
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const xml = fs.readFileSync(path.join(CACHE, 'ia-' + b.id + '-djvu.xml'), 'utf8');
  let printed = [];
  const pnFile = path.join(CACHE, 'ia-' + b.id + '-page_numbers.json');
  if (fs.existsSync(pnFile)) printed = JSON.parse(fs.readFileSync(pnFile, 'utf8')).pages.map((p) => p.pageNumber || '');
  const pages = [];
  const parts = xml.split('<OBJECT ').slice(1);
  parts.forEach((o, i) => {
    const lines = [...o.matchAll(/<LINE>([\s\S]*?)<\/LINE>/g)].map((m) => dec([...m[1].matchAll(/<WORD[^>]*>([^<]*)<\/WORD>/g)].map((w) => w[1].trim()).join(' ')));
    pages.push({ leaf: i + 1, printed: printed[i] || '', text: lines.join('\n') });
  });
  const o = { key, name: b.name, pages };
  fs.writeFileSync(cacheFile, JSON.stringify(o));
  return o;
}

export function search(key, re, ctx = 220, max = 8) {
  const book = loadBook(key);
  const rx = new RegExp(re, 'gi');
  const hits = [];
  for (const p of book.pages) {
    const flat = p.text.replace(/\s+/g, ' ');
    let m;
    rx.lastIndex = 0;
    while ((m = rx.exec(flat))) {
      hits.push({ leaf: p.leaf, page: p.printed, snip: flat.slice(Math.max(0, m.index - ctx), m.index + m[0].length + ctx) });
      if (m.index === rx.lastIndex) rx.lastIndex++;
      if (hits.length >= max * 4) break;
    }
  }
  return hits.slice(0, max);
}

export function page(key, printed) {
  const book = loadBook(key);
  return book.pages.filter((p) => String(p.printed) === String(printed));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , key, re, ctx, max] = process.argv;
  if (key === 'page') {
    for (const p of page(process.argv[3], process.argv[4])) console.log(`--- ${p.leaf} p.${p.printed}\n${p.text}`);
  } else {
    const hits = search(key, re, +(ctx || 220), +(max || 8));
    for (const h of hits) console.log(`[${key} leaf ${h.leaf} p.${h.page}] ...${h.snip}...`);
    if (!hits.length) console.log('NO HIT');
  }
}
