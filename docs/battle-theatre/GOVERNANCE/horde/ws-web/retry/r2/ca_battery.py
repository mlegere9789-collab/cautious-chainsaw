#!/usr/bin/env python3
"""Run a battery of Chronicling America retries.

Usage: python3 -I ca_battery.py specs.json [--only ID,ID] [--n 15]
A spec: {"id": "C03", "lk": ["LKR-..."], "q": "Klingle", "dates": "1863-07-01/1863-12-31", "show": "<python regex>", "n": 15, "prox": "<optional python regex, searched in a 700-character window around each show match>"}
For each spec: one search (50 results asked), the OCR text of the first n result pages is read (a page already held by the newspapers task is not requested),
every `show` match is recorded with 220 characters of context on each side. Results: retry/r2/ca_results.jsonl (one line per spec, rewritten per run of that id).
"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ca2
import rlib

RES = os.path.join(HERE, 'ca_results.jsonl')


def load_results():
    out = {}
    if os.path.exists(RES):
        for l in open(RES):
            if l.strip():
                d = json.loads(l)
                out[d['id']] = d
    return out


def run_spec(sp, n_default=15):
    n = sp.get('n', n_default)
    d, rec = ca2.search(sp['q'], sp['dates'], c=max(n, 20))
    res = {'id': sp['id'], 'lk': sp.get('lk', []), 'q': sp['q'], 'dates': sp['dates'], 'search': {k: rec.get(k) for k in ('url', 'at', 'http', 'of', 'returned', 'sha256', 'file', 'error')}, 'pages': []}
    if d is None:
        res['outcome'] = 'search failed: HTTP %s %s' % (rec.get('http'), (rec.get('error') or rec.get('body_start') or '')[:120])
        return res
    show = re.compile(sp['show'], re.I | re.S)
    prox = re.compile(sp['prox'], re.I | re.S) if sp.get('prox') else None
    nhit_pages = 0
    for r in d.get('results', [])[:n]:
        m = ca2.meta_of(r)
        path, note = ca2.page_text(m)
        pg = {'page_id': m['page_id'], 'paper': m['paper'], 'date': m['date'], 'seq': m['seq'], 'note': note}
        if not path:
            res['pages'].append(pg)
            continue
        t = open(path, encoding='utf-8', errors='replace').read()
        pg['text_file'] = rlib.rel(path)
        pg['text_sha256'] = rlib.sha_file(path)
        hits = []
        for mm in show.finditer(t):
            a, b = max(0, mm.start() - 220), min(len(t), mm.end() + 220)
            ctx = t[a:b]
            w = t[max(0, mm.start() - 350):mm.end() + 350]
            hits.append({'at': mm.start(), 'ctx': rlib.norm_ws(ctx), 'prox': bool(prox.search(w)) if prox else None})
            if len(hits) >= 6:
                break
        pg['hits'] = hits
        if hits:
            nhit_pages += 1
        res['pages'].append(pg)
    res['pages_read'] = sum(1 for p in res['pages'] if p.get('text_file'))
    res['pages_with_show'] = nhit_pages
    res['pages_with_prox'] = sum(1 for p in res['pages'] if any(h.get('prox') for h in p.get('hits', [])))
    res['outcome'] = 'searched: %s results in index, %d read, %d with the term, %d with the proximity' % (res['search'].get('of'), res['pages_read'], nhit_pages, res['pages_with_prox'])
    return res


def main():
    specs = json.load(open(sys.argv[1]))
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    done = load_results()
    for sp in specs:
        if only and sp['id'] not in only:
            continue
        res = run_spec(sp)
        done[sp['id']] = res
        with open(RES, 'w') as f:
            for v in done.values():
                f.write(json.dumps(v, ensure_ascii=False, sort_keys=True) + '\n')
        print(sp['id'], '|', sp['q'], '|', sp['dates'], '|', res['outcome'], flush=True)


if __name__ == '__main__':
    main()
