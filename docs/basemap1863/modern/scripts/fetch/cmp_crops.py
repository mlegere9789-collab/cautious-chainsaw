import sys; sys.path.insert(0,'.')
import numpy as np, mosaic, aoi
from PIL import Image
cx,cy=aoi.T.transform(-77.2395,39.7945)   # Wheatfield / Devil's Den / Little Round Top
for name,(ox,oy,half) in {'wheatfield':(cx,cy,300),'town_nw':(*aoi.T.transform(-77.2330,39.8340),300)}.items():
    b=(ox-half,oy-half,ox+half,oy+half)
    for k,res in [('2010',1.0),('2013',1.0),('2015',1.0),('2017',1.0),('2019',0.6),('2022',0.6)]:
        a,v=mosaic.mosaic(k,b,res)
        im=Image.fromarray(np.moveaxis(a[:3],0,2)).resize((900,900),Image.LANCZOS); im.save(f'cmp/{name}_{k}.jpg',quality=92)
        print(name,k,a.shape,v.mean(),flush=True)
