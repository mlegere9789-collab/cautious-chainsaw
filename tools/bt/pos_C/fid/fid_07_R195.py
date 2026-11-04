"""Fidelity re-check batch 07: Rice R195."""
OK = "0059 0060 0061 0062 0063 0064 0065 0066 0068 0069 0070 0071 0073"
FIX = {
 '0067': dict(check='corrected', note="'evening of July 2' is editorial; the sentence has no hour (the 8 o'clock in the evening is in a later sentence, POS-C-0068).",
              set={'when.printed': None, 'when.description': "editorial: July 2 during the fight; the 'It was now 8 o'clock in the evening' sentence follows (POS-C-0068)"}),
 '0072': dict(check='corrected', note="Audit finding confirmed: the road field 'Emmitsburg road' is the compiler's; the passage says 'in direction of Emmitsburg' and 'Bivouacked on the road'.",
              set={'place.direction_or_road': None, 'place.printed': 'in direction of Emmitsburg; bivouacked on the road'}),
}
