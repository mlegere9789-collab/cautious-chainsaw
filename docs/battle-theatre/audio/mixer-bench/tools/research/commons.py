import sys, json, urllib.request, urllib.parse, time
UA="gettysburg-map-research/1.0 (project research; polite read-only)"
def api(**p):
    p["format"]="json"
    u="https://commons.wikimedia.org/w/api.php?"+urllib.parse.urlencode(p)
    r=urllib.request.Request(u,headers={"User-Agent":UA})
    return json.load(urllib.request.urlopen(r,timeout=30))
def search(q,lim=30):
    d=api(action="query",list="search",srsearch=q,srnamespace=6,srlimit=lim)
    return [x["title"] for x in d["query"]["search"]]
if __name__=="__main__":
    for q in sys.argv[1:]:
        print("==",q)
        try:
            for t in search(q): print("  ",t.encode("ascii","replace").decode())
        except Exception as e: print("ERR",e)
        time.sleep(1)
