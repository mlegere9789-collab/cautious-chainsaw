"""Record the verdict of the sample reader on one drawn page (plain JSON, data2/qa/pages/<identifier>-<leaf>.verdict.json).

    python3 -I qa_verdict.py add PAGE_ID [--keep] < verdict.txt      write the verdict; delete the transient images and the tesseract text unless --keep
    python3 -I qa_verdict.py show PAGE_ID                            print the stored verdict

Writing a verdict states that the sample reader looked at the page image (Read tool) and compared every stored line of the page with it,
except the lines named in a U line.  The input is line oriented; row numbers are those printed by qa_compare.py for the same page:

    looked: <how the page was looked at: full page views, crops>
    levels: N | ND | NR | NDR   (default NDR) what was compared on this page: N names, headings, companies, existence and cut of every line;
                                D the dates of the remarks; R the other words of the remarks.  A level that a stratum has already failed
                                decisively (4 errors) is not checked on its further pages; the report says so.
    E <row> <kind>[,<kind>...] | stored: <text> | printed: <text> | <note>        an error (kinds below)
    F <row> <field> | stored: <text> | printed: <text>                             a difference of case, punctuation or spacing only (not an error)
    U <row> <why>                                                                   the line could not be read on the page (not counted)
    M <text>                                                                        a printed line of the units of the four items with no stored line
    N <text>                                                                        a note on the page
    A ditto                                                                         tag rem-ditto on every row whose stored remarks hold the token 66 after the first
                                                                                    token (the page prints ditto marks there); E lines take ranges: E 0-3,7 kind,kind | note

Error kinds.  name-char (a character of the name differs), name-cut (the boundary of the name is wrong: part of the name stands in the
remarks or part of the remarks in the name), name-nonperson (the stored name is no person line: a heading, a footnote, running text),
rank (the rank or the carried heading is wrong), company (the company is wrong), rem-char (a character of a remark word differs),
rem-date (a date or number of the remarks differs: R-G2), rem-missing (printed remark text is missing), rem-extra (text that is not this line's
stands in the remarks), rem-bound (the remarks are those of another line), rem-order (the printed words are all there but in another order), rem-ditto (a printed ditto mark stored as the digits 66), merge (two printed entries stored as one), split (one printed entry
stored as two).  Gates: R-G1 = any name-* kind; R-G2 = rem-date; R-G3 (reading of the remark, cut of the entry) = rank, company, rem-char,
rem-missing, rem-extra, rem-bound, rem-order, rem-ditto, merge, split.  A line is in error when it has at least one kind.
"""
import sys, os, re, json, time, collections

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
import qa_compare as C
import qa_render as RN

KINDS = ('name-char', 'name-cut', 'name-nonperson', 'rank', 'company', 'rem-char', 'rem-date', 'rem-missing', 'rem-extra', 'rem-bound', 'rem-order', 'rem-ditto', 'merge', 'split')
GATE = {'name-char': 'R-G1', 'name-cut': 'R-G1', 'name-nonperson': 'R-G1', 'rem-date': 'R-G2'}


def vpath(pid):
    return os.path.join(Q.QA, 'pages', RN.page_stem(pid) + '.verdict.json')


def expand(spec):
    """'0,3-5,9' -> [0, 3, 4, 5, 9]"""
    out = []
    for part in spec.split(','):
        if '-' in part:
            a, b = part.split('-')
            out.extend(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def parse(text, nrows):
    v = {'looked': '', 'levels': 'NDR', 'errors': [], 'form_only': [], 'unverifiable': [], 'missed': [], 'notes': []}
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln:
            continue
        if ln.startswith('looked:'):
            v['looked'] = ln[7:].strip()
        elif ln.startswith('levels:'):
            v['levels'] = ln[7:].strip().upper()
            if not v['levels'] or set(v['levels']) - set('NDR'):
                raise ValueError('levels: use N (names, headings, companies, structure), D (dates) and R (remarks)')
        elif ln.startswith('A ditto'):
            v['auto_ditto'] = True
        elif ln.startswith('E '):
            parts = [p.strip() for p in ln[2:].split('|')]
            head = parts[0].split(None, 1)
            kinds = [k.strip() for k in head[1].split(',')]
            bad = [k for k in kinds if k not in KINDS]
            for i in expand(head[0]):
                if bad or not (0 <= i < nrows):
                    raise ValueError('bad E line: %r (kinds %s, row %d of %d)' % (ln, bad, i, nrows))
                d = {'i': i, 'kinds': list(kinds)}
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
    if v.get('auto_ditto'):
        # 'A ditto': the page prints ditto marks in cells of the table and the text layer stores them as the digits 66 (the sample reader confirms the print on the page);
        # every row whose stored remarks hold the token 66 after the first token (the age) gets the kind rem-ditto
        have = {e['i']: e for e in v['errors']}
        for i, r in enumerate(rows):
            toks = r['remarks'].split()
            hit = any(t == '66' for t in toks[1:]) or any(toks[k] == '6' and toks[k + 1] == '6' for k in range(1, len(toks) - 1))
            if hit:
                if i in have:
                    if 'rem-ditto' not in have[i]['kinds']:
                        have[i]['kinds'].append('rem-ditto')
                else:
                    e = {'i': i, 'kinds': ['rem-ditto'], 'note': 'ditto mark stored as the digits 66'}
                    v['errors'].append(e)
                    have[i] = e
        v['errors'].sort(key=lambda e: e['i'])
    if not v['looked']:
        raise ValueError('a verdict needs a looked: line (how the page was looked at)')
    read = Q.jload(os.path.join(Q.QA, 'pages', RN.page_stem(pid) + '.read.json'))
    dr = Q.jload(os.path.join(Q.QA, 'draw.json'))['strata'][pg['stratum']]
    order = dr['order']
    for e in v['errors']:
        r = rows[e['i']]
        e['rid'] = r['rid']
        e['flagged_ocr_uncertain'] = bool(r['damaged'])
        e['flag_codes'] = r['codes']
        e['gates'] = sorted({GATE.get(k, 'R-G3') for k in e['kinds']})
    err_rows = {e['i'] for e in v['errors']}
    unv = {u['i'] for u in v['unverifiable']}
    checked = len(rows) - len(unv)
    cnt = collections.Counter(c['status'] for c in res)
    for e in v['errors']:
        bad = [k for k in e['kinds'] if (k.startswith('name') or k in ('rank', 'company', 'merge', 'split')) is False and 'N' == v['levels']]
        if bad:
            raise ValueError('row %d: kinds %s are not names-level kinds on a page checked at level N only' % (e['i'], bad))
    rec = {'f': 'roster-qa-verdict/1', 'page': pid, 'levels': v['levels'], 'stratum': pg['stratum'], 'family': pg['family'], 'layout': pg['layout'], 'kind': pg['kind'],
           'draw_position': (order.index(pid) + 1) if pid in order else None, 'in_lowest_decile': pid in set(dr['decile']), 'printed_page': pg['printed_page'],
           'rows_stored': len(rows), 'rows_checked': checked, 'rows_in_error': len(err_rows), 'rows_ok': checked - len(err_rows - unv),
           'rows_flagged_ocr_uncertain': sum(1 for r in rows if r['damaged']),
           'errors': v['errors'], 'form_only': v['form_only'], 'unverifiable': v['unverifiable'], 'missed_lines': v['missed'], 'notes': v['notes'],
           'reader': v['looked'], 'tesseract_prescreen': {'agree': cnt['AGREE'], 'near': cnt['NEAR'], 'suspect': cnt['SUSPECT'], 'unstored_lines': len(unstored)},
           'read': {k: read[k] for k in ('pdf_sha256', 'pdf_page', 'view_png_sha256', 'render300_sha256', 'tess_sha256', 'right_page', 'share_in_pinned_leaf')},
           'rows_listed': [{'i': i, 'rid': r['rid'], 'name': r['name'], 'rank': r['rank'], 'co': r['co'], 'remarks_sha256': Q.sha256_bytes(r['remarks'].encode('utf-8')), 'off': r['off'],
                            'text_id': r['text_id'], 'flag_codes': r['codes']} for i, r in enumerate(rows)],
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
