import json, sys, re
import os
P = os.environ.get('SHOWP', '/home/user/cautious-chainsaw/tmp/fence-3/data/r2_try.jsonl')
q = int(sys.argv[2]) if len(sys.argv) > 2 else 420
nn = int(sys.argv[3]) if len(sys.argv) > 3 else 200
for l in open(P):
    d = json.loads(l)
    if d['schedule_id'] not in sys.argv[1].split(','):
        continue
    print('=' * 100)
    print(d['id'], d['printed']['object'], '|', d['printed']['from_state'], '->', d['printed']['to_state'], '|', d['printed']['time'], '|', d['printed']['trigger'], '| keys', d['printed']['source_keys'])
    print('VERDICT', d['verdict'], d['status'], '| register', d['register'])
    print('CORRECTED:', d['corrected_claim'])
    for s in d['subclaims']:
        print('--- %s [%s/%s] %s' % (s['sc'], s['tier'], s['support'], s['kind']))
        print('   CLAIM:', s['claim'])
        if s.get('why'): print('   WHY:', s['why'][:500])
        for c in s['cites']:
            cc = d['citations'][c]
            print('   (%s) %s p.%s | "%s"' % (c, cc['source_id'], cc.get('printed_page') or cc.get('pdf_page'), re.sub(r'\s+', ' ', cc['quote'])[:q]))
            if nn and cc.get('note'): print('        note:', cc['note'][:nn])
    print('UNSUPPORTED:', d['unsupported'])
    print('BLOCKED:', json.dumps(d['blocked_host'])[:600])
    print('ROUND2:', d.get('round2'))
