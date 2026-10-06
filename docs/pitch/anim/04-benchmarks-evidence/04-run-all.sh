#!/bin/bash
# Reproduces every number in docs/pitch/anim/04-benchmarks.md that is marked [M].
# Run from the repository root:  bash docs/pitch/anim/04-benchmarks-evidence/04-run-all.sh
# Input: baseline/dist/data (the data production serves). Nothing is written except stdout.
E=docs/pitch/anim/04-benchmarks-evidence
for s in stats consecutive overlap coincident pairs speed clusters kinks turns prec dups; do
  echo "=================== 04-$s.mjs"
  node $E/04-$s.mjs
done
echo "=================== 04-sizes.sh (network: public CDN builds, bodies discarded)"
bash $E/04-sizes.sh
echo "=================== production bundle size"
f=$(ls baseline/dist/assets/index-*.js | head -1); echo "$f raw $(wc -c < $f) gzip-9 $(gzip -9 -c $f | wc -c)"
