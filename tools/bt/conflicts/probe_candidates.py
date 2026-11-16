#!/usr/bin/env python3
"""Ask archive.org which items answer the catalogue of candidates.py, and whether each has a text file. One request per second (1.2 s apart), public data only.

    python3 -I tools/bt/conflicts/probe_candidates.py            probe the whole catalogue, write tmp/conflicts/candidates_probe.json
    python3 -I tools/bt/conflicts/probe_candidates.py --key HOOD-1880 [--key ...]

A refused or failed request is recorded as `blocked` or `failed` for that candidate and never retried through another route. The result feeds section 9 of SOURCES.md
(build_sources.py) and the 'sources worth acquiring' of every dossier (build_dossiers.py). Nothing is downloaded except the metadata of the chosen item.
"""
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cfl_lib as L
from candidates import CANDIDATES

L.utf8_stdout()
LAST = [0.0]


def get(url, timeout=45):
    wait = 1.2 - (time.time() - LAST[0])
    if wait > 0:
        time.sleep(wait)
    LAST[0] = time.time()
    r = subprocess.run(['curl', '-sS', '-m', str(timeout), '-w', '\n%{http_code}', url], capture_output=True, text=True)
    out = r.stdout
    code = out.rsplit('\n', 1)[-1] if '\n' in out else ''
    body = out.rsplit('\n', 1)[0] if '\n' in out else out
    if r.returncode != 0:
        return None, 'curl exit %d: %s' % (r.returncode, (r.stderr or '').strip()[:120])
    if code != '200':
        return None, 'HTTP %s' % code
    return body, None


def toks(s):
    return set(re.findall(r'[a-z]{3,}', (s or '').lower())) - {'the', 'and', 'for', 'with', 'from', 'volume'}


def score(c, d):
    t1, t2 = toks(c['title']), toks(d.get('title'))
    ov = len(t1 & t2) / max(1, len(t1))
    yr = None
    m = re.match(r'(\d{4})', str(d.get('date') or ''))
    if m:
        yr = int(m.group(1))
    ok = yr is not None and c['years'][0] - 1 <= yr <= c['years'][1] + 1
    cr = 1.0 if toks(c['creator']) & toks(d.get('creator') if isinstance(d.get('creator'), str) else ' '.join(d.get('creator') or [])) else 0.0
    return ov * 10 + (4 if ok else 0) + cr * 3 + math.log10(1 + (d.get('downloads') or 0))


def probe(c):
    q = 'title:(%s) AND mediatype:texts' % ' '.join(sorted(toks(c['title']))[:6])
    cr = sorted(toks(c['creator']))
    if cr and 'congress' not in cr and 'society' not in cr:
        q += ' AND creator:(%s)' % cr[0]
    url = 'https://archive.org/advancedsearch.php?' + urllib.parse.urlencode({'q': q, 'fl[]': ['identifier', 'title', 'date', 'creator', 'downloads'], 'rows': 12, 'output': 'json'}, doseq=True)
    body, err = get(url)
    res = {'key': c['key'], 'query': q, 'status': None, 'notes': ''}
    if err:
        res['status'] = 'blocked' if '403' in err or '407' in err or 'refused' in err.lower() else 'failed'
        res['notes'] = 'search %s: %s' % (res['status'], err)
        return res
    try:
        docs = json.loads(body)['response']['docs']
    except Exception as e:
        res['status'], res['notes'] = 'failed', 'search answer unreadable: %s' % str(e)[:60]
        return res
    if not docs:
        res['status'], res['notes'] = 'not_found', 'the search found no item'
        return res
    docs.sort(key=lambda d: -score(c, d))
    best = docs[0]
    res['identifier'] = best['identifier']
    res['found_title'] = best.get('title')
    res['found_date'] = str(best.get('date') or '')[:4]
    res['alt'] = [d['identifier'] for d in docs[1:4]]
    body, err = get('https://archive.org/metadata/' + best['identifier'])
    if err:
        res['status'] = 'failed'
        res['notes'] = 'metadata of %s: %s' % (best['identifier'], err)
        return res
    try:
        m = json.loads(body)
    except Exception:
        res['status'], res['notes'] = 'failed', 'metadata unreadable'
        return res
    files = m.get('files') or []
    djvu = [f for f in files if f.get('name', '').endswith('_djvu.txt')]
    res['text_file'] = djvu[0]['name'] if djvu else None
    res['text_bytes'] = int(djvu[0].get('size') or 0) if djvu else 0
    res['volume'] = (m.get('metadata') or {}).get('volume')
    res['creator'] = (m.get('metadata') or {}).get('creator')
    res['status'] = 'reachable' if djvu else 'no_text_file'
    sc = score(c, best)
    res['score'] = round(sc, 1)
    res['notes'] = ('planned; archive.org item %s (%s, %s) answered the metadata API on %s; text file %s, %d bytes; the match is by title and date only: verify the edition and the volume before use'
                    % (best['identifier'], (best.get('title') or '')[:70], res['found_date'], L.today(), res['text_file'] or 'none', res['text_bytes']))
    return res


def main(argv):
    keys = [argv[i + 1] for i, a in enumerate(argv) if a == '--key']
    out_path = os.path.join(L.TMP, 'candidates_probe.json')
    old = L.load_json(out_path)['items'] if os.path.exists(out_path) and keys else []
    byk = {o['id']: o for o in old}
    for c in CANDIDATES:
        if keys and c['key'] not in keys:
            continue
        r = probe(c)
        row = {'id': c['key'], 'class': c['cls'], 'title': c['title'] + ' (%s)' % c['creator'], 'author': c['creator'], 'date': r.get('found_date') or '%d' % c['years'][0], 'kind': c['kind'],
               'url': ('https://archive.org/details/' + r['identifier']) if r.get('identifier') else '-', 'status': r['status'], 'identifier': r.get('identifier'), 'text_file': r.get('text_file'),
               'text_bytes': r.get('text_bytes'), 'alt': r.get('alt'), 'conflicts': c['conflicts'], 'why': c['why'], 'notes': r['notes'] + ' | for ' + ', '.join(c['conflicts']) + ': ' + c['why']}
        byk[c['key']] = row
        print('%-18s %-12s %s %s' % (c['key'], r['status'], r.get('identifier') or '-', (r.get('found_title') or '')[:60]))
    items = [byk[c['key']] for c in CANDIDATES if c['key'] in byk]
    L.dump_json(out_path, {'probed': L.today(), 'host': 'archive.org (advancedsearch and metadata API, one request per 1.2 s)', 'items': items})
    print('wrote', L.rel(out_path), '|', len(items), 'candidates,', sum(1 for i in items if i['status'] == 'reachable'), 'reachable with a text file')


if __name__ == '__main__':
    main(sys.argv[1:])
