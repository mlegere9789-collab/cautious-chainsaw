#!/bin/bash
# Zero-token watchdog. Run it with the Bash tool's run_in_background: the session is re-invoked when it exits, and nothing is
# billed while it sleeps. It exits (one line on stdout) only when something needs a decision:
#   LIMIT  a new "hit your weekly limit" error appeared in an agent transcript written in the last 10 minutes
#   STALL  workflow agents were active in the last 6 hours but none wrote anything for STALL_MIN minutes (default 30)
#   DISK   free disk space under DISK_GB gigabytes (default 3)
#   TICK   MAX seconds passed (default 10800 = 3 hours): the scheduled governor step
# usage: tools/horde/watch.sh [MAX_SECONDS]      env: STALL_MIN, DISK_GB
MAX=${1:-10800}; STALL_MIN=${STALL_MIN:-30}; DISK_GB=${DISK_GB:-3}
ROOT=$(ls -d /root/.claude/projects/*/*/subagents/workflows 2>/dev/null | head -1)
T0=$(date +%s)
while true; do
  sleep 120
  now=$(date +%s)
  avail=$(df --output=avail -BG / | tail -1 | tr -dc 0-9)
  if [ -n "$avail" ] && [ "$avail" -lt "$DISK_GB" ]; then echo "DISK ${avail}G free"; exit 0; fi
  if [ -n "$ROOT" ]; then
    if find "$ROOT" -name 'agent-*.jsonl' -mmin -10 -print0 2>/dev/null | xargs -0 -r grep -l "hit your weekly limit" 2>/dev/null | head -1 | grep -q .; then echo "LIMIT weekly-limit error in a recent agent transcript"; exit 0; fi
    recent=$(find "$ROOT" -name 'agent-*.jsonl' -mmin -360 2>/dev/null | head -1)
    if [ -n "$recent" ]; then
      fresh=$(find "$ROOT" -name 'agent-*.jsonl' -mmin -"$STALL_MIN" 2>/dev/null | head -1)
      if [ -z "$fresh" ]; then echo "STALL no agent wrote for ${STALL_MIN} minutes"; exit 0; fi
    fi
  fi
  if [ $((now - T0)) -ge "$MAX" ]; then echo "TICK"; exit 0; fi
done
