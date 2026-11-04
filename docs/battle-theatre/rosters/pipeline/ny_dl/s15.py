import sys,re,html,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
p=r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json'
um=json.load(open(p))
url='https://museum.dmna.ny.gov/unit-history/infantry-2/120th-infantry-regiment'
fn=os.path.join(CACHE,'nysmm_pages','infantry-2__120th-infantry-regiment.html')
if not os.path.exists(fn):
    st,b=get(url); open(fn,'w',encoding='utf-8').write(b.decode('utf-8','replace'))
um['EXTRA-120NY']={'unit_id':'EXTRA-120NY','designation':'120th New York Volunteer Infantry','strength':None,'casualties':None,'brigade':'U-III-2-2','arm':'infantry','page':url}
json.dump(um,open(p,'w'),indent=1)
