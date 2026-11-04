// Printed clocks and named periods of a claim, shared by tools/claim-ledger.mjs (build) and placement.mjs (the loader re-checks every claim-driven entry against the claim's own words).
// ---- printed clocks ---------------------------------------------------------------------------------------------------------------------------
// The clocks a printed `when` string states, as { h12 (0-11), min, mer ('a'|'p'|null) }; used to check the ledger's t_iso against the printed words.
const NUM = String.raw`(\d{1,2})(?:[.:]\s*\.?\s*(\d{2}))?`;
export function printedClocks(printed) {
  const s = String(printed || '').replace(/ /g, ' '), out = [];
  // number followed by a clock word: "8 a. m.", "3.45 o'clock", "12 m.", "4.30 p. m.", "10.40 (a. m.)"
  const re = new RegExp(NUM + String.raw`\s*(o['’]?\s?clock|\(?[ap]\.?\s?m\b\.?\)?|m\b\.)`, 'gi'); let m;
  while ((m = re.exec(s))) { const word = m[3].replace(/^\(/, '').toLowerCase(), h = +m[1], min = m[2] ? +m[2] : 0; out.push({ h12: h % 12, min, mer: /^a/.test(word) ? 'a' : /^p/.test(word) ? 'p' : /^m/.test(word) ? 'noon' : null }); }
  // "between 1 and 2 p. m." / "from 1 to 3 p. m." / "between 10 and 11 o'clock": the first number takes the meridiem printed after the last
  const rg = new RegExp(String.raw`(?:between|from)\s+` + NUM + String.raw`\s+(?:and|to|until)\s+` + NUM + String.raw`\s*(?:(\(?[ap])\.?\s?m\b|o['’]?\s?clock)`, 'i'), r = rg.exec(s);
  if (r) out.push({ h12: (+r[1]) % 12, min: r[2] ? +r[2] : 0, mer: r[5] ? r[5].replace('(', '').toLowerCase() : null });
  // the words noon and midnight
  if (/\b(noon|midday)\b/i.test(s)) out.push({ h12: 0, min: 0, mer: 'noon' });
  if (/\bmidnight\b/i.test(s)) out.push({ h12: 0, min: 0, mer: 'midnight' });
  return out;
}
// does the ledger's t_iso agree with a clock printed in when.printed?  -> { ok, why }
export function clockAgrees(printed, tIso) {
  const hh = +tIso.slice(11, 13), mm = +tIso.slice(14, 16), cl = printedClocks(printed);
  if (!cl.length) return { ok: false, why: 'no clock in the printed words of the claim' };
  const hit = cl.find(c => c.h12 === hh % 12 && c.min === mm && (c.mer === 'noon' ? hh === 12 : c.mer === 'midnight' ? hh === 0 : c.mer == null ? true : (c.mer === 'a') === (hh < 12)));
  return hit ? { ok: true, why: null } : { ok: false, why: `printed “${printed}” does not give ${tIso.slice(11, 16)}` };
}
// a named period printed in the claim's own words (not in a compiler's parenthesis): evening, dusk, night
export function printedPeriod(printed) {
  const s = String(printed || '').trim(); if (!s || /^\(/.test(s)) return null;
  const m = /\b(night|evening|dusk)\b/i.exec(s); return m ? m[1].toLowerCase() : null;
}
// the labelled conventions of placement.mjs (PERIODS): PDF B.2.2 defines night as after civil twilight (20:04) and dusk as sunset 19:32 to 20:04
export const PERIOD_CLOCK = { night: '20:04', evening: '19:32', dusk: '19:32' };
