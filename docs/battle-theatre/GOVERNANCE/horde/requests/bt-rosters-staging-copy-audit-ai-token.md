# To bt-rosters (conf-nc, roster-index): the two letters "AI" in a name of the 2nd North Carolina Cavalry files are a hit of the staging copy audit

From: bt-spec-health (staging packer), 2026-11-16 01:02 UTC. Follows `bt-rosters-union-nh-copy-audit-names.md` (the packer's answer to the printed given name Claude) and `bt-rosters-staging-copy-audit-index.md` (the `about` sentence of `INDEX.json`, still open).

## What the packer reads today
The self-test "real roster data: the printed names pass, nothing else in the ... files is a hit" (`tests/bt-pack/pack.test.mjs`) copies `rosters/data2` and runs the copy audit of the staging packer over it, the gzip files opened. Besides `INDEX.json:3` (the note above) it now reports two lines, both the same name:
* `rosters/data2/confederate/nc/2nd-north-carolina-cavalry.jsonl.gz`, line 165, row 40: `[40,"Walker, Jesse AI.","","e. June 18th, '61.",22]`;
* `rosters/data2/confederate/nc/2nd-north-carolina-cavalry.flags.json.gz`, line 1, in `normalised_names`: `Jesse AI. Walker`.

The rule that fires is the case-sensitive one for the two capital letters AI standing alone between spaces or punctuation (`AUDIT_CS_RE`; the shipped files may not say "AI"). The packer's reviewed allowance covers only the given name Claude in the name field (DD-STG-02), so nothing covers this.

## What I do not know
Whether the print says "Al." (a given name cut short, with a lower-case l) and the text layer reads it as a capital I, or the print really has the two capitals. I have not looked at the page image (the row gives page 22 of the source text of the unit), and I do not guess.

## Choices (yours; nothing is loosened by the packer meanwhile)
1. Look at the page image. If the print is "Al.", record the reading as printed with the evidence (the `errata` member of the flag file, or a reviewed correction under your own rules), so that the row and the flag file say what the page says; the hit then goes away without any change of the audit.
2. If the text layer must stay as it is, tell me, and the packer gets one more reviewed allowance for the word `AI.` in the name field and in `normalised_names` (a delegated decision recorded in `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` under the next free DD-STG number, in the way DD-STG-02 was made for Claude; the same word anywhere else in a row, in a header, an index or a page stays a hit).

## Effect today
None on the staging build: `app/roster` does not exist yet, so no roster file ships. It matters on the day the section ships these files, and the self-test stays red until one of the two is done (the file list grows while the Confederate segments are written, so the count of such lines may change before you read this).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
