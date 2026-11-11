# OR-RECHECK-2 report, shard tl-07

Method: for each timeline row with `or_recheck` null in timeline_verified.jsonl, the cited report and printed page were located in the OR vol. 27 OCR (tools/bt/or27_*.py), the page text was read, and the claim (event, unit, place, hour) was compared with it. Every non-empty `passage` in results.jsonl was machine-checked to occur verbatim (whitespace-normalised, page markers removed) in the OR record text, OCR errors included. Hours the passage does not give make a row supported_partial. No shard file, timeline_verified.jsonl or the seed was edited.

Rows: 55. Counts: not_found 6, not_supported 2, supported 1, supported_partial 46

## Rows that fail (not_supported or not_found)

- T2-121 not_supported: The only related OR event is Birney's order, during the assault (after Sickles was wounded), to withdraw to the Round Top ridge, which is a different event from the row's 'ordered toward Little Round Top, then recalled' after 15:00 (Hess, secondary). No OR pas
- T2-122 not_found: Procedural/computed row (smoke drift, dust, visibility inside batteries): no OR claim; wind direction rests on secondary summaries of Jacobs; sector-by-sector smoke accounts not found.
- T2-128 not_found: The row's only support is Hood's participant memoir (Advance and Retreat, 1880), which is not in the OR; Hood wrote no Gettysburg report in the OR, and Longstreet's report (R430 pp.357-361) does not describe a protest about turning Round Top (searches for Roun
- T2-133 not_supported: The OR (Barnes) shows Warren urging assistance for Round Top between 4 and 6 o'clock. NOT in the OR: Warren finding only the signal station, seeing Confederate bayonets to the southwest, sending Roebling; Warren has no Gettysburg report. The NPS seminar page a
- T2-135 not_found: Computed row (sun altitude 37.9 deg, azimuth 270 at 16:00 LMT from the repo ephemeris): not an OR claim; nothing in OR27 to check; ephemeris not recomputed in this recheck.
- T2-148 not_found: Spencer rifles at Hunterstown (5th/6th Michigan arms, Buford's men lacking Spencers, Oct 1863 production date): the OR has no Spencer-as-weapon mention (shard claim check r1: all hits personal names); sources are American Rifleman and Wikipedia.
- T2-176 not_found: Sherfy barn hospital / fire timing / casualty figures: the OR has no Sherfy passage (shard claim check o2); only a Stone Sentinels page and other secondary accounts. Fire timing (Jul 2 evening vs Jul 3 morning vs Jul 3 afternoon) cannot be settled from the OR.
- T2-177 not_found: Sherfy house/orchard/fence damage (7+ shell hits, 48 dead horses, scarred walls): Stone Sentinels only; the OR does not name Sherfy.

## Supported in full

- T2-164 (OR27-1-R266 p.753)

## Supported_partial (see note per row in results.jsonl for the unsupported sub-claim)

T2-123, T2-124, T2-125, T2-126, T2-127, T2-129, T2-130, T2-131, T2-132, T2-137, T2-138, T2-139, T2-140, T2-141, T2-142, T2-143, T2-144, T2-145, T2-146, T2-147, T2-149, T2-150, T2-151, T2-152, T2-153, T2-154, T2-155, T2-157, T2-158, T2-159, T2-160, T2-161, T2-162, T2-163, T2-165, T2-166, T2-167, T2-168, T2-169, T2-170, T2-171, T2-172, T2-173, T2-174, T2-175, T2-178

