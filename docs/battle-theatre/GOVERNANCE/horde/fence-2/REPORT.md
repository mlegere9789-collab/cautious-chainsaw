# Shard fence-2 report (R14.S-017 to R14.S-052, 36 rows), close-out of 2026-11-13

Slice check: the 36 rows S-017..S-052 of `results.jsonl` are all present (none missing, duplicated or out of slice). Close-out output: `GOVERNANCE/evidence_corrections/fence-2.jsonl` (36 lines, 140 sub-claims, 204 citations), proposed register entries `proposed-register/fence-2-EG-01..12.md`, request note `GOVERNANCE/horde/requests/world-content-fence-2-structures.md`, delegated decisions DD-F2-01..06 (the section "Added 2026-11-13 by the evidence close-out of shard fence-2" of DELEGATED-DECISIONS-2026-11-11.md). Scratch and scripts: `tmp/fence-2/`.

## What the earlier report said, and what is true now

The 2026-11-04 report (36 rows: 29 verified, 4 inferred, 3 failed_lookup) rested on second-witness extractions because the Official Records text was not local; 16 "verified" rows were only a negative check of the PDF row text. Since then the OR text (vol. 27 pts 1-3), 99 library texts and 73 National Park Service documents are local, so every citation was re-matched and every sub-claim searched again.

## Method (what was run)
1. All 68 quotes of the shard (51 OR quotes, 17 non-OR quotes the OR-RECHECK file marks `not_checkable`) re-matched by exact text in the raw files: `or27_find.verify` logic for OR27 pts 1-3, `statevol_find` logic for New York, Pennsylvania and Maine at Gettysburg and Battles and Leaders 3. Result: 68 of 68 found, once each; the 51 OR matches agree with OR-RECHECK (report id, printed page, offset); 17 non-OR quotes now have page and offset. Page corrections: PA vol.1 "inside of the peach orchard fence" is p.590 (shard p.580 was an OCR misreading of 589); ME p.180 and NY vol.3 p.991, p.1289 confirmed by running heads; two "unrecovered" pages recovered (ME p.94, BL3 p.361); de Trobriand p.520/521 stays interpolated.
2. For every row the printed claim (object, from-state, to-state, window, trigger, tier, source keys) was split into sub-claims (unit, place, hour, length, count, state at start, damage or construction window) and each searched in OR27, the state volumes, the 99-text library (newspapers of July 1863, Jacobs, Haskell, Hospital Scenes, Meade's testimony, Bachelder) and the NPS documents. 39 lookups are logged inside the rows and 46 lines were appended to `lookups.jsonl` (including six host probes).
3. Every citation was written through a builder that refuses a quote it cannot find, and a second, independent validator (`tmp/fence-2/scripts/validate.py`) cuts the span `[offset_start, offset_end)` out of the raw file named by `local_path` and compares it (whitespace and hyphen tolerant) with the quote, and checks the sha256 of the text file: 204 citations, 0 problems.
4. Not run: any browser or render check (none needed); page-image reading of the OR scan (the digit in Greene's "By 13 o'clock" stays unread); web pages (hosts refused, see below).

## Counts
Verdicts: confirmed 4 (S-017, 020, 029, 042), corrected 12 (S-023, 024, 026, 031, 032, 033, 034, 039, 043, 045, 050, 052), partially_supported 18, unsupported 2 (S-030, S-048), gap 0. Status: closed 5, open 14, blocked_host 17. Sub-claims: documented 94, inferred 14, open gap 32 (support: supported 85, partial 22, none 32, n/a 1). Citations: official reports 128, state regimental volumes 30, institutional secondary (NPS) 31, contemporary newspapers 6, participant letters/testimony/memoir/visitor/eyewitness 9. Verdict meanings: confirmed = every printed and shard claim supported; corrected = at least one printed or shard claim is refined or contradicted by a quoted source and the corrected claim replaces it; partially_supported = some claims supported, others without any source (none contradicted); unsupported = nothing supported; gap = unsolvable (none). The row tier is documented for confirmed and corrected rows (the corrected claim is carried by documented sub-claims, leftovers listed), inferred for partially_supported, open gap for unsupported.

| Row | Object | Verdict | Status | Register |
|---|---|---|---|---|
| S-017 | McPherson farmhouse and barn | confirmed | closed | EG-09 |
| S-018 | Pennsylvania Hall and town buildings | partially_supported | open | EG-09 |
| S-019 | Cavalry and town hospitals | partially_supported | blocked_host | EG-09 |
| S-020 | Cemetery Hill | confirmed | closed | EG-07 |
| S-021 | Klingle house | partially_supported | blocked_host | EG-05 |
| S-022 | Town buildings | partially_supported | open | EG-09 |
| S-023 | Culp's Hill main line (Greene) | corrected | blocked_host | EG-04, EG-08 |
| S-024 | Culp's Hill (Kane, Williams, Wadsworth's men | corrected | open | EG-04 |
| S-025 | Culp's Hill traverse and extra head logs | partially_supported | blocked_host | EG-08 |
| S-026 | East Cemetery Hill lunettes | corrected | open | EG-07 |
| S-027 | Weikert house | partially_supported | blocked_host | EG-09 |
| S-028 | Granite Schoolhouse | partially_supported | blocked_host | EG-09 |
| S-029 | Trostle house | confirmed | closed | EG-09 |
| S-030 | Sherfy family | unsupported | blocked_host | EG-09 |
| S-031 | Benner's Hill / East Cemetery Hill | corrected | open | EG-10 |
| S-032 | Rose house, Rose barn; Bushman barn; Slyder  | corrected | blocked_host | EG-06 |
| S-033 | Wheatfield wheat | corrected | open | EG-06, EG-11 |
| S-034 | Peach Orchard trees, fences and Sherfy orcha | corrected | open | EG-01, EG-03 |
| S-035 | Peach Orchard Union guns | partially_supported | blocked_host | EG-01 |
| S-036 | Sherfy house | partially_supported | blocked_host | EG-09 |
| S-037 | Sherfy barn | partially_supported | open | EG-09 |
| S-038 | Little Round Top | partially_supported | open | EG-06, EG-12 |
| S-039 | Bigelow's guns | corrected | open | EG-06 |
| S-040 | Trostle barn | partially_supported | blocked_host | EG-09 |
| S-041 | Culp's Hill line | partially_supported | blocked_host | EG-08 |
| S-042 | Culp's Hill lower works | confirmed | closed | EG-04 |
| S-043 | Little Round Top south slope | corrected | open | EG-06 |
| S-044 | Evergreen Cemetery gatehouse | partially_supported | open | EG-02 |
| S-045 | Evergreen Cemetery | corrected | open | EG-02 |
| S-046 | Leister house | partially_supported | blocked_host | EG-05 |
| S-047 | Weikert hospital | partially_supported | blocked_host | EG-09 |
| S-048 | III and V Corps hospitals | unsupported | blocked_host | EG-09 |
| S-049 | Spangler barn forebay | partially_supported | blocked_host | EG-09 |
| S-050 | Culp's Hill works | corrected | open | EG-04 |
| S-051 | Ginnie Wade house | partially_supported | blocked_host | EG-09 |
| S-052 | Bliss house and barn | corrected | closed | - |

## Corrections to the 2026-11-04 shard (all with quotes in the JSONL)
1. S-032: the Hall (5th Alabama, OR27-2-R526 p.596) "over wood and stone fences" is Hall's account of 1 Jul north of the town, not the 2 Jul advance; withdrawn from the Rose farm row. Kershaw's own hours (about 15:00 at the wall, about 16:00 numerous fences) are confirmed.
2. S-039: the failed lookup is withdrawn. The 9th Massachusetts Battery report is filed under Milton (OR27-1-R320 p.886: retired 300 yd, "two stone walls met at an obtuse angle", held at all hazards, four pieces lost) with McGilvery (R318 p.882: "a quarter to 6", Bigelow "retired by prolonge", 350 yd for the batteries, new line 400 yd to the rear); the PDF's 400 yd for the retirement is not in either report.
3. S-026: the OR documents light per-gun earthworks at dusk on 1 Jul (Wainwright R071 p.357; Hunt R028 p.232), not lunettes by 16:00 on 2 Jul; an NPS caption names a July 1863 photograph "lunette earthworks".
4. S-024: Kane's report (R302 p.847) says his brigade built its breastwork "before sundown"; no morning hour (carried with fence-1 E-07). Ruger (R273 p.779: wall "about 75 yards" behind the First Brigade) and Price (R280 p.800: "some 125 feet") join Williams and McDougall (30-75 yd group); Geary and Greene (200-300 yd) are the second group.
5. S-052: Hays (R115 p.454) puts the burning in the lull from about 11:00 to nearly 14:00 on 3 Jul; Hill (R126) shows the barn still occupied and cleared at 07:30; the "morning" window is narrowed.
6. S-045: new evidence (Compiler 20 Jul and Sentinel 21 Jul 1863: railings and ornamental work "somewhat shattered", tombstones thrown or broken; Hospital Scenes 1864: iron railings "bent and broken into the smallest pieces" and the highest monuments deliberately laid down; Haskell: fences prostrate on the evening of 2 Jul; NPS CLR). The quotation "the fences are all down" attributed to the Sentinel on Wikipedia was searched for in the local OCR and not found: not used.
7. S-044: the shard's Lee and Early quotations are about fences on the East Cemetery Hill ascent and were withdrawn from the gatehouse row; gatehouse damage now rests on the NPS CLR (smashed windows, holes in the brick walls).
8. S-034: Bodine's regiment named from the report header (26th PA, same regiment as PA vol.1 p.196); the Thompson battery of PA vol.2 p.920 named from the section header; Alexander named for BL3 p.361; R006 characterised as a partisan letter (Meade attributed it to Sickles); Humphreys' p.532 passage has no hour.
9. S-023, S-025, S-041, S-050: OCR "By 13 o'clock" unreadable (10 or 12); Greene's 1893 address documents the traverse (137th NY, about 20 yd); Hunt's five batteries are 26 guns (the printed 24 has no OR basis); line lengths 300/800 yd and "extra head logs" have no local source.
10. S-017: the barn took wounded on the afternoon of 1 Jul (Stone, 150th PA), earlier than the printed "evening"; S-031: the Maine narrative and the Confederate report disagree on the duel's length; S-035: Hart gives no clock hours and the garden-fence battery is Thompson's; S-038: "by hand" against "by teams"; S-043: two built walls by two units; S-046: headquarters and the evening council supported (NPS, Meade), "all rails burned" not.

## Blocked hosts (probed once each on 2026-11-13, not retried, not worked around)
`gettysburg.stonesentinels.com`, `www.crossroadsofwar.org`, `www.historynet.com`, `dmna.ny.gov`, `www.hmdb.org`, `www.gettysburgdaily.com`: the proxy answers 403 on CONNECT. Wikipedia was not probed (not an admissible source). Exact URLs and what must be read are in each row's `blocked_host`; where the PDF prints only a key and title the entry says so and no URL is invented. Rows with status blocked_host: S-019, S-021, S-023, S-025, S-027, S-028, S-030, S-032, S-035, S-036, S-040, S-041, S-046, S-047, S-048, S-049, S-051. None of these leads can raise a claim above inferred (Law cl.4); the NPS documents (reachable and local) replaced them wherever they say the same thing.

## Owner-only or owed
Pennsylvania State Archives damage claims (Klingel, Sherfy, Trostle, Leister): a visit or request; not done. Page image of OR27-1 p.856: not fetched (would run through the machine lock). No real-GPU, browser or audio check is involved in this shard.

## Delegated decisions recorded (reversible, every alternative stays selectable)
DD-F2-01 Kane window; DD-F2-02 Peach Orchard two-stage fences; DD-F2-03 Bliss burn window; DD-F2-04 Bigelow retirement distance; DD-F2-05 Evergreen fence-smashing default; DD-F2-06 Culp's Hill wall distances by sector. No decision_log.md edit.
