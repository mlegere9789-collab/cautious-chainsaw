import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
Q = {
 'rowland': 'title:("military history of mississippi") AND mediatype:texts',
 'ms_register': 'title:("official and statistical register of the state of mississippi") AND mediatype:texts',
 'brewer': 'title:("alabama: her history, resources, war record") AND mediatype:texts',
 'brewer2': 'creator:(brewer) AND title:(alabama) AND title:("war record")',
 'florida': 'title:("soldiers of florida") AND mediatype:texts',
 'polley': 'title:("hood\'s texas brigade") AND mediatype:texts',
 'goldsborough': 'title:("maryland line") AND mediatype:texts',
 'lindsley': 'title:("military annals of tennessee") AND mediatype:texts',
 'oates': 'title:("war between the union and the confederacy") AND mediatype:texts',
 'wright_field_officers': 'title:("list of field officers, regiments and battalions") AND mediatype:texts',
 'cmh': 'title:("confederate military history") AND mediatype:texts',
}
out={}
for k,q in Q.items():
    try:
        n,docs=h.search(q,10); out[k]=dict(n=n,docs=docs)
        print(k,n); [print('   ',d['identifier'],'|',d.get('title','')[:80],'|',d.get('date'),'|',d.get('volume')) for d in docs]
    except Exception as e:
        print(k,'ERR',e)
json.dump(out,open(h.DATA+r'\scripts\probe1.json','w'),indent=1)
