"""Claims from the R20 rows of the evidence corrections of the National Park Service landscape task that the first reading did not use.

    python -I tools/bt/vegetation/gen_nps_corrections.py [path/to/web-nps-landscape.jsonl]

Input: GOVERNANCE/evidence_corrections/web-nps-landscape.jsonl (rows with id R20.*; each row carries a verbatim quote, the saved report and its page). The first reading
(gen_nps_claims.py) took the rows of nine reports from the extract sheets; this file holds the rows of the other reports (Brien farm, Harmon farm, vista cutting, Spangler's
Spring, the cemetery inventory, the Little Round Top report, the Devil's Den passage of the Record of Treatment, three park web pages) and the later rows of the nine.

Nothing is taken on trust: CURATED below is the record of reading each row (its quote is copied from the row and checked to be a substring of it; the sentence `says` is
written here and says no more than the quote does); verify_claims.py then looks every quote up again in the saved text of the report, and a quote that is not found is
dropped. A row not in CURATED and not in LEFT_OUT is reported, so that a new row of the correction file cannot be skipped silently.

Tiers: `documented` = the report states it as fact (or reports a participant's own words, which `note` says); `inferred` = the report hedges ("consistent with"), or the
statement is of a date other than the battle; `ground` rows say what is NOT 1863 (replanting, later growth, later clearing): they are the reason a modern tree is not drawn
as an 1863 one.
"""
import os, sys, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DEFAULT_IN = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'evidence_corrections', 'web-nps-landscape.jsonl')
OUT = os.path.join(HERE, 'claims_nps_corrections.json')

B = {'from': '1863-07-01', 'to': '1863-07-03'}      # the battle
ACCOUNT = 'a participant\'s later account as the report relays it; the original was not read here'

# (xid, suffix, kind, tier, feature, says, when, extra)   extra: anchor, about, q (a verbatim part of the row's quote), note
CURATED = [
    # ---- what the record says of the state in 1863
    ('NPSX-CLI-LANDSCAPE-p055-04', '', 'orchard', 'documented', 'orchards on the farms of the park area',
     'Orchards were a typical complement to the cultivated fields of the mid-19th century agrarian landscape of the park area; almost all the active farms included some sort of orchard, and some farmers ran larger-scale operations.',
     {'basis': 'mid-19th century'}, {'q': 'Orchards were typical complement to the cultivated fields of the mid-l9th century agrarian landscape Almost all of the active farms included some sort of orchard while some farmers participated in larger scale operations', 'own_quote': True, 'src': 'NPS:NPS-CLI-LANDSCAPE#layout',
      'note': 'Letter for letter as saved (layout text: "mid-l9th" for "mid-19th" and no "a" before "typical" are the text layer\'s misreadings).'}),
    ('NPSX-CLI-ERR-p042-01', '', 'regional', 'documented', 'Emmitsburg Road Ridge farms in July 1863',
     'The inventory says that at the time of the battle all the land at the farms it describes on the Emmitsburg Road Ridge (the sentences before it name the Klingel, Trostle, Codori and Neinstedt farm fields) was in agricultural production, in the midst of the summer growing season.',
     B, {}),
    ('NPSX-CLR-1STDAY-p043-01', '', 'orchard', 'documented', 'Dustman farm: fruit trees east of the house',
     'Dustman planted fruit trees in the field east of his house; the report gives no year, number, species or age of the trees.',
     {'to': '1863-07-01', 'basis': 'planted by the owner before the battle; no year stated'}, {'note': 'The farm lies on the First Day ground; the repository has no farmstead outline for it, so the trees are not placed.'}),
    ('NPSX-CLR-ROT-V1-p072-01', '', 'regional', 'inferred', 'hedgerows',
     'Hedgerows were occasionally planted as living fences, but most grew of themselves along fence lines and on poor rocky ground or boulder outcrops, of various trees, shrubs and briars (the report\'s account of the landscape of the period, not of one field).',
     {'basis': 'general account of the landscape of the period'}, {'note': 'A general statement, not dated to the battle and not placed on a field; kept inferred for this ground and not drawn.'}),
    ('NPSX-CLR-ROT-V2-p140-01', '', 'ground', 'documented', "Devil's Den: its open character in 1863",
     "The report says the open character of Devil's Den is documented in the Bachelder map and the Cope map of 1863 and in photographs (the Tipton and Boardman collections, Frassanito's Early Photography at Gettysburg, the park's collection); it does not say how open.",
     B, {'anchor': {'gz': "Devil's Den", 'r_m': 300, 'class': 'boulder', 'k': 1}, 'note': 'The maps and photographs themselves were not read here.'}),
    ('NPSX-CLR-ROT-V2-p140-01', 'b', 'ground', 'documented', "Devil's Den: woody growth of 1999 is not 1863 cover",
     "In 1999 successional woody vegetation filled Devil's Den and contractors removed these non-historic woods in 2005 (the report names a 10.39-acre clearing): modern woody growth there is not 1863 cover.",
     {'basis': '1999 growth; removal 2005'}, {'q': "In 1999, successional woody vegetation filled Devil’s Den and contractors removed the non-historic woods in 2005.", 'own_quote': True, 'anchor': {'gz': "Devil's Den", 'r_m': 300, 'class': 'boulder', 'k': 1},
                                               'note': 'The sentence after the previous claim, on the same page (p. 140); the saved text reads "flled" (the fi ligature is lost in its text layer).'}),
    ('NPSX-CLI-CEMETERY-p024-01', '', 'ground', 'documented', 'future national cemetery ground in 1863',
     'In 1863 the ground of the future National Cemetery was fence-enclosed fields bordering Evergreen Cemetery; the report names no crop.',
     B, {'anchor': {'gz': 'Cemetery Hill', 'r_m': 260, 'class': 'field', 'area': True}}),
    ('NPSX-CLI-CEMETERY-p028-01', '', 'woodlot', 'documented', 'Evergreen Cemetery grove south of the national cemetery',
     'The only natural vegetation the report names at the national cemetery was a pre-Civil War grove of trees in Evergreen Cemetery bordering the south end of the national cemetery; species and extent are not stated.',
     {'to': '1863-07-01', 'basis': 'pre-Civil War grove; cleared in 1956'}, {'anchor': {'gz': 'Cemetery Hill', 'r_m': 500, 'class': 'woods', 'k': 1}, 'note': 'Placed only as the nearest wood of the land-cover layer within 500 m of Cemetery Hill: the grove\'s own outline is not in the repository.'}),
    ('NPSX-CLR-LRT-p019-02', '', 'woodlot', 'inferred', 'Little Round Top slopes before the battle',
     'Deeds issued after 1797 are consistent with the slopes of Little Round Top serving as the rear wood lots of farms on the flatter, more arable land along the Taneytown Road (the report\'s own hedge).',
     {'to': '1863-07-01', 'basis': 'land use since 1797'}, {'anchor': {'gz': 'Little Round Top', 'r_m': 420, 'class': 'any', 'area': True}}),
    ('NPSX-CLR-LRT-p019-05', '', 'ground', 'documented', 'Little Round Top: the three tracts on the eve of the battle',
     'On the eve of the battle the slopes of Little Round Top were held in three tracts: George Bushman\'s 20 acres (northeast slope), Jacob Weikert\'s 82 acres (southeast slope) and Ephraim Hanaway\'s 29 acres (most of the north and west slope east of Plum Run).',
     {'to': '1863-07-01'}, {'anchor': {'gz': 'Little Round Top', 'r_m': 420, 'class': 'any', 'area': True}}),
    ('NPSX-HARMON-FARM-p005-01', '', 'woodlot', 'documented', 'the 43-acre Harmon wood divided among three farms',
     'A 43-acre wood, later held by the Springs Hotel Company, had been divided among three separate farms; its interior boundaries (worm fences and stone walls) disappeared as the fences decayed or burned and the walls were taken apart.',
     {'basis': 'before the Hotel Company (1860s and later)'}, {'note': 'The Harmon farm has no farmstead outline in the repository: documented but not placed.'}),
    ('NPSX-HARMON-FARM-p007-02', '', 'orchard', 'inferred', 'Harmon farm: apple orchard of 1841',
     'An advertisement of 25 January 1841, quoted by the report, describes about 160 to 170 engrafted apple trees round the buildings of the farm, with peach, cherry and plum trees among them; the report gives no count for 1863.',
     {'to': '1841-01-25', 'basis': 'a 1841 advertisement'}, {'note': 'Twenty-two years before the battle: inferred for 1863, not placed.'}),
    ('NPSX-HARMON-FARM-p007-03', '', 'woodlot', 'documented', 'Harmon farm: woodlots north of Mill Road',
     'All the woodlands and woodlots belonging to the larger Harmon farm lay north of Mill Road; none passed with the open tenant farm.',
     {'basis': 'before 1863'}, {'note': 'Not placed (no farmstead outline).'}),
    ('NPSX-HARMON-FARM-p016-01', '', 'crop', 'documented', 'Harmon farm: a large timothy field on 1 July',
     'Amelia Harmon wrote that on 1 July a large timothy field between the barn and the woods hid hundreds of crouching Confederate soldiers advancing under its cover: the timothy was standing and tall enough to hide a man.',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {'about': {'crop': 'hay', 'stage': 'standing_tall', 'species': 'timothy'}, 'note': ACCOUNT + '. Not placed (no farmstead outline); it bounds the hay calendar: some timothy stood uncut and tall on 1 July.'}),
    ('NPSX-HARMON-FARM-p018-01', '', 'thicket', 'documented', 'Willoughby Run: undergrowth before Archer, open ground before Davis',
     'On 1 July General Archer\'s front was covered by thick undergrowth along Willoughby Run, with Herbst Woods rising from the Run to the ridgeline; General Davis had a clear field of view to his front, unhindered by woods.',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {'anchor': {'gz': 'Willoughby Run', 'r_m': 250, 'class': 'woods', 'area': True}, 'about': {'understory': 'thick', 'where': 'along the run'}}),
    ('NPSX-VISTA-CUTTING-p010-01', '', 'woodlot', 'inferred', 'Little Round Top west slope cut clear a year before the battle',
     'The report states that a year before the battle the entire western slope of Little Round Top had been cut clear of woods except for a few scattered trees and light undergrowth; it gives no source for the date.',
     {'to': '1863-07-01', 'basis': 'a year before the battle'}, {'anchor': {'poly': 'LC-OPEN-0001'}, 'about': {'canopy': 'cleared'}, 'note': 'An administrative report of about 1940. It agrees with the Hanaway-tract statement of the 2012 report (VC-NPS-027).'}),
    ('NPSX-VISTA-CUTTING-p011-01', 'a', 'woodlot', 'documented', 'Big Round Top on the Warren map',
     'On the Warren map (survey of 1868-69) the slopes of Big Round Top show a heavy growth of round-leaved trees, oak and pine.',
     {'basis': 'Warren survey, 1868-69'}, {'q': 'Southward, on the slopes of Big Round Top, a heavy growth of round leaf, oak and pine is observed.', 'anchor': {'poly': 'LC-WOOD-0002'}, 'about': {'composition': 'deciduous_with_conifers'}, 'note': 'The map is of five years after the battle; the report reads it as the best record of the woodland.'}),
    ('NPSX-VISTA-CUTTING-p011-01', 'b', 'woodlot', 'documented', 'Little Round Top west slope on the Warren map',
     'On the Warren map (survey of 1868-69) a considerable growth of pine and oak is scattered along the western slopes of Little Round Top.',
     {'basis': 'Warren survey, 1868-69'}, {'q': 'Scattered along the western slopes of Little Round Top is a considerable growth of pine and oak.', 'note': 'Five years after the battle: growth after the clearing. The same passage says the post-battle photographs show the slope nearly bare (next claim).'}),
    ('NPSX-VISTA-CUTTING-p011-01', 'c', 'woodlot', 'documented', 'Little Round Top west slope in the post-battle Brady photographs',
     'The report says Brady photographs of the post-battle period indicate the western slope of Little Round Top to have been nearly devoid of tree growth.',
     {'basis': 'Brady photographs, after the battle'}, {'q': 'Brady photographs of the post-battle period indicate this slope to have been nearly devoid of tree growth.', 'anchor': {'poly': 'LC-OPEN-0001'}, 'about': {'canopy': 'cleared'}, 'note': 'The photographs themselves were not read here (register gap on photographs).'}),
    ('NPSX-BRIEN-FARM-p007-01', '', 'farm_inventory', 'documented', 'Brien farm: crops and land in July 1863',
     'In July 1863 Brien was farming wheat, barley and hay and had land in meadows and orchards; the report does not place the fields.',
     B, {'q': 'In July, 1863, he was f a m i n g wheat, barley, and hay and had land in meadows and orchards.', 'own_quote': True, 'about': {'farm': 'brien', 'crops_named': ['wheat', 'barley', 'hay']},
         'note': 'The quote is the saved text letter for letter: its text layer reads "f a m i n g" where the page prints "farming".'}),
    ('NPSX-BRIEN-FARM-p008-01', 'a', 'crop', 'documented', 'Brien farm: fields of wheat in front of the house',
     'General MacDougall, dedicating the 111th New York monument on 26 June 1891, described his regiment\'s place in front of the Brien house with fields of wheat in front of it.',
     {'from': '1863-07-02', 'to': '1863-07-03'}, {'q': 'General Clinton MacDougall did describe his unit’s location in front of the Brien House, the fields of wheat to their foreground', 'anchor': {'farm': 'brien', 'bearing': 270, 'dist_m': 120, 'r_m': 220, 'class': 'field', 'k': 1}, 'about': {'crop': 'wheat'}, 'note': ACCOUNT + '. "To their foreground" is read as the ground west of the house, toward the Emmitsburg Road.'}),
    ('NPSX-BRIEN-FARM-p008-01', 'b', 'woodlot', 'documented', 'Brien farm: a grove behind the house',
     'General MacDougall (1891) described a grove of trees behind the Brien house in which his regiment bivouacked.',
     {'from': '1863-07-02', 'to': '1863-07-03'}, {'q': 'and the grove of trees behind the house in which they bivouacked', 'anchor': {'farm': 'brien', 'bearing': 90, 'dist_m': 140, 'r_m': 240, 'class': 'woods', 'k': 1}, 'note': ACCOUNT + '. "Behind" is read as east of the house.'}),
    ('NPSX-BRIEN-FARM-p009-01', '', 'orchard', 'documented', 'Brien farm: the orchard at the rear of the house',
     'Captain David Shields wrote, many years after, that he led the 111th New York from the Brien orchard at the rear of the house into position when the cannonade began on 3 July.',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'anchor': {'farm': 'brien', 'bearing': 90, 'dist_m': 50, 'r_m': 200, 'class': 'orchard', 'k': 1}, 'note': ACCOUNT + '.'}),

    # ---- what is NOT 1863 (later planting, growth or clearing); kind ground
    ('NPSX-CLI-PCB-p080-06', '', 'ground', 'documented', 'McMillan Woods: the Horting part cut, reforested in the 1960s',
     'The Horting part of the wood was cut down before park ownership and its reforestation in the 1960s produced successional forest, mainly cedar; the McMillan-owned southern part keeps its historic limits and its deciduous trees.',
     {'basis': '1960s and later'}, {'note': 'Cedar there is modern, not 1863.'}),
    ('NPSX-CLI-PCB-p084-01', '', 'ground', 'documented', 'Henry Spangler orchard replanted',
     'The Henry Spangler orchard was planted in apples in 2004-2005: the trees there are modern.', {'basis': '2004-2005'},
     {'q': 'the west by H. Spangler Field 1. Ot was planted in apples in 2004-2005.', 'own_quote': True, 'note': 'Letter for letter as saved ("Ot" is the text layer\'s misreading of "It"); the sentence follows the heading "H. Spangler Orchard" and the orchard\'s boundaries across a page break.'}),
    ('NPSX-CLI-PCB-p084-03', '', 'ground', 'documented', 'woods beyond their historic limits',
     'The woods there occupy all their historic extent but have spread beyond it in places and encroach on neighbouring fields, particularly to the south.', {'basis': 'modern'}, {}),
    ('NPSX-CLI-PCB-p084-06', '', 'ground', 'documented', 'Shultz Woods reforested 1900-1910',
     'The woods, which stood in 1863, were reforested by the park commission in the first decade of the 20th century: their trees are not the trees of 1863.', {'basis': '1900-1910'}, {}),
    ('NPSX-CLI-ERR-p096-01', '', 'ground', 'documented', 'Codori-Trostle thicket in 1927',
     'Trees were planted at the park in 1915-1916 (about 450, the Codori and Trostle farms among the places); by 1927 the Codori-Trostle thicket had nearly doubled from its mid-1880s size and was a nearly impenetrable woodland along Plum Run: the later thicket is larger than that of 1863.',
     {'basis': '1915-1927'}, {}),
    ('NPSX-CLI-ERR-p096-02', '', 'ground', 'documented', 'Codori and Trostle farms: no orchard by the mid-1930s',
     'By the mid-1930s neither the Codori nor the Trostle farm supported an orchard, though gardens, orchards and tree groupings had been there since the early settlement.', {'basis': '1930s'}, {'q': 'However, by the mid-1930s neither farm supported an orchard.'}),
    ('NPSX-CLI-ERR-p097-01', '', 'ground', 'documented', '1963-64 selective clearing by the Warren map',
     'In the fall and winter of 1963-1964 the park selectively removed trees and brush from areas of the battlefield, using the 1868-1869 Warren map as a guide.', {'basis': '1963-1964'}, {}),
    ('NPSX-CLI-ERR-p097-03', '', 'ground', 'documented', 'Codori-Trostle thicket rehabilitated 2002-2009',
     'Between 2002 and 2009 the wooded thicket was rehabilitated and the surrounding woods were removed.', {'basis': '2002-2009'}, {}),
    ('NPSX-CLI-1STDAY-p057-09', '', 'ground', 'documented', 'Herbst orchard field: post-battle woods and a replanted part',
     'On the Herbst farm orchard field, woods on the west side along Willoughby Run are post-battle and part of the orchard was re-established by the park in 2007.', {'basis': '2007'}, {'q': 'Portion of orchard reestablished by park, 2007.'}),
    ('NPSX-CLI-1STDAY-p061-04', '', 'ground', 'documented', 'McClean Grove replanted',
     'The new planting of McClean Grove is managed as successional woods rather than as a farm woodlot, so may not reflect the character that existed during the battle.', {'basis': 'modern'}, {'q': 'The new planting is also being managed as successional woods, rather than as a farm woodlot, so may not reflect the character that existed during the battle.'}),
    ('NPSX-CLI-1STDAY-p078-01', '', 'ground', 'documented', 'Forney Woods beyond the 1863 woodlot',
     'The Forney woods has re-established itself but now extends beyond the limits of the 1863 woodlot.', {'basis': 'modern'}, {'q': 'The Forney woods has become reestablished but has expanded beyond the limits of the 1863 woodlot, reducing the area of open field through which Confederate forces advanced.'}),
    ('NPSX-CLR-1STDAY-p049-08', '', 'ground', 'documented', 'Wills farm: the orchard round the house is later',
     'On the Wills farm map surveyed about 1868 the orchard surrounding the house was added after the battle.', {'basis': 'after 1863'}, {}),
    ('NPSX-CLR-1STDAY-p415-02', '', 'ground', 'inferred', 'McClean woodlot: partly cleared after the battle',
     'After the battle some of the McClean woodlot was most likely cleared to enlarge the open field (the report\'s own hedge).', {'basis': 'after 1863'}, {}),
    ('NPSX-CLR-1STDAY-p423-02', '', 'ground', 'documented', 'Forney woodlot cleared after the battle',
     'After the battle the Forneys cleared the woodlot, which enlarged Forney Field 1.', {'basis': 'after 1863'}, {}),
    ('NPSX-CLR-1STDAY-p390-02', '', 'ground', 'documented', 'McPherson fruit garden after the battle',
     'The McPherson fruit garden was enlarged after the battle and by 1895 had been reduced to just several trees.', {'basis': '1863-1895'}, {}),
    ('NPSX-WEB-BATTLEFIELD-REHAB-p001-04', '', 'ground', 'documented', 'trees of the last 65-70 years are non-historic',
     'The park\'s rehabilitation page says non-historic trees that have grown up over the past 65 to 70 years are to be removed to restore the 1863 characteristics of observation, fields of fire, and cover and concealment: trees of that age on the battlefield are not 1863 trees.', {'basis': 'page as served'}, {'src': 'NPSWEB:NPSGOV-BATTLEFIELD-REHAB'}),
    ('NPSX-WEB-BATTLEFIELD-REHAB-p001-05', '', 'ground', 'documented', 'fields not farmed have become forest',
     'The page says fields that have not been farmed over the past 65 years have become forests.', {'basis': 'page as served'}, {'src': 'NPSWEB:NPSGOV-BATTLEFIELD-REHAB'}),
    ('NPSX-WEB-BATTLEFIELD-REHAB-p001-07', '', 'ground', 'documented', 'rehabilitation: grasslands, wetlands, orchards',
     'The project, begun in 2000 after the General Management Plan, calls for re-establishing grasslands, restoring wetlands and replanting orchards: the park\'s orchards are replantings.', {'basis': 'page as served'}, {'q': 'The project calls for reestablishing grasslands, restoring wetlands, and replanting orchards.', 'src': 'NPSWEB:NPSGOV-BATTLEFIELD-REHAB'}),
    ('NPSX-WEB-NATURAL-FEATURES-p001-03', '', 'ground', 'documented', 'woodlots of the park today',
     'Over 1,600 acres of woodlots and forested habitat today are several successional communities, from mature oak and hickory to early scrub-shrub: a description of the park now, not of 1863.', {'basis': 'page as served'}, {'src': 'NPSWEB:NPSGOV-NATURAL-FEATURES'}),
    ('NPSX-WEB-NATURAL-FEATURES-p001-06', '', 'ground', 'documented', 'the 1999 plan: replant missing woodlots, orchards and thickets',
     'The 1999 General Management Plan set goals to rehabilitate the 1863 features, including replanting missing historic woodlots, orchards and thickets and removing non-historic vegetation.', {'basis': '1999 plan'}, {'src': 'NPSWEB:NPSGOV-NATURAL-FEATURES'}),
    ('NPSX-WEB-PLANTS-p001-01', '', 'ground', 'documented', 'the dominant trees named today are not a list for 1863',
     'The park names white oak, white ash and northern red oak as the dominant overstory species documented in its woodlots and woodlands today; the page is not a list of the trees of 1863.', {'basis': 'page as served'}, {'src': 'NPSWEB:NPSGOV-PLANTS'}),
    ('NPSX-ADHI-p072-01', '', 'ground', 'documented', 'Ziegler\'s Grove denuded after the battle',
     'It was decided to plant 125 trees on the denuded part of Ziegler\'s Grove to restore it as nearly as possible to its condition during the battle; the work was done some years later by the park commission: the grove had lost trees after the battle.', {'basis': '1880s'}, {}),
    ('NPSX-CLI-CEMETERY-p028-03', '', 'ground', 'documented', 'Evergreen Cemetery grove cleared in 1956',
     'The natural deciduous grove of Evergreen Cemetery that bordered the south end of the national cemetery was cleared in 1956.', {'basis': '1956'}, {}),
    ('NPSX-CLI-LRT-p058-02', '', 'ground', 'documented', 'Little Round Top maintained to look as in July 1863',
     'Today the park maintains Little Round Top to appear much as in July 1863, keeping the field that covers the western slope and letting the dry oak-mixed hardwood forest of the eastern slope mature.', {'basis': '2020 management'}, {}),
    ('NPSX-CLI-LRT-p081-02', '', 'ground', 'documented', 'tree growth after the battle obscured views',
     'By 1890 certain points and views on the battlefield were being obscured by tree growth that had not existed at the time of the battle.', {'basis': 'after 1863'}, {}),
    ('NPSX-CLI-LANDSCAPE-p055-09', '', 'ground', 'documented', 'fields, orchards and woodlots after the battle',
     'During the park association period farming was re-established and the pattern of cultivated fields, orchards and woodlots remained basically unchanged, except that a few woodlots on gentle grades were cleared for cultivation.', {'basis': '1864-1895'}, {}),
    ('NPSX-CLI-LANDSCAPE-p056-03', '', 'ground', 'documented', 'no orchard tree of the battle exists today',
     'The inventory says no orchard trees present during the battle exist today, and some orchards have been re-established by the park.', {'basis': 'modern (2000 condition)'}, {'q': 'No orchard trees present turing the battle exist today However some orchards have been reestablished by the National Park Service', 'own_quote': True, 'note': 'Letter for letter as saved (layout text; "turing" is the text layer\'s misreading of "during").'}),
    ('NPSX-HARMON-FARM-p034-02', '', 'woodlot', 'inferred', 'oak timber on the east boundary of a farm in 1866',
     'An advertisement of 1 September 1866 describes a stand of heavy oak timber of 25 acres on the eastern boundary of a 138-acre farm, the southern extension of the Harmon and Wible Woods.', {'to': '1866-09-01', 'basis': 'a 1866 advertisement'}, {'q': 'Included in a description of the 138-acre farm was the stand of "heavy oak timber" which comprised the 25 acres of its eastern boundary IAdams Sentinel (1 September 1866) J. This oak timber was the southern extension of the Harmon/Wible Woods', 'own_quote': True,
                                                         'note': 'Letter for letter as saved (the bracketed citation of the Adams Sentinel of 1 September 1866 is read "IAdams Sentinel (1 September 1866) J"). Three years after the battle; not placed.'}),
    ('NPSX-VISTA-CUTTING-p009-01', '', 'geometry', 'documented', 'what the vista-cutting report rests on',
     'The report names the Warren survey map (1868-69) and the available Brady and Tipton photographs as the chief sources for restoring woodland conditions as of July 1863, and calls the Warren map the most authentic source.', {'basis': 'report of about 1940'}, {}),
    ('NPSX-VISTA-CUTTING-p010-02', '', 'geometry', 'documented', 'the Tipton photographs are undated',
     'The report says the Tipton photographs are undated, so their period cannot be estimated, and are of little use for restoring the woodland of the battle period.', {'basis': 'report of about 1940'}, {}),
    ('NPSX-SPANGLERS-SPRING-p015-01', '', 'ground', 'documented', "Spangler's Spring area in 1940",
     'In 1940 the area south and east of the Spring was meadow and the Culp\'s Hill area was heavily timbered.', {'basis': '1940'}, {}),
    ('NPSX-SPANGLERS-SPRING-p015-02', '', 'geometry', 'documented', "Spangler's Spring: the plan to restore the timber of the Warren map",
     'The 1940 plan was to re-establish the timber growth of the Spring area as the Warren map of 1868-69 shows it and to re-plant the whole area in grass.', {'basis': '1940 plan'}, {}),
]

# ---- second reading: the rows the correction file gained on 14 November (87 of its 370 vegetation rows were in no claim): the Little Round Top report's accounts, the plan of 1999 and the
# assessment of 2017, "A Common Pride and Fame" part III (the Copse of Trees and Ziegler's Grove), the plan for the south end, the McPherson farm study, the cemetery report. Each row read by hand.
D1 = {'from': '1863-07-01', 'to': '1863-07-01'}
D2 = {'from': '1863-07-02', 'to': '1863-07-02'}
D3 = {'from': '1863-07-03', 'to': '1863-07-03'}
D23 = {'from': '1863-07-02', 'to': '1863-07-03'}
LRT_E_AREA = {'poly': 'LC-WOOD-LRT-E', 'class': 'woods', 'r_m': 5, 'area': True}        # the east slope of Little Round Top (the Warren wood cut out of the Big Round Top polygon, DD-VEG-08)
WEST_EXACT = {'poly': 'LC-OPEN-0001'}                                                      # the west slope of Little Round Top (the Warren sheet shows it open)
WEST_AREA = {'poly': 'LC-OPEN-0001', 'class': 'cleared', 'r_m': 5, 'area': True}
BRT_EXACT = {'poly': 'LC-WOOD-0002'}                                                       # Big Round Top timber
COPSE = {'gz': 'The Angle', 'r_m': 120, 'class': 'woods', 'k': 1}                          # the Copse of Trees stood at the Angle: the nearest tree-symbol cluster of the Warren sheet
ZIEG = {'gz': "Ziegler's Grove", 'r_m': 120, 'class': 'woods', 'k': 1}
MEYERS = {'lnglat': [-77.230473, 39.821427], 'bearing': 0, 'dist_m': 110, 'r_m': 120, 'class': 'orchard', 'k': 1}   # the Meyers orchard lay north of the lines of the 75th Pennsylvania and 82nd Ohio (the 75th's monument is the locator)
RR_N = {'lnglat': [-77.24997, 39.83831], 'dist_m': 120, 'r_m': 280, 'class': 'field', 'k': 1}                      # north of the unfinished railroad's grade (RL-002) at its nearest point to the McPherson farmstead

CURATED += [
    # ---- Little Round Top and the Round Tops: what the accounts the report quotes say of the cover
    ('NPSX-CLR-LRT-p115-01', 'a', 'woodlot', 'documented', 'Big Round Top covered with woods (history of the 83rd Pennsylvania)',
     'The report quotes the history of the 83rd Pennsylvania by Amos M. Judson (1865): on the left was Big Round Top, a high rocky hill covered with woods.', D2,
     {'q': 'On the left was Big Round Top, a high, rocky hill, covered with woods and overlooking Little Round Top.', 'anchor': BRT_EXACT, 'note': ACCOUNT + ' (published 1865).'}),
    ('NPSX-CLR-LRT-p115-01', 'b', 'woodlot', 'documented', 'the vale between the two Round Tops (history of the 83rd Pennsylvania)',
     'The same history says the small vale between the two hills (not a ravine as commonly called), about a hundred feet wide, was covered with trees but rather open and underbrushed.', D2,
     {'q': 'Between the two hills there was a small vale (not a ravine as it is commonly called), about a hundred feet in width, and covered with trees, but rather open and underbrushed.', 'anchor': LRT_E_AREA,
      'note': ACCOUNT + '. The vale is not outlined in the repository: the claim bears on the neighbourhood (role area) and sets no value.'}),
    ('NPSX-CLR-LRT-p119-01', '', 'tree', 'inferred', 'a large butternut on Little Round Top: General Warren\'s lookout',
     'An article of 1892 by what the report calls a purported witness says General Warren\'s chief position was on the top of a large butternut tree which overlooked the other (the sentence is cut by a figure caption in the saved text).', D2,
     {'q': 'General Warren’s chief position was on the top of a large butternut tree, which overlooked the other', 'anchor': LRT_E_AREA, 'about': {'witness': 'WT-03'},
      'note': 'An anonymous account written long after, by a witness the report itself calls purported: tier inferred. The tree is drawn as a named tree at the summit of the hill, its place not better than about 100 m (the summit is the nearest named place).'}),
    ('NPSX-CLR-LRT-p122-01', 'a', 'woodlot', 'documented', 'Little Round Top south end: oaks of about a foot across with a sprinkling of pines (Spear)',
     'Ellis Spear\'s recollection, quoted by the report, says the base of the hill and the slope on both sides were covered with oak trees, chiefly oak of perhaps a foot in diameter, with here and there a sprinkling of pines.', D2,
     {'q': 'This base, as well as the slope on both sides is covered with oak trees, or chiefly with oak of perhaps a foot in diameter, more or less, with here and there a sprinkling of pines.', 'anchor': LRT_E_AREA,
      'note': ACCOUNT + ' (a recollection written after the war). Which part of the hill "this base" is the south end of the 20th Maine\'s line: the claim bears on the east slope as a whole (role area).'}),
    ('NPSX-CLR-LRT-p122-01', 'b', 'woodlot', 'documented', 'Big Round Top: the steep thickly wooded side (Spear)',
     'The same recollection says that through the trees to the south the writer could see the steep and thickly wooded side of Big Round Top, two or three hundred yards distant.', D2,
     {'q': 'I could see through the trees to the south, the steep and thickly wooded side of Big Round Top, two or three hundred yards distant.', 'anchor': BRT_EXACT, 'note': ACCOUNT + '.'}),
    ('NPSX-CLR-LRT-p122-04', '', 'thicket', 'documented', 'a field of scrub oak where Crawford massed his division',
     'General S. W. Crawford, testifying before Congress, said he was directed to mass his command in a field of scrub oak, to the right.', D2,
     {'q': 'He directed me to mass my command in a field of scrub oak, to the right, and hold them in readiness for any movement.', 'note': ACCOUNT + ' (testimony published 1865). "To the right" of what is not stated in the quoted words: not placed.'}),
    ('NPSX-CLR-LRT-p122-05', '', 'woodlot', 'documented', 'Little Round Top: the northern slope almost bare (Norton)',
     'Oliver Norton wrote in 1888 that on the northern slope of Little Round Top there was scarcely any vegetation and the ascent was not practicable for a man on horseback.', D2,
     {'q': 'On the northern slope there was scarcely any vegetation, and the ascent was not practicable for a man on horseback.', 'anchor': WEST_AREA, 'about': {'canopy': 'cleared'},
      'note': ACCOUNT + '. The cleared slope of the data is the Warren sheet\'s open ground on the west and north; the claim bears on it as a neighbourhood (role area).'}),
    ('NPSX-CLR-LRT-p123-03', '', 'woodlot', 'documented', 'Little Round Top: the crest covered with scrub oaks (New York Herald, 3 July)',
     'The New York Herald correspondent G. W. Hosmer, quoted by the report, wrote the day after the fighting that the crest of Little Round Top was covered with a growth of scrub oaks.', D23,
     {'q': 'the crest was covered with a growth of scrub oaks', 'anchor': LRT_E_AREA, 'note': ACCOUNT + ' (a newspaper account of 3 July 1863).'}),
    ('NPSX-CLR-LRT-p124-02', 'a', 'crop', 'documented', 'a wheat field about 500 yards wide crossed by the 4th Texas',
     'A soldier of the 4th Texas, in a letter of August 1863 quoted by the report, says the regiment had to charge through a wheat field about 500 yards wide under the fire of about 100 guns.', D2,
     {'q': 'had to charge through a wheat field about 500 yards wide with the Yankee artillery about 100 guns firing on us.', 'about': {'crop': 'wheat'}, 'note': ACCOUNT + ' (a letter to his mother of August 1863). Which field is not stated in the quoted words: not placed.'}),
    ('NPSX-CLR-LRT-p124-02', 'b', 'woodlot', 'documented', 'woods with a stone fence and a steep, rocky, heavily timbered side of a hill (4th Texas)',
     'The same letter says that after reaching the woods where there was a stone fence the regiment drove the Yankees from the fence and up the side of the mountain, which was quite steep and covered all over with large rocks and heavy timber.', D2,
     {'q': 'After reaching the woods where there was a stone fence, we run the Yankees from the fence and up the side of the mountain which was quite steep and covered all over with large rocks and heavy timber.',
      'note': ACCOUNT + '. The letter does not say which hill: not placed, and not used to read the west slope of Little Round Top as timbered.'}),
    ('NPSX-CLR-LRT-p125-05', '', 'woodlot', 'documented', 'a narrow strip of woods with large rocks (121st New York)',
     'The history of the 121st New York (1921), quoted by the report, says the regiment occupied an advanced position under cover of a narrow strip of woods along which were scattered a number of large rocks.', D2,
     {'q': 'occupied an advanced position under cover of a narrow strip of woods, along which were scattered a number of large rocks.', 'note': ACCOUNT + ' (published 1921). Not placed: the strip is not outlined.'}),
    ('NPSX-CLR-LRT-p125-06', '', 'woodlot', 'documented', 'Little Round Top: bushes, chiefly small pines, among a scattered grove of oaks (Spear)',
     'Major Ellis Spear of the 20th Maine, quoted by the report, says the 83rd Pennsylvania on the right of the 20th was not visible by reason of the bushes, chiefly small pines amongst the larger and more scattered grove of oak trees.', D2,
     {'q': 'The 83rd Penna. was on the right of the 20th but not visible by reason of the bushes, chiefly small pines amongst the larger and more scattered grove of oak trees.', 'anchor': LRT_E_AREA, 'note': ACCOUNT + '.'}),
    ('NPSX-CLR-LRT-p126-01', '', 'woodlot', 'documented', 'Little Round Top: ground sparsely covered with oaks too small to give protection (20th Maine)',
     'A veteran of Company H, 20th Maine, quoted by the report, says the ground sloped to the front and left and was sparsely covered with a growth of oak trees too small to afford any protection.', D2,
     {'q': 'The ground sloped to our front and left and was sparsely covered with a growth of oak trees, which were too small to afford us any protection.', 'anchor': LRT_E_AREA, 'note': ACCOUNT + '.'}),
    ('NPSX-CLR-LRT-p126-02', 'a', 'woodlot', 'documented', 'the valley between the two hills: smooth and thinly wooded (Maine at Gettysburg)',
     'Maine at Gettysburg (1898), quoted by the report, describes a smooth, thinly wooded valley between the two hills.', D2,
     {'q': 'a smooth, thinly wooded valley', 'anchor': LRT_E_AREA, 'note': ACCOUNT + ' (published 1898).'}),
    ('NPSX-CLR-LRT-p126-02', 'b', 'thicket', 'documented', 'the bottom of the valley: shrubbery and rocks (Maine at Gettysburg)',
     'The same book, quoted by the report, has the 15th and 47th Alabama form their ranks in the shrubbery and rocks in the bottom of the valley.', D2,
     {'q': 'in the shrubbery and rocks in the bottom of the valley.', 'anchor': LRT_E_AREA, 'note': ACCOUNT + ' (published 1898).'}),
    ('NPSX-CLR-LRT-p036-03', '', 'tree', 'documented', 'an old pine forward of the 140th New York Monument, alive at the battle',
     'The report says some trees identified as having been alive at the time of the battle, such as an old pine forward of the 140th New York Monument, were venerated and thus maintained.', {'from': '1863-07-02', 'to': '1863-07-03'},
     {'q': 'Some trees identified as having been alive at the time of the battle, such as an old pine forward of the 140th New York Monument, were venerated and thus maintained.', 'anchor': WEST_AREA, 'about': {'witness': 'WT-04'},
      'note': 'The report does not give the pine\'s height, age or place beyond "forward of" the monument. The monument is a later memorial: its position (the site\'s own) is used only as the locator of the tree.'}),
    ('NPSX-CLR-LRT-p043-01', '', 'woodlot', 'inferred', 'Little Round Top before the battle: a wood lot, or perhaps pasture, of nearby farms',
     'The report says the rocky, steep Little Round Top study area was not well suited to cultivation and served as a wood lot, or perhaps pasture, for nearby farms, and that its wood lots were actively managed.', {'to': '1863-07-01', 'basis': 'before the battle, 1740 to 1862'},
     {'q': 'The Little Round Top study area, based on its rocky soils and steep topography, was not well suited to cultivation and served as a wood lot, or perhaps pasture, for nearby farms. Wood lots on Little Round Top were actively managed.', 'anchor': LRT_E_AREA,
      'note': 'The report\'s own hedge ("or perhaps pasture"): inferred. It speaks of the whole study area, not of one tract.'}),
    ('NPSX-CLR-LRT-p043-02', '', 'woodlot', 'inferred', 'Little Round Top west slope lumbered several years before the battle',
     'The report says evidence from land titles and post-battle photographs suggests that the west slope was lumbered several years prior to the battle.', {'to': '1863-07-01', 'basis': 'several years before the battle'},
     {'q': 'Evidence from land titles and post-battle photographs suggest that the west slope was lumbered several years prior to the battle.', 'anchor': WEST_EXACT, 'about': {'canopy': 'cleared'},
      'note': 'Neither the land titles nor the photographs were read here. "Several years" differs from the "year or two" of the Hanaway-tract statement (VC-NPS-027) and the "year before" of the vista report: carried in the conflict CF-VEG-LRT as stated by each.'}),
    ('NPSX-CLR-LRT-p044-03', '', 'woodlot', 'documented', 'the west slope of Little Round Top, cleared by logging, used by the Signal Corps on 2 July',
     'The report says the western slope of Little Round Top, cleared by prior logging, provided a significant vantage point for the Union Signal Corps before noon on 2 July.', D2,
     {'q': 'Its western slope, cleared by prior logging, provided a significant vantage point for the Union Signal Corps before noon.', 'anchor': WEST_EXACT, 'about': {'canopy': 'cleared'}}),
    ('NPSX-CLR-LRT-p090-01', '', 'woodlot', 'documented', 'the west face of Little Round Top cleared of many trees and brush before the battle',
     'The report says the western face of Little Round Top is managed to appear much as it did in July 1863, having been cleared of many trees and brush sometime before the battle.', D2,
     {'q': 'The western face of Little Round Top is managed to appear much as it did in July of 1863, having been cleared of many trees and brush sometime before the battle.', 'anchor': WEST_EXACT, 'about': {'canopy': 'cleared'},
      'note': '"Many trees and brush", not all: the data carries the slope as open ground with the few scattered trees the vista report names (VC-NPSC-VISTA-CUTTING-p010-01).'}),
    ('NPSX-CLR-LRT-p090-02', '', 'ground', 'documented', 'the west slope today: sumac and red cedar are later than 1863',
     'The report says the old field of the western slope today is slightly more mature than what would have existed in 1863, with smooth sumac and eastern red cedar mixed in with the grasses: neither is drawn on the slope.', {'basis': '2010-11 condition compared with 1863'},
     {'q': 'Although the appearance of the western slope is similar, the species that populate it today indicate a slightly more mature old field than what would have existed in 1863: smooth sumac (Rhus glabra) and eastern red cedar (Juniperus virginiana) are commonly found mixed in with the grasses, perennials and annuals indicative of an old field.', 'anchor': WEST_EXACT}),
    ('NPSX-CLR-LRT-p090-03', '', 'ground', 'documented', 'the east slope forest today: few trees over 150 years old',
     'The report says even the mature forest of the eastern portion of the site has few trees over 150 years old, because of logging by private owners before the battle and later by the War Department and the Park Service: the trees standing there now are not the trees of 1863.', {'basis': '2010-11 condition; logging before and after the battle'},
     {'q': 'Even the mature forest along the eastern portion of the site contains few trees over 150 years old, due to the logging practices that occurred there by private owners prior to the Battle of Gettysburg and later by both the War Department and the National Park Service.', 'anchor': LRT_E_AREA}),
    ('NPSX-CLR-LRT-p039-02', '', 'ground', 'documented', 'vistas from Little Round Top cleared of tall trees in the vista cutting',
     'The report says that in the vista cutting vistas toward the Wheatfield and the Trostle farm were cleared of tall trees: trees tall enough to close those lines of sight stood there in 1939, and are later growth.', {'basis': 'vista cutting, 1939-1940s'},
     {'q': 'Vistas were also cleared of tall trees in the direction of the Wheatfield and the Trostle Farm.', 'anchor': WEST_AREA}),

    # ---- the Copse of Trees and Ziegler's Grove ("A Common Pride and Fame", part III)
    ('NPSX-COMMON-PRIDE-3-p015-01', '', 'woodlot', 'documented', 'the Copse of Trees: a thick growth of thin chestnut oaks (Captain Shields, 3 July)',
     'The study quotes Captain David Shields of Hays\'s staff, who rode to the copse on 3 July and found a thick growth of thin chestnut oaks that rose but little above his horse\'s head, on ground very rough and rocky and covered with brambles.', D3,
     {'q': 'a thick growth of thin chestnut oaks that rose but little above my horse\'s head. The ground around the copse was very rough and rocky and covered with brambles', 'anchor': COPSE, 'about': {'species': {'oak': 1.0}},
      'note': ACCOUNT + '. The oaks are named chestnut oaks (the layer\'s "oak" holds chestnut oak); the extent of the copse is not given and the Warren cluster that holds it is larger: the density of the thick growth and the brambles are not drawn (gap).'}),
    ('NPSX-COMMON-PRIDE-3-p015-02', '', 'woodlot', 'inferred', 'the trees of the Copse: no more than eight to ten feet high (the study\'s reasoning)',
     'The study reasons that if the trees or saplings were thin and reached little above Captain Shields\'s horse\'s head they could not have been more than eight to ten feet high.', D3,
     {'q': 'If the trees, or saplings, were "thin" and reached "little above"Captain Shields\' horse\'s head, they could not have been more than eight to ten feet high.', 'anchor': COPSE, 'about': {'height_m': [2.4, 3.1]},
      'note': 'The study\'s inference from one account, not a measurement: 8 to 10 feet is 2.4 to 3.1 m. The data draws the copse\'s trees in that range.'}),
    ('NPSX-COMMON-PRIDE-3-p014-01', '', 'woodlot', 'documented', 'the Copse described as a bunch of scrub oaks (Cowan)',
     'The study quotes Cowan\'s later letter describing the copse as a bunch of scrub oaks which separated his five guns from the angle where Cushing\'s Battery was firing.', D3,
     {'q': 'Cowan described the copse as a bunch of scrub oaks, which separated my five guns from the angle where Cushing\'s Battery was firing.', 'anchor': COPSE, 'note': ACCOUNT + '.'}),
    ('NPSX-COMMON-PRIDE-3-p014-03', '', 'woodlot', 'documented', 'bushes in front of the clump of trees, fifty or sixty yards toward the stone wall (Webb)',
     'The study quotes Webb\'s testimony that bushes stood in front of the clump of trees, possibly fifty or sixty yards toward the stone wall, and reads from it that the trees running down toward the fence must have been small.', D3,
     {'q': 'it was where some bushes were in front of the clump of trees, they were possibly fifty or sixty yards towards the stone wall.', 'anchor': COPSE, 'note': ACCOUNT + '.'}),
    ('NPSX-COMMON-PRIDE-3-p015-04', '', 'damage', 'documented', 'trees and bushes cut down at the copse before the assault (Hart)',
     'The study quotes Hart\'s trial testimony that the enemy came in on the regiment\'s rear down by the bushes they had cut down, a lot of trees in the rear having been cut down.', D3,
     {'q': 'and then the enemy came in on our rear, and came down by those bushes that we cut down, a lot of trees in our rear were cut down, and they got into us there.', 'anchor': COPSE,
      'note': ACCOUNT + '. When the trees were cut and how many is not stated: no event is made of it.'}),
    ('NPSX-COMMON-PRIDE-3-p015-05', '', 'woodlot', 'documented', 'the copse trees not cut down by the 69th Pennsylvania: small trees (Russell)',
     'The study quotes Henry Russell of the 72nd Pennsylvania on the trees not cut down by the 69th for its position along the fence: "Small trees they were at that time."', D3,
     {'q': 'Small trees they were at that time.', 'anchor': COPSE, 'note': ACCOUNT + '.'}),
    ('NPSX-COMMON-PRIDE-3-p015-03', '', 'woodlot', 'inferred', 'Ziegler\'s Grove: mature white and chestnut oaks, perhaps some black cherry',
     'The study says Ziegler\'s Grove had mature standing white and chestnut oaks, as well as perhaps some black cherry trees, which have a potential growth [the sentence goes on to the next page: 50 to 100 feet, at least five times the height of the young clump of trees].', D3,
     {'q': 'Ziegler\'s Grove, however, had mature standing white and chesnut oaks, as well as perhaps some black cherry trees, which have a potential growth', 'own_quote': True, 'anchor': ZIEG, 'about': {'species': {'oak': 0.9, 'black_cherry': 0.1}},
      'note': 'The study\'s inference ("perhaps"): species named, shares not (the 0.9 and 0.1 are a range assumption). The saved text prints "chesnut" for chestnut. The continuation on the next page is the correction row\'s context quote (PDF p. 16).'}),
    ('NPSX-COMMON-PRIDE-3-p006-01', '', 'woodlot', 'documented', 'Ziegler\'s Grove: a large wooded area and a landmark in 1863',
     'The study says Ziegler\'s Grove, a large wooded area north of the clump on the ridgeline, was a much larger and striking feature on the 1863 landscape than the clump.', D3,
     {'q': 'While there was no, hand-to-hand fighting within the grove as there was in the clump, it was a much larger and striking feature on the 1863 landscape.', 'anchor': ZIEG}),
    ('NPSX-COMMON-PRIDE-3-p006-02', '', 'ground', 'inferred', 'Ziegler\'s Grove: probably cut down after the battle, replanted in 1888',
     'The study says there was probably no Ziegler\'s Grove at the time Bachelder was impressed with the Copse of Trees, and that in November 1888 the Memorial Association replanted 125 trees in the grove, apparently to replace trees cut down there: the grove of 1863 was larger than the woods the Warren sheet shows (1868-69).', {'basis': 'after the battle; replanted November 1888'},
     {'q': 'He could not, because there was probably no Ziegler\'s Grove at the time Bachelder was so impressed with the Copse of Trees. In November 1888, just one year after Bachelder managed to get his resolution for the iron fence passed, the G3MA replanted 125 trees in Ziegler\'s Grove, apparently to replace trees cut down there.', 'own_quote': True, 'anchor': ZIEG,
      'note': 'The study\'s own "probably": inferred. It bears on the extent of the drawn grove (gap). Letter for letter as saved: the text layer reads "G3MA" where the study prints GBMA (the Gettysburg Battlefield Memorial Association).'}),
    ('NPSX-COMMON-PRIDE-3-p004-01', '', 'ground', 'documented', 'the copse trees cut down by their owner after the war',
     'Bachelder\'s recollection of 1894, quoted by the study: after the war he found the owner cutting the copse trees down, a dozen or more already lying on the ground, and persuaded him to spare them: the copse as the Warren sheet shows it is the part that was spared.', {'basis': 'the 1860s, after the war'},
     {'q': 'Later in the season while passing them one day I was shocked to find the owner engaged in cutting them down, a dozen or more already lying on the ground.', 'anchor': COPSE, 'note': ACCOUNT + ' (Bachelder\'s recollection of 1894).'}),
    ('NPSX-COMMON-PRIDE-1-p135-01', '', 'crop', 'documented', 'clover and grass in front of Hays\'s line on 3 July',
     'The study quotes a description of the Union position: skirmishers lay out several hundred yards in front in the clover and grass, a first line of infantry held a strong fence along the pike in front of Hays and a low stone wall further down the valley, and lay concealed in the grass in the intervening space.', D3,
     {'q': 'Skirmishers lay out several hundred yards in front in the clover and grass', 'anchor': {'gz': "Ziegler's Grove", 'bearing': 300, 'dist_m': 220, 'r_m': 260, 'class': 'field', 'k': 1}, 'about': {'crop': 'hay'},
      'note': ACCOUNT + '. Placed by a rule on the field cell nearest a point 220 m north-west of Ziegler\'s Grove, along the pike in front of Hays: tier inferred. Clover and grass are read as the layer\'s hay meadow.'}),
    ('NPSX-HB9-1954-p034-01', '', 'crop', 'documented', 'tall grass in front of the stone wall on 3 July',
     'The handbook says that a hundred yards from the stone wall, in the tall grass, the Confederates met Union skirmishers who fired and hastily withdrew.', D3,
     {'q': 'A hundred yards from the stone wall, in the tall grass, they encountered Union skirmishers who fired and hastily withdrew.', 'anchor': {'gz': 'The Angle', 'bearing': 270, 'dist_m': 100, 'r_m': 150, 'class': 'field', 'k': 1}, 'about': {'crop': 'hay'},
      'note': 'A handbook of 1954 as the report states it; placed by a rule on the field cell nearest a point 100 m west of the Angle: tier inferred. Tall grass is read as the layer\'s hay meadow, standing and uncut.'}),

    # ---- the plan of 1999, the assessment of 2017 and the inventory of the Eisenhower farm
    ('NPSX-GMP-1999-V1-p061-01', '', 'geometry', 'documented', 'the park\'s own totals of 1863: woodlots and woodlands, orchards, fences',
     'The plan\'s Table 1 gives for the 1863 landscape woodlots and woodlands 898 acres, orchards 230 acres and historic fences 160 linear miles (1993: 1,974 acres, 18 acres, 43 miles); the page does not say what area the table covers.', {'basis': 'the park\'s base map of 1863, as compared in 1998'},
     {'q': 'Table 1: Comparison of Landscape Features, 1863 and 1993 1863 Landscape Units 1993 Landscape Woodlots and Woodlands Acres 898 1,974 Orchards Acres 230 18 Historic Fences Linear miles 160 43', 'own_quote': True, 'about': {'woods_acres': 898, 'orchard_acres': 230},
      'note': 'A coverage check, not an exact target (DD-NPS-07): the area the table covers is unstated. The build compares the layer\'s own acres with it (meta.coverage).'}),
    ('NPSX-GMP-1999-V1-p060-03', '', 'thicket', 'documented', 'the area between the Codori and Trostle houses was a thicket at the time of the battle',
     'The plan says some areas that were thickets at the time of the battle, for example the area between the Codori and Trostle houses, had grown into woodlands by the time of its 1895 map.', B,
     {'q': 'some areas that were thickets at the time of the battle, for example the area between the Codori and Trostle Houses, had grown into woodlands.', 'anchor': {'poly': 'LC-WET-0001'}, 'about': {'canopy': 'thicket'}}),
    ('NPSX-GMP-1999-V1-p067-01', '', 'ground', 'documented', 'the Peach Orchard of today bears little resemblance to 1863',
     'The plan\'s caption says the present day Peach Orchard is managed in modern fashion for fruit production and bears little resemblance to its state in 1863.', {'basis': '1998 condition compared with 1863'},
     {'q': 'The present day Peach Orchard is managed in modern fashion for fruit production and bears little resemblance to its state in 1863.', 'anchor': {'poly': 'LC-ORCH-0206'}}),
    ('NPSX-GMP-1999-V1-p067-02', '', 'ground', 'documented', 'Reynolds Woods: thicker and choked with undergrowth now than in the photograph of 1863',
     'The plan\'s caption pairs a photograph of Reynolds Woods from McPherson Ridge in 1863 with the remark that the woods are now thicker and choked with undergrowth, so that it is hard to understand how troops could have moved through them in the battle.', {'basis': '1998 condition compared with a photograph of 1863'},
     {'q': 'Reynolds Woods from McPherson Ridge, 1863. Now these woods are thicker and choked with undergrowth, and it is difficult to understand how troops could have moved through this area in battle.', 'anchor': {'poly': 'LC-WOOD-0010'},
      'note': 'The primary document is the Library of Congress photograph of 1863, not read for its vegetation here (register: photographs).'}),
    ('NPSX-GMP-1999-V1-p068-01', '', 'woodlot', 'documented', 'the Herbst woodlot was open: an avenue of approach for troops',
     'The plan says park historians found the Herbst woodlot was among other things an avenue of approach for troops, so that its open quality contributed to its use during the battle.', B,
     {'q': 'the Herbst woodlot was, among other things, an avenue of approach for troops; therefore, the open quality of the woodlot contributed to its use during the battle and to its significance.', 'anchor': {'poly': 'LC-WOOD-0010'}, 'about': {'understory': 'open'},
      'note': 'Placed on the Warren polygon of the Herbst Woods and McPherson woodlots (the complex holds Herbst\'s). The same page says Patterson woods was used for concealment only, so its openness does not matter (no state is read from that).'}),
    ('NPSX-GMP-1999-V1-p040-01', '', 'ground', 'documented', 'the pattern of open and wooded ground was lost: boundaries of woods not kept',
     'The plan says managers made little attempt to keep the boundaries of wooded areas at their historical limits, so that the pattern of open and wooded terrain that determined where the armies moved was lost or obscured, as at Culp\'s Hill and between Warfield Ridge and Little Round Top.', {'basis': '1930s to 1990s'},
     {'q': 'For example, managers made little attempt to keep boundaries of wooded areas at their historical limits. This meant that a very significant feature of the battle landscape, the pattern of open and wooded terrain that determined where the armies moved and why, was lost or obscured.'}),
    ('NPSX-GMP-1999-V1-p174-02', '', 'ground', 'documented', 'thickets of the battle are mature woodlands today',
     'The plan says areas that were thickets during the battle are mature woodlands today, and unused farm fields have become wooded in the 135 years since: modern tree cover is not read into 1863.', {'basis': '1998 condition'},
     {'q': 'For example, areas that were thickets during the battle are mature woodlands today, and unused farm fields have become wooded in the intervening 135 years since the battle.'}),
    ('NPSX-GMP-1999-V1-p185-01', '', 'regional', 'documented', 'the original forest of the district had been cleared by settlers',
     'The plan says the original forest that covered most of the Gettysburg area disappeared as 18th and 19th century settlers cleared areas for farming and used forests for fuel and building.', {'basis': 'before 1863'},
     {'q': 'The original forest that covered most of the Gettysburg area disappeared as 18th and 19th century settlers cleared areas for farming and used forests for fuel and building.'}),
    ('NPSX-NRCA-2017-p129-01', '', 'woodlot', 'inferred', 'woodlots of 1863 used as pastures: open-grown white oak (assessment of 2017)',
     'The assessment says forested woodlots were important resources for the residents before the battle and that open-grown white oak was the dominant vegetation in the 1863 woodlots that were being used as pastures; the same report elsewhere names a dense understory as the 1863 condition to maintain (conflict CF-VEG-UNDER).', {'basis': 'pre-1863 to 1863, a recent assessment resting on a forestry study'},
     {'q': 'Open-grown white oak (Quercus alba) was the dominant vegetation in the 1863 woodlots that were being used as pastures.', 'about': {'understory': 'open'}, 'note': 'Not placed: it speaks of the woodlots used as pastures in general. It is one reading of the conflict CF-VEG-UNDER.'}),
    ('NPSX-NRCA-2017-p129-02', '', 'woodlot', 'documented', 'woodlots before the battle: uneven-aged, kept so by frequent partial cutting',
     'The assessment says that before the battle the woodlots had an uneven-aged structure maintained by frequent partial cutting, and that when the park was established (1895) cutting ceased and second and third growth understory developed.', {'basis': 'before the battle; the understory grew after the park was established'},
     {'q': 'Before the battle, the woodlots had an uneven-aged structure that was maintained by frequent partial cutting. When the park was established, cutting practices within the woodlots ceased and second and third growth understory developed (Bowersox et al. 2004).', 'about': {'understory': 'open'},
      'note': 'Not placed. The understory that developed after 1895 is later growth: it is not read into 1863. One reading of the conflict CF-VEG-UNDER.'}),
    ('NPSX-NRCA-2017-p199-01', '', 'woodlot', 'inferred', 'a dense understory in woodlots as the 1863 condition to maintain (assessment of 2017)',
     'The assessment lists among the park\'s management objectives maintaining the landscape as it existed in the battle, naming a dense understory in woodlots as its example: a management objective, set against the same report\'s open-grown woodlots (conflict CF-VEG-UNDER).', {'basis': 'a management objective of 2017'},
     {'q': 'the historic 1863 Civil War battle (e.g., dense understory in woodlots) in GETT', 'about': {'understory': 'thick'}, 'note': 'Not placed. One reading of the conflict CF-VEG-UNDER; the report gives no 1863 source for it.'}),
    ('NPSX-NRCA-2017-p199-02', '', 'ground', 'documented', 'deer culling since 1995 to restore a dense understory',
     'The assessment says that to increase forest regeneration, restore a dense understory in the woodlots and reduce crop damage the Park Service began culling deer in 1995: the dense understory is a goal of that year, not an observation of 1863.', {'basis': '1995 management'},
     {'q': 'Thus to increase forest regeneration, restore a dense understory in the woodlots, and reduce crop damage the NPS began culling deer in 1995 to reach a density goal of 10 deer km-2 of forest (Stainbrook and Diefenbach et al. 2012).'}),
    ('NPSX-EISE-CLI-REDDING-2004-p034-03', '', 'regional', 'documented', 'crop fields and pastures round the building clusters since the mid-nineteenth century',
     'The inventory says crop fields and pastures surround the building clusters and have existed since at least the mid-nineteenth century.', {'basis': 'since the mid-nineteenth century'},
     {'q': 'Crop fields and pastures surround the building clusters and have existed since at least the mid-nineteenth century.'}),

    # ---- the plan for the south end (1985) and the farm Guinn
    ('NPSX-DCP-LRT-p014-07', '', 'woodlot', 'documented', 'woodlots of the south end: nine historic wooded areas',
     'The plan for the south end says most historic farms had a woodlot or woods that provided almost all the needs for timber, firewood, furniture and tools, and that there were nine historic wooded areas on the southern part of the second-day battlefield.', B,
     {'q': 'Most historic farms had a woodlot or woods that provided almost all the needs for timber, firewood, furniture, and tools. There were nine historic wooded areas on the southern part of the second-day battlefield.'}),
    ('NPSX-DCP-LRT-p014-08', '', 'orchard', 'documented', 'the Sherfy peach orchard: the largest orchard on the battlefield, 13 acres',
     'The plan says many historic farms included orchards, that the Sherfy peach orchard is the largest and most historically significant orchard identified on the battlefield, a pioneer orchard and the focus of a small local canning industry, and that the original orchard was 13 acres.', B,
     {'q': 'The largest and most historically significant orchard identified on the battlefield is the Sherfy peach orchard. This orchard was a pioneer orchard where new growing methods were used, and it was the focal point of a small, local canning industry. The original orchard was 13 acres;', 'anchor': {'poly': 'LC-ORCH-0206'},
      'note': 'The Warren polygon of the Peach Orchard is 15.5 acres and includes the J. Want orchard block north of the Wheatfield Road (the polygon\'s own note): the plan\'s 13 acres is the Sherfy orchard alone.'}),
    ('NPSX-DCP-LRT-p014-09', 'a', 'orchard', 'documented', 'an orchard on the Rose farm',
     'The plan says other orchards in the south end of the park included those at the Rose, Bushman and Trostle farms.', B,
     {'q': 'Other orchards in the south end of the park included those at the Rose, Bushman, and Trostle farms.', 'anchor': {'farm': 'rose', 'r_m': 450, 'class': 'orchard', 'area': True}, 'note': 'Placed as a neighbourhood (role area): the orchards within 450 m of the farmstead.'}),
    ('NPSX-DCP-LRT-p014-09', 'b', 'orchard', 'documented', 'an orchard on the Bushman farm',
     'The plan says other orchards in the south end of the park included those at the Rose, Bushman and Trostle farms.', B,
     {'q': 'Other orchards in the south end of the park included those at the Rose, Bushman, and Trostle farms.', 'anchor': {'farm': 'bushman', 'r_m': 450, 'class': 'orchard', 'area': True}, 'note': 'Placed as a neighbourhood (role area): the orchards within 450 m of the farmstead.'}),
    ('NPSX-DCP-LRT-p014-09', 'c', 'orchard', 'documented', 'an orchard on the Trostle farm',
     'The plan says other orchards in the south end of the park included those at the Rose, Bushman and Trostle farms.', B,
     {'q': 'Other orchards in the south end of the park included those at the Rose, Bushman, and Trostle farms.', 'anchor': {'farm': 'trostle', 'r_m': 450, 'class': 'orchard', 'area': True}, 'note': 'Placed as a neighbourhood (role area): the orchards within 450 m of the farmstead.'}),
    ('NPSX-DCP-LRT-p018-01', '', 'ground', 'documented', 'woodlands of 1985 stand on land that was cleared at the time of the battle',
     'The plan says some of the existing woodlands have taken over areas that were cleared lands at the time of the battle.', {'basis': '1985 condition compared with 1863'},
     {'q': 'Some of the existing woodlands have taken over areas that were cleared lands at the time of the battle.'}),
    ('NPSX-DCP-GUINN-p011-03', '', 'regional', 'documented', 'the Guinn farm: partly in agriculture, partly wooded, three streams',
     'The plan for the Guinn farm says that at the time of the fighting the site (the part south of the farm buildings) was partly in agriculture and partly wooded and had three streams, and that its westernmost section, in agriculture, was a shortcut between the Taneytown Road and the Baltimore Pike for Union troops on 2 and 3 July.', D23,
     {'q': 'At the time of the fighting the site was partially in agriculture and partially wooded and had three streams. The westernmost section, which was in agriculture, was used as a shortcut between Taneytown Road and Baltimore Pike by Union troops moving to and from Culps Hill and the Cemetery Ridge line on July 2nd and 3rd.',
      'note': 'The Guinn farm has no farmstead outline in the repository: documented but not placed.'}),
    ('NPSX-DCP-GUINN-p011-05', '', 'ground', 'documented', 'the Guinn farm\'s open meadows grew into woods in the 1920s and 1930s',
     'The plan says the site remained in farmland until the 1920s and 1930s and that its historically open meadow sections then grew up into woods: that woodland is later than 1863.', {'basis': '1920s and 1930s'},
     {'q': 'The historically open meadow sections of the site grew up into woods during this time, extending the vegetation line up to the residences and northward and eastward to Hunt Avenue.'}),

    # ---- the McPherson farm study (1977)
    ('NPSX-HS-MCPHERSON-p023-01', 'a', 'farm_inventory', 'documented', 'McPherson farm in 1863: over half of 95 acres in wheat, corn, oats and grass',
     'The study says that over half of the 95 acres of the farm (the tenant Slentz\'s farm at the planting of 1863) was planted in crops, wheat, corn, oats and grass.', {'from': '1863-06-01', 'to': '1863-07-01'},
     {'q': 'Over half of the 95 acres was planted in crops--wheat, corn, oats, and grass.', 'about': {'farm': 'mcpherson', 'crops_named': ['wheat', 'corn', 'oats', 'grass']}, 'note': 'The acres by crop are the tenant\'s claim (next claims and VC-NPS-031): the two transcriptions differ (conflict CF-VEG-MCPHERSON).'}),
    ('NPSX-HS-MCPHERSON-p023-01', 'b', 'orchard', 'documented', 'McPherson farm: about thirty acres of woodland, pasture and a young orchard',
     'The study says the remainder of the 95 acres, about thirty acres, was woodland and pasture for the stock and a young orchard for home preserving and cooking use.', {'from': '1863-06-01', 'to': '1863-07-01'},
     {'q': 'The remainder, about thirty acres, was in woodland and pasture for the stock and a young orchard for home preserving and cooking use.', 'about': {'farm': 'mcpherson', 'age': 'young'},
      'note': 'No Warren orchard polygon lies within 400 m of the farmstead (the Warren sheet maps no tree region under about 0.6 ha, and the park report puts the fruit garden at about 9 trees): the orchard is documented and not drawn.'}),
    ('NPSX-HS-MCPHERSON-p048-01', '', 'orchard', 'documented', 'the orchard south of the McPherson barn, where the 150th Pennsylvania stood on 1 July',
     'The study says Stone\'s Brigade was deployed with the 150th Pennsylvania in the orchard south of the McPherson barn, the 149th lying in the lane fronting the barnyard, and the 143rd behind them with its right near the stone barn and its left toward Herbst Woods.', D1,
     {'q': 'orchard south of the McPherson barn', 'note': 'Not placed: no orchard polygon lies near the farmstead (see the claim before). The quote is cut short on both sides because the saved text has a footnote number before it and reads "lB9th" for 149th after it.'}),
    ('NPSX-HS-MCPHERSON-p043-01', '', 'crop', 'documented', 'a high wheat field north of the railroad grading on 1 July',
     'The study says many men of Davis\'s captured brigade made good their escape running west through the cut, scaling the embankments and heading for the Confederate lines through a high wheat field north of the railroad grading.', D1,
     {'q': 'through a high wheatfield north of the railroad grading.', 'anchor': dict(RR_N, bearing=340), 'about': {'crop': 'wheat'},
      'note': 'Placed by a rule on the field cell nearest a point 120 m north-north-west of the unfinished railroad\'s grade at its nearest point to the McPherson farmstead: tier inferred. The saved text reads "h igh w h e a t fie ld".'}),
    ('NPSX-HS-MCPHERSON-p063-01', '', 'crop', 'documented', 'high wheat crawled through by Confederates on 1 July',
     'The study says a squad of Confederates (probably of the 32nd North Carolina) crawled on their hands and knees through the high wheat to escape detection and surprised the color guard of the 149th Pennsylvania, isolated north of the Cashtown Pike.', D1,
     {'q': 'These Confederates had crawled on their hands and knees through the high wheat to escape detection,', 'anchor': dict(RR_N, bearing=20, dist_m=140), 'about': {'crop': 'wheat'},
      'note': 'Placed by a rule on the field cell nearest a point 140 m north-north-east of the railroad grade (the guard stood north of the pike near the cut): tier inferred.'}),
    ('NPSX-HS-MCPHERSON-p067-01', '', 'farm_inventory', 'documented', 'the McPherson farm: cornfields and an orchard',
     'The study says that when the last of Stone\'s Brigade fell back, the McPherson acreage saw no more hostilities over its cornfields and orchard.', D1,
     {'q': 'McPherson\'s acreage saw no more hostilities over its cornfields and orchard.', 'about': {'farm': 'mcpherson', 'crops_named': ['corn']}}),
    ('NPSX-HS-MCPHERSON-p033-01', 'a', 'woodlot', 'documented', 'Herbst Woods: the woodlot portion of the 160-acre Herbst farm',
     'The study says the entire length and width of the grove called Reynolds Woods or McPherson Woods was owned by John Herbst at the time of the battle and was the woodlot portion of his 160-acre farm; no McPherson ever owned the Herbst Woods.', {'basis': 'at the time of the battle'},
     {'q': 'But the fact remains that the entire length and width of the grove was owned by John Herbst at the time of the Battle of Gettysburg, and was the woodlot portion of the 160-acre Herbst Farm.', 'anchor': {'poly': 'LC-WOOD-0010'}}),
    ('NPSX-HS-MCPHERSON-p033-01', 'b', 'woodlot', 'documented', 'the McPherson woodlot lay north of the Cashtown Pike, east of the Wills farm',
     'The study says the McPherson woodlot, at the time of the battle, was north of the Cashtown Pike and east of the James Wills farm (the area now called Sheads\' Woods).', {'basis': 'at the time of the battle'},
     {'q': 'The McPherson woodlot, at that time, was north of the Cashtown Pike and east of the James Wills Farm (in the area now erroneously called Sheads\' Woods).', 'anchor': {'poly': 'LC-WOOD-0010'},
      'note': 'The Warren polygon is named Herbst Woods / McPherson woodlots (a complex): both are in it; the layer does not separate them.'}),
    ('NPSX-HS-MCPHERSON-p070-01', '', 'tree', 'inferred', 'a large white oak just north of Herbst Woods: a third of its present girth in 1863',
     'The study says a large white oak just north of Herbst Woods and the old fence line, fifty yards east of the 7th Wisconsin monument, with a girth of over nine feet in 1977 and an age of about 170 years, would have been about one third of that size in 1863.', D1,
     {'q': 'A large white oak, just north of Herbst Woods and the old fence line, stands at fifty yards east of the 7th Wisconsin monument. This tree, with a circumference of over nine feet now, is approximately 170 years old, and is apparently the only old tree in this part of the field north of the woods. It would have been about one-third that size in 1863', 'about': {'witness': 'WT-05'},
      'note': 'The study\'s reconstruction of the tree\'s size (inferred). The monument is a later memorial: its position (the site\'s own) is used only as the locator.'}),
    ('NPSX-HS-MCPHERSON-p099-01', '', 'farm_inventory', 'documented', 'McPherson tenant\'s claim abstract of 1863: acres of wheat, corn, oats, grass and potatoes',
     'The study\'s Appendix A lists for the tenant\'s claim of damage to real estate 18 acres of wheat, 16 of corn, 14 of oats, 18 of grass and half an acre of potatoes: it differs from the Cultural Landscape Report\'s 9 acres of wheat and 4 of oats (VC-NPS-031) for the same claim (conflict CF-VEG-MCPHERSON).', {'basis': 'the claim of 1863, transcribed in 1977'},
     {'q': '18 acres Wheat 16 acres Corn 1U " Oats 18 " Grass 1 2 " Potatoes', 'own_quote': True, 'about': {'farm': 'mcpherson', 'crops': {'wheat': 18, 'corn': 16, 'oats': 14, 'grass': 18, 'potatoes': 0.5}, 'alt_reading': 'study-1977'},
      'note': 'Letter for letter as saved: the text layer reads 1U for the 14 acres of oats and "1 2" for the half acre (the table\'s figures as the web task read them from the page). Held as the other reading of the district mix: the build computes the mix with it as well (meta.district_mix_alt) and uses the Cultural Landscape Report\'s figures by default.'}),
    ('NPSX-HS-MCPHERSON-p101-01', 'a', 'damage', 'documented', 'McPherson tenant\'s petition: crops and hay in the barn entirely destroyed',
     'The study transcribes the tenant\'s petition that during the battle and by the encampment and the occupancy by the rebels after the Union army fell back his crops and the hay in the barn were entirely destroyed.', {'basis': 'the petition of 1868, transcribed in 1977'},
     {'q': 'his crops and hay in the Barn were entirely destroyed', 'about': {'farm': 'mcpherson'}, 'note': 'A claimant\'s sworn statement, not a survey of the damage (DD-NPS-08).'}),
    ('NPSX-HS-MCPHERSON-p101-01', 'b', 'damage', 'documented', 'McPherson tenant\'s petition: 18 acres of growing wheat',
     'The same petition lists among the property destroyed or carried away 18 acres of growing wheat.', {'basis': 'the petition of 1868, transcribed in 1977'},
     {'q': 'destroyed or carried away as follows-- 18 acres growing wheat', 'about': {'farm': 'mcpherson', 'wheat_acres': 18}, 'note': 'A claimant\'s sworn statement (DD-NPS-08). The Cultural Landscape Report gives 9 acres of wheat for the same farm (VC-NPS-031): conflict CF-VEG-MCPHERSON.'}),

    # ---- the cemetery report: the four fields and the Meyers orchard
    ('NPSX-CLR-CEMETERY-p044-01', '', 'regional', 'documented', 'the site of the national cemetery in July 1863: four fenced fields and part of an orchard',
     'The report says that in July 1863 the 22-acre site of the national cemetery, with the annex, comprised four fenced fields and a portion of an orchard north and west of Evergreen Cemetery: the Menchy field and orchard on the Meyers property fronting Baltimore Pike, the Pierce field at the juncture of the Emmitsburg and Taneytown roads, and the Benner and Weirick fields between Evergreen Cemetery and Taneytown Road.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'In July 1863, the 22-acre site of the national cemetery, including the annex, comprised four fenced fields and a portion of an orchard north and west of Evergreen Cemetery, between Taneytown Road, Steinwehr Avenue (then known as Emmitsburg Road), and Baltimore Pike.',
      'note': 'The outlines of the four fields are in the report\'s Drawing 1.1, which the repository does not hold: documented and not placed (gap G18).'}),
    ('NPSX-CLR-CEMETERY-p045-05', '', 'regional', 'documented', 'the four fields: no trees or buildings (one exception); hayfield, pasture or crops since the late eighteenth century',
     'The report says there were no trees, buildings (with one exception) or other features in the fields that interrupted their open spatial character, that the land had been used for agriculture since the late eighteenth century as hayfield or pasture or for cultivated crops (apart from the Meyers property), and that between 1 and 3 July each field was used with artillery on the upper elevations and south end and infantry along the stone walls on the lower northern parts.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'There were no trees, buildings (with one exception), or other features in these fields that interrupted the open spatial character.', 'note': 'Not placed (gap G18). The Warren sheet shows tree-symbol clusters near the site (Evergreen Cemetery\'s own trees may be the cause): the overlap is not resolved here.'}),
    ('NPSX-CLR-CEMETERY-p045-06', '', 'orchard', 'documented', 'the Meyers orchard: fruit growing on the southern part of the Meyers property',
     'The report says the southern part of the Meyers property was used for fruit growing in 1863, and that the Meyers orchard was north of the lines of the 75th Pennsylvania and the 82nd Ohio and, while not in the direct line of fire, undoubtedly received some damage.', D23,
     {'q': 'The Meyers orchard was north of the lines of the 75th Pennsylvania Volunteers and 82nd Ohio Volunteers. While not in the direct line of fire, the orchard undoubtedly received some damage.', 'anchor': MEYERS,
      'note': 'Placed by a rule on the orchard polygon nearest a point 110 m north of the 75th Pennsylvania\'s monument (a later memorial, used only as the locator): the Warren orchard of 7.1 acres: tier inferred. The damage is the report\'s own hedge ("undoubtedly"): no event is made of it.'}),
    ('NPSX-CLR-CEMETERY-p045-07', '', 'crop', 'documented', 'the Menchy field: grass or grain in 1863',
     'The report says the Menchy field was used for growing grass or grain in 1863.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'The Menchy field was used for growing grass or grain in 1863.', 'note': 'Not placed (gap G18).'}),
    ('NPSX-CLR-CEMETERY-p046-01', '', 'crop', 'documented', 'the Pierce field: grass or grain in 1863',
     'The report says the Pierce field was used for growing grass or grain in 1863.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'The Pierce field was used for growing grass or grain in 1863.', 'note': 'Not placed (gap G18).'}),
    ('NPSX-CLR-CEMETERY-p046-02', '', 'crop', 'documented', 'the Benner field: wheat and corn in 1863',
     'The report says that in 1863 the Benner field was used to grow wheat and corn.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'In 1863, the Benner field was used to grow wheat and corn.', 'note': 'Not placed (gap G18).'}),
    ('NPSX-CLR-CEMETERY-p047-01', '', 'crop', 'documented', 'the Weirick field: corn in 1863',
     'The report says the Weirick field, owned by John Weirick, was used for growing corn in 1863.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'The Weirick field, owned by John Weirick, was used for growing corn in 1863.', 'note': 'Not placed (gap G18).'}),
    ('NPSX-CLR-CEMETERY-p044-06', '', 'woodlot', 'inferred', 'a mature grove on the south-eastern side of the southern hill: oak, ash, hickory',
     'The report says that on the south-eastern side of the southern hill, extending east from the border of Evergreen Cemetery toward Taneytown Road, was a mature grove of trees, perhaps a fragment of the native forest or an old second-growth woodlot, most likely oak, ash and hickory and other native species.', {'from': '1863-07-01', 'to': '1863-07-03'},
     {'q': 'On the southeastern side of this hill extending east from the border of Evergreen Cemetery toward Taneytown Road was a mature grove of trees—perhaps a fragment of the native forest or an old second-growth woodlot. It was most likely characterized by oak, ash, and hickory, and other native species that preferred well-drained and warm south-facing sites.',
      'note': 'The report\'s own hedges ("perhaps", "most likely"): inferred. Not placed: the direction words ("southeastern side", "extending east ... toward Taneytown Road") do not fit one reading of the ground.'}),
    ('NPSX-CLR-CEMETERY-p048-02', '', 'orchard', 'inferred', 'the Meyers apple orchard: nursery-grown trees about thirty feet apart',
     'The report says that other than crops the only known vegetation on the site by July 1863 was the Meyers apple orchard, described by a veteran as an orchard of gnarled old leafy trees, that it served as cover for infantry and artillery, that it appears to have followed advances in fruit growing with even spacing of nursery-grown trees generally about 30 feet apart, and that it probably included several varieties of apple.', D23,
     {'q': 'Vegetation Other than crops, the only known vegetation (managed plant material) in the national cemetery site by July 1863 was the Meyers apple orchard, which was described as “an orchard of gnarled old leafy trees,” by one veteran.66 The orchard served as a cover both for infantry and artillery. While older farm orchards of the period often consisted of seed trees scattered across a field, it appears the Meyers orchard, which was probably more of a gentleman’s orchard than a farm orchard, may have followed advances in fruit growing with ample, even spacing of nursery-grown trees, generally about 30 feet apart.',
      'anchor': MEYERS, 'about': {'species': {'apple': 1.0}, 'spacing_m': [9.14, 9.14]},
      'note': 'The spacing is the report\'s own hedge ("it appears", "may have"): inferred, 30 feet is 9.14 m. An apple orchard (the report names it so); the varieties are not drawn.'}),
    ('NPSX-CLR-CEMETERY-p069-01', '', 'orchard', 'documented', 'the Meyers orchard still stood in the fall of 1863 or early 1864',
     'The report\'s caption of a photograph of the reinterment work in the Pennsylvania plot, looking north-east, says a portion of the Meyers orchard is visible in the background in fall 1863 or early 1864.', {'from': '1863-10-01', 'to': '1864-03-31', 'basis': 'caption of a photograph, fall 1863 or early 1864'},
     {'q': 'Reinterment work underway in the Pennsylvania plot, looking northeast with a portion of the Meyers orchard visible in the background, fall 1863 or early 1864.', 'anchor': MEYERS,
      'note': 'The photograph itself was not read here. It bears on the day of the dedication, 19 November 1863: the orchard stood (leaf-off).'}),
]

# rows read and left out, each with the reason (so that a row of the correction file cannot be skipped silently)
LEFT_OUT_B = {
    'NPSX-CLR-LRT-p036-01': 'the Commission\'s aim of 1895 to 1922 (keep the arrangement of the existing woods and fields): management of a later time, no state of 1863',
    'NPSX-CLR-LRT-p036-02': 'says that tree lines of 1863 were not strictly maintained and that photographs of 1895 to 1938 show the views narrowing: no species, place or state of 1863 beyond what the held claims give',
    'NPSX-CLR-LRT-p039-01': 'a recommendation of 1939 (thin the brush of the west slope, leave a scattered growth of medium pine and oak) carried out in the late 1940s: a proposal and a later state, not a state of 1863',
    'NPSX-GMP-1999-V1-p087-01': 'the 1982 plan and the cutting under it in the 1980s: management, not a state of 1863',
    'NPSX-GMP-1999-V1-p040-02': 'a general statement that field topography, lanes, fences, wetlands, orchards and farm boundaries were changed for modern machinery (the structures layer\'s concern); the smaller size of the fields of 1863 is held (VC-NPSX-CLR-ROT-V1-p069-01)',
    'NPSX-GMP-1999-V1-p180-01': 'field sizes and crops of modern agriculture: not a state of 1863',
    'NPSX-GMP-1999-V1-p126-01': 'a planning prescription of alternative B measured against the park\'s map of 1863: use indirect (DD-NPS-07), a proposal',
    'NPSX-GMP-1999-V1-p151-01': 'a planning prescription of alternative D: use indirect (DD-NPS-07), a proposal',
    'NPSX-NRCA-2017-p129-03': 'the area of the park\'s woodlots in 2004 (799 ha of 2,423 ha): a modern figure',
    'NPSX-NRCA-2017-p130-01': 'rehabilitation cuts of the 2000s and the age of the park\'s vegetation map: modern',
    'NPSX-NRCA-2017-p039-01': 'a general statement of the present state (features altered, overgrown, with non-native species): the same facts are held as claims of kind ground (VC-NPSC-WEB-BATTLEFIELD-REHAB-p001-04, -p001-05)',
    'NPSX-EISE-CLI-REDDING-2004-p034-01': 'scattered fruit trees of today and the orchard the Warren survey of 1868 shows, which is the Warren orchard polygon the layer already draws; the farm has no farmstead outline in the repository',
    'NPSX-EISE-CLI-REDDING-2004-p034-02': 'a present-day stand of old hickories and a suggestion by the park historian without a date or an outline',
    'NPSX-HB9-1954-p050-01': 'a handbook\'s description of the ground as the visitor saw it in 1954, not dated to 1863',
    'NPSX-CLR-CEMETERY-p038-01': 'the site of Evergreen Cemetery as it was chosen in 1853, before the cemetery was laid out in 1854: not a state of 1863',
    'NPSX-FD-2016-p007-01': 'the park\'s figures of 2016 (acres of woodlots, orchards, fence): a modern, rehabilitated state',
    'NPSX-WEB-DEVILS-DEN-REHAB-p001-01': 'a rehabilitation project of the 2020s that removes woody growth to reflect 1863: later than 1863; the open character of Devil\'s Den is held (VC-NPSC-CLR-ROT-V2-p140-01)',
    'NPSX-DCP-LRT-p009-01': 'a clearing of the 1980s on the west slope of Little Round Top and Houck\'s Ridge to re-create the historic scene: management; the regrowth it removed is held in VC-NPSC-VISTA-CUTTING-p011-01b and VC-NPSC-CLI-ERR-p097-01',
}

# rows read and left out, each with the reason (so that a row of the correction file cannot be skipped silently)
LEFT_OUT = {
    'NPSX-CLR-1STDAY-p049-03': 'the sentence does not name its farm (in the saved text it follows the end of the Forney description where the text layer interleaves two farms); a claim without a farm cannot be placed or cited as a place',
    'NPSX-WEB-NATURAL-FEATURES-p001-02': 'acreage in crops today: modern and not about a place or a date of 1863',
    'NPSX-WEB-NATURAL-FEATURES-p001-05': 'regeneration studies since 1985: not about 1863 vegetation',
    'NPSX-CLI-ERR-p095-09': 'farming after the battle (1864-1895): not the state of 1863',
    'NPSX-CLR-ROT-V1-p171-01': "a damage claimant's trade (canned fruit taken or destroyed): not about what grew where (also in the exclusion list of gen_nps_claims.py)",
}
LEFT_OUT.update(LEFT_OUT_B)


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    rows = {}
    for l in open(src, encoding='utf-8'):
        if l.strip():
            r = json.loads(l)
            if str(r.get('id', '')).startswith('R20'):
                rows[r['xid']] = r
    out, bad = [], []
    for xid, suf, kind, tier, feat, says, when, ex in CURATED:
        r = rows.get(xid)
        if r is None:
            bad.append((xid, 'no such row in the correction file'))
            continue
        c = r['citation']
        q = ex.get('q') or c['quote']
        if norm(q) not in norm(c['quote']) and not ex.get('own_quote'):
            bad.append((xid + suf, 'q is not a verbatim part of the row quote'))
            continue
        sid = c['source_id']
        s = ex.get('src') or ('NPS:' + sid)
        d = {'id': 'VC-NPSC-' + xid.replace('NPSX-', '') + suf, 'src': s, 'quote': norm(q), 'tier': tier, 'kind': kind, 'says': says, 'feature': feat, 'when': when,
             'xid': xid, 'pdf_page': c.get('pdf_page'), 'printed_page': c.get('printed_page')}
        for k in ('anchor', 'about', 'note'):
            if ex.get(k):
                d[k] = ex[k]
        out.append(d)
    used = {xid for xid, *_ in CURATED} | set(LEFT_OUT)
    # rows that other claim files already hold (by xid or by their quote) are not new
    have = set()
    for f in os.listdir(HERE):
        if f.startswith('claims_') and f.endswith('.json') and f not in ('claims_verified.json', os.path.basename(OUT)):
            for c in json.load(open(os.path.join(HERE, f), encoding='utf-8')):
                have.add('NPSX-' + c['id'].split('NPSX-')[-1] if 'NPSX-' in c['id'] else c['id'])
    new = sorted(x for x in rows if x not in used and x not in have)
    covered_quote = {re.sub(r'[^a-z0-9]', '', norm(c['quote']).lower())[:60] for f in os.listdir(HERE) if f.startswith('claims_') and f.endswith('.json') and f not in ('claims_verified.json', os.path.basename(OUT)) for c in json.load(open(os.path.join(HERE, f), encoding='utf-8'))}
    unread = [x for x in new if re.sub(r'[^a-z0-9]', '', norm(rows[x]['citation']['quote']).lower())[:60] not in covered_quote and not any(re.sub(r'[^a-z0-9]', '', norm(rows[x]['citation']['quote']).lower())[:60] in q or q in re.sub(r'[^a-z0-9]', '', norm(rows[x]['citation']['quote']).lower()) for q in covered_quote)]
    for xid, why in bad:
        print('FAIL', xid, why)
    if unread:
        print('NOT READ: %d rows of the correction file are in no claim file, in CURATED or in LEFT_OUT: %s' % (len(unread), ', '.join(unread)))
    ids = [c['id'] for c in out]
    assert len(ids) == len(set(ids)), 'repeated id'
    json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    import collections
    print(len(out), 'claims written to', OUT, dict(collections.Counter(c['kind'] for c in out)), dict(collections.Counter(c['tier'] for c in out)))
    return 1 if bad or unread else 0


if __name__ == '__main__':
    sys.exit(main())
