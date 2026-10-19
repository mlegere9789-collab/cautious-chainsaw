import numpy as np, cv2, json, sys
from shapely.geometry import Polygon
D=np.load('sym_dens.npy').astype(np.float32)
T=float(sys.argv[1])
m=(D>T).astype(np.uint8)
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
np.save('sym_mask.npy',m)
cs,h=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
out=[]
for c in cs:
    a=cv2.contourArea(c)
    if a<4000: continue
    x,y,w,hh=cv2.boundingRect(c)
    d={'id':'S%03d'%len(out),'pts':c[:,0,:].tolist(),'holes':[],'area':a,'bbox':[x,y,w,hh]}
    try:
        r=Polygon(d['pts']).buffer(0).representative_point(); d['rp']=[r.x,r.y]
    except Exception: d['rp']=[x+w/2,y+hh/2]
    out.append(d)
print(len(out)); json.dump(out,open('sym_cands.json','w'))
