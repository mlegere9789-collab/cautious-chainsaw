#!/bin/bash
# Full build of the Vermont roster (work item union-vt), run through the machine lock:
#     tools/horde/bench.sh bash docs/battle-theatre/rosters/pipeline2/union_vt/run_all.sh
# Stage 0 (vt_fetch.py, vt_cache.py) has run before: the pinned texts, the transient word-box file and the aligned word cache must exist.
set -e
cd "$(dirname "$0")/../../../../.."
P=docs/battle-theatre/rosters/pipeline2/union_vt
python3 -I $P/vt_rows.py          # cut the rows, assert V1 to V3 on every row
python3 -I $P/vt_write.py         # flags, unit files (asserts again before writing)
python3 -I docs/battle-theatre/rosters/pipeline2/verify_unit.py --all --root docs/battle-theatre/rosters/data2/union/vt > tmp/library/rosters/union-vt-work/verify_unit.jsonl
echo done
