"""Union defaults and Union distinctive units (PDF B.6.2, B.6.3).  Text in 'printed' blocks is the PDF cell text,
wrapped lines joined with a space; nothing is paraphrased there."""
from kit_core import *   # noqa: F401,F403
from kit_items import item, A, F, ITEMS

item("sidearm_none", "sidearm", "either", "No sidearm or sword", [])
item("hardee_hat_cavalry_union", "headgear", "union", "Hardee hat, brim pinned up on the right (cavalry/artillery), yellow cord and feather (standard ASSUMPTION; no period source found)", ["hardee", "cavalry_yellow"])
item("boots_unspecified_cav_union", "shoes", "union", "GAP PLACEHOLDER: Union cavalry footwear not found in the cavalry notes", ["gap_placeholder"])
item("shirt_unspecified_cav", "shirt", "either", "GAP PLACEHOLDER: shirt not stated in the cavalry/artillery notes", ["gap_placeholder"])
item("zouave_dress_unspecified_headgear", "headgear", "union", "GAP PLACEHOLDER: Zouave-style headgear, items NOT specified by any source for this unit (140th NY disputed variant)", ["zouave", "gap_placeholder", "disputed_variant"])
item("zouave_dress_unspecified_coat", "coat", "union", "GAP PLACEHOLDER: Zouave-style jacket, items NOT specified (140th NY disputed variant)", ["zouave", "gap_placeholder", "disputed_variant"])
item("zouave_dress_unspecified_trousers", "trousers", "union", "GAP PLACEHOLDER: Zouave-style trousers, items NOT specified (140th NY disputed variant)", ["zouave", "gap_placeholder", "disputed_variant"])
item("knapsack_prussian_fur_berdan", "accoutrement", "union", "Prussian-style fur-covered knapsack on a wooden frame (Berdan's Sharpshooters)", ["berdan_green"])

# ---------------------------------------------------------------------------------------------------------------
# Piles of dropped packs (PDF B.6.2: object with position, owner unit, time of dropping)
PACK_PILES = [
    {"id": "PILE-97NY-0701", "owner_unit": "US.97NY", "time": "1863-07-01", "position": None,
     "state": "ordered to leave packs under a hill on July 1; the packs were lost (pile may later 'vanish')",
     "tier_printed": "documented", "source_keys": ["CWTalk-Knapsack"], "tier": "inferred", "weak_source": True,
     "open": "position and clock time not given"},
    {"id": "PILE-143PA-0701", "owner_unit": "US.143PA", "time": None, "position": None,
     "state": "stacked packs under guard; Confederates used them as breastworks",
     "tier_printed": "documented", "source_keys": ["CWTalk-Knapsack"], "tier": "inferred", "weak_source": True,
     "open": "day, position and clock time not given in B.6.2"},
]

# ---------------------------------------------------------------------------------------------------------------
# DEFAULT: Union infantry (B.6.2 'Default Union infantry mix')
RAW_DEFAULT_MIX = "All rows are inferred from the sources above and instantiated as plausible-procedural draws. The manifest stores the numeric weights; the notes provide no counts, so the weights are tuning parameters with no historical basis and must be replaced the moment a sourced count is found."

DEFAULTS["default.union.infantry"] = {
    "id": "default.union.infantry", "army": "union", "branch": "infantry",
    "printed_basis": "B.6.2 'Default Union infantry mix (when a regiment has no unit-specific source)'; " + RAW_DEFAULT_MIX,
    "fields": {k: finish_field_tier(v) for k, v in {
        "headgear": PP([A("kepi_m1858", "most"), A("slouch_hat_civilian", "smaller share"), A("hardee_hat_m1858", "few")],
                       ["Wiki-UnionUnif", "3rdUS", "Wiki-Hardee"], "Headgear: most in kepis, with a smaller share of slouch (civilian) hats and a few Hardee hats; officers more often in slouch hats.",
                       by_rank={"officer": "slouch hats more often (see default.union.officers)"}),
        "coat": PP([A("sack_coat_union", "most"), A("frock_coat_union", "minority")],
                   ["3rdUS", "Wiki-UnionUnif"], "Coat: most men in sack coats, a minority in frock coats."),
        "shirt": PP([A("shirt_wool_gray", "most"), A("shirt_white", "minority"), A("shirt_plaid_flannel", "minority")],
                    ["Wiki-UnionUnif"], "Shirt: gray wool, with white and plaid minorities.",
                    note="3rd US reenactor standard disfavors white cotton and plaid as issue; that is their rule, not period evidence"),
        "trousers": PP([A("trousers_sky_blue_kersey", "most", "faded toward gray-blue with wear (wear variance)"),
                        A("trousers_dark_blue_union", "few", "replacement pair"), A("trousers_civilian_replacement", "few", "replacement pair")],
                       ["Wiki-UnionUnif", "3rdUS"], "Trousers: sky blue faded toward gray-blue; a few replacement pairs in dark blue or civilian cloth are allowed."),
        "shoes": PP([A("brogan_jefferson", "all")], ["3rdUS"], "Shoes: black brogans only.",
                    note="B.6.2 table: Black leather Jefferson-pattern brogans, no boots for enlisted men [3rdUS]; a Wikipedia 'Jeff Davis' boots mention is low confidence and not used"),
        "accoutrements": ACC([
            comp("belt_black_oval_us", "all", "documented", ["Wiki-UnionUnif"]),
            comp("cartridge_box_union_40rd", "all", "documented", ["AHC-Sidebar"]),
            comp("cap_pouch_union", "all", "documented", ["AHC-Sidebar"]),
            comp("bayonet_scabbard_union", "all", "documented", ["Goodreads"], detail="bayonet shape documented only at a blog (secondary); scabbard type: gap"),
            comp("canteen_tin_cloth_cover", "all", "documented", ["AHC-Sidebar", "Goodreads"], detail="'Bulls-eye' being the most common type is from memory only; proportions by type: gap"),
            comp("haversack_painted_canvas", "all", "documented", ["AHC-Sidebar", "Goodreads"]),
            comp("tin_cup", "all", "documented", ["AHC-Sidebar", "Goodreads"], detail="a tin cup on the canteen"),
            comp("gum_blanket", "some", "documented", ["Wiki-UnionUnif", "NPS-Accout"]),
        ], note="Knapsack/blanket roll come from pack_state. Mess gear, M1855 vs M1861 box specifics, Hardee vs double-bag knapsack differences: not retrieved (gap, G5)."),
        "bayonet": PP([A("bayonet_scabbarded", "most"), A("bayonet_fixed", "few", "scene state: fixed for charges"), A("bayonet_absent", "few")],
                      ["Goodreads"], None, basis="inferred",
                      note="B.6.12: bayonet 'Fixed, scabbarded, absent', tier per field.  Triangular socket bayonet (blog, secondary).  Bayonet use as a killing weapon is rare in the notes; fixed for charges."),
        "sidearm_sword": PP([A("sidearm_none", "all")], [], "Enlisted men: no sidearm. NCO swords often in wagons (documented weak, [Goodreads]); officers: see default.union.officers.",
                            basis="inferred"),
        "pack_state": PP([A("pack_blanket_roll_only", "most", "haversack, canteen and a rolled blanket or gum blanket over the shoulder"),
                          A("pack_knapsack_on", "some"), A("pack_none_haversack_canteen", "few")],
                         ["CWTalk-Knapsack", "AuthCamp-Knapsack"],
                         "For every other Union unit: mixed state (inferred). Most men with haversack, canteen and a rolled blanket or gum blanket over the shoulder; some with a knapsack on. A unit ordered into action on arrival gets a pile of dropped packs behind its line as a unit-specific event, not as a blanket rule.",
                         note="Veteran-reenactor discussion agrees there was no firm Gettysburg-specific rule [AuthCamp-Knapsack]"),
        "badge": None,   # per corps (badge_field)
        "flag_or_instrument": PP([A("national_color_us", "few", "color guard only"), A("regimental_color_union", "few", "color guard only"),
                                  A("flag_none", "most")], [], "B.6 does not specify Union national/regimental color patterns; flag state intact/torn/bearer_down",
                                 basis="inferred", note="OPEN: Union colour patterns are not in B.6; musicians carry drum/fife/bugle (role-driven)"),
    }.items() if v is not None},
    "rank_note": "officers/NCOs: see rank_rules and default.union.officers",
}
DEFAULTS["default.union.infantry"]["badge_policy"] = "per corps via badge_field(); never defaulted. A badge is never added to a unit in a corps where its shape is unsourced without tagging the soldier's badge field plausible-procedural."

# DEFAULT weapon fields (B.6.10 rule for units not in the table)
BARRY = {"p1853_enfield": 39, "m1861_springfield": 23}
_tot = sum(BARRY.values())
_MAIN_SHARE = 0.95   # tuning: the two date-correct main types carry 95%; the three flagged exceptions share the remaining 5% (<= the ~10% documented smoothbore share)
_derived = {k: round(_MAIN_SHARE * v / _tot, 4) for k, v in BARRY.items()}


def dw(item_id, value, basis, flagged=False, tier="plausible-procedural", **kw):
    d = {"item": item_id, "share": None,
         "weight": {"value": value, "kind": "tuning_parameter", "historical_basis": False, "derived_from": basis},
         "tier": tier, "flagged_exception": flagged}
    d.update(kw)
    return d


DEFAULTS["default.union.infantry"]["fields"]["weapon"] = F([
    dw("p1853_enfield", _derived["p1853_enfield"], "Barry 1864 chart: Enfield P53 in 39% of regiments, normalised over the two date-correct main types (39/(39+23)) then scaled by 0.95 (tuning); regiments not men"),
    dw("m1861_springfield", _derived["m1861_springfield"], "Barry 1864 chart: US Model (1861) 23% of regiments, normalised (23/(39+23)) then scaled by 0.95 (tuning); regiments not men"),
    dw("lorenz_m1854", 0.0167, "tuning; flagged exception, total exception share kept at or below the documented smoothbore share (about 10%, [AR-Guns])", flagged=True, max_share_cap=0.10),
    dw("m1841_mississippi", 0.0166, "tuning; flagged exception (cap as above)", flagged=True, max_share_cap=0.10),
    dw("m1842_smoothbore", 0.0167, "tuning; flagged exception: M1842 is assigned only to regiments the notes name (cap as above)", flagged=True, max_share_cap=0.10),
], "plausible-procedural", ["Barry", "AR-Guns"],
    printed_raw="For the Union: the rifled .58/.577 types dominate and the M1842 smoothbore is assigned only to regiments the notes name; any other draw of smoothbore, Lorenz or M1841 is a flagged exception at a share no larger than the documented smoothbore share. (B.6.10 rule for units not in the table: draw from documented-share-based default, mark plausible-procedural)",
    basis_tier="inferred",
    note="Barry's chart is an 1864 snapshot with acknowledged errors and counts REGIMENTS, not men; 'mixed P53 and US 1861' (6%), US 1841 (3%) and Enfield short rifle (1%) are not drawn.",
    weapon_scope="long_arm")

# ---------------------------------------------------------------------------------------------------------------
# DEFAULT: Union XI Corps Germans (inferred)
DEFAULTS["default.union.xi_corps_german"] = {
    "id": "default.union.xi_corps_german", "army": "union", "branch": "infantry", "inherits": "default.union.infantry",
    "printed_basis": "B.6.2: Corps XI German regiments (26th WI, 82nd IL, 45th, 54th, 58th, 68th, 119th, 134th, 154th NY, 75th PA): standard blue with kepis, slouch hats and some Hardee hats; crescent badge. Inferred; no unit source retrieved.",
    "fields": {"badge": badge_field("XI", None)},
}

# ---------------------------------------------------------------------------------------------------------------
# DEFAULT: Union officers (B.6.7)
RANK_NOTE = "ranks: private, corporal, sergeant, first sergeant, lieutenant, captain, field officer, general (B.6.12)"
DEFAULTS["default.union.officers"] = {
    "id": "default.union.officers", "army": "union", "branch": "staff", "rank_note": RANK_NOTE,
    "printed_basis": "B.6.7 Union: frock coat single-breasted with 7-9 buttons for captains and lieutenants; double-breasted with black velvet facings for senior officers and generals ...",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("frock_coat_officer_single", "some", "captains and lieutenants, 7-9 buttons"),
                   A("frock_coat_officer_double", "some", "senior officers and generals; black velvet facings; buttons in groups of twos or threes by rank"),
                   A("sack_coat_officer_straps", "some", "many officers wore sack coats with straps added")],
                  "documented", ["Wiki-UnionUnif"], note="rank-to-coat split follows the printed text; shares are tuning parameters"),
        "headgear": F([A("slouch_hat_civilian", "most", "officers often wore slouch hats"), A("kepi_m1858", "some"),
                       A("generals_kepi_velvet_band", "rare", "generals only")],
                      "documented", ["CWTalk-Hancock"], note="slouch hats for officers: forum post only (weak); generals' kepi black velvet band: [Wiki-UnionUnif]"),
        "trousers": F([A("trousers_sky_blue_kersey", "most", "regimental officers"), A("trousers_dark_blue_union", "some", "generals and staff")],
                      "documented", ["Wiki-UnionUnif", "3rdUS"]),
        "shirt": F([A("shirt_white", "some", "Hancock favored white shirts (named individual)"), A("shirt_wool_gray", "some")],
                   "plausible-procedural", ["CWTalk-Hancock"], printed_raw="Hancock favored white shirts (CWTalk-Hancock); Leads to verify: confirm in a primary source"),
        "accoutrements": ACC([comp("belt_rect_eagle_plate", "all", "documented", ["Wiki-UnionUnif"], detail="sword belt rectangular plate")]),
        "sidearm_sword": F([A("m1850_foot_officer_sword", "most", "specs not retrieved: gap"), A("revolver_unspecified", "rare", "some infantry officers fired personal handguns (Capt. Nowlen, 116th PA; Col. Gaillard, 2nd SC): model not stated")],
                           "inferred", ["AR-Guns"], note="B.6.9: M1850 foot officer sword specs not retrieved (G17); personal handguns attested for individuals only"),
        "sash": F([A("sash_crimson_union", "rare", "regulation but rare in the field at Gettysburg; default: none on the line")],
                  "inferred", ["CWTalk-Hancock"], printed_raw="Default: no sashes on the line; sashes only on deliberately flashy officers or Zouave sashes where the unit's dress calls for them (inferred).",
                  note="conditional: sashes are NOT drawn by default", conditional=True),
    }.items()},
    "insignia": {
        "shoulder_straps": [
            {"rank": "2nd Lt", "insignia": "blank strap"}, {"rank": "1st Lt", "insignia": "one gold bar"},
            {"rank": "Captain", "insignia": "two gold bars"}, {"rank": "Major", "insignia": "gold leaf"},
            {"rank": "Lt Col", "insignia": "silver leaf"}, {"rank": "Colonel", "insignia": "silver eagle"},
            {"rank": "generals", "insignia": "stars"}],
        "tier_printed": "documented", "source_keys": ["Wiki-UnionUnif"], "tier": "inferred", "weak_source": True,
        "tier_note": "printed documented; only Wikipedia cited",
        "notes": ["Staff often added department initials between the straps", "Overcoats dark blue with black braid", "Officer overcoat July use: gap"]},
}

# ---------------------------------------------------------------------------------------------------------------
# DEFAULT: Union artillery (B.6.14.5), cavalry (B.6.15.4)
DEFAULTS["default.union.artillery"] = {
    "id": "default.union.artillery", "army": "union", "branch": "artillery", "inherits": "default.union.infantry",
    "printed_basis": "B.6.14.5 Artillery dress, Union column; B.6.2 branch colours (artillery scarlet)",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("jacket_artillery_red_trim", "some", "many shown in red-trimmed mounted-service jackets"),
                   A("sack_coat_union", "some", "a forum poster suspects most wore plain blue sack coats"),
                   A("short_shell_jacket_union", "few", "short shell jackets common")],
                  "documented", ["CWTalk-UnionArt"], printed_raw="documented/weak", note="red-trimmed frock coats 'supposedly for heavy artillery' are not drawn (conditional)"),
        "headgear": F([A("kepi_m1858", "all")], "documented", ["Wiki-CSUnif"], printed_raw="Sky-blue trousers; kepis or forage caps", printed_weak=True,
                      note="PDF cites 'Wikipedia Confederate uniforms' for the Union cell as printed; weak; kept verbatim"),
        "trousers": F([A("trousers_sky_blue_kersey", "all")], "documented", ["Wiki-CSUnif"], printed_weak=True),
        "shirt": F([A("shirt_unspecified_cav", "all")], "plausible-procedural", [], printed_raw="not stated"),
        "accoutrements": ACC([comp("sash_red_artillery", "rare", "documented", ["Wiki-CSUnif"], printed_weak=True, detail="Red for artillery (and infantry)"),
                              comp("belt_black_oval_us", "all", "inferred", [], detail="inherits infantry belt; gap for artillery-specific gear (haversack, gloves not documented)")]),
        "sidearm_sword": PP([A("sidearm_none", "most"), A("revolver_unspecified", "few")], ["AR-Guns"], "Artillerymen got few revolvers",
                            basis="documented"),
    }.items()},
    "crew_in_action": "Inferred: blue shell jackets or sack coats with red piping on some, kepis, sky-blue trousers, sleeves rolled in the heat",
    "horse_artillery_note": "Cannoneers mounted [RegCav-HorseArt]; visual references for Union horse vs foot artillery dress: gap",
}

DEFAULTS["default.union.cavalry"] = {
    "id": "default.union.cavalry", "army": "union", "branch": "cavalry", "inherits": "default.union.infantry",
    "printed_basis": "B.6.15.4 Union cavalry dress and equipment; B.6.2 branch colours (cavalry yellow)",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("mounted_jacket_cavalry_union", "all")], "documented", ["MaineCav-Standards"], printed_weak=True,
                  printed_raw="documented via reproduction standards (Maine Cavalry reenactor standards; not a period source)"),
        "trousers": F([A("trousers_sky_blue_reinforced_seat", "all")], "documented", ["MaineCav-Standards"], printed_weak=True,
                      printed_raw="same"),
        "headgear": F([A("hardee_hat_cavalry_union", "all")], "plausible-procedural", [], printed_raw="Hardee hat with yellow cord and feather is the standard assumption; a period source for Union cavalry hat/kepi regulations was not found (gap)", basis_tier="inferred"),
        "shoes": F([A("boots_unspecified_cav_union", "all")], "plausible-procedural", [], printed_raw="Not found in the cavalry notes (gap)"),
        "shirt": F([A("shirt_unspecified_cav", "all")], "plausible-procedural", [], printed_raw="not stated"),
        "accoutrements": ACC([
            comp("m1858_sword_belt_cav", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("holster_butt_forward_right", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("carbine_box_m1860_or_sharps", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("carbine_sling_roller_snap", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("mcclellan_saddle_m1859", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("bridle_union_cav", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("horse_furniture_union_misc", "all", "documented", ["MaineCav-Standards"], printed_weak=True),
            comp("sash_yellow_cavalry", "rare", "documented", ["Wiki-CSUnif"], printed_weak=True, detail="yellow sash for cavalry sergeants; notes partly flagged unverified"),
        ], note="Maine Cavalry is a reproduction-standards source, not a period source (PDF)"),
        "sidearm_sword": F([A("m1860_light_cav_saber", "most"), A("m1840_heavy_saber", "some", "many troopers still had the M1840"),
                            A("colt_army_1860", "some"), A("remington_1858", "few")],
                           "documented", ["Wiki-M1860", "Wiki-Colt1860", "Wiki-Rem1858"], note="weak: Wikipedia only; later in the war many left sabers on the saddle and fought dismounted"),
        "badge": F([A("badge_CAV_crossed_sabers", "minority"), A("badge_none", "most")], "plausible-procedural", [],
                   printed_raw="Cavalry Corps badge crossed sabers: NOT sourced; memory only", note="cavalry badge shape unsourced (G4)"),
        "flag_or_instrument": F([A("guidon_swallowtail_cav", "few"), A("bugle", "few"), A("flag_none", "most")], "plausible-procedural", [],
                                printed_raw="Swallow-tail guidon with stars and stripes and the regimental designation is the standard pattern, with bugles; unsourced in the notes (inferred; gap)",
                                basis_tier="inferred"),
    }.items()},
    "custer_note": "Custer's dress (velvet jacket and red tie) is popular lore, not confirmed in fetched sources (inferred/lore)",
}


# ---------------------------------------------------------------------------------------------------------------
# Union distinctive units (B.6.3)
def STD(note="Standard blue field dress"):
    return "default.union.infantry"


def std_fields(corps, div, **extra):
    d = {"badge": badge_field(corps, div)}
    d.update(extra)
    return d


# --- Iron Brigade -----------------------------------------------------------------------------------------------
IB_PRINTED = {
    "documented": "Black M1858 Hardee hat, brim pinned up on the left, brass eagle, brass bugle, brass regiment number and company letter, cord, ostrich feather; red I Corps patch on the hat; long dark blue nine-button frock coat with light blue trim, worn on campaign and in battle; sky blue trousers in all regiments by Gettysburg; white linen leggings with leather straps were added in May 1862 (see leggings caveat). Color Sgt Philander Wright, 2nd WI, had a hat with two bullet holes on July 1. Confederates recognized the hats on July 1. 1,883-1,885 engaged, 1,153 casualties",
    "open": "Whether the 24th MI (added after the others) was fully in black hats; whether leggings were still worn on July 1; hat condition",
    "default": "2nd, 6th, 7th WI and 19th IN: black Hardee hat with the I Corps patch, frock coat, sky blue trousers, no leggings (leggings flagged open). 24th MI: black hat but flagged inferred",
    "tier": "hats and coats documented; leggings and 24th MI open; rest plausible-procedural",
}
IB_KEYS = ["Wiki-IronBde", "BGE-Dispatch", "WisVets"]
O("OPEN-IB-LEGGINGS", "Whether leggings were still worn on July 1 (Iron Brigade)", [], IB_KEYS)
O("OPEN-IB-24MI", "Whether the 24th MI (added after the others) was fully in black hats", [], IB_KEYS)
O("OPEN-IB-HATCOND", "Iron Brigade hat condition (wear, bullet damage beyond Color Sgt Wright's hat)", [], IB_KEYS)

IB_WEAPON = {
    "US.2WI": ("lorenz_m1854", "Austrian muskets (Lorenz) per a forum poster", "UA-2WI"),
    "US.6WI": ("springfield_model_unspecified", "Springfield per the same poster", "UA-IB-REST"),
    "US.7WI": ("springfield_model_unspecified", "Springfield per the same poster", "UA-IB-REST"),
    "US.19IN": ("springfield_model_unspecified", "Springfield per the same poster", "UA-IB-REST"),
}


def iron_brigade(uid, name, hat_tier="documented"):
    f = {
        "headgear": F([A("hardee_hat_iron_brigade", "all")], "documented", IB_KEYS, unit_wide=True, source_basis="unit_list_positional",
                      printed_raw=IB_PRINTED["tier"], note="source keys are the Iron Brigade group of the B.6 source list; per-cell mapping not printed"),
        "coat": F([A("frock_coat_iron_brigade", "all")], "documented", IB_KEYS, unit_wide=True, source_basis="unit_list_positional",
                  printed_raw=IB_PRINTED["tier"]),
        "trousers": F([A("trousers_sky_blue_kersey", "all")], "plausible-procedural", IB_KEYS, source_basis="unit_list_positional",
                      printed_raw=IB_PRINTED["tier"], basis_tier="documented",
                      tier_conflict={"documented_column": "sky blue trousers in all regiments by Gettysburg (documented column)",
                                     "tier_cell": "hats and coats documented; ... rest plausible-procedural",
                                     "applied": "lower tier (tier cell) pending a per-claim source"}),
        "badge": F([A("badge_I_red", "all", "red I Corps patch on the hat")], "documented", ["Wiki-IronBde"], printed_weak=True,
                   note="B.6.2 says the Wikipedia Iron Brigade page gives a red I Corps patch on the hat; applies to all men per the B.6.3 default-kit cell (conflicts with the general 'minority' badge product rule: carried as ambiguity)"),
        "shoes": F([A("brogan_jefferson", "all")], "plausible-procedural", [], printed_raw="no leggings (leggings flagged open)", basis_tier="inferred"),
    }
    return f


for uid, nm in (("US.2WI", "2nd Wisconsin Infantry"), ("US.6WI", "6th Wisconsin Infantry"), ("US.7WI", "7th Wisconsin Infantry"), ("US.19IN", "19th Indiana Infantry")):
    w = IB_WEAPON[uid]
    f = iron_brigade(uid, nm)
    f["weapon"] = F([A(w[0], "all")], "inferred", ["AuthCamp-WhoArmed"], printed_raw="weak: flagged", printed_weak=True,
                    note=w[1], assignment_id=w[2], flagged=True)
    unit(uid, nm, "union", hierarchy_printed="I Corps, 1st Div, 1st Bde", corps="I", division="1st", brigade="1st (Iron Brigade)",
         group="iron_brigade", inherits="default.union.infantry", fields=f, printed=IB_PRINTED,
         opens=["OPEN-IB-LEGGINGS", "OPEN-IB-HATCOND"], conditional=[{"item": "leggings_white_iron_brigade", "status": "open: July 1863 wear unconfirmed; not drawn"}],
         weapon_assignment_ids=[w[2]])

f24 = {"headgear": F([A("hardee_hat_iron_brigade", "all")], "inferred", IB_KEYS, source_basis="unit_list_positional",
                     printed_raw="24th MI: black hat but flagged inferred", note="24th MI added after the others"),
       "badge": F([A("badge_I_red", "all")], "inferred", ["Wiki-IronBde"], printed_weak=True, note="assumed same patch; 24th MI not singled out"),
       "weapon": F([A("m1861_springfield", "all")], "inferred", ["AuthCamp-WhoArmed"], printed_raw="weak: flagged", printed_weak=True,
                   note="24th Michigan: M1861 Springfield per the same poster, uncited", assignment_id="UA-24MI", flagged=True)}
unit("US.24MI", "24th Michigan Infantry", "union", hierarchy_printed="I Corps, 1st Div, 1st Bde", corps="I", division="1st", brigade="1st (Iron Brigade)",
     group="iron_brigade", inherits="default.union.infantry", fields=f24, printed=IB_PRINTED,
     opens=["OPEN-IB-24MI", "OPEN-IB-LEGGINGS"],
     notes="B.6.3 default-kit cell gives only the hat for the 24th MI; coat, trousers and the rest are inherited from the default (the PDF's documented column states a brigade-wide frock coat: ambiguity carried in KIT-NOTES)",
     parse_status="partial", weapon_assignment_ids=["UA-24MI"])

# --- 114th PA ---------------------------------------------------------------------------------------------------
PA114_PRINTED = {
    "documented": "Red fez with yellow-gold tassel (a white turban only for parade and guard duty); dark blue collarless jacket with sky blue cuffs and red trim; 'tombeaux' arabesque on the breast; sky blue sash; madder red chasseur trousers; white gaiters; leather jambieres; cloth imported from France. Fought the Peach Orchard salient; 155 of 312 lost. A forum says they probably still wore it in 1863",
    "open": "Wear and replacement by July 1863; how many men had swapped to standard issue",
    "default": "Full Zouave dress with fez, wear-worn; a minority with replacement items (e.g., standard trousers) flagged",
    "tier": "documented (dress); replacement share plausible-procedural"}
K114 = ["Wiki-114PA", "CWTalk-Zouave"]
O("OPEN-114PA-WEAR", "114th PA: wear and replacement by July 1863; how many men had swapped to standard issue", ["G3"], K114)
unit("US.114PA", "114th Pennsylvania Infantry (Collis' Zouaves)", "union", hierarchy_printed="III Corps, 1st Div, 1st Bde", corps="III", division="1st", brigade="1st",
     group="zouave", inherits="default.union.infantry", zouave_policy="required", allowed_tags=["zouave"], printed=PA114_PRINTED, opens=["OPEN-114PA-WEAR"],
     fields={
         "headgear": F([A("fez_red_114pa", "all")], "documented", K114, unit_wide=True, source_basis="unit_list_positional", note="white turban parade/guard only: not drawn"),
         "coat": F([A("zouave_jacket_114pa", "all")], "documented", K114, unit_wide=True, source_basis="unit_list_positional"),
         "trousers": F([A("trousers_zouave_chasseur_114pa", "most"), A("trousers_sky_blue_kersey", "few", "replacement item; applied per company", tier="plausible-procedural", scope="company")],
                       "documented", K114, source_basis="unit_list_positional", printed_raw="documented (dress); replacement share plausible-procedural"),
         "shoes": F([A("gaiters_white_114pa", "all")], "documented", K114, source_basis="unit_list_positional", note="white gaiters; leather jambieres"),
         "accoutrements": ACC([comp("sash_zouave_sky_blue_114pa", "all", "documented", K114), comp("belt_black_oval_us", "all", "documented", ["Wiki-UnionUnif"]),
                               comp("cartridge_box_union_40rd", "all", "documented", ["AHC-Sidebar"]), comp("cap_pouch_union", "all", "documented", ["AHC-Sidebar"]),
                               comp("canteen_tin_cloth_cover", "all", "documented", ["AHC-Sidebar"]), comp("haversack_painted_canvas", "all", "documented", ["AHC-Sidebar"])]),
         "weapon": F([A("p1853_enfield", "some"), A("m1861_springfield", "some")], "plausible-procedural", [], printed_raw="1st Minnesota, 14th Brooklyn (84th NY), 114th PA ... not found; for the Union three, .58 Springfield/Enfield-pattern is inferred only (gap)", basis_tier="inferred", assignment_id="UA-GAP-3", flagged=True),
         "badge": badge_field("III", "1st"),
     }, weapon_assignment_ids=["UA-GAP-3"])

# --- 146th NY ---------------------------------------------------------------------------------------------------
PA146_PRINTED = {
    "documented": "Changed on 3 June 1863 from standard blue to Zouave: sky blue jacket with yellow trim, sky blue baggy trousers, red fez with tassel (page inconsistent on tassel color), red sash, white turban for parade only, white leggings. Veterans of the 5th NY had transferred in",
    "open": "Tassel color; whether the new dress was complete for every company one month later",
    "default": "Zouave dress as listed, with tassel color shown as a variance range",
    "tier": "documented (dress); tassel open"}
K146 = ["Wiki-146NY"]
O("OPEN-146NY-TASSEL", "146th NY: fez tassel colour (source page inconsistent); whether the new dress was complete for every company a month after 3 Jun 1863", ["G6"], K146)
unit("US.146NY", "146th New York Infantry", "union", hierarchy_printed="V Corps, 2nd Div, 3rd Bde, Weed/Garrard", corps="V", division="2nd", brigade="3rd (Weed/Garrard)",
     group="zouave", inherits="default.union.infantry", zouave_policy="required_from_date", allowed_tags=["zouave"], printed=PA146_PRINTED, opens=["OPEN-146NY-TASSEL"],
     fields={
         "headgear": F([A("fez_red_146ny", "all", valid_from="1863-06-03")], "documented", K146, unit_wide=True, date_fallback="inherit_default",
                       note="dress valid from 1863-06-03; before that, standard blue (default); tassel colour shown as a variance range"),
         "coat": F([A("zouave_jacket_146ny", "all", valid_from="1863-06-03")], "documented", K146, unit_wide=True, date_fallback="inherit_default"),
         "trousers": F([A("trousers_zouave_baggy_146ny", "all", valid_from="1863-06-03")], "documented", K146, unit_wide=True, date_fallback="inherit_default"),
         "shoes": F([A("gaiters_white_146ny", "all", valid_from="1863-06-03")], "documented", K146, date_fallback="inherit_default"),
         "accoutrements": ACC([comp("sash_zouave_red_146ny", "all", "documented", K146, valid_from="1863-06-03"), comp("belt_black_oval_us", "all", "documented", ["Wiki-UnionUnif"]),
                               comp("cartridge_box_union_40rd", "all", "documented", ["AHC-Sidebar"]), comp("cap_pouch_union", "all", "documented", ["AHC-Sidebar"]),
                               comp("canteen_tin_cloth_cover", "all", "documented", ["AHC-Sidebar"]), comp("haversack_painted_canvas", "all", "documented", ["AHC-Sidebar"])]),
         "badge": badge_field("V", "2nd"),
     }, notes="Veterans of the 5th NY had transferred in (PDF); that is not a licence for 5th NY reference items on this unit.")

# --- 140th NY (DISPUTED) ----------------------------------------------------------------------------------------
dispute("DISP-140NY-DRESS", "140th New York dress at Gettysburg: regulation blue vs Zouave dress",
        [{"variant": "regulation_blue_zouave_jan_1864", "claim": "regulation blue; Zouave outfit issued January 1864, so at Gettysburg the regiment wore standard dress; no Zouave items",
          "source": "PDF B.6.3 (also stated in the PDF front summary); printed tier 'documented (correction)'", "source_keys": ["Wiki-140NY"], "tier_printed": "documented (correction)", "weak_source": True},
         {"variant": "zouave_from_1863_06_03", "claim": "Zouave dress from 3 June 1863",
          "source": "a reading of the 146th NY regimental history that has not been re-verified against the text (not in PDF B.6; no source key)", "source_keys": [], "tier_printed": None, "weak_source": True,
          "note": "3 June 1863 is the date the PDF assigns to the 146th NY's change to Zouave dress; whether the earlier read concerned the 140th is not established here. Item detail for this variant is not specified by any source: placeholders used."}],
        status="disputed", pdf_default="regulation_blue_zouave_jan_1864 (PDF B.6.3); NOT adopted as a default here", unit_ids=["US.140NY"],
        handling="Both variants are carried as selectable scenarios; no default chosen. The validator treats the unit as 'disputed: both allowed, flagged' and never hard-codes either.")
PA140_PRINTED = {
    "documented": "Zouave outfit issued January 1864, so at Gettysburg the regiment wore standard dress. Little Round Top charge, O'Rorke killed",
    "open": "Exact headgear mix",
    "default": "Regulation blue (sack coat/frock, kepi and slouch hat mix, sky blue trousers). No Zouave items",
    "tier": "documented (correction)"}
O("OPEN-140NY-DRESS", "140th NY dress dispute (regulation blue vs Zouave from 3 Jun 1863); exact headgear mix", ["G6"], ["Wiki-140NY"])
K140 = ["Wiki-140NY"]
unit("US.140NY", "140th New York Infantry", "union", hierarchy_printed="V Corps, 2nd Div, 3rd Bde", corps="V", division="2nd", brigade="3rd",
     group="disputed_dress", inherits="default.union.infantry", zouave_policy="disputed_variant", allowed_tags=["zouave"], printed=PA140_PRINTED,
     dispute_ids=["DISP-140NY-DRESS"], opens=["OPEN-140NY-DRESS"], fields={"badge": badge_field("V", "2nd")},
     variants={"regulation_blue_zouave_jan_1864": {
         "label": "regulation blue (Zouave dress Jan 1864)", "tier_printed": "documented (correction)", "source_keys": K140,
         "fields": {
             "headgear": F([A("kepi_m1858", "most"), A("slouch_hat_civilian", "smaller share")], "documented", K140, printed_raw="documented (correction); exact headgear mix open", unit_wide=False),
             "coat": F([A("sack_coat_union", "most"), A("frock_coat_union", "minority")], "documented", K140, printed_raw="documented (correction)"),
             "trousers": F([A("trousers_sky_blue_kersey", "all")], "documented", K140, printed_raw="documented (correction)"),
         }},
         "zouave_from_1863_06_03": {
         "label": "Zouave dress from 3 Jun 1863 (alternative)", "tier_printed": None, "source_keys": [],
         "fields": {
             "headgear": F([A("zouave_dress_unspecified_headgear", "all")], "plausible-procedural", [], printed_raw="alternative read; item detail unspecified by any source", note="placeholder item; the source gives no item list", basis_tier="inferred"),
             "coat": F([A("zouave_dress_unspecified_coat", "all")], "plausible-procedural", [], printed_raw="alternative read; item detail unspecified", basis_tier="inferred"),
             "trousers": F([A("zouave_dress_unspecified_trousers", "all")], "plausible-procedural", [], printed_raw="alternative read; item detail unspecified", basis_tier="inferred"),
         }}})

# --- 5th NY (absent) --------------------------------------------------------------------------------------------
unit("US.5NY_INF", "5th New York Infantry (Duryee's Zouaves)", "union", hierarchy_printed="not in the order of battle", group="absent",
     presence={"status": "absent_from_gettysburg", "note": "Mustered out 14 May 1863 after Chancellorsville; NOT at Gettysburg. Do not include in the order of battle. (5th NY Veteran Battalion served in 1864.) '5th NY Cavalry' in Kilpatrick's 3rd Div is a different unit.",
               "tier_printed": "documented (absence)", "source_keys": ["Wiki-5NY"], "tier": "inferred", "weak_source": True},
     zouave_policy="forbidden", forbidden_tags=["zouave", "reference_only"], parse_status="parsed", printed={
         "documented": "Mustered out 14 May 1863 after Chancellorsville; NOT at Gettysburg. Reference dress only: dark blue jacket trimmed red, red fez with yellow tassel, red sash, red baggy pantaloons, white gaiters. (5th NY Veteran Battalion served in 1864.)",
         "open": "n/a", "default": "None; a validator rejects any Zouave item on a '5th NY' infantry soldier", "tier": "documented (absence)"},
     notes="Reference dress items exist in the item catalog only (tag reference_only) so the validator can reject them.")

# --- 44th NY ----------------------------------------------------------------------------------------------------
O("OPEN-44NY-DRESS", "44th NY: whether the original Americanized Zouave dress was still worn in 1863 (doubtful); condition at Gettysburg", ["G6"], ["Wiki-44NY"])
unit("US.44NY", "44th New York Infantry (Ellsworth's Avengers)", "union", hierarchy_printed="V Corps, 3rd Bde, Vincent/Rice", corps="V", division=None, brigade="3rd (Vincent/Rice)",
     group="zouave_uncertain", inherits="default.union.infantry", zouave_policy="allowed_flagged", allowed_tags=["zouave"],
     printed={"documented": "Americanized Zouave dress in its original form: dark blue jacket with red cuff piping, dark blue trousers with a red stripe, red zouave shirt, dark blue forage cap, leather gaiters. A 44th sergeant describes men discarding packs",
              "open": "Whether this dress was still worn in 1863 (doubtful); condition at Gettysburg",
              "default": "Standard blue field dress with a small minority carrying original Zouave items (red shirt, red trouser stripe), flagged open", "tier": "open; default plausible-procedural"},
     opens=["OPEN-44NY-DRESS"],
     fields={
         "shirt": PP([A("shirt_wool_gray", "most"), A("shirt_red_zouave_44ny", "few", "original Zouave item; flagged open", tier="plausible-procedural", flagged=True)], ["Wiki-44NY"], "Standard blue field dress with a small minority carrying original Zouave items (red shirt, red trouser stripe), flagged open"),
         "trousers": PP([A("trousers_sky_blue_kersey", "most"), A("trousers_44ny_red_stripe", "few", "original Zouave item; flagged open", tier="plausible-procedural", flagged=True)], ["Wiki-44NY"], "same"),
         "pack_state": F([A("pack_knapsack_on", "some"), A("pack_dropped", "some")], "documented", ["CWTalk-Knapsack"], printed_weak=True,
                         printed_raw="Men carried packs (44th NY: a sergeant describes men discarding packs, so mixed)"),
         "badge": badge_field("V", None),
     }, conditional=[{"item": "forage_cap_dark_blue_44ny", "status": "original dress; open"}, {"item": "gaiters_leather_44ny", "status": "original dress; open"}, {"item": "zouave_jacket_44ny_original", "status": "original dress; open"}],
     parse_status="parsed")

# --- 39th NY ----------------------------------------------------------------------------------------------------
O("OPEN-39NY-DRESS", "39th NY: the extent to which the original 1861 Bersaglieri-style dress survived to 1863", ["G6"], ["Wiki-39NY"])
unit("US.39NY", "39th New York Infantry (Garibaldi Guard), 4 companies at Gettysburg", "union", hierarchy_printed="II Corps, 3rd Div, 3rd Bde; 4 companies at Gettysburg", corps="II", division="3rd", brigade="3rd",
     group="garibaldi", inherits="default.union.infantry",
     printed={"documented": "Original 1861 Bersaglieri-style dress: black brimmed hat with dark cock feathers, six-button red-trimmed tunic, dark blue trousers with red outseam stripe, white gaiters. Hillebrandt wounded July 3",
              "open": "The extent to which that dress survived to 1863", "default": "Standard blue field dress, with the black plumed hat as a minority hat; flagged open", "tier": "open"},
     opens=["OPEN-39NY-DRESS"],
     fields={"headgear": PP([A("kepi_m1858", "most"), A("slouch_hat_civilian", "smaller share"), A("hardee_hat_m1858", "few"),
                             A("black_plumed_hat_39ny", "few", "minority hat; flagged open", tier="plausible-procedural", flagged=True)], ["Wiki-39NY"], "Standard blue field dress, with the black plumed hat as a minority hat; flagged open"),
             "badge": badge_field("II", "3rd")},
     conditional=[{"item": "bersaglieri_tunic_39ny", "status": "original dress; extent open, not drawn"}, {"item": "trousers_39ny_red_outseam", "status": "original dress; open"}, {"item": "gaiters_white_39ny", "status": "original dress; open"}])

# --- 155th PA ---------------------------------------------------------------------------------------------------
unit("US.155PA", "155th Pennsylvania Infantry", "union", hierarchy_printed="V Corps, 2nd Div, 3rd Bde", corps="V", division="2nd", brigade="3rd", group="correction",
     inherits="default.union.infantry", zouave_policy="forbidden", forbidden_tags=["zouave"],
     printed={"documented": "Zouave uniform issued 1864, not worn at Gettysburg despite the monument", "open": "none for 1863 dress", "default": "Regulation blue", "tier": "documented (correction)"},
     fields={"headgear": F([A("kepi_m1858", "most"), A("slouch_hat_civilian", "smaller share")], "documented", [], printed_raw="documented (correction)", note="no source key printed for this correction (the brief's correction); effective tier inferred, weak, per Law cl.4"),
             "coat": F([A("sack_coat_union", "most"), A("frock_coat_union", "minority")], "documented", [], printed_raw="documented (correction)"),
             "trousers": F([A("trousers_sky_blue_kersey", "all")], "documented", [], printed_raw="documented (correction)"),
             "badge": badge_field("V", "2nd")},
     notes="'Regulation blue' is the PDF's stated default; the headgear/coat mix words are the default Union mix, not unit evidence.")

# --- 83rd PA ----------------------------------------------------------------------------------------------------
unit("US.83PA", "83rd Pennsylvania Infantry", "union", hierarchy_printed="V Corps, 3rd Bde, Vincent/Rice", corps="V", division=None, brigade="3rd (Vincent/Rice)", group="chasseur_stored",
     inherits="default.union.infantry",
     printed={"documented": "French chasseur uniforms were given out early and stored away", "open": "1863 dress", "default": "Standard blue field dress", "tier": "documented (stored-away note); dress inferred"},
     fields={"badge": badge_field("V", None)}, opens=[O("OPEN-83PA-DRESS", "83rd PA: 1863 dress", ["G6"], ["Wiki-83PA"])],
     notes="The 'stored away' note is documented (printed); 1863 dress is inferred standard blue.")

# --- 13th PA Reserves (Bucktails) -------------------------------------------------------------------------------
O("OPEN-13PAR-TAIL", "13th PA Reserves (Bucktails): deer tail on caps or hats in July 1863 (memory only: largely gone by 1863); the Gettysburg weapon", ["G7"], ["Wiki-13PAR", "RockIsland-42PA"])
unit("US.13PAR", "13th Pennsylvania Reserves (Bucktails, 42nd PA)", "union", hierarchy_printed="V Corps, 3rd Div, McCandless", corps="V", division="3rd", brigade="McCandless", group="bucktails",
     inherits="default.union.infantry", opens=["OPEN-13PAR-TAIL"],
     printed={"documented": "Rifle history only: smoothbores initially, .58 rifles to August 1862, then Sharps M1859 rearming before Antietam. Deer tail: no uniform source retrieved",
              "open": "Deer tail on caps or hats in July 1863 (memory only: largely gone by 1863); the Gettysburg weapon",
              "default": "Standard blue field dress, tail shown as a minority variance only after a source confirms; a Rock Island Auction lot establishes a Berdan-pattern Sharps issue to the regiment", "tier": "open"},
     conditional=[{"item": "cap_deer_tail", "status": "minority variance only after a source confirms; NOT drawn"}],
     fields={"badge": badge_field("V", "3rd"),
             "weapon": F([A("p1853_enfield", "some"), A("m1861_springfield", "some")], "plausible-procedural", ["Wiki-13PAR", "RockIsland-42PA"],
                         printed_raw="Gettysburg weapon unconfirmed (partial)", basis_tier="inferred", assignment_id="UA-13PAR", flagged=True,
                         note="default Union long-arm draw (B.6.10 rule); Berdan-pattern Sharps M1859 is a documented rearming before Antietam (auction lot, weak) but the Gettysburg arm is unconfirmed: sharps_rifle_m1859 is a candidate, NOT allowed here",
                         candidates_unconfirmed=["sharps_rifle_m1859"])},
     weapon_assignment_ids=["UA-13PAR"])

# --- 149th / 150th PA -------------------------------------------------------------------------------------------
O("OPEN-149-150PA", "149th/150th PA: uniform, tails, arms", ["G7"], ["GburgDaily-6904"])
PRINT_149 = {"documented": "Fought on McPherson Ridge; Co. D of the 149th was First Corps headquarters guard; capture of the 150th's colors is discussed in one source",
             "open": "Uniform, tails, arms", "default": "Standard blue field dress", "tier": "open"}
for uid, nm in (("US.149PA", "149th Pennsylvania Infantry"), ("US.150PA", "150th Pennsylvania Infantry")):
    unit(uid, nm + " (sometimes called Bucktails)", "union", hierarchy_printed="I Corps, 3rd Div, Stone's brigade", corps="I", division="3rd", brigade="Stone",
         group="bucktail_like", inherits="default.union.infantry", opens=["OPEN-149-150PA"], printed=PRINT_149, fields={"badge": badge_field("I", "3rd")},
         conditional=[{"item": "cap_deer_tail", "status": "tails on the 149th/150th PA are memory only; NOT drawn"}])

# --- Philadelphia Brigade ---------------------------------------------------------------------------------------
O("OPEN-PHILA-BDE", "Philadelphia Brigade: everything unit-specific (72nd PA = Baxter Fire Zouaves; 1861 Zouave dress probably gone, memory only)", ["G6"], ["Wiki-PhilaBde"])
PH_PRINT = {"documented": "No uniform detail found. The 72nd PA was the Baxter Fire Zouaves; its 1861 Zouave dress was probably gone (memory only)",
            "open": "Everything unit-specific", "default": "Standard blue field dress", "tier": "open"}
for uid, nm in (("US.69PA", "69th Pennsylvania Infantry"), ("US.71PA", "71st Pennsylvania Infantry"), ("US.72PA", "72nd Pennsylvania Infantry (Baxter's Fire Zouaves)"), ("US.106PA", "106th Pennsylvania Infantry")):
    unit(uid, nm, "union", hierarchy_printed="II Corps, 2nd Div, Webb (Philadelphia Brigade)", corps="II", division="2nd", brigade="Webb (Philadelphia Brigade)", group="philadelphia_brigade",
         inherits="default.union.infantry", opens=["OPEN-PHILA-BDE"], printed=PH_PRINT, fields={"badge": badge_field("II", "2nd")},
         zouave_policy="none_drawn_memory_only")

# --- Irish Brigade ----------------------------------------------------------------------------------------------
O("OPEN-IRISH-DRESS", "Irish Brigade: 1863 dress; boxwood sprigs in kepis (ordered at Fredericksburg, NOT confirmed for Gettysburg)", ["G6"], ["Wiki-Irish", "GburgDaily-Irish"])
IR_PRINT = {"documented": "Boxwood sprigs worn in kepis ordered by Meagher at Fredericksburg (not confirmed for Gettysburg; the Wikipedia Irish Brigade page did not mention sprigs); green flags; the 28th MA's 'First' the only usable green flag. Nearly 600 men at Gettysburg. Chaplain Fr. William Corby gave general absolution. A claimed green hatband for the brigade and medics is unverified and probably confused: do not use",
            "open": "1863 dress", "default": "Standard blue field dress; sprigs in the kepi as a flagged minority variance for the three NY regiments only after a source confirms; green flags (the notes carry the green-flag fact)",
            "tier": "open (sprigs, dress); green flag documented"}
IR_WEAPON = {
    "US.63NY": ("m1842_smoothbore", "documented", ["28thmass", "AR-Guns"], "UA-IRISH-NY", "M1842 .69 smoothbore until spring 1864, then M1863; smoothbore use near the Wheatfield"),
    "US.69NY": ("m1842_smoothbore", "documented", ["28thmass", "AR-Guns"], "UA-IRISH-NY", "same"),
    "US.88NY": ("m1842_smoothbore", "documented", ["28thmass", "AR-Guns"], "UA-IRISH-NY", "same"),
    "US.28MA": ("p1853_enfield", "documented", ["28thmass"], "UA-28MA", "P1853 Enfield .577 since organization; documented but contradicted (a forum says it 'carried rifles')"),
    "US.116PA": ("smoothbore_69_musket_unspecified", "documented", ["CWTalk-116PA"], "UA-116PA", ".69 muskets (forum, Ryan); weak"),
}
for uid, nm in (("US.63NY", "63rd New York Infantry"), ("US.69NY", "69th New York Infantry"), ("US.88NY", "88th New York Infantry"),
                ("US.28MA", "28th Massachusetts Infantry"), ("US.116PA", "116th Pennsylvania Infantry")):
    w = IR_WEAPON[uid]
    ny = uid.endswith("NY")
    flag = F([A("flag_green_irish", "all", "'First' = the 28th MA's flag: the only usable green flag" if uid == "US.28MA" else "green flag (the notes carry the green-flag fact)")],
             "documented", ["Wiki-Irish", "GburgDaily-Irish"], printed_raw="green flag documented", note="only the 28th MA's 'First' is named as usable; other Irish Brigade flag details: gap")
    f = {"weapon": F([A(w[0], "all")], w[1], w[2], printed_raw="documented but contradicted" if uid == "US.28MA" else w[1], assignment_id=w[3], note=w[4], flagged=(uid != "US.28MA" and uid == "US.116PA")),
         "flag_or_instrument": flag, "badge": badge_field("II", "1st")}
    unit(uid, nm, "union", hierarchy_printed="II Corps, 1st Div, 2nd Bde, Kelly (Irish Brigade)", corps="II", division="1st", brigade="2nd (Kelly, Irish Brigade)", group="irish_brigade",
         inherits="default.union.infantry", opens=["OPEN-IRISH-DRESS"], printed=IR_PRINT, fields=f, forbidden_tags=["green_hatband", "zouave"],
         conditional=([{"item": "kepi_irish_boxwood_sprig", "status": "flagged minority variance for the three NY regiments only after a source confirms; NOT drawn"}] if ny else None),
         weapon_assignment_ids=[w[3]],
         notes="Green hatband claimed for the brigade is unverified and probably confused: forbidden")

# --- 1st MN / Co L ----------------------------------------------------------------------------------------------
O("OPEN-1MN-DRESS", "1st Minnesota: dress", ["G6"], ["Wiki-1MN"])
unit("US.1MN", "1st Minnesota Infantry", "union", hierarchy_printed="II Corps, 2nd Div, 1st Bde", corps="II", division="2nd", brigade="1st", group="1mn",
     inherits="default.union.infantry", opens=["OPEN-1MN-DRESS"],
     printed={"documented": "M1861 Springfield; Co. L Sharps; July 2 charge about 262 men, 215 casualties by one count; five color bearers fell; used dirt-filled packs as cover on July 3",
              "open": "Dress", "default": "Standard blue field dress", "tier": "arms documented; dress open"},
     fields={"weapon": F([A("m1861_springfield", "all")], "documented", ["Wiki-1MN"], printed_raw="documented (Wikipedia)", assignment_id="UA-1MN", note="B.6.10 also lists 1st Minnesota under 'not found' (internal contradiction, see KIT-NOTES)"),
             "pack_state": F([A("pack_used_as_cover", "all", only_on="1863-07-03"), A("pack_blanket_roll_only", "most"), A("pack_knapsack_on", "some"), A("pack_none_haversack_canteen", "few")],
                             "documented", ["CWTalk-Knapsack"], printed_weak=True, printed_raw="Used packs filled with dirt as cover (the 1st MN on July 3)",
                             note="pack_used_as_cover applies on 1863-07-03 only; other days default mixed state"),
             "badge": badge_field("II", "2nd")}, weapon_assignment_ids=["UA-1MN"])
unit("US.MN_CO_L", "Minnesota Company L (sharpshooter detachment attached to the 1st Minnesota)", "union", branch="sharpshooter", scope="company",
     hierarchy_printed="attached to the 1st Minnesota Infantry (II Corps, 2nd Div, 1st Bde)", corps="II", division="2nd", brigade="1st", group="sharpshooter_company",
     inherits="default.union.infantry", opens=[O("OPEN-MNCOL", "Minnesota Co. L: uniform, rifles; many other sharpshooter detachments existed, only this one identified", ["G13"], ["AHC-USSS-Bib", "Wiki-1MN"])],
     printed={"documented": "An Army Heritage bibliography states that Company L (Minnesota) was attached to the 1st Minnesota Infantry; the 1st Minnesota note elsewhere lists Co. L Sharps. Treat as a sharpshooter detachment with Sharps (weak). Many other sharpshooter detachments existed; only this one was identified.",
              "open": "uniform not described", "default": "default Union infantry dress (inferred); NOT Berdan green", "tier": "weak"},
     fields={"weapon": F([A("sharps_unspecified_pattern", "all")], "inferred", ["AHC-USSS-Bib", "Wiki-1MN"], printed_weak=True, printed_raw="Treat as a sharpshooter detachment with Sharps (weak)",
                         assignment_id="UA-MNCOL", flagged=True, note="Sharps pattern (rifle vs carbine) not stated"),
             "badge": badge_field("II", "2nd")}, forbidden_tags=["berdan_green"], weapon_assignment_ids=["UA-MNCOL"])

# --- 20th ME / 16th MI ------------------------------------------------------------------------------------------
O("OPEN-20ME", "20th Maine: dress (everything); weapon types (claim of mixed Springfield/Enfield/Lorenz is weak, IMFDB)", ["G6"], ["Colby", "IMFDB"])
unit("US.20ME", "20th Maine Infantry", "union", hierarchy_printed="V Corps, 3rd Bde", corps="V", division=None, brigade="3rd", group="20me", inherits="default.union.infantry",
     opens=["OPEN-20ME"],
     printed={"documented": "No dress details retrieved", "open": "Everything", "default": "Standard blue field dress, packs by the knapsack rules above (19th Maine is a different regiment)", "tier": "open"},
     fields={"weapon": F([A("springfield_model_unspecified", "some"), A("p1853_enfield", "some"), A("lorenz_m1854", "some")], "inferred", ["IMFDB"], printed_weak=True,
                         printed_raw="weak: flagged", assignment_id="UA-20ME", flagged=True, note="Mixed Springfield, Enfield, Lorenz (claim of two or more types; IMFDB with no citation)"),
             "badge": badge_field("V", None)}, weapon_assignment_ids=["UA-20ME"])
O("OPEN-16MI", "16th Michigan: dress (everything)", ["G6"], [])
unit("US.16MI", "16th Michigan Infantry (263 men)", "union", hierarchy_printed="V Corps, 3rd Bde", corps="V", division=None, brigade="3rd", group="16mi", inherits="default.union.infantry",
     opens=["OPEN-16MI"], printed={"documented": "No dress details retrieved; 263 men", "open": "Everything", "default": "Standard blue field dress", "tier": "open"},
     fields={"badge": badge_field("V", None)})

# --- Vermont ----------------------------------------------------------------------------------------------------
O("OPEN-VT", "Vermont regiments (2nd Vermont Brigade and the VI Corps Vermont Brigade): both uniform information; do not merge the two brigades", ["G6"], ["Wiki-2VtBde"])
VT_PRINT = {"documented": "The 13th, 14th, 16th VT (Stannard's 2nd Vermont Brigade, I Corps, 3rd Div) were nine-month troops mustered October 1862: no uniform information. The separate Vermont Brigade of VI Corps (2nd-6th VT, Grant) is in the order of battle with no dress information",
            "open": "Both", "default": "Standard blue field dress; do not merge the two Vermont brigades", "tier": "open"}
for n in (13, 14, 16):
    f = {"badge": badge_field("I", "3rd")}
    nt = None
    if n == 16:
        f["pack_state"] = F([A("pack_blanket_roll_only", "most"), A("pack_knapsack_on", "some"), A("pack_dropped", "few", "a soldier lost his pack (individual record)")], "documented", ["CWTalk-Knapsack"], printed_weak=True,
                            printed_raw="A soldier lost his pack (individual)", note="individual note only: unit-level state stays the default mixed; the lost pack is one man")
        nt = "16th VT pack: one individual lost his pack; no unit-wide state"
    unit("US.%dVT" % n, "%dth Vermont Infantry (2nd Vermont Brigade, nine-month troops)" % n, "union", hierarchy_printed="Stannard's 2nd Vermont Brigade, I Corps, 3rd Div", corps="I", division="3rd", brigade="2nd Vermont Brigade (Stannard)",
         group="vermont_2nd_bde", inherits="default.union.infantry", opens=["OPEN-VT"], printed=VT_PRINT, fields=f, notes=nt)
for n in (2, 3, 4, 5, 6):
    unit("US.VI_%dVT" % n, "%s Vermont Infantry (Vermont Brigade, VI Corps)" % {2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th"}[n], "union", hierarchy_printed="Vermont Brigade of VI Corps (2nd-6th VT, Grant)",
         corps="VI", division=None, brigade="Vermont Brigade (Grant)", group="vermont_vi_corps", inherits="default.union.infantry", opens=["OPEN-VT"], printed=VT_PRINT,
         fields={"badge": badge_field("VI", None)})

# --- Excelsior --------------------------------------------------------------------------------------------------
O("OPEN-EXCELSIOR", "Excelsior Brigade: dress", ["G6"], ["Wiki-Excelsior"])
for n in (70, 71, 72, 73, 74, 120):
    unit("US.%dNY" % n, "%s New York Infantry (Excelsior Brigade)" % ordn(n),
         "union", hierarchy_printed="III Corps, 2nd Div, Brewster (Excelsior Brigade)", corps="III", division="2nd", brigade="Brewster (Excelsior Brigade)", group="excelsior",
         inherits="default.union.infantry", opens=["OPEN-EXCELSIOR"],
         printed={"documented": "778 of 1,837 lost; no dress information", "open": "Dress", "default": "Standard blue field dress", "tier": "open"}, fields={"badge": badge_field("III", "2nd")})

# --- 12th NJ ----------------------------------------------------------------------------------------------------
O("OPEN-12NJ", "12th NJ: dress", ["G6"], ["Wiki-12NJ"])
unit("US.12NJ", "12th New Jersey Infantry", "union", hierarchy_printed="II Corps, 3rd Div, 2nd Bde", corps="II", division="3rd", brigade="2nd", group="12nj", inherits="default.union.infantry",
     opens=["OPEN-12NJ"], weapon_assignment_ids=["UA-12NJ"],
     printed={"documented": "Bliss farm; 'buck and ball' volley; men had discarded all but gum blanket and haversack by June 18", "open": "Dress", "default": "Standard blue field dress, no knapsacks", "tier": "arms and pack documented; dress open"},
     fields={"weapon": F([A("m1842_smoothbore", "all")], "documented", ["CWNews-Smooth", "AR-Guns"], assignment_id="UA-12NJ", note="M1842 .69 buck and ball (15+ buckshot loads on July 3); smoothbores kept into 1864"),
             "pack_state": F([A("pack_blanket_roll_only", "most", "gum blanket and haversack retained"), A("pack_none_haversack_canteen", "some")], "documented", ["CWTalk-Knapsack"], printed_weak=True,
                             printed_raw="Men had discarded everything except gum blanket and haversack by June 18; no knapsacks",
                             note="knapsack_on excluded; split between the two remaining states is a tuning choice (the PDF says only 'no knapsacks')"),
             "badge": badge_field("II", "3rd")})

# --- other pack-practice units (B.6.2 'Knapsack practice by unit') ---------------------------------------------
for uid, nm, corps_div, st, raw in (
    ("US.97NY", "97th New York Infantry", None, [A("pack_dropped", "all", pile_id="PILE-97NY-0701")], "Ordered to leave packs under a hill on July 1; the packs were lost"),
    ("US.143PA", "143rd Pennsylvania Infantry", None, [A("pack_dropped", "all", pile_id="PILE-143PA-0701")], "Stacked packs under guard; Confederates used them as breastworks"),
    ("US.137NY", "137th New York Infantry", None, None, "One man kept his pack through the fight (individual)"),
    ("US.14IN", "14th Indiana Infantry", None, [A("pack_knapsack_on", "all")], "Men carried packs"),
    ("US.19ME", "19th Maine Infantry", None, [A("pack_knapsack_on", "all")], "Men carried packs"),
    ("US.122NY", "122nd New York Infantry", None, [A("pack_blanket_roll_only", "most"), A("pack_none_haversack_canteen", "some")], "Turned in packs on June 17 (no knapsacks)"),
    ("US.12MA", "12th Massachusetts Infantry", None, [A("pack_used_as_cover", "all", only_on="1863-07-03"), A("pack_blanket_roll_only", "most"), A("pack_knapsack_on", "some")], "Used packs filled with dirt as cover"),
    ("US.147NY", "147th New York Infantry", None, [A("pack_used_as_cover", "all", only_on="1863-07-03"), A("pack_blanket_roll_only", "most"), A("pack_knapsack_on", "some")], "Used packs filled with dirt as cover")):
    f = {}
    ps = "partial"
    if st:
        f["pack_state"] = F(st, "documented", ["CWTalk-Knapsack"], printed_weak=True, printed_raw=raw, note="B.6.2 knapsack-practice table; documented only at one forum compilation (weak)")
        ps = "parsed"
    unit(uid, nm, "union", hierarchy_printed="not given in B.6 (pack-practice table only)", group="pack_practice_only", inherits="default.union.infantry", fields=f,
         parse_status=ps, printed={"documented": raw, "open": "everything else (corps/division/dress not in B.6)", "default": "default Union infantry", "tier": "documented, weak (forum)"},
         notes=("individual record only (no unit-wide state): unit keeps the default mixed pack state" if not st else None),
         pack_pile_ids=[x for x in [s.get("pile_id") for s in (st or [])] if x])

# --- XI Corps Germans -------------------------------------------------------------------------------------------
O("OPEN-XI-GERMANS", "XI Corps German regiments: regiment dress (no unit source retrieved)", ["G6"], [])
for uid, nm in (("US.26WI", "26th Wisconsin Infantry"), ("US.82IL", "82nd Illinois Infantry"), ("US.45NY", "45th New York Infantry"), ("US.54NY", "54th New York Infantry"),
                ("US.58NY", "58th New York Infantry"), ("US.68NY", "68th New York Infantry"), ("US.119NY", "119th New York Infantry"), ("US.134NY", "134th New York Infantry"),
                ("US.154NY", "154th New York Infantry"), ("US.75PA", "75th Pennsylvania Infantry")):
    f = {}
    wids = []
    if uid == "US.45NY":
        f["weapon"] = F([A("m1841_mississippi", "all")], "documented", ["Wiki-M1841"], assignment_id="UA-45NY", note="M1841 Mississippi rifles into/after Gettysburg")
        wids = ["UA-45NY"]
    unit(uid, nm, "union", hierarchy_printed="XI Corps (German regiment list, B.6.2)", corps="XI", division=None, brigade=None, group="xi_corps_germans",
         inherits="default.union.xi_corps_german", opens=["OPEN-XI-GERMANS"], fields=f, weapon_assignment_ids=wids,
         printed={"documented": "standard blue with kepis, slouch hats and some Hardee hats; crescent badge", "open": "Regiment dress", "default": "As in B.6.2", "tier": "inferred"},
         notes="division not printed per regiment in B.6.2/B.6.3; badge colour unresolved")
# XI Corps default badge colour unresolved
for u in UNITS.values():
    if u["group"] == "xi_corps_germans":
        u["fields"]["badge"] = badge_field("XI", None)

# --- Regulars ---------------------------------------------------------------------------------------------------
O("OPEN-REGULARS", "US Regulars: exact dress mix", ["G3"], ["CWTalk-Regulars"])
REG_PRINT = {"documented": "Looked like other troops in the field: four-button blouses, fatigue caps; Hardee hat for dress; sky blue trousers by now; better discipline; leggings issued but soon discarded",
             "open": "Exact mix", "default": "Sack coats and fatigue caps, sky blue trousers, with Hardee hats as a minority; tidier than volunteers", "tier": "documented (general); mix plausible-procedural"}
for uid, nm in (("US.3US", "3rd US Infantry"), ("US.4US", "4th US Infantry"), ("US.6US", "6th US Infantry"), ("US.12US", "12th US Infantry"), ("US.14US", "14th US Infantry"),
                ("US.2US", "2nd US Infantry"), ("US.7US", "7th US Infantry"), ("US.10US", "10th US Infantry"), ("US.11US", "11th US Infantry"), ("US.17US", "17th US Infantry")):
    unit(uid, nm, "union", hierarchy_printed="V Corps, Sykes' 2nd Div (Regulars)", corps="V", division="2nd", brigade=None, group="regulars", inherits="default.union.infantry",
         opens=["OPEN-REGULARS"], printed=REG_PRINT,
         fields={"coat": F([A("sack_coat_regulars_fatigue", "most")], "documented", ["CWTalk-Regulars"], printed_raw=REG_PRINT["tier"], note="mix plausible-procedural; forum source (weak)"),
                 "headgear": PP([A("kepi_m1858", "most", "fatigue caps"), A("hardee_hat_m1858", "minority", "Hardee hat for dress")], ["CWTalk-Regulars"], REG_PRINT["default"]),
                 "trousers": F([A("trousers_sky_blue_kersey", "all")], "documented", ["CWTalk-Regulars"]),
                 "badge": badge_field("V", "2nd")},
         conditional=[{"item": "leggings_regulars", "status": "issued but soon discarded; July wear open; NOT drawn"}],
         wear_modifier={"tidier_than_volunteers": True, "tier": "plausible-procedural"})

# --- Sharpshooters (Berdan 1st/2nd USSS, 1st Co MA SS) ----------------------------------------------------------
dispute("DISP-BERDAN-GREEN-BLUE", "Berdan's Sharpshooters: green vs modified blue uniform by the Gettysburg campaign",
        [{"claim": "Dark green caps, coats, trousers and leather gaiters; no shiny brass; black-button green frock coats; Smithsonian green wool frock coat c.1861 with hard rubber buttons and green wool forage cap",
          "source_keys": ["MHN", "AR-Sharpshooting", "SI-Berdan", "HistoryNet-Killers"], "note": "these sources do not date their uniform descriptions to 1863"},
         {"claim": "Wikipedia says that by the Gettysburg campaign most men wore modified blue uniforms (not reissued green)", "source_keys": ["Wiki-1USS"]}],
        pdf_default="Default (inferred): mostly green with some blue replacement items, black-button coats, green kepis and slouch hats; the share is a seeded parameter",
        handling="Both carried; PDF default logged as pending owner; the mix share is a tuning parameter", unit_ids=["US.1USS", "US.2USS"])
O("OPEN-BERDAN-GREEN", "Berdan green versus blue in July 1863; Sharps retention in July 1863; Pitzer's Woods detail; Trepp's role; Wisconsin company", ["G13"], ["Wiki-1USS", "AR-Guns"])
BERDAN_PRINT = {"documented": "See B.6.6: dark green caps, coats, trousers and leather gaiters; no shiny brass; Sharps .52 breechloader",
                "open": "Berdan green vs blue; Sharps retention", "default": "mostly green with some blue replacement items, black-button coats, green kepis and slouch hats; the share is a seeded parameter", "tier": "see B.6.6 (inferred default)"}
KBER = ["MHN", "AR-Sharpshooting", "SI-Berdan", "HistoryNet-Killers", "Wiki-1USS"]
for uid, nm, extra in (("US.1USS", "1st United States Sharpshooters (Berdan)", None), ("US.2USS", "2nd United States Sharpshooters", "bowie knife and Colt pocket revolver [Wiki-2USS]")):
    f = {
        "headgear": PP([A("kepi_green_berdan", "most"), A("slouch_hat_berdan", "minority")], KBER, "mostly green with some blue replacement items, black-button coats, green kepis and slouch hats"),
        "coat": PP([A("berdan_green_frock_coat", "most"), A("berdan_modified_blue_coat", "minority", "blue replacement items", tier="plausible-procedural")], KBER, BERDAN_PRINT["default"]),
        "trousers": PP([A("trousers_berdan_green", "most"), A("trousers_sky_blue_kersey", "few", "blue replacement", tier="plausible-procedural")], KBER, BERDAN_PRINT["default"]),
        "shoes": F([A("gaiters_leather_berdan", "all")], "documented", ["MHN", "SI-Berdan"], note="leather gaiters; Smithsonian object is a coat and cap, so the gaiter claim rests on MHN only"),
        "accoutrements": ACC([comp("knapsack_prussian_fur_berdan", "some", "documented", ["Wiki-1USS"], printed_weak=False)], note="Prussian-style fur-covered knapsacks on a wooden frame [Wiki-1USS]; heavy target rifles were kept in wagons, one per company"),
        "weapon": F([A("sharps_rifle_m1859", "all")], "documented", ["AR-Guns", "AR-Sharpshooting"], printed_raw="Sharps rifles (heavy target rifle per company in wagons)", assignment_id="UA-USSS",
                    note="Colt 1855 revolving rifles were issued first and replaced by Sharps in 1862; Colt revolving rifles at Gettysburg: no source, not used"),
        "badge": badge_field("III", "1st"),
    }
    if extra:
        f["sidearm_sword"] = F([A("bowie_knife", "some"), A("colt_pocket_revolver", "some")], "documented", ["Wiki-2USS"], note=extra)
    unit(uid, nm, "union", branch="sharpshooter", hierarchy_printed="III Corps, 1st Division, 2nd Brigade, Ward", corps="III", division="1st", brigade="2nd (Ward)", group="berdan",
         inherits="default.union.infantry", allowed_tags=["berdan_green"], opens=["OPEN-BERDAN-GREEN"], dispute_ids=["DISP-BERDAN-GREEN-BLUE"], printed=BERDAN_PRINT, fields=f, weapon_assignment_ids=["UA-USSS"])

O("OPEN-1MASSSS", "1st Co. Massachusetts SS: uniform not described", ["G13"], ["Wiki-1MassSS"])
unit("US.1MASSSS", "1st Company Massachusetts Sharpshooters (Andrew Sharpshooters)", "union", branch="sharpshooter", scope="company",
     hierarchy_printed="attached to Hancock's II Corps on July 2-4", corps="II", division=None, brigade=None, group="sharpshooter_company", inherits="default.union.infantry",
     forbidden_tags=["berdan_green"], opens=["OPEN-1MASSSS"],
     printed={"documented": "Custom muzzleloading target rifles with scopes (makers Hawkins and Morgan James), plus Sharps from after Antietam; mostly swapped W.D. Langdon target rifles for Sharps after Antietam, with some Merrill rifles remaining. Attached to Hancock's II Corps on July 2-4. Cleared snipers from the Bliss farm; on July 3 dueled Confederate snipers in the town; during Pickett's Charge targeted officers. Uniform not described",
              "open": "uniform", "default": "standard blue field dress (plausible-procedural), not Berdan green", "tier": "arms documented; uniform plausible-procedural"},
     fields={"weapon": F([A("sharps_unspecified_pattern", "most"), A("merrill_carbine", "few", "some Merrill rifles remaining"), A("scoped_target_rifle", "some")], "documented", ["AR-Guns", "Wiki-1MassSS"],
                         printed_raw="Mostly Sharps, some Merrill, plus scoped target rifles", assignment_id="UA-1MASSSS", note="the 'Merrill rifles' are mapped to the dictionary's Merrill entry (carbine); the PDF says 'Merrill rifles' in B.6.6 and 'Merrill' in B.6.10: pattern open"),
             "badge": badge_field("II", None)}, weapon_assignment_ids=["UA-1MASSSS"])
