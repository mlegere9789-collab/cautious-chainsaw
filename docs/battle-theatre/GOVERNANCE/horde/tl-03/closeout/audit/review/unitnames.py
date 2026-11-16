import json,re
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
SK=set('''Maj Gen Brig Col Lieut Capt Lt Maj. Gen. Brig. Col. Corps Division Brigade Regiment Battery Infantry Cavalry Artillery Pennsylvania Georgia Alabama Carolina Virginia York Maine Michigan Illinois Ohio Connecticut Wisconsin Indiana Massachusetts Hampshire Jersey Army Potomac Northern Cemetery Hill Seminary Ridge Gettysburg Road Pike Street Creek Run Town First Second Third Fourth Fifth Sixth Eleventh Twelfth Jul Union Confederate Official Records The And With Also Under Under Mrs Dr Surg Surgeon Chaplain Lieut. Lt. Capt. Maj. Corps' Hall Church College Farm Woods Wood House Barn River Hotel Station Depot Lane Avenue Square Park Marker Tablet Monument'''.split())
for r in rows:
    cc=r['corrected_claim']
    pool=' '.join((c.get('quote') or '')+' '+(c.get('author') or '')+' '+((c.get('report_heading') or {}).get('text','')) for c in r['citations'])+' '+' '.join(s['claim'] for s in r['sub_claims'])+' '+json.dumps(r['scenarios'],ensure_ascii=False)+' '+' '.join(c.get('note') or '' for c in r['citations'])
    pl=pool.lower()
    for fld in ('unit','place'):
        names=set(re.findall(r"\b[A-Z][a-z]{3,}(?:'s)?\b",cc[fld]))
        miss=sorted(n for n in names if n not in SK and n.replace("'s",'').lower() not in pl)
        if miss: print(r['id'],fld,miss)
