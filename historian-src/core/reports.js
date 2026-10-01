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

const REPORT_NOUN = /\b(?:official records?|reports?|reported|reporting|dispatch(?:es)?|despatch(?:es)?|telegrams?|telegraph(?:ed|s)?|wired)\b/;
const DISPATCH_WORD = /\b(?:dispatch(?:es)?|despatch(?:es)?|telegrams?|telegraph(?:ed|s)?|wired)\b/;                // the question asks for what was SENT at the time, not for a report written afterwards
const REPORT_WORD = /\b(?:reports?|reported|reporting)\b/;
const WRITE_TO = /\bwr(?:ite|ote|ites|itten)\b[^?]{0,60}\bto\b/;                                  // "what did Lee write to Imboden": a letter or dispatch
// a question that names another kind of source is not about a report of the volume ("what did Meade tell the Joint Committee", "how did the newspapers report"); and "reports" asked of the corpus as a whole is the noun
const OTHER_SOURCE = /\b(?:joint committee|committee on the conduct|testimony|testified|newspapers?|diary|diaries|letters? to (?:his|her) |memoirs?|reminiscences?|after the war|in later years|speech|oration|monument|veterans?)\b/;
const REPORTS_NOUN = /\b(?:the|these|those|all|union|confederate|federal|rebel|official|their|his|other)\s+(?:official\s+)?(?:reports?|dispatch(?:es)?|despatch(?:es)?)\b|\bofficial records?\b|\b(?:reports?|dispatch(?:es)?)\s+(?:say|said|state|stated|describe|described|mention|mentioned|give|gave|of)\b/;
const SIDE_ONLY = /\b(confederate|rebel|union|federal)\s+(?:official\s+)?(?:reports?|dispatch(?:es)?|commanders?|officers?|accounts?)\b/;
const MON = { jun: 6, jul: 7, aug: 8 };
/** "on July 4", "the 3d of July": the date of 1863 the question names, as an ISO day, or null */
const dateOf = (norm) => {
  let m = /\b(jun|jul|aug)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th|d)?\b/.exec(norm); let mo = m && m[1], d = m && m[2];
  if (!m) { m = /\b(\d{1,2})(?:st|nd|rd|th|d)?\s+of\s+(jun|jul|aug)[a-z]*\b/.exec(norm); if (!m) return null; mo = m[2]; d = m[1]; }
  return `1863-${String(MON[mo]).padStart(2, '0')}-${String(+d).padStart(2, '0')}`;
};
const REPORT_TO = /\b(?:report(?:ed|ing|s)?|dispatch(?:ed)?) (?:to|for duty|in person|back|at once)\b/;                // "reported to Meade" is a movement, not a document
const SAY = /\b(?:say|said|says|saying|write|wrote|writes|written|state|stated|states|claim|claimed|claims|recall|recalled|mention|mentioned|describe|described|describes|note|noted|declare|declared|give|gave|given)\b/;
const TIME_Q = /\b(?:what time|at what time|what hour|at what hour|which hour|when|how early|how late)\b/;
const QWORD = /^(?:what|how|where|when|did|does|do|according|in|which|why|who)\b/;
// words that are the question's frame, not its topic
const FRAME = new Set(['report', 'reports', 'reported', 'reporting', 'dispatch', 'dispatches', 'official', 'record', 'records', 'say', 'said', 'says', 'write', 'wrote', 'writes', 'written', 'state', 'stated', 'claim', 'claimed', 'recall', 'recalled', 'mention', 'mentioned', 'describe', 'described', 'describes', 'according', 'give', 'gave', 'given', 'time', 'hour', 'author', 'officer', 'general', 'colonel', 'captain', 'major', 'lieutenant', 'commander', 'confederate', 'union', 'federal', 'rebel', 'did', 'does', 'about', 'regarding', 'concerning', 'telegraph', 'telegraphed', 'telegram', 'telegrams', 'wired', 'send', 'sent', 'july', 'june', 'august', 'tell', 'told'].map(stem));
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
    if (OTHER_SOURCE.test(norm)) return null;
    const cue = REPORT_NOUN.test(norm) || WRITE_TO.test(norm), say = SAY.test(norm);
    if (!cue && !say) return null;
    const timeQ = TIME_Q.test(norm);
    // "what did Lee say to his men" is about speech, not a document: without the word report, dispatch or official records only a question about a TIME that someone says / states / claims is taken
    if (!cue && !(timeQ && QWORD.test(norm.trim()))) return null;
    const persons = parts.persons.filter((r) => r.k === 'person'), units = parts.units;
    const toks = S.tokens || [];
    const cueAt = toks.map((t, i) => (/^(?:report|reports|reported|reporting|dispatch|dispatches|telegraph|telegraphed|telegram|telegrams|wired|official|say|said|says|write|wrote|writes|written|state|stated|claim|claimed|recall|recalled|mention|mentioned|describe|described|according)$/.test(t) ? i : -1)).filter((i) => i >= 0);
    // the author is the person (or unit) named next to the cue: "Lee's report", "report of General Lee", "what did Lee report", "what time did Longstreet say"
    const near = (m) => { if (!cueAt.length) return 99; const mid = (m.start + m.end) / 2; return Math.min(...cueAt.map((c) => Math.abs(c - mid))); };
    const ms = (S.mentions || []).filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length && (m.start !== undefined));
    let best = null;
    const AUTHOR_UNIT = ['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit'];
    const sideWord = SIDE_ONLY.exec(norm);
    for (const m of ms) {
      if (sideWord && m.start !== undefined && toks.slice(m.start, m.end).every((t) => stem(t) === stem(sideWord[1]))) continue;                  // "Union reports": an adjective, not the Army of the Potomac
      if (m.start > 0 && toks[m.start - 1] === 'to') continue;                                                                                      // "telegraph to Meade": the addressee, not the author
      // the words that name the author may name several records ("Buford": the man, his division; "Hays": two men): which of them WROTE something is decided in run(), from the corpus
      const base = m.kind === 'unit' ? [m.best] : m.ids.slice();
      // a surname alone ("Buford") may be read as the unit named after him (his division): the men of that surname are candidates too
      if (m.kind !== 'unit' && m.phrase && !/ /.test(String(m.phrase).trim())) for (const i of (kb.idx.surnames && kb.idx.surnames.get(String(m.phrase).trim())) || []) if (!base.includes(i)) base.push(i);
      const cands = base.filter((i) => R[i] && (R[i].k === 'person' || AUTHOR_UNIT.includes(R[i].k)));
      if (!cands.length) continue;
      const d = near(m); if (d > 4) continue;
      if (!best || d < best.d) best = { d, cands, m };
    }
    if (!best && !persons.length && !units.length && !cue) return null;
    if (!cue && !(best && best.cands.some((i) => R[i].k === 'person'))) return null;
    if (!best && !REPORTS_NOUN.test(norm)) return null;                                           // no author and no "the reports say": a verb ("newspapers report the outcome") is not a question of the volume
    return { kind: best ? 'author' : 'generic', timeQ: timeQ && (cue || say), authorIdx: best ? best.cands[0] : null, cands: best ? best.cands : [], prefer: best && !best.m.amb && best.m.kind !== 'unit' && best.cands.includes(best.m.best) ? best.m.best : null, mention: best ? best.m : null };
  }

  // the question's content words (the engine has not computed its own passage terms yet when this runs): not stop words, not the frame of the question, not the words that name the author
  const topicTerms = (S, q) => {
    const skip = new Set();
    if (q.mention) for (let k = q.mention.start; k < q.mention.end; k++) skip.add(k);
    const out = [];
    (S.tokens || []).forEach((t, k) => { if (skip.has(k) || /^#/.test(t) || STOP.has(t) || t.length < 3) return; const s = stem(t); if (FRAME.has(s)) return; out.push(s); });
    return [...new Set(out)];
  };

  async function pick(nums, topic, { timeQ, max = 3, perDocFirst = false, wide = false }) {
    const sc = topic.length ? await kb.scorePassages(topic, true) : new Map();
    const ranked = nums.map((n) => ({ n, s: sc.get(n) || 0 })).sort((a, b) => b.s - a.s || a.n - b.n);
    const take = ranked.slice(0, wide ? 40 : 14).map((x) => x.n);                 // wide: a day or a kind (reports / dispatches) is asked for, so the filter below must have candidates to keep
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
    if (!rec || rec.k !== 'person' || OTHER_SOURCE.test(S.norm || '')) return null;
    const i = R.indexOf(rec);
    const m = (S.mentions || []).find((x) => x.kind !== 'unit-miss' && x.ids && x.ids.includes(i)) || null;
    return run(S, { kind: 'author', timeQ: false, authorIdx: i, mention: m }, { said: true });
  }
  async function run(S, q, { said = false }) {
    const topic = topicTerms(S, q);
    const ctx = { qStems: expand(topic), entStems: new Set(), timeQ: q.timeQ, requireClockWindow: q.timeQ, requireTopic: topic.length > 0 };
    let nums = [], authorRec = null, quotes = [], mode = 'answer', kindLabel = null, docMeta = null;
    const norm = S.norm || '';
    const askD = DISPATCH_WORD.test(norm) || WRITE_TO.test(norm), askR = REPORT_WORD.test(norm) && !askD;
    const dateIso = dateOf(norm); const dateWords = dateIso ? `${MONTHS[+dateIso.slice(5, 7)]} ${+dateIso.slice(8)}, 1863` : null;
    const sideM = SIDE_ONLY.exec(norm); const sideOnly = sideM ? (/^(?:confederate|rebel)$/.test(sideM[1]) ? 'confederate' : 'union') : null;
    /** numbers of the corpus passages carrying a pseudo-entity (K:dispatch, K:report, D:1863-07-03), or null when the KB has none */
    const withTag = async (...tags) => { const e = await kb.entityPassages(tags, true); const out = new Set(); for (const [n, v] of e) if (inCorpus(n)) out.add(n); return out.size ? out : null; };
    if (q.kind === 'author') {
      // the words that name the author may name several records; the one that WROTE something in the corpus (role 2) is the author: a man over his division ("Buford"), the only one of two with a report
      const cands = (q.cands && q.cands.length ? q.cands : [q.authorIdx]).filter((i) => R[i]);
      const candIds = cands.map((i) => R[i].id);
      const ep = await kb.entityPassages(candIds, true);
      const wrote = new Map(); for (const [n, v] of ep) { if (!inCorpus(n)) continue; for (const [id, role] of v.ids) if (role >= 2) wrote.set(id, (wrote.get(id) || 0) + 1); }
      const who = candIds.filter((id) => wrote.get(id));
      const isPerson = (id) => R[cands[candIds.indexOf(id)]].k === 'person';
      let pickId = null;
      if (who.length === 1) pickId = who[0];
      else if (who.length > 1) {
        // several of that name wrote something: the one the engine reads as the prominent one ("Hancock" is the corps commander, not the captain of a regular regiment), else the only person; else the ordinary flow
        const pref = q.prefer !== null && q.prefer !== undefined && R[q.prefer] ? R[q.prefer].id : null;
        const ps = who.filter(isPerson);
        pickId = pref && who.includes(pref) ? pref : ps.length === 1 ? ps[0] : null; if (!pickId) return null;
      }
      else { const ps = candIds.filter(isPerson); pickId = ps.length === 1 ? ps[0] : candIds.length === 1 ? candIds[0] : null; if (!pickId) return null; }
      authorRec = R[cands[candIds.indexOf(pickId)]];
      nums = [...ep.entries()].filter(([n, v]) => inCorpus(n) && v.ids.some(([id, role]) => id === pickId && role >= 2)).map(([n]) => n).sort((a, b) => a - b);
      if (nums.length) {
        // "what did Meade telegraph on July 3": the dispatches only, and the ones dated that day; "what did Lee report": his report, not his telegrams (candidates are cut before they are ranked)
        if (askD) {
          const t = await withTag('K:dispatch'); const r = t ? nums.filter((n) => t.has(n)) : [];
          if (r.length) nums = r;
          else if (authorRec.k === 'person') {
            const name = authorRec.label; S.intent = 'report-of'; S.quotes = [];
            return { mode: 'partial', blocks: [lead([`The Official Records (series I, volume 27) as held here print no dispatch or letter sent by `, { ent: authorRec.id, txt: name }, '.', nums.length ? ` They do print ${nums.length === 1 ? 'a passage' : nums.length + ' passages'} of his report; ask what he reported.` : ''], [authorRec.id]), note('no-dispatch', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')], src: [authorRec.id], limited: true };
          }
        }
        // "what did Lee write to Imboden": the dispatches addressed to him (A:<stem> marks the names of the addressee line), before any word count ranks them
        if (askD && /\sto\s/.test(norm) && topic.length) { const t = await withTag(...topic.map((x) => 'A:' + x)); if (t) { const r = nums.filter((n) => t.has(n)); if (r.length) nums = r; } }
        // a date in the question ("on July 4") restricts the dispatches to that day; none that day is said, not answered with another day's
        if (dateIso && askD) {
          const d = await withTag('D:' + dateIso); const r = d ? nums.filter((n) => d.has(n)) : [];
          if (r.length) nums = r;
          else if (askD) {
            const name = authorRec.label; S.intent = 'report-of'; S.quotes = [];
            return { mode: 'partial', blocks: [lead([`The Official Records (series I, volume 27) as held here print no dispatch from `, { ent: authorRec.id, txt: name }, ` dated ${dateWords} that I could find.`], [authorRec.id]), note('no-dispatch-day', `${name} wrote ${nums.length} passages in the volume; ask without the day to see his dispatches of other days.`)], src: [authorRec.id], limited: true };
          }
        }
        if (askR) {
          const t = await withTag('K:report'); const r = t ? nums.filter((n) => t.has(n)) : [];
          if (r.length) nums = r;
          else if (authorRec.k === 'person') {
            // "what did Pickett report": he wrote no report in the volume (his letters, if any, are dispatches: said, not quoted as a report)
            const name = authorRec.label; S.intent = 'report-of'; S.quotes = [];
            return { mode: 'partial', blocks: [lead([`The Official Records (series I, volume 27) as held here include no report written by ${name}.`, ` They print ${nums.length === 1 ? 'one dispatch' : `${nums.length} dispatches`} he sent; ask for his dispatches.`], [authorRec.id]), note('no-report', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')], src: [authorRec.id], limited: true };
          }
        }
      }
      if (!nums.length) {
        if (authorRec.k !== 'person' || said) return null;                          // a unit with no report of its own, or a speech question: the ordinary flow answers (its card, the quotes about it)
        const any = [...ep.entries()].filter(([n, v]) => inCorpus(n) && v.ids.some(([id]) => id === pickId)).length;
        const name = authorRec.label;
        const blocks = [lead([`The Official Records (series I, volume 27) as held here include no report written by ${name}.`, any ? ` They do name him in ${any} passages; ask what the reports say about him.` : ''], [authorRec.id]), note('no-report', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')];
        S.intent = 'report-of'; S.quotes = [];
        return { mode: 'partial', blocks, src: [authorRec.id], limited: true };
      }
    } else {
      // every report and dispatch passage of the corpus is a candidate; the topic decides
      if (!topic.length) return null;
      const sc = await kb.scorePassages(topic, true);
      let all = [...sc.entries()].filter(([n]) => inCorpus(n));
      // "what did the dispatches say about ...": only dispatches, orders and itineraries (written at the time), the day asked for when a day is named; "what did the reports say": only the reports
      const tag = askD ? await withTag('K:dispatch') : askR ? await withTag('K:report') : null;
      if (tag) { const r = all.filter(([n]) => tag.has(n)); if (r.length) all = r; }
      // a sender or addressee named in the question ("what did Halleck telegraph to Meade"): F:<stem> (sent by) and A:<stem> (addressed to) mark the names of a dispatch's signature and addressee line
      if (askD) { const t = await withTag(...topic.flatMap((x) => ['F:' + x, 'A:' + x])); if (t) { const r = all.filter(([n]) => t.has(n)); if (r.length) all = r; } }
      if (askD && dateIso) { const d = await withTag('D:' + dateIso); if (d) { const r = all.filter(([n]) => d.has(n)); if (r.length) all = r; } }
      nums = all.sort((a, b) => b[1] - a[1]).slice(0, 60).map(([n]) => n);
      if (!nums.length) return null;
    }
    S.intent = q.timeQ ? 'reported-time' : 'report-of';
    const toWho = askD && /\sto\s/.test(norm);
    let list = await pick(nums, topic, { timeQ: q.timeQ, wide: !!sideOnly || toWho });
    if (toWho && topic.length) { const inHead = (x) => { const hs = new Set(tokenize(x.p.text.slice(0, 220)).map(stem)); return topic.some((t) => hs.has(t)); }; list = list.map((x) => ({ ...x, score: x.score + (inHead(x) ? 1000 : 0) })).sort((a, b) => b.score - a.score); }
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
      // "what did Confederate reports say": that side only; otherwise the side the engine read from the question first, or one of each
      list = sideOnly === 'union' ? u : sideOnly === 'confederate' ? c : S.side === 'U' ? u.concat(c) : S.side === 'C' ? c.concat(u) : [u[0], c[0], u[1], c[1]].filter(Boolean);
      list = list.slice(0, 4);
      if (!list.length) return null;
    }
    quotes = selectQuotes(kb, list, ctx, q.kind === 'generic' ? { max: 3, minScore: 0.3, maxWords: 55, maxSents: 2, rerank: true } : { max: q.timeQ ? 3 : 2, minScore: 0.3, sameRec: true, maxWords: q.timeQ ? 90 : 70, maxSents: q.timeQ ? 4 : 3, rerank: true });
    if (q.timeQ) quotes = quotes.filter((x) => x.clk);
    if (topic.length > 1) {
      // the topic as the question words it: the longest run of consecutive topic words ("railroad cut"), then the rarest word of it ("culp", not "hill"); each only narrows the quotes while two or more are left
      const keepIf = (pred) => { const k = quotes.filter(pred); if (k.length >= Math.min(2, quotes.length)) quotes = k; };
      const stems = (x) => tokenize(x.text).map(stem);
      const seq = (S.tokens || []).map((t) => (topic.includes(stem(t)) ? stem(t) : null)); let run = [], cur = [];
      for (const t of seq.concat([null])) { if (t) cur.push(t); else { if (cur.length > run.length) run = cur; cur = []; } }
      if (run.length > 1) keepIf((x) => { const st = stems(x); return st.some((_, i) => run.every((t, j) => st[i + j] === t)); });
      const idf = (t) => { const d = kb.lexDf.get(t) || 0, c = d ? null : kb.corp && kb.corp.df(t); const N = c ? c.N : kb.lexicon.N || 1, k = c ? c.df : d; return k ? Math.log(1 + (N - k + 0.5) / (k + 0.5)) : 0.5; };
      const ok = expand([[...topic].sort((x, y) => idf(y) - idf(x))[0]]);
      keepIf((x) => stems(x).some((t) => ok.has(t)));
    }
    if (q.kind === 'author') quotes.sort((a, b) => (a.passage === b.passage ? a.s - b.s : (list.findIndex((x) => x.p.id === a.passage) >= 0 ? list.find((x) => x.p.id === a.passage).p.num : 0) - (list.find((x) => x.p.id === b.passage) ? list.find((x) => x.p.id === b.passage).p.num : 0)));   // in the order of the report
    if (!quotes.length) return null;
    // a topic the best passages do not touch is said, not hidden behind the nearest sentence
    const first = list.find((x) => x.p.id === quotes[0].passage).p;
    docMeta = first.persp || {};
    const blocks = [];
    // what the quotes come from: one document (its own date and kind lead), several dispatches, or a mix of reports and dispatches
    const srcDocs = new Map(); for (const x of quotes) { const p = list.find((y) => y.p.id === x.passage).p; srcDocs.set(p.doc, p.persp || {}); }
    const kinds = new Set([...srcDocs.values()].map((m) => !!m.contemporaneous));
    const mixed = kinds.size > 1, allDispatch = kinds.size === 1 && kinds.has(true);
    if (q.kind === 'author' && srcDocs.size > 1) {
      const what = allDispatch ? 'dispatches' : mixed ? 'writings, reports and dispatches' : 'reports';
      const asked = q.timeQ ? 'Times they give, as he wrote them:' : 'The closest passages, each with its own date and kind:';
      blocks.push(lead([said ? 'The site’s own records quote no words of his on this. ' : '', { ent: authorRec.id, txt: authorRec.label }, ` wrote several ${what} that bear on this. ${asked}`], [authorRec.id]));
    } else if (q.kind === 'author') {
      const when = dateText(docMeta.written);
      const writ = docMeta.contemporaneous ? (when ? `wrote a dispatch dated ${when}` : 'wrote a dispatch') : docMeta.composite ? 'wrote an official report (the volume prints several documents under that heading)' : when ? `wrote an official report dated ${when}` : 'wrote an official report (the volume prints no date for it)';
      const lag = Number.isFinite(docMeta.lag_days) && docMeta.lag_days >= 0 && !docMeta.contemporaneous ? `, ${docMeta.lag_days === 0 ? 'on the day the fighting ended' : docMeta.lag_days === 1 ? 'one day after the fighting ended' : `${docMeta.lag_days} days after the fighting ended`}` : '';
      const asked = q.timeQ ? 'Times it gives, as he wrote them:' : 'The closest passages:';
      blocks.push(lead([said ? 'The site’s own records quote no words of his on this. ' : '', { ent: authorRec.id, txt: authorRec.label }, ` ${writ}${lag}. ${asked}`], [authorRec.id]));
    } else {
      const who = sideOnly === 'confederate' ? 'Confederate ' : sideOnly === 'union' ? 'Union ' : '';
      blocks.push(lead([q.timeQ ? `Times the ${who}reports give, each in its author’s words:` : `What the ${who}reports say, each in its author’s words:`]));
    }
    for (const x of quotes) blocks.push(x);
    const OCR_CAUTION = ' The words are machine-read from the 1889 print and may carry scanning errors.';
    blocks.push(mixed
      ? note('mixed', 'Reports are written after the fact, from memory and notes; dispatches are written at the time they are dated, on the sender’s own clock. Each quote says which it is.' + OCR_CAUTION)
      : allDispatch
      ? note('contemporary', 'A dispatch is written at the time it is dated; the clock is the sender’s own, and local times differed by several minutes.' + OCR_CAUTION)
      : note('retrospect', (q.timeQ ? 'These are the times the authors wrote, from memory and notes after the fact: reports of the same event often differ by an hour or more, and the site’s own timeline is a separate, proposed reconstruction.' : 'An official report is written after the fact, from the author’s memory and notes; reports of the same event often differ.') + ' The words are machine-read from the 1889 print and may carry scanning errors.'));
    S.quotes = quotes;
    return { mode, blocks, src: authorRec ? [authorRec.id] : [] };
  }

  return { detect, answer, answerSaid, topicTerms };
}
