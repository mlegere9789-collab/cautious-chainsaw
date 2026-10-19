import sys,json,numpy as np,warnings; warnings.filterwarnings('ignore'); sys.path.insert(0,'.')
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS=None
import georef_final as G
from geo import *
OUT='../../../docs/basemap1863/features/structures/'
F=json.load(open(OUT+'structures.geojson',encoding='utf-8'))['features']
M=G.Model(json.load(open('mapwork/gcps_final4.json')),1e4)
IM=Image.open('mapwork/d_in_a.jpg').convert('RGB')
FONT=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',12)
farms={}
for f in F:
    fm=f['properties'].get('farm')
    if fm: farms.setdefault(fm,[]).append(f)
def tile(fm,half=110,sc=3.0):
    fs=farms[fm]; cs=[]
    for f in fs:
        g=f['geometry']
        if not g: continue
        c=g['coordinates'] if g['type']=='Point' else np.mean(g['coordinates'][0],axis=0)
        cs.append(M.m2px(np.array([ll2m(c[0],c[1])]))[0])
    cx,cy=np.mean(cs,axis=0); x0=int(cx-half);y0=int(cy-half)
    c=IM.crop((x0,y0,x0+2*half,y0+2*half)).resize((int(2*half*sc),int(2*half*sc)),Image.LANCZOS); d=ImageDraw.Draw(c)
    def pp(lon,lat):
        p=M.m2px(np.array([ll2m(lon,lat)]))[0]; return ((p[0]-x0)*sc,(p[1]-y0)*sc)
    for f in fs:
        g=f['geometry']; pr=f['properties']
        if not g: continue
        col=(0,150,0) if pr['status'].startswith('survives') else (220,0,0)
        if g['type']=='Point':
            X,Y=pp(*g['coordinates']); d.ellipse([X-7,Y-7,X+7,Y+7],outline=col,width=2)
            d.text((X+8,Y-6),pr['id'].split('-',2)[2][:16],fill=col,font=FONT)
        else:
            pts=[pp(*q) for q in g['coordinates'][0]]; d.polygon(pts,outline=col)
            d.text((pts[0][0]+4,pts[0][1]-12),pr['id'].split('-',2)[2][:16],fill=col,font=FONT)
    d.rectangle([0,0,c.size[0],16],fill=(255,255,255)); d.text((3,1),fm,fill=(0,0,0),font=FONT)
    return c
names=list(farms)
print(names)
for k in range(0,len(names),4):
    ts=[tile(n) for n in names[k:k+4]]; W=ts[0].size[0]
    M_=Image.new('RGB',(W*2,W*2),(255,255,255))
    for j,t in enumerate(ts): M_.paste(t,((j%2)*W,(j//2)*W))
    M_.save(f'mapwork/audit_{k//4:02d}.png')
