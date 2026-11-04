// Visual specification of every kit catalogue item (kit/kit_specs.json items, 191) and every weapon record (kit/weapons.json weapons, 45): which generator and which colour words.
// The COLOUR WORDS and CUT NAMES come from the item labels (tier = the item's tier in the manifest); the RGB values are palette.mjs (plausible-procedural); the dimensions are in the generators.
// `opts` = alternative colourings the label allows ("brown/gray/black", "gray or butternut"); a man's seed picks one (equal weights: tuning parameter, F-GAP-COLOUR-SHARE).
// `barred` items must never appear in a manifest (anachronism list); they map to a GAP-coloured generic so a leak is visible, never silent. `gap` = the item is a GAP PLACEHOLDER in the kit data.
import { MAT } from './palette.mjs';

const C = MAT;
// ---- headgear: kind (garments.HAT_KINDS), HEADGEAR colour, HEAD_TRIM (cord/band) colour
const hat = (kind, c, trim = 'brass', extra = {}) => ({ slot: 'headgear', kind, col: { HEADGEAR: c, HEAD_TRIM: trim }, ...extra });
const HEAD = {
  kepi_m1858: hat('kepi', 'union_dark_blue', 'union_dark_blue'), hardee_hat_m1858: hat('hardee', 'black_felt', 'light_blue_piping'), hardee_hat_iron_brigade: hat('hardee', 'black_felt', 'light_blue_piping', { badge_on_hat: true }),
  slouch_hat_civilian: hat('slouch', 'black_felt', 'black_felt'), generals_kepi_velvet_band: hat('kepi', 'union_dark_blue', 'black_felt'), fez_red_114pa: hat('fez', 'fez_red', 'tassel_gold'), fez_red_146ny: hat('fez', 'fez_red', 'tassel_gold'),
  turban_white_parade: hat('turban', 'fez_red', 'tassel_gold'), forage_cap_dark_blue_44ny: hat('forage', 'union_dark_blue', 'union_dark_blue'), black_plumed_hat_39ny: hat('garibaldi', 'black_felt', 'black_felt'),
  fez_red_5ny_reference: hat('fez', 'fez_red', 'tassel_gold', { reference_only: true }), kepi_green_berdan: hat('kepi', 'berdan_green', 'berdan_green'), slouch_hat_berdan: hat('slouch', 'berdan_green_hat', 'berdan_green_hat'),
  kepi_ambulance_green_band: hat('kepi', 'union_dark_blue', 'green_band'), kepi_irish_boxwood_sprig: hat('sprig', 'union_dark_blue', 'union_dark_blue'), cap_deer_tail: hat('deertail_kepi', 'union_dark_blue', 'union_dark_blue'),
  hardee_hat_cavalry_union: hat('hardee', 'black_felt', 'yellow_piping'), green_hatband_generic: hat('slouch', 'black_felt', 'green_band', { barred: true }),
  slouch_hat_cs: { slot: 'headgear', kind: 'slouch', opts: [{ HEADGEAR: 'cs_slouch_brown', HEAD_TRIM: 'cs_slouch_brown' }, { HEADGEAR: 'cs_slouch_gray', HEAD_TRIM: 'cs_slouch_gray' }, { HEADGEAR: 'cs_slouch_black', HEAD_TRIM: 'cs_slouch_black' }] },
  straw_hat_cs: hat('straw', 'straw', 'straw'), plain_cap_cs: hat('cap', 'cs_gray', 'cs_gray'), kepi_cs: hat('kepi', 'cs_gray', 'cs_gray'),
  hardee_hat_cs_cavalry: { slot: 'headgear', kind: 'hardee', opts: [{ HEADGEAR: 'cs_slouch_black', HEAD_TRIM: 'yellow_piping' }, { HEADGEAR: 'cs_slouch_brown', HEAD_TRIM: 'yellow_piping' }] },
  hat_wheats_tiger: hat('slouch', 'gap_marker', 'gap_marker', { barred: true }), zouave_dress_unspecified_headgear: hat('fez', 'gap_marker', 'gap_marker', { gap: true }),
};
// ---- coats: cut (garments.COAT_CUTS), COAT, COAT_TRIM, button material, decorations
const coat = (cut, c, trim = null, extra = {}) => ({ slot: 'coat', cut, col: { COAT: c, COAT_TRIM: trim ?? c }, ...extra });
const BLU = [{ COAT: 'union_dark_blue', COAT_TRIM: 'union_dark_blue' }, { COAT: 'union_blue_medium', COAT_TRIM: 'union_blue_medium' }];
const CSG = c => [{ COAT: 'cs_gray', COAT_TRIM: c ?? 'cs_gray' }, { COAT: 'cs_butternut', COAT_TRIM: c ?? 'cs_butternut' }];
const COAT = {
  sack_coat_union: { slot: 'coat', cut: 'sack', opts: BLU }, frock_coat_union: coat('frock', 'union_dark_blue', 'light_blue_piping'), frock_coat_iron_brigade: coat('frock', 'union_dark_blue', 'light_blue_piping'),
  frock_coat_officer_single: coat('frock', 'union_dark_blue', 'union_dark_blue', { officer: true }), frock_coat_officer_double: coat('frock_double', 'union_dark_blue', 'black_felt', { officer: true }),
  sack_coat_officer_straps: { slot: 'coat', cut: 'sack', opts: BLU, deco: ['straps'] }, fatigue_dress_no_straps_meade: coat('sack', 'union_dark_blue', 'union_dark_blue', { named: true }),
  zouave_jacket_114pa: coat('zouave', 'union_dark_blue', 'zouave_red'), zouave_jacket_146ny: coat('zouave', 'zouave_sky', 'yellow_piping'), zouave_jacket_44ny_original: coat('zouave', 'union_dark_blue', 'zouave_red'),
  bersaglieri_tunic_39ny: coat('tunic6', 'union_dark_blue', 'zouave_red'), zouave_jacket_5ny_reference: coat('zouave', 'union_dark_blue', 'zouave_red', { reference_only: true }),
  berdan_green_frock_coat: coat('frock', 'berdan_green', 'berdan_green', { buttons: 'black' }), berdan_modified_blue_coat: { slot: 'coat', cut: 'sack', opts: BLU },
  sack_coat_regulars_fatigue: { slot: 'coat', cut: 'sack', opts: BLU }, mounted_jacket_cavalry_union: coat('short_jacket', 'union_dark_blue', 'yellow_piping'), jacket_artillery_red_trim: coat('short_jacket', 'union_dark_blue', 'red_piping'),
  frock_coat_artillery_red_trim: coat('frock', 'union_dark_blue', 'red_piping'), short_shell_jacket_union: coat('short_jacket', 'union_dark_blue', 'union_dark_blue'),
  sack_coat_ambulance_green_chevron: { slot: 'coat', cut: 'sack', opts: BLU, deco: ['green_chevrons'] }, coat_surgeon_dark_blue_green_sash: coat('frock', 'union_dark_blue', 'union_dark_blue', { officer: true }),
  coat_civilian_style: { slot: 'coat', cut: 'civilian', opts: [{ COAT: 'cs_brown', COAT_TRIM: 'cs_brown' }, { COAT: 'cs_gray', COAT_TRIM: 'cs_gray' }, { COAT: 'black_felt', COAT_TRIM: 'black_felt' }] },
  birdcage_braid_musician: { slot: 'coat', cut: 'sack', opts: BLU, deco: ['birdcage_braid'], trimCol: 'light_blue_piping' }, chevrons_branch_color: { slot: 'coat', cut: 'sack', opts: BLU, deco: ['chevrons'], trimCol: 'light_blue_piping' },
  cs_type_ii_jacket: { slot: 'coat', cut: 'shell_cs', opts: CSG() }, cs_type_i_jacket: { slot: 'coat', cut: 'shell_cs', opts: CSG() }, cs_civilian_coat: { slot: 'coat', cut: 'civilian', opts: [{ COAT: 'cs_brown', COAT_TRIM: 'cs_brown' }, { COAT: 'cs_gray', COAT_TRIM: 'cs_gray' }, { COAT: 'black_felt', COAT_TRIM: 'black_felt' }] },
  cs_frock_coat: { slot: 'coat', cut: 'frock', opts: CSG() }, cs_captured_union_blue_item: coat('sack', 'cs_blue_captured', 'cs_blue_captured', { captured: true }), cs_cavalry_shell_jacket: { slot: 'coat', cut: 'short_jacket', opts: CSG('yellow_piping') },
  cs_artillery_jacket_red_trim: { slot: 'coat', cut: 'shell_cs', opts: CSG('red_piping') }, cs_artillery_jacket_untrimmed: { slot: 'coat', cut: 'shell_cs', opts: CSG() }, cs_officer_frock_or_shell: { slot: 'coat', cut: 'frock', opts: CSG(), officer: true, deco: ['collar_insignia'] },
  cs_pickett_double_breasted_gold: coat('frock_double', 'cs_gray', 'cs_gray', { named: true, buttons: 'gold', officer: true }),
  cs_type_iii_jacket: coat('shell_cs', 'gap_marker', 'gap_marker', { barred: true }), cs_transitional_kersey_jacket: coat('shell_cs', 'gap_marker', 'gap_marker', { barred: true }), dress_coppens_zouave: coat('zouave', 'gap_marker', 'gap_marker', { barred: true }), jacket_tiger_zouave_style: coat('zouave', 'gap_marker', 'gap_marker', { barred: true }),
  zouave_dress_unspecified_coat: coat('zouave', 'gap_marker', 'gap_marker', { gap: true }),
};
// ---- trousers
const trs = (cut, c, o = {}) => ({ slot: 'trousers', cut, col: { TROUSERS: c, TROUSER_TRIM: o.stripe ?? c }, ...o });
const TROUSERS = {
  trousers_sky_blue_kersey: trs('straight', 'sky_blue', { fades: true }), trousers_dark_blue_union: trs('straight', 'dark_blue_trousers'), trousers_civilian_replacement: { slot: 'trousers', cut: 'loose', opts: [{ TROUSERS: 'cs_brown', TROUSER_TRIM: 'cs_brown' }, { TROUSERS: 'cs_gray_trousers', TROUSER_TRIM: 'cs_gray_trousers' }, { TROUSERS: 'dark_blue_trousers', TROUSER_TRIM: 'dark_blue_trousers' }] },
  trousers_sky_blue_reinforced_seat: trs('straight', 'sky_blue', { seat: true, fades: true }), trousers_zouave_chasseur_114pa: trs('chasseur', 'zouave_madder'), trousers_zouave_baggy_146ny: trs('baggy', 'zouave_sky'),
  trousers_44ny_red_stripe: trs('straight', 'dark_blue_trousers', { stripe: 'zouave_red', hasStripe: true }), trousers_39ny_red_outseam: trs('straight', 'dark_blue_trousers', { stripe: 'zouave_red', hasStripe: true }), trousers_5ny_red_baggy_reference: trs('baggy', 'zouave_red', { reference_only: true }),
  trousers_berdan_green: trs('straight', 'berdan_green'), trousers_crimson_stripe_ordnance: trs('straight', 'dark_blue_trousers', { stripe: 'crimson', hasStripe: true }),
  trousers_cs_gray: trs('straight', 'cs_gray_trousers'), trousers_cs_brown: trs('straight', 'cs_brown'), trousers_cs_butternut: trs('straight', 'cs_butternut_trousers'), trousers_cs_captured_blue: trs('straight', 'cs_blue_captured', { captured: true }),
  trousers_cs_sky_blue_early: trs('straight', 'sky_blue', { fades: true }), trousers_cs_officer_dark_blue_stripe: trs('straight', 'cs_gray_trousers', { stripe: 'union_dark_blue', hasStripe: true }),
  zouave_dress_unspecified_trousers: trs('baggy', 'gap_marker', { gap: true }),
};
// ---- footwear / shirts
const shoe = (kind, o = {}) => ({ slot: 'shoes', kind, col: { BOOT: o.boot ?? 'black_leather', GAITER: o.gaiter ?? 'white_gaiter' }, ...o });
const SHOES = {
  brogan_jefferson: shoe('brogan'), worn_out_shoes_cs: shoe('worn', { minority: true }), barefoot_cs: shoe('barefoot', { minority: true }), gaiters_white_114pa: shoe('gaiter'), gaiters_white_146ny: shoe('gaiter'), gaiters_leather_44ny: shoe('gaiter', { gaiter: 'russet_leather' }),
  gaiters_white_39ny: shoe('gaiter'), gaiters_white_5ny_reference: shoe('gaiter', { reference_only: true }), gaiters_leather_berdan: shoe('gaiter', { gaiter: 'black_leather' }), leggings_white_iron_brigade: shoe('legging'), leggings_regulars: shoe('legging', { gaiter: 'canvas_natural' }),
  boots_unspecified_cav_union: shoe('boot_tall', { boot: 'gap_marker', gap: true }),
};
const SHIRTS = { shirt_wool_gray: { slot: 'shirt', col: { SHIRT: 'shirt_gray_wool' } }, shirt_white: { slot: 'shirt', col: { SHIRT: 'shirt_white' } }, shirt_plaid_flannel: { slot: 'shirt', col: { SHIRT: 'shirt_plaid' } }, shirt_red_zouave_44ny: { slot: 'shirt', col: { SHIRT: 'zouave_red' } },
  shirt_unspecified_cs: { slot: 'shirt', col: { SHIRT: 'gap_marker' }, gap: true }, shirt_unspecified_union_unit: { slot: 'shirt', col: { SHIRT: 'gap_marker' }, gap: true }, shirt_unspecified_cav: { slot: 'shirt', col: { SHIRT: 'gap_marker' }, gap: true } };
// ---- accoutrements: class (a bit of the instance mask), part (gear.mjs kind), style
export const ACC_CLASSES = ['belt', 'cartbox', 'cap_pouch', 'scabbard', 'canteen', 'haversack', 'knapsack', 'blanket', 'gum', 'cup', 'sash', 'poncho', 'overcoat', 'shelter', 'tools', 'cavalry'];
const acc = (cls, o = {}) => ({ slot: 'accoutrement', cls, ...o });
const ACCOUT = {
  belt_black_oval_us: acc('belt', { plate: 'oval_us' }), belt_rect_eagle_plate: acc('belt', { plate: 'rect_eagle' }), cs_belt_plain: acc('belt', { plate: 'plain' }), cs_belt_plate_captured_upside_down: acc('belt', { plate: 'upside_down', captured: true }),
  cartridge_box_union_40rd: acc('cartbox', { army: 'union' }), cs_cartridge_box: acc('cartbox', { army: 'confederate', sling: true }), cs_captured_us_box: acc('cartbox', { army: 'union', captured: true }),
  cap_pouch_union: acc('cap_pouch'), cs_cap_pouch: acc('cap_pouch'), bayonet_scabbard_union: acc('scabbard'), canteen_tin_cloth_cover: acc('canteen'), cs_canteen: acc('canteen', { wood: false, cs: true }),
  haversack_painted_canvas: acc('haversack', { painted: true }), cs_haversack: acc('haversack', { painted: false }), knapsack_black_painted: acc('knapsack'), cs_knapsack: acc('knapsack'), knapsack_prussian_fur_berdan: acc('knapsack', { fur: true }),
  blanket_roll_union: acc('blanket'), cs_blanket_roll_shoulder: acc('blanket'), gum_blanket: acc('gum'), cs_gum_blanket: acc('gum'), cs_groundcloth: acc('gum'), tin_cup: acc('cup'), cs_housewife_cup_plate: acc('cup'),
  sash_crimson_union: acc('sash', { col: 'crimson' }), sash_zouave_sky_blue_114pa: acc('sash', { col: 'zouave_sky', wide: true }), sash_zouave_red_146ny: acc('sash', { col: 'zouave_red', wide: true }), sash_zouave_5ny_reference: acc('sash', { col: 'zouave_red', wide: true, reference_only: true }),
  sash_red_artillery: acc('sash', { col: 'cs_red_sash' }), sash_yellow_cavalry: acc('sash', { col: 'yellow_piping' }), sash_red_cs: acc('sash', { col: 'cs_red_sash' }), sash_buff_general_cs: acc('sash', { col: 'buff_sash' }),
  m1858_sword_belt_cav: acc('cavalry'), holster_butt_forward_right: acc('cavalry'), carbine_box_m1860_or_sharps: acc('cavalry'), carbine_sling_roller_snap: acc('cavalry'),
  mcclellan_saddle_m1859: acc('horse_tack'), bridle_union_cav: acc('horse_tack'), horse_furniture_union_misc: acc('horse_tack'), overcoat_sky_blue_caped: acc('overcoat'), shelter_half: acc('shelter'), nco_sword_in_wagon: acc('none', { note: 'left in the wagons: not carried' }),
  rubber_poncho: acc('poncho'), tools_pioneer: acc('tools'),
};
// ---- badges (shape per corps from the kit corps_badges table; colour by division word)
const BADGE_SHAPE = { I: 'disc', II: 'trefoil', III: 'lozenge', V: 'maltese', VI: 'greek_cross', XI: 'crescent', XII: 'star', CAV: 'crossed_sabres' };
const BADGE = { badge_none: { slot: 'badge', none: true }, badge_corps_unresolved: { slot: 'badge', shape: 'disc', col: 'gap_marker', gap: true }, badge_XII_div1st: { slot: 'badge', shape: 'star', col: 'gap_marker', gap: true }, badge_XII_div2nd: { slot: 'badge', shape: 'star', col: 'gap_marker', gap: true },
  badge_CAV_crossed_sabers: { slot: 'badge', shape: 'crossed_sabres', col: 'gap_marker', gap: true } };
for (const k of ['I', 'II', 'III', 'V', 'VI', 'XI']) for (const d of ['red', 'white', 'blue']) if (!(k === 'III' && d === 'blue')) BADGE[`badge_${k}_${d}`] = { slot: 'badge', shape: BADGE_SHAPE[k], col: d === 'red' ? 'flag_red' : d === 'white' ? 'flag_white' : 'flag_blue' };
// ---- flags / instruments / state words
const FLAGS = {
  national_color_us: { slot: 'flag', flag: 'us_national', carries: 'staff' }, regimental_color_union: { slot: 'flag', flag: 'us_regimental_gap', carries: 'staff' }, flag_green_irish: { slot: 'flag', flag: 'irish_green_gap', carries: 'staff' }, guidon_swallowtail_cav: { slot: 'flag', flag: 'cav_guidon', carries: 'staff' },
  cs_anv_battle_flag: { slot: 'flag', flag: 'anv_battle', carries: 'staff' }, ambulance_corps_flag: { slot: 'flag', flag: 'ambulance_gap', carries: 'staff' }, flag_none: { slot: 'flag', none: true },
  drum: { slot: 'instrument', instr: 'drum' }, fife: { slot: 'instrument', instr: 'fife' }, bugle: { slot: 'instrument', instr: 'bugle' }, flag_set_wigwag: { slot: 'instrument', instr: 'wigwag' }, stretcher: { slot: 'instrument', instr: 'stretcher' },
};
const STATE = {
  pack_knapsack_on: { slot: 'pack_state', pack: 'knapsack' }, pack_blanket_roll_only: { slot: 'pack_state', pack: 'roll' }, pack_none_haversack_canteen: { slot: 'pack_state', pack: 'none' }, pack_dropped: { slot: 'pack_state', pack: 'none', dropped: true }, pack_used_as_cover: { slot: 'pack_state', pack: 'none', cover: true },
  bayonet_scabbarded: { slot: 'bayonet', state: 'scabbard' }, bayonet_fixed: { slot: 'bayonet', state: 'fixed' }, bayonet_absent: { slot: 'bayonet', state: 'none' }, bayonet_none_not_applicable: { slot: 'bayonet', state: 'none' },
  sidearm_none: { slot: 'sidearm', none: true }, sash_none: { slot: 'sash', none: true }, cs_pocket_revolver_or_pistol: { slot: 'sidearm', hand: 'revolver_generic' },
};
export const ITEM_VISUALS = { ...HEAD, ...COAT, ...TROUSERS, ...SHOES, ...SHIRTS, ...ACCOUT, ...BADGE, ...FLAGS, ...STATE };

// ---- weapons: spec for gear.buildLongArm / buildHandgun / buildSword (inches from the weapon records where they exist: dims 'record'; otherwise a marked placeholder: dims 'gap', tier gap G17)
const LA = (overall, barrel, bore, o = {}) => ({ type: 'long', spec: { overall_in: overall, barrel_in: barrel, bore_in: bore, kind: 'rifle_musket', bands: 3, ...o.spec }, dims: o.dims ?? 'record', notes: o.notes });
const CAR = (overall, barrel, bore, o = {}) => ({ type: 'long', spec: { overall_in: overall, barrel_in: barrel, bore_in: bore, kind: 'carbine', bands: 0, ...o.spec }, dims: o.dims ?? 'record', notes: o.notes });
export const WEAPON_VISUALS = {
  m1861_springfield: LA(56, 40, 0.58), m1863_rifle_musket: LA(56, 40, 0.58, { dims: 'gap', notes: 'pattern not specified in the record; drawn as the M1861 form' }), m1855_springfield: LA(56, 40, 0.58, { dims: 'record', notes: 'overall assumed from M1861 (not in the record); Maynard tape primer not modelled', spec: { brass_furniture: false } }),
  harpers_ferry_rifle_m1855: LA(49, 33, 0.58, { spec: { bands: 2 } }), m1841_mississippi: LA(48, 33, 0.58, { dims: 'gap', spec: { bands: 2, brass_furniture: true }, notes: 'overall/barrel not in the record (33-in barrel is from the Harpers Ferry row)' }),
  m1842_smoothbore: LA(58, 42, 0.69, { spec: { kind: 'musket' } }), buck_and_ball_load: { type: 'none', note: 'ammunition load, not an arm' }, p1853_enfield: LA(55, 39, 0.577, { spec: { brass_furniture: false } }),
  p1856_58_enfield_short: LA(48, 33, 0.577, { dims: 'gap', spec: { bands: 2 } }), lorenz_m1854: LA(52, 37.25, 0.54), richmond_rifle: LA(49, 33, 0.58, { dims: 'gap', spec: { bands: 2, brass_furniture: true } }),
  richmond_carbine: CAR(41, 25, 0.58), whitworth_rifle: LA(51, 36, 0.451, { spec: { kind: 'scoped', scope: true, bands: 2 }, dims: 'record', notes: 'barrels 33/36/39 in in the record; 36 drawn (middle value); the telescopic sight is a documented feature of the type but its presence on a given man is not' }),
  kerr_rifle: LA(52, 37, 0.442, { dims: 'gap', spec: { bands: 2 } }), enfield_musketoon: CAR(40, 24, 0.577, { dims: 'gap' }), imported_arms_not_covered: LA(55, 39, 0.577, { dims: 'gap' }),
  springfield_model_unspecified: LA(56, 40, 0.58, { dims: 'gap', notes: 'PLACEHOLDER weapon record: drawn as the M1861 form' }), smoothbore_69_musket_unspecified: LA(58, 42, 0.69, { dims: 'gap', spec: { kind: 'musket' } }),
  scoped_target_rifle: LA(48, 32, 0.45, { dims: 'gap', spec: { kind: 'scoped', scope: true, bands: 0 }, notes: 'custom target rifle; dimensions not in the record' }), field_finds_any_arm: { type: 'none', note: 'note row, not an arm' },
  sharps_rifle_m1859: LA(47, 30, 0.52, { spec: { bands: 2, kind: 'rifle_musket' }, notes: 'overall assumed (47 in is the Spencer figure used as a stand-in); barrel 30 in from the record' }), sharps_carbine: CAR(37, 22, 0.52, { dims: 'gap', notes: 'barrel not in the record' }),
  sharps_unspecified_pattern: LA(47, 30, 0.52, { dims: 'gap', spec: { bands: 2 } }), burnside_carbine: CAR(39, 21, 0.54), gallager_carbine: CAR(39, 22, 0.52, { dims: 'gap' }), smith_carbine: CAR(39, 21.5, 0.5, { dims: 'gap' }),
  merrill_carbine: CAR(39, 22, 0.54, { dims: 'gap' }), sharps_hankins_carbine: CAR(38, 21, 0.52, { dims: 'gap' }), spencer_repeater: LA(47, 30, 0.52, { spec: { bands: 2, butt_trap: true }, notes: 'rifle form (47/30 in) drawn; the carbine form is 39.25/22 in' }),
  henry_rifle: LA(43, 24, 0.44, { dims: 'gap', spec: { bands: 0, tube_under: true } }), revolving_and_other_breechloaders_gap: LA(48, 30, 0.56, { dims: 'gap', notes: 'gap row: generic breechloader' }),
  colt_army_1860: { type: 'hand', spec: { barrel_in: 8, kind: 'revolver' }, dims: 'record' }, colt_navy_1851: { type: 'hand', spec: { barrel_in: 7.5, kind: 'revolver' }, dims: 'gap' }, colt_36_unconfirmed: { type: 'hand', spec: { barrel_in: 7.5, kind: 'revolver' }, dims: 'gap' },
  remington_1858: { type: 'hand', spec: { barrel_in: 8, kind: 'revolver' }, dims: 'record' }, lemat: { type: 'hand', spec: { barrel_in: 6.75, kind: 'revolver' }, dims: 'gap' }, other_revolvers_gap: { type: 'hand', spec: { barrel_in: 7, kind: 'revolver' }, dims: 'gap' },
  revolver_unspecified: { type: 'hand', spec: { barrel_in: 6, kind: 'revolver' }, dims: 'gap' }, colt_pocket_revolver: { type: 'hand', spec: { barrel_in: 4.5, kind: 'revolver' }, dims: 'gap' },
  m1860_light_cav_saber: { type: 'sword', spec: { kind: 'saber', blade_in: 35, curve: 0.9, knuckle_bow: true, steel_scabbard: true }, dims: 'record' },
  m1840_heavy_saber: { type: 'sword', spec: { kind: 'saber', blade_in: 35, curve: 1.2, knuckle_bow: true, steel_scabbard: true, blade_w: 0.04 }, dims: 'gap' },
  m1840_nco_sword: { type: 'sword', spec: { kind: 'nco_sword', blade_in: 31, curve: 0, knuckle_bow: false, blade_w: 0.034 }, dims: 'gap' }, m1850_foot_officer_sword: { type: 'sword', spec: { kind: 'officer_sword', blade_in: 30, curve: 0, knuckle_bow: true, blade_w: 0.028 }, dims: 'gap' },
  socket_bayonet: { type: 'bayonet', dims: 'gap', note: 'socket bayonet: triangular blade (US), 18 in blade in gear.buildLongArm' }, bowie_knife: { type: 'knife', dims: 'gap' },
};
export const BADGE_SHAPES = Object.values(BADGE_SHAPE);
