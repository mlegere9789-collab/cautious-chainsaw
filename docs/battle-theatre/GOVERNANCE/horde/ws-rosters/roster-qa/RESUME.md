# roster-qa: how to resume (work file, not the report)

Tools: docs/battle-theatre/rosters/pipeline2/roster_qa/ (qa_frame.py build|show, qa_render.py render|crop|clean|drop, qa_compare.py PAGE [--names],
qa_left.py PAGE x0 x1 y0 y1 (crop of the 200 dpi view), qa_verdict.py add PAGE < verdict, qa_stats.py).  Frame and seeded draw: data2/qa/frame.json,
data2/qa/draw.json (seed roster-qa-round1-2026-11-14).  One verdict per looked-at page: data2/qa/pages/<identifier>-<leaf>.verdict.json (these ARE the
resume state: a page with a verdict is done).  Transient images: tmp/library/rosters/_qa/img (deleted by qa_verdict add), PDFs tmp/library/rosters/_pdf.

Protocol: draw order = prefix of data2/qa/draw.json strata[S].order (every prefix of m pages has at least m/3 lowest-decile pages).  A page is looked at with the
Read tool (200 dpi view, crops for names or for the right part), every stored row compared with the print; tesseract (rules removed, psm 6) is a pre-screen only.
Levels: N names/headings/company/structure, D dates, R other remark words.  A level that a stratum has already failed decisively (4 errors; the largest
sample of the ladder 773 rows allows 3) is not looked at on further pages: say so in the report.  Comparison rule: case, punctuation and spacing are ignored
(form differences, not errors); any other differing character is an error.  Never change a stored line.
Ladder: pass = (n>=299, k=0) or (n>=473, k<=1) or (n>=628, k<=2) or (n>=773, k<=3), one-sided 95 percent Clopper-Pearson upper bound 1.0 percent.

Smoke-sample findings so far (Vermont, leaves 74, 116, 248, 60, 52, 88): the text layer loses the day of the Date-of-Issue cell on many rows of damaged pages,
puts the second date after the remarks on rows flagged O (page order is in the cells sidecar, which is not sampled), reads digits 1 as i, l, 6i for 61,
July as Julv, recd as reed; names are wrong on 3.6 percent of the rows of the non-officer pages sampled (stray letter before a name, 'Gowing' read 'Cowing').

## State at the closure of round 1 (15 November 2026, second sitting)

* 35 verdicts (34 of the first sitting, 14 November, and `massachusettssol11931mass-0631`, 15 November), 5 addenda (`<stem>.addendum.json`: second sitting on leaves 143, 661, 685, 224 and 117). `qa_lib.load_verdicts()` merges them; `qa_stats.py`, `qa_report.py` and `qa_route_test.py detector` read the merged record. The first verdict files are never rewritten.
* Resume order after a restart: `python3 -I pipeline2/roster_qa/qa_current.py` (do the verdicts still describe the files), `qa_stats.py`, `qa_route_test.py detector`, `qa_report.py`, `qa_closure.py` (writes `closure/` and the proposed register entries; the shared files are appended by hand once, see below). The queued route test writes `route-test.out` and `route-test.done`; when `data2/qa/second-reading.json` exists, run `qa_report.py` and `qa_closure.py` again.
* The closure texts were appended once to `rosters/GAPS.md` (G-QA01 to G-QA06), `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (DD-ROS-QA-01 to -05), `rosters/PRODUCTION-PLAN.md` (9.10) and `GOVERNANCE/progress.md`; do not append them a second time. A change of state after that is a dated correction line, never a rewrite.
* Page images are transient: `tmp/library/rosters/_qa/img` is emptied by `qa_verdict.py add` and `qa_render.py clean`; the item PDFs in `tmp/library/rosters/_pdf` are dropped with `qa_render.py drop IDENTIFIER` (re-fetchable through the cors endpoint).
* A later round: see PRODUCTION-PLAN 9.10.3 (new seed, exclude the 35 pages, copy `data2/qa` aside before `qa_frame.py build`).
