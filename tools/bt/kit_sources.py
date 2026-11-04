"""Source-key table for the kit data (PDF B.6 'Sources for this section', B.6.14 and B.6.15 source names).

Source CLASS is assigned here by the kit build (task agent), NOT by the PDF, so the owner can review or override it in
one place (CLASS_OVERRIDE / classify). Rule (CLAUDE.md Law cl.4 + the task brief): a field is 'documented' only if a
non-weak source key is cited for it AND the PDF itself does not mark the support weak.
Weak classes: wikipedia, forum, blog, auction, wiki_other.
claim_support_verified is False for every key: no agent has re-read the cited pages for this task.
"""
from kit_sources_pdf import PDF_SOURCE_LIST

WEAK_CLASSES = {"wikipedia", "forum", "blog", "auction", "wiki_other"}

CLASS_OVERRIDE = {
    "3rdUS": "reenactor", "CivilWarNews-Badges": "periodical", "AHC-Sidebar": "institutional",
    "NPS-Accout": "institutional", "Goodreads": "blog", "BGE-Dispatch": "society_newsletter",
    "WisVets": "museum", "HistoryNet-Killers": "magazine", "HistoryNet-Zouave": "magazine",
    "GburgDaily-Irish": "blog", "GburgDaily-6904": "blog", "GburgDaily-2USS": "blog",
    "GburgExp-Berdan": "blog", "GburgExp-Meade": "blog",
    "RockIsland-42PA": "auction", "CivMed-Insignia": "institutional", "9thVA": "researcher_site",
    "ABT-Myths": "institutional", "ABT-SmallArms": "institutional", "NPS-Blackford": "primary_report",
    "TSL-1stTexas": "institutional", "NC-UnderBothFlags": "institutional", "FOTW": "reference_site",
    "CSA-Regs": "primary_regulations", "MHN": "blog", "AR-Sharpshooting": "periodical",
    "SI-Berdan": "museum", "AHC-USSS-Bib": "institutional", "WeAreMighty": "blog", "Prologue": "blog",
    "Lee-Letters": "primary_transcription", "AR-Guns": "periodical", "CWNews-Smooth": "periodical",
    "Barry": "forum", "CWNews-Carbine": "periodical", "IMFDB": "wiki_other", "28thmass": "society_site",
    "SBIR-Weapons": "blog", "StoneSentinels-Gregg": "secondary_site", "CVBT-Load": "unclassified_site",
    "Colby": "institutional", "NPS-UnionCommanders": "institutional",
}


def classify(key):
    if key in CLASS_OVERRIDE:
        return CLASS_OVERRIDE[key]
    if key.startswith("Wiki-"):
        return "wikipedia"
    if key.startswith(("CWTalk-", "AuthCamp-")):
        return "forum"
    return "unclassified_site"


# B.6.14 / B.6.15 print source NAMES (no bracket keys). Keys are minted by the kit build; label = printed name.
EXTRA_SOURCES = [
    ("Wiki-FieldArtACW", "Wikipedia, Field artillery in the American Civil War", "wikipedia"),
    ("Wiki-Napoleon", "Wikipedia, M1857 12-pounder Napoleon", "wikipedia"),
    ("Wiki-3inRifle", "Wikipedia, 3-inch ordnance rifle", "wikipedia"),
    ("Wiki-10pdrParrott", "Wikipedia, 10-pounder Parrott rifle", "wikipedia"),
    ("CWTalk-Whitworths", "CivilWarTalk, Whitworths at Gettysburg", "forum"),
    ("StrategyPage-Guns", "StrategyPage, guns at Gettysburg", "unclassified_site"),
    ("HistoryNet-Thunder", "HistoryNet, Explore the Thunder at Gettysburg", "magazine"),
    ("SS-ArtReserve", "Stone Sentinels, Artillery Reserve", "secondary_site"),
    ("SS-Hazlett-10491", "Stone Sentinels, Hazlett (p=10491)", "secondary_site"),
    ("SS-Hazlett-8009", "Stone Sentinels, Hazlett battery (p=8009)", "secondary_site"),
    ("SS-Calef-7820", "Stone Sentinels, Calef (p=7820)", "secondary_site"),
    ("SS-Cushing-7888", "Stone Sentinels, Cushing (p=7888)", "secondary_site"),
    ("SS-NYArt-1958", "Stone Sentinels, NY artillery (p=1958)", "secondary_site"),
    ("SS-ConfArt-96", "Stone Sentinels, Confederate artillery (p=96)", "secondary_site"),
    ("NPS-FortScott", "NPS Fort Scott artillery drill", "institutional"),
    ("CVBT-ArtKing", "CVBT, Artillery: the king of battle, part II", "unclassified_site"),
    ("RegCav-HorseArt", "Regular Cavalry in the Civil War, Horse artillery part II", "blog"),
    ("CWTalk-BatteryTOE", "CivilWarTalk, Artillery battery TO&E", "forum"),
    ("CWEast-9thMass", "Civil War in the East, 9th Massachusetts Battery", "blog"),
    ("13NYBty-Wheeler", "13th NY Battery, Wheeler at Gettysburg", "unclassified_site"),
    ("WHN-Cushing", "Warfare History Network, Lt. Alonzo Cushing", "magazine"),
    ("CWNews-ArtFuze", "Civil War News, The Artillery Fuze", "periodical"),
    ("HistoryIsNow-Pickett", "History Is Now Magazine, Pickett's Charge", "blog"),
    ("ABT-ArtPlacements", "American Battlefield Trust, Artillery placements July 3", "institutional"),
    ("CWNews-2025-Devil", "Civil War News 2025, The work of the very devil himself", "periodical"),
    ("IronBrigader-Hazard", "Iron Brigader, Hazard report", "blog"),
    ("ECW-Benner", "Emerging Civil War, Benner's Hill", "blog"),
    ("ECW-Hunt", "Emerging Civil War, Henry J. Hunt", "blog"),
    ("NPS-Handbook9", "NPS Handbook 9", "institutional"),
    ("CWTalk-HuntReport", "CivilWarTalk, quoting Hunt's report", "forum"),
    ("NPS-AlexanderRpt", "Alexander's report (NPS)", "primary_report"),
    ("NPS-CabellRpt", "Cabell's report (NPS)", "primary_report"),
    ("NPS-CarterRpt", "Carter's report (NPS)", "primary_report"),
    ("Wiki-15NYBty", "Wikipedia, 15th New York Battery", "wikipedia"),
    ("Wiki-McGilvery", "Wikipedia, Freeman McGilvery", "wikipedia"),
    ("GburgDaily-Smith4NY", "Gettysburg Daily, Smith's 4th NY", "blog"),
    ("CWEast-5USD", "Civil War in the East, 5th US Battery D", "blog"),
    ("CWTalk-Calef", "CivilWarTalk, Calef thread", "forum"),
    ("CWTalk-UnionArt", "CivilWarTalk, Union artillery", "forum"),
    ("Wiki-PickettCharge", "Wikipedia, Pickett's Charge", "wikipedia"),
    ("Wiki-UnionArmy", "Wikipedia, Union Army", "wikipedia"),
    ("NapoleonGuide", "Napoleon Guide, Artillery ammunition", "unclassified_site"),
    ("Wiki-NapoleonTW", "Wikipedia, Napoleon: Total War", "wikipedia"),
    ("TWModWiki", "TW Modding Wiki, Missiles and You", "wiki_other"),
    ("TWC-ModdingArt", "TWC, Modding artillery", "forum"),
    ("TWC-GameSpy", "TWC, GameSpy preview thread", "forum"),
    ("TWC-ArtShot", "TWC, Artillery shot", "forum"),
    ("SS-2ndDivCav", "Stone Sentinels, 2nd Division Cavalry Corps", "secondary_site"),
    ("MichInWar", "Michigan in the War, Michigan Brigade", "published_book"),
    ("Wiki-Farnsworth", "Wikipedia, Elon J. Farnsworth", "wikipedia"),
    ("Wiki-Day1", "Wikipedia, Battle of Gettysburg, first day", "wikipedia"),
    ("ABT-MountCavalry", "ABT, Mount: cavalry operations in the Gettysburg campaign", "institutional"),
    ("Wiki-Day3Cav", "Wikipedia, Battle of Gettysburg, third day cavalry battles", "wikipedia"),
    ("RegCav-6thUS", "Regular Cavalry in the Civil War, 6th Cavalry on the eve of the campaign", "blog"),
    ("Wiki-Fairfield", "Wikipedia, Battle of Fairfield", "wikipedia"),
    ("HistoryNet-LackHorses", "HistoryNet, Lack of horses", "magazine"),
    ("HistoryNet-Cavalry", "HistoryNet, Cavalry at the Battle of Gettysburg", "magazine"),
    ("Wiki-Stuart", "Wikipedia, J. E. B. Stuart", "wikipedia"),
    ("NPS-StuartRpt", "Stuart's report (NPS)", "primary_report"),
    ("NPS-HamptonRpt", "Hampton's report (NPS)", "primary_report"),
    ("Wiki-Hanover", "Wikipedia, Battle of Hanover", "wikipedia"),
    ("IronBrigader-BufordRpt", "Buford's report excerpt (Iron Brigader)", "primary_via_blog"),
    ("Wiki-Hunterstown", "Wikipedia, Battle of Hunterstown", "wikipedia"),
    ("StonewallBdeSite", "Stonewall Brigade site, Gettysburg part two", "unclassified_site"),
    ("CWNews-StuartShields", "Civil War News, Stuart shields retreat from Gettysburg", "periodical"),
    ("Wiki-MichBde", "Wikipedia, Michigan Brigade", "wikipedia"),
    ("Wiki-MontereyPass", "Wikipedia, Battle of Monterey Pass", "wikipedia"),
    ("SS-Williamsport", "Stone Sentinels, Williamsport Wagoners' Fight", "secondary_site"),
    ("Wiki-Boonsboro", "Wikipedia, Battle of Boonsboro", "wikipedia"),
    ("ABT-FallingWaters", "ABT, Falling Waters map", "institutional"),
    ("ECW-Weber", "Emerging Civil War, Death of Peter Weber", "blog"),
    ("Wiki-Gregg", "Wikipedia, David McMurtrie Gregg", "wikipedia"),
    ("MaineCav-Standards", "Maine Cavalry reenactor standards", "reenactor"),
    ("Wiki-Kilpatrick", "Wikipedia, Judson Kilpatrick", "wikipedia"),
    # Printed period manuals acquired after the PDF was written (docs/battle-theatre/drill/, GOVERNANCE/library/acquired.json).
    # Class: primary_manual (non-weak).  OCR is raw archive.org djvu text; the drill checker verifies each cited phrase against it.
    ("GIBBON-1860", "Gibbon, The Artillerist's Manual, Van Nostrand 1860 (library: GIBBON-1860)", "primary_manual"),
    ("FIELDART-1863", "Instruction for Field Artillery (French, Barry, Hunt), 1863 printing of the 1860 text (library: FIELDART-1863)", "primary_manual"),
    ("ORDNANCE-1861", "The Ordnance Manual for the use of the officers of the United States Army, Richmond 1861 (library: ORDNANCE-1861)", "primary_manual"),
    ("CASEY-1862", "Casey, Infantry Tactics (1862) (library: Casey vols 1-2)", "primary_manual"),
]


def build_source_table():
    """Return {key: {label, url, class, weak, claim_support_verified, origin}}."""
    t = {}
    for key, label, url in PDF_SOURCE_LIST:
        cls = classify(key)
        t[key] = {"label": label or None, "url": url, "class": cls, "weak": cls in WEAK_CLASSES,
                  "origin": "PDF B.6 'Sources for this section' (p.77-78)",
                  "claim_support_verified": False}
    for key, label, cls in EXTRA_SOURCES:
        t[key] = {"label": label, "url": None, "class": cls, "weak": cls in WEAK_CLASSES,
                  "origin": "PDF B.6.14/B.6.15 source NAME (key minted by kit build; PDF prints no URL or key)",
                  "claim_support_verified": False}
    return t


SOURCES = build_source_table()


def has_nonweak(keys):
    return any(not SOURCES[k]["weak"] for k in keys)


def eff_tier(printed, keys, printed_weak=False):
    """Effective tier under CLAUDE.md Law cl.4.
    printed: tier word as printed in the PDF.  Returns (tier, weak_source, note)."""
    keys = list(keys)
    for k in keys:
        if k not in SOURCES:
            raise KeyError("unknown source key %r" % k)
    if printed == "documented":
        if keys and has_nonweak(keys) and not printed_weak:
            return "documented", False, None
        why = ("the PDF itself marks the support weak" if printed_weak else
               "no source key is cited" if not keys else
               "only wikipedia/forum/blog/auction keys are cited")
        return "inferred", True, "printed 'documented'; effective tier inferred because " + why
    weak = bool(keys) and (all(SOURCES[k]["weak"] for k in keys) or printed_weak)
    return printed, weak, None
