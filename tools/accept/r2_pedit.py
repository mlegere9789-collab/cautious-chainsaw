"""Helper for the round-2 edits of candidate patch files in tools/t0/patches-next (same JSON layout as the originals: indent 1, UTF-8, LF, trailing newline).
    from r2_pedit import load, save, patch, add
"""
import json, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 't0', 'patches-next')
def path(name): return os.path.normpath(os.path.join(D, name if name.endswith('.json') else name + '.json'))
def load(name):
    with open(path(name), encoding='utf-8') as f: return json.load(f)
def save(name, obj):
    with open(path(name), 'w', encoding='utf-8', newline='') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False); f.write('\n')
def get(obj, pid): return next(p for p in obj['patches'] if p['id'] == pid)
def add(obj, patch, after=None):
    ids = [p['id'] for p in obj['patches']]
    if patch['id'] in ids: raise SystemExit('exists: ' + patch['id'])
    i = ids.index(after) + 1 if after else len(ids)
    obj['patches'].insert(i, patch)
