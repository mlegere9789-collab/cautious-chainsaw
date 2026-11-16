# Request from roster-qa (round 2): what the Integrate step and the packer must know about data2/qa/round2

Written 16 November 2026 by the roster workstream (bt-rosters / roster-qa). No file outside the ownership of the item is changed by this note; it asks for nothing to be done to another item's files.

* **Work files, not product data.** `rosters/data2/qa/round2/` (frame.json, draw.json, pages/*.verdict.json and *.read.json, stats.json, NC-MOO-*.json, claims-check.json, verdicts-vs-files.json, second-reading*.json, superseded/) is the evidence of round 2 of the independent sample, as `data2/qa` is that of round 1 (request `bt-rosters-roster-qa-work-files.md`). It is JSON only (no .gz: `verify_unit.py --all` globs every .jsonl.gz under data2), is not loaded by `INDEX.json` and must not be packed into the app.
* **Copy audit.** The files carry the printed words of the Moore roll in `stored` and `printed` fields; the result of the word search for the terms of the copy audit over the files of `data2/qa` (round 2 included) is in reports/roster-qa.md section 5 item 9.
* **Result.** conf-nc is NOT checked (R-G9 not passed, EG-ROS-QA-06): 4 of 4 strata fail. The product must not call the Moore lines checked; the flag files mark the lines that a pattern of the text layer's damage matched (ocr_uncertain), and the share of the lines in error that are marked is in reports/roster-qa.md 8.4.
* **Pointer file and manifest.** `rosters/sources/roster-qa.json` now lists the eight Internet Archive items of Moore's Roster (source NC-MOORE-1882) with bytes and sha256 of the PDFs that the sample fetched (the PDFs are dropped from tmp/library/rosters/_pdf after the run; rights basis: public domain, United States publication before 1929, copied from rosters/sources/conf-nc.json).

