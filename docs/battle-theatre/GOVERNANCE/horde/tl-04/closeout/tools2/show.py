import json, sys, textwrap
G='/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE/'
rows=[json.loads(l) for l in open(G+'timeline_corrections/tl-04.jsonl',encoding='utf-8')]
want=set(sys.argv[1:])
full='--full' in want
want.discard('--full')
for r in rows:
    if want and r['id'] not in want: continue
    cc=r['corrected_claim']; tw=cc['time_window']
    print('='*100)
    print(r['id'],'| seed:',r['seed']['time_window_raw'],'|',r['seed']['tier'],'| before:',r['before']['status_effective'],'| VERDICT',r['verdict'],'| tier',cc['tier'])
    print('EVENT:',cc['event'])
    print('UNIT:',cc['unit'])
    print('PLACE:',cc['place'])
    print('WHEN:',tw['text'],'|',tw['start'],'->',tw['end'])
    if full: print('TEXT:',cc['text'])
    for s in r['sub_claims']:
        print('  SUB%d [%s/%s] %s  {%s}%s'%(s['n'],s['tier'],s['support'],s['claim'],','.join(s['citations']),(' NOTE: '+s['note']) if s.get('note') else ''))
    for sc in r['scenarios']:
        print('  SCN',sc['id'],sc['tier'],sc['value'],'<-',sc['basis'][:150])
    for x in r['remains_unsupported']: print('  REMAINS:',x)
    print('  REGISTER:',r['register_proposed'],'| related',r['register_related'])
    print('  CITES:',', '.join('%s=%s:%s p.%s'%(c['key'],c['source_id'],c.get('report_id') or '',c.get('printed_page')) for c in r['citations']))
