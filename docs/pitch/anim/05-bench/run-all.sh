#!/usr/bin/env bash
# The full benchmark matrix of docs/pitch/anim/05-architecture.md (about 45 minutes). Sequential on purpose: one Chrome at a time on PORT_BASE 9580..9589.
# Prerequisite: tmp/pitch-anim/arch/vendor/{mapbox-gl.js,mapbox-gl.css,fonts/DIN Pro Medium/0-255.pbf}  (see run.mjs and fetch-fonts.mjs headers).
cd "$(dirname "$0")/../../../.." || exit 1
export T0_PORT_BASE=${T0_PORT_BASE:-9580}
R=docs/pitch/anim/05-bench/run.mjs
ALL=base,c2d-naive,c2d-atlas1,c2d-atlas2,gl-overlay,mbx-custom,mbx-hybrid,mbx-sym-set,mbx-sym-upd,mbx-fs
SCALE=base,c2d-atlas1,c2d-atlas2,gl-overlay,mbx-custom,mbx-hybrid,mbx-sym-upd
node $R --cands $ALL --cfgs D1  --reps 3 --gc --sec 8 --out results/main-D1.json
node $R --cands $ALL --cfgs D2  --reps 2 --gc --sec 8 --out results/main-D2.json
node $R --cands $ALL --cfgs P4  --reps 2 --gc --sec 8 --out results/main-P4.json
node $R --cands $ALL --cfgs P4c --reps 1 --sec 8 --out results/main-P4c.json
node $R --cands $SCALE --cfgs D1,P4 --n 570 --reps 1 --sec 8 --out results/scale-570.json
node $R --cands $SCALE --cfgs D1,P4 --n 900 --reps 1 --sec 8 --out results/scale-900.json
node $R --page sync.html --cands mode=raf,mode=rafpre,mode=render --cfgs D1 --reps 3 --sec 8 --out results/sync.json
node $R --page solver.html --cands n=462 --cfgs D1 --sec 5 --out results/solver-D1.json
node $R --page solver.html --cands n=462 --cfgs P4 --sec 5 --out results/solver-P4.json
