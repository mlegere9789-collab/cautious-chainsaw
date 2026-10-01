// link.mjs - entity links for Official Records passages: units, people and places, with a confidence tier on every link.
//
// It sits on the SAME grammar and alias maps as the engine's linker (historian-src/core/linker.js over the site's T1 registry: 569 unit records, 706 people, 50 places) and adds what report text needs:
//   * a sentence is the unit of evidence (a name is looked for, and its capitals are checked, in the sentence that holds it)
//   * a person's surname, or a one-word alias, is a link only when the word is CAPITALISED in that sentence ("a house and barn" is not General Barnes; "the guard" is not the Garibaldi Guard)
//   * a rank before a surname must agree with the person's rank ("General French" is not the site's Lieut. Col. French: the site's people are those at Gettysburg, a report names many others)
//   * only units, people and places are linked (the site's vignettes, chronology events and monuments are not entities of a report)
//   * a regiment named by state and number is tier A when the arm agrees (a cavalry or artillery record needs its arm word: "First New York" alone is not the 1st New York Battery);
//     a battery needs the word battery or artillery near its name; an alias made only of branch and echelon words ("Horse Artillery") links nothing
//   * an alias of several words, a rank and a surname, a place of several words are tier B; a bare surname or one-word alias is tier C
//   * the side of the report breaks a tie between the Union and the Confederate "1st Maryland"; an unresolved tie is not guessed
//   * the AUTHOR of a report is its subject: the unit named in the contents list, and the person the contents list names, link to every passage of it with role 2
// Tiers: A (the grammar names the unit exactly), B (a multi-word name or rank + surname, capitalised), C (one word; never a subject, never an entity posting). Only A and B links are emitted as passage entities.
import { tokenize, stem, splitSentences } from '../../../historian-src/core/text.js';

export const UNIT_KINDS = new Set(['regiment', 'brigade', 'division', 'corps', 'army', 'artillery', 'artillery-unit']);
export const PLACE_KINDS = new Set(['terrain', 'road', 'structure', 'feature']);
export const CONF = { A: 0.95, B: 0.8, C: 0.5 };
// one-word aliases that are ordinary words in a report (they never link, whatever their capitals)
const GENERIC = new Set(['guard', 'road', 'creek', 'hill', 'ridge', 'field', 'house', 'church', 'college', 'hospital', 'wood', 'woods', 'barn', 'farm', 'pike', 'lane', 'bridge', 'run', 'cemetery', 'town', 'village', 'street', 'seminary', 'orchard', 'stone', 'wall', 'fence', 'angle', 'rock', 'spring', 'mill', 'peach', 'wheat', 'grove', 'ford', 'valley', 'mountain', 'rocky', 'round', 'little', 'big', 'high', 'water', 'copse', 'clump']);
const RANK_WORDS = new Set(['general', 'gen', 'colonel', 'col', 'lieutenant', 'lieut', 'lt', 'major', 'maj', 'captain', 'capt', 'brigadier', 'commodore', 'sergeant', 'sergt', 'surgeon', 'surg', 'doctor', 'dr', 'hon', 'governor', 'president', 'secretary', 'mr']);
// words that, alone or together, name a branch or an echelon and not a unit: an alias made only of them ("Horse Artillery", "Cavalry Corps") links nothing
const GENERIC_UNIT = new Set(['horse', 'hors', 'artillery', 'light', 'heavy', 'battery', 'batteri', 'cavalry', 'corps', 'division', 'brigade', 'army', 'reserve', 'reserv', 'infantry', 'regiment', 'volunteers', 'volunteer', 'union', 'confederate', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'cav', 'art', 'inf', 'independent', 'regular', 'regulars', 'state', 'united', 'states']);
const ARM_WORD = { inf: null, cav: /^cavalry$/, art: /^(?:battery|batteries|artillery)$/, res: /^reserves?$/ };
// the rank before a name, as the report prints it, and the rank class of a person record: a "General French" is not the site's Lieut. Col. French
export function rankClassOfText(word) {
  const w = String(word).toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (/^(?:lieut|lieutenant|lt) col/.test(w)) return 'ltcol';
  if (/gen/.test(w) || /^brig/.test(w) || w === 'general') return 'general';
  if (/^col/.test(w)) return 'colonel';
  if (/^maj/.test(w)) return 'major';
  if (/^capt/.test(w)) return 'captain';
  if (/^(?:lieut|lieutenant|lt)/.test(w)) return 'lieutenant';
  if (/^surg/.test(w)) return 'surgeon';
  return null;
}
export const rankClassOfPerson = (rank) => { const r = String(rank || '').toLowerCase(); return /general/.test(r) ? 'general' : /lieutenant colonel/.test(r) ? 'ltcol' : /colonel/.test(r) ? 'colonel' : /major/.test(r) ? 'major' : /captain/.test(r) ? 'captain' : /lieutenant/.test(r) ? 'lieutenant' : /sergeant/.test(r) ? 'sergeant' : null; };
// a rank + surname names a person only when the rank classes agree exactly: the site's people are the officers at Gettysburg, and a report names many others ("Lieutenant King" is not Capt. James King,
// "Major Gibson" is not Lieut. Col. Jonathan Gibson); a colonel later promoted still answers to "Colonel" in a report of the time
const RANK_OK = { general: ['general'], colonel: ['colonel', 'general'], ltcol: ['ltcol'], major: ['major'], captain: ['captain'], lieutenant: ['lieutenant'], surgeon: ['surgeon', null], sergeant: ['sergeant'] };
const RANK_SRC = 'Lieut(?:enant)?[.\\-\\s]+Col(?:onel)?|Lieut(?:enant)?[.\\-\\s]+Gen(?:eral)?|Maj(?:or)?[.\\-\\s]+Gen(?:eral)?|Brig(?:adier)?[.\\-\\s]+Gen(?:eral)?|General|Gen|Colonel|Col|Major|Maj|Captain|Capt|Lieutenant|Lieut|Lt|Commodore|Surgeon|Surg|Sergeant|Sergt';
const ci = (w) => [...w].map((c) => (/[a-z]/i.test(c) ? '[' + c.toLowerCase() + c.toUpperCase() + ']' : c)).join('');
// first-name abbreviations of the day
const ABBR = { wm: 'william', geo: 'george', chas: 'charles', jno: 'john', thos: 'thomas', benj: 'benjamin', jas: 'james', saml: 'samuel', robt: 'robert', alex: 'alexander', edw: 'edward', fred: 'frederick', hy: 'henry', jos: 'joseph', nath: 'nathaniel', danl: 'daniel', theo: 'theodore', rich: 'richard', jere: 'jeremiah', abm: 'abraham', ths: 'thomas' };
/**
 * What the sentence says about a person record: the best occurrence of his surname, read with the rank before it and the given names or initials between ("Col. H. Boyd McKeen", "Lieut. S. T. Rugg", "General Webb").
 *   null            no occurrence that can be him (not capitalised; a rank of another class; a given name that is not his; the surname followed by an initial: "Thomas A. Rowley" is not General Thomas)
 *   { given, rank } given: a given name or initial is written and agrees; rank: a rank is written and agrees; rankClass of the text
 */
export function personEvidence(sentence, rec) {
  const sn = String((rec.attrs && rec.attrs.surname) || '').replace(/[^A-Za-z]/g, ''); if (!sn) return null;
  const G = String((rec.attrs && rec.attrs.given) || '').split(/\s+/).filter(Boolean).map((x) => x.replace(/[.,]/g, '').toLowerCase());
  const pc = rankClassOfPerson(rec.attrs && rec.attrs.rank);
  const re = new RegExp('(?<![A-Za-z])(?:(' + RANK_SRC + ')\\.?[\\s,]+)?((?:[A-Z][A-Za-z]*\\.?\\s+){0,3}?)(' + ci(sn) + ')(?:[\'’]s?)?(?![A-Za-z])', 'g');
  let best = null;
  for (const m of sentence.matchAll(re)) {
    if (!/^[A-Z]/.test(m[3])) continue;
    const after = sentence.slice(m.index + m[0].length);
    if (/^\s+[A-Z]\.(?![A-Za-z])/.test(after)) continue;                                    // "Thomas A. Rowley": the surname-looking word is a given name
    const tc = m[1] ? rankClassOfText(m[1]) : null;
    if (tc && !(RANK_OK[tc] || []).includes(pc)) continue;
    const toks = m[2].split(/\s+/).map((x) => x.replace(/[.,]/g, '')).filter(Boolean);
    let given = false;
    if (toks.length) {
      const f = toks[0].toLowerCase();
      const ok = f.length === 1 ? G.some((g) => g[0] === f) : G.some((g) => g === f || g === ABBR[f] || (f.length >= 3 && g.startsWith(f)));
      if (!ok) continue;                                                                     // a given name or initial that is not his: a different person
      given = true;
    }
    const ev = { given, rank: !!tc, rankClass: tc };
    if (!best || (ev.given && !best.given) || (ev.rank && !best.rank && !(best.given && !ev.given))) best = ev;
  }
  return best;
}
const capStems = (s) => new Set([...s.matchAll(/\b[A-Z][A-Za-z'’]*/g)].map((m) => stem(m[0].toLowerCase().replace(/['’]s$/, '').replace(/['’]/g, ''))));
const upperStems = (s) => new Set([...s.matchAll(/\b[A-Z]{3,}\b/g)].map((m) => stem(m[0].toLowerCase())));
const tierRank = { A: 3, B: 2, C: 1 };

/**
 * @param idx   prepareT1(t1)  (entities.js)
 * @param link  createLinker(idx, entix)  (linker.js)
 */
export function createOrLinker({ idx, link }) {
  const R = idx.R;
  const kindOf = (i) => R[i].k;
  const sideOf = (i) => (R[i].side === 'U' ? 'union' : R[i].side === 'C' ? 'confederate' : null);
  const isBattery = (i) => R[i].k === 'artillery' || R[i].k === 'artillery-unit';

  /** mentions of one sentence: [{ i (record index), id, kind, tier, via, phrase, why? }] */
  function mentionsOf(sentence, { side = null } = {}) {
    const toks = tokenize(sentence); if (!toks.length) return [];
    const caps = capStems(sentence), ups = upperStems(sentence);
    const isCap = (stemKey) => caps.has(stemKey) || ups.has(stemKey);
    const { mentions } = link(toks, { caps });
    const out = [];
    const nearBattery = (m) => toks.slice(Math.max(0, m.start - 4), Math.min(toks.length, m.end + 4)).some((t) => /^(?:battery|batteries|artillery|battalion|guns)$/.test(t));
    for (const m of mentions) {
      if (m.kind === 'unit-miss' || !m.ids || !m.ids.length) continue;
      if (m.kind === 'unit') {
        // the state must stand in the sentence as a capitalised word ("the 3d Maine" yes; "on the 3d, in me" no)
        const stateWord = String(m.phrase).split('|')[1] || ''; const first = stem(stateWord.split(' ')[0]);
        if (first && first !== 'unit' && first !== 'united' && !isCap(first) && !m.abbr) continue;
        let best = m.best, tier = 'A';
        if (m.amb) {
          const cs = (m.ids || []).filter((i) => sideOf(i) === side);
          if (side && cs.length === 1) { best = cs[0]; tier = 'B'; } else continue;
        }
        const span = toks.slice(m.start, m.end);
        // the militia and the National Guard of 1863 ("the 68th Regt. New York State N. G.", "the Twenty-sixth Pennsylvania Militia") are not the Volunteer regiments of the same number
        { const after = toks.slice(m.end, m.end + 4); if (after.includes('militia') || (after.includes('national') && after.includes('guard')) || (after.includes('n') && after.includes('g') && after.indexOf('n') + 1 === after.indexOf('g'))) continue; }
        // a Union report's "Twelfth Virginia" is a West Virginia regiment, and Maryland, Kentucky, Missouri and Tennessee sent units to both sides: across the line, not guessed
        if (side && sideOf(best) && sideOf(best) !== side && /^(?:virginia|maryland|kentucky|missouri|tennessee)$/.test(stateWord)) continue;
        const spanArms = new Set(span.map((t) => (/^cavalry$/.test(t) ? 'cav' : /^(?:battery|batteries|artillery)$/.test(t) ? 'art' : t === 'infantry' ? 'inf' : /^sharpshooters?$/.test(t) ? 'ss' : /^reserves?$/.test(t) ? 'res' : null)).filter(Boolean));
        if (isBattery(best)) {
          // "First New York Light Artillery" is a regiment of artillery, not the 1st New York Battery Independent: only the word battery in the span names a battery (tier B: the letter is not read)
          if (!span.some((t) => /^(?:battery|batteries)$/.test(t))) continue; tier = 'B';
        } else {
          const arm = R[best].arm || 'inf', need = ARM_WORD[arm];
          if (spanArms.size && !spanArms.has(arm === 'bn' ? 'inf' : arm)) continue;   // the text names another arm ("Fourth United States Artillery" is not the 4th U.S. Infantry; "2d United States Sharpshooters" is not the 2nd U.S. Infantry)
          if (need && !span.some((t) => need.test(t))) tier = 'C';                                                      // a cavalry or reserve record without its arm word is not an exact link
        }
        out.push({ i: best, kind: kindOf(best), tier, via: 'unit-grammar', phrase: m.phrase });
        continue;
      }
      // alias / person / surname mentions
      const words = String(m.phrase).split(' ');
      const allCap = words.every((w) => !w || /^#/.test(w) || isCap(w));
      const keep = m.ids.filter((i) => UNIT_KINDS.has(kindOf(i)) || PLACE_KINDS.has(kindOf(i)) || kindOf(i) === 'person');
      if (!keep.length) continue;
      if (m.kind === 'surname' || m.kind === 'person') {
        if (m.amb || !allCap) continue;
        const i = m.best; if (kindOf(i) !== 'person') continue;
        if (m.kind === 'surname' && (words[0].length < 4 || GENERIC.has(words[0]))) continue;
        const ev = personEvidence(sentence, R[i]);
        if (!ev) continue;                                                                                // the written rank, given name or initial is not his, or the word is a given name
        // A: a given name or initial is written and agrees. B: a general with his rank ("General Webb": the site holds the generals of the battle); a lower rank is B only with support from the
        // document (his own unit is named in it: see entitiesOf), else C. C: the surname alone.
        const general = rankClassOfPerson(R[i].attrs.rank) === 'general';
        // a surname the site's people share with two others (Brown, Smith, Williams, King ...) names the site's man only with the document's support, whatever else is written
        const common = (idx.surnames.get(stem(String(R[i].attrs.surname).toLowerCase().replace(/[^a-z]/g, ''))) || []).length >= 3;
        const tier = general ? (ev.given ? 'A' : ev.rank ? 'B' : 'C') : common ? (ev.given || ev.rank ? 'B?' : 'C') : (ev.given ? 'A' : ev.rank ? 'B?' : 'C');
        out.push({ i, kind: 'person', tier: tier === 'B?' ? 'B' : tier, support: tier === 'B?', via: m.kind === 'person' ? 'person-name' : 'surname', phrase: m.phrase, rankClass: ev.rankClass });
        continue;
      }
      // alias of a unit or a place
      if (words.every((w) => GENERIC_UNIT.has(w) || /^#/.test(w))) continue;                              // "Horse Artillery", "Cavalry Corps": branch words, not a name
      if (m.amb) {
        const same = keep.filter((i) => !side || !sideOf(i) || sideOf(i) === side);
        if (same.length !== 1) continue;
        m.best = same[0];
      }
      const i = keep.includes(m.best) ? m.best : keep[0];
      if (isBattery(i) && !nearBattery(m)) continue;
      const n = m.n || words.length;
      if (n === 1) { if (!allCap || words[0].length < 5 || GENERIC.has(words[0])) continue; out.push({ i, kind: kindOf(i), tier: 'C', via: 'alias-1', phrase: m.phrase }); continue; }
      if (!allCap) continue;
      out.push({ i, kind: kindOf(i), tier: isBattery(i) ? 'B' : m.exact ? 'A' : 'B', via: 'alias', phrase: m.phrase });
    }
    return out;
  }

  /** all mentions of a passage text by sentence: [{ ...mention, sentence: index, s, e }] */
  function mentionsOfText(text, opts = {}) {
    const out = [];
    splitSentences(text).forEach((x, k) => { for (const m of mentionsOf(text.slice(x.s, x.e), opts)) out.push({ ...m, sentence: k, s: x.s, e: x.e }); });
    return out;
  }

  /** the tier of a mention once the document is known: a lower-rank person with a rank and a surname only ("Colonel Hawley") is B when his own unit is named somewhere in the same document, else C */
  function tierOf(m, docUnits) {
    if (!m.support) return m.tier;
    if (!docUnits) return 'C';
    const roles = (R[m.i].attrs && R[m.i].attrs.roles) || [];
    const par = new Set(); for (const r of roles) { par.add(r.u); const rec = idx.get(r.u); if (rec && rec.par) for (const p of rec.par) par.add(p); }
    const own = new Set(roles.map((r) => r.u));
    return [...own].some((u) => docUnits.has(u)) ? 'B' : 'C';
  }
  /** passage entities [[id, role, conf]] from its mentions and the report's author (subject) links; tier C is not an entity */
  function entitiesOf(mentions, subjects = [], { docUnits = null } = {}) {
    const best = new Map();
    const put = (id, role, tier) => { const cur = best.get(id); const r = Math.max(role, cur ? cur.role : 0); const t = !cur || tierRank[tier] > tierRank[cur.tier] ? tier : cur.tier; best.set(id, { role: r, tier: t }); };
    for (const s of subjects) put(s.id, 2, s.tier);
    for (const m of mentions) { if (tierOf(m, docUnits) === 'C') continue; put(R[m.i].id, 1, tierOf(m, docUnits)); }
    return [...best.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([id, v]) => [id, v.role, +CONF[v.tier].toFixed(2)]);
  }

  // ---- the author of a report ---------------------------------------------------------------------------------------------------------------------------------------
  const surnameKey = (name) => { const parts = String(name || '').replace(/[.,]/g, ' ').trim().split(/\s+/).filter(Boolean); return parts.length ? stem(parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '')) : null; };
  const initials = (name) => String(name || '').replace(/[.,]/g, ' ').trim().split(/\s+/).slice(0, -1).map((x) => x[0].toLowerCase());
  /**
   * the subject links of a report from its metadata: the unit named in the contents list (tier A when the grammar names a regiment, B for a formation or battery alias) and the person
   * ({ units: [{id, tier}], person: {id, tier} | null }). A person is matched by surname AND first initial (or given name) AND rank class among the site's people; a surname alone is not enough.
   */
  function resolveAuthor(meta, { side = null } = {}) {
    const res = { units: [], person: null };
    if (meta.author && meta.author.name) {
      const key = surnameKey(meta.author.name); const ini = initials(meta.author.name);
      const rc = meta.author.rank ? rankClassOfText(meta.author.rank) : null;
      const cands = (idx.surnames.get(key) || []).filter((i) => {
        const g = R[i].attrs.given || ''; if (!ini.length) return true;
        const gi = g.toLowerCase().split(/\s+/).filter(Boolean).map((x) => x[0]);
        return gi.length ? ini[0] === gi[0] : true;
      }).filter((i) => !side || !sideOf(i) || sideOf(i) === side).filter((i) => !rc || (RANK_OK[rc] || []).includes(rankClassOfPerson(R[i].attrs.rank)));
      if (cands.length === 1) res.person = { id: R[cands[0]].id, tier: ini.length ? 'A' : 'B' };
      else if (cands.length > 1) {
        // several people share the name and first initial: the one whose command matches the unit the title names, else none
        const um = meta.unit ? mentionsOf(meta.unit, { side }).filter((m) => UNIT_KINDS.has(m.kind)) : [];
        const pick = cands.filter((i) => (R[i].attrs.roles || []).some((r) => um.some((m) => R[m.i].id === r.u)));
        if (pick.length === 1) res.person = { id: R[pick[0]].id, tier: 'A' };
      }
    }
    if (meta.unit) {
      const um = mentionsOf(meta.unit.replace(/,\s*(?:of|including)\s.*$/i, ''), { side }).filter((m) => UNIT_KINDS.has(m.kind) && (m.tier === 'A' || m.tier === 'B'));
      // "One hundred and fiftieth Pennsylvania Infantry, commanding Second Brigade": the first unit named is the regiment, the author commands the brigade; the regiment is a link
      for (const m of um) if (!res.units.some((u) => u.id === R[m.i].id)) res.units.push({ id: R[m.i].id, tier: m.tier });
    }
    return res;
  }

  /**
   * The links of one document (a report or a dispatch) in two passes: every passage's mentions first, then the entities of each passage once the units named anywhere in the document are known
   * (a lower-rank person is B only when his own unit is named in the document). Returns [{ mentions, ents }] in passage order and the set of unit ids the document names.
   */
  function linkDocument(passages, { side = null, subjects = [] } = {}) {
    const per = passages.map((p) => mentionsOfText(p.text, { side }));
    const docUnits = new Set(subjects.map((x) => x.id));
    for (const ms of per) for (const m of ms) if (UNIT_KINDS.has(m.kind) && (m.tier === 'A' || m.tier === 'B')) docUnits.add(R[m.i].id);
    return { docUnits, passages: per.map((ms) => ({ mentions: ms.map((m) => ({ ...m, tier: tierOf(m, docUnits) })), ents: entitiesOf(ms, subjects, { docUnits }) })) };
  }

  return { mentionsOf, mentionsOfText, entitiesOf, resolveAuthor, linkDocument, tierOf, idx };
}
