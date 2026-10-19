import numpy as np, cv2, sys, math
X0,Y1=304500,4413500
rec=np.load('scene/recon.npy',mmap_mode='r'); nai=np.load('scene/naip.npy',mmap_mode='r'); cls=np.load('scene/cls.npy',mmap_mode='r'); dem=np.load('scene/dem.npy',mmap_mode='r')
def crop(E0,N0,E1,N1,layer='recon',scale=2,cam=None,contour=True):
    r0=int(Y1-N1); r1=int(Y1-N0); c0=int(E0-X0); c1=int(E1-X0)
    if layer=='recon': im=np.ascontiguousarray(rec[r0:r1,c0:c1,:3])
    else: im=np.ascontiguousarray(nai[r0:r1,c0:c1,::-1])
    im=cv2.resize(im,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC)
    if contour:
        for k,col in ((1,(0,255,255)),(2,(255,0,255)),(4,(0,0,255)),(3,(255,128,0))):
            m=(np.asarray(cls[r0:r1,c0:c1])==k).astype(np.uint8); m=cv2.resize(m,None,fx=scale,fy=scale,interpolation=cv2.INTER_NEAREST)
            cs,_=cv2.findContours(m,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE); cv2.drawContours(im,cs,-1,col,1)
    return im
def pt(im,E0,N1,E,N,scale,col=(0,0,255),r=5):
    cv2.circle(im,(int((E-E0)*scale),int((N1-N)*scale)),r,col,-1)
def wedge(im,E0,N1,E,N,yaw,hfov,L,scale,col=(255,255,255)):
    for s in (-1,1):
        a=math.radians(yaw+s*hfov/2)
        cv2.line(im,(int((E-E0)*scale),int((N1-N)*scale)),(int((E+L*math.sin(a)-E0)*scale),int((N1-(N+L*math.cos(a)))*scale)),col,1)
    a=math.radians(yaw)
    cv2.line(im,(int((E-E0)*scale),int((N1-N)*scale)),(int((E+L*math.sin(a)-E0)*scale),int((N1-(N+L*math.cos(a)))*scale)),(0,255,0),1)
if __name__=='__main__':
    E0,N0,E1,N1=[float(v) for v in sys.argv[1:5]]; sc=float(sys.argv[5]); out=sys.argv[6]
    a=crop(E0,N0,E1,N1,'recon',sc); b=crop(E0,N0,E1,N1,'naip',sc,contour=False)
    cv2.imwrite(out,np.hstack([a,b]))
