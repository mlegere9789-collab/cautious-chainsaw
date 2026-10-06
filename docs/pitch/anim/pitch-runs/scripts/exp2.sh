#!/usr/bin/env bash
cd "$(dirname "$0")"
until grep -q "=== done" runall.log; do sleep 5; done
cd docs/pitch/anim/07-verify
run() { # tag style set
  tag="$1"; st="$2"; set="$3"
  echo "=== $tag $(date +%T)"
  node x-v3-play.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --modes=after --secs=20 --tag=x-$tag --port=9723 > ../../../../logs/x-v3play-$tag.log 2>&1
  node x-v4-motion.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --modes=after --secs=15 --tag=x-$tag --port=9724 > ../../../../logs/x-v4motion-$tag.log 2>&1
  node x-v3b-gaps.mjs --styles=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --tag=$tag --port=9725 > ../../../../logs/x-v3bgaps-$tag.log 2>&1
}
run wr-snap war-room '{"motion.mode":"snap"}'
run wr-notravel war-room '{"motion.travelPx":1000}'
run fm-instrument field-manual '{"interp.model":"chord-smooth","layout.dMaxPx":0}'
echo "=== done2 $(date +%T)"
