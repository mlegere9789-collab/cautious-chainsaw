"""List the Pennsylvania units (regiments, batteries) in the repository OOB files. Writes ../units.json"""
import sys, os, json, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pa_common as C

out = []
seen = set()


def walk(o, fname):
    if isinstance(o, dict):
        uid = o.get('regiment_id') or o.get('battery_id')
        des = o.get('designation') or ''
        if uid and 'Pennsylvania' in des + (o.get('state') or '') and uid not in seen:
            seen.add(uid)
            out.append(dict(unit_id=uid, designation=des, strength=o.get('strength'), casualties=o.get('casualties'),
                            brigade=o.get('parent_brigade_id'), corps=o.get('parent_corps_id'), file=fname))
        for v in o.values():
            walk(v, fname)
    elif isinstance(o, list):
        for v in o:
            walk(v, fname)


for f in sorted(glob.glob(os.path.join(C.ROOT, 'baseline', 'dist', 'data', 'oob', 'union_*.json'))):
    walk(json.load(open(f, encoding='utf8')), os.path.basename(f))
json.dump(out, open(os.path.join(C.DATA, 'units.json'), 'w', encoding='utf8'), indent=1)
for o in out:
    print(o['unit_id'], '|', o['designation'], '|', o['strength'])
print(len(out))
