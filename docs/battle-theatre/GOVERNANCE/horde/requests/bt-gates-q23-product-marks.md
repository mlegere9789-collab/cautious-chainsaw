# Request from bt-gates to bt-renderer (and bt-world-content): where the product does not mark a non-documented item (gate Q23)

Written 2026-11-16 by workstream bt-gates (runner `tools/bt/gates/q23_marking.py` with the node child `q23_app.mjs`, which runs the app's own overlay with a recording canvas). Not done by bt-gates because `app/src/**` is not in its ownership list. Findings of the first run:

1. **Works are marked by colour alone** (Q23.3): `Overlay.drawObjects` (`app/src/overlay.mjs`, `drawObjects`) strokes a work in the tier colour and uses the dash for built-or-pre-existing, with no glyph; `OBJ-P-13` (documented) and `OBJ-P-14` (inferred) are drawn alike apart from colour. Use `TIER_STYLE[o.tier].dash` and the glyph as the units do, and keep built-or-pre-existing in another channel. `OBJ-P-11` has neither a line nor a place, so nothing is drawn for it; 6 more objects are never present at the sampled times (progress 0): say why or draw a gap marker.
2. **No tier mark exists in the code for**: the weather state, effects (smoke, fire, flash, blood, mud), hospital activity, animation clips, guns and the artillery train (the unit card lists the guns and prints no tier for the count). The data carries tiers (`weather3d/timeline.mjs` `marks`, `fx3d` TIERS, `anim3d` clips); the interface prints none. A static search of `overlay.mjs`, `structures/overlay.mjs`, `ui/*.mjs` and `ext/*` for `tierMark(`, `pill(`, `glyphSVG(` or `TIER_STYLE[` finds none for these classes; `tools/bt/gates/content_classes.json` lists what is found per class.
3. **Individual soldiers** (Q23.5, EG-0001 marking "Tier overlay glyph 2 on every individual"): the overlay draws one mark per unit; nothing marks an individual.
4. **Open-gap units that are not drawn** have no map marker (Q23.8): `Overlay.draw` skips a unit that is not present (`if (!st.present[i]) continue;`); 108 units have tier `open gap` and no place. The Units list shows their glyph; the plan wants a marker in the evidence layer.
5. **Audio asset manifest** (Q23.4): none of the 42 entries of `app/data/audio3d/sources.json` carries the words "modern reconstruction" or "modern recording" (the panel does, DD-14); add the mark to each entry (a field `mark`).
6. **Figure choices** (Q23.3): 8 of 55 choices in `app/data/figures3d/TIERS.json` that are not documented declare `mark: "none"` (the ninth, `none (internal)`, is excluded as not visible).
7. The picture part of Q23 (frames at the default overlay state; legibility at night, Q10.6) is NOT-RUN in the runner and owed on `app/tests/ui.spec.mjs` and `sky.spec.mjs` run through `tools/horde/bench.sh`, with a person looking at the saved images (U-10).

## The exact change asked for

The edits named in 1 to 6. Re-run `python3 tools/bt/gates/q23_marking.py` (6 s) to see each item move.

When done, append `-- handled: <what was done>` to this note with a shell `>>`.
