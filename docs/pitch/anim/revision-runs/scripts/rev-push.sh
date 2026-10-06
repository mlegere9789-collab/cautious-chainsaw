#!/usr/bin/env bash
# runs after rev-pers.sh has finished (scratch tree 2: the strict display mode WITH the default mode's collision-aware pushing)
cd "$(dirname "$0")"
until grep -q "=== done" ../scratch/logs/rev-pers.log; do sleep 5; done
cd docs/pitch/anim/07-verify
mkdir -p ../../../../logs
run() { # tag style speeds set
  tag="$1"; st="$2"; sp="$3"; set="$4"
  echo "=== $tag $(date +%T)"
  node x-v3-play.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=20 --tag=q-$tag --port=9761 > ../../../../logs/q-v3play-$tag.log 2>&1
  node x-v4-motion.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=15 --tag=q-$tag --port=9762 > ../../../../logs/q-v4motion-$tag.log 2>&1
  node x-v3b-gaps.mjs --styles=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --tag=q-$tag --port=9763 > ../../../../logs/q-v3bgaps-$tag.log 2>&1
}
run wr-strictpush war-room 1,4 '{"motion.mode":"strict-push"}'
run mk-strictpush mark-sketch 1,4 '{"motion.mode":"strict-push"}'
echo "=== done $(date +%T)"
