"""Try candidate quotes against the local texts through the builder's own resolver (second reader).
   python3 -I tmp/tl-02/ver2/tryq.py            runs the CANDS list below
Each candidate: (label, kind, args...)  kind 'OR' (quote, report, page) or 'LIB' (source id, quote, page)."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tmp', 'tl-02'))
os.environ['TL2_NOPAGES'] = '1'
import tl2lib as T
def tryq(label, c):
    try:
        r = T.resolve(label, c)
        print('OK  ', label, r.get('printed_page'), '@%s-%s' % (r['text_offset'], r['text_offset_end']), '|', r['quote'][:150])
        return r
    except Exception as e:
        print('FAIL', label, '|', str(e)[:300])
if __name__ == '__main__':
    spec = json.load(open(sys.argv[1], encoding='utf-8')) if len(sys.argv) > 1 else []
    for s in spec:
        if s[1] == 'OR':
            tryq(s[0], T.OR(s[2], s[3], s[4] if len(s) > 4 else None))
        else:
            tryq(s[0], T.LIB(s[2], s[3], s[4] if len(s) > 4 else None))
