"""tl-04 close-out: further searches attached to the rows that are not verified (gap, unsupported, partial, computed, procedural).

The first searches of each row are in rows_a .. rows_f.  These add the angles the task asks for: unit, commander, place and hour terms, in the
Official Records (all three parts), the 99-text library, the 1863 newspapers and the National Park Service texts.  Each is executed by build.py
and its hit count stored; a zero is a finding.  A search is only a record of what was looked for: no hit of any of them is cited unless it is
also a verbatim citation of the row.
"""
from tl4lib import *


def ADD(rid, *specs):
    ROWS[rid]['searched'].extend(specs)


# ------------------------------------------------------------------------------------------------ T1-183 light earthworks at the guns
ADD('T1-183',
    SR('OR27', r'(Stewart|Wiedrich|Cooper|Reynolds|Whittier|Stevens|Wainwright|Osborn|Steinwehr|Hunt)', near=r'(earthwork|epaulement|intrench|breastwork|rifle-?pit|lunette|embrasure)', win=250,
       what="unit and commander names of the cemetery batteries near any word for a work"),
    SR('OR27', r'(earthwork|epaulement|intrench|breastwork|rifle-?pit)\w*', near=r'(sharpshooters?)', win=250, what="works against sharpshooters in the Official Records (the Wainwright wording)"),
    SR('LIB', r'lunettes?', near=r'(cemetery|gate|battery|batteries)', win=300, what="lunette near the cemetery or a battery in the library books"),
    SR('LIB', r'(earthworks?|intrench\w+|breastworks?|epaulements?)', near=r'(Cemetery Hill|cemetery gate|Wainwright|Osborn|Steinwehr).{0,200}(night|dusk|evening)', win=300,
       what="works on Cemetery Hill at dusk or in the evening in the library books"))

# ------------------------------------------------------------------------------------------------ T1-188 Lee's headquarters
ADD('T1-188',
    SR('OR27', r"(head-?quarters)", near=r"(General Lee|Lee's|commanding general).{0,200}(Seminary|Chambersburg (road|pike)|stone house|farm-?house|small house)", win=300,
       what="where Lee's headquarters stood on the first day (place terms)"),
    SR('LIB', r"Lee.{0,120}(cupola|steeple|belfry)", near=r'(Seminary|Gettysburg|July 1|first day)', win=300, what="Lee in a cupola or steeple (the seed's source names the cupola) in the library books"),
    SR('LIB', r"(Lee's|General Lee's) (head-?quarters)", near=r'(Seminary|first day|July 1|evening of the 1st|Thompson)', win=250, what="Lee's headquarters on the first day in the library books"),
    SR('NPS', r"Thompson", near=r"(Lee|head-?quarters)", win=300, what="the Thompson house as Lee's headquarters in the NPS texts (hour and year of the house)"))

# ------------------------------------------------------------------------------------------------ T1-189 / 190 / 195 / 196 / 219 weather and moon
ADD('T1-189',
    SR('LIB', r'(sun)\s?(set|went down|was setting)', near=r'(July 1|first day|Wednesday|evening of the 1st)', win=300, what="the setting of the sun on Jul 1 in the library books (hour check of the computed 19:32)"),
    SR('NEWS', r'(cloudy|overcast|rain|clear)', near=r'(Wednesday|July 1|first of July)', win=200, what="weather of Wednesday Jul 1 in the 1863 newspapers"))
ADD('T1-190',
    SR('LIB', r'(moon)\s?(rose|rising|shone|shining|was up)', near=r'(Gettysburg|Seminary|Cemetery|July|night)', win=250, what="the rising moon on the night of Jul 1 in the library books"),
    SR('OR27', r'\b(moon-?light|moon-?lit|by the moon)\b', near=r'(Gettysburg|July|night)', win=250, what="moonlight in the Official Records near Gettysburg"))
ADD('T1-195',
    SR('LIB', r'(moon)', near=r'(fog|mist|haze|dew|ground fog).{0,200}(night|morning)', win=300, what="moon together with fog, mist or dew in the library books"),
    SR('OR27', r'\b(dew|dewy|damp|chilly)\b', near=r'(night|morning)', win=200, what="dew or damp on the night of Jul 1-2 in the Official Records"))
ADD('T1-196',
    SR('LIB', r'(moon)', near=r'(10 o.clock|ten o.clock|10 p\. ?m\.).{0,200}(July 1|first day|Gettysburg)', win=300, what="the moon at ten in the evening in the library books"))
ADD('T1-219',
    SR('LIB', r'(thin clouds?|veiled|scud|cirro|cumulo|overcast|leaden)', near=r'(moon|night of the 1st|night of July 1|first night)', win=250, what="cloud over the moon on the night of Jul 1-2 in the library books"),
    SR('NEWS', r'(moon|moonlight)', near=r'(Gettysburg|battle|Wednesday|Thursday)', win=250, what="the moon in the 1863 newspapers"),
    SR('OR27', r'(dark|darkness)', near=r'(night of the 1st|evening of the 1st|night of July 1|that night)', win=200, what="darkness on the night of Jul 1 in the Official Records"))

# ------------------------------------------------------------------------------------------------ T1-194 occupation of the line
ADD('T1-194',
    SR('OR27', r'(Robinson|Doubleday|Rowley|Wadsworth|Newton|Humphreys|Birney|Sickles|Caldwell|Gibbon|Hays|Hancock)', near=r'(rested on their arms|bivouacked|bivouac|took position|went into position).{0,200}(night of the 1st|that night|evening of the 1st|July 1)', win=300,
       what="commanders of the left and centre and their positions on the night of Jul 1"),
    SR('OR27', r'(\d{1,2})(\.\d\d)? ?(p\. ?m\.|o.clock) ?(on the|of the) ?(1st|evening)', near=r'(Cemetery Ridge|Round Top|left of the line|Emmitsburg road|Taneytown road)', win=300, what="clock hours of positions on the ridge on Jul 1"),
    SR('LIB', r'(Cemetery Ridge|Round Top)', near=r'(night of the 1st|first night|evening of the 1st).{0,200}(took position|arrived|bivouac|line)', win=300, what="occupation of the ridge on the first night in the library books"))

# ------------------------------------------------------------------------------------------------ T1-197 cemetery damage
ADD('T1-197',
    SR('OR27', r'(cemetery)', near=r'(tomb-?stones?|head-?stones?|monuments?|graves?|gate-?house|fence)', win=250, what="damage to the cemetery, graves, fences and gatehouse in the Official Records"),
    SR('LIB', r'(tomb-?stones?|head-?stones?)', near=r'(Howard|laid flat|lay flat|flat on the ground|prostrate|overturned|knocked down)', win=300, what="headstones laid flat or overturned on Cemetery Hill in the library books"),
    SR('LIB', r'(gate-?house|gate lodge|lodge)', near=r'(Cemetery Hill|Evergreen|cemetery).{0,200}(shot|shell|riddled|windows|brick)', win=300, what="damage to the cemetery gatehouse in the library books"))

# ------------------------------------------------------------------------------------------------ T1-203 wounded and burial on the first night
ADD('T1-203',
    SR('OR27', r'(canteens?|water).{0,120}wounded|wounded.{0,120}(canteens?|water)', near=r'(night of the 1st|evening of the 1st|that night|1st instant)', win=250, what="water and the wounded on the night of Jul 1 in the Official Records"),
    SR('OR27', r'(burial|burying|buried|bury)\w*', near=r'(night of the 1st|evening of the 1st|1st instant|first day.s (fight|battle))', win=250, what="burial on the night of Jul 1 or of the first day's dead in the Official Records"),
    SR('OR27', r'(Wadsworth|Robinson|Rowley|Doubleday|Rodes|Early|Pender|Heth|Pettigrew|Ewell)', near=r'(wounded).{0,200}(left|remained|lay|collected|brought in|removed).{0,200}(night|dark|morning of the 2d)', win=300,
       what="commanders of the first-day fight and what they say of their wounded that night"),
    SR('LIB', r'(wounded)', near=r'(Wednesday night|night of the first|first night|night after the first).{0,200}(water|lantern|stretcher|ambulance|searched|groans|cries)', win=300, what="the wounded of the first day through the night in the library books"),
    SR('NEWS', r'(wounded)', near=r'(Wednesday night|first night|night of the 1st).{0,200}(water|lantern|ambulance|searched)', win=300, what="the wounded of the first night in the 1863 newspapers"))

# ------------------------------------------------------------------------------------------------ T1-206 Klingel farm
ADD('T1-206',
    SR('OR27', r'K[lI1][il1]ng[l1e]{1,2}', win=100, what="Klingel with OCR variants in the Official Records"),
    SR('LIB', r'K[lI1][il1]ng[l1e]{1,2}', win=100, what="Klingel with OCR variants in the library books (names the farm or the family)"),
    SR('LIB', r'(Confederate|rebel).{0,60}wounded', near=r'(Emmitsburg road|east side of the Emmitsburg).{0,300}(farm|house|barn)', win=400, what="Confederate wounded sheltered at a farm on the Emmitsburg road in the library books"),
    SR('NEWS', r'K[lI1][il1]ng[l1e]{1,2}', win=100, what="Klingel in the 1863 newspapers"))

# ------------------------------------------------------------------------------------------------ T1-207 cavalry at the Rose farm
ADD('T1-207',
    SR('OR27', r'(Buford|Gamble|Devin|Merritt|Pleasonton)', near=r'(wheat-?field|wheat field|Rose)', win=300, what="cavalry commanders near a wheatfield or the Rose farm in the Official Records"),
    SR('OR27', r'(Gamble|Devin|Buford)', near=r'(bivouac|camp|encamped|rested|slept).{0,200}(night of the 1st|that night|1st instant)', win=300, what="the cavalry brigades' night of Jul 1 in the Official Records"),
    SR('LIB', r'(wheat-?field|wheat field)', near=r'(cavalry|Buford|Gamble|Devin).{0,200}(night|bivouac|camp)', win=300, what="cavalry at a wheatfield on the night in the library books"),
    SR('LIB', r'\bRose\b', near=r'(farm|house|barn).{0,200}(cavalry|Buford|Gamble|Devin|Merritt)', win=300, what="Rose and cavalry together in the library books"))

# ------------------------------------------------------------------------------------------------ T1-208 Lady farm hospital
ADD('T1-208',
    SR('OR27', r'\bLady\b', near=r'(farm|house|hospital|barn)', win=200, what="Lady in the Official Records near farm, house, hospital or barn"),
    SR('OR27', r'(hospital)', near=r'(Rodes|Early|Ewell|Johnson|Hanover road|York road|Harrisburg road).{0,300}(Confederate|our wounded)', win=300, what="Confederate hospitals north and east of the town in the Official Records"),
    SR('LIB', r'\bLady\b', near=r'(farm|house|barn).{0,200}(hospital|wounded)', win=300, what="Lady farm with hospital or wounded in the library books"),
    SR('LIB', r'(hospital)', near=r'(Hanover road).{0,300}(Confederate|rebel)', win=300, what="Confederate hospitals on the Hanover road in the library books"))

# ------------------------------------------------------------------------------------------------ T1-213 dead left or buried
ADD('T1-213',
    SR('OR27', r'(buried|burial|burying|interred)', near=r'(Heth|Pender|Pettigrew|Rodes|Daniel|Iverson|O.Neal|Ramseur|Doles).{0,300}(dead)', win=300, what="burial of the first day's dead by the Confederate divisions in the Official Records"),
    SR('OR27', r'(dead)', near=r'(left|lay|lying|remained).{0,60}(on the field|where they fell|unburied)', win=250, what="dead left where they fell in the Official Records"),
    SR('LIB', r'(unburied|lay where they fell|lying where they fell)', near=r'(Wednesday|first day|July 1|McPherson|Seminary|Oak Ridge|railroad cut)', win=300, what="dead of the first day left unburied in the library books"),
    SR('NEWS', r'(burial|buried|burying)', near=r'(Rebels|rebel|Confederate).{0,200}(dead)', win=250, what="burial of the dead after the first day in the 1863 newspapers"))

# ------------------------------------------------------------------------------------------------ T1-214 campfires, pickets, cellars on the night
ADD('T1-214',
    SR('OR27', r'(fires?|camp-?fires?|watch-?fires?)', near=r'(night of the 1st|evening of the 1st|1st instant|that night).{0,200}(forbidden|prohibited|allowed|lighted|built|kindled)', win=300, what="fires allowed, forbidden or lit on the night of Jul 1 in the Official Records"),
    SR('OR27', r'(slept|rested|lay) (upon|on) (their|our) arms', near=r'(night of the 1st|evening of the 1st|1st instant|that night)', win=250, what="on their arms on the night of Jul 1 (positive control: the documented part)"),
    SR('LIB', r'(camp-?fires?|watch-?fires?|fires)', near=r'(Seminary Ridge|Cemetery Hill|the town|Gettysburg).{0,200}(night of the 1st|Wednesday night|first night)', win=300, what="fires on the field on the night of Jul 1 in the library books"),
    SR('NEWS', r'(fires?|lights?|lanterns?)', near=r'(Wednesday night|night of the 1st|first night).{0,200}(Gettysburg|town|field)', win=250, what="fires, lights and lanterns on the night of Jul 1 in the 1863 newspapers"))

# ------------------------------------------------------------------------------------------------ T1-217 Buford's night and Jul 2
ADD('T1-217',
    SR('OR27', r'(Gamble)', near=r'(night|bivouac|camp|encamped|Fairfield|left of the position)', win=300, what="Gamble's brigade on the night of Jul 1 in the Official Records"),
    SR('OR27', r'(Buford|Gamble|Devin)', near=r'(relieved).{0,150}(a\. ?m\.|p\. ?m\.|o.clock|noon)', win=300, what="the hour of the relief of Buford's division on Jul 2 in the Official Records"),
    SR('LIB', r'(Buford|Gamble|Devin)', near=r'(night of the 1st|that night|first night).{0,200}(bivouac|camp|left of|Fairfield|Round Top)', win=300, what="Buford's division on the night of Jul 1 in the library books"))

# ------------------------------------------------------------------------------------------------ T1-218 searches of houses and cellars
ADD('T1-218',
    SR('LIB', r'(searched|ransacked|plundered|pillaged|rifled)', near=r'(houses?|cellars?|garrets?)', win=300, what="Confederate searches of houses in Gettysburg in the library books (all texts)"),
    SR('LIB', r'(cellars?)', near=r'(Wednesday night|that night|first night|all night|through the night)', win=250, what="civilians in cellars through the night in the library books"),
    SR('OR27', r'(search(ed|ing)? (the )?houses|house to house|houses? (were|was) searched)', near=r'(Gettysburg|town)', win=300, what="house searches in the town in the Official Records (Ewell's, Early's, Rodes's reports)"))

# ------------------------------------------------------------------------------------------------ T1-220 / 223 / 224 / 225 sky
ADD('T1-225',
    SR('LIB', r'(sun)\s?(rose|rising|rise)', near=r'(July 2|second day|Thursday morning).{0,200}(fog|mist|haze|clear|cloud)', win=300, what="sunrise of Jul 2 with fog or cloud in the library books"),
    SR('NEWS', r'(fog|foggy|mist|hazy|clear)', near=r'(Thursday morning|July 2)', win=200, what="the morning of Jul 2 in the 1863 newspapers"))

# ------------------------------------------------------------------------------------------------ T2-003 Spangler farm hospital
ADD('T2-003',
    SR('OR27', r'(Eleventh Corps|Howard|Schurz|Steinwehr|Barlow|Devens|Ames)', near=r'(hospital).{0,200}(Baltimore pike|Spangler|barn|farm)', win=300, what="Eleventh Corps hospitals on the pike or at a barn in the Official Records"),
    SR('OR27', r'(Spangler)', win=200, what="every mention of Spangler in the Official Records (the farm near Emmitsburg of Jun 30 is a different place)"),
    SR('LIB', r'(Spangler)', near=r'(hospital|surgeon|wounded|Eleventh|barn).{0,300}(July 1|first day|afternoon|night)', win=300, what="the Spangler hospital on the first day in the library books"),
    SR('LIB', r'(1,?900|1,?500|2,?000|1,?000).{0,60}(wounded)', near=r'(Spangler|Eleventh Corps hospital|Baltimore pike)', win=300, what="counts of wounded at the Spangler or Eleventh Corps hospital in the library books"),
    SR('NPS', r'(Spangler)', near=r'(hospital|Eleventh|wounded|barn)', win=300, what="Spangler farm hospital in all NPS texts (including Spangler farm studies)"))


# ------------------------------------------------------------------------------------------------ recorded delegated defaults
# Only defaults that are RECORDED (decisions/conflict_defaults.json, DELEGATED-DECISIONS-2026-11-11.md) are named here, unchanged; every other
# value of the row stays a selectable scenario and no default is picked for it (Law cl.6).
def DEFAULT(rid, scenario, basis):
    ROWS[rid]['default'] = dict(scenario=scenario, basis=basis)


DEFAULT('T1-199', 'S1', "DELEGATED DECISION C-004-DEFAULT (2026-11-11): window 06:30-07:00 on Jul 2 (documented); the PDF value 06:00 and every other value stay selectable; reversible by the owner")
DEFAULT('T1-221', 'S1', "DELEGATED DECISION C-001-DEFAULT (2026-11-11): about 01:00 on Jul 2, inspection of the line at first light (documented); the other hours stay selectable; reversible by the owner")
DEFAULT('T1-222', 'S1', "DELEGATED DECISION C-002-DEFAULT (2026-11-11): 01:00 on Jul 2 (Humphreys' own report; documented); the PDF value 02:00 and midnight stay selectable; reversible by the owner")
DEFAULT('T1-217', 'S2', "DELEGATED DECISION C-027-DEFAULT (2026-11-11): Jul 3 Westminster (documented); Jul 2 night: place unresolved, marked. Unchanged here: this close-out found the night of Jul 2 at Taneytown stated by Buford p.928 and Devin p.939 (scenario S1) and carries it beside the default; whether it replaces 'unresolved' is for the owner or integrator")
DEFAULT('T2-003', '-', "DELEGATED DECISION C-038-DEFAULT (2026-11-11): range 1,000-2,000, all five values listed, no headline number; no scenario is a default")
DEFAULT('T1-175', 'S1, S2', "DELEGATED DECISION C-039-DEFAULT (2026-11-11): Hancock arrives about 15:00-16:00 (documented; scenarios S1 and S2 bound the window); S3 (about 16:25, the dispatch's 'an hour since') stays selectable beside it; reversible by the owner")
DEFAULT('T2-001', 'S1, S2', "DELEGATED DECISION C-039-DEFAULT (2026-11-11): Hancock arrives about 15:00-16:00 (documented; scenarios S1 and S2 bound the window); S3 (about 16:25, the dispatch's 'an hour since') stays selectable beside it; reversible by the owner")
DEFAULT('T1-200', 'S1, S2, S3', "DELEGATED DECISION DD-F2-07 (bt-evidence, shard fence-2, 2026-11-14): Geary's division placed 05:00, Greene's brigade in line about 06:00, finish window 09:00-12:00 (the values 09:00, 60th NY, and 12:00, Greene and the 137th NY); the PDF morning for every sector stays selectable; S4 (works begun on the night of Jul 1-2) is contradicted by the reports and is not shown as default; reversible by the owner")
DEFAULT('T1-201', '-', "DELEGATED DECISION DD-F2-07 (bt-evidence, shard fence-2, 2026-11-14): the First Division starts late morning of Jul 2 (corps order 08:00, Ruger about 09:00, McDougall's brigade after about 11:00) and finishes in the afternoon; the PDF morning stays selectable; reversible by the owner")
DEFAULT('T1-182', 'S1', "DELEGATED DECISION DD-F2-07 (bt-evidence, shard fence-2, 2026-11-14): McDougall's brigade starts its works after about 11:00 on Jul 2 (the First Division starts late morning); S2 (the evening of Jul 1, from a soldier's letter quoted on a secondary page, not read) is carried beside it as an open gap; reversible by the owner")
