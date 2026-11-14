"""Render drawn pages for the independent sample and read them a second time with tesseract.  Standard library plus Pillow.

    python3 -I qa_render.py render PAGE_ID [PAGE_ID ...] [--dpi 300] [--psm 6]     PAGE_ID = <identifier>/<leaf> as in data2/qa/frame.json
    python3 -I qa_render.py crop PAGE_ID X0 Y0 X1 Y1 [--dpi 300] [--out NAME]       a zoomed crop (fractions 0..1 of the page) of the page for the eye
    python3 -I qa_render.py drop IDENTIFIER                                         delete the cached PDF of the item
    python3 -I qa_render.py clean PAGE_ID ...                                       delete the transient images and the read text of the pages

Route (PRODUCTION-PLAN 9.5): the item's text PDF from https://archive.org/cors/<id>/<id>.pdf (one request, 1.2 s after the previous one, a
generic client name), the page cut out with pdftoppm at 300 dpi, a 200 dpi copy for the eye (looked at with the Read tool: the independent
reader of the sample), tesseract 5 as the bulk second reader.  Images are transient: they live under tmp/library/rosters/_qa/img and are
deleted when the page verdict is written (qa_verdict.py), never stored in the tree.  The sha256 of the PDF, of the 300 dpi render and of the
tesseract text of every page is written to data2/qa/pages/<identifier>-<leaf>.read.json so that a verdict is tied to what was looked at.
Run it through tools/horde/bench.sh when it renders more than about ten pages.
"""
import sys, os, json, re, time, subprocess, argparse, hashlib, resource
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import qa_lib as Q
import page_image as PI
from PIL import Image

IMG = os.path.join(Q.QTMP, 'img')
OCR = os.path.join(Q.QTMP, 'ocr')
READ = os.path.join(Q.QA, 'pages')


def remove_rules(path_in, path_out, vmin=70, hmin=250):
    """Whiten the long vertical and horizontal runs of dark pixels (table rules) of a 300 dpi grey page; the page for the eye is not touched."""
    im = np.array(Image.open(path_in).convert('L'))
    bg = float(np.percentile(im, 75))                 # the page background (255 on a clean scan, about 155 on the grey Maine scans)
    dark = im < min(140.0, bg - 60.0)

    def runs(d, minlen):
        out = np.zeros_like(d)
        for x in range(d.shape[1]):
            col = d[:, x]
            if not col.any():
                continue
            idx = np.flatnonzero(np.diff(np.concatenate(([0], col.view(np.int8), [0]))))
            for s, e in zip(idx[0::2], idx[1::2]):
                if e - s >= minlen:
                    out[s:e, x] = True
        return out
    lines = runs(dark, vmin) | runs(dark.T, hmin).T
    grown = lines.copy()
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            grown |= np.roll(np.roll(lines, dx, 1), dy, 0)
    im[grown] = 255
    Image.fromarray(im).save(path_out)


def ident_text_id():
    """identifier -> text id of the ledger (first one) for the page index."""
    m = {}
    import glob
    for p in sorted(glob.glob(os.path.join(Q.D2, 'sources', '*.json'))):
        if p.endswith('ia_catalogue.json'):
            continue
        for tid, ent in Q.jload(p).get('texts', {}).items():
            if 'pageindex' not in ent.get('files', {}):        # derived page reads (QA-PAGEREAD) have no page index
                continue
            m.setdefault(ent['ia_identifier'], tid)
    return m


def page_stem(pid):
    ident, leaf = pid.rsplit('/', 1)
    return '%s-%04d' % (ident, int(leaf))


def render(pids, dpi=300, psm=6, tsv=False):
    os.makedirs(IMG, exist_ok=True)
    os.makedirs(OCR, exist_ok=True)
    os.makedirs(READ, exist_ok=True)
    tmap = ident_text_id()
    by = {}
    for pid in pids:
        ident, leaf = pid.rsplit('/', 1)
        by.setdefault(ident, []).append(int(leaf))
    out = []
    for ident, leaves in by.items():
        text, pm, ent = Q.load_source(tmap[ident])
        pdf, _, err = PI.fetch(ident)
        if err:
            for lf in leaves:
                out.append({'id': '%s/%d' % (ident, lf), 'error': err})
            continue
        pdf_sha = Q.R.sha256_file(pdf)
        npdf = PI.pdf_pages(pdf)
        for lf in leaves:
            pid = '%s/%d' % (ident, lf)
            p, _, how = PI.leaf_to_pdf_page(lf, len(pm.ranges), pdf, ident)
            if p is None:
                out.append({'id': pid, 'error': how})
                continue
            stem = os.path.join(IMG, page_stem(pid))
            subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-gray', '-png', '-singlefile', pdf, stem + '-300'], check=True, capture_output=True)
            im = Image.open(stem + '-300.png').convert('L')
            view = im.resize((round(im.width * 200 / dpi), round(im.height * 200 / dpi)), Image.LANCZOS)
            view.save(stem + '.png')
            env = dict(os.environ, OMP_THREAD_LIMIT='1')
            remove_rules(stem + '-300.png', stem + '-300c.png')
            c0 = resource.getrusage(resource.RUSAGE_CHILDREN)
            subprocess.run(['nice', '-n', '10', 'tesseract', stem + '-300c.png', os.path.join(OCR, page_stem(pid)), '-l', 'eng', '--psm', str(psm)] + (['txt', 'tsv'] if tsv else []),
                           check=True, capture_output=True, env=env)
            c1 = resource.getrusage(resource.RUSAGE_CHILDREN)
            tess = open(os.path.join(OCR, page_stem(pid) + '.txt'), encoding='utf-8', errors='replace').read()
            a, b = pm.span(lf)
            leaf_tokens = set(PI.tokens(text[a:b]))
            mine = PI.tokens(tess)
            share = round(sum(1 for t in mine if t in leaf_tokens) / len(mine), 3) if mine else None
            rec = {'id': pid, 'identifier': ident, 'leaf': lf, 'printed_page': pm.printed(lf), 'pdf_page': p, 'pdf_pages': npdf, 'mapping': how,
                   'pdf_sha256': pdf_sha, 'dpi': dpi, 'psm': psm, 'render300_sha256': Q.R.sha256_file(stem + '-300.png'), 'view_png_sha256': Q.R.sha256_file(stem + '.png'),
                   'view_size': list(view.size), 'tess_sha256': hashlib.sha256(tess.encode('utf-8')).hexdigest(), 'tess_tokens4': len(mine), 'share_in_pinned_leaf': share,
                   'right_page': bool(share is not None and share >= 0.5), 'tesseract_cpu_s': round((c1.ru_utime + c1.ru_stime) - (c0.ru_utime + c0.ru_stime), 2),
                   'rules_removed_before_ocr': True,
                   'rendered_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
            Q.jdump(os.path.join(READ, page_stem(pid) + '.read.json'), rec)
            os.remove(stem + '-300.png')
            os.remove(stem + '-300c.png')
            out.append(rec)
            print(json.dumps({k: rec[k] for k in ('id', 'printed_page', 'pdf_page', 'share_in_pinned_leaf', 'right_page', 'tesseract_cpu_s')}), flush=True)
    return out


def crop(pid, x0, y0, x1, y1, dpi=300, name=None):
    ident, leaf = pid.rsplit('/', 1)
    tmap = ident_text_id()
    text, pm, ent = Q.load_source(tmap[ident])
    pdf, _, err = PI.fetch(ident)
    if err:
        print('error', err)
        return None
    p, _, how = PI.leaf_to_pdf_page(int(leaf), len(pm.ranges), pdf, ident)
    stem = os.path.join(IMG, page_stem(pid) + '-crop-big')
    subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', str(dpi), '-gray', '-png', '-singlefile', pdf, stem], check=True, capture_output=True)
    im = Image.open(stem + '.png').convert('L')
    W, H = im.size
    c = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    outp = os.path.join(IMG, '%s-%s.png' % (page_stem(pid), name or 'crop'))
    c.save(outp)
    os.remove(stem + '.png')
    print(outp, c.size)
    return outp


def clean(pids):
    n = 0
    for pid in pids:
        s = page_stem(pid)
        for d, pat in ((IMG, s), (OCR, s)):
            if not os.path.isdir(d):
                continue
            for f in os.listdir(d):
                if f.startswith(pat):
                    os.remove(os.path.join(d, f))
                    n += 1
    print('removed %d file(s)' % n)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['render', 'crop', 'drop', 'clean'])
    ap.add_argument('args', nargs='*')
    ap.add_argument('--dpi', type=int, default=300)
    ap.add_argument('--psm', type=int, default=6)
    ap.add_argument('--out', default=None)
    a = ap.parse_args(argv)
    if a.cmd == 'render':
        render(a.args, a.dpi, a.psm)
    elif a.cmd == 'crop':
        crop(a.args[0], *[float(x) for x in a.args[1:5]], dpi=a.dpi, name=a.out)
    elif a.cmd == 'drop':
        for i in a.args:
            print(PI.main(['drop', i]))
    else:
        clean(a.args)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
