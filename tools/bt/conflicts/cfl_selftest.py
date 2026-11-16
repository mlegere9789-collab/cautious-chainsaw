"""Self-test of validate_resolution.py: a valid fixture passes, and every planted defect is caught with the code that names it.

    python3 -I tools/bt/conflicts/validate_resolution.py --self-test

The fixture tools/bt/conflicts/selftest/c001-valid.json is a complete resolution of C-001 built from the real register and real Official Records passages
(selftest/make_base.py). Each planted defect copies it, breaks one thing, and the validator must report the expected error code. The four defects the task
names are the first four: a fabricated quote, a dropped value, a documented tier on a lead-only source, a missing reason.
"""
import copy
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cfl_lib as L
import cfl_search as S
import validate_resolution as V

FIX = os.path.join(HERE, 'selftest', 'c001-valid.json')


def pos(o, pid):
    return [p for p in o['positions'] if p['id'] == pid][0]


def _fabricated(o):
    pos(o, 'C-001-P3')['support'][0]['quote'] = 'arriving there at 7 a. m. of the 2d, in a snow storm'


def _dropped_value(o):
    o['positions'] = [p for p in o['positions'] if p['id'] != 'C-001-P2']


def _lead_documented(ctx):
    offs, path, why = S.locate_quote(ctx, 'LEAD-R03-1', 'arriving there at 1 a. m. of the 2d')
    off = offs[0] if offs else 0

    def f(o):
        p = pos(o, 'C-001-P3')
        p['support'] = [{'source': 'LEAD-R03-1', 'source_class': 'lead', 'page_basis': 'none', 'page': None, 'page_note': 'a working file with no pages', 'text_offset': off,
                         'quote': 'arriving there at 1 a. m. of the 2d', 'witness': {'name': 'project working file', 'role': 'a lead', 'side': 'institution'},
                         'written': {'date': '2026-11-04', 'kind': 'lead'}, 'vantage': 'not_applicable', 'knew_by': 'not_applicable', 'clock': 'not_applicable', 'group': 'lead',
                         'exact': True, 'states': {'times': ['01:00']}}]
        p['flags'] = ['lead_only']
    return f


def _missing_reason(o):
    del pos(o, 'C-001-P4')['reason_not_chosen']


def _wrong_offset(o):
    pos(o, 'C-001-P3')['support'][0]['text_offset'] += 4000


def _wrong_page(o):
    pos(o, 'C-001-P3')['support'][0]['page'] = '117'


def _number_not_in_quote(o):
    pos(o, 'C-001-P3')['support'][0]['states']['numbers'] = [7]


def _time_not_in_quote(o):
    pos(o, 'C-001-P3')['support'][0]['states']['times'] = ['07:00']


def _phrase_not_in_quote(o):
    pos(o, 'C-001-P3')['support'][1]['states']['phrases'] = ['before the break of day']


def _panel_long(o):
    o['source_panel_text'] = o['source_panel_text'] + ' ' + 'x' * 400


def _panel_banned(o):
    o['source_panel_text'] = 'About 01:00 on Jul 2, as an automated check of Meade\'s own report puts his arrival at 1 a.m.; Hunt says about 2 a.m.; all four values stay selectable.'


def _gap_no_searches(o):
    o['class'] = 'gap'
    o['tier'] = 'open gap'


def _class_tier(o):
    o['class'] = 'gap'


def _default_unknown(o):
    o['default']['positions'] = ['C-001-P9']


def _topic(o):
    o['topic'] = 'Meade arrives'


def _pdf_row(o):
    o['pdf_row']['text'] = o['pdf_row']['text'].replace('about 04:00', 'about 03:00')


def _delegated(o):
    o['first_delegated']['default_label'] = 'about 02:00'


def _not_exact(o):
    pos(o, 'C-001-P3')['support'][0]['exact'] = False


def _witness_class(o):
    pos(o, 'C-001-P3')['support'][0]['written']['kind'] = 'postwar_narrative'
    pos(o, 'C-001-P3')['support'][0]['written']['date'] = '1896-01-01'


def _flags(o):
    pos(o, 'C-001-P3')['flags'] = []


def _stance(o):
    pos(o, 'C-001-P4')['stance'] = 'default'


def _unknown_key(o):
    o['colour'] = 'blue'


def _source_class(o):
    pos(o, 'C-001-P3')['support'][0]['source_class'] = 'official'


def _tier_better(o):
    pos(o, 'C-001-P3')['tier'] = 'inferred'
    pos(o, 'C-001-P3')['inference'] = {'step': 'reasoned from the report of the arrival, not stated as such', 'from': ['C-001-P4']}


def _irreducible_position(o):
    o['class'] = 'irreducible'
    o['failed_searches'] = [{'where': 'OR27', 'query': 'q', 'outcome': 'not_found', 'at': '2026-11-16'}, {'where': 'books', 'query': 'q', 'outcome': 'not_found', 'at': '2026-11-16'}]


def _scenario_dropped(o):
    pos(o, 'C-001-P3')['scenario_ids'].remove('C-001-DEFAULT')


def _weighing(o):
    del o['weighing']['where']


def _ocr_no_raw(o):
    pos(o, 'C-001-P3')['support'][0]['quote_mode'] = 'ocr'


def _no_failed_lookups(o):
    del pos(o, 'C-001-P2')['failed_lookups']


def _lead_in_ledger_not(o):
    pos(o, 'C-001-P3')['support'][0]['source'] = 'NO-SUCH-SOURCE'


def _written_before_event(o):
    pos(o, 'C-001-P3')['support'][0]['written']['date'] = '1863-06-01'


def _pdf_label(o):
    pos(o, 'C-001-P1')['pdf_label'] = 'after dusk (SS1)'


def _page_basis(o):
    pos(o, 'C-001-P3')['support'][0]['page_basis'] = 'pdf_marker'


def _lead_only_flag(o):
    p = pos(o, 'C-001-P2')
    p['flags'] = []


def _undefaulted_documented_inferred_pdf_only(o):
    pos(o, 'C-001-P2')['tier'] = 'documented'


def _failed_lookup_shape(o):
    pos(o, 'C-001-P2')['failed_lookups'] = [{'where': 'OR27', 'query': 'q', 'outcome': 'found', 'at': '2026-11-16'}]


def _banned_label(o):
    pos(o, 'C-001-P4')['label'] = 'about 02:00 (an AI reading)'


def _readers(o):
    o['readers'] = []


def _source_keys(o):
    pos(o, 'C-001-P1')['source_keys'] = ['ZZZ']


def _window_no_animation(o):
    o['default'] = {'mode': 'window', 'positions': ['C-001-P3', 'C-001-P4'], 'label': 'between 01:00 and 02:00 on Jul 2', 'basis_text': 'the two reports of the arrival: Meade 1 a.m., Hunt about 2 a.m.'}
    for pid in ('C-001-P3', 'C-001-P4'):
        pos(o, pid)['stance'] = 'default'
        pos(o, pid).pop('reason_not_chosen', None)


def _number_value_not_stated(o):
    p = pos(o, 'C-001-P3')
    p['kind'] = 'count'
    p['value'] = {'n': 386}


def _default_range_numeric(o):
    # a numeric default of mode position carries a range: plant it on a time position by changing kinds (the validator must not demand it for a time)
    pass


# (name, mutation, expected code(s))
CASES = [
    ('fabricated quote', _fabricated, ['quote_not_found']),
    ('dropped value of the PDF row', _dropped_value, ['pdf_value_dropped']),
    ('documented tier on a lead-only source', None, ['lead_cannot_document']),     # built with the ledger
    ('missing reason', _missing_reason, ['reason_missing']),
    ('offset that does not match', _wrong_offset, ['offset_mismatch']),
    ('wrong printed page', _wrong_page, ['page_mismatch']),
    ('number not in the quote', _number_not_in_quote, ['state_not_in_quote']),
    ('clock time not in the quote', _time_not_in_quote, ['state_not_in_quote']),
    ('phrase not in the quote', _phrase_not_in_quote, ['state_not_in_quote']),
    ('source-panel text over 400 characters', _panel_long, ['panel_length']),
    ('product text that says how the site was made', _panel_banned, ['banned_copy']),
    ('gap class without failed searches', _gap_no_searches, ['failed_searches_missing']),
    ('tier not allowed for the class', _class_tier, ['class_tier']),
    ('default names a position that does not exist', _default_unknown, ['default_unknown_position']),
    ('topic differs from the register', _topic, ['topic_mismatch']),
    ('PDF row misquoted', _pdf_row, ['pdf_row_mismatch']),
    ('first delegated default misquoted', _delegated, ['delegated_mismatch']),
    ('documented without an exact citation', _not_exact, ['documented_not_exact']),
    ('documented on a later memoir', _witness_class, ['documented_needs_witness_class']),
    ('single source without a flag', _flags, ['flags_missing']),
    ('stance contradicts the default', _stance, ['stance_mismatch']),
    ('unknown key', _unknown_key, ['unknown_key']),
    ('source class contradicts the ledger', _source_class, ['source_class']),
    ('tier better than the default position', _tier_better, ['tier_better_than_support']),
    ('irreducible class with a single-value default', _irreducible_position, ['class_mode']),
    ('first-pass scenario carried by no position', _scenario_dropped, ['scenario_dropped']),
    ('weighing without a point of the rubric', _weighing, ['weighing_missing']),
    ('ocr quote mode without the raw excerpt', _ocr_no_raw, ['ocr_rules']),
    ('PDF-only value without failed lookups', _no_failed_lookups, ['failed_lookups_missing']),
    ('source id that is not in the ledger', _lead_in_ledger_not, ['source_unknown']),
    ('passage dated before the event', _written_before_event, ['written_date']),
    ('pdf_label that is not in the PDF row', _pdf_label, ['pdf_label_mismatch']),
    ('page basis that does not fit the page model', _page_basis, ['page_basis']),
    ('unsourced value without a flag', _lead_only_flag, ['flags_missing']),
    ('PDF-only value claimed documented', _undefaulted_documented_inferred_pdf_only, ['documented_needs_non_lead', 'lead_cannot_document']),
    ('failed lookup that found something', _failed_lookup_shape, ['failed_lookup_shape']),
    ('banned word in a label', _banned_label, ['banned_copy']),
    ('no readers and no note', _readers, ['readers_missing']),
    ('source key that the PDF row does not print', _source_keys, ['source_keys_mismatch']),
    ('numeric value whose number is in no quote', _number_value_not_stated, ['number_not_in_quote']),
    ('time window default without the instant that drives the picture', _window_no_animation, ['default_animation']),
]


def run():
    ctx = L.new_ctx()
    ok = True
    n_ok = 0
    base = V.load_file(FIX)[0]
    if base is None:
        print('FAIL: fixture %s cannot be read' % FIX)
        return 1
    R0 = V.validate_obj(copy.deepcopy(base), 'fixture', ctx, 'C-001')
    if R0.errors:
        print('FAIL: the valid fixture has errors:')
        for c, m in R0.errors[:10]:
            print('   [%s] %s' % (c, m))
        return 1
    print('PASS  the valid fixture has 0 errors (%d warnings)' % len(R0.warnings))
    for name, fn, expect in CASES:
        o = copy.deepcopy(base)
        if name.startswith('documented tier on a lead-only'):
            _lead_documented(ctx)(o)
        else:
            fn(o)
        R = V.validate_obj(o, name, ctx, 'C-001')
        codes = R.codes()
        got = [e for e in expect if e in codes]
        if got:
            n_ok += 1
            print('PASS  caught: %s -> %s' % (name, ', '.join(got)))
        else:
            ok = False
            print('FAIL  NOT CAUGHT: %s (expected %s; the validator said: %s)' % (name, '/'.join(expect), sorted(codes) or 'nothing'))
    # a different id in the file name
    o = copy.deepcopy(base)
    R = V.validate_obj(o, 'name', ctx, 'C-002')
    if 'id_mismatch' in R.codes():
        n_ok += 1
        print('PASS  caught: id that differs from the file name -> id_mismatch')
    else:
        ok = False
        print('FAIL  NOT CAUGHT: id that differs from the file name')
    # the command line: exit status 1 on a defective file, 0 on the good one, 1 on --all --complete with missing resolutions
    with tempfile.TemporaryDirectory() as td:
        bad = copy.deepcopy(base)
        _fabricated(bad)
        pbad = os.path.join(td, 'C-001.json')
        with open(pbad, 'w', encoding='utf-8') as f:
            json.dump(bad, f)
        pgood = os.path.join(td, 'good', 'C-001.json')
        os.makedirs(os.path.dirname(pgood))
        with open(pgood, 'w', encoding='utf-8') as f:
            json.dump(base, f)
        exe = [sys.executable, '-I', os.path.join(HERE, 'validate_resolution.py')]
        r1 = subprocess.run(exe + [pbad], capture_output=True, text=True)
        r2 = subprocess.run(exe + [pgood], capture_output=True, text=True)
        env = dict(os.environ, CFL_RESOLUTIONS_DIR=os.path.join(td, 'good'))
        r3 = subprocess.run(exe + ['--all', '--complete'], capture_output=True, text=True, env=env)
        r4 = subprocess.run(exe + ['--all'], capture_output=True, text=True, env=env)
        for nm, cond in (('exit status 1 on a defective file', r1.returncode == 1), ('exit status 0 on the valid file', r2.returncode == 0),
                         ('--all --complete exits 1 while resolutions are missing', r3.returncode == 1), ('--all passes when every present file passes', r4.returncode == 0)):
            if cond:
                n_ok += 1
                print('PASS  cli: %s' % nm)
            else:
                ok = False
                print('FAIL  cli: %s (rc %s %s)' % (nm, [r1.returncode, r2.returncode, r3.returncode, r4.returncode], (r1.stdout + r2.stdout)[-300:]))
    print('SELF-TEST %s: %d planted defects and checks caught' % ('OK' if ok else 'FAILED', n_ok))
    result = {'ok': ok, 'caught': n_ok, 'cases': len(CASES) + 1 + 4, 'date': L.today(), 'fixture': L.rel(FIX), 'valid_fixture_errors': len(R0.errors), 'valid_fixture_warnings': len(R0.warnings)}
    try:
        L.dump_json(os.path.join(L.CONF, 'selftest', 'RESULT.json'), result)
    except OSError:
        pass
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(run())
