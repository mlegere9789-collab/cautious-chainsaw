// meta.mjs - per-report metadata of the Official Records: who wrote it, in what rank, for which unit, when, where, and how it should be cited.
//
//   reportMeta(doc, { part })   from the contents-list title (or the header when the contents list does not have it) and the dateline of the text:
//       author { raw, rank, rank_class, name }   rank_class: general | field | company | staff | civilian | none
//       unit, level      the unit the author writes for as the volume prints it ("Twentieth Maine Infantry", "commanding First Division") and its level:
//                        army | corps | division | brigade | artillery_brigade | regiment | battery | battalion | staff | return | order | other
//       kind             report | return | organization | itinerary | order | correspondence | proceedings | other
//       side             union | confederate (by the number ranges of the volume, checked against "C. S." in the title)
//       written          { y, m, d, text, place, basis }   the first dateline of the report, or null
//       scope            gettysburg | campaign | other (the contents list says "of operations June 13-15", "of skirmish near Greencastle")
//       persp            the labels the Historian shows: genre, contemporaneous, retrospective, lag_days, label
//       cite             "OR Ser. I, vol. 27, pt. 1, p. 622" (page = the first printed page; range when the report runs over several)
// Nothing here guesses: a field the volume does not give is null.
import { dl } from '../../../historian-src/core/text.js';
import { splitTocTitle } from './or27.mjs';
import { readDateline } from './or27-dispatch.mjs';

const RANKS = [
  ['Lieut. Gen.', 'Lieut. Gen.', 'general'], ['Lieutenant-General', 'Lieut. Gen.', 'general'], ['Maj. Gen.', 'Maj. Gen.', 'general'], ['Major-General', 'Maj. Gen.', 'general'], ['Brig. Gen.', 'Brig. Gen.', 'general'], ['Brigadier-General', 'Brig. Gen.', 'general'],
  ['Gen.', 'Gen.', 'general'], ['General', 'Gen.', 'general'], ['Lieut. Col.', 'Lieut. Col.', 'field'], ['Lieutenant-Colonel', 'Lieut. Col.', 'field'], ['Col.', 'Col.', 'field'], ['Colonel', 'Col.', 'field'], ['Maj.', 'Maj.', 'field'], ['Major', 'Maj.', 'field'],
  ['Capt.', 'Capt.', 'company'], ['Captain', 'Capt.', 'company'], ['Lieut.', 'Lieut.', 'company'], ['Lieutenant', 'Lieut.', 'company'], ['Sergt.', 'Sergt.', 'company'],
  ['Surg.', 'Surg.', 'staff'], ['Medical Inspector', 'Medical Inspector', 'staff'], ['Medical Director', 'Medical Director', 'staff'], ['Commodore', 'Commodore', 'general'],
  ['Hon.', 'Hon.', 'civilian'], ['Rev.', 'Rev.', 'civilian'], ['Dr.', 'Dr.', 'civilian'], ['Prof.', 'Prof.', 'civilian'], ['Mr.', 'Mr.', 'civilian'],
];
export function splitRank(author) {
  const a = String(author || '').replace(/\s+/g, ' ').trim();
  // the OCR drops the full stop after a rank ("Col Francis V. Randall", "Lieut Edward D. Muhlenberg"): compare without periods
  const bare = a.replace(/\./g, '').toLowerCase();
  for (const [pre, norm, cls] of RANKS) {
    const pb = pre.replace(/\./g, '').toLowerCase();
    if (bare.startsWith(pb + ' ') || bare === pb) { const m = a.match(new RegExp('^' + pre.split('').map((c) => (c === '.' ? '\\.?' : c.replace(/[-\\^$*+?()|[\]{}]/g, '\\$&'))).join('') + '\\s*', 'i')); return { rank: norm, rank_class: cls, name: a.slice(m ? m[0].length : pre.length).replace(/^[\s.,]+|[\s.,]+$/g, '') || null }; }
  }
  return { rank: null, rank_class: 'none', name: a.replace(/[.,]+$/, '') || null };
}

const ORDW = '(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Cavalry)';
/** the level of the unit the title names: by the command it says the author held */
export function levelOf(unitText, titleText = '') {
  const u = String(unitText || ''), t = String(titleText || '');
  const cmd = u.match(/commanding\s+(.+)$/i) ? u.match(/commanding\s+(.+)$/i)[1] : null;
  const c = cmd || '';
  if (/^(?:Organization|Itinerary|Return|Abstract|General Return)/i.test(t)) return /^Organization/i.test(t) ? 'organization' : /^Itinerary/i.test(t) ? 'itinerary' : 'return';
  if (/Army of (?:the )?(?:Potomac|Northern Virginia)|Army of the (?:Cumberland|James)|Department of|Middle Department|Army Corps\b.*Army of/i.test(c) && !/Corps|Division|Brigade/.test(c.replace(/Army Corps,? Army/, ''))) return 'army';
  if (/Artillery Brigade|Reserve Artillery|artillery of the|Chief of Artillery/i.test(c + ' ' + u)) return /Chief of Artillery/i.test(u) ? 'staff' : 'artillery_brigade';
  if (/Corps\b/.test(c) && !/Division|Brigade/.test(c)) return 'corps';
  if (/Division/.test(c) && !/Brigade/.test(c.replace(/(?:First|Second|Third|Fourth) Brigade,? (?:First|Second|Third|Fourth) Division/, ''))) return 'division';
  if (/Brigade|brigade/.test(c) || /commanding regiment and .*Brigade/i.test(u)) return 'brigade';
  if (/Battalion/i.test(c) || /Battalion/i.test(u)) return 'battalion';
  if (/\bBattery\b|Artillery|Howitzers/i.test(u)) return 'battery';
  if (/Infantry|Cavalry|Volunteers|Militia|Regiment|Zouaves|Rifles|Legion|Sharpshooters|Guard/i.test(u)) return 'regiment';
  if (/Chief|Medical|Aide|Adjutant|Inspector|Provost|Ordnance|Quartermaster|Engineer|Signal|Staff|Commissary/i.test(u + ' ' + t)) return 'staff';
  if (/Army\b/i.test(u) && /commanding/i.test(u)) return 'army';
  // a title cut short by the contents list's column layout ("Lieut. Col. John D. Musser, One hundred and forty-third Pennsylvania"): an ordinal and a state is a regiment
  if (/\b(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|hundred|[a-z]+-(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)|\d+(?:st|d|nd|rd|th))\b.*\b(?:Maine|New Hampshire|Vermont|Massachusetts|Rhode Island|Connecticut|New York|New Jersey|Pennsylvania|Delaware|Maryland|Ohio|Indiana|Illinois|Michigan|Wisconsin|Minnesota|Iowa|West Virginia|Virginia|North Carolina|South Carolina|Georgia|Alabama|Mississippi|Louisiana|Texas|Arkansas|Tennessee|Florida|Kentucky|Missouri)\b/i.test(u)) return 'regiment';
  return 'other';
}

const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** the first dateline within the first 14 non-blank lines after the title; failing that, the last one within the final 14 lines (a few reports are dated at their foot) */
export function writtenDate(text) {
  const lines = text.split('\n').map((x) => x.trim()).filter(Boolean);
  const head = lines.slice(0, 16);
  for (let i = 0; i < head.length; i++) { const d = readDateline(head[i]); if (d && !d.tail && d.month && d.year >= 1863 && d.year <= 1864) return { y: d.year, m: d.month, d: d.day, text: head[i], place: d.place || null, basis: 'head' }; }
  // a dateline run into the heading lines: "Hdqrs. 122d Ohio Yol. Infantry, June 18, 1863."
  for (let i = 0; i < head.length; i++) {
    const m = head[i].match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s*(\d{1,2})\s*,?\s*1\s?8\s?6\s?([34])\b/);
    if (m && head[i].length < 130 && i > 0) return { y: 1860 + +m[3], m: MON[m[1].slice(0, 3).toLowerCase()], d: +m[2], text: head[i], place: head[i].slice(0, m.index).replace(/[,\s]+$/, '') || null, basis: 'head' };
  }
  const foot = lines.slice(-16);
  for (let i = foot.length - 1; i >= 0; i--) { const d = readDateline(foot[i]); if (d && !d.tail && d.month && d.year >= 1863 && d.year <= 1864) return { y: d.year, m: d.month, d: d.day, text: foot[i], place: d.place || null, basis: 'foot' }; }
  return null;
}
const iso = (d) => (d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null);
const dayNumber = (d) => Math.round(Date.UTC(d.y, d.m - 1, d.d) / 86400000);
export const BATTLE_END = { y: 1863, m: 7, d: 3 };

/** which part of the campaign the report is about, from what the contents list says after the author and unit ("of operations June 13-15", "of skirmish near Greencastle, Pa.", "of engagement at Brandy Station") */
export function scopeOf(title, part, no) {
  const t = String(title || '');
  const note = (t.match(/,\s+((?:of|including|July|June)\s.*)$/i) || [])[1] || null;
  if (note && /operations?\s+(?:from\s+)?June\s+(?:1[0-9]|[1-9])\b(?!.*(?:July|Gettysburg))|skirmish|engagement at|action at|affair|Winchester|Brandy|Aldie|Upperville|Middleburg|Martinsburg|Greencastle|Funkstown|Williamsport|Falling Waters|Wapping|Manassas Gap|Hagerstown|Boonsborough|July\s+(?:[6-9]|1[0-9]|2[0-9])\b/i.test(note) && !/Gettysburg/i.test(note)) return { scope: 'other', note };
  if (part === 2 && no >= 379 && no <= 423 && !/Gettysburg/i.test(t)) return { scope: 'other', note };
  return { scope: 'gettysburg', note };
}

/** the first words of a header as the OCR printed them ("Eejjort of", "Deport of", "port of", "Bevort of", "Reports of") read as the words they are: "Report of" */
export function fixReportWord(h) {
  const m = /^(\S{2,9})\s+(?:of|o\/|ot)\b\s*/i.exec(h);
  if (m && /^[A-Za-z]+$/.test(m[1])) { const w = m[1].toLowerCase(); if (dl(w, 'report', 3) <= 3 || dl(w, 'reports', 3) <= 3 || w === 'port' || w === 'ports') return 'Report of ' + h.slice(m[0].length); }
  return h;
}
export function reportMeta(doc, { part = 1 } = {}) {
  // the segmenter's header text ("Report of Maj. Hugh H. Janeway, First New Jersey Cavalry."), with the OCR's usual damage to the first words and to a rank repaired
  const hdr = fixReportWord(String(doc.title || doc.header || '')).replace(/\bMag\./g, 'Maj.').replace(/Lieut5col\./g, 'Lieut. Col.');
  if (doc.toc_title) doc = { ...doc, toc_title: String(doc.toc_title).replace(/Lieut5col\./g, 'Lieut. Col.').replace(/^Lieut(?=\s)/, 'Lieut.') };
  const title = doc.toc_title || hdr || '';
  const isPerson = !!doc.toc_title ? splitRank(splitTocTitle(doc.toc_title).author).rank !== null : /^Reports? of\s+(?:Lieut|Col|Maj|Capt|Brig|Gen|Surg|Hon|Rev|Dr|Commodore|Sergt|Medical)/i.test(hdr || '');
  const sp = doc.toc_title ? splitTocTitle(doc.toc_title) : splitTocTitle(String(hdr || '').replace(/^[A-Za-z]*(?:port|ports)[s,.]?\s+(?:of|o\/|ot)\s+/i, ''));
  // a contents entry that runs the author into the service ("John Gibbon; U. S. Army, commanding ...") names the man before the semicolon
  if (isPerson) sp.author = sp.author.replace(/\s*;.*$/, '').trim();
  const rk = isPerson ? splitRank(sp.author) : { rank: null, rank_class: 'none', name: null };
  const unitText = isPerson ? sp.unit : '';
  const kind = isPerson ? 'report' : /^(?:General )?Return|^Abstract|^Recapitulation/i.test(title) ? 'return' : /^Organization/i.test(title) ? 'organization' : /^Itinerary/i.test(title) ? 'itinerary' : /Court of Inquiry|Proceedings/i.test(title) ? 'proceedings' : /^Medals/i.test(title) ? 'honors' : /^(?:Congratulatory|Address|Circular|Orders)/i.test(title) ? 'order' : /^Roll/i.test(title) ? 'roll' : 'other';
  const side = part === 1 ? 'union' : (doc.no >= 424 ? 'confederate' : 'union');
  const sideCheck = /C\.\s?S\.\s?(?:Army|A\b)|Confederate/.test(title) ? 'confederate' : (/U\.\s?S\.\s?(?:Army|Vol)|Union/.test(title) ? 'union' : null);
  const wr = writtenDate(doc.text);
  let sc = scopeOf(doc.toc_title || hdr, part, doc.no);
  // a heading under which the volume prints several documents (the army commander's report with his correspondence, a general's report with its inclosures): its first dateline is not the date of the report.
  // "Reports of" (plural) says so itself, and so does a first dateline that carries a clock time ("5.25 [p. m., July 1, 1863.]", "July 1, 1863 - 5 p. m."): that is a dispatch printed first, the report follows it
  const rawHead = String(doc.title || doc.header || '').replace(/^[^A-Za-z]+/, '');
  const pluralHead = /^[A-Za-z]{0,4}ports\b/.test(rawHead) || /^[A-Za-z]{1,3}\s?ports\b/.test(rawHead);
  const timedHead = !!(wr && dayNumber(wr) >= dayNumber({ y: 1863, m: 6, d: 28 }) && dayNumber(wr) <= dayNumber({ y: 1863, m: 7, d: 5 }) && /\b\d{1,2}\s*[.:]\s*\d{2}\b|\b\d{1,2}\s*[ap]\.?\s?m\b/i.test(wr.text));
  const composite = isPerson && (/correspondence|including/i.test(title) || pluralHead || timedHead || (doc.pages && doc.pages.start !== null && doc.pages.end !== null && doc.pages.end - doc.pages.start > 30));
  // a report written before the battle (the June actions at Aldie, Brandy Station, Winchester) is not about the Gettysburg fighting, whatever the contents list says
  if (sc.scope === 'gettysburg' && wr && !composite && dayNumber(wr) < dayNumber({ y: 1863, m: 6, d: 28 })) sc = { scope: 'other', note: sc.note || 'written before the battle: an earlier action of the campaign' };
  const lag = wr && sc.scope === 'gettysburg' && !composite ? dayNumber(wr) - dayNumber(BATTLE_END) : null;
  const p0 = doc.pages && doc.pages.start, p1 = doc.pages && doc.pages.end;
  const cite = p0 === null || p0 === undefined ? `OR Ser. I, vol. 27, pt. ${part}` : `OR Ser. I, vol. 27, pt. ${part}, p${p1 && p1 !== p0 ? 'p' : ''}. ${p0}${p1 && p1 !== p0 ? '–' + p1 : ''}`;
  const genre = kind === 'report' ? 'official_report' : kind === 'return' ? 'return' : kind === 'organization' ? 'order_of_battle' : kind === 'itinerary' ? 'itinerary' : kind;
  const label = kind === 'report' ? (composite ? 'official report, written after the fact (the volume prints several documents under this heading)' : wr ? `official report, written ${monthName(wr.m)} ${wr.d}, ${wr.y}, after the fact` : 'official report, written after the fact (the volume prints no date)') : kind === 'return' ? 'official return' : kind === 'organization' ? 'official order of battle' : 'official record';
  return {
    id: doc.doc_id, part, no: doc.no, title: String(hdr || '').replace(/\s+/g, ' ').trim() || null, toc_title: doc.toc_title || null, kind, side, side_check: sideCheck, side_agrees: sideCheck ? sideCheck === side : null,
    author: isPerson ? { raw: sp.author, rank: rk.rank, rank_class: rk.rank_class, name: rk.name } : null, unit: unitText || null, level: levelOf(unitText, title), scope: sc.scope, scope_note: sc.note,
    written: wr ? { iso: iso(wr), text: wr.text, place: wr.place, basis: wr.basis, composite } : null, composite,
    pages: { start: p0 === undefined ? null : p0, end: p1 === undefined ? null : p1 },
    persp: { side, genre, contemporaneous: false, retrospective: kind === 'report', lag_days: lag, label },
    cite, confidence: doc.confidence, recovered: doc.recovered || null,
  };
}
const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m) => MONTH_NAMES[m] || '';

/** metadata of a Part 3 dispatch: the sender signs it, the volume dates it, the header gives its clock time */
export function dispatchMeta(doc, { part = 3 } = {}) {
  const d = doc.date; const wr = d ? { iso: iso(d), text: doc.date_text, place: doc.place, basis: 'dateline' } : null;
  const p0 = doc.pages.start, p1 = doc.pages.end;
  const cite = p0 === null ? `OR Ser. I, vol. 27, pt. ${part}` : `OR Ser. I, vol. 27, pt. ${part}, p${p1 && p1 !== p0 ? 'p' : ''}. ${p0}${p1 && p1 !== p0 ? '–' + p1 : ''}`;
  const kind = doc.kind === 'order' ? 'order' : doc.kind === 'itinerary' ? 'itinerary' : doc.kind === 'return' ? 'return' : 'correspondence';
  const label = d ? (kind === 'return' ? `return dated ${monthName(d.m)} ${d.d}, ${d.y}` : kind === 'order' ? `order dated ${monthName(d.m)} ${d.d}, ${d.y}` : `dispatch dated ${monthName(d.m)} ${d.d}, ${d.y}${doc.clock ? ', ' + doc.clock.text : ''}, written at the time`) : 'dispatch';
  return {
    id: doc.doc_id, part, no: null, title: doc.header || null, toc_title: null, kind, side: doc.side, side_check: null, side_agrees: null,
    author: doc.signer ? { raw: doc.signer, rank: null, rank_class: 'none', name: doc.signer } : null, unit: null, level: 'other', scope: d && d.y === 1863 && ((d.m === 6 && d.d >= 28) || (d.m === 7 && d.d <= 5)) ? 'gettysburg' : 'campaign', scope_note: null,
    addressee: doc.addressee || null, written: wr, pages: { start: p0, end: p1 },
    persp: { side: doc.side, genre: kind === 'order' ? 'order' : kind === 'return' ? 'return' : 'dispatch', contemporaneous: true, retrospective: false, lag_days: null, label },
    cite, confidence: doc.confidence, recovered: null, clock: doc.clock ? { text: doc.clock.text, min: doc.clock.min } : null, received: doc.received || null, signer_title: doc.signer_title || null,
  };
}
