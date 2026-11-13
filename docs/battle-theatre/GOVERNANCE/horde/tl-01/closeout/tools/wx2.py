import os, re, sys, json
ROOT='/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT,'tools','bt'))
import or27_find as F
W=re.compile(r'\b(rainy|rained|raining|rain fell|heavy rain|rain-?storm|showers?|thunder-?storm|dusty|clouds of dust|dust\b|very warm|warm day|hot day|excessively hot|intense heat|sultry|oppressive|cold rain|chilly|muddy|mud\b)', re.I)
D=re.compile(r'(\b(2[5-9]|30)(th|st|d)?\b[^.]{0,25}\bJune|\bJune[^.]{0,6}\b(2[5-9]|30)\b|\bon the (2[5-9]|30)(th|st|d)\b|\b(2[5-9]|30)(th|st|d)\b)', re.I)
seen=0
for p in (1,2,3):
    P=F.get_part(p)
    for m in W.finditer(P.ntext):
        s=max(0,m.start()-300); e=min(len(P.ntext),m.end()+300)
        win=P.ntext[s:e]
        if not D.search(win): continue
        os_,oe=P.orig_span(m.start(),m.end())
        c=P.cite(os_,oe)
        rec=c['record'] or ''
        if p==3 and rec>='OR27-3-D2000': continue
        pg=c['page']
        # keep only pages within the June 25-30 relevant narrative: show all, we filter manually
        print('[pt%d %s p.%s @%d] %s'%(p,rec,pg,os_,win.replace('\n',' ')))
        print()
        seen+=1
print('HITS',seen)
