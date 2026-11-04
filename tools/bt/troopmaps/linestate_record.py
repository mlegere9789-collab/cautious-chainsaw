"""linestate_record.py : append by-eye line-state readings (stdin, one per line) to docs/battle-theatre/terrain/troopmaps/line_state_readings.json.
Line format:  claim_id | state | basis | printed clock near the line (or -)
state: first | intermediate | evening | all_day | mixed:first+evening | unreadable
Existing readings for the same claim id are overwritten (later read wins); the file is the running record of the pass."""
import sys, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
P = os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'troopmaps', 'line_state_readings.json')
d = json.load(open(P, encoding='utf-8')) if os.path.exists(P) else {}
n = 0
for line in sys.stdin:
    line = line.strip()
    if not line or line.startswith('#'): continue
    cid, state, basis, clock = [x.strip() for x in line.split('|')]
    states = None
    if state.startswith('mixed:'): states = state[6:].split('+'); state = 'mixed'
    assert state in ('first', 'intermediate', 'evening', 'all_day', 'mixed', 'unreadable'), line
    d[cid] = {'line_state': state, 'line_states': states, 'line_state_basis': basis, 'printed_clock_near_line': None if clock == '-' else clock}
    n += 1
json.dump(d, open(P, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
print(n, 'recorded;', len(d), 'total')
