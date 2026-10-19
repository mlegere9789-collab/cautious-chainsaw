import sys,json,time,re,html
from commons import api
for t in sys.argv[1:]:
    d=api(action="query",titles=t,prop="imageinfo",iiprop="url|size|mime|extmetadata|mediatype",iiextmetadatafilter="LicenseShortName|Artist|Credit|ImageDescription|UsageTerms|AttributionRequired|DateTimeOriginal")
    for p in d["query"]["pages"].values():
        ii=p.get("imageinfo",[{}])[0]; em=ii.get("extmetadata",{})
        g=lambda k: re.sub('<[^>]+>','',html.unescape(em.get(k,{}).get("value",""))) [:300]
        print(t,"|",ii.get("url"),"|",ii.get("size"),"|",g("LicenseShortName"),"|",g("Artist"),"|",g("Credit"),"|",g("ImageDescription"))
    time.sleep(6)
