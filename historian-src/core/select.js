// select.js - extractive quote selection. Nothing is generated: every quote is a verbatim slice of a stored passage, sentence aligned (invariant I3).
//   sentence score = sum idf(query stem in sentence) + 4[names a linked entity] + 3[has a clock time when the question is about time]
//                    - 1.5[clock time when it is not] - 0.02 * max(0, words - 45)
//   window = best run of 1-3 contiguous sentences up to 90 words; at most one quote per record; contemporaneous/dispatch kinds first when equal.
import { tokenize, stem, STOP, CLOCK_RE, normalizeWs } from './text.js';

const idfOf = (kb, t) => {
  const df = kb.lexDf.get(t) || 0;
  const N = kb.lexicon.N || 1;
  return df ? Math.log(1 + (N - df + 0.5) / (df + 0.5)) : 0.5;
};
const stemsOf = (s) => tokenize(s, { keepStop: false }).map(stem);

export function sentencesOfPassage(p) {
  const b = p.sb && p.sb.length ? p.sb : [0];
  return b.map((s, i) => ({ s, e: i + 1 < b.length ? b[i + 1] : p.text.length })).map((x) => {
    let e = x.e; while (e > x.s && /\s/.test(p.text[e - 1])) e--;
    return { s: x.s, e };
  });
}

/**
 * Score windows of one passage. ctx: { qStems:Set, entStems:Set, timeQ:boolean }.
 * Returns the best window {s, e, score, text, clk} or null.
 */
export function bestWindow(kb, p, ctx, { maxWords = 90, maxSents = 3, plain = false } = {}) {
  const sents = sentencesOfPassage(p);
  const info = sents.map(({ s, e }) => {
    const text = p.text.slice(s, e);
    const toks = tokenize(text, { keepStop: false }).map(stem);
    let sc = 0;
    const seen = new Set();
    for (const t of toks) { if (ctx.qStems.has(t) && !seen.has(t)) { seen.add(t); sc += idfOf(kb, t); } }
    let ent = false;
    for (const t of toks) if (ctx.entStems.has(t)) { ent = true; break; }
    if (ent) sc += 4;
    if (text.length > 6 && text === text.toUpperCase() && /[A-Z]/.test(text)) sc -= 3; // an ALL-CAPS heading is a label, not a statement
    const clk = CLOCK_RE.test(text);
    if (clk) sc += ctx.timeQ ? 3 : -1.5;
    if (ctx.quoteQ) sc += /["\u201c\u201d]/.test(text) ? 4 : -1;
    const words = (text.match(/\S+/g) || []).length;
    if (plain) sc -= 0.08 * Math.max(0, words - 18);     // "plain" (young readers): the shorter of two comparable sentences wins
    return { s, e, text, sc, words, clk, caps: text.length > 2 && text === text.toUpperCase() && /[A-Z]/.test(text) };
  });
  let best = null;
  for (let i = 0; i < info.length; i++) {
    let words = 0, sc = 0, clk = false, caps = true;
    for (let j = i; j < Math.min(info.length, i + maxSents); j++) {
      words += info[j].words; if (words > maxWords && j > i) break;
      sc += info[j].sc; clk = clk || info[j].clk; caps = caps && info[j].caps;
      if (caps) continue;                                  // a window that is only an ALL-CAPS heading ("PICKETT'S CHARGE BEGINS.") is a label, never a quote
      // longer, complete windows beat one-line headings; very short windows are penalised, very long ones too
      const total = sc + 0.04 * Math.min(words, 40) - 0.02 * Math.max(0, words - 45) - (words < 10 ? 2 : 0);
      if (!best || total > best.score + 1e-9) best = { s: info[i].s, e: info[j].e, score: total, clk, words };
    }
  }
  if (!best) return null;
  return { ...best, text: normalizeWs(p.text.slice(best.s, best.e)) };
}

/** Choose up to `max` quotes from ranked passages [{p, score}] (distinct records first). Returns quote blocks. */
export function selectQuotes(kb, ranked, ctx, { max = 2, skip = new Set(), minScore = 0.5, sameRec = false, maxWords = 90, maxSents = 3, plain = false } = {}) {
  const out = [];
  const seenRec = new Set();
  let first = null;
  for (const { p, score } of ranked) {
    if (out.length >= max) break;
    if (skip.has(p.id)) continue;
    if (!sameRec && seenRec.has(p.rec)) continue;
    const w = bestWindow(kb, p, ctx, { maxWords, maxSents, plain });
    if (!w || w.score < minScore) continue;
    // later quotes must be at least 35% as relevant as the first (no filler)
    if (first !== null && w.score < 0.35 * first) continue;
    if (first === null) first = w.score;
    seenRec.add(p.rec);
    out.push({
      t: 'quote', passage: p.id, rec: p.rec, s: w.s, e: w.e, text: w.text, kind: p.kind, clk: w.clk,
      attrib: p.cite.short, cite: p.cite, source: p.source,
      // the exact slice is kept for the invariant check (I3): normalise_ws(passage.text.slice(s, e)) === text
    });
  }
  return out;
}

export { STOP };
