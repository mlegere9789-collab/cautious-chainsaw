"""tl-02 close-out builder, incremental mode.
Runs build2.write_all() but re-uses the search results of the last full run (horde/tl-02/search_log.jsonl) for every search whose
scope, pattern, near-pattern and window are unchanged and whose log status is "run"; only new or changed searches are executed.
The reuse is refused when any text of the corpus is newer than the log.

    python3 -I tmp/tl-02/build3.py --write      incremental write (keep the number of new searches small: a handful is a few seconds)
    python3 -I tmp/tl-02/build3.py --plan       print how many searches would be re-used and how many run (no output files written)
    python3 -I tmp/tl-02/build3.py --selftest   test the key and cache logic on an in-memory log
"""
import os, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tl2lib as T
import build2
import ws9find

LOG = os.path.join(T.G, 'horde', 'tl-02', 'search_log.jsonl')


def scope_str(s):
    return s['scope'] if isinstance(s['scope'], str) else ', '.join(s['scope'])


def key_of_spec(s):
    return (scope_str(s), s['pattern'], s['near'], s['win'] if s['near'] else None)


def key_of_entry(e):
    return (e['scope'], e['pattern'], e['near'], e['window_chars'] if e['near'] else None)


def corpus_newest():
    newest = 0.0
    for p in ws9find.sources().values():
        try:
            newest = max(newest, os.path.getmtime(p))
        except OSError:
            pass
    from or27_lib import raw_path
    for part in (1, 2, 3):
        newest = max(newest, os.path.getmtime(raw_path(part)))
    return newest


def load_cache(entries):
    cache = {}
    for e in entries:
        if e.get('status') == 'run' and e.get('hits') is not None:
            cache[key_of_entry(e)] = e
    return cache


def make_runner(cache, orig, stats):
    def cached(specs):
        res, todo = {}, []
        for s in specs:
            e = cache.get(key_of_spec(s))
            if e is not None and not s.get('case'):
                res[id(s)] = dict(hits=e['hits'], by_source=collections.OrderedDict(e.get('hits_by_source') or {}),
                                  sample=[(x['source'], x['offset'], x['context']) for x in (e.get('sample') or [])])
            else:
                todo.append(s)
        stats['reused'] = len(specs) - len(todo)
        stats['run'] = len(todo)
        print('searches: %d re-used from the last run, %d to run now' % (stats['reused'], stats['run']), flush=True)
        if todo and os.environ.get('TL2_PLAN'):
            for s in todo:
                print('   new/changed:', key_of_spec(s))
            return {id(s): dict(hits=None, by_source=collections.OrderedDict(), sample=[]) for s in specs}
        if todo:
            res.update(orig(todo))
        return res
    return cached


def selftest():
    class S(dict):
        pass
    s1 = dict(scope='OR27', pattern='abc', near='x', win=100, case=False, what='w')
    s2 = dict(scope=['A', 'B'], pattern='def', near=None, win=300, case=False, what='w')
    e1 = dict(scope='OR27', pattern='abc', near='x', window_chars=100, status='run', hits=5, hits_by_source={'OR27-pt1': 5}, sample=[dict(source='OR27-pt1', offset=7, context='ctx')])
    e2 = dict(scope='A, B', pattern='def', near=None, window_chars=None, status='run', hits=0, hits_by_source={}, sample=[])
    e3 = dict(scope='A, B', pattern='zzz', near=None, window_chars=None, status='not run in this build', hits=None, hits_by_source={}, sample=[])
    cache = load_cache([e1, e2, e3])
    assert len(cache) == 2, cache
    stats = {}
    ran = []
    s3 = dict(scope='LIB', pattern='new', near=None, win=300, case=False, what='w')

    def orig(todo):
        ran.extend(todo)
        return {id(x): dict(hits=1, by_source=collections.OrderedDict(), sample=[]) for x in todo}
    r = make_runner(cache, orig, stats)([s1, s2, s3])
    assert stats == {'reused': 2, 'run': 1}, stats
    assert r[id(s1)]['hits'] == 5 and r[id(s1)]['sample'][0] == ('OR27-pt1', 7, 'ctx'), r[id(s1)]
    assert r[id(s2)]['hits'] == 0 and r[id(s3)]['hits'] == 1 and ran == [s3]
    print('selftest ok')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        selftest()
        sys.exit(0)
    if not ('--write' in sys.argv or '--plan' in sys.argv):
        print(__doc__)
        sys.exit(1)
    if not os.path.exists(LOG):
        print('no search log: run the full build first (tools/horde/bench.sh python3 -I tmp/tl-02/build2.py --write)')
        sys.exit(1)
    entries = [json.loads(l) for l in open(LOG, encoding='utf-8') if l.strip()]
    cache = load_cache(entries)
    if not cache:
        print('the search log holds no completed searches (dry run): run the full build first')
        sys.exit(1)
    if os.path.getmtime(LOG) < corpus_newest():
        print('a text of the corpus is newer than the search log: results cannot be re-used, run the full build under the lock')
        sys.exit(1)
    if '--plan' in sys.argv:
        os.environ['TL2_PLAN'] = '1'
    stats = {}
    T.run_searches = make_runner(cache, T.run_searches, stats)
    if '--plan' in sys.argv:
        build2.load_rows()
        specs = [s for r in T.ROWS.values() for s in r['searched']]
        T.run_searches(specs)
        sys.exit(0)
    build2.write_all()
