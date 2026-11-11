// Arrival windows from the ledger data (history/arrivals.json, units.json): the JavaScript twin of tools/bt/check_arrivals.py (gate_time, presence_ok), plus
// the scenario rule for the source conflicts. Pure functions of (data, scenario): same input, same output, in any order of evaluation.
//
// Times are minutes since 1863-06-01 00:00 LMT (clock.mjs). A gate is { earliest, default, latest } (latest may equal default).
// Rules carried over from the checker (PDF B.2.4 gating rules, p.63):
//  * a unit with no gate of its own inherits its parent's (armies carry a derived gate);
//  * `printed_clock` gates are the ledger cell's own times;
//  * `date_floor`, `event_floor` and `named_period_convention` gates are floors the checker uses as permissions (00:00 of a date, a dated event, the labelled
//    NAMED_PERIODS conventions). For DRAWING, a unit with such a floor is never drawn before its parent's effective time: the effective value is the later of the two.
import { isoToMin, minOf } from '../clock.mjs';

const T = s => (s == null ? null : isoToMin(s));
export const NAMED_PERIODS = { dusk: '1863-07-02T19:32', evening: '1863-07-02T19:32', night: '1863-07-02T20:04', sunrise_jul3: '1863-07-03T04:36' };   // checker conventions (arrivals.json meta), NOT historical claims
const FLOOR_KINDS = new Set(['date_floor', 'event_floor', 'named_period_convention']);

export class ArrivalModel {
  constructor({ units, arrivals, notOnField }) {
    this.units = units; this.by = new Map(units.map(u => [u.id, u])); this.arr = arrivals; this.gates = arrivals.gates; this.nof = notOnField;
    this.rowByUnit = new Map(arrivals.rows.map(r => [r.unit_id, r])); this.subByUnit = new Map(arrivals.subunit_gates.map(s => [s.unit, s]));
    // conflicts that bear on a gate owner's ARRIVAL time: the ledger links them as cited_by_reference or topic_arrival (topic_other_cell links concern other cells)
    this.linked = new Map();
    for (const r of arrivals.rows) this.linked.set(r.unit_id, r.conflicts.filter(c => c.link === 'topic_arrival' || c.link === 'cited_by_reference').map(c => c.id));
    this.otherLinks = new Map(arrivals.rows.map(r => [r.unit_id, r.conflicts.filter(c => c.link === 'topic_other_cell').map(c => c.id)]));
    this.detached = new Map(); for (const r of arrivals.rows) for (const d of r.detached_roles || []) { if (!this.detached.has(d.unit)) this.detached.set(d.unit, []); this.detached.get(d.unit).push(d); }
    this.memo = new Map();
  }
  chain(id) { const out = []; let u = this.by.get(id); while (u) { out.push(u.id); u = u.parent ? this.by.get(u.parent) : null; } return out; }
  // status along the chain: a never_on_field / never_main_field unit or ancestor is not drawn (gating rule 2); so is a documented_absent leaf (v8, DEC-023E: the layer reads the status over the unit; the source files keep theirs)
  notOnField(id) { return this.chain(id).some(x => ['never_on_field', 'never_main_field', 'documented_absent'].includes(this.by.get(x).status)); }
  ownGate(id) { const g = this.gates[id]; return g && g.kind !== 'none' ? g : null; }

  // the option text of a chosen conflict value -> minutes (or null when it carries no clock). `dayRef` is the minute of the gate's own date, for texts without a date.
  parseOption(text, dayRef, helpers = {}) {
    if (!text) return null;
    const t = String(text), day0 = Math.floor(dayRef / 1440) * 1440, jd = /Jul\s+(\d{1,2})/.exec(t), base = jd ? minOf(7, +jd[1]) : day0;
    const clock = /(\d{1,2}):(\d{2})/.exec(t);
    if (clock) return { t: base + (+clock[1]) * 60 + (+clock[2]), how: `clock ${clock[0]} printed in the chosen value` };
    if (/\bnoon\b/i.test(t)) return { t: base + 720, how: 'noon = 12:00 (the ledger parser reads the word as 12:00)' };
    if (/\bdawn\b/i.test(t) && helpers.civilDawn) { const d = helpers.civilDawn(base); if (d != null) return { t: d, how: 'civil dawn of that date from the ephemeris table (environment/ephemeris_1863.json)' }; }
    if (/evening|dusk/i.test(t) && Math.floor(base / 1440) === Math.floor(T(NAMED_PERIODS.evening) / 1440)) return { t: T(NAMED_PERIODS.evening), how: 'labelled convention: evening/dusk = start of [DUSK], sunset 19:32 (PDF B.2.2; the PDF gives no clock for "evening")' };
    if (/\bnight\b/i.test(t) && Math.floor(base / 1440) === Math.floor(T(NAMED_PERIODS.night) / 1440)) return { t: T(NAMED_PERIODS.night), how: 'labelled convention: night = 20:04, end of civil twilight (PDF B.2.2)' };
    return null;
  }

  // effective gate of a unit under a scenario -> { earliest, default, latest, owner, kind, tier, inherited, notes[], conflicts[], values }
  // scenario: { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }
  effective(id, scenario = {}, helpers = {}) {
    const key = id + '|' + JSON.stringify(scenario.choices || {}) + '|' + JSON.stringify(scenario.optionText || {});
    if (this.memo.has(key)) return this.memo.get(key);
    const u = this.by.get(id), parent = u && u.parent ? this.effective(u.parent, scenario, helpers) : null, own = this.ownGate(id); let out;
    if (!own) out = parent ? { ...parent, inherited: true, notes: [...parent.notes] } : null;
    else {
      const e = T(own.earliest), d = T(own.default ?? own.earliest), l = T(own.latest ?? own.default ?? own.earliest);
      const notes = []; let g = { earliest: e, default: d, latest: l, owner: id, kind: own.kind, tier: own.tier || 'inferred', inherited: false, notes, conflicts: [], values: own.values || [], basis: own.default_basis || own.basis || '' };
      // conflict choices that bear on this owner's arrival
      for (const cid of this.linked.get(id) || []) {
        const choice = scenario.choices && scenario.choices[cid]; if (!choice || choice === 'recommended') { g.conflicts.push(cid); continue; }
        g.conflicts.push(cid);
        if (choice === 'range') { g.default = g.earliest; notes.push(`${cid}: every value shown, none chosen; drawn from the earliest printed value (${own.kind})`); continue; }
        const r = this.parseOption(scenario.optionText && scenario.optionText[cid], g.default ?? g.earliest, helpers);
        if (r) { g.default = r.t; g.earliest = Math.min(g.earliest, r.t); g.latest = Math.max(g.latest, r.t); notes.push(`${cid}: ${scenario.optionText[cid]} (${r.how})`); }
        else notes.push(`${cid}: the chosen value "${scenario.optionText && scenario.optionText[cid]}" carries no clock this layer may use; the ledger gate is unchanged (no clock is invented)`);
      }
      if (parent && FLOOR_KINDS.has(own.kind)) {            // a floor never draws a child before its parent
        const lift = (a, b) => (a == null ? b : Math.max(a, b));
        const ne = lift(g.earliest, parent.earliest), nd = lift(g.default, parent.default), nl = lift(g.latest, parent.latest);
        if (ne !== g.earliest || nd !== g.default) notes.push(`own gate is a ${own.kind}; drawn no earlier than its parent's gate (${parent.owner})`);
        if (ne !== g.earliest || nd !== g.default) g.conflicts = [...new Set([...g.conflicts, ...parent.conflicts])];      // the value now comes from the parent, so the parent's conflicts bear on it
        g = { ...g, earliest: ne, default: nd, latest: nl };
      }
      g.latest = Math.max(g.latest ?? g.default, g.default); g.default = Math.max(g.default, g.earliest);
      out = g;
    }
    this.memo.set(key, out); return out;
  }
  // the conflicts (cell-level links) a unit's ledger row links to other cells, for display
  otherConflicts(id) { for (const x of this.chain(id)) if (this.otherLinks.has(x) && this.otherLinks.get(x).length) return this.otherLinks.get(x); return []; }
  // owner row of the unit (nearest ancestor with a ledger row) and its weak-source flag
  row(id) { for (const x of this.chain(id)) { if (this.rowByUnit.has(x)) return this.rowByUnit.get(x); } return null; }
  // presence permission (Q04), as the checker's presence_ok: at minute t in a scenario selector 'earliest' | 'default' | 'latest'
  presenceOk(id, t, which = 'default', scenario = {}) {
    if (!this.by.has(id)) return false; if (this.notOnField(id)) return false;
    const g = this.effective(id, scenario); if (!g) return true; return t >= g[which];
  }
}
