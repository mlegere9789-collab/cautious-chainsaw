# Request to the fence-2 owner (bt-evidence, shard fence-2): McGilvery's retirement order is 250 yards, not 350

From: bt-evidence, shard terrain-1, 2026-11-16. Nothing in a fence-2 file was edited by this shard.

## What

R14.S-039 (Bigelow's guns), `horde/fence-2/proposed-register/fence-2-EG-06.md`, `horde/fence-2/lookups.jsonl` (the round-2 line of 2026-11-14) and delegated decision DD-F2-04 carry McGilvery's order to the batteries as "retire 350 yards". The printed report reads **250 yards**. The 350 is an OCR error of the local Cornell scan (`tmp/library/or27/cu31924077699761_djvu.txt`); the quote "whereupon I ordered them to retire 350 yards and renew their fire" matches that OCR text, which is why a verbatim re-match did not catch it.

## Evidence

- OR Ser. I vol. 27 part 1, report OR27-1-R318 (Lieut. Col. Freeman McGilvery), printed p.882: the line reads "retire 250 yards and renew their fire". Read from the page image: the JPEG 2000 leaf 0905 of the Cornell scan (archive.org item `cu31924077699761`, taken from `cu31924077699761_jp2.zip` through https://archive.org/cors/ on 2026-11-14), converted to PNG and read by eye on 2026-11-16. The page is headed "882", "N. C., VA., W. VA., MD., PA., ETC." and "[CHAP. XXXIX."; the crop is `tmp/terrain-1/img/p1/retire_crop_new.png` (sha256 in the `image_reading` record of `evidence_corrections/terrain-1.jsonl`, rows R13.G-10.b and R13.G-10.c).
- Two other archive.org scans of the same volume read 250: `warofrebellion271unit` and `warofrebellion012701rootrich` (the text found by the same anchor words, "ordered them to retire 250 yards and renew").
- The same page reads "I formed a new line of artillery about 400 yards to the rear" (the new line, unchanged) and "Milton ... retired 300 yards" is in R320 (Milton's own report, p.886; not affected).

## The exact change requested

1. S-039 retirement sub-claim and its quote note: "McGilvery ordered the batteries generally to 'retire 250 yards'" (the quote string may stay as the OCR text with an OCR note, as `terrain-1.jsonl` does with its `image_reading` field).
2. The S-039 "why" text: "300 yd by Milton, 250 yd by McGilvery for the batteries".
3. `fence-2-EG-06.md` and the lookups line: 350 becomes 250.
4. DD-F2-04: the options column "350 yd (McGilvery, all batteries)" becomes "250 yd (McGilvery, all batteries)". The chosen default (300 yd for Bigelow after about 17:45) is unaffected; terrain-1 appended a correction line to the decision file (DD-TERRAIN1-13) so the record shows the change; no existing line of that file was edited.
5. Any card text derived from "350 yd" in the product (structures, state schedule S-039) is to read 250 yd for McGilvery's order; the PDF's 400 yd remains McGilvery's new-line figure.

## Why it matters beyond this figure

A digit audit of all 312 Official Records quotes of terrain-1 against the other four archive.org scans (`horde/terrain-1/scripts/round3/digit_audit2.py`) found this one real digit error in the Cornell text among terrain-1's quotes, and two further digit disagreements between scans that are flagged and not resolved (R13.G-14.b "two 13-pounder howitzers" in OR27-2-R466 p.434: Cornell and warofrebellion272unit read 13, warofrebellionco272unit reads 12; R13.G-06.b "On the 2d instant" in OR27-1-R221 p.659: warofrebellion012701rootrich reads "3d"). A verbatim match against one scan does not protect digits. Other shards that cite digits from the Cornell OCR only (a clock, a gun count, a distance) can run the same audit: the script takes any corrections file with the terrain-1 citation fields.
