HR = r"(?:\d{1,2}(?:\.\d{2})? ?[ap]\. ?m\.?|o.clock|noon)"
SPECS = [
 dict(rows='T1-141', scope='or1', pat=r"Paul.{0,200}(?:wounded|struck|fell).{0,150}" + HR, note='hour of Paul\'s wound', max=3),
 dict(rows='T1-142', scope='or2', pat=r"(?:Ramseur|Daniel).{0,250}" + HR + r".{0,100}(?:advance|attack|charge)", note='hours of Daniel\'s and Ramseur\'s attacks', max=3),
 dict(rows='T1-144', scope='or2', pat=r"Gordon.{0,300}(?:1,[0-9]{3}|1[0-9]{3}).{0,40}(?:men|strong|effective|muskets)", note='strength of Gordon\'s brigade', max=3),
 dict(rows='T1-146', scope='or1', pat=r"Fowler.{0,250}" + HR, note='hour of Fowler\'s death', max=3),
 dict(rows='T1-146', scope='or1', pat=r"Wilkeson.{0,250}" + HR, note='hour of Wilkeson\'s wound', max=3),
 dict(rows='T1-148', scope='or', pat=r"Stone.{0,200}(?:captured|taken prisoner|fell into the hands|left upon the field|left on the field)", note='Stone captured', max=3),
 dict(rows='T1-153', scope='or', pat=r"Heth.{0,200}(?:unconscious|insensible|struck on the head|struck in the head|twenty-four hours|24 hours|ball struck|bullet)", note='Heth\'s wound and unconsciousness', max=3),
 dict(rows='T1-154', scope='or2', pat=r"Blackford.{0,300}(?:cavalry|Devin|Gamble)", note='the cavalry that Blackford met', max=3),
 dict(rows='T1-155', scope='or2', pat=r"Scales.{0,300}(?:artillery|guns|shell|enfilade)", note='Scales\' brigade and the Union artillery', max=3),
 dict(rows='T1-155', scope='or2', pat=r"Perrin.{0,300}(?:gap|interval|50 yards).{0,100}(?:121st|cavalry)", note='Perrin and the gap between the 121st and the cavalry', max=3),
 dict(rows='T1-156', scope='or1', pat=r"(?:intrench|breastwork|barricade).{0,200}seminary.{0,200}" + HR, note='hour of the intrenchments in front of the seminary', max=3),
 dict(rows='T1-164', scope='or1', pat=r"Hancock.{0,200}Howard.{0,150}(?:senior|junior|rank)", note='Doubleday on Howard and Hancock', max=3),
 dict(rows='T1-166', scope='or', pat=r"Coster.{0,300}(?:313|captured|prisoners).{0,100}(?:two guns|guns)", note='Coster\'s brigade losses', max=3),
 dict(rows='T1-171', scope='or', pat=r"(?:Lauson|Lawson).{0,100}(?:55th|Fifty-fifth)|(?:55th|Fifty-fifth) Virginia.{0,200}(?:Major|Maj\.)", note='Maj. Lauson of the 55th Virginia', max=3),
 dict(rows='T1-171', scope='or2', pat=r"Fifty-fifth Virginia.{0,300}(?:hospital|wounded|barn)", note='55th Virginia at the McPherson barn', max=3),
]
