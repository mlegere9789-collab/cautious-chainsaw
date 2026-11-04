"""Second-pass patches (automatic name check of activity/place text against the cited record): compiler glosses that the passage does not print.
A PATCH on a claim already marked passed_full_read turns it into 'corrected'."""
G = "Compiler's gloss removed (identification not printed in the passage)."
PATCH = {
 '0039': dict(note=G, set={'place.printed': 'right of the Second Division; reported to General Sykes'}),
 '0040': dict(note=G + " '(Little Round Top)' removed: Tilton prints 'the rocky hill upon the extreme left'.", set={'place.printed': 'the rocky hill upon the extreme left'}),
 '0044': dict(note=G, set={'place.printed': 'Round Top hill'}),
 '0066': dict(note=G + " '(Little Round Top)' removed.", set={'place.printed': 'the extreme left of the brigade line'}),
 '0069': dict(note=G + " '(Little Round Top)' removed.", set={'place.printed': 'from the left to the center of the line, in reserve'}),
 '0096': dict(note=G + " 'Little Round Top' removed.", set={'place.printed': 'extreme left'}),
 '0097': dict(note=G + " '(Round Top crest)' removed.", set={'place.printed': 'a high hill a little to the left of the former position'}),
 '0227': dict(note="Brigade commanders' names (Bartlett, Torbert, Russell) are not in this sentence.", set={'activity': "Wright: the Third Division and the Second Brigade of his division moved into position; his First and Third Brigades were massed and held in reserve"}),
 '0267': dict(note=G, set={'activity': "Shaler's brigade formed in line of battle on the left, in rear of the Second Brigade, by direction of Wheaton"}),
 '0283': dict(note=G, set={'activity': "2nd Rhode Island (of the Second Brigade) put in position on the extreme left on the afternoon of July 2 and lay on its arms all night"}),
 '0285': dict(note=G, set={'activity': "the brigade to which the 2nd R.I. was attached (the Second Brigade) was used as a reserve on July 3, sent to the points most pressed; not called on to fire"}),
 '0276': dict(note=G + " Culp's Hill front and XII Corps right are not printed.", set={'place.printed': 'the breastworks'}),
 '0334': dict(note=G + " '(the Peach Orchard line)' removed.", set={'place.printed': 'the left flank'}),
 '0369': dict(note=G + " '(the Peach Orchard line)' removed.", set={'place.printed': 'on the right of Captain Bigelow and left of Captain Hart'}),
 '0471': dict(note=G + " 'Provost-Marshal-General' is not printed after 'General Patrick'.", set={'activity': "Maj. Ewing handed 400-500 stragglers to General Patrick on the road behind the lines during the cannonade/assault of July 3"}),
}
