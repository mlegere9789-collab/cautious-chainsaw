"""Fidelity re-check batch 06: Sweitzer R193."""
OK = "0045 0046 0047 0050 0051 0053 0057"
FIX = {
 '0520': dict(check='corrected', note="'July 2 evening' is editorial (no hour printed in the sentence); the change of front to face right is in the preceding sentences of the same passage.",
              set={'when.printed': None, 'when.description': 'editorial: July 2, no hour printed in the sentence'}),
 '0048': dict(check='corrected', note="Audit finding confirmed. place.printed dropped the hedge ('what I supposed to be the right of our line'); activity named the neighbouring division '(Ayres')', which the passage does not ('General Sykes' division being on our left'). Quote has an OCR error ('occiipying').",
              set={'place.printed': 'near what I supposed to be the right of our line, and near a farm-house and barn',
                   'activity': "division massed near a farm-house and barn, the brigades occupying positions in the order of their numbers from right to left, 'General Sykes' division being on our left'"}),
 '0049': dict(check='corrected', note="when.printed 'midday, until late afternoon' was partly the compiler's (no midday in the passage); road field held the compiler's identification (Baltimore Pike), the passage prints 'the Gettysburg turnpike'.",
              set={'when.printed': 'There we remained until late in the afternoon (the precise time I do not remember)', 'place.direction_or_road': 'Gettysburg turnpike (as printed)',
                   'when.description': "no start hour printed; 'midday' in the earlier ledger text was editorial"}),
 '0052': dict(check='corrected', note="'July 2 evening' is not printed; the passage gives 'say, fifteen minutes' after forming and no hour (the formation was 'late in the afternoon').",
              set={'when.printed': 'We had not remained here more than, say, fifteen minutes', 'when.description': "editorial: 'evening' is not printed; the brigade had left the orchard 'late in the afternoon'"}),
 '0054': dict(check='corrected', note="road field 'Emmitsburg road' was the compiler's; the passage prints only 'toward Emmitsburg'.",
              set={'place.direction_or_road': None}),
 '0056': dict(check='corrected', note="'evening of July 2' is not printed in the sentence; it follows the retirement to the rear of the battery ('shortly afterward').",
              set={'when.printed': 'shortly afterward (after the brigade formed in the rear of the battery)', 'when.description': "editorial: July 2 evening; the same report says 'About dark on the evening of the 2d' a few sentences later"}),
 '0058': dict(check='corrected', note="'killed' removed: the passage says Jeffords 'was thrust through with a bayonet in a contest over his colors'. 'July 2 evening' is editorial.",
              set={'activity': '4th Michigan (right of the brigade, beyond the stone fence) and 62nd Pennsylvania surrounded; many missing; Col. Jeffords thrust through with a bayonet in a contest over his colors',
                   'when.printed': None, 'when.description': "editorial: July 2, no hour printed in the sentence (fight after the brigade crossed the wheat-field)"}),
}
