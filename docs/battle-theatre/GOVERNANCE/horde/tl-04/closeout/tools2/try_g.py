import sys, re, collections, json, time
sys.path.insert(0,'/home/user/cautious-chainsaw/tmp/tl-04')
import build, tl4lib as T
build.load_rows()
scopes=set(sys.argv[1].split(',')) if len(sys.argv)>1 else {'OR27'}
rows=sys.argv[2].split(',') if len(sys.argv)>2 else None
specs=[]; owner={}
for r in T.ROWS.values():
    if rows and r['id'] not in rows: continue
    for s in r['searched']:
        sc=s['scope'] if isinstance(s['scope'],str) else 'list'
        if sc in scopes:
            specs.append(s); owner[id(s)]=r['id']
t=time.time()
res=T.run_searches(specs)
print('ran',len(specs),'searches in %.1fs'%(time.time()-t))
for s in specs:
    x=res[id(s)]
    print('%s [%s] hits=%s %s :: %s'%(owner[id(s)],s['scope'],x['hits'],dict(list(x['by_source'].items())[:4]),(s['what'] or '')[:80]))
    for lab,off,ctx in x['sample'][:2]:
        print('      ',lab,off,re.sub(r'\s+',' ',ctx)[:200])
