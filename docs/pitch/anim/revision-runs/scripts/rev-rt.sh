#!/usr/bin/env bash
# sequential, quiet-machine real-time series (one config at a time)
cd "$(dirname "$0")/docs/pitch/anim/07-verify"
mkdir -p ../../../../logs
run() { # tag style speeds set
  tag="$1"; st="$2"; sp="$3"; set="$4"
  echo "=== $tag $(date +%T)"
  node x-v3-play.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=20 --tag=q-$tag --port=9761 > ../../../../logs/q-v3play-$tag.log 2>&1
  node x-v4-motion.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=15 --tag=q-$tag --port=9762 > ../../../../logs/q-v4motion-$tag.log 2>&1
  node x-v3b-gaps.mjs --styles=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --tag=q-$tag --port=9763 > ../../../../logs/q-v3bgaps-$tag.log 2>&1
}
run wr-default war-room 1,4 '{}'
run wr-strict war-room 1,4 '{"motion.mode":"strict"}'
run wr-strict-d0 war-room 1,4 '{"motion.mode":"strict","layout.dMaxPx":0}'
run mk-default mark-sketch 4 '{}'
run mk-strict mark-sketch 1,4 '{"motion.mode":"strict"}'
run mk-strict-d12 mark-sketch 4 '{"motion.mode":"strict","layout.dMaxPx":12}'
run wr-strict-d12 war-room 4 '{"motion.mode":"strict","layout.dMaxPx":12}'
run fm-strict-instr field-manual 4 '{"motion.mode":"strict","interp.model":"chord-smooth","layout.dMaxPx":0}'
echo "=== done $(date +%T)"
