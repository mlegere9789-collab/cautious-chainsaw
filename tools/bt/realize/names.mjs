// The place names a timeline row prints, found in its words: the candidates for the gazetteer report (q.mjs gazetteer -> GOVERNANCE/realizations/gazetteer.json).
//
// Why this file exists. The first gazetteer report listed an unknown name only if it ended in a geographic word (Ridge, Hill, Road, Creek ...: gazetteer.mjs candidatePhrases). A town, a river crossing or a
// camp has no such word: Taneytown, Williamsport, Falling Waters, Hagerstown, Hanover, Westminster, Greenwood resolved to nothing and were not listed. A list of unknown places that misses the towns is not
// a list of the unknown places. Here every CAPITALISED NAME of the printed cells and of the claim fields of the corrected claim (and of the notes cells, where it has evidence) is looked at, and each name ends
// up in exactly one class:
//   resolved        the gazetteer carries it (a name the gazetteer carries is blanked out of the text before the others are looked at; a part of a name that it carries is reported as `contains_known_place`),
//   ambiguous       two entries claim it,
//   excluded        it is not the name of a place or a person (a month, a tier word, a state name or code, a unit word, a roman numeral),
//   person_or_unit  a commander or a unit of the order of battle, or a name introduced by a title (Col., Capt., Dr. ...), by initials or as a possessive before a unit noun (Rodes' brigade): with no structural
//                   evidence of being a place it is not listed as a place,
//   unknown         it has evidence of being a place (below) and the gazetteer does not carry it: LISTED, never given coordinates,
//   unclassified    a capitalised name with no evidence either way (or a bare surname that is a word of a known place: a person, or the farm named after them): LISTED too, so that nothing capitalised
//                   disappears; it is not claimed to be a place. (Names found only in the notes cells and without evidence are counted, not listed.)
// The evidence is stated with every unknown name (`evidence`) and has three tiers. STRUCTURAL: a geographic word at the end (Hill, Ridge, Road, Creek, Waters, Junction ...), a town ending (-town, -burg,
// -ville, -port, -boro), a state code after it (Hanover, PA), the structured place field of a corrected claim. CUE: "at", "near", "in", "into", "toward", "across", "through", "beyond", "via", "reaches"
// before it, or "north of" and the like. WEAK: "to" or "from" before it, the first printed cell (which is the place column of the table; not for the epilogue rows), a list with a name that has evidence.
// A name is classified once, over all its occurrences: the best evidence of any occurrence counts. Nothing here assigns a coordinate: that is the gazetteer's business, and it resolves only what a
// repository file carries.
import { wordKey, STATES } from './lib.mjs';
import { expand } from './gazetteer.mjs';

const AP = '’', FFFD = String.fromCharCode(0xfffd);
export const GEO_WORDS = new Set(['ridge', 'hill', 'hills', 'road', 'rd', 'pike', 'turnpike', 'run', 'creek', 'woods', 'wood', 'farm', 'field', 'house', 'tavern', 'knoll', 'top', 'den', 'orchard', 'cemetery', 'spring', 'springs', 'station', 'lane', 'church', 'barn', 'gap', 'bridge', 'mill', 'mills', 'ford', 'junction', 'camp', 'pass', 'heights', 'cuts', 'valley', 'grove', 'seminary', 'depot', 'square', 'embankment', 'gatehouse', 'furnace', 'street', 'st', 'river', 'mountain', 'mountains', 'works', 'crossroads', 'schoolhouse', 'waters', 'island', 'landing', 'ferry', 'forks', 'county']);
const isGeo = k => GEO_WORDS.has(k) || (k.endsWith('s') && GEO_WORDS.has(k.slice(0, -1))) || (k.endsWith('es') && GEO_WORDS.has(k.slice(0, -2)));
const TOWN_STRONG = /(town|burg|burgh|ville|port|boro|borough)$/, TOWN_WEAK = /(castle|haven|field|ton|ster|wood|dale)$/;
export const STATE_TAGS = new Set(['pa', 'md', 'va', 'wv', 'dc', 'nj', 'ny', 'oh', 'ct', 'me', 'ma', 'nh', 'vt', 'ri', 'de', 'nc', 'sc', 'ga', 'al', 'ms', 'la', 'tx', 'ar', 'tn', 'mi', 'wi', 'in', 'il', 'mn', 'fl', 'penn', 'mass', 'mich', 'wis', 'miss', 'tenn', 'ala', 'fla', 'ind', 'ill']);
const NOT_A_NAME = new Set(['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec', 'january', 'february', 'march', 'april', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'night', 'dusk', 'dawn', 'twilight', 'documented', 'inferred', 'plausible', 'procedural', 'open', 'gap', 'union', 'confederate', 'confederates', 'federal', 'federals', 'rebel', 'rebels', 'yankee', 'us', 'cs', 'usa', 'csa', 'usss', 'anv', 'aop', 'hq', 'lmt', 'sun', 'moon',
  'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii', 'xiii', 'xiv', 'corps', 'division', 'brigade', 'army', 'battery', 'regiment', 'battalion', 'company', 'cavalry', 'infantry', 'artillery', 'ordnance',
  'the', 'a', 'an', 'in', 'on', 'at', 'of', 'to', 'and', 'or', 'by', 'from', 'with', 'for', 'sky', 'environment', 'region', 'source', 'scenarios', 'default', 'note', 'notes', 'wikipedia', 'nps',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'twentieth']);
const TITLE_WORD = /^(?:col|colonel|lt|lieut|lieutenant|maj|major|capt|captain|gen|general|brig|mg|bg|ltg|sgt|sergeant|cpl|corporal|pvt|private|pvts|dr|rev|prof|gov|surg|asst|president|mrs|mr|hon|judge|sen|senator)$/i;
const CUE_STRONG = new Set(['at', 'near', 'in', 'into', 'toward', 'towards', 'across', 'through', 'beyond', 'via', 'past', 'around', 'outside', 'along', 'reaches', 'reach', 'reaching', 'enters', 'entering', 'occupies', 'occupy', 'occupied', 'bivouacs', 'bivouac', 'bivouacked', 'camps', 'camped', 'within']);
const DIRECTION = /^(?:north|south|east|west|northeast|northwest|southeast|southwest|front|rear|base|edge|side|top|foot|left|right|outskirts|vicinity)$/;
const LEAD_DROP = new Set(['the', 'a', 'an', 'at', 'in', 'on', 'near', 'to', 'from', 'by', 'with', 'of']);
const TIER = { structural: 3, cue: 2, weak: 1 };
const PREFIX_WORDS = new Set(['great', 'big', 'little', 'lower', 'upper', 'east', 'west', 'north', 'south', 'old', 'new', 'mount', 'fort', 'camp', 'round', 'high', 'long']);
const stripPoss = s => s.replace(/(?:[’']s|[’'])$/i, '');

// the capitalised words of a segment as runs: a run is broken by any lower-case word (except of/de/du/la/van/von between two capitalised words), by a number and by punctuation. A source code (W-GC,
// ABT-Early, CAV-Hanover) is not a name. Each run carries the lower-case words before it (the cues) and what follows it.
export function runsOf(text) {
  // a source code (W-GC, ABT-Early, CAV-Hanover: capitals, a hyphen, more) is not a name; any other hyphen separates two words (Chambersburg-Gettysburg turnpike)
  const t = String(text ?? '').split(FFFD).join(AP).replace(/(?<![\p{L}])[A-Z]{1,6}(?:-[A-Za-z0-9]+)+/gu, ' ; '), toks = [], re = /(\p{L}[\p{L}’'.]*)|(\d[\w:.,%]*)|([,;:()/[\]"“”-])/gu; let m;
  while ((m = re.exec(t))) {
    if (m[1]) { const raw = m[1].replace(/\.+$/, ''); toks.push({ t: 'w', raw, abbr: /\.$/.test(m[1]), cap: /^\p{Lu}/u.test(raw), allcaps: raw.length > 1 && raw === raw.toUpperCase() && /\p{L}/u.test(raw), code: false }); }
    else if (m[2]) toks.push({ t: 'n', raw: m[2] }); else toks.push({ t: 'p', raw: m[3] });
  }
  const runs = []; let cur = null; const close = () => { if (cur && cur.words.length) runs.push(cur); cur = null; };
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i];
    if (k.t === 'w' && k.cap && !k.code) { if (!cur) cur = { words: [], first: i }; cur.words.push({ raw: k.raw, abbr: k.abbr, allcaps: k.allcaps }); cur.last = i; continue; }
    if (k.t === 'w' && !k.cap && cur && /^(of|de|du|la|van|von)$/.test(k.raw) && toks[i + 1] && toks[i + 1].t === 'w' && toks[i + 1].cap) { cur.words.push({ raw: k.raw, joiner: true }); continue; }
    close();
  }
  close();
  for (const r of runs) {
    const before = []; for (let j = r.first - 1; j >= 0 && before.length < 3; j--) { const q = toks[j]; if (q.t === 'w' && !q.cap) before.unshift(q.raw.toLowerCase()); else if (q.t === 'p' && /[,;:()/]/.test(q.raw) && !before.length) { before.unshift(q.raw); break; } else break; }
    r.prev = before; const nx = toks[r.last + 1], nx2 = toks[r.last + 2];
    r.state_after = !!(nx && nx.t === 'p' && nx.raw === ',' && nx2 && nx2.t === 'w' && STATE_TAGS.has(nx2.raw.toLowerCase())); r.state_inline = !!(nx && nx.t === 'w' && nx.cap && nx.raw.length <= 4 && STATE_TAGS.has(nx.raw.toLowerCase()));
    r.text = r.words.map(w => w.raw).join(' '); r.atStart = r.first === 0; r.atEnd = r.last === toks.length - 1;
  }
  return runs;
}

// the name a run stands for: the words at its ends that are ordinary words of the timeline (Marches, Arrives, The ...: lower case somewhere) or never part of a name are dropped. A run that ends in a
// geographic word and has no "of" in it keeps its ordinary words (Falling Waters, Round Top, Peach Orchard) apart from a leading article or preposition.
function nameOf(words, lex) {
  const key = w => wordKey(stripPoss(w.raw)), ordinary = w => { const k = key(w); return !!k && !w.joiner && lex.lower.has(k) && !isGeo(k); }, never = w => !w.joiner && NOT_A_NAME.has(key(w));
  const bad = w => ordinary(w) || never(w) || (w.allcaps && w.raw.length <= 5 && !isGeo(key(w))) || /^\p{Lu}$/u.test(w.raw);
  const lastGeo = words.length > 1 && isGeo(key(words[words.length - 1])) && !words.some(w => w.joiner) && words.length <= 4;
  let a = 0, b = words.length;
  if (lastGeo) { while (a < b - 1 && (LEAD_DROP.has(key(words[a])) || never(words[a]))) a++; return words.slice(a, b); }
  while (a < b && (bad(words[a]) || words[a].joiner)) a++; while (b > a && (bad(words[b - 1]) || words[b - 1].joiner)) b--;
  return words.slice(a, b);
}

// the evidence that a run is a place, from its words and from its place in the segment. -> [{ kind, tier }]
const INITIALS = /^\p{Lu}(?:\.\p{Lu})*$/u;
function evidenceOf(run, words, seg, lex, personHard = false) {
  const ev = [], key = w => wordKey(stripPoss(w.raw)), last = key(words[words.length - 1]), lastRaw = words[words.length - 1].raw;
  if (isGeo(last) && words.length > 1 && !personHard) ev.push({ kind: `geographic word "${lastRaw}"`, tier: 'structural' });
  if (words.length === 1 && last.length >= 7 && TOWN_STRONG.test(last)) ev.push({ kind: `town ending "-${TOWN_STRONG.exec(last)[1]}"`, tier: 'structural' });
  else if (words.length === 1 && last.length >= 7 && TOWN_WEAK.test(last) && !lex.person.has(last)) ev.push({ kind: `town ending "-${TOWN_WEAK.exec(last)[1]}"`, tier: 'cue' });
  if ((run.state_after || run.state_inline) && !words.some(w => lex.person.has(key(w)))) ev.push({ kind: 'followed by a state code', tier: 'structural' });      // "Hanover, PA"; not for a commander's name (Daniel, NC: the brigade's state)
  if (seg.kind === 'correction.place') ev.push({ kind: 'in the place field of the corrected claim', tier: 'cue' });
  const prev = run.prev.filter(x => !/^[,;:()/]$/.test(x)), p1 = prev[prev.length - 1], p2 = prev[prev.length - 2];
  if (p1 === 'the' && p2 && CUE_STRONG.has(p2)) ev.push({ kind: `after "${p2} the"`, tier: 'cue' });
  else if (p1 === 'of' && p2 && DIRECTION.test(p2)) ev.push({ kind: `after "${p2} of"`, tier: 'cue' });
  else if (p1 && CUE_STRONG.has(p1)) ev.push({ kind: `after "${p1}"`, tier: 'cue' });
  else if (p1 === 'to' || p1 === 'from') ev.push({ kind: `after "${p1}"`, tier: 'weak' });
  if (seg.place_cell) ev.push({ kind: 'in the first printed cell (the place column)', tier: 'weak' });
  return ev;
}

// the segments of a row that are searched: the printed cells (the first, or the first two when the first ends in a connector, are the place column), the claim fields of the corrected claim, the notes cells
export function segmentsOf(row) {
  const segs = [], what = row.what || [], epilogue = row.shard === 'epilogue';
  let placeCells = epilogue || !what.length ? 0 : 1; if (placeCells && what.length > 1 && /(?:\bto|\band|\bor|\bat|\bnear|\bof|\bfrom|[/,-])\s*$/.test(what[0].trim())) placeCells = 2;
  what.forEach((c, i) => segs.push({ kind: 'cell', where: 'claim', text: c, place_cell: i < placeCells }));
  const f = row.correction && row.correction.fields;
  if (f) for (const [k, v] of Object.entries(f)) segs.push({ kind: k === 'place' ? 'correction.place' : 'correction.' + k, where: 'claim', text: v, place_cell: false });
  (row.after || []).forEach(c => segs.push({ kind: 'note', where: 'notes', text: c, place_cell: false }));
  return segs;
}

// every capitalised name of a row: [{ row, name, where, seg, evidence: [{kind, tier}], person }]. places: the gazetteer (blank(text) takes the names it carries out of the text first, except a known
// place followed by a geographic word: "Cashtown Pike" is one name). A name that the table wrapped over two cells ("Bunker" | "Hill") is joined when the second cell starts with a geographic word.
export function occurrencesOf(row, lex, places) {
  const out = [], key = w => wordKey(stripPoss(w.raw)), segs = segmentsOf(row).map(seg => {
    const text = places.blank(seg.text, ' ; ', { keepGeo: true }), runs = runsOf(text);
    return { seg, text, cand: runs.map(r => { const w = nameOf(r.words, lex); return w.length ? { r, w, drop: false } : null; }) };
  });
  // wrapped names: the last name of a cell that reaches the end of the cell + a first run of the next cell that is one geographic word
  for (let i = 0; i + 1 < segs.length; i++) {
    const A = segs[i], B = segs[i + 1]; if (A.seg.kind !== B.seg.kind || !['cell', 'note'].includes(A.seg.kind)) continue;
    const la = [...A.cand].reverse().find(c => c); const fbRun = runsOf(B.text)[0], fb0 = runsOf(places.blank(B.seg.text, ' ; ', { keepGeo: true }))[0];
    if (la && la.r.atEnd && fbRun && fbRun.atStart && fbRun.words.length === 1 && isGeo(key(fbRun.words[0]))) {              // "Bunker" | "Hill"
      la.w = [...la.w, fbRun.words[0]]; la.wrapped = true; const fb = B.cand.find(c => c && c.r.first === fbRun.first && c.r.words.length === 1); if (fb) fb.drop = true; continue;
    }
    // "Great" | "Round Top" (a descriptive first word, then the next cell starts with a name the gazetteer carries): the name is the two together, and it is not the gazetteer's
    const fbNow = B.seg.text.match(/^\s*(\p{Lu}[\p{L}\u2019'.]*(?:\s+\p{Lu}[\p{L}\u2019'.]*){0,3})/u);
    if (la && la.r.atEnd && la.w.length === 1 && PREFIX_WORDS.has(key(la.w[0])) && fbNow && !fb0 && places.findIn(fbNow[1]).length) { const known = places.findIn(fbNow[1])[0]; la.w = [...la.w, ...fbNow[1].split(/\s+/).slice(0, known.key.split(' ').length).map(raw => ({ raw }))]; la.wrapped = true; }
  }
  for (const { seg, text, cand } of segs) {
    cand.forEach((x, idx) => {
      if (!x || x.drop) return; const { r, w } = x, name = stripPoss(w.map(q => q.raw).join(' ')), keys = w.map(key).filter(Boolean); if (!keys.length) return;
      const i0 = seg.text.indexOf(w[0].raw), before = i0 > 0 ? seg.text.slice(Math.max(0, i0 - 24), i0) : '';
      const hard = w.some(q => TITLE_WORD.test(q.raw) || INITIALS.test(q.raw)) || /(?:\b(?:Col|Lt|Maj|Capt|Gen|Brig|Sgt|Cpl|Pvt|Pvts|Dr|Rev|Prof|Gov|Surg|Asst)\.?|(?:\b\p{Lu}\.\s*){1,3})\s*$/u.test(before);
      const ev = evidenceOf(r, w, seg, lex, hard);
      if (!ev.length) for (const nb of [cand[idx - 1], cand[idx + 1]]) {     // a list: names joined by , / and or to with a name that has evidence of its own
        if (!nb || nb.drop) continue; const e2 = evidenceOf(nb.r, nb.w, seg, lex).filter(e => e.tier !== 'weak' || !/first printed cell/.test(e.kind)); if (!e2.length) continue;
        const a = nb === cand[idx - 1] ? nb.r : r, b = nb === cand[idx - 1] ? r : nb.r, j0 = text.indexOf(a.text), j1 = text.indexOf(b.text, Math.max(0, j0) + a.text.length), gap = j0 >= 0 && j1 >= 0 ? text.slice(j0 + a.text.length, j1) : '?';
        if (/^\s*(?:,|\/|and|or|to|,\s*and|,\s*or)?\s*$/i.test(gap)) ev.push({ kind: `listed with ${nb.w.map(q => q.raw).join(' ')}`, tier: 'weak' });
      }
      if (x.wrapped) ev.push({ kind: `geographic word "${w[w.length - 1].raw}" (the name is wrapped over two printed cells)`, tier: 'structural' });
      const person = hard || keys.some(k => lex.person.has(k));
      out.push({ row: row.id, name, keys, where: seg.where, seg: seg.kind, evidence: ev, person });
    });
  }
  return out;
}

// one class per name, over all its occurrences. -> { names: [{ name, class, evidence: [kinds], tier, rows, rows_in_claim, rows_in_notes_only, contains_known_place }], counts }
export function classifyNames(occurrences, lex, places) {
  const by = new Map();
  for (const o of occurrences) {
    let e = by.get(o.name); if (!e) by.set(o.name, e = { name: o.name, keys: o.keys, rows: new Set(), claim: new Set(), notes: new Set(), kinds: new Map(), tier: 0, person: false });
    e.rows.add(o.row); (o.where === 'claim' ? e.claim : e.notes).add(o.row); e.person ||= o.person;
    for (const x of o.evidence) { e.kinds.set(x.kind, Math.max(e.kinds.get(x.kind) || 0, TIER[x.tier])); e.tier = Math.max(e.tier, TIER[x.tier]); }
  }
  const names = [], counts = { resolved: 0, ambiguous: 0, excluded: 0, person_or_unit: 0, unknown: 0, unclassified: 0, notes_without_evidence: 0 };
  const sortRows = s => [...s].sort();
  for (const e of by.values()) {
    const res = places.resolve(expand(e.name)).status !== 'unknown' ? places.resolve(expand(e.name)) : places.resolve(e.name); let cls;
    const part = (() => { const hits = places.findIn(e.name); return hits.length ? [...new Set(hits.map(h => h.place.name))].join(', ') : null; })();
    if (res.status === 'resolved') cls = 'resolved'; else if (res.status === 'ambiguous') cls = 'ambiguous';
    else if (e.keys.length === 1 && (NOT_A_NAME.has(e.keys[0]) || isGeo(e.keys[0]) || e.keys[0].length < 3 || STATES[e.keys[0]])) cls = 'excluded';
    else if (e.tier < TIER.structural && e.person) cls = 'person_or_unit';
    else if (!e.claim.size && e.tier < TIER.cue) cls = 'notes_without_evidence';
    else if (e.tier >= TIER.cue && !(e.keys.length === 1 && lex.placeWords.has(e.keys[0]) && e.tier < TIER.structural)) cls = 'unknown';
    else cls = 'unclassified';
    counts[cls] = (counts[cls] || 0) + 1;
    if (cls === 'unknown' || cls === 'unclassified') names.push({ name: e.name, class: cls, evidence: [...e.kinds].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k]) => k), strength: e.tier >= TIER.structural ? 'structural' : e.tier >= TIER.cue ? 'cue' : e.tier >= TIER.weak ? 'weak' : 'none', rows: sortRows(e.rows), rows_in_claim: sortRows(e.claim), rows_in_notes_only: sortRows([...e.notes].filter(r => !e.claim.has(r))), contains_known_place: part, bare_surname_of_a_known_place: cls === 'unclassified' && e.keys.length === 1 && lex.placeWords.has(e.keys[0]) ? true : undefined });
  }
  names.sort((a, b) => b.rows.length - a.rows.length || (a.name < b.name ? -1 : 1));
  return { names, counts };
}

// the lexicon of a product and a timeline: ordinary words (lower case somewhere in the printed rows), the words of persons and units (the order of battle; names the printed rows introduce with a title, with
// initials or as a possessive before a unit noun), and the words of the gazetteer's own names
export function buildLexicon(P, rows) {
  const lower = P.lowerVocab(), person = new Set(), placeWords = new Set();
  for (const x of P._unitIndex().values()) { for (const t of x.tokens) person.add(t); for (const c of x.commanders) person.add(c.key); for (const k of Object.keys(x.inits)) person.add(k); }
  // the words of the names of places named after a person or a feature (not the roads, lanes, railways, streams, bridges and towns: they are named for where they go, and the town Fairfield is not "a word of Fairfield Road")
  for (const p of P.places.list) { if (['line', 'lane', 'railway', 'stream', 'bridge', 'town'].includes(p.kind)) continue; for (const n of [p.name, ...p.aliases]) for (const w of String(n).split(/[(,;]/)[0].split(/[\s/]+/)) { const k = wordKey(w); if (k.length > 2) placeWords.add(k); } }
  const UN = '(?:division|brigade|corps|battalion|battery|command|cavalry|infantry|artillery|regiment|men|troops|staff|hq|headquarters|bde|div|brigades|divisions)';
  const rx1 = /\b(?:Col|Lt|Maj|Capt|Gen|Brig|Sgt|Cpl|Pvt|Pvts|Dr|Rev|Prof|Gov|Surg|Asst)\.?\s+((?:\p{Lu}[\p{L}’']*\.?\s*){1,4})/gu, rx2 = /(?<![\p{L}])((?:\p{Lu}\.\s*){1,3}\p{Lu}[\p{L}’']+)/gu, rx3 = new RegExp(`\\b(\\p{Lu}[\\p{L}]+)[\\u2019']s?\\s+${UN}\\b`, 'giu');
  for (const r of rows) {
    const t = String(r.text_raw || '').replace(/ \| /g, ' ').split(FFFD).join(AP);
    for (const rx of [rx1, rx2, rx3]) { rx.lastIndex = 0; let m; while ((m = rx.exec(t))) for (const w of String(m[1]).split(/\s+/)) { const k = wordKey(w); if (k.length > 2 && !lower.has(k)) person.add(k); } }
  }
  return { lower, person, placeWords };
}
