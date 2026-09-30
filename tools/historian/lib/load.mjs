// load.mjs - read the site data lake (legacy/dist/data/**) through a FIELD WHITELIST.
// Nothing here modifies the data. Developer-only fields (flag, flag_notes, tick-derived clock labels, placement/animation fields) are dropped
// at this boundary so a later "index every string" change cannot leak them (validator rule K001 / V05).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const REG_FILES = [
  'union_regiments_i_ii_corps.json', 'union_regiments_iii_v_corps.json', 'union_regiments_vi_xi_xii_corps.json',
  'confederate_regiments_first_corps.json', 'confederate_regiments_second_corps.json', 'confederate_regiments_third_corps.json',
  'union_cavalry_artillery.json', 'confederate_cavalry.json',
];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

/** sha256 over (relative path, bytes) of every data file: identical to verify-golden's data fingerprint. */
export function fingerprint(dataDir) {
  const h = crypto.createHash('sha256');
  const files = [];
  for (const f of walk(dataDir).sort()) {
    const rel = path.relative(dataDir, f).split(path.sep).join('/');
    h.update(rel); h.update(fs.readFileSync(f)); files.push(rel);
  }
  return { sha256: h.digest('hex'), files: files.length };
}

export function loadSite(dataDir) {
  const J = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'));
  const site = { dataDir, fp: fingerprint(dataDir), warnings: [] };

  // ---- regiments (467): whitelist ------------------------------------------------------------------------------------
  site.regiments = [];
  site.oobMeta = {};
  for (const f of REG_FILES) {
    const j = J('oob/' + f);
    site.oobMeta[f] = { title: j.metadata && j.metadata.title, sources: (j.metadata && j.metadata.sources) || [] };
    for (const r of j.regiments) {
      site.regiments.push({
        id: r.regiment_id, file: 'oob/' + f, designation: r.designation, parent_brigade_id: r.parent_brigade_id || null, parent_corps_id: r.parent_corps_id || null,
        state: r.state || null, commander: r.commander || null, strength: r.strength, casualties: r.casualties, casualty_percentage: r.casualty_percentage,
        days_engaged: r.days_engaged || [], key_action: r.key_action || '', alias_for: r.alias_for || null, notes: r.notes || null,
      });
    }
  }

  // ---- OOB above regiment ----------------------------------------------------------------------------------------------
  const ub = J('oob/union_oob_brigades.json'), cb = J('oob/confederate_oob_corps_div_bde.json'), uc = J('oob/union_oob_corps_division.json');
  const keepUnit = (o, idKey) => ({
    id: o[idKey], designation: o.designation, commander: o.commander || null, strength: o.strength, casualties: o.casualties, casualty_percentage: o.casualty_percentage,
    days_engaged: o.days_engaged || [], state: o.state || null, key_action: o.key_action || '', notes: o.notes || '',
    parent_division_id: o.parent_division_id || null, parent_corps_id: o.parent_corps_id || null,
    regiment_ids: o.regiment_ids || null, brigade_ids: o.brigade_ids || null, division_ids: o.division_ids || null, chief_of_artillery: o.chief_of_artillery || null,
  });
  site.brigades = [...ub.brigades.map((b) => ({ ...keepUnit(b, 'brigade_id'), side: 'U' })), ...cb.brigades.map((b) => ({ ...keepUnit(b, 'brigade_id'), side: 'C' }))];
  site.divisions = [...uc.divisions.map((b) => ({ ...keepUnit(b, 'division_id'), side: 'U' })), ...cb.divisions.map((b) => ({ ...keepUnit(b, 'division_id'), side: 'C' }))];
  site.corps = [...uc.corps.map((b) => ({ ...keepUnit(b, 'corps_id'), side: 'U' })), ...cb.corps.map((b) => ({ ...keepUnit(b, 'corps_id'), side: 'C' }))];
  site.armies = [
    { id: 'ARMY:U', side: 'U', designation: 'Army of the Potomac (Union)', commander: uc.metadata.army_commander, strength: uc.metadata.total_strength, casualties: uc.metadata.total_casualties,
      casualty_percentage: uc.metadata.casualty_percentage },
    { id: 'ARMY:C', side: 'C', designation: 'Army of Northern Virginia (Confederate)', commander: cb.army.commander, strength: cb.army.strength, casualties: cb.army.total_casualties,
      casualty_percentage: cb.army.casualty_percentage },
  ];
  site.oobSources = { U: uc.metadata.sources || [], C: cb.metadata.sources || [] };
  site.battle = { name: uc.metadata.battle || null };

  // ---- artillery ------------------------------------------------------------------------------------------------------
  const ua = J('oob/union_artillery.json'), ca = J('oob/confederate_artillery.json');
  const ucav = J('oob/union_cavalry_artillery.json'), ccav = J('oob/confederate_cavalry.json');
  const bat = (b, side, parentId) => ({
    id: b.battery_id, side, designation: b.designation, commander: b.commander || null, gun_count: b.gun_count, gun_type: b.gun_type || null, strength: b.strength,
    casualties: b.casualties, key_action: b.key_action || '', parent_id: parentId || null, division_attached: b.division_attached || null,
  });
  site.batteries = []; site.artUnits = [];
  for (const br of ua.artillery_reserve.brigades) {
    site.artUnits.push({ id: br.brigade_id, side: 'U', designation: br.designation, commander: br.commander || null, batteries: br.batteries.map((b) => b.battery_id), corps: null, reserve: true });
    for (const b of br.batteries) site.batteries.push(bat(b, 'U', br.brigade_id));
  }
  for (const br of ua.corps_artillery_brigades) {
    site.artUnits.push({ id: br.brigade_id, side: 'U', designation: br.designation, commander: br.commander || null, batteries: br.batteries.map((b) => b.battery_id), corps: br.corps || null });
    for (const b of br.batteries) site.batteries.push(bat(b, 'U', br.brigade_id));
  }
  for (const [k, cid] of [['first_corps_artillery', 'C-I'], ['second_corps_artillery', 'C-II'], ['third_corps_artillery', 'C-III']]) {
    for (const bt of ca[k].battalions) {
      site.artUnits.push({ id: bt.battalion_id, side: 'C', designation: bt.designation, commander: bt.commander || null, batteries: bt.batteries.map((b) => b.battery_id), corps: cid, notes: bt.notes || '' });
      for (const b of bt.batteries) site.batteries.push(bat(b, 'C', bt.battalion_id));
    }
  }
  for (const b of ucav.horse_artillery) site.batteries.push(bat(b, 'U', b.division_attached || null));
  for (const b of ccav.horse_artillery) site.batteries.push(bat(b, 'C', null));
  site.artChiefs = [
    { side: 'U', scope: 'Army of the Potomac', ...(ua.metadata.army_chief_of_artillery || {}), totalBatteries: ua.metadata.total_batteries, totalGuns: ua.metadata.total_guns },
    { side: 'C', scope: 'Army of Northern Virginia', ...(ca.metadata.army_chief_of_artillery || {}), totalBatteries: ca.metadata.total_batteries, totalGuns: ca.metadata.total_guns_approximately },
  ];
  site.artChiefsByCorps = ['first', 'second', 'third'].map((w, i) => ({ side: 'C', corps: ['C-I', 'C-II', 'C-III'][i], ...(ca[`${w}_corps_artillery`].chief || {}) }));
  site.cannonade = ca.metadata && ca.alexander_cannonade_notes ? ca.alexander_cannonade_notes : null;

  // ---- successions -----------------------------------------------------------------------------------------------------
  const su = J('oob/commander_successions.json');
  site.successions = [...su.union_successions.map((s) => ({ ...s, side: 'U' })), ...su.confederate_successions.map((s) => ({ ...s, side: 'C' }))]
    .map((s) => ({ id: s.event_id, side: s.side, unit_id: s.unit_id, event: s.event, approx_time: s.approx_time, from: s.from_commander, to: s.to_commander, cause: s.cause, notes: s.notes || '', source: s.source || '' }));

  // ---- vignettes / chronology / terrain ---------------------------------------------------------------------------------
  site.vignettes = [];
  for (const f of ['vignettes_part1.json', 'vignettes_part2.json', 'vignettes_part3.json']) for (const v of J(f).vignettes) {
    site.vignettes.push({ id: v.vignette_id, title: v.title, trigger_tick: v.trigger_tick, trigger_location: v.trigger_location, units_featured: v.units_featured || [], panel_summary: v.panel_summary || '', full_script: v.full_script || '' });
  }
  site.chronology = [];
  for (const d of [1, 2, 3]) for (const e of J(`chronology_day${d}.json`).events) {
    // `time` (a tick-derived clock label, wrong per audit C4) and `flag` (animation notes) are deliberately not carried.
    site.chronology.push({ id: `D${d}T${e.tick}`, day: d, tick: e.tick, event: e.event || '', narrative: e.narrative || '', location: e.location || '', significance: e.significance || '', units_involved: e.units_involved || [] });
  }
  const t = J('terrain.json');
  site.locations = t.key_locations.map((l) => ({ id: l.location_id, name: l.name, lat: l.lat, lng: l.lng, elevation_ft: l.elevation_ft, significance: l.significance || '', day_relevance: l.day_relevance || [] }));
  site.roads = t.roads.map((x) => ({ id: x.road_id, name: x.name, direction: x.direction || '', significance: x.significance || '' }));
  site.structures = t.structures.map((x) => ({ id: x.structure_id, name: x.name, type: x.type || '', significance: x.significance || '' }));
  site.features = t.terrain_features.map((x) => ({ id: x.feature_id, name: x.name, type: x.type || '', significance: x.significance || '' }));
  const m = J('monuments.json');
  site.monuments = m.monuments.map((x) => ({ id: x.id, name: x.name, side: x.side, lat: x.lat, lng: x.lng, source: x.source || '' }));

  // ---- casualties -------------------------------------------------------------------------------------------------------
  const cas = J('casualty_apportionment.json');
  site.casualtyNotes = cas.notable_intensity_notes;
  site.casualtyCorps = [...cas.union_corps.map((x) => ({ ...x, side: 'U' })), ...cas.confederate_corps.map((x) => ({ ...x, side: 'C' }))];

  // ---- placement notes (curated subset; see passages.mjs) ------------------------------------------------------------------
  site.placementNotes = [];
  for (const f of fs.readdirSync(dataDir).filter((n) => /^(placements|density)_.*\.json$/.test(n)).sort()) {
    const j = J(f);
    for (const p of j.placements || []) if (p.notes) site.placementNotes.push({ file: f, unit_id: p.unit_id, tick: p.tick, notes: p.notes });
  }
  return site;
}
