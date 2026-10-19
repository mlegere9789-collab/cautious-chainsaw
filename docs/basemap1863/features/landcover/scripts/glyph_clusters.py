import numpy as np, json, cv2, sys
from scipy.spatial import cKDTree
from scipy.sparse.csgraph import connected_components
from scipy.sparse import coo_matrix
from shapely.geometry import MultiPoint, Point, Polygon
from shapely.ops import unary_union
from shapely import wkt
pts=np.array(json.load(open('glyph_pts.json')))
# drop neatline/legend zone
ok=(pts[:,0]>360)&(pts[:,0]<8470)&(pts[:,1]>760)&(pts[:,1]<9480)
pts=pts[ok]
tree=cKDTree(pts); pairs=tree.query_pairs(48,output_type='ndarray')
n=len(pts); m=coo_matrix((np.ones(len(pairs)),(pairs[:,0],pairs[:,1])),shape=(n,n))
nc,lab=connected_components(m,directed=False)
cnt=np.bincount(lab)
a=json.load(open('assembled_px.json'))
cov=unary_union([wkt.loads(w).buffer(0) for k in a for nme,w in a[k]])
out=[]
for c in np.where(cnt>=7)[0]:
    P=pts[lab==c]
    mp=MultiPoint([tuple(p) for p in P])
    hull=mp.convex_hull
    if hull.geom_type!='Polygon' or hull.area<4000: continue
    rect=hull.minimum_rotated_rectangle; xs,ys=rect.exterior.coords.xy
    e=[np.hypot(xs[i+1]-xs[i],ys[i+1]-ys[i]) for i in range(2)]; asp=max(e)/max(1,min(e))
    if asp>6: continue
    if 4800<P[:,0].mean()<5950 and 3300<P[:,1].mean()<4450: continue
    g=unary_union([Point(*p).buffer(27) for p in P]).buffer(-10).buffer(3)
    if g.is_empty: continue
    dens=len(P)/(hull.area/10000)
    inter=g.intersection(cov).area/g.area
    out.append({'id':int(c),'n':int(len(P)),'area':float(g.area),'dens_per_1e4px2':float(dens),'covered':float(inter),'centroid':[float(P[:,0].mean()),float(P[:,1].mean())],'geom':g.wkt})
print(len(out),'clusters; uncovered (covered<0.35):',sum(o['covered']<0.35 for o in out))
json.dump(out,open('glyph_clusters.json','w'))
