"""Verify every waypoint quote against the local source text: case, punctuation and OCR line-break differences folded.
Prints each quote that is not found; exit code 1 if any.   usage: python check_quotes.py [defs_module]"""
import json, os, re, sys, importlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'pilot'))

def fold(s):
    s = s.replace('’', "'").replace('‘', "'").replace('�', "'")
    s = re.sub(r'\[\[p\.\d+\]\]', ' ', s)
    return re.sub(r'[^a-z0-9]+', '', s.lower())

def load_sources():
    d = json.load(open(os.path.join(HERE, '..', 'pilot', 'sources.json'), encoding='utf-8'))
    return {s['id']: s for s in d['sources']}

def check(mod):
    src = load_sources(); cache = {}
    bad = []; n = 0
    for uid, wps in mod.WP.items():
        for w in wps:
            q = w['quote']; n += 1
            ok = False; seen = []
            for ref in w['srcs']:
                sid = ref.split('#')[0]
                s = src.get(sid)
                if not s or not s.get('text'):
                    continue
                if sid not in cache:
                    p = os.path.join(ROOT, s['text'])
                    cache[sid] = fold(open(p, encoding='utf-8', errors='replace').read()) if os.path.exists(p) else ''
                seen.append(sid)
                if fold(q) in cache[sid]:
                    ok = True
            if not ok:
                bad.append((w['wid'], q, seen))
    return n, bad

if __name__ == '__main__':
    name = sys.argv[1] if len(sys.argv) > 1 else 'defs_passA'
    D = importlib.import_module(name)
    n, bad = check(D)
    print(f'{n} quotes checked, {len(bad)} not found')
    for b in bad:
        print('  NOT FOUND', b)
    sys.exit(1 if bad else 0)
