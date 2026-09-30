import json,re,sys
PW='C:/Users/mlege/AppData/Roaming/Claude/scratch-workspaces/fe20000a-2144-4d85-ac4c-4e19e62f5823/1fb796a8-22ef-47aa-b6e3-227d4048a221/scratch-2026-09-30-719300/plan-work'
base=open(PW+'/bundle.min.js',encoding='utf8').read()
sets={}
sets['MOB']=[p for p in json.load(open('mobile_patches.json',encoding='utf8')) if p['target']=='js']
sets['BUG']=json.load(open('bugs_patches.json',encoding='utf8'))
sets['A11Y']=json.load(open('a11y_patches.json',encoding='utf8'))
cp=json.load(open(PW+'/tmp-docs-copy/copy_patch_table.json',encoding='utf-8'))
sets['COPY']=[dict(id=r['id'],find=r['find'],repl=r['replace'] or '',expect=r['occurrences_in_minified']) for r in cp if r['file']=='bundle' and r['find']]
spans=[]  # (start,end,set,id)
report=[]
for sname,plist in sets.items():
    for p in plist:
        f=p['find']
        if p.get('regex'):
            ms=[(m.start(),m.end()) for m in re.finditer(f,base)]
        else:
            ms=[];i=base.find(f)
            while i!=-1:
                ms.append((i,i+len(f)));i=base.find(f,i+1)
        exp=p.get('expect',p.get('count',1))
        p['n']=len(ms)
        if len(ms)!=exp: report.append(('COUNT',sname,p['id'],len(ms),exp))
        for s,e in ms: spans.append((s,e,sname,p['id']))
spans.sort()
print('total spans',len(spans))
for r in report: print(r)
# overlaps
ov=[]
for i in range(len(spans)):
    s,e,sn,pid=spans[i]
    for j in range(i+1,len(spans)):
        s2,e2,sn2,pid2=spans[j]
        if s2>=e: break
        if (sn,pid)!=(sn2,pid2):
            ov.append((sn,pid,sn2,pid2,s,e,s2,e2))
print('overlaps',len(ov))
for o in ov: print(o[:4],'span1',o[4],o[5],'span2',o[6],o[7])
json.dump({k:[dict(id=p['id'],n=p['n']) for p in v] for k,v in sets.items()},open('counts.json','w',encoding='utf8'))
