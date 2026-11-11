# OR-RECHECK-2 report: tl-08 (rows with no explicit quote, `or_recheck` null)

Rows checked: 57. Method: for each row the shard row, seed text and the cited report/printed page in OR Ser.I vol.27 (tmp/library/or27, tools/bt/or27_find.py) were read; passages are verbatim (OCR errors kept) and machine-verified against the OR text for the stated report.

## Verdict counts

- not_found: 11
- not_supported: 4
- supported: 3
- supported_partial: 39

## tier_suggestion counts

- documented: 5
- inferred: 38
- open gap: 13
- plausible-procedural: 1

Verdict key: supported = event, unit, place and hour all in the passage; supported_partial = core in the passage, named sub-claims not (see note); not_supported = cited page does not support the claim (or contradicts it); not_found = no OR citation or no OR passage (computed/secondary/design-hypothesis/gap rows); citation_wrong = none assigned (page corrections are in `citation_correction`).

tier_suggestion rule: documented only where the passage supports event, unit, place and hour (a few supported_partial rows keep documented where only secondary detail is missing: T2-233, T2-192, T3-005, T3-032, T3-042); supported_partial otherwise inferred; unsupported or gap rows open gap; computed rows inferred; design hypotheses plausible-procedural. Never promoted beyond the passage.

## Rows that fail (not_supported / not_found)

- T2-179 not_supported (unsupported/inferred before): Page 604 only places a Confederate battery near the seminary 'used as a Yankee hospital'. No OR passage on Confederate wounded at the Seminary, the 400 figure, McPherson/Lady/Slyder/Rose/Bushman farms, or counts. Row rests on seco
- T2-188 not_found (computed/inferred before): Computed solar position (ephemeris_1863.json), no OR claim. Not OR-checkable. Shard note stands: shadow direction for sun azimuth 292 is east-southeast (112 deg), row says east-northeast; correct in seed.
- T2-201 not_found (computed/inferred before): Computed sunset (ephemeris_1863.json); no OR claim. Not OR-checkable.
- T2-203 not_found (not_primary/plausible-procedural before): Night-light hypothesis (muzzle flashes, fuse trails); not an OR claim, row itself says no night-light accounts found. Tier stays plausible-procedural; no OR citation to check.
- T2-208 not_found (computed/inferred before): Computed twilight times (ephemeris_1863.json); no OR claim. Not OR-checkable.
- T2-212 not_found (computed/inferred before): Computed moonrise/altitude (ephemeris_1863.json); cirrus at 21:00 (Jacobs), Nofi quote and 0.1-0.2 lux are non-OR. Not OR-checkable.
- T2-213 not_found (not_primary/inferred before): Soldier anecdote (NPS8) bounded only by computed moonrise; no OR citation; account not re-read by the shard. Not OR-checkable.
- T2-217 not_found (unsupported/inferred before): Jacobs thermometer 76 F and cirrus at 21:00: no citation, not an OR claim; shard found only secondary summaries. Not OR-checkable.
- T2-218 not_supported (unsupported/inferred before): Letterman p198 gives only a general statement that most hospitals were moved to the rear as the fire drew nearer. No III Corps sites, Taneytown Road, White Run, 300 yards from Rock Creek, 2,500 wounded, 'that night', or closing ab
- T2-219 not_found (unsupported/inferred before): No OR citation; V Corps hospital moves (Fiscel, Clapsaddle, Two Taverns, 1,400 wounded, Weed in Weikert basement) not located in OR; HMDB lookup failed.
- T2-220 not_supported (unsupported/inferred before): Letterman p196 only says chloroform was generally supplied with the ambulance wagons. No Spangler farm details: four tables, lanterns, 80 amputees, schoolhouse, barn forebay, no hand washing (all secondary: HN-SPG, TRE, GETEXP).
- T2-221 not_found (unsupported/inferred before): No OR citation; Rose/Trostle/Hummelbaugh/Bushman/Slyder/Lady hospital assignments and Sickles's amputation location not located in OR.
- T2-225 not_found (unsupported/plausible-procedural before): No OR citation; no passage on the Plum Run valley dead/wounded by moonlight or lantern recovery (row is an open gap and states so).
- T2-226 not_supported (partial/inferred before): Cited page 653 is wrong; the related passage is on p655 (Jul 3 morning: wounded of both sides lying uncared for in the retaken ground). It does not support wounded crawling toward Plum Run on the night of Jul 2 or Plum Run floodin
- T2-227 not_found (unsupported/plausible-procedural before): Guild's report begins with the Jul 3 midnight withdrawal order and Jul 4 ambulance trains; it does not describe the Jul 2-3 night hospital organisation. The row's own gap statement is consistent with the OR; nothing documented.

## Citations corrected

- T2-184: Coates (1st Minn.) quote is on printed p.424, not p.425 (R102)
- T2-191: Coulter (R044) passage is on printed p.294, not p.293
- T2-226: Related Crawford passage is on printed p.655, not p.653 (R218)

## supported_partial rows where the OR hour differs from the row hour

- T2-181: 18:30 departure of Williams/Geary-Kane and works left unoccupied supported. NOT supported: Greene 'about 1,400', 'about 800 yards', foot-or-several-feet spacing. 'Empty until Steuart enters after dark
- T2-186: Mahone did not join the assault: supported. Posey p634: two then three regiments advanced as skirmishers 'some 200 or 300 yards beyond the barn and house', Mahone 'being at this time ordered to the ri
- T2-211: Lee's two reports conflict on Pickett: p320 'arrived near the battle-field during the afternoon of the 2d'; p308 'Pickett, with three of his brigades, joined Longstreet the following morning' (Jul 3);
- T2-230: Ruger: returning division finds the breastworks left of the swale held by the enemy, places the division in line along a ridge bordering the swale; 'The Second Division came up soon after'. Geary p827
- T2-235: Fisher: two regiments of his brigade (5th and 12th Reserves) with the 20th Maine ascend at 10 p.m. Units and event supported; hour contradicts the row's midnight (22:00 per Fisher). Chamberlain p625: 
