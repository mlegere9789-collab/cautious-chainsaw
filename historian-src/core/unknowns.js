// unknowns.js - semantic known-unknown rules. The site does not hold the weather of July 1863, what a named private did, a company roster, or what anyone thought: a question about one of these
// is answered with that limitation (compose.unknownAnswer) and what the records do say, never with an unrelated card or a day summary that shares a word.
//
// A rule is an INTENT plus an ENTITY, not a phrase. Each one below reads the question as
//   weather     a weather concept (lexicon: weather_strong, or weather_weak in a weather frame) + the battle's time (a date, a named event, a person, a unit or a period word) and not today / a forecast
//   individual  a person the records do not hold (an enlisted rank with a name, or a capitalised "Name Name" that no person record carries, tied to a unit or to the battle) + a question about him
//   roster      a request for the identities of many (roster, muster roll, "names of the men", "who were the soldiers in", a company letter) + a unit, a place or the battle
//   mental      a mental verb or noun (think, feel, believe, want, opinion, intentions) + a person or unit the records name
// The lexicons are data (tools/historian/data/scope.v1.json "lexicons"), compiled into facts.lexicons; a new word is a data change, not a code change.
import { tokenize, baseNorm, stem } from './text.js';
import { readDays } from './clock.js';

const words = (a) => new Set((a || []).map((w) => String(w).toLowerCase()));

export function createUnknowns(kb) {
  const L = (kb.facts && kb.facts.lexicons) || {};
  const STRONG = words(L.weather_strong), WEAK = words(L.weather_weak), PERIOD = words(L.period_words), ENLISTED = words(L.enlisted_ranks), COMPANY = words(L.company_ranks);
  const ROSTER_N = words(L.roster_nouns), MENTAL_V = words(L.mental_verbs), MENTAL_N = words(L.mental_nouns);
  const FRAMES = (L.weather_frames || []).map((f) => String(f).toLowerCase()), METAPHOR = (L.metaphor_next || []).map((f) => String(f).toLowerCase()), PRESENT = (L.present_time || []).map((f) => String(f).toLowerCase());
  const R = kb.idx.R;

  const has = (norm, phrase) => new RegExp(`(?:^| )${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: |$)`).test(norm);
  // a word sits inside an entity mention only when that is a name the reader wrote as one: a lower-case "rain" is weather, not the Raine of Raine's Battery (whose stem it shares)
  const covered = (S, i, w) => S.mentions.some((m) => m.kind !== 'unit-miss' && m.start >= 0 && i >= m.start && i < m.end && (m.end - m.start > 1 || (S.caps && S.caps.has(stem(String(w))))));
  const unitOf = (S) => { const m = S.mentions.find((x) => x.kind === 'unit' && !x.amb) || S.mentions.find((x) => x.kind !== 'unit-miss' && x.ids && x.ids.length && ['regiment', 'brigade', 'division', 'corps', 'artillery'].includes(R[x.ids[0]].k)); return m ? R[m.kind === 'unit' ? m.best : m.ids[0]] : null; };
  const personOf = (S) => { const m = S.mentions.find((x) => (x.kind === 'person' || x.kind === 'surname') && x.ids && x.ids.length && R[x.ids[0]].k === 'person'); return m ? { rec: R[m.ids[0]], m } : null; };

  // ---- weather ------------------------------------------------------------------------------------------------------------------------------
  function weather(S) {
    const toks = baseNorm(S.text).split(' ').filter(Boolean);
    const norm = toks.join(' ');
    let hit = -1, strong = false;
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      const isStrong = STRONG.has(w), isWeak = !isStrong && WEAK.has(w);
      if (!isStrong && !isWeak) continue;
      if (covered(S, i, w)) continue;                                                  // a word inside a place or unit name ("Stormy's Battery") is a name
      const after = toks.slice(i + 1, i + 4).join(' ');
      if (METAPHOR.some((m) => after === m || after.startsWith(m + ' '))) continue;     // "the heat of the fighting", "a storm of shot"
      if (toks[i - 1] === 'a' && w === 'hail') continue;
      if (isStrong) { hit = i; strong = true; break; }
      // a weak word is weather only in a weather frame ("how hot was it", "what was the heat like", "was it muddy")
      const before = toks.slice(Math.max(0, i - 5), i).join(' ');
      if (FRAMES.some((f) => has(before + ' ' + w, f) || before.endsWith(f))) { hit = i; break; }
    }
    if (hit < 0) return false;
    const present = PRESENT.some((p) => has(norm, p));
    const day = readDays(S.text);
    const period = day.n > 0 || toks.some((t) => PERIOD.has(t)) || S.mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length) || /\b1[78]\d\d\b/.test(S.text);
    if (present && !period) return false;                                              // today's weather is the scope gate's (a forecast is declined with a pointer)
    return strong || period ? 'weather-at-battle' : false;
  }

  // ---- an individual soldier ---------------------------------------------------------------------------------------------------------------
  const NOT_A_NAME = /^(?:property|life|residence|collection|letters?|papers?|conversation|journals?|diary|sector|industry|soldiers?|men|troops|members|volunteers|recruits|individuals|people|units?|regiments?|companies|company|first|second|third|class|rank|ranks|wages|pay|pension|pensions|equipment|gear|uniforms?|rations?)$/;
  const CONNECT = /^(?:of|in|from|with|at|did|do|does|was|were|is|are|who|that|and|or|to|for|on|during|survive|survived|fight|fought|serve|served|die|died)$/;
  function individual(S) {
    const toks = baseNorm(S.text).split(' ').filter(Boolean);
    const unit = unitOf(S);
    const battle = !!unit || S.mentions.some((m) => m.kind !== 'unit-miss') || /\b(gettysburg|battle|fight|fought|regiment|company|army)\b/i.test(S.text);
    // (1) an enlisted rank followed by a name: "Private John Smith of the 20th Maine", "Corporal Jones of the 1st Minnesota", "Pvt. Davis, 69th Pennsylvania", "sergeant john davis in the 69th pennsylvania"
    for (let i = 0; i < toks.length - 1; i++) {
      if (!ENLISTED.has(toks[i])) continue;
      const name = [];
      for (let k = i + 1; k < toks.length && name.length < 3 && !CONNECT.test(toks[k]) && !/^#/.test(toks[k]); k++) name.push(toks[k]);
      if (!name.length || NOT_A_NAME.test(name[0])) continue;                          // "private property", "private soldiers": a class, not a person
      const capital = new RegExp(`\\b(?:${[...ENLISTED].join('|')})\\.?\\s+[A-Z]`).test(S.text);
      if (capital || (unit && name.length >= 1)) return true;
    }
    // (2) "<Given> <Surname> of / in the <unit>": two capitalised words that no record carries, tied to a unit
    if (unit) {
      for (const m of S.text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+){1,2})\b/g)) {
        const parts = m[1].split(/\s+/);
        if (parts.some((p) => /^(?:july|june|august|the|union|confederate|army|corps|brigade|division|regiment|battery|hill|ridge|road|run|pike|farm|woods|house|field|top|little|big|round|cemetery|culp|seminary|peach|devil|wheatfield|new|north|south|west|east|fort|general|colonel|captain|major|lieutenant|gen|col|capt|maj|lt|what|who|was|did|how|tell|which)$/i.test(p))) continue;
        const t0 = tokenize(m[1]).map(stem);
        if (S.mentions.some((x) => (x.kind === 'person' || x.kind === 'surname' || x.kind === 'alias') && x.ids && x.ids.length && t0.some((w) => String(x.phrase || '').split(' ').includes(w)))) continue;
        if (/^\s*,?\s*(?:of|in|from|with|serving in|of the|in the)\b/i.test(S.text.slice(m.index + m[1].length, m.index + m[1].length + 24)) || /^\s*,\s*(?:the\s+)?(?:\d|first|second|third)/i.test(S.text.slice(m.index + m[1].length, m.index + m[1].length + 12))) return true;
      }
    }
    // (3) "a soldier named X", "soldiers named Smith", "an enlisted man called X"
    if (/\b(?:soldier|private|man|fellow|boy|trooper|corporal|sergeant)s? (?:named|called|by the name of)\s+[A-Z]/.test(S.text)) return battle;
    return false;
  }

  // ---- a roster / names of many ----------------------------------------------------------------------------------------------------------------
  function roster(S) {
    const n = baseNorm(S.text);
    const noun = '(?:men|soldiers|privates|enlisted men|enlisted|members|volunteers|recruits|troops|individuals|people|dead|killed|wounded|casualties|prisoners|survivors|officers|fellows|boys)';
    const rx = [
      /\b(?:roster|rosters|muster rolls?|nominal rolls?|company rolls?|pension records?|service records?|regimental rolls?)\b/,
      new RegExp(`\\b(?:names?|list|lists|listing) of (?:all |the |every |each |those )?(?:the )?${noun}\\b`),
      /\bwho (?:were|are) (?:all |all of )?(?:the |those )?(?:men|soldiers|privates|enlisted men|enlisted|members|volunteers|recruits|troops|individuals|fellows|boys) (?:of|in|from|who|with|under|that|at)\b/,
      new RegExp(`\\b(?:list|name|give me|tell me|show me) (?:all |every |each )(?:of )?(?:the )?(?:single )?${noun.replace('(?:', '(?:').replace('people', 'people|man|soldier|private')}\\b`),
      /\b(?:every|each|all) (?:single )?(?:soldier|man|private|member)s?\b.*\b(?:names?|listed?|who)\b/,
      /\bcompany [a-k]\b.*\b(?:men|soldiers|members|roster|who|names?|officers|commander|captain)\b|\b(?:men|soldiers|members|roster|who|names?|captain)\b.*\bcompany [a-k]\b/,
      /\b(?:soldiers|men|privates) (?:named|called|surnamed) [a-z]+/,
      /\bhow many (?:soldiers|men|privates) (?:named|called|with the (?:name|surname))\b/,
    ];
    if (!rx.some((r) => r.test(n))) return false;
    // the request must be about the battle's people: a unit, a place, the battle, or nothing else in particular (a roster of "the men" asked of this site)
    if (/\b(?:roster|muster|nominal roll|company roll|pension|service record)/.test(n)) return true;
    const ctx = unitOf(S) || S.mentions.some((m) => m.kind !== 'unit-miss' && m.ids && m.ids.length) || /\b(gettysburg|battle|regiment|brigade|company|army|union|confederate)\b/.test(n);
    return !!ctx;
  }

  // ---- what someone thought or felt -----------------------------------------------------------------------------------------------------------
  function mental(S) {
    const toks = baseNorm(S.text).split(' ').filter(Boolean);
    const subj = personOf(S) || (unitOf(S) ? { rec: unitOf(S) } : null);
    if (!subj) return false;
    // a mental verb (or noun) in a question form: "what did Lee think", "how did Meade feel", "what was Longstreet's opinion", "did Pickett regret it"
    let v = -1;
    for (let i = 0; i < toks.length; i++) if (MENTAL_V.has(toks[i]) || MENTAL_N.has(toks[i])) { if (!covered(S, i, toks[i])) { v = i; break; } }
    if (v < 0) return false;
    if (!/^(?:what|how|why|did|does|do|was|were|is|are|would|could|can|tell|explain|describe)\b/.test(toks.join(' ')) && !/\b(?:what|how|did|does|was|were|would)\b/.test(toks.join(' '))) return false;
    // "what did Lee think ..." is about a mind; "the thought of ..." (noun, no subject) and "he thought the line would hold" (a quotation of the site's text) are not questions to the site
    if (MENTAL_V.has(toks[v]) && /^(?:thought|believe|believed|suspected|imagined)$/.test(toks[v]) && !/\b(?:what|how|did|does|do|would)\b/.test(toks.slice(0, v).join(' '))) return false;
    return true;
  }

  /** the known unknown a question is about, or null. S carries text, mentions (linked), intent. */
  function classify(S) {
    if (!S || S.intent === 'ancestor') return null;
    try {
      if (individual(S)) return { id: 'individual-soldier', unit: unitOf(S) };
      if (roster(S)) return { id: 'roster', unit: unitOf(S) };
      const w = weather(S); if (w) return { id: w };
      if (mental(S)) { const p = personOf(S); return { id: 'inner-thoughts', subject: p ? p.rec : unitOf(S) }; }
    } catch { return null; }
    return null;
  }
  return { classify, weather, individual, roster, mental };
}
