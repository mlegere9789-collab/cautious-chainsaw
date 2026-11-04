import sys,re,html,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
from units import *
idx=open(os.path.join(CACHE,'nysmm_cw_index.html'),encoding='utf-8').read()
links=sorted(set(re.findall(r'href="(https://museum.dmna.ny.gov/unit-history/[^"]+)"',idx)))
def find(rx):
    r=[l for l in links if re.search(rx,l)]
    return r
ART={'U-ART-15NY':r'/artillery/15th-independent-battery','U-ART-5NY':r'/artillery/5th-independent-battery-light',
 'U-ART-C1NY':r'battery-c-1st-artillery-regiment-light$','U-ART-L1NY':r'battery-l-1st-artillery-regiment-light$','U-ART-L1NY-I':r'battery-l-1st-artillery-regiment-light$',
 'U-ART-1NYIND':r'/artillery/1st-independent-battery-light','U-ART-3NY':r'/artillery/3rd-independent-battery-light',
 'U-ART-G1NY':r'battery-g-1st-artillery-regiment-light$','U-ART-D1NY':r'battery-d-1st-artillery-regiment-light$','U-ART-4NYIND':r'/artillery/4th-independent-battery-light',
 'U-ART-13NY':r'/artillery/13th-independent-battery','U-ART-M1NY':r'battery-m-1st-artillery-regiment-light$'}
res={}
for u in load_ny_units():
    uid=u['unit_id']; m=re.match(r'U-(\d+)NY(-XII)?$',uid); url=None
    if m: 
        c=find(r'/infantry(?:-\d)?/%s-infantry-regiment$'%ordinal(m.group(1))); url=c[0] if len(c)==1 else None; u['cands']=c
    elif uid=='U-14BK': url=None
    else:
        m=re.match(r'U-(\d+)NY-CAV',uid)
        if m:
            c=find(r'/cavalry/%s-cavalry-regiment$'%ordinal(m.group(1))); url=c[0] if len(c)==1 else None; u['cands']=c
        elif uid in ART:
            c=find(ART[uid]); url=c[0] if len(c)==1 else None; u['cands']=c
    u['page']=url; res[uid]=u
    print(uid,url,u.get('cands') if not url else '',flush=True)
json.dump(res,open(r'C:\Users\mlege\gettysburg-map\tmp\bt\ny\unitmap.json','w'),indent=1)
