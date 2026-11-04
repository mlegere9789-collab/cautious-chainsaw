import json,glob,os
ny=[]
for f in glob.glob('baseline/dist/data/oob/union_regiments_*.json')+['baseline/dist/data/oob/union_cavalry_artillery.json']:
    d=json.load(open(f,encoding='utf-8'))
    for r in d['regiments']:
        if 'New York' in str(r.get('state','')) or 'NY' in r.get('regiment_id','') or 'New York' in r.get('designation',''):
            ny.append((os.path.basename(f)[:22],r['regiment_id'],r['designation'],r.get('strength'),r.get('casualties'),r.get('state'),r.get('parent_brigade_id')))
for x in sorted(ny,key=lambda x:x[1]): print(x)
print(len(ny), sum(x[3] or 0 for x in ny))
d=json.load(open('baseline/dist/data/oob/union_cavalry_artillery.json',encoding='utf-8'))
print(d['metadata'].get('title'))
print(json.dumps(d['horse_artillery'])[:600])
d=json.load(open('baseline/dist/data/oob/union_artillery.json',encoding='utf-8'))
print(d['metadata'].get('title'))
def walk(o,p=''):
    if isinstance(o,dict):
        s=' '.join(str(v) for v in o.values() if not isinstance(v,(list,dict)))
        if ('N.Y' in s or 'New York' in s) and ('designation' in o or 'battery' in o or 'name' in o):
            print(p, {k:o[k] for k in o if not isinstance(o[k],(list,dict))})
        for k,v in o.items(): walk(v,p+'/'+k)
    elif isinstance(o,list):
        for i,v in enumerate(o): walk(v,p+'[%d]'%i)
walk(d)
