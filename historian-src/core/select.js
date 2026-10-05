// select.js - extractive quote selection: every quote is a verbatim slice of a stored passage, sentence aligned (I3).
//   sentence score = sum idf(query stem) + 4[names a linked entity] + 3[clock time when asked about time] - 1.5[clock time when not] - 0.02 * max(0, words - 45)
//   window = best run of 1-3 sentences up to 90 words; at most one quote per record; contemporaneous kinds first when equal.
import { tokenize, stem, STOP, CLOCK_RE, normalizeWs, fkGrade, fnv1a32 } from './text.js';

const idfOf = (kb, t) => {
  const df = kb.lexDf.get(t) || 0, c = df ? null : kb.corp && kb.corp.df(t);   // a word only the Official Records hold has that corpus's own df
  const N = c ? c.N : kb.lexicon.N || 1, d = c ? c.df : df;
  return d ? Math.log(1 + (N - d + 0.5) / (d + 0.5)) : 0.5;
};
const stemsOf = (s) => tokenize(s, { keepStop: false }).map(stem);
// verbs of utterance, every form: "Longstreet argues against it: '...'", "Lee told him", "Hancock replied", "he protested that ..." (a verb of command or movement is not one)
const SPEECH_BASE = 'say tell reply respond cry shout call declare ask write speak greet yell whisper exclaim answer mutter argue protest warn urge insist remark state add announce demand beg plead retort vow admit predict observe testify recall object complain suggest advise promise swear shriek roar bellow growl snap mumble murmur sneer scoff boast admonish exhort implore entreat';
const SPEECH_FORMS = [...new Set(SPEECH_BASE.split(' ').flatMap((b) => { const e = /e$/.test(b) ? b.slice(0, -1) : b; const y = /[^aeiou]y$/.test(b) ? b.slice(0, -1) + 'i' : null; return [b, b + 's', y ? y + 'es' : b + 'es', (y || e) + 'ed', e + 'ing']; }).concat(['said', 'told', 'spoke', 'spoken', 'wrote', 'written', 'cried', 'replied', 'answered']))];
const VERBS = SPEECH_FORMS.join('|');
const INV = 'said|says|replied|cried|asked|shouted|answered|exclaimed|declared|added|responded|whispered|yelled|muttered';
const RANK = '(?:(?:General|Gen\\.|Colonel|Col\\.|Captain|Capt\\.|Lieutenant|Lt\\.|Major|Maj\\.)\\s+)?';
/** patterns that say a named person is the SPEAKER: the name, then (lower-case words only, so another name in between breaks it) a speech verb; or a speech verb then the name ("said General Lee") */
export function speakerPatterns(words) {
  const ci = (w) => [...w].map((c) => (/[a-z]/i.test(c) ? `[${c.toLowerCase()}${c.toUpperCase()}]` : c)).join('');
  return [...new Set(words)].filter((w) => /^[A-Za-z'\u2019-]{3,}$/.test(w)).flatMap((w) => [
    new RegExp('\\b' + ci(w) + '\\b(?:,?\\s+[a-z\'\\u2019-]+){0,9}?,?\\s+(?:' + VERBS + ')\\b'),
    new RegExp('\\b' + ci(w) + '\\b(?:\\s+[a-z\'\\u2019-]+){0,9}?\\s*:\\s*[\'"\\u2018\\u201c]'),            // "Longstreet argues against it: '...'" : the name, a few plain words, a colon and the opening quotation mark
    // the speech tag after the words: "...," said General Lee. / "...?" asked Hancock (not "Longstreet said Lee was ill": the name must close the tag, or the tag must follow a quotation)
    new RegExp('(?:[,!?"\'\\u2019\\u201d]\\s*(?:' + INV + ')\\s+' + RANK + ci(w) + '\\b)|(?:\\b(?:' + INV + ')\\s+' + RANK + ci(w) + '\\b(?=\\s*[.,;!?]|\\s*$))'),
  ]);
}
const SPEECH = new Set([...SPEECH_FORMS, 'speaking'].map(stem));

/** a stated length of time: "seven hours", "for three hours", "20 minutes", "all day" (used by "how long / how many hours" questions) */
export const DURATION_RE = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|several)(?:\s+and\s+a\s+half)?[ -](?:hours?|minutes?|days?)\b|\ball day\b|\bhours? of\b/i;

/** does this quote have the named person as its speaker (his name, then a speech verb within a few words, or the verb then his name)? true when the question names no speaker */
export function speakerSatisfied(text, ctx) {
  if (ctx.speakerRes && ctx.speakerRes.length) return ctx.speakerRes.some((re) => re.test(text));
  if (ctx.speakerStems && ctx.speakerStems.size) { const toks = tokenize(text, { keepStop: false }).map(stem); const k = toks.findIndex((x) => ctx.speakerStems.has(x)); return k >= 0 && toks.slice(Math.max(0, k - 3), k + 9).some((x) => SPEECH.has(x)); }
  return true;
}

/** the printed page(s) of a span [s, e) of a corpus passage, from its page list [[offset, page, leaf, reader], ...]: { pages, label, url, leaf } or null */
export function pageSpan(pg, s, e, ia) {
  if (!pg || !pg.length || !Array.isArray(pg[0])) return null;
  const at = (x) => { let k = 0; for (let i = 0; i < pg.length; i++) { if (pg[i][0] <= x) k = i; else break; } return pg[k]; };
  const a = at(s), b = at(Math.max(s, e - 1));
  const same = a[1] === b[1];
  return { pages: same ? String(a[1]) : `${a[1]}–${b[1]}`, label: same ? `p. ${a[1]}` : `pp. ${a[1]}–${b[1]}`, url: a[3] !== undefined && ia ? `https://archive.org/details/${ia}/page/n${a[3]}/mode/1up` : null, leaf: a[2] === undefined ? null : a[2] };
}
/** the hash of a quoted span (whitespace-normalised): what is shown is checked against what the passage holds */
export const quoteHash = (text) => fnv1a32(normalizeWs(text)).toString(16);

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
    for (const t of toks) { if (ctx.qStems.has(t) && !seen.has(t)) { seen.add(t); sc += idfOf(kb, t) + (ctx.litStems && ctx.litStems.has(t) ? 1.5 : 0); } }
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
    return { s, e, text, sc, words, clk, spk, hit: seen.size > 0, caps: text.length > 2 && text === text.toUpperCase() && /[A-Z]/.test(text) };
  });
  let best = null;
  // a question about what a named person SAID: when a sentence of this passage has that person as the speaker, only windows that start on such a sentence compete (context after it is fine,
  // context before it is not: the sentences before are about someone else)
  const speakerMode = !!(ctx.speakerRes && ctx.speakerRes.length) && info.some((x) => x.spk);
  for (let i = 0; i < info.length; i++) {
    // a speaker's window starts on his sentence, or on the sentence of speech right before a bare attribution ("... ?" Bigelow asked.), which is the words themselves
    if (speakerMode && !info[i].spk && !(info[i + 1] && info[i + 1].spk && info[i + 1].words < 5)) continue;
    let words = 0, sc = 0, clk = false, caps = true, hit = false;
    for (let j = i; j < Math.min(info.length, i + maxSents); j++) {
      words += info[j].words; if (words > maxWords && j > i) break;
      sc += info[j].sc; clk = clk || info[j].clk; caps = caps && info[j].caps; hit = hit || info[j].hit;
      if (caps) continue;                                  // a window that is only an ALL-CAPS heading ("PICKETT'S CHARGE BEGINS.") is a label, never a quote
      if (ctx.requireClockWindow && !clk) continue;
      if (ctx.windowOk && !ctx.windowOk(p, info[i].s, info[j].e)) continue;
      if (ctx.requireTopic && !hit) continue;               // the window must hold at least one word of the topic asked about
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
    const pgi = pageSpan(p.pg, w.s, w.e, p.ia);
    out.push({
      t: 'quote', passage: p.id, rec: p.rec, s: w.s, e: w.e, text: w.text, kind: p.kind, clk: w.clk,
      attrib: pgi ? `${p.cite.short}, ${pgi.label}` : p.cite.short, cite: p.cite, source: p.source, h: quoteHash(w.text), ...(pgi ? { page: pgi.pages, scan: pgi.url, leaf: pgi.leaf } : {}),
      // the exact slice is kept for the invariant check (I3): normalise_ws(passage.text.slice(s, e)) === text
    });
  }
  return out;
}

export { STOP };
