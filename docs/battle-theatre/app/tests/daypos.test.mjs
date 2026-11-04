// Node tests (no browser) for the troop-map day positions (contract 1.5; DEC-010, DEC-011): the digest against the four claim files, the single-label rule, the level rule, one claim id and one source file
// behind every position, Q04 and the day windows, speeds, purity, the loaded ground, "timed claims win", the comparison with the ledgers, the hour sheet, the card and the contract.
//   node --test docs/battle-theatre/app/tests/daypos.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { spawnSync } from 'node:child_process';
import { BT } from './node-world.mjs';
import { loadRawFromDisk, terrainMeta } from '../tools/history-report.mjs';
import { build as buildDigest, digestOf, SHEETS } from '../tools/build-daypositions.mjs';
import { createRealHistory, SPEED, DAY_SOURCE } from '../src/history/real.mjs';
import { DayPositions, USED_LEVELS, dayWindow, DAY_SHEETS, orderStates, lineClockOf, parseLineClock, itemsOf, eveningOf, STATE_RULE, EVENING_HHMM } from '../src/history/daypos.mjs';
import { validateUnits, validateDayPositions, validateEvents, validateArrivals } from '../src/history/contract.mjs';
import { daySection } from '../src/ui/card-sections.mjs';
import { distM, insideBox, nearestOnLine, polylineLength } from '../src/history/gazetteer.mjs';
import { isoToMin, minOf } from '../src/clock.mjs';
import { rand } from '../../sim/rng.mjs';

const raw = { ...loadRawFromDisk(), siblingApproach: null }, TM = terrainMeta(),   // the troop-map stage is tested in the state of the layer before the sibling records of v6 (their day positions are tested in tests/sibling.test.mjs)
  BOX = TM.meta, doc = raw.dayPositions, helpers = { civilDawn: m => m + 4 * 60 + 3 };
const build = (r = raw) => createRealHistory({ raw: r, T: TM, helpers });
const L = build(), L0 = build({ ...raw, dayPositions: null }), ids = new Set(L.units.map(u => u.id));
const SCENARIOS = [
  {}, { choices: { 'C-004': 'v0' }, optionText: { 'C-004': '22:30 Jul 1' } }, { choices: { 'C-004': 'v3' }, optionText: { 'C-004': '07:00 Jul 2' } },
  { choices: { 'C-003': 'v1', 'C-005': 'v2' }, optionText: { 'C-003': '08:00 (head of column)', 'C-005': '07:30 (EPP, FREE, PADRE)' } }, { choices: { 'C-043': 'v3' }, optionText: { 'C-043': '17:00' } },
];
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const lines = f => fs.readFileSync(path.join(BT, f), 'utf8').split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l));
const jclone = o => JSON.parse(JSON.stringify(o));
const plansWithDays = () => [...L.plans.values()].filter(p => p.days && p.days.length);

test('the digest holds every claim of the four troop-map files, field by field, and the files are the ones it was built from (sha256)', () => {
  assert.ok(doc, 'data/daypositions.json exists'); let n = 0;
  for (const [k, S] of Object.entries(SHEETS)) {
    const f = path.join(BT, S.file); assert.equal(doc.sheets[k].sha256, sha(f), `${S.file} changed after daypositions.json was built: run tools/build-daypositions.mjs`);
    const rows = lines(S.file); assert.equal(doc.sheets[k].claims, rows.length);
    for (const c of rows) { n++; assert.deepEqual(doc.claims[c.claim_id], digestOf(c, k, doc.seminary), `${c.claim_id}: the digest differs from the claim line`); assert.equal(c.unit_id, doc.claims[c.claim_id].unit); }
  }
  assert.equal(Object.keys(doc.claims).length, n); assert.equal(n, 484);
  assert.deepEqual(JSON.parse(JSON.stringify(buildDigest())), doc, 'the builder gives the file on disk');
  const r = spawnSync(process.execPath, [path.join(BT, 'app/tools/build-daypositions.mjs'), '--check'], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
});

test('the loader refuses a claim that is not verified, not read by eye, of the wrong tier, an hour-sheet claim marked documented, a unit that is not in the roster, or a bad date', () => {
  const units = raw.units.units, ok = new DayPositions({ doc, units }); assert.deepEqual(ok.validate(), []);
  const bad = fn => { const d = jclone(doc); fn(d); return new DayPositions({ doc: d, units }).validate().join(' | '); };
  assert.match(bad(d => { d.claims['TM2-001'].verified = false; }), /claim_support_verified/);
  assert.match(bad(d => { d.claims['TM2-001'].fidelity = 'not_rechecked'; }), /fidelity/);
  assert.match(bad(d => { d.claims['TM2-001'].tier = 'open gap'; }), /tier/);
  assert.match(bad(d => { d.claims['TMJ1H-001'].tier = 'documented'; }), /hour-sheet claim is never documented/);
  assert.match(bad(d => { d.claims['TM2-001'].unit = 'us-nope'; }), /unknown unit/);
  assert.match(bad(d => { d.claims['TM2-001'].date = '1863-07-03'; }), /date/);
  assert.match(bad(d => { d.claims['TM2-001'].quote = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen'; }), /quote/);
  assert.throws(() => build({ ...raw, dayPositions: (() => { const d = jclone(doc); d.claims['TM2-001'].verified = false; return d; })() }), /daypositions.json does not hold/);
  // v7: the line-state fields
  assert.match(bad(d => { d.version = 1; }), /version/);
  assert.match(bad(d => { d.claims['TMJ1-001'].line_state = 'morning'; }), /line_state morning/);
  assert.match(bad(d => { d.claims['TMJ1-064'].line_states = null; }), /mixed label lists its states/);
  assert.match(bad(d => { d.claims['TMJ1-001'].line_states = ['first', 'evening']; }), /line_states on a label that is not mixed/);
  assert.match(bad(d => { d.claims['TMJ1-001'].line_state_crop = null; }), /carries its basis and its crop/);
  assert.match(bad(d => { d.claims['TMJ1-013'].line_clock.hhmm = '10:00'; }), /line_clock does not follow/);
  assert.match(bad(d => { d.claims['TMJ1-020'].line_clock.usable = true; }), /line_clock does not follow/, 'an adjacent_unproven clock is never used');
  assert.match(bad(d => { d.claims['TMJ1-037'].line_clock.usable = true; d.claims['TMJ1-037'].line_clock.complete = true; }), /line_clock does not follow/, 'a span is never a usable clock');
  assert.match(bad(d => { d.claims['TMJ1-013'].line_clock = null; }), /has no reading/);
  assert.match(bad(d => { d.claims['TMJ1H-001'].line_state = 'first'; d.claims['TMJ1H-001'].line_state_basis = 'x'; d.claims['TMJ1H-001'].line_state_crop = 'x'; }), /hour sheet has no legend/);
});

// ---- history layer v7 (contract 1.7, DEC-018): the line states read by eye and the clock printed beside the line
const BACH = () => Object.values(doc.claims).filter(c => c.sheet !== 'H');
test('v7, the digest carries the line state of every Bachelder claim as the file reads it (first 38, intermediate 27, evening 120, all day 22, mixed 10, unreadable 241), and reads the clock beside the line as a complete clock only when it is one', () => {
  const tally = {}; for (const c of BACH()) tally[c.line_state] = (tally[c.line_state] || 0) + 1;
  assert.deepEqual(tally, { first: 38, intermediate: 27, evening: 120, all_day: 22, mixed: 10, unreadable: 241 });
  for (const [k, S] of Object.entries(SHEETS)) for (const c of lines(S.file)) { const g = doc.claims[c.claim_id], w = c.when; assert.equal(g.line_state, w.line_state ?? null); assert.deepEqual(g.line_states, w.line_states ?? null); assert.equal(g.line_state_basis, w.line_state_basis ?? null); assert.equal(g.line_state_crop, w.line_state_crop ?? null); assert.equal(g.printed_clock_near_line, w.printed_clock_near_line ?? null); assert.deepEqual(g.line_clock, lineClockOf(w)); if (k === 'H') assert.equal(g.line_state, null); }
  for (const c of BACH()) if (c.line_state && c.line_state !== 'unreadable') { assert.ok(c.line_state_basis && c.line_state_crop && /crops_state\//.test(c.line_state_crop), c.id); if (c.line_state === 'mixed') assert.ok(c.line_states.length === 2 && c.line_states.includes('first') && c.line_states.includes('evening'), `${c.id}: every mixed label is first + evening`); }
  // the parser: a complete clock is the whole text, an hour, optional minutes, A.M. or P.M.
  for (const [t, v] of [['9 A.M.', '09:00'], ['10.15 A.M.', '10:15'], ['3 1/2 P.M.', '15:30'], ["3'P.M.", '15:00'], ["1'P.M.", '13:00'], ['4.30 P.M.', '16:30'], ['7.15 P.M.', '19:15'], ['12 P.M.', '12:00'], ['3.45', null], ['Morning', null], ['1-3 P.M.', null], ['[?.?] P.M.', null], ['12 M.', null], ["6 P.M. (printed with the neighbouring BREWSTER 2'd label, TM2-090)", null], ['morning till noon', null], ['Not Engaged', null], ['13 P.M.', null]]) assert.equal(parseLineClock(t), v, t);
  const lc = BACH().filter(c => c.line_clock); assert.equal(lc.length, 69); assert.equal(lc.filter(c => c.line_clock.complete).length, 43); assert.equal(lc.filter(c => c.line_clock.usable).length, 35);
  for (const c of lc) { const k = c.line_clock; assert.equal(k.text, c.printed_clock_near_line); assert.equal(k.complete, parseLineClock(k.text) != null); if (k.usable) { assert.ok(k.complete && [null, 'same_run'].includes(c.clock_attachment) && (!c.t_iso || c.t_iso === k.iso), `${c.id}: a usable clock is complete, in the label's own run and agrees with the earlier read`); } else assert.ok(k.why.length > 20); }
  assert.equal(doc.claims['TMJ1-020'].line_clock.usable, false); assert.match(doc.claims['TMJ1-020'].line_clock.why, /adjacent_unproven/);      // Cutler 10.15 A.M.: complete but not proven to belong to the label
  assert.equal(doc.claims['TMJ1-053'].line_clock.usable, true); assert.equal(doc.claims['TMJ1-053'].line_clock.iso, '1863-07-01T14:30');       // Biddle intermediate 2.30 P.M.
  assert.equal(doc.claims['TMJ1-103'].line_clock.complete, false);                                                                            // Coster "3.45", no A.M./P.M.
  assert.equal(doc.claims['TM2-068'].line_clock.complete, false);                                                                             // a clock of the neighbouring label
  // a complete clock that disagrees with the earlier read is listed, not used
  const w = { date: '1863-07-01', printed_clock_near_line: '4 P.M.', clock_attachment: 'same_run', t_iso: '1863-07-01T15:00' }; const r = lineClockOf(w); assert.equal(r.complete, true); assert.equal(r.usable, false); assert.match(r.why, /differs/);
});

test('v7, ordering by line states: several labels are a sequence only with at most one first, at most one evening, intermediates ordered by complete clocks, no all-day bar, no unreadable bar and no movement arrow; the rule gives the reason otherwise; in the data 9 unit-sheets order and the rest keep the several-labels rule', () => {
  const per = new Map(); for (const c of BACH()) { const k = c.sheet + '|' + c.unit; (per.get(k) || per.set(k, []).get(k)).push(c); }
  let seq = 0, multi = 0; const reasons = {};
  for (const [k, group] of per) { const [sheet, unit] = k.split('|'), lvl = L.units.find(u => u.id === unit).level; if (!USED_LEVELS.has(lvl) || group.length < 2) continue; const o = orderStates(group), res = L.dayPositions.onSheetFor(unit, sheet); if (o.ok) { seq++; assert.equal(res.status, 'sequence'); assert.deepEqual(res.items.map(x => x.claim.id + ':' + x.state), o.items.map(x => x.claim.id + ':' + x.state)); assert.ok(o.items.length >= 2); const order = o.items.map(x => ({ first: 0, intermediate: 1, evening: 2 })[x.state]); for (let i = 1; i < order.length; i++) assert.ok(order[i] >= order[i - 1], k); } else { multi++; assert.equal(res.status, 'multiple'); assert.ok(o.why.length > 10); assert.equal(res.order_why, o.why); reasons[o.why.replace(/\d+/g, 'n').replace(/\(.*?\)/g, '').slice(0, 40)] = 1; } }
  assert.equal(seq, 9, 'nine unit-sheets order'); assert.ok(multi >= 70, `${multi} unit-sheets do not`);
  const mk = (id, state, extra = {}) => ({ id, kind: 'position', line_state: state, line_states: state === 'mixed' ? ['first', 'evening'] : null, line_clock: null, ...extra });
  const clock = (iso, text) => ({ text, hhmm: iso.slice(11), iso, complete: true, usable: true, why: 'test' });
  assert.equal(orderStates([mk('a', 'first'), mk('b', 'evening')]).ok, true);
  assert.deepEqual(orderStates([mk('b', 'evening'), mk('a', 'first'), mk('c', 'intermediate')]).items.map(x => x.claim.id), ['a', 'c', 'b'], 'first, intermediate, evening whatever the order of the claims');
  assert.match(orderStates([mk('a', 'first'), mk('b', 'first')]).why, /2 labels print the first-position style/);
  assert.match(orderStates([mk('a', 'evening'), mk('b', 'evening'), mk('c', 'first')]).why, /2 labels print the evening style/);
  assert.match(orderStates([mk('a', 'first'), mk('b', 'all_day')]).why, /all-day bar/);
  assert.match(orderStates([mk('a', 'first'), mk('b', 'unreadable')]).why, /no readable line state/);
  assert.match(orderStates([mk('a', 'first'), mk('b', null)]).why, /no readable line state/);
  assert.match(orderStates([mk('a', 'first'), { id: 'm', kind: 'movement', line_state: 'unreadable' }]).why, /movement arrow/);
  assert.match(orderStates([mk('a', 'intermediate'), mk('b', 'intermediate'), mk('c', 'evening')]).why, /order of the 2 intermediate positions is not printed/);
  const o2 = orderStates([mk('a', 'intermediate', { line_clock: clock('1863-07-01T15:00', '3 P.M.') }), mk('b', 'intermediate', { line_clock: clock('1863-07-01T14:00', '2 P.M.') }), mk('c', 'evening')]); assert.equal(o2.ok, true); assert.deepEqual(o2.items.map(x => x.claim.id), ['b', 'a', 'c'], 'two intermediates with complete clocks are ordered by them');
  assert.match(orderStates([mk('a', 'intermediate', { line_clock: clock('1863-07-01T15:00', '3 P.M.') }), mk('b', 'intermediate', { line_clock: clock('1863-07-01T15:00', '3 P.M.') }), mk('c', 'evening')]).why, /not printed/, 'equal clocks do not order');
  assert.match(orderStates([mk('a', 'first', { line_clock: clock('1863-07-01T16:00', '4 P.M.') }), mk('b', 'evening', { line_clock: clock('1863-07-01T15:00', '3 P.M.') })]).why, /contradict/);
  const om = orderStates([mk('a', 'mixed'), mk('b', 'intermediate')]); assert.equal(om.ok, true); assert.deepEqual(om.items.map(x => x.claim.id + ':' + x.state), ['a:first', 'b:intermediate', 'a:evening'], 'a mixed label stands for both its states');
  assert.match(orderStates([mk('a', 'mixed'), mk('b', 'first')]).why, /first-position style/);
  // the items of a sheet result: a mixed label alone is one item 'mixed'; split around an intermediate it is two entries at one claim
  const its = itemsOf({ items: om.items }); assert.deepEqual(its.map(x => x.eid), ['DAY-a#first', 'DAY-b', 'DAY-a#evening']); assert.deepEqual([its[0].prev, its[0].next, its[1].prev, its[1].next, its[2].prev, its[2].next], [null, 'DAY-b', 'DAY-a#first', 'DAY-a#evening', 'DAY-b', null]);
  const one = itemsOf({ items: [{ claim: mk('a', 'mixed'), state: 'first', clock: null }, { claim: mk('a', 'mixed'), state: 'evening', clock: null }] }); assert.equal(one.length, 1); assert.equal(one[0].state, 'mixed'); assert.deepEqual(one[0].states, ['first', 'evening']); assert.equal(one[0].eid, 'DAY-a');
  // every entry on a card with several labels says why they are not ordered
  for (const u of L.units) if (u.day_positions) for (const e of u.day_positions.days) { if (e.status === 'multiple') assert.ok(e.order_why && e.order_why.length > 10, `${u.id} ${e.sheet}`); if (e.status === 'sequence') { assert.ok(e.items.length >= 2 && e.used === null); assert.ok(e.items.every(it => e.claims.includes(it.claim))); } }
});

test('v7, state windows in every scenario: all day and mixed hold to midnight; first holds until the next state-ordered position or the evening convention; evening is reached at the convention (or its clock) from a known daytime place of the same day, or from arrival with the daytime place marked unknown; intermediate lies between; a window that cannot be met is a state offset and no gate moves', () => {
  for (const sc of SCENARIOS) {
    const { arrivals, events, report } = L.both(sc), A = new Map(arrivals.map(a => [a.unit, a])), enter = new Map(events.filter(e => e.type === 'enter').map(e => [e.unit, e.t]));
    const stopsOf = new Map(); for (const d of report.day_stops) if (d.applied) (stopsOf.get(d.unit) || stopsOf.set(d.unit, []).get(d.unit)).push(d); for (const x of report.ledger_arrivals) (stopsOf.get(x.unit) || stopsOf.set(x.unit, []).get(x.unit)).push({ arrive: x.arrive, ledger: true });
    let n = { all_day: 0, mixed: 0, first: 0, evening_known: 0, evening_unknown: 0, intermediate: 0, none: 0 };
    for (const d of report.day_stops) {
      if (d.kind !== 'day') continue; const e = L.plans.get(d.unit).days.find(x => x.id === d.id), EV = eveningOf(d.date); assert.equal(d.evening, EV); assert.equal(e.evening, EV); assert.equal(EV - isoToMin(d.date), 19 * 60 + 32); assert.equal(EVENING_HHMM, '19:32');
      assert.equal(d.state, e.state); assert.equal(d.arr_rule, e.arr_rule);
      if (!d.state) { assert.equal(d.arr_rule, 'asap'); assert.equal(d.arr_by, e.required_by); }
      if (!d.applied || d.merged_into) { if (!d.applied) assert.ok(d.why_not && d.why_not.length > 8); continue; }
      const at = d.arrive;
      if (d.state === 'all_day' || d.state === 'mixed') { n[d.state]++; assert.equal(d.arr_rule, 'asap'); assert.equal(d.state_from, at); assert.equal(d.state_to, d.window.to); if (d.state === 'mixed') assert.ok(d.states.length >= 2); }
      else if (d.state === 'first') { n.first++; assert.ok(['asap', 'clock'].includes(d.arr_rule)); assert.equal(d.state_from, at); assert.equal(d.state_to, Math.min(d.stands_until ?? Infinity, Math.max(EV, at))); assert.equal(d.arr_by, e.state_clock ?? e.required_by ?? EV); }
      else if (d.state === 'evening') {
        const others = (stopsOf.get(d.unit) || []).filter(x => x !== d && x.arrive >= d.window.from - 1e-9 && x.arrive <= d.depart + 1e-9);
        assert.equal(d.arr_by, e.state_clock ?? e.required_by ?? EV); assert.equal(d.state_to, d.window.to);
        assert.equal(typeof d.daytime_known, 'boolean'); assert.equal(d.daytime_known, others.length >= 1, `${d.unit} ${d.id}: a known daytime place is a stop of the same day before this one`);
        if (d.arr_rule === 'clock') { assert.equal(d.target, e.state_clock); assert.ok(Math.abs(at - d.target) < 1e-6 || (at > d.target && d.state_late_min >= 1)); }
        else if (d.daytime_known) { n.evening_known++; assert.equal(d.arr_rule, 'evening'); assert.equal(d.target, EV); assert.ok(Math.abs(at - d.target) < 1e-6 || (at > d.target && d.state_late_min >= 1), `${d.unit} ${d.id}: arrives at the convention or later with an offset`); assert.equal(d.state_from, Math.max(at, d.target)); }
        else { n.evening_unknown++; assert.equal(d.target, null, 'no daytime place: as soon as the record allows'); assert.ok(!events.some(ev => ev.unit === d.unit && ev.type === 'path' && ev.t >= d.window.from && ev.t < d.depart - 1e-9), `${d.unit}: goes nowhere else in the daytime`); }
      } else if (d.state === 'intermediate') { n.intermediate++; assert.ok(['midpoint', 'clock'].includes(d.arr_rule)); if (d.arr_rule === 'clock') assert.ok(Math.abs(at - e.state_clock) < 1e-6 || d.state_late_min >= 1); else assert.ok(at <= EV + 1e-6 || d.state_late_min >= 1); assert.equal(d.arr_by, e.state_clock ?? e.required_by ?? EV); }
      else n.none++;
      if (d.seq && d.seq.next) { const nx = report.day_stops.find(x => x.unit === d.unit && x.id === d.seq.next); if (nx && nx.applied) { assert.ok(nx.arrive > at, `${d.unit}: ${d.id} before ${nx.id}`); assert.ok(d.stands_until == null || d.stands_until <= nx.depart + 1e-6); } }
      if (d.seq && d.seq.prev) { const pv = report.day_stops.find(x => x.unit === d.unit && x.id === d.seq.prev); if (pv && pv.applied) assert.ok(pv.arrive < at, `${d.unit}: ${d.seq.prev} before ${d.id}`); }
      if (d.arr_by != null) assert.equal(d.state_late_min, at > d.arr_by + 0.5 ? Math.round(at - d.arr_by) : 0);
      assert.ok(at >= A.get(d.unit).earliest - 1e-9 && d.depart >= enter.get(d.unit) - 1e-9, 'Q04');
    }
    assert.ok(n.all_day > 20 && n.first > 40 && n.evening_known > 20 && n.evening_unknown > 100 && n.intermediate >= 8 && n.mixed >= 8 && n.none > 150, JSON.stringify(n));
    for (const o of report.state_offsets) { const d = report.day_stops.find(x => x.unit === o.unit && x.id === o.stop); assert.ok(d && d.applied && Math.abs(d.arrive - o.arrives) < 1e-9 && o.late_min >= 1 && o.arrives > o.by && o.late_min === d.state_late_min, o.stop); assert.equal(A.get(o.unit).earliest, L0.arrivals(sc).find(a => a.unit === o.unit).earliest, 'the gate is not moved'); assert.ok(/clock|evening convention/.test(o.why)); }
    assert.ok(report.state_offsets.length >= 1, 'the data has at least one window that cannot be met (Meredith, first position at 10.15 A.M. from a 10:20 gate at the edge)');
  }
  // Biddle on sheet 1: first (11 A.M. adjacent_unproven, not used) -> intermediate 2.30 P.M. (used) -> evening 4 P.M. (used)
  const rep = L.report({}), bid = rep.day_stops.filter(d => d.unit === 'us-1c-3d-biddle-121pa' && d.applied).sort((a, b) => a.arrive - b.arrive); assert.equal(bid.map(d => d.claim).join(','), 'TMJ1-052,TMJ1-053,TMJ1-055');
  assert.equal(bid[0].arr_rule, 'asap'); assert.equal(bid[1].arr_rule, 'clock'); assert.equal(bid[1].target, minOf(7, 1, 14, 30)); assert.equal(bid[2].arr_rule, 'clock'); assert.equal(bid[2].target, minOf(7, 1, 16));
  for (const d of [bid[1], bid[2]]) assert.ok(Math.abs(d.arrive - d.target) < 1e-6 || d.state_late_min >= 1);
  assert.equal(L.units.find(u => u.id === 'us-1c-3d-biddle-121pa').day_positions.days[0].items[1].state_time_tier, 'documented');
  assert.equal(L.units.find(u => u.id === 'us-1c-3d-biddle-121pa').day_positions.days[0].items[0].state_time_tier, 'modelled');
});

test('v7, the whole-day rule is unchanged for labels with no readable state: a digest with every line state stripped gives the v6 picture (405 day entries, 387 applied since ledger E: v8 draws 9 more units), and in the real layer every single label without a state arrives at the same minute as in it', () => {
  const stripped = jclone(doc); for (const c of Object.values(stripped.claims)) Object.assign(c, { line_state: null, line_states: null, line_state_basis: null, line_state_crop: null, printed_clock_near_line: null, line_clock: null });
  const L6 = build({ ...raw, dayPositions: stripped }), r6 = L6.report({}), r7 = L.report({});
  assert.equal(r6.day_stops.filter(d => d.kind === 'day').length, 405); assert.equal(r6.day_stops.filter(d => d.kind === 'day' && d.applied).length, 387); assert.equal(r6.state_offsets.length, 0); assert.ok(r6.day_stops.every(d => !d.state && d.arr_rule !== 'clock'));
  assert.ok(!L6.units.some(u => u.day_positions && u.day_positions.days.some(e => e.status === 'sequence')), 'no sequence without states');
  let same = 0;
  for (const d of r7.day_stops) { if (d.state || !d.applied || d.merged_into) continue; const u = L.units.find(x => x.id === d.unit); if (u.day_positions.days.some(e => e.items.some(it => it.state))) continue; const o = r6.day_stops.find(x => x.unit === d.unit && x.id === d.id); if (!o || !o.applied) continue; assert.ok(Math.abs(o.arrive - d.arrive) < 1e-9, `${d.unit} ${d.id}`); same++; }
  assert.ok(same > 100, `${same} unchanged`);
  assert.equal(L.counts.drawn, L6.counts.drawn, 'a line state never gives a unit a road');
});

test('v7, a mixed label alone is one item held all day; a mixed label split by an intermediate is first and evening at one position with the intermediate between (synthetic on Meredith, sheet 1)', () => {
  const mixedOnes = L.units.filter(u => u.day_positions && u.day_positions.days.some(e => e.status === 'single' && e.items[0].state === 'mixed')); assert.ok(mixedOnes.length >= 1);
  for (const u of mixedOnes) for (const e of u.day_positions.days.filter(e => e.status === 'single' && e.items[0].state === 'mixed')) { assert.deepEqual([...e.items[0].states].sort(), ['evening', 'first']); const st = L.report({}).day_stops.find(d => d.unit === u.id && d.id === e.items[0].entry); if (st && st.applied) { assert.equal(st.arr_rule, 'asap'); assert.equal(st.state_to, st.window.to); } }
  const d2 = jclone(doc); Object.assign(d2.claims['TMJ1-048'], { line_state: 'mixed', line_states: ['first', 'evening'], line_clock: null, printed_clock_near_line: null }); Object.assign(d2.claims['TMJ1-047'], { line_state: 'intermediate' });
  const L2 = build({ ...raw, dayPositions: d2 }), p = L2.plans.get('us-1c-1d-meredith-19in'), ids = p.days.filter(d => d.sheet === 'J1').map(d => d.id);
  assert.deepEqual(ids, ['DAY-TMJ1-048#first', 'DAY-TMJ1-047', 'DAY-TMJ1-048#evening']);
  const a = p.days.find(d => d.id === ids[0]), b = p.days.find(d => d.id === ids[2]); assert.deepEqual(a.slot, b.slot); assert.equal(a.state, 'first'); assert.equal(b.state, 'evening'); assert.equal(b.arr_rule, 'evening'); assert.equal(a.seq.next, 'DAY-TMJ1-047'); assert.equal(b.seq.prev, 'DAY-TMJ1-047');
  const st = L2.report({}).day_stops.filter(d => d.unit === 'us-1c-1d-meredith-19in' && d.sheet === 'J1' && d.applied).sort((x, y) => x.arrive - y.arrive); assert.deepEqual(st.map(d => d.id), ids); assert.equal(st[1].arr_rule, 'midpoint');
  assert.deepEqual(validateUnits(L2.units), []); const e = L2.units.find(u => u.id === 'us-1c-1d-meredith-19in').day_positions.days[0]; assert.equal(e.status, 'sequence'); assert.equal(e.items.length, 3);
});

test('v7, the card: a state-ordered sequence lists every item with its state, basis, crop and window; an evening line with no known daytime place says so; a window that cannot be met shows the offset; a label with no readable state keeps the whole-day wording; several labels say why the states do not order them', () => {
  const th = { layer: L, state: { scenario: {} } }, rep = L.report({});
  const seqU = L.units.find(u => u.drawn && u.day_positions && u.day_positions.days.some(e => e.status === 'sequence' && e.drawn_as === 'placed')); assert.ok(seqU);
  const e = seqU.day_positions.days.find(x => x.status === 'sequence'), h = daySection(th, seqU);
  const he = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  for (const s of ['put in order by their line states', 'DEC-018', he(e.order_why), ...e.items.map(it => it.claim), ...e.items.map(it => it.state_crop), ...e.items.map(it => he(it.state_basis)), 'Line state:', 'Documented:', 'Modelled (plausible-procedural)', 'state window', 'documented for (unit, place, state)']) assert.ok(h.includes(s), `the sequence card should say: ${s}`);
  const FORBIDDEN = /\bAI\b|Claude|Anthropic|subagent/; assert.ok(!FORBIDDEN.test(h));
  const unk = rep.day_stops.find(d => d.applied && d.state === 'evening' && d.daytime_known === false && L.units.find(u => u.id === d.unit).drawn); assert.ok(unk); assert.match(daySection(th, L.units.find(u => u.id === unk.unit)), /daytime place is unknown/);
  const off = rep.state_offsets[0]; assert.ok(off); const ho = daySection(th, L.units.find(u => u.id === off.unit)); assert.match(ho, /Offset \(reported, like the ledger-vs-edge offsets; the gate is not moved\)/); assert.ok(ho.includes(`${off.late_min} min later`));
  const clk = L.units.find(u => u.id === 'us-1c-3d-biddle-121pa'), hc = daySection(th, clk); assert.match(hc, /Printed beside the line: “2\.30 P\.M\.”/); assert.match(hc, /Documented: the intermediate line at 14:30/); assert.match(hc, /Printed beside the line: “11 A\.M\.”/); assert.match(hc, /adjacent_unproven/);
  const none = L.units.find(u => u.drawn && u.day_positions && u.day_positions.days.some(x => x.status === 'single' && !x.items[0].state && x.drawn_as === 'placed')); assert.ok(none); const hn = daySection(th, none); assert.match(hn, /No line state read for this label/); assert.match(hn, /the sheet gives no clock/); assert.match(hn, /whole-day rule/);
  const multi = L.units.find(u => u.day_positions && u.day_positions.days.some(x => x.status === 'multiple')), me = multi.day_positions.days.find(x => x.status === 'multiple'); assert.match(daySection(th, multi), /Why the line states do not order them:/); assert.ok(daySection(th, multi).includes(he(me.order_why).slice(0, 30)));
  for (const u of L.units) if (u.day_positions) { const x = daySection(th, u); assert.ok(!FORBIDDEN.test(x), u.id); assert.ok(x.includes('19:32'), `${u.id}: the card names the evening convention`); }
  assert.equal(STATE_RULE.unreadable.includes('whole-day rule'), true);
});

test('rule 1, one label: a position is used only for a unit with exactly one claim on the sheet; several labels, a lone movement arrow and a division or corps label place nothing, and every label is listed', () => {
  const used = new Set(plansWithDays().flatMap(p => p.days.map(d => d.claim))); assert.ok(used.size > 50, `${used.size} claims drive a day stop`);
  const dp = L.dayPositions, per = new Map(); for (const c of Object.values(doc.claims)) { const k = c.sheet + '|' + c.unit; (per.get(k) || per.set(k, []).get(k)).push(c); }
  for (const id of used) {
    const c = doc.claims[id], group = per.get(c.sheet + '|' + c.unit), res = dp.onSheetFor(c.unit, c.sheet); assert.ok(group.length === 1 || res.status === 'sequence', `${id}: ${c.unit} has ${group.length} labels on ${c.sheet} that the states do not order`); assert.equal(c.kind, 'position');
    assert.ok(USED_LEVELS.has(L.units.find(u => u.id === c.unit).level), `${id}: level`);
  }
  let multi = 0, seq = 0, move = 0, formation = 0;
  for (const [k, group] of per) {
    const [sheet, unit] = k.split('|'), lvl = L.units.find(u => u.id === unit).level, res = dp.onSheetFor(unit, sheet);
    if (!USED_LEVELS.has(lvl)) { formation++; assert.equal(res.status, 'formation'); assert.equal(res.used, null); }
    else if (group.length > 1) {
      assert.equal(res.used, null); assert.equal(res.labels, group.length); assert.deepEqual(res.claims.map(c => c.id).sort(), group.map(c => c.id).sort(), 'every label is listed');
      if (orderStates(group).ok) { seq++; assert.equal(res.status, 'sequence'); } else { multi++; assert.equal(res.status, 'multiple'); for (const c of group) assert.ok(!used.has(c.id), `${c.id}: a label of a unit with several labels that the states do not order is drawn`); }
    }
    else if (group[0].kind !== 'position') { move++; assert.equal(res.status, 'movement_only'); assert.equal(res.used, null); }
    else { assert.equal(res.status, 'single'); assert.equal(res.used.id, group[0].id); }
  }
  assert.ok(multi > 60 && formation > 80 && seq === 9, `${multi} multi-label, ${seq} sequences, ${move} movement-only, ${formation} formation labels`);
  // the units say the same on their cards: a unit with several labels that the states do not order lists them all and draws none
  for (const u of L.units) if (u.day_positions) for (const e of u.day_positions.days) {
    if (e.status !== 'single' && e.status !== 'sequence') { assert.equal(e.used, null); assert.equal(e.drawn_as, null); assert.equal(e.claims.length, e.labels); assert.deepEqual(e.items, []); } else if (e.status === 'single') assert.equal(e.labels, 1); else assert.ok(e.labels >= 2 && e.items.length >= 2);
  }
  // a second label added to a unit that has one makes it a unit with several labels: its day stop disappears
  const p = plansWithDays().find(q => q.days.some(d => d.kind === 'day')), d0 = p.days.find(d => d.kind === 'day'), c0 = doc.claims[d0.claim];
  const doc2 = jclone(doc); doc2.claims['TM-EXTRA-1'] = { ...c0, id: 'TM-EXTRA-1', printed: 'second label' }; const L2 = build({ ...raw, dayPositions: doc2 });
  assert.ok(!L2.plans.get(p.unit).days.some(d => d.claim === c0.id), 'a second label withdraws the position'); assert.equal(L2.dayPositions.onSheetFor(c0.unit, c0.sheet).status, 'multiple');
  assert.ok(!L2.report({}).day_stops.some(d => d.unit === p.unit && d.claim === c0.id));
});

test('rule 2, level: brigade, battery and artillery labels place their regiments or batteries inside the position; a division or corps label places nothing; the slots lie inside the position', () => {
  for (const p of plansWithDays()) for (const d of p.days) {
    const own = L.units.find(u => u.id === d.owner); assert.ok(USED_LEVELS.has(own.level), `${p.unit}: ${d.owner} is a ${own.level}`);
    assert.ok(d.slot ? true : !d.feasible, 'a feasible entry has a slot');
    if (d.feasible) { const c = doc.claims[d.claim], dx = distM(d.slot, c); assert.ok(dx <= Math.max(2 * c.sigma_m, 80) + 400, `${p.unit}: slot ${Math.round(dx)} m from the position (sigma ${c.sigma_m})`); assert.ok(insideBox(d.slot, BOX), `${p.unit}: slot inside the loaded ground`); }
    assert.ok(L.placement.chain(p.unit).includes(d.owner), `${p.unit} is under ${d.owner}`);
  }
  const brig = L.units.filter(u => u.level === 'brigade' && u.day_positions && u.day_positions.days.some(e => e.status === 'single')); assert.ok(brig.length > 40);
  assert.ok(L.units.every(u => !u.children.length || !u.drawn), 'a formation is never drawn');
  const divClaim = Object.values(doc.claims).find(c => !USED_LEVELS.has(L.units.find(u => u.id === c.unit).level)); assert.ok(divClaim);
  assert.ok(![...L.plans.values()].some(p => (p.days || []).some(d => d.claim === divClaim.id)));
});

test('every position drawn has a claim id and a source file: the claim is in the digest, its sheet file exists, the stop and its events name the sheet\'s source key, the sigma is the claim\'s own', () => {
  const ev = L.events({}), paths = ev.filter(e => e.type === 'path' && e.sources.some(k => Object.values(DAY_SOURCE).includes(k)));
  const byUnit = new Map(); for (const e of paths) (byUnit.get(e.unit) || byUnit.set(e.unit, []).get(e.unit)).push(e);
  let n = 0;
  for (const d of L.report({}).day_stops.filter(x => x.applied && !x.merged_into)) {
    const c = doc.claims[d.claim]; assert.ok(c, `${d.id}: claim ${d.claim} in the digest`); assert.ok(fs.existsSync(path.join(BT, SHEETS[c.sheet].file)), `${c.sheet}: file`); assert.equal(c.sheet, d.sheet);
    const plan = L.plans.get(d.unit), entry = plan.days.find(x => x.id === d.id), u = L.units.find(x => x.id === d.unit); assert.equal(entry.claim, c.id); assert.equal(entry.placeSigma, c.sigma_m);
    assert.ok(u.sources.includes(DAY_SOURCE[c.sheet]) && L.sources[DAY_SOURCE[c.sheet]], `${d.unit}: the source key of ${c.sheet}`);
    const pe = (byUnit.get(d.unit) || []).find(e => distM(e.wp.at(-1), entry.slot) < 0.5 && Math.abs(e.wp.at(-1).t - d.arrive) < 1e-6); if (d.distance_m > 0) { assert.ok(pe, `${d.unit}: a path event ends at the slot of ${d.id} at ${d.arrive}`); assert.deepEqual(pe.sources, [DAY_SOURCE[c.sheet]]); assert.equal(pe.tier, 'plausible-procedural'); assert.equal(Math.round(pe.wp.at(-1).sigma_m), Math.round(c.sigma_m)); n++; }
  }
  assert.ok(n > 150, `${n} day legs checked`);
  for (const u of L.units) if (u.day_positions) for (const e of [...u.day_positions.days, u.day_positions.hour]) if (e) { assert.ok(u.sources.includes(DAY_SOURCE[e.sheet]), `${u.id}: lists the source of ${e.sheet}`); for (const id of e.claims) assert.ok(doc.claims[id], id); }
  for (const k of Object.values(DAY_SOURCE)) { const s = L.sources[k]; assert.ok(s && s.kind === 'secondary' && s.citation.length > 60, k); }
  assert.equal(L.sources['LOC-99447494'].weak, true); assert.equal(L.sources['BACH-1876-S2'].weak, false);
  for (const sc of SCENARIOS) { const { arrivals, events } = L.both(sc); assert.deepEqual(validateArrivals(arrivals, ids), []); assert.deepEqual(validateEvents(events, ids), []); }
});

test('Q04 and the day windows, in every scenario: no event before a unit\'s gate, a day stop is reached after the unit has entered and after the march allows, on its own day, never before the day begins at local midnight', () => {
  for (const sc of SCENARIOS) {
    const { arrivals, events, report } = L.both(sc), A = new Map(arrivals.map(a => [a.unit, a])), enter = new Map(events.filter(e => e.type === 'enter').map(e => [e.unit, e.t]));
    for (const e of events) assert.ok(e.t >= A.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} at ${e.t} before the gate ${A.get(e.unit).earliest}`);
    let applied = 0;
    for (const d of report.day_stops) {
      const plan = L.plans.get(d.unit), e = plan.days.find(x => x.id === d.id);
      if (!d.applied) { assert.ok(d.why_not && d.why_not.length > 8, `${d.id}: not applied needs a reason`); continue; }
      applied++; assert.ok(d.arrive > enter.get(d.unit) - 1e-9, `${d.unit}: ${d.id} reached before the unit entered`);
      assert.ok(d.arrive >= e.arr_not_before - 1e-6 && d.arrive <= e.arr_not_after + 1e-6, `${d.unit} ${d.id}: ${d.arrive} outside [${e.arr_not_before}, ${e.arr_not_after}]`);
      if (!d.merged_into) { assert.ok(d.depart >= enter.get(d.unit) - 1e-9); assert.ok(d.depart >= e.dep_not_before - 1e-6, `${d.id}: leaves before its day begins`); assert.ok(d.arrive + 1e-6 >= d.depart + d.distance_m / SPEED.march / 60 - 0.02, 'no faster than the march rate'); }
      assert.ok(d.latest_arrival >= d.arrive - 1e-6, `${d.id}: latest >= earliest`); assert.ok(d.latest_arrival <= e.arr_not_after + 1e-6);
      if (e.kind === 'day') { const w = dayWindow(e.date); assert.ok(d.arrive >= w.from && d.arrive <= w.to + 1e-6); }
    }
    assert.ok(applied > 150, `${applied} day stops applied`);
  }
  // the default scenario: a unit that arrives the evening before waits at the edge until its day begins
  const wait = L.report({}).day_stops.find(d => d.applied && !d.merged_into && d.depart != null && d.depart > L.arrivals({}).find(a => a.unit === d.unit).default + 60); assert.ok(wait, 'a unit waits for its day to begin');
});

test('speeds: nothing moves faster than double-quick, and a leg to a day position is a march at the documented rate', () => {
  for (const sc of SCENARIOS.slice(0, 3)) for (const e of L.events(sc)) if (e.type === 'path') {
    const day = e.sources.some(k => Object.values(DAY_SOURCE).includes(k));
    for (let i = 1; i < e.wp.length; i++) { const v = distM(e.wp[i - 1], e.wp[i]) / ((e.wp[i].t - e.wp[i - 1].t) * 60); assert.ok(v <= SPEED.double_quick * 1.0001 + 1e-9, `${e.unit}: ${v.toFixed(2)} m/s`); if (day) assert.ok(v <= SPEED.march * 1.0001 + 1e-9, `${e.unit}: a day leg at ${v.toFixed(3)} m/s`); }
  }
});

test('purity: arrivals, events and the report (with the day stops) are the same whatever the order of evaluation, in fresh layers and repeated calls', () => {
  const hash = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex'), key = sc => JSON.stringify(sc), ref = new Map(SCENARIOS.map(sc => [key(sc), hash(L.both(sc))]));
  for (let round = 0; round < 3; round++) {
    const layer = build(), order = SCENARIOS.map((s, i) => [rand(17, round, i), s]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    for (const sc of order) { assert.equal(hash(layer.both(sc)), ref.get(key(sc)), `scenario ${key(sc)} differs (round ${round})`); layer.report(sc); }
  }
  assert.equal(hash(L.report({})), hash(L.report({ choices: {} })));
});

test('no figure stands outside the loaded ground except marching in: every day slot is inside, every day leg ends inside, and a day leg that does not start at the entry of the unit runs inside the ground', () => {
  const ev = L.events({}), enter = new Map(ev.filter(e => e.type === 'enter').map(e => [e.unit, e.at])); let legs = 0, fromEdge = 0;
  for (const e of ev) if (e.type === 'path' && e.sources.some(k => Object.values(DAY_SOURCE).includes(k))) {
    legs++; assert.ok(insideBox(e.wp.at(-1), BOX, 5), `${e.unit}: a day leg ends outside the loaded ground`);
    if (distM(e.wp[0], enter.get(e.unit)) < 1) { fromEdge++; continue; }                                  // the march in along the approach road (as for a ledger place: the road may leave and re-enter the ground)
    for (const w of e.wp.slice(1)) assert.ok(insideBox(w, BOX), `${e.unit}: leaves the loaded ground at ${w.t}`);
  }
  assert.ok(legs > 200 && fromEdge > 50, `${legs} day legs, ${fromEdge} from the edge`);
  for (const p of plansWithDays()) for (const d of p.days) if (d.feasible) assert.ok(d.slot && insideBox(d.slot, BOX, 5));
  const outside = Object.values(doc.claims).filter(c => !insideBox(c, BOX)); assert.ok(outside.length > 0);
  for (const c of outside) assert.ok(![...L.plans.values()].some(p => (p.days || []).some(d => d.claim === c.id && d.feasible)), `${c.id} is outside the loaded ground and is drawn`);
  const nf = L.report({}).day_stops.filter(d => !d.feasible); assert.ok(nf.length > 0 && nf.every(d => !d.applied && /outside the loaded ground|stand outside/.test(d.why_not)));
});

// how far the arrival minute of a late ledger place can move when a day position refines its slot: by the change of the length of its route (the slot, and the point of the road the route leaves for it, change),
// walked at double-quick, and by nothing else (a bound derived from the geometry; the fixed 3 minutes held for the first 239 drawn units only)
const slotMin = (unit, po) => { const s1 = L.plans.get(unit).stops.find(x => x.po === po), s0 = L0.plans.get(unit).stops.find(x => x.po === po); return Math.abs(polylineLength(s1.route) - polylineLength(s0.route)) / (SPEED.double_quick * 60) + 1e-6; };
test('timed claims win at their time: with the day positions every timed place of the ledgers keeps its time, a unit with no refined slot is reached at the same second as without them (or earlier, never later, where a day stop of the same day stands between two ledger places and shortens the way to a late one), and no defect or offset appears (the layer without them is the reference)', () => {
  for (const sc of SCENARIOS) {
    const a = L.report(sc), b = L0.report(sc), refinedUnits = new Set([...L.plans.values()].filter(p => p.stops.some(s => s.refined_by)).map(p => p.unit)), refined = { has: k => refinedUnits.has(k.split('|')[0]) };
    const dayBefore = (unit, t) => a.day_stops.some(d => d.unit === unit && d.applied && !d.merged_into && d.arrive < t && d.arrive >= t - 1440);
    assert.deepEqual(a.defects.map(d => [d.kind, d.unit, d.stop]), b.defects.map(d => [d.kind, d.unit, d.stop]), 'the same defects (a refined slot moves the minute a little)'); a.defects.forEach((d, i) => { const allow = refined.has(d.unit + '|' + d.stop) ? slotMin(d.unit, d.stop) + 1 : 0; assert.ok(d.late_min <= b.defects[i].late_min + allow, `${d.unit} ${d.stop}: never later`); if (d.late_min < b.defects[i].late_min - allow) assert.ok(dayBefore(d.unit, d.arrives), `${d.unit} ${d.stop}: less late only through a day stop before it`); }); assert.equal(b.day_stops.length, 0, 'the reference layer has no day positions'); assert.ok(a.ledger_arrivals.length > 300);
    assert.equal(a.ledger_arrivals.length, b.ledger_arrivals.length); let same = 0, moved = 0, earlier = 0;
    a.ledger_arrivals.forEach((x, i) => {
      const y = b.ledger_arrivals[i]; assert.deepEqual([x.unit, x.stop, x.documented], [y.unit, y.stop, y.documented]);
      if (!refined.has(x.unit + '|' + x.stop)) { assert.ok(x.arrive <= y.arrive + 1e-9, `${x.unit} ${x.stop}: a timed place is reached at ${x.arrive}, later than ${y.arrive}`); if (Math.abs(x.arrive - y.arrive) < 1e-9) same++; else { earlier++; assert.ok(y.arrive > y.documented + 1e-6 && dayBefore(x.unit, x.arrive), `${x.unit} ${x.stop}: only a late place is reached earlier, and only through a day stop before it`); } }
      else { moved++; if (y.arrive <= y.documented + 1e-6) assert.ok(Math.abs(x.arrive - y.arrive) < 1e-6, `${x.unit} ${x.stop}: an on-time place stays on time`); else assert.ok(x.arrive - y.arrive <= slotMin(x.unit, x.stop) && y.arrive - x.arrive <= slotMin(x.unit, x.stop) + (dayBefore(x.unit, x.arrive) ? Infinity : 0), `${x.unit} ${x.stop}: a late place moves by the change of the slot only (at most the change of the length of its route at double-quick)`); }
    });
    assert.ok(same > 300 && moved >= 1 && earlier <= 20, `${same} unchanged to the second, ${moved} with a slot refined by the position, ${earlier} late places reached earlier through a day stop before them`);
    const o0 = new Map(b.offsets.map(o => [o.unit + '|' + o.stop, o])); assert.equal(a.offsets.length, b.offsets.length);
    for (const o of a.offsets) { const p = o0.get(o.unit + '|' + o.stop); assert.equal(o.kind, p.kind); const allow = refined.has(o.unit + '|' + o.stop) ? slotMin(o.unit, o.stop) + 1 : 0; assert.ok(o.late_min <= p.late_min + allow, `${o.unit} ${o.stop}: never later`); if (o.late_min < p.late_min - allow) assert.ok(dayBefore(o.unit, o.arrives), `${o.unit} ${o.stop}`); if (!refined.has(o.unit + '|' + o.stop)) assert.equal(o.distance_m, p.distance_m); }
  }
  // the units the day positions touch keep every ledger stop they had
  for (const [id, p] of L.plans) { const q = L0.plans.get(id); assert.deepEqual(p.stops.map(s => [s.po, s.t_doc]), q.stops.map(s => [s.po, s.t_doc]), id); }
  assert.equal(L.counts.drawn, L0.counts.drawn, 'a day position never gives a unit a road: the drawn set is the same');
  assert.ok(L.counts.moving >= L0.counts.moving && L.counts.edge_only <= L0.counts.edge_only);
  for (const u of L.units) if (u.drawn && L0.units.find(x => x.id === u.id).render.status === 'moving') assert.equal(u.render.status, 'moving');
});

test('troop map against ledger: both are shown with the distance between them, a ledger place that overlaps the position takes a slot inside it, one that does not stays where it was', () => {
  let agree = 0, differ = 0, refined = 0;
  for (const u of L.units) if (u.day_positions) for (const e of u.day_positions.days) if (e.status === 'single') {
    const c = doc.claims[e.used];
    for (const x of e.ledger_compare) {
      const pr = L.gazetteer.resolve(x.place), tgt = pr.line ? nearestOnLine(pr.line, c).point : pr.center; assert.equal(x.distance_m, Math.round(distM(tgt, c)), `${u.id} ${x.entry}`); assert.equal(x.agree, distM(tgt, c) <= pr.sigma_m + c.sigma_m); assert.ok(x.t.startsWith(e.date));
      x.agree ? agree++ : differ++;
    }
  }
  for (const [id, p] of L.plans) for (const s of p.stops) if (s.refined_by) {
    refined++; const c = doc.claims[s.refined_by]; assert.ok(s.refined.distance_m <= s.refined.sigma_sum_m); assert.ok(s.t_doc >= isoToMin(c.date) && s.t_doc < isoToMin(c.date) + 1440);
    assert.equal(s.placeSigma, c.sigma_m); const u = L0.plans.get(id).stops.find(x => x.po === s.po); assert.equal(u.t_doc, s.t_doc, 'the ledger keeps the time');
    assert.ok(L.units.find(x => x.id === id).day_positions.days.some(e => e.items.some(it => it.claim === c.id && it.refined_stops.includes(s.po)) && e.refined_stops.includes(s.po)));
  }
  assert.ok(agree > 10 && differ > 40 && refined > 10, `${agree} agree, ${differ} differ, ${refined} refined stops`);
  for (const [id, p] of L.plans) for (const d of p.days || []) for (const x of d.compare) if (!x.agree) { const s = p.stops.find(s => s.po === x.stop); assert.ok(!s.refined_by || s.refined_by !== d.claim, `${id}: ${x.stop} differs from ${d.claim} and is kept (it may lie inside another position of the same day)`); }
});

test('the hour sheet is an inferred timed stop for 1 Jul 14:00 to 15:30 where nothing else places the unit, and only there: in the real data no unit qualifies and every reason is listed; with a position moved inside the ground the stop appears, just in time, tier inferred', () => {
  const rep = L.report({}); assert.equal(rep.day_stops.filter(d => d.kind === 'hour' && d.applied).length, 0);
  for (const u of L.units) if (u.day_positions && u.day_positions.hour) { const h = u.day_positions.hour; assert.equal(h.sheet, 'H'); if (h.status === 'single' && h.drawn_as === 'not_used') assert.match(h.why_not, /single-label or state-ordered day position for 1 Jul/); }
  for (const p of plansWithDays()) for (const d of p.days.filter(x => x.kind === 'hour')) { const w = dayWindow('1863-07-01'); assert.ok(!(p.stops.some(s => s.t_doc >= w.from && s.t_doc < w.to)), `${p.unit}: hour stop although a ledger place is dated 1 Jul`); }
  // synthetic: put the hour-sheet position of Ames inside the ground (at his 2 Jul position, which is inside)
  const doc2 = jclone(doc), hc = doc2.claims['TMJ1H-015'], j2 = doc2.claims['TM2-046']; Object.assign(hc, { lng: j2.lng, lat: j2.lat }); const L2 = build({ ...raw, dayPositions: doc2 }), r2 = L2.report({});
  const hs = r2.day_stops.filter(d => d.kind === 'hour'); assert.ok(hs.length >= 1 && hs.every(d => d.applied), 'the hour stop is made for the Ames regiments that have no timed place dated 1 Jul');
  for (const d of hs) { assert.ok(d.arrive >= minOf(7, 1, 14) - 1e-6 && d.arrive <= minOf(7, 1, 15, 30) + 1e-6, `${d.unit}: arrives ${d.arrive}`); const e = L2.plans.get(d.unit).days.find(x => x.id === d.id); assert.equal(e.tier, 'inferred'); assert.equal(e.arr_not_before, minOf(7, 1, 14)); assert.equal(e.arr_not_after, minOf(7, 1, 15, 30)); assert.ok(!L2.plans.get(d.unit).stops.some(s => s.t_doc >= minOf(7, 1) && s.t_doc < minOf(7, 2))); }
  const ev = L2.events({}).filter(e => e.type === 'path' && e.sources.includes('LOC-99447494')); assert.ok(ev.length >= 1); for (const e of ev) assert.equal(e.tier, 'plausible-procedural');
  const u = L2.units.find(x => x.id === hs[0].unit); assert.match(u.day_positions.hour.role, /inferred timed stop/); assert.equal(doc2.claims['TMJ1H-015'].tier, 'inferred');
  // the Ames regiment with a ledger place dated 1 Jul keeps it and is not given the hour stop
  const withStop = L2.units.filter(x => x.id.startsWith('us-11c-1d-ames-') && L2.plans.get(x.id).stops.some(s => s.t_doc < minOf(7, 2))); assert.ok(withStop.length >= 1);
  for (const x of withStop) assert.ok(!r2.day_stops.some(d => d.kind === 'hour' && d.unit === x.id)), assert.ok(L2.plans.get(x.id).day_notes.some(n => n.kind === 'hour'));
  // a unit with a single-label position on sheet 1 does not use the hour sheet
  const gilsa = L2.units.find(x => x.id === 'us-11c-1d-gilsa'); assert.equal(gilsa.day_positions.hour.drawn_as, 'not_used');
});

test('between days a unit stays at its previous position until the next day\'s window opens at local midnight; each position is used on its own day', () => {
  const cand = plansWithDays().filter(p => !p.stops.length && p.days.filter(d => d.feasible && d.kind === 'day').length >= 2); assert.ok(cand.length > 5, `${cand.length} units with positions on two days and no timed place`);
  const rep = L.report({}), ev = L.events({}); let n = 0;
  for (const p of cand) {
    const ds = rep.day_stops.filter(d => d.unit === p.unit && d.applied).sort((a, b) => a.arrive - b.arrive); if (ds.length < 2) continue;
    const k = ds.findIndex((d, i) => i > 0 && d.date > ds[i - 1].date); if (k < 0) continue;                 // the last stop of one day and the first stop of the next (a day may hold several state-ordered stops, v7)
    const d1 = ds[k - 1], d2 = ds[k], e2 = p.days.find(x => x.id === d2.id); assert.ok(d1.date < d2.date && d1.arrive <= isoToMin(d1.date) + 1440 + 1e-6 && d2.depart >= isoToMin(d2.date) - 1e-6, `${p.unit}: the second leg starts when its day begins`);
    const paths = ev.filter(e => e.unit === p.unit && e.type === 'path'); const second = paths.find(e => Math.abs(e.wp.at(-1).t - d2.arrive) < 1e-6); assert.ok(second && Math.abs(second.t - d2.depart) < 1e-6);
    assert.ok(distM(second.wp[0], p.days.find(x => x.id === d1.id).slot) < 0.5, `${p.unit}: the move to the second position starts where the first one was`); assert.ok(e2.slot); n++;
  }
  assert.ok(n > 5);
});

test('the card: a placed unit shows the printed label, the quote, the sigma, the crop, documented-for-the-day and the modelled window and the ledger places with their distance; several labels are all listed; a unit with no road says so; a unit without a label shows nothing', () => {
  const th = { layer: L, state: { scenario: {} } };
  const placed = L.units.find(u => u.drawn && u.day_positions && u.day_positions.days.some(e => e.status === 'single' && e.ledger_compare.some(x => !x.agree) && e.drawn_as === 'placed')); assert.ok(placed);
  const h = daySection(th, placed), e = placed.day_positions.days.find(x => x.status === 'single' && x.drawn_as === 'placed'), c = doc.claims[e.used];
  for (const s of [c.id, c.printed.replace(/&/g, '&amp;').replace(/'/g, '&#39;'), 'documented for the day; time modelled', 'DEC-010', `± ${Math.round(c.sigma_m)} m`, 'plausible-procedural', 'Modelled', 'could have arrived', 'local midnight', 'neither is chosen', 'differ', 'not an independent witness', c.crop]) assert.ok(h.includes(s), `the card should say: ${s}`);
  assert.ok(!/\bAI\b|Claude|Anthropic|subagent/.test(h), 'the copy audit words, as whole words');
  const multi = L.units.find(u => u.day_positions && u.day_positions.days.some(x => x.status === 'multiple')), hm = daySection(th, multi), me = multi.day_positions.days.find(x => x.status === 'multiple');
  assert.match(hm, /labels on this sheet: several line states, none drawn as one place/); for (const id of me.claims) assert.ok(hm.includes(id), id);
  const open = L.units.find(u => !u.drawn && !u.children.length && u.day_positions && u.day_positions.days.some(x => x.drawn_as === 'not_drawn')); assert.ok(open); assert.match(daySection(th, open), /no road of approach/);
  const agg = L.units.find(u => u.children.length && u.day_positions && u.day_positions.days.some(x => x.drawn_as === 'aggregate')); assert.ok(agg); assert.match(daySection(th, agg), /formation above the regiments/);
  const none = L.units.find(u => !u.day_positions); assert.equal(daySection(th, none), '');
  const nw = L.units.find(u => u.day_positions && u.day_positions.days.some(x => x.used && doc.claims[x.used].nw_of_seminary)); assert.ok(nw); assert.match(daySection(th, nw), /North-west of the Seminary/);
  const s1 = L.units.find(u => u.day_positions && u.day_positions.days.some(x => x.sheet === 'J1' && x.status === 'single')); assert.match(daySection(th, s1), /Registration sigma of this sheet-1 position/);
  const hr = L.units.find(u => u.day_positions && u.day_positions.hour && u.day_positions.hour.status === 'single'); assert.match(daySection(th, hr), /Hour sheet/); assert.match(daySection(th, hr), /author and date are unknown/);
});

test('contract 1.5: every unit validates, the validator refuses a position drawn from several labels, a placed position on an undrawn unit, a missing reason and a malformed comparison', () => {
  assert.deepEqual(validateUnits(L.units), []); assert.equal(L.meta.contract, '1.5');
  const u = L.units.find(x => x.drawn && x.day_positions && x.day_positions.days.some(e => e.status === 'single')), m = L.units.find(x => x.day_positions && x.day_positions.days.some(e => e.status === 'multiple'));
  const bad = (unit, fn) => { const d = jclone(unit.day_positions); fn(d); return validateDayPositions(d, unit, 'x').join(' | '); };
  assert.match(bad(m, d => { const e = d.days.find(x => x.status === 'multiple'); e.used = e.claims[0]; }), /places nothing/);
  assert.match(bad(m, d => { const e = d.days.find(x => x.status === 'multiple'); e.drawn_as = 'placed'; }), /never drawn/);
  assert.match(bad(u, d => { const e = d.days.find(x => x.status === 'single'); e.labels = 2; }), /claims must list every label|names its one claim/);
  assert.match(bad(u, d => { const e = d.days.find(x => x.status === 'single'); e.drawn_as = 'not_applied'; e.why_not = ''; }), /says why/);
  assert.match(bad(u, d => { d.days[0].ledger_compare = [{ entry: 'PO-1' }]; }), /distance/);
  assert.match(validateDayPositions(jclone(u.day_positions), { ...u, drawn: false }, 'x').join(' '), /not drawn/);
  assert.deepEqual(validateDayPositions(jclone(u.day_positions), u, 'x'), []);
  // contract 1.7: sequences and items
  const sq = L.units.find(x => x.drawn && x.day_positions && x.day_positions.days.some(e => e.status === 'sequence')), sqe = d => d.days.find(x => x.status === 'sequence');
  assert.match(bad(sq, d => { sqe(d).used = sqe(d).items[0].claim; }), /uses no single claim/);
  assert.match(bad(sq, d => { sqe(d).order_why = ''; }), /lists its items in order/);
  assert.match(bad(sq, d => { sqe(d).items = sqe(d).items.slice(0, 1); }), /lists its items in order/);
  assert.match(bad(sq, d => { sqe(d).items[0].state_tier = 'inferred'; }), /carries its basis, its crop, its tier/);
  assert.match(bad(sq, d => { sqe(d).items[0].state_crop = null; }), /carries its basis, its crop/);
  assert.match(bad(sq, d => { const it = sqe(d).items[0]; it.state_time_tier = 'documented'; it.line_clock = null; }), /usable clock printed beside the line/);
  assert.match(bad(sq, d => { sqe(d).items[0].state = 'morning'; }), /item state morning/);
  assert.match(bad(sq, d => { sqe(d).items[0].claim = 'TM-nope'; }), /names its entry and one of the labels/);
  assert.match(bad(u, d => { const e = d.days.find(x => x.status === 'single'); e.items = []; }), /one state item/);
  assert.match(bad(u, d => { const e = d.days.find(x => x.status === 'single'); if (!e.items[0].state) { e.items[0].state_tier = 'documented'; } else { e.items[0].state = null; } }), /no state, no state tier|carries its basis/);
  assert.match(bad(m, d => { d.days.find(x => x.status === 'multiple').order_why = null; }), /say why their states do not order them/);
  assert.deepEqual(validateDayPositions(jclone(sq.day_positions), sq, 'x'), []);
});

test('the counts the notes quote are the layer\'s: HISTORY-LAYER-NOTES.md has the troop-map section and says what is placed by which source', () => {
  const notes = fs.readFileSync(path.join(BT, 'app/HISTORY-LAYER-NOTES.md'), 'utf8'); assert.match(notes, /## Troop-map day positions \(contract 1\.5 and 1\.7, DEC-010, DEC-011 and DEC-018\)/); assert.match(notes, /### Line states \(history layer v7, DEC-018\)/);
  const rep = L.report({}), applied = rep.day_stops.filter(d => d.kind === 'day' && d.applied).length; assert.ok(notes.includes(`**${applied}** applied in the default scenario`));
  assert.ok(notes.includes(`${rep.state_offsets.length} day stops of ${new Set(rep.state_offsets.map(o => o.unit)).size} units`), 'the notes quote the state offsets'); assert.match(notes, /Browser specs to run once the Release 1 acceptance run has finished/);
  assert.ok(notes.includes(`| units with a resolved entry (drawn) | ${L0.counts.drawn} | ${L.counts.drawn} |`)); assert.ok(notes.includes(`| **placed**: a road of approach and at least one place (a ledger place or a day position) | ${L0.counts.moving} | ${L.counts.moving} |`));
  assert.ok(DAY_SHEETS.length === 3);
});

// ---- history layer v4: the units that the new roads of approach (APPROACH-AUDIT.md) draw stand at their day positions by the same rules
test('v4: a unit drawn only by a new road gets its day position by the same rules (after its gate, at the march rate, on its own day), a position it cannot take is reported with its reason, and a late first place is a ledger-vs-edge offset with a note on the card', () => {
  const L3 = build({ ...raw, placementClaims: { ...raw.placementClaims, approach: raw.placementClaims.approach.filter(a => !a.added_in) } });
  const L = build({ ...raw, placementClaims: { ...raw.placementClaims, approach: raw.placementClaims.approach.filter(a => a.added_in !== 'v5' && a.added_in !== 'v8') } });        // the v4 state; the v5 records are tested below; the v8 records of ledger E in tests/ledgerE.test.mjs
  const newly = L.units.filter(u => u.drawn && !L3.units.find(x => x.id === u.id).drawn); assert.ok(newly.length >= 20);
  const rep = L.report({}), { arrivals, events } = L.both({}), A = new Map(arrivals.map(a => [a.unit, a])), enter = new Map(events.filter(e => e.type === 'enter').map(e => [e.unit, e.t]));
  let applied = 0, withPos = 0, offs = 0;
  for (const u of newly) {
    const plan = L.plans.get(u.id), dss = rep.day_stops.filter(d => d.unit === u.id); assert.equal(dss.length, plan.days.length, `${u.id}: every day entry is in the report`);
    if (u.day_positions.days.some(d => d.status === 'single' || d.status === 'sequence')) withPos++;
    for (const d of dss) {
      if (!d.applied) { assert.ok(d.why_not && d.why_not.length > 8, `${u.id} ${d.id}: not applied needs a reason`); continue; }
      applied++; assert.ok(d.arrive >= A.get(u.id).earliest - 1e-9, `${u.id}: ${d.id} reached before the gate`); assert.ok(d.depart >= enter.get(u.id) - 1e-9);
      if (!d.merged_into) assert.ok(d.arrive + 1e-6 >= d.depart + d.distance_m / SPEED.march / 60 - 0.02, `${u.id}: ${d.id} faster than the march rate`);
    }
    for (const o of rep.offsets.filter(x => x.unit === u.id)) { offs++; assert.equal(o.kind, 'ledger_vs_edge'); assert.ok(o.late_min >= 0 && o.distance_m > 0); assert.match(u.render.reason, /refers to a place [\d.]+ km farther on/, `${u.id}: the card says the ledger time refers to a place farther on`); assert.equal(A.get(u.id).earliest, L3.arrivals({}).find(a => a.unit === u.id).earliest, 'the gate is not moved'); }
    assert.match(u.render.reason, /Chambersburg Pike/);
  }
  assert.ok(applied >= 15 && withPos >= 15 && offs >= 15, `${applied} day stops applied, ${withPos} units with a single-label position, ${offs} offsets`);
  assert.equal(rep.defects.length, 0); assert.equal(L.counts.drawn - L3.counts.drawn, newly.length);
  // the same rules for every scenario: no new unit is on the field before its gate
  for (const sc of SCENARIOS) { const b = L.both(sc), G = new Map(b.arrivals.map(a => [a.unit, a])); for (const e of b.events) if (newly.some(u => u.id === e.unit)) assert.ok(e.t >= G.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} before its gate`); }
});

// ---- history layer v5: the units drawn by the road-name concordance and the position statements (DEC-014) stand where they stand by the same rules
test('v5: a unit drawn only by a v5 road (a position statement read as a road, or a period name resolved by the concordance) gets its day position by the same rules (after its gate, at the march rate, on its own day), the reasons are reported, a late first place is a ledger-vs-edge offset with a note, and no gate moves', () => {
  const L4 = build({ ...raw, placementClaims: { ...raw.placementClaims, approach: raw.placementClaims.approach.filter(a => a.added_in !== 'v5' && a.added_in !== 'v8') } });
  const newly = L.units.filter(u => u.drawn && !L4.units.find(x => x.id === u.id).drawn); assert.ok(newly.length >= 90, `${newly.length} newly drawn`);
  const rep = L.report({}), { arrivals, events } = L.both({}), A = new Map(arrivals.map(a => [a.unit, a])), enter = new Map(events.filter(e => e.type === 'enter').map(e => [e.unit, e.t])), A4 = new Map(L4.arrivals({}).map(a => [a.unit, a]));
  let applied = 0, offs = 0;
  for (const u of newly) {
    const plan = L.plans.get(u.id), dss = rep.day_stops.filter(d => d.unit === u.id); assert.equal(dss.length, plan.days.length, `${u.id}: every day entry is in the report`);
    for (const d of dss) {
      if (!d.applied) { assert.ok(d.why_not && d.why_not.length > 8, `${u.id} ${d.id}: not applied needs a reason`); continue; }
      applied++; assert.ok(d.arrive >= A.get(u.id).earliest - 1e-9, `${u.id}: ${d.id} reached before the gate`); assert.ok(d.depart >= enter.get(u.id) - 1e-9);
      if (!d.merged_into) assert.ok(d.arrive + 1e-6 >= d.depart + d.distance_m / SPEED.march / 60 - 0.02, `${u.id}: ${d.id} faster than the march rate`);
    }
    for (const o of rep.offsets.filter(x => x.unit === u.id)) { offs++; assert.equal(o.kind, 'ledger_vs_edge'); assert.ok(o.late_min >= 0 && o.distance_m > 0); assert.match(u.render.reason, /refers to a place [\d.]+ km farther on/, `${u.id}: the card says the ledger time refers to a place farther on`); }
    assert.equal(A.get(u.id).earliest, A4.get(u.id).earliest, `${u.id}: the gate is not moved`); assert.equal(A.get(u.id).default, A4.get(u.id).default);
    assert.ok(u.render.reason.includes(u.approach.road), `${u.id}: the card names its road`);
  }
  assert.ok(applied >= 20 && offs >= 20, `${applied} day stops applied, ${offs} offsets`); assert.equal(rep.defects.length, 0);
  for (const sc of SCENARIOS) { const b = L.both(sc), G = new Map(b.arrivals.map(a => [a.unit, a])); for (const e of b.events) if (newly.some(u => u.id === e.unit)) assert.ok(e.t >= G.get(e.unit).earliest - 1e-9, `${e.unit}: ${e.type} before its gate`); }
});
