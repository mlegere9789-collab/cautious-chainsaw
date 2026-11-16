"""writes horde/sources-a/proposed-register/sources-a-EG-01..12.md (round 2, 2026-11-16). Run with python3 -I make_register.py"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'proposed-register')
STATUS = 'proposed (shard sources-a, close-out of 2026-11-16; not yet merged into register/)'
COMMON = {
    'Review status': 'internal review only (DEC-006: no public review label)',
    'Owner decision and date': '(filled only from the Decision Log)',
}

E = []


def add(id_, title, reqs, cat, desc, why, searched, substitute, recon, tier, competing, marking, impact, owner, rec, status=STATUS):
    E.append(dict(id=id_, title=title, f=[
        ('ID', id_), ('Requirement IDs', reqs), ('Category', cat), ('Description', desc),
        ('Why literal 100% is not possible or blocked', why), ('Evidence searched', searched),
        ('Autonomous substitute applied', substitute), ('Strongest evidence-based reconstruction', recon),
        ('Confidence tier', tier), ('Competing values', competing), ('Product marking', marking),
        ('Visual and audio impact', impact), ('Review status', COMMON['Review status']),
        ('Owner decision requested', owner), ('Agent recommendation', rec), ('Status', status),
        ('Owner decision and date', COMMON['Owner decision and date'])]))


add('sources-a-EG-01', 'Warren 1:2400 large-scale sheets: LOC extract not downloaded, NARA scans not obtained; sheet-count, date and size conflicts', 'R02, R12, R13',
    'evidence missing / access',
    'LOC 99446453 (1:2400 tracing-linen extract, 121 x 72 cm, 4-ft contours, 7186 x 13687 px, JP2 13,495,108 bytes, TIFF 295,067,312 bytes; sizes re-verified on tile.loc.gov 2026-11-16) is open but has not been downloaded, read or georeferenced; the NARA originals (RG 77 entry E 81) are behind a robots.txt that disallows all crawling and an owner-side request. Conflicts carried, not resolved: sheets of the large map 4 (LOC title, NPS Administrative History) vs 25 (NPS Little Round Top CLR) vs 20 sections / "1 of 5" (xyHt, unread); date imprint 1886 vs LOC machine field 1861; size 12 ft square (1893 Commission report via NPS) vs about 13 ft (xyHt, unread). The LOC IIIF manifest URL answers 403 to this client (item and resource paths).',
    'Not literal-100% blocked: the LOC image is obtainable (tile.loc.gov answers); the NARA scans need an owner-side step; the xyHt statements need a page this container cannot reach.',
    'LOC item JSON and IIIF info.json, HEAD of JP2 and TIFF (2026-11-16); NPS Administrative History, Little Round Top CLR, Record of Treatment (local texts); catalog.archives.gov/robots.txt; shard rows R12.001, R12.002 (docs: evidence_corrections/sources-a.jsonl).',
    'Keep LOC 99448794 (1:12,000 reduction of the same survey) as master; the 1:2400 extract is the next source; no contour level is guessed.',
    'Download the LOC JP2 (13.5 MB) through the build container (tile.loc.gov is reachable), georeference it in the FFD frame, read printed contour labels beyond the 48 anchors (EG-0027), rerun elev1863; keep the three sheet-count values selectable.',
    'inferred', 'Sheets 4 / 25 / 20; date 1886 / 1861; size 12 ft / about 13 ft', 'Per-pixel provenance class 2 over every area without a trusted Warren level; the date printed as 1886 with 1861 listed as a catalogue field',
    'All terrain',
    'For the NARA scans: whether to send a request or use an account (owner-only act). Nothing else.',
    'Next terrain session: ingest LOC 99446453 (the only step that raises trusted coverage above 14.2 percent without an owner act).')

add('sources-a-EG-02', 'Cope map and the NPS 1863/1868/1872 maps: fieldwork start unknown, NARA identity unproven, 1872 map unidentified', 'R02, R12',
    'evidence missing',
    'The PDF dates the Cope survey "August to October 1863". The NPS Administrative History dates Cope\'s first survey and map to October 1863 ("After the battle Meade had detailed him to make the first survey and map of the field in October 1863") and calls it a horseback survey; no reachable source gives August. The window "between August and November of 1863" belongs to Elliott\'s map (NPS Harmon farm study). Open: whether LOC 99447498 (Cope and Hewitt, 1863) is the same work as NARA E 105a-1 (NAID 176246318); Warren\'s annotation text (NARA blog, blocked); which 1863 map (Cope, Bachelder or Elliott) and whose 1872 "topographical survey map" (NPS holds it as GETT Sheet A3; GMP credits "Bachelder (1863 and 1872)") the NPS rehabilitation page means.',
    'The sources read give the October 1863 date but neither the fieldwork start nor the NARA identifiers; the NARA blog is refused here.',
    'NPS Administrative History, Georg 1981, Little Round Top CLR, First Day CLR, Record of Treatment I and II, GMP 1999, Harmon farm study (local texts); LOC 99447498; LOC Cope query; shard rows R12.007, R12.013.',
    'The date is carried as "October 1863 (NPS); fieldwork window not stated"; "Aug-Oct 1863" is kept only as the PDF scenario, flagged unsupported.',
    'Read the NARA blog caption for E 105a-1 and the NPS Administrative History endnote 9 (Cope\'s own report if cited); look for Cope\'s 1863 report to Meade.',
    'documented (October 1863); open gap (start of fieldwork, identities)', 'PDF "August to October 1863" vs NPS "October 1863" (Elliott: August to November)',
    'Evidence-layer marker on any content derived from the Cope sketch; post-battle state only', 'Defence and line placement only',
    'None.', 'Do not spend more effort until the NARA blog page can be read (EG-11); the product text is already corrected.')

add('sources-a-EG-03', 'Failed or refused lookups: Rumsey 1895 print, UMN/BTAA Bachelder copy, W&M Bachelder entries, NHHS finding aid', 'R12',
    'blocked / lookup failed',
    'The Rumsey print URL returned 404 on the owner\'s machine (2026-11-04) and davidrumsey.com is refused here; geodata.libraries.mit.edu is robots-disallowed (probe 2026-10-20) and refused; scrcguides.libraries.wm.edu returned 403 and is refused; www.nhhistory.org is refused (the first round read the finding aid on the owner\'s machine, no verbatim quote kept). Licence, scale and image availability of these items stay unverified. Inference only: the Rumsey item (typed "Printed atlas plate", list number 1780.095) may be Atlas plate 95.',
    'Blocked by host policy; no circumvention (standing owner constraint).',
    'Lookup log lookups.jsonl (2026-11-13 and 2026-11-16 probes); LOC Bien and GNMP Commission queries; NPS texts citing the NHHS papers; shard rows R12.003 to R12.006.',
    'Use the open LOC copies of the Bachelder sheets (99447491) and Warren (99448794); none of the three items is needed for terrain.',
    'Not applicable (items not used); if a licence-bearing 1895 print is ever wanted, read the Rumsey record in a browser.',
    'plausible-procedural', 'None', 'None needed (items not used)', 'None', 'None.',
    'Do not spend more effort; revisit only with an open-network session (EG-11).')

add('sources-a-EG-04', 'NPS 1863 GIS layers and the Knowles TIN/contours: not public; method statements unverified', 'R02, R12',
    'rights / request-only',
    'Documented from NPS documents: the park\'s historical base maps (1863, 1895, 1927, 1993) were digitized (GMP 1999); the 1863 period plans are 32 sheets (25 + 7 overlapping) at 1 inch = 200 feet drawn on the 1868 Warren maps by Harrison and Peterson, and overlap and gaps hampered stitching them in the park GIS (Record of Treatment). Not verifiable from here: the 2001 paper (Musselman) on registration (300 dpi LOC scan, nine control points, affine, rubbersheeting), the 1-ft/1:600 maps and 1996 orthophoto, and the xyHt/Smithsonian/Spokesman statements on Knowles\' hand-traced contours, TIN and the "50 ft" figure. No public download of the layers or of Knowles\' contours/TIN was found; licence unknown.',
    'Data are request-only (a request is an owner-only act); the method pages are refused here.',
    'GMP 1999, Record of Treatment I and II, First Day CLR (local); Wayback copy and xyHt (blocked); shard rows R12.014, R12.015.',
    'Re-create the layers from Warren (docs/basemap1863 features); compare with the NPS method, not NPS data.',
    'Own Warren-derived layers marked inferred; NPS period plans cited only as method.',
    'inferred', 'None', 'Per-object provenance tag; the NPS layers are "NPS interpretation of the 1868 Warren map", not an 1863 survey', 'Terrain, fences, lanes',
    'Send the request to the NPS GIS office? (owner-only; nothing else changes if no reply.)', 'Supplements EG-0021; read the 2001 paper and xyHt in an open-network session before citing the method.')

add('sources-a-EG-05', 'USGS lidar: project dates, geoid, quality level and the later PA_17County_D24 project not verifiable here; tile-count conflict', 'R12, R02',
    'source not yet used / access',
    'Verified live on the public AWS copy (2026-11-16): project USGS_LPC_PA_South_Central_B1_2017_LAS_2019 is a LAZ EPT of 76,019,979,744 points; its source list has 4,911 LAZ files whose points sum to that total; the Gettysburg tile 18SUK309410 (13,309,519 points, a 1,500 m square) is in NAD83(2011) / UTM 18N + NAVD88 height, LAS 1.4; the bucket lists no PA_17County_D24 prefix. Conflict: 7,975 tiles (PDF/AmeriGEOSS) vs 4,911 source files (EPT). Not verifiable here: collection dates 2017-11-21 to 2017-12-21, publication 2018-10-26, GEOID12B, QL2 figures, 150 control points and 245 checkpoints, the DEM and 2-ft contour products, and the first-round reading of D24 (collected 2024-12-12 to 2025-03-24; quality level never read).',
    'The pages that state them (AmeriGEOSS, ScienceBase, USGS, TNM, Adams County GIS) are refused by the proxy.',
    'AWS EPT root, ept-build, ept-sources list and tile record, bucket prefix listing (2026-11-16); project notes terrain_pipeline_status.md; shard rows R12.021, R12.022.',
    'Keep the 2017 DEM as the documented modern reference; its datum is NAVD88 (geoid model unverified).',
    'In an open-network session: read the AmeriGEOSS and ScienceBase records, the USGS QL table and the TNM API result for D24; ingest one D24 DEM tile and difference it against 2017 for processing noise and change.',
    'documented (tile geometry, datum components); open gap (dates, geoid, QL, D24)', 'Tiles 4,911 (EPT) vs 7,975 (AmeriGEOSS)', 'Modern ground only; labelled as such', 'Terrain surface',
    'None.', 'Do this before the next terrain milestone; note the epoch used in provenance.')

add('sources-a-EG-06', 'Little Round Top drone data (2017): report figures unverifiable here; availability and accuracy unstated', 'R12, R13',
    'evidence missing',
    'The GeoCue case study (52 acres; eBee RTK at 390 ft AGL; Inspire 2 at 295 ft; 29 checkpoints; burn) was read once on the owner\'s machine (no verbatim quote kept) and support.geocue.com is refused here. No accuracy figure, point density or data location was found in that reading. The NPS Little Round Top CLR (2012) documents a different modern survey (aerial photogrammetry and field verification) and suggests LIDAR; no NPS text read mentions the 2017 drone survey.',
    'Report page refused; dataset not offered by the report.',
    'GeoCue PDF (blocked); NPS Little Round Top CLR (local); shard row R12.019.',
    'None.', 'Locate the data through the NPS (owner-only request) or leave the Little Round Top earthworks to CLR text plus Warren.',
    'inferred', 'None', 'Mark Little Round Top earthwork geometry as not measured', 'Little Round Top west face',
    'None.', 'Do not derive 1863 profiles from the modern walls (CLAUDE.md).')

add('sources-a-EG-07', 'OR Atlas Gettysburg plates identified from the OCR index only; plate images unseen; plate 73 sub-number unreadable', 'R12',
    'evidence partly missing',
    'Closed: which plates cover Gettysburg. From the Internet Archive OCR of the Atlas: battle July 1-3, 1863 on plates 28 (map 4), 40 (map 2), 43 (maps 1 and 2), 73 (one map, digit unreadable) and 95 (maps 1 and 2); the Gettysburg Campaign on 43 (map 7) and 116 (map 2) and on further plates; 175 plates in all. Plate 95 map 1 is credited to Warren and a party of draftsmen; map 2 to Bachelder and Maxson. The NPS First Day CLR reproduces a "map based on survey by Major E. B. Cope" from plate XL (40). Open: the plate 73 sub-number, what each plate shows and at what scale, whether plate 95 map 1 equals the 1868-69 Warren sheet, and the link of the NPS detail to plate 40 map 2 (inference).',
    'No plate image was viewed (the IA page images are in a 147 MB zip; eHistory answers with its own bot block).',
    'Atlas OCR text (archive.org atlastoaccompany00unit), IA metadata, NPS First Day CLR; shard row R12.012.',
    'None.', 'Open plate 95 and plate 40 from the IA scan (range-read the jp2 zip or the page images) and compare with Warren before any use.',
    'inferred', 'Bachelder entry "9S.2" read as 95,2 (OCR)', 'None', 'None', 'None.', 'Low priority; plate 95 is at best a second reader of Warren (same root).')

add('sources-a-EG-08', 'LOC Civil War Maps: Hotchkiss rights; Whitney and Sickles/Meade headquarters sketches searched and not found', 'R12',
    'partly resolved',
    'The collection query found Hotchkiss-collection Gettysburg sketches 2005625069, 2005625067 and 2005625066 (troop positions, hachures; 2005625069 carries the Hotchkiss Map Collection rights text: noncommercial, educational and research purposes; written permission may be needed beyond fair use) and Hotchkiss route maps 2005625065 and 2005625068. Searched 2026-11-16 and not found in the collection: "Edwin Whitney" (0 results; q=whitney gives only William H. Whitney\'s Shenandoah map) and Sickles/Meade headquarters sketches (0 results for both keyword queries). No record gives an individual author for 2005625069, 2005625067 or 2005625066. The collection "About" counts (76 atlases and sketchbooks, Hotchkiss 341, Sherman) are unread (403).',
    'Metadata silent on authorship; the About pages refuse this client.',
    'LOC collection JSON queries (q=gettysburg, hotchkiss, whitney, edwin whitney, sickles, meade headquarters, headquarters gettysburg); shard row R12.011.',
    'None; the Whitney name is dropped from product text.', 'Read the LC Civil War Maps (2nd ed.) entries H159, H162 and neighbours for authorship; do not name Whitney.',
    'documented (queries); open gap (authorship)', 'None', 'Do not attribute; Hotchkiss items are research-use only', 'Positions only',
    'Confirm the delegated decision DD-SA-02 (Hotchkiss items: research use, no image shipped).', 'Drop the Whitney name; treat Hotchkiss images as not shippable.')

add('sources-a-EG-09', 'NPS reports: Pickett\'s Charge item is a CLI not a CLR; Historic Vegetation Study unfound; IRMA record blocked', 'R12, R13',
    'evidence missing / PDF correction',
    'The npshistory index (2026-11-13) lists no Pickett\'s Charge Cultural Landscape Report: the 2024 item is "Cultural Landscapes Inventory: Pickett\'s Charge Battlefield" (local as NPS-CLI-PCB). The NPS Historic Vegetation Study is not in the index. The IRMA reference 2257218 and the download 472822 ("Treatment Philosophy: The 1863 Landscape (Gettysburg)", Eric Campbell, March 2004) are on irma.nps.gov, which is refused here. Resolved: the Record of Treatment authors (title page lists four preparers; LC cataloguing data and npshistory each name a subset); the Little Round Top CLR body is local (54,173,676 bytes).',
    'IRMA refused; no vegetation study listed.',
    'npshistory index, NPS planning page, NPS library texts (local); shard row R12.017.',
    'None.', 'Search IRMA by title for the Historic Vegetation Study and read the 2004 Treatment Philosophy before any fence or field claim relies on them.',
    'documented', 'None', 'None', 'R13 fields and fences', 'None.', 'Keep NPS rehabilitation quantities as NPS claims; use the Record of Treatment lengths.')

add('sources-a-EG-10', 'Existing game and model maps (Ultimate General and similar): lookup failed, nothing used', 'R12 (item 20), R21',
    'evidence missing',
    'Catalogue item 20 could not be examined: forum.game-labs.net failed name resolution on the owner\'s machine (2026-11-04) and is refused by the proxy now. Nothing from game or model maps is used or claimed; a game map is not a primary terrain source.',
    'The lookup failed; a game map would be tier plausible-procedural at best (Law cl.3).',
    'forum.game-labs.net robots.txt (failed); shard row R12.020.',
    'Item stays unused; terrain relies on Warren, lidar and the other catalogued sources.', 'Not applicable (not used).',
    'none', 'n/a', 'Not applicable', 'Terrain sources panel lists item 20 as not used',
    'Recorded as DELEGATED DECISION DD-SA-01 (not used); the owner may reverse it.', 'Revisit only if a licensed model is offered.',
    status='open (proposed by shard sources-a, close-out of 2026-11-16; owner decision delegated as DD-SA-01)')

add('sources-a-EG-11', 'Source pages read once on the owner\'s machine that this container cannot re-read (blocked hosts)', 'R12, R21',
    'blocked / access',
    'Twenty hosts answered a robots.txt request with a proxy refusal on 2026-11-13 and again on 2026-11-16: unwritten-record.blogs.archives.gov, web.archive.org, irma.nps.gov, www.xyht.com, www.smithsonianmag.com, www.spokesman.com, gettysburg.stonesentinels.com, support.geocue.com, data.amerigeoss.org, www.sciencebase.gov, www.usgs.gov, tnmaccess.nationalmap.gov, mapping.adamscountypa.gov, elevation.nationalmap.gov, www.nhhistory.org, www.davidrumsey.com, scrcguides.libraries.wm.edu, gettysburghistory.org, storymaps.esri.com, geodata.libraries.mit.edu; forum.game-labs.net and davidrumsey.com (no www) were refused on 2026-11-13 only; www.loc.gov answers 403 to its about-this-collection pages and to the IIIF manifests; ehistory.osu.edu answers with its own bot block; catalog.archives.gov disallows all crawling. The first round read most of these pages on the owner\'s machine (paraphrases, no verbatim quotes); every statement that rests only on them is carried as blocked_host with no tier above open_gap. Each row of evidence_corrections/sources-a.jsonl lists the exact URL and what to read (26 distinct pages in all).',
    'Proxy refusal (CONNECT 403); the standing rule is never to work around a refused host.',
    'lookups.jsonl (records of 2026-11-13 and 2026-11-16); shard rows R12.001 to R12.022.',
    'Every such claim is carried as an unverified earlier reading, never as documented.',
    'A session with open network access (the owner\'s machine) reads each listed page, copies the sentences verbatim into a new corrections line and the build rerun matches them in the saved text.',
    'open_gap', 'None', 'Claims on blocked pages carry no tier above open_gap', 'Terrain source panel, provenance',
    'None (reading a public page is not an owner-only act); the owner may allow wider network access for the build container.', 'Do this in one pass: 26 pages, all public (the NARA catalog page only in a browser, never by crawler).')

add('sources-a-EG-12', 'PDF catalogue statements shown wrong or unsafe by the re-check (terrain_sources.json to be corrected)', 'R12',
    'documentation correction',
    'Row 7: Cope map date "August to October 1863" -> "October 1863" (NPS); August to November is Elliott\'s window. Row 11: "about 2,240 maps" -> 2,338 (LOC records); Hotchkiss Gettysburg maps exist; "Lt. Edwin Whitney" and Sickles/Meade headquarters sketches: not found. Row 13: the three NPS dates map onto Warren 1868, Cope/Bachelder/Elliott 1863 and the 1872 topographical survey map. Row 16: the NPS page has a "Last updated: February 26, 2015" stamp and gives 141, 147 and 140 years. Row 17: "Pickett\'s Charge CLR 2024" -> CLI 2024. Row 12: "which plates cover Gettysburg was not looked up" -> closed (plates 28, 40, 43, 73, 95, 116 and others). Row 1: the PDF tier "R1 for geometry" has no published error behind it.',
    'Not blocked: corrections of printed catalogue statements.',
    'Shard rows R12.001, R12.007, R12.011, R12.012, R12.013, R12.016, R12.017 (evidence_corrections/sources-a.jsonl); request note bt-evidence-sources-a-world-content.md.',
    'The terrain source file docs/battle-theatre/terrain/terrain_sources.json is not edited by this shard (not owned); the request note carries the exact changes.',
    'Apply the changes listed in the request note; keep the PDF wording in the "printed" field.',
    'documented', 'PDF values stay selectable in the "printed" field', 'The terrain source panel prints the corrected value with the PDF value beside it', 'Terrain sources panel text only',
    'None.', 'Apply with the next terrain data round.')


for e in E:
    path = os.path.join(OUT, e['id'] + '.md')
    lines = ['# %s: %s' % (e['id'], e['title']), '', '| Field | Content |', '|---|---|']
    for k, v in e['f']:
        lines.append('| %s | %s |' % (k, str(v).replace('|', '/').replace('\n', ' ')))
    open(path, 'w', encoding='utf-8', newline='').write('\n'.join(lines) + '\n')
print('wrote', len(E), 'entries to', os.path.abspath(OUT))
