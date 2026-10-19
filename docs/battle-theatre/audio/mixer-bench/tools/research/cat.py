import sys,time,urllib.error
from commons import api
def members(cat,typ="file,subcat",lim=100):
    d=api(action="query",list="categorymembers",cmtitle=cat,cmtype=typ,cmlimit=lim)
    return [x["title"] for x in d["query"]["categorymembers"]]
for c in sys.argv[1:]:
    print("==",c)
    for a in range(3):
        try:
            for t in members(c): print("  ",t.encode("ascii","replace").decode())
            break
        except urllib.error.HTTPError as e:
            print("ERR",e); time.sleep(30)
    time.sleep(6)
