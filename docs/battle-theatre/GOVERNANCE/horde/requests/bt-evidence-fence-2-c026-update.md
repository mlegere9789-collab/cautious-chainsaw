# Request to the conflict-register workstream (r03): C-026, the Sherfy barn fire, update of 2026-11-16

Origin: workstream bt-evidence, shard fence-2, row R14.S-037, third reading (2026-11-15/16). Evidence: `docs/battle-theatre/GOVERNANCE/evidence_corrections/fence-2.jsonl`, line `R14.S-037`. This note supplements `conflicts-fence-2-c026-sherfy-barn.md` (2026-11-14, left in place; everything it says about Hart R321 p.888, Bowen R140 p.503 and Bachelder p.81 stands). No change to the delegated default in `decisions/conflict_defaults.json` was made by this shard; the conflict-register owner applies or rejects what follows.

## 1. New local evidence (NPS inventory of the Pickett's Charge battlefield, 2024)
- The battle-era barn "was destroyed during the course of the battle. It had been used as a shelter for wounded Union soldiers, many of whom died in the ensuing fire that consumed the barn." The battle-time barn was an English barn; the present bank barn stands on its site (NPS-CLI-PCB, file page 97). The passage gives no date or hour of the fire.
- "This western field was occupied on July 3 by Confederate artillery, taking advantage of their open nature as an artillery platform during the cannonade" (NPS-CLI-PCB, file page 82): context for Hart's claim, not a link to it; the inventory does not connect the two statements.

## 2. A second, small conflict inside C-026: were wounded men burned?
- Yes: the 114th PA narrative (Pennsylvania at Gettysburg vol. 2, p.616: "Some of the wounded sought refuge in the barn, and being too badly wounded were not able to escape from it when it was burned and perished in the flames") and the NPS inventory above.
- No: Bachelder (1873, p.81): "A rumor is afloat that wounded men were burned in this building, but the writer met a Confederate officer, in hospital, who assured him that he was personally in the barn immediately before it was burned and that such was not the case." The same page says "many bodies of dead Union soldiers were consumed with it", and Bowen (OR27-1-R140 p.503) reports men missing "whom I have no doubt were killed and their bodies burned when the barn was burned down".
- Suggested for the register: carry "bodies of dead soldiers burned in the barn" as documented (Bachelder, Bowen, the 1867 cemetery report) and "wounded men burned in the barn" as a selectable pair (yes: 114th PA narrative, NPS; no: the Confederate officer via Bachelder), no default. The second-reading text of the fence-2 line that called "dead and wounded burned" documented is corrected in the third reading.

## 3. A third window, a lead only
The earlier reading of the Stone Sentinels page on the Sherfy farm, recorded by shard tl-07 in register entry EG-0269 (read 2026-11-04 through a fetch summarizer, not verbatim), cites a 77th NY soldier who has the barn shelled and burned on the morning of 3 Jul. Exact page URL on record: `https://gettysburg.stonesentinels.com/battlefield-farms/sherfy-farm/`. The host refused the tunnel on 2026-11-13 (proxy 403 on CONNECT), on 2026-11-13T21:55Z (web workstream fetches F-112 and F-113, curl exit 56) and on 2026-11-15T23:03Z (http code 000); one request each, not retried, not worked around. What has to be read there: the soldier's name, regiment and the wording, and whether the page cites the soldier's own account. The 77th NY soldier's account is not in the local New York volumes (searched). Until a primary (the soldier's own account) or the page text is read, "morning of 3 Jul" is a lead and not a selectable window with evidence behind it.

## 4. What the three windows rest on after this reading
| Window | Evidence | Tier |
|---|---|---|
| Evening of 2 Jul (PDF default of C-026) | none dates the fire to that evening; the lower bound (after the evening fight, wounded and dead in the barn) is documented | inferred (lower bound only) |
| 3 Jul during the afternoon artillery | Hart (OR27-1-R321 p.888) claims to have set "the barn" on fire; the barn is not named | documented as a claim, inferred as the Sherfy barn |
| Morning of 3 Jul | a 77th NY soldier as recorded by tl-07 (Stone Sentinels, a summarizer's reading) | lead only |

Owner-only: the Pennsylvania State Archives damage claim of Joseph Sherfy (a visit or a request) would carry the claimant's own date; not done.
