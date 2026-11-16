# roster-qa round 2 (North Carolina, conf-nc, Moore 1882): how to resume (work file, not the report)

Round 2 uses the tools of round 1 with `RQA_ROUND=2` (qa_lib.py: data2/qa/round2 and the item set of qa_lib.ITEMS_BY_ROUND['2']; qa_frame.py: seed `roster-qa-round2-2026-11-16`, four strata NC-MOO-E/G x officers/other, exclusions of the pages an earlier reader looked at).
Frame and draw: data2/qa/round2/frame.json and draw.json (built 16 November 2026 02:4x UTC from the unit files as they stood; the sha256 of the raw lines of every file is in the frame).
One verdict per looked-at page: data2/qa/round2/pages/<identifier>-<leaf>.verdict.json (these ARE the resume state: a page with a verdict is done).  Same protocol as round 1 (RESUME.md of this directory):
  `RQA_ROUND=2 python3 -I pipeline2/roster_qa/qa_render.py render PAGE_ID`, `qa_compare.py PAGE_ID`, look at tmp/library/rosters/_qa/img/<stem>.png with the Read tool (200 dpi view; crops with qa_render.py crop or the stacked-crop helper), `qa_verdict.py add PAGE_ID < verdict`, `qa_stats.py`.
A level that a stratum has already failed decisively (4 errors at the gate) is not looked at on further pages (said in the report).  The conf-nc item was being rebuilt by its own engineer while this sample was taken (nc_parse.py changed at 01:50 UTC; 1st to 3rd NC rebuilt at 01:55 with identical rows):
the last step is `qa_current.py` (verdicts against the files as they are then); a page whose lines differ is looked at again.
PDFs of the eight Moore scans: tmp/library/rosters/_pdf (fetched through archive.org/cors, page_image.pdf_remote_name handles the Emory file names); dropped at the end (qa_render.py drop IDENTIFIER).
