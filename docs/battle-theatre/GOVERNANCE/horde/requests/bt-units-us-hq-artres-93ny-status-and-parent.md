# Request of workstream bt-units (group us-hq-artres): the 93d New York on 5 July, and the parent of the Provost units

Written 2026-11-16 by the researcher of the group `us-hq-artres` (fourth version of `docs/battle-theatre/history/undrawn/us-hq-artres.jsonl`). Nothing here needs a decision before the merge; it names two places where the integrator must read the records and not the roster.

## 1. The 93d New York is `never_main_field` for 1 to 3 July and on the field on 5 July

- The roster entry `us-aop-hq-93ny` is the table's "Not engaged" (record 0083, action `absent`, status `never_main_field`).
- A sergeant's memoir of the regiment (Robertson, 1895: source `ROBERTSON-93NY-1895`, declared by record 0360) places the regiment at Taneytown on 30 June and 1 July, at Westminster guarding the supply trains from 2 July to the afternoon of 4 July (record 0115, kind `absent`, the whole battle) and at Gettysburg from the afternoon of 5 July, camped close to the cemetery (records 0372 `arrival` and 0373 `night_position`, tier inferred for the anchor Cemetery Hill), leaving by Taneytown on 7 July (record 0374).
- What the integrator must keep: the regiment is never drawn on 1 to 3 July (gate Q04), and a theatre that runs past 4 July may draw it at the cemetery from the afternoon of 5 July. If the theatre ends on 4 July the status `never_main_field` stands as it is. The records of 5 and 7 July are outside the 1 to 3 July window of the layer and are entered so that the absence is documented and the arrival is a march (Taneytown, then the road to Gettysburg).

## 2. Parent of five units

The organization table puts the command of the Provost-Marshal-General between general headquarters and five units that the roster hangs under `us-aop-hq`. The unit records 0083, 0084, 0085, 0087 and 0088 name the new unit `us-aop-hq-provost` (record 0328, action `add`, parent `us-aop-hq`) as their `parent`; `roster-gaps.json` has no pre-assigned id for it. The same applies to Companies E and I of the 6th Pennsylvania Cavalry (`us-aop-hq-6pacav-e-i`): the table puts them in that command, but the annals of the regiment (1868, source `GRACEY-6PACAV-1868`) say they were the escort of army headquarters throughout the campaign, and the position records 0375 to 0377 anchor them to `us-aop-hq` with the relation `with` (tier inferred).
