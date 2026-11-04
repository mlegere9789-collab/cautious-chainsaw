import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from ojc_common import *
ids = {
 'OH1':'officialrosters05commgoog','OH2':'officialrosters02commgoog','OH3':'ohiowarroster03howerich','OH4':'ohiowarroster04howerich',
 'OH5':'ohiowarroster05howerich','OH6':'ohiowarroster06howerich','OH6b':'officialrosterof62ohio','OH7':'officialrosterof07ohio','OH8':'ohiowarroster08howerich',
 'OH9':'ohiowarroster09howerich','OH10':'ohiowarroster10howerich','OH11':'officialrosterof11ohio','OH12':'officialrosters06commgoog',
 'OH3b':'officialrosterof32ohio',
 'NJ1':'newjerseyincivil01recorich','NJ2':'newjerseyincivil02recorich',
 'CT1869':'connecticutvolorg00catarich','CT1864a':'enlistmentcasual00horarich'}
out={}
for k,i in ids.items():
    d = get_json('https://archive.org/metadata/'+i, 'meta_%s.json'%i)
    if not d: out[k]='ERR'; continue
    m=d.get('metadata',{}); files=d.get('files',[])
    txt=[f for f in files if f['name'].endswith('_djvu.txt')]
    out[k]=dict(id=i,title=str(m.get('title'))[:90],volume=m.get('volume'),date=m.get('date'),copyright=m.get('possible-copyright-status'),
      access_restricted=m.get('access-restricted-item'),imagecount=m.get('imagecount'),publisher=m.get('publisher'),contributor=m.get('contributor'),
      txt=[(f['name'],f.get('size')) for f in txt], licenseurl=m.get('licenseurl'))
    print(k, out[k])
json.dump(out, open(os.path.join(DATA,'ia_meta.json'),'w'), indent=1)
