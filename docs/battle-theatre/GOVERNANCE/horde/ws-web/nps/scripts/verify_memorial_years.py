#!/usr/bin/env python3
"""Independent check of extracts/memorial_years.jsonl (and memorial_years_left.json) against the saved report texts.

For every row:
  - the saved text file of the row's variant exists and its sha256 equals the one recorded in the row and in sources.json
    (reading-order text) or in the manifest (layout text);
  - the quote is found exactly once in the whitespace-normalised text of the named PDF page;
  - name_as_printed occurs in the quote; name is name_as_printed without a leading 'the';
  - the quote begins with the header years the row records (year, year_to) and the event word Memorialized
    (the park-wide inventory's quote begins '<year> AD Memorialized');
  - a row with ca_in_item carries tier inferred; every row has use_for_1863 none;
  - the row id is unique and the source has a rights basis in sources.json.
Also: every entry named in memorial_years_left.json is found on its page, and every entry of the chronology tables of the three
inventories whose header carries the event word Memorialized is either behind at least one row or in the left-out list
(counted again here from the text with a different pattern than the builder's).

Writes nothing; prints the result; exit 1 when a problem is found. Run with python3 -I.
"""
import json, os, re, sys, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def pages_of(path):
    txt = open(path, encoding='utf-8').read()
    parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
    return {int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def main():
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'memorial_years.jsonl'), encoding='utf-8')]
    left = json.load(open(os.path.join(NPS, 'extracts', 'memorial_years_left.json'), encoding='utf-8'))['items']
    srcs = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}
    problems = []
    cache = {}

    def page_text(sid, variant, p):
        k = (sid, variant)
        if k not in cache:
            path = os.path.join(LIB, sid, sid + ('.layout.txt' if variant == 'layout' else '.txt'))
            cache[k] = (pages_of(path), sha(path))
        return cache[k]

    ids = set()
    for r in rows:
        rid = r['id']
        if rid in ids:
            problems.append('%s: duplicate id' % rid)
        ids.add(rid)
        pgs, tsha = page_text(r['source_id'], r['text_variant'] if r['text_variant'] == 'layout' else None, r['pdf_page'])
        if tsha != r['text_sha256']:
            problems.append('%s: text sha256 differs from the file' % rid)
        s = srcs.get(r['source_id'])
        if not s or not s.get('rights_basis'):
            problems.append('%s: source without rights basis' % rid)
        elif r['text_variant'] != 'layout' and s.get('text_sha256') != tsha:
            problems.append('%s: text sha256 differs from sources.json' % rid)
        elif r['text_variant'] == 'layout' and s.get('layout_text_sha256') != tsha:
            problems.append('%s: layout text sha256 differs from sources.json' % rid)
        pt = pgs.get(r['pdf_page'])
        if pt is None:
            problems.append('%s: no such page' % rid)
            continue
        q = norm(r['quote'])
        if pt.count(q) != 1:
            problems.append('%s: quote found %d times on PDF p.%d' % (rid, pt.count(q), r['pdf_page']))
        if r['name_as_printed'] not in q:
            problems.append('%s: name_as_printed not in the quote: %r' % (rid, r['name_as_printed']))
        if r['name'] != re.sub(r'^the ', '', r['name_as_printed'], flags=re.I):
            problems.append('%s: name is not name_as_printed without a leading the' % rid)
        if r['text_variant'] == 'layout':
            head = re.match(r'(\d{4}) AD Memorialized ', q)
            if not head or int(head.group(1)) != r['year']:
                problems.append('%s: header year mismatch in the layout quote' % rid)
        else:
            head = re.match(r'(?:CE|AD) (\d{4})(?: - (\d{4}))? Memorialized ', q)
            if not head or int(head.group(1)) != r['year'] or (int(head.group(2)) if head.group(2) else None) != r['year_to']:
                problems.append('%s: header years of the quote differ from the row (%s)' % (rid, r['header_years']))
        if r['ca_in_item'] and r['tier_proposed'] != 'inferred':
            problems.append('%s: a ca. item must be inferred' % rid)
        if r['use_for_1863'] != 'none':
            problems.append('%s: use_for_1863 must be none' % rid)
    for e in left:
        pgs, _ = page_text(e['source_id'], None, e['pdf_page'])
        if pgs[e['pdf_page']].count(norm(e['entry'])) != 1:
            problems.append('left-out entry not found once: %s p.%d %s' % (e['source_id'], e['pdf_page'], e['header_years']))
    # recount the entries of the chronology tables with a different pattern
    for sid in ('NPS-CLI-PCB', 'NPS-CLI-LRT', 'NPS-CLI-ERR'):
        pgs, _ = page_text(sid, None, 0)
        n = sum(len(re.findall(r'(?:CE|AD) \d{4}(?: - \d{4})? Memorialized', t)) for t in pgs.values())
        behind = {(r['pdf_page'], r['header_years'], r['quote']) for r in rows if r['source_id'] == sid}
        lefts = {(e['pdf_page'], e['header_years'], e['entry']) for e in left if e['source_id'] == sid}
        if n != len(behind) + len(lefts):
            problems.append('%s: %d Memorialized entries in the text, %d behind rows and %d left out' % (sid, n, len(behind), len(lefts)))
    by_src = {}
    for r in rows:
        by_src[r['source_id']] = by_src.get(r['source_id'], 0) + 1
    print('rows', len(rows), by_src, '| left out', len(left), '| problems', len(problems))
    for p in problems:
        print('PROBLEM', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
