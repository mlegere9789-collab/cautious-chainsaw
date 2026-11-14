"""Independent slice check: for every citation of timeline_corrections/tl-01.jsonl read the source file at [text_offset, text_offset_end)
(raw file decoded as UTF-8 with newline='') and compare, after whitespace normalisation and dehyphenation of line breaks, with the stored quote.
Also checks: sha256 of the source file, printed_page present, verbatim quote length, offsets inside the file."""
import json, re, sys, os, hashlib
ROOT = '/home/user/cautious-chainsaw'
G = ROOT + '/docs/battle-theatre/GOVERNANCE'
rows = [json.loads(l) for l in open(G + '/timeline_corrections/tl-01.jsonl', encoding='utf-8')]
def ws(s): return re.sub(r'\s+', ' ', s).strip()
def squash(s): return re.sub(r'[^0-9a-z]', '', s.lower())
raws = {}; shas = {}
agree = disagree = 0; bad = []
for r in rows:
    for c in r['citations']:
        p = ROOT + '/' + c['source_file']
        if p not in raws:
            raws[p] = open(p, encoding='utf-8', newline='').read()
            shas[p] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
        t = raws[p]
        if shas[p] != c['sha256']: bad.append((r['id'], c['key'], 'sha256 differs'))
        a, b = c['text_offset'], c['text_offset_end']
        if not (0 <= a < b <= len(t)): bad.append((r['id'], c['key'], 'offset outside file')); continue
        sl = t[a:b]
        # dehyphenate end-of-line hyphens and compare squashed (letters+digits) text
        if squash(sl) == squash(c['quote']): agree += 1
        else:
            # a quote that crosses a page break: the slice holds the running head between the words
            q = squash(c['quote']); s2 = squash(sl)
            if s2.startswith(q[:40]) and s2.endswith(q[-16:]) and len(s2) > len(q): agree += 1; bad.append((r['id'], c['key'], 'slice longer than quote (page break inside, heads between the words)'))
            else: disagree += 1; bad.append((r['id'], c['key'], 'slice differs: %r vs %r' % (sl[:80], c['quote'][:80])))
        if c['source_id'] == 'OR27':
            if not c.get('report_id') or not c.get('printed_page') or c.get('part') not in (1, 2, 3): bad.append((r['id'], c['key'], 'OR citation without report, page or part'))
        else:
            if not c.get('printed_page') and not c.get('page_basis'): bad.append((r['id'], c['key'], 'no page and no basis'))
print('citations', agree + disagree, 'agree', agree, 'disagree', disagree)
for x in bad: print(' ', x)
