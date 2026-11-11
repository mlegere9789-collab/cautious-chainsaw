import json, os, hashlib, datetime
R='/home/user/cautious-chainsaw'
T=R+'/tmp/library/ws9'
a=json.load(open(T+'/acq_result.json')); b=json.load(open(T+'/acq2_result.json'))
items=[]
extra={'LONG-GBV-1891':'text layer is a map legend only (433 bytes): unusable as text',
 'ORSER3-v2':'Series III vol. 2 only; the volume covering the 1863 militia/draft calls (vol. 3) was not found by search in this pass',
 'OR-25-1':'archive.org item is Series I vol. XXV PART II (Correspondence, Jan-May 1863); Part I (reports) not located; local id kept as OR-25-1 for file naming only',
 'OR-29-1':'archive.org item is Series I vol. XXIX PART II (Correspondence, Aug-Dec 1863); Part I (reports) not located; local id kept as OR-29-1 for file naming only',
 'PIERCE-F-1914':'secondary history by F. M. Pierce (1914); acquired for completeness, NOT a source for any register claim',
 'HOSPSCENES-1864':'Patriot Daughters of Lancaster, 1864',
 'BACH-KEY-1864':'only 19,948 bytes of OCR text'}
for it in a['items']+b['items']:
    it=dict(it); it['licence_basis']='public domain (pre-1929 US publication)'
    if it['id'] in extra: it['note']=extra[it['id']]
    items.append(it)
prior=[]
import glob
acq=json.load(open(R+'/docs/battle-theatre/GOVERNANCE/library/acquired.json'))['items']
bysid={i['source_id']:i for i in acq}
for p in sorted(glob.glob(T+'/prior/*.txt')):
    sid=os.path.basename(p).split('__')[0]
    h=hashlib.sha256(open(p,'rb').read()).hexdigest()
    prior.append({'source_id':sid,'archive_identifier':bysid[sid]['archive_identifier'],'sha256_now':h,'sha256_recorded_in_acquired_json':bysid[sid]['sha256'],'match':h==bysid[sid]['sha256'],'refetched_at':'2026-11-11','local_path':'tmp/library/ws9/prior/'+os.path.basename(p)})
out={'_doc':'Workstream 9 (library queue) tracked pointers. Raw text lives under tmp/library/ws9/ (gitignored). All downloads via https://archive.org/cors/<id>/<file>, 1 request/second, no logins. A sha256 manifest is at tmp/library/ws9/MANIFEST.json (untracked). licence_basis is stated only for items published before 1929 in the US; OCR is UNVERIFIED raw djvu text for every item.',
 'generated':'2026-11-11','items':items,'reverified_prior_items':prior,
 'blocked_or_failed':[
  {'source':'Chronicling America bulk OCR (chroniclingamerica.loc.gov)','reason':'connection refused by the egress proxy (host not allowed); not circumvented'},
  {'source':'www.loc.gov item/resource JSON for 1863 newspapers','reason':'reachable (probe HTTP 200 on one page of the Rutland Weekly Herald, 1863-07-09), but Gettysburg Compiler and Adams Sentinel are not in the loc.gov Chronicling America search results for the query used; bulk OCR for other papers NOT fetched in this pass (news-spread evidence only, deferred, not dropped)'},
  {'source':'npshistory.com, ehistory.osu.edu, babel.hathitrust.org, maine.gov, catalog.archives.gov, gutenberg.org','reason':'one root-URL probe each on 2026-11-11 returned no connection (curl status 000, proxy refusal); recorded, not circumvented'},
  {'source':'Massachusetts at Gettysburg (state commission volume)','reason':'archive.org title search 2026-11-11 found no matching item (only a Military Historical Society paper, a burial-committee report and others); not acquired'},
  {'source':'Gibbon, Personal Recollections of the Civil War','reason':'archive.org title/creator search returned no result; not acquired (not searched under other titles)'},
  {'source':'Official Records Ser. I vol. 25 Part I and vol. 29 Part I','reason':'only Part II (correspondence) items found by identifier search; Part I not located'},
  {'source':'Official Records Ser. III vol. 3','reason':'not found by search; vol. 2 acquired instead'},
  {'source':'Virginia, North Carolina, Georgia, Alabama, South Carolina, Texas state/unit volumes','reason':'not searched in this pass'},
  {'source':'Coddington, Busey and Martin, Pfanz, Gottfried, Warner, Thomas/Coates, Jensen, Coco','reason':'not public domain: skipped by instruction'}]}
json.dump(out,open(R+'/docs/battle-theatre/GOVERNANCE/library/acquired_2.json','w'),indent=1,ensure_ascii=False)
man={i['id']:{'path':i['local_path'],'bytes':i['bytes'],'sha256':i['sha256']} for i in items}
json.dump(man,open(T+'/MANIFEST.json','w'),indent=1)
print(len(items),len(prior),all(p['match'] for p in prior))
