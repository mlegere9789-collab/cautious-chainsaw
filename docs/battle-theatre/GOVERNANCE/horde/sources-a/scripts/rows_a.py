"""rows R12.001 - R12.004 (Warren extract, Warren original at NARA, Rumsey 1895 print, Bachelder 1876)"""
from rowlib import C, S, BLK, HOST

LOC_RIGHTS = 'free to use and reuse unless a Rights Advisory statement is present that indicates otherwise'
LOC_CREDIT = 'Credit Line: Library of Congress, Geography and Map Division.'


def ROWS(prev):
    rows = []

    # ------------------------------------------------------------------ R12.001
    rows.append(dict(
        id='R12.001',
        verdict='partially_supported',
        pdf_claim='Warren, "Battle Field of Gettysburg", LOC 1886 Corps of Engineers tracing-linen extract (call no. G3822.G4S5 1886 .U5): manuscript map, colored; roads, buildings, resident names, fences, vegetation, fortifications, contours at 4-ft intervals; IIIF; 1:2400, sheet 121 x 72 cm; free to use, credit "Library of Congress, Geography and Map Division"; covers only portions of sheets 2 and 3 (south and southwest of town); an 1886 copy of a survey done 1868-69; R1 for geometry (error model not published), R2 for land cover.',
        corrected_claim=(
            'Confirmed from the LOC record and the LOC image service, with additions. LOC 99446453 is a manuscript map on tracing linen, 1 map col. ms 121 x 72 cm, scale 1:2400 ("1" = 200 feet"), '
            'showing "roads, buildings, names of residents, fence lines, vegetation, and fortifications, and relief by contour lines at intervals of 4 feet", an "Extract from the original (large scale) map of Gettysburg battle field in 4 sheets, '
            'being portions of sheets 2 and 3 lying S. & S.W. of the town" (call no. G3822.G4S5 1886 .U5; imprint "Washington Office of the Chief of Engineers, U.S.A. 1886."; creator Corps of Engineers). '
            'The image is 7186 x 13687 px (IIIF info.json, tile.loc.gov); the JP2 is 13,495,108 bytes and the TIFF master 295,067,312 bytes (HTTP HEAD, 2026-11-16). '
            'The record is internally inconsistent on date (machine date field 1861, imprint 1886): both are carried. The survey it copies is dated 1868-69, revised 1873 on the ground (LOC 99448794 note). '
            'Sheet count is a carried conflict: the LOC title says the large map is in 4 sheets (NPS Administrative History also says "four-sheet map"), the NPS Little Round Top CLR bibliography lists "25 sheets" for the NARA map copy held by the park, '
            'and the xyHt article (earlier reading, not re-read) is said to give 20 sections at NARA and a caption "1 of 5, sheet II". '
            'Corrections to the first-round row: (1) the IIIF manifest URL is stated by LOC (item.iiif_manifest_url) but the manifest itself answers HTTP 403 to this client on both its item and resource paths (2026-11-16); '
            'image size comes from the IIIF image service instead; (2) the NPS reading of the large Warren map is "12 feet square" at 1 inch to 200 feet (1893 Commission report quoted by the NPS Administrative History), against "about 13 ft" in the xyHt article; '
            '(3) "R1 for geometry" in the PDF is the PDF\'s own tier and is not supported by any text read: the project\'s own measurement (ELEV-NOTES) found only 48 readable label anchors and 14.2 percent trusted coverage, and says the Warren surface is not "documented" for 1863.'),
        sub_claims=[
            S('R12.001.a', 'identity', 'LOC 99446453 is the "Extract from the original (large scale) map of Gettysburg battle field in 4 sheets, being portions of sheets 2 and 3 lying S. & S.W. of the town of Gettysburg", call no. G3822.G4S5 1886 .U5, creator Corps of Engineers, imprint "Washington Office of the Chief of Engineers, U.S.A. 1886."',
              'documented', 'supported', [
                  C('LOC-99446453', 'Extract from the original (large scale) map of Gettysburg battle field in 4 sheets, being portions of sheets 2 and 3 lying S. & S.W. of the town of Gettysburg', locator='item.title'),
                  C('LOC-99446453', 'G3822.G4S5 1886 .U5', locator='item.call_number'),
                  C('LOC-99446453', 'Washington Office of the Chief of Engineers, U.S.A. 1886.', locator='item.created_published'),
                  C('LOC-99446453', 'United States. Army. Corps of Engineers', locator='item.contributor_names'),
                  C('LOC-99446453', 'item.library_of_congress_control_number: 99446453', locator='LCCN'),
              ]),
            S('R12.001.b', 'content_scale_medium', 'Manuscript map on tracing linen of the intersection of the Emmitsburg and Taneytown roads; depicts roads, buildings, names of residents, fence lines, vegetation and fortifications, with relief by contour lines at intervals of 4 feet; scale 1:2400 ("1" = 200 feet"); 1 map col. ms 121 x 72 cm.',
              'documented', 'supported', [
                  C('LOC-99446453', 'Manuscript map drawn on tracing linen of the intersection of the Emmitsburg and Taneytown roads. Depicted are roads, buildings, names of residents, fence lines, vegetation, and fortifications, and relief by contour lines at intervals of 4 feet.', locator='item.notes[0]'),
                  C('LOC-99446453', 'Scale 1:2400 ("1" = 200 feet").', locator='item.notes[2]'),
                  C('LOC-99446453', '1 map col. ms 121 x 72 cm.', locator='item.medium'),
              ], note='"Description derived from published bibliography" (item.notes[1]): the LOC description is a bibliographic summary, not a reading of the sheet.'),
            S('R12.001.c', 'coverage', 'The extract covers only portions of sheets 2 and 3 lying south and southwest of the town of Gettysburg (not the whole field); the LOC description names the intersection of the Emmitsburg and Taneytown roads.',
              'documented', 'supported', [
                  C('LOC-99446453', 'being portions of sheets 2 and 3 lying S. & S.W. of the town of Gettysburg', locator='item.title'),
              ], note='Which ground the image really covers has not been read off the image (not downloaded): open.'),
            S('R12.001.d', 'rights', 'LOC states the Geography and Map Division digitized collections are free to use and reuse unless a Rights Advisory statement is present; credit line "Library of Congress, Geography and Map Division."; none present in this record.',
              'documented', 'supported', [
                  C('LOC-99446453', LOC_RIGHTS, locator='item.rights'),
                  C('LOC-99446453', LOC_CREDIT, locator='item.rights'),
              ]),
            S('R12.001.e', 'image_size', 'Image 7186 x 13687 px (IIIF image service); JP2 13,495,108 bytes; TIFF master 295,067,312 bytes; LOC states an IIIF manifest URL for the item.',
              'documented', 'supported', [
                  C('LOC-IIIF-cw0350500', 'height: 13687', locator='info.json height'),
                  C('LOC-IIIF-cw0350500', 'width: 7186', locator='info.json width'),
                  C('OWN-HEAD-RECORDS', 'content-length 13495108', note='HTTP HEAD of .../cw0350500.jp2, status 200, 2026-11-16'),
                  C('OWN-HEAD-RECORDS', 'content-length 295067312', note='HTTP HEAD of .../cw0350500Z.tif, status 200, 2026-11-16 (the name without Z answers 404)'),
                  C('LOC-99446453', 'item.iiif_manifest_url: https://www.loc.gov/item/99446453/manifest.json', note='the manifest document itself answered HTTP 403 (refused) to this client on 2026-11-16, also at /resource/g3822g.cw0350500/manifest.json; not worked around'),
              ]),
            S('R12.001.f', 'ground_sampling', 'Ground sampling of the scan is about 0.21 m per pixel along the 121 cm axis and about 0.24 m along the 72 cm axis (scan margins unknown).',
              'inferred', 'derived', [],
              computation='121 cm / 13687 px = 0.0884 mm per px x 2400 = 0.212 m; 72 cm / 7186 px = 0.1002 mm per px x 2400 = 0.240 m. Inputs: LOC medium (121 x 72 cm), IIIF info.json (13687 x 7186 px), LOC scale 1:2400. The printed sheet size includes margins and legend, so the true figure is a little smaller.'),
            S('R12.001.g', 'date_conflict', 'The LOC record carries two dates: imprint "1886" and a machine date field "1861"; the underlying survey is 1868-69, revised on the ground in 1873.',
              'documented', 'conflict', [
                  C('LOC-99446453', 'item.date: 1861', locator='item.date (machine field)'),
                  C('LOC-99446453', 'Washington Office of the Chief of Engineers, U.S.A. 1886.', locator='item.created_published'),
                  C('LOC-99448794', 'The survey was made in 1868 and 1869 and revised on the ground by P. M. Blake, Civil Engineer in 1873.', locator='LOC 99448794 item.notes[3]'),
              ], note='1861 predates the survey itself and cannot be the date of the sheet; the 1886 imprint matches the PDF. Both values stay listed; the product must not print 1861.'),
            S('R12.001.h', 'sheet_count', 'Number of sheets of the large-scale Warren map in the reachable sources: 4 (LOC title; NPS Administrative History "four-sheet map") and 25 (NPS Little Round Top CLR bibliography entry for the NARA map, copy on file at the park); the xyHt figures are in R12.001.i.',
              'documented', 'conflict', [
                  C('LOC-99446453', 'in 4 sheets, being portions of sheets 2 and 3', locator='item.title'),
                  C('NPS-ADHI', 'This four-sheet map was prepared for use in military instruction and for documentation to accompany the Official Records of the war.', note='Unrau 1991, narrative on the 1868-69 survey and footnote 5'),
                  C('NPS-CLR-LRT', '1868-1869. 25 sheets. RG 77', note='Bibliography, Maps and Drawings: "Map of the Battle Field of Gettysburg ... surveyed and drawn under the direction of Bvt. Gen. G.K. Warren ... 1868-1869. 25 sheets. RG 77, National Archives and Records Administration. Copy on file at Gettysburg National Military Park Archives."'),
              ], note='Two counts from reachable sources (4 and 25) plus the unread xyHt figures (20 sections; caption "1 of 5"); the counts may describe different products (the 4 sheets of the 1:2400 survey, a 25-sheet copy or reduction held by the park). Not resolved; carried as scenarios.'),
            S('R12.001.j', 'project_limits_of_warren_surface', 'The project\'s own measurement of the Warren sheet: 48 readable label anchors (of which 17 can be predicted from the others), a trusted surface over 14.2 percent (9.92 km2) of the 69.83 km2 sheet; the Warren surface should not be tiered "documented" for 1863.',
              'inferred', 'partial', [
                  C('PROJ-ELEV-NOTES', '**14.2 percent (9.92 km2)**'),
                  C('PROJ-ELEV-NOTES', 'of 48 anchors only 17 can be predicted from the others'),
                  C('PROJ-ELEV-NOTES', 'The Warren surface should **not** be tiered "documented" for 1863 under the Law item 4'),
              ], note='Project document of this repository (own measurement), not a source; it bears on the PDF tier "R1 for geometry".'),
            BLK('R12.001.i', 'xyht_size_sections', 'The large-scale Warren manuscript is "about 13 ft square" (xyHt), exists in 20 sections at NARA (photo credit "E81-2, 1 of 5, sheet II") and was recompiled between 1869 and 1874 to the engraved 1:12,000 map.',
                'xyHt (Professional Surveyor, Apr 2014): about 13 feet square; 20 sections at NARA; photo credit "E81-2, 1 of 5, sheet II"; recompiled and reduced to 1:12,000 between 1869 and 1874.',
                url_note='NPS reading for the size, from a different source: "which is the scale of the large Warren map, 12 feet square" (NPS Administrative History, quoting the 1893 Gettysburg National Park Commission report); see R12.002.d.'),
        ],
        stays_unsupported=[
            'The image has not been downloaded or read: which ground the sheet covers, the legibility of printed contour labels, and any georeferencing are open (register sources-a-EG-01).',
            'xyHt statements (about 13 ft square, 20 sections, caption "E81-2, 1 of 5, sheet II") are unverified from here (xyht.com refused by the proxy).',
            'The PDF tier "R1 for geometry": no text read gives a positional error for this sheet; the project\'s own measured limits are in ELEV-NOTES (48 anchors, 14.2 percent trusted coverage).',
        ],
        conflicts_carried=[
            'Date: imprint 1886 vs LOC machine date field 1861 (survey 1868-69, revised 1873): print 1886; 1861 is a catalogue artefact',
            'Sheets of the large map: 4 (LOC title, NPS Administrative History) vs 25 (NPS LRT CLR bibliography) vs 20 sections / "1 of 5" (xyHt, unread)',
            'Size of the large map: "12 feet square" (1893 Commission report via NPS Administrative History) vs "about 13 ft square" (xyHt, unread)',
        ],
        register_refs=['sources-a-EG-01', 'sources-a-EG-12', 'EG-0027'],
        blocked_host=[
            HOST('xyht', 'https://www.xyht.com/professional-surveyor-archives/feature-discovering-lees-view/', 'Professional Surveyor (xyHt), "Feature: Discovering Lee\'s View", April 2014: the paragraphs on the Warren map (size, number of sections at NARA, figure credit "E81-2, 1 of 5, sheet II", recompilation 1869-74); the PDF prints the short form https://xyht.com/?p=2387. Copy the sentences verbatim.'),
        ],
        product_consequence=[
            'terrain_sources.json row 1: add the carried conflicts (date 1886 vs 1861, sheets 4 / 25 / 20) and state that the IIIF manifest is not readable from the build container; the image size comes from the IIIF image service',
            'terrain provenance: Warren-derived heights and lines stay "inferred" for 1863 (survey 1868-69, revised 1873); the 1886 tracing is a copy of the survey, not a second root',
        ],
        lookups=[
            'tile.loc.gov IIIF info.json for cw0350500: HTTP 200 (2026-11-16): height 13687, width 7186',
            'tile.loc.gov HEAD cw0350500.jp2: 200, content-length 13495108; cw0350500Z.tif: 200, content-length 295067312; cw0350500.tif: 404',
            'www.loc.gov /item/99446453/manifest.json and /resource/g3822g.cw0350500/manifest.json: HTTP 403 (refused, 2026-11-16, not worked around)',
            'www.xyht.com robots.txt: proxy refusal (2026-11-13 and 2026-11-16)',
        ],
        changes_vs_previous=[
            'image size and file sizes re-verified from LOC systems (previous round recorded them from an item JSON that no longer lists them)',
            'new: NPS Administrative History "four-sheet map" and "12 feet square" and the NPS LRT CLR "25 sheets" as further sheet-count and size values',
            'new: the manifest URL is stated by LOC but the manifest answers 403 here',
        ],
        notes='LOC crawl-delay 5 s honoured; /search is robots-disallowed and not used.',
    ))

    # ------------------------------------------------------------------ R12.002
    rows.append(dict(
        id='R12.002',
        verdict='partially_supported',
        pdf_claim='Warren, "Battle Field of Gettysburg", National Archives original, RG 77 Civil Works Map File, Entry 81, NAID 102279222: full large-scale survey sheets made 1868-69, revised 1873; full coverage at 200 ft to 1 inch (about 1:2,400), printed in multiple sheets; reduced copies exist (E 105-4 "Final Proof"); scans of unconfirmed resolution; public (inferred); NPS found a 72 dpi NARA copy too blurry and used the LOC tracing instead; the NARA page does not state the contour interval or survey method (those come from the xyHt article); R1.',
        corrected_claim=(
            'Partly confirmed from reachable sources, partly blocked. Documented: the original Warren survey (1868 and 1869, revised on the ground by P. M. Blake in 1873) is held by the National Archives in Record Group 77, entry E 81 (LOC 99448794 note); '
            'it was drawn at 200 feet to the inch and "reduced" to the 1:12,000 map; the NPS cites the sheets as "Section E81-1, RG 77, Headquarters Map File, National Archives"; the NPS Administrative History (quoting the 1893 Commission report) gives the large Warren map as "12 feet square" at 1 inch to 200 feet. '
            'Unchanged: the NARA catalog (catalog.archives.gov) disallows all crawling in robots.txt, so no catalog page or scan was requested; full-resolution scans are not in hand (register sources-a-EG-01). '
            'Blocked, not re-asserted: the NAID 102279222, the E 105-4 "Final Proof" copy and the staff statements of the NARA blog (unwritten-record.blogs.archives.gov), and the "72 dpi" remark of the 2001 NPS paper (Wayback copy).'),
        sub_claims=[
            S('R12.002.a', 'holding', 'The original Warren survey is held by the National Archives in Record Group 77, entry E 81 (Cartographic and Architectural Branch).',
              'documented', 'supported', [
                  C('LOC-99448794', 'The original is in the National Archives, Cartographic and Architectural Branch, Record Group 77:E 81.', locator='LOC 99448794 item.notes[3]'),
                  C('NPS-CLR-1STDAY', 'Section E81-1, RG 77, Headquarters Map File, National Archives', note='figure credit: U.S. Engineering Department, "Battlefield of Gettysburg ... Surveyed and Drawn under the direction of Bvt. Maj. Gen. G. K. Warren", 1869, revised 1873'),
              ]),
            S('R12.002.b', 'survey_dates_and_scale', 'The survey was made in 1868 and 1869 and revised on the ground by P. M. Blake in 1873; drawn at 200 feet to the inch.',
              'documented', 'supported', [
                  C('LOC-99448794', 'The survey was made in 1868 and 1869 and revised on the ground by P. M. Blake, Civil Engineer in 1873.', locator='LOC 99448794 item.notes[3]'),
                  C('LOC-99448794', 'The map is reduced from one on a scale of 200 feet to the inch, deposited in the Archives of the office of the Chief of Engineers.', locator='LOC 99448794 item.notes[3]'),
                  C('NPS-ADHI', 'The battlefield was surveyed and mapped under the direction of Brevet Major General G.K. Warren, Major of Engineers, in 1868-69 for use in military instruction and for documentation to accompany the Official Records of the war', note='Unrau 1991'),
              ]),
            S('R12.002.c', 'sheets_and_size', 'The large Warren map is "12 feet square" at 1 inch to 200 feet (the Gettysburg National Park Commission\'s report of 16 November 1893, quoted by the NPS Administrative History); the sheet count is a carried conflict (see R12.001.h).',
              'documented', 'supported', [
                  C('NPS-ADHI', 'Part of the work has been enlarged to 1 inch to 400 feet, and also 1 inch to 200 feet, which is the scale of the large Warren map, 12 feet square.', note='quoting the Commission\'s report'),
                  C('NPS-ADHI', 'On November 16 the commissioners issued their first formal report of the progress at Gettysburg', note='the year is that of the preceding sentence of the same passage'),
                  C('NPS-ADHI', 'The commissioners met for the first time on May 31, 1893', note='dates the Commission\'s first year'),
              ]),
            S('R12.002.d', 'crawl_policy', 'catalog.archives.gov disallows all crawling for all crawlers; the catalog item page was therefore not requested.',
              'documented', 'supported', [
                  C('ROBOTS-CATALOG-ARCHIVES', 'Disallow: /', note='robots.txt of catalog.archives.gov, fetched 2026-11-13 (69 bytes, same body as on 2026-11-04)'),
              ]),
            BLK('R12.002.e', 'naid_and_reduced_copies', 'The NARA identifier of the Warren survey is NAID 102279222; reduced copies exist, among them E 105-4 "Final Proof" annotated by Warren.',
                'NARA blog (Unwritten Record, 3 July 2018): E 81 links to catalog.archives.gov/id/102279222; E 105-4 is the reduced "Final Proof" copy annotated by Warren.'),
            BLK('R12.002.f', 'nps_72_dpi', 'NPS (Musselman 2001) found only a 72 dpi copy at the Archives, too fuzzy, and used the 1886 tracing scanned at 300 dpi by LOC instead.',
                'Musselman, Spatial Odyssey 2001 (Wayback copy): archives staff and vendors could only supply a 72 dpi copy.'),
            S('R12.002.g', 'scan_status', 'No full-resolution scan of the NARA sheets is in hand; the readable Warren data are the LOC 1:12,000 reduction (99448794) and the LOC tracing extract (99446453).',
              'open_gap', 'unsupported', [], note='Obtaining NARA scans needs a request or account (owner-only act) and the catalog is robots-disallowed.'),
        ],
        stays_unsupported=[
            'NAID 102279222, the E 105-4 "Final Proof" copy and NARA staff statements: only on blocked pages',
            'the "72 dpi" statement and the 300 dpi LOC scan (Musselman 2001): only on the Wayback copy',
            'scan resolution and licence of the NARA scans (not stated on any page read; US Government record, public domain inferred)',
        ],
        conflicts_carried=['Sheet count of the large Warren map: 4 / 25 / 20 (see R12.001.h); size 12 ft square (Commission 1893) vs about 13 ft (xyHt)'],
        register_refs=['sources-a-EG-01', 'EG-0021'],
        blocked_host=[
            HOST('NARA-blog', 'https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/', 'NARA "Unwritten Record", "Mapping the Battle of Gettysburg", 3 July 2018 (the PDF prints ?p=20249, which redirects here): the paragraph on E 81 (NAID 102279222), on E 105-4, E 105a-1, E 105a-2, E 73 and E 72 (1) and every caption NAID. Copy captions and sentences verbatim.'),
            HOST('NARA-catalog', 'https://catalog.archives.gov/id/102279222', 'NARA catalog item (robots.txt Disallow: / for every crawler): only an owner-side request or a NARA account may open it; if the owner opens it, record the scan resolution, the sheet list and the rights statement.', status='robots_disallowed'),
            HOST('Musselman-2001', 'http://web.archive.org/web/20050212120332/http://www.nps.gov:80/gis/gisday/gallery2001/GWS/musselman.htm', 'Curtis Musselman, "Using GPS and GIS Tools in the Rehabilitation of Cultural Landscapes: Gettysburg\'s Codori Farm Lane Project", Spatial Odyssey 2001, section CULTURAL LANDSCAPE FEATURE DOCUMENTATION: the sentences on the 72 dpi Archives copy and the 300 dpi LOC scan. (The live nps.gov URL answered 404 on 2026-11-13.)'),
        ],
        product_consequence=['terrain_sources.json row 2: status stays "gap" for the scans; the NAID is unverified; add the NPS Administrative History as the reachable source for "12 feet square" and the E 81 holding from LOC 99448794'],
        lookups=[
            'catalog.archives.gov/robots.txt: 200, a single rule "Disallow: /" for all crawlers (2026-11-13); no catalog page requested',
            'unwritten-record.blogs.archives.gov and web.archive.org robots.txt: proxy refusal (2026-11-13, 2026-11-16)',
            'archive.org/wayback/available for the Musselman URL: HTTP 429 (2026-11-13); the snapshot itself would be on web.archive.org, which the proxy refuses',
        ],
        changes_vs_previous=[
            'E 81 holding, 1868-69 dates, 1873 revision and 200 ft/inch now rest on LOC 99448794 and the NPS documents (first round: NARA blog)',
            'new: "12 feet square" (NPS Administrative History quoting the 1893 report); NPS citation "Section E81-1, RG 77"',
            'the blog statements and the 72 dpi remark are moved to blocked_host',
        ],
        notes='The first round gave status "gap"; the gap (no scans) stands, the identity facts are now corroborated from reachable sources.',
    ))

    # ------------------------------------------------------------------ R12.003
    rows.append(dict(
        id='R12.003',
        verdict='unsupported',
        pdf_claim='Warren / War Department "Map of the battle-field of Gettysburg" 1895 (Julius Bien), David Rumsey (List No. 1780.095): printed atlas plate; contours and spot heights; zoomable viewer, no direct download; 1:23,000, 43 x 70 cm; noncommercial reuse only, commercial use needs permission from Cartography Associates; the 1895 Atlas-era product, not the 1868 survey sheet; small scale; R3.',
        corrected_claim=(
            'Unsupported: the Rumsey record cannot be read from here (davidrumsey.com answered 404 on 2026-11-04 on the owner\'s machine and is refused by the proxy now), so the list number, scale, size and licence stay PDF statements. '
            'What reachable sources do say: the Atlas to accompany the Official Records (lithographs by Julius Bien & Co., IA metadata) has its Gettysburg battlefield maps on plate 95 (OCR plate list and index); '
            'the PDF itself types the Rumsey item "Printed atlas plate" and the list number ends .095, so an identification with Atlas plate 95 is a reasonable inference (tier inferred) but is not documented and is NOT asserted. '
            'The LOC Civil War Maps collection holds no separate 1895 "Map of the battle-field of Gettysburg" by Bien under the queries run (contributor Bien, Julius: three items, none of 1895; Gettysburg National Military Park Commission: eleven items, earliest 1898).'),
        sub_claims=[
            BLK('R12.003.a', 'rumsey_record', 'David Rumsey record "Map of the battle-field of Gettysburg" 1895 (Julius Bien), List No. 1780.095: 1:23,000, 43 x 70 cm, zoomable viewer only.',
                'First round: https://davidrumsey.com/maps1100223-26914.html returned HTTP 404 on davidrumsey.com and www.davidrumsey.com (2026-11-04); the Rumsey search paths are robots-disallowed.'),
            BLK('R12.003.b', 'rumsey_licence', 'Noncommercial reuse only; commercial use needs permission from Cartography Associates.', 'PDF statement; the record page was never read.'),
            S('R12.003.c', 'atlas_lithographer', 'The Atlas to accompany the Official Records is described by Internet Archive as "Lithographs by Julius Bien & Co. Lith. N.Y"; its plate 95 is headed "Gettysburg Campaign. June 3-August 1, 1863. - Cumberland Mountain Gaps."',
              'documented', 'supported', [
                  C('IA-ATLAS-META', 'Lithographs by Julius Bien & Co. Lith. N.Y', locator='metadata.description[1]'),
                  C('IA-ATLAS-TXT', 'PLATE 95. Gettysburg Campaign. June 3-August 1, 1863. — Cumberland Mountain Gaps.', locator='list of plates'),
              ], note='This supports the Atlas plate as a Bien lithograph; it does not identify the Rumsey item.'),
            S('R12.003.d', 'identity_with_atlas_plate_95', 'The Rumsey item (typed "Printed atlas plate" by the PDF, list number 1780.095) may be Atlas plate 95.',
              'inferred', 'derived', [], computation='Pattern: PDF row 3 type "Printed atlas plate"; list number suffix .095; Atlas plate 95 carries the Gettysburg battlefield maps (R12.012). Not documented: needs the Rumsey record text (blocked).'),
            S('R12.003.e', 'loc_search_negative', 'In the LOC Civil War Maps collection, contributor "Bien, Julius" (with q=gettysburg) lists three items: 99447495 (cavalry field, 1863), lva0000068 (Bachelder map, 1959) and lva0000067 (Bachelder map, 1876); the Gettysburg National Military Park Commission query lists eleven items dated 1898 to 1921, none of 1895.',
              'documented', 'supported', [
                  C('LOC-CWM-BIEN', 'pagination.of: 3', locator='collection query, contributor Bien, Julius'),
                  C('LOC-CWM-BIEN', 'results[0].id: http://www.loc.gov/item/99447495/'),
                  C('LOC-CWM-BIEN', 'results[0].title: Field of cavalry operations east of Gettysburg, July 2nd & 3rd 1863'),
                  C('LOC-CWM-BIEN', 'results[1].id: http://www.loc.gov/item/lva0000068/'),
                  C('LOC-CWM-BIEN', 'results[1].date: 1959-01-01'),
                  C('LOC-CWM-BIEN', 'results[2].id: http://www.loc.gov/item/lva0000067/'),
                  C('LOC-CWM-BIEN', 'results[2].date: 1876-01-01'),
                  C('LOC-CWM-GNMPC', 'pagination.of: 11', locator='collection query, contributor Gettysburg National Military Park Commission'),
                  C('LOC-CWM-GNMPC', 'results[0].date: 1898'),
                  C('LOC-CWM-GNMPC', 'results[3].date: 1921'),
              ], note='A negative on two collection queries, not on all of LOC; the dates of the eleven GNMP Commission items were read off the saved list (1898, 1901, 1900, 1921, 1898, 1898, 1914, 1916, 1903, 1910, 1913).'),
        ],
        stays_unsupported=['Rumsey list number 1780.095, scale 1:23,000, 43 x 70 cm, licence: PDF only', 'identity of the Rumsey item with Atlas plate 95: inference only'],
        register_refs=['sources-a-EG-03'],
        blocked_host=[
            HOST('Rumsey', 'https://davidrumsey.com/maps1100223-26914.html', 'Rumsey record for List No. 1780.095: title, date, author, scale, size, rights statement; whether the image is Atlas plate 95. (www.davidrumsey.com search paths are robots-disallowed; the host is refused by the proxy.)'),
        ],
        product_consequence=['terrain_sources.json row 3: stays "not used"; keep status failed_lookup; do not build from it (small scale, Atlas-era reduction, adds no independent root)'],
        lookups=['davidrumsey.com and www.davidrumsey.com robots.txt: proxy refusal (2026-11-13, 2026-11-16)',
                 'LOC collection query contributor Bien, Julius: 200 on retry (2026-11-16; 503 on 2026-11-13)',
                 'LOC collection query contributor Gettysburg National Military Park Commission: 200 (2026-11-16), 11 items'],
        changes_vs_previous=['new: inference that the Rumsey item is Atlas plate 95 (tier inferred, not asserted)', 'new: LOC Bien and GNMPC queries show no 1895 Bien print of the battlefield'],
        notes='No gate depends on this row.',
    ))

    # ------------------------------------------------------------------ R12.004
    rows.append(dict(
        id='R12.004',
        verdict='partially_supported',
        pdf_claim='Bachelder, "Map of the battle field of Gettysburg, July 1st, 2nd, 3rd 1863" (1876, Office of the Chief of Engineers), University of Minnesota (UMedia item p16022coll230:1208): printed map; troop positions by day; BTAA/MIT record; JPEG; scale unstated, 72 x 68 cm; contact the provider; not confirmed georeferenced; Warren himself criticized Bachelder\'s maps for poor depiction of topography; positions, not terrain; R2 for positions, weak for terrain.',
        corrected_claim=(
            'Confirmed for the LOC copy (99447491): Bachelder, Boston 1876, 3 maps, col., each 74 x 71 cm, scale 1:12,000; "Topography engraved by Julia Bien ... Positions & lettering by Louis E. Neuman ... Printed by Endicott & Co."; '
            '"reduced from one on a scale of 200 feet to the inch ... The survey was ordered by Brevet Major General A. A. Humphreys ... and conducted under Brevet Major General G. K. Warren"; spot elevations and contours "given for every change of 4 feet in elevation"; free to use (no Rights Advisory). '
            'JP2 of sheet a is 8292 x 10756 px (21,987,173 bytes), TIFF master 267,566,812 bytes. The LOC record carries a machine date 1879 against the 1876 imprint (the NPS Administrative History bibliography also dates the map 1876). '
            'Because the topography is Warren\'s reduced, this is a second reader of Warren\'s contours, not a second root. Not read: the University of Minnesota / BTAA record (72 x 68 cm, scale unstated) and Warren\'s criticism of the map (NARA blog): both stay blocked.'),
        sub_claims=[
            S('R12.004.a', 'identity', 'LOC 99447491: "Map of the battle field of Gettysburg. July 1st, 2nd, 3rd, 1863", Bachelder, Boston, John B. Bachelder, 1876; 3 maps, col., each 74 x 71 cm ("First day\'s battle. Second day\'s battle. Third day\'s battle."); topography engraved by Julia Bien, positions and lettering by Louis E. Neuman, printed by Endicott & Co.',
              'documented', 'supported', [
                  C('LOC-99447491', 'Map of the battle field of Gettysburg. July 1st, 2nd, 3rd, 1863', locator='item.title'),
                  C('LOC-99447491', 'Boston, John B. Bachelder, 1876.', locator='item.created_published'),
                  C('LOC-99447491', '3 maps, col., each 74 x 71 cm.', locator='item.medium'),
                  C('LOC-99447491', '"Topography engraved by Julia Bien . . . N.Y. Positions & lettering by Louis E. Neuman . . . N.Y."', locator='item.notes[0]'),
                  C('LOC-99447491', 'The maps are entitled: First day\'s battle. Second day\'s battle. Third day\'s battle.', locator='item.notes[2]'),
                  C('LOC-99447491', 'item.library_of_congress_control_number: 99447491', locator='LCCN'),
              ]),
            S('R12.004.b', 'base_survey_and_scale', 'The map is reduced from the 200 ft to the inch Warren survey (ordered by Humphreys, conducted under Warren); scale 1:12,000; spot elevations and contours given for every change of 4 feet; so it is not an independent terrain root.',
              'documented', 'supported', [
                  C('LOC-99447491', '"The map is reduced from one on a scale of 200 feet to the inch, deposited in the Archives of the office of the Chief of Engineers. The survey was ordered by Brevet Major General A. A. Humphreys, Chief of Engineers, and conducted under Brevet Major General G. K. Warren, Major of Engineers."', locator='item.notes[3]'),
                  C('LOC-99447491', 'Scale 1:12,000.', locator='item.notes[7]'),
                  C('LOC-99447491', 'An extremely detailed topographic map with spot elevations and contours "given for every change of 4 feet in elevation."', locator='item.notes[4]'),
                  C('LOC-99448794', 'Detailed topographic map subsequently used as the base for John B. Bachelder\'s "Map of the Battle Field of Gettysburg" (see entry nos. 325 and 326)', locator='LOC 99448794 item.notes[1]'),
              ]),
            S('R12.004.c', 'image_and_rights', 'Sheet a: JP2 8292 x 10756 px, 21,987,173 bytes; TIFF master 267,566,812 bytes; free to use unless a Rights Advisory is present (none), credit line Library of Congress, Geography and Map Division.',
              'documented', 'supported', [
                  C('LOC-99447491', 'width: 8292', locator='resources[0] JP2 width'),
                  C('LOC-99447491', 'height: 10756', locator='resources[0] JP2 height'),
                  C('LOC-99447491', 'size: 21987173', locator='resources[0] JP2 bytes'),
                  C('LOC-99447491', 'size: 267566812', locator='resources[0] TIFF bytes'),
                  C('LOC-99447491', LOC_RIGHTS, locator='item.rights'),
              ]),
            S('R12.004.d', 'date_conflict', 'LOC machine date field says 1879; the imprint says 1876; the NPS Administrative History bibliography lists the map as 1876.',
              'documented', 'conflict', [
                  C('LOC-99447491', 'item.item.date: 1879', locator='item.date (machine field)'),
                  C('LOC-99447491', 'Boston, John B. Bachelder, 1876.', locator='item.created_published'),
                  C('NPS-ADHI', '"Map of the Battle Field of Gettysburg. July 1st, 2nd, 3rd, 1863." 1876.', note='Unrau 1991, bibliography, MAPS (copies on file in the GNMP Library)'),
              ], note='Print 1876; 1879 is a catalogue field. Not a terrain question.'),
            BLK('R12.004.e', 'umn_record', 'University of Minnesota (UMedia p16022coll230:1208) copy: 72 x 68 cm, scale unstated, "contact the provider", bounding box in the BTAA/MIT record.',
                'PDF statement; the BTAA/MIT record (geodata.libraries.mit.edu) was robots-disallowed in the 2026-10-20 probe and was not read.'),
            BLK('R12.004.f', 'warren_criticism', 'Warren criticized the Bachelder map for not representing the topography well (annotation on NARA E 105a-2, NAID 176246316).',
                'NARA blog: Warren\'s annotation on the Bachelder map faults its depiction of topography.'),
        ],
        stays_unsupported=['UMN record: dimensions, scale, rights', 'Warren\'s annotation (NARA E 105a-2) on the Bachelder map: only on the NARA blog'],
        conflicts_carried=['Date: imprint 1876 vs LOC machine date 1879 (NPS bibliography 1876)', 'Sheet size: LOC 74 x 71 cm per sheet vs PDF (UMN) 72 x 68 cm: different copies or measurement; not reconciled'],
        register_refs=['sources-a-EG-03'],
        blocked_host=[
            HOST('UMN-BTAA', 'https://geodata.libraries.mit.edu/record/gisogm:edu.umn:3cfe346bdd99', 'BTAA/MIT geodata record of the University of Minnesota copy: dimensions, scale, rights, bounding box (host refused by the proxy; robots-disallowed in the 2026-10-20 probe).'),
            HOST('NARA-blog', 'https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/', 'The caption and paragraph on E 105a-2 (NAID 176246316): Warren\'s annotation criticizing Bachelder\'s depiction of topography; copy verbatim.'),
        ],
        product_consequence=['terrain/troopmaps: the three Bachelder sheets stay a second reader of the Warren contours (same root); troop positions feed R05/R11 only', 'terrain_sources.json row 4: add the date conflict (1876 imprint vs 1879 field)'],
        lookups=['geodata.libraries.mit.edu robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['new: NPS Administrative History bibliography dates the map 1876 (second source for the imprint year)', 'LOC dimensions and image sizes re-matched in the saved record of 2026-11-13'],
        notes='',
    ))
    return rows
