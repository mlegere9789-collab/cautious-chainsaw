import json,os,time,subprocess
D=os.path.dirname(os.path.abspath(__file__))
UA="gettysburg-map-research/1.0 (historical reconstruction; polite)"
ids=json.load(open(D+'/habs/_index.json'))
for u in ids:
    iid=u.rstrip('/').split('/')[-1]
    fn=f'{D}/habs/data/{iid}data.pdf'
    if os.path.exists(fn) and os.path.getsize(fn)>1000: continue
    url=f'https://tile.loc.gov/storage-services/master/pnp/habshaer/pa/pa{iid[2:4]}00/{iid}/data/{iid}data.pdf'
    r=subprocess.run(['curl','-sS','-L','-m','90','-A',UA,'-o',fn,'-w','%{http_code}',url],capture_output=True,text=True)
    print(iid,r.stdout,flush=True)
    time.sleep(2)
