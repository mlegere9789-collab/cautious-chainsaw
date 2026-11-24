# Resolving the 47 source conflicts (C-001 to C-047): plan, record format, rubric, validator

Version 1, 2026-11-16. Written for the researchers of `bt-conflicts` (one per conflict), their independent reviewers and the integration step. Everything a researcher needs is here and in the files named here; nothing else is assumed.

## 1. Purpose and authority

The PDF (B.2.5, pages 62 and 63) lists 47 disputed times and numbers. Its rule: no alternative is deleted; every value stays selectable in the viewer; the default is the value the animation uses on its default setting; the on-screen source panel shows the chosen value together with the rejected ones. The PDF chose its defaults "for coherence (earliest consistent with the better-sourced notes), not because an alternative is disproved". On 2026-11-11 the owner delegated the defaults ("make the decisions") and a first delegated default exists for all 47 (`decisions/conflict_defaults.json`, `DEC-DELEG-A`: 29 documented, 7 inferred, 3 open gap, 8 plausible-procedural). On 2026-11-16 the owner ordered: **"u must resolve the 47 conflicts. do the research and resolve them."** (`decision_log.md`, `DEC-OWNER-2026-11-16`, item 4).

So every conflict now gets real research. The result of the research of one conflict is:

1. a **default** (a value, a range, a window, or a set of claims that stay side by side) with its **class** (settled, weighted, irreducible, gap), its **tier** (documented, inferred, plausible-procedural, open gap) and its **basis**;
2. **every value** of the PDF row, every scenario of the first delegated default and every value the research found, each a **position** with its sources, the weighing of those sources, and (unless it is the default) the plain-English **reason it was not chosen**;
3. the **source-panel text** (at most 400 characters) the viewer shows;
4. the **lists** the next steps need: what reads the value (`readers`), whether the PDF default and the first delegated default hold (`holds`), the searches that failed (`failed_searches`), what would change the default.

The PDF default and the first delegated default are **hypotheses, not answers**. Where the evidence contradicts them the evidence wins and the old value stays selectable with the disagreement stated. A point that no source can settle stays a visible, marked gap with the list of searches that failed; it is never filled in (Law 3, 4, 7). A default is never chosen because it is convenient, early, round or the PDF's.

The Law of `CLAUDE.md` binds every line of this work: nothing is dropped or watered down; nothing is fabricated (no invented quote, time, number, name, citation or URL; a failed lookup is recorded as failed); nothing is "documented" without a non-lead source that supports exactly that claim; gates are never lowered; the owner decides scope reductions (there are none). Owner-only acts (accounts, licence acceptance, payments, contacting third parties, deploying) are never done by a researcher: write down the exact step for the owner.

## 2. Standing context

Quoted from the PDF (page 63, "Notes on the register" and "Animation gating rules") because the rules bind every resolution:

- "Items C-001 to C-047 apply to the whole battle; row IDs in B.2.2 and the day-1 and day-3 timeline sections cite them in their conflict column."
- "Where the default is a range (for example C-034, C-046), the viewer shows the range, not a single figure."
- "Where the default equals the earliest value, the reason is the gating rule in B.2.4: a unit is never shown before the earliest source-supported time."
- "C-042 note: the default shows the earlier time; it keeps the two sources apart rather than averaging them."
- "A unit is not drawn on the field before the earliest time in its 'first on the field' cell. Where a range is given, the default is the middle or the better-sourced value (see B.2.5) and the earliest value is selectable."
- "Unknown arrival times are open gaps: the unit appears no earlier than the next documented event that required it (for example a brigade named in a report), and carries an 'inferred' tier tag."
- "Stuart's cavalry brigades are gated to the evening of Jul 2 by default for their arrival at Lee's lines (Hampton's rear guard and the Union cavalry at Hunterstown, about 16:30 on Jul 2, are exempt from that gate and are shown at Hunterstown on their own rows); Pickett's division is gated to the morning of Jul 3 by default."

Clocks (B.2.1, B.2.2): times are local civil time of 1863 in the clock style of the source. Local mean time at Gettysburg is UTC minus 5 h 09 min. "The Union and Confederate clocks reportedly differed by about 20 minutes (unnamed estimate, Stone Sentinels time note); that offset is not applied to any row, it is carried as uncertainty." A resolution therefore **never subtracts or adds 20 minutes**; it records which clock each witness used (`clock`) and uses the difference only as an explanation of a gap between two values (`reason_not_chosen.kind` `clock`) or as uncertainty in the weighing. Sunrise is 04:35 on Jul 1-2 and 04:36 on Jul 3; sunset is 19:32 on Jul 2 (local mean time; `arrivals.json` `meta.named_periods`).

Numbers (DEC-003, DEC-008): strengths, casualties, prisoners, wagons, wounded and dead are **ranges with a declared basis**. The default is the best-supported figure; the range stays visible; the soldiers instanced one-to-one follow the printed unit strength (a printed regimental strength is drawn man for man; an army-level spread is shown as a range and is not a claim about the unit). C-046 and C-047 carry no headline number.

The first delegated pass (shards `r03-1`, `r03-2`, 2026-11-04, and `conflict_defaults.json`) found the Official Records but did not read every passage in context, did not weigh witnesses systematically and did not search the rest of the library. Its quotes were matched against second local witnesses, not always against the raw scan. Treat it as a map of where to look.

## 3. The resolution record

Files of one conflict (all under `docs/battle-theatre/GOVERNANCE/conflicts/`):

| file | what | who writes it |
|---|---|---|
| `dossiers/C-0xx.md` | the first retrieval: the register record, the first delegated default, what reads the value, what the shards say, candidate passages, sources to acquire | the preparation step (generated; do not edit) |
| `resolutions/C-0xx.json` | the resolution record (this section) | the researcher |
| `resolutions/C-0xx.md` | a plain-English account of at most two pages (about 9,000 characters): the dispute, each position with who wrote it, when, where the writer stood, how he knew and which clock, the weighing, the decision, what would change it | the researcher |
| `SOURCES.md` | the ledger of citable sources (append only) | everyone (section 4) |
| `../horde/ws-conflicts/C-0xx-*.md` | working notes, lookups log | the researcher |
| `tmp/library/conflicts/C-0xx/**` | files fetched for the conflict (each with its ledger row) | the researcher |

`schema.json` is the single source of the enumerations the validator uses. The record is UTF-8 JSON, one object:

| key | meaning |
|---|---|
| `schema` | `"conflict-resolution-1"` |
| `id`, `topic` | exactly the id and topic of `conflict_register.json` |
| `researched`, `researcher`, `event_date` | ISO date of the research; a short handle (not shown in the product); the ISO date of the event the sources are weighed against (`1863-07-02`) |
| `pdf_row` | `{page, text, values[], recommended_default, selectable_alternatives[]}`: the PDF row quoted exactly as `conflict_register.json` (`text`) and `conflicts_structured.json` (the cells) print it |
| `first_delegated` | `{default_scenario_id, default_label, tier, basis, scenario_ids[]}` exactly as `decisions/conflict_defaults.json` prints them |
| `class`, `tier`, `basis` | section 6; `basis` is `{kind, text}`: what the default rests on, kind one of `official_records, contemporaneous_other, later_report, reminiscence, secondary, institutional, inferred, procedural, gap` |
| `default` | section 6 |
| `positions[]` | one per value; below |
| `weighing` | `{summary, who, when, where, how_knew, clock, independence}`: the reasoning on each point of the rubric, at least 20 characters each (write "not applicable: ..." where a point does not apply) |
| `source_panel_text` | 60 to 400 characters of plain English (section 7) |
| `holds` | `{pdf_default: {holds: yes\|no\|partly, note}, first_delegated: {...}}` |
| `readers[]` | `{kind, ref, must_change, note}` (section 8); `readers_note` when the list is empty |
| `failed_searches[]` | `{where, query, outcome, at}` (section 9) |
| `what_would_change_it` | the source or fact that would change the default (at least 20 characters) |

### Positions

A position is one value, with the sources that state it. **Every value of the PDF row is a position** (`origin: pdf_value`, `pdf_label` = the label exactly as the PDF row prints it); the PDF recommended default is a position when it is not one of the values (`origin: pdf_default`, `pdf_label` = the recommended default; the plan says it "is stored as a value of its own"); the first delegated default and the values the first pass added are positions or are merged into one (`scenario_ids` lists every `C-0xx-S1`, `C-0xx-DEFAULT` ... the position carries; **every scenario id of `first_delegated.scenario_ids` must be carried by some position**); every value the research finds that the PDF row lacks is a position with `origin: research`. Values that are the same moment may share one position only when their labels say so; when in doubt keep them apart (nothing is deleted).

| key | meaning |
|---|---|
| `id` | `C-0xx-P1`, `C-0xx-P2`, ... |
| `origin` | `pdf_value`, `pdf_default`, `first_delegated`, `research` |
| `pdf_label`, `scenario_ids`, `source_keys` | the PDF label; the first-pass scenario ids; the PDF source keys of the label (`SS1`, `EPP` ...; the dossier explains them) |
| `label` | what the viewer calls the value, plain English, at most 120 characters |
| `kind`, `value` | the kind of value and its structure (below) |
| `approx`, `clock` | the value is "about"; the clock the sources of the position use: `union`, `confederate`, `unspecified`, `not_applicable` |
| `tier` | how well this value is supported as a claim (section 6) |
| `support[]` | the citations (section 4); empty only when the value has no source |
| `failed_lookups[]` | when no non-lead citation: the lookups that found no source for this value (same shape as `failed_searches`) |
| `flags[]` | `single_source, unsourced, lead_only, weak, memoir_only, contradicted, unclear_clock, different_event`; gate spec CF-4: a value shown with fewer than two independent non-lead sources carries a flag |
| `stance` | `default` (the position is in `default.positions`) or `selectable` |
| `reason_not_chosen` | `{kind, text}` for every position that is not the default (kinds in section 5; text 20 to 220 characters, plain English, shown in the viewer) |
| `inference` | `{step, from[]}` for tier inferred: what is inferred from what (at least 20 characters) |
| `derived`, `procedural_basis` | `derived: true` when the value is computed from stated facts; `procedural_basis` for tier plausible-procedural (what stands in for the missing record) |

`kind` and `value` (all times are local civil time of 1863, ISO date-times without zone):

| kind | value | what a citation must state |
|---|---|---|
| `time` | `{"at": "1863-07-02T01:00"}` (+ `approx`, `tolerance_min`) | the clock reading and the day |
| `time_window` | `{"from": "1863-07-02T21:00", "to": "1863-07-03T00:00"}` | both bounds (they may come from two citations) |
| `period` | `{"text": "pre-dawn", "date": "1863-07-02", "part_of_day": "pre_dawn"}` | the phrase as the quote prints it (no clock) |
| `date`, `date_window` | `{"date": "1863-07-04"}`; `{"from": ..., "to": ...}` | the day of the month |
| `duration` | `{"minutes": 10}` or `{"low": 10, "high": 15}` | the number |
| `count` | `{"n": 386}` or `{"parts": [400, 25]}` | every number (the parts of "400+25") |
| `count_range`, `quantity` | `{"low": 218, "high": 368}`; `{"n": 2, "unit": "mph"}` | the numbers |
| `place`, `person`, `category` | `{"text": "Devil's Den"}` | the name as the quote prints it |
| `none` | `{"text": "no clock time in the sources"}` | (a statement about the record; never documented) |

### The `.md` account

`resolutions/C-0xx.md` is for a reader who will not open the JSON: the dispute in a paragraph; each position in two or three lines (who wrote it, when, where he stood, how he knew, which clock, what exactly he says, with the page); the weighing; the decision and its class and tier; what would change it; the failed searches when there are any. No jargon of this plan, no mention of how the site is made. The validator warns when it is missing or longer than 9,000 characters.

## 4. Sources, citations and quotes

**The ledger.** `SOURCES.md` lists every source a citation may name: Official Records Ser. I vol. 27 parts 1 to 3 (`OR27-1`, `OR27-2`, `OR27-3`), the other Official Records volumes, the 99 texts of workstream 9 (`tmp/library/ws9`: the Southern Historical Society papers, memoirs, the state volumes, the weeklies of 1863), the National Park Service texts (`NPS-*`), the newspapers of 1863 (families of parts: `GBG-COMPILER-1863`, `ADAMS-SENTINEL-1863`, `CA-1863`), the medical library, and the project working files (the horde shards and correction files) as **leads**. Columns: `id, class, title, author, date, text, sha256, pages, format, kind, rights, url, notes`. The four classes (the engine's): **primary** (made in 1863-1869 by a witness or an official actor, a paper of 1863, or a compiled Official Records volume), **official** (a Park Service, Library of Congress or National Archives record), **book** (any later published account), **lead** (a web page, encyclopaedia, forum, blog, aggregator, or a project working file: it points to a primary source and proves nothing). A **lead can never make a value documented or inferred, and a default never rests on a lead alone**; read the passage the lead points to in its primary text and cite that.

**To add a source** (a text you fetched; a row of the town ledger or the life registry you want to cite): `python3 -I tools/bt/conflicts/add_source.py --id NEWID --class book --title "..." --author "..." --date 1880 --text tmp/library/conflicts/C-005/hood-1880_djvu.txt --url https://archive.org/details/<identifier> --kind postwar_narrative --notes "fetched <date> from <url> for C-005"`, or `--from-town ID`, or `--from-life ID`. The program hashes the file, finds its page model and format, refuses duplicates, and appends one row to section 10 of the ledger under a file lock. Other researchers append at the same time: never rewrite the file. Section 9 of the ledger lists the planned sources (reachable on archive.org when probed on 2026-11-16, each with the identifier to fetch); fetch the text with `curl -sS -o <file> https://archive.org/cors/<identifier>/<identifier>_djvu.txt`, one request per second, then append the row **under the same id**. Public sources only; no login, CAPTCHA or bot-block circumvention; `babel.hathitrust.org` and `ehistory.osu.edu` answer with their own bot block and are not retried (record the lookup as blocked).

**A citation** has the shape of the other evidence files (`town/evidence`, `life/evidence`): source id, part, printed page, text offset, verbatim quote, source class:

```json
{"source": "OR27-1", "source_class": "primary", "part": "OR27-1-R006", "page": "115", "page_basis": "scan_leaf",
 "text_offset": 389835, "quote": "arriving there at 1 a. m. of the 2d",
 "witness": {"name": "George G. Meade", "role": "Major General commanding the Army of the Potomac", "side": "union"},
 "written": {"date": "1863-10-01", "kind": "official_report"}, "vantage": "commander_present", "knew_by": "eyewitness",
 "clock": "union", "hedge": "exact", "group": "meade", "exact": true, "states": {"times": ["01:00"], "numbers": [1], "dates": ["07-02"]}}
```

| field | rule |
|---|---|
| `source`, `source_class` | a ledger id; the class must equal the ledger's |
| `part` | for `OR27-n` the record id of `docs/battle-theatre/library/or27_index.json` (`OR27-1-R006`); for a family of parts the part (the issue date, `<lccn>/<date>/ed-1/seq-<n>`); else absent |
| `page`, `page_basis` | `or27` texts: `page` is the printed page of the **scan leaf** (`page_basis: scan_leaf`, DD-TL02-04 item 4 and DD-LIFE-05; `running_head` or `interpolated` only where the leaf map has no page); `markers` texts (the NPS PDFs): the PDF page index of the `=== PAGE n ===` marker (`pdf_marker`; `printed_page` may carry the printed number); `none` texts (books and papers without marks): the printed page read in the text or on the page image (`as_read`; `page` null with `page_note` when it cannot be read) |
| `text_offset`, `text_offset_end` | character offset of the first character of the quote in the file decoded as UTF-8 with `newline=''` (the offset `or27_find.py` and `find_passage.py` print; it is checked within 8 characters of the true start); the optional `text_offset_end` (the end offset of the life evidence files) must enclose the quote and lie no more than three quote lengths and 400 characters after the start. The names are those of the town evidence files (`source`, `part`, `page`, `text_offset`); the life files call them `source_id`, `report_id`, `printed_page`, `offset_start`/`offset_end` |
| `quote` | verbatim, at least 20 letters and digits and at most 700 characters; whitespace, punctuation, case, hyphenation at line ends and ligatures are tolerant; `[...]` skips text and each fragment must be found in order (no more than 900 letters apart); **a quote is never stretched beyond what it says** |
| `quote_mode: "ocr"`, `raw`, `ocr_note`, `page_image_viewed` | where the text layer is damaged: `quote` is the corrected reading, `raw` the excerpt exactly as the file has it; the difference may only be local OCR confusions of at most 3 characters each; a repaired **digit** needs `page_image_viewed: true` (look at the page image: archive.org scan leaf, the PDF page) |
| `witness`, `written`, `vantage`, `knew_by`, `clock`, `hedge`, `group` | the rubric (section 5): who wrote it; when the passage was written and of what kind; where the writer stood; how he knew; which clock; how the time is hedged; the line of knowledge |
| `exact` | `true` when the quote states exactly the value of the position (tier documented needs one) |
| `states` | what the quote states, machine-checked against the quote: `times` (24-hour `HH:MM`, read by a clock-expression parser: "1 a. m." is 01:00, "3.45 o'clock" is 03:45 or 15:45), `numbers` (digits, thousands commas, number words, "400 and 25"), `dates` (`MM-DD`: the day number as "2d", "3rd", "July 2", "the second"), `phrases` (words as the quote prints them) |

**Engine.** The quote, offset, page (of `markers` and `none` texts), Official Records record, ledger class and file hash are checked by `check_cite` of `tools/bt/town/validate_evidence.py` through `SOURCES.md` (a thin wrapper, `tools/bt/conflicts/cfl_cite.py`, points it at this ledger and at its own family hashes). Neither existing validator was edited. The town engine was chosen because it resolves every family of the local library through the ledger (Official Records parts by record id, the ws9 books and papers, PDF texts with page markers, the weeklies and newspaper pages as families of parts) and checks the file hash; the life validator's registry covers a subset and its offset rule is looser. The wrapper adds what neither does: the printed page of an Official Records quote by the scan-leaf map, and the check that every time, number, day and name a citation says it states stands in the quote.

`python3 -I tools/bt/conflicts/find_passage.py OR27-1 --quote "arriving there at 1 a. m. of the 2d"` prints the citation skeleton with the offset, record and page; `--regex "..."` searches one text (`--all` all of them; `--families` the weeklies and newspaper pages too) on the whitespace- and hyphenation-normalised view and prints offsets and pages. `tools/bt/or27_find.py` searches the Official Records and prints the same offsets.

**Read in context.** A hit is a place to read, not a quote: read the whole report or letter around it, check who wrote it, to whom, on what date and where the writer was; look at the page image when a digit or a clock matters (OCR confuses 1, l, 7, 4 and 9 and drops "a. m." and "p. m.").

## 5. The weighing rubric

Every citation carries the facts the rubric needs; `weighing` says how each point applied to this conflict.

**Who wrote it and when (`written.kind`, `written.date`).** Higher rank outweighs lower; the gap between the event and the writing is computed from the dates.

| rank | kind | meaning |
|---|---|---|
| 6 | `order_or_dispatch` | an order, dispatch, telegram or signal message of the day, timed by its sender or receiver |
| 5 | `private_letter_or_diary` | a letter or diary entry of the time (within about 400 days) |
| 5 | `official_report` written within 30 days of the event; 4 within 730 days; 3 after | an after-action report of a commander or staff officer |
| 4 | `newspaper_1863` | a newspaper report or correspondent's letter of 1863 |
| 4 | `reference_table` | a return, roll or table compiled from the returns |
| 3 | `early_narrative` | a narrative published within about seven years, by a witness |
| 2 | `postwar_narrative` | a memoir, address, article or regimental history by a participant, years later: **reminiscence** |
| 2 | `proceedings_or_tablet` | monument proceedings, tablets, state commission reports |
| 1 | `later_history` | a history by a non-participant |
| 1 | `institutional` | a modern institutional text (Park Service studies and pages) |
| 0 | `lead` | a web page, forum, blog, aggregator, project working file |

The rule of the owner: **a contemporaneous official report, letter or diary beats a later report, which beats a reminiscence.** The validator warns when a rejected position has a better class of writing than the default without an explanation in `weighing`, and when `kind` and the date gap disagree (a "dispatch" written weeks later, a "reminiscence" written within six months).

**Where the writer stood (`vantage`) and how he knew (`knew_by`).** `commander_present`, `present`, `staff_present` beat `elsewhere`, `not_stated`; `eyewitness` and `own_orders` beat `relayed_report`; `computed` is for a figure the writer worked out. **A writer who was at the place and says how he knew beats one who was elsewhere.** The head and the tail of a column, one battery and the line, the order given and the order received are different moments: `place_of_observation` and `different_event` reasons exist for that.

**Independence (`group`).** Two independent sources beat one. Citations share a `group` when one relays or copies the other (a brigade report and the division report that quotes it; a regimental history that prints the colonel's report; two accounts from one headquarters log; a later memoir built on an earlier article). A value shown with fewer than two groups of non-lead citations carries a flag (`single_source`, `memoir_only`, `weak`, `unsourced`, `lead_only`). The validator counts groups and demands the flag; the reviewer checks that the groups are honest.

**The clock (`clock`, `clock_note`).** A time is read with its clock: `union`, `confederate`, or `unspecified` (a civilian, a newspaper, a table). The writer's side decides unless the text says otherwise ("by General Lee's watch"). The 20-minute difference between the two armies' clocks is **never applied**: a Union and a Confederate value for the same moment may differ by about that much and the reason kind `clock` says so; the weighing mentions it as uncertainty.

**Hedges and tolerance (`hedge`).** "About", "before", "after", "soon after", "between ... and ...", "not later than" keep their tolerance: they are not exact values. A reasonable reading (Appendix B): about X is X plus or minus 15 minutes; "before X" is an upper bound (the event is at or before X); "after X" a lower bound; "soon after X" X plus 0 to 30 minutes; "between X and Y" a window; "nearly X" X minus 0 to 15 minutes; an hour given without minutes ("at 2 p. m.") is a round figure and may stand for the quarter or half hour around it. A position records the hedge in `value.approx` and `tolerance_min`; a quote that says "about" is not turned into an exact time, and a range of the sources is never narrowed to a point because it is convenient.

**A quote is never stretched.** The value of a position is what the quote states and nothing more: "left Taneytown at 11 p. m." does not state an arrival; "the fire ceased" does not state that the infantry advanced; a heading is not a date. If the value follows from the quote by a step, the position is `inferred`, the step is written in `inference.step`, and the position is not documented.

**Numbers.** Say what each figure counts (men, rifles, present for duty, engaged, killed, killed and died of wounds, buried, wagons, wagons and ambulances) and when it was counted; do not mix counts. The default of a number is the best-supported figure with its range visible; sum "400+25" as parts; a printed sum is not the same as a sum of regiments.

**Reasons a position is not chosen (`reason_not_chosen.kind`).** `clock`, `rounding`, `tolerance`, `place_of_observation`, `different_event`, `later_memory`, `elsewhere`, `contradicted_by_primary`, `outweighed`, `no_source`, `lead_only`, `unclear_expression`, `equal_standing`, `within_range`, `misprint` (meanings in `schema.json`). Use the most specific; `outweighed` needs the comparison written in `weighing`. A reason is a sentence a visitor can read.

## 6. Classes, tiers and the default

**The four classes** (what the evidence did):

- **settled**: the better sources agree and every other value is explained by clock, rounding, place of observation, a different event or later memory.
- **weighted**: the evidence favours one value but does not settle it. The default is the better-weighted value; the others stay selectable with the reason they were not chosen.
- **irreducible**: the record itself is divided; the figure or time is a **range, a window or a set of claims** that stay side by side, with a declared basis (`default.mode` is `range`, `window` or `unresolved_set`, never `position`). At least two failed searches are listed.
- **gap**: no source found that states the point; the default is a marked stand-in (plausible-procedural, usually the PDF value kept and marked) or an open gap. At least three failed searches in at least two different places are listed. A stand-in is never presented as documented, and a filled-in guess is a violation.

**Tiers follow from the class and from the sources** (the validator enforces the matrix):

| class | tiers allowed |
|---|---|
| settled, weighted, irreducible | documented, inferred |
| gap | plausible-procedural, open gap |

- **documented**: at least one **non-lead** citation of a class of writing in `documented_kinds` (`order_or_dispatch`, `official_report`, `private_letter_or_diary`, `newspaper_1863`, `reference_table`, `early_narrative`) states **exactly** the value (`exact: true`; every time, number, day and name of the value is in the `states` of such citations and every state is found in its quote). A later memoir, a regimental or state volume, a tablet, a history or a Park Service text supports **inferred** at most: it documents that the writer said so, not the fact (the first delegated pass applied the same rule: C-006 and C-008 single memoirs are inferred, C-044 institutional is inferred).
- **inferred**: reasoned from stated facts; `inference.step` (at least 20 characters) says from what and by which step, and a non-lead citation or premise supports it. A computed sunrise, an interval added to a stated hour, a window from two statements are inferred.
- **plausible-procedural**: a stand-in for the missing record, marked as such in the product (`procedural_basis` says what it stands in for).
- **open gap**: nothing found; the value, if any, is shown as a visible gap.

The tier of the resolution is the **weakest tier of the positions its default rests on**; the validator refuses a tier better than that. A PDF-only value (no non-lead citation) cannot be documented or inferred. A conflict whose default is an open gap never passes the conflict gate (gate spec CF-3): that is a fact to report, never a reason to fill it in.

**The default** (`default`): `mode` is `position` (one value: `positions` names one id), `range` (a numeric range or time range with no headline value), `window` (a time window, the bounds named in `positions`) or `unresolved_set` (two or more claims shown side by side, none chosen). `label` (at most 120 characters) is what the viewer shows. A range or window carries `basis_text` (what the bounds are: "the Official Records returns of the regiment and the brigade"). A **numeric default** carries `range {low, high, basis}` (the range stays visible); `mode: position` also carries `value`, the best-supported figure; `mode: range` shows the range and no figure (C-046, C-047). `animation {at, rule, note}` says which single instant or figure drives the picture when the default is a window or range, by `earliest_documented`, `best_supported`, `midpoint`, `range_end`, `follows_printed_strength` or `none`; **the instant is never earlier than the earliest source-supported time** (the gating rule of B.2.4), and the earlier value stays selectable.

How to choose (the order of the decision): (1) list every position with its citations and rubric facts; (2) discard nothing; (3) explain every difference you can by clock, rounding, tolerance, place, different event, later memory (these make a conflict settled or weighted); (4) rank what remains by section 5; (5) if one position is carried by the best class of writing, by a witness who was there and says how he knew, and by two groups where the others have one, it is the default (settled or weighted, tier by the sources); (6) if the best-classed witnesses disagree with each other and nothing in section 5 separates them, the conflict is irreducible: choose the range, window or set, declare its basis, list the searches that failed to separate them; (7) if no source states the point, it is a gap: say so, list the searches.

## 7. What the viewer shows

For each conflict the viewer shows: the **default** (`default.label`) with its tier and class marked; for a range the range, never a single figure; the **source-panel text**; and every position (all values), each with its label, who wrote it and when (from the citations), its tier and flags, and, for the values that are not the default, the reason it was not chosen. The product label is "Default chosen under delegated authority (2026-11-16), reversible by the owner; class <class>; tier <tier>", composed by the integration step.

**`source_panel_text`** (60 to 400 characters, counted as characters): plain English, no markup. It names the default value; says what the choice rests on in one clause (who wrote it, in which document, when); says in one clause why the other values were not chosen (or that the record is divided, or that no source states it); says how many other values are listed. It states a gap as a gap ("no source states this hour"). It does not use the words of this plan (tier, class, position), does not speak in the first person, and **says nothing about how the site or the research was made** (copy audit: no mention of AI, Claude, Anthropic, agents, automation, prompts or tools; the validator refuses those words in every label, reason and panel text).

Example (C-001): "About 01:00 on Jul 2: Meade's own report puts his arrival at 1 a.m. and his inspection of the line at first light. Hunt's report says about 2 a.m. The plan's 'after midnight' agrees; 'about 04:00' (one web timeline) has no source in the record. All four values stay selectable."

## 8. Readers, gates and the integration step

`readers[]` lists what carries the value, each `{kind, ref, must_change, note}` with kind `timeline_row` (T1-/T2-/T3- ids of `timeline_*.jsonl`), `arrivals_row` (a row id of `history/arrivals.json`), `gate` (Q04, Q05, Q06 or the named case), `app_data`, `app_code`, `test`, `doc`, `other`. The dossier lists candidates; confirm each by reading it. `must_change: true` means the default, the window or an expected value that file holds will differ from the resolution; the researcher **does not edit those files**: the integration step (`bt-conflicts-integrate`) does, through the file that owns it or a request note to its owner.

**The readers list is computed, not remembered.** `python3 -I tools/bt/conflicts/readers.py C-0xx` prints, in the format of the field, every register entry (`register/EG-*.md`, `register_index.json`, `register_aliases.json`), every `decision_log.md` line (keyed by its `DEC-C-0xx` or enclosing DEC heading), every `DELEGATED-DECISIONS*.md` row, every timeline row (seed, verified, windows, corrections) and every gate runner or spec file (`tools/bt/gates`, `GATE-SPEC*.md`, `gates.json`) that names the id; paste it, then read each item and set `must_change`. The validator reports each one that no reader's `ref` or `note` names as `readers_incomplete` (on by default for the files of `resolutions/`; `--readers` forces it on for any file, `--no-readers` off). A resolution that names a row, entry or file the scan does not find is fine; one that omits what the scan finds is not.

Gates read these values. Gate Q04 ("no entity of a unit exists in the scene before its arrival window opens") scans every scenario; its named cases take their floor from `arrivals.json` `meta.named_periods`: Stuart's brigades from the evening of Jul 2 (19:32, sunset) and Pickett's division from the morning of Jul 3 (04:36, sunrise) in the default views. **A changed default means the gate spec and its expected values are reconciled in the open, never that a gate is lowered or skipped**: the resolution says in `readers` which gate value changes and why, with the evidence; the integration step records the reconciliation in `decision_log.md` and `DELEGATED-DECISIONS-2026-11-11.md` and re-runs the affected checks through the machine lock. A floor moves only to an earlier time that the record documents; the old value stays a selectable scenario.

## 9. Failed searches

`failed_searches` (and `failed_lookups` of a position) are lists of `{where, query, outcome, at}`: `where` is the place searched (a ledger id or a host), `query` what was searched (the regular expression or the words, with the variants tried: spellings, "a. m." and "o'clock", OCR forms), `outcome` one of `not_found`, `failed`, `blocked`, `not_read`, `at` the date. A search that found something is not a failed search. Only searches actually run are listed; a lookup that failed for a technical reason is `failed`, a refused host `blocked`, a text not read to the end `not_read`. A gap lists at least three searches in at least two places (the Official Records parts, the books and papers, the Park Service texts, the weeklies of 1863, a fetched source); an irreducible conflict lists at least two. Search tolerantly (the OCR text has irregular spacing, hyphenation and digit errors) with `or27_find.py` and `find_passage.py --regex`, and list the sources worth fetching that were not (section 9 of the ledger and the dossier).

## 10. The validator and the self-test

`python3 -I tools/bt/conflicts/validate_resolution.py C-001` (one or more ids, or a path), `--all` (every present file), `--all --complete` (all 47 must exist and pass; exit 1 otherwise), `--self-test`, `--schema`, `--strict` (warnings count as errors), `--json`. Exit status 1 on any error. It reads only local files. Results of an id run are also written to `tmp/conflicts/validation/`.

What it checks (error codes in Appendix C): the file parses and has only known keys; id and topic equal the register; the PDF row and the first delegated default are quoted exactly; every PDF value and every first-pass scenario is carried (none dropped); enumerations; the class/tier matrix; every position has a citation or a list of failed lookups; every quote is found at its offset, on its page, in a text whose hash is the ledger's; every state (time, number, day, name) stands in the quote; a documented position has an exact non-lead citation of a witness class that states the value; a lead never documents or infers; the default exists, is of the right mode for the class, carries the range of a number, and its tier is not better than its positions; every non-default position has a reason; single-source values are flagged; the source-panel text, labels and reasons are within limits and free of banned words; gap and irreducible conflicts list failed searches; weighing, readers, holds and `what_would_change_it` are present. Warnings: rubric inversions, hedge words, a printed page that does not appear near the quote, an OCR-corrected number without `page_image_viewed`, a missing or overlong `.md` account.

`--self-test` copies the valid fixture `tools/bt/conflicts/selftest/c001-valid.json` (a complete C-001 built from the real register and Official Records passages, and `c015-valid.json`, a numeric one; `selftest/make_base.py` regenerates them), plants over forty defects one at a time (the run prints each with the code that caught it; among them: a fabricated quote, a dropped value, a documented tier on a lead-only source, a missing reason, a wrong offset, a wrong page, a number not in the quote, a panel text over 400 characters, a gap without failed searches) and demands that each is reported with the code that names it; it also validates three positive controls (a numeric resolution of C-015 built from the real register and Chamberlain's report, a gap resolution and an irreducible resolution: each must have 0 errors), runs the command line (four exit-status checks) and writes `selftest/RESULT.json`. Tests: `tools/bt/conflicts/tests/test_validate_resolution.py` (`python3 -I -m unittest discover -s tools/bt/conflicts/tests`); the same test file is to be mirrored under `tests/governance/conflicts/` (request note `horde/requests/bt-conflicts-tests-dir.md`).

## 11. What a reviewer must check

An independent reviewer does not trust the researcher's report. For one resolution:

1. Run `validate_resolution.py C-0xx`: 0 errors; read every warning.
2. Re-find the quote of every citation of every default position and of every `exact: true` citation with `find_passage.py`; open the text around it and read the whole report or letter; confirm that the quote says what `states` and the value claim (the hour, the number, the name; the unit; the day), that `[...]` fragments do not join unrelated sentences, and that a hedge word ("about", "before") has not been dropped.
3. Confirm `written.date` and `kind` from the dateline of the report, `witness.role`, `vantage` and `knew_by` from the text, and the `clock` from the writer's side; look at the page image for a digit or a clock that matters.
4. Confirm the `group`s are honest (does one passage relay another?) and that the number of independent groups matches the flags.
5. Confirm each `reason_not_chosen` is true and is the most specific kind; confirm no rejected value outranks the default on the rubric without the comparison written in `weighing`.
6. Confirm the class (is it settled, or is a disagreement papered over? is a gap really a gap?), the tier (documented only with an exact witness citation; inferred with its step), and the default mode.
7. Confirm nothing is dropped: every value of the PDF row, the recommended default and every first-pass scenario is a position, the labels are the PDF's words.
8. Re-run three failed searches with tolerant patterns and look for synonyms and OCR forms; confirm the places searched are the ones named and that sources worth fetching were fetched or listed.
9. Confirm `source_panel_text` is true to the record, at most 400 characters, plain English, and says nothing about how the site was made.
10. Confirm `readers`: grep the id and the subject in the timeline files, `arrivals.json`, the app data and the gates; confirm the `must_change` flags and that no file outside the ownership list was edited.
11. Confirm the animation instant is not earlier than the earliest source-supported time and that a numeric default keeps its range and does not turn a range into a headline number.
12. Confirm every ledger row appended for the conflict has the hash of its file (`build_sources.py --check`), and that quotes and failed searches the account (`.md`) states agree with the JSON.

A reviewer returns ok only when all twelve hold; otherwise concrete defects (file, id, what is wrong, how it was seen).

## 12. Working rules

- Own paths of a researcher: `resolutions/C-0xx.json` and `.md`, `SOURCES.md` (append only; re-read it immediately before each append; use `add_source.py`), `horde/ws-conflicts/C-0xx-*.md`, `tmp/conflicts/C-0xx/**`, `tmp/library/conflicts/C-0xx/**`. Nothing else is written; a change in a file you do not own is a request note `docs/battle-theatre/GOVERNANCE/horde/requests/bt-conflicts-<short-name>.md` (what, why, the exact change).
- Record the outcome as a DELEGATED DECISION by appending with shell `>>` to `decisions/DELEGATED-DECISIONS-2026-11-11.md` (never the word DECIDED in `decision_log.md`); append one dated line to `progress.md` with a single `printf ... >> file`.
- Do not run git commit, push, pull, stash, checkout, reset, clean or restore. Heavy jobs (more than about 30 s of CPU) go through `tools/horde/bench.sh`.
- Product text (labels, reasons, panel text) never mentions how the site was made.

## Appendix A. Enumerations

All enumerations are in `schema.json` (printed by `validate_resolution.py --schema`): classes, tiers, `class_tiers`, `basis_kinds`, `origins`, `kinds`, `flags`, `reason_kinds`, `documented_kinds`, `written_kinds`, `vantages`, `knew_by`, `clocks`, `hedges`, `page_bases`, `default_modes`, `animation_rules`, `weighing_keys`, `reader_kinds`, limits.

## Appendix B. How clock expressions and hedges are read

The parser used by the validator (`cfl_parse.py`) reads: `4.30 a. m.`, `10:15`, `1 a. m.`, `2 p. m.`, `7 o'clock` (with or without a. m. / p. m. / "in the morning/afternoon/evening/night"), `seven o'clock`, `half past ten`, `a quarter before five`, `quarter past two`, `ten minutes before seven`, `between 7 and 8 o'clock` (both), `noon`, `midnight`, `12 m.`. Without a. m./p. m. a reading returns both the morning and the afternoon hour (`4 o'clock` is 04:00 and 16:00); the check is that the value is one of the readings, so a correct statement is never refused, and the reviewer judges which reading the passage means. Sunrise, daybreak, dawn and "stars bright" are not clock times: use kind `period` and state the phrase.

| hedge | words | reading |
|---|---|---|
| `exact` | none | the hour as printed (still a round figure when given without minutes) |
| `about` | about, abt, nearly, near, around, towards | value plus or minus 15 minutes (30 for a duration of hours) |
| `upper` | before, ere, not later than, by, until, prior to | the event is at or before the hour |
| `lower` | after, not before, since, from | at or after the hour |
| `soon_after` | soon after, shortly after, just after | the hour plus 0 to 30 minutes |
| `window` | between ... and ..., from ... to ... | a window with two bounds |

## Appendix C. Error codes of the validator

| code | meaning |
|---|---|
| `json_parse`, `not_object`, `unknown_key`, `missing_key`, `schema_version` | the file is not the format |
| `id_mismatch`, `topic_mismatch`, `pdf_row_mismatch`, `delegated_mismatch` | the register, the PDF row or the first delegated default is misquoted |
| `pdf_value_dropped`, `scenario_dropped`, `scenario_unknown`, `pdf_label_missing`, `pdf_label_mismatch`, `duplicate_position` | a value or scenario is dropped or misplaced |
| `enum`, `class_tier`, `basis_shape`, `tier_better_than_support`, `class_mode` | enumerations, the class/tier matrix, the mode of the default |
| `documented_needs_non_lead`, `documented_not_exact`, `documented_needs_witness_class`, `lead_cannot_document`, `default_lead_only`, `value_not_stated`, `inferred_basis`, `procedural_basis` | the tier is not earned by the sources |
| `flags_missing`, `failed_lookups_missing`, `failed_lookup_shape`, `failed_searches_missing`, `failed_search_shape` | a single-source or unsourced value is not flagged; the failed searches are missing or malformed |
| `reason_missing`, `reason_shape`, `stance_mismatch` | a rejected value has no reason; the stance contradicts the default |
| `default_shape`, `default_unknown_position`, `default_basis`, `default_range`, `default_animation` | the default is malformed |
| `source_unknown`, `source_class`, `cite_missing_field`, `cite_shape`, `witness`, `written_date` | a citation names no ledger source, the wrong class, lacks a field, or is dated before the event |
| `quote_not_found`, `offset_mismatch`, `page_mismatch`, `page_basis`, `page_leafmap`, `text_changed`, `quote_too_short`, `quote_too_long`, `text_unavailable`, `ocr_rules` | the quote is not in the text at that place, page or hash |
| `state_not_in_quote`, `states_shape` | a time, number, day or name a citation claims to state is not in its quote |
| `panel_missing`, `panel_length`, `label_length`, `banned_copy`, `weighing_missing`, `readers_missing`, `holds_missing` | product text and required sections |

## Appendix D. Worked example

`tools/bt/conflicts/selftest/c001-valid.json` is a complete, valid resolution of C-001 built from the real register and from two real passages of the Official Records (Meade's report of 1 Oct 1863, p. 115; Hunt's report of 27 Sep 1863, p. 232). It is a fixture for the self-test, not a research result: its dates, witnesses and groups are true to the reports it cites but its weighing is abridged. Copy its structure.
