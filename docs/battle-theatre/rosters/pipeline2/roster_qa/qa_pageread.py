"""Second reading of single pages for lines that the first text layer lost (roster-qa task 4).  Standard library plus Pillow and numpy.

    python3 -I qa_pageread.py read PAGE_ID [PAGE_ID ...]            render, read with tesseract, keep the text as a derived text pinned in data2/qa/pageread-ledger.json
    python3 -I qa_pageread.py locate PAGE_ID "text of the lost line" [--n 3]    the lines of the derived text that resemble the lost line (best first, with offsets)
    python3 -I qa_pageread.py row PAGE_ID OFFSET LENGTH              show the derived text at an offset (to check a recovered row)

A recovered row is written only with its own locator: a text id of the ledger data2/qa/pageread-ledger.json (item identifier, leaf, PDF page, tesseract version and options, sha256 of the
text) and the character offset of the first name character in that derived text.  The sample reader looks at the image of the line (Read tool) before a row is written;
a name that tesseract did not read is NOT written (it is reported as read by eye only).  A recovered row is never merged into an existing unit file.
"""
import sys, os, re, json, time, subprocess, hashlib, difflib, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_render as RN

PR = os.path.join(Q.TMP, '_qa', 'pageread')
LEDGER = os.path.join(Q.QA, 'pageread-ledger.json')


def tess_version():
    out = subprocess.run(['tesseract', '--version'], capture_output=True, text=True)
    return (out.stdout or out.stderr).splitlines()[0].strip()


def load_ledger():
    if os.path.exists(LEDGER):
        return Q.jload(LEDGER)
    return {'format': 'roster2-source-ledger/1', 'source_id': 'QA-PAGEREAD',
            'about': 'Derived texts: tesseract readings of single pages of Internet Archive items (the item PDF through archive.org/cors, one page rendered at 300 dpi, table rules removed, psm 6), pinned by sha256; '
                     'they are second readings made for lines that the first text layer lost (roster-qa). They are not source texts of the unit files.',
            'texts': {}, 'failed': []}


def read(pids, tsv=False):
    led = load_ledger()
    recs = RN.render(pids, tsv=tsv)           # renders, reads, writes data2/qa/pages/<stem>.read.json, leaves the view image and the text in tmp/_qa
    os.makedirs(PR, exist_ok=True)
    tv = tess_version()
    for rec in recs:
        if rec.get('error'):
            led['failed'].append({'page': rec['id'], 'error': rec['error'], 'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
            continue
        stem = RN.page_stem(rec['id'])
        src = os.path.join(RN.OCR, stem + '.txt')
        dst = os.path.join(PR, stem + '.txt')
        shutil.copyfile(src, dst)
        if tsv and os.path.exists(os.path.join(RN.OCR, stem + '.tsv')):
            shutil.copyfile(os.path.join(RN.OCR, stem + '.tsv'), os.path.join(PR, stem + '.tsv'))
        data = open(dst, 'rb').read()
        tid = 'QA-PAGEREAD.' + stem
        led['texts'][tid] = {'ia_identifier': rec['identifier'], 'leaf': rec['leaf'], 'printed_page': rec['printed_page'], 'pdf_page': rec['pdf_page'], 'pdf_sha256': rec['pdf_sha256'],
                             'engine': tv + ', eng, psm %d, 300 dpi grey render, table rules removed before reading' % rec['psm'], 'kind': 'tesseract-page-read',
                             'local_dir': Q.rel(PR), 'files': {'text': {'name': stem + '.txt', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}},
                             'rights': 'derived from the page image of the Internet Archive item %s (the rights basis of that item applies)' % rec['identifier'],
                             'read_utc': rec['rendered_utc']}
        print('derived text', tid, len(data), 'bytes')
    Q.jdump(LEDGER, led)


def derived_text(pid):
    stem = RN.page_stem(pid)
    return open(os.path.join(PR, stem + '.txt'), encoding='utf-8', errors='replace').read()


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def locate(pid, text, n=3):
    t = derived_text(pid)
    lines = t.split('\n')
    target = norm(text)
    scored = []
    off = 0
    for i, ln in enumerate(lines):
        # a line of the table may continue on the next line (wrapped remark): score the line and the line with its successor
        for span in (1, 2):
            chunk = ' '.join(lines[i:i + span])
            c = norm(chunk)
            if not c:
                continue
            m = difflib.SequenceMatcher(None, target, c, autojunk=False)
            scored.append((m.ratio(), i, span, off, chunk))
        off += len(ln) + 1
    scored.sort(reverse=True)
    return scored[:n]


def tsv_lines(pid):
    """Lines of the tesseract TSV of a page: [(top px at 300 dpi, left, height, text)] in reading order (needs read --tsv)."""
    stem = RN.page_stem(pid)
    rows = {}
    for ln in open(os.path.join(PR, stem + '.tsv'), encoding='utf-8', errors='replace').read().split('\n')[1:]:
        c = ln.split('\t')
        if len(c) < 12 or c[0] != '5' or not c[11].strip():
            continue
        key = (int(c[2]), int(c[3]), int(c[4]))
        rows.setdefault(key, []).append((int(c[6]), int(c[7]), int(c[8]), int(c[9]), c[11]))
    out = []
    for key in sorted(rows):
        w = rows[key]
        out.append((min(x[1] for x in w), min(x[0] for x in w), max(x[3] for x in w), ' '.join(x[4] for x in w)))
    return out


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    cmd = argv[0]
    if cmd == 'read':
        read([a for a in argv[1:] if not a.startswith('--')], tsv='--tsv' in argv)
    elif cmd == 'locate':
        n = int(argv[argv.index('--n') + 1]) if '--n' in argv else 3
        for ratio, i, span, off, chunk in locate(argv[1], argv[2], n):
            print('%.3f line %d (+%d) offset %d | %s' % (ratio, i, span - 1, off, chunk[:230]))
    elif cmd == 'lines':
        for top, left, h, t in tsv_lines(argv[1]):
            if len(argv) < 3 or re.search(argv[2], t, re.I):
                print('%5d %4d %3d | %s' % (top, left, h, t[:200]))
    elif cmd == 'row':
        t = derived_text(argv[1])
        o, l = int(argv[2]), int(argv[3])
        print(repr(t[o:o + l]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
