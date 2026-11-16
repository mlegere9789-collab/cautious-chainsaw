"""tl-02 close-out builder, incremental by source (2026-11-15).
Hit counts are additive over sources. When the corpus has gained texts since the last full run (here: the 1989 study and the 1863 almanac), the
hit counts of every unchanged search are taken from the last log and the hits found in the NEW texts only are added; searches that are new or
changed run over the whole corpus. The result equals a full run (checked on a sample: --verify N runs N old searches in full and compares).
    python3 -I tmp/tl-02/build4.py --plan | --measure | --verify N | --write"""
import os, sys, json, time, resource, collections, random
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import tl2lib as T
import build2, build3
import ws9find

LOG_OLD = os.environ.get('TL2_OLDLOG') or os.path.join(T.G, 'horde', 'tl-02', 'search_log.jsonl')   # the log of the last full run (2026-11-14); it must not have been rewritten yet


def cpu():
    r = resource.getrusage(resource.RUSAGE_SELF)
    return r.ru_utime + r.ru_stime


def new_sources(logpath):
    lm = os.path.getmtime(logpath)
    return sorted(sid for sid, p in ws9find.sources().items() if os.path.getmtime(p) > lm)


def make_runner(cache, orig, new_sids, stats):
    def runner(specs):
        res, todo, addl = {}, [], []
        for s in specs:
            e = cache.get(build3.key_of_spec(s))
            if e is not None and not s.get('case'):
                res[id(s)] = dict(hits=e['hits'], by_source=collections.OrderedDict(e.get('hits_by_source') or {}),
                                  sample=[(x['source'], x['offset'], x['context']) for x in (e.get('sample') or [])])
                extra = [sid for sid in (T.scope_sids(s['scope']) if s['scope'] != 'OR27' else []) if sid in new_sids]
                if extra:
                    addl.append((s, extra))
            else:
                todo.append(s)
        stats.update(reused=len(specs) - len(todo), new=len(todo), added_to_old=len(addl))
        print('searches: %d re-used, %d to run in full, %d old ones get the hits of the new texts' % (stats['reused'], len(todo), len(addl)), flush=True)
        if todo:
            res.update(orig(todo))
        clones = []
        for s, extra in addl:
            c = dict(s)
            c['scope'] = extra
            clones.append((s, c))
        if clones:
            r2 = orig([c for _, c in clones])
            for s, c in clones:
                x, r = r2[id(c)], res[id(s)]
                r['hits'] += x['hits']
                for k, v in x['by_source'].items():
                    r['by_source'][k] = r['by_source'].get(k, 0) + v
                for smp in x['sample']:
                    if len(r['sample']) < 3:
                        r['sample'].append(smp)
        return res
    return runner


if __name__ == '__main__':
    mode = sys.argv[1] if len(sys.argv) > 1 else ''
    entries = [json.loads(l) for l in open(LOG_OLD, encoding='utf-8') if l.strip()]
    cache = build3.load_cache(entries)
    new_sids = new_sources(LOG_OLD)
    print('old log %s: %d completed searches; texts newer than it: %s' % (os.path.relpath(LOG_OLD, HERE), len(cache), new_sids))
    stats = {}
    orig = T.run_searches
    T.run_searches = make_runner(cache, orig, new_sids, stats)
    build2.load_rows()
    specs = [s for r in T.ROWS.values() for s in r['searched']]
    if mode in ('--plan', '--measure'):
        t0 = cpu()
        if mode == '--plan':
            for s in specs:
                if build3.key_of_spec(s) not in cache:
                    print('   new/changed:', build3.key_of_spec(s)[:3])
            print('total searches', len(specs))
            sys.exit(0)
        T.run_searches(specs)
        print('CPU seconds for the search phase: %.1f' % (cpu() - t0))
        sys.exit(0)
    if mode == '--verify':
        n = int(sys.argv[2])
        old = [s for s in specs if build3.key_of_spec(s) in cache and s['scope'] != 'OR27']
        random.seed(5)
        pick = random.sample(old, min(n, len(old)))
        t0 = cpu()
        inc = make_runner(cache, orig, new_sids, {})(pick)
        full = orig([dict(s) for s in pick])
        bad = 0
        for s in pick:
            pass
        # the full run needs fresh dicts (ids differ): compare by position
        full_list = list(full.values())
        for s, f in zip(pick, full_list):
            i = inc[id(s)]
            if i['hits'] != f['hits']:
                bad += 1
                print('MISMATCH', build3.key_of_spec(s)[:3], i['hits'], f['hits'])
        print('verified %d old searches in full against the incremental result: %d mismatches (CPU %.1fs)' % (len(pick), bad, cpu() - t0))
        sys.exit(1 if bad else 0)
    if mode == '--write':
        t0 = cpu()
        build2.write_all()
        print('CPU seconds for the whole write: %.1f' % (cpu() - t0))
        sys.exit(0)
    print(__doc__)
