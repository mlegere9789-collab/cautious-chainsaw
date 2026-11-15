#!/usr/bin/env python3
"""Compare the identifiers that GATE-SPEC-A.md and the reconciliation GATE-SPEC.md use: universal rules (U-nn), ambiguities (A-nn), thresholds
(T-..), delegated decisions (DD-G..), numbered checks (Qnn.k) and requirement-level checks (RC-Rnn.k). Prints one JSON object with, for each kind,
the count in each file and the ids that only one file has. The wording of a line is not compared, only the sets (11.5 of the spec says so).
The derived gates OA-G.. are left out: the reconciliation names a range where this file names each one. Read-only.
Usage: python3 -I compare_ids_with_gate_spec.py [spec-a] [gate-spec]"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plan_lib import SPEC, GOV

a = open(sys.argv[1] if len(sys.argv) > 1 else SPEC, encoding='utf-8').read()
g = open(sys.argv[2] if len(sys.argv) > 2 else os.path.join(GOV, 'gate_results', 'GATE-SPEC.md'), encoding='utf-8').read()
KINDS = {'U': r'\bU-\d\d\b', 'A': r'\bA-\d\d\b', 'T': r'\bT-(?:Q\d\d|OA\d\d)-\d+\b|\bT-SS-1\b', 'DD-G': r'\bDD-G\d\d\b', 'Qnn.k': r'\bQ\d\d\.\d+\b', 'RC': r'\bRC-R\d\d\.\d+\b'}
out = {}
for k, p in KINDS.items():
    sa, sg = set(re.findall(p, a)), set(re.findall(p, g))
    out[k] = {'spec_a': len(sa), 'gate_spec': len(sg), 'only_in_spec_a': sorted(sa - sg), 'only_in_gate_spec': sorted(sg - sa)}
print(json.dumps(out, indent=1))
