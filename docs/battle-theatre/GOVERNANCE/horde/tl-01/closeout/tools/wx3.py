import os, re, sys
ROOT='/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT,'tools','bt'))
import or27_find as F
W=re.compile(r'\b(rain\w*|shower\w*|storm\w*|mud\w*|wet\b|weather|dust\w*|hot\b|heat\b|warm\w*|sultry|oppressive\w*|cool\b|cold\b|drizzl\w+|fog\w*|cloud\w*)', re.I)
# a sentence-level approach: split into sentences, keep those with weather word AND a date token 26-30 (June) in the same or previous sentence
DT=re.compile(r'(\bJune\.?\s*(2[6-9]|30)\b|\b(2[6-9]|30)(th|st|d)?\s*(of\s*)?June\b|\bon the (2[6-9]|30)(th|st|d)\b|\bthe (2[6-9]|30)(th|st|d)\b|\bJune (2[6-9]|30)\b|\bJune\s*[23]\d\b)',re.I)
out=[]
for p in (1,2):
    P=F.get_part(p)
    t=P.ntext
    # sentence split
    pos=0
    sents=[]
    for m in re.finditer(r'[^.!?]+[.!?]', t):
        sents.append((m.start(), m.end()))
    for i,(a,b) in enumerate(sents):
        s=t[a:b]
        if not W.search(s): continue
        ctx=t[sents[max(0,i-1)][0]:b]
        if not DT.search(ctx): continue
        os_,oe=P.orig_span(a,b)
        c=P.cite(os_,oe)
        out.append((p,c['record'],c['page'],os_,ctx.replace('\n',' ')))
seen=set()
for p,rec,pg,off,ctx in out:
    key=ctx[:120]
    if key in seen: continue
    seen.add(key)
    print('[pt%d %s p.%s @%d] %s\n'%(p,rec,pg,off,ctx[:700]))
print('HITS',len(seen))
