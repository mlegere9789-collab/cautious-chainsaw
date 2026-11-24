"""Mutation check of the Q01, Q14 and Q20 runners (GATE-SPEC U-25, K11: a gate must be able to fail).

    python3 tests/governance/gates/mutation_check.py [label prefix]

Mutation check of the runners: each mutation disables or inverts one check in a COPY of tools/bt/gates; the unit tests of the gate must go red (a test that stays green would not catch the defect)."""
import os, shutil, subprocess, sys, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SRC = os.path.join(ROOT, 'tools', 'bt', 'gates')
MUT = [
 # (file, test module, old, new, label)
 ('q01_oob.py', 'test_q01', "mk(rec, ctx, 'Q01.2', uid, 'default', 'FAIL', 'layer unit %s is not in the table", "mk(rec, ctx, 'Q01.2', uid, 'default', 'PASS', 'layer unit %s is not in the table", 'Q01.2 layer unit not in table passes'),
 ('q01_oob.py', 'test_q01', "mk(rec, ctx, 'Q01.2', tid, 'default', 'FAIL', 'table unit %s is missing from the layer", "mk(rec, ctx, 'Q01.2', tid, 'default', 'PASS', 'table unit %s is missing from the layer", 'Q01.2 table unit missing passes'),
 ('q01_oob.py', 'test_q01', "cond('brigade assignment (parent) equal', (t.get('parent') or None) == (u['parent'] or None)", "cond('brigade assignment (parent) equal', True", 'Q01.2 parent ignored'),
 ('q01_oob.py', 'test_q01', "cond('the record puts the unit off the field: never drawn', not u['drawn'] and", "cond('the record puts the unit off the field: never drawn', True or not u['drawn'] and", 'Q01.2 off-field drawn ignored'),
 ('q01_oob.py', 'test_q01', "cond('the layer figure lies in a verified range', bool(inside)", "cond('the layer figure lies in a verified range', True", 'Q01.3 range ignored'),
 ('q01_oob.py', 'test_q01', "cond('same basis: the layer names the basis key or cites a source of the table row', bool(matching)", "cond('same basis: the layer names the basis key or cites a source of the table row', True", 'Q01.3 basis ignored'),
 ('q01_oob.py', 'test_q01', "conds.append(cond('no range is collapsed: the layer carries the table range', bool(carried)", "conds.append(cond('no range is collapsed: the layer carries the table range', True", 'Q01.3 collapse ignored'),
 ('q01_oob.py', 'test_q01', "cond('the layer sum lies inside the sum of the table ranges of one kind (a range that spans dates only on the figure of the date the layer names, never on its wide span)', bool(inside_leaf)", "cond('the layer sum lies inside the sum of the table ranges of one kind (a range that spans dates only on the figure of the date the layer names, never on its wide span)', True", 'Q01.4 sum ignored'),
 ('q01_oob.py', 'test_q01', "cond('the army total lies inside the verified total', bool(inside_own)", "cond('the army total lies inside the verified total', True", 'Q01.4 army total ignored'),
 ('q01_oob.py', 'test_q01', "cond('an arrivals record exists', a is not None", "cond('an arrivals record exists', True", 'Q01.5 missing record ignored'),
 ('q01_oob.py', 'test_q01', "and e <= d <= l, 'earliest %s, default %s, latest %s'", "and True, 'earliest %s, default %s, latest %s'", 'Q01.5 window order ignored'),
 ('q01_oob.py', 'test_q01', "cond('sources: at least one, and every key resolves in the layer\\'s source list', bool(ks) and not bad", "cond('sources: at least one, and every key resolves in the layer\\'s source list', True", 'Q01.5 sources ignored'),
 ('q01_oob.py', 'test_q01', "cond('place: the arrivals record gives the entry place', bool(a.get('entry'))", "cond('place: the arrivals record gives the entry place', True", 'Q01.5 place ignored'),
 ('q01_oob.py', 'test_q01', "cond('rendered instances equal the present strength', v['rendered_when_present'] == exp", "cond('rendered instances equal the present strength', True", 'Q01.6 instances ignored'),
 ('q01_oob.py', 'test_q01', "cond('at every grid time evaluated the rendered count equals the present strength', not v['violations'] and not v.get('n_violations')", "cond('at every grid time evaluated the rendered count equals the present strength', True", 'Q01.6 violations ignored'),
 ('q01_oob.py', 'test_q01', "        if hits:\n            rec.item('Q01/Q01.6/cap-scan/default', 'FAIL'", "        if False:\n            rec.item('Q01/Q01.6/cap-scan/default', 'FAIL'", 'Q01.6 cap hits ignored'),
 ('q01_oob.py', 'test_q01', "cond('every commander of the table (by order of succession) is in the layer', not missing", "cond('every commander of the table (by order of succession) is in the layer', True", 'Q01.7 commander ignored'),
 ('q01_oob.py', 'test_q01', "cond('the layer holds the commander', False,", "cond('the layer holds the commander', True,", 'Q01.7 no commander ignored'),
 ('q01_oob.py', 'test_q01', "if src_is_lead(ln.get('source_id'), reg):", "if False:", 'Q01.1 lead source accepted'),
 ('q01_oob.py', 'test_q01', "        if len(str(q).split()) > max_words:", "        if False:", 'Q01.1 long quote accepted'),
 ('q01_oob.py', 'test_q01', "    if not ss.get('complete'):\n        rec.incomplete('scenario set", "    if False:\n        rec.incomplete('scenario set", 'Q01 incomplete scenario set ignored'),
 ('q01_oob.py', 'test_q01', "        elif T is None:\n            mk(rec, ctx, 'Q01.5', uid, 'default', 'BLOCKED-INPUT'", "        elif T is None:\n            mk(rec, ctx, 'Q01.5', uid, 'default', 'PASS'", 'Q01.5 without table passes'),
 ('q14_ordnance.py', 'test_q14', "elif mx > ceil:\n                rec.item(iid, 'FAIL'", "elif False:\n                rec.item(iid, 'FAIL'", 'Q14.4 rate above ceiling ignored'),
 ('q14_ordnance.py', 'test_q14', "if any(a == 'found' and b == 'found' for a, b in res):", "if True:", 'Q14.2 ocr re-match ignored'),
 ('q14_ordnance.py', 'test_q14', "        if not found:\n            rec.item(sid, 'FAIL', 'the product prints", "        if False:\n            rec.item(sid, 'FAIL', 'the product prints", 'Q14.2 unprinted range ignored'),
 ('q14_ordnance.py', 'test_q14', "        if bad_c:\n            rec.item(sid, 'FAIL', 'ballistics: '", "        if False:\n            rec.item(sid, 'FAIL', 'ballistics: '", 'Q14.2 inverse ignored'),
 ('q14_ordnance.py', 'test_q14', "        if ok:\n            rec.item('Q14/Q14.2/%s/gap' % tid, 'COVERED'", "        if True:\n            rec.item('Q14/Q14.2/%s/gap' % tid, 'COVERED'", 'Q14.2 gap always covered'),
 ('q14_ordnance.py', 'test_q14', "if lo <= have <= hi:", "if True:", 'Q14.5 army total ignored'),
 ('q14_ordnance.py', 'test_q14', "ok = any(r['low'] <= have <= r['high'] for s_, r in st.items() if s_ in ('present', 'engaged'))", "ok = True", 'Q14.5 table count ignored'),
 ('q14_ordnance.py', 'test_q14', "cond('the guns the world draws equal the count the layer states', (g['status'] != 'drawn') or b['world']['guns'] == g['count']", "cond('the guns the world draws equal the count the layer states', True", 'Q14.5 world guns ignored'),
 ('q14_ordnance.py', 'test_q14', "elif e['shots'] > ceiling:", "elif False:", 'Q14.6 expenditure ignored'),
 ('q14_ordnance.py', 'test_q14', "cond('the product offers the crew size as a selectable scenario value (the crew posts differ with the choice)', bool(D['crew'].get('selectable'))", "cond('the product offers the crew size as a selectable scenario value (the crew posts differ with the choice)', True", 'Q14.7 crew selectable ignored'),
 ('q14_ordnance.py', 'test_q14', "if miss or any(v == 'no_item' for v in res.values()):", "if False:", 'Q14.7 posts ignored'),
 ('q14_ordnance.py', 'test_q14', "conds.append(cond('a documented tier needs a claim support that this run can re-match: a manual item (drill/*.json) that confirms it', bool(ok_items) and not bool(row.get('weak_source'))", "conds.append(cond('a documented tier needs a claim support that this run can re-match: a manual item (drill/*.json) that confirms it', True", 'Q14.1 documented support ignored'),
 ('q14_ordnance.py', 'test_q14', "if row is None:\n            rec.item(sid, 'FAIL', 'the product can fire", "if False:\n            rec.item(sid, 'FAIL', 'the product can fire", 'Q14.1 missing row ignored'),
 ('q14_ordnance.py', 'test_q14', "        if r_ in want:\n            rec.item(iid, 'PASS'", "        if True:\n            rec.item(iid, 'PASS'", 'Q14.3 round band ignored'),
 ('q20_cavalry.py', 'test_q20', "elif not u['drawn']:\n            mk('Q20.2', uid, 'default', 'FAIL'", "elif False:\n            mk('Q20.2', uid, 'default', 'FAIL'", 'Q20.2 undrawn ignored'),
 ('q20_cavalry.py', 'test_q20', "any(r != 'private' for r in (f.get('rank') or {}))", "True", 'Q20.3 officers ignored'),
 ('q20_cavalry.py', 'test_q20', "cond('a manifest exists for every one of the %d figures' % n, f.get('with_manifest') == n and bool(s)", "cond('a manifest exists for every one of the %d figures' % n, True", 'Q20.3 manifest coverage ignored'),
 ('q20_cavalry.py', 'test_q20', "cond('one horse for every drawn trooper (the point of the horse range is the number of riders)', (hz.get('horses') or {}).get('point') == n and (u['world'] or {}).get('mounted') == n", "cond('one horse for every drawn trooper (the point of the horse range is the number of riders)', True", 'Q20.4 horses ignored'),
 ('q20_cavalry.py', 'test_q20', "cond('its gap is a register entry that is open, complete and has a dated search log (a gap passes only as a flagged value, GATE-SPEC Q20)', ok_gap", "cond('its gap is a register entry that is open, complete and has a dated search log (a gap passes only as a flagged value, GATE-SPEC Q20)', True", 'Q20.4 gap register ignored'),
 ('q20_cavalry.py', 'test_q20', "cond('Spencers only in the 5th Michigan (all) and the 6th Michigan (part), from July 3', (not spen) or", "cond('Spencers only in the 5th Michigan (all) and the 6th Michigan (part), from July 3', True or", 'Q20.5 spencer ignored'),
 ('q20_cavalry.py', 'test_q20', "cond('no Henry', not henry", "cond('no Henry', True", 'Q20.5 henry ignored'),
 ('q20_cavalry.py', 'test_q20', "elif gait.get('exit') != 0 or gait.get('fail'):", "elif False:", 'Q20.6 gait failure ignored'),
 ('q20_cavalry.py', 'test_q20', "elif gait.get('skipped') or gait.get('cancelled')", "elif False and gait.get('cancelled')", 'Q20.6 skipped gait test passes'),
 ('q20_cavalry.py', 'test_q20', "cond('every state of B.6.15.7 is in the kit list', not miss_kit", "cond('every state of B.6.15.7 is in the kit list', True", 'Q20.6 kit states ignored'),
 ('q20_cavalry.py', 'test_q20', "        elif K.get('actions') is None:\n            mk('Q20.2', uid, 'default', 'BLOCKED-INPUT'", "        elif K.get('actions') is None:\n            mk('Q20.2', uid, 'default', 'PASS'", 'Q20.2 without action table passes'),
 ('q20_cavalry.py', 'test_q20', "arr.get('default') is not None and arr['default'] <= first['start_latest']", "True", 'Q20.2 late arrival ignored'),
 ('q20_cavalry.py', 'test_q20', "arr.get('earliest') is not None and arr['earliest'] >= r['start_earliest']", "True", 'Q20.2 early arrival ignored'),
 ('q20_cavalry.py', 'test_q20', "if kid not in seen_cards:", "if False:", 'Q20.1 unmatched card ignored'),
]
only = sys.argv[1] if len(sys.argv) > 1 else None
res = []
for fn, tm, old, new, label in MUT:
    if only and not label.startswith(only): continue
    d = tempfile.mkdtemp(prefix='gate-mutation-')
    shutil.copytree(SRC, d, dirs_exist_ok=True)
    p = os.path.join(d, fn); s = open(p, encoding='utf-8').read()
    if old not in s:
        res.append((label, 'MUTATION NOT APPLICABLE (text not found)')); continue
    open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
    env = dict(os.environ, BT_GATES_DIR=d, PYTHONDONTWRITEBYTECODE='1')
    # only the synthetic classes: the real-data classes need the node children (they run against the unmutated python anyway)
    classes = {'test_q01': ['CleanFixture', 'TableMissing', 'UnitSet', 'Strength', 'StrengthOneCondition', 'Rollups', 'Presence', 'OneToOne', 'Commanders', 'TableItself'],
               'test_q14': ['CleanFixture', 'WeaponsTable', 'Ranges', 'Bands', 'Rates', 'Counts', 'Expenditure', 'Crew'],
               'test_q20': ['CleanFixture', 'TheSet', 'Times', 'Manifest', 'Horses', 'Arms', 'States']}[tm]
    cmd = [sys.executable, '-m', 'unittest', 'discover', '-s', os.path.join(ROOT, 'tests/governance/gates'), '-p', tm + '.py'] + sum([['-k', c] for c in classes], [])
    r = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=ROOT)
    tail = (r.stderr.strip().splitlines() or [''])[-1]
    res.append((label, 'CAUGHT (red: %s)' % tail if r.returncode != 0 else 'NOT CAUGHT (tests stayed green)'))
    shutil.rmtree(d, ignore_errors=True)
w = max(len(l) for l, _ in res)
for l, r in res: print(l.ljust(w), '|', r)
n_ok = sum(1 for _, r in res if r.startswith('CAUGHT'))
print('caught', n_ok, 'of', len(res))
sys.exit(0 if n_ok == len(res) else 1)
