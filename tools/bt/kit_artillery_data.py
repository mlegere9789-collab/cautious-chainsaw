"""Artillery piece specifications (PDF B.6.14.1), ammunition and fuzes (B.6.14.2), crew roles and drill states (B.6.14.3),
teams and vehicles (B.6.14.4).  'printed' blocks are PDF cell text with wrapped lines joined.

Tier rule: the B.6.14.1 core table prints 'tier: documented, secondary source' with ONE source (Wikipedia, Field artillery in the
ACW = weak class), so under CLAUDE.md Law cl.4 each cell is effective tier 'inferred', weak_source true.  Where a printed period
manual (Gibbon 1860, Instruction for Field Artillery 1863, Ordnance Manual 1861 - read after the PDF was written, see
docs/battle-theatre/drill/ordnance_tables.json) prints the same value, the cell carries a manual_confirmation record naming the
drill item ids and its tier is raised to 'documented' with the manual key added."""
from kit_sources import eff_tier

PIECES = {}


def P(pid, label, material, bore, tube_len, tube_wt, proj, charge, mv, rng5, *, extra=None, notes=None, conflicts=None, confirm=None, bore_note=None,
      material_note=None, army_note=None, gap_ids=()):
    row = {"material": material, "bore_in": bore, "tube_length_in": tube_len, "tube_weight_lb": tube_wt, "projectile_lb": proj, "charge_lb": charge,
           "muzzle_velocity_ft_s": mv, "range_5deg_yd": rng5}
    tier, weak, why = eff_tier("documented", ["Wiki-FieldArtACW"])
    d = {"id": pid, "label": label, "table": row, "table_printed_tier": "documented (secondary source)", "table_source_keys": ["Wiki-FieldArtACW"],
         "tier": tier, "weak_source": weak, "tier_note": why, "field_tiers": {k: {"tier": tier, "weak_source": weak, "source_keys": ["Wiki-FieldArtACW"]} for k in row},
         "extra_detail": extra, "notes": notes, "conflicts": conflicts or [], "manual_confirmation": [], "gap_ids": list(gap_ids)}
    if bore_note:
        d["bore_note"] = bore_note
    if material_note:
        d["material_note"] = material_note
    if army_note:
        d["army_note"] = army_note
    if confirm:
        for field, keys, items, verdict in confirm:
            d["manual_confirmation"].append({"field": field, "manual_keys": keys, "drill_item_ids": items, "verdict": verdict})
            ft = d["field_tiers"][field]
            ft.update({"tier": "documented", "weak_source": False, "source_keys": ft["source_keys"] + keys, "tier_note": "raised from inferred: printed period manual prints the same value (drill item ids listed)"})
    PIECES[pid] = d
    return d


P("6pdr_field_gun", "6-pdr field gun", "bronze", 3.67, 60, 884, 6.1, 1.25, 1439, 1523,
  confirm=[("range_5deg_yd", ["GIBBON-1860", "ORDNANCE-1861"], ["ORD-RNG-GB-6", "ORD-RNG-OM-6-12"], "1,523 printed in Gibbon and the Ordnance Manual; the Instruction for Field Artillery OCR reads 1,625 (unresolved)")],
  notes="6-pdr: Confederate use 1 gun in the StrategyPage inventory")
P("napoleon_12pdr_m1857", "M1857 12-pdr Napoleon", "bronze", 4.62, 66, 1227, 12.9, 2.50, 1440, 1619,
  extra={"printed": "Carriage 1,128 lb; bore length 63.6 in; powder 2.5 lb for shot and spherical case, 2.0 lb for common shell. Round shot 12.25 lb, 4.52 in diameter, 1,680 yd at 5 deg. Spherical case 12.1 lb with 78 balls, 1,135 yd at 3 deg 45 min. Common shell 12.3 lb, 1,300 yd at 3 deg 45 min. Canister 14.8 lb, 27 iron balls of about 1.49 in in four tiers. Gun with packed limber 3,865 lb. Every bronze smoothbore in the Army of the Potomac at Gettysburg was a Napoleon except two 12-pdr howitzers in the 2nd Connecticut battery. The Confederates had received 49 recast Napoleons by the battle.",
         "values": {"carriage_lb": 1128, "bore_length_in": 63.6, "powder_lb": {"shot_and_spherical_case": 2.5, "common_shell": 2.0}, "round_shot": {"weight_lb": 12.25, "diameter_in": 4.52, "range_5deg_yd": 1680},
                    "spherical_case": {"weight_lb": 12.1, "balls": 78, "range_yd_at_3deg45min": 1135}, "common_shell": {"weight_lb": 12.3, "range_yd_at_3deg45min": 1300},
                    "canister": {"weight_lb": 14.8, "balls": 27, "ball_diameter_in": 1.49, "tiers": 4}, "gun_with_packed_limber_lb": 3865, "confederate_recast_napoleons_by_battle": 49},
         "source": "Wikipedia M1857 Napoleon; Wikipedia field artillery", "source_keys": ["Wiki-Napoleon", "Wiki-FieldArtACW"], "tier": "inferred", "weak_source": True},
  conflicts=[{"id": "CONF-NAP-RANGE5", "topic": "Napoleon round-shot range at 5 deg", "positions": [{"value_yd": 1619, "source": "field-artillery article"}, {"value_yd": 1680, "source": "Napoleon article"}],
              "working_range_yd": [1600, 1700], "status": "carried as range (do not smooth)",
              "manual_check": "BOTH values are printed: 1,619 in Gibbon's appendix (new 12-pdr), 1,680 in the Instruction for Field Artillery (light 12-pdr): different manuals, not one mis-copied value (ORD-RNG-GB-NEW12, ORD-RNG-FA-LT12)"},
             {"id": "CONF-NAP-CANISTER-RANGE", "topic": "Napoleon canister effective range", "positions": [{"value_yd": 350, "source": "Napoleon article"}, {"value_yd": 400, "source": "field-artillery article"}], "working_range_yd": [350, 400], "status": "carried as range",
              "manual_check": "FA manual: canister begins at 350 yd; double canister 150-160 yd; Gibbon: maximum effect 400-450 yd (good 300-600) (ART-FA-101, ART-GB-22)"}],
  confirm=[("range_5deg_yd", ["GIBBON-1860", "FIELDART-1863"], ["ORD-RNG-GB-NEW12", "ORD-RNG-FA-LT12"], "1,619 (Gibbon new 12-pdr) and 1,680 (FA light 12-pdr) both printed; table cell keeps 1,619, 1,680 recorded as the second printed value")],
  notes="The word 'Napoleon' is not used in the printed manuals; the gun there is 'the new 12-pdr' / 'light 12-pounder'")
P("12pdr_howitzer", "12-pdr howitzer", "bronze", 4.62, 53, 788, 8.9, 1.00, 1054, 1072,
  confirm=[("range_5deg_yd", ["GIBBON-1860"], ["ORD-RNG-GB-12HOW"], "1,072 printed (Gibbon, Ordnance Manual)")],
  notes="Union: 2 (the two 12-pdr howitzers of the 2nd Connecticut battery); Confederate 26 (StrategyPage inventory)")
P("12pdr_mountain_howitzer", "12-pdr mountain howitzer", "bronze", 4.62, 33, 220, 8.9, 0.5, "n/a", 1005,
  confirm=[("range_5deg_yd", ["ORDNANCE-1861"], ["ORD-RNG-GB-MTN"], "1,005 read from damaged OCR (medium confidence)")],
  notes="Mountain howitzer use: none found (B.6.14.10 gap)", gap_ids=[])
P("24pdr_howitzer", "24-pdr howitzer", "bronze", 5.82, 64, 1318, 18.4, 2.00, 1060, 1322,
  confirm=[("range_5deg_yd", ["ORDNANCE-1861"], ["ORD-RNG-GB-24HOW"], "1,322 printed in the Ordnance Manual (OCR 'L322')")],
  notes="Confederate 4 (StrategyPage); 24-pdr howitzer battery identity: gap (B.6.14.10)")
P("10pdr_parrott", "10-pdr Parrott", "iron (wrought-iron breech band)", "2.9 or 3.0", 74, 890, 9.5, 1.00, 1230, 1850,
  extra={"printed": "Cast iron with wrought-iron reinforcing band at the breech; 2.9 in bore on the 1861-62 model; Confederates copied it (Tredegar made 80 of 2.9 in). Hazlett's battery tube plus carriage 1,799 lb (Stone Sentinels) versus 890 + 900 = 1,790: consistent within rounding.",
         "values": {"tube": "cast iron with wrought-iron reinforcing band at the breech", "bore_in_1861_62_model": 2.9, "tredegar_made_2_9_in": 80, "hazlett_tube_plus_carriage_lb": {"stone_sentinels": 1799, "table_sum": 1790}},
         "source": "Wikipedia 10-pdr Parrott; Stone Sentinels", "source_keys": ["Wiki-10pdrParrott", "SS-Hazlett-10491"], "tier": "documented", "weak_source": False},
  conflicts=[{"id": "CONF-10PARROTT-RANGE", "topic": "10-pdr Parrott range at 5 deg", "positions": [{"value_yd": 1850, "source": "Parrott article"}, {"value_yd": 1900, "source": "Parrott article"}], "working_range_yd": [1850, 1900], "status": "carried as range (both on the same Parrott article)"},
             {"id": "CONF-10PARROTT-BORE", "topic": "10-pdr Parrott bore", "positions": [{"value_in": 2.9}, {"value_in": 3.0}], "status": "printed as '2.9 or 3.0' in the table; 2.9 on the 1861-62 model"}],
  notes="Not in the printed manuals read (Gibbon, FA 1863, Ordnance Manual 1861): see ordnance_tables.json negative_findings")
P("3inch_ordnance_rifle", "3-inch Ordnance rifle", "wrought iron", 3.0, 69, 820, 9.5, 1.00, 1215, 1830,
  extra={"printed": "Carriage 900 lb; bore length 65 in; 1.0 lb charge; 9.5 lb shell; about 1,830 yd at 5 deg and about 4,180 yd at 16 deg; seven lands and grooves, right-hand twist of one turn in 11 ft. Gun and carriage about 1,700 lb (horse artillery page) versus 820 + 900 = 1,720 (Wikipedia): consistent.",
         "values": {"carriage_lb": 900, "bore_length_in": 65, "charge_lb": 1.0, "shell_lb": 9.5, "range_5deg_yd": 1830, "range_16deg_yd": 4180, "rifling": "seven lands and grooves, right-hand twist one turn in 11 ft", "gun_and_carriage_lb": {"horse_artillery_page": 1700, "wikipedia_sum": 1720}},
         "source": "Wikipedia 3-inch rifle; Regular Cavalry blog", "source_keys": ["Wiki-3inRifle", "RegCav-HorseArt"], "tier": "inferred", "weak_source": True},
  notes="Not in the printed manuals read; the 16-degree 4,180 yd maximum is the anchor of the ballistic modelling rule")
P("14pdr_james_rifle", "14-pdr James rifle", "bronze per this table (not independently verified)", 3.80, 60, 875, 14.0, 1.25, "n/a", 1530,
  conflicts=[{"id": "CONF-JAMES-MATERIAL", "topic": "James rifle material", "positions": [{"value": "bronze", "source": "Wikipedia table (not independently verified)"}], "status": "open",
              "pdf_note": "James rifles appear at Gettysburg only in the 2nd Connecticut battery"}], material_note="bronze per this table (not independently verified)", notes="James rifles appear at Gettysburg only in the 2nd Connecticut battery; Confederate inventory 4 (StrategyPage)")
P("20pdr_parrott", "20-pdr Parrott", "iron", 3.67, 84, 1750, 20.0, 2.00, 1250, 1900)
P("12pdr_whitworth", "12-pdr Whitworth (breechloader)", "iron", 2.75, 104, 1092, 12.0, 1.75, 1500, 2800,
  extra={"printed": "12-lb hexagonal bolt; effective range 2,600 yd at 5 deg; maximum 10,000 yd at 35 deg (forum claim, weak). Two on the field, in Hurt's (Hardaway's Alabama) battery of McIntosh's battalion, A. P. Hill's reserve; near Herr's Tavern July 1; on Oak Hill July 3, said by the marker (as quoted in the thread) to be beyond Union range. The American Rifleman article judges Whitworth rifle use at Gettysburg unlikely, but that refers to the .451 infantry rifle, not the gun.",
         "values": {"projectile": "12-lb hexagonal bolt", "effective_range_5deg_yd": 2600, "max_range_35deg_yd": {"value": 10000, "weak": True, "note": "forum claim"}, "on_field": 2,
                    "battery": "Hurt's (Hardaway's Alabama) battery, McIntosh's battalion, A. P. Hill's reserve", "positions": ["near Herr's Tavern July 1", "Oak Hill July 3 (marker as quoted in the thread: beyond Union range)"]},
         "source": "CivilWarTalk Whitworths thread (weak); Wikipedia Whitworth rifle", "source_keys": ["CWTalk-Whitworths", "Wiki-Whitworth"], "tier": "inferred", "weak_source": True},
  notes="Confederate artillery piece: the .451 Whitworth INFANTRY rifle is a different item (weapons dictionary). Table cell range 2,800 vs 'effective 2,600 yd at 5 deg' in the detail row are both printed.",
  conflicts=[{"id": "CONF-WHITWORTH-RANGE", "topic": "12-pdr Whitworth range", "positions": [{"value_yd": 2800, "source": "core table (range at 5 deg)"}, {"value_yd": 2600, "source": "detail row (effective at 5 deg)"}], "status": "carried: both printed, not reconciled in the PDF"}])
P("blakely_12pdr", "12-pdr Blakely", "not stated", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a",
  notes="Only a count of 4 (Confederate) found; specs gap (B.6.14.10)", gap_ids=["G17"])
P("3inch_navy_rifle", "3-inch Navy rifle", "not stated", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", "n/a", notes="Confederate 4 (StrategyPage); specs gap (B.6.14.10)", gap_ids=["G17"])
for g in ("blakely_12pdr", "3inch_navy_rifle"):
    PIECES[g]["tier"] = "gap"
    PIECES[g]["weak_source"] = None
    PIECES[g]["tier_note"] = "No specs retrieved: open gap, no tier (PDF B.6.14 intro)"
    PIECES[g]["field_tiers"] = {}
    PIECES[g]["table"] = {}
PIECES["ames_rifled_bronze_napoleon"] = {"id": "ames_rifled_bronze_napoleon", "label": "Ames rifled bronze Napoleons", "table": {}, "tier": "gap", "weak_source": None, "tier_note": "a single line, six made in 1862 (B.6.14.10); no specs",
                                          "field_tiers": {}, "conflicts": [], "manual_confirmation": [], "gap_ids": ["G17"], "notes": "B.6.14.10: 'Ames rifled bronze Napoleons (a single line, six made in 1862)'", "extra_detail": None,
                                          "table_source_keys": [], "table_printed_tier": None}

INVENTORY = {
    "printed": "Inventory of guns on the field (StrategyPage, Union / Confederate): 12-pdr howitzer 2 / 26; 24-pdr howitzer 0 / 4; 12-pdr Napoleon 146 / 111; 3-inch rifle 142 / 76; 3-inch Navy rifle 0 / 4; 6-pdr 0 / 1; 10-pdr Parrott 64 / 44; 12-pdr Blakely 0 / 4; 12-pdr Whitworth 0 / 2; 14-pdr James 0 / 4; 20-pdr Parrott 6 / 10; totals 366 / 282. HistoryNet gives 372 and 281 (653). Tier: documented (secondary); the two totals conflict.",
    "by_type": {"12pdr_howitzer": {"union": 2, "confederate": 26}, "24pdr_howitzer": {"union": 0, "confederate": 4}, "napoleon_12pdr_m1857": {"union": 146, "confederate": 111},
                "3inch_ordnance_rifle": {"union": 142, "confederate": 76}, "3inch_navy_rifle": {"union": 0, "confederate": 4}, "6pdr_field_gun": {"union": 0, "confederate": 1},
                "10pdr_parrott": {"union": 64, "confederate": 44}, "blakely_12pdr": {"union": 0, "confederate": 4}, "12pdr_whitworth": {"union": 0, "confederate": 2},
                "14pdr_james_rifle": {"union": 0, "confederate": 4}, "20pdr_parrott": {"union": 6, "confederate": 10}},
    "totals_strategypage": {"union": 366, "confederate": 282}, "totals_historynet": {"union": 372, "confederate": 281, "total": 653},
    "total_ranges": {"union": [366, 372], "confederate": [281, 282]},
    "source_keys": ["StrategyPage-Guns", "HistoryNet-Thunder"], "tier_printed": "documented (secondary)", "tier": "documented", "weak_source": False,
    "conflict": {"id": "CONF-GUN-TOTALS", "positions": [{"union": 366, "confederate": 282, "source": "StrategyPage"}, {"union": 372, "confederate": 281, "total": 653, "source": "HistoryNet"}], "status": "carried as ranges 366-372 / 281-282"},
    "arithmetic_check": {"by_type_sum": {"union": 360, "confederate": 286}, "printed_totals": {"union": 366, "confederate": 282}, "matches": False,
                         "pdf_defect": "The by-type rows as printed sum to 360 Union / 286 Confederate, not the printed totals 366 / 282 (differences -6 / +4); both the rows and the totals are kept as printed; the sums above are recomputed from the printed rows"},
}
BATTERY_ARMAMENT_KNOWN = {
    "printed": "Known Gettysburg gun types by battery (Stone Sentinels unless noted): Cushing (Bty A, 4th US) six 3-inch rifles; Hazlett (Bty D, 5th US) six 10-pdr Parrotts; 2nd Connecticut four 14-pdr James rifles and two 12-pdr howitzers; 5th NY (Taft) six 20-pdr Parrotts; W.Va. Bty C four 10-pdr Parrotts; Calef (Bty A, 2nd US) six 3-inch rifles; Smith's 4th NY six 10-pdr Parrotts (monument); Hart's 15th NY four Napoleons; Bigelow's 9th Mass six Napoleons; Rorty's 1st NY B four 10-pdr Parrotts (Hazard's report); Woodruff's 1st US I six \"light 12-pdrs\"; Brown's 1st RI B six light 12-pdrs; Arnold's 1st RI A six 3-inch (Hazard's report, Iron Brigader). Remaining Union and Confederate types are in the order-of-battle tables below.",
    "source_keys": ["SS-Cushing-7888", "SS-Hazlett-10491", "SS-NYArt-1958", "SS-Calef-7820", "IronBrigader-Hazard"],
}
BALLISTIC_RULE = {
    "printed": "Ballistic modelling rule (inferred): derive each gun's range curve from the published 5-degree range plus the 3-inch rifle's 16-degree maximum of about 4,180 yd. Smoothbores fall well behind rifles beyond about 1,500 yd, so Napoleons on July 3 had to be forward or near the crest to reach Seminary Ridge (1,400 yd or more) with shell or case. The Whitworth and Blakely breechloaders are modelled as long-range, flat-trajectory rifles; their July 3 effect from Oak Hill rests on a forum claim, not an official source. Per-elevation range tables are an open gap (see end of section).",
    "tier": "inferred", "source_keys": [], "anchors": {"3inch_rifle_16deg_yd": 4180, "seminary_ridge_distance_yd_min": 1400, "smoothbore_falloff_beyond_yd": 1500},
    "manual_cross_reference": "Per-elevation range tables for 6-pdr, 12-pdr, light 12-pdr, 12-/24-/32-pdr howitzers and the mountain howitzer are now in docs/battle-theatre/drill/ordnance_tables.json (ORD-RNG-*); the 3-inch rifle, Parrott, James, Whitworth and Blakely are NOT in the printed manuals read (B.6.14.10 gap stays open for them).",
}

# ---------------------------------------------------------------------------------------------------------------
# B.6.14.2 Ammunition types and fuzes
AMMO_TYPES = [
    {"id": "solid_shot", "type": "Solid shot (bolt)", "description": "Kinetic, accurate, ricochets from smoothbores on hard dry ground", "napoleon_figures": "12.25 lb", "values": {"weight_lb": 12.25},
     "animation": "Bounce along ground on dry July soil; stops in soft earth. Napoleon Guide: bouncing roundshot on dry ground flattens many men, stops in soggy earth", "source_keys": ["NapoleonGuide", "Wiki-Napoleon"]},
    {"id": "shell", "type": "Shell", "description": "Black-powder burst, few large fragments; used against troops behind cover and to ignite buildings", "napoleon_figures": "12.3 lb, 1,300 yd", "values": {"weight_lb": 12.3, "range_yd_at_3deg45min": 1300},
     "animation": "Ground or air burst puff, fragments; fire on buildings", "source_keys": ["Wiki-Napoleon"], "manual_check": "1,300 yd printed (Gibbon, FA) at 3 deg 45 min"},
    {"id": "spherical_case", "type": "Spherical case (shrapnel)", "description": "Balls with a burst charge, timed to burst over the target", "napoleon_figures": "78 balls, 12.1 lb, 1,135 yd", "values": {"balls": 78, "weight_lb": 12.1, "range_yd_at_3deg45min": 1135},
     "animation": "Airburst smoke puff with a downward ball cone, fuze-cutting by No. 6", "source_keys": ["Wiki-Napoleon"],
     "manual_check": "UNSETTLED: Gibbon prints 1,135 yd, FA prints 1,130; FA OCR reads 76 balls / 11.77 lb loaded against the PDF's 78 / 12.1 (ORD-PRJ-CASE); digit ambiguity not settled without page image"},
    {"id": "canister", "type": "Canister", "description": "Thin-walled container of iron balls, deadliest at short range", "napoleon_figures": "27 balls (1.49 in), 14.8 lb; effective 350-400 yd", "values": {"balls": 27, "ball_diameter_in": 1.49, "weight_lb": 14.8, "effective_range_yd": [350, 400]},
     "animation": "Wide cone from the muzzle; double canister at extreme close range", "source_keys": ["Wiki-Napoleon", "Wiki-FieldArtACW"],
     "manual_check": "FA OCR reads 21 shot (likely 7->1 confusion); Gibbon table shows 27 and 1.49 in (ORD-PRJ-CANISTER): UNSETTLED without page image"},
    {"id": "grapeshot", "type": "Grapeshot", "description": "Obsolete", "napoleon_figures": "9 balls", "values": {"balls": 9}, "animation": "Not modelled except if a source shows use", "source_keys": ["Wiki-Napoleon"]},
]
for a in AMMO_TYPES:
    a["tier"], a["weak_source"], _ = eff_tier("documented", a["source_keys"])
    a["tier_printed"] = "no tier printed per row (section header: documented/inferred/plausible-procedural definitions only)"
BATTERY_STOCK = {
    "printed": "Typical stock for a six-Napoleon battery: 288 solid shot, 288 spherical case, 96 shell and 96 canister (Wikipedia Napoleon; reported to match the 5th Maine battery figure). Tier: documented (secondary). This is a per-battery stock total across limbers and caissons. The per-chest and per-limber round count (for example 32 rounds per Napoleon limber chest, 50 per rifle chest) is an open gap: not confirmed from a source.",
    "values": {"solid_shot": 288, "spherical_case": 288, "shell": 96, "canister": 96, "total": 768}, "source_keys": ["Wiki-Napoleon"], "tier": "inferred", "weak_source": True,
    "tier_note": "printed documented (secondary); Wikipedia only => inferred weak",
    "manual_cross_reference": {"chest_light_12pdr": "12 shot + 12 spherical case + 4 shell + 4 canister = 32 rounds per limber chest, 484.1 lb: CONFIRMED (ORD-CHEST-LT12, FIELDART-1863 p.19)",
                               "chest_12pdr_gun": "20 shot + 8 case + 4 canister = 32 (ORD-CHEST-12)", "chest_6pdr": "25 shot + 20 case + 5 canister = 50 (ORD-CHEST-6): the PDF's '50 per rifle chest' matches the 6-pdr, NOT a rifle",
                               "caisson": "three chests (limber, middle, rear) (ORD-CAISSON)",
                               "pdf_stock_arithmetic": "768 = 24 chests x 32 = one caisson per gun (inferred arithmetic); manual war establishment two caissons per gun, 1,344 rounds (504/504/168/168); campaign allowance about 400 a piece (ORD-BATT-PDR, ORD-BATT-WAR)",
                               "pdf_differs": "PDF calls the 32-per-chest figure 'an open gap: not confirmed'; the printed manual confirms it, so that sub-gap is closed for the Napoleon; rifle chests (3-inch, Parrott) remain open"}}
FUZES = {
    "printed": "Fuzes: - Timed (paper or wooden) fuze: the cutter trims the fuze to range before loading; the flame from the main charge ignites it. Described as the most problematic type (Civil War News, The Artillery Fuze). Example Confederate paper fuze: C.S. Laboratory Richmond, May 1864, about 4 seconds per inch, wrapped in wax paper (a May 1864 example, not July 1863; tier: documented but date-shifted). - Percussion fuzes: plunger-and-anvil, explode on impact; used with rifled shell. Union 3-inch ammunition on hand in Wheeler's 13th NY on July 2 was percussion and canister only (13th NY Battery site). - Confederate reliability: a Confederate officer's report of December 1863 stated many fuzes exploded early and about half of friction primers failed; Union primers and fuzes failed less (Civil War News). A Richmond (Brown's Island) laboratory explosion shut the arsenal temporarily: March 1863 (Civil War News) versus April 1863 (History Is Now Magazine) - date conflict. - July 3 specifics (secondary blog, History Is Now): fuzes burned longer than expected; replacements from Selma and Charleston burned about one second longer than Richmond-made fuzes; later tests suggested bursts 150-200 yd farther back than intended; one officer blamed softened resin filler mixing with powder in humid weather. The American Battlefield Trust says many shells with defective fuzes fell short or flew over. Both short and long attested; the dominant claim in the blog is long. - Not found: Bormann fuze, Schenkl and Hotchkiss specifics; which percussion fuze models each side used at Gettysburg (open gap).",
    "values": {"timed_fuze": "cutter trims to range; main-charge flame ignites; most problematic type", "cs_paper_fuze_example": {"lab": "C.S. Laboratory Richmond", "date": "1864-05", "seconds_per_inch": 4, "date_shifted": "May 1864, not July 1863"},
               "percussion": "plunger-and-anvil, impact; with rifled shell; 13th NY Bty 3-inch ammunition on July 2 was percussion and canister only",
               "cs_reliability_dec1863_report": {"many_fuzes_exploded_early": True, "friction_primers_failed_about": 0.5}, "union_fail_less": True,
               "july3_cs_fuzes": {"burned_longer_than_expected": True, "selma_charleston_replacements_extra_s": 1, "burst_error_yd": [150, 200], "bias": "long (dominant claim in the blog)", "also_attested": "short or over (ABT)"}},
    "conflicts": [{"id": "CONF-BROWNS-ISLAND", "topic": "Richmond (Brown's Island) laboratory explosion date", "positions": [{"value": "March 1863", "source": "Civil War News"}, {"value": "April 1863", "source": "History Is Now Magazine"}], "status": "carried (date conflict)"}],
    "source_keys": ["CWNews-ArtFuze", "13NYBty-Wheeler", "HistoryIsNow-Pickett", "ABT-ArtPlacements"], "tier": "documented", "weak_source": False,
    "tier_note": "mixed: 'History Is Now' is a blog (weak) and its July 3 specifics are flagged secondary-blog in the PDF; the general fuze descriptions rest on Civil War News (periodical)",
    "manual_cross_reference": "Bormann (Belgian) metallic time fuze is the only field-artillery fuze in the 1860 FA manual (graduated to 5.5 s; ART-FA-112, ORD-FUZE-FA); Gibbon's paper fuze rates: black 2, red 3, green 4, yellow 5 s per inch (ORD-FUZE-GB) -> the PDF's 'about 4 s/inch' example is the green fuze. Friction primer: ORD-PRIMER-FA. Schenkl/Hotchkiss/percussion specifics are NOT in the editions read (gap stays open).",
}
ROUND_TOTALS = {
    "printed": "Round totals (open gap): about 32,000 Union and 22,000 Confederate rounds fired are commonly cited but were not verified. Documented per-battery figures: Smith 4th NY 240 rounds (marker); Wheeler 13th NY 850 rounds with 200 lost with a broken caisson; Bigelow about three tons including 92 canister; McCarthy (Cabell) 20 rounds at an advancing line early July 3.",
    "values": {"commonly_cited_unverified": {"union": 32000, "confederate": 22000}, "per_battery": [{"unit": "Smith 4th NY", "rounds": 240, "source": "marker"}, {"unit": "Wheeler 13th NY", "rounds": 850, "lost_with_broken_caisson": 200}, {"unit": "Bigelow", "weight": "about three tons including 92 canister"}, {"unit": "McCarthy (Cabell)", "rounds": 20, "when": "early July 3, at an advancing line"}]},
    "tier": "open_gap", "gap_ids": ["B.6.14.10"],
}
AMMO_CHOICE = {"printed": "Union tactical ammunition choices (documented): Bigelow fired solid shot low for ricochet at Trostle's, then canister (Civil War News 2025); Cushing used double canister at about 100 yd on July 3 (Warfare History Network). Inference for the engine: ammunition choice by range band - solid shot/shell/case beyond about 400 yd, canister inside 350-400 yd, double canister inside about 100 yd.",
               "range_bands_yd": {"solid_shot_shell_case_beyond": 400, "canister_inside": [350, 400], "double_canister_inside": 100}, "tier": "inferred", "source_keys": ["CWNews-2025-Devil", "WHN-Cushing"],
               "manual_check": "FA manual: double canister at 150-160 yd (not 100 yd); case not inside 500 yd (manual) -- the PDF's 100 yd for double canister is Cushing's documented practice, the manual's emergency band is 150-160 yd (ART-FA-101)"}

# ---------------------------------------------------------------------------------------------------------------
# B.6.14.3 Crew roles and the drill as animation states
CREW = {
    "printed_sequence": "Documented sequence (NPS Fort Scott artillery drill page, a Union-pattern light-artillery demonstration): commands are commence firing, load, ready, fire, cease firing. No. 1 sponges while No. 3 thumbs the vent; No. 2 takes the round from No. 5 and puts it in the muzzle; No. 1 rams; the gunner sights; No. 3 moves the trail with the trailspike on the gunner's direction; No. 5 fetches the next round from Nos. 6 and 7 at the limber (No. 6 cuts the fuzes); the gunner steps clear and calls ready; No. 3 pricks the cartridge through the vent; No. 4 hooks the friction primer to the lanyard, inserts it and pulls the lanyard taut on \"Fire\"; after firing the piece is run back up. CVBT adds: No. 2 also uses the worm staff after firing; No. 6 tends the chest; No. 7 hands rounds; spare men handle horses; the prolonge is a long rope on the trail used to move the piece without hitching up.",
    "commands": ["commence firing", "load", "ready", "fire", "cease firing"],
    "roles": [
        {"role": "gunner", "duty": "sights; steps clear and calls ready", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-02", "ART-FA-11", "ART-FA-12", "ART-FA-13"]},
        {"role": "No. 1", "duty": "sponges (while No. 3 thumbs the vent); rams", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-03", "ART-FA-20", "ART-FA-21", "ART-FA-22"]},
        {"role": "No. 2", "duty": "takes the round from No. 5 and puts it in the muzzle; CVBT adds: also uses the worm staff after firing", "source_keys": ["NPS-FortScott", "CVBT-ArtKing"], "manual_item_ids": ["ART-FA-03", "ART-FA-30", "ART-FA-31"],
         "manual_check": "worm-staff claim NOT supported by the 1860 manual: the worm only draws an unfired load (ART-FA-96, ART-FA-97)"},
        {"role": "No. 3", "duty": "thumbs the vent; moves the trail with the trailspike on the gunner's direction; pricks the cartridge through the vent", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-04", "ART-FA-40", "ART-FA-41", "ART-FA-42"]},
        {"role": "No. 4", "duty": "hooks the friction primer to the lanyard, inserts it and pulls the lanyard taut on \"Fire\"", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-04", "ART-FA-43", "ART-FA-44", "ART-FA-45"]},
        {"role": "No. 5", "duty": "fetches the next round from Nos. 6 and 7 at the limber", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-05", "ART-FA-52"]},
        {"role": "No. 6", "duty": "cuts the fuzes; CVBT adds: tends the chest", "source_keys": ["NPS-FortScott", "CVBT-ArtKing"], "manual_item_ids": ["ART-FA-06", "ART-FA-50", "ART-FA-51"]},
        {"role": "No. 7", "duty": "hands rounds (CVBT)", "source_keys": ["CVBT-ArtKing"], "manual_item_ids": ["ART-FA-06", "ART-FA-50"]},
        {"role": "chief of caisson", "duty": "ninth soldier stationed with the limber/caisson line, not at the piece (engine rule)", "source_keys": ["NPS-FortScott"], "manual_item_ids": ["ART-FA-07", "ART-FA-55"],
         "manual_check": "manual calls him No. 8, chief of the caisson, 4 yd behind the limber on its left; serves ammunition direct from the caisson rear chest"},
        {"role": "spare men", "duty": "handle horses (CVBT)", "source_keys": ["CVBT-ArtKing"], "manual_item_ids": []},
    ],
    "prolonge": "a long rope on the trail used to move the piece without hitching up (CVBT)",
    "crew_size": {
        "printed": "Crew-size conflict (8 versus 9) and how the engine handles it: NPS Fort Scott counts nine (gunner, chief of caisson, Nos. 1-7); CVBT counts roughly eight (gunner plus seven numbered); Wikipedia states eight crew plus four men for horses and equipment but also gives nine cannoneers in the Napoleon article; the horse-artillery page gives a typical crew of nine. The two counts disagree only on whether the chief of caisson belongs in the detachment. Engine rule (inferred, so tier: inferred): the working detachment at the piece is the gunner plus Nos. 1-7, which is eight men and common to every source; the chief of caisson is a ninth soldier stationed with the limber/caisson line, not at the piece. A battery's detachment size is then a parameter (8 default, 9 including chief of caisson) that can be changed without redoing animation, because the chief of caisson has no gun-side state. When casualties reduce a crew, the drill degrades by dropping roles in this order (plausible-procedural, seeded): spare hands and No. 7 first, then No. 6 and No. 5 merge, then No. 2 and No. 4 pair up, with the gunner always last. Confederate crew size is an open gap (often smaller crews, no source retrieved).",
        "positions": [{"count": 8, "who": "gunner + Nos. 1-7", "sources": ["CVBT-ArtKing", "Wikipedia (eight plus four for horses and equipment)"]},
                      {"count": 9, "who": "gunner, chief of caisson, Nos. 1-7", "sources": ["NPS-FortScott", "RegCav-HorseArt", "Wiki-Napoleon"]}],
        "engine_rule": {"working_detachment_at_piece": 8, "chief_of_caisson_ninth_at_limber_line": True, "detachment_size_parameter": {"default": 8, "including_chief_of_caisson": 9}},
        "degradation_order": ["spare hands and No. 7", "No. 6 and No. 5 merge", "No. 2 and No. 4 pair up", "gunner always last"], "degradation_tier": "plausible-procedural",
        "tier": "inferred", "source_keys": [], "tier_note": "engine rule is the PDF's own inference",
        "confederate_crew_size": {"status": "open_gap", "note": "often smaller crews, no source retrieved", "gap_ids": ["B.6.14.10"]},
        "manual_cross_reference": {"verdict": "CONFIRMED nine: 1860 Instruction for Field Artillery para 94 'Nine men, including the gunner', numbered gunner + Nos. 1-8 with No. 8 the chief of the caisson (ART-FA-01, ART-FA-07); chief of piece separate",
                                   "pdf_differs": "PDF numbers the detachment gunner + Nos. 1-7 plus a separate 'chief of caisson'; the manual numbers the chief of caisson No. 8, so the nine are the same nine; the manual also has a chief of piece (sergeant) separate from the nine. PDF 'open gap: commands and crew positions not confirmed from a primary text' is now settled for the Union system (positions: ART-FA-03, ART-FA-04, ART-FA-05, ART-FA-06, ART-FA-10)",
                                   "manual_keys": ["FIELDART-1863", "GIBBON-1860"]},
    },
    "states": [
        {"n": 1, "state": "Unlimber / run in", "who": "Drivers, all numbers", "action": "Team halts, trail dropped from limber, piece swung, limber driven 10-15 yd back", "notes": "Limbers form a second line and caissons a third (Cushing, Warfare History Network)", "tier": "inferred"},
        {"n": 2, "state": "Sponge (and worm)", "who": "No. 1; No. 3 thumbs the vent; No. 2 with worm staff after firing", "action": "Sponge the bore, thumb over vent", "notes": "", "tier": "inferred"},
        {"n": 3, "state": "Load (carry round)", "who": "No. 5 from the limber; Nos. 6/7 supply; No. 6 cuts the fuze", "action": "No. 5 carries the round; No. 2 seats it", "notes": "Round type visible: fuze-cut for case/shell", "tier": "inferred"},
        {"n": 4, "state": "Ram", "who": "No. 1", "action": "Ram the round home", "notes": "", "tier": "inferred"},
        {"n": 5, "state": "Aim and trail shift", "who": "Gunner, No. 3", "action": "Gunner sights; No. 3 shifts the trail with the trailspike; elevation by screw", "notes": "Gunner steps clear and calls ready", "tier": "inferred"},
        {"n": 6, "state": "Prime", "who": "No. 3, No. 4", "action": "No. 3 pricks the cartridge through the vent; No. 4 inserts the friction primer and hooks the lanyard", "notes": "", "tier": "inferred"},
        {"n": 7, "state": "Fire", "who": "No. 4", "action": "Pull lanyard taut on the command", "notes": "Muzzle flash, smoke, recoil trigger", "tier": "inferred"},
        {"n": 8, "state": "Recoil roll-back", "who": "The piece", "action": "The piece rolls back several feet", "notes": "Exact recoil distance for a Napoleon is an open gap; the \"several feet\" figure is inferred", "tier": "inferred", "gap": "recoil distance"},
        {"n": 9, "state": "Run-up", "who": "Nos. 1 and 2 and others on the wheels", "action": "Run the piece back up by hand with handspikes and wheels; resume at state 2", "notes": "", "tier": "inferred"},
        {"n": 10, "state": "Canister variant", "who": "Same crew, no fuze cutting", "action": "Faster cycle", "notes": "Double canister inside about 100 yd", "tier": "inferred"},
        {"n": 11, "state": "Prolonge retire", "who": "Crew with prolonge rope", "action": "Fall back firing without limbering up", "notes": "Bigelow withdrew about 400 yd by prolonge fire at Trostle's; Wheeler's 13th NY lost a gun when a prolonge broke while a dismounted piece was carried under a limber", "tier": "inferred"},
        {"n": 12, "state": "Casualty / melee", "who": "Any", "action": "Death, horse death, exploding caisson, sponge staffs and handspikes used as clubs", "notes": "Documented at Trostle's: cannoneers fought hand to hand with the 21st Mississippi; Hazlett: a bullet emptied a sponge bucket", "tier": "documented"},
    ],
    "states_note": "States 1-10 follow the notes' inferred list; the timing is inferred (PDF).  States 11 and 12 are printed in the same table.",
    "cycle_time": {
        "printed": "Cycle time (inferred): about 20-30 seconds per round for a trained detachment, consistent with the one documented example of about 2.5 rounds/min averaged over an hour (Waterman at Mine Run, CVBT; this is not a Gettysburg figure). Canister loading is faster. Recorded Gettysburg rates are an open gap.",
        "pdf_seconds_per_round": [20, 30], "documented_example": {"rounds_per_min": 2.5, "over": "an hour", "who": "Waterman at Mine Run", "not_gettysburg": True},
        "tier": "inferred", "gap": "Recorded Gettysburg rates are an open gap",
        "manual_cross_reference": {"printed_rates": "Gibbon: 30-40 s per round for a 6-pdr, 60 s for a 12-pdr; mean about one shot a minute; two or three a minute when pressed; FA manual planning figure: two solid shot or three canisters per minute 'with sufficient deliberation for pointing' (ART-GB-20, ART-GB-21, ART-FA-100)",
                                   "working_range_seconds_per_round": [30, 60], "pdf_differs": "The PDF's inferred 20-30 s per round is FASTER than anything printed; printed manuals give 30-60 s for solid shot/case, canister about 20-30 s (3 per minute). Both carried; the engine default is NOT chosen here (owner decision pending)", "decision": "PENDING OWNER"}},
    "organization": {
        "printed": "Other documented organization: two guns form a section under a lieutenant; a gun plus caisson formed a platoon under a sergeant and two corporals; Calef's battery ran as right, center and left sections under Lt. Roder, 1st Sgt. Newman and Sgt. Pergel. Sergeants were chiefs of piece and corporals gunners on the Union side (Wikipedia Union Army). Commands and crew positions (No. 1 and No. 2 on opposite sides of the muzzle, etc.) are not confirmed from a primary text (open gap).",
        "values": {"section": "two guns under a lieutenant", "platoon": "a gun plus caisson under a sergeant and two corporals", "calef_sections": {"right": "Lt. Roder", "center": "1st Sgt. Newman", "left": "Sgt. Pergel"}, "chief_of_piece": "sergeant", "gunner": "corporal"},
        "source_keys": ["Wiki-UnionArmy", "SS-Calef-7820"], "tier": "inferred",
        "manual_cross_reference": "No. 1 right, No. 2 left of the muzzle, about 2 ft outside the wheels: CONFIRMED (ART-FA-03)"},
    "source_keys": ["NPS-FortScott", "CVBT-ArtKing", "Wiki-FieldArtACW", "Wiki-Napoleon", "RegCav-HorseArt"],
}

# ---------------------------------------------------------------------------------------------------------------
# B.6.14.4 Teams, drivers, limbers, caissons, battery wagon, forge
TEAMS = [
    {"id": "teams", "item": "Teams", "printed": "Each gun uses two six-horse teams (gun limber and caisson limber). Each six-horse team had three drivers riding the left horses and holding the reins of the right. About 700 lb pull per horse. Horse life expectancy under eight months in service (cited).",
     "values": {"teams_per_gun": 2, "horses_per_team": 6, "drivers_per_team": 3, "pull_lb_per_horse": 700, "horse_life_months_under": 8}, "source_keys": ["Wiki-FieldArtACW", "RegCav-HorseArt"]},
    {"id": "limber", "item": "Limber", "printed": "Carries one ammunition chest; a Napoleon with packed limber weighs 3,865 lb.", "values": {"chests": 1, "napoleon_with_packed_limber_lb": 3865}, "source_keys": ["Wiki-FieldArtACW"]},
    {"id": "caisson", "item": "Caisson", "printed": "Two-wheeled; carries two ammunition chests plus a spare wheel; each chest about 500 lb; a loaded limber-and-caisson about 3,811 lb.",
     "values": {"wheels": 2, "chests": 2, "spare_wheel": 1, "chest_lb": 500, "loaded_limber_and_caisson_lb": 3811}, "source_keys": ["Wiki-FieldArtACW"],
     "manual_check": "FA/Ordnance: a caisson carries THREE chests (limber, middle, rear) = the caisson body carries two plus the limber chest (ORD-CAISSON): consistent with 'two chests' on the body; 484.1 lb is a limber chest (ORD-CHEST-LT12), PDF's ~500 lb consistent"},
    {"id": "battery_wagon_forge", "item": "Battery wagon and forge", "printed": "Each battery had one battery wagon and one forge.", "values": {"battery_wagon": 1, "forge": 1}, "source_keys": ["RegCav-HorseArt", "CWTalk-BatteryTOE"]},
    {"id": "reserve", "item": "Reserve caissons, staff", "printed": "Six reserve caissons, five artificers, two buglers, guidon-bearer, orderly, quartermaster sergeant in the horse-artillery description.",
     "values": {"reserve_caissons": 6, "artificers": 5, "buglers": 2, "guidon_bearer": 1, "orderly": 1, "quartermaster_sergeant": 1}, "source_keys": ["RegCav-HorseArt"]},
    {"id": "horse_artillery_cannoneers", "item": "Horse-artillery cannoneers", "printed": "Each rode an individual horse, with two extra men as horse-holders, so no gun-side riding on the limber.", "values": {"mounted_individually": True, "extra_horse_holders": 2}, "source_keys": ["RegCav-HorseArt"]},
    {"id": "toe_6pdr_mounted", "item": "Battery table of organization (6-pdr mounted battery as quoted from a manual in a forum)",
     "printed": "5 officers, 20 NCOs, 6 artificers, 2 buglers, 52 drivers, 70 cannoneers (150 enlisted). A 12-pdr battery adds 6 caissons (12 total) and 18 drivers. Horses (12-pdr): draught 36 gun, 72 caisson, 6 battery wagon, 6 forge, 10 spare; saddle 8 sergeants, 6 artificers, 2 buglers, 2 spare; stated total 149 (the items sum to 148).",
     "values": {"officers": 5, "ncos": 20, "artificers": 6, "buglers": 2, "drivers": 52, "cannoneers": 70, "enlisted_total": 150, "twelve_pdr_battery_adds": {"caissons": 6, "caissons_total": 12, "drivers": 18},
                "horses_12pdr": {"draught": {"gun": 36, "caisson": 72, "battery_wagon": 6, "forge": 6, "spare": 10}, "saddle": {"sergeants": 8, "artificers": 6, "buglers": 2, "spare": 2}, "stated_total": 149}},
     "source_keys": ["CWTalk-BatteryTOE"], "arithmetic_note": "the items sum to 148 against the stated 149 (PDF defect carried; checked by build_kit_data.py)"},
    {"id": "typical_size", "item": "Typical size", "printed": "Union batteries usually six guns (some four), Confederate often four; 100-150 men. This line is unverified background knowledge in the notes.",
     "values": {"union_guns": [4, 6], "union_usual": 6, "confederate_guns_often": 4, "men": [100, 150]}, "source_keys": [], "tier": "plausible-procedural", "note": "Notes, flagged unverified"},
]
for t in TEAMS:
    if "tier" not in t:
        t["tier"], t["weak_source"], _ = eff_tier("documented", t["source_keys"])
PLACEMENT = {"printed": "Placement in the engine (inferred): at the piece the detachment of eight; limbers about 10-15 yd behind (second line), caissons farther back (third line), battery wagon and forge in the rear park, horses and drivers with the limbers. Documented loss counts of horses (Calef 13, Hart 25, Bigelow 65 or 80, Smith 11, Brown 24 killed and 6 disabled, Cabell 67 killed and 13 disabled, Alexander 116) drive the horse casualty animation; a battery short of horses fields fewer teams (Hart had enough horses for only three guns; Phillips' limber team of five horses was shot).",
             "values": {"detachment_at_piece": 8, "limbers_yd_behind": [10, 15], "horse_losses": {"Calef": 13, "Hart": 25, "Bigelow": [65, 80], "Smith": 11, "Brown": {"killed": 24, "disabled": 6}, "Cabell": {"killed": 67, "disabled": 13}, "Alexander": 116}},
             "tier": "inferred", "manual_check": "limbers: manual puts limber end-of-pole 6 yd from the trail handspike when unlimbered (paras 96, 126; ART-FA-03..10); caissons: no fixed distance printed (ART-FA-80)"}
