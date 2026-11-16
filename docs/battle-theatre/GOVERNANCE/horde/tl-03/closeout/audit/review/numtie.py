"""Heuristic tie of each documented/inferred sub-claim to its own cited quotes: every number (digits) and every capitalised name
of the claim text should occur in the union of its cited quotes (+ report author/heading). Prints the misses for a human look. Not a gate."""
import json, re, sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
W2N={'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10','twelve':'12','twenty':'20','thirty':'30','forty':'40','fifty':'50','hundred':'100'}
def nums(s):
    s=s.replace(',','')
    out=set(re.findall(r'\d+(?:\.\d+)?',s))
    return out
def norm(s):
    return re.sub(r'[^a-z0-9. ]',' ',s.lower())
miss_total=0
for r in rows:
    cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] not in ('documented','inferred') or not s['citations']: continue
        q=' '.join((cit[k].get('quote') or (str(cit[k].get('what'))+' '+str(cit[k].get('value'))))+' '+(cit[k].get('author') or '')+' '+((cit[k].get('report_heading') or {}).get('text','')) for k in s['citations'] if k in cit)
        qn=nums(q)
        qtext=norm(q)
        cn=nums(re.sub(r'\(.*?\)','',s['claim']))   # ignore parentheticals (OCR notes)
        # numbers of the claim not in quotes
        miss=[n for n in sorted(cn) if n not in qn and not any(n==x.rstrip('0').rstrip('.') for x in qn)]
        # capitalised words (names) of the claim not in quotes (skip common words)
        names=set(re.findall(r"\b[A-Z][a-z]{3,}\b",re.sub(r'\(.*?\)','',s['claim'])))
        skip={'Official','Records','Pennsylvania','Maine','Michigan','Gettysburg','Army','Corps','Brigade','Division','First','Second','Third','Fourth','Fifth','Sixth','Eleventh','Twelfth','North','Carolina','Georgia','Alabama','Virginia','Illinois','Ohio','York','Connecticut','Battles','Leaders','National','Park','Service','Cemetery','Hill','Seminary','Ridge','Barlow','Jul','Hancock','Howard','Doubleday','Schurz','Early','Ewell','Rodes','Lee','Hill','Heth','Pender'}
        nmiss=[n for n in sorted(names) if n.lower() not in qtext and n not in skip]
        if miss or nmiss:
            miss_total+=1
            print('%s S%d [%s] nums-not-in-quotes=%s names-not-in-quotes=%s\n    CLAIM: %s\n    QUOTE: %s'%(r['id'],s['n'],s['tier'],miss,nmiss,s['claim'][:260],q[:300].replace('\n',' ')))
print('flagged',miss_total)
