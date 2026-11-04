"""Builds docs/battle-theatre/terrain/terrain_sources.json: the 45 catalog rows of PDF B.9.1, Tables 1-5 (pages 103-110 of
the owner's plan, text in docs/battle-theatre/BIBLE/plan-clean.txt), transcribed as printed.

Rules followed (CLAUDE.md, the Law): nothing here is invented. Cell text is the PDF's, with straight quotes and joined line
breaks. A column that a table does not print is null (listed in `columns_not_printed`). URLs are exactly as printed, including
the ones the PDF itself shows truncated. Where the printed table has fewer cells than header columns, the cells are assigned
in header order and the row says so in `column_assignment_note`.  Fields starting with `check_` are this task's own
observations about the PDF and are marked as such.

Run:  python tools/bt/terrain_sources_build.py      (writes terrain_sources.json; the probe step patches access fields afterwards:
      python tools/bt/terrain_probe.py)
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'terrain_sources.json')

TABLE_COLUMNS = {
    1: ['number', 'source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence', 'limits', 'tier'],
    2: ['number', 'source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence', 'limits'],
    3: ['number', 'source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence'],
    4: ['number', 'source', 'type', 'what_it_gives', 'access_url'],
    5: ['number', 'source', 'what_it_gives', 'access_url', 'limits', 'tier'],
}
TABLE_TITLES = {
    1: 'Table 1. 1850s to 1890s maps and drawings',
    2: 'Table 2. Park GIS, reconstructions and restoration studies',
    3: 'Table 3. Modern geodata',
    4: 'Table 4. Photographs, paintings and documents',
    5: 'Table 5. Ecology and orchard sources',
}
ALL_FIELDS = ['source', 'type', 'what_it_gives', 'access_url', 'format', 'scale_resolution', 'licence', 'limits', 'tier']

ROWS = []


def row(n, table, page, source, type_, gives, access, urls, fmt, scale, lic, limits, tier, tier_codes,
        flags, access_kind, note=None, check=None, assign_note=None):
    """urls: list of (url, column) tuples, url exactly as printed."""
    printed = TABLE_COLUMNS[table]
    r = {
        'number': n,
        'table': table,
        'table_title': TABLE_TITLES[table],
        'pdf_page': page,
        'name': source,
        'type': type_,
        'what_it_gives': gives,
        'access_url_text': access,
        'urls': [{'url': u, 'printed_in_column': c} for (u, c) in urls],
        'format': fmt,
        'scale_resolution': scale,
        'licence': lic,
        'limits': limits,
        'tier_printed': tier,
        'tier_codes': list(tier_codes or []),
        'tier_status': ('printed' if tier_codes else ('not_used' if tier else 'not_printed_in_table')),
        'pdf_unverified_flags': flags,
        'access_kind_from_pdf': access_kind,
        'columns_not_printed': [c for c in ALL_FIELDS if c not in printed],
        'column_assignment_note': assign_note,
        'check_notes': check or [],
        'access_status': 'not_probed',
        'probe_summary': None,
    }
    if note:
        r['transcription_note'] = note
    ROWS.append(r)


# ---------------------------------------------------------------------------------------------------- Table 1
row(1, 1, 104,
    'Warren, "Battle Field of Gettysburg", LOC 1886 Corps of Engineers tracing-linen extract (call no. G3822.G4S5 1886 .U5)',
    'Manuscript map, colored',
    'Roads, buildings, resident names, fences, vegetation, fortifications, contours at 4-ft intervals',
    'Digitized with a IIIF manifest. https://www.loc.gov/item/99446453/',
    [('https://www.loc.gov/item/99446453/', 'access_url')],
    'IIIF / JPEG', '1:2400; sheet 121 x 72 cm',
    'Free to use; credit "Library of Congress, Geography and Map Division"',
    'Covers only portions of sheets 2 and 3 (south and southwest of town), not the whole field. It is an 1886 copy of a survey done 1868-69, so it post-dates the battle by about five years.',
    'R1 for geometry (error model not published), R2 for land cover', ['R1', 'R2'],
    ['PDF: item numbers for the full 1868-69 Warren sheets, the 1873 revision, Bachelder LOC editions and the Cope map are in the unverified list (LOC search and NARA catalog were blocked to the research tools).'],
    'digital-download (IIIF)',
    check=['check_1: the project already georeferenced a different LOC Warren item, 99448794 (call G3824.G3 187- W3, 1:12,000 reduction, full-field coverage, 23 control points, leave-one-out 16.5 m): docs/basemap1863/maps/sources.json. The PDF row names item 99446453 (a partial 1886 tracing). Both should be kept as separate catalog entries; the probe records what 99446453 answers.'])

row(2, 1, 104,
    'Warren, "Battle Field of Gettysburg", National Archives original, RG 77 Civil Works Map File, Entry 81, NAID 102279222',
    'Full large-scale survey sheets, made 1868-69, revised 1873',
    'Full coverage at 200 ft to 1 inch (about 1:2,400), printed in multiple sheets; reduced copies exist (for example E 105-4 "Final Proof")',
    'NARA blog https://unwritten-record.blogs.archives.gov/?p=20249 ; catalog https://catalog.archives.gov/id/102279222 (the catalog page itself was blocked to the research tools; the ID comes from the blog)',
    [('https://unwritten-record.blogs.archives.gov/?p=20249', 'access_url'), ('https://catalog.archives.gov/id/102279222', 'access_url')],
    'Scans (resolution not confirmed)', '200 ft/in', 'Public (inferred, US government work)',
    'NPS found a 72 dpi NARA copy too blurry and used the LOC tracing instead. The NARA page itself does not state the contour interval or survey method; those details come from the xyHt article about Knowles.',
    'R1', ['R1'],
    ['PDF: the NARA catalog page was blocked to the research tools; the ID comes from the blog.', 'PDF: scan resolution not confirmed.', 'PDF: licence is inferred, not stated.'],
    'digital-download (scans, via NARA catalog)',
    check=['check_2: the project works from LOC 99448794 (a 1:12,000 reduction of this 1:2,400 original, per docs/basemap1863/SOURCES-landcover.md); the NARA full-size sheets were never obtained.'])

row(3, 1, 104,
    'Warren / War Department "Map of the battle-field of Gettysburg" 1895 (Julius Bien), David Rumsey (List No. 1780.095)',
    'Printed atlas plate',
    'Contours and spot heights',
    'Zoomable viewer, no direct download. https://davidrumsey.com/maps1100223-26914.html',
    [('https://davidrumsey.com/maps1100223-26914.html', 'access_url')],
    'Viewer', '1:23,000; 43 x 70 cm',
    'Noncommercial reuse only; commercial use needs permission from Cartography Associates',
    'This is the 1895 Atlas-era product, not the 1868 survey sheet. Small scale.',
    'R3', ['R3'], [], 'viewer-only',
    check=['check_3: licence is noncommercial only; any use in the shipped product needs owner decision (owner-only legal act: permission request).'])

row(4, 1, 104,
    'Bachelder, "Map of the battle field of Gettysburg, July 1st, 2nd, 3rd 1863" (1876, Office of the Chief of Engineers), University of Minnesota (UMedia item p16022coll230:1208)',
    'Printed map',
    'Troop positions by day; a bounding box is in the record',
    'BTAA/MIT record https://geodata.libraries.mit.edu/record/gisogm:edu.umn:3cfe346bdd99',
    [('https://geodata.libraries.mit.edu/record/gisogm:edu.umn:3cfe346bdd99', 'access_url')],
    'JPEG', 'Scale unstated; 72 x 68 cm', 'Contact the provider',
    'Not confirmed georeferenced. Warren himself criticized Bachelder\'s maps for poor depiction of topography. Positions, not terrain.',
    'R2 for positions, weak for terrain', ['R2'],
    ['PDF: georeferencing not confirmed.'], 'digital-download (JPEG via provider)',
    check=['check_4: the project already georeferenced the three LOC Bachelder sheets (item 99447491) to Warren, relative error 2.2-2.4 m (docs/basemap1863/maps/README.md). Licence of this UMN copy is "contact the provider"; the LOC copy is free to use.'])

row(5, 1, 104,
    'Bachelder day-by-day 1876 sheets, W&M special collections',
    'Finding-aid entries', 'July 2 and July 3 sheets listed',
    'July 2 https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212965 ; July 3 https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212966',
    [('https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212965', 'access_url'),
     ('https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212966', 'access_url')],
    'Listing only', 'n/a', 'n/a', 'Whether images are online was not confirmed.',
    'R2', ['R2'], ['PDF: whether images are online was not confirmed.'], 'print-only (finding-aid listing)')

row(6, 1, 104,
    'Bachelder Papers 1863-1894 (10 boxes, 7 volumes; microfilm 102264), New Hampshire Historical Society',
    'Archive: letters, copybooks, album',
    'Correspondence with veterans; maps are not the main content',
    'Finding aid https://www.nhhistory.org/NHHS/media/NHHS-Media-Library/PDFs/Finding-Aids/Bachelder_John_B-_Papers_1921-001.pdf',
    [('https://www.nhhistory.org/NHHS/media/NHHS-Media-Library/PDFs/Finding-Aids/Bachelder_John_B-_Papers_1921-001.pdf', 'access_url')],
    'Paper and microfilm', 'n/a', '"Available for research"; reproduction needs permission',
    'Not digitized. The commercial Ladd edition (3 volumes, about 2,128 pages) is copyrighted and must not be ingested or reproduced; cite only. Letters were collected 10 to 30 years after the battle.',
    'R3', ['R3'], [], 'print-only (paper and microfilm; finding aid online)',
    note='The PDF breaks the URL after "NHHS-Media-"; joined here without a space (a space cannot occur in this URL path as printed).')

row(7, 1, 104,
    'Cope map, NARA E 105a-1 (survey made August to October 1863 by Emmor B. Cope on horseback)',
    'Manuscript map',
    "Topography, lines and defenses; Warren's own annotation says it was mostly from horseback sketches based on the map of Adams County",
    'Via the NARA blog above; no direct catalog URL verified',
    [],
    'Scan', 'Not stated', 'n/a',
    'The only survey that dates from weeks after the battle, but a rapid sketch survey. The brief said "1862-63"; the sources say Aug-Oct 1863, which is carried here.',
    'R2', ['R2'],
    ['PDF: no direct catalog URL verified; the Cope map item number is in the unverified list.'],
    'no direct URL (reachable only through the NARA blog of row 2/10)',
    note='"the NARA blog above" is https://unwritten-record.blogs.archives.gov/?p=20249 (row 2); it is probed under rows 2 and 10.')

row(8, 1, 104,
    'Hopkins, "Map of Adams Co., Pennsylvania" 1858 (Converse, Philadelphia), LOC call no. G3823.A3 1858 .H6, LOC 2004629149',
    'Hand-colored county map, hachured relief, Gettysburg inset',
    'Landowner names, roads, farm locations five years before the battle',
    'IIIF. https://www.loc.gov/item/2004629149/ ; name index at ACHS https://gettysburghistory.org/our-holdings/',
    [('https://www.loc.gov/item/2004629149/', 'access_url'), ('https://gettysburghistory.org/our-holdings/', 'access_url')],
    'IIIF', 'Scale not listed; 92 x 129 cm', 'Free',
    "Small scale; hachures, not measured contours. Warren's Cope annotation says Cope's sketches were based on it.",
    'R2', ['R2'], [], 'digital-download (IIIF)',
    check=['check_8: already used: docs/basemap1863 georeferenced the borough inset (8 control points, fit 1.9 m, leave-one-out 2.85 m); county sheet 376 m leave-one-out.'])

row(9, 1, 105,
    'Michler item at LOC (g3880.cw0508800)',
    'Reduced map from the 1869 Military Maps atlas',
    'Gettysburg-to-Appomattox route map',
    'https://www.loc.gov/resource/g3880.cw0508800/',
    [('https://www.loc.gov/resource/g3880.cw0508800/', 'access_url')],
    'Image', 'Reduced', 'Free',
    'Not a Gettysburg battlefield sketch. Do not use as terrain. Listed so no one confuses it with a battlefield source.',
    'Not used', [], [], 'digital-download (image); NOT USED as terrain',
    note='tier cell prints "Not used" (no R-tier).')

row(10, 1, 105,
    'Other RG 77 items described by NARA: Elliot\'s annotated map (graves, dead horses, defenses, field hospitals, Camp Letterman) and a large oval "Battlefield of Gettysburg, Pa" (roads and farms, oriented west at top)',
    'Manuscript maps',
    'Post-battle features: burial and hospital positions, defenses',
    'NARA blog https://unwritten-record.blogs.archives.gov/?p=20249',
    [('https://unwritten-record.blogs.archives.gov/?p=20249', 'access_url')],
    'Scans', 'Not stated', 'n/a',
    'Catalog IDs not retrieved. Valuable for B.7 and B.8 hospital and defense placement.',
    'R2', ['R2'], ['PDF: catalog IDs not retrieved.'], 'scans via NARA (IDs unknown)',
    check=['check_10: the project holds the LOC copy of Elliott 1864 (item 99447501, cw0333000) downloaded as thumbnail only, not georeferenced (docs/basemap1863/maps/sources.json). The PDF spells "Elliot", LOC spells "Elliott".'])

row(11, 1, 105,
    'LOC Civil War Maps collection',
    'Collection (about 2,240 maps and charts, 76 atlases and sketchbooks, plus Hotchkiss 341 manuscript maps and sketchbooks, and Sherman)',
    '130 hits for "gettysburg"; Bachelder, John B. is a contributor on 10 of them',
    'https://www.loc.gov/collections/civil-war-maps/about-this-collection/ ; JSON search https://www.loc.gov/collections/civil-war-maps/?q=gettysburg&fo=json&c=5',
    [('https://www.loc.gov/collections/civil-war-maps/about-this-collection/', 'access_url'),
     ('https://www.loc.gov/collections/civil-war-maps/?q=gettysburg&fo=json&c=5', 'access_url')],
    'IIIF image URLs, GIF', 'Varies',
    'Free to use unless an item carries a rights advisory (none on sampled items)',
    'Hotchkiss Gettysburg-specific maps, Sickles/Meade headquarters sketches and a map attributed to a "Lt. Edwin Whitney" were not found or verified. Treat the Whitney name as unverified.',
    'R2', ['R2'],
    ['PDF: Hotchkiss Gettysburg-specific maps, Sickles/Meade HQ sketches and "Lt. Edwin Whitney" map not found or verified (also in the unverified list).'],
    'digital-download (IIIF); JSON search endpoint was blocked to the PDF research tools',
    note='The PDF breaks the second URL after "?"; joined without a space.',
    check=['check_11: the project fetched LOC item pages and ?fo=json with an identifying User-Agent and 5 s spacing (LOC robots.txt Crawl-Delay: 5) successfully (docs/basemap1863/maps/README.md section 3); /search paths are robots-disallowed and were not used.'])

row(12, 1, 105,
    'OR Atlas (175 plates) on eHistory',
    'Plates', 'Official atlas plates',
    'https://ehistory.osu.edu/books/official-records/atlas (listed in the notes under the OR landing page https://ehistory.osu.edu/books/official-records/)',
    [('https://ehistory.osu.edu/books/official-records/atlas', 'access_url'), ('https://ehistory.osu.edu/books/official-records/', 'access_url')],
    'Images', 'Varies', 'Public domain (pre-1929)', 'Which plates cover Gettysburg was not looked up.',
    'R3', ['R3'], ['PDF: Gettysburg plate numbers not looked up (unverified list).'], 'digital-download (images)',
    note='The PDF breaks the second URL after "official-"; joined without a space.')

row(13, 1, 105,
    'NPS-cited War Department and Gettysburg Battlefield Memorial Association maps of 1863, 1868 and 1872',
    'Maps cited as key sources by NPS',
    "The cartographic base of the park's own rehabilitation",
    'https://www.nps.gov/gett/learn/news/gett-battlefield-rehab.htm',
    [('https://www.nps.gov/gett/learn/news/gett-battlefield-rehab.htm', 'access_url')],
    'n/a', 'n/a', 'n/a',
    'The page does not give item identifiers. The 1868 item is presumably the Warren survey. Not confirmed.',
    'R2', ['R2'], ['PDF: item identifiers not given; 1868 item "presumably" the Warren survey, not confirmed.'], 'web page citing maps (no item access)',
    )

# ---------------------------------------------------------------------------------------------------- Table 2
row(14, 2, 105,
    'NPS park GIS 1863 layers (Curtis Musselman, park GIS)',
    'Vector GIS of historic roads, lanes, fence lines, property boundaries and buildings "as they stood in 1863", with 1895, 1927 and 1993 periods',
    'Georeferencing method: the LOC 1886 tracing scanned at 300 dpi (a 72 dpi NARA copy was too blurry); affine registration on nine control points (building corners, fence intersections), then rubbersheeting; large-scale features (woods, fields, orchards, roads) and small-scale features (fences, lanes, trees) digitized',
    'Method: https://www.nps.gov/gis/gisday/gallery2001/GWS/musselman.htm ; layers supplied to Knowles per https://xyht.com/?p=2387',
    [('https://www.nps.gov/gis/gisday/gallery2001/GWS/musselman.htm', 'access_url'), ('https://xyht.com/?p=2387', 'access_url')],
    'Not stated', 'Not stated', 'Unknown',
    'No public download of the 1863 layers was found; they appear to be request-only. Claude Code therefore re-creates the same layers itself from the Warren IIIF (B.9.2) and uses a request to the NPS GIS office as a parallel route, recorded in the register as "request not answered" if no reply comes.',
    None, [], ['PDF: no public download found; layers appear request-only; licence unknown.'], 'request-only (method pages online)',
    check=['check_14: a request to the NPS GIS office is a message sent on the owner\'s behalf; per CLAUDE.md it is an owner-only act (sending permission requests).'])

row(15, 2, 105,
    'Knowles et al. 2013 reconstruction (Anne Kelly Knowles lead; Dan Miller, Alex Tait for 1863 terrain; Allen Carroll; Tim Montenyohl; Judith Nielsen)',
    'GIS reconstruction, story map',
    'Digitization precedent and the only published error statement. Knowles hand-traced 4-ft contours from a 1:12,000 engraved Warren-derived map (about 1874; survey by Lt. William H. Chase under Warren), built a TIN and georectified on buildings unchanged since 1863. Hilltops and ridgelines differ from the 1996 DEM by under 50 ft; creek beds and rolling ground by much more (hundreds of feet in places per the second note). The notes phrase the 50 ft figure both as elevation difference and as displacement; the pipeline treats both as unresolved and measures its own.',
    'https://xyht.com/?p=2387 ; https://www.smithsonianmag.com/history-archaeology/A-Cutting-Edge-Second-Look-at-the-Battle-of-Gettysburg.html ; story map https://storymaps.esri.com/stories/2013/gettysburg ; viewshed coverage https://www.spokesman.com/stories/2013/jun/28/new-map-may-explain-lees-decisions-gettysburg/',
    [('https://xyht.com/?p=2387', 'access_url'),
     ('https://www.smithsonianmag.com/history-archaeology/A-Cutting-Edge-Second-Look-at-the-Battle-of-Gettysburg.html', 'access_url'),
     ('https://storymaps.esri.com/stories/2013/gettysburg', 'access_url'),
     ('https://www.spokesman.com/stories/2013/jun/28/new-map-may-explain-lees-decisions-gettysburg/', 'access_url')],
    'Web', 'n/a', 'n/a',
    "The data are not stated as downloadable. Knowles' team did not build a vegetation dataset. Author most confident about areas Lee could not see. Tested the Codori-Trostle thicket height in viewsheds.",
    None, [],
    ['PDF: the 50 ft figure is stated both as elevation difference and as displacement; unresolved (pipeline measures its own).', 'PDF: data not stated as downloadable.'],
    'web only (articles / story map)',
    note='The PDF breaks several URLs at hyphens; joined without spaces. The row text continues onto page 106.',
    check=['check_15: the PDF dates the Knowles base map "about 1874, survey by Lt. William H. Chase under Warren" while the project\'s LOC read says the Warren sheet was surveyed 1868-69 and revised on the ground 1873 by P. M. Blake (docs/basemap1863/SOURCES-landcover.md). Row 2 of the PDF also says "1868-69, revised 1873". The two attributions are not reconciled in the PDF; verify before citing either name.'])

row(16, 2, 106,
    'NPS rehabilitation program',
    'Restoration program (since 2000)',
    'Policy and quantities: 9 miles of fence rebuilt; Pickett\'s Charge area restored to 12 small fields; non-historic trees grown over about 65-70 years removed',
    'https://www.nps.gov/gett/learn/news/gett-battlefield-rehab.htm',
    [('https://www.nps.gov/gett/learn/news/gett-battlefield-rehab.htm', 'access_url')],
    'HTML', 'n/a', 'Public',
    "The page gives inconsistent 140 versus 147 year spans. Today's park is an interpretive proxy, not 1863.",
    None, [], ['PDF: page gives inconsistent 140 versus 147 year spans.'], 'web page')

row(17, 2, 106,
    'NPS Cultural Landscape Reports and Historic Structure Reports, farm histories, Seminar Papers',
    'Documents',
    'First Day CLR 2021, Pickett\'s Charge CLR 2024, farm histories (Brien Farm and Family 1972, McPherson Farm 1977, Slyder Farm), Administrative History (Unrau 1991); 16 seminars with volumes 4 to 13, 15, 16',
    'https://www.npshistory.com/publications/gett/index.htm ; https://www.npshistory.com/series/symposia/gettysburg_seminars/index.htm',
    [('https://www.npshistory.com/publications/gett/index.htm', 'access_url'),
     ('https://www.npshistory.com/series/symposia/gettysburg_seminars/index.htm', 'access_url'),
     ('https://irma.nps.gov/DataStore/Reference/Profile/2257218', 'limits'),
     ('https://www.nps.gov/gett/getinvolved/planning.htm', 'limits')],
    'PDF / HTML', 'n/a', 'US government works, generally public domain (verify per document)',
    'Per-paper URLs not listed. The CLR "Record of Treatment" Vol. I-II is cited at https://irma.nps.gov/DataStore/Reference/Profile/2257218 but that page returned no content. The NPS Little Round Top CLR and Fire Management Plan sit on https://www.nps.gov/gett/getinvolved/planning.htm ; the CLR PDF failed to fetch.',
    None, [],
    ['PDF: irma 2257218 page returned no content.', 'PDF: Little Round Top CLR PDF failed to fetch.', 'PDF: per-paper URLs not listed.'],
    'digital-download (PDF/HTML)',
    check=['check_17: contradicts B.9.3 retry list in part. The project already read the Little Round Top CLR PDF (https://www.nps.gov/gett/getinvolved/upload/FinalCLR_LittleRoundTop_AllSections-508.pdf, pages 19, 43, 90, 121) and the CLR Record of Treatment (2018) vol. I pages 176-235 and 271-302: docs/basemap1863/SOURCES-landcover.md, SOURCES-roads.md. The NPS Historic Vegetation Study stays unfound.',
           'check_17b: the PDF says "First Day CLR 2021" while the project lists "Cultural Landscape Reports (1st Corps 2021; Record of Treatment 2018; Little Round Top 2012)" (SOURCES-roads.md); dates agree for 2021 only if "First Day" = "1st Corps". Not verified here.'])

row(18, 2, 106,
    'Stone Sentinels, Farms and Buildings',
    'Aggregator, about two dozen farm and building pages (Bliss, Codori, Klingel, Rose, Trostle, Thompson House and others)',
    'Building notes (for example Sherfy farm about 50 acres, house built 1840s, original barn burned in the battle)',
    'https://gettysburg.stonesentinels.com/?p=203',
    [('https://gettysburg.stonesentinels.com/?p=203', 'access_url')],
    'HTML', 'n/a', 'Check terms', 'Secondary aggregator; details of most pages not captured.',
    None, [], ['PDF: details of most pages not captured.'], 'web pages',
    check=['check_18: the farm-page base printed on page 103 is gettysburg.stonesentinels.com/battlefield-farms/, not ?p=203.'])

row(19, 2, 106,
    'NPS drone photogrammetry, Little Round Top west face (52 acres; senseFly eBee RTK, DJI Inspire 2)',
    'Orthomosaic, RGB point cloud, TIN, 2017',
    'Revealed earthworks, stone walls, railroad beds and previously undocumented linear features',
    'https://support.geocue.com/wp-content/uploads/2017/07/MappingGettysburg-LittleRoundTopRevealed.pdf',
    [('https://support.geocue.com/wp-content/uploads/2017/07/MappingGettysburg-LittleRoundTopRevealed.pdf', 'access_url')],
    'PDF report', 'Point density not reported', 'n/a', 'Not LiDAR. Dataset availability not confirmed.',
    None, [], ['PDF: dataset availability not confirmed.'], 'PDF report only (dataset not confirmed)',
    note='The PDF breaks the URL after "wp-"; joined without a space.')

row(20, 2, 106,
    'Existing game and model maps (Ultimate General discussion)',
    'Forum',
    'Landmark accuracy disputes only (Round Tops, Stevens Run, missing landmarks)',
    'https://forum.game-labs.net/topic/19003-accuracy-of-gettysburg-map/',
    [('https://forum.game-labs.net/topic/19003-accuracy-of-gettysburg-map/', 'access_url')],
    'Forum', 'n/a', 'n/a',
    'Forum claims. Stevens Run may have been wider in 1863 per a poster. Used only as a checklist of things to verify. No open 3D tileset of 1863 Gettysburg was found.',
    None, [], ['PDF: forum claims only.'], 'web forum (checklist only)')

# ---------------------------------------------------------------------------------------------------- Table 3
row(21, 3, 106,
    'USGS South Central Pennsylvania 2017 QL2 LiDAR (13 counties including Adams; collected 2017-11-21 to 2017-12-21; published 2018-10-26)',
    'Airborne lidar',
    'Bare-earth terrain, canopy, breaklines, intensity',
    'AmeriGEO record https://data.amerigeoss.org/dataset/south-central-pennsylvania-2017-ql2-lidar ; distributed via PASDA http://www.pasda.psu.edu/ ; Adams County 2-ft contours service https://mapping.adamscountypa.gov/arcgis/rest/services/AGOL/Two_Foot_Contours/MapServer',
    [('https://data.amerigeoss.org/dataset/south-central-pennsylvania-2017-ql2-lidar', 'access_url'),
     ('http://www.pasda.psu.edu/', 'access_url'),
     ('https://mapping.adamscountypa.gov/arcgis/rest/services/AGOL/Two_Foot_Contours/MapServer', 'access_url'),
     ('https://www.usgs.gov/index.php/3d-elevation-program/topographic-data-quality-levels-qls', 'scale_resolution'),
     ('https://www.usgs.gov/3d-elevation-program/about-3dep-products-services', 'licence')],
    'LAS 1.4 (7,975 tiles of 1,500 m), 1-m DEM, 2-ft contours',
    'Nominal pulse spacing 0.7 m; QL2 = 10 cm RMSEz, at most 0.71 m spacing, at least 2 pts/m2 (USGS QL page https://www.usgs.gov/index.php/3d-elevation-program/topographic-data-quality-levels-qls)',
    'Free; 3DEP has no use restrictions (https://www.usgs.gov/3d-elevation-program/about-3dep-products-services)',
    None, None, [], [], 'digital-download (LAS/DEM) and REST service',
    note='The PDF breaks the QL and licence URLs across lines; joined without spaces. Tier and limits columns are not printed in Table 3.',
    check=['check_21: the project already ingested this dataset: USGS 3DEP project PA_South_Central_B1_2017 (lidar tiles on AWS usgs-lidar-public, EPT: https://s3-us-west-2.amazonaws.com/usgs-lidar-public/USGS_LPC_PA_South_Central_B1_2017_LAS_2019/ept.json) and the 3DEP 1 m DEM via the National Map ImageServer (docs/basemap1863/BUILD.md section 2, SOURCES-landcover.md S-3DEP-LIDAR). This settles the PDF B.9.3 gap "exact Adams County lidar project name, Rockyweb folder and AWS bucket path" for the AWS side; the Rockyweb folder is still not recorded.',
           'check_21b: collected 2017-11-21 to 2017-12-21 means leaf-off winter lidar; the canopy model the project built is therefore a leaf-off structure measure (SOURCES-landcover.md calls it a 2017 canopy height model).'],
    assign_note='Table 3 prints only Source, Type, What it gives, Access and exact URL, Format, Scale/resolution, License.')

row(22, 3, 106,
    'USGS 3DEP access routes',
    'Distribution',
    'The National Map, 3DEP Lidar Explorer, Rockyweb direct downloads, WMS/WCS dynamic DEM, 1-m seamless (S1M) COG tiles in production since mid-2025, and an AWS public dataset',
    'https://www.usgs.gov/3d-elevation-program/about-3dep-products-services',
    [('https://www.usgs.gov/3d-elevation-program/about-3dep-products-services', 'access_url')],
    'Various', 'n/a', 'Free', None, None, [], [], 'service / download routes')

row(23, 3, 106,
    'PAMAP LiDAR 2006-2008 (Adams included; Adams listed among 2007 counties, date to verify)',
    'Airborne lidar',
    'Earlier terrain, before more recent disturbance',
    'NOAA InPort https://www.fisheries.noaa.gov/inport/item/49951 ; bulk on NOAA S3 noaa-nos-coastal-lidar-pds, ID 2574 ; acquisition report https://www.pasda.psu.edu/download/pamap/PAMAP_ancillary_data/PAMAP_LiDAR_%202006-2008_%20Acquisition%20Report_Full_Report.pdf',
    [('https://www.fisheries.noaa.gov/inport/item/49951', 'access_url'),
     ('https://www.pasda.psu.edu/download/pamap/PAMAP_ancillary_data/PAMAP_LiDAR_%202006-2008_%20Acquisition%20Report_Full_Report.pdf', 'access_url')],
    'LAZ, 10,000 x 10,000 ft tiles, classes: ground, vegetation, building, water',
    'Nominal 1.4 m spacing; open-terrain RMSEz 0.535 ft; consolidated vertical accuracy (95%) 1.134 ft; vertical target 18.5 cm',
    'None named', None, None, [],
    ['PDF: Adams listed among 2007 counties, "date to verify".'],
    'bulk download (NOAA S3 bucket noaa-nos-coastal-lidar-pds, ID 2574)',
    note='Row continues from page 106 to 107. The S3 bucket is named, not given as a URL, so it is not probed as a URL. The PDF prints the PASDA report URL with "%20" after "LiDAR_" and after "2008_".',
    check=['check_23: not yet used by the project (no PAMAP ingest exists in docs/basemap1863 or tools/b1863).'])

row(24, 3, 107,
    'Adams County ArcGIS server REST services',
    None,
    '2023 aerial imagery (Aerial_MapService_2023_Pro), contours, soils',
    'https://mapping.adamscountypa.gov/arcgis/rest/services',
    [('https://mapping.adamscountypa.gov/arcgis/rest/services', 'access_url')],
    'REST', 'n/a', 'Not stated', None, None, [], [], 'REST service',
    assign_note='The printed row has one cell fewer than the header: the cell after the name is read as What it gives; Type is null.',
    check=['check_24: the project used Adams County 2023 building outlines and centre lines to decide what to remove; the data carries no stated licence (docs/basemap1863/BUILD.md section 2 and 10).'])

row(25, 3, 107,
    'NPS Vegetation Mapping Inventory, GETT/EISE',
    'FGDB, association-level map (NVC-based) with an added "Cleared Land" class, 2006',
    'Modern vegetation, used to find where woods exist now versus 1863',
    'https://irma.nps.gov/DataStore/DownloadFile/610918?Reference=2233298 ; listing https://catalog-beta.data.gov/dataset/geospatial-data-for-the-vegetation-mapping-inventory-project-of-gettysburg-national-milita ; https://www.nps.gov/im/vmi-gett-eise.htm',
    [('https://irma.nps.gov/DataStore/DownloadFile/610918?Reference=2233298', 'access_url'),
     ('https://catalog-beta.data.gov/dataset/geospatial-data-for-the-vegetation-mapping-inventory-project-of-gettysburg-national-milita', 'access_url'),
     ('https://www.nps.gov/im/vmi-gett-eise.htm', 'access_url')],
    'FGDB', 'Not stated', 'Not stated', None, None, [], [], 'digital-download (FGDB)',
    note='The catalog-beta.data.gov URL ends "...national-milita" in the PDF (cut at the line end, or truncated in the source). Recorded exactly as printed; likely not resolvable as printed.',
    check=['check_25: the project could not obtain this layer ("no open GIS layer found on the NPS ArcGIS services; the NPS Data Store was not reachable with the tools used": docs/basemap1863/features/landcover/SOURCES-landcover.md section 6). Printed catalog URL is cut off ("milita").'])

row(26, 3, 107,
    'NPS digital geology of GETT (from Stose and Bascom 1929, 1:62,500), IRMA ref 1041800',
    'FGDB, GeoPackage, KMZ',
    'Bedrock units, useful for diabase outcrops and rock-field masks',
    'https://catalog.data.gov/dataset/digital-geologic-gis-map-of-gettysburg-national-military-park-pennsylvania-nps-grd-gr-1929',
    [('https://catalog.data.gov/dataset/digital-geologic-gis-map-of-gettysburg-national-military-park-pennsylvania-nps-grd-gr-1929', 'access_url')],
    'FGDB / GPKG / KMZ', '1:62,500; 31.8 m horizontal tolerance', 'Not stated', None, None, [], [], 'digital-download (FGDB/GPKG/KMZ)')

row(27, 3, 107,
    'PASDA SSURGO (gSSURGO) soils for Pennsylvania',
    'REST / gdb',
    'Soil units for grass, crop and wetness parameters',
    'https://mapservices.pasda.psu.edu/server/rest/services/pasda/Soils_PA/MapServer/0/iteminfo',
    [('https://mapservices.pasda.psu.edu/server/rest/services/pasda/Soils_PA/MapServer/0/iteminfo', 'access_url')],
    'REST / gdb', 'Not stated', 'Acknowledge NRCS', None, None, [], [], 'REST service / gdb')

row(28, 3, 107,
    'Penn Pilot historic aerials (PA Geological Survey / Penn State), 1937-42 and 1967-72',
    'Scanned aerial photographs',
    'Pre-restoration land cover, old field boundaries and fence lines still visible in 1937-42',
    'Viewer https://www.arcgis.com/apps/View/index.html?appid=10af5f75f9f94f01866359ba398cb6a9 ; https://geo.btaa.org/catalog/pasda-1078 ; https://www.witf.org/2025/01/24/penn-pilot-exploring-pennsylvanias-history-through-aerial-photography/',
    [('https://www.arcgis.com/apps/View/index.html?appid=10af5f75f9f94f01866359ba398cb6a9', 'access_url'),
     ('https://geo.btaa.org/catalog/pasda-1078', 'access_url'),
     ('https://www.witf.org/2025/01/24/penn-pilot-exploring-pennsylvanias-history-through-aerial-photography/', 'access_url')],
    'Scans', 'Not stated', 'Not stated', None, None, [], [], 'viewer-only (scans via viewer; download route not stated)',
    note='The PDF breaks the first URL after "index.html?"; joined without a space.')

row(29, 3, 107,
    'Adams County 1996 orthophoto (about 2-ft pixels) and 1996 DEM (private firm, 5-ft contours, 1:4,800 map accuracy standard)',
    'Used by NPS and Knowles',
    'Legacy',
    'Described at https://www.nps.gov/gis/gisday/gallery2001/GWS/musselman.htm and https://xyht.com/?p=2387',
    [('https://www.nps.gov/gis/gisday/gallery2001/GWS/musselman.htm', 'access_url'), ('https://xyht.com/?p=2387', 'access_url')],
    'n/a', 'See left', 'n/a', None, None, [], [], 'described only (no data access printed)',
    assign_note='Printed cells after the name are "Used by NPS and Knowles", "Legacy", URL, "n/a", "See left", "n/a"; assigned in header order (Type, What it gives, Access, Format, Scale, Licence). The reading of the first two cells is ambiguous.')

row(30, 3, 107,
    'PA DCNR hydrography, USGS NHD',
    'Hydrography',
    'Stream lines; some watersheds accurate to 1:2,400; NHD recommended for 1:24,000',
    'https://www.pa.gov/agencies/dcnr/conservation/geology/digital-base-maps',
    [('https://www.pa.gov/agencies/dcnr/conservation/geology/digital-base-maps', 'access_url')],
    'Various', 'See left', 'Public', None, None, [], [], 'digital-download (various)',
    check=['check_30: NHD flowlines already used: features/roads-rail-water/waterways.geojson (363 flowlines; modern courses, NPS says they changed).'])

row(31, 3, 107,
    'NPS small-scale base (1:100,000 water quality base)',
    'GIS',
    'Not useful at this scale',
    'https://catalog.data.gov/dataset/gettysburg-national-military-park-small-scale-base-gis-data',
    [('https://catalog.data.gov/dataset/gettysburg-national-military-park-small-scale-base-gis-data', 'access_url')],
    'GIS', '1:100,000', 'n/a', None, None, [], [], 'digital-download (GIS); PDF says not useful')

# ---------------------------------------------------------------------------------------------------- Table 4
row(32, 4, 107,
    "Gardner, O'Sullivan and Gibson photographs, July 1863. Gardner and O'Sullivan reached Gettysburg 5 July 1863 and photographed Devil's Den on 6 July.",
    'Photographs',
    'Ground truth for trees, rail-fence type, wall lines, rock positions, crop stubble and bodies at specific places',
    'NARA IDs 165-SB-40 (ARC 533314) and 165-SB-41 (ARC 533315) for the sharpshooter pair: https://prologue.blogs.archives.gov/2013/06/20/the-true-story-behind-the-gettysburg-sharpshooter ; "Gettysburg, Pennsylvania, from Cemetery Ridge, July 1863" (O\'Sullivan negative, Gardner positive): https://hd.housedivided.dickinson.edu/node/27090',
    [('https://prologue.blogs.archives.gov/2013/06/20/the-true-story-behind-the-gettysburg-sharpshooter', 'access_url'),
     ('https://hd.housedivided.dickinson.edu/node/27090', 'access_url')],
    None, None, None, None, None, [], [], 'photographs via NARA / LOC (IDs given for one pair)',
    note='The PDF breaks the first URL after "the-"; joined without a space. Table 4 prints only Source, Type, What it gives, Access and exact URL: format, scale, licence, limits and tier are not printed.',
    check=['check_32: the project examined 19 candidate July 1863 photographs at LOC for Check 5 (rephotography), 12 rendered; poses are the checker\'s own estimates (tiers B/C/D), none from documented coordinates: docs/basemap1863/verification/check5-rephotography.md.'])

row(33, 4, 107,
    'LOC Civil War Photographs collection',
    'About 7,000 views and portraits including original Brady and Gardner glass negatives (purchased 1943), all digitized',
    'July 1863 views',
    'https://www.loc.gov/pictures/collection/cwp/',
    [('https://www.loc.gov/pictures/collection/cwp/', 'access_url')],
    None, None, None, None, None, [], [], 'digital-download (LOC pictures)',
    assign_note='The printed cell after the name describes the collection; in header order it is Type, and "July 1863 views" is What it gives.')

row(34, 4, 107,
    'Frassanito, "Gettysburg: A Journey in Time" (1975)',
    'Rephotography research',
    'Camera positions; showed the famous picture was one of six of the same body. NPS has rebuilt the staging wall at Devil\'s Den.',
    'https://en.wikipedia.org/wiki/Home_of_a_Rebel_Sharpshooter (lead only, secondary)',
    [('https://en.wikipedia.org/wiki/Home_of_a_Rebel_Sharpshooter', 'access_url')],
    None, None, None, None, None, [], ['PDF: lead only, secondary (Wikipedia). The book itself is copyrighted: cite, do not ingest (PDF B.9.3).'], 'book (print); only a Wikipedia lead URL printed',
    check=['check_34: Wikipedia is a lead, never a source for a documented claim (CLAUDE.md Law 4).'])

row(35, 4, 107,
    'NPS "Then and Now"',
    'Web overlays of 1863 and modern photos',
    'Example: Gardner Stereo #257 near the Rose Woods, DeTrobriand Avenue, 5-6 July 1863',
    'https://www.nps.gov/places/gettysburg-then-now-first-rose-woods.htm ; https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm (not opened)',
    [('https://www.nps.gov/places/gettysburg-then-now-first-rose-woods.htm', 'access_url'),
     ('https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm', 'access_url')],
    None, None, None, None, None, [], ['PDF: the then-and-now.htm landing page "not opened".'], 'web pages',
    check=['check_35: Check 5 of the 1863 base map used the NPS Then and Now site descriptions (rose-woods, trostle-farm, devil-s-den, buildings-and-farms) to place cameras; none give coordinates.'])

row(36, 4, 107,
    'Tyson brothers / William H. Tipton photographs',
    'Negatives and prints',
    'Tipton (about 13 years old at the time, apprenticed to the Tysons) helped expose plates of the fresh battlefield. NPS transferred more than 1,000 Tipton negatives to NARA in 1955; ACHS holds thousands of Tipton originals.',
    'https://www.battlefields.org/learn/biographies/william-h-tipton ; NPS museum PDF https://museum.nps.gov/Media//00001/Gett%2041136,%20W.H.%20Tipton%20Photographic%20Prints%202013%20U00635923399151552978.pdf (not opened)',
    [('https://www.battlefields.org/learn/biographies/william-h-tipton', 'access_url'),
     ('https://museum.nps.gov/Media//00001/Gett%2041136,%20W.H.%20Tipton%20Photographic%20Prints%202013%20U00635923399151552978.pdf', 'access_url')],
    None, None, None, None, None, [], ['PDF: NPS museum PDF "not opened".'], 'photographs at NARA / ACHS (IDs not given)',
    note='The museum PDF URL is printed on one line, with %20 escapes, exactly as recorded.')

row(37, 4, 107,
    'Gettysburg College, Ron Perisho Collection',
    "Albumen prints, tintypes, stereographs, lantern slides (Gardner, O'Sullivan, Gibson, Tysons, Tipton, Corlies, Weaver)",
    'Additional period views',
    'https://www.gettysburg.edu/offices/schmucker-art-gallery/exhibitions/a-great-and-truthful-medium-photography-at-gettysburg-beyond-selections-from-the-ron-perisho-collection-at-gettysburg-college',
    [('https://www.gettysburg.edu/offices/schmucker-art-gallery/exhibitions/a-great-and-truthful-medium-photography-at-gettysburg-beyond-selections-from-the-ron-perisho-collection-at-gettysburg-college', 'access_url')],
    None, None, None, None, None, [], [], 'exhibition page (collection access not stated)',
    note='Row continues from page 107 to 108. The PDF breaks the URL after "selections-"; joined without a space.')

row(38, 4, 108,
    'Gettysburg History (Adams County Historical Society, ACHS)',
    'Archive',
    'PastPerfect Online with over 60,000 photographs and records; Lane Photographic Collection on Flickr; Civil War Damage Claims Index (PDF); 1858 Adams County Map Name Index; 1872 Atlas Name Index; grantor/grantee deed index; tax records index; census indexes (1790, 1830 listed); newspapers on microfilm',
    'https://gettysburghistory.org/our-holdings/',
    [('https://gettysburghistory.org/our-holdings/', 'access_url')],
    None, None, None, None, None, [], [], 'archive (online indexes; originals on site / microfilm)',
    check=['check_38: the census indexes listed are 1790 and 1830; no 1860 index is listed, yet B.9.2 step 5 relies on "the 1860 agricultural census".'])

row(39, 4, 108,
    'Pennsylvania state damage claims (Gettysburg Campaign claims, renumbered 1868, after federal claims failed)',
    'Archival claims',
    'Itemized losses by owner (fence rails, timber, crops, household goods)',
    'Explained at https://gettysburgcompiler.org/uncategorized/patriotism-or-greed-damage-claims-after-the-b (a student blog; the example Krauth claim, approved 1871 for $519.70, itemizes household goods and the article does not discuss fences or timber)',
    [('https://gettysburgcompiler.org/uncategorized/patriotism-or-greed-damage-claims-after-the-b', 'access_url')],
    None, None, None, None, None, [],
    ['PDF: source is a student blog; the example claim does not discuss fences or timber.'], 'archive (Pennsylvania State Archives; no digital access printed)',
    note='The URL ends "...after-the-b" as printed (cut at the line end or truncated in the source); recorded exactly as printed.',
    check=['check_39: URL as printed is cut off ("after-the-b"); likely not resolvable as printed.'])

row(40, 4, 108,
    'Philippoteaux Cyclorama (opened Chicago 1883, 377 x 42 ft; restored 2003-08)',
    'Painting',
    'General sightlines from Cemetery Ridge toward the Angle, 3 July view',
    'https://www.nps.gov/gett/learn/historyculture/cyclorama.htm',
    [('https://www.nps.gov/gett/learn/historyculture/cyclorama.htm', 'access_url')],
    None, None, None, None, None, [], [], 'web page',
    check=['check_40: the PDF tier definitions place paintings in R4 (artistic work, low weight); Table 4 prints no tier for this row.'])

row(41, 4, 108,
    'PHMC agricultural census extracts',
    'Statistics',
    'County agricultural census extracts for 1850, 1880, 1927 (path pattern phmc.pa.gov/Preservation/<year>-Agricultural-Census/Documents/adams_county_<year>_census_data.pdf)',
    'https://www.phmc.pa.gov/Preservation/1880-Agricultural-Census/Documents/adams_county_1880_census_data.pdf (the 1850 URL redirected; unverified)',
    [('https://www.phmc.pa.gov/Preservation/1880-Agricultural-Census/Documents/adams_county_1880_census_data.pdf', 'access_url')],
    None, None, None, None, None, [], ['PDF: the 1850 URL redirected; unverified.'], 'digital-download (PDF)',
    note='The path pattern in the "what it gives" cell contains <year> placeholders and is not a URL; only the 1880 URL is printed in full and is probed.',
    check=['check_41: the extracts listed are 1850, 1880 and 1927. B.9.2 step 5 says "the 1860 agricultural census and the damage claims (Table 4, rows 39 and 41)" would convert inference to documented fact; row 41 contains no 1860 extract. The 1860 census is therefore not in the catalog; B.9.3 routes it to NARA, FamilySearch or Ancestry, two of which need accounts (CLAUDE.md: no accounts by Claude: owner-only).'])

# ---------------------------------------------------------------------------------------------------- Table 5
row(42, 5, 108,
    'NPS natural features and ecosystems',
    None,
    'Park of 5,989 acres; more than 1,600 acres woodlot/forest; more than 2,300 acres crop/pasture/meadow; about 148 acres palustrine wetland; forest regeneration study since 1985; 1999 General Management Plan/EIS aims to replant historic woodlots, orchards and thickets',
    'https://www.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm and https://home.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm',
    [('https://www.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm', 'access_url'),
     ('https://home.nps.gov/gett/learn/nature/naturalfeaturesandecosystems.htm', 'access_url')],
    None, None, None, 'Modern.', 'R3', ['R3'], [], 'web page')

row(43, 5, 108,
    'NPS plants',
    None,
    'Modern woodlot overstory dominated by white oak, white ash, northern red oak; 553 vascular plants (410 native); invasives include ailanthus and multiflora rose; no mention of American chestnut',
    'https://nps.gov/gett/learn/nature/plants.htm',
    [('https://nps.gov/gett/learn/nature/plants.htm', 'access_url')],
    None, None, None, 'Modern species list under-represents 1863 composition (see B.10.3).', 'R3', ['R3'], [], 'web page')

row(44, 5, 108,
    'American Battlefield Trust, battlefield orchards',
    None,
    '44 orchards existed on present park land during the war; since 2000 NPS planted 2,869 apple trees on 109 acres at 35 historic orchard sites; the Sherfy Peach Orchard was replanted in 2008 with 72 peach trees; 114 Sherfy trees survived the battle',
    'https://www.battlefields.org/learn/articles/nature-of-history/hidden-history-battlefield-orchards',
    [('https://www.battlefields.org/learn/articles/nature-of-history/hidden-history-battlefield-orchards', 'access_url')],
    None, None, None,
    'The notes elsewhere say the Sherfy orchard was replanted in 1883 and that Gilbert Orchard was replanted in 2007; replanted extent exceeds the 1863 extent. 1863 species are unknown.',
    'R3', ['R3'], ['PDF: internal conflict on replanting dates (2008 / 1883 for Sherfy; Gilbert 2007).'], 'web page',
    note='The PDF breaks the URL after "hidden-"; joined without a space.',
    check=['check_44: conflicting replanting dates are carried in the PDF itself ("2008" in this row versus "1883" elsewhere in its notes); keep as a conflict-register entry rather than choosing.'])

row(45, 5, 108,
    'Fence evidence',
    None,
    'Post-and-rail (posts in dug holes) and Virginia worm/sawbuck (zig-zag rails, no post holes, possibly used where ground was rocky) described along the Emmitsburg Road; post and rail lined both sides and Pickett\'s attackers crossed two fences. General post-and-rail dimensions (not Gettysburg-specific): rails about 11 ft, height about 5 ft, posts 6 to 6.5 ft; oak/locust/cedar posts, oak/poplar/pine rails',
    'https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/ ; http://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/',
    [('https://www.gettysburgdaily.com/fences-constructed-along-the-emmitsburg-road/', 'access_url'),
     ('http://emergingcivilwar.com/2022/09/30/fence-friday-post-and-rail/', 'access_url')],
    None, None, None,
    'Blog-level sources. No documented list of stone walls versus rail fences by location. Feeds B.8.',
    'R3', ['R3'], ['PDF: blog-level sources only.'], 'web pages',
    note='The PDF breaks URLs at hyphens; joined without spaces.')

# ---------------------------------------------------------------------------------------------------- unverified list
UNVERIFIED = [
    ('Item numbers for the full 1868-69 Warren sheets, the 1873 revision, Bachelder\'s LOC editions and Cope\'s NARA map', 'LOC search and NARA catalog were blocked to the research tools.'),
    ('OR Atlas Gettysburg plate numbers', 'Not looked up.'),
    ('Hotchkiss Gettysburg-specific maps, Sickles or Meade headquarters sketches', 'Not found.'),
    ('A "Lt. Edwin Whitney" map', 'Name appears in the brief; no source confirms it.'),
    ('Warren map tree and orchard symbology', 'No source found. Without it, woodlot extent comes from the polygons, and tree size and species come from B.10.3.'),
    ('Warren map positional error (RMS)', 'Not documented in any source found; only the Knowles anecdotes above.'),
    ('Brady and NARA RG 111-B holdings', 'Search budget ended before this could be verified.'),
    ('HABS/HAER (and HALS) holdings for Gettysburg farms', 'Search failed or returned irrelevant results.'),
    ('Virtual Gettysburg, American Battlefield Trust GIS/KML, Google Earth projects, open 3D tilesets', 'Not verified. Civil War Trust maps are generally copyrighted (inferred).'),
    ('Stereoview collections (NYPL, Library Company)', 'Not verified.'),
    ('Tree/orchard inventories, chestnut data, the NPS Historic Vegetation Study', 'No verified source.'),
    ('Sanborn maps', 'None found for 1863; the Sanborn series post-dates the war.'),
    ('Esri World Imagery, Sentinel-2, Landsat, NLCD, OSM', 'Standard products that were neither fetched nor verified; low value for 1863 beyond modern masks.'),
]
UNVERIFIED_EXTRA = {
    'item': 'Gettysburg Compiler 1863 newspaper (printed after the list, page 109)',
    'why_unverified': 'The LOC "Gettysburg Compiler" runs 1866 to 1961 (https://www.loc.gov/item/sn83032044), so it is not July 1863 reporting. Chronicling America July 1863 batches exist (JSON via fo=json; https://www.loc.gov/collections/chronicling-america/) but are not terrain sources.',
    'urls': ['https://www.loc.gov/item/sn83032044', 'https://www.loc.gov/collections/chronicling-america/'],
}
UNVERIFIED_CHECK = {
    'HABS/HAER (and HALS) holdings for Gettysburg farms': 'The project has since cited HABS records at LOC (pa1728 Trostle barn, pa0021, pa0020, pa1676, pa1745, pa4187, pa1793, pa1815): docs/basemap1863/maps/sources.json "habs-1863-structures". Partly resolved.',
    'Warren map positional error (RMS)': 'Partly resolved by the project: absolute leave-one-out 16.5 m (23 control points, affine) for LOC 99448794; this is position of the georeference, not a contour/elevation RMS: docs/basemap1863/maps/README.md. No elevation error has been measured.',
    'Tree/orchard inventories, chestnut data, the NPS Historic Vegetation Study': 'Still unfound by the project (SOURCES-landcover.md section 6).',
}

METHOD_LIMITS = ("The research passes had several blocked endpoints: loc.gov search and JSON endpoints were blocked to the research tools, "
                 "several Rumsey and NARA catalog pages returned verification screens, and the NPS Little Round Top cultural landscape report "
                 "PDF failed to fetch. Items that depend on those pages are marked \"URL unverified\". Claude Code retries these during "
                 "execution (Part D, Part E); the retry results go into the Evidence-Gap Register. Nothing below is presented as verified "
                 "when the notes say it was not. (PDF B.9, page 104)")
TIER_DEFS = {
    'R1': 'Measured survey or measured geodata. Positional accuracy can be tested.',
    'R2': 'Near-contemporary map, photograph or record (1858 to about 1876) made by or near the people who saw the ground.',
    'R3': 'Later, derived or secondary product (restoration GIS, books, summaries, Wikipedia-level pages). Useful, but must be cross-checked.',
    'R4': 'Artistic or composite work, or a forum or blog claim. Low weight. Never the sole basis for any object.',
}


def main():
    assert [r['number'] for r in ROWS] == list(range(1, 46)), [r['number'] for r in ROWS]
    for r in ROWS:
        for u in r['urls']:
            assert re.match(r'^https?://[^\s]+$', u['url']), u
    doc = {
        'schema': 'bt-terrain-sources/1',
        'source_document': 'Gettysburg Total War animation plan, version 2, B.9.1 Tables 1-5, pdf pages 103-110; text docs/battle-theatre/BIBLE/plan-clean.txt lines 24884-26350',
        'transcription_rules': 'Cell text as printed, straight quotes, line breaks joined. URLs exactly as printed (including ones the PDF shows truncated). Null = column not printed in that table. check_* fields are observations by the task that built this file, not PDF content.',
        'law': 'Nothing here is verified by being listed. A source gives a documented basis only for what it states (PDF B.9). Tiers R1-R4 describe use as a 1863 landscape source, not archive quality.',
        'tier_definitions': TIER_DEFS,
        'method_limits': METHOD_LIMITS,
        'tables': [{'table': t, 'title': TABLE_TITLES[t], 'printed_columns': TABLE_COLUMNS[t][1:],
                    'rows': [r['number'] for r in ROWS if r['table'] == t]} for t in sorted(TABLE_TITLES)],
        'rows': ROWS,
        'unverified_list': [{'item': i, 'why_unverified': w, 'check_note': UNVERIFIED_CHECK.get(i)} for i, w in UNVERIFIED],
        'unverified_list_postscript': UNVERIFIED_EXTRA,
        'gaps_B93_printed': [
            'Item numbers and full-resolution access for the complete 1868-69 Warren sheets and the 1873 revision (NARA RG 77 E 81 scans, NAID 102279222; LOC catalog entries)',
            'Warren positional error (RMS) - the pipeline\'s own residual test (B.9.2 step 3)',
            'Cope map (E 105a-1) image - NARA catalog, retry',
            'NPS 1863 vector layers (roads, lanes, fences, boundaries, buildings) - request to NPS GIS office, and rebuild',
            'Exact Adams County lidar project name, Rockyweb folder and AWS bucket path - listing the public 3DEP dataset',
            '1860 agricultural census, deed and tax records, damage claims - NARA, FamilySearch or Ancestry; ACHS indexes; Pennsylvania State Archives (B.10.7)',
            'LOC reproduction numbers and download resolutions for July 1863 photographs; Tyson/Tipton NARA series IDs - retry',
            'Documented camera positions for Plum Run and the Rose farm - Frassanito (copyrighted; cite, do not ingest); NPS Then and Now; derive by photo-match',
            'Warren tree and orchard symbology; NPS Historic Vegetation Study; orchard inventory - NPS CLR Record of Treatment Vol. I-II (IRMA 2257218), NPS Little Round Top CLR, NPS planning page; retry fetch',
            'Stone wall versus rail fence by location - Warren fence symbols, damage claims, photographs, CLR text; combined in B.8',
            'Marsh Creek and Rock Creek channel width and flow - not found in any source; plausible-procedural, flagged',
            'An open 3D tileset of 1863 Gettysburg - none found; the pipeline builds its own',
        ],
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    n_urls = sum(len(r['urls']) for r in ROWS)
    print('wrote', OUT, 'rows', len(ROWS), 'urls', n_urls)


if __name__ == '__main__':
    main()
