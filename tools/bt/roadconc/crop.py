import os,sys
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS']=str(2**40)
import cv2
# usage: crop.py scan x0 y0 w h scale out
scan,x0,y0,w,h,sc,out=sys.argv[1],int(sys.argv[2]),int(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),float(sys.argv[6]),sys.argv[7]
cache='tmp/roadconc/_'+os.path.basename(scan)+'.png'
im=cv2.imread(scan,cv2.IMREAD_COLOR)
c=im[y0:y0+h,x0:x0+w]
if sc!=1: c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
# ticks every 100 px of scan
step=int(sys.argv[8]) if len(sys.argv)>8 else 200
for gx in range((x0//step+1)*step,x0+w,step):
    X=int((gx-x0)*sc);cv2.line(c,(X,0),(X,12),(0,0,255),1);cv2.putText(c,str(gx),(X+2,24),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
for gy in range((y0//step+1)*step,y0+h,step):
    Y=int((gy-y0)*sc);cv2.line(c,(0,Y),(12,Y),(0,0,255),1);cv2.putText(c,str(gy),(14,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
cv2.imwrite(out,c);print(c.shape)
