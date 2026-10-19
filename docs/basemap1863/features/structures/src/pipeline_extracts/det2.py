import numpy as np, cv2, json
dark=np.load('mapwork/dark.npy')
dt=cv2.distanceTransform(dark,cv2.DIST_L2,5)
core=(dt>=3.0).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(core,connectivity=8)
rows=[]
for i in range(1,n):
    x,y,w,h,a=st[i]
    if a<6: continue
    # extent of full dark blob around core: use dt max
    m=dt[y:y+h,x:x+w][lab[y:y+h,x:x+w]==i].max()
    rows.append((float(cen[i][0]),float(cen[i][1]),int(w),int(h),int(a),round(float(m),1)))
print(len(rows))
json.dump(rows,open('mapwork/det2.json','w'))
