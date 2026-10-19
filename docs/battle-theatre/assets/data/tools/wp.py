import requests, json, os, time, hashlib, sys
UA='GettysburgInteractiveMap-research/1.0 (read-only, rate-limited; contact gettysburginteractivemap@gmail.com)'
CACHE=os.path.join(os.path.dirname(__file__),'cache'); os.makedirs(CACHE,exist_ok=True)
S=requests.Session(); S.headers['User-Agent']=UA
def get(url, params=None, delay=1.0, kind='json'):
    key=hashlib.sha1((url+json.dumps(params,sort_keys=True)).encode()).hexdigest()
    p=os.path.join(CACHE,key+'.'+kind)
    if os.path.exists(p):
        return json.load(open(p,encoding='utf8')) if kind=='json' else open(p,encoding='utf8').read()
    time.sleep(delay)
    r=S.get(url,params=params,timeout=60)
    r.raise_for_status()
    open(p,'w',encoding='utf8').write(r.text)
    return r.json() if kind=='json' else r.text
