"""layer_batch.py sheet scale w h outdir cx,cy [cx,cy ...] : several ink-layer tiles with one image load (name <outdir>/Z<sheet>_<cx>_<cy>.png)."""
import sys, os, numpy as np, cv2
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS']=str(2**40)
sheet, sc, w, h, outdir = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
im=cv2.imread(os.path.join(ROOT,'tmp','troopmaps',f'full_{sheet}.png')); H,W=im.shape[:2]
os.makedirs(outdir,exist_ok=True)
for a in sys.argv[6:]:
    cx,cy=map(int,a.split(','))
    x0=max(0,cx-w//2); y0=max(0,cy-h//2); x1=min(W,x0+w); y1=min(H,y0+h)
    c=im[y0:y1,x0:x1].astype(int); b,g,r=c[:,:,0],c[:,:,1],c[:,:,2]
    base=float(np.median(r-np.maximum(g,b))); red=np.clip((r-np.maximum(g,b)-(base+26))*3,0,255); blue=np.clip((b-r-8)*6,0,255)
    o=np.full(c.shape,255,np.uint8); o[:,:,0]=np.minimum(o[:,:,0],255-red); o[:,:,1]=np.minimum(o[:,:,1],255-red); o[:,:,2]=np.minimum(o[:,:,2],255-blue); o[:,:,1]=np.minimum(o[:,:,1],255-blue)
    gray=cv2.cvtColor(c.astype(np.uint8),cv2.COLOR_BGR2GRAY); ink=(gray<90)&(red<40)&(blue<40); o[ink]=np.minimum(o[ink],200)
    o=cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for gx in range((x0//50+1)*50,x1,50):
        X=int((gx-x0)*sc); cv2.line(o,(X,0),(X,8),(0,0,0),1)
        if gx%100==0: cv2.putText(o,str(gx),(X+2,18),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),1)
    for gy in range((y0//50+1)*50,y1,50):
        Y=int((gy-y0)*sc); cv2.line(o,(0,Y),(8,Y),(0,0,0),1)
        if gy%100==0: cv2.putText(o,str(gy),(10,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,0),1)
    cv2.imwrite(os.path.join(outdir,f'Z{sheet}_{cx}_{cy}.png'),o)
print('ok')
