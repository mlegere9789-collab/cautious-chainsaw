"""Mutation check of the Q03 runner (GATE-SPEC U-25, K11: a gate must be able to fail).

    python3 tests/governance/gates/mutation_check_q03.py [label prefix]

Each mutation disables or inverts ONE check in a COPY of tools/bt/gates (q03_anachronism.py or q03_structures.py); the tests that name that check must then go red. A mutation whose tests stay green would
mean that no test catches the defect the check exists for. The copy sits in a scratch tree that links the rest of tools/bt, so the validators (check_kit.py, check_structures.py, ...) are the real ones.
"""
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SRC = os.path.join(ROOT, 'tools', 'bt', 'gates')
TESTS = os.path.join(ROOT, 'tests', 'governance', 'gates', 'test_q03.py')
K, F, D, V, S, M, P, VH, R, I = 'KitClasses', 'Flags', 'Drawn', 'Validity', 'Structures', 'Modern', 'PreExisting', 'Vehicles', 'Regression', 'InputMissing'
A, ST = 'q03_anachronism.py', 'q03_structures.py'
MUT = [
    # (file, tests that must go red, text to find (exactly once), replacement, label)
    (A, [K + '.test_class2_henry_rifle_in_a_spec'], "rec.item('Q03/Q03.1/kit-specs', 'FAIL', '%d data ERROR(s)", "rec.item('Q03/Q03.1/kit-specs', 'PASS', '%d data ERROR(s)", 'Q03.1 data errors in the kit specs pass'),
    (A, [K + '.test_class2_zouave_dress_on_a_unit_that_is_not_zouave'], "    if st.fail:\n        reasons.append('%d FAIL finding(s)", "    if False:\n        reasons.append('%d FAIL finding(s)", 'Q03.1 FAIL findings of the validator ignored'),
    (A, [K + '.test_class6_a_manifest_that_is_not_reproducible'], "    if st.repro[1]:\n        reasons.append('class 6", "    if False:\n        reasons.append('class 6", 'Q03.1 class 6 reproducibility ignored'),
    (A, [K + '.test_an_absent_unit_the_validator_does_not_refuse_is_fail'], "        if refused and 'PRESENCE_ABSENT_UNIT' in codes:", "        if True:", 'Q03.1 absent unit not refused still passes'),
    (A, [F + '.test_flag_with_no_register_entry_is_fail'], "        if not ids:\n            reasons.append('no register entry names this flag class", "        if False:\n            reasons.append('no register entry names this flag class", 'Q03.1 flag with no register entry passes'),
    (A, [F + '.test_flag_whose_register_entry_has_no_owner_question_is_fail', F + '.test_flag_whose_register_entry_is_closed_is_fail'], "            bad = [s for s in states if not (s['open'] and s['fields_ok'] and s['owner_q_ok'])]", "            bad = []", 'Q03.1 incomplete or closed register entry accepted'),
    (A, [F + '.test_flag_the_card_does_not_show_is_fail'], "        if re.search(r'Object\\.entries\\(\\s*s\\.flags\\s*\\)', self.card_text):", "        if True:", 'Q03.1 flag the card does not show accepted'),
    (A, [F + '.test_flagged_unit_passes_when_marked_and_registered'], "            if code in st.unmarked:\n                flag_reasons.append", "            if True:\n                flag_reasons.append", 'Q03.1 flag marker rule always fails (control: clean flagged unit must pass)'),
    (A, [D + '.test_the_apps_port_makes_other_manifests_is_fail'], "                if not same:\n                    st.repro[1] += 1", "                if False:\n                    st.repro[1] += 1", 'Q03.1 digest of the app port ignored'),
    (A, [D + '.test_a_figure_drawn_before_its_unit_arrives_is_fail'], "findings = CK.validate_manifest(m, presence_fn=pres, kit=kit)", "findings = CK.validate_manifest(m, presence_fn=None, kit=kit)", 'Q03.1 presence test not bound to the arrival gate'),
    (A, [D + '.test_a_shell_gate_earlier_than_the_arrival_checker_is_fail'], "                    if not cond:\n                        st.fail[key]", "                    if False:\n                        st.fail[key]", 'Q03.1 shell gate earlier than the checker ignored'),
    (A, [D + '.test_a_drawn_unit_from_a_kit_unit_the_kit_does_not_have_is_fail'], "        if ku not in kit.units:\n            rec.item('Q03/Q03.1/drawn/%s' % hid, 'FAIL'", "        if False:\n            rec.item('Q03/Q03.1/drawn/%s' % hid, 'FAIL'", 'Q03.1 drawn unit with no kit unit ignored'),
    (A, [D + '.test_dress_the_unit_wears_on_its_first_day_that_is_not_valid_on_a_later_day_it_is_still_drawn_is_fail'], "            if lost_later:\n                st.fail['DRESS_INVALID_ON_A_LATER_DAY']", "            if False:\n                st.fail['DRESS_INVALID_ON_A_LATER_DAY']", 'Q03.2 dress valid on the first day only ignored'),
    (A, [V + '.test_k9_census_fails_for_items_without_a_validity'], "    if members:\n        rec.item('Q03/Q03.2/validity-census', 'FAIL'", "    if False:\n        rec.item('Q03/Q03.2/validity-census', 'FAIL'", 'Q03.2 K.9 census ignored'),
    (A, [V + '.test_a_spec_entry_that_is_hardly_ever_drawn_is_still_validated_on_every_day'], "        if bad or empties or entry_fails:\n            rec.item('Q03/Q03.2/date/%s' % date, 'FAIL'", "        if bad or empties:\n            rec.item('Q03/Q03.2/date/%s' % date, 'FAIL'", 'Q03.2 one-by-one scan of the spec entries ignored'),
    (A, [V + '.test_a_field_with_no_item_valid_on_a_day_is_fail'], "        if bad or empties or entry_fails:\n            rec.item('Q03/Q03.2/date/%s' % date, 'FAIL'", "        if False:\n            rec.item('Q03/Q03.2/date/%s' % date, 'FAIL'", 'Q03.2 day with no valid item ignored'),
    (A, [V + '.test_stars_follow_the_statute_or_fail'], "        elif want != have:", "        elif False:", 'Q03.2 star count against the statute ignored'),
    (A, [V + '.test_anv_star_count_is_12_or_13'], "        if n in (12, 13) and built:", "        if True:", 'Q03.2 ANV star count ignored'),
    (A, [V + '.test_epilogue_days_without_a_manifest_are_blocked'], "        if not kit_units and not drawn:", "        if False:", 'Q03.2 empty epilogue domain not blocked'),
    (A, [R + '.test_the_5th_ny_named_in_the_roster_is_fail', R + '.test_the_5th_ny_drawn_is_fail', K + '.test_absent_unit_that_the_kit_lets_through_is_fail'], "        good = (ku is None or (ku['presence']['status'] != 'present_at_gettysburg' and refused)) and not named and not drawn5", "        good = True", 'Q03.6 5th NY regression ignored'),
    (A, [R + '.test_140th_ny_zouave_item_in_the_regulation_blue_variant_is_fail'], "not zou_in_blue and not default_chosen", "True and not default_chosen", 'Q03.6 140th NY Zouave item in blue variant ignored'),
    (A, [R + '.test_140th_ny_without_its_variants_is_fail'], "    if k140 is None or not k140.get('variants'):\n        item('140th-ny-regulation-blue', False", "    if False:\n        item('140th-ny-regulation-blue', False", 'Q03.6 140th NY without variants ignored'),
    (A, [R + '.test_146th_zouave_dress_that_the_validator_no_longer_refuses_before_3_june_is_fail', R + '.test_114th_pa_headgear_that_is_not_zouave_is_fail'], "item('146th-ny-and-114th-pa-zouave', not bad,", "item('146th-ny-and-114th-pa-zouave', True,", 'Q03.6 Zouave regression ignored'),
    (A, [R + '.test_a_spencer_on_bufords_line_is_fail'], "        good = not in_spec and not in_manifest and not (set(buford) & set(allowed_units))", "        good = True", 'Q03.6 Spencer on Buford ignored'),
    (A, [R + '.test_the_devils_den_record_with_another_date_is_fail', R + '.test_the_devils_den_record_that_is_not_staged_is_fail'], "        good = v.get('photo_date') == '1863-07-06' and v.get('staged') is True and 'sharpshooter' in (scene.get('rule') or '').lower()", "        good = True", "Q03.6 Devil's Den regression ignored"),
    (A, [R + '.test_a_louisiana_regiment_with_zouave_dress_is_fail', R + '.test_a_louisiana_regiment_that_no_longer_forbids_zouave_dress_is_fail'], "item('louisiana-regiments-ordinary-anv-infantry', not bad,", "item('louisiana-regiments-ordinary-anv-infantry', True,", 'Q03.6 Louisiana regression ignored'),
    (A, [R + '.test_cope_survey_dated_to_july_is_fail', R + '.test_cope_survey_row_missing_is_fail'], "        good = cope is not None and re.search(r'August to October 1863', cope.get('name', '')) is not None and not july", "        good = True", 'Q03.6 Cope survey regression ignored'),
    (ST, [R + '.test_mcpherson_barn_burning_on_1_july_is_fail', R + '.test_mcpherson_row_no_longer_saying_the_barn_is_intact_is_fail'], "item('mcpherson-barn-not-burned-1-july', not bad and not mismatch and row_ok,", "item('mcpherson-barn-not-burned-1-july', True,", 'Q03.6 McPherson barn regression ignored'),
    (ST, [R + '.test_bliss_buildings_burning_on_2_july_is_fail', R + '.test_bliss_that_never_burns_is_fail', R + '.test_bliss_row_that_no_longer_names_the_14th_connecticut_is_fail'], "item('bliss-burned-3-july-morning', row_ok and not bad and not mismatch,", "item('bliss-burned-3-july-morning', True,", 'Q03.6 Bliss regression ignored'),
    (ST, [R + '.test_the_angle_wall_under_construction_is_fail'], "        if bad:\n            item('angle-wall-pre-existing', False", "        if False:\n            item('angle-wall-pre-existing', False", 'Q03.6 Angle wall regression ignored'),
    (ST, [S + '.test_mass_known_only_from_the_1868_survey_is_fail', S + '.test_object_with_no_state_schedule_is_fail'], "    ok = res['registry'] and res['start'] and res['end'] and res['schedule'] and not o.get('dropped') and not probs", "    ok = True", 'Q03.3 object conditions ignored'),
    (ST, [S + '.test_building_that_represents_a_later_building_is_fail_whatever_its_date'], "    if reps.startswith('later building'):\n        problems.append('the drawn geometry is a later building", "    if False:\n        problems.append('the drawn geometry is a later building", 'Q03.3 later-building representation ignored'),
    (ST, [S + '.test_an_object_the_record_says_is_not_drawn_but_the_scene_draws_is_fail'], "    if str(status or '').startswith('not_drawn') and not o.get('dropped'):", "    if False:", 'Q03.3 object said to be not drawn but drawn ignored'),
    (ST, [S + '.test_building_the_build_note_calls_later_is_fail'], "\n    elif built and LATER.search(built):\n        problems.append", "\n    elif False:\n        problems.append", 'Q03.3 build note calling the building later ignored'),
    (ST, [S + '.test_object_the_registry_does_not_call_present_in_1863_is_fail'], "    if props is not None and props.get('present_1863') is not True:", "    if False:", 'Q03.3 registry present_1863 false ignored'),
    (ST, [S + '.test_building_destroyed_in_1863_with_no_row_is_fail'], "    if status == 'destroyed_1863':\n        if not rows:", "    if False:\n        if not rows:", 'Q03.3 destruction in 1863 with no schedule row ignored'),
    (ST, [S + '.test_a_barn_that_is_gone_in_the_window_is_fail', S + '.test_a_house_the_engine_removes_is_fail'], "            if bad:\n                rec.item(iid, 'FAIL', '%s must stand throughout the window", "            if False:\n                rec.item(iid, 'FAIL', '%s must stand throughout the window", 'Q03.3 object that does not stand throughout ignored'),
    (ST, [S + '.test_a_hospital_with_no_closing_window_is_fail'], "        if not cw or not (cw[0] or cw[1]):", "        if False:", 'Q03.3 hospital with no closing window ignored'),
    (ST, [S + '.test_the_record_that_does_not_say_pre_existing_is_fail'], "        if not start_ok:\n            reasons.append('the record does not say", "        if False:\n            reasons.append('the record does not say", 'Q03.3 record that is not pre-existing ignored'),
    (ST, [M + '.test_class_absent_in_1863_is_fail'], "            if v and MODERN_CLASS.search(str(v)):", "            if False:", 'Q03.4 class absent in 1863 ignored'),
    (ST, [S + '.test_building_built_after_1863_is_fail_in_q033_and_q034'], "        if d['bad']:\n            rec.item('Q03/Q03.4/registry/%s' % cls, 'FAIL'", "        if False:\n            rec.item('Q03/Q03.4/registry/%s' % cls, 'FAIL'", 'Q03.4 registry failures ignored'),
    (ST, [M + '.test_a_drawn_road_that_is_an_avenue_is_fail', M + '.test_the_engine_placing_an_avenue_is_fail'], "    if bad:\n        rec.item('Q03/Q03.4/avenues', 'FAIL'", "    if False:\n        rec.item('Q03/Q03.4/avenues', 'FAIL'", 'Q03.4 avenue ignored'),
    (ST, [M + '.test_the_memorial_layer_adding_a_scene_object_is_fail'], "    if bad:\n        rec.item('Q03/Q03.4/memorial-layer', 'FAIL'", "    if False:\n        rec.item('Q03/Q03.4/memorial-layer', 'FAIL'", 'Q03.4 memorial layer in the scene ignored'),
    (ST, [M + '.test_the_disclosure_that_the_ground_is_modern_is_not_a_pass'], "    elif re.search(r'modern (landscape|ground|terrain|aerial)|not the 1863 landscape', note, re.I):", "    elif False:", 'Q03.4 ground disclosure accepted as a pass'),
    (ST, [M + '.test_the_page_loading_an_uncorrected_layer_is_fail', M + '.test_unhandled_modern_features_are_fail', M + '.test_a_feature_with_no_correction_record_is_fail', M + '.test_an_unclassified_layer_is_fail'], "    ev = {'layers': [L.get('id') for L in lays], 'modern_features': n_feat, 'page_loads'", "    bad = []\n    ev = {'layers': [L.get('id') for L in lays], 'modern_features': n_feat, 'page_loads'", 'Q03.4 ground audit conditions ignored'),
    (ST, [M + '.test_no_ground_audit_is_blocked_input'], "    if not os.path.isfile(audit_fn):\n        rec.item(iid, 'BLOCKED-INPUT'", "    if False:\n        rec.item(iid, 'BLOCKED-INPUT'", 'Q03.4 missing ground audit not blocked'),
    (ST, [P + '.test_a_construction_state_is_fail', P + '.test_not_present_at_the_first_minute_is_fail'], "                if r.get('present') is False or is_construction(r.get('state'), r.get('stage')):", "                if False:", 'Q03.5 construction state ignored'),
    (ST, [P + '.test_not_present_at_the_first_minute_is_fail'], "            if not first or first.get('present') is not True:", "            if False:", 'Q03.5 not present at frame one ignored'),
    (ST, [P + '.test_a_pre_existing_feature_in_the_list_of_works_is_fail'], "            if pid in work_ids or pid in (w3.get('pre_ids_in_works') or []):", "            if False:", 'Q03.5 pre-existing feature among the works ignored'),
    (ST, [P + '.test_a_record_that_allows_construction_is_fail'], "        if s.get('construction') not in (None, {}, []) or s.get('construction_animation_allowed') is True:", "        if False:", 'Q03.5 record that allows construction ignored'),
    (ST, [P + '.test_without_the_draw_lists_the_items_are_blocked_not_passed'], "            bad_missing = 'the draw lists of src/structures/works3d.mjs", "            bad = [x for x in bad]\n            bad_missing = 'the draw lists of src/structures/works3d.mjs", 'Q03.5 (control) '),
    (ST, [VH + '.test_a_vehicle_type_with_no_validity_is_fail', VH + '.test_a_vehicle_type_of_the_other_army_is_fail', VH + '.test_a_type_with_no_record_at_all_is_fail'], "            if bad:\n                rec.item(iid, 'FAIL', 'the %s drawn for the %s army", "            if False:\n                rec.item(iid, 'FAIL', 'the %s drawn for the %s army", 'Q03.7 vehicle validity and army ignored'),
    (ST, [S + '.test_without_the_model_the_objects_are_blocked_not_passed'], "    if inp.d3 is None or inp.registry is None or not mdl or not eng:", "    if False:", 'Q03.3 missing model not blocked'),
]
# the last (control) mutation changes nothing that a test can see; it is dropped: a mutation must change behaviour
MUT = [m for m in MUT if m[4] != 'Q03.5 (control) ']
only = sys.argv[1] if len(sys.argv) > 1 else None


def farm(dst):
    """A scratch tools/bt whose entries link to the real ones, except gates/, which is a copy."""
    os.makedirs(os.path.join(dst, 'tools', 'bt'))
    real = os.path.join(ROOT, 'tools', 'bt')
    for name in os.listdir(real):
        if name == 'gates':
            continue
        os.symlink(os.path.join(real, name), os.path.join(dst, 'tools', 'bt', name))
    shutil.copytree(SRC, os.path.join(dst, 'tools', 'bt', 'gates'), ignore=shutil.ignore_patterns('__pycache__'))
    return os.path.join(dst, 'tools', 'bt', 'gates')


res = []
for fn, tests, old, new, label in MUT:
    if only and not label.startswith(only):
        continue
    d = tempfile.mkdtemp(prefix='q03-mutation-')
    try:
        gates = farm(d)
        p = os.path.join(gates, fn)
        s = open(p, encoding='utf-8').read()
        if s.count(old) != 1:
            res.append((label, 'MUTATION NOT APPLICABLE (text found %d times)' % s.count(old)))
            continue
        open(p, 'w', encoding='utf-8').write(s.replace(old, new, 1))
        env = dict(os.environ, GATES_DIR=gates, PYTHONDONTWRITEBYTECODE='1')
        r = subprocess.run([sys.executable, TESTS] + tests, capture_output=True, text=True, env=env, cwd=ROOT)
        tail = [ln for ln in (r.stderr.strip().splitlines() or ['']) if ln.startswith(('FAILED', 'OK', 'Ran'))][-1:]
        res.append((label, ('CAUGHT (red: %s)' % ' '.join(tail)) if r.returncode != 0 else 'NOT CAUGHT (tests stayed green)'))
    finally:
        shutil.rmtree(d, ignore_errors=True)
w = max([len(l) for l, _ in res] or [1])
for l, r in res:
    print(l.ljust(w), '|', r)
n_ok = sum(1 for _, r in res if r.startswith('CAUGHT'))
print('caught', n_ok, 'of', len(res))
sys.exit(0 if n_ok == len(res) else 1)
