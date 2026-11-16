# Request from the group pass `town-public-buildings` to the structures, renderer and integration owners

Written 2026-11-16. Nothing of `structures.json`, `structures3d.json`, `state_schedule.json` or the app was edited. The evidence is `docs/battle-theatre/town/evidence/town-public-buildings.jsonl` and its REPORT; the proposed register entries are `GOVERNANCE/horde/ws-town/proposed-register/town-public-buildings-EG-01.md` to `-09.md`.

## 1. The court house record (`bld-courthouse`, `STR-TOWN-COURTHOUSE`)

- The record text ("Built 1858 (occupied 1859), Italianate, two stories, red brick originally painted gray, about 70 ft clock tower; command post and hospital for both sides") rests on a lead. What the local texts carry: brick walls (documented, Compiler 1 November 1858); a tower with a cupola in the steeple reached by an observer (documented, Official Records); a bracketed cornice (documented, December 1858); Italianate by Stephen D. Button (Park Service Design Guide, with the Sentinel of 1859 naming Button); two storeys (inferred from the plan of 1886); completed 1859 (three dates carried, EG-02). **No text gives 70 ft, the gray paint, or "command post"**; the signal station (1 July to at least 5 July), the observation post (3 July), the hospital (1 July) and the public meeting (20 June) are documented rows with windows.
- **The 2023 outline is not the 1863 footprint**: 829 square metres against 60 by about 102 feet (569 square metres, contract of 1858, inferred) or about 48 by 98 feet (the plan of 1886, inferred): please do not extrude the 2023 outline as the 1863 building (EG-01). The outline may stand for the centre of the site (error 8 m).
- HABS PA-265 (the record cited in the source note of `STR-TOWN-COURTHOUSE`) is the FIRST court house (1804, demolished 1859): not the building of the record. It is declared as `TWN-PUB-0001` and must not be drawn in July 1863.

## 2. The poor house record part and the nine plate symbols

- `bld-poorhouse-christ-lutheran-wills#poorhouse` ("No source retrieved") is documented as standing in July 1863 (Alms House, steward Jacob Culp; built 1817-18; a new part in 1878, not drawn; Lieut. Wilkeson carried there on 1 July). The nine symbols `STR-ALMSHOUSE-COMPLEX_BUILDING1` to `9` stay as points (kind `map_symbol`, error 45 m); which of them stood in July 1863 is an open gap (EG-04, EG-09): draw them marked; add no building to the complex beyond the nine.
- The Warren plate carries a letter beside each house (W wood, B brick, S stone): seven letters at the almshouse (B three times, W three times, S once). The letters could not be paired with the nine points; they are an observation of the group.

## 3. New buildings for `app/data/town/buildings.json` (integration step)

`TWN-PUB-0001` to `0013` (list with places in `bt-town-public-buildings-diamond-crossrefs.md`). Draw in July 1863 only those whose `existed_july_1863` is `stood` (0002, 0004 to 0009, 0011, 0012); `0001` is demolished; `0003`, `0010`, `0013` are open gaps. The forms are generic where the file says so (rule `GR-ROOF-GABLE-30`); the 1886 plan figures for the jail (about 75 by 35 feet, a two-storey brick dwelling about 38 by 49 feet attached), the public school (about 74 by 48 feet) and the Female Academy (about 32 by 20 feet) are **inferred** rows (the plan is of 1886).

## 4. Fields outside the vocabulary

The rows use four extension fields with `x_reason`: `x_style` (Italianate; architect: court house Button, public school Sloan), `x_cornice` (the bracketed cornice of the court house, December 1858), `x_heating` (a furnace under the cells of the jail, 1857; a furnace at the Alms house, 1857) and `x_condition` (the County Prison dilapidated, 1859). Please decide whether to add `style`, `cornice`, `heating` and `condition` to the vocabulary of the contract.

## 5. Hospital pass (OA12)

State rows with `hospital` for the court house (1 July; after the battle; emptied some day before the move of a hospital, date not given), the Public School house (1 July; 18 August), Sheads & Buehler's Hall (18 August) and the almshouse (`aid_station`, 1 July) carry the building ids for the hospital pass to meet them.
