// Day-level positions of the troop maps (the Bachelder 1876 sheets and the hour-labelled sheet LOC 99447494) read into the history layer (contract 1.5; DEC-010, DEC-011),
// and, from history layer v7 (contract 1.7; DEC-018), the LINE STATE of every Bachelder label read by eye (library/LINE-STATES-NOTES.md) turned into a time window of the day.
//
// What a troop-map position is, and what this module does with it:
//  * Bachelder's sheets print one label (a brigade's name, with a line symbol) for a unit and a DAY. The legend defines four line styles: First Position, Intermediate, Evening, All Day. The by-eye read
//    recorded, per claim, which style the label's bar has (when.line_state: first | intermediate | evening | all_day | mixed (two bars of different styles at one label, when.line_states) | unreadable),
//    what was seen (line_state_basis), the crop (line_state_crop) and any clock or time word printed beside the line (printed_clock_near_line, verbatim). A position is tier 'documented' for
//    (unit, place, day) only (DEC-010); the claim's own tier is carried (a few are 'inferred'). A readable state is documented for (unit, place, state); its window in the day is MODELLED from the
//    legend's definition (DEC-018, provisional builder choice, the owner decides); a complete clock printed beside the line is the documented time of that state.
//  * RULE 1 (labels): a unit's position on a sheet is used when the unit has exactly one position claim on that sheet (status 'single'), or when it has several and their readable line states put
//    them in order (status 'sequence': at most one first, at most one evening, intermediates between them, each intermediate ordered by a usable printed clock when there are several; a mixed label
//    stands for both its states; an all-day bar, an unreadable bar or a movement arrow among several labels leaves the order unknown and nothing is drawn, status 'multiple', as before, with the reason).
//  * RULE 2 (level): a brigade, battery, artillery brigade, artillery battalion or artillery group position is laid out over its regiments or batteries (plausible-procedural slots inside it);
//    a division, corps or army position places nothing by itself. The nearest unit of the line of command that has any claim on the sheet is the only one consulted.
//  * RULE 3 (hour sheet): LOC 99447494 (2 to 3.30 P.M. on 1 Jul; author and date unknown, every claim inferred) is used only as an inferred timed stop where nothing else places the unit
//    on 1 Jul: no single-label or state-ordered day position on sheet 1 and no timed stop of the ledgers dated 1 Jul (placement.mjs checks the unit's timed stops).
//  * STATE WINDOWS (DEC-018; the times themselves are made per scenario by real.mjs, this module only says the rule for each state):
//      all_day      holds from the unit's (modelled) arrival that day to local midnight.
//      first        holds from arrival until the unit's next state-ordered position of the day; if there is none, until the evening convention; after that the position is not printed (the unit is kept where it last stood, a marked gap).
//      evening      holds from the evening convention (PDF [DUSK] start 19:32 LMT, the NAMED_PERIODS convention of arrivals.mjs; or a usable printed clock) to midnight; before that the unit stands at its
//                   previous known position of the day (a first or intermediate position, or its last timed ledger place) and leaves it so as to arrive at the convention; with no known daytime place
//                   it is drawn at the evening position from its arrival and the card says the daytime place is unknown (an open gap: no daytime place is invented).
//      intermediate between first and evening, the order unknown unless a usable printed clock beside the line gives it; the modelled arrival is the clock, or the middle of the open window.
//      mixed        every listed state, applied in order (first and evening at the same place).
//      unreadable   the whole-day rule of DEC-011 is unchanged.
//    A printed clock beside a line is used as a time only when it is a COMPLETE clock (hour, optional minutes, A.M. or P.M., nothing else printed with it) that the earlier pass did not class as adjacent_unproven
//    and that agrees with any clock that pass read (t_iso): then the state at that time is documented. Spans, time words, clocks without A.M./P.M. and clocks of a neighbouring label are listed, never used.
// Nothing here computes a coordinate: positions are the claims' own lng/lat; the times belong to real.mjs.
import { isoToMin } from '../clock.mjs';
import { insideBox } from './gazetteer.mjs';
import { NAMED_PERIODS } from './arrivals.mjs';

export const USED_LEVELS = new Set(['brigade', 'battery', 'artillery_brigade', 'artillery_battalion', 'artillery_group']);
export const DAY_SHEETS = ['J1', 'J2', 'J3'], HOUR_SHEET = 'H';
export const TIERS_OK = ['documented', 'inferred'];
export const fidelityOk = f => /^read_by_eye/.test(f || '');
// whole-day window of a sheet: local midnight to local midnight (DEC-011 item 4)
export const dayWindow = date => { const a = isoToMin(date); return { from: a, to: a + 1440 }; };
// the legend's states, in the order of the day; 'mixed' and 'unreadable' are readings, not states
export const STATES = ['first', 'intermediate', 'evening', 'all_day'], READINGS = [...STATES, 'mixed', 'unreadable'];
export const STATE_ORDER = { first: 0, intermediate: 1, evening: 2 };
// the evening convention: the start of [DUSK] (sunset 19:32 LMT), the PDF's labelled convention for "evening" (arrivals.mjs NAMED_PERIODS), applied to the sheet's date; a convention, not a historical claim
export const EVENING_HHMM = NAMED_PERIODS.evening.slice(11, 16);
export const eveningOf = date => isoToMin(date) + (+EVENING_HHMM.slice(0, 2)) * 60 + (+EVENING_HHMM.slice(3, 5));
export const EVENING_BASIS = `the evening convention: the start of [DUSK], sunset ${EVENING_HHMM} LMT (PDF B.2.2; the PDF gives no clock for "evening"), applied to the sheet's date`;

// the clock printed beside the line, read as a complete clock or not. A complete clock is the WHOLE printed text: an hour, optional minutes (".15", ":15", " 1/2", a printed prime), A.M. or P.M., nothing else.
export function parseLineClock(text) {
  if (text == null) return null;
  const m = /^\s*(\d{1,2})\s*(?:[.:](\d{2})|(1\/2)|(')|)\s*'?\s*([AP])\.?\s*M\.?\s*$/i.exec(String(text));
  if (!m) return null;
  let h = +m[1]; const mm = m[2] != null ? +m[2] : m[3] ? 30 : 0; if (h > 12 || mm > 59) return null;
  h = (h % 12) + (m[5].toUpperCase() === 'P' ? 12 : 0);
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
// the reading of `when.printed_clock_near_line` for a claim's `when`: { text, hhmm, iso, complete, usable, why }
export function lineClockOf(w) {
  const text = w.printed_clock_near_line ?? null; if (text == null) return null;
  const hhmm = parseLineClock(text), iso = hhmm && w.date ? `${w.date}T${hhmm}` : null, att = w.clock_attachment ?? null;
  if (!hhmm) return { text, hhmm: null, iso: null, complete: false, usable: false, why: 'not a complete clock (a span, a time word, a clock without A.M./P.M., an illegible glyph, or a clock printed with a neighbouring label): listed, not used as a time' };
  if (att === 'adjacent_unproven') return { text, hhmm, iso, complete: true, usable: false, why: 'a complete clock, but the earlier pass could not prove that it belongs to this label (clock_attachment adjacent_unproven): listed, not used as a time' };
  if (att && att !== 'same_run') return { text, hhmm, iso, complete: true, usable: false, why: `a complete clock, but the earlier pass classed its attachment as ${att}: listed, not used as a time` };
  if (w.t_iso && w.t_iso !== iso) return { text, hhmm, iso, complete: true, usable: false, why: `a complete clock that differs from the clock the earlier pass read in the label's own run (${w.t_iso.slice(11, 16)}): both are listed, neither is used` };
  return { text, hhmm, iso, complete: true, usable: true, why: att === 'same_run' ? 'a complete clock in the label\'s own run (same reading as the earlier pass): the documented time of this line state' : 'a complete clock printed beside the line: the documented time of this line state' };
}
// the states a claim stands for (a mixed label for each of its states; unreadable or no reading = [])
export const statesOf = c => (c.line_state === 'mixed' ? (c.line_states || []).filter(s => STATE_ORDER[s] != null) : STATE_ORDER[c.line_state] != null || c.line_state === 'all_day' ? [c.line_state] : []);
// the usable clock of a claim in minutes, or null
export const clockMin = c => (c.line_clock && c.line_clock.usable ? isoToMin(c.line_clock.iso) : null);
// what the rule says for a state (card text; the minutes are made per scenario)
export const STATE_RULE = {
  all_day: 'All Day (legend): the line stood here the whole day. Window modelled: from the unit\'s arrival (as soon as the record allows) to local midnight.',
  first: 'First Position (legend): the unit\'s first line of the day. Window modelled: from the unit\'s arrival (as soon as the record allows) until its next state-ordered position of the day, or until the evening convention; what follows is not printed readably (the unit is kept where it last stood; a marked gap).',
  evening: 'Evening (legend): the unit\'s line at the end of the day. Window modelled: from the evening convention (or the printed clock) to local midnight; before that the unit stands at its previous known position of the day and leaves it so as to arrive at the convention, or, with no known daytime place, is drawn here from its arrival with the daytime place marked unknown (no daytime place is invented).',
  intermediate: 'Intermediate (legend): a line between the first and the evening positions. Window modelled: between them; the order and the time are not printed unless a complete clock is printed beside the line, so the modelled arrival is the clock, or the middle of the open window (an arbitrary pick inside it, the card gives the whole window).',
  mixed: 'Two bars of different styles carry this label (mixed): every listed state is applied in order at this position.',
  unreadable: 'No line state could be read for this label (the reason is in the basis): the whole-day rule stands (documented for the day, the time modelled from local midnight).',
};

// the state items of a sheet result (status single or sequence) as the plan draws them: consecutive items of one claim are collapsed (a mixed label with nothing between its states is one item 'mixed');
// each gets its entry id (DAY-<claim>, or DAY-<claim>#<state> when one claim gives two items with another between) and the ids of the items before and after it in the order of the day
export function itemsOf(res) {
  const out = [];
  for (const it of res.items || []) { const last = out[out.length - 1]; if (last && last.claim.id === it.claim.id) { last.states.push(it.state); last.state = 'mixed'; continue; } out.push({ claim: it.claim, state: it.state, states: it.state == null ? [] : [it.state], clock: it.clock }); }
  out.forEach((x, i) => { x.index = i; x.of = out.length; x.eid = 'DAY-' + x.claim.id + (out.filter(y => y.claim.id === x.claim.id).length > 1 ? '#' + x.state : ''); });
  out.forEach((x, i) => { x.prev = i ? out[i - 1].eid : null; x.next = i + 1 < out.length ? out[i + 1].eid : null; });
  return out;
}
// several position claims of one unit on one sheet: can their states order them? -> { ok, items: [{ claim, state, clock }], why }
export function orderStates(claims) {
  const pos = claims.filter(c => c.kind === 'position'), moves = claims.length - pos.length;
  if (moves) return { ok: false, items: [], why: `${moves === 1 ? 'one of the labels is a movement arrow' : moves + ' of the labels are movement arrows'}: the states of the others cannot be put in order` };
  const expanded = []; for (const c of pos) { const ss = statesOf(c); if (!ss.length) return { ok: false, items: [], why: `${pos.filter(x => !statesOf(x).length).map(x => x.id).join(', ')}: no readable line state (see the basis), so the order of the labels is not known` }; for (const s of ss) expanded.push({ claim: c, state: s, clock: clockMin(c) }); }
  if (expanded.some(x => x.state === 'all_day')) return { ok: false, items: [], why: 'an all-day bar stands beside another state for the same unit: the states do not order the labels' };
  const n = s => expanded.filter(x => x.state === s).length;
  if (n('first') > 1) return { ok: false, items: [], why: `${n('first')} labels print the first-position style: the states do not order them` };
  if (n('evening') > 1) return { ok: false, items: [], why: `${n('evening')} labels print the evening style: the states do not order them` };
  const mids = expanded.filter(x => x.state === 'intermediate');
  if (mids.length > 1) { const cl = mids.map(x => x.clock); if (cl.some(x => x == null) || new Set(cl).size !== cl.length) return { ok: false, items: [], why: `the order of the ${mids.length} intermediate positions is not printed (no complete clock beside each): the states do not order them` }; }
  const items = expanded.sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.clock ?? 0) - (b.clock ?? 0) || a.claim.id.localeCompare(b.claim.id));
  for (let i = 1; i < items.length; i++) { const a = items[i - 1].clock, b = items[i].clock; if (a != null && b != null && b < a) return { ok: false, items: [], why: `the printed clocks (${items[i - 1].claim.id} ${items[i - 1].claim.line_clock.text}, ${items[i].claim.id} ${items[i].claim.line_clock.text}) contradict the order of the states` }; }
  return { ok: true, items, why: `${pos.length} labels whose line states put them in order: ${items.map(x => `${x.state.replace(/_/g, ' ')} (${x.claim.id}${x.clock != null ? ', ' + x.claim.line_clock.text : ''})`).join(' -> ')}` };
}

export class DayPositions {
  constructor({ doc, units }) {
    this.doc = doc; this.claims = doc.claims; this.sheets = doc.sheets; this.by = new Map(units.map(u => [u.id, u]));
    this.onSheet = new Map();                                                    // `${sheet}|${unit}` -> [claim digest]
    for (const c of Object.values(this.claims)) { const k = c.sheet + '|' + c.unit; if (!this.onSheet.has(k)) this.onSheet.set(k, []); this.onSheet.get(k).push(c); }
    this._res = new Map();
  }
  // problems with the digest (empty when it holds)
  validate() {
    const bad = [], d = this.doc;
    if (!d || d.version !== 2) bad.push('daypositions.json: version');
    for (const [k, S] of Object.entries(this.sheets)) { if (!/^[0-9a-f]{64}$/.test(S.sha256)) bad.push(`${k}: sha256`); if (!isoToMin(S.date)) bad.push(`${k}: date`); }
    for (const c of Object.values(this.claims)) {
      const me = c.id, S = this.sheets[c.sheet];
      if (!S) { bad.push(`${me}: unknown sheet ${c.sheet}`); continue; }
      if (!this.by.has(c.unit)) bad.push(`${me}: unknown unit ${c.unit}`);
      if (c.verified !== true) bad.push(`${me}: claim_support_verified is not true`);
      if (!fidelityOk(c.fidelity)) bad.push(`${me}: fidelity ${c.fidelity}`);
      if (!TIERS_OK.includes(c.tier)) bad.push(`${me}: tier ${c.tier}`);
      if (c.sheet === HOUR_SHEET && c.tier !== 'inferred') bad.push(`${me}: an hour-sheet claim is never documented (the sheet's author and date are not established)`);
      if (c.date !== S.date) bad.push(`${me}: date ${c.date} is not the sheet's ${S.date}`);
      if (!['position', 'movement'].includes(c.kind)) bad.push(`${me}: kind ${c.kind}`);
      if (!Number.isFinite(c.lng) || !Number.isFinite(c.lat) || !(c.sigma_m > 0)) bad.push(`${me}: position`);
      if (!c.quote || String(c.quote).trim().split(/\s+/).length > 15) bad.push(`${me}: quote`);
      if (S.day_level && c.t_iso && isoToMin(c.t_iso) == null) bad.push(`${me}: t_iso`);
      // line states (v7): a reading from the vocabulary, a mixed label lists two or more states, a readable state has its basis and its crop, a used clock is complete and agrees with the earlier pass
      if (c.line_state != null && !READINGS.includes(c.line_state)) bad.push(`${me}: line_state ${c.line_state}`);
      if (c.line_state === 'mixed' && !(Array.isArray(c.line_states) && c.line_states.length >= 2 && c.line_states.every(s => STATES.includes(s)))) bad.push(`${me}: a mixed label lists its states`);
      if (c.line_state != null && c.line_state !== 'mixed' && c.line_states != null) bad.push(`${me}: line_states on a label that is not mixed`);
      if (c.line_state != null && (!c.line_state_basis || !c.line_state_crop)) bad.push(`${me}: a line state carries its basis and its crop`);
      if (c.line_state != null && c.sheet === HOUR_SHEET) bad.push(`${me}: the hour sheet has no legend of line states`);
      if (c.line_clock) { const lc = c.line_clock; if (lc.text !== c.printed_clock_near_line || lc.hhmm !== parseLineClock(lc.text) || lc.complete !== (lc.hhmm != null) || (lc.usable && (!lc.complete || !['same_run', null].includes(c.clock_attachment) || (c.t_iso && c.t_iso !== lc.iso)))) bad.push(`${me}: line_clock does not follow from the printed clock beside the line`); }
      else if (c.printed_clock_near_line != null) bad.push(`${me}: a clock printed beside the line has no reading`);
    }
    return bad;
  }
  claimsOn(unitId, sheet) { return this.onSheet.get(sheet + '|' + unitId) || []; }
  chain(id) { const out = []; let u = this.by.get(id); while (u) { out.push(u.id); u = u.parent ? this.by.get(u.parent) : null; } return out; }
  // what a sheet says for a unit (itself or the nearest unit above it that has any claim on the sheet)
  //   { sheet, owner, level, via (null for the unit itself), labels, claims, used (digest or null), status, why, items: [{ claim, state, clock }] (single or sequence), order_why }
  // status: 'single' (one position claim: used), 'sequence' (several, ordered by their line states: all used in order), 'multiple' (several labels not ordered: none drawn), 'movement_only', 'formation' (division/corps/army label: places nothing), 'none'
  onSheetFor(id, sheet) {
    const key = sheet + '|' + id; if (this._res.has(key)) return this._res.get(key);
    let res = { sheet, owner: null, level: null, via: null, labels: 0, claims: [], used: null, status: 'none', why: 'the sheet prints no label for this unit or any unit above it', items: [], order_why: null };
    for (const x of this.chain(id)) {
      const cs = this.claimsOn(x, sheet); if (!cs.length) continue;
      const level = this.by.get(x).level, base = { sheet, owner: x, level, via: x === id ? null : x, labels: cs.length, claims: cs, items: [], order_why: null };
      if (!USED_LEVELS.has(level)) res = { ...base, used: null, status: 'formation', why: `a ${level.replace(/_/g, ' ')} label places nothing by itself` };
      else if (cs.length > 1) {
        const o = sheet === HOUR_SHEET ? { ok: false, why: 'the hour sheet has no line states' } : orderStates(cs);
        if (o.ok) res = { ...base, used: null, status: 'sequence', items: o.items, order_why: o.why, why: `${cs.length} labels for this unit on this sheet, put in order by their line states (first, intermediate, evening): each is drawn in its window` };
        else res = { ...base, used: null, status: 'multiple', order_why: o.why, why: `${cs.length} labels for this unit on this sheet (several line states that do not order them: ${o.why}): all are listed, none is drawn as a single place` };
      }
      else if (cs[0].kind !== 'position') res = { ...base, used: null, status: 'movement_only', why: 'the only label is a movement arrow, not a standing position' };
      else { const c = cs[0], ss = statesOf(c); res = { ...base, used: c, status: 'single', items: ss.length ? ss.map(s => ({ claim: c, state: s, clock: clockMin(c) })) : [{ claim: c, state: null, clock: null }], why: ss.length ? `one label: used as the day position, line state ${ss.map(s => s.replace(/_/g, ' ')).join(' and ')}` : 'one label: used as the day position (no readable line state: the whole-day rule)' }; }
      break;
    }
    this._res.set(key, res); return res;
  }
  // the day positions of a unit: one entry per day sheet (J1..J3), plus the hour sheet if it may be used (no other claim of the unit on 1 Jul)
  forUnit(id) {
    const days = DAY_SHEETS.map(s => this.onSheetFor(id, s)), hour = this.onSheetFor(id, HOUR_SHEET), j1 = days[0], placesJ1 = j1.status === 'single' || j1.status === 'sequence';
    const hourEligible = hour.status === 'single' && !placesJ1;
    return { days, hour: { ...hour, eligible: hourEligible, why: hour.status !== 'single' ? hour.why : hourEligible ? 'nothing else on the troop maps places the unit on 1 Jul (the sheet-1 labels, if any, are several line states that do not order them): used as an inferred timed stop' : 'sheet 1 gives the unit a single-label or state-ordered day position for 1 Jul: the hour sheet is not used, it is listed' } };
  }
  // is the day position (and the room for a column) inside the loaded ground
  static fits(claim, box, padM = 0) { return insideBox({ lng: claim.lng, lat: claim.lat }, box, padM); }
}
