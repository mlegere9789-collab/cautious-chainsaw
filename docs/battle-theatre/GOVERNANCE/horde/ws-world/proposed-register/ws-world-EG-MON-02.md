# ws-world-EG-MON-02: 77 memorials and 2 tour stops lie beyond the loaded ground

| Field | Content |
|---|---|
| ID | ws-world-EG-MON-02 |
| Requirement IDs | OA01 (the 16 tour stops and 512 monuments as camera bookmarks); R14; Law clauses 3 and 7 |
| Category | evidence missing (the ground there is not loaded) |
| Description | The theatre's loaded ground is 6,160 by 6,123 m (terrain and aerial photograph of the prototype). Of the site's 512 monuments 435 stand on it and 77 beyond it (27 east and 1 north-east, 45 north, 2 north-west, 2 south; the farthest, the 3rd Pennsylvania Cavalry Monument, 3,201 m beyond the east edge, at East Cavalry Field); of the 16 tour stops 14 are on it and 2 beyond it (Tour Stop 2, Eternal Light Peace Memorial, 1,120 m, and Tour Stop 3, Oak Ridge, 557 m, both beyond the north edge). The shell's Views list shows all of them and disables these 77 and 2 as "outside the loaded ground" (the shell's rule, geo.inside(x, z, 0), gives exactly 77 and 2). |
| Why literal 100% is not possible or blocked | There is no terrain, no aerial image and no 1863 reconstruction outside the loaded ground, so there is nothing to stand on and nothing to fly over there. Extending the ground is a scope decision of the ground itself (terrain, imagery, 1863 layers), not of the memorial layer. |
| Evidence searched | The site's data for the places (lat/lng, read-only copy); the prototype terrain metadata (z15 box, width and height); the shell's Views panel and its rule. |
| Autonomous substitute applied | Each of the 77 memorials and the 2 stops is offered: the camera goes to the edge of the loaded ground (60 m inside it, 220 m back from the point of the edge nearest the place, 140 m above the ground there) and looks toward the place; the card, the panel row, the pin and the announcement say how far beyond which edge the place is. A memorial's mark and a stop's pin stand at the height of the nearest loaded ground (the terrain function answers with the edge sample), because the ground there is not loaded. |
| Strongest evidence-based reconstruction | Load the ground to cover the 77 places (by the site's own place lines: 45 north of the town on the First Day field, along Doubleday, Howard, Buford and Reynolds Avenues and at Barlow's Knoll; 28 east and north-east of the town (24 place lines name East Cavalry Field or East Cavalry Battlefield, 3 the Hanover Road or Brinkerhoff's Ridge, 1 Highland Avenue), 3.2 km at the farthest; 2 on the Chambersburg Pike west of the town; 2 at South Cavalry Field and on the Taneytown Road), with the 1863 layers, when the ground is extended; until then the substitute stands. |
| Confidence tier | inferred (the place, the site's list as it stands); plausible-procedural (the height of a mark beyond the ground) |
| Competing values | - |
| Product marking | "N m beyond the <edge> edge of the loaded ground" on the card, the row and the pin; hollow mark for a memorial beyond the ground; the ground sentence in the panel names this entry. |
| Visual and audio impact | A distant view from the edge toward a place; no scene content added. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Whether the loaded ground is to be extended (scope of the ground). Recorded as a delegated decision with the substitute kept (DD-WORLD-02). |
| Agent recommendation | Keep the substitute; extend the ground when the terrain layers are rebuilt for another reason. |
| Status | open (proposed by bt-world-content; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
