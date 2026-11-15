#!/bin/bash
# Queue of OCR jobs for the photocopied typescripts whose text layer is damaged (workstream bt-web, task nps-landscape).
# Each job goes through the machine lock (tools/horde/bench.sh, one heavy slot), one source after the other, and resumes
# from the pages already read (scripts/ocr.py writes after every page). Output: tmp/library/web/nps/<ID>/<ID>.ocr.txt.
#   ocr_queue.sh            run the whole queue
#   ocr_queue.sh ID [args]  run one source (extra args go to ocr.py, e.g. --pages 28-54)
ROOT="$(cd "$(dirname "$0")/../../../../../../.." && pwd)"
HERE="$ROOT/docs/battle-theatre/GOVERNANCE/horde/ws-web/nps/scripts"
LOG="$ROOT/tmp/library/web/nps/_ocr/queue.log"
mkdir -p "$(dirname "$LOG")"
export OMP_THREAD_LIMIT=1 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
run() {
  echo "$(date -u +%FT%TZ) start $*" >> "$LOG"
  "$ROOT/tools/horde/bench.sh" python3 -I "$HERE/ocr.py" "$@" >> "$LOG" 2>&1
  echo "$(date -u +%FT%TZ) end $1 exit $?" >> "$LOG"
}
if [ $# -gt 0 ]; then run "$@"; exit; fi
run NPS-HS-SPANGLER-HENRY
run NPS-DEV-POLICY
run NPS-MCMILLAN-HOUSE
run NPS-SLAUGHTER-PEN
run NPS-BRYAN-HOUSE
run NPS-ROCK-CREEK
run NPS-EXTENSION-1940
run NPS-EISE-HRS --pages 28-54
run NPS-CEM-DEDICATION
run NPS-HCSR
echo "$(date -u +%FT%TZ) queue finished" >> "$LOG"
