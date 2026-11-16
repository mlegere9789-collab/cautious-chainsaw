#!/usr/bin/env python3
"""Image crops of quoted passages: the page-image check of the OCR text (one request per second, calib.MIN_GAP).

Usage: python3 -I crop_batch.py JOBS.json
  JOBS.json = list of {"page": "sn83030313/1863-07-06/ed-1/seq-4", "quote": "<verbatim passage of the saved reading text>", "tag": "short_name"}
For each job the quote is located in the word list of the page's ALTO file (plain token match, the same order as the saved
reading text). A quote that runs over a column break is cut into runs (a run ends where the reading jumps to the top of the
next column); every run gets its own crop of the IIIF image service (tile.loc.gov): region = bounding box of the run + padding.
Tags: 'tag' for a single run, 'tag_1', 'tag_2' ... for several. Each crop is recorded in images.jsonl (url, sha256, region).
A job whose crops are all saved already is skipped (no request).
Prints one line per crop: tag, path, size.
"""
import hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import calib, rebuild_cols

IIIF = 'https://tile.loc.gov/image-services/iiif/'
PAD = 100
MAXW = 1400


def iiif_id(segment):
    assert segment.startswith('/service/ndnp/') and segment.endswith('.xml')
    return 'service:ndnp:' + segment[len('/service/ndnp/'):-4].replace('/', ':')


def load_images():
    out = {}
    p = os.path.join(calib.CA_DOCS, 'images.jsonl')
    if os.path.exists(p):
        for l in open(p, encoding='utf-8'):
            if l.strip():
                d = json.loads(l)
                out[(d['page_id'], d['tag'])] = d
    return out


def find_runs(words, quote):
    """Token run of the quote in the word list, cut into runs at column breaks. Returns list of lists of word tuples, or None."""
    qt = quote.split()
    n = len(qt)
    toks = [w[0] for w in words]
    for s in range(len(toks) - n + 1):
        if toks[s:s + n] == qt:
            seg = words[s:s + n]
            runs, cur = [], [seg[0]]
            for prev, w in zip(seg, seg[1:]):
                px, py, pw, ph = prev[4]
                x, y, ww, hh = w[4]
                if y < py - 8 * max(ph, 60):      # the reading jumped back up the page: the next column starts here
                    runs.append(cur)
                    cur = []
                cur.append(w)
            runs.append(cur)
            return runs
    return None


def main():
    jobs = json.load(open(sys.argv[1], encoding='utf-8'))
    man = calib.load_manifest()
    have = load_images()
    for job in jobs:
        pid, quote, tag = job['page'], ' '.join(job['quote'].split()), job['tag']
        m = man.get(pid)
        if not m:
            print('NO PAGE', pid)
            continue
        text, words, info = rebuild_cols.rebuild(os.path.join(calib.ROOT, m['alto_gz_path']))
        runs = find_runs(words, quote)
        if not runs:
            print('QUOTE NOT FOUND as a plain token run: %s | %s' % (pid, quote[:80]))
            continue
        ident = iiif_id(m['segment'])
        infop = os.path.join(calib.IMAGES_DIR, pid + '.info.json')
        if not os.path.exists(infop):
            r = calib.http_get(IIIF + ident + '/info.json', infop, timeout=60, note='image info')
            if r.get('status') != 200:
                print('info.json failed', pid, r.get('status'))
                continue
        inf = json.load(open(infop))
        sc = inf['width'] / float(info['width'])
        for i, run in enumerate(runs, 1):
            t = tag if len(runs) == 1 else '%s_%d' % (tag, i)
            if (pid, t) in have and os.path.exists(os.path.join(calib.ROOT, have[(pid, t)]['local_path'])):
                print('%s already saved: %s' % (t, have[(pid, t)]['local_path']))
                continue
            x0 = min(g[4][0] for g in run)
            y0 = min(g[4][1] for g in run)
            x1 = max(g[4][0] + g[4][2] for g in run)
            y1 = max(g[4][1] + g[4][3] for g in run)
            X0 = max(0, int(x0 * sc) - PAD)
            Y0 = max(0, int(y0 * sc) - PAD)
            X1 = min(inf['width'], int(x1 * sc) + PAD)
            Y1 = min(inf['height'], int(y1 * sc) + PAD)
            w, h = X1 - X0, Y1 - Y0
            size = 'full' if w <= MAXW else '%d,' % MAXW
            url = '%s%s/%d,%d,%d,%d/%s/0/default.jpg' % (IIIF, ident, X0, Y0, w, h, size)
            out = os.path.join(calib.IMAGES_DIR, pid + '.%s.jpg' % t)
            r = calib.http_get(url, out, timeout=120, note='image crop of a quote')
            if r.get('status') in (0, 500, 502, 503, 504, 520, 522, 524):
                import time
                time.sleep(4)
                r = calib.http_get(url, out, timeout=120, note='image crop of a quote (second try after a transient error)')
            if r.get('status') != 200:
                print('crop failed', pid, t, r.get('status'))
                continue
            part = ' '.join(g[0] for g in run)
            calib.append_jsonl(os.path.join(calib.CA_DOCS, 'images.jsonl'), {
                'page_id': pid, 'tag': t, 'quote': part, 'url': url, 'local_path': calib.rel(out), 'sha256': r.get('sha256'), 'bytes': r.get('bytes'),
                'region_px': [X0, Y0, w, h], 'image_px': [inf['width'], inf['height']], 'fetched_at': calib.now()})
            print('%s %s %dx%d px words %d' % (t, calib.rel(out), w, h, len(run)))


if __name__ == '__main__':
    main()
