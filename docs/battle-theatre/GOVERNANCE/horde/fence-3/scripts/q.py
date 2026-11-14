import sys, re, argparse
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
import corpus, lib
ap = argparse.ArgumentParser()
ap.add_argument('rx')
ap.add_argument('--only', default='')
ap.add_argument('--ctx', type=int, default=220)
ap.add_argument('--max', type=int, default=6)
ap.add_argument('--case', action='store_true')
ap.add_argument('--skip', default='')   # comma list of doc prefixes to skip
ap.add_argument('--groups', default='or,sv,lib,nps')
a = ap.parse_args()
flags = 0 if a.case else re.I
only = [x for x in a.only.split(',') if x] or None
skip = [x for x in a.skip.split(',') if x]
groups = a.groups.split(',')
def keep(did):
    return not any(did.startswith(s) for s in skip)
n = 0
if 'or' in groups and (not only or any(o.startswith('OR27') for o in only)):
    parts = (1, 2, 3)
    for o in (only or []):
        if o.startswith('OR27-pt'):
            parts = (int(o[-1]),)
    for h in corpus.grep_or(a.rx, parts, a.ctx, a.max, flags):
        corpus.show(h); n += 1
if 'sv' in groups and (not only or any(o in lib.SF.SI.VOLUMES for o in only)):
    vols = [o for o in (only or []) if o in lib.SF.SI.VOLUMES] or None
    for h in corpus.grep_sv(a.rx, vols, a.ctx, a.max, flags):
        if keep(h['doc']):
            corpus.show(h); n += 1
if 'lib' in groups or 'nps' in groups:
    C = corpus.Corpus(load=tuple(g for g in groups if g in ('ws9', 'nps')) or ('ws9', 'nps')) if False else corpus.Corpus()
    ons = [o for o in (only or []) if not o.startswith('OR27') and o not in lib.SF.SI.VOLUMES] or None
    for h in C.grep(a.rx, ons, a.ctx, a.max, flags):
        if not keep(h['doc']):
            continue
        if h['kind'] == 'ws9' and 'lib' not in groups: continue
        if h['kind'] == 'nps' and 'nps' not in groups: continue
        corpus.show(h); n += 1
print('--- %d hits shown' % n)
