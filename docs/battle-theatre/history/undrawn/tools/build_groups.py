"""Builds docs/battle-theatre/history/undrawn/groups.json and sources.json.

    node docs/battle-theatre/history/undrawn/tools/derive_status.mjs          (first: what the layer draws now -> status.json)
    python3 -I docs/battle-theatre/history/undrawn/tools/build_roster_gaps.py   (the units of the OR tables the roster lacks -> roster-gaps.json)
    python3 -I docs/battle-theatre/history/undrawn/tools/build_groups.py        (this file)
    python3 -I docs/battle-theatre/history/undrawn/tools/build_groups.py --check  (fails if groups.json is stale or a unit is in no group or in two)

What is written by hand here: the group table (id, title, the formations it covers, the notes, the texts outside the indexes).
Everything else is computed: the units and what is missing (status.json), the Official Records reports of a group (the reports the
five position ledgers already cite for its units, and the reports that stand between them in the table of contents and are cited
by no claim), the sections of the indexed state volumes by state, number and arm, the troop-map labels and the ledger claims
already held for the units.
"""
import os, re, sys, json, glob, hashlib, collections
HERE = os.path.dirname(os.path.abspath(__file__))
UND = os.path.abspath(os.path.join(HERE, '..'))
BT = os.path.abspath(os.path.join(UND, '..', '..'))
ROOT = os.path.abspath(os.path.join(BT, '..', '..'))
J = lambda p: json.load(open(p, encoding='utf-8'))
rel = lambda p: os.path.relpath(p, ROOT).replace(os.sep, '/')

# ------------------------------------------------------------------------------------------------ the group table (by hand)
# roots: a unit belongs to the group whose root is the nearest of its ancestors (itself included). '=' before an id: that unit alone, not what is under it.
G = [
 ('us-hq-artres', 'Union army headquarters, Hancock, the Artillery Reserve and its guards', ['=us-aop', 'us-aop-hq', 'us-hancock-acting', 'us-art-reserve', 'us-4nj-train-guard'],
  'The two headquarters entries have a gate and no figure: who stood at headquarters (staff, the provost guard and orderlies of the table) is to be established before anything is drawn. 22 reserve batteries are placed; three consolidated batteries are drawn as two units each; Company C of the 32d Massachusetts and the 4th New Jersey train guard are listed as never on the field on a weak key while the table prints them with the Reserve; the footnote of the two Connecticut heavy batteries is lost in the OCR.',
  ['MEADE-LL-v1', 'MEADE-LL-v2', 'BACH-STORY-1904', 'BACH-REPULSE-1870', 'BACH-KEY-1864', 'JACOBS-1864', 'FOX', 'BL3']),
 ('us-1c-1d-art', 'Union I Corps: corps entry, Wadsworth\'s division (Meredith, Cutler) and the artillery brigade (Wainwright)', ['=us-1c', 'us-1c-1d', 'us-1c-art'],
  'All 17 leaf units are placed (the corps-level road only, AP-01). Open: an arrival of each regiment\'s own and of each battery, the places of 2 and 3 July, strengths, the road of each brigade on 1 July, Battery E attached to Battery L, the headquarters company (First Maine Cavalry, Company L).',
  ['IN-1913', 'FOX', 'BL3', 'BACH-STORY-1904']),
 ('us-1c-2d-3d', 'Union I Corps: Robinson\'s division (Paul, Baxter) and Doubleday/Rowley\'s division (Rowley/Biddle, Stone, Stannard)', ['us-1c-2d', 'us-1c-3d'],
  'All 21 leaf units are placed (the corps-level road only, AP-01). Open: an arrival of each regiment\'s own, the places of 2 and 3 July, strengths, the transfer of the 11th Pennsylvania to the First Brigade on the afternoon of 1 July, the 12th and 15th Vermont (train guard, not engaged by the table\'s footnote), Stannard\'s brigade on 2 and 3 July.',
  ['VT-GB-1914', 'VT-MON-1890', 'FOX', 'BL3', 'BACH-STORY-1904']),
 ('us-2c-1d-art', 'Union II Corps: corps entry, Caldwell\'s division and the artillery brigade (Hazard)', ['=us-2c', 'us-2c-1d', 'us-2c-art'],
  'All 23 leaf units are placed by the corps-level road (AP-33, a position statement read as the road). Open: an arrival of each regiment\'s own and of each battery, the days without a place, strengths, the headquarters company (Sixth New York Cavalry, Companies D and K), the 14th New York Battery attached to Battery B, 1st New York Light.',
  ['MN-1ST-1916', 'OH-8TH-1889', 'NJ-TOOMBS-1888', 'IN-1913', 'BACH-STORY-1904', 'FOX', 'BL3']),
 ('us-2c-2d-3d', 'Union II Corps: Gibbon/Harrow\'s division (Harrow, Webb, Hall) and A. Hays\' division (Carroll, Smyth, Willard)', ['us-2c-2d', 'us-2c-3d'],
  'All 27 leaf units are placed by the corps-level road (AP-33, a position statement read as the road). Open: an arrival of each regiment\'s own, the days without a place, strengths, the Minnesota sharpshooter company attached to the 1st Minnesota.',
  ['HASKELL-1908', 'MN-1ST-1916', 'OH-8TH-1889', 'OH-DED-1887', 'NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'BACH-REPULSE-1870', 'BACH-STORY-1904', 'FOX', 'BL3']),
 ('us-3c-1d', 'Union III Corps: corps entry, Birney\'s division and the artillery brigade', ['=us-3c', 'us-3c-1d', 'us-3c-art'],
  'All 24 leaf units are placed (Emmitsburg Road, AP-02). Open: an arrival of each regiment\'s own (Graham and Ward on 1 July, de Trobriand on 2 July), the places of 3 July, strengths.',
  ['IN-1913', 'FOX', 'BL3']),
 ('us-3c-2d', 'Union III Corps: Humphreys\' division (Carr, Brewster, Burling)', ['us-3c-2d'],
  '12 regiments of Carr and Brewster are not drawn: the only road printed for the division (Black Horse Tavern road, AP-07) lies outside the loaded ground. To find: the road by which the division came ONTO the ground after its counter-march (Humphreys OR27-1-R158; delegated default C-002: bivouac at 1 a. m. on 2 July), the bivouac, the line of 2 July and its changes, 3 July. The 84th Pennsylvania is documented absent (EG-E-84PA). Burling\'s six regiments are placed.',
  ['NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'FOX', 'BL3']),
 ('us-5c', 'Union V Corps (Barnes, Ayres, Crawford, Martin)', ['us-5c'],
  '39 leaf units are placed, 24 of them by a MODELLED road (Hanover Road, sibling rule DEC-015, register EG-0070): the road of each division is to be documented or the modelled one confirmed. The 32d Massachusetts is not drawn at all: the roster holds it as a formation whose only child is Company C (headquarters guard of the Artillery Reserve). Open: arrivals, the days without a place, strengths, the headquarters companies.',
  ['FOX', 'BL3']),
 ('us-6c-1d-2d', 'Union VI Corps: corps entry, Wright\'s division (Torbert, Bartlett/Upton, Russell) and Howe\'s division (Grant, Neill)', ['=us-6c', 'us-6c-1d', 'us-6c-2d'],
  '17 leaf units are placed by the corps-level road (Baltimore Pike, AP-12); the 6 regiments of Neill\'s brigade wait at the edge of the ground with no place after arrival. Open: where each brigade was sent on the evening of 2 July and on 3 July, an arrival of each brigade\'s own, strengths, the provost guard (4th New Jersey, three companies) and the headquarters companies; the table says the Second Division had no First Brigade.',
  ['VT-GB-1914', 'VT-MON-1890', 'NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'FOX', 'BL3']),
 ('us-6c-3d-art', 'Union VI Corps: Newton/Wheaton\'s division (Shaler, Eustis, Wheaton/Nevin) and the artillery brigade (Tompkins)', ['us-6c-3d', 'us-6c-art'],
  '17 leaf units are placed by the corps-level road (Baltimore Pike, AP-12); the 4 regiments of Wheaton/Nevin\'s brigade wait at the edge of the ground with no place after arrival. Open: where each brigade and each battery was sent on the evening of 2 July and on 3 July, an arrival of each brigade\'s own, strengths, the 102d Pennsylvania (train guard).',
  ['VT-GB-1914', 'VT-MON-1890', 'NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'FOX', 'BL3']),
 ('us-11c', 'Union XI Corps: corps entry, Barlow/Ames\', von Steinwehr\'s and Schurz\'s divisions and the artillery brigade (Osborn)', ['us-11c'],
  '17 leaf units are placed (Emmitsburg Road: AP-10 for the First Division, AP-42 for the Second Division, which rests on one inferred claim of a state volume with a conflicting claim listed, AP-43 for Wiedrich\'s battery). 10 regiments of Schurz\'s division and 4 batteries are not drawn: Howard\'s order names only the road past Horner\'s Mills (concordance RC-07, unresolved) and ledger E a route through the town. To find: the road by which the division and each battery entered the loaded ground (the Taneytown road or the Emmitsburg road must be PRINTED for them, not assumed), the hour, the lines north of the town on 1 July, the retreat, Cemetery Hill on 2 and 3 July. Open for all: arrivals of their own, the places of 2 and 3 July, strengths, the headquarters companies.',
  ['OH-DED-1887', 'FOX', 'BL3']),
 ('us-12c', 'Union XII Corps (Williams/Ruger, Geary, Lockwood, Muhlenberg)', ['us-12c'],
  'All 32 leaf units are placed. Open: arrivals of their own, the days without a place, strengths, the provost guard (10th Maine), the status of Lockwood\'s brigade (unassigned during the battle by the table).',
  ['NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'OH-DED-1887', 'IN-1913', 'FOX', 'BL3']),
 ('us-cav-1d', 'Union cavalry: corps entry and Buford\'s division (Gamble, Devin, Merritt)', ['=us-cav', 'us-cav-1d'],
  'Gamble\'s and Devin\'s 8 regiments are not drawn (ledger E prints the approach as via Boonsboro and Fairfield, the Fairfield road; RC-08 cannot place it); Merritt\'s 5 regiments wait at the edge on the Emmitsburg Road (AP-05). The division is the first on the field (gate 30 June 11:00): to find its road into Gettysburg on 30 June, the camps and vedette lines of that night, the lines of 1 July hour by hour, its withdrawal on 2 July (departure), Merritt\'s arrival and line on 3 July; the 6th United States on 3 July. Riders, horses and dismounted lines are read by the cavalry model once a regiment is placed.',
  ['IN-1913', 'FOX', 'BL3']),
 ('us-cav-2d-3d-art', 'Union cavalry: D. Gregg\'s division (McIntosh, J. I. Gregg), Kilpatrick\'s division (Farnsworth, Custer) and the horse artillery', ['us-cav-2d', 'us-cav-3d', 'us-cav-art'],
  'Gregg\'s 9 regiments are placed (Hanover Road). 8 regiments of Kilpatrick\'s division are not drawn: the documented siblings of the corps name different roads and ledger E gives the division an approach from the east by Hunterstown and Two Taverns with different continuations per brigade (none chosen). To find, per brigade: the road and hour onto the loaded ground on 2 and 3 July, Hunterstown (2 July, outside the ground: state it), Custer on the Hanover road and the East Cavalry Field on 3 July, Farnsworth south of the Round Tops on 3 July. The horse artillery is one roster entry that is not drawn: its 9 batteries are not in the roster (ids pre-assigned in roster-gaps.json); each needs the division it served with, its road, its positions and its strength. Also: the 1st Massachusetts (with the Sixth Corps by the table), the Purnell Legion company, Rank\'s section, the headquarters guards, Huey\'s brigade (a non-lead source for its absence).',
  ['NJ-TOOMBS-1888', 'NJ-FINAL-1891', 'VT-GB-1914', 'VT-MON-1890', 'FOX', 'BL3']),
 ('cs-1c-mclaws', 'Confederate First Corps: corps entries and McLaws\' division (Kershaw, Barksdale, Semmes, Wofford, Cabell)', ['=cs-1c', 'cs-1c-art', 'cs-1c-mclaws'],
  'Semmes\' 4 and Wofford\'s 6 units are not drawn: a sibling road exists (Chambersburg Pike, on Kershaw\'s report) but they have no single-label day position. The table says no reports are on file for Semmes\' brigade; the index holds no report of McLaws, Barksdale, Semmes or Wofford. To find: the march of 2 July and its counter-march, the line before the attack, the advance, the night line, 3 July; the four batteries of Cabell\'s battalion (reports R435 to R440); the basis of the sixth unit the roster lists under Wofford. The roster entry cs-1c-art (I Corps artillery) is a ledger grouping of the batteries that the roster files under the divisions and the Reserve (no figure, no children): a `unit` record (action status) says whether it names a unit of its own.',
  ['ALEXANDER-1907', 'LONGSTREET-1896', 'FREMANTLE-1864', 'SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-1c-pickett', 'Confederate First Corps: Pickett\'s division (Garnett, Kemper, Armistead, Dearing)', ['cs-1c-pickett', 'cs-corse-hanover-junction'],
  '15 regiments are not drawn: a sibling road exists but sheet 3 prints several labels the line states do not order. The index holds only Peyton\'s report for Garnett\'s brigade (R441) and Dearing\'s (R442); no report of Pickett, Kemper or Armistead. To find: the arrival on the afternoon of 2 July and the bivouac, the march to the field on 3 July, the line behind the guns, the order of regiments in each brigade, the advance and its stages, the return; Dearing\'s four batteries; Corse\'s brigade (a non-lead source for its absence).',
  ['ALEXANDER-1907', 'LONGSTREET-1896', 'FREMANTLE-1864', 'SHSP-04', 'SHSP-05', 'SHSP-06', 'SHSP-12', 'BACH-REPULSE-1870', 'BACH-STORY-1904', 'BL3']),
 ('cs-1c-hood-resart', 'Confederate First Corps: Hood\'s division (Law, Robertson, Anderson, Benning, Henry) and the corps reserve artillery (Alexander, Washington Artillery)', ['cs-1c-hood', 'cs-1c-res-art'],
  'All 26 leaf units are placed by a MODELLED road (Chambersburg Pike, sibling rule DEC-015, register EG-0070: AP-50 for the 19 units of Hood\'s division, AP-51 for the 7 of the Reserve artillery). Open: Law\'s separate march from New Guilford, the road of each brigade documented, the places of 3 July, the four batteries of Henry\'s battalion and the four companies of the Washington Artillery (not in the roster), strengths.',
  ['ALEXANDER-1907', 'LONGSTREET-1896', 'FREMANTLE-1864', 'SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-2c-early', 'Confederate Second Corps: corps entry, Early\'s division (Hays, Smith, Hoke/Avery, Gordon, Jones\' battalion, 35th Virginia Cavalry Battalion)', ['=cs-2c', 'cs-2c-early', 'cs-13va-winchester', 'cs-58va-winchester'],
  '18 units are placed (Harrisburg Road = the Heidlersburg road, RC-01). Jones\' artillery battalion is not drawn: Brown prints the York road for it, Early the Heidlersburg road (approach block): both stay as scenarios unless a battery report settles it. Also: the four batteries, the corps escort (Randolph\'s company), the 13th and 58th Virginia (a non-lead source for Winchester), the places of 2 and 3 July, strengths.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-2c-johnson', 'Confederate Second Corps: Johnson\'s division (Steuart, Stonewall, Nicholls/Williams, J. M. Jones, Latimer)', ['cs-2c-johnson'],
  '17 regiments of Steuart, the Stonewall Brigade and Jones are not drawn: the reports print the road from Scotland, which the repository cannot place. To find: the road by which the division entered the loaded ground on the evening of 1 July (printed, not assumed), its passage of the town and the railroad, the line east of Rock Creek, the attacks of 2 and 3 July per brigade, the Stonewall Brigade on Brinkerhoff\'s Ridge, the withdrawal. Nicholls\' five regiments and the artillery battalion are placed; the four batteries are not in the roster.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-2c-rodes-resart', 'Confederate Second Corps: Rodes\' division (Daniel, Doles, Iverson, Ramseur, O\'Neal, Carter) and the corps reserve artillery (Dance, Nelson)', ['cs-2c-rodes', 'cs-2c-res-art'],
  'Rodes\' 23 units are placed (Carlisle Road = the Middletown road, RC-02). Dance\'s and Nelson\'s battalions are not drawn (the documented siblings of the corps name different roads): Brown\'s report (R468) and the battery reports are to give the road and the positions of each. Open: the places of 2 and 3 July, the batteries of the three battalions (not in the roster), strengths.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-3c-anderson', 'Confederate Third Corps: corps entry and R. H. Anderson\'s division (Wilcox, Mahone, Wright, Perry/Lang, Posey, Sumter battalion)', ['=cs-3c', 'cs-3c-anderson'],
  'All 22 leaf units are placed on the Chambersburg Pike: 13 by the corps-level road (AP-31), Wilcox\'s 5 and Wright\'s 4 by the roads printed for their own brigades (AP-18, AP-32). Open: an arrival of each brigade\'s own on 1 July, the line of 2 July and the advance of each brigade, 3 July, the three companies of the Sumter battalion (not in the roster), strengths.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'ALEXANDER-1907', 'BL3']),
 ('cs-3c-heth', 'Confederate Third Corps: Heth\'s division (Pettigrew, Brockenbrough, Archer, Davis, Garnett\'s battalion)', ['cs-3c-heth', 'cs-44nc-hanover-junction'],
  'All 18 leaf units are placed. Open: arrivals of their own on 1 July, the day of rest on 2 July, the line and the advance of 3 July under Pettigrew, the four batteries (not in the roster), the 44th North Carolina (a non-lead source for Hanover Junction), strengths.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-3c-pender-resart', 'Confederate Third Corps: Pender\'s division (Perrin, Lane, Thomas, Scales, Poague) and the corps reserve artillery (McIntosh, Pegram)', ['cs-3c-pender', 'cs-3c-res-art'],
  'All 22 leaf units are placed. Open: arrivals of their own, the places of 2 and 3 July (Lane and Scales under Trimble on 3 July), the batteries of the three battalions (not in the roster), strengths.',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'BL3']),
 ('cs-cav-hq', 'Confederate cavalry (Hampton, Fitz. Lee/Chambliss, Jenkins, the horse artillery, Robertson, W. E. Jones, Imboden) and army headquarters', ['=cs-anv', '=cs-cav-div', 'cs-anv-hq', 'cs-cav-hampton', 'cs-cav-flee-chambliss', 'cs-cav-jenkins', 'cs-cav-horse-art', 'cs-cav-robertson-jones-imboden'],
  '10 regiments of Fitz. Lee and Chambliss are not drawn (only earlier marches are printed for them), Jenkins\' 5 units and the horse artillery entry are not drawn, and Hampton\'s 6 wait at the edge on the Hunterstown Road (AP-06). The index holds Stuart\'s (R565) and Hampton\'s (R567) reports for the battle; the other cavalry reports in it are of Brandy Station and Aldie. To find: the arrival of each brigade on 2 July (gate: dusk), the bivouac, the march to the right on 3 July and the road it used, the lines on the East Cavalry Field, the withdrawal; Jenkins\' brigade with Ewell on 1 and 2 July and on the East Cavalry Field on 3 July; each horse battery\'s brigade and positions (the 6 horse batteries and Jackson\'s battery are not in the roster); the 1st Maryland Battalion served with Ewell\'s corps by the table; Lee\'s headquarters (the army headquarters has a gate and no figure: who was there); a non-lead source for where Robertson, W. E. Jones and Imboden were (Fairfield and the trains lie outside the loaded ground: say so, nothing is drawn there).',
  ['SHSP-04', 'SHSP-05', 'SHSP-06', 'SHSP-11', 'SHSP-12', 'FREMANTLE-1864', 'LONGSTREET-1896', 'BL3']),
]
STATE_VOLS = {'ny': ['NY1', 'NY2', 'NY3'], 'pa': ['PA1', 'PA1B', 'PA2'], 'me': ['ME'], 'mi': ['MI']}
STATE_TEXTS = {'nj': ['NJ-TOOMBS-1888', 'NJ-FINAL-1891'], 'vt': ['VT-GB-1914', 'VT-MON-1890'], 'oh': ['OH-DED-1887'], 'in': ['IN-1913'], 'mn': ['MN-1ST-1916']}

def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()

def build_sources():
    """Every text a record may cite: the three parts of OR vol. 27, the ten indexed volumes, the other local texts. Paths under tmp/ (untracked)."""
    S = collections.OrderedDict()
    orman = J(os.path.join(ROOT, 'tmp/library/or27/MANIFEST.json')) if os.path.exists(os.path.join(ROOT, 'tmp/library/or27/MANIFEST.json')) else {}
    for part, ident in ((1, 'cu31924077699761'), (2, 'cu31924077728255'), (3, 'cu31924077700262')):
        p = os.path.join(ROOT, 'tmp/library/or27', ident + '_djvu.txt')
        S['OR27-%d' % part] = {'kind': 'or27', 'part': part, 'title': 'Official Records, Series I, volume 27, part %d' % part, 'archive_identifier': ident, 'path': rel(p), 'present': os.path.exists(p), 'sha256': sha(p) if os.path.exists(p) else None,
                               'class': 'primary', 'locator': 'report_id (docs/battle-theatre/library/or27_index.json) + printed_page + quote_offset', 'verify': 'python3 -I tools/bt/or27_find.py --verify "QUOTE" --part %d' % part}
    ix = J(os.path.join(BT, 'library/statevol_index.json'))
    for v in ix['volumes']:
        cands = glob.glob(os.path.join(ROOT, 'tmp/library/ws9/**/*' + v['file']), recursive=True) + glob.glob(os.path.join(ROOT, 'tmp/library/misc', v['file']))
        p = cands[0] if cands else os.path.join(ROOT, 'tmp/library/misc', v['file'])
        ok = os.path.exists(p) and sha(p) == v['sha256']
        S[v['key']] = {'kind': 'statevol', 'key': v['key'], 'title': v['cite'], 'catalogue_id': v['source_id'], 'archive_identifier': v['file'].replace('_djvu.txt', ''), 'path': rel(p), 'present': os.path.exists(p), 'sha256': v['sha256'], 'sha256_matches_index': ok,
                       'class': 'secondary (a state commission volume: addresses of the regiment\'s own officers are the documented tier, the compiler\'s narrative is inferred)' if v['key'] not in ('FOX', 'BL3') else 'secondary',
                       'locator': 'section (docs/battle-theatre/library/statevol_index.json) + printed_page + quote_offset', 'verify': 'python3 -I tools/bt/statevol_find.py --verify "QUOTE" --vol %s' % v['key']}
    acq = J(os.path.join(BT, 'GOVERNANCE/library/acquired_2.json'))
    for it in acq['items']:
        p = os.path.join(ROOT, it['local_path'])
        if it['id'] in S: continue
        news = it['id'].startswith(('ADAMS-SENTINEL', 'GBG-COMPILER'))
        S[it['id']] = {'kind': 'text', 'title': (it.get('title') or '')[:160], 'year': it.get('date'), 'creator': it.get('creator'), 'archive_identifier': it.get('archive_identifier'), 'path': it['local_path'], 'present': os.path.exists(p), 'sha256': it.get('sha256'),
                       'class': 'newspaper of 1863 (weekly)' if news else 'secondary or memoir: say which in the record (source.author_role)', 'locator': 'quote_offset (no page model: give printed_page only when a running head beside the passage prints it)', 'verify': 'python3 -I docs/battle-theatre/history/undrawn/tools/check_undrawn.py --verify "QUOTE" --source %s' % it['id']}
    return S

def main():
    check = '--check' in sys.argv
    st = J(os.path.join(UND, 'status.json')); U = st['units']; by = {u['id']: u for u in U}
    gaps = J(os.path.join(UND, 'roster-gaps.json'))
    # ---- units to groups
    root_of = {}
    for gid, title, roots, note, texts in G:
        for r in roots:
            only = r.startswith('='); rid = r.lstrip('=')
            assert rid in by, 'unknown root ' + rid
            assert (rid, only) not in root_of, 'root twice ' + rid
            root_of[(rid, only)] = gid
    def group_of(uid):
        if (uid, True) in root_of: return root_of[(uid, True)]
        x = uid
        while x:
            if (x, False) in root_of: return root_of[(x, False)]
            x = by[x]['parent']
        return None
    assign = {u['id']: group_of(u['id']) for u in U}
    orphans = [k for k, v in assign.items() if v is None]
    assert not orphans, 'units in no group: ' + ', '.join(orphans)
    # ---- ledger claims per unit and per report
    cited = collections.defaultdict(collections.Counter); led_n = collections.defaultdict(collections.Counter)
    for f in sorted(glob.glob(os.path.join(BT, 'history/positions/positions_[A-E].jsonl'))):
        L = os.path.basename(f)[10]
        for line in open(f, encoding='utf-8'):
            if not line.strip(): continue
            c = json.loads(line); s = c.get('source') or {}; uid = c.get('unit_id')
            if uid not in by: continue
            led_n[assign[uid]][L] += 1
            rid = s.get('report_id') or s.get('record_id')
            if rid: cited[rid][assign[uid]] += 1
            if s.get('section'): cited[s['section']][assign[uid]] += 1
    orx = J(os.path.join(BT, 'library/or27_index.json'))['records']
    recs = [r for r in orx if r['part'] in (1, 2) and r['id'].count('-R')]
    rep_by_group = collections.defaultdict(list); last = None
    for r in recs:
        cc = cited.get(r['id'])
        row = {'id': r['id'], 'author': ((r.get('rank') or '') + ' ' + (r.get('author') or '')).strip()[:60], 'scope': (r.get('unit_scope') or r.get('toc_text') or '')[:110], 'pages': '%s-%s' % (r.get('start_page'), r.get('end_page')), 'claims': sum(cc.values()) if cc else 0}
        if cc:
            for g, n in cc.items(): rep_by_group[g].append(dict(row, claims=n))
            last = cc.most_common(1)[0][0]
        elif last and r['part'] == (1 if last.startswith('us') else 2) and r.get('kind') == 'report':
            rep_by_group[last].append(dict(row, claims=0, note='stands in the table of contents after a report cited for this group; no ledger claim cites it: not read, or read with no result'))
    p3 = collections.defaultdict(list)
    for r in orx:
        if r['part'] == 3 and r['id'] in cited:
            for g, n in cited[r['id']].items(): p3[g].append({'id': r['id'], 'claims': n})
    # ---- state volume sections by unit
    ix = J(os.path.join(BT, 'library/statevol_index.json')); secs = ix['sections']
    def sections_for(u):
        m = re.search(r'-(\d+)([a-z]{2})([a-z]*)$', u['id'])
        if not m or not u['leaf']: return []
        num, stt = int(m.group(1)), m.group(2)
        out = []
        for vol in STATE_VOLS.get(stt, []):
            for s in secs:
                if s['volume'] == vol and s.get('number') == num and s.get('arm') == u['arm'] and u['arm'] != 'artillery': out.append(s['id'])
        return out
    # ---- troop-map labels held for the unit or a formation above it (from status)
    S = build_sources()
    groups = []
    seen = collections.Counter()
    for gid, title, roots, note, texts in G:
        us = [u for u in U if assign[u['id']] == gid]
        rows = []; tally = collections.Counter(); miss = collections.Counter(); sv = {}; state_texts = set()
        for u in us:
            seen[u['id']] += 1
            st_ = u['layer_status']
            cls = {'not_drawn': 'not_drawn', 'edge_only': 'edge_only', 'aggregate': 'formation', 'not_on_field': 'not_on_field'}.get(st_) or ('partly_drawn' if u['missing'] else 'drawn')
            tally[cls] += 1
            for m_ in u['missing']: miss[m_] += 1
            row = {'id': u['id'], 'name': u['name'], 'army': u['army'], 'corps': u['corps'], 'division': u['division'], 'brigade': u['brigade'], 'type': '%s/%s' % (u['level'], u['arm']), 'class': cls, 'missing': u['missing'], 'why': u['reason'],
                   'claims_held': u['claims_own'], 'detail': dict(u['detail'])}
            if cls == 'formation' and u['roster_status'] == 'partly_on_field' and u['level'] == 'regiment':
                # a regiment the roster holds as a formation (its one child is a detached company that is not on the field): the layer draws nothing of it
                tally[cls] -= 1; cls = 'not_drawn'; tally[cls] += 1
                row.update({'class': cls, 'missing': ['arrival', 'positions', 'path', 'strength'], 'why': 'roster_structure',
                            'detail': {'arrival': 'no arrival of its own: the roster holds the regiment as a formation whose only child is a detached company that is not on the field', 'positions': 'not drawn: the layer draws nothing of the regiment less that company',
                                       'path': 'no road of approach: the regiment is not a leaf of the roster', 'strength': 'no figure: the regiment is not a leaf of the roster, so no share is made for it'}})
                for m_ in row['missing']: miss[m_] += 1
            elif cls == 'formation' and not u['leaf']:
                row['missing'] = ['parent_only'] if (u['claims_own']['total'] == 0) else []
                if row['missing']: row['detail'] = {'parent_only': 'no ledger claim and no troop-map label names this formation: evidence recorded for it applies to every unit below it'}
            if cls == 'not_on_field': row['missing'] = []; row['why'] = u['reason'] + (': a non-lead source for the absence is owed' if u['reason'] == 'listed_not_on_field' else '')
            rows.append(row)
            ss = sections_for(u)
            if ss: sv[u['id']] = ss
            m = re.search(r'-(\d+)([a-z]{2})[a-z]*$', u['id'])
            if m and u['leaf']: state_texts.update(STATE_TEXTS.get(m.group(2), []))
        tx = [t for t in dict.fromkeys(list(texts) + sorted(state_texts)) if t in S]
        g = {'id': gid, 'title': title, 'note': note,
             'counts': {'units': len(rows), 'leaf_units_on_field': sum(1 for u in us if u['leaf'] and u['layer_status'] in ('moving', 'edge_only', 'not_drawn')), **dict(tally), 'missing': dict(miss), 'roster_gaps': sum(1 for e in gaps['entries'] if e['group'] == gid), 'figures_drawn': sum(u['figures'] for u in us)},
             'units': rows,
             'roster_gaps': [e['id'] for e in gaps['entries'] if e['group'] == gid],
             'sources': {'or27_reports': sorted(rep_by_group.get(gid, []), key=lambda r: r['id']), 'or27_part3_documents_cited': sorted(p3.get(gid, []), key=lambda r: r['id']),
                         'organization_table': 'OR27-1-R009' if gid.startswith('us') else 'OR27-2-R424', 'returns': ['OR27-1-R008', 'OR27-1-R013'] if gid.startswith('us') else ['OR27-2-R425', 'OR27-2-R427'],
                         'statevol_sections': sv, 'local_texts': tx, 'ledger_claims_held': dict(led_n.get(gid, {}))}}
        groups.append(g)
    dup = [k for k, v in seen.items() if v != 1]
    assert not dup and len(seen) == len(U), 'a unit is in no group or in two: %s' % dup[:5]
    doc = {'_doc': 'Research groups for the units the history layer does not draw or draws only in part. Built by tools/build_groups.py from status.json (the layer as built now), roster-gaps.json, the Official Records index, the five position ledgers and the state-volume index. Every unit of the roster is in exactly one group. class: not_drawn | edge_only | partly_drawn | formation | not_on_field. missing: arrival | positions | path | strength | parent_only (PLAN.md section 2 defines each). why: the reason code of the layer (PLAN.md section 2). The data contract of the group files is PLAN.md section 5.',
           'layer': {'counts': st['counts'], 'figures_drawn': st['figures_drawn'], 'ledger_claims': st['ledgers']},
           'totals': {'groups': len(groups), 'units': len(U), 'roster_gap_entries': len(gaps['entries'])},
           'groups': groups}
    for k in ('not_drawn', 'edge_only', 'partly_drawn', 'formation', 'not_on_field', 'drawn'): doc['totals'][k] = sum(g['counts'].get(k, 0) for g in groups)
    text = json.dumps(doc, ensure_ascii=False, indent=1) + '\n'
    gp = os.path.join(UND, 'groups.json')
    if check:
        old = open(gp, encoding='utf-8').read() if os.path.exists(gp) else ''
        o = json.loads(old) if old else {}
        keep = [g for g in o.get('groups', []) if not g['id'].startswith('r2-')]
        same = json.dumps(keep, sort_keys=True) == json.dumps(doc['groups'], sort_keys=True)
        print('groups.json', 'is current' if same else 'IS STALE (rebuild it)'); sys.exit(0 if same else 1)
    open(gp, 'w', encoding='utf-8').write(text)
    json.dump({'_doc': 'Texts a record of a group file may cite (source.source_id). Paths are under tmp/ (untracked): the hashes identify the copies read. A text that is not here is declared by a `source` record in the group file (PLAN.md 5.4).', 'sources': S}, open(os.path.join(UND, 'sources.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('groups', len(groups), 'units', len(U), {k: doc['totals'][k] for k in ('not_drawn', 'edge_only', 'partly_drawn', 'formation', 'not_on_field', 'drawn')})
    for g in groups:
        c = g['counts']
        print('%-22s units %3d leaf %3d | not_drawn %2d edge %2d partly %2d | gaps %2d | OR reports %3d (uncited %2d) | sections %2d | ledger %s' % (g['id'], c['units'], c['leaf_units_on_field'], c.get('not_drawn', 0), c.get('edge_only', 0), c.get('partly_drawn', 0), c['roster_gaps'], len(g['sources']['or27_reports']), sum(1 for r in g['sources']['or27_reports'] if not r['claims']), sum(len(v) for v in g['sources']['statevol_sections'].values()), dict(g['sources']['ledger_claims_held'])))

if __name__ == '__main__':
    main()
