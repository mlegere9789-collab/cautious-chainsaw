import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
out=[]
for st in ['Alabama','Mississippi','Texas','Tennessee','Arkansas','Maryland','Florida']:
    for extra in ['Infantry Regiment','Artillery','Cavalry']:
        q='subject:("Confederate States of America. Army. %s") AND subject:("%s") AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts'%(st,extra) if False else 'subject:("%s %s") AND subject:(Confederate) AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts'%(st,extra)
        try:
            n,docs=h.search(q,15); out.append(dict(q=q,n=n,docs=docs))
            print('Q:',st,extra,n)
            for d in docs: print('   ',d['identifier'],'|',d.get('title','')[:90],'|',str(d.get('date'))[:4],'|',str(d.get('creator'))[:40])
        except Exception as e: print('ERR',st,extra,e)
json.dump(out,open(h.DATA+r'\scripts\probe4.json','w'),indent=1)
