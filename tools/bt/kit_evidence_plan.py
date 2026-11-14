"""Plan of the kit evidence pass: the research groups, every unit with the present state of each field, and the source registry.

    PYTHONIOENCODING=utf-8 python tools/bt/kit_evidence_plan.py            writes, under docs/battle-theatre/kit/evidence/:
        groups.json     the 26 research groups, their units, the present tier of every field, the reading list of each group
        sources.json    the local source texts an evidence line may cite (id, class, file, sha256, page model)
        INVENTORY.md    the same unit list as tables, one per group
    PYTHONIOENCODING=utf-8 python tools/bt/kit_evidence_plan.py --check    rebuilds in memory and compares with the files (exit 1 on a difference)

Deterministic: no clock, no network. Inputs: history/units.json (the roster the theatre draws), kit/*.json (the built kit
tables), app/data/kit-crosswalk.json and battery-guns.json, library/or27_index.json and statevol_index.json,
GOVERNANCE/library/acquired_2.json, and the files present under tmp/library.
Status letters of a field: D documented as built (its support was never re-read), I inferred, P plausible-procedural,
G registered open gap, E empty (no value at all). A trailing * means the value sits on the unit's own record, not on a default."""
import collections, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BT = os.path.join(ROOT, 'docs', 'battle-theatre')
OUT = os.path.join(BT, 'kit', 'evidence')
J = lambda *p: json.load(open(os.path.join(BT, *p), encoding='utf-8'))

FIELDS = {
    'roster': 'the unit as the record names it: designation, kind, place in the organization, on the field or not',
    'commander': 'who commanded during July 1 to 4, with rank, order of succession and what happened to each',
    'officer': 'any other officer the record names with the unit (field, staff or company officer, lieutenant upwards)',
    'strength': 'men present, as a range with the kind of figure and the return or report it comes from',
    'casualties': 'killed, wounded, captured or missing, as ranges with the return or report they come from',
    'arms': 'shoulder arms and side arms of an infantry or cavalry unit: model and calibre as the source states them',
    'guns': 'pieces of a battery: type and count as the source states them',
    'dress': 'distinctive dress or equipment the record states (one line per statement, tied to one kit field)',
    'horses': 'horses of a cavalry unit or battery: number present, lost or unserviceable',
    'ammunition': 'rounds carried or expended',
    'detachment': 'companies or parties absent, detached or attached, and whether the strength figure includes them',
}
KIT_FIELDS = ['headgear', 'coat', 'shirt', 'trousers', 'shoes', 'accoutrements', 'weapon', 'bayonet', 'sidearm_sword', 'sash', 'pack_state', 'badge', 'flag_or_instrument']
LETTER = {'documented': 'D', 'inferred': 'I', 'plausible-procedural': 'P', 'gap': 'G'}

# ---------------------------------------------------------------------------------------------------------------------
# The 26 groups. root_to_group: a roster unit belongs to the group of its nearest listed ancestor (or itself).
G = collections.OrderedDict()


def group(gid, army, title, roots, reports, tables, note=None):
    G[gid] = {'id': gid, 'army': army, 'title': title, 'roots': roots, 'reports': reports, 'tables': tables, 'note': note}


US_ORG, US_CAS, US_ABS, HUNT = 'OR27-1-R009', 'OR27-1-R013', 'OR27-1-R008', 'OR27-1-R028'
CS_ORG, CS_CAS, CS_ABS, PEND = 'OR27-2-R424', 'OR27-2-R427', 'OR27-2-R425', 'OR27-2-R428'
T = lambda rid, pages, what: {'report_id': rid, 'pages': pages, 'what': what}
R = lambda a, b, what, mode='read': {'from': a, 'to': b, 'what': what, 'mode': mode}

group('us-1c', 'US', 'Army of the Potomac, I Corps: corps headquarters and the infantry of the three divisions (Wadsworth, Robinson, Doubleday and Rowley)',
      ['us-1c'], [R('OR27-1-R029', 'OR27-1-R031', 'corps reports'), R('OR27-1-R032', 'OR27-1-R042', '1st Division'), R('OR27-1-R043', 'OR27-1-R054', '2nd Division'), R('OR27-1-R055', 'OR27-1-R070', '3rd Division')],
      [T(US_ORG, '155-157', 'organization table'), T(US_CAS, '173-175', 'return of casualties')])
group('us-2c-1d', 'US', 'Army of the Potomac, II Corps: corps headquarters and the 1st Division (Caldwell: Cross, Kelly, Zook, Brooke)',
      ['us-2c', 'us-hancock-acting'], [R('OR27-1-R076', 'OR27-1-R076', 'corps report (Hancock)'), R('OR27-1-R077', 'OR27-1-R097', '1st Division')],
      [T(US_ORG, '157-158', 'organization table'), T(US_CAS, '175-176', 'return of casualties')])
group('us-2c-2d3d', 'US', 'Army of the Potomac, II Corps: 2nd Division (Gibbon and Harrow) and 3rd Division (Alexander Hays)',
      ['us-2c-2d', 'us-2c-3d'], [R('OR27-1-R076', 'OR27-1-R076', 'corps report (Hancock)'), R('OR27-1-R098', 'OR27-1-R114', '2nd Division'), R('OR27-1-R115', 'OR27-1-R131', '3rd Division')],
      [T(US_ORG, '158-159', 'organization table'), T(US_CAS, '176-177', 'return of casualties')])
group('us-3c-1d', 'US', 'Army of the Potomac, III Corps: corps headquarters and the 1st Division (Birney and Ward: Graham, Ward, de Trobriand)',
      ['us-3c'], [R('OR27-1-R133', 'OR27-1-R134', 'corps and division reports (Birney; French for the later weeks)'), R('OR27-1-R135', 'OR27-1-R157', '1st Division')],
      [T(US_ORG, '159-160', 'organization table'), T(US_CAS, '177-178', 'return of casualties')])
group('us-3c-2d', 'US', 'Army of the Potomac, III Corps: 2nd Division (Humphreys: Carr, Brewster, Burling)',
      ['us-3c-2d'], [R('OR27-1-R133', 'OR27-1-R133', 'corps report (Birney)'), R('OR27-1-R158', 'OR27-1-R178', '2nd Division'), R('OR27-1-R179', 'OR27-1-R180', 'a division that joined the corps after the battle: read only to rule units in or out')],
      [T(US_ORG, '160-161', 'organization table'), T(US_CAS, '178-179', 'return of casualties')])
group('us-5c', 'US', 'Army of the Potomac, V Corps: corps headquarters and the infantry of the three divisions (Barnes, Ayres, Crawford)',
      ['us-5c'], [R('OR27-1-R187', 'OR27-1-R188', 'corps reports'), R('OR27-1-R189', 'OR27-1-R202', '1st Division'), R('OR27-1-R203', 'OR27-1-R217', '2nd Division'), R('OR27-1-R218', 'OR27-1-R220', '3rd Division')],
      [T(US_ORG, '161-162', 'organization table'), T(US_CAS, '179-180', 'return of casualties')])
group('us-6c', 'US', 'Army of the Potomac, VI Corps: corps headquarters and the infantry of the three divisions (Wright, Howe, Newton and Wheaton)',
      ['us-6c'], [R('OR27-1-R223', 'OR27-1-R237', 'corps, division, brigade and regimental reports')],
      [T(US_ORG, '162-164', 'organization table'), T(US_CAS, '180-182', 'return of casualties')])
group('us-11c', 'US', 'Army of the Potomac, XI Corps: corps headquarters and the infantry of the three divisions (Barlow and Ames, von Steinwehr, Schurz)',
      ['us-11c'], [R('OR27-1-R243', 'OR27-1-R263', 'corps, division, brigade and regimental reports')],
      [T(US_ORG, '164-165', 'organization table'), T(US_CAS, '182-184', 'return of casualties')])
group('us-12c', 'US', 'Army of the Potomac, XII Corps: corps headquarters and the infantry of the two divisions (Williams and Ruger, Geary)',
      ['us-12c'], [R('OR27-1-R271', 'OR27-1-R313', 'corps, division, brigade and regimental reports')],
      [T(US_ORG, '165-166', 'organization table'), T(US_CAS, '184-185', 'return of casualties')])
group('us-art-corps', 'US', 'Army of the Potomac, the seven corps artillery brigades (Wainwright, Hazard, Randolph and Clark, Martin, Tompkins, Osborn, Muhlenberg)',
      ['us-1c-art', 'us-2c-art', 'us-3c-art', 'us-5c-art', 'us-6c-art', 'us-11c-art', 'us-12c-art'],
      [R(HUNT, HUNT, 'Hunt, chief of artillery: gun types and counts by battery in the text'), R('OR27-1-R071', 'OR27-1-R075', 'I Corps brigade'), R('OR27-1-R132', 'OR27-1-R132', 'II Corps brigade'), R('OR27-1-R181', 'OR27-1-R186', 'III Corps brigade'),
       R('OR27-1-R221', 'OR27-1-R222', 'V Corps brigade'), R('OR27-1-R238', 'OR27-1-R242', 'VI Corps brigade'), R('OR27-1-R264', 'OR27-1-R270', 'XI Corps brigade'), R('OR27-1-R314', 'OR27-1-R314', 'XII Corps brigade')],
      [T(US_ORG, '155-166', 'organization table: the artillery brigade closes each corps block'), T(US_CAS, '173-185', 'return of casualties: the artillery brigade closes each corps block')])
group('us-art-reserve-horse', 'US', 'Army of the Potomac, Artillery Reserve (Tyler: five brigades and the train guard) and the two horse artillery brigades of the Cavalry Corps (Robertson, Tidball)',
      ['us-art-reserve', 'us-4nj-train-guard', 'us-cav-art'],
      [R(HUNT, HUNT, 'Hunt, chief of artillery'), R('OR27-1-R315', 'OR27-1-R335', 'Artillery Reserve and its train guard'), R('OR27-1-R368', 'OR27-1-R375', 'horse artillery brigades')],
      [T(US_ORG, '167-168', 'organization table: horse artillery p. 167, Artillery Reserve pp. 167-168'), T(US_CAS, '186-187', 'return of casualties')])
group('us-cav', 'US', 'Army of the Potomac, Cavalry Corps: corps headquarters and the three divisions (Buford, D. McM. Gregg, Kilpatrick)',
      ['us-cav'], [R('OR27-1-R336', 'OR27-1-R336', 'corps report (Pleasonton)'), R('OR27-1-R337', 'OR27-1-R343', '1st Division'), R('OR27-1-R344', 'OR27-1-R358', '2nd Division'), R('OR27-1-R359', 'OR27-1-R367', '3rd Division')],
      [T(US_ORG, '166-167', 'organization table'), T(US_CAS, '185-186', 'return of casualties')])
group('army-hq', 'both', 'Headquarters of both armies with their guards, escorts, engineers, signal and support troops, and the army-wide kit records and defaults',
      ['us-aop', 'us-aop-hq', 'cs-anv', 'cs-anv-hq'],
      [R('OR27-1-R008', 'OR27-1-R008', 'abstract from returns of the Army of the Potomac, June 10 to July 31', 'read'), R('OR27-1-R015', 'OR27-1-R015', 'general return of casualties for the campaign', 'read'),
       R('OR27-1-R016', 'OR27-1-R016', 'Letterman, medical director: ambulance corps, hospitals', 'read'), R('OR27-1-R017', 'OR27-1-R017', 'Norton, chief signal officer', 'read'), R('OR27-1-R024', 'OR27-1-R024', 'Ingalls, chief quartermaster: trains', 'read'),
       R('OR27-1-R025', 'OR27-1-R027', 'Patrick (provost marshal general), Edie (ordnance), Benham (engineer brigade)', 'read'),
       R('OR27-1-R006', 'OR27-1-R006', 'Meade: search for the headquarters, escort, provost, signal and engineer units; do not read through', 'search'), R('OR27-1-R007', 'OR27-1-R007', 'itinerary: search', 'search'), R('OR27-1-R028', 'OR27-1-R028', 'Hunt: search for the artillery headquarters and the reserve', 'search'),
       R('OR27-2-R425', 'OR27-2-R425', 'abstract from returns of the Army of Northern Virginia, July 20 and 31', 'read'), R('OR27-2-R429', 'OR27-2-R429', 'Baldwin, chief of ordnance', 'read'),
       R('OR27-2-R426', 'OR27-2-R426', 'Lee: search for headquarters, staff, escorts, engineers and sharpshooters; do not read through', 'search'), R('OR27-2-R428', 'OR27-2-R428', 'Pendleton: search for the army artillery organization', 'search')],
      [T(US_ORG, '155', 'organization table: general headquarters'), T(US_CAS, '173, 187', 'return of casualties: general headquarters and the recapitulation'), T(US_ABS, '151-155', 'abstracts from returns'),
       T(CS_ORG, '283', 'organization table: head of the table'), T(CS_ABS, '291-293', 'abstract from returns for July 20 and 31')],
      note='This group also carries the nine army and arm defaults every other unit inherits, the support-troop records and the kit records no formation claims.')

group('cs-mclaws', 'CS', "Army of Northern Virginia, First Corps headquarters and McLaws' division (Kershaw, Barksdale, Semmes, Wofford)",
      ['cs-1c'], [R('OR27-2-R430', 'OR27-2-R430', 'corps report (Longstreet)'), R('OR27-2-R431', 'OR27-2-R434', "McLaws' division")],
      [T(CS_ORG, '283', 'organization table'), T(CS_CAS, '329, 338-339', 'two casualty tables')])
group('cs-pickett', 'CS', "Army of Northern Virginia, First Corps: Pickett's division (Garnett, Kemper, Armistead; Corse's brigade not on the field)",
      ['cs-1c-pickett', 'cs-corse-hanover-junction'], [R('OR27-2-R430', 'OR27-2-R430', 'corps report (Longstreet)'), R('OR27-2-R441', 'OR27-2-R441', "Garnett's brigade (Peyton)")],
      [T(CS_ORG, '284', 'organization table'), T(CS_CAS, '329, 339', 'two casualty tables')])
group('cs-hood', 'CS', "Army of Northern Virginia, First Corps: Hood's division (Law, Robertson, G. T. Anderson, Benning)",
      ['cs-1c-hood'], [R('OR27-2-R430', 'OR27-2-R430', 'corps report (Longstreet)'), R('OR27-2-R443', 'OR27-2-R462', "Hood's division")],
      [T(CS_ORG, '284-285', 'organization table'), T(CS_CAS, '330, 339-340', 'two casualty tables')])
group('cs-early', 'CS', "Army of Northern Virginia, Second Corps headquarters and Early's division (Hays, Smith, Hoke and Avery, Gordon)",
      ['cs-2c', 'cs-13va-winchester', 'cs-58va-winchester'], [R('OR27-2-R467', 'OR27-2-R467', 'corps report (Ewell)'), R('OR27-2-R470', 'OR27-2-R477', "Early's division, with its own return of casualties")],
      [T(CS_ORG, '285-286', 'organization table'), T(CS_CAS, '330-331, 340-341', 'two casualty tables')])
group('cs-johnson', 'CS', "Army of Northern Virginia, Second Corps: Johnson's division (Steuart, Stonewall Brigade, Nicholls and Williams, J. M. Jones)",
      ['cs-2c-johnson'], [R('OR27-2-R467', 'OR27-2-R467', 'corps report (Ewell)'), R('OR27-2-R481', 'OR27-2-R503', "Johnson's division")],
      [T(CS_ORG, '286-287', 'organization table'), T(CS_CAS, '331, 341', 'two casualty tables')])
group('cs-rodes', 'CS', "Army of Northern Virginia, Second Corps: Rodes' division (Daniel, Doles, Iverson, Ramseur, O'Neal)",
      ['cs-2c-rodes'], [R('OR27-2-R467', 'OR27-2-R467', 'corps report (Ewell)'), R('OR27-2-R506', 'OR27-2-R530', "Rodes' division")],
      [T(CS_ORG, '287-288', 'organization table'), T(CS_CAS, '332, 342', 'two casualty tables')])
group('cs-anderson', 'CS', "Army of Northern Virginia, Third Corps headquarters and R. H. Anderson's division (Wilcox, Mahone, Wright, Perry and Lang, Posey)",
      ['cs-3c'], [R('OR27-2-R534', 'OR27-2-R534', 'corps report (A. P. Hill)'), R('OR27-2-R536', 'OR27-2-R547', "Anderson's division")],
      [T(CS_ORG, '288-289', 'organization table'), T(CS_CAS, '332, 343', 'two casualty tables')])
group('cs-heth', 'CS', "Army of Northern Virginia, Third Corps: Heth's division (Pettigrew, Brockenbrough, Archer, Davis)",
      ['cs-3c-heth', 'cs-44nc-hanover-junction'], [R('OR27-2-R534', 'OR27-2-R534', 'corps report (A. P. Hill)'), R('OR27-2-R549', 'OR27-2-R553', "Heth's division")],
      [T(CS_ORG, '289', 'organization table'), T(CS_CAS, '333, 343-344', 'two casualty tables')])
group('cs-pender', 'CS', "Army of Northern Virginia, Third Corps: Pender's division (McGowan and Perrin, Lane, Thomas, Scales)",
      ['cs-3c-pender'], [R('OR27-2-R534', 'OR27-2-R534', 'corps report (A. P. Hill)'), R('OR27-2-R556', 'OR27-2-R561', "Pender's division")],
      [T(CS_ORG, '289-290', 'organization table'), T(CS_CAS, '333, 344', 'two casualty tables')])
group('cs-art-1c', 'CS', "Army of Northern Virginia, First Corps artillery: the battalions of Cabell, Dearing and Henry and the corps reserve (Alexander, Washington Artillery)",
      ['cs-1c-mclaws-cabell', 'cs-1c-pickett-dearing', 'cs-1c-hood-henry', 'cs-1c-res-art', 'cs-1c-art'],
      [R(PEND, 'OR27-2-R429', 'Pendleton, chief of artillery; Baldwin, chief of ordnance'), R('OR27-2-R435', 'OR27-2-R440', "Cabell's battalion"), R('OR27-2-R442', 'OR27-2-R442', "Dearing's battalion"), R('OR27-2-R463', 'OR27-2-R466', "Henry's, Alexander's and the Washington Artillery")],
      [T(CS_ORG, '283-285', 'organization table: a battalion closes each division block, the reserve closes the corps'), T(CS_CAS, '329-330, 338-340', 'two casualty tables')])
group('cs-art-2c', 'CS', "Army of Northern Virginia, Second Corps artillery: the battalions of Jones, Andrews (Latimer) and Carter and the corps reserve (Dance, Nelson)",
      ['cs-2c-early-jones', 'cs-2c-johnson-andrews', 'cs-2c-rodes-carter', 'cs-2c-res-art'],
      [R(PEND, 'OR27-2-R429', 'Pendleton; Baldwin'), R('OR27-2-R468', 'OR27-2-R469', 'Brown, chief of artillery; Gregory, guns engaged and ammunition expended'), R('OR27-2-R478', 'OR27-2-R480', "Jones' battalion"), R('OR27-2-R504', 'OR27-2-R505', "Andrews' battalion (Latimer)"), R('OR27-2-R531', 'OR27-2-R533', "Carter's, Dance's and Nelson's battalions")],
      [T(CS_ORG, '285-288', 'organization table'), T(CS_CAS, '330-332, 340-342', 'two casualty tables')])
group('cs-art-3c', 'CS', "Army of Northern Virginia, Third Corps artillery: the battalions of Lane (Cutts), Garnett and Poague and the corps reserve (McIntosh, Pegram)",
      ['cs-3c-anderson-cutts', 'cs-3c-heth-garnett', 'cs-3c-pender-poague', 'cs-3c-res-art'],
      [R(PEND, 'OR27-2-R429', 'Pendleton; Baldwin'), R('OR27-2-R535', 'OR27-2-R535', 'Walker, chief of artillery'), R('OR27-2-R548', 'OR27-2-R548', 'Sumter battalion (Lane)'), R('OR27-2-R554', 'OR27-2-R555', "Garnett's battalion"), R('OR27-2-R562', 'OR27-2-R564', "Poague's, McIntosh's and Pegram's battalions")],
      [T(CS_ORG, '288-290', 'organization table'), T(CS_CAS, '332-333, 343-345', 'two casualty tables')])
group('cs-cav', 'CS', "Army of Northern Virginia, Stuart's cavalry division (Hampton, Fitz Lee, W. H. F. Lee under Chambliss, Jenkins, Jones, Robertson), Imboden's command and the horse artillery",
      ['cs-cav-div', 'cs-2c-early-35vacavalrybn'], [R('OR27-2-R565', 'OR27-2-R588', 'Stuart and the cavalry reports (many are of June actions: use them for commanders, arms and strength, not for July positions)')],
      [T(CS_ORG, '290-291', 'organization table'), T(CS_CAS, '334-335, 345', 'two casualty tables')])

# tables every group of an army reads for its own formations (verified against the leaf map: R008 pp. 151-155, R013 pp. 188-192, R425 pp. 291-293)
SHARED_US = [T(US_ABS, '151-155', 'abstracts and field returns of the Army of the Potomac: corps rows for 10 June to 20 July, division and artillery-brigade rows for 4 July, the cavalry divisions for 28 June (strength lines, basis present_for_duty); take the rows of your formations'),
             T(US_CAS, '188-192', 'lists of officers killed and mortally wounded, by state and regiment: search them for your regiments and batteries (officer lines, basis casualty_list)')]
SHARED_CS = [T(CS_ABS, '291-293', 'abstract from returns of the Army of Northern Virginia, 20 and 31 July: division rows and artillery rows (strength lines, basis present_for_duty); take the rows of your formations')]
for _g in G.values():
    have = {(t['report_id'], t['pages']) for t in _g['tables']}
    for _t in (SHARED_US if _g['army'] in ('US', 'both') else []) + (SHARED_CS if _g['army'] in ('CS', 'both') else []):
        if (_t['report_id'], _t['pages']) not in have:
            _g['tables'].append(_t)

# kit cards with no roster unit of their own: which roster formation they stand under (first matching substring of the card's parent text)
ART_PARENT = [("Alexander's", 'cs-1c-res-art-alexander'), ('Washington (La.)', 'cs-1c-res-art-washington'), ("Cabell's", 'cs-1c-mclaws-cabell'), ("Dearing's", 'cs-1c-pickett-dearing'), ("Henry's", 'cs-1c-hood-henry'),
              ("Jones's battalion", 'cs-2c-early-jones'), ("Latimer's", 'cs-2c-johnson-andrews'), ("Carter's", 'cs-2c-rodes-carter'), ("Brown's reserve", 'cs-2c-res-art-1vaartbn'), ("Nelson's", 'cs-2c-res-art-nelson'),
              ("Garnett's", 'cs-3c-heth-garnett'), ("McIntosh's", 'cs-3c-res-art-mcintosh'), ("Pegram's", 'cs-3c-res-art-pegram'), ("Stuart's Horse Artillery", 'cs-cav-horse-art'), ('Cavalry horse artillery', 'us-cav-art'),
              ('1st Regular Brigade', 'us-art-reserve-ransom'), ('1st Volunteer Brigade', 'us-art-reserve-mcgilvery'), ('2nd Volunteer Brigade', 'us-art-reserve-taft'), ('3rd Volunteer Brigade', 'us-art-reserve-huntington'), ('4th Volunteer Brigade', 'us-art-reserve-fitzhugh'),
              ('I Corps (', 'us-1c-art'), ('II Corps (', 'us-2c-art'), ('III Corps (', 'us-3c-art'), ('V Corps (', 'us-5c-art'), ('VI Corps (', 'us-6c-art'), ('XI Corps (', 'us-11c-art'), ('XII Corps (', 'us-12c-art')]
CAV_PARENT = [('Gamble', 'us-cav-1d-gamble'), ('Devin', 'us-cav-1d-devin'), ('Merritt', 'us-cav-1d-merritt'), ('McIntosh', 'us-cav-2d-mcintosh'), ('J. I. Gregg', 'us-cav-2d-gregg'), ('Farnsworth', 'us-cav-3d-farnsworth'), ('Custer', 'us-cav-3d-custer'),
              ("Hampton", 'cs-cav-hampton'), ("Fitz Lee", 'cs-cav-flee'), ('Chambliss', 'cs-cav-chambliss'), ('Jenkins', 'cs-cav-jenkins'), ("Robertson's Brigade", 'cs-cav-robertson'), ('Laurel', 'cs-cav-jones'), ('Imboden', 'cs-cav-imboden')]
# kit cards that are the same unit as a roster unit although the names differ (each with its reason; an alias of this plan, to be confirmed by a roster line)
PLAN_ALIAS = {
    'US.ART.2nd_Maine_B': (['us-1c-art-2me'], 'same commander printed on both (Hall)'), 'US.ART.5th_Maine_E': (['us-1c-art-5me'], 'the one 5th Maine battery of the I Corps brigade'),
    'US.ART.1st_NY_E_L': (['us-1c-art-1nye', 'us-1c-art-1nyl'], 'the card joins the two roster batteries'), 'US.ART.3rd_Mass': (['us-5c-art-3ma'], 'the one 3rd Massachusetts battery of the V Corps brigade'),
    'US.ART.1st_Mass': (['us-6c-art-1maa'], 'the one 1st Massachusetts battery of the VI Corps brigade'), 'US.ART.3rd_US_F_K': (['us-art-reserve-ransom-3usf', 'us-art-reserve-ransom-3usk'], 'the card joins the two roster batteries'),
    'US.ART.Pa_Independent_C_F': (['us-art-reserve-mcgilvery-pac', 'us-art-reserve-mcgilvery-paf'], 'the card joins the two roster batteries'), 'US.ART.1st_Pennsylvania_F_G': (['us-art-reserve-huntington-1paf', 'us-art-reserve-huntington-1pag'], 'the card joins the two roster batteries'),
    'US.ART.1st_NY_K_with_11th_NY_attached': (['us-art-reserve-fitzhugh-1nyk'], 'the card is the roster battery with another unit attached'),
    'US.ART.1st_Conn_Heavy_B_and_H': (['us-art-reserve-taft-1ctheavy', 'us-art-reserve-taft-1ctheavy-b', 'us-art-reserve-taft-1ctheavy-m'], 'the card prints batteries B and H, the roster B and M: one of the two is wrong, settle it from the record'),
    'CS.ART.Ashland': (['cs-1c-res-art-alexander-ashland'], 'same printed battery list'), 'CS.ART.Bedford': (['cs-1c-res-art-alexander-bedford'], 'same printed battery list'), 'CS.ART.Brooks': (['cs-1c-res-art-alexander-brookssc'], 'same printed battery list'),
    'CS.ART.Madison_La': (['cs-1c-res-art-alexander-madisonla'], 'same printed battery list'), 'CS.ART.Richmond': (['cs-1c-res-art-alexander-richmond'], 'same printed battery list'), 'CS.ART.Bath': (['cs-1c-res-art-alexander-bath'], 'same printed battery list'),
}
# kit records no roster unit resolves to: the group that takes them, and why
KIT_STRAY = {
    'US.MN_CO_L': ('us-2c-2d3d', 'us-2c-2d-harrow', 'the record prints it as attached to the 1st Minnesota'), 'US.5NY_INF': ('us-5c', 'us-5c', 'recorded as absent from the battle: confirm from the organization table'),
    'CS.5ALBN': ('cs-rodes', 'cs-2c-rodes', "the record prints Rodes' division and Blackford's sharpshooters; the roster's 5th Alabama Battalion stands in Archer's brigade (group cs-heth): settle which unit the record describes"),
    'CS.SCSSBN': ('army-hq', 'cs-anv', 'the record does not say which South Carolina brigade: locate it or retire it'), 'CS.SS_GENERIC': ('army-hq', 'cs-anv', 'a generic record for sharpshooter battalions drawn from regiments'),
    'CS.OTHERS': ('army-hq', 'cs-anv', 'a generic record for brigades the plan did not describe'),
}
STATE_VOLS = {'NY': ['NY-GB-1900', 'NY-GB-1900-v2', 'NY-GB-1902-v3'], 'PA': ['PA-GB-1904', 'PA-GB-1914a', 'PA-GB-1914-v2'], 'ME': ['ME-GB-1898'], 'MI': ['MI-GB-1889'], 'VT': ['VT-MON-1890', 'VT-GB-1914'],
              'NJ': ['NJ-TOOMBS-1888', 'NJ-FINAL-1891'], 'IN': ['IN-1913'], 'MN': ['MN-1ST-1916'], 'OH': ['OH-DED-1887', 'OH-8TH-1889'], 'MA': ['MA-BURIAL-1863']}
ARMY_VOLS = {'US': ['FOX-1889', 'BL-3', 'CEM-REPORT-1867', 'HASKELL-1908', 'MEADE-LL-v2', 'LETTERMAN-1866'], 'CS': ['BL-3', 'SHSP-04', 'SHSP-05', 'SHSP-06', 'SHSP-11', 'SHSP-12', 'ALEXANDER-1907', 'LONGSTREET-1896', 'FREMANTLE-1864'],
             'both': ['FOX-1889', 'BL-3', 'LETTERMAN-1866', 'MEADE-LL-v2', 'ALEXANDER-1907', 'FREMANTLE-1864']}

# ---------------------------------------------------------------------------------------------------------------------
# Source registry
CLASS_RULES = [(r'^OR27-|^OR-2[59]-|^ORSER3', 'official_records', 'reports, returns and tables written in 1863 and printed by the War Department'),
               (r'^(PA|NY|ME|MI)-GB-|^VT-(MON|GB)|^NJ-FINAL|^OH-DED|^IN-1913|^CEM-|^MA-BURIAL', 'state_or_commission_report', 'state commission and cemetery volumes: monument inscriptions, dedication addresses, official lists'),
               (r'^FOX-', 'statistical_compilation', 'compiled from the muster rolls and returns'),
               (r'^NJ-TOOMBS|^MN-1ST|^OH-8TH', 'regimental_or_state_history', 'histories written by veterans or for a state'),
               (r'^(HASKELL|ALEXANDER|LONGSTREET|FREMANTLE|MEADE-LL|LETTERMAN|JACOBS|TPIERCE|HOSPSCENES|BL-3|SHSP-)', 'participant_account', 'letters, memoirs and articles by men who were there, most printed years later'),
               (r'^BACH-|^PIERCE-F|^EVERETT|^LONG-GBV', 'period_or_later_history', 'early histories and guides'),
               (r'^(GBG-COMPILER|ADAMS-SENTINEL)', 'period_newspaper', 'Gettysburg newspapers of 1863')]
LEAD_CLASSES = ['wikipedia', 'forum', 'blog', 'auction', 'memory', 'unsourced_web_page']
PARTS = {1: 'cu31924077699761', 2: 'cu31924077728255', 3: 'cu31924077700262'}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''):
            h.update(b)
    return h.hexdigest()


def classify(sid):
    for pat, cls, why in CLASS_RULES:
        if re.search(pat, sid):
            return cls, why
    return 'unclassified', 'not classified by the plan: say what it is in the report before citing it as documented'


def build_sources():
    src = collections.OrderedDict()

    def add(sid, title, rel, **kw):
        p = os.path.join(ROOT, rel)
        if not os.path.exists(p):
            return False
        cls, why = classify(sid)
        with open(p, encoding='utf-8', newline='') as f:
            chars = len(f.read())
        src[sid] = dict({'title': title, 'class': cls, 'class_note': why, 'lead': False, 'local_path': rel, 'sha256': sha256(p), 'chars': chars, 'part': None, 'index': None, 'page_model': 'none'}, **kw)
        return True
    for part, ident in PARTS.items():
        add('OR27-%d' % part, 'The War of the Rebellion: Official Records, Series I, volume 27 (Gettysburg campaign), part %d' % part, 'tmp/library/or27/%s_djvu.txt' % ident,
            part=part, index='or27', page_model='leaf', archive_identifier=ident, pdf='tmp/kit-plan/or27-pdf/%s.pdf' % ident, cite='OR Ser. I vol. 27 pt. %d' % part)
    sv = J('library', 'statevol_index.json')
    by_sid = {v['source_id']: v for v in sv['volumes']}
    dirs = ['tmp/library/ws9/prior', 'tmp/library/misc', 'tmp/library/ws9']
    for v in sv['volumes']:
        for d in dirs:
            cand = [n for n in (os.listdir(os.path.join(ROOT, d)) if os.path.isdir(os.path.join(ROOT, d)) else []) if n.endswith(v['file'])]
            if cand and sha256(os.path.join(ROOT, d, cand[0])) == v['sha256']:
                add(v['source_id'], v['cite'], '%s/%s' % (d, cand[0]), index='statevol:' + v['key'], page_model='anchors', cite=v['cite'])
                break
    acq = J('GOVERNANCE', 'library', 'acquired_2.json')
    for it in acq['items']:
        if it['id'] in src or it['id'] in by_sid:
            continue
        title = it['title'] + ((' (%s)' % it['date']) if it.get('date') and str(it['date']) not in it['title'] else '')
        add(it['id'], title, it['local_path'], archive_identifier=it.get('archive_identifier'), cite=title)
    for sid, s in src.items():
        if sid.startswith('OR27-'):
            continue
        if s['index'] is None:
            s['page_model'] = 'none'
    return src


# ---------------------------------------------------------------------------------------------------------------------
# ---------------------------------------------------------------------------------------------------------------------
# per-unit helpers: required fields, search terms, hints to the reports and state-volume sections that name the unit
STATE_NAMES = [('west virginia', 'WV'), ('new hampshire', 'NH'), ('new jersey', 'NJ'), ('new york', 'NY'), ('rhode island', 'RI'), ('north carolina', 'NC'), ('south carolina', 'SC'), ('massachusetts', 'MA'), ('pennsylvania', 'PA'),
               ('connecticut', 'CT'), ('mississippi', 'MS'), ('louisiana', 'LA'), ('tennessee', 'TN'), ('wisconsin', 'WI'), ('minnesota', 'MN'), ('kentucky', 'KY'), ('delaware', 'DE'), ('maryland', 'MD'), ('michigan', 'MI'),
               ('illinois', 'IL'), ('missouri', 'MO'), ('alabama', 'AL'), ('arkansas', 'AR'), ('virginia', 'VA'), ('georgia', 'GA'), ('florida', 'FL'), ('indiana', 'IN'), ('vermont', 'VT'), ('maine', 'ME'), ('ohio', 'OH'),
               ('iowa', 'IA'), ('texas', 'TX'), ('u s', 'US'), ('united states', 'US')]
ABBR_NAME = {a: n.title() for n, a in STATE_NAMES}
ABBR_NAME['US'] = 'United States'
_ONES = {'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10, 'eleventh': 11, 'twelfth': 12, 'thirteenth': 13, 'fourteenth': 14, 'fifteenth': 15,
         'sixteenth': 16, 'seventeenth': 17, 'eighteenth': 18, 'nineteenth': 19, 'twentieth': 20, 'thirtieth': 30, 'fortieth': 40, 'fiftieth': 50, 'sixtieth': 60, 'seventieth': 70, 'eightieth': 80, 'ninetieth': 90, 'hundredth': 100}
_CARD = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
_ORD_OF = {v: k for k, v in _ONES.items()}
_CARD_OF = {v: k for k, v in _CARD.items()}


def ord_words_to_int(toks):
    cur = 0
    for t in toks:
        if t == 'and':
            continue
        if t in _CARD:
            cur += _CARD[t]
        elif t in _ONES:
            cur += _ONES[t]
        elif t == 'hundred':
            cur = max(cur, 1) * 100
        else:
            return None
    return cur or None


def int_to_ordinal_word(n):
    if n in _ORD_OF:
        return _ORD_OF[n].capitalize()
    if n < 100:
        t, o = (n // 10) * 10, n % 10
        return ('%s-%s' % (_CARD_OF[t], _ORD_OF[o])).capitalize() if o else _ORD_OF[t].capitalize()
    h, r = n // 100, n % 100
    lead = 'One hundred' if h == 1 else '%s hundred' % _CARD_OF[h].capitalize()
    return lead + (' and ' + int_to_ordinal_word(r).lower() if r else 'th')


def parse_scope(scope):
    """(number, state abbreviation, arm, battery letter) from the heading of a report ('Seventy-sixth New York Infantry', 'Battery C, First Rhode Island Light Artillery'), else None."""
    t = ' '.join(re.sub(r'[^a-z ]', ' ', (scope or '').lower().replace('-', ' ')).split())
    for name, ab in STATE_NAMES:
        k = t.find(name)
        if k > 0 and (name != 'virginia' or 'west virginia' not in t):
            toks = t[:k].split()
            for a in range(0, len(toks)):
                n = ord_words_to_int(toks[a:])
                if n:
                    arm = 'cavalry' if 'cavalry' in t else 'artillery' if ('battery' in t or 'artillery' in t) else 'infantry'
                    m = re.search(r'\bbattery ([a-m])\b', t)
                    return n, ab, arm, (m.group(1).upper() if m else None)
            return None
    return None


def parse_roster_name(name):
    m = re.match(r'^(\d+)(?:st|nd|rd|th)\s+([A-Z]{2})\b\s*(.*)$', name or '')
    return (int(m.group(1)), m.group(2), m.group(3)) if m else None


def required_for(e):
    """The fields that must be evidenced or recorded as a gap (never silently skipped) for a unit."""
    uid, lvl, arm = e['unit_id'], e['level'], e.get('arm')
    if lvl == 'default':
        return ['dress'] if uid.endswith('.artillery') else ['arms', 'dress']
    if uid.startswith(('US.SUP.', 'CS.SUP.')):
        return ['roster', 'dress']
    if uid in ('CS.OTHERS', 'CS.SS_GENERIC', 'CS.SCSSBN'):
        return ['roster']
    if e['status'] in ('never_on_field', 'never_main_field') or e['status'].startswith('kit record: absent'):
        return ['roster', 'commander']
    if lvl in ('army', 'headquarters', 'person'):
        return ['roster', 'commander']
    if lvl in ('corps', 'division', 'brigade', 'group', 'command'):
        return ['roster', 'commander', 'strength', 'casualties']
    if lvl in ('artillery_brigade', 'artillery_battalion', 'artillery_group'):
        return ['roster', 'commander', 'guns', 'casualties']
    if arm == 'artillery':
        return ['roster', 'commander', 'guns', 'strength', 'casualties', 'horses', 'dress']
    if arm == 'cavalry':
        return ['roster', 'commander', 'strength', 'casualties', 'arms', 'horses', 'dress']
    return ['roster', 'commander', 'strength', 'casualties', 'arms', 'dress']


def surnames(cmds):
    out = []
    for c in cmds or []:
        t = re.findall(r"[A-Za-z][A-Za-z'’\-]+", c)
        t = [x for x in t if x.lower() not in ('brig', 'maj', 'gen', 'col', 'lieut', 'capt', 'surg', 'cmdg', 'wounded', 'killed', 'captured', 'died', 'jr', 'sr', 'acting', 'and')]
        if t:
            out.append(t[-1].replace('’', "'"))
    return out


def search_terms(e, h):
    name = e['name'] or ''
    terms = []
    p = parse_roster_name(name)
    if p and e['level'] in ('regiment', 'battalion', 'company', 'battery'):
        n, st, rest = p
        full = ABBR_NAME.get(st)
        if full:
            terms += ['%dth %s' % (n, full) if n % 100 in (11, 12, 13) or n % 10 > 3 or n % 10 == 0 else '%d%s %s' % (n, {1: 'st', 2: 'nd', 3: 'rd'}[n % 10], full), '%s %s' % (int_to_ordinal_word(n), full)]
            if e['level'] == 'battery':
                letters = re.findall(r'\b([A-M])\b', (e.get('name_printed') or name)[len(name.split()[0]) + 4:]) or re.findall(r'\b([A-M])\b', rest)
                terms += ['Battery %s' % L for L in dict.fromkeys(letters)]
    cm = surnames(h.get('commanders_printed') if h else None) or surnames([e['current'].get('commander')] if e.get('current', {}).get('commander') else None)
    terms += ["%s's" % c for c in dict.fromkeys(cm)] if e['level'] in ('battery', 'artillery_battalion', 'artillery_brigade', 'brigade', 'division', 'corps') else [c for c in dict.fromkeys(cm)]
    if not terms:
        terms = [name]
    return list(dict.fromkeys(terms))[:8]


def enrich(entries, by_hist, hist_children, ix_records, sv):
    """Add required, search_terms, report hints and state-volume section hints to every unit entry (hints only: nothing in them is evidence)."""
    sec_by = collections.defaultdict(list)
    vol_state = {v['key']: v.get('state') for v in sv['volumes']}
    for sct in sv['sections']:
        st = vol_state.get(sct['volume'])
        if st and sct.get('number') and sct.get('arm'):
            sec_by[(st, int(sct['number']), sct['arm'])].append(sct['id'])
    for gid, us in entries.items():
        g = G[gid]
        recs = []
        for r in g['reports']:
            pa = int(r['from'].split('-')[1])
            recs += [x for x in ix_records if x['part'] == pa and r['from'] <= x['id'] <= r['to']]
        own = collections.defaultdict(list)
        cmd_match = collections.defaultdict(list)
        keyed = collections.defaultdict(list)
        formations = []
        for e in us:
            if not e['in_roster']:
                continue
            p = parse_roster_name(e['name'])
            if p and e['level'] in ('regiment', 'battalion', 'company', 'battery') and e.get('arm'):
                keyed[(p[0], p[1], e['arm'])].append((e, set(re.findall(r'\b([A-M])\b', p[2])), set(re.findall(r'\b([A-M])\b', (e.get('name_printed') or '')[len(e['name'].split()[0]):]))))
            if e['level'] in ('brigade', 'division', 'corps', 'artillery_brigade', 'artillery_battalion', 'army', 'group', 'command'):
                formations.append((e, surnames(by_hist[e['unit_id']].get('commanders_printed'))))
        for r in recs:
            sc = r.get('unit_scope') or r.get('toc_text') or ''
            pr = parse_scope(sc)
            if pr and r.get('kind') == 'report':
                n, st, arm, letter = pr
                cands = keyed.get((n, st, arm), [])
                if arm == 'artillery':                  # a battery letter must agree: no letter in the heading means a roster battery without one
                    cands = ([c for c in cands if letter in c[1]] or [c for c in cands if letter in c[2]]) if letter else [c for c in cands if not c[1]]
                if len(cands) == 1:
                    own[cands[0][0]['unit_id']].append(r['id'])
                    continue
            au = re.findall(r"[A-Za-z]+", r.get('author') or '')
            if au and re.search(r'command|brig|division|corps', sc.lower() + ' ' + (r.get('rank') or '').lower()):
                a = au[-1].lower()
                hit = [f for f, sn in formations if any(difflib_ratio(a, x.lower()) >= 0.86 for x in sn)]
                if len(hit) == 1:
                    cmd_match[hit[0]['unit_id']].append(r['id'])
        for e in us:
            uid = e['unit_id']
            h = by_hist.get(uid)
            e['required'] = required_for(e)
            e['search_terms'] = search_terms(e, h)
            par = e.get('parent')
            e['reports'] = {'own': own.get(uid, []), 'commander_match': cmd_match.get(uid, []), 'parent': (own.get(par, []) + cmd_match.get(par, [])) if par else []}
            p = parse_roster_name(e['name'])
            secs = sec_by.get((p[1], p[0], e['arm']), []) if p and e.get('arm') and e['level'] in ('regiment', 'battalion', 'battery') else []
            if secs:
                e['state_sections'] = secs


def difflib_ratio(a, b):
    import difflib
    return difflib.SequenceMatcher(None, a, b).ratio()



def load():
    hist = J('history', 'units.json')['units']
    ks, ab, cu, wp = J('kit', 'kit_specs.json'), J('kit', 'artillery_batteries.json'), J('kit', 'cavalry_units.json'), J('kit', 'weapons.json')
    cw = J('app', 'data', 'kit-crosswalk.json')['units']
    bg = J('app', 'data', 'battery-guns.json')
    return hist, ks, ab, cu, wp, cw, bg


def tier_letter(f):
    return LETTER.get(f.get('tier'), 'P')


def chain_fields(kit_units, defaults, kid):
    """field -> (letter, own?, text, source keys) through the record and the defaults it inherits."""
    out = {}
    u = kit_units.get(kid) or defaults.get(kid)
    own = True
    guard = 0
    while u and guard < 8:
        for fname, f in (u.get('fields') or {}).items():
            if fname in out:
                continue
            items = '; '.join((('%s: ' % a['share']) if a.get('share') else '') + a['item'] for a in f.get('allowed', []))
            out[fname] = (tier_letter(f), own, items, f.get('source_keys', []))
        nxt = u.get('inherits')
        u = defaults.get(nxt) if nxt else None
        own = False
        guard += 1
    return out


def build():
    hist, ks, ab, cu, wp, cw, bg = load()
    by = {u['id']: u for u in hist}
    kit_units = {}
    for t in (ks['units'], ab['units'], cu['units']):
        kit_units.update(t)
    defaults = ks['defaults']
    root_to_group = {}
    for gid, g in G.items():
        for r in g['roots']:
            assert r in by, 'group root not in the roster: ' + r
            assert r not in root_to_group, r
            root_to_group[r] = gid

    def group_of(uid):
        u = by[uid]
        while u:
            if u['id'] in root_to_group:
                return root_to_group[u['id']]
            u = by.get(u['parent']) if u['parent'] else None
        raise AssertionError('no group for ' + uid)

    # kit links of roster units: the crosswalk, then the aliases of this plan
    links = collections.defaultdict(list)
    for hid, rec in cw.items():
        if rec.get('kit'):
            links[hid].append((rec['kit'], rec['how'], rec.get('note')))
    for kid, (hids, why) in PLAN_ALIAS.items():
        for hid in hids:
            assert hid in by, hid
            links[hid].append((kid, 'plan alias', why))
    linked_kit = {k for v in links.values() for k, _h, _n in v}

    def figured_ancestor(u):
        p = by.get(u['parent']) if u['parent'] else None
        while p:
            s = p.get('strength')
            if s and isinstance(s.get('strength'), (int, float)):
                return p
            p = by.get(p['parent']) if p['parent'] else None
        return None

    def card_of(kid):
        return ab['batteries'].get(kid) or cu['cards'].get(kid)

    def kit_part(entry, kid, arm):
        """arms / guns / dress status from the kit record kid (may be None: then the default of army and arm)."""
        army = 'union' if entry['army'] == 'US' else 'confederate'
        a = arm if arm in ('artillery', 'cavalry') else 'infantry'
        base = kid if kid in kit_units else 'default.%s.%s' % (army, a)
        ch = chain_fields(kit_units, defaults, base)
        kf = {}
        for fname in KIT_FIELDS:
            if fname in ch:
                letter, own, _items, _keys = ch[fname]
                kf[fname] = letter + ('*' if own and kid in kit_units else '')
            else:
                kf[fname] = 'E'
        entry['kit_fields'] = kf
        if arm != 'artillery':
            if 'weapon' in ch:
                letter, own, items, keys = ch['weapon']
                entry['fields']['arms'] = [letter + ('*' if own and kid in kit_units else ''), ('own record: ' if own and kid in kit_units else 'default draw: ') + items[:160], keys[:4]]
            else:
                entry['fields']['arms'] = ['E', 'no weapon field', []]
        cnt = collections.Counter(v[0] for k, v in kf.items() if k != 'weapon')
        entry['fields']['dress'] = [''.join('%s%d' % (c, cnt[c]) for c in 'DIPGE' if cnt[c]), '%d of the %d dress fields sit on the unit\'s own record' % (sum(1 for k, v in kf.items() if v.endswith('*') and k != 'weapon'), len(KIT_FIELDS) - 1), []]

    entries = collections.OrderedDict((gid, []) for gid in G)
    for u in hist:
        gid = group_of(u['id'])
        leaf = not u['children']
        e = {'unit_id': u['id'], 'name': u['name'], 'name_printed': u.get('name_printed'), 'level': u['level'], 'arm': u.get('arm'), 'army': u['army'], 'parent': u['parent'], 'status': u['status'], 'in_roster': True, 'leaf': leaf,
             'kit': [{'id': k, 'how': h, 'note': n} for k, h, n in links.get(u['id'], [])], 'fields': collections.OrderedDict(), 'current': {}}
        e['fields']['roster'] = ['I', 'the plan\'s order of battle (%s): a lead source, never checked against the record' % u.get('source', 'PDF'), [u.get('source') or 'PDF-B3']]
        cmd = '; '.join(u.get('commanders_printed') or [])
        card = next((card_of(k['id']) for k in e['kit'] if card_of(k['id'])), None)
        if cmd:
            e['fields']['commander'] = ['I', 'the plan\'s order of battle: ' + cmd, [u.get('source') or 'PDF-B3']]
            e['current']['commander'] = cmd
        elif card and (card.get('commanders_printed') or card.get('commander_printed')) and (card.get('commanders_printed') or card.get('commander_printed')) != '-':
            c = card.get('commanders_printed') or card.get('commander_printed')
            e['fields']['commander'] = [LETTER.get(card.get('tier'), 'I') + '*', 'kit card: ' + c, card.get('source_keys', [])[:4]]
            e['current']['commander'] = c
        else:
            e['fields']['commander'] = ['E', 'none (the plan gives no commander below the brigade)', []]
        s = u.get('strength')
        if s and isinstance(s.get('strength'), (int, float)):
            e['fields']['strength'] = ['I', 'one printed figure %s (%s): no range, weak source' % (s['strength_printed'], s.get('basis_printed', '')[:70]), ['PDF-B3']]
            e['current']['strength'] = s['strength']
            if s.get('lost') is not None:
                e['fields']['casualties'] = ['I', 'one printed figure %s: no range, weak source' % s.get('lost_printed'), ['PDF-B3']]
                e['current']['casualties'] = s['lost']
            else:
                e['fields']['casualties'] = ['E', 'none', []]
        else:
            fa = figured_ancestor(u)
            on = u['status'] in ('on_field', 'partly_on_field')
            if leaf and fa and on:
                e['fields']['strength'] = ['P', 'no figure of its own: the theatre draws an equal share of the %s figure (%s)' % (fa['name'], fa['strength']['strength_printed']), ['PDF-B3']]
            elif leaf:
                e['fields']['strength'] = ['E', 'none' + ('' if on else ' (not on the field)'), []]
            else:
                e['fields']['strength'] = ['E', 'none printed for this formation', []]
            e['fields']['casualties'] = ['E', 'none', []]
        if leaf and u.get('arm') in ('infantry', 'cavalry', 'artillery') and u['level'] not in ('artillery_brigade', 'artillery_battalion', 'artillery_group', 'brigade', 'group', 'command'):
            kid = e['kit'][0]['id'] if e['kit'] else None
            kit_part(e, kid, u['arm'])
            if u['arm'] == 'artillery':
                if card and 'guns_status' in card:
                    st = str(card['guns_status'])
                    if st.startswith('stated'):
                        e['fields']['guns'] = [LETTER.get(card.get('tier'), 'I') + '*', 'kit card %s: %s' % (card['id'], card.get('guns_printed')), card.get('source_keys', [])[:4]]
                        e['current']['guns'] = card.get('guns_printed')
                    else:
                        e['fields']['guns'] = ['G', 'kit card %s: gun types not given (open gap)' % card['id'], card.get('gap_ids', [])]
                else:
                    e['fields']['guns'] = ['E', 'no kit card', []]
        elif leaf and u['level'] in ('artillery_brigade', 'artillery_battalion', 'artillery_group'):
            e['fields']['guns'] = ['E', 'a formation the roster does not break into batteries: see the kit cards listed under it', []]
        entries[gid].append(e)

    # kit cards and records with no roster unit
    def stray(gid, kid, name, arm, army, parent, why, level):
        e = {'unit_id': kid, 'name': name, 'name_printed': name, 'level': level, 'arm': arm, 'army': army, 'parent': parent, 'status': 'not in the roster', 'in_roster': False, 'leaf': True,
             'kit': [{'id': kid, 'how': 'kit record with no roster unit', 'note': why}], 'fields': collections.OrderedDict(), 'current': {}}
        card = card_of(kid)
        rec = kit_units.get(kid) or {}
        tl = LETTER.get((card or {}).get('tier'), 'I')
        e['fields']['roster'] = [tl, 'kit record only (%s); the roster the theatre draws has no such unit' % ', '.join((card or rec).get('source_keys', [])[:3] or ['no source key']), (card or rec).get('source_keys', [])[:4]]
        c = (card or {}).get('commanders_printed') or (card or {}).get('commander_printed')
        if c and c != '-':
            e['fields']['commander'] = [tl + '*', 'kit card: ' + c, (card or {}).get('source_keys', [])[:4]]
            e['current']['commander'] = c
        else:
            e['fields']['commander'] = ['E', 'none', []]
        e['fields']['strength'] = ['E', 'none', []]
        e['fields']['casualties'] = ['E', 'none', []]
        if (rec.get('presence') or {}).get('status') not in (None, 'present_at_gettysburg'):
            e['status'] = 'kit record: ' + rec['presence']['status']
        kit_part(e, kid, arm)
        if arm == 'artillery' and card:
            st = str(card.get('guns_status'))
            if st.startswith('stated'):
                e['fields']['guns'] = [tl + '*', 'kit card: %s' % card.get('guns_printed'), card.get('source_keys', [])[:4]]
                e['current']['guns'] = card.get('guns_printed')
            else:
                e['fields']['guns'] = ['G', 'gun types not given (open gap)', card.get('gap_ids', [])]
        entries[gid].append(e)

    for kid, c in ab['batteries'].items():
        if kid in linked_kit:
            continue
        par = next((h for sub, h in ART_PARENT if sub in c['parent']), None)
        assert par, 'no roster parent for card %s (%s)' % (kid, c['parent'])
        stray(group_of(par), kid, c['name'], 'artillery', 'US' if c['army'] == 'union' else 'CS', par, 'battery card of the kit; the roster keeps its battalion or brigade as one unit', 'battery')
    for kid, c in cu['cards'].items():
        if kid in linked_kit:
            continue
        par = next((h for sub, h in CAV_PARENT if sub in c['parent']), None)
        assert par, 'no roster parent for card %s (%s)' % (kid, c['parent'])
        stray(group_of(par), kid, c['name'], 'cavalry', 'US' if c['army'] == 'union' else 'CS', par, 'cavalry card of the kit; the roster keeps its brigade as one unit or lacks the unit', 'regiment')
    for kid, u in ks['units'].items():
        if kid in linked_kit:
            continue
        if kid in KIT_STRAY:
            gid, par, why = KIT_STRAY[kid]
        elif '.SUP.' in kid:
            gid, par, why = 'army-hq', 'us-aop' if kid.startswith('US') else 'cs-anv', 'support-troop record of the kit (no formation)'
        else:
            raise AssertionError('kit unit with no roster unit and no rule: ' + kid)
        stray(gid, kid, u['name'], u['branch'] if u['branch'] in ('artillery', 'cavalry') else 'infantry', 'US' if u['army'] == 'union' else 'CS', par, why, u.get('scope') or 'record')
    for did, d in defaults.items():
        e = {'unit_id': did, 'name': 'default record: ' + did, 'name_printed': did, 'level': 'default', 'arm': d.get('branch'), 'army': 'US' if d['army'] == 'union' else 'CS', 'parent': None, 'status': 'default every unit of that army and arm inherits', 'in_roster': False, 'leaf': True,
             'kit': [{'id': did, 'how': 'default', 'note': 'printed basis: ' + str(d.get('printed_basis'))[:140]}], 'fields': collections.OrderedDict(), 'current': {}}
        ch = chain_fields({}, defaults, did)
        e['kit_fields'] = {f: (ch[f][0] + ('*' if ch[f][1] else '')) if f in ch else 'E' for f in KIT_FIELDS}
        if 'weapon' in ch:
            e['fields']['arms'] = [ch['weapon'][0] + ('*' if ch['weapon'][1] else ''), 'default draw: ' + ch['weapon'][2][:160], ch['weapon'][3][:4]]
        cnt = collections.Counter(v[0] for k, v in e['kit_fields'].items() if k != 'weapon')
        e['fields']['dress'] = [''.join('%s%d' % (c, cnt[c]) for c in 'DIPGE' if cnt[c]), 'default mix; the weights are tuning parameters with no historical basis', []]
        entries['army-hq'].append(e)

    ix_records = J('library', 'or27_index.json')['records']
    enrich(entries, by, None, ix_records, J('library', 'statevol_index.json'))
    sources = build_sources()
    groups = []
    for gid, g in G.items():
        us = entries[gid]
        states = sorted({m for e in us for m in re.findall(r'\b([A-Z]{2})\b', e['name'] or '') if m in STATE_VOLS})
        vols = [v for st in states for v in STATE_VOLS[st]] + ARMY_VOLS[g['army']]
        vols = [v for i, v in enumerate(vols) if v in sources and v not in vols[:i]]
        lv = collections.Counter(e['level'] for e in us)
        fs = collections.OrderedDict()
        for f in ('roster', 'commander', 'strength', 'casualties', 'arms', 'guns', 'dress'):
            c = collections.Counter(e['fields'][f][0][0] for e in us if f in e['fields'])
            if c:
                fs[f] = {k: c[k] for k in 'DIPGE' if c[k]}
        rd = {'read_reports': 0, 'read_kchars': 0, 'search_reports': 0, 'search_kchars': 0}
        for r in g['reports']:
            pa = int(r['from'].split('-')[1])
            for x in ix_records:
                if x['part'] == pa and r['from'] <= x['id'] <= r['to']:
                    k = 'read' if r.get('mode', 'read') == 'read' else 'search'
                    rd[k + '_reports'] += 1
                    rd[k + '_kchars'] += (x['end_offset'] - x['start_offset']) // 1000
        npg = 0
        for t in g['tables']:
            for part in t['pages'].split(','):
                a_, _d, b_ = part.strip().partition('-')
                npg += (int(b_) - int(a_) + 1) if b_ else 1
        rd['table_pages'] = npg
        groups.append(collections.OrderedDict([
            ('id', gid), ('title', g['title']), ('army', g['army']), ('roots', g['roots']), ('note', g['note']), ('reading', rd),
            ('counts', {'units': len(us), 'in_roster': sum(1 for e in us if e['in_roster']), 'kit_only': sum(1 for e in us if not e['in_roster']), 'by_level': dict(sorted(lv.items())), 'field_status': fs}),
            ('reading_list', {'tables': [dict(t, source_id=t['report_id'][:6]) for t in g['tables']], 'reports': [dict(r, source_id=r['from'][:6]) for r in g['reports']], 'volumes': vols,
                              'note': 'Page numbers are printed pages from the leaf map (or27_leaf_pages.json) at the head of the block; read the neighbouring pages too. Report ranges come from the index, whose author and unit strings are raw OCR.'}),
            ('units', us)]))
    ids = [e['unit_id'] for g in groups for e in g['units']]
    assert len(ids) == len(set(ids)), 'a unit sits in two groups'
    assert set(u['id'] for u in hist) <= set(ids)
    inputs = collections.OrderedDict()
    for rel in ('docs/battle-theatre/history/units.json', 'docs/battle-theatre/kit/kit_specs.json', 'docs/battle-theatre/kit/artillery_batteries.json', 'docs/battle-theatre/kit/cavalry_units.json', 'docs/battle-theatre/kit/weapons.json',
                'docs/battle-theatre/app/data/kit-crosswalk.json', 'docs/battle-theatre/app/data/battery-guns.json', 'docs/battle-theatre/library/or27_index.json'):
        inputs[rel] = sha256(os.path.join(ROOT, rel))[:16]
    catalog = {'kit_items': sorted(ks['items']), 'weapons': sorted(wp['weapons']), 'artillery_pieces': sorted(wp['artillery']['pieces'])}
    doc = collections.OrderedDict([
        ('schema', 'kit-evidence-groups-1'),
        ('_doc', 'Research groups of the kit evidence pass. A group engineer reads evidence/PLAN.md sections 5 to 7 (sources, the evidence file contract, the order of work) before writing a line, writes evidence/<group>.jsonl, and validates it with python -I tools/bt/kit_evidence_check.py <group> --coverage --diff. unit_id is the roster id of history/units.json where the roster has the unit, else the kit record id. fields: field -> [status, what is there now, source keys]; status letters D documented as built (support never re-read), I inferred, P plausible-procedural, G registered open gap, E empty; * = on the unit\'s own record. kit_fields: the same letters for each kit field. Regenerated by running tools/bt/kit_evidence_plan.py: change that script, not this file.'),
        ('inputs_sha256_16', inputs), ('field_vocabulary', FIELDS), ('kit_fields', KIT_FIELDS), ('catalog', catalog),
        ('totals', {'groups': len(groups), 'units': len(ids), 'in_roster': sum(1 for g in groups for e in g['units'] if e['in_roster'])}),
        ('groups', groups)])
    src_doc = collections.OrderedDict([
        ('schema', 'kit-evidence-sources-1'),
        ('_doc', 'Local source texts an evidence line may cite. Every one is a printed work (none is a lead source); the class says what kind of witness it is. Offsets in evidence lines are character offsets into local_path decoded as UTF-8 with newline=\'\'. page_model: leaf = scan-leaf map (or27_leaf_pages.json), anchors = running heads of the state-volume index, none = give the page you read from the nearest running head or leave it null. A source that is not listed here is declared by a line of type "source" at the top of the group file.'),
        ('lead_classes_never_documented', LEAD_CLASSES), ('sources', sources)])
    return doc, src_doc


def inventory_md(doc):
    L = ['# Unit inventory of the kit evidence pass', '',
         'Built by `tools/bt/kit_evidence_plan.py` from the roster (`history/units.json`) and the kit tables; do not edit. One table per research group.',
         'Letters: **D** documented as built (its support was never re-read against the source), **I** inferred, **P** plausible-procedural, **G** registered open gap, **E** empty. `*` = the value sits on the unit\'s own record. Dress: count of the twelve dress fields by letter.', '']
    tot = collections.Counter()
    for g in doc['groups']:
        for e in g['units']:
            for f, v in e['fields'].items():
                tot[(f, v[0][0])] += 1
    L += ['## Totals over %d units in %d groups' % (doc['totals']['units'], doc['totals']['groups']), '', '| Field | D | I | P | G | E | units that carry the field |', '|---|---|---|---|---|---|---|']
    for f in ('roster', 'commander', 'strength', 'casualties', 'arms', 'guns'):
        row = [tot[(f, k)] for k in 'DIPGE']
        L.append('| %s | %s | %d |' % (f, ' | '.join(str(x) for x in row), sum(row)))
    kf = collections.Counter()
    n_kf = 0
    for g in doc['groups']:
        for e in g['units']:
            for f, v in (e.get('kit_fields') or {}).items():
                if f != 'weapon':
                    kf[v[0]] += 1
                    n_kf += 1
    L.append('| dress (twelve kit fields per unit) | %s | %d field cells |' % (' | '.join(str(kf[k]) for k in 'DIPGE'), n_kf))
    L.append('')
    for g in doc['groups']:
        L += ['## %s' % g['id'], '', g['title'], '', '%d units (%d in the roster, %d kit records with no roster unit).' % (g['counts']['units'], g['counts']['in_roster'], g['counts']['kit_only']), '',
              '| unit id | name | level | on field | roster | commander | strength | casualties | arms or guns | dress | kit record |', '|---|---|---|---|---|---|---|---|---|---|---|']
        for e in g['units']:
            f = e['fields']
            ag = f.get('guns') or f.get('arms')
            st = {'on_field': 'yes', 'partly_on_field': 'partly', 'never_on_field': 'no', 'never_main_field': 'not on the main field'}.get(e['status'], e['status'])
            L.append('| `%s` | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (
                e['unit_id'], (e['name'] or '').replace('|', '/'), e['level'], st, f['roster'][0] if 'roster' in f else '-', f['commander'][0] if 'commander' in f else '-', f['strength'][0] if 'strength' in f else '-', f['casualties'][0] if 'casualties' in f else '-',
                (ag[0] if ag else '-'), (f['dress'][0] if 'dress' in f else '-'), ', '.join('`%s`' % k['id'] for k in e['kit']) or '-'))
        L.append('')
    return '\n'.join(L) + '\n'


# ---------------------------------------------------------------------------------------------------------------------
# PLAN.md: the regions between <!-- BEGIN GENERATED name --> and <!-- END GENERATED name --> are rewritten from the data; the rest is hand-written
def region_groups(doc):
    L = ['| group | army | units (roster + kit only) | leaf units | required (unit, field) pairs | reports to read (k chars) | reports to search | table pages | what it covers |', '|---|---|---|---|---|---|---|---|---|']
    tot = collections.Counter()
    for g in doc['groups']:
        c, r = g['counts'], g['reading']
        leaves = sum(1 for u in g['units'] if u['leaf'])
        pairs = sum(len(u['required']) for u in g['units'])
        tot.update({'units': c['units'], 'roster': c['in_roster'], 'kit': c['kit_only'], 'leaves': leaves, 'pairs': pairs})
        L.append('| `%s` | %s | %d (%d + %d) | %d | %d | %d (%dk) | %d | %d | %s |' % (g['id'], g['army'], c['units'], c['in_roster'], c['kit_only'], leaves, pairs, r['read_reports'], r['read_kchars'], r['search_reports'], r['table_pages'], g['title'].replace('|', '/')))
    L.append('| **total** | | **%d (%d + %d)** | **%d** | **%d** | | | | |' % (tot['units'], tot['roster'], tot['kit'], tot['leaves'], tot['pairs']))
    return '\n'.join(L)


def region_inventory(doc):
    tot = collections.Counter()
    for g in doc['groups']:
        for e in g['units']:
            for f, v in e['fields'].items():
                tot[(f, v[0][0])] += 1
    L = ['| field | documented (as built) | inferred | plausible-procedural | gap | empty | units that carry the field |', '|---|---|---|---|---|---|---|']
    for f in ('roster', 'commander', 'strength', 'casualties', 'arms', 'guns'):
        row = [tot[(f, k)] for k in 'DIPGE']
        L.append('| %s | %s | %d |' % (f, ' | '.join(str(x) for x in row), sum(row)))
    kf = collections.Counter()
    n = 0
    for g in doc['groups']:
        for e in g['units']:
            for f, v in (e.get('kit_fields') or {}).items():
                if f != 'weapon':
                    kf[v[0]] += 1
                    n += 1
    L.append('| dress (the twelve kit fields other than weapon, defaults included) | %s | %d field cells |' % (' | '.join(str(kf[k]) for k in 'DIPGE'), n))
    return '\n'.join(L)


def region_contract(doc):
    if HERE not in sys.path:
        sys.path.insert(0, HERE)
    import kit_evidence_check as CC
    return CC.contract_markdown()


def region_examples(doc):
    with open(os.path.join(OUT, 'examples.jsonl'), encoding='utf-8') as f:
        lines = [x.rstrip('\n') for x in f if x.strip()]
    return '```jsonl\n' + '\n'.join(lines) + '\n```'


REGIONS = {'groups': region_groups, 'inventory': region_inventory, 'contract': region_contract, 'examples': region_examples}


def refresh_plan(text, doc):
    for name, fn in REGIONS.items():
        b, e = '<!-- BEGIN GENERATED %s -->' % name, '<!-- END GENERATED %s -->' % name
        if b not in text or e not in text:
            raise SystemExit('PLAN.md lacks the markers %s ... %s' % (b, e))
        i, j = text.index(b) + len(b), text.index(e)
        text = text[:i] + '\n' + fn(doc) + '\n' + text[j:]
    return text


def dumps(o):
    return json.dumps(o, ensure_ascii=False, indent=1) + '\n'


def main(argv):
    doc, src_doc = build()
    files = {'groups.json': dumps(doc), 'sources.json': dumps(src_doc), 'INVENTORY.md': inventory_md(doc)}
    plan_path = os.path.join(OUT, 'PLAN.md')
    if os.path.exists(plan_path):
        with open(plan_path, encoding='utf-8') as f:
            files['PLAN.md'] = refresh_plan(f.read(), doc)
    if '--check' in argv:
        bad = [n for n, t in files.items() if not os.path.exists(os.path.join(OUT, n)) or open(os.path.join(OUT, n), encoding='utf-8').read() != t]
        print('kit_evidence_plan --check:', 'OK' if not bad else 'DIFFERS: ' + ', '.join(bad))
        return 1 if bad else 0
    os.makedirs(OUT, exist_ok=True)
    for n, t in files.items():
        tmp = os.path.join(OUT, '%s.%d.tmp' % (n, os.getpid()))          # written beside the file and renamed: the group engineers read these files while they work, and never meet a half-written one
        with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
            f.write(t)
        os.replace(tmp, os.path.join(OUT, n))
        print('wrote %s (%d bytes)' % (os.path.relpath(os.path.join(OUT, n), ROOT), len(t.encode('utf-8'))))
    print('%d groups, %d units (%d in the roster), %d sources' % (doc['totals']['groups'], doc['totals']['units'], doc['totals']['in_roster'], len(src_doc['sources'])))
    for g in doc['groups']:
        print('  %-22s %3d units  %s' % (g['id'], g['counts']['units'], g['counts']['by_level']))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
