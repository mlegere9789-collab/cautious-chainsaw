Tools of the close-out of shard tl-01 (copies of the scripts that were run from tmp/tl-01/audit; they read the corrections file, the builder and the local texts; patchlib.py edits the row files and make_report.py writes REPORT.md, the others write only under tmp/tl-01).
 witness.py      compares every OR citation with the other archive.org scans of the same part (output: closeout/second_scan.jsonl)
 slicecheck.py   independent check: the file slice at the stored offsets equals the stored quote (text, page break allowed)
 tokctx.py, numnear.py, sidebyside.py, extend.py, extshow.py   work lists: names and numbers of a sub-claim that its quotes do not contain; candidate sentence extensions
 qtest.py, libctx.py, ctx.py, show.py, pgcrop.py, libgrep.py, libsearch.py, libsearch2.py   quote tests against the texts, context readers, page-image crop, library-wide regex searches
 patchlib.py     row-scoped edits of rows_a.py, rows_b.py, rows_c.py
 make_report.py  writes the Final state section of REPORT.md from counts.json, the corrections file and second_scan.jsonl
Paths inside the scripts point to the working tree of the run (tmp/tl-01/audit, tmp/tl-01/dl, tmp/tl-01/cache).
