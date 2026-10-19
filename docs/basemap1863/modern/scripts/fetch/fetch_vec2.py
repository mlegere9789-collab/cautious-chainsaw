import sys, json; sys.path.insert(0,'.')
from agol import *
LL=(-77.34375,39.75788,-77.14600,39.87602)
TW='https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer/'
NHD='https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/'
ST='https://carto.nationalmap.gov/arcgis/rest/services/structures/MapServer/'
jobs=[('tiger_local',TW+'8'),('tiger_primary',TW+'2'),('tiger_sec_hwy',TW+'3'),('tiger_sec_72k',TW+'6'),('tiger_rail',TW+'9'),
      ('nhd_flowline',NHD+'6'),('nhd_area',NHD+'9'),('nhd_waterbody',NHD+'12'),('nhd_point',NHD+'0'),
      ('usgs_struct_hist',ST+'11'),('usgs_struct_medical',ST+'14'),('usgs_struct_edu',ST+'20'),('usgs_struct_fire',ST+'16'),('usgs_struct_law',ST+'17'),('usgs_struct_rec',ST+'24'),('usgs_struct_energy',ST+'33'),('usgs_struct_cem',ST+'2'),('usgs_struct_landmark',ST+'1')]
for name,url in jobs:
    try:
        r=query_all(url,LL,f'vec/{name}.json'); print(name,len(r['features']),flush=True)
    except Exception as e: print(name,'FAIL',str(e)[:200],flush=True)
