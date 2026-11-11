# OR-RECHECK-2 tl-01

Rows with no checkable quote (or_recheck null): 13. Method: shard row, seed row, then OR27 OCR text read through tools/bt (or27_find/or27_dump/or27_peek); every verbatim passage was re-verified with or27_find.verify against the cited report and page.

Verdict counts: not_found 9, not_supported 2, supported_partial 2

## Rows that fail or are only partial

- T1-003: not_found [-] Row carries no OR citation in the shard file. Weather row (rain timing 08:00 Jun 25 to 07:00 Jun 27; 60/63/62 F): source is Jacobs (not OR). No OR passage gives these readings; the shard records the original table as unread. Not i
- T1-005: not_found [-] Row carries no OR citation in the shard file. OR27 text search for 'furnace': Stevens' Furnace (Caledonia Iron Works) appears only as the Jul 5 skirmish (Part 1 summary p.4; Lowell R378 p.~1059 'Advanced same evening to Stevens' F
- T1-013: not_found [-] Row carries no OR citation in the shard file. Regex 'Sandoe|Lightner' returns 0 hits in OR27 parts 1-3. Event (Sandoe shot, Lightner escapes, White's men) not in the OR text.
- T1-018: not_found [-] Row is itself an open gap (campfires, pickets, civilians, night of Jun 26); nothing to support. Stays open gap.
- T1-019: not_found [-] Row carries no OR citation in the shard file. Weather row (rain ends 07:00 Jun 27; 61/63/67 F), Jacobs-sourced, not an OR claim; not found in OR by shard.
- T1-022: supported_partial [OR27-1-R007 p.143] Itinerary of the Army of the Potomac, entry headed (OCR) 'June 37' = Jun 27, p.143: I Corps Jefferson to Middletown; II Barnesville; III Middletown; V Ballinger's Creek; VI near Poolesville; XII Knoxville. These are march destinat
- T1-023: not_found [-] Row carries no OR citation in the shard file. Weather row (no rain, 63/67/68 F), Jacobs-sourced; not an OR claim.
- T1-029: supported_partial [OR27-1-R007 p.144] Itinerary, entry (OCR) 'June 38' = Jun 28, pp.143-144: I Corps to Frederick, II Barnesville to Monocacy Junction, III to near Woodsborough, VI to Hyattstown, XI near Frederick, XII Knoxville to Frederick; Crawford's Reserves joine
- T1-030: not_found [-] Row carries no OR citation in the shard file. Weather and dust-inference row (Jacobs temperatures; dust inferred). Not an OR claim; not found in OR by shard.
- T1-040: not_found [-] Row is itself an open gap (camp life, night of Jun 29). Nothing to support.
- T1-041: not_found [-] Row carries no OR citation in the shard file. Weather row (68/79/71 F, dust inferred), Jacobs-sourced, not an OR claim.
- T1-048: not_supported [OR27-1-R336 p.918] Only the sub-claim that Pancoast was Cavalry Corps medical director is supported (R336 Pleasonton staff list p.918; also Lowell R378 p.1046). No OR passage places a First Division hospital at the Presbyterian Church, Gettysburg, o
- T1-050: not_supported [OR27-1-R338 p.934] Gamble's Jul 1 report: skirmishers fought 'under cover of trees and fences'. That is Jul 1 cover, not a Jun 30 dismantling of fences for firewood or breastworks. No OR passage supports the Jun 30 claim; row is an argument (Harriso

## Citations corrected
None of these rows carried an OR citation in the shard file; where a page was located the correct report and page are in results.jsonl. Notable corrections: T3-090 (Moore is 61st Ohio, XI Corps per Letterman p.197, not V Corps); T3-157 (Imboden, not Baker, has the wagon trains: Stuart p.699); T3-089 (OR gives 39 guns not 6-23: McGilvery p.883); T3-173 (rain impeded, not aided, the retreat: Lee p.322); T3-103 (Lee p.318 three-quarters of a mile is not the Jul 3 advance distance).
