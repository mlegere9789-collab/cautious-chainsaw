"""D batch 95: claims split out of merged claims at the full-passage fidelity re-check (one claim per report, each with its own verified quote).
Each carries c['fc'] = 'corrected'; the claim it was split from is narrowed in positions_D_recheck.json. See RECHECK_D_NOTES.md."""
from positions_build import C

S = 'cs-1c-mclaws-semmes'
CLAIMS = []


def add(c, split_from):
    c['fc'] = 'corrected'
    c['note'] = (c['note'] + ' ' if c['note'] else '') + 'Split at the re-check from %s so that each claim rests on one report.' % split_from
    CLAIMS.append(c)


add(C(S, 'night_position', 'R451', a="We were relieved on the next day (3d instant) by Semmes\" brigade, and sent to the extreme right of the line, where we charged the enemy at about 3 p. m.",
      w='July 3 (the 3d instant) and about 3 p. m. for the charge', d='07-03', ap=True,
      pl="the extreme right of the line", ocr=True,
      act="Gee, 59th Georgia: the regiment was relieved on the 3d instant by Semmes' brigade and sent to the extreme right of the line, where it charged the enemy at about 3 p. m.",
      note="Same event as the White (R448) claim PD-1c-mclaws-semmes-03; Gee does not say who commanded Semmes' brigade or what the enemy was."), 'PD-1c-mclaws-semmes-03')

add(C('cs-cav-jenkins', 'march', 'R506', a="On our arrival at Carlisle, Jenkins' cavalry advanced toward Harrisburg, and had on the 29tli made a tliorough reconnaissance of the defenses of the place",
      w='June 29 (the 29th), after the arrival at Carlisle', d='06-29', ap=False,
      pl="toward Harrisburg (from Carlisle)",
      act="Rodes: after the division's arrival at Carlisle, Jenkins' cavalry advanced toward Harrisburg and on the 29th made a thorough reconnaissance of the defenses of the place (the advance on Harrisburg, planned for the 30th, was given up when orders came to move toward the army).",
      note="Taken from Rodes' report (R506); it was merged into the Lee (R426) claim PD-cav-jenkins-02."), 'PD-cav-jenkins-02')

add(C('cs-cav-robertson', 'position', 'R565', a="were now on tlie right, near Fairfield, Pa., that it was essentially uecpssary for him to hold the Jack Mountain passes",
      w="on or before July 4 ('Previous to these instructions', the written instructions received during the 4th; 'now' on the right near Fairfield)", d='07-04', ap=True,
      pl="on the right, near Fairfield, Pa.; the Jack Mountain passes",
      act="Stuart: Brigadier-General Robertson, whose two brigades (his own and Jones') were now on the right near Fairfield, had been instructed, at Lee's instance, that it was essentially necessary for him to hold the Jack Mountain passes (two prominent roads, one north and one south of Jack Mountain, a peak in the Blue Ridge chain); during the retirement Stuart sent Captain Blackford to Robertson to inform him of his own movement toward Emmitsburg and ask his co-operation.",
      note="Taken from Stuart's report (R565); it was merged into the Lee (R426) claim PD-cav-robertson-01."), 'PD-cav-robertson-01')

add(C(S, 'night_position', 'R440', a="where I remained until next evening, when, by your order, I retired to a position on the right of the road, left of General Semmes' brigade, with orders to fortify my position",
      w="the evening of July 11 ('next evening' after 'On the morning of the 10th instant')", d='07-11', ap=True,
      pl="on the right of the road, left of General Semmes' brigade",
      act="Motes (battery of Cabell's battalion): on the morning of July 10 he was placed by Wofford on the left of the Williamsport and Sharpsburg pike near St. James' College; on the next evening, by order, he retired to a position on the right of the road, left of Semmes' brigade, with orders to fortify, which was done during the night and following day.",
      note="Taken from Motes' report (R440); it was merged into the Kershaw (R432) claim PD-1c-mclaws-semmes-04. The brigade was under Colonel Goode Bryan (Semmes mortally wounded)."), 'PD-1c-mclaws-semmes-04')

add(C('cs-cav-flee', 'engagement', 'R565', a="about the same time a i)ortion of General Fitz. Lee's command charged on the left, the First Virginia Cavalry being most conspicuous",
      w="July 3, during the cavalry fight east of Gettysburg ('about the same time' as the charge of a W. H. F. Lee regiment; no hour)", d='07-03', ap=True,
      pl="on the left",
      act="Stuart: on July 3, after Jenkins' men fell back and the enemy sent forward a squadron or two, he ordered one of W. H. F. Lee's regiments to charge, and about the same time a portion of General Fitz Lee's command charged on the left, the First Virginia Cavalry being most conspicuous; later in the report Stuart writes that Fitz Lee 'was always in the right place' and that he and the First Virginia begged to be allowed to take the enemy's battery.",
      note="Taken from Stuart's report (R565); it was merged into the Hampton (R567) claim PD-cav-flee-01."), 'PD-cav-flee-01')

add(C('cs-cav-chambliss', 'position', 'R565', a="I moved this command and W. H. F. Lee's secretly through the woods to a position",
      w="July 3, after 'On the morning of July 3' (the move to the ridge left of Ewell's left); no hour", d='07-03', ap=True,
      pl="through the woods to a position",
      act="Stuart: on July 3 he moved Jenkins' brigade and W. H. F. Lee's brigade secretly through the woods to a position, hoping to effect a surprise on the enemy's rear; Hampton's and Fitz Lee's brigades, ordered to follow, debouched into the open ground and disclosed the movement.",
      note="Taken from Stuart's report (R565); it was merged into the Hampton (R567) claim PD-cav-chambliss-01. (Stuart's brigade names are 'W. H. F. Lee's'; Hampton names Colonel Chambliss, who commanded it.)"), 'PD-cav-chambliss-01')

add(C('cs-cav-chambliss', 'engagement', 'R565', a="To prevent this, I ordered forward the nearest cavalry regiment (one of W. H. F. Lee's) quickly to charge this force of cavalry",
      w="July 3, after Jenkins' men fell back; no hour", d='07-03', ap=True,
      pl="the nearest cavalry regiment (one of W. H. F. Lee's)",
      act="Stuart: when Jenkins' men fell back and the enemy sent forward a squadron or two to cut off a portion of the dismounted sharpshooters, he ordered forward the nearest cavalry regiment (one of W. H. F. Lee's) quickly to charge this force of cavalry; it was gallantly done.",
      note="Taken from Stuart's report (R565); it was merged into the Hampton (R567) claim PD-cav-chambliss-01."), 'PD-cav-chambliss-01')

add(C('cs-cav-chambliss', 'march', 'R565', a="Colonel Ferguson, commanding Jenkins' brigade, taking the left road, and Chambliss' brigade, which I accompanied, the other",
      w="the march of the day after the night of the 4th (the day is not printed; 'just at dawn we entered Emmitsburg' earlier in the paragraph)", d='07-05', ap=True,
      pl="the other [road] at the Catoctin Mountain",
      act="Stuart: on the march from Emmitsburg, where the road separated before debouching from the Catoctin Mountain (one fork to the left by Smithtown, the other to the right toward Leitersburg), he divided his command, Colonel Ferguson commanding Jenkins' brigade taking the left road and Chambliss' brigade, which Stuart accompanied, the other.",
      note="Taken from Stuart's report (R565); it was merged into the Hampton (R567) claim PD-cav-chambliss-01. The date July 5 is a reading of the sequence (not printed)."), 'PD-cav-chambliss-01')
