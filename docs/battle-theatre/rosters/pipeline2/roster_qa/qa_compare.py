"""Compare the stored lines of one drawn page with the tesseract second reading of the page image; print a compact listing for the sample reader.

    python3 -I qa_compare.py PAGE_ID [--full]       PAGE_ID = <identifier>/<leaf>; needs qa_render.py render PAGE_ID first

The listing is a pre-screen, never a verdict: the sample reader looks at the page image (Read tool) and decides every line (qa_verdict.py).
Rule of comparison ("normalised"): case folded, every character that is not a letter or a digit removed, white space removed.  Two readings that
are equal after that rule differ only in case, punctuation or spacing (counted separately as "form" differences, never as errors of the name);
any other difference is a "character" difference.  Per stored line: name tokens and remark tokens are aligned (difflib, token level) with the
tesseract tokens of the whole page; a line whose tokens are all matched is AGREE; a line whose tokens differ only in spacing is NEAR; every
other line is SUSPECT and is printed with the tesseract tokens that stand where its unmatched tokens should.  Tesseract text that no stored
line accounts for (a heading, a running head, a footnote, another unit's line, or a printed line that was not stored) is listed as UNSTORED.
"""
import sys, os, re, json, difflib, argparse, collections, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import qa_lib as Q
R = Q.R

TOK = re.compile(r'[A-Za-z0-9]+')


def norm(s):
    return ''.join(TOK.findall(s.casefold()))


def toks(s):
    return TOK.findall(s.casefold())


def frame_page(pid):
    fr = Q.jload(os.path.join(Q.QA, 'frame.json'))
    for p in fr['pages']:
        if p['id'] == pid:
            return p
    raise KeyError(pid)


def rows_of_page(pid):
    """The stored lines whose name offset lies on the leaf: [{'rid', 'file', 'n', 'name', 'rank', 'co', 'remarks', 'page', 'off', 'text_id', 'damaged'}] in file order."""
    pg = frame_page(pid)
    out = []
    for item, st, path in Q.unit_files():
        stem = os.path.basename(path)[:-len('.jsonl.gz')]
        if stem not in pg['files']:
            continue
        head, segs, meta = R.read_unit(path)
        fl = Q.flags_of(path)
        damaged = set(fl.get('ocr_uncertain', [])) if fl else set()
        codes_of = collections.defaultdict(list)
        if fl and isinstance(fl.get('rows'), dict):
            for code, lst in fl['rows'].items():
                for rn in lst:
                    codes_of[rn].append(code)
        n = 0
        for seg, rows in segs:
            if seg['t'] not in pg['text_ids']:
                n += len(rows)
                continue
            text, pm, ent = Q.load_source(seg['t'])
            for r in rows:
                name, rank, co, rem, page, off, rd = r
                if pm.leaf(off) == pg['leaf']:
                    out.append({'rid': '%s#%d' % (stem, n), 'file': stem, 'n': n, 'name': name, 'rank': rank, 'co': co, 'remarks': rem, 'page': page, 'off': off,
                                'text_id': seg['t'], 'damaged': n in damaged, 'codes': sorted(codes_of.get(n, []))})
                n += 1
    return pg, out


def stored_tokens(rows):
    seq, owner, field = [], [], []
    for i, r in enumerate(rows):
        for f, part in ((0, r['name']), (1, '' if r['rank'].startswith('^') else r['rank']), (2, r['remarks'])):
            for t in toks(part):
                seq.append(t)
                owner.append(i)
                field.append(f)
    return seq, owner, field


def compare(pid):
    pg, rows = rows_of_page(pid)
    tess = open(os.path.join(Q.QTMP, 'ocr', pid.replace('/', '-').rsplit('-', 1)[0] + '-%04d.txt' % int(pid.rsplit('/', 1)[1])), encoding='utf-8', errors='replace').read()
    tlines = [l for l in tess.split('\n')]
    T, tline = [], []
    for li, l in enumerate(tlines):
        for t in toks(l):
            T.append(t)
            tline.append(li)
    S, owner, field = stored_tokens(rows)
    sm = difflib.SequenceMatcher(None, S, T, autojunk=False)
    matched_s = [False] * len(S)
    matched_t = [False] * len(T)
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            matched_s[a + k] = True
            matched_t[b + k] = True
    # tesseract tokens standing where unmatched stored tokens stand (opcodes replace / delete)
    gap_t = collections.defaultdict(list)      # row index -> list of (stored tokens, tesseract tokens)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ('replace', 'delete'):
            by = collections.defaultdict(list)
            for i in range(i1, i2):
                by[owner[i]].append(S[i])
            rowsl = sorted(by)
            for ri in rowsl:
                gap_t[ri].append((by[ri], T[j1:j2] if tag == 'replace' else []))
    extra = collections.defaultdict(list)      # row index -> tesseract tokens inside the row's span that the stored row does not have
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'insert' and 0 < i1 < len(S) and owner[i1 - 1] == owner[i1]:
            extra[owner[i1]].append(' '.join(T[j1:j2]))
    res = []
    for i, r in enumerate(rows):
        idx = [k for k, o in enumerate(owner) if o == i]
        un = [S[k] for k in idx if not matched_s[k]]
        name_un = [S[k] for k in idx if not matched_s[k] and field[k] == 0]
        status = 'AGREE'
        if extra.get(i):
            status = 'SUSPECT'
        if un:
            # spacing only: the unmatched stored tokens joined equal the tesseract tokens that stand there joined
            tt = ''.join(w for _, ws in gap_t.get(i, []) for w in ws)
            if ''.join(un) == tt and tt:
                status = 'NEAR'
            else:
                status = 'SUSPECT'
        res.append({'i': i, 'rid': r['rid'], 'status': status, 'unmatched': un, 'tess_there': [(' '.join(a), ' '.join(b)) for a, b in gap_t.get(i, [])], 'ntok': len(idx),
                    'tess_extra': extra.get(i, []), 'name_unmatched': name_un})
    # unstored tesseract lines
    unst = collections.defaultdict(list)
    for k, t in enumerate(T):
        if not matched_t[k]:
            unst[tline[k]].append(t)
    unstored = [(li, ' '.join(w), tlines[li].strip()) for li, w in sorted(unst.items()) if sum(1 for x in w if x.isalpha() and len(x) > 2) >= 3]
    return pg, rows, res, unstored, {'stored_tokens': len(S), 'tess_tokens': len(T), 'ratio': round(sm.ratio(), 4)}


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('pid')
    ap.add_argument('--full', action='store_true', help='(kept for compatibility: every row is always printed in full)')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--names', action='store_true', help='names level: print name, heading and company only (remarks cut to 30 characters) with the name tokens tesseract disagrees on')
    a = ap.parse_args(argv)
    pg, rows, res, unstored, st = compare(a.pid)
    if a.json:
        print(json.dumps({'page': pg, 'rows': rows, 'compare': res, 'unstored': unstored, 'stats': st}, ensure_ascii=False))
        return 0
    cnt = collections.Counter(r['status'] for r in res)
    print('PAGE %s printed %s family %s stratum %s | stored rows %d | AGREE %d NEAR %d SUSPECT %d | tokens stored %d tess %d ratio %.3f' %
          (a.pid, pg['printed_page'], pg['family'], pg['stratum'], len(rows), cnt['AGREE'], cnt['NEAR'], cnt['SUSPECT'], st['stored_tokens'], st['tess_tokens'], st['ratio']))
    if a.names:
        for r, c in zip(rows, res):
            rk = r['rank'][1:] + '^' if r['rank'].startswith('^') else r['rank']
            tail = ''
            if c['name_unmatched']:
                tail = '   !! name tokens not read by tesseract: %s' % ' '.join(c['name_unmatched'])
            print('%2d %s%s | %s | %s | %s%s' % (c['i'], 'D' if r['damaged'] else ' ', r['co'] or '-', rk, r['name'], r['remarks'][:30], tail))
        if unstored:
            print('UNSTORED tesseract text (first 12 lines):')
            for li, w, line in unstored[:12]:
                print('  t%02d %s' % (li, line[:110]))
        return 0
    for r, c in zip(rows, res):
        mark = {'AGREE': ' ', 'NEAR': '~', 'SUSPECT': '!'}[c['status']]
        rk = r['rank'][1:] + '^' if r['rank'].startswith('^') else r['rank']
        rem = r['remarks']
        print('%s%2d %s%s | %s | %s | %s' % (mark, c['i'], 'D' if r['damaged'] else ' ', r['co'] or '-', rk, r['name'], rem))
        if c['status'] != 'AGREE':
            for a_, b_ in c['tess_there'][:4]:
                print('      stored-only: %s   | tesseract there: %s' % (a_, b_ or '(nothing)'))
            for x in c['tess_extra'][:3]:
                print('      tesseract-extra inside the line: %s' % x)
    if unstored:
        print('UNSTORED tesseract text (not accounted for by a stored line):')
        for li, w, line in unstored[:40]:
            print('  t%02d %s' % (li, line[:140]))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
