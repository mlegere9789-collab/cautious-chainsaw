# bt-oob-kit / us-11c: catalog requests (code changes of the integrator)

Written 2026-11-24 by workstream bt-oob-kit. Items the lines of `kit/evidence/us-11c.jsonl` give as `null` because the catalog lacks them or the printed words do not choose between catalog items:
- weapon: "Enfield rifles" (154th New York, line us-11c:0214; `weapon_id` null because the passage does not choose between `p1853_enfield` and `p1856_58_enfield_short`).
- weapon: "long-range Remington rifles" (45th New York, line us-11c:0215; `weapon_id` null, the catalog has only the Remington revolver). The kit holds `m1841_mississippi` for this regiment on a Wikipedia source (`Wiki-M1841`); the line contradicts it.
- dress, shoes: shoes failing and men marching barefooted (Smith's brigade, lines us-11c:0218, 0220, 0222 and 0224) and most soldiers without shoes or in ragged shoes on 7 July (45th New York, line us-11c:0217): no catalog item for worn or missing shoes of Union troops (`barefoot_cs` is Confederate).
- dress, pack_state: the 200 men of the 41st New York who left camp on the morning of 1 July without blankets and knapsacks (line us-11c:0226): no catalog item.
- dress, coat: black and silver uniform (54th New York in 1861, "Lutzow's Schwarzer Jaeger" pattern, line us-11c:0216): no catalog item.
- dress, badge: the corps line us-11c:0227 gives the order of 21 March 1863 with a null item (three colours, three catalog items); the regiment lines use `badge_XI_red`, `badge_XI_white` and `badge_XI_blue`.
