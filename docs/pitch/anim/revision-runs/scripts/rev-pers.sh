#!/usr/bin/env bash
# runs after rev-rt.sh has finished: the three motion personalities (dial sets of PITCH.md section 10.4) and a strict-glide variant with no label fades
cd "$(dirname "$0")"
until grep -q "=== done" logs/rev-rt.log; do sleep 5; done
cd docs/pitch/anim/07-verify
mkdir -p ../../../../logs
run() { # tag style speeds set
  tag="$1"; st="$2"; sp="$3"; set="$4"
  echo "=== $tag $(date +%T)"
  node x-v3-play.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=20 --tag=q-$tag --port=9761 > ../../../../logs/q-v3play-$tag.log 2>&1
  node x-v4-motion.mjs --style=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --modes=after --secs=15 --tag=q-$tag --port=9762 > ../../../../logs/q-v4motion-$tag.log 2>&1
  node x-v3b-gaps.mjs --styles=$st --set="$set" --scenes=the-angle,rose-woods --speeds=$sp --tag=q-$tag --port=9763 > ../../../../logs/q-v3bgaps-$tag.log 2>&1
}
run pers-wr war-room 4 '{"time.speedRampMs":400,"time.glideMs":800,"camera.zoomGlideMs":320,"camera.panGlideMs":220,"motion.smoothMs":140,"motion.fadeMs":300,"layout.splitDwellMs":700,"popup.motion.enterMs":280,"popup.motion.risePx":10,"popup.motion.leaderMs":320}'
run pers-fm field-manual 4 '{"interp.model":"chord-smooth","layout.dMaxPx":0,"time.speedRampMs":120,"time.glideMs":350,"camera.zoomGlideMs":120,"camera.panGlideMs":80,"motion.smoothMs":80,"motion.fadeMs":120,"popup.motion.enterMs":140,"popup.motion.risePx":3,"popup.motion.leaderMs":140}'
run pers-m63 map-1863 4 '{"time.speedRampMs":600,"time.glideMs":1000,"camera.zoomGlideMs":420,"camera.panGlideMs":300,"motion.smoothMs":200,"motion.fadeMs":400,"layout.splitDwellMs":1000,"popup.motion.enterMs":380,"popup.motion.risePx":8,"popup.motion.leaderMs":420}'
run wr-strict-d0-nl war-room 4 '{"motion.mode":"strict","layout.dMaxPx":0,"motion.labelFadeMs":0}'
run wr-strict-nl war-room 4 '{"motion.mode":"strict","motion.labelFadeMs":0}'
echo "=== done $(date +%T)"
