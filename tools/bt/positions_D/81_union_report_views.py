"""D batch 81: Confederate brigades whose own reports are missing, seen in Union reports of OR 27 Part 1 (neighbour/opposing statements, recorded as such): Barksdale (Hancock R076, Hall R109, Doubleday R029, Meade R006), Armistead and Garnett (Webb R104, Hall R109), Kemper (Meade R006)."""
from positions_build import C

CLAIMS = [
    C('cs-1c-mclaws-barksdale', 'engagement', 'OR27-1-R076', a="Brigadier-General Barksdale, of the rebel service, was left on the field, mortally wounded", w='evening of July 2', d='07-02', ap=True,
      pl="in front of the Third Corps line on the left of the Union position (the Union reports name no Confederate approach road); left on the field after Lockwood's advance", cf='barksdale_death C-037',
      act="Hancock (II Corps, as printed on p. 371): Barksdale was left on the field mortally wounded when the Union advance recaptured the guns left in the Third Corps line on the evening of July 2.", note="Union-side statement; the date is that of the action described."),
    C('cs-1c-mclaws-barksdale', 'engagement', 'OR27-1-R109', a="The rebel General Barksdale was mortally wounded and two colors left on the ground within 20 yards of the line of the Seventh Michigan Volunteers", w='evening of July 2', d='07-02', ap=True,
      pl="within 20 yards of the line of the 7th Michigan (Hall's brigade, II Corps) on the Union left center", cf='barksdale_death C-037',
      act="Hall: the enemy advanced to within 30-40 yards of his brigade's line, broke, and Barksdale was mortally wounded, two colors left on the ground within 20 yards of the 7th Michigan.", note="Union-side statement."),
    C('cs-1c-mclaws-barksdale', 'night_position', 'OR27-1-R029', a="was the death of the rebel General Barksdale", w='the third day (July 3)', d='07-03', ap=True,
      pl="brought into the lines of Doubleday's (I Corps) command by Lieutenant-Colonel Livingston; died there", cf='barksdale_death C-037',
      act="Doubleday: among the circumstances of the third day was the death of the rebel General Barksdale, who was brought into his lines by his acting assistant inspector-general.", note="C-037 (Barksdale's death July 2 or 3): Doubleday puts the death on 'the third day'; Meade's dispatch of July 4 (R006 p. 74) prints that Barksdale's dead body was within the Union lines; Longstreet and Lee print 'mortally wounded' on July 2."),
    C('cs-1c-pickett-armistead', 'engagement', 'OR27-1-R104', a="General Armistead passed over the fence with probably over 100 of his command and with several battle-flags", w='July 3 (during the assault)', d='07-03', ap=True,
      pl="over the fence at the stone wall in front of Webb's brigade (II Corps); left mortally wounded within Webb's lines",  gz='GZ-007',
      act="Webb: Armistead crossed the fence with probably over 100 of his command and several battle-flags, was mortally wounded within Webb's lines; 42 of the enemy who crossed the fence lay dead.", note="Union-side statement from OR Part 1 p. 428; Peyton (R441) prints Armistead 'coming up in our rear' during the advance."),
    C('cs-1c-pickett-garnett', 'engagement', 'OR27-1-R109', a="Generals Garnett and Armistead were picked up near this point", w='July 3 (end of the assault)', d='07-03', ap=True,
      pl="near the position of Hall's brigade on the right of Webb's line, where the enemy column that had passed the fence threw down arms",  gz='GZ-007',
      act="Hall: Generals Garnett and Armistead were picked up near the line where the part of the column that had passed the fence threw down its arms; twenty battle-flags were captured in a space of 100 yards square.", note="Union-side statement; Peyton (R441) prints that Garnett was shot from his horse within about 25 paces of the stone wall."),
    C('cs-1c-pickett-kemper', 'departure', 'OR27-1-R006', a="General [J. L.] Kemper was found mortally wounded on the road to Fairfield", w='about July 5-6 (date line lost in the index)', d=None, ap=True,
      pl="on the road to Fairfield (left behind in the Confederate retreat)", rd='Fairfield road',
      act="Meade (dispatch printed in his report p. 80): General Kemper was found mortally wounded on the road to Fairfield, with several thousand wounded, after the Confederate withdrawal.", note="Union-side statement. Lee (R426) prints that Kemper was dangerously wounded on July 3."),
]
