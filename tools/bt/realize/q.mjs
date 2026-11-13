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
//   node tools/bt/realize/q.mjs struct bld-rock-creek-rr-bridge 1863-06-26T12:00     a structure: its objects, state, schedule rows and what is drawn
//   node tools/bt/realize/q.mjs work E-05 1863-07-02T09:00                           a work: stage, crew, draw-list status
//   node tools/bt/realize/q.mjs guns <battery-id> 1863-07-02T09:00                   guns, limbers and caissons shown
//   node tools/bt/realize/q.mjs weather 1863-06-26T12:00 | sky <time>               the drawn weather and the sun and moon
//   node tools/bt/realize/q.mjs cas 1863-07-01T14:00 1863-07-01T16:00 [unit]         casualty events in a window
//   node tools/bt/realize/q.mjs cards 1863-07-01T12:00 | epilogue <time>             the event cards / epilogue content the product shows
//   node tools/bt/realize/q.mjs gazetteer [--write]        every place the timeline names: resolved (with tolerance), ambiguous, off the ground, unknown; --write saves GOVERNANCE/realizations/gazetteer.json
//   node tools/bt/realize/q.mjs scenario                   the conflicts and the choices of the opening scenario
// A time is 1863-MM-DDTHH:MM (local mean time). Add --scenario pdf for the plan's values instead of the delegated defaults.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { REAL, GOV, readJSON, readJSONL, exists, toMin, isoOf, round, hasQuote, fold, sha256File, ROOT, rel } from './lib.mjs';
import { loadTimeline, describeWindow } from './timeline.mjs';
import { openProduct } from './query.mjs';
import { candidatePhrases, norm, expand } from './gazetteer.mjs';
import { registerCoverage, epilogueRows } from './check.mjs';
import { suggest, printSuggestion } from './suggest.mjs';

const argv = process.argv.slice(2), cmd = argv[0], flag = n => { const i = argv.indexOf(n); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const pos = argv.filter((a, i) => i > 0 && !a.startsWith('--') && !['--near', '--radius', '--side', '--scenario'].includes(argv[i - 1]));
const scen = flag('--scenario') || 'default', J = o => console.log(JSON.stringify(o, null, 1));
const T = s => (/^\d+(\.\d+)?$/.test(String(s)) ? +s : toMin(s));
const line = (...a) => console.log(...a);

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); return; }
  if (cmd === 'rows') return rowsCmd(pos[0]);
  const P = await openProduct(), S = P.scene(scen);
  if (cmd === 'row') return rowCmd(P, S, pos[0]);
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
  if (cmd === 'struct') {
    const St = await P.structures(scen), id = pos[0], objs = St.byState.get(id) || [];
    if (!objs.length) { const nd = (St.inputs.data.notDrawn || []).find(x => x.id === id); line(`${id}: nothing drawn${nd ? ' (' + nd.reason + ')' : ''}; state engine knows it: ${St.engine.knows(id)}`); const hits = St.model.objects.filter(o => fold(o.name || '').includes(fold(id))).slice(0, 12); for (const o of hits) line(`  object ${o.id} state_id=${o.state_id} ${o.cls} ${o.name}`); return; }
    const t = pos[1] ? T(pos[1]) : null;
    for (const o of objs) { line(`object ${o.id} [${o.cls}] state_id=${o.state_id} rec=${o.rec} "${o.name}" tier ${o.tier}`); if (t != null) { const d = St.model.describe(o.oid, t, {}); line(`  at ${isoOf(t)}: ${d.state && d.state.state} (present ${d.state && d.state.present}, ${d.state && d.state.status}) rows ${(d.rows || []).join(',')} visual A=${JSON.stringify(d.visual && d.visual.A)} B=${JSON.stringify(d.visual && d.visual.B)} mix=${d.visual && d.visual.mix}; hospitals ${(d.hospitals || []).map(h => h.id + ':' + h.phase).join(',') || '-'}`); } }
    return;
  }
  if (cmd === 'work') { const St = await P.structures(scen), id = pos[0], t = T(pos[1]); const ms = Date.UTC(1863, 5, 1) + Math.round(t * 60000); line(JSON.stringify(St.engine.stateAt(id, ms, 'default', 0))); const d = await S.drawLists(t); if (d.works) { line('draw list: ' + JSON.stringify((d.works.status || []).find(w => w.id === id) || 'not in the works lists')); } return; }
  if (cmd === 'guns') { const id = pos[0], t = T(pos[1]); const i = P.index.get(id); const w = P.world.units[i]; line(JSON.stringify(S.unitAt(id, t))); const d = await S.drawLists(t); if (d.artillery) { const n = k => { const a = d.artillery[k], c = a.length / d.artillery.stride; let m = 0; for (let j = 0; j < c; j++) if (a[j * d.artillery.stride + 4] === i) m++; return m; }; line(`stated guns drawn by the stage: ${w.guns || 0}; train lists for this battery: guns ${n('guns')} limbers ${n('limbers')} caissons ${n('caissons')} wagons ${n('wagons')} horses ${n('horses')} drivers ${n('drivers')}`); } return; }
  if (cmd === 'weather' || cmd === 'sky') { const W = await P.weatherAt(T(pos[0]), scen), d = W.drawn; if (cmd === 'sky') return J({ at: W.iso, sun: { alt: round(W.sun.sunAlt, 1), az: round(W.sun.sunAz, 0), band: W.sun.band }, moon: { alt: round(d.sky.moonAlt, 1), up: d.sky.moonUp, illum: round(d.sky.moonIllum, 0) }, exposure: round(d.sky.exposure, 3), night_floor: d.sky.nightFloor, source: d.sky.src }); return J({ at: W.iso, record_exists: d.record, precip: d.precip, cloud: { cover: round(d.cloud.cover, 2), known: d.cloud.known }, wetness: d.wetness, fog: { visibility_m: round(d.fog.visibilityM, 0) }, wind: { mph: d.wind.mph, text: d.wind.text }, temp: d.temp, record: { tempF: round(W.record.tempF, 1), sky: W.record.sky, precip: W.record.precip, flags: W.record.flags }, sun_alt: round(W.sun.sunAlt, 1), moon_alt: round(W.sun.moonAlt, 1) }); }
  if (cmd === 'cas') { if (pos[2] && !P.unit(pos[2])) return line(`no unit ${pos[2]} (q.mjs unit "<words>" finds ids)`); const r = S.casualtiesOf(pos[2] || null, T(pos[0]), T(pos[1])); J({ ...r, units: `${r.units.length} unit(s)`, unit_sample: r.units.slice(0, 8), note: pos[2] ? `${pos[2]}: the sum over its ${r.leaves} leaf unit(s) on the field (a formation id is expanded as the casualty check expands it)` : 'every unit' }); return; }
  if (cmd === 'cards' || cmd === 'epilogue') { J(cmd === 'cards' ? await P.cardsAt(T(pos[0])) : await P.epilogueAt(T(pos[0]))); return; }
  if (cmd === 'gazetteer') return gazetteerCmd(P);
  if (cmd === 'scenario') { const sc = P.scenarioSpec(scen); line(`${sc.id}: ${Object.keys(sc.choices).length} choices`); J(sc.choices); return; }
  console.error('unknown command ' + cmd + '; try: node tools/bt/realize/q.mjs help'); process.exit(2);
}

// place-like phrases of a text that are not, as a whole, a name of the gazetteer ("Cashtown Pike" is not "Cashtown", nor "Chambersburg Pike")
function unknownPhrases(P, text) {
  const out = []; for (const c of candidatePhrases(text)) { const r = P.places.resolve(c); if (r.status === 'resolved') continue; const hits = P.places.findIn(c), whole = hits.some(h => h.key === norm(expand(c)).replace(/s$/, '') || norm(expand(c)) === h.key); if (r.status === 'ambiguous') continue; if (!whole) out.push({ phrase: c, part: hits.map(h => h.place.name).join(', ') || null }); } return out;
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
  line(`WHAT        ${row.what_text}`);
  line(`NOTES       ${row.notes_text}`);
  if (row.correction) line(`CORRECTION  ${row.correction.verdict || ''} ${String(row.correction.text || '').slice(0, 600)}`);
  line(`REGISTER    open entries linked to the row: ${reg.open.join(', ') || 'none'}${reg.all.length > reg.open.length ? ' (closed: ' + reg.all.filter(x => !reg.open.includes(x)).join(', ') + ')' : ''}`);
  const text = row.claim_text, hits = P.places.findIn(text);
  line('PLACES NAMED IN THE ROW:'); if (!hits.length) line('  (none found in the gazetteer)');
  const seenP = new Set(); for (const h of hits) { const p = h.place; if (seenP.has(p.id)) continue; seenP.add(p.id); line(`  ${p.id.padEnd(22)} ${p.name} [${p.kind}, ${p.shape}] centre ${p.center.lng},${p.center.lat} tolerance ${p.tolerance_m} m${p.on_ground ? '' : '  OFF THE LOADED GROUND'}`); }
  const unk = unknownPhrases(P, row.what_text); if (unk.length) line(`  place-like phrases the gazetteer does not know as a whole: ${unk.map(u => u.phrase + (u.part ? ' (contains ' + u.part + ')' : '')).join('; ')}`);
  line('UNITS NAMED IN THE ROW:'); const named = P.unitsNamedIn(text); if (!named.length) line('  (none matched; try q.mjs unit "<words>")');
  const mid = row.window.intervals.length ? (row.window.intervals[0][0] + row.window.intervals[0][1]) / 2 : null;
  for (const n of named.slice(0, 14)) {
    const ls = P.leaves(n.id), drawn = ls.filter(l => P.unit(l).drawn); const arr = drawn.map(l => (S.stage.presence[l] || {}).from).filter(Number.isFinite).map(x => x / 60);
    const pres = row.window.intervals.length ? ls.filter(l => { for (const [a, b] of row.window.intervals) { for (let t = Math.ceil(a); t <= Math.min(b, a + 1500); t += 15) if (S.unitAt(l, t).present) return true; } return false; }).length : 0;
    line(`  ${n.id.padEnd(34)} ${String(n.name).slice(0, 36).padEnd(36)} ${n.level.padEnd(10)} (${n.why}) leaves ${ls.length}, drawn ${drawn.length}${arr.length ? ', first arrival ' + isoOf(Math.min(...arr)) : ''}; on the field somewhere in the allowed window: ${pres}`);
  }
  const rec = exists(path.join(REAL, 'RESULTS.json')) ? readJSON(path.join(REAL, 'RESULTS.json')) : null, e = rec && (rec.rows[id] || (rec.epilogue || {})[id]);
  line(`RESULT      ${e ? `${e.realized ? 'REALIZED' : 'not realized'} [${e.kind}] ${e.why}   (${e.record})` : 'no record yet'}`);
}

function gazetteerCmd(P) {
  const TL = loadTimeline(), EP = epilogueRows(TL), rows = [...TL.rows, ...EP], places = new Map(), unknown = new Map(), ambiguous = new Map();
  for (const r of rows) {
    for (const h of P.places.findIn(r.claim_text)) { const k = h.place.id; (places.get(k) || places.set(k, { place: h.place, rows: [] }).get(k)).rows.push(r.id); }
    for (const c of candidatePhrases(r.what_text)) { const res = P.places.resolve(c); if (res.status === 'ambiguous') (ambiguous.get(c) || ambiguous.set(c, { candidates: res.candidates, rows: [] }).get(c)).rows.push(r.id); }
    for (const u of unknownPhrases(P, r.what_text)) (unknown.get(u.phrase) || unknown.set(u.phrase, { rows: [], part: u.part }).get(u.phrase)).rows.push(r.id);
  }
  const doc = {
    _doc: 'The places the timeline rows name, resolved against the repository\'s own files (app/data/gazetteer.json and the base-map layers), with the distance tolerance a check may use. Unknown places are listed, never guessed; an ambiguous name is never resolved by choosing one. Built by tools/bt/realize/q.mjs gazetteer --write; tolerances by kind: tolerances.json distance.',
    tolerance_by_kind_m: P.tolerances.distance.floor_m_by_kind, line_extra_m: P.tolerances.distance.line_extra_m, tolerance_rule: 'point/area/footprint: distance from the unit centre to the centre of the place must be <= sigma_m of the entry (at least the floor of its kind); line (road, lane, stream, railway): distance to the nearest point of the mapped line <= positional error + line_extra_m',
    sources: P.places.sources, ground_box: P.places.box,
    counts: { places_in_gazetteer: P.places.list.length, named_in_rows: places.size, unknown_names: unknown.size, ambiguous_names: ambiguous.size, rows_naming_a_known_place: new Set([...places.values()].flatMap(x => x.rows)).size, rows: rows.length },
    places: [...places.values()].sort((a, b) => b.rows.length - a.rows.length || (a.place.id < b.place.id ? -1 : 1)).map(({ place: p, rows }) => ({ id: p.id, name: p.name, aliases: p.aliases, kind: p.kind, shape: p.shape, center: p.center, tolerance_m: p.tolerance_m, on_ground: p.on_ground, source: p.source, ref: p.ref, tier: p.tier, rows })),
    unknown: [...unknown.entries()].sort((a, b) => b[1].rows.length - a[1].rows.length || (a[0] < b[0] ? -1 : 1)).map(([name, v]) => ({ name, rows: v.rows, contains_known_place: v.part || null, status: 'unknown: no repository file carries this name; not guessed' })),
    ambiguous: [...ambiguous.entries()].map(([name, v]) => ({ name, candidates: v.candidates, rows: v.rows })),
    ambiguous_in_gazetteer: [...P.places.ambiguous.entries()].map(([k, s]) => ({ key: k, ids: [...s].map(p => p.id) })),
    superseded: P.places.superseded, skipped_duplicates: P.places.skipped.length,
  };
  if (flag('--write')) { fs.mkdirSync(REAL, { recursive: true }); fs.writeFileSync(path.join(REAL, 'gazetteer.json'), JSON.stringify(doc, null, 1) + '\n'); line(`wrote ${rel(path.join(REAL, 'gazetteer.json'))}`); }
  line(JSON.stringify(doc.counts)); line('unknown: ' + doc.unknown.map(u => `${u.name} (${u.rows.length})`).join('; ')); line('ambiguous: ' + doc.ambiguous.map(u => u.name).join('; '));
}

main().catch(e => { console.error(e && e.stack || e); process.exit(2); });
