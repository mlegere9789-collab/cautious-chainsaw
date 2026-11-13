#!/usr/bin/env python3
"""Check every double-quoted string of GATE-SPEC-A.md that is not inside a code fence.
Convention of the spec: a string between straight double quotes is a quotation of the plan and is matched here;
text from repository files, the owner's chat or the spec's own words is written between backticks.
Tokenizer: a backtick that opens first starts a literal span (quotes inside it are ignored); a double quote that opens first
starts a quotation (backticks inside it are formatting and are dropped).
A quoted string is split on '...' and each fragment (at least 10 characters) must occur on the pages the line cites or the
nearest heading above it cites (a range counts every page in it; a quotation that crosses a page break is matched on the joined
text with the page footer removed). Matching ignores case, whitespace, dashes, every quote character and apostrophe, and
trailing punctuation. A fragment on another page is WRONG-PAGE; in no plan page, NOT-IN-PLAN.
Reads files only. Usage: python3 -I check_quotes.py [path-to-spec]"""
import re, sys, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from plan_lib import load_pages, fold, joined, pages_cited, SPEC


def norm(s):
    return re.sub(r"[\s'\"`]", '', fold(s))


def quotes_of(line):
    """Return the double-quoted strings of a line, per the tokenizer."""
    out, i, n = [], 0, len(line)
    while i < n:
        c = line[i]
        if c == '`':
            j = line.find('`', i + 1); i = (j + 1) if j >= 0 else n
        elif c == '"':
            j = i + 1; buf = []
            while j < n and line[j] != '"':
                if line[j] != '`': buf.append(line[j])
                j += 1
            if j < n: out.append(''.join(buf))
            i = j + 1
        else: i += 1
    return out


def main():
    doc_path = sys.argv[1] if len(sys.argv) > 1 else SPEC
    pages = load_pages()
    pn = {n: norm(x) for n, x in pages.items()}
    allj = norm(joined(pages, 1, 144))
    lines = open(doc_path, encoding='utf-8').read().split('\n')
    stats = {'quoted_checked': 0, 'found_on_cited_page': 0, 'wrong_page': 0, 'not_in_plan': 0,
             'no_page_cited_found_in_plan': 0, 'no_page_cited_not_in_plan': 0}
    wrong, notin, nocite = [], [], []
    fence = False; heading_pages = set()
    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```'): fence = not fence; continue
        if fence: continue
        if line.startswith('#'): heading_pages = pages_cited(line)
        cited = pages_cited(line) if line.startswith('#') else (pages_cited(line) | heading_pages)
        for q in quotes_of(line):
            if len(q.strip()) < 12: continue
            frags = [f.strip(' :,;.') for f in re.split(r'\s*\.\.\.\s*', q)]
            frags = [f for f in frags if len(f) >= 10]
            if not frags: continue
            keys = [norm(f).rstrip('.,;:') for f in frags]
            stats['quoted_checked'] += 1
            if cited:
                def on_pages(k):
                    if any(n in pn and k in pn[n] for n in cited): return True
                    return any(k in norm(joined(pages, a, min(a + 1, 144))) for a in cited)
                if all(on_pages(k) for k in keys): stats['found_on_cited_page'] += 1; continue
                if all(k in allj for k in keys):
                    stats['wrong_page'] += 1
                    where = sorted({n for n in pn for k in keys if k in pn[n]})
                    wrong.append((i, q, sorted(cited), where[:8]))
                else: stats['not_in_plan'] += 1; notin.append((i, q, sorted(cited)))
            else:
                if all(k in allj for k in keys): stats['no_page_cited_found_in_plan'] += 1
                else: stats['no_page_cited_not_in_plan'] += 1; nocite.append((i, q))
    print(json.dumps(stats))
    for i, q, c, w in wrong: print(f'WRONG-PAGE line {i}: cites {c}; found on {w}: "{q[:200]}"')
    for i, q, c in notin: print(f'NOT-IN-PLAN line {i}: cites {c}: "{q[:260]}"')
    for i, q in nocite: print(f'NOT-IN-PLAN (no page cited) line {i}: "{q[:260]}"')


main()
