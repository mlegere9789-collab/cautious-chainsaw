"""Quick search of the Official Records (OR) and the local text library.
    python3 -I tmp/tl-04/q.py "regex" [-s OR|OR1|OR2|OR3|LIB|<source id prefix> ...] [-n "near regex"] [-w WIN] [-C CTX] [--max N] [--case]
Defaults: -s OR (all three parts).  Context shown is the normalised text around the hit; the citation is report id and printed page."""
import os, re, sys, argparse
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', '..', 'tools', 'bt'))
import or27_find as F
import ws9find as W

ap = argparse.ArgumentParser()
ap.add_argument('pattern')
ap.add_argument('-s', '--src', action='append')
ap.add_argument('-n', '--near')
ap.add_argument('-w', '--win', type=int, default=400)
ap.add_argument('-C', '--ctx', type=int, default=250)
ap.add_argument('--max', type=int, default=12)
ap.add_argument('--case', action='store_true')
a = ap.parse_args()
fl = 0 if a.case else re.I
rx = re.compile(a.pattern, fl)
nr = re.compile(a.near, fl) if a.near else None
srcs = a.src or ['OR']
total = 0


def show(label, ntext, off, m, cite):
    s = max(0, m.start() - a.ctx)
    e = min(len(ntext), m.end() + a.ctx)
    print('[%s] %s' % (label, cite))
    print('   ...' + ntext[s:m.start()] + '<<' + m.group(0) + '>>' + ntext[m.end():e] + '...')


exp = []
for sc in srcs:
    for x in sc.split(','):
        exp.append(x.strip())
srcs = exp
for sc in srcs:
    if sc.upper() in ('OR', 'OR1', 'OR2', 'OR3'):
        parts = (1, 2, 3) if sc.upper() == 'OR' else (int(sc[-1]),)
        for p in parts:
            P = F.get_part(p)
            n = 0
            for m in rx.finditer(P.ntext):
                if m.end() == m.start():
                    continue
                if nr and not nr.search(P.ntext[max(0, m.start() - a.win):m.end() + a.win]):
                    continue
                os_, oe = P.orig_span(m.start(), m.end())
                c = P.cite(os_, oe)
                show('OR27 pt%d' % p, P.ntext, os_, m, c['cite'].replace('OR Ser.I vol.27 ', '') + ' @%d' % os_)
                n += 1
                total += 1
                if n >= a.max:
                    break
    else:
        if sc.upper() == 'LIB':
            sids = [k for k in W.sources() if not re.match(r'(ADAMS-SENT|GBG-COMP|OR-25|OR-29|ORSER3)', k)]
        elif sc.upper() == 'NEWS':
            sids = [k for k in W.sources() if re.match(r'(ADAMS-SENT|GBG-COMP)', k)]
        else:
            allk = list(W.sources())
            sids = []
            for s in [sc]:
                sids += [k for k in allk if k == s or k.startswith(s)]
        for sid in sids:
            text, ntext, nmap, path = W.load(sid)
            n = 0
            for m in rx.finditer(ntext):
                if m.end() == m.start():
                    continue
                if nr and not nr.search(ntext[max(0, m.start() - a.win):m.end() + a.win]):
                    continue
                show(sid, ntext, nmap[m.start()], m, '@%d' % nmap[m.start()])
                n += 1
                total += 1
                if n >= a.max:
                    break
print('%d hit(s) shown' % total)
