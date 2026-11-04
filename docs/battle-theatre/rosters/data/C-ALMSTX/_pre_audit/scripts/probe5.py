import sys, json
sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\docs\battle-theatre\rosters\data\C-ALMSTX\scripts')
import iahelp as h
D=' AND date:[1860-01-01 TO 1935-12-31] AND mediatype:texts'
Q = [
 'title:("fourth alabama" OR "4th alabama")'+D,
 'title:("eighth alabama" OR "8th alabama" OR "ninth alabama" OR "9th alabama" OR "tenth alabama" OR "10th alabama" OR "eleventh alabama" OR "11th alabama")'+D,
 'title:("thirteenth alabama" OR "13th alabama" OR "third alabama" OR "3rd alabama" OR "sixth alabama" OR "6th alabama" OR "fifth alabama" OR "5th alabama" OR "twenty-sixth alabama" OR "26th alabama")'+D,
 'title:("forty-fourth alabama" OR "44th alabama" OR "forty-seventh alabama" OR "47th alabama" OR "forty-eighth alabama" OR "48th alabama" OR "fifteenth alabama" OR "15th alabama")'+D,
 'title:("twelfth alabama" OR "12th alabama")'+D,
 'title:("second mississippi" OR "2nd mississippi" OR "eleventh mississippi" OR "11th mississippi" OR "forty-second mississippi" OR "42nd mississippi")'+D,
 'title:("thirteenth mississippi" OR "13th mississippi" OR "seventeenth mississippi" OR "17th mississippi" OR "eighteenth mississippi" OR "18th mississippi" OR "twenty-first mississippi" OR "21st mississippi" OR "barksdale")'+D,
 'title:("twelfth mississippi" OR "12th mississippi" OR "sixteenth mississippi" OR "16th mississippi" OR "nineteenth mississippi" OR "19th mississippi" OR "forty-eighth mississippi" OR "48th mississippi")'+D,
 'title:("university greys" OR "university grays")'+D,
 'title:("second florida" OR "5th florida" OR "fifth florida" OR "eighth florida" OR "florida brigade")'+D,
 'title:("first tennessee" OR "seventh tennessee" OR "fourteenth tennessee" OR "7th tennessee" OR "14th tennessee" OR "archer")'+D,
 'title:("third arkansas" OR "first maryland" OR "maryland infantry" OR "maryland battery" OR "baltimore light artillery" OR "chesapeake artillery")'+D,
 'title:("jeff davis legion" OR "jeff. davis legion" OR "davis legion")'+D,
 'title:("hardaway artillery" OR "hurt\'s battery" OR "mcintosh\'s battalion")'+D,
 'title:("alabama") AND title:(roster)'+D,
 'title:("history of the fourteenth" OR "fourteenth regiment alabama")'+D,
]
out=[]
for q in Q:
    try:
        n,docs=h.search(q,12); out.append(dict(q=q,n=n,docs=docs))
        print('Q:',q[:100],n)
        for d in docs: print('   ',d['identifier'],'|',d.get('title','')[:90],'|',str(d.get('date'))[:4],'|',str(d.get('creator'))[:40])
    except Exception as e: print('ERR',q[:50],e)
json.dump(out,open(h.DATA+r'\scripts\probe5.json','w'),indent=1)
