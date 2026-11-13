#!/usr/bin/env python3
"""Retry the recorded URLs once each (paced) and log every attempt to retry/fetches.jsonl.

A plan entry: {"fid": "F-xxx", "url": "...", "purpose": "...", "lk": ["LKR-0001", ...], "save": "name.ext", "json_alt": true|false}
For www.loc.gov pages the documented JSON interface (?fo=json) is tried when the recorded HTML URL is answered with the
site's own challenge page; nothing is solved or bypassed.

Usage: python3 -I retry_urls.py plan.json [--force]
"""
import json, os, re, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

FETCHES = os.path.join(rlib.RETRY, 'fetches.jsonl')


def title_of(b):
    m = re.search(rb'(?is)<title[^>]*>(.*?)</title>', b[:200000])
    if m:
        import html
        return re.sub(r'\s+', ' ', html.unescape(m.group(1).decode('utf-8', 'replace'))).strip()[:200]
    return None


def summarise(path, ctype):
    """what the saved file says: title and first characters of text; text file path + sha256 of the text."""
    b = open(path, 'rb').read()
    out = {}
    txt = None
    if b[:5] == b'%PDF-':
        r = subprocess.run(['pdftotext', '-layout', path, path + '.txt'], capture_output=True)
        if os.path.exists(path + '.txt'):
            txt = open(path + '.txt', 'rb').read()
    elif 'json' in (ctype or '') or b[:1] in (b'{', b'['):
        try:
            d = json.loads(b)
            out['json_keys'] = list(d.keys())[:20] if isinstance(d, dict) else 'list'
            item = d.get('item') if isinstance(d, dict) else None
            if isinstance(item, dict):
                out['item_title'] = item.get('title')
                out['item_date'] = item.get('date') or item.get('created_published')
            if isinstance(d, dict) and 'pagination' in d:
                out['pagination'] = {k: d['pagination'].get(k) for k in ('of', 'total', 'current', 'perpage') if k in d['pagination']}
            if isinstance(d, dict) and isinstance(d.get('results'), list):
                out['n_results'] = len(d['results'])
        except Exception as e:
            out['json_error'] = str(e)[:100]
        txt = b
    elif b.lstrip()[:15].lower().startswith((b'<!doctype', b'<html')) or b'<html' in b[:2000].lower():
        out['title'] = title_of(b)
        txt = rlib.html_text(b).encode('utf-8')
        open(path + '.txt', 'wb').write(txt)
    else:
        txt = b
    if txt is not None:
        out['text_bytes'] = len(txt)
        out['text_sha256'] = rlib.sha_bytes(txt)
        if os.path.exists(path + '.txt'):
            out['text_file'] = rlib.rel(path + '.txt')
        else:
            out['text_file'] = rlib.rel(path)
        out['page_start'] = rlib.norm_ws(txt[:1500].decode('utf-8', 'replace'))[:400]
        if re.search(rb'Just a moment|Verify you are human|Attention Required|cf-challenge|request verification', txt[:4000]):
            out['bot_challenge'] = True
    return out


def run(plan, force=False):
    done = {r['fid']: r for r in rlib.read_jsonl(FETCHES)} if not force else {}
    for e in plan:
        fid = e['fid']
        if fid in done and not force:
            print('skip (already logged)', fid)
            continue
        url = e['url']
        save = e.get('save') or re.sub(r'[^A-Za-z0-9._-]+', '_', url.split('//', 1)[-1])[-120:]
        dest = os.path.join(rlib.WEBDIR, fid, save)
        rec = rlib.curl(url, dest, headers=e.get('headers'), max_time=e.get('max_time', 120), head=e.get('head', False))
        out = {'fid': fid, 'purpose': e.get('purpose'), 'lk': e.get('lk', []), 'asked_url': url}
        out.update(rec)
        if rec.get('file') and rec['http'] == 200:
            out.update(summarise(rlib.abspath(rec['file']), rec.get('content_type')))
        alts = []
        if (rec['http'] != 200 or out.get('bot_challenge')) and e.get('json_alt') and 'loc.gov' in url and 'fo=json' not in url:
            ju = url + ('&' if '?' in url else '?') + 'fo=json'
            jdest = os.path.join(rlib.WEBDIR, fid, 'alt-' + save + '.json')
            r2 = rlib.curl(ju, jdest, max_time=120)
            o2 = {'asked_url': ju, 'via': 'documented JSON interface of loc.gov (fo=json)'}
            o2.update(r2)
            if r2.get('file') and r2['http'] == 200:
                o2.update(summarise(rlib.abspath(r2['file']), r2.get('content_type')))
            alts.append(o2)
        if alts:
            out['alt'] = alts
        rlib.jsonl_append(FETCHES, out)
        print(fid, rec['http'], rec.get('bytes'), (out.get('title') or out.get('item_title') or rec.get('error') or '')[:80], [a['http'] for a in alts])


if __name__ == '__main__':
    plan = json.load(open(sys.argv[1]))
    run(plan, force='--force' in sys.argv)
