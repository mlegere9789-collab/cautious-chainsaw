"""Every numeral of a documented/supported/conflict sub-claim must occur in at least one of the quotes it cites (a coarse check that a number or hour of the claim is not invented).
Lists the sub-claims where a numeral is missing; the engineer then reads each."""
import json, re, sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-04.jsonl',encoding='utf-8')]
NUM=re.compile(r'\d[\d,.:]*\d|\d')
WORDNUM={'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,'twelve':12,'twenty':20,'forty':40,'hundred':100}
def nums(t):
    out=set()
    for m in NUM.finditer(t):
        x=m.group(0).strip('.,:')
        out.add(x.replace(',',''))
    return out
flag=0; total=0
for r in rows:
    cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if s['support'] not in ('supported','conflict'): continue
        if s['tier']!='documented': continue
        total+=1
        ctext=' '.join((cit[k].get('quote') or '') for k in s['citations'] if k in cit)
        cn=nums(ctext)
        miss=[x for x in nums(s['claim']) if x not in cn and not re.fullmatch(r'1863|0?\d',x)]
        # words for numbers in claim vs quote: tolerate
        if miss:
            flag+=1
            print('%s SUB%d numerals not in the cited quotes: %s\n    claim: %s'%(r['id'],s['n'],miss,s['claim'][:230]))
print('documented sub-claims checked',total,'flagged',flag)
