# Request to the world-content and terrain-data owners: what the sources-a close-out (R12.0000, R12.001-R12.022, the terrain source catalogue items 1-22) changes in data and product text

From: bt-evidence, shard sources-a, 2026-11-16. Evidence: `GOVERNANCE/evidence_corrections/sources-a.jsonl` (23 rows, 342 citations, each a verbatim quote matched in a saved local text with its character offset; id form `R12.0nn.x`; independent re-read by `horde/sources-a/scripts/verify.py`, 0 errors). Register entries: `horde/sources-a/proposed-register/sources-a-EG-01..12.md`. Delegated decisions: `decisions/DELEGATED-DECISIONS-2026-11-11.md`, rows DD-SA-01..DD-SA-07. Report: `horde/sources-a/REPORT.md`.

## At a glance

1. **No structures.json, state_schedule.json, works_stages.json or kit entry has to change because of this shard.** R12 is a catalogue of terrain sources; nothing in it names a unit, a fence, a wall, a tree, a gun or a minute of the battle. No file under `docs/battle-theatre/app` prints any of the corrected statements (grep on 2026-11-16: the only data file that does is `docs/battle-theatre/terrain/terrain_sources.json`).
2. **Four statements printed in the PDF catalogue are wrong or unsafe and must not reach product text**: the Cope map date "August to October 1863" (NPS: October 1863; August to November is Elliott's window); "Pickett's Charge CLR 2024" (it is a Cultural Landscapes Inventory); the collection size "about 2,240" (LOC: 2,338); and the tier "R1 for geometry" of the Warren extract (no published error behind it).
3. **Two things the product must keep saying**: the Warren survey is 1868-69 (revised 1873), five years after the battle, so everything drawn from it is "inferred" for July 1863; and the NPS "1863" landscape plans are the NPS's own corrections of the Warren map (32 sheets at 1 inch = 200 feet), not an 1863 survey.
4. Twenty-six source pages could not be re-read from the build container (proxy refusal); the claims that rest only on them are carried as `blocked_host` with their URL and what to read (register entry sources-a-EG-11). They change nothing in the product until read.

Rule for every change below: the PDF value is never deleted: it stays in the `printed` fields and is marked with its tier (Law cl.6, cl.7).

## A. terrain/terrain_sources.json: append to `check_notes` (observations; the `printed` fields stay as printed)

| row | text to append (verbatim) | evidence id |
|---|---|---|
| 1 | LOC 99446453 image 7186 x 13687 px (IIIF info.json), JP2 13,495,108 and TIFF 295,067,312 bytes (HEAD, 2026-11-16); the IIIF manifest URL is stated by LOC but answers HTTP 403 to the build container; imprint 1886, LOC machine date 1861 (catalogue artefact); large map in 4 sheets (LOC title, NPS Administrative History) or 25 sheets (NPS LRT CLR) or 20 sections (xyHt, unread); "R1 for geometry" has no published error behind it (project measure: 48 label anchors, 14.2 percent trusted coverage). | R12.001 |
| 2 | E 81 holding, survey 1868-69 revised 1873 and 200 ft/inch documented from LOC 99448794 and the NPS; the large map is "12 feet square" (1893 Commission report via the NPS Administrative History). NAID 102279222, E 105-4 and the 72 dpi remark rest on blocked pages (NARA blog, Wayback). catalog.archives.gov disallows all crawling. | R12.002 |
| 3 | Not read: the Rumsey record cannot be reached. The item may be Atlas plate 95 (inference from "Printed atlas plate" and list number .095); not asserted. | R12.003 |
| 4 | LOC 99447491 re-matched: 3 sheets 74 x 71 cm, 1:12,000, JP2 8292 x 10756 (sheet a), reduced from Warren's 200 ft/inch survey (a second reader of Warren, not a second root). LOC machine date 1879 vs imprint 1876 (the NPS bibliography says 1876). UMN record and Warren's criticism unread. | R12.004 |
| 5 | W&M entries unread (host refused); the three day sheets are open at LOC 99447491. | R12.005 |
| 6 | NPS texts cite the NHHS Bachelder correspondence (microfilm); the finding-aid figures (10 boxes, 7 volumes, microfilm 102264) are unread. Letters cited date from 1866 on. | R12.006 |
| 7 | Cope map date: October 1863 (NPS Administrative History, Georg 1981); "August to October 1863" is unsupported for Cope (the NPS gives August to November 1863 for Elliott's survey); shows breastworks; NAID 176246318 and Warren's annotation unread; identity of LOC 99447498 with E 105a-1 not established. | R12.007 |
| 8 | NPS cites the Hopkins map for roads, farms and the Seminary by 1858 and for borough property; project georeference of the borough inset: leave-one-out 2.9 m; ACHS index unread. | R12.008 |
| 9 | Confirmed: region map Gettysburg to Appomattox, reduced from the 1869 atlas index map; not a battlefield source. | R12.009 |
| 10 | Elliott map: LOC 99447501 (1:9051, 80 x 58 cm, 1864 imprint); NPS: surveyed 1863 (August to November), shows burials and Confederate breastwork lines; NARA E 73 / E 72 NAIDs unread. | R12.010 |
| 11 | Collection count now 2,338 (not about 2,240). Hotchkiss Gettysburg sketches exist (2005625069, 2005625067, 2005625066; research-use rights text). No Gettysburg map by any Whitney; "Lt. Edwin Whitney" has no support; no Sickles or Meade headquarters sketch found (queries of 2026-11-16). | R12.011 |
| 12 | Gettysburg battle maps are on Atlas plates 28 (map 4), 40 (map 2), 43 (maps 1 and 2), 73 (one map) and 95 (maps 1 and 2), the Gettysburg Campaign on 43 (map 7) and 116 (map 2); the plate headings name the Gettysburg Campaign also on 28, 39, 40, 43, 45, 73, 95 and 116 (index and plate list of the Internet Archive scan); the Atlas has 175 plates; plate 95 map 1 is credited to Warren and a party of draftsmen; NPS reproduces a Cope-based map from plate XL (40). Plate images unseen; plate 73 sub-number unreadable. | R12.012 |
| 13 | NPS dates map to NPS's own set: 1868 Warren; 1863 Cope, Bachelder, Elliott; 1872 topographical survey map (maker unnamed; GMP credits Bachelder 1863 and 1872). Which 1863 map the page means is not stated. Page last updated 26 February 2015. | R12.013 |
| 14 | NPS period plans: 32 sheets (25 + 7) at 1 inch = 200 ft on the 1868 Warren maps (Harrison, Peterson); eras mapped 1863, 1895, 1927, 1993 (GMP 1999); overlap and gaps hampered stitching in GIS. The 2001 registration method is unread (Wayback). Not public. | R12.014 |
| 15 | Knowles statements unread (xyHt, Smithsonian, Spokesman, Esri refused); Warren facts confirmed from LOC; W. H. Chase and E. A. Chase credited on Atlas plate 95. | R12.015 |
| 16 | NPS page re-read: 9 miles of fence, 12 small fields, trees of 65-70 years; spans 141, 147 and 140 years all on the page; project started 2000; "Last updated: February 26, 2015". Record of Treatment gives per-project installed fence lengths. | R12.016 |
| 17 | The 2024 Pickett's Charge item is a Cultural Landscapes Inventory (not a CLR); Record of Treatment authors resolved (four preparers); Little Round Top CLR local (54,173,676 bytes); IRMA unread; Historic Vegetation Study not in the index; new lead: Treatment Philosophy: The 1863 Landscape (2004). | R12.017 |
| 18 | Stone Sentinels unread (host refused); Sherfy example: house 1840-1860 (NPS CLI), barn burned 2 July (NPS), 70 acres in 1940 (NPS) vs about 50 (unconfirmed). | R12.018 |
| 19 | GeoCue report unread (host refused); NPS LRT CLR (2012) used aerial photogrammetry and field verification for its base map and suggested LIDAR. | R12.019 |
| 20 | Not used; forum unreachable. Delegated decision DD-SA-01. | R12.020 |
| 21 | Public AWS copy of the project verified live: 76,019,979,744 points; 4,911 source files (vs 7,975 tiles in the PDF: conflict); tile 18SUK309410: NAD83(2011) / UTM 18N + NAVD88 height, LAS 1.4; collection dates, geoid model, QL2 figures and the D24 project unread (hosts refused); the bucket has no D24 prefix. | R12.021 |
| 22 | AWS public dataset route verified live; USGS policy text and the other routes unread (hosts refused). | R12.022 |

## B. Provenance and marking text (terrain panel, per-object provenance tag)

- Warren-derived lines, heights and features: "Warren survey, 1868-69, revised 1873; printed 1876-86; inferred for July 1863" (never "documented for 1863").
- NPS-derived 1863 layers or plans: "NPS interpretation of the 1868 Warren map (period plans, 32 sheets)".
- Elliott and Cope maps: "post-battle map (autumn 1863)": evidence of where lines and burials were seen after 3 July; never a pre-battle state.

## C. Works and fences (no change required; optional source keys)

The NPS texts give post-battle map evidence that the works owners may attach as `post_battle_state` source keys, each flagged "no construction animation, no pre-battle placement": Cope map line of breastworks (NPS-EISE-CLR1 Fig. 1.3), a Confederate redoubt on Cope's map at the western edge of Houck Field (Record of Treatment II), the rail breastwork on Cope's "horseback" map (Georg 1981), and the Confederate breastwork lines along Oak Ridge and Seminary Ridge on the Elliott map (First Day CLR Fig. 1.49). Fence lengths: use the Record of Treatment per-project lengths (R12.016.f), not "nine miles", for any quantity.

## D. What is NOT requested

No tile, image or layer from the Hotchkiss items (DD-SA-02); no request to NARA or the NPS (owner-only acts, not made); no use of Stone Sentinels, the Game-Labs forum or the Rumsey print.
