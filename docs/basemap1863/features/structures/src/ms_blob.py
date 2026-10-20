import json, sys, numpy as np, rasterio, warnings, cv2
warnings.filterwarnings('ignore')
from rasterio.windows import Window
H=np.array(json.load(open('docs/basemap1863/features/structures/evidence/georef_comparison.json'))['plate_cw0353500_to_cw0325000a_homography']); Hi=np.linalg.inv(H)
cat={f['id']:f['properties'] for f in json.load(open('docs/basemap1863/features/structures/structures.geojson'))['features']}
ids=json.load(open('tmp/b1863/fix/ms_ids.json'))
plate=rasterio.open('tmp/b1863/maps/scans/cw0353500.jp2')
out={}
R=40
for i in ids:
    x,y=cat[i]['map_px_cw0325000a']; v=Hi@np.array([x,y,1.0]); cx,cy=int(v[0]/v[2]),int(v[1]/v[2])
    a=plate.read(window=Window(cx-R,cy-R,2*R,2*R),boundless=True,fill_value=255).mean(0)
    dark=(a<95).astype(np.uint8)
    op=cv2.morphologyEx(dark,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_RECT,(6,6)))
    n,lab,st,cen=cv2.connectedComponentsWithStats(op)
    best=99;bi=None
    yy,xx=np.nonzero(op)
    if len(yy):
        d=np.hypot(yy-R,xx-R); k=d.argmin(); best=float(d[k]); bi=int(lab[yy[k],xx[k]])
    out[i]=dict(d=round(best,1),area=int(st[bi,4]) if bi else 0)
bad=[i for i in ids if out[i]['d']>4]
print(len(bad)); 
for i in ids: print(i.replace('STR-MAPSYM-',''),out[i], cat[i].get('nearest_owner_label'))
json.dump(out,open('tmp/b1863/fix/ms_blob.json','w'))
