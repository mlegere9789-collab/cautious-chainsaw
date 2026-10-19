import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
def gray(p,s=0.5):
    im=Image.open(p).convert('L'); im=im.resize((int(im.size[0]*s),int(im.size[1]*s)),Image.LANCZOS)
    a=np.array(im); return cv2.createCLAHE(2.0,(8,8)).apply(a)
s=0.5
A=gray('../maps/scans/cw0325000a.jp2',s); C=gray('../maps/scans/cw0325000c.jp2',s)
sift=cv2.SIFT_create(nfeatures=40000)
ka,da=sift.detectAndCompute(A,None); kc,dc=sift.detectAndCompute(C,None)
print(len(ka),len(kc))
bf=cv2.BFMatcher(); m=bf.knnMatch(dc,da,k=2)
good=[a for a,b in m if a.distance<0.75*b.distance]
print(len(good))
src=np.float32([kc[g.queryIdx].pt for g in good])/s   # c px full-res
dst=np.float32([ka[g.trainIdx].pt for g in good])/s   # a px
H,mask=cv2.findHomography(src,dst,cv2.RANSAC,6.0)
print(H, mask.sum())
np.save('mapwork/H_c2a.npy',H)
res=cv2.perspectiveTransform(src[mask.ravel()==1][None],H)[0]-dst[mask.ravel()==1]
print(np.median(np.linalg.norm(res,axis=1)), np.percentile(np.linalg.norm(res,axis=1),90))
