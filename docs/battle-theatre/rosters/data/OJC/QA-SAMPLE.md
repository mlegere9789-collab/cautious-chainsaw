> Independent audit, 30 October 2026: this file is the builder's own development check. The independent sample (seed 41, 60 rows, plus 61 targeted rows) and its results are in `AUDIT.md`; the page images it used are listed in `AUDIT-images.json`. The accuracy findings of `AUDIT.md` supersede the claims below (names exact 67.8 percent, not 99).

# OJC page-image sample (development check, not the independent sample of PLAN 4.4)

Method: for each page below I read the page image (IA `page/nN_w1500.jpg`, N = leaf - 1) and compared every printed row with the CSV row for that page: name, residence or age, muster date, remark, and the label. Reading was by eye by the author, who also wrote the parsers, so this is not independent. The pages are listed so that an independent draw can exclude them. Results are for the final run of 30 October 2026.

| page (IA leaf) | unit | printed rows | rows in CSV | Present-Documented | Absent-Documented | Unknown | hard errors | rows labelled more weakly than the page supports |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `connecticutvolorg00catarich` 681 (book p. 677) | 17th Connecticut, Co. E privates | 68 | 68 | 5 | 11 | 52 | 0 | about 5 |
| `newjerseyincivil01recorich` 576 (book p. 570) | 11th New Jersey, Co. G, Died and Deserted lists | 47 | 47 | 5 | 8 | 34 | 0 | about 28 |
| `ohiowarroster06howerich` 548 (book p. 534) | 82nd Ohio, Co. E privates | 48 | 48 | 6 | 29 | 13 | 0 | about 2 |
| `bwb_W9-BTC-637` 160 (book p. 140) | 5th Ohio, corporals, musicians, wagoners and privates (parsed under company D) | 49 | 49 | 0 | 21 | 28 | 0 | about 4 |

Total 212 rows, 0 hard errors, about 39 rows (18 percent) weaker than the page supports. Every Present-Documented row (16) matches a casualty or capture remark on the page; every Absent-Documented row (69) matches a printed separation before 1 July 1863 or a printed muster-in after 3 July 1863.

## Defects this sample (and the follow-up audit of all Present-Documented remarks) found, all fixed and re-run on every unit

1. `Wd. May 2, '63. Mustered out July 19, '65.` (17th Connecticut, Brotherton): the date of the first event was attached to the second verb and read as a separation before the battle. Separation verbs now take only the date that follows them. Fixed; row is Unknown.
2. A month word in the remark column became the muster date when the date cell was unreadable (17th Connecticut, Bloomer: false `ENL-AFTER`). The month anchor now has to lie inside the date column.
3. `Died ... Nov. 7, '64` read as `'61` (11th New Jersey, Parent): the label Absent was right but its basis was a misread year. A separation date earlier than the muster-in date is now treated as an OCR misread (rule in `lab.py`).
4. A transfer between companies read as a separation (82nd Ohio, Fultz) and a transfer or a death dated 1 to 3 July (`Tr. to Inv. Corps July 2, 1863`, `Died July 1, 1863, at Washington`) read as a casualty; found by auditing all 1,098 Present-Documented remarks of the first full run. Fixed.
5. Rows lost from the text layer: 2 of 47 (New Jersey) and 10 of 48 (Ohio) rows had no name words in the OCR layer and were dropped. They are now kept with an empty name and the flag `name-missing-in-text-layer` (3,011 rows in the family).
6. `Wounded July -, 1863, in battle of Gettys burg` (82nd Ohio, Coover) lost the Gettysburg match through an em dash segment split and a word broken by the typesetter. Fixed.

## Names (approximate, by eye)

Connecticut 9 of 68 rows have an OCR slip in the name (Aliearn for Ahearn, Bigclow, Josepli, Jolm, Beek, Northroj), New Jersey about 14 of 47, Ohio vol 6 about 4 of 48 (Battery for Hattery, Georee), Ohio vol 2 about 10 of 49 and 3 rows with no name in the text layer. The CSV keeps the OCR text as printed. The R-G1 name gate is not met by the OCR text.
