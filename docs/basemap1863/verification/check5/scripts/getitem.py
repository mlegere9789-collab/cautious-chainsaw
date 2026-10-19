import sys,json,time,subprocess,os
UA="gettysburg-map-verification/1.0 (non-commercial historical research; polite 4s delay)"
def sh(url,out=None):
    a=['curl','-s','-m','90','-A',UA,'-L']
    if out: a+=['-o',out]
    r=subprocess.run(a+[url],capture_output=True)
    return r.stdout
for iid in sys.argv[1:]:
    jf=f'photos/{iid}.json'
    if not os.path.exists(jf):
        d=json.loads(sh(f'https://www.loc.gov/pictures/item/{iid}/?fo=json'))
        json.dump(d,open(jf,'w'))
        time.sleep(4)
    d=json.load(open(jf)); it=d['item']
    res=d['resources']
    print(iid,'|',it['title'],'|',it.get('created_published'),'|',[c['title'] for c in it['creators']] if it.get('creators') else '')
    for n in it.get('notes',[]): print('    NOTE:',str(n.get('note'))[:400])
    for r in res[:2]:
        u=r.get('large') or r.get('medium')
        f=f'photos/{iid}_{r["item"]}.jpg'
        if u and not os.path.exists(f):
            sh(u,f); time.sleep(4)
        print('   img',f,r.get('large_s'),u)
