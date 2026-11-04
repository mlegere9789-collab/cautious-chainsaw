// Placement: where a unit enters the loaded ground, where it goes and where it leaves, from data/placement.json (curated reading of printed ledger cells) and the gazetteer.
// Scenario independent: this module produces GEOMETRY (start, route, stops, departures, slots); real.mjs gives it times. Nothing here invents a coordinate:
//  * the entry is where the NAMED road crosses the edge of the loaded ground;
//  * a stop is a gazetteer place (centre + sigma) with a plausible-procedural slot inside it for each unit;
//  * a unit with no approach is left unresolved (no entry), and a unit with an approach but no stop stays in its column outside the ground (arrival edge only);
//  * a unit leaves only through a departure clause that names the road it leaves by.
// data/placement.json v2 carries, besides `approach` and `positions` (the entries that drive geometry), `departures`, `activities` and `clauses` (EVERY key-position, night-position,
// first-on-field and left-or-moved clause of the 44 ledger rows, each either transcribed or unresolved with its reason). The loader refuses any phrase that is not in the ledger cell.
import { norm, nearestOnLine, sliceLine, boxCrossings, lineLength, distM, bearingDegLL, offsetLL, simplify, polylineLength, insideBox } from './gazetteer.mjs';
import { isoToMin } from '../clock.mjs';
import { clockAgrees, printedPeriod } from './claim-clock.mjs';
import { DIM, depthOf, widthOf, slotKind } from '../layout.mjs';
import { dayWindow, HOUR_SHEET, DayPositions, eveningOf, itemsOf } from './daypos.mjs';

export const PLAN = { outsideM: 120, entrySigmaM: 2000, simplifyM: 12, rowGapM: 12 };      // tuning values of this layer (not historical): how far outside the edge the head waits, the along-road uncertainty at the edge, route simplification, spacing of rows of columns
// Named periods the ledger uses in place of a clock. Labelled conventions, NOT historical claims: PDF B.2.2 defines [NIGHT] as after the end of civil twilight (20:04) and [DUSK] as sunset 19:32 to 20:04,
// "from the computed July 2 values"; the PDF prints sunset 19:32 for Jul 1 as well. They are applied to the date the clause prints.
export const PERIODS = { night: '20:04', evening: '19:32', dusk: '19:32' };
export const CELLS = ['key_positions', 'night_positions', 'first_on_field', 'left_or_moved'];
export const CLAIM_FIDELITY_OK = ['passed_full_read', 'corrected'], CLAIM_TIERS_OK = ['documented', 'inferred'];
export const KINDS = ['stop', 'approach', 'departure', 'activity', 'formation', 'record'];

const pointAt = (line, s) => { const p = sliceLine(line, s, s); return p.length ? p[0] : { ...line[0] }; };
const MON = { Jun: 0, Jul: 30 };
// is month/day printed in the cell text?  Handles "Jul 1", "Jul 1-2", "Jun 30-Jul 1", "Jul 4-5" (a range covers every day in it)
export function datePrinted(cell, mm, dd) {
  const want = (mm === '06' ? 0 : 30) + dd, re = /\b(Jun|Jul)\s+(\d{1,2})(?:\s*-\s*(?:(Jun|Jul)\s+)?(\d{1,2}))?/g; let m;
  while ((m = re.exec(cell || ''))) { const a = MON[m[1]] + +m[2], b = m[4] ? (MON[m[3] || m[1]] + +m[4]) : a; if (want >= a && want <= b) return true; }
  return false;
}
const clockPrinted = (hhmm, text) => text.includes(hhmm) || (hhmm === '12:00' && /\bnoon\b/i.test(text)) || (hhmm === '00:00' && /\bmidnight\b/i.test(text));

export class Placement {
  // `claimsDoc` (data/placement-claims.json, optional): entries read from the OR27 position ledgers. They are merged after the entries of the PDF ledger rows and carry `claim` (the ledger claim)
  // where the others carry `row`/`cell`; the loader checks each against the digest of its claim (validateClaimEntry), as it checks the others against the printed cell.
  constructor({ doc, claimsDoc, siblingDoc, gaz, units, rows, box, gateOf }) {
    this.doc = doc; this.cdoc = claimsDoc || null; this.gaz = gaz; this.units = units; this.by = new Map(units.map(u => [u.id, u])); this.rows = new Map(rows.map(r => [r.id, r])); this.box = box;
    const c = this.cdoc || {}; this.claims = c.claims || {};
    this.absent = c.documented_absent || [];                                              // leaf units the record places away from the field for the whole battle (history layer v8, DEC-023E): not drawn, not counted
    this.block = c.approach_block || [];                                                  // units that take no approach from a formation above (the reports disagree: DEC-014); listed, never resolved
    this.sib = siblingDoc || null;                                                          // data/sibling-approach.json (v6, DEC-015): MODELLED roads of approach taken from the sibling formations of a corps
    this.ap = [...doc.approach, ...(c.approach || []), ...(siblingDoc ? siblingDoc.approach : [])]; this.po = [...doc.positions, ...(c.positions || [])]; this.dep = [...(doc.departures || []), ...(c.departures || [])]; this.act = [...(doc.activities || []), ...(c.activities || [])]; this.cl = doc.clauses || [];
    this.gateOf = gateOf || (() => -Infinity);
  }
  // ---- an entry read from a ledger claim: every field is re-checked against the claim's own digest (id, unit, verified, fidelity, tier, quote, printed words, printed clock)
  validateClaimEntry(e, what) {
    const bad = [], me = `${e.id}`, C = this.claims, c = C[e.claim], unitsOf = e.units || [e.unit];
    if (!c) return [`${me}: claim ${e.claim} is not in placement-claims.json`];
    for (const id of e.claims || [e.claim]) { const k = C[id]; if (!k) bad.push(`${me}: claim ${id} is not in placement-claims.json`); else if (k.verified !== true || !CLAIM_FIDELITY_OK.includes(k.fidelity) || !CLAIM_TIERS_OK.includes(k.tier)) bad.push(`${me}: claim ${id} may not be used (verified ${k.verified}, fidelity ${k.fidelity}, tier ${k.tier})`); }
    for (const u of unitsOf) { if (!this.by.has(u)) bad.push(`${me}: unknown unit ${u}`); else if (what !== 'activity' && u !== c.unit) bad.push(`${me}: unit ${u} is not the unit of claim ${e.claim} (${c.unit})`); }
    if (!['inferred', 'plausible-procedural'].includes(e.tier)) bad.push(`${me}: tier ${e.tier}`);
    if (!e.phrase || e.phrase.trim().split(/\s+/).length > 15) bad.push(`${me}: a phrase of at most 15 words is required`);
    else if (e.phrase_in === 'record') { if (!e.record || e.record !== c.report) bad.push(`${me}: a record phrase names the record of its claim (${c.report})`); }
    else {
      const f = { quote: c.quote, 'place.printed': c.place.printed, direction_or_road: c.place.direction_or_road }[e.phrase_in];
      if (f == null || /\[/.test(f) && e.phrase_in === 'direction_or_road') bad.push(`${me}: phrase_in ${e.phrase_in} is not a printed field of claim ${e.claim}`);
      else if (!norm(f).includes(norm(e.phrase))) bad.push(`${me}: the phrase “${e.phrase}” is not in the ${e.phrase_in} of claim ${e.claim}: “${f}”`);
    }
    if (what === 'approach' || what === 'departure') { const g = this.gaz.resolve(e.road); if (!g || !g.line) bad.push(`${me}: road "${e.road}" is not a gazetteer line`); }
    if (what === 'position') {
      const pl = this.gaz.resolve(e.place); if (!pl) bad.push(`${me}: place "${e.place}" does not resolve`); else { if (pl.stream || (!pl.line && pl.sigma_m > 1500)) bad.push(`${me}: place "${e.place}" is too broad to stand a unit in`); if (e.sigma_m !== pl.sigma_m) bad.push(`${me}: sigma_m ${e.sigma_m} is not the gazetteer's ${pl.sigma_m}`); if (c.place.gazetteer_ref !== pl.id) bad.push(`${me}: ${pl.id} is not the gazetteer place the ledger references for claim ${e.claim} (${c.place.gazetteer_ref})`); }
    }
    if (what === 'position' || what === 'departure') {
      if (!e.t || isoToMin(e.t) == null) bad.push(`${me}: bad time ${e.t}`);
      else if (e.t_basis === 'printed') { if (e.t !== c.when.t_iso) bad.push(`${me}: ${e.t} is not the t_iso of claim ${e.claim} (${c.when.t_iso})`); else if (!clockAgrees(c.when.printed, e.t).ok) bad.push(`${me}: the printed words “${c.when.printed}” do not give ${e.t}`); }
      else if (e.t_basis === 'convention') {
        const per = printedPeriod(c.when.printed); if (!per || per !== e.period || !(e.period in PERIODS)) bad.push(`${me}: the period “${e.period}” is not printed in “${c.when.printed}”`); else if (e.t !== `${c.when.date}T${PERIODS[per]}`) bad.push(`${me}: ${e.t} is not the ${per} convention of ${c.when.date}`);
      } else bad.push(`${me}: t_basis ${e.t_basis}`);
    }
    return bad;
  }
  // ---- a MODELLED road of approach (v6, DEC-015, kind 'sibling'): the road is the one every documented sibling formation of the corps names. Nothing here reads a claim: the record names the approach
  // records it rests on, and the loader recomputes the set of documented siblings and refuses the record unless it is complete, unanimous and crosses the loaded ground.
  validateSibling(e) {
    const bad = [], me = e.id, own = this.ap.filter(a => a.kind !== 'sibling');
    if (e.modelled !== true || e.tier !== 'plausible-procedural') bad.push(`${me}: a sibling road is modelled and plausible-procedural`);
    if (!this.by.has(e.unit)) { bad.push(`${me}: unknown unit ${e.unit}`); return bad; }
    const road = this.gaz.resolve(e.road); if (!road || !road.line) { bad.push(`${me}: road "${e.road}" is not a gazetteer line`); return bad; }
    const cu = this.chain(e.unit);
    if (!this.by.has(e.formation) || e.formation === e.unit || !cu.includes(e.formation)) bad.push(`${me}: ${e.formation} is not a formation above ${e.unit}`);
    if (this.by.has(e.formation) && ['corps', 'army'].includes(this.by.get(e.unit).level)) bad.push(`${me}: a modelled road is never attached at corps or army level`);
    if (cu.some(x => own.some(a => a.unit === x))) bad.push(`${me}: a road is printed for a formation on the line of command of ${e.unit}; the nearer printed road is used and no road is modelled`);
    if (cu.some(x => this.block.some(b => b.unit === x))) bad.push(`${me}: the reports of the line of command disagree (approach_block); no road is modelled`);
    const docs = own.filter(a => this.by.has(a.unit) && a.unit !== e.formation && this.chain(a.unit).includes(e.formation) && !cu.includes(a.unit) && !this.entryOf(a).error);
    const want = docs.map(a => a.id).sort().join(','), have = (e.siblings || []).map(s => s.ap).sort().join(',');
    if (!docs.length) bad.push(`${me}: no documented sibling formation under ${e.formation}`);
    if (want !== have) bad.push(`${me}: the documented siblings under ${e.formation} are ${want || 'none'}, the record lists ${have || 'none'}`);
    for (const a of docs) if (this.gaz.resolve(a.road).id !== road.id) bad.push(`${me}: sibling ${a.id} names ${a.road}, not ${e.road}: the siblings disagree, so no road is modelled`);
    for (const s of e.siblings || []) { const a = own.find(x => x.id === s.ap); if (!a || a.unit !== s.unit || a.road !== s.road || a.phrase !== s.phrase) bad.push(`${me}: sibling ${s.ap} is not copied from its approach record`); }
    for (const id of e.claims || []) if (!this.claims[id]) bad.push(`${me}: claim ${id} is not in placement-claims.json`);
    const en = this.entryOf(e); if (en.error) bad.push(`${me}: ${en.error}`);
    for (const l of e.leaves || []) if (!this.by.has(l) || !this.chain(l).includes(e.unit)) bad.push(`${me}: leaf ${l} is not under ${e.unit}`);
    if (!(e.leaves || []).length) bad.push(`${me}: no leaf unit`);
    if (e.decision !== 'DEC-015' || !e.register) bad.push(`${me}: the decision and the register entry are named`);
    return bad;
  }
  // ---- validation against the printed cells and the gazetteer. Returns a list of problems (empty when every entry holds).
  validate() {
    const bad = [], cellOf = (e, cell = e.cell) => { const r = this.rows.get(e.row); return r ? String((r.raw || {})[cell] ?? '') : null; };
    const inCell = (e, text) => { const c = cellOf(e); return c != null && norm(c).includes(norm(text)); };
    const phrase = e => { if (!this.rows.has(e.row)) bad.push(`${e.id}: unknown ledger row ${e.row}`); else if (!CELLS.includes(e.cell) || !inCell(e, e.phrase)) bad.push(`${e.id}: phrase is not in the printed ${e.cell} cell of ${e.row}: "${e.phrase}"`); };
    const placeOk = (e, key = 'place') => { const pl = this.gaz.resolve(e[key]); if (!pl) bad.push(`${e.id}: place "${e[key]}" does not resolve in the gazetteer`); else if (pl.stream || (!pl.line && pl.sigma_m > 1500)) bad.push(`${e.id}: place "${e[key]}" is too broad to stand a unit in (${pl.stream ? 'a stream' : 'sigma ' + pl.sigma_m + ' m'})`); else if (e.sigma_m != null && e.sigma_m !== pl.sigma_m) bad.push(`${e.id}: sigma_m ${e.sigma_m} is not the gazetteer's ${pl.sigma_m} for "${e[key]}"`); };
    const times = e => {
      const text = e.phrase || '', dc = cellOf(e, e.date_cell || e.cell) ?? '', dcAll = cellOf(e) ?? '';
      if (e.t_basis === 'convention') {
        if (!(e.period in PERIODS)) bad.push(`${e.id}: unknown period ${e.period}`);
        else {
          const word = e.period === 'night' ? (e.cell === 'night_positions' || /night/i.test(text)) : new RegExp(e.period, 'i').test(text) || (e.period === 'dusk' && /evening/i.test(text));
          if (!word) bad.push(`${e.id}: the period "${e.period}" is not printed`);
          if (e.t && e.t.slice(11, 16) !== PERIODS[e.period]) bad.push(`${e.id}: ${e.t} is not the ${e.period} convention ${PERIODS[e.period]}`);
        }
      }
      for (const k of ['t', 'depart', 't_to']) if (e[k]) {
        const m = isoToMin(e[k]); if (m == null) { bad.push(`${e.id}: bad ${k} ${e[k]}`); continue; }
        const hhmm = e[k].slice(11, 16); if (!(e.t_basis === 'convention' && k === 't') && !clockPrinted(hhmm, e.time_context ? dcAll : text)) bad.push(`${e.id}: ${k} ${hhmm} is not printed in the phrase`);
        const d = +e[k].slice(8, 10), mon = e[k].slice(5, 7); if (!datePrinted(dc, mon, d)) bad.push(`${e.id}: the date ${mon === '06' ? 'Jun' : 'Jul'} ${d} is not printed in the ${e.date_cell || e.cell} cell`);
      }
      if (e.d && !datePrinted(dc, e.d.slice(0, 2), +e.d.slice(3, 5))) bad.push(`${e.id}: the date ${e.d} is not printed in the ${e.date_cell || e.cell} cell`);
    };
    for (const e of this.ap) {
      if (e.kind === 'sibling') { bad.push(...this.validateSibling(e)); continue; }
      if (e.claim) { bad.push(...this.validateClaimEntry(e, 'approach')); continue; }
      if (!this.by.has(e.unit)) bad.push(`${e.id}: unknown unit ${e.unit}`);
      phrase(e);
      const g = this.gaz.resolve(e.road); if (!g || !g.line) bad.push(`${e.id}: road "${e.road}" is not a gazetteer line`);
    }
    for (const e of this.po) {
      if (e.claim) { bad.push(...this.validateClaimEntry(e, 'position')); for (const v of e.via || []) if (!this.gaz.resolve(v)) bad.push(e.id + ': via does not resolve'); continue; }
      for (const u of e.units) if (!this.by.has(u)) bad.push(`${e.id}: unknown unit ${u}`);
      phrase(e); placeOk(e); for (const v of e.via || []) if (!this.gaz.resolve(v)) bad.push(`${e.id}: via "${v}" does not resolve`); times(e);
    }
    for (const e of this.dep) {
      if (e.claim) { bad.push(...this.validateClaimEntry(e, 'departure')); continue; }
      for (const u of e.units) if (!this.by.has(u)) bad.push(`${e.id}: unknown unit ${u}`);
      phrase(e); times(e); if (e.cell !== 'left_or_moved') bad.push(`${e.id}: a departure comes from a left_or_moved clause`);
      const g = this.gaz.resolve(e.road); if (!g || !g.line) bad.push(`${e.id}: road "${e.road}" is not a gazetteer line`);
      if (!e.t) bad.push(`${e.id}: a departure needs a printed time`);
    }
    for (const e of this.act) {
      if (e.claim) { bad.push(...this.validateClaimEntry(e, 'activity')); continue; }
      for (const u of e.units) if (!this.by.has(u)) bad.push(`${e.id}: unknown unit ${u}`);
      phrase(e); times(e); if (e.place) placeOk(e);
    }
    for (const b of this.block) { if (!this.by.has(b.unit)) bad.push(`approach_block: unknown unit ${b.unit}`); for (const id of b.claims || []) if (!this.claims[id]) bad.push(`approach_block ${b.unit}: claim ${id} is not in placement-claims.json`); if (!b.reason || b.reason.length < 20) bad.push(`approach_block ${b.unit}: a reason is required`); }
    // documented absences (v8): each names its unit (a leaf of the roster), at least two claims that the loader may use and that are the unit's own (at least one documented), and no entry places the unit
    for (const a of this.absent) {
      const u = this.by.get(a.unit); if (!u || u.children.length) { bad.push(`documented_absent: ${a.unit} is not a leaf unit of the roster`); continue; }
      if (a.tier !== 'documented' || !a.register || !a.decision || !a.summary || a.summary.length < 60) bad.push(`documented_absent ${a.unit}: tier documented, register, decision and a summary are required`);
      if ((a.claims || []).length < 2) bad.push(`documented_absent ${a.unit}: at least two claims are required`);
      for (const id of a.claims || []) { const k = this.claims[id]; if (!k) bad.push(`documented_absent ${a.unit}: claim ${id} is not in placement-claims.json`); else { if (k.verified !== true || !CLAIM_FIDELITY_OK.includes(k.fidelity) || !CLAIM_TIERS_OK.includes(k.tier)) bad.push(`documented_absent ${a.unit}: claim ${id} may not be used`); if (k.unit !== a.unit) bad.push(`documented_absent ${a.unit}: claim ${id} is the claim of ${k.unit}`); if (!k.quote || k.quote.trim().split(/\s+/).length > 14) bad.push(`documented_absent ${a.unit}: claim ${id} has no quote of under 15 words`); } }
      if (!(a.claims || []).some(id => this.claims[id] && this.claims[id].tier === 'documented')) bad.push(`documented_absent ${a.unit}: a documented claim is required`);
      if ([...this.ap, ...this.po, ...this.dep, ...this.act].some(e => (e.units || [e.unit]).includes(a.unit))) bad.push(`documented_absent ${a.unit}: an entry also places the unit`);
    }
    { const ids = new Set(); for (const e of [...this.ap, ...this.po, ...this.dep, ...this.act]) { if (ids.has(e.id)) bad.push(e.id + ': duplicate entry id'); ids.add(e.id); } }
    const seen = new Set(), driven = new Set([...this.ap, ...this.po, ...this.dep, ...this.act].map(e => e.id));
    for (const c of this.cl) {
      if (seen.has(c.id)) bad.push(`${c.id}: duplicate clause id`); seen.add(c.id);
      for (const u of c.units || []) if (!this.by.has(u)) bad.push(`${c.id}: unknown unit ${u}`);
      phrase(c); times(c);
      if (c.status === 'unresolved') { if (!c.reason || c.reason.length < 8) bad.push(`${c.id}: an unresolved clause needs its reason`); if (c.drives && c.drives.length) bad.push(`${c.id}: an unresolved clause drives nothing`); }
      else if (c.status === 'transcribed') {
        if (!KINDS.includes(c.kind)) bad.push(`${c.id}: unknown kind ${c.kind}`);
        if (c.place) placeOk(c); for (const q of c.places || []) { const pl = this.gaz.resolve(q.place); if (!pl) bad.push(`${c.id}: place "${q.place}" does not resolve in the gazetteer`); else if (q.sigma_m !== pl.sigma_m) bad.push(`${c.id}: sigma_m ${q.sigma_m} is not the gazetteer's ${pl.sigma_m} for "${q.place}"`); }
        if (c.road && !(this.gaz.resolve(c.road) || {}).line) bad.push(`${c.id}: road "${c.road}" is not a gazetteer line`);
        if (!c.place && !(c.places || []).length && !c.road && !c.activity && !c.formation) bad.push(`${c.id}: a transcribed clause names a place, a road, an activity or a formation`);
        if (!(c.units || []).length) bad.push(`${c.id}: a transcribed clause names its units`);
        if (c.tier == null || !['inferred', 'plausible-procedural'].includes(c.tier)) bad.push(`${c.id}: tier`);
        if (!Array.isArray(c.sources)) bad.push(`${c.id}: sources`);
        if (!(c.drives && c.drives.length) && !c.not_driving) bad.push(`${c.id}: a transcribed clause that drives nothing says why (not_driving)`);
      } else bad.push(`${c.id}: status ${c.status}`);
      for (const d of c.drives || []) if (!driven.has(d)) bad.push(`${c.id}: drives unknown entry ${d}`);
    }
    return bad;
  }
  chain(id) { const out = []; let u = this.by.get(id); while (u) { out.push(u.id); u = u.parent ? this.by.get(u.parent) : null; } return out; }
  // the nearest approach entry on the unit's own line of command: { e, owner (unit id the entry is attached to), depth (0 = the unit itself), ownerLevel } or null
  approachInfo(id) { const ch = this.chain(id); for (let i = 0; i < ch.length; i++) { const e = this.ap.find(a => a.unit === ch[i]); if (e) return { e, owner: ch[i], depth: i, ownerLevel: this.by.get(ch[i]).level }; if (this.block.some(b => b.unit === ch[i])) return null; } return null; }
  // the block row (if any) that stops a unit from taking the road of a formation above, and the formation whose road it would have taken
  blockOf(id) { const ch = this.chain(id); for (let i = 0; i < ch.length; i++) { if (this.ap.find(a => a.unit === ch[i])) return null; const b = this.block.find(x => x.unit === ch[i]); if (b) { const up = ch.slice(i + 1).find(x => this.ap.find(a => a.unit === x)); return { ...b, inherited_from: up || null, road: up ? this.ap.find(a => a.unit === up).road : null }; } } return null; }
  approachOf(id) { const i = this.approachInfo(id); return i ? i.e : null; }
  // entries of kind `list` (positions, activities, departures) bearing on a unit: its own and its ancestors', time ordered. A unit is not given an entry that falls before its own ledger gate (it was not on the field yet).
  entriesOf(list, id, { gate = true } = {}) {
    const ch = this.chain(id), out = [], g = this.gateOf(id);
    ch.forEach((x, depth) => { for (const e of list) if (e.units.includes(x)) { const tm = isoToMin(e.t); if (gate && tm + 1e-6 < g) continue; out.push({ e, depth, tm }); } });
    out.sort((a, b) => a.tm - b.tm || a.depth - b.depth);
    return out;
  }
  // positions bearing on a unit: entries of itself and its ancestors, in time order; an entry of a nearer unit replaces a farther one that falls within 90 minutes of it
  positionsOf(id) {
    const out = this.entriesOf(this.po, id);
    return out.filter(p => !out.some(q => q.depth < p.depth && Math.abs(q.tm - p.tm) < 90)).map(p => p.e);
  }
  activitiesOf(id) { return this.entriesOf(this.act, id).map(p => p.e); }
  // printed changes of formation bearing on a unit (contract 1.3): transcribed clauses that carry a `formation` (kind formation, or a stop whose phrase also says “deploys”), for the unit or a
  // formation above it, not before the unit's own gate. { id, formation, t (iso), tm (minutes), stop (the PO entry the clause drives, or null: then the change is at the clause time) }
  formationsOf(id) {
    const ch = this.chain(id), g = this.gateOf(id), out = [];
    ch.forEach((x, depth) => { for (const c of this.cl) if (c.status === 'transcribed' && c.formation && (c.units || []).includes(x)) { const tm = isoToMin(c.t); if (tm == null || tm + 1e-6 < g) continue; out.push({ c, depth, tm }); } });
    out.sort((a, b) => a.tm - b.tm || a.depth - b.depth);
    return out.map(o => ({ id: o.c.id, formation: o.c.formation, t: o.c.t, tm: o.tm, phrase: o.c.phrase, stop: (o.c.drives || [])[0] || null, tier: o.c.tier, sources: o.c.sources || [], note: o.c.note || '' }));
  }
  departuresOf(id) { return this.entriesOf(this.dep, id).map(p => p.e); }

  // ---- road entry of an approach: the first place the named road comes into the loaded ground. -> { line (oriented outside->inside), crossing: {point, s}, sigma, road } or { error }
  entryOf(ap) {
    if (!this._entry) this._entry = new Map(); if (this._entry.has(ap.id)) return this._entry.get(ap.id);
    const road = this.gaz.resolve(ap.road); let line = road.line, res;
    let cs = boxCrossings(line, this.box);
    if (!cs.some(c => c.inward)) { const rev = line.slice().reverse(); const c2 = boxCrossings(rev, this.box); if (c2.some(c => c.inward)) { line = rev; cs = c2; } }
    const first = cs.find(c => c.inward);
    res = first ? { road, line, crossing: first, sigma: road.sigma_m, outsideLength: first.s } : { error: `the road "${ap.road}" does not cross into the loaded ground`, road };
    this._entry.set(ap.id, res); return res;
  }
  // the way out along a named road from a point: [{lng,lat}...] from `from` to the point where the road leaves the loaded ground (plus `beyondM` farther along), or null
  exitRoute(roadName, from, beyondM = 0) {
    const road = this.gaz.resolve(roadName); if (!road || !road.line) return null; const line = road.line, L = lineLength(line), j = nearestOnLine(line, from);
    let best = null;
    for (const [ln, flip] of [[line, false], [line.slice().reverse(), true]]) for (const c of boxCrossings(ln, this.box)) if (!c.inward) {
      const s = flip ? L - c.s : c.s, d = flip ? j.s - s : s - j.s;                    // path length along the road from the join point to this crossing, in the direction of travel
      if (d >= -1 && (!best || d < best.d)) best = { d, s, flip, c };
    }
    if (!best) return null;
    const s1 = best.flip ? Math.max(0, best.s - beyondM) : Math.min(L, best.s + beyondM), seg = sliceLine(line, j.s, s1);
    return { route: [{ ...from }, ...(seg.length ? seg : [j.point])], road, join: j.point, d: best.d };
  }
}

// -------------------------------------------------------------------------------------------------------------------------------------------------
// planTracks: geometry for every drawable leaf.
//   leaves: [{ id, index, depth(m), kind }] in roster order.  -> Map(unitId -> plan)
//   dayPos (optional, daypos.mjs DayPositions): the day-level positions of the troop maps (contract 1.5). A plan then also carries `days` (one entry per day the unit has a usable single-label position, plus the
//   hour-sheet stop where it may be used) and the ledger stops that AGREE with a day position (the ledger place and the position overlap within their stated sigmas) take the slot inside the position.
//   The times of a day entry belong to real.mjs; here only geometry and the rules that do not depend on a scenario. startOf(id): the default-scenario start of the unit (for the status only).
export function planTracks({ leaves, placement, gaz, box, unitById, dayPos = null, startOf = null, marchMps = 1.25 }) {
  const plans = new Map(), groups = new Map();                                    // approach id -> leaves in column order
  for (const L of leaves) {
    const info = placement.approachInfo(L.id);
    if (!info) { const b = placement.blockOf(L.id); plans.set(L.id, { unit: L.id, status: 'unresolved', reason: b ? `a road of approach is printed for ${b.inherited_from || 'a formation above'}${b.road ? ' (' + b.road + ')' : ''}, but reports of this unit print another (${(b.values || []).join('; ')}) and disagree: none is chosen (${(b.claims || []).join(', ')})` : 'no road or direction of approach is printed in the ledger for this unit or any unit above it', stops: [], ...(b ? { blocked: true } : {}) }); continue; }
    const ap = info.e, en = placement.entryOf(ap);
    if (en.error) { plans.set(L.id, { unit: L.id, status: 'unresolved', reason: en.error + `; ${ap.id} prints it for ${info.owner}`, approach: ap.id, stops: [] }); continue; }
    if (!groups.has(ap.id)) groups.set(ap.id, []); groups.get(ap.id).push(L);
  }
  // columns of different approaches on the SAME road queue one behind the other, earliest gate first (a unit that only waits at the edge never moves, so a later column must not stand on it)
  const roadId = apId => gaz.resolve(placement.ap.find(a => a.id === apId).road).id, groupGate = group => Math.min(...group.map(L => { const g = placement.gateOf(L.id); return Number.isFinite(g) ? g : Infinity; }));
  const ordered = [...groups].sort(([a, ga], [b, gb]) => roadId(a).localeCompare(roadId(b)) || groupGate(ga) - groupGate(gb) || a.localeCompare(b)), roadOff = new Map();
  for (const [apId, group] of ordered) {
    const ap = placement.ap.find(a => a.id === apId), en = placement.entryOf(ap), rid = roadId(apId); let off = roadOff.get(rid) || 0, k = 0;
    for (const L of group) {                                                      // column order = roster order (the ledger's order); the head waits PLAN.outsideM outside the edge
      const mid = off + L.depth / 2, s0 = en.crossing.s - PLAN.outsideM - mid; off += L.depth + DIM.columnGapM;
      const clamped = s0 < 0, start = pointAt(en.line, Math.max(0, s0)), info = placement.approachInfo(L.id);
      plans.set(L.id, { unit: L.id, status: 'edge_only', reason: 'a road of approach is printed; no place after arrival is printed for this unit', approach: apId, road: ap.road, line: en.line, crossingS: en.crossing.s, sAtStart: Math.max(0, s0), start, startSigma: PLAN.entrySigmaM, queueOffsetM: Math.round(mid), clamped, stops: [], depth: L.depth,
        approachOwner: info.owner, approachDepth: info.depth, approachOwnerLevel: info.ownerLevel, columnIndex: ++k, columnSize: group.length });
    }
    roadOff.set(rid, off + PLAN.rowGapM);
  }
  // stops, in the order of the entries; slots are packed per entry among the leaves that carry it
  const carried = new Map();                                                     // po id -> leaves, roster order
  const stopsOf = new Map();                                                     // unit -> [po]
  for (const L of leaves) {
    const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue;
    const list = placement.positionsOf(L.id); stopsOf.set(L.id, list);
  }
  // requires_positioned entries apply only to units that have an earlier entry that does not require it; an entry at the place the unit already stands is dropped (it has not moved)
  for (const L of leaves) {
    const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue;
    const keep = []; plan.skipped = []; let positioned = false, lastPlace = null;
    for (const e of stopsOf.get(L.id)) {
      if (e.requires_positioned && !positioned) { plan.skipped.push({ entry: e.id, reason: 'requires an earlier placed position' }); continue; }
      const pid = gaz.resolve(e.place).id; if (pid === lastPlace) { plan.skipped.push({ entry: e.id, reason: 'already at this place' }); continue; }
      keep.push(e); positioned = true; lastPlace = pid;
    }
    stopsOf.set(L.id, keep);
  }
  // ---- day positions (contract 1.5). Leaves that share one troop-map claim form a group; the group is laid out inside the claim's position (plausible-procedural slots, as for a place).
  // A ledger stop of the same date that AGREES with the position (the ledger place and the position overlap within their stated sigmas: distance <= sigma of the place + sigma of the claim)
  // takes its slot inside the position (the ledger keeps the time, the troop map gives the finer place); the other leaves of the place keep the slots they had (a vacated row stays empty); a stop that does not agree is kept as it is and both are listed (distance on the card).
  // Contract 1.7 (DEC-018): a claim has one or more STATE ITEMS (its line state read by eye; a single label with no readable state has one item with state null; a mixed label standing alone has one item 'mixed';
  // a state-ordered sequence of several labels has one item per claim and state, in the order first, intermediate(s), evening). Each item becomes a day entry of the plan with the rule for its window; the times are made per scenario by real.mjs.
  const dgroups = new Map(), retarget = new Map();                               // claim id -> group; `${po}|${leaf}` -> { group, distance_m, sigma_sum }
  for (const L of leaves) { const plan = plans.get(L.id); if (plan && plan.status !== 'unresolved') { plan.days = []; plan.day_notes = []; } }
  if (dayPos) {
    for (const L of leaves) {
      const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue;
      const r = dayPos.forUnit(L.id);
      const add = (res, kind, items) => { for (const it of items) { const c = it.claim; if (!dgroups.has(c.id)) dgroups.set(c.id, { id: 'DAY-' + c.id, claim: c, kind, sheet: res.sheet, owner: res.owner, via: res.via, status: res.status, order_why: res.order_why, leaves: [], items: [], compare: new Map() }); const g = dgroups.get(c.id); if (!g.leaves.includes(L)) g.leaves.push(L); if (!g.items.some(x => x.eid === it.eid)) g.items.push({ eid: it.eid, state: it.state, states: it.states, clock: it.clock, index: it.index, of: it.of, prev: it.prev, next: it.next }); } };
      for (const res of r.days) if (res.status === 'single' || res.status === 'sequence') add(res, 'day', itemsOf(res));
      if (r.hour.eligible) {
        const w1 = dayWindow(dayPos.sheets[HOUR_SHEET].date), timed = (stopsOf.get(L.id) || []).filter(e => { const tm = isoToMin(e.t); return tm >= w1.from && tm < w1.to; });
        if (!timed.length) add(r.hour, 'hour', [{ claim: r.hour.used, eid: 'DAY-' + r.hour.used.id, state: null, states: [], clock: null, index: 0, of: 1, prev: null, next: null }]); else plan.day_notes.push({ kind: 'hour', claim: r.hour.used.id, why: `the unit has a timed stop of the ledgers dated 1 Jul (${timed.map(e => e.id).join(', ')}): the hour sheet is used only where nothing else places the unit` });
      }
    }
    const firstIndex = g => Math.min(...g.items.map(x => x.index));
    const ordered = [...dgroups.values()].sort((a, b) => dayWindow(a.claim.date).from - dayWindow(b.claim.date).from || (a.kind === b.kind ? 0 : a.kind === 'day' ? -1 : 1) || firstIndex(a) - firstIndex(b) || a.claim.id.localeCompare(b.claim.id)), lastDaySlot = new Map();
    for (const g of ordered) {
      const c = g.claim, ctr = { lng: c.lng, lat: c.lat }, ls = g.leaves, depthMax = Math.max(...ls.map(l => l.depth));
      Object.assign(g, { center: ctr, sigma: c.sigma_m, window: dayWindow(c.date), feasible: false, why_not: null, heading: 0, pack: null });
      if (!DayPositions.fits(c, box, 60 + depthMax / 2)) { g.why_not = 'the position lies outside the loaded ground, or too close to its edge for the column'; continue; }
      const p0 = plans.get(ls[0].id), from = lastDaySlot.get(ls[0].id) || pointAt(p0.line, Math.min(lineLength(p0.line), nearestOnLine(p0.line, ctr).s));
      g.heading = distM(from, ctr) > 30 ? bearingDegLL(from, ctr) : 0; g.pack = packGroup({ target: ctr, sigma: c.sigma_m, hd: g.heading, ls });
      if (ls.some(l => !insideBox(g.pack.get(l.id).slot, box, l.depth / 2 + 10))) { g.why_not = 'part of the laid-out column would stand outside the loaded ground'; g.pack = null; continue; }
      g.feasible = true; for (const l of ls) lastDaySlot.set(l.id, g.pack.get(l.id).slot);
      if (g.kind !== 'day') continue;
      for (const l of ls) {
        const cmp = [];
        for (const e of stopsOf.get(l.id)) {
          const tm = isoToMin(e.t); if (!(tm >= g.window.from && tm < g.window.to)) continue;
          const pr = gaz.resolve(e.place), tgt = pr.line ? nearestOnLine(pr.line, ctr).point : pr.center, d = distM(tgt, ctr), sum = pr.sigma_m + c.sigma_m;
          cmp.push({ stop: e.id, place: e.place, t: e.t, distance_m: Math.round(d), sigma_place: pr.sigma_m, sigma_day: c.sigma_m, agree: d <= sum });
          if (d <= sum) { const k = `${e.id}|${l.id}`, cur = retarget.get(k); if (!cur || d < cur.distance_m) retarget.set(k, { group: g, distance_m: Math.round(d), sigma_sum: Math.round(sum) }); }   // several positions of one unit-day: the nearest one takes the ledger stop
        }
        g.compare.set(l.id, cmp);
      }
    }
  }
  for (const L of leaves) { const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue; for (const e of stopsOf.get(L.id)) { if (!carried.has(e.id)) carried.set(e.id, []); carried.get(e.id).push(L); } }
  const slotOf = new Map();                                                      // `${po}|${unit}` -> { slot, headingDeg, center, sigma }
  for (const [poId, ls] of carried) {
    const e = placement.po.find(p => p.id === poId), place = gaz.resolve(e.place);
    // heading: the way the group approaches the place (from the end of its road / from where it stood), else the bearing from the road's crossing
    const L0 = ls[0], p0 = plans.get(L0.id); let from = p0.start;
    const prev = stopsOf.get(L0.id).findIndex(x => x.id === poId);
    if (prev > 0) from = slotOf.get(`${stopsOf.get(L0.id)[prev - 1].id}|${L0.id}`)?.slot || from; else if (p0.line) from = pointAt(p0.line, Math.min(lineLength(p0.line), nearestOnLine(p0.line, place.center).s));
    let target = place.center;
    if (place.line) { target = nearestOnLine(place.line, from).point; }
    const hd = distM(from, target) > 30 ? bearingDegLL(from, target) : 0, pack = packGroup({ target, sigma: place.sigma_m, hd, ls });
    for (const l of ls) { const v = pack.get(l.id); slotOf.set(`${poId}|${l.id}`, { slot: v.slot, headingDeg: hd, center: place.center, sigma: place.sigma_m, row: v.row, col: v.col }); }
  }
  const dayPlace = g => ({ id: g.id, name: g.claim.printed, center: g.center, sigma_m: g.sigma, line: null, day: true });
  for (const L of leaves) {
    const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue;
    const list = stopsOf.get(L.id); if (list.length) { plan.status = 'moving'; plan.reason = ''; } plan.stops = [];
    let last = null;                                                             // end of the previous leg {lng,lat}
    list.forEach((e, k) => {
      const rt = retarget.get(`${e.id}|${L.id}`), sl = rt ? (() => { const v = rt.group.pack.get(L.id); return { slot: v.slot, headingDeg: rt.group.heading, row: v.row, col: v.col }; })() : slotOf.get(`${e.id}|${L.id}`), place = rt ? dayPlace(rt.group) : gaz.resolve(e.place);
      const route = legRoute(plan, k === 0 ? null : last, { slot: sl.slot, place, via: e.via }, gaz); last = sl.slot;
      plan.stops.push({ po: e.id, place: e.place, placeObj: place, via: e.via || [], placeSigma: place.sigma_m, mode: e.mode, t_doc: isoToMin(e.t), depart_doc: e.depart ? isoToMin(e.depart) : null, conflict: e.conflict || null, route, slot: sl.slot, headingDeg: sl.headingDeg, row: sl.row, col: sl.col,
        ...(rt ? { refined_by: rt.group.claim.id, refined: { distance_m: rt.distance_m, sigma_sum_m: rt.sigma_sum } } : {}) });
    });
    // the day entries of this unit (geometry only; the times are made per scenario by real.mjs): one per claim and state item (contract 1.7)
    for (const g of dgroups.values()) {
      if (!g.leaves.some(l => l.id === L.id)) continue;
      const c = g.claim, v = g.pack ? g.pack.get(L.id) : null, hour = g.kind === 'hour', EV = hour ? null : eveningOf(c.date);
      for (const it of [...g.items].sort((a, b) => a.index - b.index)) {
        const st = it.state, clock = it.clock, sameRun = !hour && c.t_iso && c.clock_attachment === 'same_run' ? isoToMin(c.t_iso) : null;
        // the rule of the window for this state (DEC-018): how the modelled arrival is aimed ('asap' = as soon as the record allows; 'clock' = at the usable printed clock; 'midpoint' = the middle of the open window; 'evening' = the evening convention,
        // provided the unit has a known daytime place to stand at before) and by when the state says the unit should be there (`arr_by`, soft: a late arrival is a reported offset, never a moved gate)
        const rule = hour || st == null || st === 'all_day' || st === 'mixed' ? 'asap' : clock != null ? 'clock' : st === 'intermediate' ? 'midpoint' : st === 'evening' ? 'evening' : 'asap';
        const arr_by = hour ? null : clock ?? sameRun ?? (st === 'first' || st === 'intermediate' || st === 'evening' ? EV : null);
        const d = {
          id: it.eid, kind: g.kind, claim: c.id, sheet: g.sheet, date: c.date, owner: g.owner, via: g.via, feasible: g.feasible, why_not: g.why_not, place: dayPlace(g), placeSigma: g.sigma, tier: c.tier, group_size: g.leaves.length,
          slot: v ? v.slot : null, headingDeg: g.heading, row: v ? v.row : null, col: v ? v.col : null, window: g.window,
          dep_not_before: hour ? -Infinity : g.window.from, arr_not_before: hour ? isoToMin(c.t_start_iso) : -Infinity, arr_not_after: hour ? isoToMin(c.t_end_iso) : g.window.to,
          required_by: sameRun,
          // contract 1.7: the line state and its window rule
          state: st, states: it.states, state_basis: c.line_state_basis ?? null, state_crop: c.line_state_crop ?? null, state_read: c.line_state_read ?? null, clock_text: c.printed_clock_near_line ?? null, line_clock: c.line_clock ?? null,
          state_clock: clock, arr_rule: rule, arr_target: rule === 'clock' ? clock : rule === 'evening' ? EV : null, arr_by, evening: EV,
          seq: { status: g.status, index: it.index, of: it.of, prev: it.prev, next: it.next, why: g.order_why },
          state_tier: st == null ? null : 'documented', state_time_tier: st == null ? null : clock != null ? 'documented' : 'modelled',
          compare: g.compare.get(L.id) || [], refined_stops: [...retarget].filter(([k, r]) => r.group === g && k.endsWith('|' + L.id)).map(([k]) => k.split('|')[0]) };
        if (d.feasible && startOf) {                                             // status only: can the unit, from its default start, reach the position before the window closes at the march rate
          const len = polylineLength(legRoute(plan, null, { slot: d.slot, place: d.place }, gaz)), s = startOf(L.id);
          d.reachable_default = s == null ? null : s + len / marchMps / 60 <= d.arr_not_after; d.length_m = Math.round(len);
        } else d.reachable_default = null;
        plan.days.push(d);
      }
    }
    plan.days.sort((a, b) => a.window.from - b.window.from || (a.kind === 'hour') - (b.kind === 'hour') || ((a.seq ? a.seq.index : 0) - (b.seq ? b.seq.index : 0)) || a.id.localeCompare(b.id));   // the order of the day: first, intermediate, evening
    if (plan.status === 'edge_only' && plan.days.some(d => d.feasible && d.reachable_default !== false)) { plan.status = 'moving'; plan.reason = ''; }
  }
  // departures: from where the unit last stood, along the named road to the place where it leaves the loaded ground. A unit with no stop and no entry into the ground just ends (it never was on the ground).
  for (const L of leaves) {
    const plan = plans.get(L.id); if (!plan || plan.status === 'unresolved') continue;
    const ds = placement.departuresOf(L.id); plan.departures = [];
    for (const d of ds) {
      const from = plan.stops.length ? plan.stops[plan.stops.length - 1].slot : null;
      if (!from) { plan.departures.push({ id: d.id, t_doc: isoToMin(d.t), road: d.road, route: null, note: 'the unit is not on the loaded ground; it just ends' }); continue; }
      const x = placement.exitRoute(d.road, from, PLAN.outsideM + L.depth);
      if (!x) { plan.departures.push({ id: d.id, t_doc: isoToMin(d.t), road: d.road, route: null, error: `the road "${d.road}" does not leave the loaded ground from where the unit stood` }); continue; }
      plan.departures.push({ id: d.id, t_doc: isoToMin(d.t), road: d.road, route: simplify(x.route, PLAN.simplifyM), join: x.join, distance_m: Math.round(x.d) });
    }
  }
  return plans;
}
// Slots of a group of leaves inside one place or position: rows across the place (2 sigma wide, or the width of the first column if that is more), roster order, each row centred; facing `hd`.
// -> Map(leafId -> { slot, row, col })   (the packing of a ledger place and of a troop-map position is the same plausible-procedural rule)
export function packGroup({ target, sigma, hd, ls }) {
  const a = hd * Math.PI / 180, fwd = [Math.sin(a), Math.cos(a)], right = [Math.cos(a), -Math.sin(a)], n = ls.length;
  const width = ls.map(l => widthOf(l.kind, l.count) + DIM.laneM), depthMax = Math.max(...ls.map(l => l.depth));
  const span = Math.max(2 * sigma, width[0]), perRow = Math.max(1, Math.min(n, Math.floor(span / Math.max(...width)))), rows = Math.ceil(n / perRow), rowPitch = depthMax + PLAN.rowGapM, out = new Map();
  ls.forEach((l, i) => {
    const r = Math.floor(i / perRow), c = i % perRow, inRow = Math.min(perRow, n - r * perRow), lat = (c - (inRow - 1) / 2) * Math.max(...width), back = (r - (rows - 1) / 2) * rowPitch;
    out.set(l.id, { slot: offsetLL(target, right[0] * lat - fwd[0] * back, right[1] * lat - fwd[1] * back), row: r, col: c });
  });
  return out;
}
// The way from where a unit stands to a slot: from the column at the edge (prev null) along the approach road to the nearest point of the place, then to the slot; later legs go straight from the
// previous slot, through the named `via` places. stop = { slot, place (gazetteer entry or { center, line: null }), via }.   -> route [{lng,lat}...]
export function legRoute(plan, prev, stop, gaz) {
  const pts = [];
  if (!prev) {
    pts.push({ ...plan.start });
    const cs = plan.crossingS, tgt = stop.place.line ? stop.slot : stop.place.center, sNear = nearestOnLine(plan.line, tgt).s;   // along the road from the start to the edge, into the ground, then toward the place
    const end = Math.max(cs, sNear), seg = sliceLine(plan.line, plan.sAtStart, end); if (seg.length) pts.push(...seg.slice(1));
    pts.push({ ...stop.slot });
  } else {
    pts.push({ ...prev });
    for (const v of stop.via || []) { const vp = gaz.resolve(v); pts.push({ ...(vp.line ? nearestOnLine(vp.line, prev).point : vp.center), via: v }); }
    pts.push({ ...stop.slot });
  }
  return simplify(pts, PLAN.simplifyM);
}
export { pointAt };
