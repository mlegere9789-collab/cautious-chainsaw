"""Review reader: python3 -I tmp/tl-03/audit/review.py T1-117 [T1-118 ...] [--all] [--after 350] [--before 120]
For every documented/supported/conflict sub-claim prints the claim, the missing numbers and lexical overlap with its quotes, and (flagged ones, or all with --all)
each cited quote with the text around it in the source file at the stored offset."""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
args = sys.argv[1:]
ALL = '--all' in args
if ALL: args.remove('--all')
A, B = 350, 120
for flag in ('--after', '--before'):
    if flag in args:
        i = args.index(flag); v = int(args[i + 1]); del args[i:i + 2]
        if flag == '--after': A = v
        else: B = v
rows = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(G, 'timeline_corrections', 'tl-03.jsonl'), encoding='utf-8')}
STOP = set('the a an of to in on at by for and or as was were is are be been with from that this it its his her their which who whom after before then than into over under between about not no but also he she they we i our out up down off may can could would should had has have did do does so such one two three four five six seven eight nine ten per them these those there here when where while during until near upon within without more most less other some any all each both either neither only just own same very said says say reports report row rows text source sources later earlier first last next day days jul jun july june 1863 1864 am pm approx approximately'.split())
def words(s):
    s = re.sub(r"[^a-z0-9'. ]", " ", s.lower())
    return [w.strip(".'") for w in s.split() if len(w.strip(".'")) > 2 and w.strip(".'") not in STOP]
def toks(s):
    s = re.sub(r'(?<=\d),(?=\d{3})', '', s)
    s = re.sub(r'(\d)\s*[.:]\s*(\d)', r'\1.\2', s)
    return re.findall(r'\d+(?:\.\d+)?', s)
def canon(t): return t.rstrip('0').rstrip('.') if '.' in t else t
_raw = {}
def collapse(s): return re.sub(r'\s+', ' ', s)
def ctx(c):
    p = os.path.join(ROOT, c['source_file'])
    if p not in _raw: _raw[p] = open(p, encoding='utf-8', newline='').read()
    t = _raw[p]; a, b = c['text_offset'], c['text_offset_end']
    return collapse(t[max(0, a - B):a]) + ' [[' + collapse(t[a:b]) + ']] ' + collapse(t[b:b + A])
for rid in args:
    r = rows[rid]; cites = {c['key']: c for c in r['citations']}
    print('=' * 110); print('%s [%s] %s' % (rid, r['verdict'], r['corrected_claim']['event'][:200]))
    for s in r['sub_claims']:
        if s['support'] not in ('supported', 'conflict') and not ALL: continue
        qs = ' '.join((cites[k].get('quote') or '') + ' ' + (cites[k].get('note') or '') for k in s['citations'] if k in cites)
        qt = set(canon(t) for t in toks(qs)); qraw = re.sub(r'\s+', ' ', qs)
        miss = [t for t in toks(s['claim']) if canon(t) not in qt and not re.search(r'(?<!\d)' + re.escape(t).replace(r'\.', r'\s*[.:,]?\s*') + r'(?!\d)', qraw)]
        qset = set(w[:5] for w in words(' '.join(cites[k].get('quote') or '' for k in s['citations'] if k in cites and cites[k]['source_id'] != 'COMPUTED'))); cw = words(re.sub(r'\([^)]*\)', '', s['claim']))
        ov = (sum(1 for w in cw if w[:5] in qset) / len(cw)) if cw else 1
        flag = bool(miss) or ov < 0.5
        print('(%d) [%s/%s] ov=%.2f miss=%s %s' % (s['n'], s['tier'], s['support'], ov, miss, '<<< FLAG' if flag else ''))
        print('     CLAIM: ' + s['claim'])
        if flag or ALL:
            for k in s['citations']:
                c = cites.get(k)
                if not c or c['source_id'] == 'COMPUTED': continue
                print('     <%s> %s p.%s :: %s' % (k, c['source_id'], c['printed_page'], ctx(c)))
