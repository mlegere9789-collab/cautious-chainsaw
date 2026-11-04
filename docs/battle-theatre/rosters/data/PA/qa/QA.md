# PA visual QA record (agent's own reading of page images)

Honest scope: this is the agent checking its own output against page images and the text layer. It is not the independent sampling test of PLAN 4.4 and does not satisfy gate R-G9. Counts were made by eye and are approximate to plus or minus 2 rows. Development pages (used while fixing the parser) are listed separately and excluded from the result.

## Development pages (excluded from the result)
Vol 1 (IA `historyofpennsyl01bate`) djvu pages 388 and 398 (26th Pennsylvania, companies B, C, G).

## Pages read for QA after the rules were frozen

| page | unit | rows on the page | rows found by the parser | names right (same man, spelling aside) | dates read: wrong / right / lost | labels: false Present or false Absent (hard) / weaker than the page supports |
|---|---|---|---|---|---|---|
| vol 4 djvu 444 (printed p. 420, 140th, end of Co. C, start of Co. D) | U-140PA | 50 | 50 | 50 of 50 | muster dates: 0 wrong / 19 right / 31 lost (year dropped by the first OCR) | 0 / about 9 (Gettysburg misspelt "Geitysuurg" and "Wounued": rule since widened; OCR-garbled year of a discharge) |
| vol 2 djvu 740 (printed p. 724, 69th, Co. E) | U-69PA | 65 | 65 | 65 of 65 (6 names carry OCR letter errors: "JIurphy", "Moonej'") | muster dates: 2 wrong (day digit: 15 for 16, 23 for 25) / 50 right / 5 lost; the 2 blank dates printed blank | 0 / about 10 (a printed discharge or desertion whose year or day the first OCR garbled; the year repair added later recovers several) |

Result: row segmentation 115 of 115; no false Present and no false Absent label in 115 rows (zero hard errors); date digit errors 2 of about 70 read dates (3 percent); about 17 percent of rows labelled more weakly than the page supports, all because the OCR text of a date or a remark word is damaged. These fall short of the PLAN gates (R-G1 99 percent, R-G2 99 percent): the pipeline is not at gate level on dates and names until a second OCR or an image read covers every page.

## Second OCR check (Windows OCR of the date column)
On 373 roll pages (the pages of the units with most Gettysburg casualties first), rows where both readings gave a muster date: 6,601 equal; 112 where the first OCR had month and year without the day and the second completed it; 456 different (7,169 compared): 256 differ in the day, 135 in the month, 65 in the year, so the two readings disagree on 6.4 percent of overlapping dates and **neither is reliable at the gate level**. The first reading is kept where it exists. The second reading supplied a date for 3,855 rows that had none; its dates move a row to on-roll-undetermined, and an Absent-Documented label from it (muster after the battle) is allowed only when at least 3 other rows of the unit read the same muster date in the first OCR (otherwise Unknown, flag `second-ocr-date-uncorroborated`).

## Structural QA for every unit
`structural_qa.csv`: rows, rows with missing or garbled name, rows without a date, rows whose remark names Gettysburg but are not Present-Documented (contested, "gettysburg-mention-nonbattle"), unreadable share. `<unit>_sample30.csv`: seeded (20261030) sample of 30 rows per unit, 10 per label where available, with empty reader columns for the independent test.
