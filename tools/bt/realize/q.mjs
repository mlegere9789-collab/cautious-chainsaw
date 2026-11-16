#!/usr/bin/env node
// The author's window into the product: what the Battle Theatre shows at any minute, and what a timeline row says. Read-only. See README.md.
//
//   node tools/bt/realize/q.mjs row T1-004                 the row: printed cells, the time it allows, places and units its words name, what the product shows for them, its register links and record
//   node tools/bt/realize/q.mjs suggest T1-097             for the units and places the row names: when every drawn leaf is on the field, within the tolerance of each place, marching (a search aid, not a record)
//   node tools/bt/realize/q.mjs rows tl-01                 one line per row of a shard with its result (from RESULTS.json) or "no record"
//   node tools/bt/realize/q.mjs unit "Early" [time]        find units by name, designator or id; with a time, where each is and what it does
//   node tools/bt/realize/q.mjs unit cs-2c-early-gordon-13ga timeline      the unit's arrival, presence and activity legs with positions
//   node tools/bt/realize/q.mjs at 1863-07-01T10:00 [--near "McPherson Ridge"] [--radius 1500] [--side union|confederate]     the units on the field
//   node tools/bt/realize/q.mjs near "Cemetery Hill" 1863-07-02T09:00 [radius]       units within the radius of a place at a time
//   node tools/bt/realize/q.mjs place "Cemetery Hill"      resolve a place name: kind, centre, tolerance, on the loaded ground or not
//   node tools/bt/realize/q.mjs structs Weikert            the ids of the structures a name finds: records, drawn objects, schedule rows (S-nnn) and hospitals (H-nn)
//   node tools/bt/realize/q.mjs struct bld-rock-creek-rr-bridge 1863-06-26T12:00     a structure: its objects, state, schedule rows and what is drawn
//   node tools/bt/realize/q.mjs works [words]                                        the earthworks and gun positions (E-nn) of the works lists, by name
//   node tools/bt/realize/q.mjs work E-05 1863-07-02T09:00                           a work: stage, crew, draw-list status
//   node tools/bt/realize/q.mjs guns <battery-id> 1863-07-02T09:00                   guns, limbers and caissons shown
//   node tools/bt/realize/q.mjs weather 1863-06-26T12:00 | sky <time>               the drawn weather and the sun and moon
//   node tools/bt/realize/q.mjs cas 1863-07-01T14:00 1863-07-01T16:00 [unit]         casualty events in a window
//   node tools/bt/realize/q.mjs veg [words]                                          the plots of the vegetation layer (V-nnnn, lc name, class, crop) a name finds; the layer's own conflicts (CF-VEG-*) and their values
//   node tools/bt/realize/q.mjs veg V-0001 1863-07-02T08:00 [--scenario CF-VEG-RAIN:pdf_flattened]    the state of a plot: crop, stage, drawn height range (m), cut, trampled, lodged, leaf, stripped, fruit, events in force, tier
//   node tools/bt/realize/q.mjs cards 1863-07-01T12:00 | epilogue <time>             the event cards / epilogue content the product shows
//   node tools/bt/realize/q.mjs gazetteer [--write]        every place the timeline names: resolved (with tolerance), ambiguous, off the ground, unknown; --write saves GOVERNANCE/realizations/gazetteer.json
//   node tools/bt/realize/q.mjs scenario                   the conflicts and the choices of the opening scenario
//   node tools/bt/realize/q.mjs group T1-097 [--units id,id] [--structures id,id] [--plots LC-FIELD-0001,V-0639] [--where cls=woods] [--weather | --from T --to T]    the scenario group of a row (GATE-SPEC TL-8, 6.4 V6): every value of the conflicts its words name, that reach its units and that the weather of its minutes lists; a record runs each ("scenario": "group") or excludes it with a reason
// A time is 1863-MM-DDTHH:MM (local mean time). Add --scenario pdf for the plan's values instead of the delegated defaults.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { REAL, GOV, readJSON, readJSONL, exists, toMin, isoOf, round, hasQuote, fold, sha256File, ROOT, rel, angDiff, COMPASS16, tokens } from './lib.mjs';
import { loadTimeline, describeWindow } from './timeline.mjs';
import { openProduct } from './query.mjs';
import { candidatePhrases, norm, expand } from './gazetteer.mjs';
import { occurrencesOf, classifyNames, buildLexicon } from './names.mjs';
import { registerCoverage, epilogueRows } from './check.mjs';
import { VEG_STOP } from './checks.mjs';
import { suggest, printSuggestion } from './suggest.mjs';

const argv = process.argv.slice(2), cmd = argv[0], flag = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const pos = argv.filter((a, i) => i > 0 && !a.startsWith('--') && !['--near', '--radius', '--side', '--scenario', '--units', '--structures', '--from', '--to', '--plots', '--where'].includes(argv[i - 1]));
const scen = flag('--scenario') || 'default', J = o => console.log(JSON.stringify(o, null, 1));
const T = s => (/^\d+(\.\d+)?$/.test(String(s)) ? +s : toMin(s));
const line = (...a) => console.log(...a);

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); return; }
  if (cmd === 'rows') return rowsCmd(pos[0]);
  const P = await openProduct(), S = P.scene(scen);
  if (cmd === 'row') return rowCmd(P, S, pos[0]);
  if (cmd === 'group') return groupCmd(P, pos[0]);
  if (cmd === 'suggest') { const TL = loadTimeline(), EP = epilogueRows(TL), row = TL.byId.get(pos[0]) || EP.find(r => r.id === pos[0]); if (!row) return line(`no row ${pos[0]}`); return printSuggestion(suggest(P, S, row, { step: +(flag('--step') || 1) }), line); }
  if (cmd === 'unit') {
    const q = pos[0]; const direct = P.unit(q);
    if (direct && pos[1] === 'timeline') return J(S.timeline(q, { max: 80 }));
    const cand = direct ? [{ id: q, name: direct.name, level: direct.level, why: 'id' }] : P.unitsNamedIn(q);
    if (!cand.length) { const lc = fold(q); const f = P.layer.units.filter(u => fold(u.id + ' ' + u.name).includes(lc)).slice(0, 25).map(u => ({ id: u.id, name: u.name, level: u.level, why: 'text' })); cand.push(...f); }
    for (const c of cand.slice(0, 30)) {
      const u = P.unit(c.id), ls = P.leaves(c.id), drawn = ls.filter(l => P.unit(l).drawn).length; let st = '';
      if (pos[1]) { const s = S.unitAt(c.id, T(pos[1])); st = s.present ? `  PRESENT at ${s.lng},${s.lat} ${s.activity} ${s.speed_ms} m/s` : (ls.length > 1 ? `  (${ls.filter(l => S.unitAt(l, T(pos[1])).present).length}/${ls.length} leaves on the field)` : `  not on the field: ${s.why}${s.arrival ? ' (arrives ' + s.arrival + ')' : ''}`); }
      line(`${c.id}  ${u.name}  [${u.level}, ${u.side}, ${u.status}/${u.render && u.render.status}]  leaves on field ${ls.length}, drawn ${drawn}  (${c.why})${st}`);
    }
    return;
  }
  if (cmd === 'at') {
    const t = T(pos[0]), near = flag('--near'); let pt = null, rad = +(flag('--radius') || 1500);
    if (near) { const r = P.places.resolve(near); if (!r.place) return line(`place "${near}": ${r.status}`); pt = r.place.center; }
    const list = S.present(t, { near: pt, radiusM: rad, side: flag('--side') || null }); line(`${list.length} unit(s) on the field at ${isoOf(t)}${near ? ' within ' + rad + ' m of ' + near : ''}`);
    for (const s of list.slice(0, +(flag('--limit') || 80))) line(`  ${s.id.padEnd(34)} ${String(s.name).slice(0, 30).padEnd(30)} ${s.activity.padEnd(12)} ${s.lng},${s.lat}${s.d_m != null ? '  ' + s.d_m + ' m' : ''}`);
    return;
  }
  if (cmd === 'near') { const r = P.places.resolve(pos[0]); if (!r.place) return line(`place "${pos[0]}": ${r.status} ${r.candidates || ''}`); const t = T(pos[1]), rad = +(pos[2] || r.place.tolerance_m * 2); const list = S.present(t, { near: r.place.center, radiusM: rad }); line(`${list.length} unit(s) within ${rad} m of ${r.place.name} at ${isoOf(t)} (tolerance of the place ${r.place.tolerance_m} m)`); for (const s of list.slice(0, 60)) line(`  ${s.id.padEnd(34)} ${s.activity.padEnd(12)} ${s.d_m} m`); return; }
  if (cmd === 'place') { const r = P.places.resolve(pos.join(' ')); if (r.place) return J({ status: r.status, ...r.place, lines: r.place.lines ? `${r.place.lines.length} line(s)` : null }); line(`"${pos.join(' ')}": ${r.status}${r.candidates ? ' ' + r.candidates.join('; ') : ''}`); const near = P.places.list.filter(p => fold(p.name + ' ' + p.aliases.join(' ')).includes(fold(pos.join(' ')).split(' ')[0])).slice(0, 10); if (near.length) line('similar: ' + near.map(p => p.id + ' ' + p.name).join('; ')); return; }
  if (cmd === 'structs') {              // find the ids of a structure by the words of its name: the structure records, the drawn objects, the schedule rows and the hospitals that carry them
    const St = await P.structures(scen), want = tokens(pos.join(' ')).filter(w => w.length >= 3); if (!want.length) { console.error('give some words of the name: q.mjs structs Weikert'); process.exitCode = 2; return; }
    const has = h => { const t = new Set(tokens(String(h ?? ''))); return want.every(w => t.has(w)); }, hits = { records: [], objects: [], schedule: [], hospitals: [] };
    for (const r of St.inputs.structures.structures) if (has(`${r.id} ${r.name || ''} ${r.location || ''}`)) hits.records.push(r);
    for (const o of St.model.objects) if (has(`${o.id} ${o.name || ''}`)) hits.objects.push(o);
    for (const r of St.inputs.sched.rows) if (has(`${r.id} ${r.object_printed || ''}`)) hits.schedule.push(r);
    for (const h of St.inputs.hospitals.hospitals) if (has(`${h.id} ${h.hospital || ''} ${h.location || ''}`)) hits.hospitals.push(h);
    line(`structures named by "${pos.join(' ')}" (use the id of a record or a schedule row as "structure" in a structure_state check, a hospital id in its "hospital"; ${hits.records.length} records, ${hits.objects.length} drawn objects, ${hits.schedule.length} schedule rows, ${hits.hospitals.length} hospitals):`);
    for (const r of hits.records) line(`  RECORD   ${String(r.id).padEnd(34)} ${String(r.name).slice(0, 40).padEnd(40)} ${r.tier || ''} ${r.location ? '(' + String(r.location).slice(0, 50) + ')' : ''}`);
    for (const o of hits.objects.slice(0, +(flag('--limit') || 20))) line(`  OBJECT   ${String(o.id).padEnd(34)} ${String(o.name).slice(0, 40).padEnd(40)} [${o.cls}] state_id=${o.state_id} rec=${o.rec}`);
    for (const r of hits.schedule) line(`  SCHEDULE ${String(r.id).padEnd(34)} ${String(r.object_printed).slice(0, 40).padEnd(40)} ${r.from_state} -> ${r.to_state} (${r.time && r.time.printed}) ids ${(r.object_ids || []).join(',')}`);
    for (const h of hits.hospitals) line(`  HOSPITAL ${String(h.id).padEnd(34)} ${String(h.hospital).slice(0, 40).padEnd(40)} ${h.corps_or_side || ''} structures ${(h.structure_ids || []).join(',')}`);
    if (hits.records.length + hits.objects.length + hits.schedule.length + hits.hospitals.length === 0) line('  (nothing: the product carries no structure by these words)');
    return;
  }
  if (cmd === 'struct') {
    const St = await P.structures(scen), id = pos[0], objs = St.byState.get(id) || [];
    if (!objs.length) { const nd = (St.inputs.data.notDrawn || []).find(x => x.id === id); line(`${id}: nothing drawn${nd ? ' (' + nd.reason + ')' : ''}; state engine knows it: ${St.engine.knows(id)}`); const hits = St.model.objects.filter(o => fold(o.name || '').includes(fold(id))).slice(0, 12); for (const o of hits) line(`  object ${o.id} state_id=${o.state_id} ${o.cls} ${o.name}`); return; }
    const t = pos[1] ? T(pos[1]) : null;
    for (const o of objs) { line(`object ${o.id} [${o.cls}] state_id=${o.state_id} rec=${o.rec} "${o.name}" tier ${o.tier}`); if (t != null) { const d = St.model.describe(o.oid, t, {}); line(`  at ${isoOf(t)}: ${d.state && d.state.state} (present ${d.state && d.state.present}, ${d.state && d.state.status}) rows ${(d.rows || []).join(',')} visual A=${JSON.stringify(d.visual && d.visual.A)} B=${JSON.stringify(d.visual && d.visual.B)} mix=${d.visual && d.visual.mix}; hospitals ${(d.hospitals || []).map(h => h.id + ':' + h.phase).join(',') || '-'}`); } }
    return;
  }
  if (cmd === 'works') {                // the earthworks and gun positions of the works lists (E-nn): name, kind, place, and whether the product draws them
    const St = await P.structures(scen), w = await new (await import('./checks.mjs')).Runner(P, loadTimeline())._prepWs6(S); if (!w || w.error) { console.error('the works lists are not built: ' + (w && w.error)); process.exitCode = 2; return; }
    const want = tokens(pos.join(' ')).filter(x => x.length >= 3), cov = new Map(w.works.coverage.map(c => [c.id, c])); let n = 0;
    for (const [id, x] of w.works.byId) { const t = new Set(tokens(`${id} ${x.name || ''} ${x.kind || ''} ${(x.place && (x.place.name || x.place)) || ''}`)); if (!want.every(k => t.has(k))) continue; const c = cov.get(id) || {}; n++; line(`  ${String(id).padEnd(7)} ${String(x.name).slice(0, 62).padEnd(62)} ${String(x.kind).padEnd(16)} at ${String((x.place && (x.place.name || x.place)) || '?').slice(0, 30).padEnd(30)} ${c.decision || '?'}${c.decision && c.decision !== 'drawn' ? ': ' + String(c.reason).slice(0, 80) : ''}`); }
    line(`${n} work(s)${want.length ? ' named by "' + pos.join(' ') + '"' : ''}: the id goes in "work" of a work_stage check (q.mjs work <id> <time> shows its stage)`); return;
  }
  if (cmd === 'work') { const St = await P.structures(scen), id = pos[0], t = T(pos[1]); const ms = Date.UTC(1863, 5, 1) + Math.round(t * 60000); line(JSON.stringify(St.engine.stateAt(id, ms, 'default', 0))); const d = await S.drawLists(t); if (d.works) { line('draw list: ' + JSON.stringify((d.works.status || []).find(w => w.id === id) || 'not in the works lists')); } return; }
  if (cmd === 'guns') { const id = pos[0], t = T(pos[1]); const i = P.index.get(id); const w = P.world.units[i]; line(JSON.stringify(S.unitAt(id, t))); const d = await S.drawLists(t); if (d.artillery) { const n = k => { const a = d.artillery[k], c = a.length / d.artillery.stride; let m = 0; for (let j = 0; j < c; j++) if (a[j * d.artillery.stride + 4] === i) m++; return m; }; line(`stated guns drawn by the stage: ${w.guns || 0}; train lists for this battery: guns ${n('guns')} limbers ${n('limbers')} caissons ${n('caissons')} wagons ${n('wagons')} horses ${n('horses')} drivers ${n('drivers')}`); } return; }
  if (cmd === 'weather' || cmd === 'sky') { const W = await P.weatherAt(T(pos[0]), scen), d = W.drawn; if (cmd === 'sky') return J({ at: W.iso, sun: { alt: round(W.sun.sunAlt, 3), az: round(W.sun.sunAz, 2), band: W.sun.band }, moon: { alt: round(d.sky.moonAlt, 3), az: round(d.sky.moonAz, 2), up: d.sky.moonUp, illum: round(d.sky.moonIllum, 1) }, exposure: round(d.sky.exposure, 3), night_floor: d.sky.nightFloor, source: d.sky.src, note: 'an angle a row prints is matched to half a unit of its last printed digit, at least 0.05 degrees (sun_alt, sun_az, moon_alt, moon_az)' }); return J({ at: W.iso, record_exists: d.record, precip: d.precip, cloud: { cover: round(d.cloud.cover, 2), known: d.cloud.known }, wetness: d.wetness, fog: { visibility_m: round(d.fog.visibilityM, 0) }, wind: { mph: d.wind.mph, text: d.wind.text, from_deg: round(d.wind.fromDeg, 2), from_point: Number.isFinite(d.wind.fromDeg) ? Object.entries(COMPASS16).sort((p, q) => angDiff(d.wind.fromDeg, p[1]) - angDiff(d.wind.fromDeg, q[1]))[0][0] : null, direction_recorded: d.wind.directionRecorded === true }, temp: d.temp, record: { tempF: round(W.record.tempF, 1), sky: W.record.sky, precip: W.record.precip, flags: W.record.flags }, sun_alt: round(W.sun.sunAlt, 1), moon_alt: round(W.sun.moonAlt, 1) }); }
  if (cmd === 'cas') { if (pos[2] && !P.unit(pos[2])) return line(`no unit ${pos[2]} (q.mjs unit "<words>" finds ids)`); const r = S.casualtiesOf(pos[2] || null, T(pos[0]), T(pos[1])); J({ ...r, units: `${r.units.length} unit(s)`, unit_sample: r.units.slice(0, 8), note: pos[2] ? `${pos[2]}: the sum over its ${r.leaves} leaf unit(s) on the field (a formation id is expanded as the casualty check expands it)` : 'every unit' }); return; }
  if (cmd === 'veg') {                  // the vegetation layer: plots by name, the state of one plot at a minute, the layer's conflicts
    const V = P.veg; if (!V.available) return line(`no vegetation layer to ask: ${V.reason}`);
    const first = pos[0], plot = first && V.resolve(first);
    if (plot && pos[1]) { const st = V.stateAt(plot, T(pos[1]), P.scenarioSpec(scen).choices), { claims, ...rest } = st; return J({ ...rest, claims: claims.length, choices_asked: P.vegChoices(P.scenarioSpec(scen).choices) }); }
    if (!first) { line(`conflicts of the layer (a scenario names one value: "CF-VEG-RAIN:pdf_flattened"; the first value is the default of the layer):`); for (const id of V.ids) line(`  ${id}  default ${V.defaultOf(id)}  values ${Object.keys(V.scenarios[id].options).join(', ')}`); line(`${V.units.length} plots; classes ${[...new Set(V.units.map(u => u.cls))].join(', ')}; crops ${V.crops().join(', ')}`); return; }
    const words = tokens(pos.join(' ')), named = new Map((V.meta.named || []).map(n => [n.unit, n.name]));
    const hits = V.units.filter(u => { const t = new Set(tokens([u.id, u.lc, u.name, named.get(u.id) || ''].join(' '))); return words.every(w => t.has(w)) || plot === u; }).slice(0, 40);
    for (const u of hits) line(`${u.id}  ${u.lc}  [${u.cls}${u.crop ? ', ' + u.crop : ''}${u.area_ac != null ? ', ' + u.area_ac + ' ac' : ''}]  ${u.name}${named.has(u.id) ? '  (named in the layer: ' + named.get(u.id) + ')' : ''}`);
    if (!hits.length) line(`no plot of the layer is named by "${pos.join(' ')}"`); return;
  }
  if (cmd === 'cards' || cmd === 'epilogue') { J(cmd === 'cards' ? await P.cardsAt(T(pos[0])) : await P.epilogueAt(T(pos[0]))); return; }
  if (cmd === 'gazetteer') return gazetteerCmd(P);
  if (cmd === 'scenario') { const sc = P.scenarioSpec(scen); line(`${sc.id}: ${Object.keys(sc.choices).length} choices`); J(sc.choices); return; }
  console.error('unknown command ' + cmd + '; try: node tools/bt/realize/q.mjs help'); process.exit(2);
}

// the names a row prints that the gazetteer does not carry, with the evidence that they are places (names.mjs; every capitalised name of the printed cells and the claim fields of the corrected claim)
function unknownNames(P, row, lex) {
  const { names } = classifyNames(occurrencesOf(row, lex, P.places), lex, P.places); return names;
}
function rowsCmd(shard) {
  const TL = loadTimeline(), res = exists(path.join(REAL, 'RESULTS.json')) ? readJSON(path.join(REAL, 'RESULTS.json')) : { rows: {} }, reg = registerCoverage();
  for (const r of TL.rows.filter(r => !shard || r.shard === shard)) { const e0 = res.rows[r.id], e = e0 && e0.record ? e0 : null; line(`${r.id} [${r.tier.padEnd(20)}] ${e ? (e.realized ? 'REALIZED ' + e.kind : e.kind === 'not_realized' ? 'not realized (recorded)' : 'record, not realized') : 'no record'}${(reg.get(r.id) || { open: [] }).open.length ? ' +register' : ''}  ${r.time_cell.slice(0, 28).padEnd(28)} ${r.what_text.slice(0, 70)}`); }
}

async function rowCmd(P, S, id) {
  const TL = loadTimeline(), EP = epilogueRows(TL), row = TL.byId.get(id) || EP.find(r => r.id === id); if (!row) return line(`no timeline row ${id}`);
  const reg = registerCoverage().get(id) || { open: [], all: [] };
  line(`${row.id}  tier ${row.tier} (seed ${row.tier_seed})  status ${row.status_effective}${row.verdict ? ' / ' + row.verdict : ''}  shard ${row.shard}  page ${row.page}`);
  line(`TIME CELL   ${row.time_cell}`);
  line(`ALLOWED     ${describeWindow(row.window)}   [${row.window.kind}] ${row.window.flags.join(',')}`); for (const b of row.window.basis) line(`            - ${b}`);
  { const tol0 = JSON.parse(JSON.stringify(TL.tolerances)); tol0.time.clock_tolerance_min = 0; const TL0 = loadTimeline({ tolerances: tol0 }), r0 = TL0.byId.get(id) || epilogueRows(TL0).find(r => r.id === id);
    if (r0) line(`EXACT       ${describeWindow(r0.window)}   (no clock margin, GATE-SPEC 6.4 V4: a record whose window lies outside it has clock_tolerance_used and counts only with an open register entry)`); }
  line(`WHAT        ${row.what_text}`);
  line(`NOTES       ${row.notes_text}`);
  if (row.correction) line(`CORRECTION  ${row.correction.verdict || ''} ${String(row.correction.text || '').slice(0, 600)}`);
  line(`REGISTER    open entries linked to the row: ${reg.open.join(', ') || 'none'}${reg.all.length > reg.open.length ? ' (closed: ' + reg.all.filter(x => !reg.open.includes(x)).join(', ') + ')' : ''}`);
  const text = row.claim_text, hits = P.places.findIn(text);
  line('PLACES NAMED IN THE ROW:'); if (!hits.length) line('  (none found in the gazetteer)');
  const seenP = new Set(); for (const h of hits) { const p = h.place; if (seenP.has(p.id)) continue; seenP.add(p.id); line(`  ${p.id.padEnd(22)} ${p.name} [${p.kind}, ${p.shape}] centre ${p.center.lng},${p.center.lat} tolerance ${p.tolerance_m} m${p.on_ground ? '' : '  OFF THE LOADED GROUND'}`); }
  const lex = buildLexicon(P, [...TL.rows, ...EP]), unk = unknownNames(P, row, lex).filter(n => n.class === 'unknown'), unc = unknownNames(P, row, lex).filter(n => n.class === 'unclassified');
  if (unk.length) line(`  names with evidence of being a place that the gazetteer does not carry (unknown, never guessed): ${unk.map(u => `${u.name} [${u.strength}: ${u.evidence.slice(0, 2).join('; ')}]${u.contains_known_place ? ' (contains ' + u.contains_known_place + ')' : ''}`).join(' | ')}`);
  if (unc.length) line(`  other capitalised names with no evidence either way: ${unc.slice(0, 12).map(u => u.name).join('; ')}${unc.length > 12 ? ' ...' : ''}`);
  line('UNITS NAMED IN THE ROW:'); const named = P.unitsNamedIn(text); if (!named.length) line('  (none matched; try q.mjs unit "<words>")');
  const mid = row.window.intervals.length ? (row.window.intervals[0][0] + row.window.intervals[0][1]) / 2 : null;
  for (const n of named.slice(0, 14)) {
    const ls = P.leaves(n.id), drawn = ls.filter(l => P.unit(l).drawn); const arr = drawn.map(l => (S.stage.presence[l] || {}).from).filter(Number.isFinite).map(x => x / 60);
    const pres = row.window.intervals.length ? ls.filter(l => { for (const [a, b] of row.window.intervals) { for (let t = Math.ceil(a); t <= Math.min(b, a + 1500); t += 15) if (S.unitAt(l, t).present) return true; } return false; }).length : 0;
    line(`  ${n.id.padEnd(34)} ${String(n.name).slice(0, 36).padEnd(36)} ${n.level.padEnd(10)} (${n.why}) leaves ${ls.length}, drawn ${drawn.length}${arr.length ? ', first arrival ' + isoOf(Math.min(...arr)) : ''}; on the field somewhere in the allowed window: ${pres}`);
  }
  // the vegetation layer: what it says it covers for this row (meta.rows), and the plots its table of names (meta.named) finds in the row's words
  { const V = P.veg; if (V.available) {
    const r = (V.meta.rows || {})[id], rtk = new Set(tokens(text)), named = (V.meta.named || []).filter(n => { const w = tokens(n.name).filter(x => x.length >= 4 && rtk.has(x) && !VEG_STOP.has(x)); return w.length >= 1; }).map(n => `${n.unit} ${(V.units.find(u => u.id === n.unit) || {}).lc} (${n.name})`);
    if (r || named.length) { line('VEGETATION LAYER (README section 4a; q.mjs veg <plot> <time>):'); if (r) { line(`  the layer lists this row: ${r.what}`); line(`  covers: ${r.covers}`); line(`  not covered: ${r.not_covered}`); } if (named.length) line(`  plots of the layer whose names share a word with the row: ${named.slice(0, 6).join('; ')}`); }
  } }
  const rec = exists(path.join(REAL, 'RESULTS.json')) ? readJSON(path.join(REAL, 'RESULTS.json')) : null, e = rec && (rec.rows[id] || (rec.epilogue || {})[id]);
  line(`RESULT      ${e ? `${e.realized ? 'REALIZED' : 'not realized'} [${e.kind}] ${e.why}   (${e.record})` : 'no record yet'}`);
}

// the scenario group of a row: the scenarios a record has to run ("scenario": "group") or exclude with a reason; units default to the ones the row's words name
async function groupCmd(P, id) {
  const TL = loadTimeline(), EP = epilogueRows(TL), row = TL.byId.get(id) || EP.find(r => r.id === id); if (!row) return line(`no row ${id}`);
  const units = flag('--units') ? String(flag('--units')).split(',') : P.unitsNamedIn(row.claim_text).map(n => n.id), structures = flag('--structures') ? String(flag('--structures')).split(',') : [];
  const iv = row.window.intervals, span = flag('--from') ? { from: T(flag('--from')), to: T(flag('--to') || flag('--from')) } : flag('--weather') && iv.length ? { from: iv[0][0], to: iv[iv.length - 1][1] } : null;
  // the plots of the vegetation layer (--plots V-0001,LC-FIELD-0001; --where cls=woods | crop=oats, one selector per use of the flag, key=value pairs separated by commas) look at the minutes of --from/--to (or the row's window)
  const plots = flag('--plots') ? String(flag('--plots')).split(',') : [], where = argv.flatMap((a, i) => (a === '--where' && argv[i + 1] ? [Object.fromEntries(argv[i + 1].split(',').map(kv => kv.split('=')))] : []));
  const vspan = span || (iv.length ? { from: iv[0][0], to: iv[iv.length - 1][1] } : null);
  const g = await P.scenarioGroup({ text: `${row.text_raw || ''} ${row.claim_text || ''}`, units, structures, span, vegetation: plots.length || where.length ? { plots, where, span: vspan } : null });
  line(`${id}: ${g.ids.length} scenario(s) in the group; units ${units.join(', ') || 'none'}; structures ${structures.join(', ') || 'none'}; weather span ${span ? isoOf(span.from) + '..' + isoOf(span.to) : 'none'}${plots.length || where.length ? `; vegetation ${[...plots, ...where.map(w => JSON.stringify(w))].join(', ')} over ${vspan ? isoOf(vspan.from) + '..' + isoOf(vspan.to) : 'no span'}` : ''}`);
  for (const c of g.conflicts) line(`  ${c.id.padEnd(22)} ${[c.named ? 'named in the row' : null, c.weather ? 'in the weather of the span' : null, ...c.units.map(u => `reaches ${u.unit} (${u.via.join('+')})`), c.vegetation ? `changes the vegetation (${c.vegetation.options.join(', ')}; ${c.vegetation.example})` : null].filter(Boolean).join('; ')}`);
  for (const [sid, rs] of Object.entries(g.readings)) line(`  structure ${sid}: readings ${rs.join(', ')}`);
  line(`  scenarios: ${g.ids.join('  ')}`); line('  a record says "scenario": "group" to run them all, or lists some and excludes the rest with "scenario_excludes": [{ "scenario": "<id>", "why": "<the row\'s sources that contradict it>" }]');
}

function gazetteerCmd(P) {
  const TL = loadTimeline(), EP = epilogueRows(TL), rows = [...TL.rows, ...EP], places = new Map(), ambiguous = new Map(), lex = buildLexicon(P, rows);
  for (const r of rows) {
    for (const h of P.places.findIn(r.claim_text)) { const k = h.place.id; (places.get(k) || places.set(k, { place: h.place, rows: [] }).get(k)).rows.push(r.id); }
    for (const c of candidatePhrases(r.what_text)) { const res = P.places.resolve(c); if (res.status === 'ambiguous') (ambiguous.get(c) || ambiguous.set(c, { candidates: res.candidates, rows: [] }).get(c)).rows.push(r.id); }
  }
  const cls = classifyNames(rows.flatMap(r => occurrencesOf(r, lex, P.places)), lex, P.places);
  for (const n of cls.names.filter(n => n.class === 'ambiguous')) ambiguous.set(n.name, { candidates: [], rows: n.rows });
  const unknown = cls.names.filter(n => n.class === 'unknown'), unclassified = cls.names.filter(n => n.class === 'unclassified');
  const OLD_ARTEFACTS = ['Behind Seminary Ridge', 'Behind Cemetery Hill', 'Behind McPherson Ridge', 'West of McPherson Ridge', 'Base of Culp’s Hill', 'Near Black Horse Tavern', 'Reach Herr Ridge', 'Southwest of Big Round Top', 'Plum Run Landscape Big Round Top', 'Williamsport Potomac River', 'XII Corps Camp', 'Stevens Knoll Hill', 'Fairfield Road Hill', 'Thaddeus Stevens’ Caledonia Furnace', 'Ward Hill', 'Lutheran Seminary'];
  const doc = {
    _doc: 'The places the timeline rows name, resolved against the repository\'s own files (app/data/gazetteer.json and the base-map layers), with the distance tolerance a check may use. Unknown places are listed, never guessed; an ambiguous name is never resolved by choosing one. Built by tools/bt/realize/q.mjs gazetteer --write; tolerances by kind: tolerances.json distance. HOW THE UNKNOWN NAMES ARE FOUND (names.mjs): every capitalised name of the printed cells, of the claim fields of the corrected claim and of the notes cells is classified once over all its occurrences: resolved, ambiguous, excluded (months, tier words, state names, unit words), person_or_unit (a commander or unit of the order of battle, or a name introduced by a title, initials or a possessive before a unit noun), unknown (it has evidence of being a place and no repository file carries it) or unclassified (no evidence either way: listed so that nothing capitalised disappears; NOT claimed to be a place). The evidence is stated per name: structural (a geographic word, a town ending, a state code), cue (at, near, in, toward ... before it; the place field of a corrected claim), weak (to/from, the first printed cell, a list). A town has no geographic word, which is why the first report (a pattern of geographic words only) missed Taneytown, Williamsport, Falling Waters, Hagerstown, Hanover, Westminster and Greenwood. A name with only cue evidence can be a person, a newspaper or a source (Hooker, Compiler, Butterfield): it is listed with its evidence, not claimed to be a place; strength says how firm the evidence is.',
    tolerance_by_kind_m: P.tolerances.distance.floor_m_by_kind, line_extra_m: P.tolerances.distance.line_extra_m, tolerance_rule: 'point/area/footprint: distance from the unit centre to the centre of the place must be <= sigma_m of the entry (at least the floor of its kind); line (road, lane, stream, railway): distance to the nearest point of the mapped line <= positional error + line_extra_m',
    sources: P.places.sources, ground_box: P.places.box,
    counts: { places_in_gazetteer: P.places.list.length, named_in_rows: places.size, unknown_names: unknown.length, unknown_by_strength: Object.fromEntries(['structural', 'cue', 'weak'].map(k => [k, unknown.filter(n => n.strength === k).length])), unclassified_names: unclassified.length, person_or_unit_names: cls.counts.person_or_unit, excluded_names: cls.counts.excluded, names_only_in_notes_without_evidence_not_listed: cls.counts.notes_without_evidence, ambiguous_names: ambiguous.size, rows_naming_a_known_place: new Set([...places.values()].flatMap(x => x.rows)).size, rows: rows.length },
    places: [...places.values()].sort((a, b) => b.rows.length - a.rows.length || (a.place.id < b.place.id ? -1 : 1)).map(({ place: p, rows }) => ({ id: p.id, name: p.name, aliases: p.aliases, kind: p.kind, shape: p.shape, center: p.center, tolerance_m: p.tolerance_m, on_ground: p.on_ground, source: p.source, ref: p.ref, tier: p.tier, rows })),
    unknown: unknown.map(n => ({ name: n.name, strength: n.strength, evidence: n.evidence, rows: n.rows, rows_in_claim: n.rows_in_claim, rows_in_notes_only: n.rows_in_notes_only, contains_known_place: n.contains_known_place || null, status: 'unknown: no repository file carries this name; not guessed' })),
    unclassified: unclassified.map(n => ({ name: n.name, rows: n.rows, rows_in_claim: n.rows_in_claim, contains_known_place: n.contains_known_place || null, ...(n.bare_surname_of_a_known_place ? { note: 'a bare surname that is a word of a known place: a person, or the farm named after them' } : {}), status: 'capitalised name with no evidence of being a place or not; listed, not claimed to be a place, never given coordinates' })),
    first_report_names_not_carried_over: { _doc: 'names of the first report (a pattern of geographic words) that are not names: the pattern joined a preposition, a unit word or a person\'s given name to a place name, or (Lutheran Seminary) names a place the gazetteer carries as Seminary', names: OLD_ARTEFACTS },
    ambiguous: [...ambiguous.entries()].map(([name, v]) => ({ name, candidates: v.candidates, rows: v.rows })),
    ambiguous_in_gazetteer: [...P.places.ambiguous.entries()].map(([k, s]) => ({ key: k, ids: [...s].map(p => p.id) })),
    superseded: P.places.superseded, skipped_duplicates: P.places.skipped.length,
  };
  if (flag('--write')) { fs.mkdirSync(REAL, { recursive: true }); fs.writeFileSync(path.join(REAL, 'gazetteer.json'), JSON.stringify(doc, null, 1) + '\n'); line(`wrote ${rel(path.join(REAL, 'gazetteer.json'))}`); }
  line(JSON.stringify(doc.counts)); line('unknown: ' + doc.unknown.map(u => `${u.name} (${u.rows.length})`).join('; ')); line('ambiguous: ' + doc.ambiguous.map(u => u.name).join('; '));
}

main().catch(e => { console.error(e && e.stack || e); process.exit(2); });
