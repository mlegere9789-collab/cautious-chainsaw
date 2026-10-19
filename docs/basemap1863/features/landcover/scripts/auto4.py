import numpy as np, cv2, json, sys
from PIL import Image
sys.path.insert(0,'scripts')
from auto2 import features
Image.MAX_IMAGE_PIXELS=None
cv2.setNumThreads(2)
g=np.array(Image.open('warren_full_gray.png')); H,W=g.shape
M=np.zeros((H,W),np.uint8); strip=1500; pad=100
for y in range(0,H,strip):
    ya=max(0,y-pad); yb=min(H,y+strip+pad)
    ink,dens,coh=features(g[ya:yb],sig=10)
    m=((dens>0.17)&(coh<0.55)).astype(np.uint8)
    M[y:min(H,y+strip)]=m[y-ya:y-ya+min(strip,H-y)]
M=cv2.morphologyEx(M,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
M=cv2.morphologyEx(M,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
np.save('auto_mask2.npy',M)
core=np.load('auto_core.npy')
cs,hier=cv2.findContours(M,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE); hier=hier[0]
out=[]
from shapely.geometry import Polygon
for i,c in enumerate(cs):
    if hier[i][3]!=-1: continue
    a=cv2.contourArea(c)
    if a<2500: continue
    x,y,w,h=cv2.boundingRect(c)
    m=np.zeros((h,w),np.uint8); cv2.fillPoly(m,[c-[x,y]],1)
    ov=(core[y:y+h,x:x+w]&m).sum()/max(1,m.sum())
    if ov>0.6: continue
    d={'id':'C%03d'%len(out),'pts':c[:,0,:].tolist(),'holes':[],'area':a,'bbox':[x,y,w,h],'core_overlap':float(ov)}
    try:
        r=Polygon(d['pts']).buffer(0).representative_point(); d['rp']=[r.x,r.y]
    except Exception: d['rp']=[x+w/2,y+h/2]
    out.append(d)
print(len(out)); json.dump(out,open('auto_c2.json','w'))
