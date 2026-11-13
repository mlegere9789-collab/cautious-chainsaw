"""Small arms dictionary (PDF B.6.9), unit-to-weapon table (B.6.10), ammunition and drill (B.6.11).
Spec text is the PDF cell text, wrapped lines joined; nothing is paraphrased in 'printed' fields.

Tier rule (the project Law cl.4): B.6.9 prints a source list per ROW but no tier per row and no claim-to-source map. A row is
'documented' only if at least one cited key is non-weak (kit_sources.SOURCES); a Wikipedia/forum/blog/auction-only row is
'inferred' with weak_source true.  A row with no specs at all is an OPEN GAP (tier 'gap', gap_ids) and gets no tier, as
the PDF requires (B.6.14 intro: GAP rows are listed as open gaps and are not given a tier)."""
from kit_sources import eff_tier, SOURCES

WEAPONS = {}
ASSIGNMENTS = {}


def W(wid, label, category, army, *, printed=None, specs=None, conflicts=None, notes=None, keys=(), gap_ids=(), spec_gaps=(),
      barred=False, barred_reason=None, valid_from=None, valid_to=None, allowed_units=None, not_assignable=False,
      printed_tier="documented", branch_use=None, placeholder=False, **kw):
    assert wid not in WEAPONS, wid
    keys = list(keys)
    d = {"id": wid, "label": label, "category": category, "army": army, "printed": printed, "specs": specs or {},
         "conflicts": conflicts or [], "notes": notes, "spec_gaps": list(spec_gaps), "gap_ids": list(gap_ids),
         "source_keys": keys, "barred": barred, "placeholder": placeholder, "not_assignable": not_assignable,
         "valid_from": valid_from, "valid_to": valid_to}
    if keys and printed_tier:
        t, weak, why = eff_tier(printed_tier, keys)
        d.update({"tier_printed": "row source list only (no tier printed in B.6.9)", "tier": t, "weak_source": weak,
                  "tier_basis": "row-level source list; claim-to-source map not printed; claim_support_verified false"})
        if why:
            d["tier_note"] = why
    else:
        d.update({"tier_printed": None, "tier": "gap" if not placeholder else "plausible-procedural", "weak_source": None,
                  "tier_basis": "no specs retrieved (PDF: Gap)" if not placeholder else "placeholder id so a unit row can name an arm the PDF names without a pattern"})
    if barred:
        d["barred_reason"] = barred_reason
    if allowed_units is not None:
        d["allowed_units"] = allowed_units
    if branch_use:
        d["branch_use"] = branch_use
    d.update(kw)
    WEAPONS[wid] = d
    return d


# ---------------------------------------------------------------------------------------------------------------
# Infantry long arms
W("m1861_springfield", "Springfield M1861 rifle-musket", "long_arm", "either",
  printed=".58; barrel 40 in (the American Rifleman text says 41; the v1 notes say about 40-41); overall 56 in; about 9 lb; percussion; leaf sight (300/500 yd leaves, 100 yd baseline); about 1,000,000 made including contractors; Springfield Armory 265,129 from Jan 1861 to Dec 1863; muzzle velocity 1,000-1,400 ft/s; effective range 200-400 yd, marksmen to about 500 yd; max 800-1,000 yd (v1); 2-3 rounds a minute",
  specs={"caliber_in": 0.58, "barrel_in": {"catalogued": 40, "range_note": [40, 41]}, "overall_in": 56, "weight_lb": 9.0, "ignition": "percussion",
         "sight": "leaf (300/500 yd leaves, 100 yd baseline)", "made_approx": 1000000, "springfield_armory_made": {"count": 265129, "from": "1861-01", "to": "1863-12"},
         "muzzle_velocity_ft_s": [1000, 1400], "effective_range_yd": [200, 400], "marksman_range_yd_to": 500, "max_range_yd": [800, 1000], "rate_rounds_per_min": [2, 3]},
  conflicts=[{"id": "CONF-M1861-BARREL", "topic": "M1861 barrel length", "positions": [{"value_in": 40, "source": "Wikipedia spec table"}, {"value_in": 41, "source": "American Rifleman text"}],
              "pdf_handling": "The product uses 40 in as the catalogued value and records 41 as a range note.", "status": "carried (G21)"}],
  notes="Contractor M1861s (Colt Special, Trenton etc.) are the same pattern; the Colt Special accepts only the Collins bayonet", keys=["Wiki-M1861", "AR-Guns"])
W("m1863_rifle_musket", "Springfield M1863", "long_arm", "union", printed="Follow-on with Colt-influenced changes (bands, hammer, bolster). Not in field issue at Gettysburg: the Irish Brigade is documented as receiving it only in spring 1864 (inferred). Never assign it",
  notes="PDF: never assign.  Barred by the anachronism list (B.6.12 item 2).", keys=["Wiki-M1861", "28thmass"], barred=True,
  barred_reason="Not in field issue at Gettysburg (PDF B.6.9); anachronism list B.6.12 item 2", not_assignable=True, printed_tier="inferred")
W("m1855_springfield", "Springfield M1855 rifle-musket", "long_arm", "either",
  printed=".58; 40 in barrel; 9.25 lb; Maynard tape primer (1859-60 tests: half of primers misfired; dropped in 1861); about 75,000 made 1856-60 (Springfield, Harpers Ferry, Whitney). Standard until the M1861",
  specs={"caliber_in": 0.58, "barrel_in": 40, "weight_lb": 9.25, "ignition": "Maynard tape primer (dropped in 1861)", "made_approx": 75000, "made_years": "1856-60", "makers": ["Springfield", "Harpers Ferry", "Whitney"],
         "primer_note": "1859-60 tests: half of primers misfired"}, keys=["Wiki-M1855"])
W("harpers_ferry_rifle_m1855", "Harpers Ferry rifle (M1855 rifle)", "long_arm", "either",
  printed="33 in barrel, 49 in overall. Confederates captured the machinery, later used at Richmond and Fayetteville", specs={"barrel_in": 33, "overall_in": 49},
  notes="Confederates captured the machinery, later used at Richmond and Fayetteville", keys=["Wiki-M1855"])
W("m1841_mississippi", "M1841 \"Mississippi\" rifle", "long_arm", "either",
  printed="Originally .54, rebored to .58 in 1855 (many); leaf sights 100/300/500 yd (some ladders to 1,100 yd); about 70,000 made 1846-55 (Harpers Ferry, Whitney, Remington, Robbins Kendall & Lawrence); originally no bayonet, modified in 1855 for a sword bayonet. Some Union troops kept them to 1863 (the 45th NY used them past Gettysburg); Confederate cavalry and sharpshooters used them to war's end",
  specs={"caliber_in": {"original": 0.54, "rebored": 0.58, "rebored_year": 1855, "note": "many"}, "sights": "leaf 100/300/500 yd (some ladders to 1,100 yd)", "made_approx": 70000, "made_years": "1846-55",
         "makers": ["Harpers Ferry", "Whitney", "Remington", "Robbins Kendall & Lawrence"], "bayonet": "originally none; modified in 1855 for a sword bayonet"},
  notes="Some Union troops kept them to 1863 (the 45th NY used them past Gettysburg); Confederate cavalry and sharpshooters used them to war's end", keys=["Wiki-M1841"])
W("m1842_smoothbore", "M1842 smoothbore musket", "long_arm", "either",
  printed=".69; 42 in barrel; 58 in overall; about 9.8 lb; percussion (earlier flintlocks mostly converted); about 275,000 made 1842-55 (Springfield, Harpers Ferry); paper cartridge could carry buck and ball; many later rifled for the Minie ball. Bayonet not stated in the source; a socket bayonet is inferred, unverified",
  specs={"caliber_in": 0.69, "barrel_in": 42, "overall_in": 58, "weight_lb": 9.8, "ignition": "percussion (earlier flintlocks mostly converted)", "made_approx": 275000, "made_years": "1842-55",
         "makers": ["Springfield", "Harpers Ferry"], "cartridge": "paper cartridge could carry buck and ball", "bayonet": {"value": "socket bayonet", "tier": "inferred", "status": "unverified (not stated in the source)"}},
  notes="many later rifled for the Minie ball", keys=["Wiki-M1842"])
W("buck_and_ball_load", "Buck and ball load (ammunition for .69 smoothbores)", "ammunition_load", "either",
  printed="One ball plus buckshot; test load .650 ball plus three .31 buckshot; hits good at 50 yd, scattered at 100 yd, most buck falling short near 75 yd; the 12th NJ monument is inscribed \"Buck & Ball Calibre .69\"; 15+ buckshot loads on July 3; 60-grain powder charge is memory only",
  specs={"ball_in": 0.650, "buckshot": {"count": 3, "diameter_in": 0.31}, "hits_good_yd": 50, "scattered_yd": 100, "buck_falls_short_yd": 75, "july3_buckshot_loads": "15+", "powder_charge_grains": {"value": 60, "status": "memory only, not a fact"}},
  keys=["CWNews-Smooth"], notes="powder charge is memory only; drill/Ordnance Manual cross-reference in ammunition.json (ORD/INF items)")
W("p1853_enfield", "Pattern 1853 Enfield rifle-musket", "long_arm", "either",
  printed=".577; 39 in barrel; 55 in overall; 9.5 lb; ladder sight 100-400 yd with long-range flip leaf to 1,250 (the v1 notes: sighted to 900 yd); more than 900,000 estimated into America; the Confederacy got more of these than any other small arm",
  specs={"caliber_in": 0.577, "barrel_in": 39, "overall_in": 55, "weight_lb": 9.5, "sight": {"ladder_yd": [100, 400], "flip_leaf_to_yd": 1250, "v1_notes_yd": 900}, "imported_into_america": {"low": 900000, "high": "1,000,000+"}},
  conflicts=[{"id": "CONF-P53-IMPORT", "topic": "Enfield P1853 imported into America", "positions": [{"value": "more than 900,000", "source": "Wikipedia"}, {"value": "over 1,000,000 exported to both sides", "source": "Craig Barry (forum quote)"}],
              "pdf_handling": "Carry as 900,000-1,000,000+", "status": "carried (G21)"}],
  notes="the Confederacy got more of these than any other small arm", keys=["Wiki-P1853", "CWTalk-Enfield"])
W("p1856_58_enfield_short", "P1856/P1858 Enfield short rifle", "long_arm", "either",
  printed="Specs not retrieved; 13 Union regiments (1%) in an 1864 chart with acknowledged errors", specs={"union_regiments_1864_chart": 13, "share_of_regiments_pct": 1},
  spec_gaps=["specs not retrieved"], gap_ids=["G17"], notes="Gap", keys=["Barry"], printed_tier=None)
W("lorenz_m1854", "Austrian Lorenz M1854", "long_arm", "either",
  printed="Originally .54; Union rebores .55/.57/.577/.59; 37.25 in barrel; 52 in overall; Model I block sight, Model II folding leaf to 750 m; quadrangular socket bayonet; Union imported 226,924, Confederate agent Huse about 100,000. Barry's count of Lorenz in 1864 Union regiments is \"over 80\" (a chart figure of 9 is a typo); weight is a gap",
  specs={"caliber_in": {"original": 0.54, "union_rebores": [0.55, 0.57, 0.577, 0.59]}, "barrel_in": 37.25, "overall_in": 52, "sight": "Model I block sight, Model II folding leaf to 750 m", "bayonet": "quadrangular socket bayonet",
         "imported": {"union": 226924, "confederate_agent_huse_approx": 100000}, "barry_union_regiments_1864": "over 80 (a chart figure of 9 is a typo)"},
  spec_gaps=["weight is a gap"], gap_ids=["G17"], keys=["Wiki-Lorenz", "Barry"])
W("richmond_rifle", "Richmond rifle (rifle-musket)", "long_arm", "confederate",
  printed="Richmond Armory began October 1861 using captured Harpers Ferry machinery; M1855 form without the Maynard primer or patch box; short rifle 33 in / 49 in; 1,350 short rifles per the infobox. The 34th Virginia Cavalry Battalion had Enfield and Richmond rifle-muskets (including shorter Richmonds) on July 3. Fayetteville and Tower: gap",
  specs={"armory_began": "1861-10", "form": "M1855 form without the Maynard primer or patch box", "short_rifle_barrel_in": 33, "short_rifle_overall_in": 49, "short_rifles_made_per_infobox": 1350},
  spec_gaps=["Fayetteville and Tower: gap"], gap_ids=["G17"], notes="PDF prints one 'Richmond rifle / carbine' row; split here into rifle and carbine records (same row text)", keys=["Wiki-Richmond", "AR-Guns"])
W("richmond_carbine", "Richmond carbine", "carbine", "confederate",
  printed="carbine 25 in barrel / 41 in overall (from Nov 1862); 5,400 carbines per the infobox", specs={"barrel_in": 25, "overall_in": 41, "from": "1862-11", "made_per_infobox": 5400},
  notes="from the same PDF row as richmond_rifle", keys=["Wiki-Richmond", "AR-Guns"])
W("whitworth_rifle", "Whitworth rifle", "long_arm", "confederate",
  printed=".451; barrels 33/36/39 in; effective 800-1,000 yd; hexagonal bore; ~$1,000 per cased set. American Rifleman judges Gettysburg use unlikely; popular claim of 2,000 yd is overstated",
  specs={"caliber_in": 0.451, "barrel_in": [33, 36, 39], "effective_range_yd": [800, 1000], "bore": "hexagonal", "price_usd_cased_set_approx": 1000},
  notes="Whitworth rifle in infantry hands by default is an anachronism-list failure (B.6.12 item 2); only a flagged plausible-procedural exception for Confederate sharpshooters.  The two Whitworth GUNS (artillery) are a different item (see artillery pieces).",
  keys=["Wiki-Whitworth", "AR-Guns", "AR-Sharpshooting"], infantry_default_barred=True)
W("kerr_rifle", "Kerr", "long_arm", "confederate", printed=".442; specs otherwise a gap", specs={"caliber_in": 0.442}, spec_gaps=["specs otherwise a gap"], gap_ids=["G17"], keys=["AR-Sharpshooting"])
W("enfield_musketoon", "Enfield musketoon", "carbine", "confederate", printed="Named only as a prized sharpshooter arm; specs gap", spec_gaps=["specs gap"], gap_ids=["G17"], keys=["AR-Sharpshooting"], printed_tier=None)
W("imported_arms_not_covered", "Brunswick, Prussian, Belgian, French, Dresden imports; Tower", "long_arm", "either",
  printed="Not covered. Gap; do not assign to a specific unit without a source", spec_gaps=["Not covered"], gap_ids=["G17"], not_assignable=True, keys=[], printed_tier=None)
W("springfield_model_unspecified", "Springfield, model unspecified", "long_arm", "union", placeholder=True,
  printed="PLACEHOLDER used where B.6.10 says only 'Springfield' (Iron Brigade rest, 20th Maine). Not a pattern from the dictionary.",
  notes="Resolves to m1855_springfield or m1861_springfield only when a source names the pattern; the 1st MN and 24th MI rows name M1861 explicitly", gap_ids=["G1"])
W("smoothbore_69_musket_unspecified", "'.69 muskets', pattern unspecified", "long_arm", "either", placeholder=True,
  printed="PLACEHOLDER for the 116th PA ('.69 muskets (forum, Ryan)') and the Confederate default smoothbore minority; pattern (M1842 vs earlier) not named.", gap_ids=["G1", "G2"])
W("scoped_target_rifle", "Custom muzzleloading target rifle with scope (makers Hawkins and Morgan James; W.D. Langdon; Merrill rifles)", "long_arm", "union", placeholder=True,
  printed="B.6.6/B.6.10 (1st Co. Massachusetts SS): 'Custom muzzleloading target rifles with scopes (makers Hawkins and Morgan James)'; 'plus scoped target rifles'. Specs: none printed.", gap_ids=["G13", "G17"])
W("field_finds_any_arm", "Field finds: nearly any arm among Confederate Gettysburg finds", "note", "confederate",
  printed="Nearly any arm turns up among Confederate Gettysburg finds: smoothbores, M1855, Enfield rifles and rifle-muskets, Richmonds, Mississippis, target rifles (Marc Hermann post, forum, weak)",
  notes="Evidence note, not an assignable arm", keys=["AuthCamp-CSmuskets"], not_assignable=True, printed_tier=None, placeholder=True)

# Breech-loaders, repeaters, carbines
W("sharps_rifle_m1859", "Sharps rifle", "long_arm", "union",
  printed=".52 (475 gr bullet, 50 gr powder); about 30 in barrel; about 9.5 lb; 8-10 rounds a minute; about 11,000 M1859 rifles. Berdan's two regiments used it",
  specs={"caliber_in": 0.52, "bullet_gr": 475, "powder_gr": 50, "barrel_in": 30, "weight_lb": 9.5, "rate_rounds_per_min": [8, 10], "m1859_rifles_made_approx": 11000},
  conflicts=[{"id": "CONF-SHARPS-CAL", "topic": "Sharps caliber (rifle vs carbine linen cartridge)", "positions": [{"value": ".52", "source": "Wikipedia (Sharps)"}, {"value": ".54 linen cartridge for the carbine", "source": "Civil War News"}],
              "pdf_handling": "Carry both until a carbine drawing is read", "status": "carried (G21)"}],
  notes="Berdan's two regiments used it", keys=["Wiki-Sharps", "AR-Guns"])
W("sharps_carbine", "Sharps carbine", "carbine", "union",
  printed="About 90,000 made; the most common Union cavalry arm by 1863; linen combustible cartridge", specs={"made_approx": 90000, "cartridge": "linen combustible"},
  conflicts=[{"id": "CONF-SHARPS-CAL", "topic": "Sharps caliber", "positions": [{"value": ".54 linen cartridge", "source": "Civil War News (carbine)"}, {"value": ".52", "source": "Wikipedia (Sharps)"}], "pdf_handling": "Carry both until a carbine drawing is read", "status": "carried (G21)"}],
  notes="the most common Union cavalry arm by 1863", keys=["Wiki-Sharps", "CWNews-Carbine"])
W("sharps_unspecified_pattern", "Sharps, pattern (rifle vs carbine) not stated", "long_arm", "union", placeholder=True,
  printed="PLACEHOLDER: B.6.10 says 'Sharps' for 1st MN Co. L / Minnesota Co. L and the 1st Co. Massachusetts SS without naming rifle or carbine.", gap_ids=["G1"])
W("burnside_carbine", "Burnside carbine", "carbine", "union", printed=".54; 21 in barrel; 7 lb; 55,000+ ordered; 43 Union cavalry regiments in 1863-64; tapered brass cartridge",
  specs={"caliber_in": 0.54, "barrel_in": 21, "weight_lb": 7.0, "ordered": "55,000+", "union_cavalry_regiments_1863_64": 43, "cartridge": "tapered brass"}, keys=["Wiki-Burnside"])
W("gallager_carbine", "Gallager", "carbine", "union", printed=".52 brass cartridge, hard to extract. Specs otherwise gap", specs={"caliber_in": 0.52, "cartridge": "brass, hard to extract"},
  spec_gaps=["Specs otherwise gap"], gap_ids=["G17"], keys=["CWNews-Carbine"])
W("smith_carbine", "Smith", "carbine", "union", printed=".50 rubber cartridge, well regarded. Specs gap", specs={"caliber_in": 0.50, "cartridge": "rubber, well regarded"}, spec_gaps=["Specs gap"], gap_ids=["G17"], keys=["CWNews-Carbine"])
W("merrill_carbine", "Merrill", "carbine", "union", printed=".54 paper cartridge, fragile, unpopular. Specs gap", specs={"caliber_in": 0.54, "cartridge": "paper, fragile, unpopular"}, spec_gaps=["Specs gap"], gap_ids=["G17"], keys=["CWNews-Carbine"],
  notes="B.6.6 says 'Merrill rifles' (1st Co. Mass. SS), B.6.9/B.6.10 list Merrill as a carbine: pattern open; PDF prints 'Merrill' only")
W("sharps_hankins_carbine", "Sharps & Hankins", "carbine", "union", printed=".52 rimfire. Three companies of the 9th NY \"apparently\" had them; specs gap",
  specs={"caliber_in": 0.52, "cartridge": "rimfire"}, spec_gaps=["specs gap"], gap_ids=["G17"], keys=["CWNews-Carbine"], notes="Three companies of the 9th NY 'apparently' had them (hedged in the PDF)")
W("spencer_repeater", "Spencer", "repeater", "union",
  printed=".56-56 (.52 bullet); seven-shot tube; rifle 47 in overall / 30 in barrel, carbine 39.25 in / 22 in; Lincoln test after Gettysburg; the Ordnance Dept initially refused. Used at Hanover June 30 (6th Michigan) and East Cavalry Field July 3 (5th Michigan and two companies or part of the 6th). Not on Buford's line on July 1 (myth). Conflict: Civil War News says carbine production did not begin until October 1863, against use on July 3; the likely resolution is early rifle/short models, inferred. Wikipedia's rate of 14-20 a minute is a secondary figure and its production totals conflict internally. Model the early pattern, not late carbine details",
  specs={"cartridge": ".56-56 (.52 bullet)", "magazine": "seven-shot tube", "rifle": {"overall_in": 47, "barrel_in": 30}, "carbine": {"overall_in": 39.25, "barrel_in": 22}, "wikipedia_rate_per_min": [14, 20]},
  conflicts=[{"id": "CONF-SPENCER-PROD", "topic": "Spencer carbine production start vs July 3 use", "positions": [{"value": "carbine production began October 1863", "source": "Civil War News, American Rifleman"}, {"value": "used by the 5th Michigan on July 3", "source": "Wikipedia third-day cavalry; AR; Civil War News"}],
              "pdf_handling": "Rifle/carbine model question; verify. Likely resolution: early rifle/short models, inferred. Model the early pattern, not late carbine details", "status": "carried (G18, G21)"},
             {"id": "CONF-SPENCER-RATE", "topic": "Spencer rate of fire", "positions": [{"value": "14-20 a minute", "source": "Wikipedia (secondary)"}], "pdf_handling": "secondary figure; production totals conflict internally", "status": "carried (G21)"},
             {"id": "CONF-SPENCER-HANOVER", "topic": "Spencer use at Hanover, 30 June 1863 (6th Michigan)", "positions": [{"value": "6th Michigan first used Spencers in the east at Hanover on June 30", "source": "AR-Guns, CWNews-Carbine; B.6.10 and B.6.15.3"},
                                                                                                                       {"value": "B.6.9 table: 'Spencer, from July 3' for the unit row", "source": "B.6.10 unit row"}],
              "pdf_handling": "B.6.10 lists 'Spencer, from July 3 (6th first used Spencers in the east at Hanover on June 30)'. Recorded as DISPUTED window 1863-06-30..1863-07-02 (6th MI), documented from 1863-07-03.", "status": "disputed (owner decision pending)"}],
  notes="Not on Buford's line on July 1 (myth)", keys=["Wiki-Spencer", "CWNews-Carbine", "AR-Guns"],
  valid_from="1863-07-03",
  allowed_units=[{"unit": "US.CAV.5MICH", "scope": "all", "valid_from": "1863-07-03", "disputed_window": {"from": "1863-06-30", "to": "1863-07-02", "note": "B.6.12 item 2 permits Spencers on the 5th Michigan 'after' June 30; B.6.10 gives July 3 as the start; warn only"}},
                  {"unit": "US.CAV.6MICH", "scope": "part (two companies; PDF also says 'part of the 6th': company count carried as 2 / unspecified)", "valid_from": "1863-07-03",
                   "disputed_window": {"from": "1863-06-30", "to": "1863-07-02", "note": "Hanover June 30 use recorded as disputed"}}],
  branch_use="cavalry")
W("henry_rifle", "Henry", "repeater", "union", printed=".44 rimfire, 15-16 shots; 1,731 bought by the US during the war. None documented at Gettysburg; do not place",
  specs={"caliber_in": 0.44, "cartridge": "rimfire", "capacity": [15, 16], "bought_by_us": 1731}, notes="None documented at Gettysburg; do not place.  Anachronism list B.6.12 item 2.",
  keys=["Wiki-Henry"], barred=True, barred_reason="None documented at Gettysburg; do not place (B.6.9); anachronism list B.6.12 item 2", not_assignable=True)
W("revolving_and_other_breechloaders_gap", "Colt revolving rifle, Starr, Joslyn, Maynard", "long_arm", "union",
  printed="Berdan men used Colt 1855 revolving rifles first, replaced by Sharps in 1862. At Gettysburg: gap", spec_gaps=["At Gettysburg: gap"], gap_ids=["G17", "G13"], keys=["AR-Guns"], not_assignable=True, printed_tier=None,
  notes="Colt revolving rifles at Gettysburg: no source; not used (kit_src_union Berdan note)")

# Handguns
W("colt_army_1860", "Colt Army 1860", "handgun", "union", printed=".44; 8 in barrel; 2 lb 11 oz; six-shot; 200,000+ made; US bought 129,730+; the cavalry's main mounted weapon",
  specs={"caliber_in": 0.44, "barrel_in": 8, "weight": "2 lb 11 oz", "shots": 6, "made": "200,000+", "us_bought": "129,730+"}, notes="the cavalry's main mounted weapon", keys=["Wiki-Colt1860"])
W("colt_navy_1851", "Colt Navy 1851", "handgun", "union", printed="Not retrieved: gap (the Buford ordnance report lists \"Colt .36\" in some regiments, which is probably the Navy but is unconfirmed)",
  spec_gaps=["Not retrieved"], gap_ids=["G17"], keys=["CWTalk-Buford"], printed_tier=None, notes="the '.36' Colt in Buford returns is probably this arm but unconfirmed")
W("colt_36_unconfirmed", "Colt .36 (Buford ordnance report)", "handgun", "union", placeholder=True, printed="PLACEHOLDER for the 'Colt .36' named in B.6.10/B.6.15.4 cavalry rows; probably the Navy 1851 but unconfirmed.", gap_ids=["G17"])
W("remington_1858", "Remington 1858", "handgun", "union", printed=".44 Army / .36 Navy; 8 in Army barrel; about 2 lb 13 oz; six-shot; supplementary Union issue",
  specs={"caliber_in": {"army": 0.44, "navy": 0.36}, "barrel_in_army": 8, "weight": "about 2 lb 13 oz", "shots": 6}, notes="supplementary Union issue", keys=["Wiki-Rem1858"])
W("lemat", "LeMat", "handgun", "confederate", printed="Nine-shot cylinder plus a shotgun barrel; about 2,900 made; several Confederate generals owned them",
  specs={"cylinder_shots": 9, "extra_barrel": "shotgun", "made_approx": 2900}, notes="several Confederate generals owned them", keys=["Wiki-LeMat"])
W("other_revolvers_gap", "Starr, Whitney, Adams, Kerr revolvers", "handgun", "either", printed="Not retrieved: gap", spec_gaps=["Not retrieved"], gap_ids=["G17"], keys=[], printed_tier=None, not_assignable=True)
W("revolver_unspecified", "Revolver / personal handgun (model not stated)", "handgun", "either", placeholder=True,
  printed="Artillerymen got few revolvers; some infantry officers fired personal handguns (Capt. Nowlen, 116th PA; Col. Gaillard, 2nd SC) ([AR-Guns]). Model not stated.", gap_ids=["G17"], keys=["AR-Guns"])
W("colt_pocket_revolver", "Colt pocket revolver (2nd USSS)", "handgun", "union", placeholder=True,
  printed="Berdan's 2nd USSS: Colt pocket revolver ([Wiki-2USS]). No specs printed.", gap_ids=["G17"], keys=["Wiki-2USS"])
# Edged weapons and bayonets
W("m1860_light_cav_saber", "M1860 light cavalry saber", "edged", "union", printed="41 in overall, 35 in blade; 2 lb 4 oz alone / 3 lb 10 oz with scabbard; more than 300,000 made (Ames about 200,000)",
  specs={"overall_in": 41, "blade_in": 35, "weight": {"alone": "2 lb 4 oz", "with_scabbard": "3 lb 10 oz"}, "made": "more than 300,000", "ames_made_approx": 200000}, keys=["Wiki-M1860"])
W("m1840_heavy_saber", "M1840 heavy saber (\"wristbreaker\")", "edged", "union", printed="Many troopers still had the M1840; specs gap", spec_gaps=["specs gap"], gap_ids=["G17"], keys=[], printed_tier=None, notes="source: cavalry notes (no key)")
W("m1840_nco_sword", "M1840 NCO sword", "edged", "union", printed="Specs not retrieved: gap", spec_gaps=["Specs not retrieved"], gap_ids=["G17"], keys=[], printed_tier=None, notes="NCO swords often left in wagons (documented weak, [Goodreads])")
W("m1850_foot_officer_sword", "M1850 foot officer sword", "edged", "either", printed="Specs not retrieved: gap", spec_gaps=["Specs not retrieved"], gap_ids=["G17"], keys=[], printed_tier=None)
W("socket_bayonet", "Socket bayonet", "bayonet", "either",
  printed="Triangular for the US rifle-muskets (blog); the Lorenz bayonet quadrangular; M1841 sword bayonet from 1855; the Colt Special takes only the Collins bayonet. Dimensions: gap",
  specs={"us_rifle_musket": "triangular (blog)", "lorenz": "quadrangular", "m1841": "sword bayonet from 1855", "colt_special": "Collins bayonet only"}, spec_gaps=["Dimensions: gap"], gap_ids=["G17"],
  keys=["Goodreads", "Wiki-Lorenz", "Wiki-M1841", "Wiki-M1861"], notes="Bayonet use is rare as a killing weapon in the notes; they are fixed for charges.")
W("bowie_knife", "Bowie knife", "edged", "union", printed="Listed for the 2nd USSS; otherwise not retrieved", spec_gaps=["otherwise not retrieved"], gap_ids=["G17"], keys=["Wiki-2USS"], printed_tier=None)


# ---------------------------------------------------------------------------------------------------------------
# B.6.10 Unit-to-weapon assignment table.  confidence_printed is the printed word; tier is the effective tier (Law cl.4).
def UA(uid, unit_label, weapon_text, conf_printed, keys, *, weapons=(), unit_ids=(), status="assigned", notes=None, gap_ids=(), tier_override=None, **kw):
    assert uid not in ASSIGNMENTS, uid
    keys = list(keys)
    cp = conf_printed.lower()
    if cp.startswith("documented"):
        printed = "documented"
    elif cp.startswith("weak"):
        printed = "inferred"
    elif cp.startswith("inferred"):
        printed = "inferred"
    elif cp == "partial" or cp.startswith("partial"):
        printed = "inferred"
    else:
        printed = None
    weak_printed = cp.startswith("weak")
    if printed:
        tier, weak, why = eff_tier(printed, keys, printed_weak=weak_printed and printed == "documented")
    else:
        tier, weak, why = ("gap", None, None)
    if tier_override:
        tier = tier_override
    d = {"id": uid, "unit": unit_label, "unit_ids": list(unit_ids), "weapon_text": weapon_text, "confidence_printed": conf_printed, "source_keys": keys,
         "weapon_ids": list(weapons), "status": status, "tier": tier, "weak_source": weak, "gap_ids": list(gap_ids), "notes": notes}
    if why:
        d["tier_note"] = why
    d.update(kw)
    ASSIGNMENTS[uid] = d
    return d


UA("UA-12NJ", "12th New Jersey (II Corps)", "M1842 .69 buck and ball (15+ buckshot loads on July 3); smoothbores kept into 1864", "documented", ["CWNews-Smooth", "AR-Guns"],
   weapons=["m1842_smoothbore"], unit_ids=["US.12NJ"], load="buck_and_ball_load")
UA("UA-IRISH-NY", "Irish Brigade NY regiments (63rd, 69th, 88th NY)", "M1842 .69 smoothbore until spring 1864, then M1863; smoothbore use near the Wheatfield", "documented", ["28thmass", "AR-Guns"],
   weapons=["m1842_smoothbore"], unit_ids=["US.63NY", "US.69NY", "US.88NY"], notes="M1863 only from spring 1864: never assigned for July 1863", forbidden_weapon_ids=["m1863_rifle_musket"])
UA("UA-116PA", "116th PA", ".69 muskets (forum, Ryan)", "weak", ["CWTalk-116PA"], weapons=["smoothbore_69_musket_unspecified"], unit_ids=["US.116PA"])
UA("UA-28MA", "28th Massachusetts", "P1853 Enfield .577 since organization", "documented but contradicted (a forum says it \"carried rifles\")", ["28thmass"], weapons=["p1853_enfield"], unit_ids=["US.28MA"],
   notes="Documented but contradicted: the contradicting claim is a forum statement that the regiment 'carried rifles'; both kept, Enfield is the assignment as printed")
UA("UA-125NY", "125th NY", "Col. Willard a smoothbore advocate; arm not stated", "gap", ["CWNews-Smooth"], weapons=[], unit_ids=["US.125NY"], status="gap",
   notes="Arm not stated: draw default Union distribution (plausible-procedural) with the colonel's smoothbore advocacy recorded as a lead, not an assignment", gap_ids=["G1"])
UA("UA-6MN-FLAG", "\"6th Minnesota\" at the railroad cut (buck-and-ball wounds)", "Likely a recording error for another unit; the railroad-cut fight on July 1 involved the 6th Wisconsin and the 2nd Mississippi (inferred). Do not assign", "flagged", ["AR-Guns"],
   weapons=[], unit_ids=[], status="do_not_assign", notes="Do not assign. No unit '6th Minnesota' exists in the kit data.", gap_ids=["G21"])
UA("UA-20ME", "20th Maine", "Mixed Springfield, Enfield, Lorenz (claim of two or more types; IMFDB with no citation)", "weak: flagged", ["IMFDB"],
   weapons=["springfield_model_unspecified", "p1853_enfield", "lorenz_m1854"], unit_ids=["US.20ME"], flagged=True)
UA("UA-2WI", "2nd Wisconsin", "Austrian muskets (Lorenz) per a forum poster", "weak: flagged", ["AuthCamp-WhoArmed"], weapons=["lorenz_m1854"], unit_ids=["US.2WI"], flagged=True)
UA("UA-24MI", "24th Michigan", "M1861 Springfield per the same poster, uncited", "weak: flagged", ["AuthCamp-WhoArmed"], weapons=["m1861_springfield"], unit_ids=["US.24MI"], flagged=True)
UA("UA-IB-REST", "Rest of the Iron Brigade (19th IN, 6th and 7th WI)", "Springfield per the same poster", "weak: flagged", ["AuthCamp-WhoArmed"],
   weapons=["springfield_model_unspecified"], unit_ids=["US.19IN", "US.6WI", "US.7WI"], flagged=True)
UA("UA-USSS", "Berdan's 1st and 2nd USSS", "Sharps rifles (heavy target rifle per company in wagons)", "documented", ["AR-Guns"], weapons=["sharps_rifle_m1859"], unit_ids=["US.1USS", "US.2USS"],
   notes="heavy target rifle per company stays in wagons (not drawn for the line)")
UA("UA-1MASSSS", "1st Co. Massachusetts Sharpshooters", "Mostly Sharps, some Merrill, plus scoped target rifles", "documented", ["AR-Guns"],
   weapons=["sharps_unspecified_pattern", "merrill_carbine", "scoped_target_rifle"], unit_ids=["US.1MASSSS"])
UA("UA-13PAR", "13th PA Reserves (Bucktails, 42nd PA)", "Smoothbores initially; .58 rifles to Aug 1862; Sharps M1859 rearming before Antietam; the Gettysburg weapon is unconfirmed", "partial", ["Wiki-13PAR", "RockIsland-42PA"],
   weapons=[], unit_ids=["US.13PAR"], status="partial", candidates_unconfirmed=["sharps_rifle_m1859"], gap_ids=["G7"],
   notes="Rock Island Auction lot is an auction page (weak); the Gettysburg arm is unconfirmed; default Union long-arm draw used in kit_specs")
UA("UA-45NY", "45th New York (XI Corps)", "M1841 Mississippi rifles into/after Gettysburg", "documented", ["Wiki-M1841"], weapons=["m1841_mississippi"], unit_ids=["US.45NY"])
UA("UA-1MN", "1st Minnesota", "M1861 Springfield; Co. L Sharps", "documented (Wikipedia)", ["Wiki-1MN"], weapons=["m1861_springfield", "sharps_unspecified_pattern"], unit_ids=["US.1MN", "US.MN_CO_L"],
   notes="The PDF also lists the 1st Minnesota in the 'not found' row (UA-GAP-ROW): internal contradiction carried; Co. L Sharps is mapped to US.MN_CO_L (UA-MNCOL)")
UA("UA-MNCOL", "Minnesota Co. L (attached to 1st Minnesota)", "Sharps (weak)", "weak", ["AHC-USSS-Bib", "Wiki-1MN"], weapons=["sharps_unspecified_pattern"], unit_ids=["US.MN_CO_L"],
   notes="From B.6.6: 'Treat as a sharpshooter detachment with Sharps (weak)'. Sharps pattern not stated", flagged=True)
UA("UA-MICH-SPENCER", "Michigan Brigade: 5th Michigan Cavalry (all) and part of the 6th", "Spencer, from July 3 (6th first used Spencers in the east at Hanover on June 30)", "documented", ["AR-Guns", "CWNews-Carbine"],
   weapons=["spencer_repeater"], unit_ids=["US.CAV.5MICH", "US.CAV.6MICH"], valid_from="1863-07-03", disputed_window={"from": "1863-06-30", "to": "1863-07-02", "unit": "US.CAV.6MICH"},
   candidates_unconfirmed=["sharps_carbine", "burnside_carbine"],
   notes="Spencer allowed only on these units from 1863-07-03; 6th Michigan Hanover use recorded as disputed. The 6th Michigan had Spencers in two companies / part (PDF): the arms of its other companies are not stated; candidates sharps_carbine / burnside_carbine are inferred only (B.6.10 1st/7th Michigan row), not assigned", gap_ids=["G18"])
UA("UA-MICH-1-7", "Michigan Brigade: 1st and 7th Michigan Cavalry", "Unknown; likely Sharps, Burnside or other (inferred)", "gap", [], weapons=[], unit_ids=["US.CAV.1MICH", "US.CAV.7MICH"], status="gap",
   notes="Spencer is NOT allowed on these two regiments. Candidate arms (inferred): sharps_carbine, burnside_carbine", candidates_unconfirmed=["sharps_carbine", "burnside_carbine"], gap_ids=["G18"])
UA("UA-8IL", "Buford, 8th Illinois Cavalry", "Sharps carbine (Lt Marcellus Jones's first shot); Colt .36 and .44", "weak (documented for the Sharps first shot)", ["CWTalk-Buford", "CWNews-Carbine"],
   weapons=["sharps_carbine", "colt_36_unconfirmed", "colt_army_1860"], unit_ids=["US.CAV.8IL"], notes="the Sharps first shot is documented; the rest weak")
UA("UA-12IL", "Buford, 12th Illinois (4 companies)", "Burnside, Colt .44 (86 Burnsides in June per the carbine returns)", "weak", ["CWTalk-Buford", "SBIR-Weapons"], weapons=["burnside_carbine", "colt_army_1860"], unit_ids=["US.CAV.12IL"])
UA("UA-3IN", "Buford, 3rd Indiana", "Gallager, Sharps, Colt .44; the Burnside count fell from 137 to 0 in the returns; part of the regiment lacked muskets and borrowed weapons", "weak", ["CWTalk-Buford", "SBIR-Weapons"],
   weapons=["gallager_carbine", "sharps_carbine", "colt_army_1860"], unit_ids=["US.CAV.3IN"], notes="Burnside count fell from 137 to 0 in the returns (so Burnside not allowed July 1863 for this regiment)")
UA("UA-6-8NY", "Buford, 6th and 8th NY Cavalry", "Sharps, Colt .44", "weak", ["CWTalk-Buford"], weapons=["sharps_carbine", "colt_army_1860"], unit_ids=["US.CAV.6NY", "US.CAV.8NY"])
UA("UA-9NY", "Buford, 9th NY Cavalry", "Sharps, Smith (forum); Sharps & Hankins in three companies (American Rifleman)", "partial; detail conflicting", ["CWTalk-Buford", "AR-Guns"],
   weapons=["sharps_carbine", "smith_carbine", "sharps_hankins_carbine"], unit_ids=["US.CAV.9NY"], conflicts=["Smith (forum) vs Sharps & Hankins in three companies (AR): conflicting detail"], status="partial")
UA("UA-17PA", "Buford, 17th PA Cavalry", "Merrill, Smith, Colt .44/.36, Remington .36", "weak", ["CWTalk-Buford"],
   weapons=["merrill_carbine", "smith_carbine", "colt_army_1860", "colt_36_unconfirmed", "remington_1858"], unit_ids=["US.CAV.17PA"])
UA("UA-3WV", "Buford, 3rd WV Cavalry", "Gallager, Smith, Colt .44, Remington .36", "weak", ["CWTalk-Buford"], weapons=["gallager_carbine", "smith_carbine", "colt_army_1860", "remington_1858"], unit_ids=["US.CAV.3WV"])
UA("UA-10NY", "Gregg, 10th NY Cavalry", "The only regiment in the division with Smith carbines (93 in June); the 1st NJ ran low on carbine ammunition on July 2 and used revolvers", "documented (returns, via a blog)", ["SBIR-Weapons", "StoneSentinels-Gregg"],
   weapons=["smith_carbine"], unit_ids=["US.CAV.10NY"], notes="SBIR-Weapons is a blog (weak) quoting returns; StoneSentinels-Gregg is a secondary site", other_unit_note="1st NJ Cavalry ran low on carbine ammunition July 2 and used revolvers (US.CAV.1NJ)")
UA("UA-34VA", "34th Virginia Cavalry Battalion (Jenkins' brigade)", "Enfield and Richmond rifle-muskets (short and long), revolvers; hit July 3 by the Spencer-armed 5th Michigan after Sharps- and Burnside-armed regiments failed; about 75% casualties against about 8.7% for the 5th",
   "documented", ["AR-Guns"], weapons=["p1853_enfield", "richmond_rifle", "revolver_unspecified"], unit_ids=["CS.34VACAVBN"])
UA("UA-5TX", "5th Texas", "P1853 Enfield per Nicholas Pomeroy's memoir", "weak", ["AuthCamp-CSmuskets"], weapons=["p1853_enfield"], unit_ids=["CS.5TX"], flagged=True)
UA("UA-BLACKFORD", "5th Alabama Battalion (Blackford's sharpshooters)", "Inferred: issue rifled muskets (Enfield or Springfield), not Whitworths, given 200 rounds per man. Arms are not named in Blackford's report.", "inferred",
   ["NPS-Blackford", "AR-Guns"], weapons=["p1853_enfield", "m1861_springfield"], unit_ids=["CS.5ALBN"], flagged=True, gap_ids=["G14"],
   notes="From B.6.6, NOT a B.6.10 table row (the id is minted by the kit build). The PDF's inference excludes Whitworths.", forbidden_weapon_ids=["whitworth_rifle"])
UA("UA-HARDAWAY", "Hardaway's battery", "Two Whitworth breechloading guns (artillery, not infantry rifles)", "weak (forum transcription of a marker)", ["CWTalk-Whitworth"], weapons=[], unit_ids=["CS.ART.HURT"],
   notes="ARTILLERY pieces, not infantry rifles: see weapons.json artillery.pieces 'whitworth_12pdr'. PDF names 'Hardaway's battery'; B.6.14.6/.7 name Hurt (Hardaway AL). Not an infantry assignment.")
UA("UA-GAP-3", "1st Minnesota, 14th Brooklyn (84th NY), 114th PA (the Union three of the gap row)", "not found; for the Union three, .58 Springfield/Enfield-pattern is inferred only", "gap", [],
   weapons=["m1861_springfield", "p1853_enfield"], unit_ids=["US.1MN", "US.84NY", "US.114PA"], status="gap", tier_override="plausible-procedural",
   notes="Inferred only. The 1st MN also has a documented row (UA-1MN): contradiction carried.", gap_ids=["G1"])
UA("UA-GAP-CS", "26th NC, rest of the Texas Brigade, Pickett's brigades (the Confederate part of the gap row)", "not found", "gap", [],
   weapons=[], unit_ids=["CS.26NC", "CS.1TX", "CS.4TX", "CS.3AR", "CS.GARNETT", "CS.ARMISTEAD", "CS.KEMPER"], status="gap", tier_override="plausible-procedural",
   notes="No source: default Confederate distribution applies (plausible-procedural)", gap_ids=["G2"])

DATA_QUALITY_FLAGS = [
    "The IMFDB claim that \"36% of Union regiments at Gettysburg had two or more weapon types\" has no citation and was not confirmed; treat as unverified.",
    "Barry's 6% \"mixed P53 and US 1861\" regiments is a different measure.",
    "IMFDB also says Remington 1863 Zouave rifles were never issued; not checked.",
    "Busey & Martin does not carry small arms.",
]
SETTLING_PRINT_SOURCES = [
    "Dean Thomas, \"Ready, Aim, Fire! Small Arms Ammunition in the Battle of Gettysburg,\" Appendix I (Union regiment primary armament by regiment)",
    "Coates & Thomas, \"An Introduction to Civil War Small Arms,\" Appendix C",
    "Official Records ordnance returns for the Army of the Potomac and the cavalry quarterly returns",
    "NARA Record Group 156 (Ordnance Department), including the armorer J. Dudley's report on the arms recovered after the battle",
    "For Confederate regiments: regimental and brigade histories and the Confederate ordnance receipts; Marc Hermann's field-find evidence",
]

OVERALL_SHARES = {
    "printed": "About 90% of infantry on both sides had rifle-muskets (Alexander: Army of Northern Virginia about 90% rifled .54/.58); about 10% of arms captured by I Corps on July 1 were smoothbores; the Army of the Potomac had a higher rifled share than the Confederates, mixing imported Enfields, Lorenz and M1861 Springfields. A forum poster claims about 900 men in A.P. Hill's corps carried .69 round-ball muskets: unverified",
    "values": {"rifle_musket_share_both_armies": 0.90, "smoothbore_share_of_arms_captured_by_I_Corps_July_1": 0.10},
    "tier_printed": "no tier printed", "source_keys": ["AR-Guns", "CWTalk-A.P.Hill"],
    "unverified": "about 900 men in A.P. Hill's corps carried .69 round-ball muskets (forum poster, CWTalk-A.P.Hill)",
}
BARRY_CHART = {
    "printed": "Barry's 1864 Union chart, rough proportions only (a 1864 snapshot with acknowledged errors): Enfield P53 in 39% of regiments, US Model (1861) 23%, M1842 7%, mixed P53 and US 1861 6%, US 1841 3%, Enfield short rifle 1%. This is a share of regiments, not of men. Piecemeal reissue explains mixed arms inside one regiment: in February 1863 Michigan units received 50,000 M1861s while Enfield holders kept theirs",
    "share_of_regiments_pct": {"p1853_enfield": 39, "m1861_springfield": 23, "m1842_smoothbore": 7, "mixed_p53_and_us1861": 6, "m1841_mississippi": 3, "p1856_58_enfield_short": 1},
    "unit": "regiments, not men", "date": "1864", "source_keys": ["Barry"], "tier": "inferred", "weak_source": True,
    "tier_note": "Barry is a forum-hosted article (classed forum in kit_sources); 1864 snapshot with acknowledged errors",
    "michigan_feb_1863": "Michigan units received 50,000 M1861s while Enfield holders kept theirs",
}
UNIT_ROW_RULE = ("Rule for units not in the table: draw the weapon from a documented-share-based default (the overall shares and Barry's chart above, normalized to the arms that are date-correct), mark the draw "
                 "plausible-procedural, and let a later source overwrite it. For the Union: the rifled .58/.577 types dominate and the M1842 smoothbore is assigned only to regiments the notes name; any other draw of smoothbore, "
                 "Lorenz or M1841 is a flagged exception at a share no larger than the documented smoothbore share. For the Confederates: Enfield P1853 or a captured M1861 or M1855 by default; a minority of smoothbores up to the documented share. "
                 "Mixed arms inside a regiment are allowed (documented practice).")

# ---------------------------------------------------------------------------------------------------------------
# B.6.11 Ammunition, loads and loading drill
AMMUNITION = {
    "section": "B.6.11",
    "rounds_carried": {
        "printed": "Forty rounds in the box, about twenty more in the pockets or knapsack, about sixty going into expected combat; each ten cartridges came with twelve caps ([CVBT-Load], citing Coco and Time-Life). Army Heritage gives 60-80 rounds in a 50 lb load; NPS gives 30-40 in the Confederate box. Carry: box 40 (Union), 30-40 (Confederate), total 60-80.",
        "values": {"box_union": 40, "box_confederate": [30, 40], "total": [60, 80], "pockets_or_knapsack_extra_approx": 20, "going_into_combat_approx": 60, "caps_per_ten_cartridges": 12, "load_lb_army_heritage": 50},
        "source_keys": ["CVBT-Load", "AHC-Sidebar", "NPS-Accout"], "tier_printed": "no tier printed", "tier": "inferred", "weak_source": None,
        "tier_note": "CVBT-Load is an unclassified site and AHC-Sidebar/NPS-Accout institutional; carried range 60-80; claim-to-source map not printed",
        "drill_cross_reference": "drill_infantry.json / ordnance_tables.json: the Ordnance Manual allows 100 rounds a man, 40 (OCR '10') in the box and 60 in the parks (ORD-OM-ROUNDS-SMALL); the caps-per-bundle count is unreadable in the OCR (PDF's '12 caps to 10 cartridges' neither confirmed nor contradicted)",
    },
    "drill": {
        "printed": "Loading a muzzle-loader was a nine-step drill, against five for breech-loaders ([ABT-SmallArms]). A forum (CivilWarTalk loading thread) argues that in combat only eight cycles occur, because the ninth step (return to the shoulder) occurs only on the first load. The step-by-step list is not in the research notes. Leads to verify from Casey's Infantry Tactics (1862) and Hardee's Rifle and Light Infantry Tactics: the standard nine commands are, from memory, load; handle cartridge; tear cartridge; charge cartridge; draw rammer; ram cartridge; return rammer; prime; shoulder arms. This is unverified memory and must be checked before an animation set is built. The drill is the basis of the loading animation; the Hardee vs Casey drill differences are open.",
        "steps_muzzle_loader": 9, "steps_breech_loader": 5, "source_keys": ["ABT-SmallArms", "CWTalk-Loading"], "tier": "documented", "weak_source": None,
        "nine_commands_memory_in_pdf": ["load", "handle cartridge", "tear cartridge", "charge cartridge", "draw rammer", "ram cartridge", "return rammer", "prime", "shoulder arms"],
        "memory_status_in_pdf": "unverified memory",
        "printed_manual_cross_reference": {
            "status": "CONFIRMED in printed manuals (read after the PDF was written); see docs/battle-theatre/drill/",
            "casey_1862": "School of the Soldier Part II paras 163-177, pp. 42-46: same nine commands in the same order (INF-L9-01..09 in drill_infantry.json)",
            "hardee": "prints the same nine commands (DRILL-HARDEE-NOTES.md, drill_compare.json)",
            "forum_eight_cycles_claim": "NOT supported by Casey: the manual has no such statement (INF-FIRE-04, pdf_claim_checks in drill_infantry.json)",
            "misfire": "procedure printed (S.C. paras 82-83); no misfire RATES in any of the five texts (G19 stays open for rates)",
            "pdf_differs": "PDF says the list is unverified memory; manuals settle the list.  The PDF's unlocated G19 items (misfire rates, buck-and-ball charge) remain open."},
    },
    "rates_and_ranges": [
        {"quantity": "Rate", "value": "2-3 rounds a minute typical (M1861); Sharps 8-10 a minute claimed", "values": {"muzzle_loader_per_min": [2, 3], "sharps_per_min": [8, 10]}, "source_keys": ["Wiki-M1861", "Wiki-Sharps"]},
        {"quantity": "Smoothbore", "value": "Unreliable beyond about 75 yd; buck and ball good at 50 yd", "values": {"unreliable_beyond_yd": 75, "buck_and_ball_good_yd": 50}, "source_keys": ["ABT-SmallArms", "CWNews-Smooth"]},
        {"quantity": "Average shooter / trained marksman", "value": "About 250 yd / to about 800 yd", "values": {"average_yd": 250, "marksman_yd": 800}, "source_keys": ["ABT-SmallArms"]},
        {"quantity": "Average engagement range at Gettysburg", "value": "About 200 yd, from later rangefinder checks; Hobart Ward ordered fire held until about 200 yd on July 2", "values": {"average_yd": 200, "ward_hold_fire_yd": 200}, "source_keys": ["AR-Guns"]},
        {"quantity": "Fouling", "value": "The Minie ball was undersized to allow for fouling; muskets could become hard to load after about 40 rounds (forum claim by Rhea Cole, uncited); barrel too hot to touch after 6-9 rounds; up to 14 loads reported in one barrel; Burton ball 1.14 oz (about 500 gr)",
         "values": {"hard_to_load_after_rounds": {"value": 40, "weak": True, "note": "forum claim by Rhea Cole, uncited; flagged option only"}, "barrel_too_hot_rounds": [6, 9], "max_loads_one_barrel_reported": 14, "burton_ball_oz": 1.14, "burton_ball_gr_approx": 500}, "source_keys": ["CWTalk-Loading", "Wiki-Minie"]},
    ],
    "tier_for_rates": "inferred",
    "expended_examples": [
        {"unit": "Berdan's companies and the 3rd Maine", "text": "about 95 rounds per man in about 15 minutes at Pitzer's Woods", "rounds_per_man": 95, "minutes": 15, "source_keys": ["AR-Guns"]},
        {"unit": "Blackford's 5th Alabama Battalion", "text": "more than 200 rounds per man on July 3", "rounds_per_man_min": 200, "unit_id": "CS.5ALBN", "source_keys": ["NPS-Blackford"]},
        {"unit": "SC sharpshooter battalion", "text": "more than 200 each by the morning of July 3", "rounds_per_man_min": 200, "unit_id": "CS.SCSSBN", "source_keys": ["AR-Guns"]},
        {"unit": "a cavalryman", "text": "about a dozen rounds on July 1", "rounds": 12, "source_keys": ["AR-Guns"]},
        {"unit": "20th Maine", "text": "a cited report says \"60 rounds\" per man, and the regiment ran out and used captured arms; the text is unclear on the exact wording", "rounds_per_man": 60, "unit_id": "US.20ME", "source_keys": ["Colby"], "note": "text unclear on exact wording"},
        {"unit": "Recovered arms after the battle", "text": "armorer J. Dudley's report on 27,574 arms, \"at least 24,000\" loaded (cited by a forum poster from RG 156 via a letter; Rhea Cole disputes it as anecdotal). Standard lore of about 24,000 of 37,000 loaded is unverified, and the thread gives 27,574, not 37,000. Carried as a conflict.",
         "conflict": {"id": "CONF-LOADED-ARMS", "positions": [{"arms": 27574, "loaded": "at least 24,000", "source": "Dudley report via forum"}, {"arms": 37000, "loaded": "about 24,000", "source": "standard lore, unverified"}], "status": "carried (G21)"}, "source_keys": ["CWTalk-Loading"]},
    ],
    "animation_rules": {
        "printed": "Fire rate is drawn from the 2-3 per minute range for muzzle-loaders; a soldier's rounds in the box fall as he fires, and a soldier who has fired the unit's documented expenditure (where known) goes to resupply from the dead and wounded, as Blackford's men and the 20th Maine did. Fouling slows loading after about 40 rounds only as a flagged option (weak source).",
        "fire_rate_per_min_range": [2, 3], "tier": "inferred", "fouling_option": {"after_rounds": 40, "flagged": True, "weak_source": True}},
}

# Chosen defaults for the default-weapon weights: see kit_src_union.dw(); weights are tuning parameters, not facts.
