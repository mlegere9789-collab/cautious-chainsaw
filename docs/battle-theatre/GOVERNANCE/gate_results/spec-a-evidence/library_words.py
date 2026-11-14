#!/usr/bin/env python3
"""Count the status words of the three library status files and compare them with the table that GATE-SPEC-A.md prints
under Q25 ("The status words of the three files and what each maps to").

Reads GOVERNANCE/library/status.json, status_2.json, status_3.json (a list `sources` of rows with `id` and `status`),
merges them by source id with the highest-numbered file winning (the rule of Q25 and DD-G11), and prints one JSON object:
the words per file, the words after merging, how many ids are in one file only or in several, the words outside the three
terminal statuses of the gate text (ingested, blocked, scheduled), and the rows of the spec's table that the counts
do not reproduce. Also lists the acquisition ledgers (acquired.json, acquired_2.json, acquired_3.json, candidates.json) by
number of entries, so that an ledger entry with no status row (an untracked source) can be found.
Read-only. Usage: python3 -I library_words.py [path-to-spec]"""
import json, os, re, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import GOV, SPEC

LIB = os.path.join(GOV, 'library')
FILES = ['status.json', 'status_2.json', 'status_3.json']
THREE = {'ingested', 'blocked', 'scheduled'}


def rows_of(name):
    d = json.load(open(os.path.join(LIB, name), encoding='utf-8'))
    src = d.get('sources', d) if isinstance(d, dict) else d
    if isinstance(src, dict):
        return [dict(v, id=v.get('id', k)) for k, v in src.items()]
    return list(src)


per_file, merged, seen_in = {}, {}, collections.defaultdict(list)
for f in FILES:
    rs = rows_of(f)
    per_file[f] = dict(collections.Counter(r.get('status') for r in rs))
    for r in rs:
        merged[r['id']] = dict(r, _file=f)          # the later file overwrites
        seen_in[r['id']].append(f)
after = collections.Counter(r.get('status') for r in merged.values())
membership = collections.Counter('+'.join(sorted(v)) for v in seen_in.values())
words = sorted({w for c in per_file.values() for w in c})
out = {
    'rows_per_file': {f: sum(c.values()) for f, c in per_file.items()},
    'words_per_file': per_file,
    'words_in_use': len(words),
    'words_outside_the_three': sorted(w for w in words if w not in THREE),
    'ids_after_merging': len(merged),
    'ids_by_files_they_appear_in': dict(membership),
    'status_after_merging': dict(after),
}
ledgers = {}
for f in ('acquired.json', 'acquired_2.json', 'acquired_3.json', 'candidates.json'):
    p = os.path.join(LIB, f)
    if os.path.exists(p):
        d = json.load(open(p, encoding='utf-8'))
        for key in ('items', 'sources', 'acquired', 'candidates', 'files', 'entries'):
            if isinstance(d, dict) and key in d and hasattr(d[key], '__len__'):
                ledgers[f] = {'key': key, 'entries': len(d[key])}; break
        else:
            ledgers[f] = {'key': None, 'top_level_keys': list(d)[:8] if isinstance(d, dict) else None, 'entries': len(d) if hasattr(d, '__len__') else None}
out['ledgers'] = ledgers

# compare with the spec's table: | `word` | N | terminal | ... |
spec = open(sys.argv[1] if len(sys.argv) > 1 else SPEC, encoding='utf-8').read()
sec = spec.split('**The status words of the three files', 1)
table = {}
if len(sec) == 2:
    for m in re.finditer(r'(?m)^\| `([a-z0-9-]+)` \| (\d+) \|', sec[1].split('### Q26', 1)[0]):
        table[m.group(1)] = int(m.group(2))
mism = {w: {'spec': table.get(w), 'counted': after.get(w, 0)} for w in sorted(set(table) | set(after)) if table.get(w) != after.get(w, 0)}
out['spec_table_rows'] = len(table)
out['spec_table_sum'] = sum(table.values())
out['spec_table_mismatches'] = mism
print(json.dumps(out, indent=1, sort_keys=True))
