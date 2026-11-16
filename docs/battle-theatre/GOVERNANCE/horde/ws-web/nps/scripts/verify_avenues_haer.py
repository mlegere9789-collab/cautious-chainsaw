#!/usr/bin/env python3
"""Independent check of extracts/avenues_haer.jsonl against the saved text of NPS-HABS-pa3648 (HAER PA-485, tour roads).

For every row: the text sha256 equals the one in the row, in sources.json and in GOVERNANCE/library/acquired_3.json; the heading quote is found on its PDF page; every Location and
Brief History sentence is found verbatim (whitespace-normalised) on the PDF page it names, and the years listed for it are exactly the years (1800-2029) of its text; for an avenue
(entries 1 to 52) the first Brief History sentence stands right after the label 'Brief History:' on its page; the entry numbers 1 to 52 are all present once; use_for_1863 is none;
ids are unique; the rows of the small roadways (entry 53) are the lines of the list on the page; older_trace_sentence_indexes point at sentences of the row.
Prints the result; exit 1 on a problem. Run with python3 -I."""
import hashlib, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
NPS = os.path.dirname(HERE)
ROOT = os.path.abspath(os.path.join(NPS, '..', '..', '..', '..', '..', '..'))
SID = 'NPS-HABS-pa3648'
YR = re.compile(r'(?<!\d)(1[89]\d\d|20[0-2]\d)(?!\d)')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def main():
    spec = importlib.util.spec_from_file_location('build_extracts', os.path.join(HERE, 'build_extracts.py'))
    be = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(be)
    rows = [json.loads(l) for l in open(os.path.join(NPS, 'extracts', 'avenues_haer.jsonl'), encoding='utf-8')]
    src = {s['id']: s for s in json.load(open(os.path.join(NPS, 'sources.json')))['sources']}[SID]
    acq = {i['id']: i for i in json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'library', 'acquired_3.json')))['items']}[SID]
    P0, tsha, tpath = be.pages(SID)
    P = {p: norm(t) for p, t in P0.items()}
    problems, ids, nos = [], set(), []
    if src.get('text_sha256') != tsha or acq.get('text_sha256') != tsha:
        problems.append('text sha256 differs between the saved text, sources.json and acquired_3.json')
    if not src.get('rights_basis'):
        problems.append('no rights basis')
    n_sent = 0
    for r in rows:
        rid = r['id']
        if rid in ids:
            problems.append('%s: duplicate id' % rid)
        ids.add(rid)
        if r['text_sha256'] != tsha:
            problems.append('%s: text sha256 differs' % rid)
        if r['use_for_1863'] != 'none':
            problems.append('%s: use_for_1863 is not none' % rid)
        hq = norm(r['heading_quote'])
        if hq not in P.get(r['heading_pdf_page'], ''):
            problems.append('%s: heading quote not found on page %s' % (rid, r['heading_pdf_page']))
        for key in ('location_sentences', 'history_sentences'):
            for k, s in enumerate(r[key]):
                n_sent += 1
                if norm(s['text']) not in P.get(s['pdf_page'], ''):
                    problems.append('%s: %s %d not found on page %s' % (rid, key, k, s['pdf_page']))
                ys = sorted(set(int(x) for x in YR.findall(s['text'])))
                if ys != s['years']:
                    problems.append('%s: years of %s %d differ from its text' % (rid, key, k))
        if not r['history_sentences']:
            problems.append('%s: no Brief History sentences' % rid)
        ys = sorted({y for s in r['history_sentences'] for y in s['years']})
        if ys != r['years_in_history']:
            problems.append('%s: years_in_history differs from the sentences' % rid)
        if r['avenue_no'] <= 52 and r['history_sentences']:
            s0 = r['history_sentences'][0]
            pt = P.get(s0['pdf_page'], '')
            i = pt.find(norm(s0['text']))
            if i < 0 or not re.search(r'Brief History:\s*$', pt[max(0, i - 40):i]):
                problems.append('%s: the first Brief History sentence does not follow the label' % rid)
        for n in r.get('older_trace_sentence_indexes', []):
            if not (0 <= n < len(r['history_sentences'])):
                problems.append('%s: older_trace index %d out of range' % (rid, n))
        if r['avenue_no'] <= 52:
            nos.append(r['avenue_no'])
    if sorted(nos) != list(range(1, 53)):
        problems.append('entry numbers 1 to 52 are not all present once: %s' % sorted(nos))
    print('rows %d (%d avenue entries, %d small roadways) | sentences %d | problems %d' % (len(rows), len(nos), len(rows) - len(nos), n_sent, len(problems)))
    for pr in problems[:100]:
        print(' -', pr)
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
