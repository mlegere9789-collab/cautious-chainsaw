# NE family: page-image quality check (author's check, not the independent test of PLAN 4.4)

Three printed pages were read from the page images (Internet Archive `page/nN_w1000.jpg`) against the stored rows. The pages were not drawn at random: one per source family, chosen to contain Gettysburg annotations. Rows were corrected by rule changes after the check, so only fresh pages count in the future independent test.

| family | page | rows | name errors in the text layer | label errors found | outcome |
|---|---|---|---|---|---|
| Massachusetts | Mass. Soldiers, Sailors and Marines vol 2, 20th Infantry, Company B, book p.511 (IA leaf 521) | 31 | 0 | 0 | all 31 labels agree with the printed remarks (2 Present-Documented, 12 Absent by separation before, 13 Absent by enlistment or transfer after, 4 Unknown on roll). OCR damage only inside remark text ("disabUity", paroled "1866" for 1865) |
| New Hampshire | Ayling vol 1, 2nd Infantry, printed p.43 (IA leaf 65 of `cu31924096263128`; the item's page-number file is one page off) | 40 | 3 (Ooyle for Coyle, Cvirrier for Currier, Catler for Cutler) | 0 | labels agree; Currier, Andrew J. correctly Present-Documented ("wd. July 2, '63, Gettysburg, Pa."); cross-reference rows correctly Duplicate-Xref; age `2` for 24 lost to OCR on one row; one swallowed entry (Currier, George, whose first word was garbled) was split by a rule added after the check |
| Maine | AG report 1863 App. D, 19th Infantry Company A, printed p.538 (IA page index 758) | 61 | 3 (Zeeman for Leeman, Tibbetts "IV" for W, "J oseph" with a space) | 2 rule faults, both fixed | (1) "Wonnd. at Gettysburg; in hosp." (Murphy, Wm B) was Unknown because the OCR garble defeated the Gettysburg pattern: now an OCR-tolerant match, rows re-labelled Present-Documented; (2) 13 men of the "Joined Co. since Nov. 1, 1862" section with July to October muster dates (Blake, Burns, Bagley and others) were Unknown on-roll: now Absent-Documented ENL-AFTER. The pilot had both faults; the 20th Maine rows were re-labelled by the same rules. One ditto-mark remark ("" "" 6.) stays Unknown |

Totals: 132 rows, 6 name errors (4.5 percent, text layer), 0 residual label errors on enlisted men after the fixes. The name figure fails gate R-G1 (99 percent); no second OCR was available (G02).

Also checked by image: the pilot's 20th Maine field and staff rows (IA page index 791, book p.571 and page index 822, book p.602): see README, "Pilot defect found and corrected".
