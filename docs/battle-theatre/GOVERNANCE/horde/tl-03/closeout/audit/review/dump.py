import json,sys
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-03.jsonl')]
lo,hi=sys.argv[1],sys.argv[2]
full = len(sys.argv)>3 and sys.argv[3]=='full'
for r in rows:
    if not (lo<=r['id']<=hi): continue
    cc=r['corrected_claim']; tw=cc['time_window']
    print('='*100)
    print(r['id'],'|',r['verdict'],'| before:',r['before'].get('status_effective'),'| seed tier',r['seed'].get('tier'),'->',cc['tier'],'| seed time:',r['seed'].get('time_window_raw'))
    print('EVENT:',cc['event'])
    print('UNIT :',cc['unit'][:300])
    print('PLACE:',cc['place'][:300])
    print('TIME :',tw['text'],'|',tw['start'],'->',tw['end'])
    if full:
        print('BASIS:',tw['basis'])
        print('TEXT :',cc['text'])
        print('MARK :',cc.get('marking'))
    for s in r['sub_claims']:
        print('  S%d [%s/%s] %s  {%s}'%(s['n'],s['tier'],s['support'],s['claim'],','.join(s['citations'])))
    if r['scenarios']:
        print('  SCENARIOS (default=%s):'%r['default'])
        for sc in r['scenarios']:
            print('    -',sc['id'],':',json.dumps(sc,ensure_ascii=False)[:400])
    print('  UNSUPPORTED:',json.dumps(r['remains_unsupported'],ensure_ascii=False)[:1200])
