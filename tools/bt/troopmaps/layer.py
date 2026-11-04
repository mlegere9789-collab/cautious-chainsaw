"""layer.py sheet red|blue|both cx cy w h scale out.png : view of the scan with one ink colour isolated (map linework suppressed) for reading unit labels; tick grid every 100 scan px."""
import sys, cv2, os, numpy as np
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS']=str(2**40)
sheet, mode, cx, cy, w, h = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
im=cv2.imread(os.path.join(ROOT,'tmp','troopmaps',f'full_{sheet}.png')); H,W=im.shape[:2]
x0=max(0,cx-w//2); y0=max(0,cy-h//2); x1=min(W,x0+w); y1=min(H,y0+h)
c=im[y0:y1,x0:x1].astype(int); b,g,r=c[:,:,0],c[:,:,1],c[:,:,2]
base=float(np.median(r-np.maximum(g,b))); off=base+26
red=np.clip((r-np.maximum(g,b)-off)*3,0,255); blue=np.clip((b-r-8)*6,0,255)
dark=np.clip(255-np.maximum(r,np.maximum(g,b))*1.0,0,255)  # not used
out_img=np.full(c.shape,255,np.uint8)
if mode in('red','both'): out_img[:,:,0]=np.minimum(out_img[:,:,0],255-red); out_img[:,:,1]=np.minimum(out_img[:,:,1],255-red); 
if mode in('blue','both'): out_img[:,:,2]=np.minimum(out_img[:,:,2],255-blue); out_img[:,:,1]=np.minimum(out_img[:,:,1],255-blue)
# faint black linework for orientation
gray=cv2.cvtColor(c.astype(np.uint8),cv2.COLOR_BGR2GRAY); ink=(gray<90)&(red<40)&(blue<40)
out_img[ink]=np.minimum(out_img[ink],200)
if sc!=1: out_img=cv2.resize(out_img,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for gx in range((x0//100+1)*100,x1,100):
    X=int((gx-x0)*sc); cv2.line(out_img,(X,0),(X,8),(0,0,0),1); cv2.putText(out_img,str(gx),(X+2,18),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),1)
for gy in range((y0//100+1)*100,y1,100):
    Y=int((gy-y0)*sc); cv2.line(out_img,(0,Y),(8,Y),(0,0,0),1); cv2.putText(out_img,str(gy),(10,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),1)
cv2.imwrite(out,out_img); print(out,x0,y0,x1,y1,sc)
