import numpy as np, cv2, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
cv2.setNumThreads(2)
def symbols(g):
    bg=cv2.GaussianBlur(g,(0,0),30).astype(np.float32)
    ink=((bg-g.astype(np.float32))>35).astype(np.uint8)
    # thin lines: remove by opening with line kernels (length 21)
    L=25; lines=np.zeros_like(ink)
    for ang in range(0,180,10):
        k=np.zeros((L,L),np.uint8); c=L//2
        dx=np.cos(np.deg2rad(ang)); dy=np.sin(np.deg2rad(ang))
        cv2.line(k,(int(round(c-dx*c)),int(round(c-dy*c))),(int(round(c+dx*c)),int(round(c+dy*c))),1,1)
        lines|=cv2.morphologyEx(ink,cv2.MORPH_OPEN,k)
    lines=cv2.dilate(lines,np.ones((3,3),np.uint8))
    sym=ink&(1-lines)
    return ink,sym
if __name__=='__main__':
    x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]
    g=np.array(Image.open('warren_full_gray.png'))[y0:y1,x0:x1]
    ink,sym=symbols(g)
    dens=cv2.GaussianBlur(sym.astype(np.float32),(0,0),12)
    print(np.percentile(dens,[10,50,90]))
    T=float(sys.argv[5])
    m=(dens>T).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(25,25)))
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(21,21)))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    c=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR); c2=c.copy(); c2[sym>0]=(0,0,255)
    cv2.drawContours(c,cs,-1,(0,200,0),3)
    out=np.hstack([c2,c]); out=cv2.resize(out,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
    cv2.imwrite(sys.argv[6],out)
