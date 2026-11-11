# OR-RECHECK-2 report, shard tl-06

Method: for each timeline row with `or_recheck` null in timeline_verified.jsonl, the cited report and printed page were located in the OR vol. 27 OCR (tools/bt/or27_*.py), the page text was read, and the claim (event, unit, place, hour) was compared with it. Every non-empty `passage` in results.jsonl was machine-checked to occur verbatim (whitespace-normalised, page markers removed) in the OR record text, OCR errors included. Hours the passage does not give make a row supported_partial. No shard file, timeline_verified.jsonl or the seed was edited.

Rows: 58. Counts: not_found 7, not_supported 2, supported 3, supported_partial 46

## Rows that fail (not_supported or not_found)

- T2-064 not_found: Negative evidence: Longstreet gives Hood within about 4 miles of Gettysburg about midnight (Jul 1-2) and Law's brigade joining about noon on the 2d. No OR passage gives an arrival of Hood's division behind Seminary Ridge at 05:30-07:30; those values are Freema
- T2-068 not_found: Weather (74 F at 07:00 Jul 2, overcast, S/SSW wind; dust inference): the OR carries no instrument readings; Jacobs's sheets not read; secondary and typed transcriptions only. Wind-speed conflict stays a scenario.
- T2-072 not_found: Kershaw (McLaws's division): left camp 'about sunrise' (ordered 4 a. m.), reached the hill overlooking Gettysburg, halted until about noon. No OR hour for McLaws's arrival behind Seminary Ridge at 08:00-08:30 (Freeman's estimate). Not contradicted.
- T2-073 not_found: Weather row (overcast, humid, fog burning off, 81 F at 14:00): Strategypage/TeachersFirst only; no OR passage; Jacobs's original not retrieved.
- T2-080 not_supported: Slocum 10.30 a. m. (rec'd 11 a. m.) answers Meade's 9.30 a. m. note (D1006 p.486: 'The commanding general desires that you will at once examine the ground in your front, and give him your opinion as to the practicability of attacking'). The OR shows an inquiry
- T2-086 not_found: No OR passage records a morning complaint by Sickles at Meade's headquarters (Meade only says about 3 p. m. Sickles had advanced); Sickles, Hood, McLaws, Law and Warren own reports are not in the OR index. Row rests on Phifer-type secondary (PHIF).
- T2-103 not_found: Sherfy/Klingle/Rogers family movements and 'fences/orchard intact': no OR passage (Stone Sentinels secondary only); NPS lookup failed (recorded 2026-11-04).
- T2-110 not_supported: The OR gives 4 o'clock for the advance order (Kershaw; Maffett R433 p.372: 'at 4 o'clock our regiment, with others, was ordered forward to the attack', artillery opening at '.3 p. m.' OCR). Aiken's recollection of cannonading from noon and a forward order by a
- T2-113 not_found: Weather row (Jacobs 81 F at 14:00, afternoon cloud, drizzle vs clearing, heat index): secondary articles only; the OR carries no instrument readings; drizzle/clearing conflict stays a selectable scenario.

## Supported in full

- T2-066 (OR27-1-R196 p.622)
- T2-097 (OR27-2-R430 p.358)
- T2-112 (OR27-1-R266 p.753)

## Supported_partial (see note per row in results.jsonl for the unsupported sub-claim)

T2-063, T2-065, T2-067, T2-069, T2-070, T2-071, T2-074, T2-075, T2-076, T2-077, T2-078, T2-079, T2-081, T2-082, T2-083, T2-084, T2-085, T2-087, T2-088, T2-089, T2-090, T2-091, T2-092, T2-093, T2-094, T2-095, T2-096, T2-098, T2-099, T2-100, T2-101, T2-102, T2-104, T2-105, T2-106, T2-107, T2-108, T2-109, T2-111, T2-114, T2-115, T2-116, T2-117, T2-118, T2-119, T2-120

