#!/usr/bin/env python3
"""Independent check of extracts/memorial_cemetery.jsonl against the saved content-stream-order text of NPS-CLR-CEMETERY.

For every row: the text sha256 equals the one in the row and in sources.json (raw variant); the heading quote is found exactly once on the page; each period quote
(1863-69, 1869-1928, post-1928) is found on the page right after its label ('1863–69:', '1869–1928:', 'Post-1928:') and after the heading; the years listed per period are
exactly the years (1800-2029) of that quote; the quote of 1869-1928 is present; use_for_1863 is none; ids are unique.
Prints the result; exit 1 on a problem. Run with python3 -I."""
import hashlib, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
YR = re.compile(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)')
LAB = {'1863-69': '1863–69:', '1869-1928': '1869–1928:', 'post-1928': 'Post-1928:'}


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def main():
    spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
    be = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(be)
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'memorial_cemetery.jsonl'), encoding='utf-8')]
    src = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}['NPS-CLR-CEMETERY']
    path = os.path.join(LIB, 'NPS-CLR-CEMETERY', 'NPS-CLR-CEMETERY.raw.txt')
    h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    P = {p: norm(t) for p, t in be.pages('NPS-CLR-CEMETERY', 'raw')[0].items()}
    problems, ids = [], set()
    if src.get('raw_text_sha256') != h:
        problems.append('raw text sha256 differs from sources.json')
    if not src.get('rights_basis'):
        problems.append('no rights basis')
    for r in rows:
        rid = r['id']
        if rid in ids:
            problems.append('%s: duplicate id' % rid)
        ids.add(rid)
        if r['text_sha256'] != h:
            problems.append('%s: text sha256 differs' % rid)
        pt = P.get(r['pdf_page'], '')
        hq = norm(r['heading_quote'])
        if pt.count(hq) != 1:
            problems.append('%s: heading quote found %d times' % (rid, pt.count(hq)))
        if r['name_as_printed'] not in hq or r['ssf'] not in hq and r['ssf'] not in pt[max(0, pt.find(hq) - 60):pt.find(hq) + len(hq)]:
            problems.append('%s: name or entry number not at the heading' % rid)
        i = pt.find(hq)
        if '1869-1928' not in r['period_quotes']:
            problems.append('%s: no 1869-1928 quote' % rid)
        for k, q in r['period_quotes'].items():
            j = pt.find(LAB[k] + ' ' + norm(q), i if i >= 0 else 0)
            if j < 0:
                problems.append('%s: period quote %s not found after its label' % (rid, k))
            ys = sorted(set(int(x) for x in YR.findall(q)))
            if ys != r['years_by_period'].get(k):
                problems.append('%s: years of %s differ from the quote' % (rid, k))
        if r['years_in_period_quote'] != r['years_by_period'].get('1869-1928'):
            problems.append('%s: years_in_period_quote differs' % rid)
        if r['use_for_1863'] != 'none':
            problems.append('%s: use_for_1863 must be none' % rid)
    print('rows', len(rows), '| problems', len(problems))
    for p in problems:
        print('PROBLEM', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
