# OR-RECHECK-2 tl-02

Rows with no checkable quote (or_recheck null): 11. Method: shard row, seed row, then OR27 OCR text read through tools/bt (or27_find/or27_dump/or27_peek); every verbatim passage was re-verified with or27_find.verify against the cited report and page.

Verdict counts: not_found 9, not_supported 2

## Rows that fail or are only partial

- T1-067: not_found [-] Row is itself an open gap (Jun 30 night camp life, Jacobs sky/moon). No OR passage speaks to campfires or civilians.
- T1-068: not_found [-] Astronomical computation (full moon 06:46 UT, moonset 04:59, moonrise 'about 19:10') plus Jacobs 'very cloudy'. Not an OR claim; no OR passage to check. Shard notes repo computation gives moonrise 19:01, row's 19:10 flagged approx
- T1-070: not_found [-] Astronomical twilight times (02:33/03:21/04:02 LMT): computation, not an OR claim; nothing to check against the OR.
- T1-073: not_found [-] Row is itself an open gap (civilian dawn activity). Nothing to support.
- T1-075: not_found [-] Sunrise 04:35 (computed) and 'very cloudy all day' (Jacobs). Neither is an OR claim; sky statement unverified against a primary in this pass.
- T1-080: not_found [-] Environment row (dry ground, dust, dew inferred; 72 F at 07:00 from Jacobs; '20 min clock offset' unnamed). Not an OR claim; the clock-offset statement has no source.
- T1-091: not_supported [OR27-3-D0967 p.462] Related only: Meade's Jul 1 circular to the Sixth Corps gives Meade's instruction TO Reynolds (not a Reynolds message to Meade promising to hold). No OR passage found for the row's claim (Reynolds rides ahead to Buford ~09:00-09:3
- T1-093: not_supported [OR27-1-R337 p.~930 (929-930)] Buford names Jerome (signal corps) but says nothing of Jerome sighting the I Corps advance about 10:00 on Jul 1. Event and hour not supported.
- T1-104: not_found [-] Row is itself an open gap (I Corps regimental aid posts). No OR passage locates aid posts.
- T1-105: not_found [-] Plausible-procedural fallback; asserts no historical fact; nothing to check against the OR. Marking must stay on screen.
- T1-114: not_found [-] St. Francis Xavier church as hospital by noon Jul 1: OR search 'Catholic church' gives only two scouts' reports of Ewell attending a Catholic church on a Sunday (pt.1 p.65, pt.2 p.29). Not an OR claim; needs a primary (Letterman, 

## Citations corrected
None of these rows carried an OR citation in the shard file; where a page was located the correct report and page are in results.jsonl. Notable corrections: T3-090 (Moore is 61st Ohio, XI Corps per Letterman p.197, not V Corps); T3-157 (Imboden, not Baker, has the wagon trains: Stuart p.699); T3-089 (OR gives 39 guns not 6-23: McGilvery p.883); T3-173 (rain impeded, not aided, the retreat: Lee p.322); T3-103 (Lee p.318 three-quarters of a mile is not the Jul 3 advance distance).
