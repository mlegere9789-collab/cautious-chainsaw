"""OSM (ODbL) extracts for the inventory of post-1863 features; polite: one query at a time, 45 s pause, cached."""
import urllib.request, urllib.parse, json, time, os, sys
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; ODbL data, attribution kept)'
S,W,N,E=39.75788,-77.34375,39.87602,-77.14600
BB=f'({S},{W},{N},{E})'
Q={
 'memorials': f'[out:json][timeout:180];(nw["historic"~"memorial|monument|wayside_cross|cannon|battlefield|ruins|archaeological_site|tomb|grave_yard"]{BB};nw["memorial"]{BB};nw["military"]{BB};nw["tourism"~"artwork|attraction|information"]{BB};nw["amenity"="grave_yard"]{BB};way["landuse"="cemetery"]{BB};);out center tags;',
 'towers_power': f'[out:json][timeout:180];(nw["man_made"~"tower|mast|communications_tower|water_tower|water_tank|storage_tank|chimney|antenna|monitoring_station|surveillance|silo|pipeline|flagpole|lighthouse|pier|bridge|embankment|cutline|survey_point"]{BB};nw["power"]{BB};nw["communication"]{BB};nw["tower:type"]{BB};);out geom tags;',
 'highways': f'[out:json][timeout:240];(way["highway"]{BB};way["railway"]{BB};way["amenity"="parking"]{BB};way["parking"]{BB};way["area:highway"]{BB};way["aeroway"]{BB};);out geom tags;',
 'barriers': f'[out:json][timeout:180];(way["barrier"]{BB};node["barrier"]{BB};node["highway"~"street_lamp|traffic_signals|stop|crossing|bus_stop"]{BB};);out geom tags;',
 'buildings': f'[out:json][timeout:240];(way["building"]{BB};rel["building"]{BB};way["building:part"]{BB};way["shelter"]{BB};way["man_made"]{BB};);out geom tags;',
 'landuse': f'[out:json][timeout:240];(way["landuse"]{BB};rel["landuse"]{BB};way["leisure"]{BB};rel["leisure"]{BB};way["natural"~"water|wetland"]{BB};rel["natural"~"water|wetland"]{BB};way["water"]{BB};way["waterway"]{BB};way["power"~"generator|plant|substation"]{BB};way["amenity"]{BB};way["tourism"]{BB};way["historic"]{BB};way["man_made"~"reservoir_covered|works|wastewater_plant|water_works"]{BB};);out geom tags;',
}
only=sys.argv[1:] or list(Q)
for k in only:
    p=f'vec/osm_{k}.json'
    if os.path.exists(p) and os.path.getsize(p)>50: print(k,'cached'); continue
    for i in range(6):
        time.sleep(45 if i else 5)
        try:
            r=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':Q[k]}).encode(),headers={'User-Agent':UA})
            data=urllib.request.urlopen(r,timeout=300).read()
            d=json.loads(data); open(p,'wb').write(data); print(k,len(d['elements']),'elements',flush=True); break
        except Exception as e: print(k,'try',i,e,flush=True)
