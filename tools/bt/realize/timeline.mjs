// The timeline rows as the realization harness reads them: the printed row (GOVERNANCE/timeline_seed.jsonl, never edited), its evidence status (timeline_verified.jsonl),
// the corrected claim where another workstream has written one (GOVERNANCE/timeline_corrections/<shard>.jsonl), and the ALLOWED WINDOW of the row: the minutes at which a check of
// its realization may look. The allowed window comes from the printed time cell of the row and the stated conventions of tolerances.json; it is a necessary condition only (a check
// outside it can never realize the row); what the product shows inside it is the business of the checks.
//
// Why this file parses the time cell again: GOVERNANCE/timeline_windows.jsonl was parsed from the first fragment of the cell only (the PDF table wraps cells, and the seed keeps the
// fragments apart), so a cell such as "Jul 1 evening (about 18:00- 21:00)" is a point at 18:00 there, and "Jul 3 early NIGHT" is the night AFTER 3 July there. The whole cell is read
// here; where the result differs from the windows file the row is flagged (differs_from_windows_file) and both are shown by `node tools/bt/realize/q.mjs row <id>`.
import path from 'node:path'; import fs from 'node:fs';
import { GOV, readJSON, readJSONL, exists, minOf, isoOf, MON, fold, rel } from './lib.mjs';

const MONS = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
const MONTH_LEN = { 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30 };
const BAND_CELL = /^\[?(NIGHT|DUSK|DAWN|TWILIGHT|NIGHT\/TWILIGHT|NIGHT\/DUSK)\]?$/, NOTE_CELL = /^\((carry-?\s?over|time n\/s|hour not given|time unstated)\)$/i, DATE_BAND_CELL = new RegExp(`^(${MONS}) \\d+ (NIGHT|DUSK|DAWN)`);
const DANGLING = new RegExp(`(\\bor|\\band|\\bto|\\bthrough|\\bthrough (${MONS})|-|\\bearly|\\bnear)$`);

// the printed cells of a row: the time cell (re-joined across the fragments it was wrapped into), the cells of the place, unit and action columns, the tier cell, and the note and source cells
export function splitCells(textRaw, tier) {
  const all = String(textRaw || '').split(' | '), tw = String(tier || '').toLowerCase();
  const isTier = c => { const x = c.trim().toLowerCase(); return x === tw || x.startsWith(tw + ' (') || ['documented', 'inferred', 'plausible-procedural', 'open gap'].includes(x); };
  const open = s => s.split('(').length > s.split(')').length;
  let cells = all.slice(1), head = all[0] || '';
  for (let guard = 0; cells.length && guard < 8; guard++) {
    const nx = cells[0].trim();
    if (isTier(nx)) break;
    if (open(head)) {                                   // a parenthesis left open by the wrap: take up to three more fragments; if it never closes the fragments belong to other columns and are given back
      const saveHead = head, saveCells = cells.slice(); let k = 0; while (cells.length && open(head) && k < 3 && !isTier(cells[0].trim())) { head += ' ' + cells.shift(); k++; }
      if (open(head)) { head = saveHead; cells = saveCells; break; }
      continue;
    }
    if (DANGLING.test(head.trim()) || BAND_CELL.test(nx) || NOTE_CELL.test(nx) || DATE_BAND_CELL.test(nx)) head += ' ' + cells.shift(); else break;
  }
  const ti = cells.findIndex(isTierCell(tw));
  return { time_cell: head.replace(/\s+/g, ' ').trim(), what: ti >= 0 ? cells.slice(0, ti) : cells, after: ti >= 0 ? cells.slice(ti + 1) : [], tier_found: ti >= 0 };
}
// the tier cell of a row: the tier word alone, or the tier word followed by a remark in parentheses ("inferred (single weak source)", wrapped over two fragments)
const isTierCell = tw => c => { const x = c.trim().toLowerCase(); return x === tw || x.startsWith(tw + ' ('); };

const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
// ---- the printed time cell -> intervals of minutes (absolute, since 1 June 1863 00:00 LMT), with the basis of every decision
export function parseTimeCell(cell, tol) {
  const T = tol.time, CT = T.clock_tolerance_min, P = T.day_parts, sun = Object.fromEntries(Object.entries(T.sun_table_lmt).map(([k, v]) => [k, hm(v)]));
  const out = { cell, intervals: [], basis: [], flags: [], dates: [], kind: null };
  const raw = String(cell || '').replace(/[≈~]/g, ' about ').replace(/[‐‑‒–—]/g, '-').replace(/\s+/g, ' ').trim();
  const parens = []; const main0 = raw.replace(/\(([^)]*)\)/g, (_, p) => { parens.push(p.trim()); return ' '; }).replace(/\s+/g, ' ').trim();
  const ptext = parens.join(' ; ');
  const day0 = (mo, d) => minOf(mo, d);
  const monEnd = mo => minOf(mo, MONTH_LEN[mo]) + 1440;
  const okMon = m => MON[m.slice(0, 3)] >= 6 && MON[m.slice(0, 3)] <= 11;
  // ---- dates
  let m, main = main0, dates = [], span = null;                // dates: [mo, d] list (alternatives); span: [startMin, endMin] for a run of whole dates
  const D1 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2})\\s*-\\s*(${MONS})[a-z]*\\.? (\\d{1,2})`), D2 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2})-(\\d{1,2})(?![:\\d])`), D3 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2}) or (\\d{1,2})(?![:\\d])`),
    D4 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2}) \\/ (${MONS})[a-z]*\\.? (\\d{1,2})`), D5 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2})\\+`), D6 = new RegExp(`^(${MONS})[a-z]*\\.? (\\d{1,2})(?![:\\d])`), D7 = new RegExp(`^(${MONS})[a-z]*-(${MONS})[a-z]*$`), D8 = new RegExp(`^(${MONS})[a-z]*$`);
  let pair = null, openEnd = false;
  if ((m = D7.exec(main)) && okMon(m[1]) && okMon(m[2])) { span = [day0(MON[m[1]], 1), monEnd(MON[m[2]])]; out.basis.push(`months ${m[1]} to ${m[2]}: the whole of both`); main = ''; out.kind = 'month'; }
  else if ((m = D8.exec(main)) && okMon(m[1])) {
    const b = new RegExp(`before (${MONS})[a-z]*\\.? (\\d{1,2})`).exec(ptext);
    if (b) { span = [day0(MON[m[1]], 1), day0(MON[b[1]], +b[2])]; out.basis.push(`"${m[1]}" with "before ${b[1]} ${b[2]}": from the first of the month to the start of that date`); out.flags.push('before_date'); }
    else { span = [day0(MON[m[1]], 1), monEnd(MON[m[1]])]; out.basis.push(`month ${m[1]}: the whole month`); }
    main = ''; out.kind = 'month';
  }
  else if ((m = D1.exec(main)) && okMon(m[1]) && okMon(m[3])) { pair = [[MON[m[1]], +m[2]], [MON[m[3]], +m[4]]]; main = main.slice(m[0].length).trim(); }
  else if ((m = D2.exec(main)) && okMon(m[1])) { pair = [[MON[m[1]], +m[2]], [MON[m[1]], +m[3]]]; main = main.slice(m[0].length).trim(); }
  else if ((m = D3.exec(main)) && okMon(m[1])) { dates = [[MON[m[1]], +m[2]], [MON[m[1]], +m[3]]]; main = main.slice(m[0].length).trim(); out.basis.push(`two printed dates (${m[2]} or ${m[3]}): either`); }
  else if ((m = D4.exec(main)) && okMon(m[1]) && okMon(m[3])) { dates = [[MON[m[1]], +m[2]], [MON[m[3]], +m[4]]]; main = main.slice(m[0].length).trim(); out.basis.push('two printed dates: either'); }
  else if ((m = D5.exec(main)) && okMon(m[1])) { dates = [[MON[m[1]], +m[2]]]; openEnd = true; main = main.slice(m[0].length).trim(); }
  else if ((m = D6.exec(main)) && okMon(m[1])) { dates = [[MON[m[1]], +m[2]]]; main = main.slice(m[0].length).trim(); }
  else { out.flags.push('no_date'); out.kind = 'none'; out.basis.push('no date is printed in the time cell'); return out; }
  // a second date later in the cell: "night to Jul 2", "afternoon through Jul 3", "before dawn Jul 3"
  if (!pair && dates.length === 1) { const s = new RegExp(`\\b(?:(to|through) )?(${MONS})[a-z]*\\.? (\\d{1,2})(?![:\\d])`).exec(main); if (s && okMon(s[2])) { pair = [dates[0], [MON[s[2]], +s[3]]]; dates = []; main = main.replace(s[0], s[1] ? ' to ' : ' ').replace(/\s+/g, ' ').trim(); } }
  const altDate = new RegExp(`\\bor (${MONS})[a-z]*\\.? (\\d{1,2})(?![:\\d])`).exec(ptext);
  if (span) { out.intervals.push(span); out.dates = [isoOf(span[0]).slice(0, 10), isoOf(span[1] - 1).slice(0, 10)]; return out; }
  out.dates = (pair || dates).map(([mo, d]) => isoOf(day0(mo, d)).slice(0, 10));

  // ---- the words of the cell after the date
  // the PDF's band markers ([NIGHT], [DUSK], [DAWN], TWILIGHT) are annotations of the row, not a second phrase: they are taken out of the words and kept as flags
  const bandNight = /\bNIGHT\b/.test(main), bandDusk = /\bDUSK\b/.test(main), bandDawn = /\bDAWN\b/.test(main), bandTwi = /\bTWILIGHT\b/.test(main);
  main = main.replace(/\[?\b(NIGHT\/TWILIGHT|NIGHT\/DUSK|NIGHT|DUSK|DAWN|TWILIGHT)\b\]?/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = main.toLowerCase(), plower = ptext.toLowerCase();
  const clocks = [...lower.matchAll(/(\d{1,2}):(\d{2})/g)].map(x => ({ t: +x[1] * 60 + +x[2], i: x.index, len: x[0].length }));
  const pclocks = [...plower.matchAll(/(\d{1,2}):(\d{2})/g)].map(x => ({ t: +x[1] * 60 + +x[2], i: x.index, len: x[0].length }));
  const rel_ = [];                                      // intervals in minutes after midnight of the (first) date; may exceed 1440
  const C = (a, b, why) => { rel_.push([a - CT, b + CT]); out.basis.push(why + ` (clock tolerance ${CT} min each end)`); };
  const part = (name, why) => { let [a, b] = P[name]; if (name === 'dawn' || name === 'dusk' || name === 'noon' || name === 'midnight') { a -= CT; b += CT; } if (name === 'evening') a -= CT; rel_.push([a, b]); out.basis.push(why || `"${name}": ${T.day_part_basis[name] || T.day_part_basis.night}`); return [a, b]; };
  // phrases in order of appearance; longer forms first so that "afternoon" is never read as "noon"
  const PH = [[/pre-?dawn|before dawn|before daylight|before daybreak/g, 'pre-dawn'], [/after dark|after sunset/g, 'after-dark'], [/after midnight/g, 'night-early'], [/before noon|by noon/g, 'morning+'], [/after ?noon|afternoon/g, 'afternoon'], [/forenoon|morning|\ba\.m\./g, 'morning'], [/midnight/g, 'midnight'], [/overnight|all night|\bnight\b/g, 'night'],
    [/\bnoon\b|midday/g, 'noon'], [/evening/g, 'evening'], [/dusk|sunset/g, 'dusk'], [/\bdark\b/g, 'dusk'], [/dawn|daybreak|first light|daylight/g, 'dawn'], [/all day|\bday\b/g, 'day']];
  const phrasesOf = text => { const found = [], used = []; for (const [re, name] of PH) for (const x of text.matchAll(re)) { if (used.some(([a, b]) => x.index < b && x.index + x[0].length > a)) continue; used.push([x.index, x.index + x[0].length]); found.push({ name, i: x.index, word: x[0] }); } return found.sort((a, b) => a.i - b.i); };
  const phrases = phrasesOf(lower);
  const nightWin = () => {                               // which night a bare "night" names
    if (pair) return null;                               // handled by the two dates
    if (/after midnight|\bearly\b/.test(lower + ' ' + plower)) { out.basis.push('"night" with "after midnight" or "early": the early hours of the printed date'); return [P['night-early']]; }
    if (/until dawn/.test(lower + ' ' + plower)) { out.basis.push('"night (until dawn)": the night that ends at the dawn of the printed date'); return [[P['night-late'][0] - 1440, P['night-early'][1]]]; }
    if (/after moonrise|after dark|after sunset|evening|dusk/.test(lower + ' ' + plower)) { out.basis.push('"night" with evening, dusk, after dark or after moonrise: the night that follows the printed date'); return [P['night-late']]; }
    out.flags.push('night_ambiguous'); out.basis.push(`"night" on one printed date: ${T.day_part_basis.night}`); return [P['night-early'], P['night-late']];
  };
  const after = /\bafter\b|\bonward\b|\band after\b|\bfrom\b/.test(lower);
  if (clocks.length) {
    out.kind = 'clock';
    const between = (a, b) => lower.slice(a.i + a.len, b.i);
    if (clocks.length >= 2 && /^\s*(-|to)\s*(about\s*)?$/.test(between(clocks[0], clocks[1]))) { let b = clocks[1].t; if (b < clocks[0].t) b += 1440; C(clocks[0].t, b, `printed clock range ${main}`); }
    else if (clocks.length >= 2 && /\bor\b/.test(between(clocks[0], clocks[1]))) { C(clocks[0].t, clocks[0].t, 'first printed clock time'); C(clocks[1].t, clocks[1].t, 'second printed clock time ("or")'); }
    else if (/\bnoon\s*-\s*(about\s*)?\d/.test(lower)) C(720, clocks[0].t, 'printed "noon" to a clock time');
    else if (after && !/\bafter the\b/.test(lower)) { rel_.push([clocks[0].t - CT, 1440]); out.basis.push(`printed clock time with "after" or "onward": from it (less ${CT} min) to the end of the printed date`); out.flags.push('open_ended'); }
    else C(clocks[0].t, clocks[0].t, `printed clock time ${isoOf(clocks[0].t).slice(11)}`);
    // an alternative joined by "or": a second phrase in the cell, or a parenthesis that gives a range "per" a source or begins with "or"
    if (/\bor\b/.test(lower) && clocks.length < 2) for (const p of phrases) { if (p.name === 'night') for (const w of nightWin() || []) rel_.push(w); else part(p.name, `alternative printed with "or": "${p.word}"`); }
    for (const p of parens) { const pl = p.toLowerCase(), pc = [...pl.matchAll(/(\d{1,2}):(\d{2})/g)].map(x => +x[1] * 60 + +x[2]); if (/\bper\b|^or\b/.test(pl)) { if (pc.length >= 2) C(pc[0], pc[1], `alternative in parentheses "${p}"`); else if (pc.length === 1) C(pc[0], pc[0], `alternative in parentheses "${p}"`); else for (const q of phrasesOf(pl)) if (q.name !== 'night') part(q.name, `alternative in parentheses "${p}"`); } }
  } else if (pclocks.length && /^(about|\d)|\babout\b|\bafter\b|\bbefore\b/.test(plower)) {
    out.kind = 'clock';
    const base = phrases.length && phrases[0].name !== 'night' ? P[phrases[0].name] : null;
    if (/\bafter\b/.test(plower) && pclocks.length === 1) { rel_.push([pclocks[0].t - CT, 1440]); out.basis.push(`clock time in parentheses with "after": from it (less ${CT} min) to the end of the printed date`); out.flags.push('open_ended'); }
    else if (/\bbefore\b/.test(plower) && pclocks.length === 1) { rel_.push([base ? base[0] : 0, pclocks[0].t + CT]); out.basis.push(`clock time in parentheses with "before": from the start of ${base ? '"' + phrases[0].word + '"' : 'the printed date'} to it (plus ${CT} min)`); }
    else if (pclocks.length >= 2) { let b = pclocks[1].t; if (b < pclocks[0].t) b += 1440; C(pclocks[0].t, b, `clock range in parentheses "${ptext}"`); }
    else C(pclocks[0].t, pclocks[0].t, `clock time in parentheses "${ptext}"`);
  } else {
    const ampm = /(\d{1,2})(?::(\d\d))?\s*-\s*(\d{1,2})(?::(\d\d))?\s*(a\.m\.|p\.m\.)/.exec(plower);
    if (ampm) { const add = ampm[5] === 'p.m.' ? 720 : 0; out.kind = 'clock'; C(+ampm[1] * 60 + +(ampm[2] || 0) + add, +ampm[3] * 60 + +(ampm[4] || 0) + add, `clock range in parentheses "${ampm[0]}"`); }
    else if (phrases.length) {
      out.kind = 'phrase';
      const isOr = /\bor\b/.test(lower) && phrases.length > 1;
      const winOf = p => { if (p.name === 'night') return P['night-late']; if (p.name === 'morning+') return [P.morning[0], P.noon[1] + CT]; let [a, b] = P[p.name]; if (['dawn', 'dusk', 'noon', 'midnight'].includes(p.name)) { a -= CT; b += CT; } if (p.name === 'evening') a -= CT; return [a, b]; };
      const fromOpen = /\bfrom\b|\bonward\b/.test(lower);
      if (phrases.length === 1 || isOr) {
        for (const p of phrases) {
          if (p.name === 'night') { const w = nightWin(); if (w) for (const x of w) rel_.push(x); }
          else if (p.name === 'midnight') { if (!pair) { rel_.push([-CT, CT], [1440 - CT, 1440 + CT]); out.flags.push('midnight_ambiguous'); out.basis.push(`"midnight" on one printed date: ${T.day_part_basis.midnight}`); } }
          else if (p.name === 'morning+') { rel_.push(winOf(p)); out.basis.push(`"${p.word}": from the start of the printed date to noon (plus ${CT} min)`); }
          else if (p.name === 'night-early') { rel_.push(P['night-early']); out.basis.push('"after midnight": the early hours of the printed date, to civil dawn'); }
          else if (fromOpen && phrases.length === 1) { const w = winOf(p); rel_.push([w[0], 1440]); out.flags.push('open_ended'); out.basis.push(`"${p.word}" with "from" or "onward": from its start to the end of the printed date`); }
          else part(p.name);
        }
        // a band marker beside one phrase narrows it to the band (PDF p.9: NIGHT marks rows between civil dusk and civil dawn)
        if (phrases.length === 1 && !['night', 'midnight', 'night-early'].includes(phrases[0].name) && (bandNight || bandDusk || bandDawn || bandTwi)) {
          const bands = []; if (bandNight) bands.push(P['night-early'], P['night-late']); if (bandDusk || bandTwi) bands.push([P.dusk[0] - CT, P.dusk[1] + CT]); if (bandDawn || bandTwi) bands.push([P.dawn[0] - CT, P.dawn[1] + CT]);
          const cut = []; for (const [a, b] of rel_) for (const [x, y] of bands) { const lo = Math.max(a, x), hi = Math.min(b, y); if (hi >= lo) cut.push([lo, hi]); }
          if (cut.length) { rel_.length = 0; rel_.push(...cut); out.basis.push('narrowed to the PDF band marker printed beside it (NIGHT, DUSK, DAWN or TWILIGHT)'); }
        }
      } else {                                           // "morning to afternoon", "evening into night", "afternoon and evening": from the start of the first to the end of the last
        const a = winOf(phrases[0]), b = winOf(phrases[phrases.length - 1]); rel_.push([a[0], Math.max(a[1], b[1])]);
        out.basis.push(`"${phrases.map(p => p.word).join('" ... "')}": from the start of the first to the end of the last (${phrases.map(p => p.name).join(', ')})`);
      }
    } else if (bandNight || bandDusk || bandDawn || bandTwi) {
      out.kind = 'band';
      if (bandNight) { const w = nightWin(); if (w) for (const x of w) rel_.push(x); }
      if (bandDawn || (bandTwi && !bandNight)) part('dawn', 'PDF [DAWN] or TWILIGHT marker: ' + T.day_part_basis.dawn);
      if (bandDusk || (bandTwi && !bandNight)) part('dusk', 'PDF [DUSK] or TWILIGHT marker: ' + T.day_part_basis.dusk);
    } else { out.kind = 'date'; }
  }
  // ---- onto the calendar
  const put = (base, a, b) => out.intervals.push([base + a, base + b]);
  if (pair) {
    const d1 = day0(...pair[0]), d2 = day0(...pair[1]), nightish = bandNight || phrases.some(p => p.name === 'night' || p.name === 'midnight' || p.name === 'pre-dawn' || p.name === 'night-early');
    if (out.kind === 'clock') { for (const [a, b] of rel_) put(d1, a, b); out.basis.push('two dates are printed; the clock is read on the first'); }
    else if (phrases.some(p => p.name === 'midnight')) { out.intervals.push([d2 - CT, d2 + CT]); out.basis.push(`"midnight" between two printed dates: 00:00 of the second, clock tolerance ${CT} min`); }
    else if (nightish && d2 - d1 === 1440 && !/\bto\b/.test(lower)) { out.intervals.push([d1 + P['night-late'][0], d2 + P['night-early'][1]]); out.basis.push('night between two printed dates: civil dusk of the first to civil dawn of the second'); }
    else {
      // "night to Jul 2", "afternoon through Jul 3": from the start of the first printed phrase on the first date to the end of the second date
      const f = phrases[0], a = !f ? 0 : f.name === 'night' ? P['night-late'][0] : f.name === 'morning+' ? 0 : Math.max(0, P[f.name][0] - (f.name === 'evening' || f.name === 'dawn' || f.name === 'dusk' || f.name === 'noon' ? CT : 0));
      out.intervals.push([d1 + a, d2 + 1440]); out.basis.push(f ? `from the start of "${f.word}" on the first printed date to the end of the second` : 'two printed dates: from the start of the first to the end of the second');
    }
  } else {
    for (const [mo, d] of dates) { const base = day0(mo, d); if (rel_.length) for (const [a, b] of rel_) put(base, a, b); else { put(base, 0, 1440); } }
    if (!rel_.length) out.basis.push(phrases.length || clocks.length ? 'the printed date' : 'no clock time and no part of the day is printed: the whole printed date');
    if (openEnd) { const last = out.intervals[out.intervals.length - 1]; last[1] = monEnd(11); out.flags.push('open_ended'); out.basis.push('"+" after the date: from that date onward'); }
    if (altDate && okMon(altDate[1])) { const base = day0(MON[altDate[1]], +altDate[2]); if (rel_.length) for (const [a, b] of rel_) put(base, a, b); else put(base, 0, 1440); out.basis.push(`alternative date in parentheses (or ${altDate[1]} ${altDate[2]})`); }
  }
  out.intervals = mergeIntervals(out.intervals);
  return out;
}
export function mergeIntervals(list) {
  const s = list.filter(x => x && x[1] >= x[0]).map(x => [x[0], x[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]), out = [];
  for (const x of s) { const l = out[out.length - 1]; if (l && x[0] <= l[1]) l[1] = Math.max(l[1], x[1]); else out.push(x); }
  return out;
}
export const inIntervals = (intervals, t) => intervals.some(([a, b]) => t >= a && t <= b);
export const coversInterval = (intervals, a, b) => intervals.some(([x, y]) => a >= x && b <= y);

// ---- corrected claims (GOVERNANCE/timeline_corrections/<shard>.jsonl, written by another workstream). The line of a row is read as data. The words a record may quote and bind its units, places and
// structures to are the words that CLAIM something: the event, the unit, the place, the printed time text and the full text of `corrected_claim` (claimFields). The basis of the time window (a source
// citation with its authors), the marking, the tier, the sub-claims and the citations are evidence ABOUT the claim, not the claim: their words (a report author is not a unit on the field, "day" is
// not Day's brigade) never bind anything. A machine-readable window is taken only from fields that state one in ISO form (1863-MM-DDTHH:MM) or in minutes under an explicit key.
const ISO = /^1863-(\d\d)-(\d\d)T(\d\d):(\d\d)$/;
function isoMin(s) { const r = ISO.exec(String(s || '').slice(0, 16)); return r ? minOf(+r[1], +r[2], +r[3], +r[4]) : null; }
export const CLAIM_FIELDS = ['event', 'unit', 'place', 'time_text', 'text'];
export function claimFields(corrected) {
  if (corrected == null) return null;
  if (typeof corrected === 'string') return corrected.trim() ? { text: corrected } : null;
  if (typeof corrected !== 'object' || Array.isArray(corrected)) return null;
  const out = {}; for (const k of ['event', 'unit', 'place']) if (typeof corrected[k] === 'string' && corrected[k].trim()) out[k] = corrected[k];
  const tw = corrected.time_window; if (tw && typeof tw === 'object' && typeof tw.text === 'string' && tw.text.trim()) out.time_text = tw.text; else if (typeof tw === 'string' && tw.trim()) out.time_text = tw;
  if (typeof corrected.text === 'string' && corrected.text.trim()) out.text = corrected.text;
  return Object.keys(out).length ? Object.fromEntries(CLAIM_FIELDS.filter(k => out[k] != null).map(k => [k, out[k]])) : null;
}
export function correctionWindow(c) {
  const cc = c && (c.corrected_claim ?? c.corrected ?? null); if (!cc || typeof cc !== 'object') return null;
  const cand = [cc.time_window, cc.window, cc.time, cc.when].filter(x => x && typeof x === 'object' && !Array.isArray(x));
  for (const w of cand) {
    const a = isoMin(w.earliest_iso ?? w.from_iso ?? w.earliest ?? w.from ?? w.start), b = isoMin(w.latest_iso ?? w.to_iso ?? w.latest ?? w.to ?? w.end);
    if (a != null && b != null && b >= a) return { from: a, to: b, basis: String(w.basis || w.source || 'corrected claim') };
  }
  for (const w of [cc.time_window, cc.window].filter(Array.isArray)) { const a = isoMin(w[0]), b = isoMin(w[1]); if (a != null && b != null && b >= a) return { from: a, to: b, basis: 'corrected claim' }; }
  return null;
}
export function loadCorrections(gov = GOV) {
  const dir = path.join(gov, 'timeline_corrections'), byId = new Map(), files = [], problems = [];
  if (!exists(dir)) return { byId, files, problems };
  for (const f of fs.readdirSync(dir).filter(f => /^tl-\d\d\.jsonl$/.test(f)).sort()) {
    let lines; try { lines = readJSONL(path.join(dir, f)); } catch (e) { problems.push(String(e.message)); continue; }
    files.push(rel(path.join(dir, f)));
    for (const l of lines) if (l && typeof l.id === 'string') byId.set(l.id, { file: rel(path.join(dir, f)), line: l });
  }
  return { byId, files, problems };
}

// ---- the rows
export function loadTimeline({ gov = GOV, tolerances } = {}) {
  const tol = tolerances || readJSON(new URL('./tolerances.json', import.meta.url).pathname);
  const seed = readJSONL(path.join(gov, 'timeline_seed.jsonl')), ver = new Map(readJSONL(path.join(gov, 'timeline_verified.jsonl')).map(r => [r.id, r])), win = new Map(readJSONL(path.join(gov, 'timeline_windows.jsonl')).map(r => [r.id, r]));
  const corr = loadCorrections(gov), CT = tol.time.clock_tolerance_min;
  const clock = Object.values(tol.time.clock_range).map(([a, b]) => [isoMin(a), isoMin(b) - 1]);
  const rows = seed.map((s, n) => {
    const v = ver.get(s.id) || {}, w = win.get(s.id) || {}, cells = splitCells(s.text_raw, s.tier), tc = parseTimeCell(cells.time_cell, tol);
    const c = corr.byId.get(s.id) || null, cw = c ? correctionWindow(c.line) : null;
    const window = { intervals: tc.intervals, basis: tc.basis.slice(), flags: tc.flags.slice(), kind: tc.kind, source: 'seed time cell' };
    // a corrected window that starts at midnight or ends at 23:59 is a whole-date window (granularity date): no clock tolerance is added at the date's edge, the date is what the source says
    if (cw) { const lo = cw.from % 1440 === 0 ? cw.from : cw.from - CT, hi = cw.to % 1440 === 1439 ? cw.to + 1 : cw.to + CT; window.intervals = [[lo, hi]]; window.basis = [`corrected claim (${c.file}): ${isoOf(cw.from)} to ${isoOf(cw.to)}, clock tolerance ${CT} min at an end that is a clock time, none at the edge of a date; ${cw.basis}`]; window.flags = []; window.kind = 'correction'; window.source = 'correction'; window.seed_intervals = tc.intervals; }
    else if (c) window.flags.push('correction_without_machine_readable_window');
    if (w.earliest != null && w.latest != null && !coversInterval(window.intervals, w.earliest, w.latest)) { window.flags.push('differs_from_windows_file'); window.intervals = mergeIntervals([...window.intervals, [w.earliest, w.latest]]); window.basis.push(`the windows file (timeline_windows.jsonl: ${isoOf(w.earliest)} to ${isoOf(w.latest)}, parsed from the first fragment of the cell) reads the cell differently; both readings are allowed (DD-RZ-02)`); }
    window.in_clock = window.intervals.some(([a, b]) => clock.some(([x, y]) => Math.min(b, y) - Math.max(a, x) >= 1));       // at least one minute inside the clock: a window that only touches its first minute is outside it
    const what_text = cells.what.join(' '), cf = c ? claimFields(c.line.corrected_claim ?? c.line.corrected ?? null) : null, corrText = cf ? Object.values(cf).join(' ') : null;
    return { id: s.id, n, shard: v.shard || null, page: s.page, tier_seed: s.tier, tier: v.tier || s.tier, status_effective: v.status_effective || s.status, verdict: v.verdict || null, weak: !!s.weak_source_flag,
      text_raw: s.text_raw, time_cell: cells.time_cell, what: cells.what, what_text, after: cells.after, notes_text: cells.after.join(' '), tier_cell_found: cells.tier_found,
      seed_window: { parse_status: w.parse_status || null, earliest: w.earliest ?? null, latest: w.latest ?? null, default: w.default ?? null, phrase: w.phrase || null, band: w.band || null, raw: w.raw || null },
      window, correction: c ? { file: c.file, verdict: c.line.verdict || null, text: corrText, fields: cf, line: c.line } : null,
      // the text a quote of a record must be found in, and every unit, place and structure of a record must be named in: the printed time, place, unit and action cells, and the claim fields of the
      // corrected claim when there is one (never the note or source cells, never the basis, marking, tier, sub-claims or citations of a correction)
      claim_text: cells.time_cell + ' ' + what_text + (corrText ? ' ' + corrText : '') };
  });
  const byId = new Map(rows.map(r => [r.id, r])), shards = {};
  for (const r of rows) (shards[r.shard] || (shards[r.shard] = [])).push(r.id);
  return { rows, byId, shards, corrections: { files: corr.files, problems: corr.problems, rows: corr.byId.size }, tolerances: tol, clock, outside_clock: rows.filter(r => !r.window.in_clock).map(r => r.id) };
}
export const describeWindow = w => w.intervals.map(([a, b]) => `${isoOf(a)}..${isoOf(b)}`).join(' or ') || '(none)';
export { fold };
