#!/usr/bin/env python3
"""Per-avenue entries of the HAER report on the park's tour roads (Historic American Engineering Record No. PA-485, 1998; saved as NPS-HABS-pa3648)
(workstream bt-web, task nps-landscape; the avenue dates are what the world-content and realization workstreams need for 'no avenue before its date').

The report's Appendix B describes 52 numbered avenues, each as
    '23. Howard Avenue' / 'Material:' / 'Length:' / 'Width:' / 'Location:' / 'Brief History:' / 'Description:' / 'Significant Features:'
and ends with '53. Small Roadways:' (short roads around three memorials). One row per avenue: the heading as printed (OCR slips such as 'HcGilvery' and '2 0.' are kept as the
text layer has them), the Location paragraph and the whole Brief History paragraph(s) as verbatim sentences with the PDF page of each sentence and the years each names.
Page headers and footnote blocks are left out; a sentence that runs over a page break is cut at the break and flagged. Nothing is matched to any other list.
Every row is a later road (use_for_1863 none): an avenue is a creation of the Gettysburg Battlefield Memorial Association (1880s to 1895), the War Department (1895 to 1933) or the
National Park Service; where an avenue follows an older farm lane or road trace the Brief History or the Description says so in its own words (see the sentences).

  avenues_haer.py           build extracts/avenues_haer.jsonl and avenues_haer.md
  avenues_haer.py --check   rebuild in memory and compare
  avenues_haer.py --list    print the rows
Run with python3 -I."""
import importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
OUT = os.path.join(NPS, 'extracts')
spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
be = importlib.util.module_from_spec(spec)
spec.loader.exec_module(be)
SID = 'NPS-HABS-pa3648'
YR = re.compile(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)')
HEAD = re.compile(r'^\s*(\d)\s?(\d)?\.?\s+([A-Z].*?)\s*$')
LABEL = re.compile(r'^\s*(?:\S{1,2}\s+)?(Material|Length|Width|Location|Brief History|Description|Significant Features|Other Names?):')
TRACE = re.compile(r'pre-?\s?dates?|\btrace|\blanes?\b|\bexist|\bold\b|\bearlier\b|\bpath\b|\bfarm road|\bhistoric', re.I)
FOOT = re.compile(r'^\s{4,}\d{1,3}(\s|$)')
FIRST_PAGE = 139


def is_header(line):
    s = line.strip()
    return bool(re.fullmatch(r'\(Page \d+\)', s) or s.upper() == 'HAER NO. PA-485' or ('TOUR ROADS' in s.upper() and len(s) < 70))


def stream(P):
    """Lines of the avenue pages with the page of each line; page headers dropped; footnote blocks (indented number at the foot of a page) dropped."""
    S = []
    for p in sorted(P):
        if p < FIRST_PAGE or p > 211:
            continue
        foot = False
        for ln in P[p].split('\n'):
            if not ln.strip() or is_header(ln):
                continue
            if FOOT.match(ln):
                foot = True
            S.append((p, ln, foot))
    return S


def sentences(lines):
    """lines: [(page, text)] of one paragraph; returns the verbatim sentences per page segment with flags."""
    segs, cur_p, cur = [], None, []
    for p, t in lines:
        if p != cur_p and cur:
            segs.append((cur_p, ' '.join(cur)))
            cur = []
        cur_p = p
        cur.append(t.strip())
    if cur:
        segs.append((cur_p, ' '.join(cur)))
    out = []
    prev_open = False
    for si, (p, txt) in enumerate(segs):
        txt = be.norm(txt)
        ss = be.split_sentences(txt)
        for k, s in enumerate(ss):
            frag_start = prev_open and k == 0
            frag_end = (si < len(segs) - 1) and k == len(ss) - 1 and not re.search(r'[.!?][\"”’)\]]*\d{0,3}$', s)
            out.append({'pdf_page': p, 'text': s, 'years': sorted(set(int(x) for x in YR.findall(s))), 'starts_on_previous_page': frag_start, 'continues_on_next_page': frag_end})
        prev_open = bool(ss) and out[-1]['continues_on_next_page']
    return out


def build():
    P, tsha, tpath = be.pages(SID)
    S = stream(P)
    # headings: for the k-th 'Material:' line look back for '<k>. Name'
    mats = [i for i, (p, ln, f) in enumerate(S) if re.match(r'\s*Material:', ln)]
    ents = []
    k = 0
    for i in mats:
        k += 1
        j = None
        for b in range(i - 1, max(i - 15, -1), -1):
            m = HEAD.match(S[b][1])
            if m and int((m.group(1) or '') + (m.group(2) or '')) == k:
                j = b
                break
        if j is None:
            raise SystemExit('no heading for entry %d before line %d (page %d)' % (k, i, S[i][0]))
        ents.append({'no': k, 'head': j, 'mat': i})
    rows, skipped = [], []
    small = next((i for i, (p, ln, f) in enumerate(S) if re.match(r'\s*53\.\s+Small Roadways', ln)), len(S))
    for e_i, e in enumerate(ents):
        end = ents[e_i + 1]['head'] if e_i + 1 < len(ents) else small
        body = S[e['mat']:end]
        m = HEAD.match(S[e['head']][1])
        name = m.group(3).strip()
        hp = S[e['head']][0]
        notes = ' '.join(ln.strip() for p, ln, f in S[e['head'] + 1:e['mat']])
        labs = [(i, LABEL.match(ln).group(1)) for i, (p, ln, f) in enumerate(body) if LABEL.match(ln)]

        def para(label):
            for n, (i, lab) in enumerate(labs):
                if lab == label:
                    stop = labs[n + 1][0] if n + 1 < len(labs) else len(body)
                    lines = []
                    for q, (p, ln, f) in enumerate(body[i:stop]):
                        if f:
                            continue
                        t = ln
                        if q == 0:
                            t = re.sub(r'^\s*(?:\S{1,2}\s+)?' + re.escape(label) + r':\s*', '', t)
                        lines.append((p, t))
                    return lines
            return None
        bh = para('Brief History')
        if not bh:
            skipped.append({'avenue_no': e['no'], 'name': name, 'pdf_page': hp, 'why_not_a_row': 'the entry has no Brief History label in the text layer'})
            continue
        loc = para('Location')
        hs = sentences(bh)
        years = sorted({y for s in hs for y in s['years']})
        pg = sorted({s['pdf_page'] for s in hs})
        pm = re.search(r'\(Page (\d+)\)', P[hp])
        rows.append({
            'id': 'NPSAV-%02d' % e['no'], 'source_id': SID, 'avenue_no': e['no'], 'name_as_printed': name,
            'heading_quote': be.norm(S[e['head']][1]), 'heading_pdf_page': hp, 'heading_printed_page': pm.group(1) if pm else None,
            'heading_notes': notes or None,
            'location_sentences': sentences(loc) if loc else [],
            'history_pdf_pages': pg, 'history_sentences': hs, 'years_in_history': years,
            'older_trace_sentence_indexes': [n for n, s in enumerate(hs) if TRACE.search(s['text'])],
            'state_date': 'the years of the Brief History (the avenue as built is a work of the memorial association, the War Department or the National Park Service, after the battle; a sentence that names an older lane, trace or road is a statement about that older feature: see the sentence and the indexes in older_trace_sentence_indexes)',
            'use_for_1863': 'none', 'tier_proposed': 'documented',
            'tier_basis': 'the report of 1998 states it; its sources (association minute books, annual reports of the park commission, Cope\'s avenue log) are cited in its footnotes and were not read here',
            'retrieved': '2026-11-16', 'text_variant': 'reading-order', 'text_path': tpath, 'text_sha256': tsha,
        })
    # '53. Small Roadways:' list
    items, cur = [], None
    for p, ln, f in S[small + 1:]:
        if re.match(r'\s*Appendix', ln):
            break
        mm = re.match(r'^([A-Z][A-Za-z\.\' ]+?):\s+(\S.*)$', ln)
        if mm and not ln.startswith(' ' * 6):
            cur = {'pdf_page': p, 'name': mm.group(1), 'lines': [(p, mm.group(2))]}
            items.append(cur)
        elif cur is not None:
            cur['lines'].append((p, ln))
    for n, it in enumerate(items, 1):
        hs = sentences([(p, ln) for p, ln in it['lines']])
        rows.append({
            'id': 'NPSAV-53-%d' % n, 'source_id': SID, 'avenue_no': 53, 'name_as_printed': it['name'], 'heading_quote': '53. Small Roadways:', 'heading_pdf_page': S[small][0],
            'heading_printed_page': (re.search(r'\(Page (\d+)\)', P[S[small][0]]) or [None, None])[1], 'heading_notes': None, 'location_sentences': [],
            'history_pdf_pages': sorted({s['pdf_page'] for s in hs}), 'history_sentences': hs, 'years_in_history': sorted({y for s in hs for y in s['years']}),
            'state_date': 'the years of the entry (a short road around a memorial, built after the battle)', 'use_for_1863': 'none', 'tier_proposed': 'documented',
            'tier_basis': 'the report of 1998 states it; its sources are cited in its footnotes and were not read here', 'retrieved': '2026-11-16', 'text_variant': 'reading-order',
            'text_path': tpath, 'text_sha256': tsha,
        })
    return rows, skipped, len(mats)


def sources_meta():
    return {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}


def decorate(rows):
    s = sources_meta()[SID]
    for r in rows:
        r['source_title'], r['source_date'], r['source_author'], r['url'], r['rights_basis'] = s['title'], s['date'], s['author'], s['url'], s.get('rights_basis')
    return rows


def write(rows, skipped, n_mat):
    decorate(rows)
    with open(os.path.join(OUT, 'avenues_haer.jsonl'), 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    json.dump({'_doc': 'Entries of the HAER report that are not rows of avenues_haer.jsonl, with the reason; generated by scripts/avenues_haer.py.', 'material_labels_found': n_mat, 'items': skipped},
              open(os.path.join(OUT, 'avenues_haer_skipped.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, 'avenues_haer.md'), 'w', encoding='utf-8') as f:
        f.write('# Avenues of Gettysburg National Military Park: dates of the Brief History in the HAER report on the tour roads (HAER PA-485, 1998)\n\n')
        f.write('Generated by `scripts/avenues_haer.py` (do not edit by hand). Each row keeps the Location paragraph and the Brief History of its entry as verbatim sentences with their PDF page '
                '(`scripts/verify_avenues_haer.py` finds every sentence again in the saved text); the years column lists every year the Brief History names. '
                'Every row is a later road (use for the July 1863 scene: `none`). Where an avenue follows an older lane or road trace the sentences say so in the report\'s own words.\n\n'
                '%d rows (%d entries skipped: `avenues_haer_skipped.json`).\n\n| id | entry as printed | years named in the Brief History | PDF pages |\n|---|---|---|---|\n' % (len(rows), len(skipped)))
        for r in rows:
            f.write('| `%s` | %s | %s | %s |\n' % (r['id'], r['name_as_printed'].replace('|', '/'), ', '.join(str(y) for y in r['years_in_history']) or '-', ', '.join(str(x) for x in r['history_pdf_pages'])))


if __name__ == '__main__':
    rows, skipped, n_mat = build()
    if '--list' in sys.argv:
        for r in rows:
            print('%-12s %-48s %s | %s' % (r['id'], r['name_as_printed'][:48], r['years_in_history'], r['history_sentences'][0]['text'][:80] if r['history_sentences'] else ''))
        print(len(rows), 'rows;', len(skipped), 'skipped;', n_mat, 'Material labels')
        for s in skipped:
            print('  skipped', s)
    elif '--check' in sys.argv:
        decorate(rows)
        have = [json.loads(l) for l in open(os.path.join(OUT, 'avenues_haer.jsonl'), encoding='utf-8')]
        a = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in rows]
        b = [json.dumps(r, ensure_ascii=False, sort_keys=True) for r in have]
        if a != b:
            print('DIFFERENT: %d rows built, %d in the file' % (len(a), len(b)))
            sys.exit(1)
        print('avenues_haer.jsonl equals the rebuild (%d rows)' % len(rows))
    else:
        write(rows, skipped, n_mat)
        print('%d rows, %d skipped (%d Material labels); written to %s' % (len(rows), len(skipped), n_mat, OUT))
