#!/usr/bin/env bash
# Re-runs every measurement behind PLAN.md (about 40 minutes on the Intel Arc iGPU machine). Needs: node 24, Chrome stable, python 3.11 (only for build-terrain.py, already run), and a static server
#   node docs/battle-theatre/render/prototype/tools/serve.mjs docs/battle-theatre/render 10740      (any static server on 127.0.0.1:10740 serving docs/battle-theatre/render works)
# Results go to docs/battle-theatre/render/results/*.json. Run nothing else on the GPU while this runs (the machine is shared with other pipelines: that is why most suites run 2 or 3 times).
cd "$(dirname "$0")/../../../../.."
R=docs/battle-theatre/render/prototype/tools/run-bench.mjs; T=docs/battle-theatre/render/prototype/tools
L=tmp/bt/render/logs; mkdir -p $L
run() { name=$1; shift; node $R "$@" > $L/$name.log 2>&1; echo "done $name"; }
# CPU-only analyses
node $T/gait-test.mjs > $L/gait.log 2>&1; node $T/anim-tests.mjs > $L/anim.log 2>&1
# headline tables: 3 repeats at 1080p, 2 at 4K and at 4x CPU throttle, both APIs
for i in "" _r2 _r3; do run gpu_base_1080$i base --api webgpu --res 1080 --out "$i"; run gl_base_1080$i base --api webgl2 --res 1080 --out "$i"; done
for i in "" _r2; do run gpu_base_4k$i base --api webgpu --res 4k --out "$i"; run gl_base_4k$i base --api webgl2 --res 4k --out "$i"; run gpu_base_1080_x4$i base --api webgpu --res 1080 --throttle 4 --out "$i"; run gl_base_1080_x4$i base --api webgl2 --res 1080 --throttle 4 --out "$i"; done
run gpu_ablate       ablate --api webgpu --res 1080
run gl_ablate        ablate --api webgl2 --res 1080
run gpu_midr         midr --api webgpu --res 1080
run gl_midr          midr --api webgl2 --res 1080
run gpu_nearr        nearr --api webgpu --res 1080
run gl_nearr         nearr --api webgl2 --res 1080
run gpu_nearq2       nearr --api webgpu --res 1080 --q "nearQ=2&midQ=0.6" --out _nearQ2
run gpu_nearq3       nearr --api webgpu --res 1080 --q "nearQ=3&midQ=1" --out _nearQ3
run gl_nearq3        nearr --api webgl2 --res 1080 --q "nearQ=3&midQ=1" --out _nearQ3
run gpu_fly          fly --api webgpu --res 1080
run gl_fly           fly --api webgl2 --res 1080
run gpu_fly_x4       fly --api webgpu --res 1080 --throttle 4
run gpu_serial       serial --api webgpu --res 1080
run gpu_stress       base --api webgpu --res 1080 --shots battery,line --q "gunRate=6" --out _gunRate6
run gl_stress        base --api webgl2 --res 1080 --shots battery,line --q "gunRate=6" --out _gunRate6
for i in 1 2; do run midvat$i base --api webgpu --res 1080 --shots wide,line,cavalry --q "mid=vat" --out _midvat$i; run midbones$i base --api webgpu --res 1080 --shots wide,line,cavalry --q "mid=bones" --out _midbones$i; done
node $T/run-compute.mjs > $L/compute.log 2>&1
export GPUFLAGS="--force_high_performance_gpu"
node $T/run-compute.mjs --nvidia > $L/compute_nv.log 2>&1
run nv_gpu_base_1080 base --api webgpu --res 1080 --out _nvidia
run nv_gl_base_1080  base --api webgl2 --res 1080 --out _nvidia
run nv_gpu_base_4k   base --api webgpu --res 4k --out _nvidia
run nv_gl_base_4k    base --api webgl2 --res 4k --out _nvidia
run nv_gpu_nearq3    nearr --api webgpu --res 1080 --q "nearQ=3&midQ=1" --out _nearQ3_nvidia
echo ALL DONE
