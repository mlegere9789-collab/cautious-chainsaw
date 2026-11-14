"""Condensed reader: python3 -I tmp/tl-02/audit/show.py T1-058 [T1-059 ...] [--q N]  (quote chars, default 260)"""
import os, sys, json, textwrap
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
args = [a for a in sys.argv[1:]]
Q = 260
if '--q' in args:
    i = args.index('--q'); Q = int(args[i + 1]); del args[i:i + 2]
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-02.jsonl'), encoding='utf-8')}
seed = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_seed.jsonl'), encoding='utf-8')}
tv = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_verified.jsonl'), encoding='utf-8')}
pre = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'horde', 'tl-02', 'results.pre-closeout.jsonl'), encoding='utf-8')}
def w(s, ind=0):
    print(textwrap.fill(str(s), width=150, initial_indent=' ' * ind, subsequent_indent=' ' * (ind + 2)))
for rid in args:
    r = rows[rid]; s = seed[rid]; t = tv[rid]; p = pre[rid]
    print('=' * 150)
    print('%s  VERDICT=%s  before=%s (shard verdict %s, tier %s)  corrected tier=%s' % (rid, r['verdict'], t['status_effective'], p.get('verdict'), p.get('tier'), r['corrected_claim']['tier']))
    w('SEED [%s | %s]: %s' % (s['tier'], s['time_window_raw'], s['text_raw']))
    w('SHARD NOTES (pre): ' + (p.get('notes') or ''))
    if p.get('subclaims'): w('SHARD not_supported (pre): ' + json.dumps(p['subclaims'].get('not_supported'), ensure_ascii=False))
    cc = r['corrected_claim']
    print('--- CORRECTED')
    w('event: ' + cc['event']); w('unit: ' + str(cc['unit'])); w('place: ' + str(cc['place']))
    tw = cc['time_window']; w('time: %s | start=%s end=%s | basis: %s' % (tw['text'], tw.get('start'), tw.get('end'), tw['basis']))
    w('text: ' + cc['text']); w('marking: ' + str(cc.get('marking')))
    print('--- TIER CHANGE: %s' % json.dumps(r['tier_change'], ensure_ascii=False))
    print('--- SUB-CLAIMS')
    for sc in r['sub_claims']:
        w('[%s] %s/%s %s  <%s>' % (sc['n'], sc['tier'], sc['support'], sc['claim'], ','.join(sc['citations'])), 0)
        if sc.get('note'): w('note: ' + sc['note'], 6)
    print('--- CITATIONS')
    for c in r['citations']:
        if c['source_id'] == 'COMPUTED':
            w('(%s) COMPUTED %s = %s | %s' % (c['key'], c['what'], c['value'], c['method'][:200]))
        else:
            w('(%s) %s %s p.%s @%s [%s]: "%s"' % (c['key'], c['source_id'], c.get('report_id', ''), c.get('printed_page'), c['text_offset'], c.get('author', ''), c['quote'][:Q]))
    print('--- SCENARIOS')
    for sc in r['scenarios']:
        w('%s [%s] %s | basis: %s <%s>' % (sc['id'], sc['tier'], sc['value'], sc['basis'], ','.join(sc['citations'])))
    print('--- DEFAULT: %s' % r['default'])
    print('--- REMAINS UNSUPPORTED')
    for x in r['remains_unsupported']: w('- ' + x)
    print('--- RECHECK APPLIED'); w(r['recheck_applied'] or '')
    print('--- SEARCHED: %d searches, %d hits total; zero-hit: %s' % (len(r['searched']), sum((x.get('hits') or 0) for x in r['searched']), [x['pattern'][:50] for x in r['searched'] if not x.get('hits')]))
    print('--- REGISTER: proposed=%s related=%s' % (r['register_proposed'], r['register_related']))
