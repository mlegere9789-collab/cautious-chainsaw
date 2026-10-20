# recomputes cone ensembles, nearest drawn fence and tile ids for every case with a pose (inputs of metrics.py)
import sys,json,math,pickle,warnings; warnings.filterwarnings('ignore')
sys.path.insert(0,'.')
import cone
from cases import CASES
from shapely.geometry import Point
from pyproj import Transformer
d=pickle.load(open('C:/Users/mlege/gettysburg-map/tmp/b1863/build/draw_items.pkl','rb'))
t=Transformer.from_crs(26918,4326,always_xy=True)
def tile(lon,lat,z):
    n=2**z; x=(lon+180)/360*n; y=(1-math.log(math.tan(math.radians(lat))+1/math.cos(math.radians(lat)))/math.pi)/2*n
    return f'{z}/{int(x)}/{int(y)}'
cr={};fn={};tl={}
for c in CASES:
    if c['pose'] is None: continue
    cr[c['id']]=cone.ensemble(c['pose'],n=60)
    p=Point(c['pose'][0],c['pose'][1]); b=min(d['fences'],key=lambda f:f['geom'].distance(p)); fn[c['id']]=dict(nearest_drawn_fence_m=round(b['geom'].distance(p)),fence_id=b['id'])
    lon,lat=t.transform(c['pose'][0],c['pose'][1]); tl[c['id']]=dict(lon=round(lon,5),lat=round(lat,5),z16=tile(lon,lat,16),z17=tile(lon,lat,17))
json.dump(cr,open('cone_results.json','w')); json.dump(fn,open('fence_nearest.json','w')); json.dump(tl,open('case_tiles.json','w')); print('ok',len(cr))
