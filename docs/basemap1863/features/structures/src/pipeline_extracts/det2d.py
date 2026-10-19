import numpy as np, cv2, json
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
im=np.array(Image.open('mapwork/d_in_a.jpg').convert('RGB'))
r,g,b=[im[...,i].astype(np.int16) for i in range(3)]
white=(r>250)&(g>250)&(b>250)
dark=((r<115)&(g<110)&(b<110)&((b-r)<30)&(~white)).astype(np.uint8)
dt=cv2.distanceTransform(dark,cv2.DIST_L2,5)
core=(dt>=3.0).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(core,connectivity=8)
rows=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<6: continue
    m=dt[y:y+h,x:x+w][lab[y:y+h,x:x+w]==i].max()
    rows.append((float(cen[i][0]),float(cen[i][1]),int(w),int(h),int(a),round(float(m),1)))
print(len(rows)); json.dump(rows,open('mapwork/det2d.json','w'))
