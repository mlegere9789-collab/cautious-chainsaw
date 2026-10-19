# Page-image sampling test, pilot (19 October 2026)

**This is a spot check by the author, not the independent test.** The same agent that wrote the parsers read three page images and compared them with the parsed rows. The pages were chosen by hand, not drawn at random (one for each regiment, picked to include an officers table, a ditto-mark page and a plain two-column page). Three pages and 155 rows cannot support a percentage claim; they show which kinds of error occur. The independent test is specified in PLAN section 4.4 and has not been run, because it needs a second agent that does not see the classifier.

How each page was checked: the Internet Archive page image (`https://archive.org/download/ID/page/nN_w1500.jpg`, N = djvu page index minus 1) was read and every parsed row on the page compared with what is printed: name, residence, date, remark and the presence label that follows from them.

| sample | page | rows | correct label | label too weak (Unknown where the page decides) | label wrong (asserts the opposite of the page) | row or name structure error |
|---|---|---|---|---|---|---|
| 6th Wisconsin, Company E first page | book p.513, IA leaf n530 (djvu 531) | 43 (10 officers, 33 enlisted) | 34 | 6 (Marston under-labelled, Deacon, Atwell A. B., Brooker, Campbell, Cisco) | 3, all officers: Bragg, Hyatt, J. B. Johnson | 0 |
| 20th Maine, Company C continued | Maine AG report 1863 p.579, IA leaf n798 (djvu 799) | 59 | 53 | 5 (Jordan F., Jordan W., Joslin, Taylor, Simmonds) | 0 | 1 (Morgan P. and Morrill C. merged into one row across an ink blot) |
| 26th North Carolina, Company E | Moore vol 2 p.382, IA leaf n391 (djvu 391) | 53 printed entries | 51 | 2 (Gilliland J. O., Jenkins R. L.: year or month garbled) | 0 | 5 name errors (Farrington read Farriugton, James read Ja^mes, Richard Jenkins, Hicks, and one entry whose surname was glued to the previous line) |

What each hard error was, and what was changed afterwards:

* Bragg (Wisconsin, labelled Present-Probable): Dawes's chapter on the June 1863 marches says Colonel Bragg was ill and went to Washington, and he rejoined on 8-9 July. A roll cannot show that. Fix: an officer table of facts from the regimental history overrides the roll (Dawes list of line officers present; Bragg absent). General lesson: field and staff officers need their own evidence pass.
* Hyatt (Wisconsin, labelled Absent): the officer table's Date column is "Rank from" (19 April 1864, Captain), which the first classifier read as an enlistment date after the battle. Dawes names Lieutenant Hyatt of Company B among the officers present. Fix: officer rows no longer use Rank-from as an enlistment date.
* J. B. Johnson (Wisconsin, labelled Present-Probable): "res. Dec. 27, '62" was missed because the abbreviation res. was not a separation keyword. Fix: added.
* Marston (under-labelled): the remark says "wnd. Antietam, Gettysburg" but the OCR read the G as C. Fix: the Gettysburg pattern accepts C and a truncated form.
* Maine remarks that begin with ditto marks (Jordan F., Jordan W.): the verb belongs to the row above. Fix: the verb is inherited from the previous remark in the same company. Simmonds: "Deo." read for Dec. Fix: OCR month table.
* North Carolina names: the plain-text layer sometimes puts the first word of the next entry at the end of the previous line. A junk-token clean-up and a wider start-of-entry pattern repaired most, not all (63 of 1,925 entries still begin with "e." or punctuation and carry the `name-garbled` flag).

These fixes were made after looking at the pages, so re-running the three pages now would agree with the page images by construction. The independent test must therefore use pages nobody has looked at. Residual weaknesses are listed in `../GAPS.md`.

Reading of the result: on enlisted men the rules produced no false Present or false Absent label in 145 rows; every hard error was an officer (3 of 10 officer rows on the one page that had an officers table), and 13 of 155 rows (8 percent) were labelled more weakly than the printed page supports (mostly Unknown), because the text layer lost a year, a month or a remark. The OCR text layer, not the labelling logic, is the main limit.
