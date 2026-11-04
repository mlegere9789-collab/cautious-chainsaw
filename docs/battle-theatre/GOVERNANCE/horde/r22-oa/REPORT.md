# Shard r22-oa report (R22 and OA01-OA09)

Slice: R22.0001..R22.0014 (epilogue rows E-001..E-014), R22.0000, and the nine owner-chat items OA01..OA09. The shard also carries, by design of the earlier run, the 4 July scope item JUL4-SCOPE, 4 July backbone rows T3-144..T3-167, T3-170, T3-178, T3-181, T3-182 (PDF B.12 scope rule), 14 proposed additional timeline rows (NR-01..14, not in the PDF 691; integrator and owner decide), and 8 lookup log rows (LK-01..08). All 15 R22 and 9 OA ids are present once; nothing missing, duplicated or malformed. 75 rows in total.

Counts after audit: verified 42, inferred 20, gap 12, failed_lookup 1. R22 rows: 2 verified (E-009 two hours, E-011 two minutes), 9 inferred, 5 gap including R22.0000 (NOT MET: 0 of 14 epilogue rows realised). OA: 6 verified findings (note: verified means the repo finding is confirmed, the requirement itself is NOT MET for OA02, OA03, OA04, OA06 and PARTIAL for OA01, OA05, OA07, OA08, OA09), 2 gap (OA03, OA04), 1 inferred (OA09).

Fixes: (1) T3-155, T3-157, T3-160 were verified with passage_ref "none new"; downgraded to inferred with a `status_audit` note. (2) Added a `register` field to every row (it was absent): R22 rows link r22-oa-EG-01, -08 and existing EG-0022; OA04 links existing EG-0004; others link the entries below. (3) New register entries r22-oa-EG-08 (four epilogue rows with no source), -09 (eight 4 July rows carried without new evidence), -10 (OA03 and OA09), -11 (failed or search-only lookups). Total 11 entries (EG-01..07 existed).

Key findings: the NPS pages conflict with the PDF on the Wills House lodging, procession time (09:30, 10:00, about 11:00), position of the dirge, and crowd size; the OR does not support a 4 July "truce" (exchange refused, EG-02); Imboden and the OR place the Lee conference at about 23:00 on 3 Jul to about 02:00 on 4 Jul.

own_checks:
- OA08: counted GOVERNANCE/timeline_windows.jsonl: 691 rows, default null on 296, parse_status phrase_only 295 and no_date 1: matches the row.
- OA02: app/README.md v8 table prints units drawn 439 of 726 (60.5%) and 127,572 figures: matches.
- T3-152 Lee 4 Jul 6.35 a.m., "I respectfully propose that an exchange be made at once", and Meade "it is not in my power to accede to the proposed arrangement", OR27-3-D1061 p.514: both in library/timeline_audit_T3.jsonl. Also T3-148 Letterman p.198 "not one wounded man of all that number was left on the field" in timeline_audit_T2.jsonl; T3-149 Lee p.322 "a heavy rain continued throughout the night" in timeline_audit_T3.jsonl. OA05: audio/PLAN.md lists 22 pilot recordings and a "Not achieved" section; app/docs/AUDIO3D-NOTES.md says 37 node tests.

Open issues: NR rows and several T3 rows give a document id and page as passage_ref, not a quoted passage; the Imboden memoir (Battles and Leaders vol. III) was read from a library file not in this checkout, so those rows could not be re-read. LOC and NPS fetches are as logged by the shard.

Owner decisions: defaults for all epilogue conflicts (EG-01); truce wording (EG-02); whether to add the 14 NR rows to the timeline; the Jul 4 scope rule (EG-07); OA03 permission requests (owner-only act); DEC-001 audio labeling.

Verification limits (2026-11-04 audit): the raw OR Ser. I vol. 27 OCR (tmp/library/or27) is not present in this checkout, and the proxy returned 403 for loc.gov, archive.org, gutenberg.org, ehistory.osu.edu and nps.gov, so no web re-fetch was possible; none circumvented. Web-derived rows (NPS, LOC, USGS, NARA pages) rest on the shard run own fetch log and were not re-verified by this audit. Spot checks use independent local extractions or repo files, matched on text, report id and page.
