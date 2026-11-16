# Second reading of shard tl-03 (2026-11-16): scripts of the claim-to-quote tie

These scripts read docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-03.jsonl and the local texts; none of them is a gate. They use absolute paths of the working tree (/home/user/cautious-chainsaw) and are run with `python3 -I`.

- cover.py THRESHOLD: content-word coverage of each documented or inferred sub-claim by the union of the quotes cited for it; prints the claims whose words are not in their quotes (the list that led to the extensions).
- numtie.py: numbers and capitalised names of each sub-claim that are not in its quotes. evnum.py, evcover.py: the same for the headline text (event) of each row. unitnames.py: names in the unit and place fields.
- flagctx.py ROW:N ...: the claim, each quote and the text before and after it (the text the quote was extended into). ss.py ROW:N: claim and quotes. dump.py FIRST LAST [full]: compact dump of rows. rx.py SCOPE REGEX: non-logging regex view of the Official Records or the library (the logged searches are made with tmp/tl-03/tools/s.py).
- spec_ext.py (the specification: the quotes to extend with their phrase anchors, and the citations to add) and mkext.py (cuts each extended quote from the normalised view of the text that build.py matches against, so that it is a substring of that view; writes ext_out.json, which is copied to closeout/patch_quotes.json). The wording edits are in closeout/rows_patch.py.
- diffrows.py: compares the rebuilt corrections file with a backup (what changed per row). mk_dd.py: writes the text of the delegated-decision block from the data (DD-TL03-01 to DD-TL03-05).

Order after a change: `python3 -I tmp/tl-03/rev/mkext.py` (copy the scripts to tmp/tl-03/rev first), copy ext_out.json into closeout/patch_quotes.json (keys ext and new), `TL3_NOPAGES=1 python3 -I closeout/build.py --check-only --libcites tmp/tl-03/audit/libcites.json`, `python3 -I tmp/tl-03/audit/libpages3.py`, `python3 -I closeout/build.py`, `python3 -I closeout/audit/audit_strict.py`, `python3 -I closeout/post.py`.
