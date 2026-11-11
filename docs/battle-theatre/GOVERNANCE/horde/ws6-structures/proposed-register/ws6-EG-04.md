# ws6-EG-04: Where the limbers, teams and caissons stand, which way they face, and that no road column is drawn

| Field | Content |
|---|---|
| ID | ws6-EG-04 |
| Requirement IDs | B.6.14.4, B.6.14.9, Q05 |
| Category | evidence missing |
| Description | Documented: the limber stands behind the unlimbered piece with the end of its pole 6 yd from the end of the trail handspike (FIELDART-1863 para 96, 126: ART-FA-09, ART-FA-72); no positive rule for caissons in action (ART-FA-80). Open: the paraphrase says the limber 'faces' the piece, but a hitched six-horse team cannot stand inside those 6 yd, and the repository holds no text on where the team stands. The product puts the limber axle 11.3 m behind the gun axle (2.8 m trail procedural + 6 yd documented + 3.0 m pole procedural, 12.3 yd: inside the PDF's inferred 10-15 yd), the team behind it facing the rear, caissons 35 m (second caisson 53 m) and the battery wagon and forge 75 m behind in a rear park. The train is attached to the battery's slot (the renderer has one slot layout per unit), so no column of vehicles along the road is drawn; its heading eases over 240 s because a rigid 100 m train swept by the stage's 25 s block turn moved its outer vehicles at 30 m/s (measured at Pegram's battalion, 3 July 00:00). |
| Why literal 100% is not possible or blocked | No carriage, harness or team dimension in the repository; the manual's text on the team post was not extracted. |
| Evidence searched | drill/drill_artillery.json ART-FA-01..10, 50, 55, 70-82; kit/KIT-NOTES.md; src/world-from-units.mjs CREW_POSTS (gunner at 2.8 m). |
| Autonomous substitute applied | All distances in data/artillery-train.json layout with tiers (limber inferred; teams, caissons, park plausible-procedural). |
| Strongest evidence-based reconstruction | Read the School of the Battery and Field Service text for team posts and column order; model the column on the road from the history layer's path. |
| Confidence tier | inferred (limber distance); plausible-procedural (team post, orientation, caisson and park distances, turn rate) |
| Competing values | - |
| Product marking | Tier glyph on every vehicle; the card says 'no column on the road is modelled'. |
| Visual and audio impact | Limbers and teams stand behind each gun; on the march the train moves with the block. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | Accept the attached train, or ask for a column along the road (needs the stage to move vehicles on the unit's path: not in this workstream's files). |
| Agent recommendation | Also ask the stage owner to scale the block turn time with the formation's extent (TURN_S 25 s). |
| Status | open (proposed by workstream 6; not yet in register/) |
| Owner decision and date | (filled only from the Decision Log) |
