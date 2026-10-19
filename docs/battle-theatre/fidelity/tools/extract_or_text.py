import json,sys,re,os
# usage: rd.py docid [docid...]  -> writes tmp/bt/fidelity/src/<id>.txt with [[p.NNN]] page markers (printed folio)
os.makedirs('tmp/bt/fidelity/src',exist_ok=True)
want=set(sys.argv[1:])
got={}
for l in open('historian-src/raw/or27/passages.jsonl',encoding='utf-8'):
    p=json.loads(l)
    if p['doc'] in want: got.setdefault(p['doc'],[]).append(p)
for d,ps in got.items():
    ps.sort(key=lambda p:p['seq'])
    out=[]
    for p in ps:
        t=p['text']; marks=sorted(p.get('pg',[]),key=lambda m:-m[0])
        for off,pg,leaf,rd in marks:
            t=t[:off]+f' [[p.{pg}]] '+t[off:]
        out.append(t)
    fn=f"tmp/bt/fidelity/src/{d.replace(':','_')}.txt"
    open(fn,'w',encoding='utf-8').write('\n\n'.join(out))
    print(fn,sum(len(x) for x in out))
