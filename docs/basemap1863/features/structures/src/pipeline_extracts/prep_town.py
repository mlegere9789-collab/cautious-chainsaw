import sys,json,numpy as np,cv2,warnings; warnings.filterwarnings('ignore'); sys.path.insert(0,'.')
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
import georef_final as G
from geo import *
from scipy.spatial import cKDTree
M=G.Model(json.load(open('mapwork/gcps_final3.json')),1e4)
im=np.array(Image.open('mapwork/d_in_a.jpg').convert('RGB'))
X0,Y0,X1,Y1=4380,3380,5760,4740
sub=im[Y0:Y1,X0:X1]
r,g,b=[sub[...,i].astype(np.int16) for i in range(3)]
dark=((r<125)&(g<118)&(b<118)&((b-r)<35)).astype(np.uint8)*255
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
op=cv2.morphologyEx(dark,cv2.MORPH_OPEN,k)
n,lab,st,cen=cv2.connectedComponentsWithStats(op,connectivity=8)
comps=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<16: continue
    fill=a/(w*h)
    if max(w,h)>85 and fill<0.35: continue     # long thin line-like (rail grade, roads)
    m_=(lab==i)[y:y+h,x:x+w].astype(np.uint8)
    cs,_=cv2.findContours(m_,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    per=sum(cv2.arcLength(c,True) for c in cs)
    if 2.0*a/max(per,1)<5.6: continue      # thin strokes (contour/road lines)
    comps.append(i)
cc=np.array([[cen[i][0]+X0,cen[i][1]+Y0] for i in comps])
t=cKDTree(cc); dens=np.array([len(t.query_ball_point(p,70))-1 for p in cc])
keep=[i for i,dn in zip(comps,dens) if dn>=3]
print(len(comps),len(keep))
feats=[]
for i in keep:
    mask=(lab==i).astype(np.uint8)
    cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    for c in cnts:
        if cv2.contourArea(c)<16: continue
        ap=cv2.approxPolyDP(c,1.0,True)[:,0,:].astype(float)+[X0,Y0]
        if len(ap)<3: continue
        ms=M.px2m(ap); ll=[T_INV.transform(*p) for p in ms]; ll.append(ll[0])
        feats.append(dict(px=ap.round(1).tolist(),ll=[[round(a,7),round(b,7)] for a,b in ll],area_px=float(cv2.contourArea(c))))
json.dump(feats,open('../../../docs/basemap1863/features/structures/evidence/borough_mass.json','w'))
print(len(feats))
vis=sub.copy()
for f in feats:
    pts=(np.array(f['px'])-[X0,Y0]).astype(np.int32); cv2.polylines(vis,[pts],True,(255,0,0),1)
Image.fromarray(vis).resize((int(vis.shape[1]*0.85),int(vis.shape[0]*0.85)),Image.LANCZOS).save('mapwork/town_mass_final.png')
