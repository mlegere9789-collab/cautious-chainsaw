"""rows R12.005 - R12.011 (W&M finding aid, NHHS papers, Cope, Hopkins, Michler, other RG 77 items, LOC collection)"""
from rowlib import C, S, BLK, HOST

LOC_RIGHTS = 'free to use and reuse unless a Rights Advisory statement is present that indicates otherwise'
LOC_CREDIT = 'Credit Line: Library of Congress, Geography and Map Division.'
NARA_BLOG = 'https://unwritten-record.blogs.archives.gov/2018/07/03/mapping-the-battle-of-gettysburg/'


def ROWS(prev):
    rows = []

    # ------------------------------------------------------------------ R12.005
    rows.append(dict(
        id='R12.005',
        verdict='unsupported',
        pdf_claim='Bachelder day-by-day 1876 sheets, W&M special collections: finding-aid entries (July 2 archival_objects/212965, July 3 archival_objects/212966); listing only; whether images are online was not confirmed; R2.',
        corrected_claim=(
            'Unsupported from here: the William & Mary finding-aid pages cannot be read (HTTP 403 on 2026-11-04 on the owner\'s machine; the host is refused by the proxy on 2026-11-13 and 2026-11-16), '
            'so the existence and content of the two entries, and whether images are online, stay unverified PDF statements. '
            'What reachable sources establish: Bachelder\'s 1876 map exists as three day-by-day sheets ("First day\'s battle. Second day\'s battle. Third day\'s battle.") and all three are open at LOC 99447491 (R12.004); '
            'so the W&M entries add no terrain data that is not already in hand.'),
        sub_claims=[
            BLK('R12.005.a', 'wm_finding_aid_entries', 'The William & Mary Special Collections finding aid lists Bachelder\'s July 2 (archival_objects/212965) and July 3 (archival_objects/212966) 1876 sheets.',
                'First round: https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212965 returned HTTP 403 Forbidden; 212966 was not requested after the 403.'),
            S('R12.005.b', 'images_online', 'Whether the W&M entries have images online is unknown.', 'open_gap', 'unsupported', [], note='Nothing read says either way.'),
            S('R12.005.c', 'day_sheets_exist_elsewhere', 'Bachelder\'s 1876 map is issued as three day-by-day sheets, open at LOC (First, Second and Third day\'s battle).',
              'documented', 'supported', [
                  C('LOC-99447491', 'The maps are entitled: First day\'s battle. Second day\'s battle. Third day\'s battle.', locator='item.notes[2]'),
                  C('LOC-99447491', '3 maps, col., each 74 x 71 cm.', locator='item.medium'),
                  C('LOC-99447491', 'Boston, John B. Bachelder, 1876.', locator='item.created_published'),
              ], note='This does not establish that the W&M items are copies of the same print.'),
        ],
        stays_unsupported=['Existence and content of the W&M entries; whether images are online'],
        register_refs=['sources-a-EG-03'],
        blocked_host=[HOST('W&M', 'https://scrcguides.libraries.wm.edu/repositories/2/archival_objects/212965', 'Finding-aid entry for the Bachelder July 2 sheet (and .../212966 for July 3): title, date, extent, physical description, access and digital-object links; copy verbatim.')],
        product_consequence=['none: the three Bachelder sheets are used from LOC 99447491; terrain_sources.json row 5 stays "listing only, unverified"'],
        lookups=['scrcguides.libraries.wm.edu robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['unchanged (blocked); new: LOC 99447491 names the three day sheets'],
        notes='Not retried further; redundant for terrain.',
    ))

    # ------------------------------------------------------------------ R12.006
    rows.append(dict(
        id='R12.006',
        verdict='partially_supported',
        pdf_claim='Bachelder Papers 1863-1894 (10 boxes, 7 volumes; microfilm 102264), New Hampshire Historical Society: letters, copybooks, album; correspondence with veterans, maps are not the main content; finding aid; paper and microfilm; "Available for research", reproduction needs permission; not digitized; the commercial Ladd edition (3 volumes, about 2,128 pages) is copyrighted and must not be ingested or reproduced, cite only; letters were collected 10 to 30 years after the battle; R3.',
        corrected_claim=(
            'Partly supported. Documented from NPS texts: the New Hampshire Historical Society holds John B. Bachelder\'s correspondence ("Bachelder Correspondence, New Hampshire Historical Society, microfilm reel 1"), used by NPS historians; '
            'the three letters cited here date from 1866 (Col. Andrew Cowan, 20 August 1866), 1886 and 1889, so "collected 10 to 30 years after the battle" is too narrow at the early end; '
            'a published edition exists: David L. and Audrey J. Ladd, ed., The Bachelder Papers (Dayton: Morningside House, Inc., 1994). '
            'Blocked, not re-asserted: every number and access statement of the NHHS finding aid (10 boxes and 7 volumes, 7.26 linear feet, collection 1921.001, microfilm 102264, "available for research", reproduction permission) and the Ladd edition\'s "3 volumes, about 2,128 pages".'),
        sub_claims=[
            S('R12.006.a', 'holding_and_use', 'The New Hampshire Historical Society holds Bachelder\'s correspondence / papers on microfilm; NPS historians cite it (reel 1) and the "J. B. Bachelder Papers, New Hampshire Historical Society".',
              'documented', 'supported', [
                  C('NPS-COMMON-PRIDE-1', 'Bachelder Correspondence, New Hampshire Historical Society, microfilm reel 1.', note='Georg 1981, footnote to a letter of Capt. Walter Owen, 6 August 1886'),
                  C('NPS-HARMON-FARM', 'J. B. Bachelder Papers, New Hampshire Historical Society, p. 420'),
              ]),
            S('R12.006.b', 'letter_dates', 'Letters to Bachelder cited by the NPS include one of 20 August 1866 (Cowan, three years after the battle), one of 6 August 1886 (Owen) and one of 21 October 1889 (McDermott); so the collection\'s letters are not all 10 to 30 years after the battle.',
              'documented', 'supported', [
                  C('NPS-COMMON-PRIDE-2', 'Colonel Andrew Cowan, August 20, 1866 letter to John B. Bachelder, in Bachelder Correspondence, New Hampshire Historical Society, Microfilm Reel 1', note='footnote'),
                  C('NPS-COMMON-PRIDE-1', 'Captain Walter Owen, August 6, 1886, letter to John B. Bachelder, Bachelder Correspondence, New Hampshire Historical Society, microfilm reel 1.'),
                  C('NPS-COMMON-PRIDE-2', 'A. W. McDermott, October 21, 1889 letter to John B. Bachelder, in Bachelder Correspondence, New Hampshire Historical Society, Microfilm Reel 5.'),
              ], note='The finding aid\'s own date range is 1863-1894 (PDF title); not re-read.'),
            S('R12.006.c', 'ladd_edition', 'A published edition exists: David L. and Audrey J. Ladd, ed., The Bachelder Papers (Dayton: Morningside House, Inc., 1994).',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V1', 'David L. and Audrey J. Ladd, ed., The Bachelder Papers (Dayton: Morningside House, Inc., 1994), 154', note='NPS footnote citing a letter of 12 April 1884'),
              ], note='Volume count, page count and copyright status are not in any text read; the Ladd edition must not be ingested or reproduced (PDF rule, kept).'),
            BLK('R12.006.d', 'finding_aid_numbers', 'NHHS finding aid: 10 boxes and 7 volumes (7.26 linear feet); collection 1921.001; microfilm 102264; access "available for research"; permission to reproduce or publish must come from NHHS; gift of the Bachelder estate 5 July 1921; finding aid revised Feb 2020.',
                'NHHS finding aid PDF (8 pages) read in full on 2026-11-04: Extent, Access Restrictions, Copyright, Related Materials; Series 1 (4 boxes) is correspondence 1863-1894.'),
            S('R12.006.e', 'not_digitized', 'The Bachelder Papers are not digitized (PDF statement).', 'open_gap', 'unsupported', [], note='The finding aid does not say so; treat as unverified.'),
        ],
        stays_unsupported=['all NHHS finding-aid figures and access/permission statements', 'whether the papers are digitized', 'Ladd edition volumes/pages'],
        register_refs=['sources-a-EG-03'],
        blocked_host=[HOST('NHHS-finding-aid', 'https://www.nhhistory.org/NHHS/media/NHHS-Media-Library/PDFs/Finding-Aids/Bachelder_John_B-_Papers_1921-001.pdf', 'NHHS finding aid PDF (8 pages): Extent, Access Restrictions, Copyright and Conditions Governing Use, Related Materials (microfilm), series descriptions; copy verbatim.')],
        product_consequence=['none for terrain; any use of testimony from the papers must cite a legally obtained copy (the Ladd edition is copyrighted)'],
        lookups=['www.nhhistory.org robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['new: NPS texts corroborate the NHHS holding and show letter dates from 1866', 'finding-aid numbers moved to blocked_host (were "verified" from the owner-machine read)'],
        notes='No register entry (no gate depends on it).',
    ))

    # ------------------------------------------------------------------ R12.007
    rows.append(dict(
        id='R12.007',
        verdict='corrected',
        pdf_claim='Cope map, NARA E 105a-1 (survey made August to October 1863 by Emmor B. Cope on horseback): manuscript map; topography, lines and defenses; Warren\'s own annotation says it was mostly from horseback sketches based on the map of Adams County; via the NARA blog above, no direct catalog URL verified; scan, resolution not stated; "The only survey that dates from weeks after the battle, but a rapid sketch survey. The brief said 1862-63; the sources say Aug-Oct 1863, which is carried here."; R2.',
        corrected_claim=(
            'The date claim is wrong as printed and is replaced. The National Park Service Administrative History (Unrau 1991) says: "After the battle Meade had detailed him to make the first survey and map of the field in October 1863", '
            'and lists "Cope, Emmor Bradley. \'Battlefield of Gettysburg, Pa., 1st, 2nd, & 3rd of July, 1863.\' (October 1863)"; Georg (NPS, 1981) calls it "E. B. Cope\'s \'horseback\' survey map of the battlefield in October 1863" and the Little Round Top CLR names it the "Cope (horseback survey)". '
            'So the map is dated October 1863; no reachable source gives "August" for Cope. The words "August ... 1863" belong to a different map: an NPS study says S. G. Elliott\'s map was "surveyed sometime between August and November of 1863". '
            'Further documented: the Cope map shows lines of breastworks (NPS-EISE-CLR1, Fig. 1.3, "1863 Cope Map indicating line of breastworks"; the NPS Record of Treatment: "The Cope Map depicts a Confederate redoubt on the high point at the western edge of Houck Field"); '
            'a post-battle map "based on survey by Major E. B. Cope" is reproduced in an NPS report from the Atlas to accompany the Official Records, plate XL (Roman numeral for 40; the Atlas index lists a Gettysburg map on plate 40, map 2, and credits Warren: the link of the NPS detail to map 2 is an inference); '
            'the park holds a copy of Cope\'s map from RG 77 at NARA ("Copy on file ... Archives"); LOC 99447498 is a blue-print "Gettysburg battlefield" by Cope and Hewitt dated 1863 (1 print, blue, with Confederate positions hand col. in red, 44 x 26 cm, scale ca. 1:26,000). '
            'Not established: that LOC 99447498 is the same work as NARA E 105a-1; the NAID 176246318; Warren\'s annotation text ("mostly from horseback sketches based on the map of Adams County"); the scan itself.'),
        sub_claims=[
            S('R12.007.a', 'date_of_cope_survey', 'Cope made the first survey and map of the field in October 1863 on Meade\'s detail; the map is dated October 1863 ("horseback" survey). "August to October 1863" is not supported for Cope.',
              'documented', 'supported', [
                  C('NPS-ADHI', 'After the battle Meade had detailed him to make the first survey and map of the field in October 1863.', note='Unrau 1991, narrative on the Commission of 1893 (Cope had been "a topographer at Meade\'s headquarters at Gettysburg")'),
                  C('NPS-ADHI', 'Cope, Emmor Bradley. "Battlefield of Gettysburg, Pa., 1st, 2nd, & 3rd of July, 1863." (October 1863).', note='Unrau 1991, bibliography, MAPS'),
                  C('NPS-COMMON-PRIDE-1', 'This breastwork of rails appeared on E. B. Cope\'s "horseback" survey map of the battlefield in October 1863', note='Georg 1981'),
                  C('NPS-CLR-LRT', '1863 surveys and work of Bachelder (isometric map) and Cope (horseback survey)'),
              ]),
            S('R12.007.b', 'august_window_belongs_to_elliott', 'The window "between August and November of 1863" is given by the NPS for S. G. Elliott\'s battlefield map, not for Cope\'s.',
              'documented', 'supported', [
                  C('NPS-HARMON-FARM', 'the map of the battlefield by S. G. Elliott, surveyed sometime between August and November of 1863', note='Georg Harrison 1991, Harmon farm study'),
              ], note='This is the likely origin of the PDF\'s "Aug-Oct 1863"; an inference about the PDF\'s source, not asserted.'),
            S('R12.007.c', 'loc_cope_hewitt_print', 'LOC 99447498, "Gettysburg battlefield" [S.l., 1863], Cope, Emmor B., and Hewitt, Edgar M.: 1 print, blue, with Confederate positions hand col. in red, 44 x 26 cm; shows troops and artillery points, drainage, roads, railroads, dwellings with names of occupants, a few of the highest points by hachures; scale ca. 1:26,000; LC Civil War Maps (2nd ed.), 330; JP2 3098 x 5100 px (2,390,352 bytes), TIFF 47,417,036 bytes.',
              'documented', 'supported', [
                  C('LOC-99447498', 'Gettysburg battlefield', locator='item.title'),
                  C('LOC-99447498', '[S.l., 1863]', locator='item.created_published'),
                  C('LOC-99447498', '1 print, blue, with Confederate positions hand col. in red, 44 x 26 cm.', locator='item.medium'),
                  C('LOC-99447498', 'Shows troops and artillery points, drainage, roads, railroads, dwellings with names of occupants, several points of interest on the battlefield, and a few of the highest points by hachures.', locator='item.notes[1]'),
                  C('LOC-99447498', 'Scale ca. 1:26,000.', locator='item.notes[3]'),
                  C('LOC-99447498', 'LC Civil War Maps (2nd ed.), 330', locator='item.notes[4]'),
                  C('LOC-99447498', 'item.library_of_congress_control_number: 99447498', locator='LCCN'),
                  C('LOC-99447498', 'width: 3098', locator='resources JP2'),
                  C('LOC-99447498', 'height: 5100', locator='resources JP2'),
                  C('LOC-99447498', 'size: 2390352', locator='resources JP2'),
                  C('LOC-99447498', 'size: 47417036', locator='resources TIFF'),
                  C('LOC-99447498', LOC_RIGHTS, locator='item.rights'),
              ]),
            S('R12.007.d', 'what_the_cope_map_shows', 'The Cope map of 1863 shows lines of breastworks and a Confederate redoubt at the western edge of Houck Field; the NPS treats it as a source for woods, fences and orchards.',
              'documented', 'supported', [
                  C('NPS-EISE-CLR1', 'Figure 1.3. 1863 Cope Map indicating line of breastworks across the eastern boundaries of the present-day Eisenhower NHS.'),
                  C('NPS-CLR-ROT-V2', 'The Cope Map depicts a Confederate redoubt on the high point at the western edge of Houck Field.'),
                  C('NPS-CLR-1STDAY', 'Post-battle map based on survey by Major E. B. Cope showing topography of the 1st Corps field.', note='caption; source line "Atlas to Accompany the Official Records ... 1895, Plate XL"'),
              ], note='Post-battle (October 1863) evidence of earthworks and rail breastworks, not an 1863 pre-battle state.'),
            S('R12.007.e', 'copy_at_nara', 'The park holds a copy of Cope\'s "Battlefield of Gettysburg, Pa., 1st, 2nd, & 3rd of July, 1863" taken from RG 77 at the National Archives.',
              'documented', 'partial', [
                  C('NPS-CLR-LRT', 'Cope, Emmor B. [Map of] Ba leﬁeld of Ge ysburg, Pa., 1st, 2nd, & 3rd of July, 1863. RG 77', note='bibliography, Maps and Drawings; OCR of the PDF drops "tt" and "ti" ligatures'),
              ], note='The entry E 105a-1 and NAID 176246318 are not in this text.'),
            BLK('R12.007.f', 'nara_e105a1_and_warren_annotation', 'NARA E 105a-1 (NAID 176246318) carries Warren\'s annotation: Cope made it mostly from horseback sketches based on the map of Adams County.',
                'NARA blog caption "Map E 105a-1" with NAID 176246318 and the paragraph transcribing Warren\'s annotation.'),
            S('R12.007.g', 'identity_loc_vs_nara', 'LOC 99447498 and NARA E 105a-1 are the same work.', 'open_gap', 'unsupported', [], note='Both credit Cope; the LOC print is 44 x 26 cm at about 1:26,000 with Hewitt as co-creator; no text read equates them.'),
        ],
        stays_unsupported=['"August" as a start of Cope\'s fieldwork (no source)', 'NAID 176246318 and Warren\'s annotation text (NARA blog only)', 'whether LOC 99447498 = NARA E 105a-1', 'the map image (no scan of E 105a-1; LOC 99447498 not downloaded)'],
        conflicts_carried=['Cope survey date: PDF "August to October 1863" vs NPS "October 1863" (Elliott: "between August and November of 1863")'],
        register_refs=['sources-a-EG-02', 'sources-a-EG-12'],
        blocked_host=[HOST('NARA-blog', NARA_BLOG, 'Caption and paragraph on E 105a-1 (NAID 176246318): Warren\'s annotation on the Cope map (horseback sketches, map of Adams County) and any date it gives; copy verbatim.')],
        product_consequence=[
            'terrain_sources.json row 7: replace "survey made August to October 1863" by "map dated October 1863 (NPS Administrative History); fieldwork window not stated"; keep the Aug-Nov window with Elliott (row 10)',
            'earthworks and rail breastworks: the Cope map (October 1863) and the Elliott map (surveyed 1863) are post-battle documentary evidence of lines (NPS captions); they may corroborate where built works stood after 3 July but never show a pre-battle state; no construction animation may be derived from them (standing rule: works are built on screen in the sourced window)',
        ],
        lookups=['LOC collection query contributor Cope, Emmor B.: 200 (2026-11-13), 4 items (99447498, 99448795, 99447497, 2007630416)', 'NPS library texts (tmp/library/web/nps) searched for Cope, horseback, Elliott, E81, RG 77'],
        changes_vs_previous=['gap -> corrected: the date is October 1863 (NPS), not August to October', 'new: the Aug-Nov 1863 window is Elliott\'s; Cope map shows breastworks; plate XL of the Atlas reproduces a Cope-based map'],
        notes='The first round could not support the dates and left a gap; the gap about the start of fieldwork stands, the date of the map is now documented.',
    ))

    # ------------------------------------------------------------------ R12.008
    rows.append(dict(
        id='R12.008',
        verdict='partially_supported',
        pdf_claim='Hopkins, "Map of Adams Co., Pennsylvania" 1858 (Converse, Philadelphia), LOC call no. G3823.A3 1858 .H6, LOC 2004629149: hand-colored county map, hachured relief, Gettysburg inset; landowner names, roads, farm locations five years before the battle; IIIF; scale not listed; 92 x 129 cm; free; small scale; hachures, not measured contours; name index at ACHS; R2; Warren\'s Cope annotation says Cope\'s sketches were based on it.',
        corrected_claim=(
            'Confirmed for the LOC copy: "Map of Adams Co., Pennsylvania", Philadelphia: M.S. & E. Converse, Publishers, 1858; 1 map : hand col.; 92 x 129 cm; call no. G3823.A3 1858 .H6; contributors Hopkins, Griffith Morgan, Jr; Smith, Robert Pearsall (1827-1898); M.S. & E. Converse; '
            '"Relief shown by hachures."; copyright entries 1857 (Smith) and 1858 (Converse); JP2 16639 x 11740 px (29,588,681 bytes), TIFF master 586,043,720 bytes; free to use (no Rights Advisory). '
            'NPS corroboration of its use: the First Day CLR uses a detail of "G. M. Hopkins, Map of Adams County, Pennsylvania, 1858" for "roads, farms, and the Seminary by 1858" and the Cemetery CLR for the borough and property ownership. '
            'Project measurement (not a source): the Gettysburg borough inset is georeferenced with leave-one-out 2.9 m; the county sheet only to 376 m. '
            'Not read: the Adams County Historical Society name index (gettysburghistory.org refused) and Warren\'s Cope annotation (NARA blog); that Cope\'s sketches were based on Hopkins\' map is therefore unverified.'),
        sub_claims=[
            S('R12.008.a', 'identity', 'LOC 2004629149: "Map of Adams Co., Pennsylvania", Philadelphia : M.S. & E. Converse, Publishers, 1858; 1 map : hand col. ; 92 x 129 cm; G3823.A3 1858 .H6; Hopkins, Griffith Morgan, Jr; Smith, Robert Pearsall; relief shown by hachures; copyright entries 1857 (Smith) and 1858 (Converse).',
              'documented', 'supported', [
                  C('LOC-2004629149', 'Map of Adams Co., Pennsylvania', locator='item.title'),
                  C('LOC-2004629149', 'Philadelphia : M.S. & E. Converse, Publishers, 1858', locator='item.created_published'),
                  C('LOC-2004629149', '1 map : hand col. ; 92 x 129 cm.', locator='item.medium'),
                  C('LOC-2004629149', 'G3823.A3 1858 .H6', locator='item.call_number'),
                  C('LOC-2004629149', 'Hopkins, Griffith Morgan, Jr', locator='item.contributors'),
                  C('LOC-2004629149', 'Smith, Robert Pearsall, 1827-1898', locator='item.contributors'),
                  C('LOC-2004629149', 'Relief shown by hachures.', locator='item.notes[0]'),
                  C('LOC-2004629149', '"Entered according to act of Congress in the year 1857 by Robert P. Smith..."', locator='item.notes[1]'),
                  C('LOC-2004629149', '"Entered according to act of Congress in the year 1858 by M.S & E. Converse..."', locator='item.notes[2]'),
                  C('LOC-2004629149', 'item.library_of_congress_control_number: 2004629149', locator='LCCN'),
              ]),
            S('R12.008.b', 'image_and_rights', 'JP2 16639 x 11740 px (29,588,681 bytes); TIFF master 586,043,720 bytes; free to use unless a Rights Advisory is present (none); credit line Library of Congress, Geography and Map Division.',
              'documented', 'supported', [
                  C('LOC-2004629149', 'width: 16639', locator='resources JP2'),
                  C('LOC-2004629149', 'height: 11740', locator='resources JP2'),
                  C('LOC-2004629149', 'size: 29588681', locator='resources JP2'),
                  C('LOC-2004629149', 'size: 586043720', locator='resources TIFF'),
                  C('LOC-2004629149', LOC_RIGHTS, locator='item.rights'),
              ]),
            S('R12.008.c', 'nps_use', 'The NPS uses the Hopkins 1858 map for roads, farms and the Seminary by 1858 (First Day CLR, from the Pennsylvania State Archives copy) and for the borough and property ownership (Cemetery CLR).',
              'documented', 'supported', [
                  C('NPS-CLR-1STDAY', 'Map of Adams County showing roads, farms, and the Seminary by 1858.'),
                  C('NPS-CLR-1STDAY', '(Detail, G. M. Hopkins, “Map of Adams County, Pennsylvania,” 1858, Pennsylvania State Archives/PHMC map #22, annotated by SUNY ESF)'),
                  C('NPS-CLR-CEMETERY', 'Hopkins, Map of Adams County, 1858', note='source line of a figure on the borough and property ownership by 1863'),
              ]),
            S('R12.008.d', 'project_georeference', 'The Gettysburg borough inset is georeferenced by an affine on 8 street junctions (fit RMSE 1.9 m, leave-one-out 2.9 m, max 4.2 m); extrapolation beyond the borough untested; the county sheet is not usable for position (leave-one-out 376 m).',
              'inferred', 'derived', [
                  C('PROJ-BASEMAP-README', 'affine on 8 street junctions: fit RMSE 1.9, **leave-one-out 2.9** (max 4.2).', note='project measurement, docs/basemap1863/maps/README.md section 1'),
              ], computation='project measurement (leave-one-out over 8 control points); not a source statement'),
            BLK('R12.008.e', 'achs_name_index', 'A name index of the Hopkins map is held by the Adams County Historical Society (https://gettysburghistory.org/our-holdings/).',
                'First round: HTTP 403 on https://gettysburghistory.org/our-holdings/; the index was not read.'),
            BLK('R12.008.f', 'cope_based_on_hopkins', 'Warren\'s annotation on the Cope map says Cope\'s sketches were based on "the map of Adams County" (read as the Hopkins map).',
                'NARA blog transcription of Warren\'s annotation; which Adams County map is meant was not stated in the shard\'s reading.'),
        ],
        stays_unsupported=['ACHS name index', 'that Cope used the Hopkins map (and not another Adams County map)'],
        register_refs=[],
        blocked_host=[
            HOST('ACHS', 'https://gettysburghistory.org/our-holdings/', 'Adams County Historical Society holdings page: the name index of the 1858 Hopkins map (title, extent, how to use).'),
            HOST('NARA-blog', NARA_BLOG, 'Caption E 105a-1: Warren\'s annotation naming the map of Adams County as the base of Cope\'s sketches.'),
        ],
        product_consequence=['terrain/roadconc and the 1858 borough layers: keep the borough inset (2.9 m) as the only positional use; county sheet for names, owners and which villages and roads existed only'],
        lookups=['gettysburghistory.org robots.txt: proxy refusal (2026-11-13, 2026-11-16)'],
        changes_vs_previous=['new: NPS First Day CLR and Cemetery CLR use the Hopkins map (independent corroboration of its content)', 'image sizes and rights re-matched in the saved record of 2026-11-13'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.009
    rows.append(dict(
        id='R12.009',
        verdict='confirmed',
        pdf_claim='Michler item at LOC (g3880.cw0508800): reduced map from the 1869 Military Maps atlas; Gettysburg-to-Appomattox route map; image; reduced; free; not a Gettysburg battlefield sketch; do not use as terrain; listed so no one confuses it with a battlefield source; Not used.',
        corrected_claim='Confirmed. LOC g3880.cw0508800 is "Map of the region between Gettysburg, Pa. and Appomattox court house, Va. : including all the battle-fields [sic] of the Army of Northern Virginia", Michler, N. (Nathaniel), 1827-1881, [S.l. : s.n., 186-], 1 map : photocopy pos. ; 64 x 40 cm, relief by hachures, a "reduced and redrawn version of the index map" of the 1869 Military Maps atlas; it shows "cities and towns, roads, railroads, drainage, and defensive works in the vicinity of Richmond and Petersburg". It is not a Gettysburg battlefield map and is excluded from terrain.',
        sub_claims=[
            S('R12.009.a', 'identity', 'LOC g3880.cw0508800 is Michler\'s "Map of the region between Gettysburg, Pa. and Appomattox court house, Va. : including all the battle-fields [sic] of the Army of Northern Virginia", call no. G3880 186- .M5, [S.l. : s.n., 186-], 1 map : photocopy pos. ; 64 x 40 cm; relief shown by hachures.',
              'documented', 'supported', [
                  C('LOC-G3880', 'Map of the region between Gettysburg, Pa. and Appomattox court house, Va. : including all the battle-fields [sic] of the Army of Northern Virginia', locator='item.title'),
                  C('LOC-G3880', 'Michler, N. (Nathaniel), 1827-1881', locator='item.contributors'),
                  C('LOC-G3880', 'G3880 186- .M5', locator='item.call_number'),
                  C('LOC-G3880', '1 map : photocopy pos. ; 64 x 40 cm.', locator='item.medium'),
                  C('LOC-G3880', 'Relief shown by hachures.', locator='item.notes[0]'),
                  C('LOC-G3880', 'g3880.cw0508800', locator='resource id'),
              ]),
            S('R12.009.b', 'derivation_and_content', 'It is a reduced and redrawn version of the index map of the War Department atlas "Military Maps Illustrating the Operations of the Armies of the Potomac & James" (Office of the Chief of Engineers, 1869) and indicates cities, roads, railroads, drainage and defensive works near Richmond and Petersburg: a campaign route map, not a Gettysburg battlefield source.',
              'documented', 'supported', [
                  C('LOC-G3880', 'Reduced and redrawn version of the index map in the U.S. Army, Corps of Engineer\'s Military Maps Illustrated the Operations of the Armies of the Potomac & James... ([Washington] War Dept., Office of the Chief of Engineers, 1869).', locator='item.notes[1]'),
                  C('LOC-G3880', 'Map indicates cities and towns, roads, railroads, drainage, and defensive works in the vicinity of Richmond and Petersburg.', locator='item.notes[2]'),
              ], note='The exclusion from terrain is a project decision resting on these statements.'),
            S('R12.009.c', 'rights', 'Free to use and reuse unless a Rights Advisory is present (none in the record).', 'documented', 'supported', [C('LOC-G3880', LOC_RIGHTS, locator='item.rights')]),
        ],
        stays_unsupported=[],
        register_refs=[],
        blocked_host=[],
        product_consequence=['terrain_sources.json row 9: unchanged ("not used"); the item must never enter terrain/ as ground data'],
        lookups=['LOC resource JSON g3880.cw0508800: 200 (2026-11-13)'],
        changes_vs_previous=['none; quotes re-matched in the saved record'],
        notes='Closed.',
    ))

    # ------------------------------------------------------------------ R12.010
    rows.append(dict(
        id='R12.010',
        verdict='partially_supported',
        pdf_claim='Other RG 77 items described by NARA: Elliot\'s annotated map (graves, dead horses, defenses, field hospitals, Camp Letterman) and a large oval "Battlefield of Gettysburg, Pa" (roads and farms, oriented west at top); manuscript maps; post-battle features: burial and hospital positions, defenses; NARA blog; catalog IDs not retrieved; valuable for B.7 and B.8 hospital and defense placement; R2.',
        corrected_claim=(
            'Partly supported. The published Elliott map is at LOC 99447501 ("Map of the battlefield of Gettysburg", Elliott, S. G., New York, H. H. Lloyd & Co., 1864; 1 map col. 80 x 58 cm; scale 1:9051; inset "Plan of the National Cemetery"; JP2 7057 x 9869 px, 10,528,312 bytes; TIFF 208,954,208 bytes; free to use). '
            'NPS texts document what it shows and when: it shows Union and Confederate burials "as surveyed in 1863" and "the lines of Confederate breastworks along Oak Ridge and Seminary Ridge"; the NPS dates its survey "sometime between August and November of 1863"; David Wills reviewed it as "a reliable map, made from instrumental survey of the field". '
            'Spelling: LOC and NPS write "Elliott". Blocked, not re-asserted: the NARA catalog IDs (E 73 (1) NAID 17370358, E 73 (2) NAID 6860337, E 72 (1) NAID 305570), the descriptions of the two annotated NARA maps, and that NARA E 73 is an annotated copy of the 1864 Lloyd print.'),
        sub_claims=[
            S('R12.010.a', 'loc_elliott_identity', 'LOC 99447501: "Map of the battlefield of Gettysburg", Elliott, S. G., New York H. H. Lloyd & Co. 1864; 1 map col. 80 x 58 cm; scale 1:9051; inset "Plan of the National Cemetery"; call no. G3824.G3S5 1863 .E5; LC Civil War Maps (2nd ed.), 333; JP2 7057 x 9869 px (10,528,312 bytes); TIFF 208,954,208 bytes.',
              'documented', 'supported', [
                  C('LOC-99447501', 'Map of the battlefield of Gettysburg', locator='item.title'),
                  C('LOC-99447501', 'Elliott, S. G.', locator='item.contributors'),
                  C('LOC-99447501', 'New York H. H. Lloyd & Co. 1864.', locator='item.created_published'),
                  C('LOC-99447501', '1 map col. 80 x 58 cm.', locator='item.medium'),
                  C('LOC-99447501', 'Inset: Plan of the National Cemetery.', locator='item.notes[0]'),
                  C('LOC-99447501', 'Scale 1:9051.', locator='item.notes[2]'),
                  C('LOC-99447501', 'G3824.G3S5 1863 .E5', locator='item.call_number'),
                  C('LOC-99447501', 'LC Civil War Maps (2nd ed.), 333', locator='item.notes[4]'),
                  C('LOC-99447501', 'item.library_of_congress_control_number: 99447501', locator='LCCN'),
                  C('LOC-99447501', 'width: 7057', locator='resources JP2'),
                  C('LOC-99447501', 'height: 9869', locator='resources JP2'),
                  C('LOC-99447501', 'size: 10528312', locator='resources JP2'),
                  C('LOC-99447501', 'size: 208954208', locator='resources TIFF'),
                  C('LOC-99447501', LOC_RIGHTS, locator='item.rights'),
              ]),
            S('R12.010.b', 'what_the_elliott_map_shows', 'The Elliott map shows burial trenches (Union and Confederate) and lines of Confederate breastworks along Oak Ridge and Seminary Ridge, as surveyed in 1863; the NPS uses it for the approximate location of battlefield burials.',
              'documented', 'supported', [
                  C('NPS-CLR-1STDAY', 'Detail of the 1864 Elliott map of the Gettysburg Battlefield showing Union and Confederate burials on the First Day Union 1st Corps field as surveyed in 1863, and the lines of Confederate breastworks along Oak Ridge and Seminary Ridge.'),
                  C('NPS-CLI-1STDAY', 'The approximate location of the battlefield burials is known based on the ca. 1864 Elliott map.'),
              ], note='Post-battle state (burials, breastworks) seen in autumn 1863; not an 1863 pre-battle state.'),
            S('R12.010.c', 'elliott_survey_window_and_reliability', 'The NPS gives Elliott\'s survey window as "sometime between August and November of 1863"; David Wills reviewed the map as "a reliable map, made from instrumental survey of the field".',
              'documented', 'supported', [
                  C('NPS-HARMON-FARM', 'the map of the battlefield by S. G. Elliott, surveyed sometime between August and November of 1863'),
                  C('NPS-CLR-CEMETERY', 'was reviewed by David Wills per notes on the map “…as a reliable map, made from instrumental survey of the field…”'),
              ]),
            S('R12.010.d', 'naming_1863_1864', 'The NPS calls the same map the "1864 Elliott map" and the "1863 Elliott Map" (survey year vs publication year).',
              'documented', 'supported', [
                  C('NPS-CLR-ROT-V2', '1863 Elliott Map, 1872 topographical survey map'),
                  C('NPS-CLR-1STDAY', 'Detail of the 1864 Elliott map of the Gettysburg Battlefield'),
              ], note='Both labels are carried; the product should print "surveyed 1863, published 1864".'),
            BLK('R12.010.e', 'nara_rg77_items', 'NARA RG 77 holds an annotated Elliott(t) map in two halves (E 73 (1) NAID 17370358: northern half with Camp Letterman marked "General Hospital" and burials; E 73 (2) NAID 6860337: southern half with July 2-3 ground, field hospitals, graves, dead horses, defences) and a large oval "Battlefield of Gettysburg, Pa" (E 72 (1) NAID 305570, roads and farms, oriented west at top).',
                'NARA blog captions with the NAIDs and the paragraphs on E 73 and E 72 (1); scans not obtained.'),
            S('R12.010.f', 'nara_e73_is_copy_of_lloyd_print', 'NARA E 73 is an annotated copy of the same 1864 Lloyd print.', 'open_gap', 'unsupported', [], note='Likely but not stated anywhere read; not asserted.'),
        ],
        stays_unsupported=['NARA NAIDs and descriptions of E 73 and E 72 (1)', 'whether E 73 is an annotated Lloyd print'],
        register_refs=[],
        blocked_host=[HOST('NARA-blog', NARA_BLOG, 'Captions and paragraphs on E 73 (1), E 73 (2) and E 72 (1): NAIDs, what each half shows, orientation; copy verbatim.')],
        product_consequence=[
            'hospitals, graves and Camp Letterman placement (PDF B.7/B.8): use the Elliott map via LOC 99447501 (documented as surveyed 1863) and the NPS statements above; the NARA annotated copies stay unread',
            'earthworks: the Confederate breastwork lines on Oak and Seminary Ridges seen on the Elliott map are post-battle (autumn 1863) evidence; they may corroborate a line, not a construction date',
        ],
        lookups=['LOC item JSON 99447501: 200 (2026-11-13)'],
        changes_vs_previous=['new: NPS documents what the Elliott map shows and its survey window (August to November 1863)', 'NARA IDs and descriptions moved to blocked_host'],
        notes='',
    ))

    # ------------------------------------------------------------------ R12.011
    rows.append(dict(
        id='R12.011',
        verdict='corrected',
        pdf_claim='LOC Civil War Maps collection: about 2,240 maps and charts, 76 atlases and sketchbooks, plus Hotchkiss 341 manuscript maps and sketchbooks, and Sherman; 130 hits for "gettysburg"; Bachelder, John B. is a contributor on 10 of them; IIIF/GIF; free to use unless an item carries a rights advisory (none on sampled items); Hotchkiss Gettysburg-specific maps, Sickles/Meade headquarters sketches and a map attributed to a "Lt. Edwin Whitney" were not found or verified; treat the Whitney name as unverified; R2.',
        corrected_claim=(
            'Confirmed: the collection query q=gettysburg returns 130 results; the contributor facets read Sneden, Robert Knox 16; Gettysburg National Military Park Commission 11; Bachelder, John B. 10; United States. Army. Corps of Engineers 8; Cope, Emmor B. 4. '
            'Corrected: (1) the collection count shown on item records is 2,338 (the PDF\'s "about 2,240" is out of date); (2) Hotchkiss Gettysburg maps ARE in the collection: 2005625069 "[Sketch of the battlefield of Gettysburg, July 1st and 2nd, 1863]" (48 x 38 cm, Hotchkiss Map Collection rights text), 2005625067 and 2005625066 (preliminary sketches with troop positions, July 2, 1863), and Hotchkiss route maps 2005625065 and 2005625068 (credited to Hotchkiss, Jedediah); the Official Records also document Hotchkiss\'s "map of the battle-field of Gettysburg" (sent with Ewell\'s report, part 2, p. 452), though which LOC sheet it is stays unstated; '
            '(3) no map by any Whitney of Gettysburg exists in the collection: q=whitney gives one item, William H. Whitney\'s lower Shenandoah Valley map, and q=edwin whitney gives zero; the "Lt. Edwin Whitney" name has no support; '
            '(4) no Sickles or Meade headquarters sketch was found: q=sickles+headquarters+gettysburg and q=meade+headquarters+gettysburg give zero; q=sickles gives nine items (Sneden\'s Third Corps plans among them), q=headquarters+gettysburg six, none such a sketch. '
            'Items 2005625069 and the Hotchkiss collection carry a different rights text (noncommercial, educational and research purposes; written permission may be needed beyond fair use); treat Hotchkiss items as research-use until the owner decides. '
            'Not re-read: the "About this collection" page (403) and so the PDF\'s 76 atlases, 341 Hotchkiss maps and Sherman counts.'),
        sub_claims=[
            S('R12.011.a', 'hits_and_contributors', 'The collection JSON query q=gettysburg reports 130 results; contributor facet counts: Sneden, Robert Knox 16; Gettysburg National Military Park Commission 11; Bachelder, John B. (John Badger) 10; United States. Army. Corps of Engineers 8; Cope, Emmor B. 4.',
              'documented', 'supported', [
                  C('LOC-CWM-GETTYSBURG', 'pagination.of: 130', locator='collection query q=gettysburg'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[0].count: 16'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[0].title: Sneden, Robert Knox'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[1].count: 11'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[1].title: Gettysburg National Military Park Commission'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[2].count: 10'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[2].title: Bachelder, John B. (John Badger)'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[3].count: 8'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[3].title: United States. Army. Corps of Engineers'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[5].count: 4'),
                  C('LOC-CWM-GETTYSBURG', 'facets[6].filters[5].title: Cope, Emmor B.'),
              ], note='Facet lines are quoted one per line as flattened from the JSON.'),
            S('R12.011.b', 'collection_size', 'LOC item records name the collection "civil war maps" with a count of 2338.',
              'documented', 'supported', [
                  C('LOC-99446453', 'item.partof[0].count: 2338'),
                  C('LOC-99446453', 'item.partof[0].title: civil war maps'),
              ], note='The PDF\'s "about 2,240" is older; the collection grows.'),
            S('R12.011.c', 'hotchkiss_gettysburg_items', 'The query q=hotchkiss+gettysburg returns Gettysburg sketches 2005625069 ([Sketch of the battlefield of Gettysburg, July 1st and 2nd, 1863], 1 ms. map : col. ; 48 x 38 cm; LC Civil War maps 2nd ed. H162), 2005625067 and 2005625066 ([Preliminary sketch of the battle of Gettysburg showing troop positions, July 2, 1863]), and Hotchkiss route maps 2005625065 and 2005625068 (contributor Hotchkiss, Jedediah).',
              'documented', 'supported', [
                  C('LOC-CWM-HOTCHKISS', 'results[1].id: http://www.loc.gov/item/2005625069/'),
                  C('LOC-CWM-HOTCHKISS', 'results[1].title: [Sketch of the battlefield of Gettysburg, July 1st and 2nd, 1863]'),
                  C('LOC-CWM-HOTCHKISS', 'results[2].id: http://www.loc.gov/item/2005625067/'),
                  C('LOC-CWM-HOTCHKISS', 'results[2].title: [Preliminary sketch of the battle of Gettysburg showing troop positions, July 2, 1863]'),
                  C('LOC-CWM-HOTCHKISS', 'results[3].id: http://www.loc.gov/item/2005625066/'),
                  C('LOC-CWM-HOTCHKISS', 'results[4].id: http://www.loc.gov/item/2005625065/'),
                  C('LOC-CWM-HOTCHKISS', 'results[4].contributor[1]: hotchkiss, jedediah'),
                  C('LOC-CWM-HOTCHKISS', 'results[5].id: http://www.loc.gov/item/2005625068/'),
                  C('LOC-CWM-HOTCHKISS', 'results[5].contributor[0]: hotchkiss, jedediah'),
                  C('LOC-2005625069', '1 ms. map : col. ; 48 x 38 cm.', locator='item.medium'),
                  C('LOC-2005625069', 'LC Civil War maps (2nd ed.), H162', locator='item.notes'),
                  C('LOC-2005625069', 'Title and scale from Stephenson\'s Civil War maps, 1989.', locator='item.notes'),
              ], note='2005625066 and 2005625067 were not opened (only returned by the query); no individual author is stated for 2005625069, 2005625067 and 2005625066.'),
            S('R12.011.d', 'hotchkiss_rights_text', 'Item 2005625069 carries the Hotchkiss Map Collection rights text: access for noncommercial, educational and research purposes, no known U.S. copyright protection, written permission may be required for use beyond fair use; this differs from the Geography and Map Division text.',
              'documented', 'supported', [
                  C('LOC-2005625069', 'The maps in the <em>Hotchkiss Map Collection</em> were published prior to 1922', locator='item.rights'),
                  C('LOC-2005625069', 'access to these materials for noncommercial, educational, and research purposes and is not aware of any U.S. copyright protection', locator='item.rights'),
                  C('LOC-2005625069', 'Note that the written permission of the copyright owners and/or other rights holders', locator='item.rights'),
                  C('LOC-2005625069', 'item.library_of_congress_control_number: 2005625069', locator='LCCN'),
              ], note='Owner decision (R12 rights): treat as research-use until decided.'),
            S('R12.011.e', 'whitney_not_found', 'No Gettysburg map by any Whitney is in the collection: q=whitney+gettysburg and q=whitney each return one item, William H. Whitney\'s lower Shenandoah Valley map; q=edwin+whitney returns zero. The name "Lt. Edwin Whitney" has no support.',
              'documented', 'supported', [
                  C('LOC-CWM-WHITNEY1', 'pagination.of: 1', locator='q=whitney'),
                  C('LOC-CWM-WHITNEY1', 'results[0].contributor[0]: whitney, william h. (william henry)'),
                  C('LOC-CWM-EDWIN-WHITNEY', 'pagination.of: 0', locator='q=edwin whitney'),
              ], note='A negative on one LOC collection, run 2026-11-16.'),
            S('R12.011.f', 'sickles_meade_hq_not_found', 'No Sickles or Meade headquarters sketch was found: q=sickles+headquarters+gettysburg and q=meade+headquarters+gettysburg return zero; q=sickles returns nine items (Sneden Third Corps plans among them), q=headquarters+gettysburg six, none a Sickles or Meade headquarters sketch.',
              'documented', 'supported', [
                  C('LOC-CWM-SICKLES', 'pagination.of: 0', locator='q=sickles headquarters gettysburg'),
                  C('LOC-CWM-MEADE-HQ', 'pagination.of: 0', locator='q=meade headquarters gettysburg'),
                  C('LOC-CWM-SICKLES1', 'pagination.of: 9', locator='q=sickles'),
                  C('LOC-CWM-SICKLES1', 'results[0].title: Plan shewing [sic] the Rebel concentrated assault on the 3rd Corps, July 2nd'),
                  C('LOC-CWM-HQGETT', 'pagination.of: 6', locator='q=headquarters gettysburg'),
              ], note='A negative on keyword queries in one LOC collection; it does not prove no such sketch exists elsewhere.'),
            S('R12.011.g', 'loc_crawl_rules', 'LOC robots.txt disallows /search for all crawlers and sets Crawl-Delay 5; this shard requested only /item/, /resource/ and /collections/ paths, spaced above that delay.',
              'documented', 'supported', [
                  C('ROBOTS-LOC', 'Disallow: /search'),
                  C('ROBOTS-LOC', 'Crawl-Delay: 5'),
              ]),
            S('R12.011.h', 'ewell_transmits_hotchkiss_gettysburg_map', 'A Hotchkiss map of the battlefield of Gettysburg is documented in the Official Records: Lieut. Gen. Ewell\'s report sends "the accompanying maps of the campaign by Capt. Jed Hotchkiss, topographical engineer, being the map of routes to and from Gettysburg, map of the battle-field of Winchester, and map of the battle-field of Gettysburg".',
              'documented', 'supported', [
                  C('OR-27-2', 'Hotchkiss, topographical engineer, being the map of routes to and froin Gettysburg, map of the battle-field of Winchester, and map of the battle-field of (Gettysburg.', part=2, report_id='OR27-2-R467', report_author='Lieut. Gen. Richard S. Ewell', printed_page='452', page_basis='running head (tools/bt/or27_find --verify)'),
              ], note='Which of the LOC sheets (2005625069 and others) is the map Ewell sent is not stated; the LOC records name no author for 2005625069, 2005625067, 2005625066. Checked with tools/bt/or27_find.py --verify (part 2, offsets 1682982-1683075 for the longer phrase).'),
            BLK('R12.011.i', 'about_collection_counts', 'About-this-collection page: about 2,240 maps and charts, 76 atlases and sketchbooks, Hotchkiss 341 manuscript maps and sketchbooks, and Sherman.',
                'PDF statement; the page https://www.loc.gov/collections/civil-war-maps/about-this-collection/ answered HTTP 403 (refused) on 2026-11-13, as did the Hotchkiss about page.'),
        ],
        stays_unsupported=['the "About this collection" counts (76 atlases and sketchbooks; Hotchkiss 341; Sherman)', 'authorship of 2005625069, 2005625067, 2005625066 (record silent)', 'existence of Sickles/Meade headquarters sketches elsewhere'],
        register_refs=['sources-a-EG-08', 'sources-a-EG-12'],
        blocked_host=[
            HOST('LOC-about-civil-war-maps', 'https://www.loc.gov/collections/civil-war-maps/about-this-collection/', 'Collection description: counts of maps and charts, atlases and sketchbooks, the Hotchkiss and Sherman parts (loc.gov itself answers 403 to this client; read in a browser).', status='refused_http_403'),
            HOST('LOC-about-hotchkiss', 'https://www.loc.gov/collections/hotchkiss-maps/about-this-collection/', 'Hotchkiss collection description (341 manuscript maps and sketchbooks) and its rights statement.', status='refused_http_403'),
        ],
        product_consequence=['terrain_sources.json row 11: replace "about 2,240" by 2,338 (LOC item records, 2026-11-13); record the Hotchkiss Gettysburg sketches as found; drop "Lt. Edwin Whitney" (no support; zero search hits)', 'Hotchkiss items: research-use rights text; do not ship images of them without an owner decision (EG-08)'],
        lookups=['LOC collection queries run 2026-11-16: q=sickles+headquarters+gettysburg 0; q=meade+headquarters+gettysburg 0; q=edwin+whitney 0; q=sickles 9; q=whitney 1; q=headquarters+gettysburg 6', 'LOC about-this-collection pages: HTTP 403 (2026-11-13, refused, not worked around)'],
        changes_vs_previous=['new: Sickles/Meade headquarters and "Edwin Whitney" searched and not found', 'new: 2005625065/67/66/68 identified from the Hotchkiss query; collection count 2,338 re-matched'],
        notes='LOC search with several words is an AND query; single-term queries were run as well.',
    ))
    return rows
