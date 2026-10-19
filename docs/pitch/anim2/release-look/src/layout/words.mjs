// layout/words.mjs - THE WORDS THE MAP USES: one naming policy for every mark (round 2).  Pure functions of the unit records, no DOM.
//
// Policy, in four lines:
//   1. A corps is "1st Corps", never "I Corps" or "I" (ordinals everywhere; round 1 mixed "I Corps" and "1st Corps" in one view).
//   2. A formation is named by the order of battle's own words ("Garnett's Bde", "2nd Div, 1st Corps"); a formation record that has NO name in the data is named from its id's own numbers
//      ("7th Bde, 1st Div, 1st Corps": the id C-I-1-7 says exactly that and nothing more), never by the raw id ("I/1/7").
//   3. A crowd says what it stands for in one pattern, "of <what they share>", never the same string as the formation's own standard ("of Garnett's Bde" against "Garnett's Bde").
//   4. A code (a regiment or battery) is the data's short code, repaired from the unit's own id where the data cut it, and never a raw id: no slashes, no trailing "/".
export const ORD = { First: '1st', Second: '2nd', Third: '3rd', Fourth: '4th', Fifth: '5th', Sixth: '6th', Seventh: '7th', Eighth: '8th', Ninth: '9th', Tenth: '10th', Eleventh: '11th', Twelfth: '12th' };
export const ROMAN = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
export const ordinal = (n) => { const m = n % 100; if (m >= 11 && m <= 13) return n + 'th'; return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th'); };
/** "I" -> "1st Corps" */
export const corpsWords = (roman) => (ROMAN[roman] ? ordinal(ROMAN[roman]) + ' Corps' : roman === 'CAV' ? 'Cavalry Corps' : roman + ' Corps');
const bdeWords = (b) => (b === 'R' ? 'Reserve Bde' : /^\d+$/.test(b) ? ordinal(+b) + ' Bde' : b + ' Bde');

/** a designation as the map says it: the trailing parenthesis dropped (the card carries it), ordinals as numerals, Brigade / Division as Bde / Div, "Volunteer " dropped, "Corps" never "Cor…" */
export function compactDesignation(full) {
  return full.replace(/\s*\([^)]*\)\s*$/, '').replace(/\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth)\b/g, (m) => ORD[m]).replace(/\bBrigade\b/g, 'Bde').replace(/\bDivision\b/g, 'Div').replace(/\bVolunteer /g, '');
}

/** the words a formation record's own id carries, for a record the order of battle gives no name: "C-I-1-7" -> "7th Bde, 1st Div, 1st Corps", "U-CAV-2-1" -> "1st Bde, 2nd Div, Cavalry Corps", "C-II-4" -> "4th Div, 2nd Corps", "U-2-I" -> "2nd Div, 1st Corps"; null when the id is no formation id */
export function wordsOfFormationId(id) {
  const s = String(id || '').replace(/^[UC]-/, ''); let m;
  // FORK (director fix 9): the Confederate cavalry records C-CAV-2-1 .. C-CAV-2-4 are no order-of-battle brigades (the data gives them no name and inOob false); the Union's "1st Bde, 2nd Div, Cavalry Corps" is not their organisation,
  // so they are not called by it (it also printed the same words as the Union's own brigade).  The words are the id's own numbers and claim nothing more.
  if ((m = /^C-CAV-(\d)-(\d)$/.exec(String(id || '')))) return `Cavalry group ${m[1]}/${m[2]}`;
  if ((m = /^(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I|CAV)-(\d)-(\d|R)$/.exec(s))) return `${bdeWords(m[3])}, ${ordinal(+m[2])} Div, ${corpsWords(m[1])}`;
  if ((m = /^(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I|CAV)-(\d)$/.exec(s))) return `${ordinal(+m[2])} Div, ${corpsWords(m[1])}`;
  if ((m = /^(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/.exec(s))) return corpsWords(m[1]);
  if ((m = /^(\d)-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-(\d)$/.exec(s))) return `${bdeWords(m[3])}, ${ordinal(+m[1])} Div, ${corpsWords(m[2])}`;
  if ((m = /^(\d)-(XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)$/.exec(s))) return `${ordinal(+m[1])} Div, ${corpsWords(m[2])}`;
  return null;
}

// The few records whose id is not a unit code at all (found by reading all 478 ids): the words are the id's own letters, set apart; no history is added.
const ODD_CODES = { 'C-4AL-Law': '4 AL', 'C-Cobb-INF': 'Cobb Inf', 'C-Phillips-INF': 'Phillips Inf', 'C-GLA-SHB': 'GLA SHB', 'C-Law-bde': 'Law Bde', 'C-ART-Pegram-III': 'Pegram III', 'C-ART-Pegram-bn': 'Pegram guns', 'U-ART-RES': 'Art Res', 'U-CAV-2-G': 'Cav G', 'U-CAV-2-M': 'Cav M', 'U-ART-1PA-L': 'L/1 PA', 'C-ART-I-1': 'Cabell Bn', 'C-ART-I-2': 'Dearing Bn', 'C-ART-I-4': 'Eshleman Bn', 'C-ART-III-2': 'McIntosh Bn', 'C-ART-III-3': 'Pegram Bn' };
const STATE_OF = { W: 'WI' };               // an id like U-I-1-2W: the 2nd Wisconsin of the First Corps' First Division (W is the id's own abbreviation)
/** the code of a unit as the map sets it (never a raw id): the data's short code, repaired from the unit's own id where the data cut it ("Zimmerma" -> "Zimmerman"), words for the ids that are no code */
export function codeOf(u) {
  if (!u) return ''; const id = String(u.id || ''); const s = u.short || '';
  if (ODD_CODES[id]) return ODD_CODES[id];
  let m;
  if (/^U-(ART|HAB)-/.test(id)) {          // a Union battery's id is its letter, its regiment and its state run together ("A1RI", "9MA", "EPA"): the same words, set apart
    if ((m = /^([A-Z])(\d+)([A-Z]{2,3})$/.exec(s))) return `${m[1]}/${m[2]} ${m[3]}`;      // Battery A, 1st Rhode Island: "A/1 RI"
    if ((m = /^(\d+)([A-Z]{2})IND$/.exec(s))) return `${m[1]} ${m[2]} Ind`;                    // 1st New York Independent Battery: "1 NY Ind"
    if ((m = /^(\d+)([A-Z]{2})$/.exec(s))) return `${m[1]} ${m[2]} Bty`;                      // 9th Massachusetts Battery: "9 MA Bty"
    if ((m = /^([A-Z])([A-Z]{2})$/.exec(s))) return `${m[1]}/${m[2]}`;                         // Battery E, Pennsylvania: "E/PA"
    if ((m = /^([A-Z])(\d+)([A-Z]{2})-([IVX]+)$/.exec(s))) return `${m[1]}/${m[2]} ${m[3]}`;   // Battery F, 4th US, Twelfth Corps: "F/4 US"
  }
  if ((m = /^[UC]-(?:XII|XI|X|IX|VIII|VII|VI|IV|V|III|II|I)-\d-(\d+)([A-Z]{1,2})$/.exec(id))) return `${m[1]} ${STATE_OF[m[2]] || m[2]}`;       // U-I-1-19IN -> "19 IN", U-I-1-2W -> "2 WI"
  if (s.length < 7) return s.replace(/\/$/, '');
  const last = id.split('-').pop(); return last.length > s.length && last.startsWith(s) ? last : s.replace(/\/$/, '');
}

/** the order of battle's own words for a unit, compacted for the map: a record's label is cut at 24 characters with an ellipsis in the data (122 of 478), so the designation is used; a formation record with no name takes the words of its id;
 *  null when the unit has no name beyond its code */
export function compactName(u, isFormation) {
  if (!u) return null; const label = u.label || '';
  const asFormation = isFormation && u.kind !== 'battalion';      // an artillery battalion is a unit with a name of its own (its record's label can be its parent's: "Heth's Division" for McIntosh's Battalion)
  const full = label.includes('…') && u.designation ? u.designation : (asFormation ? label : (u.designation || label));
  let name = compactDesignation(full);
  // a formation whose label is a nickname or the name of whoever was in command ("Fry commanding", "Louisiana Tigers") is named by its order-of-battle designation ("Archer's Bde", "Hays's Bde"): one commander's name, never "commanding" on the map
  if (asFormation && u.designation && !/'s /.test(name || '')) { const base = compactDesignation(u.designation); if (/'s (Bde|Div)/.test(base)) name = base; }
  if (isFormation && (!name || name === u.short || /^[A-Z0-9/\-]+$/.test(name))) name = wordsOfFormationId(u.id) || name;
  return name && name !== u.short && name !== codeOf(u) ? name : null;
}

/** the words of a formation node of the order of battle (a record's own name, else the words of its id) */
export function formationWordsOf(all, id) {
  const u = all.units.get(id);
  if (u) return compactName(u, true) || wordsOfFormationId(id) || compactDesignation(u.label || u.short);
  const nd = all.nodes && all.nodes.get ? all.nodes.get(id) : null;      // a node that is no unit (an artillery battalion or an artillery brigade): the order of battle's own designation, never the raw id
  if (nd && nd.designation) { const d = compactDesignation(nd.designation); const m = /^(\d+(?:st|nd|rd|th)) Corps Artillery Bde$/.exec(d); return m ? `${m[1]} Corps artillery` : d; }
  return wordsOfFormationId(id) || String(id);
}

/** the noun for a set of units that share nothing but a side: by arm (Documented for regiments and batteries) */
export function armNoun(arms, n) {
  const a = new Set(arms); if (a.size !== 1) return n === 1 ? 'unit' : 'units';
  const k = [...a][0]; return k === 'artillery' ? 'artillery' : k === 'cavalry' ? 'cavalry' : n === 1 ? 'regiment' : 'regiments';
}
