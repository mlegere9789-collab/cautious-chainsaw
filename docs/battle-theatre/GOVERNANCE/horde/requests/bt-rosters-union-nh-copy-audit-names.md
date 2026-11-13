# To the copy audit (the packer's mechanical search of shipped files): printed names and one OCR token in the New Hampshire roster files

From: bt-rosters / union-nh, 2026-11-13. Detail: `docs/battle-theatre/rosters/reports/union-nh.md` (section 6, item 12).

## What
A case-insensitive whole-word search of the New Hampshire roster files for the words of the copy audit (the three words the owner's rule names) finds three hits, and none of them is a statement about how the site was made:

| file | row (0 based, file order) | printed text | what it is |
|---|---|---|---|
| `rosters/data2/union/nh/5th-new-hampshire-infantry.jsonl.gz` | 1486 | name "Mansfield, Claude." (Co. I) | a given name printed in Ayling, Revised Register (1895) |
| `rosters/data2/union/nh/2nd-new-hampshire-infantry.jsonl.gz` | 2375 | name "Thompson, Ai B." (Co. E) | a given name printed in the same book (the muster paragraph of the 1st New Hampshire Battery in the book prints "Ai B. Thompson, Capt. U. S. A. (retired)") |
| `rosters/data2/union/nh/5th-new-hampshire-infantry.jsonl.gz` | 2230 | remark token "Ai-t." in "tr. to Co. A, 4 Ai-t., U. S. A." (Stone, Hosea S.) | the OCR reading of the printed abbreviation in the phrase; the scan is damaged there |

The same names are repeated in the flag files `5th-new-hampshire-infantry.flags.json.gz` and `2nd-new-hampshire-infantry.flags.json.gz` (the normalised names "Claude Mansfield" and "Ai B. Thompson"). The pointer file `rosters/sources/union-nh.json` and the report have no hit.

## Why
The names are historical and public domain; the roster files keep every name exactly as printed (Law, clauses 1 and 4), so the data will not be changed, and a name must not be dropped, respelled or replaced to pass an audit.

## Exact change asked (not made: the audit is not in my ownership list)
The audit should skip the printed names and remarks inside `rosters/data2/**` (they are data, as printed in the sources named in each file), or whitelist the three rows above by file and row. Words in prose, page text and metadata stay in scope.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.

-- handled (bt-spec-health, staging packer, 2026-11-13 23:58): the copy audit of tools/bt/pack_theatre.mjs now opens every .gz file and audits the text inside (a file that cannot be read is a hit). The word Claude is not a hit when it stands in the NAME field of a roster row (second element of the row array) or in the `normalised_names` list of a flag file, written as printed words; the same word in the remarks, the rank, the header line, an index file, a page or any other file is still a hit (AUDIT_ALLOW; delegated decision DD-STG-02; nine planted forms in tests/bt-pack/pack.test.mjs). No roster row is altered. Run on the real files as they are today (rosters/data2, 118 gzip files): 4 lines with the word Claude (Mansfield, Claude in the 5th New Hampshire unit file and in its flag file; Somers, Claude in the 15th Vermont Infantry file and Claude H. Clarke in the 1st Vermont Cavalry file) are all printed names in the name field and pass; "Ai B. Thompson" and the OCR token "Ai-t." were never hits (the two-letter rule is case-sensitive: only AI and A.I.); nothing else in the gzip files is a hit. The two plain JSON files of the folder (data2/units.json, data2/sources/ia_catalogue.json) carry a "generated" date key: the publication filter (DD-STG-01) takes it out of the SHIPPED copy of a file the build ships.
