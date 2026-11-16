"""rows R12.012 - R12.016 (Atlas plates, NPS-cited maps, NPS GIS layers, Knowles reconstruction, NPS rehabilitation program)"""
from rowlib import C, S, BLK, HOST


def ROWS(prev):
    rows = []

    # ------------------------------------------------------------------ R12.012
    rows.append(dict(
        id='R12.012',
        verdict='confirmed',
        pdf_claim='OR Atlas (175 plates) on eHistory: plates; official atlas plates; https://ehistory.osu.edu/books/official-records/atlas; images; varies; public domain (pre-1929); "Which plates cover Gettysburg was not looked up"; R3.',
        corrected_claim=(
            'Confirmed, and the gap "which plates cover Gettysburg" is closed from the Atlas\'s own index (OCR text of the Internet Archive scan atlastoaccompany00unit, "Atlas to accompany the official records of the Union and Confederate armies", Washington G.P.O., catalogue date 1891, lithographs by Julius Bien & Co.). '
            'The list of plates ends with "PLATE 175 ... Corps flags, badges, etc." (175 plates). The index entry "Battle of, July 1-3, 1863" reads 28,4; 40,2; 43,1,2; 73,[digit unreadable in the OCR]; 95,1,2, and "Gettysburg Campaign, June 3-Aug. 1, 1863: Army of Northern Virginia, routes and positions" reads 43,7; 116,2. '
            'The author index credits plate 95 map 1 to Warren (also 40,2) and to W. H. Chase, E. A. Chase, Frink, Hill, Hinman, Morrison, Trill, Turtle, Wanoleben, Dager and Davis (OCR spellings), plate 95 map 2 to Bachelder (OCR "9S.2") and F. O. Maxson (July 3). '
            'New from the NPS: the First Day CLR reproduces "Post-battle map based on survey by Major E. B. Cope" from the Atlas, plate XL (= plate 40), so plate 40 map 2 is the Cope-based map (credited to Warren in the Atlas index). '
            'Clarification: the IA catalogue date is 1891, but the OCR plate list runs to plate 175, so the scan carries the completed Atlas plan; which printing each plate is, and whether plate 95 map 1 equals the 1868-69 Warren sheet at the scale shown, remain unread (no plate image was viewed). eHistory (ehistory.osu.edu) is refused by its own bot block; the IA scan is used instead.'),
        sub_claims=[
            S('R12.012.a', 'scan_identity', 'Internet Archive item atlastoaccompany00unit is the "Atlas to accompany the official records of the Union and Confederate armies" (Washington [D.C.] : G.P.O.; catalogue date 1891; "Lithographs by Julius Bien & Co. Lith. N.Y"; 226 images).',
              'documented', 'supported', [
                  C('IA-ATLAS-META', 'title: Atlas to accompany the official records of the Union and Confederate armies', locator='metadata.title'),
                  C('IA-ATLAS-META', 'date: 1891', locator='metadata.date'),
                  C('IA-ATLAS-META', 'Lithographs by Julius Bien & Co. Lith. N.Y', locator='metadata.description[1]'),
                  C('IA-ATLAS-META', 'imagecount: 226', locator='metadata.imagecount'),
              ]),
            S('R12.012.b', 'plate_count', 'The Atlas has 175 plates: the list of plates ends with plate 175 "Corps flags, badges, etc."',
              'documented', 'supported', [
                  C('IA-ATLAS-TXT', 'PUTE 175 Corps flags, badges, etc.', note='OCR of "PLATE 175"'),
                  C('IA-ATLAS-TXT', 'MAPS, SKETCHES, ETC., PERTAINING TO THE SEVERAL VOLUMES', note='the heading that follows the list of plates'),
              ]),
            S('R12.012.c', 'gettysburg_battle_plates', 'The Atlas index lists the battle of Gettysburg (July 1-3, 1863) on plates 28 (map 4), 40 (map 2), 43 (maps 1 and 2), 73 (one map; the sub-number is unreadable in the OCR) and 95 (maps 1 and 2).',
              'documented', 'supported', [
                  C('IA-ATLAS-TXT', 'Battlo of, July 1-3, 1863 28, 4 ; 40,2; 43,1,2; 73,0; 95,1,2', locator='geographical index, "Gettysburg, Pa."'),
                  C('IA-ATLAS-TXT', 'Gettysburg, Pa 25,0; 27,1; 28,4; 40,2; 42,5; 43,1,2,7;', locator='geographical index, other Gettysburg maps'),
              ], note='The OCR reads "73,0": the digit after the comma is not a reliable reading (open gap R12.012.h).'),
            S('R12.012.d', 'gettysburg_campaign_plates', 'The Gettysburg Campaign, June 3-August 1, 1863 (Army of Northern Virginia, routes and positions) is on plates 43 (map 7) and 116 (map 2).',
              'documented', 'supported', [
                  C('IA-ATLAS-TXT', 'Gettysburg Campaign, June 3- Aug. 1,1863:', locator='geographical index'),
                  C('IA-ATLAS-TXT', 'routes and positions... 43,7; 116,2', locator='geographical index'),
              ]),
            S('R12.012.e', 'plate_95_headings_and_credits', 'Plate 95 is headed "Gettysburg Campaign. June 3-August 1, 1863. - Cumberland Mountain Gaps."; the author index credits Warren (also 40,2) and, for plate 95 map 1, W. H. Chase, E. A. Chase, Frink, Hill, Hinman, Morrison, Trill, Turtle, Wanoleben, Dager and Davis; Bachelder (OCR 9S.2) and Maxson for map 2.',
              'documented', 'supported', [
                  C('IA-ATLAS-TXT', 'PLATE 95. Gettysburg Campaign. June 3-August 1, 1863. — Cumberland Mountain Gaps.', locator='list of plates'),
                  C('IA-ATLAS-TXT', 'Warren, Gouvemeur K. : Briatoo(Vo.) Campaign', locator='author index, Warren'),
                  C('IA-ATLAS-TXT', 'Gottysbnrg, Pa., July 1-3, 1863 40,2; 95,1', locator='author index, Warren (Gettysburg entry)'),
                  C('IA-ATLAS-TXT', 'Chase, William H. . Gettysburg, Va., July 1-3,18113 95, 1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Chase, Edwin A. : Gettysburg, I\'u., July 1-3,1863 95, 1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Frink, Henry A. : Gettysburg, Pn., July 1-3, 1863 95,1', locator='author index'),
                  C('IA-ATLAS-TXT', 'HiU, W. F. : Gettysburg, Pa,, July 1-3, 1863 95,', locator='author index'),
                  C('IA-ATLAS-TXT', 'Hinman, Frederick A. : Gettyabnrg, l\'a., July 1-3. 1863 95,', locator='author index'),
                  C('IA-ATLAS-TXT', 'Morrison, E. C. : Gettysburg, Pa., July 1-3, 1863 95,1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Trill, C. P. : Gettysburg, Pu., July 1-3,1803 95,1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Turtle, Thomas: Gottysbnrg, Pa., July 1-3, 1803 95,1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Wanoleben, W. A. : Gettysburg, Pa., July 1-3, 1863 95,1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Dagor, John H. : Gettysburg, Pn., July i-:i, 1803 95, 1', locator='author index (Dager)'),
                  C('IA-ATLAS-TXT', 'Davla, C. B. : Gettysburg, Pa., July 1-ii, mui 95,1', locator='author index (Davis)'),
                  C('IA-ATLAS-TXT', 'Bacholdor, Joliu B. : Gettysburg, Pa., July 1-3,1800 9S.2', locator='author index (Bachelder)'),
                  C('IA-ATLAS-TXT', 'Maxson, Frank O. : Gettysburg, Po., July 3, 1863 95, 2', locator='author index'),
              ], note='OCR spellings kept as printed in the text layer; "9S.2" is read as 95,2 (three index passages agree on plate 95 for the others).'),
            S('R12.012.f', 'plate_40_is_cope_based', 'Plate 40 (map 2) of the Atlas carries the Cope-based post-battle map: the NPS First Day CLR reproduces "Post-battle map based on survey by Major E. B. Cope" from "Atlas to Accompany the Official Records ... 1895, Plate XL".',
              'documented', 'supported', [
                  C('NPS-CLR-1STDAY', 'Post-battle map based on survey by Major E. B. Cope showing topography of the 1st Corps field.'),
                  C('NPS-CLR-1STDAY', '1895, Plate XL, annotated by SUNY ESF'),
              ], note='Atlas plate XL = plate 40 (Roman numeral); the index lists Gettysburg on 40,2 and credits Warren; the NPS caption names Cope. The Atlas index credit and the NPS caption are both carried.'),
            S('R12.012.g', 'other_plate_headings', 'The list of plates puts "Gettysburg Campaign" on plates 28, 40, 43, 73 and 116 as well.',
              'documented', 'supported', [
                  C('IA-ATLAS-TXT', 'Gettysburg Campaign, June 3-August 1, 1863. — Lewisburg Pike, Tenu, April 4, 1863.', locator='plate 28'),
                  C('IA-ATLAS-TXT', 'Petersburg, Va., 1863. — Gettysburg Campaign, June 3- August 1, 1863.', locator='plate 40'),
                  C('IA-ATLAS-TXT', 'Gettysburg Campaign, June 4-August 1, 1863. — Atlanta Campaign', locator='plate 43'),
                  C('IA-ATLAS-TXT', 'PLATE 73. Northern Alabama and Middle Tennessee Campaign, November 14, 1864-January 23, 1865.— Gettysburg Campaign, June 3-August 1, 1863,', locator='plate 73'),
                  C('IA-ATLAS-TXT', 'PLATE 116. McDowell, Va., May 8, 1862. — Gettysburg Campaign, June 3-August 1. 1865.', locator='plate 116 (OCR year 1865 for 1863)'),
              ]),
            S('R12.012.h', 'plate_73_submap_digit', 'Plate 73 has one Gettysburg map; its sub-number reads "0" in the OCR (an OCR artefact).',
              'open_gap', 'unsupported', [], note='A page image of the index would settle it (the IA page images are in a 147 MB jp2 zip not fetched here).'),
            S('R12.012.i', 'plate_content_not_read', 'What each Gettysburg plate shows (scale, whether plate 95 map 1 reproduces the 1868-69 Warren survey sheet) is not stated in the text read; no plate image was viewed.',
              'open_gap', 'unsupported', [], note='Plate 95 is at best a second reader of Warren\'s contours (same root).'),
            BLK('R12.012.j', 'ehistory_listing', 'The eHistory page https://ehistory.osu.edu/books/official-records/atlas lists the 175 plates as images, public domain (pre-1929).',
                'PDF statement; ehistory.osu.edu answered HTTP 403 (its own bot block) on 2026-11-04; the page was not read.'),
        ],
        stays_unsupported=['plate 73 sub-number; plate contents and scales; whether plate 95 = the Warren 1868-69 sheet', 'the eHistory listing (bot block)'],
        conflicts_carried=['Plate 40 map 2: Atlas index credit Warren vs NPS caption "survey by Major E. B. Cope" (both documented; same map, two credits)'],
        register_refs=['sources-a-EG-07'],
        blocked_host=[HOST('eHistory', 'https://ehistory.osu.edu/books/official-records/atlas', 'The eHistory Atlas page (plate list and images): only needed if the IA scan\'s plate images are not used; answers 403 from its own bot block; do not retry.', status='blocked_bot_block')],
        product_consequence=['terrain_sources.json row 12: record plates 28/40/43/73/95/116 for Gettysburg and that plate 40 map 2 is the Cope-based map (NPS); the plate images are not yet viewed', 'plate 95 map 1 may be viewed from the IA scan (page images) as a second reader of Warren (R12.003 inference)'],
        lookups=['archive.org advanced search for the Atlas: 200 (2026-11-16): atlastoaccompany00unit plus four 1895 title/contents pages', 'archive.org metadata and djvu text: 200 (2026-11-13)'],
        changes_vs_previous=['new: plate count 175 (list of plates), plate headings, plate 40 = Cope-based map (NPS)', 'clarified: the IA record is dated 1891 but its plate list is complete to plate 175'],
        notes='OCR is noisy; every quoted passage was matched in the saved text (offsets are characters in tmp/sources-a/fetch/ia_atlas_txt.txt).',
    ))

    # ------------------------------------------------------------------ R12.013
    rows.append(dict(
        id='R12.013',
        verdict='corrected',
        pdf_claim='NPS-cited War Department and Gettysburg Battlefield Memorial Association maps of 1863, 1868 and 1872: maps cited as key sources by NPS; the cartographic base of the park\'s own rehabilitation; "The page does not give item identifiers. The 1868 item is presumably the Warren survey. Not confirmed."; R2.',
        corrected_claim=(
            'The NPS statement is verified verbatim: "Our most important mapping resources included Department of War and Gettysburg Battlefield Memorial Association maps prepared in 1863, 1868, and 1872". '
            'The identification is now partly documented from other NPS texts. 1868: the General Management Plan names "Warren (1868)" and the Record of Treatment lists the "1868 Warren Map" (the Warren survey of 1868-69, revised 1873). '
            '1863 and 1872: the GMP says "Bachelder (1863 and 1872)"; the Record of Treatment\'s list of historic imagery references names "1863 Cope Map", "1863 Bachelder Map", "1863 Elliott Map" and "1872 Topographical Survey Map" (the last cited as "GETT, Sheet A3", maker not stated). '
            'So the three dates correspond to NPS\'s own set of historic maps, but which 1863 map (Cope, Bachelder or Elliott) and whose 1872 survey the rehabilitation page means is NOT stated: that stays inferred. The first-round candidate "1863 = Cope/Hewitt print (LOC 99447498)" is one of three, not the single candidate. '
            'The page also carries "Last updated: February 26, 2015".'),
        sub_claims=[
            S('R12.013.a', 'nps_statement', 'The NPS Battlefield Rehabilitation page says the most important mapping resources included Department of War and Gettysburg Battlefield Memorial Association maps prepared in 1863, 1868 and 1872, as well as other maps by the War Department and the NPS; it gives no item identifiers; last updated February 26, 2015.',
              'documented', 'supported', [
                  C('NPS-REHAB-PAGE', 'Our most important mapping resources included Department of War and Gettysburg Battlefield Memorial Association maps prepared in 1863, 1868, and 1872, as well as other maps developed by the War Department and the NPS that document conditions at various times.'),
                  C('NPS-REHAB-PAGE', 'Last updated: February 26, 2015'),
              ]),
            S('R12.013.b', 'nps_1868_is_warren', 'The 1868 item is the Warren survey: the GMP lists "Warren (1868)" among the important maps; the Record of Treatment lists the "1868 Warren Map".',
              'documented', 'supported', [
                  C('NPS-GMP-1999-V1', 'Important maps included those developed by Bachelder (1863 and 1872), Warren (1868) and others to document the field at or near the time of the battle'),
                  C('NPS-CLR-ROT-V2', 'Historic Imagery References ☐ 1868 Warren Map ☐ 1863 Cope Map ☐ 1863 Bachelder Map ☐ 1863 Elliott Map ☐ 1872 Topographical Survey Map ☐ Gettysburg National Park Commission (GNPC) Drawings'),
              ], note='The Warren survey was made in 1868-69 and revised in 1873 (LOC 99448794).'),
            S('R12.013.c', 'nps_1863_1872_candidates', 'The 1863 maps in the NPS set are the Cope, Bachelder and Elliott maps; the 1872 map is the "1872 topographical survey map" (GETT, Sheet A3), credited by the GMP to Bachelder ("Bachelder (1863 and 1872)").',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'Forney Market Orchard. Detail of the 1872 topographical survey map, 1872 (GETT, Sheet A3).'),
                  C('NPS-CLR-ROT-V1', 'the battlefeld landscape research team examined other maps prepared shortly after the battle by E. B. Cope, S. G. Elliott, and John B. Bachelder'),
              ], note='What is documented is the NPS list; the match of each NPS-page date to one of these maps is not stated by the NPS.'),
            S('R12.013.d', 'match_dates_to_items', 'The "War Department" 1863 map of the rehabilitation page is the Cope map (made on Meade\'s detail, October 1863), the GBMA 1872 map is the 1872 topographical survey, and the 1868 map is Warren\'s.',
              'inferred', 'derived', [], computation='Reasoning: Cope\'s map was made on the army\'s detail (NPS Administrative History); the GBMA existed 1864-1895; the 1872 map\'s maker is unnamed in every text read. Not asserted anywhere in product text.'),
            S('R12.013.e', 'identity_of_1872_map', 'Who made the "1872 topographical survey map" (GETT, Sheet A3) and for whom.', 'open_gap', 'unsupported', [], note='GMP credits "Bachelder (1863 and 1872)"; the Record of Treatment gives no maker. The Adams County atlas of 1872 (Lake) is a different 1872 map.'),
        ],
        stays_unsupported=['which 1863 map and whose 1872 map the NPS page means', 'maker of the 1872 topographical survey map'],
        register_refs=['sources-a-EG-02'],
        blocked_host=[],
        product_consequence=['terrain_sources.json row 13: state "1868 = Warren (GMP, Record of Treatment)"; list the NPS set (Warren 1868, Cope 1863, Bachelder 1863, Elliott 1863, 1872 topographical survey) instead of the single candidate Cope/Hewitt; keep status inferred for the mapping of dates to items'],
        lookups=['NPS rehabilitation page fetched 2026-11-13 21:57 UTC (200) and a second copy by another workstream 2026-11-13 19:00 UTC (same text)'],
        changes_vs_previous=['new: GMP "Warren (1868)" and "Bachelder (1863 and 1872)"; Record of Treatment list of historic maps', 'new: the page\'s own "Last updated" stamp'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.014
    rows.append(dict(
        id='R12.014',
        verdict='partially_supported',
        pdf_claim='NPS park GIS 1863 layers (Curtis Musselman, park GIS): vector GIS of historic roads, lanes, fence lines, property boundaries and buildings "as they stood in 1863", with 1895, 1927 and 1993 periods; georeferencing: the LOC 1886 tracing scanned at 300 dpi (a 72 dpi NARA copy was too blurry); affine registration on nine control points, then rubbersheeting; large-scale features (woods, fields, orchards, roads) and small-scale features (fences, lanes, trees) digitized; layers supplied to Knowles; scale not stated; no public download found, probably request-only.',
        corrected_claim=(
            'Partly supported from NPS documents that are local. Documented: the park\'s historians prepared historical base maps for the eras 1863, 1895, 1927 and 1993, mapped on a common scale and digitized, showing woodlands, woodlots, thickets, orchards, open fields, fences, roads and lanes, railways, waterways and the town (General Management Plan 1999); '
            'the 1863 "period plans" are 32 sheets (25 hand-drawn plus 7 overlapping) drawn at 1 inch = 200 feet on the 1868 Warren maps by Kathy Georg Harrison with Winona Peterson, whose overlap and gaps "later hampered the park\'s ability to stitch the maps together in their Geographic Information System"; '
            'the park used "Kathy G. Harrison\'s 1863 period plan, GIS data" to guide rehabilitation (Record of Treatment); Curt Musselman is the park cartographer / GIS specialist (GMP, First Day CLR, Record of Treatment). '
            'Blocked, not re-asserted: the 2001 paper\'s registration method (300 dpi LOC scan of the 1886 tracing, nine control points, affine then rubbersheeting, 72 dpi NARA copy), the 1-ft/1:600 existing-conditions maps and the 1996 orthophoto, and the transfer of layers to Knowles (xyHt). '
            'Still no source states that the 1863 layers are request-only; no public download was found in the reachable corpus (negative, not proof). The owner-only step of asking the NPS GIS office stays open (register sources-a-EG-04).'),
        sub_claims=[
            S('R12.014.a', 'who', 'Curt Musselman is the Gettysburg NMP cartographer (First Day CLR, Record of Treatment I) / GIS specialist (Record of Treatment II) / "GIS Specialist and Historian" (GMP team list); the 2001 paper names him "Curtis Musselman".',
              'documented', 'supported', [
                  C('NPS-GMP-1999-V1', 'Curt Musselman, GIS Specialist and Historian'),
                  C('NPS-CLR-1STDAY', 'Curt Musselman, Cartographer'),
                  C('NPS-CLR-ROT-V1', 'Curt Musselman, Cartographer, provided access to park mapping data'),
                  C('NPS-CLR-ROT-V2', 'The pair worked with the park’s GIS Specialist, Curt Musselman, to incorporate the assessment data into GIS.'),
              ]),
            S('R12.014.b', 'periods_mapped', 'The park\'s historical base maps cover 1863 (the battle), 1895 (end of GBMA management), 1927 (end of management by veterans of the Civil War) and 1993 (aerial photography); information was mapped on base maps at a common scale and the maps were digitized.',
              'documented', 'supported', [
                  C('NPS-GMP-1999-V1', 'The eras mapped included: 1863, the battle; 1895, the end of management by the Gettysburg Battlefield Memorial Association; 1927, the end of management by veterans of the Civil War (and just prior to National Park Service management); and 1993, when aerial photography documented the current conditions.'),
                  C('NPS-GMP-1999-V1', 'The information gathered was mapped on base maps at a common scale, and the maps were digitized.'),
              ]),
            S('R12.014.c', 'features_mapped', 'Features mapped include woodlands, woodlots, thickets, orchards, open fields, fences, roads and lanes, railways, waterways and the town; mapped features were verified or corrected with period photographs and the sources of each feature were catalogued on the base maps.',
              'documented', 'supported', [
                  C('NPS-GMP-1999-V1', 'Among features mapped were woodlands, woodlots, thickets, orchards, open fields, fences, roads and lanes, railways, waterways and the town of Gettysburg.'),
                  C('NPS-GMP-1999-V1', 'Mapped features were verified or corrected using the park’s extensive collection of period photographs.'),
                  C('NPS-GMP-1999-V1', 'Sources for each feature identified were catalogued on the base maps.'),
              ]),
            S('R12.014.d', 'period_plans_1863', 'The 1863 period plans are 32 sheets (25 hand-drawn, then 7 overlapping) at 1 inch equals 200 feet on the 1868 Warren maps, by Kathy Georg Harrison with Winona Peterson; they cover most of the park except East Cavalry Field; overlap and gaps hampered stitching them in the park\'s GIS; Harrison and Peterson also made a spreadsheet per sheet (parcel names, how the feature influenced the battle, sources).',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'This efort was led by Senior Historian Kathy Georg Harrison with assistance from Cultural Resource Specialist Winona Peterson.'),
                  C('NPS-CLR-ROT-V1', 'Using the 1868 Warren maps as a base and working at a scale of 1 inch equals 200 feet, Harrison initially produced 25 hand-drawn sheets, then produced another 7 overlapping sheets for a total of 32 sheets.'),
                  C('NPS-CLR-ROT-V1', 'The 32 sheets covered most of the park area except East Cavalry Field and a few gaps within the park that were missed due to overlapping maps.'),
                  C('NPS-CLR-ROT-V1', 'the resulting overlap and gaps later hampered the park’s ability to stitch the maps together in their Geographic Information System'),
              ], note='The 1863 layers are Harrison\'s corrections of the 1868 Warren map (photographs, Bachelder, Cope and Elliott maps, accounts), i.e. an NPS interpretation, not an independent 1863 survey.'),
            S('R12.014.e', 'use_in_rehabilitation', 'The park used Harrison\'s 1863 period plan, GIS data, treatment narrative notes and historic photographs to guide rehabilitation projects; the First Day CLR cites "1863 condition maps ... edited by SUNY ESF".',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'To guide rehabilitation projects, the project team used Kathy G. Harrison’s 1863 period plan, GIS data, draft treatment narrative notes, and historic photographs.'),
                  C('NPS-CLR-1STDAY', '1863 condition maps, Gettysburg National Military Park, edited by SUNY ESF'),
              ]),
            BLK('R12.014.f', 'registration_method', 'GIS documented 1993, 1927, 1895 and 1863; the LOC 1886 tracing was scanned at 300 dpi (the NARA copy of 72 dpi was too fuzzy); registration by affine transformation on nine control points (building corners, fence intersections), then rubbersheeting; large-scale features (woods, fields, orchards, roads) and small-scale features (fences, lanes, trees).',
                'Musselman, Spatial Odyssey 2001, sections BACKGROUND and CULTURAL LANDSCAPE FEATURE DOCUMENTATION (Wayback copy of the dead nps.gov URL).'),
            BLK('R12.014.g', 'existing_conditions_maps', 'Park existing-conditions maps with 1-foot contours at 1:600 (local engineering firm) and a spring 1996 Adams County orthophoto with 2-ft pixels.',
                'Musselman 2001 (same paper).'),
            BLK('R12.014.h', 'layers_shared_with_knowles', 'Musselman shared GIS layers of roads, lanes, fence lines, property boundaries and buildings as in 1863 with Knowles (xyHt, section "From Contours to TIN").',
                'xyHt article paragraph, first-round reading.'),
            S('R12.014.i', 'public_availability', 'The 1863 GIS layers have no public download and are request-only (PDF); sending a request is an owner-only act.',
              'open_gap', 'unsupported', [], note='No reachable page offers the layers; the Record of Treatment cites the plans as park files (GETT). A negative on the reachable corpus, not proof.'),
        ],
        stays_unsupported=['registration method, control-point count and DPI statements (Wayback copy only)', 'existing-conditions 1 ft / 1:600 maps and 1996 orthophoto', 'whether and under what terms the 1863 layers are available'],
        register_refs=['sources-a-EG-04', 'EG-0021'],
        blocked_host=[
            HOST('Musselman-2001', 'http://web.archive.org/web/20050212120332/http://www.nps.gov:80/gis/gisday/gallery2001/GWS/musselman.htm', 'Spatial Odyssey 2001, "Using GPS and GIS Tools in the Rehabilitation of Cultural Landscapes: Gettysburg\'s Codori Farm Lane Project": sections BACKGROUND and CULTURAL LANDSCAPE FEATURE DOCUMENTATION (eras 1993/1927/1895/1863, 300 dpi LOC scan, nine control points, affine, rubbersheeting, 1-ft/1:600 maps, 1996 orthophoto). web.archive.org is refused by the proxy; the live URL answered 404 on 2026-11-13.'),
            HOST('xyht', 'https://www.xyht.com/professional-surveyor-archives/feature-discovering-lees-view/', 'Section "From Contours to TIN": the sentence on the GIS layers supplied by Musselman.'),
        ],
        product_consequence=['terrain/ keeps re-creating the 1863 layers from Warren; the NPS method (period plans on Warren, corrected from photographs and accounts) is documented in the Record of Treatment and may be compared with the project\'s own layers', 'terrain_sources.json row 14: replace "Not stated" scale by "period plans at 1 inch = 200 ft (32 sheets)" (Record of Treatment)'],
        lookups=['nps.gov live URL for the 2001 paper: HTTP 404 (2026-11-13)', 'archive.org/wayback/available for it: HTTP 429; web.archive.org: proxy refusal'],
        changes_vs_previous=['new: three NPS documents corroborate the periods mapped, the 32-sheet 1863 plans on Warren and the GIS use', 'method details moved to blocked_host'],
        notes='The product-visible provenance of NPS-derived layers must say "NPS interpretation of the 1868 Warren map", not 1863 survey.',
    ))

    # ------------------------------------------------------------------ R12.015
    rows.append(dict(
        id='R12.015',
        verdict='partially_supported',
        pdf_claim='Knowles et al. 2013 reconstruction (Anne Kelly Knowles lead; Dan Miller, Alex Tait for 1863 terrain; Allen Carroll; Tim Montenyohl; Judith Nielsen): GIS reconstruction, story map; digitization precedent and the only published error statement; Knowles hand-traced 4-ft contours from a 1:12,000 engraved Warren-derived map (about 1874; survey by Lt. William H. Chase under Warren), built a TIN and georectified on buildings unchanged since 1863; hilltops and ridgelines differ from the 1996 DEM by under 50 ft; creek beds and rolling ground by much more (hundreds of feet in places per the second note); the notes phrase the 50 ft figure both as elevation difference and as displacement; the data are not stated as downloadable.',
        corrected_claim=(
            'Mostly blocked. All Knowles-specific statements (team roles, hand-tracing of 4-ft contours on Mylar from a proof sheet, TIN, georectification on unchanged buildings, the 50-ft figure and its reading as horizontal displacement, 20 sections at NARA) come from pages that are refused here (xyht.com, smithsonianmag.com, spokesman.com, storymaps.esri.com) and are NOT re-asserted; the first-round resolution (50 ft is displacement, not a vertical RMS) therefore stands only as an earlier reading. '
            'Reachable sources confirm the Warren facts the article repeats: the survey of 1868-69 at 200 feet to the inch with 4-foot contours was reduced to 1:12,000 (LOC 99447491, 99448794: "Scale 1:12,000", "contours ... for every change of 4 feet"); '
            'the Atlas author index credits William H. Chase (and Edwin A. Chase) on plate 95 map 1 (the Warren survey party list), which supports a W. H. Chase connection to the survey but not his rank or his role as field director.'),
        sub_claims=[
            S('R12.015.a', 'warren_facts_repeated', 'Warren\'s survey of 1868-69 at 200 ft to the inch was reduced to the 1:12,000 map with spot elevations and contours for every change of 4 feet in elevation.',
              'documented', 'supported', [
                  C('LOC-99448794', 'The map is reduced from one on a scale of 200 feet to the inch, deposited in the Archives of the office of the Chief of Engineers.', locator='LOC 99448794 item.notes[3]'),
                  C('LOC-99448794', 'Scale 1:12,000 (1 inch equals 1000 feet).', locator='LOC 99448794 item.notes[5]'),
                  C('LOC-99447491', 'An extremely detailed topographic map with spot elevations and contours "given for every change of 4 feet in elevation."', locator='LOC 99447491 item.notes[4]'),
              ]),
            S('R12.015.b', 'chase_credit', 'William H. Chase and Edwin A. Chase are credited in the Atlas author index on plate 95 map 1 (Gettysburg, July 1-3, 1863); the text read does not state Chase\'s rank or that he directed the field work.',
              'documented', 'partial', [
                  C('IA-ATLAS-TXT', 'Chase, William H. . Gettysburg, Va., July 1-3,18113 95, 1', locator='author index'),
                  C('IA-ATLAS-TXT', 'Chase, Edwin A. : Gettysburg, I\'u., July 1-3,1863 95, 1', locator='author index'),
              ], note='"Field director ... first lieutenant William H. Chase" is the xyHt wording (blocked); the PDF\'s check_15 reconciliation (Chase 1868-69; Blake 1873 revision) rests on LOC for Blake and xyHt for Chase.'),
            BLK('R12.015.c', 'knowles_method', 'Knowles hand-traced 4-ft contours from a good photocopy of a proof sheet of the engraved map on Mylar, scanned them, assigned elevations, built a TIN and georectified on buildings unchanged since 1863.',
                'xyHt article, section "From Contours to TIN" and georectification paragraph.'),
            BLK('R12.015.d', 'fifty_feet_statement', 'Hilltops and ridgelines align closely (displacement under 50 feet for some features such as Little Round Top); creek beds and rolling terrain differ by hundreds of feet in places: a horizontal displacement, not a vertical RMS.',
                'xyHt article; Spokesman-Review coverage (28 June 2013) is a news summary; the article governs.'),
            BLK('R12.015.e', 'sheet_facts_from_xyht', 'The Warren manuscript (about 13 ft square) exists in 20 sections at NARA; 1869-74 recompiled to the engraved 1:12,000 map; field director 1st Lt. William H. Chase.',
                'xyHt article, section on the Warren map.'),
            BLK('R12.015.f', 'team_and_storymap', 'Team roles (Knowles lead; Miller and Tait for the 1863 terrain; Carroll; Montenyohl; Nielsen), the Smithsonian article, the Esri story map and the viewshed coverage.',
                'Smithsonian Magazine and Spokesman-Review pages, first-round reading; the story map was not fetched (JavaScript viewer).'),
        ],
        stays_unsupported=['every Knowles-specific statement (method, error statement, data availability, team roles)', 'Chase\'s rank and role'],
        register_refs=['sources-a-EG-04'],
        blocked_host=[
            HOST('xyht', 'https://www.xyht.com/professional-surveyor-archives/feature-discovering-lees-view/', 'xyHt (Professional Surveyor), "Feature: Discovering Lee\'s View", April 2014, the whole article: sections "From Contours to TIN", the georectification paragraph (the 50-ft statement), the Warren-map paragraph (size, sections, Chase, 1869-74); copy sentences verbatim.'),
            HOST('Smithsonian', 'https://www.smithsonianmag.com/history/A-Cutting-Edge-Second-Look-at-the-Battle-of-Gettysburg-1-180947921/', 'Smithsonian Magazine, "A Cutting-Edge Second Look at the Battle of Gettysburg": team roles; terrain from an 1874 map plus present-day data.'),
            HOST('Spokesman-Review', 'https://www.spokesman.com/stories/2013/jun/28/new-map-may-explain-lees-decisions-gettysburg/', 'Spokesman-Review, 28 June 2013: viewshed coverage (note: says aerial photos gave the elevation model; the article governs).'),
            HOST('Esri-storymap', 'https://storymaps.esri.com/stories/2013/gettysburg', 'Esri story map "Gettysburg": a JavaScript viewer; robots rules unreadable in the first probe; only a person with a browser can read it.'),
        ],
        product_consequence=['terrain/elev1863 error model: the "50 ft" statement must not be used as a vertical RMS until xyHt is read; the project measures its own (frame displacement 16-30 m in ELEV-NOTES)'],
        lookups=['www.xyht.com, xyht.com, www.smithsonianmag.com, www.spokesman.com, storymaps.esri.com robots.txt: proxy refusal (2026-11-13, 2026-11-16)', 'archive.org advanced search for the article title: 0 hits (2026-11-13)'],
        changes_vs_previous=['the first-round "verified" for the Knowles statements is withdrawn to blocked_host (no verbatim quote was kept and the pages cannot be re-read)', 'new: Atlas index credits W. H. Chase and E. A. Chase on plate 95'],
        notes='The first round read the article on the owner\'s machine; this audit cannot repeat it.',
    ))

    # ------------------------------------------------------------------ R12.016
    rows.append(dict(
        id='R12.016',
        verdict='corrected',
        pdf_claim='NPS rehabilitation program (restoration program since 2000): policy and quantities: 9 miles of fence rebuilt; Pickett\'s Charge area restored to 12 small fields; non-historic trees grown over about 65-70 years removed; HTML; public; the page gives inconsistent 140 versus 147 year spans; today\'s park is an interpretive proxy, not 1863.',
        corrected_claim=(
            'Confirmed verbatim on the NPS page: "Now, nine miles of fences have been rebuilt, showing the field of Pickett\'s Charge in its historic configuration of 12 small fields"; "we need to remove non-historic trees that have grown up over the past 65 - 70 years"; '
            'the time spans are inconsistent on the page itself: "the last 141 years" (pull quote), "the last 147 years" and "the past 140 years"; "We started the project in 2000, after completing a General Management plan/environmental impact statement." '
            'Corrections: (1) the page is not undated: it ends "Last updated: February 26, 2015"; (2) 141, 147 and 140 are all on the page (the PDF mentions two of them). '
            'Addition: the NPS Record of Treatment gives per-project installed fence lengths (for example 1,282 ft, 277 ft, 2,255 ft, 1,389 ft of worm fence), which are better quantities for the schedules than "nine miles". '
            'The rebuilt fences and fields are today\'s park, an interpretive proxy, not 1863 ground.'),
        sub_claims=[
            S('R12.016.a', 'fence_and_fields', 'Nine miles of fences have been rebuilt, showing the field of Pickett\'s Charge in its historic configuration of 12 small fields (it was seen as one unbroken field for years).',
              'documented', 'supported', [
                  C('NPS-REHAB-PAGE', 'Now, nine miles of fences have been rebuilt, showing the field of Pickett\'s Charge in its historic configuration of 12 small fields'),
              ], note='An NPS claim about its program, not a measurement.'),
            S('R12.016.b', 'tree_removal', 'Non-historic trees that have grown up over the past 65-70 years are to be removed; fields not farmed over the past 65 years have become forests.',
              'documented', 'supported', [
                  C('NPS-REHAB-PAGE', 'we need to remove non-historic trees that have grown up over the past 65 - 70 years'),
                  C('NPS-REHAB-PAGE', 'fields that have not been farmed over the past 65 years have become forests'),
              ]),
            S('R12.016.c', 'inconsistent_spans', 'The page gives three spans for the change since 1863: 141 years (pull quote), 147 years (body) and 140 years (maps).',
              'documented', 'conflict', [
                  C('NPS-REHAB-PAGE', 'how they had changed in the last 141 years became one of our most important research goals'),
                  C('NPS-REHAB-PAGE', 'how they had changed in the last 147 years became one of our most important research goals'),
                  C('NPS-REHAB-PAGE', 'how they had changed over the past 140 years'),
              ], note='The GMP (1999) says "the last 135 years" for 1863-1998; the page text is a later adaptation.'),
            S('R12.016.d', 'start_of_project', 'The project started in 2000, after completing a General Management plan/environmental impact statement.',
              'documented', 'supported', [
                  C('NPS-REHAB-PAGE', 'We started the project in 2000, after completing a General Management plan/environmental impact statement.'),
              ], note='The xyHt article (blocked) is said to give 1999.'),
            S('R12.016.e', 'page_date', 'The page carries "Last updated: February 26, 2015" (the first round called it undated).',
              'documented', 'supported', [C('NPS-REHAB-PAGE', 'Last updated: February 26, 2015')]),
            S('R12.016.f', 'installed_lengths', 'The Record of Treatment records installed worm-fence lengths per project: 1,282 ft (Sherfy Peach Orchard south and east, Rose North Orchard north, 2006), 277 ft (Rose West Woods north, 2006), 1,389 ft (Rose Field 8 west, 2010), 407 ft (McPherson Field 10 north, 2011), among others.',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V2', 'In 2006, the park completed the installation of 1,282 feet of worm fence along the south and east boundaries of Sherfy Peach Orchard and along the north boundary of Rose North Orchard'),
                  C('NPS-CLR-ROT-V2', 'In 2006, the park completed the installation of 277 feet of worm fence along the north boundary of Rose West Woods'),
                  C('NPS-CLR-ROT-V2', 'In 2010, volunteers completed the installation of 1,389 feet of worm fence along the west boundary of Rose Field 8'),
                  C('NPS-CLR-ROT-V1', 'In 2011, volunteers completed the installation of 407 feet of worm fencing along the north boundary of McPherson Field 10'),
              ], note='Modern installations, not 1863 fence lengths; useful as the source of the "9 miles" total, which no text gives as a sum.'),
        ],
        stays_unsupported=['the sum "nine miles" is an NPS statement, not a measurement; no per-segment sum was computed'],
        conflicts_carried=['Span since 1863 on the NPS page: 141 / 147 / 140 years (the GMP says 135 years for 1863-1998)'],
        register_refs=[],
        blocked_host=[],
        product_consequence=['R13/R14 fence and field schedules: use the Record of Treatment per-segment lengths and the 1868 Warren fence lines as the basis for 1863 fences, never "today\'s park" as 1863; do not print "nine miles" as an 1863 quantity'],
        lookups=['NPS rehabilitation page: 200 (2026-11-13), robots.txt allows (/search and /ns disallowed only)'],
        changes_vs_previous=['corrected: the page has a "Last updated" date; 141 is also on the page', 'new: per-project installed lengths from the Record of Treatment'],
        notes='',
    ))
    return rows
