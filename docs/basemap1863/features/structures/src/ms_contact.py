import json, pickle, sys, numpy as np, rasterio, warnings
warnings.filterwarnings('ignore')
from rasterio.windows import Window
from PIL import Image, ImageDraw
sys.path.insert(0,'tools/b1863')
H=np.array(json.load(open('docs/basemap1863/features/structures/evidence/georef_comparison.json'))['plate_cw0353500_to_cw0325000a_homography'])
Hi=np.linalg.inv(H)
def to_plate(x,y):
    v=Hi@np.array([x,y,1.0]); return v[0]/v[2], v[1]/v[2]
cat={f['id']:f['properties'] for f in json.load(open('docs/basemap1863/features/structures/structures.geojson'))['features']}
items=pickle.load(open('tmp/b1863/build/draw_items.pkl','rb'))
ids=[s['id'] for s in items['structures'] if s.get('src')=='mapsym']
print(len(ids))
plate=rasterio.open('tmp/b1863/maps/scans/cw0353500.jp2')
R=70
def crop(ds,cx,cy):
    cx=int(cx);cy=int(cy)
    a=ds.read(window=Window(cx-R,cy-R,2*R,2*R),boundless=True,fill_value=255)
    return Image.fromarray(np.moveaxis(a,0,-1)).resize((2*R*2,2*R*2),Image.LANCZOS)
def sheet(idl,name):
    n=len(idl); cols=5; rows=(n+cols-1)//cols
    S=2*R*2
    im=Image.new('RGB',(cols*S,rows*(S+18)),'white'); d=ImageDraw.Draw(im)
    for k,i in enumerate(idl):
        px=cat[i]['map_px_cw0325000a']; pp=to_plate(*px)
        c=crop(plate,*pp); x=(k%cols)*S; y=(k//cols)*(S+18)
        im.paste(c,(x,y+18)); d.text((x+2,y+2),i.replace('STR-MAPSYM-','')+' '+str(cat[i].get('nearest_owner_label')),fill='red')
        d.ellipse((x+S//2-3,y+18+S//2-3,x+S//2+3,y+18+S//2+3),outline='red')
    im.save(name)
for k in range(0,len(ids),15):
    sheet(ids[k:k+15],'tmp/b1863/fix/ms_%d.png'%(k//15))
json.dump(ids,open('tmp/b1863/fix/ms_ids.json','w'))
