# wounds-regions: evidence pass (medical workstream, group "Head, face, neck, spine, chest, abdomen, pelvis and back wounds: classes, frequencies, course")

Written 2026-11-16 by workstream bt-medical. Output: `docs/battle-theatre/medical/evidence/wounds-regions.jsonl` (399 rows). Proposed register entries: `docs/battle-theatre/GOVERNANCE/horde/ws-medical/proposed-register/wounds-regions-EG-MED-WR-01.md` to `-07.md`. Nothing was deployed; nothing was committed; no decision was taken on behalf of the owner (no line was added to the delegated decisions).

## 1. Result in one table

| item | value |
|---|---|
| rows | 399 |
| validator | `python3 -I tools/bt/medical/validate_evidence.py wounds-regions` -> wounds-regions: 399 rows, 0 failed |
| tiers | documented 384, inferred 9, open gap 6 |
| kinds | wound-stat 215, fact 57, case 57, treatment 56, wound-class 14 |
| region of the row (by topic) | head 85, chest 74, abdomen 62, face 53, neck 34, spine 28, pelvis 26, all regions 20, back 17 |
| theme | mortality 146, frequency 85, class or case (region first) 75, treatment 68, sequelae 25 |
| scene use | context 336, show 50, none 13 (rows with use show: 016, 021-025, 028, 048, 057, 066-067, 069-071, 075-077, 080-081, 083-084, 103-104, 113, 118-119, 132, 134-139, 168-173, 184, 192-193, 196, 199-200, 202-203, 208, 293, 295) |
| sources used | MSHWR-P1V2-1870-ALT 178, MSHWR-P3V2-1883 86, MSHWR-P2V2-1876 41, MSHWR-P1V2-1870 24, MSHWR-P3V2-1883-2NDISSUE 21, MSHWR-P2V2-1877-2NDISSUE 17, GROSS-1862-2ED 17, AMM-CATALOGUE-1866 8, TRIPLER-BLACKMAN-1862-3ED 4, CHISOLM-1864 3 |
| named cases | 57 rows of kind case, 56 of them at Gettysburg |
| conflict sets | 22 sets over 56 rows; no reading is marked as the default |
| open gaps | 6 rows (273, 274, 275, 276, 277, 278), proposed register entries EG-MED-WR-01 to -07 |
| inferred rows | 9 (089, 279, 280, 281, 282, 283, 284, 285, 286): computed shares and one footnote reading, each with its basis rows |

## 2. What was read, and in which printing

No source was acquired in this pass: every text read was already local (ledger `docs/battle-theatre/medical/SOURCES.md`), so no line was appended to the ledger. The page images of the volumes at the archive.org image host are refused by the proxy (403 on the tunnel); that is recorded and was not worked around. The one set of page images viewed is the local PDF of the second issue of Part III, Volume II (ledger id `MSHWR-P3V2-1883-2NDISSUE-PDF`, put there by the weapons group): printed pages 688 to 693 were rendered with `pdftoppm` to `tmp/medical-wounds-regions/img/` and read by eye (PDF page = printed page + 86).

| source id | printing (the edition statement carried by the rows) | rows |
|---|---|---|
| `MSHWR-P1V2-1870-ALT` | The Medical and Surgical History of the War of the Rebellion (1861-65), prepared under the direction of Surgeon General Joseph K. Barnes, Washington: Government Printing Office, 1870, the first surgical volume (Part I, Volume II), read in a second scan (a University of California library copy whose title page names the work a... | 178 |
| `MSHWR-P3V2-1883` | Part III, Volume II, Surgical History, first issue, Washington: Government Printing Office, 1883 (chapters X to XV: lower extremities, miscellaneous injuries, complications, anaesthetics, the medical staff and materia chirurgica, transportation of the wounded) | 86 |
| `MSHWR-P2V2-1876` | Part II, Volume II, Surgical History, first issue, Washington: Government Printing Office, 1876 (chapters VI to IX: abdomen, pelvis, back, upper extremities) | 41 |
| `MSHWR-P1V2-1870` | Part I, Volume II (the first surgical volume), Washington: Government Printing Office, 1870; its table of contents is at the end of the file | 24 |
| `MSHWR-P3V2-1883-2NDISSUE` | Part III, Volume II, Surgical History, second issue, Washington: Government Printing Office, 1883 | 21 |
| `MSHWR-P2V2-1877-2NDISSUE` | Part II, Volume II, Surgical History, second issue, Washington: Government Printing Office, 1877 | 17 |
| `GROSS-1862-2ED` | S. D. Gross, A Manual of Military Surgery, second edition, Philadelphia: J. B. Lippincott & Co., 1862 (entered 1861); clean OCR; the archive.org record dates it 1861 | 17 |
| `AMM-CATALOGUE-1866` | Catalogue of the Surgical Section of the United States Army Medical Museum, prepared under the direction of the Surgeon General, U. S. Army, by Alfred A. Woodhull (OCR: 'Alfred AYWoodhull'), Assistant Surgeon and Brevet Major, U. S. Army, Washington: Government Printing Office, 1866 (title page read; a Cornell University Libr... | 8 |
| `TRIPLER-BLACKMAN-1862-3ED` | Tripler and Blackman, Hand-book for the Military Surgeon, third edition, Cincinnati: Robert Clarke & Co., 1862 | 4 |
| `CHISOLM-1864` | J. Julian Chisolm, A Manual of Military Surgery, for the use of surgeons in the Confederate States army; with explanatory plates of all useful operations, third edition, carefully revised and improved, Columbia: Evans and Cogswell, 1864 (title page read) | 3 |

Parts read: Part I volume II (1870), the head, face, neck, spine and chest chapters (I to V) in two scans (`MSHWR-P1V2-1870` and the cleaner `MSHWR-P1V2-1870-ALT`); Part II volume II, the abdomen, pelvis and back chapters (VI to VIII), in the first issue (1876) and the second issue (1877); Part III volume II (1883), Chapter XII, pages 685 to 693 (the general survey of shot wounds by region: Tables CXVI, CXVII, CXIX and CXX and the text around them); Gross (1862, second edition, the chapter on each region), Tripler and Blackman (third edition, 1862), Chisolm (1864), the Army Medical Museum catalogue (1866, the Gettysburg specimens). The chapters of Part III on the limbs and on complications belong to other groups.

## 3. The Army-wide shares and the fatality by region (the sampling table)

The first surgical volume (1870) says that generalizations on the relative frequency of wounds by region would be premature (row 001) and prints a share for the chest only. The third volume (1883) prints the shares in Table CXIX for the 245,790 shot wounds that came under treatment; the killed are not in them (row 325). Values as printed; the quotients of the writer are in the notes of the rows. No reading is chosen as the default.

| region | cases (Table CXIX) | relative frequency, per cent (row) | percentage of fatality (row) |
|---|---|---|---|
| head | 12,089 | 4.91 (305) | 28.9 (306) |
| face | 9,416 | 3.87 (307) | 5.8 (308) |
| neck | 4,895 | 1.99 (309) | 15.0 (310) |
| spine | 642 | 0.26 (311) | 55.5 (312) |
| chest | 20,264 | 8.24 (313) | 27.8 (314) |
| abdomen | 8,438 | 3.43 (315) | 48.7 (316) |
| pelvis | 3,159 | 1.28 (317) | 29.7 (318) |
| back (flesh wounds) | 12,681 | 5.16 (319) | 6.9 (320) |
| upper extremities | 87,793 | 35.71 (321) | by the limbs group |
| lower extremities | 86,413 | 35.15 (322) | by the limbs group |
| all shot wounds recorded | 245,790 | 100 | 13.6 (323) |

Other rows on the same question: the text of page 691 (head, face and neck 10.77; trunk 18.37; upper 35.71; lower 35.15; row 324) and Table CXX (10.7, 18.4, 35.7, 35.1 for the same war; row 335); the surface of the body by Longmore (row 326); the killed on the battle-field, 1,173 cases with the seat recorded (row 327) and the History's own application of their proportions to 44,238 killed (row 328); the wounded and killed together (row 329); the reason the History gives for the pattern, the protection of the trunk and lower limbs in sieges and trenches (row 330); the extremes among other wars (rows 331, 332, 333); the incompleteness of the records (row 297).

The first surgical volume's own shares (the chest about one in twelve; one in fifteen for the last year of the war; the abdomen 3.3 per centum of a register of 253,142; the flesh wounds of the back four to six per centum) stand as rows with the third volume's figures in the conflict sets below. Eight rows (279, 280, 281, 282, 283, 284, 285, 286) are the writer's quotients of the 1870 and 1876 counts on the register of 253,142 men, made before Table CXIX was found; they are kept as second readings on another denominator, tier inferred, with their basis rows, and their text was corrected to say so.

## 4. Classes, course and treatment by region

| region | rows | main sources of the rows |
|---|---|---|
| head | 85 | P1V2-1870-ALT 33, P1V2-1870 22, P3V2-1883 13, GROSS-1862-2ED 7, P3V2-1883-2NDISSUE 4 |
| face | 53 | P1V2-1870-ALT 43, P3V2-1883 5, GROSS-1862-2ED 3, AMM-CATALOGUE-1866 1, P3V2-1883-2NDISSUE 1 |
| neck | 34 | P1V2-1870-ALT 20, P3V2-1883 13, P3V2-1883-2NDISSUE 1 |
| spine | 28 | P1V2-1870-ALT 19, P3V2-1883 8, AMM-CATALOGUE-1866 1 |
| chest | 74 | P1V2-1870-ALT 61, P3V2-1883 6, GROSS-1862-2ED 3, AMM-CATALOGUE-1866 2, TRIPLER-BLACKMAN-1862-3ED 1 |
| abdomen | 62 | P2V2-1876 27, P3V2-1883 16, P2V2-1877-2NDISSUE 8, GROSS-1862-2ED 4, P1V2-1870-ALT 2 |
| pelvis | 26 | P3V2-1883 14, P2V2-1877-2NDISSUE 9, P2V2-1876 3 |
| back | 17 | P2V2-1876 11, P3V2-1883 6 |
| all regions | 20 | P3V2-1883-2NDISSUE 13, P3V2-1883 5, P1V2-1870 2 |

Tables entered as rows (the numbers of each class: cases, recoveries, deaths, undetermined results, percentage of fatality): the head classes of Table VI (1870) and Table CXVI (1883); the face and neck classes of Tables XI to XIV and XVII (1870) and CXVI; the spine classes of Table XIX (1870) and CXVII; the chest counts and mortality of Tables XXIV to XXVI (1870; the class rows of Table XXIV are not used, gap row 277) and the chest classes of CXVII; the abdomen counts of Tables I, II and IV (1876, 1877) and the abdomen classes of CXVII (the organs one by one); the pelvis rows of Table IX (1877) and the pelvis classes of CXVII; the back classes of CXVII and the text of Chapter VIII (1876). Where two printings give different numbers for the same class, both are rows in a conflict set (section 6).

Treatment rows (68) are of two kinds: the practice the History reports (the simple dressing, the broad chest bandage, adhesive plaster, carded oakum, hermetical sealing, iron styptics, the water-bed, venesection abandoned, opium) and the doctrine of the manuals (Gross, Tripler and Blackman, Chisolm). The period words are kept as printed (section 9).

## 5. Gettysburg

56 rows of kind case name a man or a hospital of Gettysburg (56 of the 57 case rows; the others are cases of the war at other places, kept because the History gives them for the same treatment).

| hospital or corps named in the row | rows |
|---|---|
| Camp Letterman | 219, 249-251, 254, 256 |
| the First Corps | 219, 224 |
| the Second Corps | 221, 259 |
| the Third Corps | 220, 247-248 |
| the Fifth Corps hospital | 226-230, 234, 237, 240 |
| the Eleventh Corps | 222-223, 235 |
| the Twelfth Corps | 253-254 |
| Seminary Hospital | 231, 238-239, 241, 243-244, 255-256, 258 |
| White Church Hospital | 260 |

The only Gettysburg-wide figure found for any region is Billings's 858 cases at Gettysburg with 295 deaths (row 216; gap row 274). The regional tables of the third volume are for the whole war. Gettysburg-alone shares are not printed in the local texts: the sampling table must borrow the Army-wide shares of section 3 and mark them as borrowed (register entry EG-MED-WR-02). The named cases are a selection (EG-MED-WR-05): the scratch lists of the group hold 265 passages naming Gettysburg in the first surgical volume (160 in the chapter on the head, 44 chest, 36 face, 13 spine, 10 neck, 2 elsewhere) and 151 in the 1876 volume (the word itself occurs 305 and 167 times in the second scans, tables of engagements and chapters of other groups included).

## 6. Conflict sets (every reading is a row; none is the default; the owner decides)

| set | rows and values as printed |
|---|---|
| `cs.abdomen-aggregate-count` | 148 8,538 cases (P2V2-1876 p. iii); 153 8,590 cases (P2V2-1876 p. 203); 336 8,438 cases (P3V2-1883 p. 689) |
| `cs.abdomen-intestines-mortality-ratio` | 359 80.4 per cent died (P3V2-1883 p. 689); 367 89.4 per cent died (P3V2-1883-2NDISSUE p. 689) |
| `cs.abdomen-mortality-ratio` | 154 48.21 per cent died (P2V2-1876 p. 203); 316 48.7 per cent died (P3V2-1883 p. 691) |
| `cs.abdomen-penetrating-mortality` | 155 87.2 per cent died (P2V2-1876 p. 203); 303 86.9 per cent died (P3V2-1883-2NDISSUE p. 690) |
| `cs.abdomen-regimen` | 168 a practice (P2V2-1876 p. 207); 211 a practice (TRIPLER-BLACKMAN-1862-3ED p. 89) |
| `cs.abdomen-share-of-wounds` | 159 6.6 per cent (P2V2-1876 p. 201); 160 3.8 per cent (P2V2-1876 p. 201); 161 4.28 per cent (P2V2-1876 p. 201); 162 3.3 per cent (P2V2-1876 p. 201); 280 3.39 per cent of 253,142 (computed) (P2V2-1876 p. 203); 315 3.43 per cent of the shot wounds recorded (P3V2-1883 p. 691) |
| `cs.chest-penetrating-mortality` | 129 above sixty per cent. (P1V2-1870-ALT p. 608); 130 25 per cent died (P1V2-1870-ALT p. 606-607); 215 a practice (CHISOLM-1864 p. 327-328); 338 65.1 per cent died (P3V2-1883 p. 689) |
| `cs.chest-share-of-wounds` | 121 about one in twelve (P1V2-1870-ALT p. 599-600); 122 7,173 chest wounds (P1V2-1870-ALT p. 600); 126 for the chest, 1 in 12 (Crimean sieges, Scrive) (P1V2-1870-ALT p. 600-601); 279 8.14 per cent of 253,142 (computed) (P1V2-1870-ALT p. 599); 313 8.24 per cent of the shot wounds recorded (P3V2-1883 p. 691) |
| `cs.chest-venesection` | 140 a practice (P1V2-1870-ALT p. 644); 204 a practice (GROSS-1862-2ED p. 108) |
| `cs.face-fractures-count` | 050 3,312 cases (P1V2-1870-ALT p. 381); 350 4,502 cases (P3V2-1883 p. 688) |
| `cs.face-fractures-mortality` | 051 11.4 per cent died (P1V2-1870-ALT p. 381); 351 9.8 per cent died (P3V2-1883 p. 688) |
| `cs.face-soft-parts-closure` | 073 a practice (P1V2-1870-ALT p. 388); 075 a practice (P1V2-1870-ALT p. 389-390); 200 a practice (GROSS-1862-2ED p. 105) |
| `cs.head-antiphlogistic` | 197 a practice (GROSS-1862-2ED p. 104); 213 a practice (CHISOLM-1864 p. 276) |
| `cs.hfn-share-of-shot-wounds` | 324 head, face and neck 10.77; trunk 18.37; upper extremities 35.71; lower extremities 35.15 (per cent of the shot wounds recorded) (P3V2-1883-2NDISSUE p. 691); 335 head, face and neck 10.7; trunk 18.4; upper extremities 35.7; lower extremities 35.1 (per cent) (P3V2-1883 p. 693) |
| `cs.pelvis-aggregate-count` | 149 3,100 cases (P2V2-1876 p. iii); 176 3,174 cases (P2V2-1877-2NDISSUE p. 423); 337 3,159 cases (P3V2-1883 p. 689) |
| `cs.scalp-mortality-ratio` | 007 2.09 per cent died (P1V2-1870 p. 89); 339 3.2 per cent died (P3V2-1883 p. 688) |
| `cs.shot-wounds-total` | 296 245,790 cases (P3V2-1883-2NDISSUE p. 688); 334 245,739 cases (P3V2-1883 p. 693) |
| `cs.skull-both-tables-mortality` | 032 64.6 per cent died (P1V2-1870-ALT p. 307); 344 65.5 per cent died (P3V2-1883 p. 688) |
| `cs.skull-contusion-mortality` | 029 16.8 per cent died (P1V2-1870-ALT p. 307); 340 16.7 per cent died (P3V2-1883 p. 688) |
| `cs.skull-outer-table-mortality` | 030 8.7 per cent died (P1V2-1870-ALT p. 307); 341 7.2 per cent died (P3V2-1883 p. 688) |
| `cs.skull-penetrating-mortality` | 033 85.5 per cent died (P1V2-1870-ALT p. 307); 304 82.7 per cent died (P3V2-1883-2NDISSUE p. 690) |
| `cs.skull-perforating-mortality` | 034 80 per cent died (P1V2-1870-ALT p. 307); 347 76.7 per cent died (P3V2-1883 p. 688) |

Printed inconsistencies of the History itself, carried as printed (the notes of the rows give the quotient): Table CXIX prints 3.87 for the face where 9,416 of 245,790 is 3.83, and 10.77 for the head, face and neck where 26,400 of 245,790 is 10.74 (Table CXX prints 10.7); Table CXX prints 245,739 cases for the war where its own regional counts add to 245,790; Table CXVI prints 36.7 for the fissures of the skull where 7 of 19 is 36.8; Table CXVII prints 89.4 in the line of the wounds of the intestines in the second issue where 484 of 602 is 80.4 (the first issue reads 80.4; the first issue's page image was not viewed).

## 7. Method and checks

* **Quotes.** Every documented and inferred row carries a verbatim quote that the validator finds in the local text (offset recorded). Pieces of one quote are joined by " ... " and each stands on one page. Dotted leaders of tables are dropped from the quotes; the line-end hyphen is joined; nothing else is changed.
* **Digits.** In every documented and inferred row the numbers of the claim stand in the quote (the validator checks it). 83 rows had the digits of their quote also found by exact match in the other scan or issue, 47 table rows were read there number by number, 12 only in part (the row adds up instead), and 7 did not match there because the OCR of the other copy differs (rows 183, 224, 232, 237, 253, 260, 295); 98 rows say in their notes that their numbers were compared with a page image.
* **Adding up.** 73 rows say in their notes that their numbers add up (cases = recoveries + deaths + undetermined results, checked by the builder). The writer also added the class lines of each region of Tables CXVI and CXVII from the rows: every column of every region agrees with the printed total line (head 12,089 = 6,573 + 2,676 + 2,840; face 9,416; neck 4,895; spine 642; chest 20,264; abdomen 8,438; pelvis 3,159; back 12,681).
* **OCR corrections.** 62 rows carry ocr.corrections (67 corrections: other-copy 3, internal-consistency 2, page-image 62); the corrections not read from a page image (basis internal-consistency or other-copy) are on rows 032, 142, 183, 244, 260 and raise the validator's W008. The page-image corrections name the image: p3b-0774.png, p3b-0775.png, p3b-0777.png, p3b-0779.png and the crops p688-head-crop-0774.png, p688-head-pct-0774.png, p689-abd-crop-0775.png, p689-spine-chest-crop-0775.png in `tmp/medical-wounds-regions/img/`. The images are those of the second issue of Part III; the table rows of Tables CXVI, CXVII, CXIX and CXX quote the OCR of the first issue (its labels stand beside its numbers), so they rest on the two issues printing the same numbers: the sums of the lines and columns and the second issue's OCR agree with the readings, and the one difference seen is the intestines line (rows 359 and 367).
* **Pages.** Printed page numbers come from the running heads of the OCR text (a chain of heads checked against the contents list) for the 1870 and 1876 volumes; an audit of 243 rows found no mismatch after correction. The rows of Part III were paged by hand from the running heads and the page images. Where a quote could be on one of two pages the row gives the range.
* **Tier.** documented: a non-lead source says exactly the claim. inferred: the 9 rows above, each with basis_rows and a stated inference. open gap: 6 rows with gap.needed and a proposed register id. No row is plausible-procedural: the scene may show only what a row documents; the practice of the war applied to a Gettysburg ward is an inference carried in register entry EG-MED-WR-06.
* **Medicine.** No modern medical knowledge is used as evidence; a modern name never replaces a period word in a claim.
* **Validator.** wounds-regions: 399 rows, 0 failed; warnings: W001 31, W002 149, W003 3, W008 5. W001: the quote matched with a few OCR edits (the text differs from the quote by OCR noise); W002: the page differs from the validator's page hint, which is coarse (for the second issue of Part III, whose OCR has no running heads on many pages, it is off by several pages; the pages given here are those of the running heads and the page images); W003: the quote contains a word the page copy test refuses (a period word of the source; the claims do not); W008: the five corrections of rows 032, 142, 183, 244, 260.

## 8. Corrections made to this pass's own earlier output

1. The first run of this group carried an open-gap row (273) saying that no share of the wounds of the head, face, neck and spine is printed. That was wrong for the Army as a whole: Table CXIX of the third volume prints them. The row now records the gap that is real, the killed on the battle-field by seats finer than head and neck, trunk and limbs (1,173 cases only), and register entry EG-MED-WR-01 was rewritten.
2. The eight computed share rows (279, 280, 281, 282, 283, 284, 285, 286) said that no share is printed; they were made on the register of 253,142 and now say that Table CXIX prints another share. They are kept.
3. The gap row on Gettysburg-alone shares (274) said the Appendix is of the first volume of the History; the History cites it as "Appendix to Part I" and the bound volume that carries it is not known to this group. The row now says so. The ledger lists Part I, Volume I (`MSHWR-P1V1-1870`) as planned.
4. The gap row on Table XXIV (277) now says that the classes of gunshot wounds of the chest are entered from Table CXVII of the third volume.
5. Earlier in the pass the page numbers of several rows were corrected after an audit against the running heads (the abdomen flesh-wound row and the abdomen share rows, the pelvis classes, the dressing-plates gap, and four case rows).

## 9. Period terms used in the quotes and claims (as printed; the rows are the evidence)

| term | rows containing it | first rows |
|---|---|---|
| tromatopnoea | 2 | 132, 146 |
| hermetically sealing | 1 | 217 |
| hermetical | 13 | 217, 226, 227, 228, 229, 230 |
| simple dressing | 2 | 139, 251 |
| water-bed | 2 | 118, 119 |
| hernia cerebri | 1 | 262 |
| plaies en séton | 1 | 016 |
| crash or smash | 2 | 028, 035 |
| ecrasement | 1 | 035 |
| venesection | 6 | 140, 141, 152, 167, 197, 204 |
| antiphlogistic | 3 | 083, 175, 214 |
| collutories | 1 | 083 |
| dossil | 1 | 173 |
| carded oakum | 1 | 137 |
| binders' board | 1 | 081 |
| four-tailed bandage | 1 | 081 |
| persulphate of iron | 2 | 077, 239 |
| perchloride of iron | 1 | 079 |
| contre-coup | 1 | 348 |
| fissures | 1 | 343 |
| penetrating | 47 | 008, 033, 040, 123, 127, 128 |
| perforating | 6 | 008, 034, 130, 246, 300, 347 |
| flesh wound | 26 | 058, 059, 060, 150, 157, 158 |
| trephin | 5 | 041, 042, 195, 196, 243 |
| adhesive plaster | 5 | 023, 067, 076, 136, 173 |
| expectant | 3 | 130, 214, 215 |
| emphysema | 3 | 134, 147, 291 |
| haemoptysis | 2 | 202, 293 |
| peritonitis | 2 | 152, 174 |
| opium | 5 | 140, 152, 168, 204, 211 |
| ligation | 3 | 043, 117, 260 |
| carotid | 3 | 043, 248, 265 |
| sinapism | 2 | 192, 204 |
| leech | 1 | 197 |
| cupping | 1 | 197 |
| calomel | 1 | 168 |
| ice | 31 | 005, 024, 025, 071, 072, 074 |
| oesophagus | 10 | 092, 099, 103, 104, 105, 246 |
| supra renal | 1 | 365 |
| nates | 1 | 399 |

## 10. Open gaps and proposed register entries

| entry | subject | gap rows |
|---|---|---|
| EG-MED-WR-01 | the killed on the battle-field by region: the seat of injury is known for 1,173 of not less than 44,238 | 273 |
| EG-MED-WR-02 | wounds by region for Gettysburg alone | 274 |
| EG-MED-WR-03 | the rule and the place for the mortally wounded | 275 |
| EG-MED-WR-04 | plates and page images not viewed; Table XXIV digits; one reader for the page images | 276, 277 |
| EG-MED-WR-05 | named Gettysburg cases entered as a selection | 278 |
| EG-MED-WR-06 | the practice of the war applied to Gettysburg is an inference | (no row) |
| EG-MED-WR-07 | conflicts of figure and practice carried as readings | the 22 sets of section 6 |

## 11. Not done, and why (nothing here is a decision; each is owed)

* A second, independent reading of the page images of Tables CXVI, CXVII, CXIX and CXX (printed pages 688 to 693): one reader read them; the sums of every line and column agree with the printed totals, which is a strong check but not a second reading.
* The page images of the first issue of Part III (the quotes of the table rows are its OCR; its images are not local) and of Parts I and II (the image host is refused by the proxy).
* The total lines of Tables CXVI and CXVII are not entered a second time as class rows: their numbers are in the Table CXIX rows and, for the abdomen and pelvis, in rows 336 and 337.
* The named Gettysburg cases are a selection (EG-MED-WR-05); the shares for Gettysburg alone are not printed (EG-MED-WR-02); the rule for the mortally wounded is not stated in the local texts (EG-MED-WR-03).
* The browser, the gates and the node suites were not run: this pass writes evidence rows only.

## 12. Rebuild

The rows are written by a builder kept in `tmp/medical-wounds-regions/` (scratch, ignored by git): `python3 -I build.py` rebuilds the file from the definition files `d_*.py` (each row is a Python dict with its anchors; ids are kept in `keys.json`), `python3 -I build.py --dry` checks without writing, `python3 -I make_report.py <validate output>` writes this report and the register entries. The file itself is never edited by hand.
