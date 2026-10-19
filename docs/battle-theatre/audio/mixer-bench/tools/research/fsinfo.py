import sys,re,time,html,json,urllib.request
UA="gettysburg-map-research/1.0 (polite; read-only; contact via project)"
def get(path):
    path = path if path.startswith("/") else "/"+path
    r=urllib.request.Request("https://freesound.org"+path,headers={"User-Agent":UA})
    return urllib.request.urlopen(r,timeout=30).read().decode("utf8","replace")
def info(path):
    h=get(path if path.startswith("/") else "/"+path)
    m=lambda p: (re.search(p,h,re.S) or [None,None])[1]
    out={"path":path}
    out["title"]=html.unescape(m(r'<title>(.*?)</title>') or "")
    out["lic"]=m(r'href="(https?://creativecommons.org/[^"]+)"')
    d=m(r'twitter:description" content="(.*?)" />')
    out["desc"]=html.unescape(d or "")[:500]
    out["prev"]=sorted(set(re.findall(r'https://cdn.freesound.org/previews/[^"]*-hq\.(?:mp3|ogg)',h)))
    out["tags"]=re.findall(r'/browse/tags/([^/"]+)/',h)[:15]
    # sound info
    i=h.find("Sound information") if "Sound information" in h else h.find("Type")
    txt=re.sub(r'<[^>]+>',' ',h)
    txt=re.sub(r'\s+',' ',txt)
    mm=re.search(r'(Type|Duration).{0,300}',txt)
    k=txt.find("Samplerate")
    out["fmt"]=txt[max(0,k-150):k+120] if k>0 else ""
    return out
if __name__=="__main__":
    res=[]
    for p in sys.argv[1:]:
        try: res.append(info(p))
        except Exception as e: res.append({"path":p,"err":str(e)})
        time.sleep(3)
    json.dump(res,open("fsinfo_out.json","a"),indent=1)
    for r in res: print(json.dumps(r,ensure_ascii=True)[:1200]); print()
