import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
im=np.array(Image.open('../maps/scans/cw0325000a.jp2').convert('RGB'))
r,g,b=[im[...,i].astype(np.int16) for i in range(3)]
dark=((r<115)&(g<110)&(b<110)&((b-r)<30)).astype(np.uint8)
np.save('mapwork/dark.npy',dark)
k5=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5))
op=cv2.morphologyEx(dark*255,cv2.MORPH_OPEN,k5)
n,lab,st,cen=cv2.connectedComponentsWithStats(op,connectivity=8)
# ring density using integral image of dark
ii=cv2.integral(dark)
def box(x0,y0,x1,y1):
    x0=max(0,x0);y0=max(0,y0);x1=min(dark.shape[1],x1);y1=min(dark.shape[0],y1)
    return ii[y1,x1]-ii[y0,x1]-ii[y1,x0]+ii[y0,x0]
rows=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<35 or w>34 or h>34 or w<5 or h<5: continue
    fill=a/(w*h)
    if fill<0.5: continue
    asp=max(w/h,h/w)
    if asp>2.6: continue
    pad=8
    outer=box(x-pad,y-pad,x+w+pad,y+h+pad)
    inner=box(x-1,y-1,x+w+1,y+h+1)
    ring=(outer-inner)/float((w+2*pad)*(h+2*pad)-(w+2)*(h+2))
    rows.append((float(cen[i][0]),float(cen[i][1]),int(w),int(h),int(a),round(float(ring),3)))
print(len(rows))
json.dump(rows,open('mapwork/det.json','w'))
