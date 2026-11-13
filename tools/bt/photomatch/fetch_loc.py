#!/usr/bin/env python3
"""Fetch the Library of Congress JPEG derivatives of every catalogued Q16 photograph (all image resources of the 109 records).
Hosts: tile.loc.gov and cdn.loc.gov only. cdn.loc.gov answers with a 301 to tile.loc.gov/storage-services/...: the Location is read,
its host is checked against the two allowed hosts, and it is requested after the same pause (no automatic redirect following).
At most 1 request per second (1.15 s between requests). Never retried more than twice; an error is recorded as failed.
Derivatives: 'medium' = the record's r.jpg (service_medium), 'large' = the record's v.jpg (about 1024 px). The master TIFFs are not fetched.
Files: tmp/photomatch/loc/<resource id>_<r|v>.jpg (gitignored). Tracked output: images_ledger.json (sha256, bytes, pixel size, URLs, licence basis).
Usage: python3 -I tools/bt/photomatch/fetch_loc.py [--medium-only]
Resumable: an entry whose file is on disk with the recorded sha256 is skipped."""
import hashlib, json, os, re, subprocess, sys, time, glob, fcntl
from urllib.parse import urlparse
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
RAW = os.path.join(ROOT, 'tmp', 'photomatch', 'raw'); OUT = os.path.join(ROOT, 'tmp', 'photomatch', 'loc'); os.makedirs(OUT, exist_ok=True)
LED = os.path.join(HERE, 'images_ledger.json'); LOG = os.path.join(ROOT, 'tmp', 'photomatch', 'fetch_loc.log')
ALLOWED = {'tile.loc.gov', 'cdn.loc.gov'}; PAUSE = 1.15; _last = [0.0]
def pace():
    dt = time.time() - _last[0]
    if dt < PAUSE: time.sleep(PAUSE - dt)
def curl(url, dst):
    """One GET, no redirect following. Returns (http_code, redirect_url, content_type)."""
    pace()
    r = subprocess.run(['curl', '-sS', '-m', '120', '-o', dst, '-w', '%{http_code}\t%{redirect_url}\t%{content_type}', url], capture_output=True, text=True)
    _last[0] = time.time()
    p = (r.stdout or '\t\t').split('\t'); return p[0], (p[1] if len(p) > 1 else ''), (p[2] if len(p) > 2 else ''), r.stderr.strip()[:200]
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()
def complete(path):
    """True when the JPEG decodes to the last pixel (a cut-short download keeps a readable header, so Image.open alone is not enough)."""
    try:
        with Image.open(path) as I: I.load()
        return True
    except Exception: return False
def log(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); open(LOG, 'a').write(s + '\n')
def fetch(url, dst):
    """Returns dict(status, http, url_final, hops, error)."""
    hops = []; u = url
    for hop in range(3):
        host = urlparse(u).netloc
        if host not in ALLOWED: return {'status': 'failed', 'error': f'host {host} is not one of the allowed image hosts; not requested', 'hops': hops}
        tmp = dst + '.part'; code, loc, ctype, err = curl(u, tmp); hops.append({'url': u, 'http': code})
        if code in ('301', '302', '307', '308') and loc:
            if os.path.exists(tmp): os.remove(tmp)
            u = loc; continue
        if code == '200' and ctype.startswith('image/jpeg'):
            os.replace(tmp, dst); return {'status': 'ok', 'http': code, 'url_final': u, 'hops': hops}
        if os.path.exists(tmp): os.remove(tmp)
        return {'status': 'failed', 'http': code, 'url_final': u, 'hops': hops, 'error': (err or f'content-type {ctype}')}
    return {'status': 'failed', 'error': 'more than two redirects', 'hops': hops}
def main():
    medium_only = '--medium-only' in sys.argv
    led = json.load(open(LED)); im = led['images']; n_ok = n_fail = n_skip = 0
    jobs = []
    for f in sorted(glob.glob(os.path.join(RAW, 'item_*.json'))):
        d = json.load(open(f)); it = d['item']; pk = it['control_number']; rights = it.get('rights_information') or ''
        for i, r in enumerate(d.get('resources') or []):
            for der, k in (('medium', 'r'), ('large', 'v')):
                if medium_only and der != 'medium': continue
                url = r.get(der) or ''
                key = f"LOC{pk}_{r['id']}_{k}"
                if not url or url.endswith('notdig.gif'):
                    im[key] = {'status': 'not_offered', 'loc_id': pk, 'resource_id': r['id'], 'resource_note': r.get('note'), 'derivative': der, 'url': url or None,
                               'reason': 'the catalogue record offers no ' + der + ' JPEG for this resource (placeholder notdig.gif)' if url else 'no URL in the record'}
                    continue
                jobs.append((key, pk, i, r, der, k, url, rights))
    log('jobs', len(jobs), time.strftime('%Y-%m-%d %H:%M:%S'))
    for n, (key, pk, i, r, der, k, url, rights) in enumerate(jobs):
        dst = os.path.join(OUT, f"{r['id']}_{k}.jpg"); cur = im.get(key)
        decl = r.get(der + '_s')
        if cur and cur.get('status') == 'ok' and os.path.exists(dst) and sha(dst) == cur.get('sha256') and (not decl or os.path.getsize(dst) == decl) and complete(dst): n_skip += 1; continue
        res = None
        for attempt in range(3):
            res = fetch(url, dst)
            if res['status'] == 'ok':
                # a transfer cut short still has a readable header: compare with the size the record declares and decode every pixel
                if decl and os.path.getsize(dst) != decl: res = {'status': 'failed', 'http': res.get('http'), 'url_final': res.get('url_final'), 'hops': res.get('hops'), 'error': f'truncated: {os.path.getsize(dst)} bytes received, the record declares {decl}'}; os.remove(dst)
                elif not complete(dst): res = {'status': 'failed', 'http': res.get('http'), 'url_final': res.get('url_final'), 'hops': res.get('hops'), 'error': 'JPEG does not decode completely'}; os.remove(dst)
            if res['status'] == 'ok': break
            if res.get('http') in ('403', '404', '410'): break
            time.sleep(10)
        e = {'status': res['status'], 'loc_id': pk, 'resource_id': r['id'], 'resource_index': i, 'resource_note': r.get('note'), 'derivative': der,
             'url': url, 'url_final': res.get('url_final'), 'http': res.get('http'), 'hops': res.get('hops'), 'fetched': time.strftime('%Y-%m-%d')}
        if res['status'] == 'ok':
            b = os.path.getsize(dst)
            try:
                with Image.open(dst) as I: I.load(); W, H = I.size; mode = I.mode
            except Exception as ex:
                e.update(status='failed', error='not a readable JPEG: ' + str(ex)[:120]); im[key] = e; n_fail += 1; log('FAILED', key, e['error']); continue
            e.update(bytes=b, bytes_declared_by_record=r.get(der + '_s'), sha256=sha(dst), width=W, height=H, mode=mode, local_file=os.path.relpath(dst, ROOT),
                     licence_basis=('LOC record rights statement: "' + rights + '"; 1863 photograph (public domain by age); JPEG derivative served by the Library of Congress') if 'No known restrictions' in rights else 'UNCLEAR: rights statement "' + rights + '"')
            n_ok += 1; log('ok', n + 1, len(jobs), key, b, W, H)
        else:
            e['error'] = res.get('error'); n_fail += 1; log('FAILED', key, res.get('http'), res.get('error'))
        im[key] = e
        if (n_ok + n_fail) % 20 == 0: save(led)
    save(led); log('done ok', n_ok, 'failed', n_fail, 'skipped (already on disk)', n_skip, time.strftime('%Y-%m-%d %H:%M:%S'))
def save(led):
    led['_doc'] = ('sha256 ledger of fetched photograph files (Q16). Files themselves live in gitignored tmp/photomatch/. Entries written by fetch_images.py '
                   '(archive.org copies, 2026-11-11) and by fetch_loc.py (Library of Congress JPEG derivatives: tile.loc.gov, and cdn.loc.gov which redirects to it).')
    led['total_bytes'] = sum(v.get('bytes', 0) for v in led['images'].values())
    led['counts'] = {}
    for v in led['images'].values(): led['counts'][v.get('status')] = led['counts'].get(v.get('status'), 0) + 1
    tmp = LED + '.tmp'; json.dump(led, open(tmp, 'w'), indent=1); os.replace(tmp, LED)
if __name__ == '__main__': main()
