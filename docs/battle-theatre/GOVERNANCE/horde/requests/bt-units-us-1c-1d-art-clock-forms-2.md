# Request from bt-units (group us-1c-1d-art): addendum to the note on clock forms, and a gazetteer entry for Emmitsburg

Addendum to `bt-units-us-1c-1d-art-clock-forms.md` (same group, same file `history/undrawn/us-1c-1d-art.jsonl`). Nothing here is a defect of a record; each item changes what the integrator can do with records of the third pass. Nothing was committed or deployed and no `passes` flag was touched.

## 1. Three more records print the hour in words or in a damaged OCR digit

The checker reads a clock only when numerals and a.m., p.m., o'clock or m. stand in `when.printed`. These records of the third pass print the hour another way and are carried by sequence or day with the words in `when.printed`:

| Record | Unit | Printed words | Source | Carried as |
|---|---|---|---|---|
| 0508 | Twenty-fourth Michigan | "It was now eleven o'clock" | CURTIS-1891 (Curtis, 1891, p. 159) | `sequence`, after record 0507 |
| 0481 | Cutler's brigade | "at lo o'clock" (the OCR of 10 o'clock; Wadsworth, R032, prints about 10 a. m. for the division at the same place, record 0004) | NY2-S021 (sketch of the 95th New York) | `sequence`, after record 0480; the hour is in the statement and the note |
| 0433 | Cooper's battery | "About 1 or 1.30 p. m." | PA2-S031 (Gardner, 1889) | `printed_clock` 13:30, approximate (the earlier hour, 1, is only in the words) |

What is lost: the hour (11 a. m. for 0508; 10 a. m. for 0481; 13:00 to 13:30 for 0433). The change wanted is the one of the first note (read an hour in words and a range), plus a rule for an OCR digit that cannot be read (lo for 10): the reader may keep it as a words-only clock and name the page image for a check. Until then nothing is owed; the records keep their sequence.

## 2. Emmitsburg and Frederick have no gazetteer id

Records of 28 to 30 June place units at Emmitsburg, which stands about ten miles south of Gettysburg on the Emmitsburg road and outside the loaded ground: 0388 (Howard) and 0389 (the itinerary) name Marsh Run and Emmitsburg, 0496 (Bachelder's guide, 1889: the First Corps lay at Emmitsburg on the night of 30 June except Wadsworth's division at Marsh Creek, conflicting with 0388 and 0389) and the March of the Iron Brigade (Curtis, record 0504; Dawes, record 0505) name it. Record 0496 anchors it as `along_road` GZ-041 near GZ-072, `south_of`, distance 10 miles (printed "ten miles away"), because the gazetteer has no entry for the village.

The change wanted (not mine to make): a gazetteer entry for Emmitsburg (and for Frederick, where the corps reached on 28 June, printed in the Dawes letter and in the sketch of the 147th New York), kind `town`, flagged as outside the loaded ground, so that arrivals of 28 to 30 June carry a place and not a road and a distance. If no entry is wanted, nothing is owed.

## What was checked

`python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py us-1c-1d-art --complete` exits 0 with the file as it stands after the third pass: 0 errors, 2 warnings (records 0084 and 0209, whose notes say why no anchor exists).
