import sys,warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
import cty,numpy as np
from geo import *
from shapely.geometry import Point
def nb(lon,lat,r=150,minarea=15):
    x,y=ll2m(lon,lat); out=[]
    for i,g,p in cty.load():
        c=g.centroid; d=c.distance(Point(x,y))
        if d<=r and g.area>=minarea: out.append((i,round(g.area),round(c.x-x),round(c.y-y)))
    return sorted(out,key=lambda t:t[2]**2+t[3]**2)
if __name__=='__main__':
    lo,la=float(sys.argv[1]),float(sys.argv[2]); r=float(sys.argv[3]) if len(sys.argv)>3 else 150
    for t in nb(lo,la,r): print('cty',t[0],'area',t[1],'dE',t[2],'dN',t[3])
