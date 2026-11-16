"""Capitalised words of a documented/supported sub-claim that occur in none of the cited quotes (nor in the citation's author/work/note): a coarse check that a unit, person or place
named in the claim is carried by the quote it cites.  Listed for reading."""
import json, re
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-04.jsonl',encoding='utf-8')]
STOP=set('''Jul Jun Aug The A An On In At By Of For From To And Or As With Without Not No Its His Her Their That This These Those It He She They We One Two Three Four Five Six Seven Eight Nine Ten First Second Third Fourth Fifth Sixth Seventh
Corps Division Brigade Regiment Battery Army Union Confederate Official Records Hill Ridge Road Pike Street Creek Run Farm House Cemetery Gettysburg Jul Jan Feb Mar Apr May Sep Oct Nov Dec I II III IV V VI XI XII Maj Gen Col Capt Lieut Brig
Gen. Sgt NPS OR Ser BL Note Scenario Hancock Howard Meade Slocum Early Lee Ewell
'''.split())
tot=0; fl=0
for r in rows:
    cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if s['support']!='supported' or s['tier']!='documented': continue
        tot+=1
        ctext=' '.join((cit[k].get('quote') or '')+' '+(cit[k].get('author') or '')+' '+(cit[k].get('note') or '')+' '+(cit[k].get('witness') or '')+' '+(cit[k].get('report_heading') or '') for k in s['citations'] if k in cit).lower()
        words=set(re.findall(r"\b[A-Z][a-z]{3,}\b", s['claim']))
        miss=[w for w in words if w not in STOP and w.lower().rstrip('s') not in ctext and w.lower() not in ctext]
        if miss:
            fl+=1
            print('%s SUB%d missing: %s | %s'%(r['id'],s['n'],sorted(miss),s['claim'][:170]))
print('checked',tot,'flagged',fl)
