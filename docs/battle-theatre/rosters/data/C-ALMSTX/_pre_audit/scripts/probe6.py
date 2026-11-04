import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
D=' AND date:[1860-01-01 TO 1935-12-31]'
Q = [
 'title:(tennessee) AND title:(archer) AND mediatype:texts'+D,
 'title:("first tennessee" OR "seventh tennessee" OR "fourteenth tennessee") AND title:(regiment OR infantry OR volunteers) AND mediatype:texts'+D,
 'title:(tennessee) AND title:(confederate) AND (title:roster OR title:muster OR title:soldiers OR title:rolls) AND mediatype:texts'+D,
 'title:("tennesseans in the civil war" OR "civil war veterans questionnaires" OR "tennessee confederate soldiers")',
 'title:(arkansas) AND (title:confederate OR title:soldiers OR title:regiment) AND mediatype:texts'+D,
 'title:("arkansas") AND title:("civil war") AND (title:rosters OR title:roster OR title:"muster rolls")',
 'title:(mississippi) AND (title:company OR title:regiment OR title:infantry OR title:guards OR title:rifles) AND date:[1861-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:(alabama) AND (title:company OR title:guards OR title:rifles OR title:grays OR title:greys) AND date:[1861-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:("barksdale" OR "wilcox") AND (title:brigade OR title:regiment) AND date:[1861-01-01 TO 1930-12-31]',
 'title:(mississippi) AND subject:(confederate) AND date:[1861-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:("list of field officers" OR "field officers, regiments") AND date:[1860-01-01 TO 1935-12-31]',
 'title:("roll of honor") AND subject:(confederate)'+D,
 'title:("official records") AND title:("series i") AND title:("volume xxvii" OR "vol. xxvii" OR "27") AND (title:"part ii" OR title:"part 2")',
]
out=[]
for q in Q:
    try:
        n,docs=h.search(q,10); out.append(dict(q=q,n=n,docs=docs))
        print('Q:',q[:100],n)
        for d in docs: print('   ',d['identifier'],'|',d.get('title','')[:90],'|',str(d.get('date'))[:4],'|',str(d.get('creator'))[:40])
    except Exception as e: print('ERR',q[:50],e)
json.dump(out,open(h.DATA+r'\scripts\probe6.json','w'),indent=1)
