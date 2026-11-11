# OR-RECHECK-2 tl-10

Rows with no checkable quote (or_recheck null): 20. Method: shard row, seed row, then OR27 OCR text read through tools/bt (or27_find/or27_dump/or27_peek); every verbatim passage was re-verified with or27_find.verify against the cited report and page.

Verdict counts: not_found 13, not_supported 1, supported_partial 6

## Rows that fail or are only partial

- T3-046: not_found [-] OR search 'Taney' returns only Taneytown (Meade headquarters). No OR passage on Battery M shelling sharpshooters in the Taney house. Secondary web source only.
- T3-048: not_found [-] Jacobs thermometer 73 F at 07:00, overcast 08:00: not an OR claim; original table unread.
- T3-051: not_supported [OR27-1-R364 p.1012] Darlington (18th Pa. Cavalry): regiment moved from Hunterstown to the Union rear centre in the night of Jul 2-3, early forenoon moved to the left in line of battle, afternoon skirmishers, charge ~5 p.m. Nothing on resting, feeding
- T3-054: not_found [-] Abraham Brian farm (Hays HQ, fences, claim $1,028 paid $15): OR search 'Brian|Bryan' gives only de Trobriand, Bryan Grimes and Lt. Col. Bryan (Texas), unrelated. Claim amounts conflict ($575 NPS vs $1,028); claim file unread.
- T3-059: supported_partial [OR27-1-R273 p.781] Ruger: at about 10 a.m. he orders two regiments (2d Mass., 27th Ind., Third Brigade, Colgrove) to try the enemy on the right of the breastworks, left of the swale (p.781); p.782: 'Lieutenant-Colonel Mudge, Second Massachusetts Vol
- T3-065: not_found [-] Meade finishes plan, Hunt places batteries, Meade and Warren ride to Little Round Top and see massed batteries: only NPS secondary; not found in OR (OR27-1-R017 p.203 mentions Warren and Round Top signal station, unrelated to this
- T3-067: not_found [-] Thompson house/Seminary hospital facts: OR search 'Thompson.{0,40}(house|farm)' hits only Brandy Station area; no OR passage. Secondary sources only.
- T3-070: not_found [-] Warfield house and claim ($410 vs $516): OR search 'Warfield' returns 0 hits. Not an OR claim.
- T3-072: not_found [-] Heat figures (87 F, heat index, 4/10 cloud) trace to Jacobs and secondary summaries; not OR claims.
- T3-073: not_found [-] Acoustic/propagation model statement; explicitly inferred, no source claimed. Not an OR claim.
- T3-075: supported_partial [OR27-1-R318 p.883] McGilvery: about 12:30, at least 140 guns. Meade to Halleck 8:35 p.m. Jul 3 (R006 p.74): 'The enemy opened at 1 p. m. from about 150 guns'; Hunt (R028 p.239) 'opened, at about 1 p. m.'; Hancock/Hunt/Pendleton values range to about
- T3-081: not_found [-] Sun azimuth/altitude and weather at 13:00: ephemeris computation and Jacobs/TeachersFirst; not OR claims. Time base unstated in row.
- T3-082: not_found [-] Meade moves to Powers Hill: OR search 'Power.?s.{0,5}Hill|Powers' finds no such passage. Secondary sources only. Seed text duplicated (parse defect).
- T3-085: supported_partial [OR27-2-R565 p.697] Stuart: on Jul 3 he moved to the left of Ewell's left with W. H. F. Lee's and Jenkins' brigades, Hampton's and Fitz. Lee's following; Jenkins had only 10 rounds (row says 'out of ammunition' - partial). p.699: 'After dark, I direc
- T3-087: not_found [-] Leister house (Meade HQ) damage, 17 dead horses, aid station: OR search 'Leister|Lister' returns only unrelated names. Secondary/claim-file sources only.
- T3-089: supported_partial [OR27-1-R318 p.883] McGilvery's morning-of-Jul-3 line (OCR 'ihirtyruine' = thirty-nine): Ames 6, Dow 4, NJ 6, section 2, Conn. 6, Hart 4, Phillips 6, Thompson 5. Conflicts with the row's '6-23 guns varying'. Rittenhouse (late Hazlett's D, 5th US, six
- T3-090: supported_partial [OR27-1-R016 p.197] Letterman: Moore wounded on the 3d, died Jul 6. Supported: Moore mortally wounded Jul 3, died Jul 6. Conflict: the OR assigns him to the 61st Ohio, Eleventh Corps, the row says V Corps 3rd Div. Not supported: Granite Schoolhouse h
- T3-094: supported_partial [OR27-1-R028 p.239] OR end values span about 14:00 to about 16:00: McGilvery (R318 p.883) enemy fired 'about one hour and a half' from 12:30; Hunt p.239 'About 3 p. m., and soon after the enemy's fire had ceased'; R243 p.706 '3.30 p. m. we ceased our
- T3-095: not_found [-] Jacobs 14:00 reading 87 F, 4/10 cloud: secondary (STRAT-MET, TF-WX, HN-HEAT); not an OR claim.
- T3-102: not_found [-] Temperature 87 F (Jacobs, secondary), 89 F estimate, sun azimuth/altitude computed, smoke inferred. Not OR claims.

## Citations corrected
None of these rows carried an OR citation in the shard file; where a page was located the correct report and page are in results.jsonl. Notable corrections: T3-090 (Moore is 61st Ohio, XI Corps per Letterman p.197, not V Corps); T3-157 (Imboden, not Baker, has the wagon trains: Stuart p.699); T3-089 (OR gives 39 guns not 6-23: McGilvery p.883); T3-173 (rain impeded, not aided, the retreat: Lee p.322); T3-103 (Lee p.318 three-quarters of a mile is not the Jul 3 advance distance).
