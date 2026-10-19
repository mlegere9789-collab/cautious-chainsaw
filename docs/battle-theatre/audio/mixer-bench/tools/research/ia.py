import sys,json,urllib.request,urllib.parse,time
UA="gettysburg-map-research/1.0 (polite; read-only)"
for q in sys.argv[1:]:
    u="https://archive.org/advancedsearch.php?"+urllib.parse.urlencode({"q":q+" AND mediatype:audio","fl[]":["identifier","title","licenseurl","creator","collection"],"rows":25,"output":"json"},doseq=True)
    d=json.load(urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=40))
    print("==",q,d["response"]["numFound"])
    for x in d["response"]["docs"]: print(" ",x["identifier"],"|",str(x.get("title"))[:70],"|",x.get("licenseurl"),"|",str(x.get("creator"))[:25])
    time.sleep(3)
