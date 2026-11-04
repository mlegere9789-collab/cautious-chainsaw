# Owner decisions, 2026-10-05

Source: the owner's messages in the working session (verbatim intent, not paraphrased law). They supersede the T0 rule "no clock-label changes except +2".

1. **The Monuments "Jump to this moment" dilemma is rejected as posed.** Neither "land on the tick whose clock matches the story text" (units 1.6-2.1 km from the star) nor "land on the star's tick" (clock 2-9 h off the text) is acceptable. "No errors are permissible."
2. **Correct the clock now.** The piecewise time-warp clock (module `src/lib/time/**`, anchors `data-src/time/time_anchors.json`, bridge `tools/t0/patches-next/CLOCK.json`) goes into this release. The historian-needed anchors (ticks 75, 90, 248, 275, 538, the reviews of 28 and 518, the two provisional Turning Points anchors) are settled from primary sources by two independent evidence passes and an adjudicator; anything the sources cannot settle is labelled approximate (never silently guessed).
3. **Wrong displayed data must be fixed.** Every displayed time, place, number and name is either verified against a cited source, labelled as an estimate with its uncertainty, or removed. Exactly what was and was not verified is reported; no claim of "zero errors" is made without evidence.
4. **The Monuments feature must work and be accurate** (story-star ticks, linked units and positions consistent with the corrected clock). With the corrected clock the jump lands on the star's own tick and the clock agrees with the story text.
5. **Unit-marker ("tile") movement must be smooth and look professional**: continuous interpolation between keyframes, eased entrances and exits, glide on jumps, no teleporting, 60 fps target, reduced-motion respected.
6. Still binding from 2026-10-04: do not break the Virtual Walkthrough or its Monuments tab (the 512-monument array and the Walkthrough code stay byte-identical; defects there are reported, not patched); nothing outward-facing; the personal Gmail is never published.
