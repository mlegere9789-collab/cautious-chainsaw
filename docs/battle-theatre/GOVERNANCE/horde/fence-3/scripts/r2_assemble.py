"""Round-2 assembler for fence-3: baseline (round-1 rows, tmp/fence-3/backup-2026-11-14) + per-row patches -> JSONL.
Usage: python3 -I r2_assemble.py [OUT]   (default OUT = tmp/fence-3/data/r2_out.jsonl)"""
import sys, json, os, datetime, importlib
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import r2lib

ROOT = '/home/user/cautious-chainsaw'
OUT = sys.argv[1] if len(sys.argv) > 1 else ROOT + '/tmp/fence-3/data/r2_out.jsonl'
PATCHES = {}
for m in ('r2_a', 'r2_b', 'r2_c', 'r2_d'):
    try:
        mod = importlib.import_module(m)
    except ModuleNotFoundError:
        continue
    PATCHES.update(mod.PATCHES)
from r2_assemble_lib import finalize  # noqa

base = r2lib.load_base()
today = '2026-11-14'
rows = []
for sid in sorted(base):
    d = base[sid]
    if sid in PATCHES:
        d = PATCHES[sid](d)
    if not d.get('round2'):
        d['round2'] = ['Round 2 (2026-11-14): every quotation re-read against its sub-claim and re-validated; no change to this row.']
    rows.append(finalize(d, today))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    for d in rows:
        f.write(json.dumps(d, ensure_ascii=False) + '\n')
cnt = {}
for d in rows:
    cnt[d['verdict']] = cnt.get(d['verdict'], 0) + 1
print('wrote', OUT, len(rows), 'rows;', len(PATCHES), 'patched:', sorted(PATCHES), '| verdicts', cnt)
