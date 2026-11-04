# The 1863 structures in the Battle Theatre: geometry inventory and drawing rules

Written by `app/tools/structures3d-notes.mjs` from `app/data/structures3d.json`, `app/data/structures3d-inventory.json` (both written by `app/tools/build-structures3d.mjs`) and `app/tests/results-structures3d.json`. Rebuild it with that script rather than editing it.

**Status: a reconstruction.** Every drawn object is a copy of a feature of the 1863 base-map layers (`docs/basemap1863/features/`), which are themselves reconstructions from period maps and later documentation, with their own error bounds. Every state change is read from the state schedule of the plan (`structures/state_schedule.json`), whose rows are `seeded_unverified`: transcribed from the plan, no primary source opened to confirm them. Nothing here claims 100 percent accuracy, and nothing is drawn that no source in the repository places.

## 1. What is drawn, what is not

| Class | Drawn | How | Not drawn |
|---|---|---|---|
| Fences and walls | 30 lines, 6276 m, 1885 panels (1784 rail, 101 stone, 0 worm) | instanced panels (posts and rails, or stone courses) along the confirmed lines; line impostors mid-range; nothing beyond 1.6 km | 362 of 392 fence candidates (356 not confirmed on the period sheet, 6 outside the ground) |
| Buildings | 40 footprints (extruded: walls, gable roof), 229 borough masses (flat tops, schematic) | one static mesh, per-object state; shadows cast | 16 of the 41 building records have no footprint (marker or nothing) |
| Markers | 117 points (106 building symbols, 8 bridges/fords/crossings, trestle and depot) | a labelled pole with a diamond head, instanced; never a building | 73 machine-detected plate symbols not reviewed by hand; 13 rejected; the rest outside the ground |
| Roads, lanes, railway | 30 lines (24 roads, 4 lanes, 2 railway lines) | ground ribbons on the terrain, blended, under the units | post-1863 railways, unknown extents, 18 named lanes with no traced line, 7 roads outside the ground |
| Works and pre-existing walls | 17 rings at named places (no mapped line exists for any) | labelled rings of the place's own uncertainty (2D, as before); selectable | works with no finish time in the record (listed as open gaps) |

GPU memory of the structures: 2603.1 KB; draw calls per frame 3 to 7; triangles at the default view 33776.

## 2. Rules applied

1. **No invented geometry.** A building footprint is a polygon of the basemap catalogue (the 2023 county outline of a surviving building, a traced roof, or the inked extent of the 1868-69 survey symbols). A line is a line of the basemap (the modern OSM mapping of a fence, confirmed against the period sheet at 25 m error). Where only a point exists the object is a labelled pole.
2. **Existence and position carry the tier of the evidence; the form is generic and says so.** The card of every object gives the tier of its existence and position (documented / inferred, from the record and the basemap confidence, the weaker of the two) and, separately, the tier of its form (plausible-procedural unless the record prints the storeys).
3. **Dimensions only as printed.** Documented storeys (5 buildings, each checked at build time against the words of its own record) are used; a storey is 3 m (generic). Fences use the generic post-and-rail dimensions the plan prints and flags as generic (rails about 11 ft, height about 5 ft; ECW-PostRail, a non-Gettysburg source). A stone wall is 2.5 ft: the Angle wall was originally about 2-3 ft (P-01, documented) and one critic gives about 2 ft; **no profile is taken from the modern rebuilt walls (48-52 in.)**.
4. **Nothing before it existed; nothing pre-placed.** The buildings, fences and roads that are drawn are those the sources say stood in July 1863 and are present from the first frame (no construction animation: PDF B.7.3). No work has a mapped line, so no work is drawn as a 3D object; each is a ring at its named place, absent before its printed start and built over its printed window (`objectProgress`, as before). The avenues (RULE-04) are never drawn. Post-1863 railways are never drawn.
5. **State over time** comes from the port of `check_structures.state_at` (tested equal to the Python function on 65,700 evaluations): see section 7.
6. **The tier mark stays**: Evidence outlines every object in its tier colour, dash and glyph, as for units.

## 3. Inventory A: every record of `structures/structures.json` (130)

| Id | Name | Kind | Geometry source | Error bound (m) | Tier | Drawn or not, and why |
|---|---|---|---|---|---|---|
| E-01 | Seminary Ridge, in the small wood in front of Schmucker… | barricade | gazetteer place Schmucker Hall (point, 40 m) | 40 | documented | ring only (2D mark at the named place): no line geometry in the repository; a labelled ring at Schmucker Hall (sigma 40 m), built over the printed window (existing overlay) |
| E-02 | Culp's Hill north slope, Stevens' Knoll to the summit | earthwork | none | — | documented | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-03 | Lower Culp's Hill summit | breastwork | none | — | documented | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-04 | Cemetery Hill | fortification_undetailed | none | — | inferred | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-05 | Upper Culp's Hill (60th NY upper crest, 102nd and 149th… | breastwork | gazetteer place Culp's Hill (point, 490 m) | 490 | documented | ring only (2D mark at the named place): no line geometry in the repository; a labelled ring at Culp's Hill (sigma 490 m), built over the printed window (existing overlay) |
| E-06 | Right-hand end of Greene's line, running back along a r… | traverse | gazetteer place Baltimore Pike (point, 42 m) | 42 | documented | ring only (2D mark at the named place): no line geometry in the repository; a labelled ring at Baltimore Pike (sigma 42 m), built over the printed window (existing overlay) |
| E-07 | Culp's Hill, either side of Greene | breastwork | none | — | documented | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-08 | Lower Culp's Hill | breastwork | none | — | documented | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-09 | Whole Culp's Hill line | line_extension | none | — | documented | not drawn: no finish time in the record, so the work is not shown (listed as an open gap) |
| E-10 | Empty lower-hill Union works (the 1st Division, Kane an… | occupation_not_construction | none | — | documented | not drawn: no construction in the record (Occupation, not construction (Steuart enters the empty lower-hill works; rows S-042).) |
| E-11 | Culp's Hill | shelling_damage_state | none | — | documented | not drawn: no construction in the record (Shelling/damage state of Culp's Hill works (stage 6) rather than a construction (rows S-050, S-056).) |
| E-12 | East Cemetery Hill, lunettes near the gatehouse (Stewar… | lunette | gazetteer place East Cemetery Hill (point, 250 m) | 250 | inferred | ring only (2D mark at the named place): no line geometry in the repository; a labelled ring at East Cemetery Hill (sigma 250 m), built over the printed window (existing overlay) |
| E-13 | Little Round Top | no_construction | none | — | documented | not drawn: no construction in the record (No construction attributed; natural ledges and boulders.) |
| E-14 | Little Round Top, south slope | stone_breastwork | gazetteer place Little Round Top (point, 270 m) | 270 | documented | ring only (2D mark at the named place): no line geometry in the repository; a labelled ring at Little Round Top (sigma 270 m), built over the printed window (existing overlay) |
| E-15 | Little Round Top summit | gun_position_improvised | none | — | documented | not drawn: no construction in the record (Improvised gun position, hand-hauled, no prepared epaulement (rows S-038).) |
| E-16 | Devil's Den / Houck's Ridge | no_works | none | — | documented | not drawn: no construction in the record (No works; Ward lacked time or inclination.) |
| E-17 | Cemetery Ridge, rail works | open_gap | none | — | open_gap | not drawn: no construction in the record (Open gap: do not animate rail piles as documented.) |
| E-18 | Seminary Ridge, Warfield Ridge, Oak Hill, Benner's Hill… | open_gap | none | — | open_gap | not drawn: no construction in the record (Open gap: no Confederate works found for Jul 2-3.) |
| P-01 | Stone wall at the Angle and around the Copse | preexisting_wall_or_fence | gazetteer place Cemetery Ridge (point, 561 m) | 561 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Cemetery Ridge… |
| P-02 | Low stone wall at the north end of Cemetery Hill wrappi… | preexisting_wall_or_fence | gazetteer place East Cemetery Hill (point, 250 m) | 250 | inferred | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at East Cemetery … |
| P-03 | Stone wall on the east side of the Baltimore Pike | preexisting_wall_or_fence | gazetteer place Cemetery Hill (point, 250 m) | 250 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Cemetery Hill … |
| P-04 | Stone wall between Rose's Woods and the Wheatfield's so… | preexisting_wall_or_fence | gazetteer place The Wheatfield (point, 315 m) | 315 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at The Wheatfield… |
| P-05 | Low stone fence on Houck's Ridge (124th NY counterattac… | preexisting_wall_or_fence | gazetteer place Devil's Den (point, 300 m) | 300 | inferred | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Devil's Den (s… |
| P-06 | Stone wall near the Trostle house (Bigelow's second pos… | preexisting_wall_or_fence | gazetteer place Trostle house (point, 40 m) | 40 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Trostle house … |
| P-07 | Wall on Oak Ridge (Baxter's brigade, about 14:00-15:00 … | preexisting_wall_or_fence | gazetteer place Oak Ridge (point, 517 m) | 517 | inferred | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Oak Ridge (sig… |
| P-08 | Stone wall in Pardee Field (attacked about Jul 3 by the… | preexisting_wall_or_fence | gazetteer place Culp's Hill (point, 490 m) | 490 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Culp's Hill (s… |
| P-09 | "Heavy stone wall" about 10 rods behind the 123rd NY's … | preexisting_wall_or_fence | gazetteer place Culp's Hill (point, 490 m) | 490 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Culp's Hill (s… |
| P-10 | Peach Orchard and Wheatfield fences and walls; Emmitsbu… | preexisting_wall_or_fence | gazetteer place Emmitsburg Road (point, 42 m) | 42 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Emmitsburg Roa… |
| P-11 | James Warfield's stone walls | preexisting_wall_or_fence | none | — | inferred | not drawn: a wall at a place the gazetteer does not hold, and no named geometry; no 1863 profile is taken from the modern rebuilt walls |
| P-12 | Unfinished railroad grade and cut | terrain_excavation | RL-002 (railway grade, 20 m) | 20 | inferred | drawn as the railway grade (ground ribbon): the unfinished railroad grade is RL-002 by name; the cut itself is part of the modern ground model, not drawn separately |
| P-13 | Low stone wall at the Leister farm (Gardner photographe… | preexisting_wall_or_fence | gazetteer place Cemetery Ridge (point, 561 m) | 561 | documented | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Cemetery Ridge… |
| P-14 | Stone wall (Chamberlain's sharpshooters, about 150 yd e… | preexisting_wall_or_fence | gazetteer place Little Round Top (point, 270 m) | 270 | inferred | ring only (2D mark at the named place): no line geometry in the repository (the fences layer lines carry no names, and no 1863 profile is taken from the modern rebuilt walls); a labelled ring at Little Round T… |
| G-01 | Calef, Battery A, 2nd US (six 3-inch rifles) | gun_emplacement | none | — | inferred | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-02 | I Corps batteries (Wainwright, 20-22 guns; four batteri… | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-03 | Wiedrich (1st NY I), Ricketts (Pa. F&G); Stewart (Batte… | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-04 | Latimer's battalion, about 20 guns in five batteries (C… | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-05 | Smith's 4th NY (six 10-pdr Parrotts) | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-06 | Hazlett's Battery D, 5th US | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-07 | Hart's 15th NY (four Napoleons) | gun_emplacement | none | — | inferred | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-08 | Huger's four batteries (Moody, Parker, Taylor, Rhett/Gi… | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-09 | Cabell's battalion | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-10 | Bigelow's 9th Mass. (six Napoleons) | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-11 | McGilvery's Plum Run line | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-12 | Cushing's Battery A, 4th US (six 3-inch rifles) | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-13 | Union ridge line Jul 3 (Hunt) | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-14 | Confederate line Jul 3 | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-15 | Carter's rifles | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-16 | Hurt's guns (McIntosh's battalion) | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-17 | Powers Hill guns | gun_emplacement | none | — | documented | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| G-18 | Union Culp's Hill batteries | gun_emplacement | none | — | inferred | not drawn: no emplacement geometry; the guns of a battery with a stated count are drawn by the unit layer, not as an emplacement |
| bld-schmucker-hall | Lutheran Seminary "Schmucker Hall" (Old Dorm) | building | STR-TOWN-SCHMUCKER_HALL (footprint_2023_outline, 4 m) | 4 | documented | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-pennsylvania-hall | Pennsylvania Hall (Pennsylvania College) | building | STR-TOWN-PENN_HALL (footprint_2023_outline, 4 m) | 4 | inferred | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-courthouse | Adams County Courthouse | building | STR-TOWN-COURTHOUSE (footprint_2023_outline, 8 m) | 8 | inferred | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-rr-station | Railroad station (Carlisle Street) | building | STR-TOWN-DEPOT (footprint_2023_outline, 6 m) | 6 | inferred | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-rock-creek-rr-bridge | Rock Creek railroad trestle / bridge | bridge | none | — | documented | marker only: only a map-symbol point (1 marker); no footprint is invented |
| bld-evergreen-gatehouse | Evergreen Cemetery gatehouse | building | STR-TOWN-GATEHOUSE (footprint_2023_outline, 4 m) | 4 | documented | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-wade-house | Jennie (Ginnie) Wade house | building | STR-TOWN-WADE_HOUSE (footprint_2023_outline, 6 m) | 6 | inferred | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-pierce-house | Tillie Pierce house | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-burns-house | John Burns house | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-sweney-rupp-mccreary | Sweney House (now Farnsworth) and Rupp house | building | none | — | documented | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-town-belfry | Town church belfry | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-st-francis-xavier | St. Francis Xavier Catholic church | building | none | — | documented | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-presbyterian-church | Presbyterian Church (208 Baltimore St) | building | STR-TOWN-PRESBYTERIAN_CHURCH (footprint_2023_outline, 40 m) | 40 | documented | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-mcpherson-farm | McPherson farm (Edward McPherson owner, tenant John Sle… | building | STR-MCPHERSON-BARN1 (footprint_2023_outline, 4 m) | 4 | documented | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-thompson-house | Thompson house (Lee's HQ) | building | STR-TOWN-THOMPSON_HOUSE (footprint_2023_outline, 4 m) | 4 | inferred | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-mcmillan-farm | McMillan farm | building | STR-MCMILLAN-HOUSE1 (footprint_2023_outline, 4 m); STR-MCMILLAN-BARN1 (map_symbol_point, … | 25 | documented | drawn (extruded footprint): 1 footprint and 2 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-herbst | Herbst (McPherson) Woods and house/barn | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-codori-farm | Codori farm | building | STR-CODORI-HOUSE1 (footprint_2023_outline, 4 m); STR-CODORI-OUTBUILDING1 (map_symbol_poin… | 11 | documented | drawn (extruded footprint): 1 footprint and 2 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-klingle-farm | Klingle (Klingel) farm | building | STR-KLINGEL-HOUSE1 (footprint_2023_outline, 4 m); STR-KLINGEL-OUTBUILDING1 (map_symbol_po… | 10 | inferred | drawn (extruded footprint): 1 footprint and 1 marker; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-rogers-house | Rogers house | building | STR-ROGERS-HOUSE1 (map_symbol_point, 20 m); STR-ROGERS-OUTBUILDING1 (map_symbol_point, 25… | 25 | inferred | marker only: only a map-symbol point (3 markers); no footprint is invented |
| bld-bliss-farm | Bliss farm | building | STR-BLISS-HOUSE1 (map_symbol_point, 20 m); STR-BLISS-BARN1 (map_symbol_point, 20 m) | 20 | documented | marker only: only a map-symbol point (2 markers); no footprint is invented |
| bld-sherfy-farm | Sherfy farm | building | STR-SHERFY-OUTBUILDING1 (map_symbol_point, 11 m); STR-SHERFY-HOUSE1 (footprint_2023_outli… | 11 | documented | drawn (extruded footprint): 1 footprint and 2 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-wentz-farm | Wentz farm | building | STR-WENTZ-HOUSE1 (map_symbol_point, 20 m); STR-WENTZ-OUTBUILDING1 (map_symbol_point, 25 m… | 25 | inferred | marker only: only a map-symbol point (3 markers); no footprint is invented |
| bld-trostle-farm | Trostle farm | building | STR-TROSTLE-SUMMER_KITCHEN1 (footprint_2023_outline, 15 m); STR-TROSTLE-HOG_PEN1 (photo_p… | 25 | documented | drawn (extruded footprint): 3 footprints and 1 marker; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-rose-farm | Rose farm | building | STR-ROSE-OUTBUILDING2 (map_symbol_point, 10 m); STR-ROSE-HOUSE1 (footprint_2023_outline, … | 10 | documented | drawn (extruded footprint): 1 footprint and 2 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-bushman-farm | Bushman farm | building | STR-BUSHMAN-HOUSE1 (footprint_2023_outline, 4 m); STR-BUSHMAN-BARN1 (footprint_2023_outli… | 4 | documented | drawn (extruded footprint): 2 footprints; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-warfield-house | Warfield (James) house | building | STR-WARFIELD_SNYDER-HOUSE1 (footprint_2023_outline, 4 m); STR-WARFIELD_SNYDER-OUTBUILDING… | 10 | inferred | drawn (extruded footprint): 1 footprint and 3 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-snyder-farm | Snyder farm | building | STR-WARFIELD_SNYDER-OUTBUILDING4 (map_symbol_point, 25 m); STR-WARFIELD_SNYDER-OUTBUILDIN… | 25 | inferred | marker only: only a map-symbol point (2 markers); no footprint is invented |
| bld-slyder-farm | Slyder farm | building | STR-SLYDER-OUTBUILDING1 (map_symbol_point, 11 m); STR-SLYDER-BARN1 (footprint_2023_outlin… | 11 | inferred | drawn (extruded footprint): 2 footprints and 1 marker; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-leister-house | Leister house (Meade HQ) | building | STR-LEISTER-HOUSE1 (footprint_2023_outline, 4 m); STR-LEISTER-BARN1 (footprint_2023_outli… | 4 | documented | drawn (extruded footprint): 2 footprints; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-weikert-farm | Weikert (George) farm | building | STR-GWEIKERT-HOUSE1 (footprint_2023_outline, 4 m); STR-GWEIKERT-BARN1 (footprint_2023_out… | 4 | documented | drawn (extruded footprint): 3 footprints; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-hummelbaugh-farm | Hummelbaugh farm | building | STR-HUMMELBAUGH-HOUSE1 (footprint_2023_outline, 4 m); STR-HUMMELBAUGH-OUTBUILDING1 (footp… | 4 | inferred | drawn (extruded footprint): 2 footprints; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-brian-farm | Brian (Bryan) farm | building | STR-BRYAN-HOUSE1 (footprint_2023_outline, 4 m); STR-BRYAN-BARN1 (footprint_2023_outline, … | 4 | inferred | drawn (extruded footprint): 2 footprints; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-biggs-house | Biggs house | building | none | — | documented | not drawn: its catalogue entries have no georeferenced geometry (UNKNOWN position) |
| bld-spangler-farm | Spangler farm | building | STR-SPANGLER_H-HOUSE1 (footprint_2023_outline, 4 m); STR-SPANGLER_H-OUTBUILDING3 (map_sym… | 10 | documented | drawn (extruded footprint): 2 footprints and 3 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-granite-schoolhouse | Granite Schoolhouse | building | none | — | documented | not drawn: its catalogue entries have no georeferenced geometry (UNKNOWN position) |
| bld-taney-farm | Taney farm | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-rummel-farm | Rummel farm | building | none | — | inferred | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-henry-culp-farm | Henry Culp farm | building | STR-CULP-HOUSE1 (footprint_2023_outline, 4 m); STR-CULP-OUTBUILDING1 (map_symbol_point, 4… | 45 | open_gap | drawn (extruded footprint): 1 footprint and 4 markers; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| bld-daniel-lady-farm | Daniel Lady farm | building | none | — | documented | not drawn: no entry in the basemap structures catalogue (named place only) |
| bld-poorhouse-christ-lutheran-wills | Adams County poorhouse, Christ Lutheran Church, Wills h… | building | STR-ALMSHOUSE-COMPLEX_BUILDING1 (map_symbol_point, 45 m); STR-ALMSHOUSE-COMPLEX_BUILDING2… | 45 | open_gap | drawn (extruded footprint): 1 footprint; footprint is the 2023 outline of the surviving building (the 1863 form may be smaller); height and roof generic |
| FEN-emmitsburg-road | Emmitsburg Road double post-and-rail fences | fence_post_and_rail | FN-0134 (OSM line, 25 m); FN-0139 (OSM line, 25 m); FN-0285 (OSM line, 25 m) | 25 | documented | drawn (3 attributed lines): attributed by proximity to the named road (inferred); the record's state rows drive these lines |
| FEN-klingle | Klingle fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-leister | Leister fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-thompson | Thompson fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-brian | Brian fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-warfield | Warfield fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-rummel | Rummel fences | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-sherfy-orchard | Sherfy orchard and fences | fence_and_orchard | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-mcmillan | McMillan fences | fence | none | — | documented | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-seminary-ridge | Seminary Ridge fences | fence | none | — | documented | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-gamble-cavalry | Gamble's cavalry fence | fence | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-mcpherson-railroad-grade | McPherson / railroad-grade fences | fence_virginia_worm | none | — | documented | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-chambersburg-pike | Chambersburg Pike post-and-rail fences | fence_post_and_rail | none | — | documented | not drawn: the only confirmed line along the Chambersburg Pike (FN-0060) lies outside the loaded ground |
| FEN-evergreen-cemetery | Evergreen Cemetery fences | fence_iron_other | none | — | inferred | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-mccreary-house | McCreary house fence | fence | none | — | documented | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| FEN-cemetery-ridge-walls | Cemetery Ridge walls | stone_wall | none | — | documented | not drawn: fence of a named farm or place; no fence line in the repository is named for it (the 36 confirmed lines are unnamed), so none is attributed |
| RD-turnpikes | Turnpikes to Chambersburg, York, Baltimore | road | RD-001, RD-002, RD-006 | 32 | — | drawn (ground ribbon): by name: RD-001, RD-002, RD-006; surface from the record, generic where not printed |
| RD-baltimore-pike | Baltimore Pike | road | RD-001 | 22 | — | drawn (ground ribbon): by name: RD-001; surface from the record, generic where not printed |
| RD-taneytown-road | Taneytown Road | road | RD-004 | 20 | — | drawn (ground ribbon): by name: RD-004; surface from the record, generic where not printed |
| RD-wheatfield-road | Wheatfield Road / Peach Orchard Road | road | RD-014 | 27 | — | drawn (ground ribbon): by name: RD-014; surface from the record, generic where not printed |
| RD-chambersburg-pike | Chambersburg Pike | road | RD-002 | 28 | — | drawn (ground ribbon): by name: RD-002; surface from the record, generic where not printed |
| RD-avenues | Hancock Avenue, Pleasonton Avenue and other avenues | avenue_not_in_1863 | none | — | — | never drawn: the avenues are not in 1863 (rule RULE-04, B.8.4) |
| RD-other-roads | Other roads (Hagerstown, Fairfield, Emmitsburg, Hanover… | road | RD-003, RD-005, RD-010, RD-015 | 37 | — | drawn (ground ribbon): by name: RD-003, RD-005, RD-010, RD-015; surface from the record, generic where not printed |
| ENV-wheatfield-wheat | Wheatfield wheat | crop | none | — | — | not drawn: an environment, group or person state, not a structure |
| ENV-evergreen-cemetery | Evergreen Cemetery | cemetery | none | — | — | not drawn: an environment, group or person state, not a structure |
| ENV-confederate-position | Confederate position | world_state | none | — | — | not drawn: an environment, group or person state, not a structure |
| ENV-plum-run | Plum Run and low ground | terrain | none | — | — | not drawn: an environment, group or person state, not a structure |
| GROUP-hospital-sites | Hospital sites (all) | group | none | — | — | not drawn: an environment, group or person state, not a structure |
| PERSON-armistead | Armistead | person_state | none | — | — | not drawn: an environment, group or person state, not a structure |
| RD-gettysburg-railroad | Railroad | railroad | RL-001 | 25 | — | drawn (ground ribbon): by name: RL-001; surface from the record, generic where not printed |
| WS-080-land | Land | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-081-reburials | Reburials | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-082-layout | Layout | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-083-platform | Platform | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-084-surrounding-ground | Surrounding ground | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-085-season | Season | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-086-sun-sky | Sun and sky | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-087-crowd | Crowd | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |
| WS-088-torch-lit-evening | Torch-lit evening before | epilogue_state | none | — | — | not drawn: an epilogue state of the ground, people or sky, not a structure |

## 4. Inventory B: every feature of the basemap1863 layers

One decision for each of the 1,078 features is in `app/data/structures3d-inventory.json` (`features`). Grouped:

| Layer | Decision | Group | Features | Reason |
|---|---|---|---|---|
| basemap bridges | marker | point | 8 | a bridge at a point only: a labelled marker |
| basemap bridges | not drawn | outside | 11 | outside the loaded ground (6.2 x 6.1 km) |
| basemap fences | drawn | fence | 27 | rail fence line confirmed on the period sheet |
| basemap fences | drawn | fence attributed | 3 | rail fence line confirmed on the period sheet |
| basemap fences | not drawn | fence not confirmed | 271 | no continuous drawn line along it on the period sheet (a modern fence, or beyond the registration accuracy) |
| basemap fences | not drawn | fence not confirmed | 85 | shorter than 40 m: not checked against the period sheet |
| basemap fences | not drawn | outside | 6 | outside the loaded ground (6.2 x 6.1 km) |
| basemap lanes | drawn | lane | 4 | ground ribbon, cart surface |
| basemap lanes (inventory without geometry) | not drawn | no geometry | 18 | named lane with no traced line in the repository |
| basemap railways | drawn | rail_track | 1 | ground ribbon, rail surface |
| basemap railways | drawn | rail_grade | 1 | ground ribbon, grade surface |
| basemap railways | marker | point | 2 | a point only: a labelled marker |
| basemap railways | not drawn | post-1863 | 2 | not in 1863 (post-1863 railway) |
| basemap railways | not drawn | unknown | 1 | extent unknown / confidence Unknown: the basemap does not draw it |
| basemap railways (no geometry file) | not drawn | post-1863 | 1 | not in 1863 (no geometry) |
| basemap roads | drawn | road | 24 | ground ribbon, macadam surface |
| basemap roads | not drawn | outside | 7 | outside the loaded ground (6.2 x 6.1 km) |
| basemap roads | not drawn | unknown | 1 | extent unknown / confidence Unknown: the basemap does not draw it |
| basemap structures | drawn | mass | 229 | extruded as a schematic mass |
| basemap structures | drawn | footprint | 40 | extruded footprint |
| basemap structures | marker | point | 107 | a point only |
| basemap structures | not drawn | outside | 129 | outside the loaded ground (6.2 x 6.1 km) |
| basemap structures | not drawn | unreviewed | 73 | machine-detected plate symbol, not reviewed by hand (the basemap lists it as undrawn) |
| basemap structures | not drawn | no geometry | 14 | no georeferenced geometry in the repository (UNKNOWN position) |
| basemap structures | not drawn | rejected | 13 | rejected: not a building symbol (the review found no building at the point) |

### 4.1 Fences and walls drawn (30 lines)

| Line | OSM way | Style drawn | Length (m) | Error (m) | Sheet check (continuity) | Attributed to | Sources |
|---|---|---|---|---|---|---|---|
| FN-0014 | 579072108 | rail fence (generic 1.52 m) | 273 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0018 | 597550954 | rail fence (generic 1.52 m) | 127 | 25 | 0.91 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0043 | 710894168 | rail fence (generic 1.52 m) | 154 | 25 | 0.81 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0046 | 710973190 | rail fence (generic 1.52 m) | 203 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0127 | 762915470 | stone wall (generic 0.76 m) | 302 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0134 | 762932618 | rail fence (generic 1.52 m) | 136 | 25 | 1 | FEN-emmitsburg-road (inferred) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0139 | 762935620 | rail fence (generic 1.52 m) | 140 | 25 | 0.92 | FEN-emmitsburg-road (inferred) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0159 | 776469182 | rail fence (generic 1.52 m) | 137 | 25 | 0.96 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0161 | 776469184 | rail fence (generic 1.52 m) | 109 | 25 | 0.95 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0170 | 776469196 | rail fence (generic 1.52 m) | 108 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0180 | 776469206 | rail fence (generic 1.52 m) | 138 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0182 | 776469208 | rail fence (generic 1.52 m) | 112 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0184 | 776469210 | rail fence (generic 1.52 m) | 152 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0185 | 776469211 | rail fence (generic 1.52 m) | 158 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0193 | 776469222 | rail fence (generic 1.52 m) | 448 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0198 | 776492884 | rail fence (generic 1.52 m) | 203 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0199 | 776492885 | rail fence (generic 1.52 m) | 177 | 25 | 0.97 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0200 | 776492886 | rail fence (generic 1.52 m) | 181 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0202 | 776492888 | rail fence (generic 1.52 m) | 172 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0203 | 776492889 | rail fence (generic 1.52 m) | 538 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0205 | 776492891 | rail fence (generic 1.52 m) | 290 | 25 | 0.94 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0215 | 776492901 | rail fence (generic 1.52 m) | 192 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0239 | 776821037 | rail fence (generic 1.52 m) | 668 | 25 | 0.97 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0267 | 777380130 | rail fence (generic 1.52 m) | 178 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0268 | 777380131 | rail fence (generic 1.52 m) | 138 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0272 | 777380135 | rail fence (generic 1.52 m) | 271 | 25 | 1 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0275 | 777380138 | rail fence (generic 1.52 m) | 213 | 25 | 0.97 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0276 | 777380139 | rail fence (generic 1.52 m) | 207 | 25 | 0.94 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0285 | 777387203 | rail fence (generic 1.52 m) | 56 | 25 | 1 | FEN-emmitsburg-road (inferred) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |
| FN-0329 | 779833689 | rail fence (generic 1.52 m) | 95 | 25 | 0.94 | — (no record names it) | OSM, NPS-TREAT-2004, LOC-BACH-1876 |

The 1863 style of a line is not read from the period sheet. Lines along the Emmitsburg Road (at least 70 percent of the line within 45 m of the road centreline, a rail style, as the record) take that record's state rows; every other line has no state row and stays as it is.

### 4.2 Buildings drawn as footprints (40)

| Id | Name | Geometry | Error (m) | Tier | Record | Height / form basis |
|---|---|---|---|---|---|---|
| STR-KLINGEL-HOUSE1 | Klingel farm house | footprint_2023_outline | 4 | inferred | bld-klingle-farm | 8.3 m to the ridge; 2 storeys documented (NPS-CLI-EMM quotation on STR-KLINGEL-HOUSE1 ("Two-story log house 26 x 21 ft"… |
| STR-TROSTLE-HOUSE1 | Trostle farm house | footprint_2023_outline | 4 | inferred | bld-trostle-farm#house | 9.6 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TROSTLE-BARN1 | Trostle barn | footprint_2023_outline | 4 | inferred | bld-trostle-farm#barn | 8.8 m to the ridge; generic bank_barn eave height 5.2 m (plausible-procedural class default) |
| STR-TROSTLE-SUMMER_KITCHEN1 | Trostle summer kitchen (under construction) | footprint_2023_outline | 15 | inferred | bld-trostle-farm | 4.4 m to the ridge; generic outbuilding: 1 storeys of 3 m (plausible-procedural class default) |
| STR-SHERFY-HOUSE1 | Sherfy farm house | footprint_2023_outline | 4 | inferred | bld-sherfy-farm#house | 8.9 m to the ridge; 2 storeys documented (dims_documented of STR-SHERFY-HOUSE1 ("brick Georgian, 2 stories")); storey h… |
| STR-CODORI-HOUSE1 | Codori farm house (1834 section) | footprint_2023_outline | 4 | inferred | bld-codori-farm | 8.9 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-SPANGLER_H-HOUSE1 | Henry Spangler farm house | footprint_2023_outline | 4 | inferred | bld-spangler-farm | 8.8 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-SPANGLER_H-BARN1 | Henry Spangler barn (burned in the battle; 1935 rec… | footprint_2023_outline | 4 | inferred | bld-spangler-farm#barn_forebay | 8.8 m to the ridge; generic bank_barn eave height 5.2 m (plausible-procedural class default) |
| STR-BRYAN-HOUSE1 | Brien (Bryan) house | footprint_2023_outline | 4 | inferred | bld-brian-farm | 6.2 m to the ridge; 1.5 storeys documented (dims_documented of STR-BRYAN-HOUSE1 ("1.5-story small frame house in 1863")… |
| STR-BRYAN-BARN1 | Brien (Bryan) barn | footprint_2023_outline | 4 | inferred | bld-brian-farm | 7.3 m to the ridge; generic barn eave height 4.8 m (plausible-procedural class default) |
| STR-LEISTER-HOUSE1 | Leister house | footprint_2023_outline | 4 | inferred | bld-leister-house | 8.0 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-LEISTER-BARN1 | Leister barn | footprint_2023_outline | 4 | inferred | bld-leister-house | 7.0 m to the ridge; generic barn eave height 4.8 m (plausible-procedural class default) |
| STR-HUMMELBAUGH-HOUSE1 | Hummelbaugh house | footprint_2023_outline | 4 | inferred | bld-hummelbaugh-farm | 8.3 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-HUMMELBAUGH-OUTBUILDING1 | Hummelbaugh farmstead: second building W of house (… | footprint_2023_outline | 4 | inferred | bld-hummelbaugh-farm | 6.5 m to the ridge; generic building: 1.5 storeys of 3 m (plausible-procedural class default) |
| STR-GWEIKERT-HOUSE1 | George Weikert house | footprint_2023_outline | 4 | inferred | bld-weikert-farm | 8.5 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-GWEIKERT-BARN1 | George Weikert barn | footprint_2023_outline | 4 | inferred | bld-weikert-farm | 7.8 m to the ridge; generic barn eave height 4.8 m (plausible-procedural class default) |
| STR-GWEIKERT-SUMMER_KITCHEN1 | George Weikert summer kitchen | footprint_2023_outline | 4 | inferred | bld-weikert-farm | 4.6 m to the ridge; generic outbuilding: 1 storeys of 3 m (plausible-procedural class default) |
| STR-JWEIKERT-HOUSE1 | John Weikert farm house | footprint_2023_outline | 4 | inferred | — | 8.3 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-ROSE-HOUSE1 | Rose farm house (stone) | footprint_2023_outline | 4 | inferred | bld-rose-farm#house | 9.1 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-SLYDER-HOUSE1 | Slyder house (granite) | footprint_2023_outline | 4 | inferred | bld-slyder-farm#house | 7.6 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-SLYDER-BARN1 | Slyder barn | footprint_2023_outline | 4 | inferred | bld-slyder-farm | 8.1 m to the ridge; generic barn eave height 4.8 m (plausible-procedural class default) |
| STR-BUSHMAN-HOUSE1 | Bushman farm house | footprint_2023_outline | 4 | inferred | bld-bushman-farm#house | 9.1 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-BUSHMAN-BARN1 | Bushman barn | footprint_2023_outline | 4 | inferred | bld-bushman-farm#barn | 7.8 m to the ridge; generic barn eave height 4.8 m (plausible-procedural class default) |
| STR-WARFIELD_SNYDER-HOUSE1 | Warfield house | footprint_2023_outline | 4 | inferred | bld-warfield-house | 8.4 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-MCMILLAN-HOUSE1 | McMillan house | footprint_2023_outline | 4 | inferred | bld-mcmillan-farm | 10.0 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-MCPHERSON-BARN1 | McPherson barn | footprint_2023_outline | 4 | inferred | bld-mcpherson-farm#barn | 8.8 m to the ridge; generic bank_barn eave height 5.2 m (plausible-procedural class default) |
| STR-CULP-HOUSE1 | Culp farm house (brick) | footprint_2023_outline | 4 | inferred | bld-henry-culp-farm | 10.2 m to the ridge; generic farmhouse: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-COURTHOUSE | Adams County Courthouse (Baltimore Street) | footprint_2023_outline | 8 | inferred | bld-courthouse | 10.2 m to the ridge; 2 storeys documented (structures.json bld-courthouse dimensions ("about 70 ft clock tower; two stor… |
| STR-TOWN-DEPOT | Gettysburg Railroad station (Carlisle Street; "Linc… | footprint_2023_outline | 6 | inferred | bld-rr-station | 7.7 m to the ridge; generic railroad_station: 1.5 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-CHRIST_LUTHERAN | Christ Lutheran Church (44 Chambersburg Street) | footprint_2023_outline | 18 | inferred | bld-poorhouse-christ-lutheran-wills#christ_lutheran_church | 12.8 m to the ridge; generic church: 2.5 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-PENN_HALL | Pennsylvania Hall ("Old Dorm"), Pennsylvania College | footprint_2023_outline | 4 | inferred | bld-pennsylvania-hall | 20.0 m to the ridge; 4 storeys documented (structures.json bld-pennsylvania-hall dimensions ("150 x 45 ft, 4 stories"));… |
| STR-TOWN-SCHMUCKER_HALL | Schmucker Hall, Lutheran Theological Seminary | footprint_2023_outline | 4 | inferred | bld-schmucker-hall | 15.3 m to the ridge; generic seminary_building: 3 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-THOMPSON_HOUSE | Thompson House (Lee's headquarters), Chambersburg P… | footprint_2023_outline | 4 | inferred | bld-thompson-house | 9.3 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-SCHULTZ_HOUSE | Schultz House (Oak Ridge Academy building) | footprint_2023_outline | 4 | inferred | — | 10.2 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-GATEHOUSE | Evergreen Cemetery gatehouse (Cemetery Hill) | footprint_2023_outline | 4 | inferred | bld-evergreen-gatehouse | 7.6 m to the ridge; generic gatehouse: 1.5 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-WADE_HOUSE | McClellan house, 548 Baltimore Street (Jennie Wade … | footprint_2023_outline | 6 | inferred | bld-wade-house | 8.5 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-GARLACH_HOUSE | Garlach house, Baltimore Street (Henry Garlach, cab… | footprint_2023_outline | 6 | inferred | — | 10.2 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-PRESBYTERIAN_CHURCH | Presbyterian Church, Baltimore Street (hospital 186… | footprint_2023_outline | 40 | inferred | bld-presbyterian-church | 12.8 m to the ridge; generic church: 2.5 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-DOBBIN_HOUSE | Dobbin House (89 Steinwehr Avenue) | footprint_traced | 6 | inferred | — | 8.5 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |
| STR-TOWN-SHEADS_HOUSE | Sheads House (331 Buford Avenue) | footprint_traced | 6 | inferred | — | 9.3 m to the ridge; generic house: 2 storeys of 3 m (plausible-procedural class default) |

The 229 borough masses (`STR-BORO-MASS-nnn`) are the inked extent of the building symbols of the Warren plate, error 20 m; they merge neighbouring buildings and may include buildings put up between July 1863 and 1869. They are drawn two storeys high with flat tops, labelled schematic.

### 4.3 Markers drawn (117)

| Id | Name | Kind | Error (m) | Tier | Record |
|---|---|---|---|---|---|
| STR-KLINGEL-OUTBUILDING1 | Klingel farmstead: wood building NE of the house (Warren plate) | building_point | 10 | inferred | bld-klingle-farm |
| STR-TROSTLE-HOG_PEN1 | Trostle log hog pen (seen in O'Sullivan photograph) | building_point | 25 | inferred | bld-trostle-farm |
| STR-SHERFY-BARN1 | Sherfy barn of 1863 (burned 3 July 1863) | building_point | 10 | inferred | bld-sherfy-farm#barn |
| STR-SHERFY-OUTBUILDING1 | Sherfy farmstead: wood building W of the house (Warren plate) | building_point | 11 | inferred | bld-sherfy-farm |
| STR-CODORI-BARN1 | Codori barn standing in 1868-69 (Warren plate) | building_point | 10 | inferred | bld-codori-farm#barn |
| STR-CODORI-OUTBUILDING1 | Codori farmstead: wood building E of the barn (Warren plate) | building_point | 11 | inferred | bld-codori-farm |
| STR-SPANGLER_H-OUTBUILDING3 | Spangler farmstead: wood building W of the house (Warren plate) | building_point | 10 | inferred | bld-spangler-farm |
| STR-SPANGLER_H-OUTBUILDING4 | Spangler farmstead: stone-lettered symbol E of the house (Warren plat… | building_point | 10 | inferred | bld-spangler-farm |
| STR-SPANGLER_H-OUTBUILDING5 | Spangler farmstead: building N of the house (Warren plate) | building_point | 10 | inferred | bld-spangler-farm |
| STR-JWEIKERT-OUTBUILDING1 | John Weikert farmstead: other symbols on the Warren plate | building_point | 25 | inferred | — |
| STR-JWEIKERT-OUTBUILDING2 | John Weikert farmstead: second symbol | building_point | 25 | inferred | — |
| STR-ROSE-BARN1 | Rose barn (granite walls; ruin) | building_point | 10 | inferred | bld-rose-farm#barn |
| STR-ROSE-OUTBUILDING2 | Rose farmstead: wood building on the Warren plate | building_point | 10 | inferred | bld-rose-farm |
| STR-SLYDER-OUTBUILDING1 | Slyder farmstead: wood building W of the house (Warren plate) | building_point | 11 | inferred | bld-slyder-farm |
| STR-WARFIELD_SNYDER-OUTBUILDING1 | Warfield farmstead: other symbols (3) | building_point | 10 | inferred | bld-warfield-house |
| STR-WARFIELD_SNYDER-OUTBUILDING2 | Warfield farmstead: other symbol 2 | building_point | 10 | inferred | bld-warfield-house |
| STR-WARFIELD_SNYDER-OUTBUILDING3 | Warfield farmstead: other symbol 3 | building_point | 10 | inferred | bld-warfield-house |
| STR-WARFIELD_SNYDER-OUTBUILDING4 | Snyder farmstead: building 1 (Warren plate) | building_point | 25 | inferred | bld-snyder-farm |
| STR-WARFIELD_SNYDER-OUTBUILDING5 | Snyder farmstead: building 2 (Warren plate) | building_point | 25 | inferred | bld-snyder-farm |
| STR-WENTZ-HOUSE1 | Wentz log house (site and ruin) | building_point | 20 | inferred | bld-wentz-farm |
| STR-WENTZ-OUTBUILDING1 | Wentz farmstead: building 2 (Warren plate) | building_point | 25 | inferred | bld-wentz-farm |
| STR-WENTZ-OUTBUILDING2 | Wentz farmstead: building 3 (Warren plate) | building_point | 25 | inferred | bld-wentz-farm |
| STR-ROGERS-HOUSE1 | Rogers farm buildings (3 Warren-plate symbols) | building_point | 20 | inferred | bld-rogers-house |
| STR-ROGERS-OUTBUILDING1 | Rogers farmstead: symbol 1 | building_point | 25 | inferred | bld-rogers-house |
| STR-ROGERS-OUTBUILDING2 | Rogers farmstead: symbol 3 | building_point | 25 | inferred | bld-rogers-house |
| STR-BLISS-HOUSE1 | Bliss house (burned 3 July 1863) | building_point | 20 | inferred | bld-bliss-farm#house |
| STR-BLISS-BARN1 | Bliss barn (large stone barn, burned 3 July 1863) | building_point | 20 | inferred | bld-bliss-farm#barn |
| STR-MCMILLAN-BARN1 | McMillan barn (lost) | building_point | 25 | inferred | bld-mcmillan-farm |
| STR-MCMILLAN-OUTBUILDING1 | McMillan log building 18 x 20 ft (lost) | building_point | 25 | inferred | bld-mcmillan-farm |
| STR-CULP-OUTBUILDING1 | Culp farmstead: symbol 2 (Warren plate) | building_point | 45 | inferred | bld-henry-culp-farm |
| STR-CULP-OUTBUILDING2 | Culp farmstead: symbol 3 (stone-lettered) | building_point | 45 | inferred | bld-henry-culp-farm |
| STR-CULP-OUTBUILDING3 | Culp farmstead: symbol 4 | building_point | 45 | inferred | bld-henry-culp-farm |
| STR-CULP-OUTBUILDING4 | Culp farmstead: symbol 5 | building_point | 45 | inferred | bld-henry-culp-farm |
| STR-FRY-OUTBUILDING1 | Frey farmstead: building 1 (Warren plate) | building_point | 25 | inferred | — |
| STR-FRY-OUTBUILDING2 | Frey farmstead: building 2 (Warren plate) | building_point | 25 | inferred | — |
| STR-FRY-OUTBUILDING3 | Frey farmstead: building 3 (Warren plate) | building_point | 25 | inferred | — |
| STR-PATTERSON-HOUSE1 | Patterson farmstead: building 1 (Warren plate) | building_point | 25 | inferred | — |
| STR-PATTERSON-OUTBUILDING1 | Patterson farmstead: building 2 (Warren plate) | building_point | 25 | inferred | — |
| STR-PATTERSON-OUTBUILDING2 | Patterson farmstead: building 3 (Warren plate) | building_point | 25 | inferred | — |
| STR-SITE-MCALLISTER_MILL | McAllister's Mill complex (grist and saw mills with two dams), Rock C… | named_point | 150 | inferred | — |
| STR-MAPSYM-0059 | Building symbol near owner label "KITSMAN." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0060 | Building symbol near owner label "KITSMAN." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0064 | Building symbol near owner label "J.CRAWFORD" (unreviewed) | building_point | 45 | inferred | — |
| STR-MAPSYM-0080 | Building symbol near owner label "H.DUSTMAN." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0081 | Building symbol near owner label "H.DUSTMAN." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0087 | Building symbol near owner label "SHEADS." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0088 | Building symbol near owner label "H.DUSTMAN." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0089 | Building symbol near owner label "SHEADS." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0090 | Building symbol near owner label "Y.U.TATE" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0092 | Building symbol near owner label "J.J.KIRK." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0094 | Building symbol near owner label "J.J.KIRK." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0095 | Building symbol near owner label "E,HARMAN" (unreviewed) | building_point | 60 | inferred | — |
| STR-MAPSYM-0096 | Building symbol near owner label "HOFFMAN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0097 | Building symbol near owner label "HOFFMAN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0098 | Building symbol near owner label "E,HARMAN" (unreviewed) | building_point | 60 | inferred | — |
| STR-MAPSYM-0099 | Building symbol near owner label "HOFFMAN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0102 | Building symbol near owner label "J.HERBST." (unreviewed) | building_point | 60 | inferred | — |
| STR-MAPSYM-0103 | Building symbol near owner label "J.HERBST." (unreviewed) | building_point | 60 | inferred | — |
| STR-MAPSYM-0105 | Building symbol near owner label "D.BENNER." (unreviewed) | building_point | 45 | inferred | — |
| STR-MAPSYM-0106 | Building symbol near owner label "D.BENNER." (unreviewed) | building_point | 45 | inferred | — |
| STR-MAPSYM-0107 | Building symbol near owner label "BENNE" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0115 | Building symbol near owner label "BENNE" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0131 | Building symbol near owner label "SAM.DICKON," (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0132 | Building symbol near owner label "SAM.DICKON," (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0133 | Building symbol near owner label "WOUSE." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0134 | Building symbol near owner label "WOUSE." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0146 | Building symbol near owner label "GEO.CULP" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0148 | Building symbol near owner label "GEO.CULP" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0151 | Building symbol near owner label "PROSTLE." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0152 | Building symbol near owner label "PROSTLE." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0163 | Building symbol near owner label "HENRY SPANGLER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0164 | Building symbol near owner label "HENRY SPANGLER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0165 | Building symbol near owner label "HENRY SPANGLER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0166 | Building symbol near owner label "HENRY SPANGLER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0167 | Building symbol near owner label "HENRY SPANGLER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0168 | Building symbol near owner label "LEYSTERIO" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0169 | Building symbol near owner label "LEYSTERIO" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0170 | Building symbol near owner label "LEYSTERIO" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0171 | Building symbol near owner label "LEYSTERIO" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0173 | Building symbol near owner label "ED.PLANK." (unreviewed) | building_point | 44 | inferred | — |
| STR-MAPSYM-0179 | Building symbol near owner label "D.LIGHTNER." (unreviewed) | building_point | 34 | inferred | — |
| STR-MAPSYM-0180 | Building symbol near owner label "D.LIGHTNER." (unreviewed) | building_point | 34 | inferred | — |
| STR-MAPSYM-0181 | Building symbol near owner label "S.CASSALT.." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0182 | Building symbol near owner label "S.CASSALT.." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0187 | Building symbol near owner label "W.PATERSON." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0188 | Building symbol near owner label "W.PATERSON." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0189 | Building symbol near owner label "SLAUB." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0192 | Building symbol near owner label "SLAUB." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0196 | Building symbol near owner label "G.SPAN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0197 | Building symbol near owner label "I.M.DIEHLO" (unreviewed) | building_point | 51 | inferred | — |
| STR-MAPSYM-0202 | Building symbol near owner label "I.M.DIEHLO" (unreviewed) | building_point | 50 | inferred | — |
| STR-MAPSYM-0227 | Building symbol near owner label "RICKER." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0229 | Building symbol near owner label "PSNYOER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0232 | Building symbol near owner label "PSNYOER" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0233 | Building symbol near owner label "FRASK SHER" (unreviewed) | building_point | 46 | inferred | — |
| STR-MAPSYM-0238 | Building symbol near owner label "J.WEIRERT." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0239 | Building symbol near owner label "J.WEIRERT." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0242 | Building symbol near owner label "IKART" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0244 | Building symbol near owner label "IKART" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0249 | Building symbol near owner label "A.KERN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0250 | Building symbol near owner label "A.KERN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0251 | Building symbol near owner label "A.KERN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0253 | Building symbol near owner label "A.KERN" (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0255 | Building symbol near owner label "LEWIS PLANK." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0258 | Building symbol near owner label "LEWIS PLANK." (unreviewed) | building_point | 30 | inferred | — |
| STR-MAPSYM-0259 | Building symbol near owner label "LEWIS PLANK." (unreviewed) | building_point | 30 | inferred | — |
| STR-TOWN-GATEHOUSE_PAVILION | Pavilion beside the Evergreen Cemetery gatehouse | building_point | 15 | inferred | — |
| RL-006 | Gettysburg Railroad passenger depot (Lincoln Railroad Station), Carli… | depot | 15 | inferred | — |
| RL-007 | Rock Creek trestle of the Gettysburg Railroad (burned 27 June 1863) | trestle | 40 | inferred | bld-rock-creek-rr-bridge |
| BR-002 | Baltimore Pike over Rock Creek | bridge | 70 | documented | — |
| BR-004 | Chambersburg Pike over Stevens Run | crossing | 30 | open gap | — |
| BR-006 | Hanover Road over Rock Creek | bridge | 30 | documented | — |
| BR-007 | York Pike over Rock Creek | bridge | 30 | documented | — |
| BR-009 | Carlisle Road over Stevens Run | crossing | 30 | open gap | — |
| BR-011 | Hagerstown Road over Willoughby Run | bridge | 30 | inferred | — |
| BR-013 | Hagerstown Road over Stevens Run | crossing | 30 | open gap | — |
| BR-015 | Black Horse Tavern Road over Willoughby Run | ford | 30 | inferred | — |

### 4.4 Roads, lanes and railway drawn (30)

| Id | Name | Surface | Width (m, generic) | Error (m) | Tier of the surface | Basis of the surface |
|---|---|---|---|---|---|---|
| RD-001 | Baltimore Pike (Baltimore Turnpike), with Baltimore Street … | macadam | 6.5 | 22 | documented | NPS-TREAT-2004 p20, 22-23 (three of the roads from Gettysburg were macadamized turnpikes); which three is named only fo… |
| RD-002 | Chambersburg Pike (Chambersburg Turnpike) | macadam | 6.5 | 28 | documented | NPS-TREAT-2004 p20, 22-23 (three of the roads from Gettysburg were macadamized turnpikes); which three is named only fo… |
| RD-003 | Emmitsburg Road | dirt | 5.5 | 22 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-004 | Taneytown Road, with Washington Street in the borough | dirt | 5.5 | 20 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-005 | Hanover Road | dirt | 5.5 | 37 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-006 | York Pike (York Turnpike) | macadam | 6.5 | 32 | inferred | NPS-TREAT-2004 p20, 22-23 (three of the roads from Gettysburg were macadamized turnpikes); which three is named only fo… |
| RD-007 | Harrisburg Road | dirt | 5.5 | 35 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-008 | Carlisle Road | dirt | 5.5 | 15 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-009 | Mummasburg Road | dirt | 5.5 | 35 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-010 | Hagerstown Road (Fairfield Road of the ten-road list; Nicho… | dirt | 5.5 | 32 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-011 | Hereter's Mill Road (Old Mill Road) | dirt | 4.5 | 24 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-012 | Herr's Ridge Road | dirt | 4.5 | 30 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-013 | Black Horse Tavern Road | dirt | 4.5 | 28 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-014 | Wheatfield Road | dirt | 4.5 | 27 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-015 | Fairfield Road at the Peach Orchard (modern Millerstown Roa… | dirt | 4.5 | 30 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-016 | Granite Schoolhouse Lane | dirt | 3 | 21 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-018 | McAllister's Mill road | dirt | 3 | 32 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-019 | Willoughby Run Road | dirt | 4.5 | 25 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-022 | Hunterstown Road | dirt | 4.5 | 22 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-024 | The Diamond (town square of Gettysburg) | dirt | 5.5 | 25 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-029 | Road drawn on the Warfield Ridge / Rose farm side (unnamed … | dirt | 3 | 25 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-030 | North Stratton Street (road north from the Harrisburg/Mumma… | dirt | 4.5 | 35 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-031 | Slyder farm lane | dirt | 3 | 35 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| RD-032 | Bushman farm lane | dirt | 3 | 35 | plausible-procedural | NPS-TREAT-2004 p20 (most of the ten roads at the square were dirt); generic for a county or township road, a lane or a … |
| LN-001w | Trostle-Weikert-Swisher Lane, Emmitsburg Road to the Codori… | cart | 3 | 25 | plausible-procedural | NPS-TREAT-2004 p27-28: the woodlot section is a cart path, the outer sections improved; generic |
| LN-001e | Trostle-Weikert-Swisher Lane, woodlot to the Taneytown Road… | cart | 3 | 40 | plausible-procedural | NPS-TREAT-2004 p27-28: the woodlot section is a cart path, the outer sections improved; generic |
| LN-010 | H. Spangler Farm Lane (Emmitsburg Road to the Spangler buil… | cart | 3 | 25 | plausible-procedural | NPS-TREAT-2004 p27-28: the woodlot section is a cart path, the outer sections improved; generic |
| LN-004 | Codori Field Access (East), Emmitsburg Road eastward to the… | cart | 3 | 25 | plausible-procedural | NPS-TREAT-2004 p27-28: the woodlot section is a cart path, the outer sections improved; generic |
| RL-001 | Gettysburg Railroad (Hanover Junction, Hanover and Gettysbu… | rail | 4 | 25 | plausible-procedural | the line is the railway; track gauge and ballast are not in the record (generic bed) |
| RL-002 | Unfinished Gettysburg Railroad grade west of the borough (t… | grade | 5 | 20 | plausible-procedural | graded, no track laid (p.subtype); bed colour generic |

### 4.5 Not drawn: groups with examples

| Layer | Reason | Features | Examples |
|---|---|---|---|
| basemap structures | no georeferenced geometry in the repository (UNKNOWN position) | 14 | STR-KLINGEL-BAKE_OVEN1, STR-SPANGLER_H-OUTBUILDING1, STR-SPANGLER_H-OUTBUILDING2, STR-GWEIKERT-SPRING_HOUSE1, STR-ROSE-SUMMER_KITCHEN1 |
| basemap structures | outside the loaded ground (6.2 x 6.1 km) | 129 | STR-MCLEAN-BARN1, STR-MCLEAN-HOUSE1, STR-HAGY_BEAMS-HOUSE1, STR-HAGY_BEAMS-OUTBUILDING1, STR-HAGY_BEAMS-OUTBUILDING2 |
| basemap structures | rejected: not a building symbol (the review found no building at the point) | 13 | STR-MAPSYM-0017, STR-MAPSYM-0058, STR-MAPSYM-0076, STR-MAPSYM-0085, STR-MAPSYM-0091 |
| basemap structures | machine-detected plate symbol, not reviewed by hand (the basemap lists it as undrawn) | 73 | STR-MAPSYM-0062, STR-MAPSYM-0063, STR-MAPSYM-0065, STR-MAPSYM-0071, STR-MAPSYM-0074 |
| basemap fences | no continuous drawn line along it on the period sheet (a modern fence, or beyond the registration accuracy) | 271 | FN-0001, FN-0002, FN-0003, FN-0004, FN-0006 |
| basemap fences | shorter than 40 m: not checked against the period sheet | 85 | FN-0005, FN-0019, FN-0021, FN-0023, FN-0024 |
| basemap fences | outside the loaded ground (6.2 x 6.1 km) | 6 | FN-0060, FN-0072, FN-0073, FN-0080, FN-0081 |
| basemap roads | extent unknown / confidence Unknown: the basemap does not draw it | 1 | RD-017 |
| basemap roads | outside the loaded ground (6.2 x 6.1 km) | 7 | RD-020, RD-021, RD-023, RD-025, RD-026 |
| basemap railways | extent unknown / confidence Unknown: the basemap does not draw it | 1 | RL-002W |
| basemap railways | not in 1863 (post-1863 railway) | 2 | RL-003, RL-005 |
| basemap railways (no geometry file) | not in 1863 (no geometry) | 1 | RL-004 |
| basemap lanes (inventory without geometry) | named lane with no traced line in the repository | 18 | LN-002, LN-003, LN-005, LN-006, LN-007 |
| basemap bridges | outside the loaded ground (6.2 x 6.1 km) | 11 | BR-001, BR-003, BR-005, BR-008, BR-010 |

## 5. Hospitals

11 of the 23 hospitals of `structures/hospitals.json` name a building that is drawn or marked (`structure_ids`, the record's own link). A badge ("H") is shown on the building while the hospital is open: hollow inside the printed date window of its setup or closing, solid after it, gone after the closing window. A hospital with no printed setup time gets no timed badge (its card says so). The others have no building geometry or name no building:

| Hospital | Name | Host building | Decision |
|---|---|---|---|
| H-01 | Presbyterian Church and nearby buildings | bld-presbyterian-church | marked on its host building: hospitals.json names bld-presbyterian-church; drawn or marked: bld-presbyterian-church |
| H-02 | St. Francis Xavier church | bld-st-francis-xavier | not drawn: its host (bld-st-francis-xavier) has no geometry in the repository |
| H-03 | Seminary, Pennsylvania College, courthouse, churc… | bld-schmucker-hall, bld-pennsylvania-hall, bld-courthouse | marked on its host building: hospitals.json names bld-schmucker-hall, bld-pennsylvania-hall, bld-courthouse; drawn or marked: bld-schmucker-hall, bld… |
| H-04 | I Corps July 2 site | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-05 | McPherson farm | bld-mcpherson-farm | marked on its host building: hospitals.json names bld-mcpherson-farm; drawn or marked: bld-mcpherson-farm |
| H-06 | Spangler farm | bld-spangler-farm | marked on its host building: hospitals.json names bld-spangler-farm; drawn or marked: bld-spangler-farm |
| H-07 | Granite Schoolhouse | bld-granite-schoolhouse | not drawn: its host (bld-granite-schoolhouse) has no geometry in the repository |
| H-08 | Weikert farm | bld-weikert-farm | marked on its host building: hospitals.json names bld-weikert-farm; drawn or marked: bld-weikert-farm |
| H-09 | V Corps | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-10 | III Corps | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-11 | II Corps | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-12 | Hummelbaugh farm | bld-hummelbaugh-farm | marked on its host building: hospitals.json names bld-hummelbaugh-farm; drawn or marked: bld-hummelbaugh-farm |
| H-13 | Trostle farm | bld-trostle-farm | marked on its host building: hospitals.json names bld-trostle-farm; drawn or marked: bld-trostle-farm |
| H-14 | VI Corps | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-15 | Bushman farm | bld-bushman-farm | marked on its host building: hospitals.json names bld-bushman-farm; drawn or marked: bld-bushman-farm |
| H-16 | Leister house/barn | bld-leister-house | marked on its host building: hospitals.json names bld-leister-house; drawn or marked: bld-leister-house |
| H-17 | Rock Creek-White Run complex | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-18 | Other minor sites | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-19 | Daniel Lady farm | bld-daniel-lady-farm | not drawn: its host (bld-daniel-lady-farm) has no geometry in the repository |
| H-20 | Seminary (Confederate use), McPherson barn | bld-schmucker-hall, bld-mcpherson-farm | marked on its host building: hospitals.json names bld-schmucker-hall, bld-mcpherson-farm; drawn or marked: bld-schmucker-hall, bld-mcpherson-farm |
| H-21 | Rose, Slyder, Bushman barns | bld-rose-farm, bld-slyder-farm, bld-bushman-farm | marked on its host building: hospitals.json names bld-rose-farm, bld-slyder-farm, bld-bushman-farm; drawn or marked: bld-rose-farm, bld-slyder-farm, … |
| H-22 | Town as "one vast hospital" | — | not drawn: hospitals.json names no building for it, and it has no geometry |
| H-23 | General hospital Camp Letterman | — | not drawn: hospitals.json names no building for it, and it has no geometry |

## 6. Generic dimensions and forms (all plausible-procedural unless stated)

| Item | Value | Basis |
|---|---|---|
| Storey height | 3 m | generic |
| Roof | gable, 30 degree pitch over the minimum bounding rectangle of the footprint, ridge along the long side; flat for masses | generic form (roof material is not recorded except for a few shingle roofs; the colour is generic) |
| Eave heights | house 6 m (2 storeys), barn 4.8-5.2 m, outbuilding 3 m, institutional 7.5 m, college/seminary 9 m, church 7.5 m, other 4.5 m | class defaults by catalogue subtype; the five documented storey counts override them |
| Rail fence | 1.52 m high, 3.35 m panels, posts and four rails | generic post-and-rail (rails about 11 ft, height about 5 ft): PDF B.8.3 from a non-Gettysburg source (ECW-PostRail), flagged there as generic, not site data |
| Stone wall | 0.76 m high, 0.6 m thick | generic low field wall, 2.5 ft: the Angle wall was originally about 2-3 ft (PDF B.7.3 P-01) and a critic gives about 2 ft (B.8.3); NOT the 48-52 in. of the rebuilt park walls |
| Road width | turnpike 6.5 m, county road 5.5 m, township road 4.5 m, lane 3 m, railway bed 4 m, grade 5 m | the widths the base map draws (BUILD.md 4.3), generic, not measured |
| Road surface | macadam for the turnpikes (documented for the Baltimore and Chambersburg pikes; the York Pike by class: inferred), dirt otherwise (NPS: most were dirt) | NPS-TREAT-2004 p20, 22-23; flat colours, no photograph claim |
| Colours | flat colours by material class (brick, stone, log, frame, generic), shingle roofs, charred when burned | no photograph is claimed; material only where the catalogue says |

## 7. State over time

The state of an object is `state_at(structure id or part id, time, scenario)` of `tools/bt/check_structures.py`, ported to `src/structures/state.mjs` and tested equal on every record, part, hospital and scenario at a grid of times and at every printed bound of every row (+-1 minute). The page quantizes the time to a quarter minute, so the buffer the shaders read is a pure function of that time and the chosen readings: the same minute gives the same picture however it was reached (tested through seeks, detours and playback).

| The schedule says | Drawn as |
|---|---|
| the object is in one state (before, after, or no row) | that state (A = B) |
| a change inside a printed clock window (`transitioning`) | A and B mixed by progress through the window: panels fall one by one, burning and scarring spread over the surface by world cell (a screen-door), so the picture grows with the clock |
| a change dated only to a day (`indeterminate within date window`) | half and half (a 50 percent screen-door of the two states) for the whole window; the card says "Date only" and why. It is **not** put at a guessed hour: the Bliss and Sherfy fires therefore show half burned all of 3 July and fully burned from midnight (the printed "morning" and "afternoon" are not parsed as bounds in the schedule) |

Only physical states are drawn: burned, shell and bullet damage (building and marker); splintered, breached, dismantled, felled, knocked down, destroyed, missing, burned (fence). Role and use states (hospital, headquarters, school, occupied) change no pixel and are on the card; hospitals also get the badge above. `tests/structures3d.test.mjs` fails if a physical-sounding state of a drawn object is not mapped.

Readings of the conflicts: the eleven printed defaults PD-01..PD-11 (`state_schedule.json`, all PENDING OWNER) are selectable in Sources ("How the structures follow these conflicts"), and each object card has a "Reading of the record" selector for its own scenarios; the card choice wins. Nothing is chosen for the viewer.

## 8. Rendering, levels of detail and measured cost

Hooks: the prototype renderers call an optional `ext` at the end of the shadow and scene passes (two null-guarded lines in each of `webgpu.mjs` and `webgl2.mjs`); everything else is in `src/structures/`. One draw call per class: roads (static ribbons, `less-equal` depth with a lift that grows with distance, alpha-blended edges), buildings (static mesh with per-object state, cast and receive shadows), fence panels near (full detail, within 170 m), stone panels near, fence impostors (a thin ribbon plus a vertical plane, 170 m to 1.6 km), markers (instanced, scaled with distance so they stay visible). Culling: fence panels are culled in chunks of 12 by distance and by frustum on the CPU and compacted into small instance buffers; nothing beyond 1.6 km.

Machine: nvidia blackwell, Chrome 155.0.8059.82, 1920 x 1080, 3 Jul 13:30 (the real layer: 430 units). Frame times as a person sees them (display paced), GPU and CPU times per frame; "off" is the same page with `?structures=off`.

| API | View | Structures | Frame p50 / p95 (ms) | CPU p50 / p95 (ms) | GPU p50 / p95 (ms) | Draws | Triangles | GPU memory total (MB) | Structures memory (KB) | Long tasks |
|---|---|---|---|---|---|---|---|---|---|---|
| webgpu | overview | off | 16.7 / 16.8 | 1.6 / 2.2 | 0.763 / 0.78 | — | — | 115.4 | — | 0 |
| webgpu | overview | on | 16.7 / 16.8 | 1.9 / 2.4 | 0.7959999999999999 / 0.809 | 3 | 33776 | 117.9 | 2603.1 | 0 |
| webgpu | town | off | 16.7 / 16.8 | 2.6 / 3.2 | 0.8390000000000001 / 0.858 | — | — | 115.4 | — | 0 |
| webgpu | town | on | 16.7 / 16.8 | 2.8 / 3.4 | 0.8740000000000001 / 0.887 | 3 | 33776 | 117.9 | 2603.1 | 0 |
| webgpu | close | off | 16.7 / 16.8 | 2.1 / 2.8 | 0.6829999999999999 / 0.696 | — | — | 115.4 | — | 0 |
| webgpu | close | on | 16.7 / 16.8 | 2.3 / 2.7 | 0.821 / 0.8390000000000001 | 5 | 40996 | 117.9 | 2603.1 | 0 |
| webgl2 | overview | off | 16.7 / 16.8 | 1.7 / 2.2 | 1.412 / 1.605 | — | — | 123 | — | 0 |
| webgl2 | overview | on | 16.7 / 16.8 | 1.9 / 2.6 | 1.4680000000000002 / 3.2960000000000003 | 3 | 33776 | 125.6 | 2604.6 | 0 |
| webgl2 | town | off | 16.7 / 16.8 | 2.9 / 3.7 | 1.828 / 1.9809999999999999 | — | — | 123 | — | 0 |
| webgl2 | town | on | 16.7 / 16.8 | 2.8 / 3.5 | 1.889 / 2.161 | 3 | 33776 | 125.6 | 2604.6 | 0 |
| webgl2 | close | off | 16.7 / 16.8 | 2.1 / 2.6 | 1.3780000000000001 / 3.208 | — | — | 123 | — | 0 |
| webgl2 | close | on | 16.7 / 16.8 | 2.3 / 2.9 | 1.876 / 3.44 | 5 | 40996 | 125.6 | 2604.6 | 0 |

The PDF gate Q15 is a placeholder of 6 to 11 ms at 1080p; the existing gate of the page (frame p95 at most 20 ms) holds with the structures on in every case above. WebGL2 has no GPU timer here (`—`).

## 9. Provisional builder choices (DEC-016)

Logged in `GOVERNANCE/decision_log.md` as DEC-016, each reversible, none a scope reduction: (1) the 229 borough masses are drawn, as schematic masses, and can be switched off in Views; (2) a date-only change is shown half and half for its whole window; (3) the fences along the Emmitsburg Road take the record's state rows by a stated proximity rule (inferred); (4) point-only structures are poles, never buildings; (5) generic heights and widths as in section 6; (6) works stay rings; (7) the structures are drawn on the placeholder layer too (`?structures=off` removes them).

## 10. Not done, and known limits

- 11 building records have no geometry in the repository (pierce-house, burns-house, sweney-rupp-mccreary, town-belfry, st-francis-xavier, herbst, biggs-house, granite-schoolhouse, taney-farm, rummel-farm, daniel-lady-farm): listed, not drawn. 5 have only a point (rock-creek-rr-bridge, rogers-house, bliss-farm, wentz-farm, snyder-farm); the Sherfy and Codori barns and the Bliss house and barn are poles, not buildings. The McPherson farmhouse (burned 1895) has no geometry either.
- Towers, cupolas and porches are not drawn: the 70 ft clock tower of the courthouse and the cupolas of Schmucker Hall and Pennsylvania Hall (S-002 marks one as a signal post) are documented but have no mapped footprint, and a role change of a cupola is not a pixel change.
- Footprints of surviving buildings are today's outlines; the 1863 form may be smaller (the basemap says so per feature and the card repeats it). Where a later building stands on an 1863 site (the Spangler barn of 1935) the card says what the outline represents.
- 1863 fence styles (worm, board, picket, iron) are recorded by name only: no line in the repository carries them, so none is drawn; the worm panel mesh exists and is used for any line the record styles `worm`.
- No work has a mapped line (the rings stay 2D marks); no earthwork, gun pit or traverse is drawn in 3D, and none is derived from modern rebuilt profiles.
- The ground is the modern ground (roads and cuts of today). Road ribbons are laid on it; the modern road below can show through where the 1863 centreline is off by its error (15 to 37 m).
- Smoke, fire and damage are marks on surfaces, not simulated: a burned building loses its roof and darkens; no flames are drawn.
- Features outside the loaded 6.2 x 6.1 km are listed as outside: 129 of structures, 6 of fences, 7 of roads, 11 of bridges.

