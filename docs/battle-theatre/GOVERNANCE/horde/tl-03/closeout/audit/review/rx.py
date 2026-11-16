"""non-logging regex view: python3 -I rx.py SCOPE 'regex' [--ids A,B] [--ctx 220] [--max 6]   SCOPE: or1|or2|or3|or|lib"""
import sys,re,pickle,argparse
sys.path.insert(0,'/home/user/cautious-chainsaw/tools/bt')
ap=argparse.ArgumentParser(); ap.add_argument('scope'); ap.add_argument('rx'); ap.add_argument('--ids'); ap.add_argument('--ctx',type=int,default=220); ap.add_argument('--max',type=int,default=6)
a=ap.parse_args()
rx=re.compile(a.rx,re.I)
srcs={}
if a.scope.startswith('or'):
    import or27_find as F
    parts=[1,2,3] if a.scope=='or' else [int(a.scope[2])]
    for p in parts: srcs['OR27 pt.%d'%p]=F.get_part(p).ntext
else:
    d=pickle.load(open('/home/user/cautious-chainsaw/tmp/tl-03/cache/light.pkl','rb'))
    ids=a.ids.split(',') if a.ids else list(d)
    for k in ids:
        if k in d: srcs[k]=d[k]
for k,t in srcs.items():
    n=0
    for m in rx.finditer(t):
        n+=1
        if n>a.max: break
        print('[%s @%d] ...%s[[%s]]%s...'%(k,m.start(),t[max(0,m.start()-a.ctx):m.start()],m.group(0)[:200],t[m.end():m.end()+a.ctx]))
