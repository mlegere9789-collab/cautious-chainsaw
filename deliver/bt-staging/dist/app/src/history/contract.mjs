// The contract between the page shell and the history layer (see ../../data-contract.md for the prose and JSON examples).
// A history layer is any object with the methods below; the stub in stub.mjs is one implementation, the real layer will be another.
// This file holds the enumerations and the validators the shell and the tests use, so a layer that breaks the contract fails loudly.
export const CONTRACT_VERSION = '1.0';       // the shapes below; the 1.1 additions (strength without a figure, arrival without an entry), 1.2 (drawn units, approach) and 1.3 (casualties, guns, figure manifests, formation events) are marked where they apply and documented in data-contract.md
export const TIERS = ['documented', 'inferred', 'plausible-procedural', 'open gap'];
export const SIDES = ['union', 'confederate'];
export const ARMS = ['infantry', 'cavalry', 'artillery', 'headquarters', 'staff', 'medical', 'train'];
export const FORMATIONS = ['line', 'column_fours', 'column_mass', 'skirmish_line', 'battery', 'mounted_column', 'mounted_line'];
// activity -> what the renderer shows (clip index for foot/mounted units; the shell owns this table)
export const ACTIVITIES = {
  march: { foot: 1, mounted: 1 }, double_quick: { foot: 2, mounted: 1 }, halt: { foot: 0, mounted: 0 }, stand: { foot: 0, mounted: 0 }, rest: { foot: 0, mounted: 0 },
  fire: { foot: 3, mounted: 0 }, serve_guns: { foot: 4, mounted: 0 }, gallop: { foot: 2, mounted: 2 }, build_works: { foot: 0, mounted: 0 }, camp: { foot: 0, mounted: 0 },
};
export const EVENT_TYPES = ['enter', 'path', 'activity', 'state', 'formation', 'leave'];
export const FATES = ['killed', 'wounded', 'missing'];
// formations the shell can show on a foot unit and move between (contract 1.3): the renderer has one slot layout per kind; any other FORMATIONS value is valid in the contract but is listed by the stage as unsupported, never silently dropped
export const FORMATIONS_DRAWN = ['line', 'column_fours'];
export const FORMATION_SECONDS = 90;           // default length of a change of formation (a tuning value of the shell, not a drill-manual figure: the repository holds none)

const isNum = x => typeof x === 'number' && Number.isFinite(x);
const isStr = x => typeof x === 'string' && x.length > 0;
const isLL = p => p && isNum(p.lng) && isNum(p.lat) && p.lng > -180 && p.lng < 180 && p.lat > -90 && p.lat < 90;
export function validateUnits(units) {
  const err = [], ids = new Set();
  for (const u of units) {
    const at = `unit ${u.id}`;
    if (!isStr(u.id)) err.push('unit without id'); else if (ids.has(u.id)) err.push(`${at}: duplicate id`); else ids.add(u.id);
    if (!isStr(u.name)) err.push(`${at}: name`);
    if (!SIDES.includes(u.side)) err.push(`${at}: side`);
    if (!ARMS.includes(u.arm)) err.push(`${at}: arm`);
    // strength: a range {min,max,basis}, or (contract 1.1) {min:null,max:null,drawn,basis} where the record has no figure: then `drawn` (>= 0, integer) is the procedural share the
    // renderer instances, the basis says so, and the tier may not be 'documented'
    const sg = u.strength;
    if (!sg || !isStr(sg.basis)) err.push(`${at}: strength must carry a basis`);
    else if (sg.min === null && sg.max === null) { if (!Number.isInteger(sg.drawn) || sg.drawn < 0) err.push(`${at}: strength without a figure needs an integer drawn >= 0`); if (sg.tier === 'documented') err.push(`${at}: a strength with no figure cannot be documented`); }
    else if (!isNum(sg.min) || !isNum(sg.max) || sg.min > sg.max) err.push(`${at}: strength must be a range {min,max,basis}`);
    if (!TIERS.includes(u.tier)) err.push(`${at}: tier`);
    if (!Array.isArray(u.sources)) err.push(`${at}: sources`);
    if (!u.formation || !FORMATIONS.includes(u.formation.kind)) err.push(`${at}: formation.kind`);
    if (!isStr(u.kit)) err.push(`${at}: kit`);
    if (u.casualties !== undefined) err.push(...validateCasualties(u.casualties, `${at}: casualties`));      // contract 1.3 (optional: the placeholder layer has none)
    if (u.guns !== undefined) err.push(...validateGuns(u.guns, `${at}: guns`));
    if (u.provenance !== undefined && u.provenance !== null) err.push(...validateProvenance(u.provenance, `${at}: provenance`));       // contract 1.4 (optional)
    if (u.day_positions !== undefined && u.day_positions !== null) err.push(...validateDayPositions(u.day_positions, u, `${at}: day_positions`));       // contract 1.5 (optional)
  }
  return err;
}
// contract 1.4: the ledger claims behind a unit's approach road, stops and departures. Every entry names a claim that is carried in `claims` with its report id, printed page, quote, tier and fidelity check; a claim that is
// carried must be verified and have a fidelity check of passed_full_read or corrected; a placement entry is never 'documented' (its place or road is a gazetteer entry, which is inferred); conflicts list at least two claims.
export function validateProvenance(p, at = 'provenance') {
  const err = [], KINDS = ['approach', 'stop', 'departure'];
  if (!p || !Array.isArray(p.entries) || typeof p.claims !== 'object' || !Array.isArray(p.peers) || !Array.isArray(p.conflicts)) return [`${at}: entries, claims, peers and conflicts are required`];
  for (const e of p.entries) {
    if (!KINDS.includes(e.kind)) err.push(`${at}: kind ${e.kind}`);
    if (e.modelled === true) {                                                                       // contract 1.6: a MODELLED road (kind approach): it names the sibling approach records it rests on, may rest on none that carry a claim, and is plausible-procedural
      if (e.kind !== 'approach' || e.tier !== 'plausible-procedural' || !Array.isArray(e.siblings) || !e.siblings.length || !isStr(e.entry) || !isStr(e.phrase) || !Array.isArray(e.claims) || !isStr(e.register)) err.push(`${at}: modelled entry ${e.entry} must be an approach, plausible-procedural, name its siblings, its printed phrase and its register entry`);
      for (const s of e.siblings || []) if (!isStr(s.ap) || !isStr(s.unit) || !isStr(s.road) || !isStr(s.phrase) || !['claim', 'ledger_row'].includes(s.source) || (s.source === 'claim' && (!isStr(s.claim) || !isStr(s.report)))) err.push(`${at}: modelled entry ${e.entry}: a sibling names its approach record, unit, road, printed words and report`);
    } else if (!isStr(e.entry) || !isStr(e.phrase) || !Array.isArray(e.claims) || !e.claims.length || !e.claims.includes(e.claim)) err.push(`${at}: entry ${e.entry} must name its claim and its printed phrase`);
    if (!['inferred', 'plausible-procedural'].includes(e.tier)) err.push(`${at}: entry ${e.entry} tier ${e.tier}`);
    if (typeof e.applied !== 'boolean' || (!e.applied && !isStr(e.why_not))) err.push(`${at}: entry ${e.entry} says whether it is applied and, if not, why`);
    for (const id of e.claims || []) if (!p.claims[id]) err.push(`${at}: claim ${id} is not carried`);
  }
  for (const [id, c] of Object.entries(p.claims)) {
    if (c.id !== id || !isStr(c.report) || !isStr(c.quote) || !TIERS.includes(c.tier)) err.push(`${at}: claim ${id} lacks its report, quote or tier`);
    if (!['passed_full_read', 'corrected'].includes(c.fidelity)) err.push(`${at}: claim ${id} has fidelity ${c.fidelity}`);
    if (c.quote.trim().split(/\s+/).length > 15) err.push(`${at}: claim ${id} quote is over 15 words`);
  }
  if (p.absence !== undefined && p.absence !== null) {                                                // contract 1.8 (history layer v8, DEC-023E): a documented absence from the field; optional
    const a = p.absence;
    if (a.tier !== 'documented' || !isStr(a.summary) || !isStr(a.register) || !isStr(a.decision) || !Array.isArray(a.claims) || a.claims.length < 2) err.push(`${at}: an absence is documented, has a summary, a register entry, a decision and at least two claims`);
    else for (const id of a.claims) if (!p.claims[id]) err.push(`${at}: absence claim ${id} is not carried`);
  }
  for (const [id, c] of Object.entries(p.claims)) if (c.source_kind !== undefined && (c.source_kind !== 'statevol' || !isStr(c.work || c.volume))) err.push(`${at}: claim ${id} names a source kind it cannot describe (a state regimental volume needs its work)`);
  for (const c of p.conflicts) if (!Array.isArray(c.claims) || c.claims.length < 2 || !Array.isArray(c.values) || c.values.length < 2) err.push(`${at}: a conflict lists both values`);
  return err;
}
// contract 1.5: the day-level positions of the troop maps for a unit. `days` has one entry per day sheet (J1, J2, J3) on which the unit, or the nearest unit above it with a label, has any label; `hour` is the
// hour-sheet entry or null. Only a SINGLE-label position (status 'single', `used` names its claim) may be drawn; several labels (status 'multiple'), a movement arrow alone, and a division or corps label place
// nothing (`used` null, `drawn_as` null). A position is never drawn for a unit that is not drawn; an hour-sheet entry is never documented (its claims are inferred and the entry says the sheet's author and date are unknown).
// Contract 1.7 (DEC-018): a 'sequence' entry (several labels put in order by their line states) uses no single claim (`used` null) and draws each of its `items` in its window; every single or sequence entry carries
// `items` (one per claim and state, in the order of the day) and each item names its claim, its state (null where none was read), the tier of the state and of its time, the rule of its window, and whether it is drawn.
export function validateDayPositions(d, unit, at = 'day_positions') {
  const err = [], STATUS = ['single', 'sequence', 'multiple', 'movement_only', 'formation'], DRAWN = ['placed', 'not_applied', 'not_drawn', 'not_used', 'aggregate', null], ST = ['first', 'intermediate', 'evening', 'all_day', 'mixed', null];
  if (!d || !Array.isArray(d.days)) return [`${at}: days are required`];
  const entry = (e, hour) => {
    const me = `${at} ${e.sheet}`;
    if (!(hour ? e.sheet === 'H' : ['J1', 'J2', 'J3'].includes(e.sheet))) err.push(`${me}: sheet`);
    if (!STATUS.includes(e.status)) err.push(`${me}: status ${e.status}`);
    if (!isStr(e.source) || !isStr(e.date) || !isStr(e.why)) err.push(`${me}: source, date and why are required`);
    if (!Array.isArray(e.claims) || !e.claims.length || e.claims.length !== e.labels) err.push(`${me}: claims must list every label (${e.labels})`);
    if (e.status === 'single') { if (!e.used || !e.claims.includes(e.used) || e.labels !== 1) err.push(`${me}: a single-label position names its one claim`); if (!Array.isArray(e.items) || e.items.length !== 1) err.push(`${me}: a single-label position has one state item`); }
    else if (e.status === 'sequence') { if (e.used !== null) err.push(`${me}: a sequence uses no single claim`); if (!Array.isArray(e.items) || e.items.length < 2 || !isStr(e.order_why)) err.push(`${me}: a sequence lists its items in order and says what orders them`); if (hour) err.push(`${me}: the hour sheet has no line states`); }
    else { if (e.used !== null) err.push(`${me}: ${e.status} places nothing, so no claim is used`); if (e.drawn_as !== null) err.push(`${me}: ${e.status} is never drawn`); if (e.status === 'multiple' && !isStr(e.order_why)) err.push(`${me}: several labels not drawn say why their states do not order them`); }
    if (!DRAWN.includes(e.drawn_as)) err.push(`${me}: drawn_as ${e.drawn_as}`);
    if (e.drawn_as && e.drawn_as !== 'placed' && !isStr(e.why_not)) err.push(`${me}: a position that is not drawn says why`);
    if (e.drawn_as === 'placed' && !unit.drawn) err.push(`${me}: placed on a unit that is not drawn`);
    if (!Array.isArray(e.ledger_compare)) err.push(`${me}: ledger_compare`);
    for (const x of e.ledger_compare || []) if (!isStr(x.entry) || !isNum(x.distance_m) || typeof x.agree !== 'boolean') err.push(`${me}: a comparison with a ledger place gives the entry, the distance and whether they agree`);
    for (const it of e.items || []) {
      if (!isStr(it.entry) || !e.claims.includes(it.claim)) err.push(`${me}: an item names its entry and one of the labels`);
      if (!ST.includes(it.state)) err.push(`${me}: item state ${it.state}`);
      if (it.state && (!isStr(it.state_basis) || !isStr(it.state_crop) || it.state_tier !== 'documented' || !['documented', 'modelled'].includes(it.state_time_tier) || !isStr(it.rule))) err.push(`${me}: a read line state carries its basis, its crop, its tier, the tier of its time and the rule of its window`);
      if (!it.state && (it.state_tier !== null || it.state_time_tier !== null)) err.push(`${me}: no state, no state tier`);
      if (it.state_time_tier === 'documented' && !(it.line_clock && it.line_clock.usable)) err.push(`${me}: a documented time of a state needs a usable clock printed beside the line`);
      if (it.state === 'mixed' && !(Array.isArray(it.states) && it.states.length >= 2)) err.push(`${me}: a mixed item lists its states`);
      if (!DRAWN.includes(it.drawn_as)) err.push(`${me}: item drawn_as ${it.drawn_as}`);
      if (it.drawn_as && it.drawn_as !== 'placed' && !isStr(it.why_not)) err.push(`${me}: an item that is not drawn says why`);
      if (it.drawn_as === 'placed' && !unit.drawn) err.push(`${me}: item placed on a unit that is not drawn`);
      if (!Array.isArray(it.ledger_compare)) err.push(`${me}: item ledger_compare`);
    }
  };
  for (const e of d.days) entry(e, false);
  if (d.hour) entry(d.hour, true);
  return err;
}
export function validateArrivals(arrivals, unitIds) {
  const err = [];
  for (const a of arrivals) {
    const at = `arrival ${a.unit}`;
    if (!unitIds.has(a.unit)) err.push(`${at}: unknown unit`);
    if (![a.earliest, a.default, a.latest].every(isNum) || !(a.earliest <= a.default && a.default <= a.latest)) err.push(`${at}: need earliest <= default <= latest (minutes)`);
    if (a.entry === null) { if (!isStr(a.entry_status)) err.push(`${at}: a null entry needs entry_status saying why (open gap)`); }      // contract 1.1: no resolved entry is an open gap, not a guess
    else if (!isLL(a.entry) || !isNum(a.entry.sigma_m)) err.push(`${at}: entry {lng,lat,sigma_m}`);
    if (!TIERS.includes(a.tier)) err.push(`${at}: tier`);
  }
  return err;
}
export function validateEvents(events, unitIds, presence) {
  const err = []; let last = -Infinity;
  for (const e of events) {
    const at = `event ${e.type}@${e.t} ${e.unit}`;
    if (!EVENT_TYPES.includes(e.type)) err.push(`${at}: type`);
    if (!isNum(e.t)) err.push(`${at}: t`); else if (e.t < last) err.push(`${at}: events must be time-ordered`); else last = e.t;
    if (!unitIds.has(e.unit)) err.push(`${at}: unknown unit`);
    if (e.type === 'enter' && !isLL(e.at)) err.push(`${at}: enter needs at {lng,lat}`);
    if (e.type === 'path') {
      if (!Array.isArray(e.wp) || e.wp.length < 2) err.push(`${at}: path needs >= 2 waypoints`);
      else { if (e.wp[0].t !== e.t) err.push(`${at}: first waypoint time must equal event time`); e.wp.forEach((w, i) => { if (!isNum(w.t) || !isLL(w) || !isNum(w.sigma_m) || (i && w.t < e.wp[i - 1].t)) err.push(`${at}: waypoint ${i}`); }); }
    }
    if (e.type === 'activity' && !(e.activity in ACTIVITIES)) err.push(`${at}: unknown activity ${e.activity}`);
    // contract 1.3: a change of formation names a formation and may name its length in seconds (the stage blends the figures from the one layout to the other, never a snap)
    if (e.type === 'formation') { if (!FORMATIONS.includes(e.formation)) err.push(`${at}: formation ${e.formation}`); if (e.duration_s != null && !(isNum(e.duration_s) && e.duration_s > 0)) err.push(`${at}: duration_s`); }
    // contract 1.3: a state event is one figure leaving the line (agent = the figure's index inside the unit, 0 .. drawn - 1) and the unit's running counts as RANGES
    if (e.type === 'state') {
      if (!Number.isInteger(e.agent) || e.agent < 0) err.push(`${at}: state needs the integer index of the figure (agent)`);
      if (!FATES.includes(e.fate)) err.push(`${at}: state fate ${e.fate}`);
      for (const k of ['strength_now', 'killed', 'wounded', 'missing']) { const r = e[k]; if (!r || !isNum(r.min) || !isNum(r.max) || r.min > r.max || r.min < 0) err.push(`${at}: state ${k} must be a range {min,max} with 0 <= min <= max`); }
      if (e.tier === 'documented') err.push(`${at}: a procedural loss event cannot be documented`);
    }
  }
  return err;
}
// contract 1.3: a unit's casualties. total = { printed, min, max } (printed is the figure that drives the picture), fates = { killed|wounded|missing: { point, min, max } }; never documented below a printed row
export function validateCasualties(c, at = 'casualties') {
  const err = [];
  if (!c || typeof c !== 'object') return [`${at}: missing`];
  if (!['printed', 'procedural', 'none'].includes(c.kind)) err.push(`${at}: kind`);
  if (!isStr(c.basis)) err.push(`${at}: a basis string is required`);
  if (!TIERS.includes(c.tier)) err.push(`${at}: tier`);
  if (c.kind !== 'none') {
    const t = c.total; if (!t || !Number.isInteger(t.printed) || !Number.isInteger(t.min) || !Number.isInteger(t.max) || !(t.min <= t.printed && t.printed <= t.max)) err.push(`${at}: total must be {printed, min, max} with min <= printed <= max`);
    if (c.tier === 'documented') err.push(`${at}: a procedural share cannot be documented`);
    if (c.weak_source !== true) err.push(`${at}: weak_source must be true (Stone Sentinels and the PDF B.1 tables are weak sources)`);
    let sum = 0, lo = 0, hi = 0;
    for (const f of FATES) { const r = c.fates && c.fates[f]; if (!r || !Number.isInteger(r.point) || !(r.min <= r.point && r.point <= r.max)) err.push(`${at}: fates.${f} must be {point, min, max} with min <= point <= max`); else { sum += r.point; lo += r.min; hi += r.max; } }
    if (t && sum !== t.printed) err.push(`${at}: the fate split ${sum} does not add up to the total ${t.printed}`);
    if (t && (lo > t.printed || hi < t.printed)) err.push(`${at}: the fate ranges cannot add up to the total`);
  }
  return err;
}
// contract 1.3: a battery's guns. status 'drawn' needs a stated count; anything else says why no gun is drawn (never a default count)
export function validateGuns(g, at = 'guns') {
  const err = [];
  if (!g) return [`${at}: missing`];
  if (!['drawn', 'not_drawn', 'not_applicable'].includes(g.status)) err.push(`${at}: status`);
  if (g.status === 'drawn' && !(Number.isInteger(g.count) && g.count > 0)) err.push(`${at}: a drawn battery needs a stated gun count`);
  if (g.status === 'not_drawn' && !isStr(g.reason)) err.push(`${at}: not drawn needs a reason`);
  return err;
}
export function validateKit(k) {
  const err = [];
  if (!isStr(k.id) || !isStr(k.unit)) err.push('kit id/unit');
  if (!Array.isArray(k.items)) err.push('kit items'); else for (const it of k.items) { if (!isStr(it.category) || !isStr(it.item) || !TIERS.includes(it.tier) || !Array.isArray(it.sources)) err.push(`kit item ${it.category}`); }
  if (!k.validator || typeof k.validator.rule !== 'string') err.push('kit validator');
  return err;
}
export function validateLayer(layer) {
  const need = ['meta', 'units', 'sources', 'arrivals', 'events', 'kit', 'objects'], miss = need.filter(k => !(k in layer));
  return miss.map(k => `layer is missing ${k}`);
}

// the number of figures a unit is drawn with: its procedural share when the record has no figure, else the top of its declared range
export const strengthDrawn = u => (u.strength.min === null ? u.strength.drawn : u.strength.max);
// text for a unit's strength: a range, a single printed figure, or the honest absence of one
export function strengthText(u, fmt = n => String(n)) {
  const s = u.strength;
  if (s.min === null) return s.drawn ? `about ${fmt(s.drawn)} (procedural share; the record has no figure for this unit)` : s.share ? `about ${fmt(s.share)} (procedural share, not drawn: the unit has no place in the record)` : 'no figure in the record';
  return s.max !== s.min ? `${fmt(s.min)}-${fmt(s.max)}` : `${fmt(s.min)} (single printed figure)`;
}
