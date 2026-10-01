// or27-dispatch.mjs - Official Records, Series I, vol. 27, PART 3 (correspondence, orders and returns, June 3 - August 3, 1863): the dispatch segmenter.
//
// Part 3 has no "No. N. / Report of ..." headers (the report segmenter finds 0): its items are dispatches, each opened by a dateline, usually with the sender's headquarters above it and the
// addressee below:
//     Headquarters Third Corps,                   Headquarters Army of the Potomac,
//     Emmitsburg, July 1, 1863 - 3.15 p. m.         Camp near Falmouth, Va., June 3, 1863.
//     Major-General Howard,                       June 3, 1863 - 10 p. m.
// A dispatch is cut at its dateline (a short line that is a place and a date, or a date alone, with an optional clock time), widened upwards over the header lines that belong to it
// ("Headquarters ...,", "GENERAL ORDERS,", "No. 175.", "[Inclosure.]"), and runs to the next dispatch. Everything after the index heading is not text of the volume (the index).
// What it gives each dispatch: the date, the clock time of the header (the best clock evidence in the corpus: the sender wrote it as he sent it), the place, the addressee, the signer, the side
// (the volume prints the Union correspondence first, then "CONFEDERATE CORRESPONDENCE, ETC."), the printed pages.
// It does NOT split a document that holds several dated entries on one dateline-less run (an itinerary, an abstract); those are one document, kind 'itinerary' or 'other'.
import { parseClock } from './times.mjs';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const MONTH_RE = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';
// "June 3, 1863", "July 1, 1 863", "Aug. 2, 1863", "June 15, 1862" (the year is read as 18 + two digits so that an OCR slip in the last digit still opens a dispatch)
const DATE = new RegExp(`(${MONTH_RE})\\.?\\s*(\\d{1,2})\\s*,?\\s*1\\s?8\\s?6\\s?(\\d)`);
const CLOCK_TAIL = /^\s*(?:[-—–]{1,3}\s*)?(?:\(?\s*\d{1,2}\s*[.:]?\s*\d{0,2}\s*[ap]\.?\s?m\.?\)?|noon|midnight|\(?\s*Received\b[^)]*\)?|\d{1,2}\s*o.?clock[^\n]{0,20})?[\s.,;:\-—–*\]]*$/i;
// the header lines that open a dispatch above its dateline
const HEADLINE = /^(?:\[?\s*Inclosure|Hdqrs\b|Hd\.?\s*qrs|Headquarters|Head-?quarters|Office\b|Dept\b|Department\b|War Department|Executive\b|Telegram|Cipher|Cavalry\b|Camp\b|Hq\b|GENERAL ORDERS|SPECIAL ORDERS|SPECIAL FIELD ORDERS|CIRCULAR|ORDERS|No\.?\s*\d{1,3}\s*[.,]?\s*\S{0,3}$|Via\b|By telegraph|Received\b|Respectfully)/i;
const LONE_NUM = /^\s*[\[(]?\s*\d{1,4}\s*[\])]?\s*$/;

const monthOf = (s) => MONTHS[s.slice(0, 3).toLowerCase()] || null;
/** a dateline: a short line that is (place,) date (, clock); returns { month, day, year, place, clock } or null */
export function readDateline(line) {
  const t = line.trim();
  if (t.length < 9 || t.length > 118) return null;
  const m = DATE.exec(t); if (!m) return null;
  const pre = t.slice(0, m.index).replace(/^[\s\W]+/, '').trim(), post = t.slice(m.index + m[0].length);
  // the place before the date is capitalised words, commas and abbreviations ("Camp near Frederick City, Md.,", "In the Field, near Gettysburg, Pa.,"); a sentence before the date is not a dateline
  if (pre.length > 78 || /[a-z]{3,}\s+(?:is|was|are|were|has|have|had|will|would|can|could|did|do|does|dated|received|of|on|in the)\s+[a-z]/.test(pre) && !/^(?:In the|Near|Camp|On the)/.test(pre)) return null;
  if (/[.;!?]\s+[A-Z][a-z]+\s+[a-z]{3,}/.test(pre.replace(/\b(?:Md|Pa|Va|Mo|Col|Gen|Maj|Capt|Lieut|Brig|Co|Jr|St|Ft|No|D|C)\./g, ''))) return null;
  if (!CLOCK_TAIL.test(post)) return null;
  const year = 1860 + (+m[3]);
  const clk = parseClock(post.replace(/^[\s—–-]+/, ''));
  return { month: monthOf(m[1]), day: +m[2], year, place: pre.replace(/[,\s]+$/, ''), clock: clk && clk.length ? clk[0] : null, line: t };
}

const SIGNER = /^[A-Z][A-Z .'’\-]{3,42},?$/;
const RECIPIENT_CUE = /^(?:(?:Maj(?:or)?|Brig(?:adier)?|Lieut(?:enant)?|Col(?:onel)?|Capt(?:ain)?|Gen(?:eral)?|Hon|His Excellency|The President|The Secretary|Commanding|Chief|Adjutant|Assistant|Mr|Governor|Dr|Surg)\b)/i;

/** header block, addressee, signer of one dispatch text */
export function dispatchFields(text) {
  const lines = text.split('\n');
  let dl = lines.findIndex((l) => readDateline(l));
  const dateline = dl >= 0 ? readDateline(lines[dl]) : null;
  const header = lines.slice(0, Math.max(0, dl)).map((x) => x.trim()).filter(Boolean);
  let addressee = null;
  for (let i = (dl >= 0 ? dl + 1 : 0); i < Math.min(lines.length, (dl >= 0 ? dl : 0) + 9); i++) {
    const t = lines[i].trim(); if (!t) continue;
    if (RECIPIENT_CUE.test(t) && t.length < 110) { addressee = t.replace(/[:,\s]+$/, ''); break; }
    if (/^(?:General|Sir|Colonel|Captain|Major|Dear)\b\s*[:,]/.test(t)) break;
  }
  let signer = null;
  const tail = lines.slice(-12).map((x) => x.trim()).filter(Boolean);
  for (let i = tail.length - 1; i >= 0; i--) { if (SIGNER.test(tail[i]) && /[A-Z]{3,}/.test(tail[i])) { signer = tail[i].replace(/[,\s]+$/, ''); break; } }
  return { dateline, header, addressee, signer };
}

/**
 * Cut the dispatches of Part 3.
 * @param norm  { text, pages: [{offset, page}] } from normalizeOcr
 * @returns { docs, report }
 */
export function segmentDispatches(norm, { part = 3 } = {}) {
  const text = norm.text;
  const lines = []; { let off = 0; for (const l of text.split('\n')) { lines.push({ t: l, s: off, e: off + l.length }); off += l.length + 1; } }
  // the volume ends in its index: the first INDEX heading in the last fifth of the text
  // (the "ALTERNATE DESIGNATIONS" table that precedes the index is back matter too: "Zachry's (Charles T.) Infantry. See Georgia Troops, 27th Regiment.")
  let end = text.length; { const tail = text.length * 0.8; const m = /(?:^|\n)\s*(?:INDEX|ALTERNATE DESIGNATIONS)\.?\s*(?:\n|$)/g; let x; while ((x = m.exec(text))) if (x.index > tail) { end = x.index; break; } }
  // the Confederate correspondence begins at its own heading
  const confAt = (() => { const m = /(?:^|\n)\s*CONFEDERATE CORRESPONDENCE, ETC\.?\s*(?:\n|$)/.exec(text); return m ? m.index : Infinity; })();
  const starts = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].s >= end) break;
    const dl = readDateline(lines[i].t); if (!dl) continue;
    // widen upwards over header lines that belong to this dispatch (at most three, across at most one blank gap each), never into the previous dispatch's body
    let first = i, blanks = 0, taken = 0;
    for (let k = i - 1; k >= 0 && taken < 4; k--) {
      const t = lines[k].t.trim();
      if (!t) { if (++blanks > 2) break; continue; }
      if (LONE_NUM.test(t)) { blanks = 0; continue; }
      if (HEADLINE.test(t) && t.length <= 100 && !/^Respectfully/i.test(t)) { first = k; taken++; blanks = 0; continue; }
      break;
    }
    // a dateline whose own previous line is the previous dateline's tail ("June 3, 1863." / "June 3, 1863 - 10 p. m." twice in a row) is one dispatch
    if (starts.length && lines[starts[starts.length - 1].dl].e >= lines[first].s - 2) continue;
    starts.push({ first, dl: i, line: dl });
  }
  const docs = [];
  const pageAt = (off) => { let p = null; for (const m of norm.pages) { if (m.offset <= off) p = m.page; else break; } return p; };
  const perPage = new Map();
  starts.forEach((st, k) => {
    const start = lines[st.first].s, stop = k + 1 < starts.length ? lines[starts[k + 1].first].s : end;
    const body = text.slice(start, stop).replace(/\s+$/, '');
    if (body.trim().length < 20) return;
    const f = dispatchFields(body);
    const pg = pageAt(start);
    const side = start >= confAt ? 'confederate' : 'union';
    const seq = docs.length + 1;
    let ord = 1; if (pg !== null) { ord = (perPage.get(pg) || 0) + 1; perPage.set(pg, ord); }
    const first = body.split('\n').map((x) => x.trim()).find(Boolean) || '';
    const kind = /^GENERAL ORDERS|^SPECIAL (?:FIELD )?ORDERS|^CIRCULAR|^ORDERS/i.test(first) ? 'order' : /^Itinerary/i.test(first) ? 'itinerary' : 'dispatch';
    docs.push({
      doc_id: pg !== null ? `or27-${part}:p${String(pg).padStart(4, '0')}.${ord}` : `or27-${part}:x${String(seq).padStart(5, '0')}`, no: null, seq, kind, header: f.header.join(' / '), toc_title: null,
      date: st.line.month ? { y: st.line.year, m: st.line.month, d: st.line.day } : null, date_text: st.line.line, clock: st.line.clock, place: st.line.place || null, addressee: f.addressee, signer: f.signer, side,
      start, end: stop, text: body, pages: { start: pg, end: pageAt(Math.max(start, stop - 1)) }, confidence: st.line.month && st.line.year === 1863 ? 'A' : 'B', recovered: null,
    });
  });
  const inWindow = (d) => d && d.y === 1863 && ((d.m === 6 && d.d >= 28) || (d.m === 7 && d.d <= 5));
  const report = {
    dispatches: docs.length, index_starts_at: end, confederate_section_starts_at: Number.isFinite(confAt) ? confAt : null,
    by_side: docs.reduce((m, d) => { m[d.side] = (m[d.side] || 0) + 1; return m; }, {}), by_kind: docs.reduce((m, d) => { m[d.kind] = (m[d.kind] || 0) + 1; return m; }, {}),
    dated_1863: docs.filter((d) => d.date && d.date.y === 1863).length, with_clock: docs.filter((d) => d.clock).length, in_battle_window: docs.filter((d) => inWindow(d.date)).length,
    july_1_3: docs.filter((d) => d.date && d.date.y === 1863 && d.date.m === 7 && d.date.d >= 1 && d.date.d <= 3).length,
    july_1_3_with_clock: docs.filter((d) => d.date && d.date.y === 1863 && d.date.m === 7 && d.date.d >= 1 && d.date.d <= 3 && d.clock).length,
    pages_missing: docs.filter((d) => d.pages.start === null).length,
  };
  return { docs, report };
}
