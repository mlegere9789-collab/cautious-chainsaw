#!/usr/bin/env python3
"""Check every double-quoted string of GATE-SPEC-B.md against text that does NOT come from the spec files themselves.

    python3 -I verify_quotes.py [DOC] [--old OLD_DOC_COPY]...   (reads files only; writes nothing in the repository)

Fixed at the fourth pass (2026-11-14). The first three passes searched a corpus that contained GATE-SPEC-B.md itself (it walked all of docs/), so every quoted
string was trivially found in the file that quotes it and the "342 of 344 verbatim" of the earlier sections proved nothing. Now:
  * the corpus is the repository (docs, tests, tools, sim, src, ops, historian-src) WITHOUT docs/battle-theatre/GOVERNANCE/gate_results (the spec files and their evidence);
  * a second corpus is the run output kept in gate_results/spec-b-evidence (*.out, *.tsv, *.txt, *.err, *.log, *.tap): a string found only there is a quotation of program output
    and is reported under run_output (it is checked by what the run printed, not by a file of the repository);
  * a third corpus is any copy of an earlier version of this document passed with --old (the 'Was' column of section 8.2 quotes the old wording of this file);
  * strings are found with an escape-aware pattern, so a title that holds an escaped inner quote (\\"show every value\\") is one string and no longer shifts the pairing of the quote marks that follow;
  * folding removes backticks, backslash escapes, curly quotes, dash variants and runs of white space, and lowercases; a string is split on '...' (the spec elides the end of long titles that way)
    and each fragment of at least 10 characters must occur.
Prints one JSON line of counts and the list of strings found nowhere. Files above MAXSZ are skipped (data files that no title is quoted from); a string reported as not found must be checked with grep."""
import os, re, sys, json

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 5)))
args = sys.argv[1:]
OLD = []
while '--old' in args:
    i = args.index('--old'); OLD.append(args[i + 1]); del args[i:i + 2]
DOC = args[0] if args else os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC-B.md')
EXT = {'.mjs', '.js', '.py', '.md', '.json', '.jsonl', '.html', '.txt', '.sh', '.yml', '.yaml'}
SKIP_DIRS = {'node_modules', '.git', 'tmp', 'release', 'deliver', '__pycache__'}
MAXSZ = 3_000_000
EXCLUDE_PREFIX = 'docs/battle-theatre/GOVERNANCE/gate_results'
EVID = os.path.join(ROOT, EXCLUDE_PREFIX, 'spec-b-evidence')
EVID_EXT = {'.out', '.tsv', '.txt', '.err', '.log', '.tap'}

def fold(s):
    s = s.replace('\\\\', '\\').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`').replace('`', '')
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')
    s = s.replace('–', '-').replace('—', '-').replace('×', 'x')
    return re.sub(r'\s+', ' ', s).strip().lower()

def read(fp):
    return open(fp, encoding='utf-8', errors='replace').read()

repo, skipped = [], 0
for base in ('docs', 'tests', 'tools', 'sim', 'src', 'ops', 'historian-src', 'package.json'):
    p = os.path.join(ROOT, base)
    if os.path.isfile(p):
        repo.append(fold(read(p))); continue
    for dp, dn, fn in os.walk(p):
        dn[:] = [d for d in dn if d not in SKIP_DIRS]
        if os.path.relpath(dp, ROOT).replace(os.sep, '/').startswith(EXCLUDE_PREFIX): dn[:] = []; continue
        for f in fn:
            if os.path.splitext(f)[1] not in EXT: continue
            fp = os.path.join(dp, f)
            try:
                if os.path.getsize(fp) > MAXSZ: skipped += 1; continue
                repo.append(fold(read(fp)))
            except OSError: pass
corpus = '\n'.join(repo)
run = []
for dp, dn, fn in os.walk(EVID):
    dn[:] = [d for d in dn if d not in SKIP_DIRS]
    for f in fn:
        if os.path.splitext(f)[1] in EVID_EXT:
            try:
                if os.path.getsize(os.path.join(dp, f)) <= MAXSZ * 4: run.append(fold(read(os.path.join(dp, f))))
            except OSError: pass
run_corpus = '\n'.join(run)
old_corpus = '\n'.join(fold(read(o)) for o in OLD)
print('repo corpus chars', len(corpus), 'files', len(repo), 'skipped over MAXSZ', skipped, '| run-output chars', len(run_corpus), '| old copies', len(OLD), file=sys.stderr)

doc = read(DOC)
# an escape-aware double-quoted string on one line, at least 12 characters
PAT = re.compile(r'(?<![\\\w])"((?:[^"\\\n]|\\.){12,}?)"(?![\w])')
quotes = []
for line in doc.split('\n'):
    quotes += [m.group(1) for m in PAT.finditer(line)]
res = {'repo': 0, 'run_output': 0, 'old_text': 0, 'not_found': 0}
missing = []
for q in quotes:
    frags = [f for f in re.split(r'\s*\.\.\.\s*', q) if len(f.strip(' :,;.')) >= 10]
    if not frags: continue
    keys = [fold(fr.strip(' :,;')) for fr in frags]
    if all(k in corpus for k in keys): res['repo'] += 1
    elif all(k in corpus or k in run_corpus for k in keys): res['run_output'] += 1
    elif OLD and all(k in corpus or k in run_corpus or k in old_corpus for k in keys): res['old_text'] += 1
    else: res['not_found'] += 1; missing.append(q)
print(json.dumps({'quoted_strings_checked': sum(res.values()), **res}))
for m in missing: print('NOT FOUND:', m[:220])
