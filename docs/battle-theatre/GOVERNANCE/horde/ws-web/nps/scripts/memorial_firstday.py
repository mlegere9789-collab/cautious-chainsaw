#!/usr/bin/env python3
"""Per-memorial entries of the Landscape Features Inventory of the First Day cultural landscape report (NPS-CLR-1STDAY, tables 3.3 and following)
(workstream bt-web, task nps-landscape; third part of the answer to GOVERNANCE/horde/requests/ws-world-memorial-years-for-web.md).

Each monument entry of the inventory reads (content-stream-order text of the report):
    'Infantry Monument Group - 143rd Pennsylvania (3.4) MN038-E CRIS- HS:009761 NR Resource (Object) FMSS Location: 236273 Contributing Context:
     Commemorative Park Landscape (GBMA) History: In 1895, the 143rd Pennsylvania Infantry, ..., dedicated its monument at ...'
One row per such entry that carries a park monument number (MNnnn): the heading as printed (from the type word to the drawing number), the MN number, the
CRIS-HS number, and the first two sentences of the History paragraph, verbatim. The row states every year that stands in those two sentences
(`years_in_history_quote`); `year_single` is set only when the two sentences name exactly one year (not 1863) and the first says 'dedicated'; every other
row leaves the choice to the reader (a replaced, moved or second monument has several years: the first monument and its replacement are different objects). Nothing is matched to anything.

Every row is a later memorial (use_for_1863 none). A feature that the History places before the battle is not in this inventory.

  memorial_firstday.py           build extracts/memorial_firstday.jsonl and memorial_firstday.md
  memorial_firstday.py --check   rebuild in memory and compare
  memorial_firstday.py --list    print rows
Run with python3 -I.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
OUT = os.path.join(NPS, 'extracts')
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)
SID = 'NPS-CLR-1STDAY'
RETRIEVED = '2026-11-13'
HEAD = re.compile(r'(?P<name>(?:(?:Infantry|Cavalry|Artillery|Sharpshooters?)\s+Monument(?: Group)?\s*[-–]+\s*[^()]+?|Statue,\s*[^()]+?|Reynolds Killed Marker))\s*\((?P<dr>\d\.\d)\)\s+(?P<mn>MN\d+(?:-[A-Z])?)\s+CRIS-?\s?HS:\s?(?P<cris>\d+)')


def build():
    P, tsha, tpath = be.pages(SID, 'raw')
    rows, skipped = [], []
    per_page = {}
    for p in sorted(P):
        N = be.norm(P[p])
        for m in HEAD.finditer(N):
            per_page[p] = per_page.get(p, 0) + 1
            h = N.find('History:', m.end())
            if h < 0 or h - m.end() > 400:
                skipped.append({'pdf_page': p, 'name': m.group('name'), 'mn': m.group('mn'), 'why': 'no History paragraph within 400 characters after the heading on this page'})
                continue
            body = N[h + len('History:'):].strip()
            sents = be.split_sentences(body)
            take = []
            for s in sents[:2]:
                take.append(s)
            hq = ' '.join(take)
            # the History must lie in the text as printed: first two sentences, whitespace-normalised
            first = take[0] if take else ''
            ys1 = [int(x) for x in re.findall(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)', first)]
            ysq = [int(x) for x in re.findall(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)', hq)]
            # a year is called single only when it is the only year of the two quoted sentences, is not the year of the battle, and the first sentence says 'dedicated'
            single = ysq[0] if len(set(ysq)) == 1 and ysq[0] != 1863 and re.search(r'\bdedicated\b', first) else None
            printed_pm = be.printed_page(P[p], 'raw')
            rows.append({
                'id': 'NPSMF-p%03d-%02d' % (p, per_page[p]),
                'source_id': SID, 'pdf_page': p, 'printed_page': printed_pm,
                'name_as_printed': m.group('name'), 'drawing_as_printed': '(%s)' % m.group('dr'), 'mn': m.group('mn'), 'cris_hs': m.group('cris'),
                'heading_quote': N[m.start():m.end()],
                'history_quote': hq, 'history_sentences_taken': len(take),
                'years_in_history_quote': sorted(set(ysq)), 'years_in_first_sentence': sorted(set(ys1)), 'year_single': single,
                'state_date': 'year(s) the History paragraph of the inventory gives (a later memorial; not an 1863 state)',
                'use_for_1863': 'none', 'tier_proposed': 'documented',
                'tier_basis': 'the cultural landscape report of 2021 states the dedication in the History of the feature; its own sources are cited in its notes (not read here)',
                'retrieved': RETRIEVED, 'text_variant': 'content-stream-order (raw)', 'text_path': tpath, 'text_sha256': tsha,
            })
    return rows, skipped


def sources_meta():
    return {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}


def decorate(rows):
    s = sources_meta()[SID]
    for r in rows:
        r['source_title'], r['source_date'], r['source_author'], r['url'], r['rights_basis'] = s['title'], s['date'], s['author'], s['url'], s.get('rights_basis')
    return rows


def write(rows, skipped):
    decorate(rows)
    with open(os.path.join(OUT, 'memorial_firstday.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'_doc': 'Headings of the First Day inventory that matched the monument heading pattern but have no History paragraph near; generated by scripts/memorial_firstday.py.', 'items': skipped},
              open(os.path.join(OUT, 'memorial_firstday_skipped.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'memorial_firstday.md'), 'w', encoding='utf-8') as f:
        f.write('# Memorials of the First Day battlefield: the Landscape Features Inventory of the cultural landscape report (2021)\n\n')
        f.write('Generated by `scripts/memorial_firstday.py` (do not edit by hand). Heading and History sentences are cut from the saved text (`scripts/verify_memorial_firstday.py` finds them again). '
                'Every row is a later memorial (use for the July 1863 scene: `none`). `years` = every year in the first two sentences of the History; a replaced, moved or second monument has several.\n\n')
        f.write('%d rows (%d headings without a History paragraph near, in `memorial_firstday_skipped.json`).\n\n| id | MN | name as printed | years in the History quote | single dedication year | PDF p. |\n|---|---|---|---|---|---|\n' % (len(rows), len(skipped)))
        for r in rows:
            f.write('| `%s` | %s | %s | %s | %s | %d |\n' % (r['id'], r['mn'], r['name_as_printed'].replace('|', '/'), ', '.join(str(y) for y in r['years_in_history_quote']) or '-', r['year_single'] or '-', r['pdf_page']))


if __name__ == '__main__':
    rows, skipped = build()
    if '--list' in sys.argv:
        for r in rows:
            print('%-16s %-8s %-70s | %s | single=%s' % (r['id'], r['mn'], r['name_as_printed'][:70], r['years_in_history_quote'], r['year_single']))
        print(len(rows), 'rows;', len(skipped), 'skipped')
    elif '--check' in sys.argv:
        decorate(rows)
        have = [json.loads(l) for l in open(os.path.join(OUT, 'memorial_firstday.jsonl'), encoding='utf-8')]
        a = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows]
        b = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in have]
        if a != b:
            print('DIFFERENT: %d rows built, %d in the file' % (len(a), len(b)))
            sys.exit(1)
        print('memorial_firstday.jsonl equals the rebuild (%d rows)' % len(rows))
    else:
        write(rows, skipped)
        print('%d rows, %d skipped; written to %s' % (len(rows), len(skipped), OUT))
