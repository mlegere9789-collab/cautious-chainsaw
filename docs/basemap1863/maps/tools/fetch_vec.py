"""Fetch modern reference vectors for the AOI (public domain): Census TIGERweb roads + railroads, USGS NHD flowlines. GeoJSON in UTM 18N."""
import os, sys, json, urllib.parse
from common import *
bbox = f"{AOI['e0']},{AOI['n0']},{AOI['e1']},{AOI['n1']}"
T = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer/%d/query'
jobs = {'tiger_primary': (T % 2), 'tiger_secondary': (T % 6), 'tiger_local': (T % 8), 'tiger_rail': (T % 9)}
for name, base in jobs.items():
    q = dict(where='1=1', geometry=bbox, geometryType='esriGeometryEnvelope', inSR=32618, spatialRel='esriSpatialRelIntersects', outFields='*', outSR=32618, f='geojson', resultRecordCount=2000)
    url = base + '?' + urllib.parse.urlencode(q)
    out = os.path.join(TMP, 'ref', name + '.geojson')
    print(name, polite_get(url, out), flush=True)
# NHD flowlines (layer 6 = NHDFlowline in the nhd MapServer)
N = 'https://hydro.nationalmap.gov/arcgis/rest/services/nhd/MapServer/%d/query'
for lid, name in [(6, 'nhd_flowline'), (9, 'nhd_waterbody')]:
    q = dict(where='1=1', geometry=bbox, geometryType='esriGeometryEnvelope', inSR=32618, spatialRel='esriSpatialRelIntersects', outFields='*', outSR=32618, f='geojson', resultRecordCount=2000)
    out = os.path.join(TMP, 'ref', name + '.geojson')
    print(name, polite_get(N % lid + '?' + urllib.parse.urlencode(q), out), flush=True)
