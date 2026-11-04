"""Confederate defaults and distinctive units (PDF B.6.4, B.6.5, B.6.6 Confederate parts, B.6.7 Confederate, B.6.14.5, B.6.15.4)."""
from kit_core import *   # noqa: F401,F403
from kit_items import item, A, F, ITEMS
from kit_src_union import dw, RANK_NOTE

item("cs_pocket_revolver_or_pistol", "sidearm", "confederate", "Revolver / personal handgun (type open)", [])
item("sash_none", "sash", "either", "No sash", [])

KCS = ["Wiki-CSUnif"]
RAW_CS_DEFAULT = ("Default Confederate infantry (plausible-procedural, built from the above): Type II-style gray or butternut jean shell jacket (nine buttons, shoulder straps, no trim, belt loops) for most men; "
                  "a minority in civilian coats, frock coats, or captured Union blue items; slouch hats (kepis only for officers and private purchase); mixed trousers in gray, brown, butternut or captured blue; brogans; "
                  "blanket roll over one shoulder, haversack, canteen, cartridge box (CS or captured US) and cap pouch; no knapsack for most. Wide color variation inside one regiment is correct. "
                  "Dark blue-gray strapless Type III jackets are barred except as a rare flagged transitional item (inferred).")

DEFAULTS["default.confederate.infantry"] = {
    "id": "default.confederate.infantry", "army": "confederate", "branch": "infantry",
    "printed_basis": "B.6.4 " + RAW_CS_DEFAULT,
    "fields": {k: finish_field_tier(v) for k, v in {
        "headgear": PP([A("slouch_hat_cs", "most"), A("straw_hat_cs", "few"), A("plain_cap_cs", "few")], KCS,
                       "slouch hats (kepis only for officers and private purchase)", note="kepi on a Confederate private is barred by default (B.6.12); private purchase would be a flagged exception"),
        "coat": PP([A("cs_type_ii_jacket", "most"), A("cs_civilian_coat", "few"), A("cs_frock_coat", "few"), A("cs_captured_union_blue_item", "few")], ["9thVA", "Wiki-RichmondDepot", "Wiki-CSUnif"],
                   "Type II-style gray or butternut jean shell jacket for most men; a minority in civilian coats, frock coats, or captured Union blue items",
                   note="Type III barred (not drawn, not conditional here); Type I rare by July 1863 (not drawn by default). Dyes cadet gray to butternut: wide colour variation inside a regiment is correct"),
        "shirt": F([A("shirt_unspecified_cs", "all")], "plausible-procedural", [], printed_raw="B.6.4 states no Confederate shirt colour or fabric (gap)", basis_tier="inferred"),
        "trousers": PP([A("trousers_cs_gray", "some"), A("trousers_cs_brown", "some"), A("trousers_cs_butternut", "some"), A("trousers_cs_captured_blue", "some")], KCS,
                       "mixed trousers in gray, brown, butternut or captured blue", note="early sky blue not drawn; NCO stripe conflict: regulations dark blue (CSA-Regs) vs Wikipedia light/sky blue; product shows stripes on a minority of NCO trousers and picks the regulation colour with the conflict flagged"),
        "shoes": PP([A("brogan_jefferson", "most"), A("worn_out_shoes_cs", "few"), A("barefoot_cs", "few")], KCS + ["ABT-Myths"],
                    "footwear is Jefferson bootee/brogan for the default, with a small barefoot or worn-out minority generated plausible-procedural and flagged",
                    note="The shoe legend (battle began over shoes) must not be used to mass-barefoot the army [ABT-Myths]; minority share is not sourced"),
        "accoutrements": ACC([
            comp("cs_cartridge_box", "most", "documented", ["CWTalk-CSgear"], detail="mostly copies of M1839/M1857 US patterns on belt or sling; 30-40 rounds [NPS-Accout]"),
            comp("cs_captured_us_box", "some", "inferred", [], detail="By 1863 the army had captured thousands of Federal arms and equipment (Chancellorsville, Winchester), so US-marked boxes were common"),
            comp("cs_cap_pouch", "all", "documented", ["CWTalk-CSgear"]),
            comp("cs_canteen", "all", "documented", ["CWTalk-CSgear"]),
            comp("cs_haversack", "all", "documented", ["CWTalk-CSgear"]),
            comp("cs_belt_plate_captured_upside_down", "few", "documented", ["Wiki-CSUnif"], detail="captured US belt plates often worn upside down"),
            comp("tin_cup", "all", "documented", ["NPS-Accout"]),
            comp("cs_housewife_cup_plate", "some", "documented", ["NPS-Accout"], detail="generic load: tin cup/plate, blanket, gum blanket, housewife; mess gear (skillet, frying pan) not sourced (G10)"),
        ], note="cartridge box 30-40 rounds, over 40 lb with rifle [NPS-Accout]; museum collections (ACWM, Smithsonian) not reached"),
        "bayonet": PP([A("bayonet_scabbarded", "most"), A("bayonet_fixed", "few"), A("bayonet_absent", "few")], [], None, basis="inferred"),
        "sidearm_sword": PP([A("sidearm_none", "all")], [], "enlisted: none; officers see default.confederate.officers", basis="inferred"),
        "pack_state": PP([A("pack_blanket_roll_only", "most", "blanket roll over one shoulder (horse collar)"), A("pack_knapsack_on", "few", "not universally issued"),
                          A("pack_none_haversack_canteen", "few")], ["CWTalk-CSgear"], "Marching order (inferred): light: blanket roll over the shoulder, haversack, canteen, box; knapsacks mostly absent",
                         note="Confederate pack practice by unit at Gettysburg: not sourced"),
        "badge": F([A("badge_none", "all")], "plausible-procedural", [], printed_raw="B.6 describes corps badges for the Union only", basis_tier="inferred",
                   note="Confederate soldiers carry no corps badge; any corps badge on a Confederate is a wrong-unit item"),
        "flag_or_instrument": PP([A("cs_anv_battle_flag", "few", "colour guard only; flag_state intact/torn/bearer_down"), A("flag_none", "most")], ["FOTW"],
                                 "Every flag is generated as a battle flag of the documented type with a flag-state field, tier plausible-procedural until the regimental pattern is confirmed",
                                 note="ANV square battle flag type documented [FOTW, second-hand]; Gettysburg-specific pattern OPEN (G11)"),
    }.items()},
}

# Confederate weapon default (B.6.10 rule)
DEFAULTS["default.confederate.infantry"]["fields"]["weapon"] = F([
    dw("p1853_enfield", 0.55, "tuning; PDF: 'Enfield P1853 or a captured M1861 or M1855 by default' ([Wiki-P1853]: the Confederacy got more Enfields than any other small arm)"),
    dw("m1861_springfield", 0.2, "tuning; captured", captured=True),
    dw("m1855_springfield", 0.2, "tuning; captured", captured=True),
    dw("smoothbore_69_musket_unspecified", 0.05, "tuning; 'a minority of smoothbores up to the documented share' (about 10% of arms captured by I Corps on July 1 were smoothbores [AR-Guns])", flagged=True, max_share_cap=0.10),
], "plausible-procedural", ["Wiki-P1853", "AR-Guns", "AuthCamp-CSmuskets"], basis_tier="inferred", weapon_scope="long_arm",
    printed_raw="For the Confederates: Enfield P1853 or a captured M1861 or M1855 by default; a minority of smoothbores up to the documented share. Mixed arms inside a regiment are allowed (documented practice).",
    note="Field finds show nearly any arm among Confederate Gettysburg finds [AuthCamp-CSmuskets, weak]; Richmond rifles, Mississippis, target rifles are not drawn by default")

# --- Confederate officers --------------------------------------------------------------------------------------
CS_OFFICER_RANKS = [
    {"rank": "General", "collar": "Wreath around three stars, centre star 1 1/4 in", "sleeve_braid": "Four braids"},
    {"rank": "Colonel", "collar": "Three stars", "sleeve_braid": "Three (field officers)"},
    {"rank": "Lieutenant colonel", "collar": "Two stars", "sleeve_braid": "Three"},
    {"rank": "Major", "collar": "One star", "sleeve_braid": "Three"},
    {"rank": "Captain", "collar": "Three bars", "sleeve_braid": "Two"},
    {"rank": "1st Lieutenant", "collar": "Two bars", "sleeve_braid": "One (Lieutenant)"},
    {"rank": "2nd Lieutenant", "collar": "One bar", "sleeve_braid": "One"},
]
DEFAULTS["default.confederate.officers"] = {
    "id": "default.confederate.officers", "army": "confederate", "branch": "staff", "rank_note": RANK_NOTE,
    "printed_basis": "B.6.7 Confederate rank table [CSA-Regs] and text",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("cs_officer_frock_or_shell", "most", "By 1863 many field officers wore simple frock coats or shell jackets with collar insignia only (inferred, unsourced)"), A("cs_type_ii_jacket", "some")],
                  "inferred", ["CSA-Regs"], note="regulations describe plain braid; Austrian-knot style is what is typically seen (inferred, unsourced). Type III jackets post-date the battle (early-1864 order allowing officers to buy enlisted clothing) [9thVA]: barred"),
        "headgear": F([A("kepi_cs", "some", "forage cap with braid rows by rank (regulation)"), A("slouch_hat_cs", "most")], "documented", ["CSA-Regs", "Wiki-CSUnif"],
                      note="kepis for officers and private purchase [Wiki-CSUnif]; forage cap braid rows per CSA-Regs"),
        "trousers": F([A("trousers_cs_officer_dark_blue_stripe", "some"), A("trousers_cs_gray", "some"), A("trousers_cs_butternut", "some")], "documented", ["CSA-Regs"],
                      note="Conflict: regimental infantry officer stripe dark blue 1 1/4 in (CSA-Regs) vs Wikipedia light/sky blue; generals two gold lace stripes; staff one gold stripe"),
        "accoutrements": ACC([comp("sash_red_cs", "rare", "documented", ["CSA-Regs"], detail="red silk for other infantry officers; cavalry yellow; sash rare")], note="general: buff silk net sash"),
        "sidearm_sword": F([A("m1850_foot_officer_sword", "some", "specs gap"), A("lemat", "rare", "LeMat revolvers owned by several Confederate generals [Wiki-LeMat]")], "inferred", ["Wiki-LeMat", "AR-Guns"]),
    }.items()},
    "insignia": {"table": CS_OFFICER_RANKS, "source_keys": ["CSA-Regs"], "tier_printed": "documented", "tier": "documented", "weak_source": False,
                 "notes": ["Source: [CSA-Regs]. The notes state the sleeve braid as Lt 1, Captain 2, field officers 3, generals 4; the 1st/2nd lieutenant split on braid is not given, so both are shown as the lieutenant's single braid.",
                           "Buttons: general two rows of eight in pairs; colonel and below seven per row.",
                           "Sashes: general buff silk net, other infantry officers red silk, cavalry yellow; forage cap with braid rows by rank.",
                           "Trouser stripes: general two gold lace stripes; staff one gold stripe; regimental infantry dark blue cloth 1 1/4 in."]},
}

# --- Confederate artillery & cavalry defaults ------------------------------------------------------------------
DEFAULTS["default.confederate.artillery"] = {
    "id": "default.confederate.artillery", "army": "confederate", "branch": "artillery", "inherits": "default.confederate.infantry",
    "printed_basis": "B.6.14.5 Artillery dress, Confederate column",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("cs_artillery_jacket_red_trim", "few", "red trim when supply allowed"), A("cs_artillery_jacket_untrimmed", "most", "Richmond Depot jackets typically untrimmed from early 1863"),
                   A("cs_frock_coat", "rare", "frock coats still in some photographs")], "documented", ["CWTalk-UnionArt", "Wiki-CSUnif"], printed_raw="documented/weak", printed_weak=True),
        "headgear": F([A("slouch_hat_cs", "most", "slouch hats preferred to kepis"), A("straw_hat_cs", "some", "straw hats allowed for artillery in summer")], "documented", ["Wiki-CSUnif"]),
        "accoutrements": ACC([comp("sash_red_artillery", "rare", "documented", ["Wiki-CSUnif"], detail="Red for artillery; sergeants three chevrons, corporals two")]),
    }.items()},
    "crew_in_action": "Inferred: untrimmed gray or butternut, mixed hats",
    "open": "Confederate crew size is an open gap (often smaller crews, no source retrieved); Confederate visual references: gap",
}
DEFAULTS["default.confederate.cavalry"] = {
    "id": "default.confederate.cavalry", "army": "confederate", "branch": "cavalry", "inherits": "default.confederate.infantry",
    "printed_basis": "B.6.15.4 Confederate cavalry gear",
    "fields": {k: finish_field_tier(v) for k, v in {
        "coat": F([A("cs_cavalry_shell_jacket", "most", "short shell jackets typical by 1863; prescribed cavalry yellow but most surviving pieces use buff"), A("cs_captured_union_blue_item", "some", "captured U.S. items common")],
                  "documented", ["Wiki-CSUnif", "Wiki-RichmondDepot"]),
        "headgear": F([A("slouch_hat_cs", "most", "slouch hats outnumbered kepis"), A("hardee_hat_cs_cavalry", "some", "Hardee-type hats"), A("kepi_cs", "few", "kepis outnumbered by slouch hats (B.6.15.4); a kepi on an enlisted man is a flagged private-purchase exception (B.6.12 item 2: kepi on a Confederate private is barred by default)", flagged_exception="private_purchase", tier="plausible-procedural")], "documented", ["Wiki-CSUnif", "Wiki-RichmondDepot"]),
        "accoutrements": ACC([comp("sash_yellow_cavalry", "rare", "documented", ["Wiki-CSUnif"], detail="yellow sash for cavalry sergeants"),
                              comp("mcclellan_saddle_m1859", "some", "inferred", [], detail="Saddles: often captured McClellans (notes, flagged unverified)", captured=True)]),
        "sidearm_sword": F([A("revolver_unspecified", "some", "captured Federal pistols (inferred); model not stated"), A("lemat", "rare", "owned by several Confederate generals")], "inferred", ["Wiki-LeMat"],
                           note="Specifics of Confederate cavalry arms by regiment were not found"),
    }.items()},
    "weapon_default_note": "Richmond rifle/carbine (carbine 25 in barrel, 41 in overall, from Nov 1862; 5,400 made); M1841 Mississippi rifles used by cavalry and sharpshooters; Enfield; captured Federal carbines and pistols; LeMat revolvers owned by several Confederate generals; shotguns possible. Inferred for the broader mix.",
    "resources_note": "Poor roads and no shoeing facilities; some regiments under 100 men (Stuart's statement as relayed) [HistoryNet-LackHorses]",
}
DEFAULTS["default.confederate.cavalry"]["fields"]["weapon"] = F([
    dw("richmond_carbine", 0.3, "tuning; named in B.6.15.4 'Arms' row"), dw("p1853_enfield", 0.3, "tuning; named"), dw("m1841_mississippi", 0.1, "tuning; named: used by cavalry and sharpshooters"),
    dw("sharps_carbine", 0.15, "tuning; 'captured Federal carbines'", captured=True), dw("burnside_carbine", 0.15, "tuning; 'captured Federal carbines'", captured=True),
], "plausible-procedural", ["Wiki-Richmond", "Wiki-M1841", "AR-Guns"], basis_tier="inferred", weapon_scope="long_arm",
    printed_raw="Specifics of Confederate cavalry arms by regiment were not found.", note="mix is inferred for the broader mix (PDF); weights are tuning parameters")

# --- Confederate distinctive units (B.6.5) --------------------------------------------------------------------
LA_FORBID = ["zouave", "wheats_tiger_dress", "coppens_zouave_dress"]


def cs(uid, name, hier, group, *, scope="regiment", state=None, printed=None, opens=(), fields=None, forbidden=(), **kw):
    return unit(uid, name, "confederate", hierarchy_printed=hier, group=group, scope=scope, state=state, inherits="default.confederate.infantry",
                printed=printed, opens=list(opens), fields=fields, forbidden_tags=list(forbidden), **kw)


ANV_DEF = "Ordinary Army of Northern Virginia infantry"
O("OPEN-TEXAS", "Texas Brigade: brigade dress; whether the Gettysburg flag was the cotton or the wool pattern; regimental flags", ["G9", "G11"], ["TSL-1stTexas", "FOTW"])
TX_PRINT = {"documented": "The 1st Texas 'Lone Star' silk flag (Mrs. Wigfall's wedding dress, 55.5 x 56 in) was lost at Antietam on 17 Sept 1862 when the regiment lost 186 of 226; this is the 1862 flag, not a Gettysburg flag. The 5th Texas P1853 Enfield is from a memoir quoted on a forum (weak). The cotton battle-flag issue went to three brigades including the Texas Brigade (per FOTW; second-hand)",
            "open": "Brigade dress; whether the Gettysburg flag was the cotton or the wool pattern; regimental flags",
            "default": "Ordinary Army of Northern Virginia infantry. Do not apply 'Texans in captured blue' without a source (inferred caution)", "tier": "open"}
for uid, nm in (("CS.3AR", "3rd Arkansas Infantry"), ("CS.1TX", "1st Texas Infantry"), ("CS.4TX", "4th Texas Infantry"), ("CS.5TX", "5th Texas Infantry")):
    f = {}
    w = []
    if uid == "CS.5TX":
        f["weapon"] = F([A("p1853_enfield", "all")], "inferred", ["AuthCamp-CSmuskets"], printed_weak=True, printed_raw="weak", assignment_id="UA-5TX", flagged=True, note="P1853 Enfield per Nicholas Pomeroy's memoir")
        w = ["UA-5TX"]
    cs(uid, nm, "Robertson's (Texas) Brigade, Hood's Div.", "texas_brigade", state=uid.split(".")[1][-2:], printed=TX_PRINT, opens=["OPEN-TEXAS"], fields=f, weapon_assignment_ids=w,
       notes="Texas Brigade members: 3rd AR, 1st, 4th, 5th TX as printed; the 1862 Lone Star silk flag is NOT a Gettysburg flag")

O("OPEN-LOUISIANA", "Louisiana: Louisiana Tigers specialist source (Terry Jones, LSU Press) not read; brigade dress", ["G9"], ["Wiki-Hays"])
HAYS_PRINT = {"documented": "Wheat's Tigers (1st Special Battalion) formed in 1861; Wheat was killed at Gaines' Mill in June 1862 and the remnants were drafted into other units. Coppens' Zouaves (1st Louisiana Zouave Battalion) were decimated in 1862 and had no more serious combat; they are not in Hays' brigade. Hays attacked Cemetery Hill at twilight on July 2, overran batteries and withdrew without reinforcement, capturing several flags. Wikipedia's lead says the Tigers and Coppens' wore Zouave-style jackets in the early war",
              "open": "The Louisiana Tigers specialist source (Terry Jones, LSU Press) was not read", "default": "Dress Hays' regiments as ordinary Army of Northern Virginia infantry, no Zouave dress (inferred, per the brief)", "tier": "inferred"}
for n in (5, 6, 7, 8, 9):
    cs("CS.%dLA" % n, "%s Louisiana Infantry" % ordn(n), "Hays' brigade, Early's Div.", "louisiana_hays", state="LA", printed=HAYS_PRINT, opens=["OPEN-LOUISIANA"],
       forbidden=LA_FORBID, zouave_policy="forbidden")
NIC_PRINT = {"documented": "Order of battle only", "open": "Dress", "default": ANV_DEF, "tier": "plausible-procedural"}
for n in (1, 2, 10, 14, 15):
    cs("CS.%dLA" % n, "%s Louisiana Infantry" % ordn(n), "Nicholls' brigade, Johnson's Div.", "louisiana_nicholls", state="LA", printed=NIC_PRINT, opens=["OPEN-LOUISIANA"],
       forbidden=LA_FORBID, zouave_policy="forbidden")

O("OPEN-NC", "North Carolina brigades: brigade dress; state clothing bureau output (weak forum only)", ["G9"], ["AuthCamp-NC", "NC-UnderBothFlags"])
NC_PRINT = {"documented": "Pettigrew's brigade took part in Pickett's Charge; an artifact set (razor, pistol box) is the only item documented. Sgt E.C.N. Green's 47th NC Type I-pattern jacket is documented",
            "open": "Brigade dress; state clothing bureau output (weak forum only)", "default": "Ordinary Army of Northern Virginia infantry with the weak NC forum notes above as a flagged variance", "tier": "open"}
NC_VARIANCE = ("North Carolina (weak forum only): from 1863 the depot jacket differs from the early-war sack coat; the state provided caps and sometimes imported hats; equipment mostly from the Confederate central government; "
               "eastern NC units were supplied regularly, western regiments (29th, 39th, 58th, 60th) less so; the 27th NC possibly wore English import cloth by October 1863. [AuthCamp-NC], weak.")
for uid, nm, hier in (("CS.PETTIGREW", "Pettigrew's brigade (NC regiments as printed)", "Pettigrew"), ("CS.DANIEL", "Daniel's brigade", "Daniel"), ("CS.IVERSON", "Iverson's brigade", "Iverson"),
                      ("CS.RAMSEUR", "Ramseur's brigade", "Ramseur"), ("CS.LANE", "Lane's brigade", "Lane"), ("CS.SCALES", "Scales' brigade", "Scales"),
                      ("CS.HOKE", "Hoke's brigade", "Hoke"), ("CS.STEUART_NC", "Steuart's NC regiments", "Steuart")):
    cs(uid, nm, "North Carolina brigades (%s)" % hier, "north_carolina", scope="brigade", state="NC", printed=NC_PRINT, opens=["OPEN-NC"],
       fields={"headgear": PP([A("slouch_hat_cs", "most"), A("plain_cap_cs", "few", "the state provided caps (weak forum)", flagged=True, tier="plausible-procedural"), A("straw_hat_cs", "few")], ["AuthCamp-NC"], NC_VARIANCE)},
       flagged_variance_notes=[{"text": NC_VARIANCE, "tier": "inferred", "weak_source": True, "source_keys": ["AuthCamp-NC"]}],
       named_individuals=([{"who": "Sgt E.C.N. Green, 47th NC (killed at Gettysburg)", "item": "cs_type_i_jacket", "detail": "possible tailor's copy of a Type I: cadet gray wool, dark-blue tape, eight script 'I' buttons, no belt loops",
                            "tier_printed": "documented", "source_keys": ["9thVA"], "tier": "documented", "weak_source": False, "note": "named individual only; Type I is not drawn for anyone else"}] if uid == "CS.PETTIGREW" else None))

O("OPEN-MS", "Mississippi brigades: dress and arms", ["G9", "G2"], [])
MS_PRINT = {"documented": "Order of battle only", "open": "Dress and arms", "default": ANV_DEF, "tier": "open"}
for uid, nm, hier in (("CS.BARKSDALE", "Barksdale's brigade (13th, 17th, 18th, 21st MS)", "Barksdale 13th, 17th, 18th, 21st"),
                      ("CS.DAVIS", "Davis' brigade (printed: 2nd, 11th, 42nd, 55th NC)", "Davis 2nd, 11th, 42nd, 55th NC"),
                      ("CS.POSEY", "Posey's brigade (12th, 16th, 19th, 48th MS)", "Posey 12th, 16th, 19th, 48th")):
    cs(uid, nm, "Mississippi (%s)" % hier, "mississippi", scope="brigade", printed=MS_PRINT, opens=["OPEN-MS"],
       notes=("PDF prints '55th NC' inside the Mississippi row's Davis list: printed as given" if uid == "CS.DAVIS" else None))

O("OPEN-STONEWALL", "Stonewall Brigade: dress ('gray/butternut mixtures' is memory only)", ["G9"], [])
cs("CS.STONEWALL", "Stonewall Brigade (2nd, 4th, 5th, 27th, 33rd VA)", "Stonewall Brigade (2nd, 4th, 5th, 27th, 33rd VA)", "stonewall", scope="brigade", state="VA",
   printed={"documented": "Order of battle only; 'gray/butternut mixtures' is memory only", "open": "Dress", "default": ANV_DEF, "tier": "open"}, opens=["OPEN-STONEWALL"])
O("OPEN-PICKETT", "Pickett's Virginia brigades: dress; arms", ["G2", "G9"], [])
for uid, nm in (("CS.GARNETT", "Garnett's brigade"), ("CS.ARMISTEAD", "Armistead's brigade"), ("CS.KEMPER", "Kemper's brigade")):
    cs(uid, nm, "Pickett's Virginia brigades", "pickett", scope="brigade", state="VA",
       printed={"documented": "Order of battle; Armistead brought to a hospital by ambulance July 3", "open": "Dress; arms", "default": ANV_DEF, "tier": "open"}, opens=["OPEN-PICKETT"])
O("OPEN-CS-OTHERS", "Kershaw, Wofford, Semmes, Law, Wilcox, Perry, Wright, Anderson (GA), Benning, Doles, Gordon, others: dress and arms", ["G2", "G9"], [])
for uid, nm in (("CS.KERSHAW", "Kershaw"), ("CS.WOFFORD", "Wofford"), ("CS.SEMMES", "Semmes"), ("CS.LAW", "Law"), ("CS.WILCOX", "Wilcox"), ("CS.PERRY", "Perry"),
                ("CS.WRIGHT", "Wright"), ("CS.ANDERSON_GA", "Anderson (GA)"), ("CS.BENNING", "Benning"), ("CS.DOLES", "Doles"), ("CS.GORDON", "Gordon"), ("CS.OTHERS", "others (not individually named)")):
    cs(uid, nm + " brigade" if uid != "CS.OTHERS" else nm, "Kershaw, Wofford, Semmes, Law, Wilcox, Perry, Wright, Anderson (GA), Benning, Doles, Gordon, others", "other_brigades", scope="brigade",
       printed={"documented": "Order of battle only", "open": "Dress and arms", "default": ANV_DEF, "tier": "open"}, opens=["OPEN-CS-OTHERS"])

# --- Confederate sharpshooters ----------------------------------------------------------------------------------
O("OPEN-BLACKFORD", "Blackford's arms and uniform (report does not name arms); HistoryNet article on Blackford not yet read", ["G14"], ["NPS-Blackford"])
cs("CS.5ALBN", "5th Alabama Battalion (Blackford's sharpshooters)", "Rodes' division", "cs_sharpshooters", scope="battalion", state="AL", branch="sharpshooter",
   printed={"documented": "Maj. Eugene Blackford's own report (17 July 1863) is the key source: July 1 skirmishers tree to tree, repulsed cavalry and a double skirmish line; July 2 on the Fairfield road and the edge houses of the town; July 3 fired at 300-500 yd, more than 200 rounds per man, losses 'not more than 20', ammunition resupplied from cartridge boxes collected in town. Arms are not named in the report.",
            "open": "Arms and uniform", "default": "Inferred: issue rifled muskets (Enfield or Springfield), not Whitworths, given 200 rounds per man. Uniform not stated; default is ordinary Army of Northern Virginia infantry dress.", "tier": "inferred"},
   opens=["OPEN-BLACKFORD"],
   fields={"weapon": F([A("p1853_enfield", "most"), A("m1861_springfield", "some", captured=True)], "inferred", ["NPS-Blackford", "AR-Guns"], printed_raw="Inferred: issue rifled muskets (Enfield or Springfield), not Whitworths, given 200 rounds per man",
                       assignment_id="UA-BLACKFORD", flagged=True, note="arms not named in the report; inference by the PDF")}, forbidden=["whitworth"], weapon_assignment_ids=["UA-BLACKFORD"],
   notes="scavenged US cartridge boxes collected in Gettysburg town resupplied the battalion [NPS-Blackford]: documented fact about ammunition supply, not about worn kit")
O("OPEN-CS-SS", "Wright's/Georgia, Pegram's and Wilcox's sharpshooters; Law's Alabama sharpshooters at Little Round Top; Confederate sharpshooters at Devil's Den; the 3rd Georgia SS Bn and 1st SC Rifles are named but not described", ["G14"], ["AR-Sharpshooting"])
for uid, nm, hier in (("CS.3GASSBN", "3rd Georgia Sharpshooter Battalion", "Wofford's brigade"), ("CS.1SCRIFLES", "1st South Carolina Rifles", "McGowan's brigade"),
                      ("CS.SCSSBN", "South Carolina sharpshooter battalion", "(unit as printed in B.6.6)"), ("CS.SS_GENERIC", "Other Confederate sharpshooter battalions (about 16 fielded)", "drawn from regiments")):
    cs(uid, nm, hier, "cs_sharpshooters", scope="battalion", branch="sharpshooter", printed={"documented": "The Confederacy fielded about 16 sharpshooter battalions drawn from regiments; dress was butternut or gray with slouch hats and a mix of issue, civilian and captured clothing. The Enfield P1853 was the most common prized rifle; also the Enfield musketoon, the Whitworth (.451) and the Kerr .442" + ("; SC sharpshooter battalion: more than 200 rounds each by the morning of July 3" if uid == "CS.SCSSBN" else ""),
                                                                                  "open": "Gaps: Wright's/Georgia, Pegram's, Wilcox's sharpshooters; Law's Alabama sharpshooters; Devil's Den", "default": "ordinary dress; Enfield P1853; Whitworth only as a flagged plausible-procedural exception", "tier": "weak"},
       opens=["OPEN-CS-SS"], forbidden=[],
       fields={"weapon": F([A("p1853_enfield", "most", "the most common prized rifle")], "documented", ["AR-Sharpshooting"], note="Whitworth rifle/Kerr/Enfield musketoon: conditional, flagged exceptions only"),
               "headgear": PP([A("slouch_hat_cs", "all")], ["AR-Sharpshooting"], "butternut or gray with slouch hats and a mix of issue, civilian and captured clothing")},
       conditional=[{"item": "whitworth_rifle", "status": "flagged plausible-procedural exception only; no Confederate sharpshooter carries one by default; the two Whitworth GUNS belong to artillery (Hurt's battery)"},
                    {"item": "kerr_rifle", "status": "named; specs gap"}, {"item": "enfield_musketoon", "status": "named only as a prized arm; specs gap"}])

# CS cavalry unit: 34th Va Cav Bn ------------------------------------------------------------------------------
unit("CS.34VACAVBN", "34th Virginia Cavalry Battalion (Witcher)", "confederate", branch="cavalry", scope="battalion", hierarchy_printed="Jenkins' brigade", group="cs_cavalry_jenkins", state="VA",
     inherits="default.confederate.cavalry",
     printed={"documented": "Enfield and Richmond rifle-muskets (short and long), revolvers; hit July 3 by the Spencer-armed 5th Michigan after Sharps- and Burnside-armed regiments failed; about 75% casualties against about 8.7% for the 5th", "open": "dress", "default": "default Confederate cavalry", "tier": "documented"},
     fields={"weapon": F([A("p1853_enfield", "most"), A("richmond_rifle", "some", "Richmond rifle-muskets, short and long")], "documented", ["AR-Guns"], assignment_id="UA-34VA", note="revolvers as sidearm"),
             "sidearm_sword": F([A("revolver_unspecified", "some", "revolvers (type not stated)")], "documented", ["AR-Guns"], note="revolver model not stated")}, weapon_assignment_ids=["UA-34VA"])
