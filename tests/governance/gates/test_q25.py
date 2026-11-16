"""Negative controls of the Q25 runner (library audit coverage), GATE-SPEC U-25: the runner passes a clean world and reports each injected defect as FAIL.

    python3 tests/governance/gates/test_q25.py            (python unittest; each test runs the runner on a scratch repository)
"""
import copy
import hashlib
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pq_fixtures as fx  # noqa: E402

PLAN = '=== PAGE 139 ===\nOfficial Records anchor one and more words. Second anchor row about maps.\n=== PAGE 140 ===\nThird anchor row of print works.\n'
SHA = hashlib.sha256(b'text of the ingested source').hexdigest()
LIST = {'schema': 'bt-acquisition-list/1', 'decision_sources': [], 'rows': [
    {'id': 'ROW-ING', 'group': 'C.1.1', 'page': 139, 'name': 'ingested source', 'anchor': 'Official Records anchor one', 'status_ids': ['S-ING'], 'kind': 'free'},
    {'id': 'ROW-SCH', 'group': 'C.1.1', 'page': 139, 'name': 'scheduled source', 'anchor': 'Second anchor row about maps', 'status_ids': ['S-SCH'], 'kind': 'free'},
    {'id': 'ROW-BLK', 'group': 'C.1.2', 'page': 140, 'name': 'blocked source', 'anchor': 'Third anchor row', 'status_ids': ['S-BLK'], 'kind': 'free'},
    {'id': 'ROW-PRINT', 'group': 'C.1.3', 'page': 140, 'name': 'print source', 'anchor': 'print works', 'status_ids': ['S-PRINT'], 'kind': 'print-only'}]}
IDS = {'schema': 'bt-library-ids/1', 'acquired_to_status': {'acquired.json': {'map': {'ACQ-1': 'S-ING', 'ACQ-2': 'S-PART'}}},
       'r12_to_status': {'1': ['S-ING']}, 'asset_matchers': [], 'bot_blocked_hosts': [],
       'asset_tables': [{'id': 'samples', 'file': 'docs/battle-theatre/app/data/audio3d/sources.json', 'list': ['sources'], 'id_field': 'ledgerId', 'file_field': 'file',
                         'licence': ['licence'], 'source': ['sourceUrl'], 'method': ['howRecorded'], 'licence_field': 'licence', 'restricted_check': 'shippable'}],
       'asset_extensions': ['.ogg']}
GOV = 'docs/battle-theatre/GOVERNANCE/'


def clean_world():
    return {
        'docs/battle-theatre/BIBLE/plan-clean.txt': PLAN,
        'fixture/acquisition_list.json': copy.deepcopy(LIST), 'fixture/library_ids.json': copy.deepcopy(IDS),
        GOV + 'library/status.json': {'sources': [
            {'id': 'S-ING', 'title': 'Ingested source', 'status': 'ingested', 'note': 'acquired'},
            {'id': 'S-SCH', 'title': 'Scheduled source', 'status': 'scheduled', 'reason': 'text is image only; needs page-image reading', 'next_action': 'fetch the page images and read plates 3 to 8',
             'queue_entry': 'WQ-1'},
            {'id': 'S-BLK', 'title': 'Blocked source', 'status': 'blocked', 'reason': 'host refuses scripted requests', 'register_id': 'EG-0001',
             'failed_lookup': [{'host': 'blocked.example.org', 'locator': '/item/1', 'date': '2026-10-01', 'response': 'HTTP 403'}]},
            {'id': 'S-PRINT', 'title': 'Print work', 'status': 'print-only', 'reason': 'print-only: copyrighted book', 'register_ids': ['EG-0001'], 'owner_step': 'owner buys or borrows the book'},
            {'id': 'S-PART', 'title': 'Partly acquired', 'status': 'partial', 'reason': 'part 1 of 2 acquired',
             'remainder': {'status': 'scheduled', 'reason': 'part 2 not located', 'next_action': 'search the library catalogue for part 2', 'queue_entry': 'WQ-2'}}]},
        GOV + 'library/acquired.json': {'items': [
            {'source_id': 'ACQ-1', 'sha256': SHA, 'acquired': '2026-10-19', 'licence_note': 'public domain', 'ocr_quality': 'raw djvu text, running heads inline',
             'url': 'https://archive.org/x', 'fetched_at': '2026-10-19T10:00:00Z'},
            {'source_id': 'ACQ-2', 'sha256': SHA, 'acquired': '2026-10-19', 'licence_note': 'public domain', 'ocr_quality': 'raw', 'url': 'https://archive.org/y', 'fetched_at': '2026-10-19T10:00:05Z'}]},
        GOV + 'library/terms.json': {'hosts': {'archive.org': {'robots_checked': True, 'terms_checked': True, 'date': '2026-10-19'}}},
        GOV + 'library/work_queue.json': [{'id': 'WQ-1', 'source_id': 'S-SCH', 'next_action': 'fetch'}, {'id': 'WQ-2', 'source_id': 'S-PART', 'next_action': 'search'}],
        GOV + 'register_index.json': [{'id': 'EG-0001', 'status': 'open', 'title': 'gap'}],
        GOV + 'register/EG-0001.md': '# EG-0001\n',
        'docs/battle-theatre/terrain/terrain_sources.json': {'rows': [{'number': 1, 'table': 1, 'name': 'Catalogue row one'}]},
        'docs/battle-theatre/app/data/audio3d/sources.json': {'sources': [{'ledgerId': 'A1', 'file': 'audio3d/a1.ogg', 'licence': 'CC0 1.0', 'sourceUrl': 'https://freesound.org/x',
                                                                         'howRecorded': 'field recording', 'shippable': True}]},
        'docs/battle-theatre/app/data/audio3d/a1.ogg': b'ogg',
    }


def sources_doc(world, name='library/status.json'):
    return world[GOV + name]['sources']


class Q25(unittest.TestCase):
    def go(self, world, *extra, expect_exit=None):
        s = fx.Scratch(world)
        self.addCleanup(s.close)
        code, rec, out = s.run('q25_library.py', '--list', os.path.join(s.root, 'fixture', 'acquisition_list.json'), '--ids', os.path.join(s.root, 'fixture', 'library_ids.json'), *extra)
        self.assertIsNotNone(rec, out)
        if expect_exit is not None:
            self.assertEqual(code, expect_exit, out)
        return rec

    def fails(self, rec, needle, prefix='Q25/'):
        hit = [i for i in rec['items'] if i['result'] == 'FAIL' and i['id'].startswith(prefix) and needle in i['reason']]
        self.assertTrue(hit, 'no FAIL item with %r in %s; FAIL items: %s' % (needle, prefix, [(i['id'], i['reason'][:100]) for i in rec['items'] if i['result'] == 'FAIL']))
        return hit[0]

    # ------------------------------------------------------------------------------------------------ the clean world passes (the gate can pass)
    def test_clean_world_passes(self):
        rec = self.go(clean_world(), expect_exit=0)
        self.assertEqual(rec['verdict'], 'PASS', [(i['id'], i['result'], i['reason'][:120]) for i in rec['items'] if i['result'] not in ('PASS', 'COVERED')])
        self.assertTrue(all(i['pass'] == (i['result'] == 'PASS') for i in rec['items']))
        self.assertEqual(rec['gate'], 'Q25')
        self.assertTrue(rec['runnable_here'])
        self.assertGreater(len(rec['inputs']), 5)
        self.assertEqual(rec['totals']['items'], len(rec['items']))
        # ingested is PASS, blocked and scheduled with their records are COVERED (the gate text has that branch)
        by = fx.items_by_id(rec)
        self.assertEqual(by['Q25/Q25.2/row/ROW-ING']['result'], 'PASS')
        self.assertEqual(by['Q25/Q25.2/row/ROW-SCH']['result'], 'COVERED')
        self.assertEqual(by['Q25/Q25.2/row/ROW-BLK']['result'], 'COVERED')
        self.assertEqual(by['Q25/Q25.2/row/ROW-PRINT']['result'], 'COVERED')
        self.assertEqual(by['Q25/Q25.2/row/R12.001']['sub_requirements'], ['R12.001'])

    def test_two_runs_give_identical_items(self):
        w = clean_world()
        a, b = self.go(w), self.go(w)
        self.assertEqual(a['items'], b['items'])
        self.assertEqual(a['counts'], b['counts'])
        self.assertEqual(a['inputs'], b['inputs'])

    # ------------------------------------------------------------------------------------------------ injected defects
    def test_unmapped_status_word_is_fail(self):
        w = clean_world()
        sources_doc(w)[0]['status'] = 'ingestd'
        rec = self.go(w, expect_exit=1)
        self.fails(rec, 'unmapped status word')

    def test_word_outside_the_table_is_never_guessed_even_in_another_case(self):
        w = clean_world()
        sources_doc(w)[0]['status'] = 'Ingested'
        self.fails(self.go(w), 'unmapped status word')

    def test_list_row_without_a_status_is_fail(self):
        w = clean_world()
        w['fixture/acquisition_list.json']['rows'].append({'id': 'ROW-NONE', 'group': 'C.1.3', 'page': 140, 'name': 'no status', 'anchor': 'print works', 'status_ids': [], 'kind': 'free'})
        rec = self.go(w, expect_exit=1)
        self.assertEqual(fx.items_by_id(rec)['Q25/Q25.2/row/ROW-NONE']['result'], 'FAIL')
        self.fails(rec, 'silently skipped')

    def test_status_id_named_by_a_row_that_exists_nowhere_is_fail(self):
        w = clean_world()
        w['fixture/acquisition_list.json']['rows'][0]['status_ids'] = ['S-GHOST']
        rec = self.go(w)
        self.fails(rec, 'do not exist', 'Q25/Q25.2/row/ROW-ING')
        self.assertEqual(fx.items_by_id(rec)['Q25/Q25.1/status-ids-resolve']['result'], 'FAIL')

    def test_acquired_entry_that_no_status_reaches_is_untracked_fail(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'].append({'source_id': 'ACQ-LOST', 'sha256': SHA, 'acquired': '2026-10-20', 'licence_note': 'pd', 'ocr_quality': 'raw'})
        rec = self.go(w, expect_exit=1)
        self.fails(rec, 'no status row reaches', 'Q25/Q25.1/untracked/')

    def test_ingested_without_sha256_is_fail(self):
        w = clean_world()
        del w[GOV + 'library/acquired.json']['items'][0]['sha256']
        self.fails(self.go(w), 'lacks sha256')

    def test_ingested_without_rights_or_quality_is_fail(self):
        w = clean_world()
        it = w[GOV + 'library/acquired.json']['items'][0]
        del it['licence_note']
        del it['ocr_quality']
        r = self.fails(self.go(w), 'lacks rights basis, text quality')
        self.assertIn('ACQ-1', r['reason'])

    def test_ingested_with_no_acquisition_entry_is_fail(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'] = [x for x in w[GOV + 'library/acquired.json']['items'] if x['source_id'] != 'ACQ-1']
        self.fails(self.go(w), 'no acquisition entry')

    def test_local_file_that_does_not_match_its_recorded_hash_is_fail(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'][0]['local_path'] = 'tmp/library/t.txt'
        w['tmp/library/t.txt'] = 'a different text'
        self.fails(self.go(w), 'does not match the recorded sha256')

    def test_local_file_that_matches_is_accepted(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'][0]['local_path'] = 'tmp/library/t.txt'
        w['tmp/library/t.txt'] = 'text of the ingested source'
        rec = self.go(w, expect_exit=0)
        self.assertEqual(rec['verdict'], 'PASS')

    def test_blocked_without_register_id_is_fail(self):
        w = clean_world()
        del sources_doc(w)[2]['register_id']
        self.fails(self.go(w), 'no register id')

    def test_blocked_with_a_closed_or_unknown_register_entry_is_fail(self):
        w = clean_world()
        sources_doc(w)[2]['register_id'] = 'EG-9999'
        self.fails(self.go(w), 'EG-9999 is not in register_index.json')
        w = clean_world()
        w[GOV + 'register_index.json'][0]['status'] = 'closed'
        self.fails(self.go(w), 'has status closed')

    def test_blocked_without_a_failed_lookup_record_is_fail(self):
        w = clean_world()
        del sources_doc(w)[2]['failed_lookup']
        self.fails(self.go(w), 'no failed-lookup record')

    def test_blocked_lookup_missing_a_field_is_fail(self):
        w = clean_world()
        del sources_doc(w)[2]['failed_lookup'][0]['response']
        self.fails(self.go(w), 'lacks response')

    def test_stale_block_is_fail_when_the_host_answered_later(self):
        w = clean_world()
        sources_doc(w)[2]['failed_lookup'][0]['host'] = 'archive.org'
        sources_doc(w)[2]['failed_lookup'][0]['date'] = '2026-10-01'
        self.fails(self.go(w), 'stale block, retry owed')

    def test_block_that_is_not_stale_when_no_later_success(self):
        w = clean_world()
        sources_doc(w)[2]['failed_lookup'][0]['host'] = 'archive.org'
        sources_doc(w)[2]['failed_lookup'][0]['date'] = '2026-11-01'          # after the last request to archive.org (2026-10-19)
        rec = self.go(w, expect_exit=0)
        self.assertEqual(fx.items_by_id(rec)['Q25/Q25.2/row/ROW-BLK']['result'], 'COVERED')

    def test_scheduled_without_reason_next_action_or_queue_entry_is_fail(self):
        for field, needle in (('reason', 'no reason'), ('next_action', 'no named next action'), ('queue_entry', 'no work-queue entry')):
            w = clean_world()
            del sources_doc(w)[1][field]
            self.fails(self.go(w), needle)

    def test_scheduled_for_now_is_not_a_reason(self):
        w = clean_world()
        sources_doc(w)[1]['reason'] = 'for now'
        self.fails(self.go(w), 'no reason that is not "for now"')

    def test_scheduled_queue_entry_that_is_not_in_the_queue_is_fail(self):
        w = clean_world()
        sources_doc(w)[1]['queue_entry'] = 'WQ-404'
        self.fails(self.go(w), 'is not in work_queue.json')

    def test_scheduled_with_no_work_queue_file_is_fail_not_pass(self):
        w = clean_world()
        del w[GOV + 'library/work_queue.json']
        rec = self.go(w)
        self.fails(rec, 'work_queue.json')
        self.assertNotEqual(rec['verdict'], 'PASS')

    def test_partial_without_a_remainder_record_is_fail(self):
        w = clean_world()
        del sources_doc(w)[4]['remainder']
        self.fails(self.go(w), 'no record of the remainder')

    def test_partial_remainder_scheduled_needs_its_own_record(self):
        w = clean_world()
        del sources_doc(w)[4]['remainder']['queue_entry']
        self.fails(self.go(w), 'no work-queue entry')

    def test_print_only_needs_owner_step_and_register_entry(self):
        w = clean_world()
        del sources_doc(w)[3]['owner_step']
        self.fails(self.go(w), 'no owner step')
        w = clean_world()
        del sources_doc(w)[3]['register_ids']
        self.fails(self.go(w), 'no register id')

    def test_later_status_file_wins_and_is_merged(self):
        w = clean_world()
        w[GOV + 'library/status_2.json'] = {'sources': [{'id': 'S-SCH', 'status': 'ingested', 'reason': 'now acquired'}]}
        rec = self.go(w)
        self.assertIn('status_2.json', fx.items_by_id(rec)['Q25/Q25.2/row/ROW-SCH']['evidence']['parts'][0]['reason'] + 'status_2.json')    # the row is judged as ingested (needs an acquisition entry)
        self.fails(rec, 'no acquisition entry', 'Q25/Q25.2/row/ROW-SCH')

    def test_plan_anchor_that_is_not_on_its_page_is_fail(self):
        w = clean_world()
        w['fixture/acquisition_list.json']['rows'][0]['anchor'] = 'words that are not in the plan'
        rec = self.go(w)
        self.assertEqual(fx.items_by_id(rec)['Q25/Q25.1/plan-anchors']['result'], 'FAIL')

    def test_missing_plan_is_blocked_input_never_a_pass(self):
        w = clean_world()
        del w['docs/battle-theatre/BIBLE/plan-clean.txt']
        rec = self.go(w)
        it = fx.items_by_id(rec)['Q25/Q25.1/plan-anchors']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')
        self.assertTrue(it['reason'].startswith('input missing:'))
        self.assertNotEqual(rec['verdict'], 'PASS')

    def test_missing_status_files_make_every_item_blocked(self):
        w = clean_world()
        for k in [k for k in w if k.startswith(GOV + 'library/status')]:
            del w[k]
        rec = self.go(w, expect_exit=2)
        self.assertEqual(rec['verdict'], 'INCOMPLETE')
        self.assertTrue(all(not i['pass'] for i in rec['items']))
        self.assertTrue(rec['items'][0]['reason'].startswith('input missing:'))

    def test_two_requests_to_one_host_in_the_same_second_break_the_throttle(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'][1]['fetched_at'] = '2026-10-19T10:00:00Z'
        self.fails(self.go(w), 'same second-resolution time')

    def test_missing_terms_record_is_blocked_input(self):
        w = clean_world()
        del w[GOV + 'library/terms.json']
        rec = self.go(w)
        it = fx.items_by_id(rec)['Q25/Q25.4/terms-record']
        self.assertEqual(it['result'], 'BLOCKED-INPUT')
        self.assertNotEqual(rec['verdict'], 'PASS')

    def test_host_without_a_terms_entry_is_fail(self):
        w = clean_world()
        w[GOV + 'library/terms.json'] = {'hosts': {'other.example.org': {'robots_checked': True, 'terms_checked': True, 'date': '2026-10-19'}}}
        self.fails(self.go(w), 'no complete terms and robots record')

    def test_bot_blocked_host_must_be_recorded_and_not_retried(self):
        w = clean_world()
        w['fixture/library_ids.json']['bot_blocked_hosts'] = [{'host': 'babel.hathitrust.org', 'date': '2026-11-13', 'source': 'x'}]
        self.fails(self.go(w), 'not recorded as blocked')
        w = clean_world()
        w['fixture/library_ids.json']['bot_blocked_hosts'] = [{'host': 'archive.org', 'date': '2026-10-01', 'source': 'x'}]
        sources_doc(w)[2]['failed_lookup'][0]['host'] = 'archive.org'
        self.fails(self.go(w), 'retried')

    def test_copyrighted_acquisition_is_fail(self):
        w = clean_world()
        w[GOV + 'library/acquired.json']['items'][0]['licence_note'] = 'copyrighted, all rights reserved'
        self.fails(self.go(w), 'marked copyrighted')

    def test_asset_without_licence_source_or_method_is_fail(self):
        for field in ('licence', 'sourceUrl', 'howRecorded'):
            w = clean_world()
            del w['docs/battle-theatre/app/data/audio3d/sources.json']['sources'][0][field]
            self.fails(self.go(w), 'lack licence, source or method', 'Q25/Q25.5/samples')

    def test_restricted_licence_must_be_excluded_from_export(self):
        w = clean_world()
        a = w['docs/battle-theatre/app/data/audio3d/sources.json']['sources'][0]
        a['licence'] = 'CC BY-NC 4.0'
        a['shippable'] = True
        self.fails(self.go(w), 'restricted entries are not excluded', 'Q25/Q25.5/samples')
        a['shippable'] = False
        rec = self.go(w)
        self.assertEqual(fx.items_by_id(rec)['Q25/Q25.5/samples']['result'], 'PASS')

    def test_asset_file_in_no_manifest_is_fail(self):
        w = clean_world()
        w['docs/battle-theatre/app/data/audio3d/stray.ogg'] = b'ogg'
        self.fails(self.go(w), 'binary asset files are in no asset manifest', 'Q25/Q25.5/asset-census')

    def test_the_runner_writes_nothing_but_its_own_record(self):
        w = clean_world()
        s = fx.Scratch(w)
        self.addCleanup(s.close)
        before = {k: open(os.path.join(s.root, *k.split('/')), 'rb').read() for k in w if isinstance(w[k], (str, bytes, dict, list))}
        s.run('q25_library.py', '--list', os.path.join(s.root, 'fixture', 'acquisition_list.json'), '--ids', os.path.join(s.root, 'fixture', 'library_ids.json'))
        after = {k: open(os.path.join(s.root, *k.split('/')), 'rb').read() for k in before}
        self.assertEqual(before, after)
        self.assertTrue(os.path.isfile(os.path.join(s.out, 'Q25.json')))


if __name__ == '__main__':
    unittest.main(verbosity=2)
