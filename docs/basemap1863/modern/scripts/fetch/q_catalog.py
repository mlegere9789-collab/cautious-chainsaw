import urllib.request, urllib.parse, json, time, sys
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-domain USGS data)'
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':UA}); time.sleep(1.0)
    return urllib.request.urlopen(r,timeout=180).read()
base='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/query'
# battlefield core: Gettysburg NMP approx
geom={'xmin':-77.30,'ymin':39.78,'xmax':-77.18,'ymax':39.86,'spatialReference':{'wkid':4326}}
p=dict(where='1=1',geometry=json.dumps(geom),geometryType='esriGeometryEnvelope',inSR=4326,spatialRel='esriSpatialRelIntersects',
 outFields='OBJECTID,Name,Category,State,Year,raster_name,download_url,acquisition_date,agency,vendor,resolution_value,resolution_units,band_count,sensor_type,MinPS,MaxPS',returnGeometry='false',f='json',resultRecordCount=1000)
d=json.loads(get(base+'?'+urllib.parse.urlencode(p)))
print(d.get('error'), len(d.get('features',[])))
rows=[f['attributes'] for f in d['features']]
import datetime
for r in rows:
    ad=r.get('acquisition_date')
    if ad: r['acq']=datetime.datetime.utcfromtimestamp(ad/1000).strftime('%Y-%m-%d')
json.dump(rows,open('catalog_naipplus.json','w'),indent=1)
from collections import Counter
c=Counter((r.get('Year'),r.get('acq'),r.get('resolution_value'),r.get('Category')) for r in rows)
for k,v in sorted(c.items(),key=lambda x:str(x[0])): print(k,v)
