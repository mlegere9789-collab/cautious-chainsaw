# tools/t0/inputs

Specialist source packs the patch groups in `../patches/` were generated from (by `../migrate_packs.py`).
They are inputs of record, not read by the build:

| file | origin | used for |
|---|---|---|
| `mobile_patches.json` | app-mobile `apply_patches.py` (65 rows: HF-1..HF-12) | groups A (HF-3b/3c), C (HF-1a..HF-12c) |
| `bugs_patches.json` | app-bugs `tranche0-validate.js` (24 rows) | groups A, B |
| `a11y_patches.json` | app-a11y `bridge_patch_check.py` (18 rows) | groups A (B-io-wrapper), AX |
| `copy_patch_table.json` | docs-copy `patch_table.py` (64 rows: 53 bundle + 11 Help) | group CP (16 bundle rows + 2 Help rows) and the D-HEATMAP Help row in group A |
| `provenance/extract_*.{py,js}` | the one-shot scripts that turned the specialist scripts into the JSON above (scratch paths, not runnable here) | history only |
