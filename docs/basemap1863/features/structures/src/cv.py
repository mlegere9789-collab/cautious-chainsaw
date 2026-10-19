import sys,json,numpy as np, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageDraw, ImageFont
Image.MAX_IMAGE_PIXELS=None
sys.path.insert(0,'.')
import gcp
from geo import *
SRC='../maps/scans/cw0325000a.jp2'
_ims={}
def get(src=None):
    src=src or SRC
    if src not in _ims: _ims[src]=Image.open(src).convert('RGB')
    return _ims[src]
try:
    FONT=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',13)
except Exception:
    FONT=None
DET=json.load(open('mapwork/det2.json'))
DA=np.array(DET)
_C=None
def cents():
    global _C
    if _C is None:
        import cty
        cb=cty.load(); _C=np.array([[g.centroid.x,g.centroid.y,g.area] for i,g,p in cb])
    return _C
def view(cx,cy,out,half=170,scale=2.6,grid=50,src=None,crosses=True,minarea=30,smooth=2e3,shift=(0,0)):
    x0=int(cx-half);y0=int(cy-half)
    im=get(src).crop((x0,y0,x0+2*half,y0+2*half)).resize((int(2*half*scale),int(2*half*scale)),Image.LANCZOS)
    d=ImageDraw.Draw(im)
    for gx in range((x0//grid+1)*grid,x0+2*half,grid):
        X=(gx-x0)*scale; d.line([(X,0),(X,im.size[1])],fill=(255,205,205),width=1); d.text((X+2,2),str(gx),fill=(200,0,0))
    for gy in range((y0//grid+1)*grid,y0+2*half,grid):
        Y=(gy-y0)*scale; d.line([(0,Y),(im.size[0],Y)],fill=(255,205,205),width=1); d.text((2,Y+2),str(gy),fill=(200,0,0))
    m=(DA[:,0]>=x0)&(DA[:,0]<x0+2*half)&(DA[:,1]>=y0)&(DA[:,1]<y0+2*half)
    for i in np.where(m)[0]:
        cx_,cy_,bw,bh,a,mm=DET[i]
        X=(cx_-x0)*scale;Y=(cy_-y0)*scale; r=max(bw,bh)*scale/2+3
        d.rectangle([X-r,Y-r,X+r,Y+r],outline=(0,150,0),width=1)
        d.text((X-r-2,Y-r-15),str(i),fill=(0,100,0),font=FONT)
    if crosses:
        f,inv,_=gcp.fit(smooth=smooth); C=cents(); mk=C[:,2]>=minarea
        P=f(C[mk,0],C[mk,1]); idx=np.where(mk)[0]
        for (px,py),i in zip(P,idx):
            px+=shift[0];py+=shift[1]
            X=(px-x0)*scale;Y=(py-y0)*scale
            if 0<=X<im.size[0] and 0<=Y<im.size[1]:
                d.line([(X-6,Y),(X+6,Y)],fill=(0,0,255),width=1);d.line([(X,Y-6),(X,Y+6)],fill=(0,0,255),width=1)
                d.text((X+7,Y+2),f"c{i}",fill=(0,0,255),font=FONT)
    im.save(out)
if __name__=='__main__':
    a=sys.argv; view(float(a[1]),float(a[2]),a[3])
