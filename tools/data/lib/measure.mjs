// Measurements that are not rule violations but reproduce the numbers of chapter 13 section 2 (and the DI report) so the
// baseline report can show expected-versus-measured side by side. Every "expected" value is quoted from the chapter.
import { fileGroups } from './load.mjs';
import { haversineM, MPH_PER_MS } from './util.mjs';
import { segmentsOf, placementCensus, MOVING_M, STATIONARY_M } from '../rules/coverage_rules.mjs';
import { tickModel } from './facts.mjs';
import { speedsOf, linearClock } from '../rules/geometry_rules.mjs';
import { walkStrings } from './util.mjs';
import { unionCasualtySums } from '../rules/numbers_rules.mjs';

/** The ticks chapter 13 section 2.3 probes for "units inside their evidence window" (query parameters of the measurement, not counts). */
const WINDOW_PROBES = [1, 100, 300, 450, 538, 550, 600, 675];

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export function measureSection2(ctx, { crosswalk, registry }) {
  const rows = ctx.rows;
  const oob = ctx.oob;
  const out = [];
  const add = (group, fact, expected, measured, source, note = '') => out.push({ group, fact, expected, measured, ok: String(expected) === String(measured), source, note });

  // files
  const files = [...ctx.data.files.values()];
  add('inventory', 'JSON files', 71, files.length, 'ch13 2.1');
  add('inventory', 'bytes', 824704, files.reduce((a, f) => a + f.bytes, 0), 'ch13 2.1');
  // placements. The tick model (days and their tick ranges) is the one the chronology files declare (facts.mjs tickModel): a row outside it
  // fills none of its ticks, so it is not counted as a populated tick (same rule as facts.placements.ticks_with_rows).
  const tm = tickModel(ctx);
  const dayOf = (t) => (tm.day_ranges ? tm.day_ranges.findIndex(([a, b]) => Number.isInteger(t) && t >= a && t <= b) : -1);
  const inModel = (t) => (tm.day_ranges ? dayOf(t) >= 0 : true);
  const ticks = new Set(rows.map((r) => r.tick).filter(inModel));
  const perTick = new Map();
  for (const r of rows) if (inModel(r.tick)) perTick.set(r.tick, (perTick.get(r.tick) || 0) + 1);
  add('placements', 'placement rows (placements_*)', 694, rows.filter((r) => r.group === 'placements').length, 'ch13 2.1');
  add('placements', 'density rows (density_*)', 1110, rows.filter((r) => r.group === 'density').length, 'ch13 2.1');
  add('placements', 'unique (unit,tick) keys', 1687, ctx.perKey.size, 'ch13 2.1');
  add('placements', 'ticks with at least one row', 188, ticks.size, 'ch13 2.1');
  const byDay = (tm.day_ranges ?? []).map(() => 0);
  for (const t of ticks) byDay[dayOf(t)]++;
  add('placements', 'populated ticks by day (1/2/3)', '59/72/57', tm.day_ranges ? byDay.join('/') : 'n/a (no tick model)', 'ch13 2.1');
  add('placements', 'median rows per populated tick', 6, median([...perTick.values()]), 'ch13 2.1');
  add('placements', 'max rows at one tick', 87, Math.max(...perTick.values()), 'ch13 2.1');
  // OOB
  const bk = oob.byKind;
  // the regiment-filed records (regiments, the alias stub, and the horse battery filed among them): derived once, reused wherever a count needs it
  const regimentRecords = (bk.regiment || 0) + oob.list.filter((r) => r.kind === 'battery' && r.filed_as === 'regiment').length;
  add('oob', 'distinct OOB ids (excluding the army record)', 728, oob.records.size - (bk.army || 0), 'ch13 2.1');
  add('oob', 'regiment records (regiment + the horse battery filed as one)', 467, regimentRecords, 'ch13 2.1');
  add('oob', 'union / confederate regiment records', '274/193', `${oob.list.filter((r) => (r.kind === 'regiment' || r.filed_as === 'regiment') && r.side === 'union').length}/${oob.list.filter((r) => (r.kind === 'regiment' || r.filed_as === 'regiment') && r.side === 'confederate').length}`, 'ch13 2.1');
  add('oob', 'battery records (excluding the one filed as a regiment)', 103, oob.list.filter((r) => r.kind === 'battery' && r.filed_as !== 'regiment').length, 'ch13 2.1');
  add('oob', 'brigades / divisions / corps', '93/31/11', `${bk.brigade}/${bk.division}/${bk.corps}`, 'ch13 2.1');
  add('oob', 'artillery battalions / artillery brigades', '11/12', `${bk.battalion}/${bk.artillery_brigade}`, 'ch13 2.1');
  add('oob', 'distinct units (regiments + batteries)', 569, registry.census.total, 'ch13 2.1');
  add('oob', 'distinct regiments (union/confederate)', '465 (273/192)', `${registry.census.regiments} (${registry.census.regiments_by_side.union}/${registry.census.regiments_by_side.confederate})`, 'ch13 2.1');
  add('oob', 'distinct batteries', 104, registry.census.batteries, 'ch13 2.1');
  // placed ids
  const placedIds = new Set(rows.map((r) => r.unit_id));
  const unresolved = [...placedIds].filter((id) => !oob.records.has(id));
  add('identity', 'placed ids', 478, placedIds.size, 'ch13 2.1');
  add('identity', 'unresolved placed ids', 95, unresolved.length, 'ch13 2.1');
  add('identity', 'rows with an unresolved id', 216, rows.filter((r) => !oob.records.has(r.unit_id)).length, 'ch13 2.1');
  add('identity', 'rows share of unresolved (%)', '12.0', (100 * rows.filter((r) => !oob.records.has(r.unit_id)).length / rows.length).toFixed(1), 'ch13 2.1');
  add('identity', 'wrong-side ids (U- prefix, Confederate regiment)', 10, crosswalk.wrong_side.length, 'ch13 2.1');
  // coverage
  const c = placementCensus(ctx);
  add('coverage', `regiments with an own placement (of ${c.regimentsTotal})`, 217, c.regimentsOwn, 'ch13 DQ-2');
  add('coverage', `batteries with an own placement (of ${c.batteriesTotal})`, 38, c.batteriesOwn, 'ch13 DQ-2');
  add('coverage', 'batteries never placed', 66, c.batteriesTotal - c.batteriesOwn, 'ch13 2.1 (65 of the 103 + the misfiled one)');
  const unplacedRecords = regimentRecords - c.regimentsOwn;
  add('coverage', 'regiment records with no own placement (regiment records minus regiments with an own placement)', 250, unplacedRecords, 'ch13 2.1', `the ${unplacedRecords} counts the alias stub and the horse battery filed as a regiment; ${c.regimentsTotal - c.regimentsOwn} real regiments`);
  // successions / references
  add('references', 'VI Corps: regiments pointing at missing brigades', 36, oob.list.filter((r) => r.kind === 'regiment' && /^U-VI-/.test(r.raw.parent_brigade_id || '') && !oob.records.has(r.raw.parent_brigade_id)).length, 'ch13 2.2');
  add('references', 'VI Corps: distinct missing brigade ids', 8, new Set(oob.list.filter((r) => r.kind === 'regiment' && /^U-VI-/.test(r.raw.parent_brigade_id || '') && !oob.records.has(r.raw.parent_brigade_id)).map((r) => r.raw.parent_brigade_id)).size, 'ch13 2.2');
  // motion
  const segs = segmentsOf(ctx);
  add('motion', 'consecutive keyframe pairs', 1209, segs.length, 'ch13 2.3');
  add('motion', `stationary (< ${STATIONARY_M} m)`, 274, segs.filter((s) => s.d < STATIONARY_M).length, 'ch13 2.3');
  add('motion', `drift (${STATIONARY_M}-${MOVING_M} m)`, 345, segs.filter((s) => s.d >= STATIONARY_M && s.d <= MOVING_M).length, 'ch13 2.3');
  add('motion', `moving (> ${MOVING_M} m)`, 590, segs.filter((s) => s.d > MOVING_M).length, 'ch13 2.3');
  add('motion', 'pairs spanning more than one tick', 1116, segs.filter((s) => s.dt > 1).length, 'ch13 2.3');
  add('motion', 'units with a single keyframe', 173, [...ctx.merged.values()].filter((l) => l.length === 1).length, 'ch13 2.3');
  const day1End = tm.day_ranges ? tm.day_ranges[0][1] : null;
  add('motion', 'units whose last keyframe is on Day 1', 153, day1End === null ? 'n/a (no tick model)' : [...ctx.merged.values()].filter((l) => l[l.length - 1].tick <= day1End).length, 'ch13 2.3');
  const win = (t) => [...ctx.merged.values()].filter((l) => l[0].tick <= t && t <= l[l.length - 1].tick).length;
  add('motion', `units inside their evidence window at ${WINDOW_PROBES.map((t) => `t${t}`).join('/')}`, '71/91/114/125/99/85/68/21', WINDOW_PROBES.map(win).join('/'), 'ch13 2.3');
  // conflicts
  const conflicting = ctx.conflicts.filter((c2) => ['lat', 'lng', 'disposition', 'strength'].some((f) => c2.rows.some((r) => r[f] !== c2.rows[0][f])));
  add('conflicts', 'duplicate (unit,tick) keys', 103, ctx.conflicts.length, 'ch13 5 / DI 3.1');
  add('conflicts', 'redundant rows', 117, ctx.conflicts.reduce((a, c2) => a + c2.rows.length - 1, 0), 'DI 3.1');
  add('conflicts', 'conflicting keys', 68, conflicting.length, 'ch13 5 / DI 3.1');
  // strength
  let inc = 0; const incUnits = new Set();
  for (const [u, l] of ctx.merged) for (let i = 1; i < l.length; i++) if (l[i].strength > l[i - 1].strength) { inc++; incUnits.add(u); }
  add('strength', 'strength increases / units', '121/82', `${inc}/${incUnits.size}`, 'ch13 3 (WP-03 acceptance)');
  // casualty sums
  const s = unionCasualtySums(ctx);
  add('casualties', 'Union: corps sum / period sum / army header', '22803/23138/23049', `${s.union.oob_corps_casualties}/${s.union.apportionment.periods}/${s.army.union.total_casualties}`, 'ch13 2.2');
  add('casualties', 'Confederate: apportionment total / period sum / army header', '23125/23025/28000', `${s.confederate.apportionment.total}/${s.confederate.apportionment.periods}/${s.army.confederate.total_casualties}`, 'ch13 2.2');
  add('casualties', 'strengths: Union corps sum / Confederate apportionment / Confederate corps sum', '90164/72810/65000', `${s.union.oob_corps_strength}/${s.confederate.apportionment.initial}/${s.confederate.oob_corps_strength}`, 'DI 3.5');
  add('casualties', 'dashboard combined period sum', 46163, s.union.apportionment.periods + s.confederate.apportionment.periods, 'DI 0 #4');
  // text
  let dash = 0;
  const groups = { placement_notes: 0, key_action: 0, regiment_commander_fate: 0, brigade_incl_assumed: 0, chronology_event: 0, chronology_narrative: 0, vignette_panel: 0, vignette_script: 0 };
  const occ = (t) => (typeof t === 'string' ? t.split(' -- ').length - 1 : 0);
  for (const r of rows) groups.placement_notes += occ(r.notes);
  for (const rec of oob.list) {
    if (rec.kind === 'regiment' || rec.filed_as === 'regiment') { groups.key_action += occ(rec.raw.key_action); groups.regiment_commander_fate += occ(rec.raw.commander?.fate); }
    else if (rec.kind === 'brigade') { let c = rec.raw.commander; let n = occ(rec.raw.key_action); while (c && c.successor) { n += occ(c.successor.assumed_command); c = c.successor; } groups.brigade_incl_assumed += n; }
    else if (rec.kind === 'battery') groups.key_action += occ(rec.raw.key_action);
  }
  for (const [rel, f] of ctx.data.files) {
    if (fileGroups.chronology(rel)) for (const e of f.json.events) { groups.chronology_event += occ(e.event); groups.chronology_narrative += occ(e.narrative); }
    if (fileGroups.vignettes(rel)) for (const v of f.json.vignettes) { groups.vignette_panel += occ(v.panel_summary); groups.vignette_script += occ(v.full_script); }
  }
  dash = Object.values(groups).reduce((a, b) => a + b, 0);
  add('text', ' " -- " in the DI 3.8 field groups', 1591, dash, 'ch13 5 / DI 3.8', `measured groups: ${JSON.stringify(groups)}; the specialist's own group figures (839+353+48+69+70+62+10+20+119) add to 1,590, one below its stated 1,591; this measurement reproduces the 1,590`);
  // provenance
  const metaSources = new Set();
  let filesWithSources = 0;
  for (const f of files) { const src = f.json?.metadata?.sources; if (Array.isArray(src) && src.length) { filesWithSources++; src.forEach((x) => metaSources.add(x)); } }
  add('provenance', 'files declaring metadata.sources', 17, filesWithSources, 'ch13 2.4');
  add('provenance', 'distinct citation strings', 29, metaSources.size, 'ch13 2.4');
  // embedded
  const emb = ctx.getEmbedded();
  add('embedded', 'monuments in the bundle array / without src', '512/503', `${emb.monuments.length}/${emb.monuments.filter((m) => !m.src).length}`, 'ch13 2.4');
  add('embedded', 'story markers / tour stops / legacy overlay', '20/16/9', `${emb.story.length}/${emb.tour.length}/${ctx.file('monuments.json')?.monuments.length}`, 'ch13 4.4');
  add('embedded', 'monument array location (lines)', '104440-110609', emb.monumentsLoc ? `${emb.monumentsLoc.start}-${emb.monumentsLoc.end}` : 'n/a', 'ch13 WP-DATA-15');
  return out;
}

/** Extra numbers quoted in the report: speeds on both clocks, stacking on raw rows, gap thresholds, field completeness. */
export function measureExtras(ctx) {
  const linear = speedsOf(ctx, linearClock);
  const warped = ctx.warped ? speedsOf(ctx, (t) => ctx.warped(t)) : null;
  const moving = linear.filter((s) => s.d > 250);
  const raw = new Map();
  for (const r of ctx.rows) { const k = `${r.tick}|${r.lat},${r.lng}`; if (!raw.has(k)) raw.set(k, new Set()); raw.get(k).add(r.unit_id); }
  const stackedRaw = [...raw.values()].filter((s) => s.size > 1);
  // same-tick pairs closer than 15 m (merged rows)
  const byTick = new Map();
  for (const [, l] of ctx.merged) for (const r of l) { if (!byTick.has(r.tick)) byTick.set(r.tick, []); byTick.get(r.tick).push(r); }
  let closePairs = 0;
  for (const list of byTick.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (haversineM(list[i].lat, list[i].lng, list[j].lat, list[j].lng) < 15) closePairs++;
  const segs = segmentsOf(ctx);
  const movingSegs = segs.filter((s) => s.d > 250);
  const regs = ctx.oob.list.filter((r) => r.kind === 'regiment');
  const missing = (f) => regs.filter((r) => r.raw[f] === undefined || (Array.isArray(r.raw[f]) && !r.raw[f].length)).length;
  const r11 = null;
  void r11;
  return {
    g003_linear_over_cap: linear.filter((s) => s.over).length,
    g003_warped_over_cap: warped ? warped.filter((s) => s.over).length : null,
    g003_segments_measured: linear.length,
    moving_segments: moving.length,
    moving_segments_over_120_minutes_warped: warped ? warped.filter((s) => s.d > 250 && s.minutes > 120).length : null,
    stacked_raw_groups: stackedRaw.length,
    stacked_raw_units: stackedRaw.reduce((a, s) => a + s.size, 0),
    same_tick_pairs_under_15m: closePairs,
    moving_gaps_over_10_ticks: movingSegs.filter((s) => s.dt > 10).length,
    moving_gaps_over_30_ticks: movingSegs.filter((s) => s.dt > 30).length,
    completeness: {
      regiments: regs.length,
      no_casualty_percentage: regs.filter((r) => r.raw.casualty_percentage === undefined).length,
      no_commander: regs.filter((r) => !r.raw.commander).length,
      no_parent_corps_id: regs.filter((r) => !r.raw.parent_corps_id).length,
      empty_days_engaged: missing('days_engaged'),
      short_key_action: regs.filter((r) => typeof r.raw.key_action === 'string' && r.raw.key_action.length < 40).length,
      flag_notes: ctx.oob.list.filter((r) => r.raw.flag_notes).length,
      non_state_values: regs.filter((r) => ['Regular Army', 'Multi-state'].includes(r.raw.state)).length,
    },
    all_strings: (() => { let n = 0; for (const [, f] of ctx.data.files) for (const _ of walkStrings(f.json)) n++; return n; })(),
    mph_scale: MPH_PER_MS,
  };
}
