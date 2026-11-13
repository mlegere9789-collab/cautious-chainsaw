#!/usr/bin/env python3
"""Fetch the OCR text of pages found by saved searches, and/or enumerate whole issues.

Usage:
  python3 -I fetch_found.py found [--paper REGEX] [--date-from D] [--date-to D] [--limit N]
      fetch every page that a saved search returned (optionally filtered) and is not yet saved
  python3 -I fetch_found.py issue LCCN DATE [ED]
      enumerate the issue: find one saved page of it (or of the day before / after on the same reel), derive the
      segment paths by the file numbering of the batch (pages of an issue are consecutive numbers), fetch
      until the service answers with an error for the next number.
One request per second (calib.MIN_GAP); every request is in acquire_log.jsonl; pages are listed in pages.jsonl.
"""
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib


def cmd_found(args):
    paper_rx = re.compile(args[args.index('--paper') + 1], re.I) if '--paper' in args else None
    d0 = args[args.index('--date-from') + 1] if '--date-from' in args else '0000'
    d1 = args[args.index('--date-to') + 1] if '--date-to' in args else '9999'
    limit = int(args[args.index('--limit') + 1]) if '--limit' in args else 10 ** 9
    res = calib.all_search_results()
    man = calib.load_manifest()
    todo = [m for pid, m in sorted(res.items(), key=lambda kv: (kv[1]['date'], kv[1]['paper'], kv[1]['seq']))
            if pid not in man and d0 <= m['date'] <= d1 and (not paper_rx or paper_rx.search(m['paper']))]
    print('%d pages to fetch' % len(todo), flush=True)
    n = 0
    for m in todo[:limit]:
        r = calib.fetch_page(m)
        n += 1
        print('%d/%d %s %s' % (n, min(len(todo), limit), m['page_id'], 'ok %d chars' % r['chars'] if r else 'FAILED'), flush=True)


SEG_RX = re.compile(r'^(?P<pre>.*/data/(?P<lccn>sn\d+)/(?P<reel>[^/]+))/(?P<dir>\d{8})(?P<ed>\d\d)/(?P<num>\d+)\.xml$')


def seg_for(pre, date, ed, num):
    return '%s/%s%02d/%04d.xml' % (pre, date.replace('-', ''), ed, num)


def cmd_issue(args):
    lccn, date = args[0], args[1]
    ed = int(args[2]) if len(args) > 2 else 1
    man = calib.load_manifest()
    # find a template: any known page of this title (same reel preferred) -> reel prefix and numbering
    known = [m for m in man.values() if m['lccn'] == lccn]
    res = [m for m in calib.all_search_results().values() if m['lccn'] == lccn and m['segment']]
    cands = [(abs((datetime.date.fromisoformat(m['date']) - datetime.date.fromisoformat(date)).days), m) for m in (known + res) if m.get('segment')]
    if not cands:
        print('no template page known for', lccn, '- run a search that returns one page of this title first')
        return
    cands.sort(key=lambda x: x[0])
    tm = cands[0][1]
    mt = SEG_RX.match(tm['segment'])
    pre = mt.group('pre')
    # numbering: first page of the target issue = unknown; scan from the template page number outward by trial.
    num_t = int(mt.group('num'))
    dt = datetime.date.fromisoformat(tm['date'])
    dd = (datetime.date.fromisoformat(date) - dt).days
    print('template', tm['page_id'], tm['segment'], 'day offset', dd)
    # candidate start numbers: for the same day: template minus (seq-1); for other days: by walking.
    if dd == 0 and ed == tm['edition']:
        start = num_t - (tm['seq'] - 1)
        scan_from = start
    else:
        # walk from template number forward/back until the folder date matches (needs fetches); try a window
        step = 1 if dd > 0 else -1
        scan_from = num_t + step * 1
    # find first page of the issue by probing (a probe of a number that is not in the issue's folder answers 500)
    seq = 0
    n = scan_from
    found_any = False
    misses = 0
    # try to locate first existing page within +/-80 numbers
    order = [scan_from + k for k in range(0, 81)] if dd >= 0 else [scan_from - k for k in range(0, 81)]
    first = None
    for cand in order:
        meta = {'page_id': '%s/%s/ed-%d/seq-%d' % (lccn, date, ed, 0), 'segment': seg_for(pre, date, ed, cand)}
        # probe via text service directly (no save) to avoid wrong seq labelling
        url = calib.TEXT_SVC + '?' + calib.urllib.parse.urlencode({'segment': meta['segment'], 'format': 'alto_xml', 'full_text': '1'}, safe='/')
        probe = os.path.join(calib.TMP, 'probe_issue.json')
        rec = calib.http_get(url, probe, timeout=90, note='issue probe %s %s' % (lccn, date))
        if rec.get('status') == 200:
            first = cand
            break
        misses += 1
        if rec.get('blocked'):
            print('blocked'); return
    if first is None:
        print('no page of the issue found near the template; give up', lccn, date)
        return
    # the first existing candidate may not be page 1: walk backwards until the service answers an error
    back = first
    while True:
        meta = {'segment': seg_for(pre, date, ed, back - 1)}
        url = calib.TEXT_SVC + '?' + calib.urllib.parse.urlencode({'segment': meta['segment'], 'format': 'alto_xml', 'full_text': '1'}, safe='/')
        rec = calib.http_get(url, os.path.join(calib.TMP, 'probe_issue.json'), timeout=90, note='issue back-probe')
        if rec.get('status') == 200:
            back -= 1
        else:
            break
    first = back
    seq = 1
    num = first
    while True:
        meta = {'lccn': lccn, 'date': date, 'edition': ed, 'seq': seq, 'page_id': '%s/%s/ed-%d/seq-%d' % (lccn, date, ed, seq),
                'segment': seg_for(pre, date, ed, num), 'paper': tm['paper'], 'city': tm.get('city'), 'state': tm.get('state'),
                'resource_url': 'https://www.loc.gov/resource/%s/%s/ed-%d/?sp=%d&st=text' % (lccn, date, ed, seq)}
        r = calib.fetch_page(meta)
        if not r:
            break
        print(meta['page_id'], 'ok', r['chars'], 'chars', flush=True)
        seq += 1
        num += 1
        if seq > 40:
            break
    print('issue %s %s: %d pages' % (lccn, date, seq - 1))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'found':
        cmd_found(a[1:])
    elif a and a[0] == 'issue':
        cmd_issue(a[1:])
    else:
        print(__doc__)
