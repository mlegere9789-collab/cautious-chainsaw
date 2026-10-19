# Pilot: one 20th Maine private, July 1863

Inputs (not in the repo, downloaded into tmp/bt/assets/src_assets/ by the pilot run; all open licences, see ../PLAN.md section 3.1):
- `makehuman/` = `git clone --depth 1 https://github.com/makehumancommunity/makehuman` (CC0 assets). Override the location with the `MH_ROOT` environment variable (the `makehuman/makehuman/data` folder).
- `cmu/35.asf`, `cmu/35_01.amc` from https://mocap.cs.cmu.edu/subjects/35/ (CMU terms: free for all uses, acknowledgement requested: "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217.").

Run (Python 3.11, numpy, scipy, Pillow; nothing else):
    python build_soldier.py --out soldier.glb        # pinned 20th Maine private (garments.PILOT_SPEC)
    python build_soldier.py --seed 4 --out v4.glb    # a random man from the dress-variation system
    python measure.py ../pilot_measurements.json     # foot contact, skate, loop seam
    python lod.py ../pilot_lod_ladder.json           # triangle-count ladder

View/render: `viewer/` (three.js 0.160.1 from npm, Playwright with Chrome). `node viewer/serve.mjs <root> 10760`, then `node viewer/render.mjs <glb path> <outdir> <jobs.json> <ground speed>`.

Files: `mhlib.py` (MakeHuman loader and macro morphing), `cmu.py` (ASF/AMC and forward kinematics), `retarget.py` (CMU to MakeHuman: limb direction matching, spine distribution, leg IK, flat-foot lock, loop), `garments.py` (kit and the dress-variation `Spec`), `glb.py` (skinned glTF writer), `posing.py` (FK and skinning in numpy), `build_soldier.py`, `measure.py`, `lod.py`.
