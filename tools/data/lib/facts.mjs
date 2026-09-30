// Facts registry (WP-DATA-19): every count the site prints comes from here; nothing is typed except the cited authorities.
// A number that can be derived from the data IS derived (tick ranges from the chronology files, record partitions from the OOB index,
// the retired-literal list from data-src/policy); the only typed values are quotations of published authorities.
import fs from 'node:fs';
import path from 'node:path';
import { fileGroups } from './load.mjs';
import { REPO_ROOT } from './util.mjs';
import { unionCasualtySums } from '../rules/numbers_rules.mjs';
import { placementCensus } from '../rules/coverage_rules.mjs';

function distTextCount(ctx, file, rx) {
  const t = ctx.distText?.get(file);
  return t ? (t.match(rx) || []).length : null;
}

/** The tick model the files themselves declare: chronology_dayN.json metadata.dayN_tick_range. No clock is asserted (D-TIME). */
export function tickModel(ctx) {
  const ranges = [1, 2, 3].map((d) => ctx.file(`chronology_day${d}.json`)?.metadata?.[`day${d}_tick_range`] ?? null);
  if (ranges.some((r) => !Array.isArray(r) || r.length !== 2 || !r.every(Number.isInteger))) return { total: null, day_start: null, day_ranges: null, source: 'chronology_day{1,2,3}.json day*_tick_range (missing or malformed)' };
  for (let i = 0; i < 3; i++) if (ranges[i][1] < ranges[i][0] || (i > 0 && ranges[i][0] !== ranges[i - 1][1] + 1)) throw new Error(`chronology tick ranges are not contiguous: ${JSON.stringify(ranges)}`);
  return { total: ranges[2][1] - ranges[0][0] + 1, day_start: ranges.map((r) => r[0]), day_ranges: ranges, source: 'chronology_day{1,2,3}.json day*_tick_range' };
}

function retiredLiterals() {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data-src', 'policy', 'retired_literals.json'), 'utf8'));
    return cfg.literals.map((l) => ({ id: l.id, pattern: l.rx, meaning: l.meaning, replace_with: l.replace_with }));
  } catch { return []; }
}

const TOKEN_EXAMPLES = ['units.total', 'units.regiments', 'units.batteries', 'content.vignettes'];

export function buildFacts(ctx, registry, crosswalk, { contentSha256 = null, dataVersion = '0.9.0' } = {}) {
  const oob = ctx.oob;
  const k = (kind) => oob.list.filter((r) => r.kind === kind).length;
  const emb = ctx.getEmbedded();
  const chron = ctx.filesWhere(fileGroups.chronology).flatMap(([, f]) => f.json?.events ?? []);
  const vigs = ctx.filesWhere(fileGroups.vignettes).flatMap(([, f]) => f.json?.vignettes ?? []);
  const terrain = ctx.terrain;
  const census = placementCensus(ctx);
  const placedIds = new Set(ctx.rowsByUnit.keys());
  const placedResolved = [...placedIds].filter((id) => oob.records.has(id));
  const placedByKind = {};
  for (const id of placedResolved) { const r = oob.records.get(id); const key = r.kind === 'battery' && r.horse_artillery ? 'horse_battery' : r.kind; placedByKind[key] = (placedByKind[key] || 0) + 1; }
  const ticks = tickModel(ctx);
  // a tick "has rows" only if it is one of the ticks the model declares: a row at tick 9999 (or 2.5, or "7") fills none of them
  const inTickModel = (t) => Number.isInteger(t) && Boolean(ticks.day_ranges?.some(([a, b]) => t >= a && t <= b));
  const rowTicks = new Set(ctx.rows.map((r) => r.tick));
  const ticksWithRows = new Set([...rowTicks].filter(inTickModel));
  const rowsOutsideTickModel = ticks.total === null ? null : ctx.rows.filter((r) => !inTickModel(r.tick)).length;
  const sums = unionCasualtySums(ctx);
  const auth = ctx.authorities;
  const navItems = distTextCount(ctx, 'site-nav.js', /\{\s*id:\s*'/g);
  const indexLinks = (() => {
    const t = ctx.distText?.get('index.html');
    if (!t) return null;
    const m = t.match(/<nav aria-label="Explore the map's tools">([\s\S]*?)<\/nav>/);
    return m ? (m[1].match(/<a href=/g) || []).length : null;
  })();
  const regs = registry.census;
  // OOB record partitions, derived (never typed): regiment-filed records (incl. the alias stub and the horse battery filed among the
  // regiments) and batteries filed as batteries; together they are `records`
  const regimentRecords = oob.list.filter((r) => r.filed_as === 'regiment').length;
  const batteryRecords = oob.list.filter((r) => r.kind === 'battery' && r.filed_as !== 'regiment').length;
  const records = oob.list.filter((r) => r.kind !== 'army' && !['brigade', 'division', 'corps', 'battalion', 'artillery_brigade'].includes(r.kind)).length;
  if (regimentRecords + batteryRecords !== records) throw new Error(`OOB record partition is inconsistent: ${regimentRecords} + ${batteryRecords} != ${records}`);
  const monumentsNoSource = emb.monuments.filter((m) => !m.src).length;
  const misfiled = oob.list.filter((r) => r.kind === 'battery' && r.filed_as === 'regiment').map((r) => r.id);

  const basis = {
    'units.total': `${regs.regiments} regiments and ${regs.batteries} batteries in the legacy order of battle (alias stub${regs.alias_records_excluded.length === 1 ? '' : 's'} ${regs.alias_records_excluded.join(', ') || 'none'} excluded; ${misfiled.length ? `the horse battery ${misfiled.join(', ')} filed among the regiments counted as a battery` : 'no battery filed among the regiments'})`,
    'units.regiments': `regiments in the order of battle, alias records excluded (${regs.regiments_by_side.union} Union, ${regs.regiments_by_side.confederate} Confederate)`,
    'units.batteries': 'batteries in the order of battle including horse artillery',
    'units.with_own_track': 'units with at least one position row of their own; the others are positioned only through a parent formation or not at all',
    'units.records': `oob records: ${regimentRecords} regiment records + ${batteryRecords} batteries (includes the alias stub and the misfiled battery)`,
    'content.vignettes': 'narrated moments (vignettes)',
    'content.chronology_events': 'master chronology events',
    'content.monuments': `monument records in the deployed bundle (not published coordinates: ${monumentsNoSource} have no source)`,
  };

  const facts = {
    schema: 'gtbg/facts/1',
    status: 'CANDIDATE: generated from legacy/dist/data by tools/data/facts.mjs; no page reads it yet (WP-DATA-19 wires tokens through the site build / copy patch table)',
    data_version: dataVersion,
    generated_from: { data_content_sha256: contentSha256, authorities: 'data-src/authorities/authorities.json', bundle_extract: 'legacy/analysis/bundle.pretty.js (acorn, literal nodes only)' },
    ticks: {
      total: ticks.total,
      day_start: ticks.day_start,
      day_ranges: ticks.day_ranges,
      derived_from: ticks.source,
      time_model: 'undecided (D-TIME). The legacy files declare a linear 5 min/tick formula; the audit measured it as wrong. This registry deliberately carries no minutes_per_tick.',
    },
    units: {
      total: regs.total,
      regiments: regs.regiments,
      batteries: regs.batteries,
      records,
      regiment_records: regimentRecords,
      battery_records: batteryRecords,
      by_side: regs.by_side,
      regiments_by_side: regs.regiments_by_side,
      with_own_track: regs.placed_own,
      regiments_with_own_track: regs.regiments_placed_own,
      batteries_with_own_track: regs.batteries_placed_own,
      positioned_via_parent_or_ancestor: regs.via_parent_or_ancestor,
      never_positioned: regs.none,
      brigades: k('brigade'),
      divisions: k('division'),
      corps: k('corps'),
      artillery_battalions: k('battalion'),
      artillery_brigades: k('artillery_brigade'),
      placed_ids: placedIds.size,
      placed_ids_resolved: placedResolved.length,
      placed_ids_by_kind: placedByKind,
      unresolved_placed_ids: crosswalk.counts.unresolved_ids,
      unresolved_placed_rows: crosswalk.counts.rows,
      unplaced_regiments: census.regimentsTotal - census.regimentsOwn,
      unplaced_batteries: census.batteriesTotal - census.batteriesOwn,
      basis,
    },
    placements: {
      rows: ctx.rows.length,
      unique_unit_tick_keys: ctx.perKey.size,
      duplicate_keys: ctx.conflicts.length,
      ticks_with_rows: ticks.total === null ? null : ticksWithRows.size,
      ticks_without_rows: ticks.total === null ? null : ticks.total - ticksWithRows.size,
      rows_outside_tick_model: rowsOutsideTickModel,
      distinct_row_ticks: rowTicks.size,
      by_group: { placements: ctx.rows.filter((r) => r.group === 'placements').length, density: ctx.rows.filter((r) => r.group === 'density').length },
    },
    content: {
      vignettes: vigs.length,
      chronology_events: chron.length,
      chronology_critical_events: chron.filter((e) => e.significance === 'critical').length,
      terrain_entries: terrain ? terrain.key_locations.length + terrain.roads.length + terrain.structures.length + terrain.terrain_features.length : null,
      terrain_key_locations: terrain?.key_locations.length ?? null,
      successions: (ctx.file('oob/commander_successions.json')?.union_successions.length ?? 0) + (ctx.file('oob/commander_successions.json')?.confederate_successions.length ?? 0),
      monuments: emb.monuments.length,
      monuments_without_source: monumentsNoSource,
      story_markers: emb.story.length,
      legacy_overlay_monuments: ctx.file('monuments.json')?.monuments.length ?? null,
      tour_stops: emb.tour.length,
      features_site_nav: navItems,
      features_index_html: indexLinks,
    },
    corps: {
      union: oob.list.filter((r) => r.kind === 'corps' && r.side === 'union').map((r) => ({ id: r.id, name: r.raw.designation, strength: r.raw.strength, casualties: r.raw.casualties })),
      confederate: oob.list.filter((r) => r.kind === 'corps' && r.side === 'confederate').map((r) => ({ id: r.id, name: r.raw.designation, strength: r.raw.strength, casualties: r.raw.casualties })),
    },
    casualties: {
      note: 'Authorities are listed, not chosen: the Union headline candidate is the Official Records; the Confederate side is a range with named authorities (chapter 13 WP-DATA-08a, backlog H-01). Nothing below is displayed anywhere yet.',
      authorities: auth ? {
        union: auth.casualties.union.values.map((v) => ({ id: v.id, total: v.total, K: v.K ?? null, W: v.W ?? null, M: v.M ?? null, basis: v.basis ?? null, status: v.status, source: v.source ?? null, page: v.page ?? null })),
        confederate: auth.casualties.confederate.values.map((v) => ({ id: v.id, total: v.total, K: v.K ?? null, W: v.W ?? null, M: v.M ?? null, basis: v.basis ?? null, status: v.status, source: v.source ?? null, page: v.page ?? null })),
        union_site_value_candidate: auth.casualties.union.site_value_candidate,
        confederate_site_value_candidate: auth.casualties.confederate.site_value_candidate,
        combined_default_wording_pending_owner: auth.policy.combined_default_wording_pending_owner,
        engaged_strength: auth.engaged_strength,
        uncertainty: 'K/W/M and totals marked secondary_unverified come from Wikipedia wikitext citing Busey and Martin; the book was not opened. The OR27-2 Guild column assignment is inferred from scrambled OCR. The Confederate total is not decided.',
      } : null,
      site_figures_measured: sums ? {
        union: { oob_corps_casualty_sum: sums.union.oob_corps_casualties, apportionment_total_sum: sums.union.apportionment.total, apportionment_period_sum: sums.union.apportionment.periods, oob_army_header: sums.army.union?.total_casualties ?? null, oob_corps_strength_sum: sums.union.oob_corps_strength, apportionment_initial_strength_sum: sums.union.apportionment.initial, oob_army_strength: sums.army.union?.total_strength ?? null },
        confederate: { oob_corps_casualty_sum: sums.confederate.oob_corps_casualties, apportionment_total_sum: sums.confederate.apportionment.total, apportionment_period_sum: sums.confederate.apportionment.periods, oob_army_header: sums.army.confederate?.total_casualties ?? null, oob_corps_strength_sum: sums.confederate.oob_corps_strength, apportionment_initial_strength_sum: sums.confederate.apportionment.initial, oob_army_strength: sums.army.confederate?.strength ?? null },
        dashboard_combined_period_sum: sums.union.apportionment.periods + sums.confederate.apportionment.periods,
      } : null,
    },
    artillery: {
      listed_batteries: { union: oob.list.filter((r) => r.kind === 'battery' && r.side === 'union').length, confederate: oob.list.filter((r) => r.kind === 'battery' && r.side === 'confederate').length },
      listed_guns: { union: oob.list.filter((r) => r.kind === 'battery' && r.side === 'union').reduce((a, r) => a + (r.raw.gun_count ?? 0), 0), confederate: oob.list.filter((r) => r.kind === 'battery' && r.side === 'confederate').reduce((a, r) => a + (r.raw.gun_count ?? 0), 0) },
      label: 'listed batteries: the artillery OOB is incomplete (WP-DATA-07 step 4)',
    },
    retired_literals: retiredLiterals(),
    token_examples: [],
  };
  for (const t of TOKEN_EXAMPLES) if (t.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), facts) === undefined) throw new Error(`token example {{facts.${t}}} does not resolve in the facts it is meant to illustrate`);
  facts.token_examples = TOKEN_EXAMPLES.map((t) => `{{facts.${t}}}`);
  return facts;
}
