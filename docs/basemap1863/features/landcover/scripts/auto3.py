import numpy as np, cv2, json
cv2.setNumThreads(2)
M=np.load('auto_mask.npy')
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(41,41))
core=cv2.morphologyEx(M,cv2.MORPH_OPEN,k)
# geodesic reconstruction limited to 14 px growth
k2=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7))
rec=core.copy()
for _ in range(3):
    rec=cv2.dilate(rec,k2)&M
rec=cv2.morphologyEx(rec,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
# fill small holes
inv=1-rec
n,lab,st,_=cv2.connectedComponentsWithStats(inv,connectivity=4)
small=np.zeros(n,bool); small[1:]=st[1:,cv2.CC_STAT_AREA]<1500
rec[small[lab]]=1
np.save('auto_core.npy',rec)
cs,hier=cv2.findContours(rec,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE); hier=hier[0]
out=[]; idx={}
for i,c in enumerate(cs):
    if hier[i][3]==-1:
        a=cv2.contourArea(c)
        if a<3000: continue
        idx[i]=len(out); out.append({'id':'B%03d'%len(out),'pts':c[:,0,:].tolist(),'holes':[],'area_outer':a})
for i,c in enumerate(cs):
    if hier[i][3]!=-1 and hier[i][3] in idx and cv2.contourArea(c)>1500: out[idx[hier[i][3]]]['holes'].append(c[:,0,:].tolist())
for o in out:
    o['area']=o['area_outer']-sum(cv2.contourArea(np.array(h,np.int32)) for h in o['holes'])
    x,y,w,h=cv2.boundingRect(np.array(o['pts'],np.int32)); o['bbox']=[x,y,w,h]
print(len(out)); json.dump(out,open('auto_core.json','w'))
