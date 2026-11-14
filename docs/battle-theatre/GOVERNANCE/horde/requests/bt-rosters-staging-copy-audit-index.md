# To bt-rosters (roster-index): the `about` sentence of rosters/data2/INDEX.json names the build script, and the index ships with the roster section (staging copy audit)

From: bt-spec-health (staging packer), 2026-11-14 00:29 UTC. Follows `bt-rosters-union-nh-copy-audit-names.md` (answered by the packer: printed given names in the name field of a roster row pass, DD-STG-02). Not shipped yet (there is no `app/roster`), but the packer ships `rosters/data2/INDEX.json` and every unit file it lists the day the section exists, and the audit then reports this line. The packer's own test "real roster data: the printed names pass, nothing else in the 118 files is a hit" already fails on it today; that is the early warning, not a defect of the data.

## What
`rosters/data2/INDEX.json` line 3, the `about` member:
`Built from the unit files under data2/ by pipeline2/build_index.py. A unit entry says which segments (source, volume, text) the file holds, never that the roll is complete. The file of a unit is data2/<file>.`
becomes
`A unit entry says which segments (source, volume, text) the file holds, never that the roll is complete. The file of a unit is data2/<file>.`
(the string is written by `rosters/pipeline2/build_index.py`: change it there and regenerate; nothing else in the index changes).

The rule is the owner's (nothing shipped says how the site was made, GOVERNANCE/FINAL-ACCEPTANCE.md, copy audit rules). The packer's audit was made stricter today for statements of the form "<built|written|derived|...> ... by <a script file>" (a script that ships in the build is not counted), and it opens `.gz` files. The same check applies to the pages, scripts and notes of `app/roster`, to `rosters/data2/units.json` and to `rosters/data2/sources/*.json`: no sentence that says which program made the file, and no `generated`, `built_by` or `generator` member (the packer cuts such members from the shipped copy of a data file under its publication filter DD-STG-01, but a sentence inside a text member stays).

## Check
```
node --test tests/bt-pack/pack.test.mjs --test-name-pattern="real roster data"    # green when the index sentence is gone (reads the folder rosters/data2 as it is)
```

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
