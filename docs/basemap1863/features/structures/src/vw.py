import sys,json,numpy as np, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
from geo import *
import cty, gcp
SRC='../maps/scans/cw0325000a.jp2'
_ims={}
def get(src=None):
    src=src or SRC
    if src not in _ims: _ims[src]=Image.open(src).convert('RGB')
    return _ims[src]
_C=None
def cents():
    global _C
    if _C is None:
        cb=cty.load(); _C=np.array([[g.centroid.x,g.centroid.y,g.area] for i,g,p in cb])
    return _C
def view(lon=None,lat=None,out='mapwork/v.png',cx=None,cy=None,half=300,scale=2,grid=50,minarea=40,smooth=1e4,extra=None,src=None):
    f,inv,_=gcp.fit(smooth=smooth)
    if cx is None:
        cx,cy=f(*ll2m(lon,lat))[0]
    x0=int(cx-half);y0=int(cy-half)
    im=get(src).crop((x0,y0,x0+2*half,y0+2*half)).resize((int(2*half*scale),int(2*half*scale)),Image.LANCZOS)
    d=ImageDraw.Draw(im)
    for gx in range((x0//grid+1)*grid,x0+2*half,grid):
        X=(gx-x0)*scale; d.line([(X,0),(X,im.size[1])],fill=(255,190,190),width=1); d.text((X+2,2),str(gx),fill=(200,0,0))
    for gy in range((y0//grid+1)*grid,y0+2*half,grid):
        Y=(gy-y0)*scale; d.line([(0,Y),(im.size[0],Y)],fill=(255,190,190),width=1); d.text((2,Y+2),str(gy),fill=(200,0,0))
    C=cents(); m=C[:,2]>=minarea
    P=f(C[m,0],C[m,1]); idx=np.where(m)[0]
    for (px,py),i in zip(P,idx):
        X=(px-x0)*scale;Y=(py-y0)*scale
        if 0<=X<im.size[0] and 0<=Y<im.size[1]:
            d.line([(X-6,Y),(X+6,Y)],fill=(0,0,255),width=1);d.line([(X,Y-6),(X,Y+6)],fill=(0,0,255),width=1)
            d.text((X+7,Y-5),f"{i}:{int(C[i,2])}",fill=(0,0,255))
    for (n,lo,la) in (extra or []):
        px,py=f(*ll2m(lo,la))[0]; X=(px-x0)*scale;Y=(py-y0)*scale
        d.ellipse([X-8,Y-8,X+8,Y+8],outline=(0,150,0),width=2); d.text((X+9,Y+3),n,fill=(0,120,0))
    im.save(out); return x0,y0
if __name__=='__main__':
    a=sys.argv
    view(float(a[1]),float(a[2]),a[3])
