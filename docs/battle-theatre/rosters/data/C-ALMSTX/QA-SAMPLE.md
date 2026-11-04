# QA sample, family C-ALMSTX

Run 30 October 2026. Two checks.

## 1. Thirty sampled rows (fixed seed, `qa_sample.csv`)

Rows were drawn across 9 sources (FL 5, Oates 4, Hurst 4, Polley 5, Goldsborough 3, Rowland 3, Brewer 3, Park 1, Estes 2). The automatic test: the surname printed in the row occurs in the cached source text. Result: 30 of 30. This proves the name came from the source, not that the label is right.

| source | unit | name as printed | label | locator |
|---|---|---|---|---|
| FL-SOLDIERS-1903 | C-5FL | McSwain, Charles | Unknown | djvu p.157 (book p.151) |
| FL-SOLDIERS-1903 | C-2FL | Hall, Scott N | Unknown | djvu p.99 (book p.93) |
| FL-SOLDIERS-1903 | C-5FL | Davis, William W | Unknown | djvu p.158 (book p.152) |
| FL-SOLDIERS-1903 | C-5FL | Clayton, Dilman | Unknown | djvu p.142 (book p.136) |
| FL-SOLDIERS-1903 | C-5FL | Edwards, Edward | Unknown | djvu p.148 (book p.142) |
| AL-OATES-1905 | C-15AL | A. M. McKissack | Unknown | App. A, Co. A, p. |
| AL-OATES-1905 | C-15AL | C. C. Johnson | Absent-Documented | App. A, Co. L, p. |
| AL-OATES-1905 | C-15AL | Thos. B. Gray | Present-Documented | App. A, Co. H, p. |
| AL-OATES-1905 | C-15AL | Thos. A. Gray | Unknown | App. A, Co. I, p. |
| AL-HURST-1863 | C-14AL | Howze, VV | Absent-Documented | roll of Co. F, djvu line 2202 |
| AL-HURST-1863 | C-14AL | Stewart, W | Unknown | roll of Co. F, djvu line 2246 |
| AL-HURST-1863 | C-14AL | Grimes, C C | Unknown | roll of Co. C, djvu line 1357 |
| AL-HURST-1863 | C-14AL | Farrow, S | Unknown | roll of Co. H, djvu line 2712 |
| TX-POLLEY-1910 | C-3AR | G. W. Fuller | Unknown | Polley 1910, Appomattox roll, djvu line 13870 |
| TX-POLLEY-1910 | C-4TX | Norton, W. | Unknown | Polley 1910, muster rolls, djvu p.374 col.2 |
| TX-POLLEY-1910 | C-1TX | Hinds, James | Unknown | Polley 1910, muster rolls, djvu p.362 col.1 |
| TX-POLLEY-1910 | C-5TX | Chas. Settle | Unknown | Polley 1910, muster rolls, djvu p.389 col.1 |
| TX-POLLEY-1910 | C-1TX | Runnels, Perry | Unknown | Polley 1910, muster rolls, djvu p.362 col.2 |
| MD-GOLDSBOROUGH-1869 | C-ART-Doll | Long, George | Unknown | Goldsborough roster, djvu line 14670 |
| MD-GOLDSBOROUGH-1869 | C-ART-Brown-C | Culver, William | Unknown | Goldsborough roster, djvu line 16651 |
| MD-GOLDSBOROUGH-1869 | C-ART-Dement | Duvall, P. B | Unknown | Goldsborough roster, djvu line 13420 |
| MS-REGISTER-1908 | C-17MS | Jesse C. Wright | Unknown | Register 1908, Military History of Mississippi, djvu line 38681 |
| MS-REGISTER-1908 | C-13MS | John A. Cameron | Unknown | Register 1908, Military History of Mississippi, djvu line 37663 |
| MS-REGISTER-1908 | C-42MS | W. L. Mawkins | Unknown | Register 1908, Military History of Mississippi, djvu line 40997 |
| AL-BREWER-1872 | C-44AL | John IP. Neilson | Unknown | Brewer 1872 War Record, djvu line 43454 |
| AL-BREWER-1872 | C-4AL | Robert T. Coles | Unknown | Brewer 1872 War Record, djvu line 39476 |
| AL-BREWER-1872 | C-6AL | Isaac F. Culver | Unknown | Brewer 1872 War Record, djvu line 39710 |
| AL-PARK-1906 | C-12AL | William Harris | Unknown | Park 1906, Co. H sketch, djvu line ~874 |
| US-ESTES-1912 | C-3AL | Brooks, Wm. M. | Unknown | Estes 1912, alphabetical list of field officers |
| US-ESTES-1912 | C-13MS | Donald, George L. | Unknown | Estes 1912, alphabetical list of field officers |

## 2. Page-image checks (compared by eye with the row text)

* Polley 1910, book p.303 (djvu p.357, `hoodstexasbrigad00poll_page_n356_w1500.jpg`): 82 rows (First Texas Co. A 68, start of Co. B 14). All 82 names and remarks match the image, and the 7 Gettysburg or Sharpsburg or Gaines Farm remarks are labelled correctly. Deviations: the OCR reads "Fostlethwaite" for Postlethwaite and "Wimberlj^" for Wimberly (kept, the second flagged); two entries printed "Slaughter, ----" and "Shropshire, ----" are kept with the blank. "killed in battle" with no place is labelled Unknown with flag `undated-separation`, not Absent.
* Soldiers of Florida 1903, book p.191 (djvu p.197, `soldiersofflorid00flor_page_n196_w1500.jpg`), 8th Florida Co. A end and Co. B: remarks and dates read correctly for the rows that have names (Andrews F. William, Bleach J. T., Campbell William, Dismukes, Waller, Booth). Defects found: (a) the OCR layer lacks the names of about 13 of 58 rows on this page (Arline, Barfield, Barineau, Barrinton and others are on the page), kept as empty-name rows; (b) the rank header "1st Lieutenants" on the same line as a wrapped remark was read as a row, fixed in `fl_parse.py` after this check (John W. Booth is now 1st Lieutenant); (c) "Barington, S" in the OCR layer is "Barrinton, S." on the page. Not fixed: the missing names (G02, CA07).

Not done: a 30-row check against page images for every source. Only two pages were opened as images.


## 3. Independent audit (30 October 2026)

A second, stratified 60-row sample (seed 41) and a 73-row post-repair sample were checked against the cached sources: see `AUDIT.md` and `audit_sample_seed41.csv`. The 30-row check above tests surname presence only.
