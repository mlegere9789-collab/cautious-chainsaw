"""D batch 90: strength notes printed in the reports read for batches 10-80 (men taken into action, as printed; ranges and bases are not resolved here)."""
from positions_build import C

CLAIMS = [
    C('cs-1c-pickett-garnett', 'strength_note', 'R441', a="The brigade went into action with 1,287 men and about 140 officers", w='the evening before the assault (July 2)', d='07-03', ap=True,
      pl='Garnett\'s brigade, as shown by the report of the previous evening', act="Peyton: Garnett's brigade went into action with 1,287 men and about 140 officers (report of the previous evening) and lost 941 killed, wounded and missing.", ocr=True),
    C('cs-3c-heth-archer', 'strength_note', 'R552', a="went into the fight on the 1st with 1,048 men, G77 of whom were killed, wounded, and cajitured", w='July 1', d='07-01', ap=True,
      pl="Archer's brigade", act="Shepard: Archer's brigade went into the fight on July 1 with 1,048 men, 677 of whom were killed, wounded and captured in these engagements.", ocr=True),
    C('cs-2c-early-gordon', 'strength_note', 'R477', a="I carried into action about 1,200 men, one regiment having been detached", w='July 1', d='07-01', ap=True,
      pl="Gordon's brigade (the 26th Georgia detached to support artillery)", act="Gordon: carried about 1,200 men into action on July 1, one regiment (26th Georgia) detached; loss 350 killed and wounded, 40 killed.", ocr=False),
    C('cs-3c-anderson-perry', 'strength_note', 'R545', a="The brigade went into action near TOO strong", w='July 2', d='07-02', ap=True,
      pl="Perry's (Lang's) Florida brigade", act="Lang: the brigade went into action about 'TOO' (OCR; 700) strong and lost 455 killed, wounded and missing.", ocr=True),
    C('cs-1c-hood-law-48al', 'strength_note', 'R447', a="In this battle the regiment had 275 men engaged", w='July 2', d='07-02', ap=True,
      pl='48th Alabama', act="Sheffield: the 48th Alabama had 275 men engaged on July 2 and 102 killed, wounded and missing.", ocr=False),
    C('cs-1c-hood-benning-15ga', 'strength_note', 'R460', a="I went in with 330 or 335 muskets", w='July 2', d='07-02', ap=True,
      pl='15th Georgia', act="Du Bose: in the battle of July 2 the 15th Georgia went in with 330 or 335 muskets and lost 70; on July 3 it lost 101 (171 in all).", ocr=False),
    C('cs-2c-rodes-doles-44ga', 'strength_note', 'R517', a="This regiment went into the engagement on the 1st instant at Gettysburg with 348 men and 35 ofiicers", w='July 1', d='07-01', ap=True,
      pl='44th Georgia', act="Peebles: the 44th Georgia went into the engagement on July 1 with 348 men and 35 officers.", ocr=True),
    C('cs-1c-hood-anderson-9ga', 'strength_note', 'R449', a="the loss of 189 out of 3-1:0 carried into the field", w='July 2', d='07-02', ap=True,
      pl='9th Georgia', act="Hillyer: the 9th Georgia lost 189 out of about 340 (OCR '3-1:0') carried into the field.", ocr=True),
    C('cs-2c-rodes', 'strength_note', 'R506', a="not over 1,800 men", w='July 3 (after detaching Daniel and O\'Neal)', d='07-03', ap=True,
      pl="the remaining line of Rodes' division: two small brigades, about a third of another, and the 5th Alabama", act="Rodes: after sending Daniel's and O'Neal's brigades to Johnson, he held his July 3 position with a single thin line of not over 1,800 men; his Appendix A prints the brigade strengths at Carlisle (digits unreadable in the OCR).", ocr=True),
    C('cs-2c-johnson', 'strength_note', 'R481', a="Killed, 219 ; wounded, 1,229 ; missing, 375 ; total, 1,823", w='July 1-3', d='07-03', ap=True,
      pl="Johnson's division at Gettysburg", act="Johnson: casualties in the division in the operations around Gettysburg were killed 219, wounded 1,229, missing 375, total 1,823 (September 30 report).",
      ocr=False),
]
