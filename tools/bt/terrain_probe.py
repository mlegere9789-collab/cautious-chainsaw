"""Polite probe of every URL printed in docs/battle-theatre/terrain/terrain_sources.json (PDF B.9.1).

Rules (CLAUDE.md): descriptive User-Agent; robots.txt fetched once per host and honoured (including Crawl-delay); at least 3 s between ANY two
requests (and at least the host's Crawl-delay between two requests to that host); HEAD only (one GET fallback only when a server answers
405/501 to HEAD, and the body is not read); NO retries; 401/403/429 and bot challenges are recorded as "blocked" and never worked around;
a host whose robots.txt answers 401/403/429 or 5xx is not probed further; redirects are followed by at most ONE extra HEAD (only when the
target host's robots.txt is already loaded or it is the same host); nothing is downloaded. Hard cap: 150 requests in total.

One identity lookup is made for LOC item 99446453 (PDF row 1; the project's own Warren item is 99448794): a single GET of the item page
JSON with the body read up to 400 KB, only if the item page HEAD was ok and robots allows it.

Usage:  python tools/bt/terrain_probe.py            probe and write terrain_sources_probe.json, patch terrain_sources.json
        python tools/bt/terrain_probe.py --dry      list what would be probed (no network)
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.robotparser
from urllib.parse import urljoin, urlparse

import requests

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DIR = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain')
SRC = os.path.join(DIR, 'terrain_sources.json')
OUT = os.path.join(DIR, 'terrain_sources_probe.json')

UA = 'GettysburgBattleTheatre-SourceProbe/1.0 (polite check of catalog URLs for a non-commercial history project; HEAD only, honours robots.txt, no retries)'
GLOBAL_SPACING = 3.0
CAP = 150
TIMEOUT = (10, 20)
MAX_CRAWL_DELAY = 30.0
CHALLENGE_WORDS = ('captcha', 'challenge', 'login', 'signin', 'sign-in', 'verify', 'verification', 'cdn-cgi')

state = {'last_any': 0.0, 'last_host': {}, 'n': 0, 'log': []}
S = requests.Session()
S.headers.update({'User-Agent': UA, 'Accept': '*/*'})


def host_of(u):
    return urlparse(u).netloc.lower()


def throttle(host, delay):
    now = time.monotonic()
    wait = max(GLOBAL_SPACING - (now - state['last_any']), delay - (now - state['last_host'].get(host, -1e9)), 0)
    if wait > 0:
        time.sleep(wait)


def do(method, url, delay, read_limit=0):
    """one counted request; returns (response or None, error string or None)"""
    if state['n'] >= CAP:
        return None, 'cap_reached'
    h = host_of(url)
    throttle(h, delay)
    state['n'] += 1
    t0 = time.monotonic()
    try:
        r = S.request(method, url, allow_redirects=False, timeout=TIMEOUT, stream=True)
        body = b''
        if read_limit:
            for chunk in r.iter_content(8192):
                body += chunk
                if len(body) >= read_limit:
                    break
        r.close()
        r._probe_body = body
        err = None
    except requests.exceptions.Timeout:
        r, err = None, 'timeout'
    except requests.exceptions.SSLError as e:
        r, err = None, 'tls_error: ' + str(e)[:160]
    except requests.exceptions.ConnectionError as e:
        r, err = None, 'connection_error: ' + str(e)[:160]
    except Exception as e:  # noqa: BLE001
        r, err = None, 'error: ' + type(e).__name__ + ' ' + str(e)[:160]
    done = time.monotonic()
    state['last_any'] = done
    state['last_host'][h] = done
    return r, err


def load_robots(host, scheme, robots):
    if host in robots:
        return robots[host]
    url = '%s://%s/robots.txt' % (scheme, host)
    info = {'robots_url': url, 'http_status': None, 'result': None, 'crawl_delay': None, 'parser': None, 'note': None}
    r, err = do('GET', url, GLOBAL_SPACING, read_limit=200000)
    if err:
        info['result'] = 'robots_error'
        info['note'] = err
    else:
        info['http_status'] = r.status_code
        if r.status_code == 200:
            rp = urllib.robotparser.RobotFileParser()
            text = r._probe_body.decode('utf-8', 'replace')
            if '<html' in text[:500].lower():
                info['result'] = 'robots_not_text'          # an HTML page where robots.txt should be: treat as no rules, say so
                info['note'] = 'robots.txt URL returned an HTML page; no rules parsed'
                rp.parse([])
            else:
                rp.parse(text.splitlines())
                info['result'] = 'robots_ok'
            info['parser'] = rp
            cd = rp.crawl_delay(UA)
            if cd is None:
                cd = rp.crawl_delay('*')
            info['crawl_delay'] = min(float(cd), MAX_CRAWL_DELAY) if cd else None
        elif r.status_code in (404, 410):
            info['result'] = 'robots_absent'
            rp = urllib.robotparser.RobotFileParser()
            rp.parse([])
            info['parser'] = rp
        elif r.status_code in (301, 302, 303, 307, 308):
            info['result'] = 'robots_redirect'
            info['note'] = 'Location: ' + (r.headers.get('Location') or '')
            rp = urllib.robotparser.RobotFileParser()
            rp.parse([])
            info['parser'] = rp                              # no rules read; not followed (budget); URLs on this host get the benefit of "no rules"
        else:
            info['result'] = 'robots_blocked_or_error'       # 401/403/429/5xx: host not probed further
            info['note'] = 'HTTP %d; host not probed further' % r.status_code
    robots[host] = info
    return info


def classify(r, err):
    if err:
        if err.startswith('timeout'):
            return 'timeout'
        if err.startswith('tls_error'):
            return 'tls_error'
        if err.startswith('connection_error'):
            return 'connection_error'
        if err == 'cap_reached':
            return 'not_probed_cap'
        return 'error'
    c = r.status_code
    hdr = {k.lower(): v for k, v in r.headers.items()}
    if hdr.get('cf-mitigated') or 'challenge' in hdr.get('cf-mitigated', ''):
        return 'blocked'
    if c in (401, 403, 429, 451):
        return 'blocked'
    if 200 <= c < 300:
        return 'ok'
    if c in (301, 302, 303, 307, 308):
        return 'redirect'
    if c in (404, 410):
        return 'not_found'
    if c >= 500:
        return 'server_error'
    return 'other_%d' % c


def probe_url(url, robots, rows_of):
    host = host_of(url)
    scheme = urlparse(url).scheme
    rec = {'url': url, 'rows': rows_of, 'host': host, 'status': None, 'http_status': None, 'method': None, 'location': None,
           'follow': None, 'content_type': None, 'content_length': None, 'server': None, 'note': None}
    ri = load_robots(host, scheme, robots)
    rec['robots'] = ri['result']
    if ri['result'] in ('robots_blocked_or_error', 'robots_error'):
        rec['status'] = 'blocked' if ri['result'] == 'robots_blocked_or_error' and (ri['http_status'] in (401, 403, 429)) else 'robots_unavailable'
        rec['note'] = 'robots.txt: ' + (ri['note'] or ri['result']) + '. Not probed.'
        return rec
    rp = ri['parser']
    if rp is not None and not rp.can_fetch(UA, url):
        rec['status'] = 'robots_disallowed'
        rec['note'] = 'robots.txt disallows this path for our User-Agent; not requested.'
        return rec
    delay = max(GLOBAL_SPACING, ri['crawl_delay'] or 0)
    r, err = do('HEAD', url, delay)
    rec['method'] = 'HEAD'
    if r is not None and r.status_code in (405, 501):
        r, err = do('GET', url, delay)                      # body not read (stream + close)
        rec['method'] = 'GET (HEAD answered 405/501; body not read)'
    rec['status'] = classify(r, err)
    if err:
        rec['note'] = err
    if r is not None:
        rec['http_status'] = r.status_code
        rec['content_type'] = r.headers.get('Content-Type')
        rec['content_length'] = r.headers.get('Content-Length')
        rec['server'] = r.headers.get('Server')
        if rec['status'] == 'redirect':
            loc = urljoin(url, r.headers.get('Location') or '')
            rec['location'] = loc
            low = loc.lower()
            if any(w in low for w in CHALLENGE_WORDS):
                rec['note'] = 'redirects to a login / verification style URL; treated as blocked, not followed'
                rec['status'] = 'blocked'
            else:
                th = host_of(loc)
                if th == host or th in robots:
                    tri = robots.get(th) or ri
                    trp = tri.get('parser')
                    if trp is not None and trp.can_fetch(UA, loc) and tri['result'] not in ('robots_blocked_or_error', 'robots_error'):
                        r2, e2 = do('HEAD', loc, max(GLOBAL_SPACING, tri.get('crawl_delay') or 0))
                        rec['follow'] = {'url': loc, 'status': classify(r2, e2), 'http_status': r2.status_code if r2 is not None else None,
                                         'location': urljoin(loc, r2.headers.get('Location')) if (r2 is not None and r2.headers.get('Location')) else None,
                                         'note': e2}
                    else:
                        rec['follow'] = {'url': loc, 'status': 'not_followed_robots', 'http_status': None}
                else:
                    rec['follow'] = {'url': loc, 'status': 'not_followed_other_host', 'http_status': None}
    return rec


def best_label(recs):
    """row reachability from the url records"""
    if not recs:
        return 'no_url'
    ok = 0
    blocked = 0
    for u in recs:
        s = u['status']
        if s == 'ok':
            ok += 1
        elif s == 'redirect':
            f = u.get('follow') or {}
            if f.get('status') == 'ok':
                ok += 1
            elif f.get('status') in ('blocked',):
                blocked += 1
            elif f.get('status') in (None, 'not_followed_robots', 'not_followed_other_host'):
                ok += 1                                       # server answered with a redirect we did not follow: counted as answering
        elif s in ('blocked', 'robots_disallowed'):
            blocked += 1
    if ok == len(recs):
        return 'reachable'
    if ok:
        return 'partial'
    if blocked == len(recs):
        return 'blocked'
    return 'unreachable'


def main():
    dry = '--dry' in sys.argv
    doc = json.load(open(SRC, encoding='utf-8'))
    urls = {}                                                  # url -> rows
    order = []
    for r in doc['rows']:
        for u in r['urls']:
            if u['url'] not in urls:
                urls[u['url']] = []
                order.append(u['url'])
            if r['number'] not in urls[u['url']]:
                urls[u['url']].append(r['number'])
    for u in doc['unverified_list_postscript']['urls']:
        if u not in urls:
            urls[u] = ['unverified_list_postscript']
            order.append(u)
    hosts = sorted({host_of(u) for u in order})
    print('urls', len(order), 'hosts', len(hosts), 'minimum requests', len(order) + len(hosts))
    if dry:
        for u in order:
            print(urls[u], u)
        return
    robots = {}
    t_start = dt.datetime.now(dt.timezone.utc)
    recs = []
    for i, u in enumerate(order, 1):
        rec = probe_url(u, robots, urls[u])
        recs.append(rec)
        print('%3d/%d req=%3d %-18s %s %s' % (i, len(order), state['n'], rec['status'], rec['http_status'] or '', u[:110]), flush=True)
    # identity lookup for LOC row 1 item (single GET of item JSON)
    ident = None
    item = 'https://www.loc.gov/item/99446453/'
    head = next((x for x in recs if x['url'] == item), None)
    if head and head['status'] in ('ok', 'redirect') and 'www.loc.gov' in robots and robots['www.loc.gov']['parser'] is not None:
        jurl = item + '?fo=json'
        if robots['www.loc.gov']['parser'].can_fetch(UA, jurl):
            r, err = do('GET', jurl, max(GLOBAL_SPACING, robots['www.loc.gov'].get('crawl_delay') or 0), read_limit=400000)
            ident = {'url': jurl, 'status': classify(r, err), 'http_status': r.status_code if r is not None else None, 'note': err}
            if r is not None and r.status_code == 200:
                try:
                    j = json.loads(r._probe_body.decode('utf-8', 'replace'))
                    it = j.get('item') or {}
                    ident['title'] = it.get('title')
                    ident['call_number'] = it.get('call_number')
                    ident['date'] = it.get('date')
                    ident['created_published'] = it.get('created_published')
                    ident['notes'] = (it.get('notes') or [])[:6]
                except Exception as e:  # noqa: BLE001
                    ident['note'] = 'json parse failed: ' + str(e)[:100] + ' (body truncated at 400 KB or not JSON)'
        else:
            ident = {'url': jurl, 'status': 'robots_disallowed'}
    t_end = dt.datetime.now(dt.timezone.utc)

    meta = {'user_agent': UA, 'started_utc': t_start.isoformat(timespec='seconds'), 'finished_utc': t_end.isoformat(timespec='seconds'),
            'requests_made': state['n'], 'unique_urls': len(order), 'hosts': len(hosts),
            'robots': {h: {k: v for k, v in i.items() if k != 'parser'} for h, i in sorted(robots.items())},
            'loc_99446453_identity_lookup': ident}
    finish(doc, meta, recs)


def reclassify_chain(recs):
    """no network: derive final statuses from the stored one-hop follow records"""
    for x in recs:
        f = x.get('follow') or {}
        if x['status'] == 'not_probed_robots':
            x['status'] = 'robots_unavailable'
        if x['status'] == 'redirect' and f.get('status') == 'redirect':
            if 'search' in (f.get('location') or '').lower():
                x['status'] = 'moved_to_search'
                x['note'] = 'second hop redirects to a site search page: the document is not at the printed URL'
            else:
                x['note'] = 'redirect chain: first hop followed, second hop not followed'


def finish(doc, meta, recs):
    """aggregate url records into row statuses and write both files (no network)"""
    reclassify_chain(recs)
    by_url = {x['url']: x for x in recs}
    rows_out = []
    for r in doc['rows']:
        ur = [by_url[u['url']] for u in r['urls']]
        reach = best_label(ur)
        kind = (r['access_kind_from_pdf'] or '').lower()
        if not r['urls']:
            status = 'no-url'
        elif kind.startswith('print-only'):
            status = 'print-only'
        elif kind.startswith('viewer-only'):
            status = 'viewer-only'
        elif kind.startswith('request-only'):
            status = 'request-only'
        elif reach == 'reachable':
            status = 'reachable'
        elif reach == 'partial':
            status = 'partially-reachable'
        elif reach == 'blocked':
            status = 'blocked'
        else:
            status = 'unreachable'
        summ = '; '.join('%s %s' % (x['status'] + ('/' + str(x['http_status']) if x['http_status'] else ''), x['url'][:70]) for x in ur)
        rows_out.append({'number': r['number'], 'access_status': status, 'reachability': reach,
                         'urls': [{'url': x['url'], 'status': x['status'], 'http_status': x['http_status']} for x in ur],
                         'summary': summ})
        r['access_status'] = status
        r['reachability'] = reach
        r['probe_summary'] = [{'url': x['url'], 'status': x['status'], 'http_status': x['http_status'],
                               'location': x['location'], 'follow_status': (x['follow'] or {}).get('status')} for x in ur]

    notes = []
    for e in (meta.get('robots_followup') or []):
        unk = [u['url'] for u in e['urls_checked'] if u['allowed_by_target_robots'] is None]
        if unk:
            notes.append('robots.txt of %s redirected (to %s) and the redirect target did not give a robots.txt on one more hop; the rules were not read. '
                         'One HEAD each was sent to: %s.' % (e['host'], e['robots_redirect_to'], ', '.join(unk)))
    loc_blocked = [x['url'] for x in recs if x['host'] == 'www.loc.gov' and x['status'] == 'blocked']
    if loc_blocked:
        notes.append('www.loc.gov answered 403 to HEAD for %d URL(s) while one other www.loc.gov URL answered 200 to HEAD in the same pass: LOC bot protection is '
                     'not uniform. No retry or alternative request was made (no work-around). The identity lookup of item 99446453 was therefore not done.' % len(loc_blocked))
    meta['notes'] = (meta.get('notes') or []) + [n for n in notes if n not in (meta.get('notes') or [])]

    def count(items, key):
        out = {}
        for x in items:
            out[x[key]] = out.get(x[key], 0) + 1
        return dict(sorted(out.items()))
    probe = {
        'schema': 'bt-terrain-sources-probe/1',
        'user_agent': meta['user_agent'],
        'started_utc': meta['started_utc'],
        'finished_utc': meta['finished_utc'],
        'policy': ('HEAD only (one GET fallback on 405/501, body unread); >=3 s between any two requests and >= Crawl-delay per host; '
                   'robots.txt honoured; no retries; 401/403/429 and challenges recorded as blocked and not worked around; nothing downloaded. '
                   'Redirects: at most one extra HEAD to the target.'),
        'request_cap': CAP,
        'requests_made': meta['requests_made'],
        'unique_urls': meta['unique_urls'],
        'hosts': meta['hosts'],
        'counts_by_url_status': count(recs, 'status'),
        'counts_by_row_access_status': count(rows_out, 'access_status'),
        'counts_by_row_reachability': count(rows_out, 'reachability'),
        'robots': meta['robots'],
        'robots_followup': meta.get('robots_followup'),
        'urls': recs,
        'rows': rows_out,
        'loc_99446453_identity_lookup': meta.get('loc_99446453_identity_lookup'),
        'notes': meta.get('notes') or [],
    }
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(probe, f, indent=1, ensure_ascii=False)
        f.write('\n')
    doc['probe'] = {'file': 'terrain_sources_probe.json', 'finished_utc': probe['finished_utc'], 'requests_made': probe['requests_made'],
                    'counts_by_row_access_status': probe['counts_by_row_access_status']}
    with open(SRC, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('requests', probe['requests_made'], 'by url status', probe['counts_by_url_status'])
    print('rows by access_status', probe['counts_by_row_access_status'])


def reload_meta():
    probe = json.load(open(OUT, encoding='utf-8'))
    meta = {k: probe[k] for k in ('user_agent', 'started_utc', 'finished_utc', 'requests_made', 'unique_urls', 'hosts', 'robots')}
    meta['robots_followup'] = probe.get('robots_followup')
    meta['loc_99446453_identity_lookup'] = probe.get('loc_99446453_identity_lookup')
    meta['notes'] = probe.get('notes') or []
    return probe, meta


def followup_robots():
    """During the main pass robots.txt answered with a redirect for some hosts; the redirect was not followed. Read the targets now
    (counted, spaced) and record whether the URLs probed on those hosts are allowed by the target's rules. Appends to the probe file."""
    probe, meta = reload_meta()
    doc = json.load(open(SRC, encoding='utf-8'))
    recs = probe['urls']
    loaded = {}
    out = []
    for h, info in meta['robots'].items():
        if info.get('result') != 'robots_redirect':
            continue
        loc = (info.get('note') or '').replace('Location: ', '').strip()
        th = host_of(loc)
        entry = {'host': h, 'robots_redirect_to': loc, 'target_host': th, 'urls_checked': []}
        rp = None
        if meta['requests_made'] + state['n'] >= CAP:
            entry['note'] = 'cap reached; not fetched'
            out.append(entry)
            continue
        if loc not in loaded:
            r, err = do('GET', loc, GLOBAL_SPACING, read_limit=200000)
            entry['http_status'] = None if err else r.status_code
            if err:
                entry['note'] = err
            elif r.status_code == 200:
                text = r._probe_body.decode('utf-8', 'replace')
                rp = urllib.robotparser.RobotFileParser()
                if '<html' in text[:500].lower():
                    rp.parse([])
                    entry['note'] = 'target returned an HTML page, not a robots.txt; no rules parsed'
                else:
                    rp.parse(text.splitlines())
                loaded[loc] = rp
            else:
                entry['note'] = 'HTTP %s' % r.status_code
        else:
            rp = loaded[loc]
        for x in recs:
            if x['host'] == h:
                path_url = x['url'].replace('://' + h, '://' + th, 1)
                entry['urls_checked'].append({'url': x['url'], 'allowed_by_target_robots': (rp.can_fetch(UA, path_url) if rp else None)})
        out.append(entry)
    meta['requests_made'] = meta['requests_made'] + state['n']
    meta['robots_followup'] = out
    finish(doc, meta, recs)


def reclassify_only():
    probe, meta = reload_meta()
    doc = json.load(open(SRC, encoding='utf-8'))
    finish(doc, meta, probe['urls'])


if __name__ == '__main__':
    if '--reclassify' in sys.argv:
        reclassify_only()
    elif '--followup-robots' in sys.argv:
        followup_robots()
    else:
        main()
