#!/usr/bin/env python3
"""Per-memorial entries of the landscape feature inventory of the Gettysburg National Cemetery cultural landscape report (NPS-CLR-CEMETERY, Table 3.1, 'Small-Scale Features')
(workstream bt-web, task nps-landscape; fourth part of the answer to GOVERNANCE/horde/requests/ws-world-memorial-years-for-web.md).

Each entry of the inventory reads (content-stream-order text of the report):
    'SSF-7. Artillery Monument: Hall's Second Maine Battery (Drawing 3.2) NR Resource (Object) 7100:236273 Asset 45173 Contributing
     1863-69: Monument did not exist; site part of battlefield, July 2-3, 1863. 1869-1928: The State of Maine dedicated a small monument marking the position of Hall's battery, 1890; ...
     Post-1928: ... Evaluation: ...'
One row per entry whose heading names a monument, memorial, marker, tablet or statue (grave markers and the state highway markers of about 1930 are not rows). The row records the
heading as printed, the SSF number, the LCS number when one stands in the entry, and the first two sentences of the period paragraph '1869-1928:' verbatim, with every year in them.
The cemetery's own construction (walls, fences, the Soldiers' National Monument of 1869) is not a row of this file. Nothing is matched to any list of names.
Every row is a later memorial (use_for_1863 none): the report says of each that it did not exist in 1863-69.

  memorial_cemetery.py           build extracts/memorial_cemetery.jsonl and memorial_cemetery.md
  memorial_cemetery.py --check   rebuild in memory and compare
  memorial_cemetery.py --list    print rows
Run with python3 -I.
"""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
OUT = os.path.join(NPS, 'extracts')
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)
SID = 'NPS-CLR-CEMETERY'
RETRIEVED = '2026-11-13'
HEAD = re.compile(r'(?:(?<=\s)|^)(?P<ssf>(?:SSF|BS)-\d+[a-z]?)\. (?P<name>[^()]{3,140}?) \(Drawing (?P<dr>\d\.\d)\)')
KIND = re.compile(r'\b(Monuments?|Memorials?|Markers?|Tablets?|Statues?)\b')
NOT = re.compile(r'^(Grave Markers|State Highway Historical Markers)|\b(Fence|Gateway|Gate)$')
YR = re.compile(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)')


def build():
    P, tsha, tpath = be.pages(SID, 'raw')
    rows, skipped = [], []
    for p in sorted(P):
        N = be.norm(P[p])
        heads = list(HEAD.finditer(N))
        for i, m in enumerate(heads):
            name = m.group('name')
            ssf = m.group('ssf')
            mo = re.match(r'((?:SSF|BS)-\d+[a-z]?)\. (.*)$', name)
            if mo:           # an entry whose own number stands inside the heading ('SSF-47a ... SSF-24. Infantry Monument: ...')
                ssf, name = mo.group(1), mo.group(2)
            name = name.strip()
            lim = heads[i + 1].start() if i + 1 < len(heads) else len(N)
            seg = N[m.end():lim]
            if not KIND.search(name) or NOT.search(name):
                skipped.append({'pdf_page': p, 'ssf': ssf, 'name': name, 'why_not_a_row': 'heading names no monument, memorial, marker, tablet or statue (or is a grave marker or a state highway marker)'})
                continue
            labels = [('1863-69', '1863–69:'), ('1869-1928', '1869–1928:'), ('post-1928', 'Post-1928:')]
            pos = {k: seg.find(lab) for k, lab in labels}
            stops = [seg.find('Evaluation:')]
            if pos['1869-1928'] < 0:
                skipped.append({'pdf_page': p, 'ssf': ssf, 'name': name, 'why_not_a_row': 'no 1869-1928 paragraph on this page (see the flank marker entry named in the text)'})
                continue
            periods, years_by = {}, {}
            for k, lab in labels:
                if pos[k] < 0:
                    continue
                start = pos[k] + len(lab)
                ends = [x for x in [pos[q] for q, _ in labels if pos[q] > pos[k]] + [x for x in stops if x > pos[k]] if x > 0]
                body = seg[start:(min(ends) if ends else len(seg))].strip()
                sents = be.split_sentences(body)
                q = ' '.join(sents[:2])
                if q:
                    periods[k] = q
                    years_by[k] = sorted(set(int(x) for x in YR.findall(q)))
            hq = periods['1869-1928']
            lcs = re.search(r'LCS:\s?(\d+)', seg[:400])
            nc = re.search(r'Contributing \(outside of cemetery\)', seg[:600])
            rows.append({
                'id': 'NPSMC-p%03d-%s' % (p, ssf),
                'source_id': SID, 'pdf_page': p, 'printed_page': be.printed_page(P[p], 'raw'),
                'ssf': ssf, 'name_as_printed': name, 'name_ordinals_joined': re.sub(r'(\d) (st|nd|rd|th)\b', r'\1\2', name),
                'drawing_as_printed': '(Drawing %s)' % m.group('dr'), 'lcs': lcs.group(1) if lcs else None,
                'outside_cemetery_note': 'Contributing (outside of cemetery)' if nc else None,
                'heading_quote': N[m.start():m.end()].strip(),
                'period_quote': hq, 'period_quotes': periods, 'years_by_period': years_by,
                'years_in_period_quote': years_by['1869-1928'],
                'state_date': 'year(s) of the 1869-1928 paragraph of the inventory entry (a later memorial; the entry says the monument did not exist in 1863-69)',
                'use_for_1863': 'none', 'tier_proposed': 'documented',
                'tier_basis': 'the cultural landscape report of 2017 states it in the history of the feature; its own sources are cited in its notes (not read here)',
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
    with open(os.path.join(OUT, 'memorial_cemetery.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'_doc': 'Headings of the cemetery inventory (Table 3.1 small-scale features) that are not rows of memorial_cemetery.jsonl, with the reason; generated by scripts/memorial_cemetery.py.', 'items': skipped},
              open(os.path.join(OUT, 'memorial_cemetery_skipped.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'memorial_cemetery.md'), 'w', encoding='utf-8') as f:
        f.write('# Monuments, memorials, markers and tablets of the Gettysburg National Cemetery: the small-scale features inventory (cultural landscape report, 2017)\n\n')
        f.write('Generated by `scripts/memorial_cemetery.py` (do not edit by hand). Heading and period paragraph are cut from the saved text (`scripts/verify_memorial_cemetery.py` finds them again). '
                'Every row is a later memorial (use for the July 1863 scene: `none`).\n\n%d rows (%d other headings in `memorial_cemetery_skipped.json`).\n\n| id | entry | name as printed | years by period (1863-69 / 1869-1928 / post-1928) | PDF p. |\n|---|---|---|---|---|\n' % (len(rows), len(skipped)))
        for r in rows:
            yb = r['years_by_period']
            f.write('| `%s` | %s | %s | %s | %d |\n' % (r['id'], r['ssf'], r['name_as_printed'].replace('|', '/'), ' / '.join((', '.join(str(y) for y in yb.get(k, [])) or '-') for k in ('1863-69', '1869-1928', 'post-1928')), r['pdf_page']))


if __name__ == '__main__':
    rows, skipped = build()
    if '--list' in sys.argv:
        for r in rows:
            print('%-18s %-8s %-75s | %s' % (r['id'], r['ssf'], r['name_as_printed'][:75], r['years_in_period_quote']))
        print(len(rows), 'rows;', len(skipped), 'skipped')
        for s in skipped:
            print('  skipped p%d %s %s: %s' % (s['pdf_page'], s['ssf'], s['name'][:60], s['why_not_a_row'][:50]))
    elif '--check' in sys.argv:
        decorate(rows)
        have = [json.loads(l) for l in open(os.path.join(OUT, 'memorial_cemetery.jsonl'), encoding='utf-8')]
        a = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows]
        b = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in have]
        if a != b:
            print('DIFFERENT: %d rows built, %d in the file' % (len(a), len(b)))
            sys.exit(1)
        print('memorial_cemetery.jsonl equals the rebuild (%d rows)' % len(rows))
    else:
        write(rows, skipped)
        print('%d rows, %d skipped; written to %s' % (len(rows), len(skipped), OUT))
