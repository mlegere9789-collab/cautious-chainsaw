"""Extract every named commander (with role/unit) from the repo's OOB json (baseline/dist/data/oob).
Output: commanders-seed.csv.  Level inferred from the id key that holds the unit.  Successors are included.
Run: python docs/battle-theatre/assets/data/extract_commanders.py"""
import json, glob, csv, re, os, sys
root = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
oob = os.path.join(root, 'baseline', 'dist', 'data', 'oob')
rows = []
RANKS = ['Lieutenant General','Major General','Brigadier General','General','Lieutenant Colonel','Colonel','Major','Captain','First Lieutenant','Second Lieutenant','Lieutenant','Sergeant','Private','Corporal','Brevet Major General','Brevet Brigadier General']
def split_name(full):
    full = full.strip()
    for r in sorted(RANKS, key=len, reverse=True):
        if full.startswith(r + ' '):
            return r, full[len(r)+1:].strip()
    return '', full
LEVELS = [('army_id','army'),('corps_id','corps'),('division_id','division'),('brigade_id','brigade'),('regiment_id','regiment'),('battery_id','battery')]
def level_of(d):
    for k,l in LEVELS:
        if k in d: return l, d[k]
    return None, None
def add(name, fate, unit, desig, level, src, role):
    rank, nm = split_name(name)
    rows.append(dict(name=nm, rank=rank, role=role, level=level, unit_id=unit, unit=desig, fate=fate, source_file=src))
def walk(o, src, ctx=''):
    if isinstance(o, dict):
        lvl, uid = level_of(o)
        c = o.get('commander') if isinstance(o.get('commander'), dict) else None
        if c and c.get('name'):
            if not lvl: lvl = 'other'
            add(c['name'], c.get('fate',''), uid or ctx, o.get('designation',''), lvl, src, 'commander')
            s = c.get('successor')
            while isinstance(s, dict) and s.get('name'):
                add(s['name'], s.get('fate', s.get('assumed_command','')), uid or ctx, o.get('designation',''), lvl, src, 'successor')
                s = s.get('successor')
        ch = o.get('chief')
        if isinstance(ch, dict) and ch.get('name'):
            add(ch['name'], ch.get('fate',''), ctx, 'artillery chief', 'artillery-chief', src, 'chief')
        for k, v in o.items():
            if k in ('commander','chief'): continue
            walk(v, src, uid or ctx)
    elif isinstance(o, list):
        for v in o: walk(v, src, ctx)
for f in sorted(glob.glob(os.path.join(oob, '*.json'))):
    d = json.load(open(f, encoding='utf8'))
    b = os.path.basename(f)
    if b == 'commander_successions.json':
        for side in ('union_successions','confederate_successions'):
            for e in d[side]:
                add(e['to_commander'], e.get('cause',''), e['unit_id'], e['event'], 'succession', b, 'successor')
                add(e['from_commander'], e.get('cause',''), e['unit_id'], e['event'], 'succession', b, 'predecessor')
        continue
    walk(d, b)
    if isinstance(d.get('metadata',{}).get('army_commander'), dict):
        ac = d['metadata']['army_commander']
        add(ac['name'], ac.get('notes',''), 'U-AOP', 'Army of the Potomac', 'army', b, 'commander')
    if 'cavalry_commander' in d:
        add(d['cavalry_commander']['name'], d['cavalry_commander'].get('fate',''), 'C-CAV','Cavalry Division','division',b,'commander')
out = os.path.join(os.path.dirname(__file__), 'commanders-seed.csv')
w = csv.DictWriter(open(out,'w',newline='',encoding='utf8'), fieldnames=list(rows[0].keys()))
w.writeheader(); w.writerows(rows)
names = {(r['name']) for r in rows}
print('rows', len(rows), 'distinct names', len(names))
from collections import Counter
print(Counter(r['level'] for r in rows))
