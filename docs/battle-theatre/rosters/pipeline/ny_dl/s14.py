import sys,re,html,json; sys.path.insert(0, r'C:\Users\mlege\gettysburg-map\tmp\bt\ny')
from fetch import *
for slug in ['artillery/1st-artillery-regiment-light','artillery/1st-artillery-regiment-light/battery-d-1st-artillery-regiment-light']:
    fn=os.path.join(CACHE,'nysmm_pages',slug.replace('/','__')+'.html')
    if os.path.exists(fn): h=open(fn,encoding='utf-8').read()
    else:
        st,b=get('https://museum.dmna.ny.gov/unit-history/'+slug); h=b.decode('utf-8','replace'); open(fn,'w',encoding='utf-8').write(h)
    print('==',slug,len(h))
    for m in re.finditer(r'href="([^"]+)"[^>]*>(.{0,140}?)</a>',h,re.S):
        u,t=m.groups(); t=html.unescape(re.sub('<[^>]+>','',t)).strip()
        if re.search(r'download|\.pdf|roster|muster|casualt',u+t,re.I) and 'oral-history' not in u: print(u,'|',t[:90])
    t2=html.unescape(re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',re.sub(r'<script.*?</script>|<style.*?</style>','',h,flags=re.S))))
    i=t2.find('Online Resources'); print(t2[i:i+500])
