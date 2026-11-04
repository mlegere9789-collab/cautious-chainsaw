"""Hand-curated interpretation of the PDF B.2.4 ledger 'First on the field' cells (and the few other cells that carry a
gating fact). Every entry quotes the printed wording in 'text'. Nothing here is a new fact: a clock value appears only where
the printed cell states one. Named periods ('evening', 'dusk', 'night') are NOT arrival clocks; they are resolved only by
the checker conventions in NAMED_PERIODS below and are labelled as such.

Time zone: local mean time (LMT) as printed in the PDF, ISO-like 'YYYY-MM-DDTHH:MM'."""

J30 = '1863-06-30'
J1 = '1863-07-01'
J2 = '1863-07-02'
J3 = '1863-07-03'

# Checker conventions for named periods. NOT historical arrival claims. Source: PDF B.2.2 convention note
# ("[NIGHT] = after the end of civil twilight (20:04) and before its start (04:03); [DUSK] = sunset 19:32 to 20:04;
# [DAWN] = civil twilight start 04:03 to sunrise 04:35"); sunrise on Jul 3 = 04:36 LMT (PDF timeline row T2-246, B.2.2).
# The PDF does not define the word 'evening' as a clock time; its timeline marks 'evening' rows [DUSK], so the start of
# [DUSK] (sunset 19:32) is used as the conservative floor. Owner decision recommended.
NAMED_PERIODS = {
    'dusk': {'t': J2 + 'T19:32', 'basis': 'PDF B.2.2: [DUSK] = sunset 19:32 to 20:04 (start of band)'},
    'evening': {'t': J2 + 'T19:32', 'basis': "PDF defines no clock for 'evening'; PDF timeline rows 'Jul 2 evening' are marked [DUSK]; start of [DUSK] (sunset 19:32) used as conservative floor"},
    'night': {'t': J2 + 'T20:04', 'basis': 'PDF B.2.2: [NIGHT] = after end of civil twilight (20:04)'},
    'sunrise_jul3': {'t': J3 + 'T04:36', 'basis': 'PDF: sunrise on Jul 3 = 04:36 LMT; C-021 default "not shown before dawn Jul 3"'},
}


def V(t, text, approx=True, src=None, role='arrival', src_text=None, note=None, from_row=None):
    d = {'t': t, 'text': text, 'approx': approx, 'sources': src or [], 'role': role}
    if src_text:
        d['source_text'] = src_text
    if note:
        d['note'] = note
    if from_row:
        d['from_row'] = from_row
    return d


def C(cid, link, cell, note=None):
    d = {'id': cid, 'link': link, 'cell': cell}
    if note:
        d['note'] = note
    return d


# link vocabulary:
#   'cited'            the row itself prints the C-nnn id
#   'cited_by_reference'  the row says 'see the gate table' (no id printed); resolved by topic
#   'topic_arrival'    same topic as the register entry, arrival cell; the row does not cite it
#   'topic_other_cell' register topic matches a time in another cell of the row (night/key/left/commander)

SPEC = {}

# ------------------------------------------------------------------ UNION
SPEC['us-aop-hq'] = dict(
    values=[
        V(J2 + 'T00:00', 'after midnight Jul 1-2 (about 00:00-01:00)', src=['SS1', 'W-D1'], note='sources attributed from C-001 (the cell itself prints none for this value)'),
        V(J2 + 'T01:00', 'after midnight Jul 1-2 (about 00:00-01:00), range end', src=['SS1', 'W-D1']),
        V(J2 + 'T04:00', 'alternative about 04:00 (EPP)', src=['EPP']),
    ],
    kind='alternatives', default=J2 + 'T01:00',
    default_basis="C-001 recommended default 'about 01:00, then a pre-dawn inspection of the line' (B.2.5; PENDING OWNER). Row does not cite C-001.",
    conflicts=[C('C-001', 'topic_arrival', 'first_on_field'), C('C-024', 'topic_other_cell', 'night_positions', "council of war '21:00 to midnight window'")],
)

SPEC['us-hancock-acting'] = dict(
    values=[
        V(J1 + 'T15:00', 'about 15:00 (his report)', src_text='his report'),
        V(J1 + 'T16:00', 'before 16:00', approx=False, role='bound_upper', src=[]),
        V(J1 + 'T16:00', 'about 16:00', src=['SS1', 'WHN-HAN']),
        V(J1 + 'T16:30', 'about 16:30', src=['CWN-HAN']),
    ],
    kind='alternatives', default=J1 + 'T15:00', default_range=[J1 + 'T15:00', J1 + 'T16:00'],
    default_basis="C-039 recommended default 'about 15:00-16:00' (a range; start used as gate) (B.2.5; PENDING OWNER). Row does not cite C-039.",
    conflicts=[C('C-039', 'topic_arrival', 'first_on_field')],
    note='person row: no troops of his own',
)

SPEC['us-1c'] = dict(
    values=[
        V(J1 + 'T10:00', 'head about 10:00 on the Emmitsburg Road'),
        V(J1 + 'T10:20', 'vanguard (Wadsworth) at McPherson Ridge about 10:20'),
    ],
    kind='staged', default='earliest', default_basis='two stages (head, vanguard) of one arrival, not a conflict; earliest used',
    conflicts=[C('C-040', 'topic_other_cell', 'commanders', "Reynolds killed 'about 10:15-10:50'"), C('C-043', 'topic_other_cell', 'key_positions', "'15:45-17:00 retreat through town'")],
)

SPEC['us-1c-1d'] = dict(
    values=[V(J1 + 'T10:20', 'about 10:20 (vanguard)')], kind='single', default='earliest',
    default_basis='single printed value',
)

SPEC['us-1c-2d'] = dict(
    values=[V(J1 + 'T11:00', 'Coulter massed near the railroad embankment about 11:00', src=['OR-COULTER'])],
    kind='single', default='earliest', default_basis='only clock time in the cell',
    non_clock=[
        {'text': "Doubleday places Robinson's arrival in the afternoon", 'sources': ['OR-DOUBLEDAY'], 'note': 'source key attributed from the row list; the cell prints no key for this clause'},
        {'text': 'late morning to early afternoon', 'sources': ['W-D1']},
    ],
    lower_bound_uncertain="'late morning' could be earlier than 11:00; no clock stated",
)

SPEC['us-1c-3d'] = dict(
    values=[], window_reason="Biddle and Stone: 'late morning to early afternoon' (period, no clock time). Stannard: see subunit.",
    date_floor=J1 + 'T00:00', date_floor_basis="'Jul 1 late morning to early afternoon (Biddle, Stone)'",
    subunits=[dict(unit='us-1c-3d-stannard', t=J2 + 'T18:00', approx=True, kind='earliest_documented_sighting',
                   text="Stannard's Vermont brigade: earliest documented sighting is the line on Jul 2 about 18:00; earlier arrival not in the notes (gap)",
                   src=['W-D1', 'SS2', 'SS1'], gap=True)],
)

SPEC['us-1c-art'] = dict(
    values=[V(J1 + 'T10:00', 'Hall replaces Calef about 10:00-10:45, range start'), V(J1 + 'T10:45', 'Hall replaces Calef about 10:00-10:45, range end')],
    kind='range', default='earliest', default_basis='one event printed as a range; range start used (no register entry)',
)

SPEC['us-2c'] = dict(
    values=[
        V(J1 + 'T22:30', 'about 22:30 Jul 1', src=['W-CEMR'], src_text='Wikipedia, Cemetery Ridge'),
        V(J2 + 'T06:00', 'about 06:00', src=['EPP']),
        V(J2 + 'T07:00', 'about 07:00', src=['FREE'], src_text='OR 27/1 p.369 via Freeman'),
    ],
    kind='alternatives', default=J2 + 'T06:00',
    default_basis="C-004 recommended default '06:00 Jul 2 (head), tails later' (B.2.5; PENDING OWNER). The row says 'see the gate table below' and prints no C-id; C-004 is the only B.2.5 entry on II Corps arrival.",
    non_clock=[{'text': "dawn Jul 2 ('pre-dawn/dawn')", 'sources': ['13MA'], 'src_text': '13th Mass'}],
    conflicts=[C('C-004', 'cited_by_reference', 'first_on_field', "row text: 'see the gate table below'")],
)

SPEC['us-2c-1d'] = dict(
    values=[], window_reason="date only ('Jul 2 on the Cemetery Ridge'); the clock time printed (about 17:30-18:00) is the Wheatfield engagement, not arrival",
    date_floor=J2 + 'T00:00', date_floor_basis="'Jul 2 on the Cemetery Ridge'",
    unparsed=[('left_or_moved', "text 'Hospital moves after Jul 3 overshots': the word 'overshots' is unexplained (possible stray text); stored verbatim")],
)

SPEC['us-2c-2d'] = dict(
    values=[V(J2 + 'T06:00', 'about 06:00 (EPP; per EPP the arriving II Corps unit is Gibbon\'s division)', src=['EPP'])],
    kind='single', default='earliest', default_basis='single printed value',
    conflicts=[C('C-004', 'topic_arrival', 'first_on_field', 'same EPP 06:00 value as the C-004 list; the row does not cite it')],
)

SPEC['us-2c-3d'] = dict(
    values=[], window_reason="'Jul 2 (time unstated; presumably with the corps)': no clock time",
    date_floor=J2 + 'T00:00', date_floor_basis="'Jul 2 (time unstated ...)'",
    note='This row is printed twice (end of PDF p.59 and again complete on p.60); p.60 version used.',
)

SPEC['us-2c-art'] = dict(
    values=[], window_reason="first-on-field cell is 'Gap'", gap=True,
)

SPEC['us-3c'] = dict(
    values=[
        V(J1 + 'T20:00', "Birney's division: dusk Jul 1 (about 20:00) on Cemetery Ridge via the Emmitsburg Road", src=['SS1', 'W-CEMR']),
        V(J2 + 'T07:00', 'alternative Jul 2 about 07:00 at the Little Round Top area', src=['EPP']),
    ],
    kind='alternatives', default=None, default_basis='no B.2.5 entry matches Birney\'s arrival; no default recorded (gate falls back to earliest)',
    conflicts=[C('C-010', 'topic_other_cell', 'key_positions', "'Jul 2 about 12:00-14:00 advance to Emmitsburg Road'"),
               C('C-017', 'topic_other_cell', 'left_or_moved', "cell: 'Jul 7 French replaces Sickles'; C-017 asks who replaced Sickles (Birney; Hancock): different event, see notes")],
)

SPEC['us-3c-1d'] = dict(
    values=[V(J1 + 'T20:00', 'Dusk Jul 1 (about 20:00)')], kind='single', default='earliest', default_basis='single printed value',
    conflicts=[C('C-009', 'topic_other_cell', 'key_positions', "'Jul 2 11:00 Berdan to Pitzer's Woods'")],
)

SPEC['us-3c-2d'] = dict(
    values=[
        V(J2 + 'T00:00', 'about 00:00 Jul 2', src=['EPP']),
        V(J2 + 'T02:00', 'about 02:00 Jul 2', src=['SS1']),
        V(J1 + 'T21:00', 'counter-marching at about 21:00 on the Black Horse Tavern road', role='other', note='movement, not arrival'),
    ],
    kind='alternatives', default=J2 + 'T02:00',
    default_basis='C-002 recommended default 02:00 (B.2.5; PENDING OWNER). Row prints only "Values conflict" and does not cite C-002.',
    conflicts=[C('C-002', 'topic_arrival', 'first_on_field')],
)

SPEC['us-3c-art'] = dict(
    values=[], window_reason="brigade: only Smith's battery has a time ('09:00 Jul 2'); 'others gap'", gap=True,
    subunits=[dict(unit='us-3c-art-4ny', t=J2 + 'T09:00', approx=False, kind='earliest_documented_position',
                   text="Smith's battery at Devil's Den 09:00 Jul 2; others gap", src=[], gap=False)],
)

SPEC['us-5c'] = dict(
    values=[
        V(J2 + 'T05:00', 'about 05:00 Jul 2', src=['EPP']),
        V(J2 + 'T08:00', 'about 08:00', src=['FREE'], src_text='OR 27/1 p.592 via Freeman'),
        V(J2 + 'T07:00', 'lead regiments about 07:00 (20th Maine on the heights southeast of town)', src=['CHAM'], src_text='from Chamberlain'),
    ],
    kind='alternatives', default=J2 + 'T08:00',
    default_basis="C-003 recommended default 'head at 08:00 near Power's Hill' (B.2.5; PENDING OWNER). Row does not cite C-003.",
    conflicts=[C('C-003', 'topic_arrival', 'first_on_field', "C-003 'All values' lists 05:00 and 08:00 only; the row's third value (lead regiments about 07:00, CHAM) is absent from the register")],
)

SPEC['us-5c-3d'] = dict(
    values=[], window_reason="first-on-field cell begins 'Gap'", gap=True,
    event_floor=dict(t=J2 + 'T19:00', approx=True, text="McCandless counterattacks about 19:00-19:30 (Fisher's brigade 'on the field at dusk Jul 2')",
                     basis='gating rule 3: appears no earlier than the next documented event that required it'),
)

SPEC['us-6c'] = dict(
    values=[
        V(J2 + 'T14:00', "head about 14:00 Jul 2 (Meade, per Hessler)", src=['HESS']),
        V(J2 + 'T17:00', 'main body at Rock Creek about 17:00', src=['SS2']),
    ],
    kind='staged', default=J2 + 'T14:00',
    default_basis="C-022 recommended default 'head 14:00, main body 17:00' (B.2.5; PENDING OWNER). Row prints 'Values conflict' and does not cite C-022.",
    conflicts=[C('C-022', 'topic_arrival', 'first_on_field')],
)

SPEC['us-11c'] = dict(
    values=[
        V(J1 + 'T12:30', 'head about 12:30-13:00, range start'),
        V(J1 + 'T13:00', 'head about 12:30-13:00, range end'),
        V(J1 + 'T12:30', "Howard's report about 12:30", src_text="Howard's report"),
    ],
    kind='alternatives', default=None, default_basis='no B.2.5 entry; no default recorded (gate falls back to earliest)',
    upper_bounds=[{'text': 'before noon', 'sources': ['W-D1'], 't_upper': J1 + 'T12:00', 'note': 'earlier than every clock value; no lower bound stated'}],
    lower_bound_uncertain="'before noon (W-D1)' is earlier than 12:30 and has no stated lower bound",
)

SPEC['us-12c'] = dict(
    values=[V(J1 + 'T17:30', "Williams's division approaches 17:30; Geary on Cemetery Ridge 17:30")], kind='single', default='earliest',
    default_basis='single printed time (two clauses)',
    subunits=[dict(unit='us-12c-1d-lockwood', t=J2 + 'T08:00', approx=True, kind='arrival', text="Lockwood's brigade arrives Jul 2 about 08:00 from Baltimore", src=[], gap=False)],
    conflicts=[C('C-025', 'topic_other_cell', 'night_positions', "'return overnight' (Geary back to Culp's Hill)"), C('C-028', 'topic_other_cell', 'key_positions', "'Jul 3 04:30 artillery opens'")],
    note="cell is headed 'Jul 1 evening' but prints 17:30 (before the PDF sunset 19:32): label/clock tension",
)

SPEC['us-cav-1d'] = dict(
    values=[V(J30 + 'T11:00', 'Jun 30 about 11:00 enters Gettysburg')], kind='single', default='earliest', default_basis='single printed value',
    conflicts=[C('C-027', 'topic_other_cell', 'night_positions', "'Jul 2: after noon at Taneytown / Westminster / Emmitsburg (sources conflict)'")],
    subunits=[dict(unit='us-cav-1d-merritt', t=J3 + 'T15:00', approx=True, kind='key_position_derived',
                   text="Merritt: leaves Emmitsburg noon Jul 3; about 15:00 on the Emmitsburg Road (key-positions cell; the first-on-field cell gives Jun 30 only for the division)",
                   src=[], gap=False, derived=True)],
)

SPEC['us-cav-2d'] = dict(
    values=[V(J2 + 'T12:00', 'Jul 2 noon at Hanover / Low Dutch Road junction', approx=False)], kind='single', default='earliest', default_basis='single printed value',
)

SPEC['us-cav-3d'] = dict(
    values=[V(J2 + 'T16:30', 'Jul 2 about 16:30 at Hunterstown (from where: gap)')], kind='single', default='earliest', default_basis='single printed value',
    note='Hunterstown is north-east of the town; the cell places the first appearance there.',
)

SPEC['us-art-reserve'] = dict(
    values=[], window_reason="first-on-field cell is 'Gap (arrival hours not found)'", gap=True,
    date_floor=J2 + 'T00:00', date_floor_basis="night cell: 'Jul 2: camped on the Spangler farm (106 guns, about 2,300 men)'",
)

# ------------------------------------------------------------------ CONFEDERATE
SPEC['cs-anv-hq'] = dict(
    values=[
        V(J1 + 'T13:30', 'Herr Ridge about 13:30', src=['SS1']),
        V(J1 + 'T14:30', 'about 14:30', src=['W-D1']),
    ],
    kind='alternatives', default=J1 + 'T13:30',
    default_basis='C-042 recommended default 13:30 (B.2.5; PENDING OWNER). Row does not cite C-042.',
    conflicts=[C('C-042', 'topic_arrival', 'first_on_field'),
               C('C-006', 'topic_other_cell', 'key_positions', "'Jul 2 05:15 (range) conference with Longstreet'"),
               C('C-008', 'topic_other_cell', 'key_positions', "'about 11:00 attack order'")],
)

SPEC['cs-1c'] = dict(
    values=[
        V(J2 + 'T05:30', 'Hood behind Seminary Ridge 06:30 (range 05:30-07:30), range start', approx=False),
        V(J2 + 'T06:30', 'Hood behind Seminary Ridge 06:30', approx=False),
        V(J2 + 'T07:30', 'Hood range end', approx=False),
        V(J2 + 'T08:00', 'McLaws 08:00 (range 08:00-08:30)', approx=False),
        V(J2 + 'T08:30', 'McLaws range end', approx=False),
        V(J1 + 'T17:30', 'march orders', approx=False, role='other', note='orders, not arrival'),
        V(J2 + 'T00:00', 'McLaws halts west of town about 00:00', role='other', note='west of town, not on the field'),
        V(J2 + 'T01:00', 'Hood halts west of town about 01:00', role='other', note='west of town, not on the field'),
    ],
    kind='range', default=J2 + 'T06:30',
    default_basis="C-005 recommended default 06:30 for Hood; also printed in the cell. Row does not cite C-005/C-007.",
    conflicts=[C('C-005', 'topic_arrival', 'first_on_field'), C('C-007', 'topic_arrival', 'first_on_field')],
)

SPEC['cs-1c-mclaws'] = dict(
    values=[
        V(J2 + 'T08:00', '08:00 Jul 2 behind Seminary Ridge', approx=False),
        V(J2 + 'T08:30', 'range end 08:30 (printed in the I Corps row: McLaws 08:00 (range 08:00-08:30))', approx=False, from_row='cs-1c'),
    ],
    kind='alternatives', default=J2 + 'T08:00',
    default_basis="C-007 recommended default 08:00 (B.2.5; PENDING OWNER). The division row prints only 08:00; 08:30 comes from the I Corps row / C-007.",
    conflicts=[C('C-007', 'topic_arrival', 'first_on_field')],
)

SPEC['cs-1c-hood'] = dict(
    values=[
        V(J2 + 'T05:30', '06:30 Jul 2 (range 05:30-07:30), range start', approx=False),
        V(J2 + 'T06:30', '06:30 Jul 2', approx=False),
        V(J2 + 'T07:30', 'range end', approx=False),
    ],
    kind='range', default=J2 + 'T06:30', default_basis="C-005 recommended default 06:30 (B.2.5; PENDING OWNER); also the headline value in the cell",
    conflicts=[C('C-005', 'topic_arrival', 'first_on_field'), C('C-011', 'topic_other_cell', 'key_positions', "'16:30 step-off'")],
    subunits=[dict(unit='cs-1c-hood-law', t=J2 + 'T12:00', approx=True, kind='arrival',
                   text="Law's brigade rejoins about noon after a march that began about 03:00 (EPP puts the start at 06:00)", src=[], gap=False,
                   note='EPP is printed only for the alternative march start (06:00), not for the noon rejoin time')],
)

SPEC['cs-1c-pickett'] = dict(
    values=[V(J2 + 'T06:00', 'begins marching to Gettysburg 06:00 Jul 2', src=['EPP'], role='other', note='marching start, not arrival on the field')],
    window_reason="no clock time for arrival on the field: the only clock (06:00 Jul 2, EPP) is when marching begins; arrival is stated as periods ('night of Jul 2' W-D2/PHIF; 'not until Jul 3' SS2; 'no order ... by daylight Jul 3' W-PC)",
    gate=dict(
        earliest=dict(period='night', t=J2 + 'T20:04', basis="'on the field the night of Jul 2 (W-D2, Phifer)'; night = after civil twilight 20:04 (PDF [NIGHT])", sources=['W-D2', 'PHIF']),
        default=dict(period='sunrise_jul3', t=J3 + 'T04:36', basis="C-021 default 'on the field the morning of Jul 3 (conservative: not shown before dawn Jul 3)'; sunrise 04:36 (gate Q04 task fixes 04:36)", sources=['SS2', 'W-PC']),
        latest=dict(period=None, t=J3 + 'T12:00', basis="key-positions cell: 'Jul 3 by noon: three brigades west of the Emmitsburg Road'", sources=[]),
    ),
    conflicts=[C('C-021', 'topic_arrival', 'first_on_field', 'the same four values appear in the row and in C-021')],
    unresolved=True,
)

SPEC['cs-1c-art'] = dict(
    values=[], window_reason="group row: only Alexander's battalion has times; 'Eshleman, Cabell, Dearing, Henry: gap'", gap=True,
    subunits=[
        dict(unit='cs-1c-res-art-alexander', values=[(J2 + 'T07:00', 'approaching 07:00'), (J2 + 'T09:00', 'reaches the ridge about 09:00')], default=J2 + 'T09:00',
             kind='arrival', text="Alexander: approaching 07:00, reaches the ridge about 09:00 Jul 2 (OR 27/2 p.429 and his report)", src=['ALEXR'], gap=False,
             default_basis="'reaches the ridge' is the on-the-ridge time; 07:00 is 'approaching' (location not stated)"),
        dict(unit='cs-1c-mclaws-cabell', t=J2 + 'T16:00', approx=False, kind='first_documented_event', text="Jul 2 16:00 Huger's four batteries and Cabell open (gap rule 3: no arrival time found)", src=[], gap=True),
        dict(unit='cs-1c-res-art-washington', t=J3 + 'T04:00', approx=False, kind='first_documented_event', text="Jul 3 04:00 Eshleman, Dearing, Cabell placed before daylight (Eshleman = Washington Artillery per the commander cell)", src=[], gap=True),
        dict(unit='cs-1c-pickett-dearing', t=J3 + 'T04:00', approx=False, kind='first_documented_event', text="Jul 3 04:00 Eshleman, Dearing, Cabell placed before daylight", src=[], gap=True),
    ],
)

SPEC['cs-2c'] = dict(
    values=[
        V(J1 + 'T14:30', "about 14:30 Ewell's right appears on Hill's left"),
        V(J1 + 'T11:00', 'about 11:00 hears the cannonade and turns toward Gettysburg (Rodes)', role='other', note='turn of march, not on the field'),
    ],
    kind='single', default='earliest', default_basis="only on-field time in the cell. Defect: Rodes's division row has Carter's guns on Oak Hill about 12:30, earlier than this corps time",
    conflicts=[C('C-019', 'topic_other_cell', 'key_positions', "'19:00-20:00 Culp's Hill attack'"), C('C-020', 'topic_other_cell', 'key_positions', "'19:30 East Cemetery Hill'")],
)

SPEC['cs-2c-early'] = dict(
    values=[V(J1 + 'T15:00', 'Jul 1 about 15:00-16:00 Barlow\'s Knoll, range start'), V(J1 + 'T16:00', 'range end')],
    kind='range', default='earliest', default_basis='one event printed as a range; range start used (no register entry)',
    pre_battle="Jun 26 occupies Gettysburg (date only; pre-battle campaign event, not used by the Q04 field gate)",
    conflicts=[C('C-020', 'topic_other_cell', 'key_positions', "'Jul 2 19:30 Hays and Avery on East Cemetery Hill'")],
)

SPEC['cs-2c-rodes'] = dict(
    values=[V(J1 + 'T12:30', 'Jul 1 about 12:30 on Oak Hill (Carter first)')], kind='single', default='earliest', default_basis='single printed value',
    conflicts=[C('C-041', 'topic_other_cell', 'key_positions', "'Jul 1 14:00 attack'")],
)

SPEC['cs-2c-johnson'] = dict(
    values=[V(J1 + 'T19:00', 'Jul 1 about 19:00 east of town', src=['EPP'])], kind='single', default='earliest', default_basis='only clock time in the cell',
    non_clock=[{'text': 'after sunset', 'sources': ['SS1'], 'note': 'PDF sunset Jul 1 = 19:32, later than the EPP 19:00 value'}],
    conflicts=[C('C-019', 'topic_other_cell', 'key_positions', "'19:00-20:00 crosses Rock Creek'")],
)

SPEC['cs-3c'] = dict(
    values=[], window_reason='cell gives locations, not an arrival time on the field', unparsed_first=("first_on_field", "text 'Jul 1: Heth at Cashtown; corps at Fayetteville Jun 29' states locations, not arrival on the field"),
    gate_from_children=True,
)

SPEC['cs-3c-heth'] = dict(
    values=[V(J1 + 'T07:30', 'Jul 1 about 07:30 first contact')], kind='single', default='earliest', default_basis='single printed value',
    pre_battle='Jun 29 Cashtown; Jun 30 Pettigrew\'s brigade raid reaches Gettysburg\'s edge, withdraws (dates only; pre-battle)',
)

SPEC['cs-3c-pender'] = dict(
    values=[V(J1 + 'T16:00', 'Jul 1 about 16:00 passes through Heth')], kind='single', default='earliest', default_basis='single printed value',
)

SPEC['cs-3c-anderson'] = dict(
    values=[V(J2 + 'T12:00', 'Jul 2 noon: reaches Seminary Ridge north of Pitzer\'s Woods', approx=False, src=['SS2'])],
    kind='single', default='earliest', default_basis='only clock time in the cell',
    non_clock=[{'text': 'early afternoon', 'sources': ['W-D2']}],
)

SPEC['cs-cav-div'] = dict(
    values=[], window_reason="cell reads 'See the cavalry rows below' (pointer to the brigade rows); the key-positions cell says 'Jul 2 early to mid afternoon reaches Lee' (period, no clock)",
    date_floor=J2 + 'T00:00', date_floor_basis="key-positions cell: 'Jul 2 early to mid afternoon reaches Lee'",
    conflicts=[C('C-023', 'topic_other_cell', 'key_positions', "Stuart's arrival: noon-13:00; mid-afternoon; afternoon; evening (register default: Stuart himself early afternoon, brigades in the evening)")],
    pointer=True,
)

SPEC['cs-cav-hampton'] = dict(
    values=[], window_reason="'arrives at dusk to night' (named periods, no clock time)",
    gate=dict(
        earliest=dict(period='dusk', t=J2 + 'T19:32', basis="'arrives at dusk to night'; dusk = start of [DUSK] band 19:32", sources=[]),
        default=dict(period='dusk', t=J2 + 'T19:32', basis="C-023 / gating rule 4: brigades gated to the evening of Jul 2; start of range used", sources=[]),
        latest=dict(period='night', t=J2 + 'T20:04', basis="'to night'; night begins 20:04", sources=[]),
    ),
    detached=[dict(role='rear guard at Hunterstown', location='hunterstown', t_from=J2 + 'T16:30', approx=True, t_to=None,
                   text='rear guard at Hunterstown, Jul 2 about 16:30 to dark', exempt_from='gating rule 4', sources=['W-HUN', 'HAMP'])],
    conflicts=[C('C-023', 'topic_arrival', 'first_on_field')],
)

SPEC['cs-cav-flee-chambliss'] = dict(
    values=[], window_reason="'Jul 2 evening (brigades arrive that evening)': named period, no clock time",
    gate=dict(
        earliest=dict(period='evening', t=J2 + 'T19:32', basis="'Jul 2 evening'; no clock in PDF; start of [DUSK] used", sources=[]),
        default=dict(period='evening', t=J2 + 'T19:32', basis="C-023 register default 'brigades in the evening'; gating rule 4", sources=[]),
        latest=dict(period=None, t=None, basis='no upper bound printed', sources=[]),
    ),
    conflicts=[C('C-023', 'topic_arrival', 'first_on_field')],
)

SPEC['cs-cav-jenkins'] = dict(
    values=[], window_reason="cell states 'Jun 29 at Carlisle with Ewell; attached to Stuart Jul 3': no arrival time on the field",
    unparsed_first=('first_on_field', "no arrival on the field stated; a Jul 2 wound (commander cell) and the timeline row T2-200 (brigades arrive Jul 2 evening) disagree with 'attached to Stuart Jul 3'"),
    unparsed_night=('night_positions', "printed text is 'Where wounded: gap', which is not a night position"),
    gate=dict(
        earliest=dict(period='evening', t=J2 + 'T19:32', basis='gating rule 4 (Stuart\'s cavalry brigades gated to the evening of Jul 2); applied to Jenkins as a Stuart brigade - my reading, see notes', sources=[]),
        default=dict(period='evening', t=J2 + 'T19:32', basis='gating rule 4', sources=[]),
        latest=dict(period=None, t=None, basis='no upper bound printed', sources=[]),
    ),
    conflicts=[C('C-023', 'topic_other_cell', 'first_on_field', 'timeline row T2-200 lists Jenkins among the brigades arriving Jul 2 evening; the ledger cell says attached to Stuart Jul 3')],
)

SPEC['cs-cav-robertson-jones-imboden'] = dict(
    values=[], window_reason="'Not engaged at Gettysburg main field (left guarding Virginia passes)': never on the main field",
    never_main_field=True,
    conflicts=[C('C-033', 'topic_other_cell', 'key_positions', "'Jul 4-5 Imboden's train' (C-033 Imboden departs Jul 4; Jul 5)")],
    detached=[dict(role="Jones's Laurel Brigade fights at Fairfield", location='fairfield', t_from=J3 + 'T00:00', approx=False, t_to=None,
                   text="Jones's Laurel Brigade fights at Fairfield Jul 3 (date only)", exempt_from=None, sources=['W-FF'], date_only=True)],
)
