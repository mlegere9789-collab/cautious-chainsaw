import json, sys, numpy as np
from PIL import Image, ImageDraw
Image.MAX_IMAGE_PIXELS=None
_im=None
def rev(x0,y0,x1,y1,out,cands,scale=0.8,step=100,minarea=4000,extra=None):
    global _im
    if _im is None: _im=Image.open('warren_full_gray.png').convert('RGB')
    c=_im.crop((x0,y0,x1,y1)).resize((int((x1-x0)*scale),int((y1-y0)*scale)),Image.LANCZOS)
    ov=Image.new('RGBA',c.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
    gx=(x0//step+1)*step
    while gx<x1:
        X=(gx-x0)*scale; d.line([(X,0),(X,c.size[1])],fill=(255,0,0,45),width=1); d.text((X+2,2),str(gx),fill=(255,0,0,255)); gx+=step
    gy=(y0//step+1)*step
    while gy<y1:
        Y=(gy-y0)*scale; d.line([(0,Y),(c.size[0],Y)],fill=(255,0,0,45),width=1); d.text((2,Y+2),str(gy),fill=(255,0,0,255)); gy+=step
    for cd in cands:
        if cd['area']<minarea: continue
        bx,by,bw,bh=cd['bbox']
        if bx>x1 or by>y1 or bx+bw<x0 or by+bh<y0: continue
        pts=[((x-x0)*scale,(y-y0)*scale) for x,y in cd['pts'][::max(1,len(cd['pts'])//80)]]
        col={'B':(0,150,0,255),'S':(255,0,200,255)}.get(cd['id'][0],(0,90,255,255))
        d.line(pts+[pts[0]],fill=col,width=2)
        for h in cd.get('holes',[]):
            hp=[((x-x0)*scale,(y-y0)*scale) for x,y in h[::max(1,len(h)//40)]]
            d.line(hp+[hp[0]],fill=(255,0,0,255),width=1)
        p=np.array(cd['pts']); cx,cy=p.mean(axis=0)
        # label inside polygon-ish: use centroid of bbox
        cx,cy=cd['rp']
        try:
            from shapely.geometry import Polygon, box as sbox
            ip=Polygon(cd['pts']).buffer(0).intersection(sbox(x0+10,y0+10,x1-10,y1-10))
            if not ip.is_empty:
                rp=ip.representative_point(); cx,cy=rp.x,rp.y
        except Exception: pass
        lx,ly=(cx-x0)*scale,(cy-y0)*scale
        if 0<lx<c.size[0] and 0<ly<c.size[1]:
            d.rectangle([lx-2,ly-2,lx+36,ly+10],fill=(255,255,255,200)); d.text((lx,ly-1),(cd["id"][0]+cd["id"][1:].lstrip("0") if cd["id"][0] in "BS" else "C"+cd["id"][2:]),fill=(0,0,255,255))
    if extra:
        for e in extra:
            pts=[((x-x0)*scale,(y-y0)*scale) for x,y in e['pts']]
            d.line(pts+[pts[0]],fill=(255,0,255,255),width=2)
    Image.alpha_composite(c.convert('RGBA'),ov).convert('RGB').save(out)
if __name__=='__main__':
    a=sys.argv[1:]
    cands=json.load(open('auto_core.json'))+json.load(open('auto_c2.json'))+json.load(open('sym_cands.json'))
    rev(int(a[0]),int(a[1]),int(a[2]),int(a[3]),a[4],cands,minarea=int(a[5]) if len(a)>5 else 4000)
