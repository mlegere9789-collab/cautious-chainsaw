# Request from bt-timeline (shard tl-04 close-out), 2026-11-13

Files I do not own and what I would like changed in them. Nothing below was edited by me.

## 1. tools/bt/merge_horde.py (and the files it writes)
- Read GOVERNANCE/timeline_corrections/tl-04.jsonl in the same way as tl-01 and tl-02 (the line contract is the same: `verdict`, `corrected_claim` with `time_window`, `tier_change`, `sub_claims`, `citations`, `scenarios`, `default`, `remains_unsupported`, `searched`).
- Citation kinds in tl-04 that the validator must know:
  - `source_id` `OR27`: part, report id, printed page, quote, offsets, file and sha256 (as before).
  - library texts (`JACOBS-1864`, `EVERETT-1864`, `HASKELL-1908`, `SHSP-04`, `LONGSTREET-1896`, `BL-3`): offset into the file under tmp/library/ws9; page recovered from running heads or stated with its basis.
  - `NPS-*` texts (government reports, from tmp/library/web/nps/NPS-*/NPS-*.txt and the one article acquired by this close-out, tmp/tl-04/acq/NPS-ART-GATEWAY/NPS-ART-GATEWAY.txt, listed with its sha256 in horde/tl-04/sources_tl04.json): the page is the PDF page marker (`=== PAGE n ===`) of the text layer. The text layer of these two-column PDFs interleaves the lines of the columns, so a sentence is cited as several contiguous fragments (each is verbatim in the file; the `note` says so).
  - `COMPUTED`: a value with its method (PyEphem 4.2.1; horde/tl-04/astro_check.py and .json). Never counts as documentation.
  - `PROJECT-DATA` (new in tl-04): a value read from a project data file (here data-src/environment/weather_by_day.json: Jacobs's readings as relayed second-hand in 1885). It is not a source text, carries no quote and must never carry a `documented` sub-claim; the validator should refuse a documented sub-claim whose citations are all `COMPUTED` or `PROJECT-DATA`.
- Treat a row whose verdict is `corrected` with scenarios and no default as "status stays as the shard had it, claim changed": the effective claim is `corrected_claim`, the effective tier is `corrected_claim.tier`.
- results.jsonl of the shard was rewritten (the earlier file is results.pre-closeout.jsonl): `tier` and `status` follow the same rule as tl-02 (`verified` only when the central documented sub-claim is carried by an Official Records citation).

## 2. GOVERNANCE/register/ (existing and proposed entries)
Proposed entries are in horde/tl-04/proposed-register/: 35 new ones (tl-04-CO-<row>.md) for every row that stays gap, unsupported or partial (and for the corrected rows with an open remainder), plus the 21 earlier ones (EG-TL04-001..021), each with a close-out paragraph. Proposed closed or narrowed: EG-TL04-004 (123rd NY: Jul 2 per McDougall and Rogers), -006 (Coutler's 19:00 and 22:00 are Jul 2), -013 (start of the XII Corps works: Jul 2 05:00-06:00), -017 (O'Neal), -020 (Meade and Humphreys hours under the recorded defaults C-001 and C-002). The owner or integrator decides.

## 3. GOVERNANCE/conflict_register.json and conflicts_structured.json (new conflicts found, no default recorded)
Carry as selectable scenarios; none has a recorded delegated default:
1. Hour at which Slocum took the command (T1-177, T2-005): between 17:00 and 18:00 (Hancock p.368) against about 19:00 (Howard pp.696 and 704; Meade p.115).
2. Arrival of Johnson's division (T1-185): about 19:00 at the town (Nicholls' brigade, Williams p.513), late afternoon and formed about dark (Jones p.531), about sunset (Richardson p.537), after nightfall (Walker p.518), late on the night (Johnson p.504).
3. Arrival of the III Corps' first division (T1-192): 17:30 (Birney p.482), about 19:00 (Howard p.704, Meade p.115), about dark (Ward p.493), after sunset (Moore p.513).
4. Geary relieved at the hill on Jul 2 (T1-194): 05:00 (Geary p.825) against 07:00 (Birney p.482).
5. Orders and march of the VI Corps (T1-191): first orders just before dark (Wright p.665) against the march resumed about 21:00 (Wright p.666, Meade p.72).
6. Cloud over the moon and the darkness of the night of Jul 1-2 (T1-190, T1-195, T1-219): veiled by thin clouds (Everett 1863), very dark near Emmitsburg at 01:30-04:00 (Burling p.570), cirro-stratus at 9 p.m. (Jacobs, second-hand).
7. Dawn of Jul 2 (T1-225): considerable fog (McAllister p.552), thick, sultry, overcast with mist (Haskell p.19), pleasant with a smoky haze (Jacobs 1864 p.32).
8. Hour at which Lee established his headquarters at the Thompson house (T1-188): morning (NPS article) against evening (seed); the OR names no place for the evening except the small house north of the town (Early 1877).
9. Start and end of the works on Culp's Hill (T1-200): 05:00 (Geary), about 06:00 (Greene, Godard), done about 09:00 (60th NY), by about 10:00 (Greene, OCR '13 o'clock'), about noon (137th NY); the night Jul 1-2 start (NY state agency page) is contradicted.
10. 7th Indiana strength (T2-002): 400+ (seed) against nearly five hundred (Halstead).
11. Hancock's arrival hour (T1-175, T2-001): the recorded default C-039 (about 15:00-16:00) stands; the dispatch's 'an hour since' puts it at about 16:25 and Howard's report has him with Howard after 16:30.
12. T1-220: the plan's 'falls from 99 to 93 percent' is contradicted by two computations (99.0 at moonrise, 97.7 at moonset); the plan text may need correcting.

## 4. Product notes (app data owners)
- T1-173: Wiedrich fires from the hill north of the Baltimore pike at the cemetery entrance on the columns coming from the town (about 16:30-17:00), not at the railroad cut.
- T1-176 and T2-005: on Jul 1 Geary's division is on the extreme left near Round Top by 17:00 (not on Cemetery Ridge); on Jul 2 at 05:00 (Geary) or 07:00 (Birney) the III Corps relieves it and it goes to Culp's Hill.
- T1-178: Williams' division learns of the retreat only when about to assault the hill east of the town.
- T1-182, T1-200, T1-201: the XII Corps works on Culp's Hill (123rd NY, Greene's brigade, Williams' division) begin on Jul 2 (after 05:00-06:00 for Geary's division, after about 09:00-11:00 for Williams' division); no works are built there on the night of Jul 1. The 7th Indiana's temporary breastwork on the hill east of the town (afternoon-evening of Jul 1; Cutler's brigade soon joined) and the batteries' light earthworks at the cemetery gate (dusk of Jul 1, Wainwright p.357; Fifth Maine knoll during the night, Whittier p.361) are the documented first-night works.
- T1-184 and T1-198: Coulter's brigade breastworks on the left of the XI Corps on the evening of Jul 1; the moves at about 19:00 and about 22:00 are Jul 2.
- T1-187: Early urges the advance and names Culp's Hill for Johnson; no opposition. T1-186: Lee's 'if practicable', Ewell's jaded troops, no artillery on the hill, Cemetery Hill 'not assailable from the town'; 'narrow streets' is not in a source.
- T1-188: do not show Lee in the cupola; the evening conference is on the porch of a small house north of the town (Early 1877).
- T1-199: the II Corps does not arrive on the night of Jul 1; it bivouacs 3-4 miles back and arrives at 06:30-07:00 on Jul 2 (default C-004).
- T1-204, T1-216: documented as in the lines.
- Weather: Jacobs's readings are second-hand (tier inferred); fog at dawn on Jul 2 is documented for one brigade (McAllister); the moon is a diffuse veiled disc (luminance floor) with 'very dark' as a scenario; moon altitude and azimuth values are computed and matched an independent computation.
