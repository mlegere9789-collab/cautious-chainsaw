"""Title leaf and verso of the five Massachusetts volumes that the unit files use, read from the page images (work item union-ma, rights evidence).

    python3 -I ma_rights_images.py            for each volume 1, 2, 3, 5, 6: fetch the item's text PDF (archive.org /cors/, one request at a time),
                                              render the leaves 4 to 7 (the leaves around the title page), read them with tesseract, look for a
                                              copyright notice in that second reading, delete the PDF; write
                                              GOVERNANCE/horde/ws-rosters/union-ma/rights-images.json and keep the images of leaves 5 and 6
                                              under tmp/library/rosters/_img/ma-rights/ so that a person can look at them

Why: the rights question of the 1931-35 volumes (PRODUCTION-PLAN section 8, owner step 4) rests on the Internet Archive flag and on "no copyright
notice in the OCR text"; the leaves that would carry a notice (the title page and the page after it) have little or no text in the OCR layer
(the verso is an image-only leaf), so the OCR text proves nothing about them.  This reads the images.  It never decides the rights question.

Reuses page_image.py (route, mapping of leaf to PDF page, tesseract settings).  Rules: archive.org /cors/ only, one request at a time, a generic client
name, no login, no workaround; the PDF is deleted after use.  Standard library plus the programs pdftoppm and tesseract.
"""
import sys, os, re, json, subprocess, time, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import page_image as PI
import r2lib as R

ROOT = PI.ROOT
GOV = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-rosters', 'union-ma')
KEEP = os.path.join(PI.TMP, '_img', 'ma-rights')
VOLS = ['1', '2', '3', '5', '6']
LEAVES = [4, 5, 6, 7]
NOTICE = re.compile(r'copy\s*-?\s*right|copr\.|all\s+rights?\s+reserved|©|\(c\)', re.I)


def main():
    os.makedirs(GOV, exist_ok=True)
    os.makedirs(KEEP, exist_ok=True)
    led = json.load(open(os.path.join(PI.D2, 'sources', 'MA-SSM-1931.json'), encoding='utf-8'))
    out = {'format': 'ma-rights-images/1', 'about': 'Leaves 4 to 7 of the five volumes the unit files use, rendered from the item text PDF at 200 dpi and read with tesseract; '
           'the images of leaves 5 (title page) and 6 (its verso) are kept in tmp/library/rosters/_img/ma-rights/ and were looked at by a person or by the engineer through the Read tool where the report says so',
           'generated_utc': datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'), 'volumes': {}}
    for v in VOLS:
        tid = 'MA-SSM-1931.%s' % v
        ent = led['texts'][tid]
        ident = ent['ia_identifier']
        d = os.path.join(ROOT, ent['local_dir'])
        f = ent['files']
        text = R.load_text(os.path.join(d, f['text']['name']))
        pm = R.PageMap(os.path.join(d, f['pageindex']['name']), os.path.join(d, f['page_numbers']['name']))
        rec = {'identifier': ident, 'text_id': tid, 'leaves': {}}
        pdf, _, err = PI.fetch(ident)
        if err:
            rec['error'] = err
            out['volumes'][v] = rec
            continue
        rec['pdf_bytes'] = os.path.getsize(pdf)
        rec['pdf_pages'] = PI.pdf_pages(pdf)
        rec['item_leaves'] = len(pm.ranges)
        for leaf in LEAVES:
            p, npdf, how = PI.leaf_to_pdf_page(leaf, len(pm.ranges), pdf, ident)
            lrec = {'pdf_page': p, 'mapping': how}
            if p is None:
                rec['leaves'][str(leaf)] = lrec
                continue
            stem = os.path.join(KEEP, '%s-leaf%03d' % (ident, leaf))
            subprocess.run(['pdftoppm', '-f', str(p), '-l', str(p), '-r', '200', '-gray', '-png', '-singlefile', pdf, stem], check=True, capture_output=True)
            env = dict(os.environ, OMP_THREAD_LIMIT='1')
            subprocess.run(['nice', '-n', '10', 'tesseract', stem + '.png', stem, '-l', 'eng', '--psm', '6'], check=True, capture_output=True, env=env)
            read = open(stem + '.txt', encoding='utf-8', errors='replace').read()
            a, b = pm.span(leaf)
            lrec.update({'pinned_text_chars': b - a, 'tesseract_chars': len(read.strip()), 'tesseract_text': ' '.join(read.split())[:600],
                         'notice_pattern_hits_in_tesseract_text': [m.group(0) for m in NOTICE.finditer(read)],
                         'notice_pattern_hits_in_pinned_leaf': [m.group(0) for m in NOTICE.finditer(text[a:b])]})
            if leaf not in (5, 6):
                os.remove(stem + '.png')
            os.remove(stem + '.txt')
            rec['leaves'][str(leaf)] = lrec
        PI.os.remove(pdf)
        sd = os.path.join(PI.PDFDIR, ident + '_scandata.xml')
        if os.path.exists(sd):
            os.remove(sd)
        rec['pdf_deleted'] = True
        out['volumes'][v] = rec
        print(v, json.dumps({k: rec[k] for k in ('pdf_bytes', 'pdf_pages', 'item_leaves')}), flush=True)
        with open(os.path.join(GOV, 'rights-images.json'), 'w', encoding='utf-8') as fh:
            json.dump(out, fh, ensure_ascii=False, indent=1)
            fh.write('\n')
    with open(os.path.join(GOV, 'rights-images.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
