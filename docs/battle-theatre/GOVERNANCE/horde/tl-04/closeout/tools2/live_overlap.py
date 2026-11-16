"""Coverage heuristic on the LIVE row data (rows_a .. rows_h resolved by build.py, nothing written):
documented, supported or conflict sub-claims whose content words (stems of 4 letters) are not in the quotes they cite.
    python3 -I tmp/tl-04/tools2/live_overlap.py [row ids]"""
import sys, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
import build as B
import tl4lib as T
B.load_rows()
cites, errs, nq = B.check(None)
print('citations', nq, 'problems', len(errs))
STOP = set('''about above after again against along also another around before being between brigade division corps regiment battery report reports according their there these those which while would could should through during until where because without within under later earlier first second third night evening morning afternoon gettysburg town hill ridge road pike july seed states stated reads said says carried shown given named place position army union confederate official records source texts text claim row rows hours hour approximately documented supported same other more most many some such only then than that this with from have has had were was are and for the its his her one two three four five scenario wikipedia page stone sentinels'''.split())
want = set(sys.argv[1:])
n = fl = 0
for rid, r in T.ROWS.items():
    if want and rid not in want:
        continue
    cs = cites[rid]
    for i, (claim, tier, support, keys, note) in enumerate(r['subs'], 1):
        if tier != 'documented' or support not in ('supported', 'conflict'):
            continue
        ks = [k for k in keys if cs[k]['source_id'] not in ('COMPUTED', 'PROJECT-DATA')]
        if not ks:
            continue
        n += 1
        qt = ' '.join((cs[k].get('quote') or '') + ' ' + (cs[k].get('author') or '') + ' ' + (cs[k].get('report_heading') or '') + ' ' + (cs[k].get('witness') or '') + ' ' + (cs[k].get('note') or '') + ' ' + (cs[k].get('reading') or '') for k in keys)
        q = set(w[:4] for w in re.sub(r'[^a-z0-9 ]', ' ', qt.lower()).split())
        words = [w for w in re.findall(r"[A-Za-z][A-Za-z']{3,}", claim) if w.lower() not in STOP]
        miss = [w for w in words if w.lower()[:4] not in q]
        if len(miss) >= 2 and len(miss) / max(1, len(words)) >= 0.2:
            fl += 1
            print('%s SUB%d %s | %s' % (rid, i, miss[:8], claim[:140]))
print('checked', n, 'flagged', fl)
