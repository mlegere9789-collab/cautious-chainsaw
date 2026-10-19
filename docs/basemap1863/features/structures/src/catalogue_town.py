# Almshouse complex, borough/institutional landmarks (surviving outlines) and lost structures without coordinates.
from catalogue import F, B, R, FARMS

F('almshouse', 'Adams County Almshouse (Poor Farm) complex', 'Adams County',
  "Founded 1818-19 on the Harrisburg Road north-east of town; Barlow's Knoll (1 July) lies at the almshouse cemetery; barn burned 1967, last building demolished 1974.",
  [B('complex_building', 'institutional', 'Almshouse complex building %d (Warren plate)' % (k + 1), 'lost_later', sym=('almshouse', k), conf='Estimated',
     src=[R('WARREN-BACH', 'July-1 sheet, label COUNTY ALMSHOUSE', 'Group of filled building symbols beside the label.'),
          R('NPS-GMP-1999', 'Affected Environment, Archeological Resources',
            'The extensive complex of buildings (hospitals, asylums, workhouses, dwellings and barns) once associated with the Adams County Poor Farm leaves no surface remains.'),
          R('ASYLUM-ALMS', 'Adams County Almshouse page (PHMC marker text)',
            'Complex closed 1964, barn burned 1967, last building demolished 1974; the site is now the county agricultural center.')],
     notes='Roles of individual buildings (main house, asylum, workhouse, barns) are UNKNOWN; each Warren-plate symbol is drawn as a point.')
   for k in range(13)])

TOWN = []


def T(key, name, cty, status, built, conf, src, notes='', dims=None, subtype='building', err=4):
    TOWN.append(dict(key=key, name=name, cty=cty, status=status, built=built, conf=conf, src=list(src), notes=notes, dims=dims, subtype=subtype, err=err))


T('courthouse', 'Adams County Courthouse (Baltimore Street)', 4734, 'survives_altered', '1859 (secondary sources)', 'Estimated',
  [R('HABS-PA', 'HABS PA-265 Adams County Courthouse (https://www.loc.gov/item/pa0004/)',
     'HABS data form records the first courthouse (1804, brick) as demolished in 1859.'),
   R('GETTYSDAILY-CHRIST', 'Gettysburg Daily and HMDB hospital markers (1 July 1863)',
     'Union First Corps hospital in the courthouse on Baltimore Street on 1 July; it reopened as a courthouse in late August 1863.')],
  notes='Identity of the standing courthouse with the 2023 outline is by name and street position; footprint changes since 1863 are not documented.',
  subtype='courthouse', err=8)
T('depot', 'Gettysburg Railroad station (Carlisle Street; "Lincoln Railroad Station")', 4649, 'survives_altered', '1858-59', 'Documented',
  [R('WIKI-STATION', 'Gettysburg station; Abraham Lincoln Online',
     'Built 1858-59 by the Gettysburg (Hanover Junction) Railroad; make-shift hospital during the battle; Lincoln arrived there 18 Nov 1863.'),
   R('OSM', 'way 453171438 Lincoln Railroad Station', 'Named building (start_date 1858/May).')],
  subtype='railroad_station', notes='2023 outline includes additions made since 1863.', err=6)
T('christ_lutheran', 'Christ Lutheran Church (44 Chambersburg Street)', 13105, 'survives_altered', '1835-1836', 'Estimated',
  [R('GETTYSDAILY-CHRIST', 'Gettysburg Daily Part 1; HMDB',
     'Church completed 1836; I Corps divisional hospital 1 July to 15 Aug 1863 (about 140-150 patients at peak).')],
  subtype='church', notes='2023 outline (1,777 m2) includes later additions and the adjoining parish buildings; the 1863 church footprint is smaller.', err=18)
T('penn_hall', 'Pennsylvania Hall ("Old Dorm"), Pennsylvania College', 2781, 'survives_altered', '1837 (wings added 1889)', 'Documented',
  [R('HABS-PA', 'HABS PA-360 Old Dorm, Gettysburg College (https://www.loc.gov/item/pa0009/)',
     'Plans approved 1835, building completed 1837 (architect J.C. Trautwine, builder S. Hunter); wings added 1889; brick and wood.')],
  subtype='college_building', notes='1863 footprint = the 1837 central building without the 1889 wings; the 2023 outline includes the wings.')
T('schmucker_hall', 'Schmucker Hall, Lutheran Theological Seminary', 3275, 'survives_altered', '1832', 'Documented',
  [R('NPS-THEN-NOW', 'Lutheran Theological Seminary (Schmucker Hall)',
     'Built 1832; housed wounded soldiers from both armies during and after the battle; the grounds look much as in 1863.')],
  subtype='seminary_building', notes='2023 outline (1,300 m2) is the present extended building; the 1863 footprint is not separately documented.')
T('thompson_house', "Thompson House (Lee's headquarters), Chambersburg Pike", 2656, 'survives', 'before 1863', 'Estimated',
  [R('NPS-CLI-1CORPS', 'Chronology, 3-4 July 1863', 'Lee established his headquarters at the Thompson House on Seminary Ridge.'),
   R('OSM', "way 711547735 Thompson House - Lee's HQ", 'Named building.')],
  subtype='house', notes='Construction date not stated in the sources read.')
T('schultz_house', 'Schultz House (Oak Ridge Academy building)', 3539, 'survives_altered', '1837 (raised 1890s)', 'Documented',
  [R('NPS-CLI-PICKETT', 'Shultz House [inholding] (NR 2004 Sec.7:21)',
     '2.5-story brick house, originally a Greek Revival academy house of 1837; in the late 1890s the roof was raised and the style changed; Confederate batteries stood about it 2-3 July; used for emergency aid.')],
  subtype='house', notes='1863 form was lower than the present building; plan outline assumed unchanged.')
T('gatehouse', 'Evergreen Cemetery gatehouse (Cemetery Hill)', 16124, 'survives_altered', '1855', 'Documented',
  [R('NPS-THEN-NOW', 'Evergreen Cemetery Gatehouse',
     'Built 1855; caretaker Peter Thorn absent, his wife fed Generals Sickles, Slocum and Howard on the night of 1 July; largely unchanged apart from an addition on the right side; moderate damage on 2 July; photographed by Brady.')],
  subtype='gatehouse', notes='2023 outline includes the right-hand addition.')

LOST = []


def L(key, name, subtype, status, built, conf, src, notes=''):
    LOST.append(dict(key=key, name=name, subtype=subtype, status=status, built=built, conf=conf, src=list(src), notes=notes))


L('biggs_house', 'Basil Biggs house (former Fisher farm), Taneytown Road', 'farmhouse', 'survives', 'before 1863', 'Documented',
  [R('NPS-THEN-NOW', 'Home of Basil Biggs',
     'The original house still stands on Taneytown Road; the original barn is lost and the present barn is not original.'),
   R('HABS-PA', 'HABS Biggs Farm House (https://www.loc.gov/item/pa2627/)', 'HABS record.')],
  notes='No outline could be tied to this house with the sources at hand; UNKNOWN geometry.')
L('fisher_log_house', 'Fisher farm log house and stable (Taneytown Road)', 'farmhouse', 'lost_later', 'pre-1863', 'Documented',
  [R('NPS-CLR-ROT1', 'Area 4, Fisher Orchard Replanting',
     'At the time of the battle a log house and stable stood south of the Fisher Orchard; the house burned in the early twentieth century; no buildings are presently extant.'),
   R('NPS-GMP-1999', 'Archeological Resources', 'Fisher farm: no surface remains.')],
  notes='Location only described as south of the Fisher Orchard; no coordinates in the sources read (UNKNOWN).')
L('granite_schoolhouse', "Granite Schoolhouse (Culp's Hill / Baltimore Pike area)", 'school', 'lost_later', 'pre-1863', 'Documented',
  [R('NPS-CLI-LAND', 'Buildings and Structures: agrarian period',
     "The granite schoolhouse in the Culp's Hill management zone was the only schoolhouse in use within the study area; only the foundation stones exist today."),
   R('NPS-GMP-1999', 'Archeological Resources', 'Granite Schoolhouse: no surface remains.')],
  notes='No coordinates in the sources read (UNKNOWN).')
L('guinn_farm', 'Guinn farm (Baltimore Pike)', 'farmstead', 'lost_later', 'pre-1863', 'Documented',
  [R('NPS-GMP-1999', 'Archeological Resources', 'Guinn farm: no surface remains.'),
   R('NPS-TP-2004', 'Hospital note', 'Catherine Guinn, Lydia Leister and Nathaniel Lightner farmsteads were Union hospitals.')],
  notes='Warren-plate symbols exist near the label but were not read in this pass; UNKNOWN geometry in the curated layer.')
L('staub_farm', 'Staub farm (Emmitsburg Road)', 'farmstead', 'lost_later', 'pre-1863', 'Documented',
  [R('NPS-GMP-1999', 'Archeological Resources', 'Staub farm: no surface remains.'),
   R('NPS-CLR-ROT1', 'Area 9', 'The Staub farm complex provided cover for Union forces on 3 July; worm fencing improved the cover.')],
  notes='UNKNOWN geometry in the curated layer.')
