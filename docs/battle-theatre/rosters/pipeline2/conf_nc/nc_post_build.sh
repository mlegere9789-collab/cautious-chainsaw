#!/bin/bash
# Everything that follows nc_build.py for the work item conf-nc, in the order it is run (heavy: start it through the machine lock,
#   tools/horde/bench.sh bash docs/battle-theatre/rosters/pipeline2/conf_nc/nc_post_build.sh > GOVERNANCE/horde/ws-rosters/conf-nc/logs/post-build.out 2>&1 ).
#
#   0  nc_clark.py --write      the Clark notes of the ledger (needs the pinned Clark texts; no network)
#   1  nc_recap.py              Moore's Recapitulation totals (text layers of both scans, and the four read from page images)
#   2  nc_reconcile.py          the unit files against the second scan and the earlier roll files (reconciliation.json, differences-<unit>.csv)
#   3  nc_diff.py OLD_DIR       row-by-row difference with the first build (changes-after-review.json)
#   4  verify_unit.py           the stand-alone verifier on the 41 files (verify-unit-run.out)
#   5  nc_audit.mjs             the copy audit with the rules of the staging packer (copy-audit.json)
#   6  nc_stats.py              every number of the report (stats.json)
#   7  nc_sources.py --write    pointer file rosters/sources/conf-nc.json and tmp/library/rosters/MANIFEST-conf-nc.json
#   8  nc_gaps.py               gap lines, the delegated-decision block, the proposed register entries
#   9  nc_report.py             rosters/reports/conf-nc.md
# The files are not appended to GAPS.md, DELEGATED-DECISIONS or progress.md here: the engineer appends them once, by hand, with a shell >>.
cd "$(dirname "$0")/../../../../.." || exit 1
export NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
C=docs/battle-theatre/rosters/pipeline2/conf_nc
WS=docs/battle-theatre/GOVERNANCE/horde/ws-rosters/conf-nc
OLD=${1:-tmp/library/rosters/_nc_old}
set -x
python3 -I $C/nc_clark.py --write || exit 1
python3 -I $C/nc_recap.py || exit 1
python3 -I $C/nc_reconcile.py || exit 1
python3 -I $C/nc_diff.py "$OLD" || exit 1
python3 -I docs/battle-theatre/rosters/pipeline2/verify_unit.py --all --root docs/battle-theatre/rosters/data2/confederate/nc > $WS/verify-unit-run.out; echo "verify_unit exit $?"
node $C/nc_audit.mjs || exit 1
python3 -I $C/nc_stats.py || exit 1
python3 -I $C/nc_sources.py --write || exit 1
python3 -I $C/nc_gaps.py || exit 1
python3 -I $C/nc_report.py || exit 1
echo POST-BUILD-DONE
