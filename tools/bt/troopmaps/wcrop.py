"""wcrop.py e0 n0 e1 n1 out.png [scale] : crop of the georeferenced Warren 1869 raster (3 m/px preview tmp/troopmaps/warren_3m.png) with E/N ticks every 500 m (UTM 18N)."""
import sys, cv2, os
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
e0,n0,e1,n1=map(float,sys.argv[1:5]); out=sys.argv[5]; sc=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
im=cv2.imread(os.path.join(ROOT,'tmp','troopmaps','warren_3m.png'))
E0,N1,f=301750.0,4415750.0,3.0
x0,x1=int((e0-E0)/f),int((e1-E0)/f); y0,y1=int((N1-n1)/f),int((N1-n0)/f)
c=im[y0:y1,x0:x1].copy()
if sc!=1: c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
import math
for e in range(int(math.ceil(e0/250)*250),int(e1),250):
    X=int((e-e0)/f*sc); cv2.line(c,(X,0),(X,12),(0,0,255),1); cv2.putText(c,str(e),(X+2,24),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
for n in range(int(math.ceil(n0/250)*250),int(n1),250):
    Y=int((n1-n)/f*sc); cv2.line(c,(0,Y),(12,Y),(0,0,255),1); cv2.putText(c,str(n),(14,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
cv2.imwrite(out,c); print(out,c.shape)
