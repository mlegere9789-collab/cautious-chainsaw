import sys, json; sys.path.insert(0,'.')
from agol import *
LL=(-77.34375,39.75788,-77.14600,39.87602)
AD='https://mapping.adamscountypa.gov/arcgis/rest/services/AGOL/'
jobs=[
 ('adams_buildings2023', AD+'Building_Outlines/MapServer/0'),
 ('adams_centerline',    AD+'Centerline/MapServer/103'),
 ('adams_gnmp_boundary', AD+'State_Federal_Lands/MapServer/3'),
]
for name,url in jobs:
    try:
        r=query_all(url,LL,f'vec/{name}.json'); print(name,len(r['features']),flush=True)
    except Exception as e: print(name,'FAIL',e,flush=True)
