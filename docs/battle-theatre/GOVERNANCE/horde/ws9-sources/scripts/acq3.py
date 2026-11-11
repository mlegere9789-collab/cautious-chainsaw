import json, hashlib, os, time, urllib.request
H={'User-Agent':'research-fetch/1.0 (educational; 1 req/s)'}
L=[0]
def get(u,t=240):
    d=time.time()-L[0]
    if d<1.05: time.sleep(1.05-d)
    L[0]=time.time()
    return urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=t).read()
R='/home/user/cautious-chainsaw'
acq=json.load(open(R+'/docs/battle-theatre/GOVERNANCE/library/acquired.json'))['items']
want={'NY-GB-1900','NY-GB-1900-v2','NY-GB-1902-v3','PA-GB-1904','PA-GB-1914-v2','ME-GB-1898','MI-GB-1889','FOX-1889','BL-3'}
os.makedirs(R+'/tmp/library/ws9/prior',exist_ok=True)
res=[]
for i in acq:
    if i['source_id'] in want:
        ident=i['archive_identifier']
        try:
            b=get('https://archive.org/cors/%s/%s_djvu.txt'%(ident,ident))
            ok=hashlib.sha256(b).hexdigest()==i['sha256']
            open(R+'/tmp/library/ws9/prior/%s__%s_djvu.txt'%(i['source_id'],ident),'wb').write(b)
            res.append((i['source_id'],len(b),ok)); print(res[-1],flush=True)
        except Exception as e: print('FAIL',i['source_id'],e,flush=True)
