// select.js - extractive quote selection. Nothing is generated: every quote is a verbatim slice of a stored passage, sentence aligned (invariant I3).
//   sentence score = sum idf(query stem in sentence) + 4[names a linked entity] + 3[has a clock time when the question is about time]
//                    - 1.5[clock time when it is not] - 0.02 * max(0, words - 45)
//   window = best run of 1-3 contiguous sentences up to 90 words; at most one quote per record; contemporaneous/dispatch kinds first when equal.
import { tokenize, stem, STOP, CLOCK_RE, normalizeWs, fkGrade } from './text.js';

const idfOf = (kb, t) => {
  const df = kb.lexDf.get(t) || 0;
  const N = kb.lexicon.N || 1;
  return df ? Math.log(1 + (N - df + 0.5) / (df + 0.5)) : 0.5;
};
const stemsOf = (s) => tokenize(s, { keepStop: false }).map(stem);
const VERBS = 'said|says|saying|told|telling|replied|cried|shouted|called|declared|asked|wrote|spoke|greeted|yelled|whispered|exclaimed|answered|muttered';
/** patterns that say a named person is the SPEAKER: the name, then (lower-case words only, so another name in between breaks it) a speech verb; or a speech verb then the name ("said General Lee") */
export function speakerPatterns(words) {
  const ci = (w) => [...w].map((c) => (/[a-z]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c)).join('');
  return [...new Set(words)].filter((w) => /^[A-Za-z'\u2019-]{3,}$/.test(w)).flatMap((w) => [
    new RegExp('\\b' + ci(w) + '\\b(?:\\s+[a-z\'\\u2019-]+){0,9}?\\s+(?:' + VERBS + ')\\b'),
    new RegExp('\\b(?:said|says|replied|cried|asked|shouted)\\s+(?:(?:General|Gen\\.|Colonel|Col\\.|Captain|Capt\\.)\\s+)?' + ci(w) + '\\b'),
  ]);
}
const SPEECH = new Set(['said', 'say', 'says', 'told', 'tell', 'telling', 'cried', 'shouted', 'replied', 'answered', 'exclaimed', 'called', 'declared', 'wrote', 'asked', 'whispered', 'muttered', 'yelled', 'greeted', 'speaking', 'spoke'].map(stem));

/** a stated length of time: "seven hours", "for three hours", "20 minutes", "all day" (used by "how long / how many hours" questions) */
export const DURATION_RE = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|several)(?:\s+and\s+a\s+half)?[ -](?:hours?|minutes?|days?)\b|\ball day\b|\bhours? of\b/i;

/** does this quote have the named person as its speaker (his name, then a speech verb within a few words, or the verb then his name)? true when the question names no speaker */
export function speakerSatisfied(text, ctx) {
  if (ctx.speakerRes && ctx.speakerRes.length) return ctx.speakerRes.some((re) => re.test(text));
  if (ctx.speakerStems && ctx.speakerStems.size) { const toks = tokenize(text, { keepStop: false }).map(stem); const k = toks.findIndex((x) => ctx.speakerStems.has(x)); return k >= 0 && toks.slice(Math.max(0, k - 3), k + 9).some((x) => SPEECH.has(x)); }
  return true;
}

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
    if (ctx.durationQ) sc += DURATION_RE.test(text) ? 4 : -1;
    // "what did Lee say to his men": the sentence in which the named person is the speaker (his name, then a speech verb within a few words) is the one that answers
    const spk = !!(ctx.speakerRes && ctx.speakerRes.some((re) => re.test(text)));
    if (spk) sc += 5;
    else if (!(ctx.speakerRes && ctx.speakerRes.length) && ctx.speakerStems && ctx.speakerStems.size) { const k = toks.findIndex((x) => ctx.speakerStems.has(x)); if (k >= 0 && toks.slice(Math.max(0, k - 3), k + 9).some((x) => SPEECH.has(x))) sc += 5; }   // write / shout / reply: his name near the verb
    const words = (text.match(/\S+/g) || []).length;
    // "plain" (young readers): the shorter and simpler of two comparable sentences wins; the penalty is the sentence's own Flesch-Kincaid grade above 6 (the golden student items allow 7 to 10)
    if (plain) sc -= 0.08 * Math.max(0, words - 18) + 0.9 * Math.max(0, fkGrade(text) - 6);
    return { s, e, text, sc, words, clk, spk, caps: text.length > 2 && text === text.toUpperCase() && /[A-Z]/.test(text) };
  });
  let best = null;
  // a question about what a named person SAID: when a sentence of this passage has that person as the speaker, only windows that start on such a sentence compete (context after it is fine,
  // context before it is not: the sentences before are about someone else)
  const speakerMode = !!(ctx.speakerRes && ctx.speakerRes.length) && info.some((x) => x.spk);
  for (let i = 0; i < info.length; i++) {
    // a speaker's window starts on his sentence, or on the sentence of speech right before a bare attribution ("... ?" Bigelow asked.), which is the words themselves
    if (speakerMode && !info[i].spk && !(info[i + 1] && info[i + 1].spk && info[i + 1].words < 5)) continue;
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
  // a question about what a named person said, and this passage never has him speaking: it is about him, not his words
  if (ctx.speakerRes && ctx.speakerRes.length && !speakerMode) best.score -= 8;
  return { ...best, text: normalizeWs(p.text.slice(best.s, best.e)) };
}

/** Choose up to `max` quotes from ranked passages [{p, score}] (distinct records first). Returns quote blocks. */
export function selectQuotes(kb, ranked, ctx, { max = 2, skip = new Set(), minScore = 0.5, sameRec = false, maxWords = 90, maxSents = 3, plain = false, rerank = false } = {}) {
  // rerank: score the best window of EVERY candidate passage and take the best windows first (retrieval order breaks ties); the default takes the first passages that clear the bar
  if (rerank) ranked = ranked.filter(({ p }) => !skip.has(p.id)).map((x, k) => ({ ...x, k, w: bestWindow(kb, x.p, ctx, { maxWords, maxSents, plain }) })).filter((x) => x.w && x.w.score >= minScore).sort((a, b) => b.w.score - a.w.score || a.k - b.k);
  const out = [];
  const seenRec = new Set();
  let first = null;
  for (const x of ranked) {
    const { p } = x;
    if (out.length >= max) break;
    if (skip.has(p.id)) continue;
    if (!sameRec && seenRec.has(p.rec)) continue;
    const w = x.w !== undefined ? x.w : bestWindow(kb, p, ctx, { maxWords, maxSents, plain });
    if (!w || w.score < minScore) continue;
    if (w.words < 5) continue;                                              // "Hancock said." is an attribution, not a quotation
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
