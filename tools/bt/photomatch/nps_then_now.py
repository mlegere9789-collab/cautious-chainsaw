#!/usr/bin/env python3
"""Parse the National Park Service 'Then And Now' pages (Gettysburg NMP) into nps_then_now.json and fetch their image pairs.
Source pages (official NPS pages, fetched with webget.py at 1 request per second, saved under tmp/library/web/photomatch/www.nps.gov/):
  https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm  (index: says the modern versions were 'taken from the same location as the originals')
  .../rose-woods-then-and-now.htm, devil-s-den-then-and-now.htm, little-round-top-then-and-now.htm, trostle-farm-then-and-now.htm, buildings-and-farms-then-and-now.htm
Every text field in the output is copied verbatim from the saved page (whitespace collapsed); nothing is added.
The pages give view directions and landmarks in words; they give no coordinates (checked: no latitude/longitude in the HTML, no GPS tag in the image files).
Usage: python3 -I tools/bt/photomatch/nps_then_now.py [--images]"""
import hashlib, html, json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import webget
D = os.path.join(ROOT, 'tmp', 'library', 'web', 'photomatch', 'www.nps.gov')
SERIES = ['rose-woods', 'devil-s-den', 'little-round-top', 'trostle-farm', 'buildings-and-farms']
URL = 'https://www.nps.gov/gett/learn/photosmultimedia/%s-then-and-now.htm'
def clean(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'(?s)<[^>]+>', ' ', s))).strip()
def sha_file(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
def main():
    out = {'_doc': 'National Park Service Then And Now comparisons for Gettysburg, parsed verbatim from the saved pages by nps_then_now.py. A page of an official body supports only what it literally says. No coordinates are published on these pages.',
           'index': {}, 'series': []}
    idx = webget.get(URL.replace('%s-', '') % ()) if False else webget.get('https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm')
    ip = os.path.join(D, 'gett_learn_photosmultimedia_then-and-now.htm'); t = open(ip + '.txt', encoding='utf-8').read()
    m = re.search(r'These Then-And-Now pictures bring together[^\n]+', t)
    out['index'] = {'url': 'https://www.nps.gov/gett/learn/photosmultimedia/then-and-now.htm', 'text_file': os.path.relpath(ip + '.txt', ROOT), 'text_sha256': sha_file(ip + '.txt'),
                    'html_sha256': sha_file(ip), 'statement': m.group(0).strip() if m else None, 'last_updated': (re.search(r'Last updated: ([^\n]+)', t) or [None, None])[1]}
    for s in SERIES:
        u = URL % s; webget.get(u); p = os.path.join(D, 'gett_learn_photosmultimedia_%s-then-and-now.htm' % s)
        raw = open(p, encoding='utf-8', errors='replace').read(); txt = open(p + '.txt', encoding='utf-8').read()
        ser = {'series': s, 'url': u, 'html_file': os.path.relpath(p, ROOT), 'html_sha256': sha_file(p), 'text_file': os.path.relpath(p + '.txt', ROOT), 'text_sha256': sha_file(p + '.txt'),
               'last_updated': (re.search(r'Last updated: ([^\n]+)', txt) or [None, None])[1], 'comparisons': []}
        for blk in raw.split('<div class="ImageComparison">')[1:]:
            head = clean(re.search(r'(?s)<p class="ImageComparison__Heading">(.*?)</p>', blk).group(1))
            imgs = re.findall(r'<img src="([^"?]+)\?[^"]*" alt="([^"]*)"', blk.split('ImageComparison__Caption__Container')[0])
            caps = re.findall(r'(?s)<div class="ImageComparison__Caption col-sm-6">\s*<p>(.*?)</p>', blk)
            def cap(c):
                c2 = re.sub(r'(?s)<span class="ImageComparison__Caption__Heading">.*?</span>', '', c)
                cr = re.search(r'(?s)<span class="ImageComparison__Caption__Credit">(.*?)</span>', c2)
                return {'caption': clean(re.sub(r'(?s)<span class="ImageComparison__Caption__Credit">.*?</span>', '', c2)), 'credit': clean(cr.group(1)) if cr else None}
            rel = re.search(r'(?s)<div class="ImageComparison__RelatedText">(.*?)</div>', blk)
            n = re.match(r'(\d+)\.\s*(.*)', head)
            c = {'n': int(n.group(1)) if n else None, 'heading': head, 'alt': html.unescape(imgs[0][1]) if imgs else None,
                 'then': {**(cap(caps[0]) if caps else {}), 'image_url': ('https://www.nps.gov' + imgs[0][0]) if imgs else None},
                 'now': {**(cap(caps[1]) if len(caps) > 1 else {}), 'image_url': ('https://www.nps.gov' + imgs[1][0]) if len(imgs) > 1 else None},
                 'related_text': clean(rel.group(1)) if rel else None}
            # every extracted sentence must be present in the saved text file (the file the sha256 refers to)
            flat = re.sub(r'\s+', ' ', txt)
            for fld in (c['then'].get('caption'), c['now'].get('caption'), c['related_text']):
                if fld and fld[:60] not in flat: raise SystemExit('parse does not match the saved text: ' + fld[:80])
            ser['comparisons'].append(c)
        out['series'].append(ser)
    if '--images' in sys.argv:
        for ser in out['series']:
            for c in ser['comparisons']:
                for side in ('then', 'now'):
                    u = c[side].get('image_url')
                    if not u: continue
                    nm = 'tn_%s_%02d_%s.jpg' % (ser['series'], c['n'] or 0, side); r = webget.get(u, name=nm)
                    f = os.path.join(D, nm)
                    if os.path.exists(f): c[side].update(local_file=os.path.relpath(f, ROOT), sha256=sha_file(f), bytes=os.path.getsize(f))
                    else: c[side].update(fetch_status=r.get('status'), fetch_error=r.get('error'))
    else:
        for ser in out['series']:
            for c in ser['comparisons']:
                for side in ('then', 'now'):
                    nm = 'tn_%s_%02d_%s.jpg' % (ser['series'], c['n'] or 0, side); f = os.path.join(D, nm)
                    if os.path.exists(f): c[side].update(local_file=os.path.relpath(f, ROOT), sha256=sha_file(f), bytes=os.path.getsize(f))
    json.dump(out, open(os.path.join(HERE, 'nps_then_now.json'), 'w'), indent=1, ensure_ascii=False)
    print(sum(len(s['comparisons']) for s in out['series']), 'comparisons in', len(out['series']), 'series')
if __name__ == '__main__': main()
