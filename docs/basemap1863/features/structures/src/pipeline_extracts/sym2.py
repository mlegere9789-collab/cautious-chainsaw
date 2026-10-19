import numpy as np, cv2, json, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
# Building-symbol candidates: solid dark squares (opened by 5x5 ellipse), from the clean Warren plate (sheet d warped to a-frame)
def extract(src,out,minA=22,maxA=700,fillmin=0.55):
    im=np.array(Image.open(src).convert('RGB'))
    r,g,b=[im[...,i].astype(np.int16) for i in range(3)]
    dark=((r<118)&(g<112)&(b<112)&((b-r)<35)).astype(np.uint8)*255
    k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
    op=cv2.morphologyEx(dark,cv2.MORPH_OPEN,k)
    n,lab,st,cen=cv2.connectedComponentsWithStats(op,connectivity=8)
    rows=[]
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<minA or a>maxA or w>36 or h>36: continue
        fill=a/(w*h)
        if fill<fillmin: continue
        if max(w/h,h/w)>2.6: continue
        # connectivity of the ORIGINAL dark blob around (to reject squares fused to long lines): ratio of dark pixels in a 4px ring
        pad=5
        x0,y0,x1,y1=max(0,x-pad),max(0,y-pad),x+w+pad,y+h+pad
        ring=dark[y0:y1,x0:x1]>0
        ring_cnt=ring.sum()-a
        rows.append((float(cen[i][0]),float(cen[i][1]),int(w),int(h),int(a),round(float(ring_cnt)/max(1,(x1-x0)*(y1-y0)-w*h),3)))
    json.dump(rows,open(out,'w')); print(len(rows))
if __name__=='__main__': extract(sys.argv[1],sys.argv[2])
