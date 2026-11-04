import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
Q = [
 'title:(roster OR muster) AND (texas) AND (confederate) AND date:[1860-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:("texas") AND title:("infantry") AND (subject:("confederate states of america") OR title:confederate) AND date:[1862-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:("hood\'s texas brigade") AND date:[1860-01-01 TO 1930-12-31]',
 'title:("fifth texas" OR "5th texas" OR "fourth texas" OR "4th texas" OR "first texas") AND date:[1860-01-01 TO 1930-12-31] AND mediatype:texts',
 'title:(arkansas) AND title:(confederate) AND (title:roster OR title:soldiers OR title:muster) AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:("third arkansas" OR "3rd arkansas") AND mediatype:texts',
 'title:(alabama) AND (title:roster OR title:muster OR title:"roll of") AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:(alabama) AND title:(confederate) AND (title:regiment OR title:infantry) AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:(mississippi) AND (title:roster OR title:muster OR title:"roll of") AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:(tennessee) AND (title:roster OR title:muster OR title:"roll of") AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:("tennessee") AND title:(confederate) AND (title:soldiers OR title:regiment) AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:("south carolina" OR georgia OR virginia) AND false',
 'title:("southern historical society papers") AND mediatype:texts',
 'title:("confederate veteran") AND date:[1893-01-01 TO 1932-12-31] AND mediatype:texts',
 'title:("roll of honor" OR "roll of honour") AND (confederate OR southern) AND mediatype:texts',
 'title:(gettysburg) AND (confederate) AND (killed OR wounded OR dead OR prisoners) AND date:[1863-01-01 TO 1935-12-31] AND mediatype:texts',
 'title:("jeff davis legion" OR "jeff. davis legion") AND mediatype:texts',
 'title:("hardaway" OR "reese" OR "alabama battery" OR "alabama artillery") AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts',
]
out=[]
for q in Q:
    if q.endswith('AND false'): continue
    try:
        n,docs=h.search(q,12); out.append(dict(q=q,n=n,docs=docs))
        print('Q:',q[:110],n)
        for d in docs: print('   ',d['identifier'],'|',d.get('title','')[:85],'|',str(d.get('date'))[:10],'|',d.get('creator'))
    except Exception as e:
        print('ERR',q[:60],e)
json.dump(out,open(h.DATA+r'\scripts\probe3.json','w'),indent=1)
