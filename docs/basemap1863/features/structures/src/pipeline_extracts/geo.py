import json, math, numpy as np
from pyproj import Transformer
T_UTM=Transformer.from_crs(4326,32618,always_xy=True)
T_INV=Transformer.from_crs(32618,4326,always_xy=True)
T_WM=Transformer.from_crs(4326,3857,always_xy=True)
def ll2m(lon,lat): return T_UTM.transform(lon,lat)
def m2ll(x,y): return T_INV.transform(x,y)
