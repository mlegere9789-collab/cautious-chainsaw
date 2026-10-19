import urllib.request, urllib.parse, json, time, datetime
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-domain USGS data)'
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':UA}); time.sleep(1.0)
    return urllib.request.urlopen(r,timeout=180).read()
m=json.loads(get('https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer?f=json'))
print({k:m.get(k) for k in ['name','copyrightText','timeInfo','capabilities']}); print([f['name'] for f in m['fields']])
base='https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/query'
geom={'xmin':-77.30,'ymin':39.78,'xmax':-77.18,'ymax':39.86,'spatialReference':{'wkid':4326}}
p=dict(where='1=1',geometry=json.dumps(geom),geometryType='esriGeometryEnvelope',inSR=4326,spatialRel='esriSpatialRelIntersects',outFields='*',returnGeometry='false',f='json',resultRecordCount=1000)
d=json.loads(get(base+'?'+urllib.parse.urlencode(p)))
print(d.get('error'),len(d.get('features',[])))
rows=[f['attributes'] for f in d['features']]
for r in rows:
    for k in list(r):
        if 'date' in k.lower() and isinstance(r[k],(int,float)): r[k+'_iso']=datetime.datetime.utcfromtimestamp(r[k]/1000).strftime('%Y-%m-%d')
json.dump(rows,open('catalog_naipimagery.json','w'),indent=1)
for r in rows[:5]: print(r)
