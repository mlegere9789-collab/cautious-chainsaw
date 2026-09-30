// Shared clock strings for the candidate data generator (relabel-data.mjs) and the validators (TM-V4, TM-V13): one definition, no drift.
export const legacyLabel = (m, tick) => m.tickToLabel(tick, { style: 'time', approx: false, roundMin: 5 }).replace(/ (AM|PM)$/, (_, x) => x.toLowerCase()); // "7:30am"
export const about = (m, tick) => m.tickToLabel(tick, { style: 'time', approx: true, roundMin: 5 });                                                        // "about 7:30 AM"
export const calDate = (m, tick) => { const p = m.parts(tick, 5); return `${p.month} ${p.date}`; };                                                       // "July 2"
/** "about 5:00 AM July 1 to about 4:25 AM July 2" for a tick span (a Day tab or a placements chunk) */
export const spanText = (m, a, b) => `${about(m, a)} ${calDate(m, a)} to ${about(m, b)} ${calDate(m, b)}`;
export const CLOCK_SPAN_RE = /(approximately\s+)?(\d{1,2}:\d{2}\s?[apAP][mM])\s+to\s+(approximately\s+)?(\d{1,2}:\d{2}\s?[apAP][mM])/;
