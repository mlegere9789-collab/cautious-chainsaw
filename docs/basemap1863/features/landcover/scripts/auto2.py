import numpy as np, cv2, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
cv2.setNumThreads(2)
def features(g, sig=8, tsig=10):
    bg=cv2.GaussianBlur(g,(0,0),30).astype(np.float32)
    ink=((bg-g.astype(np.float32))>35).astype(np.float32)
    dens=cv2.GaussianBlur(ink,(0,0),sig)
    gb=cv2.GaussianBlur(g.astype(np.float32),(0,0),1.5)
    gx=cv2.Sobel(gb,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(gb,cv2.CV_32F,0,1,ksize=3)
    jxx=cv2.GaussianBlur(gx*gx,(0,0),tsig); jyy=cv2.GaussianBlur(gy*gy,(0,0),tsig); jxy=cv2.GaussianBlur(gx*gy,(0,0),tsig)
    tr=jxx+jyy+1e-6; det=np.sqrt((jxx-jyy)**2+4*jxy**2)
    coh=det/tr
    return ink,dens,coh
if __name__=='__main__':
    x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]; T=float(sys.argv[5]); C=float(sys.argv[6])
    g=np.array(Image.open('warren_full_gray.png'))[y0:y1,x0:x1]
    ink,dens,coh=features(g)
    m=((dens>T)&(coh<C)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((11,11),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    c=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)
    cv2.drawContours(c,cs,-1,(0,200,0),2)
    print(len(cs),np.percentile(coh,[10,50,90]))
    c=cv2.resize(c,None,fx=0.8,fy=0.8,interpolation=cv2.INTER_AREA)
    cv2.imwrite(sys.argv[7],c)
