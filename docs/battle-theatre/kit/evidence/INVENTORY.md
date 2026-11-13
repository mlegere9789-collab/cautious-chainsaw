# Unit inventory of the kit evidence pass

Built by `tools/bt/kit_evidence_plan.py` from the roster (`history/units.json`) and the kit tables; do not edit. One table per research group.
Letters: **D** documented as built (its support was never re-read against the source), **I** inferred, **P** plausible-procedural, **G** registered open gap, **E** empty. `*` = the value sits on the unit's own record. Dress: count of the twelve dress fields by letter.

## Totals over 825 units in 26 groups

| Field | D | I | P | G | E | units that carry the field |
|---|---|---|---|---|---|---|
| roster | 54 | 762 | 0 | 0 | 0 | 816 |
| commander | 46 | 290 | 0 | 0 | 480 | 816 |
| strength | 0 | 21 | 545 | 0 | 250 | 816 |
| casualties | 0 | 21 | 0 | 0 | 795 | 816 |
| arms | 15 | 20 | 466 | 0 | 1 | 502 |
| guns | 27 | 5 | 0 | 98 | 17 | 147 |
| dress (twelve kit fields per unit) | 15 | 1231 | 5449 | 0 | 913 | 7608 field cells |

## us-1c

Army of the Potomac, I Corps: corps headquarters and the infantry of the three divisions (Wadsworth, Robinson, Doubleday and Rowley)

43 units (43 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-1c` | I Corps | corps | yes | I | I | I | I | - | - | - |
| `us-1c-1d` | 1st Div Wadsworth | division | yes | I | I | E | E | - | - | - |
| `us-1c-1d-meredith` | Meredith’s Iron Brigade | brigade | yes | I | I | I | I | - | - | - |
| `us-1c-1d-meredith-19in` | 19th IN | regiment | yes | I | E | P | E | I* | D2I2P7E1 | `US.19IN` |
| `us-1c-1d-meredith-24mi` | 24th MI | regiment | yes | I | E | P | E | I* | I3P8E1 | `US.24MI` |
| `us-1c-1d-meredith-2wi` | 2nd WI | regiment | yes | I | E | P | E | I* | D2I2P7E1 | `US.2WI` |
| `us-1c-1d-meredith-6wi` | 6th WI | regiment | yes | I | E | P | E | I* | D2I2P7E1 | `US.6WI` |
| `us-1c-1d-meredith-7wi` | 7th WI | regiment | yes | I | E | P | E | I* | D2I2P7E1 | `US.7WI` |
| `us-1c-1d-cutler` | Cutler | brigade | yes | I | I | I | I | - | - | - |
| `us-1c-1d-cutler-7in` | 7th IN | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-1d-cutler-76ny` | 76th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-1d-cutler-84ny` | 84th NY | regiment | yes | I | E | P | E | P* | I1P9E2 | `US.84NY` |
| `us-1c-1d-cutler-95ny` | 95th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-1d-cutler-147ny` | 147th NY | regiment | yes | I | E | P | E | P | I2P8E2 | `US.147NY` |
| `us-1c-1d-cutler-56pa` | 56th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d` | 2nd Div Robinson | division | yes | I | I | E | E | - | - | - |
| `us-1c-2d-paul` | Paul | brigade | yes | I | I | I | I | - | - | - |
| `us-1c-2d-paul-16me` | 16th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-paul-13ma` | 13th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-paul-94ny` | 94th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-paul-104ny` | 104th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-paul-107pa` | 107th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-baxter` | Baxter | brigade | yes | I | I | E | E | - | - | - |
| `us-1c-2d-baxter-12ma` | 12th MA | regiment | yes | I | E | P | E | P | I2P8E2 | `US.12MA` |
| `us-1c-2d-baxter-83ny` | 83rd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-baxter-97ny` | 97th NY | regiment | yes | I | E | P | E | P | I2P8E2 | `US.97NY` |
| `us-1c-2d-baxter-11pa` | 11th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-baxter-88pa` | 88th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-2d-baxter-90pa` | 90th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-3d` | 3rd Div Doubleday/Rowley | division | yes | I | I | E | E | - | - | - |
| `us-1c-3d-biddle` | Biddle | brigade | yes | I | I | E | E | - | - | - |
| `us-1c-3d-biddle-80ny` | 80th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-3d-biddle-121pa` | 121st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-3d-biddle-142pa` | 142nd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-3d-biddle-151pa` | 151st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-1c-3d-stone` | Stone | brigade | yes | I | I | E | E | - | - | - |
| `us-1c-3d-stone-143pa` | 143rd PA | regiment | yes | I | E | P | E | P | I2P8E2 | `US.143PA` |
| `us-1c-3d-stone-149pa` | 149th PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.149PA` |
| `us-1c-3d-stone-150pa` | 150th PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.150PA` |
| `us-1c-3d-stannard` | Stannard | brigade | yes | I | I | E | E | - | - | - |
| `us-1c-3d-stannard-13vt` | 13th VT | regiment | yes | I | E | P | E | P | I2P9E1 | `US.13VT` |
| `us-1c-3d-stannard-14vt` | 14th VT | regiment | yes | I | E | P | E | P | I2P9E1 | `US.14VT` |
| `us-1c-3d-stannard-16vt` | 16th VT | regiment | yes | I | E | P | E | P | I3P8E1 | `US.16VT` |

## us-2c-1d

Army of the Potomac, II Corps: corps headquarters and the 1st Division (Caldwell: Cross, Kelly, Zook, Brooke)

25 units (25 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-2c` | II Corps | corps | yes | I | I | I | I | - | - | - |
| `us-2c-1d` | 1st Div Caldwell | division | yes | I | I | E | E | - | - | - |
| `us-2c-1d-cross` | Cross | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-1d-cross-5nh` | 5th NH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-cross-61ny` | 61st NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-cross-81pa` | 81st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-cross-148pa` | 148th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-kelly` | Kelly’s Irish Brigade | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-1d-kelly-28ma` | 28th MA | regiment | yes | I | E | P | E | D* | I3P8E1 | `US.28MA` |
| `us-2c-1d-kelly-63ny` | 63rd NY | regiment | yes | I | E | P | E | D* | I3P8E1 | `US.63NY` |
| `us-2c-1d-kelly-69ny` | 69th NY | regiment | yes | I | E | P | E | D* | I3P8E1 | `US.69NY` |
| `us-2c-1d-kelly-88ny` | 88th NY | regiment | yes | I | E | P | E | D* | I3P8E1 | `US.88NY` |
| `us-2c-1d-kelly-116pa` | 116th PA | regiment | yes | I | E | P | E | I* | I3P8E1 | `US.116PA` |
| `us-2c-1d-zook` | Zook | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-1d-zook-52ny` | 52nd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-zook-57ny` | 57th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-zook-66ny` | 66th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-zook-140pa` | 140th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-brooke` | Brooke | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-1d-brooke-27ct` | 27th CT | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-brooke-2de` | 2nd DE | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-brooke-64ny` | 64th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-brooke-53pa` | 53rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-1d-brooke-145pa` | 145th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-hancock-acting` | Maj. Gen. Hancock (II Corps commander acting for Meade, Jul 1) | person | yes | I | I | E | E | - | - | - |

## us-2c-2d3d

Army of the Potomac, II Corps: 2nd Division (Gibbon and Harrow) and 3rd Division (Alexander Hays)

36 units (35 in the roster, 1 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-2c-2d` | 2nd Div Gibbon/Harrow | division | yes | I | I | E | E | - | - | - |
| `us-2c-2d-harrow` | Harrow | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-2d-harrow-19me` | 19th ME | regiment | yes | I | E | P | E | P | I2P8E2 | `US.19ME` |
| `us-2c-2d-harrow-15ma` | 15th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-harrow-1mn` | 1st MN | regiment | yes | I | E | P | E | I* | I3P8E1 | `US.1MN` |
| `us-2c-2d-harrow-82ny` | 82nd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-webb` | Webb | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-2d-webb-69pa` | 69th PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.69PA` |
| `us-2c-2d-webb-71pa` | 71st PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.71PA` |
| `us-2c-2d-webb-72pa` | 72nd PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.72PA` |
| `us-2c-2d-webb-106pa` | 106th PA | regiment | yes | I | E | P | E | P | I2P9E1 | `US.106PA` |
| `us-2c-2d-hall` | Hall | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-2d-hall-19ma` | 19th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-hall-20ma` | 20th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-hall-7mi` | 7th MI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-hall-42ny` | 42nd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-hall-59ny` | 59th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-2d-1comass` | 1st Co. Massachusetts Sharpshooters | company | yes | I | E | P | E | D* | I1P10E1 | `US.1MASSSS` |
| `us-2c-3d` | 3rd Div A. Hays | division | yes | I | I | E | E | - | - | - |
| `us-2c-3d-carroll` | Carroll | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-3d-carroll-14in` | 14th IN | regiment | yes | I | E | P | E | P | I2P8E2 | `US.14IN` |
| `us-2c-3d-carroll-4oh` | 4th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-carroll-8oh` | 8th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-carroll-7wv` | 7th WV | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-smyth` | Smyth | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-3d-smyth-14ct` | 14th CT | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-smyth-1de` | 1st DE | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-smyth-12nj` | 12th NJ | regiment | yes | I | E | P | E | D* | I3P8E1 | `US.12NJ` |
| `us-2c-3d-smyth-10nybn` | 10th NY Bn | battalion | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-smyth-108ny` | 108th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-willard` | Willard | brigade | yes | I | I | E | E | - | - | - |
| `us-2c-3d-willard-39ny` | 39th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.39NY` |
| `us-2c-3d-willard-111ny` | 111th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-2c-3d-willard-125ny` | 125th NY | regiment | yes | I | E | P | E | P | I1P9E2 | `US.125NY` |
| `us-2c-3d-willard-126ny` | 126th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `US.MN_CO_L` | Minnesota Company L (sharpshooter detachment attached to the 1st Minnesota) | company | not in the roster | I | E | E | E | I* | I2P9E1 | `US.MN_CO_L` |

## us-3c-1d

Army of the Potomac, III Corps: corps headquarters and the 1st Division (Birney and Ward: Graham, Ward, de Trobriand)

24 units (24 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-3c` | III Corps | corps | yes | I | I | I | I | - | - | - |
| `us-3c-1d` | 1st Div Birney/Ward | division | yes | I | I | E | E | - | - | - |
| `us-3c-1d-graham` | Graham | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-1d-graham-57pa` | 57th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-graham-63pa` | 63rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-graham-68pa` | 68th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-graham-105pa` | 105th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-graham-114pa` | 114th PA | regiment | yes | I | E | P | E | P* | I5P6E1 | `US.114PA` |
| `us-3c-1d-graham-141pa` | 141st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward` | Ward | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-1d-ward-20in` | 20th IN | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-3me` | 3rd ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-4me` | 4th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-86ny` | 86th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-124ny` | 124th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-99pa` | 99th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-ward-1ussharpshooters` | 1st US Sharpshooters | regiment | yes | I | E | P | E | D* | D1I2P8E1 | `US.1USS` |
| `us-3c-1d-ward-2ussharpshooters` | 2nd US Sharpshooters | regiment | yes | I | E | P | E | D* | D1I3P7E1 | `US.2USS` |
| `us-3c-1d-trobriand` | de Trobriand | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-1d-trobriand-17me` | 17th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-trobriand-3mi` | 3rd MI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-trobriand-5mi` | 5th MI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-trobriand-40ny` | 40th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-1d-trobriand-110pa` | 110th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |

## us-3c-2d

Army of the Potomac, III Corps: 2nd Division (Humphreys: Carr, Brewster, Burling)

23 units (23 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-3c-2d` | 2nd Div Humphreys | division | yes | I | I | E | E | - | - | - |
| `us-3c-2d-carr` | Carr | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-2d-carr-1ma` | 1st MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-11ma` | 11th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-16ma` | 16th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-12nh` | 12th NH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-11nj` | 11th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-26pa` | 26th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-carr-84pa` | 84th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-brewster` | Brewster Excelsior | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-2d-brewster-70ny` | 70th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.70NY` |
| `us-3c-2d-brewster-71ny` | 71st NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.71NY` |
| `us-3c-2d-brewster-72ny` | 72nd NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.72NY` |
| `us-3c-2d-brewster-73ny` | 73rd NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.73NY` |
| `us-3c-2d-brewster-74ny` | 74th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.74NY` |
| `us-3c-2d-brewster-120ny` | 120th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.120NY` |
| `us-3c-2d-burling` | Burling | brigade | yes | I | I | E | E | - | - | - |
| `us-3c-2d-burling-2nh` | 2nd NH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-burling-5nj` | 5th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-burling-6nj` | 6th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-burling-7nj` | 7th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-burling-8nj` | 8th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-3c-2d-burling-115pa` | 115th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |

## us-5c

Army of the Potomac, V Corps: corps headquarters and the infantry of the three divisions (Barnes, Ayres, Crawford)

49 units (48 in the roster, 1 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-5c` | V Corps | corps | yes | I | I | I | I | - | - | - |
| `us-5c-1d` | 1st Div Barnes | division | yes | I | I | E | E | - | - | - |
| `us-5c-1d-tilton` | Tilton | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-1d-tilton-18ma` | 18th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-tilton-22ma` | 22nd MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-tilton-1mi` | 1st MI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-tilton-118pa` | 118th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-sweitzer` | Sweitzer | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-1d-sweitzer-9ma` | 9th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-sweitzer-32ma` | 32nd MA | regiment | partly | I | E | E | E | - | - | - |
| `us-5c-1d-sweitzer-4mi` | 4th MI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-sweitzer-62pa` | 62nd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-vincent` | Vincent (mw)/Rice | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-1d-vincent-20me` | 20th ME | regiment | yes | I | E | P | E | I* | I1P10E1 | `US.20ME` |
| `us-5c-1d-vincent-16mi` | 16th MI | regiment | yes | I | E | P | E | P | I1P10E1 | `US.16MI` |
| `us-5c-1d-vincent-44ny` | 44th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.44NY` |
| `us-5c-1d-vincent-83pa` | 83rd PA | regiment | yes | I | E | P | E | P | I1P10E1 | `US.83PA` |
| `us-5c-2d` | 2nd Div Ayres | division | yes | I | I | E | E | - | - | - |
| `us-5c-2d-day` | Day | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-2d-day-3us` | 3rd US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.3US` |
| `us-5c-2d-day-4us` | 4th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.4US` |
| `us-5c-2d-day-6us` | 6th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.6US` |
| `us-5c-2d-day-12us` | 12th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.12US` |
| `us-5c-2d-day-14us` | 14th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.14US` |
| `us-5c-2d-burbank` | Burbank | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-2d-burbank-2us` | 2nd US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.2US` |
| `us-5c-2d-burbank-7us` | 7th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.7US` |
| `us-5c-2d-burbank-10us` | 10th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.10US` |
| `us-5c-2d-burbank-11us` | 11th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.11US` |
| `us-5c-2d-burbank-17us` | 17th US | regiment | yes | I | E | P | E | P | I4P7E1 | `US.17US` |
| `us-5c-2d-weed` | Weed (k)/Garrard | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-2d-weed-140ny` | 140th NY | regiment | yes | I | E | P | E | P | I2P9E1 | `US.140NY` |
| `us-5c-2d-weed-146ny` | 146th NY | regiment | yes | I | E | P | E | P | I6P5E1 | `US.146NY` |
| `us-5c-2d-weed-91pa` | 91st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-2d-weed-155pa` | 155th PA | regiment | yes | I | E | P | E | P | I5P6E1 | `US.155PA` |
| `us-5c-3d` | 3rd Div Crawford (PA Reserves) | division | yes | I | I | E | E | - | - | - |
| `us-5c-3d-mccandless` | McCandless | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-3d-mccandless-1pareserves` | 1st PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-mccandless-2pareserves` | 2nd PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-mccandless-6pareserves` | 6th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-mccandless-13pareserves` | 13th PA Reserves | regiment | yes | I | E | P | E | P* | I2P9E1 | `US.13PAR` |
| `us-5c-3d-fisher` | Fisher | brigade | yes | I | I | E | E | - | - | - |
| `us-5c-3d-fisher-5pareserves` | 5th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-fisher-9pareserves` | 9th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-fisher-10pareserves` | 10th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-fisher-11pareserves` | 11th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-3d-fisher-12pareserves` | 12th PA Reserves | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-5c-1d-sweitzer-32ma-co-c` | 32nd MA Company C | company | no | I | E | E | E | P | I1P9E2 | - |
| `US.5NY_INF` | 5th New York Infantry (Duryee's Zouaves) | regiment | kit record: absent_from_gettysburg | I | E | E | E | E | E12 | `US.5NY_INF` |

## us-6c

Army of the Potomac, VI Corps: corps headquarters and the infantry of the three divisions (Wright, Howe, Newton and Wheaton)

49 units (49 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-6c` | VI Corps | corps | yes | I | I | I | I | - | - | - |
| `us-6c-1d` | 1st Div Wright | division | yes | I | I | E | E | - | - | - |
| `us-6c-1d-torbert` | Torbert | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-1d-torbert-1nj` | 1st NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-torbert-2nj` | 2nd NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-torbert-3nj` | 3rd NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-torbert-15nj` | 15th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-bartlett` | Bartlett/Upton | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-1d-bartlett-5me` | 5th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-bartlett-121ny` | 121st NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-bartlett-95pa` | 95th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-bartlett-96pa` | 96th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-russell` | Russell | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-1d-russell-6me` | 6th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-russell-49pa` | 49th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-russell-119pa` | 119th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-1d-russell-5wi` | 5th WI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d` | 2nd Div Howe | division | yes | I | I | E | E | - | - | - |
| `us-6c-2d-grant` | Grant | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-2d-grant-2vt` | 2nd VT | regiment | yes | I | E | P | E | P | I1P10E1 | `US.VI_2VT` |
| `us-6c-2d-grant-3vt` | 3rd VT | regiment | yes | I | E | P | E | P | I1P10E1 | `US.VI_3VT` |
| `us-6c-2d-grant-4vt` | 4th VT | regiment | yes | I | E | P | E | P | I1P10E1 | `US.VI_4VT` |
| `us-6c-2d-grant-5vt` | 5th VT | regiment | yes | I | E | P | E | P | I1P10E1 | `US.VI_5VT` |
| `us-6c-2d-grant-6vt` | 6th VT | regiment | yes | I | E | P | E | P | I1P10E1 | `US.VI_6VT` |
| `us-6c-2d-neill` | Neill | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-2d-neill-7me` | 7th ME | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-neill-33ny` | 33rd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-neill-43ny` | 43rd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-neill-49ny` | 49th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-neill-77ny` | 77th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-neill-61pa` | 61st PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d` | 3rd Div Newton/Wheaton | division | yes | I | I | E | E | - | - | - |
| `us-6c-3d-shaler` | Shaler | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-3d-shaler-65ny` | 65th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-shaler-67ny` | 67th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-shaler-122ny` | 122nd NY | regiment | yes | I | E | P | E | P | I2P8E2 | `US.122NY` |
| `us-6c-3d-shaler-23pa` | 23rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-shaler-82pa` | 82nd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-eustis` | Eustis | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-3d-eustis-7ma` | 7th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-eustis-10ma` | 10th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-eustis-37ma` | 37th MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-eustis-2ri` | 2nd RI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-wheaton` | Wheaton/Nevin | brigade | yes | I | I | E | E | - | - | - |
| `us-6c-3d-wheaton-62ny` | 62nd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-wheaton-93pa` | 93rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-wheaton-98pa` | 98th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-3d-wheaton-139pa` | 139th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-6c-2d-1brig` | 1st Brigade | brigade | no | I | E | E | E | - | - | - |

## us-11c

Army of the Potomac, XI Corps: corps headquarters and the infantry of the three divisions (Barlow and Ames, von Steinwehr, Schurz)

36 units (36 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-11c` | XI Corps | corps | yes | I | I | I | I | - | - | - |
| `us-11c-1d` | 1st Div Barlow (w)/Ames | division | yes | I | I | E | E | - | - | - |
| `us-11c-1d-gilsa` | von Gilsa | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-1d-gilsa-41ny` | 41st NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-1d-gilsa-54ny` | 54th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.54NY` |
| `us-11c-1d-gilsa-68ny` | 68th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.68NY` |
| `us-11c-1d-gilsa-153pa` | 153rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-1d-ames` | Ames/Harris | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-1d-ames-17ct` | 17th CT | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-1d-ames-25oh` | 25th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-1d-ames-75oh` | 75th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-1d-ames-107oh` | 107th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d` | 2nd Div von Steinwehr | division | yes | I | I | E | E | - | - | - |
| `us-11c-2d-coster` | Coster | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-2d-coster-134ny` | 134th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.134NY` |
| `us-11c-2d-coster-154ny` | 154th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.154NY` |
| `us-11c-2d-coster-27pa` | 27th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d-coster-73pa` | 73rd PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d-smith` | Smith | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-2d-smith-33ma` | 33rd MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d-smith-136ny` | 136th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d-smith-55oh` | 55th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-2d-smith-73oh` | 73rd OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-3d` | 3rd Div Schurz/Schimmelfennig | division | yes | I | I | E | E | - | - | - |
| `us-11c-3d-schimmelfennig` | Schimmelfennig/von Amsberg | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-3d-schimmelfennig-82il` | 82nd IL | regiment | yes | I | E | P | E | P | I1P10E1 | `US.82IL` |
| `us-11c-3d-schimmelfennig-45ny` | 45th NY | regiment | yes | I | E | P | E | I* | I1P10E1 | `US.45NY` |
| `us-11c-3d-schimmelfennig-157ny` | 157th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-3d-schimmelfennig-61oh` | 61st OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-3d-schimmelfennig-74pa` | 74th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-3d-krzyzanowski` | Krzyzanowski | brigade | yes | I | I | E | E | - | - | - |
| `us-11c-3d-krzyzanowski-58ny` | 58th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.58NY` |
| `us-11c-3d-krzyzanowski-119ny` | 119th NY | regiment | yes | I | E | P | E | P | I1P10E1 | `US.119NY` |
| `us-11c-3d-krzyzanowski-82oh` | 82nd OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-11c-3d-krzyzanowski-75pa` | 75th PA | regiment | yes | I | E | P | E | P | I1P10E1 | `US.75PA` |
| `us-11c-3d-krzyzanowski-26wi` | 26th WI | regiment | yes | I | E | P | E | P | I1P10E1 | `US.26WI` |

## us-12c

Army of the Potomac, XII Corps: corps headquarters and the infantry of the two divisions (Williams and Ruger, Geary)

37 units (37 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-12c` | XII Corps | corps | yes | I | I | I | I | - | - | - |
| `us-12c-1d` | 1st Div Williams/Ruger | division | yes | I | I | E | E | - | - | - |
| `us-12c-1d-mcdougall` | McDougall | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-1d-mcdougall-5ct` | 5th CT | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-mcdougall-20ct` | 20th CT | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-mcdougall-3md` | 3rd MD | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-mcdougall-123ny` | 123rd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-mcdougall-145ny` | 145th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-mcdougall-46pa` | 46th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-colgrove` | Colgrove | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-1d-colgrove-27in` | 27th IN | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-colgrove-2ma` | 2nd MA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-colgrove-13nj` | 13th NJ | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-colgrove-107ny` | 107th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-colgrove-3wi` | 3rd WI | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-lockwood` | Lockwood | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-1d-lockwood-1mdphb` | 1st MD PHB | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-lockwood-1mdeasternshore` | 1st MD Eastern Shore | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-1d-lockwood-150ny` | 150th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d` | 2nd Div Geary | division | yes | I | I | E | E | - | - | - |
| `us-12c-2d-candy` | Candy | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-2d-candy-5oh` | 5th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-candy-7oh` | 7th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-candy-29oh` | 29th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-candy-66oh` | 66th OH | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-candy-28pa` | 28th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-candy-147pa` | 147th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-kane` | Kane | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-2d-kane-29pa` | 29th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-kane-109pa` | 109th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-kane-111pa` | 111th PA | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-greene` | Greene | brigade | yes | I | I | E | E | - | - | - |
| `us-12c-2d-greene-60ny` | 60th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-greene-78ny` | 78th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-greene-102ny` | 102nd NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |
| `us-12c-2d-greene-137ny` | 137th NY | regiment | yes | I | E | P | E | P | I1P9E2 | `US.137NY` |
| `us-12c-2d-greene-149ny` | 149th NY | regiment | yes | I | E | P | E | P | I1P9E2 | - |

## us-art-corps

Army of the Potomac, the seven corps artillery brigades (Wainwright, Hazard, Randolph and Clark, Martin, Tompkins, Osborn, Muhlenberg)

45 units (45 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-1c-art` | Artillery Wainwright | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-1c-art-2me` | 2nd ME | battery | yes | I | I | P | E | G | I4P6E2 | `US.ART.2nd_Maine_B` |
| `us-1c-art-5me` | 5th ME | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.5th_Maine_E` |
| `us-1c-art-1nye` | 1st NY E | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY_E_L` |
| `us-1c-art-1nyl` | 1st NY L | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY_E_L` |
| `us-1c-art-1pab` | 1st PA B | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_Pa_B` |
| `us-1c-art-4usb` | 4th US B | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.4th_US_B` |
| `us-2c-art` | Artillery Hazard | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-2c-art-1nyb` | 1st NY B | battery | yes | I | I* | P | E | I* | I4P6E2 | `US.ART.1st_NY_B` |
| `us-2c-art-1ria` | 1st RI A | battery | yes | I | I* | P | E | I* | I4P6E2 | `US.ART.1st_RI_A` |
| `us-2c-art-1rib` | 1st RI B | battery | yes | I | I* | P | E | I* | I4P6E2 | `US.ART.1st_RI_B` |
| `us-2c-art-1usi` | 1st US I | battery | yes | I | I* | P | E | I* | I4P6E2 | `US.ART.1st_US_I` |
| `us-2c-art-4usa` | 4th US A | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.4th_US_A` |
| `us-3c-art` | Artillery Randolph/Clark | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-3c-art-1njb` | 1st NJ B | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NJ_B` |
| `us-3c-art-1nyd` | 1st NY D | battery | yes | I | I | P | E | G | I4P6E2 | `US.ART.1st_NY_D` |
| `us-3c-art-4ny` | 4th NY | battery | yes | I | I | P | E | D* | I4P6E2 | `US.ART.4th_NY` |
| `us-3c-art-1rie` | 1st RI E | battery | yes | I | I | P | E | G | I4P6E2 | `US.ART.1st_RI_E` |
| `us-3c-art-4usk` | 4th US K | battery | yes | I | I | P | E | G | I4P6E2 | `US.ART.4th_US_K` |
| `us-5c-art` | Artillery Martin | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-5c-art-3ma` | 3rd MA | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.3rd_Mass` |
| `us-5c-art-1nyc` | 1st NY C | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY_C` |
| `us-5c-art-1ohl` | 1st OH L | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_Ohio_L` |
| `us-5c-art-5usd` | 5th US D | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.5th_US_D` |
| `us-5c-art-5usi` | 5th US I | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.5th_US_I` |
| `us-6c-art` | Artillery Tompkins | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-6c-art-1maa` | 1st MA A | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_Mass` |
| `us-6c-art-1ny` | 1st NY | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY` |
| `us-6c-art-3ny` | 3rd NY | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.3rd_NY` |
| `us-6c-art-1ric` | 1st RI C | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_RI_C` |
| `us-6c-art-1rig` | 1st RI G | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_RI_G` |
| `us-6c-art-2usd` | 2nd US D | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.2nd_US_D` |
| `us-6c-art-2usg` | 2nd US G | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.2nd_US_G` |
| `us-6c-art-5usf` | 5th US F | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.5th_US_F` |
| `us-11c-art` | Artillery Osborn | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-11c-art-1nyi` | 1st NY I | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY_I` |
| `us-11c-art-13ny` | 13th NY | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.13th_NY` |
| `us-11c-art-1ohi` | 1st OH I | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_Ohio_I` |
| `us-11c-art-1ohk` | 1st OH K | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_Ohio_K` |
| `us-11c-art-4usg` | 4th US G | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.4th_US_G` |
| `us-12c-art` | Artillery Muhlenberg | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-12c-art-1nym` | 1st NY M | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.1st_NY_M` |
| `us-12c-art-pae` | PA E | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.Pa_E` |
| `us-12c-art-4usf` | 4th US F | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.4th_US_F` |
| `us-12c-art-5usk` | 5th US K | battery | yes | I | I* | P | E | G | I4P6E2 | `US.ART.5th_US_K` |

## us-art-reserve-horse

Army of the Potomac, Artillery Reserve (Tyler: five brigades and the train guard) and the two horse artillery brigades of the Cavalry Corps (Robertson, Tidball)

41 units (33 in the roster, 8 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-cav-art` | Horse Artillery | artillery_brigade | yes | I | I | P | E | E | - | - |
| `us-art-reserve` | Artillery Reserve | corps | yes | I | I | I | I | - | - | - |
| `us-art-reserve-ransom` | 1st Regular Brigade | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-art-reserve-ransom-1ush` | 1st US H | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_US_H` |
| `us-art-reserve-ransom-3usf` | 3rd US F | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.3rd_US_F_K` |
| `us-art-reserve-ransom-3usk` | 3rd US K | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.3rd_US_F_K` |
| `us-art-reserve-ransom-4usc` | 4th US C | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.4th_US_C` |
| `us-art-reserve-ransom-5usc` | 5th US C | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.5th_US_C` |
| `us-art-reserve-mcgilvery` | 1st Volunteer Brigade | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-art-reserve-mcgilvery-5ma` | 5th MA | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.5th_Massachusetts` |
| `us-art-reserve-mcgilvery-9ma` | 9th MA | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.9th_Massachusetts` |
| `us-art-reserve-mcgilvery-15ny` | 15th NY | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.15th_New_York` |
| `us-art-reserve-mcgilvery-pac` | PA C | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.Pa_Independent_C_F` |
| `us-art-reserve-mcgilvery-paf` | PA F | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.Pa_Independent_C_F` |
| `us-art-reserve-taft` | 2nd Vol Brigade | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-art-reserve-taft-1ctheavy` | 1st CT Heavy | battery | partly | I | E | E | E | - | - | `US.ART.1st_Conn_Heavy_B_and_H` |
| `us-art-reserve-taft-2ct` | 2nd CT | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.2nd_Connecticut` |
| `us-art-reserve-taft-5ny` | 5th NY | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.5th_New_York` |
| `us-art-reserve-huntington` | 3rd Vol Brigade | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-art-reserve-huntington-1nh` | 1st NH | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_New_Hampshire` |
| `us-art-reserve-huntington-1ohh` | 1st OH H | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_Ohio_H` |
| `us-art-reserve-huntington-1paf` | 1st PA F | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_Pennsylvania_F_G` |
| `us-art-reserve-huntington-1pag` | 1st PA G | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_Pennsylvania_F_G` |
| `us-art-reserve-huntington-wvc` | WV C | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.W_Va_C` |
| `us-art-reserve-fitzhugh` | 4th Vol Brigade | artillery_brigade | yes | I | I | E | E | - | - | - |
| `us-art-reserve-fitzhugh-6me` | 6th ME | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.6th_Maine` |
| `us-art-reserve-fitzhugh-mda` | MD A | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.Md_A` |
| `us-art-reserve-fitzhugh-1nj` | 1st NJ | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_NJ` |
| `us-art-reserve-fitzhugh-1nyg` | 1st NY G | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_NY_G` |
| `us-art-reserve-fitzhugh-1nyk` | 1st NY K | battery | yes | I | D* | P | E | D* | I4P6E2 | `US.ART.1st_NY_K_with_11th_NY_attached` |
| `us-art-reserve-taft-1ctheavy-b` | 1st CT Heavy B | battery | no | I | E | E | E | G | I4P6E2 | `US.ART.1st_Conn_Heavy_B_and_H` |
| `us-art-reserve-taft-1ctheavy-m` | 1st CT Heavy M | battery | no | I | E | E | E | G | I4P6E2 | `US.ART.1st_Conn_Heavy_B_and_H` |
| `us-4nj-train-guard` | 4th NJ | regiment | no | I | E | E | E | P | I1P9E2 | - |
| `US.ART.9th_Mich` | 9th Mich. | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.9th_Mich` |
| `US.ART.6th_NY` | 6th NY | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.6th_NY` |
| `US.ART.2nd_US_B_L` | 2nd US B & L | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.2nd_US_B_L` |
| `US.ART.2nd_US_M` | 2nd US M | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.2nd_US_M` |
| `US.ART.4th_US_E` | 4th US E | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.4th_US_E` |
| `US.ART.1st_US_E_G` | 1st US E & G | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.1st_US_E_G` |
| `US.ART.1st_US_K` | 1st US K | battery | not in the roster | I | I* | E | E | G | I4P6E2 | `US.ART.1st_US_K` |
| `US.ART.2nd_US_A` | 2nd US A | battery | not in the roster | D | D* | E | E | D* | I4P6E2 | `US.ART.2nd_US_A` |

## us-cav

Army of the Potomac, Cavalry Corps: corps headquarters and the three divisions (Buford, D. McM. Gregg, Kilpatrick)

44 units (42 in the roster, 2 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-cav` | Cavalry Corps | corps | yes | I | I | I | I | - | - | - |
| `us-cav-1d` | 1st Div Buford | division | yes | I | I | E | E | - | - | - |
| `us-cav-1d-gamble` | Gamble | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-1d-gamble-8il` | 8th IL | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.8IL` |
| `us-cav-1d-gamble-12il` | 12th IL | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.12IL` |
| `us-cav-1d-gamble-3in` | 3rd IN | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.3IN` |
| `us-cav-1d-gamble-8ny` | 8th NY | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.8NY` |
| `us-cav-1d-devin` | Devin | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-1d-devin-6ny` | 6th NY | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.6NY` |
| `us-cav-1d-devin-9ny` | 9th NY | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.9NY` |
| `us-cav-1d-devin-17pa` | 17th PA | regiment | yes | I | I* | P | E | I* | I4P7E1 | `US.CAV.17PA` |
| `us-cav-1d-devin-3wvaandc` | 3rd WV A and C | regiment | yes | I | E | P | E | P | I4P7E1 | - |
| `us-cav-1d-merritt` | Merritt reserve | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-1d-merritt-6pa` | 6th PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.6PA` |
| `us-cav-1d-merritt-1us` | 1st US | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1US` |
| `us-cav-1d-merritt-2us` | 2nd US | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.2US` |
| `us-cav-1d-merritt-5us` | 5th US | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.5US` |
| `us-cav-1d-merritt-6us` | 6th US | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.6US` |
| `us-cav-2d` | 2nd Div D. Gregg | division | yes | I | I | E | E | - | - | - |
| `us-cav-2d-mcintosh` | McIntosh | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-2d-mcintosh-1md` | 1st MD | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1MD` |
| `us-cav-2d-mcintosh-1ma` | 1st MA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1MA` |
| `us-cav-2d-mcintosh-1nj` | 1st NJ | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1NJ` |
| `us-cav-2d-mcintosh-1pa` | 1st PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1PA` |
| `us-cav-2d-mcintosh-3pa` | 3rd PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.3PA` |
| `us-cav-2d-gregg` | J. I. Gregg | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-2d-gregg-1me` | 1st ME | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1ME` |
| `us-cav-2d-gregg-10ny` | 10th NY | regiment | yes | I | I* | P | E | D* | I4P7E1 | `US.CAV.10NY` |
| `us-cav-2d-gregg-4pa` | 4th PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.4PA` |
| `us-cav-2d-gregg-16pa` | 16th PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.16PA` |
| `us-cav-3d` | 3rd Div Kilpatrick | division | yes | I | I | E | E | - | - | - |
| `us-cav-3d-farnsworth` | Farnsworth (k)/Richmond | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-3d-farnsworth-5ny` | 5th NY | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.5NY` |
| `us-cav-3d-farnsworth-18pa` | 18th PA | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.18PA` |
| `us-cav-3d-farnsworth-1vt` | 1st VT | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1VT` |
| `us-cav-3d-farnsworth-1wv` | 1st WV | regiment | yes | I | I* | P | E | P | I4P7E1 | `US.CAV.1WV` |
| `us-cav-3d-custer` | Custer | brigade | yes | I | I | E | E | - | - | - |
| `us-cav-3d-custer-1mi` | 1st MI | regiment | yes | I | I* | P | E | P* | I4P7E1 | `US.CAV.1MICH` |
| `us-cav-3d-custer-5mi` | 5th MI | regiment | yes | I | I* | P | E | D* | I4P7E1 | `US.CAV.5MICH` |
| `us-cav-3d-custer-6mi` | 6th MI | regiment | yes | I | I* | P | E | P* | I4P7E1 | `US.CAV.6MICH` |
| `us-cav-3d-custer-7mi` | 7th MI | regiment | yes | I | I* | P | E | P* | I4P7E1 | `US.CAV.7MICH` |
| `us-cav-2d-huey` | Huey's 2nd Brigade | brigade | no | I | I | E | E | - | - | - |
| `US.CAV.3WV` | 3rd West Virginia Cavalry (Cos A, C) | regiment | not in the roster | I | I* | E | E | I* | I4P7E1 | `US.CAV.3WV` |
| `US.CAV.PURNELL_A` | Purnell Legion Co A | regiment | not in the roster | I | I* | E | E | P | I4P7E1 | `US.CAV.PURNELL_A` |

## army-hq

Headquarters of both armies with their guards, escorts, engineers, signal and support troops, and the army-wide kit records and defaults

27 units (4 in the roster, 23 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `us-aop` | Army of the Potomac | army | yes | I | I | E | E | - | - | - |
| `cs-anv` | Army of Northern Virginia | army | yes | I | I | E | E | - | - | - |
| `us-aop-hq` | Army headquarters | headquarters | yes | I | I | E | E | - | - | - |
| `cs-anv-hq` | Army headquarters | headquarters | yes | I | I | E | E | - | - | - |
| `CS.OTHERS` | others (not individually named) | brigade | not in the roster | I | E | E | E | P | I1P10E1 | `CS.OTHERS` |
| `CS.SCSSBN` | South Carolina sharpshooter battalion | battalion | not in the roster | I | E | E | E | D* | I1P10E1 | `CS.SCSSBN` |
| `CS.SS_GENERIC` | Other Confederate sharpshooter battalions (about 16 fielded) | battalion | not in the roster | I | E | E | E | D* | I1P10E1 | `CS.SS_GENERIC` |
| `US.SUP.AMBULANCE` | Ambulance Corps (Union) | group | not in the roster | I | E | E | E | P | I2P8E2 | `US.SUP.AMBULANCE` |
| `US.SUP.STRETCHER` | Stretcher bearers | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.STRETCHER` |
| `US.SUP.MEDICAL` | Hospital stewards and surgeons (Union) | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.MEDICAL` |
| `CS.SUP.MEDICAL` | Confederate medical staff | group | not in the roster | I | E | E | E | P | I1P10E1 | `CS.SUP.MEDICAL` |
| `US.SUP.MUSICIAN` | Musicians (infantry) | group | not in the roster | I | E | E | E | P | I2P8E2 | `US.SUP.MUSICIAN` |
| `US.SUP.PROVOST` | Provost guards | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.PROVOST` |
| `US.SUP.ENGINEER` | Pioneers and engineers | group | not in the roster | I | E | E | E | P | P10E2 | `US.SUP.ENGINEER` |
| `US.SUP.SIGNAL` | Signal Corps | group | not in the roster | I | E | E | E | P | I2P8E2 | `US.SUP.SIGNAL` |
| `US.SUP.TEAMSTER` | Teamsters and wagoners | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.TEAMSTER` |
| `US.SUP.SUTLER` | Sutlers | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.SUTLER` |
| `US.SUP.ORDNANCE` | Ordnance (regimental ordnance officers and sergeants) | group | not in the roster | I | E | E | E | P | I1P9E2 | `US.SUP.ORDNANCE` |
| `default.union.infantry` | default record: default.union.infantry | default | default every unit of that army and arm inherits | - | - | - | - | P* | I1P9E2 | `default.union.infantry` |
| `default.union.xi_corps_german` | default record: default.union.xi_corps_german | default | default every unit of that army and arm inherits | - | - | - | - | P | I1P10E1 | `default.union.xi_corps_german` |
| `default.union.officers` | default record: default.union.officers | default | default every unit of that army and arm inherits | - | - | - | - | - | D1I5P1E5 | `default.union.officers` |
| `default.union.artillery` | default record: default.union.artillery | default | default every unit of that army and arm inherits | - | - | - | - | P | I4P6E2 | `default.union.artillery` |
| `default.union.cavalry` | default record: default.union.cavalry | default | default every unit of that army and arm inherits | - | - | - | - | P* | I4P7E1 | `default.union.cavalry` |
| `default.confederate.infantry` | default record: default.confederate.infantry | default | default every unit of that army and arm inherits | - | - | - | - | P* | I1P10E1 | `default.confederate.infantry` |
| `default.confederate.officers` | default record: default.confederate.officers | default | default every unit of that army and arm inherits | - | - | - | - | - | D3I2E7 | `default.confederate.officers` |
| `default.confederate.artillery` | default record: default.confederate.artillery | default | default every unit of that army and arm inherits | - | - | - | - | P | I3P8E1 | `default.confederate.artillery` |
| `default.confederate.cavalry` | default record: default.confederate.cavalry | default | default every unit of that army and arm inherits | - | - | - | - | P* | I3P8E1 | `default.confederate.cavalry` |

## cs-mclaws

Army of Northern Virginia, First Corps headquarters and McLaws' division (Kershaw, Barksdale, Semmes, Wofford)

26 units (26 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-1c` | I Corps | corps | yes | I | I | I | I | - | - | - |
| `cs-1c-mclaws` | McLaws | division | yes | I | I | E | E | - | - | - |
| `cs-1c-mclaws-kershaw` | Kershaw | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-mclaws-kershaw-2sc` | 2nd SC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-kershaw-3sc` | 3rd SC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-kershaw-7sc` | 7th SC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-kershaw-8sc` | 8th SC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-kershaw-15sc` | 15th SC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-kershaw-3scbn` | 3rd SC Bn | battalion | yes | I | E | P | E | P | I1P10E1 | `CS.KERSHAW` |
| `cs-1c-mclaws-barksdale` | Barksdale | brigade | yes | I | I | I | I | - | - | - |
| `cs-1c-mclaws-barksdale-13ms` | 13th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BARKSDALE` |
| `cs-1c-mclaws-barksdale-17ms` | 17th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BARKSDALE` |
| `cs-1c-mclaws-barksdale-18ms` | 18th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BARKSDALE` |
| `cs-1c-mclaws-barksdale-21ms` | 21st MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BARKSDALE` |
| `cs-1c-mclaws-semmes` | Semmes | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-mclaws-semmes-10ga` | 10th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SEMMES` |
| `cs-1c-mclaws-semmes-50ga` | 50th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SEMMES` |
| `cs-1c-mclaws-semmes-51ga` | 51st GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SEMMES` |
| `cs-1c-mclaws-semmes-53ga` | 53rd GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SEMMES` |
| `cs-1c-mclaws-wofford` | Wofford | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-mclaws-wofford-16ga` | 16th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WOFFORD` |
| `cs-1c-mclaws-wofford-18ga` | 18th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WOFFORD` |
| `cs-1c-mclaws-wofford-24ga` | 24th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WOFFORD` |
| `cs-1c-mclaws-wofford-cobbslegion` | Cobb’s Legion | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WOFFORD` |
| `cs-1c-mclaws-wofford-phillipslegion` | Phillips Legion | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WOFFORD` |
| `cs-1c-mclaws-wofford-3gasharpshooters` | 3rd GA Sharpshooters | regiment | yes | I | E | P | E | D* | I1P10E1 | `CS.3GASSBN` |

## cs-pickett

Army of Northern Virginia, First Corps: Pickett's division (Garnett, Kemper, Armistead; Corse's brigade not on the field)

20 units (20 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-1c-pickett` | Pickett | division | yes | I | I | E | E | - | - | - |
| `cs-1c-pickett-garnett` | Garnett | brigade | yes | I | I | I | I | - | - | - |
| `cs-1c-pickett-garnett-8va` | 8th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GARNETT` |
| `cs-1c-pickett-garnett-18va` | 18th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GARNETT` |
| `cs-1c-pickett-garnett-19va` | 19th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GARNETT` |
| `cs-1c-pickett-garnett-28va` | 28th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GARNETT` |
| `cs-1c-pickett-garnett-56va` | 56th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GARNETT` |
| `cs-1c-pickett-kemper` | Kemper | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-pickett-kemper-1va` | 1st VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KEMPER` |
| `cs-1c-pickett-kemper-3va` | 3rd VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KEMPER` |
| `cs-1c-pickett-kemper-7va` | 7th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KEMPER` |
| `cs-1c-pickett-kemper-11va` | 11th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KEMPER` |
| `cs-1c-pickett-kemper-24va` | 24th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.KEMPER` |
| `cs-1c-pickett-armistead` | Armistead | brigade | yes | I | I | I | I | - | - | - |
| `cs-1c-pickett-armistead-9va` | 9th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ARMISTEAD` |
| `cs-1c-pickett-armistead-14va` | 14th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ARMISTEAD` |
| `cs-1c-pickett-armistead-38va` | 38th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ARMISTEAD` |
| `cs-1c-pickett-armistead-53va` | 53rd VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ARMISTEAD` |
| `cs-1c-pickett-armistead-57va` | 57th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ARMISTEAD` |
| `cs-corse-hanover-junction` | Corse’s Brigade | brigade | no | I | I | E | E | - | - | - |

## cs-hood

Army of Northern Virginia, First Corps: Hood's division (Law, Robertson, G. T. Anderson, Benning)

23 units (23 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-1c-hood` | Hood/Law | division | yes | I | I | E | E | - | - | - |
| `cs-1c-hood-law` | Law | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-hood-law-4al` | 4th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LAW` |
| `cs-1c-hood-law-15al` | 15th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LAW` |
| `cs-1c-hood-law-44al` | 44th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LAW` |
| `cs-1c-hood-law-47al` | 47th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LAW` |
| `cs-1c-hood-law-48al` | 48th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LAW` |
| `cs-1c-hood-robertson` | Robertson | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-hood-robertson-3ar` | 3rd AR | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.3AR` |
| `cs-1c-hood-robertson-1tx` | 1st TX | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.1TX` |
| `cs-1c-hood-robertson-4tx` | 4th TX | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.4TX` |
| `cs-1c-hood-robertson-5tx` | 5th TX | regiment | yes | I | E | P | E | I* | I1P10E1 | `CS.5TX` |
| `cs-1c-hood-anderson` | G. T. Anderson | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-hood-anderson-7ga` | 7th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ANDERSON_GA` |
| `cs-1c-hood-anderson-8ga` | 8th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ANDERSON_GA` |
| `cs-1c-hood-anderson-9ga` | 9th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ANDERSON_GA` |
| `cs-1c-hood-anderson-11ga` | 11th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ANDERSON_GA` |
| `cs-1c-hood-anderson-59ga` | 59th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.ANDERSON_GA` |
| `cs-1c-hood-benning` | Benning | brigade | yes | I | I | E | E | - | - | - |
| `cs-1c-hood-benning-2ga` | 2nd GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BENNING` |
| `cs-1c-hood-benning-15ga` | 15th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BENNING` |
| `cs-1c-hood-benning-17ga` | 17th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BENNING` |
| `cs-1c-hood-benning-20ga` | 20th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.BENNING` |

## cs-early

Army of Northern Virginia, Second Corps headquarters and Early's division (Hays, Smith, Hoke and Avery, Gordon)

25 units (25 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-2c` | II Corps | corps | yes | I | I | I | I | - | - | - |
| `cs-2c-early` | Early | division | yes | I | I | E | E | - | - | - |
| `cs-2c-early-hays` | Hays’s Louisiana | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-early-hays-5la` | 5th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.5LA` |
| `cs-2c-early-hays-6la` | 6th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.6LA` |
| `cs-2c-early-hays-7la` | 7th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.7LA` |
| `cs-2c-early-hays-8la` | 8th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.8LA` |
| `cs-2c-early-hays-9la` | 9th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.9LA` |
| `cs-2c-early-smith` | W. Smith | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-early-smith-31va` | 31st VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-early-smith-49va` | 49th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-early-smith-52va` | 52nd VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-early-hoke` | Hoke/Avery | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-early-hoke-6nc` | 6th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.HOKE` |
| `cs-2c-early-hoke-21nc` | 21st NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.HOKE` |
| `cs-2c-early-hoke-57nc` | 57th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.HOKE` |
| `cs-2c-early-gordon` | Gordon | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-early-gordon-13ga` | 13th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-2c-early-gordon-26ga` | 26th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-2c-early-gordon-31ga` | 31st GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-2c-early-gordon-38ga` | 38th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-2c-early-gordon-60ga` | 60th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-2c-early-gordon-61ga` | 61st GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.GORDON` |
| `cs-13va-winchester` | 13th VA | regiment | no | I | E | E | E | P | I1P10E1 | - |
| `cs-58va-winchester` | 58th VA | regiment | no | I | E | E | E | P | I1P10E1 | - |

## cs-johnson

Army of Northern Virginia, Second Corps: Johnson's division (Steuart, Stonewall Brigade, Nicholls and Williams, J. M. Jones)

27 units (27 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-2c-johnson` | Johnson | division | yes | I | I | E | E | - | - | - |
| `cs-2c-johnson-steuart` | Steuart | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-johnson-steuart-1mdbn` | 1st MD Bn | battalion | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-steuart-1nc` | 1st NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-steuart-3nc` | 3rd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-steuart-10va` | 10th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-steuart-23va` | 23rd VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-steuart-37va` | 37th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STEUART_NC` |
| `cs-2c-johnson-stonewall` | Stonewall | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-johnson-stonewall-2va` | 2nd VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STONEWALL` |
| `cs-2c-johnson-stonewall-4va` | 4th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STONEWALL` |
| `cs-2c-johnson-stonewall-5va` | 5th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STONEWALL` |
| `cs-2c-johnson-stonewall-27va` | 27th VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STONEWALL` |
| `cs-2c-johnson-stonewall-33va` | 33rd VA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.STONEWALL` |
| `cs-2c-johnson-nicholls` | Nicholls/Williams | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-johnson-nicholls-1la` | 1st LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.1LA` |
| `cs-2c-johnson-nicholls-2la` | 2nd LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.2LA` |
| `cs-2c-johnson-nicholls-10la` | 10th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.10LA` |
| `cs-2c-johnson-nicholls-14la` | 14th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.14LA` |
| `cs-2c-johnson-nicholls-15la` | 15th LA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.15LA` |
| `cs-2c-johnson-jones` | J. M. Jones | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-johnson-jones-21va` | 21st VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-johnson-jones-25va` | 25th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-johnson-jones-42va` | 42nd VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-johnson-jones-44va` | 44th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-johnson-jones-48va` | 48th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-johnson-jones-50va` | 50th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |

## cs-rodes

Army of Northern Virginia, Second Corps: Rodes' division (Daniel, Doles, Iverson, Ramseur, O'Neal)

29 units (28 in the roster, 1 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-2c-rodes` | Rodes | division | yes | I | I | E | E | - | - | - |
| `cs-2c-rodes-daniel` | Daniel | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-rodes-daniel-32nc` | 32nd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DANIEL` |
| `cs-2c-rodes-daniel-43nc` | 43rd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DANIEL` |
| `cs-2c-rodes-daniel-45nc` | 45th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DANIEL` |
| `cs-2c-rodes-daniel-53nc` | 53rd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DANIEL` |
| `cs-2c-rodes-daniel-2ncbn` | 2nd NC Bn | battalion | yes | I | E | P | E | P | I1P10E1 | `CS.DANIEL` |
| `cs-2c-rodes-doles` | Doles | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-rodes-doles-4ga` | 4th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DOLES` |
| `cs-2c-rodes-doles-12ga` | 12th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DOLES` |
| `cs-2c-rodes-doles-21ga` | 21st GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DOLES` |
| `cs-2c-rodes-doles-44ga` | 44th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DOLES` |
| `cs-2c-rodes-iverson` | Iverson | brigade | yes | I | I | I | I | - | - | - |
| `cs-2c-rodes-iverson-5nc` | 5th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.IVERSON` |
| `cs-2c-rodes-iverson-12nc` | 12th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.IVERSON` |
| `cs-2c-rodes-iverson-20nc` | 20th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.IVERSON` |
| `cs-2c-rodes-iverson-23nc` | 23rd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.IVERSON` |
| `cs-2c-rodes-ramseur` | Ramseur | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-rodes-ramseur-2nc` | 2nd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.RAMSEUR` |
| `cs-2c-rodes-ramseur-4nc` | 4th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.RAMSEUR` |
| `cs-2c-rodes-ramseur-14nc` | 14th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.RAMSEUR` |
| `cs-2c-rodes-ramseur-30nc` | 30th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.RAMSEUR` |
| `cs-2c-rodes-oneal` | O’Neal | brigade | yes | I | I | E | E | - | - | - |
| `cs-2c-rodes-oneal-3al` | 3rd AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-rodes-oneal-5al` | 5th AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-rodes-oneal-6al` | 6th AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-rodes-oneal-12al` | 12th AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-2c-rodes-oneal-26al` | 26th AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `CS.5ALBN` | 5th Alabama Battalion (Blackford's sharpshooters) | battalion | not in the roster | I | E | E | E | I* | I1P10E1 | `CS.5ALBN` |

## cs-anderson

Army of Northern Virginia, Third Corps headquarters and R. H. Anderson's division (Wilcox, Mahone, Wright, Perry and Lang, Posey)

28 units (28 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-3c` | III Corps | corps | yes | I | I | I | I | - | - | - |
| `cs-3c-anderson` | R. H. Anderson | division | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-wilcox` | Wilcox | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-wilcox-8al` | 8th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WILCOX` |
| `cs-3c-anderson-wilcox-9al` | 9th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WILCOX` |
| `cs-3c-anderson-wilcox-10al` | 10th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WILCOX` |
| `cs-3c-anderson-wilcox-11al` | 11th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WILCOX` |
| `cs-3c-anderson-wilcox-14al` | 14th AL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WILCOX` |
| `cs-3c-anderson-mahone` | Mahone | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-mahone-6va` | 6th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-anderson-mahone-12va` | 12th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-anderson-mahone-16va` | 16th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-anderson-mahone-41va` | 41st VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-anderson-mahone-61va` | 61st VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-anderson-wright` | Wright | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-wright-3ga` | 3rd GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WRIGHT` |
| `cs-3c-anderson-wright-22ga` | 22nd GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WRIGHT` |
| `cs-3c-anderson-wright-48ga` | 48th GA | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.WRIGHT` |
| `cs-3c-anderson-wright-2gabn` | 2nd GA Bn | battalion | yes | I | E | P | E | P | I1P10E1 | `CS.WRIGHT` |
| `cs-3c-anderson-perry` | Perry/Lang | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-perry-2fl` | 2nd FL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PERRY` |
| `cs-3c-anderson-perry-5fl` | 5th FL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PERRY` |
| `cs-3c-anderson-perry-8fl` | 8th FL | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PERRY` |
| `cs-3c-anderson-posey` | Posey | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-anderson-posey-12ms` | 12th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.POSEY` |
| `cs-3c-anderson-posey-16ms` | 16th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.POSEY` |
| `cs-3c-anderson-posey-19ms` | 19th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.POSEY` |
| `cs-3c-anderson-posey-48ms` | 48th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.POSEY` |

## cs-heth

Army of Northern Virginia, Third Corps: Heth's division (Pettigrew, Brockenbrough, Archer, Davis)

23 units (23 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-3c-heth` | Heth/Pettigrew | division | yes | I | I | E | E | - | - | - |
| `cs-3c-heth-pettigrew` | Pettigrew | brigade | yes | I | I | I | I | - | - | - |
| `cs-3c-heth-pettigrew-11nc` | 11th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PETTIGREW` |
| `cs-3c-heth-pettigrew-26nc` | 26th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.26NC` |
| `cs-3c-heth-pettigrew-47nc` | 47th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PETTIGREW` |
| `cs-3c-heth-pettigrew-52nc` | 52nd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.PETTIGREW` |
| `cs-3c-heth-brockenbrough` | Brockenbrough | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-heth-brockenbrough-40va` | 40th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-brockenbrough-47va` | 47th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-brockenbrough-55va` | 55th VA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-brockenbrough-22vabn` | 22nd VA Bn | battalion | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-archer` | Archer | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-heth-archer-13al` | 13th AL | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-archer-5albn` | 5th AL Bn | battalion | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-archer-1tnprov` | 1st TN Prov | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-archer-7tn` | 7th TN | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-archer-14tn` | 14th TN | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-heth-davis` | J. R. Davis | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-heth-davis-2ms` | 2nd MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DAVIS` |
| `cs-3c-heth-davis-11ms` | 11th MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DAVIS` |
| `cs-3c-heth-davis-42ms` | 42nd MS | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DAVIS` |
| `cs-3c-heth-davis-55nc` | 55th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.DAVIS` |
| `cs-44nc-hanover-junction` | 44th NC | regiment | no | I | E | E | E | P | I1P10E1 | - |

## cs-pender

Army of Northern Virginia, Third Corps: Pender's division (McGowan and Perrin, Lane, Thomas, Scales)

24 units (24 in the roster, 0 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-3c-pender` | Pender/Lane/Trimble | division | yes | I | I | E | E | - | - | - |
| `cs-3c-pender-mcgowan` | McGowan/Perrin | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-pender-mcgowan-1scprov` | 1st SC Prov | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-mcgowan-1scrifles` | 1st SC Rifles | regiment | yes | I | E | P | E | D* | I1P10E1 | `CS.1SCRIFLES` |
| `cs-3c-pender-mcgowan-12sc` | 12th SC | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-mcgowan-13sc` | 13th SC | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-mcgowan-14sc` | 14th SC | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-lane` | Lane | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-pender-lane-7nc` | 7th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LANE` |
| `cs-3c-pender-lane-18nc` | 18th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LANE` |
| `cs-3c-pender-lane-28nc` | 28th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LANE` |
| `cs-3c-pender-lane-33nc` | 33rd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LANE` |
| `cs-3c-pender-lane-37nc` | 37th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.LANE` |
| `cs-3c-pender-thomas` | Thomas | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-pender-thomas-14ga` | 14th GA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-thomas-35ga` | 35th GA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-thomas-45ga` | 45th GA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-thomas-49ga` | 49th GA | regiment | yes | I | E | P | E | P | I1P10E1 | - |
| `cs-3c-pender-scales` | Scales | brigade | yes | I | I | E | E | - | - | - |
| `cs-3c-pender-scales-13nc` | 13th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SCALES` |
| `cs-3c-pender-scales-16nc` | 16th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SCALES` |
| `cs-3c-pender-scales-22nc` | 22nd NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SCALES` |
| `cs-3c-pender-scales-34nc` | 34th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SCALES` |
| `cs-3c-pender-scales-38nc` | 38th NC | regiment | yes | I | E | P | E | P | I1P10E1 | `CS.SCALES` |

## cs-art-1c

Army of Northern Virginia, First Corps artillery: the battalions of Cabell, Dearing and Henry and the corps reserve (Alexander, Washington Artillery)

29 units (13 in the roster, 16 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-1c-mclaws-cabell` | Cabell's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-1c-pickett-dearing` | Dearing's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-1c-hood-henry` | Henry's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-1c-res-art` | Reserve artillery Walton | artillery_group | yes | I | I | E | E | - | - | - |
| `cs-1c-res-art-alexander` | Alexander's battalion | artillery_battalion | yes | I | I | E | E | - | - | - |
| `cs-1c-res-art-alexander-ashland` | Ashland | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Ashland` |
| `cs-1c-res-art-alexander-bedford` | Bedford | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Bedford` |
| `cs-1c-res-art-alexander-brookssc` | Brooks SC | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Brooks` |
| `cs-1c-res-art-alexander-madisonla` | Madison LA | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Madison_La` |
| `cs-1c-res-art-alexander-richmond` | Richmond | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Richmond` |
| `cs-1c-res-art-alexander-bath` | Bath | battery | yes | I | D* | P | E | G | I3P8E1 | `CS.ART.Bath` |
| `cs-1c-res-art-washington` | Washington (LA) Artillery | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-1c-art` | I Corps artillery | artillery_group | yes | I | E | P | E | E | - | - |
| `CS.ART.Squires` | Squires battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Squires` |
| `CS.ART.Richardson` | Richardson battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Richardson` |
| `CS.ART.Miller` | Miller battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Miller` |
| `CS.ART.Norcom` | Norcom battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Norcom` |
| `CS.ART.1st_NC_A` | 1st NC A battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.1st_NC_A` |
| `CS.ART.Pulaski_GA` | Pulaski GA battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Pulaski_GA` |
| `CS.ART.1st_Richmond_Howitzers` | 1st Richmond Howitzers | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.1st_Richmond_Howitzers` |
| `CS.ART.Troup_GA` | Troup GA battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Troup_GA` |
| `CS.ART.Fauquier` | Fauquier battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Fauquier` |
| `CS.ART.Hampden` | Hampden battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Hampden` |
| `CS.ART.Richmond_Fayette` | Richmond Fayette battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Richmond_Fayette` |
| `CS.ART.Blount_s` | Blount's battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Blount_s` |
| `CS.ART.Branch_NC` | Branch NC battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Branch_NC` |
| `CS.ART.Charleston_German_SC` | Charleston German SC battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Charleston_German_SC` |
| `CS.ART.Palmetto_SC` | Palmetto SC battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Palmetto_SC` |
| `CS.ART.Rowan_NC` | Rowan NC battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Rowan_NC` |

## cs-art-2c

Army of Northern Virginia, Second Corps artillery: the battalions of Jones, Andrews (Latimer) and Carter and the corps reserve (Dance, Nelson)

25 units (6 in the roster, 19 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-2c-early-jones` | Jones's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-2c-johnson-andrews` | Andrews's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-2c-rodes-carter` | Carter's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-2c-res-art` | Reserve artillery J. T. Brown | artillery_group | yes | I | I | E | E | - | - | - |
| `cs-2c-res-art-1vaartbn` | 1st VA Artillery Bn | artillery_battalion | yes | I | E | P | E | E | - | - |
| `cs-2c-res-art-nelson` | Nelson's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `CS.ART.Charlottesville` | Charlottesville battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Charlottesville` |
| `CS.ART.Courtney` | Courtney battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Courtney` |
| `CS.ART.Louisiana_Guard` | Louisiana Guard battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Louisiana_Guard` |
| `CS.ART.Staunton` | Staunton battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Staunton` |
| `CS.ART.1st_Md` | 1st Md battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.1st_Md` |
| `CS.ART.Alleghany` | Alleghany battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Alleghany` |
| `CS.ART.Chesapeake` | Chesapeake battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Chesapeake` |
| `CS.ART.Lee` | Lee battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Lee` |
| `CS.ART.Jefferson_Davis_AL` | Jefferson Davis AL battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Jefferson_Davis_AL` |
| `CS.ART.King_William` | King William battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.King_William` |
| `CS.ART.Morris` | Morris battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Morris` |
| `CS.ART.Orange` | Orange battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Orange` |
| `CS.ART.2nd_and_3rd_Richmond_Howitzers` | 2nd and 3rd Richmond Howitzers | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.2nd_and_3rd_Richmond_Howitzers` |
| `CS.ART.Powhatan` | Powhatan battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Powhatan` |
| `CS.ART.Rockbridge` | Rockbridge battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Rockbridge` |
| `CS.ART.Salem` | Salem battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Salem` |
| `CS.ART.Amherst` | Amherst battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Amherst` |
| `CS.ART.Fluvanna` | Fluvanna battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Fluvanna` |
| `CS.ART.Milledge_GA` | Milledge GA battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Milledge_GA` |

## cs-art-3c

Army of Northern Virginia, Third Corps artillery: the battalions of Lane (Cutts), Garnett and Poague and the corps reserve (McIntosh, Pegram)

19 units (6 in the roster, 13 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-3c-anderson-cutts` | Cutts's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-3c-heth-garnett` | Garnett's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-3c-pender-poague` | Poague's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-3c-res-art` | Reserve artillery R. L. Walker | artillery_group | yes | I | I | E | E | - | - | - |
| `cs-3c-res-art-mcintosh` | McIntosh's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-3c-res-art-pegram` | Pegram's battalion | artillery_battalion | yes | I | I | P | E | E | - | - |
| `CS.ART.Donaldsonville` | Donaldsonville battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Donaldsonville` |
| `CS.ART.Huger` | Huger battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Huger` |
| `CS.ART.Lewis` | Lewis battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Lewis` |
| `CS.ART.Norfolk_Blues` | Norfolk Blues battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Norfolk_Blues` |
| `CS.ART.Danville` | Danville battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Danville` |
| `CS.ART.HURT` | Hardaway AL battery | battery | not in the roster | I | I* | E | E | I* | I3P8E1 | `CS.ART.HURT` |
| `CS.ART.2nd_Rockbridge` | 2nd Rockbridge battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.2nd_Rockbridge` |
| `CS.ART.Johnson_s` | Johnson's battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Johnson_s` |
| `CS.ART.Crenshaw` | Crenshaw battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Crenshaw` |
| `CS.ART.Fredericksburg` | Fredericksburg battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Fredericksburg` |
| `CS.ART.Letcher` | Letcher battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Letcher` |
| `CS.ART.Pee_Dee` | Pee Dee battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Pee_Dee` |
| `CS.ART.Purcell` | Purcell battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Purcell` |

## cs-cav

Army of Northern Virginia, Stuart's cavalry division (Hampton, Fitz Lee, W. H. F. Lee under Chambliss, Jenkins, Jones, Robertson), Imboden's command and the horse artillery

48 units (33 in the roster, 15 kit records with no roster unit).

| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |
|---|---|---|---|---|---|---|---|---|---|---|
| `cs-2c-early-35vacavalrybn` | 35th VA Cavalry Bn | battalion | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.35VABN` |
| `cs-cav-div` | Cavalry Division | division | yes | I | I | I | I | - | - | - |
| `cs-cav-hampton` | Hampton | brigade | yes | I | I | E | E | - | - | - |
| `cs-cav-hampton-1nc` | 1st NC | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.1NC` |
| `cs-cav-hampton-1sc` | 1st SC | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.1SC` |
| `cs-cav-hampton-2sc` | 2nd SC | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.2SC` |
| `cs-cav-hampton-cobbslegion` | Cobb’s Legion | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.COBB` |
| `cs-cav-hampton-jeffdavislegion` | Jeff Davis Legion | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.JDAVIS` |
| `cs-cav-hampton-phillipslegion` | Phillips Legion | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.PHILLIPS` |
| `cs-cav-flee` | F. Lee | brigade | yes | I | I | E | E | - | - | - |
| `cs-cav-flee-1mdbn` | 1st MD Bn | battalion | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.1MDBN` |
| `cs-cav-flee-1va` | 1st VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.1VA` |
| `cs-cav-flee-2va` | 2nd VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.2VA` |
| `cs-cav-flee-3va` | 3rd VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.3VA` |
| `cs-cav-flee-4va` | 4th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.4VA` |
| `cs-cav-flee-5va` | 5th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.5VA` |
| `cs-cav-jenkins` | Jenkins/Witcher | brigade | yes | I | I | E | E | - | - | - |
| `cs-cav-jenkins-14va` | 14th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.14VA` |
| `cs-cav-jenkins-16va` | 16th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.16VA` |
| `cs-cav-jenkins-17va` | 17th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.17VA` |
| `cs-cav-jenkins-34vabn` | 34th VA Bn | battalion | yes | I | D* | P | E | D* | D1I2P8E1 | `CS.34VACAVBN` |
| `cs-cav-jenkins-36vabn` | 36th VA Bn | battalion | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.36VABN` |
| `cs-cav-chambliss` | W. H. F. Lee/Chambliss | brigade | yes | I | I | E | E | - | - | - |
| `cs-cav-chambliss-2nc` | 2nd NC | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.2NC` |
| `cs-cav-chambliss-9va` | 9th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.9VA` |
| `cs-cav-chambliss-10va` | 10th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.10VA` |
| `cs-cav-chambliss-13va` | 13th VA | regiment | yes | I | I* | P | E | P | I3P8E1 | `CS.CAV.13VA` |
| `cs-cav-horse-art` | Stuart Horse Artillery | artillery_battalion | yes | I | I | P | E | E | - | - |
| `cs-cav-flee-chambliss` | Fitzhugh Lee’s and Chambliss’s Brigades | group | yes | I | I | E | E | - | - | - |
| `cs-cav-robertson-jones-imboden` | Robertson’s and Jones’s Brigades; Imboden | group | not on the main field | I | I | E | E | - | - | - |
| `cs-cav-robertson` | Robertson's Brigade | brigade | not on the main field | I | I | E | E | - | - | - |
| `cs-cav-jones` | W. E. Jones's Brigade (Laurel Brigade) | brigade | not on the main field | I | I | E | E | - | - | - |
| `cs-cav-imboden` | Imboden's command | command | not on the main field | I | I | E | E | - | - | - |
| `CS.ART.Breathed` | Breathed battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Breathed` |
| `CS.ART.Chew` | Chew battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Chew` |
| `CS.ART.Griffin` | Griffin battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Griffin` |
| `CS.ART.Hart` | Hart battery | battery | not in the roster | D | D* | E | E | G | I3P8E1 | `CS.ART.Hart` |
| `CS.ART.McGregor` | McGregor battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.McGregor` |
| `CS.ART.Moorman` | Moorman battery | battery | not in the roster | D | E | E | E | G | I3P8E1 | `CS.ART.Moorman` |
| `CS.CAV.6VA` | 6th Virginia Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.6VA` |
| `CS.CAV.7VA` | 7th Virginia Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.7VA` |
| `CS.CAV.11VA` | 11th Virginia Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.11VA` |
| `CS.CAV.4NC` | 4th North Carolina Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.4NC` |
| `CS.CAV.5NC` | 5th North Carolina Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.5NC` |
| `CS.CAV.12VA` | 12th Virginia Cavalry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.12VA` |
| `CS.CAV.18VA` | 18th Virginia Cavalry (Imboden) | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.18VA` |
| `CS.CAV.62VA` | 62nd Virginia Mounted Infantry | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.62VA` |
| `CS.CAV.MCNEILL` | McNeill's Partisan Rangers | regiment | not in the roster | I | I* | E | E | P | I3P8E1 | `CS.CAV.MCNEILL` |

