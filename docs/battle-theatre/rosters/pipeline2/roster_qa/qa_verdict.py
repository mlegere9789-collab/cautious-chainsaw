"""Record the verdict of the sample reader on one drawn page (plain JSON, data2/qa/pages/<identifier>-<leaf>.verdict.json).

    python3 -I qa_verdict.py add PAGE_ID [--keep] < verdict.txt      write the verdict; delete the transient images and the tesseract text unless --keep
    python3 -I qa_verdict.py show PAGE_ID                            print the stored verdict

Writing a verdict states that the sample reader looked at the page image (Read tool) and compared every stored line of the page with it,
except the lines named in a U line.  The input is line oriented; row numbers are those printed by qa_compare.py for the same page:

    looked: <how the page was looked at: full page views, crops>
    E <row> <kind>[,<kind>...] | stored: <text> | printed: <text> | <note>        an error (kinds below)
    F <row> <field> | stored: <text> | printed: <text>                             a difference of case, punctuation or spacing only (not an error)
    U <row> <why>                                                                   the line could not be read on the page (not counted)
    M <text>                                                                        a printed line of the units of the four items with no stored line
    N <text>                                                                        a note on the page

Error kinds.  name-char (a character of the name differs), name-cut (the boundary of the name is wrong: part of the name stands in the
remarks or part of the remarks in the name), name-nonperson (the stored name is no person line: a heading, a footnote, running text),
rank (the rank or the carried heading is wrong), company (the company is wrong), rem-char (a character of a remark word differs),
rem-date (a date or number of the remarks differs: R-G2), rem-missing (printed remark text is missing), rem-extra (text that is not this line's
stands in the remarks), rem-bound (the remarks are those of another line), merge (two printed entries stored as one), split (one printed entry
stored as two).  Gates: R-G1 = any name-* kind; R-G2 = rem-date; R-G3 (reading of the remark, cut of the entry) = rank, company, rem-char,
rem-missing, rem-extra, rem-bound, merge, split.  A line is in error when it has at least one kind.
"""
import sys, os, re, json, time, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_compare as C
import qa_render as RN

KINDS = ('name-char', 'name-cut', 'name-nonperson', 'rank', 'company', 'rem-char', 'rem-date', 'rem-missing', 'rem-extra', 'rem-bound', 'merge', 'split')
GATE = {'name-char': 'R-G1', 'name-cut': 'R-G1', 'name-nonperson': 'R-G1', 'rem-date': 'R-G2'}


def vpath(pid):
    return os.path.join(Q.QA, 'pages', RN.page_stem(pid) + '.verdict.json')


def parse(text, nrows):
    v = {'looked': '', 'errors': [], 'form_only': [], 'unverifiable': [], 'missed': [], 'notes': []}
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith('looked:'):
            v['looked'] = ln[7:].strip()
        elif ln.startswith('E '):
            parts = [p.strip() for p in ln[2:].split('|')]
            head = parts[0].split(None, 1)
            i = int(head[0])
            kinds = [k.strip() for k in head[1].split(',')]
            bad = [k for k in kinds if k not in KINDS]
            if bad or not (0 <= i < nrows):
                raise ValueError('bad E line: %r (kinds %s, row %d of %d)' % (ln, bad, i, nrows))
            d = {'i': i, 'kinds': kinds}
            for p in parts[1:]:
                m = re.match(r'(stored|printed):\s*(.*)$', p, re.S)
                if m:
                    d[m.group(1)] = m.group(2)
                else:
                    d['note'] = (d.get('note', '') + ' ' + p).strip()
            v['errors'].append(d)
        elif ln.startswith('F '):
            parts = [p.strip() for p in ln[2:].split('|')]
            head = parts[0].split(None, 1)
            d = {'i': int(head[0]), 'field': head[1] if len(head) > 1 else ''}
            for p in parts[1:]:
                m = re.match(r'(stored|printed):\s*(.*)$', p, re.S)
                if m:
                    d[m.group(1)] = m.group(2)
            v['form_only'].append(d)
        elif ln.startswith('U '):
            head = ln[2:].split(None, 1)
            v['unverifiable'].append({'i': int(head[0]), 'why': head[1] if len(head) > 1 else ''})
        elif ln.startswith('M '):
            v['missed'].append(ln[2:].strip())
        elif ln.startswith('N '):
            v['notes'].append(ln[2:].strip())
        else:
            raise ValueError('unrecognised line: %r' % ln)
    return v


def add(pid, text, keep=False):
    pg, rows, res, unstored, st = C.compare(pid)
    v = parse(text, len(rows))
    if not v['looked']:
        raise ValueError('a verdict needs a looked: line (how the page was looked at)')
    read = Q.jload(os.path.join(Q.QA, 'pages', RN.page_stem(pid) + '.read.json'))
    dr = Q.jload(os.path.join(Q.QA, 'draw.json'))['strata'][pg['stratum']]
    order = dr['order']
    for e in v['errors']:
        r = rows[e['i']]
        e['rid'] = r['rid']
        e['flagged_ocr_uncertain'] = bool(r['damaged'])
        e['gates'] = sorted({GATE.get(k, 'R-G3') for k in e['kinds']})
    err_rows = {e['i'] for e in v['errors']}
    unv = {u['i'] for u in v['unverifiable']}
    checked = len(rows) - len(unv)
    cnt = collections.Counter(c['status'] for c in res)
    rec = {'f': 'roster-qa-verdict/1', 'page': pid, 'stratum': pg['stratum'], 'family': pg['family'], 'layout': pg['layout'], 'kind': pg['kind'],
           'draw_position': (order.index(pid) + 1) if pid in order else None, 'in_lowest_decile': pid in set(dr['decile']), 'printed_page': pg['printed_page'],
           'rows_stored': len(rows), 'rows_checked': checked, 'rows_in_error': len(err_rows), 'rows_ok': checked - len(err_rows - unv),
           'rows_flagged_ocr_uncertain': sum(1 for r in rows if r['damaged']),
           'errors': v['errors'], 'form_only': v['form_only'], 'unverifiable': v['unverifiable'], 'missed_lines': v['missed'], 'notes': v['notes'],
           'reader': v['looked'], 'tesseract_prescreen': {'agree': cnt['AGREE'], 'near': cnt['NEAR'], 'suspect': cnt['SUSPECT'], 'unstored_lines': len(unstored)},
           'read': {k: read[k] for k in ('pdf_sha256', 'pdf_page', 'view_png_sha256', 'render300_sha256', 'tess_sha256', 'right_page', 'share_in_pinned_leaf')},
           'rows_listed': [{'i': i, 'rid': r['rid'], 'name': r['name'], 'off': r['off'], 'text_id': r['text_id']} for i, r in enumerate(rows)],
           'verdict_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    # tesseract status of every row (agree / near / suspect) kept for the second-reading analysis
    rec['tesseract_status'] = {str(c['i']): c['status'] for c in res}
    Q.jdump(vpath(pid), rec)
    if not keep:
        RN.clean([pid])
    print('verdict written: %s | rows %d checked %d in error %d | form-only %d unverifiable %d missed %d' %
          (Q.rel(vpath(pid)), len(rows), checked, len(err_rows), len(v['form_only']), len(unv), len(v['missed'])))
    return rec


def main(argv):
    if not argv or argv[0] not in ('add', 'show'):
        print(__doc__)
        return 2
    pid = argv[1]
    if argv[0] == 'show':
        print(json.dumps(Q.jload(vpath(pid)), ensure_ascii=False, indent=1))
        return 0
    add(pid, sys.stdin.read(), keep='--keep' in argv)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
