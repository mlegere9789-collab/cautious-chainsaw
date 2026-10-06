#!/usr/bin/env bash
cd "$(dirname "$0")/docs/pitch/anim/07-verify"
mkdir -p ../../../../logs
run() { # tag style set
  tag="$1"; st="$2"; set="$3"
  echo "=== $tag $(date +%T)"
  node x-v3-play.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --modes=after --secs=20 --tag=x-$tag --port=9761 > ../../../../logs/x-v3play-$tag.log 2>&1
  node x-v4-motion.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --modes=after --secs=15 --tag=x-$tag --port=9762 > ../../../../logs/x-v4motion-$tag.log 2>&1
  node x-v3b-gaps.mjs --styles=$st --set="$set" --scenes=the-angle,rose-woods --speeds=4 --tag=$tag --port=9763 > ../../../../logs/x-v3bgaps-$tag.log 2>&1
}
run wr-strict war-room '{"motion.mode":"strict"}'
run wr-strict-d0 war-room '{"motion.mode":"strict","layout.dMaxPx":0}'
run wr-strict-d12 war-room '{"motion.mode":"strict","layout.dMaxPx":12}'
run fm-strict-instr field-manual '{"motion.mode":"strict","interp.model":"chord-smooth","layout.dMaxPx":0}'
echo "=== done $(date +%T)"
