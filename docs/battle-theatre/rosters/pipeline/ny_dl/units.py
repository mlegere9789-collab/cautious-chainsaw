import json,glob,os,re
ROOT=r'C:\Users\mlege\gettysburg-map'
def ordinal(n):
    n=int(n)
    if 10<=n%100<=20: s='th'
    else: s={1:'st',2:'nd',3:'rd'}.get(n%10,'th')
    return '%d%s'%(n,s)
def load_ny_units():
    ny=[]
    for f in glob.glob(ROOT+'/baseline/dist/data/oob/union_regiments_*.json')+[ROOT+'/baseline/dist/data/oob/union_cavalry_artillery.json']:
        d=json.load(open(f,encoding='utf-8'))
        for r in d['regiments']:
            if 'New York' in str(r.get('state','')) or 'NY' in r['regiment_id']:
                ny.append(dict(unit_id=r['regiment_id'],designation=r['designation'],strength=r.get('strength'),casualties=r.get('casualties'),brigade=r.get('parent_brigade_id'),arm='cavalry' if 'CAV' in r['regiment_id'] else 'infantry'))
    d=json.load(open(ROOT+'/baseline/dist/data/oob/union_artillery.json',encoding='utf-8'))
    def walk(o):
        if isinstance(o,dict):
            if 'battery_id' in o and ('N.Y' in o['designation'] or 'New York' in o['designation']):
                ny.append(dict(unit_id=o['battery_id'],designation=o['designation'],strength=o.get('strength'),casualties=o.get('casualties'),brigade=None,arm='artillery'))
            for v in o.values(): walk(v)
        elif isinstance(o,list):
            for v in o: walk(v)
    walk(d)
    return sorted(ny,key=lambda x:x['unit_id'])
if __name__=='__main__':
    u=load_ny_units(); print(len(u))
