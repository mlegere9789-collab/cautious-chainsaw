// anchors.mjs - the clock-time claims of one document, in the passage that holds them.
//
// A claim is one clock expression (times.mjs parseClock) read in its sentence, with
//   the span in the PASSAGE text (s, e) and in its sentence (the quotable unit),
//   the day it is said about (times.mjs dayTracker over the document read in order: a date in the sentence, "the 2d", a weekday, a day carried from an earlier sentence, a dispatch's dateline),
//   the evidence class: 'dispatch-header' (the sender's own dateline: written as sent), 'dispatch-body' (a time stated inside a dispatch dated that day), 'report' (the author's recollection in a report
//   written after the fact; lag_days says how long after), and the author, rank, unit and side of the document.
// Table rows are not claims: a casualty return's "9 a. m 60" column of hours is a table, and a sentence that is mostly digits and abbreviations is skipped.
// Nothing is converted from a tick; minutes are the 1863 local clock as printed.
import { splitSentences } from '../../../historian-src/core/text.js';
import { parseClock, dayTracker, isoDay } from './times.mjs';

const letters = (s) => (s.match(/[A-Za-z]/g) || []).length;
const DATELINE_SHAPE = /^\s*[A-Z][a-z]+[^.]{0,40}\d{4}|^\s*[A-Z][^\n]{0,60}?\b(?:Jan|Feb|Mar|Apr|May|June?|July?|Aug|Sept?|Oct|Nov|Dec)[a-z]*\.?\s+[0-9lI]{1,2}[^\n]{0,8}?\d{4}/;
/** the printed page a passage offset lies on, from the passage's page list [[offset, page], ...] */
const pageAt = (pg, off) => { let r = null; for (const e of pg || []) { if (e[0] <= off) { if (e[1] !== null && e[1] !== undefined) r = e[1]; } else break; } return r; };
const prose = (s) => { const w = s.match(/[A-Za-z]{3,}/g) || []; return w.length >= 4 && letters(s) / Math.max(1, s.length) >= 0.55; };

/**
 * @param meta      reportMeta / dispatchMeta of the document
 * @param passages  the document's passages in order ({ id, text })
 * @param opts.units  optional: (sentenceText) => unit ids named in that sentence (A/B links), for the claim's subject units
 * @returns claims[]
 */
export function claimsOfDoc(meta, passages, { units = null, subjectUnits = [], regOut = null } = {}) {
  if (!['report', 'correspondence', 'order'].includes(meta.kind)) return [];
  const written = meta.written && meta.written.iso ? { y: +meta.written.iso.slice(0, 4), m: +meta.written.iso.slice(5, 7), d: +meta.written.iso.slice(8, 10) } : null;
  const dispatch = meta.persp && meta.persp.contemporaneous;
  const tracker = dayTracker({ month: written ? written.m : 7, start: dispatch && written ? written : null });
  const out = [];
  let n = 0;
  passages.forEach((p, pi) => {
    if (regOut) regOut.set(p.id, tracker.state());                                                      // the day the narrative stands on when the passage opens
    const sents = splitSentences(p.text);
    sents.forEach((x, k) => {
      const text = p.text.slice(x.s, x.e);
      // a report's own heading and dateline ("No. 196. Report of Col. ... Field near Emmitsburg, July 6, 1863.") date its WRITING, not the events: they set no day and make no claim
      if (!dispatch && pi === 0 && x.s < 450 && /\b186[34]\b/.test(text)) return;
      const cl = parseClock(text, { ctx: text });
      const days = tracker.at(text, cl.length ? cl : [text.length], p.text.slice(x.e, x.e + 40));          // every sentence moves the day register; each clock reads the day as it stood at its own position
      if (!cl.length) return;
      // a dateline is not prose but it is a claim: "Harrisburg, Pa., June 21, 1863—9.45 p. m." (the old shape test, a capitalised word and a year within 40 characters with no full stop between, refused every dateline whose
      // place carries one - "Pa.,", "Md.,", "Va.," - and 252 of the 1,388 dispatches that print a clock in their header had no claim for it)
      if (!prose(text) && !DATELINE_SHAPE.test(text)) return;
      for (const [ci, c] of cl.entries()) {
        const day = days[ci];
        // the dateline's own clock: the first clock of the first passage when it is the one the segmenter read from the header line
        const inHeader = !!(dispatch && pi === 0 && meta.clock && c.text.replace(/\s+/g, '') === String(meta.clock.text || '').replace(/\s+/g, '') && c.s < 260 && !out.some((o) => o.passage === p.id && o.evidence === 'dispatch-header'));
        const evidence = dispatch ? (inHeader ? 'dispatch-header' : 'dispatch-body') : 'report';
        // a report about operations elsewhere (the contents list says "of operations June 13-15") has no battle day unless its sentence names one
        const off = meta.scope && meta.scope !== 'gettysburg' && !(dispatch || day.basis === 'same' || day.basis === 'later');
        const dayIso = inHeader && written ? isoDay(written) : off ? null : isoDay(day.day);
        out.push({
          id: `${p.id}~${n++}`, passage: p.id, doc: meta.id, sentence: k, ss: x.s, se: x.e, s: x.s + c.s, e: x.s + c.e, text: c.text, kind: c.kind, min: c.min, ampm: c.ampm || null, cand: c.cand || null, tol: c.tol, mod: c.mod,
          from: c.from === undefined ? null : c.from, to: c.to === undefined ? null : c.to, word: c.word || null,
          day: dayIso, day_basis: inHeader ? 'dateline' : off ? 'scope-other' : day.basis, day_age: inHeader ? 0 : day.age, scope: meta.scope, evidence,
          author: meta.author ? [meta.author.rank, meta.author.name].filter(Boolean).join(' ') : null, rank_class: meta.author ? meta.author.rank_class : null, unit: meta.unit || null, side: meta.side,
          written: meta.written ? meta.written.iso : null, lag_days: meta.persp ? meta.persp.lag_days : null, page: pageAt(p.pg, x.s + c.s) ?? (meta.pages ? meta.pages.start : null),
          units: [...new Set([...(subjectUnits || []), ...(units ? units(text) : [])])],
        });
      }
    });
  });
  // The header clock of a dispatch that the sentence reader could not take from the text as printed ("June 6, 1863 — 10 a." with the "m." on a line of its own, "10.15 p. im", "11 a. -m.", "June 10. 1863—10 a. m."): the
  // dispatch table read the clock (segmenter repair, meta.clock) and the claim is made from that minute, at the digits where the passage prints them. The claim says what the passage prints; the minute is the repaired one.
  if (dispatch && meta.clock && Number.isFinite(meta.clock.min) && written && passages.length && !out.some((o) => o.evidence === 'dispatch-header')) {
    const p = passages[0], head = p.text.slice(0, 420), mn = meta.clock.min % 1440, h12 = Math.floor(mn / 60) % 12 || 12, mm = mn % 60;
    const yr = /1[8I]\s?6\s?[0-9]/.exec(head); const from = yr ? yr.index + yr[0].length : 0;
    const re = new RegExp(`(?<![0-9.:])0?${h12}(?:\\s?[.:,]\\s?${String(mm).padStart(2, '0')})${mm === 0 ? '?' : ''}(?![0-9])`);
    const m = re.exec(head.slice(from));
    if (m) {
      const s = from + m.index; let e = s + m[0].length; const tail = /^[ 	]?-?[ 	]?[ap]\.?[ 	]?-?[ 	]?[a-z]{0,2}\.?/i.exec(head.slice(e)); if (tail && tail[0].length <= 8) e += tail[0].length;
      const sents = splitSentences(p.text); const k = Math.max(0, sents.findIndex((x) => x.s <= s && s < x.e)); const x = sents[k] || { s: 0, e: p.text.length };
      out.push({
        id: `${p.id}~${n++}`, passage: p.id, doc: meta.id, sentence: k, ss: x.s, se: x.e, s, e, text: p.text.slice(s, e), kind: 'clock', min: mn, ampm: mn >= 720 ? 'pm' : 'am', cand: null, tol: 5, mod: 'at', from: null, to: null, word: null,
        day: isoDay(written), day_basis: 'dateline', day_age: 0, scope: meta.scope, evidence: 'dispatch-header',
        author: meta.author ? [meta.author.rank, meta.author.name].filter(Boolean).join(' ') : null, rank_class: meta.author ? meta.author.rank_class : null, unit: meta.unit || null, side: meta.side,
        written: meta.written ? meta.written.iso : null, lag_days: meta.persp ? meta.persp.lag_days : null, page: pageAt(p.pg, s) ?? (meta.pages ? meta.pages.start : null),
        units: [...new Set([...(subjectUnits || [])])],
      });
    }
  }
  return out;
}

/** summary of a claim list: how many, how many resolved to a minute, how many have a day */
export function summarize(claims) {
  const by = (f) => claims.reduce((m, c) => { const k = f(c); m[k] = (m[k] || 0) + 1; return m; }, {});
  return {
    claims: claims.length, with_minute: claims.filter((c) => c.min !== null).length, ambiguous_meridiem: claims.filter((c) => c.min === null && c.cand).length,
    with_day: claims.filter((c) => c.day).length, by_kind: by((c) => c.kind), by_evidence: by((c) => c.evidence), by_day_basis: by((c) => c.day_basis), by_side: by((c) => c.side),
    battle_days: claims.filter((c) => c.day && /^1863-07-0[123]$/.test(c.day)).length,
  };
}
