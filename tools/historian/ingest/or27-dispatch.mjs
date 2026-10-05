// or27-dispatch.mjs - Official Records, Series I, vol. 27, PART 3 (correspondence, orders and returns, June 3 - August 3, 1863, and the volume's addenda): the dispatch segmenter.
//
// Part 3 has no "No. N. / Report of ..." headers: its items are dispatches. Each is a message with its own dateline, an addressee and a signature, as printed:
//     Headquarters Third Corps,                   Headquarters Army of the Potomac,            Baltimore, Md., June 15, 1863-12 m. General Tyler, Harper's Ferry:
//     Emmitsburg, July 1, 1863 - 3.15 p. m.       Camp near Falmouth, Va., June 3, 1863.       ...
//     Major-General Howard,                       June 3, 1863 - 10 p. m.                       DONN PIATT, Chief of Staff.
// The first build cut at every short line that was a date and nothing else, and read the sender from the last all-capitals line of the cut. Read against 100 documents by hand (tests/historian/fixtures/
// or27-dispatch-sample.json), that failed in four ways, each a class: (1) a dateline with the addressee on the same line ("Poolesville, June 24, 1863. General S. Williams, Assistant Adjutant-General :")
// or a clock split by the OCR ("8.30 p." / "m.") was not read, so two or three dispatches stayed in one document that carried the last signature (10 of 100 documents, 12 of 112 dispatches);
// (2) the place line printed above a Union dateline ("Baltimore, Md.," / "June 7, 1863.") was left at the end of the PREVIOUS dispatch (15 of 100); (3) a date inside a sentence
// ("ordered for to-morrow, July 11, 1863") began a dispatch; (4) the signature was read only when it stood alone in capitals ("EDWIN M; STANTON.", "H. W. SLOCUM, Major-General of Volunteers." were missed).
// What this does instead, in order:
//   1  every line is read by a grammar of the 1863 headings: dateline (place, date, clock, "(Received ...)", an addressee on the same line), tag ("[Inclosure.]", "Order.]"), institution ("Headquarters
//      Army of the Potomac,"), order heading, place line (a place that the volume itself prints in a dateline), signature (NAME, title lines), closing ("Respectfully,"), addressee, body
//   2  a dateline starts a dispatch only where a paragraph starts (a date at the head of a continuation line is a sentence)
//   3  a dispatch begins at the first of the header lines above its dateline, and the lines between the last SIGNATURE of the previous dispatch and this dateline belong to this one (the place line, the
//      addressee the OCR set above the date), never to the dispatch that precedes
//   4  a dispatch with no dateline of its own that follows a signature and opens with an addressee line is cut off at the signature
//   5  the sender is the signature BEFORE the first indorsement marker; the closing of a covering note that follows the dispatches it forwards ("Respectfully, JUL. STAHEL, Major-General." under two
//      forwarded dispatches) is the covering note's, moved there and not left under the last forwarded dispatch
// Nothing here guesses a sender or an addressee: a field the text does not give is null.
import { parseClock } from './times.mjs';
import { dl } from '../../../historian-src/core/text.js';

// ---- dates -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
const FULL = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const ABBR = { jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** the month a word names, in the OCR's spellings ("Jidy", "Jnly", "Julv", "J uly", "Sept."): 1..12 or null */
export function monthOf(word) {
  const t = String(word || '').replace(/[\s.]/g, '').toLowerCase();
  if (t.length < 3) return null;
  if (FULL[t]) return FULL[t];
  if (t === 'may') return 5;
  if (t.length <= 4 && ABBR[t.slice(0, 3)] && (t.length === 3 || t === 'sept')) return ABBR[t.slice(0, 3)];
  if (/^j[a-z]{2}y$/.test(t)) return 7;                                                                 // Jidy, Jnly, Joly, Juty
  if (/^j[a-z]{2}e$/.test(t) && t !== 'jane') return 6;
  if (t[0] === 'j' && t.length >= 4 && t.length <= 6) { const d6 = dl(t, 'june', 2), d7 = dl(t, 'july', 2); if (d6 <= 2 && d6 < d7) return 6; if (d7 <= 2 && d7 < d6) return 7; }   // "Jfine"
  let best = null;
  for (const [name, m] of Object.entries(FULL)) {
    if (name.length >= 5 && t.length >= 5 && dl(t, name, name.length >= 7 ? 2 : 1) <= (name.length >= 7 ? 2 : 1)) { if (best && best !== m) return null; best = m; }
    else if (name.length === 4 && dl(t, name, 1) <= 1 && name !== 'june' && name !== 'july') best = best || m;
    else if ((name === 'june' || name === 'july') && dl(t, name, 1) <= 1) { if (best && best !== m) return null; best = m; }
  }
  return best;
}
const YEAR_PAT = String.raw`([1Il]\s?[83S]\s?-?\s?[0-9GOSlI]\s?[0-9lIOS])(?![0-9])`;                                // 1863 as the OCR prints it: "I860", "1S63", "1 863", "18-63", "1363"
const DATE_RE = new RegExp(String.raw`(?<![A-Za-z])((?:J\s)?[A-Za-z]{3,9})\.?[\s,]*['’‘]?([0-9lI]\s?[0-9lIOS]?)(?:st|d|nd|rd|th)?\s*(?:\[[^\]]{0,6}\])?\s*[,.;:?/\-»«'’‘"*]{0,4}(?:[a-z](?=\s?[1Il]\s?[83S]))?\s*(?:\[[^\]]{0,6}\]\s*)?` + YEAR_PAT, 'g');
const DATE_NODAY_RE = new RegExp(String.raw`(?<![A-Za-z])((?:J\s)?[A-Za-z]{3,9})\.?[\s,]*[%&*?]{1,2}\s*[,.;:/\-]{0,3}\s*` + YEAR_PAT, 'g');                    // "July % 1863": the day the OCR could not read
const yearOf = (tok) => { let c = tok.replace(/[\s-]/g, '').replace(/[Il]/g, '1').replace(/O/g, '0').replace(/G/g, '6'); c = c[1] === 'S' ? c[0] + '8' + c.slice(2) : c; c = c.replace(/S/g, '5'); if (/^136\d$/.test(c)) c = '18' + c.slice(2); return /^18\d\d$/.test(c) ? +c : null; };
/** the first date in a text: { month, day, year, index, end } (year as read; an OCR slip in the last digit keeps its reading, see repairYears) or null */
export function findDate(t) {
  DATE_RE.lastIndex = 0; let m;
  while ((m = DATE_RE.exec(t))) {
    let word = m[1], dayTxt = m[2].replace(/\s/g, '').replace(/[lI]/g, '1').replace(/O/g, '0').replace(/S/g, '8');
    let mon = monthOf(word);
    if (!mon && /[lI]$/.test(word) && monthOf(word.slice(0, -1))) { mon = monthOf(word.slice(0, -1)); dayTxt = '1' + dayTxt; }          // "Julyl 0, 1863": July 10
    const day = +dayTxt, year = yearOf(m[3]);
    if (!mon || !(day >= 1 && day <= 31) || !year) continue;
    return { month: mon, day, year, index: m.index, end: m.index + m[0].length };
  }
  DATE_NODAY_RE.lastIndex = 0;
  while ((m = DATE_NODAY_RE.exec(t))) {
    const mon = monthOf(m[1]), year = yearOf(m[2]); if (!mon || !year) continue;
    return { month: mon, day: null, year, index: m.index, end: m.index + m[0].length };
  }
  return null;
}

// ---- line classes ---------------------------------------------------------------------------------------------------------------------------------------------------------------
const CONNECT = new Set(['near', 'of', 'the', 'at', 'on', 'in', 'via', 'and', 'de', 'to', 'from', 'above', 'below', 'opposite', 'off', 'about', 'beyond']);
const PLACE_LOWER = new Set(['front', 'rear', 'house', 'side', 'bank', 'camp', 'left', 'right', 'miles', 'mile', 'north', 'south', 'east', 'west', 'with', 'old']);       // lower-case words inside a place line ("In front of Pitzer's house")
const PLACE_TAIL = new Set(['town', 'ville', 'burg', 'burgh', 'port', 'ford', 'field', 'boro', 'borough', 'city', 'mills', 'mill', 'springs', 'spring', 'run', 'hill', 'hills', 'heights', 'station', 'junction', 'house', 'landing', 'bridge', 'gap', 'pass', 'creek', 'river', 'island', 'point', 'ferry', 'depot', 'roads', 'forks', 'corners', 'furnace', 'ton', 'ington', 'ersville', 'sburg']);
const PLACE_PHRASE = /^(?:(?:\d{1,3}|One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Twelve|Fifteen|Twenty)(?:\s|-)(?:and a half\s+)?miles?\s+(?:from|above|below|beyond|north|south|east|west|of|out|to)\s+[A-Z]|(?:Near|Opposite|Camp near|Bivouac near|In front of|In the field near|On the road to|At the)\s+[A-Z])[A-Za-z’' .-]{0,40}$/;       // "Three miles from Rockville,": a place the OCR set on a line of its own
const NOT_PLACE = /^(?:Dated|Received|Sent|Copy|Date|Written|Respectfully|Forwarded|Approved|Endorsed|Indorsed|Reported|Returned|Dispatch|Orders?\b|Report|Letter|Same|Similar|The |From |To )/i;
const INSTIT = /^(?:Headquarters|Hdqrs|Hd\.?\s?qrs|Hdq['’]rs|Head-?quarters|Office\b|Executive\b|War Department|Navy Department|Treasury|State Department|Post-?Office|Department\b|Dept\b|Engineer Bureau|Ordnance|Signal (?:Office|Department)|Adjutant|Adjt\b|Inspector|Quartermaster|Provost|Cavalry\b|Artillery\b|Army\b|Military\b|Commissary|Medical|Surgeon|Western Union|U\.?\s?S\.?\s+(?:Military|Telegraph|Sanitary|Coast|Christian)\b|[A-Z][A-Za-z]+[’']s (?:Headquarters|Hdqrs|Division|Cavalry|Brigade))/i;
const ORDER_HEAD = /^(?:GENERAL|SPECIAL|CIRCULAR|FIELD|General|Special|Circular|Field)?\s*(?:ORDERS?|Orders?)\b[\s,.*)\]|jJ]*(?:No\.?\s*\d+[.,]?)?/;
const TAG_LINE = /^[\[(]?\s*(?:Sub-?)?(?:Inclosures?|Enclosures?|Indorsements?|Endorsements?|Second indorsement|Confidential|Cipher|Telegram|Order|Circular|Copy|Private|Official)\b[^\]\n]{0,28}[\]).!\-]*\s*$/i;
const NUMLINE = /^\s*[\[(]?\s*\d{1,4}\s*[\])]?\s*$/;
const CLOSING = /^(?:Very\s+)?(?:respectfully|truly|sincerely|faithfully|obediently)\b[^.]{0,70}[,.]?$|^Yours\b|^Your obedient|^I am,?\s+(?:sir|general|colonel|very)\b|^With (?:great |high )?(?:respect|esteem)|^(?:Believe|Remain)\b/i;
const SALUTATION = /^(?:General|Sir|Colonel|Captain|Major|Lieutenant|Dear (?:Sir|General|Colonel)|My dear\b[^:]{0,20}|Admiral|Commodore|Mr\.? President|Governor|Gentlemen|Generals|Comrades|Mr\.)\s*[:,.]/;
const RECIPIENT_CUE = /^(?:(?:Maj(?:or)?|Brig(?:adier)?|Lieut(?:enant)?|Lt|Col(?:onel)?|Capt(?:ain)?|Gen(?:eral)?|Hon|His Excellency|His Honor|The President|The Secretary|The Governor|The Commanding|The Commander|The Mayor|Commanding|Commander|Chief|Adjutant|Assistant|Mr|Governor|Dr|Surg|Admiral|Commodore|Rear|Colonel|Messrs|Telegraph|Operator|Superintendent|Military|Brevet|Hon\.|President|Secretary|Quartermaster|Provost|Signal|Commissary|Judge|Sheriff|Mayor)\b)/i;
const TITLE_WORD = new Set(['major', 'majorgeneral', 'brig', 'brigadier', 'brigadiergeneral', 'brevet', 'lieut', 'lieutenant', 'lt', 'lieutenantcolonel', 'lieutenantgeneral', 'col', 'colonel', 'capt', 'captain', 'gen', 'general', 'assistant', 'acting', 'chief', 'secretary', 'president', 'commanding', 'commander', 'comdg', 'adjutant', 'adjt', 'signal', 'governor', 'commodore', 'rear', 'surgeon', 'surg', 'medical', 'inspector', 'operator', 'aide', 'aidedecamp', 'quartermaster', 'provost', 'judge', 'mayor', 'engineer', 'paymaster', 'sergt', 'sergeant', 'corpl', 'private', 'telegraph', 'military', 'superintendent', 'brigadier-general', 'mayor-general', 'maj', 'bvt', 'a', 'and', 'of', 'u', 'c', 'dept', 'department', 'staff', 'commissary', 'ordnance', 'cavalry', 'artillery', 'infantry', 'volunteers', 'volunteer', 'army', 'chiefof', 'ass', 'asst', 'a.', '[chief]', 'lieutenant-colonel', 'ad']);
const UNIT_VOCAB = new Set('first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth corps division brigade army potomac department dept cavalry artillery staff engineer engineers signal volunteers volunteer vols militia drafted regiment battery battalion light heavy reserve guard provost marshal mounted rifles legion infantry headquarters hdqrs western eastern east west north south northern southern virginia maryland pennsylvania washington carolina united states confederate new york jersey ohio indiana illinois michigan wisconsin connecticut massachusetts maine vermont hampshire kentucky tennessee georgia alabama mississippi louisiana texas florida arkansas missouri delaware rhode island columbia war navy admiral flag general chief officer officers operator service treasury commissary ordnance quartermaster medical inspector judge advocate bureau office the of and at in for district middle susquehanna monongahela gulf mexico commodore squadron usn usa camp adc aide de brevet paymaster'.split(' '));
const titleKey = (w) => w.toLowerCase().replace(/[^a-z\[\]]/g, '');
/** a title line under a signature ("Major-General.", "Assistant Adjutant- General.", "Brigadier- General, Commanding .") */
export function isTitleLine(line) {
  const t = line.trim(); if (!t || t.length > 90 || /:/.test(t)) return false;
  if (/^(?:Signal|Ordnance|Engineer|Medical|Military|Cavalry|Artillery|Army|Quartermaster|Commissary)\b/i.test(t) && /Department|Hdqrs|Headquarters|Bureau|Office|Corps|Station/.test(t) && /,\s*$/.test(t)) return false;   // an office line, not a title
  // a capitalised word that is neither a rank nor a unit or a place ("General Slocum,", "Colonel Taylor,") makes it an address, not a title
  // what a commander commands ("Brigadier-General, Commanding Maryland Heights.") is a place or a unit and may be any name
  const t2 = t.replace(/\b(Commanding|Comdg\.?)\s+(?:the\s+)?[A-Z][A-Za-z.’' -]*\.?$/, '$1');
  if ((t2.match(/[A-Z][a-z]+/g) || []).some((w) => !TITLE_WORD.has(titleKey(w)) && !UNIT_VOCAB.has(w.toLowerCase()))) return false;
  const first = titleKey(t.split(/[\s,.\-]+/).filter(Boolean)[0] || ''); if (!first) return false;
  if (!TITLE_WORD.has(first) && !TITLE_WORD.has(titleKey(t.replace(/[\s\-.]+/g, '').slice(0, 14)))) return false;
  const words = (t.match(/[A-Za-z]{3,}/g) || []); return words.length <= 12 && !/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/.test(t.replace(/Assistant Adjutant|Chief of Staff|Signal Officer|Commanding|General|Volunteers|Cavalry|Army/gi, ' '));
}
const STATE = /(?:Va|Md|Pa|Ky|Mo|Ga|Ill|Ind|Del|Mass|Conn|Me|Vt|Mich|Wis|Minn|Ala|Miss|La|Tex|Ark|Fla|Tenn|D\.?\s?C|W\.?\s?Va|N\.?\s?[YJCH]|S\.?\s?C|R\.?\s?I|Ohio)\.?\s*,?\s*$/;
const keyOf = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

/** the clock the tail of a dateline holds, the "(Received ...)" time, and what is left of the line: { clock (text), received (text), rest } */
function readTail(post) {
  let p = post.replace(/^[\s.,;:*]+/, ''), clock = null, received = null, guard = 0;
  const CLK = String.raw`(?:12\s*m\b\.?|(?:\d{1,2}\s*[.:]\s*\d{2}|\d{1,2})\s*[-–—.,]?\s*\[?\s*(?:[ap]\s?\.?\s?m\b\.?\]?|[ap]\.(?![A-Za-z])\]?|noon\b|midnight\b|o.{0,2}clock\b))`;
  while (p && guard++ < 6) {
    let m;
    if ((m = /^[—–-]{1,3}\s*/.exec(p))) { p = p.slice(m[0].length); continue; }
    if ((m = /^\(\s*(?:Copy\s+)?[Rr]eceived[^)]{0,70}\)?\s*\.?/.exec(p))) { received = received || m[0].replace(/^\(\s*/, '').replace(/\)\s*\.?$/, ''); p = p.slice(m[0].length); continue; }
    if ((m = new RegExp('^[\\(\\[]?\\s*(' + CLK + ')[\\)\\]]?\\s*', 'i').exec(p))) { if (!clock) clock = m[1]; p = p.slice(m[0].length); continue; }
    if ((m = /^(?:noon|midnight)\b\.?\s*/i.exec(p))) { if (!clock) clock = m[0].trim(); p = p.slice(m[0].length); continue; }
    if ((m = /^[*\])\s.,;:]+/.exec(p))) { p = p.slice(m[0].length); continue; }
    break;
  }
  return { clock, received, rest: p.trim() };
}
const clockOf = (text) => {
  if (!text) return null;
  const fixed = /[ap]\.\s*$/i.test(text.trim()) ? text.trim() + ' m.' : text;                                    // "8.30 p." (the OCR set the "m." on a line of its own)
  const c = parseClock(fixed.replace(/^[—–-]+\s*/, ''))[0];
  return c ? { ...c, text: c.text } : null;
};

/** is this text the address of a dispatch: a person or an office, one to three short lines that end in a colon; never a sentence */
const ADDR_SMALL = new Set(['and', 'others', 'of', 'the', 'at', 'in', 'for', 'de', 'via', 'or', 'elsewhere', 'near', '&c.', '&c', 'etc.', 'etc', 'a.', 'a', 'to', 'on', 'hundred', 'thousand']);
function addressLike(t0) {
  // the OCR's brackets, question marks and bullets around an address ("[General Butterfield ?] :")
  const s = String(t0).replace(/^[\s,.;*•|~_"“”‘’'\[(]+/, '').replace(/[\[\]?]/g, ' ').replace(/[\s•*]+$/, '').replace(/\s+-\s*(?=[A-Za-z])/g, '-').replace(/\s+/g, ' ').trim(); if (!s || s.length > 130) return false;
  if (/^[a-z]/.test(s)) return false;
  const lower = (s.match(/\b(?:the|is|was|are|were|will|have|has|had|that|which|this|my|we|you|your|not|but|been|with|for|from|by)\b/g) || []).length;
  if (lower >= 3) return false;
  if (RECIPIENT_CUE.test(s)) return true;
  // a name and a place or an office: every word capitalised or a small connecting word, and a colon (or a comma) at the end
  const toks = s.replace(/[:;,.]+$/, '').split(/[\s,]+/).filter(Boolean);
  if (!toks.length || toks.length > 12 || !/[:;,.]$/.test(s)) return false;
  return toks.every((x) => /^[A-Z&]/.test(x) || ADDR_SMALL.has(x.toLowerCase())) && toks.filter((x) => /^[A-Z]/.test(x)).length >= 1;
}

/**
 * A dateline: a line that is (place,) date (, clock) (, "(Received ...)") (, the addressee). Returns { month, day, year, place, header, tags, order_no, clock, received, tail, line } or null.
 * `prevOk`: the line stands at the head of a paragraph (the line above is blank or a heading); a date at the head of a continuation line is part of a sentence.
 */
export function readDateline(line, { prevOk = true, gaz = null } = {}) {
  let t = String(line).trim().replace(/\s+/g, ' ');
  if (t.length < 9 || t.length > 220) return null;
  t = t.replace(/\[\s*([A-Za-z]{3,9})\s*\]/g, '$1').replace(/\[\s*(\d{1,2})\s*\]/g, '$1').replace(/\[\s*([A-Za-z]{3,9}\.?\s*\d{1,2}\s*,?)\s*\]/g, '$1').replace(/\[\s*(?=[A-Za-z]{3,9}\.?\s*\d)/, '').replace(/\[\s*(\d{4})\s*[.,]?\s*\]/g, '$1').replace(/([1I]\s?8\s?[0-9GOSlI]\s?[0-9lIOS])\s*\]/, '$1');
  const d = findDate(t); if (!d) return null;
  let pre = t.slice(0, d.index).replace(/^[\s*•|~_'"‘’“”`]+/, ''), post = t.slice(d.end);
  pre = pre.replace(/^[\\/\[]\s*(?=[A-Z][A-Za-z.’' ]{2,30}\])/, '').replace(/^([A-Z][A-Za-z.’' ]{2,30})\]/, '$1');                 // "\Taney town], July 2": a place in brackets, its opening bracket read as a backslash
  pre = pre.replace(/^(?:[^A-Za-z0-9\s]|[a-z])(?:\s+(?:[^A-Za-z0-9\s]|[a-z])){0,6}\s+(?=\S)/, '');                  // the OCR's debris in front of a heading ("c _ „ ^ . June 21, 1863")
  // order number and tags before the place: "No. 12. j June 7, 1863", "Confidential.] New York", "[Inclosure.] Headquarters ..."
  let orderNo = null; const tags = [];
  { const m = /^No\.?\s*([0-9lIO&|]{1,5})\s*[.,]?\s*(?:[jJfF1I\]\)|!]|[\)\]])?\s*/.exec(pre); if (m) { orderNo = +m[1].replace(/[lI|]/g, '1').replace(/[O&]/g, '0') || null; pre = pre.slice(m[0].length); } }
  for (let g = 0; g < 3; g++) { const m = /^\[?\s*((?:Sub-?)?(?:Inclosures?|Enclosures?|Indorsements?|Confidential|Cipher|Telegram|Order|Circular|Copy|Private|Official)(?:\s+(?:No\.?\s*)?[A-Z0-9IlJ]{1,3})?)\.?\s*[\]\)]\s*/i.exec(pre); if (!m) break; tags.push(m[1]); pre = pre.slice(m[0].length); }
  { const m = new RegExp('^' + ORDER_HEAD.source.replace(/^\^/, '')).exec(pre); if (m && /[)\]|jJ]/.test(m[0]) && m[0].length > 6) { pre = pre.slice(m[0].length); } }
  pre = pre.replace(/^[\s,.;:]+/, '').replace(/[\s,.;:]+$/, '');
  if (pre && !/[A-Za-z]{3,}/.test(pre)) pre = '';                                                    // nothing but the OCR's debris
  // what stands before the date must be a place or an office, never a sentence
  if (pre.length > 90 || (pre && NOT_PLACE.test(pre))) return null;
  pre = pre.replace(/(?:\s+[a-z]{1,2}|\s+[^A-Za-z0-9\s,.]+)+\s*$/, '').replace(/[\s,.;:]+$/, '');                  // the OCR's debris at the end of the place ("Washington, D. C., i June 30": the "i")
  if (pre) {
    const toks = pre.split(/\s+/);
    if (toks.length > 13) return null;
    // a lower-case word is a connecting word or the tail of a place the OCR parted ("Taney town", "Fair Play ford"): only those
    if (toks.some((x, i) => /^[a-z]/.test(x) && !CONNECT.has(x.replace(/[,.]$/, '')) && !PLACE_LOWER.has(x.replace(/[,.]$/, '')) && !(i > 0 && /^[A-Z]/.test(toks[i - 1]) && PLACE_TAIL.has(x.replace(/[,.]$/, ''))))) return null;
    if (CONNECT.has(toks[toks.length - 1].replace(/[,.]$/, '').toLowerCase())) return null;
    if (/[.;!?]\s+[A-Z][a-z]+\s+[a-z]{3,}/.test(pre.replace(/\b(?:Md|Pa|Va|Mo|Col|Gen|Maj|Capt|Lieut|Brig|Co|Jr|St|Ft|No|D|C|W|N|Hdqrs|Dept|Corps|Div|Brig|Cav|Inf|Art|Vol|Vols|U|S|A)\./g, ''))) return null;
  } else if (!prevOk) return null;                                                                   // a date alone at the head of a continuation line ("... ordered for to-morrow, / July 11, 1863")
  const tail = readTail(post);
  // the "m." of a clock the OCR garbled ("5 p. np", "9 a. . m.", "12.30 a. ni.") is left over after "5 p.": two letters at most, never an address
  if (tail.clock && /[ap]\.?$/i.test(tail.clock.trim()) && /^[a-z]{1,2}[.,:;]?$/.test(tail.rest)) tail.rest = '';
  let addr = null;
  if (tail.rest) {
    const r = tail.rest.replace(/^[\s*•|~_]+/, '');
    if (r && !/^[^A-Za-z]{0,10}$/.test(r)) {                                                          // what is left is more than the OCR's debris: it must be the addressee, never a sentence
      if (r.length <= 160 && addressLike(r) && /[:;,.]\s*[*•]?$/.test(r)) addr = r;
      else {
        // a clock the OCR garbled ("— lO.lOp. m." "12.30 a. ni.") stands between the date and the address: the address begins at its first title
        const cue = /(?:^|\s)((?:Maj(?:or)?|Brig|Lieut|Lt|Col(?:onel)?|Capt|Gen(?:eral)?|Hon|Commanding|Mr|Governor|Admiral|Commodore)\b.*)$/.exec(r);
        if (cue && cue.index <= 26 && cue[1].length <= 160 && addressLike(cue[1]) && /[:;,.]\s*[*•]?$/.test(cue[1])) addr = cue[1]; else return null;
      }
    }
  }
  if (!pre && !addr && !prevOk) return null;
  // place: the geographic part of what precedes the date; the offices that head it ("Headquarters Army of the Potomac,", "War Department,") are the header
  const segs = pre ? pre.split(/\s*,\s*/).map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  const inst = []; while (segs.length && INSTIT.test(segs[0])) inst.push(segs.shift());
  let place = segs.length ? segs.join(', ') : null;
  if (!place && inst.length && !/^(?:Headquarters|Hdqrs|Hd\.?\s?qrs|Head-?quarters|Department|Dept|Army|Cavalry|Artillery|Military|[A-Z][A-Za-z]+[’']s)/i.test(inst[inst.length - 1])) place = inst.pop();     // "Signal Station," "Engineer Bureau," "Executive Mansion," name a place
  if (place) place = place.replace(/\s+,/g, ',').replace(/^\[|\]$/g, '').replace(/^\W+|[\s,]+$/g, '').replace(/\bTJ(?=[a-z])/g, 'U') || null;       // "TJpperville": the OCR's usual reading of a capital U
  const ck = readTail(post);
  return { month: d.month, day: d.day, year: d.year, place, header: inst.join(', ') || null, tags, order_no: orderNo, clock: clockOf(ck.clock), received: ck.received || null, tail: addr, line: t };
}

// ---- signatures -----------------------------------------------------------------------------------------------------------------------------------------------------------------
const NAME_STOP = /^(?:GENERAL|SPECIAL|CIRCULAR|ORDERS?|NO|HEADQUARTERS|DEPARTMENT|WAR|COPY|CIPHER|TELEGRAM|OFFICIAL|ADJUTANT|ASSISTANT|CHIEF|INCLOSURE|INDORSEMENT|ABSTRACT|RETURN|UNION|CONFEDERATE|ADDENDA|THE|ARMY|OFFICE|CORRESPONDENCE|INDEX|PART|CHAP|ETC|FIELD|BATTLE|REPORT|STATEMENT|SUMMARY|TOTAL|RECAPITULATION)\b/;
const NAME_UNIT = new Set(['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH', 'DIVISION', 'BRIGADE', 'CORPS', 'ARTILLERY', 'CAVALRY', 'INFANTRY', 'RESERVE', 'ARMY', 'DEPARTMENT', 'STAFF', 'BATTERY', 'REGIMENT', 'TOTAL', 'GRAND', 'SIGNAL', 'OFFICE', 'MILITIA', 'NORTH', 'SOUTH', 'WEST', 'EAST', 'POTOMAC', 'VIRGINIA', 'MARYLAND', 'PENNSYLVANIA', 'STATION', 'BUREAU', 'GUARD', 'PROVOST', 'ENGINEER', 'ENGINEERS', 'ORDNANCE']);
const NAMETOK = /^(?:Mc|Mac|De|Van|Von|La|O[’']|D[’'])?[A-Z][A-Z’'.\-]*[.,;:]?$/;
const TITLE_START = /,\s*[#*•^|~]*\s*(?=(?:Brevet |Bvt\.? |Brig|Maj|Lieut|Lt\b|Col|Capt|Gen|Assistant|Acting|Chief|Secretary|President|Commanding|Adjutant|Signal|Governor|Commodore|Rear|Surg|Medical|Inspector|Operator|Aide|Quarter|Provost|Judge|Mayor|Sergt|Corpl|Private|Engineer|Paymaster|Superintendent|\[))/;
/** the name part of a signature line: { name, title (the rest of the line, inline), weak } or null. "DANL. BUTTERFIELD," "EDWIN M; STANTON." "65 S. P. HEINTZELMAN," "H. W. SLOCUM, Major-General of Volunteers." "WILLIAM H. HILL and I. S. LYON, Signal Officers." */
export function nameOf(line) {
  let t = String(line).trim().replace(/(^|\s)0\.(?=\s|[A-Z]|$)/g, '$1O.');       // "0. 0. HOWARD.": a zero for the initial O
  t = t.replace(/^[\s,.;:'’‘*•|_~\-—\[\]]+/, '').replace(/\]\s+(?=[A-Z])/g, ' ').replace(/[\]\s#*•^|~]+$/, '').replace(/^\d{1,3}\s+(?=[A-Z])/, '').replace(/^[A-Z]\s+(?=[A-Z]{2,}\.?(?:\s|,|$))/, '');
  if (!t || t.length > 120) return null;
  // a signature the OCR set in lower case ("w. g. McCreary,", "Wm. H. French,"): initials and a capitalised surname, and only with a title line under it (the caller asks for one: weak)
  { const mx = /^((?:[A-Za-z]{1,4}\.\s*){1,3}(?:Mc|Mac|De|Van|O[’'])?[A-Z][a-z’'-]{2,14})\s*[,.]?\s*$/.exec(t); if (mx && /[a-z]/.test(t.split(/\s+/)[0]) && !/^(?:Gen|Col|Capt|Maj|Lieut|Lt|Brig|Hon|Mr|Dr|Gov|Surg|Com|Adm|Sergt|Corp|Pvt|Respectfully|Very|Yours)\b/i.test(t) && !NAME_STOP.test(mx[1].toUpperCase())) return { name: mx[1].replace(/\s+/g, ' ').replace(/[,.]+$/, ''), title: '', weak: true }; }
  let name = t, title = '';
  const cm = TITLE_START.exec(t); if (cm) { name = t.slice(0, cm.index); title = t.slice(cm.index + 1).trim(); }
  name = name.replace(/[\s,.;:*'’‘"”“]+$/, '');
  const toks = name.split(/[\s]+/).filter(Boolean);
  if (!toks.length || toks.length > 7) return null;
  if (NAME_STOP.test(name.toUpperCase().replace(/^[^A-Z]+/, '')) || /^(?:AND\s|OTHERS\b)/i.test(name.replace(/^[^A-Za-z]+/, ''))) return null;       // "AND OTHERS," ends a list of addressees
  let big = 0, letters = 0, initials = 0, words = [];
  for (let i = 0; i < toks.length; i++) {
    const x = toks[i].replace(/[,;]+$/, '');
    if (/^(?:and|AND|&|Jr\.?|JR\.?|jr\.?)$/.test(x)) continue;
    if (!NAMETOK.test(x) && !NAMETOK.test(x + '.')) return null;
    const l = (x.match(/[A-Za-z]/g) || []).length; letters += l;
    if (l === 1) initials++; else words.push(x.replace(/[^A-Za-z]/g, '').toUpperCase());
    if ((x.match(/[A-Z]/g) || []).length >= 3 && !/[a-z]{2,}/.test(x.replace(/^(?:Mc|Mac|De|Van|Von|La)/, ''))) big++;
  }
  if (words.length && words.every((w) => NAME_UNIT.has(w))) return null;                                           // "FIRST DIVISION," a heading of a table
  if (words.some((w) => w === 'ETC' || (w.length >= 4 && w !== 'UNION' && dl(w, 'UNION', 1) <= 1) || w === 'UNION' || w === 'CONFEDERATE' || /^[XIVLTYJ]{3,6}$/.test(w))) return null;      // a running head's debris ("TJNION", "ONION", "YYTX", "BA. ETC")
  if (!initials && /,\s*(?:PA|MD|VA|W\.? ?VA|N\.? ?[YJC]|D\.? ?C|OHIO|KY|MO|DEL|MASS)\.?$/.test(name)) return null;     // "YORK, PA." a place heading of a table
  const weak = !big && initials >= 2 && letters >= 2 && letters <= 6;                                              // "P. AND C." (initials only: a signature only with a title under it)
  if (!big && !weak) return null;
  if (!weak && letters < 4) return null;
  const clean = name.replace(/([A-Z]\.?)\s*[;,]\s*(?=[A-Z])/g, '$1 ').replace(/;/g, ',').replace(/\s+/g, ' ').trim();
  return { name: clean, title, weak };
}
const POSTSCRIPT = /^(?:(?:N|IST|1ST|1S)\.?\s?B\.?\s*[—–-]|P\.?\s?S\.?[\]JjlI]?\s*[—–-]|\[\s*P\.?\s?S|\(|\[)/;
/** the signature blocks of a run of lines: [{ i (first line), end (exclusive), name, title }] */
export function findSignatures(lines) {
  const out = []; const bodyLike = (s) => { const w = s.trim(); return w.length > 45 && (w.match(/\b[a-z]{2,}\b/g) || []).length >= 6; };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim(); if (!t) continue;
    const nm = nameOf(t); if (!nm) continue;
    let end = i + 1, titles = nm.title ? 1 : 0, k = i + 1, blanks = 0;
    while (k < lines.length && titles < 4 && blanks <= 2) { const x = lines[k].trim(); if (!x) { blanks++; k++; continue; } if (isTitleLine(x)) { titles++; end = k + 1; blanks = 0; k++; continue; } break; }
    let ok = titles > 0;
    // a name alone ("BUFORD.") that ends the dispatch: what follows is the next heading, a note or a postscript, never more text
    if (!ok && !nm.weak) { let n = i + 1; while (n < lines.length && !lines[n].trim()) n++; ok = n >= lines.length || !bodyLike(lines[n]) || POSTSCRIPT.test(lines[n].trim()); }
    if (!ok) continue;
    // a name on the line right after the first line of a body paragraph is a heading of the text, not a signature: needs a blank line (or the unit's start) above
    const prev = (() => { let n = i - 1; while (n >= 0 && !lines[n].trim()) n--; return n; })();
    if (prev >= 0 && i - prev === 1 && bodyLike(lines[prev]) && !/[.!?:;"”’)\]]\s*$/.test(lines[prev].trim()) && !nm.title) continue;
    out.push({ i, end, name: nm.name, title: nm.title || lines.slice(i + 1, end).map((x) => x.trim()).filter(Boolean).join(' ') });
    i = end - 1;
  }
  return out;
}
/**
 * A signature the OCR damaged past the strict grammar ("DA1STL. BUTTERFIELD," "D. 1ST. COUCH," "EDWIN* M. STANTON," "Respectfully, jul. STAHEL,"): among the last lines of a dispatch that has no readable signature, the last line that ends in a run of capitals
 * (initials and words of capitals, at least one of three letters), followed at most by title lines and notes. The name is what the capitals say; nothing is repaired or guessed.
 */
export function weakSignature(ul) {
  const nb = []; ul.forEach((x, i) => { if (x.trim()) nb.push(i); });
  for (let q = nb.length - 1; q >= 0 && q >= nb.length - 5; q--) {
    const i = nb[q], t = ul[i].trim();
    if (isTitleLine(t) || /^\(.*\)\s*\.?$/.test(t) || CLOSING.test(t) || /^[\[(]/.test(t) && t.length < 40) continue;
    const toks = t.replace(/[*^|~_"“”]+/g, ' ').split(/\s+/).filter(Boolean); const got = [];
    for (let k = toks.length - 1; k >= 0 && got.length < 5; k--) { const x = toks[k].replace(/[.,;:]+$/, ''); if (/^[A-Z0-9][A-Z0-9'’\-]*$/.test(x) && /[A-Z]/.test(x)) got.unshift(x); else break; }
    if (!got.some((x) => (x.match(/[A-Z]/g) || []).length >= 3 && !/\d/.test(x)) || got.every((x) => NAME_UNIT.has(x) || NAME_STOP.test(x))) return null;
    if (got.some((x) => /^(?:AND|THE|OF|FOR|NOT|ARE|YOU|HAS|HAD|WAS)$/.test(x))) return null;
    return { i, end: i + 1, name: got.join(' '), title: ul.slice(i + 1).map((x) => x.trim()).filter((x) => x && isTitleLine(x)).join(' '), weak: true };
  }
  return null;
}
/** the signers of a text, as printed (compat: the OR linker and the tests read this) */
export function signatureLines(text) { return findSignatures(String(text).split('\n')).map((s) => s.name); }

// ---- the segmenter ------------------------------------------------------------------------------------------------------------------------------------------------------------
const INDORSE = /^(?:\S{1,2}\s+)?\[?\s*(?:First |Second |Third )?(?:In|En)dorsements?\.?\s*[\]\-!]?\s*$/i;
const SECTION = /^\W*(?:(?:UNION|CONFEDERATE)\W{0,2}\s+)?CORRESPONDENCE,?\s*ETC\.?\W*$|^\W*ADDENDA\.?\W*$/i;
/** a table (a return, an organisation, a list of stations): little running prose. Its capitals are headings, never signatures, and nothing in it is cut at a "signature". */
export function tableLike(ul) {
  const toks = ul.join(' ').split(/\s+/).filter(Boolean);
  if (toks.length < 100) return false;
  const lower = toks.filter((x) => /^[a-z]{2,}[.,;:]?$/.test(x)).length;                                // prose is about 60% lower-case words; a list of units, officers and stations about 10%
  return lower / toks.length < 0.3;
}
const FORWARD = /\b(?:forward(?:ed)?|inclos(?:e|ed|ing)|transmit(?:ted)?|following (?:dispatch|telegram|letter|report|just|is|important)|copy of)\b/i;

/**
 * Cut the dispatches of Part 3.
 * @param norm  { text, pages: [{offset, page}] } from normalizeOcr
 * @returns { docs, report }
 */
export function segmentDispatches(norm, { part = 3 } = {}) {
  const text = norm.text;
  const lines = []; { let off = 0; for (const l of text.split('\n')) { lines.push({ t: l, s: off, e: off + l.length }); off += l.length + 1; } }
  const L = (k) => lines[k].t;
  // the volume ends in its index; the "ALTERNATE DESIGNATIONS" table that precedes the index is back matter too
  let end = text.length; { const tail = text.length * 0.8; const m = /(?:^|\n)\s*(?:INDEX|ALTERNATE DESIGNATIONS)\.?\s*(?:\n|$)/g; let x; while ((x = m.exec(text))) if (x.index > tail) { end = x.index; break; } }
  let nEnd = lines.length; for (let k = 0; k < lines.length; k++) if (lines[k].s >= end) { nEnd = k; break; }
  // the side of the correspondence: set by the section headings of the volume ("CONFEDERATE CORRESPONDENCE, ETC." / "UNION CORRESPONDENCE, ETC."), Union before the first of them
  const sideAt = new Array(nEnd).fill('union'); { let side = 'union'; for (let k = 0; k < nEnd; k++) { const t = L(k).trim(); if (/^\W*CONFEDERATE\W{0,2}\s+CORRESPONDENCE/i.test(t)) side = 'confederate'; else if (/^\W*UNION\W{0,2}\s+CORRESPONDENCE/i.test(t)) side = 'union'; sideAt[k] = side; } }
  const isSection = (k) => SECTION.test(L(k).trim());
  const blank = (k) => !L(k).trim();
  const prevNonBlank = (k) => { let n = k - 1; while (n >= 0 && blank(n)) n--; return n; };
  // pass A: the datelines read strictly, to learn the places the volume itself prints (the gazetteer that tells a place line from a line of text)
  const gaz = new Set(), gazFirst = new Map();
  for (let k = 0; k < nEnd; k++) { const d = readDateline(L(k), { prevOk: true }); if (d && d.place) { gaz.add(keyOf(d.place)); const f = keyOf(d.place.split(',')[0]); gazFirst.set(f, (gazFirst.get(f) || 0) + 1); } }
  const placeShape = (s) => {                                                                          // a short capitalised line that ends in a comma: "Hear Gettysburg," "Camp near Kettle Run,"
    const t = s.trim().replace(/\s+/g, ' ');
    if (!t || t.length > 55 || /\d/.test(t) || CLOSING.test(t) || NOT_PLACE.test(t) || !/,\s*$/.test(t) || !/^[A-Z\[]/.test(t)) return false;
    const toks = t.replace(/[\s,.]+$/, '').split(/[\s,]+/).filter(Boolean);
    return toks.length >= 1 && toks.length <= 6 && toks.every((x) => /^[A-Z\[]/.test(x) || CONNECT.has(x.toLowerCase())) && !isTitleLine(t) && !SALUTATION.test(t) && !RECIPIENT_CUE.test(t);
  };
  const isPlaceLine = (s) => {
    const t = s.trim().replace(/\s+/g, ' ');
    if (!t || t.length > 60 || /\d/.test(t) || CLOSING.test(t) || NOT_PLACE.test(t) || /[:;]/.test(t.replace(/[:;]\s*$/, ''))) return false;
    if (!/,\s*$|\.\s*$/.test(t) || !/^[A-Z\[]/.test(t)) return false;
    const core = t.replace(/[\s,.]+$/, ''); const segs = core.split(/\s*,\s*/);
    if (segs.length > 4 || segs.some((x) => x.split(/\s+/).length > 5)) return false;
    return gaz.has(keyOf(core)) || (gazFirst.get(keyOf(segs[0])) || 0) >= 2 || STATE.test(core + ',') && segs.length >= 2 || INSTIT.test(core) && /,\s*$/.test(t) || PLACE_PHRASE.test(core) && /,\s*$/.test(t);
  };
  const headerLike = (k, { addr = false } = {}) => {
    const t = L(k).trim(); if (!t) return true;
    if (NUMLINE.test(t) || TAG_LINE.test(t) || isSection(k)) return true;
    if (INSTIT.test(t) && t.length <= 100 && !/[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,}/.test(t.replace(/\b(?:of|the|and)\b/g, ''))) return true;
    if (ORDER_HEAD.test(t) && /[)\]|jJ]/.test(t) && t.length <= 110) return true;
    if (/^[\[(][^\])]{0,60}$/.test(t) && /^[\[(]\s*[A-Z]/.test(t) && t.length < 40) return true;                          // "[Circular.", "[Telegram"
    if (isPlaceLine(t)) return true;
    if (addr && t.length <= 90 && /[:;,]\s*$/.test(t) && addressLike(t) && !CLOSING.test(t)) return true;
    if (/^m\.?$/i.test(t)) return true;                                                                  // the "m." the OCR parted from "8.30 p."
    return false;
  };
  // ---- the datelines
  const dls = []; // { k, d, above (the place line printed above a date-only line) }
  for (let k = 0; k < nEnd; k++) {
    if (isSection(k)) continue;
    const pn = prevNonBlank(k);
    const above = pn >= 0 && k - pn <= 2 && placeShape(L(pn)) ? pn : -1;                              // a date-only line under "Hear Gettysburg," is the dateline of a place and a date on two lines
    const prevOk = pn < 0 || k - pn > 1 || above >= 0 || headerLike(pn) || (/[.!?:;"”’)\]]\s*$/.test(L(pn).trim()) && !/,$/.test(L(pn).trim())) || isTitleLine(L(pn)) || nameOf(L(pn)) !== null;
    const d = readDateline(L(k), { prevOk }); if (!d) continue;
    if (above >= 0 && !d.place) d.place = L(pn).trim().replace(/[\s,.]+$/, '').replace(/\s+,/g, ',');
    dls.push({ k, d, above });
  }
  // a dateline directly followed (before any body line) by another dateline line is the same heading ("June 3, 1863." / "June 3, 1863 - 10 p. m.")
  const heads = [];
  for (const x of dls) {
    const last = heads[heads.length - 1];
    if (last) { let n = x.k - 1, bodyBetween = false; while (n > last.k) { if (!headerLike(n, { addr: true }) && !isTitleLine(L(n))) { bodyBetween = true; break; } n--; } if (!bodyBetween && x.k - last.k <= 6) { if (!last.d.clock && x.d.clock) last.d.clock = x.d.clock; if (!last.d.received && x.d.received) last.d.received = x.d.received; continue; } }
    heads.push(x);
  }
  // ---- where each dispatch starts: the header lines above its dateline, down to the last signature of the previous dispatch
  const starts = [];
  heads.forEach((h, idx) => {
    const lo = idx > 0 ? heads[idx - 1].k + 1 : 0;
    const seg = []; for (let k = lo; k < h.k; k++) seg.push(L(k));
    const sigs = findSignatures(seg); const pe = sigs.length ? lo + sigs[sigs.length - 1].end : lo;
    let first = h.k, taken = 0, blanks = 0;
    for (let k = h.k - 1; k >= lo && taken < 8; k--) {
      const t = L(k).trim();
      if (!t) { if (++blanks > 3) break; continue; }
      // above the last signature only unambiguous heading lines; below it also an addressee the OCR set above the date
      const ok = k === h.above || (headerLike(k, { addr: k >= pe && sigs.length > 0 }) && !isTitleLine(t));
      if (!ok || k < pe) break;
      first = k; taken++; blanks = 0;
    }
    starts.push({ first, h });
  });
  const pageAt = (off) => { let p = null; for (const m of norm.pages) { if (m.offset <= off) p = m.page; else break; } return p; };
  const raw0 = starts.map((st, i) => ({ a: st.first, b: i + 1 < starts.length ? starts[i + 1].first : nEnd, h: st.h }));
  // a section heading of the volume ("CONFEDERATE CORRESPONDENCE, ETC.") ends the item before it and is no text of the item after it
  const raw = [];
  for (const u of raw0) { let a = u.a; for (let k = u.a; k < u.b; k++) if (isSection(k)) { if (k > a) raw.push({ a, b: k, h: a === u.a ? u.h : null }); a = k + 1; } if (a < u.b) raw.push({ a, b: u.b, h: a === u.a ? u.h : null }); }
  // ---- cut a unit that holds two dispatches: a signature, then an addressee line and a body, with no dateline (an indorsement with its own addressee, a dispatch whose dateline the OCR lost)
  let units = [];
  for (const u of raw) {
    let a = u.a; const parts = [];
    const sl = []; for (let k = u.a; k < u.b; k++) sl.push(L(k));
    const sigs = tableLike(sl) ? [] : findSignatures(sl);
    for (let s = 0; s < sigs.length - 1; s++) {
      const after = u.a + sigs[s].end;
      let k = after; while (k < u.b && blank(k)) k++;
      const mk = k; let hdr = 0; while (k < u.b && !blank(k) && (headerLike(k) || TAG_LINE.test(L(k).trim())) && hdr < 5) { k++; hdr++; while (k < u.b && blank(k)) k++; }
      if (k >= u.b) continue;
      const t = L(k).trim(); const nxt = (() => { let n = k + 1; while (n < u.b && blank(n)) n++; return n < u.b ? L(n).trim() : ''; })();
      const addrOk = addressLike(t) && /[:;]\s*$/.test(t) && nxt && !/^[a-z]/.test(nxt);
      const indors = INDORSE.test(L(mk).trim());
      // a reply or an indorsement printed with no heading at all: after a signature that has its title, a text of some length that ends in the signature of ANOTHER man, with no indorsement marker,
      // postscript or closing between them, is a message of its own (its date and addressee are not printed: they stay null, never carried over from the message above)
      const S = sigs[s], T = sigs[s + 1]; const between = []; for (let q = after; q < u.a + T.i; q++) between.push(L(q));
      const firstB = (between.find((x) => x.trim()) || '').trim();
      const surnameOf = (n) => (n.replace(/[^A-Za-z\s]/g, '').trim().split(/\s+/).pop() || '').toUpperCase();
      const dateless = !!S.title && surnameOf(S.name) !== surnameOf(T.name) && between.join(' ').split(/\s+/).filter(Boolean).length >= 8
        && !between.some((x) => INDORSE.test(x.trim()) || /Inclosure/i.test(x)) && !POSTSCRIPT.test(firstB) && !CLOSING.test(firstB) && !/^[a-z]/.test(firstB);
      if ((addrOk || dateless) && !indors && u.a + sigs[s + 1].i > k) { parts.push([a, mk]); a = mk; }
    }
    parts.push([a, u.b]);
    for (const [x, y] of parts) units.push({ a: x, b: y, h: x === u.a ? u.h : null });
  }
  // ---- header lines left at the foot of a unit belong to the unit that follows ("Baltimore, Md.," under the signature of one dispatch is the place line of the next), wherever the cut came from
  for (let i = 0; i + 1 < units.length; i++) {
    const u = units[i], nx = units[i + 1]; if (nx.a !== u.b) continue;
    for (let guard = 0; guard < 4; guard++) {
      let k = u.b - 1; while (k > u.a && blank(k)) k--;
      if (k <= u.a) break;
      const t = L(k).trim();
      if (!(isPlaceLine(t) || TAG_LINE.test(t) || (INSTIT.test(t) && /,\s*$/.test(t) && !isTitleLine(t)) || (ORDER_HEAD.test(t) && /[)\]|jJ]/.test(t))) || CLOSING.test(t) || nameOf(t) || (isTitleLine(t) && /^(?:Adjutant|Assistant|Chief of|Acting|Aide|Major|Brig|Lieut|Col|Capt|General|Commanding|Secretary|Surgeon)\b/i.test(t) && !/Office|Bureau|Headquarters|Hdqrs|Department/i.test(t))) break;      // "Adjutant- General ," under a signature is its title, not a place line of the next dispatch
      u.b = k; nx.a = k;                                                                                   // the line (and the blank lines that followed it) move to the next unit
    }
  }
  // ---- the fields of one unit
  const joinAddr = (arr) => arr.map((x) => x.trim().replace(/\s+/g, ' ')).join(' ').replace(/[\[\]?]/g, '').replace(/^["“”‘’'\s,.;*•]+/, '').replace(/[\s:;,.*•]+$/, '').replace(/\s+([:,])/g, '$1').replace(/\s+/g, ' ').trim();
  const perPage = new Map();
  const build = (u) => {
    let a = u.a, b = u.b;
    while (a < b && (blank(a) || isSection(a))) a++;
    while (b > a && (blank(b - 1) || isSection(b - 1))) b--;
    const ul = []; for (let k = a; k < b; k++) ul.push(L(k));
    if (ul.join('\n').trim().length < 20) return null;
    // a table (a return, an organisation, a list of stations) has no sender and no address: its capitals are headings, and read as signatures they would name a city as the author
    const tableDoc = tableLike(ul);
    const sigs = tableDoc ? [] : findSignatures(ul);
    const mark = ul.findIndex((x, i) => INDORSE.test(x.trim()) && sigs.some((s) => s.end <= i));
    // the sender is the last signature before the first indorsement marker; two signatures with no text between them (a dispatch and the name of the officer who certifies or forwards the copy: "HOOKER, Major-General. / CHAS. N. TURNBULL, Captain of Engineers, Commanding.") are the dispatch's writer first
    let main = (() => { const c = sigs.filter((s) => mark < 0 || s.i < mark); if (!c.length) return null; let m = c.length - 1; while (m > 0 && ul.slice(c[m - 1].end, c[m].i).every((x) => !x.trim())) m--; return c[m]; })();
    if (!main && !tableDoc) main = weakSignature(ul);
    let dline = null; for (let k = a; k < b; k++) { const hh = heads.find((x) => x.k === k); if (hh) { dline = hh; break; } }
    const d = dline ? dline.d : (u.h ? u.h.d : null);
    const dk = dline ? dline.k : -1;
    // the lines under the dateline that are not yet the address: a "(Received ...)" note, the OCR's debris, a stray "m."
    const skippable = (t) => /^\(.*[Rr]eceived/.test(t) || TAG_LINE.test(t) || /^m\.?$/i.test(t) || NUMLINE.test(t) || /^\(\s*Copy/i.test(t) || /^[*•]+\s*$/.test(t);
    const below = (k0) => {
      const blk = []; let n = k0, guard = 0;
      while (n < b && guard++ < 14 && blk.length < 3) {
        const t = L(n).trim().replace(/^[\s,.;*•|~_]+/, '').replace(/[\s•*|~_<>»«]+$/, '').replace(/([:;])\s*,\s*$/, '$1').replace(/[\[\]]/g, '').replace(/\s+/g, ' '); n++;      // "Commanding Cavalry Corps: >" and "Boonsborough : ," end in the OCR's debris after the colon
        if (!t || skippable(t)) continue;
        if (SALUTATION.test(t) && blk.length) return { block: blk, via: 'salutation' };
        const nxt = (() => { let q = n; while (q < b && !L(q).trim()) q++; return q < b ? L(q).trim() : ''; })();
        const contin = blk.length && /[:;]\s*$/.test(t) && t.length <= 85 && (t.match(/\b(?:the|is|was|are|will|have|that|which|this)\b/g) || []).length <= 1 && !/^[a-z]/.test(t);   // "Leesburg, via Poolesville:" under "General Slocum,"
        if (!contin && !addressLike(t)) return blk.length && /[:;]\s*$/.test(blk[blk.length - 1]) ? { block: blk, via: 'colon' } : null;
        blk.push(t);
        if (/[:;]\s*$/.test(t)) return { block: blk, via: 'colon' };
        // an address with no colon ("General Tyler, Harper's Ferry ."): rank-led, short, names only, and body text follows
        if (blk.length === 1 && RECIPIENT_CUE.test(t) && t.length <= 70 && nxt && /^[A-Z]/.test(nxt) && !/^[a-z]/.test(nxt) && !SALUTATION.test(nxt) === !SALUTATION.test(nxt) && (nxt.match(/\b[a-z]{2,}\b/g) || []).length >= 4) return { block: blk, via: 'rank-led' };
      }
      return null;
    };
    let addressee = null;
    if (d && d.tail) {
      const blk = [d.tail]; if (!/[:;]\s*[*•]?$/.test(d.tail)) { const r = below(dk + 1); if (r && r.block.length && /[:;]\s*$/.test(r.block[r.block.length - 1]) && r.block.length <= 2) blk.push(...r.block); }
      addressee = joinAddr(blk);
    } else if (dk >= 0) { const r = below(dk + 1); if (r) addressee = joinAddr(r.block); }
    else { const r = below(a); if (r) addressee = joinAddr(r.block); }                                          // a message with no heading of its own: its address is its first lines
    if (!addressee) { // an address printed above the date (the OCR's reading order)
      const hl = []; for (let k = a; k < (dk >= 0 ? dk : a); k++) { const t = L(k).trim(); if (dline && k === dline.above) continue; if (t && /[:;,]\s*$/.test(t) && addressLike(t) && !INSTIT.test(t) && !isPlaceLine(t) && !CLOSING.test(t)) hl.push(t); }
      if (hl.length && /[:;]\s*$/.test(hl[hl.length - 1])) addressee = joinAddr(hl);
    }
    if (addressee && main && addressee.replace(/[^A-Za-z]/g, '').toUpperCase().includes(main.name.replace(/[^A-Za-z]/g, '').toUpperCase()) && main.name.replace(/[^A-Za-z]/g, '').length >= 6) addressee = null;                  // the signature read as the address
    if (addressee && (addressee.split(/\s+/).length > 16 || /\b(?:will|shall|should|would|must)\b/.test(addressee))) addressee = null;
    const first = ul.find((x) => x.trim()) || '';
    const kind = /^(?:GENERAL|SPECIAL|CIRCULAR|FIELD)?\s*ORDERS?\b|^General Orders|^Special (?:Field )?Orders|^Circular|^\[?Circular/i.test(first) || (d && d.tags.some((x) => /^(?:Order|Circular)/i.test(x)) && !main) ? 'order' : /^Itinerary/i.test(first) ? 'itinerary' : tableDoc ? 'return' : 'dispatch';
    const pg = pageAt(lines[a].s);
    const header = ul.slice(0, Math.max(0, (dk >= 0 ? dk : a) - a)).map((x) => x.trim()).filter(Boolean).concat(d && d.header ? [d.header] : []).join(' / ');
    return {
      kind, header, toc_title: null, no: null,
      date: d && d.month && d.day ? { y: d.year, m: d.month, d: d.day } : null, date_text: d ? d.line : null, clock: d ? d.clock : null, received: d ? d.received : null, place: d ? d.place : null, addressee, signer: main ? main.name : null, signer_title: main ? main.title : null,
      side: sideAt[Math.min(a, nEnd - 1)], start: lines[a].s, end: lines[b - 1].e, text: ul.join('\n').replace(/\s+$/, ''),
      pages: { start: pg, end: pageAt(Math.max(lines[a].s, lines[b - 1].e - 1)) }, confidence: d && d.month && d.year === 1863 ? 'A' : 'B', recovered: null, sign_text: main ? ul.slice(0, main.end).join('\n') : null,
      _ul: ul, _sigs: sigs, _main: main, _a: a, _b: b, _h: u.h,
    };
  };
  // ---- a message forwarded inside another: a dispatch of its own only when it carries its own address and signature. A quotation that has a date line and nothing else ("The following just received from
  //      signal officer : / June 21, 1863 - 7 p. m. [the signal message] / DAN. TYLER, Brigadier-General.") stays in the message that forwards it
  let built = units.map(build).filter(Boolean);
  const merged = []; let nMerged = 0;
  for (const d of built) {
    const p = merged[merged.length - 1];
    const tailLines = p ? p._ul.filter((x) => x.trim()).slice(-3).map((x) => x.trim()) : [];
    const forwards = tailLines.some((x) => /[:;]\s*$/.test(x)) || (p && FORWARD.test(p._ul.join(' ').slice(-300)));
    if (p && !p.signer && !d.addressee && forwards && !d.kind.startsWith('order') && d.date && p.date && d.date.m === p.date.m && Math.abs(d.date.d - p.date.d) <= 1) {
      const u2 = build({ a: p._a, b: d._b, h: p._h }); if (u2) { merged[merged.length - 1] = u2; nMerged++; continue; }
    }
    merged.push(d);
  }
  built = merged;
  const docs = [];
  for (const d of built) {
    const seq = docs.length + 1; const pg = d.pages.start;
    let ord = 1; if (pg !== null) { ord = (perPage.get(pg) || 0) + 1; perPage.set(pg, ord); }
    d.doc_id = pg !== null ? `or27-${part}:p${String(pg).padStart(4, '0')}.${ord}` : `or27-${part}:x${String(seq).padStart(5, '0')}`; d.seq = seq;
    docs.push(d);
  }
  // ---- years the OCR slipped on ("I860", "1S65") inside a run of 1863: read as their neighbours say
  docs.forEach((d, i) => {
    if (d.date && d.date.y !== 1863 && d.date.m >= 6 && d.date.m <= 8) {
      const prev = docs.slice(0, i).reverse().find((x) => x.date), next = docs.slice(i + 1).find((x) => x.date);
      if (prev && next && prev.date.y === 1863 && next.date.y === 1863 && [6, 7, 8].includes(prev.date.m) && [6, 7, 8].includes(next.date.m)) { d.date = { ...d.date, y: 1863, y_ocr: d.date.y }; d.confidence = 'B'; }
    }
  });
  // ---- the closing of a covering note: "...forwarded for your information: [dispatch] [dispatch] Respectfully, JUL. STAHEL, Major-General." is the cover's, not the last dispatch's
  const covers = [];
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i]; const sg = d._sigs; if (sg.length < 2) continue;
    const last = sg[sg.length - 1], prev = sg[sg.length - 2];
    const cl = d._ul.slice(prev.end, last.i).map((x) => x.trim()).filter(Boolean);
    if (!(cl.length === 1 && cl[0].length <= 80 && /^(?:Very\s+)?respectfully\b/i.test(cl[0]))) continue;
    let c = null; for (let j = i - 1; j >= 0 && j >= i - 4; j--) { const q = docs[j]; if (q._sigs.length === 0 && FORWARD.test(q.text.slice(-400))) { c = q; break; } if (q._sigs.length === 0) break; }
    if (!c) continue;
    c.signer = last.name; c.signer_title = last.title; c.closing = d._ul.slice(prev.end, last.end).map((x) => x.trim()).filter(Boolean).join(' ');
    c.sign_text = c.closing;
    const cut = prev.end; d._b = d._a + cut; d._ul = d._ul.slice(0, cut); d._sigs = sg.slice(0, -1); d._main = prev; d.signer = prev.name; d.signer_title = prev.title; d.sign_text = d._ul.join('\n');
    d.text = d._ul.join('\n').replace(/\s+$/, ''); d.end = lines[d._a + cut - 1].e; d.moved_closing = c.doc_id; covers.push([c.doc_id, d.doc_id]);
  }
  for (const d of docs) { delete d._ul; delete d._sigs; delete d._main; delete d._a; delete d._b; delete d._h; }
  const inWindow = (d) => d && d.y === 1863 && ((d.m === 6 && d.d >= 28) || (d.m === 7 && d.d <= 5));
  const report = {
    dispatches: docs.length, index_starts_at: end, confederate_section_starts_at: (() => { const k = lines.findIndex((x) => /^\W*CONFEDERATE\W{0,2}\s+CORRESPONDENCE/i.test(x.t.trim())); return k >= 0 ? lines[k].s : null; })(),
    by_side: docs.reduce((m, d) => { m[d.side] = (m[d.side] || 0) + 1; return m; }, {}), by_kind: docs.reduce((m, d) => { m[d.kind] = (m[d.kind] || 0) + 1; return m; }, {}),
    dated_1863: docs.filter((d) => d.date && d.date.y === 1863).length, with_clock: docs.filter((d) => d.clock).length, in_battle_window: docs.filter((d) => inWindow(d.date)).length,
    july_1_3: docs.filter((d) => d.date && d.date.y === 1863 && d.date.m === 7 && d.date.d >= 1 && d.date.d <= 3).length,
    july_1_3_with_clock: docs.filter((d) => d.date && d.date.y === 1863 && d.date.m === 7 && d.date.d >= 1 && d.date.d <= 3 && d.clock).length,
    pages_missing: docs.filter((d) => d.pages.start === null).length, with_signer: docs.filter((d) => d.signer).length, with_addressee: docs.filter((d) => d.addressee).length,
    quotations_kept_in_their_cover: nMerged, covers_moved_closing: covers.length, years_repaired: docs.filter((d) => d.date && d.date.y_ocr).length,
  };
  return { docs, report };
}

/** compat: header block, addressee, signer of one dispatch text */
export function dispatchFields(text) {
  const ul = String(text).split('\n'); const sigs = findSignatures(ul);
  let dl_ = -1; for (let k = 0; k < ul.length; k++) if (readDateline(ul[k], { prevOk: true })) { dl_ = k; break; }
  const dateline = dl_ >= 0 ? readDateline(ul[dl_], { prevOk: true }) : null;
  return { dateline, header: ul.slice(0, Math.max(0, dl_)).map((x) => x.trim()).filter(Boolean), addressee: dateline ? dateline.tail : null, signer: sigs.length ? sigs[sigs.length - 1].name : null };
}
