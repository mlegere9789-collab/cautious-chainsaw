# Request to the terrain workstream: the ground audit that gate Q03.4(b) reads

Workstream bt-gates, 2026-11-16. Nothing in the product was changed; this note defines the file the gate reads and says what makes it pass.

## Why
Gate Q03 (GATE-SPEC.md, Q03.4) says: "(b) a ground audit: the terrain and aerial layers are classified and every modern feature is removed, painted out or replaced by the 1863 reconstruction layer with a recorded correction (G.3, p. 134). A disclosure that `the ground is the modern landscape` is not a pass (A-33, X-11)." Q03 cannot pass while this is unmet.
Today the page loads `docs/battle-theatre/render/prototype/data/aerial.jpg` (USDA NAIP, April to May 2022), `height.bin` (USGS 3DEP bare earth, 2017 lidar) and `terrain.json`, and `app/src/config.mjs` `GROUND_NOTE` says "The ground is the modern landscape (2022 aerial photograph and 3D Elevation Program terrain), not the 1863 landscape." The runner `tools/bt/gates/q03_anachronism.py` therefore reports two items:
* `Q03/Q03.4/ground-disclosure`: FAIL while `GROUND_NOTE` says the ground is the modern landscape (a disclosure is not a pass).
* `Q03/Q03.4/ground-audit`: BLOCKED-INPUT (`input missing: GOVERNANCE/ground_audit/audit.json`) until this file exists, then PASS or FAIL by the rules below.

## The file: `docs/battle-theatre/GOVERNANCE/ground_audit/audit.json`
```
{
  "schema": "bt-ground-audit/1",
  "layers": [
    { "id": "aerial",
      "role": "aerial",
      "source":    { "path": "<repo-relative path of the 2022 aerial the page loaded before correction>", "sha256": "<64 hex>" },
      "corrected": { "path": "docs/battle-theatre/render/prototype/data/aerial.jpg",                       "sha256": "<64 hex of the file the page loads NOW>" },
      "classified": true,
      "classification": { "path": "<the raster or vector that classifies every pixel or polygon>", "sha256": "<64 hex>" },
      "modern_features": [
        { "id": "<stable id>", "class": "modern_road | parking_lot | modern_building | monument | avenue | tower | sign | modern_fence | utility_line | canopy_not_1863 | ...",
          "action": "removed | painted_out | replaced",
          "correction_record": "<id of the record in evidence_corrections/ or the path#line that records the correction and its 1863 source>" } ],
      "unhandled_modern_features": 0 },
    { "id": "height", "role": "height", "source": {...}, "corrected": { "path": ".../height.bin", "sha256": "..." }, "classified": true, "classification": {...}, "modern_features": [...], "unhandled_modern_features": 0 }
  ]
}
```
## What the runner checks (all of it, nothing sampled)
1. `schema` is `bt-ground-audit/1` and `layers` is not empty.
2. Every layer has `classified: true`.
3. Every layer lists at least one modern feature (a 2022 aerial photograph and a modern terrain are not free of them: the classification must name what it found), each with an `action` of `removed`, `painted_out` or `replaced` and a non-placeholder `correction_record`.
4. `unhandled_modern_features` is 0 for every layer.
5. For every layer that lists modern features, `corrected.sha256` differs from `source.sha256` (something was changed).
6. The sha256 of `render/prototype/data/aerial.jpg` and of `height.bin` as they are on disk now equals the `corrected.sha256` of one of the layers: the audit is about the ground the page loads, and a stale audit fails.
7. `GROUND_NOTE` in `app/src/config.mjs` no longer calls the ground the modern landscape (`Q03/Q03.4/ground-disclosure`).

Nothing is claimed for the picture: whether the corrected ground looks right is a person looking at frames (U-10) and Q16/Q24's business; this audit is the record that the classification and the corrections exist and that the page loads them.

## Owner steps
None for the owner: this is engineering. A correction that needs a source not in the acquired library is a register entry (Law cl. 3), not a reason to leave a modern feature on the ground.
