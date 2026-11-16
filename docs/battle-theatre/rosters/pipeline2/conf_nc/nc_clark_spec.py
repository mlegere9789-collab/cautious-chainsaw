"""The notes of the conf-nc work item taken from Clark, Histories of the Several Regiments and Battalions from North Carolina in the Great War, 1861-'65 (1901), five volumes.

The work item asks (first task 2) for Clark's present-for-duty figures as NOTES in the source ledger, not as roster rows.  This file is the reviewed list of the statements; nc_clark.py
locates every one of them in the pinned OCR text, asserts that each printed figure stands in the quotation, looks for the same statement in the second scan (the Emory copy) and
writes the notes into data2/sources/NC-CLARK-1901.json.

How the list was made (the same rules are written into the ledger): the chapters of the 41 units (CHAPTERS below) and the Gettysburg chapters of volume 5 were scanned sentence
by sentence for a figure (digits or number words) that names men, officers, muskets, guns, killed, wounded, missing, prisoners or strength, in a sentence at most two sentences
from a mention of Gettysburg, the third day, Cemetery Hill, Pettigrew and the like; every hit was read in its context by an engineer and kept only where the sentence states a
strength, a number present, a number taken into action, a number left, or a loss of THAT unit (or of the brigade, battalion or company named) in the Gettysburg campaign.  What the
scan cannot find (a figure given in words the scan does not know, a figure on a page the text layer lost) is not in the list: the list is a floor, not a count of everything Clark prints
(gap EG-ROS-NC-05).  A statement is a statement of the named author of the chapter (or of the person he quotes), not a muster: the notes never state a figure as fact.

N(units, vol, phrase, n, kind, subject, when, claim, figures): phrase is a stretch of the first sentence (after the hyphenation of line ends is joined: "thir- ty" reads "thirty") that
occurs once in the volume; n the number of sentences quoted; figures a list of (printed, value, what): printed is the figure as the text layer prints it and must stand in the quotation;
value is the reading of it as a number (None where the text layer damages it); what says what is counted.
"""

UNITS = {
    'i1': 'c-nc-1st-north-carolina-infantry', 'i2': 'c-nc-2nd-north-carolina-infantry', 'i3': 'c-nc-3rd-north-carolina-infantry', 'i4': 'c-nc-4th-north-carolina-infantry',
    'i5': 'c-nc-5th-north-carolina-infantry', 'i6': 'c-nc-6th-north-carolina-infantry', 'i7': 'c-nc-7th-north-carolina-infantry', 'i11': 'c-nc-11th-north-carolina-infantry',
    'i12': 'c-nc-12th-north-carolina-infantry', 'i13': 'c-nc-13th-north-carolina-infantry', 'i14': 'c-nc-14th-north-carolina-infantry', 'i16': 'c-nc-16th-north-carolina-infantry',
    'i18': 'c-nc-18th-north-carolina-infantry', 'i20': 'c-nc-20th-north-carolina-infantry', 'i21': 'c-nc-21st-north-carolina-infantry', 'i22': 'c-nc-22nd-north-carolina-infantry',
    'i23': 'c-nc-23rd-north-carolina-infantry', 'i26': 'c-nc-26th-north-carolina-infantry', 'i28': 'c-nc-28th-north-carolina-infantry', 'i30': 'c-nc-30th-north-carolina-infantry',
    'i32': 'c-nc-32nd-north-carolina-infantry', 'i33': 'c-nc-33rd-north-carolina-infantry', 'i34': 'c-nc-34th-north-carolina-infantry', 'i37': 'c-nc-37th-north-carolina-infantry',
    'i38': 'c-nc-38th-north-carolina-infantry', 'i43': 'c-nc-43rd-north-carolina-infantry', 'i45': 'c-nc-45th-north-carolina-infantry', 'i47': 'c-nc-47th-north-carolina-infantry',
    'i52': 'c-nc-52nd-north-carolina-infantry', 'i53': 'c-nc-53rd-north-carolina-infantry', 'i55': 'c-nc-55th-north-carolina-infantry', 'i57': 'c-nc-57th-north-carolina-infantry',
    'bn2': 'c-nc-2nd-north-carolina-battalion',
    'cav1': 'c-nc-1st-north-carolina-cavalry', 'cav2': 'c-nc-2nd-north-carolina-cavalry', 'cav4': 'c-nc-4th-north-carolina-cavalry', 'cav5': 'c-nc-5th-north-carolina-cavalry',
    'batta': 'c-nc-battery-a-1st-north-carolina-artillery', 'branch': 'c-nc-branch-artillery', 'charlotte': 'c-nc-charlotte-artillery', 'rowan': 'c-nc-rowan-artillery',
}
PETTIGREW = ['i11', 'i26', 'i47', 'i52']        # the four regiments of Pettigrew's brigade that are units of this work item (the 44th was left at Hanover Junction)
DANIEL = ['i32', 'i43', 'i45', 'i53', 'bn2']
LANE = ['i7', 'i18', 'i28', 'i33', 'i37']
SCALES = ['i13', 'i16', 'i22', 'i34', 'i38']
IVERSON = ['i5', 'i12', 'i20', 'i23']

# volume -> text id of the primary scan and of the second scan
TEXT = {v: 'NC-CLARK-1901.%s' % v for v in '12345'}
TEXT_B = {v: 'NC-CLARK-1901.%s~b' % v for v in '12345'}

# chapters of the units: unit shorthand -> [(volume, first character of the chapter heading, first character of the next chapter, label with the printed pages and the authors)]
CHAPTERS = {
    'i1': [('1', 332844, 385644, 'First Regiment, by Colonel H. A. Brown, vol. 1 p. 135')],
    'i2': [('1', 385644, 430803, 'Second Regiment, by Captain Matt. Manly, vol. 1 p. 157')],
    'i3': [('1', 430803, 558136, 'Third Regiment, by Captains John Cowan and J. I. Metts (p. 177) and Colonel W. L. DeRosset (p. 215), vol. 1')],
    'i4': [('1', 558136, 682639, 'Fourth Regiment, by Colonel E. A. Osborne, vol. 1 p. 229')],
    'i5': [('1', 682639, 710568, 'Fifth Regiment, by Maj. J. C. MacRae and Sergt.-maj. C. M. Busbee, vol. 1 p. 281')],
    'i6': [('1', 710568, 872885, 'Sixth Regiment, by Captain Neill W. Ray (p. 293) and Major A. C. Avery (p. 337), vol. 1')],
    'i7': [('1', 872885, 934168, 'Seventh Regiment, by Captain J. S. Harris, vol. 1 p. 361')],
    'i11': [('1', 1407911, 1460956, 'Eleventh Regiment, by Col. W. J. Martin and Capt. E. R. Outlaw, vol. 1 p. 583')],
    'i12': [('1', 1460956, 1581154, 'Twelfth Regiment, by Lieutenant W. A. Montgomery, vol. 1 p. 605')],
    'i13': [('1', 1581154, 1701477, 'Thirteenth Regiment, by Captain R. S. Williams (p. 653), Adjutant N. S. Smith (p. 689), T. L. Rawley (p. 701), vol. 1')],
    'i14': [('1', 1701477, 1770020, 'Fourteenth Regiment, by Colonel R. T. Bennett, vol. 1 p. 705')],
    'i16': [('1', 1810040, 1861019, 'Sixteenth Regiment, by Lieutenant B. H. Cathey (p. 751) and Captain L. Harrill (p. 771), vol. 1'),
            ('4', 299017, 511386, 'Supplemental sketch, Sixteenth Regiment, by First Lieutenant George H. Mills, vol. 4 p. 137')],
    'i18': [('2', 35162, 191096, 'Eighteenth Regiment, by Adjutant William H. McLaurin (p. 16) and Private Thomas H. Sutton (p. 65), vol. 2')],
    'i20': [('2', 264195, 305014, 'Twentieth Regiment, by Brigadier-General Thomas F. Toon, vol. 2 p. 111')],
    'i21': [('2', 305014, 378895, 'Twenty-First Regiment, by Major James F. Beall (p. 129) and Lieutenant L. E. Powers (p. 147), vol. 2')],
    'i22': [('2', 378895, 424789, 'Twenty-Second Regiment, by Adjutant Graham Daves, vol. 2 p. 161')],
    'i23': [('2', 424789, 645719, 'Twenty-Third Regiment, by Captain V. E. Turner and Sergeant H. C. Wall, vol. 2 p. 181')],
    'i26': [('2', 726790, 1022958, 'Twenty-Sixth Regiment, by Assistant Surgeon George C. Underwood, vol. 2 p. 303'),
            ('5', 1391339, 1401298, 'Unparalleled Loss (Company F, Twenty-Sixth Regiment, at Gettysburg), by Captain R. M. Tuttle, vol. 5 p. 599')],
    'i28': [('2', 1119547, 1167244, 'Twenty-Eighth Regiment, by Brigadier-General J. H. Lane, vol. 2 p. 465')],
    'i30': [('2', 1189834, 1214764, 'Thirtieth Regiment, by Colonel P. M. Parker, vol. 2 p. 495')],
    'i32': [('2', 1247399, 1287462, 'Thirty-Second Regiment, by Private Henry A. London, vol. 2 p. 521')],
    'i33': [('2', 1287462, 1396381, 'Thirty-Third Regiment, by Major J. A. Weston, vol. 2 p. 537')],
    'i34': [('2', 1396381, 1419622, 'Thirty-Fourth Regiment, by Lieutenant T. D. Lattimore, vol. 2 p. 581')],
    'i37': [('2', 1570807, 1626763, 'Thirty-Seventh Regiment, by Lieutenant Octavius A. Wiggins, vol. 2 p. 658')],
    'i38': [('2', 1626763, 1681315, 'Thirty-Eighth Regiment, by Lieutenant-Colonel George W. Flowers, vol. 2 p. 675')],
    'i43': [('3', 4489, 52334, 'Forty-Third Regiment, by Colonel Thomas S. Kenan, vol. 3 pp. 1 and 19')],
    'i45': [('3', 86624, 155062, 'Forty-Fifth Regiment, by Sergeant Cyrus B. Watson, vol. 3 p. 35')],
    'i47': [('3', 203747, 275929, 'Forty-Seventh Regiment, by Captain John H. Thorp (p. 83) and Lieutenant J. Rowan Rogers (p. 103), vol. 3')],
    'i52': [('3', 540415, 617063, 'Fifty-Second Regiment, by Adjutant John H. Robinson, vol. 3 p. 223')],
    'i53': [('3', 617063, 643479, 'Fifty-Third Regiment, by Colonel James T. Morehead, vol. 3')],
    'i55': [('3', 687206, 754433, 'Fifty-Fifth Regiment, by Adjutant Charles M. Cooke, vol. 3 p. 287')],
    'i57': [('3', 984828, 1045586, 'Fifty-Seventh Regiment, by Colonel Hamilton C. Jones, vol. 3 p. 405')],
    'bn2': [('4', 563129, 604632, 'Second Battalion, by Lieutenant-Colonel Wharton J. Green, vol. 4 p. 243')],
    'cav1': [('1', 1003969, 1176353, 'Ninth Regiment (First Cavalry), by General Rufus Barringer (p. 417) and Colonel W. H. Cheek (p. 445), vol. 1'),
             ('1', 1861019, 1881850, 'Addenda to the Ninth Regiment, vol. 1 p. 775')],
    'cav2': [('2', 191096, 264195, 'Nineteenth Regiment (Second Cavalry), by Captain W. A. Graham (p. 79) and Brigadier-General William P. Roberts (p. 99), vol. 2')],
    'cav4': [('3', 1100619, 1143864, 'Fifty-Ninth Regiment (Fourth Cavalry), by Lieutenant W. P. Shaw, vol. 3 p. 455')],
    'cav5': [('3', 1275131, 1632585, 'Sixty-Third Regiment (Fifth Cavalry), by Major John M. Galloway (p. 529) and Private Paul B. Means (p. 545), vol. 3')],
    'batta': [('1', 1330128, 1407911, 'Tenth Regiment (First Artillery), Light Batteries A, D, F and I, by Captain John A. Ramsay, vol. 1 p. 551')],
    'rowan': [('1', 1330128, 1407911, 'Tenth Regiment (First Artillery), Light Batteries A, D, F and I, by Captain John A. Ramsay, vol. 1 p. 551')],
    'charlotte': [('1', 1293821, 1330128, 'Tenth Regiment (First Artillery), Company C, Light Battery, by Captain A. B. Williams, vol. 1 p. 537')],
    'branch': [('4', 786384, 839370, 'Thirteenth Battalion (Starr\'s), by Lieutenant J. H. Myrover, Captain Lewis H. Webb and Captain James D. Cumming, vol. 4 pp. 341, 355, 361'),
               ('1', 1330128, 1407911, 'Tenth Regiment (First Artillery), Light Batteries A, D, F and I, by Captain John A. Ramsay, vol. 1 p. 551')],
}
# chapters outside the regimental chapters that print figures about the regiments of this work item: key -> (volume, first character, first character of what follows, label)
EXTRA = {
    'robbins': ('5', 273742, 304200, 'Longstreet\'s Assault at Gettysburg, by Major W. M. Robbins, vol. 5 p. 101'),
    'young': ('5', 304200, 364570, 'Pettigrew\'s Brigade at Gettysburg, by Captain Louis G. Young, A. A. G., vol. 5 p. 113, and Pettigrew\'s Charge at Gettysburg, by Lieutenant-Colonel John T. Jones, vol. 5 p. 133'),
    'ashe': ('5', 364570, 419703, 'The Pettigrew-Pickett Charge, by Captain S. A. Ashe, A. A. G., vol. 5 p. 137'),
    'review': ('5', 6887, 40000, 'Review and Conclusion, by the Editor (Walter Clark), vol. 5 p. vii'),
    'vance': ('5', 1160000, 1208952, 'North Carolina\'s Record, by Governor Z. B. Vance, vol. 5 p. 463'),
    'rivenbark': ('5', 1383809, 1391339, 'The First Regiment at Gettysburg, by Sergeant C. W. Rivenbark, Company C, vol. 5 p. 595'),
    'london': ('4', 1178400, 1195629, 'The Daniel-Grimes Brigade, by Captain William L. London, A. A. G., vol. 4'),
    'rawley': ('4', 1268624, 1279232, 'The Pender-Scales Brigade, by First Lieutenant T. L. Rawley, vol. 4'),
}

NOTES = []


def N(units, vol, phrase, n, kind, subject, when, claim, figures, source=None, must=None, chap=None, strength=None):
    NOTES.append({'strength': strength, 'chap': chap, 'units': units, 'vol': vol, 'phrase': phrase, 'n': n, 'kind': kind, 'subject': subject, 'when': when, 'claim': claim, 'figures': figures, 'source': source, 'must': must or []})


# ----------------------------------------------------------------------------------------------------------------------------- 26th North Carolina (Underwood)
S26 = 'the 26th North Carolina Infantry'
for letter, who, fig in (('A', 'Wagg', '97'), ('B', 'Wilson', '92'), ('C', 'Jarrett', '80'), ('D', 'Adams', '79'), ('E', 'Brewer', '104'),
                         ('F', 'Tuttle', '91'), ('G', 'Albright', '91'), ('H', 'McLeod', '78'), ('I', 'Bradford', '74'), ('K', 'McLauchlin', '99')):
    N(['i26'], '2', 'Captain, R. M. Tuttle ; First Lieutenant' if letter == 'F' else 'present for duty, %s' % fig, 2 if letter == 'F' else 1, 'present_for_duty', 'Company %s' % letter,
      '30 June 1863 (muster and pay roll of that day)',
      'Underwood copies from the muster and pay roll of 30 June 1863 (kept by the regimental quartermaster J. J. Young) that Company %s of the 26th had %s present for duty.' % (letter, fig),
      [(fig, int(fig), 'present for duty')], must=[who])
N(['i26'], '2', 'The total number present for duty was 885', 1, 'present_for_duty', 'regiment', '30 June 1863',
  'Underwood states the total present for duty in the 26th, by the muster rolls of 30 June 1863, as 885 (the ten company figures above add to 885).', [('885', 885, 'present for duty')], strength=885)
N(['i26'], '2', 'The muster rolls for 30 June, 1863, make the aggregate present', 1, 'present_for_duty', 'regiment', '30 June 1863; 1 July 1863',
  'Underwood: the muster rolls of 30 June 1863 make the aggregate present for duty (enlisted men) 885; allowing 10 per cent for extra duty and details he reckons about 800 muskets taken into battle on the first day (his own estimate).',
  [('885', 885, 'present for duty, enlisted men'), ('10 per cent', 10, 'allowance for extra duty and details'), ('800', 800, 'muskets taken into battle (his reckoning)')])
N(['i26'], '2', 'with its 800 muskets', 1, 'taken_into_action', 'regiment', '1 July 1863',
  'Underwood places the 26th in line on 1 July 1863 with 800 muskets (Pettigrew\'s four regiments being in full ranks).', [('800', 800, 'muskets')], strength=800)
N(['i26'], '2', 'We went in with over 800 men in the regiment', 1, 'taken_into_action', 'regiment', '1 July 1863 (letter of 4 July 1863)',
  'Underwood prints a letter of the regimental quartermaster J. J. Young to Governor Vance, 4 July 1863: the regiment went in with over 800 men.', [('over 800', 800, 'men ("over" 800)')], strength=800)
N(['i26'], '2', 'There came out of the first day\'s fight 216 all told, unhurt', 1, 'remaining_after', 'regiment', 'evening of 1 July 1863 (letter of 4 July 1863)',
  'Same letter: 216 all told came out of the first day\'s fight unhurt.', [('216', 216, 'unhurt after the first day')])
N(['i26'], '2', 'Yesterday they were again engaged, and now have only about 80 men for duty', 1, 'remaining_after', 'regiment', '4 July 1863 (letter of 4 July 1863)',
  'Same letter: after the third day only about 80 men for duty.', [('about 80', 80, 'men for duty')])
N(['i26'], '2', 'places the loss of the Twentysixth Eegiment in the first day\'s fight at 86 killed and 502 wounded', 1, 'casualties', 'regiment', '1 July 1863',
  'Underwood quotes Colonel Fox (Regimental Losses in the Civil War): 86 killed and 502 wounded in the first day\'s fight, out of 800 taken into action.',
  [('86', 86, 'killed'), ('502', 502, 'wounded'), ('800', 800, 'taken into action')])
N(['i26'], '2', 'its total loss in the battle being 588 killed and wounded', 1, 'casualties', 'regiment', '1-3 July 1863',
  'Underwood quotes Vanderslice (Gettysburg, Then and Now): total loss 588 killed and wounded and 126 missing out of 800 engaged (584 on the first day, 130 of the remaining 216 on the third).',
  [('584', 584, 'lost on the first day'), ('216', 216, 'remaining'), ('130', 130, 'lost on the third day'), ('588', 588, 'killed and wounded'), ('126', 126, 'missing'), ('800', 800, 'engaged')])
N(['i26'], '2', 'ascertained from the reports as given on the muster rolls of the companies, dated 31 August, 1863', 2, 'casualties', 'regiment', '1-3 July 1863 (muster rolls of 31 August 1863)',
  'Underwood: from the company muster rolls of 31 August 1863, killed and mortally wounded 139, wounded and missing 535; of the 800 about, 708 were killed, wounded and missing in the first and third days (his words: "over 88 per cent").',
  [('139', 139, 'killed and mortally wounded'), ('535', 535, 'wounded and missing')])
N(['i26'], '2', 'the gallant old Twenty-sixth had 67 privates and 3 officers present', 3, 'remaining_after', 'regiment', 'night of "8 July, 1863" as the text layer prints it (the next sentence says the men supported the artillery that night and all next day: the printed date is not corrected)',
  'Underwood quotes a report: the 26th had 67 privates and 3 officers present, out of 800 who went into battle on the morning of 1 July; cooks, extra-duty men and others who had been armed are not counted.',
  [('67', 67, 'privates present'), ('3', 3, 'officers present'), ('800', 800, 'went into battle'), ('70', 70, 'officers and men remained')])
N(['i26'], '2', 'Captain Duval, of Company A, reports that his company went into action', 1, 'taken_into_action', 'Company A', '1-3 July 1863',
  'Underwood: Captain Duval of Company A reports 92 men in action at Gettysburg; lost killed 11 and wounded 66 on the first day, 1 killed on the third.',
  [('92', 92, 'men in action'), ('11', 11, 'killed'), ('66', 66, 'wounded')])
N(['i26'], '2', 'took into the battle 82 men', 1, 'taken_into_action', 'Company E', '1-3 July 1863',
  'Underwood: Lambert of Company E says his company took 82 men into the battle; killed and mortally wounded 18, wounded 52 on the first day.', [('82', 82, 'men taken into the battle'), ('18', 18, 'killed and mortally wounded'), ('52', 52, 'wounded')])
N(['i26'], '2', 'Lieutenant Polk, of Company K, says he recrossed the Potomac', 1, 'strength_other', 'Company K', 'June to July 1863',
  'Underwood: Lieutenant Polk of Company K crossed the Potomac in June on the way to Gettysburg with 103 rank and file and recrossed at Falling Waters with 16 men.',
  [('103', 103, 'rank and file crossing in June'), ('16', 16, 'men recrossing at Falling Waters')])
N(['i26'], '2', 'Captain Albright, of Company G, reports the loss of his company', 1, 'casualties', 'Company G', '1-3 July 1863',
  'Underwood: Captain Albright of Company G reports 12 killed and 58 wounded and missing.', [('12', 12, 'killed'), ('58', 58, 'wounded and missing')])
N(['i26'], '2', 'Captain Mclver, of Company H, reports', 1, 'casualties', 'Company H', '1-3 July 1863', 'Underwood: Captain McIver of Company H reports 17 killed and 55 wounded at Gettysburg.', [('17', 17, 'killed'), ('55', 55, 'wounded')])
N(['i26'], '2', 'out of 91 rank and file taken into action', 1, 'taken_into_action', 'Company F', '1 July 1863',
  'Underwood (in the sketch of Captain R. M. Tuttle): Company F had 91 rank and file taken into action at Gettysburg and every man killed or wounded.', [('91', 91, 'rank and file taken into action')])
N(['i26'], '5', 'carried into action 3 officers and 88 enlisted men', 1, 'taken_into_action', 'Company F', '1 July 1863',
  'Tuttle (vol. 5, "Unparalleled Loss"): Company F carried into action 3 officers and 88 enlisted men, every one killed or wounded.', [('3', 3, 'officers'), ('88', 88, 'enlisted men')])
N(['i26'], '5', 'Trooj^s, went into the fight at Gettysburg, Pa., with 88', 1, 'taken_into_action', 'Company F', 'morning of 1 July 1863',
  'Tuttle prints the statement of Orderly Sergeant J. T. C. Hood: 88 answering to roll call on the morning of 1 July 1863 besides three commissioned officers (one private detailed to guard the knapsacks).',
  [('88', 88, 'answering to roll call'), ('three', 3, 'commissioned officers')])
N(['i26'], '5', 'This muster and ])ay roll states that there were present for duty', 3, 'present_for_duty', 'Company F', '30 June 1863 (muster and pay roll)',
  'Tuttle: the company muster and pay roll of 30 June 1863 (kept by J. J. Young) states present for duty 3 commissioned officers, 3 sergeants, 2 corporals, 1 musician and 84 privates, 9 privates on extra or daily duty, enlisted total 99, aggregate present 102, strength present and absent 134.',
  [('eighty-four', 84, 'privates present for duty'), ('99', 99, 'enlisted present'), ('102', 102, 'aggregate present'), ('134', 134, 'present and absent')])
N(['i26'], '5', 'In the first day\'s battle we had 87 men for duty', 1, 'taken_into_action', 'Company F', '1 July 1863',
  'Tuttle prints a letter of Captain James D. Moore, a private of Company F: in the first day\'s battle the company had 87 men for duty and lost every man but one.', [('87', 87, 'men for duty')])
N(['i26'], '5', 'led into action tAvo Lieuten- ants and 84 men', 2, 'taken_into_action', 'Company F', '1 July 1863',
  'Young (vol. 5): Captain Tuttle of the 26th led into action two lieutenants and 84 men; all of the officers and 83 men were killed or wounded.', [('84', 84, 'men'), ('83', 83, 'men killed or wounded')], source='young')
N(['i26'], '5', 'had entered the battle of the first day with 820 muskets', 2, 'taken_into_action', 'regiment', '1 and 3 July 1863',
  'Robbins (vol. 5): the 26th entered the first day\'s battle with 820 muskets and lost 584 killed and wounded (71 per cent); it went into the third day\'s fight with 236 men and had 80 left.',
  [('820', 820, 'muskets, first day'), ('584', 584, 'killed and wounded'), ('236', 236, 'men, third day'), ('80', 80, 'left')], source='robbins', strength=820)
N(['i26'], '5', 'having lost over 71 per cent', 1, 'casualties', 'regiment', '1 July 1863',
  'Robbins (vol. 5): the 26th lost over 71 per cent of its numbers in killed and wounded in the first day\'s fight.', [('71 per cent', 71, 'killed and wounded, first day')], source='robbins')
N(['i26', 'i11'], '5', 'The Twenty-sixth Xorth Carolina Regiment lost 549 out of 800', 2, 'casualties', 'the 26th and 11th Regiments', '1 July 1863',
  'Young (vol. 5): the 26th lost 549 out of 800; the 11th some 250 out of 550.', [('549', 549, '26th lost'), ('800', 800, '26th, out of'), ('250', 250, '11th lost'), ('550', 550, '11th, out of')], source='young')
N(['i26'], '5', 'The Twenty-sixth, which went into action on the 1st 850 strong', 1, 'taken_into_action', 'regiment', '1 and 3 July 1863',
  'Jones (vol. 5, in the Pettigrew chapter): the 26th went into action on the 1st 850 strong and had for duty on the 3d only 230 men and not officers enough to command the companies.',
  [('850', 850, 'strong, 1 July'), ('230', 230, 'for duty, 3 July')], source='young', strength=850)

# ----------------------------------------------------------------------------------------------------------------------------- Pettigrew's brigade (vol. 5, vol. 3, vol. 1)
N(PETTIGREW, '5', 'Pettigrew\'s Brigade about 3,000 strong', 1, 'taken_into_action', 'Pettigrew\'s brigade (four regiments present)', '1 July 1863',
  'Young (vol. 5): Pettigrew\'s brigade, about 3,000 strong, marched out in perfect alignment on 1 July.', [('3,000', 3000, 'strong')], source='young')
N(PETTIGREW, '5', 'On the morn- ing of 1 July it numbered 2,800 to 3,000', 1, 'taken_into_action', 'Pettigrew\'s brigade', '1 and 4 July 1863',
  'Young (vol. 5): on the morning of 1 July the brigade numbered 2,800 to 3,000, on the 4th 935.', [('2,800 to 3,000', None, 'numbered, 1 July'), ('935', 935, 'numbered, 4 July')], source='young')
N(['i11'], '5', 'Company C, of the Eleventh, lost tAvo officers killed and 34 out of 38 men', 1, 'casualties', 'Company C, 11th Regiment', '1 July 1863',
  'Young (vol. 5): Company C of the 11th lost two officers killed and 34 out of 38 men killed and wounded.', [('34', 34, 'killed and wounded'), ('38', 38, 'men, out of')], source='young')
N(LANE + PETTIGREW + SCALES, '5', 'Lane carried in 1,300 and lost', 4, 'casualties', 'Lane\'s, Pettigrew\'s and Scales\' brigades', '3 July 1863',
  'Ashe (vol. 5): Lane carried in 1,300 and lost 600 (the text layer prints GOO; the page image reads 600), nearly all killed and wounded; Pettigrew\'s brigade was about 1,700 strong and lost 1,100, the greater part killed and wounded; Scales\' brigade suffered in the like proportion; the three brigades doubtless lost 1,500 killed and wounded.',
  [('1,300', 1300, 'Lane\'s brigade carried in'), ('GOO', None, 'Lane\'s brigade lost (text layer damaged; the page image reads 600)'), ('1,700', 1700, 'Pettigrew\'s brigade strong, "about"'), ('1,100', 1100, 'Pettigrew\'s brigade lost'), ('1,500', 1500, 'killed and wounded of the three brigades, "doubtless"')], source='ashe')
N(['i47', 'i52'], '3', 'for the Forty-seventh and Fifty-second had abbut 1,300 men in line', 1, 'taken_into_action', 'the 47th and 52nd Regiments together', '1 July 1863',
  'Rogers (47th chapter): the 47th and 52nd had about 1,300 men in line in both regiments.', [('1,300', 1300, 'men in line, both regiments')])
N(PETTIGREW, '3', 'General Pettigrew had in line of battle that morning nearer 3,000 soldiers', 1, 'taken_into_action', 'Pettigrew\'s brigade', '1 July 1863',
  'Rogers (47th chapter): Pettigrew had in line that morning nearer 3,000 soldiers than 2,500.', [('3,000', 3000, 'soldiers'), ('2,500', 2500, 'soldiers')])
N(['i11', 'i26'], '3', 'Before night the Twentysixth and Eleventh', 1, 'casualties', 'the 26th and 11th Regiments', '1 July 1863',
  'Rogers (47th chapter): before night the 26th and 11th had lost two-thirds of their numbers.', [('two-thirds', None, 'of their numbers lost')], chap='i47')
N(['i47'], '3', 'our regiment numbered 98 men for duty', 1, 'remaining_after', 'regiment', 'a few days after Falling Waters, July 1863',
  'Rogers (47th chapter): when the regiment camped at Bunker Hill a few days after Falling Waters it numbered 98 men for duty.', [('98', 98, 'men for duty')])
N(['i11'], '1', 'the regiment lost fifty killed and one hundred and fifty-nine wounded', 1, 'casualties', 'regiment', '1 and 3 July 1863',
  'Martin/Outlaw (11th chapter): in the battles of the first and third days (held in reserve the second) the regiment lost fifty killed and one hundred and fifty-nine wounded.', [('fifty', 50, 'killed'), ('one hundred and fifty-nine', 159, 'wounded')])
N(['i11'], '1', 'Company A had crossed the Potomac with a hundred men', 1, 'strength_other', 'Company A', 'June and 3 July 1863',
  'Martin/Outlaw: Company A crossed the Potomac with a hundred men and came out of the charge on Cemetery Hill with a lieutenant and eight men.', [('a hundred', 100, 'men crossing the Potomac'), ('eight', 8, 'men after the charge')])
N(['i11'], '1', 'Company C went into that day\'s battl', 1, 'taken_into_action', 'Company C', '3 July 1863',
  'Martin/Outlaw: Company C went into the third day\'s battle with three officers and thirty-four men and lost two officers killed and thirty men killed or wounded.', [('three', 3, 'officers'), ('thir- ty-four', 34, 'men'), ('thirty', 30, 'men killed or wounded')])
N(['i52'], '3', 'The Adjutant of the regiment reported the losses', 1, 'casualties', 'regiment', '1 and 3 July 1863',
  'Robinson (52nd chapter): the adjutant reported the losses of the first and third days as 33 killed on the field, 114 wounded and 169 missing.', [('33', 33, 'killed'), ('114', 114, 'wounded'), ('169', 169, 'missing')])

# ----------------------------------------------------------------------------------------------------------------------------- the other infantry regiments and battalions (vols. 1 to 4)
N(['i1'], '1', 'leaving most of our dead, thirty-eight in number, on the field', 1, 'casualties', 'regiment', 'night after the assault of 3 July 1863 (Culp\'s Hill)',
  'Brown (1st chapter): after the failed assault on the morning of the 3d the regiment fell back and retreated at night, leaving most of its dead, thirty-eight in number, on the field.', [('thirty-eight', 38, 'dead left on the field')])
N(['i3'], '1', 'The battle of Gettysburg is generally conceded', 4, 'taken_into_action', 'regiment', 'July 1863',
  'Cowan and Metts (3rd chapter, p. 196): entering the battle with three hundred guns the regiment was reduced by the killing and wounding of two hundred and twenty-three men.', [('three hundred', 300, 'guns'), ('two hundred and twenty- three', 223, 'killed and wounded')], strength=300)
N(['i3'], '1', 'When the regiment was mustered after the battle, seventy-seven muskets', 2, 'remaining_after', 'regiment', 'after the battle, July 1863',
  'Cowan and Metts (3rd chapter, p. 196): when the regiment was mustered after the battle seventy-seven muskets were all that could be gotten in the ranks; the loss was within a fraction of seventy-five per cent.', [('seventy-seven', 77, 'muskets in the ranks'), ('seventy-five per cent', 75, 'loss')])
N(['i5'], '1', 'Its loss at Gettysburg is reported in the', 1, 'casualties', 'regiment', '1-3 July 1863',
  'MacRae/Busbee (5th chapter): the loss at Gettysburg is reported in the "Records of the Rebellion" at thirty-one killed and one hundred and twelve wounded.', [('thirty-one', 31, 'killed'), ('one hundred and twelve', 112, 'wounded')])
N(['i13'], '1', 'In the first day\'s fight at Gettysburg the Thirteenth had only', 1, 'taken_into_action', 'regiment', '1 July 1863',
  'Smith (13th chapter): in the first day\'s fight at Gettysburg the 13th had only one hundred and eighty men in line.', [('one hundred and eighty', 180, 'men in line')], strength=180)
N(['i13'], '1', 'Of the one hundred and eighty men in the regiment one hundred and fifty', 2, 'casualties', 'regiment', '1 July 1863',
  'Same chapter: of the 180 men 150 were killed and wounded, leaving only thirty; only two officers were left.', [('one hundred and eighty', 180, 'men'), ('one hundred and fifty', 150, 'killed and wounded'), ('thirty', 30, 'left')])
N(['i13'], '1', 'The next day fifteen men who had been left at Greencastle', 6, 'remaining_after', 'regiment', '2 and 3 July 1863',
  'Same chapter: next day fifteen men left at Greencastle joined and the regiment was recruited to forty-five men; in the charge of the 3d twenty-three of them were killed and wounded, leaving only twenty-two men.',
  [('fifteen', 15, 'men joined'), ('forty-five', 45, 'men'), ('twenty- three', 23, 'killed and wounded'), ('twenty-two', 22, 'left')])
N(['i16'], '1', 'at the close of those crucial three days it was found that', 1, 'casualties', 'regiment', '1-3 July 1863',
  'Cathey (16th chapter; he writes that he was not at Gettysburg): at the close of the three days the Federal bullets had deprived the 16th of seventy-two more of its men (killed or wounded not stated).', [('seventy-two', 72, 'men lost')])
N(LANE, '2', 'In the battles around Richmond in 1862, the brigade lost 800 men', 2, 'casualties', 'Lane\'s brigade', '1-3 July 1863',
  'McLaurin (18th chapter): at Gettysburg the brigade formed the left of Longstreet\'s charge although it had lost nearly 40 per cent in its three days\' fighting.', [('40 per cent', 40, 'lost in three days')])
N(LANE, '2', 'The casualties in the regiment were 10 killed, 53 wounded', 2, 'casualties', 'the 33rd Regiment and Lane\'s brigade', '3 July 1863',
  'Weston (33rd chapter): casualties in the regiment 10 killed, 53 wounded; the brigade loss was 660 out of an effective total of 1,355.', [('10', 10, 'killed'), ('53', 53, 'wounded'), ('660', 660, 'brigade loss'), ('1,355', 1355, 'effective total')])
N(LANE + SCALES, '2', 'now reduced to mere squads, not numbering in all 800 men', 1, 'remaining_after', 'Lane\'s and Scales\' brigades', 'end of the charge, 3 July 1863',
  'Weston (33rd chapter) quotes Colonel Lowrance: the two brigades, reduced to mere squads, did not number 800 men in all.', [('800', 800, 'men in both brigades')])
N(['i28'], '2', 'Its loss was IS killed and 92 wounded', 1, 'casualties', 'regiment', '3 July 1863',
  'Lane (28th chapter): loss 12 killed and 92 wounded (the first text layer prints IS and the second 19; the page image reads 12).', [('IS', None, 'killed (text layer damaged; the page image reads 12)'), ('92', 92, 'wounded')])
N(['i20'], '2', 'The reports of the battle give twenty-nine killed and ninety-three wounded', 1, 'casualties', 'regiment', '1-3 July 1863',
  'Toon (20th chapter): the reports give twenty-nine killed and ninety-three wounded in the 20th.', [('twenty-nine', 29, 'killed'), ('ninety-three', 93, 'wounded')])
N(IVERSON, '2', 'General Iverson reports 500 men of his brigade killed', 1, 'casualties', 'Iverson\'s brigade', '1 July 1863',
  'Toon (20th chapter): General Iverson reports 500 men of his brigade killed (lying in as good order as if on dress parade).', [('500', 500, 'men of the brigade killed')])
N(SCALES, '2', 'Scales\' Brigade had not one Field Officer left for duty', 2, 'casualties', 'Scales\' brigade or the 22nd Regiment (the antecedent of "Its" is not stated)', '3 July 1863',
  'Daves (22nd chapter), at the end of his account of Gettysburg: after Scales\' brigade had not one field officer left for duty, "Its total loss was 102 killed and 322 wounded"; the sentence does not say whether "Its" is the brigade or the regiment, so the note is carried with every regiment of the brigade.', [('102', 102, 'killed'), ('322', 322, 'wounded')], chap='i22')
N(['i23'], '2', 'Here he held his men in position under a most terrific fire', 1, 'casualties', 'regiment', '1 July 1863',
  'Turner/Wall (23rd chapter): Colonel Christie held his men under fire for an hour till the whole regiment was killed, wounded or captured, except a lieutenant and sixteen men.', [('sixteen', 16, 'men left, with a lieutenant')])
N(DANIEL, '2', 'Daniel\'s Brigade entered the battle of Gettysburg with 2,100 men', 1, 'taken_into_action', 'Daniel\'s brigade', '1 July 1863',
  'London (32nd chapter): the brigade entered the battle with 2,100 men and lost in killed and wounded 778 (the first text layer prints 7T8; the page image reads 778).', [('2,100', 2100, 'men'), ('7T8', None, 'killed and wounded (text layer damaged; 778 as the digits stand)')])
N(['i38'], '2', 'After the third day\'s fight the regiment had only about 40 men', 1, 'remaining_after', 'regiment', 'after 3 July 1863',
  'Flowers (38th chapter): after the third day\'s fight the regiment had only about 40 men, commanded by a first lieutenant.', [('about 40', 40, 'men')])
N(['i45', 'bn2'], '3', 'While the Forty-fifth Kegiment and the Second North Carolina Battalion', 1, 'casualties', 'the 45th Regiment and the 2nd Battalion', '1 July 1863',
  'Watson (45th chapter), writing of the account in a federal history: the 45th and the 2nd Battalion (six companies) lost that day nearly 400 men.', [('400', 400, 'men lost, "nearly"')])
N(['i45'], '3', 'My own company lost seven men dead on the field', 1, 'casualties', 'one company (the writer\'s, not named)', '1 July 1863',
  'Watson (45th chapter): his own company lost seven men dead on the field and between twenty-five and thirty wounded, all its officers but one.', [('seven', 7, 'dead'), ('twenty-five and thirty', None, 'wounded')])
N(['bn2'], '4', 'It fell short of a full regiment', 2, 'casualties', 'battalion', '1 July 1863',
  'Green (2nd Battalion chapter): at Gettysburg the battalion fell short of a full regiment; one hundred and fifty-three killed and wounded is the authenticated record.', [('One hundred and fifty-three', 153, 'killed and wounded')])
N(['bn2'], '4', 'Its killed was twenty-nine', 2, 'casualties', 'battalion', '1 July 1863',
  'Green prints a letter of H. A. London: killed twenty-nine (including Lieutenant-Colonel Andrews), wounded 124; the 57th Virginia had 26 killed and 95 wounded.', [('twenty-nine', 29, 'killed'), ('124', 124, 'wounded')])
N(['i53'], '3', 'Company B lost at Gettysburg out of about 65 men', 1, 'casualties', 'Company B', '1-3 July 1863',
  'Morehead (53rd chapter): Company B lost at Gettysburg out of about 65 men 8 killed and 22 wounded, and three of its four officers wounded.', [('65', 65, 'men, "about"'), ('8', 8, 'killed'), ('22', 22, 'wounded')])
N(['i55'], '3', 'The loss of the regiment at Gettysburg amounted to 64 killed', 1, 'casualties', 'regiment', '1-3 July 1863',
  'Cooke (55th chapter): the loss at Gettysburg amounted to 64 killed and 172 wounded (the text layer prints "ounded"), about 200 captured, more than one-half the number of men in the regiment.', [('64', 64, 'killed'), ('172', 172, 'wounded'), ('200', 200, 'captured, "about"')])

# ----------------------------------------------------------------------------------------------------------------------------- cavalry
N(['cav1'], '1', 'this small cavalry force of less than three thousand men', 1, 'strength_other', 'Stuart\'s column (Hampton\'s, Fitzhugh Lee\'s and W. H. F. Lee\'s brigades)', '28 June to 2 July 1863',
  'Barringer (1st Cavalry chapter): from Brookville on 28 June 1863 the small cavalry force of less than three thousand men went as far as Carlisle and reached Gettysburg on the afternoon of the 2d of July.', [('three thousand', 3000, 'men, "less than"')])
N(['cav2'], '2', 'Captain Graham, as officer commanding, had a force of forty men', 1, 'taken_into_action', 'detachment of the regiment', 'morning of 3 July 1863',
  'Graham (2nd Cavalry chapter): on the morning of 3 July, gathering up the fragments left from Hanover and what was available from the wagon train, Captain Graham had a force of forty men.', [('forty', 40, 'men')])

# ----------------------------------------------------------------------------------------------------------------------------- artillery
N(['batta'], '1', 'We lost at Gettysburg private W. E. Ramsay, killed', 1, 'casualties', 'Company A (Manly\'s battery, in Cabell\'s battalion)', '2 July 1863',
  'Ramsay (Light Batteries A, D, F and I): the battery lost at Gettysburg one private killed, one wounded and captured and eight wounded (named); the surgeon was left in the enemy\'s lines with the wounded of the battalion.', [('Ramsay, killed', None, 'one killed (name as printed)')])
N(['rowan', 'branch'], '1', 'On July 2 Reilly\'s and Latham\'s Batteries', 3, 'casualties', 'Henry\'s battalion (four batteries: Reilly\'s Rowan Artillery, Latham\'s, and two others)', '2 and 3 July 1863',
  'Ramsay: on 2 July Reilly\'s and Latham\'s batteries of Henry\'s battalion were on the extreme right at Gettysburg; on the 3d the whole four batteries were engaged in the same position and lost four killed and twenty-three wounded.', [('four', 4, 'killed, four batteries'), ('twenty-three', 23, 'wounded, four batteries')])
N(['charlotte'], '1', 'which was done with his six guns', 1, 'strength_other', 'battery', '1 July 1863',
  'Williams (Company C chapter): General A. P. Hill ordered Captain Graham to open fire and it was done with his six guns.', [('six', 6, 'guns')])

# ----------------------------------------------------------------------------------------------------------------------------- statements found outside the regimental chapters (vols. 1, 4 and 5)
N(IVERSON, '1', 'At Carlisle, the day before the battle, the reports showed that there were present for duty', 2, 'present_for_duty', 'Iverson\'s brigade', '30 June 1863 (Carlisle, "the day before the battle"; after the battle 1 July)',
  'Montgomery (12th chapter): at Carlisle, the day before the battle, the reports showed present for duty one thousand three hundred and fifty-six men and one hundred and fourteen officers in Iverson\'s brigade; he reckons not more than three hundred and fifty or four hundred men with the brigade after the battle.',
  [('one thousand three hundred and fifty-six', 1356, 'men present for duty'), ('one hundred and fourteen', 114, 'officers present for duty'), ('three hundred and fifty', 350, 'men with the brigade after the battle ("not more than")'), ('four hundred', 400, 'men with the brigade after the battle')], chap='i12')
N(IVERSON, '1', 'The loss of Iverson\'s Brigade was reported at five hundred and twelve killed and wounded', 1, 'casualties', 'Iverson\'s brigade', '1 July 1863',
  'Montgomery (12th chapter): the loss of Iverson\'s brigade was reported at five hundred and twelve killed and wounded and three hundred and eight missing.', [('five hundred and twelve', 512, 'killed and wounded'), ('three hundred and eight', 308, 'missing')], chap='i12')
N(['i26'], '5', 'which went in 900 rank and file', 3, 'taken_into_action', 'regiment', '1-3 July 1863',
  'Vance (speech of 1875 reprinted in vol. 5): the 26th at Gettysburg went in 900 rank and file and came out with little over 100 men fit for duty; one company, 84 strong, reported every man and officer hit.', [('900', 900, 'rank and file'), ('100', 100, 'men fit for duty after the battle, "little over"'), ('84', 84, 'one company, strong')], source='vance', strength=900)
N(['i26'], '5', 'No brigade in Pickett\'s division lost as many killed and wounded as the Twenty-sixth North Carolina', 1, 'casualties', 'regiment', '1-3 July 1863',
  'Clark (Review and Conclusion, quoting a speech): the 26th lost 86 killed and 502 wounded, the heaviest loss of any regiment in either army in any battle of the war.', [('86', 86, 'killed'), ('502', 502, 'wounded')], source='review')
N(PETTIGREW + DANIEL, '5', 'The three brigades which lost more killed than any others in that battle', 1, 'casualties', 'Pettigrew\'s and Daniel\'s brigades (and Davis\')', '1-3 July 1863',
  'Clark (Review and Conclusion, quoting a speech): Pettigrew\'s North Carolina brigade lost 190 killed, Davis\' brigade 180 and Daniel\'s North Carolina brigade 165 killed.', [('190', 190, 'killed, Pettigrew\'s brigade'), ('165', 165, 'killed, Daniel\'s brigade'), ('180', 180, 'killed, Davis\' brigade')], source='review')
N(['i1'], '5', 'our company numbered only twenty-three', 1, 'remaining_after', 'Company C', 'daylight, 3 July 1863',
  'Rivenbark (vol. 5): after the charge of the evening of 2 July the roll of Company C at daylight on the 3d showed twenty-three, officers and men.', [('twenty-three', 23, 'officers and men')], source='rivenbark')
N(['i26'], '5', 'Killed dead', 1, 'casualties', 'Company F', '1-3 July 1863',
  'Tuttle (vol. 5): recapitulation of Company F: killed dead 19, mortally wounded 12, wounded but recovered 60, total 91; only four or five men were left from the first day\'s fight to go into action on the 3d.', [('19', 19, 'killed dead'), ('12', 12, 'mortally wounded'), ('60', 60, 'wounded but recovered'), ('91', 91, 'total')])
N(DANIEL, '4', 'This brigade went into the first day\'s fight at Gettysburg about 2 o\'clock and lost over 600 men', 1, 'casualties', 'Daniel\'s brigade', '1 July 1863',
  'London (brigade history, vol. 4): the brigade went into the first day\'s fight at Gettysburg about 2 o\'clock and lost over 600 men that afternoon and almost half of its men in the campaign.', [('600', 600, 'men lost on the afternoon of 1 July, "over"')], source='london')
N(SCALES, '4', 'In this charge the brigade lost some 400 killed and wounded', 1, 'casualties', 'Scales\' brigade', '1 July 1863',
  'Rawley (brigade history, vol. 4): in the charge of 1 July the brigade lost some 400 killed and wounded, among them Colonel Scales, Captain Riddick and General Pender.', [('400', 400, 'killed and wounded, "some"')], source='rawley')

# ----------------------------------------------------------------------------------------------------------------------------- identification of the four artillery companies (they corroborate DD-ROS-NC-04, no figure)
N(['batta'], '1', 'The battery, up to this time, was called Ramseur\'s', 1, 'identification', 'Company A of the Tenth Regiment', 'spring 1861',
  'Ramsay (Light Batteries A, D, F and I): Company A, Tenth North Carolina State Troops, was organized at Raleigh in April 1861 as the "Ellis Light Artillery"; it was called Ramseur\'s until Manly took charge and then, at the men\'s request, Manly\'s: Manly\'s Battery (Battery A, 1st North Carolina Artillery) is Company A of Moore\'s Tenth Regiment (First Artillery).', [])
N(['rowan'], '1', 'Reilly\'s Battery, usually styled in the Army Returns the', 1, 'identification', 'Company D of the Tenth Regiment', '15 June 1863',
  'Ramsay: Reilly\'s Battery is the one styled in the Army Returns the "Rowan Artillery" and belonged to Henry\'s Battalion from 15 June 1863; the chapter describes Light Batteries A, D, F and I of the Tenth Regiment, and Reilly\'s is Company D.', [])
N(['charlotte'], '1', 'Company C, Tenth North Carolina State Troops, was organ- ized at Charlotte', 1, 'identification', 'Company C of the Tenth Regiment', '16 May 1861',
  'Williams (Company C chapter): Company C, Tenth North Carolina State Troops, was organized at Charlotte on 16 May 1861 (Captain Thomas H. Brem; Joseph Graham and A. B. Williams Second Lieutenants): the Charlotte Artillery (Graham\'s battery) is Company C of Moore\'s Tenth Regiment.', [])
N(['branch'], '4', 'Captain, Alex. C. Latham', 1, 'identification', 'Company F of the Thirteenth Battalion', 'organization of the battalion',
  'Clark, Thirteenth Battalion (Starr\'s): Company F (Craven, Beaufort and Wake counties) had Captain Alex. C. Latham: Latham\'s battery, the Branch Artillery (Moore: Company F of the Fifth Battalion, originally the Thirteenth Battalion).', [])


# ----------------------------------------------------------------------------------------------------------------------------- page-image checks
# Where the two scans read a figure differently, or one of them could not be matched, the page was rendered from the Emory copy (page_image.py route, 300 ppi, transient, never
# stored), read again with tesseract 5 and, where "viewed" is stated, looked at by the engineer (a crop of the lines around the statement).  Key: the phrase of the note.
# leaf = leaf of the Emory item (text id NC-CLARK-1901.<vol>~b); how = "viewed" (looked at, and read by tesseract) or "tesseract" (read by tesseract only); reads = what the image shows, per printed figure.
IMAGE = {}


def I(phrase, vol, page, leaf, how, reads, note):
    IMAGE[phrase] = {'text_id': TEXT_B[vol], 'printed_page': page, 'leaf': leaf, 'how': how, 'reads': reads, 'result': note}


for letter, fig, how in (('A', '97', 'viewed'), ('B', '92', 'viewed'), ('C', '80', 'viewed'), ('D', '79', 'viewed'), ('G', '91', 'viewed'), ('H', '78', 'viewed'), ('I', '74', 'viewed'), ('K', '99', 'viewed')):
    I('present for duty, %s' % fig, '2', 371 if letter in 'ABCD' else 372, 435 if letter in 'ABCD' else 436, how, {fig: fig}, 'the printed figure is %s; the text layer reads it so (Company %s)' % (fig, letter))
I('Captain, R. M. Tuttle ; First Lieutenant', '2', 371, 435, 'viewed', {'91': '91 (page 372, first line)'}, 'the printed figure is 91 (Company F, carried over the page break); the second scan could not be matched because the running head splits the entry')
I('The total number present for duty was 885', '2', 372, 436, 'viewed', {'885': '885'}, 'the printed figure is 885')
I('The muster rolls for 30 June, 1863, make the aggregate present', '2', 373, 437, 'viewed', {'885': '885 (first digit faded in the print; the text layer of the second scan reads *85, tesseract reads 485)', '800': '800', '10 per cent': '10 per cent'},
  'the printed figure reads 885 (the glyph of the first digit is faded; the total on page 372 is printed 885 and the ten company figures add to 885); the text layer of the first scan is right')
I('We went in with over 800 men in the regiment', '2', 357, 419, 'viewed', {'over 800': 'over 800 (first digit faded: tesseract S00, second scan *00)'}, 'the print reads 800 with a faded first digit; the text layer of the first scan reads it so')
I('There came out of the first day\'s fight 216 all told, unhurt', '2', 357, 419, 'viewed', {'216': '216'}, 'the printed figure is 216')
I('Yesterday they were again engaged, and now have only about 80 men for duty', '2', 357, 419, 'viewed', {'about 80': 'about 80 (first digit faded: second scan SO, tesseract 0)'}, 'the print reads 80 with a faded first digit; the text layer of the first scan reads it so')
I('ascertained from the reports as given on the muster rolls of the companies, dated 31 August, 1863', '2', 373, 437, 'tesseract', {'139': '139', '535': '535'}, 'tesseract reads 139 and 535 as the text layer of the first scan does')
I('the gallant old Twenty-sixth had 67 privates and 3 officers present', '2', 366, 428, 'viewed', {'67': '67', '3': '3', '800': '800', '70': '70', 'date': '3 July, 1863'},
  'the print reads "the night of 3 July, 1863": the text layer of the first scan prints "8 July" (a damaged digit), the figures are as the text layer prints them; the date is not corrected in the quotation')
I('Captain Duval, of Company A, reports that his company went into action', '2', 373, 437, 'viewed', {'92': '92', '11': '11', '66': '66'}, 'the printed figure is 92; the second scan reads 93 (an OCR error)')
I('took into the battle 82 men', '2', 373, 437, 'tesseract', {'82': '82'}, 'tesseract reads 82 as the text layer does')
I('out of 91 rank and file taken into action', '2', 416, 484, 'tesseract', {'91': '91'}, 'tesseract reads 91 as the text layer does; the second scan reads the figure damaged')
I('carried into action 3 officers and 88 enlisted men', '5', 599, 675, 'viewed', {'3': '3', '88': '88 (both digits faded: tesseract 85, second scan SS)'}, 'the print reads 88 (two faded 8s); the statement of Orderly Sergeant Hood that follows also says 88')
I('led into action tAvo Lieuten- ants and 84 men', '5', 131, 167, 'viewed', {'84': '84', '83': '83'}, 'the printed figures are 84 and 83')
I('On the morn- ing of 1 July it numbered 2,800 to 3,000', '5', 131, 167, 'tesseract', {'2,800 to 3,000': '2,800 to 3,000', '935': '935'}, 'tesseract reads the figures as the text layer does')
I('Company C, of the Eleventh, lost tAvo officers killed and 34 out of 38 men', '5', 131, 167, 'viewed', {'34': '34', '38': '38'}, 'the printed figures are 34 and 38')
I('General Pettigrew had in line of battle that morning nearer 3,000 soldiers', '3', 105, 135, 'viewed', {'3,000': '3,000 (faded)', '2,500': '2,500 (faded)'}, 'the print reads 3,000 and 2,500; the second scan reads them damaged')
I('Before night the Twentysixth and Eleventh', '3', 105, 135, 'viewed', {'two-thirds': 'two-thirds'}, 'the print reads two-thirds')
I('The casualties in the regiment were 10 killed, 53 wounded', '2', 567, 661, 'viewed', {'10': '10 (faded)', '53': '53 (the second digit is faded in the print; the first scan and tesseract read 53, the second scan reads 5:)', '660': '660 (faded)', '1,355': '1,355 (the third digit faded; tesseract reads 1.555)'},
  'the print reads 10 killed, 53 wounded, 660 and 1,355 with faded digits; the text layer of the first scan reads them so; the second scan reads two of them damaged')
I('Its loss was IS killed and 92 wounded', '2', 478, 554, 'viewed', {'IS': '12 (the 2 has the shape of the 2 in 92)', '92': '92'}, 'the print reads "12 killed and 92 wounded": the first scan prints IS (damaged) and the second scan 19 (wrong), tesseract 1%')
I('The reports of the battle give twenty-nine killed and ninety-three wounded', '2', 119, 149, 'tesseract', {'twenty-nine': 'twenty-nine', 'ninety-three': 'ninety-three'}, 'tesseract reads the words as the text layer does')
I('General Iverson reports 500 men of his brigade killed', '2', 119, 149, 'tesseract', {'500': '500'}, 'tesseract reads 500 as the text layer of the first scan does')
I('Scales\' Brigade had not one Field Officer left for duty', '2', 171, 213, 'tesseract', {'102': '102', '322': '322'}, 'tesseract reads 102 killed and 322 wounded as the text layer of the first scan does')
I('Lane carried in 1,300 and lost', '5', 158, 194, 'viewed', {'1,300': '1,300', 'GOO': '600 (the first digit looks like a G in the text layer)', '1,700': '1,700', '1,100': '1,100', '1,500': '1,500'}, 'the print reads Lane 1,300 carried in and 600 lost, Pettigrew 1,700 strong and 1,100 lost, 1,500 for the three brigades; the text layer reads 600 as GOO')
I('Daniel\'s Brigade entered the battle of Gettysburg with 2,100 men', '2', 529, 617, 'tesseract', {'2,100': '2,100', '7T8': '778'}, 'the print reads 778 (tesseract): the first scan prints 7T8 (a damaged digit)')
I('After the third day\'s fight the regiment had only about 40 men', '2', 693, 801, 'tesseract', {'about 40': 'about 40'}, 'tesseract reads about 40 as the text layer of the first scan does')
I('Company B lost at Gettysburg out of about 65 men', '3', 264, 310, 'tesseract', {'65': '65', '8': '8', '22': '22'}, 'tesseract reads 65, 8 and 22 as the text layer of the first scan does; the second scan reads 65 as 05')
I('The battle of Gettysburg is generally conceded', '1', 196, 232, 'tesseract', {'three hundred': 'three hundred', 'two hundred and twenty- three': 'two hundred and twenty-three'}, 'tesseract reads the words as the text layer does')
I('When the regiment was mustered after the battle, seventy-seven muskets', '1', 196, 232, 'tesseract', {'seventy-seven': 'seventy-seven', 'seventy-five per cent': 'seventy-five per cent'}, 'tesseract reads the words as the text layer does')
I('the regiment lost fifty killed and one hundred and fifty-nine wounded', '1', 590, 658, 'tesseract', {'fifty': 'fifty', 'one hundred and fifty-nine': 'one hundred and fifty-nine'}, 'tesseract reads the words as the text layer does')
