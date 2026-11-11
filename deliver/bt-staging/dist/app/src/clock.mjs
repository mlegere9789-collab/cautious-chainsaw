// The theatre's clock. Time is local mean time (LMT = UT + longitude/15 h, the project convention; no standard time existed in 1863).
// Unit: minutes since 1863-06-01 00:00 LMT, the unit of GOVERNANCE/timeline_windows.jsonl. The sim event cache works in seconds (= minutes * 60).
export const MONTHS = [['Jun', 'June', 30], ['Jul', 'July', 31], ['Aug', 'August', 31], ['Sep', 'September', 30], ['Oct', 'October', 31], ['Nov', 'November', 30]];
const MON_START = []; { let d = 0; for (const m of MONTHS) { MON_START.push(d); d += m[2]; } }
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], WDL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];  // 1 June 1863 was a Monday
export const dayIndex = (m, d) => MON_START[m - 6] + d - 1;                       // 1863 month 6..11
export const minOf = (m, d, hh = 0, mm = 0) => dayIndex(m, d) * 1440 + hh * 60 + mm;
export function isoToMin(s) { const r = /^1863-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?$/.exec(s || ''); return r ? minOf(+r[1], +r[2], +(r[3] || 0), +(r[4] || 0)) : null; }
export function parts(min) {
  const day = Math.floor(min / 1440), mod = min - day * 1440; let mi = MON_START.length - 1; while (MON_START[mi] > day) mi--;
  return { day, month: mi + 6, mon: MONTHS[mi][0], monthName: MONTHS[mi][1], dom: day - MON_START[mi] + 1, hh: Math.floor(mod / 60), mm: Math.floor(mod % 60), ss: Math.floor((mod % 1) * 60), wd: ((day % 7) + 7) % 7 };
}
const p2 = n => String(n).padStart(2, '0');
export const fmtTime = (min, sec = false) => { const p = parts(min); return `${p2(p.hh)}:${p2(p.mm)}${sec ? ':' + p2(p.ss) : ''}`; };
export const fmtDate = (min, long = false) => { const p = parts(min); return long ? `${WDL[p.wd]} ${p.dom} ${p.monthName} 1863` : `${WD[p.wd]} ${p.dom} ${p.mon} 1863`; };
export const fmtShort = min => { const p = parts(min); return `${p.dom} ${p.mon} ${p2(p.hh)}:${p2(p.mm)}`; };
export const fmtDur = min => { const a = Math.abs(min); return a < 90 ? `${Math.round(a)} min` : a < 2880 ? `${(a / 60).toFixed(a < 600 ? 1 : 0)} h` : `${(a / 1440).toFixed(1)} days`; };

// scrubber range: 26 Jun - 14 Jul 1863 (battle chapter); the epilogue chapter (18-19 Nov 1863) has its own short range
export const BATTLE = { from: minOf(6, 26), to: minOf(7, 15), label: '26 Jun - 14 Jul 1863' };
export const EPILOGUE = { from: minOf(11, 18), to: minOf(11, 20), label: '18-19 Nov 1863', entry: minOf(11, 19), entryNote: 'time of day not recorded in the timeline file' };
export const CHAPTERS = [
  { id: 'battle', name: 'The campaign and the battle', range: BATTLE },
  { id: 'night-4-jul', name: '4 Jul, night: the army withdraws', at: minOf(7, 4, 21, 0), note: 'the chapter marker; the epilogue follows' },
  { id: 'epilogue', name: 'Epilogue: 19 Nov 1863', range: EPILOGUE },
];
export const chapterOf = min => (min >= EPILOGUE.from ? 'epilogue' : 'battle');
export const clampT = (min, chapter) => { const r = chapter === 'epilogue' ? EPILOGUE : BATTLE; return Math.min(r.to - 1 / 60, Math.max(r.from, min)); };
