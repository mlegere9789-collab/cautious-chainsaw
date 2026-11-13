#!/usr/bin/env python3
"""Build lookups-inventory.jsonl: every failed or blocked lookup the shards recorded.

Sources read (read-only):
  A  GOVERNANCE/horde/*/lookups.jsonl                    rows the shard itself marked failed / blocked / failed_lookup
  B  GOVERNANCE/horde/*/web_lookups.json(l)              non-200 answers, robots refusals, timeouts, 'failed' notes
  C  GOVERNANCE/timeline_verified.jsonl                  rows with status failed_lookup
  D  GOVERNANCE/evidence_corrections/*.jsonl             entries of blocked_host and rows with status blocked_host
     GOVERNANCE/timeline_corrections/*.jsonl             (same)

One inventory row per recorded lookup (not per URL): the same URL recorded by four shards gives four rows,
so that every shard row can be answered. The retry itself works per retry unit (url, host or question).

Usage: python3 -I build_inventory.py   (writes ../lookups-inventory.jsonl)
"""
import glob, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib
from urllib.parse import urlparse

GOV = rlib.GOV
HORDE = os.path.join(GOV, 'horde')
OUT = os.path.join(rlib.RETRY, 'lookups-inventory.jsonl')
rows = []


def rp(p):
    return os.path.relpath(p, rlib.ROOT)


URL_RE = re.compile(r'https?://[^\s\'"<>)\]]+')


def urls_in(*texts):
    out = []
    for t in texts:
        if not t:
            continue
        for u in URL_RE.findall(t if isinstance(t, str) else json.dumps(t)):
            u = u.rstrip('.,;')
            if u not in out:
                out.append(u)
    return out


def host_of(u):
    try:
        return urlparse(u).netloc.lower()
    except Exception:
        return ''


def add(family, origin, orig_status, asked, orig_result, urls=None, affects=None, kind=None, orig_date=None, extra=None):
    urls = urls or []
    r = {
        'family': family,
        'origin': origin,
        'orig_status': orig_status,
        'orig_date': orig_date,
        'asked': asked,
        'orig_result': orig_result,
        'urls': urls,
        'hosts': sorted({host_of(u) for u in urls if host_of(u)}),
        'affects': affects or [],
        'kind': kind,
    }
    if extra:
        r.update(extra)
    rows.append(r)


def jl(path):
    out = []
    with open(path) as f:
        for i, l in enumerate(f, 1):
            l = l.strip()
            if l:
                try:
                    out.append((i, json.loads(l)))
                except Exception:
                    pass
    return out


# ---------------------------------------------------------------- A: lookups.jsonl
def shard_of(path):
    return os.path.relpath(path, HORDE).split(os.sep)[0]


for path in sorted(glob.glob(os.path.join(HORDE, '*', 'lookups.jsonl')) + glob.glob(os.path.join(HORDE, 'ws-web', '*', 'lookups.jsonl'))):
    sh = os.path.relpath(path, HORDE).replace(os.sep + 'lookups.jsonl', '')
    for ln, r in jl(path):
        s = json.dumps(r, ensure_ascii=False)
        st = r.get('status') or ''
        oc = r.get('outcome') or ''
        note = r.get('note') or r.get('notes') or ''
        origin = {'file': rp(path), 'locator': 'line %d' % ln, 'orig_id': r.get('id') or r.get('n') or r.get('lookup_id'), 'shard': sh}
        failed = False
        if st in ('failed_lookup', 'failed', 'blocked_host', 'partial', 'lead_only'):
            failed = True
        if isinstance(oc, str) and (oc.startswith('failed') or oc in ('ok-secondary-only',) or oc.startswith('ok-summarized')):
            failed = True
        if isinstance(note, str) and re.match(r'^\s*(failed|FAILED)', note):
            failed = True
        if isinstance(r.get('result'), str) and re.search(r'CONNECT tunnel failed|FileNotFoundError|status: failed_lookup', r['result']):
            failed = True
        if isinstance(note, str) and re.search(r'CONNECT tunnel failed', note):
            failed = True
        if sh == 'tl-01' and r.get('id') == 'tl-01-LK-06':
            failed = True  # summariser-only reading: the verbatim file was never read in that shard
        if not failed:
            continue
        asked = r.get('query') or r.get('query_or_url') or r.get('lookup') or r.get('pattern') or r.get('notes') or r.get('url') or ''
        if r.get('tool') and r.get('pattern'):
            asked = '%s: %s' % (r['tool'], r['pattern'])
        elif r.get('tool') and (r.get('url') or r.get('query_or_url')):
            asked = '%s %s' % (r['tool'], r.get('url') or r.get('query_or_url'))
        elif r.get('tool') and r.get('query'):
            asked = '%s %s' % (r['tool'], r['query'])
        elif r.get('tool') and r.get('result') is not None and not asked:
            asked = r['tool']
        if isinstance(r.get('id'), str) and r['id'].startswith('tl-01-LK'):
            asked = (r.get('notes') or '')[:500]
        res = r.get('result') or r.get('outcome') or note or r.get('notes') or ''
        txt = s + ' ' + json.dumps(r.get('hosts') or '')
        if r.get('status') == 'blocked_host' or re.search(r'CONNECT tunnel failed|connect_rejected|proxy answered 403|proxy CONNECT 403|proxy refuses', s):
            kind = 'host_refused'
        elif re.search(r'HTTP 403|HTTP 404|403 Forbidden|HTTP Error|HTTP 5\d\d', s):
            kind = 'http_error'
        elif re.search(r'summariz|summaris', s):
            kind = 'summarised_only'
        elif re.search(r'FileNotFoundError|pdftoppm|maxContentLength|empty text layer', s):
            kind = 'tool_failure'
        elif r.get('web') is False or (r.get('web') is None and not re.search(r'WebSearch|WebFetch|Web search|archive\.org|loc\.gov|http', s)):
            kind = 'local_negative'
        elif re.search(r'WebSearch|Web search|advancedsearch|search', s):
            kind = 'search_no_primary'
        else:
            kind = 'web_failure'
        us = urls_in(asked, r.get('query_or_url'), r.get('url'), r.get('pattern'), note, res if isinstance(res, str) else '')
        add('lookup_log', origin, st or oc or 'failed', str(asked)[:600], (res if isinstance(res, str) else json.dumps(res))[:800], us,
            affects=[x for x in [r.get('row')] if x], kind=kind, orig_date=r.get('date') or r.get('ts'))

# ---------------------------------------------------------------- B: web_lookups
# r03-2 (list), tl-12 (dict W1..), terrain-1 (dict W1..), sources-a (dict with lookups[]), sources-b (jsonl)
p = os.path.join(HORDE, 'r03-2', 'web_lookups.json')
for e in json.load(open(p)):
    s = json.dumps(e, ensure_ascii=False)
    if re.search(r'failed_lookup|status: partial|failed', e.get('result') or ''):
        us = urls_in(e.get('url'), e.get('query'), e.get('result'))
        add('web_lookup', {'file': rp(p), 'locator': 'n=%s' % e.get('n'), 'orig_id': 'r03-2-W%s' % e.get('n'), 'shard': 'r03-2'},
            'failed_lookup' if 'failed_lookup' in e['result'] else 'partial', '%s %s' % (e.get('tool'), e.get('query') or e.get('url')), e['result'], us,
            kind='search_no_primary' if e.get('tool') == 'WebSearch' else 'http_partial', orig_date=e.get('date'))

p = os.path.join(HORDE, 'tl-12', 'web_lookups.json')
d = json.load(open(p))
for k, v in d.items():
    if re.search(r'FAILED|failed|no support|403|summary only', v):
        add('web_lookup', {'file': rp(p), 'locator': k, 'orig_id': 'tl-12-' + k, 'shard': 'tl-12'}, 'failed', v[:500], v, urls_in(v),
            kind='http_error' if re.search(r'403|404', v) else 'search_no_primary')

p = os.path.join(HORDE, 'terrain-1', 'web_lookups.json')
d = json.load(open(p))
for k, v in d.items():
    if re.search(r'FAILED|failed|0 results|Not probed|refused|lead only|403', v):
        add('web_lookup', {'file': rp(p), 'locator': k, 'orig_id': 'terrain-1-' + k, 'shard': 'terrain-1'}, 'failed', v[:500], v, urls_in(v),
            kind='http_error' if re.search(r'HTTP 404|FAILED HTTP|403', v) else ('host_refused' if re.search(r'CONNECT|refused|Not probed', v) else 'search_no_primary'))

p = os.path.join(HORDE, 'sources-a', 'web_lookups.json')
d = json.load(open(p))
for i, e in enumerate(d['lookups']):
    if e.get('status') != 200:
        add('web_lookup', {'file': rp(p), 'locator': 'lookups[%d] id=%s' % (i, e.get('id')), 'orig_id': 'sources-a-' + str(e.get('id')), 'shard': 'sources-a'},
            'http_%s' % e.get('status') if e.get('status') else 'error', 'GET ' + e['url'], (e.get('error') or '') + ' status=%s' % e.get('status'), [e['url']],
            kind='http_error' if e.get('status') else 'timeout', orig_date=(e.get('utc') or '')[:10])
for i, e in enumerate(d.get('not_requested', [])):
    add('web_lookup', {'file': rp(p), 'locator': 'not_requested[%d]' % i, 'orig_id': 'sources-a-not_requested-%d' % i, 'shard': 'sources-a'},
        'not_requested', 'GET ' + e['url'], e['reason'], [e['url']], kind='robots_disallowed', orig_date='2026-11-04')

p = os.path.join(HORDE, 'sources-b', 'web_lookups.jsonl')
for ln, e in jl(p):
    if e.get('kind') != 'get':
        continue
    bad = (e.get('http') not in (200, 206)) or e.get('robots') == 'disallowed' or e.get('not_fetched')
    if not bad:
        continue
    kind = 'robots_disallowed' if e.get('robots') == 'disallowed' else ('timeout' if e.get('http') is None else 'http_error')
    add('web_lookup', {'file': rp(p), 'locator': 'line %d id=%s' % (ln, e.get('id')), 'orig_id': 'sources-b-' + str(e.get('id')), 'shard': 'sources-b'},
        'robots_disallowed' if kind == 'robots_disallowed' else 'http_%s' % e.get('http'), 'GET ' + e['url'],
        'http=%s error=%s title=%s' % (e.get('http'), e.get('error'), e.get('title')), [e['url']], affects=[e.get('ref')] if e.get('ref') else [], kind=kind, orig_date=(e.get('t') or '')[:10])

# ---------------------------------------------------------------- C: timeline_verified failed_lookup rows
p = os.path.join(GOV, 'timeline_verified.jsonl')
for ln, r in jl(p):
    if r.get('status') == 'failed_lookup' or r.get('status_effective') == 'failed_lookup':
        add('timeline_row', {'file': rp(p), 'locator': 'line %d id=%s' % (ln, r['id']), 'orig_id': r['id'], 'shard': r.get('shard')}, 'failed_lookup',
            'timeline row %s (%s): %s' % (r['id'], r.get('time_window_raw'), (r.get('notes') or '')[:380]), (r.get('notes') or '')[:900],
            urls_in(r.get('notes')), affects=[r['id']], kind='timeline_row', extra={'register_refs': r.get('register_refs'), 'seed_page': r.get('seed_page')})

# ---------------------------------------------------------------- D: blocked_host in the correction files
for path in sorted(glob.glob(os.path.join(GOV, 'evidence_corrections', '*.jsonl')) + glob.glob(os.path.join(GOV, 'timeline_corrections', '*.jsonl'))):
    for ln, r in jl(path):
        rid = r.get('id')
        bh = r.get('blocked_host')
        if isinstance(bh, list) and bh:
            for j, e in enumerate(bh):
                us = [e['url']] if e.get('url') and str(e['url']).startswith('http') else []
                if not us:
                    us = urls_in(e.get('what_to_read'))
                hosts = [h.get('host') for h in (e.get('hosts_probed') or []) if isinstance(h, dict)]
                add('blocked_host_entry', {'file': rp(path), 'locator': 'line %d id=%s blocked_host[%d]' % (ln, rid, j), 'orig_id': '%s#bh%d' % (rid, j), 'shard': r.get('shard')},
                    e.get('status') or 'blocked_host', (e.get('what_to_read') or '')[:700] + ((' [key ' + e['source_key'] + ']') if e.get('source_key') else ''),
                    json.dumps(e.get('hosts_probed') or [], ensure_ascii=False)[:400], us, affects=[rid], kind='blocked_host_entry',
                    extra={'hosts_probed': hosts})
        elif r.get('status') == 'blocked_host' or r.get('row_status') == 'blocked_host':
            pass  # rows without blocked_host list: row-level status only
        # row-level status without a blocked_host array (fence-2/3 store arrays, so this is rare)
        if r.get('status') == 'blocked_host' and not (isinstance(bh, list) and bh):
            add('blocked_host_entry', {'file': rp(path), 'locator': 'line %d id=%s status' % (ln, rid), 'orig_id': '%s#status' % rid, 'shard': r.get('shard')}, 'blocked_host',
                'row %s has status blocked_host (%s)' % (rid, (r.get('corrected_claim') or '')[:200]), '', [], affects=[rid], kind='blocked_host_entry')

# stable ids: family prefix + shard/file + locator (not a running number, so that other engineers' appends cannot renumber rows)
import re as _re
def _slug(x):
    return _re.sub(r'[^A-Za-z0-9._#-]+', '_', str(x)).strip('_')
seen = {}
for i, r in enumerate(rows, 1):
    o = r['origin']
    if r['family'] == 'timeline_row':
        base = 'LKR-' + o['orig_id']
    elif r['family'] == 'blocked_host_entry':
        base = 'LKR-BH-' + _slug(os.path.basename(o['file']).replace('.jsonl', '')) + '-' + _slug(o['orig_id'])
    elif r['family'] == 'lookup_log':
        base = 'LKR-' + _slug(o['shard']) + '-L' + _slug(o['locator'].replace('line ', ''))
    else:
        base = 'LKR-' + _slug(o['orig_id'])
    n = seen.get(base, 0) + 1
    seen[base] = n
    r['lk_id'] = base if n == 1 else '%s-%d' % (base, n)
    r['seq'] = i
with open(OUT, 'w') as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
import collections
print('inventory rows:', len(rows))
print(collections.Counter(r['family'] for r in rows))
print(collections.Counter(r['kind'] for r in rows))
print(collections.Counter(r['origin']['shard'] for r in rows))
