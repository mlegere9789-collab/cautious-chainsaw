"""Write the SEED rows of the OA11 evidence pass: eleven rows of evidence/<group>.jsonl that show the contract at work on real passages.

    python3 -I tools/bt/life/seed_rows.py

Every quote is located in the local Official Records text by the validator's own matcher (offsets, record and printed page are computed, never typed).
The readings (unit, window, activity, tier) are the plan author's; each seed row is owed a second reading by the owner group before it is used.
Seeds are written only into a group file that does not yet exist or that has no row with the same id (a group's own rows are never overwritten).
"""
import os, re, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from life_lib import *

utf8_stdout()
D0 = lambda m, d: (min_of(m, d, 0, 0), min_of(m, d, 23, 59))
OR1, OR2 = 'OR-27-1', 'OR-27-2'

SEEDS = [
 dict(g='us-1c', n=1, kind='labour', sub='breastwork_infantry', unit='us-1c-2d-paul-94ny', unit_text='we (the 94th New York)', src=OR1,
      quote='July 1, marched to near Gettysburg, and, after moving forward to near the brick seminary, we were ordered to throw up breastworks.',
      window=dict(start_min=D0(7, 1)[0], end_min=D0(7, 1)[1], basis='stated_date', part_of_day='afternoon (after the move forward; the hour is not stated)',
                  note='the regiment was ordered forward again "after remaining here a short time"; the report does not say the works were finished'),
      place=dict(text='near the brick seminary (Seminary Ridge)', ref=None, map_scope='battlefield'), activity='dig_shovel', basis='procedural', tools=[], men=dict(lo=None, hi=None, basis='unknown'),
      tier='documented', notes='ordered to throw up breastworks; method, material and completion not stated, so the clip is a stand-in. Seed row of the plan: second reading owed by us-1c.'),
 dict(g='us-1c', n=2, kind='labour', sub='rail_barricade', unit=None, work='E-01', builder_unknown=True, unit_text='some of our troops', src=OR1,
      quote='Down the slope, some 40 yards in front of this battery, I found a slight breastwork of loose rails, which, I suppose, had been thrown together by some of our troops in the earlier part of the day, behind which I threw the regiment.',
      window=dict(start_min=D0(7, 1)[0], end_min=D0(7, 1)[1], basis='stated_period', part_of_day='"the earlier part of the day"', note='the colonel found it in the afternoon fight; he supposes it was made earlier that day'),
      place=dict(text='the foot of Seminary Ridge, about 40 yards in front of the battery', ref=None, map_scope='battlefield'), activity='march_carry_rail', pose='POSE-L09', basis='inferred',
      tools=[dict(item='loose fence rails', role='material', count=None, basis='stated')], men=dict(lo=None, hi=None, basis='unknown'), tier='inferred',
      tier_basis='the colonel of the 7th Wisconsin found the rails piled and only supposes ("I suppose") that Union troops had thrown them together earlier that day: the pile is stated, the builder and the hour are his supposition',
      ctx='in the engagement at Gettysburg on July 1: We left our camp, on the road running from Emmitsburg to Gettysburg', notes='Identified with E-01 of structures/works_stages.json by place (the foot of Seminary Ridge, in front of a battery) and day: the colonel does not name it. The row documents the pile and who used it (the 7th Wisconsin, us-1c-1d-meredith-7wi), not who built it. Seed row: second reading owed by us-1c.'),
 dict(g='us-12c', n=1, kind='labour', sub='breastwork_infantry', unit='us-12c-2d-greene', work='E-05', unit_text='we (Greene\'s brigade)', src=OR1,
      quote='we began to intrench ourselves and throw up breastworks of the covering height, of logs, cord-wood, stones, and earth. The same was done by the troops on my right. By 13 o\'clock we had a good cover for the men.',
      ctx='we took position at about G a. m. on the right of the First Corps',
      window=dict(start_min=min_of(7, 2, 6, 0), end_min=min_of(7, 2, 12, 0), basis='stated_clock', part_of_day='morning',
                  note='start "about G a. m." is the OCR of 6 a. m.; the end prints "13 o\'clock" in this scan, which cannot be a clock time: two other archive.org scans read 12 (fence-1 close-out), so the end is 12:00; the DMNA night-of-1-2-July start is carried as a conflict'),
      place=dict(text='Culp\'s Hill, on the right of the First Corps, Rock Creek in front', ref=None, map_scope='battlefield'), activity='dig_shovel', basis='inferred',
      tools=[dict(item='logs', role='material', count=None, basis='stated'), dict(item='cord-wood', role='material', count=None, basis='stated'), dict(item='stones', role='material', count=None, basis='stated'), dict(item='earth', role='material', count=None, basis='stated')],
      men=dict(lo=None, hi=None, basis='unknown'), tier='documented',
      conflicts=[dict(id='C-E05-START', kind='time', other_rows=[], note='start of the work: about 06:00 here; the night of 1-2 July per the 60th NY monument address (DMNA); about 04:00 per the 149th NY (fence-1 close-out)', scenario_key='start_night_jul1_2_dmna')],
      notes='Greene\'s own report. Tools (spades) and head logs are not stated here. The clip stands for the whole mix of materials; the group splits the rows by material. Seed row: second reading owed by us-12c.'),
 dict(g='cs-2c', n=1, kind='labour', sub='breastwork_infantry', unit=None, work='W-WRIGHTSVILLE-WORKS', unit_text='1,300 militia', src=OR2,
      quote='Pushing on, by order of General Early, to Wrightsville, on the Susquehanna, he found 1,300 militia strongly intrenched, but without artillery.',
      window=dict(start_min=D0(6, 26)[0], end_min=D0(6, 30)[1], basis='report_span', part_of_day=None, note='the section "Expedition to York and Wrightsville" precedes the account of the night of 30 June; the day of Wrightsville is not stated in the passage'),
      place=dict(text='Wrightsville, on the Susquehanna', ref=None, map_scope='outside_map'), activity='dig_shovel', basis='procedural', tools=[], men=dict(lo=1300, hi=1300, basis='stated_number'), tier='documented',
      notes='The number is the garrison Gordon found, not the men who dug. Union militia works, outside the Gettysburg map (kept, not drawn). Seed row: second reading owed by cs-2c.'),
 dict(g='cs-2c', n=2, kind='labour', sub='bridge_destroyed', unit=None, work='W-WRIGHTSVILLE-BRIDGE', unit_text='the militia', src=OR2,
      quote='A few shots drove them across the magnificent railroad bridge, a mile and a quarter long, which they burned as they retreated over it.',
      window=dict(start_min=D0(6, 26)[0], end_min=D0(6, 30)[1], basis='report_span', part_of_day=None, note='same section as cs-2c-L001; the day is not stated in the passage'),
      place=dict(text='the railroad bridge at Wrightsville, a mile and a quarter long', ref=None, map_scope='outside_map'), activity=None, pose='POSE-L21', basis='procedural',
      tools=[], men=dict(lo=None, hi=None, basis='unknown'), tier='documented', notes='burned by the retreating militia; the means are not stated. Seed row: second reading owed by cs-2c.'),
 dict(g='cs-2c', n=3, kind='labour', sub='fire_fighting', unit='cs-2c-early-gordon', unit_text='General Gordon, setting his brigade to work', src=OR2,
      quote='The little town of Wrightsville caught fire from the bridge, and General Gordon, setting his brigade to work, succeeded in extinguishing the flames.',
      window=dict(start_min=D0(6, 26)[0], end_min=D0(6, 30)[1], basis='report_span', part_of_day=None, note='same section as cs-2c-L001'),
      place=dict(text='the town of Wrightsville', ref=None, map_scope='outside_map'), activity=None, pose='POSE-L24', basis='procedural', tools=[], men=dict(lo=None, hi=None, basis='unknown'), tier='documented',
      notes='soldiers putting out a fire in a town: the means (buckets, beating, pulling down) are not stated. Seed row: second reading owed by cs-2c.'),
 dict(g='us-army', n=1, kind='labour', sub='bridge_destroyed', unit=None, work='W-FALLING-WATERS-PONTOON', unit_text='a cavalry force of Major-General French', src=OR1,
      quote='had pushed a cavalry force to Williamsport and Falling Waters, where they destroyed the enemy\'s pontoon bridge and captured its guard.',
      window=dict(start_min=D0(7, 4)[0], end_min=min_of(7, 8, 0, 0), basis='report_span', part_of_day=None, note='dated only by its place in Meade\'s narrative, between the pursuit to the Fairfield Pass and the march to Middletown; other groups\' rows may narrow it'),
      place=dict(text='Williamsport and Falling Waters', ref=None, map_scope='outside_map'), activity='chop_axe', basis='procedural', tools=[], men=dict(lo=None, hi=None, basis='unknown'), tier='documented',
      notes='Meade\'s report, "I subsequently ascertained": how the bridge was destroyed is not stated, the clip is a stand-in. Seed row: second reading owed by us-army and bridges-roads.'),
 dict(g='us-army', n=2, kind='labour', sub='breastwork_infantry', unit='cs-anv', work='W-WILLIAMSPORT-WORKS', unit_text='the enemy', src=OR1,
      quote='These positions they are said to be intrenching.',
      ctx='Headquarters Army of the Potomac, July 10, 1863—1 p. m.',
      window=dict(start_min=min_of(7, 10, 0, 0), end_min=min_of(7, 10, 13, 0), basis='stated_clock', part_of_day=None, note='the dispatch is dated July 10, 1 p. m.; the work was under way when the information came, its start is not stated'),
      place=dict(text='positions from the Potomac near Falling Waters through Downsville to Funkstown and northeast of Hagerstown', ref=None, map_scope='outside_map'), activity='dig_shovel', basis='procedural',
      tools=[], men=dict(lo=None, hi=None, basis='unknown'), tier='inferred',
      tier_basis='Meade reports information received that the Confederate positions are "said to be" intrenched: a statement of what was reported to him, not an observation of the work',
      notes='Hearsay in a dispatch. Seed row: second reading owed by us-army.'),
 dict(g='us-2c', n=1, kind='labour', sub='breastwork_infantry', unit='us-2c-1d-brooke-64ny', unit_text='we (the 64th New York)', src=OR1,
      quote='At evening we halted about 3 miles from Gettysburg, and were ordered to build breastworks. Before the works were finished, we were ordered to rest. At 2.30 a. m., July 2, we were ordered to pack up quietly and cook coffee.',
      window=dict(start_min=D0(7, 1)[0], end_min=min_of(7, 2, 2, 30), basis='stated_period', part_of_day='evening', note='"At evening" (no hour) to the order of 2.30 a. m., July 2 that follows the rest; the day bounds are used for the start'),
      place=dict(text='a halt about 3 miles from Gettysburg', ref=None, map_scope='approach'), activity='dig_shovel', basis='procedural', tools=[], men=dict(lo=None, hi=None, basis='unknown'), tier='documented',
      notes='ordered to build; the works were not finished before the order to rest; method not stated. Seed row: second reading owed by us-2c.'),
 dict(g='us-2c', n=1, kind='routine', sub='cooking', unit='us-2c-1d-brooke-64ny', unit_text='we (the 64th New York)', src=OR1,
      quote='At 2.30 a. m., July 2, we were ordered to pack up quietly and cook coffee. At 4. 10 a. m. we moved about 1 mile to the front',
      window=dict(start_min=min_of(7, 2, 2, 30), end_min=min_of(7, 2, 4, 10), basis='stated_clock', part_of_day='night, before dawn', note='ordered at 2.30 a. m.; the regiment moved at 4.10 a. m. (the quote prints "4. 10")'),
      place=dict(text='the halt about 3 miles from Gettysburg', ref=None, map_scope='approach'), activity='cook_stir', pose='POSE-R02', basis='inferred',
      tools=[dict(item='coffee', role='food', count=None, basis='stated')], men=dict(lo=None, hi=None, basis='unknown'), tier='documented',
      notes='quiet cooking of coffee before a move at night: a camp-fire scene before dawn (sunrise 04:35 local mean time on 2 July by the project ephemeris). Seed row: second reading owed by us-2c.'),
 dict(g='us-5c', n=1, kind='routine', sub='ration_issue', unit='us-5c-1d-vincent-20me', unit_text='my command (20th Maine)', src=OR1,
      quote='Rations were scarcely issued, and the men about preparing supper, when rumors that the enemy had been encountered that day near Gettysburg absorbed every other interest, and very soon orders came to march forthwith to Gettysburg.',
      ctx='on reaching Hanover, Pa., just before sunset on that day',
      window=dict(start_min=D0(7, 1)[0], end_min=D0(7, 1)[1], basis='stated_period', part_of_day='just before sunset (about 19:32 local mean time on 1 July by the project ephemeris)',
                  note='the date is inferred: "the enemy had been encountered that day near Gettysburg" is the fight of 1 July'),
      place=dict(text='Hanover, Pennsylvania', ref=None, map_scope='approach'), activity='cook_stir', pose=None, basis='inferred',
      tools=[dict(item='rations', role='food', count=None, basis='stated')], men=dict(lo=None, hi=None, basis='unknown'), tier='inferred',
      tier_basis='Chamberlain writes of "that day" and rumours of an enemy met near Gettysburg: the day of the first fight, 1 July; the issue and the supper are stated, the date follows from the rumour',
      notes='Chamberlain\'s report (20th Maine). Seed row: second reading owed by us-5c.'),
]


def main():
    written = collections.Counter()
    skipped = []
    by_group = collections.defaultdict(list)
    for s in SEEDS:
        st = source_text(s['src'])
        m = match_quote(st, s['quote'])
        if m['mode'] not in ('exact', 'typo') or not m['spans']:
            raise SystemExit('seed %s-%s: quote not found (%s)' % (s['g'], s['n'], m['mode']))
        a, b, _ = m['spans'][0]
        rec = None
        import bisect
        starts = [r['start_offset'] for r in st.records]
        i = bisect.bisect_right(starts, a) - 1
        rec = st.records[i]
        assert a < rec['end_offset']
        pa, pb = st.page_range(a, b)
        exact = str(pa.get('conf', '')).startswith(('head', 'front'))
        lp = leaf_page(st.meta['part'], a)
        if lp is not None and leaf_page(st.meta['part'], b - 1) == lp:
            page, pbasis = lp, 'scan_leaf'
        else:
            page = pa['page']
            if page is None:
                raise SystemExit('seed %s-%s: no page at offset %d' % (s['g'], s['n'], a))
            pbasis = 'running_head' if exact else 'interpolated'
            if not exact:
                s['notes'] = (s.get('notes') or '') + ' Printed page interpolated by the page model (%s-%s): the running head of the page is lost in the scan.' % (pa.get('lo'), pa.get('hi'))
        row = {'id': '%s-%s%03d' % (s['g'], 'L' if s['kind'] == 'labour' else 'R', s['n']), 'group': s['g'], 'kind': s['kind'], 'subkind': s['sub'], 'unit_id': s['unit'], 'unit_text': s['unit_text'],
               'work_id': s.get('work'), 'window': s['window'], 'place': s['place'], 'activity': s.get('activity'), 'pose_needed': s.get('pose'), 'activity_basis': s['basis'],
               'tools_props': s['tools'], 'men': s['men'], 'tier': s['tier'], 'source_id': s['src'], 'part': st.meta['part'], 'report_id': rec['id'], 'printed_page': str(page), 'page_basis': pbasis,
               'quote': s['quote'], 'offset_start': a, 'offset_end': b}
        if s.get('builder_unknown'):
            row['builder_unknown'] = True
        if s.get('tier_basis'):
            row['tier_basis'] = s['tier_basis']
        ctx = s.get('ctx')
        if ctx:
            mc = match_quote(st, ctx)
            if mc['mode'] not in ('exact', 'typo') or not mc['spans']:
                # a context quote must come from the same record: search the record's text
                raise SystemExit('seed %s-%s: context %r not found (%s)' % (s['g'], s['n'], ctx, mc['mode']))
            inrec = [sp for sp in mc['spans'] if rec['start_offset'] <= sp[0] < rec['end_offset']]
            if not inrec:
                raise SystemExit('seed %s-%s: context quote is not inside %s' % (s['g'], s['n'], rec['id']))
            ca, cb, _ = inrec[0]
            row.update({'context_quote': ctx, 'context_offset_start': ca, 'context_offset_end': cb})
        row['conflicts'] = s.get('conflicts', [])
        row['notes'] = s.get('notes')
        row['text_sha256'] = st.meta['sha256']
        if s.get('kind') == 'labour' and not s.get('work') and not s.get('unit'):
            raise SystemExit('seed without subject')
        by_group[s['g']].append(row)
    for g, rows in by_group.items():
        path = os.path.join(EVID, g + '.jsonl')
        have = {}
        if os.path.exists(path):
            for ln, line in read_jsonl(path):
                r = json.loads(line)
                have[r['id']] = r
        for r in rows:
            if r['id'] in have:
                skipped.append(r['id'])
            else:
                have[r['id']] = r
                written[g] += 1
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            for rid in sorted(have):
                f.write(json.dumps(have[rid], ensure_ascii=False) + '\n')
    print('seed rows written:', dict(written), 'skipped (id already present):', skipped)


if __name__ == '__main__':
    main()
