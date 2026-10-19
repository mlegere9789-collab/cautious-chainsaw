import json, time, urllib.request
UA = 'gettysburg-map-research/1.0 (roster blueprint pilot; read-only, rate-limited)'
ids = ['rosterofwisconsi01wisc', 'annualreportofad1863main', 'maineatgettysbur01main', 'rosterofnorthcar02nort', 'cu31924092908544',
       'cu31924030918944', 'reglossescivilwar00foxwrich', 'warofrebellion012701rootrich', 'supplementtoannu00main',
       'historyofpennsy00bate', 'annualreportofa1863v2newy', 'cu31924092911092', 'recordofserviceo03mich', 'ohiowarroster03howerich',
       'massachusettssol11931mass', 'newjerseyincivil01recorich', 'cu31924096263128', 'recordsofl00loui', 'rosterofconfeder0003unse',
       'northcarolinatro0003loui', 'regimentalstreng0000john', 'historyofdolesco00thom', 'newyorkatgettysb00foxw']
out = {}
for i in ids:
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request('https://archive.org/metadata/' + i, headers={'User-Agent': UA}), timeout=40))
        m = d.get('metadata', {})
        files = d.get('files', [])
        out[i] = dict(title=str(m.get('title'))[:80], date=m.get('date'), copyright=m.get('possible-copyright-status'), license=m.get('licenseurl'),
                      access=m.get('access-restricted-item'), collection=m.get('collection'), has_djvu_txt=any(f['name'].endswith('_djvu.txt') for f in files),
                      djvu_bytes=next((f.get('size') for f in files if f['name'].endswith('_djvu.txt')), None), imagecount=m.get('imagecount'))
    except Exception as e:
        out[i] = 'ERR ' + str(e)
    time.sleep(1.5)
json.dump(out, open('../cache/ia_meta.json', 'w'), indent=1)
for k, v in out.items():
    print(k, v)
