import re,html,json,os,glob
um=json.load(open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'))
pd=r'C:\Users\mlege\gettysburg-map\tmp\library\rosters\NY\nysmm_pages'
out={}
for u in um.values():
    p=u['page']
    if not p or p in out: continue
    fn=os.path.join(pd,p.split('/unit-history/')[1].replace('/','__')+'.html')
    if not os.path.exists(fn): out[p]='MISSING'; continue
    h=open(fn,encoding='utf-8').read()
    ls=[]
    for m in re.finditer(r'href="(https?://(?:www\.nysmm\.org|museum\.dmna\.ny\.gov)/download_file/view/\d+(?:/\d+)?)"[^>]*>(.{0,160}?)</a>',h,re.S):
        ls.append((m.group(1),html.unescape(re.sub('<[^>]+>','',m.group(2))).strip()))
    out[p]=ls
json.dump(out,open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\pagelinks.json','w'),indent=1)
for p,l in out.items():
    if l=='MISSING': print('MISSING',p); continue
    lab=[x[1][:25] for x in l if re.search('Roster',x[1],re.I)]
    print(p.split('/unit-history/')[1][:60],'|',lab)
