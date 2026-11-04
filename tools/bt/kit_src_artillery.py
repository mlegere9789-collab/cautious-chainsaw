"""Artillery order of battle and battery cards (PDF B.6.14.5-B.6.14.9).  Each battery is a kit unit (branch artillery) that
inherits default.union.artillery / default.confederate.artillery, plus a battery card in ARTY_CARDS.
Gun counts and types are copied as printed; where the PDF gives no gun data the card says 'gap' (no invention)."""
import re
from kit_core import *   # noqa: F401,F403
from kit_items import item, A, F, ITEMS
from kit_sources import eff_tier
import kit_src_union, kit_src_confed, kit_src_support   # noqa: F401  (populate DEFAULTS)

ARTY_CARDS = {}
BRIGADES = []     # artillery brigades / battalions
DRESS_NOTE = ("Per-battery dress is not documented in the notes; apply the branch rules (B.6.14.5) and record the uncertainty on each battery card "
              "(plausible-procedural where a cell has no source).")

TYPE_MAP = {"napoleon": "napoleon_12pdr_m1857", "3inch": "3inch_ordnance_rifle", "10pdr_parrott": "10pdr_parrott", "20pdr_parrott": "20pdr_parrott",
            "james": "14pdr_james_rifle", "12pdr_howitzer": "12pdr_howitzer", "light12": "napoleon_12pdr_m1857", "24pdr_howitzer": "24pdr_howitzer",
            "whitworth": "12pdr_whitworth", "6pdr": "6pdr_field_gun", "3inch_navy": "3inch_navy_rifle", "blakely": "blakely_12pdr", "20pdr": "20pdr_parrott"}


def slug(s):
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")


def G(count, tkey, printed_type=None, note=None):
    d = {"count": count, "type_id": TYPE_MAP[tkey], "printed_type": printed_type}
    if note:
        d["type_resolution"] = note
    return d


def battery(bid, name, army, parent, *, commanders=None, guns=None, guns_printed=None, tier_printed="documented", keys=(), corps=None, notes=None, opens=(),
            horse=False, presence=None, conflicts=None, gap_ids=("B.6.14.10",), group="artillery"):
    cs = army == "confederate"
    default = "default.confederate.artillery" if cs else "default.union.artillery"
    tier, weak, why = eff_tier(tier_printed, list(keys)) if tier_printed else ("gap", None, None)
    unit(bid, name, army, branch="artillery", scope="battery", hierarchy_printed=parent, corps=corps, group=group, inherits=default,
         presence=presence, notes=DRESS_NOTE if notes is None else notes + " " + DRESS_NOTE, parse_status="parsed" if guns else "partial",
         fields={"flag_or_instrument": PP([A("flag_none", "most"), A("bugle", "few"), A("national_color_us" if not cs else "cs_anv_battle_flag", "few")], [], "battery flags/guidon: pattern not specified in B.6.14", basis="inferred")},
         printed={"documented": guns_printed or "gun types not given in the notes", "open": "per-battery dress; guns" if not guns else "per-battery dress", "default": "branch rules", "tier": tier_printed or "gap"},
         opens=list(opens))
    ARTY_CARDS[bid] = {"id": bid, "name": name, "army": army, "parent": parent, "corps": corps, "commanders_printed": commanders, "horse_artillery": horse,
                       "guns": guns or [], "guns_printed": guns_printed or "gap", "guns_status": "stated" if guns else "gap", "tier_printed": tier_printed, "tier": tier, "weak_source": weak,
                       "source_keys": list(keys), "conflicts": conflicts or [], "notes": notes, "gap_ids": list(gap_ids) if not guns else [], "dress": "see inherited " + default, "details": None}
    return ARTY_CARDS[bid]


SSR = ["SS-ArtReserve"]
WOOB = ["Wiki-OOB-Union"]

# --- Union Artillery Reserve (Brig. Gen. Robert O. Tyler; Hunt chief of artillery) --------------------------------
RES = [
    ("1st Regular Brigade (Capt. Dunbar Ransom, wounded July 2)", [
        ("1st US H", "Eakin (wounded)", [G(6, "napoleon", "6 Napoleons")]), ("3rd US F&K", "Turnbull", [G(6, "napoleon", "6 Napoleons")]),
        ("4th US C", "Thomas", [G(6, "napoleon", "6 Napoleons")]), ("5th US C", "Weir", [G(6, "napoleon", "6 Napoleons")])]),
    ("1st Volunteer Brigade (Lt. Col. Freeman McGilvery)", [
        ("5th Massachusetts", "Phillips", [G(6, "3inch", "6 3-inch rifles (conflict: Civil War News says Napoleons)")]), ("9th Massachusetts", "Bigelow", [G(6, "napoleon", "6 Napoleons")]),
        ("15th New York", "Hart", [G(4, "napoleon", "4 Napoleons")]), ("Pa. Independent C & F", "Thompson", [G(6, "3inch", "6 3-inch rifles")])]),
    ("2nd Volunteer Brigade (Capt. Elijah Taft)", [
        ("1st Conn. Heavy B and H", "-", None), ("2nd Connecticut", "Sterling", [G(4, "james", "4 James rifles"), G(2, "12pdr_howitzer", "2 12-pdr howitzers")]),
        ("5th New York", "Taft", [G(6, "20pdr", "6 20-pdr Parrotts")])]),
    ("3rd Volunteer Brigade (Capt. James Huntington)", [
        ("1st New Hampshire", "Edgell", [G(6, "3inch", "6 3-inch", "printed '3-inch'; mapped to the 3-inch Ordnance rifle (inventory line '3-inch rifle'); the 3-inch Navy rifle is not excluded by the PDF")]),
        ("1st Ohio H", "Huntington / Norton", [G(6, "3inch", "6 3-inch", "printed '3-inch'; mapped to the 3-inch Ordnance rifle")]), ("1st Pennsylvania F&G", "Ricketts", [G(6, "3inch", "6 3-inch", "printed '3-inch'; mapped to the 3-inch Ordnance rifle")]),
        ("W.Va. C", "Hill", [G(4, "10pdr_parrott", "4 10-pdr Parrotts")])]),
    ("4th Volunteer Brigade (Capt. Robert Fitzhugh)", [
        ("Md. A", "Rigby", [G(6, "3inch", "6 3-inch", "printed '3-inch'; mapped to the 3-inch Ordnance rifle")]), ("6th Maine", "Dow", [G(4, "napoleon", "4 Napoleons")]),
        ("1st NJ", "Parsons", [G(6, "10pdr_parrott", "6 10-pdr Parrotts")]), ("1st NY G", "Ames", [G(6, "napoleon", "6 Napoleons")]),
        ("1st NY K with 11th NY attached", "Fitzhugh / Burton", [G(6, "3inch", "6 3-inch", "printed '3-inch'; mapped to the 3-inch Ordnance rifle")])]),
]
for brg, bats in RES:
    BRIGADES.append({"id": "ARTBDE." + slug(brg.split("(")[0]), "army": "union", "name": brg, "parent": "Artillery Reserve (Brig. Gen. Robert O. Tyler; Hunt chief of artillery)", "source_keys": SSR, "tier_printed": "documented"})
    for nm, cmd, guns in bats:
        bid = "US.ART." + slug(nm)
        absent = guns is None
        pres = {"status": "absent_from_gettysburg", "note": "not at Gettysburg (at Westminster)", "tier_printed": "documented", "source_keys": SSR, "tier": "documented", "weak_source": False} if absent else None
        gp = None if absent else "; ".join(g["printed_type"] for g in guns)
        battery(bid, nm, "union", "Artillery Reserve, " + brg, commanders=cmd, guns=guns, guns_printed=gp or "not at Gettysburg (at Westminster)", keys=SSR, presence=pres,
                notes="Presence: 'not at Gettysburg (at Westminster)' (Stone Sentinels)." if absent else None)

# --- Union corps artillery brigades ------------------------------------------------------------------------------
CORPS = [
    ("I", "I Corps (Col. Wainwright)", [("2nd Maine B", "Hall"), ("5th Maine E", "Stevens, wounded; Whittier"), ("1st NY E & L", "Reynolds, wounded; Breck"), ("1st Pa. B", "Cooper"), ("4th US B", "Stewart / Davison")]),
    ("II", "II Corps (Capt. Hazard)", [("1st NY B", "Rorty killed; Sheldon; Rogers"), ("1st RI A", "Arnold"), ("1st RI B", "T. F. Brown wounded; Perrin"), ("1st US I", "Woodruff mortally wounded; McCrea"), ("4th US A", "Cushing killed; Canby; Milne killed; Fuger")]),
    ("III", "III Corps (Randolph, wounded; Clark)", [("1st NJ B", "Clark"), ("1st NY D", "Winslow"), ("4th NY", "Smith"), ("1st RI E", "Bucklyn wounded; Freeborn"), ("4th US K", "Seeley wounded; James")]),
    ("V", "V Corps (Capt. Martin)", [("3rd Mass", "Walcott"), ("1st NY C", "Barnes"), ("1st Ohio L", "Gibbs"), ("5th US D", "Hazlett killed; Rittenhouse"), ("5th US I", "Watson wounded; MacConnell")]),
    ("VI", "VI Corps (Col. Tompkins)", [("1st Mass", "McCartney"), ("1st NY", "Cowan"), ("3rd NY", "Harn"), ("1st RI C", "Waterman"), ("1st RI G", "Adams"), ("2nd US D", "Williston"), ("2nd US G", "Butler"), ("5th US F", "Martin")]),
    ("XI", "XI Corps (Maj. Osborn)", [("1st NY I", "Wiedrich"), ("13th NY", "Wheeler"), ("1st Ohio I", "Dilger"), ("1st Ohio K", "Heckman"), ("4th US G", "Wilkeson mortally wounded; Bancroft")]),
    ("XII", "XII Corps (Lt. Muhlenberg)", [("1st NY M", "Winegar"), ("Pa. E", "Atwell"), ("4th US F", "Rugg"), ("5th US K", "Kinzie")]),
]
KNOWN_GUNS = {  # B.6.14.1 'Known Gettysburg gun types by battery' + B.6.14.7 rows
    "4th US A": ([G(6, "3inch", "six 3-inch rifles")], ["SS-Cushing-7888"]),
    "5th US D": ([G(6, "10pdr_parrott", "six 10-pdr Parrotts")], ["SS-Hazlett-10491"]),
    "1st NY B": ([G(4, "10pdr_parrott", "four 10-pdr Parrotts")], ["IronBrigader-Hazard"]),
    "1st RI A": ([G(6, "3inch", "six 3-inch")], ["IronBrigader-Hazard"]),
    "1st RI B": ([G(6, "light12", "six light 12-pdrs", "printed 'light 12-pdrs'; the printed manuals call the Napoleon 'the light 12-pounder gun'; mapped to the Napoleon, flagged")], ["IronBrigader-Hazard"]),
    "1st US I": ([G(6, "light12", "six \"light 12-pdrs\"", "printed 'light 12-pdrs'; mapped to the Napoleon, flagged")], ["IronBrigader-Hazard"]),
    "4th NY": ([G(6, "10pdr_parrott", "six 10-pdr Parrotts (monument)")], ["GburgDaily-Smith4NY", "SS-NYArt-1958"]),
    "13th NY": ([G(None, "3inch", "3-inch (count not stated)", "printed '3-inch'; count not stated")], ["13NYBty-Wheeler"]),
}
for corps, label, bats in CORPS:
    BRIGADES.append({"id": "ARTBDE.%s_CORPS" % corps, "army": "union", "name": label, "parent": "Army of the Potomac", "source_keys": WOOB, "tier_printed": "documented"})
    for nm, cmd in bats:
        bid = "US.ART." + slug(nm)
        if bid in ARTY_CARDS:
            continue
        guns, extra_keys = KNOWN_GUNS.get(nm, (None, []))
        battery(bid, nm, "union", label, commanders=cmd, guns=guns, guns_printed=("; ".join(g["printed_type"] for g in guns) if guns else None), keys=WOOB + extra_keys, corps=corps,
                tier_printed="documented", gap_ids=("B.6.14.10",))
HA = [("Cavalry horse artillery, 1st Brigade (Capt. Robertson)", [("9th Mich.", "Daniels"), ("6th NY", "Martin"), ("2nd US B & L", "Heaton"), ("2nd US M", "Pennington"), ("4th US E", "Elder")]),
      ("Cavalry horse artillery, 2nd Brigade (Capt. Tidball)", [("1st US E & G", "Randol"), ("1st US K", "Graham"), ("2nd US A", "Calef")])]
for label, bats in HA:
    BRIGADES.append({"id": "ARTBDE." + slug(label), "army": "union", "name": label, "parent": "Cavalry Corps", "source_keys": WOOB, "tier_printed": "documented",
                     "conflict": "B.6.15.1 assigns Tidball as commanding all horse artillery with a Robertson entry unclear; B.6.14.6 lists Robertson with the 1st Brigade and Tidball with the 2nd: carry both"})
    for nm, cmd in bats:
        bid = "US.ART." + slug(nm)
        if bid in ARTY_CARDS:
            continue
        gs = [G(6, "3inch", "six 3-inch rifles")] if nm == "2nd US A" else None
        battery(bid, nm, "union", label, commanders=cmd, guns=gs, guns_printed="six 3-inch rifles" if gs else None, keys=WOOB + (["SS-Calef-7820"] if gs else []), horse=True, group="horse_artillery",
                notes="Horse artillery: cannoneers mounted (RegCav-HorseArt); visual references for Union horse vs foot artillery dress: gap.")

# --- Confederate artillery battalions ------------------------------------------------------------------------------
CSK = ["SS-ConfArt-96", "Wiki-OOB-Confed"]
CSB = [
    ("First", "Alexander's (Col. E. P. Alexander; Maj. Frank Huger commanded four batteries in the Peach Orchard)", "Corps (later phase)",
     [("Ashland", "Woolfolk"), ("Bedford", "Jordan"), ("Brooks", "Fickling"), ("Madison La.", "Moody"), ("Richmond", "Parker"), ("Bath", "Taylor")], "gap"),
    ("First", "Washington (La.) Artillery (Maj. Eshleman)", "Corps", [("Squires", None), ("Richardson", None), ("Miller", None), ("Norcom", None)], "gap"),
    ("First", "Cabell's (Col. Henry Cabell)", "McLaws", [("1st NC A", "Manly"), ("Pulaski GA", "Fraser, mortally wounded"), ("1st Richmond Howitzers", "McCarthy"), ("Troup GA", "Carlton")],
     "Fraser's battery had 3-inch rifles and Parrotts (two of each moved under Manly and Furlong); Manly 2 x 3-inch; McCarthy 2 x 3-inch + 2 Napoleons"),
    ("First", "Dearing's", "Pickett", [("Fauquier", "Stribling"), ("Hampden", "Caskie"), ("Richmond Fayette", "Macon"), ("Blount's", None)], "gap"),
    ("First", "Henry's (Maj. Henry; Maj. Haskell)", "Hood", [("Branch NC", "Latham"), ("Charleston German SC", "Bachman"), ("Palmetto SC", "Garden"), ("Rowan NC", "Reilly")],
     "three 10-pdr Parrotts captured from Smith's 4th NY on July 2 were given to this battalion"),
    ("Second", "Jones's", "Early", [("Charlottesville", None), ("Courtney", None), ("Louisiana Guard", None), ("Staunton", None)], "gap"),
    ("Second", "Latimer's", "Johnson", [("1st Md", None), ("Alleghany", None), ("Chesapeake", None), ("Lee", None)],
     "Benner's Hill (July 2, about 20 guns): Chesapeake 4 x 10-lb Parrott; Alleghany 2 x 3-inch + 2 Napoleons; 1st Md 4 Napoleons; Lee 2 x 20-lb Parrott + 1 x 10-lb Parrott + 1 x 3-inch; Rockbridge (loaned from Dance) 4 x 20-lb Parrott"),
    ("Second", "Carter's", "Rodes", [("Jefferson Davis AL", None), ("King William", None), ("Morris", None), ("Orange", None)], "July 3: ten rifled guns on both sides of the railroad cut; smoothbores behind the college"),
    ("Second", "Brown's reserve (Col. J. Thompson Brown) incl. Dance's 1st Va. battalion", "Reserve", [("2nd and 3rd Richmond Howitzers", None), ("Powhatan", None), ("Rockbridge", None), ("Salem", None)], "Rockbridge loaned 4 x 20-lb Parrott to Latimer"),
    ("Second", "Nelson's (Lt. Col. Wm. Nelson)", "Reserve", [("Amherst", None), ("Fluvanna", None), ("Milledge GA", None)], "gap"),
    ("Third", "Garnett's (placed with the Third Corps reserve)", "Reserve", [("Donaldsonville", None), ("Huger", None), ("Lewis", None), ("Norfolk Blues", None)], "gap"),
    ("Third", "Walker's reserve, McIntosh's battalion", "A. P. Hill reserve", [("Danville", None), ("Hardaway AL", "Hurt"), ("2nd Rockbridge", None), ("Johnson's", None)], "Hurt: 2 Whitworths + 2 3-inch rifles per the Oak Hill marker (forum quote)"),
    ("Third", "Pegram's", "Reserve", [("Crenshaw", None), ("Fredericksburg", None), ("Letcher", None), ("Pee Dee", None), ("Purcell", None)], "gap"),
    ("Cavalry", "Stuart's Horse Artillery (Maj. Beckham)", "-", [("Breathed", None), ("Chew", None), ("Griffin", "Md."), ("Hart", "SC"), ("McGregor", None), ("Moorman", None)], "Stuart had 13 guns on East Cavalry Field"),
]
CS_BATTERY_GUNS = {   # only where B.6.14.6/.7 print a battery-level figure
    "Manly": None,
}
for corps, bn, division, bats, known in CSB:
    bnid = "ARTBN." + slug(bn.split("(")[0].replace("'s", ""))
    BRIGADES.append({"id": bnid, "army": "confederate", "name": bn, "corps": corps, "division_served": division, "known_guns_printed": known, "source_keys": CSK, "tier_printed": "documented",
                     "guns_status": "gap" if known == "gap" else "partial (battalion-level text only)", "default_guns_per_battery": {"value": 4, "tier": "plausible-procedural", "note": "PDF: use the 4-gun-per-battery default and the B.6.14.1 inventory as a total check (inferred, plausible-procedural where applied); NOT applied to any card"}})
    for nm, cmd in bats:
        bid = "CS.ART." + slug(nm if nm != "Hardaway AL" else "HURT")
        if bid in ARTY_CARDS:
            bid += "_" + slug(bn.split()[0])
        horse = corps == "Cavalry"
        battery(bid, nm + (" battery" if not nm.endswith("Howitzers") else ""), "confederate", "%s Corps, %s battalion, serving %s" % (corps, bn, division) if not horse else "Stuart's Horse Artillery", commanders=cmd,
                guns=None, guns_printed=None, keys=CSK, horse=horse, group="horse_artillery" if horse else "artillery",
                notes=("Battalion-level text: " + known) if known != "gap" else None)

# 34th Va etc are cavalry; ids reserved in cavalry module.

# Mapping of the named batteries to the details rows (B.6.14.7)
def card(name_slug):
    return ARTY_CARDS["US.ART." + name_slug] if ("US.ART." + name_slug) in ARTY_CARDS else None


# 'Hurt' card gets the Whitworth guns (B.6.14.6/.7: two Whitworths + two 3-inch rifles, forum quote of the Oak Hill marker)
_h = ARTY_CARDS["CS.ART.HURT"]
_h["guns"] = [G(2, "whitworth", "Two Whitworths", None), G(2, "3inch", "two 3-inch rifles", "printed '3-inch'")]
_h["guns_printed"] = "Two Whitworths and two 3-inch rifles; July 3 on Oak Hill per the marker (forum quote)"
_h["guns_status"] = "stated (weak: forum transcription of a marker)"
_h["tier_printed"] = "weak (forum transcription of a marker)"
_h["tier"], _h["weak_source"], _ = eff_tier("documented", ["CWTalk-Whitworths"], True)
_h["source_keys"] = ["CWTalk-Whitworths", "SS-ConfArt-96"]
_h["gap_ids"] = []
_h["notes"] = "PDF B.6.10 names this battery 'Hardaway's battery' (UA-HARDAWAY); B.6.14.6/.7 name it 'Hardaway AL (Hurt)' in McIntosh's battalion"
UNITS["CS.ART.HURT"]["weapon_assignment_ids"] = ["UA-HARDAWAY"]
UNITS["CS.ART.HURT"]["parse_status"] = "parsed"

# --- B.6.14.7 battery-by-battery rows ---------------------------------------------------------------------------------
DETAILS = {
    "US.ART.2nd_US_A": {"printed": {"Guns": "six 3-inch rifles", "Positions and times": "Night June 30 in a hollow. July 1 morning: right and center sections about 600 yd from it. Roder (right), Newman (center), Pergel (left). Archer's brigade seen advancing about 1,000 yd away at about 9:55 am (estimate); left section pulled back because the woods came within 200 yd. Monument: first Union gun of the battle fired from the right section; held under severe fire until I Corps arrived about 10 am; relieved by Hall's 2nd Maine, resupplied, returned to a line in front of Cemetery Ridge; at night about a mile left near the III Corps. Buford's report: Calef \"held his own gloriously\" against 12 guns.",
                                    "Rounds": "not stated; whether the battery ran short is a gap", "Losses": "12 wounded, 13 horses killed", "Sources and conflicts": "Stone Sentinels; CivilWarTalk thread. Relief unit differs on two monuments (Hall's 2nd Maine vs \"Battery B, 1st Maine\"); first-shot location marker unverified"},
                        "source_keys": ["SS-Calef-7820", "CWTalk-Calef"], "losses": {"wounded": 12, "horses_killed": 13}, "conflicts": ["relief unit: Hall's 2nd Maine vs 'Battery B, 1st Maine' (two monuments)"], "gap_ids": ["B.6.14.10"]},
    "US.ART.13th_NY": {"printed": {"Guns": "3-inch (count not stated)", "Positions and times": "July 1 through the town supporting Dilger, then Cemetery Hill. July 2 Cemetery Hill firing from about 2 pm, relieved about 5:30 for ammunition. July 3 in reserve behind Cemetery Hill during the 1-3 pm cannonade; about 4 pm sent to support II Corps where it enfiladed the assault.",
                                   "Rounds": "850 total; 200 lost with a broken caisson", "Losses": "revised to 8 wounded, 3 missing; 12 horses killed", "Sources and conflicts": "13th NY Battery site. Lost a gun when the prolonge broke on July 2"},
                       "source_keys": ["13NYBty-Wheeler"], "rounds": {"total": 850, "lost_with_broken_caisson": 200}, "losses": {"wounded": 8, "missing": 3, "horses_killed": 12}},
    "US.ART.4th_NY": {"printed": {"Guns": "six 10-pdr Parrotts, 135 men (monument)", "Positions and times": "Arrived 9 am July 2; four guns above Devil's Den at 2 pm; one section shifted right near Winslow about 6 pm. Two guns in the Plum Run valley fired canister at Benning's brigade; four on the ridge; when ordered back, valley guns and one ridge gun got away; three ridge guns captured and given to Henry's battalion.",
                                  "Rounds": "240 (marker)", "Losses": "2 killed, 10 wounded, 1 captured, 11 horses killed", "Sources and conflicts": "Stone Sentinels NY; Gettysburg Daily"},
                      "source_keys": ["SS-NYArt-1958", "GburgDaily-Smith4NY"], "men": 135, "rounds": {"total": 240}, "losses": {"killed": 2, "wounded": 10, "captured": 1, "horses_killed": 11}},
    "US.ART.9th_Massachusetts": {"printed": {"Guns": "six Napoleons, 110 men", "Positions and times": "July 2: 4:30-6 pm on the Wheatfield Road shelling Confederate batteries and canistering Kershaw; withdrew about 400 yd by prolonge fire; second position at the stone wall near Trostle's about 6-6:30 pm, ordered by McGilvery to hold; overrun by the 21st Mississippi in hand-to-hand fighting; forced back about 6:30. McGilvery gained \"30 precious minutes\" (Civil War News). July 3: only two serviceable guns under Milton in Ziegler's Grove.",
                                             "Rounds": "about three tons including 92 canister", "Losses": "8 killed, 18 wounded, 2 missing; narrative 28 killed and wounded at the final stand; 65 horses (Civil War in the East). Alternative: 80 of 88 horses, 4 of 6 guns, 3 of 4 officers and 6 of 7 sergeants and 19 enlisted dead or wounded (Civil War News 2025)",
                                             "Sources and conflicts": "Conflict carried as given"},
                                 "source_keys": ["CWEast-9thMass", "CWNews-2025-Devil"], "men": 110, "conflicts": ["losses: 8 killed/18 wounded/2 missing/65 horses (Civil War in the East) vs 80 of 88 horses, 4 of 6 guns, 3 of 4 officers, 6 of 7 sergeants, 19 enlisted dead or wounded (Civil War News 2025): carry both"]},
    "US.ART.5th_Massachusetts": {"printed": {"Guns": "six 3-inch (Stone Sentinels) or six Napoleons (Civil War News)", "Positions and times": "Arrived about 4 pm July 2; only three guns usable east of Plum Run; dragged one piece away after the five-horse limber team was shot.", "Rounds": "gap", "Losses": "gap", "Sources and conflicts": "Conflict on armament"},
                                 "source_keys": ["SS-ArtReserve", "CWNews-2025-Devil"], "conflicts": ["armament: six 3-inch (Stone Sentinels OOB) vs six Napoleons (Civil War News 2025); PDF handling (B.6.14.1): use Stone Sentinels (OOB) pending OR returns"]},
    "US.ART.15th_New_York": {"printed": {"Guns": "four Napoleons, about 70 men", "Positions and times": "Reserve about 10:30 am July 2; ordered forward 4:00; Peach Orchard on the Wheatfield Road facing south about 4:30; canister repelled two charges about 5:30; fought over two hours; enough horses for only three guns; Lt. Knox pulled a gun off by hand. July 3 with McGilvery between Cemetery Hill and Little Round Top for the cannonade and the repulse of Wilcox and Lang.",
                                         "Rounds": "gap", "Losses": "16 of 70 men killed or wounded; 25 horses killed or wounded", "Sources and conflicts": "Wikipedia 15th NY Battery"},
                             "source_keys": ["Wiki-15NYBty"], "men": 70, "losses": {"men_killed_or_wounded": 16, "horses_killed_or_wounded": 25}},
    "US.ART.5th_US_D": {"printed": {"Guns": "six 10-pdr Parrotts", "Positions and times": "Marched about 4:30 pm July 2 to the rear of Barnes's division; opened fire 5:45 pm; fired until after dark; July 3 remained and supported against Longstreet's assault. One gun driven to the summit; the rest effectively carried up; ammunition run up from caissons below. Hazlett mortally wounded kneeling by Weed; Rittenhouse took command.",
                                    "Rounds": "gap", "Losses": "1 officer and 8 men killed, 5 wounded (14 total)", "Sources and conflicts": "Stone Sentinels; Civil War in the East"},
                        "source_keys": ["SS-Hazlett-10491", "SS-Hazlett-8009", "CWEast-5USD"], "losses": {"officers_killed": 1, "men_killed": 8, "wounded": 5, "total": 14}},
    "US.ART.4th_US_A": {"printed": {"Guns": "six 3-inch rifles", "Positions and times": "July 2 attached to Webb's brigade, engaged Wright's Georgians in late afternoon. July 3 morning: enemy fire exploded three limbers (Hazard). Just below the crest between the 71st and 72nd Pa; limbers second line, caissons third. Fire knocked out four of six guns; Webb allowed the guns to be run to the wall; double canister at about 100 yd; Cushing killed at the last shot.",
                                    "Rounds": "gap", "Losses": "Monument: 38 casualties (1 officer and 5 men killed; 1 officer and 31 men wounded); all but one gun and all but three horses disabled. Canby wounded; every officer killed or wounded", "Sources and conflicts": "Warfare History Network; Stone Sentinels; Iron Brigader"},
                        "source_keys": ["WHN-Cushing", "SS-Cushing-7888", "IronBrigader-Hazard"], "losses": {"casualties": 38, "killed": "1 officer and 5 men", "wounded": "1 officer and 31 men"}},
    "US.ART.1st_US_I": {"printed": {"Guns": "six \"light 12-pdrs\"", "Positions and times": "Eight separate morning engagements on July 3", "Rounds": "gap", "Losses": "Woodruff mortally wounded (OOB)", "Sources and conflicts": "Hazard's report via Iron Brigader"},
                        "source_keys": ["IronBrigader-Hazard"]},
    "US.ART.1st_RI_A": {"printed": {"Guns": "six 3-inch", "Positions and times": "Cemetery Ridge, II Corps", "Rounds": "expended every round", "Losses": "gap", "Sources and conflicts": "Hazard"}, "source_keys": ["IronBrigader-Hazard"]},
    "US.ART.1st_RI_B": {"printed": {"Guns": "six light 12-pdrs", "Positions and times": "Cemetery Ridge, II Corps", "Rounds": "gap", "Losses": "1 killed, 7 wounded, 2 missing; 24 horses killed and 6 disabled; two guns sent to the rear", "Sources and conflicts": "Hazard"},
                        "source_keys": ["IronBrigader-Hazard"], "losses": {"killed": 1, "wounded": 7, "missing": 2, "horses_killed": 24, "horses_disabled": 6}},
    "US.ART.1st_NY_B": {"printed": {"Guns": "four 10-pdr Parrotts", "Positions and times": "Cemetery Ridge, II Corps", "Rounds": "gap", "Losses": "1 killed, 8 wounded; 13 horses disabled; \"entirely exhausted\"", "Sources and conflicts": "Hazard. Rorty killed per OOB"},
                        "source_keys": ["IronBrigader-Hazard"], "losses": {"killed": 1, "wounded": 8, "horses_disabled": 13}},
}
FORMATION_ROWS = {
    "McGilvery's Plum Run line": {"printed": {"Guns": "6 to 23 guns as batteries arrived and left", "Positions and times": "Assembled July 2 from various commands to plug a gap south of Cemetery Ridge; July 3 helped stop Wilcox's and Lang's supporting attack.", "Rounds": "-", "Losses": "-", "Sources and conflicts": "Civil War News 2025; Wikipedia McGilvery"},
                                  "source_keys": ["CWNews-2025-Devil", "Wiki-McGilvery"], "guns_range": [6, 23]},
    "II Corps brigade totals": {"printed": {"Guns": "-", "Positions and times": "July 3: cannonade about 1 1/4 hours; batteries held fire until too severe, then fired everything except canister; reserve batteries took exhausted positions; five batteries consolidated into three; Dwight credited with ammunition supply",
                                         "Rounds": "-", "Losses": "about one third of the men (the article gives 28 killed, 119 wounded, 3 missing)", "Sources and conflicts": "Hazard report"}, "source_keys": ["IronBrigader-Hazard"],
                               "losses": {"killed": 28, "wounded": 119, "missing": 3, "fraction": "about one third of the men"},
                               "note": "Hazard's report introduction cites 28 guns in six batteries, but the report itself lists five batteries and 24 guns (Iron Brigader) -- PDF-printed discrepancy carried"},
    "Meade's HQ / Powers Hill": {"printed": {"Guns": "-", "Positions and times": "Leister house made untenable by the July 3 bombardment; Meade moved to Powers Hill; Powers Hill guns fired at Culp's Hill on the morning of July 3", "Rounds": "-", "Losses": "-", "Sources and conflicts": "HistoryNet"}, "source_keys": ["HistoryNet-Thunder"]},
    "Alexander's battalion": {"printed": {"Positions and times": "Arrived 9 am July 2. About 4 pm Huger's four batteries (Moody, Parker, Taylor, Rhett/Gilbert) opened in the Peach Orchard region about 500 yd from the enemy; silenced Union guns in half an hour. July 3 placed at dawn for the assault; ammunition replaced the night of July 2.", "Rounds / losses": "19 killed, 114 wounded, 6 missing; 116 horses lost", "Source": "Alexander's report (NPS)"},
                              "source_keys": ["NPS-AlexanderRpt"], "losses": {"killed": 19, "wounded": 114, "missing": 6, "horses_lost": 116}, "gap": "Rhett/Gilbert identity in Huger's four batteries (B.6.14.10)"},
    "Cabell's battalion": {"printed": {"Positions and times": "July 2 first to open fire from the edge of woods by the Emmitsburg road; the Peach Orchard battery 600-700 yd away. July 3 guns several hundred yards in front of the infantry near a small brick house; opened about 1 pm; nearly continuous for over two hours; McCarthy fired 20 rounds at an advancing line early July 3; ammunition nearly exhausted at the late July 3 shift.",
                                       "Rounds / losses": "12 killed, 30 wounded (4 officers + 26); 67 horses killed, 13 disabled", "Source": "Cabell's report (NPS)"},
                           "source_keys": ["NPS-CabellRpt"], "losses": {"killed": 12, "wounded": 30, "horses_killed": 67, "horses_disabled": 13}},
    "Carter's battalion": {"printed": {"Positions and times": "July 1: Carter's and Fry's batteries on high ground in front of Rodes's line to enfilade; Page's battery heavy loss. July 2 held ready, not engaged. July 3 ten rifles on both sides of the railroad cut shelling Cemetery Hill.",
                                       "Rounds / losses": "Page: 2 killed, 2 mortally wounded, 26 wounded, 17 horses; Carter's battery 4 killed and 7 wounded; battalion total 65", "Source": "Carter's report (NPS)"},
                           "source_keys": ["NPS-CarterRpt"], "losses": {"battalion_total": 65}},
    "Latimer's battalion on Benner's Hill": {"printed": {"Positions and times": "July 2 late afternoon: about 20 guns in five batteries engaged 37 Federal guns from Culp's Hill to East Cemetery Hill, outgunned; by dusk only four guns remained when Johnson's infantry passed. Latimer wounded, died of gangrene August 1",
                                                         "Rounds / losses": "-", "Source": "Emerging Civil War"}, "source_keys": ["ECW-Benner"], "guns_range": [20, 20]},
    "Hurt's battery (McIntosh)": {"printed": {"Positions and times": "Two Whitworths and two 3-inch rifles; July 3 on Oak Hill per the marker (forum quote)", "Rounds / losses": "gap", "Source": "CivilWarTalk"}, "source_keys": ["CWTalk-Whitworths"]},
    "Miller's battery": {"printed": {"Positions and times": "Two guns near the Peach Orchard fired about 1 pm as the cannonade signal (NPS Handbook 9); HistoryNet says Whitworths on Oak Ridge fired the signal (conflict)", "Rounds / losses": "-", "Source": "NPS Handbook 9; HistoryNet"},
                         "source_keys": ["NPS-Handbook9", "HistoryNet-Thunder"], "conflicts": ["signal guns: Miller's two guns near the Peach Orchard (NPS Handbook 9) vs Whitworths on Oak Ridge (HistoryNet)"]},
}
CANNONADE = {
    "printed_intro": "Sequence and values, with every conflicting figure carried (sources: NPS Handbook 9, StrategyPage, American Battlefield Trust, HistoryNet, History Is Now, Wikipedia Pickett's Charge, CivilWarTalk quoting Hunt, Emerging Civil War, Hazard report):",
    "rows": [
        {"element": "Signal", "printed": "About 1 pm; two guns near the Peach Orchard (Miller's battery) fired as the signal (NPS Handbook 9). HistoryNet says Whitworths on Oak Ridge fired the signal. Union gunners waited, then about 80 guns opened (NPS).", "values": {"time": "about 13:00", "union_guns_opening": 80}, "conflict": "signal guns: Miller's battery vs Whitworths on Oak Ridge"},
        {"element": "Confederate gun line", "printed": "About a two-mile line (Trust, \"around 150\"). Cabell's guns near a small brick house; Carter's ten rifles at the railroad cut; Alexander's battalion with the assault; Hurt's Whitworths on Oak Hill.", "values": {"line_miles": 2, "guns_around": 150}},
        {"element": "Confederate gun count", "printed": "138-179 estimates; Pendleton said nearly 150; Alexander's 179 included about two dozen howitzers held for the infantry; at least 142 shown to have fired; reasoned range 142-155 (StrategyPage). Other figures: 130-170 (Coddington over 150; Eicher 159; Trudeau 164; Clark and Pfanz about 170, per Wikipedia Pickett's Charge); 150-170 (HistoryNet, History Is Now); about 80 ANV guns unused (Wikipedia); a Confederate officer estimated about 300 total.", "values": {"estimates": [138, 179], "reasoned_range": [142, 155], "at_least_fired": 142, "other_range": [130, 170], "history_net_range": [150, 170]}, "conflict": "carry as ranges"},
        {"element": "Union gun count", "printed": "About 106 deployed on the ridge, about 85 engaged briefly, about 136 held in reserve (StrategyPage); as many as 120 on Cemetery Ridge and Hill (Trust); only about 80 available for counter-battery (History Is Now; Hunt per Wikipedia); 80 (NPS).", "values": {"deployed": 106, "engaged_briefly": 85, "reserve": 136, "trust_max": 120, "counter_battery": 80}, "conflict": "carry as ranges"},
        {"element": "Duration", "printed": "Nearly two hours (NPS; Cabell \"over two hours\"); about 1 1/4 hours at II Corps (Hazard); roughly one hour (History Is Now); one to two hours (HistoryNet); ended around 3 pm (Trust); Wheeler 1-3 pm.", "values": {"hours_range": [1, 2]}, "conflict": "carry as range"},
        {"element": "Hunt's orders", "printed": "At 10 am inspected batteries and told them to hold fire against small targets, to concentrate on one enemy battery when the Confederates opened, and to conserve ammunition; at noon described the Confederate line as covering the whole two-mile front (CivilWarTalk quoting Hunt's report; not read from the OR). After about two hours he ordered batteries to slow; withdrew damaged and low-ammunition batteries and prepared canister (Trust). Hunt pulled several batteries from the center so the Confederates would think they were destroyed and replaced them with reserve guns (Emerging Civil War)."},
        {"element": "Hancock dispute", "printed": "Hancock countermanded the slowdown and ordered return fire; his officers answered they would obey their chief (Emerging Civil War; Trust). Hancock's anger is documented in secondary sources; the primary texts of both men were not read."},
        {"element": "Alexander lull", "printed": "Alexander judged the Union fire weakening and his own ammunition low; sent word to Pickett (NPS Handbook). Another account: replenishing from trains would take over an hour, so the infantry advanced without close artillery support (History Is Now). Alexander's own report: batteries held positions through the afternoon of July 3. Exact ammunition figures are an open gap."},
        {"element": "Fuze defects and overshooting", "printed": "See B.6.14.2. Gunners aimed high to maximize shrapnel and smoke hung low in windless heat, so most shells flew into the Union rear (History Is Now)."},
        {"element": "Leister house hits", "printed": "Meade's HQ at the Leister house was made untenable by the bombardment and he moved to Powers Hill (HistoryNet). Meade-HQ casualties and horse losses are not retrieved."},
        {"element": "Union batteries hurt", "printed": "Cushing's and Rorty's badly hurt; Osborn's guns on Cemetery Hill had a hard time (CivilWarTalk thread); three of Cushing's limbers exploded in the morning (Hazard)."},
        {"element": "Union counter-fire effect", "printed": "McGilvery's batteries and Rittenhouse on Little Round Top described as the main fire disrupting Pickett's men (forum opinion)."},
        {"element": "Afterwards", "printed": "Hunt's last four reserve batteries ordered up; he rode into the Angle and had his horse shot (Emerging Civil War). Fire shifted to canister within about 400 yd (Wikipedia Pickett's Charge)."},
    ],
    "animation_schedule": {"printed": "Animation schedule (inferred; it fits the majority of sources; the two-hour duration seems to compress the whole artillery phase including the slowdown): 1:00 pm two-gun signal; about 30-40 minutes of full exchange; Union slowdown starting about 1:30-2:00 pm; Hunt/Hancock exchange; Union lull to about 2:45-3:00 pm; then Pickett's advance. Implementation: a randomized burst-distance error biased long (+150-200 yd) with a small rate of duds and early bursts for Confederate case and shell (plausible-procedural, seeded); many Confederate rounds burst beyond the ridge among limbers, caissons, horse lines and the Leister house vicinity, which explains rear-area carnage (inferred).",
                           "tier": "inferred", "burst_error_bias_yd": [150, 200], "bias_tier": "plausible-procedural"},
    "left_flank_sequence": "Animation schedule driver (inferred): the Union left-flank sequence runs from about 2 pm (Smith at Devil's Den) through 4:00-4:30 (Hart, Bigelow, Phillips), 4:30-5:45 (Hazlett to Little Round Top) to about 6:30 (Bigelow overrun).",
    "source_keys": ["NPS-Handbook9", "StrategyPage-Guns", "ABT-ArtPlacements", "HistoryNet-Thunder", "HistoryIsNow-Pickett", "Wiki-PickettCharge", "CWTalk-HuntReport", "ECW-Hunt", "IronBrigader-Hazard"],
    "tier": "documented", "weak_source": False, "tier_note": "mixed secondary sources; the PDF prints no tier for the table; each conflicting figure kept",
}
FIRE_EFFECT_RULES = [
    {"effect": "Muzzle flash and smoke", "rule": "Per-gun charge (Napoleon 2.5 lb, 3-inch 1.0 lb, 20-pdr Parrott 2.0 lb); smoke lingers in windless heat and reduces visibility; powder backfires in rain only as a visual note", "basis": "Charge data (B.6.14.1); smoke lingering and visibility as a TW design analogue (Wikipedia Napoleon: Total War)"},
    {"effect": "Projectile flight", "rule": "Muzzle velocity 1,054-1,500 ft/s; per-gun range curve from the 5-degree values; rifles to about 4,180 yd at 16 degrees", "basis": "B.6.14.1"},
    {"effect": "Round-shot bounce", "rule": "Bounces and rolls on dry July ground, sticks in soft ground; slope can skip a shot a long way; bounce is surface-dependent", "basis": "Napoleon Guide; Total War analogue (Medieval II forum, Empire modding thread); inferred for Gettysburg"},
    {"effect": "Case/shell burst", "rule": "Airburst puff at the fuze-cut range; case sends a ball cone downward (78 balls for a Napoleon); common shell breaks into few large fragments", "basis": "B.6.14.2"},
    {"effect": "Canister", "rule": "27-ball cone inside 350-400 yd; double canister at about 100 yd", "basis": "B.6.14.2"},
    {"effect": "Ground impact", "rule": "Crater and dirt plume; impact graphics per surface type (grass, wheat, mud, stone); craters appear in Napoleon: Total War", "basis": "TW analogues"},
    {"effect": "Structures", "rule": "Shell ignites buildings; solid shot ricochets off stone; rail fences splinter", "basis": "Wikipedia field artillery; Napoleon: Total War preview; terrain sections B.8"},
    {"effect": "Human damage", "rule": "Round shot kills along its path (penetration through several men); case and canister cone; knockback by mass and velocity; morale penalty for hits and near misses", "basis": "TW modding documentation as the analogue; the 1863 effect remains modelled from ordnance data"},
    {"effect": "Fuze defect", "rule": "Long bursts on July 3 for the Confederate side", "basis": "B.6.14.2"},
    {"effect": "Casualty and horse animation", "rule": "Crew deaths degrade the drill (B.6.14.3); horses shot in traces; limber and caisson explosions (three of Cushing's limbers exploded on July 3)", "basis": "Hazard; Iron Brigader"},
    {"effect": "Exploding caisson", "rule": "Documented for Cushing's limbers; Wheeler's broken caisson lost 200 rounds", "basis": "Hazard; 13th NY Battery"},
]
TW_NOTE = ("Total War sources: Warscape/Empire modding documentation is used only as engineering vocabulary; the physical values come from the ordnance data. Sources for Total War crew animation, limber and unlimber behaviour, "
           "casualty and crew replacement, mortar and rocket mechanics, muzzle-flash VFX detail and firing sound design were not found in any reachable source; crew and limber animation is designed from the drill documents (documented and inferred), not copied from Total War (B.6.14.9).")

# Attach details
for key, det in list(DETAILS.items()):
    if key in ARTY_CARDS:
        ARTY_CARDS[key]["details"] = det
    else:
        raise KeyError("detail row without battery card: " + key)
# Phillips/Bigelow slugs: check
GAPS_B6_14_10 = [
    ("Per-elevation range tables (1, 2, 3, 4, 5, 10 degrees) for each gun; exact drill positions and commands; recoil distance", "Gibbon, The Artillerist's Manual (1860), and the 1861 Ordnance Manual (archive.org)",
     "PARTLY SETTLED by docs/battle-theatre/drill/ (tables for 6-pdr, 12-pdr, light 12-pdr, howitzers; drill positions and commands for the Union system); recoil distance and tables for rifles still open"),
    ("Chest rounds per limber and caisson; fuze models; Bormann, Schenkl and Hotchkiss specifics", "Ordnance Manual; Ordnance Department reports", "PARTLY SETTLED: Napoleon chest 32, 6-pdr chest 50, Bormann fuze (drill files); Schenkl/Hotchkiss/percussion models open"),
    ("Blakely 12-pdr specs (only a count of 4 found); 3-inch Navy rifle; 24-pdr howitzer battery identity; Ames rifled bronze Napoleons (a single line, six made in 1862); mountain howitzer use (none found)", "Ordnance Manual; Confederate ordnance returns", "open"),
    ("Hunt's own report; Hancock's account; Hunt's July 3 positions; Alexander's memoir and exact ammunition state", "OR vol. 27 part 1 (Hunt) and part 2 (Alexander, Pendleton); Alexander, Military Memoirs of a Confederate; Hunt's later Century articles", "open"),
    ("Gun types for corps batteries; Confederate guns for Alexander, Eshleman, Henry, Dearing, Garnett, Nelson, Pegram, Jones, Dance", "OR returns; Busey and Martin (strength) and battery returns; Gettysburg Stone Sentinels pages", "open"),
    ("Missing battery positions, times and losses: Weir (5th US C), Thomas (4th US C), Cowan (1st NY), Stevens (5th Maine at East Cemetery Hill), Wiedrich, Winegar, Rugg, Kinzie, Atwell, Seeley, Clark, Winslow, Watson, Culp's Hill batteries, Seminary Ridge Third Corps battalions (Pegram, McIntosh, Garnett) for July 2-3",
     "OR vol. 27; Stone Sentinels battery pages; NPS Gettysburg battery position research; regimental/battery histories", "open"),
    ("Rounds expended per battery (only Smith, Wheeler, Bigelow, McCarthy known); the 32,000/22,000 totals", "OR reports (battery returns); Hunt's report", "open"),
    ("Calef's horse loss detail and ammunition state; Confederate crew size; Confederate visual references; dress of horse versus foot artillery", "OR; Calef's report; photographs; Charles Reed and other period drawings", "open"),
    ("\"Lane\" artillery not identifiable", "Wikipedia OOB cross-check against OR", "open"),
    ("Richmond laboratory explosion date (March vs April 1863)", "Civil War News article; Confederate ordnance histories", "open"),
    ("Whitworth maximum range and Oak Hill marker text", "The marker itself and the 1864 magazine the thread cites; Ordnance sources", "open"),
    ("Louisiana batteries, Rhett/Gilbert identity in Huger's four batteries", "Alexander's report; OR", "open"),
]
LANE_NOTE = ("Notes and caveats (B.6.14.6): the Wikipedia page lists no battalion called \"Lane\" (Lane was an infantry brigadier in Pender's division), so Lane's artillery is not identifiable from sources. Allocating guns to Dearing, Eshleman, Alexander, Walker, Nelson, "
             "Garnett, Dance and others needs per-battery returns that were not found; use the 4-gun-per-battery default and the inventory in B.6.14.1 as a total check (inferred, plausible-procedural where applied). Henry's battalion arrived July 2; its July 3 positions were not retrieved (gap). "
             "Two sources differ on which batteries sat with which corps in the later phases (Alexander commanded the First Corps guns in the later phases of the battle).")
