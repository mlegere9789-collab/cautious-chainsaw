// Builds app/data/placement.json (version 2) from the clause table (tools/placement-clauses.mjs) and the ledger cells, and REFUSES to write anything that does not hold:
//   * every phrase must be literally in its ledger cell (exact text, no folding), and no two phrases of a cell may overlap;
//   * every text of a key-position, night-position, first-on-field and left-or-moved cell must be covered by a clause (only the date labels and punctuation between clauses may be left over);
//   * every place must resolve in the gazetteer (the clause carries the gazetteer's sigma_m), every unit must exist, every time must be printed (or be a labelled named-period convention).
//   node docs/battle-theatre/app/tools/build-placement.mjs          (writes data/placement.json; PLACEMENT_OUT=path writes elsewhere, used by the reproducibility test)
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { Gazetteer } from '../src/history/gazetteer.mjs';
import { Placement, PERIODS, CELLS } from '../src/history/placement.mjs';
import { CLAUSES } from './placement-clauses.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), BT = path.resolve(here, '../..');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
const arrivals = J('history/arrivals.json'), units = J('history/units.json').units, gazData = J('app/data/gazetteer.json'), gaz = new Gazetteer(gazData);
const rows = arrivals.rows, rowBy = new Map(rows.map(r => [r.id, r])), unitIds = new Set(units.map(u => u.id));
const iso = (d, hhmm) => `1863-${d}${hhmm ? 'T' + hhmm : ''}`;
const errors = [];
const err = m => errors.push(m);

// ---- position every clause in its cell, in cell order
const byCell = new Map();
for (const c of CLAUSES) {
  const row = rowBy.get(c.row); if (!row) { err(`unknown ledger row ${c.row}`); continue; }
  const text = String((row.raw || {})[c.cell] ?? ''), key = c.row + '|' + c.cell, used = byCell.get(key) || [];
  let idx = -1, from = 0; for (;;) { idx = text.indexOf(c.phrase, from); if (idx < 0) break; if (!used.some(u => idx < u.end && idx + c.phrase.length > u.start)) break; from = idx + 1; }
  if (idx < 0) { err(`${c.row}/${c.cell}: phrase not found (or overlaps another clause) in the printed cell: "${c.phrase}"`); continue; }
  c.start = idx; c.end = idx + c.phrase.length; used.push({ start: c.start, end: c.end }); byCell.set(key, used); c.rowIndex = rows.indexOf(row);
}
// ---- coverage: what is left of each non-empty cell when the clauses are taken out
for (const row of rows) for (const cell of CELLS) {
  const text = String(row.raw[cell] ?? ''); if (!text.trim()) continue; const used = (byCell.get(row.id + '|' + cell) || []).slice().sort((a, b) => a.start - b.start);
  let rest = '', pos = 0; for (const u of used) { rest += text.slice(pos, u.start) + ' '; pos = u.end; } rest += text.slice(pos);
  rest = rest.replace(/\b(Jun|Jul)\s+\d{1,2}(?:\s*-\s*(?:(?:Jun|Jul)\s+)?\d{1,2})?(?:\s+night)?\s*:?/g, ' ').replace(/[\s,.;:()\-–“”"']+/g, ' ').trim();
  if (rest) err(`${row.id}/${cell}: text not covered by any clause: "${rest}"`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// ---- order: ledger row order, cell order, position in the cell
const order = CLAUSES.slice().sort((a, b) => a.rowIndex - b.rowIndex || CELLS.indexOf(a.cell) - CELLS.indexOf(b.cell) || a.start - b.start);
const approach = [], positions = [], activities = [], departures = [], clauses = [];
const counters = { AP: 0, PO: 0, AC: 0, DP: 0 };
for (const c of CLAUSES) if (c.id) { const m = /^([A-Z]{2})-(\d+)$/.exec(c.id); if (m) counters[m[1]] = Math.max(counters[m[1]], +m[2]); }
const nextId = k => `${k}-${String(++counters[k]).padStart(2, '0')}`;
let n = 0;
const SOURCES = r => r.source_keys.all.slice();
const BASE = (c, row) => ({ row: c.row, cell: c.cell, phrase: c.phrase });
for (const c of order) {
  const row = rowBy.get(c.row), cid = 'CL-' + String(++n).padStart(3, '0'), us = c.units || [row.unit_id || row.id], approx = /\babout\b|\bapprox/i.test(c.phrase);
  const rec = { id: cid, ...BASE(c, row), units: us };
  for (const u of us) if (!unitIds.has(u)) err(`${cid}: unknown unit ${u}`);
  if (c.st === 'U') { clauses.push({ ...rec, status: 'unresolved', reason: c.reason, sources: SOURCES(row) }); continue; }
  const gz = c.place ? gaz.resolve(c.place) : null; if (c.place && !gz) { err(`${cid} (${c.row}/${c.cell} "${c.phrase}"): place "${c.place}" is not in the gazetteer`); continue; }
  const gzs = (c.places || []).map(p => { const g = gaz.resolve(p); if (!g) err(`${cid}: place "${p}" is not in the gazetteer`); return g ? { place: p, sigma_m: g.sigma_m } : null; }).filter(Boolean);
  // time: a printed clock, a named period (labelled convention), or a date only
  const tm = {}; if (c.d) {
    if (c.np) { tm.t = iso(c.d, PERIODS[c.np]); tm.period = c.np; tm.t_basis = 'convention'; } else if (c.t) { tm.t = iso(c.d, c.t); tm.t_basis = 'printed'; } else { tm.d = c.d; tm.t_basis = 'date_only'; }
    if (c.tt) tm.t_to = iso(c.d, c.tt); if (c.dep) tm.depart = iso(c.d, c.dep); if (c.t && c.np) { tm.t = iso(c.d, c.t); tm.t_basis = 'printed'; delete tm.period; }
    if (c.date_cell) tm.date_cell = c.date_cell; if (c.tc) tm.time_context = true; if (approx && tm.t_basis === 'printed') tm.approx = true;
  }
  const drives = [], base = { ...rec, status: 'transcribed', kind: c.kind, ...(gz ? { place: c.place, sigma_m: gz.sigma_m } : {}), ...(gzs.length ? { places: gzs } : {}), ...(c.pb ? { place_basis: c.pb } : {}), ...tm, tier: c.kind === 'activity' ? 'plausible-procedural' : (c.tier || 'inferred'), sources: SOURCES(row) };
  if (c.note) base.note = c.note;
  const actEntry = (a, stopId) => {
    const e = { id: nextId('AC'), units: a.units || us, ...BASE(c, row), activity: a.activity, ...(a.place ? { place: a.place } : {}), t: a.t ? iso(a.d || c.d, a.t) : a.np ? iso(a.d || c.d, PERIODS[a.np]) : tm.t, t_basis: a.np ? 'convention' : tm.t_basis === 'convention' ? 'convention' : 'printed', ...(a.np ? { period: a.np } : tm.period && !a.t ? { period: tm.period } : {}), ...(stopId ? { stop: stopId, at_arrival: true } : {}),
      ...(c.date_cell ? { date_cell: c.date_cell } : {}), ...(c.tc ? { time_context: true } : {}), tier: 'plausible-procedural', clause: cid, note: a.note || undefined };
    if (!e.note) delete e.note; if (a.t_to) e.t_to = iso(a.d || c.d, a.t_to);
    return e;
  };
  if (c.kind === 'approach') {
    const e = { id: c.id || nextId('AP'), unit: c.unit, ...BASE(c, row), road: c.road, inference: c.inf || null, tier: c.tier || 'inferred', note: c.note || '', clause: cid }; approach.push(e); drives.push(e.id);
    base.units = [c.unit]; base.road = c.road; if (!gaz.resolve(c.road) || !gaz.resolve(c.road).line) err(`${cid}: road ${c.road}`); base.sigma_m = gaz.resolve(c.road).sigma_m;
  } else if (c.kind === 'stop') {
    if (!tm.t) { err(`${cid}: a stop needs a time`); continue; }
    const e = { id: c.id || nextId('PO'), units: us, ...BASE(c, row), place: c.place, t: tm.t, ...(tm.t_to ? { t_to: tm.t_to } : {}), ...(tm.depart ? { depart: tm.depart } : {}), ...(c.via ? { via: c.via } : {}), mode: 'arrive', ...(c.cf ? { conflict: c.cf } : {}), requires_positioned: !!c.req, t_basis: tm.t_basis, ...(tm.period ? { period: tm.period } : {}), ...(tm.date_cell ? { date_cell: tm.date_cell } : {}), ...(tm.time_context ? { time_context: true } : {}), tier: c.tier || 'inferred', note: c.note || '', clause: cid };
    positions.push(e); drives.push(e.id);
    if (c.act) { const a = actEntry({ ...c.act, place: undefined }, e.id); activities.push(a); drives.push(a.id); base.activity = c.act.activity; }
    if (c.fm) base.formation = c.fm;
  } else if (c.kind === 'activity') {
    const list = c.acts || [{ units: c.units, activity: c.activity, t: c.t, t_to: c.tt, np: c.np, d: c.d }]; base.activity = list[0].activity;
    for (const a of list) { const t = a.t ? iso(a.d || c.d, a.t) : a.np ? iso(a.d || c.d, PERIODS[a.np]) : null; if (!t) continue; const e = actEntry({ ...a, place: c.place }); e.units = a.units || us; activities.push(e); drives.push(e.id); }
    if (!drives.length) base.not_driving = 'date only, no clock: an activity needs a time';
    if (c.place && gz) { base.place = c.place; base.sigma_m = gz.sigma_m; }
  } else if (c.kind === 'departure') {
    const e = { id: c.id || nextId('DP'), units: us, ...BASE(c, row), road: c.road, t: tm.t, t_basis: tm.t_basis, tier: c.tier || 'inferred', note: c.note || '', clause: cid }; departures.push(e); drives.push(e.id); base.road = c.road;
  } else if (c.kind === 'formation') { base.formation = c.formation; base.not_driving = c.not_driving || c.why; }
  else if (c.kind === 'record') { base.not_driving = c.why; }
  else err(`${cid}: kind ${c.kind}`);
  if (c.kind === 'stop' && c.fm) base.not_driving = 'the stop part drives; the formation part (deploys into line) is applied as a formation event (contract 1.3) to every DRAWN unit under the named formation; whether any is drawn is reported in HISTORY-LAYER-NOTES.md';
  if (drives.length) base.drives = drives; else if (!base.not_driving) base.not_driving = c.why || 'recorded';
  clauses.push(base);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const doc = {
  _doc: 'Curated reading of the PDF B.2.4 ledger cells (version 2). `clauses` lists EVERY key-position, night-position, first-on-field and left-or-moved clause of the 44 ledger rows (history/arrivals.json, raw cells): each is transcribed (a gazetteer place or road, a time as printed or a labelled named-period convention, units, tier, the row\'s source keys as printed) or unresolved with its reason. `approach`, `positions`, `activities` and `departures` are the entries that drive geometry and events; each names its clause. Every phrase is literally in its ledger cell (the loader refuses one that is not); no entry is a coordinate. A clause the record cannot place is left unresolved, never guessed.',
  version: 2,
  conventions: {
    named_periods: { ...PERIODS, note: 'Labelled conventions, not historical claims: PDF B.2.2 defines [NIGHT] as after the end of civil twilight (20:04) and [DUSK] as sunset 19:32 to 20:04 from the computed July 2 values (it prints sunset 19:32 for Jul 1 too). Applied to the date a clause prints; a night position is held from the start of the night.' },
    scope: 'A clause belongs to the unit of its ledger row and everything under it unless it names a narrower roster unit; a unit never takes a clause that falls before its own ledger gate (Q04); a nearer clause replaces a farther one within 90 minutes; a clause at the place a unit already stands changes nothing.',
    window: 'The start of a printed window is the time of the place; a movement window ("advance to", "retreat to", "sent to") departs at the start and arrives at the end; a clause with only a date is recorded and not scheduled.',
    activity_clips: 'The ledger names an activity in words; the clip is the renderer\'s: works/digging/wall-building = build_works, camp/bivouac = camp, rests = rest, halts = halt, steps off/marches/countermarch/advance = march, attack/assault/counterattack/charge = double_quick (foot) or gallop (mounted), guns open = serve_guns, hold/do not advance = stand. Plausible-procedural.',
  },
  approach, positions, departures, activities, clauses,
};
const OUT = process.env.PLACEMENT_OUT ? path.resolve(process.env.PLACEMENT_OUT) : path.join(BT, 'app/data/placement.json');
// refuse to write a document the loader would refuse
const problems = new Placement({ doc, gaz, units, rows, box: { lng0: -77.272, lng1: -77.2, lat0: 39.783, lat1: 39.838 } }).validate();
if (problems.length) { console.error('the loader would refuse this document:\n' + problems.join('\n')); process.exit(1); }
fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n');
const st = clauses.reduce((a, c) => { const k = c.status + (c.status === 'transcribed' ? '/' + c.kind : ''); a[k] = (a[k] || 0) + 1; return a; }, {});
console.log(`placement.json: ${clauses.length} clauses`, JSON.stringify(st), `| ${approach.length} approaches, ${positions.length} stops, ${activities.length} activities, ${departures.length} departures ->`, OUT);
