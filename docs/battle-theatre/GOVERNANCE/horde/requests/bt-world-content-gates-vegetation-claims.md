# Request from bt-world-content (vegetation lane) to bt-gates: the shape of the vegetation claims now, and four readings of the runners that do not fit it

Written 2026-11-16 by bt-world-content, lane vegetation (R20, Q21). Answers the part of `bt-gates-source-manifest-and-claims.md` that concerns `app/data/vegetation.json`. Nothing of the runners was edited; `tools/bt/gates/**` is not in this lane's ownership.

## What the data does now (so the runners can read it)

Every one of the 589 claims of `app/data/vegetation.json` (`claims[]`) now has:

* `quote`: a short extract of the source, at most 14 words (the plan's rule, p. 134 E.6, T-Q02-1, T-Q21-1; 471 of the 589 were longer before), copied letter for letter from the saved text, found inside the passage the claim rests on (`loc.span` = the offsets of that passage, no text). A reading of what the printed words are, where the saved text lost glyphs or is letter-spaced, is `quote_printed` (20 claims); `quote` is then the saved words, which a runner can find again.
* `src`: the id the text store knows (the report id of the Official Records, e.g. `OR27-1-R077`; the library id of every other source, e.g. `JACOBS-1864`, `NPS-CLR-LRT`), with the family in `fam` (`OR27`, `WS9`, `NPS`, `NPSWEB`, `WEB`). It was `WS9:JACOBS-1864` and `NPS:NPS-CLR-LRT` before, which no ledger knows.
* `loc`: `char_start` and `char_end` of the extract in the saved text, `pdf_page` (NPS texts), `page` and `report` (Official Records), `span` (the passage).
* `tier`, `says` (the paraphrase), `when`, `about`, `src_sha256`.
* `meta.source_manifest`: one entry per source id the claims cite: `fam`, `title`, `date_written` (the year), `rights` (the ledger's licence or rights basis), `reliability_tier` (by the year written, the plan's weighting of D.4.3 step 8) and `reliability_basis`; no `independent_of` (no relation between these sources was checked, so none is claimed).

`python3 -I tools/bt/vegetation/short_quotes.py` re-finds every extract in the saved text with the gate library's own `extracts.TextStore` (`tools/bt/gates/lib`) and writes `tools/bt/vegetation/claim_extracts.json`; its last run: 534 of 589 found again by the gate's fold compare, 52 only in a saved text variant (below), 3 with no stored text (below), 0 not found.

## What does not fit, and what the owner of the runner can change

1. **Text variants.** 52 extracts are found only in the layout or raw reading of a two-column report (`NPS-CLR-1STDAY#raw`, `NPS-CLI-LANDSCAPE#layout`, `NPS-CLR-CEMETERY#raw`, ...): the plain text interleaves the columns. Their `src` keeps the suffix (`NPS-CLR-1STDAY#raw`) so that the runner says NOT-RUN for them and never a false FAIL. Please let `TextStore.text()` resolve `<id>#layout` to `<local_path without .txt>.layout.txt` and `<id>#raw` to `.raw.txt` (the files are next to the plain text in `tmp/library/web/nps/<ID>/`).
2. **Three claims of a page saved by this lane** (`CWS16-SEC20`, family `WEB`, the Trostle petition page: `tmp/library/web/veg/CWS16-SEC20.txt`, `.meta.json`) have no ledger entry in `acquired*.json`, so `TextStore` has no text for them (status `no_text`). Either the ledger of the web task gets the entry or the runner reads the `WEB` family from `tmp/library/web/veg/`.
3. **Source Manifest (Q02.6).** `ds.Manifests` reads the layer sources, the kit sources, the Official Records index, the library status files and the register: not the acquisition ledgers (`acquired_2.json` for the public-domain books and papers, `acquired_3.json` for the National Park Service reports), which hold the ids the text store resolves and the dates and rights (`date`, `licence_basis` or `rights_basis`). 59 source ids of the vegetation class are reported unresolved only for that reason. `meta.source_manifest` of the vegetation data carries the same fields per source for the runners that read it.
4. **Claim ids of a list.** `claim_index()` of `q19_claims.py` takes the claim id of a member of `data.vegetation` from the path (`.claims.<id>`), which fits a dict keyed by id; the data holds a list of objects with an `id` field (`$.claims[99]`). A member that has an `id` field should be indexed by it (the walk in `datum_scan.py` knows the dict, not the list). The vegetation data is not changed to a dict: the product, 53 tests and the claim ledger read it as a list.
5. **The class `data.vegetation` is read as one class of members that all carry a `tier`** (the walk): its calendar keys, species, scenario options, events, gaps and claims. They are different things: the claims need a source and an extract, the calendar keys are ranged schedule entries with a reason and a register gap, the events need claims, the gaps are register entries. `validity: state` asks every member for a `state_schedule`, which a claim or a gap cannot have. Please split the class by path: `claims[]` (source, extract, place), `events[]` (claims, window, tier), `calendar.**` (ranged schedule, reason, register id) and `units[]` (the state function `stateAt`, which is the schedule per unit and date and has its own check, `checkVegetation`, GATE-HOOKS.md).

## What is not claimed

No gate was run on these changes beyond the lane's own (`checkVegetation`, `checkScene`, the node tests, `short_quotes.py`); no `passes` flag was set. The extracts are anchors: whether the claim's sentence is supported by the whole passage (not only the extract) is the human reading U-11 owes.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
