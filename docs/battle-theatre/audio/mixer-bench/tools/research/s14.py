import sys,time
from commons import api
for q in sys.argv[1:]:
    print("==",q)
    d=api(action="query",list="search",srsearch=q,srnamespace=14,srlimit=20)
    for x in d["query"]["search"]: print("  ",x["title"].encode("ascii","replace").decode())
    time.sleep(6)
