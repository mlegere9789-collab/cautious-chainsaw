# OR-RECHECK-2 report: tl-09 (rows with no explicit quote, `or_recheck` null)

Rows checked: 57. Method: for each row the shard row, seed text and the cited report/printed page in OR Ser.I vol.27 (tmp/library/or27, tools/bt/or27_find.py) were read; passages are verbatim (OCR errors kept) and machine-verified against the OR text for the stated report.

## Verdict counts

- not_found: 7
- not_supported: 8
- supported: 8
- supported_partial: 34

## tier_suggestion counts

- documented: 11
- inferred: 32
- open gap: 13
- plausible-procedural: 1

Verdict key: supported = event, unit, place and hour all in the passage; supported_partial = core in the passage, named sub-claims not (see note); not_supported = cited page does not support the claim (or contradicts it); not_found = no OR citation or no OR passage (computed/secondary/design-hypothesis/gap rows); citation_wrong = none assigned (page corrections are in `citation_correction`).

tier_suggestion rule: documented only where the passage supports event, unit, place and hour (a few supported_partial rows keep documented where only secondary detail is missing: T2-233, T2-192, T3-005, T3-032, T3-042); supported_partial otherwise inferred; unsupported or gap rows open gap; computed rows inferred; design hypotheses plausible-procedural. Never promoted beyond the passage.

## Rows that fail (not_supported / not_found)

- T2-238 not_supported (gap/plausible-procedural before): No Lt. Edgar and no 75-man detail in the cited pages. OR shows a different picket episode: Walker leaves a picket on the Hanover road after dark; Nadenbousch p522: companies 'detached on the evening of the 2d instant, and left in 
- T2-239 not_found (gap/inferred before): No OR citation; row is an open gap (Confederate Jul 3 night camps, fires, burying parties; Pickett presence disputed). Nothing to verify.
- T2-240 not_found (gap/plausible-procedural before): No OR citation; row is an explicit design hypothesis (rear fires, none on contact lines), unsourced. Nothing to verify.
- T2-246 not_found (computed/inferred before): Computed civil twilight/sunrise/solar position (ephemeris_1863.json); no OR claim. Not OR-checkable.
- T2-248 not_supported (gap/plausible-procedural before): Maffett (3rd SC Bn, Kershaw): only Company A thrown out as sharpshooters on Jul 2 (Rose/Wheatfield sector); no rounds-per-man figure, no 'over 200 rounds by morning of Jul 3'; Berdan's 95 rounds at Pitzer's Woods also not in OR. R
- T3-008 not_found (computed/inferred before): Computed moonrise/altitude (ephemeris_1863.json), Jacobs cirrus and moonlight lux not OR claims. Not OR-checkable.
- T3-012 not_supported (gap/inferred before): Gregg p956 describes the Jul 2 position at the right and a skirmish; it has no 'final night attack' on his position and no ~22:00 withdrawal to the Baltimore Pike. Only source is ST-GREGG (secondary). Visible gap.
- T3-013 not_supported (gap/inferred before): Letterman p196-197 gives only general statements (chloroform and dressings carried with ambulances; surgeons worked day and night). No Spangler farm XI Corps hospital, four operating tables, forebay, lanterns, Brinton/Potter, nurs
- T3-014 not_supported (gap/inferred before): Letterman p196 names no hospital sites for the III or V Corps (only the XII Corps hospital as an example). No White Run, Fiscel, Clapsaddle, Two Taverns, 300 yards from Rock Creek, or overnight moves. Row rests on HMDB markers (se
- T3-017 not_found (conflict/inferred before): Computed moon positions (ephemeris_1863.json), fog/dew an inference; no OR claim. Not OR-checkable. Shard recomputation: the printed illumination range '95%-86%' is contradicted by the computation (about 95-92%).
- T3-018 not_found (gap/inferred before): No OR citation; open gap (Lee's council of war, Lee-Longstreet conversation hour). OR vol.27 has no Lee council of war and no hour for such a conversation (per audit).
- T3-025 not_supported (gap/inferred before): Letterman p197 only says surgeons worked day and night; no Weikert hospital, no move east toward the Baltimore Pike, no 950 treated, no lantern-lit sites. Row rests on HN-WEIKERT (secondary). Visible gap.
- T3-031 not_supported (gap/plausible-procedural before): Duplicate of T2-248. Engelhard p658 only mentions Capt. Haskell of the 1st SC (Provisional Army) commanding a select battalion of sharpshooters, mortally wounded; no rounds-per-man figure, no 'over 200 rounds by morning of Jul 3'.
- T3-035 not_found (computed/inferred before): Computed astronomy (ephemeris_1863.json) and Jacobs weather transcribed by secondary summaries; no OR claim. Not OR-checkable. Weather part not earned as documented.
- T3-045 not_supported (gap/inferred before): No OR passage says an order did or did not reach Pickett to be on the field by daylight or that preparation took all morning (W-PC, secondary). Related OR facts: Lee (Jul 1863 report) p308 Pickett joined Longstreet the morning of 

## Citations corrected

- none in this shard

## supported_partial rows where the OR hour differs from the row hour

- T2-242: Event (Union artillery fire on the Confederates in the Culp's Hill works at dawn, followed by Johnson's attack; Ewell p447: 'Half an hour after Johnson attacked, and when too late to recall him') supp
- T2-244: Event (XII Corps returns and finds Confederates in its works) supported by Ruger p780 and Colgrove p813 ('They shortly returned with 23 prisoners, and reported that the enemy held our works on the lef
- T3-023: Ruger p780 supports a XII Corps return to the works and discovery of the enemy in them (skirmishers/prisoners: Colgrove p813 'returned with 23 prisoners'), but places it on the night of Jul 2, not 02:
- T3-027: Same as T2-241. Hall p437, Curtis p450 ('the rails were nearly covered with earth by daylight'), Harrow p420, Tyler p873 ('all the reserve batteries (twelve in number) ... in position'; 'The infantry 
- T3-033: Same as T2-244: Ruger p780 and Colgrove p813 ('They shortly returned with 23 prisoners, and reported that the enemy held our works on the left in large force'; 'It was also ascertained from the prison
- T3-037: Union artillery opening on the Confederates in the works at dawn is supported, but the OR hours conflict: Geary p828 3.30 a.m. (artillery fire ten minutes); Kane p847 3.30 a.m. Confederate attack; Can
- T3-039: A dawn fight on the lower Culp's Hill works is documented, but the OR hours are all earlier than the row's ~05:00-05:30: Geary p828 3.30 a.m. 'early dawn'; Kane p847 attack 'commenced at 3.30 a.m.' by
- T3-040: Buford p928: division moved to Westminster on Jul 3 to guard the trains; Gregg p956: 'the Second Brigade having been sent to Westminster' (Huey's brigade, not engaged on the field). OR separates place
- T3-044: Geary p833 footnote gives 277,000 rounds 'in the fight on July 3, and in subsequent skirmishing' (not 227,000 or about 250,000 as the row; single-witness OCR digits, period differs from the row's). Wa
