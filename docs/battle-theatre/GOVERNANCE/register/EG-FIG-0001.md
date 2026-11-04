# EG-FIG-0001: Faces, hair, facial hair, skin tone and body shape of every enlisted man (figure models)

| Field | Content |
|---|---|
| ID | EG-FIG-0001 |
| Requirement IDs | R03, R04, R17 |
| Category | physics-impossible / evidence missing |
| Description | No record gives any enlisted man's face, hair, beard, complexion, stature or build (see EG-0001). The figure models generate every man from his manifest seed: 24 head shapes, 8 hair styles, 7 facial-hair types, 12 skin tones, 5 eye colours, 12 body shapes, stature 0.95-1.06 of 1.73 m. The mixes (facial hair 30/22/6/18/6/6/12 percent, hair colours, skin-tone weights, grey share 12 percent, coat-off share on 1-3 July) are tuning weights. |
| Why literal 100% is not possible or blocked | Literal 100% is impossible: individual appearance of the 165,000 men was not recorded. No anthropometric table, photograph survey or muster-roll physical description set was read for this task. |
| Evidence searched | kit/kit_specs.json (wear_states, no appearance data), PDF Part B.6 (dress only), render/PLAN.md G8 (variation targets). Not searched: enlistment descriptive rolls (height, complexion, hair, eyes are printed on Union enlistment papers: a possible source for sampled distributions), Gould 1869 anthropometry, CDV surveys. |
| Autonomous substitute applied | Seeded deterministic generation: the same man always has the same face; distributions are tuning parameters recorded in data/figures3d/TIERS.json (F-FACE, F-DIST-*, F-GAP-COMPLEXION). |
| Strongest evidence-based reconstruction | Generic adult male proportions with varied faces; no distribution is claimed to match any army or unit. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | Tier overlay glyph on every individual (EG-0001 marking); card text names the figure as a generated individual; TIERS.json F-FACE. |
| Visual and audio impact | Every figure in both armies. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Provide or allow the descriptive-roll sources (for example the printed height, complexion, hair and eye colour on Union enlistment records) so the distributions can be sampled from data; until then they stay tuning weights. |
| Agent recommendation | Keep it marked until the source exists; do not read it as history. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
