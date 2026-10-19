from pyproj import Transformer
# AOI: the Battle Studio data box (west -77.34375, south 39.75788, east -77.14600, north 39.87602), see docs/pitch/anim2/basemap/README.md section 5
LL=(-77.34375,39.75788,-77.14600,39.87602)
T=Transformer.from_crs(4326,26918,always_xy=True); Ti=Transformer.from_crs(26918,4326,always_xy=True)
def utm_bounds(ll=LL, snap=60.0):
    xs,ys=[],[]
    for x in (ll[0],ll[2]):
        for y in (ll[1],ll[3]):
            X,Y=T.transform(x,y); xs.append(X); ys.append(Y)
    import math
    return (math.floor(min(xs)/snap)*snap, math.floor(min(ys)/snap)*snap, math.ceil(max(xs)/snap)*snap, math.ceil(max(ys)/snap)*snap)
if __name__=='__main__': print(utm_bounds())
