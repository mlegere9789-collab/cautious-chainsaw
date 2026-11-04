"""Repair pass for ledger E (docs/battle-theatre/history/positions/positions_E.jsonl) after the independent fidelity audit
(FIDELITY_AUDIT_E.jsonl / FIDELITY_AUDIT_E_SUMMARY.md).

    python -I tools/bt/positions_E_recheck.py [--dry]

Reads the ledger, applies the per-claim decisions in PATCH (each carries the reason it was made), the author-rule tier changes, the
mechanical removal of unprinted time-of-day words from inferred claims, and writes the ledger back. A frozen copy of the ledger as it
stood before this pass is docs/battle-theatre/history/positions/_orig_E_audit/positions_E.jsonl. Every quote added or replaced is
verified by code inside its cited section (positions_E_lib.verify_quote) and is under 15 words. A change log is written to
positions/_orig_E_audit/recheck_E_changes.json (before/after of every changed field), from which RECHECK_E_NOTES.md was built.
The pass is idempotent: the patch sets explicit values, and the new claim is skipped when it already exists."""
import os, re, sys, json, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import positions_E_lib as L

POS = os.path.join(L.ROOT, 'docs', 'battle-theatre', 'history', 'positions')
LEDGER = L.LEDGER
LOG = os.path.join(POS, '_orig_E_audit', 'recheck_E_changes.json')
DRY = '--dry' in sys.argv
NULL = object()
P = 'POS-E-US-'

R_COOPER = 'Author is Private Thomas V. Cooper, a private and not a regimental officer: author rule (documented only where the regiment\'s own officer states the fact) gives inferred.'
R_NACH = 'Author is First Sergeant H. Nachtigall, a non-commissioned member and not an officer: author rule gives inferred.'
R_SHARPE = ('Author is Gen. George H. Sharpe, first colonel of the 120th New York but on Meade\'s staff at the battle, writing second-hand '
            '(the address follows a paper by Colonel Westbrook): not the regiment\'s officer stating what he saw; author rule gives inferred.')
R_KIDD = 'Author is Kidd, a captain of the 6th Michigan, speaking of another regiment (or of the division): not that unit\'s own officer; author rule gives inferred.'
R_BATES = ('The text lies after the words "Bates\' history says of this service" in Colonel Moore\'s address and no end of that quotation is printed '
           '(a second "Bates\' history says" opens the third-day text): it is Bates\' account quoted by Moore, not Moore\'s own statement; author rule gives inferred.')
AUTH_BATES = 'Bates\' History of Pennsylvania Volunteers, as quoted in Colonel Moore\'s address'
AUTH_MOORE_BATES = ('Colonel William Moore (73rd Pennsylvania; dedication address), or Bates\' History as quoted in it (the text follows "Bates\' history says of this service" '
                    'with no end of quotation printed)')

PATCH = {}


def patch(cid, **kw):
    assert kw.get('why'), cid
    PATCH[P + cid] = kw


# ---------------------------------------------------------------- the three material claims
patch('3C-2D-BREWSTER-120NY-001', tier='inferred',
      when={'printed': 'the angle of the Peach Orchard was broken towards 6 o’clock (Hunt, quoted); the change of front followed', 'date': '1863-07-02', 't_iso': None, 'approx': True,
            'description': 'time in a different sentence: "towards 6 o\'clock" is General Hunt\'s time (quoted in the same paragraph) for the breaking of the angle of the Peach Orchard; the line described by de Trobriand is the one after Graham was dislodged and the change of front made, read as about 6 p.m. onward (compiler\'s reading)'},
      place='Humphreys\' division line after the change of front: right held on to the Emmitsburg Road (Carr\'s Brigade), left extending towards Round Top; the 120th Regiment was that left',
      road='the Emmitsburg Road (right of the line)',
      activity='De Trobriand, as quoted by Sharpe: after Graham had been dislodged from the Peach Orchard Humphreys effected a change of front; his right held on to the Emmitsburg Road (Carr\'s Brigade) and his left extended towards Round Top, in the direction where Birney wished to form a new line, and this left was the 120th New York Regiment.',
      note='Re-dated and re-tiered at the repair pass. The line is de Trobriand\'s description, quoted by Sharpe, of the formation after the change of front (Hunt, also quoted, puts the breaking of the Peach Orchard angle towards 6 o\'clock). The earlier text dated it to the second position before 4 o\'clock and had the 120th "on the left of Humphreys\' division"; the paragraph on the second position (claim -002) does not say that. Sharpe, the regiment\'s first colonel, was on Meade\'s staff at the battle and here quotes another officer: tier inferred, as for BREWSTER-001. OCR hyphen breaks (\'Em- mitsburg\', \'un- daunted\') are the printed line breaks.',
      reasoning='The anchor sentence is de Trobriand\'s description (quoted by Sharpe) of the line after the change of front, about 6 p.m.; the author is a staff officer quoting another officer, so the tier is inferred.',
      why='Audit SHIFTED: the claim joined the second-position paragraph (before 4 o\'clock) to de Trobriand\'s later description of the line after the change of front. Dated to the passage\'s own time (after the angle broke, about 6 p.m.); tier lowered because Sharpe quotes another officer and was on staff.')
patch('3C-2D-BREWSTER-120NY-002', tier='inferred', why=R_SHARPE)
patch('3C-2D-BREWSTER-120NY-003', tier='inferred', why=R_SHARPE)

patch('3C-2D-CARR-26PA-006',
      when={'printed': 'upon the third day', 'date': '1863-07-03', 't_iso': None, 'approx': False, 'printed_date': 'the third day', 'date_reading': '1863-07-02',
            'date_basis': 'date field follows the printed words ("upon the third day" = July 3); in the sentence those words attach to Pickett\'s charge and the shock on Humphreys\' division belongs to the Peach Orchard attack of July 2 by the surrounding narrative: the compiler\'s reading July 2 is carried in date_reading; conflict inside the source, no default chosen'},
      place='the right of the line of Humphreys\' division (the sentence is dated \'upon the third day\')',
      activity='The speaker says the shock hurled against Humphreys\' Division of the Third Corps, especially against Carr\'s First Brigade and more particularly the 26th Pennsylvania, which held the right of the line, was greater than that at Pickett\'s front (the stone angle), Little Round Top, Culp\'s Hill or Buford\'s dismounted men. He names five Second Corps regiments (124th, 140th and 72nd Pennsylvania; 111th and 126th New York) as approaching the 26th Pennsylvania\'s losses and says the First Corps regiments he names lost less in killed and wounded in proportion to the number engaged; the opening of the address (pp. 195-196) says the 26th excelled all other Pennsylvania regiments in its losses in killed and wounded in proportion to the number engaged.',
      note='Date field departs from the narrative: the sentence says \'upon the third day\' (July 3), kept as printed in when.date; the compiler\'s reading July 2 (the Peach Orchard attack on Humphreys\' division) is in when.date_reading. The earlier wording "led all Pennsylvania regiments in killed and wounded" was implied by this sentence, not stated; the statement itself is printed at the opening of the address (pp. 195-196, in proportion to the number engaged) and is now cited as such.',
      tier='inferred', why='Audit SHIFTED: date field 1863-07-02 departed from the printed \'third day\'; and the loss ranking was implied here, stated only in the address opening. Date field now follows the printed words, the other reading is carried; activity reworded. ' + R_COOPER)
patch('3C-2D-CARR-26PA-001', tier='inferred', road=NULL, gaz=None,
      why='Road field "via Emmitsburg" named a place, not a road the passage prints; cleared, and the Emmitsburg Road gazetteer link (taken from the town name) cleared with it. ' + R_COOPER)
patch('3C-2D-CARR-26PA-002', tier='inferred', road=NULL, gaz=None,
      note='The passage names the Black Horse Tavern only as the place near which the column marched into the Confederate lines, and names no road there; the road to Gettysburg it resumed is \'the right road to Gettysburg\' (not named). Compiler\'s reading, not printed: that the column was on the Black Horse Tavern road (gazetteer GZ-051, which does not cross the loaded ground, audit reason road_outside_ground). Arrival at midnight July 1-2; the printed \'midnight\' is the speaker\'s phrase, no clock time. Humphreys\' division route per the OR (ledger A) is to be compared.',
      why='Audit minor: "the road passing the Black Horse Tavern" and "strayed onto the Black Horse Tavern road" went beyond the passage (the tavern is a place; no road is named). direction_or_road cleared, gloss moved to the note as the compiler\'s reading; the Black Horse Tavern Road gazetteer link (GZ-051, a road the passage does not name) cleared. ' + R_COOPER)
patch('3C-2D-CARR-26PA-003', tier='inferred',
      when={'printed': '(July 2, after the arrival at midnight and what proved but a nap)', 'date': '1863-07-02', 't_iso': None, 'approx': True},
      why='"early morning" is not printed (the passage gives the midnight arrival, a nap, then the awakening); gloss replaced by the printed sequence. ' + R_COOPER)
patch('3C-2D-CARR-26PA-004', tier='inferred', why=R_COOPER)
patch('3C-2D-CARR-26PA-005', tier='inferred', why=R_COOPER)

patch('3C-2D-CARR-84PA-003', tier='inferred', gaz=None,
      when={'printed': 'On the morning of the 1st of July until the 6th of July', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      place='the supply train then located between Emmitsburg and Gettysburg; with the train until relieved on the 6th of July, when it reported to Carr at Williamsport',
      activity='Carr\'s letter, printed in the 84th Pennsylvania\'s address: on the morning of July 1 the regiment was detailed by an order from headquarters to guard the supply train then located between Emmitsburg and Gettysburg; it remained on duty with the train until relieved by another regiment on July 6, when it reported to Carr for duty at Williamsport. Carr adds that he would suggest the monument be erected near where his headquarters had been before the second day\'s engagement, near the Emmitsburg road directly in front of the Roger\'s House (a suggestion for the monument\'s site, not a statement that the regiment or its monument stood there).',
      note='MAJOR FINDING: both the regiment\'s own statement (Captain Merchant, claims -001 and -002) and its brigade commander\'s letter place the 84th Pennsylvania with the supply train on July 1-6, NOT in the line of battle; the supply trains were ordered to report at Westminster. The regiment\'s presence on the field on July 2-3 (and the 84th PA\'s figures and drawing in the Battle Theatre) is not supported by this source and conflicts with the roster treatment of the 84th as on the field. Carried as a conflict for the Decision Log; no default chosen. Repair pass: the earlier wording said the monument "was placed near Carr\'s headquarters"; the letter only suggests it. Tier lowered to inferred because the author is the brigade commander writing in a letter quoted in the regiment\'s address.',
      reasoning='Carr was the brigade commander, not the regiment\'s officer; his letter is printed inside another speaker\'s address. The monument-site sentence is a suggestion.',
      why='Audit OVERSTATED: the letter only suggests the monument be erected near his headquarters; reworded to the suggestion. Tier lowered: a brigade commander quoted in an address (author rule). Emmitsburg Road gazetteer link cleared: the train was between two towns, no road feature.')
patch('3C-2D-CARR-84PA-001', author='Captain Thomas E. Merchant (84th Pennsylvania; dedication address)',
      why='Author field named the speaker only as "the dedication statement"; the address heading prints Captain Thomas E. Merchant (a regimental officer), recorded so the tier rests on a stated author.')
patch('3C-2D-CARR-84PA-002', author='Captain Thomas E. Merchant (84th Pennsylvania; dedication address)',
      why='Author field completed (address heading: Captain Thomas E. Merchant, a regimental officer). Passage re-read: road to Emmitsburg is printed, tier stands.')

# ---------------------------------------------------------------- 73rd Pennsylvania (Moore / Bates)
patch('11C-2D-COSTER-73PA-003', road=NULL,
      note='Road of approach: the passage prints that the regiment left Emmitsburg on the morning of July 1 and arrived at the junction of the Emmitsburg and Taneytown roads shortly after noon, and that the First Corps "preceded the Eleventh on the road"; it does not say which road the corps marched on. Compiler\'s reading, not printed: the Emmitsburg road. OCR "Taney town". Hour: shortly after noon versus Steinwehr about 2 o\'clock.',
      why='Audit minor: road of approach "the Emmitsburg road" was inferred from the junction name; the passage never says the corps marched on it. direction_or_road cleared, reading moved to the note.')
patch('11C-2D-COSTER-73PA-004',
      when={'printed': '(July 1, after arriving shortly after noon and the order to retire to this side of the town)', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      activity='When the corps was ordered to retire to this side of the town and the division\'s batteries, by command of General von Steinwehr, opened fire, the 73rd Pennsylvania was deployed across the Emmitsburg and Baltimore roads, facing north, protecting the corps in its retreat through the town.',
      note='A column of the enemy was seen approaching on the Hanover road (Moore) at the time of the deployment. The charge through the orchard and the occupation of the houses on either side of the Baltimore pike, formerly joined to this claim, are Bates\' words quoted by Moore and now stand in claim -010 (inferred). "afternoon" was a compiler\'s gloss, removed (the passage prints the arrival "shortly after noon").',
      why='Audit tier check: the claim embedded a compiler\'s (Bates) sentence in a documented claim; Bates\' clause moved to its own inferred claim -010. Time-of-day gloss "afternoon" removed.')
patch('11C-2D-COSTER-73PA-005', tier='inferred', author=AUTH_BATES, why=R_BATES)
patch('11C-2D-COSTER-73PA-006', tier='inferred', author=AUTH_MOORE_BATES, why=R_BATES)
patch('11C-2D-COSTER-73PA-007', tier='inferred', author=AUTH_MOORE_BATES,
      when={'printed': 'after the repulse (near dusk, July 2) until the morning of the 3d', 'date': '1863-07-02', 't_iso': None, 'approx': True},
      why='"night of July 2" was not printed (the passage prints the charge "near dusk" and "until the morning of the 3d"); replaced by the printed words. ' + R_BATES)
patch('11C-2D-COSTER-73PA-009', tier='inferred', author=AUTH_BATES,
      why='This text is inside the Bates quotation that opens "Bates\' history says of the Seventy-third\'s third day" (the sister claim -008, same quotation, is already inferred). ' + R_BATES)

# ---------------------------------------------------------------- 75th Pennsylvania (Nachtigall)
for n in ('001', '003'):
    patch('11C-3D-KRZYZANOWSKI-75PA-' + n, tier='inferred', why=R_NACH)
patch('11C-3D-KRZYZANOWSKI-75PA-002', tier='inferred',
      when={'printed': '(July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': False},
      why='"forenoon" is not printed (broke camp "early on the morning of July 1"; orders received within five miles of Gettysburg; no hour); removed. ' + R_NACH)
patch('11C-3D-KRZYZANOWSKI-75PA-004', tier='inferred',
      when={'printed': 'for several hours (from about half-past one o’clock, July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      why='"afternoon" is not printed (about half-past one o\'clock is); replaced by the printed hour. ' + R_NACH)
patch('11C-3D-KRZYZANOWSKI-75PA-005', tier='inferred',
      when={'printed': '(July 1, after the retreat through the town) where it remained during the course of the battle', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      why='"evening of July 1" is not printed; replaced by the printed sequence (after passing through the town). ' + R_NACH)

# ---------------------------------------------------------------- Kidd (6th Michigan) on other units
patch('CAV-3D-CUSTER-5MI-001', tier='inferred', why=R_KIDD)
patch('CAV-3D-CUSTER-7MI-001', tier='inferred', why=R_KIDD)
patch('CAV-3D-CUSTER-5MI-002', tier='inferred', why=R_KIDD)
patch('CAV-3D-CUSTER-7MI-002', tier='inferred', why=R_KIDD)
patch('CAV-3D-CUSTER-1MI-001', tier='inferred', why=R_KIDD)
patch('CAV-3D-CUSTER-5MI-004', tier='inferred',
      when={'printed': '(July 3, not long after the cannonade of "between 1 and 2 p. m.")', 'date': '1863-07-03', 't_iso': None, 'approx': True},
      why='"afternoon" is not printed at this event (the cannonade is put between 1 and 2 p. m., "not long thereafter" Custer ordered the advance); replaced by the printed sequence. ' + R_KIDD)
patch('CAV-3D-CUSTER-5MI-003', tier='inferred', gaz=None,
      place='from Emmitsburg; an all-night march to Littlestown, arriving at daylight (p. 138)',
      support=[('MI-S011', 'The Fifth and Sixth Michigan, after an all-night’s march, also arrived at Littlestown at', 'Littlestown after the all-night march (p. 138); the anchor sentence on p. 139~142 gives only the afternoon of June 29 and the absence of rest')],
      note='The all-night march and the arrival at Littlestown at daylight June 30 are printed on p. 138 (supporting quote), not in the anchor sentence. The earlier place text "(after returning there from Gettysburg)" was the compiler\'s reading and is removed.',
      why='Audit UNSUPPORTED_HERE: the Littlestown night march is on p. 138 of the same section; cited as a supporting quote. Compiler\'s gloss "after returning there from Gettysburg" removed. ' + R_KIDD)
patch('CAV-3D-003', tier='inferred', road='the road to Abbottstown',
      why='direction_or_road "(toward Hunterstown)" was a gloss on the road named in the passage ("the road to Abbottstown"); removed. ' + R_KIDD)
patch('CAV-3D-CUSTER-6MI-005',
      when={'printed': '(July 2, after about five o’clock in the afternoon)', 'date': '1863-07-02', 't_iso': None, 'approx': True},
      why='"evening" is not printed; replaced by the printed hour that precedes the order to move out (about five o\'clock in the afternoon).')

# division-level statements by regimental officers (same pattern as the audit's CAV-3D-003)
patch('CAV-1D-001', tier='inferred',
      why='Division-level statement (Buford\'s division formed line along Seminary Ridge) by Lieut. Col. Bentley of the 9th New York Cavalry: not the division\'s own officer; same pattern as the audit\'s CAV-3D-003. Author rule gives inferred.')
patch('CAV-1D-002', tier='inferred',
      why='Division-level statement (the right of Buford\'s cavalry line on the night of June 30) by Brevet Lieut. Col. Bean of the 17th Pennsylvania Cavalry: not the division\'s own officer; same pattern as the audit\'s CAV-3D-003. Author rule gives inferred.')

# ---------------------------------------------------------------- 6th NY Cavalry
patch('CAV-1D-DEVIN-6NY-001', road=NULL,
      why='direction_or_road "from Emmitsburg to Gettysburg (the Emmitsburg road by the places named)" named a road the passage does not print (the itinerary is a list of places); cleared, the places stay in place.printed.')
patch('CAV-1D-DEVIN-6NY-002',
      support=[('NY3-S019', 'right of the York Road, then RETIRED TO CeMETERY HiLL, ONE SQUADRON BEING AMONG', 'inscription: the rest of the day on the right of the York Road, then Cemetery Hill, one squadron among the last Union troops in Gettysburg (pp. 1131~1132)')],
      note='The anchor sentence (address, p. 1137~1139) supports the first element only (placed on the right of the brigade on the road to Mummasburg, dismounted). The York Road, Cemetery Hill and "among the last Union troops" elements are in the monument inscription on pp. 1131~1132 of the same section, cited as supporting quotes; "until the First Corps arrived" is the inscription\'s wording (the address says the line held until the Eleventh Corps arrived).',
      why='Audit UNSUPPORTED_HERE (no error): the rest of the claim is in the inscription of the same section; supporting quotes added.')
patch('CAV-1D-DEVIN-6NY-004', gaz=None,
      quote=('NY3-S019', 'ThEN MOVED TO TaNEYTOWN and on the third to Westminister'),
      author='monument inscription (as printed by the commission); Devin\'s official report, reprinted in Heermance\'s address, corroborates',
      support=[('NY3-S019', 'we were ordered to march to Taneytown where we bivouacked, and marched the next', 'Devin\'s report reprinted in the address (p. 1135~1136): the brigade to Taneytown, then Westminster on July 3')],
      road=NULL,
      activity='Inscription: after relief by troops of the 3d Corps on the morning of July 2 the regiment moved to Taneytown and on the third to Westminister, from which place it moved with Buford\'s division in pursuit. Devin\'s official report (reprinted in the address) says the brigade was ordered to march to Taneytown, bivouacked, and marched the next morning, July 3, to Westminster.',
      note='Devin\'s report is in the OR (ledger A); the volume reprints it inside the address. The tier rests on the regiment\'s monument inscription; the quotation of a brigade commander inside an address is the corroboration, not the anchor. The earlier road gloss "(the Taneytown Road by inference; not named)" is removed: neither text names a road.',
      why='Anchor was Devin\'s report quoted in Heermance\'s address (a brigade commander quoted in an address, author rule); the inscription of the same section states the same movement for the regiment and is now the anchor, Devin\'s text is a supporting quote. Road gloss cleared, and the Taneytown Road gazetteer link (taken from the town name) cleared with it.')

# ---------------------------------------------------------------- other cavalry
patch('CAV-1D-GAMBLE-8NY-001', road=NULL,
      why='direction_or_road "through the town to the Cashtown Pike (the road into the town not named)" is not a road of approach printed by the passage; cleared (the Cashtown Pike stays in place.printed as the bivouac location).')
patch('CAV-1D-DEVIN-17PA-003',
      when={'printed': '(July 1, when the Eleventh Corps yielded)', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      why='"afternoon" is not printed; removed (the passage ties the movement to the Eleventh Corps yielding).')
patch('CAV-1D-DEVIN-17PA-004',
      when={'printed': '(July 1, the retirement from the first to the second position)', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      why='"evening" is not printed (the passage says the sun set after this); replaced by the printed sequence.')
patch('CAV-3D-FARNSWORTH-18PA-002',
      when={'printed': '(June 30)', 'date': '1863-06-30', 't_iso': None, 'approx': False},
      why='Audit minor: "forenoon" for the Hanover fight is not printed (the passage gives the date, "left Littlestown early in the morning", and 2 p. m. for leaving Hanover, no hour for the fight); removed.')
patch('CAV-3D-FARNSWORTH-18PA-004',
      place='the woods to the rear of the monument [compiler\'s gloss, not printed: south of Big Round Top], with Elder\'s battery; skirmish line to the left, at one time almost reaching the Emmitsburg road',
      why='Compass gloss "(south of Big Round Top)" is not printed; marked as the compiler\'s.')
patch('CAV-3D-FARNSWORTH-002', road=NULL,
      why='direction_or_road "through Abbottstown to Berlin (outside the loaded ground)" is a list of places, not a printed road; cleared (places stay in place.printed).')
patch('CAV-3D-FARNSWORTH-18PA-003', road=NULL,
      why='direction_or_road "through Abbottstown and New Oxford to Hunterstown (outside the loaded ground)" is a list of places, not a printed road; cleared.')
patch('CAV-3D-FARNSWORTH-003', road=NULL,
      note='The passage prints a short rest at the junction of Rock Creek and the Baltimore pike, then a rapid move to the left of the Union line passing Little Round Top and Big Round Top; it does not say the brigade marched along the pike. Compiler\'s reading, not printed: that it came in on the Baltimore pike. The 5th NY narrative gives 9 a. m. for the arrival near Little Round Top.',
      why='direction_or_road named the Baltimore pike as the road of approach; the passage prints it only as the place of a short rest. Cleared, reading moved to the note as the compiler\'s.')

# ---------------------------------------------------------------- XI Corps
patch('11C-3D-SCHIMMELFENNIG-45NY-002',
      when={'printed': '(July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': False},
      place='At or near Horner\'s Mills; directed by a shorter route to the town of Gettysburg', road=NULL,
      note='Road of approach: the column was on the route by Horner\'s Mills and left it for \'a shorter route\'; the shorter route is not named and no road is printed. Horner\'s Mills is not in the gazetteer. "forenoon" (compiler\'s reading from the 6 a. m. start and 11:15 a. m. arrival) was not printed at this event and is removed.',
      why='Audit pattern 1: "forenoon" gloss not printed; removed. direction_or_road held the printed phrase "a shorter route" plus a compiler\'s remark; the passage prints no road, field cleared, phrase kept in place.printed.')
patch('11C-3D-SCHIMMELFENNIG-45NY-005',
      when={'printed': '(July 1, after the 11:15 a. m. arrival; other regiments came into line "say about 1 o’clock")', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      why='"forenoon to about 1 o\'clock" was a compiler\'s span; replaced by the printed times (the 11:15 a. m. arrival before the order, and the 1 o\'clock estimate that the passage gives for other regiments).')
patch('11C-3D-KRZYZANOWSKI-119NY-002', road=NULL,
      when={'printed': '(July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': True},
      activity='The 119th New York marched through the town out to the front with about 300 men under the colors, filed out into the orchard, rested a few minutes, then fell into line and advanced across the fields and fences to the spot where the monument stands.',
      note='Road of approach to Gettysburg not given; only the passage through the town to the field. Strength "300 men under the colors". Compiler\'s glosses removed at the repair pass: "afternoon" (when) and "(north of the town)" (activity); neither is printed in this address.',
      why='Audit minor: "(north of the town)" added to the activity and "afternoon" to the time; neither is printed. direction_or_road "(street not named)" cleared.')
patch('11C-3D-KRZYZANOWSKI-119NY-003',
      place='this spot (the monument) [compiler\'s gloss, not in this address: north of the town, from the commission\'s caption list]',
      why='Compass gloss "north of the town" is not in the address; marked as the compiler\'s with its source.')
patch('11C-2D-COSTER-154NY-002',
      place='the brigade line; retreat impeded by village lots and board fences in rear [compiler\'s gloss, not printed: north of the town]',
      why='Compass gloss "north of the town" is not printed in the passage; marked as the compiler\'s.')
patch('11C-3D-SCHIMMELFENNIG-157NY-003',
      place='this field [monument caption of the section: north of the town], marching forward through the pouring rain storm',
      why='"north of the town" is printed only in the section\'s monument caption, not in Carmichael\'s address; attribution made explicit.')
patch('11C-2D-COSTER-006', road=NULL,
      note='Monument location (caption): the field at the north end of Stratton Street. Allen does not name the streets (the principal street, then the one running parallel to it). Compiler\'s reading, not printed here: the sketch (154NY, unsigned) names the Harrisburg Road. Allen\'s \'3 o\'clock\' versus Steinwehr\'s \'about 2 o\'clock\' arrival of the division (POS-A-11B-002): the brigade moved out about an hour after reaching the hill.',
      why='direction_or_road carried two compiler\'s remarks ("streets not named by Allen; the sketch names the Harrisburg Road") and no printed road; cleared, remark moved to the note as the compiler\'s reading.')
patch('11C-2D-COSTER-005',
      note='Allen prints \'the left flank of our corps upon its march\'; he does not name the road. Compiler\'s reading, not printed: that the flank guard marched off the road to the west of the column (the sketch, below, prints the Emmitsburg Pike for the division).',
      why='Note carried a compass reading "(west)" as if printed; marked as the compiler\'s. Passage re-read, activity unchanged.')

# the two inferred claims named in the audit (same text as 11C-3D-001, "forenoon" fits only the 45th New York)
patch('11C-3D-001', when={'printed': '(July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': False,
                          'description': 'compiler\'s reading removed at the repair pass (not printed for the divisions): forenoon'},
      why='Audit minor: "forenoon" fits the 45th New York (arrival 11:15) but is not printed for the corps narrative; removed.')
patch('11C-2D-001', when={'printed': '(July 1)', 'date': '1863-07-01', 't_iso': None, 'approx': False,
                          'description': 'compiler\'s reading removed at the repair pass (not printed for the divisions): forenoon'},
      why='Audit minor: "forenoon" fits the 45th New York (arrival 11:15) but not Steinwehr\'s division (about 2 p. m. elsewhere); not printed; removed.')

# time-of-day words absent from the whole cited section, in parenthesised (compiler context) when.printed of inferred claims
TOD = re.compile(r'\b(forenoon|afternoon|evening)\b', re.I)
INFERRED_TOD = ['11C-ART-1OHI-001', '11C-2D-COSTER-002', '11C-2D-COSTER-73PA-001', '11C-ART-1OHK-001', '11C-2D-COSTER-134NY-002', '11C-2D-COSTER-004',
                '11C-2D-COSTER-73PA-002', '11C-2D-004', '11C-2D-COSTER-27PA-004', 'POS-E-CS-CAV-FLEE-001', 'POS-E-CS-CAV-DIV-002', 'POS-E-CS-CAV-JENKINS-001',
                'POS-E-CS-CAV-CHAMBLISS-001', 'POS-E-CS-1C-MCLAWS-SEMMES-001', 'POS-E-CS-1C-MCLAWS-WOFFORD-16GA-001']

READ_ONLY = ['11C-3D-SCHIMMELFENNIG-45NY-001', '11C-3D-SCHIMMELFENNIG-45NY-003', '11C-3D-SCHIMMELFENNIG-45NY-013', '11C-2D-SMITH-136NY-006', '11C-2D-COSTER-154NY-001',
             'CAV-3D-CUSTER-6MI-001', 'CAV-3D-CUSTER-6MI-002', 'CAV-1D-DEVIN-9NY-001', 'CAV-1D-DEVIN-9NY-002', 'CAV-3D-CUSTER-003']


def walk(a, b, path=''):
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in list(a) + [k for k in b if k not in a]:
            out += walk(a.get(k, '<absent>'), b.get(k, '<absent>'), path + '/' + k)
    elif a != b:
        out.append((path, a, b))
    return out


def full(cid):
    return cid if cid.startswith('POS-E-') else P + cid


def strip_tod(printed):
    s = printed
    for _ in range(3):
        s = re.sub(r'(?i)\b(forenoon|afternoon|evening),\s*', '', s)
        s = re.sub(r'(?i),\s*(forenoon|afternoon|evening)\b', '', s)
    return s


def main():
    # new claim: Bates' words split out of 73PA-004
    L.existing()
    new_id = L.add('us-11c-2d-coster-73pa', 'movement',
                   '(July 1, as the rear of the Union force was retiring from the town)',
                   'the orchard just below the cemetery; the houses on either side of the Baltimore pike',
                   'Bates (history of the regiment, quoted by Colonel Moore): as the rear of the Union force was retiring from the town, closely followed by the enemy, the 73rd Pennsylvania was ordered forward, charged through the orchard just below the cemetery, checking the pursuit, and occupied the houses on either side of the Baltimore pike.',
                   'PA1B', 'PA1B-S021', 'charged through the orchard just below the cemetery', 'inferred',
                   author=AUTH_BATES, approx=True, date='1863-07-01', road=None,
                   note='Split at the repair pass from claim -004, where this Bates clause had been joined to Moore\'s own statement. Bates\' text is quoted inside Moore\'s address ("Bates\' history says of this service"). OCR "Sevonty-tha-d" in the printed line.',
                   reasoning='The sentence is Bates\' account quoted by Colonel Moore, not the regiment\'s officer stating the fact; tier inferred.',
                   fidelity_note='Full section read; quote verified present inside the cited section by code.')
    rows = [json.loads(l) for l in open(LEDGER, encoding='utf-8') if l.strip()]
    log = []
    by_id = {r['claim_id']: r for r in rows}
    missing = [k for k in list(PATCH) if k not in by_id]
    assert not missing, missing
    # mechanical patches for inferred time-of-day
    for sid in INFERRED_TOD:
        cid = full(sid)
        assert cid in by_id, cid
        c = by_id[cid]
        new_p = strip_tod(c['when']['printed'])
        removed = sorted(set(m.group(1).lower() for m in TOD.finditer(c['when']['printed'])))
        desc = 'compiler\'s reading removed at the repair pass (not printed anywhere in the cited section): ' + ', '.join(removed)
        if cid not in PATCH:
            PATCH[cid] = {'when': dict(c['when'], printed=new_p, description=(str(c['when'].get('description')) + '; ' + desc) if c['when'].get('description') else desc),
                          'why': 'Pattern 1 (audit): the time-of-day word(s) %s in the parenthesised time are not printed anywhere in the cited section; removed from when.printed and recorded in when.description as the compiler\'s reading.' % ', '.join(removed)}
    for cid, kw in PATCH.items():
        c = by_id[cid]
        before = copy.deepcopy(c)
        if 'when' in kw:
            c['when'] = dict(kw['when'])
            for k in ('date', 't_iso', 'approx'):
                c['when'].setdefault(k, before['when'].get(k))
        if 'place' in kw:
            c['place']['printed'] = kw['place']
        if 'gaz' in kw:
            c['place']['gazetteer_ref'] = kw['gaz']
        if 'road' in kw:
            c['place']['direction_or_road'] = None if kw['road'] is NULL else kw['road']
        if 'activity' in kw:
            c['activity'] = kw['activity']
        if 'note' in kw:
            c['note'] = kw['note']
        if 'author' in kw:
            c['source']['author'] = kw['author']
        if 'quote' in kw:
            sec, q = kw['quote']
            assert len(q.split()) < 15, q
            o, page, interp = L.verify_quote(c['source']['volume'], sec, q)
            c['source'].update({'quote': L.norm_query(q), 'quote_offset': o, 'printed_page': page, 'interpolated': bool(interp)})
            V = L.vol(c['source']['volume'])
            c['source']['cite'] = '%s, %s, p. %s%s' % (V.v['cite'], c['source']['section_title'], page, ' (interpolated)' if interp else '')
            c['source']['ocr_note'] = c['source'].get('ocr_note')
        if 'support' in kw:
            sup = []
            for sec, q, purpose in kw['support']:
                assert len(q.split()) < 15, q
                o, page, interp = L.verify_quote(c['source']['volume'], sec, q)
                sup.append({'section': sec, 'quote': L.norm_query(q), 'quote_offset': o, 'printed_page': page, 'interpolated': bool(interp), 'purpose': purpose})
            c['source']['supporting_quotes'] = sup
        if 'tier' in kw and (kw['tier'] != c['tier'] or c.get('tier_before') == 'documented'):
            c['tier_before'] = 'documented'
            c['tier'] = kw['tier']
            if 'reasoning' not in kw:
                c['reasoning'] = 'Tier lowered from documented to inferred at the ledger-E repair pass (author rule): ' + kw['why']
            if not str(c.get('note') or '').startswith('TIER LOWERED'):
                c['note'] = 'TIER LOWERED at the repair pass (documented -> inferred): ' + kw['why'].split(' Author rule')[0].split(' author rule')[0] + (' | ' + c['note'] if c.get('note') else '')
        if 'reasoning' in kw:
            c['reasoning'] = kw['reasoning']
        c['fidelity_check'] = 'corrected'
        c['claim_support_verified'] = True
        old_fn = before.get('fidelity_note') or ''
        if 'Repair pass' not in old_fn:
            c['fidelity_note'] = old_fn + ' | Repair pass 2026-10-30 (ledger E audit): ' + kw['why']
        else:
            c['fidelity_note'] = old_fn.split(' | Repair pass')[0] + ' | Repair pass 2026-10-30 (ledger E audit): ' + kw['why']
        c['recheck_E'] = 'changed'
        d = walk(before, c)
        log.append({'claim_id': cid, 'why': kw['why'], 'changes': [{'field': p, 'before': a, 'after': b} for p, a, b in d if not p.startswith('/fidelity_note') and p != '/recheck_E']})
    for sid in READ_ONLY + [r['claim_id'] for r in rows if r['tier'] == 'documented' and r['kind'] in ('arrival_road', 'march')]:
        cid = full(sid)
        c = by_id[cid]
        if cid not in PATCH and not c.get('recheck_E'):
            c['recheck_E'] = 'passage re-read at the repair pass, no change'
    if not DRY:
        with open(LEDGER, 'w', encoding='utf-8', newline='\n') as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + '\n')
        os.makedirs(os.path.dirname(LOG), exist_ok=True)
        with open(LOG, 'w', encoding='utf-8') as f:
            json.dump({'new_claims': [new_id], 'changes': log}, f, ensure_ascii=False, indent=1)
    print('claims changed', len(log), 'new', new_id, 'dry' if DRY else 'written')


if __name__ == '__main__':
    main()
