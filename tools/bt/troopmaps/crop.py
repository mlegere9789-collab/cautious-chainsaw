"""crop.py sheet cx cy w h [scale] out.png : crop from full-res Bachelder scan (tmp/troopmaps/full_<sheet>.png) with a 100 px labelled tick grid."""
import sys, cv2, os
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS']=str(2**40)
sheet, cx, cy, w, h = sys.argv[1], *map(int, sys.argv[2:6]); scale=float(sys.argv[6]) if len(sys.argv)>7 else 1.0; out=sys.argv[-1]
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..','..'))
_cache={}
def load(s):
    if s not in _cache: _cache[s]=cv2.imread(os.path.join(ROOT,'tmp','troopmaps',f'full_{s}.png'))
    return _cache[s]
im=load(sheet); H,W=im.shape[:2]
x0=max(0,cx-w//2); y0=max(0,cy-h//2); x1=min(W,x0+w); y1=min(H,y0+h)
c=im[y0:y1,x0:x1].copy()
for gx in range((x0//100+1)*100,x1,100):
    cv2.line(c,(gx-x0,0),(gx-x0,8),(0,0,255),1); cv2.putText(c,str(gx),(gx-x0+2,18),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
for gy in range((y0//100+1)*100,y1,100):
    cv2.line(c,(0,gy-y0),(8,gy-y0),(0,0,255),1); cv2.putText(c,str(gy),(10,gy-y0+4),cv2.FONT_HERSHEY_SIMPLEX,0.4,(0,0,255),1)
if scale!=1.0: c=cv2.resize(c,None,fx=scale,fy=scale,interpolation=cv2.INTER_CUBIC if scale>1 else cv2.INTER_AREA)
cv2.imwrite(out,c); print(out,x0,y0,x1,y1)
