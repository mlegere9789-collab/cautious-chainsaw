#!/usr/bin/env python3
"""How many sub-requirement rows of each gate have at least one line in the correction files of the evidence workstreams.
Read-only; writes nothing.   python3 -I docs/battle-theatre/GOVERNANCE/gate_results/spec-b-evidence/pass5/corrections_by_gate.py

Inputs: GOVERNANCE/requirements.json (rows and their gate_ids), GOVERNANCE/evidence_corrections/*.jsonl and GOVERNANCE/timeline_corrections/*.jsonl.
A correction line names its row in `id`: a sub-requirement id (R14.S-001, R13.P-01, R12.032, R03.C-001, R20.0000 ...), a timeline row (T1-001, which is the
sub-requirement R11.nnnn whose text starts "Timeline row T1-001") or an epilogue row (E-001, the sub-requirement R22.nnnn whose text starts "Epilogue row E-001").
A correction line is evidence about a row; it is never a pass, a realization or a register entry, and no code reads these files yet (check_coverage.py does not).
"""
import json, os, re, glob, collections, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *(['..'] * 6)))
G = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE')
req = json.load(open(os.path.join(G, 'requirements.json'), encoding='utf-8'))
subs = {s['id']: s for s in req['sub_requirements']}
tl = {}
for s in subs.values():
    m = re.match(r'(?:Timeline|Epilogue) row ([TE]\d?-\d+) ', s['text'])
    if m:
        tl[m.group(1)] = s['id']

lines = collections.defaultdict(list)          # sub-requirement id -> [(folder, file, verdict)]
unknown = collections.Counter()
per_file = {}
for d in ('evidence_corrections', 'timeline_corrections'):
    for f in sorted(glob.glob(os.path.join(G, d, '*.jsonl'))):
        n, ver = 0, collections.Counter()
        for l in open(f, encoding='utf-8'):
            if not l.strip():
                continue
            r = json.loads(l)
            n += 1
            ver[r.get('verdict')] += 1
            i = r.get('id')
            sid = i if i in subs else tl.get(i)
            if sid is None:
                unknown[(d, os.path.basename(f), i)] += 1
                continue
            lines[sid].append((d, os.path.basename(f), r.get('verdict')))
        per_file[d + '/' + os.path.basename(f)] = {'rows': n, 'verdict': dict(ver)}

by_gate = collections.OrderedDict()
for g in ['Q%02d' % i for i in range(1, 29)]:
    ids = [i for i, s in subs.items() if g in s['gate_ids']]
    hit = [i for i in ids if lines.get(i)]
    nlines = sum(len(lines[i]) for i in hit)
    by_gate[g] = {'rows': len(ids), 'rows_with_a_line': len(hit), 'lines': nlines}

sets = collections.OrderedDict()
def st(name, pred):
    ids = [i for i in subs if pred(i)]
    hit = [i for i in ids if lines.get(i)]
    sets[name] = {'rows': len(ids), 'rows_with_a_line': len(hit), 'lines': sum(len(lines[i]) for i in hit)}
st('R14.S (schedule entries)', lambda i: i.startswith('R14.S-'))
st('R14.E (works)', lambda i: i.startswith('R14.E-'))
st('R13.G (gun emplacements)', lambda i: i.startswith('R13.G-'))
st('R13.P (pre-existing features)', lambda i: i.startswith('R13.P-'))
st('R12 (terrain catalogue, 45)', lambda i: re.match(r'R12\.\d\d\d$', i) is not None)
st('R03.C (conflicts, 47)', lambda i: i.startswith('R03.C-'))
st('R11 (timeline rows, 691)', lambda i: re.match(r'R11\.0\d\d\d$', i) is not None and i != 'R11.0000')
st('R22 rows (14 epilogue rows)', lambda i: re.match(r'R22\.00(0[1-9]|1[0-4])$', i) is not None)
for top in ('R02.0000', 'R05.0000', 'R13.0000', 'R14.0000', 'R20.0000', 'R22.0000'):
    st(top, lambda i, top=top: i == top)
tops = {}
for i in sorted(subs):
    if i.endswith('.0000'):
        tops[i] = len(lines.get(i, []))

# per file: lines per file by the kind of row
kinds = collections.OrderedDict()
for sid, ls in lines.items():
    k = re.sub(r'\d', '9', sid.split('.')[0]) + '.' + ('S' if '.S-' in sid else 'E' if '.E-' in sid else 'G' if '.G-' in sid else 'P' if '.P-' in sid else 'C' if '.C-' in sid else '0000' if sid.endswith('.0000') else 'n')
    for d, f, v in ls:
        kinds.setdefault(d + '/' + f, collections.Counter())[sid.split('.')[0] + ('.S' if '.S-' in sid else '.E' if '.E-' in sid else '.G' if '.G-' in sid else '.P' if '.P-' in sid else '.C' if '.C-' in sid else '.top' if sid.endswith('.0000') else '')] += 1

out = {'per_file': per_file, 'per_gate': by_gate, 'sets': sets, 'lines_per_file_by_row_kind': {k: dict(v) for k, v in kinds.items()}, 'top_rows_lines': {k: v for k, v in tops.items() if v},
       'lines_not_matching_a_row': {'%s %s %s' % k: v for k, v in unknown.items()}, 'total_lines_matched': sum(len(v) for v in lines.values()), 'distinct_rows_with_a_line': len(lines)}
print(json.dumps(out, indent=1))
