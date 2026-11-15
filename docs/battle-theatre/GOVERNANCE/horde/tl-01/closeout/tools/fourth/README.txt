Tools of the fourth start of the close-out of shard tl-01 (2026-11-15). Copies of the scripts that were run from tmp/tl-01/run3 (paths inside them point there).
 srch.py        search of one corpus (ca = 933 newspaper pages of 1863 saved by the web-evidence workstream, town = the 1886 county history, Hoke 1887, the papers of 1863-64, nps, med, ws9) with a regex; whitespace and hyphenation normalised
 runsearch.py   a batch of searches from a spec file (spec1..spec7.json), writes the windows and a log line per search (appended to ../../search_log.jsonl)
 qp.py          quote probe: the context of a regex in the normalised view that build.py matches quotes in, with the page by the builder's rules
 mkquotes.py    cuts the quotes of rows_patch.py out of that view between a start and an end pattern (quotes.json)
 crop.py        fetches, with one request, an IIIF crop of a newspaper page image around a phrase (ALTO word coordinates of the saved page); the crops that were viewed are listed in ../../acquired_tl01.json (items ca-*)
 validate.py    independent check of timeline_corrections/tl-01.jsonl: fields, tiers, citation keys, source hashes, the quote against the file at the stored offsets (hyphenation and page-break heads tolerated), register entries, banned words
The row data of this start is ../../rows_patch.py (applied by build.py to rows_a.py, rows_b.py, rows_c.py); the sources it adds are registered in ../../extra_sources.py.
