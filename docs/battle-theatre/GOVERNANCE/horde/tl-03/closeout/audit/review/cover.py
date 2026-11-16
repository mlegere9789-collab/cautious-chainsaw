"""Content-word coverage of each documented/inferred sub-claim by the union of its cited quotes (plus author/heading/label text of the citation).
Prints sub-claims whose uncovered content words look like assertions beyond the quote. Heuristic, for a human look; not a gate."""
import json, re, sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
STOP=set('''the and was were that with from this which their his her its into than then when while about over under after before upon been being have has had not but for are out all one two three four five six seven eight nine ten any such also only more most some other each both there they them these those who whom whose what where why how may might could would should shall will can did does done own off per via between among against through during until since within without toward towards beyond near along across behind front rear left right line lines first second third fourth fifth sixth eleventh twelfth the's jul july march day days men man regiment brigade division corps battery batteries brigades regiments report reports order orders text source sources quote claim claims rows row note see notes printed read reading page pages image images ocr gives give given gives gave states state stated said says say saying according named name names unit units hour hours time times year years later earlier early late hill hills ridge'''.split())
def stem(w):
    w=w.lower()
    for suf in ('ing','ed','es','s','ly'):
        if w.endswith(suf) and len(w)-len(suf)>=4: return w[:-len(suf)]
    return w
def words(s):
    return [stem(w) for w in re.findall(r"[A-Za-z][A-Za-z'-]{3,}",s)]
thr=float(sys.argv[1]) if len(sys.argv)>1 else 0.55
out=[]
for r in rows:
    cit={c['key']:c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] not in ('documented','inferred') or not s['citations']: continue
        qs=[]
        for k in s['citations']:
            c=cit.get(k)
            if not c: continue
            qs.append((c.get('quote') or '')+' '+(c.get('reading') or '')+' '+(c.get('note') or '')+' '+(c.get('author') or '')+' '+((c.get('report_heading') or {}).get('text','')))
        qset=set(words(' '.join(qs)))
        cl=re.sub(r'\([^)]*\)','',s['claim'])
        cw=[w for w in words(cl) if w not in STOP and stem(w) not in STOP]
        if not cw: continue
        unc=[w for w in cw if w not in qset and not any(w[:5]==q[:5] for q in qset)]
        cov=1-len(unc)/len(cw)
        if cov<thr:
            out.append((cov,r['id'],s['n'],s['tier'],s['claim'],unc,qs))
out.sort()
for cov,i,n,t,cl,unc,qs in out:
    print('%s S%d [%s] coverage %.2f uncovered=%s\n    CLAIM: %s'%(i,n,t,cov,sorted(set(unc))[:14],cl[:300]))
print('flagged',len(out))
