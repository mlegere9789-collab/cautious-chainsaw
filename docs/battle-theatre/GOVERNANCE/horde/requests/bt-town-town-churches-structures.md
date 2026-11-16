# Request from the group pass `town-churches` to the structures, renderer and integration owners

Written 2026-11-16. Nothing of `structures.json`, `hospitals.json`, `state_schedule.json`, `structures3d.json` or the app was edited. The evidence is `docs/battle-theatre/town/evidence/town-churches.jsonl` (validated with `--complete`) and its REPORT; the proposed register entries are `GOVERNANCE/horde/ws-town/proposed-register/town-churches-EG-01.md` to `-08.md`.

## 1. The four records of the inventory

- `bld-presbyterian-church` ("Presbyterian Church (208 Baltimore St)"; "Cavalry Corps 1st Division hospital set up June 30; fell to Confederates evening Jul 1"): the record text rests on a lead (HMDB 17939). What the local texts carry: the Cavalry Corps Hospital under Dr. Rulison occupied the church and two school-houses and held 300 wounded (Sanitary Commission 1863, rows 0072); the first day is the earliest day a source supports (row 0073); **no non-lead source says "June 30", "1st Division" or that the hospital fell to the Confederates**. The site is carried at 15 m (rows 0058, 0059). The 2023 outline STR-TOWN-PRESBYTERIAN_CHURCH is 3.8 times the church of the plan of 1886: **please do not extrude it as the 1863 building** (EG-07).
- `bld-poorhouse-christ-lutheran-wills#christ_lutheran_church` ("No source retrieved"): now documented: built 1835, a hospital from the first day (rows 0098, 0099, 0100, 0101), steps and a landing before the front door (row 0094), a basement and an upper floor with 40 and 100 patients (rows 0100, 0101). The outline STR-TOWN-CHRIST_LUTHERAN (1777 square metres) is 3.7 times the church of the plan of 1886: not the 1863 footprint. The two footprints of 1858 and 1886 are a conflict (EG-02).
- `bld-st-francis-xavier` ("Alternate pews removed, boards laid on the rest"; "14 Sisters of Charity"): Barton (1898) says the soldiers lay on the pew seats, under them and in every aisle, in the sanctuary and the gallery: **the pews stood** (row 0137; EG-04); Barton says twelve Sisters left Emmitsburg with Father Burlando on the Sunday after the third day. The building is documented in size (48 by 90 ft, about 40 ft high, Roman cupola of about 60 ft; rows 0117, 0119, 0120, 0125). The record has no geometry: the Sanborn plan gives a footprint of 49 by 89 ft at the place below.
- `bld-town-belfry` ("Not identified"): still not identified; six accounts, no church named (EG-01). Do not attach the sniper post to a building without the owner's choice.

## 2. New buildings (ids TWN-CHU-0001 to 0008) for `app/data/town/buildings.json` (integration step)

Draw in July 1863 only those whose `existed_july_1863` below is `stood`; the forms are generic where the file says so (rule `GR-ROOF-GABLE-30` for the roof form) and the footprints are scenarios (conflicts below). Positions are the Sanborn centre (error 15 m unless stated) and the Hopkins symbol.

| id | what | Sanborn 1886 centre (lat, lng) | Hopkins 1858 point (lat, lng) | existed in July 1863 |
|---|---|---|---|---|
| `bld-presbyterian-church` | Presbyterian Church | 39.828439, -77.230733 (15 m; row 0059) | 39.828536, -77.230868 (15 m; row 0058) | stood (documented, row 0052) |
| `bld-poorhouse-christ-lutheran-wills#christ_lutheran_church` | Christ Lutheran Church | 39.830559, -77.232531 (15 m; row 0085) | 39.830677, -77.232393 (15 m; row 0084) | stood (documented, row 0079) |
| `bld-st-francis-xavier` | St. Francis Xavier Catholic church | 39.8288, -77.23205 (15 m; row 0115) | 39.828879, -77.232307 (60 m; row 0114) | stood (documented, row 0108) |
| `TWN-CHU-0001` | Methodist Episcopal Church of 1822 | 39.829565, -77.229454 (15 m; row 0161) | 39.829631, -77.229611 (15 m; row 0160) | stood (documented, row 0155) |
| `TWN-CHU-0002` | German Reformed Church | 39.82873, -77.229065 (15 m; row 0180) | 39.828878, -77.229125 (15 m; row 0179) | stood (documented, row 0172) |
| `TWN-CHU-0003` | United Presbyterian Church | 39.828374, -77.232168 (15 m; row 0204) | 39.828406, -77.232052 (15 m; row 0203) | stood (inferred, row 0196) |
| `TWN-CHU-0004` | St. James' Lutheran Church | 39.830708, -77.228739 (15 m; row 0223) | 39.830803, -77.228749 (25 m; row 0222) | stood (documented, row 0217) |
| `TWN-CHU-0005` | Coloured Church | - | 39.827104, -77.234481 (25 m; row 0244) | stood (inferred, row 0240) |
| `TWN-CHU-0006` | Methodist church of 1872 | 39.829945, -77.230158 (20 m; row 0256) | - | not_yet_built (documented, row 0252) |
| `TWN-CHU-0007` | Episcopal chapel of 1876 | - | - | not_yet_built (documented, row 0264) |
| `TWN-CHU-0008` | chapel of the plan of 1886 | 39.828044, -77.231868 (15 m; row 0279) | - | open gap (row 0275) |

- `TWN-CHU-0001` the Methodist Episcopal church of 1822 (a hospital: Barton); `TWN-CHU-0002` the German Reformed church (the Union Brick Church of 1814, enlarged 1862; an open lantern on the ridge in LOC 2012647712); `TWN-CHU-0003` the United Presbyterian church (remodelled 1859, with its graveyard); `TWN-CHU-0004` St. James' (a hospital after 3 July; damaged); `TWN-CHU-0005` the Coloured Church (inferred; marked uncertain; EG-05).
- **Do not draw** `TWN-CHU-0006` (the Methodist church of 1872), `TWN-CHU-0007` (the Episcopal chapel of 1876) or `TWN-CHU-0008` (the frame chapel of the plan of 1886: no source dates it; its existence in July 1863 is an open gap). They are declared so that nobody draws them.
- The **White Church** of the First Corps hospital is not a church of the borough (separate note `bt-town-town-churches-white-church.md`).

## 3. Conflicts to carry as selectable scenarios (none is chosen; the rows name each other)

The footprints of the Presbyterian, Christ Lutheran, Methodist (1822 against the hall of 1880) and United Presbyterian churches differ between the Hopkins inset of 1858 and the Sanborn plan of 1886 (rows 0063, 0064, 0087, 0088, 0163, 0164, 0206, 0207); the inside walls (26 ft) and the eaves (22 ft) of the Catholic church (rows 0119, 0120, 0121). The German Reformed church and the Catholic church agree between their sources.

## 4. Forms and fields

- Roof: the material from the Sanborn key (shingle) is inferred; the form is the generic gable (`GR-ROOF-GABLE-30`); the United Presbyterian roof is "slate or tin" (one ring mark for both): the row uses material `other` with the note.
- Towers: a cupola or lantern at the front gable of Christ Lutheran, the Catholic, the German Reformed and St. James' churches (EG-06); none on the Presbyterian and the United Presbyterian.
- State: each church that stood carries a plausible-procedural `intact` state (rule `GR-NO-DAMAGE-WITHOUT-SOURCE`) before its first dated use or damage; documented hospital, damaged and occupied rows follow the schedule rows of the hospital note.
- The rows use **no extension fields** and no field outside the vocabulary.
- Later changes (the Catholic church's windows of 1881, bell of 1877, frescoing of 1864) are carried as an `additions` row of tier inferred and `describes` later, because a later statement cannot make an 1863 form documented: please do not draw them in July 1863.
