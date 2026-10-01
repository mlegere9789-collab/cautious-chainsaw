// reports.js - questions about what an author REPORTED, and at what time a report SAYS something happened, answered from the Official Records corpus (manifest.corpora.or27).
//
//   "what did Chamberlain report about Little Round Top"        the passages of the report he wrote (author links, role 2) that are closest to the topic, quoted with author, rank, unit, date written, volume and printed page
//   "what time did Longstreet say his assault began"             the sentences of his report that give a clock time and talk about the topic, each as he wrote it
//   "what did the reports say about the assault on Cemetery Hill" the passages of different reports (one per report, Union and Confederate when both exist) closest to the topic
// Nothing is generated: the lead is a template over the report's own metadata (author line, date written), every other sentence is a verbatim quote with its offsets (select.js), and a note says what
// kind of source it is. An official report is testimony written after the fact: it is labelled so, and a dispatch is labelled as written at the time. When the corpus holds no report by the person
// asked about, the answer says so instead of quoting someone else as if it were him.
// The module is inert unless the KB has the corpus (createReports returns null), so the site-only KB answers exactly as before.
import { tokenize, stem, normalizeWs, STOP } from './text.js';
import { selectQuotes } from './select.js';

const REPORT_NOUN = /\b(?:official records?|reports?|reported|reporting|dispatch(?:es)?|despatch(?:es)?)\b/;
const REPORT_TO = /\b(?:report(?:ed|ing|s)?|dispatch(?:ed)?) (?:to|for duty|in person|back|at once)\b/;                // "reported to Meade" is a movement, not a document
const SAY = /\b(?:say|said|says|saying|write|wrote|writes|written|state|stated|states|claim|claimed|claims|recall|recalled|mention|mentioned|describe|described|describes|note|noted|declare|declared|give|gave|given)\b/;
const TIME_Q = /\b(?:what time|at what time|what hour|at what hour|which hour|when|how early|how late)\b/;
const QWORD = /^(?:what|how|where|when|did|does|do|according|in|which|why|who)\b/;
// words that are the question's frame, not its topic
const FRAME = new Set(['report', 'reports', 'reported', 'reporting', 'dispatch', 'dispatches', 'official', 'record', 'records', 'say', 'said', 'says', 'write', 'wrote', 'writes', 'written', 'state', 'stated', 'claim', 'claimed', 'recall', 'recalled', 'mention', 'mentioned', 'describe', 'described', 'describes', 'according', 'give', 'gave', 'given', 'time', 'hour', 'author', 'officer', 'general', 'colonel', 'captain', 'major', 'lieutenant', 'commander', 'confederate', 'union', 'federal', 'rebel', 'did', 'does', 'about', 'regarding', 'concerning'].map(stem));
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateText = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MONTHS[+m[2]]} ${+m[3]}, ${m[1]}` : null; };
// words that say the same thing in a report of 1863 ("the assault began" / "the attack was commenced" / "the movement was begun"): used to find the sentence, never shown
const SYN = [['assault', 'attack', 'charge', 'advance', 'onset', 'engage'], ['began', 'begin', 'begun', 'start', 'commence', 'opened', 'open', 'initiate']].map((g) => g.map(stem));
const expand = (topic) => { const out = new Set(topic); for (const g of SYN) if (g.some((w) => out.has(w))) for (const w of g) out.add(w); return out; };
const lead = (runs, src = []) => ({ t: 'lead', runs: runs.map((r) => (typeof r === 'string' ? { txt: r } : r)), src });
const note = (code, txt) => ({ t: 'note', code, txt });

export function createReports(kb, { corpus = 'or27' } = {}) {
  if (!kb || !kb.hasCorpus || !kb.hasCorpus(corpus)) return null;
  const C = kb.corpusOf ? kb.corpora.find((c) => c.name === corpus) : null;
  const R = kb.idx.R;
  const inCorpus = (n) => n >= C.base && n < C.base + C.count;

  /** does this question ask for what someone reported (or at what time a report says something)? -> null | { kind, timeQ, authorIdx, mention } */
  function detect(S, parts) {
    const norm = S.norm || '';
    if (!norm || REPORT_TO.test(norm) && !/\breports? (?:of|by|on|about)\b/.test(norm)) return null;
    const cue = REPORT_NOUN.test(norm), say = SAY.test(norm);
    if (!cue && !say) return null;
    const timeQ = TIME_Q.test(norm);
    // "what did Lee say to his men" is about speech, not a document: without the word report, dispatch or official records only a question about a TIME that someone says / states / claims is taken
    if (!cue && !(timeQ && QWORD.test(norm.trim()))) return null;
    const persons = parts.persons.filter((r) => r.k === 'person'), units = parts.units;
    const toks = S.tokens || [];
    const cueAt = toks.map((t, i) => (/^(?:report|reports|reported|reporting|dispatch|dispatches|official|say|said|says|write|wrote|writes|written|state|stated|claim|claimed|recall|recalled|mention|mentioned|describe|described|according)$/.test(t) ? i : -1)).filter((i) => i >= 0);
    // the author is the person (or unit) named next to the cue: "Lee's report", "report of General Lee", "what did Lee report", "what time did Longstreet say"
    const near = (m) => { if (!cueAt.length) return 99; const mid = (m.start + m.end) / 2; return Math.min(...cueAt.map((c) => Math.abs(c - mid))); };
    const ms = (S.mentions || []).filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length && (m.start !== undefined));
    let best = null;
    for (const m of ms) {
      const i = m.kind === 'unit' ? m.best : m.ids[0];
      if (m.amb && m.kind !== 'unit') continue;
      const r = R[i]; if (!r) continue;
      const isAuthorKind = r.k === 'person' || ['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit'].includes(r.k);
      if (!isAuthorKind) continue;
      const d = near(m); if (d > 4) continue;
      if (!best || d < best.d) best = { d, i, m };
    }
    if (!best && !persons.length && !units.length && !cue) return null;
    if (!cue && !(best && R[best.i].k === 'person')) return null;
    return { kind: best ? 'author' : 'generic', timeQ: timeQ && (cue || say), authorIdx: best ? best.i : null, mention: best ? best.m : null };
  }

  // the question's content words (the engine has not computed its own passage terms yet when this runs): not stop words, not the frame of the question, not the words that name the author
  const topicTerms = (S, q) => {
    const skip = new Set();
    if (q.mention) for (let k = q.mention.start; k < q.mention.end; k++) skip.add(k);
    const out = [];
    (S.tokens || []).forEach((t, k) => { if (skip.has(k) || /^#/.test(t) || STOP.has(t) || t.length < 3) return; const s = stem(t); if (FRAME.has(s)) return; out.push(s); });
    return [...new Set(out)];
  };

  async function pick(nums, topic, { timeQ, max = 3, perDocFirst = false }) {
    const sc = topic.length ? await kb.scorePassages(topic) : new Map();
    const ranked = nums.map((n) => ({ n, s: sc.get(n) || 0 })).sort((a, b) => b.s - a.s || a.n - b.n);
    const take = ranked.slice(0, 14).map((x) => x.n);
    const P = await kb.passages(take);
    let list = take.map((n) => ({ p: P.get(n), score: sc.get(n) || 0 })).filter((x) => x.p);
    if (timeQ) list = list.filter((x) => x.p.clk && x.p.clk.length);
    return list;
  }

  async function answer(S, text, parts) {
    const q = detect(S, parts); if (!q) return null;
    return run(S, q, {});
  }
  /** "what did X say about Y" when the site's records quote no words of his: his own report, said so (the caller found no site quote) */
  async function answerSaid(S, rec) {
    if (!rec || rec.k !== 'person') return null;
    const i = R.indexOf(rec);
    const m = (S.mentions || []).find((x) => x.kind !== 'unit-miss' && x.ids && x.ids.includes(i)) || null;
    return run(S, { kind: 'author', timeQ: false, authorIdx: i, mention: m }, { said: true });
  }
  async function run(S, q, { said = false }) {
    const topic = topicTerms(S, q);
    const ctx = { qStems: expand(topic), entStems: new Set(), timeQ: q.timeQ, requireClockWindow: q.timeQ, requireTopic: q.timeQ && topic.length > 0 };
    let nums = [], authorRec = null, quotes = [], mode = 'answer', kindLabel = null, docMeta = null;
    if (q.kind === 'author') {
      authorRec = R[q.authorIdx];
      const ep = await kb.entityPassages([authorRec.id]);
      nums = [...ep.entries()].filter(([n, v]) => inCorpus(n) && v.role >= 2).map(([n]) => n).sort((a, b) => a - b);
      if (!nums.length) {
        if (authorRec.k !== 'person' || said) return null;                          // a unit with no report of its own, or a speech question: the ordinary flow answers (its card, the quotes about it)
        const any = [...ep.entries()].filter(([n]) => inCorpus(n)).length;
        const name = authorRec.label;
        const blocks = [lead([`The Official Records (series I, volume 27) as held here include no report written by ${name}.`, any ? ` They do name him in ${any} passages; ask what the reports say about him.` : ''], [authorRec.id]), note('no-report', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')];
        S.intent = 'report-of'; S.quotes = [];
        return { mode: 'partial', blocks, src: [authorRec.id], limited: true };
      }
    } else {
      // every report and dispatch passage of the corpus is a candidate; the topic decides
      if (!topic.length) return null;
      const sc = await kb.scorePassages(topic);
      nums = [...sc.entries()].filter(([n]) => inCorpus(n)).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([n]) => n);
      if (!nums.length) return null;
    }
    S.intent = q.timeQ ? 'reported-time' : 'report-of';
    let list = await pick(nums, topic, { timeQ: q.timeQ });
    if (!list.length) {
      if (q.kind === 'generic') return null;
      const P = await kb.passages(nums.slice(0, 1)); const p0 = [...P.values()][0];
      const name = authorRec.label;
      const blocks = [lead([`${name} wrote a report, but I did not find ${q.timeQ ? 'a clock time in it about that' : 'a passage in it about that'}.`], [authorRec.id])];
      if (p0) blocks.push(note('source', `The report is cited as ${p0.cite.short}.`));
      S.quotes = []; S.intent = 'report-of';
      return { mode: 'partial', blocks, src: [authorRec.id], limited: true };
    }
    if (q.kind === 'generic') {
      // one passage per report, the best first, Union and Confederate both when both have one
      const seen = new Set(); const diverse = []; for (const x of list.sort((a, b) => b.score - a.score)) { if (seen.has(x.p.doc)) continue; seen.add(x.p.doc); diverse.push(x); }
      const bySide = (s) => diverse.filter((x) => x.p.persp && x.p.persp.side === s);
      const u = bySide('union'), c = bySide('confederate');
      list = S.side === 'U' ? u.concat(c) : S.side === 'C' ? c.concat(u) : [u[0], c[0], u[1], c[1]].filter(Boolean);
      list = list.slice(0, 4);
    }
    quotes = selectQuotes(kb, list, ctx, q.kind === 'generic' ? { max: 3, minScore: 0.3, maxWords: 55, maxSents: 2, rerank: true } : { max: q.timeQ ? 3 : 2, minScore: 0.3, sameRec: true, maxWords: q.timeQ ? 90 : 70, maxSents: q.timeQ ? 4 : 3, rerank: true });
    if (q.timeQ) quotes = quotes.filter((x) => x.clk);
    if (q.kind === 'author') quotes.sort((a, b) => (a.passage === b.passage ? a.s - b.s : (list.findIndex((x) => x.p.id === a.passage) >= 0 ? list.find((x) => x.p.id === a.passage).p.num : 0) - (list.find((x) => x.p.id === b.passage) ? list.find((x) => x.p.id === b.passage).p.num : 0)));   // in the order of the report
    if (!quotes.length) return null;
    // a topic the best passages do not touch is said, not hidden behind the nearest sentence
    const first = list.find((x) => x.p.id === quotes[0].passage).p;
    docMeta = first.persp || {};
    const blocks = [];
    const kindLabel2 = docMeta.contemporaneous ? 'dispatch' : 'official report';
    if (q.kind === 'author') {
      const when = dateText(docMeta.written);
      const writ = docMeta.contemporaneous ? (when ? `wrote a dispatch dated ${when}` : 'wrote a dispatch') : docMeta.composite ? 'wrote an official report (the volume prints several documents under that heading)' : when ? `wrote an official report dated ${when}` : 'wrote an official report (the volume prints no date for it)';
      const lag = Number.isFinite(docMeta.lag_days) && docMeta.lag_days >= 0 && !docMeta.contemporaneous ? `, ${docMeta.lag_days === 0 ? 'on the day the fighting ended' : docMeta.lag_days === 1 ? 'one day after the fighting ended' : `${docMeta.lag_days} days after the fighting ended`}` : '';
      const asked = q.timeQ ? 'Times it gives, as he wrote them:' : 'The closest passages:';
      blocks.push(lead([said ? 'The site’s own records quote no words of his on this. ' : '', { ent: authorRec.id, txt: authorRec.label }, ` ${writ}${lag}. ${asked}`], [authorRec.id]));
    } else {
      blocks.push(lead([q.timeQ ? 'Times the reports give, each in its author’s words:' : 'What the reports say, each in its author’s words:']));
    }
    for (const x of quotes) blocks.push(x);
    blocks.push(docMeta.contemporaneous
      ? note('contemporary', 'A dispatch is written at the time it is dated; the clock is the sender’s own, and local times differed by several minutes.')
      : note('retrospect', (q.timeQ ? 'These are the times the authors wrote, from memory and notes after the fact: reports of the same event often differ by an hour or more, and the site’s own timeline is a separate, proposed reconstruction.' : 'An official report is written after the fact, from the author’s memory and notes; reports of the same event often differ.') + ' The words are machine-read from the 1889 print and may carry scanning errors.'));
    S.quotes = quotes;
    return { mode, blocks, src: authorRec ? [authorRec.id] : [] };
  }

  return { detect, answer, answerSaid, topicTerms };
}
