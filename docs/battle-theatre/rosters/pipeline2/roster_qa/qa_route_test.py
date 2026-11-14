"""Test of the second-reading route (roster-qa task 4): 20 pages per source family read with tesseract and compared with the first text layer.

    python3 -I qa_route_test.py run            render and read the pages, compare, write data2/qa/second-reading.json (run it through tools/horde/bench.sh)
    python3 -I qa_route_test.py detector       the detection power of the comparison on the pages that were looked at (from the verdicts; no rendering)

Pages: the first 20 pages of the draw order of the stratum 'other' of each of the six families (the draw is a seeded random order of the pages, data2/qa/draw.json), the pages that
were looked at among them included.  Per page: share_in_pinned_leaf (the share of the tesseract words of 4 or more letters that stand in the pinned first text of the leaf, as
page_image.py defines it), and the comparison of qa_compare.py (every stored line AGREE when all its tokens are matched by the tesseract reading, NEAR when only spacing differs,
SUSPECT otherwise).  This measures how far the two engines agree; it is not an accuracy figure.  The accuracy against the print is measured only on the looked-at pages
(detector): of the lines that the sample reader found in error, the share that the comparison marks SUSPECT, and of the lines found free of error, the share it marks AGREE.
Two-column lists (Maine at Gettysburg) and index pages (Maine Supplement) are read by tesseract as one run per printed line, so the line-level comparison is weak there; the
word-level share is reported for them as well.  Images are transient (deleted after each page); the reading texts are deleted too.
"""
import sys, os, json, glob, collections, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_render as RN
import qa_compare as C

FAMILIES = ['VT-REV', 'MA-SSM', 'NH-AYL', 'ME-RET', 'ME-IDX', 'ME-GET']


def run():
    draw = Q.jload(os.path.join(Q.QA, 'draw.json'))['strata']
    out = {'f': 'roster-qa-second-reading/1', 'method': __doc__, 'engine': None, 'families': {}, 'pdfs': {}}
    t0 = time.time()
    for fam in FAMILIES:
        order = draw[fam + '-other']['order'][:20]
        pages = []
        for pid in order:
            rec = RN.render([pid])[0]
            if rec.get('error'):
                pages.append({'page': pid, 'error': rec['error']})
                continue
            out['pdfs'][rec['identifier']] = rec['pdf_sha256']
            pg, rows, res, unstored, st = C.compare(pid)
            cnt = collections.Counter(r['status'] for r in res)
            pages.append({'page': pid, 'printed_page': rec['printed_page'], 'rows': len(rows), 'agree': cnt['AGREE'], 'near': cnt['NEAR'], 'suspect': cnt['SUSPECT'],
                          'share_in_pinned_leaf': rec['share_in_pinned_leaf'], 'right_page': rec['right_page'], 'token_ratio': st['ratio'], 'tesseract_cpu_s': rec['tesseract_cpu_s']})
            RN.clean([pid])
        ok = [p for p in pages if 'error' not in p]
        rows = sum(p['rows'] for p in ok)
        out['families'][fam] = {'pages_read': len(ok), 'pages_failed': len(pages) - len(ok), 'right_page_all': all(p['right_page'] for p in ok),
                                'share_in_pinned_leaf_mean': round(sum(p['share_in_pinned_leaf'] or 0 for p in ok) / max(1, len(ok)), 3),
                                'share_in_pinned_leaf_min': min((p['share_in_pinned_leaf'] or 0) for p in ok) if ok else None,
                                'stored_lines': rows, 'agree': sum(p['agree'] for p in ok), 'near': sum(p['near'] for p in ok), 'suspect': sum(p['suspect'] for p in ok),
                                'agree_share': round(sum(p['agree'] for p in ok) / rows, 3) if rows else None, 'tesseract_cpu_s_total': round(sum(p['tesseract_cpu_s'] for p in ok), 1), 'pages': pages}
        print(fam, {k: v for k, v in out['families'][fam].items() if k != 'pages'}, flush=True)
    out['wall_s'] = round(time.time() - t0)
    Q.jdump(os.path.join(Q.QA, 'second-reading.json'), out)


def detector():
    res = {}
    for p in sorted(glob.glob(os.path.join(Q.QA, 'pages', '*.verdict.json'))):
        v = Q.jload(p)
        if v['levels'] != 'NDR':
            continue
        fam = v['family']
        d = res.setdefault(fam, collections.Counter())
        err = {e['i'] for e in v['errors']}
        ts = v['tesseract_status']
        for i in range(v['rows_stored']):
            bad = i in err
            st = ts.get(str(i))
            d['rows'] += 1
            d['in_error' if bad else 'clean'] += 1
            d[('error_%s' if bad else 'clean_%s') % st] += 1
    out = {}
    for fam, d in res.items():
        e, c = d['in_error'], d['clean']
        out[fam] = {'rows_looked_at_all_levels': d['rows'], 'rows_in_error': e, 'rows_clean': c,
                    'error_rows_marked_SUSPECT': d['error_SUSPECT'], 'error_rows_marked_NEAR': d['error_NEAR'], 'error_rows_marked_AGREE': d['error_AGREE'],
                    'clean_rows_marked_AGREE': d['clean_AGREE'], 'clean_rows_marked_NEAR': d['clean_NEAR'], 'clean_rows_marked_SUSPECT': d['clean_SUSPECT'],
                    'recall_of_errors': round(d['error_SUSPECT'] / e, 3) if e else None, 'agree_share_of_clean_rows': round(d['clean_AGREE'] / c, 3) if c else None}
    Q.jdump(os.path.join(Q.QA, 'second-reading-detector.json'), {'f': 'roster-qa-detector/1', 'note': 'computed from the verdicts that were looked at on all three levels', 'families': out})
    for fam, d in out.items():
        print(fam, d)


if __name__ == '__main__':
    {'run': run, 'detector': detector}[sys.argv[1]]()
