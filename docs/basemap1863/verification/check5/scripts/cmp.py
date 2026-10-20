import sys,glob,os,json,cv2,numpy as np
sys.path.insert(0,'.')
import rephoto as R
def crop_photo(path,box):
    im=cv2.imread(path); x0,y0,x1,y1=box; return im[y0:y1,x0:x1]
CLR=0.0
STACK=False
def shot(path,box,cam,out,W=720,layers=('recon','naip'),label=''):
    ph=crop_photo(path,box); h,w=ph.shape[:2]; H=int(round(W*h/w))
    E,N,hag,yaw,pitch,hfov=cam[:6]; roll=cam[6] if len(cam)>6 else 0.0
    ims=[cv2.resize(ph,(W,H),interpolation=cv2.INTER_AREA)]
    for ly in layers:
        img,d,cl=R.render(E,N,hag,yaw,pitch,hfov,W=W,H=H,layer=ly,roll=roll,use_ext=(ly=='recon'),clear_r=CLR)
        ims.append(img)
    comp=np.vstack(ims) if STACK else np.hstack(ims)
    cv2.imwrite(out,comp)
    return comp

def sheet(path,box,cams,out,W=360,labels=None,layer='recon',cols=3):
    ph=crop_photo(path,box); h,w=ph.shape[:2]; H=int(round(W*h/w))
    ims=[cv2.resize(ph,(W,H),interpolation=cv2.INTER_AREA)]
    for k,cam in enumerate(cams):
        E,N,hag,yaw,pitch,hfov=cam[:6]
        img,d,cl=R.render(E,N,hag,yaw,pitch,hfov,W=W,H=H,layer=layer,use_ext=(layer=='recon'),clear_r=CLR)
        if labels: cv2.putText(img,labels[k],(5,18),0,0.5,(0,0,0),1)
        ims.append(img)
    while len(ims)%cols: ims.append(np.full_like(ims[0],255))
    rows=[np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]
    cv2.imwrite(out,np.vstack(rows))
