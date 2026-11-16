import json,re,sys
sys.path.insert(0,'/home/user/cautious-chainsaw/tools/bt')
import kit_or27_leafmap as KL
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
HR=re.compile(r"(?<![\d.])(\d{1,2}[.:] ?\d{2}\b|\d{1,2} o'clock|\d{1,2} ?[ap]\. ?m\b|\b\d{1,2} m\.)")
lms={p:KL.load(p) for p in (1,2,3)}
out=[]
seen=set()
for r in rows:
    for c in r['citations']:
        if c['source_id']!='OR27': continue
        m=HR.search(c['quote'])
        if not m: continue
        key=(c['part'],c['text_offset'])
        if key in seen: continue
        seen.add(key)
        lm=lms[c['part']]; leaf=lm.at(c['text_offset'])['leaf']
        out.append(dict(row=r['id'],key=c['key'],part=c['part'],leaf=leaf,page=c['printed_page'],token=m.group(1),quote=c['quote'],start=m.start()))
json.dump(out,open('/home/user/cautious-chainsaw/tmp/tl-03/rev/hourquotes.json','w'),indent=1)
print(len(out), len(set((o['part'],o['leaf']) for o in out)))
