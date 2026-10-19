import numpy as np, cv2, sys, json
from PIL import Image
sys.path.insert(0,'scripts')
from sym import symbols
Image.MAX_IMAGE_PIXELS=None
cv2.setNumThreads(2)
def glyph_pts(g):
    ink,sym=symbols(g)
    n,lab,st,cen=cv2.connectedComponentsWithStats(sym,connectivity=8)
    out=[]
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if 18<=a<=160 and max(w,h)<=20 and max(w,h)/max(1,min(w,h))<=2.4 and a/(w*h)>=0.22:
            out.append((float(cen[i][0]),float(cen[i][1])))
    return out
if __name__=='__main__':
    x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]
    g=np.array(Image.open('warren_full_gray.png'))[y0:y1,x0:x1]
    pts=glyph_pts(g); print(len(pts))
    c=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)
    for x,y in pts: cv2.circle(c,(int(x),int(y)),8,(0,0,255),2)
    cv2.imwrite(sys.argv[5],cv2.resize(c,None,fx=1.5,fy=1.5))
