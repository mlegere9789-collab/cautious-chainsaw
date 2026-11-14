"""One page of an Internet Archive volume as an image, read a second time with tesseract, for the independent sample (R-G9) and for lost names.

    python3 -I page_image.py page TEXT_ID LEAF [--dpi 200] [--psm 6] [--keep]     render the leaf, read it, compare with the pinned text
    python3 -I page_image.py fetch IDENTIFIER                                     download the item's text PDF (and the scan data when needed)
    python3 -I page_image.py drop IDENTIFIER                                      delete the cached PDF

Route (Measured 2026-11-14): https://archive.org/cors/<id>/<id>.pdf is served by archive.org itself (the text PDF carries each page as a
300 ppi bilevel text layer over a small colour background; 2.5 MB for a 170-page book, 67 MB for a 4,600-leaf volume); the page
route archive.org/download/<id>/page/nN_wW.jpg and iiif.archive.org redirect to a data host the proxy refuses, and /cors/ ignores HTTP
Range (it answers 200 with the whole file), so a page is cut out of a local copy of the PDF with pdftoppm.  tesseract 5 (eng) reads
a page in about 1.2 s of CPU when OMP_THREAD_LIMIT=1; this script sets it.  Never run more than one at a time without
tools/horde/bench.sh; one page costs about 1.5 s CPU, a whole volume does not belong here.

TEXT_ID is a text id of a ledger in data2/sources/ (for example VT-ROSTER-1892.1); LEAF is the leaf number of the Internet Archive page
index (0 based, as in the row's offset -> leaf).  The PDF holds the leaves whose scan data says addToAccessFormats true, in order; when
the page count of the PDF differs from the leaf count the scan data is read and the page is found through it.  The comparison is the
share of the image-read tokens (4 or more letters) that stand in the pinned text of the leaf: a share below 0.5 means the wrong page.
Images are transient (deleted unless --keep, never stored in the tree); the read text is written to tmp/library/rosters/_img/.
Rules: archive.org /cors/ only, one request at a time, 1.2 s apart, a generic client name, no login, no workaround of a refusal.
"""
import sys, os, re, json, time, subprocess, gzip, argparse, urllib.request, urllib.error, ssl
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r2lib as R

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
D2 = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data2')
TMP = os.path.join(ROOT, 'tmp', 'library', 'rosters')
PDFDIR = os.path.join(TMP, '_pdf')
IMGDIR = os.path.join(TMP, '_img')
UA = 'roster-research/1.0 (public-domain page check; one request per second)'
GAP = 1.2
BIG = 400 * 1000 * 1000
_last = [0.0]


def _ctx():
    ca = os.environ.get('NODE_EXTRA_CA_CERTS') or '/root/.ccr/ca-bundle.crt'
    return ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()


def download(url, dest, cap=BIG):
    wait = GAP - (time.time() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=180, context=_ctx()) as r:
            n = int(r.headers.get('Content-Length') or 0)
            if n > cap:
                return 0, 'refused: %d bytes is over the cap of %d (use --allow-big after thinking about the disk)' % (n, cap)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest + '.part', 'wb') as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
        os.replace(dest + '.part', dest)
        return 200, os.path.getsize(dest)
    except urllib.error.HTTPError as e:
        return e.code, 'HTTP %d' % e.code
    except Exception as e:
        return 0, repr(e)


def fetch(ident, want_scandata=False, cap=BIG):
    pdf = os.path.join(PDFDIR, ident + '.pdf')
    if not os.path.exists(pdf):
        st, info = download('https://archive.org/cors/%s/%s.pdf' % (ident, ident), pdf, cap)
        if st != 200:
            return None, None, 'no PDF: %s' % (info,)
    sd = os.path.join(PDFDIR, ident + '_scandata.xml')
    if want_scandata and not os.path.exists(sd):
        st, info = download('https://archive.org/cors/%s/%s_scandata.xml' % (ident, ident), sd, 50 * 1000 * 1000)
        if st != 200:
            return pdf, None, 'no scan data: %s' % (info,)
    return pdf, (sd if os.path.exists(sd) else None), None


def pdf_pages(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    m = re.search(r'^Pages:\s+(\d+)', out, re.M)
    return int(m.group(1)) if m else None


def leaf_to_pdf_page(leaf, n_leaves, pdf, ident):
    """1-based PDF page of a 0-based leaf: identity when the counts agree, else through the scan data."""
    n = pdf_pages(pdf)
    if n == n_leaves:
        return leaf + 1, n, 'identity (the PDF has as many pages as the item has leaves)'
    _, sd, err = fetch(ident, want_scandata=True)
    if not sd:
        return None, n, 'PDF has %s pages, the item %d leaves, and the scan data could not be read (%s)' % (n, n_leaves, err)
    kept, k = {}, 0
    for pg in ET.parse(sd).getroot().iter():
        if pg.tag.endswith('page'):
            ln = pg.get('leafNum')
            acc = next((c.text for c in pg if c.tag.endswith('addToAccessFormats')), 'true')
            if ln is not None and str(acc).strip().lower() != 'false':
                k += 1
                kept[int(ln)] = k
    return kept.get(leaf), n, 'through the scan data (%d of %d leaves are in the PDF)' % (len(kept), n_leaves)


def tokens(s, minlen=4):
    return [t.lower() for t in re.findall(r"[A-Za-z]{%d,}" % minlen, s)]


def page(text_id, leaf, dpi=200, psm=6, keep=False, cap=BIG):
    sid = text_id.split('.')[0]
    led = json.load(open(os.path.join(D2, 'sources', sid + '.json'), encoding='utf-8'))
    ent = led['texts'][text_id]
    ident = ent['ia_identifier']
    d = os.path.join(ROOT, ent['local_dir'])
    f = ent['files']
    text = R.load_text(os.path.join(d, f['text']['name']))
    pm = R.PageMap(os.path.join(d, f['pageindex']['name']), os.path.join(d, f['page_numbers']['name']) if 'page_numbers' in f else None)
    if leaf < 0 or leaf >= len(pm.ranges):
        return {'error': 'leaf %d is outside 0..%d' % (leaf, len(pm.ranges) - 1)}
    pdf, _, err = fetch(ident, cap=cap)
    if err:
        return {'error': err, 'identifier': ident}
    p, npdf, how = leaf_to_pdf_page(leaf, len(pm.ranges), pdf, ident)
    if p is None:
        return {'error': how, 'identifier': ident}
    os.makedirs(IMGDIR, exist_ok=True)
    stem = os.path.join(IMGDIR, '%s-leaf%04d' % (ident, leaf))
    subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-gray', '-png', '-singlefile', pdf, stem], check=True, capture_output=True)
    env = dict(os.environ, OMP_THREAD_LIMIT='1')
    t0 = time.process_time()
    subprocess.run(['nice', '-n', '10', 'tesseract', stem + '.png', stem, '-l', 'eng', '--psm', str(psm)], check=True, capture_output=True, env=env)
    read = open(stem + '.txt', encoding='utf-8', errors='replace').read()
    a, b = pm.span(leaf)
    leaf_tokens = set(tokens(text[a:b]))
    mine = tokens(read)
    share = round(sum(1 for t in mine if t in leaf_tokens) / len(mine), 3) if mine else None
    out = {'text_id': text_id, 'identifier': ident, 'leaf': leaf, 'printed_page': pm.printed(leaf), 'pdf_page': p, 'pdf_pages': npdf, 'mapping': how,
           'dpi': dpi, 'psm': psm, 'tesseract_tokens': len(mine), 'share_in_pinned_leaf': share, 'right_page': bool(share is not None and share >= 0.5),
           'read_text': rel(stem + '.txt'), 'image': rel(stem + '.png') if keep else None}
    if not keep:
        os.remove(stem + '.png')
    return out


def rel(p):
    return os.path.relpath(p, ROOT).replace(os.sep, '/')


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['page', 'fetch', 'drop'])
    ap.add_argument('a')
    ap.add_argument('b', nargs='?')
    ap.add_argument('--dpi', type=int, default=200)
    ap.add_argument('--psm', type=int, default=6)
    ap.add_argument('--keep', action='store_true')
    ap.add_argument('--allow-big', action='store_true')
    a = ap.parse_args(argv)
    cap = 4 * BIG if a.allow_big else BIG
    if a.cmd == 'fetch':
        pdf, sd, err = fetch(a.a, cap=cap)
        print(json.dumps({'pdf': rel(pdf) if pdf else None, 'bytes': os.path.getsize(pdf) if pdf else None, 'pages': pdf_pages(pdf) if pdf else None, 'error': err}))
        return 1 if err else 0
    if a.cmd == 'drop':
        n = 0
        for f in (a.a + '.pdf', a.a + '_scandata.xml'):
            p = os.path.join(PDFDIR, f)
            if os.path.exists(p):
                os.remove(p)
                n += 1
        print('removed %d file(s)' % n)
        return 0
    r = page(a.a, int(a.b), a.dpi, a.psm, a.keep, cap)
    print(json.dumps(r, ensure_ascii=False))
    return 1 if r.get('error') else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
