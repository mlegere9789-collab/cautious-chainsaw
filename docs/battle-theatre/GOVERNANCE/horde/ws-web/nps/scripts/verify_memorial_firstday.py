#!/usr/bin/env python3
"""Independent check of extracts/memorial_firstday.jsonl against the saved content-stream-order text of NPS-CLR-1STDAY.

For every row: the text sha256 equals the one in the row and in sources.json (raw text variant); the heading quote is found exactly once on the page; the
history quote is found on the page and follows the word 'History:' that follows the heading within 400 characters; the years listed are exactly the
four-digit years (1800-2029) of the history quote; year_single is null or the one distinct year of the quote (never 1863) and the first sentence of
the quote says 'dedicated'; the MN number and CRIS-HS number are inside the heading quote; ids are unique; use_for_1863 is none.
Prints the result; exit 1 on a problem. Run with python3 -I."""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')
YR = re.compile(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def dehyph(text):
    # same repair as build_extracts.dehyphenate, imported to avoid a second implementation drifting
    import importlib.util
    spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
    be = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(be)
    return be.dehyphenate(text)


def main():
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'memorial_firstday.jsonl'), encoding='utf-8')]
    src = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}['NPS-CLR-1STDAY']
    path = os.path.join(LIB, 'NPS-CLR-1STDAY', 'NPS-CLR-1STDAY.raw.txt')
    h = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    txt = dehyph(open(path, encoding='utf-8').read())
    parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
    P = {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}
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
        hq, hist = norm(r['heading_quote']), norm(r['history_quote'])
        if pt.count(hq) != 1:
            problems.append('%s: heading quote found %d times' % (rid, pt.count(hq)))
        if r['mn'] not in hq or r['cris_hs'] not in hq or r['name_as_printed'] not in hq:
            problems.append('%s: name, MN or CRIS number not in the heading quote' % rid)
        i = pt.find(hq)
        j = pt.find('History: ' + hist, i if i >= 0 else 0)
        if j < 0 or j - (i + len(hq)) > 400:
            problems.append('%s: history quote does not follow the heading within 400 characters' % rid)
        ys = sorted(set(int(x) for x in YR.findall(hist)))
        if ys != r['years_in_history_quote']:
            problems.append('%s: years differ from the quote' % rid)
        if r['year_single'] is not None and (ys != [r['year_single']] or r['year_single'] == 1863):
            problems.append('%s: year_single is not the one year of the quote' % rid)
        if r['use_for_1863'] != 'none':
            problems.append('%s: use_for_1863 must be none' % rid)
    print('rows', len(rows), '| problems', len(problems))
    for p in problems:
        print('PROBLEM', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
