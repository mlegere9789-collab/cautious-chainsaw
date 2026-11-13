# EG-ROS-NH-02: Entries of the New Hampshire register whose head or data the OCR text layer damaged; the independent sample (R-G9) not run

| Field | Content |
|---|---|
| ID | EG-ROS-NH-02 |
| Requirement IDs | OA03; R22; Law clauses 3, 4 and 7 |
| Category | evidence present, text layer damaged |
| Description | In the four unit files (6,992 rows) the checks V1 to V3 are met by every row (name and remark tokens at their offsets, printed page of the leaf). They do not show that an entry was cut at its true start or that a remark belongs to the name before it. Known damage: (a) five rows hold, in their printed remarks, the text of a neighbouring entry whose head the OCR destroyed or scrambled (2nd Infantry: row "Neilsen, Johen." offset 627134 holds "Nelson, Frank app. Corp. ; des. Sept. 27, '65, Tappahannock, Va."; 5th Infantry: "MUler, William." offset 2216527, "Myers, Charles." offset 2236507, "Smith Ferdinand P. C." offset 2338575 (holds "Smith, Prank wd. Sept. Smith, George. must, out June 28, '65."); 12th Infantry: "Kelley, Richard." offset 248680 (holds "4, Washington, D. C. 0. E; b. Newport; age IS; ...")); (b) six heads were cut by hand where no rule found them (reviewed cuts, listed in pipeline2/parse_nh_ayling.py OVERRIDES: "Hamilton Alvan", "Leach John H.", "Merrill, Simon." (glued to the company token), "Walker Albert R", "Atwood' Samuel H. '", "Roda, Rogers,"); (c) 4 rows whose name lost its first letters in the scan ("our, Levi.", "all, John.", "ith, Arthur St. C.", "md, Charles J."); (d) 154 rows are marked H in the flag files (39, 72, 35 and 8: head cut by a fallback rule or by review; the six reviewed cuts and the two anchorless heads are among them). |
| Why literal 100% is not possible or blocked | The text layer is one ABBYY FineReader 8.0 reading of the scan. A look at the page images would settle each case; the Internet Archive image servers (ia*.us.archive.org, the redirect target of archive.org/download/<id>/page/nN.jpg) answer the proxy's CONNECT with HTTP 403 (one request, 2026-11-13 20:29 UTC, recorded as blocked, not retried, not worked around). No second OCR is installed. |
| Evidence searched | Order check: the surname sequence of each register is alphabetical; rows out of order are listed per unit in GOVERNANCE/horde/ws-rosters/union-nh/parse-diagnostics.json (23, 29, 12 and 2 rows, nearly all OCR-damaged first letters such as "Ooyle" for Coyle). Wide-gap check: every company token that the OCR set off by four or more blanks lies in a head (0 left over per unit). Count of "age" items per entry. Comparison with the earlier roll files (rosters/data/NE/new-hampshire): 7 earlier rows not found, none a lost man. Printed Summary totals: see EG-ROS-NH-04. |
| Autonomous substitute applied | None; the damaged text stays in the remarks of the row that holds it, as printed. |
| Strongest evidence-based reconstruction | The rows as written, with the H and N flags in the flag files; page-image reading of the listed leaves would restore the heads. |
| Confidence tier | documented for the printed text; inferred for where an entry begins in the damaged places |
| Competing values | - |
| Product marking | The unit page shows the flagged rows with "line damaged in the text layer" and this id. |
| Visual and audio impact | None. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Whether a page-image route (an owner step: allow the Internet Archive image hosts, or download the leaves in a browser into tmp/library/rosters/NH-AYLING-1895) is wanted for the independent sample of 299 rows (R-G9). |
| Agent recommendation | Run the sample (299 rows with zero errors give an upper bound of 1.0 percent) and read the listed leaves. |
| Status | open (proposed by bt-rosters / union-nh; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
