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
import { tokenize, stem, splitSentences, dl } from '../../../historian-src/core/text.js';
import { findSignatures } from './or27-dispatch.mjs';

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
    if (/^[,\s]+(?:Assistant\s+Adjutant|A\.?\s?A\.?\s?G\b)/i.test(after)) continue;         // "General Williams, Assistant Adjutant-General" is the staff officer of the army (Seth Williams), not the site's division commander
    const tc = m[1] ? rankClassOfText(m[1]) : null;
    if (tc && !(RANK_OK[tc] || []).includes(pc)) continue;
    // a general or lieutenant general of the registry held that rank throughout the summer of 1863: a "Major-General Hill" or "Brigadier-General Lee" of that summer is another man (D. H. Hill, Fitzhugh Lee)
    if (m[1] && /^(?:Lieutenant General|General)$/.test(String((rec.attrs && rec.attrs.rank) || '')) && /^(?:Maj|Brig)/i.test(m[1])) continue;
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
// The site's register gives the fate of a man ("KIA July 1 - shot through both lungs ...", "Died of wounds July 7"): a signature or a link made from a name in a dispatch written AFTER that day is another man of the same name
// (the dispatch of August 1, 1863 signed "H. K. BURGWYN" is the father, writing to General Whiting about Weldon; the register's Col. Henry Burgwyn was killed on July 1)
const FATE_DAY = /^(?:KIA|Killed|DOW|Died(?: of wounds)?|MWIA)\b[^.]*?\b(?:died\s+)?(June|July|August)\s+(\d{1,2})\b/i;
export function diedOn(rec) {
  const fate = String((rec.attrs && rec.attrs.fate) || ''); const m = FATE_DAY.exec(fate); if (!m) return null;
  const d = /\bdied\b[^.]*?\b(June|July|August)\s+(\d{1,2})\b/i.exec(fate) || m;
  return '1863-' + String({ june: 6, july: 7, august: 8 }[d[1].toLowerCase()]).padStart(2, '0') + '-' + String(+d[2]).padStart(2, '0');
}
const DEATH_WORDS = /\b(?:kill(?:ed|s)?|fell|fall|death|dead|died|dying|wound(?:ed|s)?|mortally|late|lamented|body|remains|buried|loss|lost|memory|grave|funeral|captured)\b/i;
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
  function mentionsOf(sentence, { side = null, date = null } = {}) {
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
        { const after = toks.slice(m.end, m.end + 4); if (span.includes('militia') || after.includes('militia') || (after.includes('national') && after.includes('guard')) || (after.includes('n') && after.includes('g') && after.indexOf('n') + 1 === after.indexOf('g'))) continue; }
        // "Cooper's (First Pennsylvania Reserve Volunteer) battery": the name of a battery written with its parent's regiment is not the regiment
        if (!isBattery(best) && /^(?:battery|batteries)$/.test(toks[m.end] || '')) continue;
        // a Union report's "Twelfth Virginia" is a West Virginia regiment, and Maryland, Kentucky, Missouri and Tennessee sent units to both sides: across the line, not guessed
        if (side && sideOf(best) && sideOf(best) !== side && /^(?:virginia|maryland|kentucky|missouri|tennessee)$/.test(stateWord)) continue;
        const spanArms = new Set(span.map((t) => (/^cavalry$/.test(t) ? 'cav' : /^(?:battery|batteries|artillery)$/.test(t) ? 'art' : t === 'infantry' ? 'inf' : /^sharpshooters?$/.test(t) ? 'ss' : /^reserves?$/.test(t) ? 'res' : null)).filter(Boolean));
        // "the first United States quartermaster's post" is no regiment: the Regulars are named with their arm ("First United States Infantry, Cavalry, Artillery, Sharpshooters")
        if (/^united/.test(stateWord) && !spanArms.size && !toks.slice(m.end, m.end + 2).some((t) => /^(?:infantry|cavalry|artillery|sharpshooters?|regiment|regulars|battery|batteries|volunteers|dragoons|rifles|colored|troops)$/.test(t))) continue;
        // a number read without the hundreds that stand before it ("One hundred and and forty-ninth Pennsylvania": the OCR doubled the "and", and the grammar read "forty-ninth"): not the 49th
        if (toks.slice(Math.max(0, m.start - 3), m.start).some((t) => t === 'hundred' || t === 'thousand')) continue;
        { const num = /^#(\d+)\|/.exec(String(m.phrase)); if (num && span.some((t) => /^#\d{3,}$/.test(t) && t.slice(1) !== num[1])) continue; }     // the span holds a hundreds number the unit's own number is not ("#100 and #49")
        if (isBattery(best)) {
          // "First New York Light Artillery" is a regiment of artillery, not the 1st New York Battery Independent: only the word battery in the span names a battery (tier B: the letter is not read)
          if (!span.some((t) => /^(?:battery|batteries)$/.test(t))) continue; tier = 'B';
        } else {
          const arm = R[best].arm || 'inf', need = ARM_WORD[arm];
          if (spanArms.has('art') && arm !== 'art') continue;                           // "Cooper's (First Pennsylvania Reserve Volunteer) battery" is a battery that carries its parent regiment's name
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
        if (!ev) continue;
        // in a dispatch written after his death, a name that stands with no word of death is a namesake (the signature "H. K. BURGWYN" of August 1, 1863)
        if (date) { const dd = diedOn(R[i]); if (dd && date > dd && !DEATH_WORDS.test(sentence)) continue; }                                                                                // the written rank, given name or initial is not his, or the word is a given name
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
      if (isBattery(i) && toks.slice(Math.max(0, m.start - 4), Math.min(toks.length, m.end + 5)).includes('militia')) continue;   // "Capt. J. M. Knap, Battery A, Pennsylvania militia" is not Knap's Independent Battery E
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
  // the given names as written ("Jas. S.", "Winf’d S.", "William H.") against the record's own ("James", "Winfield Scott", "Wallace"): an initial is the record's initial, a word is the record's word, its abbreviation
  // (Jas. James, Winf'd Winfield: the letters in order from the same first letter) or one OCR slip away; only as many names as both give are compared (the registry often holds no middle name)
  const letters = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
  const subseq = (a, b) => { let k = 0; for (const c of b) if (k < a.length && c === a[k]) k++; return k === a.length; };
  const givenOk = (name, given) => {
    const w = String(name || '').replace(/[.,]/g, ' ').trim().split(/\s+/).slice(0, -1).map(letters).filter(Boolean);
    const g = String(given || '').split(/\s+/).map(letters).filter(Boolean);
    if (!w.length || !g.length) return true;
    for (let k = 0; k < Math.min(w.length, g.length); k++) {
      const x = w[k];
      if (x.length === 1 || g[k].length === 1) { if (x[0] !== g[k][0]) return false; continue; }
      const full = ABBR[x] || x, tol = Math.min(full.length, g[k].length) >= 5 ? 2 : 1;                    // "Alford" for "Alfred" (the contents list and the registry disagree) is two slips of five letters or more
      if (!(full === g[k] || g[k].startsWith(full) || (x[0] === g[k][0] && subseq(x, g[k])) || dl(full, g[k], tol) <= tol)) return false;
    }
    return true;
  };
  /**
   * the subject links of a report from its metadata: the unit named in the contents list (tier A when the grammar names a regiment, B for a formation or battery alias) and the person
   * ({ units: [{id, tier}], person: {id, tier} | null }). A person is matched by surname AND first initial (or given name) AND rank class among the site's people; a surname alone is not enough.
   */
  function resolveAuthor(meta, { side = null, exact = false, date = null } = {}) {
    const res = { units: [], person: null };
    if (meta.author && meta.author.name) {
      const key = surnameKey(meta.author.name); const ini = initials(meta.author.name);
      const rc = meta.author.rank ? rankClassOfText(meta.author.rank) : null;
      // the surname index is keyed by stem ("Whiting" and "White" share one): the written surname must also be within one edit of the person's own
      const written = String(meta.author.name).replace(/[.,]/g, ' ').trim().split(/\s+/).pop().toLowerCase().replace(/[^a-z]/g, '');
      const cands = (idx.surnames.get(key) || []).filter((i) => dl(written, String(R[i].attrs.surname || '').toLowerCase().replace(/[^a-z]/g, ''), 2) <= 1).filter((i) => {
        if (!ini.length) return true;
        return givenOk(meta.author.name, R[i].attrs.given);
      }).filter((i) => !side || !sideOf(i) || sideOf(i) === side).filter((i) => { const dd = date ? diedOn(R[i]) : null; return !(dd && date > dd); }).filter((i) => !rc || (exact ? [rc] : RANK_OK[rc] || []).includes(rankClassOfPerson(R[i].attrs.rank)));
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

  // ---- the sender of a dispatch -----------------------------------------------------------------------------------------------------------------------------------
  const titleName = (s) => String(s).toLowerCase().replace(/(^|[\s.\-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  /** the rank class a signature's title line names ("Major-General, Commanding." general; "Assistant Adjutant-General." staff; none: null) */
  const titleClassOf = (line) => {
    const t = String(line || '').replace(/Adjutant[\s-]*General/gi, 'Adjutant').replace(/Inspector[\s-]*General/gi, 'Inspector').replace(/Judge[\s-]*Advocate[\s-]*General/gi, 'Judge').replace(/-\s+/g, '-');
    if (/\b(?:Lieut(?:enant)?\.?[\s-]*Gen(?:eral)?|Major[\s-]*Gen(?:eral)?|Maj\.?[\s-]*Gen(?:eral)?|Brigadier[\s-]*Gen(?:eral)?|Brig\.?[\s-]*Gen(?:eral)?|General|Gen\.)\b/i.test(t)) return 'general';
    // below a general, a staff function in the title ("Captain, Signal Officer."; "Colonel and Assistant Adjutant-General.") is a staff officer: the site's people are the officers who commanded units, and a staff man of the same surname is not one of them
    if (/\b(?:Lieut(?:enant)?\.?[\s-]*Col(?:onel)?|Col(?:onel|\.)?|Major|Maj\.|Capt(?:ain|\.)?|Lieut(?:enant|\.)?)\b/i.test(t) && /Adjutant|Aide|Assistant|Secretary|Clerk|Surgeon|Inspector|Quartermaster|Ordnance|Signal|Provost|Engineer|Commissary|Judge/i.test(t)) return 'staff';
    if (/\bLieut(?:enant)?\.?[\s-]*Col(?:onel)?\b/i.test(t)) return 'ltcol';
    if (/\bCol(?:onel|\.)\b|\bColonel\b/i.test(t)) return 'colonel';
    if (/\bMajor\b|\bMaj\.(?!\s*Gen)/i.test(t)) return 'major';
    if (/\bCapt(?:ain|\.)?\b/i.test(t)) return 'captain';
    if (/\bLieut(?:enant|\.)?\b/i.test(t)) return 'lieutenant';
    return /Adjutant|Aide|Chief of|Assistant|Secretary|Clerk|Surgeon|Inspector|Quartermaster|Ordnance|Signal|Provost|Engineer|President|Commissary|Judge/i.test(t) ? 'staff' : null;
  };
  /**
   * The sender of a dispatch from its signature line ("GEO. G. MEADE,"): a person of the registry when the name, its initials, the side AND the rank the signature's title line names ("Major-General.")
   * agree, and only when the text carries ONE signature that is also the one the segmenter read (an inclosure, a forwarded dispatch or two dispatches run together have no single sender; "S. WILLIAMS,
   * Assistant Adjutant-General" is not the site's Col. Samuel Williams). { signer: "GEO. G. MEADE" | null, person: { id, tier } | null, title: 'general' | ... | null }
   */
  function resolveSigner(texts, { side = null, signer = null, date = null } = {}) {
    const all = Array.isArray(texts) ? texts.join('\n') : String(texts);
    const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z]/g, '');
    // the signature blocks of the text (or27-dispatch.mjs: NAME, title lines or an inline title); one man twice ("WINF’D S. HANCOCK" and "WINFD S.. HANCOCK": the same letters) is one signature
    const blocks = [...new Map(findSignatures(all.split('\n')).map((x) => [norm(x.name), x])).values()];
    if (blocks.length !== 1) return { signer: null, person: null, signatures: blocks.length, title: null };
    const sig = [blocks[0].name];
    if (signer !== null && norm(signer) !== norm(sig[0])) return { signer: sig[0], person: null, signatures: 1, title: null, mismatch: true };
    // the title is what the block carries: the rest of the signature line, or the line(s) under it
    const title = titleClassOf(blocks[0].title);
    if (!title || title === 'staff') return { signer: sig[0], person: null, signatures: 1, title };
    // the signature's own title gives the rank he held when he signed: a "Colonel" is not a registry general, whatever his later rank
    const au = resolveAuthor({ author: { name: titleName(sig[0]), rank: ({ general: 'General', ltcol: 'Lieut. Col.', colonel: 'Col.', major: 'Maj.', captain: 'Capt.', lieutenant: 'Lieut.' })[title] }, unit: null }, { side, exact: true, date });
    return { signer: sig[0], person: au.person, signatures: 1, title };
  }

  /**
   * The links of one document (a report or a dispatch) in two passes: every passage's mentions first, then the entities of each passage once the units named anywhere in the document are known
   * (a lower-rank person is B only when his own unit is named in the document). Returns [{ mentions, ents }] in passage order and the set of unit ids the document names.
   */
  function linkDocument(passages, { side = null, subjects = [], date = null } = {}) {
    const per = passages.map((p) => mentionsOfText(p.text, { side, date }));
    const docUnits = new Set(subjects.map((x) => x.id));
    for (const ms of per) for (const m of ms) if (UNIT_KINDS.has(m.kind) && (m.tier === 'A' || m.tier === 'B')) docUnits.add(R[m.i].id);
    return { docUnits, passages: per.map((ms) => ({ mentions: ms.map((m) => ({ ...m, tier: tierOf(m, docUnits) })), ents: entitiesOf(ms, subjects, { docUnits }) })) };
  }

  return { mentionsOf, mentionsOfText, entitiesOf, resolveAuthor, resolveSigner, linkDocument, tierOf, idx };
}
