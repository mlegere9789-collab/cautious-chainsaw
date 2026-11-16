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
    'i16': [('1', 1810040, 1861019, 'Sixteenth Regiment, by Lieutenant B. H. Cathey (p. 751) and Captain L. Harrill (p. 771), vol. 1')],
    'i18': [('2', 35162, 191096, 'Eighteenth Regiment, by Adjutant William H. McLaurin (p. 16) and Private Thomas H. Sutton (p. 65), vol. 2')],
    'i20': [('2', 264195, 305014, 'Twentieth Regiment, by Brigadier-General Thomas F. Toon, vol. 2 p. 111')],
    'i21': [('2', 305014, 378895, 'Twenty-First Regiment, by Major James F. Beall (p. 129) and Lieutenant L. E. Powers (p. 147), vol. 2')],
    'i22': [('2', 378895, 424789, 'Twenty-Second Regiment, by Adjutant Graham Daves, vol. 2 p. 161')],
    'i23': [('2', 424789, 645719, 'Twenty-Third Regiment, by Captain V. E. Turner and Sergeant H. C. Wall, vol. 2 p. 181')],
    'i26': [('2', 726790, 1022958, 'Twenty-Sixth Regiment, by Assistant Surgeon George C. Underwood, vol. 2 p. 303'),
            ('5', 1391339, 1399889, 'Unparalleled Loss (Company F, Twenty-Sixth Regiment, at Gettysburg), by Captain R. M. Tuttle, vol. 5 p. 599')],
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
# chapters of volume 5 that are about the battle and name the regiments of this work item (author, label)
V5 = {
    'robbins': (273742, 304200, 'Longstreet\'s Assault at Gettysburg, by Major W. M. Robbins, vol. 5 p. 101'),
    'young': (304200, 364570, 'Pettigrew\'s Brigade at Gettysburg, by Captain Louis G. Young, A. A. G., vol. 5 p. 113; Pettigrew\'s Charge at Gettysburg, by Lieutenant-Colonel John T. Jones, vol. 5 p. 133'),
    'ashe': (364570, 419703, 'The Pettigrew-Pickett Charge, by Captain S. A. Ashe, A. A. G., vol. 5 p. 137'),
}

NOTES = []


def N(units, vol, phrase, n, kind, subject, when, claim, figures, source=None):
    NOTES.append({'units': units, 'vol': vol, 'phrase': phrase, 'n': n, 'kind': kind, 'subject': subject, 'when': when, 'claim': claim, 'figures': figures, 'source': source})


# ----------------------------------------------------------------------------------------------------------------------------- 26th North Carolina (Underwood)
S26 = 'the 26th North Carolina Infantry'
for letter, who, fig in (('A', 'Samuel P. Wagg', '97'), ('B', 'Wm. Wilson', '92'), ('C', 'J. A. Jarrett', '80'), ('D', 'J. T. Adams', '79'), ('E', 'S. W. Brewer', '104'),
                         ('F', 'R. M. Tuttle', '91'), ('G', 'H. C. Albright', '91'), ('H', 'M. McLeod', '78'), ('I', 'N. G. Bradford', '74'), ('K', 'James G. McLauchlin', '99')):
    N(['i26'], '2', who, 2 if letter == 'F' else 1, 'present_for_duty', 'Company %s' % letter, '30 June 1863 (muster and pay roll of that day)',
      'Underwood copies from the muster and pay roll of 30 June 1863 (kept by the regimental quartermaster J. J. Young) that Company %s of the 26th had %s present for duty.' % (letter, fig),
      [(fig, int(fig), 'present for duty')])
N(['i26'], '2', 'The total number present for duty was 885', 1, 'present_for_duty', 'regiment', '30 June 1863',
  'Underwood states the total present for duty in the 26th, by the muster rolls of 30 June 1863, as 885 (the ten company figures above add to 885).', [('885', 885, 'present for duty')])
N(['i26'], '2', 'The muster rolls for 30 June, 1863, make the aggregate present', 1, 'present_for_duty', 'regiment', '30 June 1863; 1 July 1863',
  'Underwood: the muster rolls of 30 June 1863 make the aggregate present for duty (enlisted men) 885; allowing 10 per cent for extra duty and details he reckons about 800 muskets taken into battle on the first day (his own estimate).',
  [('885', 885, 'present for duty, enlisted men'), ('10 per cent', 10, 'allowance for extra duty and details'), ('800', 800, 'muskets taken into battle (his reckoning)')])
N(['i26'], '2', 'with its 800 muskets', 1, 'taken_into_action', 'regiment', '1 July 1863',
  'Underwood places the 26th in line on 1 July 1863 with 800 muskets (Pettigrew\'s four regiments being in full ranks).', [('800', 800, 'muskets')])
N(['i26'], '2', 'We went in with over 800 men in the regiment', 1, 'taken_into_action', 'regiment', '1 July 1863 (letter of 4 July 1863)',
  'Underwood prints a letter of the regimental quartermaster J. J. Young to Governor Vance, 4 July 1863: the regiment went in with over 800 men.', [('over 800', 800, 'men, "over")')])
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
N(['i26'], '2', 'the gallant old Twenty-sixth had 67 privates and 3 officers present', 2, 'remaining_after', 'regiment', 'night of "8 July, 1863" as the text layer prints it (the next sentence says the men supported the artillery that night and all next day: the printed date is not corrected)',
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
N(['i26'], '5', 'led into action tAvo Lieuten- ants and 84 men', 1, 'taken_into_action', 'Company F', '1 July 1863',
  'Young (vol. 5): Captain Tuttle of the 26th led into action two lieutenants and 84 men; all of the officers and 83 men were killed or wounded.', [('84', 84, 'men'), ('83', 83, 'men killed or wounded')], source='young')
N(['i26'], '5', 'had entered the battle of the first day with 820 muskets', 2, 'taken_into_action', 'regiment', '1 and 3 July 1863',
  'Robbins (vol. 5): the 26th entered the first day\'s battle with 820 muskets and lost 584 killed and wounded (71 per cent); it went into the third day\'s fight with 236 men and had 80 left.',
  [('820', 820, 'muskets, first day'), ('584', 584, 'killed and wounded'), ('236', 236, 'men, third day'), ('80', 80, 'left')], source='robbins')
N(['i26'], '5', 'having lost over 71 per cent. of its numbers in killed and wounded in the first day', 1, 'casualties', 'regiment', '1 July 1863',
  'Robbins (vol. 5): the 26th lost over 71 per cent of its numbers in killed and wounded in the first day\'s fight.', [('71 per cent', 71, 'killed and wounded, first day')], source='robbins')
N(['i26', 'i11'], '5', 'The Twenty-sixth Xorth Carolina Regiment lost 549 out of 800', 2, 'casualties', 'the 26th and 11th Regiments', '1 July 1863',
  'Young (vol. 5): the 26th lost 549 out of 800; the 11th some 250 out of 550.', [('549', 549, '26th lost'), ('800', 800, '26th, out of'), ('250', 250, '11th lost'), ('550', 550, '11th, out of')], source='young')
N(['i26'], '5', 'The Twenty-sixth, which went into action on the 1st 850 strong', 1, 'taken_into_action', 'regiment', '1 and 3 July 1863',
  'Jones (vol. 5, in the Pettigrew chapter): the 26th went into action on the 1st 850 strong and had for duty on the 3d only 230 men and not officers enough to command the companies.',
  [('850', 850, 'strong, 1 July'), ('230', 230, 'for duty, 3 July')], source='young')

# ----------------------------------------------------------------------------------------------------------------------------- Pettigrew's brigade (vol. 5, vol. 3, vol. 1)
N(PETTIGREW, '5', 'Pettigrew\'s Brigade about 3,000 strong', 1, 'taken_into_action', 'Pettigrew\'s brigade (four regiments present)', '1 July 1863',
  'Young (vol. 5): Pettigrew\'s brigade, about 3,000 strong, marched out in perfect alignment on 1 July.', [('3,000', 3000, 'strong')], source='young')
N(PETTIGREW, '5', 'On the morn- ing of 1 July it numbered 2,800 to 3,000', 1, 'taken_into_action', 'Pettigrew\'s brigade', '1 and 4 July 1863',
  'Young (vol. 5): on the morning of 1 July the brigade numbered 2,800 to 3,000, on the 4th 935.', [('2,800 to 3,000', None, 'numbered, 1 July'), ('935', 935, 'numbered, 4 July')], source='young')
N(['i11'], '5', 'Company C, of the Eleventh, lost tAvo officers killed and 34 out of 38 men', 1, 'casualties', 'Company C, 11th Regiment', '1 July 1863',
  'Young (vol. 5): Company C of the 11th lost two officers killed and 34 out of 38 men killed and wounded.', [('34', 34, 'killed and wounded'), ('38', 38, 'men, out of')], source='young')
N(PETTIGREW, '5', 'Pettigrew\'s Brigade was about 1,700 strong, and lost 1,100', 1, 'casualties', 'Pettigrew\'s brigade', '3 July 1863',
  'Ashe (vol. 5): Pettigrew\'s brigade about 1,700 strong lost 1,100, the greater part killed and wounded; Lane carried in 1,300 and lost 600 (the text layer prints GOO).',
  [('1,700', 1700, 'strong'), ('1,100', 1100, 'lost')], source='ashe')
N(['i47', 'i52'], '3', 'for the Forty-seventh and Fifty-second had abbut 1,300 men in line', 1, 'taken_into_action', 'the 47th and 52nd Regiments together', '1 July 1863',
  'Thorp/Rogers (47th chapter): the 47th and 52nd had about 1,300 men in line in both regiments.', [('1,300', 1300, 'men in line, both regiments')])
N(PETTIGREW, '3', 'General Pettigrew had in line of battle that morning nearer 3,000 soldiers', 1, 'taken_into_action', 'Pettigrew\'s brigade', '1 July 1863',
  'Thorp/Rogers (47th chapter): Pettigrew had in line that morning nearer 3,000 soldiers than 2,500.', [('3,000', 3000, 'soldiers'), ('2,500', 2500, 'soldiers')])
N(['i11', 'i26'], '3', 'Before night the Twentysixth and Eleventh', 1, 'casualties', 'the 26th and 11th Regiments', '1 July 1863',
  'Thorp/Rogers (47th chapter): before night the 26th and 11th had lost two-thirds of their numbers.', [('two-thirds', None, 'of their numbers lost')])
N(['i47'], '3', 'our regiment numbered 98 men for duty', 1, 'remaining_after', 'regiment', 'a few days after Falling Waters, July 1863',
  'Thorp/Rogers (47th chapter): when the regiment camped at Bunker Hill a few days after Falling Waters it numbered 98 men for duty.', [('98', 98, 'men for duty')])
N(['i11'], '1', 'the regiment lost fifty killed and one hundred and fifty-nine wounded', 1, 'casualties', 'regiment', '1 and 3 July 1863',
  'Martin/Outlaw (11th chapter): in the battles of the first and third days (held in reserve the second) the regiment lost fifty killed and one hundred and fifty-nine wounded.', [('fifty', 50, 'killed'), ('one hundred and fifty-nine', 159, 'wounded')])
N(['i11'], '1', 'Company A had crossed the Potomac with a hundred men', 1, 'strength_other', 'Company A', 'June and 3 July 1863',
  'Martin/Outlaw: Company A crossed the Potomac with a hundred men and came out of the charge on Cemetery Hill with a lieutenant and eight men.', [('a hundred', 100, 'men crossing the Potomac'), ('eight', 8, 'men after the charge')])
N(['i11'], '1', 'Company C went into that day\'s battl', 1, 'taken_into_action', 'Company C', '3 July 1863',
  'Martin/Outlaw: Company C went into the third day\'s battle with three officers and thirty-four men and lost two officers killed and thirty men killed or wounded.', [('three', 3, 'officers'), ('thir- ty-four', 34, 'men'), ('thirty', 30, 'men killed or wounded')])
N(['i52'], '3', 'The Adjutant of the regiment reported the losses', 1, 'casualties', 'regiment', '1 and 3 July 1863',
  'Robinson (52nd chapter): the adjutant reported the losses of the first and third days as 33 killed on the field, 114 wounded and 169 missing.', [('33', 33, 'killed'), ('114', 114, 'wounded'), ('169', 169, 'missing')])
