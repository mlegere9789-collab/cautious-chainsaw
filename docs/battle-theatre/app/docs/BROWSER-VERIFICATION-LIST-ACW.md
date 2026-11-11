# Browser verification list: ACW mod assets (figures3d provider)

Done in this round (software GL, headless chromium, three r160): the decoders were checked by rendering. Union infantry and the "babydoll" figure were assembled from decoded `variant_weighted_mesh` data in the recovered rest pose (upright, 1.95 m, correct handedness: the haversack hangs on the left hip, the face looks to +Z); a kepi part and the UV wireframe of a jacket part were checked against their textures. Those self-test renders show base-game-derived art and are NOT in the repository. The conversion itself (DDS to WebP) was checked by eye on the jacket sheets. Nothing below has been run; until an item is ticked no claim about the look or cost of mod content in the viewer may be made. Tick = a screenshot or number saved in `app/tests/shots-figures3d/` with the id in the file name.

| id | check | pass |
|---|---|---|
| ACW-B1 | The 24 WebP sheets in `data/figures3d/acw/textures/confed_shell_jacket/` load in Chrome, Firefox and Safari (macOS, iOS) as 512 x 512 images; the normal maps look like normal maps (lossless), the gloss maps are lossy-q92 RGBA. | all decode; no colour shift against the DDS decode |
| ACW-B2 | `?history=real` with the credits panel open: the credit line "ACWII mod by ACW_Primergy and team (used with the author's permission)" appears exactly once, with the tier mark, ONLY while a cleared mod file is in use (credits.json `active`). | one line, correct text |
| ACW-B3 | Figure card of a Confederate unit that the unit map links to a cleared swatch (for example CS.1LA via `sys.acw.figurePlan`): the card shows the swatch as a labelled lead colour and says "lead-derived inference"; no figure geometry changes. | label present; figure identical to the build without `opts.acw` |
| ACW-B4 | One-to-one instancing, LOD and the mobile budget with `opts.acw` supplied versus not supplied: instance count, draw calls, triangle count and frame time equal (the provider adds none). | equal within noise |
| ACW-B5 | If, after the written confirmation (EG-FIG-0010), base-derived meshes are cleared: rebuild with `tools/bt/acw/convert_acw.py` after extending `policy.py`; then check skinning of the converted figure on the 61-bone rig (bone map from the recovered rest pose), foot planting, shoulder and elbow bends, LOD0/1/2 triangle budgets in `cost-model.json`, and that the procedural fallback still draws when a mesh fails to load. | per figure-gate G1, G6, G7, G8 |
| ACW-B6 | GPU upload of a 512 x 512 RGBA texture with mips on the weakest target (iOS Safari): 1.33 MB each, fetched on demand only. | no memory warning |

## Why no mod mesh is in the viewer (so nothing to look at yet)

Every soldier, officer and general mesh of the mod carries base-game sub-mesh names (norwegian_ski_troops / ottoman_commodore) or has no Subversion record; the mod does not contain the base-game heads, hands, skeleton or motion clips; the part textures are placeholders in 180 of 307 files. See `data/figures3d/acw/manifest.json` (every file, its evidence and reason codes), EG-FIG-0010, EG-FIG-0011, EG-FIG-0012.
