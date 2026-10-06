#!/usr/bin/env bash
cd "$(dirname "$0")/docs/pitch/anim/07-verify"
mkdir -p ../../../../logs
for st in war-room field-manual map-1863; do
  echo "=== $st v3-play $(date +%T)"
  node v3-play.mjs --style=$st --scenes=the-angle,rose-woods,cemetery-hill --speeds=1,4 --modes=after --secs=20 --tag=$st --port=9720 > ../../../../logs/v3play-$st.log 2>&1
  echo "=== $st v4-motion $(date +%T)"
  node v4-motion.mjs --style=$st --scenes=the-angle,rose-woods,cemetery-hill --speeds=1,4 --modes=after --secs=15 --tag=$st --port=9721 > ../../../../logs/v4motion-$st.log 2>&1
  echo "=== $st v3b-gaps $(date +%T)"
  node v3b-gaps.mjs --styles=$st --scenes=the-angle,rose-woods,cemetery-hill --speeds=1,4 --port=9722 > ../../../../logs/v3bgaps-$st.log 2>&1
  mv results/v3b-gaps.json results/v3b-gaps-$st.json 2>/dev/null
done
echo "=== done $(date +%T)"
