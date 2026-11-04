"""Item catalog + builder helpers for the kit data (PDF B.6.2-B.6.8, B.6.14.5, B.6.15.4).

Every catalog entry is a visual/equipment ITEM that a kit-spec field may allow.  Weapons live in weapons.json.
tags drive the anachronism validator (tools/bt/check_kit.py).  army: union | confederate | either.
"""
from kit_sources import eff_tier, SOURCES

# ---------------------------------------------------------------------------------------------------------------
# Weights.  The PDF (B.6.2, 'Default Union infantry mix') says the notes give no counts, so every weight below is a
# TUNING PARAMETER with NO historical basis.  The share word is the PDF's own word; the number is ours.
SHARE_WORD_TUNING = {"all": 1.0, "most": 6.0, "majority": 6.0, "minority": 2.0, "smaller share": 2.0,
                     "some": 2.0, "few": 1.0, "rare": 0.5}


def A(item, share="all", detail=None, **kw):
    """One allowed item with its share word and a tuning-parameter weight."""
    d = {"item": item, "share": share,
         "weight": {"value": SHARE_WORD_TUNING[share], "kind": "tuning_parameter", "historical_basis": False},
         "detail": detail}
    d.update(kw)
    return d


def F(allowed, printed, keys=(), printed_weak=False, printed_raw=None, note=None, unit_wide=False,
      source_basis="printed_per_row", **kw):
    """A kit-spec field.  printed = tier word as printed; the effective tier applies Law cl.4 (see kit_sources)."""
    keys = list(keys)
    tier, weak, why = eff_tier(printed, keys, printed_weak)
    f = {"allowed": allowed, "tier_printed": printed, "tier": tier, "weak_source": weak,
         "source_keys": keys, "source_basis": source_basis if keys else "none"}
    if printed_raw:
        f["tier_printed_raw"] = printed_raw
    if why:
        f["tier_note"] = why
    if note:
        f["note"] = note
    if unit_wide:
        f["unit_wide"] = True
    f.update(kw)
    return f


# ---------------------------------------------------------------------------------------------------------------
ITEMS = {}


def item(iid, kind, army, label, tags=(), **kw):
    assert iid not in ITEMS, iid
    d = {"kind": kind, "army": army, "label": label, "tags": sorted(tags)}
    d.update(kw)
    ITEMS[iid] = d


H, C, T, S, SH, AC, BY, FL, PK = ("headgear", "coat", "trousers", "shirt", "shoes", "accoutrement", "bayonet",
                                  "flag_or_instrument", "pack_state")

# --- Union headgear ---------------------------------------------------------------------------------------------
item("kepi_m1858", H, "union", "Forage cap / kepi (1858 McDowell pattern): dark blue wool, leather visor and chin strap, black or brown liner; infantry bugle, regiment number, company letter", ["kepi"])
item("hardee_hat_m1858", H, "union", "Hardee (M1858) hat: black felt, infantry brim pinned up left, brass eagle, sky blue infantry hat cord, bugle device, black ostrich feather for dress", ["hardee"])
item("hardee_hat_iron_brigade", H, "union", "Black M1858 Hardee hat, brim pinned up on the left, brass eagle, brass bugle, brass regiment number and company letter, cord, ostrich feather; red I Corps patch on the hat", ["hardee", "iron_brigade"])
item("slouch_hat_civilian", H, "union", "Civilian hat: black slouch, pork-pie or bowler", ["slouch"])
item("generals_kepi_velvet_band", H, "union", "Generals' kepi or forage cap with black velvet band", ["kepi", "officer_only"])
item("fez_red_114pa", H, "union", "Red fez with yellow-gold tassel (114th PA)", ["zouave", "fez"])
item("fez_red_146ny", H, "union", "Red fez with tassel (146th NY; tassel colour inconsistent on source page)", ["zouave", "fez"], variance=["tassel colour: open"])
item("turban_white_parade", H, "union", "White turban, parade and guard duty only (114th PA, 146th NY)", ["zouave", "parade_only"])
item("forage_cap_dark_blue_44ny", H, "union", "Dark blue forage cap (44th NY original Zouave form)", ["kepi", "zouave"])
item("black_plumed_hat_39ny", H, "union", "Black brimmed hat with dark cock feathers (39th NY Bersaglieri-style)", ["garibaldi_guard"])
item("fez_red_5ny_reference", H, "union", "Red fez with yellow tassel: 5th NY reference dress only, unit absent", ["zouave", "fez", "reference_only"])
item("kepi_green_berdan", H, "union", "Dark green kepi / forage cap with leather trim (Berdan's Sharpshooters)", ["berdan_green", "kepi"])
item("slouch_hat_berdan", H, "union", "Slouch hat (Berdan default 'green kepis and slouch hats'; colour of the slouch hat not stated)", ["berdan_green", "slouch"], note="colour not stated in B.6.6; tagged berdan_green so it cannot leave the Berdan units")
item("kepi_ambulance_green_band", H, "union", "Kepi with green cap band 2 in wide (Ambulance Corps privates, GO 147, 2 Aug 1862)", ["kepi", "green_hatband"])
item("kepi_irish_boxwood_sprig", H, "union", "Kepi with boxwood sprig (Irish Brigade, ordered by Meagher at Fredericksburg; NOT confirmed for Gettysburg)", ["kepi", "irish_sprig"], conditional=True)
item("cap_deer_tail", H, "union", "Bucktail deer tail on cap or hat (Bucktail regiments; July 1863 presence unconfirmed)", ["deer_tail"], conditional=True)
# --- Union coat -------------------------------------------------------------------------------------------------
item("sack_coat_union", C, "union", "Sack coat: loose, four brass buttons (eagle), fall collar, inside left breast pocket; medium to dark blue", ["sack"])
item("frock_coat_union", C, "union", "Frock coat: dark blue wool, nine front buttons, light blue piping at collar and cuffs", ["frock"])
item("frock_coat_iron_brigade", C, "union", "Long dark blue nine-button frock coat with light blue trim (Iron Brigade)", ["frock", "iron_brigade"])
item("frock_coat_officer_single", C, "union", "Single-breasted frock coat, 7-9 buttons (captains, lieutenants)", ["frock", "officer_only"])
item("frock_coat_officer_double", C, "union", "Double-breasted frock coat, black velvet facings, buttons in groups of twos or threes by rank (senior officers, generals)", ["frock", "officer_only"])
item("sack_coat_officer_straps", C, "union", "Sack coat with shoulder straps added (many officers)", ["sack", "officer_only"])
item("fatigue_dress_no_straps_meade", C, "union", "Fatigue dress with no shoulder straps (Meade, 3 Jul)", ["officer_only", "named_individual"])
item("zouave_jacket_114pa", C, "union", "Dark blue collarless jacket, sky blue cuffs, red trim, 'tombeaux' arabesque on breast (114th PA)", ["zouave"])
item("zouave_jacket_146ny", C, "union", "Sky blue jacket with yellow trim (146th NY, from 3 Jun 1863)", ["zouave"])
item("zouave_jacket_44ny_original", C, "union", "Dark blue jacket with red cuff piping (44th NY original Americanized Zouave form)", ["zouave"])
item("bersaglieri_tunic_39ny", C, "union", "Six-button red-trimmed tunic (39th NY original 1861 dress)", ["garibaldi_guard"])
item("zouave_jacket_5ny_reference", C, "union", "Dark blue jacket trimmed red: 5th NY reference dress only, unit absent", ["zouave", "reference_only"])
item("berdan_green_frock_coat", C, "union", "Green wool frock coat, black (hard rubber) buttons, no shiny brass (Berdan's Sharpshooters)", ["berdan_green", "frock"])
item("berdan_modified_blue_coat", C, "union", "Modified blue uniform item (Wikipedia: most Berdan men wore modified blue by the Gettysburg campaign)", ["berdan_blue_replacement"])
item("sack_coat_regulars_fatigue", C, "union", "Four-button blouse (US Regulars)", ["sack", "regular"])
item("mounted_jacket_cavalry_union", C, "union", "Dark blue wool mounted-service short jacket, quilted lining, yellow worsted tape piping", ["cavalry_yellow"])
item("jacket_artillery_red_trim", C, "union", "Red-trimmed mounted-service short jacket (artillery)", ["artillery_red"])
item("frock_coat_artillery_red_trim", C, "union", "Red-trimmed frock coat (supposedly heavy artillery)", ["artillery_red", "frock"])
item("short_shell_jacket_union", C, "union", "Short shell jacket (artillery)", [])
item("sack_coat_ambulance_green_chevron", C, "union", "Infantry-pattern coat with green half-chevron 2 in wide on each arm above the elbow (Ambulance Corps privates)", ["sack", "green_chevron"])
item("coat_surgeon_dark_blue_green_sash", C, "union", "Dark blue frock or sack coat with green sash accents (surgeons; Gettysburg-specific dress open)", ["medical"])
item("coat_civilian_style", C, "either", "Civilian-style or worn infantry dress (teamsters, wagoners; sutlers civilian)", ["civilian"])
# --- Union trousers ---------------------------------------------------------------------------------------------
item("trousers_sky_blue_kersey", T, "union", "Sky blue kersey trousers, high waist, no pleats; fading toward gray-blue with wear", [])
item("trousers_dark_blue_union", T, "union", "Dark blue trousers (replacement pairs; generals and staff)", [])
item("trousers_civilian_replacement", T, "union", "Civilian-cloth replacement trousers", ["civilian"])
item("trousers_sky_blue_reinforced_seat", T, "union", "Sky-blue kersey trousers with reinforced seat (cavalry)", ["cavalry_yellow"])
item("trousers_zouave_chasseur_114pa", T, "union", "Madder red chasseur trousers (114th PA)", ["zouave"])
item("trousers_zouave_baggy_146ny", T, "union", "Sky blue baggy trousers (146th NY)", ["zouave"])
item("trousers_44ny_red_stripe", T, "union", "Dark blue trousers with a red stripe (44th NY original)", ["zouave"])
item("trousers_39ny_red_outseam", T, "union", "Dark blue trousers with red outseam stripe (39th NY original)", ["garibaldi_guard"])
item("trousers_5ny_red_baggy_reference", T, "union", "Red baggy pantaloons: 5th NY reference dress only, unit absent", ["zouave", "reference_only"])
item("trousers_berdan_green", T, "union", "Green trousers (Berdan's Sharpshooters)", ["berdan_green"])
item("trousers_crimson_stripe_ordnance", T, "union", "Crimson trouser stripe (medical and ordnance)", [])
# --- shoes / leg wear -------------------------------------------------------------------------------------------
item("brogan_jefferson", SH, "either", "Black leather Jefferson-pattern brogan / Jefferson bootee", [])
item("worn_out_shoes_cs", SH, "confederate", "Worn-out shoes (small Confederate minority, flagged plausible-procedural)", ["flagged_minority"])
item("barefoot_cs", SH, "confederate", "Barefoot (Confederate only, small minority, flagged plausible-procedural)", ["flagged_minority", "barefoot"])
item("gaiters_white_114pa", SH, "union", "White gaiters with leather jambieres (114th PA)", ["zouave"])
item("gaiters_white_146ny", SH, "union", "White leggings (146th NY)", ["zouave"])
item("gaiters_leather_44ny", SH, "union", "Leather gaiters (44th NY original)", ["zouave"])
item("gaiters_white_39ny", SH, "union", "White gaiters (39th NY original)", ["garibaldi_guard"])
item("gaiters_white_5ny_reference", SH, "union", "White gaiters: 5th NY reference dress only, unit absent", ["zouave", "reference_only"])
item("gaiters_leather_berdan", SH, "union", "Leather gaiters (Berdan's Sharpshooters)", ["berdan_green"])
item("leggings_white_iron_brigade", SH, "union", "White linen leggings with leather straps (Iron Brigade, added May 1862; July 1863 wear OPEN)", ["iron_brigade"], conditional=True)
item("leggings_regulars", SH, "union", "Leggings issued to regulars but soon discarded (July 1863 wear OPEN)", ["regular"], conditional=True)
# --- shirts -----------------------------------------------------------------------------------------------------
item("shirt_wool_gray", S, "union", "Coarse wool pullover shirt, three buttons, gray", [])
item("shirt_white", S, "union", "White shirt (white linen or cotton)", [])
item("shirt_plaid_flannel", S, "union", "Homemade plaid flannel shirt", [])
item("shirt_red_zouave_44ny", S, "union", "Red zouave shirt (44th NY original)", ["zouave"])
item("shirt_unspecified_cs", S, "confederate", "GAP PLACEHOLDER: Confederate shirt colour and fabric are not stated in B.6.4", ["gap_placeholder"])
item("shirt_unspecified_union_unit", S, "union", "GAP PLACEHOLDER: shirt not stated for this unit-specific dress", ["gap_placeholder"])
# --- Union accoutrements ----------------------------------------------------------------------------------------
item("belt_black_oval_us", AC, "union", "Black leather waist belt, oval US buckle (infantry)", [])
item("belt_rect_eagle_plate", AC, "union", "Rectangular eagle plate belt (officers, NCOs, cavalry); first sergeants and musicians the rectangular sword-belt plate", [])
item("cartridge_box_union_40rd", AC, "union", "Cartridge box, right hip, 40 rounds, tin-lined (M1855 vs M1861 specifics: gap)", [])
item("cap_pouch_union", AC, "union", "Cap pouch on belt front", [])
item("bayonet_scabbard_union", AC, "union", "Bayonet scabbard on the belt (scabbard type: gap)", [])
item("canteen_tin_cloth_cover", AC, "union", "Canteen: two tin halves, pewter spout, cloth cover; tin cup (type proportions: gap)", [])
item("haversack_painted_canvas", AC, "union", "Painted canvas haversack, shoulder sling", [])
item("knapsack_black_painted", AC, "union", "Black-painted knapsack ('soldier's trunk') holding clothing and a gum blanket", [])
item("blanket_roll_union", AC, "union", "Blanket roll atop the pack or worn as a shoulder roll", [])
item("gum_blanket", AC, "union", "Gum (rubber) blanket, groundsheet and rain gear", [])
item("tin_cup", AC, "either", "Tin cup", [])
item("sash_crimson_union", AC, "union", "Crimson sash (regulation for officers and sergeants; rare in the field at Gettysburg)", ["sash"], conditional=True)
item("sash_zouave_sky_blue_114pa", AC, "union", "Sky blue sash (114th PA)", ["zouave", "sash"])
item("sash_zouave_red_146ny", AC, "union", "Red sash (146th NY)", ["zouave", "sash"])
item("sash_zouave_5ny_reference", AC, "union", "Red sash: 5th NY reference dress only, unit absent", ["zouave", "sash", "reference_only"])
item("sash_red_artillery", AC, "either", "Red sash (artillery and infantry)", ["sash"])
item("sash_yellow_cavalry", AC, "either", "Yellow sash (cavalry sergeants)", ["sash"])
item("m1858_sword_belt_cav", AC, "union", "M1858 sword belt (cavalry)", ["cavalry_yellow"])
item("holster_butt_forward_right", AC, "union", "Holster, butt-forward on the right (cavalry)", [])
item("carbine_box_m1860_or_sharps", AC, "union", "M1860 carbine cartridge box (or Sharps box)", [])
item("carbine_sling_roller_snap", AC, "union", "Black leather carbine sling with roller snap", [])
item("mcclellan_saddle_m1859", AC, "union", "M1859 McClellan saddle, wool girth, hooded stirrups, blackened-leather saddlebags", [])
item("bridle_union_cav", AC, "union", "6- or 3-buckle bridle, US iron bit, halter", [])
item("horse_furniture_union_misc", AC, "union", "Leather nosebag; hemp lariat with iron picket pin; blue saddle blanket with orange stripe and US", [])
item("overcoat_sky_blue_caped", AC, "union", "Sky-blue caped overcoat (July 1863 use: gap, likely left in wagons)", ["conditional_gap"], conditional=True)
item("shelter_half", AC, "union", "Shelter half (unlikely in July 1863; gap leaning inferred)", ["conditional_gap"], conditional=True)
item("nco_sword_in_wagon", AC, "union", "NCO sword, often left in wagons", ["conditional_gap"], conditional=True)
item("rubber_poncho", AC, "union", "Rubber poncho (more for cavalry and artillery)", [])
item("tools_pioneer", AC, "union", "Tools (pioneers/engineers)", [])
item("stretcher", FL, "union", "Stretcher (two per ambulance)", [])
# --- Confederate headgear / coat / trousers / equipment ---------------------------------------------------------
item("slouch_hat_cs", H, "confederate", "Slouch hat, wool or felt, brown/gray/black", ["slouch"])
item("straw_hat_cs", H, "confederate", "Straw hat (allowed for artillery in summer; also listed among general Confederate hats)", ["straw"])
item("plain_cap_cs", H, "confederate", "Plain cap", [])
item("kepi_cs", H, "confederate", "Kepi (officers and private purchase only; rare outside)", ["kepi"])
item("hardee_hat_cs_cavalry", H, "confederate", "Hardee-type hat (cavalry often)", ["hardee"])
item("hat_wheats_tiger", H, "confederate", "BARRED: Wheat's Tiger dress (1st Special Battalion, gone by 1862)", ["wheats_tiger_dress", "zouave"], barred=True)
item("dress_coppens_zouave", C, "confederate", "BARRED: Coppens' Zouave dress (1st Louisiana Zouave Battalion, decimated 1862)", ["coppens_zouave_dress", "zouave"], barred=True)
item("jacket_tiger_zouave_style", C, "confederate", "BARRED: Zouave-style jacket of Wheat's Tigers / Coppens' (early war)", ["wheats_tiger_dress", "zouave"], barred=True)
item("cs_type_ii_jacket", C, "confederate", "Richmond Depot Type II-style gray or butternut jean shell jacket: nine buttons, shoulder straps, belt loops, untrimmed (mostly)", ["cs_jacket"])
item("cs_type_i_jacket", C, "confederate", "Richmond Depot Type I jacket (early type; rare by July 1863; no certain originals)", ["cs_jacket", "type_i"], conditional=True)
item("cs_type_iii_jacket", C, "confederate", "BARRED: Richmond Depot Type III jacket (no shoulder straps or belt loops, dark blue-gray English kersey): postdates the battle in PDF's anachronism list", ["type_iii", "cs_jacket"], barred=True)
item("cs_transitional_kersey_jacket", C, "confederate", "BARRED: transitional fall/winter 1863 kersey jacket (postdates the battle)", ["type_iii", "cs_jacket"], barred=True)
item("cs_civilian_coat", C, "confederate", "Civilian coat", ["civilian"])
item("cs_frock_coat", C, "confederate", "Frock coat (still in Gettysburg photographs)", ["frock"])
item("cs_captured_union_blue_item", C, "confederate", "Captured Union blue coat or blouse item", ["captured_union"])
item("cs_cavalry_shell_jacket", C, "confederate", "Short shell jacket, cavalry yellow/buff trim", ["cavalry_yellow"])
item("cs_artillery_jacket_red_trim", C, "confederate", "Gray or butternut jacket with red trim (when supply allowed)", ["artillery_red"])
item("cs_artillery_jacket_untrimmed", C, "confederate", "Untrimmed gray or butternut jacket", [])
item("cs_officer_frock_or_shell", C, "confederate", "Simple frock coat or shell jacket with collar insignia only", ["officer_only"])
item("cs_pickett_double_breasted_gold", C, "confederate", "Double-breasted coat with gold buttons (Pickett, per contemporary account)", ["officer_only", "named_individual"])
item("trousers_cs_gray", T, "confederate", "Gray trousers", [])
item("trousers_cs_brown", T, "confederate", "Brown trousers", [])
item("trousers_cs_butternut", T, "confederate", "Butternut trousers", [])
item("trousers_cs_captured_blue", T, "confederate", "Captured blue (US-pattern) trousers", ["captured_union"])
item("trousers_cs_sky_blue_early", T, "confederate", "Early-war sky blue trousers (not in default mix)", [], conditional=True)
item("trousers_cs_officer_dark_blue_stripe", T, "confederate", "Regimental infantry officer trousers with dark blue cloth stripe 1 1/4 in (regulation; Wikipedia says light/sky blue: conflict)", ["officer_only"])
item("cs_cartridge_box", AC, "confederate", "CS copy of M1839/M1857 US pattern cartridge box, belt or sling, 30-40 rounds", [])
item("cs_captured_us_box", AC, "confederate", "Captured Federal cartridge box (US-marked)", ["captured_union"])
item("cs_cap_pouch", AC, "confederate", "Cap pouch, right front of belt (CS copy of M1845/M1850, 'shield front'; captured Federal also seen)", [])
item("cs_canteen", AC, "confederate", "CS tin drum canteen, or copy of US M1858 smoothside; wooden (Gardner/Nuckolls); private patent filter canteens", [])
item("cs_haversack", AC, "confederate", "CS cotton drill haversack, plain or tarred; captured Federal M1851 probable", [])
item("cs_blanket_roll_shoulder", AC, "confederate", "Blanket roll over one shoulder ('horse collar') if no knapsack", [])
item("cs_groundcloth", AC, "confederate", "Painted-cloth groundcloth (CS) / rubberized (Federal)", [])
item("cs_belt_plate_captured_upside_down", AC, "confederate", "Captured US belt plate, often worn upside down", ["captured_union"])
item("cs_knapsack", AC, "confederate", "Knapsack (CS copy of M1825 pattern, militia hardpack, some imported French); not universally issued", [])
item("cs_gum_blanket", AC, "confederate", "Gum blanket (generic load list)", [])
item("cs_housewife_cup_plate", AC, "confederate", "Housewife, tin cup/plate (mess gear otherwise gap)", [])
item("cs_belt_plain", AC, "confederate", "Belt (type not stated for CS; CS-made or captured)", [])
item("sash_red_cs", AC, "confederate", "Red silk sash (infantry and artillery officers)", ["sash"])
item("sash_buff_general_cs", AC, "confederate", "Buff silk net sash (generals)", ["sash", "officer_only"])
# --- support items ----------------------------------------------------------------------------------------------
item("birdcage_braid_musician", C, "union", "Infantry musician 'birdcage' chest braid in the facing colour", ["musician"])
item("chevrons_branch_color", C, "union", "Chevrons on both sleeves in branch colour (sky blue infantry)", [])
item("flag_set_wigwag", FL, "union", "Wigwag flag set (Signal Corps)", [])
item("drum", FL, "either", "Drum", ["instrument"])
item("fife", FL, "either", "Fife", ["instrument"])
item("bugle", FL, "either", "Bugle", ["instrument"])
item("national_color_us", FL, "union", "US national color (pattern: not specified in B.6)", ["flag"])
item("regimental_color_union", FL, "union", "Regimental color (pattern: not specified in B.6)", ["flag"])
item("flag_green_irish", FL, "union", "Green flag (Irish Brigade; the 28th MA's 'First' the only usable green flag)", ["flag", "green_flag"])
item("guidon_swallowtail_cav", FL, "union", "Swallow-tail guidon with stars and stripes and regimental designation, with bugles (unsourced in the notes)", ["flag", "guidon"])
item("cs_anv_battle_flag", FL, "confederate", "ANV square battle flag (St Andrew's cross); Gettysburg regimental pattern OPEN; flag_state intact/torn/bearer_down", ["flag", "battle_flag"], flag_states=["intact", "torn", "bearer_down"])
item("flag_none", FL, "either", "No flag or instrument carried", [])
item("ambulance_corps_flag", FL, "union", "Corps/division ambulance flag (on wagons)", ["flag"])
# --- pack states ------------------------------------------------------------------------------------------------
item("pack_knapsack_on", PK, "either", "Knapsack on", [])
item("pack_blanket_roll_only", PK, "either", "Blanket roll only", [])
item("pack_none_haversack_canteen", PK, "either", "No roll (haversack and canteen only)", [])
item("pack_dropped", PK, "either", "Pack dropped (pile id required)", ["needs_pile_id"])
item("pack_used_as_cover", PK, "either", "Pack used as cover (3 Jul: 1st MN, 12th MA, 147th NY)", ["needs_day_gate"], valid_on="1863-07-03")
# --- bayonet states ---------------------------------------------------------------------------------------------
item("bayonet_scabbarded", BY, "either", "Bayonet in scabbard", [])
item("bayonet_fixed", BY, "either", "Bayonet fixed (charges)", [])
item("bayonet_absent", BY, "either", "No bayonet", [])
item("bayonet_none_not_applicable", BY, "either", "Not applicable (no bayonet-bearing arm)", [])
# --- barred / anachronism catalog entries (weapons live in weapons.json) ---------------------------------------
item("green_hatband_generic", H, "either", "Green hatband (claimed for the Irish Brigade and medics: unverified, probably confused: do not use)", ["green_hatband", "barred_claim"], barred=True)

# --- sidearm / sword refs use weapons.json ids ------------------------------------------------------------------
# --- badges are generated in kit_src_union.py -------------------------------------------------------------------

KIND_OF_FIELD = {"headgear": H, "coat": C, "trousers": T, "shirt": S, "shoes": SH, "accoutrements": AC,
                 "bayonet": BY, "pack_state": PK, "flag_or_instrument": FL}
