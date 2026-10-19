import urllib.request, urllib.parse, json, time
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-domain USGS data)'
def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':UA}); time.sleep(1.0)
    return urllib.request.urlopen(r,timeout=180).read()
print(get('https://imagery.nationalmap.gov/arcgis/rest/services?f=json').decode()[:1500])
for ds in ['National Agriculture Imagery Program (NAIP)']:
    out=[]; off=0
    while True:
        p=dict(datasets=ds,bbox='-77.30,39.78,-77.18,39.86',max=100,offset=off,outputFormat='JSON')
        d=json.loads(get('https://tnmaccess.nationalmap.gov/api/v1/products?'+urllib.parse.urlencode(p)))
        out+=d.get('items',[]); off+=100
        if off>=d.get('total',0): break
    print(ds,d.get('total'))
    json.dump(out,open('catalog_tnm_naip.json','w'),indent=1)
    for i in out: print(i.get('publicationDate'),i.get('dateCreated'),i.get('title'),i.get('sizeInBytes'))
