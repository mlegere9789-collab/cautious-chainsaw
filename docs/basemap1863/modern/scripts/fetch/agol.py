import urllib.request, urllib.parse, json, time, os
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-record data)'
def getj(u, data=None, pause=1.0, timeout=180):
    time.sleep(pause)
    r=urllib.request.Request(u,data=data,headers={'User-Agent':UA})
    return json.loads(urllib.request.urlopen(r,timeout=timeout).read())
def query_all(layer_url, bbox_ll, out, where='1=1', fields='*', geom=True, page=1000, srout=4326, extra=None):
    """page through a Map/FeatureServer layer inside a lon/lat box; writes GeoJSON-like list to out"""
    if os.path.exists(out): return json.load(open(out))
    g={'xmin':bbox_ll[0],'ymin':bbox_ll[1],'xmax':bbox_ll[2],'ymax':bbox_ll[3],'spatialReference':{'wkid':4326}}
    feats=[]; off=0
    while True:
        p=dict(where=where,geometry=json.dumps(g),geometryType='esriGeometryEnvelope',inSR=4326,spatialRel='esriSpatialRelIntersects',outFields=fields,
               returnGeometry='true' if geom else 'false',outSR=srout,f='geojson',resultOffset=off,resultRecordCount=page)
        if extra: p.update(extra)
        d=getj(layer_url+'/query',data=urllib.parse.urlencode(p).encode())
        if 'error' in d: raise RuntimeError(str(d['error'])[:300])
        fs=d.get('features',[]); feats+=fs; off+=len(fs)
        print('  ',layer_url.split('/services/')[-1][:60],off,flush=True)
        if len(fs)==0 or not (d.get('exceededTransferLimit') or d.get('properties',{}).get('exceededTransferLimit')) and len(fs)<page: break
    res={'type':'FeatureCollection','features':feats}
    json.dump(res,open(out,'w')); return res
