# Additional sourced entries: named borough houses and churches, a covered bridge, a tavern and a mill complex.
from catalogue_town import T, TOWN, L, LOST  # noqa: F401
from catalogue import R

T('wade_house', 'McClellan house, 548 Baltimore Street (Jennie Wade killed here, 3 July 1863)', 1999, 'survives', '1842 (one web source)', 'Estimated',
  [R('NPS-CLI-LAND', 'Buildings and Structures: battle period (town)', 'Town buildings stood during the battle and were used as hospitals and sharpshooter posts.'),
   R('OSM', 'way 369365253 Jennie Wade House Museum', 'Named building on Baltimore Street; the museum describes it as restored to its 1863 appearance (battlefields.org museum page).')],
  subtype='house', notes='Date 1842 comes from a single secondary web page; address 548 vs 528 Baltimore Street differs between web sources, the OSM name and the nearest 2023 outline (0.6 m) are used for the position.', err=6)
T('garlach_house', 'Garlach house, Baltimore Street (Henry Garlach, cabinetmaker; General Schimmelfennig hid behind its woodpile)', 4321, 'survives', 'before 1863', 'Estimated',
  [R('OSM', 'way 795245500 Garlach House, description tag', 'Henry Garlach (1818-1887) was a cabinetmaker who left his home to his wife and children during the battle; his wife Catharine hid and fed Union General Alexander Schimmelfennig by a woodpile behind the house.')],
  subtype='house', notes='Construction date not stated; standing in July 1863 is stated by the OSM description of the 1863 events only (single secondary source).', err=6)
T('presbyterian_church', 'Presbyterian Church, Baltimore Street (hospital 1863; present building is later)', 12463, 'survives_altered', 'site since 1842; building rebuilt later', 'Contested',
  [R('GETTYSDAILY-CHRIST', 'Gettysburg Daily and church captions (search result)', 'One caption says the congregation moved to its present location in 1842 and the church served as a hospital in the battle, and that the present building was rebuilt in 1963; the two statements imply the 1863 building is not the present one.')],
  subtype='church', notes='Only the SITE is supported; the 1863 footprint is UNKNOWN and the 2023 outline (1,621 m2) is of the later building. Drawn as the site outline with a large error.', err=40)
T('black_horse_tavern', 'Black Horse Tavern, Fairfield Road (Confederate Heth division area, July 1)', 967, 'survives', '1812', 'Documented',
  [R('HABS-PA', 'HABS PA-361 Black Horse Tavern (https://www.loc.gov/item/pa0010/), data page', 'Date of erection 1812; fieldstone walls, brick chimney; condition good (1958).'),
   R('OSM', 'Francis Bream Blackhorse Tavern (historic)', 'Named building, outline 7 m from the 2023 county outline.')],
  subtype='tavern', notes='HABS gives the 4-mile SW position only; the position here is the OSM-named building. Footprint of 1863 building vs 2023 not compared.', err=8)

EXTRA_POINTS = []


def P(key, name, subtype, lon, lat, err, status, built, conf, src, notes, why):
    EXTRA_POINTS.append(dict(key=key, name=name, subtype=subtype, lon=lon, lat=lat, err=err, status=status, built=built, conf=conf, src=list(src), notes=notes, why=why))


P('sachs_bridge', "Sachs Covered Bridge over Marsh Creek (Sach's Mill road)", 'covered_bridge', -77.2762, 39.79742, 12, 'survives', '1854', 'Documented',
  [R('OSM', 'way 340633741 Sachs Covered Bridge (ref:nrhp 80003395, start_date 1854)', 'Historic covered bridge listed on the National Register (ref 80003395), dated 1854 in the tag.')],
  'The bridge was standing in 1863 (start_date 1854). Point is the OSM-mapped bridge centre; the associated Sachs mill is not located by any source read.',
  'OSM way centre')
P('mcallister_mill', "McAllister's Mill complex (grist and saw mills with two dams), Rock Creek", 'mill', -77.21508, 39.80948, 150, 'unknown_fate', 'pre-1863', 'Estimated',
  [R('NPS-TP-2004', 'ch.2 Ponds and Dams (Rock Creek)', 'Two known dams on the battlefield were on Rock Creek, about 650 yards north of the Baltimore Pike, part of the McAllister Mill complex, built for grist and saw mills; this was the closest grist mill for most farmers on the 1863 battlefield.'),
   R('OSM', "node 7334198716 McAllister's Mill", 'Named point at the mill site.')],
  'The mill buildings, dams and lanes existed in 1863; only a site point is placed. NPS puts the two dams about 650 yd north of the Baltimore Pike while this OSM point is about 280 m from the Pike, so the extent of the complex is UNKNOWN and the error is set to 150 m. Individual buildings UNKNOWN.',
  'OSM named point at the mill site; error covers the whole complex')
