#!/bin/bash
# Stage driver for whole-issue enumeration of Chronicling America titles (one request per second, calib.MIN_GAP).
# Usage: run_issues_stage.sh STAGE   (STAGE = epi2 | bat2 | bat3)
# Resumable: pages already saved with the current rebuild rules are not requested again.
cd /home/user/cautious-chainsaw || exit 1
S=docs/battle-theatre/GOVERNANCE/horde/ws-web/ca/scripts/fetch_found.py
SC="--scan 12"
run() { python3 -I $S issues "$@" $SC; }
case "$1" in
epi2)
  for L in sn83030313 sn83030213 sn83045462 sn86053570 sn83026172 sn84031490 sn84026845; do
    run $L 1863-11-17 1863-11-18
  done
  for L in sn83030313 sn83030213 sn83045462 sn86053570 sn83026172 sn84031490 sn84026845; do
    run $L 1863-11-22 1863-11-24
  done
  ;;
bat2)
  for L in sn83030313 sn83030213 sn83045462 sn83026172 sn84031490; do
    run $L 1863-07-01 1863-07-09
  done
  ;;
bat3)
  for L in sn86053570 sn83021205 sn83016025 sn84026845; do
    run $L 1863-07-02 1863-07-09
  done
  for L in sn83030313 sn83030213 sn83045462 sn83026172 sn84031490; do
    run $L 1863-06-26 1863-06-30
    run $L 1863-07-10 1863-07-12
  done
  ;;
esac
echo ALLDONE $1
