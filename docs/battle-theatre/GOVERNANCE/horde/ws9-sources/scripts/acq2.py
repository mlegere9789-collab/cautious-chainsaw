import json, hashlib, os, time, datetime, urllib.request
H={'User-Agent':'research-fetch/1.0 (educational; 1 req/s)'}
L=[0]
def get(u,t=240):
    d=time.time()-L[0]
    if d<1.05: time.sleep(1.05-d)
    L[0]=time.time()
    return urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=t).read()
OUT='/home/user/cautious-chainsaw/tmp/library/ws9'
ids=json.load(open('news_ids.json'))
items=[]
for k,paper in (('comp','GBG-COMPILER'),('adams','ADAMS-SENTINEL')):
    for i in ids[k]:
        if i.split('-')[-3:][1] >= '06': items.append((paper+'-'+i[-10:],i,paper))
items+= [('OR-25-1','warofrebellionco0025unit','OR-OTHER'),('OR-29-1','warofrebellionco0029unit_v5r6','OR-OTHER')]
rec=[];fail=[]
for sid,ident,grp in items:
    try:
        m=json.loads(get('https://archive.org/metadata/'+ident)); md=m.get('metadata',{})
        if md.get('access-restricted-item') in ('true',True): fail.append({'id':sid,'archive_identifier':ident,'reason':'access-restricted'}); continue
        dj=[f for f in m.get('files',[]) if f['name'].endswith('_djvu.txt')]
        if not dj: fail.append({'id':sid,'archive_identifier':ident,'reason':'no djvu.txt in file list','files':[f['name'] for f in m.get('files',[])][:8]}); continue
        fn=dj[0]['name']; b=get('https://archive.org/cors/%s/%s'%(ident,fn))
        p=os.path.join(OUT,sid+'__'+ident+'_djvu.txt'); open(p,'wb').write(b)
        rec.append({'id':sid,'queue_source':grp,'title':md.get('title'),'archive_identifier':ident,'creator':md.get('creator'),'date':md.get('date'),'volume':md.get('volume'),'url':'https://archive.org/cors/%s/%s'%(ident,fn),'details_url':'https://archive.org/details/'+ident,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'fetched_at':datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),'local_path':'tmp/library/ws9/'+os.path.basename(p),'ocr_quality':'UNVERIFIED raw djvu text'})
        print('ok',sid,len(b),md.get('title'),flush=True)
    except Exception as e:
        fail.append({'id':sid,'archive_identifier':ident,'reason':'%r'%e}); print('FAIL',sid,e,flush=True)
json.dump({'items':rec,'failed':fail},open(OUT+'/acq2_result.json','w'),indent=1)
print('done')
