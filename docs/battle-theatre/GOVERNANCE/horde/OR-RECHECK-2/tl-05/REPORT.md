# OR-RECHECK-2 report: tl-05 (rows with no explicit quote, `or_recheck` null)

Rows checked: 21. Method: for each row the shard row, seed text and the cited report/printed page in OR Ser.I vol.27 (tmp/library/or27, tools/bt/or27_find.py) were read; passages are verbatim (OCR errors kept) and machine-verified against the OR text for the stated report.

## Verdict counts

- not_found: 15
- not_supported: 1
- supported_partial: 5

## tier_suggestion counts

- inferred: 10
- open gap: 9
- plausible-procedural: 2

Verdict key: supported = event, unit, place and hour all in the passage; supported_partial = core in the passage, named sub-claims not (see note); not_supported = cited page does not support the claim (or contradicts it); not_found = no OR citation or no OR passage (computed/secondary/design-hypothesis/gap rows); citation_wrong = none assigned (page corrections are in `citation_correction`).

tier_suggestion rule: documented only where the passage supports event, unit, place and hour (a few supported_partial rows keep documented where only secondary detail is missing: T2-233, T2-192, T3-005, T3-032, T3-042); supported_partial otherwise inferred; unsupported or gap rows open gap; computed rows inferred; design hypotheses plausible-procedural. Never promoted beyond the passage.

## Rows that fail (not_supported / not_found)

- T2-006 not_found (unsupported/open gap before): Cited OR 27/2 p.733 (as cited by Freeman, secondary) holds the end of Col. P. M. B. Young's report (Cobb's Legion) and the Waring (Jeff Davis Legion) Brandy Station report, not Longstreet march orders; no OR passage found for a ~1
- T2-013 not_found (supported_computed/inferred before): Computed sunset/twilight (ephemeris_1863.json); no OR claim. Not OR-checkable.
- T2-014 not_found (partially_supported/inferred before): Computed moonrise/illumination (ephemeris_1863.json); cloud statement from Nofi/Jacobs secondary summaries; no OR claim. Not OR-checkable.
- T2-018 not_found (conflict/open gap before): No OR citation; row's NPS source is secondary. Regex search of OR vol.27 for Lee headquarters at the Thompson house/Seminary Ridge found only unrelated Lee HQ mentions (Greenwood, June 30; a captured-officer note). Establishment d
- T2-023 not_found (not_primary_checkable/inferred before): No OR citation; McPherson barn as a field hospital (55th Virginia, captured barn) not in the OR; the only barn hit is Dwight p343 'the retreat from McPherson's barn to the seminary' (a position, not a hospital). Barn survival clai
- T2-024 not_found (not_primary_checkable/open gap before): No OR citation (row source SS-KLINGLE, Stone Sentinels). Regex search of OR vol.27 for 'Klingle' returns 0 hits. Not an OR claim; no non-lead primary retrieved.
- T2-030 not_found (not_primary_checkable/plausible-procedural before): No source; design hypothesis (rear camp fires only). Nothing in the OR to check; stays plausible-procedural and marked.
- T2-031 not_found (not_primary_checkable/open gap before): No OR citation (ABT-CIV, GD-TOWN, W-BATTLEFIELD, all secondary). Civilian cellar sheltering and Confederate house searches/snipers not an OR claim; needs a civilian diary or account.
- T2-032 not_found (unsupported/open gap before): No source; open gap (burials, civilians, camp life night of Jul 1-2). Not in the OR text per audit.
- T2-046 not_found (not_primary_checkable/plausible-procedural before): No source; plausible-procedural inference (ground fog/dew) from a foggy dawn; no night observation. Not OR-checkable.
- T2-047 not_found (conflict/inferred before): Computed moon altitude/azimuth/illumination (ephemeris_1863.json); cloud (Nofi) secondary; no OR claim. Not OR-checkable. Shard note: the row's '99% falling to 93%' mixes nights (computed fall for Jul 1-2 is 99.9% to 98.0%).
- T2-052 not_found (supported_computed/inferred before): Computed civil dawn/sunrise (ephemeris_1863.json); Freeman and Thayer/USNO values are secondary. Not OR-checkable.
- T2-053 not_found (partially_supported/open gap before): Jacobs thermometer readings (74 F at 07:00) and 'foggy dawn' (Strategypage) are secondary; no OR claim. Not OR-checkable.
- T2-054 not_found (supported_computed/inferred before): Computed sunrise (ephemeris_1863.json); cloud-cover conflict is secondary-sourced. Not OR-checkable.
- T2-058 not_found (unsupported/open gap before): No OR passage for a Lee-Longstreet conference near daybreak on Jul 2; Pendleton p350 has only 'about midday General Longstreet arrived and viewed the ground' (a different event). None of the row's arrival values (Taylor 08:00, day
- T2-060 not_supported (unsupported/open gap before): Pendleton p350: with Capt. S. R. Johnston (engineer) soon after sunrise he surveyed the enemy position and saw 'the enemy's cavalry ... in considerable force' and infantry/artillery moving up the Emmitsburg road: a different, cont

## Citations corrected

- T2-006: Cited OR27-2 p.733 holds Young (Cobb Legion) and Waring reports; no correct location found

## supported_partial rows where the OR hour differs from the row hour

