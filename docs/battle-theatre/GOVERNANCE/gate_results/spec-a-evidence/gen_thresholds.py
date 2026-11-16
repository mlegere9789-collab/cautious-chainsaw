#!/usr/bin/env python3
"""Generate GOVERNANCE/gate_results/thresholds.json from the threshold registry (section 7) of GATE-SPEC-A.md, or check that the file equals the table.

The registry in section 7 is the definition; the JSON is its machine-readable form for the runners (1.8: a runner reads thresholds from thresholds.json, a threshold with the
status UNSET makes its gate INCOMPLETE, a value may be tightened and never loosened). The file is generated, never edited by hand. Reads the spec; writes only the JSON.

Usage:
  python3 -I gen_thresholds.py            write thresholds.json (atomically) and print a one-line summary
  python3 -I gen_thresholds.py --check    compare the file with the table; exit 1 on any difference (also when the file is missing)
  python3 -I gen_thresholds.py --check <spec> <json>   the same on other paths (used by the negative controls)
"""
import hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from plan_lib import SPEC, GOV

OUT = os.path.join(GOV, 'gate_results', 'thresholds.json')

# Numeric values that the adopted column states in plain figures. Each entry names a string that must occur in the adopted text of that row (the check refuses a value
# that the text does not state). Rows that are prose, a count taken from code or UNSET carry value null.
VALUES = {
    'T-Q02-1': ({'max_words': 14}, 'at most 14 words'),
    'T-Q05-1': ({'max_join_m': 1.0}, '1.0 m'),
    'T-Q05-2': ({'rounding_factor': 1.0001}, '1.0001'),
    'T-Q06-1': ({'deployment_s': 90}, '90 s'),
    'T-Q08-1': ({'max_tools': 12}, '12'),
    'T-Q10-1': ({'min_mean': 24, 'of': 255}, '24 of 255'),
    'T-Q10-2': ({'min_p5': 6}, '6'),
    'T-Q10-3': ({'max_share_below': 0.02, 'level': 8}, '2% below 8'),
    'T-Q10-4': ({'min_michelson': 0.2}, '0.2'),
    'T-Q10-5': ({'night_over_day_max': 0.75, 'floor_setting_min_mean': 12}, '0.75; 12'),
    'T-Q10-8': ({'text_ratio': 4.5, 'large_text_ratio': 3.0, 'non_text_ratio': 3.0, 'large_px': 24, 'large_bold_px': 18.66, 'bold_weight': 700}, '4.5:1'),
    'T-Q11-1': ({'max_deg': 0.05}, '0.05 degrees'),
    'T-Q11-2': ({'max_deg': 0.5}, '0.5 degrees'),
    'T-Q11-3': ({'max_min': 2.0}, '2.0 minutes'),
    'T-Q11-4': ({'max_min': 1.0}, '1.0 minute'),
    'T-Q11-5': ({'max_deg': 0.0006}, '0.0006 degrees'),
    'T-Q12-2': ({'min_random_jumps': 100}, 'at least 100'),
    'T-Q13-1': ({'max_ms': 1}, '1 ms'),
    'T-Q15-1': ({'p95_paced_ms': 20}, '20 ms'),
    'T-Q15-2': ({'p95_uncapped_ms': 10}, '10 ms'),
    'T-Q15-3': ({'max_long_task_ms': 50}, '50 ms'),
    'T-Q15-4': ({'max_input_answer_ms': 100}, '100 ms'),
    'T-Q24-1': ({'max_pixel_threshold': 0.1}, 'at most 0.1'),
    'T-Q24-2': ({'max_diff_ratio': 0.002}, 'at most 0.002'),
    'T-OA06-1': ({'min_share': 0.97}, '97%'),
}
STATUS_WORDS = ['ADOPTED-PROVISIONAL', 'RECORDED', 'NOT ADOPTED', 'OWNER FIGURE', 'OWNER', 'UNSET', 'PLAN']


def cells(line):
    s = re.sub(r'`[^`]*`', lambda m: m.group(0).replace('|', '│'), line)
    return [c.strip().replace('│', '|') for c in s.strip().strip('|').split('|')]


def section7(text):
    a = text.index('## 7. Threshold registry')
    b = text.index('## 8. Ambiguity register', a)
    return text[a:b]


def build(spec_text):
    sec = section7(spec_text)
    rows = []
    for line in sec.split('\n'):
        m = re.match(r'^\| (T-[A-Z0-9]+-\d+)(?: \((T-[A-Z0-9]+-\d+)\))? \|', line)
        if not m:
            continue
        c = cells(line)
        assert len(c) == 6, ('a threshold row must have six cells', line[:80])
        tid, alias = m.group(1), m.group(2)
        status_text = c[5]
        words = [w for w in STATUS_WORDS if re.search(r'(?<![A-Z-])' + re.escape(w) + r'(?![A-Z-])', status_text)]
        if 'OWNER FIGURE' in words and 'OWNER' in words:
            words.remove('OWNER')
        row = {'id': tid, 'aliases': [alias] if alias else [], 'gate': c[1], 'plan': c[2], 'in_code': c[3], 'adopted': c[4],
               'status': words, 'status_text': status_text, 'decisions': sorted(set(re.findall(r'DD-[A-Z]+-?\d+', status_text))), 'value': None}
        if tid in VALUES:
            val, must = VALUES[tid]
            assert must in c[4], ('the adopted text of %s does not state %r' % (tid, must), c[4][:120])
            row['value'] = val
        rows.append(row)
    ids = [r['id'] for r in rows]
    assert len(ids) == len(set(ids)), 'duplicate threshold ids'
    assert not (set(VALUES) - set(ids)), ('values for ids that are not rows', sorted(set(VALUES) - set(ids)))
    return {
        'schema': 'bt-thresholds/1',
        'generated_from': 'docs/battle-theatre/GOVERNANCE/gate_results/GATE-SPEC-A.md section 7 (Threshold registry), by spec-a-evidence/gen_thresholds.py; never edited by hand',
        'rule': 'A threshold with the status UNSET makes its gate INCOMPLETE; a value may be tightened by a recorded decision and never loosened without a recorded owner decision (1.8). A row whose value is null states its figure only in words (the adopted text).',
        'section_7_sha256': hashlib.sha256(sec.encode('utf-8')).hexdigest(),
        'count': len(rows),
        'unset': [r['id'] for r in rows if 'UNSET' in r['status']],
        'thresholds': rows,
    }


def dump(obj):
    return json.dumps(obj, indent=1, ensure_ascii=False, sort_keys=True) + '\n'


def main(argv):
    check = '--check' in argv
    rest = [a for a in argv if not a.startswith('--')]
    spec_path = rest[0] if len(rest) > 0 else SPEC
    out_path = rest[1] if len(rest) > 1 else OUT
    want = dump(build(open(spec_path, encoding='utf-8').read()))
    if check:
        have = open(out_path, encoding='utf-8').read() if os.path.exists(out_path) else None
        if have is None:
            print('thresholds.json is missing'); return 1
        if have != want:
            a, b = json.loads(have), json.loads(want)
            ia, ib = {r['id']: r for r in a['thresholds']}, {r['id']: r for r in b['thresholds']}
            diff = sorted(set(ia) ^ set(ib)) + sorted(k for k in set(ia) & set(ib) if ia[k] != ib[k])
            print('thresholds.json differs from section 7: %s' % (', '.join(diff) or 'header only (section hash)')); return 1
        print('thresholds.json equals section 7 (%d thresholds, %d unset)' % (json.loads(have)['count'], len(json.loads(have)['unset']))); return 0
    tmp = out_path + '.tmp'
    open(tmp, 'w', encoding='utf-8').write(want)
    os.replace(tmp, out_path)
    d = json.loads(want)
    print('wrote %s: %d thresholds, %d unset (%s)' % (os.path.relpath(out_path, GOV), d['count'], len(d['unset']), ', '.join(d['unset'])))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
