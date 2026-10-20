"""Run the whole 1863 reconstruction pipeline in order (all heavy stages at below-normal priority, at most 4 workers).
Inputs that must exist (see BUILD.md section 2): tmp/b1863/modern/work/naip2013_1.0m.tif, removal_mask_1m.tif, detect_ppav.tif, inventory_utm.pkl, tmp/b1863/landcover/canopy_smooth.npy,
tmp/b1863/maps/scans/la000697.jp2, the catalogues in docs/basemap1863/features. Usage: python run_all.py [from_stage_name]"""
import subprocess, sys, os, time
HERE = os.path.dirname(os.path.abspath(__file__))
STAGES = ['s25_lc', 's09_unlisted', 's10_targets', 's20_remove', 's28_bank', 'mk_grain', 's30_synth', 's33_hopkins', 's34_prepare', 's35_features', 's39_final', 's40_tiles', 's45_prov_vectors', 's46_manifest', 'checks']
start = sys.argv[1] if len(sys.argv) > 1 else STAGES[0]
for st in STAGES[STAGES.index(start):]:
    t0 = time.time()
    print('=== ', st, flush=True)
    if st == 's20_remove' or st == 's30_synth':
        # these resume from existing memmaps: remove the previous outputs for a clean run
        for f in os.listdir(os.path.join(HERE, '..', '..', 'tmp', 'b1863', 'build')):
            if f.startswith('stage' + st[1:3]) and f.endswith('.u8'):
                os.remove(os.path.join(HERE, '..', '..', 'tmp', 'b1863', 'build', f))
    r = subprocess.run([sys.executable, os.path.join(HERE, st + '.py')], cwd=HERE)
    if r.returncode != 0:
        sys.exit('stage %s failed' % st)
    print('   %.0f s' % (time.time() - t0), flush=True)
