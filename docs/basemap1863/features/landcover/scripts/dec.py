import json, os, sys
F='decisions.json'
def load():
    return json.load(open(F)) if os.path.exists(F) else {'wood':[], 'orchardc':[], 'marshc':[], 'reject':[], 'poly':[]}
def save(d): json.dump(d,open(F,'w'),indent=0)
def add(tile, wood=(), orchardc=(), marshc=(), reject=(), poly=()):
    d=load()
    for k,v in [('wood',wood),('orchardc',orchardc),('marshc',marshc),('reject',reject)]:
        for i in v:
            if i not in d[k]: d[k].append(i)
    for p in poly:
        p=dict(p); p['tile']=tile; d['poly'].append(p)
    save(d)

def ids_at(pts, F2='auto_core.json'):
    from shapely.geometry import Polygon, Point
    cs=json.load(open(F2)); out=[]
    for x,y in pts:
        hit=[int(c['id'][1:]) for c in cs if c['bbox'][0]<=x<=c['bbox'][0]+c['bbox'][2] and c['bbox'][1]<=y<=c['bbox'][1]+c['bbox'][3] and Polygon(c['pts']).buffer(0).contains(Point(x,y))]
        out.append(hit)
    return out

def addx(wood=(), woodC=(), orchardB=(), orchardC=(), marshB=(), marshC=(), note=None):
    d=load()
    for k,v in [('wood',wood),('woodC',woodC),('orchardB',orchardB),('orchardC',orchardC),('marshB',marshB),('marshC',marshC)]:
        d.setdefault(k,[])
        for i in v:
            if i not in d[k]: d[k].append(i)
    save(d)
