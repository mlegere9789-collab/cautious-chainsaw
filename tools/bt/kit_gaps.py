"""PDF B.6.13 gap table G1-G21 mapped to the kit records they affect, plus B.6.6 context that is not a unit record
(Devil's Den photograph, entry-test conflict, additional Sharps/Whitworth facts).  Mapping rule: automatic from the gap_ids carried by
open items, assignments, weapons, batteries; manual lists below for gaps that attach to a whole data section."""
from kit_core import UNITS, OPEN_ITEMS, DEFAULTS
import kit_weapons_data as KW
import kit_src_artillery as AR
import kit_src_cavalry as CV

G_PRINTED = {
    "G1": ("Regiment-by-regiment Union armament", "Thomas, Ready, Aim, Fire! App. I; Coates & Thomas App. C; OR ordnance returns; NARA RG 156"),
    "G2": ("Confederate regiment armament", "Confederate ordnance receipts; brigade and regimental histories; field-find reports (Marc Hermann)"),
    "G3": ("Frock versus sack proportion by corps; shirt colors at Gettysburg; company-level dress; overcoat use in July", "Regimental histories (Pennsylvania at Gettysburg, New York at Gettysburg); Troiani's Regiments and Uniforms style references; Fall In / Regimentals research"),
    "G4": ("Corps badge status per regiment; XII Corps star; Cavalry crossed sabers; Artillery Reserve badge; which shapes were never adopted", "Dyer's Compendium; Bates; Katcher; NPS badge pages; NY State Military Museum"),
    "G5": ("Accoutrement details: M1855 versus M1861 boxes, canteen type proportions, knapsack types, scabbard type, shelter half, mess gear", "Fall In / Regimentals; Troiani; museum object records"),
    "G6": ("Irish Brigade 1863 dress and sprigs; Philadelphia Brigade; 20th Maine; 16th Michigan; Vermont brigades; Excelsior; 12th NJ; XI Corps German regiments; 39th NY; 44th NY; 83rd PA", "Regimental histories; Troiani; NYSM flag and uniform collection; Pennsylvania Capitol Preservation Committee flag collection"),
    "G7": ("Bucktail deer tails in July 1863; 13th PA Reserves weapon; 149th/150th PA dress", "Regimental histories; Rock Island Auction record; PA Reserves histories"),
    "G8": ("Union general-by-general dress; horse furniture; staff aiguillettes", "LOC CDVs; Troiani and Bradley paintings; horsesoldier.com CDV pages; Generals in Blue"),
    "G9": ("Confederate state-by-state issue; Louisiana Tigers specialist work; NC clothing bureau; Texas Brigade dress and flags", "Jensen, Cadet Grey and Butternut Brown; Terry Jones, The Louisiana Tigers in the Gettysburg Campaign; Fremantle's diary (Project Gutenberg); ACWM and Smithsonian object records"),
    "G10": ("Confederate equipment: mess gear, how they marched and fought", "ACWM and Smithsonian records; regimental memoirs"),
    "G11": ("Confederate flag pattern at Gettysburg and regimental colors", "ACWM object records; state flag collections; Wikipedia battle-flag page (failed to load)"),
    "G12": ("Confederate officer dress (Lee, Longstreet, Hill, Ewell, Pickett, Armistead, Stuart)", "Fremantle; CDVs; Heritage Auctions CDV listings"),
    "G13": ("Berdan green versus blue in July 1863; Sharps retention; Pitzer's Woods details; Trepp's role; Wisconsin company", "Sword's article on the Pitzer's Woods reconnaissance; Marcot, U.S. Sharpshooters: Berdan's Civil War Elite; Earley, The Second USSS; Smithsonian"),
    "G14": ("Blackford's arms and uniform; Wright's/Georgia, Pegram's, Wilcox's, Law's sharpshooters; Devil's Den Confederate sharpshooters", "HistoryNet Blackford article; battalion histories; OR"),
    "G15": ("Devil's Den dead man's clothing and prop rifle", "LOC record; Frassanito, Gettysburg: A Journey in Time"),
    "G16": ("Support troops: Signal insignia, provost, pioneers, engineers, teamsters, sutlers, musicians, stretcher bearer methods", "Letterman's report; Army regulations of 1861; photographs; Signal Corps histories"),
    "G17": ("Arms specs not retrieved: P1856/58 short rifle, Gallager, Smith, Merrill, Sharps & Hankins, Starr, Joslyn, Maynard, Colt Navy, Whitney, Adams, Kerr, Brunswick, imports, Tower, Fayetteville, M1840 NCO and M1850 sabers, bayonet dimensions, Lorenz and M1842 weights", "Flayderman's guide; Coates & Thomas; museum object records"),
    "G18": ("Spencer: how the 5th Michigan obtained its arms and numbers; reconcile the production-date conflict", "Michigan adjutant general reports; Spencer company records"),
    "G19": ("Drill: nine-step list and Hardee versus Casey differences; misfire rates; buck-and-ball charge", "Casey, Infantry Tactics; Hardee's Tactics"),
    "G20": ("Day-by-day soiling and weather effects on kit", "Regimental histories; Signal Service weather logs (see B.10)"),
    "G21": ("Conflicts to carry: M1861 barrel 40 vs 41 in; Enfield 900,000 vs 1,000,000+; Sharps .52 vs .54; Berdan blue vs green; entry-test group size; Spencer production date; Wikipedia rate of Spencer fire; \"6th Minnesota\" at the railroad cut; recovered loaded arms 24,000 of 27,574 vs 37,000", "Primary armory records; the print sources above"),
}

DEVILS_DEN = {
    "id": "SCENE.DEVILS_DEN_PHOTO", "topic": "The Devil's Den photograph, \"Home of a Rebel Sharpshooter\" (B.6.6)",
    "printed": "The photograph is staged. It was taken on 6 July 1863, per Frassanito attributed to Timothy O'Sullivan, with Gardner arriving 5 July and later claiming credit. The body of an unidentified Confederate was moved more than 40 yards to the stone niche (the same body appears in another photograph), a prop rifle was placed (a type a sharpshooter would not use, and it appears in other Gardner photographs), a blanket under the body may have been used to carry it, and Gardner's caption (mortal wound from a shell, a November return) is considered implausible. The Library of Congress record calls the setting a \"rocky niche\"; the wall was built by Confederates and later rebuilt by the NPS ([Wiki-HomeRebel], [Prologue]). Consequences for the animation: do not stage a \"sharpshooter's lair\" scene on the strength of this photograph; use it as evidence of the terrain and of a body, not of a sniper's life. Open: the dead man's clothing is not described in the retrieved sources (LOC record and Frassanito's \"Gettysburg: A Journey in Time\" are the places to look) and the prop rifle's type is unverified.",
    "values": {"photo_date": "1863-07-06", "attributed_to": "Timothy O'Sullivan (per Frassanito)", "gardner_arrived": "1863-07-05", "body_moved_yd": "more than 40", "staged": True},
    "rule": "no 'sharpshooter's lair' scene; the dead man's clothing and the prop rifle are open (G15): no kit record may be invented for them",
    "source_keys": ["Wiki-HomeRebel", "Prologue"], "gap_ids": ["G15"], "tier": "open_gap", "tier_note": "clothing and prop rifle type: gap (no tier)",
}
ENTRY_TEST = {
    "id": "CONF-BERDAN-ENTRY-TEST", "topic": "Berdan's Sharpshooters entry test, ten shots at 200 yd: group size",
    "positions": [{"value": "5 in.", "source": "American Rifleman"}, {"value": "a 10-in. target", "source": "Gettysburg Daily"}, {"value": "5 in. at 600 ft", "source": "Smithsonian"}],
    "pdf_handling": "Treat as unresolved; it affects no scene.", "status": "carried (G21)", "source_keys": ["AR-Sharpshooting", "GburgDaily-2USS", "SI-Berdan"], "owner_decision": "PENDING OWNER",
}
SHARPS_B66 = {
    "printed": "The Sharps .52 breechloader, about 30 in barrel, double-set triggers on many, sights to 700-800 yd, about 2,000 supplied; Berdan feuded with Chief of Ordnance Ripley; Colt 1855 revolving rifles were issued first and replaced by Sharps in 1862 (issued from May 1862 per Wikipedia) ([AR-Sharpshooting], [Wiki-1USS]). Wikipedia puts accuracy at about 600 yd and claims 8-10 rounds a minute. Private target rifles with Malcolm or Morgan James scopes (.36-.45 caliber, up to about 25 lb) were common but Berdan found them impractical; Truman Head (\"California Joe\") carried a scoped rifle of about 32 lb ([AR-Sharpshooting]). Heavy target rifles were kept in wagons, one per company; the two regiments used Sharps rifles ([AR-Guns]). Whether the men still carried Sharps in July 1863 is stated by most sources but is not directly confirmed for that month in the notes.",
    "values": {"double_set_triggers": "on many", "sights_yd": [700, 800], "supplied_approx": 2000, "accuracy_yd_wikipedia": 600, "rate_per_min_wikipedia": [8, 10], "colt_1855_revolving_rifles_first": True, "replaced_by_sharps": 1862, "issued_from": "1862-05 per Wikipedia",
               "private_target_rifles": {"scopes": ["Malcolm", "Morgan James"], "caliber": [0.36, 0.45], "weight_lb_up_to": 25}, "truman_head_rifle_lb": 32, "heavy_target_rifle": "kept in wagons, one per company"},
    "retention_in_july_1863": {"status": "stated by most sources, not directly confirmed for that month (G13)"},
    "source_keys": ["AR-Sharpshooting", "Wiki-1USS", "AR-Guns"],
}
WHITWORTH_B66 = {
    "printed": "The Confederacy fielded about 16 sharpshooter battalions drawn from regiments; dress was butternut or gray with slouch hats and a mix of issue, civilian and captured clothing. The Enfield P1853 was the most common prized rifle; also the Enfield musketoon, the Whitworth (.451, hexagonal bore, 36 or 39 in barrels; 100-500 bought; about $1,000 per cased Whitworth with 1,000 rounds, scope about $200 extra) and the Kerr .442; one division got 30 Whitworths and 16 Kerrs ([AR-Sharpshooting], which does not name Georgia or Alabama units). A popular article gives the Whitworth effective range as about 2,000 yd; this is overstated (Wikipedia gives 800-1,000 yd). Low reliability ([WeAreMighty]). Whitworth cannons versus Whitworth rifles: the Oak Hill marker, via a forum transcription (weak), lists \"Two Whitworths, Two 3 Inch Rifles\" in Hardaway's Alabama battery (Hurt's), McIntosh's battalion, on Oak Hill on July 3. The notes infer this is the breech-loading Whitworth cannon, not the sharpshooter rifle; the sources conflate the two.",
    "values": {"bought": [100, 500], "price_usd_cased_with_1000_rounds": 1000, "scope_usd_extra": 200, "one_division_got": {"whitworth": 30, "kerr": 16}, "popular_effective_range_yd_overstated": 2000},
    "source_keys": ["AR-Sharpshooting", "WeAreMighty", "Wiki-Whitworth", "CWTalk-Whitworth"],
}
KW.WEAPONS["sharps_rifle_m1859"]["b6_6_context"] = SHARPS_B66
KW.WEAPONS["whitworth_rifle"]["b6_6_context"] = WHITWORTH_B66

# ---------------------------------------------------------------------------------------------------------------
MANUAL_MAP = {
    "G3": {"other": ["default.union.infantry.coat", "default.union.infantry.shirt", "default.union.infantry.accoutrements", "unit OPEN-REGULARS", "UNITS group regulars"], "note": "frock/sack proportion and shirt colours are tuning-parameter weights (no sourced counts)"},
    "G4": {"other": ["kit_specs.corps_badges (all rows)", "default.union.cavalry.badge (crossed sabers unsourced)", "every Union unit's badge field", "badge_field XII (star: memory only)", "Artillery Reserve badge (no record: PDF names none)"]},
    "G5": {"other": ["default.union.infantry.accoutrements (M1855 vs M1861 box, scabbard type, canteen proportions, mess gear)", "default.confederate.infantry.accoutrements", "items: cartridge_box_union_40rd, bayonet_scabbard_union, canteen_tin_cloth_cover, knapsack_black_painted, shelter_half"]},
    "G8": {"other": ["kit_specs.named_individuals.not_done.union (Reynolds ... staff aiguillettes)"]},
    "G10": {"other": ["default.confederate.infantry.accoutrements (mess gear)", "default.confederate.infantry.pack_state"]},
    "G11": {"other": ["default.confederate.infantry.flag_or_instrument", "item cs_anv_battle_flag", "OPEN-TEXAS"]},
    "G12": {"other": ["kit_specs.named_individuals (Pickett, Ewell, Lee, Stuart)", "kit_specs.named_individuals.not_done.confederate (Longstreet, A.P. Hill, Armistead)", "default.confederate.officers"]},
    "G15": {"other": ["kit_specs.scene_evidence_records SCENE.DEVILS_DEN_PHOTO"], "note": "no unit or item record may be created for the dead man's clothing or the prop rifle"},
    "G17": {"other": ["weapons.json weapons with tier 'gap' or non-empty spec_gaps"]},
    "G18": {"other": ["weapons.spencer_repeater", "assignments UA-MICH-SPENCER, UA-MICH-1-7", "US.CAV.5MICH, US.CAV.6MICH"]},
    "G19": {"other": ["weapons.ammunition.drill (nine commands now confirmed in printed manuals; misfire rates and buck-and-ball charge still open)", "weapons.buck_and_ball_load", "weapons.artillery.crew"]},
    "G20": {"other": ["kit_specs.wear_states (all rows; levels are tuning parameters)"]},
    "G21": {"other": ["weapons.m1861_springfield CONF-M1861-BARREL", "weapons.p1853_enfield CONF-P53-IMPORT", "weapons.sharps_rifle_m1859 / sharps_carbine CONF-SHARPS-CAL", "kit_specs.disputes DISP-BERDAN-GREEN-BLUE", "kit_specs.conflicts_carried CONF-BERDAN-ENTRY-TEST",
                      "weapons.spencer_repeater CONF-SPENCER-PROD, CONF-SPENCER-RATE", "weapons.assignments UA-6MN-FLAG", "weapons.ammunition.expended_examples CONF-LOADED-ARMS"]},
}


def build_gap_table():
    auto = {g: {"open_items": [], "units": [], "assignments": [], "weapons": [], "batteries": []} for g in G_PRINTED}
    for o in OPEN_ITEMS:
        for g in o["gap_ids"]:
            if g in auto:
                auto[g]["open_items"].append(o["id"])
                auto[g]["units"] += [uid for uid, u in UNITS.items() if o["id"] in u.get("open", [])]
    for aid, a in KW.ASSIGNMENTS.items():
        for g in a["gap_ids"]:
            if g in auto:
                auto[g]["assignments"].append(aid)
    for wid, w in KW.WEAPONS.items():
        for g in w["gap_ids"]:
            if g in auto:
                auto[g]["weapons"].append(wid)
    for g in ("G17",):
        for wid, w in KW.WEAPONS.items():
            if w["tier"] == "gap" or w["spec_gaps"]:
                if wid not in auto[g]["weapons"]:
                    auto[g]["weapons"].append(wid)
    for bid, c in AR.ARTY_CARDS.items():
        pass
    out = []
    for g, (item, settle) in G_PRINTED.items():
        rec = {"id": g, "open_item_printed": item, "source_that_would_settle_it_printed": settle, "status": "open", "pdf_section": "B.6.13"}
        rec["affected"] = {k: sorted(set(v)) for k, v in auto[g].items() if v}
        rec["affected"].update(MANUAL_MAP.get(g, {}))
        rec["affected_counts"] = {k: len(v) for k, v in rec["affected"].items() if isinstance(v, list)}
        rec["register"] = "GOVERNANCE/register (Evidence-Gap Register): this table does not replace the register rows; it maps the PDF gap ids onto kit records"
        out.append(rec)
    return out


GAP_TABLE = build_gap_table()
CONFLICTS_CARRIED = [ENTRY_TEST]
SCENE_EVIDENCE = [DEVILS_DEN]
LEADS_TO_VERIFY = [
    "XII Corps star badge and Cavalry Corps crossed sabers (memory)", "13th PA Reserves deer tails largely gone by 1863; tails on the 149th/150th PA (memory)", "Patrick's Provost Marshal guard of the 93rd NY and regulars (memory)",
    "Signal Corps crossed-flag cap insignia (memory)", "The nine drill commands listed in B.6.11 (memory) -- now confirmed in Casey and Hardee (drill_infantry.json)", "The 11th Corps unit dress guess",
    "Hancock's clean white shirt as a habit (the CWTalk-Hancock post supports it; confirm in a primary source)",
]
