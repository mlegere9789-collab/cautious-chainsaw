import os, sys, time, requests, json
OUT = os.path.join(os.path.dirname(__file__), '..', 'naip'); os.makedirs(OUT, exist_ok=True)
UA = 'gettysburg-map-landcover-research/1.0 (polite, rate-limited, cached)'
X0, Y0, X1, Y1 = 303000, 4404200, 314500, 4416200
T = 2000
URL = 'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPImagery/ImageServer/exportImage'
for j, y in enumerate(range(Y1, Y0, -T)):
    for i, x in enumerate(range(X0, X1, T)):
        x2 = min(x + T, X1); y2 = max(y - T, Y0)
        w = x2 - x; h = y - y2
        fn = os.path.join(OUT, f'naip_r{j}_c{i}.tif')
        if os.path.exists(fn) and os.path.getsize(fn) > 1000: continue
        p = {'bbox': f'{x},{y2},{x2},{y}', 'bboxSR': 32618, 'imageSR': 32618, 'size': f'{w},{h}', 'format': 'tiff',
             'pixelType': 'U8', 'interpolation': 'RSP_BilinearInterpolation', 'f': 'image', 'noData': 0}
        for attempt in range(6):
            try:
                r = requests.get(URL, params=p, headers={'User-Agent': UA}, timeout=180)
                if r.status_code == 200 and r.headers.get('content-type', '').startswith('image'):
                    open(fn, 'wb').write(r.content); print('ok', fn, len(r.content), flush=True); break
                print('bad', r.status_code, r.text[:200], flush=True)
            except Exception as e: print('err', e, flush=True)
            time.sleep(10 * (attempt + 1))
        time.sleep(3)
