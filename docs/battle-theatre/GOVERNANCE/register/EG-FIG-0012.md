# EG-FIG-0012: No ACW mod mesh is cleared for the Battle Theatre: soldier, officer, flag, gun and horse figures stay procedural

| Field | Content |
|---|---|
| ID | EG-FIG-0012 |
| Requirement IDs | R03, R04, R10, R16, R17 |
| Category | evidence missing |
| Description | Decoded and verified (rendered headless): variant_weighted_mesh (86 of 87; geometry, UV, bone weights, rest pose recovered from the mesh data) and DDS textures. Decoded with partial verification: variant_part_mesh (68 of 70; LOD sections, UV and hat/belt placement verified; torso and legs bone binding not verified). Not decoded: rigid_model / animatable_rigid_model geometry (header and texture names only). Every soldier and officer mesh carries base-game sub-mesh names (85 files) or has no Subversion record; the heads, hands, skeleton and motion clips are the base game and are not in the mod; the part textures are mostly placeholder images (180 of 307); the guns share carriage geometry and base-game texture names; the one SVN-recorded limber is a four-fold byte copy; there is no horse mesh and no flag cloth model. |
| Why literal 100% is not possible or blocked | A figure from the mod would need base-game heads, skeleton and animation that the mod does not contain and the owner's order excludes, and the mod author can license only his own files. |
| Evidence searched | All six asset packs (2,200 listed files): classification in manifest.json; decoder self-test renders (union infantry and the modern "babydoll" figure) viewed in a software-GL chromium. |
| Autonomous substitute applied | The existing procedural figures (data/figures3d, 61-bone rig, one-to-one instancing, LOD) stay for every capability. |
| Strongest evidence-based reconstruction | Procedural figures with tier marks. |
| Confidence tier | plausible-procedural |
| Competing values | - |
| Product marking | F-ACW-NO-MESH in acw-tiers.mjs; sys.acw.coverage() lists each capability with its reason; BROWSER-VERIFICATION-LIST-ACW.md. |
| Visual and audio impact | Every figure keeps its current look. |
| Review status | internal review only (DEC-006: no public review label) |
| Owner decision requested | See EG-FIG-0010: a written statement of which meshes are the author's own work. For a mesh to be used the base-game heads, hands and skeleton it needs must also be licensed or replaced by our own (our rig and heads already exist). |
| Agent recommendation | Keep procedural; reconsider per file after the written confirmation. |
| Status | open |
| Owner decision and date | (filled only from the Decision Log) |
