"""Support troops (B.6.8), named officers (B.6.7), rank rules (B.6.2/B.6.7/B.6.12), wear rules (B.6.12)."""
from kit_core import *   # noqa: F401,F403
from kit_items import item, A, F, ITEMS
from kit_src_union import dw, RANK_NOTE

# ---------------------------------------------------------------------------------------------------------------
# Support troops (B.6.8)
O("OPEN-SUP-AMB", "Ambulance Corps: which Gettysburg crews wore the band (the August 1863 revision was too late to matter); numbers present per corps", ["G16"], ["AuthCamp-Amb", "CivMed-Insignia"])
AMB_PRINT = {"documented": "Letterman, General Orders 147 (2 Aug 1862): privates a green cap band 2 in wide and a green half-chevron 2 in wide on each arm above the elbow; NCOs the same band with full green chevrons, points toward the shoulder; 24 Aug 1863 revision: sergeants a 1.5-in band, privates a green half-chevron ([AuthCamp-Amb] forum summary of a CMH book; [CivMed-Insignia]). Many ambulance men had no insignia or wore regimental dress; photographs show both. Ambulance wagons carried corps and division flags (II Corps 1st Div at Gettysburg). Each ambulance had a driver and two stretcher bearers and two stretchers ([Wiki-AmbCorps])",
             "open": "Which Gettysburg crews wore the band (the August 1863 revision was too late to matter); numbers present per corps",
             "default": "Ordinary infantry-dress soldiers; a minority with a green band and chevron", "tier": "documented (orders); mix inferred"}
unit("US.SUP.AMBULANCE", "Ambulance Corps (Union)", "union", branch="ambulance", scope="group", group="support", inherits="default.union.infantry",
     hierarchy_printed="Ambulance Corps (Letterman, GO 147)", allowed_tags=["green_hatband", "green_chevron"], opens=["OPEN-SUP-AMB"], printed=AMB_PRINT,
     soldier_variants=[
         {"id": "regimental_dress", "share": "most", "tier": "plausible-procedural", "fields": {}, "note": "many ambulance men had no insignia or wore regimental dress"},
         {"id": "insignia_per_GO147", "share": "minority", "tier": "documented", "source_keys": ["CivMed-Insignia", "AuthCamp-Amb"],
          "fields": {"headgear": F([A("kepi_ambulance_green_band", "all", "green cap band 2 in wide (privates)")], "documented", ["CivMed-Insignia", "AuthCamp-Amb"]),
                     "coat": F([A("sack_coat_ambulance_green_chevron", "all", "green half-chevron 2 in wide on each arm above the elbow (privates)")], "documented", ["CivMed-Insignia", "AuthCamp-Amb"])}}],
     fields={"flag_or_instrument": F([A("stretcher", "some"), A("ambulance_corps_flag", "few", "on wagons"), A("flag_none", "most")], "documented", ["Wiki-AmbCorps"], printed_weak=True,
                                     note="each ambulance had a driver and two stretcher bearers and two stretchers; wagons carried corps and division flags")},
     notes="NCO insignia (full chevrons / 1.5-in band) are in the printed text; privates only are drawn (NCO insignia items not catalogued separately: parse partial)", parse_status="partial")
O("OPEN-SUP-STRETCHER", "Stretcher bearers: bandsmen as stretcher bearers not retrieved; methods (wheelbarrows, blankets as litters)", ["G16"], [])
unit("US.SUP.STRETCHER", "Stretcher bearers", "union", branch="ambulance", scope="group", group="support", inherits="default.union.infantry",
     opens=["OPEN-SUP-STRETCHER"], printed={"documented": "Bandsmen as stretcher bearers: not retrieved; bearers load men into horse-drawn ambulances (NPS program)", "open": "methods, wheelbarrows, blankets as litters", "default": "Ordinary infantry dress with stretchers", "tier": "open"},
     fields={"flag_or_instrument": F([A("stretcher", "all")], "plausible-procedural", ["NPS-Accout"], basis_tier="inferred", printed_raw="Ordinary infantry dress with stretchers")})
O("OPEN-SUP-MEDICAL", "Hospital stewards and surgeons: Gettysburg-specific dress", ["G16"], ["Wiki-UnionUnif"])
unit("US.SUP.MEDICAL", "Hospital stewards and surgeons (Union)", "union", branch="medical", scope="group", group="support", inherits="default.union.infantry",
     forbidden_tags=["green_hatband"], opens=["OPEN-SUP-MEDICAL"],
     printed={"documented": "Green is traditional for hospital steward/surgeon; dark blue boards for medical (Wikipedia). Confederate regulation staff colors: medical black facings with green sash", "open": "Gettysburg-specific dress",
              "default": "Dark blue frock or sack coat with green sash accents for surgeons", "tier": "open"},
     fields={"coat": PP([A("coat_surgeon_dark_blue_green_sash", "all")], ["Wiki-UnionUnif"], "Dark blue frock or sack coat with green sash accents for surgeons")},
     notes="medical men have the green hat/cap band only if they are Ambulance Corps (B.6.12 item 4): none here")
unit("CS.SUP.MEDICAL", "Confederate medical staff", "confederate", branch="medical", scope="group", group="support", inherits="default.confederate.infantry",
     forbidden_tags=["green_hatband"], parse_status="partial", opens=[O("OPEN-SUP-CS", "Confederate support troops (ambulance, musicians, provost, pioneers, teamsters, sutlers, ordnance): B.6.8 covers the Union side; Confederate medical staff colours only ('black facings with green sash', regulation, no source key)", ["G16"], [])],
     printed={"documented": "Confederate regulation staff colors: medical black facings with green sash", "open": "Gettysburg-specific dress", "default": "default Confederate dress", "tier": "open"},
     notes="B.6.8 is a Union-oriented table; no Confederate support-troop kit is given beyond this line")
O("OPEN-SUP-MUS", "Musicians: instrument types in use", ["G16"], ["Wiki-UnionUnif"])
unit("US.SUP.MUSICIAN", "Musicians (infantry)", "union", branch="band", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-MUS"],
     printed={"documented": "Birdcage braid on infantry musicians; brigade bands abolished in 1862 (v1 notes, memory); no Gettysburg detail", "open": "Instrument types in use", "default": "Drum, fife, bugle with a few per regiment", "tier": "open"},
     fields={"coat": F([A("sack_coat_union", "most"), A("birdcage_braid_musician", "some", "birdcage chest braid in the facing colour")], "documented", ["Wiki-UnionUnif"], note="'nothing else on drummers and fifers is sourced'"),
             "flag_or_instrument": PP([A("drum", "some"), A("fife", "some"), A("bugle", "few")], [], "Drum, fife, bugle with a few per regiment", basis="inferred")})
O("OPEN-SUP-PROVOST", "Provost insignia; the memory-only note that Patrick's guard was 93rd NY and regulars is not sourced", ["G16"], [])
unit("US.SUP.PROVOST", "Provost guards", "union", branch="provost", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-PROVOST"],
     printed={"documented": "The order of battle lists provost guards: 4th NJ (3 companies) with VI Corps and 10th ME Battalion (3 companies) with XII Corps; Patrick as Provost Marshal; V Corps headquarters guard 12th NY (Cos D, E) and 17th PA Cavalry (Cos D, H); I Corps headquarters guard Co. D, 149th PA; Artillery Reserve train guard 4th NJ (7 companies)",
              "open": "Provost insignia; the memory-only note that Patrick's guard was 93rd NY and regulars is not sourced", "default": "Ordinary dress of the parent unit", "tier": "open"},
     parent_units=[{"unit": "4th NJ (3 companies)", "assignment": "VI Corps provost"}, {"unit": "10th ME Battalion (3 companies)", "assignment": "XII Corps provost"},
                   {"unit": "12th NY (Cos D, E)", "assignment": "V Corps headquarters guard"}, {"unit": "17th PA Cavalry (Cos D, H)", "assignment": "V Corps headquarters guard"},
                   {"unit": "Co. D, 149th PA", "assignment": "I Corps headquarters guard"}, {"unit": "4th NJ (7 companies)", "assignment": "Artillery Reserve train guard"}],
     notes="Provost Marshal: Patrick. The 4th NJ appears twice as printed (3 companies VI Corps; 7 companies Artillery Reserve train guard).")
O("OPEN-SUP-ENG", "Pioneers and engineers: pioneer dress; 15th/50th NY Engineers and the US Engineer Battalion (memory only)", ["G16"], ["Wiki-UnionUnif"])
unit("US.SUP.ENGINEER", "Pioneers and engineers", "union", branch="pioneer", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-ENG"],
     printed={"documented": "Engineers: yellow chevrons and trouser stripes (Wikipedia). Engineer Brigade under Benham; Warren as Chief of Engineers", "open": "Pioneer dress; 15th/50th NY Engineers and the US Engineer Battalion (memory only)", "default": "Ordinary infantry dress with tools", "tier": "open"},
     fields={"accoutrements": ACC([comp("tools_pioneer", "some", "plausible-procedural", [], detail="Ordinary infantry dress with tools")])},
     conditional=[{"item": "chevrons_branch_color", "status": "engineer yellow chevrons/trouser stripes (Wikipedia) are printed but the PDF default is ordinary infantry dress; not drawn"}])
O("OPEN-SUP-SIGNAL", "Signal Corps insignia (crossed flags on the cap is memory only); station layout", ["G16"], ["Wiki-SignalCorps"])
unit("US.SUP.SIGNAL", "Signal Corps", "union", branch="signal", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-SIGNAL"],
     printed={"documented": "Wigwag flags; a separate branch by March 1863 ([Wiki-SignalCorps], no uniform data)", "open": "Insignia (crossed flags on the cap is memory only); station layout", "default": "Ordinary dress with a flag set; no insignia until sourced", "tier": "open"},
     fields={"flag_or_instrument": F([A("flag_set_wigwag", "all")], "documented", ["Wiki-SignalCorps"])})
O("OPEN-SUP-TEAM", "Teamsters and wagoners: everything", ["G16"], [])
unit("US.SUP.TEAMSTER", "Teamsters and wagoners", "union", branch="teamster", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-TEAM"],
     printed={"documented": "Not sourced", "open": "Everything", "default": "Civilian-style or worn infantry dress", "tier": "open"},
     fields={"coat": PP([A("coat_civilian_style", "some"), A("sack_coat_union", "most")], [], "Civilian-style or worn infantry dress", basis="inferred")})
O("OPEN-SUP-SUTLER", "Sutlers: everything", ["G16"], [])
unit("US.SUP.SUTLER", "Sutlers", "union", branch="sutler", scope="group", group="support", inherits="default.union.infantry", opens=["OPEN-SUP-SUTLER"],
     printed={"documented": "Not sourced", "open": "Everything", "default": "Civilian dress, not at the front line", "tier": "open"},
     fields={"coat": PP([A("coat_civilian_style", "all")], [], "Civilian dress, not at the front line", basis="inferred")},
     placement_rule="not at the front line (default)")
unit("US.SUP.ORDNANCE", "Ordnance (regimental ordnance officers and sergeants)", "union", branch="ordnance", scope="group", group="support", inherits="default.union.infantry",
     printed={"documented": "Regimental ordnance officers/sergeants managed ammunition trains; ordnance dark blue boards, crimson trouser stripes", "open": "Dress", "default": "Ordinary dress", "tier": "documented (role)"},
     opens=[O("OPEN-SUP-ORD", "Ordnance dress", ["G16"], ["Wiki-UnionUnif"])])

# ---------------------------------------------------------------------------------------------------------------
# Named officers (B.6.7).  Individual appearance is pursued only for named commanders; only what a source states is documented.
NAMED_OFFICERS = [
    {"id": "NAMED.PICKETT", "army": "confederate", "who": "George Pickett", "items": ["kepi_cs", "cs_pickett_double_breasted_gold"],
     "documented_text": "per a contemporary account, a small blue kepi-style cap, buffed gloves, double-breasted coat with gold buttons, gold spurs, polished boots, riding crop; long perfumed ringlets and a curling scented beard; black charger 'Old Black'",
     "tier_printed": "documented", "source_keys": ["Wiki-Pickett"], "note": "Wikipedia, secondary"},
    {"id": "NAMED.EWELL", "army": "confederate", "who": "Richard S. Ewell", "items": [], "documented_text": "about 5 ft 8 in, bald, wooden leg and crutches when dismounted",
     "tier_printed": "documented", "source_keys": ["Wiki-Ewell"]},
    {"id": "NAMED.LEE", "army": "confederate", "who": "Robert E. Lee (horse)", "items": [], "documented_text": "horse Traveller, a gray gelding with black mane and tail, 'somewhat nervous'; Lee's own coat: lead only",
     "tier_printed": "documented", "source_keys": ["Lee-Letters"]},
    {"id": "NAMED.STUART", "army": "confederate", "who": "J.E.B. Stuart", "items": [], "documented_text": "(memory only in the OOB notes; the cavalry notes carry a red-lined gray cape, yellow sash, plumed hat, red flower from Wikipedia)",
     "tier_printed": "plausible-procedural", "source_keys": ["Wiki-Stuart"], "note": "lead only"},
    {"id": "NAMED.MEADE", "army": "union", "who": "George G. Meade", "items": ["fatigue_dress_no_straps_meade"], "documented_text": "on July 3 wore fatigue dress with no shoulder straps, so artillerymen did not recognize him; nickname 'Old Baldy' refers to his lack of hair, not clearly to the horse",
     "tier_printed": "documented", "source_keys": ["GburgExp-Meade"]},
    {"id": "NAMED.HANCOCK", "army": "union", "who": "Winfield S. Hancock", "items": ["shirt_white"], "documented_text": "favored white shirts; his letter to the Cyclorama painters suggests sashes were generally not worn; officers often wore slouch hats",
     "tier_printed": "documented", "source_keys": ["CWTalk-Hancock"], "note": "to confirm in a primary source (Leads to verify)"},
    {"id": "NAMED.CUSTER", "army": "union", "who": "George A. Custer", "items": [], "documented_text": "reportedly threw off his hat on July 3 so his men could see his long yellow curls; uniform criticized as gaudy; popular tradition with a Wikipedia citation, source not shown. Horses Vic and Dandy belong to 1876. Velvet jacket and red tie are popular lore, not confirmed",
     "tier_printed": "plausible-procedural", "source_keys": [], "note": "lore, source not shown"},
    {"id": "NAMED.BUFORD", "army": "union", "who": "John Buford", "items": [], "documented_text": "rode an old white horse, 'Grey Eagle'",
     "tier_printed": "documented", "source_keys": ["Wiki-Buford"]},
]
for n in NAMED_OFFICERS:
    n["tier"], n["weak_source"], why = eff_tier(n["tier_printed"], n["source_keys"])
    if why:
        n["tier_note"] = why
NAMED_OPEN = {
    "union": ["Reynolds", "Doubleday", "Howard (lost an arm, so an empty sleeve; the notes say Fair Oaks)", "Sickles", "Sykes", "Sedgwick", "Slocum", "Hunt", "Pleasonton", "Gibbon", "Webb", "Hays", "Warren", "Vincent", "Chamberlain",
              "horse furniture", "staff aiguillettes"],
    "confederate": ["Longstreet", "A.P. Hill", "Armistead", "the rest"],
    "gap_ids": {"union": ["G8"], "confederate": ["G12"]},
    "leads": "Named leads: LOC carte-de-visite portraits, Troiani and Bradley paintings, horsesoldier.com CDV pages (Union); Fremantle, CDVs, Heritage Auctions CDV listings (Confederate)",
}

# ---------------------------------------------------------------------------------------------------------------
# Rank rules (B.6.2 rank on enlisted men; B.6.7; B.6.12 hard limit 4)
RANK_RULES = {
    "ranks": ["private", "corporal", "sergeant", "first sergeant", "lieutenant", "captain", "field officer", "general"],
    "roles": ["rifleman", "color_bearer", "color_guard", "file_closer", "skirmisher", "musician", "horse_holder", "stretcher_bearer", "officer"],
    "officer_ranks": ["lieutenant", "captain", "field officer", "general"],
    "enlisted_ranks": ["private", "corporal", "sergeant", "first sergeant"],
    "union": {
        "chevrons": {"printed": "chevrons on both sleeves in branch color (sky blue for infantry)", "tier": "inferred", "source_keys": ["Wiki-UnionUnif"], "weak_source": True,
                     "tier_note": "printed documented; only Wikipedia cited"},
        "nco_trouser_stripe": {"printed": "Infantry dark blue; sergeants 1.5 in, corporals 0.5 in", "tier_printed": "documented", "tier": "inferred", "source_keys": ["Wiki-UnionUnif"], "weak_source": True},
        "first_sergeant_musician_plate": {"printed": "First sergeants and musicians wore the rectangular sword-belt plate", "tier_printed": "documented", "source_keys": ["3rdUS"], "tier": "documented", "weak_source": False},
        "sash": {"printed": "Crimson sashes for officers and sergeants were regulation, but Hancock's letter to the Cyclorama painters indicates sashes were generally not worn in the field at Gettysburg. Default: no sashes on the line; sashes only on deliberately flashy officers or Zouave sashes where the unit's dress calls for them (inferred).",
                 "tier": "inferred", "source_keys": ["CWTalk-Hancock"], "weak_source": True, "draw": "rare, conditional"},
        "sword": {"private": [], "corporal": [], "sergeant": ["m1840_nco_sword (often in wagons, weak): not drawn"], "first sergeant": ["m1840_nco_sword (often in wagons, weak): not drawn"],
                  "lieutenant": ["m1850_foot_officer_sword"], "captain": ["m1850_foot_officer_sword"], "field officer": ["m1850_foot_officer_sword"], "general": ["m1850_foot_officer_sword"]},
        "branch_colors": {"infantry": "sky blue", "artillery": "scarlet", "cavalry": "yellow", "engineers": "yellow chevrons", "medical": "dark blue boards, crimson trouser stripes",
                          "ordnance": "dark blue boards, crimson trouser stripes", "sharpshooters": "green", "source_keys": ["Wiki-UnionUnif"], "tier_printed": "documented", "tier": "inferred", "weak_source": True},
        "insignia": "see default.union.officers.insignia",
    },
    "confederate": {
        "chevrons": {"printed": "three for sergeants, two for corporals", "tier_printed": "documented", "tier": "inferred", "source_keys": ["Wiki-CSUnif"], "weak_source": True},
        "nco_trouser_stripe": {"printed": "NCO stripe 1 1/4 in cotton [Wiki-CSUnif]. Conflict: the 1861 regulations give a dark blue stripe for infantry NCOs and regimental officers' trouser stripe in dark blue cloth ([CSA-Regs]), against Wikipedia's 'light/sky blue'. Carried as a conflict; the product shows stripes on a minority of NCO trousers and picks the regulation color with the conflict flagged.",
                               "status": "conflict", "positions": [{"color": "dark blue", "source_keys": ["CSA-Regs"]}, {"color": "light/sky blue", "source_keys": ["Wiki-CSUnif"]}],
                               "pdf_recommended_default": "regulation colour (dark blue), conflict flagged", "owner_decision": "PENDING OWNER"},
        "sash": {"printed": "sash red for infantry and artillery, yellow for cavalry [Wiki-CSUnif]", "tier_printed": "documented", "tier": "inferred", "source_keys": ["Wiki-CSUnif"], "weak_source": True},
        "insignia": "see default.confederate.officers.insignia",
    },
    "hard_limits_b612": ["no more than one kind of long arm per soldier", "the arm must come from the unit's assignment row or, for unknown units, the default distribution",
                         "officers and NCOs get the sash/sword only where the rank rules allow and the sash is rare", "Confederates may wear captured Union items; Union soldiers never wear Confederate items"],
}

# ---------------------------------------------------------------------------------------------------------------
# Wear states (B.6.12 'Day-by-day wear, rain and heat'); all rows inferred; levels are tuning parameters
WEAR_STATES = [
    {"id": "before_jul1", "when": "Before July 1", "state": "Marching dust, sweat-darkened shirts, discarded packs (12th NJ, 122nd NY)", "reason": "Forced marches; XI and I Corps arrived after hard marches", "from": None, "to": "1863-06-30"},
    {"id": "jul1", "when": "July 1", "state": "Dust-gray cloth, sweat-dark shirts; powder-blackened hands and cuffs for the units engaged", "reason": "Hard marching and first fighting", "from": "1863-07-01", "to": "1863-07-01"},
    {"id": "jul2", "when": "July 2", "state": "Hot, shirt-sleeves common; faces and cuffs powder-blackened; hat sweat stains", "reason": "Heat and heavy fighting; coats off", "from": "1863-07-02", "to": "1863-07-02"},
    {"id": "jul3", "when": "July 3", "state": "Heat plus smoke: stronger soiling, sooty faces, men in shirt-sleeves", "reason": "The heat day and the cannonade", "from": "1863-07-03", "to": "1863-07-03"},
    {"id": "jul4", "when": "July 4", "state": "Rain: wool dark and heavy, mud on trouser legs and shoes, gum blankets and ponchos deployed, hats drooping", "reason": "Rain on July 4, 1.39 in (Jacobs readings via ENV-Strategy; see B.10)", "from": "1863-07-04", "to": "1863-07-04"},
    {"id": "jul5_14", "when": "July 5-14", "state": "Mud, rain-stained, wounds and bandages on the withdrawing Confederate column", "reason": "", "from": "1863-07-05", "to": "1863-07-14"},
    {"id": "night", "when": "Night", "state": "Same kit, fires, dim lighting; coats and blankets on", "reason": "B.10 night spec", "from": None, "to": None, "applies_to": "every night"},
]
for w in WEAR_STATES:
    w.update({"tier": "inferred", "tier_printed": "inferred", "source_keys": [], "level": {"kind": "tuning_parameter", "value": None, "note": "no source quantifies soiling; the engine draws a seeded jitter per soldier"}})
