#!/usr/bin/env python3
"""Say whether the six read-only checks of GATE-SPEC-A.md are clean, by exit code (0 clean, 1 a problem), so that a run and a negative
control can tell a defect from a pass. The checks themselves only print JSON.
Usage:
  python3 -I report_problems.py <check> [path-to-spec]   run one check (check_counts, check_structure, check_gate_parts, check_paths, check_pages, check_quotes)
                                                         on the spec (default: the spec) and report its problems
  python3 -I report_problems.py --saved [suffix]         read the saved outputs <check>_<suffix>.out (default v4) written by run_all_checks.sh
A soft count that is STALE (check_counts.py) is listed and is not a problem; a run that writes a revision must end with none.
Read-only."""
import json, os, subprocess, sys

H = os.path.dirname(os.path.abspath(__file__))
CHECKS = ['check_counts', 'check_structure', 'check_gate_parts', 'check_paths', 'check_pages', 'check_quotes']


def json_lines(text):
    return [l for l in text.split('\n') if l.startswith('{')]


def problems(check, text):
    """The problems that the output of one check reports; empty when it is clean."""
    out = []
    try:
        if check == 'check_counts':
            j = json.loads(json_lines(text)[-1])
            out += ['mismatch: ' + m for m in j.get('mismatched', [])]
        elif check == 'check_structure':
            j = json.loads(text)
            out += ['table row with a wrong cell count: %s' % (x,) for x in j['rows_with_wrong_cell_count']]
            out += ['cross-reference with no definition: %s' % x for x in j['cross_refs_not_defined_by_a_heading_or_row']]
            out += ['gate text: %s' % (x,) for x in j['gate_text_problems']]
            if j['gate_texts_verbatim_on_p136_and_in_gates_json'] != 28:
                out.append('gate texts verbatim on p. 136 and in gates.json: %d of 28' % j['gate_texts_verbatim_on_p136_and_in_gates_json'])
        elif check == 'check_gate_parts':
            j = json.loads(json_lines(text)[0])
            out += ['gate section %s lacks %s' % (g, ', '.join(m)) for g, m in j['with_problems'].items()]
            if j['gate_sections'] != 28:
                out.append('%d gate sections, not 28' % j['gate_sections'])
        elif check == 'check_paths':
            j = json.loads(json_lines(text)[0])
            if j['not_found']:
                out += [l for l in text.split('\n') if l.startswith('NOT FOUND')] or ['%d paths not found' % j['not_found']]
        elif check == 'check_pages':
            j = json.loads(json_lines(text)[-1])
            if j['mismatches']:
                out.append('%d page citations with a section label that is not on the cited page' % j['mismatches'])
        elif check == 'check_quotes':
            j = json.loads(json_lines(text)[0])
            for k in ('wrong_page', 'not_in_plan', 'no_page_cited_not_in_plan'):
                if j[k]:
                    out.append('%d quotations: %s' % (j[k], k))
        else:
            out.append('unknown check ' + check)
    except Exception as e:                      # an output that cannot be read is a problem, never a pass
        out.append('output of %s unreadable: %s' % (check, e))
    return out


def stale_of(text):
    try:
        return json.loads(json_lines(text)[-1]).get('stale', [])
    except Exception:
        return []


def main(argv):
    if argv and argv[0] == '--saved':
        suf = argv[1] if len(argv) > 1 else 'v4'
        bad = {}
        stale = []
        for c in CHECKS:
            text = open(os.path.join(H, '%s_%s.out' % (c, suf)), encoding='utf-8').read()
            p = problems(c, text)
            if p:
                bad[c] = p
            if c == 'check_counts':
                stale = stale_of(text)
        print(json.dumps({'clean': not bad, 'problems': bad, 'stale_soft_counts': stale}))
        return 1 if bad else 0
    check = argv[0]
    spec = argv[1:]                              # [] means the default spec of the script
    r = subprocess.run([sys.executable, '-I', os.path.join(H, check + '.py')] + spec, capture_output=True, text=True)
    p = problems(check, r.stdout)
    print(json.dumps({'check': check, 'problems': p, 'stale_soft_counts': stale_of(r.stdout) if check == 'check_counts' else []}))
    return 1 if p else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
