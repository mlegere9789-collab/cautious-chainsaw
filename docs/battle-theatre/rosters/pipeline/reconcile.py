import json, re, os
from collections import Counter, defaultdict

OUT = '../../../../docs/battle-theatre/rosters/pilot'
W = json.load(open('../cache/wis6_classified.json'))
M = json.load(open('../cache/me20_final.json'))
N = json.load(open('../cache/nc26_classified.json'))
um = json.load(open('../cache/meg20_unmatched.json'))
par = [p for p in json.load(open('../cache/meg20_people.json'))]

rec = {}
rec['6th Wisconsin'] = dict(
    documented_strength=[
        dict(value=340, meaning='officers and enlisted men marched in the ranks of the regiment on 1 July 1863 (plus a brigade guard of 2 officers and 100 men attached from the brigade)', source='Dawes 1890, Service with the Sixth Wisconsin Volunteers, chapter The Sixth Wisconsin at Gettysburg (IA cu31924030918944), first paragraph', label='Documented'),
        dict(value=344, meaning='strength figure carried in the repository OOB file baseline/dist/data/oob/union_regiments_i_ii_corps.json (U-6WI), which cites Busey and Martin 1994 (not re-read this session: IA copy is lending-restricted)', label='Documented (second-hand)')],
    documented_casualties=[
        dict(value=168, meaning='30 killed, 116 wounded, 22 missing', source='Fox 1889, Regimental Losses, Sixth Wisconsin notes (IA reglossescivilwar00foxwrich)'),
        dict(value=169, meaning='2+28 killed, 7+109 wounded, 23 missing', source='Dawes 1890 appendix table Casualties in the Battle of Gettysburg, p.184 (image read)'),
        dict(value=168, meaning="Dawes footnote: 'Actual loss one hundred and sixty eight' against 160 in a letter", source='Dawes 1890')],
    rows=len(W), labels=dict(Counter(o['label'] for o in W)),
    named_casualty_rows=dict(
        killed_at_gettysburg=sum(1 for o in W if o['label'] == 'Present-Documented' and re.search(r'ill\w*.*(July\s*1|Gett)', o['remarks'], re.I)),
        wounded_or_other_gettysburg_remark=sum(1 for o in W if o['label'] == 'Present-Documented' and re.search(r'Gett|ettysb', o['remarks'], re.I)),
        officers_named_by_dawes=sum(1 for o in W if 'Dawes 1890' in o['why'])),
    by_company={c: dict(Counter(o['label'] for o in W if o['co'] == c)) for c in sorted(set(o['co'] for o in W))})

me_by_co = {}
for c in sorted(set(o['co'] for o in M)):
    rows = [o for o in M if o['co'] == c]
    me_by_co[c] = dict(return_rows=len(rows), present_documented=sum(1 for o in rows if o['label'] == 'Present-Documented'),
                       absent_documented=sum(1 for o in rows if o['label'] == 'Absent-Documented'),
                       unknown_on_roll=sum(1 for o in rows if o['label'] == 'Unknown'),
                       participants_without_return_row=sum(1 for p in um if p['co'] == c))
rec['20th Maine'] = dict(
    documented_strength=[
        dict(value=386, meaning='went into the fight with 386 all told, 358 guns (28 officers and 358 men present for duty equipped per the official reports)', source='Chamberlain report 6 July 1863, OR Series I vol 27 part 1 p.626 (IA warofrebellion012701rootrich); repeated in Maine at Gettysburg 1898 p.254-255'),
        dict(value=358, meaning='monument inscription: lost 130 killed and wounded out of 358 engaged', source='Maine at Gettysburg 1898 (IA maineatgettysbur01main), monument texts'),
        dict(value=386, meaning='repository OOB strength U-20ME (cites Busey and Martin)', label='Documented (second-hand)')],
    contested=[
        dict(item='names on the 1898 participants list', value=len([p for p in par if p.get('kind') in ('private', 'nco', 'detached')]) + 38 + 12, note='about 575 named persons (526 privates, NCOs and special-duty men parsed + about 50 officers and staff) against 386 in the official report. The 1898 note says some reported absent sick came up, and pioneers, provost guard and prisoners under arrest went into the ranks, which explains part but not all of the 189-name gap. Not resolved; needs the 30 June 1863 muster rolls.')],
    documented_casualties=[
        dict(value=130, meaning='38 killed or mortally wounded and 92 wounded', source='Maine at Gettysburg 1898 monument text'),
        dict(value=136, meaning='loss so far as I can ascertain it (30 killed)', source='Chamberlain OR report'),
        dict(value=41, meaning='killed and mortally wounded at Gettysburg', source='Fox 1889 20th Maine battle table')],
    named_casualties=dict(parsed=112, found_in_participants_list=111, note='regex parse of the Revised Report of Casualties finds 112 of about 130 names; 111 of 112 are also on the participants list'),
    rows=len(M), labels=dict(Counter(o['label'] for o in M)), participants_without_return_row=len(um), by_company=me_by_co)

nc_by_co = {}
doc = dict(A=97, B=92, C=80, D=79, E=104, F=91, G=91, H=78, I=74, K=99)
for c in 'ABCDEFGHIK':
    rows = [o for o in N if o['co'] == c]
    nc_by_co[c] = dict(moore_entries=len(rows), absent_documented=sum(1 for o in rows if o['label'] == 'Absent-Documented'),
                       present_documented=sum(1 for o in rows if o['label'] == 'Present-Documented'),
                       unknown_on_roll=sum(1 for o in rows if o['label'] == 'Unknown'),
                       on_roll_not_absent=sum(1 for o in rows if o['label'] != 'Absent-Documented'),
                       clark_present_for_duty_30_june_1863=doc[c])
rec['26th North Carolina'] = dict(
    documented_strength=[
        dict(value=885, meaning='aggregate present for duty, enlisted men, per the muster and pay rolls for 30 June 1863; 800 muskets taken into the first day after allowing 10 percent for extra duty and details', source='Clark 1901, Histories of the Several Regiments vol 2, 26th Regiment chapter (IA cu31924092908544) pp.371-374'),
        dict(value=843, meaning='repository OOB strength C-26NC (cites Busey and Martin)', label='Documented (second-hand)')],
    contested=[
        dict(item='casualty total', values={'repo OOB (Busey and Martin)': 588, 'Clark 1901 killed wounded missing first and third day': 708, 'Clark 1901 muster rolls 31 Aug 1863: killed and mortally wounded 139 plus wounded and missing 535': 674}, note='three different totals; Moore 1882 names only 512 men with a Gettysburg remark')],
    rows=len(N), labels=dict(Counter(o['label'] for o in N)), by_company=nc_by_co,
    company_officers_present=[
        'Clark 1901 p.371-372 lists the company officers present on 30 June 1863 and the officers absent (Mclver, Hays, Jordan detached; Ingram sick furlough)'])
json.dump(rec, open(f'{OUT}/reconciliation.json', 'w'), indent=1)
print(json.dumps({k: dict(rows=v['rows'], labels=v['labels']) for k, v in rec.items()}, indent=1))
print(rec['6th Wisconsin']['named_casualty_rows'])
