import json, hashlib, os, time, datetime, sys
sys.path.insert(0,'.')
import urllib.request
H={'User-Agent':'research-fetch/1.0 (educational; 1 req/s)'}
L=[0]
def get(u,t=240):
    d=time.time()-L[0]
    if d<1.05: time.sleep(1.05-d)
    L[0]=time.time()
    return urllib.request.urlopen(urllib.request.Request(u,headers=H),timeout=t).read()
ROOT='/home/user/cautious-chainsaw'
OUT=ROOT+'/tmp/library/ws9'; os.makedirs(OUT,exist_ok=True)
ITEMS=[
('JACOBS-1864','notesonrebelinva00jaco','status_id:JACOBS'),
('LETTERMAN-1866','medicalrecollect00lettuoft','LETTERMAN'),
('BACH-KEY-1864','keytobacheldersi00bach','BACHELDER'),
('BACH-REPULSE-1870','paintingoftherepulse00bachrich','BACHELDER'),
('BACH-WHATTOSEE-1873','gettysburgwhatto00bach','BACHELDER'),
('BACH-WHATTOSEE-1889','gettysburgwhatt00bach','BACHELDER'),
('BACH-STORY-1904','storybattlegett00bachgoog','BACHELDER'),
('VT-MON-1890','vermontmonuments00verm','STATE-OTHER'),
('VT-GB-1914','vermontatgettysb00chen','STATE-OTHER'),
('NJ-TOOMBS-1888','newjerseytroopsi00toom','STATE-OTHER'),
('NJ-FINAL-1891','finalreportofget00newj','STATE-OTHER'),
('OH-DED-1887','dedicationofohio00ohio','STATE-OTHER'),
('OH-8TH-1889','eighthohioatget00sawygoog','STATE-OTHER'),
('IN-1913','indianaatfiftiet00pick','STATE-OTHER'),
('MN-1ST-1916','historyoffirstre00minn','STATE-OTHER'),
('HASKELL-1908','battleofgettysbu00haskuoft','WITNESS'),
('FREMANTLE-1864','threemonthsinsou00frem','WITNESS'),
('ALEXANDER-1907','militarymemoirso00alex','WITNESS'),
('LONGSTREET-1896','frommanassastoap00longuoft','WITNESS'),
('PIERCE-F-1914','battleofgettysbu00pier','WITNESS'),
('TPIERCE-1889','atgettysburgorwh00alle','WITNESS'),
('MEADE-LL-v1','lifelettersofgeo01mead','WITNESS'),
('MEADE-LL-v2','lifelettersofgeo02mead','WITNESS'),
('LONG-GBV-1891','gettysburgvicini00long','BACHELDER'),
('SHSP-04','southernhistoricv4sout','SHSP'),
('SHSP-05','southernhistoricv5sout','SHSP'),
('SHSP-06','southernhistoricv6sout','SHSP'),
('SHSP-11','southernhistoricv11sout','SHSP'),
('SHSP-12','southernhistoric12sout','SHSP'),
('HOSPSCENES-1864','hospitalscenesaf00patr','STATE-OTHER'),
('CEM-REPORT-1867','revisedreportmad00penn','STATE-OTHER'),
('CEM-BARTLETT-1874','soldiersnational00bart','STATE-OTHER'),
('CEM-INDIANA-1865','soldiersnational00indi','STATE-OTHER'),
('MA-BURIAL-1863','reportofjointspe3677bost','STATE-OTHER'),
('EVERETT-1864','addressofhone3521ever','STATE-OTHER'),
('ORSER3-v2','warofrebellionof0000unse','OR-OTHER'),
]
rec=[]; fail=[]
for sid,ident,grp in ITEMS:
    try:
        m=json.loads(get('https://archive.org/metadata/'+ident))
        md=m.get('metadata',{})
        if md.get('access-restricted-item') in ('true',True):
            fail.append({'id':sid,'archive_identifier':ident,'reason':'access-restricted (lending) item; not downloaded'}); continue
        dj=[f for f in m.get('files',[]) if f['name'].endswith('_djvu.txt')]
        if not dj:
            fail.append({'id':sid,'archive_identifier':ident,'reason':'no djvu.txt in file list'}); continue
        fn=dj[0]['name']
        b=get('https://archive.org/cors/%s/%s'%(ident,fn))
        p=os.path.join(OUT,sid+'__'+ident+'_djvu.txt'); open(p,'wb').write(b)
        rec.append({'id':sid,'queue_source':grp,'title':md.get('title'),'archive_identifier':ident,'creator':md.get('creator'),'date':md.get('date'),'volume':md.get('volume'),
          'url':'https://archive.org/cors/%s/%s'%(ident,fn),'details_url':'https://archive.org/details/'+ident,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),
          'fetched_at':datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),'local_path':'tmp/library/ws9/'+os.path.basename(p),
          'licence_basis':None,'ocr_quality':'UNVERIFIED raw djvu text'})
        print('ok',sid,len(b),md.get('date'),flush=True)
    except Exception as e:
        fail.append({'id':sid,'archive_identifier':ident,'reason':'lookup/download failed: %r'%e}); print('FAIL',sid,e,flush=True)
json.dump({'items':rec,'failed':fail},open(OUT+'/acq_result.json','w'),indent=1)
