# OR-RECHECK-2 report, shard tl-03

Method: for each timeline row with `or_recheck` null in timeline_verified.jsonl, the cited report and printed page were located in the OR vol. 27 OCR (tools/bt/or27_*.py), the page text was read, and the claim (event, unit, place, hour) was compared with it. Every non-empty `passage` in results.jsonl was machine-checked to occur verbatim (whitespace-normalised, page markers removed) in the OR record text, OCR errors included. Hours the passage does not give make a row supported_partial. No shard file, timeline_verified.jsonl or the seed was edited.

Rows: 57. Counts: not_found 10, not_supported 1, supported 7, supported_partial 39

## Rows that fail (not_supported or not_found)

- T1-119 not_supported: Heth says the two brigades were held in reserve while Archer and Davis advanced. No arrival, no hour, no 'Herr Ridge'. Row rests on Wikipedia only (shard: audit NOT_FOUND_IN_OR). Cannot be documented.
- T1-124 not_found: No OR passage found by shard or by this recheck for Lee's arrival hour at Herr Ridge, Heth's request to attack refused then allowed, or any clock. Hours 13:30/14:30 are secondary only. (Shard: Lee's caution against bringing on a general engagement is in the OR
- T1-132 not_found: Weather row (76 F, very cloudy, warm S breeze at 14:00 Jul 1). No OR27 passage; Jacobs's sheets were not read. Secondary / weak source; cannot be documented.
- T1-135 not_found: No OR27 passage on I Corps hospital sites (Seminary/Schmucker Hall, Pennsylvania College, courthouse, churches) or on J. T. Heard / A. J. Ward: narrow searches for 'Heard' and 'Schmucker' in pt.1 return only unrelated hits. Citation is HMDB marker 17936 (secon
- T1-138 not_found: Row rests on a single weak secondary (Bliss-farm article) about a McMillan neighbour felling fences. No OR27 passage; the recheck did not locate one. Do not drive a fence-removal event from it.
- T1-139 not_found: Tillie Pierce's own memoir is not in the OR text and is not in the repo library; nothing in OR27 can support this civilian row. No hour in the row.
- T1-140 not_found: Spangler farm taken by XI Corps medical staff, first wounded by about 16:00, counts 1,500/1,900/2,000: no OR27 passage (shard: Letterman gives no farm-level counts). Citation is a HistoryNet article. Seed text also carries an unrelated Pettigrew June 30 note (
- T1-158 not_found: Not an OR claim: a computed sun position (alt 37.9 deg, az 270 at 16:00 LMT from the repo ephemeris; sky overcast per Jacobs, secondary). Nothing in the OR27 text supports or contradicts it; the ephemeris values were not recomputed in this recheck.
- T1-169 not_found: Cavalry Corps hospital in the Presbyterian Church falling to the Confederates: HMDB marker only, not an OR27 claim; no passage located.
- T1-170 not_found: Seminary hospital figures (peak 600-700 wounded, over 400 Confederate wounded, last patient Sep 16): post-battle secondary values; nothing in the OR27 pages checked.
- T1-171 not_found: McPherson farm aid station / barn hospital / 55th Virginia (Maj. Lauson): secondary (ECW, BFR) only; no OR27 passage. The bundled astronomy text (sunset 19:32, civil dusk 20:05, moonrise 19:53, astronomical dusk 21:33) is computed from the repo ephemeris, not 

## Supported in full

- T1-133 (OR27-2-R534 p.607)
- T1-143 (OR27-1-R076 p.368)
- T1-150 (OR27-1-R032 p.266)
- T1-151 (OR27-1-R032 p.266)
- T1-154 (OR27-2-R527 p.597)
- T1-156 (OR27-1-R029 p.250)
- T1-172 (OR27-1-R044 p.293)

## Supported_partial (see note per row in results.jsonl for the unsupported sub-claim)

T1-116, T1-117, T1-118, T1-120, T1-121, T1-122, T1-123, T1-125, T1-126, T1-127, T1-128, T1-129, T1-130, T1-131, T1-134, T1-136, T1-137, T1-141, T1-142, T1-144, T1-145, T1-146, T1-147, T1-148, T1-149, T1-152, T1-153, T1-155, T1-157, T1-159, T1-160, T1-161, T1-162, T1-163, T1-164, T1-165, T1-166, T1-167, T1-168


## Citations and shard notes corrected

- T1-123: the shard labels the dispatch as pt.1; it is OR27-3-D0966 (Ser.I vol.27 pt.3, p.461, Butterfield, 1.10 p.m.). Hancock R076 p.368 is correct.
- T1-146, T1-167: casualty return OR27-1-R013 pages: the running head is lost in the OCR, the printed head "188" sits just before "OFFICERS KILLED"; the Arrowsmith line (157th NY) is on p.188-189. Wilkeson is "Lieut. Bayard Wilkeson" (Hunt R028 p.230, Howard R243 p.705), not "Lt. Col."; Fowler is Lieut. Colonel 17th Connecticut.
- T1-152: the shard note says Burgwyn's fate is not in the passage; it is: Heth R549 p.638 says "Colonel Burgwyn killed" (row says fatally wounded).
- T1-122/T1-151: Doubleday p.250 "About 4 p. m." is the enemy's re-enforced advance; Wadsworth and Doubleday p.251 both give 3.45 for the retirement order.
- T1-156: Doubleday p.250 also records "intrenchments in front of the seminary, which I had directed to be thrown up" (relevant to the earthwork rule).
- T1-162 was omitted from my first pass and added; it is supported_partial.
