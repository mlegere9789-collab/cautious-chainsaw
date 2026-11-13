#!/bin/bash
# Light checks of the third pass of GATE-SPEC-B.md (2026-11-13, after 23:00 UTC). Each needs well under 30 s of CPU on a quiet machine; none takes the machine lock.
# Usage: bash run_light.sh   (from anywhere). Writes <name>.out here and one line per command to light-runs.tsv.
# What these commands write outside this folder: check_governance.py rewrites GOVERNANCE/check_report.json (bt-gates' own file); kit_verified.py is given a scratch --out-dir under tmp/bt-gates;
# realize/check.mjs is given --out under tmp/bt-gates so that GOVERNANCE/realizations/RESULTS.json is NOT touched. Nothing else is written.
cd "$(dirname "$0")/../../../../../.." || exit 2          # repository root
E=docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass3
export PYTHONIOENCODING=utf-8
mkdir -p tmp/bt-gates/pass3
run() { name="$1"; shift
  s=$(date +%s.%N); t0=$(date -u +%FT%TZ)
  timeout 900 "$@" > "$E/$name.out" 2>&1; rc=$?
  e=$(date +%s.%N)
  printf '%s\t%s\texit %s\t%.1f s\t%s\n' "$t0" "$name" "$rc" "$(echo "$e - $s" | bc)" "$*" >> "$E/light-runs.tsv"
}
: > "$E/light-runs.tsv"
echo "# light runs started $(date -u +%FT%TZ) HEAD $(git rev-parse --short HEAD) load $(cut -d' ' -f1-3 /proc/loadavg)" >> "$E/light-runs.tsv"
# the governance machinery (section 2.3)
run check_governance    python3 -I tools/bt/check_governance.py
run check_coverage      python3 -I tools/bt/check_coverage.py
run test_coverage_py    python3 -I tests/governance/test_coverage.py
run coverage_test_mjs   node --test tests/governance/coverage.test.mjs
# the checkers of the data layers
run check_arrivals      python3 -I tools/bt/check_arrivals.py
run check_kit_quiet     python3 -I tools/bt/check_kit.py --quiet
run check_structures    python3 -I tools/bt/check_structures.py
run validate_provenance python3 -I tools/bt/validate_provenance.py
run kit_evidence_check_all python3 -I tools/bt/kit_evidence_check.py --all --quiet
run kit_verified_scratch   python3 -I tools/bt/kit_verified.py build --out-dir tmp/bt-gates/pass3/kit-verified
run check_undrawn_all   python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --all
# the realization harness: digests only, then a full run to a scratch file (RESULTS.json is not touched)
run realize_digests     node tools/bt/realize/check.mjs --digests
run realize_scratch     node tools/bt/realize/check.mjs --out tmp/bt-gates/pass3/RESULTS-scratch.json
# node tests of other workstreams that bear on a gate (each under 30 s)
run sim_test            node --test docs/battle-theatre/sim/test/sim.test.mjs
run photomatch_old_test node --test tests/photomatch.test.mjs
run photomatch_q16_test node --test docs/battle-theatre/app/tests/photomatch-q16.test.mjs
run ext_loader_test     node --test docs/battle-theatre/app/tests/ext-loader.test.mjs
run ext_monuments_test  node --test docs/battle-theatre/app/tests/ext-monuments.test.mjs
run ext_tour_test       node --test docs/battle-theatre/app/tests/ext-tour.test.mjs
run ext_site_data_test  node --test docs/battle-theatre/app/tests/ext-site-data.test.mjs
run roster_union_nh_test node --test docs/battle-theatre/app/tests/roster-union-nh.test.mjs
run weather3d_gpu_test  node --test docs/battle-theatre/app/tests/weather3d-gpu.test.mjs
echo "# light runs done $(date -u +%FT%TZ)" >> "$E/light-runs.tsv"
