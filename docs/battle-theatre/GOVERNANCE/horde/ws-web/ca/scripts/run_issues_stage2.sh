#!/bin/bash
# Stage driver (second file; run_issues_stage.sh holds epi2 and bat2) for whole-issue enumeration of Chronicling America titles
# (one request per second, calib.MIN_GAP). Usage: run_issues_stage2.sh STAGE   (STAGE = epi3 | bat3 | bat4)
# Resumable: pages already saved with the current rebuild rules are not requested again.
cd /home/user/cautious-chainsaw || exit 1
S=docs/battle-theatre/GOVERNANCE/horde/ws-web/ca/scripts/fetch_found.py
SC="--scan 12"
run() { python3 -I $S issues "$@" $SC; }
case "$1" in
epi3)
  run sn83016025 1863-11-19 1863-11-24
  run sn83021205 1863-11-18 1863-11-23
  run sn82015683 1863-11-19 1863-11-25
  run sn83025718 1863-11-19 1863-11-25
  run sn83025182 1863-11-18 1863-11-24
  run sn86059181 1863-11-19 1863-11-21
  run sn86092517 1863-11-19 1863-11-24
  ;;
bat3)
  for L in sn86053570 sn83021205 sn83016025 sn84026845; do
    run $L 1863-07-02 1863-07-09
  done
  ;;
bat4)
  for L in sn83030313 sn83030213 sn83045462 sn83026172 sn84031490; do
    run $L 1863-06-26 1863-06-30
    run $L 1863-07-10 1863-07-12
  done
  ;;
esac
echo ALLDONE $1
