#!/usr/bin/env bash
# verify/run-all.sh - every check of the backdrop, in order.  Needs the build output of tools/regenerate.sh (assets/, data/, dist/pack.mjs) and, for the georeferencing check, network access
# to the USGS NAIP service for any reference window not yet cached (a re-run is offline).  Uses ports 9800-9805.   bash docs/pitch/anim2/basemap/verify/run-all.sh
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=../../../../tmp/look-dev/basemap/final
echo "== 1 bundle rules";        node tools/check-bundle-rules.mjs
echo "== 2 previews";            rm -rf "$OUT"; mkdir -p "$OUT"; node tools/previews.mjs --looks=dim --zooms=13.5,15,16.5,17.5 --out="$PWD/$OUT" >/dev/null; node tools/previews.mjs --looks=natural,paper,slate --zooms=15 --out="$PWD/$OUT" >/dev/null
echo "== 2b previews to JPEG"; python tools/export-previews.py "$OUT"
echo "== 3 seams";               python verify/seams.py "$OUT" | tail -1
echo "== 4 georeferencing, end to end (loader in Chrome vs the USGS service)"; node verify/verify-render.mjs >/dev/null; python verify/verify-georef.py | tail -1
echo "== 5 landmarks";           python verify/landmark-report.py | tail -1
echo "== 6 hills and crossroads on the ground"; python verify/ground-truth.py >/dev/null && echo ok
echo "== 7 data-URI pack identical to files";   node tools/build-pack.mjs >/dev/null; node verify/pack-test.mjs
echo "== 8 direct paint identical to cached paint"; node verify/direct-test.mjs | tail -1
echo "== 9 inside the real Battle Studio";      node verify/studio-integration.mjs | tail -1
echo "== 10 cost per frame";     node tools/bench.mjs
