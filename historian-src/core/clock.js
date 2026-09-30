// clock.js - reading a clock-of-day question ("at 3pm on July 2", "noon on July 3", "the morning of July 1", "between 2 and 4 pm on July 3") and printing the model's minutes.
// Dependency free. The clock itself never lives here: the numbers come from facts.clock (tools/historian/lib/clock.mjs), which bakes the canonical time model's output.
//
// Minutes are counted from 1863-07-01T00:00 local mean time, like the time model: July d, hh:mm = (d - 1) * 1440 + hh * 60 + mm.

export const DAY = 1440;

const WORD_DAY = { one: 1, two: 2, three: 3, first: 1, second: 2, third: 3 };

/** the July date a question names (calendar date, 1 to 31), or null. "July 10" is 10, never 1; "the second day" is 2 (the Day tab and the date agree by day, not by night). */
export function julyDate(text) {
  const t = String(text || '').toLowerCase();
  if (/\bjuly\s*\d{1,2}(?:st|nd|rd|th)?\s*(?:-|–|to|through|thru|and)\s*(?:july\s*)?\d{1,2}\b/.test(t)) return null;   // "July 1-3", "July 1 and 2": a stretch of days, not day 1
  let m = t.match(/\b(first|second|third)\s+of\s+july\b/); if (m) return WORD_DAY[m[1]];
  m = t.match(/\bjuly\s*(\d{1,2})(?![0-9])(?:st|nd|rd|th)?\b/) || t.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+of\s+july\b/) || t.match(/\b(?:day)\s*(?:number\s*)?(\d)(?![0-9])\b/);
  if (m) return +m[1];
  m = t.match(/\bday\s+(one|two|three)\b/) || t.match(/\b(first|second|third)\s+day\b/);
  return m ? WORD_DAY[m[1]] : null;
}

const to24 = (h, mer) => (mer === 'a' ? (h === 12 ? 0 : h) : h === 12 ? 12 : h + 12);

/** minutes after midnight -> "3:00 PM", "12:00 PM", "12:40 AM" (rounded to 5 minutes, the time model's own display rule) */
export function hm12(mod) {
  let m = Math.round((((mod % DAY) + DAY) % DAY) / 5) * 5; if (m >= DAY) m -= DAY;
  const h = Math.floor(m / 60), mi = m % 60;
  return `${h % 12 === 0 ? 12 : h % 12}:${mi < 10 ? '0' : ''}${mi} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const dateOf = (abs) => 1 + Math.floor(abs / DAY);
export const modOf = (abs) => ((abs % DAY) + DAY) % DAY;

/** phase words -> [from, to) in minutes after midnight of the named date (the night runs into the next morning) */
export function phaseWindow(word, solar) {
  const s = solar || { dawn: 243, sunrise: 275, sunset: 1172, nautical: 1246 };
  switch (word) {
    case 'dawn': return [s.dawn - 20, s.sunrise + 60];
    case 'early morning': return [240, 480];
    case 'late morning': return [600, 720];
    case 'morning': return [240, 720];
    case 'early afternoon': return [720, 840];
    case 'late afternoon': return [900, 1050];
    case 'afternoon': return [720, 1050];
    case 'dusk': return [s.sunset - 30, s.nautical];
    case 'late evening': return [1140, 1260];
    case 'evening': return [1050, 1260];
    case 'night': return [1260, 1680];
    default: return null;
  }
}

const MER = '(a\\.?\\s?m|p\\.?\\s?m)\\b\\.?';
const CLOCK_RES = {
  range: new RegExp(`\\b(?:between|from)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:${MER})?\\s*(?:and|to|-|\\u2013|until)\\s+(\\d{1,2})(?:[:.](\\d{2}))?\\s*${MER}`, 'i'),
  meridiem: new RegExp(`\\b(\\d{1,2})(?:[:.](\\d{2}))?\\s*${MER}`, 'i'),
  h24: /\b([01]\d|2[0-3])([0-5]\d)\s*(?:hours?|hrs?)\b/i,
  colon: /\b(\d{1,2}):([0-5]\d)\b(?!\s*(?:a\.?\s?m|p\.?\s?m))/i,
  oclock: /\b(\d{1,2})\s*o['’]?\s?clock\b/i,
  inThe: /\b(\d{1,2})(?:[:.](\d{2}))?\s+(?:o['’]?\s?clock\s+)?(?:in the|at)\s+(morning|afternoon|evening|night)\b/i,
};
const PHASE_RE = /\b(?:(early|late)\s+)?(morning|forenoon|afternoon|evening|night|dawn|daybreak|sunrise|first light|dusk|sundown|sunset|twilight|nightfall)\b/i;
const PHASE_CANON = { forenoon: 'morning', daybreak: 'dawn', sunrise: 'dawn', 'first light': 'dawn', sundown: 'dusk', sunset: 'dusk', twilight: 'dusk', nightfall: 'dusk' };

/**
 * Read the clock of day out of a question. Returns null when the question names no clock time and no part of the day.
 *   { kind: 'point', mod }                     a clock time ("3pm", "15:00", "noon", "midnight")
 *   { kind: 'window', from, to, phase? }       a stretch of the day ("the morning", "between 2 and 4 pm")
 *   { ambiguous: 'meridiem', hour }            "3 o'clock" / "3:30" with no am / pm and no part of the day: the caller asks which
 * plus { date: <July date or null>, text: <what matched> }. A part of the day next to a clock ("3 in the afternoon") settles the meridiem.
 */
export function parseClock(text, { solar = null } = {}) {
  const t = String(text || '').replace(/[‘’]/g, "'");
  const date = julyDate(t);
  const pm = t.match(PHASE_RE);
  const phase = pm ? ((pm[1] ? pm[1].toLowerCase() + ' ' : '') + (PHASE_CANON[pm[2].toLowerCase()] || pm[2].toLowerCase())) : null;
  const phaseMer = phase ? (/morning|dawn/.test(phase) ? 'a' : /afternoon|evening|dusk|night/.test(phase) ? 'p' : null) : null;
  const res = (o) => ({ date, ...o });
  let m;
  if ((m = t.match(CLOCK_RES.range))) {
    const mer2 = m[6].replace(/[.\s]/g, '')[0].toLowerCase(); let mer1 = m[3] ? m[3].replace(/[.\s]/g, '')[0].toLowerCase() : mer2;
    const h1 = +m[1], h2 = +m[4]; const a = to24(h1, mer1) * 60 + (+m[2] || 0), b = to24(h2, mer2) * 60 + (+m[5] || 0);
    if (!m[3] && a > b) mer1 = mer2 === 'p' ? 'a' : 'p';
    const from = to24(h1, mer1) * 60 + (+m[2] || 0);
    if (from < b) return res({ kind: 'window', from, to: b, text: m[0] });
  }
  if ((m = t.match(CLOCK_RES.meridiem))) {
    const h = +m[1]; if (h >= 1 && h <= 12) return res({ kind: 'point', mod: to24(h, m[3].replace(/[.\s]/g, '')[0].toLowerCase()) * 60 + (+m[2] || 0), text: m[0] });
  }
  if ((m = t.match(CLOCK_RES.h24))) return res({ kind: 'point', mod: +m[1] * 60 + +m[2], text: m[0] });
  if ((m = t.match(CLOCK_RES.inThe)) && +m[1] >= 1 && +m[1] <= 12) return res({ kind: 'point', mod: to24(+m[1], /morning/i.test(m[3]) || (/night/i.test(m[3]) && (+m[1] <= 4 || +m[1] === 12)) ? 'a' : 'p') * 60 + (+m[2] || 0), text: m[0] });
  if (/\b(?:high )?noon\b|\bmidday\b/i.test(t)) return res({ kind: 'point', mod: 720, text: 'noon' });
  if (/\bmidnight\b/i.test(t)) return res({ kind: 'point', mod: DAY, text: 'midnight' });
  if ((m = t.match(CLOCK_RES.colon)) || (m = t.match(CLOCK_RES.oclock))) {
    const h = +m[1], mi = +(m[2] || 0);
    if (m[2] !== undefined && h >= 13 && h <= 23) return res({ kind: 'point', mod: h * 60 + mi, text: m[0] });
    if (h >= 1 && h <= 12) {
      if (phaseMer) return res({ kind: 'point', mod: to24(h, phaseMer) * 60 + mi, text: m[0] });
      return res({ ambiguous: 'meridiem', hour: h, minute: mi, text: m[0] });
    }
  }
  if (phase) { const w = phaseWindow(phase, solar); if (w) return res({ kind: 'window', from: w[0], to: w[1], phase, text: pm[0] }); }
  return null;
}
