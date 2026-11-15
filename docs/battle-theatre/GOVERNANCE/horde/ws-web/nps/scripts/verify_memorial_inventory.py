#!/usr/bin/env python3
"""Independent check of extracts/memorial_inventory.jsonl (and memorial_year_conflicts.json) against the saved report texts.

For every row:
  - the sha256 of the saved text equals the one in the row and in sources.json; the source has a rights basis;
  - the heading quote is found exactly once in the page text of name_pdf_page (a heading quote that ends in the tag is found as a whole on pdf_page);
  - name_as_printed is inside the heading quote and is followed in the page text (same page) by the tag, or (heading on the page before)
    the tag starts the sentence on pdf_page;
  - the tag is found in the quote and the quote is found exactly once on pdf_page; the quote begins with the tag;
  - the years of the row are exactly the four-digit numbers of the tag, in order; for form A the tag has an evaluation word, for form B a 'built' word;
  - the location quote (if any) is found on pdf_page;
  - every row is use_for_1863 none; ids are unique.
Also: each conflict pair names two rows that exist, with different year sets; the skipped file's tags are found on their pages.
Writes nothing; prints the result; exit 1 on a problem. Run with python3 -I.
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
LIB = os.path.join(ROOT, 'tmp', 'library', 'web', 'nps')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for c in iter(lambda: f.read(1 << 20), b''):
            h.update(c)
    return h.hexdigest()


def main():
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'memorial_inventory.jsonl'), encoding='utf-8')]
    conf = json.load(open(os.path.join(NPS, 'extracts', 'memorial_year_conflicts.json'), encoding='utf-8'))['items']
    skipped = json.load(open(os.path.join(NPS, 'extracts', 'memorial_inventory_skipped.json'), encoding='utf-8'))['items']
    srcs = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}
    problems, cache, ids = [], {}, set()

    def pages(sid):
        if sid not in cache:
            path = os.path.join(LIB, sid, sid + '.txt')
            txt = open(path, encoding='utf-8').read()
            parts = re.split(r'^=== PAGE (\d+) ===\n', txt, flags=re.M)
            cache[sid] = ({int(parts[i]): norm(parts[i + 1]) for i in range(1, len(parts), 2)}, sha(path))
        return cache[sid]

    for r in rows:
        rid = r['id']
        if rid in ids:
            problems.append('%s: duplicate id' % rid)
        ids.add(rid)
        P, tsha = pages(r['source_id'])
        s = srcs.get(r['source_id'], {})
        if tsha != r['text_sha256'] or s.get('text_sha256') != tsha:
            problems.append('%s: text sha256 differs' % rid)
        if not s.get('rights_basis'):
            problems.append('%s: no rights basis' % rid)
        pt, ht = P.get(r['pdf_page']), P.get(r['name_pdf_page'])
        if pt is None or ht is None:
            problems.append('%s: page missing' % rid)
            continue
        q, hq, tag = norm(r['quote']), norm(r['heading_quote']), r['tag']
        if pt.count(q) != 1:
            problems.append('%s: quote found %d times on p.%d' % (rid, pt.count(q), r['pdf_page']))
        if not q.startswith(tag):
            problems.append('%s: quote does not begin with the tag' % rid)
        if r['name_pdf_page'] == r['pdf_page']:
            if ht.count(hq) != 1 or not hq.endswith(tag):
                problems.append('%s: heading+tag quote found %d times / does not end with the tag' % (rid, ht.count(hq)))
            if not re.fullmatch(re.escape(r['name_as_printed']) + r'\.? ?' + re.escape(tag), hq):
                problems.append('%s: heading quote is not name + tag' % rid)
        else:
            if ht.count(hq) != 1 or hq != r['name_as_printed']:
                problems.append('%s: heading (page before) found %d times or differs from name' % (rid, ht.count(hq)))
            if pt.count(tag) < 1:
                problems.append('%s: tag not on pdf_page' % rid)
        ys = [int(x) for x in re.findall(r'\d{4}', tag)]
        if ys != r['years']:
            problems.append('%s: years differ from the tag' % rid)
        if r['tag_form'] == 'A' and not re.search(r'[Cc]ontributing', tag):
            problems.append('%s: form A tag without an evaluation word' % rid)
        if r['tag_form'] == 'B' and not tag.startswith('(built') and not re.match(r'\((?:erected|moved|placed) ', tag):
            problems.append('%s: form B tag unexpected' % rid)
        if r['location_quote'] and norm(r['location_quote']) not in pt:
            problems.append('%s: location quote not on the page' % rid)
        if r['use_for_1863'] != 'none':
            problems.append('%s: use_for_1863 must be none' % rid)
    byid = {r['id']: r for r in rows}
    chron = {json.loads(l)['id']: json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'memorial_years.jsonl'), encoding='utf-8')}
    for c in conf:
        i, h = byid.get(c['inventory_id']), chron.get(c['chronology_id'])
        if not i or not h:
            problems.append('conflict names a missing row: %s / %s' % (c['inventory_id'], c['chronology_id']))
            continue
        cy = {h['year']} | ({h['year_to']} if h['year_to'] else set())
        if set(i['years']) & cy:
            problems.append('conflict %s/%s: the year sets overlap' % (c['inventory_id'], c['chronology_id']))
    for k in skipped:
        P, _ = pages(k['source_id'])
        if k['tag'] not in P.get(k['pdf_page'], ''):
            problems.append('skipped tag not on its page: %s p.%d %s' % (k['source_id'], k['pdf_page'], k['tag']))
    by_src = {}
    for r in rows:
        by_src[r['source_id']] = by_src.get(r['source_id'], 0) + 1
    print('rows', len(rows), by_src, '| conflicts', len(conf), '| skipped', len(skipped), '| problems', len(problems))
    for p in problems:
        print('PROBLEM', p)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
