"""Event mining from the Official Records corpus (historian-src/raw/or27 + historian-src/corpus/or27): sentence-level EVENT MENTIONS with time, type, actors
(units and persons linked by the historian pipeline), source and page. This is the seed of the event database, not a finished list.

usage: python extract_events.py --seed 20261019 --n 100
writes: events/corpus-yield.json (counts over the whole corpus), events/pilot-100.candidates.jsonl (the 100 stratified draws, UNREVIEWED)
Rule version: ev-rules/1.  All offsets are UTF-16 code units in the corpus; here Python str offsets are used on the same text (checked: the corpus text is BMP only)."""
import argparse, collections, json, os, random, re, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); BASE = os.path.abspath(os.path.join(HERE, '..')); ROOT = os.path.abspath(os.path.join(BASE, '..', '..', '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--seed', type=int, default=20261019); ap.add_argument('--n', type=int, default=100); a = ap.parse_args()
t0 = time.time()
RAW = os.path.join(ROOT, 'historian-src', 'raw', 'or27'); COR = os.path.join(ROOT, 'historian-src', 'corpus', 'or27')

P = {}
for l in open(os.path.join(RAW, 'passages.jsonl'), encoding='utf-8'):
    p = json.loads(l); P[p['id']] = p
M = collections.defaultdict(list)
for l in open(os.path.join(RAW, 'mentions.jsonl'), encoding='utf-8'):
    m = json.loads(l); M[m['pid']].append(m)
TC = json.load(open(os.path.join(COR, 'time_claims.json'), encoding='utf-8'))
F = {f: i for i, f in enumerate(TC['fields'])}
docs = {r['id']: r for r in json.load(open(os.path.join(COR, 'reports.json'), encoding='utf-8'))['reports']}

TYPES = [   # (type, regex), first match wins
 ('casualty_killed',  r'\b(killed|mortally wounded|fell dead|shot dead|instantly killed|was slain)\b'),
 ('casualty_wounded', r'\b(wounded|severely wounded|disabled)\b'),
 ('capture',          r'\b(captured|surrendered|taken prisoners?|made prisoners?|took \d+ prisoners?)\b'),
 ('fire_open',        r'\b(opened (?:a |an |the |with )?(?:\w+ )?(?:fire|upon|on)|commenced firing|began firing|opened fire)\b'),
 ('fire_cease',       r'\b(ceased firing|ceased to fire|silenced|fire (?:ceased|slackened))\b'),
 ('order',            r'\b(ordered|directed|instructed|commanded to|was ordered|received orders?|received an order)\b'),
 ('attack',           r'\b(charged|assaulted|attacked|assault|made an attack|advanced to the attack|stormed)\b'),
 ('repulse',          r'\b(repulsed|driven back|fell back|retreated|retired|withdrew|broke and|gave way|were driven)\b'),
 ('move',             r'\b(moved|marched|advanced|arrived|reached|crossed|took position|went into position|formed|deployed|relieved|bivouacked|halted|massed)\b'),
]
TYPES = [(t, re.compile(r, re.I)) for t, r in TYPES]
def classify(s):
    for t, rx in TYPES:
        m = rx.search(s)
        if m: return t, m.group(0)
    return None, None

def sentences(p):
    sb = p['sb'] + [len(p['text'])]
    return [(sb[i], sb[i + 1]) for i in range(len(sb) - 1)]

def page_at(p, off):
    pg = None
    for o, page, leaf, rd in sorted(p['pg']):
        if o <= off: pg = page
    return pg if pg is not None else (p['pg'][0][1] if p['pg'] else None)

# ---- timed event mentions: one per time claim of the Gettysburg days ----
timed = []
for r in TC['rows']:
    if r[F['scope']] != 'gettysburg' or r[F['day']] not in ('1863-07-01', '1863-07-02', '1863-07-03'): continue
    if r[F['kind']] not in ('clock', 'oclock', 'noon'): continue
    p = P.get(r[F['passage']])
    if not p: continue
    ss, se = r[F['ss']], r[F['se']]
    sent = ' '.join(p['text'][ss:se].split())
    typ, verb = classify(sent)
    if not typ: continue
    timed.append((r, p, ss, se, sent, typ, verb))

# ---- untimed named-casualty mentions of the Gettysburg days ----
untimed = []
seen_sent = {(t[1]['id'], t[2]) for t in timed}
for pid, p in P.items():
    if p['scope'] != 'core' or p['day'] not in (1, 2, 3): continue
    for ss, se in sentences(p):
        if (pid, ss) in seen_sent: continue
        sent = ' '.join(p['text'][ss:se].split())
        if len(sent) < 40: continue
        typ, verb = classify(sent)
        if typ in ('casualty_killed',) and any(m['kind'] == 'person' and ss <= m['s'] and m['e'] <= se for m in M[pid]):
            untimed.append((None, p, ss, se, sent, typ, verb))

# ---- yield over the whole corpus (counts) ----
yld = dict(timed_event_mentions=len(timed), by_day=collections.Counter(t[0][F['day']] for t in timed),
           by_type=collections.Counter(t[5] for t in timed), untimed_named_killed=len(untimed), seconds=round(time.time() - t0, 1))
# the wider pool: every sentence of every core-scope passage (reports, dispatches, orders) with an event trigger, whatever its day (day resolution is a later step)
wide = collections.Counter(); wide_named = 0; wide_total = 0
for pid, p in P.items():
    if p['scope'] != 'core': continue
    for ss, se in sentences(p):
        sent = p['text'][ss:se]
        if len(sent) < 40: continue
        typ, verb = classify(sent)
        if not typ: continue
        wide[typ] += 1; wide_total += 1
        if any(m['kind'] in ('unit', 'regiment', 'battery', 'brigade', 'division', 'corps') or m['id'].startswith(('U-', 'C-', 'P:')) for m in M[pid] if ss <= m['s'] and m['e'] <= se): wide_named += 1
yld['wide_pool'] = dict(sentences_with_trigger=wide_total, with_a_linked_unit_or_person=wide_named, by_type=dict(wide))
yld['wide_pool_note'] = 'upper bound of event MENTIONS in OR27 core passages before day resolution and de-duplication; one sentence can hold several events and one event is told by several reports'
# distinct (day, minute, doc) clusters as an upper bound on distinct events behind the mentions
clusters = {(t[0][F['day']], t[0][F['min']], t[0][F['doc']]) for t in timed}
yld['distinct_day_minute_doc_clusters'] = len(clusters)
yld['reports_with_a_timed_mention'] = len({t[0][F['doc']] for t in timed})
yld['reports_in_corpus'] = len(docs)

def event_row(i, kind, r, p, ss, se, sent, typ, verb):
    d = docs.get(p['doc'], {})
    ents = [m for m in M[p['id']] if ss <= m['s'] and m['e'] <= se]
    actors = []; seen = set()
    for m in ents:
        if m['id'] in seen: continue
        seen.add(m['id']); actors.append(dict(id=m['id'], label=m['label'], kind=m['kind'], link_tier=m['tier']))
    ev = dict(id=f'EV-OR27-{i:04d}', schema='bt-fidelity/event/1', rule_version='ev-rules/1',
              day=(int(r[F['day']][-2:]) if r else p['day']),
              time=(dict(stated=r[F['text']], minute_of_day=r[F['min']], ampm=r[F['ampm']], modifier=r[F['mod']], tol_min=r[F['tol']], day_basis=r[F['day_basis']], clock='LMT-assumed (witness watch time; see docs/time)',
                         label='Documented-as-stated (a witness clock; the event minute carries the +-25 min or wider uncertainty of docs/time)') if r else None),
              type=typ, trigger=verb, text=sent, actors=actors,
              source=dict(doc=p['doc'], passage=p['id'], page=page_at(p, ss), cite=d.get('cite'), author=(d.get('author') or {}).get('raw'), unit=d.get('unit'), side=p['side'], written=(d.get('written') or {}).get('iso'),
                          perspective=(d.get('persp') or {}).get('label'), report_no=d.get('no')),
              extraction=dict(method='rule', multi_event_sentence=None), review=dict(status='unreviewed'))
    return ev

rng = random.Random(a.seed)
# stratified draw: 3 days x 3 groups of types ; the untimed killed get their own stratum (10)
groups = {'fire_attack_repulse': {'fire_open', 'fire_cease', 'attack', 'repulse'}, 'move_order': {'move', 'order'}, 'casualty_capture': {'casualty_killed', 'casualty_wounded', 'capture'}}
picks = []
per = (a.n - 10) // 9
for day in ('1863-07-01', '1863-07-02', '1863-07-03'):
    for g, ts in groups.items():
        pool = [t for t in timed if t[0][F['day']] == day and t[5] in ts]
        # one mention per (doc, sentence) and no two mentions from the same report adjacent: sample without replacement
        rng.shuffle(pool)
        got = []; seen_docs = collections.Counter()
        for t in pool:
            if seen_docs[t[0][F['doc']]] >= 2: continue
            seen_docs[t[0][F['doc']]] += 1; got.append(t)
            if len(got) == per: break
        picks += got
rng.shuffle(untimed); picks += untimed[:a.n - len(picks)]
rows = [event_row(i + 1, 'timed' if t[0] else 'untimed', *t) for i, t in enumerate(picks)]
os.makedirs(os.path.join(BASE, 'events'), exist_ok=True)
with open(os.path.join(BASE, 'events', 'pilot-100.candidates.jsonl'), 'w', encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r, ensure_ascii=False) + '\n')
yld['pilot_draw'] = dict(n=len(rows), seed=a.seed, per_stratum=per, timed=sum(1 for t in picks if t[0]), untimed=sum(1 for t in picks if not t[0]))
yld = json.loads(json.dumps(yld, default=dict))
json.dump(yld, open(os.path.join(BASE, 'events', 'corpus-yield.json'), 'w'), indent=1)
print(json.dumps(yld, indent=1))
