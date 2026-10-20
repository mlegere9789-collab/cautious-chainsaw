import sys,os,math,json,cv2,numpy as np
sys.path.insert(0,'.')
import rephoto as R, topo
from cases import CASES
OUT='C:/Users/mlege/gettysburg-map/docs/basemap1863/verification/check5/'
os.makedirs(OUT,exist_ok=True)
def band(w,lines,h=22):
    b=np.full((h*len(lines)+4,w,3),255,np.uint8)
    for i,t in enumerate(lines): cv2.putText(b,t,(6,16+h*i),cv2.FONT_HERSHEY_SIMPLEX,0.5,(0,0,0),1,cv2.LINE_AA)
    return b
def build(c,W=520,only=None):
    if c['pose'] is None: return None
    ph=cv2.imread('photos/'+c['img']); x0,y0,x1,y1=c['box']; ph=ph[y0:y1,x0:x1]; h,w=ph.shape[:2]
    asp=w/h; H=int(round(W*h/w)); E,N,hag,yaw,pitch,hf=c['pose']
    ims=[cv2.resize(ph,(W,H),interpolation=cv2.INTER_AREA)]
    rec,d,cl=R.render(E,N,hag,yaw,pitch,hf,W=W,H=H,layer='recon',use_ext=True,clear_r=35)
    base,d2,_=R.render(E,N,hag,yaw,pitch,hf,W=W,H=H,layer='naip',use_ext=True,ext_key='ext_base',clear_r=35)
    ims+= [rec,base]
    for im,t in zip(ims,('1863 photograph (Library of Congress, public domain)','reconstruction tiles + catalogue extrusions','2013 NAIP base photo, modern canopy extruded by the same rule')):
        cv2.rectangle(im,(0,0),(W,18),(255,255,255),-1); cv2.putText(im,t,(4,13),cv2.FONT_HERSHEY_SIMPLEX,0.42,(0,0,0),1,cv2.LINE_AA)
    comp=np.vstack(ims) if asp>2.2 else np.hstack(ims)
    cap=band(comp.shape[1],[f"{c['id']}  LoC {c['loc']}  tier {c['tier']}  pose E{E:.0f} N{N:.0f} h{hag:.1f} yaw{yaw:.1f} pitch{pitch:.1f} hfov{hf:.1f}",c['title'][:150]],h=20)
    cv2.imwrite(OUT+c['id']+'-pair.jpg',np.vstack([cap,comp]),[cv2.IMWRITE_JPEG_QUALITY,82])
    # map
    sc=2.0; R_=260
    E0,E1,N0,N1=E-R_,E+R_,N-R_,N+R_
    a=topo.crop(E0,N0,E1,N1,'recon',sc); b=topo.crop(E0,N0,E1,N1,'naip',sc,contour=False)
    for im in (a,b):
        topo.wedge(im,E0,N1,E,N,yaw,hf,R_*0.95,sc); topo.pt(im,E0,N1,E,N,sc)
    cv2.rectangle(a,(0,0),(a.shape[1],18),(255,255,255),-1); cv2.putText(a,'reconstruction (yellow=canopy kept, red=structures, blue=fences)',(4,13),cv2.FONT_HERSHEY_SIMPLEX,0.42,(0,0,0),1,cv2.LINE_AA)
    cv2.rectangle(b,(0,0),(b.shape[1],18),(255,255,255),-1); cv2.putText(b,'2013 NAIP, 520 m square, north up; red dot = camera',(4,13),cv2.FONT_HERSHEY_SIMPLEX,0.42,(0,0,0),1,cv2.LINE_AA)
    cv2.imwrite(OUT+c['id']+'-map.jpg',np.hstack([a,b]),[cv2.IMWRITE_JPEG_QUALITY,80])
if __name__=='__main__':
    ids=sys.argv[1:]
    for c in CASES:
        if ids and c['id'] not in ids: continue
        build(c); print('built',c['id'],flush=True)
