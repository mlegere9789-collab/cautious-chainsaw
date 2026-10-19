"""Freeze Pass A and draw the random 20 percent of derivation cells for the blind second pass.
A derivation cell = one unit x one 10-minute block of the pilot hour (16 units x 6 blocks = 96 cells). The draw is seeded and recorded; the sha256 of every
Pass A file is recorded BEFORE the draw so that Pass A cannot be altered after the sample is known.
usage: python sample_cells.py --seed 20261019   -> pilot/passB.sample.json"""
import argparse, hashlib, json, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--seed', type=int, default=20261019); a = ap.parse_args()
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
frozen = {f: sha(os.path.join(BASE, f)) for f in ('pilot/defs_passA.py', 'pilot/unit-minutes.A.jsonl', 'pilot/sources.json', 'tools/pilot_lib.py')}
units = ['U-20ME', 'U-20ME-B', 'U-83PA', 'U-44NY', 'U-16MI', 'U-140NY', 'U-146NY', 'U-91PA', 'U-155PA', 'U-ART-D5US', 'C-15AL', 'C-47AL', 'C-48AL', 'C-44AL', 'C-4TX', 'C-5TX']
blocks = [f'16:{b:02d}' for b in range(0, 60, 10)]
cells = [(u, b) for u in units for b in blocks]
rng = random.Random(a.seed)
pick = sorted(rng.sample(cells, round(0.2 * len(cells))), key=lambda c: (units.index(c[0]), c[1]))
out = dict(seed=a.seed, n_cells=len(cells), n_sampled=len(pick), sampled=[dict(unit=u, block_start=b, minutes=[f'16:{int(b[3:]) + k:02d}' for k in range(10)]) for u, b in pick],
           frozen_sha256=frozen, note='Pass A frozen before this draw; Pass B derives only these cells.')
json.dump(out, open(os.path.join(BASE, 'pilot', 'passB.sample.json'), 'w'), indent=1)
print(len(pick), 'cells'); print([(u, b) for u, b in pick])
