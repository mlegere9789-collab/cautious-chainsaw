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
const prose = (s) => { const w = s.match(/[A-Za-z]{3,}/g) || []; return w.length >= 4 && letters(s) / Math.max(1, s.length) >= 0.55; };

/**
 * @param meta      reportMeta / dispatchMeta of the document
 * @param passages  the document's passages in order ({ id, text })
 * @param opts.units  optional: (sentenceText) => unit ids named in that sentence (A/B links), for the claim's subject units
 * @returns claims[]
 */
export function claimsOfDoc(meta, passages, { units = null, subjectUnits = [] } = {}) {
  if (!['report', 'correspondence', 'order'].includes(meta.kind)) return [];
  const written = meta.written && meta.written.iso ? { y: +meta.written.iso.slice(0, 4), m: +meta.written.iso.slice(5, 7), d: +meta.written.iso.slice(8, 10) } : null;
  const dispatch = meta.persp && meta.persp.contemporaneous;
  const tracker = dayTracker({ month: written ? written.m : 7, start: dispatch && written ? written : null });
  const out = [];
  let n = 0;
  passages.forEach((p, pi) => {
    const sents = splitSentences(p.text);
    sents.forEach((x, k) => {
      const text = p.text.slice(x.s, x.e);
      const day = tracker(text);
      const cl = parseClock(text, { ctx: text });
      if (!cl.length) return;
      if (!prose(text) && !/^\s*[A-Z][a-z]+[^.]{0,40}\d{4}/.test(text)) return;
      for (const c of cl) {
        // the dateline's own clock: the first clock of the first passage when it is the one the segmenter read from the header line
        const inHeader = !!(dispatch && pi === 0 && meta.clock && c.text.replace(/\s+/g, '') === String(meta.clock.text || '').replace(/\s+/g, '') && c.s < 260 && !out.some((o) => o.passage === p.id && o.evidence === 'dispatch-header'));
        const evidence = dispatch ? (inHeader ? 'dispatch-header' : 'dispatch-body') : 'report';
        const dayIso = inHeader && written ? isoDay(written) : isoDay(day.day);
        out.push({
          id: `${p.id}~${n++}`, passage: p.id, doc: meta.id, sentence: k, ss: x.s, se: x.e, s: x.s + c.s, e: x.s + c.e, text: c.text, kind: c.kind, min: c.min, ampm: c.ampm || null, cand: c.cand || null, tol: c.tol, mod: c.mod,
          from: c.from === undefined ? null : c.from, to: c.to === undefined ? null : c.to, word: c.word || null,
          day: dayIso, day_basis: inHeader ? 'dateline' : day.basis, evidence,
          author: meta.author ? [meta.author.rank, meta.author.name].filter(Boolean).join(' ') : null, rank_class: meta.author ? meta.author.rank_class : null, unit: meta.unit || null, side: meta.side,
          written: meta.written ? meta.written.iso : null, lag_days: meta.persp ? meta.persp.lag_days : null, page: meta.pages ? meta.pages.start : null,
          units: [...new Set([...(subjectUnits || []), ...(units ? units(text) : [])])],
        });
      }
    });
  });
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
