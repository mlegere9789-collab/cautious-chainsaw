#!/bin/bash
# Driver of weather3d-gpu-xvfb-probe.mjs: headed Chrome under Xvfb, flag sets H1..H5 (or SETS="H1 H3"), each in its own process with a hard limit of 200 s. Software adapters only. Resumable per set.
#   usage: [SETS="H1 H2"] bash weather3d-gpu-xvfb-probe.sh <outDir>      (build machine: through tools/horde/bench.sh)
D=${1:?usage: weather3d-gpu-xvfb-probe.sh <outDir>}; mkdir -p "$D"; HERE="$(cd "$(dirname "$0")" && pwd)"
for S in ${SETS:-H1 H3 H2 H4 H5}; do
  if [ -f "$D/$S.json" ] && grep -q '"wallS"' "$D/$S.json"; then echo "skip $S (done)"; continue; fi
  echo "set $S start $(date -u +%FT%TZ) load $(cut -d' ' -f1-3 /proc/loadavg)"
  timeout -k 10 200 xvfb-run -a -s "-screen 0 1280x720x24" node "$HERE/weather3d-gpu-xvfb-probe.mjs" $S "$D" > "$D/$S.log" 2>&1; rc=$?
  echo "set $S exit $rc at $(date -u +%FT%TZ)"
done
