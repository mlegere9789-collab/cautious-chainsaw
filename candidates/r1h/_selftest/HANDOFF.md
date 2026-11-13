# _selftest (harness self-test, never registered)

Proves candidates/r1h/_lib: `python3 candidates/r1h/_lib/apply_group.py _selftest`, then `node candidates/r1h/_lib/prove.mjs _selftest`.
Expected: anchors ok (2 patch records), red run exits non-zero, green run exits 0. Nothing here goes into a train.
