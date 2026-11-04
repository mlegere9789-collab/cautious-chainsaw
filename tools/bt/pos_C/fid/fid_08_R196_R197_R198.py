"""Fidelity re-check batch 08: Chamberlain R196, Clark R197, Welch R198."""
OK = "0074 0076 0078 0081 0082 0083 0084 0085 0086 0087 0088 0089 0090 0091 0092"
FIX = {
 '0075': dict(check='corrected', note="place.printed named 'Union Mills to Hanover'; Chamberlain says only 'the march of the day before' and reaching Hanover.",
              set={'place.printed': 'the march of the day before, ending at Hanover, Pa.'}),
 '0077': dict(check='corrected', note="'July 2, forenoon' is editorial; the sentence has no hour (it follows the 7 a. m. arrival and precedes 'Somewhere near 4 p. m.').",
              set={'when.printed': 'Massed at first (after the arrival at about 7 a. m.)', 'when.description': "editorial: forenoon of July 2; no hour printed in the sentence"}),
 '0079': dict(check='corrected', note="'about 4 p. m.' is in an earlier sentence ('Somewhere near 4 p. m. a sharp cannonade ... was the signal for a sudden and rapid movement'); the sentence about the southern slope has no hour.",
              set={'when.printed': None, 'when.description': "time in a different sentence: 'Somewhere near 4 p. m.' (the cannonade that began the division's movement, POS-C-0078); the arrival on the slope followed the march and climb"}),
 '0080': dict(check='corrected', note="'after about 4 p. m.' is the compiler's; the sentence is 'for an hour the fighting was severe' with no clock time.",
              set={'when.printed': 'for an hour the fighting was severe', 'when.description': "time in a different sentence: 'Somewhere near 4 p. m.' (POS-C-0078); the formation of the line and the first assault came after that"}),
}
