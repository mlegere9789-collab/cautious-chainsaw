#!/usr/bin/env bash
# tools/regenerate.sh - rebuild every file of the backdrop from the public sources.  Run from anywhere:  bash docs/pitch/anim2/basemap/tools/regenerate.sh [--from=STEP]
#
# What it needs: python 3.11 with numpy and Pillow (Pillow 11+ with AVIF support: python -c "from PIL import features; print(features.check('avif'))" must print True), node 24, network access to
#   imagery.nationalmap.gov (USGS NAIP), elevation.nationalmap.gov (USGS 3DEP), tigerweb.geo.census.gov (Census TIGER) and en.wikipedia.org (reference coordinates only).
# What it costs: about 450 MB downloaded ONCE into tmp/look-dev/basemap/cache (NAIP 121 MB, 3DEP 327 MB, TIGER 4 MB), polite: one request at a time, 1.5 s between requests,
#   every response cached, so a re-run downloads nothing.  The first run takes about an hour (the downloads dominate); a re-run from cache takes about 10 minutes (the AVIF encode dominates).
# What it reads from the repo (read only): docs/pitch/anim/prototype/data/dataset.json (the unit placements and the 30 place marks).
# What it writes: ../plan.json, tools/tiers.json, assets/**, data/manifest.mjs, data/vectors.mjs, data/ground-truth.json, verify/results/ground-truth.json, dist/pack.mjs (git-ignored).
# The build output of the heavy steps (graded tiles, contours) goes to tmp/look-dev/basemap/build.
set -euo pipefail
cd "$(dirname "$0")/.."
FROM=1; for a in "$@"; do case "$a" in --from=*) FROM="${a#--from=}";; esac; done
step() { local n="$1"; shift; if [ "$n" -ge "$FROM" ]; then echo "== step $n: $*"; "$@"; fi; }

step 1  python tools/plan.py                                                  # the bounding box (every unit keyframe and place mark + 1.2 km) -> plan.json
step 2  python tools/plan-tiers.py                                            # which tiles exist at which zoom, ranked by how much unit activity they see -> tools/tiers.json
step 3  python tools/fetch-naip.py 16                                         # NAIP, whole box, 63 blocks of 2048 px at 0.917 m/px (one z14 tile each)
step 4  python tools/fetch-naip.py 17 --tiles-file tools/hot-z15-parents.json # NAIP, 17 blocks of 2048 px at 0.459 m/px around the hotspots (one z15 tile each)
step 5  python tools/fetch-dem.py 15 14                                       # 3DEP bare-earth DEM, whole box, 63 blocks at 1.83 m/px
step 6  python tools/fetch-dem.py 16 15 --tiles-file tools/hot-z15-parents.json   # 3DEP, hotspot blocks at 0.917 m/px (the z16 hillshade)
step 7  python tools/fetch-vectors.py                                         # Census TIGER roads, rail, streams, water (GeoJSON)
step 8  python tools/fetch-wiki.py                                            # reference coordinates (Wikipedia summaries), used only by the ground-truth and landmark checks
step 9  python tools/build-contours.py --sigma 2.0 --eps 2.2                          # 10 ft contours from the DEM -> build/contours.json
step 10 python verify/ground-truth.py                                         # the hills and the Peach Orchard crossroads on the ground -> data/ground-truth.json, verify/results/ground-truth.json
step 11 python verify/landmark-report.py                                      # the place marks the landmark check found not at their building -> data/place-checks.json (reads the committed readings, no network)
step 12 python tools/build-vectors.py                                         # data/vectors.mjs
step 13 python tools/build-aerial.py                                          # cut and encode the aerial tile pyramid (AVIF with a 4 px gutter) -> build/aerial
step 14 python tools/build-shade.py                                           # hillshade tiles -> build/shade
KB=$(python -c "import math,os;print(math.ceil(os.path.getsize('data/vectors.mjs')/100)/10)")
step 15 python tools/build-assets.py --budget-mb 9.7 --vectors-kb "$KB"       # pick the tiles that fit 9.7 MB with the vectors -> assets/**, assets/manifest.json, data/manifest.mjs
step 16 node tools/build-pack.mjs                                             # the same tiles as data URIs, for a host that must be one file -> dist/pack.mjs (git-ignored)
step 17 node tools/check-bundle-rules.mjs                                     # do src/ and data/ fit the Studio's strict bundler?
echo "done. now run verify/run-all.sh"
