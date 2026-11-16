"""Round-3 assembler for fence-3 (2026-11-16): baseline (round-1 rows) + round-2 patches (r2_*) + round-3 patches (r3_*) -> JSONL.
Usage: python3 -I r3_assemble.py [OUT]   (default OUT = tmp/fence-3/data/r3_out.jsonl)"""
import sys, json, os, importlib, copy
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import r2lib

ROOT = '/home/user/cautious-chainsaw'
OUT = sys.argv[1] if len(sys.argv) > 1 else ROOT + '/tmp/fence-3/data/r3_out.jsonl'
TODAY = os.environ.get('F3_TODAY', '2026-11-16')


def load(prefix, names, chain=False):
    """Patch registry. With chain=True a row may carry patches in several modules; they are applied in module order (a later module never replaces an earlier one)."""
    P = {}
    for m in names:
        try:
            mod = importlib.import_module(m)
        except ModuleNotFoundError:
            continue
        for k, fn in mod.PATCHES.items():
            if chain:
                P.setdefault(k, []).append(fn)
            else:
                if k in P:
                    raise SystemExit('stage-1 patch for %s defined twice (module %s)' % (k, m))
                P[k] = fn
    return P


P2 = load('r2', ('r2_a', 'r2_b', 'r2_c', 'r2_d'))
P3 = load('r3', ('r3_a', 'r3_b', 'r3_c', 'r3_d'), chain=True)
from r3_assemble_lib import finalize3  # noqa

base = r2lib.load_base()
rows = []
for sid in sorted(base):
    d0 = base[sid]
    r1 = {'verdict': d0['verdict'], 'status': d0['status'], 'subclaims': len(d0['subclaims']), 'citations': len(d0['citations'])}
    d = d0
    if sid in P2:
        d = P2[sid](d)
    r2 = {'verdict': d['verdict'], 'status': d['status'], 'subclaims': len(d['subclaims']), 'citations': len(d['citations'])}
    for fn in P3.get(sid, []):
        d = fn(d)
    if sid not in P3:
        d = dict(d)
        d['round3'] = list(d.get('round3') or []) + ['Round 3 (%s): every sub-claim was read again against the quotations cited for it, the numbers and names of each claim were checked against its quotations (triage list), and the newly local texts (the NPS landscape documents, the 51 HABS records, Letterman 1866, the local newspaper pages) were searched for the open sub-claims; no change to this row.' % TODAY]
    rows.append(finalize3(d, TODAY, r1, r2, sid in P2, sid in P3))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as f:
    for d in rows:
        f.write(json.dumps(d, ensure_ascii=False) + '\n')
cnt = {}
for d in rows:
    cnt[d['verdict']] = cnt.get(d['verdict'], 0) + 1
print('wrote', OUT, len(rows), 'rows; round-2 patched', len(P2), '; round-3 patched', sorted(P3), '| verdicts', cnt)
