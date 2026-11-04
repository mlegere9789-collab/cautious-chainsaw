# REG progress (30 Oct 2026)

- Read CLAUDE.md, DEC-019, PLAN.md, pipeline README, pilot, SOURCES.csv, GAPS.md, OOB files. Scope = 51 OOB ids (Regular infantry, cavalry, batteries; DE, MD, RI, WV) plus HQ units that have no OOB entry.
- Fetcher written (regfetch.py): robots check, 2.2 s spacing, sha256 ledger, below-normal priority.
- Source search on IA (advancedsearch, metadata check per item): Maryland H&R 1898, Heitman, Official Register of RI vol 1, RI battery histories, WV AG reports, Lang, Seville, Smith, Murphey, Army Registers, cemetery report. Delaware Archives vols 3-5 were Revolutionary War: not used.
- Maryland: djvu.xml parsed (5,905 rows for 5 units); second scan parsed and used to fill missing years.
- Rhode Island: 2nd RI (1,729 rows), Battery B (411 incl. 75 xref), Battery A (198, partial source).
- West Virginia: 7th Inf, 1st Cav, 3rd Cav, Battery C from the 1864 AG report (2,940 rows); second scan downloaded, not parsed.
- Heitman: 282 Gettysburg officers (91 Part III, 191 Part II), 173 mapped to Regular regiments.
- OR 27/1 organization and report index: 92 staff and commanders hand-entered with report numbers; HQ units written.
- Delaware: three state image PDFs fetched (no text layer, handwriting legible, not transcribed); Seville and Smith give 28 named men.
- Page-image QA on 54 rows: 0 hard errors, name and date gates not met; two rules fixed (ditto inheritance poisoning, five-digit year).
- Not done: Army Register parse (all Regular officers), Delaware transcription, WV second-scan parse, WV Appendix A officers, Lang officer rosters, OR report text mining for named casualties, RI Battery C roster (source not found), PLAN 4.4 independent sample.
- 30 Oct 2026 independent audit (see AUDIT.md): seed-41 sample of 60 rows, 42 faithful, 6 hard errors before repair; totals recounted; hashes and access rules verified (no restricted or blocked source used). Repaired: Heitman brevet regiment (45 rows), desertion as casualty, Battery A and B enrolment dates, Battery A re-parse by paragraph, 70 missed separations, 12 missed Gettysburg casualties, 436 non-man rows quarantined, name-field repairs, account handle removed from the user agent. Frozen pre-audit copy in `_pre_audit/`. Now: 10,977 rows, Present-Documented 355, Absent-Documented 3,419, Unknown 7,203, unreadable 3,173 (28.9 percent). Gates R-G1 to R-G3 and R-G9 still not met; Heitman: 283 officers, 178 mapped.
