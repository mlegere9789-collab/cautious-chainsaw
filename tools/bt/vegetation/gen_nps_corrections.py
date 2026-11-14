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

# rows read and left out, each with the reason (so that a row of the correction file cannot be skipped silently)
LEFT_OUT = {
    'NPSX-CLR-1STDAY-p049-03': 'the sentence does not name its farm (in the saved text it follows the end of the Forney description where the text layer interleaves two farms); a claim without a farm cannot be placed or cited as a place',
    'NPSX-WEB-NATURAL-FEATURES-p001-02': 'acreage in crops today: modern and not about a place or a date of 1863',
    'NPSX-WEB-NATURAL-FEATURES-p001-05': 'regeneration studies since 1985: not about 1863 vegetation',
    'NPSX-CLI-ERR-p095-09': 'farming after the battle (1864-1895): not the state of 1863',
    'NPSX-CLR-ROT-V1-p171-01': "a damage claimant's trade (canned fruit taken or destroyed): not about what grew where (also in the exclusion list of gen_nps_claims.py)",
}


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
