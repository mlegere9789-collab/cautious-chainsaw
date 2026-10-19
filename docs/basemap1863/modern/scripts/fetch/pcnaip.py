"""Read-only helper: STAC items of the NAIP collection (a public mirror of USDA NAIP, public domain) + anonymous read token; windows via HTTP range requests."""
import json, time, urllib.request, os
UA='gettysburg-map-1863-research/1.0 (read-only, polite, cached; public-domain NAIP)'
HERE=os.path.dirname(os.path.abspath(__file__))
_tok={'t':None,'exp':0}
def token():
    if _tok['t'] and time.time()<_tok['exp']: return _tok['t']
    r=urllib.request.Request('https://planetarycomputer.microsoft.com/api/sas/v1/token/naip',headers={'User-Agent':UA})
    d=json.loads(urllib.request.urlopen(r,timeout=60).read()); _tok['t']=d['token']; _tok['exp']=time.time()+1800; return d['token']
def items():
    return json.load(open(os.path.join(HERE,'catalog_pc_naip.json')))['features']
def signed(href): return href+'?'+token()
