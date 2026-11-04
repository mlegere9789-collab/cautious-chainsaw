// Builds data/fx3d/{params,TIERS,weapons,fires,GAPS}.json from tools/fx3d-params.mjs, kit/weapons.json, audio/contract/weapons.json, structures/state_schedule.json and app/data/structures3d.json.
//   node app/tools/build-fx3d-data.mjs        (deterministic, no timestamp, a few ms)
// Nothing here is invented: every number is either read from a repository file (with the file named in its basis) or comes from fx3d-params.mjs, where each leaf carries its tier and basis.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { PARAMS } from './fx3d-params.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), APP = path.join(HERE, '..'), BT = path.join(APP, '..'), OUT = path.join(APP, 'data', 'fx3d');
const J = f => JSON.parse(fs.readFileSync(path.join(BT, f), 'utf8'));
fs.mkdirSync(OUT, { recursive: true });

// ---- params.json + TIERS.json (flatten the tree)
const values = {}, tiers = {};
(function walk(o, p, v, t) {
  for (const [k, x] of Object.entries(o)) {
    if (x && x.__p) { v[k] = x.v; t[p + k] = { tier: x.tier, basis: x.basis.length < 30 && x.tier === 'plausible-procedural' ? x.basis + ' (look parameter, no source in the repository)' : x.basis, sources: x.src }; } else { v[k] = {}; walk(x, p + k + '.', v[k], t); }
  }
})(PARAMS, '', values, tiers);

// ---- weapons
const kit = J('kit/weapons.json'), audio = J('audio/contract/weapons.json'), GRAIN = PARAMS.physical.grain_kg.v, LB = PARAMS.physical.lb_kg.v;
const SMALL = {};   // kit id -> fx class
const rifled = ['m1861_springfield', 'm1863_rifle_musket', 'm1855_springfield', 'harpers_ferry_rifle_m1855', 'm1841_mississippi', 'p1853_enfield', 'p1856_58_enfield_short', 'lorenz_m1854', 'richmond_rifle', 'richmond_carbine', 'whitworth_rifle', 'kerr_rifle', 'enfield_musketoon', 'imported_arms_not_covered', 'springfield_model_unspecified', 'scoped_target_rifle', 'field_finds_any_arm'];
const smooth = ['m1842_smoothbore', 'buck_and_ball_load', 'smoothbore_69_musket_unspecified'];
const breech = ['sharps_rifle_m1859', 'sharps_carbine', 'sharps_unspecified_pattern', 'burnside_carbine', 'gallager_carbine', 'smith_carbine', 'merrill_carbine', 'sharps_hankins_carbine', 'revolving_and_other_breechloaders_gap'];
const repeat = ['spencer_repeater', 'henry_rifle'];
for (const k of rifled) SMALL[k] = 'rifle_musket'; for (const k of smooth) SMALL[k] = 'smoothbore_musket'; for (const k of breech) SMALL[k] = 'breechloader'; for (const k of repeat) SMALL[k] = 'repeater';
for (const [k, v] of Object.entries(kit.weapons)) if (v.category === 'handgun') SMALL[k] = 'revolver';
const caliberOf = w => { const c = w.specs && w.specs.caliber_in; if (typeof c === 'number') return c; if (c && typeof c === 'object') return c.rebored || c.original || null; return null; };
const REF_GR = 60, REF_CAL = 0.58;
const weapons = {};
for (const [id, cls] of Object.entries(SMALL)) {
  const w = kit.weapons[id]; if (!w) continue; const cal = caliberOf(w); let grains, tier, basis;
  if (['m1861_springfield', 'm1855_springfield', 'harpers_ferry_rifle_m1855'].includes(id)) { grains = REF_GR; tier = 'documented'; basis = 'Gibbon 1860: charge of the new rifled musket is sixty grains of musket powder (drill/drill_infantry.json INF-AMMO-06); the M1855 and M1861 are the arms that manual names; other arms of the same family follow'; }
  else { const c = cal || REF_CAL; grains = Math.round(REF_GR * (c / REF_CAL) ** 2 * 10) / 10; tier = 'plausible-procedural'; basis = `no charge for this arm in the repository (open gap FX-G10): scaled from the documented 60 grains at .58 by bore area (${c} in${cal ? '' : ', caliber not in kit data, taken as .58'})`; }
  weapons[id] = { id, label: w.label, class: cls, kit_category: w.category, caliber_in: cal, charge: { grains, kg: +(grains * GRAIN).toPrecision(9), tier, basis }, rate_per_min: (w.specs && w.specs.rate_rounds_per_min) || null, placeholder: !!w.placeholder, barred: !!w.barred };
}
const GUNCLASS = { '6pdr_field_gun': 'field_gun', napoleon_12pdr_m1857: 'field_gun', '12pdr_howitzer': 'howitzer', '12pdr_mountain_howitzer': 'howitzer', '24pdr_howitzer': 'howitzer', '10pdr_parrott': 'field_gun', '3inch_ordnance_rifle': 'field_gun', '14pdr_james_rifle': 'field_gun', '20pdr_parrott': 'field_gun', '12pdr_whitworth': 'field_gun', blakely_12pdr: 'field_gun', '3inch_navy_rifle': 'field_gun', ames_rifled_bronze_napoleon: 'field_gun' };
const MANUAL_CHARGE = { '6pdr_field_gun': 1.25, napoleon_12pdr_m1857: 2.5, '12pdr_howitzer': 1.0, '24pdr_howitzer': 2.0 };   // ORD-CHG-FA (Instruction for Field Artillery 1863, service charges)
const STAND_IN_GAP = 1.0;
for (const [id, p] of Object.entries(kit.artillery.pieces)) {
  const cls = GUNCLASS[id]; if (!cls) continue; const lb = p.table && typeof p.table.charge_lb === 'number' ? p.table.charge_lb : null; let c, tier, basis;
  if (MANUAL_CHARGE[id] != null) { c = MANUAL_CHARGE[id]; tier = 'documented'; basis = 'Instruction for Field Artillery 1863 service charge (drill/ordnance_tables.json ORD-CHG-FA); the kit table agrees'; }
  else if (lb != null) { c = lb; tier = p.tier === 'documented' ? 'documented' : 'inferred'; basis = `kit/weapons.json artillery.pieces.${id}.table.charge_lb (source ${p.table_source_keys && p.table_source_keys.join(', ')}; kit tier ${p.tier}: weak source)`; }
  else { c = STAND_IN_GAP; tier = 'plausible-procedural'; basis = 'piece is a gap row in the kit data (no table): stand-in 1.0 lb (open gap FX-G10)'; }
  const byProj = {};
  if (id === 'napoleon_12pdr_m1857') { byProj.shell = { lb: 2.0, tier: 'inferred', basis: 'kit extra_detail: powder 2.0 lb for common shell (Wikipedia M1857 Napoleon, weak source); Gibbon ORD-RNG-GB-NEW12 prints the shell charge 2.0 lb for the new 12-pdr (documented)' }; }
  if (id === '12pdr_howitzer') byProj.case = { lb: 0.75, tier: 'documented', basis: 'Gibbon 1860 ORD-RNG-GB-12HOW: spherical case 0.75 lb' };
  if (id === '6pdr_field_gun') byProj.case = { lb: 1.0, tier: 'documented', basis: 'Gibbon 1860 ORD-RNG-GB-6: spherical case 1.0 lb' };
  weapons[id] = { id, label: p.label, class: cls, kit_category: 'artillery', bore_in: p.table && p.table.bore_in, charge: { lb: c, kg: +(c * LB).toPrecision(9), tier, basis }, charge_by_proj: Object.fromEntries(Object.entries(byProj).map(([k, v]) => [k, { lb: v.lb, kg: +(v.lb * LB).toPrecision(9), tier: v.tier, basis: v.basis }])), rifled: /rifle|parrott|james|whitworth|blakely/.test(id), projectile_lb: p.table && p.table.projectile_lb, mv_ft_s: p.table && p.table.muzzle_velocity_ft_s, range_5deg_yd: p.table && p.table.range_5deg_yd };
}
const AUDIO_TO_KIT = { springfield_m1861: 'm1861_springfield', springfield_m1863: 'm1863_rifle_musket', enfield_p1853: 'p1853_enfield', lorenz_m1854: 'lorenz_m1854', smoothbore_m1842: 'm1842_smoothbore', sharps_carbine_or_rifle: 'sharps_carbine', burnside_carbine: 'burnside_carbine', spencer_carbine: 'spencer_repeater', henry_rifle: 'henry_rifle', revolver_colt_remington: 'colt_army_1860', napoleon_12pdr: 'napoleon_12pdr_m1857', ordnance_rifle_3in: '3inch_ordnance_rifle', parrott_10pdr: '10pdr_parrott', parrott_20pdr: '20pdr_parrott', whitworth_12pdr: '12pdr_whitworth', blakely_rifle: 'blakely_12pdr', howitzer_12pdr: '12pdr_howitzer', howitzer_24pdr: '24pdr_howitzer' };
const aliases = { audio_ids: {}, classes: { musket: 'm1861_springfield', rifle: 'm1861_springfield', rifle_musket: 'm1861_springfield', smoothbore: 'm1842_smoothbore', carbine: 'sharps_carbine', repeater: 'spencer_repeater', revolver: 'colt_army_1860', pistol: 'colt_army_1860', gun: 'napoleon_12pdr_m1857', cannon: 'napoleon_12pdr_m1857', napoleon: 'napoleon_12pdr_m1857', rifled_gun: '3inch_ordnance_rifle', howitzer: '12pdr_howitzer', long_arm: 'm1861_springfield', handgun: 'colt_army_1860' }, bus_kinds: { note: 'BT-EVENTS weaponKind classes when info.weaponId is null: the stand-in is counted as unknownWeapon and flagged', carbine: 'sharps_carbine', repeater: 'spencer_repeater', cannon: 'napoleon_12pdr_m1857' } };
aliases.classes.carbine = 'sharps_carbine'; aliases.classes.repeater = 'spencer_repeater'; aliases.classes.cannon = 'napoleon_12pdr_m1857';
for (const w of audio.weapons) { const k = AUDIO_TO_KIT[w.name]; if (k && weapons[k]) aliases.audio_ids[w.id] = k; else throw new Error('audio weapon ' + w.name + ' has no kit mapping'); }
const PROJ = audio.projectiles;   // index = FIRE_EVENT proj code

// ---- fires: windows from the structure schedule, positions from structures3d
const sched = J('structures/state_schedule.json'), s3d = JSON.parse(fs.readFileSync(path.join(APP, 'data', 'structures3d.json'), 'utf8'));
const row = id => sched.rows.find(r => r.id === id); const pt = id => { const p = s3d.points.find(x => x.id === id); if (!p) throw new Error('no point ' + id); return { lng: p.pt[0], lat: p.pt[1], err_m: p.err, point_id: id, name: p.name }; };
const scen = r => { const o = { default: { window: r.time.window.slice(0, 2), granularity: r.time.granularity, basis: 'row ' + r.id + ' printed window' } }; for (const [k, v] of Object.entries(r.scenarios || {})) if (v.window) o[k] = { window: v.window.slice(0, 2), granularity: r.time.granularity, basis: v.src || v.note || ('row ' + r.id + ' scenario ' + k) }; return o; };
const fires = [
  { id: 'fx-fire-sherfy-barn', label: 'Sherfy barn', kind: 'barn', struct_id: 'bld-sherfy-farm#barn', row: 'S-037', tier: row('S-037').tier, pos: pt('STR-SHERFY-BARN1'), windows: scen(row('S-037')), ruined_by: null, cause: 'shell ignition (GD-12590, CWT-Sherfy) or other: three alternatives carried in the row', flags: ['timing conflict: PDF B.8.7 prints Jul 3 afternoon as the most-supported reading, C-026 prints Jul 2 evening (PENDING OWNER)', 'part of day is not parsed into the window (the structures layer does the same)'], source_keys: row('S-037').source_keys, timeline: ['T3-132'] },
  { id: 'fx-fire-bliss-barn', label: 'Bliss barn', kind: 'barn', struct_id: 'bld-bliss-farm#barn', row: 'S-052', tier: row('S-052').tier, pos: pt('STR-BLISS-BARN1'), windows: scen(row('S-052')), ruined_by: { t: '1863-07-03T13:00', basis: 'both buildings are ruined before the cannonade (T3-055); the cannonade start about 13:00 is printed elsewhere (G-14, S-061), not as a window bound in the schedule', tier: 'inferred' }, cause: 'burned deliberately by order, with hay, straw and cartridge paper, by the 14th Connecticut (T3-055)', flags: ['exact clock time open (B.8.2)', 'two Warren-plate symbols bracket the NPS marker; which is house and which barn is unresolved (structures3d), so both are drawn as the two Bliss buildings'], source_keys: row('S-052').source_keys, timeline: ['T3-055'] },
  { id: 'fx-fire-bliss-house', label: 'Bliss house', kind: 'house', struct_id: 'bld-bliss-farm#house', row: 'S-052', tier: row('S-052').tier, pos: pt('STR-BLISS-HOUSE1'), windows: scen(row('S-052')), ruined_by: { t: '1863-07-03T13:00', basis: 'see fx-fire-bliss-barn', tier: 'inferred' }, cause: 'burned deliberately by order (T3-055)', flags: ['exact clock time open (B.8.2)'], source_keys: row('S-052').source_keys, timeline: ['T3-055'] },
  { id: 'fx-fire-rock-creek-trestle', label: 'Gettysburg Railroad trestle over Rock Creek', kind: 'small', struct_id: 'bld-rock-creek-rr-bridge', row: 'S-001', tier: row('S-001').tier, pos: pt('RL-007'), windows: scen(row('S-001')), ruined_by: null, cause: 'burned by Early\'s troops (T1-016)', flags: ['sources vary: 26 or 27 June', 'the structures point note says 27 June; the schedule carries both'], source_keys: row('S-001').source_keys, timeline: ['T1-016'] },
  { id: 'fx-fire-rail-cars-station', label: 'Rail cars at the Gettysburg station area', kind: 'small', struct_id: null, row: null, tier: 'documented', pos: pt('RL-006'), windows: { default: { window: ['1863-06-26T00:00', '1863-06-26T23:59'], granularity: 'date', basis: 'T1-015 "Jun 26 evening"; "whether burnings were evening or earlier not stated" (the part of day is not parsed into the window)' } }, ruined_by: null, cause: 'burned by Early\'s troops (T1-015, W-BG); the depot itself did not burn (it was a hospital)', flags: ['position is the depot point (err 15 m): the PDF says "station area"; the covered bridge burned at the same time has NO position in the repository (open gap FX-G03) and is not drawn'], source_keys: ['W-BG'], timeline: ['T1-015'] },
];
const firesDoc = {
  meta: { schema: 'fx3d-fires-1', built_by: 'app/tools/build-fx3d-data.mjs', note: 'Fire windows are the windows of structures/state_schedule.json (date-granular unless a clock is printed). A fire with a date-only window is drawn at params.fire.uncertain_intensity and marked "time uncertain" inside its window; it is never given an invented ignition time. Flames never exist before the window start; a host that knows the cause (a shell strike on the barn) may call ignite(fireId, t) with t inside the window and the fire then starts exactly there.' },
  sources: fires,
  host_placed: {
    horse_carcass: { kind: 'small', tier: 'documented (the burning), plausible-procedural (where and how long)', window: ['1863-07-04T00:00', null], granularity: 'date', basis: 'T3-150 "Jul 4 morning ... horses (3,000-5,000 animals) are burned with kerosene where possible"; W-GNC, W-BG; no positions or end date recorded (open gap FX-G13)' },
    campfire: { kind: 'camp', tier: 'plausible-procedural', basis: 'PDF T1 night rows and B.8 camp life: campfires and cooking in rear camps; no fires on contact lines; no sourced positions (open gap FX-G15)' },
  },
  never_burn: sched.rules.filter(r => r.kind === 'never_state' || r.kind === 'not_before').filter(r => /burn/.test(r.forbidden_state_regex || '')).map(r => ({ rule: r.id, structs: r.structs, kind: r.kind, from: r.forbidden_from || null, to: r.forbidden_to || null, not_before: r.not_before || null, source: r.source })),
  not_fires: [
    { what: 'Wheatfield fire', why: 'The repository has no documented wheat-field fire. Row S-033 reads "Trampled / clipped by fire" (forum citing Pfanz, low reliability): fire there means gunfire. Nothing drawn (gap FX-G01).' },
    { what: 'Rogers house, Schmucker Hall (Seminary), McPherson barn', why: 'Documented as NOT burned: Rogers stays and shelters (SS-ROGERS); Schmucker Hall is a hospital; the McPherson barn did not burn (rule RULE-01), the house burned in 1895. Nothing drawn (gap FX-G02).' },
    { what: 'Caledonia Furnace (Jun 26) and the Gettysburg covered bridge (Jun 26)', why: 'Burning documented (T1-005, T1-015) but no position in the repository; the furnace is about 2 miles out on the Cashtown road, off the loaded terrain. Not drawn (gap FX-G03).' },
    { what: 'Leister and Thompson fence rails "burned"', why: 'Cause (shell fire or firewood) and extent not recorded: S-059, T3-067 ("burned for firewood"). No flame drawn (gap FX-G14).' },
    { what: 'Taney house', why: 'S-053 says shelled, ruins; no fire documented.' },
  ],
};

// ---- gaps (Evidence-Gap Register format; mirrored in GOVERNANCE/register/EG-FX-*.md)
const gaps = [
  ['FX-G01', 'Wheatfield fire', 'No documented wheat-field fire; S-033 uses "fire" for gunfire (forum citing Pfanz, low reliability).', 'Not drawn. Trampling is the structures layer\'s business.', 'documented (absence)', 'R06, R13'],
  ['FX-G02', 'Rogers house, Schmucker Hall, other buildings burned', 'Only fires documented in the repository are built (Sherfy barn, Bliss house and barn, Rock Creek trestle, rail cars at the station, carcass fires). Rogers, Schmucker and the McPherson barn did not burn (rule RULE-01).', 'Not drawn.', 'documented (absence)', 'R06'],
  ['FX-G03', 'Caledonia Furnace and the Gettysburg covered bridge', 'Burning documented (T1-005, T1-015, W-BG) but no position for either in the structures data.', 'Not drawn. A position needs a source (HABS, 1850s maps).', 'open gap', 'R06, R13'],
  ['FX-G04', 'Common-shell bursting charge', 'The repository holds the 1.0 oz spherical-case bursting charge (ORD-PRJ-CASE) but no shell charge.', 'Stand-in 1.5 oz (plausible-procedural), marked.', 'plausible-procedural', 'R13'],
  ['FX-G05', 'Canister cone angle and ground-strike pattern', 'PDF B.6.14.2 gives 27 balls inside 350-400 yd; no spread angle.', 'Fan half-angle 12 degrees (plausible-procedural), marked.', 'plausible-procedural', 'R13'],
  ['FX-G06', 'Smoke, dust and flame physics of 1863', 'The PDF supplies no measured smoke yield, extinction, plume rise, flame length or dust yield; T2-122 is itself plausible-procedural ("sector-by-sector smoke accounts were not found").', 'Physically coherent look parameters, every one tier-marked in TIERS.json; the benchmark is the plan\'s G12 band (flash 80-150 ms, plume 15-25 s, dirt column 10-25 m).', 'plausible-procedural', 'R13, R17'],
  ['FX-G07', 'March cadence and dust accounts', 'drill/*.json has no marching cadence; the PDF says "no direct dust accounts".', 'Gait comes from the animation; 90 steps/min fallback, marked inferred. Dust drawn only when the ground is dry by the wetness model.', 'inferred', 'R13'],
  ['FX-G08', 'Fire timing inside date-only windows, and burn durations', 'Sherfy barn (Jul 2 evening to Jul 3 afternoon), Bliss (Jul 3 morning), trestle (Jun 26 or 27): the part of the day is not recorded; no burn duration is recorded for any building.', 'Fire drawn at half intensity and marked "time uncertain" inside the window; growth, peak and decline times are plausible-procedural. The owner picks a scenario or a clock (PENDING OWNER).', 'plausible-procedural', 'R06, R13'],
  ['FX-G09', 'Wind speed and direction', 'Speed conflict 2 vs 12 mph (CF-WIND-SPEED, PENDING OWNER); direction not recorded for Jun 26-30 and Jul 4; "no breeze during the Charge" is qualitative.', 'The effects follow the environment layer\'s chosen scenario; unrecorded days use S-SSW and are flagged; Jul 3 13:00-16:30 wind scaled by params.wind.calm_charge_scale.', 'inferred', 'R13'],
  ['FX-G10', 'Powder charge of small arms other than the .58 rifle-musket; charges of rifled field guns and gap pieces', 'Only the 60-grain rifled-musket charge and the smoothbore field-gun and howitzer service charges are in printed manuals in the repository.', 'Other arms scaled by bore area from the documented 60 grains (plausible-procedural); rifled guns use the kit table (inferred, weak source).', 'plausible-procedural', 'R13'],
  ['FX-G11', 'Muzzle-flash jet length and duration per weapon', 'Only the project\'s own estimates exist (audio/contract/FIRE_EVENT.md section 3; render G12): "tens of ms", "several metres", "50-100 ms" and "80-150 ms".', 'Jet length L = k * cbrt(charge) with k fitted to those words; duration carried as the union range.', 'plausible-procedural', 'R13'],
  ['FX-G12', 'Fuse trails at night', 'The plan lists fuse trails as a night light source (T2-203) and marks it plausible-procedural ("no night-light accounts were found").', 'Drawn for timed-fuze projectiles only (shell, spherical case), never for solid shot, canister or percussion rifled shell; marked.', 'plausible-procedural', 'R13'],
  ['FX-G13', 'Horse-carcass fires: where and until when', '3,000-5,000 horses burned with kerosene "where possible" from Jul 4 (T3-150); no positions, no end.', 'Host places them; window starts Jul 4 00:00 (date only); marked.', 'plausible-procedural', 'R06, R13'],
  ['FX-G14', 'Burning fence rails', 'Leister rails burned (S-059), Thompson fences burned for firewood (T3-067): cause and extent unrecorded.', 'No flame drawn.', 'open gap', 'R06'],
  ['FX-G15', 'Camp-fire positions', 'Rear camp fires are plausible-procedural in the PDF; no positions recorded.', 'Host-placed; refused within params.fire.campfire.contact_clearance_m of an enemy or a firing line.', 'plausible-procedural', 'R13'],
  ['FX-G16', 'Nothing seen', 'Rule for this round: no browser, no GPU. The shader code (WebGL2 and WebGPU), the look, the performance and the lighting are unverified.', 'BROWSER-VERIFICATION-LIST-FX3D.md lists every check.', 'open gap', 'R13, R17'],
].map(([id, title, desc, subst, tier, rids]) => ({ id, title, description: desc, substitute: subst, tier, requirement_ids: rids.split(', '), status: 'open' }));

const write = (f, o) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(o, null, 1) + '\n');
write('params.json', { meta: { schema: 'fx3d-params-1', built_by: 'app/tools/build-fx3d-data.mjs', note: 'plain values; the tier and basis of each path are in TIERS.json' }, ...values });
write('TIERS.json', { meta: { schema: 'fx3d-tiers-1', built_by: 'app/tools/build-fx3d-data.mjs', legend: { documented: 'a printed source in the repository supports exactly this number', inferred: 'reasoned from documented numbers or the plan\'s own text', 'plausible-procedural': 'a look parameter; no source; marked in the product' }, tracers: 'No tracer effect exists for muskets (none in 1863). Fuse trails exist for timed-fuze shell and spherical case only (T2-203).' }, params: tiers, weapons: Object.fromEntries(Object.values(weapons).map(w => [w.id, { class: w.class, charge_tier: w.charge.tier, charge_basis: w.charge.basis, by_proj: w.charge_by_proj ? Object.fromEntries(Object.entries(w.charge_by_proj).map(([k, v]) => [k, v.tier])) : undefined }])), fires: Object.fromEntries(fires.map(f => [f.id, { schedule_tier: f.tier, window_granularity: Object.values(f.windows)[0].granularity, flames_tier: 'plausible-procedural', occurrence_tier: f.tier }])) });
write('weapons.json', { meta: { schema: 'fx3d-weapons-1', built_by: 'app/tools/build-fx3d-data.mjs', sources: ['kit/weapons.json', 'audio/contract/weapons.json', 'drill/drill_infantry.json INF-AMMO-06', 'drill/ordnance_tables.json ORD-CHG-FA'], proj_codes: PROJ }, weapons, aliases });
write('fires.json', firesDoc);
write('GAPS.json', { meta: { schema: 'fx3d-gaps-1', note: 'Evidence-Gap Register entries of the FX part; also written as GOVERNANCE/register/EG-FX-nn.md' }, gaps });
console.log('fx3d data: ' + Object.keys(weapons).length + ' weapons, ' + fires.length + ' fire sources, ' + Object.keys(tiers).length + ' tiered parameters, ' + gaps.length + ' gaps');

// ---- Evidence-Gap Register entries (GOVERNANCE/register/EG-FX-nn.md, same table as EG-0001). register_index.json is generated by tools/bt/seed_register.py and is NOT edited here;
// until seed_register_data.py lists these ids the files stand beside the index (check_governance.py only checks index -> file).
const REG = path.join(BT, 'GOVERNANCE', 'register');
for (const g of gaps) {
  const md = `# EG-${g.id}: ${g.title}

| Field | Content |
|---|---|
| ID | EG-${g.id} |
| Requirement IDs | ${g.requirement_ids.join(', ')} |
| Category | ${g.tier === 'open gap' ? 'evidence missing' : g.tier === 'documented (absence)' ? 'documented absence (nothing to draw)' : 'physics / look parameter not recorded'} |
| Description | ${g.description} |
| Why literal 100% is not possible or blocked | ${g.tier === 'documented (absence)' ? 'The repository documents that the thing did not happen or is not a fire; drawing it would be an invention (Law cl.4).' : 'No source in the repository gives the value or position; the plan itself marks smoke, dust and flame plausible-procedural (C.5, T2-122, T2-203).'} |
| Evidence searched | docs/battle-theatre/BIBLE/plan-clean.txt (smoke, dust, burn, fire, fuse, flash, barn), structures/state_schedule.json, structures/STRUCTURES-NOTES.md, kit/weapons.json, drill/ordnance_tables.json, drill/drill_infantry.json, environment/weather_timeline.json, audio/contract/FIRE_EVENT.md, render/PLAN.md (G12). No external search in this round. |
| Autonomous substitute applied | ${g.substitute} |
| Strongest evidence-based reconstruction | ${g.substitute} |
| Confidence tier | ${g.tier === 'open gap' || g.tier === 'documented (absence)' ? 'plausible-procedural' : g.tier} |
| Competing values | - |
| Product marking | Tier overlay on every effect; fires of uncertain time carry a "time uncertain" marker; the effects panel states the share of particles drawn. Parameter tiers: app/data/fx3d/TIERS.json. |
| Visual and audio impact | Smoke, flash, dust and fire layer of the Battle Theatre |
| Review status | internal review only (DEC-006: no public review label); nothing seen in a browser yet (EG-FX-16) |
| Owner decision requested | ${g.id === 'FX-G08' ? 'Pick a scenario or give a clock for the Sherfy barn and the Bliss fires (PD-01 and the Bliss row)' : g.id === 'FX-G09' ? 'Choose the wind-speed scenario (CF-WIND-SPEED)' : 'None needed now; evidence welcome'} |
| Agent recommendation | Keep the substitute, keep it marked; replace it when a source is found. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
`;
  fs.writeFileSync(path.join(REG, 'EG-' + g.id + '.md'), md);
}
