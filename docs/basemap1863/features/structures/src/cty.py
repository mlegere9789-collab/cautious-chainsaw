import json,numpy as np
from geo import *
from shapely.geometry import shape, Point
import shapely
from shapely.ops import transform
_cb=None
def load():
    global _cb
    if _cb is None:
        fs=json.load(open('adams_buildings2023.json',encoding='utf8'))['features']
        _cb=[]
        for i,f in enumerate(fs):
            g=shape(f['geometry'])
            gm=transform(lambda x,y,z=None: T_UTM.transform(x,y),g)
            _cb.append((i,gm,f['properties']))
    return _cb
def aff(path='mapwork/aff2.npy'): return np.load(path)
def px2m(s,px,py):
    A=np.array([[s[0],s[1]],[s[3],s[4]]]); t=np.array([s[2],s[5]]); return np.linalg.solve(A,np.array([px,py])-t)
def near(px,py,s=None,r=40):
    s=aff() if s is None else s
    x,y=px2m(s,px,py); p=Point(x,y); out=[]
    for i,gm,pr in load():
        d=gm.distance(p)
        if d<=r: out.append((round(d,1),i,round(gm.area),pr.get('PROPERTY_T'),pr.get('Parcel_ID')))
    return sorted(out)
if __name__=='__main__':
    import sys
    px,py=float(sys.argv[1]),float(sys.argv[2]); 
    for o in near(px,py,r=float(sys.argv[3]) if len(sys.argv)>3 else 40): print(o)
