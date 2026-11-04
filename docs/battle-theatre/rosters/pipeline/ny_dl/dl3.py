import sys; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
import urllib.request
acq=load_acq()
def img(n):
    url='https://archive.org/download/newyorkatgettysb0001unse/page/n%d_w1600.jpg'%n
    dest=os.path.join(CACHE,'nyag_roh_n%d.jpg'%n)
    if os.path.exists(dest): return dest
    polite(); req=urllib.request.Request(url,headers={'User-Agent':UA}); r=urllib.request.urlopen(req,timeout=90); b=r.read()
    open(dest,'wb').write(b)
    a=load_acq(); a['files'].append({'url':url,'identifier':'newyorkatgettysb0001unse','file':os.path.basename(dest),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'http_status':r.status,'retrieved':datetime.datetime.now().isoformat(timespec='seconds')}); json.dump(a,open(ACQ,'w',encoding='utf-8'),indent=1)
    return dest
for n in [int(x) for x in sys.argv[1:]]:
    print(img(n),flush=True)
