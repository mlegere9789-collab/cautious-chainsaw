import sys, json, os
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
_im=None
def tile(x0,y0,x1,y1,out,scale=0.8,step=100,polys=None):
    global _im
    if _im is None: _im=Image.open('warren_full_gray.png').convert('RGB')
    c=_im.crop((x0,y0,x1,y1)).resize((int((x1-x0)*scale),int((y1-y0)*scale)),Image.LANCZOS)
    ov=Image.new('RGBA',c.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
    gx=(x0//step+1)*step
    while gx<x1:
        X=(gx-x0)*scale; d.line([(X,0),(X,c.size[1])],fill=(255,0,0,70),width=1); d.text((X+2,2),str(gx),fill=(255,0,0,255)); d.text((X+2,c.size[1]-12),str(gx),fill=(255,0,0,255)); gx+=step
    gy=(y0//step+1)*step
    while gy<y1:
        Y=(gy-y0)*scale; d.line([(0,Y),(c.size[0],Y)],fill=(255,0,0,70),width=1); d.text((2,Y+2),str(gy),fill=(255,0,0,255)); d.text((c.size[0]-34,Y+2),str(gy),fill=(255,0,0,255)); gy+=step
    if polys:
        cols={'wood':(0,160,0,255),'orchard':(255,120,0,255),'other':(0,0,255,255)}
        for p in polys:
            pts=[((x-x0)*scale,(y-y0)*scale) for x,y in p['pts']]
            if len(pts)<2: continue
            d.line(pts+[pts[0]],fill=cols.get(p['cls'],(0,0,255,255)),width=2)
            cx=sum(a for a,b in pts)/len(pts); cy=sum(b for a,b in pts)/len(pts)
            if 0<cx<c.size[0] and 0<cy<c.size[1]: d.text((cx,cy),p['id'],fill=cols.get(p['cls'],(0,0,255,255)))
    c=Image.alpha_composite(c.convert('RGBA'),ov).convert('RGB'); c.save(out)
if __name__=='__main__':
    a=sys.argv[1:]
    polys=None
    if len(a)>7 and os.path.exists(a[7]):
        polys=json.load(open(a[7]))
    tile(int(a[0]),int(a[1]),int(a[2]),int(a[3]),a[4],float(a[5]),int(a[6]),polys)
