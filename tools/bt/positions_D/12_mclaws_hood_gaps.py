"""D batch 12: Barksdale's, Semmes' and Wofford's brigades and the divisions of McLaws and Hood, from neighbours' reports (Kershaw R432, Longstreet R430, Cabell R435, Motes R440, White R448, Gee R451, Stuart R565, Robertson R452). McLaws, Barksdale, Semmes, Wofford, Hood and Law wrote no report that is in OR 27 (Barksdale and Semmes were mortally wounded)."""
from positions_build import C

S = 'cs-1c-mclaws-semmes'
W = 'cs-1c-mclaws-wofford'
B = 'cs-1c-mclaws-barksdale'
CLAIMS = [
    # ---- Semmes ----
    C(S, 'position', 'R432', a="Along this wall the division was then formed, Semmes in reserve to me and Barksdale on my left, supported by Wofford, in reserve",
      w='after about 3 p. m. (July 2)', d='07-02', ap=True, pl="behind the stone wall of the division line, in reserve behind Kershaw's brigade (Barksdale on Kershaw's left, Wofford in reserve behind Barksdale)",
      act="Kershaw: the division formed along the stone wall with Semmes' brigade in reserve behind Kershaw's, Barksdale's on Kershaw's left, supported by Wofford in reserve."),
    C(S, 'engagement', 'R432', a="General Semmes promptly responded to my call, and put his brigade in motion toward the right, preparatory to moving to the front",
      w='during the attack (about 4 to 5.30 p. m., July 2)', d='07-02', ap=True,
      pl="about 150 yards in Kershaw's right rear; toward the right to meet the attack on Kershaw's right; one regiment came at the double-quick as far as the ravine in rear of the Seventh South Carolina",
      act="Kershaw, hurrying back to Semmes about 150 yards in his right rear, asked him to meet the attack on Kershaw's right; Semmes put his brigade in motion toward the right; one of his regiments came at the double-quick to the ravine in rear and checked the enemy; Semmes fell mortally wounded (Longstreet, Lee).",
      note="Kershaw's 'Fiftieth Georgia' mingled with the 3rd South Carolina (R432, R433 Maffett: about 40 men of the 50th Georgia under its major came in on the left of the 3rd SC)."),
    C(S, 'night_position', 'R448', a="the remaining regiments (the Eleventh and Fifty-ninth) were relieved by Semmes' brigade", w='morning of July 3, within about an hour of the 7th and 8th Georgia\'s detachment', d='07-03', ap=True,
      pl="Anderson's brigade's line of battle, relieved there by Semmes' brigade (the 11th and 59th Georgia then went to the right flank under Major McDaniel)", ocr=True,
      act="White: on the morning of July 3 the 11th and 59th Georgia (Anderson's brigade) were relieved by Semmes' brigade and ordered to the right and flank; Gee (R451) prints that the 59th was relieved by Semmes' brigade on the 3d and sent to the extreme right where it charged cavalry about 3 p. m.",
      note="Semmes himself was mortally wounded on July 2; the brigade was commanded by Colonel Goode Bryan (R424 footnote; Longstreet R430 names Bryan on July 10)."),
    C(S, 'departure', 'R432', a="On the 10th, I was directed to proceed, with my own and Semmes' brigades, and a section of [J. C. ] Fraser's battery, to the bridge across the- Antietam, near Macauley's", w='July 10 (after Gettysburg)', d='07-10', ap=True,
      pl="Funkstown, the bridge across the Antietam near Macauley's; July 11 line near St. James College", act="Kershaw's brigade and Semmes' brigade with a section of Fraser's battery were sent on July 10 to defend the Antietam bridge near Funkstown; Motes (R440) prints that on the evening of July 11 his battery took a position right of the road, left of Semmes' brigade, near St. James College, to fortify.",
      note="Recorded outside the battle days because it fixes Semmes' brigade (under Bryan) as a unit after Gettysburg."),
    # ---- Wofford ----
    C(W, 'engagement', 'R432', a="On emerging from the wood, I saw Wofford coming in in splendid style", w='the late afternoon (July 2)', d='07-02', ap=True,
      pl="coming in from the rear at the stony hill, advancing to the foot of the mountain across the wheat-field; Wofford's men were coming out at nightfall", gz='GZ-013',
      act="Kershaw: when his right wing fell back, he saw Wofford coming in 'in splendid style'; the enemy gave way at Wofford's advance and, with him, the whole of Kershaw's left wing advanced to the charge, sweeping the enemy across the stone wall beyond the wheat-field to the foot of the mountain; near nightfall Wofford's men were coming out.",
      ),
    C(W, 'engagement', 'R430', a="Wofford's brigade, of McLaws' division, was driven back at the same time", w='nearly night (July 2)', d='07-02', ap=True,
      pl="the center-left of McLaws' attack, near the Wheatfield; my left somewhat exposed after Anderson's brigades were driven back", gz='GZ-013',
      act="Longstreet: near nightfall a strong force met the brigades of Anderson's division on his left and drove one back; Wofford's brigade of McLaws' division was driven back at the same time, exposing and outflanking the left; Longstreet halted rather than push farther until his other troops came up.", ocr=True),
    C(W, 'movement', 'R565', a="establishing there a portion of Wofford's brigade, sent me for the purpose by General Longstreet", w='July 7', d='07-07', ap=True,
      pl="Downsville, Md. (on the line near Hagerstown), a portion of Wofford's brigade posted there under Stuart", rd='Hagerstown to Williamsport road',
      act="Stuart: on July 7 at Downsville he established a portion of Wofford's brigade, sent by Longstreet, with Jenkins' cavalry posted in advance of the infantry.", note="Cabell (R435) and Motes (R440) print that Motes' battery reported to Wofford on the morning of July 10 on the left of the Williamsport and Sharpsburg pike near St. James College."),
    # ---- Barksdale ----
    C(B, 'engagement', 'R432', a="Barksdale had not yet appeared, but came up soon after, and cleared the orchard", w='after about 4 o\'clock (July 2)', d='07-02', ap=True,
      pl="the Peach Orchard (cleared), on Kershaw's left in the line, moved so far left that it no longer supported Kershaw", gz='GZ-014', cf='barksdale_death C-037',
      act="Kershaw: Barksdale's brigade came up soon after Kershaw's advance began, cleared the orchard with the help of the 8th South Carolina and James' battalion, then moved so far to the left that it afforded Kershaw no more help; Barksdale was mortally wounded (Longstreet, Lee).",
      note="C-037 (Barksdale's death July 2 or July 3): Longstreet prints 'mortally wounded' on the 2d; Lee prints 'killed' on July 4 and 'mortally wounded' in the Jan. 1864 report; the casualty return of Guild is separate (R427)."),
    C(B, 'engagement', 'R430', a="General Barksdale mortally wounded, and General Semmes severely wounded", w='evening of July 2', d='07-02', ap=True,
      pl="the attack on the Peach Orchard and beyond (McLaws' division)", gz='GZ-014', cf='barksdale_death C-037', ocr=False,
      act="Longstreet: in the attack of July 2 McLaws lost two brigadiers, Barksdale mortally wounded and Semmes severely wounded (since died of his wounds); Longstreet's July 2 line was finally held with the left withdrawn to the Peach Orchard.",
      note="Longstreet's wording is 'mortally wounded' (not death on a given day); the date July 2 is the date of the attack."),
    # ---- McLaws division ----
    C('cs-1c-mclaws', 'engagement', 'R430', a="McLaws' division got into position opposite the enemy's left about 4 p. m.", w='about 4 p. m. (July 2)', d='07-02', t='16:00', ap=True,
      pl="opposite the enemy's left at the Peach Orchard; Hood's division farther to the right partially enveloping the enemy's left", gz='GZ-014', cf='art_open_jul2 C-011',
      act="Longstreet: McLaws' division got into position opposite the enemy's left about 4 p. m.; batteries opened; McLaws pressed the enemy's front, Hood his left; the enemy was dislodged from the Emmitsburg road position and driven back on a commanding hill.",
      note="Wilcox (R537) prints McLaws' division formed in line near his right about 2 p. m. and advanced at 6.20 p. m.; Anderson (R536) 5.30; Kershaw (R432) the head of his column in the open field about 3 p. m. and the order to advance about 4 o'clock."),
    C('cs-1c-mclaws', 'night_position', 'R430', a="resting at the peach orchard", w='night of July 2', d='07-02', ap=True,
      pl="the line of ground gained on the right with the left withdrawn to the Peach Orchard", gz='GZ-014', act="After the fighting of July 2 the First Corps held the ground gained on the right with McLaws' left resting at the Peach Orchard; Kershaw's brigade stood at the Peach Orchard until noon on July 3.", ocr=False),
    # ---- Hood division ----
    C('cs-1c-hood', 'engagement', 'R452', a="The division arrived on the ground in front of the position of the enemy that we were to attack but a few minutes before we were ordered to advance", w='July 2, shortly before the advance (about 4 p. m.)', d='07-02', ap=True,
      pl="the ground in front of the enemy's position, the 'mountain' (Little Round Top / Big Round Top region) on the right; order to Robertson to keep the right closed on Law and the left on the Emmitsburg pike", gz='GZ-017', cf='hood_advance_hour C-011',
      act="Robertson: Hood's division arrived on the ground in front of the position to be attacked only a few minutes before it was ordered to advance; Hood was wounded and carried from the field early in the attack; Law succeeded to the division.", ocr=False,
      note="Longstreet (R430): 'Hood's division was moved on farther to our right, and got into position, partially enveloping the enemy's left'; Hood was severely wounded soon after getting under fire."),
    C('cs-1c-hood', 'position', 'R432', a="Hood's division, then commanded by General Law, was engaged with the enemy's cavalry in his front, his line being formed across our right flank", w='about an hour after noon, July 3', d='07-03', ap=True,
      pl="across the right flank of McLaws' division (Kershaw connected with Hood's left)", act="Kershaw: on July 3 Hood's division, then commanded by General Law, was engaged with the enemy's cavalry in its front with its line formed across the First Corps' right flank; Kershaw connected his left with Hood's left.", ocr=False),
    C('cs-1c-hood', 'position', 'R458', a="The next day (the 4th). the division was formed in line of battle, facing down the Emmitsburg road, and was ordered to erect breastworks", w='the next day (July 4)', d='07-04', ap=True,
      pl="facing down the Emmitsburg road; Benning's brigade on the left, its left resting on that road", rd='Emmitsburg road', gz='GZ-041', ocr=True,
      act="Benning: on July 4 Hood's division (Law commanding) was formed facing down the Emmitsburg road and ordered to erect breastworks; about midnight it began moving back toward Hagerstown by Fairfield.", note="Constructed works: breastworks by the division on July 4."),
]
