import json,re,sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
STOP=set('''the and was were that with from this which their his her its into than then when while about over under after before upon been being have has had not but for are out all one two three four five six seven eight nine ten any such also only more most some other each both there they them these those who whom whose what where why how may might could would should shall will can did does done own off per via between among against through during until since within without toward towards beyond near along across behind front rear left right line lines first second third fourth fifth sixth eleventh twelfth jul july day days men man regiment brigade division corps battery batteries brigades regiments report reports order orders text source sources quote claim claims rows row note see notes printed read reading page pages image images ocr gives give given gave states state stated said says say saying according named name names unit units hour hours time times year years later earlier early late hill hills ridge not nor yet either neither seed seeds report's the's'''.split())
def stem(w):
    w=w.lower().replace("'s","").replace("’s","")
    for suf in ('ing','ed','es','s','ly'):
        if w.endswith(suf) and len(w)-len(suf)>=4: return w[:-len(suf)]
    return w
def words(s): return [stem(w) for w in re.findall(r"[A-Za-z][A-Za-z'’-]{3,}",s)]
for r in rows:
    ev=re.sub(r'\([^)]*\)','',r['corrected_claim']['event'])
    pool=' '.join((c.get('quote') or '')+' '+(c.get('author') or '')+' '+((c.get('report_heading') or {}).get('text','')) for c in r['citations'])+' '+' '.join(s['claim'] for s in r['sub_claims'])+' '+json.dumps(r['scenarios'],ensure_ascii=False)
    ps=set(words(pool))
    ew=[w for w in words(ev) if w not in STOP]
    unc=sorted(set(w for w in ew if w not in ps and not any(w[:5]==q[:5] for q in ps)))
    if unc: print(r['id'],unc)
