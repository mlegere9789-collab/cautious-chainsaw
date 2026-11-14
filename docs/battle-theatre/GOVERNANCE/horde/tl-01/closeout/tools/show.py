"""Print one row of timeline_corrections/tl-01.jsonl in readable form.  usage: python3 -I show.py T1-003 [T1-005 ...]"""
import json, sys, textwrap
G = '/home/user/cautious-chainsaw/docs/battle-theatre/GOVERNANCE'
rows = {json.loads(l)['id']: json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')}
def w(s, ind=2, width=170):
    return textwrap.fill(str(s), width=width, initial_indent=' ' * ind, subsequent_indent=' ' * (ind + 2))
for rid in sys.argv[1:]:
    r = rows[rid]; cc = r['corrected_claim']
    print('=' * 100); print(rid, r['verdict'], '| before:', r['before'], '| tier', cc['tier'])
    print(w('EVENT: ' + cc['event'])); print(w('UNIT: ' + cc['unit'])); print(w('PLACE: ' + cc['place']))
    tw = cc['time_window']; print(w('WINDOW: %s | %s -> %s' % (tw['text'], tw['start'], tw['end']))); print(w('BASIS: ' + tw['basis']))
    print(w('TEXT: ' + cc['text']))
    print('  SUBS:')
    for s in r['sub_claims']:
        print(w('[%d] %s | %s | %s | %s' % (s['n'], s['tier'], s['support'], ','.join(s['citations']), s['claim']), 4))
        if s.get('note'): print(w('NOTE: ' + s['note'], 8))
    print('  CITES:')
    for c in r['citations']:
        rid_ = c.get('report_id') or ''
        print(w('%s %s %s p.%s @%s: "%s"' % (c['key'], c['source_id'], rid_, c.get('printed_page'), c['text_offset'], c['quote']), 4))
        for k in ('reading', 'image_check', 'note', 'witness'):
            if c.get(k): print(w('%s: %s' % (k, c[k]), 8))
    for sc in r['scenarios']:
        print(w('SCENARIO %s [%s]: %s | %s | %s' % (sc['id'], sc['tier'], sc['value'], sc['basis'], ','.join(sc['citations'])), 4))
    print('  DEFAULT:', r['default'])
    print('  REMAINS:'); [print(w('- ' + x, 4)) for x in r['remains_unsupported']]
    print('  SEARCHED:'); [print(w('- ' + x, 4)) for x in r['searched']]
    print(w('RECHECK: ' + r['recheck_applied'])); print('  REGISTER:', r['register_proposed'], r['register_related'])
