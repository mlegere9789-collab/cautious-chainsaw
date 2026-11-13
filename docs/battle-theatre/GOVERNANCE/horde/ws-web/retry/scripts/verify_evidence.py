#!/usr/bin/env python3
"""Independent check of web-lookups.jsonl (both folders): every quote is found again in the saved text and the text hash matches.

For each line: (1) the saved file exists and its sha256 equals citation.text_sha256; (2) quote_mode exact: the quote is a whitespace-insensitive
substring of the file at the stated offset; (3) quote_mode cleaned: source_text_excerpt is a substring at the stated offset, and applying
every ocr_corrections pair to the excerpt gives the quote (spacing around punctuation ignored); (4) the shard is web-lookups and the id/xid are unique.
Prints a result line per file and a list of problems; exit code 1 when any problem exists.
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rlib

problems = []
seen = set()


def norm(s):
    return re.sub(r'\s+', '', s)


def check(path):
    n = 0
    for ln, l in enumerate(open(path), 1):
        r = json.loads(l)
        n += 1
        c = r['citation']
        tag = '%s:%d %s' % (os.path.basename(os.path.dirname(path)), ln, r['xid'])
        if r['xid'] in seen:
            problems.append(tag + ' duplicate xid')
        seen.add(r['xid'])
        if r.get('shard') != 'web-lookups':
            problems.append(tag + ' wrong shard')
        p = rlib.abspath(c['local_path'])
        if not os.path.exists(p):
            problems.append(tag + ' missing file ' + c['local_path'])
            continue
        if rlib.sha_file(p) != c['text_sha256']:
            problems.append(tag + ' text sha256 differs')
        t = rlib.file_text(p)
        off, offe = c.get('text_offset'), c.get('text_offset_end')
        seg = t[off:offe]
        if c['quote_mode'] == 'exact':
            if norm(c['quote']) not in norm(seg):
                problems.append(tag + ' exact quote not at stated offset')
        else:
            exc = c.get('source_text_excerpt') or ''
            if norm(exc) != norm(seg):
                problems.append(tag + ' excerpt not at stated offset')
            fixed = exc
            for a, b in (c.get('ocr_corrections') or []):
                if a not in fixed:
                    problems.append(tag + ' correction source %r not in excerpt' % a)
                fixed = fixed.replace(a, b)
            if re.sub(r'[\W_]+', '', fixed).lower() != re.sub(r'[\W_]+', '', c['quote']).lower():
                problems.append(tag + ' corrected excerpt differs from quote beyond punctuation: %r vs %r' % (fixed[:80], c['quote'][:80]))
        if len(c['quote']) < 12:
            problems.append(tag + ' quote too short')
        if r['tier'] not in ('documented', 'inferred', 'plausible-procedural', 'open gap'):
            problems.append(tag + ' tier')
    return n


for p in (os.path.join(rlib.GOV, 'evidence_corrections', 'web-lookups.jsonl'), os.path.join(rlib.GOV, 'timeline_corrections', 'web-lookups.jsonl')):
    if os.path.exists(p):
        print(p.replace(rlib.ROOT + '/', ''), check(p), 'lines')
print('problems:', len(problems))
for x in problems:
    print('  ', x)
sys.exit(1 if problems else 0)
