#!/usr/bin/env python3
"""Builds docs/battle-theatre/kit/cavalry_action_table.json: the PDF plan's table B.6.15.3 "Action-by-action table through time" (June 26 - July 16) as a machine table for gate Q20.2.

    python3 tools/bt/build_cavalry_action_table.py [--check]

Every row keeps its page citation (PDF page, computed from the `=== PAGE n ===` markers of BIBLE/plan-clean.txt and the row's anchor line) and the first printed words of the row,
which must be found in the plan text (the build fails otherwise). Times are minutes since 1863-06-01 00:00 LMT (app/src/clock.mjs). A time is given only where the plan prints one;
a row with a date and no hour is a whole-day window (marked `window_basis: date_only`) and the plan's qualitative words ("afternoon", "dusk") are kept as text, never turned into an hour.
Conflicting readings the plan prints are carried as ranges (start_earliest..start_latest). Nothing here comes from outside the plan's B.6.15.3 text; the sources named per row are the plan's own
citations and are NOT verified against the originals: every row is `seeded_unverified` (CLAUDE.md, timeline rule). `compare` marks the rows whose place the plan puts at Gettysburg or its
immediate field; those alone are compared with the layer's arrivals by the Q20.2 reader. Other rows are carried for the record (their place is a town or route other than the field).
"""
import json
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OUT = os.path.join(BT, 'kit', 'cavalry_action_table.json')
MON = {6: 0, 7: 30}


def T(m, d, hh=0, mm=0):
    return (MON[m] + d - 1) * 1440 + hh * 60 + mm


def day(m, d):
    return T(m, d), T(m, d) + 1440


# (anchor first words in the plan, id, kind, compare, window kwargs, units, persons, extra)
R = []


def row(anchor, date_text, place, kind, compare, start, end, units, persons=(), basis='printed', scope='', notes='', inferred=None, cites=()):
    R.append(dict(anchor=anchor, date_text=date_text, place=place, kind=kind, compare=compare, start=start, end=end, units=list(units), persons=list(persons), window_basis=basis, scope_note=scope, notes=notes, inferred=inferred))


d = day
G1 = ['us-cav-1d-gamble', 'us-cav-1d-devin']
STUART = ['cs-cav-hampton', 'cs-cav-flee', 'cs-cav-chambliss']
row('Skirmish near Gettysburg', 'June 26', 'near Gettysburg (skirmish)', 'action', True, d(6, 26), d(6, 26), ['cs-2c-early-35vacavalrybn'], ['Lt Col Elijah White'], 'date_only',
    'the plan places the skirmish near Gettysburg', 'plan note: Early\'s June 26 cavalry detail beyond White not found; the layer first brings this battalion on July 1 (arrival ledger B.2.4): the two are not reconciled here')
row("Stuart's ride", 'June 25-July 2', 'Salem Depot to Rockville, Westminster, Hanover, Dover, Carlisle; reached Lee July 2', 'transit', False, (T(6, 25, 1, 0), T(6, 25, 1, 0)), d(7, 2), STUART, ['Stuart'], 'printed_start_date_only_end',
    'route through towns other than Gettysburg; the field arrival is the row of July 2 afternoon', 'Rockville wagon count 125+, about 150 or 140; Dover 2 a.m. or morning of July 1')
row('Buford enters Gettysburg', 'June 30, about 11 a.m.', 'Gettysburg', 'arrival', True, (T(6, 30, 11), T(6, 30, 11)), (T(6, 30, 11), T(6, 30, 11)), G1, ['Buford'], 'printed_about',
    'the first arrival of cavalry at Gettysburg; "about" 11 a.m. is carried as the point 11:00 with no tolerance invented', 'Buford\'s June 29 route and exact vedette positions not found')
row('Hanover', 'June 30, before 10 a.m. to evening', 'Hanover', 'action', False, (None, T(6, 30, 10)), d(6, 30), ['us-cav-3d-farnsworth', 'us-cav-3d-custer'] + STUART, ['Kilpatrick', 'Hampton'], 'printed_before_10am_end_date_only',
    'Hanover is a town other than Gettysburg', 'Forney farm fight ended just before noon; Hampton in place about 2 p.m.; about 2-hour artillery duel')
row('Buford\'s delaying action, McPherson', 'July 1, about 7:30 a.m.-about 10:20 a.m.', 'McPherson Ridge', 'action', True, (T(7, 1, 7, 30), T(7, 1, 7, 30)), (T(7, 1, 10, 20), T(7, 1, 10, 20)), G1, ['Buford', 'Calef'], 'printed_about',
    'the field', 'withdrawal "about 2 hours" (HistoryNet); every fourth man a horse holder; Gamble held its own for more than two hours')
row('Stuart at Dover and Carlisle', 'July 1', 'Dover, Carlisle', 'transit', False, d(7, 1), d(7, 1), [], ['Stuart'], 'date_only', 'towns other than Gettysburg', 'Dover morning; Carlisle afternoon/evening')
row('Buford relieved; movements', 'July 2', 'Gettysburg, then Taneytown, Westminster or Emmitsburg', 'action', True, d(7, 2), d(7, 2), G1, ['Buford'], 'date_only',
    'relieved on the field by Sickles\' corps; the later place is in conflict (three sources differ on place and day)', 'Taneytown (Buford\'s report), Westminster (HistoryNet July 2), Emmitsburg (Wikipedia Buford)')
row('Hunterstown, about 5 miles', 'July 2, evening/dusk', 'Hunterstown, about 5 miles NE of town', 'action', True, d(7, 2), d(7, 2), ['us-cav-3d-farnsworth', 'us-cav-3d-custer', 'cs-cav-hampton'], ['Custer', 'Hampton'], 'date_only',
    'the plan prints the place as about 5 miles NE of town', 'times of the charge not found; Hampton wounded at Hunterstown (Civil War News) vs only July 3 wounds in Hampton\'s report; artillery duel until dark')
row('Gregg at the Hanover/Low Dutch', 'July 2, noon-about 10 p.m.', 'Hanover/Low Dutch Road junction and Brinkerhoff Ridge', 'action', True, (T(7, 2, 12), T(7, 2, 12)), (T(7, 2, 22), T(7, 2, 22)), ['us-cav-2d-mcintosh', 'us-cav-2d-gregg'], ['McIntosh', 'I. Gregg'], 'printed_about',
    'the field', 'about 3 p.m. 10th NY skirmishers on Brinkerhoff Ridge; about 5 p.m. 2nd Va drove the 10th NY back; about 10 p.m. withdrew to the Baltimore Pike')
row('Stuart reaches Lee', 'July 2, afternoon', "Lee's headquarters", 'arrival', False, (T(7, 2, 12), d(7, 2)[1]), d(7, 2), [], ['Stuart', 'Hampton'], 'conflicting_readings',
    'a person\'s arrival; no unit is named, so no unit is compared', 'noon-1 p.m. with Hampton about an hour later (one Wikipedia fetch); mid-afternoon (ABT); afternoon (Wikipedia Stuart; Stuart\'s report "just in time"); evening (the brief). Window = from the earliest printed hour (noon) to the end of the day (evening, no hour printed)')
row('East Cavalry Field', 'July 3, about 11 a.m.-about 3 p.m.', 'East Cavalry Field', 'action', True, (T(7, 3, 11), T(7, 3, 13)), (T(7, 3, 14), T(7, 3, 15)),
    ['us-cav-2d-gregg', 'us-cav-2d-mcintosh', 'us-cav-3d-custer', 'cs-cav-hampton', 'cs-cav-flee', 'cs-cav-chambliss', 'cs-cav-jenkins'], ['Stuart', 'Custer', 'Gregg'], 'conflicting_readings',
    'the field', 'start about 11 a.m. (header), "just before noon" (HistoryNet), fighting from about 1 p.m.; Hampton\'s charge about 3 p.m. (HistoryNet); about 2 p.m. Custer relieved, about 3 p.m. reserves charged (Stone Sentinels); about 40 minutes of the charge phase',
    inferred='plan inference for scheduling: best shown as a 12-1 p.m. skirmish and artillery phase with a 2-3 p.m. climax (inferred)')
row('South Cavalry Field', 'July 3, about 1-5 p.m.', 'South Cavalry Field', 'action', True, (T(7, 3, 13), T(7, 3, 17)), (T(7, 3, 17), T(7, 3, 17)), ['us-cav-3d-farnsworth', 'us-cav-1d-merritt'], ['Farnsworth', 'Merritt'], 'conflicting_readings',
    'the field; the plan names the Reserve Brigade as a whole (the 6th US is also placed at Fairfield in the row of July 3: both are carried, not reconciled)', 'Farnsworth about 1:00 p.m.; Merritt about 3 p.m. on the Emmitsburg Road; HistoryNet puts the attack at about 5 p.m. and Merritt repulsed in about 15 minutes',
    inferred='plan inference for scheduling: charges at 3-5 p.m. after Pickett\'s repulse about 4 p.m., so 5 p.m. is more plausible than 1 p.m. for the charges, the earlier times being positioning (inferred)')
row('Fairfield', 'July 3', 'Fairfield', 'action', False, d(7, 3), d(7, 3), ['us-cav-1d-merritt-6us', 'cs-cav-jones'], ['Major Starr'], 'date_only',
    'Fairfield is a town other than Gettysburg', 'Union 6 killed, 28 wounded, 208 missing; Confederate 8/21/5; Union strength about 500 mounted (blog) vs about 400 (Wikipedia)')
row('Monterey Pass', 'July 4 night-July 5', 'Monterey Pass', 'action', False, (T(7, 4, 10), T(7, 4, 10)), d(7, 5), ['us-cav-3d', 'cs-cav-jones', 'cs-cav-robertson'], ['Kilpatrick'], 'printed_start_end_date_only',
    'a pass other than the field', 'wagons estimates 40-500; train length about 40 miles in the Monterey Pass summary')
row('Retreat assignments', 'July 4-10', 'retreat routes', 'transit', False, d(7, 4), d(7, 10), ['cs-cav-flee', 'cs-cav-imboden', 'cs-cav-robertson', 'cs-cav-jones', 'cs-cav-chambliss'], ['Baker', 'Ferguson'], 'date_only',
    'routes other than the field', 'train length 17 vs 30 miles (and about 40 in the Monterey Pass summary)')
row('Williamsport', 'July 6 (or 7)', 'Williamsport', 'action', False, (d(7, 6)[0], d(7, 6)[0]), d(7, 7), ['us-cav-1d-gamble', 'us-cav-1d-devin', 'us-cav-1d-merritt', 'cs-cav-imboden'], ['Buford', 'Imboden'], 'conflicting_readings',
    'a town other than Gettysburg', 'July 6 (Buford\'s report; Stone Sentinels) vs "by July 7" (Wikipedia) vs July 7 (Civil War News); Buford attacked about 4 p.m. and probed about 5 hours')
row('Boonsboro', 'July 8', 'Boonsboro', 'action', False, d(7, 8), d(7, 8), ['us-cav-3d', 'us-cav-1d'], ['Stuart', 'Kilpatrick', 'Buford'], 'date_only', 'a town other than Gettysburg', 'Union infantry arrived about 7 p.m.; Stuart withdrew to Funkstown (Funkstown July 10)')
row('Falling Waters', 'July 14', 'Falling Waters', 'action', False, d(7, 14), (T(7, 14, 12), T(7, 14, 12)), ['us-cav-3d-custer-6mi', 'us-cav-3d-custer-1mi', 'us-cav-1d-gamble-8ny'], ['Kilpatrick', 'Custer', 'Buford'], 'date_only_end_printed',
    'a place other than the field', 'last of Heth across about noon; the plan names the 1st Michigan with Gamble\'s brigade (the layer holds it in Custer\'s): not reconciled here')
row('Shepherdstown', 'July 16', 'Shepherdstown', 'action', False, d(7, 16), d(7, 16), ['us-cav-2d', 'cs-cav-flee', 'cs-cav-chambliss'], ['Gregg', 'F. Lee'], 'date_only', 'a town other than Gettysburg', 'no further detail printed in the table')


SOURCES = ['HistoryNet', "Wikipedia Stuart; ABT; Stuart's report (NPS)", 'HistoryNet; Wikipedia Day 1', 'Wikipedia Hanover; ABT', 'Wikipedia Day 1; HistoryNet; Buford report; Civil War News',
           "Stuart's report (NPS)", 'Buford report; HistoryNet; Wikipedia', "Wikipedia Hunterstown; Hampton's report (NPS)", 'Stone Sentinels; Stonewall Brigade site', None,
           "Wikipedia third-day cavalry; HistoryNet; Stone Sentinels; Hampton and Stuart reports", 'Wikipedia third-day cavalry; Wikipedia Farnsworth; HistoryNet', 'Wikipedia Fairfield', 'Wikipedia Monterey Pass',
           'Civil War News; ABT', 'Stone Sentinels; Buford report', 'Wikipedia Boonsboro; Civil War News', 'ABT; Emerging Civil War', 'Wikipedia Gregg']


def main(argv):
    plan = open(os.path.join(BT, 'BIBLE', 'plan-clean.txt'), encoding='utf-8').read().replace('\u2019', "'").split('\n')
    a = next(i for i, l in enumerate(plan) if l.startswith('B.6.15.3 Action-by-action table through time'))
    b = next(i for i in range(a, len(plan)) if plan[i].startswith('B.6.15.4 Dress and equipment'))
    page_at = []  # (line index, page)
    cur = None
    for i in range(0, b):
        m = re.match(r'=== PAGE (\d+) ===', plan[i])
        if m:
            cur = int(m.group(1))
        page_at.append(cur)
    # a footer "page N of 144" printed at the end of a page names that page for the lines before it
    foot = {i: int(re.search(r'page (\d+) of 144', plan[i]).group(1)) for i in range(a, b) if re.search(r'\| page (\d+) of 144', plan[i])}
    def page_of(i):
        later = [f for f in sorted(foot) if f >= i]
        return foot[later[0]] if later else (page_at[i] or None)
    pos = a + 1
    starts = []
    for r in R:
        j = next((i for i in range(pos, b) if plan[i].strip().startswith(r['anchor'].split(',')[0].strip()) or plan[i].strip() == r['anchor']), None)
        if j is None:
            sys.exit('anchor not found in the plan text: %r' % r['anchor'])
        starts.append(j)
        pos = j + 1
    rows = []
    for k, r in enumerate(R):
        s, e = starts[k], (starts[k + 1] - 1 if k + 1 < len(R) else b - 1)
        # trailing page footers/markers and the plan's inference paragraph are not part of the row's page span
        pages = sorted({page_of(i) for i in (s, e) if page_of(i)} | {page_of(i) for i in range(s, e + 1) if plan[i].strip() and not plan[i].startswith('===') and 'version 2 | page' not in plan[i] and not plan[i].startswith('Inferences for scheduling')} - {None})
        st, en = r['start'], r['end']
        if isinstance(st, int):
            st = (st, st)
        rows.append({'id': 'CAV-AT-%02d' % (k + 1), 'plan_ref': 'B.6.15.3', 'pages': pages, 'page': pages[0], 'plan_lines': [s + 1, e + 1], 'anchor': r['anchor'], 'date_text': r['date_text'], 'place': r['place'], 'kind': r['kind'],
                     'compare': r['compare'], 'scope_note': r['scope_note'], 'start_earliest': st[0] if st[0] is not None else None, 'start_latest': st[1], 'end_earliest': en[0] if isinstance(en, tuple) else en, 'end_latest': en[1] if isinstance(en, tuple) else en,
                     'window_basis': r['window_basis'], 'units': r['units'], 'persons': r['persons'], 'conflicts_and_notes': r['notes'], 'inferred_reading': r['inferred'], 'sources_printed': SOURCES[k],
                     'tier_printed': 'documented unless marked (plan convention)', 'tier': 'seeded_unverified'})
    # the plan's own printed source column per row is part of the row text: it is read back from the plan lines of the row
    for k, rw in enumerate(rows):
        seg = plan[rw['plan_lines'][0] - 1: rw['plan_lines'][1]]
        rw['row_text_first_lines'] = [x.strip() for x in seg[:4]]
    tbl = {'schema': 'bt-cavalry-action-table/1', 'plan_section': 'B.6.15.3', 'plan_title': 'Action-by-action table through time (June 26 to July 16)',
           'clock': 'minutes since 1863-06-01 00:00 LMT (app/src/clock.mjs); a time is present only where the plan prints one; start_earliest None = no earliest time printed',
           'rules': ['compare=true rows are those the plan places at Gettysburg or its field; only they are compared with the layer (Q20.2)', 'every row is seeded_unverified: the plan cites Wikipedia, HistoryNet and similar leads; no row is claimed documented here (CLAUDE.md Law cl. 4)', 'conflicts are carried as the earliest and latest printed readings'],
           'unit_id_rule': 'a unit_id names a layer unit or, as a prefix, every leaf below it (id == p or id startswith p + "-")', 'rows': rows}
    s = json.dumps(tbl, indent=1, ensure_ascii=False) + '\n'
    if '--check' in argv:
        return 0 if open(OUT, encoding='utf-8').read() == s else 1
    open(OUT, 'w', encoding='utf-8').write(s)
    print('wrote', os.path.relpath(OUT, ROOT), len(rows), 'rows')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
