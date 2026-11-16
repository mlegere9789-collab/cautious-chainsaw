# To bt-rosters (roster-app, roster-index): how the staging packer decides what of rosters/data2 ships, so that the section ships what its pages load and not the working folders (from bt-spec-health, staging packer, 2026-11-15)

Not urgent: `docs/battle-theatre/app/roster` does not exist yet, so nothing of it is in the staging build. This is written now so that the section is built in a way that packs well, and so that nobody has to guess.

## What is in rosters/data2 today (measured 2026-11-15)
7.5 MB in 232 files: 118 `.gz` files (the unit files `union/<state>/<unit>.jsonl.gz` and their `.flags.json.gz`; 2.6 MB), `INDEX.json`, `units.json`, `sources/*.json` (10 files) and `qa/**` (about 100 working files of the independent sample: page reads, verdicts, draws).

## What the packer does the day the section exists
1. Every file of `app/roster` ships (pages, scripts, style sheets, JSON); the links of every page are followed; a dead link or a missing style sheet stops the pack.
2. A file OUTSIDE the section that the section's code names by a literal address (`fetch('../../rosters/data2/INDEX.json')`, `new URL('../../rosters/data2/INDEX.json', import.meta.url)`) ships.
3. A JSON file that the section loads by a literal address is read as an index: every string in it that names a file (`file`, `flags`, `cells` of the entries of `INDEX.json`) ships beside it, and nothing else of the folder.
4. An address that names a FOLDER takes the whole folder: `new URL('../../rosters/data2/', import.meta.url)` or a base `const DATA = '../../rosters/data2/'` followed by `DATA + name` ships all 232 files, `qa/` and `sources/` included (the copy audit then reads all of them). The load census (`node tools/bt/pack_theatre.mjs --census`) reads the syntax tree and reaches the same answer by its own reading.

## What is asked
* Load the index by its literal path and build each unit address from the entry, resolved against the index's own URL: `const indexUrl = new URL('../../rosters/data2/INDEX.json', import.meta.url); ... fetch(new URL(entry.file, indexUrl))` (and `entry.flags`, `entry.cells`). The build then holds `INDEX.json` and exactly the files it names (the 54 unit files, 53 flag files and 11 cell files of today), 2.6 MB of gzip.
* If a page needs `units.json` or one of the `sources/*.json` files (the source and rights of every name), name each by a literal path. The `qa/` folder is working data (the evidence of gate R-G9), not something a page needs.
* An address that is made only of data (a file name read from a row of the data) cannot be seen by any scan of the code; the index route above is the way to make it visible. The census lists a load it cannot place as `unreviewed`, and `tests/bt-pack` fails on it until it is looked at.

## For the owner (not a decision of the roster workstream or of the packer)
The packer ships whatever the index lists and knows nothing of rights. Some segments carry a pending rights decision (`rosters/sources/*.json`, `rights.basis`: for the Massachusetts segments "public domain is not established by the date and an owner decision is pending", see `bt-rosters-union-ma-flag-files.md`). The staging site is a throwaway site that the owner makes by dropping the zip, but once dropped its address answers to anyone who has it: if a segment must not leave this machine before the decision, the index must not list it. The section's `NETLIFY-STAGING.md` line will say which segments the build holds.

## Check
```
node tools/bt/pack_theatre.mjs --no-zip --out tmp/x/dist      # "bytesByFolder": the weight of rosters/data2 (about 2.7 MB with the index route, 7.5 MB with a folder address); "auditHits"
node tools/bt/pack_theatre.mjs --census                         # every load of the page code and what answers it
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- correction (bt-spec-health, staging packer, 2026-11-16 01:06 UTC) to points 4 and "Check" above: a folder address (`new URL('../../rosters/data2/', import.meta.url)`) no longer takes `rosters/data2/qa/`: it is an entry of EXCLUDE in the packer (note bt-rosters-roster-qa-work-files.md, decision DD-STG-06), so it is refused by every route, an index included. Measured on the real roster data of 2026-11-16 behind a made-up section page (frozen snapshot, scratch only, nothing kept in the tree): the folder route ships 217 files (6.2 MB; sources/ included, qa/ left out: 110 files, named in MANIFEST.json "leftOut") and the index route ships 119 files (3.9 MB: INDEX.json and the files it names; sources/ and qa/ not in). The census finds 0 findings on both routes. The copy audit then reads the roster files that ship: INDEX.json line 3 on both routes (note bt-rosters-staging-copy-audit-index.md, still open) and, on the folder route, two lines of the 2nd North Carolina Cavalry files (note bt-rosters-staging-copy-audit-ai-token.md).
