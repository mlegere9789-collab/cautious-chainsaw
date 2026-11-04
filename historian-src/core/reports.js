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
import { embeddedDispatches } from './embedded.js';

const REPORT_NOUN = /\b(?:official records?|reports?|reported|reporting|dispatch(?:es)?|despatch(?:es)?|telegrams?|telegraph(?:ed|s)?|wired)\b/;
const DISPATCH_WORD = /\b(?:dispatch(?:es)?|despatch(?:es)?|telegrams?|telegraph(?:ed|s)?|wired)\b/;                // the question asks for what was SENT at the time, not for a report written afterwards
const REPORT_WORD = /\b(?:reports?|reported|reporting)\b/;
const WRITE_DATED = /\bwr(?:ite|ote|ites|itten)\b[^?]{0,40}\b(?:on|of|dated)\s+(?:jun|jul|aug)[a-z]*\.?\s*\d/;                // "what did Pleasonton write on June 20": what he sent that day
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
// "what did Halleck tell Heintzelman on July 5", "... ask ...", "... order Schenck to do ...", "... send to ...", "... report to ...": the verbs of a message, asked of a day. Without a date the question is about speech
// or a movement ("reported to Meade") and is not taken here
const SEND_VERBS = 'tell|told|tells|ask|asked|asks|order|ordered|orders|send|sent|sends|message|messaged|wire|wired|inform|informed|report(?:ed|s)?(?=\\s+to\\b)|request|requested|advise|advised|direct|directed';   // "report" only as "report to X": "what did Lee report about the assault on July 3" asks for his report, not his dispatches
const SEND_Q = new RegExp(`\\bwhat\\s+(?:did|does|was)\\s+[^?]{1,60}?\\b(?:${SEND_VERBS})\\b[^?]{0,70}\\b(?:jun|jul|aug)[a-z]*\\.?\\s*\\d`, 'i');
// "who wrote to Doubleday or Howard at 12.10 p. m. on July 1": the sender is what is asked; the addressees, the day and the clock are the filter
const WHO_TO = /^who\s+(?:wrote|telegraphed|wired|sent|messaged|dispatched|ordered|asked|told)\b[^?]{0,25}?\bto\b/;
const SEND_VERB_AT =new RegExp(`^(?:${SEND_VERBS})$`, 'i');
// words that are the question's frame, not its topic
const FRAME = new Set(['report', 'reports', 'reported', 'reporting', 'dispatch', 'dispatches', 'official', 'record', 'records', 'say', 'said', 'says', 'write', 'wrote', 'writes', 'written', 'state', 'stated', 'claim', 'claimed', 'recall', 'recalled', 'mention', 'mentioned', 'describe', 'described', 'describes', 'according', 'give', 'gave', 'given', 'time', 'hour', 'author', 'officer', 'general', 'colonel', 'captain', 'major', 'lieutenant', 'commander', 'confederate', 'union', 'federal', 'rebel', 'did', 'does', 'about', 'regarding', 'concerning', 'telegraph', 'telegraphed', 'telegram', 'telegrams', 'wired', 'send', 'sent', 'july', 'june', 'august', 'tell', 'told', 'ask', 'asked', 'order', 'ordered', 'message', 'messaged', 'inform', 'informed', 'request', 'requested', 'advise', 'advised', 'direct', 'directed', 'sends'].map(stem));
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateText = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${MONTHS[+m[2]]} ${+m[3]}, ${m[1]}` : null; };
// words that say the same thing in a report of 1863 ("the assault began" / "the attack was commenced" / "the movement was begun"): used to find the sentence, never shown
const SYN = [['assault', 'attack', 'charge', 'advance', 'onset', 'engage'], ['began', 'begin', 'begun', 'start', 'commence', 'opened', 'open', 'initiate']].map((g) => g.map(stem));
const expand = (topic) => { const out = new Set(topic); for (const g of SYN) if (g.some((w) => out.has(w))) for (const w of g) out.add(w); return out; };
const lead = (runs, src = []) => ({ t: 'lead', runs: runs.map((r) => (typeof r === 'string' ? { txt: r } : r.ent === null || r.ent === undefined ? { txt: r.txt } : r)), src: src.filter(Boolean) });
const note = (code, txt) => ({ t: 'note', code, txt });

export function createReports(kb, { corpus = 'or27' } = {}) {
  if (!kb || !kb.hasCorpus || !kb.hasCorpus(corpus)) return null;
  const C = kb.corpusOf ? kb.corpora.find((c) => c.name === corpus) : null;
  const R = kb.idx.R;
  const inCorpus = (n) => n >= C.base && n < C.base + C.count;

  /** does this question ask for what someone reported (or at what time a report says something)? -> null | { kind, timeQ, authorIdx, mention } */
  function detect(S, parts) {
    const norm = S.norm || '';
    if (!norm || REPORT_TO.test(norm) && !SEND_Q.test(norm) && !/\breports? (?:of|by|on|about)\b/.test(norm)) return null;
    if (OTHER_SOURCE.test(norm)) return null;
    if (WHO_TO.test(norm) && dateOf(norm)) {
      const after = String(S.text || '').replace(/^[\s\S]*?\bto\b/i, ''), cut = after.split(/\b(?:at|on|in|during|between|around|about)\b/i)[0];
      const names = (cut.match(/\b[A-Z][a-z’']{2,}\b/g) || []).filter((w) => !/^(?:June|July|August|Union|Confederate|General|Colonel|Major|Captain)$/.test(w));
      if (names.length) return { kind: 'who', timeQ: false, names, authorIdx: null, cands: [], prefer: null, mention: null };
    }
    const sendQ = SEND_Q.test(norm), cue = REPORT_NOUN.test(norm) || WRITE_TO.test(norm) || sendQ, say = SAY.test(norm);
    if (!cue && !say) return null;
    const timeQ = TIME_Q.test(norm);
    // "what did Lee say to his men" is about speech, not a document: without the word report, dispatch or official records only a question about a TIME that someone says / states / claims is taken
    if (!cue && !(timeQ && QWORD.test(norm.trim()))) return null;
    const persons = parts.persons.filter((r) => r.k === 'person'), units = parts.units;
    const toks = S.tokens || [];
    const cueAt = toks.map((t, i) => (/^(?:report|reports|reported|reporting|dispatch|dispatches|telegraph|telegraphed|telegram|telegrams|wired|official|say|said|says|write|wrote|writes|written|state|stated|claim|claimed|recall|recalled|mention|mentioned|describe|described|according|tell|told|tells|ask|asked|asks|order|ordered|orders|send|sent|sends|message|messaged|wire|inform|informed|request|requested|advise|advised|direct|directed)$/.test(t) ? i : -1)).filter((i) => i >= 0);
    const verbIdx = sendQ ? toks.findIndex((t) => SEND_VERB_AT.test(t)) : -1;
    // the author is the person (or unit) named next to the cue: "Lee's report", "report of General Lee", "what did Lee report", "what time did Longstreet say"
    const near = (m) => { if (!cueAt.length) return 99; const mid = (m.start + m.end) / 2; return Math.min(...cueAt.map((c) => Math.abs(c - mid))); };
    const ms = (S.mentions || []).filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length && (m.start !== undefined));
    let best = null;
    const AUTHOR_UNIT = ['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit'];
    const sideWord = SIDE_ONLY.exec(norm);
    for (const m of ms) {
      if (sideWord && m.start !== undefined && toks.slice(m.start, m.end).every((t) => stem(t) === stem(sideWord[1]))) continue;                  // "Union reports": an adjective, not the Army of the Potomac
      if (m.start > 0 && toks[m.start - 1] === 'to') continue;                                                                                      // "telegraph to Meade": the addressee, not the author
      if (sendQ && verbIdx >= 0 && m.start >= verbIdx) continue;                                                                                  // "what did Halleck tell Heintzelman": the man after the verb is the addressee
      // the words that name the author may name several records ("Buford": the man, his division; "Hays": two men): which of them WROTE something is decided in run(), from the corpus
      const base = m.kind === 'unit' ? [m.best] : m.ids.slice();
      // a surname alone ("Buford") may be read as the unit named after him (his division): the men of that surname are candidates too
      if (m.kind !== 'unit' && m.phrase && !/ /.test(String(m.phrase).trim())) for (const i of (kb.idx.surnames && kb.idx.surnames.get(String(m.phrase).trim())) || []) if (!base.includes(i)) base.push(i);
      const cands = base.filter((i) => R[i] && (R[i].k === 'person' || AUTHOR_UNIT.includes(R[i].k)));
      if (!cands.length) continue;
      const d = near(m); if (d > 4) continue;
      if (!best || d < best.d) best = { d, cands, m };
    }
    // an author the site's registry does not hold ("what did Ruger report"): the capitalised words of the question that name no site entity are candidates; run() asks the corpus (F:<stem>) whether one of them wrote anything
    if (!best && (cue || (timeQ && QWORD.test(norm.trim()))) && !REPORTS_NOUN.test(norm)) {
      const covered = new Set(); for (const m of S.mentions || []) for (let k = m.start; k < m.end; k++) if (toks[k]) covered.add(stem(toks[k]));
      const vpos = sendQ ? String(S.text || '').search(new RegExp(`\\b(?:${SEND_VERBS})\\b`, 'i')) : -1;      // "what did Halleck tell Heintzelman": the sender stands before the verb
      const names = [...new Set([...String(S.text || '').matchAll(/\b[A-Z][a-z’']{3,}\b/g)].filter((m) => !(sendQ && vpos >= 0 && m.index >= vpos)).map((m) => m[0]).filter((w) => !(S.text.startsWith(w)) && !STOP.has(w.toLowerCase()) && !FRAME.has(stem(w.toLowerCase())) && !covered.has(stem(w.toLowerCase())) && !/^(?:June|July|August|Union|Confederate|Federal|Rebel|Army|Corps|Division|Brigade|Gettysburg)$/.test(w)))];
      if (names.length) return { kind: 'unregistered', timeQ: timeQ && (cue || say), names, authorIdx: null, cands: [], prefer: null, mention: null };
    }
    if (!best && !persons.length && !units.length && !cue) return null;
    if (!cue && !(best && best.cands.some((i) => R[i].k === 'person'))) return null;
    if (!best && !REPORTS_NOUN.test(norm)) return null;                                           // no author and no "the reports say": a verb ("newspapers report the outcome") is not a question of the volume
    const out = { kind: best ? 'author' : 'generic', timeQ: timeQ && (cue || say), authorIdx: best ? best.cands[0] : null, cands: best ? best.cands : [], prefer: best && !best.m.amb && best.m.kind !== 'unit' && best.cands.includes(best.m.best) ? best.m.best : null, mention: best ? best.m : null };
    // a name the engine's typo repair changed into a registry name ("Kelley" read as "Kelly"): the corpus is asked about the name as written first, the registry's reading stays as the fallback
    if (best) { const words = (S.notes || []).filter((n) => n.kind === 'fuzzy' && n.from && toks.slice(best.m.start, best.m.end).some((t) => stem(t) === stem(String(n.to).toLowerCase()))).map((n) => String(n.from)); if (words.length) return { kind: 'unregistered', timeQ: out.timeQ, names: words.map((w) => w[0].toUpperCase() + w.slice(1)), authorIdx: null, cands: [], prefer: null, mention: null, fallback: out }; }
    return out;
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
    const take = ranked.slice(0, wide || timeQ ? 40 : 14).map((x) => x.n);       // wide: a day, a kind or a clock is asked for: the filters below must have candidates to keep
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
    let topic = topicTerms(S, q);
    // a word the print spells with a hyphen ("wheat-field") is asked for as one ("Wheatfield"): a topic word the corpus does not hold, whose two halves it does, is read as the two
    if (topic.length && kb.corp) {
      const dfC = (t) => { const c = kb.corp.df(t); return c ? c.df : 0; };
      await kb.scorePassages(topic, true);                                                          // the corpus knows the document frequency of the terms it has scored
      const unk = topic.filter((w) => w.length >= 7 && !dfC(w)); const parts = (w) => { const o = []; for (let i = 3; i <= w.length - 3; i++) o.push([stem(w.slice(0, i)), stem(w.slice(i))]); return o; };
      if (unk.length) { await kb.scorePassages([...new Set(unk.flatMap((w) => parts(w).flat()))], true); topic = topic.flatMap((w) => (unk.includes(w) ? (parts(w).find(([x, y]) => dfC(x) && dfC(y)) || [w]) : [w])); }
    }
    const surface = (st) => { const w = (String(S.text || '').match(/[A-Za-z’']+/g) || []).find((x) => stem(x.toLowerCase()) === st); return w || st; };       // the word as the question wrote it ("Williams", "fighting"), not its stem ("william", "fight")
    const tw = topic.map(surface).join(' ');
    const ctx = { qStems: expand(topic), litStems: new Set(topic), entStems: new Set(), timeQ: q.timeQ, requireClockWindow: q.timeQ, requireTopic: topic.length > 0 };
    // a topic of three words or more ("the cannonade and Cemetery Hill"): a window holds at least two of them; chosen among the windows that do, not cut down afterwards from the best-scored two
    if (q.kind === 'author' && !q.timeQ && topic.length >= 3) ctx.windowOk = (p, s, e) => { const st = new Set(tokenize(p.text.slice(s, e)).map(stem)); return [...ctx.qStems].filter((t) => st.has(t)).length >= 2; };
    let nums = [], authorRec = null, quotes = [], mode = 'answer', kindLabel = null, docMeta = null, relaxedNote = '', yesSet = null;
    const norm = S.norm || '';
    const askD = WHO_TO.test(norm) || DISPATCH_WORD.test(norm) || WRITE_TO.test(norm) || WRITE_DATED.test(norm) || SEND_Q.test(norm), askR = REPORT_WORD.test(norm) && !askD;
    const dateIso = dateOf(norm); const dateWords = dateIso ? `${MONTHS[+dateIso.slice(5, 7)]} ${+dateIso.slice(8)}, 1863` : null;
    const dayCode = dateIso ? +dateIso.slice(5, 7) * 100 + +dateIso.slice(8) : null;
    const sideM = SIDE_ONLY.exec(norm); const sideOnly = sideM ? (/^(?:confederate|rebel)$/.test(sideM[1]) ? 'confederate' : 'union') : null;
    /** numbers of the corpus passages carrying a pseudo-entity (K:dispatch, K:report, D:1863-07-03, C:0703 (a clock said about that day), F:<stem> (signed by), A:<stem> (addressed to)), or null when the KB has none */
    const withTag = async (...tags) => { const e = await kb.entityPassages(tags, true); const out = new Set(); for (const [n, v] of e) if (inCorpus(n)) out.add(n); return out.size ? out : null; };
    const dayName = (code) => `${MONTHS[Math.floor(code / 100)]} ${code % 100}`;
    // A question about the clock of a day: a quoted window holds clocks of that day and of no other ("a day asked is not answered with another day's times": 'what time did Longstreet report the assault began on July 3'
    // was answered with the July 2 times of his report). The claim of every clock sentence carries the day it is said about (the build's day register: a date in the sentence, a day carried).
    if (q.timeQ && dayCode) ctx.windowOk = (p, s, e) => { const w = (p.clk || []).filter((c) => Array.isArray(c) && c[0] >= s && c[0] < e); return w.length > 0 && w.every((c) => c[1] === dayCode); };
    // A question that names a day and asks for a report (not a time): the passages that speak of that day (Y:<month*100+day>, the build's own reading of the dates written in the passage: "July 3", "the 3d instant", "on the 3d"),
    // never "the closest passages" of another day.
    const ySet = async () => (dayCode ? withTag('Y:' + String(dayCode).padStart(4, '0')) : null);
    const toWho = askD && (/\sto\s/.test(norm) || SEND_Q.test(norm)) && topic.length > 0;
    // A dispatch the volume prints inside a report (Part 1 and 2: Meade's telegrams to Halleck, Hooker's to the President) is a block of its passage (core/embedded.js). A window quoted for a dispatch question lies inside a block
    // that matches the question: its date, its sender (a block with no printed signature is not claimed for a named sender), its addressee when the question names one. Part 3 passages are whole dispatches and are not restricted.
    let senderStems = null, toWhoStems = toWho ? topic.slice() : null;
    const stemsOf = (t) => tokenize(String(t || '')).map(stem);
    // a block with no printed signature (the passage is cut, or the print drops it) is the author of the report it is printed in only when the question names that author: Meade's telegram in Meade's own report
    const blockOk = (b, p) => (!dateIso || b.written === dateIso) && (!senderStems || senderStems.some((x) => stemsOf(b.sender || (p && p.cite && p.cite.author_line ? p.cite.author_line.replace(/\bto\b.*$/, '') : '')).includes(x))) && (!toWhoStems || (!!b.addressee && toWhoStems.some((x) => stemsOf(b.addressee).includes(x))));
    // a quote of such a dispatch starts where the dispatch starts (its header, or the first lines of its body), so that it shows what the dispatch begins with and not only its address line at the foot
    const embOk = (p, s, e) => { if (!/^or27-[12]:/.test(p.id)) return true; return embeddedDispatches(p.text).some((b) => s >= b.s - 1 && s <= b.h + 120 && e <= b.e + 1 && blockOk(b, p)); };
    if (askD && toWho) ctx.requireTopic = false;                                                  // the addressee is a filter (the A: tags and the block above), not a word the quoted window must hold: a letter's address stands at its foot
    if (askD) { const prevOk = ctx.windowOk; ctx.windowOk = (p, s, e) => (prevOk ? prevOk(p, s, e) : true) && embOk(p, s, e); }
    const addrOf = (p) => { const m = /\bto (.+)$/.exec((p.cite && p.cite.author_line) || ''); return m ? m[1] : null; };
    // An author the site's registry does not hold ("what did Ruger report": the registry has the 706 officers of the battle, not every colonel who reported): the capitalised words of the question that name no site
    // entity are candidates, and the first that the corpus itself marks as a sender (F:<surname stem>: the signature of a dispatch, the author of a report) is the author. Nothing about him is invented: his label is
    // the corpus's own author line, and when several men of that surname wrote in the volume only the surname is used.
    if (q.kind === 'unregistered') {
      let hit = null;
      for (const nm of q.names) {
        const st = stem(nm.toLowerCase()); const t = await withTag('F:' + st); if (!t) continue;
        const P0 = await kb.passages([...t].slice(0, 400)); const byDoc = new Map(); for (const p of P0.values()) if (!byDoc.has(p.doc)) byDoc.set(p.doc, p);
        const labels = [...new Set([...byDoc.values()].map((p) => String((p.cite && p.cite.author_line) || '').replace(/ to .*$/, '').replace(/,\s.*$/, '').trim()).filter(Boolean))];
        hit = { nm, st, nums: [...t].sort((a, b) => a - b), label: labels.length === 1 ? labels[0] : nm }; break;
      }
      if (!hit) {
        // a dispatch asked of a named sender whom no signature of the volume carries ("what did Sherman telegraph to Meade on July 5"): said, not answered with the card of the army he is asked to write to
        if (askD && !q.fallback && q.names && q.names.length) {
          const nm = q.names[0]; S.intent = q.timeQ ? 'reported-time' : 'report-of'; S.quotes = [];
          return { mode: 'partial', blocks: [lead([`I did not find a dispatch or letter signed ${nm} in the Official Records (series I, volume 27) as held here.`]), note('no-dispatch', `What I searched: the printed signatures of the dispatches, letters and orders of the volume and the authors of its reports; none reads “${nm}”. A signature the scan garbled is not among them.`)], src: [], limited: true };
        }
        if (!q.fallback) return null; q = q.fallback;
      }
      else {
        q = { ...q, kind: 'author', unreg: hit }; authorRec = { id: null, k: 'person', label: hit.label, attrs: { surname: hit.nm } }; nums = hit.nums;
        // the sender's own name is not a topic of the question ("what did Halleck tell Heintzelman": the topic is Heintzelman), nor is the registry's repair of a name as written ("Kelley" read as "Kelly" by the typo repair)
        const repaired = (S.notes || []).filter((n) => n.kind === 'fuzzy' && n.to).map((n) => stem(String(n.to).toLowerCase()));
        topic = topic.filter((x) => x !== hit.st && !repaired.includes(x)); if (toWhoStems) toWhoStems = toWhoStems.filter((x) => x !== hit.st && !repaired.includes(x)); if (!topic.length) ctx.requireTopic = false;
      }
    }
    if (q.kind === 'who') {
      // the dispatches of the day addressed to one of the names (A:<stem>), at the clock asked when the question gives one (the header prints it); the sender is read from the dispatch, never guessed
      const stems = q.names.map((n) => stem(n.toLowerCase())); toWhoStems = stems; topic = []; ctx.requireTopic = false; ctx.qStems = new Set();
      const dTag = await withTag('K:dispatch'), aTag = await withTag(...stems.map((x) => 'A:' + x)), dd = dateIso ? await withTag('D:' + dateIso) : null;
      let pool = dTag && aTag ? [...aTag].filter((n) => dTag.has(n) && (!dd || dd.has(n))).sort((a, b) => a - b) : [];
      const ck = /\b(\d{1,2})(?:\s?[.:]\s?(\d{2}))?\s*([ap])\.?\s?m\b/i.exec(String(S.text || ''));
      const names = q.names.join(' or ');
      const ckText = ck ? `${+ck[1]}${ck[2] ? '.' + ck[2] : ''} ${ck[3].toLowerCase()}. m.` : '';
      const decline = (text, why) => { S.intent = 'report-of'; S.quotes = []; return { mode: 'partial', blocks: [lead([text]), note('no-dispatch', why)], src: [], limited: true }; };
      if (ck && pool.length) {
        const h = +ck[1], m = ck[2] || '00', hh = [String(h), String(h).padStart(2, '0')], re = new RegExp(String.raw`(?:^|[^0-9])(?:${hh.join('|')})\s?[.:]\s?${m}\s?${ck[3]}\b`, 'i'), reH = ck[2] ? null : new RegExp(String.raw`(?:^|[^0-9])(?:${hh.join('|')})\s?${ck[3]}\b`, 'i');
        const P0 = await kb.passages(pool.slice(0, 400)); pool = pool.filter((n) => { const p = P0.get(n); if (!p) return false; const head = p.text.slice(0, 700); return re.test(head) || (reH && reH.test(head)); });
        if (!pool.length) return decline(`I did not find a dispatch or letter addressed to ${names} at ${ckText} on ${dateWords.replace(', 1863', '')} in the Official Records (series I, volume 27) as held here.`, 'What I searched: the dispatches, letters and orders of the volume whose addressee reads that name, dated that day; none prints that hour in its header. I did not offer the nearest hour in its place.');
      }
      if (!pool.length) return decline(`I did not find a dispatch or letter addressed to ${names}${dateWords ? ' dated ' + dateWords : ''} in the Official Records (series I, volume 27) as held here.`, 'What I searched: the dispatches, letters and orders of the volume (the addressee line of each and the day it is dated).');
      S.intent = 'report-of';
      const P1 = await kb.passages(pool.slice(0, 12)); const list1 = pool.slice(0, 12).map((n) => ({ p: P1.get(n), score: 1 })).filter((x) => x.p);
      const qs = selectQuotes(kb, list1, ctx, { max: 3, minScore: 0, sameRec: true, maxWords: 80, maxSents: 3, rerank: false }).filter((x) => x.text);
      if (!qs.length) return decline(`I found ${pool.length} dispatch${pool.length === 1 ? '' : 'es'} addressed to ${names} on ${dateWords.replace(', 1863', '')}, but no passage of it to quote.`, 'The words are only offered as printed.');
      S.quotes = qs;
      const senders = [...new Set(qs.map((x) => String((x.cite && x.cite.author_line) || '').replace(/ to .*$/, '').trim()).filter(Boolean))];
      const outBlocks = [lead([`${pool.length === 1 ? 'One dispatch' : pool.length + ' dispatches'} in the volume ${pool.length === 1 ? 'is' : 'are'} addressed to ${names} on ${dateWords.replace(', 1863', '')}${ck ? ' at ' + ckText : ''}${senders.length ? '; ' + (senders.length === 1 ? 'it was written by ' : 'written by ') + senders.join(' and ') : ''}. Each is quoted as printed:`])];
      for (const x of qs) outBlocks.push(x);
      outBlocks.push(note('contemporary', 'A dispatch is written at the time it is dated; the clock is the sender’s own, and local times differed by several minutes. The words are machine-read from the 1889 print and may carry scanning errors.'));
      return { mode: 'answer', blocks: outBlocks, src: [] };
    }
    if (q.kind === 'author' && !q.unreg) {
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
        pickId = pref && who.includes(pref) ? pref : ps.length === 1 ? ps[0] : null;
        // several men of that surname wrote in the volume and the question does not say which ("what time did Williams telegraph to Crawford on June 23"): a dispatch question is asked of the signatures that read that
        // surname, as for an author the registry does not hold, and the label is the one the corpus prints; naming one of the men would be a guess
        if (!pickId && askD && q.mention && q.mention.phrase) {
          const ph = String(q.mention.phrase).trim().split(/\s+/).pop().toLowerCase(), word = (String(S.text || '').match(/[A-Za-z’']+/g) || []).find((w) => w.toLowerCase() === ph || stem(w.toLowerCase()) === stem(ph)) || ph;    // the name as the question wrote it
          if (/^[A-Za-z’']{3,}$/.test(word)) return run(S, { kind: 'unregistered', timeQ: q.timeQ, names: [word[0].toUpperCase() + word.slice(1)], authorIdx: null, cands: [], prefer: null, mention: null }, { said });
        }
        if (!pickId) return null;
      }
      else { const ps = candIds.filter(isPerson); pickId = ps.length === 1 ? ps[0] : candIds.length === 1 ? candIds[0] : null; if (!pickId) return null; }
      authorRec = R[cands[candIds.indexOf(pickId)]];
      const name = authorRec.label;
      nums = [...ep.entries()].filter(([n, v]) => inCorpus(n) && v.ids.some(([id, role]) => id === pickId && role >= 2)).map(([n]) => n).sort((a, b) => a - b);
      if (askD && authorRec.k === 'person') {
        // "what did Slocum telegraph on July 2": the dispatches tied to him by the build (his signature read as his), AND every dispatch whose printed signature carries his surname (the build ties only a signature it can read
        // to the register's man: 3 of 4 dispatches carry no link). Nothing is called absent that was not searched for by its signature, and what was searched is said.
        const dTag = await withTag('K:dispatch'); const isDisp = (n) => !!dTag && dTag.has(n);
        const sn = authorRec.attrs && authorRec.attrs.surname; const stemKey = sn ? (tokenize(String(sn))[0] ? stem(tokenize(String(sn))[0]) : null) : null;
        if (stemKey) senderStems = [stemKey];
        const sigTag = stemKey ? await withTag('F:' + stemKey) : null;
        const byLink = nums.filter(isDisp); const bySig = sigTag ? [...sigTag].filter(isDisp) : [];
        let pool = [...new Set([...byLink, ...bySig])].sort((a, b) => a - b);
        const searched = pool.length;
        const surname = String(sn || name.split(' ').pop());
        const noneFound = async (why) => {
          // what exists: the dates of the dispatches that were searched, and how many of that day carry no signature the scan let me read
          const P = await kb.passages(pool.slice(0, 400)); const days = [...new Set([...P.values()].map((p) => p.persp && p.persp.written).filter(Boolean))].sort();
          const dayTxt = days.length ? ` Dispatches signed ${surname} are dated ${days.slice(0, 8).map((d) => dateText(d).replace(', 1863', '')).join(', ')}${days.length > 8 ? ` and ${days.length - 8} more days` : ''}.` : '';
          let unsigned = '';
          if (dateIso) { const dd = await withTag('D:' + dateIso); const none = await withTag('F:none'); if (dd) { const nu = none ? [...dd].filter((n) => none.has(n) && isDisp(n)).length : 0; unsigned = ` The volume prints ${dd.size} passage${dd.size === 1 ? '' : 's'} of dispatches dated ${dateText(dateIso).replace(', 1863', '')}${nu ? `, ${nu} of them with no signature I could read` : ''}.`; } }
          S.intent = 'report-of'; S.quotes = [];
          const lead_ = (dateIso && !(dateIso >= '1863-06-01' && dateIso <= '1863-08-03'))
            ? `The dispatches of the Official Records (series I, volume 27) as held here are dated from early June to early August 1863 (a few later ones stand in its addenda); none is dated ${dateWords}.`
            : `I did not find a dispatch or letter ${why} in the Official Records (series I, volume 27) as held here.`;
          return { mode: 'partial', blocks: [lead([lead_], [authorRec.id]), note('no-dispatch', `What I searched: the ${searched} passage${searched === 1 ? '' : 's'} of dispatches, letters and orders in Part 3 whose printed signature reads “${surname}”${byLink.length ? ` (${byLink.length} of them tied to ${name} himself)` : ''}.${dayTxt}${unsigned} A signature the scan garbled is not among those, so this does not show that none was written.`)], src: authorRec.id ? [authorRec.id] : [], limited: true };
        };
        if (!pool.length) return noneFound(`sent by ${name}`);
        if (dateIso) { const d = await withTag('D:' + dateIso); const r = d ? pool.filter((n) => d.has(n)) : []; if (!r.length) return noneFound(`from ${name}${toWho ? ' to ' + tw : ''} dated ${dateWords}`); pool = r; }
        if (toWho) {
          // "what did Pleasonton write to Williams on June 9": the dispatches addressed to him; if there is none, the other dispatches he wrote that day, and it is said that none was to him
          const t = await withTag(...topic.map((x) => 'A:' + x)); const r = t ? pool.filter((n) => t.has(n)) : [];
          if (r.length) pool = r;
          else { const P = await kb.passages(pool.slice(0, 40)); const tos = [...new Set([...P.values()].map(addrOf).filter(Boolean).map((a) => a.replace(/,.*$/, '')))].slice(0, 4);
            toWhoStems = null; topic = []; ctx.requireTopic = false; ctx.qStems = new Set();                                  // the addressee was only a filter: with none addressed, the dispatches of the day are shown, not searched for his name
            relaxedNote = `None of ${name}’s dispatches${dateWords ? ' of ' + dateWords.replace(', 1863', '') : ''} is addressed to “${tw}”; ${pool.length === 1 ? 'the one' : 'the ' + pool.length}${dateWords ? ' he wrote that day' : ' I found'} went to ${tos.join(' and ') || 'others'}. `; }
        }
        nums = pool;
      } else if (nums.length) {
        // "what did Lee report": his report, not his telegrams (candidates are cut before they are ranked)
        if (askD) { const t = await withTag('K:dispatch'); const r = t ? nums.filter((n) => t.has(n)) : []; if (r.length) nums = r; }
        if (askR) {
          const t = await withTag('K:report'); const r = t ? nums.filter((n) => t.has(n)) : [];
          if (r.length) nums = r;
          else if (authorRec.k === 'person') {
            // "what did Pickett report": he wrote no report in the volume (his letters, if any, are dispatches: said, not quoted as a report)
            S.intent = 'report-of'; S.quotes = [];
            return { mode: 'partial', blocks: [lead([`The Official Records (series I, volume 27) as held here include no report written by ${name}.`, ` They print ${nums.length === 1 ? 'one dispatch' : `${nums.length} dispatches`} he sent; ask for his dispatches.`], [authorRec.id]), note('no-report', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')], src: authorRec.id ? [authorRec.id] : [], limited: true };
          }
        }
        // a day in the question ("about the cavalry fight on July 3"): the passages that speak of that day; none is said, not answered with the closest passage of another day
        if (dateIso && !q.timeQ) {
          const y = await ySet(); const yes = y ? nums.filter((n) => y.has(n)) : [];
          // a passage that names no day and stands on none (the narrative has named no day yet) is not another day's: kept, after those that speak of the day asked
          const rest = nums.filter((n) => !yes.includes(n)); const P0 = rest.length ? await kb.passages(rest.slice(0, 600)) : new Map();
          const r = yes.concat(topic.length ? [...P0].filter(([, p]) => !(p.ds && p.ds.length)).map(([n]) => n) : []); yesSet = new Set(yes);
          if (!r.length) {
            S.intent = 'report-of'; S.quotes = [];
            return { mode: 'partial', blocks: [lead([`${name} wrote ${askR ? 'a report' : 'in the volume'}, but none of its ${nums.length} passages speaks of ${dateWords} that I could find.`], [authorRec.id]), note('no-day', 'I looked for the date written in the passage (“July 3”, “the 3d instant”) or the day the passage is about; I did not answer with the closest passage of another day.')], src: authorRec.id ? [authorRec.id] : [], limited: true };
          }
          nums = r;
        }
        // a question about the clock of a day: the passages that hold a clock said about that day
        if (q.timeQ && dayCode) {
          const c = await withTag('C:' + String(dayCode).padStart(4, '0')); const r = c ? nums.filter((n) => c.has(n)) : [];
          if (!r.length) {
            const P = await kb.passages(nums.slice(0, 400)); const days = new Set(); for (const p of P.values()) for (const e of p.clk || []) if (Array.isArray(e) && e[1]) days.add(e[1]);
            S.intent = 'reported-time'; S.quotes = [];
            const other = [...days].sort((a, b) => a - b).slice(0, 6).map(dayName);
            return { mode: 'partial', blocks: [lead([`${name} gives no clock time for ${dateWords.replace(', 1863', '')} in the volume that I could find.`, other.length ? ` The times he does give are for ${other.join(', ')}.` : ''], [authorRec.id]), note('no-time-day', 'Only the clock times a passage says about that day are offered for it; times of other days are not given in their place.')], src: authorRec.id ? [authorRec.id] : [], limited: true };
          }
          nums = r;
        }
      }
      if (!nums.length) {
        if (authorRec.k !== 'person' || said) return null;                          // a unit with no report of its own, or a speech question: the ordinary flow answers (its card, the quotes about it)
        const any = [...ep.entries()].filter(([n, v]) => inCorpus(n) && v.ids.some(([id]) => id === pickId)).length;
        const blocks = [lead([`The Official Records (series I, volume 27) as held here include no report written by ${name}.`, any ? ` They do name him in ${any} passages; ask what the reports say about him.` : ''], [authorRec.id]), note('no-report', 'Only the reports and dispatches of the Gettysburg campaign printed in that volume are searched.')];
        S.intent = 'report-of'; S.quotes = [];
        return { mode: 'partial', blocks, src: authorRec.id ? [authorRec.id] : [], limited: true };
      }
    } else if (q.unreg) {
      // the author is a sender of the corpus the registry does not hold: the same restrictions as for a registered one (a kind, a day, a clock of a day), each said when it leaves nothing
      const sur = q.unreg.nm; senderStems = [q.unreg.st]; const decline = (code, text, why) => { S.intent = q.timeQ ? 'reported-time' : 'report-of'; S.quotes = []; return { mode: 'partial', blocks: [lead([text]), note(code, why)], src: [], limited: true }; };
      const isD = await withTag('K:dispatch'), isR = await withTag('K:report'); const nD = isD ? nums.filter((n) => isD.has(n)).length : 0, nR = isR ? nums.filter((n) => isR.has(n)).length : 0;
      const held = `What I searched: the ${nums.length} passage${nums.length === 1 ? '' : 's'} of the volume whose printed signature or report author reads “${sur}” (${nD} of dispatches, letters and orders, ${nR} of reports). A signature the scan garbled is not among them.`;
      if (askD && isD) { const r = nums.filter((n) => isD.has(n)); if (!r.length) return decline('no-dispatch', `I did not find a dispatch or letter signed ${sur} in the Official Records (series I, volume 27) as held here.`, held); nums = r; }
      if (askR && isR) { const r = nums.filter((n) => isR.has(n)); if (!r.length) return decline('no-report', `The Official Records (series I, volume 27) as held here include no report written by ${sur}.`, held); nums = r; }
      if (askD && dateIso) { const d = await withTag('D:' + dateIso); const r = d ? nums.filter((n) => d.has(n)) : []; if (!r.length) return decline('no-dispatch', `I did not find a dispatch or letter signed ${sur} dated ${dateWords} in the Official Records (series I, volume 27) as held here.`, held); nums = r; }
      else if (dateIso && !q.timeQ) {
        const y = await ySet(); const yes = y ? nums.filter((n) => y.has(n)) : []; const rest = nums.filter((n) => !yes.includes(n)); const P0 = rest.length ? await kb.passages(rest.slice(0, 600)) : new Map();
        const r = yes.concat(topic.length ? [...P0].filter(([, p]) => !(p.ds && p.ds.length)).map(([n]) => n) : []); yesSet = new Set(yes);
        if (!r.length) return decline('no-day', `${authorRec.label} wrote in the volume, but none of its ${nums.length} passages speaks of ${dateWords} that I could find.`, 'I looked for the date written in the passage (“July 3”, “the 3d instant”) or the day the passage is about; I did not answer with the closest passage of another day.');
        nums = r;
      }
      if (toWho) {                                                                                       // "what did Kelley write to Averell": the dispatches addressed to him; when none is, the others, and it is said
        const t = await withTag(...topic.map((x) => 'A:' + x)); const r = t ? nums.filter((n) => t.has(n)) : [];
        if (r.length) nums = r; else { toWhoStems = null; topic = []; ctx.requireTopic = false; ctx.qStems = new Set(); relaxedNote = `None of ${authorRec.label}’s dispatches${dateWords ? ' of ' + dateWords.replace(', 1863', '') : ''} is addressed to “${tw}”. `; }
      }
      if (q.timeQ && dayCode) { const c = await withTag('C:' + String(dayCode).padStart(4, '0')); const r = c ? nums.filter((n) => c.has(n)) : []; if (!r.length) return decline('no-time-day', `${authorRec.label} gives no clock time for ${dateWords.replace(', 1863', '')} in the volume that I could find.`, 'Only the clock times a passage says about that day are offered for it; times of other days are not given in their place.'); nums = r; }
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
      // a time of a named day: only passages that hold a clock said about that day
      if (q.timeQ && dayCode) { const c = await withTag('C:' + String(dayCode).padStart(4, '0')); if (c) { const r = all.filter(([n]) => c.has(n)); if (!r.length) return null; all = r; } }
      nums = all.sort((a, b) => b[1] - a[1]).slice(0, 60).map(([n]) => n);
      if (!nums.length) return null;
    }
    S.intent = q.timeQ ? 'reported-time' : 'report-of';
    let list = await pick(nums, topic, { timeQ: q.timeQ, wide: !!sideOnly || toWho || !!dateIso });
    if (yesSet && yesSet.size) list = list.map((x) => ({ ...x, score: x.score + (yesSet.has(x.p.num) ? 1.2 : 0) })).sort((a, b) => b.score - a.score);
    if (toWho && topic.length) { const inHead = (x) => { const hs = new Set(tokenize(x.p.text.slice(0, 220)).map(stem)); return topic.some((t) => hs.has(t)); }; list = list.map((x) => ({ ...x, score: x.score + (inHead(x) ? 1000 : 0) })).sort((a, b) => b.score - a.score); }
    if (!list.length) {
      if (q.kind === 'generic') return null;
      const P = await kb.passages(nums.slice(0, 1)); const p0 = [...P.values()][0];
      const name = authorRec.label;
      const blocks = [lead([`${name} wrote a report, but I did not find ${q.timeQ ? 'a clock time in it about that' : 'a passage in it about that'}.`], [authorRec.id])];
      if (p0) blocks.push(note('source', `The report is cited as ${p0.cite.short}.`));
      S.quotes = []; S.intent = 'report-of';
      return { mode: 'partial', blocks, src: authorRec.id ? [authorRec.id] : [], limited: true };
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
    quotes = selectQuotes(kb, list, ctx, q.kind === 'generic' ? { max: 3, minScore: 0.3, maxWords: 55, maxSents: 2, rerank: true } : { max: q.timeQ ? 3 : askD && dateIso ? 4 : 2, minScore: 0.3, sameRec: true, maxWords: q.timeQ ? 90 : 70, maxSents: q.timeQ ? 4 : 3, rerank: true });
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
      // a window about the author's report that holds only a word or two of a topic of three or more words is the nearest passage, not an answer: declined (the quotes below say what a window does hold)
      if (q.kind === 'author' && !q.timeQ && topic.length >= 3) { const need = 2; const hits = (x) => { const st = new Set(stems(x)); return [...ctx.qStems].filter((t) => st.has(t)).length; }; const k = quotes.filter((x) => hits(x) >= need); if (k.length < quotes.length) { quotes = k; } }
    }
    if (q.kind === 'author') quotes.sort((a, b) => (a.passage === b.passage ? a.s - b.s : (list.findIndex((x) => x.p.id === a.passage) >= 0 ? list.find((x) => x.p.id === a.passage).p.num : 0) - (list.find((x) => x.p.id === b.passage) ? list.find((x) => x.p.id === b.passage).p.num : 0)));   // in the order of the report
    if (!quotes.length && q.timeQ && dayCode && q.kind === 'author') {
      // the clocks of that day exist but none sits with the event asked about: they are given as what they are (the day's times, none tied to the topic), never the times of another day
      const ctx2 = { ...ctx, requireTopic: false };
      const q2 = selectQuotes(kb, list, ctx2, { max: 3, minScore: 0.3, sameRec: true, maxWords: 90, maxSents: 4, rerank: true }).filter((x) => x.clk);
      if (q2.length) { quotes = q2; relaxedNote = `No passage ties a clock time on ${dateWords.replace(', 1863', '')} to “${tw}”; these are the times ${authorRec.label} gives for that day, as he wrote them. `; }
    }
    if (!quotes.length) {
      // a time asked of a day, a topic the passages do not touch: said, not hidden behind the nearest sentence
      if (q.kind === 'author' && (q.timeQ && dayCode || dateIso && !q.timeQ)) {
        S.intent = q.timeQ ? 'reported-time' : 'report-of'; S.quotes = [];
        const about = topic.length ? `“${tw}”` : 'that';
        const msg = q.timeQ ? `${authorRec.label} gives clock times for ${dateWords.replace(', 1863', '')}, but none of them sits with ${about}.` : `${authorRec.label} wrote ${nums.length === 1 ? 'a passage' : nums.length + ' passages'} in the volume that speak${nums.length === 1 ? 's' : ''} of ${dateWords.replace(', 1863', '')}, but none speaks of ${about}.`;
        return { mode: 'partial', blocks: [lead([msg], [authorRec.id]), note('no-match', 'I did not offer the closest passage of another day, or of another subject, in its place.')], src: authorRec.id ? [authorRec.id] : [], limited: true };
      }
      return null;
    }
    // a topic the best passages do not touch is said, not hidden behind the nearest sentence
    const first = list.find((x) => x.p.id === quotes[0].passage).p;
    // a quote that lies inside a dispatch printed within a report is a dispatch: written at the date of the block, not a retrospective report
    const embPersp = (x, p) => { if (!askD || !/^or27-[12]:/.test(p.id) || (p.persp && p.persp.contemporaneous)) return p.persp || {}; const b = embeddedDispatches(p.text).find((y) => x.s >= y.s - 1 && x.e <= y.e + 1 && blockOk(y, p)); return b ? { ...(p.persp || {}), contemporaneous: true, retrospective: false, composite: false, written: b.written, lag_days: null } : (p.persp || {}); };
    docMeta = embPersp(quotes[0], first);
    // the attribution of a quote that lies inside a dispatch printed within a report names the dispatch (its date, its signer, its addressee) and the report it is printed in, never "official report, written after the fact"
    if (askD) for (const x of quotes) {
      const p = list.find((y) => y.p.id === x.passage).p; if (!/^or27-[12]:/.test(p.id) || (p.persp && p.persp.contemporaneous)) continue;
      const b = embeddedDispatches(p.text).find((y) => x.s >= y.s - 1 && x.e <= y.e + 1 && blockOk(y, p)); if (!b) continue;
      const short = p.cite && p.cite.short ? p.cite.short : ''; const page = typeof x.attrib === 'string' && short && x.attrib.startsWith(short + ', ') ? x.attrib.slice(short.length + 2) : '';
      const al = p.cite && p.cite.author_line ? p.cite.author_line : 'the report';
      const orPart = short.split('; ').pop(); const clean = (t) => String(t).replace(/[\s,.;:]+$/, '');
      x.attrib = `dispatch dated ${dateText(b.written)}${b.sender ? ', signed ' + clean(b.sender) : ''}${b.addressee ? ', to ' + clean(b.addressee) : ''}, as printed within the report of ${al}; ${orPart}${page ? ', ' + page : ''}`;
    }
    const blocks = [];
    // what the quotes come from: one document (its own date and kind lead), several dispatches, or a mix of reports and dispatches
    const srcDocs = new Map(); for (const x of quotes) { const p = list.find((y) => y.p.id === x.passage).p; srcDocs.set(p.doc + (embPersp(x, p).contemporaneous && !(p.persp && p.persp.contemporaneous) ? '#d' : ''), embPersp(x, p)); }
    const kinds = new Set([...srcDocs.values()].map((m) => !!m.contemporaneous));
    const mixed = kinds.size > 1, allDispatch = kinds.size === 1 && kinds.has(true);
    if (q.kind === 'author' && srcDocs.size > 1) {
      const what = allDispatch ? 'dispatches' : mixed ? 'writings, reports and dispatches' : 'reports';
      const asked = q.timeQ ? 'Times they give, as he wrote them:' : 'The closest passages, each with its own date and kind:';
      blocks.push(lead([said ? 'The site’s own records quote no words of his on this. ' : '', relaxedNote, { ent: authorRec.id, txt: authorRec.label }, ` wrote several ${what} that bear on this. ${asked}`], [authorRec.id]));
    } else if (q.kind === 'author') {
      const when = dateText(docMeta.written);
      const writ = docMeta.contemporaneous ? (when ? `wrote a dispatch dated ${when}` : 'wrote a dispatch') : docMeta.composite ? 'wrote an official report (the volume prints several documents under that heading)' : when ? `wrote an official report dated ${when}` : 'wrote an official report (the volume prints no date for it)';
      const lag = Number.isFinite(docMeta.lag_days) && docMeta.lag_days >= 0 && !docMeta.contemporaneous ? `, ${docMeta.lag_days === 0 ? 'on the day the fighting ended' : docMeta.lag_days === 1 ? 'one day after the fighting ended' : `${docMeta.lag_days} days after the fighting ended`}` : '';
      const asked = q.timeQ ? 'Times it gives, as he wrote them:' : 'The closest passages:';
      blocks.push(lead([said ? 'The site’s own records quote no words of his on this. ' : '', relaxedNote, { ent: authorRec.id, txt: authorRec.label }, ` ${writ}${lag}. ${asked}`], [authorRec.id]));
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
    return { mode, blocks, src: authorRec && authorRec.id ? [authorRec.id] : [] };
  }

  return { detect, answer, answerSaid, topicTerms };
}
