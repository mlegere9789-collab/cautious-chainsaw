import sys, json, os, re, collections
ROOT='/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT+'/tools/bt')
import kit_or27_leafmap as KL
rows=[json.loads(l) for l in open(ROOT+'/docs/battle-theatre/GOVERNANCE/timeline_corrections/tl-04.jsonl',encoding='utf-8')]
n=0; dis=[]; nopage=[]
for r in rows:
    for c in r['citations']:
        if c['source_id']!='OR27': continue
        n+=1
        lm=KL.load(c['part'])
        a=lm.at(c['text_offset']); b=lm.at(c['text_offset_end']-1)
        if not a or not b or a['page'] is None or b['page'] is None:
            nopage.append((r['id'],c['key'],c['part'],c['printed_page'],a,b)); continue
        pa,pb=a['page'],b['page']
        leaf=str(pa) if pa==pb else '%s-%s'%(pa,pb)
        model=c['printed_page']
        nums=sorted(set(int(x) for x in re.findall(r'\d+', re.sub(r'\([^)]*\)','',str(model)))))
        agree = ('~' not in str(model)) and nums==sorted({pa,pb})
        if not agree:
            dis.append((r['id'],c['key'],c['report_id'],model,leaf,a['leaf'],b['leaf']))
print('OR citations',n,'disagree/interpolated',len(dis),'no leaf page',len(nopage))
for d in dis: print(' ',d)
for d in nopage: print(' NOPAGE',d)
