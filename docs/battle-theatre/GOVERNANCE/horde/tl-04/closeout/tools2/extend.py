"""Propose quote extensions: for documented sub-claims whose content words are not all in the quotes they cite, widen each cited quote by whole
sentences of the source text (verbatim slice of the normalised text) until the missing words are covered.  Prints the proposals for reading;
nothing is written to the row files.   python3 -I tmp/tl-04/tools2/extend.py [row ids...]   (writes ext/extend_proposals.json)"""
import sys, os, json, re
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, os.path.join(ROOT, 'tools', 'bt'))
from or27_lib import build_nview, norm_query
APOS = str.maketrans({'’': "'", '‘': "'", '`': "'", '´': "'", '“': '"', '”': '"'})
G = os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE')
rows = [json.loads(l) for l in open(os.path.join(G, 'timeline_corrections/tl-04.jsonl'), encoding='utf-8')]
want = set(sys.argv[1:])
STOP = set('''about above after again against along also another around before being between brigade division corps regiment battery report reports according their there these those which while would could should through during until where because without within under later earlier first second third night evening morning afternoon gettysburg town hill ridge road pike july seed states stated reads said says carried shown given named place position army union confederate official records source texts text claim row rows hours hour approximately documented supported same other more most many some such only then than that this with from have has had were was are and for the its his her one two three four five scenario wikipedia page stone sentinels'''.split())
SENT = re.compile(r'(?<=[.?!;])\s+(?=[A-Z"\'(\[])')
raw_cache = {}


def stems(t):
    return set(w[:4] for w in re.sub(r'[^a-z0-9 ]', ' ', t.lower()).split())


def missing(claim, text):
    q = stems(text)
    words = [w for w in re.findall(r"[A-Za-z][A-Za-z']{3,}", claim) if w.lower() not in STOP]
    return [w for w in words if w.lower()[:4] not in q]


def window(c, bef=1500, aft=1500):
    p = os.path.join(ROOT, c['source_file'])
    if p not in raw_cache:
        raw_cache[p] = open(p, encoding='utf-8', errors='replace', newline='').read()
    raw = raw_cache[p]
    a, b = c['text_offset'], c['text_offset_end']
    pre, _ = build_nview(raw[max(0, a - bef * 2):a])
    mid, _ = build_nview(raw[a:b])
    post, _ = build_nview(raw[b:b + aft * 2])
    return pre.translate(APOS)[-bef:], mid.translate(APOS), post.translate(APOS)[:aft]


def sentences_before(pre, n):
    """text of the last n whole sentences of pre (pre may start mid-sentence: the first fragment is dropped)"""
    parts = SENT.split(pre)
    if len(parts) <= 1:
        return ''
    return ' '.join(parts[-n:]) if n < len(parts) else ' '.join(parts[1:])


def sentences_after(post, n):
    parts = SENT.split(post)
    return ' '.join(parts[:n])


out = {}
for r in rows:
    if want and r['id'] not in want:
        continue
    cit = {c['key']: c for c in r['citations']}
    for s in r['sub_claims']:
        if s['tier'] != 'documented' or s['support'] not in ('supported', 'conflict'):
            continue
        ks = [k for k in s['citations'] if cit[k]['source_id'] not in ('COMPUTED', 'PROJECT-DATA')]
        if not ks:
            continue
        qt = ' '.join((cit[k].get('quote') or '') + ' ' + (cit[k].get('author') or '') + ' ' + (cit[k].get('report_heading') or '') + ' ' + (cit[k].get('witness') or '') + ' ' + (cit[k].get('note') or '') + ' ' + (cit[k].get('reading') or '') for k in s['citations'] if k in cit)
        miss = missing(s['claim'], qt)
        words = [w for w in re.findall(r"[A-Za-z][A-Za-z']{3,}", s['claim']) if w.lower() not in STOP]
        if not (len(miss) >= 2 and len(miss) / max(1, len(words)) >= 0.2):
            continue
        props = []
        left = list(miss)
        for k in ks:
            c = cit[k]
            pre, mid, post = window(c)
            best = None
            for tot in range(0, 7):
                for i in range(0, tot + 1):
                    j = tot - i
                    pb = sentences_before(pre, i) if i else ''
                    pa = sentences_after(post, j) if j else ''
                    ext = (pb + ' ' + mid + ' ' + pa).strip()
                    got = [w for w in left if w.lower()[:4] in stems(ext)]
                    if got and (best is None or len(got) > best[0]):
                        best = (len(got), i, j, ext, pb, pa, got)
                if best and best[0] == len(left):
                    break
            if best:
                props.append(dict(key=k, i=best[1], j=best[2], added_before=best[4], added_after=best[5], covers=best[6], new_quote=best[3]))
        out['%s:%d' % (r['id'], s['n'])] = dict(claim=s['claim'], missing=miss, proposals=props)
json.dump(out, open(os.path.join(ROOT, 'tmp/tl-04/ext/extend_proposals.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for k, v in out.items():
    print('=====', k, '| missing', v['missing'][:8])
    print('  CLAIM:', v['claim'][:220])
    for p in v['proposals']:
        print('  -> %s (+%d before, +%d after) covers %s' % (p['key'], p['i'], p['j'], p['covers']))
        if p['added_before']: print('     BEFORE+:', p['added_before'][-260:])
        if p['added_after']: print('     AFTER+ :', p['added_after'][:260])
print(len(out), 'sub-claims with proposals')
