"""Cavalry order of battle (PDF B.6.15.1, B.6.15.2), cavalry arms by regiment (B.6.15.4), horses (B.6.15.5), behaviour states (B.6.15.7),
conflicts register (B.6.15.8), gaps (B.6.15.9).  Each cavalry regiment is a kit unit (branch cavalry) inheriting default.*.cavalry.
Also adds the few infantry units named only in the B.6.10 gap row (84th NY, 26th NC) and the 125th NY, and the default Union cavalry long-arm draw."""
import re
from kit_core import *   # noqa: F401,F403
from kit_items import item, A, F, ITEMS
from kit_sources import eff_tier
from kit_weapons_data import ASSIGNMENTS, WEAPONS
import kit_src_union, kit_src_confed, kit_src_support, kit_src_artillery   # noqa: F401

# ---------------------------------------------------------------------------------------------------------------
# Default Union cavalry long-arm draw.  B.6.10 gives no explicit default for cavalry; the printed facts are: Sharps the most common
# Union cavalry arm by 1863; Burnside in 43 Union cavalry regiments 1863-64; Gallager, Smith, Merrill, Sharps & Hankins named; Spencer ONLY
# for the 5th/6th Michigan; Henry never.  Weights are tuning parameters.
def dwc(item_id, value, basis, **kw):
    d = {"item": item_id, "share": None, "weight": {"value": value, "kind": "tuning_parameter", "historical_basis": False, "derived_from": basis},
         "tier": "plausible-procedural", "flagged_exception": kw.pop("flagged", False)}
    d.update(kw)
    return d


DEFAULTS["default.union.cavalry"]["fields"]["weapon"] = F([
    dwc("sharps_carbine", 0.5, "tuning; 'the most common Union cavalry arm by 1863' (B.6.9)"),
    dwc("burnside_carbine", 0.2, "tuning; 'Burnside .54 ... 43 Union cavalry regiments in 1863-64' (B.6.9)"),
    dwc("gallager_carbine", 0.1, "tuning; named in the Buford rows", flagged=True), dwc("smith_carbine", 0.1, "tuning; named in the Buford rows", flagged=True),
    dwc("merrill_carbine", 0.1, "tuning; named in the Buford rows", flagged=True),
], "plausible-procedural", ["Wiki-Sharps", "Wiki-Burnside", "CWNews-Carbine"], basis_tier="inferred", weapon_scope="long_arm",
    printed_raw="B.6.10 gives no default for cavalry; the arms are the carbines named in B.6.9/B.6.15.4. Spencer is allowed ONLY on the 5th Michigan and part of the 6th Michigan from 1863-07-03; Henry never.",
    note="Union cavalry carbines were not interchangeable (B.6.15.4); mix inside a regiment is a tuning choice")

# ---------------------------------------------------------------------------------------------------------------
CAV_CARDS = {}
CAV_FORMATIONS = []


def cslug(s):
    return re.sub(r"[^A-Za-z0-9]+", "_", s).strip("_")


def weapon_fields(ua):
    """Split an assignment into the long-arm field and sidearm additions; date-correct for Spencer."""
    a = ASSIGNMENTS[ua]
    longs, sides = [], []
    for wid in a["weapon_ids"]:
        cat = WEAPONS[wid]["category"]
        (sides if cat in ("handgun", "edged") else longs).append(wid)
    return a, longs, sides


def cav(uid, name, army, parent, commander, *, cos=None, keys=(), ua=None, presence=None, notes=None, tier_printed="documented", corps="CAV", division=None, brigade=None, flagged_conflict=None, group=None, branch="cavalry", scope="regiment"):
    cs = army == "confederate"
    default = "default.confederate.cavalry" if cs else "default.union.cavalry"
    tier, weak, why = eff_tier(tier_printed, list(keys)) if tier_printed else ("gap", None, None)
    fields = {}
    wids = []
    if ua:
        a, longs, sides = weapon_fields(ua)
        wids = [ua]
        if longs:
            if uid in ("US.CAV.5MICH", "US.CAV.6MICH"):
                share = "all" if uid.endswith("5MICH") else "some"
                ents = [A("spencer_repeater", share, "from 1863-07-03" + ("; two companies / part of the 6th (PDF)" if share == "some" else ""), valid_from="1863-07-03", disputed_window={"from": "1863-06-30", "to": "1863-07-02"})]
                if share == "some":
                    ents += [A("sharps_carbine", "most", "arms of the 6th Michigan's other companies are not stated; inferred default (B.6.10 1st/7th Michigan row)", tier="plausible-procedural", flagged=True),
                             A("burnside_carbine", "some", "same: inferred default", tier="plausible-procedural", flagged=True)]
                fields["weapon"] = F(ents, "documented", a["source_keys"], assignment_id=ua, date_fallback="inherit_default", printed_raw=a["weapon_text"],
                                     note="Spencer valid from 1863-07-03; 6th Michigan: Hanover 30 Jun use disputed; before the window the default Union cavalry draw applies (plausible-procedural)")
            else:
                tag = []
                ents = []
                for wid in longs:
                    ents.append(A(wid, "most" if wid == longs[0] else "some"))
                fields["weapon"] = F(ents, a["tier"] if a["tier"] in ("documented", "inferred", "plausible-procedural") else "inferred", a["source_keys"], printed_weak=(a.get("weak_source") is True),
                                     assignment_id=ua, printed_raw=a["weapon_text"], flagged=bool(a.get("flagged") or a["tier"] != "documented"), note=a["weapon_text"] if len(a["weapon_text"]) < 300 else None)
        if not longs and a.get("candidates_unconfirmed"):
            fields["weapon"] = F([A(w, "most" if i == 0 else "some", "candidate arm (B.6.10: 'likely Sharps, Burnside or other (inferred)')", tier="plausible-procedural", flagged=True) for i, w in enumerate(a["candidates_unconfirmed"])],
                                 "plausible-procedural", [], basis_tier="inferred", assignment_id=ua, printed_raw=a["weapon_text"], flagged=True, note="arms unknown (gap); Spencer NOT allowed")
        if sides:
            fields["sidearm_sword"] = F([A(w, "some") for w in sides] + [A("m1860_light_cav_saber", "some")], a["tier"] if a["tier"] in ("documented", "inferred", "plausible-procedural") else "inferred", a["source_keys"],
                                         printed_weak=(a.get("weak_source") is True), note="sidearms named in the same assignment row; sabers per default.union.cavalry")
    unit(uid, name, army, branch=branch, scope=scope, hierarchy_printed=parent, corps=corps if not cs else None, division=division, brigade=brigade, group=group or ("cs_cavalry" if cs else "us_cavalry"),
         inherits=default, fields=fields, presence=presence, weapon_assignment_ids=wids, parse_status="parsed",
         printed={"documented": ("%s; %s" % (commander, cos) if cos else commander) or "name only", "open": "dress; arms" if not ua else "dress", "default": "default %s cavalry" % army, "tier": tier_printed or "gap"},
         notes=notes, opens=[])
    CAV_CARDS[uid] = {"id": uid, "name": name, "army": army, "parent": parent, "commander_printed": commander, "companies_printed": cos, "source_keys": list(keys), "tier_printed": tier_printed, "tier": tier, "weak_source": weak,
                      "tier_note": why, "weapon_assignment_ids": wids, "presence": presence, "notes": notes}
    return CAV_CARDS[uid]


W1 = ["Wiki-OOB-Union"]
W2 = ["Wiki-OOB-Confed"]
U = "union"
# --- B.6.15.1 Union Cavalry Corps (Maj. Gen. Pleasonton) --------------------------------------------------------
CAV_FORMATIONS.append({"id": "CAVDIV.1", "army": U, "name": "1st Division, Brig. Gen. Buford", "tier": "documented", "source_keys": W1})
CAV_FORMATIONS.append({"id": "CAVBDE.1.1", "army": U, "name": "1st Brigade, Col. Gamble", "parent": "CAVDIV.1", "tier": "documented", "source_keys": W1,
                       "note": "Gamble and Devin as brigade leaders came from the HistoryNet and Buford-report fetches, while the Wikipedia summary left some labels unlabelled (inferred grouping)"})
cav("US.CAV.3IN", "3rd Indiana Cavalry", U, "1st Division (Buford), 1st Brigade (Gamble)", "Col Chapman", cos="6 cos", keys=W1, ua="UA-3IN", division="1st", brigade="Gamble")
cav("US.CAV.8IL", "8th Illinois Cavalry", U, "1st Division (Buford), 1st Brigade (Gamble)", "Maj Beveridge", keys=W1, ua="UA-8IL", division="1st", brigade="Gamble")
cav("US.CAV.8NY", "8th New York Cavalry", U, "1st Division (Buford), 1st Brigade (Gamble)", "Lt Col Markell", keys=W1, ua="UA-6-8NY", division="1st", brigade="Gamble",
    notes="B.6.15.1 strengths: one 8th NY company 56 men with 43 horses (HistoryNet, Lack of horses)")
cav("US.CAV.12IL", "12th Illinois Cavalry", U, "1st Division (Buford), 1st Brigade (Gamble)", "Maj Lemmon, mortally wounded", cos="4 cos", keys=W1, ua="UA-12IL", division="1st", brigade="Gamble")
CAV_FORMATIONS.append({"id": "CAVBDE.1.2", "army": U, "name": "2nd Brigade, Col. Devin", "parent": "CAVDIV.1", "tier": "documented", "source_keys": W1})
cav("US.CAV.6NY", "6th New York Cavalry", U, "1st Division (Buford), 2nd Brigade (Devin)", "Maj Beardsley", cos="6 cos", keys=W1, ua="UA-6-8NY", division="1st", brigade="Devin")
cav("US.CAV.9NY", "9th New York Cavalry", U, "1st Division (Buford), 2nd Brigade (Devin)", "Col Sackett", keys=W1, ua="UA-9NY", division="1st", brigade="Devin")
cav("US.CAV.17PA", "17th Pennsylvania Cavalry", U, "1st Division (Buford), 2nd Brigade (Devin)", "Col Kellogg", keys=W1, ua="UA-17PA", division="1st", brigade="Devin")
cav("US.CAV.3WV", "3rd West Virginia Cavalry (Cos A, C)", U, "1st Division (Buford), 2nd Brigade (Devin)", "Capt Conger", cos="Cos A, C", keys=W1, ua="UA-3WV", division="1st", brigade="Devin")
CAV_FORMATIONS.append({"id": "CAVBDE.1.R", "army": U, "name": "Reserve Brigade, Brig. Gen. Merritt", "parent": "CAVDIV.1", "tier": "documented", "source_keys": W1})
cav("US.CAV.6PA", "6th Pennsylvania Cavalry", U, "1st Division (Buford), Reserve Brigade (Merritt)", "Maj Haseltine", keys=W1, division="1st", brigade="Merritt")
cav("US.CAV.1US", "1st US Cavalry", U, "1st Division (Buford), Reserve Brigade (Merritt)", "Capt Lord", keys=W1, division="1st", brigade="Merritt", group="us_regular_cavalry")
cav("US.CAV.2US", "2nd US Cavalry", U, "1st Division (Buford), Reserve Brigade (Merritt)", "Capt Rodenbough", keys=W1, division="1st", brigade="Merritt", group="us_regular_cavalry")
cav("US.CAV.5US", "5th US Cavalry", U, "1st Division (Buford), Reserve Brigade (Merritt)", "Capt Mason", keys=W1, division="1st", brigade="Merritt", group="us_regular_cavalry")
cav("US.CAV.6US", "6th US Cavalry", U, "1st Division (Buford), Reserve Brigade (Merritt)", "Maj Starr, wounded; Lts Carpenter, Nolan; Capt Claflin wounded", keys=W1 + ["RegCav-6thUS"], division="1st", brigade="Merritt", group="us_regular_cavalry",
    notes="B.6.15.1 strengths: authorized 1,063; about 1,072 assigned June 5 but only about 500 serviceable horses; about 546 men dismounted at Dumfries; entered Fairfield with about 500 mounted (Wikipedia Fairfield says about 400: conflict); only 17 officers present")
CAV_FORMATIONS.append({"id": "CAVDIV.2", "army": U, "name": "2nd Division, Brig. Gen. D. M. Gregg", "tier": "documented", "source_keys": W1})
CAV_FORMATIONS.append({"id": "CAVBDE.2.1", "army": U, "name": "1st Brigade, Col. McIntosh", "parent": "CAVDIV.2", "tier": "documented", "source_keys": W1 + ["SS-2ndDivCav"], "note": "Brigade grouping for the 2nd Division is as given by Stone Sentinels."})
cav("US.CAV.1MD", "1st Maryland Cavalry (11 cos)", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Lt Col Deems", cos="11 cos", keys=W1, division="2nd", brigade="McIntosh")
cav("US.CAV.PURNELL_A", "Purnell Legion Co A", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Capt Duvall", cos="Co A", keys=W1, division="2nd", brigade="McIntosh", scope="company")
cav("US.CAV.1MA", "1st Massachusetts Cavalry", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Lt Col Curtis", keys=W1, division="2nd", brigade="McIntosh")
cav("US.CAV.1NJ", "1st New Jersey Cavalry", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Maj Beaumont", keys=W1, division="2nd", brigade="McIntosh",
    notes="ran low on carbine ammunition on July 2 and used revolvers (B.6.10 10th NY row); carbine type not stated")
cav("US.CAV.1PA", "1st Pennsylvania Cavalry", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Col Taylor", keys=W1, division="2nd", brigade="McIntosh")
cav("US.CAV.3PA", "3rd Pennsylvania Cavalry", U, "2nd Division (Gregg), 1st Brigade (McIntosh)", "Lt Col Jones", keys=W1, division="2nd", brigade="McIntosh")
CAV_FORMATIONS.append({"id": "CAVBDE.2.2", "army": U, "name": "2nd Brigade, Col. Pennock Huey", "parent": "CAVDIV.2", "tier": "documented", "source_keys": ["SS-2ndDivCav"],
                       "presence": {"status": "absent_from_gettysburg", "note": "Sent to Westminster and not engaged (Stone Sentinels); never at Gettysburg (B.6.15.7)"}})
CAV_FORMATIONS.append({"id": "CAVBDE.2.3", "army": U, "name": "3rd Brigade, Col. J. Irvin Gregg", "parent": "CAVDIV.2", "tier": "documented", "source_keys": W1})
cav("US.CAV.1ME", "1st Maine Cavalry (10 cos)", U, "2nd Division (Gregg), 3rd Brigade (J. I. Gregg)", "Lt Col Smith", cos="10 cos", keys=W1, division="2nd", brigade="J. I. Gregg")
cav("US.CAV.10NY", "10th New York Cavalry", U, "2nd Division (Gregg), 3rd Brigade (J. I. Gregg)", "Maj Avery", keys=W1, ua="UA-10NY", division="2nd", brigade="J. I. Gregg",
    notes="B.6.15.1 strengths: 303 serviceable and 191 unserviceable horses for 460 men (HistoryNet, Lack of horses)")
cav("US.CAV.4PA", "4th Pennsylvania Cavalry", U, "2nd Division (Gregg), 3rd Brigade (J. I. Gregg)", "Lt Col Doster", keys=W1, division="2nd", brigade="J. I. Gregg")
cav("US.CAV.16PA", "16th Pennsylvania Cavalry", U, "2nd Division (Gregg), 3rd Brigade (J. I. Gregg)", "Lt Col Robison", keys=W1, division="2nd", brigade="J. I. Gregg")
CAV_FORMATIONS.append({"id": "CAVDIV.3", "army": U, "name": "3rd Division, Brig. Gen. Kilpatrick", "tier": "documented", "source_keys": W1})
CAV_FORMATIONS.append({"id": "CAVBDE.3.1", "army": U, "name": "1st Brigade, Brig. Gen. Farnsworth", "parent": "CAVDIV.3", "tier": "documented", "source_keys": W1 + ["Wiki-Farnsworth"],
                       "note": "Farnsworth was given the 1st Brigade, 3rd Division by Pleasonton on June 28, three days before Gettysburg (Wikipedia Farnsworth); brigade about 1,925 men (strengths table)"})
cav("US.CAV.5NY", "5th New York Cavalry", U, "3rd Division (Kilpatrick), 1st Brigade (Farnsworth)", "Maj Hammond", keys=W1, division="3rd", brigade="Farnsworth",
    notes="CAVALRY regiment: a different unit from the 5th New York INFANTRY (Duryee's Zouaves, absent: US.5NY_INF). No Zouave items.", )
cav("US.CAV.18PA", "18th Pennsylvania Cavalry", U, "3rd Division (Kilpatrick), 1st Brigade (Farnsworth)", "Lt Col Brinton", keys=W1, division="3rd", brigade="Farnsworth")
cav("US.CAV.1VT", "1st Vermont Cavalry", U, "3rd Division (Kilpatrick), 1st Brigade (Farnsworth)", "Col Preston", keys=W1, division="3rd", brigade="Farnsworth")
cav("US.CAV.1WV", "1st West Virginia Cavalry (10 cos)", U, "3rd Division (Kilpatrick), 1st Brigade (Farnsworth)", "Col Richmond / Maj Capehart", cos="10 cos", keys=W1, division="3rd", brigade="Farnsworth")
CAV_FORMATIONS.append({"id": "CAVBDE.3.M", "army": U, "name": "Michigan Brigade, Brig. Gen. Custer", "parent": "CAVDIV.3", "tier": "documented", "source_keys": W1 + ["MichInWar"],
                       "note": "Custer received the Michigan Brigade on June 28 (Michigan in the War) with other sources saying June 29 - a minor conflict (B.6.15.1/B.6.15.8)"})
cav("US.CAV.1MICH", "1st Michigan Cavalry", U, "3rd Division (Kilpatrick), Michigan Brigade (Custer)", "Col Town, Lt Col Stagg wounded", keys=W1, ua="UA-MICH-1-7", division="3rd", brigade="Custer",
    notes="Spencer NOT allowed. Arms: gap, inferred Sharps/Burnside/other (B.6.10).")
cav("US.CAV.5MICH", "5th Michigan Cavalry", U, "3rd Division (Kilpatrick), Michigan Brigade (Custer)", "Col Alger; Lt Col Gould wounded; Maj Ferry killed", keys=W1, ua="UA-MICH-SPENCER", division="3rd", brigade="Custer",
    notes="Spencer repeaters on July 3 (East Cavalry Field), all companies; spec allows Spencer from 1863-07-03 (warn window 06-30..07-02).")
cav("US.CAV.6MICH", "6th Michigan Cavalry", U, "3rd Division (Kilpatrick), Michigan Brigade (Custer)", "Col Gray", keys=W1, ua="UA-MICH-SPENCER", division="3rd", brigade="Custer",
    notes="Spencers on two companies / 'part' (PDF wording); first used in the east at Hanover on June 30 (disputed window). The company count is not settled (G18).")
cav("US.CAV.7MICH", "7th Michigan Cavalry (10 cos)", U, "3rd Division (Kilpatrick), Michigan Brigade (Custer)", "Col Mann", cos="10 cos", keys=W1, ua="UA-MICH-1-7", division="3rd", brigade="Custer",
    notes="Spencer NOT allowed. Arms: gap, inferred Sharps/Burnside/other (B.6.10).")

# --- B.6.15.2 Confederate cavalry ----------------------------------------------------------------------------------------------
C = "confederate"
CAV_FORMATIONS.append({"id": "CSCAV.STUART", "army": C, "name": "Stuart (cavalry division commander)", "tier": "documented", "source_keys": W2,
                       "note": "Hampton, F. Lee and Chambliss brigades on the ride. Stuart took three brigades; others operated separately. The brigade labels were garbled in the fetch: groupings are approximate (PDF)"})
GC = "Hampton's Brigade"
for uid, nm, cmd in (("CS.CAV.1NC", "1st North Carolina Cavalry", "Col Baker, wounded; Lt Col Gordon"), ("CS.CAV.1SC", "1st South Carolina Cavalry", "Col Black"), ("CS.CAV.2SC", "2nd South Carolina Cavalry", "Maj Lipscomb"),
                     ("CS.CAV.COBB", "Cobb's (Ga.) Legion", "Col P. M. B. Young; Lt Col Delony wounded"), ("CS.CAV.JDAVIS", "Jeff Davis Legion", "Col Waring; Maj Conner killed"), ("CS.CAV.PHILLIPS", "Phillips (Ga.) Legion", "Lt Col Phillips")):
    cav(uid, nm, C, "Stuart; " + GC, cmd, keys=W2, brigade="Hampton", notes="Baker took command when Hampton was wounded" if uid == "CS.CAV.1NC" else None)
for uid, nm, cmd in (("CS.CAV.1VA", "1st Virginia Cavalry", "Maj Morgan"), ("CS.CAV.2VA", "2nd Virginia Cavalry", "Col Munford"), ("CS.CAV.3VA", "3rd Virginia Cavalry", "Col Owen"), ("CS.CAV.4VA", "4th Virginia Cavalry", "Col Wickham"),
                     ("CS.CAV.5VA", "5th Virginia Cavalry", "Col Rosser"), ("CS.CAV.1MDBN", "1st Maryland Battalion", "Maj Gilmor / Maj R. Brown")):
    cav(uid, nm, C, "Stuart; Fitz Lee's Brigade", cmd, keys=W2, brigade="F. Lee", scope="battalion" if "Bn" in nm or "Battalion" in nm else "regiment",
        notes="appears in the same cluster (grouping approximate)" if uid == "CS.CAV.1MDBN" else None)
for uid, nm, cmd in (("CS.CAV.2NC", "2nd North Carolina Cavalry", "Capt Graham"), ("CS.CAV.9VA", "9th Virginia Cavalry", "Col Beale"), ("CS.CAV.10VA", "10th Virginia Cavalry", "Col Davis, wounded/captured"), ("CS.CAV.13VA", "13th Virginia Cavalry", "Capt Winfield")):
    cav(uid, nm, C, "Stuart; Chambliss' Brigade (in place of W. H. F. \"Rooney\" Lee)", cmd, keys=W2, brigade="Chambliss")
for uid, nm, cmd in (("CS.CAV.14VA", "14th Virginia Cavalry", "Maj Eakle"), ("CS.CAV.16VA", "16th Virginia Cavalry", "Col Ferguson"), ("CS.CAV.17VA", "17th Virginia Cavalry", "Col French"), ("CS.CAV.36VABN", "36th Virginia Battalion", "Capt Smith")):
    cav(uid, nm, C, "Jenkins' Brigade", cmd, keys=W2, brigade="Jenkins", scope="battalion" if "BN" in uid else "regiment", notes="Jenkins wounded July 2; Col Milton Ferguson commanded July 3" if uid == "CS.CAV.14VA" else None)
CAV_CARDS["CS.34VACAVBN"] = {"id": "CS.34VACAVBN", "name": "34th Virginia Battalion (Lt Col Witcher)", "army": C, "parent": "Jenkins' Brigade", "commander_printed": "Lt Col Witcher", "source_keys": W2 + ["AR-Guns"], "tier_printed": "documented",
                              "weapon_assignment_ids": ["UA-34VA"], "note": "unit record lives in kit_src_confed (CS.34VACAVBN); listed here for the order of battle", "tier": "documented", "weak_source": True}
CAV_FORMATIONS.append({"id": "CSCAV.JENKINS_BTY", "army": C, "name": "Jackson's Battery (with Jenkins' Brigade)", "tier": "documented", "source_keys": W2, "note": "battery: see artillery cards (not carded: gun data not given)"})
for uid, nm, cmd, g in (("CS.CAV.6VA", "6th Virginia Cavalry", "Maj Flournoy", "Jones' Laurel Brigade"), ("CS.CAV.7VA", "7th Virginia Cavalry", "Lt Col Marshall", "Jones' Laurel Brigade"), ("CS.CAV.11VA", "11th Virginia Cavalry", "Col Lomax", "Jones' Laurel Brigade"),
                         ("CS.CAV.4NC", "4th North Carolina Cavalry", "Col Ferebee", "Robertson's Brigade (command on the field not confirmed)"), ("CS.CAV.5NC", "5th North Carolina Cavalry", None, "Robertson's Brigade (command on the field not confirmed)")):
    cav(uid, nm, C, "Jones' / Robertson's brigades; " + g, cmd or "commander not printed", keys=W2 + ["Wiki-Fairfield"], brigade="Jones/Robertson",
        notes="Who commanded Robertson's brigade on the field is not confirmed; Jones' Laurel Brigade at Fairfield = 6th, 7th, 11th Va + Chew's Bty, with the 12th Va guarding a Potomac ford (Wikipedia Fairfield)" if uid == "CS.CAV.6VA" else None)
cav("CS.CAV.12VA", "12th Virginia Cavalry", C, "Jones' Laurel Brigade (guarding a Potomac ford at Fairfield time)", "commander not printed", keys=["Wiki-Fairfield"], brigade="Jones", notes="guarding a Potomac ford (Wikipedia Fairfield); named in the Fairfield row, not in the order-of-battle row")
cav("CS.CAV.18VA", "18th Virginia Cavalry (Imboden)", C, "Imboden", "Col G. W. Imboden", keys=W2, brigade="Imboden", notes="Led the wagon train on the retreat")
cav("CS.CAV.62VA", "62nd Virginia Mounted Infantry", C, "Imboden", "Col Smith", keys=W2, brigade="Imboden", branch="cavalry", notes="mounted infantry; led the wagon train on the retreat (Imboden)")
cav("CS.CAV.MCNEILL", "McNeill's Partisan Rangers", C, "Imboden", "commander not printed", keys=W2, brigade="Imboden", scope="battalion", notes="Led the wagon train on the retreat (Imboden)")
cav("CS.CAV.35VABN", "35th Virginia Battalion (White's \"Comanches\")", C, "Detached with Early's infantry", "Lt Col Elijah White", keys=W2 + ["Wiki-Fairfield"], scope="battalion",
    notes="Detached with Early's infantry; not at Fairfield (Wikipedia Fairfield). Not with the main cavalry (B.6.15.7).")
CAV_FORMATIONS.append({"id": "CSCAV.IMBODEN_BTY", "army": C, "name": "Staunton Battery (McClanahan), with Imboden", "tier": "documented", "source_keys": W2})
CAV_FORMATIONS.append({"id": "CSCAV.STUART_HA", "army": C, "name": "Horse artillery: Breathed, Chew, Griffin (Md.), Hart (SC), McGregor, Moorman (Maj Beckham)", "tier": "documented", "source_keys": W2, "note": "see artillery cards (CS.ART.*)"})

# Strengths table (B.6.15.1)
STRENGTHS = [
    {"item": "Buford, July 1", "value": "about 2,748 troopers vs about 7,600 Confederate infantry (Wikipedia Day 1); \"about 3,000\" covering about 7 miles of front (ABT)", "values": {"troopers": [2748, 3000], "confederate_infantry": 7600, "front_miles": 7}, "source_keys": ["Wiki-Day1", "ABT-MountCavalry"]},
    {"item": "East Cavalry Field", "value": "Union about 3,250; Confederate about 5,000 nominal but about 3,430 and 13 guns engaged", "values": {"union": 3250, "confederate_nominal": 5000, "confederate_engaged": 3430, "guns": 13}, "source_keys": ["Wiki-Day3Cav"]},
    {"item": "Farnsworth's brigade", "value": "about 1,925 men", "values": {"men": 1925}, "source_keys": ["Wiki-Day3Cav"]},
    {"item": "6th US Cavalry", "value": "authorized 1,063; about 1,072 assigned June 5 but only about 500 serviceable horses; about 546 men dismounted at Dumfries; entered Fairfield with about 500 mounted (Wikipedia Fairfield says about 400: conflict); only 17 officers present",
     "values": {"authorized": 1063, "assigned_june5": 1072, "serviceable_horses": 500, "dismounted_dumfries": 546, "fairfield_mounted": [400, 500], "officers": 17}, "source_keys": ["RegCav-6thUS", "Wiki-Fairfield"], "conflict": "Fairfield mounted strength 400 vs 500 (range 400-500)"},
    {"item": "10th New York", "value": "303 serviceable and 191 unserviceable horses for 460 men; one 8th NY company 56 men with 43 horses", "values": {"serviceable": 303, "unserviceable": 191, "men": 460, "8th_ny_company": {"men": 56, "horses": 43}}, "source_keys": ["HistoryNet-LackHorses"]},
    {"item": "Stuart's command", "value": "about 12,000 at the June 8 review", "values": {"men": 12000}, "source_keys": ["ABT-MountCavalry"]},
]
STRENGTHS_NOTE = "Per-regiment present-for-duty strengths and Confederate regimental strengths were not found. Mounted strength was well below paper strength on both sides (inferred). Not found: Confederate regimental strengths, horse artillery gun counts for most batteries, Jenkins' movements June 26-July 2."
for s in STRENGTHS:
    s["tier"], s["weak_source"], _ = eff_tier("documented", s["source_keys"])

CARBINE_FACTS = {
    "printed": "Buford's July 1 screen carried a mix: Sharps (most common; .52 or .54 linen cartridge), Burnside (.54 tapered brass), Gallager (.52 brass, hard to extract), Smith (.50 rubber cartridge, well regarded), Merrill (.54 paper, fragile and unpopular) and Sharps & Hankins (.52 rimfire; three companies of the 9th NY). The cartridges were not interchangeable. The belief that Buford's troopers had Spencers on July 1 is folklore (Civil War News, Bilby, \"Carbine Folklore\").",
    "other": "Other carbine facts: Sharps was the most common Union cavalry arm by 1863 (about 90,000 carbines; .52, 475 gr, 50 gr powder; 8-10 rounds/min); Burnside .54 with a 21 in barrel, 7 lb, 43 Union cavalry regiments in 1863-64; Spencer rifle 47 in overall (30 in barrel) with 7-round tube, .56-56. The Spencer carbine was not produced until October 1863 (AR, Civil War News), which seems to conflict with Spencer use on July 3: inferred explanation is rifle versus carbine models, to be verified. Henry rifles are not documented at Gettysburg. Shortages of Sharps carbines were noted (Ripley letter of June 2). Specifications for Gallager, Smith, Merrill, Starr, Joslyn, Maynard and Sharps & Hankins were not retrieved.",
    "source_keys": ["CWNews-Carbine", "AR-Guns"], "folklore": "Spencers on Buford's line July 1 = folklore", "ripley_letter_june2": "shortages of Sharps carbines noted",
}
HORSES = [
    {"fact": "Remounts", "detail": "About 17,000 remounts to the Union Cavalry Corps May-July 1863; horses under 6 years accepted from June 1 and many broke down; hard pikes wore out shoes quickly; bad contractor saddles ruined backs", "source_keys": ["HistoryNet-LackHorses"]},
    {"fact": "Losses", "detail": "Pleasonton lost about 1,000 horses at Brandy Station (estimate)", "source_keys": ["HistoryNet-LackHorses"]},
    {"fact": "Serviceability", "detail": "10th NY 303 serviceable and 191 unserviceable for 460 men; 6th US about 500 serviceable of about 1,072 assigned; an 8th NY company 56 men with 43 horses", "source_keys": ["HistoryNet-LackHorses", "RegCav-6thUS"]},
    {"fact": "Famous mounts", "detail": "Buford \"Grey Eagle\" (old, white); Custer lost two horses on July 3 (second in the 1st Michigan melee; the first at the Rummel fence, replaced by a bugler's horse) and had another shot at Hunterstown; Stuart's horses exhausted", "source_keys": ["Wiki-Buford", "Wiki-Day3Cav", "Wiki-Hunterstown", "Wiki-Stuart"]},
    {"fact": "Confederate", "detail": "Exhausted horses; Dover capture of more than 1,000 horses", "source_keys": ["Wiki-Hanover"]},
    {"fact": "Gaps", "detail": "Horse colours and types; Traveller is not cavalry; Old Baldy is a Meade horse, not cavalry", "source_keys": []},
]
for h in HORSES:
    h["tier"], h["weak_source"], _ = eff_tier("documented", h["source_keys"]) if h["source_keys"] else ("gap", None, None)
HORSE_RULE = "Animation rule (inferred): horse condition is a per-regiment variable. Union regiments appear with gaunt, dusty or sweat-darkened mounts and a visible share unserviceable; units with a documented shortfall (6th US, 10th NY, 8th NY company) field fewer mounted men than paper strength."
CAV_STATES = [
    ("march_column", "Approach marches, Stuart's ride, retreat, Kilpatrick's night march"), ("vedette / picket", "Buford's June 30 pickets; July 1 vedettes before Heth"),
    ("reconnaissance / patrol", "Buford June 30 patrols; observation from the Seminary cupola"), ("dismount_deploy", "Dismounted skirmish line with horse holders (every fourth man)"),
    ("dismounted_skirmish_fire", "McPherson Ridge, Brinkerhoff Ridge, Rummel farm, South Cavalry Field"), ("fighting_withdrawal", "Buford July 1"), ("horse_holding", "One-in-four horse holders behind the line"),
    ("mounted_charge_column / line", "Hunterstown, East Cavalry Field, Fairfield, Falling Waters, Monterey Pass"), ("melee_saber_revolver", "Hand-to-hand at Rummel farm"), ("remount_retreat", "Return to horses and withdrawal"),
    ("horse_artillery_duel", "Tidball's batteries, Rank's guns, Stuart's 13 guns"), ("guard_trains / escort", "Buford and Merritt guarding trains; Baker and Imboden with the wagons"),
    ("pursuit / rear-guard", "Hampton at Hunterstown; Jones at Williamsport; Kilpatrick"), ("wagon_train_attack", "Monterey Pass, Williamsport"), ("rest_bivouac / night_watch", "Nights between actions"),
    ("casualties / horse_down / wounded_carried", "Horses shot, riders down, wounded to the rear"), ("absent (not yet arrived / departed)", "Hard rule: no unit is shown before its arrival or after it leaves"),
]
STATES_FACTS = ("Fixed facts for the arrival rule: the Michigan Brigade and Farnsworth's brigade fought at Hanover June 30 and Hunterstown July 2, then moved to East Cavalry Field and South Cavalry Field on July 3; the 2nd Brigade of Gregg's division (Huey) was at Westminster and never at Gettysburg; "
                "the 35th Va Bn was with Early's infantry, not with the main cavalry; Stuart's three brigades reached the field after the first day.")
CAV_CONFLICTS = [
    ("Stuart's arrival at Lee", "Noon-1 p.m. (one Wikipedia fetch, Hampton about an hour later); mid-afternoon (ABT); afternoon (Wikipedia Stuart; his report \"just in time\"); evening (the brief)", "Carry as a range; inferred best reading: early-to-mid afternoon July 2 with Hampton trailing"),
    ("East Cavalry Field start and climax", "About 11 a.m. Stuart on Cress Ridge, fighting about 1 p.m. (Wikipedia); just before noon, Hampton's charge about 3 p.m. (HistoryNet); about 2 p.m. Custer relieved, about 3 p.m. reserves charged (Stone Sentinels)", "Range: skirmish and artillery 11 a.m.-1 p.m.; climax 1-3 p.m."),
    ("South Cavalry Field", "About 1:00 p.m. Farnsworth in position, about 3 p.m. Merritt (Wikipedia); attack about 5 p.m. and repulsed in 15 minutes (HistoryNet)", "Range 3-5 p.m. for the charges"),
    ("Buford July 2 movements", "Taneytown (Buford's report) then Westminster July 3; Westminster July 2 (HistoryNet); Emmitsburg (Wikipedia Buford)", "Carry three places; check OR"),
    ("Williamsport date", "July 6 (Buford's report; Stone Sentinels); \"by July 7\" (Wikipedia); July 7 (Civil War News)", "Range July 6-7"),
    ("Wagon train length", "17 vs 30 miles (Civil War News, ABT); about 40 miles (Monterey Pass summary)", "Range 17-40 miles"),
    ("Fairfield", "Union strength about 500 mounted vs about 400", "Range 400-500"),
    ("Hampton wounded at Hunterstown", "Civil War News yes; Hampton's report records only July 3 wounds; Wikipedia Hunterstown does not mention it", "Uncertain; show only July 3 wounds as documented"),
    ("Custer's command date", "June 28 vs June 29", "Range"),
    ("Spencer production", "Carbine production began October 1863 (AR, Civil War News) vs use by the 5th Michigan on July 3", "Rifle/carbine model question; verify"),
    ("Monterey Pass wagon count", "About 250 (estimates 40-500)", "Range"),
    ("Falling Waters outcome", "Michigan site's 125 killed, 1,500 prisoners, 3 flags unsupported elsewhere", "Treat with caution"),
]
CAV_GAPS = [
    ("Official reports of Pleasonton, Gregg, Custer (and Buford, Kilpatrick, Merritt, Farnsworth's successors)", "OR vol. 27, parts 1 and 2 (cavalry reports)"),
    ("Michigan Brigade regimental detail, 1st and 7th Michigan arms, Spencer purchase mechanism", "Kidd, Personal Recollections; \"Michigan at Gettysburg\" (Michigan Monument Commission); Michigan regimental rolls"),
    ("Regimental present-for-duty strengths; Confederate cavalry strengths and casualties by brigade", "OR returns; Busey and Martin (strengths and losses); Coddington"),
    ("Buford's June 29 route and exact June 30 vedette positions; Merritt July 1-2 locations; Jenkins' movements June 26-July 2; Pennington's role at Hunterstown; Hunterstown charge times; Early's cavalry on June 26", "OR; Stone Sentinels cavalry pages; Hunterstown battlefield research"),
    ("The \"Wofford\" claim: the brief names Wofford as a South Cavalry Field defender, but no fetched source names him; the defenders were Law's infantry (Hood's division)", "OR reports of Law, Anderson, Oates; Longstreet's and Hood's divisions; the claim stays unsupported"),
    ("Union and Confederate cavalry hat/kepi regulations, boots, guidon patterns, horse colours, bugle calls; Confederate cavalry arms specifics; Confederate cavalry visual references", "Period photographs and sketches (Waud), regulations, regimental flags; Michigan and Virginia regimental collections"),
    ("Gallager, Smith, Merrill, Starr, Joslyn, Maynard and Sharps & Hankins specs", "Ordnance Department catalogues; collector references"),
    ("Pre-1863 cavalry carbine returns per regiment", "NARA RG 156; OR ordnance returns"),
    ("Dust, noise and heat on the days of the cavalry fights", "Soldier diaries, regimental histories, weather record in B.10"),
]

# --- Units named only in the B.6.10 gap row / table (no B.6.3/B.6.5 entry) ---------------------------------------------------
O("OPEN-GAPROW-UNITS", "Units named only in the B.6.10 weapon table (14th Brooklyn/84th NY, 125th NY, 26th NC): corps/division/dress not in B.6", ["G1", "G2"], [])
unit("US.84NY", "84th New York Infantry (14th Brooklyn)", "union", hierarchy_printed="not given in B.6 (named only in the B.6.10 'not found' row)", group="weapon_table_only", inherits="default.union.infantry",
     opens=["OPEN-GAPROW-UNITS"], weapon_assignment_ids=["UA-GAP-3"], parse_status="partial",
     printed={"documented": "B.6.10: 'not found; for the Union three, .58 Springfield/Enfield-pattern is inferred only'", "open": "everything", "default": "default Union infantry", "tier": "gap"},
     fields={"weapon": F([A("m1861_springfield", "some"), A("p1853_enfield", "some")], "plausible-procedural", [], printed_raw="not found; .58 Springfield/Enfield-pattern inferred only", basis_tier="inferred", assignment_id="UA-GAP-3", flagged=True)},
     notes="Zouave-style dress of the 14th Brooklyn is NOT claimed: B.6 gives no dress for it (memory only; not recorded).")
unit("US.125NY", "125th New York Infantry", "union", hierarchy_printed="not given in B.6 (named only in the B.6.10 table)", group="weapon_table_only", inherits="default.union.infantry",
     opens=["OPEN-GAPROW-UNITS"], weapon_assignment_ids=["UA-125NY"], parse_status="partial",
     printed={"documented": "B.6.10: Col. Willard a smoothbore advocate; arm not stated (gap)", "open": "arm; dress", "default": "default Union infantry draw", "tier": "gap"},
     notes="Arm not stated: default Union draw (plausible-procedural) applies; the colonel's smoothbore advocacy is recorded, not turned into an assignment.")
unit("CS.26NC", "26th North Carolina Infantry", "confederate", hierarchy_printed="not given in B.6 (named only in the B.6.10 'not found' row)", group="weapon_table_only", inherits="default.confederate.infantry",
     opens=["OPEN-GAPROW-UNITS"], weapon_assignment_ids=["UA-GAP-CS"], parse_status="partial", state="NC",
     printed={"documented": "B.6.10 'not found' row: 26th NC", "open": "arm; dress", "default": "default Confederate infantry", "tier": "gap"})
