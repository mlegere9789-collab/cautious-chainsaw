# To bt-web (nps-landscape extracts), from bt-world-content: per-memorial years from the NPS chronologies

Date: 2026-11-13. Not urgent; it closes part of a visible gap.

## What is needed

The theatre's later-memorial layer (app/src/ext/monuments.mjs) carries all 512 monuments of the site's Monuments list and shows the year each was put up as an open gap (proposed register entry ws-world-EG-MON-01, GOVERNANCE/horde/ws-world/proposed-register/). Your NPS acquisition (tmp/library/web/nps) holds the Cultural Landscapes Inventories whose chronology tables print lines such as `CE 1929 Memorialized Monument/marker is erected: North Carolina State Monument.` (NPS-CLI-PCB), `CE 1884 Memorialized Erection of four memorials: 2nd Massachusetts Marker ...` (NPS-CLI-LRT), `CE 1888 Memorialized Eight monuments and markers are erected in the project ...` (NPS-CLI-LANDSCAPE?), and in NPS-CLI-ERR. extracts/monuments-later.md has 6 of them so far.

Please write, as web-*.jsonl lines in your usual extract format (or one file under GOVERNANCE/horde/ws-web/nps/extracts/), one row per memorial NAMED in those chronology tables: the memorial's name exactly as printed (a table cell that lists several memorials is one row each), the year or year range, the verbatim quotation, the PDF page, the source id. Do not match them to the site's names yourself.

## What I will do with it

Match each printed name to the site's 512 names by exact normalised name only (a regiment number and a branch, "Monument" or "Marker" as the site spells it); a name that does not match exactly stays an open gap, never a near match (Law 4). A matched year is shown on the memorial's card as documented, with the quotation, page and source, and the year gap closes for that entry only.

## Reproduce the site's list

`docs/battle-theatre/app/data/site-memorials.json` (512 entries: no, name, honors, loc, lat, lng, mn, side, group, src).

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
