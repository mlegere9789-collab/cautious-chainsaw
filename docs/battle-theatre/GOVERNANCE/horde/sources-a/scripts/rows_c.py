"""rows R12.017 - R12.022 and R12.0000 (NPS reports, Stone Sentinels, drone survey, game maps, USGS lidar, USGS 3DEP routes, top-level acceptance)"""
from rowlib import C, S, BLK, HOST
import rows_a, rows_b, rows_d


def ROWS(prev):
    rows = []

    # ------------------------------------------------------------------ R12.017
    rows.append(dict(
        id='R12.017',
        verdict='corrected',
        pdf_claim='NPS Cultural Landscape Reports and Historic Structure Reports, farm histories, Seminar Papers: First Day CLR 2021, Pickett\'s Charge CLR 2024, farm histories (Brien Farm and Family 1972, McPherson Farm 1977, Slyder Farm), Administrative History (Unrau 1991); 16 seminars with volumes 4 to 13, 15, 16; npshistory.com index and the Gettysburg seminars index; PDF/HTML; US government works, generally public domain (verify per document); per-paper URLs not listed; the CLR "Record of Treatment" Vol. I-II is cited at IRMA 2257218 but that page returned no content; the NPS Little Round Top CLR and Fire Management Plan sit on planning.htm; the CLR PDF failed to fetch.',
        corrected_claim=(
            'Confirmed except for one entry, with the open items closed from local copies. Verified on the npshistory.com index (saved 2026-11-13): First Day - Union 1st Corps Battlefield CLR (Auwaerter, Wang, Tiburzi, Bauder, 2021); Gettysburg National Cemetery CLR (2017); '
            'Record of Treatment vols. I and II (2018); Little Round Top CLR (March 2, 2012); The Brien Farm and Family (Marcella Sherfy, June 1972); Edward McPherson Farm: Historical Study (Kathleen R. Georg, October 14, 1977); Historic Structure Report: J. Slyder Farm Buildings (Part I) (Tilberg, 1958); Administrative History (Unrau, July 1991); '
            'and 16 numbered seminars of which 1, 2, 3 and 14 are marked "(No papers published)" and 4 to 13, 15 and 16 carry volumes. '
            'CORRECTION: the index has NO Pickett\'s Charge Cultural Landscape Report; it lists "Cultural Landscapes Inventory: Pickett\'s Charge Battlefield (2024)" (a CLI; the file is local as NPS-CLI-PCB). The PDF\'s "Pickett\'s Charge CLR 2024" must read CLI 2024. '
            'RESOLVED: the authorship of the Record of Treatment: its title page lists four preparers (Layton, Chinburg, Braquet and Brown, Olmsted Center for Landscape Preservation, Boston, 2018); the Library of Congress cataloguing data names Layton and Brown (the IRMA entry) and the npshistory index names Layton, Chinburg and Braquet: each is a partial list of the same four. '
            'The Little Round Top CLR PDF is local (npshistory copy, 54,173,676 bytes, fetched 2026-11-13) and the NPS planning page links it (FinalCLR_LittleRoundTop_AllSections-508.pdf; HEAD Last-Modified 22 Mar 2018). '
            'Blocked: the IRMA record (irma.nps.gov) and its date of issue. Still unfound: an NPS Historic Vegetation Study (no such entry in the index). New lead: "Treatment Philosophy: The 1863 Landscape (Gettysburg)" (Eric Campbell, March 2004) is listed (link to IRMA).'),
        sub_claims=[
            S('R12.017.a', 'clr_list', 'The npshistory index lists CLRs: First Day - Union 1st Corps Battlefield (Auwaerter, Wang, Tiburzi and Bauder, 2021); Gettysburg National Cemetery (Auwaerter, Ponte, Powers and Selby, 2017); Record of Treatment vol. I and vol. II (Layton, Chinburg and Braquet, 2018); Little Round Top, Treatment & Management Plan (Einhorn Yaffee Prescott et al., March 2, 2012).',
              'documented', 'supported', [
                  C('NPSHISTORY-INDEX', 'Cultural Landscape Report for First Day — Union 1st Corps Battlefield, Gettysburg National Military Park [href: clr-1-day-union-1-corps.pdf] (Jon Auwaerter, Zhangshuai Wang, Anna Tiburzi and Nathaniel Bauder, 2021)'),
                  C('NPSHISTORY-INDEX', 'Cultural Landscape Report for Gettysburg National Cemetery, Gettysburg National Military Park [href: clr-cemetery.pdf] (John Auwaerter, Catherine Ponte, Nathan Powers and Pamela Selby, 2017)'),
                  C('NPSHISTORY-INDEX', 'Cultural Landscape Report for Gettysburg National Military Park — Record of Treatment: Volume I [href: clr-v1.pdf] (Timothy W. Layton, Daisy Chinburg and Ashley Braquet, 2018)'),
                  C('NPSHISTORY-INDEX', 'Cultural Landscape Report for Gettysburg National Military Park — Record of Treatment: Volume II [href: clr-v2.pdf] (Timothy W. Layton, Daisy Chinburg and Ashley Braquet, 2018)'),
                  C('NPSHISTORY-INDEX', 'Cultural Landscape Report, Treatment & Management Plan: Little Round Top, Gettysburg National Military Park [href: clr-little-round-top.pdf] (Einhorn, Yaffee Prescott, Rhodeside & Harwell, Hunter Research, Fuss & O\'Neill, Inc. and C.S. Davidson, Inc., March 2, 2012)'),
              ]),
            S('R12.017.b', 'pickett_clr_is_cli', 'There is no Pickett\'s Charge Cultural Landscape Report in the index; the 2024 item is "Cultural Landscapes Inventory: Pickett\'s Charge Battlefield" (a CLI); the First Day CLR 2021 of the PDF is the CLR "First Day - Union 1st Corps Battlefield".',
              'documented', 'supported', [
                  C('NPSHISTORY-INDEX', 'Cultural Landscapes Inventory: Pickett\'s Charge Battlefield, Gettysburg National Military Park [href: cli-picketts-charge-battlefield.pdf] (2024)'),
              ], note='The absence of a Pickett\'s Charge CLR is read from the five CLR lines of the index (sub-claim a); a negative on one index page.'),
            S('R12.017.c', 'farm_histories_admin_history', 'The index lists "The Brien Farm and Family" (Marcella Sherfy, June 1972), "Edward McPherson Farm: Historical Study" (Kathleen R. Georg, October 14, 1977), "Historic Structure Report: J. Slyder Farm Buildings (Part I)" (Frederick Tilberg, December 11, 1958) and the Administrative History (Harlan D. Unrau, July 1991).',
              'documented', 'supported', [
                  C('NPSHISTORY-INDEX', 'The Brien Farm and Family [href: brien-farm.pdf] (Marcella Sherfy, June 1972)'),
                  C('NPSHISTORY-INDEX', 'Edward McPherson Farm: Historical Study [href: hs-mcpherson-farm.pdf] (Kathleen R. Georg, October 14, 1977)'),
                  C('NPSHISTORY-INDEX', 'Historic Structure Report: J. Slyder Farm Buildings (Part I), Gettysburg National Military Park [href: hsr-slyder-farm-p1.pdf] (Frederick Tilberg, December 11, 1958)'),
                  C('NPSHISTORY-INDEX', 'Administrative History: Gettysburg National Military Park and National Cemetery, Pennsylvania [href: adhi.pdf] (Harlan D. Unrau, July 1991)'),
              ]),
            S('R12.017.d', 'seminars', 'The seminar series has 16 numbered seminars; papers were published for 4 to 13, 15 and 16 (each carries a volume link) and not for 1, 2, 3 and 14 ("No papers published").',
              'documented', 'supported', [
                  C('NPSHISTORY-INDEX', '3. The Public and Private Dwight D. Eisenhower. The Third Annual Gettysburg Seminar. March 5, 1994. Gettysburg, PA: Gettysburg National Military Park (No papers published)'),
                  C('NPSHISTORY-INDEX', '14. Gettysburg In History and Memory. Papers of the 2012 (14th) Gettysburg Seminar. April 13-15, 2012. Gettysburg, PA: Gettysburg National Military Park (No papers published)'),
                  C('NPSHISTORY-INDEX', '1. The Changing Interpretations of Gettysburg. The First Annual Gettysburg Seminar. March 6-7, 1992. Gettysburg, PA: Gettysburg National Military Park (No papers published)'),
                  C('NPSHISTORY-INDEX', '2. Battlefields as Sacred Ground. The Second Annual Gettysburg Seminar. March 5-6, 1993. Gettysburg, PA: Gettysburg National Military Park (No papers published)'),
                  C('NPSHISTORY-INDEX', '4. Gettysburg 1895-1995: The Shaping of an American Shrine [href: ../../series/symposia/gettysburg_seminars/4/index.htm] . The Fourth Annual Gettysburg Seminar. March 4, 1995. Gettysburg, PA: Gettysburg National Military Park (1995)'),
                  C('NPSHISTORY-INDEX', '5. Unsung Heroes of Gettysburg [href: ../../series/symposia/gettysburg_seminars/5/index.htm]'),
                  C('NPSHISTORY-INDEX', '6. Mr. Lincoln\'s Army: The Army of the Potomac in the Gettysburg Campaign [href: ../../series/symposia/gettysburg_seminars/6/index.htm]'),
                  C('NPSHISTORY-INDEX', '7. The High Water Mark of an Army: The Army of Northern Virginia in the Gettysburg Campaign [href: ../../series/symposia/gettysburg_seminars/7/index.htm]'),
                  C('NPSHISTORY-INDEX', '8. The American Civil War in 1863 [href: ../../series/symposia/gettysburg_seminars/8/index.htm]'),
                  C('NPSHISTORY-INDEX', '9. "I ordered no man to go where I would not go myself": Leadership in the Campaign and Battle of Gettysburg [href: ../../series/symposia/gettysburg_seminars/9/index.htm]'),
                  C('NPSHISTORY-INDEX', '10. "This has been a terrible ordeal": The Gettysburg Campaign and First Day of Battle [href: ../../series/symposia/gettysburg_seminars/10/index.htm]'),
                  C('NPSHISTORY-INDEX', '11. "The Most Shocking Battle I Have Ever Witnessed": The Second Day at Gettysburg [href: ../../series/symposia/gettysburg_seminars/11/index.htm]'),
                  C('NPSHISTORY-INDEX', '12. The Fate Of A Nation: The Third Day at Gettysburg, July 3, 1863 [href: ../../series/symposia/gettysburg_seminars/12/index.htm]'),
                  C('NPSHISTORY-INDEX', '13. Gettysburg: The End of the Campaign and Battle\'s Aftermath. Papers of the 2010 (13th) Gettysburg Seminar. April 10-11, 2010 [href: ../../series/symposia/gettysburg_seminars/13/index.htm]'),
                  C('NPSHISTORY-INDEX', '15. The Unfinished Work: Abraham Lincoln, David Wills and the Soldiers\' National Cemetery [href: ../../series/symposia/gettysburg_seminars/15/index.htm]'),
                  C('NPSHISTORY-INDEX', '16. A Contrast in Commanders: Meade, Lee, and Their Commands at Gettysburg [href: ../../series/symposia/gettysburg_seminars/16/index.htm]'),
              ]),
            S('R12.017.e', 'record_of_treatment_authors', 'The Record of Treatment title page names four preparers (Layton, Chinburg, Braquet, Brown; Olmsted Center for Landscape Preservation, Boston, 2018); the Library of Congress cataloguing data names Layton and Brown; npshistory names Layton, Chinburg and Braquet; so IRMA\'s "Layton and Brown" and npshistory\'s three names are partial lists of the same four.',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'Prepared by Timothy W. Layton, ASLA, Historical Landscape Architect Daisy Chinburg, Conservation Associate Ashley Braquet, ASLA, Conservation Associate Margie Cofn Brown, Senior Project Manager Olmsted Center for Landscape Preservation National Park Service, Boston, Massachusetts, 2018', note='title page, volume I (volume II has the same four names; areas 11-15)'),
                  C('NPS-CLR-ROT-V1', 'Names: Layton, Timothy W. (Timothy William), 1974- author. | Brown, Margie Cofn, 1963- author.', note='Library of Congress Cataloging-in-Publication data'),
                  C('NPS-CLR-ROT-V2', 'RECORD OF TREATMENT, AREAS 11–15'),
              ]),
            S('R12.017.f', 'lrt_clr_local', 'The Little Round Top CLR (final, March 2nd, 2012) is local as a 54,173,676-byte PDF (npshistory copy) and the NPS planning page links "Download the Little Round Top Cultural Landscape Report here" to FinalCLR_LittleRoundTop_AllSections-508.pdf; the nps.gov copy answered HEAD 200 with Last-Modified Thu, 22 Mar 2018.',
              'documented', 'supported', [
                  C('OWN-NPS-MANIFEST', 'NPS-CLR-LRT | url https://www.npshistory.com/publications/gett/clr-little-round-top.pdf | bytes 54173676', note='size of the npshistory copy read by the web-evidence workstream, 2026-11-13'),
                  C('NPS-CLR-LRT', 'FINAL March 2nd, 2012', note='cover'),
                  C('NPS-PLANNING-PAGE', 'Download the Little Round Top Cultural Landscape Report here. [href: /gett/getinvolved/upload/FinalCLR_LittleRoundTop_AllSections-508.pdf]'),
                  C('OWN-HEAD-RECORDS', 'last-modified Thu, 22 Mar 2018 05:40:45 GMT', note='HEAD of the nps.gov URL, status 200, 2026-11-13'),
                  C('NPS-PLANNING-PAGE', 'Download the Fire Management Plan here [href: https://www.nps.gov/gett/learn/management/upload/GETT-EISE-FMP-EA-Final-July-2-2014-508.pdf]'),
              ]),
            S('R12.017.g', 'treatment_philosophy_lead', 'The index lists "Treatment Philosophy: The 1863 Landscape (Gettysburg)" (Eric Campbell, March 2004), linked to the IRMA download file 472822; the Record of Treatment says the draft informed decisions by 2002.',
              'documented', 'supported', [
                  C('NPSHISTORY-INDEX', 'Treatment Philosophy: The 1863 Landscape (Gettysburg) [href: https://irma.nps.gov/DataStore/DownloadFile/472822] (Eric Campbell, March 2004)'),
                  C('NPS-CLR-ROT-V1', 'By 2002, the draft Treatment Philosophy: The 1863 Landscape also informed decisions.'),
              ], note='The document itself (IRMA) was not read; new lead for the 1863 landscape treatment rules.'),
            S('R12.017.h', 'reuse_terms', 'Reuse is per document: the Record of Treatment says graphics from sources other than federal repositories may not be reproduced without the permission of the owners noted in the captions.',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'Graphics from sources other than federal repositories may not be reproduced without the permission of the owners noted in the captions.'),
              ], note='"US government works, generally public domain (verify per document)" stands as the PDF wording.'),
            BLK('R12.017.i', 'irma_record', 'IRMA DataStore reference 2257218 returns the Layton and Brown, Record of Treatment Volume I and II record with date of issue 2018-09-30.',
                'Shard run 2026-11-04: https://irma.nps.gov/DataStore/Reference/Profile/2257218 returned content: "Layton TW and Brown MC. 2018. Cultural Landscape Report for GNMP, Record of Treatment: Volume I and II"; date of issue 2018-09-30.'),
            S('R12.017.j', 'historic_vegetation_study', 'An NPS Historic Vegetation Study exists and is reachable.', 'open_gap', 'unsupported', [], note='No entry for it in the npshistory index (a text search for "Vegetation" finds only prose lines); still unfound.'),
        ],
        stays_unsupported=['IRMA record text and date of issue (2018-09-30)', 'the NPS Historic Vegetation Study', 'the Treatment Philosophy: The 1863 Landscape (IRMA download not read)'],
        conflicts_carried=['Record of Treatment authors: Layton and Brown (LC cataloguing data, IRMA) vs Layton, Chinburg and Braquet (npshistory) vs four preparers (title page): resolved as partial lists'],
        register_refs=['sources-a-EG-09'],
        blocked_host=[HOST('IRMA', 'https://irma.nps.gov/DataStore/Reference/Profile/2257218', 'IRMA reference profile of the Record of Treatment (authors, issue date, abstract) and https://irma.nps.gov/DataStore/DownloadFile/472822 (Treatment Philosophy: The 1863 Landscape, 2004).')],
        product_consequence=['terrain_sources.json row 17: change "Pickett\'s Charge CLR 2024" to "Pickett\'s Charge Battlefield CLI 2024"; mark the Little Round Top CLR as read; add the Treatment Philosophy (2004) as a lead for the 1863 rules', 'fence and field schedules (R13/R14) draw their 1863 basis from Warren plus these CLRs; the Record of Treatment per-area text is the documented source of what NPS rebuilt'],
        lookups=['npshistory.com index: 200 (2026-11-13), robots allows /publications/', 'nps.gov planning page: 200 (2026-11-13)', 'irma.nps.gov robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['corrected: Pickett\'s Charge item is a CLI, not a CLR', 'resolved: Record of Treatment authors; Little Round Top CLR body is local', 'IRMA moved to blocked_host'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.018
    rows.append(dict(
        id='R12.018',
        verdict='unsupported',
        pdf_claim='Stone Sentinels, Farms and Buildings: aggregator, about two dozen farm and building pages (Bliss, Codori, Klingel, Rose, Trostle, Thompson House and others); building notes (for example Sherfy farm about 50 acres, house built 1840s, original barn burned in the battle); https://gettysburg.stonesentinels.com/?p=203; HTML; check terms; secondary aggregator; details of most pages not captured.',
        corrected_claim=(
            'Unsupported from here: gettysburg.stonesentinels.com is refused by the proxy, so the page, its menu of 22 entries and the "Battlefield Terrain" page cannot be re-read; the first round\'s read (22 pages named) is carried only as an earlier reading. '
            'The Sherfy example can be checked against NPS documents: the Pickett\'s Charge Battlefield CLI dates the Joseph Sherfy house "between 1840-1860" (not "1840s"), "A Common Pride and Fame" says Sherfy\'s barn burned on July 2 (supports "barn burned in the battle"), and an NPS administrative history of the 1930s gives the Sherfy farm as "70 acres" (not "about 50"): the Stone Sentinels figure is unconfirmed. '
            'Stone Sentinels stays a lead list only: never the sole basis of any object (Law clause 4).'),
        sub_claims=[
            BLK('R12.018.a', 'site_and_menu', 'https://gettysburg.stonesentinels.com/battlefield-farms/ (the ?p=203 form redirects) lists a Farms & Buildings menu of 22 pages (Black Horse Tavern, Bliss, Brian, Codori, Hummelbaugh, Klingel, Leister, Lutheran Seminary, McAllister\'s Mill, McLean, McPherson, Rogers House, Rose, Rummel, Sherfy, Slyder, Snyder, Taney, Thompson House, Trostle, George Weikert, Wentz) and a separate "Battlefield Terrain" page.',
                'Shard run 2026-11-04: HTTP 200 on the farm page; menu of 22 pages read; page contents not read page by page.'),
            S('R12.018.b', 'sherfy_house_date', 'The Joseph Sherfy house was built between 1840 and 1860 (NPS), not the "1840s" of the Stone Sentinels example.',
              'documented', 'partial', [
                  C('NPS-CLI-PCB', 'CE 1840 - 1860 Built Joseph Sherfy house is built between 1840-1860.'),
                  C('NPS-CLI-PCB', 'Joseph Sherfy Farm: House. (1840-1860, Contributing) The house at 1137 Emmitsburg Road is a 2-story, 3-bay brick Georgian style building'),
              ], note='"1840s" is a narrower window than the NPS 1840-1860; unconfirmed.'),
            S('R12.018.c', 'sherfy_barn_burned', 'The Sherfy barn was burned during the battle, on July 2.',
              'documented', 'supported', [
                  C('NPS-COMMON-PRIDE-2', 'the first two were burned during the battle (Sherfy1s on July 2 and Spangler\'s also on July 2)', note='Georg 1981; OCR "Sherfy1s" = Sherfy\'s'),
              ]),
            S('R12.018.d', 'sherfy_acres', 'The Sherfy farm was "about 50 acres" (Stone Sentinels example).', 'open_gap', 'conflict', [
                C('NPS-ADHI', 'the Sherfy farm of 70 acres', role='context', note='an NPS administrative history of the park (about the 1930s-40s, when land acquisition was urged); not the 1863 size'),
            ], note='No source gives the 1863 acreage; the two figures belong to different dates and are both unconfirmed for 1863.'),
        ],
        stays_unsupported=['the Stone Sentinels pages (menu, "Battlefield Terrain" page, per-farm notes)', 'farm acreage of the Sherfy farm in 1863'],
        register_refs=[],
        blocked_host=[HOST('Stone-Sentinels', 'https://gettysburg.stonesentinels.com/battlefield-farms/', 'The Farms & Buildings page and its 22 sub-pages and the "Battlefield Terrain" page: copy the menu, then the terms of use, then only what is needed as a lead; quote sentences verbatim, never copy text into the product.')],
        product_consequence=['none: no object may rest on this site alone; farm-building facts come from NPS HSRs/CLIs and Warren'],
        lookups=['gettysburg.stonesentinels.com robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['page read of 2026-11-04 moved to blocked_host (no verbatim quote kept)', 'new: NPS data on the Sherfy example (house 1840-1860; barn burned July 2; acreage not confirmed)'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.019
    rows.append(dict(
        id='R12.019',
        verdict='unsupported',
        pdf_claim='NPS drone photogrammetry, Little Round Top west face (52 acres; senseFly eBee RTK, DJI Inspire 2): orthomosaic, RGB point cloud, TIN, 2017; revealed earthworks, stone walls, railroad beds and previously undocumented linear features; GeoCue case study PDF; point density not reported; not LiDAR; dataset availability not confirmed.',
        corrected_claim=(
            'Unsupported from here: support.geocue.com is refused by the proxy, so the report (52 acres; four flights with the senseFly eBee RTK at 390 ft above ground, DJI Inspire 2 at 295 ft; 29 GNSS-RTK checkpoints; Agisoft PhotoScan; GeoCue LP360; a controlled burn; report dated 7 July 2017) cannot be re-read; the first-round figures are carried only as an earlier reading. '
            'No NPS text read mentions a 2017 drone survey. Related and reachable: the Little Round Top CLR (2012) says a full topographic survey of its project area was made "using aerial photogrammatery and field verification methods" (the base map of the CLR) and, as a suggestion for further research, "Conduct LIDAR topography mapping at Little Round Top". '
            'The modern earthworks and walls it reveals must never be used to derive 1863 profiles (standing rule).'),
        sub_claims=[
            BLK('R12.019.a', 'geocue_report', 'GeoCue/AirGon case study "Little Round Top Revealed" (M. Stevens, 7 July 2017): about 52 acres; four flights, senseFly eBee RTK at 390 ft AGL; DJI Inspire 2 at 295 ft for detail; 29 GNSS-RTK checkpoints; Agisoft PhotoScan point cloud and orthomosaic; GeoCue LP360 accuracy tests and feature extraction; area cleared by a controlled burn; earthworks, stone walls and railroad beds extracted; no accuracy or point density stated.',
                'Shard run 2026-11-04: report PDF (9 pages, 2.8 MB) read in full at https://support.geocue.com/wp-content/uploads/2017/07/MappingGettysburg-LittleRoundTopRevealed.pdf.'),
            S('R12.019.b', 'lrt_clr_topographic_survey', 'The Little Round Top CLR (2012) base map comes from "a full topographic survey of the project area ... using aerial photogrammetry and field verification methods" and the park GIS library was updated with it.',
              'documented', 'supported', [
                  C('NPS-CLR-LRT', 'a full topographic survey of the project area was generated using aerial photogrammatery and ﬁeld veriﬁca on methods', note='OCR of the PDF text layer drops "ti" ligatures'),
              ], note='A different (earlier, 2010-2012) modern survey; data not in hand.'),
            S('R12.019.c', 'lrt_clr_lidar_suggestion', 'The Little Round Top CLR (2012) recommended, as further research, "Conduct LIDAR topography mapping at Little Round Top", at a resolution of one foot or better.',
              'documented', 'supported', [
                  C('NPS-CLR-LRT', 'Conduct LIDAR topography mapping at Li le Round Top.', note='OCR drops "tt"'),
              ], note='Context for the 2017 project; says nothing of its figures.'),
            S('R12.019.d', 'data_availability', 'The orthomosaic, point cloud and TIN of the 2017 survey are available to the project.', 'open_gap', 'unsupported', [], note='The report does not offer them; an NPS request would be an owner-only act.'),
        ],
        stays_unsupported=['every figure of the GeoCue report', 'availability of the dataset'],
        register_refs=['sources-a-EG-06'],
        blocked_host=[HOST('GeoCue', 'https://support.geocue.com/wp-content/uploads/2017/07/MappingGettysburg-LittleRoundTopRevealed.pdf', 'The 9-page case study PDF: flight altitudes, checkpoint count, software, accuracy statement (none found earlier), the burn, the list of features extracted; copy verbatim.')],
        product_consequence=['Little Round Top earthwork geometry: marked "not measured" in product text (EG-06); never derive 1863 profiles from the modern walls (CLAUDE.md)'],
        lookups=['support.geocue.com robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['report figures moved to blocked_host; new: the LRT CLR\'s own photogrammetric base map and LIDAR suggestion'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.020
    rows.append(dict(
        id='R12.020',
        verdict='unsupported',
        pdf_claim='Existing game and model maps (Ultimate General discussion): forum; landmark accuracy disputes only (Round Tops, Stevens Run, missing landmarks); https://forum.game-labs.net/topic/19003-accuracy-of-gettysburg-map/; forum claims; Stevens Run may have been wider in 1863 per a poster; used only as a checklist of things to verify; no open 3D tileset of 1863 Gettysburg was found.',
        corrected_claim='Unsupported and not used. The forum cannot be reached (DNS failure on the owner\'s machine on 2026-11-04; refused by the proxy on 2026-11-13 and 2026-11-16), so the thread was never read here and its claims (including "Stevens Run may have been wider in 1863") have no support. By the PDF\'s own limits it is forum claims (R4), a checklist and never a basis. Nothing from game or model maps enters the product.',
        sub_claims=[
            BLK('R12.020.a', 'forum_thread', 'The Game-Labs forum topic 19003 "accuracy of Gettysburg map" disputes the Round Tops, Stevens Run and missing landmarks; a poster says Stevens Run may have been wider in 1863.',
                'Shard run 2026-11-04: https://forum.game-labs.net/robots.txt failed with a name-resolution error; the thread was never fetched.'),
            S('R12.020.b', 'no_open_3d_tileset', 'No open 3D tileset of 1863 Gettysburg exists.', 'open_gap', 'unsupported', [], note='A negative statement of the PDF; no search of tile catalogues was made in this shard.'),
        ],
        stays_unsupported=['the forum thread and its claims', 'the absence of an open 3D tileset'],
        register_refs=['sources-a-EG-10'],
        blocked_host=[HOST('Game-Labs-forum', 'https://forum.game-labs.net/topic/19003-accuracy-of-gettysburg-map/', 'Only if the owner wants the checklist items: the poster claims on Stevens Run width, Round Tops and missing landmarks; each must then be verified against Warren and NPS sources, not accepted.')],
        product_consequence=['terrain_sources.json row 20: stays "not used" (no evidence value)'],
        lookups=['forum.game-labs.net robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['unchanged (failed lookup; not used)'],
        notes='Owner decision: DD-SA-01 records the item as not used.',
    ))

    # ------------------------------------------------------------------ R12.021
    rows.append(dict(
        id='R12.021',
        verdict='partially_supported',
        pdf_claim='USGS South Central Pennsylvania 2017 QL2 LiDAR (13 counties including Adams; collected 2017-11-21 to 2017-12-21; published 2018-10-26): airborne lidar; bare-earth terrain, canopy, breaklines, intensity; AmeriGEOSS record, PASDA, Adams County 2-ft contours service; LAS 1.4 (7,975 tiles of 1,500 m), 1-m DEM, 2-ft contours; nominal pulse spacing 0.7 m; QL2 = 10 cm RMSEz, at most 0.71 m spacing, at least 2 pts/m2; free; 3DEP has no use restrictions.',
        corrected_claim=(
            'Partly confirmed from the public AWS copy of the project (Entwine EPT, project USGS_LPC_PA_South_Central_B1_2017_LAS_2019), read 2026-11-13 and 2026-11-16: LAZ (laszip) point cloud of 76,019,979,744 points in EPSG:3857; the EPT lists 4,911 source LAZ files whose point counts sum exactly to that total; '
            'the Gettysburg tile 18SUK309410 (13,309,519 points; x 309000-310500, y 4410000-4411500 in NAD83(2011) / UTM zone 18N: a 1,500 m tile) has the compound system "NAD83(2011) / UTM zone 18N + NAVD88 height" (EPSG 5703), LAS 1.4, point format 6, produced with "LiDAR Suite", file created in 2018 (day 288). '
            'Conflict carried: the PDF/AmeriGEOSS count of 7,975 tiles against the 4,911 source files of the AWS EPT (different deliverables or a subset; not reconciled). '
            'Not verified from here (pages refused): the collection dates 2017-11-21 to 2017-12-21, publication 2018-10-26, GEOID12B, the 13 counties, 0.7 m pulse spacing, 150 control points and 245 checkpoints, the QL2 specification, the DEM and 2-ft contour products, the Adams County service, and the later project PA_17County_D24 (2024-25) of the first round; '
            'the public AWS bucket lists four Pennsylvania lidar projects (Allentown 2016, Dauphin 2016, South Central B1 2017 and B2 2017) and no D24 prefix, so D24 is not served there.'),
        sub_claims=[
            S('R12.021.a', 'ept_project', 'The AWS public copy of the project is a LAZ (laszip) Entwine EPT of 76,019,979,744 points in EPSG:3857; the EPT lists 4,911 source LAZ files, all inserted, whose points sum to 76,019,979,744.',
              'documented', 'supported', [
                  C('EPT-ROOT', 'points: 76019979744', locator='ept.json'),
                  C('EPT-ROOT', 'dataType: laszip', locator='ept.json'),
                  C('EPT-ROOT', 'srs.horizontal: 3857', locator='ept.json'),
                  C('EPT-BUILD', 'software: Entwine', locator='ept-build.json'),
                  C('OWN-EPT-SOURCES-SUMMARY', 'source files listed: 4911', note='computed from ept-sources/list.json (sha256 in the summary text)'),
                  C('OWN-EPT-SOURCES-SUMMARY', 'sum of points: 76019979744'),
              ]),
            S('R12.021.b', 'gettysburg_tile_header', 'The Gettysburg tile 18SUK309410 (13,309,519 points; a 1,500 m square: x 309000-310500, y 4410000-4411500) is recorded in NAD83(2011) / UTM zone 18N with vertical NAVD88 height; LAS 1.4, point data format 6; software "LiDAR Suite"; file created in 2018, day of year 288.',
              'documented', 'supported', [
                  C('EPT-SRC-18SUK309410', 'metadata.count: 13309519'),
                  C('EPT-SRC-18SUK309410', 'metadata.minx: 309000'),
                  C('EPT-SRC-18SUK309410', 'metadata.maxx: 310499.99'),
                  C('EPT-SRC-18SUK309410', 'metadata.miny: 4410000'),
                  C('EPT-SRC-18SUK309410', 'metadata.maxy: 4411499.99'),
                  C('EPT-SRC-18SUK309410', 'COMPD_CS["NAD83(2011) / UTM zone 18N + NAVD88 height"'),
                  C('EPT-SRC-18SUK309410', 'VERT_DATUM["North American Vertical Datum 1988"'),
                  C('EPT-SRC-18SUK309410', 'metadata.major_version: 1'),
                  C('EPT-SRC-18SUK309410', 'metadata.minor_version: 4'),
                  C('EPT-SRC-18SUK309410', 'metadata.dataformat_id: 6'),
                  C('EPT-SRC-18SUK309410', 'metadata.software_id: LiDAR Suite'),
                  C('EPT-SRC-18SUK309410', 'metadata.creation_year: 2018'),
                  C('EPT-SRC-18SUK309410', 'metadata.creation_doy: 288'),
              ], note='The header gives the file creation date (2018-10-15), not the collection dates. The geoid model is not named in the WKT.'),
            S('R12.021.c', 'tile_count_conflict', 'Tile count: 4,911 source LAZ files in the AWS EPT list vs "7,975 tiles of 1,500 m" in the AmeriGEOSS record (PDF).',
              'documented', 'conflict', [
                  C('OWN-EPT-SOURCES-SUMMARY', 'source files listed: 4911'),
              ], note='The AmeriGEOSS side is the PDF text only (page refused); the two may count different deliverables or a subset; carried, not reconciled.'),
            S('R12.021.d', 'aws_bucket_projects', 'The public bucket usgs-lidar-public lists four Pennsylvania lidar projects (Allentown 2016, Dauphin 2016, South Central B1 2017 and B2 2017); no PA_17County_D24 prefix is listed.',
              'documented', 'supported', [
                  C('EPT-BUCKET-LIST-PA', '<Prefix>USGS_LPC_PA_South_Central_B1_2017_LAS_2019/</Prefix>'),
                  C('EPT-BUCKET-LIST-PA', '<Prefix>USGS_LPC_PA_South_Central_B2_2017_LAS_2019/</Prefix>'),
                  C('EPT-BUCKET-LIST-PA', '<Prefix>USGS_LPC_PA_Dauphin_2016_LAS_2017/</Prefix>'),
              ], note='Says nothing about whether D24 exists elsewhere (the first round found it on prd-tnm.s3.amazonaws.com via the TNM API).'),
            BLK('R12.021.e', 'collection_dates_and_publication', 'Collected 2017-11-21 to 2017-12-21 (leaf-off, "fall 2017, no snow"); metadata published 2018-10-26; DEM tile published 2020-03-30.',
                'First round: USGS ScienceBase item 5eacea7982cefae35a249d07 (dates array Start 2017-11-21, End 2017-12-21, Publication 2020-03-30) and the AmeriGEOSS record.'),
            BLK('R12.021.f', 'geoid_and_quality_level', 'Vertical datum NAVD88 (GEOID12B); QL2 = 10 cm RMSEz, nominal pulse spacing 0.7 m (at most 0.71 m), at least 2 pts/m2; 13 counties, 6,602 sq mi, 7,975 tiles, 150 control points and 245 checkpoints (142 NVA, 103 VVA); vendor Quantum Spatial.',
                'First round: AmeriGEOSS dataset record and the USGS quality-level table (QL2 row).'),
            BLK('R12.021.g', 'products_and_services', '1 m bare-earth DEM tiles (ScienceBase tile about 485 MB), 2-ft contours; Adams County "Contour Lines - 2 Foot" service; Rockyweb folder .../Elevation/LPC/Projects/PA_South_Central_2017_D17/PA_South_Central_B1_2017/LAZ/.',
                'First round: TNM Access API queries, ScienceBase, mapping.adamscountypa.gov.'),
            BLK('R12.021.h', 'd24_project', 'Later USGS project PA_17County_D24: LPC tiles collected 2024-12-12 to 2025-03-24 (LPC published 2026-05-04), 1 m DEM tiles published 2026-10-23 (about 330 MB each); 36 of 58 LPC tiles in the Gettysburg test box belong to it, 16 to PA_South_Central_2017_D17, 6 to a legacy set; quality level not read.',
                'First round: TNM Access API, ScienceBase item 69fbecf1..., D24 tile metadata XML.'),
        ],
        stays_unsupported=['collection dates, publication date, geoid model, QL2 figures, tile and county counts of the AmeriGEOSS record', 'the D24 project and its quality level', 'the DEM and contour products and the Adams County service'],
        conflicts_carried=['Tiles: 4,911 source files (AWS EPT list) vs 7,975 tiles (AmeriGEOSS, PDF)'],
        register_refs=['sources-a-EG-05', 'EG-0021'],
        blocked_host=[
            HOST('AmeriGEOSS', 'https://data.amerigeoss.org/dataset/south-central-pennsylvania-2017-ql2-lidar', 'Dataset description and metadata fields: dates, datums (GEOID12B), tile count, county list, control points and checkpoints, access constraints; copy verbatim.'),
            HOST('ScienceBase', 'https://www.sciencebase.gov/catalog/item/5eacea7982cefae35a249d07?format=json', 'Dates array (Start 2017-11-21, End 2017-12-21, Publication 2020-03-30) and body text; also the D24 item 69fbecf1... named in the first round.'),
            HOST('USGS-QL', 'https://www.usgs.gov/3d-elevation-program/topographic-data-quality-levels-qls', 'The QL2 row (RMSEz, point spacing, point density).'),
            HOST('TNM-Access', 'https://tnmaccess.nationalmap.gov/api/v1/products', 'LPC and 1 m DEM product queries for bbox -77.26,39.80,-77.20,39.84 (project names, dates, URLs, sizes), including PA_17County_D24 tiles on prd-tnm.s3.amazonaws.com.'),
            HOST('Adams-County-GIS', 'https://mapping.adamscountypa.gov/arcgis/rest/services/AGOL/Two_Foot_Contours/MapServer?f=json', '2-ft contour service description and copyright text.'),
        ],
        product_consequence=['terrain/elev1863 modern reference: the NAD83(2011) / UTM 18N + NAVD88 height system is documented for the 2017 tiles; GEOID12B and the collection dates stay unverified (terrain_pipeline_status.md items 3 and 7 remain open); modern ground only, never 1863'],
        lookups=['AWS EPT root, ept-build, ept-sources list (2,590,802 bytes) and the tile record for 18SUK309410: 200 (2026-11-16)', 'bucket prefix listing USGS_LPC_PA: 200 (2026-11-16)', 'data.amerigeoss.org, www.sciencebase.gov, www.usgs.gov, tnmaccess.nationalmap.gov, mapping.adamscountypa.gov robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['new: EPT-based confirmation of project size, tile geometry, datum components and LAS version; tile-count conflict; the bucket has no D24 prefix', 'dates, QL and counts moved to blocked_host'],
        notes='The project documents still say only "acquired 2017" for the collection dates.',
    ))

    # ------------------------------------------------------------------ R12.022
    rows.append(dict(
        id='R12.022',
        verdict='partially_supported',
        pdf_claim='USGS 3DEP access routes: The National Map, 3DEP Lidar Explorer, Rockyweb direct downloads, WMS/WCS dynamic DEM, 1-m seamless (S1M) COG tiles in production since mid-2025, and an AWS public dataset; https://www.usgs.gov/3d-elevation-program/about-3dep-products-services; free; "3DEP has no use restrictions".',
        corrected_claim=(
            'Partly supported. The AWS public dataset route is real and was used: the bucket usgs-lidar-public (public, listable) serves the Pennsylvania lidar projects as Entwine EPT (ept.json, ept-sources, laszip data) and answers anonymously (2026-11-16). '
            'Everything else the row says (free of charge and without use restrictions; The National Map, Lidar Explorer, Rockyweb, WMS/WCS dynamic DEM, S1M tiles since mid-2025; the live checks of the 3DEP ImageServer and the TNM Access API) comes from usgs.gov, elevation.nationalmap.gov and tnmaccess.nationalmap.gov, all refused by the proxy, and is carried as an earlier reading only.'),
        sub_claims=[
            S('R12.022.a', 'aws_public_dataset', 'USGS lidar is served from a public AWS bucket (usgs-lidar-public) as Entwine EPT: anonymous reads of ept.json, ept-build.json, ept-sources and a prefix listing succeeded; the Pennsylvania projects there are Allentown 2016, Dauphin 2016, South Central B1 2017 and B2 2017.',
              'documented', 'supported', [
                  C('EPT-ROOT', 'dataType: laszip', locator='ept.json'),
                  C('EPT-BUILD', 'software: Entwine', locator='ept-build.json'),
                  C('EPT-BUCKET-LIST-PA', '<Prefix>USGS_LPC_PA_South_Central_B1_2017_LAS_2019/</Prefix>'),
                  C('OWN-HEAD-RECORDS', 'content-length 2590802', note='HEAD of ept-sources/list.json, status 200, last-modified Fri, 06 Aug 2021'),
              ], note='This documents the route, not the USGS page text about it.'),
            BLK('R12.022.b', 'usgs_policy_and_routes', 'All 3DEP products are available, free of charge and without use restrictions; routes: GIS Data Download (The National Map), 3DEP Lidar Explorer, Rockyweb direct downloads, WMS/WCS dynamic DEM services, 1-meter seamless (S1M) 10 km by 10 km cloud-optimized GeoTIFF tiles with production in progress since mid-2025, and an AWS public dataset.',
                'First round: https://www.usgs.gov/3d-elevation-program/about-3dep-products-services (3DEP products paragraph; Source data products; Standard DEMs; 1-meter seamless S1M).'),
            BLK('R12.022.c', 'live_service_checks', 'The 3DEP ImageServer (elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer) answers JSON, the TNM Access API lists LAZ and 1 m GeoTIFF downloads with Rockyweb and S3 URLs; ImageServer copyright text dated 27 Oct 2026.',
                'First round live checks of 2026-11-04.'),
            S('R12.022.d', 's1m_tiles_looked_up', 'S1M tiles for the Gettysburg area were looked up.', 'open_gap', 'unsupported', [], note='Not looked up in either round.'),
        ],
        stays_unsupported=['USGS policy statements (free, no use restrictions)', 'all routes except the AWS public dataset', 'S1M tiles for the Gettysburg area'],
        register_refs=[],
        blocked_host=[
            HOST('USGS-3DEP', 'https://www.usgs.gov/3d-elevation-program/about-3dep-products-services', 'The 3DEP products paragraph ("free of charge and without use restrictions"), the list of access routes and the S1M paragraph; copy verbatim.'),
            HOST('3DEP-ImageServer', 'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer?f=json', 'Service description and copyright text (live check).'),
            HOST('TNM-Access', 'https://tnmaccess.nationalmap.gov/api/v1/products', 'Product query results (live check) for the Gettysburg bounding box.'),
        ],
        product_consequence=['fetch routes already scripted in the project (basemap1863 fetch_ref.py, build-terrain.py) use these services; they are not reachable from the build container: record the route as "owner machine only" except the AWS EPT'],
        lookups=['usgs.gov, elevation.nationalmap.gov, tnmaccess.nationalmap.gov robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['the USGS policy and route statements moved to blocked_host; the AWS route re-verified live'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.0000
    allrows = rows_a.ROWS(prev) + rows_b.ROWS(prev) + rows_d.ROWS(prev) + rows
    verdicts = {}
    for r in allrows:
        verdicts.setdefault(r['verdict'], []).append(r['id'])
    nblocked = sum(1 for r in allrows if any(sc['support'] == 'blocked_host' for sc in r['sub_claims']))
    vtxt = '; '.join('%s %d (%s)' % (k, len(v), ', '.join(i.split('.')[1] for i in v)) for k, v in sorted(verdicts.items()))
    rows.append(dict(
        id='R12.0000',
        verdict='partially_supported',
        pdf_claim='Top-level acceptance for the terrain source catalog, first half (items 1-22; items 23-45 are shard sources-b): every item passes or links to an open register entry with an active reconstruction.',
        corrected_claim=(
            'NOT MET for this slice, by design, and nothing is marked passing. After the 2026-11-16 re-check of items 1-22 the verdicts are: %s. ' % vtxt +
            'Every item that is not confirmed links to a proposed register entry (sources-a-EG-01..12) or is recorded as not used. '
            'Most remaining gaps are access gaps: %d of the 22 rows carry at least one sub-claim whose only page is on a host the proxy refuses (xyht, Smithsonian, Spokesman, Esri, NARA blog, NHHS, W&M, UMN/BTAA, ACHS, Rumsey, Stone Sentinels, GeoCue, AmeriGEOSS, ScienceBase, USGS, TNM, Adams County GIS, IRMA, Wayback, the Game-Labs forum), each listed with the exact URL and what to read. ' % nblocked +
            'The ground-surface sources actually in use are Warren LOC 99448794 and the 2017 USGS lidar; the route to higher trusted coverage (48 anchors, 14.2 percent of the sheet) is the Warren 1:2400 extract (LOC 99446453), the NARA scans (owner act) and the Atlas plate 95.'),
        sub_claims=[
            S('R12.0000.a', 'verdict_counts', 'Verdicts of items R12.001-R12.022 after the re-check: ' + vtxt + '.', 'inferred', 'derived', [], computation='counted from the rows of this file'),
            S('R12.0000.b', 'ground_surface_in_use', 'The terrain pipeline uses LOC 99448794 (Warren, 1:12,000) as the master base and the 2017 USGS lidar (EPT, 3DEP DEM) as modern reference.',
              'inferred', 'partial', [
                  C('PROJ-BASEMAP-README', 'Warren survey 1868-69/1873** (LOC 99448794) | **Yes, the master base**', note='project README, section 1 table'),
                  C('PROJ-TERRAIN-STATUS', '2017 point cloud via EPT: `USGS_LPC_PA_South_Central_B1_2017_LAS_2019` on the AWS bucket `usgs-lidar-public`'),
              ], note='Project documents of this repository (own measurements and notes), not sources.'),
            S('R12.0000.c', 'trusted_coverage', 'The trusted Warren surface covers 14.2 percent (9.92 km2) of the 69.83 km2 sheet; of 48 label anchors only 17 can be predicted from the others; the Warren surface should not be tiered "documented" for 1863.',
              'inferred', 'partial', [
                  C('PROJ-ELEV-NOTES', '**14.2 percent (9.92 km2)**'),
                  C('PROJ-ELEV-NOTES', 'of 48 anchors only 17 can be predicted from the others'),
                  C('PROJ-ELEV-NOTES', 'The Warren surface should **not** be tiered "documented" for 1863 under the Law item 4'),
              ], note='Project measurement (elev1863), not a source statement.'),
            S('R12.0000.d', 'acceptance_test', 'Each item either passes or links to an open register entry with an active reconstruction.', 'open_gap', 'unsupported', [], note='Not satisfied until the integrator merges proposed-register/ and the blocked pages are read; no gate is touched by this shard (Q16 and Q25 depend on other workstreams).'),
        ],
        stays_unsupported=['the acceptance test itself', 'all blocked_host items listed in the rows'],
        register_refs=['sources-a-EG-01', 'sources-a-EG-02', 'sources-a-EG-03', 'sources-a-EG-04', 'sources-a-EG-05', 'sources-a-EG-06', 'sources-a-EG-07', 'sources-a-EG-08', 'sources-a-EG-09', 'sources-a-EG-10', 'sources-a-EG-11', 'sources-a-EG-12'],
        blocked_host=[],
        product_consequence=['see the request note bt-evidence-sources-a-world-content.md for the terrain_sources.json and terrain-provenance changes'],
        lookups=['host probes of 2026-11-16: 20 previously refused hosts probed once each (robots.txt): all still refused by the proxy'],
        changes_vs_previous=['counts replaced by the verdicts above; two new register entries (EG-11 blocked pages, EG-12 PDF catalogue corrections)'],
        notes='',
    ))
    return rows
