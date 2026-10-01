// or27-golden.mjs - the Official Records golden set (tests/historian/fixtures/golden-or27*.json) run against an engine that holds the corpus KB (historian-src/dist/hx-or27, or a build of it).
//
// An item is a question and what an answer must do, written from the text (see the fixture's _comment); this module scores one answer against its item and checks the invariants every corpus quote owes:
//   Q1 the quote's words are the passage's words at [s, e) (offsets), and its hash is the hash of those words
//   Q2 the quote is attributed to a document of the corpus, with a printed page that is the page the passage's page list gives for the span, inside the document's own page range
//   Q3 the scan link is the Internet Archive reader of the leaf the page list gives, on the right volume
// plus, per kind of question, what the answer is asked to do (time, author, dispatch, generic, absent).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './data.mjs';
import { quoteHash, pageSpan } from '../../../historian-src/core/select.js';
import { decodeCorpusShard } from '../../../historian-src/core/corpus.js';

export const GOLDEN_FILES = { A: path.join(ROOT, 'tests/historian/fixtures/golden-or27.json'), H: path.join(ROOT, 'tests/historian/fixtures/golden-or27-heldout.json') };
export const loadGolden = (which = 'A') => JSON.parse(fs.readFileSync(GOLDEN_FILES[which], 'utf8'));

/** every passage of the corpus in a built hx directory, keyed by id: { text, doc, pg, ia, persp, cite } (reads the corpus text shards one by one) */
export function loadCorpusPassages(hx, name = 'or27') {
  const man = JSON.parse(fs.readFileSync(path.join(hx, 'manifest.json'), 'utf8')); const c = man.corpora[name];
  const lst = c.files ? JSON.parse(fs.readFileSync(path.join(hx, c.files.path), 'utf8')) : c;
  const out = new Map(); const docs = new Map();
  for (const f of lst.text.files) {
    for (const p of decodeCorpusShard(JSON.parse(fs.readFileSync(path.join(hx, f.path), 'utf8')), c.base)) {
      out.set(p.id, p);
      const d = docs.get(p.doc) || { min: Infinity, max: -Infinity, ia: p.ia, side: p.persp && p.persp.side, contemporaneous: !!(p.persp && p.persp.contemporaneous) };
      for (const e of p.pg) if (Number.isFinite(e[1])) { d.min = Math.min(d.min, e[1]); d.max = Math.max(d.max, e[1]); }
      docs.set(p.doc, d);
    }
  }
  return { passages: out, docs };
}

// comparison form: straight quotes, one space, lower case
export const nf = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
const docOf = (id) => String(id).replace(/#.*$/, '');

/** the invariants of one corpus quote: [] when it holds */
export function quoteProblems(b, C) {
  const out = []; const doc = docOf(b.passage); const p = C.passages.get(b.passage);
  if (!p) return [`${b.passage}: not a passage of the corpus`];
  const slice = p.text.slice(b.s, b.e);
  if (nf(slice) !== nf(b.text)) out.push(`Q1 the words are not the passage's words at [${b.s}, ${b.e})`);
  if (b.h !== quoteHash(b.text)) out.push('Q1 the hash is not the hash of the words');
  const sp = pageSpan(p.pg, b.s, b.e, p.ia);
  if (!sp) out.push('Q2 the passage has no page list');
  else {
    if (String(b.page) !== sp.pages) out.push(`Q2 page ${b.page} but the page list gives ${sp.pages}`);
    const d = C.docs.get(doc); const first = +String(sp.pages).split('–')[0];
    if (d && !(first >= d.min && first <= d.max)) out.push(`Q2 page ${first} is outside the document's pages ${d.min}-${d.max}`);
    const want = sp.url; if (b.scan !== want) out.push(`Q3 scan link ${b.scan} is not ${want}`);
    if (b.scan && !new RegExp(`^https://archive\\.org/details/warofrebellion27[123]unit/page/n\\d+/mode/1up$`).test(b.scan)) out.push('Q3 scan link is not an Internet Archive reader link');
    if (sp.leaf !== null && b.leaf !== sp.leaf) out.push(`Q3 leaf ${b.leaf} is not ${sp.leaf}`);
  }
  return out;
}

/** score one answer against its item: { pass, reasons[] } */
export function score(item, a, C) {
  const reasons = []; const E = item.expect; const blocks = a.blocks || []; const quotes = blocks.filter((b) => b.t === 'quote' && /^or27-/.test(String(b.source || b.passage)));
  const text = nf(a.text || '');
  if (E.mode && a.mode !== E.mode) reasons.push(`mode ${a.mode}, wanted ${E.mode}`);
  if (a.lint && a.lint.length) reasons.push('lint ' + JSON.stringify(a.lint.slice(0, 2)));
  if (/\bundefined\b|\bnull\b|\bNaN\b/.test(a.text || '')) reasons.push('a forbidden word in the text');
  if (item.type === 'absent') {
    if (!/include no report written by/.test(a.text || '') || !new RegExp(E.surname, 'i').test(a.text || '')) reasons.push('does not say the volume holds no report by ' + E.surname);
    if (quotes.length) reasons.push('quotes someone else instead');
    return { pass: !reasons.length, reasons };
  }
  if (!quotes.length) { reasons.push('no quote from the corpus'); return { pass: false, reasons }; }
  for (const b of quotes) for (const pr of quoteProblems(b, C)) reasons.push(pr);
  const has = (list, doc) => list.some((x) => docOf(x.passage) === doc);
  const inTerms = (b, terms) => terms.some((t) => nf(b.text).includes(nf(t)));
  if (item.type === 'time') {
    if (a.intent !== 'reported-time') reasons.push(`intent ${a.intent}`);
    const hit = quotes.filter((b) => docOf(b.passage) === E.doc && E.clock.every((c) => nf(b.text).includes(nf(c))));
    if (!hit.length) reasons.push(`no quote of ${E.doc} gives ${E.clock.join(' and ')}`);
  } else if (item.type === 'author') {
    if (a.intent !== 'report-of') reasons.push(`intent ${a.intent}`);
    const foreign = quotes.filter((b) => docOf(b.passage) !== E.doc);
    if (foreign.length) reasons.push(`quotes another document: ${[...new Set(foreign.map((b) => docOf(b.passage)))].join(', ')}`);
    if (!quotes.some((b) => docOf(b.passage) === E.doc && inTerms(b, E.terms_any))) reasons.push(`no quote of ${E.doc} touches ${E.terms_any.join(' / ')}`);
  } else if (item.type === 'dispatch') {
    if (!quotes.some((b) => E.docs.includes(docOf(b.passage)) && inTerms(b, E.terms_any))) reasons.push(`no quote of ${E.docs.join(' / ')} touches ${E.terms_any.join(' / ')}`);
  } else if (item.type === 'generic') {
    const docs = new Set(quotes.map((b) => docOf(b.passage)));
    if (docs.size < E.min_docs) reasons.push(`${docs.size} document(s), wanted ${E.min_docs}`);
    const off = quotes.filter((b) => !inTerms(b, E.terms_any));
    if (off.length) reasons.push(`${off.length} quote(s) do not touch ${E.terms_any.join(' / ')}`);
    if (E.side) { const wrong = quotes.filter((b) => (C.docs.get(docOf(b.passage)) || {}).side !== E.side); if (wrong.length) reasons.push(`${wrong.length} quote(s) from the other side`); }
  }
  void text; void has;
  return { pass: !reasons.length, reasons };
}

/** run every item: [{ id, type, q, pass, reasons, mode, ms, quotes: [docs] }] */
export async function runGolden(eng, items, C, { onItem = null } = {}) {
  const out = [];
  for (const it of items) {
    const t0 = performance.now(); let a, err = null;
    try { a = await eng.ask(it.q); } catch (e) { err = e; }
    const ms = performance.now() - t0;
    const r = err ? { pass: false, reasons: ['threw ' + (err.message || err)] } : score(it, a, C);
    const row = { id: it.id, type: it.type, q: it.q, pass: r.pass, reasons: r.reasons, mode: a && a.mode, intent: a && a.intent, ms: Math.round(ms * 10) / 10, docs: a ? [...new Set((a.blocks || []).filter((b) => b.t === 'quote').map((b) => docOf(b.passage)))] : [] };
    out.push(row); if (onItem) onItem(row);
  }
  return out;
}
export const summarize = (rows) => {
  const by = {}; for (const r of rows) { const k = (by[r.type] ||= { n: 0, pass: 0 }); k.n++; if (r.pass) k.pass++; }
  return { n: rows.length, pass: rows.filter((r) => r.pass).length, by };
};
