"""Close-out rows of shard tl-07 (T2-121 .. T2-178)."""
from tl58lib import *

D, I, P, G = 'documented', 'inferred', 'plausible-procedural', 'open gap'
S_, U_, C_, X_, K_ = 'supported', 'unsupported', 'conflict', 'contradicted', 'computed'
NR = 'shard audit entry not re-found as a quotation in this close-out'

ROW('T2-121', 'gap',
    'The only OR passage the shard found is Birney\'s order to withdraw to the Round Top ridge during the assault (Humphreys, p.533), which is not an order toward Little Round Top followed by a recall after 15:00; Hess is secondary.',
    [SUB('Humphreys\'s division is ordered toward Little Round Top, then recalled, after 15:00', G, U_, [], 'HESS only; not the same event as the withdrawal order of p.533')],
    remains=['an OR statement of the order and recall'], tier='open gap',
    searched=[SR(r'Humphreys', near=r'Round Top', win=300, what='Humphreys and Round Top, OR27 part 1', parts=(1,))])

ROW('T2-122', 'gap',
    'Smoke drift and dust: a plausible-procedural row inferred from the secondary wind direction S to SSW; no OR claim and no sector-by-sector smoke account found.',
    [SUB('Light south to south-southwest breeze drives smoke toward north-northeast; dust on dry roads; smoke pools in low ground', P, 'procedural', [], 'wind direction rests on secondary summaries of Jacobs')],
    tier='plausible-procedural')

ROW('T2-123', 'partially_supported',
    'Robertson was ordered to keep his right closed on Law\'s left (so he is left of Law, in the front line); Benning was informed about 2 or 3 p. m. that the division would attack; the second-line order (G. T. Anderson left, Benning right) and the strengths 2,600 and 2,800 are not quoted.',
    [SUB('Robertson: ordered to keep his right well closed on General Law\'s left and to let his left rest on the Emmitsburg pike', D, S_, ['ro_left']),
     SUB('Benning was informed by Hood about 2 or 3 p. m. on July 2 that the division would attack', D, S_, ['be_23']),
     SUB('Rear line G. T. Anderson left and Benning right; about 2,600 front and 2,800 second', I, U_, [], NR)],
    {'ro_left': ('OR27-2-R452', 'right well closed on Brigadiei\'-General Law\'s left, and to let my left rest on the Emmitsburg pike'),
     'be_23': ('OR27-2-R458', 'p. m. on July 2, ultimo, I was informed by')})

ROW('T2-124', 'partially_supported',
    'Taylor: about 4 p. m. he was ordered into position within 500 yards of the enemy\'s batteries and opened with his four Napoleons; the Wentz farm, the house "relatively unscathed" and the position north of the house are not in the report.',
    [SUB('Taylor: about 4 p. m. he was ordered into position within 500 yards of the enemy\'s batteries', D, S_, ['ta_500']),
     SUB('Taylor opened upon the batteries with his four Napoleons, firing canister and spherical case', D, S_, ['ta_nap']),
     SUB('Position north of the Wentz farm house; the house relatively unscathed', I, U_, [], 'SS-WENTZ not a local text')],
    {'ta_500': ('OR27-2-R465', 'About 4 p.m. I was ordered into position within 500 yards of the enemy\'s batteries'),
     'ta_nap': ('OR27-2-R465', 'I opened upon the batteries with my four Napoleons, firing canister and spherical case')})

ROW('T2-125', 'partially_supported',
    'Alexander: an engagement of a half hour against a force about 500 yards distant in the peach orchard; his battalion lost 19 killed, 114 wounded, 6 missing, 139 men; Cabell: directly in front, about 600 or 700 yards distant, a large number of batteries in the peach orchard, and his battalion was first to open fire; the 16:00 hour, Gilbert, the 36 guns and the 116 horses are not quoted.',
    [SUB('Alexander: a spirited engagement of a half hour with a heavy artillery and infantry force about 500 yards distant, in a peach orchard on the Emmitsburg pike', D, S_, ['al_500']),
     SUB('Alexander: battle of Gettysburg, July 2 and 3, killed 19, wounded 114, missing 6, total 139 men', D, S_, ['al_loss']),
     SUB('Cabell: batteries in a peach orchard about 600 or 700 yards distant, directly in front', D, S_, ['ca_700']),
     SUB('Cabell: the battalion, being first to open fire, received a concentrated fire', D, S_, ['ca_first']),
     SUB('Huger\'s four batteries (Moody, Parker, Taylor, Rhett under Gilbert) open about 16:00; 36 guns fire about 30 minutes; 116 horses lost', I, U_, [], NR)],
    {'al_500': ('OR27-2-R464', 'about 500 yards distant, in a peach orchard on the Emmitsburg pike'),
     'al_loss': ('OR27-2-R464', 'killed, 19 ; wounded, 114 ; missing. 6 ; total. 139 men'),
     'ca_700': ('OR27-2-R435', 'about 600 or 700 yards distant, were a large number of batteries, occupying a peach orchard'),
     'ca_first': ('OR27-2-R435', 'The battalion, being first to open fire, received for a short time a concentrated fire from the enemy\'s batteries')})

ROW('T2-126', 'partially_supported',
    'Sykes: "At 3 p. m. General Meade sent for me"; Barnes: General Warren of Meade\'s staff came up, riding rapidly from the left, and pointed out the elevation; that Meade ordered Sykes forward before 16:00 and sent Warren to Little Round Top is not stated in these passages.',
    [SUB('Sykes: at 3 p. m. General Meade sent for him, and while he and other corps commanders were conversing with Meade the enemy formed and opened the battle', D, S_, ['sy_3']),
     SUB('Barnes: General Warren, of the staff of General Meade, came up, riding rapidly from the left, and pointed out the position of the elevation', D, S_, ['ba_war']),
     SUB('Meade orders Sykes forward before 16:00 and sends Warren to Little Round Top', I, U_, [], 'the reports put Warren on the hill on his own approach; no order by Meade quoted')],
    {'sy_3': ('OR27-1-R187', 'At 3 p. m. General Meade sent for me, and while myself and other corps commanders were conversing with him'),
     'ba_war': ('OR27-1-R189', 'At the same time General Warren, of the staff of General Meade, came up, riding rapidly from the left')})

ROW('T2-127', 'partially_supported',
    'Lee: "About 4 p. m. Longstreet\'s batteries opened, and soon afterward Hood\'s division, on the extreme right, moved to the attack"; Hood and McLaws "deployed" and the 36 guns are not stated in that sentence; the Union half is T2-126.',
    [SUB('Lee: about 4 p. m. Longstreet\'s batteries opened and soon afterward Hood\'s division, on the extreme right, moved to the attack', D, S_, ['le_4pm']),
     SUB('Hood and McLaws are deployed and 36 guns open; Meade orders Sykes forward and sends Warren', I, U_, [], 'gun count and Union half not in this passage')],
    {'le_4pm': ('OR27-2-R426', 'About 4 p. m. Longstreet\'s batteries opened, and soon afterward Hood\'s division, on the extreme right, moved to the attack')})

ROW('T2-128', 'gap',
    'Hood\'s protest to Longstreet is a participant memoir (Advance and Retreat, 1880) read by the shard through a fetch summarizer; Longstreet\'s OR report does not describe it; no local text of the memoir.',
    [SUB('Hood asks three or four times to turn Round Top; Longstreet refuses', I, U_, [], 'memoir not a local text; verbatim re-check pending (shard audit)')],
    remains=['verbatim passage of the memoir'], tier='inferred')

ROW('T2-129', 'partially_supported',
    'Andrews: the battalion was under Major Latimer and Latimer moved it from its camp near Chambersburg on Jul 1; Johnson and Ewell give the opening at about 4 p. m. and about 5 p. m. (an OR-against-OR conflict); the gun count and the withdrawal are scenarios.',
    [SUB('Andrews: the battalion was under the immediate command of Major Latimer', D, S_, ['an_lat']),
     SUB('Ewell: about 5 p. m., when Longstreet\'s guns opened, Johnson commenced a cannonade from Andrews\' battalion', D, S_, ['ew_5']),
     SUB('Latimer\'s guns open about 16:00 (Johnson, per the shard) or about 17:00 (Ewell)', I, C_, [], 'Johnson\'s own 4 p. m. quotation not re-found here'),
     SUB('Gun count 14 / four batteries / about 20 guns; mortally wounded Latimer dies Aug 1; union lunettes protect the guns', I, U_, [], NR)],
    {'an_lat': ('OR27-2-R505', 'this battalion of artillery was under the immediate command of Maj. J. W. Latimer'),
     'ew_5': ('OR27-2-R467', 'about 5 p. m. , when General Longstreet\'s guns oi^ened. General Johnson commenced a heavy cannonade from Andrews\' battalion')},
    scenarios=[SCN('A', 'Opening at 16:00', 'Johnson OR27-2-R481 p.504 (not re-quoted)', I), SCN('B', 'Opening about 17:00 for about an hour', 'Ewell OR27-2-R467 p.446', D, ['ew_5'])])

ROW('T2-130', 'partially_supported',
    'McGilvery: about 3.30 p. m. on July 2 he received an order to report to General Sickles with one light 12-pounder and one rifled battery; Hancock: the First Division (Caldwell) was on the left of the corps; the order of the seed (five Reserve batteries sent to the Wheatfield Road by Hunt, Sykes\'s lead division) is not in these passages.',
    [SUB('McGilvery: at about 3.30 p. m. on July 2 he received an order to report to General Sickles with one light 12-pounder and one rifled battery', D, S_, ['mc_330']),
     SUB('Hancock\'s First Division, Caldwell commanding, was on the left of the Second Corps line', D, S_, ['ha_cal']),
     SUB('Hunt sends five Reserve batteries under McGilvery to the Wheatfield Road; Hancock sends a division; Sykes sends his lead division', I, U_, [], NR)],
    {'mc_330': ('OR27-1-R318', 'at about 3.30 p. m. on July 2, 1 received an order from yourself to report to General Sickles with one light 12-pounder and one rifled battery'),
     'ha_cal': ('OR27-1-R076', 'the First Division, Brigadier-General Caldwell commanding, was on the left')})

ROW('T2-131', 'partially_supported',
    'Phillips: on the morning of the 2d marched from Taneytown, came into park near the battle-field and at 4 o\'clock was ordered into action; the horses on the left piece were shot and the piece was brought off by hand; the 16:00 arrival at the Peach Orchard and the three usable guns are not quoted; the Napoleon versus 3-inch question is a scenario.',
    [SUB('Phillips: at 4 o\'clock he was ordered into action', D, S_, ['ph_4']),
     SUB('The horses on the left piece were shot before limbering and the piece was brought off by hand, leaving the limber', D, S_, ['ph_hand']),
     SUB('Only three guns usable east of Plum Run; five-horse limber team shot; battery type Napoleon (CWN) versus 3-inch rifle (SS)', I, C_, [], 'piece type not settled by the passages quoted')],
    {'ph_4': ('OR27-1-R319', 'At 4 o\'clock I was ordered into action'),
     'ph_hand': ('OR27-1-R319', 'The horses on the left piece were shot before limbering, and we were obliged to bring the piece off by hand, leaving the limber')})

ROW('T2-132', 'partially_supported',
    'Hart: Hunt ordered him to take a position on the left of the peach orchard and he came into battery as directed; the seed\'s 16 of 70 men hit and 25 horses differ from the report as the shard read it (3 killed, 5 wounded, 13 horses); the 17:30 charges against McGilvery\'s retirement at about 17:45 is a time conflict.',
    [SUB('Hart: General Hunt ordered him to take a position on the left of the peach orchard and he came into battery as directed', D, S_, ['ha_pos']),
     SUB('Casualties and horses: seed 16 of 70 men, 25 horses; Hart\'s report as the shard read it 3 killed, 5 wounded, 13 horses', I, C_, [], 'Hart\'s losses sentence not re-found as a quotation here'),
     SUB('Repels two charges about 17:30; McGilvery retires the batteries about 17:45', I, C_, [], 'McGilvery p.881-882 hour not re-found as a quotation here')],
    {'ha_pos': ('OR27-1-R321', 'who ordered me to take a position on the left of the peach orchard')},
    scenarios=[SCN('A', 'Seed values: 16 of 70 men hit, 25 horses', 'seed (W-15NY)', I), SCN('B', 'Hart OR27-1-R321 p.887 values: 3 killed, 5 wounded, 13 horses (shard reading)', 'Hart report', I)])

ROW('T2-133', 'gap',
    'Warren found only the signal station on Little Round Top and sent for help: Warren has no OR report of Gettysburg; the NPS seminar paper was not read in full; no local text carries the account.',
    [SUB('Warren finds only the signal station on Little Round Top, sees Confederate bayonets to the southwest and sends Roebling and others for help; sent about 16:00', G, U_, [], 'SS2, W-LRT; no clock time in the cited accounts')],
    remains=['Warren\'s own account (Battles and Leaders vol. 3 p.304, not local)'], tier='open gap')

ROW('T2-134', 'partially_supported',
    'Barnes: after Warren urged and Sykes yielded, "I immediately directed Colonel Vincent, commanding the Third Brigade, to proceed to that point with his brigade"; the story that Vincent intercepted the messenger and moved without Barnes\'s permission (W-LRT, NPS7) is a conflicting account carried as a scenario.',
    [SUB('Barnes: he immediately directed Colonel Vincent, commanding the Third Brigade, to proceed to that point with his brigade', D, S_, ['ba_vin']),
     SUB('Vincent intercepts Sykes\'s messenger to Barnes and moves his brigade without Barnes\'s permission', I, C_, [], 'W-LRT, NPS7; Vincent left no Gettysburg report')],
    {'ba_vin': ('OR27-1-R189', 'I immediately directed Colonel ■ Vincpnt, commanding the Third Brigade, to proceed to that point')},
    scenarios=[SCN('A', 'Vincent moves on his own, intercepting the messenger', 'seed (W-LRT, NPS7)', I), SCN('B', 'Barnes directs Vincent', 'Barnes OR27-1-R189 p.600', D, ['ba_vin'])])

ROW('T2-135', 'partially_supported',
    'Computed row (sun altitude 37.9 deg, azimuth 270 at 16:00 LMT on Jul 2) reproduces from the project ephemeris; astronomical horizon only.',
    [SUB('Sun altitude 37.867 deg, azimuth 269.84 deg at 16:00 LMT, Jul 2 (project ephemeris)', I, K_, [], 'COMPUTED; South Mountain not modelled')], tier='inferred')

ROW('T2-136', 'confirmed',
    'Chamberlain: somewhere near 4 p. m. a cannonade to the left and front was the signal for a rapid movement of the division; Colonel Vincent ordered the brigade to the left at the double-quick across Plum Run to the Granite Spur. (The seed note that Chamberlain gives no clock time for this move is wrong; only the later charge has none.)',
    [SUB('Somewhere near 4 p. m. a sharp cannonade to the left and front was the signal for a sudden and rapid movement of the whole division', D, S_, ['c_4pm']),
     SUB('Colonel Vincent, commanding the brigade, ordered the brigade to move to the left at the double-quick', D, S_, ['c_dq']),
     SUB('The brigade took a farm road crossing Plum Run to gain a rugged mountain spur called Granite Spur, or Little Round Top', D, S_, ['c_run'])],
    {'c_4pm': ('OR27-1-R196', 'Somewhere near 4 p. m. a sharp cannonade, at some distance to our left and front, was the signal for a sudden and rapid movement of our whole division'),
     'c_dq': ('OR27-1-R196', 'orders to move to the left at the double-quick'),
     'c_run': ('OR27-1-R196', 'we took a farm road crossing Plum Run in order to gain a rugged mountain spur called Granite Spur, or Little Round Top')})

ROW('T2-137', 'partially_supported',
    'Lee: about 4 p. m. Longstreet\'s batteries opened and soon afterward Hood\'s division moved to the attack; 16:00 versus 16:30 for Hood\'s order is carried as scenarios (the Union and Confederate clock offset is an inference not found).',
    [SUB('Lee: about 4 p. m. Longstreet\'s batteries opened, and soon afterward Hood\'s division, on the extreme right, moved to the attack', D, S_, ['le_4pm']),
     SUB('Hood orders the advance about 16:00 (SS2) or 16:30 (W-D2, NPS6)', I, C_, [], 'hour of the order not in Lee\'s sentence')],
    {'le_4pm': ('OR27-2-R426', 'About 4 p. m. Longstreet\'s batteries opened, and soon afterward Hood\'s division, on the extreme right, moved to the attack')},
    scenarios=[SCN('A', 'About 16:00', 'SS2, Devil\'s Den article', I), SCN('B', 'About 16:30', 'W-D2, NPS6', I)])

ROW('T2-138', 'partially_supported',
    'Stoughton: on the morning of Jul 2 the regiment was placed in line on the extreme left of the Third Corps; the skirmish at Slyder\'s Lane at about 16:30 slowing Law\'s advance is not in the quoted passage.',
    [SUB('Stoughton: on the morning of July 2 he was placed in line on the extreme left of the Third Corps', D, S_, ['st_left']),
     SUB('About 16:30 the sharpshooters\' skirmish at the Slyder farm slows Law and they withdraw east toward the Round Tops', I, U_, [], 'ABT-DL; later passage of Stoughton not re-found')],
    {'st_left': ('OR27-1-R151', 'On the morning of July 2, 1 was placed in line on the extreme left of the Third Corps')})

ROW('T2-139', 'partially_supported',
    'Robertson: ordered to keep his right well closed on Law\'s left and his left on the Emmitsburg pike; the regiment split (44th and 48th Alabama to Devil\'s Den, five regiments to the Round Tops) is Wikipedia\'s and is not documented here.',
    [SUB('Robertson was ordered to keep his right closed on Law\'s left, with his left on the Emmitsburg pike', D, S_, ['ro_left']),
     SUB('Law\'s 44th and 48th Alabama go toward Devil\'s Den, the other five regiments toward the Round Tops', I, U_, [], 'Wikipedia split; the 48th\'s target (Little Round Top versus Devil\'s Den) is a conflict not resolved by the OR')],
    {'ro_left': ('OR27-2-R452', 'right well closed on Brigadiei\'-General Law\'s left, and to let my left rest on the Emmitsburg pike')}, tier='inferred')

ROW('T2-140', 'partially_supported',
    'Ward: not to fire at a longer distance than 200 yards, the enemy then within 200 yards; Smith: three 10-pounder Parrott guns were lost; the 1st Texas took the crest and three guns (Robertson p.405) was not re-quoted; the pre-existing stone fence is not an OR statement.',
    [SUB('Ward: to those on the left, not to fire at a longer distance than 200 yards; the enemy had approached to within 200 yards', D, S_, ['wa_200']),
     SUB('Smith: three 10-pounder Parrott guns and gun-carriages were lost', D, S_, ['sm_lost']),
     SUB('1st Texas takes the crest and three guns after heavy fighting over an hour; the stone fence on Houck\'s Ridge is pre-existing', I, U_, [], NR)],
    {'wa_200': ('OR27-1-R135', 'not to fire at a longer distance than 200 yards'),
     'sm_lost': ('OR27-1-R184', 'Three 10-pounder Parrott guns and gun-carriages (supposed to have been taken from the field by the Twelfth Corps) were lost')})

ROW('T2-141', 'partially_supported',
    'Longstreet: General Hood was wounded soon after getting under fire; the 16:50 estimate (Phifer) and "Law, next in command, is not told until late" are not in the report.',
    [SUB('Longstreet: General Hood received a severe wound soon after getting under fire, and was obliged to leave the field', D, S_, ['lo_hood']),
     SUB('Hood is wounded about 20 minutes into the advance, about 16:50; Law is not told until late', I, U_, [], 'W-D2, PHIF, NPS6; not quoted')],
    {'lo_hood': ('OR27-2-R430', 'General Hood received a severe wound soon after getting under fire, and was obliged to leave the field')})

ROW('T2-142', 'partially_supported',
    'Chamberlain: Colonel Vincent ordered the brigade to move to the left; the order of the regiments and strengths (16th Michigan 263 men), the 10 or 15 minutes before the Confederates arrive and the absence of works are secondary or not quoted.',
    [SUB('Colonel Vincent, commanding the brigade, ordered the brigade to move to the left at the double-quick toward the Granite Spur', D, S_, ['c_dq']),
     SUB('Brigade order west to east: 16th Michigan (263 men), 44th New York, 83rd Pennsylvania, 20th Maine; takes position 10 or 15 minutes before the Confederates arrive', I, U_, [], 'W-LRT, PHIF, SS2; Rice\'s and Chamberlain\'s order not quoted')],
    {'c_dq': ('OR27-1-R196', 'orders to move to the left at the double-quick')})

ROW('T2-143', 'partially_supported',
    'Ward\'s report credits the First and Second U. S. Sharpshooters and the Eighty-sixth and One hundred and twenty-fourth New York; the loss of the colonel and major of the 124th is in the report as the shard read it and was not isolated here; the counterattack across a field bounded by a low stone fence is secondary.',
    [SUB('Ward names the One hundred and twenty-fourth New York Volunteers among the regiments of his brigade that earned the title to wear the Kearny patch', D, S_, ['wa_124']),
     SUB('124th New York counterattacks from above Devil\'s Den across a field bounded by a low stone fence; both leaders killed (Ellis, Cromwell)', I, U_, [], NR)],
    {'wa_124': ('OR27-1-R135', 'The First and Second U. S. Sharpshooters and the Eighty-sixth and One hundred and twenty-fourth New York Volunteers')})

ROW('T2-144', 'partially_supported',
    'Scruggs (4th Alabama): after a rapid and fatiguing march of about 24 miles the regiment arrived at the scene of action at 3.30 p. m.; the first volley, the brigade\'s regiment list and the attack hour about 16:30 are not quoted.',
    [SUB('Scruggs: after a rapid and fatiguing march of about 24 miles, arrived at the scene of action at 3.30 p. m.', D, S_, ['sc_24']),
     SUB('Law\'s brigade (4th, 15th, 47th Alabama and 4th, 5th Texas) first attacks about 16:30-17:00 and is thrown back by the first volley', I, U_, [], NR)],
    {'sc_24': ('OR27-2-R443', 'After a rapid and fatiguing march of about 24 miles, arrived at the scene of action at 3.30 p. m.')})

ROW('T2-145', 'partially_supported',
    'Caldwell: "between 4 and 6 o\'clock, I received orders to report with my command to General Sykes" (OCR digits); the hour range covers both seed values (sent about 16:00 or about 18:00).',
    [SUB('Caldwell: between 4 and 6 o\'clock he received orders to report with his command to General Sykes', D, S_, ['ca_46'], 'OCR digits 4 and 6'),
     SUB('Hancock with Meade sends Caldwell toward the left, about 16:00 (SS2) or about 18:00', I, C_, [], 'both values lie inside the printed range')],
    {'ca_46': ('OR27-1-R077', 'between 4 and 6 o\'clock, I received orders to report with nay command to General Sykes')},
    scenarios=[SCN('A', 'Sent about 16:00', 'SS2', I), SCN('B', 'Sent about 18:00', 'seed (OR-based row)', I)])

ROW('T2-146', 'partially_supported',
    'Kilpatrick: "Was attacked by Stuart, Hampton, and Lee at sundown near Hunterstown"; Hampton: the brigade was stationed on July 2 at Hunterstown, 5 miles to the east of Gettysburg; the seed\'s 16:30 start (SS2) conflicts with sundown (about 19:30) and the charge details are secondary.',
    [SUB('Kilpatrick: was attacked by Stuart, Hampton, and Lee at sundown near Hunterstown', D, S_, ['ki_sun']),
     SUB('Hampton: the brigade was stationed on July 2 at Hunterstown, 5 miles to the east of Gettysburg', D, S_, ['ha_hun']),
     SUB('The Hunterstown fight begins about 16:30; details of Custer\'s charge, Churchill, Delony, Pennington\'s battery', I, U_, [], 'SS2, W-HUN, HAMP, CWN-STU, W-ECF')],
    {'ki_sun': ('OR27-1-R359', 'Was attacked by Stuart, Hampton, and Lee at sundown near Hunterstown'),
     'ha_hun': ('OR27-2-R567', 'The brigade was stationed on July 2, at Hunterstown, 5 miles to the east of Gettysburg')},
    scenarios=[SCN('A', 'Fight begins about 16:30', 'seed (SS2)', I), SCN('B', 'At sundown (about 19:30 LMT)', 'Kilpatrick OR27-1-R359 p.992', D, ['ki_sun'])])

ROW('T2-147', 'partially_supported',
    'Ward: to those on the left, not to fire at a longer distance than 200 yards, and the enemy then within 200 yards; the generalisation that 200 yards is the average engagement range at Gettysburg is the secondary source\'s, not the OR\'s.',
    [SUB('Ward ordered those on the left not to fire at a longer distance than 200 yards', D, S_, ['wa_200']),
     SUB('200 yards is the average engagement range at Gettysburg', I, U_, [], 'American Rifleman; not primary')],
    {'wa_200': ('OR27-1-R135', 'not to fire at a longer distance than 200 yards')})

ROW('T2-148', 'gap',
    'The OR has no Spencer-rifle statement for the 6th Michigan at Hunterstown (claim check r1: 23 hits, all personal names); row sources (American Rifleman, Wikipedia) do not qualify.',
    [SUB('The 5th Michigan and part of the 6th carried Spencer rifles; arms at Hunterstown not stated', G, U_, [], 'no primary retrieved')],
    remains=['a primary source for the Spencer issue and date'], tier='open gap',
    searched=[SR(r'Spencer', near=r'(rifle|carbine|repeating)', win=150, what='Spencer rifle or carbine, OR27 all parts', parts=(1, 2, 3))])

ROW('T2-149', 'partially_supported',
    'Garrard: Warren was led to the left up on Round Top ridge and Hazlett\'s battery ascended the ridge in rear of the 140th New York; the sharpshooters\' fire from the rocks near Devil\'s Den and the victims Weed and Hazlett are partly quoted from the shard only.',
    [SUB('Garrard: General Warren was led to the left, up on what is known as Round Top ridge; Hazlett\'s battery ascended the ridge immediately in rear of the regiment', D, S_, ['ga_haz']),
     SUB('Confederate sharpshooters in the rocks near Devil\'s Den fire on Little Round Top; Weed and Hazlett are among the victims; the fire continues into the evening', I, U_, [], 'Garrard p.652 and Hunt p.237 sentences not isolated here; W-DEN')],
    {'ga_haz': ('OR27-1-R217', 'was led to the left, up on what is known as Round Top ridge')})

ROW('T2-150', 'partially_supported',
    'Egan: the 40th New York was sent to a ravine bounded on the left by high hills in front of Winslow\'s battery; the seed outcome (Benning\'s regiments driven back to Devil\'s Den) is overstated according to the shard\'s reading.',
    [SUB('Egan: the regiment was moved across a wheat field in front of Captain Winslow\'s battery to a position in a ravine bounded on the left by high hills and on the right by a gentle ridge', D, S_, ['eg_rav']),
     SUB('Benning\'s 2nd and 17th Georgia advance down the Plum Run valley; Smith\'s two guns canister; the 40th NY drives them back to Devil\'s Den', I, U_, [], 'outcome overstated: the OR has the 40th forced to withdraw after the 4th Maine')],
    {'eg_rav': ('OR27-1-R156', 'a ravine bounded on the left by high hills and upon the right by a gentle ridge')})

ROW('T2-151', 'partially_supported',
    'Taylor (20th Indiana): about 4 p. m. the line was attacked by the enemy; the heavy losses (28 killed, 109 wounded), the colonel killed and the 99th Pennsylvania, 40th New York and 6th New Jersey movements are read by the shard but not isolated here; the 4th Maine specifics are a gap.',
    [SUB('Taylor: about 4 p. m. the line of the 20th Indiana was attacked by the enemy', D, S_, ['ta_4pm']),
     SUB('Over half lost in 30 minutes, colonel killed; 99th Pennsylvania reinforces; 40th NY and 6th NJ into the Plum Run valley; 4th Maine specifics', I, U_, [], NR)],
    {'ta_4pm': ('OR27-1-R142', 'About 4 p. m. our line was attacked by the enemy')}, remains=['4th Maine specifics'])

ROW('T2-152', 'partially_supported',
    'Longstreet: Brig. Gen. G. T. Anderson was severely wounded and obliged to leave the field; De Trobriand extended his right with the Seventeenth Maine across a wheatfield to fill a gap; that Anderson hit the gap by Trobriand\'s brigade and was repulsed is not stated.',
    [SUB('Longstreet: G. T. Anderson, of Hood\'s division, was severely wounded and obliged to leave the field', D, S_, ['lo_and']),
     SUB('De Trobriand extended his right, moving the Seventeenth Maine across a wheatfield to fill a gap', D, S_, ['dt_17']),
     SUB('Anderson\'s brigade hits the gap by Trobriand\'s brigade and is repulsed', I, U_, [], 'not stated in these passages')],
    {'lo_and': ('OR27-2-R430', 'Brig. Gen. G. T. Anderson, of his division, was also severely wounded, and obliged to leave the field'),
     'dt_17': ('OR27-1-R152', 'I extended my right by moving the Seventeenth Maine Volunteers, Lieutenant-Colonel Merrill commanding, across a wheatfield')})

ROW('T2-153', 'partially_supported',
    'Hunt: the artillery of the Fifth Corps arrived between 4 and 5 p. m., Hazlett\'s (D, Fifth United States, six 10-pounders) among them; the 16:30 march, the opening at 17:00 or 17:45 and the guns hauled up the slope are scenarios and monument claims.',
    [SUB('Hunt: the artillery of the Fifth Corps arrived on the field between 4 and 5 p. m.; Hazlett\'s (D, Fifth United States, six 10-pounders)', D, S_, ['hu_haz']),
     SUB('Battery opening time 17:00 (SS2) or 17:45 (monument); guns four or six; no epaulement', I, C_, [], 'monument and secondary sources')],
    {'hu_haz': ('OR27-1-R028', 'The artillery of the Fifth Corps arrived on the field between 4 and 5 p. m.')},
    scenarios=[SCN('A', 'Opens about 17:00', 'SS2', I), SCN('B', 'Opens about 17:45', 'monument (SS-HAZ)', I)])

ROW('T2-154', 'gap',
    'Sykes: Weed\'s brigade followed Vincent and was posted under Warren; the uniform claims (140th NY regulation blue, 146th NY Zouave style) rest on Wikipedia and the OR has no uniform description (claim check q1): downgraded to a gap.',
    [SUB('Warren brings Weed\'s brigade, the 140th NY first; Warren is nicked by a sharpshooter\'s bullet', D, U_, [], 'Sykes p.593 and Garrard p.652 entries not isolated as quotations here'),
     SUB('The 140th NY wears regulation blue; the 146th NY wore Zouave style from June 3, 1863', G, U_, [], 'W-140NY, W-146NY: Wikipedia only')],
    remains=['uniform sources'], tier='inferred')

ROW('T2-155', 'partially_supported',
    'De Trobriand: extended his right with the Seventeenth Maine across a wheatfield to fill a gap; Tilton\'s brigade advanced to the front at 4.30 p. m.; the Seventeenth Maine\'s stone wall as a pre-existing wall and Sweitzer\'s reinforcement are not quoted.',
    [SUB('De Trobriand moved the Seventeenth Maine across a wheatfield to fill a gap on his right', D, S_, ['dt_17']),
     SUB('Tilton: at 4.30 p. m. on July 2 the brigade advanced to the front and was placed by order of General Barnes', D, S_, ['ti_430']),
     SUB('The 17th Maine stands behind a pre-existing stone wall; Winslow\'s battery; two regiments of Burling\'s brigade; Sweitzer reinforces', I, U_, [], NR)],
    {'dt_17': ('OR27-1-R152', 'I extended my right by moving the Seventeenth Maine Volunteers, Lieutenant-Colonel Merrill commanding, across a wheatfield'),
     'ti_430': ('OR27-1-R192', 'At 4.30 p. m. on July 2, the brigade, under my command, advanced to the front, and was placed, by order of General Ba')})

ROW('T2-156', 'partially_supported',
    'Kershaw: "about 4 o\'clock, when I received orders to advance, I moved at once"; the seed has the order at about 17:00 and Longstreet ordering McLaws to send Kershaw then Barksdale; Barksdale\'s and Wofford\'s step-off minutes remain a gap.',
    [SUB('Kershaw: about 4 o\'clock, when he received orders to advance, he moved at once', D, S_, ['k_4']),
     SUB('Step-off minutes of Barksdale and Wofford', G, U_, [], 'not in the OR passages read')],
    {'k_4': ('OR27-2-R432', 'about 4 o\'clock, when "I received orders to advance, I moved at once in this direction')},
    scenarios=[SCN('A', 'About 17:00', 'seed (W-D2)', I), SCN('B', 'About 16:00', 'Kershaw OR27-2-R432 p.368', D, ['k_4'])])

ROW('T2-157', 'partially_supported',
    'Kershaw: the order given only to Colonel Aiken was extended along the left of the line and checked its advance; McGilvery: about 5 o\'clock a heavy column of rebel infantry appeared in a grain-field about 850 yards in front; that McGilvery\'s guns hit the flank is an inference.',
    [SUB('Kershaw: an order given only to Colonel Aiken was extended along the left of the line, and checked its advance', D, S_, ['k_aik']),
     SUB('McGilvery: at about 5 o\'clock a heavy column of rebel infantry appeared in a grain-field about 850 yards in front', D, S_, ['mc_grain']),
     SUB('McGilvery\'s guns hit Kershaw\'s flank', I, U_, [], 'inference')],
    {'k_aik': ('OR27-2-R432', 'was extended alongtheleft of the line, and checked its advance'),
     'mc_grain': ('OR27-1-R318', 'At about 5 o\'clock a heavy column of rebel infantry made its appearance in a grain-field about 850 yards in front')})

ROW('T2-158', 'partially_supported',
    'Walker: the Fifth Regiment was deployed as skirmishers and advanced toward the town, the remainder of the brigade following (OCR hour uncertain); D. M. Gregg: an increased force of dismounted skirmishers was placed to the right and left of the turnpike; the 2nd Virginia versus the 10th New York, McIntosh at the stone wall and the 22:00 withdrawal are secondary.',
    [SUB('Walker: the Fifth Regiment, Lieutenant-Colonel Williams commanding, was deployed as skirmishers and advanced in the direction of the town', D, S_, ['wal_adv'], 'hour not quoted; OCR-uncertain'),
     SUB('Gregg: an increased force of dismounted skirmishers was placed to the right and left of the turnpike', D, S_, ['gr_dis']),
     SUB('2nd Virginia drives back the 10th NY; McIntosh dismounts at a stone wall; 1st NJ revolvers; Gregg withdraws about 22:00', I, U_, [], 'SS2D, SWB2, SWB3; McIntosh\'s report not in the index')],
    {'wal_adv': ('OR27-2-R488', 'advanced in the direction of the town as rapidly as possible'),
     'gr_dis': ('OR27-1-R344', 'An increased force of dismounted skirmishers was placed to the right and left of the turnpike')})

ROW('T2-159', 'partially_supported',
    'Meade: the Sixth Corps arrived at 3 p. m.; Wright: about 4 p. m.; Sedgwick: brigades in action about 5 p. m.; the seed\'s Stone Sentinels 17:00 and the 14:00 head-of-column are carried as scenarios without a default.',
    [SUB('Meade: at 3 p. m. the Sixth Corps arrived, after a march of 33 miles', D, S_, ['m_3pm']),
     SUB('Wright: arrived about 4 p. m.', D, S_, ['w_4pm'])],
    {'m_3pm': ('OR27-1-R006', 'At 3 p. m. the Sixth Corps arrived, after a march of 33 miles'), 'w_4pm': ('OR27-1-R224', 'arrived about 4 p. m')},
    scenarios=[SCN('A', 'Head about 14:00', 'T2-108 seed', I), SCN('B', '15:00', 'Meade OR27-1-R006 p.116', D, ['m_3pm']), SCN('C', 'About 16:00', 'Wright OR27-1-R224 p.665', D, ['w_4pm']), SCN('D', 'About 17:00 at Rock Creek', 'seed (SS2)', I)])

ROW('T2-160', 'partially_supported',
    'Pierce (3rd Michigan): the colonel was ordered to deploy his regiment as skirmishers and moved by the right flank to the left of the peach orchard, which the enemy held; the clash with Kershaw\'s brigade at 17:00-17:30 is not quoted.',
    [SUB('Pierce\'s colonel was ordered to deploy the regiment as skirmishers and moved it by the right flank to the left of the peach orchard', D, S_, ['pi_skm']),
     SUB('3rd Michigan fights Kershaw\'s brigade about 17:00-17:30', I, U_, [], 'W-D2; time and opponent not in the quoted passage')],
    {'pi_skm': ('OR27-1-R154', 'colonel was then ordered to deploy his regiment as skirmishers')})

ROW('T2-161', 'partially_supported',
    'Kershaw: "about 4 o\'clock" he advanced and a stony hill covered with heavy timber lay beyond the morass; the seed\'s 17:20 and Semmes\'s regiments sheltering in the Rose barn are not in the report; the barn\'s 1910 fire is secondary.',
    [SUB('Kershaw: about 4 o\'clock he received orders to advance and moved toward the stony hill', D, S_, ['k_4']),
     SUB('Beyond the morass some 200 yards was a stony hill covered with heavy timber and thick undergrowth', D, S_, ['k_hill']),
     SUB('Kershaw assaults Stony Hill about 17:20; Semmes\'s regiments shelter in the Rose barn; barn survives to its 1910 fire', I, C_, [], 'weak EPP and Women History Blog source; barn fire secondary')],
    {'k_4': ('OR27-2-R432', 'about 4 o\'clock, when "I received orders to advance, I moved at once in this direction'),
     'k_hill': ('OR27-2-R432', 'stony hill, covered with heavy timber and thick undeigrowth')},
    scenarios=[SCN('A', 'About 17:20', 'seed', I), SCN('B', 'About 16:00', 'Kershaw OR27-2-R432 p.368', D, ['k_4'])])

ROW('T2-162', 'partially_supported',
    'Barnes\'s division is Tilton\'s, Sweitzer\'s and Vincent\'s brigades (Barnes); De Trobriand: his orders failed to hold the line when Fifth Corps troops fell back; the withdrawal of Tilton and Sweitzer about 300 yards without consulting Birney about 17:30 is not quoted.',
    [SUB('Barnes\'s division: Colonels Tilton, Sweitzer and Vincent of the First, Second and Third Brigades', D, S_, ['ba_div']),
     SUB('Barnes withdraws Tilton and Sweitzer about 300 yards without consulting Birney; Trobriand and the 17th Maine must follow', I, U_, [], 'sentences of Barnes p.601, Tilton p.608 and De Trobriand not isolated here')],
    {'ba_div': ('OR27-1-R189', 'under the command of Colonels Tilton, Sweitzer, and Vincent, of the First, Second, and Third Brigades')})

ROW('T2-163', 'partially_supported',
    'Kershaw: "a large wheat-field was seen" in rear of which was the enemy\'s main line; Caldwell moved to the right of the Fifth Corps to check the enemy; the 17:30 counterattack and the standing wheat height 3.5-4.5 ft (forum, inferred) are not documented.',
    [SUB('Kershaw: looking down the road from the stone house, a large wheat-field was seen, and in rear of it the enemy\'s main line', D, S_, ['k_wheat']),
     SUB('Anderson, Kershaw, Semmes drive the defenders from the Wheatfield; Caldwell arrives and counterattacks; wheat 3.5-4.5 ft', I, U_, [], 'W-D2, CWT-WHEAT (a forum); wheat height a gap, plausible-procedural only')],
    {'k_wheat': ('OR27-2-R432', 'large wheat-field was seen. In rear of the wheat-field, and between that and the mountain, was the enemy\'s main line of battle')}, tier='inferred')

ROW('T2-164', 'confirmed',
    'Wheeler: at about 5.30 p. m. his ammunition became exhausted and another battery was sent to relieve him; his battery was on Cemetery Hill.',
    [SUB('At about 5.30 p. m. Wheeler\'s ammunition became exhausted and he was sent another battery to relieve him', D, S_, ['w_530', 'w_rel']),
     SUB('Wheeler\'s battery had been assigned a position on Cemetery Hill on the left wing of the corps batteries', D, S_, ['w_hill'])],
    {'w_530': ('OR27-1-R266', 'At about 5.30 p. m. my ammunition became exhausted'),
     'w_rel': ('OR27-1-R266', 'and you sent another battery to relieve me'),
     'w_hill': ('OR27-1-R266', 'was assigned by you a position on Cemetery Hill, being on the left wing of the batteries of the corps')})

ROW('T2-165', 'partially_supported',
    'Chamberlain: detached Company B (Captain Morrill) as a line of skirmishers across the hollow on his left; the 386 all told with 358 guns, 400 prisoners and the 12-15 sharpshooters are read by the shard but only the Morrill sentence is isolated here; the 17:30 clock time is single-sourced (SS2) and Chamberlain gives none.',
    [SUB('Chamberlain: he immediately detached Company B, Captain Morrill commanding, to extend from his left flank across the hollow as a line of skirmishers', D, S_, ['c_mor']),
     SUB('Strength 386 (358 guns); 400 prisoners plus 25 on the night advance; 12-15 US Sharpshooters', I, U_, [], 'Chamberlain p.624-626 sentences not isolated here'),
     SUB('The charge at about 17:30', I, U_, [], 'SS2; B.2.5 range 17:30-18:15; Chamberlain gives no clock time')],
    {'c_mor': ('OR27-1-R196', 'I immediately detached Company B, Captain Morrill commanding, to extend from my left flank across this hollow as a line of skirmishers')})

ROW('T2-166', 'partially_supported',
    'Sykes: Vincent\'s brigade had seized the rocky height, closely followed by Weed\'s brigade; the 16th Michigan\'s flank collapse, Vincent mortally wounded and Rice in command, and O\'Rorke killed are in the reports of Rice, Sykes and Welch as the shard read them and were not isolated here.',
    [SUB('Sykes: Vincent\'s brigade of the division had seized the rocky height, closely followed by Weed\'s brigade', D, S_, ['sy_vin']),
     SUB('16th Michigan\'s flank collapses; Vincent mortally wounded (dies July 7); Rice takes command; 140th NY counterattacks, O\'Rorke killed', I, U_, [], NR)],
    {'sy_vin': ('OR27-1-R187', 'Vincent\'s brigade, of this division, had seized the rocky height, closely followed by Weed\'s brigade')})

ROW('T2-167', 'partially_supported',
    'Kershaw: at the schoolhouse on the road across the Emmitsburg road by the peach orchard the lieutenant-general directed him to advance; Carr: the Collis Zouaves of the First Division gave way; the Barksdale-Wofford attack, Bucklyn\'s battery, Graham\'s capture and the 17:30 hour are not quoted.',
    [SUB('Kershaw: arriving at the school-house on the road crossing the Emmitsburg road by the peach orchard, then in possession of the enemy, the lieutenant-general commanding directed him to advance his brigade', D, S_, ['k_sch']),
     SUB('Carr: his left held until the regiment on his left (the Collis Zouaves, First Division) gave way', D, S_, ['ca_col']),
     SUB('Barksdale\'s and Wofford\'s attack on the salient at about 17:30; the 21st Mississippi; Bucklyn\'s battery overrun; Graham captured; 1,600 men', I, U_, [], 'Kershaw puts Barksdale shortly after about 16:00; Graham\'s report not in the index')],
    {'k_sch': ('OR27-2-R432', 'Arriving at the school-house, on the road leading across the Emmitsburg road by the peach orchard, then in possession of the enemy'),
     'ca_col': ('OR27-1-R160', 'the regiment on my left (the Collis Zouaves, of the First Division) gave way')})

ROW('T2-168', 'partially_supported',
    'Alexander: just before the enemy ceased his fire he had "ordered up" his two remaining batteries (Jordan\'s and Woolfolk\'s); that six batteries moved forward to the Emmitsburg road about 18:00 is not in this passage (hour inferred 17:00-18:00).',
    [SUB('Alexander ordered up his two remaining batteries, Jordan\'s and Woolfolk\'s, just before the enemy ceased his fire', D, S_, ['al_two']),
     SUB('Six batteries moved forward to the Emmitsburg road about 18:00', I, U_, [], 'hour inferred; count not in the passage')],
    {'al_two': ('OR27-2-R464', 'ordered up my two remaining batteries')})

ROW('T2-169', 'partially_supported',
    'McGilvery: "Captain Bigelow retired by prolonge, firing canister"; Williams\'s recapture of the guns is read by the shard but not isolated; the casualty and horse counts, second position about 18:00-18:30 and the Trostle barn damage are not quoted.',
    [SUB('McGilvery: Captain Bigelow retired by prolonge, firing canister', D, S_, ['mc_pro']),
     SUB('Fires 16:30-18:00; casualties 8 killed, 18 wounded, 2 missing, 65 horses; second position near the Trostle house 18:00-18:30; overrun by the 21st Mississippi; Trostle barn marks', I, U_, [], 'CWE-9MA, CWN-9MA, SS-TROSTLE, NPS9: not local')],
    {'mc_pro': ('OR27-1-R318', 'Captain Bigelow retired by prolonge, firing canister')}, tier='inferred')

ROW('T2-170', 'partially_supported',
    'Birney: "At 6 o\'clock I found Major-General Sickles seriously wounded, and, at his request, took command of the troops"; the seed\'s 17:30-18:00 wounding time, the cannonball versus knee-shot and the Hancock command are conflicts carried without a default.',
    [SUB('Birney: at 6 o\'clock he found Major-General Sickles seriously wounded and at his request took command of the troops', D, S_, ['bi_6']),
     SUB('Sickles wounded in the right leg (cannonball per Wikipedia; right knee per NPS); leg amputated that night', I, C_, [], 'W-D2, NPS9 not local; time 17:30/18:00/19:00 and Birney versus Hancock in command')],
    {'bi_6': ('OR27-1-R133', 'At 6 o\'clock I found Major-General Sickles seriously wounded, and, at his request, took command of the troops')},
    scenarios=[SCN('A', 'Wounded about 17:30', 'W-D2', I), SCN('B', 'Wounded about 18:00; Birney in command at 18:00', 'Birney OR27-1-R133 p.483', D, ['bi_6']), SCN('C', 'About 19:00 (pro-Sickles extract)', 'OR27-1-R006 p.133 (not re-quoted)', I)])

ROW('T2-171', 'partially_supported',
    'Caldwell: Brigadier-General Zook and Colonel Cross, of the Fifth New Hampshire, fell mortally wounded; Longstreet: Barksdale mortally wounded and Semmes severely wounded; the hospital burial details and the wheat are secondary.',
    [SUB('Caldwell: two of his brigade commanders, Brigadier-General Zook and Colonel Cross, of the Fifth New Hampshire Volunteers, fell mortally wounded', D, S_, ['ca_zook']),
     SUB('Longstreet: General McLaws lost two of his brigadiers, Barksdale mortally wounded and Semmes severely wounded', D, S_, ['lo_bs']),
     SUB('Zook and Kelly drive Kershaw off Stony Hill; Cross regains the east end; Zook examined and Cross died at the Granite Schoolhouse hospital', I, U_, [], 'ABT-WF1, ABT-WF3, HN-SPG not local')],
    {'ca_zook': ('OR27-1-R077', 'Brigadier-General Zook and Colonel Cross, of the Fifth New Hampshire Volunteers, fell, mortally wounded'),
     'lo_bs': ('OR27-2-R430', 'General McLaws lost two of his brigadiers (General Barksdale mortally wounded, and General Semmes severely wounded')})

ROW('T2-172', 'partially_supported',
    'Humphreys: "the loss in killed, wounded, and missing of my division, 5,000 strong, was 2,088" (41.8%, not about 45%); Lang: heavy fire opened upon Wilcox\'s brigade and he was ordered to his assistance; the 18:00 hour and the retreat to Cemetery Ridge are not quoted.',
    [SUB('Humphreys: the loss of his division, 5,000 strong, was 2,088', D, S_, ['hu_2088']),
     SUB('Lang: an advanced body of the enemy opened a heavy fire upon General Wilcox\'s brigade and he received orders to move to his assistance', D, S_, ['la_wil']),
     SUB('Humphreys loses about 45% and retreats to Cemetery Ridge; Wilcox and Lang hit him about 18:00', I, C_, [], '2,088 of 5,000 is 41.8%; Wright puts the advance about 17:00')],
    {'hu_2088': ('OR27-1-R158', 'my division, 5,000 strong, was 2,088'),
     'la_wil': ('OR27-2-R545', 'opened a heavy fire of musketry upon General Wilcox\'s brigade')})

ROW('T2-173', 'partially_supported',
    'Hancock: the brigade (Third Brigade, Third Division, under Colonel Willard) was led toward the left; Longstreet: Barksdale mortally wounded; the Hummelbaugh hospital and the date of Barksdale\'s death are secondary (July 2 versus July 3).',
    [SUB('Hancock: he led the brigade (Third Brigade, Third Division, Colonel Willard) toward the left of the original line of the Third Corps', D, S_, ['ha_wil']),
     SUB('Longstreet: General Barksdale mortally wounded', D, S_, ['lo_bs']),
     SUB('Willard drives Barksdale back; Willard killed; Barksdale dies at the Hummelbaugh farm', I, U_, [], 'W-D2, NPS10, SS-HUM; death date Jul 2 versus Jul 3 conflicts')],
    {'ha_wil': ('OR27-1-R076', 'the brigade (Third Brigade, Third Division, under Colonel Willard) intended for General Birney'),
     'lo_bs': ('OR27-2-R430', 'General McLaws lost two of his brigadiers (General Barksdale mortally wounded, and General Semmes severely wounded')})

ROW('T2-174', 'corrected',
    'Stannard\'s brigade joined the First Corps on the evening of Jul 1 (Stannard) and reported to Doubleday about twilight of Jul 1; the three regiments (13th, 14th, 16th) that marched with Sickles\'s troops were placed in line with them on the night of Jul 1 and joined Doubleday the next morning, Jul 2. The seed\'s "about 18:00" on Jul 2 matches neither report.',
    [SUB('Stannard: the Second Vermont Brigade joined the First Corps at Gettysburg on the evening of July 1', D, S_, ['st_eve']),
     SUB('Doubleday: a third brigade of Vermont troops, under General Stannard, also reported to him about twilight of the same day (Jul 1)', D, S_, ['do_twi']),
     SUB('Doubleday: the regiments that had marched with General Sickles\' troops were placed in the same line with them on the night of the 1st and joined him the next morning', D, S_, ['do_next']),
     SUB('Three Vermont regiments join the line about 18:00 on Jul 2', D, X_, [], 'neither report gives 18:00 on Jul 2')],
    {'st_eve': ('OR27-1-R069', 'The brigade joined that corps at this place on the evening of July 1'),
     'do_twi': ('OR27-1-R029', 'also reported to me about twilight ot the same day'),
     'do_next': ('OR27-1-R029', 'They joined me the next morning, and were posted')},
    scenarios=[SCN('A', 'Join the line about 18:00 on Jul 2', 'seed (SS2)', I), SCN('B', 'Brigade reports evening/twilight of Jul 1; three regiments join the morning of Jul 2', 'Stannard OR27-1-R069, Doubleday OR27-1-R029 p.258', D, ['st_eve', 'do_twi', 'do_next'])])

ROW('T2-175', 'partially_supported',
    'Greene: "We remained in this position ... until 6.30 p. m., when the First (Williams\') Division and the First and Second Brigades of the Second Division" were ordered away; Slocum: the Second Division was moved to the extreme left by Hancock\'s order; Geary\'s wrong-way march, Greene\'s 800-yard line and the 137th NY traverse are not isolated here.',
    [SUB('Greene: until 6.30 p. m. the brigade remained in position, when the First (Williams\') Division and the First and Second Brigades of the Second Division were ordered away', D, S_, ['gr_630']),
     SUB('Slocum: the Second Division was moved forward as rapidly as possible and placed, pursuant to orders from General Hancock, on the extreme left of the line (Jul 1)', D, S_, ['sl_2d']),
     SUB('Geary\'s division goes the wrong way down the Baltimore Pike; Greene holds about 800 yards with the 137th NY changing front into the traverse', I, U_, [], 'SS2, HMDB13997, NPS11, ABT-CH')],
    {'gr_630': ('OR27-1-R307', 'until 6.30 p. m., when the First (Williams\') Division and the First and Second Brigades of the Second Division were'),
     'sl_2d': ('OR27-1-R271', 'as rapidly as possible, and placed, pursuant to orders from General Hancock, on the extreme left of the line')})

ROW('T2-176', 'gap',
    'The Sherfy barn as a hospital, the dead and the fire timing (Jul 2 evening, Jul 3 morning or Jul 3 afternoon) rest on Stone Sentinels read through a summarizer; the OR has no Sherfy statement (claim check o2).',
    [SUB('The barn, a hospital, is riddled with shot, about a dozen wounded die, about 20 Zouaves perished; barn burned (time and cause disputed)', G, C_, [], 'SS-SHERFY, GD-SHERFY, CWT-SHERFY, WOMENHIST-SHERFY not local; scenarios Jul 2 evening / Jul 3 morning / Jul 3 afternoon')],
    remains=['a non-lead source for the barn fire and the casualty figures'], tier='open gap',
    scenarios=[SCN('A', 'Burned Jul 2 evening', 'seed (one account)', I), SCN('B', 'Burned the morning of Jul 3', 'Stone Sentinels (77th NY soldier)', I), SCN('C', 'Burned during the afternoon artillery of Jul 3', 'most sources', I)],
    searched=[SR(r'Sherfy', near=r'(barn|house|farm)', win=250, what='Sherfy farm or barn, OR27 all parts', parts=(1, 2, 3))])

ROW('T2-177', 'gap',
    'The Sherfy house (brick; south and west walls scarred, 7+ shell hits, 48 dead horses) rests on Stone Sentinels through a summarizer; the OR does not name Sherfy.',
    [SUB('Brick house, south and west walls scarred, 7+ shell hits, roof punctured; orchard and fences destroyed; 48 dead horses on the farm', G, U_, [], 'SS-SHERFY; secondary only')],
    remains=['a non-lead source for the house damage'], tier='inferred')

ROW('T2-178', 'gap',
    'Letterman: most hospitals were moved to the rear; the OR names none of the corps hospital sites (I Corps White Church 2,379; II Corps Rock Creek; XII Corps near the Bushman house; VI Corps near the Trostle house); the HMDB and PA Roots tablets were not re-fetched.',
    [SUB('Corps hospitals set up in the Rock Creek / White Run belt as the wounded arrive; sites and the I Corps count 2,379', G, U_, [], 'HMDB17936, HMDB13265, PAROOTS, WIKI-RCWR not local'),
     SUB('Hospitals were moved farther to the rear, trains parked near Westminster', D, S_, ['le_rear'])],
    {'le_rear': ('OR27-1-R016', 'were ordered farther to the rear, near Westminster')},
    remains=['site list and counts'], tier='open gap')
