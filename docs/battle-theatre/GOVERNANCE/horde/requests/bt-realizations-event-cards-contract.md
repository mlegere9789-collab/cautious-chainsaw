# bt-realizations -> world-content: the event-card and epilogue hooks the realization harness reads

Owner of the harness: bt-realizations (tools/bt/realize). Needed from: bt-world-content (event cards, epilogue chapter).

**What.** The harness asks the product "which cards are shown at minute t" through a module of `docs/battle-theatre/app/src/ext/` that is **listed in `src/ext/index.mjs`** (the product loads nothing else). It looks for `event-cards.mjs` (also `eventcards.mjs`, `cards.mjs`, `timeline-cards.mjs`) exporting `cardsAt(tMin, opts)`, and for `epilogue.mjs` (or the same module) exporting `epilogueAt(tMin, opts)`. A hook named in `app/docs/GATE-HOOKS.md` (a line that names the function and a path under `src/`) is tried first, so a different file name is fine if the hook is listed there.

**Shape.** `cardsAt(tMin)` returns an array (or `{ items }`) of cards shown at that minute on the theatre clock (minutes since 1863-06-01 00:00 local mean time, the unit of `app/src/clock.mjs`): `{ id, rows: [timeline row ids the card realizes, e.g. "T1-001"], title, tier, from_min, to_min, place?: { lng, lat } }`. `tier` is the effective tier of the row (documented, inferred, plausible-procedural, open gap); the card must never state more than the row's evidence status allows. Pure, no DOM, no network, no wall clock.

**Why.** Rows with no physical form (orders, decisions, councils; the 14 epilogue rows E-001..E-014) can be realized only by a card. Until the module exists every record of kind `event_card` or `epilogue` fails with `adapter_missing` (see `GOVERNANCE/realizations/EXAMPLES.jsonl` T1-001). The check is `card_shown` / `epilogue_shown` in `tools/bt/realize/checks.mjs`.

**Note for the gate runner.** `GATE-SPEC-A.md` TL-4 and TL-11 read a card alone as no visual realization; `RESULTS.json` reports `realization_class` (`scene` or `card`), `q17.ok` and `q17.ok_strict`, and decides neither reading (DD-RZ-04). A card for a row that also has a scene consequence should list the row id too.

**Exact change.** Export `cardsAt` (and `epilogueAt`) as above from a module listed in `src/ext/index.mjs`, then append one row to `app/docs/GATE-HOOKS.md` with `>>` naming the module path and the two functions.
