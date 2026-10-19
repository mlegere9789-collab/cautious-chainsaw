import json, sys
from PIL import Image, ImageDraw
from shapely import wkt
Image.MAX_IMAGE_PIXELS=None
a=json.load(open(sys.argv[1] if len(sys.argv)>1 else 'assembled_px.json'))
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; sc=float(sys.argv[6]); out=sys.argv[7]
im=Image.open('warren_full_gray.png').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize((int((x1-x0)*sc),int((y1-y0)*sc)),Image.LANCZOS)
ov=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
cols={'woods':(0,200,0),'orchards':(255,140,0),'marsh':(0,120,255),'scatter':(180,0,255)}
def polys(g):
    return [g] if g.geom_type=='Polygon' else [x for x in g.geoms if x.geom_type=='Polygon']
for k,c in cols.items():
    for n,w in a.get(k,[]):
        for p in polys(wkt.loads(w)):
            pts=[((x-x0)*sc,(y-y0)*sc) for x,y in p.exterior.coords]
            d.polygon(pts,fill=c+(70,)); d.line(pts,fill=c+(255,),width=1)
Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB').save(out)
