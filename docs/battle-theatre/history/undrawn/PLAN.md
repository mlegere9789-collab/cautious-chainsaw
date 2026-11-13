# Undrawn units: what the history layer does not draw, why, and how the gaps are closed

Workstream bt-units, 2026-11-13. This plan names every unit of the roster that the history layer does not draw or draws only in part, says what is missing of each and why, divides them into 24 research groups by formation, and fixes the one file each group writes (`docs/battle-theatre/history/undrawn/<group>.jsonl`) and the record format of that file, so that one integrator can merge the 24 files into the layer build without editing a line by hand.

The numbers, the tables and the group sections between `<!-- GEN:... -->` markers are computed from `groups.json`, `status.json` and `roster-gaps.json` by `tools/render_plan_tables.py` (never edited by hand). `status.json` is a snapshot of the layer as it is built now (history layer v8, contract 1.8, 439 units drawn) made by `tools/derive_status.mjs` from `app/src/history/real.mjs`, the five position ledgers and the troop-map digest; it was re-derived on 2026-11-13 and is byte-identical to the file this plan was built from. Re-derive it after every merge (section 6.7).

| File | What |
|---|---|
| `PLAN.md` | this plan |
| `groups.json` | the 24 groups: every unit of the roster in exactly one group; per unit what is missing, why, what the ledgers already hold; per group the sources |
| `status.json` | what the layer draws of each of the 726 units (derived; input of `groups.json`) |
| `roster-gaps.json` | 125 units printed in the Official Records organization tables that the roster lacks, splits or lists with another status, found by code with their quotes and offsets; the ids a `unit` record uses |
| `sources.json` | the 112 local texts a record may cite, with path and sha256 |
| `<group>.jsonl` | the file a researcher writes (absent until written) |
| `tools/` | `derive_status.mjs`, `build_roster_gaps.py`, `build_groups.py` (build the three data files), `check_undrawn.py` (the checker), `make_fixtures.py` and `fixtures/` (the checker's tests), `render_plan_tables.py` |

## 1. Purpose, rules and what "done" means

### 1.1 Purpose

The layer draws 439 of 726 units (127,572 figures). 108 leaf units are open gaps (no road of approach: not drawn), 21 wait at the edge of the ground (a road, no place), and of the 547 leaf units on the field not one has everything of its own: 540 inherit their arrival window from a formation above, 334 have no road of their own that is printed for them (none, modelled, or only the corps-level road), 336 lack a place on at least one day, and all 547 carry a procedural share of the corps figure instead of a strength. The aim is the owner's: every unit, soldier, horse, gun and minute of the record drawn from the record, or its absence marked in the product with the reason (Law clauses 1, 3 and 7). Nothing in this plan narrows that.

### 1.2 Rules for every record

1. **Nothing is narrowed or deferred** (Law 1, 6). Every unit of the 24 groups ends with, for each word of what is missing, evidence of the right kind or a visible marked gap. "Too much work" is never a reason; a session that ends before a group is finished leaves a file that passes the checker without `--complete` and a note of what is still owed; the next round continues from exactly that list (section 6.7), until nothing is owed.
2. **Nothing is fabricated** (Law 4). Every quote is at most 14 words and is found by code, verbatim, in a local text at the offset recorded; every `printed` field of a record is found in the passage that was read; a claim is `documented` only when the author's role and the whole passage support exactly that claim; a failed lookup is a `gap` record with the searches made. Never a source: Wikipedia, forums, blogs, auction pages, memory. A text that cannot be acquired is named `NOT-ACQUIRED:<title>` and never quoted.
3. **Gaps are visible** (Law 3, 7). A gap record becomes a proposed Evidence-Gap Register entry and a mark on the unit's card ("open gap"); the owner escalates it in the Decision Log. No exception is ever claimed.
4. **No unit before its earliest documented arrival** (Q04). A record that puts a unit at the field earlier than its gate is kept, listed and never applied; the gate is not moved. Arrival is a march: a unit enters along a road from outside the loaded ground.
5. **Conflicts are carried, never resolved** (Law 6). Two records that disagree name each other in `conflicts_with`; both stay; the layer places neither (two roads for one unit, or one place at two hours within 90 minutes: section 6.2) and lists both on the card.
6. **Strengths are ranges with a declared basis.** A printed number is written as printed (`value`) or as the printed range (`min`, `max`) with `what` it counts and the date it refers to; nothing is averaged, summed or completed.
7. **Tier marking stays** (DEC-006 dropped only the reviewer label). Tiers: `documented`, `inferred`, `open gap`; a group file never holds `plausible-procedural` (what the builder fills in is the builder's, never typed in).
8. **Copy audit.** The prose fields of a record (`statement`, `reasoning`, `note`, `fidelity_note`, the gap texts) reach the cards: they must not say how the page was made (the pattern of `app/tests/ui.spec.mjs`; the checker applies it). A historical quote that holds one of the words is listed and elided by the integrator.
9. **One writer per file.** A researcher writes only `undrawn/<group>.jsonl`, `tmp/units-<group>/`, `GOVERNANCE/horde/ws-units/<group>/` and `GOVERNANCE/horde/ws-units/proposed-register/<group>-*.md`. The shared files (`history/units.json`, `arrivals.json`, `positions_*.jsonl`, `app/data/*`) are the integrator's; a change wanted there is a request note under `GOVERNANCE/horde/requests/`. A record names only units of its own group (the checker refuses the others).
10. **Public sources only:** at most one request a second, no logins, no CAPTCHAs, no bot-block circumvention. Reachable: archive.org (`https://archive.org/cors/<identifier>/<file>`), www.loc.gov, tile.loc.gov, cdn.loc.gov, chroniclingamerica.loc.gov, www.nps.gov, www.npshistory.com, www.gutenberg.org, catalog.archives.gov. Blocked by their own bot check, never retried: babel.hathitrust.org, ehistory.osu.edu. A refused host is recorded as blocked in the notes.

### 1.3 What "done" means

- **A unit** is done when, for each word of its `missing` (section 2.3), the group file holds a record of the kind that closes it (the unit's own, or for arrival, positions and path a formation above it) or a gap record that names the word; for positions, one per day of 1 to 3 July on which the layer holds no place. `check_undrawn.py <group> --complete` computes this and lists what is still owed.
- **A group** is done when `check_undrawn.py <group> --complete` exits 0 (exit 2 is allowed only when a declared source text is not on this machine: list it in the notes), every roster-gap entry of the group is confirmed by a `unit` record or answered with a gap (`what: ["roster"]`), every gap record has its proposed register entry, `GOVERNANCE/horde/ws-units/<group>/NOTES.md` says what was read and what was not, and one dated line is appended to `GOVERNANCE/progress.md`.
- **The round** is done when `check_undrawn.py --all` exits 0, the integrator has merged (section 6) and `derive_status.mjs` has been re-run; units whose `missing` is still not empty and that no gap record covers are the round-2 list.
- A milestone is never reported complete unless the Section Z checklist is true and `check_governance.py` passes (the project's standing instructions).

## 2. Words and numbers

### 2.1 When the layer draws a unit

`createRealHistory` (`app/src/history/real.mjs`) draws a leaf unit that is on the field when (i) it has a gate (its own, or inherited down the line of command: Q04), (ii) it has a road of approach, its own or inherited, that is a gazetteer line crossing the loaded ground (6.2 x 6.1 km), and (iii) it has a dated place after arrival; with (i) and (ii) and no place it is drawn waiting in its column where its road leaves the ground (`edge_only`); without (ii) it is not drawn (`not_drawn`, an open gap). A formation above the regiments is an `aggregate`: nothing is drawn of it; its leaf units carry the figures. The units the plan's tables list as never on the field are `not_on_field`.

### 2.2 Classes used in `groups.json`

| Class | Meaning |
|---|---|
| `not_drawn` | a leaf unit with no road of approach (108 of the layer, plus the 32d Massachusetts, which the layer holds as a formation and draws nothing of) |
| `edge_only` | a road and no place after arrival: drawn at the edge of the ground |
| `partly_drawn` | placed, with at least one of the words of 2.3 still missing (every placed unit: its strength is a procedural share) |
| `formation` | a formation above the regiments; its row says `parent_only` when no claim names it, which marks where evidence recorded at that level would apply to everything below |
| `not_on_field` | listed as never or only partly on the field (a non-lead source for the absence is owed) or documented absent |

### 2.3 The five words of what is missing

| Word | The layer says it is missing when | Closed by |
|---|---|---|
| `arrival` | the unit has no gate of its own: its arrival window is the one of a formation above (the PDF gives none for regiments) | an `arrival` record with `scope: field` of the unit or a formation above it; or a gap |
| `positions` | the unit is not placed (not drawn, or at the edge), or on a day of 1 to 3 July after its gate it has no place of its own (no ledger stop and no single-label troop-map position); no place is modelled after 3 July | one `position`, `engagement`, `night_position`, `movement` or `departure` record dated that day (the unit's own or a formation's above), or a gap with that day |
| `path` | the unit has no road of approach (not drawn), or its road is modelled from the sibling formations (DEC-015, EG-0070), or only the corps-level road is printed for it | an `arrival_road` record with `enters_ground: true` of the unit or a formation above it; or a gap |
| `strength` | the unit has no printed figure of its own (every leaf unit: a procedural share of the corps or brigade figure, tier plausible-procedural) | a `strength` record of the unit itself; or a gap that lists the unit |
| `parent_only` | no ledger claim and no troop-map label names the unit: its gate, road and places all come from formations above it | any record of its own (not a formation's), or a gap |

### 2.4 Reason codes (`why`)

<!-- GEN:why -->
| Reason code | Units | What it means | Groups (units) |
|---|---:|---|---|
| `placed` | 418 | a road of approach and a place: drawn (and still partly missing something) | us-5c (39), us-12c (32), us-2c-2d-3d (27), cs-1c-hood-resart (26), us-3c-1d (24), cs-2c-rodes-resart (23), us-2c-1d-art (23), cs-3c-anderson (22), cs-3c-pender-resart (22), us-hq-artres (22), us-1c-2d-3d (21), cs-2c-early (18), cs-3c-heth (18), us-11c (17), us-1c-1d-art (17), us-6c-1d-2d (17), us-6c-3d-art (17), cs-1c-mclaws (11), us-cav-2d-3d-art (9), cs-2c-johnson (6), us-3c-2d (6), cs-1c-pickett (1) |
| `formation` | 164 | a formation above the regiments: its leaf units carry the figures; nothing is drawn of it | us-5c (13), us-11c (11), us-12c (10), cs-cav-hq (8), us-2c-2d-3d (8), us-6c-1d-2d (8), us-hq-artres (8), cs-1c-hood-resart (7), cs-2c-rodes-resart (7), cs-3c-anderson (7), us-1c-2d-3d (7), us-2c-1d-art (7), cs-1c-mclaws (6), cs-2c-early (6), cs-3c-pender-resart (6), us-3c-1d (6), us-cav-2d-3d-art (6), cs-2c-johnson (5), cs-3c-heth (5), us-1c-1d-art (5), us-6c-3d-art (5), us-cav-1d (5), cs-1c-pickett (4), us-3c-2d (4) |
| `route_unplaceable` | 39 | the reports print a road or route the repository cannot place (the road from Scotland, the road past Horner's Mills, the Fairfield road): not drawn | cs-2c-johnson (17), us-11c (14), us-cav-1d (8) |
| `no_single_day_label` | 25 | a sibling road exists but the troop maps give the unit no single-label day position: not drawn | cs-1c-pickett (15), cs-1c-mclaws (10) |
| `cavalry_no_road` | 16 | cavalry of Stuart's division: only earlier marches are printed, no road onto the ground: not drawn | cs-cav-hq (16) |
| `road_outside_ground` | 12 | the only road printed for the division lies outside the loaded ground (Black Horse Tavern Road): not drawn | us-3c-2d (12) |
| `sibling_roads_differ` | 11 | the documented sibling formations of the corps name different roads, so the sibling rule (DEC-015) does not apply: not drawn | us-cav-2d-3d-art (9), cs-2c-rodes-resart (2) |
| `no_place_after_arrival` | 21 | a road of approach and no place after arrival: drawn waiting in its column where the road leaves the loaded ground | cs-cav-hq (6), us-6c-1d-2d (6), us-cav-1d (5), us-6c-3d-art (4) |
| `no_figure` | 4 | a headquarters, a person or a grouping entry with a gate and no figure: not drawn | us-hq-artres (2), cs-1c-mclaws (1), cs-cav-hq (1) |
| `reports_disagree` | 1 | two reports of the unit print different roads: not drawn, none chosen | cs-2c-early (1) |
| `roster_structure` | 1 | the roster holds the regiment as a formation whose only child is a detached company: nothing of the regiment is drawn | us-5c (1) |
| `listed_not_on_field` | 13 | the plan's table lists the unit as never (or only partly) on the field, on a weak key: a non-lead source for the absence is owed | cs-cav-hq (3), us-hq-artres (3), cs-2c-early (2), cs-1c-pickett (1), cs-3c-heth (1), us-5c (1), us-6c-1d-2d (1), us-cav-2d-3d-art (1) |
| `documented_absent` | 1 | documented absence from the field (an overlay, EG-E-84PA): not drawn, correct as it is | us-3c-2d (1) |
<!-- /GEN:why -->

### 2.5 The numbers

<!-- GEN:totals -->
| What | Units |
|---|---:|
| units of the roster (history/units.json) | 726 |
| drawn by the layer now (placed 418 + at the arrival edge 21) | 439 |
| not drawn: open gaps (108 leaf units of the layer, and the 32d Massachusetts, which the layer holds as a formation and draws nothing of) | 109 |
| formations above the regiments (aggregates: their leaf units carry the figures) | 164 |
| not on the field (13 listed by the plan's tables, 1 documented absence) | 14 |
| figures drawn now (one soldier per figure) | 127,572 |
| leaf units on the field (placed + at the edge + not drawn) | 547 |
| of those: missing an arrival of their own | 540 |
| of those: missing positions (a day without a place, or no place at all) | 336 |
| of those: missing a road of approach of their own (none, modelled, or only the corps-level one) | 334 |
| of those: missing a strength of their own (every one: a procedural share) | 547 |
| of those: missing everything of their own (gate, road and places all come from a formation above) | 164 |
| drawn units by road of approach: printed for the unit or a formation below the corps (tier inferred) | 213 |
| drawn units by road of approach: only the corps-level road is printed (plausible-procedural) | 170 |
| drawn units by road of approach: modelled from the sibling formations of the corps (DEC-015, EG-0070) | 56 |
| placed units with a place on 1, 2 or 3 days of 1 to 3 July (days from the unit's gate; a place is a ledger stop or a single-label troop-map position) | 150, 177, 91 |
| roster-gap entries (units printed in the Official Records tables that the roster lacks, splits or lists with another status) | 125 |
<!-- /GEN:totals -->

## 3. What is not drawn, and why

### 3.1 The 109 units not drawn, by cause

- **`route_unplaceable` (39).** The reports print a road or route the repository cannot place. XI Corps: Schurz's division (10 regiments) and 4 batteries of the artillery brigade (Howard's order names the road past Horner's Mills, concordance RC-07, unresolved; ledger E a route through the town). Johnson's division: 17 regiments of Steuart, the Stonewall Brigade and Jones (the reports print the road from Scotland). Buford's division: the 8 regiments of Gamble and Devin (ledger E prints the approach as via Boonsboro and Fairfield, the Fairfield road, which RC-08 cannot place). What is needed is the road by which each came ONTO the loaded ground, printed and identified with a gazetteer road, not assumed.
- **`no_single_day_label` (25).** A sibling road exists (the Chambersburg Pike, from Kershaw's report) but the troop maps give the unit no single-label day position: McLaws' division (Semmes' 4 and Wofford's 6 units) and Pickett's division (15 regiments of Garnett, Kemper and Armistead, where sheet 3 prints several labels that the line states do not order). A place on each day, documented, is what brings them in.
- **`cavalry_no_road` (16).** Stuart's cavalry: Fitz. Lee's brigade (5 regiments and the 1st Maryland Battalion), Chambliss' brigade (4), Jenkins' brigade (5) and the Stuart Horse Artillery entry. Only earlier marches are printed for them; no road onto the ground.
- **`road_outside_ground` (12).** The 12 regiments of Carr and Brewster in Humphreys' division: the only road printed for the division, the Black Horse Tavern road (AP-07), lies outside the loaded ground. Humphreys' report (OR27-1-R158, p. 531) says that after turning back from the Black Horse Tavern he marched by the route he had indicated earlier, a road "leading into the main road to Gettysburg" about two miles from the town: whether that is a road of the gazetteer is the open question.
- **`sibling_roads_differ` (11).** The documented sibling formations of the corps name different roads, so the sibling rule does not apply: Kilpatrick's 8 regiments (Farnsworth and Custer; ledger E gives an approach from the east by Hunterstown and Two Taverns), the Union Horse Artillery entry (no batteries in the roster) and the two Confederate Second Corps reserve artillery battalions of Dance and Nelson.
- **`no_figure` (4).** Entries with a gate and no figure: the two Union headquarters entries (`us-aop-hq`, `us-hancock-acting`), Lee's headquarters (`cs-anv-hq`) and the ledger grouping `cs-1c-art` ("I Corps artillery", whose batteries the roster files under the divisions and the Reserve). Who stood at a headquarters is to be established before a figure is drawn; a grouping entry is to be confirmed as naming no unit of its own.
- **`reports_disagree` (1).** Jones' artillery battalion: Brown prints the York road, Early the Heidlersburg road; both stay as scenarios unless a battery report settles it.
- **`roster_structure` (1).** The 32d Massachusetts is held by the roster as a formation whose only child is Company C (headquarters guard of the Artillery Reserve), so nothing of the regiment is drawn.

### 3.2 The 21 units at the edge

Merritt's 5 regiments (Emmitsburg Road, AP-05), Hampton's 6 (Hunterstown Road, AP-06), Neill's 6 and Wheaton/Nevin's 4 of the Sixth Corps (Baltimore Pike, AP-12) have a road and no place after arrival.

### 3.3 The 418 placed units

The placed units are `partly_drawn` by construction. Of the 439 drawn units (the 418 placed and the 21 at the edge), 213 march in by a road printed for the unit or for a formation below the corps, 170 by the corps-level road only (tier plausible-procedural), and 56 by a MODELLED road taken from their siblings (the Fifth Corps by the Hanover Road, 24; Longstreet's First Corps by the Chambersburg Pike, 32). Their places are the ledger stops and the single-label troop-map positions; of the 418 placed units 150 have a place on one of the three days, 177 on two and 91 on all three. Their arrival windows are inherited from the corps, division or brigade row (7 leaf units have a gate of their own), and every strength is a procedural share.

### 3.4 Cavalry

The roster holds 56 cavalry leaf entries: 52 regiments and battalions, 3 brigade entries and Imboden's command (not on the field). The cavalry model (`app/src/history/cavalry.mjs`, built into `app/data/cavalry-horses.json` by `app/tools/build-cavalry-horses.mjs`) reads the 21 regiments the layer draws (10 placed, 11 at the edge) and lists 34 undrawn entries: 31 regiments and battalions (Gamble 4, Devin 4, Farnsworth 4, Custer 4, Fitz. Lee 6, Chambliss 4, Jenkins 5), Imboden's command and the two formation entries of Chambliss and of Robertson, Jones and Imboden. Riders, horses and the dismounted lines of a regiment appear once the regiment is placed and the file is rebuilt; no cavalry file is edited by hand.

### 3.5 The roster gaps

125 units are printed in the Official Records' organization tables (the Union table `OR27-1-R009`, Confederate `OR27-2-R424`) and are missing from the roster, split or listed with another status, found by code (`roster-gaps.json`): 91 to add (the batteries of the Confederate battalions that the roster holds as one unit each, the horse batteries, headquarters and escort companies), 12 printed as not engaged, 15 whose status is to be confirmed, 3 attached to another unit, 3 consolidated batteries that the roster draws as two, and the 32d Massachusetts. Each is confirmed or answered in a `unit` record of its group; the ids are pre-assigned so that two groups never invent two ids for one unit.

### 3.6 All units not drawn or at the edge

<!-- GEN:undrawn -->
| Unit | Name | Group | Class | Why | Missing |
|---|---|---|---|---|---|
| `us-aop-hq` | Army headquarters (Army of the Potomac) | `us-hq-artres` | not drawn | `no_figure` | positions, path, strength |
| `us-hancock-acting` | Maj. Gen. Hancock (II Corps commander acting for Meade, Jul 1) (Army of the Potomac) | `us-hq-artres` | not drawn | `no_figure` | positions, path, strength |
| `us-3c-2d-carr-1ma` | 1st MA (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-carr-11ma` | 11th MA (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-carr-16ma` | 16th MA (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-carr-12nh` | 12th NH (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-carr-11nj` | 11th NJ (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-carr-26pa` | 26th PA (Carr) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-70ny` | 70th NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-71ny` | 71st NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-72ny` | 72nd NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-73ny` | 73rd NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-74ny` | 74th NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-3c-2d-brewster-120ny` | 120th NY (Brewster Excelsior) | `us-3c-2d` | not drawn | `road_outside_ground` | arrival, positions, path, strength |
| `us-5c-1d-sweitzer-32ma` | 32nd MA | `us-5c` | not drawn | `roster_structure` | arrival, positions, path, strength |
| `us-6c-2d-neill-7me` | 7th ME (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-2d-neill-33ny` | 33rd NY (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-2d-neill-43ny` | 43rd NY (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-2d-neill-49ny` | 49th NY (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-2d-neill-77ny` | 77th NY (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-2d-neill-61pa` | 61st PA (Neill) | `us-6c-1d-2d` | edge only | `no_place_after_arrival` | arrival, positions, path, strength, parent_only |
| `us-6c-3d-wheaton-62ny` | 62nd NY (Wheaton/Nevin) | `us-6c-3d-art` | edge only | `no_place_after_arrival` | arrival, positions, path, strength |
| `us-6c-3d-wheaton-93pa` | 93rd PA (Wheaton/Nevin) | `us-6c-3d-art` | edge only | `no_place_after_arrival` | arrival, positions, path, strength |
| `us-6c-3d-wheaton-98pa` | 98th PA (Wheaton/Nevin) | `us-6c-3d-art` | edge only | `no_place_after_arrival` | arrival, positions, path, strength |
| `us-6c-3d-wheaton-139pa` | 139th PA (Wheaton/Nevin) | `us-6c-3d-art` | edge only | `no_place_after_arrival` | arrival, positions, path, strength |
| `us-11c-3d-schimmelfennig-82il` | 82nd IL (Schimmelfennig/von Amsberg) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-schimmelfennig-45ny` | 45th NY (Schimmelfennig/von Amsberg) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-schimmelfennig-157ny` | 157th NY (Schimmelfennig/von Amsberg) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-schimmelfennig-61oh` | 61st OH (Schimmelfennig/von Amsberg) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-schimmelfennig-74pa` | 74th PA (Schimmelfennig/von Amsberg) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-krzyzanowski-58ny` | 58th NY (Krzyzanowski) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-krzyzanowski-119ny` | 119th NY (Krzyzanowski) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-krzyzanowski-82oh` | 82nd OH (Krzyzanowski) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-krzyzanowski-75pa` | 75th PA (Krzyzanowski) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-3d-krzyzanowski-26wi` | 26th WI (Krzyzanowski) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-art-13ny` | 13th NY (Artillery Osborn) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-art-1ohi` | 1st OH I (Artillery Osborn) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-art-1ohk` | 1st OH K (Artillery Osborn) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-11c-art-4usg` | 4th US G (Artillery Osborn) | `us-11c` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-gamble-8il` | 8th IL (Gamble) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-gamble-12il` | 12th IL (Gamble) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-gamble-3in` | 3rd IN (Gamble) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-gamble-8ny` | 8th NY (Gamble) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-devin-6ny` | 6th NY (Devin) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-devin-9ny` | 9th NY (Devin) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-devin-17pa` | 17th PA (Devin) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-devin-3wvaandc` | 3rd WV A and C (Devin) | `us-cav-1d` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `us-cav-1d-merritt-6pa` | 6th PA (Merritt reserve) | `us-cav-1d` | edge only | `no_place_after_arrival` | arrival, positions, strength |
| `us-cav-1d-merritt-1us` | 1st US (Merritt reserve) | `us-cav-1d` | edge only | `no_place_after_arrival` | arrival, positions, strength |
| `us-cav-1d-merritt-2us` | 2nd US (Merritt reserve) | `us-cav-1d` | edge only | `no_place_after_arrival` | arrival, positions, strength |
| `us-cav-1d-merritt-5us` | 5th US (Merritt reserve) | `us-cav-1d` | edge only | `no_place_after_arrival` | arrival, positions, strength |
| `us-cav-1d-merritt-6us` | 6th US (Merritt reserve) | `us-cav-1d` | edge only | `no_place_after_arrival` | arrival, positions, strength |
| `us-cav-3d-farnsworth-5ny` | 5th NY (Farnsworth (k)/Richmond) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-farnsworth-18pa` | 18th PA (Farnsworth (k)/Richmond) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-farnsworth-1vt` | 1st VT (Farnsworth (k)/Richmond) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-farnsworth-1wv` | 1st WV (Farnsworth (k)/Richmond) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-custer-1mi` | 1st MI (Custer) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-custer-5mi` | 5th MI (Custer) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-custer-6mi` | 6th MI (Custer) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-3d-custer-7mi` | 7th MI (Custer) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `us-cav-art` | Horse Artillery (Cavalry Corps) | `us-cav-2d-3d-art` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `cs-1c-mclaws-semmes-10ga` | 10th GA (Semmes) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-semmes-50ga` | 50th GA (Semmes) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-semmes-51ga` | 51st GA (Semmes) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-semmes-53ga` | 53rd GA (Semmes) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-wofford-16ga` | 16th GA (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength |
| `cs-1c-mclaws-wofford-18ga` | 18th GA (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-wofford-24ga` | 24th GA (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-wofford-cobbslegion` | Cobb’s Legion (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-wofford-phillipslegion` | Phillips Legion (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-mclaws-wofford-3gasharpshooters` | 3rd GA Sharpshooters (Wofford) | `cs-1c-mclaws` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-art` | I Corps artillery (I Corps) | `cs-1c-mclaws` | not drawn | `no_figure` | arrival, positions, path, strength |
| `cs-1c-pickett-garnett-8va` | 8th VA (Garnett) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-garnett-18va` | 18th VA (Garnett) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-garnett-19va` | 19th VA (Garnett) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-garnett-28va` | 28th VA (Garnett) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-garnett-56va` | 56th VA (Garnett) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-kemper-1va` | 1st VA (Kemper) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-kemper-3va` | 3rd VA (Kemper) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-kemper-7va` | 7th VA (Kemper) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-kemper-11va` | 11th VA (Kemper) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-kemper-24va` | 24th VA (Kemper) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-armistead-9va` | 9th VA (Armistead) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-armistead-14va` | 14th VA (Armistead) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-armistead-38va` | 38th VA (Armistead) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-armistead-53va` | 53rd VA (Armistead) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-1c-pickett-armistead-57va` | 57th VA (Armistead) | `cs-1c-pickett` | not drawn | `no_single_day_label` | arrival, positions, path, strength, parent_only |
| `cs-2c-early-jones` | Jones's battalion (Early) | `cs-2c-early` | not drawn | `reports_disagree` | arrival, positions, path, strength |
| `cs-2c-johnson-steuart-1mdbn` | 1st MD Bn (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-steuart-1nc` | 1st NC (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-steuart-3nc` | 3rd NC (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-steuart-10va` | 10th VA (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-steuart-23va` | 23rd VA (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-steuart-37va` | 37th VA (Steuart) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-stonewall-2va` | 2nd VA (Stonewall) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-stonewall-4va` | 4th VA (Stonewall) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength, parent_only |
| `cs-2c-johnson-stonewall-5va` | 5th VA (Stonewall) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-stonewall-27va` | 27th VA (Stonewall) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-stonewall-33va` | 33rd VA (Stonewall) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-21va` | 21st VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-25va` | 25th VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-42va` | 42nd VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-44va` | 44th VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-48va` | 48th VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-johnson-jones-50va` | 50th VA (J. M. Jones) | `cs-2c-johnson` | not drawn | `route_unplaceable` | arrival, positions, path, strength |
| `cs-2c-res-art-1vaartbn` | 1st VA Artillery Bn (Reserve artillery J. T. Brown) | `cs-2c-rodes-resart` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `cs-2c-res-art-nelson` | Nelson's battalion (Reserve artillery J. T. Brown) | `cs-2c-rodes-resart` | not drawn | `sibling_roads_differ` | arrival, positions, path, strength |
| `cs-cav-hampton-1nc` | 1st NC (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-hampton-1sc` | 1st SC (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-hampton-2sc` | 2nd SC (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-hampton-cobbslegion` | Cobb’s Legion (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-hampton-jeffdavislegion` | Jeff Davis Legion (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-hampton-phillipslegion` | Phillips Legion (Hampton) | `cs-cav-hq` | edge only | `no_place_after_arrival` | arrival, positions, strength, parent_only |
| `cs-cav-flee-1mdbn` | 1st MD Bn (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-flee-1va` | 1st VA (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-flee-2va` | 2nd VA (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-flee-3va` | 3rd VA (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-flee-4va` | 4th VA (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-flee-5va` | 5th VA (F. Lee) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-jenkins-14va` | 14th VA (Jenkins/Witcher) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-jenkins-16va` | 16th VA (Jenkins/Witcher) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-jenkins-17va` | 17th VA (Jenkins/Witcher) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-jenkins-34vabn` | 34th VA Bn (Jenkins/Witcher) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-jenkins-36vabn` | 36th VA Bn (Jenkins/Witcher) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-chambliss-2nc` | 2nd NC (W. H. F. Lee/Chambliss) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-chambliss-9va` | 9th VA (W. H. F. Lee/Chambliss) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-chambliss-10va` | 10th VA (W. H. F. Lee/Chambliss) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-chambliss-13va` | 13th VA (W. H. F. Lee/Chambliss) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength, parent_only |
| `cs-cav-horse-art` | Stuart Horse Artillery (Cavalry Division) | `cs-cav-hq` | not drawn | `cavalry_no_road` | arrival, positions, path, strength |
| `cs-anv-hq` | Army headquarters (Army of Northern Virginia) | `cs-cav-hq` | not drawn | `no_figure` | positions, path, strength |
<!-- /GEN:undrawn -->

### 3.7 Units not on the field

<!-- GEN:notonfield -->
| Unit | Name | Group | Status in the layer |
|---|---|---|---|
| `us-art-reserve-taft-1ctheavy-b` | 1st CT Heavy B (1st CT Heavy) | `us-hq-artres` | listed_not_on_field: a non-lead source for the absence is owed |
| `us-art-reserve-taft-1ctheavy-m` | 1st CT Heavy M (1st CT Heavy) | `us-hq-artres` | listed_not_on_field: a non-lead source for the absence is owed |
| `us-4nj-train-guard` | 4th NJ (Army of the Potomac) | `us-hq-artres` | listed_not_on_field: a non-lead source for the absence is owed |
| `us-3c-2d-carr-84pa` | 84th PA (Carr) | `us-3c-2d` | documented_absent |
| `us-5c-1d-sweitzer-32ma-co-c` | 32nd MA Company C (32nd MA) | `us-5c` | listed_not_on_field: a non-lead source for the absence is owed |
| `us-6c-2d-1brig` | 1st Brigade (2nd Div Howe) | `us-6c-1d-2d` | listed_not_on_field: a non-lead source for the absence is owed |
| `us-cav-2d-huey` | Huey's 2nd Brigade (2nd Div D. Gregg) | `us-cav-2d-3d-art` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-corse-hanover-junction` | Corse’s Brigade (Army of Northern Virginia) | `cs-1c-pickett` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-13va-winchester` | 13th VA (Army of Northern Virginia) | `cs-2c-early` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-58va-winchester` | 58th VA (Army of Northern Virginia) | `cs-2c-early` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-44nc-hanover-junction` | 44th NC (Army of Northern Virginia) | `cs-3c-heth` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-cav-robertson` | Robertson's Brigade (Robertson’s and Jones’s Brigades; Imboden) | `cs-cav-hq` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-cav-jones` | W. E. Jones's Brigade (Laurel Brigade) (Robertson’s and Jones’s Brigades; Imboden) | `cs-cav-hq` | listed_not_on_field: a non-lead source for the absence is owed |
| `cs-cav-imboden` | Imboden's command (Robertson’s and Jones’s Brigades; Imboden) | `cs-cav-hq` | listed_not_on_field: a non-lead source for the absence is owed |
<!-- /GEN:notonfield -->

A non-lead source for each absence is owed: the commander's report or the organization table's footnote. Documented absence needs two records of kind `absent` (different passages; one may be the table's footnote), at least one `documented` (the rule of `documented_absent`, DEC-023E, that the 84th Pennsylvania meets).

## 4. The research groups

A group is a part of the line of command a researcher can read through: the corps entry (where there is one), one to three divisions and their artillery, so that the same reports, the same state volumes and the same ground serve the whole group. Every unit of the roster is in exactly one group (checked by `build_groups.py --check`). The first draft put whole corps in single groups; the First, Second and Sixth Corps carried 2.3 times the average research load, so they were split at division boundaries, and the three smallest groups were merged into their neighbours (the XI Corps into one group; the Second and Third Cavalry Divisions with the horse artillery; Stuart's cavalry with Jenkins, the horse artillery and the army headquarters). The load is the number of missing words over the leaf units (a day without a place counts once, parent-only excluded): now 44 to 115, mean 73, against 27 to 169 in the first draft. 24 groups is the most the plan allows.

<!-- GEN:groups -->
| Group | Units | Leaf on field | Not drawn | At edge | Partly drawn | Formations | Not on field | Roster gaps | Figures drawn | Load |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `us-hq-artres` | 35 | 24 | 2 | 0 | 22 | 8 | 3 | 18 | 2,354 | 83 |
| `us-1c-1d-art` | 22 | 17 | 0 | 0 | 17 | 5 | 0 | 2 | 5,694 | 66 |
| `us-1c-2d-3d` | 28 | 21 | 0 | 0 | 21 | 7 | 0 | 4 | 6,468 | 78 |
| `us-2c-1d-art` | 30 | 23 | 0 | 0 | 23 | 7 | 0 | 2 | 5,152 | 79 |
| `us-2c-2d-3d` | 35 | 27 | 0 | 0 | 27 | 8 | 0 | 1 | 6,048 | 90 |
| `us-3c-1d` | 30 | 24 | 0 | 0 | 24 | 6 | 0 | 0 | 6,120 | 56 |
| `us-3c-2d` | 23 | 18 | 12 | 0 | 6 | 4 | 1 | 0 | 1,530 | 66 |
| `us-5c` | 54 | 39 | 1 | 0 | 39 | 13 | 1 | 3 | 10,920 | 115 |
| `us-6c-1d-2d` | 32 | 23 | 0 | 6 | 17 | 8 | 1 | 4 | 7,107 | 88 |
| `us-6c-3d-art` | 26 | 21 | 0 | 4 | 17 | 5 | 0 | 1 | 6,489 | 80 |
| `us-11c` | 42 | 31 | 14 | 0 | 17 | 11 | 0 | 2 | 5,032 | 103 |
| `us-12c` | 42 | 32 | 0 | 0 | 32 | 10 | 0 | 2 | 9,760 | 79 |
| `us-cav-1d` | 18 | 13 | 8 | 5 | 0 | 5 | 0 | 0 | 1,900 | 47 |
| `us-cav-2d-3d-art` | 25 | 18 | 9 | 0 | 9 | 6 | 1 | 16 | 3,420 | 63 |
| `cs-1c-mclaws` | 28 | 22 | 11 | 0 | 11 | 6 | 0 | 6 | 3,860 | 71 |
| `cs-1c-pickett` | 21 | 16 | 15 | 0 | 1 | 4 | 1 | 4 | 320 | 62 |
| `cs-1c-hood-resart` | 33 | 26 | 0 | 0 | 26 | 7 | 0 | 8 | 8,320 | 77 |
| `cs-2c-early` | 27 | 19 | 1 | 0 | 18 | 6 | 2 | 5 | 5,508 | 44 |
| `cs-2c-johnson` | 28 | 23 | 17 | 0 | 6 | 5 | 0 | 4 | 1,836 | 86 |
| `cs-2c-rodes-resart` | 32 | 25 | 2 | 0 | 23 | 7 | 0 | 12 | 7,198 | 55 |
| `cs-3c-anderson` | 29 | 22 | 0 | 0 | 22 | 7 | 0 | 3 | 6,908 | 70 |
| `cs-3c-heth` | 24 | 18 | 0 | 0 | 18 | 5 | 1 | 4 | 6,980 | 50 |
| `cs-3c-pender-resart` | 28 | 22 | 0 | 0 | 22 | 6 | 0 | 13 | 6,908 | 68 |
| `cs-cav-hq` | 34 | 23 | 17 | 6 | 0 | 8 | 3 | 11 | 1,740 | 85 |
| **24 groups** | **726** | **547** | **109** | **21** | **418** | **164** | **14** | **125** | **127,572** | **1,761** |
<!-- /GEN:groups -->

### 4.1 Where a group starts

1. Read the unit rows of the group in `groups.json`: `missing`, `why`, `detail` (the layer's own sentence on each missing word) and `claims_held` (what the five ledgers already hold for the unit). The ledgers are `history/positions/positions_{A,B,C,D,E}.jsonl` (A, C, D: OR27 reports; B: OR27 reports, II, III and XII Corps; E: the state regimental volumes); the claims of a unit are those with its `unit_id`. Do not repeat a ledger claim: a record of a group file adds what the ledgers lack, or corrects a claim (name it in `corroborates` or `conflicts_with`).
2. Read the group's formation rows first: a record of a brigade or division (a road, an arrival, a line) applies to every unit below it.
3. For each unit, search the reports in this order: its own report, its brigade's, its division's, its corps', the army's; then the state volumes and local texts listed for the group. Search with `tools/bt/or27_find.py`, `or27_where.py`, `or27_dump.py` and `statevol_find.py` (usage in 9.1).
4. Write records as you read, one line each; run the checker often; append the milestone line.

### 4.2 The groups

<!-- GEN:sections -->
### `us-hq-artres`: Union army headquarters, Hancock, the Artillery Reserve and its guards

- **Units:** 35 rows, 24 leaf units on the field: 2 not drawn, 22 partly drawn, 8 formation, 3 not on field. Missing (leaf units): path 24, strength 24, arrival 22, positions 13. Figures drawn now: 2,354.
- **Not drawn or at the edge, by reason:** `no_figure` 2.
- **What to find:** The two headquarters entries have a gate and no figure: who stood at headquarters (staff, the provost guard and orderlies of the table) is to be established before anything is drawn. 22 reserve batteries are placed; three consolidated batteries are drawn as two units each; Company C of the 32d Massachusetts and the 4th New Jersey train guard are listed as never on the field on a weak key while the table prints them with the Reserve; the footnote of the two Connecticut heavy batteries is lost in the OCR.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-aop-hq-93ny` (absent); `us-aop-hq-8us` (absent); `us-aop-hq-pacav-price` (add); `us-aop-hq-6pacav-e-i` (add); `us-aop-hq-regular-cav-det` (add); `us-aop-hq-signal` (add); `us-aop-hq-oneida-cav` (add); `us-aop-engineers-15ny` (absent); `us-aop-engineers-50ny` (absent); `us-aop-engineers-usbn` (absent); `us-aop-engineers` (absent); `us-5c-1d-sweitzer-32ma-co-c` (status); `us-4nj-train-guard` (status); `us-art-reserve-ransom-3usfk` (merge); `us-art-reserve-mcgilvery-pacf` (merge); `us-art-reserve-huntington-1pafg` (merge); `us-art-reserve-mcgilvery-10ny` (attached); `us-art-reserve-taft-1ctheavy-b` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (8), R007 (6), R009 (3), R016 (1), R017 (11), R024 (3), R028 (10), R030 (1), R187 (1), R189 (1), R217 (1), R218 (1), R243 (1), R315 (28), R316 (3), R317 (4), R318 (9), R319 (6), R320 (8), R321 (3), R322 (4), R323 (4), R324 (1), R325 (4), R326 (5), R327 (3), R328 (4), R329 (1), R330 (5), R331 (4), R332 (2), R333 (1), R334 (5), R335 (3).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R018 Capt. WUliam J. L. Nicodemus, R019 Capt. Nahum Daniels, R020 Capt. Wmiam G. McCreary, R021 Lieut. George A. Fisher, R022 Lieut. Ephraim A- Briggs, R023 Lieut. Julius M. Swain, R025 Brig. Gen. Marsena E. Patric, R026 Lieut. John R. Edie, R027 Brig. (Jen. Henry W. Benham.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0925 (1), D0982 (1), D1001 (1), D1003 (2), D1120 (1), D1207 (1), D2099 (1), D2102 (1).
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `MEADE-LL-v1`, `MEADE-LL-v2`, `BACH-STORY-1904`, `BACH-REPULSE-1870`, `BACH-KEY-1864`, `JACOBS-1864`, `FOX`, `BL3`, `NJ-FINAL-1891`, `NJ-TOOMBS-1888`, `OH-DED-1887`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 1, ledger C 168, ledger E 1.

### `us-1c-1d-art`: Union I Corps: corps entry, Wadsworth's division (Meredith, Cutler) and the artillery brigade (Wainwright)

- **Units:** 22 rows, 17 leaf units on the field: 17 partly drawn, 5 formation. Missing (leaf units): arrival 17, positions 17, strength 17, path 15. Figures drawn now: 5,694.
- **What to find:** All 17 leaf units are placed (the corps-level road only, AP-01). Open: an arrival of each regiment's own and of each battery, the places of 2 and 3 July, strengths, the road of each brigade on 1 July, Battery E attached to Battery L, the headquarters company (First Maine Cavalry, Company L).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-1c-hq-1mecav-l` (add); `us-1c-art-1nye` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R007 (4), R028 (2), R029 (17), R030 (7), R032 (6), R033 (9), R034 (6), R035 (7), R036 (7), R037 (15), R038 (5), R039 (3), R040 (5), R041 (3), R042 (3), R071 (16), R072 (5), R073 (3), R074 (5), R075 (6), R243 (4), R337 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R031 Lieut. Joseph G. Eosengarten.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0920 (1), D0922 (1), D0970 (1).
- **Indexed state volumes:** 6 units have regimental sections in MI 1, NY1 5, NY2 2, NY3 4, PA1 1, PA1B 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `IN-1913`, `FOX`, `BL3`, `BACH-STORY-1904`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 143.

### `us-1c-2d-3d`: Union I Corps: Robinson's division (Paul, Baxter) and Doubleday/Rowley's division (Rowley/Biddle, Stone, Stannard)

- **Units:** 28 rows, 21 leaf units on the field: 21 partly drawn, 7 formation. Missing (leaf units): arrival 21, path 21, strength 21, positions 15. Figures drawn now: 6,468.
- **What to find:** All 21 leaf units are placed (the corps-level road only, AP-01). Open: an arrival of each regiment's own, the places of 2 and 3 July, strengths, the transfer of the 11th Pennsylvania to the First Brigade on the afternoon of 1 July, the 12th and 15th Vermont (train guard, not engaged by the table's footnote), Stannard's brigade on 2 and 3 July.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-1c-3d-stannard-12vt` (absent); `us-1c-3d-stannard-15vt` (absent); `us-1c-3d-stannard` (absent); `us-1c-2d-baxter-11pa` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R007 (1), R029 (14), R030 (7), R043 (11), R044 (14), R045 (8), R046 (9), R047 (5), R048 (8), R049 (5), R050 (1), R051 (7), R052 (17), R053 (4), R054 (5), R055 (8), R056 (7), R057 (19), R058 (4), R059 (5), R060 (8), R061 (6), R062 (10), R063 (8), R064 (6), R065 (6), R066 (5), R067 (3), R068 (4), R069 (13), R070 (9), R071 (1).
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`.
- **Indexed state volumes:** 16 units have regimental sections in ME 3, NY1 6, NY2 3, NY3 5, PA1 4, PA1B 4, PA2 6 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `VT-GB-1914`, `VT-MON-1890`, `FOX`, `BL3`, `BACH-STORY-1904`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 241.

### `us-2c-1d-art`: Union II Corps: corps entry, Caldwell's division and the artillery brigade (Hazard)

- **Units:** 30 rows, 23 leaf units on the field: 23 partly drawn, 7 formation. Missing (leaf units): arrival 23, path 23, strength 23, positions 10. Figures drawn now: 5,152.
- **What to find:** All 23 leaf units are placed by the corps-level road (AP-33, a position statement read as the road). Open: an arrival of each regiment's own and of each battery, the days without a place, strengths, the headquarters company (Sixth New York Cavalry, Companies D and K), the 14th New York Battery attached to Battery B, 1st New York Light.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-2c-hq-6nycav-d-k` (add); `us-2c-art-14ny` (attached).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (1), R028 (3), R076 (28), R077 (12), R078 (12), R079 (4), R080 (6), R081 (1), R082 (12), R083 (6), R084 (4), R085 (6), R086 (7), R087 (8), R088 (9), R089 (5), R090 (4), R091 (6), R092 (15), R093 (10), R094 (9), R095 (9), R096 (6), R097 (2), R098 (3), R104 (2), R132 (13).
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0839 (1), D0840 (1), D0919 (1), D0932 (1), D0962 (1), D0966 (1), D0967 (1), D0983 (1), D1099 (1), D1115 (1), D2099 (1), D2103 (1).
- **Indexed state volumes:** 14 units have regimental sections in NY1 7, NY2 4, NY3 8, PA1 2, PA1B 1, PA2 4 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `MN-1ST-1916`, `OH-8TH-1889`, `NJ-TOOMBS-1888`, `IN-1913`, `BACH-STORY-1904`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger B 219.

### `us-2c-2d-3d`: Union II Corps: Gibbon/Harrow's division (Harrow, Webb, Hall) and A. Hays' division (Carroll, Smyth, Willard)

- **Units:** 35 rows, 27 leaf units on the field: 27 partly drawn, 8 formation. Missing (leaf units): arrival 27, strength 27, positions 22, path 14. Figures drawn now: 6,048.
- **What to find:** All 27 leaf units are placed by the corps-level road (AP-33, a position statement read as the road). Open: an arrival of each regiment's own, the days without a place, strengths, the Minnesota sharpshooter company attached to the 1st Minnesota.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-2c-2d-harrow-mnss-co` (attached).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (1), R076 (20), R098 (12), R099 (12), R100 (3), R101 (6), R102 (4), R103 (3), R104 (12), R105 (3), R106 (3), R107 (3), R108 (5), R109 (15), R110 (7), R111 (3), R112 (6), R113 (3), R114 (3), R115 (14), R116 (8), R117 (3), R119 (7), R120 (3), R122 (2), R123 (8), R124 (3), R125 (4), R126 (4), R127 (2), R128 (9), R129 (2), R130 (5), R131 (4), R243 (3).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R118 Capt. Nathan WUlard, R121 Capt. Alfred T. Craig.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D2103 (1).
- **Indexed state volumes:** 14 units have regimental sections in ME 6, MI 1, NY1 11, NY2 4, NY3 8, PA1 4, PA1B 4 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `HASKELL-1908`, `MN-1ST-1916`, `OH-8TH-1889`, `OH-DED-1887`, `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `BACH-REPULSE-1870`, `BACH-STORY-1904`, `FOX`, `BL3`, `IN-1913`.
- **Ledger claims already held** (read them first; do not repeat them): ledger B 207.

### `us-3c-1d`: Union III Corps: corps entry, Birney's division and the artillery brigade

- **Units:** 30 rows, 24 leaf units on the field: 24 partly drawn, 6 formation. Missing (leaf units): strength 24, arrival 23, path 5, positions 4. Figures drawn now: 6,120.
- **What to find:** All 24 leaf units are placed (Emmitsburg Road, AP-02). Open: an arrival of each regiment's own (Graham and Ward on 1 July, de Trobriand on 2 July), the places of 3 July, strengths.
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (4), R007 (6), R017 (2), R028 (9), R029 (1), R030 (2), R076 (5), R098 (2), R109 (1), R133 (32), R134 (3), R135 (15), R136 (7), R137 (7), R138 (9), R139 (14), R140 (9), R141 (6), R142 (7), R143 (11), R144 (4), R145 (3), R146 (11), R147 (3), R148 (11), R149 (17), R150 (10), R151 (8), R152 (18), R153 (9), R154 (12), R155 (7), R156 (11), R157 (7), R158 (6), R165 (1), R181 (39), R182 (7), R183 (8), R184 (7), R185 (5), R186 (7), R187 (2), R243 (3), R293 (1), R318 (1), R331 (1), R334 (1), R336 (1), R337 (1), R339 (1).
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0840 (1), D0889 (1), D0895 (1), D0919 (2), D0924 (1), D0925 (1), D0926 (1), D0931 (1), D0935 (1), D0936 (3), D0960 (1), D0966 (1), D0972 (2), D0973 (2), D0974 (1), D0978 (1), D0980 (1), D0982 (1), D0984 (1), D1093 (1), D1099 (2), D1105 (1), D1107 (1), D1110 (1), D1116 (1), D1154 (1), D1157 (1), D1159 (1), D1162 (1), D1165 (1), D1168 (1), D1170 (1), D1171 (1), D1224 (2), D2101 (1).
- **Indexed state volumes:** 16 units have regimental sections in ME 8, MI 2, NY1 7, NY2 1, NY3 3, PA1 4, PA1B 4, PA2 2 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `IN-1913`, `FOX`, `BL3`, `NJ-FINAL-1891`, `NJ-TOOMBS-1888`.
- **Ledger claims already held** (read them first; do not repeat them): ledger B 422.

### `us-3c-2d`: Union III Corps: Humphreys' division (Carr, Brewster, Burling)

- **Units:** 23 rows, 18 leaf units on the field: 12 not drawn, 6 partly drawn, 4 formation, 1 not on field. Missing (leaf units): arrival 18, positions 18, strength 18, path 12. Figures drawn now: 1,530.
- **Not drawn or at the edge, by reason:** `road_outside_ground` 12.
- **What to find:** 12 regiments of Carr and Brewster are not drawn: the only road printed for the division (Black Horse Tavern road, AP-07) lies outside the loaded ground. To find: the road by which the division came ONTO the ground after its counter-march (Humphreys OR27-1-R158; delegated default C-002: bivouac at 1 a. m. on 2 July), the bivouac, the line of 2 July and its changes, 3 July. The 84th Pennsylvania is documented absent (EG-E-84PA). Burling's six regiments are placed.
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R009 (2), R133 (2), R158 (44), R160 (23), R161 (12), R162 (10), R163 (11), R164 (7), R165 (3), R166 (2), R167 (5), R168 (5), R169 (21), R170 (9), R171 (2), R172 (12), R173 (3), R174 (21), R175 (4), R176 (7), R177 (5), R178 (3).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R159 Brig. Gen. Heiuy Prince, R179 Brig. Gen. Washington L. EUi, R180 Col. Benjamin F. Smith.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`.
- **Indexed state volumes:** 9 units have regimental sections in NY1 7, NY2 6, NY3 3, PA1 2, PA1B 2, PA2 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger B 221, ledger E 22.

### `us-5c`: Union V Corps (Barnes, Ayres, Crawford, Martin)

- **Units:** 54 rows, 39 leaf units on the field: 1 not drawn, 39 partly drawn, 13 formation, 1 not on field. Missing (leaf units): arrival 40, strength 40, path 25, positions 10. Figures drawn now: 10,920.
- **Not drawn or at the edge, by reason:** `roster_structure` 1.
- **What to find:** 39 leaf units are placed, 24 of them by a MODELLED road (Hanover Road, sibling rule DEC-015, register EG-0070): the road of each division is to be documented or the modelled one confirmed. The 32d Massachusetts is not drawn at all: the roster holds it as a formation whose only child is Company C (headquarters guard of the Artillery Reserve). Open: arrivals, the days without a place, strengths, the headquarters companies.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-5c-hq-12ny-d-e` (add); `us-5c-hq-17pacav-d-h` (add); `us-5c-1d-sweitzer-32ma` (fix).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (3), R007 (4), R028 (1), R187 (18), R189 (17), R190 (2), R192 (10), R193 (14), R195 (15), R196 (13), R197 (1), R198 (5), R200 (3), R201 (5), R202 (1), R203 (14), R204 (2), R205 (5), R206 (7), R207 (2), R208 (5), R210 (4), R211 (8), R212 (3), R213 (2), R214 (2), R215 (2), R216 (2), R217 (9), R218 (13), R219 (10), R220 (7), R221 (11), R222 (4), R315 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R188 Capt. James A. Bates, R191 Lieut. Joseph C. Ayer, R194 Col. Strong Vincent, R199 Maj. Robert T. Elliott, R209 Capt. W. Harvey Brown.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0919 (1), D0935 (2), D0983 (1), D1001 (3), D1041 (2), D1090 (1), D1091 (1), D1122 (1), D1160 (1), D1168 (1), D1173 (1), D2099 (1).
- **Indexed state volumes:** 13 units have regimental sections in ME 4, MI 3, NY1 4, NY3 4, PA1 4, PA1B 3, PA2 2 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `FOX`, `BL3`, `OH-DED-1887`.
- **Ledger claims already held** (read them first; do not repeat them): ledger C 241.

### `us-6c-1d-2d`: Union VI Corps: corps entry, Wright's division (Torbert, Bartlett/Upton, Russell) and Howe's division (Grant, Neill)

- **Units:** 32 rows, 23 leaf units on the field: 6 edge only, 17 partly drawn, 8 formation, 1 not on field. Missing (leaf units): arrival 23, path 23, strength 23, parent_only 20, positions 19. Figures drawn now: 7,107.
- **Not drawn or at the edge, by reason:** `no_place_after_arrival` 6.
- **What to find:** 17 leaf units are placed by the corps-level road (Baltimore Pike, AP-12); the 6 regiments of Neill's brigade wait at the edge of the ground with no place after arrival. Open: where each brigade was sent on the evening of 2 July and on 3 July, an arrival of each brigade's own, strengths, the provost guard (4th New Jersey, three companies) and the headquarters companies; the table says the Second Division had no First Brigade.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-6c-hq-1njcav-l` (add); `us-6c-hq-1pacav-h` (add); `us-6c-1d-provost-4nj` (add); `us-6c-2d` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (1), R007 (2), R009 (1), R223 (5), R224 (14), R225 (7), R226 (5), R227 (4), R228 (5), R229 (4), R230 (4), R231 (6).
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0976 (1), D0983 (1), D0985 (1), D1003 (1), D2099 (1).
- **Indexed state volumes:** 11 units have regimental sections in ME 6, NY1 3, NY3 3, PA1 4, PA1B 3, PA2 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `VT-GB-1914`, `VT-MON-1890`, `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger C 63.

### `us-6c-3d-art`: Union VI Corps: Newton/Wheaton's division (Shaler, Eustis, Wheaton/Nevin) and the artillery brigade (Tompkins)

- **Units:** 26 rows, 21 leaf units on the field: 4 edge only, 17 partly drawn, 5 formation. Missing (leaf units): arrival 21, path 21, strength 21, positions 17. Figures drawn now: 6,489.
- **Not drawn or at the edge, by reason:** `no_place_after_arrival` 4.
- **What to find:** 17 leaf units are placed by the corps-level road (Baltimore Pike, AP-12); the 4 regiments of Wheaton/Nevin's brigade wait at the edge of the ground with no place after arrival. Open: where each brigade and each battery was sent on the evening of 2 July and on 3 July, an arrival of each brigade's own, strengths, the 102d Pennsylvania (train guard).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-6c-3d-wheaton-102pa` (absent).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R009 (1), R030 (1), R133 (1), R223 (5), R232 (12), R233 (3), R234 (12), R235 (2), R236 (1), R237 (2), R238 (2), R239 (5), R240 (2), R241 (2), R242 (4), R293 (1), R303 (1).
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`.
- **Indexed state volumes:** 9 units have regimental sections in NY1 1, NY2 2, NY3 2, PA1 3, PA1B 3, PA2 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `VT-GB-1914`, `VT-MON-1890`, `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger C 66.

### `us-11c`: Union XI Corps: corps entry, Barlow/Ames', von Steinwehr's and Schurz's divisions and the artillery brigade (Osborn)

- **Units:** 42 rows, 31 leaf units on the field: 14 not drawn, 17 partly drawn, 11 formation. Missing (leaf units): arrival 31, strength 31, positions 27, path 14. Figures drawn now: 5,032.
- **Not drawn or at the edge, by reason:** `route_unplaceable` 14.
- **What to find:** 17 leaf units are placed (Emmitsburg Road: AP-10 for the First Division, AP-42 for the Second Division, which rests on one inferred claim of a state volume with a conflicting claim listed, AP-43 for Wiedrich's battery). 10 regiments of Schurz's division and 4 batteries are not drawn: Howard's order names only the road past Horner's Mills (concordance RC-07, unresolved) and ledger E a route through the town. To find: the road by which the division and each battery entered the loaded ground (the Taneytown road or the Emmitsburg road must be PRINTED for them, not assumed), the hour, the lines north of the town on 1 July, the retreat, Cemetery Hill on 2 and 3 July. Open for all: arrivals of their own, the places of 2 and 3 July, strengths, the headquarters companies.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-11c-hq-1incav-i-k` (add); `us-11c-hq-8ny-co` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R007 (3), R028 (1), R243 (23), R244 (3), R245 (8), R246 (5), R247 (6), R248 (3), R249 (3), R250 (11), R251 (6), R252 (4), R253 (19), R255 (1), R256 (5), R258 (3), R259 (5), R260 (5), R261 (1), R262 (4), R263 (2), R264 (10), R265 (4), R266 (6), R267 (3), R268 (2), R269 (6), R270 (2).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R254 Brig. Gen. Hector Tyndale, R257 Col. Horace Boughton.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0923 (1), D0959 (2), D0960 (1).
- **Indexed state volumes:** 15 units have regimental sections in NY1 18, NY2 4, NY3 13, PA1 2, PA1B 4, PA2 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `OH-DED-1887`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 164, ledger E 100.

### `us-12c`: Union XII Corps (Williams/Ruger, Geary, Lockwood, Muhlenberg)

- **Units:** 42 rows, 32 leaf units on the field: 32 partly drawn, 10 formation. Missing (leaf units): arrival 32, strength 32, positions 9, path 6. Figures drawn now: 9,760.
- **What to find:** All 32 leaf units are placed. Open: arrivals of their own, the days without a place, strengths, the provost guard (10th Maine), the status of Lockwood's brigade (unassigned during the battle by the table).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-12c-provost-10me` (add); `us-12c-1d-lockwood` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R001 (2), R006 (14), R007 (5), R009 (2), R028 (12), R030 (1), R037 (1), R043 (1), R052 (1), R076 (6), R077 (1), R098 (1), R211 (1), R231 (1), R256 (1), R258 (1), R264 (1), R271 (29), R272 (50), R273 (29), R274 (31), R275 (35), R276 (18), R278 (13), R279 (12), R280 (13), R281 (7), R282 (13), R283 (11), R284 (4), R285 (11), R286 (29), R287 (13), R288 (14), R289 (14), R290 (13), R292 (9), R293 (67), R294 (28), R295 (10), R296 (14), R297 (8), R298 (7), R299 (2), R300 (5), R301 (6), R302 (9), R303 (16), R304 (17), R305 (8), R306 (9), R307 (28), R308 (9), R309 (4), R310 (11), R311 (8), R312 (12), R313 (10), R314 (38), R315 (1), R332 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R002 Brig. Gen. Hermann Haupt, R003 Medical Inspector John M. Cu, R004 Medical Inspector Edward P., R005 Maj. Gen. Joseph Hooker, R277 Col. Joseph M. Sudsburg, R291 Lieut. Col. Martin Flood.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0673 (1), D0746 (1), D0779 (2), D0803 (1), D0804 (1), D0814 (4), D0839 (1), D0840 (2), D0884 (1), D0886 (1), D0895 (1), D0919 (2), D0925 (1), D0962 (1), D0967 (1), D0968 (1), D0975 (1), D0979 (2), D0981 (1), D0983 (1), D1002 (2), D1008 (1), D1016 (1), D1034 (1), D1035 (1), D1040 (1), D1044 (1), D1095 (1), D1099 (1), D1103 (1), D1115 (2).
- **Indexed state volumes:** 14 units have regimental sections in NY1 9, NY2 3, NY3 12, PA1 4, PA1B 3, PA2 1 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `OH-DED-1887`, `IN-1913`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger B 795.

### `us-cav-1d`: Union cavalry: corps entry and Buford's division (Gamble, Devin, Merritt)

- **Units:** 18 rows, 13 leaf units on the field: 8 not drawn, 5 edge only, 5 formation. Missing (leaf units): arrival 13, positions 13, strength 13, path 8. Figures drawn now: 1,900.
- **Not drawn or at the edge, by reason:** `route_unplaceable` 8, `no_place_after_arrival` 5.
- **What to find:** Gamble's and Devin's 8 regiments are not drawn (ledger E prints the approach as via Boonsboro and Fairfield, the Fairfield road; RC-08 cannot place it); Merritt's 5 regiments wait at the edge on the Emmitsburg Road (AP-05). The division is the first on the field (gate 30 June 11:00): to find its road into Gettysburg on 30 June, the camps and vedette lines of that night, the lines of 1 July hour by hour, its withdrawal on 2 July (departure), Merritt's arrival and line on 3 July; the 6th United States on 3 July. Riders, horses and dismounted lines are read by the cavalry model once a regiment is placed.
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R007 (8), R337 (15), R338 (6), R339 (9), R340 (7), R343 (1), R359 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R341 Capt. Julius W. Mason, R342 Capt. G«orge C. Cram.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D1020 (1), D1021 (1).
- **Indexed state volumes:** 5 units have regimental sections in NY1 3, NY3 8, PA2 2 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `IN-1913`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 56, ledger E 18.

### `us-cav-2d-3d-art`: Union cavalry: D. Gregg's division (McIntosh, J. I. Gregg), Kilpatrick's division (Farnsworth, Custer) and the horse artillery

- **Units:** 25 rows, 18 leaf units on the field: 9 not drawn, 9 partly drawn, 6 formation, 1 not on field. Missing (leaf units): arrival 18, positions 18, strength 18, path 9. Figures drawn now: 3,420.
- **Not drawn or at the edge, by reason:** `sibling_roads_differ` 9.
- **What to find:** Gregg's 9 regiments are placed (Hanover Road). 8 regiments of Kilpatrick's division are not drawn: the documented siblings of the corps name different roads and ledger E gives the division an approach from the east by Hunterstown and Two Taverns with different continuations per brigade (none chosen). To find, per brigade: the road and hour onto the loaded ground on 2 and 3 July, Hunterstown (2 July, outside the ground: state it), Custer on the Hanover road and the East Cavalry Field on 3 July, Farnsworth south of the Round Tops on 3 July. The horse artillery is one roster entry that is not drawn: its 9 batteries are not in the roster (ids pre-assigned in roster-gaps.json); each needs the division it served with, its road, its positions and its strength. Also: the 1st Massachusetts (with the Sixth Corps by the table), the Purnell Legion company, Rank's section, the headquarters guards, Huey's brigade (a non-lead source for its absence).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `us-cav-2d-hq-1oh-a` (add); `us-cav-2d-mcintosh-purnell-a` (add); `us-cav-2d-mcintosh-3paheavy-h` (add); `us-cav-2d-mcintosh-1ma` (status); `us-cav-2d-huey` (status); `us-cav-3d-hq-1oh-c` (add); `us-cav-art-9mi` (add); `us-cav-art-6ny` (add); `us-cav-art-2usbl` (add); `us-cav-art-2usm` (add); `us-cav-art-4use` (add); `us-cav-art-1useg` (add); `us-cav-art-1usk` (add); `us-cav-art-2usa` (add); `us-cav-art-3usc` (absent); `us-cav-art` (absent).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R007 (6), R029 (1), R336 (5), R338 (1), R344 (11), R348 (1), R352 (3), R355 (7), R357 (1), R359 (14), R361 (8), R362 (2), R363 (2), R364 (2), R365 (2), R367 (3), R368 (1), R369 (1), R372 (1), R374 (3).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R345 Col. Alfred N. Duffle, R346 Capt. Frank Allen, R347 Col. Percy Wyndham, R349 Maj. Hugh H. Janeway, R350 Col. Jojm P. Taylor, R351 Maj. Oliver O. G. Robinson, R353 Lieut. Col. Lieut, R354 Capt. William A. Corrie, R356 Col. Charles H. Smith, R358 Lieut. Col. William E. Doste, R360 Lieut. Col. Henry E. Davies, R366 Col. Edward B. Sawyer, R370 Capt. Joseph W. Martin, R371 Lieut. J. Wade Wilson, R373 Capt. WiUiam M. Graham, R375 Lieut. WiUiam D. Fuller, R376 Col. James B. Swain, R377 Col. Henry L. Abbot, R378 Col. Charles R. LoweU.
- **Other Official Records:** organization table `OR27-1-R009`, returns `OR27-1-R008`, `OR27-1-R013`, part 3 documents cited by claims: D0986 (1), D0988 (1), D1019 (1), D1044 (1).
- **Indexed state volumes:** 7 units have regimental sections in ME 1, NY1 2, NY3 5, PA2 4 (section ids in groups.json, `sources.statevol_sections`).
- **Local texts to read** (keys in sources.json): `NJ-TOOMBS-1888`, `NJ-FINAL-1891`, `VT-GB-1914`, `VT-MON-1890`, `FOX`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger A 83, ledger E 36.

### `cs-1c-mclaws`: Confederate First Corps: corps entries and McLaws' division (Kershaw, Barksdale, Semmes, Wofford, Cabell)

- **Units:** 28 rows, 22 leaf units on the field: 11 not drawn, 11 partly drawn, 6 formation. Missing (leaf units): strength 22, arrival 21, parent_only 16, path 16, positions 12. Figures drawn now: 3,860.
- **Not drawn or at the edge, by reason:** `no_single_day_label` 10, `no_figure` 1.
- **What to find:** Semmes' 4 and Wofford's 6 units are not drawn: a sibling road exists (Chambersburg Pike, on Kershaw's report) but they have no single-label day position. The table says no reports are on file for Semmes' brigade; the index holds no report of McLaws, Barksdale, Semmes or Wofford. To find: the march of 2 July and its counter-march, the line before the attack, the advance, the night line, 3 July; the four batteries of Cabell's battalion (reports R435 to R440); the basis of the sixth unit the roster lists under Wofford. The roster entry cs-1c-art (I Corps artillery) is a ledger grouping of the batteries that the roster files under the divisions and the Reserve (no figure, no children): a `unit` record (action status) says whether it names a unit of its own.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-1c-mclaws-cabell-1ncarta` (add); `cs-1c-mclaws-cabell-pulaskiga` (add); `cs-1c-mclaws-cabell-1richmondhowitzers` (add); `cs-1c-mclaws-cabell-troupga` (add); `cs-1c-mclaws-wofford-3gasharpshooters` (status); `cs-1c-mclaws-semmes` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R029 (1), R076 (1), R109 (1), R430 (16), R432 (18), R433 (5), R434 (2), R435 (8), R436 (2), R437 (3), R438 (1), R439 (1), R440 (3), R448 (1), R451 (1), R537 (1), R565 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R431 Surg. F. W. Patterson.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `ALEXANDER-1907`, `LONGSTREET-1896`, `FREMANTLE-1864`, `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 67, ledger E 4.

### `cs-1c-pickett`: Confederate First Corps: Pickett's division (Garnett, Kemper, Armistead, Dearing)

- **Units:** 21 rows, 16 leaf units on the field: 15 not drawn, 1 partly drawn, 4 formation, 1 not on field. Missing (leaf units): path 16, strength 16, arrival 15, positions 15, parent_only 15. Figures drawn now: 320.
- **Not drawn or at the edge, by reason:** `no_single_day_label` 15.
- **What to find:** 15 regiments are not drawn: a sibling road exists but sheet 3 prints several labels the line states do not order. The index holds only Peyton's report for Garnett's brigade (R441) and Dearing's (R442); no report of Pickett, Kemper or Armistead. To find: the arrival on the afternoon of 2 July and the bivouac, the march to the field on 3 July, the line behind the guns, the order of regiments in each brigade, the advance and its stages, the return; Dearing's four batteries; Corse's brigade (a non-lead source for its absence).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-1c-pickett-dearing-fauquier` (add); `cs-1c-pickett-dearing-hampden` (add); `cs-1c-pickett-dearing-richmondfayette` (add); `cs-1c-pickett-dearing-blount` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R006 (1), R104 (1), R109 (1), R426 (2), R430 (3), R441 (7), R442 (8).
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`, part 3 documents cited by claims: D1834 (1), D1841 (1), D1842 (1), D1847 (1).
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `ALEXANDER-1907`, `LONGSTREET-1896`, `FREMANTLE-1864`, `SHSP-04`, `SHSP-05`, `SHSP-06`, `SHSP-12`, `BACH-REPULSE-1870`, `BACH-STORY-1904`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 27, ledger E 3.

### `cs-1c-hood-resart`: Confederate First Corps: Hood's division (Law, Robertson, Anderson, Benning, Henry) and the corps reserve artillery (Alexander, Washington Artillery)

- **Units:** 33 rows, 26 leaf units on the field: 26 partly drawn, 7 formation. Missing (leaf units): path 26, strength 26, arrival 25, parent_only 8. Figures drawn now: 8,320.
- **What to find:** All 26 leaf units are placed by a MODELLED road (Chambersburg Pike, sibling rule DEC-015, register EG-0070: AP-50 for the 19 units of Hood's division, AP-51 for the 7 of the Reserve artillery). Open: Law's separate march from New Guilford, the road of each brigade documented, the places of 3 July, the four batteries of Henry's battalion and the four companies of the Washington Artillery (not in the roster), strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-1c-hood-henry-branchnc` (add); `cs-1c-hood-henry-germansc` (add); `cs-1c-hood-henry-palmettosc` (add); `cs-1c-hood-henry-rowannc` (add); `cs-1c-res-art-washington-1co` (add); `cs-1c-res-art-washington-2co` (add); `cs-1c-res-art-washington-3co` (add); `cs-1c-res-art-washington-4co` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R430 (5), R432 (1), R443 (4), R444 (1), R445 (2), R446 (1), R447 (4), R448 (3), R449 (3), R450 (2), R451 (1), R452 (5), R453 (1), R454 (2), R455 (2), R456 (1), R457 (1), R458 (6), R459 (3), R460 (3), R461 (2), R462 (3), R463 (5), R464 (5), R465 (2), R466 (6).
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `ALEXANDER-1907`, `LONGSTREET-1896`, `FREMANTLE-1864`, `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 75.

### `cs-2c-early`: Confederate Second Corps: corps entry, Early's division (Hays, Smith, Hoke/Avery, Gordon, Jones' battalion, 35th Virginia Cavalry Battalion)

- **Units:** 27 rows, 19 leaf units on the field: 1 not drawn, 18 partly drawn, 6 formation, 2 not on field. Missing (leaf units): arrival 19, strength 19, parent_only 15, positions 5, path 1. Figures drawn now: 5,508.
- **Not drawn or at the edge, by reason:** `reports_disagree` 1.
- **What to find:** 18 units are placed (Harrisburg Road = the Heidlersburg road, RC-01). Jones' artillery battalion is not drawn: Brown prints the York road for it, Early the Heidlersburg road (approach block): both stay as scenarios unless a battery report settles it. Also: the four batteries, the corps escort (Randolph's company), the 13th and 58th Virginia (a non-lead source for Winchester), the places of 2 and 3 July, strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-2c-escort-randolph` (add); `cs-2c-early-jones-charlottesville` (add); `cs-2c-early-jones-courtney` (add); `cs-2c-early-jones-louisianaguard` (add); `cs-2c-early-jones-staunton` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R426 (2), R467 (10), R468 (1), R470 (15), R472 (5), R473 (3), R474 (1), R475 (1), R476 (5), R477 (4), R478 (1), R479 (2), R480 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R469 Lieut. John M. Gregory.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`, part 3 documents cited by claims: D1839 (1).
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 52.

### `cs-2c-johnson`: Confederate Second Corps: Johnson's division (Steuart, Stonewall, Nicholls/Williams, J. M. Jones, Latimer)

- **Units:** 28 rows, 23 leaf units on the field: 17 not drawn, 6 partly drawn, 5 formation. Missing (leaf units): arrival 23, positions 23, strength 23, path 17, parent_only 12. Figures drawn now: 1,836.
- **Not drawn or at the edge, by reason:** `route_unplaceable` 17.
- **What to find:** 17 regiments of Steuart, the Stonewall Brigade and Jones are not drawn: the reports print the road from Scotland, which the repository cannot place. To find: the road by which the division entered the loaded ground on the evening of 1 July (printed, not assumed), its passage of the town and the railroad, the line east of Rock Creek, the attacks of 2 and 3 July per brigade, the Stonewall Brigade on Brinkerhoff's Ridge, the withdrawal. Nicholls' five regiments and the artillery battalion are placed; the four batteries are not in the roster.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-2c-johnson-andrews-1mdbattery` (add); `cs-2c-johnson-andrews-alleghany` (add); `cs-2c-johnson-andrews-chesapeake` (add); `cs-2c-johnson-andrews-lee` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R426 (3), R430 (1), R467 (1), R481 (5), R482 (3), R483 (2), R488 (2), R489 (1), R492 (1), R493 (1), R494 (1), R495 (2), R496 (2), R498 (1), R500 (1), R501 (1), R502 (1), R503 (1), R505 (2).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R484 Capt. E. D. Willett, R485 Maj. Thomas N. Powell, R486 Lieut. Col. D. Zable, R487 Maj. A. Brady, R490 Maj. William Terry, R491 Maj. James W. Newton, R497 Col. Bradley T. Johnson, R499 Lieut. Col. J. A. Robinson, R504 Maj. J. "W. Latimer.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 32, ledger E 3.

### `cs-2c-rodes-resart`: Confederate Second Corps: Rodes' division (Daniel, Doles, Iverson, Ramseur, O'Neal, Carter) and the corps reserve artillery (Dance, Nelson)

- **Units:** 32 rows, 25 leaf units on the field: 2 not drawn, 23 partly drawn, 7 formation. Missing (leaf units): arrival 25, strength 25, parent_only 5, positions 3, path 2. Figures drawn now: 7,198.
- **Not drawn or at the edge, by reason:** `sibling_roads_differ` 2.
- **What to find:** Rodes' 23 units are placed (Carlisle Road = the Middletown road, RC-02). Dance's and Nelson's battalions are not drawn (the documented siblings of the corps name different roads): Brown's report (R468) and the battery reports are to give the road and the positions of each. Open: the places of 2 and 3 July, the batteries of the three battalions (not in the roster), strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-2c-rodes-carter-jeffdavisal` (add); `cs-2c-rodes-carter-kingwilliam` (add); `cs-2c-rodes-carter-morris` (add); `cs-2c-rodes-carter-orange` (add); `cs-2c-res-art-1vaartbn-2richmondhowitzers` (add); `cs-2c-res-art-1vaartbn-3richmondhowitzers` (add); `cs-2c-res-art-1vaartbn-powhatan` (add); `cs-2c-res-art-1vaartbn-rockbridge` (add); `cs-2c-res-art-1vaartbn-salem` (add); `cs-2c-res-art-nelson-amherst` (add); `cs-2c-res-art-nelson-fluvanna` (add); `cs-2c-res-art-nelson-milledge` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R426 (2), R467 (2), R506 (8), R507 (3), R508 (1), R509 (1), R510 (1), R511 (1), R512 (1), R513 (3), R514 (2), R515 (2), R516 (1), R517 (2), R518 (2), R519 (1), R520 (1), R521 (1), R522 (1), R523 (2), R525 (1), R526 (1), R527 (1), R528 (1), R529 (1), R530 (1), R531 (2), R532 (1), R533 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R524 Lieut. Col. C. Forsyth.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 48, ledger E 1.

### `cs-3c-anderson`: Confederate Third Corps: corps entry and R. H. Anderson's division (Wilcox, Mahone, Wright, Perry/Lang, Posey, Sumter battalion)

- **Units:** 29 rows, 22 leaf units on the field: 22 partly drawn, 7 formation. Missing (leaf units): arrival 22, strength 22, parent_only 16, positions 13, path 13. Figures drawn now: 6,908.
- **What to find:** All 22 leaf units are placed on the Chambersburg Pike: 13 by the corps-level road (AP-31), Wilcox's 5 and Wright's 4 by the roads printed for their own brigades (AP-18, AP-32). Open: an arrival of each brigade's own on 1 July, the line of 2 July and the advance of each brigade, 3 July, the three companies of the Sumter battalion (not in the roster), strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-3c-anderson-cutts-coa` (add); `cs-3c-anderson-cutts-cob` (add); `cs-3c-anderson-cutts-coc` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R534 (6), R536 (5), R537 (4), R538 (1), R539 (4), R541 (1), R542 (1), R543 (1), R544 (1), R545 (3), R546 (1), R547 (1), R548 (2).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R540 Capt. C. H. Andrews.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `ALEXANDER-1907`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 31.

### `cs-3c-heth`: Confederate Third Corps: Heth's division (Pettigrew, Brockenbrough, Archer, Davis, Garnett's battalion)

- **Units:** 24 rows, 18 leaf units on the field: 18 partly drawn, 5 formation, 1 not on field. Missing (leaf units): arrival 18, strength 18, parent_only 17, positions 9, path 5. Figures drawn now: 6,980.
- **What to find:** All 18 leaf units are placed. Open: arrivals of their own on 1 July, the day of rest on 2 July, the line and the advance of 3 July under Pettigrew, the four batteries (not in the roster), the 44th North Carolina (a non-lead source for Hanover Junction), strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-3c-heth-garnett-donaldsonville` (add); `cs-3c-heth-garnett-huger` (add); `cs-3c-heth-garnett-lewis` (add); `cs-3c-heth-garnett-norfolkblues` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R549 (4), R550 (3), R552 (4), R553 (4), R554 (2), R555 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R551 Capt. J. J. Young.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`, part 3 documents cited by claims: D1888 (1).
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 19.

### `cs-3c-pender-resart`: Confederate Third Corps: Pender's division (Perrin, Lane, Thomas, Scales, Poague) and the corps reserve artillery (McIntosh, Pegram)

- **Units:** 28 rows, 22 leaf units on the field: 22 partly drawn, 6 formation. Missing (leaf units): arrival 22, positions 22, strength 22, parent_only 19, path 2. Figures drawn now: 6,908.
- **What to find:** All 22 leaf units are placed. Open: arrivals of their own, the places of 2 and 3 July (Lane and Scales under Trimble on 3 July), the batteries of the three battalions (not in the roster), strengths.
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-3c-pender-poague-albemarle` (add); `cs-3c-pender-poague-charlottenc` (add); `cs-3c-pender-poague-madisonms` (add); `cs-3c-pender-poague-brooke` (add); `cs-3c-res-art-mcintosh-danville` (add); `cs-3c-res-art-mcintosh-hardawayal` (add); `cs-3c-res-art-mcintosh-2rockbridge` (add); `cs-3c-res-art-mcintosh-johnson` (add); `cs-3c-res-art-pegram-crenshaw` (add); `cs-3c-res-art-pegram-fredericksburg` (add); `cs-3c-res-art-pegram-letcher` (add); `cs-3c-res-art-pegram-peedeesc` (add); `cs-3c-res-art-pegram-purcell` (add).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R535 (1), R556 (3), R557 (2), R558 (2), R559 (2), R560 (2), R561 (1), R562 (2), R563 (2), R564 (2).
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`.
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 19.

### `cs-cav-hq`: Confederate cavalry (Hampton, Fitz. Lee/Chambliss, Jenkins, the horse artillery, Robertson, W. E. Jones, Imboden) and army headquarters

- **Units:** 34 rows, 23 leaf units on the field: 17 not drawn, 6 edge only, 8 formation, 3 not on field. Missing (leaf units): positions 23, strength 23, arrival 22, parent_only 21, path 17. Figures drawn now: 1,740.
- **Not drawn or at the edge, by reason:** `cavalry_no_road` 16, `no_place_after_arrival` 6, `no_figure` 1.
- **What to find:** 10 regiments of Fitz. Lee and Chambliss are not drawn (only earlier marches are printed for them), Jenkins' 5 units and the horse artillery entry are not drawn, and Hampton's 6 wait at the edge on the Hunterstown Road (AP-06). The index holds Stuart's (R565) and Hampton's (R567) reports for the battle; the other cavalry reports in it are of Brandy Station and Aldie. To find: the arrival of each brigade on 2 July (gate: dusk), the bivouac, the march to the right on 3 July and the road it used, the lines on the East Cavalry Field, the withdrawal; Jenkins' brigade with Ewell on 1 and 2 July and on the East Cavalry Field on 3 July; each horse battery's brigade and positions (the 6 horse batteries and Jackson's battery are not in the roster); the 1st Maryland Battalion served with Ewell's corps by the table; Lee's headquarters (the army headquarters has a gate and no figure: who was there); a non-lead source for where Robertson, W. E. Jones and Imboden were (Fairfield and the trains lie outside the loaded ground: say so, nothing is drawn there).
- **Roster gaps to confirm or add (`unit` records; ids pre-assigned in roster-gaps.json):** `cs-cav-horse-art-breathed` (add); `cs-cav-horse-art-chew` (add); `cs-cav-horse-art-griffin` (add); `cs-cav-horse-art-hart` (add); `cs-cav-horse-art-mcgregor` (add); `cs-cav-horse-art-moorman` (add); `cs-cav-jenkins-jacksonbattery` (add); `cs-cav-flee-1mdbn` (status); `cs-cav-robertson` (status); `cs-cav-jones` (status); `cs-cav-imboden` (status).
- **Official Records reports the ledgers already cite for these units** (OR27 report id, claims held): R426 (6), R428 (2), R430 (1), R465 (1), R479 (1), R506 (1), R539 (1), R565 (19), R567 (4), R580 (1), R582 (1).
- **Reports between them in the table of contents that no ledger claim cites (not read, or read with no result):** R427 Surg. Lafayette Guild, R429 Lieut. Col. Briscoe G. Baldw, R566 Capt. John E. Cooke, R568 Col. L. S. Baker, R569 Col. John L. Black, R570 Maj. T. J. Lipscomb, R571 Col. P. M. B. Young, R572 Lieut. Col. J. F. Waring, R573 Brig. Gen. B. H. Robertson, R574 Col. Thomas T. Munford, R575 Maj. Cary Breckinridge, R576 Col. i76.— Col. Thomas H. Ow, R577 Col. Williams C. Wickham, R578 Capt. W. B. Newton, R579 Col. Thomas L. Rosser, R581 Maj. C. E. Flournoy, R583 Col. L. L. Lomax, R584 Col. A.W.Harman, R585 Lieut. Col. T. B. Massie, R586 Lieut. Col. Lieut.Col.E. V.W, R587 Col. John R. ChambUss, R588 Maj. R. F. Beckham, R589 The Confederate RoU of Honor.
- **Other Official Records:** organization table `OR27-2-R424`, returns `OR27-2-R425`, `OR27-2-R427`, part 3 documents cited by claims: D1796 (1), D1839 (1), D1847 (1), D1877 (1).
- **Indexed state volumes:** none indexed for these units.
- **Local texts to read** (keys in sources.json): `SHSP-04`, `SHSP-05`, `SHSP-06`, `SHSP-11`, `SHSP-12`, `FREMANTLE-1864`, `LONGSTREET-1896`, `BL3`.
- **Ledger claims already held** (read them first; do not repeat them): ledger D 43, ledger E 12.

<!-- /GEN:sections -->

## 5. The data contract of a group file

### 5.1 Files and layout

```
docs/battle-theatre/history/undrawn/<group>.jsonl                          the file a researcher writes (UTF-8, Unix newlines, no BOM; one JSON object per line)
tmp/units-<group>/                                                         texts a researcher acquires (untracked; below 1 GB; declared by `source` records)
docs/battle-theatre/GOVERNANCE/horde/ws-units/<group>/NOTES.md             what was read, what was not, defects found in the texts or the layer data, requests made
docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/<group>-<name>.md    one proposed register entry per gap record (template: proposed-register/TEMPLATE.md)
docs/battle-theatre/GOVERNANCE/horde/requests/bt-units-<short-name>.md    a change wanted in a file the researcher does not own
```

`<group>` is one of the 24 ids of `groups.json` (lowercase letters, digits and hyphens). A line is one record; there is no header line. Write the file while you work (append; to correct a record, replace its line and keep its `claim_id`: other records point at ids). Never renumber. Sort order does not matter.

### 5.2 Fields every record has

| Field | Value |
|---|---|
| `claim_id` | `U-<group>-nnnn`, four digits, `0001` to `8999` (9000 and over belong to the fixtures); unique in the file and across all files |
| `group` | the group id (the file name) |
| `kind` | one of the 15 kinds of 5.3 |
| `unit_id` | a unit of the group: a roster id, an id pre-assigned in `roster-gaps.json` for this group, or an id added by a `unit` record of the file; lowercase letters, digits, hyphens |
| `tier` | `documented`, `inferred` or `open gap` (gap records only) |
| `render_flag` | 0 for documented, 1 for inferred, `null` for open gap (`2`, plausible-procedural, is never written here) |
| `claim_support_verified` | `true` only after the whole passage was read and it states exactly this; else `false` (the record is then not used) |
| `fidelity_check` | `passed_full_read` (set only after reading `source.passage` in full) |
| `ocr_uncertain`, `flag_single_source` | booleans: the words are doubtful in the OCR; no second source states it |
| `statement` | one sentence in your words of what the passage states of this unit, 12 to 400 characters; plain history, no wording about how the page was made |
| `reasoning` | required for `inferred`, 20 characters or more: how the claim follows from the passage |
| `source` | the object of 5.4 (every kind but `source` and `gap`) |
| `conflicts_with`, `corroborates` | lists of record ids (this file's, another group file's, a ledger claim's, or a `C-`, `T`, `RC-`, `AP-`, `PO-`, `DP-` or `EG-` id) |
| `conflict_key` | optional, `"<unit id>\|<topic>\|<date or blank>"`, the same key on records that disagree |
| `timeline` | optional list of timeline row ids (`T1-123`) the record bears on |
| `weak_source`, `note`, `fidelity_note` | optional |

A field the checker does not know is listed as a warning and ignored by the integrator; a field that starts with an underscore is ignored without comment.

### 5.3 The 15 kinds

| Kind | States | Own fields | Closes |
|---|---|---|---|
| `unit` | a roster fact: a unit the roster lacks, or has wrong | `unit` (5.3.1) | roster gaps |
| `arrival` | the unit's own first presence at the field (`scope: field`) or short of it (`vicinity`) | `when`, `place`, `arrival: {scope}` | `arrival` |
| `arrival_road` | the road by which the unit came to the field | `road` with `enters_ground`; `when` optional | `path` |
| `march` | a march of the unit with a time | `when`; `road` optional | support (ordering, legs) |
| `position` | where the unit stood | `when`, `place`, `activity`, `formation`, `facing` | `positions` |
| `engagement` | where it fought; `until` closes the window | as `position`, `until` | `positions` |
| `night_position` | where it spent the night | as `position` | `positions` |
| `movement` | from one stated position to another | `when`, `from`, `to`, `gait` | `positions` |
| `departure` | it left the field by a road at a time | `when`, `road`; `place` optional | `positions` (departure) |
| `strength` | a printed number of men | `strength` | `strength` |
| `absent` | the unit was not on the field | `absent`; `when` when only part of the battle | not on the field |
| `line_order` | the order of units in a line or a column | `when`, `order` | order of march and of a line |
| `road_identification` | what a printed road name is, in gazetteer terms | `road_identification` | `path` (supports) |
| `source` | a text the researcher acquired | `source_decl` (5.9) | none |
| `gap` | nothing found, after searches | `gap` (5.8) | any word, visibly |

**5.3.1 `unit`.** `unit.action`: `add` (a unit the roster lacks: `parent`, `name`, `level`, `arm` required; `status` optional, default `on_field`; the id is the parent's id, a hyphen and a slug, or the id pre-assigned in `roster-gaps.json`), `absent` (the same fields with `status` `never_on_field` or `never_main_field`: printed in the table as not engaged), `attached` (`attached_to`: a unit attached to another has no figures of its own unless a source gives them), `merge` (`merge_of`: two or more roster ids the table prints as one consolidated battery), `status` (`status`: the new roster status), `rename` (`name`), `fix` (`fix`, 40 characters or more: only for the one roster-structure case that `roster-gaps.json` pre-classifies, the 32d Massachusetts; any other structural error is a `gap` with `what: ["roster"]` and a request note). Levels: `army corps division brigade regiment battalion battery company artillery_brigade artillery_battalion artillery_group group command headquarters person`; arms: `infantry cavalry artillery staff medical train headquarters`. A `unit` record is evidence like any other: it cites the printed table line (the quote, offset and page that `roster-gaps.json` already holds are the starting point).

**5.3.2 `strength`.** `strength.what`: `officers_and_men men enlisted officers muskets sabers aggregate_present present_for_duty engaged carried_into_action effective`; exactly one of `value` (one printed positive integer) or `min` and `max` (a printed range); `printed` (the words and figures as printed; `number_in_words: true` when the number is printed in words); `as_of` (the date the figure refers to, `1863-MM-DD`); `approx` (the text says "about"). Two figures in one sentence ("230 men and 13 officers") are two records.

**5.3.3 `absent`.** `absent.whole_battle` (boolean); `where_printed` and/or `duty_printed` (the words as printed: where the unit was, what it was detailed to do); `part` (which part of the unit, as printed, or null); when `whole_battle` is false, `when` (and `until`) say for how long.

**5.3.4 `line_order`.** `order.direction`: `right_to_left`, `left_to_right`, `front_to_rear` (a line and its supports) or `head_to_tail` (a column); `order.units`: two or more units, in that order, as the passage gives them.

**5.3.5 `road_identification`.** `road_identification`: `printed_name` (as printed), `ref` (a gazetteer road id, `GZ-0nn` of kind `line`), `basis` (40 characters or more: what in the passage ties the printed name to that road). Use it where the printed name is not a name of the gazetteer road; it is `inferred`, with `reasoning`.

### 5.4 The `source` object

| Field | Value |
|---|---|
| `source_id` | a key of `sources.json` (`OR27-1`, `OR27-2`, `OR27-3`, `PA1`, `PA1B`, `PA2`, `NY1`, `NY2`, `NY3`, `ME`, `MI`, `FOX`, `BL3`, or one of the 99 texts of `GOVERNANCE/library/acquired_2.json`) or the id of a `source` record of the same file |
| `report_id` | for the Official Records: the index record (`OR27-1-R158`) the quote stands in |
| `section` | for an indexed state volume: the section id (`NY1-S001`) the quote stands in |
| `author`, `author_role` | the author as printed; the role: `unit_commander`, `formation_commander`, `staff`, `other_officer`, `participant`, `official_table`, `map` (these may support `documented`); `compiler`, `historian`, `newspaper` (at most `inferred`) |
| `printed_page` | the page of the model (`--verify` prints it; `~` marks a page inside a run whose running heads the OCR lost); another page needs `page_basis` (for example the running head read) |
| `quote` | at most 14 words, verbatim in the text (whitespace collapsed, end-of-line hyphenation joined, typographic quotes folded; the OCR as it stands, errors included) |
| `quote_offset` | the character offset of the quote in the original text file (`--verify` prints it) |
| `passage` | `[from, to]`, character offsets of the passage read: the sentences that state the claim, at most 4,000 characters; it must contain the quote and every `printed` field of the record |
| `cite` | the citation in words, 12 characters or more |
| `work` | optional |

`author_role` follows what the author was to the unit named: the commander of a regiment writing of his regiment is `unit_commander`; a brigade or division commander writing of a regiment under him is `formation_commander`; a state commission's narrative, Fox, Busey and Martin and any later compilation are `compiler`; a later historian is `historian`; an 1863 newspaper is `newspaper`. A post-war address by an officer of the unit is `unit_commander` or `other_officer` and may be `documented` where it states the fact; the card shows the date of the text.

### 5.5 Time: the `when` object

| Field | Value |
|---|---|
| `date` | `1863-MM-DD`, from 1863-06-25 to 1863-07-15 |
| `date_basis` | `printed` (the passage prints the date) or `context` (the date follows from the report's own dates; say so in `note`) |
| `basis` | `printed_clock` (a clock is printed), `printed_period` (a part of a day is printed), `sequence` (no clock or period; ordered by other records: `after` and/or `before`, lists of record ids), `day_only` (the date only) |
| `printed` | the time words as printed (required for the first two bases) |
| `t_iso` | `1863-MM-DDTHH:MM`, only for `printed_clock`: it must be a clock that stands in `printed` (7 a. m. is 07:00, 3 p. m. is 15:00, "12 m." and the words noon and midday are 12:00, midnight is 00:00); `t_end_iso` optional, the same rule |
| `period` | only for `printed_period`: one of the 14 tokens of 5.6, one of whose words stands in `printed`; `printed` must carry no clock |
| `approx` | boolean: "about", "near", "soon after" |

`until` has the same shape and closes a window (an engagement from 3 p. m. until 8 p. m.). The times of a record are in the report's own clock; the layer reads them as local mean time (the unit of the timeline). A printed clock always outranks a day part. Never write a time the passage does not print.

### 5.6 Day parts

A part of a day without a clock is a `printed_period` with one of 14 tokens. Each token has a window and an instant that the integrator uses, from the one table of 6.3 (computed from `environment/ephemeris_1863.json`, 2 July values, civil dawn, sunrise, noon, sunset and the end of civil twilight; noon and midnight are clocks, not tokens).

<!-- GEN:periods -->
| Token | Words (any one, in `when.printed`) | Window (LMT) | Instant used |
|---|---|---|---|
| `before_daylight` | "before daylight", "before day", "before dawn", "before light" | 00:00 to 04:03 | 00:00 |
| `daybreak` | "daybreak", "day-break", "dawn", "daylight", "day-light", "break of day", "first light" | 04:03 to 04:35 | 04:03 |
| `sunrise` | "sunrise", "sun-rise", "sunup", "sun-up" | 04:35 | 04:35 |
| `early_morning` | "early in the morning", "early morning", "early hour of the morning", "early in the day" | 04:35 to 12:00 | 04:35 |
| `morning` | "morning" | 04:35 to 12:00 | 04:35 |
| `forenoon` | "forenoon" | 04:35 to 12:00 | 04:35 |
| `early_afternoon` | "early in the afternoon", "early afternoon" | 12:00 to 19:32 | 12:00 |
| `afternoon` | "afternoon" | 12:00 to 19:32 | 12:00 |
| `late_afternoon` | "late in the afternoon", "late afternoon", "toward evening", "towards evening", "late in the day" | 12:00 to 19:32 | 12:00 |
| `sunset` | "sunset", "sundown", "sun-down", "sun-set", "going down of the sun" | 19:32 | 19:32 |
| `dusk` | "dusk", "dark", "nightfall", "twilight" | 19:32 to 20:04 | 19:32 |
| `evening` | "evening" | 19:32 to 24:00 | 19:32 |
| `night` | "night" | 20:04 to 24:00 | 20:04 |
| `all_day` | "all day", "during the day", "throughout the day", "the whole day", "the entire day" | 04:35 to 19:32 | 04:35 |
<!-- /GEN:periods -->

### 5.7 Place, facing, activity

`place` (arrival, position, engagement, night_position, departure; `from` and `to` of a movement have the same shape):

| Field | Value |
|---|---|
| `printed` | the place words as printed, at most 30 words |
| `anchor.type` | `gazetteer` (`ref`: a `GZ-` id; a road is not a place for a position, engagement or night position: use `along_road` or `road_crossing`), `troopmap` (`ref`: a claim id of the troop-map digest, `TMJ1-001`; a claim of the unit, of a formation above it or of a unit below it, of the same date as the record), `monument` (`ref`: `MON-<no>` of `app/data/site-bookmarks.json`; `anchor.basis`, 40 characters or more, quotes the statement that the monument stands where the unit stood), `structure` (`ref`: a building or point id of `app/data/structures3d.json`), `road_crossing` (`refs`: two gazetteer roads), `along_road` (`ref`: a gazetteer road; `near`: a gazetteer, monument or structure id), `unit` (`ref`: another unit; needs `relation.rel` of left_of, right_of, front_of, rear_of, with or between), `none` (the place stays words; a warning) |
| `relation` | optional: `rel` (`at in on near north_of northeast_of east_of southeast_of south_of southwest_of west_of northwest_of left_of right_of front_of rear_of with between`), `distance` (`printed` words, `value`, `unit`: yards, feet, miles, rods, m, or paces with `m: null`; `m` = value times the exact factor: 0.9144, 0.3048, 1609.344, 5.0292, 1) |

`activity`: `march double_quick halt stand rest fire serve_guns gallop build_works camp other` (`other` needs `activity_printed`). `formation`: null, or `line column_fours column_mass skirmish_line battery mounted_column mounted_line`. `facing`: `{basis, printed, ref, deg}` with `basis` `printed_compass` (a compass word in `printed`; `deg` its bearing, 0 north, clockwise), `toward_place` (`ref`: a gazetteer, monument or structure id), `parallel_to_road` (`ref`: a road), `toward_unit` (`ref`: a unit) or `none` (`deg` null); for the three relative bases `deg` is null: the builder computes it. A `movement` has `gait`: `march double_quick gallop unknown`. An `arrival_road`, `departure` and `march` `road` is `{printed, ref, identification, enters_ground}`: `ref` a gazetteer road or null; when `printed` carries none of that road's names, `identification` names a `road_identification` record, an `RC-` id of the road-name concordance (`library/ROAD-CONCORDANCE.md`), or the record is written with `ref: null`; `enters_ground` (arrival_road only) is true when the passage puts the unit on this road as it comes to the field, false for a road of an earlier march.

### 5.8 Gap records

A gap record says a thing is missing after a search; it is evidence of the search, never of the thing. `gap`:

| Field | Value |
|---|---|
| `what` | a list of: `arrival positions path strength departure roster` |
| `days` | optional, the days of 1 to 3 July concerned (for positions); all days when absent |
| `covers` | optional, other units under `unit_id` in the group that the same searches cover |
| `searched` | at least three searches; each `{source_id, where, terms, result}`; at least two in texts that are on this machine (a key of `sources.json` or a declared source); a text that could not be acquired is `NOT-ACQUIRED:<title>` with the reason as `result` |
| `register` | `docs/battle-theatre/GOVERNANCE/horde/ws-units/proposed-register/<group>-<name>.md`, written from the template |

A gap record covers its unit and, for the words arrival, positions and path, the units below it; a strength gap covers only the units it names (`unit_id` or `covers`).

### 5.9 `source` records

A text the researcher acquires (from the reachable hosts of 1.2) is declared once by a record of kind `source`: `source_decl` with `source_id` (a new key that is not in `sources.json`), `title`, `year`, `archive_identifier`, `url` (archive.org or www.loc.gov), `path` (under `tmp/units-<group>/`), `bytes`, `sha256`, `licence_basis` (why it may be read and quoted: a work published before 1930, a government document), `class`. The file hash is checked whenever the file is on the machine. Records may cite the new key from then on. Only public-domain or openly readable texts; accepting a licence, an account or a payment is the owner's act (section 8).

### 5.10 What the checker checks and what it does not

`python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py`:

| Command | What |
|---|---|
| `<group>` | one file: errors stop a merge, warnings do not; prints what is still owed |
| `<group> --complete` | also requires evidence or a gap for every word of every unit of the group (section 1.3) |
| `--all` | every group file present, with the checks that span files (ids unique across files) |
| `--verify "QUOTE" --source OR27-1` | where a quote stands (offset, report or section, page); exit 1 when it does not |
| `--self-test` | the fixtures: the good file must pass, every line of the bad file must be refused for the defect it carries; the coverage cases |

It checks: the shape of every record and the vocabularies above; that every id resolves (units of the group, gazetteer places and roads, troop-map claims, monuments, structures, records); that every quote is at most 14 words and stands in the named text at the offset given, inside the named report or section; that every `printed` field stands in the passage read; that a printed clock is in `printed` where `t_iso` is set and a day-part word where a token is set; the tier rules; the copy-audit words; the distances in exact units; that a record names only units of its group. Exit 0: no error; 1: errors; 2: no error but a source text is not on this machine (the quote checks that need it are listed, not passed).

It does not judge whether a passage supports a claim: that is the reading and the review. `claim_support_verified: true` is the researcher's statement that the whole passage was read and says exactly this; a reviewer may sample it.

### 5.11 A worked example (real passages; the fixture of the checker, claim ids 9000 and over)

Humphreys (OR27-1-R158, p. 531): the Third Brigade's march, and what the printed road name is.

```
{"claim_id": "U-us-3c-2d-9005", "group": "us-3c-2d", "kind": "arrival_road", "unit_id": "us-3c-2d-burling", "tier": "documented", "render_flag": 0, "claim_support_verified": true, "fidelity_check": "passed_full_read", "ocr_uncertain": false, "flag_single_source": true,
 "statement": "The Third Brigade joined the division at 9 a. m. on 2 July, marching by the main road from Emmitsburg to Gettysburg.",
 "source": {"source_id": "OR27-1", "report_id": "OR27-1-R158", "author": "Brig. Gen. Andrew A. Humphreys", "author_role": "formation_commander", "printed_page": "531", "quote": "It marched by the main road from Emmitsburg to Gettysburg.", "quote_offset": 1852527, "passage": [1852359, 1852594], "cite": "OR Ser. I vol. 27 pt. 1, OR27-1-R158 Brig. Gen. Andrew A. Humphreys, p. 531"},
 "when": {"date": "1863-07-02", "date_basis": "printed", "basis": "printed_clock", "printed": "9 a. m.", "t_iso": "1863-07-02T09:00", "t_end_iso": null, "period": null, "approx": false},
 "road": {"printed": "the main road from Emmitsburg to Gettysburg", "ref": "GZ-041", "identification": "U-us-3c-2d-9006", "enters_ground": true}}
```

(One record, wrapped for reading; in the file it is one line. The offsets and the page are computed by code from the local text; every record of the fixture, `tools/fixtures/us-3c-2d.good.jsonl`, was built the same way by `tools/make_fixtures.py`.) The same fixture holds a position placed relative to another unit (`"anchor":{"type":"unit","ref":"us-3c-2d-carr"},"relation":{"rel":"right_of"}`: the Fifth Excelsior "was placed on the right of the First Brigade", Brewster, OR27-1-R169), a day part ("At an early hour of the morning" is `early_morning`), a printed clock with a window (`when` and `until`, the 11th Massachusetts' engagement from 3 p. m. until 8 p. m.), two disagreeing arrivals (Humphreys' division at 1 a. m. and the 11th Massachusetts at 2 a. m. on 2 July, each naming the other in `conflicts_with`; Brewster's report prints a third value for his brigade, about midnight, which a third record would join: all carried, none chosen), two strength records from one sentence, a documented absence (the 84th Pennsylvania with the division's wagon train) and a line order.

## 6. The integrator

One engineer merges the 24 files. Nothing below needs a hand edit of a group file: a defect found in a record goes back to its group as a request, never into the file.

### 6.1 Order of work

1. `check_undrawn.py --all` exits 0 (warnings listed in the merge report). A file with errors is not merged; the other groups are.
2. A new program `app/tools/build-undrawn.mjs` reads the files and writes the outputs of 6.2 (all derived from the files, idempotent, no timestamps; `--check` fails if one is stale).
3. `app/tools/build-claim-placement.mjs` rebuilds `placement-claims.json` and the dispositions; the other data builders that read the roster rebuild (`build-sibling-approach.mjs`, `build-daypositions.mjs`, `build-cavalry-horses.mjs`).
4. `real.mjs` and the loaders read the new files when they are present; a layer built without them is exactly the layer of today (tested, as for every earlier addition).
5. Tests (6.6), then `derive_status.mjs` and `build_groups.py`: the round-2 list.

### 6.2 Mapping, record kind to layer data

The ledger shape is the one of `history/positions/positions_{A..E}.jsonl` (`claim_id`, `unit_id`, `kind`, `when {printed, date, t_iso, approx}`, `place {printed, gazetteer_ref, direction_or_road}`, `activity`, `source`, `tier`, `render_flag`, `claim_support_verified`, `fidelity_check`, `conflicts_with`, `note`). A group record becomes a claim of a sixth ledger F (`LEDGER_NAMES.F = 'positions_F.jsonl'` in `app/tools/claim-ledger.mjs`), so that the existing rules, cards, dispositions and tests apply unchanged: a claim is used only if `claim_support_verified` is true, `fidelity_check` is `passed_full_read` or `corrected`, and the tier is documented or inferred; claims earlier than the unit's gate are kept and listed, never applied; two roads for one unit, or two places at different hours within 90 minutes, are conflicts and neither is placed.

| Record kind | Becomes | Rule |
|---|---|---|
| `arrival_road` with `road.ref` | an `approach` row of `app/data/claim-curation-F.json` (an AP entry): road = the gazetteer line, phrase = the road words as printed that stand in the quote, `identification` = the `road_identification` record's basis | only when `enters_ground` is true and the road crosses the loaded ground (`boxCrossings`); a `road.identification` that is an `RC-` id is checked against `road-concordance.json` (resolved entries only) |
| `march` | an F claim of kind `march`, used as support and for the order of legs | never an approach by itself |
| `position`, `engagement`, `night_position`, `movement` (the `to` place) | a `stops` row (a PO entry), one place, one time | the place resolves to a gazetteer point inside the ground (anchor `gazetteer`), or to a derived place of 6.4; the time is a printed clock (`t_iso`) or the instant of a token of 6.3; `until` bounds how long the stop holds |
| `arrival` with `scope: field` | two things: (a) the unit's own gate in `app/data/unit-overlay.json` (`gates`): `earliest` = the earliest printed time of the unit's `arrival` records, `latest` = the latest, `default` = the earliest (the "range" choice of the scenario machinery: every value shown, none chosen), `kind` `printed_clock` or `named_period_convention` (the token's instant), tier from the claims; (b) a `stops` row when its place resolves | a unit with its own printed time may be drawn before its parent's gate (the rule of `ArrivalModel.effective`); a gate is never earlier than the earliest documented arrival; disagreeing records are listed as the conflict of the gate, none chosen |
| `arrival` with `scope: vicinity` | an F claim of kind `march` | a floor for the unit's presence on the road (it cannot be on the ground earlier than it was short of it plus the march), not a gate |
| `departure` | a `departures` row (a DP entry) | a printed time and a gazetteer road (existing rule) |
| `strength` | `unit-overlay.json` (`strengths`): the unit's records (`what`, value or range, `as_of`, claims); `allocateStrengths` reads them | a leaf with a record gets `kind: printed` with the declared range and basis; how the pool of its figured ancestor changes is a decision of 6.5 (the figures count different things at different dates); the card shows the range, the basis and what the number counts; no figure is ever capped |
| `line_order` | `unit-overlay.json` (`line_orders`): the order inside a column (`planTracks`, in place of roster order, EG-0005) and the left-to-right layout of a brigade's regiments | the units named stay in their formation |
| `road_identification` | an `identification` of an approach row; an F claim of kind `road_identification` | `tier` inferred |
| `absent` | `documented_absent` rows (ABS) of the curation: two or more records of the unit (different passages), at least one documented, a summary of 60 characters or more, a register id | one record alone leaves the unit `listed_not_on_field` with the claim on its card |
| `unit` | `unit-overlay.json` (`roster`): the roster actions applied over `units.json` when the layer reads it (the source files are not edited, as for `documented_absent`) | `add` and `absent` create the unit under its parent with its status; `merge` makes the later ids one battery; `attached` removes the figures of the attached unit; `status` and `rename` change the entry; `fix` is the 32d Massachusetts only |
| `gap` | `app/data/undrawn-gaps.json` and the proposed register entry | the unit's card says "open gap", what is missing, what was searched, the register id; the render reason of the unit repeats it |
| `source` | `app/data/undrawn-sources.json`: the text's citation for the Sources panel | hash checked |

Every F claim keeps its `claim_id`, its `source` (the card prints the key, report or section, printed page, the quote and the tier) and its `conflicts_with`. The source reader (`sourceOf`) gains a third kind for a text that is neither a report nor an indexed volume (`source_kind: "text"`, with `source_id`, title, year). A claim whose quote holds a word of the copy audit is carried with that word elided and the elision marked.

### 6.3 The time of a record

A `printed_clock` is used as printed. A `printed_period` takes the labelled convention of its token, one table for all records (the existing `PERIODS` of `app/src/history/placement.mjs` and `claim-clock.mjs` hold three tokens, night, evening and dusk; they become the 14 of the table in 5.6): the window is bounded by the sun and noon of 2 July from `environment/ephemeris_1863.json`, applied to the date printed, as the three earlier ones are; the instant is the start of the window, the earliest the words allow. These are conventions, not claims: the card says "time: convention of the word X, window A to B", and a record whose instant the layer cannot reach from the unit's previous stop (double-quick, the existing check) is dropped and listed with that reason. The choice of the instant (start, middle, end of the window) is a decision of the integrator, to be recorded as a delegated decision (6.5) with the other two kept selectable.

### 6.4 Places that are not gazetteer places

The builder resolves an anchor to a derived place `GZU-nnn` of `app/data/gazetteer-units.json` (id, name = the printed words, kind `derived`, `center`, `sigma_m`, `members` with the repository file and reference, tier `inferred`, the anchor and the claim): the coordinates come only from repository files (the existing rule for the gazetteer); the claim then references the place and passes the existing stop test.

| Anchor | Coordinates | Sigma (default; declared as a delegated decision) |
|---|---|---|
| `troopmap` | the claim's own point in `app/data/daypositions.json` | the claim's own `sigma_m`, unchanged |
| `monument` | `lat`, `lng` of the monument in `app/data/site-bookmarks.json`, only with the quoted statement in `anchor.basis` | not less than the larger of 100 m and the monument's own spread; the monument is evidence of a position, never drawn as an object of the 1863 scene (DD-WORLD-03) |
| `structure` | the footprint centroid or point of the id in `app/data/structures3d.json` | the feature's `err` (m), not less than 20 m |
| `road_crossing` | the crossing of the two gazetteer lines; refused if they do not meet inside the ground | the larger sigma of the two roads |
| `along_road` with `near` | the point of the road nearest the `near` place | the larger of the road's and the place's sigma; refused without `near` or `relation` (the position along a road is not printed) |
| `unit` with `relation` | the reference unit's place on the same date, moved by `relation` and `distance` (a pace has no fixed length here: Hardee's step of `drill/drill_hardee.json` may be used, labelled) | the reference sigma plus a quarter of the distance, not less than 50 m; refused if the reference unit has no place that date |

### 6.5 Decisions the integrator records

Append each as a DELEGATED DECISION to `GOVERNANCE/decisions/DELEGATED-DECISIONS-2026-11-11.md` (never the word DECIDED in `decision_log.md`), conservative, with every alternative kept selectable: the instant inside a period window (6.3); the sigma of each derived anchor (6.4); the figure drawn for a strength range (the printed value, or for a range the lower bound, with the other bounds selectable in the Sources panel); the default of a gate with disagreeing arrival records (the earliest printed, the range shown); how the strengths of a figured ancestor's other leaves change when one leaf has a printed figure; and the treatment of records that fall before the unit's gate. The delegated decision for the period tokens of this plan is entered in the same file (DD-UNITS-01).

### 6.6 Tests and gates

No gate, threshold or test is lowered, skipped or weakened. The merge adds `app/tests/undrawn.test.mjs` (the layer with the files equals the layer without them where nothing is merged; every F claim satisfies the ledger rules; every merged stop, gate, approach and departure traces to a claim; no event before a unit's earliest arrival in 7 scenarios; no figure drawn beyond a printed figure; every `gap` unit says so on its card; the copy audit over the data the page loads) and keeps `history.test.mjs`, `claims.test.mjs`, `daypos.test.mjs`, `sibling.test.mjs`, `ledgerE.test.mjs`, `unit.test.mjs`, `casualties.test.mjs`, `manifest.test.mjs` and `cavalry-ws10.test.mjs` green. The full node suite runs once at the end through the machine lock (`tools/horde/bench.sh`); browser specs are run only through the lock, one at a time, and no GPU timing is claimed from software rendering.

### 6.7 Round 2

After a merge, `node docs/battle-theatre/history/undrawn/tools/derive_status.mjs`, `python3 -I .../build_roster_gaps.py` and `python3 -I .../build_groups.py` rebuild the three data files from the new layer. A unit whose `missing` is still not empty and that no gap record covers goes into a group `r2-<group>` (the checker accepts `r2-` ids and `build_groups.py --check` keeps them); a unit all of whose missing words are covered by evidence or gaps is closed. A gap record is reopened when a new text is acquired that could answer it.

## 7. Order of work

1. Round 1: the 24 groups in parallel, each by its researcher (one per group; no two writers in one file). The groups with units not drawn come first where capacity is short, because a road of approach brings the most units onto the ground: `us-11c`, `cs-2c-johnson`, `us-3c-2d`, `cs-cav-hq`, `cs-1c-pickett`, `cs-1c-mclaws`, `us-cav-1d`, `us-cav-2d-3d-art`, `cs-2c-rodes-resart`, `cs-2c-early`, `us-5c`, `us-hq-artres`, then `us-6c-1d-2d` and `us-6c-3d-art` (units at the edge). The remaining groups run in the same round; none is deferred.
2. The integrator merges as groups finish (a group file that passes `--complete` is merged at once), never waiting for all 24.
3. Round 2 on the units still owed; round 3 likewise, until `derive_status.mjs` reports every unit either complete or covered by a gap record.
4. The cavalry file, the kit and casualty data and the guns data are rebuilt by their own builders after each merge; none is edited by hand.

## 8. Owner-only acts and decisions

- Texts that are not public domain or not on a reachable host (Busey and Martin, regimental strengths and losses, is the standing example for strengths) can be acquired only by the owner (purchase, licence, account); the plan records them as `NOT-ACQUIRED` and never quotes them. If the owner supplies one, it is declared by a `source` record and the gaps that named it are reopened.
- The owner may decide scope reductions and the default view of conflicting sources; until a decision is recorded, the requirement stands in full (Law 6).
- Contacting third parties (the National Park Service and others), accepting licences, payments and deployment are never done by the team.

## 9. Tools and sources

### 9.1 Commands

```
python3 -I tools/bt/or27_find.py "regex" --part 1 -C 200 --max 10        search the Official Records (cites report and printed page)
python3 -I tools/bt/or27_where.py "Barksdale" --part 2                    which reports mention a word
python3 -I tools/bt/or27_dump.py OR27-2-R441 --wrap 100                   one report with page markers
python3 -I tools/bt/statevol_find.py "Horner" -C 200 --vol NY2 --max 10   search the state volumes
python3 -I tools/bt/statevol_find.py --section NY2-S028 --chars 6000      print a section
python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --verify "QUOTE" --source OR27-1
python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py <group> [--complete]
```

### 9.2 Local texts

`OR27-1`, `OR27-2`, `OR27-3` (Official Records, Series I, volume 27, parts 1 to 3, index `library/or27_index.json`; the index lacks some reports, for example of McLaws, Barksdale, Semmes, Wofford, Pickett, Kemper and Armistead: say so per unit and use the corps, division and neighbours' reports that speak of the brigade); ten indexed volumes (`PA1`, `PA1B`, `PA2`, `NY1`, `NY2`, `NY3`, `ME`, `MI`, `FOX`, `BL3`; index `library/statevol_index.json`); 99 further texts in `tmp/library/ws9`, keyed in `sources.json`: regimental volumes of New Jersey (`NJ-TOOMBS-1888`, `NJ-FINAL-1891`), Vermont (`VT-GB-1914`, `VT-MON-1890`), Ohio (`OH-DED-1887`, `OH-8TH-1889`), Indiana (`IN-1913`) and Minnesota (`MN-1ST-1916`); the Southern Historical Society Papers (`SHSP-04` and four more volumes); Longstreet, Alexander, Fremantle, Haskell, Long, Pierce and Meade's Life and Letters; Bachelder's accounts (`BACH-STORY-1904`, `BACH-REPULSE-1870`, `BACH-KEY-1864` and others), Jacobs, Letterman and the burial and cemetery reports; Everett; the Gettysburg Compiler and the Adams Sentinel of 1863 (61 weekly issues; `newspaper` role, at most `inferred`); Official Records volumes 25 and 29 (part 1) and Series III volume 2. All paths are under `tmp/` (untracked); the hashes identify the copies read.

### 9.3 Known limits of the texts

The OCR damages digits, names and line breaks (a stray character inside a hyphenated word keeps the word from joining: write the quote around it and set `ocr_uncertain`). The index's page model is several pages high inside the organization tables (`OR27-1-R009`, `OR27-2-R424`): give the page read from the running heads inside the table as `printed_page` with `page_basis` (as `roster-gaps.json` does); the scan-leaf map `docs/battle-theatre/kit/evidence/or27_leaf_pages.json` (built by `tools/bt/kit_or27_leafmap.py` from the per-leaf OCR of the archive.org items) gives the printed page of any offset without running heads and may be named as the `page_basis`. Reports of 1863 and later memoirs differ in kind: the memoir is `documented` only where its author states a fact of his own unit and the card shows the date.

## 10. What this plan does not do

- It does not change the layer, the roster or any ledger: the files it names for the integrator do not exist yet. `status.json` and `groups.json` are a snapshot of the layer at 439 drawn units.
- The group sections list the Official Records reports that the ledgers already cite for each group and the reports between them that no claim cites; they are leads, not a reading list that is complete: the researcher reads all reports of the group's formations.
- It does not read the texts for the researcher: no record of any group exists yet (the fixture's claim ids, 9000 and over, are format tests of the checker, never evidence).
- The separate roster of soldiers (`rosters/`, workstream bt-rosters) keys on the same unit ids; the integrator tells that workstream of any added, merged or renamed unit through a request note.
- The kit-evidence pass (`docs/battle-theatre/kit/evidence/`, its own plan and `groups.json`) reads the same Official Records reports for the strength, commander, casualties and arms of every unit. A researcher reads the rows of that file for the group's units first (the `strength` field says what is there now) and does not repeat a figure it already holds; a strength found here that the kit pass lacks is recorded here, with the report and the quote, so that the same report and quote give the same figure in both places, and the integrator reconciles the two by source, never by choosing.
