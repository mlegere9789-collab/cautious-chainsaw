"""Determinism check: stage 20 (PatchMatch removal) is run a second time into a fresh file and compared byte for byte with the first run.
Writes docs/basemap1863/PROVENANCE-LAYER/checks/determinism.json. Usage: python determinism.py  (needs tmp/b1863/build/stage20_run1.sha made from the first run)"""
import sys, os, json, hashlib, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        while True:
            b = f.read(1 << 24)
            if not b: break
            h.update(b)
    return h.hexdigest()

first = open(os.path.join(C.BUILD, 'stage20_run1.sha')).read().strip()
for f in ('stage20.u8', 'stage20_done.u8'):
    p = os.path.join(C.BUILD, f)
    if os.path.exists(p): os.remove(p)
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 's20_remove.py')], check=True, stdout=subprocess.DEVNULL)
second = sha(os.path.join(C.BUILD, 'stage20.u8'))
res = dict(stage='s20_remove (PatchMatch)', run1_sha256=first, run2_sha256=second, identical=first == second)
os.makedirs(os.path.join(C.PROV, 'checks'), exist_ok=True)
json.dump(res, open(os.path.join(C.PROV, 'checks', 'determinism.json'), 'w'), indent=1)
print(res)
