# OR-RECHECK-2 tl-11

Rows with no checkable quote (or_recheck null): 27. Method: shard row, seed row, then OR27 OCR text read through tools/bt (or27_find/or27_dump/or27_peek); every verbatim passage was re-verified with or27_find.verify against the cited report and page.

Verdict counts: not_found 16, supported_partial 10, unreadable_ocr 1

## Rows that fail or are only partial

- T3-103: supported_partial [OR27-1-R104 p.428] Webb: assault begins at 3 o'clock. Hunt (R028 p.239) 'About 3 p. m.'. Hour carried as a range (Peyton 14:30; A. Hays 16:30; Lang nearly 16:00 p.632). Distance: Lee p.318 'the ground was undulating and generally open for about thre
- T3-105: supported_partial [OR27-1-R318 p.884] McGilvery's guns trained obliquely right gave a raking fire through the three advancing lines (supports McGilvery fire on the Confederate right, not named 'Pickett'). Rittenhouse's six rifled guns on top of Round Top: Hunt p.238. 
- T3-107: supported_partial [OR27-1-R120 p.462] Sawyer, 8th Ohio: front changed to the left flank of the advancing column, 'about 200' prisoners and 3 stands of colours. Supported: 8th Ohio flank fire on the advance, hour 'after about 2 p.m. ... advance'. Not in the OR text rea
- T3-111: supported_partial [OR27-1-R076 p.366] Hancock's note to Meade (Jul 3, Twelfth Corps Hospital dateline follows): 'I was shot with a tenpenny nail' and 'I did not leave the field till the victory was entirely secured'. Supports Hancock wounded and leaving after the repu
- T3-113: not_found [-] Codori farm facts: OR search 'Codori|Codorus' finds only the Codorus Creek bridges. Secondary sources only.
- T3-114: supported_partial [OR27-1-R104 p.428] Webb: three guns run to the fence (row: two); at 2.45 'silenced ... all the guns but one of Cushing's battery' (before the assault); 'General Armistead was left, mortally wounded, within my lines'. Not in Webb: 'Cushing killed at 
- T3-116: not_found [-] Hunt fires a pistol, horse shot: regex 'pistol' returns 0 hits in Hunt's report (R028). Anecdote from ECW-HUNT only.
- T3-117: supported_partial [OR27-2-R545 p.632] Lang: Pickett charged 'nearly 4 p. m.' and was driven back; Wilcox then advanced, Lang with his left; retreat ordered; Second Florida cut off. Supports 'reach the line only after Pickett's defeat'. Lang's 'about 300' loss at p.632
- T3-121: not_found [-] Lee at Spangler's Woods, remarks to Wilcox and Pickett: memoir material; not in OR. Row itself says disputed.
- T3-122: unreadable_ocr [-] Casualty totals (Pickett 2,655, Pettigrew about 2,700, 6,555 etc.): shard reports the OR casualty tables unreadable in this OCR; not re-tested here. Components unverifiable; arithmetic conflict inside the row.
- T3-123: supported_partial [OR27-2-R426 p.298] Lee: Trimble wounded in the leg (p.298); Garnett killed (p.310 'Garnett were killed'; p.298 'feared that the former is killed'); Kemper wounded (p.298 'it is feared, is mortally wounded'; p.311 listed wounded); Pettigrew wounded a
- T3-125: not_found [-] Animation-state description (fences breached, dead lying, ~20 flags); explicitly inferred; fence breach unsourced. Flag count belongs to T3-118.
- T3-126: not_found [-] Row is itself an open gap (Confederate hospital counts). None of Lady farm, Seminary, McPherson barn in the OR passages found.
- T3-128: not_found [-] Row is itself an open gap (hour-level Union action after the repulse). OR reports give events without clock times for 16:45-18:00.
- T3-129: not_found [-] Row is itself an open gap (Confederate rally, Lee's reception of troops). Not in OR with times.
- T3-130: supported_partial [OR27-2-R435 p.378] Cabell: 12 killed, 30 wounded (4 officers, 26 men) supported; p.376 'The ammunition of the guns was nearly exhausted.' at about 4 p.m. shift. Horses: OCR reads 'G 7 horses killed and 13 disabled' (the leading digit is unreadable; 
- T3-132: not_found [-] Sherfy barn/farm facts and timing conflict: OR search 'Sherfy' returns 0 hits. Secondary sources only.
- T3-135: not_found [-] Sunset and twilight times (computed). Not an OR claim.
- T3-137: not_found [-] Armistead arrival at Spangler farm about 20:00: not in OR. Nearest OR text (Webb R104 p.428): 'General Armistead was left, mortally wounded, within my lines'; no hour or hospital named.
- T3-139: not_found [-] Spangler hospital deaths and patient counts: secondary sources; no OR passage.
- T3-140: not_found [-] Row is itself an open gap (recovery of wounded between lines, fires, night of Jul 3).
- T3-141: not_found [-] Moonrise 21:16 etc. (computed); 7/10 cumulus and wet surfaces from the weather timeline (secondary). Not OR claims.
- T3-142: not_found [-] Plausible-procedural fill (Union night activity); asserts no historical fact; nothing to check against the OR.
- T3-143: supported_partial [OR27-2-R435 p.376] Cabell: his guns withdrawn after dark Jul 3. This is the only documented sub-claim (one battalion's guns). The rest of the row (Confederate night activity, resupply, wounded toward Cashtown) is procedural/undocumented here.
- T3-153: not_found [-] Klingle family returns Jul 4 to find crops and fences gone: OR search 'Klingle|Klingel' returns 0 hits. Stone Sentinels only.
- T3-157: supported_partial [OR27-2-R565 p.699] Stuart: Fitz. Lee two brigades on the Cashtown road; Jenkins' and Chambliss' with Stuart; Baker's (ex-Hampton) and Hampton's guard the flank/rear via Cashtown; Imboden has 'special charge' of the wagon trains and ambulances (row's
- T3-161: not_found [-] Jul 4 council of war (corps commanders agree to stay, Warren to probe): OR 'council of war' search finds Jul 2 night (R006 p.124) and Lincoln's Jul 14-15 queries; no Jul 4 council. Row rests on secondary W-RET/W-GC.

## Citations corrected
None of these rows carried an OR citation in the shard file; where a page was located the correct report and page are in results.jsonl. Notable corrections: T3-090 (Moore is 61st Ohio, XI Corps per Letterman p.197, not V Corps); T3-157 (Imboden, not Baker, has the wagon trains: Stuart p.699); T3-089 (OR gives 39 guns not 6-23: McGilvery p.883); T3-173 (rain impeded, not aided, the retreat: Lee p.322); T3-103 (Lee p.318 three-quarters of a mile is not the Jul 3 advance distance).
