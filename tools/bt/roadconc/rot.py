import os,sys
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS']=str(2**40)
import cv2,numpy as np
scan,cx,cy,w,h,ang,sc,out=sys.argv[1],float(sys.argv[2]),float(sys.argv[3]),int(sys.argv[4]),int(sys.argv[5]),float(sys.argv[6]),float(sys.argv[7]),sys.argv[8]
im=cv2.imread(scan,cv2.IMREAD_COLOR)
M=cv2.getRotationMatrix2D((cx,cy),ang,sc)   # angle>0 = counterclockwise
M[0,2]+=w/2-cx; M[1,2]+=h/2-cy
c=cv2.warpAffine(im,M,(w,h),flags=cv2.INTER_CUBIC,borderValue=(255,255,255))
cv2.imwrite(out,c);print(c.shape)
