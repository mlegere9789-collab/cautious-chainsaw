# Source registry for the 1863 structures catalogue.
# Types: A1 = primary map/record (made 1863-1869, or an 1863-era claim/record),
#        A2 = later first-hand account,
#        B  = secondary (later scholarship, NPS reports compiled long after, measured surveys of what survives today).
SRC = {}


def S(key, cite, url, typ, licence, note=''):
    SRC[key] = dict(key=key, cite=cite, url=url, type=typ, licence=licence, note=note)


S('WARREN-BACH',
  'Bachelder, J.B. (ed.), Map of the battle field of Gettysburg, July 1st, 2nd, 3rd 1863 (Boston, 1876), 3 sheets; '
  'topography from the G.K. Warren survey of 1868-69 (1 inch = 200 ft, reduced); LoC call no. G3824.G3S5 1863 .B33; '
  'sheets cw0325000a (July 1) and cw0325000c (July 3) were used',
  'https://www.loc.gov/item/99447491/', 'A1', 'Public domain (LoC: no known restrictions; 1876 US publication)',
  'Post-battle survey: every house and barn is drawn as a filled symbol with a letter W (wood), B (brick) or S (stone); '
  'the caption says every object is represented as near as possible as it was at the time of the battle. The survey was made '
  '5-6 years after the battle, so later changes are possible (the NPS Historical Base Map of 1958 corrects some).')
S('WARREN-PLATE',
  'U.S. Army Office of the Chief of Engineers, Battle field of Gettysburg (Warren survey 1868-69, reduced to 1 inch = 1000 ft, '
  'no troop positions), scan cw0353500',
  'https://www.loc.gov/item/99448794/', 'A1', 'Public domain (US Government publication)',
  'Cleaner reduction of the same Warren survey (no troop overlays); used for symbol detection and the borough building masses.')
S('NPS-CLI-EMM',
  'NPS, Cultural Landscapes Inventory: Emmitsburg Road Ridge Battlefield, Gettysburg National Military Park '
  '(Olmsted Center for Landscape Preservation), Buildings and Structures / Chronology; cites National Register documentation 2004 (NR 2004, Sec.7)',
  'https://npshistory.com/publications/gett/cli-emmitsburg-rd-ridge-battlefield.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLI-PICKETT',
  "NPS, Cultural Landscapes Inventory: Pickett's Charge Battlefield, Gettysburg National Military Park (OCLP, 2024), "
  'Buildings and Structures / Chronology; cites NR 2004 Sec.7 and the Historic Structure Inventory (HSI)',
  'https://npshistory.com/publications/gett/cli-picketts-charge-battlefield.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLI-1CORPS',
  'NPS, Cultural Landscapes Inventory: First Day, Union 1st Corps Battlefield, Gettysburg NMP (cites Cultural Landscape Report 2021)',
  'https://npshistory.com/publications/gett/cli-first-day-ufcb.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLI-LRT',
  'NPS, Cultural Landscapes Inventory: Little Round Top, Gettysburg NMP',
  'https://npshistory.com/publications/gett/cli-little-round-top.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLI-LAND',
  'NPS, Cultural Landscapes Inventory: Gettysburg Landscape, Gettysburg NMP, Buildings and Structures '
  '(agrarian period to 1863; the battle; later periods)',
  'https://npshistory.com/publications/gett/cli-gettsyburg-landscape.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLI-CEM',
  'NPS, Cultural Landscapes Inventory: Gettysburg National Cemetery, Gettysburg NMP',
  'https://npshistory.com/publications/gett/cli-cemetery.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLR-ROT1',
  'Layton, T.W. et al., Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment, Volume I '
  '(Olmsted Center for Landscape Preservation, NPS, 2018)',
  'https://npshistory.com/publications/gett/clr-v1.pdf', 'B', 'Public domain (US Government work)')
S('NPS-CLR-ROT2',
  'Layton, T.W. et al., Cultural Landscape Report for Gettysburg National Military Park, Record of Treatment, Volume II '
  '(OCLP, NPS, 2018)',
  'https://npshistory.com/publications/gett/clr-v2.pdf', 'B', 'Public domain (US Government work)')
S('NPS-TP-2004',
  'Campbell, E., Treatment Philosophy: The 1863 Landscape, Gettysburg National Military Park (NPS, March 2004), '
  'ch. 2 Cultural Features: Farm Building Complexes',
  'https://irma.nps.gov/DataStore/DownloadFile/472822', 'B', 'Public domain (US Government work)')
S('NPS-GMP-1999',
  'NPS, Final General Management Plan and Environmental Impact Statement, Gettysburg NMP, Vol. 1 (1999), '
  'Affected Environment: Historic Structures; Archeological Resources',
  'https://npshistory.com/publications/gett/fgmp-eis-v1-1999.pdf', 'B', 'Public domain (US Government work)')
S('NPS-HBM-1958',
  'Tilberg, F. and Pfanz, H.W., Historical Base Map, Gettysburg National Military Park (NPS, 23 June 1958): '
  'documentation of the Warren map grid by grid',
  'https://irma.nps.gov/DataStore/DownloadFile/472812', 'B', 'Public domain (US Government work)',
  'Scanned typescript; OCR is partly garbled and was used only to confirm that the Warren survey is the NPS base map, '
  'and for hospital and headquarters remarks.')
S('NPS-HS-MCPHERSON',
  'NPS, Edward McPherson Farm: Historical Study',
  'https://npshistory.com/publications/gett/hs-mcpherson-farm.pdf', 'B', 'Public domain (US Government work)')
S('NPS-HS-SPANGLER',
  'NPS, Historical Statement: Henry Spangler Farm Buildings',
  'https://npshistory.com/publications/gett/spangler-farm.pdf', 'B', 'Public domain (US Government work)')
S('NPS-HS-BRIEN',
  'NPS, The Brien Farm and Family',
  'https://npshistory.com/publications/gett/brien-farm.pdf', 'B', 'Public domain (US Government work)')
S('NPS-HSR-LEISTER-BARN',
  'NPS, Historic Structure Report: Physical Fabric Section, Leister Barn, Gettysburg NMP (HABS/HAER 1984 fieldwork)',
  'https://npshistory.com/publications/gett/hsr-leister-barn.pdf', 'B', 'Public domain (US Government work)')
S('NPS-HSR-MCCLEAN-BARN',
  'NPS, Historic Structure Report: The McClean Barn, Gettysburg NMP',
  'https://npshistory.com/publications/gett/hsr-mcclean-barn.pdf', 'B', 'Public domain (US Government work)')
S('NPS-MCCLEAN-1968',
  'Brown, L.E., McClean House and Barn, Gettysburg National Military Park, Pa. (NPS Division of History, 1 Oct 1968); '
  'cites Moses McClean damage claim #3248 (Adams County), RG 2, Pennsylvania State Archives, and the Warren map',
  'https://npshistory.com/publications/gett/mcclean-house-barn.pdf', 'B', 'Public domain (US Government work)',
  'The 1863 damage claim itself is an A1 record; this report transcribes and discusses it.')
S('NPS-THEN-NOW',
  'NPS, Buildings and Farms Then and Now (Gettysburg NMP web page)',
  'https://www.nps.gov/gett/learn/photosmultimedia/buildings-and-farms-then-and-now.htm', 'B', 'Public domain (US Government work)')
S('HABS-PA',
  'Library of Congress, Historic American Buildings Survey (HABS) records for Gettysburg NMP buildings, cited by HABS number; '
  'data pages typed in the 1950s',
  'https://www.loc.gov/collections/historic-american-buildings-landscapes-and-engineering-records/?q=gettysburg', 'B',
  'Public domain (LoC; made by the US Government)', 'Each entry gives its own LoC item URL in the quotation field.')
S('OSM',
  'OpenStreetMap contributors, building and historic tags in the Gettysburg battlefield bounding box '
  '(Overpass API extract, 19 Oct 2026); used for building names and as a cross-check of position',
  'https://www.openstreetmap.org/copyright', 'B', 'ODbL 1.0 - (c) OpenStreetMap contributors',
  'Attribution required. OSM outlines may have been traced from aerial imagery by contributors; this work used no imagery '
  'from Google, Bing, Maxar or Mapbox itself.')
S('ADAMS-BLDG',
  'Adams County (PA) GIS, Building_Outlines 2023 (mapping.adamscountypa.gov ArcGIS REST service, layer Building_Outlines)',
  'https://mapping.adamscountypa.gov/arcgis/rest/services/AGOL/Building_Outlines/MapServer/0', 'B',
  'Public-record data published by Adams County, PA (no licence file found; read-only use, attribution given)',
  'Gives the 2023 footprint of surviving buildings (including later additions) and the whole 2023 building stock used for the removal table.')
S('NEWS-COMPILER-1863',
  'Gettysburg Compiler, 20 July 1863, report on the burning of the Sherfy barn (as cited by Gettysburg Daily)',
  'https://www.gettysburgdaily.com/joseph-sherfy-barn-roof-replaced/', 'B',
  'Secondary web page quoting a public-domain 1863 newspaper; only the fact is used')
S('ASYLUM-ALMS',
  'Asylum Projects, Adams County Almshouse (Gettysburg, PA), incl. Pennsylvania Historical and Museum Commission marker text '
  '(complex closed 1964, barn burned 1967, last building demolished 1974)',
  'https://asylumprojects.org/index.php/Adams_County_Almshouse', 'B', 'Web page; only dates (facts) are used')
S('WIKI-STATION',
  'Gettysburg station (Wikipedia) and Abraham Lincoln Online, Gettysburg Railroad station (built 1858-59; hospital in July 1863)',
  'https://en.wikipedia.org/wiki/Gettysburg_station', 'B', 'CC BY-SA 4.0 (facts only)')
S('GETTYSDAILY-CHRIST',
  "Gettysburg Daily, Gettysburg's Christ Lutheran Church, Part 1 (church completed 1836; Union I Corps divisional hospital 1 July to 15 Aug 1863)",
  'https://www.gettysburgdaily.com/gettysburgs-christ-lutheran-church-part-1/', 'B', 'Web page; facts only')

S('NPS-ROSE',
  'NPS, Stay at the Historic Rose House (Gettysburg NMP web page): Rose farm structures',
  'https://www.nps.gov/gett/planyourvisit/historic-rose-house.htm', 'B', 'Public domain (US Government work)')


SEARCH_ONLY = {
    'NEWS-COMPILER-1863': 'seen as a web-search result summary only; page not opened',
    'ASYLUM-ALMS': 'seen as a web-search result summary only; page not opened',
    'WIKI-STATION': 'seen as a web-search result summary only (Wikipedia "Gettysburg, Pennsylvania" was opened but does not give the station facts)',
    'GETTYSDAILY-CHRIST': 'seen as a web-search result summary only; page not opened',
}
for _k, _n in SEARCH_ONLY.items():
    SRC[_k]['note'] = (SRC[_k].get('note') + ' ' if SRC[_k].get('note') else '') + 'READ STATUS: ' + _n
