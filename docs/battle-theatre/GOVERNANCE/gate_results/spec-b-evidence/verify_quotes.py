#!/usr/bin/env python3
"""Check every double-quoted string of GATE-SPEC-B.md against the text of the repository.
A quoted string is split on '...' (the spec elides the end of long titles that way) and each fragment must occur,
after folding of apostrophes, quotes, backslashes and whitespace, in at least one source file.
Prints the strings that are NOT found. Reads files only; writes nothing in the repository.
Two strings of the spec contain an escaped inner quote (\\"show every value\\", \\"documented\\"); the regular expression cuts them at it and they are
reported here although they exist verbatim (checked by hand with grep: scenario-defaults.test.mjs line 27, weather3d.test.mjs line 82)."""
import os, re, sys, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 5)))
DOC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC-B.md')
EXT = {'.mjs', '.js', '.py', '.md', '.json', '.jsonl', '.html', '.txt', '.sh', '.yml', '.yaml'}
SKIP_DIRS = {'node_modules', '.git', 'tmp', 'release', 'deliver', '__pycache__'}
MAXSZ = 8_000_000

def fold(s):
    s = s.replace('\\\\', '\\').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`')
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-').replace('×', 'x')
    return re.sub(r'\s+', ' ', s).strip().lower()

chunks = []
for base in ('docs', 'tests', 'tools', 'sim', 'src', 'ops', 'historian-src', 'package.json'):
    p = os.path.join(ROOT, base)
    if os.path.isfile(p):
        chunks.append(fold(open(p, encoding='utf-8', errors='replace').read())); continue
    for dp, dn, fn in os.walk(p):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        for f in fn:
            if os.path.splitext(f)[1] not in EXT: continue
            fp = os.path.join(dp, f)
            try:
                if os.path.getsize(fp) > MAXSZ: continue
                chunks.append(fold(open(fp, encoding='utf-8', errors='replace').read()))
            except OSError: pass
corpus = '\n'.join(chunks)
print('corpus chars', len(corpus), 'files', len(chunks), file=sys.stderr)

doc = open(DOC, encoding='utf-8').read()
# quoted strings: straight double quotes, no newline inside
quotes = re.findall(r'"([^"\n]{12,})"', doc)
missing, found = [], 0
for q in quotes:
    frags = [f for f in re.split(r'\s*\.\.\.\s*', q) if len(f.strip(' :,;.')) >= 10]
    if not frags: continue
    ok = True
    for fr in frags:
        key = fold(fr.strip(' :,;'))
        if key not in corpus:
            ok = False; break
    if ok: found += 1
    else: missing.append(q)
print(json.dumps({'quoted_strings_checked': found + len(missing), 'found': found, 'not_found': len(missing)}))
for m in missing: print('NOT FOUND:', m[:200])
