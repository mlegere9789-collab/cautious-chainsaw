import sys,json,time,subprocess,urllib.parse
UA="gettysburg-map-verification/1.0 (non-commercial historical research; polite 4s delay)"
for q in sys.argv[1:]:
    url="https://www.loc.gov/pictures/search/?q=%s&fo=json&c=12"%urllib.parse.quote_plus(q)
    out=subprocess.run(['curl','-s','-m','60','-A',UA,url],capture_output=True).stdout
    try: d=json.loads(out)
    except Exception as e: print(q,'ERR',out[:200]); time.sleep(4); continue
    print('==',q,d['search']['hits'])
    for r in d.get('results',[]):
        print(' ',r.get('pk') or r.get('links',{}).get('item'),'|',(r.get('title') or '')[:120],'|',r.get('created_published_date'))
    time.sleep(4)
