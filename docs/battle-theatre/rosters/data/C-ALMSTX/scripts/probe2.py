import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
ids = sys.argv[1:]
try: out=json.load(open(h.DATA+r'\scripts\meta_cache.json'))
except Exception: out={}
for i in ids:
    if i in out: continue
    try:
        m=h.meta(i); r=h.rights(m); out[i]=r
    except Exception as e: out[i]=dict(err=str(e))
    print(i, json.dumps(out[i])[:400])
json.dump(out,open(h.DATA+r'\scripts\meta_cache.json','w'),indent=1)
