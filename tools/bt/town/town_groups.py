"""The 21 groups of the town and buildings evidence pass (OA10): definitions written by hand.

Read by tools/bt/town/assign_groups.py (membership, counts, groups.json) and tools/bt/town/local_coverage.py (search terms).
Nothing here is evidence. `targets` are names the pass must FIND in a local text (or drop): each says where the name comes from
(repository data, the Warren plate label, a 1863 newspaper hit counted in the local texts); a name from general knowledge is marked
`lead` and may not be used for a building until a local text carries it.

Assignment rule (one primary group per building, so no building is worked twice and none is dropped):
  1. an id listed in `explicit` of a group belongs to that group;
  2. a borough mass or point inside the borough grid goes to the street group of the nearest street axis (<= 45 m), else to the
     lanes group;
  3. a farm, outbuilding or map symbol outside the borough goes to the area group of the nearest anchor (a gazetteer place or a
     curated farm), whatever its distance (a far symbol is flagged `far`);
  4. a building that has a specialised group (church, college, seminary, railroad, tavern or hotel, mill or bridge, cemetery,
     public building) is worked there; its street or area group lists it as a cross-reference only.
"""

SPECIAL = ['town-public-buildings', 'town-churches', 'town-college', 'town-seminary', 'town-railroad', 'town-taverns-hotels',
           'town-mills-bridges', 'town-cemeteries-gatehouse']
STREETS = ['street-baltimore', 'street-chambersburg', 'street-york-carlisle', 'street-washington-stratton-breckenridge', 'street-middle-high-lanes']
AREAS = ['farms-seminary-mcpherson-herr', 'farms-oak-ridge-north', 'farms-east-hanover-york', 'farms-culps-hill-baltimore-pike',
         'farms-cemetery-ridge-taneytown', 'farms-emmitsburg-road', 'farms-wheatfield-round-tops']

# street axes of the borough: two points each (UTM 18N metres east, north), from the eight street junctions of the Hopkins 1858
# inset (docs/basemap1863/maps/gcps/hopkins_inset.json: fit 1.9 m, leave-one-out 2.9 m) extended along the same line.
# kind 'ns' = north-south street (x as a function of y), 'ew' = east-west street (y as a function of x).
STREET_AXES = {
    'Baltimore':    {'kind': 'ns', 'p': [(309075.4, 4411242.0), (309069.1, 4410921.9)], 'y': (4410150.0, 4411371.0), 'group': 'street-baltimore'},
    'Carlisle':     {'kind': 'ns', 'p': [(309075.4, 4411242.0), (309069.1, 4410921.9)], 'y': (4411371.0, 4412000.0), 'group': 'street-york-carlisle'},
    'Washington':   {'kind': 'ns', 'p': [(308884.0, 4411243.5), (308877.3, 4410921.2)], 'y': (4410400.0, 4412000.0), 'group': 'street-washington-stratton-breckenridge'},
    'Stratton':     {'kind': 'ns', 'p': [(309266.8, 4411371.1), (309260.4, 4411050.0)], 'y': (4410400.0, 4412000.0), 'group': 'street-washington-stratton-breckenridge'},
    'Chambersburg': {'kind': 'ew', 'p': [(308887.6, 4411371.6), (309078.0, 4411371.3)], 'x': (308300.0, 309078.0), 'group': 'street-chambersburg'},
    'York':         {'kind': 'ew', 'p': [(309078.0, 4411371.3), (309266.8, 4411371.1)], 'x': (309078.0, 309700.0), 'group': 'street-york-carlisle'},
    'Middle':       {'kind': 'ew', 'p': [(308884.0, 4411243.5), (309075.4, 4411242.0)], 'x': (308500.0, 309700.0), 'group': 'street-middle-high-lanes'},
    'High':         {'kind': 'ew', 'p': [(308882.3, 4411117.1), (309072.8, 4411113.3)], 'x': (308500.0, 309700.0), 'group': 'street-middle-high-lanes'},
    'Breckenridge': {'kind': 'ew', 'p': [(308877.3, 4410921.2), (309069.1, 4410921.9)], 'x': (308500.0, 309700.0), 'group': 'street-washington-stratton-breckenridge'},
}
DIAMOND = (309078.0, 4411371.0)   # Baltimore x Chambersburg/York, from the same junctions (used only to print offsets)

# gazetteer places (docs/battle-theatre/app/data/gazetteer.json names) that anchor the area groups
AREA_ANCHORS = {
    'farms-seminary-mcpherson-herr': ['Seminary Ridge', 'McPherson Ridge', 'Herr Ridge', "Herr's Ridge Road", 'Herbst Woods', "Hereter's Mill Road",
                                       'Willoughby Run Road', 'Willoughby Run', 'Hagerstown Road', 'Marsh Creek', 'Black Horse Tavern Road',
                                       'Railroad Cuts', 'Chambersburg Pike'],
    'farms-oak-ridge-north': ['Oak Ridge', 'Oak Hill', "Barlow's Knoll", 'Carlisle Road', 'Harrisburg Road', 'Mummasburg Road', 'Table Rock Road',
                              'Boyds School Road', 'Hunterstown Road'],
    'farms-east-hanover-york': ['Hanover Road', 'York Pike', "Brinkerhoff's Ridge", 'East Cavalry Field', 'Low Dutch Road'],
    'farms-culps-hill-baltimore-pike': ["Culp's Hill", "Spangler's Spring", "Stevens' Knoll", "Powers' Hill", 'Baltimore Pike', "McAllister's Mill road",
                                         'Rock Creek', 'Granite Schoolhouse Lane', 'Blacksmith Shop Road', 'Wolf Hill', 'White Run',
                                         'Baltimore Pike, 1 mile east of Rock Creek', 'Littles Run'],
    'farms-cemetery-ridge-taneytown': ['Cemetery Ridge', 'The Angle', "Ziegler's Grove", 'Leister house', 'Bryan farm', 'Taneytown Road'],
    'farms-emmitsburg-road': ['Codori farm', 'Bliss farm', 'Spangler farm', 'Sherfy farm', 'The Peach Orchard', "Pitzer's Woods", 'Millerstown Road'],
    'farms-wheatfield-round-tops': ['The Wheatfield', "Devil's Den", "Houck's Ridge", 'Little Round Top', 'Big Round Top', 'Warfield Ridge',
                                    'Trostle house', 'Wheatfield Road', "Biesecker's Woods", 'Slyder farm lane', 'Bushman farm lane', 'Plum Run',
                                    'Emmitsburg Road'],
}
# curated farm keys of the basemap catalogue -> group (a farm key outranks the nearest anchor)
FARM_GROUP = {
    'klingel': 'farms-emmitsburg-road', 'codori': 'farms-emmitsburg-road', 'bliss': 'farms-emmitsburg-road', 'rogers': 'farms-emmitsburg-road',
    'sherfy': 'farms-emmitsburg-road', 'wentz': 'farms-emmitsburg-road', 'spangler_h': 'farms-emmitsburg-road',
    'trostle': 'farms-wheatfield-round-tops', 'rose': 'farms-wheatfield-round-tops', 'slyder': 'farms-wheatfield-round-tops',
    'bushman': 'farms-wheatfield-round-tops', 'warfield_snyder': 'farms-wheatfield-round-tops',
    'bryan': 'farms-cemetery-ridge-taneytown', 'leister': 'farms-cemetery-ridge-taneytown', 'hummelbaugh': 'farms-cemetery-ridge-taneytown',
    'gweikert': 'farms-cemetery-ridge-taneytown', 'jweikert': 'farms-cemetery-ridge-taneytown', 'fry': 'farms-cemetery-ridge-taneytown',
    'patterson': 'farms-cemetery-ridge-taneytown',
    'culp': 'farms-culps-hill-baltimore-pike',
    'mcpherson': 'farms-seminary-mcpherson-herr', 'mcmillan': 'farms-seminary-mcpherson-herr',
    'hagy_beams': 'farms-oak-ridge-north', 'mclean': 'farms-oak-ridge-north', 'forney': 'farms-oak-ridge-north',
    'almshouse': 'town-public-buildings',
}
# ids placed by hand (structures.json record ids, basemap ids). `bld-poorhouse-christ-lutheran-wills` is split by part: see PART_GROUP.
EXPLICIT = {
    'town-public-buildings': ['bld-courthouse', 'STR-TOWN-COURTHOUSE'],
    'town-churches': ['bld-presbyterian-church', 'bld-st-francis-xavier', 'bld-town-belfry', 'STR-TOWN-CHRIST_LUTHERAN', 'STR-TOWN-PRESBYTERIAN_CHURCH'],
    'town-college': ['bld-pennsylvania-hall', 'STR-TOWN-PENN_HALL'],
    'town-seminary': ['bld-schmucker-hall', 'bld-thompson-house', 'STR-TOWN-SCHMUCKER_HALL', 'STR-TOWN-THOMPSON_HOUSE', 'STR-TOWN-SCHULTZ_HOUSE',
                      'STR-TOWN-SHEADS_HOUSE'],
    'town-railroad': ['bld-rr-station', 'bld-rock-creek-rr-bridge', 'STR-TOWN-DEPOT', 'RL-001', 'RL-002', 'RL-002W', 'RL-003', 'RL-004', 'RL-005',
                      'RL-006', 'RL-007', 'P-12'],
    'town-taverns-hotels': ['STR-TOWN-BLACK_HORSE_TAVERN', 'STR-TOWN-DOBBIN_HOUSE'],
    'town-mills-bridges': ['STR-SITE-SACHS_BRIDGE', 'STR-SITE-MCALLISTER_MILL', 'RD-011', 'RD-018'],
    'town-cemeteries-gatehouse': ['bld-evergreen-gatehouse', 'STR-TOWN-GATEHOUSE', 'STR-TOWN-GATEHOUSE_PAVILION', 'FEN-evergreen-cemetery',
                                  'ENV-evergreen-cemetery', 'P-02', 'P-03'],
    'street-baltimore': ['bld-wade-house', 'bld-pierce-house', 'bld-sweney-rupp-mccreary', 'STR-TOWN-WADE_HOUSE', 'STR-TOWN-GARLACH_HOUSE',
                         'FEN-mccreary-house'],
    'street-chambersburg': ['bld-burns-house'],
    'farms-seminary-mcpherson-herr': ['bld-mcpherson-farm', 'bld-mcmillan-farm', 'bld-herbst', 'FEN-thompson', 'FEN-mcmillan', 'FEN-seminary-ridge',
                                      'FEN-gamble-cavalry', 'FEN-mcpherson-railroad-grade', 'FEN-chambersburg-pike', 'P-07'],
    'farms-oak-ridge-north': [],
    'farms-east-hanover-york': ['bld-rummel-farm', 'FEN-rummel'],
    'farms-culps-hill-baltimore-pike': ['bld-spangler-farm', 'bld-granite-schoolhouse', 'bld-taney-farm', 'bld-henry-culp-farm', 'bld-daniel-lady-farm', 'P-08', 'P-09',
                                        'STR-LOST-GRANITE_SCHOOLHOUSE', 'STR-LOST-GUINN_FARM'],
    'farms-cemetery-ridge-taneytown': ['bld-leister-house', 'bld-weikert-farm', 'bld-hummelbaugh-farm', 'bld-brian-farm', 'bld-biggs-house',
                                       'STR-LOST-BIGGS_HOUSE', 'STR-LOST-FISHER_LOG_HOUSE', 'FEN-leister', 'FEN-brian', 'FEN-cemetery-ridge-walls',
                                       'P-01', 'P-13'],
    'farms-emmitsburg-road': ['bld-codori-farm', 'bld-klingle-farm', 'bld-rogers-house', 'bld-bliss-farm', 'bld-sherfy-farm', 'bld-wentz-farm',
                              'STR-LOST-STAUB_FARM', 'FEN-emmitsburg-road', 'FEN-klingle', 'FEN-sherfy-orchard', 'P-10', 'P-11', 'FEN-warfield'],
    'farms-wheatfield-round-tops': ['bld-trostle-farm', 'bld-rose-farm', 'bld-bushman-farm', 'bld-warfield-house', 'bld-snyder-farm', 'bld-slyder-farm',
                                    'P-04', 'P-05', 'P-06', 'P-14'],
    'terrain-changes-since-1863': ['RD-avenues', 'ENV-plum-run'],
}
PART_GROUP = {   # parts of a record that name more than one building (record id -> part id suffix -> group)
    'bld-poorhouse-christ-lutheran-wills': {'poorhouse': 'town-public-buildings', 'christ_lutheran_church': 'town-churches', 'wills_house': 'street-baltimore'},
}

GROUP_DEFS = [
 {
  'id': 'town-public-buildings', 'prefix': 'PUB', 'kind': 'town',
  'title': 'Public and institutional buildings: court house, prison, almshouse, schools, banks, halls',
  'scope': 'The Adams County court house (record bld-courthouse; basemap STR-TOWN-COURTHOUSE, 2023 outline, error 8 m; the plan row says built 1858, '
           'Italianate, two storeys, about 70 ft clock tower, command post and hospital for both sides: every word of it rests on Wikipedia, a lead), the county '
           'prison, the almshouse complex north of the borough (basemap STR-ALMSHOUSE-COMPLEX_BUILDING1..9, nine Warren-plate symbols, error 45 m; the plan row '
           'says "no source retrieved"), public and private schools, banks, the post office, engine houses, market house and halls.',
  'targets': [
      {'name': 'Court House', 'basis': 'record bld-courthouse; "Court House" counted in the 1863 papers'},
      {'name': 'Jail / prison', 'basis': 'lead: "General Jail" and "Jail" occur in the 1863 papers (may be a county jail or a general term)'},
      {'name': 'Almshouse (county poorhouse) complex', 'basis': 'basemap STR-ALMSHOUSE-COMPLEX_BUILDING1..9; PDF B.8.2 last row'},
      {'name': 'Public School', 'basis': '"Public School" counted in the 1863 papers'},
      {'name': 'Banks', 'basis': 'lead: "Brick Bank", "Bank" in the 1863 papers: which are Gettysburg banks is for the pass to read'}],
  'sources': ['JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HISTORY-ADAMS-1886', 'RUPP-1846',
              'HOKE-1887', 'HABS-pa0004', 'SANBORN-1886'],
  'queries': ['gettysburg court house', 'gettysburg court house hospital', 'gettysburg jail prisoners', 'gettysburg public school', 'gettysburg almshouse'],
  'photos': ['2014646001', '2014646002', '2018671576'],
  'issues': ['PDF rows rest on Wikipedia (lead): none of the court house particulars is documented until a local text carries it.',
             'The 2023 outline of the court house is not the 1863 form unless a source says it is unchanged.',
             'The almshouse complex is nine symbols with a 45 m error: the pass decides which symbols are almshouse buildings and which are not.'],
  'terms': ['court[- ]?house', 'jail|prison', 'alms[- ]?house|poor[- ]?house', 'public school', 'school[- ]?house', 'bank', 'post[- ]?office',
            'engine[- ]?house', 'market[- ]?house', 'Odd[- ]Fellows', 'Masonic'],
 },
 {
  'id': 'town-churches', 'prefix': 'CHU', 'kind': 'town',
  'title': 'Churches of the borough, their belfries and their use as hospitals',
  'scope': 'Presbyterian Church (record bld-presbyterian-church; basemap STR-TOWN-PRESBYTERIAN_CHURCH, error 40 m, confidence Contested; "208 Baltimore St"), '
           'Christ Lutheran Church (STR-TOWN-CHRIST_LUTHERAN, error 18 m; the basemap carries a street-number conflict, 30 versus 44 Chambersburg Street), '
           'St. Francis Xavier Catholic church (no geometry), the town church belfry used by snipers (no geometry), and every other church standing in July 1863 '
           '(Methodist, Reformed, African, others: the list is itself a finding of the pass: Hopkins 1858 inset, Jacobs 1864, the 1863 papers). Interiors changed '
           'for hospital use (pews removed, boards laid) belong to the building rows as states.',
  'targets': [
      {'name': 'Presbyterian Church', 'basis': 'record bld-presbyterian-church'},
      {'name': 'Christ Lutheran Church', 'basis': 'basemap STR-TOWN-CHRIST_LUTHERAN; "Lutheran Church" counted in the 1863 papers'},
      {'name': 'St. Francis Xavier Catholic church', 'basis': 'record bld-st-francis-xavier; "Catholic Church" counted in the 1863 papers'},
      {'name': 'Town church belfry', 'basis': 'record bld-town-belfry (PDF: "Not identified")'},
      {'name': 'Other churches', 'basis': 'to be found in the Hopkins inset legend and the 1863 papers; none is named here'}],
  'sources': ['JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'TPIERCE-1889', 'HOSPSCENES-1864', 'HOPKINS-1858-INSET', 'WARREN-1869',
              'HISTORY-ADAMS-1886', 'RUPP-1846', 'HOKE-1887', 'NPS-CARE-WOUNDED-GUIDE', 'SANBORN-1886'],
  'queries': ['gettysburg churches wounded', 'gettysburg church hospital', 'gettysburg catholic church hospital', 'gettysburg presbyterian church', 'gettysburg steeple sharpshooters'],
  'photos': ['2014646001', '2014646002'],
  'issues': ['Presbyterian church site: the basemap confidence is Contested; the error bound is 40 m.',
             'Christ Lutheran: 30 versus 44 Chambersburg Street in the sources of the basemap; the 1863 form of the church is unknown (2023 outline, error 18 m).',
             'Every hospital-use row feeds the hospital pass (OA12, workstream bt-life-hospitals): rows carry the building id so the two passes meet.'],
  'terms': ['Lutheran church', 'Presbyterian church', 'Methodist', 'Reformed church|German Reformed', 'Catholic church|St\\. Francis Xavier', 'Zion|African church|colored church',
            'steeple|belfry', 'church.{0,60}hospital|hospital.{0,60}church', 'pews'],
 },
 {
  'id': 'town-college', 'prefix': 'COL', 'kind': 'town',
  'title': 'Pennsylvania College: Pennsylvania Hall and the other buildings of the campus',
  'scope': 'Pennsylvania Hall (record bld-pennsylvania-hall; basemap STR-TOWN-PENN_HALL, the main block of the 2023 outline, error 4 m, wings of 1889 left out; '
           'the plan row: designed 1835, built 1837-38, Greek Revival, four storeys, 150 x 45 ft, four-column south portico, cupola; signal officers June 30; '
           'hospital to about 29 July with about 700 casualties: every word from Wikipedia, a lead), the other campus buildings of 1863 (to be found: Hopkins '
           'inset, Jacobs 1864, the HABS record), the campus fences and grounds, and the photograph of Pennsylvania College of August 1863 (LOC 2014646151).',
  'targets': [{'name': 'Pennsylvania Hall', 'basis': 'record bld-pennsylvania-hall; HABS record pa0009'},
              {'name': 'Other college buildings of 1863', 'basis': 'to be found in Jacobs 1864 (the author taught at the college) and the Hopkins inset'}],
  'sources': ['JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HABS-pa0009', 'HISTORY-ADAMS-1886', 'HOKE-1887',
              'NPS-GETTYSBURG-COLLEGE-EA-1995', 'SANBORN-1886', 'OR27-1'],
  'queries': ['pennsylvania college gettysburg hospital', 'pennsylvania college cupola signal', 'gettysburg college buildings wounded'],
  'photos': ['2014646151', '2014646001', '2014646002'],
  'issues': ['The 2023 outline omits the wings of 1889 (basemap status main_block_drawn_wings_1889_omitted); the 1863 plan and form must come from HABS or a text that dates the wings.',
             'The photograph of August 1863 is the best evidence of the 1863 appearance and is a picture: a reading of it is an observation row (evidence_kind image), never a measurement.'],
  'terms': ['Pennsylvania College', 'Pennsylvania Hall', 'college.{0,60}(hospital|cupola|building)', 'Linn(ae|e)an', 'Prof(essor)?\\.? Jacobs'],
 },
 {
  'id': 'town-seminary', 'prefix': 'SEM', 'kind': 'town',
  'title': 'The Lutheran Theological Seminary on Seminary Ridge and its neighbours: Schmucker Hall, Thompson house, Schultz house',
  'scope': 'Schmucker Hall ("Old Dorm"; record bld-schmucker-hall; STR-TOWN-SCHMUCKER_HALL, 2023 outline, error 4 m; cupola as observation post; hospital; about '
           'seven hundred patients: plan row, Wikipedia and other leads), the professors\' houses and other seminary buildings of 1863 (to be found), the Thompson '
           'house (Lee\'s headquarters; record bld-thompson-house; STR-TOWN-THOMPSON_HOUSE), the Schultz house (STR-TOWN-SCHULTZ_HOUSE, named in the basemap as an Oak '
           'Ridge Academy building: to be checked) and the Sheads house (STR-TOWN-SHEADS_HOUSE, traced outline).',
  'targets': [{'name': 'Schmucker Hall', 'basis': 'record bld-schmucker-hall'}, {'name': 'Thompson house (Lee headquarters)', 'basis': 'record bld-thompson-house'},
              {'name': 'Schultz house', 'basis': 'basemap STR-TOWN-SCHULTZ_HOUSE'}, {'name': 'Sheads house', 'basis': 'basemap STR-TOWN-SHEADS_HOUSE; Warren label SHEADS'},
              {'name': 'Professors\' houses', 'basis': 'to be found (Jacobs 1864, Hopkins inset)'}],
  'sources': ['JACOBS-1864', 'OR27-1', 'OR27-2', 'TPIERCE-1889', 'LONG-GBV-1891', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'HOSPSCENES-1864', 'FREMANTLE-1864',
              'NPS-CLI-1STDAY', 'NPS-CLR-1STDAY', 'NPS-CLI-LANDSCAPE', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HABS', 'HISTORY-ADAMS-1886'],
  'queries': ['gettysburg seminary hospital', 'gettysburg seminary cupola', 'gettysburg lee headquarters thompson', 'gettysburg seminary building wounded'],
  'photos': ['2018670707', '2018666297', '2018670772', '2012648410', '95503135', '2018666299'],
  'issues': ['The Brady "hole" in the cupola photograph is a negative defect, not damage (plan row); read it from the photograph itself, not from the plan.',
             'The Thompson house: the plan row says the interior fire of 1896 is not the battle; a fence-burning statement (no date) is documented only by a lead.',
             'Photograph 2018666299 ("G.J. White\'s house") has no stated place: do not assign it to a farm without a text that places it.'],
  'terms': ['Seminary', 'Schmucker', 'Thompson', "Lee's (head)?quarters|Lee.{0,20}headquarters", 'cupola', 'Oak Ridge', 'Seminary Ridge', 'Sheads'],
 },
 {
  'id': 'town-railroad', 'prefix': 'RRD', 'kind': 'town',
  'title': 'The Gettysburg Railroad: depot, track, trestle, bridges and the unfinished grade with its cuts',
  'scope': 'The railroad station on Carlisle Street (record bld-rr-station; STR-TOWN-DEPOT, 2023 outline, error 6 m; RL-006 depot marker, error 15 m), the line of the '
           'Gettysburg Railroad (RL-001) and the unfinished grade west of the borough (RL-002, record P-12: the cut itself is part of the modern ground model), the Rock '
           'Creek trestle burned on 26 or 27 June (RL-007, record bld-rock-creek-rr-bridge), freight and engine buildings, culverts and bridges of the grade, the '
           'cuts and fills as they stood in 1863 (depth, length), the post-1863 lines never drawn (RL-003, RL-005, RL-004) and the unknown extent RL-002W.',
  'targets': [{'name': 'Railroad station (Carlisle Street)', 'basis': 'record bld-rr-station'}, {'name': 'Rock Creek trestle', 'basis': 'RL-007, record bld-rock-creek-rr-bridge'},
              {'name': 'Unfinished railroad grade and its cuts', 'basis': 'RL-002, record P-12; gazetteer "Railroad Cuts" (about 2.4 km west of the Diamond)'},
              {'name': 'Freight / engine buildings', 'basis': 'lead: "Railroad Depot" counted in the 1863 papers; no other building is named'}],
  'sources': ['JACOBS-1864', 'OR27-1', 'OR27-2', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'NPS-CLI-1STDAY', 'NPS-CLR-1STDAY', 'NPS-CLI-LANDSCAPE', 'NPS-CLR-ROT-V1',
              'HOPKINS-1858-INSET', 'WARREN-1869', 'HABS', 'HISTORY-ADAMS-1886', 'SANBORN-1886', 'HOKE-1887'],
  'queries': ['gettysburg railroad bridge burned', 'gettysburg depot hospital', 'gettysburg railroad cut', 'gettysburg railroad trestle rock creek', 'hanover junction bridge burned'],
  'photos': ['2018670663', '2014646000', '2018670696', '2018672108'],
  'issues': ['Burned 26 versus 27 June (plan row: sources vary): carry both as a conflict, never one.',
             'Traffic resumed 10 July per one passage and 1865 per another (plan row: internally inconsistent).',
             'The depot of 2023 is altered (one-storey addition of 1886 per the plan row, Wikipedia): the 1863 form is not the 2023 outline.',
             'Photograph 2018670663 shows Hanover Junction, not Gettysburg: it is context for burned bridges, not evidence for a Gettysburg building.',
             'The Sanitary Commission offices (three photographs) stood somewhere near the depot: a place claim needs a text.'],
  'terms': ['depot', 'railroad (station|bridge|cut|depot|grade|trestle)', 'unfinished railroad', 'trestle', 'Hanover Junction', 'freight', 'engine[- ]?house'],
 },
 {
  'id': 'town-taverns-hotels', 'prefix': 'TAV', 'kind': 'town',
  'title': 'Taverns, hotels and inns of the borough and the roads',
  'scope': 'Hotels of the borough in July 1863 (names counted in the 1863 papers: Globe Hotel, Eagle Hotel, Howard House, Mansion House, Clellan\'s Hotel; whether each is '
           'a Gettysburg hotel is for the pass to read), Black Horse Tavern on the Fairfield road (STR-TOWN-BLACK_HORSE_TAVERN, 2023 outline, error 8 m), Herr\'s Tavern '
           '(Warren label HERR TAVERN, two symbols), the Springs Hotel (Warren label SPRING, two symbols; the Park Service study "The Significance of the Harmon Farm and '
           'the Springs Hotel Woods"), the Dobbin House (STR-TOWN-DOBBIN_HOUSE, traced outline). A hotel on a borough street is worked here, not in the street group.',
  'targets': [{'name': 'Globe Hotel', 'basis': 'counted in the 1863 papers (14)'}, {'name': 'Eagle Hotel', 'basis': 'counted in the 1863 papers (10)'},
              {'name': 'Howard House', 'basis': 'counted in the 1863 papers (12)'}, {'name': 'Black Horse Tavern', 'basis': 'basemap STR-TOWN-BLACK_HORSE_TAVERN'},
              {'name': 'Herr\'s Tavern', 'basis': 'Warren plate labels at two symbols'}, {'name': 'Springs Hotel', 'basis': 'Warren label; NPS-HARMON-FARM'},
              {'name': 'Dobbin House', 'basis': 'basemap STR-TOWN-DOBBIN_HOUSE'}],
  'sources': ['GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'JACOBS-1864', 'FREMANTLE-1864', 'OR27-2', 'NPS-HARMON-FARM', 'HOPKINS-1858-INSET', 'WARREN-1869',
              'HISTORY-ADAMS-1886', 'RUPP-1846', 'HOKE-1887'],
  'queries': ['gettysburg hotel wounded', 'gettysburg eagle hotel', 'gettysburg globe hotel', 'black horse tavern gettysburg', 'herr tavern gettysburg'],
  'photos': [],
  'issues': ['The basemap carries the Black Horse Tavern as a surviving building with a 2023 outline: its 1863 form is a question, not an answer.'],
  'terms': ['tavern', 'hotel', 'Globe Hotel', 'Eagle Hotel', 'Howard House', 'Black Horse', "Herr'?s? Tavern", 'Springs? Hotel', 'Mansion House', 'Clellan'],
 },
 {
  'id': 'town-mills-bridges', 'prefix': 'MIL', 'kind': 'town',
  'title': 'Mills, mill dams and bridges of Rock Creek, Willoughby Run, Stevens Run, Plum Run and Marsh Creek',
  'scope': 'McAllister\'s Mill (STR-SITE-MCALLISTER_MILL, named point, error 150 m: grist and saw mills with two dams), the Sachs mill and covered bridge on Marsh '
           'Creek (STR-SITE-SACHS_BRIDGE; outside the loaded ground), Hereter\'s mill (road RD-011), Horner\'s mill and the Rock Creek covered bridge of 1841 (plan '
           'B.8.4), and the bridges and fords of the basemap (BR-001..BR-015: BR-002 Baltimore Pike over Rock Creek, documented, error 70 m; BR-006 and BR-007 over Rock '
           'Creek; BR-011 and BR-015 on Willoughby Run; BR-004, BR-009, BR-013 over Stevens Run, open gaps; 11 outside the loaded ground), the Plum Run crossings (a '
           'plan gap) and the mill races and dams.',
  'targets': [{'name': "McAllister's Mill", 'basis': 'STR-SITE-MCALLISTER_MILL'}, {'name': 'Sachs mill and covered bridge', 'basis': 'STR-SITE-SACHS_BRIDGE'},
              {'name': "Hereter's mill", 'basis': 'road RD-011 "Hereter\'s Mill Road (Old Mill Road)"'}, {'name': "Horner's mill", 'basis': 'plan B.8.4 row for the Taneytown Road'},
              {'name': 'Bridges BR-001..BR-015', 'basis': 'docs/basemap1863/features/roads-rail-water/bridges.geojson'}],
  'sources': ['OR27-1', 'OR27-2', 'OR27-3', 'NPS-CLR-1STDAY', 'NPS-CLI-1STDAY', 'NPS-CLI-ERR', 'NPS-CLR-ROT-V1', 'NPS-ROCK-CREEK', 'JACOBS-1864', 'GBG-COMPILER-1863',
              'ADAMS-SENTINEL-1863', 'WARREN-1869', 'HOPKINS-1858-COUNTY', 'HISTORY-ADAMS-1886', 'RUPP-1846', 'HABS'],
  'queries': ['gettysburg mill rock creek', 'gettysburg bridge burned', 'marsh creek mill sachs bridge', 'gettysburg covered bridge'],
  'photos': [],
  'issues': ['Road-bridge widths and spans are open gaps in the plan; none is a generic number until the group REPORT names the generic rule.',
             'The basemap bridge points carry 30 to 70 m error: a position row says so.'],
  'terms': ['mill', "McAllister'?s? mill", 'Sachs', 'covered bridge', 'bridge (over|across)', 'Horner', 'Hereter', 'Rock Creek.{0,40}bridge', 'Stevens Run', 'Willoughby Run', 'Plum Run'],
 },
 {
  'id': 'town-cemeteries-gatehouse', 'prefix': 'CEM', 'kind': 'town',
  'title': 'Cemetery Hill: Evergreen Cemetery, the gatehouse and its pavilion, the walls and fences, other burial grounds',
  'scope': 'The Evergreen Cemetery gatehouse (record bld-evergreen-gatehouse; STR-TOWN-GATEHOUSE, 2023 outline, error 4 m, a right-side addition since; plan row: '
           'Italianate, finished November 1855, moderate damage on the evening of 2 July), the pavilion beside it (STR-TOWN-GATEHOUSE_PAVILION, photograph pose, lost), the '
           'cemetery fences and the monuments that stood in July 1863 (FEN-evergreen-cemetery, ENV-evergreen-cemetery), the stone walls of Cemetery Hill (P-02, P-03), '
           'brickyards and other buildings on the hill, and every other burial ground of the borough. The Soldiers\' National Cemetery was laid out after the battle: it is '
           'recorded as a later feature and never drawn in the July scene.',
  'targets': [{'name': 'Evergreen Cemetery gatehouse', 'basis': 'record bld-evergreen-gatehouse'}, {'name': 'Pavilion beside the gatehouse', 'basis': 'STR-TOWN-GATEHOUSE_PAVILION'},
              {'name': 'Cemetery fences and monuments of 1863', 'basis': 'FEN-evergreen-cemetery'}, {'name': 'Walls of Cemetery Hill', 'basis': 'P-02, P-03'}],
  'sources': ['OR27-1', 'JACOBS-1864', 'NPS-CLI-CEMETERY', 'NPS-CLR-CEMETERY', 'NPS-CEM-ENCLOSURES', 'NPS-HCSR', 'NPS-CEM-DEDICATION', 'CEM-REPORT-1867', 'CEM-BARTLETT-1874',
              'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HABS', 'HISTORY-ADAMS-1886'],
  'queries': ['evergreen cemetery gatehouse shells', 'cemetery hill gate lodge', 'evergreen cemetery monuments destroyed'],
  'photos': ['2012647705', '2018666300', '2018670702', '2014646001', '2018671576'],
  'issues': ['Photograph pose registers P03 and P26 (gatehouse) are "cannot judge": no camera position is documented; the 2023 outline merges the lodge and the pavilion.',
             'The plan row for the gatehouse damage rests on Wikipedia and "NPS: moderate damage": the NPS text must be found in a local report.'],
  'terms': ['Evergreen Cemetery', 'gate[- ]?house', 'cemetery gate', 'Cemetery Hill', 'lodge', 'brick[- ]?yard', 'cemetery.{0,40}(fence|wall)'],
 },
 {
  'id': 'street-baltimore', 'prefix': 'BAL', 'kind': 'street',
  'title': 'Baltimore Street from the Diamond to the cemetery gate',
  'scope': 'Every building on both sides of Baltimore Street south of the Diamond (the borough masses within 45 m of its axis, and the named houses: the McClellan house '
           'of Jennie Wade, 548 Baltimore Street, record bld-wade-house; the Garlach house; the Pierce house at Baltimore and Breckenridge; the Sweney, Rupp and McCreary '
           'houses; the Wills house, whose place is to be confirmed) and its fences. Churches, hotels, the court house and other specialised buildings on the street are '
           'worked in their own groups.',
  'targets': [{'name': 'McClellan house (Wade), 548 Baltimore Street', 'basis': 'record bld-wade-house; STR-TOWN-WADE_HOUSE'},
              {'name': 'Garlach house', 'basis': 'STR-TOWN-GARLACH_HOUSE'}, {'name': 'Pierce house', 'basis': 'record bld-pierce-house (PDF: corner Baltimore and Breckenridge)'},
              {'name': 'Sweney House, Rupp house, McCreary house', 'basis': 'record bld-sweney-rupp-mccreary'},
              {'name': 'Wills house', 'basis': 'part of record bld-poorhouse-christ-lutheran-wills: place and form to be found; assigned here pending the place'}],
  'sources': ['JACOBS-1864', 'TPIERCE-1889', 'PIERCE-F-1914', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'OR27-2', 'HOPKINS-1858-INSET', 'WARREN-1869',
              'HOKE-1887', 'HISTORY-ADAMS-1886', 'SANBORN-1886', 'HABS'],
  'queries': ['gettysburg baltimore street sharpshooters houses', 'gettysburg houses riddled shells baltimore street', 'miss wade killed house bullets', 'gettysburg citizens cellars'],
  'photos': ['2014646001', '2014646002', '2018671576'],
  'issues': ['Borough masses (error 20 m) merge neighbouring buildings and may include buildings of 1863-69: an existence row for a mass is inferred at best and says which map shows it.',
             '150+ bullet strikes on the Wade house are a plan count from Wikipedia: documented only from a local text.'],
  'terms': ['Baltimore [Ss]treet', 'Wade', 'Breckenridge', 'McClellan', 'Garlach', 'Pierce', 'Sweney', 'Rupp', 'McCreary', 'Wills'],
 },
 {
  'id': 'street-chambersburg', 'prefix': 'CHA', 'kind': 'street',
  'title': 'Chambersburg Street, west of the Diamond to the borough edge',
  'scope': 'Every building on both sides of Chambersburg Street from the Diamond to the west end of the borough (borough masses within 45 m of its axis; the Burns house, '
           'record bld-burns-house, razed after his death; the houses where first-day soldiers fought, sheltered or were wounded: to be found) and their fences. Christ Lutheran and any hotel on the street are '
           'worked in their own groups.',
  'targets': [{'name': 'John Burns house (cottage)', 'basis': 'record bld-burns-house; photograph 2018670711 "Burns cottage"'}],
  'sources': ['JACOBS-1864', 'TPIERCE-1889', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'OR27-2', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HOKE-1887', 'HISTORY-ADAMS-1886',
              'SANBORN-1886'],
  'queries': ['gettysburg chambersburg street houses', 'gettysburg burns house', 'gettysburg first day retreat through town'],
  'photos': ['2018670711', '2018666316', '2018670710'],
  'issues': ['The Burns house stood on Chambersburg Street per the plan row (Wikipedia, a lead): its place needs a text and a map reading.'],
  'terms': ['Chambersburg [Ss]treet', 'Burns', 'Chambersburg [Pp]ike'],
 },
 {
  'id': 'street-york-carlisle', 'prefix': 'YRK', 'kind': 'street',
  'title': 'York Street (east of the Diamond) and Carlisle Street (north), with the Diamond',
  'scope': 'Every building on York Street from the Diamond to the east end of the borough and on Carlisle Street from the Diamond north (the borough masses within 45 m of '
           'either axis), the buildings facing the Diamond on the north and east, and their fences. The railroad station on Carlisle Street, the college and any hotel are '
           'worked in their own groups.',
  'targets': [], 'sources': ['JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'OR27-2', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HOKE-1887', 'HISTORY-ADAMS-1886', 'SANBORN-1886'],
  'queries': ['gettysburg york street houses', 'gettysburg carlisle street houses', 'gettysburg diamond square'],
  'photos': ['2014646002'],
  'issues': ['The Diamond was a plain crossing in 1858 (basemap check against the Hopkins inset), a roundabout today: nothing drawn at the Diamond comes from the modern layout.'],
  'terms': ['York [Ss]treet', 'Carlisle [Ss]treet', 'the Diamond', 'Centre Square'],
 },
 {
  'id': 'street-washington-stratton-breckenridge', 'prefix': 'WSB', 'kind': 'street',
  'title': 'Washington Street, Stratton Street and Breckenridge Street',
  'scope': 'Every building on Washington Street (west of Baltimore Street, the street the Taneytown Road enters), Stratton Street (east) and Breckenridge Street (the '
           'southern east-west street) within the borough grid, and their fences. The college campus and specialised buildings are worked in their own groups.',
  'targets': [], 'sources': ['JACOBS-1864', 'TPIERCE-1889', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'OR27-2', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HOKE-1887', 'HISTORY-ADAMS-1886', 'SANBORN-1886'],
  'queries': ['gettysburg washington street houses', 'gettysburg stratton street', 'gettysburg breckenridge street'],
  'photos': [],
  'issues': ['Stratton Street runs east of Baltimore Street on the Hopkins inset control points: the group does not assume the modern street names for lanes beyond the eight junctions.'],
  'terms': ['Washington [Ss]treet', 'Stratton [Ss]treet', 'Breckenridge'],
 },
 {
  'id': 'street-middle-high-lanes', 'prefix': 'MHL', 'kind': 'street',
  'title': 'West and East Middle Street, High Street, and the lanes and alleys of the borough',
  'scope': 'Every building on Middle Street and High Street (both halves) within the borough grid, every building on lanes and alleys (borough masses farther than 45 m from '
           'every named street axis), outbuildings, shops, stables and back lots, and their fences. The group also takes any borough mass the street groups cannot place.',
  'targets': [], 'sources': ['JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'OR27-1', 'HOPKINS-1858-INSET', 'WARREN-1869', 'HOKE-1887', 'HISTORY-ADAMS-1886', 'SANBORN-1886'],
  'queries': ['gettysburg middle street', 'gettysburg high street', 'gettysburg alley lane houses'],
  'photos': [],
  'issues': ['Lane and alley names are not in the repository (18 named lanes of the basemap have no traced line): names come only from a text.'],
  'terms': ['Middle [Ss]treet', 'High [Ss]treet', 'alley', 'Race[- ]?[Hh]orse'],
 },
 {
  'id': 'farms-seminary-mcpherson-herr', 'prefix': 'FSW', 'kind': 'farms',
  'title': 'West of the borough: Seminary Ridge, McPherson Ridge, Herr Ridge and the Willoughby Run farms',
  'scope': 'The McPherson farm (record bld-mcpherson-farm; barn STR-MCPHERSON-BARN1 survives; farmhouse burned 1895 per the NPS; central wagon shed lost), the McMillan farm '
           '(STR-MCMILLAN-*), the Herbst woods and buildings (record bld-herbst), the farms along the Chambersburg Pike and the Hagerstown, Hereter\'s Mill and Black Horse '
           'Tavern roads (Warren labels: Herr, Leafer, Bender, Grist, Dustman, Tate, Kirk, Hoffman, Harman, Herbst, Plank, Currans and others), their fences (Thompson, '
           'McMillan, Seminary Ridge, Gamble\'s cavalry fence, McPherson / railroad-grade fences, Chambersburg Pike), the wall P-07 on Oak Ridge.',
  'targets': [{'name': 'McPherson farm (house, barn, wagon shed, orchard)', 'basis': 'record bld-mcpherson-farm; NPS-CLI-1STDAY'},
              {'name': 'McMillan farm', 'basis': 'record bld-mcmillan-farm; NPS-MCMILLAN-HOUSE'}, {'name': 'Herbst house and barn', 'basis': 'record bld-herbst (plan: open gap)'},
              {'name': 'Farms named by the Warren plate west of the borough', 'basis': 'symbol labels HERR, LEAFER, BENDER, GRIST, DUSTMAN, TATE, KIRK, HOFFMAN, HARMAN, PLANK, CURRANS (OCR hints)'}],
  'sources': ['NPS-CLI-1STDAY', 'NPS-CLR-1STDAY', 'NPS-HS-MCPHERSON', 'NPS-MCMILLAN-HOUSE', 'NPS-HARMON-FARM', 'NPS-CLI-LANDSCAPE', 'NPS-HSR-MCCLEAN-BARN', 'OR27-1', 'OR27-2',
              'JACOBS-1864', 'TPIERCE-1889', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'HOPKINS-1858-COUNTY', 'WARREN-1869', 'HABS-pa0008', 'PA-GB-1904'],
  'queries': ['gettysburg mcpherson farm hospital barn', 'gettysburg mcmillan farm', 'gettysburg herr tavern', 'willoughby run farm barns burned'],
  'photos': ['2012646949', '2012647718', '2012647719', '2012647706', '2018670706', '2018671419'],
  'issues': ['The McPherson barn did not burn on 1 July and the farmhouse burned in 1895 (plan, B.8.1 corrections): never draw a later event in the battle.',
             'The Warren labels are OCR hints (HERBST, LEAFER, BENDER...): a name is used for a building only when a local text names the same occupant.'],
  'terms': ['McPherson', 'McMillan', 'Herbst', 'Herr', 'Willoughby', 'Hagy', 'Harmon', 'Wisler', 'Slentz', 'Seminary Ridge', 'McPherson.{0,40}barn'],
 },
 {
  'id': 'farms-oak-ridge-north', 'prefix': 'FNO', 'kind': 'farms',
  'title': 'North of the borough: Oak Ridge, Oak Hill, Blocher\'s Knoll, the Carlisle, Mummasburg and Harrisburg roads',
  'scope': 'The Forney, Hagy and McLean farms (basemap farm keys forney, hagy_beams, mclean), the Warren-plate farmsteads north of the borough (labels Blocher, Crawford, Kitsman, '
           'Josiah, Schaffer and others: OCR hints), the buildings of the first-day northern fight, and their fences and lanes.',
  'targets': [{'name': 'Forney farmstead (demolished 1937)', 'basis': 'STR-FORNEY-HOUSE1; NPS-CLI-1STDAY p.60'}, {'name': 'Hagy / Beams farm', 'basis': 'STR-HAGY_BEAMS-*'},
              {'name': 'McLean farm', 'basis': 'STR-MCLEAN-*'}, {'name': 'Blocher farm', 'basis': 'Warren labels DAVID BLOCKER, JOHN BLOCKER (OCR hints)'}],
  'sources': ['NPS-CLI-1STDAY', 'NPS-CLR-1STDAY', 'NPS-CLI-LANDSCAPE', 'NPS-MCCLEAN-HOUSE-BARN', 'NPS-HSR-MCCLEAN-BARN', 'OR27-1', 'OR27-2', 'JACOBS-1864', 'GBG-COMPILER-1863',
              'ADAMS-SENTINEL-1863', 'HOPKINS-1858-COUNTY', 'WARREN-1869', 'PA-GB-1904'],
  'queries': ['gettysburg forney farm', 'oak ridge farm buildings burned', 'blocher farm gettysburg', 'harrisburg road farm gettysburg'],
  'photos': ['2014646002'],
  'issues': ['Many Warren symbols north and north-east of the borough are outside the loaded ground: they are worked here and flagged "beyond the ground", never dropped.'],
  'terms': ['Forney', 'Blocher', 'Oak Ridge', 'Oak Hill', 'McLean', 'Hagy', 'Kitsman', 'Crawford', 'Harrisburg [Rr]oad', 'Carlisle [Rr]oad', 'Mummasburg'],
 },
 {
  'id': 'farms-east-hanover-york', 'prefix': 'FEA', 'kind': 'farms',
  'title': 'East of Rock Creek: Benner\'s Hill, the Hanover Road, the York Pike, East Cavalry Field (Rummel)',
  'scope': 'The Rummel farm (record bld-rummel-farm: the barn survives, Stuart\'s men cut loopholes in the planking on 3 July; fences destroyed), the Benner, Wolf, Monfort, Mummard, Erbst, War and other farmsteads of the Warren plate east of the borough '
           '(OCR labels), the farm lanes and fences, and the farms along the Hunterstown and Low Dutch roads that stood within the battlefield of 3 July.',
  'targets': [{'name': 'Rummel farm (barn with cut loopholes)', 'basis': 'record bld-rummel-farm; plan S-054'},
              {'name': 'Benner farm', 'basis': 'Warren labels D. BENNER, BENNE (OCR hints); named in the task'}],
  'sources': ['OR27-1', 'OR27-2', 'NPS-CLI-LANDSCAPE', 'NPS-ADHI', 'JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'HOPKINS-1858-COUNTY', 'WARREN-1869', 'PA-GB-1904', 'PA-GB-1914-v2'],
  'queries': ['rummel farm barn gettysburg', 'daniel lady farm hospital', 'benner hill farm gettysburg', 'hanover road farm barn burned'],
  'photos': [],
  'issues': ['The Rummel loopholes (S-054) are documented only through Stone Sentinels (a lead): find the report or the NPS text.'],
  'terms': ['Rummel', 'Lady', 'Benner', 'Hanover [Rr]oad', 'York [Pp]ike', 'loophole', 'Wolf', 'Brinkerhoff', 'East Cavalry'],
 },
 {
  'id': 'farms-culps-hill-baltimore-pike', 'prefix': 'FCH', 'kind': 'farms',
  'title': 'Culp\'s Hill, Spangler\'s Spring, Rock Creek and the Baltimore Pike east of Cemetery Hill (Culp, Spangler, Lady, Taney, Granite Schoolhouse)',
  'scope': 'The Henry Culp farm (record bld-henry-culp-farm; STR-CULP-*; five symbols, error 45 m), the George Spangler farm (the XI Corps hospital: record bld-spangler-farm; '
           'IDENTITY ISSUE TW-ID-01 below), the Granite Schoolhouse (record bld-granite-schoolhouse; razed 1921; no geometry), the Taney farm (record bld-taney-farm), the Daniel Lady farm (record bld-daniel-lady-farm: Confederate field hospital; plan row "documented (hospital); open gap (details)"), the Guinn '
           'farm (STR-LOST-GUINN_FARM), the Baltimore Pike farmsteads of the Warren plate (labels Signad, Ens, Pfeifer, Lightner, Cassalt, Heck, Wolf, Conover, Horn and others: '
           'OCR hints), the Rock Creek and White Run hospital complex (H-17) as buildings, the stone walls P-08, P-09 and the farm lanes.',
  'targets': [{'name': 'George Spangler farm (XI Corps hospital)', 'basis': 'record bld-spangler-farm, plan row "Hospital Road"; NPS-SPANGLERS-SPRING'},
              {'name': 'Culp farm', 'basis': 'record bld-henry-culp-farm'}, {'name': 'Granite Schoolhouse', 'basis': 'record bld-granite-schoolhouse (built 1862 per plan; razed 1921)'},
              {'name': 'Taney farm', 'basis': 'record bld-taney-farm (shelled by 1st NY Battery M on 3 July per plan)'}],
  'sources': ['NPS-SPANGLERS-SPRING', 'NPS-HS-SPANGLER-HENRY', 'NPS-CLI-LANDSCAPE', 'NPS-CLR-CEMETERY', 'NPS-ADHI', 'OR27-1', 'OR27-2', 'JACOBS-1864', 'GBG-COMPILER-1863',
              'ADAMS-SENTINEL-1863', 'WARREN-1869', 'HOPKINS-1858-COUNTY', 'HABS', 'PA-GB-1904', 'NY-GB-1900'],
  'queries': ['spangler farm hospital eleventh corps', 'culp farm gettysburg', 'granite schoolhouse hospital', 'taney house gettysburg sharpshooters', 'rock creek hospital white run'],
  'photos': [],
  'issues': ['TW-ID-01 (identity): the record bld-spangler-farm and hospital H-06 carry the details of George Spangler\'s farm (plan row: Hospital Road, 166 acres, XI Corps hospital, '
             'bank barn with 7 ft forebay); the product draws it on the geometry STR-SPANGLER_H-* which the NPS historical statement (NPS-HS-SPANGLER-HENRY, p.2, OCR text) places '
             '"between the Emmitsburg Road and Seminary Ridge", north of the Sherfy farm and south of the Codori farm, and the gazetteer "Spangler farm" lies there too. The two farms '
             'are different places. Neither reading is chosen here: the pass reads both farms from local texts and carries the identity as a selectable conflict (Law cl.6).',
             'The Warren plate labels symbols near the Baltimore Pike "HENRY SPANGLER" (OCR hints, five symbols about 1.9 km south-east of the Diamond): the label does not decide which Spangler owned it in 1863.'],
  'terms': ['Spangler', "Culp'?s? [Hh]ill", 'Henry Culp', 'Granite Schoolhouse', 'Taney', 'Lady', 'Guinn', 'Rock Creek.{0,40}(hospital|farm)', 'Baltimore [Pp]ike.{0,60}hospital', 'White Run', 'Powers'],
 },
 {
  'id': 'farms-cemetery-ridge-taneytown', 'prefix': 'FCR', 'kind': 'farms',
  'title': 'Cemetery Ridge and the Taneytown Road: Leister, Hummelbaugh, Bryan, Biggs, Weikert, Frey, Patterson',
  'scope': 'The Leister house and barn (Meade headquarters; record bld-leister-house), the Hummelbaugh farm (II Corps hospital), the Bryan (Brien) farm, the Biggs house, the '
           'George and John Weikert farms (V Corps 2nd Division hospital), the Frey and Patterson farmsteads of the Warren plate, the Fisher log house, their fences and walls '
           '(Leister, Brian, the Cemetery Ridge walls, the Angle wall P-01, the Leister photograph wall P-13), and the Taneytown Road buildings south to the Round Tops.',
  'targets': [{'name': 'Leister house, barn', 'basis': 'record bld-leister-house; STR-LEISTER-*; NPS-HSR-LEISTER-BARN'},
              {'name': 'Hummelbaugh farm', 'basis': 'record bld-hummelbaugh-farm'}, {'name': 'Bryan farm (house, barn, bake oven, second house)', 'basis': 'record bld-brian-farm; NPS-BRIEN-FARM; NPS-BRYAN-HOUSE'},
              {'name': 'Biggs house', 'basis': 'record bld-biggs-house'}, {'name': 'George and John Weikert farms', 'basis': 'records bld-weikert-farm; STR-GWEIKERT-*, STR-JWEIKERT-*'}],
  'sources': ['NPS-HSR-LEISTER-BARN', 'NPS-BRIEN-FARM', 'NPS-BRYAN-HOUSE', 'NPS-CLI-PCB', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2', 'NPS-CLI-LANDSCAPE', 'NPS-CARE-WOUNDED-GUIDE', 'OR27-1', 'OR27-2',
              'TPIERCE-1889', 'JACOBS-1864', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'WARREN-1869', 'HOPKINS-1858-COUNTY', 'HABS-pa2627', 'MEADE-LL-v2', 'NY-GB-1900', 'PA-GB-1904'],
  'queries': ['leister house meade headquarters', 'bryan house hays headquarters', 'hummelbaugh hospital second corps', 'weikert hospital fifth corps', 'taneytown road farm hospital'],
  'photos': ['2018666296', '2018672035', '2018671488', '98519365', '2018666298', '2012647702'],
  'issues': ['The Leister house of 1863 was two rooms of wood; the later two-storey addition is not 1863 (plan row; NPS).',
             'The Bryan house and barn are reconstructions (plan row; NPS-BRYAN-HOUSE restoration report): reconstruction dimensions are not 1863 dimensions without a text that says so.',
             'Photographs 2018666296 (Leister: "roughly" in the photo-match ledger) and 2018666298 (Bryan: cannot judge) are evidence for what is visible, never for a measurement.'],
  'terms': ['Leister', 'Hummelbaugh', 'Br[iy]e?a?n', 'Biggs', 'Weikert', 'Frey|Fry', 'Patterson', 'Taneytown [Rr]oad', 'Meade.{0,40}head[- ]?quarters', 'Cemetery Ridge', 'Hays'],
 },
 {
  'id': 'farms-emmitsburg-road', 'prefix': 'FER', 'kind': 'farms',
  'title': 'The Emmitsburg Road farms: Codori, Klingel, Rogers, Bliss, Sherfy, Wentz, Henry Spangler, Staub',
  'scope': 'The Codori farm (house of 1834 and brick addition of 1877, barn taken down 1882), the Klingel farm (log house; wounded sheltered; fences gone), the Rogers house '
           '(log; cellar used for wounded; torn down in the 1880s), the Bliss house and barn (burned on 3 July), the Sherfy house and barn (barn burned; orchard), the Wentz log house, '
           'the Henry Spangler farm (STR-SPANGLER_H-*: house, barn burned in the battle, smokehouse, stable; see TW-ID-01 in the Culp\'s Hill group), the Staub farm, the double '
           'post-and-rail fences of the road (FEN-emmitsburg-road, FEN-klingle, FEN-sherfy-orchard, FEN-warfield) and the walls P-10, P-11.',
  'targets': [{'name': 'Codori farm', 'basis': 'record bld-codori-farm; NPS-CLI-PCB'}, {'name': 'Klingel farm', 'basis': 'record bld-klingle-farm; NPS-CLI-ERR'},
              {'name': 'Rogers house', 'basis': 'record bld-rogers-house'}, {'name': 'Bliss farm (house, barn)', 'basis': 'record bld-bliss-farm'},
              {'name': 'Sherfy farm (house, barn, outbuilding, orchard)', 'basis': 'record bld-sherfy-farm; NPS-CLI-ERR'}, {'name': 'Wentz farm', 'basis': 'record bld-wentz-farm'},
              {'name': 'Henry Spangler farm', 'basis': 'STR-SPANGLER_H-*; NPS-HS-SPANGLER-HENRY'}],
  'sources': ['NPS-CLI-ERR', 'NPS-CLI-PCB', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2', 'NPS-EXTENSION-1940', 'NPS-HS-SPANGLER-HENRY', 'NPS-BRIEN-FARM', 'NPS-COMMON-PRIDE-1', 'NPS-TPG-COMMEM',
              'OR27-1', 'OR27-2', 'GBG-COMPILER-1863', 'ADAMS-SENTINEL-1863', 'WARREN-1869', 'HOPKINS-1858-COUNTY', 'HABS-pa2625', 'NY-GB-1900', 'PA-GB-1904'],
  'queries': ['sherfy barn burned gettysburg', 'bliss barn burned gettysburg', 'codori farm gettysburg', 'klingel house gettysburg wounded', 'emmitsburg road fences pickett'],
  'photos': ['2018666303'],
  'issues': ['TW-ID-01: see the Culp\'s Hill group: STR-SPANGLER_H-* is carried here as Henry Spangler\'s farm on the evidence of NPS-HS-SPANGLER-HENRY and the gazetteer; the hospital details of the plan row belong to the farm worked in farms-culps-hill-baltimore-pike.',
             'Sherfy and Bliss fire times conflict (plan B.8.2; DD-PD rows): carry every reading, choose none.',
             'The Codori barn of 1863 was smaller and was torn down in 1882: the basemap point is the barn "standing in 1868-69", not a documented 1863 footprint.'],
  'terms': ['Codori', 'Klingel|Klingle', 'Rogers', 'Bliss', 'Sherfy', 'Wentz', 'Staub', 'Peach [Oo]rchard', 'Emmitsburg [Rr]oad', 'Spangler.{0,40}(farm|barn)'],
 },
 {
  'id': 'farms-wheatfield-round-tops', 'prefix': 'FWR', 'kind': 'farms',
  'title': 'Plum Run, the Wheatfield and the Round Tops: Trostle, Rose, Slyder, Bushman, Warfield, Snyder',
  'scope': 'The Trostle farm (frame house, brick barn with the shell hole, hog pen, summer kitchen), the Rose farm (stone house of 1811, stone barn burned 1910 not in the battle), '
           'the Slyder farm (granite house, barn), the Bushman farm (house parts of 1808 and a brick addition of 1860, barn a temporary hospital, a tablet naming a XII Corps hospital at the house: all leads until a local text carries them), the Warfield (James) house and the Snyder '
           'farm on the Warfield Ridge, the stone walls P-04, P-05, P-06, P-14, the farm lanes and fences (Warfield), and the Plum Run buildings.',
  'targets': [{'name': 'Trostle farm', 'basis': 'record bld-trostle-farm; NPS-CLR-LRT; photograph 2018670894'}, {'name': 'Rose farm', 'basis': 'record bld-rose-farm'},
              {'name': 'Slyder farm', 'basis': 'record bld-slyder-farm; NPS-HSR-SLYDER; NPS-SLYDER-GUIDE'}, {'name': 'Bushman farm', 'basis': 'record bld-bushman-farm'},
              {'name': 'Warfield (James) house and Snyder farm', 'basis': 'records bld-warfield-house, bld-snyder-farm; NPSGOV-WARFIELD-HOUSE'}],
  'sources': ['NPS-CLR-LRT', 'NPS-CLI-LRT', 'NPS-HSR-SLYDER', 'NPS-SLYDER-GUIDE', 'NPS-VISTA-CUTTING', 'NPS-CLI-ERR', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2', 'OR27-1', 'OR27-2', 'GBG-COMPILER-1863',
              'ADAMS-SENTINEL-1863', 'WARREN-1869', 'HOPKINS-1858-COUNTY', 'HABS-pa1728', 'HABS-pa0005', 'NY-GB-1900', 'PA-GB-1904', 'ME-GB-1898'],
  'queries': ['trostle barn gettysburg shell', 'rose farm wheatfield hospital', 'slyder farm gettysburg', 'bushman farm gettysburg', 'warfield house gettysburg'],
  'photos': ['2018670894', '2013645105', '2018666308', '2018670852'],
  'issues': ['The Rose barn burned in 1910 (not the battle); the NPS and a web source conflict on the cause (basemap note): carry both.',
             'The Trostle summer kitchen footprint lies on the other side of the house from the photograph (photomatch EG-12): do not use the 2023 outline of the kitchen without the check.'],
  'terms': ['Trostle', 'Rose', 'Slyder', 'Bushman', 'Warfield', 'Snyder', 'Wheatfield', 'Plum Run', 'Devil.s Den', 'Round Top', 'Houck'],
 },
 {
  'id': 'terrain-changes-since-1863', 'prefix': 'TER', 'kind': 'terrain',
  'title': 'Terrain changes since 1863: quarries, railroad cuts and grading, avenues, rebuilt walls, modern roads, ponds, removed knolls',
  'scope': 'Where the modern elevation model (the 1 m bare-earth DEM the app ground is built from) differs from the ground of July 1863 ACCORDING TO A SOURCE: quarries and '
           'excavations, the railroad cut and fills (the cut as of 1863 versus as of today), regrading for parks, avenues and parking (the monument avenues of the GBMA and the '
           'War Department, 17 miles by 1896: the avenues are never drawn), rebuilt or rebuilt-on-new-line walls (the NPS walls of 48-52 in. are not the 1863 profile), modern '
           'roads and cuts, ponds, drained or filled wetlands, the removal or reshaping of knolls, vista cuttings. Each row says: the feature, the place, the date of the change, '
           'the sign and size of the elevation difference only when a source gives it, the tier. The elevation model itself is not edited.',
  'targets': [{'name': 'Monument avenues', 'basis': 'RD-avenues; plan B.8.4 (17 miles by 1896)'}, {'name': 'Rebuilt walls of Cemetery Ridge, Culp\'s Hill, Little Round Top', 'basis': 'plan B.7.3, B.7.6'},
              {'name': 'Quarries', 'basis': 'lead: the plan names quarry changes (B.9.2 step 2); the pass finds each quarry in a text'},
              {'name': 'Railroad cut regrading', 'basis': 'plan B.9.2 step 2 (the cut up to 15 ft deep per Wikipedia, a lead)'}],
  'sources': ['NPS-CLR-1STDAY', 'NPS-CLI-1STDAY', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2', 'NPS-CLR-LRT', 'NPS-CLI-LRT', 'NPS-CLI-LANDSCAPE', 'NPS-CLR-CEMETERY', 'NPS-DCP-LRT', 'NPS-VISTA-CUTTING',
              'NPS-DEV-POLICY', 'NPS-ADHI', 'NPS-GMP-1999-V1', 'NPS-TPG-COMMEM', 'NPS-COMMON-PRIDE-1', 'NPS-COMMON-PRIDE-2', 'NPS-COMMON-PRIDE-3', 'WARREN-1869', 'COPE-1863', 'COPE-CULPS-1898', 'GNMP-1900'],
  'queries': ['gettysburg quarry', 'gettysburg railroad cut regraded', 'gettysburg avenues built', 'gettysburg pond', 'gettysburg battlefield memorial association roads'],
  'photos': [],
  'issues': ['Do not derive 1863 profiles from the modern rebuilt Culp\'s Hill, Little Round Top or Cemetery Ridge walls (CLAUDE.md): a rebuilt wall is a `later` row, never a form row.',
             'An elevation difference is a number: it needs a quote that states it, or the row is an open gap.',
             'The terrain pipeline (workstream terrain, plan B.9.2 step 2) owns the DEM and its error model: these rows are its evidence, delivered by request note.'],
  'terms': ['quarr(y|ies)', 'railroad cut', 'grad(ed|ing)', 'avenue', 'pond', 'excavat', 'embankment', 'filled', 'regrad', 'rebuilt wall', 'Spangler.s Spring'],
 },
]
