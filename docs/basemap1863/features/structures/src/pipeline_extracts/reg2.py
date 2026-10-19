import numpy as np, cv2, sys
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
src,out=sys.argv[1],sys.argv[2]
s=0.5
def gray(p,s):
    im=Image.open(p).convert('L'); im=im.resize((int(im.size[0]*s),int(im.size[1]*s)),Image.LANCZOS)
    a=np.array(im); return cv2.createCLAHE(2.0,(8,8)).apply(a)
A=gray('../maps/scans/cw0325000a.jp2',s); D=gray(src,s*0.74)
sift=cv2.SIFT_create(nfeatures=40000)
ka,da=sift.detectAndCompute(A,None); kd,dd=sift.detectAndCompute(D,None)
bf=cv2.BFMatcher(); m=bf.knnMatch(dd,da,k=2)
good=[a for a,b in m if a.distance<0.75*b.distance]
src_pts=np.float32([kd[g.queryIdx].pt for g in good])/(s*0.74)
dst_pts=np.float32([ka[g.trainIdx].pt for g in good])/s
H,mask=cv2.findHomography(src_pts,dst_pts,cv2.RANSAC,8.0)
print(len(good),mask.sum())
res=cv2.perspectiveTransform(src_pts[mask.ravel()==1][None],H)[0]-dst_pts[mask.ravel()==1]
print(np.median(np.linalg.norm(res,axis=1)),np.percentile(np.linalg.norm(res,axis=1),90))
np.save(out+'.npy',H)
Dm=np.array(Image.open(src).convert('RGB'))
W=cv2.warpPerspective(Dm,H,(8292,10756),flags=cv2.INTER_CUBIC,borderValue=(255,255,255))
Image.fromarray(W).save(out+'.jpg',quality=92)
