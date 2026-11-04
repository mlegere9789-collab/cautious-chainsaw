"""Write docs/battle-theatre/history/positions/POSITIONS_C_SUMMARY.md from positions_C.jsonl (+ hand-written reading notes below).
Run after tools/bt/positions_C_build.py:  PYTHONIOENCODING=utf-8 python -I tools/bt/positions_C_summary.py
Every claim id quoted in the text is looked up by code (byq), so a rebuilt claim file cannot leave a stale id in the summary."""
import os, sys, json, collections, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from or27_lib import ROOT, utf8_stdout
utf8_stdout()
D = os.path.join(ROOT, 'docs', 'battle-theatre', 'history')
CL = [json.loads(l) for l in open(os.path.join(D, 'positions', 'positions_C.jsonl'), encoding='utf-8')]
UN = {u['id']: u for u in json.load(open(os.path.join(D, 'units.json'), encoding='utf-8'))['units']}
BY = {c['claim_id']: c for c in CL}


def byq(unit, sub, rec=None):
    hits = [c for c in CL if c['unit_id'] == unit and ((c['source']['quote'] or '') + ' ' + c['activity']).find(sub) >= 0
            and (rec is None or (c['source']['report_id'] or '').endswith(rec))]
    if not hits:
        raise SystemExit('summary: no claim for %s / %r' % (unit, sub))
    return hits[0]['claim_id']


def pg(c):
    s = c['source']
    return ('%s p.%s%s' % ((s['report_id'] or '').replace('OR27-1-', '').replace('OR27-3-', 'P3-'), s['printed_page'], '*' if s['interpolated'] else ''))


def short(c, n=100):
    return c['activity'][:n] + ('...' if len(c['activity']) > n else '')


def when(c):
    w = c['when']
    return w['t_iso'].replace('T', ' ') if w['t_iso'] else (w['date'] + ' (' + (w['printed'] or '')[:40] + ')')


def key(c):
    w = c['when']
    return w['t_iso'] or ((w['date'] or '') + 'T99:99')


out = []
P = out.append
N = len(CL)
cnt = collections.Counter(c['tier'] for c in CL)
P('# Positions and approach roads, SCOPE C (V Corps, VI Corps, Artillery Reserve, army headquarters and staff)')
P('')
P('Source: Official Records, Ser. I vol. 27 (pt.1 reports, pt.3 correspondence); the OR is the only evidence used. No secondary source was needed (tmp/library/misc not used). Claim file: `history/positions/positions_C.jsonl` (%d records: %d documented, %d inferred, %d open gap). Built by `tools/bt/positions_C_build.py` from `tools/bt/pos_C/specs_*.py`; this file by `tools/bt/positions_C_summary.py`.' % (N, cnt['documented'], cnt['inferred'], cnt['open gap']))
P('')
P('How the claims were made and checked: each claim names an index record and a verbatim anchor phrase (under 15 words) that the build locates BY CODE inside that record and re-verifies with `or27_find.verify()`; the printed page comes from the index page model (a `*` after a page below means INTERPOLATED, i.e. a page inside a run of lost running heads; the claim file stores the range). 0 build errors, 0 `validate_provenance.validate()` problems. Nothing here chooses between conflicting reports or changes a default, gate or tier elsewhere. Every claim is `weak_source: false`, `flag_single_source: true` (one report each; where two reports agree they are two claims).')
P('')
P('Reading limits: V Corps reports R187-R222, VI Corps R223-R242, Artillery Reserve R315-R335, Hunt R028, Meade R006 (narrative and enclosures read, pp.114-127; the rest searched), Itinerary R007, Organization R009, Norton R017, Ingalls R024, Letterman R016, Newton R030, Howard R243 (the Cemetery Hill passages), neighbours where they speak of a scope-C unit (Birney R133, Geary R293, Cobham R303), and %d Part 3 correspondence documents located by search' % len({c['source']['report_id'] for c in CL if (c['source']['report_id'] or '').startswith('OR27-3')}) + '. Regimental claims exist only where a regimental or higher report gives the regiment its own position or movement; brigade claims are not copied down to regiments.')
P('')

# ------------------------------------------------------------------ coverage table
P('## 1. Coverage by unit')
P('')
P('Verdict rule: **full** = the OR gives an approach (march or route to the field), a position on the field with an hour on July 2, a position or relief on July 3, and the withdrawal/departure; **partial** = at least one claim but one of those is missing or only second-hand; **none** = no claim. "Road" = a named road or route of approach is documented for the unit (by its own report or a corps/division report that speaks of it); "Position" = a position on the field is documented. Times are the printed ones (t_iso only where a clock time is printed); earliest and latest are over all claims for the unit, including pre- and post-battle marches.')
P('')
ROWS = [
 ('us-5c', 'Sykes', 'Liberty (Jun 29) - Union Mills via Johnsville, Union (Jun 30) - Hanover (Jul 1, relieved Kilpatrick) - left Hanover 7 p.m. - McSherrystown - Bonaughtown (midnight) - Gettysburg, 4 a.m. start; route over the last stretch is the Hanover/Gettysburg road (named by Ayres, Adams, Crawford)', 'yes', 'Jul 2: massed at the Rock Creek bridge on the Baltimore pike, then (3 p.m. order) to Little Round Top / the left; Jul 3 on the left; Jul 5 Marsh Creek', 'full', 'Corps report, itinerary, Part 3 dispatch of 12.30 a.m. Jul 2, Hunt and Meade; the arrival hour is in conflict (section 4).'),
 ('us-5c-1d', 'Barnes', 'Union Mills - Hanover (about 4 p.m.) - after-midnight halt "about 2 miles" from Gettysburg - field about 7 a.m. Jul 2; afternoon move "up by the Taneytown road"', 'yes (Taneytown road for the afternoon move; the morning road is not named in Barnes)', 'right of the Second Division south of the village; orchard on the left of the road; 4-6 p.m. to the left, Little Round Top and the woods south of Rose house', 'full', 'Division report plus three brigade reports; Jul 5 withdrawal (Griffin relieved Barnes) in R189-R190.'),
 ('us-5c-1d-tilton', 'Tilton', 'with the division (Hanover-Gettysburg; Taneytown road in the afternoon)', 'partial (no brigade-level road)', 'woods south of Rose house 4.30 p.m., retired to the right of the Second Division; Jul 3 relieved the Third Brigade on Little Round Top', 'full', 'Own report (R192) is short and has no march; the march is from Barnes and Rice. 18th Mass. detached and 118th Pa. refused line have regiment claims.'),
 ('us-5c-1d-sweitzer', 'Sweitzer', 'Unionville/Union Mills - Hanover - bivouac "4 or 5 miles" from the field after midnight - led the division at daylight', 'yes', 'orchard above the bridge on the turnpike, then wood facing an open field; wheat-field advance; night on the right of the First Brigade; left evening of Jul 5', 'full', 'Own report R193; distance to the field in conflict (2 / 3 / 4-5 miles).'),
 ('us-5c-1d-vincent', 'Vincent / Rice', 'Liberty - Union Mills - Hanover 3 p.m. - left 5 p.m. - 3 miles from Gettysburg at 1 a.m.; 4 a.m. start; position about 4 p.m. on the extreme left', 'yes', 'Little Round Top (extreme left) from about 4 p.m. (2.30 per Woodward); Round Top crest night of Jul 2; relieved Jul 3 forenoon; centre in reserve; left Jul 5', 'full', 'Rice, Chamberlain, Welch, Conner, Woodward, Lamont, Clark; departure time of Jul 5 in conflict.'),
 ('us-5c-2d', 'Ayres', 'Frederick - Liberty (Jun 29) - 23 miles Jun 30 - "Gettysburg and Hanover road" night of Jul 1-2, line of battle in rear of and facing that road (right: First Division)', 'yes (named: Hanover road)', 'massed left and centre; afternoon Round Top hill (Weed) and the wooded rocky point 350 yards ahead (Day, Burbank); night in rear of Weed; left Jul 5 to Marsh Creek', 'full', 'Division report R203 is poor OCR; supported by Adams (4th US) "Hanover and Gettysburg road, 5 miles east of Gettysburg".'),
 ('us-5c-2d-day', 'Day', 'with the division; 4th US night "5 miles east" of Gettysburg on the Hanover and Gettysburg road, broke camp 4 a.m.', 'yes (via Adams)', 'brigade moved to the front about 5 p.m. (Dunn), 4 p.m. (14th US), 4.30 (6th US); night wood in rear of Hazlett; Jul 4 reconnaissance; Jul 5 5 p.m. Emmitsburg road', 'partial', 'Day wrote no report (R204 is a casualty note); every fact is regimental. Positions are by regiment, brigade hour in conflict.'),
 ('us-5c-2d-burbank', 'Burbank', 'arrived "in the vicinity of the enemy" the morning of Jul 2 (2nd US bivouac 5 miles out, up at 3.30 a.m.)', 'partial (no road)', 'left on the right of the XII Corps at first; 2 miles left; 5 p.m. advance; marsh and stone wall; reformed in rear of the battery', 'partial', 'Own report R211 and five regimental reports; no departure claim in the brigade reports (Adams/Sheridan give Jul 5 5 p.m. for the sister brigade).'),
 ('us-5c-2d-weed', 'Weed (k) / Garrard', 'with the division; idle till about 4 p.m.', 'partial (no road)', 'Round Top ridge (summit with Hazlett; 91st left, 146th and 155th right); stone wall built that night; stayed Jul 3', 'partial', 'Garrard R217; no march or departure claim from the brigade.'),
 ('us-5c-3d', 'Crawford', 'night march Jul 1-2; at daylight near McSherrystown; noon at the First and Second Divisions\' position near the Gettysburg and Hanover turnpike; 2 p.m. order; guided by Capt. Moore', 'yes (Hanover turnpike, McSherrystown)', 'right of the road near the left flank; stone wall and woods; Jul 3 5 o\'clock advance', 'full', 'Crawford R218, Sykes dispatches (D0935, D1001).'),
 ('us-5c-3d-mccandless', 'McCandless', 'arrived on the field about 1 p.m. (printed "3d", July 2 by sense)', 'partial', 'rocky hillside near the left from 5 p.m.; stone wall; evening of Jul 3 advance; relieved about noon Jul 4', 'partial', 'R219; arrival hour in conflict with Crawford (noon).'),
 ('us-5c-3d-fisher', 'Fisher', 'with the division', 'partial', 'left of Sykes\' corps (extreme left); 10 p.m. up Round Top (Chamberlain 9 p.m.); stone wall in the ravine the morning of Jul 3', 'partial', 'R220 short; the 9th and 10th regiments only by elimination (inferred).'),
 ('us-5c-art', 'Martin', 'Frederick-Union Mills with the corps; Gibbs: marched all night Jul 1, in position about 8 a.m. right of the Baltimore pike', 'partial', 'artillery entered the field 4-5 p.m. (Martin, Hunt) - Gibbs 8 a.m. (conflict); Hazlett on Rock Hill [Round Top] 4.30 p.m.; Walcott and Watson taken by Sickles\' staff', 'full', 'R221, R222, Hunt R028.'),
 ('us-6c', 'Sedgwick', 'Hyattstown (Jun 28) - New Windsor (Jun 29) - Westminster, Manchester (Jun 30) - ordered to Taneytown (Jul 1 4.30 p.m.) - left about 9-10 p.m. - crossed the Baltimore and Gettysburg pike, re-ordered by Littlestown - Gettysburg 3-5 p.m.', 'yes (conflict on the road: section 3)', 'Jul 2 5 p.m. left centre (Wheaton, Eustis, Bartlett); Russell, Torbert reserve; Neill to the right (Slocum); Grant extreme left; Jul 3 placements; Jul 5 Fairfield road', 'full', 'Sedgwick R223, Wright R224, Meade, Part 3.'),
 ('us-6c-1d', 'Wright', 'Manchester camp - Taneytown order - Baltimore and Gettysburg pike - "broad and excellent pike leading direct to Gettysburg"; arrival about 4 p.m., two-hour halt', 'yes', 'Jul 2 night: Third Division and Bartlett moved into position, Torbert and Russell in reserve; Jul 3 Torbert to centre, Russell to extreme left; Jul 4 Round Top slope; Jul 5 across the valley', 'full', 'R224.'),
 ('us-6c-1d-torbert', 'Torbert', 'left near Manchester about 10 p.m.; "by 4 p.m." Jul 2; coffee halt about 1 p.m.', 'partial (route not named)', 'left of the line at dark; Jul 3 front and centre (on Newton\'s orders); picket line Wiebecke; Jul 5 3 a.m. rejoined and led the corps', 'full', 'R225.'),
 ('us-6c-1d-bartlett', 'Bartlett / Upton', 'Manchester toward Taneytown 10 p.m.; near Westminster destination changed (Upton); 3.30 p.m. (Upton) or "a little after 5 p.m." (Bartlett)', 'yes (Westminster, per Upton; conflict with Wright\'s pike)', 'second line behind the Fifth Corps; Jul 3 5 p.m. with Crawford; Jul 4 supported Day; Jul 5 5 a.m.', 'full', 'R226, R227.'),
 ('us-6c-1d-russell', 'Russell', 'evening of Jul 2 (Russell) / by 4 p.m. (corps)', 'partial', 'extreme left Jul 3; centre in the afternoon; Jul 4 relieved a Fifth Corps portion on the hill left of centre', 'partial', 'R228, whose Jun 28 hour (4 p.m.) conflicts with Wright (4 a.m.).'),
 ('us-6c-2d', 'Howe', 'left Manchester 1 a.m. (printed July 3; Jul 2 by sense) - 5 p.m. at the field, 33 miles', 'partial (no road)', 'Neill supporting artillery on a key-point; the rest with the Fifth Corps; two batteries to the extreme left', 'partial', 'R229 is brief.'),
 ('us-6c-2d-grant', 'Grant (Vermont Brigade)', 'about 30 miles that day, arrived about 5 p.m.', 'partial (no road)', 'left centre then extreme left after dark; Jul 3 right on Round Top Mountain, left on the Taneytown road', 'full', 'R230, brigade report of Aug 3 (the June 6-8 Fredericksburg reports in the same record are not used).'),
 ('us-6c-2d-neill', 'Neill', 'arrived on the field in the evening after a march of 30 miles (hour OCR-lost)', 'partial', 'height crowned by a battery; Slocum\'s front; midnight back; Jul 3 extreme right; Jul 5 rejoined', 'partial', 'R231. Re-rated from full after the fidelity re-check: the arrival hour on July 2 is OCR-lost ("Gp. m.") and the one printed clock phrase, "At midnight", is the midnight ending July 2 (corrected from a t_iso 24 hours too early); no readable hour for a July 2 position.'),
 ('us-6c-2d-1brig', '(none)', 'none: not with the army', 'n/a', 'not on the field (footnote of the organization, R009)', 'n/a (documented absence)', 'Source: ' + byq('us-6c-2d-1brig', 'First Brigade in division') + ' (R009 footnote) only.'),
 ('us-6c-3d', 'Newton -> Wheaton', 'see Shaler, Nevin, Eustis', 'partial', 'see brigades', 'partial', 'No division report (open gap).'),
 ('us-6c-3d-shaler', 'Shaler', 'with the division', 'partial (route in Nevin\'s report)', '7 p.m. left in rear of the Second Brigade; Jul 3 8 a.m. (8.45 per Geary) to Geary on the right; 3.30 p.m. to Newton', 'full', 'R232 and Geary R293 and Cobham R303; positions of Jul 3 in conflict (Sedgwick: left centre).'),
 ('us-6c-3d-eustis', 'Eustis', 'none of its own', 'no', 'left centre 5 p.m. (Sedgwick); extreme left (Rogers); right centre Jul 3 (Sedgwick)', 'partial', 'No report by Eustis (open gap); only a regiment (2nd R.I.), the corps commander and Birney.'),
 ('us-6c-3d-wheaton', 'Wheaton / Nevin', 'Manchester 9 p.m. - a mile across the Gettysburg pike, countermarched - Littlestown 8 a.m. - within 2 miles of Cemetery Hill 2 p.m.', 'yes (Littlestown, Gettysburg pike)', 'to the left of Round Top 4.30 p.m.; first line of the division; supported Crawford; 6 p.m. Jul 3 reconnaissance; 102nd Pa. at Westminster', 'full', 'R234-R237.'),
 ('us-6c-art', 'Tompkins', 'Edwards Ferry - Hyattstown - Sam\'s Creek - Manchester; batteries: Littlestown (3rd NY about noon; 1st NY; 1st RI G; 1st RI C)', 'partial', 'under Hunt; Cowan with Newton and Webb; McCartney near the cemetery; Adams near Hazlett; 2usd, 2usg, 5usf no claim', 'partial', 'No Tompkins report; three batteries no claim.'),
 ('us-art-reserve', 'Tyler', 'Frederick - Bruceville (Jun 29) - Taneytown (Jun 30, Emmitsburg turnpike) - brigades Ransom and Fitzhugh left Taneytown about sundown Jul 1 - the rest at dawn Jul 2; park on a cross-road between the main road and the Baltimore turnpike, reported about 10.30', 'yes (Taneytown road)', 'park behind the III Corps line; batteries sent out from 3.30 p.m.; Jul 3 batteries in line, works built; Jul 5 3 p.m. to Littlestown', 'full', 'R315, R316, R007.'),
 ('us-art-reserve-ransom', 'Ransom (wounded)', 'Taneytown - Gettysburg, left about sundown Jul 1 (Tyler) / Jul 2 (Weir)', 'partial', 'crest near Meade\'s headquarters; Weir 500 yards right and front 4 p.m.; Turnbull near the Emmitsburg road; Eakin Cemetery Hill; Thomas on the crest', 'partial', 'No report by Ransom; only Weir (R317) and Tyler/Hunt.'),
 ('us-art-reserve-mcgilvery', 'McGilvery', 'Taneytown - 10 a.m. park (9th Mass.)', 'partial', 'Peach Orchard line from 3.30-4.30 p.m.; new line 400 yards back; Jul 3 line of 39 guns; works', 'full', 'R318-R323.'),
 ('us-art-reserve-taft', 'Taft', 'see batteries', 'partial', 'brigade split (inferred): Taft to the cemetery, Sterling forward, B and M at Westminster', 'partial', 'R009 and unit reports; Sterling no report.'),
 ('us-art-reserve-huntington', 'Huntington', 'Taneytown - Gettysburg about noon-10 a.m.', 'partial', 'Cemetery Hill (Osborn, Wainwright), 4-4.30 p.m. batteries', 'partial', 'No brigade report; five battery reports.'),
 ('us-art-reserve-fitzhugh', 'Fitzhugh', 'Taneytown - field about 8 a.m. (Fitzhugh), or Jul 1 evening (Tyler)', 'partial', 'Baltimore pike near Slocum\'s line (K, A NJ); Rigby 500 yards west of the pike; Dow and Ames on the left; Jul 3 K and A NJ near Webb', 'full', 'R330-R334.'),
 ('us-aop-hq', 'Meade (army headquarters)', 'Frederick (Jun 27-28) - Middleburg (Jun 29) - Taneytown (Jun 30-Jul 1) - left 10 p.m. (Meade) / after midnight (Butterfield) - field 1 a.m. (Meade) / 2 a.m. (Hunt) / cemetery gate about 3 a.m. (Howard)', 'yes', 'cemetery gate / "near Cemetery Hill"; council in a room not over 10 ft square; Jul 3 at Slocum\'s headquarters during the assault; evening of Jul 3 a strip of woods on the Taneytown road; Jul 4 Baltimore pike; Jul 6-7 to Frederick', 'full', 'R006, R007, R017, R028, R243, R030, Part 3; staff officers separately in 2.'),
]
cl_by_unit = collections.defaultdict(list)
for c in CL:
    cl_by_unit[c['unit_id']].append(c)
P('| unit | commander | claims (own / with subordinate units) | earliest | latest | road of approach | position on the field | verdict | why |')
P('|---|---|---|---|---|---|---|---|---|')
verd = collections.Counter()
for uid, cmd, road, roadflag, pos, ver, why in ROWS:
    cs = [c for c in cl_by_unit.get(uid, []) if c['tier'] != 'open gap']
    n = len(cs)
    ng = len([c for c in cl_by_unit.get(uid, []) if c['tier'] == 'open gap'])
    if cs:
        ks = sorted(cs, key=key)
        e, l = ks[0]['when']['t_iso'] or ks[0]['when']['date'], ks[-1]['when']['t_iso'] or ks[-1]['when']['date']
    else:
        e = l = '-'
    nm = UN[uid]['name']
    P('| %s (%s) | %s | %d%s / %d | %s | %s | %s: %s | %s | **%s** | %s |' % (uid, nm, cmd, n, (' + %d gap' % ng) if ng else '', len([c for c in CL if c['tier'] != 'open gap' and (c['unit_id'] == uid or c['unit_id'].startswith(uid + '-'))]), e, l, roadflag, road, pos, ver, why))
    if uid not in ('us-5c', 'us-5c-1d', 'us-5c-2d', 'us-5c-3d', 'us-6c', 'us-6c-1d', 'us-6c-2d', 'us-6c-3d', 'us-art-reserve', 'us-aop-hq'):
        verd[ver.split(' ')[0]] += 1
P('')
P('Brigade-level verdicts (excluding corps and division rows and the Artillery Reserve/HQ rows): %s.' % dict(verd))
P('')
P('Regiments and batteries with their own claims are listed in the claim file under their own unit ids; regiments with NO claim of their own (named only in the order of battle or in brigade-level passages): 22nd Mass. and 1st Mich. have a diagram claim only (garbled), the following have none: 1st, 3rd and 15th NJ; 5th Maine, 95th and 96th Pa.; 6th Maine, 49th Pa., 119th Pa., 5th Wis.; 2nd, 3rd, 5th, 6th Vt.; 7th Maine, 33rd, 43rd, 49th, 77th NY, 61st Pa.; 7th, 10th and 37th Mass.; Batteries 2usd, 2usg, 5usf; Battery K 3rd US has a claim only through the Turnbull passages. Their brigade positions are in the brigade rows.')
P('')

# ------------------------------------------------------------------ gaps
P('## 2. Brigades and units with no claim, and reports searched')
P('')
P('Open-gap records (kind `open gap`) in the claim file, each with three targeted searches whose hit counts were run by code at build time (see the `gap.searches` field):')
P('')
for c in CL:
    if c['tier'] == 'open gap':
        P('- **%s** %s - %s' % (c['claim_id'], c['unit_id'], c['activity']))
        for s in c['gap']['searches']:
            P('  - search %s' % s)
        if c['note']:
            P('  - note: %s' % c['note'])
P('')
P('Units in scope with NO claim at all: Battery D 2nd US (Williston), Battery G 2nd US (Butler), Battery F 5th US (Martin) - open gaps; no brigade in scope is without a claim. The following brigades have claims only at second hand (no report by their commander): Eustis, Day (a casualty note only), Weed/Garrard (report by Garrard exists: first-hand), Ransom, Taft, Huntington, Tompkins, and Wheaton as division commander.')
P('')
P('Reports and records read for the scope are listed in the header. Reports confirmed ABSENT from the volume index for scope-C units: Eustis (2nd Brig., 3rd Div., VI), Wheaton/Newton (3rd Div., VI), Tompkins (VI art.), Williston, Butler, L. Martin (VI batteries), Huntington (3rd Vol. Brig.), Ransom (1st Reg. Brig.), Sterling (2nd Conn. Battery), Hull (62nd Pa., named in R193), Thomas (4th US C), Turnbull (3rd US F/K), Eakin/Mason (1st US H), Warren, Butterfield, Patrick (operations), Hazlett (killed), Seeley (III Corps).')
P('')

# ------------------------------------------------------------------ roads
P('## 3. Approach roads by division and corps (these decide where units enter the map)')
P('')
P('Rows are claims; (*) = interpolated page. The OR names roads only occasionally. Where a road is named it is shown verbatim in the claim (`place.direction_or_road`); where only a town sequence is given it is shown as a route.')
P('')
RR = [
 ('V Corps', [('us-5c', 'Left Frederick; marched to and encamped'), ('us-5c', 'Marched to Union Mills, via Johnsville'), ('us-5c', 'Marched to Hanover, and relieved'), ('us-5c', 'I left Hanover at 7 p. m.'), ('us-5c', 'At 7 p. m. resumed the march', 'R187'), ('us-5c', 'via Hanover and McSherrystown'), ('us-5c', 'Marched at 4 a. m. for Gettysburg'), ('us-5c', 'Sykes has been ordered up from Hanover'), ('us-5c', 'via Liberty, Union Mills; Hanover')]),
 ('V Corps, 1st Division', [('us-5c-1d', 'for Hanover, where it arrived'), ('us-5c-1d', 'halting after midnight about 2 miles'), ('us-5c-1d', 'the division reached Gettysburg at about 7'), ('us-5c-1d', 'moved rapidly up by the Taneytown road')]),
 ('V Corps, 2nd Division', [('us-5c-2d', 'on the night of July 1 and 2 on the Gettysburg and Hanover road'), ('us-5c-2d-day-4us', 'passed on the Hanover and Gettysburg road'), ('us-5c-2d-day-3us', 'left at 6 p. m. same day')]),
 ('V Corps, 3rd Division', [('us-5c-3d', 'encamp between Frizellburg and this place'), ('us-5c-3d', 'Crawford\'s division had not reached Hanover'), ('us-5c-3d', 'having marched nearly all the previous night'), ('us-5c-3d', 'by noon had arrived at the position occupied')]),
 ('V Corps, departure Jul 5', [('us-5c', 'you can move out on the road to Emmitsburg'), ('us-5c', 'My camp is on the south side of this creek'), ('us-5c-1d-vincent-20me', 'took up our march on the Emmitsburg road')]),
 ('VI Corps', [('us-6c', 'move your command up to Taneytown to-night'), ('us-6c', 'the corps being in camp near Manchester'), ('us-6c', 'some time after crossing the Baltimore and Gettysburg pike'), ('us-6c', 'toward Gettysburg by Littlestown'), ('us-6c', 'General Sedgwick was on the way with him to Taneytown'), ('us-6c', 'formed on the broad and excellent pike'), ('us-6c-3d-wheaton', 'countermarched to the pike'), ('us-6c-3d-wheaton', 'passed through Littlestown'), ('us-6c-1d-bartlett', 'its destination was changed to Gettysburg'), ('us-6c-art-1rig', 'entered the Westminster and Gettysburg turnpike'), ('us-6c-art-3ny', 'passed through Littlestown, Pa., about noon')]),
 ('Artillery Reserve', [('us-art-reserve', 'Marched from Frederick City'), ('us-art-reserve', 'encamped a short distance beyond the village'), ('us-art-reserve', 'I was ordered to proceed to Gettysburg with about eight batteries'), ('us-art-reserve', 'reported to Gibbon at about 10.30'), ('us-art-reserve', 'on the Taneytown road, near the cross-road leading to Two Taverns'), ('us-art-reserve', 'left Taneytown at early dawn'), ('us-art-reserve', 'held in reserve on a cross-road between the main road and the Baltimore turnpike'), ('us-art-reserve-fitzhugh', 'Arriving on the field from Taneytown about 8 a. m.')]),
 ('Army headquarters', [('us-aop-hq', 'Headquarters Army of the Potomac moved from Frederick to Middleburg'), ('us-aop-hq', 'Headquarters Army of the Potomac moved from Middleburg to Taneytown'), ('us-aop-hq', 'I broke up my headquarters'), ('us-aop-hq', 'after waiting until 12 to see you'), ('us-aop-hq', 'and proceeded to the field, arriving there at 1 a. m.'), ('us-aop-hq', 'reached Gettysburg about 2 a. m.'), ('us-aop-hq', 'met me at the cemetery gate')]),
]
for title, items in RR:
    P('**%s**' % title)
    P('')
    P('| claim | when | place / road | source |')
    P('|---|---|---|---|')
    for it in items:
        cid = byq(it[0], it[1], it[2] if len(it) > 2 else None)
        c = BY[cid]
        pl = c['place']['printed'] or ''
        rd = c['place']['direction_or_road']
        P('| %s %s | %s | %s%s | %s |' % (cid, c['unit_id'], when(c)[:40], pl[:90], ('; road: ' + rd) if rd else '', pg(c)))
    P('')
P('Reading of the roads (for placement; every statement is a claim above, none is an owner decision):')
P('')
P('- **V Corps** reached Gettysburg from Hanover by the Hanover-Gettysburg road through McSherrystown and Bonaughtown (itinerary, Sykes\'s 12.30 a.m. dispatch, Ayres "Gettysburg and Hanover road", Adams, Crawford "Gettysburg and Hanover turnpike"). The corps left Hanover at 7 p.m. (Sykes, Part 3 and itinerary; Rice 5 p.m.; Sheridan 6 p.m.), halted at Bonaughtown or 2-5 miles from the town, and resumed at 4 a.m. Arrival on the field: Williams at headquarters at 6.15 a.m. "momentarily expected"; Barnes and Chamberlain about 7 a.m.; Sykes about 8 a.m.; Meade "by 7 a.m."; the 2nd U.S. (Lee) reports taking position at "about 1 1/2 miles southeast of the town" after a 3.30 a.m. start. The afternoon move to the left was by the Taneytown road (Barnes, Sykes).')
P('- **VI Corps** left the Manchester area about 9-10 p.m. July 1 on orders for Taneytown, then (Butterfield 11 p.m.) "toward Gettysburg by Littlestown"; Wright says the corps had crossed the Baltimore and Gettysburg pike when it was redirected and then used "the broad and excellent pike leading direct to Gettysburg"; Upton says the change came near Westminster; the Third Division and the batteries passed through Littlestown (Nevin 8 a.m.; Harn noon). Arrival 3-5 p.m. (see conflicts). Entered by "the broad and excellent pike leading direct to Gettysburg" (printed; that this is the Baltimore pike is the compiler\'s identification, not printed in Wright\'s sentence, and the road field of that claim now carries the printed words only) and by the Littlestown road for the Third Division and batteries, then to the area behind Cemetery Hill and to the left.')
P('- **Artillery Reserve**: Frederick - Bruceville - Taneytown (Emmitsburg turnpike); Ransom\'s and Fitzhugh\'s brigades went on from Taneytown the evening of Jul 1 (reported to Gibbon about 10.30 p.m.); the rest left at early dawn Jul 2 under McGilvery and parked on a cross-road between the Taneytown road and the Baltimore turnpike about 10.30 a.m. (Tyler; individual battery arrivals 8-10.30 a.m., noon for one).')
P('- **Army headquarters**: Taneytown until 10 p.m. (Meade) or midnight (Butterfield), arriving at the field 1-2 a.m. and at the cemetery gate by about 3 a.m.')
P('')

# ------------------------------------------------------------------ conflicts
P('## 4. Conflicts between reports (both values; none resolved)')
P('')
P('Each group is a connected set of `conflicts_with` links in the claim file (links are symmetric). External ids C-nnn are rows of the conflict register that the same fact belongs to; this file does not change them.')
P('')
adj = collections.defaultdict(set)
for c in CL:
    for o in c['conflicts_with']:
        if o in BY:
            adj[c['claim_id']].add(o)
            adj[o].add(c['claim_id'])
seen = set()
groups = []
for cid in sorted(adj):
    if cid in seen:
        continue
    st = [cid]
    comp = []
    while st:
        x = st.pop()
        if x in seen:
            continue
        seen.add(x)
        comp.append(x)
        st.extend(adj[x] - seen)
    groups.append(sorted(comp))
gnum = 0
for comp in sorted(groups, key=lambda g: key(BY[g[0]])):
    gnum += 1
    ext = sorted({o for m in comp for o in BY[m]['conflicts_with'] if o not in BY})
    P('**G%02d** %s%s' % (gnum, short(BY[comp[0]], 70), ('  [register: %s]' % ', '.join(ext)) if ext else ''))
    for m in sorted(comp, key=lambda x: key(BY[x])):
        c = BY[m]
        P('- %s %s - %s - %s (%s) - "%s"' % (m, c['unit_id'], when(c)[:48], short(c, 90), pg(c), (c['source']['quote'] or '')[:70]))
    P('')
P('Other register links not tied to a pair above: C-001 (Meade reaches Gettysburg: Meade 1 a.m. / Hunt about 2 a.m. / Howard about 3 a.m. at the cemetery gate; none supports "about 04:00"), C-003 (V Corps arrival Jul 2), C-022 (VI Corps arrival), C-024 (council of war), C-010 (III Corps advance: Meade rode out about 3 p.m.), C-028/C-029/C-030 (Jul 3 guns: Hunt 1 p.m., Meade 1 p.m.).')
P('')
P('Cannonade onset on July 3, Union witnesses in this scope (group above): Ames about 10 a.m.; Dow about 11; Tyler about 12; McGilvery about 12.30; Hunt, Meade, Sykes, Phillips about 1 p.m.; Taft and Edgell about 1.30; Gillett about 2; McMahon 3 p.m.')
P('')

# ------------------------------------------------------------------ gates
P('## 5. Differences from `arrivals.json` (Q04 gates) - reported, nothing changed')
P('')
P('- **Artillery Reserve, gate "date floor Jul 2 00:00"**: Tyler (R315) has Ransom\'s and Fitzhugh\'s brigades leaving Taneytown about sundown on July 1 and reporting to Gibbon at Gettysburg about 10.30 p.m. on July 1 (%s). That is before the floor; Fitzhugh (R330) has his own arrival about 8 a.m. July 2 (%s); Weir (R317) dates the departure from Taneytown to July 2 (%s).' % (byq('us-art-reserve', 'reported to Gibbon at about 10.30'), byq('us-art-reserve-fitzhugh', 'Arriving on the field from Taneytown'), byq('us-art-reserve-ransom', 'marched to within a mile and a half')))
P('- **V Corps, gate earliest 05:00 / default 08:00**: the 2nd U.S. (Lee, R212) left a bivouac 5 miles out at about 3.30 a.m. and took position near Gettysburg (about 1 1/2 miles southeast of the town) (%s); the 14th US (Giddings) left at 4 a.m. and the 4th US (Adams) at 4 a.m. and marched 3 miles. These are earlier on the map than the gate\'s earliest 05:00 for the corps head. Williams at 6.15 a.m. says the corps was not yet up (%s).' % (byq('us-5c-2d-burbank-2us', 'About 3.30 a. m.'), byq('us-5c', 'the Fifth is momentarily expected')))
P('- **VI Corps, gate earliest 14:00, main body 17:00**: Meade has the Sixth Corps arriving at 3 p.m. (%s), Nevin halted within 2 miles of Cemetery Hill at 2 p.m. (%s), Upton arrived about 3.30 p.m. (%s), Wright about 4 p.m. (%s), Howe and Bartlett about 5 p.m. These are consistent with the gate; no VI Corps claim is earlier than 14:00 on the field.' % (byq('us-6c', 'At 3 p. m. the Sixth Corps arrived'), byq('us-6c-3d-wheaton', 'halted at 2 p. m.'), byq('us-6c-1d-bartlett', 'its destination was changed'), byq('us-6c', 'where it arrived about 4 p. m.')))
P('- **Army headquarters, gate 00:00-04:00 (default 01:00)**: Meade 1 a.m.; Hunt about 2 a.m.; Howard about 3 a.m. at the cemetery gate; all inside the gate window. The ledger text "Jul 3: Leister house made untenable ... Meade moves to Powers Hill" is not in the OR passages read: the OR says Meade was at "General Slocum\'s headquarters" during the assault (Norton) and that in the evening the headquarters went to "a strip of woods on the Taneytown road"; the ledger uses neither of these names.')
P('- **Artillery Reserve strength**: ledger 106 guns / about 2,300 men; Tyler "one hundred and eight guns" (%s).' % byq('us-art-reserve', 'The one hundred and eight guns'))
P('- **Gate for the 20th Maine "21:00 on Round Top"**: Chamberlain says 9 p.m., Fisher 10 p.m.; Rice implies the ground was in hand by 9.')
P('')

# ------------------------------------------------------------------ OCR
P('## 6. OCR problems met')
P('')
P('- Records graded `poor` in the index that contribute claims (every claim from them carries `ocr_uncertain: true`): R203 Ayres, R204 Day, R205 Sheridan (3rd US), R199 Elliott, R202 Lamont, R225 Torbert, R240 Harn, R241 Waterman, R242 Adams, R332 Rigby, R335 Ewing.')
P('- Date digits 2/3: Barnes "morning of Jidy 3" (July 2), Bootes "morning of the 3d" (July 2), Adams "On the morning of July 3" (July 2), McCandless "1 p. m. of the 3d instant" (July 2; no longer read from the glyph), Moody "afternoon of the 3d" (July 2), Howe "left Manchester at 1 a. m. on July 3" (no t_iso after the re-check; the other brigade reports have the departure on July 1 at 9-10 p.m.), Martin "At 3 a. m. on the 8d instant" (July 3), Dow "7.80 p. m." (7.30), Cowan "On the 38th of June" (28th), Newton "July 3. - In obedience to an order ... dated July 1" (July 2). The claim date is the sense-reading and the printed form is in `when.printed` and the note.')
P('- Hour digits: Sykes dispatch "13.30 a. m." (12.30 a.m. by sense: the text says he left Hanover at 7 p.m. and marched 9 miles), Butterfield "13.30 p. m." (12.30), Neill "Gp. m." (unreadable, no t_iso), Woodward "2. .30 p. m." (2:30), Weir "1.3( o clock", Rice "5 [p. m.J", Thompson "5 p. m. ^^ +iVo 9,1 instant", McCandless "0 p. m." (unreadable).')
P('- Names: "Bniceville" (Bruceville), "Bonaughtoivn/Bonaughtown", "Morits Cross-Eoads" (Moritz), "Unionville" in Sweitzer (Union Mills in the other V Corps reports), "Sixteenth Massachusetts" in Conner (the 16th Michigan), "Second [Sixth?] Corps" in Rice and Lamont, "Sixth Maiiie". The dump of R227 begins "Hdqrs. 131st New York" (121st).')
ip = collections.Counter((c['source']['report_id'] or '').replace('OR27-1-', '').replace('OR27-3-', 'P3-') for c in CL if c['source']['interpolated'])
P('- Interpolated pages (the running head was lost): %d claims carry `interpolated: true` with a page range; by record: %s.' % (sum(ip.values()), ', '.join('%s %d' % kv for kv in sorted(ip.items()))))
P('- Part 3 segmentation: D1003 holds two letters (Butterfield to Mendell, 5 a.m., and to Sedgwick, 5.30 a.m.); D1001 holds Sykes\'s 12.30 a.m. dispatch and Butterfield\'s 2.40 a.m. letter; D0983 is indexed with Slocum as signer but is Butterfield\'s letter to Sedgwick (the text quoted is verified). The claims quote the text, not the index header.')
P('')

# ------------------------------------------------------------------ index gaps
P('## 7. Index gaps')
P('')
P('- Part 1 contains no report for: Eustis, the Third Division VI Corps commander, Tompkins, Williston, Butler and L. Martin (VI batteries), Huntington, Ransom, Sterling, Thomas, Turnbull, Eakin/Mason, Warren, Butterfield, Patrick (operations), Hull (62nd Pa.). None is in the Part 1 contents list (378 entries) on which the index is built, so these are absences from the printed contents list, not search misses; the searches in the open-gap records confirm no passage carries their report.')
P('- Meade\'s report (R006) is one composite record with about a hundred dispatches and enclosures (OR27-NOTES.md); only pp.114-127 were read (narrative, 1864 corrections, council letters). Enclosures for July 1-5 elsewhere in the record (Meade to Halleck dispatches) were not read page by page for headquarters locations.')
P('- Part 3 has no document-level contents list; documents were found by index header search and phrase search and read directly. Hours of Part 3 documents are datelines or text hours as printed.')
P('- Second-witness diff of the OCR (HathiTrust) is not done (OR27-NOTES.md, item 1): every digit is single-witness OCR.')
P('')
P('## 8. Identifications made by the compiler (not in the OR text)')
P('')
P('- Gazetteer ids were attached only where the place resolves: GZ-039 Baltimore Pike for "Baltimore and Gettysburg pike"; GZ-042 Taneytown Road; GZ-041 Emmitsburg Road; GZ-009/GZ-010 for "Round Top" where the context fixes the hill (Little Round Top where Hazlett\'s battery and Weed stood; Big Round Top for the crest Chamberlain took at night; Rice/Garrard use "Round Top" for both); GZ-003 Cemetery Hill; GZ-004 for "the cemetery gate"; GZ-007 The Angle for "Webb\'s position" (flagged in each note); GZ-014 Peach Orchard. Where the passage does not decide, `gazetteer_ref` is null and the printed phrase stands.')
P('- Nine inferred claims carry their reasoning: Fisher\'s 9th and 10th Reserves by elimination (2), Taft\'s brigade split, Slocum\'s headquarters hill, Newton\'s "one battery from the Sixth Corps"; and, after the fidelity re-check, the footnote asterisk on 1st Conn. Heavy Batteries B and M (2; the footnote text is not in the OCR of p.168) and the left-to-right order of the 22d Mass./1st Mich./118th Pa. line (2; garbled diagram).')
P('')
fc = collections.Counter(c.get('fidelity_check') for c in CL)
P('## 9. Fidelity re-check (full-passage read, 2026-10-20)')
P('')
P('Every non-gap claim (%d) was re-read against at least 1,200 characters on each side of the cited passage; no claim was skipped (the 14 open gaps have no cited passage). fidelity_check: passed_full_read %d, corrected %d, downgraded %d, not_rechecked %d (the open gaps). claim_support_verified is true only for documented claims with passed_full_read or corrected (%d). Details, patterns and rates: `RECHECK_C_NOTES.md`; the repairs are in `tools/bt/pos_C/fid/fid_*.py` and are applied by `positions_C_build.py`.' % (len([c for c in CL if c['tier'] != 'open gap']), fc['passed_full_read'], fc['corrected'], fc['downgraded'], fc['not_rechecked'], sum(1 for c in CL if c['claim_support_verified'])))
P('')
P('Verdict change: us-6c-2d-neill full -> partial (section 1). No other brigade rating rested on a claim whose clock time or date was removed.')
P('')
open(os.path.join(D, 'positions', 'POSITIONS_C_SUMMARY.md'), 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
print('wrote summary', len(out), 'lines')
