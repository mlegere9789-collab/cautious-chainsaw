#!/usr/bin/env python3
"""Check the double-quoted strings that the sixth pass ADDED to GATE-SPEC-B.md against the repository, with ONE multi-pattern ripgrep scan (a few seconds of CPU,
so no machine lock), as a quick companion of verify_quotes.py (which reads 200 MB with a python loop and belongs under the lock).

    python3 -I quick_quotes.py [DOC] [BEFORE]       DOC defaults to GOVERNANCE/gate_results/GATE-SPEC-B.md, BEFORE to pass5/GATE-SPEC-B.before-pass6.md

Which strings: every double-quoted string in the lines of DOC that are not lines of BEFORE (added or changed lines).  Folding as verify_quotes.py does it: backticks, backslash
escapes and curly quotes removed, dashes unified, white space collapsed, lower case; a string is split on '...' and each fragment of at least 10 characters must occur.
Corpus: docs, tests, tools, sim and ops of the repository without docs/battle-theatre/GOVERNANCE/gate_results (the spec files), files up to 3 MB; then the run output kept in spec-b-evidence
(*.out, *.tsv, *.txt, *.err, *.log, *.tap; never *.md) and in tmp/bt-gates (raw outputs): a string found only there is reported under only_in_run_output; then the text of BEFORE
(the wording of this file before the pass: the 'Was' column quotes it).  A control document must live outside these folders (the scratchpad).
Prints one JSON object: counts and the strings found nowhere.  Writes nothing."""
import os, re, sys, json, subprocess, tempfile, difflib

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
HERE = os.path.dirname(os.path.abspath(__file__))
DOC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC-B.md')
BEFORE = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'GATE-SPEC-B.before-pass6.md')

def fold(s):
    s = s.replace('\\\\', '\\').replace("\\'", "'").replace('\\"', '"').replace('\\`', '`').replace('`', '')
    s = s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"').replace('–', '-').replace('—', '-').replace('×', 'x')
    return re.sub(r'\s+', ' ', s).strip().lower()

old = set(open(BEFORE, encoding='utf-8').read().split('\n'))
new_lines = [l for l in open(DOC, encoding='utf-8').read().split('\n') if l not in old]
STR = re.compile(r'"((?:[^"\\\n]|\\.)*)"')
strings = []
for l in new_lines:
    for m in STR.finditer(l):
        s = m.group(1)
        if len(re.sub(r'[^A-Za-z0-9]', '', s)) >= 8:
            strings.append(s)
frags = {}
for s in strings:
    for f in fold(s).split('...'):
        f = f.strip()
        if len(f) >= 10:
            frags.setdefault(f, []).append(s)
# one scan of the repository
pats = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False, encoding='utf-8')
for f in frags:
    pats.write(f.replace('\n', ' ') + '\n')
pats.close()
def scan(paths, globs):
    cmd = ['rg', '-F', '-i', '-o', '--no-filename', '--no-line-number', '--max-filesize', '3M', '--no-messages', '-f', pats.name]
    for g in globs:
        cmd += ['-g', g]
    cmd += paths
    out = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=ROOT).stdout
    return set(fold(x) for x in out.split('\n') if x)
# rg matches within a line, so a fragment is found when it occurs inside one line; fold() of the match equals the fragment (fixed-string, case-insensitive)
repo = scan(['docs', 'tests', 'tools', 'sim', 'ops', 'historian-src'], ['!docs/battle-theatre/GOVERNANCE/gate_results/**', '!**/node_modules/**', '!**/.git/**', '!release/**', '!deliver/**'])
run = scan(['docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence', 'tmp/bt-gates'], ['*.out', '*.tsv', '*.txt', '*.err', '*.log', '*.tap', '*.raw'])   # no *.md: a copy of a spec file must never count as run output
run |= scan(['docs/battle-theatre/GOVERNANCE/gate_results'], ['Q[0-9][0-9].json', 'Q[0-9][0-9].prev.json', '**/gate_results/evidence/**'])   # the stored gate records and the runners' evidence folder (not the spec files)
before_text = fold(open(BEFORE, encoding='utf-8').read())
# the pass-5 copies of old text in spec-b-evidence are the "before" file itself: skip it in run output
found_repo = {f for f in frags if f in repo}
found_run = {f for f in frags if f not in repo and f in run}
found_old = {f for f in frags if f not in repo and f not in run and f in before_text}
nowhere = [f for f in frags if f not in repo and f not in run and f not in before_text]
os.unlink(pats.name)
print(json.dumps({'added_or_changed_lines': len(new_lines), 'quoted_strings': len(strings), 'fragments': len(frags), 'in_repo': len(found_repo), 'only_in_run_output': len(found_run), 'only_in_the_text_before_this_pass': len(found_old), 'nowhere': len(nowhere),
                  'nowhere_list': [{'fragment': f[:200], 'in': frags[f][0][:200]} for f in nowhere]}, indent=1, ensure_ascii=False))
