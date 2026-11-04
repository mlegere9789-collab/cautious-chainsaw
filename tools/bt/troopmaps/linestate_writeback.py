"""linestate_writeback.py : write the by-eye line-state readings (line_state_readings.json) into the three Bachelder claim files.
Adds/sets in `when`: line_state (first | intermediate | evening | all_day | mixed | unreadable), line_states (list, mixed only),
line_state_basis (what was seen), line_state_crop (crops_state/<id>.png), line_state_read (method tag), printed_clock_near_line
(verbatim, or null). Keeps every other field and value; the earlier values of line_state / line_state_basis / line_state_legend are kept
under when.line_state_prev when they were not null. when.printed, t_iso, t_start_iso, t_end_iso, clock_attachment are never touched.
Frozen copies: positions/_orig_linestate/ (made before this script was first run). Line format is checked to round-trip."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
POS = os.path.join(ROOT, 'docs', 'battle-theatre', 'history', 'positions')
R = json.load(open(os.path.join(ROOT, 'docs', 'battle-theatre', 'terrain', 'troopmaps', 'line_state_readings.json'), encoding='utf-8'))
TAG = 'read by eye 2026-10-30 (LINE-STATES-NOTES.md): native-resolution crop upscaled 5x (Union anchored) / 3.5x (Confederate anchored) / 2.33x (label-only), legend swatches of the same sheet and colour beside; calibration 30 of 30 agree on a blind second read'
PROTECTED = ('printed', 't_iso', 't_start_iso', 't_end_iso', 'clock_attachment', 'date', 'approx', 'description')
for fn in ('troopmap_jul1_b1876.jsonl', 'troopmap_jul2_b1876.jsonl', 'troopmap_jul3_b1876.jsonl'):
    p = os.path.join(POS, fn); orig = os.path.join(POS, '_orig_linestate', fn)
    assert os.path.exists(orig), 'frozen copy missing: ' + orig
    lines = open(orig, encoding='utf-8').read().split('\n'); out = []
    n = 0
    for l in lines:
        if not l: continue
        assert json.dumps(json.loads(l), ensure_ascii=False) == l, 'round-trip failed: ' + l[:60]
        r = json.loads(l); w = r['when']; cid = r['claim_id']; rd = R[cid]
        before = {k: w.get(k) for k in PROTECTED}
        prev = {k: w[k] for k in ('line_state', 'line_state_basis', 'line_state_legend') if w.get(k) is not None}
        if prev: w['line_state_prev'] = prev
        w['line_state'] = rd['line_state']
        w['line_states'] = rd['line_states']
        w['line_state_basis'] = rd['line_state_basis']
        w['line_state_crop'] = f'docs/battle-theatre/terrain/troopmaps/crops_state/{cid}.png'
        w['line_state_read'] = TAG
        w['printed_clock_near_line'] = rd['printed_clock_near_line']
        assert {k: w.get(k) for k in PROTECTED} == before
        out.append(json.dumps(r, ensure_ascii=False)); n += 1
    open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    print(fn, n, 'claims written')
