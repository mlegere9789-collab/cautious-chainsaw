#!/usr/bin/env python3
"""Fetch the OCR (ALTO) of pages found by saved searches, and/or enumerate whole issues of a title.

Usage:
  python3 -I fetch_found.py found [--paper REGEX] [--date-from D] [--date-to D] [--limit N] [--refetch]
      fetch every page that a saved search returned (optionally filtered) and is not yet saved with the current rebuild rules
  python3 -I fetch_found.py issues LCCN FROM TO [--scan N]
      enumerate every issue of the title from FROM to TO (dates inclusive). The pages of an issue have consecutive
      file numbers inside the batch (the service answers 404 for a number that is not in the issue's folder), so the
      first page of an issue is looked for from the end of the previous issue (or from a page known from a search),
      and pages are fetched until the next number answers 404. A date on which no issue is found within --scan numbers
      is recorded as 'no issue found' (that is not a statement that none was printed).
One request per second (calib.MIN_GAP); every request is in acquire_log.jsonl; pages are listed in pages.jsonl.
"""
import datetime, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib, rebuild_cols

SEG_RX = re.compile(r'^(?P<pre>.*/data/(?P<lccn>sn\d+)/(?P<reel>[^/]+))/(?P<dir>\d{8})(?P<ed>\d\d)/(?P<num>\d+)\.xml$')


def seg_for(pre, date, ed, num):
    return '%s/%s%02d/%04d.xml' % (pre, date.replace('-', ''), ed, num)


def cmd_found(args):
    paper_rx = re.compile(args[args.index('--paper') + 1], re.I) if '--paper' in args else None
    d0 = args[args.index('--date-from') + 1] if '--date-from' in args else '0000'
    d1 = args[args.index('--date-to') + 1] if '--date-to' in args else '9999'
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else 10 ** 9
    res = calib.all_search_results()
    man = calib.load_manifest()
    todo = []
    for pid, m in sorted(res.items(), key=lambda kv: (kv[1]['date'], kv[1]['paper'], kv[1]['seq'])):
        cur = man.get(pid)
        if cur and cur.get('rules') == rebuild_cols.VERSION:
            continue
        if not (d0 <= m['date'] <= d1):
            continue
        if paper_rx and not paper_rx.search(m['paper']):
            continue
        todo.append(m)
    print('%d pages to fetch' % len(todo), flush=True)
    n = 0
    for m in todo[:limit]:
        r = calib.fetch_page(m)
        n += 1
        print('%d/%d %s %s' % (n, min(len(todo), limit), m['page_id'], 'ok %d chars %d cols' % (r['chars'], r['columns']) if r else 'FAILED/404'), flush=True)


def probe(pre, date, ed, num):
    """True if the batch has page `num` in the folder of this issue (a quick 404 otherwise)."""
    seg = seg_for(pre, date, ed, num)
    meta = {'page_id': '%s/%s/ed-%d/seq-%d' % (calib_lccn(pre), date, ed, 0), 'segment': seg}
    url = calib.ALTO_BASE + seg
    rec = calib.http_get(url, os.path.join(calib.TMP, 'probe_issue.xml'), timeout=60, note='issue probe')
    if os.path.exists(os.path.join(calib.TMP, 'probe_issue.xml')):
        os.remove(os.path.join(calib.TMP, 'probe_issue.xml'))
    return rec.get('status') == 200


def calib_lccn(pre):
    return re.search(r'/data/(sn\d+)/', pre).group(1)


def fetch_issue_from(pre, lccn, date, ed, first, template):
    seq = 1
    num = first
    last = None
    while True:
        meta = {'lccn': lccn, 'date': date, 'edition': ed, 'seq': seq, 'page_id': '%s/%s/ed-%d/seq-%d' % (lccn, date, ed, seq),
                'segment': seg_for(pre, date, ed, num), 'paper': template.get('paper'), 'city': template.get('city'), 'state': template.get('state')}
        r = calib.fetch_page(meta)
        if not r:
            break
        print('  ', meta['page_id'], 'ok', r['chars'], 'chars', r['columns'], 'cols', flush=True)
        last = num
        seq += 1
        num += 1
        if seq > 40:
            break
    return seq - 1, last


def cmd_issues(args):
    lccn, d_from, d_to = args[0], args[1], args[2]
    scan = int(args[args.index('--scan') + 1]) if '--scan' in args else 40
    res = [m for m in calib.all_search_results().values() if m['lccn'] == lccn and m.get('segment')]
    man = {k: v for k, v in calib.load_manifest().items() if v['lccn'] == lccn}
    pool = [dict(v, segment=v['segment']) for v in man.values()] + res
    if not pool:
        print('no template page known for', lccn)
        return
    d = datetime.date.fromisoformat(d_from)
    end = datetime.date.fromisoformat(d_to)
    prev_last = None
    prev_pre = None
    while d <= end:
        ds = d.isoformat()
        # template: nearest known page
        pool.sort(key=lambda m: abs((datetime.date.fromisoformat(m['date']) - d).days))
        t = pool[0]
        mt = SEG_RX.match(t['segment'])
        pre = mt.group('pre')
        ed = 1
        first = None
        if t['date'] == ds and t['edition'] == ed:
            cand0 = int(mt.group('num')) - (t['seq'] - 1)
            if probe(pre, ds, ed, cand0):
                first = cand0
        if first is None:
            base = (prev_last + 1) if (prev_last is not None and prev_pre == pre) else int(mt.group('num'))
            lo = max(0, base - (2 if prev_last is not None else 12))
            for cand in range(lo, base + scan):
                if probe(pre, ds, ed, cand):
                    first = cand
                    break
        if first is None:
            print('%s %s: no issue found within the scan window' % (lccn, ds), flush=True)
            d += datetime.timedelta(days=1)
            continue
        # make sure no earlier page of the same issue exists (walk back)
        while first > 0 and probe(pre, ds, ed, first - 1):
            first -= 1
        print('%s %s: first page file %04d' % (lccn, ds, first), flush=True)
        n, last = fetch_issue_from(pre, lccn, ds, ed, first, t)
        print('%s %s: %d pages' % (lccn, ds, n), flush=True)
        prev_last, prev_pre = last, pre
        # new pool entries
        pool = [dict(v) for v in calib.load_manifest().values() if v['lccn'] == lccn] + pool
        d += datetime.timedelta(days=1)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'found':
        cmd_found(a[1:])
    elif a and a[0] == 'issues':
        cmd_issues(a[1:])
    else:
        print(__doc__)
