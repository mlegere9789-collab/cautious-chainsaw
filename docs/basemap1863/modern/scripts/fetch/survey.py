import sys, time, json; sys.path.insert(0,'.')
import numpy as np, mosaic, aoi
b=aoi.utm_bounds(); res=2.4
stats={}
for k in ['2010','2013','2015','2017','2019','2022']:
    t=time.time(); a,v=mosaic.mosaic(k,b,res)
    np.save(f'survey/{k}_2p4m.npy',a); np.save(f'survey/{k}_valid.npy',v)
    r,g,bl,n=[a[i].astype(float) for i in range(4)]
    ndvi=(n-r)/(n+r+1e-6)
    lum=0.299*r+0.587*g+0.114*bl
    stats[k]=dict(coverage=float(v.mean()),ndvi_mean=float(ndvi[v].mean()),lum_mean=float(lum[v].mean()),dark_frac=float((lum[v]<45).mean()),
        veg_frac=float((ndvi[v]>0.3).mean()), secs=round(time.time()-t))
    print(k,stats[k],flush=True)
json.dump(stats,open('survey/vintage_stats.json','w'),indent=1)
