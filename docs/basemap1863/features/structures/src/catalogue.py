# Curated catalogue of structures standing (or documented) in July 1863 inside the battlefield bounds.
# Every building is an entry B(...). Position sources (exactly one per entry):
#   cty=<index>     footprint taken from the 2023 Adams County outline of the SURVIVING building (identity checked by name/NPS description)
#   sym=(cluster,i) position from the i-th symbol of a curated farmstead cluster on the Bachelder/Warren plate (evidence/clusters_a_positions.json)
#   pt=(lon,lat,err_m,why)  explicit coordinates from a named external source
#   none            location UNKNOWN: no geometry is drawn
# status: 'survives' | 'survives_altered' | 'destroyed_1863' | 'lost_later' | 'ruin' | 'unknown_fate'
# conf: Documented (named in an NPS/HABS/claim source AND position tied to a surviving or marked site)
#       Estimated  (supported by the Warren-plate symbol and/or an NPS statement but position or identity less certain)
#       Contested  (sources disagree)  |  Unknown

FARMS = []


def F(key, name, owner_1863, notes, buildings):
    FARMS.append(dict(key=key, name=name, owner_1863=owner_1863, notes=notes, buildings=buildings))


def B(role, subtype, name, status, present=True, cty=None, sym=None, pt=None, dims=None, material=None, roof=None, built=None,
      conf='Documented', period='', src=(), notes='', err=None, fabric=None):
    return dict(role=role, subtype=subtype, name=name, status=status, present=present, cty=cty, sym=sym, pt=pt, dims=dims,
                material=material, roof=roof, built=built, conf=conf, period=period, src=list(src), notes=notes, err=err, fabric=fabric)


def R(key, loc, quote):
    return (key, loc, quote)


# ---------------------------------------------------------------- Emmitsburg Road Ridge
F('klingel', 'Daniel Klingel farmstead', 'D. Klingel (house name per NPS); the Warren plate reads a different occupant name near the symbol',
  'Only the house and the bake oven pre-date the battle (Treatment Philosophy 2004).',
  [B('house', 'farmhouse', 'Klingel farm house', 'survives_altered', cty=6979, sym=('klingel', 0), dims='26 x 21 ft (main log block)', material='log, stone foundation',
     roof='wood shingle, gable', built='c.1850', fabric='main log block',
     src=[R('NPS-CLI-EMM', 'Buildings and Structures, Daniel F. Klingle Farm House (NR 2004 Sec.7:5)',
            'Two-story log house 26 x 21 ft on stone foundation; a 16 x 25 ft frame cross-gable addition (1870s) and a 17 x 10 ft lean-to were recently removed by NPS; Carr\'s brigade fortified itself in the house on July 2.'),
          R('NPS-TP-2004', 'ch.2 Farm Building Complexes (D. Klingel farmstead)', 'The main house and bake oven are the only structures left that pre-date the battle.')],
     period='Standing 1863; Union fortification 2 July, Confederate artillery screen 3 July', notes='Footprint is the 2023 outline of the surviving building.'),
   B('bake_oven', 'outbuilding', 'Klingel exterior bake oven', 'survives', dims=None, built='pre-1863', conf='Documented',
     src=[R('NPS-CLI-EMM', 'Klingle Farm House entry', 'An exterior bake oven is located to the east of the house.'),
          R('NPS-TP-2004', 'ch.2', 'Main house and bake oven are the only structures that pre-date the battle.')],
     notes='Stands east of the house; its footprint is not separately mapped in any source read, so no geometry is drawn (UNKNOWN).'),
   B('outbuilding', 'building', 'Klingel farmstead: wood building NE of the house (Warren plate)', 'unknown_fate', sym=('klingel', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet, symbol marked W', 'A filled symbol marked W (wood) lies about 30 m north-east of the house symbol.'),
          R('NPS-TP-2004', 'ch.2', 'Only the house and bake oven survive from before the battle; other 1863 buildings are lost or unknown.')],
     notes='Function unresolved (possibly the 1863 barn, which NPS does not locate).')])

F('trostle', 'Abraham (Catherine) Trostle farmstead', 'A. Trostle', 'Third Corps (Sickles) headquarters site; barn struck by solid shot; photographed by O\'Sullivan July 1863.',
  [B('house', 'farmhouse', 'Trostle farm house', 'survives_altered', cty=10049, sym=('trostle', 2), dims='32 x 31 ft (hall-and-parlor frame house); north addition 14 x 31 ft was under construction in 1863',
     material='wood frame, lap siding, granite foundation', roof='wood shingle, gable', built='1850s-1860s', fabric='main block (the north addition was being built during the battle)',
     src=[R('NPS-CLI-EMM', 'Abraham (Catherine) Trostle Farm House (NR 2004 Sec.7:11)',
            'Two-story hall-and-parlor frame house 32 x 31 ft; a wood-framed addition of 14 x 31 ft was added on the north end during 1863 and was under construction during the battle; used as a hospital after 5 July.')],
     period='Standing; Confederate sharpshooters on the Plum Run skirmish line 2-3 July'),
   B('barn', 'bank_barn', 'Trostle barn', 'survives', cty=14014, sym=('trostle', 0), dims='80 x 64 ft', material='brick and frame, granite foundation', roof='wood shingle, gable', built='1850-1860',
     src=[R('NPS-CLI-EMM', 'Abraham (Catherine) Trostle Farm Barn (NR 2004 Sec.7)', 'Two-story brick and frame Pennsylvania bank barn, 80 x 64 ft with a 6 x 15 ft lean-to; solid-shot damage on the south gable; used by Third Corps batteries 2 July.'),
           R('HABS-PA', 'HABS Trostle Barn, https://www.loc.gov/item/pa1728/', 'Measured drawings of the surviving barn.')],
     period='Standing; battery position July 2; Confederate-held 2-3 July'),
   B('summer_kitchen', 'outbuilding', 'Trostle summer kitchen (under construction)', 'survives', cty=7406, dims='20 x 16.5 ft', material='brick, stone foundation', roof='wood shingle, gable', built='1862-1863',
     conf='Estimated', src=[R('NPS-CLI-EMM', 'Trostle Farm Summer Kitchen (NR 2004 Sec.7:11)', 'One-story three-bay brick building 20 x 16.5 ft; photographic evidence shows it under construction during the battle.'),
                            R('HABS-PA', 'HABS Trostle Farm Summer Kitchen, https://www.loc.gov/item/pa4187/', 'Measured drawings.')],
     notes='Two 2023 outlines of 28-29 square metres (7406 and 8828) lie near the house and match either the 20 x 16.5 ft summer kitchen (30.7 m2) or the 1880s carriage house (12 x 25 ft = 27.9 m2); the assignment is not resolved. 7406 is drawn.', err=15),
   B('hog_pen', 'outbuilding', 'Trostle log hog pen (seen in O\'Sullivan photograph)', 'lost_later', conf='Documented',
     src=[R('NPS-TP-2004', 'Figure 2-13 caption', 'Mathew Brady/O\'Sullivan July 1863 view of the Trostle barn shows a stacked hewn-log hog pen at the right end of the barn, hog-pen fencing and a barnyard gate.')],
     notes='Stood against the east end of the barn; no source gives coordinates, so no geometry (UNKNOWN).')])

F('sherfy', 'Joseph Sherfy farmstead (Peach Orchard)', 'J. Sherfy', 'Barn burned 3 July 1863 with wounded inside.',
  [B('house', 'farmhouse', 'Sherfy farm house', 'survives_altered', cty=10287, sym=('sherfy', 0), dims='30 x 41 ft (brick Georgian, 2 stories, 3 bays) plus 1-story brick kitchen ell',
     material='brick on granite foundation', roof='wood shingle, gable', built='1840-1860', fabric='main block and 1-story kitchen ell (second floor of the ell added after 1870; frame addition 1880s)',
     src=[R('NPS-CLI-PICKETT', 'Joseph Sherfy Farm: House (NR 2004 Sec.7:8)',
            '2-story, 3-bay brick Georgian house 30 x 41 ft with a one-story brick kitchen ell; after 1870 a brick second floor was added to the ell and in the 1880s a frame addition filled the space behind.')],
     period='Standing; Graham\'s brigade fortified it 2 July; Confederate guns in the yard 3 July',
     notes='2023 outline includes the post-1870 additions.'),
   B('barn', 'barn', 'Sherfy barn of 1863 (burned 3 July 1863)', 'destroyed_1863', sym=('sherfy', 2), pt=None, conf='Documented', dims=None, built='pre-1863',
     src=[R('NPS-CLI-PICKETT', 'Joseph Sherfy Farm: Barn (NR 2004 Sec.7:15)',
            'The present 1868 bank barn was constructed on the site of the battle-era barn, which was destroyed during the battle; it had sheltered wounded Union soldiers, many of whom died in the fire.'),
          R('NEWS-COMPILER-1863', 'Gettysburg Compiler 20 July 1863 (via Gettysburg Daily)', 'Reports twenty wounded Zouaves perished in the burning barn.')],
     notes='1863 barn was an English-type barn smaller than the 1868 bank barn (53 x 40 ft); its own footprint is UNKNOWN. A point at the site of the 1868 barn is drawn.', fabric='none (replaced 1868)'),
   B('outbuilding', 'building', 'Sherfy farmstead: wood building W of the house (Warren plate)', 'unknown_fate', sym=('sherfy', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet, symbol marked W', 'Filled symbol marked W near the house.')], notes='Function unresolved.')])

F('codori', 'Nicholas Codori farmstead', 'N. Codori', 'On the Emmitsburg Road in front of Cemetery Ridge; obstacle to Pickett-Pettigrew assault.',
  [B('house', 'farmhouse', 'Codori farm house (1834 section)', 'survives_altered', cty=9137, sym=('codori', 0), dims='18 x 33 ft (1834 brick section); later ell 25 x 15 ft (1877) and 1941 addition not present in 1863', material='brick on granite foundation',
     roof='wood shingle, gable', built='c.1834', fabric='1834 section only',
     src=[R('NPS-CLI-PICKETT', 'Nicholas Codori Farm: House (NR 2004 Sec.7:3)', 'Two-story brick L-shaped house 43 x 33 ft; the 1834 section measures 18 x 33 ft; 1877 cross-gable ell 25 x 15 ft; 1941 frame addition 10 x 24 ft.')],
     period='Standing; inside the Union skirmish line, wounded sheltered; Kemper carried to its walls 3 July', notes='2023 outline includes the 1877 and 1941 additions that did not exist in 1863.'),
   B('barn', 'barn', 'Codori barn standing in 1868-69 (Warren plate)', 'unknown_fate', sym=('codori', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet, large symbol marked W by N. CODORI', 'A large filled wood-building symbol lies SW of the house symbol.'),
          R('NPS-CLI-PICKETT', 'Nicholas Codori Farm: Barn (NR 2004 Sec.7:13-14)', 'The present 43 x 80 ft Pennsylvania bank barn dates from 1884; NPS (2004) notes later barns usually stand on the sites of their 1863 predecessors.')],
     notes='Whether the 1884 barn occupies exactly the 1863 barn site is not documented; footprint of the 1863 barn UNKNOWN.'),
   B('outbuilding', 'building', 'Codori farmstead: wood building E of the barn (Warren plate)', 'unknown_fate', sym=('codori', 2), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet, symbol marked W', 'Filled symbol marked W between house and barn.')], notes='Function unresolved.')])

F('spangler_h', 'Henry Spangler farmstead', 'H. Spangler', 'Pickett\'s division formed behind it 3 July; barn burned during the battle.',
  [B('house', 'farmhouse', 'Henry Spangler farm house', 'survives', cty=346, dims='29 x 21 ft log hall-and-parlor block with 20 x 29 ft brick-and-stone rear ell', material='log, board-and-batten, ell of brick and stone; stone foundation',
     roof='wood shingle, gable', built='c.1820', fabric='block and ell',
     src=[R('NPS-CLI-PICKETT', 'Henry Spangler Farm: House (NR 2004 Sec.7:9)', 'House at 999 Emmitsburg Road, 2-story log hall-and-parlor house with board-and-batten siding, 29 x 21 ft with brick and stone ell 20 x 29 ft; barn burned during the battle, house damage limited to contents.'),
           R('NPS-HS-SPANGLER', 'Historical Statement: Henry Spangler Farm Buildings', 'Historical study of the farm buildings.')],
     notes='Warren-plate house symbol lies 28 m N of this outline (map-vs-survey offset recorded in evidence).'),
   B('barn', 'bank_barn', 'Henry Spangler barn (burned in the battle; 1935 reconstruction on the old foundation)', 'destroyed_1863', cty=1977, sym=('spangler_h', 0), dims='43 x 84 ft (1935 barn)', material='frame, vertical board', roof='gable', built='1935 (on foundations of the pre-war barn)',
     fabric='foundations only',
     src=[R('NPS-CLI-PICKETT', 'Henry Spangler Farm: Barn (NR 2004 Sec.7:15)', '2-story gable-roof bank barn 43 x 84 ft built 1935 on foundations of the pre-Civil War barn destroyed during the battle.'),
          R('HABS-PA', 'HABS PA-357 Spangler Barn, https://www.loc.gov/item/pa0018/', 'HABS (1950s) said only that the barn was thought to have been built before the Civil War; the later NPS finding is preferred.')],
     conf='Documented', notes='The drawn polygon is the 2023 outline of the 1935 barn, which NPS states stands on the old foundation; the 1863 barn\'s own dimensions are not documented.'),
   B('outbuilding', 'smokehouse', 'Spangler smokehouse', 'survives', dims='9 x 8 ft', material='brick, stone foundation', roof='wood shingle, hip', built='c.1860s', conf='Estimated',
     src=[R('NPS-CLI-PICKETT', 'Henry Spangler Farm: Smokehouse (NR 2004 Sec.7:9)', 'Common-bond brick smokehouse 9 x 8 ft with hip roof, c.1860s.')],
     notes='One of the small 2023 outlines 5425/9179/11824; assignment not resolved, so no geometry is drawn (UNKNOWN).'),
   B('outbuilding', 'stable', 'Spangler stable and carriage shed', 'survives', dims='19 x 13 ft', material='frame, stone foundation', roof='wood shingle, gable', built='c.1850s-1860s', conf='Estimated',
     src=[R('NPS-CLI-PICKETT', 'Henry Spangler Farm: Stable and Carriage Shed (NR 2004 Sec.7:9)', '1-story frame building 19 x 13 ft, c.1850s-1860s.')],
     notes='Assignment among small 2023 outlines not resolved; UNKNOWN geometry.'),
   B('outbuilding', 'building', 'Spangler farmstead: wood buildings on the Warren plate (cluster W of house)', 'unknown_fate', sym=('spangler_h', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet', 'Symbols marked W between barn and house.')], notes='Function unresolved.')])

F('bryan', 'Abraham Brien (Bryan) farmstead', 'A. Brien (free African American family)', 'Behind the Union line at The Angle; barn and house inside the fighting of 3 July.',
  [B('house', 'farmhouse', 'Brien (Bryan) house', 'survives_altered', cty=4533, sym=('bryan', 0), dims='1.5-story small frame house in 1863', material='wood frame, stone foundation', roof='wood shingle', built='before 1863', fabric='1.5-story form in the 1863 Brady photograph; later raised to an L-shaped 2-story house (1863-1880) then restored in 1957',
     src=[R('HABS-PA', 'HABS PA-342 Bryan House (https://www.loc.gov/item/pa0012/)', 'Standing in 1863 (Brady photograph); stone foundations, wood frame, horizontal board siding, shingled roof; restored 1957.'),
          R('NPS-HS-BRIEN', 'The Brien Farm and Family', 'The Briens lived in a small story-and-a-half structure remodelled into a two-story L-shaped house between 1863 and 1880; Warren places the house about 30 ft NE of the barn.')],
     notes='2023 outline is the present remodelled house; 1863 footprint smaller (story-and-a-half).'),
   B('barn', 'barn', 'Brien (Bryan) barn', 'survives_altered', cty=5509, sym=('bryan', 1), conf='Estimated', built='before 1863',
     src=[R('NPS-HS-BRIEN', 'The Brien Farm and Family', 'The Brien barn stands SW of the house; Warren, Cope and the present house-barn distances differ (30 ft, 81 ft, 75 ft); no evidence the barn was moved when Hancock Avenue was built.')],
     notes='Whether the present barn is the 1863 fabric is not stated in the sources read.')])

F('leister', 'Lydia Leister farmstead (Meade headquarters)', 'L. Leister', 'Army of the Potomac headquarters 2-3 July; struck by Confederate shells 3 July.',
  [B('house', 'farmhouse', 'Leister house', 'survives_altered', cty=13528, sym=('leister', 0), dims='small 1863 plan (later two-story gable addition removed)', built='before 1863', fabric='1863 smaller plan',
     src=[R('NPS-THEN-NOW', 'Meade\'s Headquarters: Lydia Leister House', 'The house still stands; Meade held the council of war here on 2 July; it was damaged by Confederate fire on 3 July.'),
          R('NPS-HSR-LEISTER-BARN', 'HSR Leister Barn, scope of work', 'The barn and adjacent house were used for headquarters; the house was reduced to its smaller 1863 plan.'),
          R('HABS-PA', 'HABS Lydia Leister House, https://www.loc.gov/item/pa0014/', 'HABS record of the house.')]),
   B('barn', 'barn', 'Leister barn', 'survives', cty=7153, dims='37 ft 8 in long (N-S); width about 22 ft (HSR scan OCR is partly garbled)', material='log north bay with frame overshoot, post-and-frame bays; stone foundation',
     built='before 1863', conf='Documented', fabric='original frame, roof pitch altered after 1863',
     src=[R('NPS-HSR-LEISTER-BARN', 'Existing Fabric, A. General Plan', 'Leister barn sited about 60 yards west of the house, long axis north-south, perpendicular to the house; overall dimensions 37 ft 8 in by 22 ft (OCR); used as signal station and temporary hospital.'),
          R('HABS-PA', 'HABS Lydia Leister Barn, https://www.loc.gov/item/pa1413/', 'Measured drawings.')])])

F('hummelbaugh', 'Jacob Hummelbaugh farmstead', 'J. Hummelbaugh', 'Cavalry headquarters (Pleasonton) and hospital; Brig. Gen. Barksdale died here.',
  [B('house', 'farmhouse', 'Hummelbaugh house', 'survives', cty=3580, sym=('hummelbaugh', 1), material='frame', built='before 1863', conf='Documented',
     src=[R('NPS-CLR-ROT1', 'Area 9, Hummelbaugh Orchard', 'Union cavalry commander Pleasonton used the Hummelbaugh House for his headquarters; picket fencing documented around yard and garden.'),
          R('HABS-PA', 'HABS Hummelbaugh Farm House, https://www.loc.gov/item/pa1740/', 'HABS record of the house.')]),
   B('outbuilding', 'building', 'Hummelbaugh farmstead: second building W of house (Warren plate)', 'unknown_fate', cty=13683, sym=('hummelbaugh', 0), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W 45 m west of the house symbol; a 67 m2 building stands there in 2023.')],
     notes='Identity of the 2023 outline as the 1863 building is not independently confirmed; the Warren-plate symbol is 12 m from it.')])

F('gweikert', 'George Weikert farmstead', 'G. Weikert', 'Behind Cemetery Ridge; hospital; the NPS 2004 treatment study calls it well preserved.',
  [B('house', 'farmhouse', 'George Weikert house', 'survives', cty=8549, sym=('gweikert', 1), material='stone with large quoins, wooden porch', built='before 1863', conf='Documented',
     src=[R('HABS-PA', 'HABS PA-363 G. Weikert House (https://www.loc.gov/item/pa0019/)', 'Local stone, rough cut, large stones as quoins; wooden porch and trim; brick chimneys.'),
          R('NPS-TP-2004', 'ch.2 Examples Illustrating Possible Treatment', 'The farmstead consists of a stone farm house, wooden barn, wooden summer kitchen and a frame carriage house and corn crib; house, barn and summer kitchen pre-date the battle; the only building missing is a wood spring house.')]),
   B('barn', 'barn', 'George Weikert barn', 'survives', cty=2870, sym=('gweikert', 3), material='wood, board and batten', built='before 1863', conf='Documented',
     src=[R('HABS-PA', 'HABS PA-358 Weikert Barn (https://www.loc.gov/item/pa0020/)', 'Assumed built before the Civil War; wood board-and-batten; good repair.'),
          R('NPS-TP-2004', 'ch.2', 'Barn pre-dates the battle.')]),
   B('summer_kitchen', 'outbuilding', 'George Weikert summer kitchen', 'survives', cty=11108, sym=('gweikert', 2), material='brick and wood', built='before 1863', conf='Estimated',
     src=[R('HABS-PA', 'HABS PA-353 Weikert Summer Kitchen (https://www.loc.gov/item/pa0021/)', 'Assumed to be standing during the Civil War; brick and wood; restored by NPS.')],
     notes='Identity of 2023 outline 11108 as the summer kitchen is by position beside the house only.'),
   B('spring_house', 'outbuilding', 'George Weikert wood spring house', 'lost_later', conf='Documented',
     src=[R('NPS-TP-2004', 'ch.2', 'The only building missing from the original complex is a wood spring house.')], notes='Location UNKNOWN (no source gives coordinates).')])

F('jweikert', 'John Weikert farmstead', 'J. Weikert', 'Wheatfield Road/Taneytown Road; hospital use.',
  [B('house', 'farmhouse', 'John Weikert farm house', 'survives', cty=12138, sym=('jweikert', 2), built='before 1863', conf='Estimated',
     src=[R('OSM', 'way 453164455 John Weikert Farm House', 'Named building at the Warren-plate farmstead; NPS CLI Little Round Top lists the John Weikert (Althoff) farm and lane.'),
          R('NPS-CLI-LRT', 'Buildings and Structures: J. Weikert (Althoff) Farm Lane; 95th Pennsylvania wall', 'The farm lane connected the John Weikert farm buildings to Wheatfield Road.')],
     notes='Date and fabric of the surviving house not stated in the sources read; the Warren plate shows three buildings here.'),
   B('outbuilding', 'building', 'John Weikert farmstead: other symbols on the Warren plate', 'unknown_fate', sym=('jweikert', 0), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet', 'Three symbols marked W in a line along the farm lane.')], notes='Roles unresolved.'),
   B('outbuilding', 'building', 'John Weikert farmstead: second symbol', 'unknown_fate', sym=('jweikert', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.')])

F('rose', 'John Rose farmstead', 'J. Rose', 'Wheatfield fighting 2 July.',
  [B('house', 'farmhouse', 'Rose farm house (stone)', 'survives', cty=4419, sym=('rose', 0), material='stone', built='pre-1863', conf='Documented',
     src=[R('NPS-GMP-1999', 'Affected Environment, ruins and archeological sites', 'The Rose barn ruins are among the most visible on the battlefield; the Rose house is a surviving farm building.'),
          R('NPS-THEN-NOW', 'Rose farm (NPS Historic Rose House lodging page cited in search)', 'NPS describes the stone farmhouse still standing with interior battle damage.')],
     notes='Footprint is the 2023 outline (includes later additions); stone summer kitchen (c.1810) and wood smokehouse (c.1815) are also reported by NPS but not separately located.'),
   B('barn', 'barn', 'Rose barn (ruin)', 'ruin', sym=('rose', 2), conf='Estimated', built='pre-1863',
     src=[R('NPS-GMP-1999', 'Affected Environment', 'Ruins of the Rose barn are perhaps the most visible on the battlefield.'),
          R('NPS-HBM-1958', 'Historical Base Map 1958, remark on Rose farm buildings', 'The Rose barn was partially destroyed by a windstorm in 1935; its end walls still stand; the house was in private ownership.')],
     notes='Barn lost to a 1935 windstorm (NPS) - another web source gives a lightning fire in 1910; Contested cause, same site. Position is the Warren-plate barn symbol.'),
   B('outbuilding', 'building', 'Rose farmstead: wood building on the Warren plate', 'unknown_fate', sym=('rose', 1), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W near the house.')], notes='Function unresolved.')])

F('slyder', 'John Slyder farmstead', 'J. Slyder', 'South of Devil\'s Den, Plum Run; Confederate attack route.',
  [B('house', 'farmhouse', 'Slyder house (granite)', 'survives', cty=12158, sym=('slyder', 0), material='native granite with larger quoins, wood floors, plaster', built='before 1852', conf='Documented',
     src=[R('HABS-PA', 'HABS PA-356 Slyder House (https://www.loc.gov/item/pa0016/)', 'Date of erection before 1852; walls and foundation native Gettysburg granite; wood shingle roof; brick chimney; rehabilitated by NPS.')]),
   B('summer_kitchen', 'outbuilding', 'Slyder kitchen', 'survives', built='before 1863', conf='Estimated',
     src=[R('HABS-PA', 'HABS PA-356A Slyder House, Kitchen (https://www.loc.gov/item/pa0017/)', 'Measured drawings of the kitchen.')],
     notes='Separate footprint not identified; UNKNOWN geometry.'),
   B('barn', 'barn', 'Slyder barn', 'survives', cty=6452, sym=('slyder', 2), built='before 1863', conf='Estimated',
     src=[R('HABS-PA', 'HABS Slyder Barn (https://www.loc.gov/item/pa1739/)', 'HABS record of the barn; NPS historic structure report prepared for the Slyder farm buildings.')],
     notes='Date of the surviving barn not confirmed in the sources read.')])

F('bushman', 'Michael Bushman farmstead', 'M. Bushman', 'South end of the Union line; Confederate attack route.',
  [B('house', 'farmhouse', 'Bushman farm house', 'survives', cty=4852, sym=('bushman', 0), material='stone (Warren plate letter S)', built='before 1863', conf='Estimated',
     src=[R('HABS-PA', 'HABS Bushman House, Southern Pennsylvania District (https://www.loc.gov/item/pa0005/)', 'HABS record of the Bushman House.'),
          R('OSM', 'way 453167592 Bushman Farm House', 'Named building.')],
     notes='HABS also records a Bushman barn (https://www.loc.gov/item/pa1693/); the OSM-named barn (2023 outline 701) is not separately dated in the sources read and is not drawn.')])

F('warfield_snyder', 'Warfield / Snyder farmsteads', 'J. Warfield; P. Snyder', 'Warfield Ridge: Confederate battle line; Snyder farm severely altered (NPS 2004).',
  [B('house', 'farmhouse', 'Warfield house', 'survives', cty=9546, sym=('warfield', 0), built='before 1863', conf='Estimated',
     src=[R('OSM', 'way 710894171 Warfield House', 'Named building on Warfield Ridge; NPS has restored it (additions removed).'),
          R('WARREN-BACH', 'July-1 sheet, J. WARFIELD', 'Four symbols; the house symbol coincides with the surviving outline.')]),
   B('outbuilding', 'building', 'Warfield farmstead: other symbols (3)', 'unknown_fate', sym=('warfield', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbols marked W.')], notes='Roles unresolved.'),
   B('outbuilding', 'building', 'Warfield farmstead: other symbol 2', 'unknown_fate', sym=('warfield', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.'),
   B('outbuilding', 'building', 'Warfield farmstead: other symbol 3', 'unknown_fate', sym=('warfield', 3), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.'),
   B('outbuilding', 'building', 'Snyder farmstead: building 1 (Warren plate)', 'lost_later', sym=('snyder', 0), conf='Estimated',
     src=[R('NPS-TP-2004', 'note 26, ch.2', 'The Philip Snyder farmstead is listed among farmsteads that have been severely altered.'), R('WARREN-BACH', 'July-1 sheet, P. SNYDER', 'Symbols marked W.')], notes='Role unresolved.'),
   B('outbuilding', 'building', 'Snyder farmstead: building 2 (Warren plate)', 'lost_later', sym=('snyder', 1), conf='Estimated',
     src=[R('NPS-TP-2004', 'note 26, ch.2', 'Snyder farmstead severely altered.'), R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.')])

F('wentz', 'John Wentz farmstead (Peach Orchard)', 'J. Wentz', 'Log house in the orchard; artillery behind it 2 July. NPS lists the Wentz farm among those with ruins/foundations only.',
  [B('house', 'farmhouse', 'Wentz log house (site and ruin)', 'ruin', pt=(-77.24968, 39.80194, 20, 'OSM way 762935617 "Wentz House ruin" (NPS-marked site)'), sym=('wentz', 0), built='pre-1863', conf='Documented',
     src=[R('NPS-CLR-ROT1', 'Area 9 Wentz property', 'A battery of light artillery was posted in the rear of a little log house (John Wentz\'s) in the orchard; the Wentz buildings are no longer extant.'),
          R('NPS-GMP-1999', 'Archeological Resources', 'Building remains exist at the Wentz farm; no above-ground farm.'),
          R('NPS-CLI-PICKETT', 'Tablets: Wentz House Site [map 6]', 'Wentz House site is marked at the NE corner of Emmitsburg and Millerstown Roads.')],
     notes='The Warren plate shows 3 symbols; the one nearest the NPS-marked ruin is the house. Battle-related buildings at Wentz were removed (CLI Gettysburg Landscape).'),
   B('outbuilding', 'building', 'Wentz farmstead: building 2 (Warren plate)', 'lost_later', sym=('wentz', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.'),
   B('outbuilding', 'building', 'Wentz farmstead: building 3 (Warren plate)', 'lost_later', sym=('wentz', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='Role unresolved.')])

F('rogers', 'Peter Rogers farmstead', 'P. Rogers', 'Union skirmishers used the buildings; NPS lists the Rogers farm with no surface remains.',
  [B('house', 'farmhouse', 'Rogers farm buildings (3 Warren-plate symbols)', 'lost_later', pt=(-77.244, 39.80848, 20, 'OSM node 4487576365 "Rogers House Marker" (NPS tablet)'), sym=('rogers', 1), conf='Documented',
     src=[R('NPS-GMP-1999', 'Archeological Resources', 'The Rogers farm has no surface remains.'),
          R('NPS-TP-2004', 'note 26', 'Peter Rogers farmstead severely altered.'),
          R('OSM', 'node 4487576365 Rogers House Marker', 'A memorial plaque marks the Rogers house site.')],
     notes='Warren plate: three symbols (W W and one unlettered) around the lane; the marker point is used as an independent position check.'),
   B('outbuilding', 'building', 'Rogers farmstead: symbol 1', 'lost_later', sym=('rogers', 0), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes=''),
   B('outbuilding', 'building', 'Rogers farmstead: symbol 3', 'lost_later', sym=('rogers', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Unlettered symbol.')], notes='')])

F('bliss', 'William Bliss farmstead', 'W. Bliss', 'Fought over 2-3 July; house and large stone barn burned by Hays\'s order 3 July; never rebuilt (NPS).',
  [B('house', 'farmhouse', 'Bliss house (burned 3 July 1863)', 'destroyed_1863', sym=('bliss', 0), pt=(-77.24163, 39.817, 20, 'OSM node 7254079760 "Bliss Farm House Marker" (NPS tablet)'), conf='Estimated',
     src=[R('NPS-CLI-PICKETT', 'Summary of the Pitzer-McMillan-Bliss area (CLR RoT 2018: 137)', 'The Bliss farmstead changed hands seven times on 2 July and three more on 3 July before Hays ordered the house and barn burned; by 11:30 a.m. the buildings were destroyed.'),
          R('NPS-GMP-1999', 'Archeological Resources', 'Bliss Farm burned on the third day and abandoned ever after as a home site; no above-ground resources.')],
     notes='Two Warren-plate symbols bracket the NPS marker point (46 m N and 32 m S of it); which symbol is the house and which the barn is not resolved, so both are drawn as the 2 Bliss buildings.', err=20),
   B('barn', 'barn', 'Bliss barn (large stone barn, burned 3 July 1863)', 'destroyed_1863', sym=('bliss', 1), conf='Estimated', built='pre-1863', material='stone (NPS)',
     src=[R('NPS-CLI-PICKETT', 'CLR RoT 2018: 137', 'The house, and especially the large stone barn, provided cover for skirmishers and sharpshooters; both were burned on 3 July.'),
          R('NPS-CLR-ROT1', 'Area 3 narrative, Bliss orchard', 'Barn basement and house described in regimental accounts.')],
     notes='The Warren plate marks both symbols W; NPS describes the barn as stone. Dimensions UNKNOWN.', err=20)])

F('mcmillan', 'David McMillan farmstead', 'D. McMillan', 'Occupied in turn by both armies 1 July; house shelled and gutted.',
  [B('house', 'farmhouse', 'McMillan house', 'survives', cty=12743, sym=('mcmillan', 0), built='pre-1863', conf='Documented',
     src=[R('NPS-CLI-PICKETT', 'David McMillan Farmstead [inholding] (NR 2004 Sec.7:85-86)', 'There were three buildings on the McMillan property in 1863: the house, the barn and a log building about 18 x 20 ft; the only extant building is the house; the house was damaged by shells and gutted by Confederates.')]),
   B('barn', 'barn', 'McMillan barn (lost)', 'lost_later', sym=('mcmillan', 1), conf='Estimated',
     src=[R('NPS-CLI-PICKETT', 'David McMillan Farmstead', 'Barn was one of three buildings; only the house is extant.'), R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')],
     notes='Which of the two non-house symbols is the barn and which the log building is not resolved.'),
   B('outbuilding', 'log_building', 'McMillan log building 18 x 20 ft (lost)', 'lost_later', sym=('mcmillan', 2), conf='Estimated', dims='about 18 x 20 ft',
     src=[R('NPS-CLI-PICKETT', 'David McMillan Farmstead', 'A log building about 18 by 20 feet stood on the property; only the house is extant.'), R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')],
     notes='See barn entry on the symbol ambiguity.')])

F('mclean', 'Moses McClean farmstead (tenant J. Martin)', 'M. McClean (owner); tenant J. Martin', 'Confederate (Early/Ewell) headquarters area; McClean barn survives.',
  [B('barn', 'barn', 'McClean barn', 'survives', cty=7678, sym=('mclean', 1), dims='about 40 x 55 ft (1968)', material='frame, red', built='before 1863', conf='Documented',
     src=[R('NPS-MCCLEAN-1968', 'Historic Data Section Part II', 'The red barn lies on a north-south axis about 200 ft south of the house and measures about 40 x 55 ft; Warren (1868-69) shows only two wooden structures at the McClean farm; claim #3248 mentions only house and barn.'),
          R('NPS-HSR-MCCLEAN-BARN', 'HSR McClean Barn', 'Historic structure report for the barn.')]),
   B('house', 'farmhouse', 'McClean house (original narrow house)', 'survives_altered', cty=5437, sym=('mclean', 0), dims='25 x 20 ft original house; later additions', material='white brick and frame', built='before 1863', conf='Estimated',
     src=[R('NPS-MCCLEAN-1968', 'Historic Data Section Part II', 'Two-story white brick-and-frame house facing south; the original house about 25 x 20 ft with 3 rooms on each floor; brick L added later.')],
     notes='The 2023 outline at the house site is assumed to include the original house plus later additions; status of the house today is not stated in the NPS documents read here.')])

F('hagy_beams', 'McClean tenant farms: David Hagy and John Beams', 'D. Hagy; J. Beams (tenants)', 'Houses, barns and orchard north of Mummasburg Road; removed after the battle (CLR).',
  [B('house', 'farmhouse', 'Hagy tenant house and barn (lost; 4 Warren-plate symbols for the Hagy and Beams tenant properties)', 'lost_later', sym=('hagy_beams', 0), conf='Estimated',
     src=[R('NPS-CLR-ROT1', 'Area 1, McClean Tenant Farm Fruit Garden Replanting', 'David Hagy, a tenant on the McClean farm, maintained a house, barn and small orchard north of Mummasburg Road, separate from John Beams\'s tenant property to the west; development after the battle removed the house, barn and orchard.'),
          R('NPS-GMP-1999', 'Archeological Resources', 'Heagy farm: no surface remains.')],
     notes='Four symbols are grouped; assignment to Hagy versus Beams is not resolved.'),
   B('outbuilding', 'building', 'Hagy/Beams symbol 2', 'lost_later', sym=('hagy_beams', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes=''),
   B('outbuilding', 'building', 'Hagy/Beams symbol 3', 'lost_later', sym=('hagy_beams', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes=''),
   B('outbuilding', 'building', 'Hagy/Beams symbol 4', 'lost_later', sym=('hagy_beams', 3), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='')])

F('mcpherson', 'Edward McPherson farmstead', 'E. McPherson', 'Opening of the battle 1 July; barn survives; house burned 1895.',
  [B('barn', 'bank_barn', 'McPherson barn', 'survives', cty=11495, sym=('mcpherson', 0), material='stone lower level, frame upper', built='before 1863', conf='Documented',
     src=[R('NPS-THEN-NOW', 'McPherson Farm', 'The stone barn is the only remnant of the farm; the house burned in 1895 and the central wagon shed is gone.'),
          R('NPS-CLI-1CORPS', 'McPherson Barn', 'Restored to its battle-era exterior; the only battle-era building on park property within the 1st Corps battlefield.'),
          R('HABS-PA', 'HABS McPherson Barn (https://www.loc.gov/item/pa0008/)', 'Measured drawings.')]),
   B('house', 'farmhouse', 'McPherson farm house (burned 1895)', 'lost_later', conf='Documented', built='pre-1790',
     src=[R('NPS-CLI-1CORPS', 'First Day Fields, McPherson Farm Field 4b', 'Field expanded with loss of the McPherson farmhouse (pre-1790 to 1896), wagon shed, orchard and barnyard.'),
          R('NPS-THEN-NOW', 'McPherson Farm', 'House burned in 1895.')],
     notes='Site not marked and not archaeologically tested (CLI); position UNKNOWN beyond "near the barn"; no geometry.'),
   B('outbuilding', 'wagon_shed', 'McPherson central wagon shed (lost)', 'lost_later', conf='Documented',
     src=[R('NPS-THEN-NOW', 'McPherson Farm', 'The central wagon shed no longer stands.')], notes='Position UNKNOWN.')])

F('forney', 'John Forney farmstead', 'J. Forney', 'Landmark of the first-day fighting; demolished 1937.',
  [B('house', 'farmstead', 'Forney farmstead (house and barn; demolished 1937)', 'lost_later', sym=('forney', 0), conf='Estimated',
     src=[R('NPS-CLI-1CORPS', 'Forney Fields #3; Forney Farmstead Site', 'The Forney farmstead was demolished in 1937; no visible trace remains; a capped well may be close to Mummasburg Road.'),
          R('NPS-GMP-1999', 'Archeological Resources', 'Forney farm: no surface remains.')],
     notes='Only the large symbol near the J. FORNEY label is used; the farmstead had more than one building (unplaced).', err=20)])

F('culp', 'William/Henry Culp farmstead (Rock Creek)', 'Wm. Culp', 'East of Rock Creek below Culp\'s Hill; HABS records house, barn, springhouse, woodshed and smokehouse.',
  [B('house', 'farmhouse', 'Culp farm house (brick)', 'survives', cty=8971, sym=('culp', 3), material='brick', built='after 1800, before 1866 (HABS)', conf='Documented',
     src=[R('HABS-PA', 'HABS PA-354 Culp House (https://www.loc.gov/item/pa0006/)', 'Date of erection before the Battle of Gettysburg; material brick; NPS ownership.')],
     notes='2023 outline (461 m2) includes later additions; HABS also records Culp barn, springhouse, woodshed and smokehouse (https://www.loc.gov/item/pa1817/ to pa1820), not separately located.'),
   B('outbuilding', 'building', 'Culp farmstead: other symbols (Warren plate)', 'unknown_fate', sym=('culp', 0), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbols marked W/S.')], notes='Barn/springhouse/woodshed roles unresolved.'),
   B('outbuilding', 'building', 'Culp farmstead: symbol 2', 'unknown_fate', sym=('culp', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol.')], notes=''),
   B('outbuilding', 'building', 'Culp farmstead: symbol 3', 'unknown_fate', sym=('culp', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked S.')], notes=''),
   B('outbuilding', 'building', 'Culp farmstead: symbol 5', 'unknown_fate', sym=('culp', 4), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol.')], notes='')])

F('fry', 'M. Fry (Frey) farmstead', 'M. Fry', 'Behind Cemetery Ridge; NPS CLR mentions a Frey house and barn (Frey Field/Orchard).',
  [B('outbuilding', 'building', 'Frey farmstead: building 1 (Warren plate)', 'unknown_fate', sym=('fry', 0), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet, M. FRY', 'Symbol marked W.'), R('NPS-CLR-ROT1', 'Area 4 figures', 'Frey House and Frey Barn are labelled in the CLR.')], notes='Roles unresolved.'),
   B('outbuilding', 'building', 'Frey farmstead: building 2 (Warren plate)', 'unknown_fate', sym=('fry', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes=''),
   B('outbuilding', 'building', 'Frey farmstead: building 3 (Warren plate)', 'unknown_fate', sym=('fry', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='')])

F('patterson', 'S. Patterson farmstead', 'S. Patterson', 'Taneytown Road; Patterson house used as Pleasonton headquarters (claim file).',
  [B('house', 'farmhouse', 'Patterson farmstead: building 1 (Warren plate)', 'unknown_fate', sym=('patterson', 0), conf='Estimated',
     src=[R('NPS-CLR-ROT1', 'Area 4 William Patterson Orchard', 'According to the battle claims file the Patterson house served as Pleasonton\'s headquarters; the orchard and farmstead lie east/rear of the field.'), R('WARREN-BACH', 'July-1 sheet, S. PATTERSON', 'Symbols marked W.'),
          R('HABS-PA', 'HABS William Patterson House, Taneytown Road (https://www.loc.gov/item/pa1639/)', 'HABS record.')], notes='Role unresolved; which symbol is the house is not established.'),
   B('outbuilding', 'building', 'Patterson farmstead: building 2 (Warren plate)', 'unknown_fate', sym=('patterson', 1), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes=''),
   B('outbuilding', 'building', 'Patterson farmstead: building 3 (Warren plate)', 'unknown_fate', sym=('patterson', 2), conf='Estimated', src=[R('WARREN-BACH', 'July-1 sheet', 'Symbol marked W.')], notes='')])
