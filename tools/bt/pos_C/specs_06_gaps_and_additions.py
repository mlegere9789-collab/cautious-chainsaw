# Additions found in later passes, and the open-gap records (searches are RUN at build time and their counts printed into the record).
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import or27_find as F

J1, J2, J3, J4, J5, J6, J7 = '1863-07-01', '1863-07-02', '1863-07-03', '1863-07-04', '1863-07-05', '1863-07-06', '1863-07-07'
S = []
a = S.append
HQ = 'us-aop-hq'


def srch(pat, parts=(1, 3)):
    hs = [h for h in F.search(pat, parts=parts, ctx=30, max_hits=300) if h['record']]
    recs = sorted({h['record'] for h in hs})
    return '/%s/ (Parts %s) -> %d hit(s) in %d record(s)%s' % (pat, ','.join(map(str, parts)), len(hs), len(recs),
                                                                (': ' + ', '.join(r.replace('OR27-', '') for r in recs[:6])) if recs else '')


# ---------------------------------------------------------------- army headquarters: the cemetery gate and Slocum's headquarters
a(C(HQ, 'night_position', 'R243', 'met me at the cemetery gate', 'On the morning of July 2, about 3 a. m.', J2, t='03:00', approx=True,
    place='the cemetery gate', gz='GZ-004', act='Howard: about 3 a.m. July 2 the commanding general, who had previously arrived, met him at the cemetery gate, questioned him about July 1 and rode over the position with him',
    auth='Maj. Gen. Oliver O. Howard', key='hq_cemgate_howard',
    note='Howard\'s report; the compiler\'s identification of "the cemetery gate" with the gazetteer\'s Evergreen Cemetery gatehouse (GZ-004) is an inference from the name; the OR says only "the cemetery gate". Arrived earlier than this per Meade (1 a.m.) and Hunt (about 2 a.m.).'))
a(C(HQ, 'position', 'R030', 'at the cemetery gate, early in the morning', 'early in the morning of "July 3" (printed; July 2 by sense)', J2, ocr=True,
    place='the cemetery gate', gz='GZ-004', act='Newton reported in person to the general commanding at the cemetery gate early in the morning and assumed command of the First Corps', auth='Maj. Gen. John Newton',
    key='hq_cemgate_newton', note='The paragraph is headed "July 3" in the OCR, but the order he obeyed was dated July 1 and he took the First Corps on the morning after Reynolds was killed: July 2 by sense (OCR digit 2<->3). Not t-stamped.'))
a(C(HQ, 'position', 'R017', 'a signal station at General Meade\'s headquarters, near Cemetery Hill', 'On July 3, when the enemy made their furious attack upon our center', J3,
    place='General Meade\'s headquarters, near Cemetery Hill (a signal station)', gz='GZ-003', act='Norton: Capt. Castle held a signal station at General Meade\'s headquarters near Cemetery Hill during the July 3 assault, after others left',
    auth='Capt. Lemuel B. Norton', key='hq_jul3_cemhill', note='Castle\'s message went to "the general commanding, then at General Slocum\'s headquarters" (next claim).'))
a(C(HQ, 'position', 'R017', 'the general commanding, then at General Slocum\'s headquarters', 'On July 3, during the assault', J3,
    place='General Slocum\'s headquarters', act='Norton: during the July 3 assault the general commanding (Meade) was at General Slocum\'s headquarters; Castle sent two important messages to him',
    auth='Capt. Lemuel B. Norton', key='hq_jul3_slocum', note='Hunt (R028 p.237) places Knap\'s battery "on the hill known as Slocum\'s headquarters, near the Baltimore pike". The ledger names Powers\' Hill for Jul 3 (arrivals.json); this OR passage does not use that name.'))
a(C(HQ, 'position', 'R028', 'the hill known as Slocum\'s headquarters', 'July 3, before dawn (batteries posted)', J3,
    place='the hill known as Slocum\'s headquarters, near the Baltimore pike', gz='GZ-039', road='Baltimore Pike', tier='inferred',
    act='Slocum\'s headquarters (the XII Corps commander) stood on a hill near the Baltimore pike; Castle places Meade there during the July 3 assault',
    reasoning='Hunt (R028 p.237) names "the hill known as Slocum\'s headquarters, and near the Baltimore pike"; Norton (R017 p.206) puts Meade "then at General Slocum\'s headquarters" during the assault. The identification of the two is the compiler\'s; neither passage names Powers\' Hill.',
    auth='Brig. Gen. Henry J. Hunt'))
a(C(HQ, 'night_position', 'R006', 'the council meeting in a room not to exceed 10 feet square', 'the evening of July 2', J2,
    place='General Meade\'s headquarters (a small room)', act='Gibbon: the council of corps commanders of the evening of July 2 met in a room not to exceed 10 feet square', auth='Brig. Gen. John Gibbon',
    key='hq_council_room', note='Letter of March 1864 printed in Meade\'s report (p.127). Gibbon: member of the council as acting Second Corps commander. The earlier claim on this council says "evening".'))

# ---------------------------------------------------------------- VI Corps additions
a(C('us-6c-3d', 'movement', 'R223', 'of the Third Division, temporarily commanded by Brigadier-General Wheaton', 'July 2', J2,
    place=None, act='Sedgwick: the Third Division was temporarily commanded by Brig. Gen. Wheaton (Newton having been given the First Corps)', note='No report from Wheaton or Newton for the Third Division in the volume'))
a(C('us-6c-3d', 'night_position', 'R232', 'by direction of Brigadier-General Wheaton, commanding the division', 'At 7 p. m. on the 2d instant', J2, t='19:00',
    place='the left of the position held by the army', act='Wheaton, commanding the Third Division, directed Shaler\'s brigade into line on the left, in rear of the Second Brigade, at 7 p.m. July 2', key='V6_wheaton_7pm'))
a(C('us-6c-2d-1brig', 'position', 'R009', 'Ncf First Brigade in division.', 'footnote to the Second Division, Sixth Corps (organization at Gettysburg, July 1-3)', J2, ocr=True,
    place=None, act='Organization of the Army of the Potomac: footnote to the Second Division, Sixth Corps - "Not First Brigade in division": the First Brigade of Howe\'s division was not with the army at Gettysburg (only Grant\'s and Neill\'s brigades)',
    note='OCR "Ncf" is read as "Not"; supported by Sedgwick (R223) naming only Neill\'s and Grant\'s brigades of Howe\'s division. This is why units.json marks us-6c-2d-1brig never_on_field.'))
a(C('us-6c-3d-wheaton', 'night_position', 'R009', 'Guiding wagon train at Westminster, and not engaged', 'July 1-3', J2, ocr=True,
    place='Westminster (the 102nd Pennsylvania)', act='Organization footnote: the 102nd Pennsylvania was guiding the wagon train at Westminster and not engaged in the battle', note='OCR damage after "not engaged"; confirmed by Patterson (R236) in the claim on this brigade.'))
a(C('us-art-reserve-taft-1ctheavy-b', 'night_position', 'R009', 'etc., and not engaged in the battle', 'July 1-3 (organization footnote)', J2, ocr=True,
    place='Westminster etc. (OCR "WeBumiaster")', act='Organization footnote on Batteries B and M, 1st Conn. Heavy: at Westminster etc. and not engaged in the battle',
    note='Footnote mark on both siege batteries in the Second Volunteer Brigade'))
a(C('us-art-reserve-taft-1ctheavy-m', 'night_position', 'R009', 'etc., and not engaged in the battle', 'July 1-3 (organization footnote)', J2, ocr=True,
    place='Westminster etc. (OCR "WeBumiaster")', act='Organization footnote on Batteries B and M, 1st Conn. Heavy: at Westminster etc. and not engaged in the battle',
    note='Footnote mark on both siege batteries in the Second Volunteer Brigade'))
a(C('us-art-reserve-taft', 'position', 'R009', 'Second Volunteer Brigade. Capt. Elijah D. Taft.', 'July 2-3', J2, tier='inferred',
    place='divided: Taft\'s 5th NY at the cemetery; Sterling\'s Connecticut battery under McGilvery; B and M at Westminster',
    act='the Second Volunteer Brigade did not fight as a brigade: Taft\'s battery went to Howard at Cemetery Hill, Sterling\'s Connecticut battery to McGilvery\'s line, and the two siege batteries stayed at Westminster',
    reasoning='R009 gives the brigade as Taft (commander), 1st Conn. Heavy B and M, a Connecticut light battery (Sterling) and the 5th NY. R315 (Tyler) sends Taft to Howard, Sterling forward with McGilvery, B and M to Westminster; R325 (Taft) confirms the cemetery. Each is a unit-level passage; no passage states the brigade was split.',
    key='AR_taft_brig', note='Name difference: R009 lists "Connecticut light, 3d Battery (8d in the OCR), Capt. John W. Sterling"; Tyler and McGilvery call it the "Second Connecticut Battery"; units.json uses 2ct.'))
a(C('us-art-reserve-ransom-3usk', 'position', 'R028', 'was posted near the Emmitsburg road', 'July 2 evening', J2,
    place='near the Emmitsburg road', gz='GZ-041', road='Emmitsburg Road', act='Turnbull\'s consolidated Battery F and K, 3rd US posted near the Emmitsburg road (the same passage as Battery F)', auth='Brig. Gen. Henry J. Hunt',
    note='Hunt\'s sentence: "Turnbull\'s (F and K, Third United States, six 12-pounders) was posted near the Emmitsburg road"; Batteries F and K were consolidated under Lt. Turnbull. Tyler: Turnbull lost 1 officer and 8 men killed, 14 wounded, 45 horses.'))
a(C('us-art-reserve-ransom-3usk', 'position', 'R320', 'two pieces of Battery K, Third U. S. Artillery, under command of Lieutenant TurnbuU', 'July 3, afternoon', J3,
    place='right center, on the left of Cemetery Hill, under General Baxter (I Corps) with the 9th Massachusetts', gz='GZ-003',
    act='two pieces of Battery K, 3rd US (Lt. Turnbull) placed with the 9th Mass. on the right centre on the left of Cemetery Hill', ocr=True, note='OCR "TurnbuU"'))
a(C('us-6c-art-1ny', 'position', 'R030', 'and one battery from the Sixth Corps', 'By about 12 o\'clock, July 3', J3, tier='inferred',
    place='in Newton\'s line between the left of Hancock and the right of Sykes', act='Newton: by about 12 o\'clock he had batteries from the Artillery Reserve, the Third Corps and one battery from the Sixth Corps in his line',
    reasoning='Newton does not name the battery; Cowan\'s 1st NY Battery (R239) reports to Newton about 10 a.m. July 3 and is the only Sixth Corps battery reported to him, so the identification rests on Cowan\'s report, not on Newton\'s words.',
    auth='Maj. Gen. John Newton', note='page 262'))
a(C('us-6c-art', 'march', 'R239', 'with the Artillery Brigade, Sixth Corps, I marched from Edwards Ferry', 'On the 28th of June', '1863-06-28',
    place='Edwards Ferry -> Hyattstown; June 29 to Sam\'s Creek; June 30 to near Manchester', act='Cowan (1st NY Battery): the Artillery Brigade, Sixth Corps marched from Edwards Ferry to Hyattstown June 28, to Sam\'s Creek June 29 and to near Manchester June 30',
    note='"On the 38th of June" in the OCR text read as the 28th: the same sentence has the Edwards Ferry crossing'))
a(C('us-5c-1d-tilton-22ma', 'position', 'R192', '220. Mass. IstM-ich. izeth. Penn.', 'at 4.30 p. m., July 2, formation of the line', J2, t='16:30', approx=True, ocr=True,
    place='in a piece of woods at the south of Mr. Rose\'s house, left of 118th Pa., 2nd Brigade on the left', act='Tilton\'s line diagram (garbled): 22d Mass., 1st Mich., 118th Pa. (right, refused)',
    note='The OCR of the diagram reads "Sa Brigade. 220. Mass. IstM-ich. izeth. Penn." The order is the compiler\'s reading of the garbled diagram; the text beside it says the right battalion was the 118th Pa.'))
a(C('us-5c-1d-tilton-1mi', 'position', 'R192', '220. Mass. IstM-ich. izeth. Penn.', 'at 4.30 p. m., July 2, formation of the line', J2, t='16:30', approx=True, ocr=True,
    place='in a piece of woods at the south of Mr. Rose\'s house, between the 22nd Mass. and the 118th Pa.', act='Tilton\'s line diagram (garbled): 22d Mass., 1st Mich., 118th Pa.', note='see the 22nd Mass. claim'))
a(C('us-5c-1d-sweitzer-62pa', 'engagement', 'R193', 'Foui-th Michigan and Sixty-second Pennsylvania had been surrounded', 'July 2 evening', J2, ocr=True,
    place='the stone fence beyond the wheat-field', gz='GZ-013', act='62nd Pennsylvania (with the 4th Michigan) surrounded after advancing across the wheat-field and wheeling to face the right'))

a(C('us-5c-2d-day', 'engagement', 'R203', 'the First Brigade in rear of and supporting the Second Brigade', 'late afternoon, July 2', J2,
    place='woods about 350 yards in advance, across swampy ground, on the left of a II Corps division', act='Ayres: Day\'s First Brigade advanced in rear of and supporting Burbank\'s Second Brigade, then withdrew with it to the right and rear of the Third Brigade', ocr=True))
a(C('us-5c-2d-day', 'movement', 'R208', 'ordered out with the brigade on a reconnaissance', 'On the morning of the 4th', J4,
    place='forward across the marsh to a clover-field; the Third, Fourth and Sixth US supported by the Twelfth and Fourteenth', act='Dunn: July 4 morning the First Brigade (regulars) was ordered out on a reconnaissance; 14th US to the front with skirmishers; the brigade returned when the object was accomplished',
    key='V_day_jul4', note='Bartlett (R226) supported Day\'s brigade on this reconnaissance (8 a.m. to about 1 p.m.). Giddings (14th US): left camp about 7.30 a.m.; Adams (4th US): ordered on a reconnaissance at 10 a.m.'))
a(C('us-5c-2d-day', 'departure', 'R205', 'At 5 p. m. marched about 5 miles on the Emmitsburg road and encamped.', 'July 5, 5 p. m.', J5, t='17:00',
    place='the Emmitsburg road, about 5 miles', gz='GZ-041', road='Emmitsburg Road', act='Day\'s brigade (3rd US) moved out on the Emmitsburg road at 5 p.m. July 5 and encamped about 5 miles out (Adams of the 4th US: left picket 5 p.m. for Emmitsburg)',
    conflicts=['V_dep_morning5']))

# ---------------------------------------------------------------- open gaps
a(GAP('us-6c-art-2usd', 'position', 'Battery D, 2nd US (Lt. Edward B. Williston): no position, hour or movement at Gettysburg in the OR Gettysburg volumes searched; listed only in the organization (R009) and Robertson\'s report of July 16 onward (R368)',
      [srch('Williston'), srch('Battery D,? (of the )?Second U(nited|\\. ?S\\.) ?States|2d United States, Battery D'), srch('Second U\\. ?S\\. Artillery.{0,60}(Sixth|Gettysburg)')],
      note='Sedgwick (R223): the artillery of the corps was under the chief of artillery. Wright (R224) and Howe (R229) mention "two batteries" on the left; Martin (R221) names them as Fifth Corps batteries. Not resolved.'))
a(GAP('us-6c-art-2usg', 'position', 'Battery G, 2nd US (Lt. John H. Butler): no position or movement found',
      [srch('Butl[eo]r.{0,50}(Battery|Second U|artillery)'), srch('Battery G,? (of the )?Second U'), srch('2d United States, Battery G')],
      note='Listed in R009 only. Butler matches in R205/R212 are officers of other units.'))
a(GAP('us-6c-art-5usf', 'position', 'Battery F, 5th US (Lt. Leonard Martin): no position or movement found',
      [srch('Battery F,? (of the )?Fifth U'), srch('Leonard Martin'), srch('5th United States, Battery F')],
      note='Listed in R009 and in the July 31 organization (D1664) only.'))
a(GAP('us-6c-art', 'position', 'Artillery Brigade, VI Corps (Col. Charles H. Tompkins): no report by Tompkins and no OR passage stating where the brigade\'s batteries stood on July 2-3 as a brigade; only the unit reports of McCartney, Cowan, Harn, Waterman and Adams (claims above)',
      [srch('Tompkins'), srch('Artillery Brigade,? Sixth'), srch('Report of Col\\. Charles H\\. Tompkins|Tompkins, Colonel, Commanding Artillery')],
      note='Hunt (R028) lists Tompkins as chief of VI Corps artillery but gives no VI Corps battery positions.'))
a(GAP('us-6c-3d', 'position', 'Third Division (Newton, then Wheaton): no report by Wheaton or Newton for the division; division-level facts rest on Sedgwick, Shaler and Nevin',
      [srch('Wheaton.{0,60}(report|commanding.{0,10}division)'), srch('Report of Brig\\. Gen\\. Frank Wheaton|Frank Wheaton.{0,40}Third Division'), srch('Newton.{0,80}Third Division')]))
a(GAP('us-6c-3d-eustis', 'arrival_road', 'Eustis\' brigade: no report by Col. Henry L. Eustis; no OR passage on its approach road (the Third Division route is in Nevin\'s report)',
      [srch('Eustis'), srch('Colonel Eustis|Col\\. Eustis|Henry L\\. Eustis'), srch('Second Brigade, Third Division, Sixth')],
      note='Position claims for the brigade come from Sedgwick (R223), Rogers (R233) and Birney (R133).'))
a(GAP('us-6c-3d-eustis-7ma', 'position', '7th Massachusetts: no regimental report; named only in the organization (R009) and the Meade casualty table',
      [srch('Seventh Massachusetts'), srch('7th Massachusetts'), srch('Lieut\\. Col\\. Frankl?in P\\. Harlow')]))
a(GAP('us-6c-3d-eustis-10ma', 'position', '10th Massachusetts: no regimental report',
      [srch('Tenth Massachusetts'), srch('10th Massachusetts'), srch('Joseph B\\. Parsons')]))
a(GAP('us-6c-3d-eustis-37ma', 'position', '37th Massachusetts: no regimental report',
      [srch('Thirty-seventh Massachusetts'), srch('37th Massachusetts'), srch('Oliver Edwards')]))
a(GAP('us-art-reserve-taft-2ct', 'position', 'Sterling\'s Connecticut battery (2nd Conn.; "3d Battery" in the organization): no battery report; position known only from McGilvery\'s July 3 line and Tyler/Hunt',
      [srch('Sterling'), srch('Second Connecticut|2d Connecticut'), srch('Connecticut.{0,30}Battery.{0,40}Sterling|Sterling.{0,40}Connecticut')],
      note='Tyler (R315): "No report has yetbeen received from ... Captain Sterling\'s (Second Connecticut) batteries."'))
a(GAP('us-art-reserve-huntington', 'position', 'Third Volunteer Brigade (Capt. James F. Huntington): no report by Huntington; the batteries\' positions come from their commanders and Tyler/Hunt',
      [srch('Captain Huntington|Capt\\. James F\\. Huntington|James F\\. Huntington'), srch('Third Volunteer Brigade'), srch('Report of Capt\\. James F\\. Huntington')]))
a(GAP('us-art-reserve-ransom', 'position', 'First Regular Brigade (Capt. Dunbar R. Ransom, wounded July 2): no report by Ransom; the batteries\' reports exist for Weir only (R317)',
      [srch('Captain Ransom|Capt\\. Dunbar R\\. Ransom|D\\. R\\. Ransom'), srch('First Regular Brigade'), srch('Report of Capt\\. Dunbar')],
      note='Tyler (R315) says Ransom was severely wounded by a sharpshooter while reconnoitering a position; Thomas (4th US), Turnbull (3rd US), Eakin/Mason (1st US) have no battery report in the volume.'))
a(GAP(HQ, 'position', 'Named places for Army headquarters on July 2-3 (the Leister house; Powers\' Hill): not named in any OR passage found; the OR names the cemetery gate, "General Meade\'s headquarters, near Cemetery Hill", "a strip of woods on the Taneytown road", "General Slocum\'s headquarters" and "the Baltimore pike"',
      [srch('Leister|Lester'), srch('Powers?.? ?Hill|Power.s Hill'), srch('headquarters.{0,60}(Cemetery|cemetery)')],
      note='The first two return no passage about Meade\'s headquarters (the "Lester" hits are unrelated names). The third returns Norton p.206 and Howard p.702 (claims above).'))
a(GAP(HQ, 'position', 'Reports by Butterfield (Chief of Staff) and Warren (Chief Engineer): no report in the volume; their positions rest on other officers\' reports and on correspondence',
      [srch('Report of Maj\\. Gen\\. Daniel Butterfield|Butterfield, Chief of Staff.{0,60}report of'), srch('Reports? of Brig\\. Gen\\. G\\. ?K\\. Warren|Warren, Chief of Engineers?.{0,30}Report'), srch('Warren.{0,60}Little Round Top')],
      note='The index (or27_index.json) has no record authored by Butterfield or Warren in Part 1; Warren\'s dispatches are in Part 3.'))
