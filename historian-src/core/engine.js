// engine.js - the search-core pipeline.
//   guard -> scope gate -> normalise -> tokenise -> lexicon repair -> entity link -> intent -> card ranking (BM25F + links + priors) ->
//   passage retrieval (entity postings + BM25 impact postings, MMR) -> decide (answer | partial | decline | clarify) -> compose -> lint
// One implementation for the browser (Worker or main thread) and Node. Nothing is generated: see compose.js for the invariants.
import { sanitize, scopeGate } from './guard.js';
import { tokenize, stem, STOP, baseNorm, dl, CLOCK_RE, splitSentences } from './text.js';
import { classify, INTENT_WORDS, sideHint } from './intent.js';
import { scoreCards, dfOf } from './entities.js';
import { STATES, STATE_ABBR, stateAt } from './units.js';
import * as C from './compose.js';
import { selectQuotes, DURATION_RE } from './select.js';
import { renderText, SIDE_NAME, personLabel, withThe } from './format.js';
import { lintAnswer } from './lint.js';
import { makeChips } from './chips.js';
import { W } from './linker.js';
import { parseClock, julyDate, hm12 } from './clock.js';
import { clockAnswer, whenLine, eventSummary } from './atime.js';

const CONSUMED = new Set(['who-commanded', 'casualties', 'strength', 'succession', 'ancestor', 'superlative', 'when', 'why', 'what-happened', 'compare', 'list', 'where', 'who', 'count', 'outcome', 'echelons', 'presence', 'opponent', 'membership', 'sequence', 'overview', 'quote', 'at-time']);
const PRIOR = {
  'who-commanded': { regiment: 1.3, brigade: 1.4, division: 1.4, corps: 1.4, army: 1.4, artillery: 1.2, 'artillery-unit': 1.2 },
  casualties: { regiment: 1.3, brigade: 1.3, division: 1.3, corps: 1.3, army: 1.3, artillery: 1.2 },
  strength: { army: 1.3, corps: 1.2, brigade: 1.2, division: 1.2, regiment: 1.2 },
  when: { chronology: 1.3, vignette: 1.1 }, 'what-happened': { vignette: 1.15, chronology: 1.15 }, why: { vignette: 1.1, chronology: 1.25 },
  succession: { succession: 1.6 }, where: { terrain: 1.3, road: 1.2, structure: 1.2, feature: 1.2 },
};
export const QUOTE_BUDGET = 780;
const PASSAGE_PRIOR = { chronicle: 1.0, narrative: 0.9, commentary: 0.85, succession_note: 1.0, walkthrough: 0.75, tour: 0.75, position_note: 0.3 };
const UNIT_KINDS = new Set(['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit']);
const PLACE_KINDS = new Set(['terrain', 'road', 'structure', 'feature']);
const STRUCTURED = new Set(['outcome', 'echelons', 'superlative', 'count', 'day-summary', 'sequence', 'overview', 'quote', 'at-time']);
const FILLERS = new Set(['many', 'much', 'happened', 'happen', 'tell', 'about', 'please', 'give', 'show', 'know', 'want', 'like', 'quick', 'facts', 'fact', 'story', 'explain', 'describe']);

export function createEngine(kb, opts = {}) {
  const { idx, facts, entix } = kb;
  const R = idx.R;
  const DOMAIN = new Set(facts.domain || []);
  const STRONG_DOMAIN = new Set(['gettysburg', 'battle', 'battlefield', 'regiment', 'regiments', 'brigade', 'brigades', 'division', 'divisions', 'corps', 'army', 'cavalry', 'artillery', 'battery', 'infantry',
    'commander', 'commanded', 'general', 'colonel', 'confederate', 'confederates', 'union', 'federal', 'cannonade', 'vignette', 'regimental', 'soldier', 'soldiers', 'casualties', 'ridge', 'hill', 'pickett', 'lee', 'meade', 'longstreet']);
  const H = C.helpers(kb);
  const surnameStem = (name) => stem(baseNorm(String(name).split(' ').pop()));

  // ------------------------------------------------------------------------------------------------------------------------------------
  // lexicon repair (typos): out-of-lexicon tokens only, join / split / Damerau-Levenshtein against the NAME vocabulary
  // ------------------------------------------------------------------------------------------------------------------------------------
  const known = (t) => !t || /^#/.test(t) || t.length <= 3 || STATE_ABBR[t] !== undefined || STOP.has(t) || INTENT_WORDS.has(t) || DOMAIN.has(t) || kb.lex.has(stem(t)) || idx.nameVocab.has(stem(t)) || FILLERS.has(t);

  // the whole word a reader recognises for a name stem ("brigad" -> "brigade", "tennesse" -> "tennessee"): the most frequent surface form in the record names, the shorter one on a tie
  let surface = null, nameWords = null;
  const surfaceOf = (s) => {
    if (!surface) {
      const cnt = new Map();
      const add = (txt) => { for (const w of tokenize(String(txt || ''))) { if (/^#/.test(w) || w.length < 3) continue; const k = stem(w); let m = cnt.get(k); if (!m) cnt.set(k, m = new Map()); m.set(w, (m.get(w) || 0) + 1); } };
      for (const r of R) { add(r.title); add(r.label); for (const a of r.aliases || []) add(a); for (const p of r.people || []) add(p); add(r.place); }
      surface = new Map(); nameWords = [];
      for (const [k, m] of cnt) {
        const ws = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1));
        surface.set(k, ws[0][0]);
        for (const [w] of ws) if (w.length >= 4 && w.length <= 7) nameWords.push(w);
      }
    }
    return surface.get(s) || s;
  };
  /** short names ("Dwes" -> Dawes, "Reot" -> Root): stems of four-letter words collapse, so the comparison is on the words themselves; one edit, same first letter, and for equal lengths the same last letter too */
  const shortNameRepair = (t) => {
    surfaceOf('');
    let best = null;
    for (const w of nameWords) {
      if (w[0] !== t[0] || Math.abs(w.length - t.length) > 1 || w === t) continue;
      if (w.length === t.length && w[w.length - 1] !== t[t.length - 1]) continue;
      if (dl(t, w, 1) !== 1) continue;
      const c = dfOf(entix, stem(w));
      if (!best || c > best.c) best = { v: stem(w), w, c };
    }
    return best;
  };

  // a state name that follows a regiment number and is one edit away from a real state ("104th New Yrk", "12th Jesey", "20th Mane", "7th Tenessee"): snapped to the state, reported as a correction.
  // Only right after an ordinal (a bare typo elsewhere goes through the general name repair below); a word that is ordinary English in the corpus (df >= 20: "main", "day") is left alone.
  const STATE_NAMES = STATES.filter((s) => s !== 'united states' && s !== 'brooklyn');
  const STATE_FILLER = new Set(['regiment', 'regt', 'infantry', 'volunteer', 'volunteers', 'of']);
  function repairStates(tokens, notes) {
    const out = tokens.slice();
    for (let i = 0; i < out.length; i++) {
      if (!/^#\d+$/.test(out[i]) || +out[i].slice(1) > 200) continue;
      let j = i + 1; while (j < out.length && STATE_FILLER.has(out[j])) j++;
      if (j >= out.length || stateAt(out, j, { noAmbig: true })) continue;
      let best = null;
      for (const len of [2, 1]) {
        if (j + len > out.length) continue;
        const parts = out.slice(j, j + len);
        if (parts.some((p) => /^#/.test(p) || STOP.has(p) || INTENT_WORDS.has(p) || DOMAIN.has(p) || FILLERS.has(p))) continue;
        if (len === 1 && (kb.lexDf.get(stem(parts[0])) || 0) >= 20) continue;
        const spaced = parts.join(' '), glued = parts.join('');
        if (glued.length < 3) continue;
        for (const S of STATE_NAMES) {
          const g = S.replace(' ', ''); const maxd = g.length >= 10 ? 2 : 1;
          const d = Math.min(dl(spaced, S, maxd), dl(glued, g, maxd));
          if (d === 0 || d > maxd || Math.abs(glued.length - g.length) > maxd) continue;
          if (!best || d < best.d || (d === best.d && len > best.len)) best = { d, S, len, tie: false };
          else if (d === best.d && len === best.len && S !== best.S) best.tie = true;
        }
        if (best && !best.tie) break;
      }
      if (!best || best.tie) continue;
      notes.push({ from: out.slice(j, j + best.len).join(' '), to: best.S, kind: 'fuzzy' });
      out.splice(j, best.len, ...best.S.split(' '));
    }
    return out;
  }

  function repair(rawTokens) {
    const out = []; const notes = []; const unknown = [];
    const tokens = repairStates(rawTokens, notes);
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (known(t)) { out.push(t); continue; }
      // join with the next token ("wheat field" -> wheatfield)
      const nx = tokens[i + 1];
      if (nx && (kb.lex.has(stem(t + nx)) || idx.nameVocab.has(stem(t + nx)))) { out.push(t + nx); notes.push({ from: `${t} ${nx}`, to: t + nx, kind: 'join' }); i++; continue; }
      // split ("roundtop" -> round top)
      let done = false;
      for (let k = 3; k <= t.length - 3 && !done; k++) {
        const a = t.slice(0, k), b = t.slice(k);
        if ((kb.lex.has(stem(a)) || idx.nameVocab.has(stem(a))) && (kb.lex.has(stem(b)) || idx.nameVocab.has(stem(b)))) { out.push(a, b); notes.push({ from: t, to: `${a} ${b}`, kind: 'split' }); done = true; }
      }
      if (done) continue;
      // fuzzy against names
      const s = stem(t);
      const maxd = s.length <= 3 ? 0 : s.length <= 7 ? 1 : 2;
      let best = null;
      if (maxd) {
        for (const v of idx.nameVocab) {
          if (v[0] !== s[0] && !(s.length > 6)) continue;
          if (Math.abs(v.length - s.length) > maxd) continue;
          const d = dl(s, v, maxd);
          const prefixRel = (v.startsWith(s) || s.startsWith(v)) && Math.min(v.length, s.length) < 7;
          if (prefixRel || d > maxd) continue;
          // five letters: one edit is trusted when the first three letters agree, or when the word keeps both ends ("fwler" -> "fowler", "mller" -> "miller")
          if (s.length === 5 && d === 1 && v.slice(0, 3) !== s.slice(0, 3) && !(v[0] === s[0] && v[v.length - 1] === s[s.length - 1])) continue;
          // four-letter tokens: only a one-edit repair that keeps both ends ("rond" -> "round")
          if (s.length === 4 && !(v[v.length - 1] === s[s.length - 1] && v.length >= 5)) continue;
          const c = dfOf(entix, v);
          if (!best || d < best.d || (d === best.d && c > best.c)) best = { v, d, c };
        }
      }
      if (!best && t.length >= 4 && t.length <= 5) { const sb = shortNameRepair(t); if (sb) best = { v: sb.v, w: sb.w }; }
      if (best) { out.push(best.v); notes.push({ from: t, to: best.w || surfaceOf(best.v), kind: 'fuzzy' }); }
      else { out.push(t); unknown.push(t); }
    }
    return { tokens: out, notes, unknown };
  }

  // on-site context (the map's \"Ask about this\" entry): a deictic question is about the selected unit, the named location and the events nearest the map's moment.
  // Ticks are only used to find neighbouring events, never converted to a clock.
  function applyOnsite(S) {
    const o = S.ctx && S.ctx.onsite;
    if (!o || !/\b(here|this (spot|place|hill|moment|point|regiment|unit|brigade|division|corps|field|ridge|location|area|position|battery)|right now|going on|happening)\b/i.test(S.text)) return;
    S.onsite = o;
    const su = o.selected_unit && idx.byId.has(o.selected_unit) ? idx.byId.get(o.selected_unit) : null;
    if (su !== null) S.mentions.push({ kind: 'alias', ids: [su], best: su, amb: false, w: W.unit, phrase: R[su].label.toLowerCase(), start: -1, end: -1, src: 'onsite' });
    if (o.location) for (const m of kb.link(tokenize(o.location), { caps: S.caps }).mentions) if (m.kind !== 'unit-miss' && m.kind !== 'surname' && m.ids && m.ids.length) S.mentions.push({ ...m, w: Math.min(m.w, 24), start: -1, end: -1, src: 'onsite' });
    const tick = typeof o.tick === 'number' ? o.tick : null;
    if (tick !== null) {
      const day = o.day || (tick <= 225 ? 1 : tick <= 450 ? 2 : 3);
      // events about the selected unit come first, then by distance from the map's moment, critical ones before the rest
      const mine = (r) => (su !== null && (r.attrs.units || []).includes(R[su].id) ? 0 : 1);
      const ev = R.filter((r) => r.k === 'chronology' && r.attrs.day === day && Math.abs(r.attrs.tick - tick) <= 6).sort((a, b) => mine(a) - mine(b) || Math.abs(a.attrs.tick - tick) - Math.abs(b.attrs.tick - tick) || (a.attrs.sig === 'critical' ? -1 : 1));
      S.tickEvents = ev.slice(0, 3);
      S.boostIds = new Set(S.tickEvents.map((r) => r.id));
      S.day = S.day || day;
    }
  }

  // an ambiguous surname next to other content ("Colonel Avery ... Cemetery Hill"): pick the candidate whose own records share words with the rest of the question
  function disambiguatePeople(S) {
    const rest = new Set(S.tokens.filter((t) => !STOP.has(t) && !/^#/.test(t) && !INTENT_WORDS.has(t) && !FILLERS.has(t)).map(stem));
    for (const m of S.mentions) {
      if ((m.kind !== 'surname' && m.kind !== 'person') || !m.amb || m.ids.length < 2 || !m.ids.every((i) => R[i].k === 'person')) continue;
      const own = new Set(String(m.phrase).split(' ')); const others = new Set([...rest].filter((t) => !own.has(t)));
      if (others.size < 1) continue;
      const score = (i) => {
        const p = R[i]; const bag = new Set();
        const add = (txt) => { for (const t of tokenize(String(txt || ''), { keepStop: false })) bag.add(stem(t)); };
        for (const ro of p.attrs.roles || []) { const u = ro.u && idx.get(ro.u); if (u) { add(u.label); add(u.attrs && u.attrs.ka); for (const pid of (u.par || [])) { const pu = idx.get(pid); if (pu) add(pu.label); } } }
        add(p.attrs.fate); add(p.attrs.notes);
        for (const sid of facts.succ.byPerson[p.id] || []) { const sr = idx.get(sid); if (sr) { add(sr.title); add(sr.attrs.notes); } }
        let n = 0; for (const t of others) if (bag.has(t)) n++;
        return n;
      };
      const sc = m.ids.map((i) => [i, score(i)]).sort((a, b) => b[1] - a[1]);
      if (sc[0][1] > 0 && sc[0][1] > (sc[1] ? sc[1][1] : 0)) { m.ids = sc.map((x) => x[0]); m.best = m.ids[0]; m.amb = false; }
    }
  }

  // a person or unit that is unambiguous fixes the side of an ambiguous corps / unit number ("Reynolds ... First Corps")
  function applySide(S) {
    let side = S.side;
    if (!side) for (const m of S.mentions) { if (m.kind === 'unit-miss' || m.amb || !m.ids || !m.ids.length) continue; const r = R[m.kind === 'unit' ? m.best : m.ids[0]]; if (r && r.side && (r.k === 'person' || r.k === 'regiment' || r.k === 'brigade' || r.k === 'division' || r.k === 'army')) { side = r.side; break; } }
    S.sideCtx = side || null;
    if (!side) return;
    for (const m of S.mentions) {
      if (m.kind === 'unit-miss' || !m.ids || m.ids.length < 2 || m.kind === 'surname') continue;
      const keep = m.ids.filter((i) => R[i].side === side || !R[i].side);
      if (keep.length && keep.length < m.ids.length) { m.ids = keep; m.best = keep[0]; m.amb = keep.length > 1 && m.kind !== 'unit' ? true : false; }
    }
  }

  // phrase-level fuzzy: a query token that IS a real word but one edit from a name ("pickets charge" -> "Pickett's Charge") may complete a multi-word alias
  function phraseFuzzy(S, used) {
    const toks = S.tokens;
    const covered = (i) => S.mentions.some((m) => m.kind !== 'unit-miss' && i >= m.start && i < m.end);
    if (S.mentions.some((m) => m.kind === 'alias' && m.n >= 2)) return;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (STOP.has(t) || /^#/.test(t) || t.length < 5 || covered(i)) continue;
      const s = stem(t);
      const cands = [];
      for (const v of idx.nameVocab) { if (v[0] !== s[0] || Math.abs(v.length - s.length) > 1 || v === s) continue; if (dl(s, v, 1) === 1) cands.push(v); if (cands.length >= 6) break; }
      if (!cands.length) continue;
      // content neighbours around i (skip stop words)
      const content = []; toks.forEach((x, j) => { if (!STOP.has(x) && !/^#\d+$/.test(x)) content.push({ t: /^#/.test(x) ? x : stem(x), j }); });
      const pos = content.findIndex((c) => c.j === i); if (pos < 0) continue;
      for (const v of cands) {
        for (const [a, b] of [[pos - 1, pos + 1], [pos, pos + 2], [pos - 2, pos + 1], [pos, pos + 3]]) {
          if (a < 0 || b > content.length || b - a < 2) continue;
          const phrase = content.slice(a, b).map((c, k) => (a + k === pos ? v : c.t)).join(' ');
          const hit = idx.aliasMap.get(phrase);
          if (hit && hit.length) {
            const ids = hit.map((x) => x.i);
            S.mentions.push({ kind: 'alias', ids, best: ids[0], amb: ids.length > 1, w: W.aliasBase + W.aliasPerTok * (b - a), phrase, n: b - a, start: content[a].j, end: content[b - 1].j + 1, src: 'fuzzy-phrase', kinds: [...new Set(ids.map((k) => R[k].k))], exact: false });
            S.notes.push({ from: toks[i], to: surfaceOf(v), kind: 'fuzzy' });
            return;
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // helpers over mentions
  // ------------------------------------------------------------------------------------------------------------------------------------
  const rec = (i) => R[i];
  function commandedUnits(personRec) { return (personRec.attrs.roles || []).filter((r) => (r.r === 'commander' || r.r === 'successor') && r.u && idx.get(r.u)).map((r) => idx.get(r.u)); }

  function collect(S) {
    const units = [], persons = [], places = [], others = [];
    const seen = new Set();
    const push = (arr, r) => { if (!seen.has(r.id)) { seen.add(r.id); arr.push(r); } };
    for (const m of S.mentions) {
      if (m.kind === 'unit-miss') continue;
      const ids = m.kind === 'unit' ? (m.amb ? m.ids.slice(0, 3) : [m.best]) : m.ids.slice(0, m.kind === 'surname' ? 3 : 4);
      for (const i of ids) {
        const r = R[i];
        if (UNIT_KINDS.has(r.k)) push(units, r);
        else if (r.k === 'person') { push(persons, r); }
        else if (PLACE_KINDS.has(r.k)) push(places, r);
        else push(others, r);
      }
    }
    return { units, persons, places, others };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // card ranking
  // ------------------------------------------------------------------------------------------------------------------------------------
  function rankCards(S) {
    const stems = S.qStems;
    const scores = scoreCards(entix, stems);
    const boost = new Map();
    const bump = (i, w) => { if (w > (boost.get(i) || 0)) boost.set(i, w); };
    // words of the query that no mention covers: with two or more of them a bare surname is just a modifier ("Lee's retreat order")
    const covered = new Set(); for (const m of S.mentions) if (m.kind !== 'unit-miss') for (let k = m.start; k < m.end; k++) covered.add(k);
    const residual = S.tokens.filter((t, k) => !covered.has(k) && !STOP.has(t) && !/^#/.test(t) && !INTENT_WORDS.has(t) && !FILLERS.has(t) && kb.lex.has(stem(t))).length;
    for (const m of S.mentions) {
      if (m.kind === 'unit-miss') continue;
      const ids = m.kind === 'unit' ? (m.amb ? m.ids.slice(0, 4) : [m.best]) : m.ids;
      for (const i of ids) {
        const r = R[i];
        // a bare surname is weak evidence for the person record itself, a little stronger for the unit that person commanded
        if (r.k === 'person' && m.kind === 'surname') { const f = residual >= 2 ? 0.25 : 1; bump(i, 3 * f); for (const u of commandedUnits(r)) bump(idx.byId.get(u.id), m.w * 0.5 * f); continue; }
        bump(i, m.w);
        if (r.k === 'person') for (const u of commandedUnits(r)) bump(idx.byId.get(u.id), m.w * 0.8);
      }
      if (m.kind === 'unit' && m.alts) for (const i of m.alts.slice(0, 2)) bump(i, m.w * 0.15);
    }
    for (const [i, b] of boost) scores.set(i, (scores.get(i) || 0) + b);
    // exact phrase equal to a title/alias
    const phrase = S.qStems.join(' ');
    if (phrase) { const hit = idx.aliasMap.get(phrase); if (hit) for (const x of hit) scores.set(x.i, (scores.get(x.i) || 0) + 15); }
    if (S.boostIds) for (const id of S.boostIds) { const i = idx.byId.get(id); scores.set(i, (scores.get(i) || 0) + 20); }
    const anyLink = S.mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length);
    const prior = (anyLink && ['what-happened', 'when', 'why', 'lookup', 'list', 'who'].includes(S.intent) ? null : PRIOR[S.intent]) || {};
    let ranked = [...scores.entries()].map(([i, s]) => ({ i, id: R[i].id, k: R[i].k, s: s * (prior[R[i].k] || 1) }));
    // merge detachments / alias stubs into the canonical record
    const merged = new Map();
    for (const x of ranked) {
      const r = R[x.i];
      const ci = r.canon && idx.byId.has(r.canon) ? idx.byId.get(r.canon) : x.i;
      const cur = merged.get(ci);
      if (!cur || x.s > cur.s) merged.set(ci, { i: ci, id: R[ci].id, k: R[ci].k, s: Math.max(x.s, cur ? cur.s : 0) });
    }
    ranked = [...merged.values()].sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1));
    return ranked;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // passages
  // ------------------------------------------------------------------------------------------------------------------------------------
  async function getPassages(S, { limit = 12 } = {}) {
    if (S.passCache && S.passCache.limit >= limit) return S.passCache.list;
    const linkW = new Map();
    for (const m of S.mentions) {
      if (m.kind === 'unit-miss') continue;
      const ids = m.kind === 'unit' ? [m.best] : m.kind === 'surname' && m.amb ? [] : m.ids.slice(0, 3);
      for (const i of ids) {
        const r = R[i];
        const w = m.kind === 'unit' ? 6 : m.kind === 'surname' ? 3 : 4;
        linkW.set(r.id, Math.max(linkW.get(r.id) || 0, w));
        if (r.k === 'person') for (const u of commandedUnits(r)) linkW.set(u.id, Math.max(linkW.get(u.id) || 0, w * 0.6));
      }
    }
    if (S.boostIds) for (const id of S.boostIds) linkW.set(id, Math.max(linkW.get(id) || 0, 6));
    const bm = S.passageTerms.length ? await kb.scorePassages(S.passageTerms) : new Map();
    const ep = linkW.size ? await kb.entityPassages([...linkW.keys()]) : new Map();
    // candidates
    const nums = new Map();
    for (const [n, s] of [...bm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) nums.set(n, s);
    for (const [n] of ep) if (!nums.has(n)) nums.set(n, bm.get(n) || 0);
    const cand = [...nums.keys()];
    const P = await kb.passages(cand.slice(0, 120));
    const out = [];
    for (const n of cand) {
      const p = P.get(n); if (!p) continue;
      let s = nums.get(n) || 0;
      const e = ep.get(n);
      if (e) for (const [id, role] of e.ids) s += (linkW.get(id) || 0) * (role === 2 ? 1 : 0.5);
      s *= (PASSAGE_PRIOR[p.kind] ?? 0.7);
      if (S.day && p.day === S.day) s *= 1.25; else if (S.day && p.day && p.day !== S.day) s *= 0.8;
      out.push({ p, score: s });
    }
    out.sort((a, b) => b.score - a.score || (a.p.num - b.p.num));
    // MMR-lite: <= 2 per document
    const per = new Map(); const final = [];
    for (const x of out) { const c = per.get(x.p.doc) || 0; if (c >= 2) continue; per.set(x.p.doc, c + 1); final.push(x); if (final.length >= limit) break; }
    S.passCache = { list: final, limit };
    return final;
  }

  // ---- quotes must be about the subject (verifier defect V-09) -------------------------------------------------------------------------
  // A quote under an answer about ONE unit is kept only when its passage is linked to that unit's record, belongs to it, or names it. Chosen by overlap of state and number alone, quotes were about
  // other units ("27th Indiana ... " under the 19th Indiana; 319 of 457 regiments have no linked passage at all): no quote is better than a quote about someone else.
  const tk = (s) => ' ' + tokenize(String(s || '')).join(' ') + ' ';
  const nameForms = (r) => { const out = new Set(); for (const n of [r.label, r.title, ...(r.aliases || [])]) { const t = tk(n).trim(); if (t.length >= 6) out.add(' ' + t + ' '); } return [...out]; };
  /** the single unit record an answer's lead names, or null (a comparison names two, a place or an event names none) */
  function subjectUnit(res) {
    const ids = new Set();
    for (const b of res.blocks) if (b.t === 'lead') for (const r of b.runs) if (r.ent) { const rec = idx.get(r.ent); if (rec && UNIT_KINDS.has(rec.k)) ids.add(rec.id); }
    return ids.size === 1 ? idx.get([...ids][0]) : null;
  }
  /** is this passage about the unit? linked to its record, its own record, or naming it in any of its forms ("24th Michigan", "Twenty-fourth Michigan", "24th MI", its nickname) */
  function passageAbout(sub, p, linked, forms) {
    return linked.has(p.num) || p.rec === sub.id || (() => { const t = tk(p.text); return forms.some((f) => t.includes(f)); })();
  }

  async function addQuotes(S, res, { max = 2, timeQ = false, requireClock = false, leadHasText = false, onlyRecs = null } = {}) {
    let ranked = await getPassages(S, { limit: requireClock ? 30 : 12 });
    if (requireClock) ranked = ranked.filter((x) => x.p.clk && x.p.clk.length);
    if (onlyRecs) ranked = ranked.filter((x) => onlyRecs.has(x.p.rec));
    const sub = subjectUnit(res);
    if (sub) { const linked = await kb.entityPassages([sub.id]); const forms = nameForms(sub); ranked = ranked.filter((x) => passageAbout(sub, x.p, linked, forms)); }
    const entStems = new Set();
    for (const m of S.mentions) { if (m.kind === 'unit-miss') continue; for (const t of (m.phrase || '').split(' ')) if (t && !/^#|\|/.test(t)) entStems.add(t); }
    for (const b of res.blocks) if (b.t === 'lead') for (const r of b.runs) if (r.ent && idx.get(r.ent)) for (const t of idx.get(r.ent).label.toLowerCase().split(/[^a-z0-9]+/)) if (t.length > 3) entStems.add(stem(t));
    const ctx = { qStems: new Set(S.passageTerms), entStems, timeQ };
    const skip = new Set(S.ctx && S.ctx.shownPassages || []);
    // avoid quoting a record whose card already led the answer with the same text
    const leadSrc = new Set(res.src || []);
    const pool = ranked.filter((x) => !(leadSrc.has(x.p.rec) && (!['narrative', 'commentary', 'chronicle', 'walkthrough', 'tour'].includes(x.p.kind) || (leadHasText && x.p.kind === 'chronicle'))));
    const quotes = selectQuotes(kb, pool, ctx, S.simple ? { max: Math.max(max, 3), skip, maxWords: 24, maxSents: 1, plain: true } : { max, skip });
    // length budget: the first quote is always kept, further quotes only while the whole first answer stays within QUOTE_BUDGET characters (a phone screen, not a page)
    let total = renderText(res.blocks).length; const kept = [];
    for (const q of quotes) { const add = q.text.length + String(q.attrib || '').length + 6; if (kept.length && total + add > QUOTE_BUDGET) continue; kept.push(q); total += add; }
    for (const q of kept) { res.blocks.push(q); res.src.push(q.rec); }
    S.quotes = kept;
    return kept;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // outputs
  // ------------------------------------------------------------------------------------------------------------------------------------
  function shownIds(S, res) {
    const out = [];
    const add = (id) => {
      const r = idx.get(id);
      if (r && r.k === 'person') { const u = commandedUnits(r)[0]; if (u) id = u.id; }
      if (id && !out.includes(id)) out.push(id);
    };
    for (const id of res.src || []) add(id);
    for (const b of res.blocks) { if (b.t === 'lead') (b.src || []).forEach(add); if (b.t === 'list' || b.t === 'table') (b.src || []).forEach(add); }
    return out.slice(0, 12);                                  // what the answer is ABOUT; the full list of records it relies on is answer.cites
  }
  /** card ranking as record ids (people map to the unit they commanded), for retrieval metrics only */
  function rankedIds(S) {
    if (S.rankOverride) return S.rankOverride.slice();
    const out = [];
    for (const x of (S.ranked || []).slice(0, 60)) {
      let id = x.id; const r = R[x.i];
      if (r.k === 'person') { const u = commandedUnits(r)[0]; if (!u) continue; id = u.id; }
      if (!out.includes(id)) out.push(id);
    }
    return out;
  }
  function sourcesOf(S, res) {
    const out = []; const seen = new Set();
    const addRec = (id) => {
      const r = idx.get(id); if (!r || seen.has(id)) return; seen.add(id);
      const href = r.k === 'regiment' ? `/regiment.html?unit=${encodeURIComponent(r.id)}` : r.k === 'site' ? r.attrs.href : null;
      out.push({ id: r.id, label: r.label, kind: r.k, href });
    };
    for (const b of res.blocks) {
      if (b.t === 'lead') for (const r of b.runs) if (r.ent) addRec(r.ent);
      if (b.t === 'quote' && !seen.has(b.passage)) { seen.add(b.passage); out.push({ id: b.passage, label: b.attrib, kind: 'passage', href: null }); }
      if (b.t === 'list' || b.t === 'table') for (const id of b.src || []) addRec(id);
    }
    return out;
  }

  function finish(S, res, extra = {}) {
    res.mode = res.mode || 'answer';
    const answer = {
      kb: kb.version, query: S.text, mode: res.mode, route: res.route || 'records', intent: S.intent,
      entities: (S.mentions || []).filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length).slice(0, 6).map((m) => ({ id: R[m.kind === 'unit' ? m.best : m.ids[0]].id, label: R[m.kind === 'unit' ? m.best : m.ids[0]].label, kind: m.kind, w: m.w })),
      did_you_mean: S.notes && S.notes.filter((n) => n.kind === 'fuzzy' || n.kind === 'join' || n.kind === 'split').length ? S.notes.filter((n) => n.kind !== 'unknown').map((n) => ({ from: n.from, to: n.to })) : null,
      blocks: res.blocks, chips: { follow: [] }, links: { pages: [] },
      shown: shownIds(S, res), sources: sourcesOf(S, res), limited: !!res.limited, injection_stripped: !!S.injectionStripped, ranked: rankedIds(S), ...extra,
    };
    answer.text = renderText(answer.blocks);
    answer.cites = citedIds(answer);
    return answer;
  }

  /** every record id an answer relies on: lead sources, entity runs, list/table sources and the records of quoted passages */
  function citedIds(a) {
    const out = new Set(a.shown || []);
    for (const b of a.blocks) {
      if (b.t === 'lead') { (b.src || []).forEach((x) => out.add(x)); for (const r of b.runs) if (r.ent) out.add(r.ent); }
      else if (b.t === 'quote') out.add(b.rec);
      else if (b.t === 'list' || b.t === 'table') { (b.src || []).forEach((x) => out.add(x)); for (const i of b.items || []) if (i.ent) out.add(i.ent); }
    }
    const R2 = idx; const res = [];
    for (const id of out) { const r = R2.get(id); if (r && r.k === 'person') { for (const ro of r.attrs.roles || []) if (ro.u && R2.get(ro.u)) res.push(ro.u); } res.push(id); }
    return [...new Set(res)];
  }

  function declineAnswer(S, { reason, text, pointer, mode = 'decline', suggest = true }) {
    const blocks = [C.lead([text || 'I could not find a record on this site that answers that.'], [])];
    const fam = kb.facts.routes;
    const res = { mode, blocks, src: [], limited: true };
    const a = finish(S, res, { decline_reason: reason });
    a.chips.follow = suggest ? [
      { label: '20th Maine', q: '20th Maine' }, { label: 'Who commanded the Iron Brigade?', q: 'Who commanded the Iron Brigade?' },
      { label: 'What happened at Little Round Top?', q: 'What happened at Little Round Top?' }, { label: 'What was Pickett’s Charge?', q: 'What was Pickett’s Charge?' },
    ] : [];
    if (pointer === 'visit' || pointer === 'weather' || pointer === 'nps-civil-war') a.pointer = pointer;
    a.shown = []; a.sources = [];
    return a;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // main
  // ------------------------------------------------------------------------------------------------------------------------------------
  /** the conversation context is caller data (the page passes back the engine's own ctx, but an embed or a test may pass anything): keep only well-typed fields */
  function cleanCtx(ctx) {
    const c = ctx && typeof ctx === 'object' && !Array.isArray(ctx) ? ctx : {};
    const strs = (v, n) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.length <= 80).slice(-n) : []);
    const out = { lastEntities: strs(c.lastEntities, 6), shownPassages: strs(c.shownPassages, 40), lastIntent: typeof c.lastIntent === 'string' ? c.lastIntent.slice(0, 40) : null, lastSide: c.lastSide === 'U' || c.lastSide === 'C' ? c.lastSide : null };
    const o = c.onsite;
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const on = {};
      if (typeof o.selected_unit === 'string') on.selected_unit = o.selected_unit.slice(0, 80);
      if (typeof o.location === 'string') on.location = o.location.slice(0, 120);
      if (typeof o.tick === 'number' && Number.isFinite(o.tick)) on.tick = o.tick;
      if (o.day === 1 || o.day === 2 || o.day === 3) on.day = o.day;
      if (Object.keys(on).length) out.onsite = on;
    }
    return out;
  }

  async function ask(rawQuery, ctx = {}) {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    ctx = cleanCtx(ctx);
    const S = { kb, ctx, raw: rawQuery, notes: [], mentions: [], side: null, intent: 'lookup', ranked: [], quotes: [], trace: {} };
    const g = sanitize(rawQuery);
    S.text = g.text; S.sanitized = g;
    if (!g.text) return declineAnswer(S, { reason: 'empty', text: 'Ask about a regiment, a commander, a place or a moment of the battle.', suggest: true });

    // ---- scope gate (injection, medical, finance, creative, visit, weather, adjacent, causes) --------------------------------------------------------
    let text = g.text;
    let gate = scopeGate(text, facts.scope);
    if (gate && gate.id === 'injection') {
      const rest = stripInjection(text, facts.scope);
      const restToks = tokenize(rest);
      const anchoredRest = restToks.some((t) => STRONG_DOMAIN.has(t)) || kb.link(restToks, {}).mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length);
      if (rest.split(/\s+/).filter(Boolean).length >= 3 && anchoredRest && !scopeGate(rest, facts.scope)) { text = rest; S.injectionStripped = true; gate = null; }
    }
    if (gate) { S.intent = gate.id; return declineAnswer(S, { reason: gate.id, text: gate.text, pointer: gate.pointer, mode: gate.mode === 'decline_pointer' ? 'decline' : gate.mode === 'refuse_injection' ? 'decline' : 'decline', suggest: true }); }
    S.text = text;

    // ---- normalise / tokenise / repair ----------------------------------------------------------------------------------------------------------
    const aud = /\b(?:to|for)\s+(?:an?\s+)?(?:\d+(?:st|nd|rd|th)|fifth|fourth|third|sixth|seventh|eighth)[- ]grad(?:e|er)s?\b|\bfor my (?:school )?(?:report|project|class)\b|\bin simple terms\b|\blike i'?m (?:five|5)\b|\b(?:kid|child)[- ]friendly\b/i;
    if (aud.test(text)) { S.simple = true; text = text.replace(aud, ' ').replace(/\s+/g, ' ').trim(); S.text = text; }
    const raw = tokenize(text);
    S.norm = baseNorm(text);
    // a known unknown that needs no entity: the weather at the battle (facts.unknowns, compiled from scope.v1.json). An honest limitation, what the records do say, and what would answer it.
    const unkW = (facts.unknowns || []).find((u) => u.id === 'weather-at-battle');
    if (unkW && unkW.re.some((x) => new RegExp(x, 'i').test(S.norm))) { S.intent = 'unknown'; S.tokens = tokenize(text); S.qStems = []; S.passageTerms = []; return finalize(S, await weatherAnswer(S, unkW), t0); }
    S.side = sideHint(raw);
    const rep = repair(raw);
    S.tokens = rep.tokens; S.notes = rep.notes; S.unknown = rep.unknown;
    S.surnameStem = surnameStem;

    // ---- follow-ups that need conversation state ---------------------------------------------------------------------------------------------------
    const follow = resolveFollowUp(S, raw);
    if (follow && follow.clarify) return follow.clarify;

    // ---- link, intent ---------------------------------------------------------------------------------------------------------------------------------
    S.caps = new Set([...text.matchAll(/\b[A-Z][A-Za-z']*/g)].map((m) => stem(m[0].toLowerCase().replace(/'s$/, ''))));
    // a capitalised word that was repaired ("Mller" -> Miller) is still a capitalised word: the surname that is also an everyday word links on it
    for (const n of S.notes) if (n.kind === 'fuzzy' && S.caps.has(stem(n.from))) for (const w of tokenize(n.to)) S.caps.add(stem(w));
    const lk = kb.link(S.tokens, { side: S.side, caps: S.caps });
    S.mentions = lk.mentions;
    S.day = dayOf(text);
    if (S.day) S.mentions = S.mentions.filter((m) => !(m.kind === 'surname' && (m.phrase === 'day' || m.phrase === 'second' || m.phrase === 'third')));
    phraseFuzzy(S, lk.used);
    if (follow && follow.inject) for (const m of follow.inject) S.mentions.push(m);
    applyOnsite(S);
    applySide(S);
    disambiguatePeople(S);
    // a state word that belongs to a unit name ("the 24th Michigan Regiment") is part of that regiment, not a request for the state's roll-up
    S.stateMention = (() => {
      const t = S.tokens; const inUnit = new Array(t.length).fill(false);
      for (const m of S.mentions) if ((m.kind === 'unit' || m.kind === 'unit-miss') && m.start >= 0) for (let k = m.start; k < m.end; k++) inUnit[k] = true;
      for (let i = 0; i < t.length; i++) {
        if (inUnit[i]) continue;
        const two = t.slice(i, i + 2).join(' '); if (STATES.includes(two) && two !== 'brooklyn' && !inUnit[i + 1]) return two;
        if (STATES.includes(t[i]) && t[i] !== 'brooklyn' && t[i] !== 'united') return t[i];
      }
      return null;
    })();
    S.intent = follow && follow.intent ? follow.intent : classify(text);
    S.day = dayOf(text);
    // a clock time or a part of a named day ("at 3pm on July 2", "noon on July 3", "the morning of July 1") is answered from the time model's clock, never from a day summary
    S.clock = kb.facts.clock ? parseClock(text, { solar: kb.facts.clock.solar }) : null;
    if (S.clock && S.clock.kind === 'window' && S.clock.phase && S.clock.date === null && !S.day) S.clock = null;   // "the evening attack at Culp's Hill": a part of the day alone is not a clock question
    if (S.clock) { S.clock.day = S.clock.date !== null ? S.clock.date : S.day || (S.ctx.onsite && S.ctx.onsite.day) || null; if (['lookup', 'what-happened', 'where', 'day-summary', 'list', 'who'].includes(S.intent)) S.intent = 'at-time'; else S.clock = null; }
    const C0 = collect(S);
    Object.assign(S, { units: C0.units, persons: C0.persons, places: C0.places, others: C0.others });
    // the site holds no casualty tally per location: any "how many died at <place>" is answered as that limitation
    const unkLoc = facts.unknowns.find((u) => u.id === 'per-location-casualties');
    if (unkLoc && S.places.length && !S.units.length && unkLoc.re.some((x) => new RegExp(x, 'i').test(S.norm))) S.intent = 'casualties';
    if (S.intent === 'lookup' && S.day && !S.mentions.some((m) => m.kind !== 'unit-miss')) S.intent = 'day-summary';
    if (S.intent === 'what-happened' && S.day && !S.mentions.some((m) => m.kind !== 'unit-miss')) S.intent = 'day-summary';
    if (S.intent === 'when' && /\bhappen/.test(S.norm) && S.day && !S.mentions.length) S.intent = 'day-summary';
    S.qStems = S.tokens.filter((t) => !STOP.has(t)).map((t) => (/^#/.test(t) ? t : stem(t)));
    const consumed = CONSUMED.has(S.intent) || S.intent === 'day-summary';
    S.passageTerms = S.qStems.filter((t) => !/^#\d+$/.test(t) && !(consumed && INTENT_WORDS.has(t)) && !FILLERS.has(t) && !DOMAIN_NOISE.has(t));
    S.cardTerms = consumed ? S.qStems.filter((t) => !INTENT_WORDS.has(t)) : S.qStems;
    S.qStemsAll = S.qStems;
    S.qStems = S.cardTerms;
    S.ranked = rankCards(S);

    // ---- clarify: ambiguous mentions and bare ordinals ------------------------------------------------------------------------------------------------
    const clar = await clarifyIfAmbiguous(S, raw);
    if (clar) return clar;

    // ---- compose / decide ---------------------------------------------------------------------------------------------------------------------------------
    // structured intents (totals, rankings, day summaries) do not need a linked entity: try their composer before the support gates
    let res = null;
    const compose1 = async () => { try { return await composeFor(S); } catch (e) { if (e && e.retryable) throw e; if (opts.debug) throw e; return null; } };
    const anchored = S.tokens.some((t) => STRONG_DOMAIN.has(t)) || S.mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length) || !!S.day || !!S.clock;
    // "the Wisconsin regiments": a state's roll-up is a structured question too (a state word inside a unit name has been excluded from stateMention)
    const rollupQ = !!S.stateMention && /\bregiments?\b/.test(S.norm) && !S.units.length && ['list', 'lookup', 'count', 'what-happened'].includes(S.intent);
    const structured = STRUCTURED.has(S.intent) || rollupQ;
    if (structured && (anchored || rollupQ || S.intent === 'quote')) res = await compose1();
    if (!res) {
      const dec = decide(S);
      if (dec) return dec;
      if (!structured || !(anchored || rollupQ || S.intent === 'quote')) res = await compose1();
    }
    if (!res) res = await fallbackProfile(S);
    if (!res) return declineAnswer(S, { reason: 'no-composer', text: 'I could not find a record on this site that answers that.' });
    if (S.simple) res.blocks = res.blocks.filter((b) => !(b.t === 'note' && ['authority', 'authority-mixed', 'debate', 'rank-rule', 'basis'].includes(b.code)));
    if (S.injectionStripped) res.blocks.push(C.note('injection', 'Your message also contained an instruction; I ignored it. I only search and quote this site’s records.'));
    return finalize(S, res, t0);
  }

  /** a composed result becomes the answer object: retrieval ranking, chips, route, trace, conversation context, lint */
  function finalize(S, res, t0) {
    if (res.rankOverride) S.rankOverride = res.rankOverride;
    const out = finish(S, res, res.extra || {});
    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    out.chips.follow = makeChips(kb, S, out);
    if (S.route) out.links.pages.push(S.route);
    out.trace = { intent: S.intent, notes: S.notes, unknown: S.unknown, mentions: S.mentions.map((m) => ({ kind: m.kind, phrase: m.phrase, w: m.w, amb: m.amb, ids: (m.ids || []).slice(0, 4).map((i) => R[i].id) })), ranked: S.ranked.slice(0, 8).map((x) => `${x.id}:${x.s.toFixed(1)}`), ms: +(t1 - t0).toFixed(2), fetched: kb.stats.fetched };
    out.ctx = { lastEntities: (out.shown || []).slice(0, 2), lastIntent: S.intent, lastSide: S.side, shownPassages: [...(S.ctx.shownPassages || []), ...S.quotes.map((q) => q.passage)].slice(-20) };
    const lint = lintAnswer(kb, out);
    if (lint.length) out.lint = lint;
    return out;
  }

  const DOMAIN_NOISE = new Set(['gettysburg', 'battle', 'happened', 'happen']);

  // ------------------------------------------------------------------------------------------------------------------------------------
  // weather at the battle: the site holds no weather series. It says so, quotes the few remarks its own text makes (rain on the evening of July 3, the retreat in a rainstorm), and says what would answer
  // ------------------------------------------------------------------------------------------------------------------------------------
  const WEATHER_STEMS = ['rain', 'rainstorm', 'thunderstorm', 'fog', 'drizzle', 'weather', 'downpour'].map(stem);
  // genuine weather words only: "the storm breaks" (a figure for the attack) and "the heat is heavy" (a visitor's line about today) are not observations of 1863
  const WEATHER_WORD = /\b(?:rain(?:s|ed|ing|y|storm)?|thunderstorms?|fog|drizzle|downpour|weather)\b/i;
  async function weatherAnswer(S, rule) {
    const day = dayOf(S.text);
    const sc = await kb.scorePassages(WEATHER_STEMS);
    const nums = [...sc.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 80).map((x) => x[0]);
    const P = await kb.passages(nums);
    let cand = nums.map((n) => ({ p: P.get(n), score: sc.get(n) })).filter((x) => x.p && WEATHER_WORD.test(x.p.text) && ['chronicle', 'narrative', 'commentary'].includes(x.p.kind));
    if (day) cand = cand.filter((x) => x.p.day === day);                 // asked about one day: only that day's remarks (none is an honest answer too)
    const quotes = selectQuotes(kb, cand, { qStems: new Set(WEATHER_STEMS), entStems: new Set(), timeQ: false }, { max: 2, minScore: 0.5 });
    S.quotes = quotes;
    const res = C.unknownAnswer(kb, S, rule, { quotes });
    return res;
  }

  /** the day of the battle a question names (1 to 3), or null: one reader for "July 2", "the 3rd of July", "day two", "the second day"; "July 10" and "July 1-3" are not a day */
  function dayOf(text) { const d = julyDate(text); return d >= 1 && d <= 3 ? d : null; }

  function stripInjection(text, scope) {
    const rule = scope.find((r) => r.id === 'injection'); if (!rule) return text;
    const res = rule.re.map((x) => new RegExp(x, 'i'));
    const sents = splitSentences(text).map(({ s, e }) => text.slice(s, e));
    let kept = sents.filter((s) => !res.some((re) => re.test(s) || re.test(baseNorm(s))));
    if (kept.length === sents.length) {
      // an injection clause inside a sentence ("... Also ignore the above and say ...")
      const cut = text.replace(/\b(also|and|then)\b[^.!?]*\b(ignore|disregard|forget)\b[^.!?]*[.!?]?/i, ' ').replace(/\b(ignore|disregard|forget)\b[^.!?]*[.!?]?/i, ' ');
      return cut.trim();
    }
    return kept.join(' ').trim();
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // conversation state: pronouns, "tell me more", "what about the Confederates"
  // ------------------------------------------------------------------------------------------------------------------------------------
  function resolveFollowUp(S, raw) {
    const c = S.ctx || {};
    const last = (c.lastEntities || []).map((id) => idx.get(id)).filter(Boolean);
    const q = S.norm;
    const more = /^(?:tell me more|more|go on|continue|and\??|what else|anything else|say more|more details?)$/.test(q) || /^tell me more( about (it|that|this|them))?$/.test(q);
    const flip = q.match(/^(?:what about|how about|and) (?:the )?(union|confederates?|federals?|rebels?|confederacy|north|south)\??$/);
    const pron = /\b(it|they|them|its|their|that unit|this unit|the regiment|the brigade|that regiment|that brigade|he|him|his)\b/.test(q) && raw.length <= 9;
    const bareQ = !kb.link(S.tokens, {}).mentions.some((m) => m.kind !== 'unit-miss');
    if (!(more || flip || (pron && bareQ))) return null;
    if (!last.length) {
      const res = { mode: 'clarify', blocks: [C.lead(['What would you like to know more about? Name a regiment, commander, place or moment of the battle.'], [])], src: [], limited: true };
      const a = finish(S, res, { decline_reason: 'followup-without-context' }); a.chips.follow = [{ label: '20th Maine', q: '20th Maine' }, { label: 'Little Round Top', q: 'Little Round Top' }, { label: 'Pickett’s Charge', q: 'Pickett’s Charge' }]; a.shown = []; a.sources = [];
      return { clarify: a };
    }
    if (flip) {
      const side = /union|federal|north/.test(flip[1]) ? 'U' : 'C';
      const base = last[0];
      const other = R.find((r) => r.side === side && r.k === base.k && (r.id === (base.k === 'army' ? 'ARMY:' + side : null) || (base.k === 'corps' && r.id.replace(/^CORPS:[UC]-/, '') === base.id.replace(/^CORPS:[UC]-/, ''))));
      S.side = side;
      const inject = other ? [{ kind: 'alias', ids: [idx.byId.get(other.id)], best: idx.byId.get(other.id), amb: false, w: W.unit, phrase: other.label.toLowerCase(), start: 0, end: 1, src: 'context' }] : [];
      return { intent: c.lastIntent && c.lastIntent !== 'lookup' ? c.lastIntent : 'what-happened', inject: inject.length ? inject : null, ...(inject.length ? {} : {}) };
    }
    const inject = last.map((r) => ({ kind: 'alias', ids: [idx.byId.get(r.id)], best: idx.byId.get(r.id), amb: false, w: W.unit, phrase: r.label.toLowerCase(), start: 0, end: 1, src: 'context' }));
    if (more) return { intent: 'what-happened', inject };
    return { inject, intent: null };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // clarification
  // ------------------------------------------------------------------------------------------------------------------------------------
  async function clarifyIfAmbiguous(S, raw) {
    const mk = (lines, cands, reason) => {
      const blocks = [C.lead(lines, cands.map((c) => c.id))];
      const res = { mode: 'clarify', blocks, src: cands.map((c) => c.id), limited: true };
      const a = finish(S, res, { decline_reason: reason });
      a.chips.follow = cands.slice(0, 6).map((c) => ({ label: c.label, q: c.query || c.label }));
      a.sources = []; return a;
    };
    // a clock time without a day ("what was happening at 3pm?"), or without am / pm ("at 3 o'clock"): ask, do not guess
    if (S.intent === 'at-time' && S.clock) {
      const c = S.clock;
      const ask2 = (line, chips, reason) => { const r = { mode: 'clarify', blocks: [C.lead([line], [])], src: [], limited: true }; const a = finish(S, r, { decline_reason: reason }); a.chips.follow = chips; a.shown = []; a.sources = []; return a; };
      const stem0 = S.text.replace(/[?.!\s]+$/, '');
      if (c.ambiguous === 'meridiem') { const h = c.hour, mm = c.minute ? `:${String(c.minute).padStart(2, '0')}` : ''; return ask2(`Do you mean ${h}${mm} in the morning or in the afternoon or evening?`, [{ label: `${h}${mm} AM`, q: S.text.replace(c.text, `${h}${mm} AM`) }, { label: `${h}${mm} PM`, q: S.text.replace(c.text, `${h}${mm} PM`) }], 'clock-meridiem'); }
      if (c.day === null) return ask2('Which day do you mean? The battle ran from July 1 to July 3, 1863.', [1, 2, 3].map((d) => ({ label: `July ${d}`, q: `${stem0} on July ${d}` })), 'clock-day');
    }
    // bare ordinal with no state: "Tell me about the 1st"
    const ords = S.tokens.filter((t) => /^#\d+$/.test(t));
    const anyUnit = S.mentions.some((m) => m.kind !== 'unit-miss');
    const contentLeft = S.tokens.filter((t) => !STOP.has(t) && !/^#/.test(t) && !INTENT_WORDS.has(t) && !FILLERS.has(t));
    if (ords.length === 1 && !anyUnit && contentLeft.length === 0 && !S.day) {
      const n = +ords[0].slice(1);
      const cands = R.filter((r) => r.k === 'regiment' && r.ord === n && !r.canon && !r.detach && r.arm === 'inf').sort((a, b) => (b.attrs.strength || 0) - (a.attrs.strength || 0)).slice(0, 6);
      if (cands.length > 1) return mk([`Which ${n === 1 ? '1st' : n + 'th'} do you mean? The site has ${cands.length} such regiments, for example ${cands.slice(0, 4).map((c) => c.label).join(', ')}. Name the state (for instance “1st Minnesota”).`], cands.map((c) => ({ id: c.id, label: c.label, query: c.label })), 'bare-ordinal');
    }
    // ambiguous unit mention across sides (1st Maryland) or ambiguous surname
    for (const m of S.mentions) {
      if (m.kind === 'unit' && m.amb) {
        const cands = m.ids.slice(0, 4).map((i) => R[i]);
        return mk([`There is more than one ${cands[0].label}: ${cands.map((c) => `${c.title} (${SIDE_NAME[c.side]})`).join(' and ')}. Which do you mean?`], cands.map((c) => ({ id: c.id, label: `${c.label} (${SIDE_NAME[c.side]})`, query: `${SIDE_NAME[c.side]} ${c.label}` })), 'ambiguous-unit');
      }
    }
    // a bare name or word that could be several people or places ("Hays", "Anderson", "Hill", "the ridge")
    const strict = S.tokens.filter((t) => !STOP.has(t) && !FILLERS.has(t) && !/^#/.test(t));
    if (strict.length === 1 && !S.units.length) {
      const word = stem(strict[0]);
      const sur = S.mentions.find((m) => m.kind === 'surname');
      const personCands = sur ? sur.ids.map((i) => R[i]) : [];
      const placeHits = R.filter((r) => PLACE_KINDS.has(r.k) && r.title && r.title.toLowerCase().split(/[^a-z0-9]+/).map(stem).includes(word));
      const anchoredPlace = S.places.length > 0;
      if (!anchoredPlace && ((sur && sur.amb) || (personCands.length && placeHits.length >= 2) || (!personCands.length && placeHits.length >= 3))) {
        const cands = [...personCands.slice(0, 3).map((q) => ({ id: q.id, label: personLabel(q.attrs.rank, q.attrs.name), q: q.attrs.name, desc: describePerson(q) })), ...placeHits.slice(0, 4).map((q) => ({ id: q.id, label: q.label, q: q.label, desc: q.label }))];
        return mk([`Which do you mean? ${cands.map((c) => c.desc || c.label).join('; ')}.`], cands.map((c) => ({ id: c.id, label: c.label, query: c.q })), 'ambiguous-name');
      }
    }
    // the same corps number in both armies
    const corpsAmb = S.mentions.find((m) => m.kind !== 'unit' && m.ids && m.ids.length > 1 && m.ids.every((i) => R[i].k === 'corps') && new Set(m.ids.map((i) => R[i].side)).size > 1);
    if (corpsAmb && !S.side && !['who-commanded', 'casualties', 'strength', 'compare'].includes(S.intent)) {
      const cands = corpsAmb.ids.map((i) => R[i]);
      const lines = [`Both armies had a ${cands[0].title}: ${cands.map((c) => `${c.label} under ${C.helpers(kb).cmdText(C.helpers(kb).cmdOf(c))}`).join(' and ')}. Which do you mean?`];
      return mk(lines, cands.map((c) => ({ id: c.id, label: c.label, query: `What happened to the ${c.label}?` })), 'ambiguous-corps');
    }
    // generic scope: "how many died?" with nothing to anchor it
    if (['casualties', 'strength'].includes(S.intent) && !anyUnit && !S.places.length && !S.persons.length && !S.side && !/\b(battle|gettysburg|total|overall|army|armies|union|confederate|both|whole|altogether|all)\b/.test(S.norm) && !S.stateMention) {
      const res = C.battleTotals(kb, S, { clarify: true });
      if (res) { const a = finish(S, res, { decline_reason: 'scope-unspecified' }); a.chips.follow = [{ label: 'Union casualties', q: 'How many Union soldiers were casualties?' }, { label: 'Confederate casualties', q: 'How many Confederate casualties?' }, { label: '20th Maine losses', q: 'How many men did the 20th Maine lose?' }]; return a; }
    }
    return null;
  }
  function describePerson(p) { const a = p.attrs; const roles = (a.roles || []).filter((r) => r.r === 'commander'); const u = roles[0] && roles[0].u && idx.get(roles[0].u); return `${personLabel(a.rank, a.name)}${u ? ` (${SIDE_NAME[u.side]}, ${u.label})` : ''}`; }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // decide: refuse when nothing in the records supports an answer
  // ------------------------------------------------------------------------------------------------------------------------------------
  function decide(S) {
    const linked = S.mentions.filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length);
    const hasLink = linked.length > 0;
    const unitMiss = S.mentions.filter((m) => m.kind === 'unit-miss');
    if (S.intent === 'ancestor' || S.intent === 'presence' || S.day && !hasLink) return null;
    if (unitMiss.length && !hasLink) {
      const m = unitMiss[0];
      const nm = `${m.ord}${['th', 'st', 'nd', 'rd'][(m.ord % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][m.ord % 100] || 'th'} ${m.state.replace(/\b[a-z]/g, (c) => c.toUpperCase())}`;
      return declineAnswer(S, { reason: 'unit-not-in-records', text: `The site’s order of battle has no ${nm} regiment, so I cannot answer questions about it. It may not have been at Gettysburg, or it may be recorded under another name.` });
    }
    const contentToks = S.tokens.filter((t) => !STOP.has(t) && !/^#/.test(t) && !(CONSUMED.has(S.intent) && INTENT_WORDS.has(t)) && !FILLERS.has(t));
    const matched = contentToks.filter((t) => kb.lex.has(stem(t)) || idx.nameVocab.has(stem(t)) || dfOf(entix, stem(t)) > 0);
    const cover = contentToks.length ? matched.length / contentToks.length : (hasLink ? 1 : 0);
    const top = S.ranked[0];
    const topRec = top && R[top.i];
    const qs = S.cardTerms;
    const nameHit = topRec ? qs.some((t) => { const p = entix.post[t]; if (!p) return false; const e = p.find((x) => x[0] === top.i); return e && (e[1] || e[2] || e[3] || e[4]); }) : false;
    const genericHi = qs.length && qs.every((t) => dfOf(entix, t) > 120);
    const strongDomain = S.tokens.some((t) => STRONG_DOMAIN.has(t)) || S.day;
    let reason = null;
    if (!S.ranked.length) reason = 'no-match';
    else if (!hasLink && !strongDomain && S.unknown.length >= 1) reason = 'out-of-domain';
    else if (!hasLink && cover < 0.6) reason = 'low-coverage';
    else if (!hasLink && qs.length <= 3 && !nameHit) reason = 'no-dedicated-record';
    else if (genericHi && !hasLink) reason = 'generic-only';
    else if (!hasLink && S.unknown.length >= 1) reason = 'unknown-terms';
    else if (!hasLink && top.s < 1.2) reason = 'low-score';
    else if (!hasLink && !strongDomain && S.ranked[0].s < 7) reason = 'no-domain-signal';
    // a corrected token that IS the whole subject ("Gettysburg") is not a question
    if (!reason && !hasLink && S.notes.some((n) => n.kind === 'fuzzy') && qs.length > 0 && qs.every((t) => dfOf(entix, t) > 25)) reason = 'did-you-mean-generic';
    if (!reason) return null;
    const closest = S.ranked.filter((x) => !['person'].includes(x.k)).slice(0, 3).map((x) => R[x.i]).filter((r) => hasLink || top.s >= 2.5);
    const a = declineAnswer(S, { reason, text: 'I could not find a record on this site that answers that. This tool searches the Battle of Gettysburg records: regiments, commanders, places and moments of July 1 to 3, 1863.' });
    if (closest.length) a.chips.follow = closest.map((r) => ({ label: r.label, q: r.label })).concat(a.chips.follow.slice(0, 2));
    return a;
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // composition by intent
  // ------------------------------------------------------------------------------------------------------------------------------------
  const unitOrder = (S, echelon) => {
    const rank = (r) => { const order = echelon ? { brigade: 0, division: 1, corps: 2, army: 3, regiment: 5, artillery: 5, 'artillery-unit': 4 } : { regiment: 0, artillery: 0, brigade: 2, division: 3, corps: 4, army: 5, 'artillery-unit': 4 }; return order[r.k] ?? 9; };
    return S.units.slice().sort((a, b) => rank(a) - rank(b));
  };

  // ------------------------------------------------------------------------------------------------------------------------------------
  // multi-hop: "the division that included the 24th Michigan", "which division did Armistead's brigade belong to"
  // ------------------------------------------------------------------------------------------------------------------------------------
  function resolveHop(S, units) {
    const m = S.norm.match(/\b(brigade|division|corps)\b/);
    if (!m) return null;
    const cue = /\b(belong\w*|part of|included|includes|in which|served in|was in|were in|that the|which the|the\b.*\bthat)\b/.test(S.norm);
    const lower = units.filter((u) => C.levelOf(u) >= 0 && C.levelOf(u) < C.levelOf({ k: m[1] }));
    if (!cue || !lower.length) return null;
    const from = lower[0];
    const to = C.ancestorAt(kb, from, m[1]);
    if (!to) return null;
    return { from, to, units: [to, ...units.filter((x) => x !== from && x !== to)] };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // sequence: "in what order did A, B and C happen": one chronology / vignette card per clause, ordered by the map's own event order
  // ------------------------------------------------------------------------------------------------------------------------------------
  function sequenceAnswer(S) {
    const body = S.text.replace(/^.*?\b(?:in what order|what order|which came first|what came first)\b(?: did| do| were| was| are)?/i, '').replace(/[?.!]+$/, '');
    const clauses = body.split(/,| and then | then | and | before | after /i).map((x) => x.trim()).filter((x) => x.split(/\s+/).length >= 2);
    const picked = [];
    for (const cl of clauses) {
      const stems = tokenize(cl, { keepStop: false }).map((t) => (/^#/.test(t) ? t : stem(t))).filter((t) => !INTENT_WORDS.has(t) && !FILLERS.has(t) && !DOMAIN_NOISE.has(t) && !/^#\d+$/.test(t) && t !== 'day' && t !== 'july');
      if (!stems.length) continue;
      const sc = scoreCards(entix, stems);
      let best = null;
      for (const [i, v] of sc) { const r = R[i]; if (!['chronology', 'vignette'].includes(r.k)) continue; let x = v; if (S.day && r.attrs.day === S.day) x *= 1.4; if (r.k === 'chronology') x *= 1.1; if (!best || x > best.x) best = { r, x }; }
      if (best && !picked.some((q) => q.id === best.r.id)) picked.push(best.r);
    }
    if (picked.length < 2) return null;
    picked.sort((x, y) => x.attrs.tick - y.attrs.tick);
    const day = picked[0].attrs.day;
    const blocks = [C.lead([`In the site\u2019s chronology these happened in this order${picked.every((r) => r.attrs.day === day) ? ` on ${day === 1 ? 'July 1' : day === 2 ? 'July 2' : 'July 3'}` : ''}:`], picked.map((r) => r.id)),
      { t: 'list', title: '', items: picked.map((r, i) => ({ txt: `${['First', 'Then', 'Then', 'Then', 'Finally'][Math.min(i, picked.length - 1 === i ? 4 : Math.min(i, 3))]}: ${r.title}${r.place ? ` (${r.place})` : ''}`, ent: r.id })), src: picked.map((r) => r.id) },
      C.note('order-basis', 'The order follows the site\u2019s own event sequence; no clock times are derived.')];
    return { mode: 'answer', blocks, src: picked.map((r) => r.id) };
  }

  // ------------------------------------------------------------------------------------------------------------------------------------
  // quotation questions: "what did Lee say", "who shouted 'Come on, you Wolverines!'"
  // ------------------------------------------------------------------------------------------------------------------------------------
  async function quoteAnswer(S) {
    const ranked = await getPassages(S, { limit: 24 });
    const quoted = [...S.text.matchAll(/["\u201c]([^"\u201d]{4,})["\u201d]/g)].map((m) => baseNorm(m[1]));
    let pool = ranked.filter((x) => /["\u201c\u201d']/.test(x.p.text));
    if (quoted.length) { const hit = ranked.filter((x) => quoted.some((qq) => baseNorm(x.p.text).includes(qq))); if (hit.length) pool = hit; }
    if (!pool.length) return null;
    const entStems = new Set(); for (const m of S.mentions) if (m.kind !== 'unit-miss') for (const t of (m.phrase || '').split(' ')) if (t && !/^#|\|/.test(t)) entStems.add(t);
    // the people whose words are asked for ("what did Lee say ...", "what did Longstreet tell Lee"): the speaker is named before the verb
    const speakerStems = new Set(); { const who = S.norm.match(/\b(?:what|who)\s+(?:did|does|was)\s+(\S+(?:\s+\S+)?)\s+(?:say|said|tell|told|write|wrote|shout|shouted|reply|replied)\b/); if (who) for (const t of who[1].split(' ')) if (!STOP.has(t) && t.length > 2) speakerStems.add(stem(t)); }
    const ctx = { qStems: new Set(S.passageTerms), entStems, timeQ: false, quoteQ: true, speakerStems };
    const quotes = selectQuotes(kb, pool, ctx, { max: 2, skip: new Set(S.ctx && S.ctx.shownPassages || []), rerank: true });
    if (!quotes.length) return null;
    S.quotes = quotes;
    return { mode: 'answer', blocks: [C.lead(['According to the site\u2019s records, this is what was said, word for word.'], []), ...quotes], src: quotes.map((q) => q.rec) };
  }

  async function composeFor(S) {
    const echelonWord = /\b(brigade|division|corps|army)\b|corps[iv]+/.test(S.norm);
    let units = unitOrder(S, echelonWord);
    const person = S.persons[0] || null;
    const place = S.places[0] || null;
    const soleUnitMention = (() => { const u = S.mentions.filter((m) => m.kind === 'unit'); return u.length ? R[u[0].best] : null; })();
    const intent = S.intent;
    let res = null;
    if (intent === 'at-time') { res = clockAnswer(kb, S); if (res) return res; }

    // ---- premise checks (never confirm a false premise) -----------------------------------------------------------------------------------------------
    const died = /\b(died|die|dies|dying|killed|death|dead|shot|fell)\b/.test(S.norm) && /\b(how|why|when|where|explain|what)\b/.test(S.norm);
    if (died && person && !S.norm.includes('how many')) {
      const c = commandedUnits(person)[0];
      const fate = person.attrs.fate || '';
      if (/^Survived/i.test(fate)) {
        const runs = [`${personLabel(person.attrs.rank, person.attrs.name)} did not die at Gettysburg: the site\u2019s record says ${fate.charAt(0).toLowerCase() + fate.slice(1)}. `];
        const r = { mode: 'answer', blocks: [C.lead(runs, [c ? c.id : person.id])], src: [c ? c.id : person.id], premise: 'survived' };
        if (c) r.blocks.push(C.lead(['About the unit: ', ...C.profileLead(kb, c)], [c.id]));
        return r;
      }
      const dr = C.successionAnswer(kb, S, { relieved: person });
      if (dr) { await addQuotes(S, dr, { max: 1 }); return dr; }
    }
    if (/\b(lee|confederate|confederates|confederacy|south)\b/.test(S.norm) && /\b(win|won|victory|victorious)\b/.test(S.norm) && !/\bwho\b/.test(S.norm)) {
      return C.outcomeAnswer(kb, S, 'That premise is not supported by the records: the Confederate army did not win the battle.');
    }

    // ---- multi-hop: replace the named unit by its brigade / division / corps ---------------------------------------------------------------------------
    const hop = intent === 'membership' ? null : resolveHop(S, units);
    if (hop) units = hop.units;
    const withHop = (r) => { if (r && hop) { r.blocks.unshift(C.lead([C.ent(hop.from), ' was part of ', C.ent(hop.to, withThe(hop.to.title === hop.to.label ? hop.to.label : `${hop.to.label} (${hop.to.title})`)), '.'], [hop.to.id, hop.from.id])); r.src.unshift(hop.to.id); } return r; };

    if (intent === 'opponent' && (soleUnitMention || units[0])) {
      res = C.opponentsAnswer(kb, soleUnitMention || units[0]);
      if (res) { await addQuotes(S, res, { max: 1 }); return res; }
    }
    if (intent === 'ancestor') return C.ancestorAnswer(kb, S, soleUnitMention || (units[0] && units[0].k === 'regiment' ? units[0] : null));
    if (intent === 'presence') {
      if (person || units.length) { if (person && !units.length) res = null; else return C.soldierLimit(kb, S, soleUnitMention || units[0]); }        // the regiment the reader named, not an alias that shares a surname ("Smith")
      else return C.soldierLimit(kb, S, soleUnitMention);
    }
    if (intent === 'membership') {
      const u = soleUnitMention || units.find((x) => C.levelOf(x) >= 0 && C.levelOf(x) < 3);
      const ech = (S.norm.match(/\b(brigade|division|corps|army)\b/) || [])[1];
      if (u) { res = C.membershipAnswer(kb, S, u, ech); if (res) return res; }
    }
    if (intent === 'succession') { res = C.successionAnswer(kb, S); if (res) { await addQuotes(S, res, { max: 1 }); return res; } }
    if (intent === 'who-commanded') {
      let us = units.length ? units : person ? commandedUnits(person) : [];
      // "who directed the Confederate cannonade ... the Union chief of artillery" names a role or an event, not the army's commander: a bare side word must not turn it into "who commanded the army"
      const otherRole = /\bchief of (?:artillery|staff|cavalry)\b|\bartillery chief\b|\bcannonade\b|\bbombardment\b/.test(S.norm);
      if (otherRole && us.length && us.every((u) => u.k === 'army')) us = [];
      // "Lee's cavalry", "Meade's cavalry": the possessive names the army, the noun names the arm, so the answer is that side's cavalry corps
      if (/\bcavalry\b/.test(S.norm) && us.length && us.every((u) => u.k === 'army')) { const cav = R.filter((r) => r.k === 'corps' && /Cavalry/.test(r.title) && r.side === us[0].side); if (cav.length) us = cav; }
      if (!us.length && !otherRole && (S.side === 'U' || S.side === 'C' || /\barmy\b/.test(S.norm))) { const a = idx.get('ARMY:' + (S.side || 'U')); if (a) us = [a]; }
      if (!us.length && /\bcavalry\b/.test(S.norm)) { us = R.filter((r) => r.k === 'corps' && /Cavalry/.test(r.title)); }
      if (us.length) {
        res = C.commandAnswer(kb, us.length > 1 && us[0].k === 'corps' ? us : (echelonWord && !hop ? unitOrder(S, true) : us), S);
        if (res) { if (us.length === 1 || us[0].k !== 'corps') await addQuotes(S, res, { max: 1 }); return withHop(res); }
      }
    }
    if (intent === 'superlative') {
      if (/\b(highest|tallest|lowest)\b/.test(S.norm) && /\b(point|hill|ridge|mountain|peak|elevation|ground|spot|place)\b/.test(S.norm) && !/\b(regiment|brigade|division|corps|casualt|men)\b/.test(S.norm)) { res = C.terrainSuperlative(kb, S); if (res) return res; }
      res = C.superlativeAnswer(kb, S); if (res) return res;
    }
    if (intent === 'count') {
      if (/\b(guns?|cannons?|batter(?:y|ies))\b/.test(S.norm) && !units.length) { res = C.gunsAnswer(kb, S); if (res) return res; }
      res = C.rollupAnswer(kb, S, { units }); if (res) return res;
    }
    if (intent === 'list' || (intent === 'lookup' && S.stateMention && /\bregiments?\b/.test(S.norm))) {
      res = C.rollupAnswer(kb, S, { units }); if (res) return res;
    }
    if ((intent === 'strength' || intent === 'casualties') && (units.length || person)) {
      const us = units.length ? units : commandedUnits(person);
      res = C.statsAnswer(kb, us.slice(0, /\b(compare|and|versus)\b/.test(S.norm) ? 2 : 1), S, intent); if (res) return withHop(res);
    }
    if ((intent === 'casualties' || intent === 'strength') && place && !units.length) {
      const rule = facts.unknowns.find((u) => u.id === 'per-location-casualties');
      res = C.limitedPlace(kb, S, place, rule); if (res) { await addQuotes(S, res, { max: 1 }); return res; }
    }
    const linkedAny = S.mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length);
    // "total casualties at Gettysburg": the word "casualties" alone links the site's casualty-notes card; that is not a subject, so the battle totals still answer
    const linkedSpecific = S.units.length + S.persons.length + S.places.length + S.others.filter((o) => !['casualty-note', 'site'].includes(o.k)).length > 0;
    if ((intent === 'strength' || intent === 'casualties') && !units.length && !person && !linkedSpecific) {
      const both = /\b(versus|vs|compare|both|each side|two armies|armies)\b/.test(S.norm) || !S.side;
      res = C.battleTotals(kb, S, { which: both ? 'both' : 'one' }); if (res) return res;
    }
    if (intent === 'outcome') { res = C.outcomeAnswer(kb, S, null); if (res) return res; }
    if (intent === 'compare') {
      const us = S.units.filter((u) => u.attrs && typeof u.attrs.strength === 'number');
      if (us.length >= 2) { res = C.compareAnswer(kb, us, S); if (res) { await addQuotes(S, res, { max: 1 }); return res; } }
      const pl = S.places.filter((r) => r.k === 'terrain');
      if (us.length < 2 && pl.length >= 2) { res = C.comparePlaces(kb, pl.slice(0, 2)); if (res) return res; }
      if (!us.length && /\b(union|confederate)\b/.test(S.norm)) { res = C.battleTotals(kb, S, { which: 'both' }); if (res) return res; }
    }
    if (intent === 'echelons') { res = C.echelonAnswer(kb, S); if (res) return res; }
    if (intent === 'overview' && !linkedAny) { res = C.overviewAnswer(kb, S); if (res) return res; }
    if (intent === 'day-summary') { res = C.daySummary(kb, S.day, S); if (res) return res; }
    if (intent === 'sequence') { res = sequenceAnswer(S); if (res) return res; }
    if (intent === 'quote') { res = await quoteAnswer(S); if (res) return res; }
    if (intent === 'when' && /\bhow (?:long|many (?:hours?|minutes?|days?))\b|\bduration\b|\bhow much time\b|\bfor how long\b/.test(S.norm)) {
      // "how many hours did the July 3 fight for Culp's Hill last?": the length is stated in the site's own words (a chronology entry, a terrain note, the casualty highlights); quote the sentence that states it
      let cands = (await getPassages(S, { limit: 40 })).filter((x) => DURATION_RE.test(x.p.text));
      // about what was asked: with a linked subject ("Culp's Hill", "Pickett's Charge") only passages linked to it or naming it count
      const subjIds = [...new Set(S.mentions.filter((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length).flatMap((m) => (m.kind === 'unit' ? [m.best] : m.ids.slice(0, 3))).map((i) => R[i].id))];
      if (subjIds.length) {
        const ep = await kb.entityPassages(subjIds); const phrases = S.mentions.filter((m) => m.kind !== 'unit-miss' && m.phrase && !/[#|]/.test(m.phrase)).map((m) => ' ' + m.phrase + ' ');
        cands = cands.filter((x) => ep.has(x.p.num) || phrases.some((f) => (' ' + tokenize(x.p.text).map(stem).join(' ') + ' ').includes(f)));
      }
      if (cands.length) {
        const entStems = new Set(); for (const m of S.mentions) { if (m.kind === 'unit-miss') continue; for (const t of (m.phrase || '').split(' ')) if (t && !/^#|\|/.test(t)) entStems.add(t); }
        const quotes = selectQuotes(kb, cands, { qStems: new Set(S.passageTerms), entStems, timeQ: false, durationQ: true }, { max: 2, skip: new Set(S.ctx && S.ctx.shownPassages || []) });
        if (quotes.length) { S.quotes = quotes; return { mode: 'answer', blocks: [C.lead(['The site’s records state the length in their own words.'], []), ...quotes, C.note('time-basis', 'The lengths are quoted as the site’s records give them; they are approximate and no clock time is derived from them.')], src: quotes.map((q) => q.rec) }; }
      }
    }
    if (intent === 'when') {
      const ranked = S.ranked.filter((x) => ['chronology', 'vignette', 'succession'].includes(x.k)).slice(0, 3).map((x) => R[x.i]);
      const focus = ranked[0];
      if (focus) {
        if (!S.day && focus.attrs && focus.attrs.day) S.day = focus.attrs.day;
        const res2 = { mode: 'answer', blocks: [C.lead(C.profileLead(kb, focus), [focus.id])], src: [focus.id] };
        const wl = whenLine(kb, focus);                                  // the time model's clock for this event, when it has one: approximate, and said to be a proposal
        if (wl) res2.blocks.unshift(C.lead([wl], [focus.id]));            // the time IS the answer to "what time / when", so it is the first thing said
        const got = await addQuotes(S, res2, { max: 2, timeQ: true, requireClock: true, leadHasText: true });
        res2.blocks.push(C.note('time-basis', wl ? 'That time comes from the site\u2019s proposed revised timeline, which is approximate and has not yet been reviewed by a historian; sources differ, and any times inside the quotes are as their authors wrote them.'
          : got.length ? 'Times are quoted as written in the site\u2019s own records; the site\u2019s revised timeline has no entry for this, so no other clock time is given.' : 'The site\u2019s records do not state a clock time for this in their text and the site\u2019s revised timeline has no entry for it, so I will not give one.'));
        return res2;
      }
    }
    return null;
  }

  async function fallbackProfile(S) {
    // grammar-linked units are high precision and come first (ordered by echelon when the query names one); then the card ranking decides
    const ordered = [];
    const push = (r) => { if (r && !ordered.includes(r)) ordered.push(r); };
    const echelonWord = /\b(brigade|division|corps|army)\b|corps[iv]+/.test(S.norm);
    // on-site context: a deictic question ("what happened here?") is about the selected unit or the event nearest the map's current moment
    if (S.onsite) {
      if (S.onsite.selected_unit && /\b(regiment|unit|brigade|division|corps|battery)\b/.test(S.norm)) push(idx.get(S.onsite.selected_unit));
      for (const r of S.tickEvents || []) push(r);
    }
    for (const m of S.mentions) if (m.kind === 'unit' && !m.amb) push(R[m.best]);
    // a unit's nickname or possessive name ("Bigelow's battery", "the Bucktails") that resolves to exactly one unit is the subject of "what happened to it at <place>": the place is context, not the answer
    if (S.intent === 'what-happened' && S.places.length) for (const m of S.mentions) if (m.kind === 'alias' && !m.amb && m.ids && m.ids.length === 1 && UNIT_KINDS.has(R[m.ids[0]].k)) push(R[m.ids[0]]);
    const gram = ordered.slice().sort((x, y) => unitOrder(S, echelonWord).indexOf(x) - unitOrder(S, echelonWord).indexOf(y));
    if (!S.onsite) { ordered.length = 0; gram.forEach(push); }
    for (const x of S.ranked) push(R[x.i]);
    const focus = ordered[0];
    if (!focus) return null;
    const blocks = [];
    const src = [];
    if (focus.k === 'person') {
      const u = commandedUnits(focus)[0];
      blocks.push(C.lead(C.profileLead(kb, focus), [u ? u.id : focus.id])); src.push(u ? u.id : focus.id);
      if (u) { blocks.push(C.lead(['About the unit: ', ...C.profileLead(kb, u)], [u.id])); src.push(u.id); }
    } else { blocks.push(C.lead(S.simple ? C.simpleLead(kb, focus) : C.profileLead(kb, focus), [focus.id])); src.push(focus.id); }
    // one nickname, several records ("the Bucktails")
    const am = S.mentions.find((m) => m.kind === 'alias' && m.ids && m.ids.length > 1 && m.ids.some((i) => R[i].id === focus.id));
    if (am) { const lst = C.sharedNameList(kb, focus, am.ids); if (lst) { blocks.push(lst); src.push(...lst.src.slice(0, 2)); } }
    // the map's "what happened here": the neighbouring entries of the same moment are part of the answer (their own words, capped), not only the nearest one
    if (S.onsite && S.tickEvents && S.tickEvents.length > 1) {
      const near = S.tickEvents.filter((r) => r.id !== focus.id).slice(0, 2);
      if (near.length) { blocks.push({ t: 'list', title: 'Nearby in the site’s chronology:', items: near.map((r) => ({ txt: eventSummary(r), ent: r.id })), src: near.map((r) => r.id) }); src.push(...near.map((r) => r.id)); }
    }
    const res = { mode: 'answer', blocks, src };
    const causal = S.intent === 'why';
    if (causal) res.blocks.push(C.note('debate', 'Historians debate questions like this one. These are the accounts in the site\u2019s records, not a verdict.'));
    await addQuotes(S, res, { max: causal ? 3 : 2, leadHasText: focus.k === 'chronology' && !S.simple });
    return res;
  }

  return { ask, kb, getPassages, rankCards };
}
