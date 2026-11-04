"""Fidelity re-check batch 15: Wright R224, Torbert R225."""
OK = "0213 0216 0217 0218 0219 0220 0228 0229 0230 0231 0232 0233 0234 0235 0236 0237 0238"
FIX = {
 '0212': dict(check='corrected', note="Road field held the compiler's identification (Baltimore Pike, as the ledger note itself says); the passage here says 'Gettysburg' only; the road is 'the broad and excellent pike leading direct to Gettysburg' (POS-C-0215).",
              set={'place.direction_or_road': 'the broad and excellent pike leading direct to Gettysburg (as printed in the preceding sentences)'}),
 '0214': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Baltimore and Gettysburg pike'}),
 '0215': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'the broad and excellent pike leading direct to Gettysburg'}),
 '0227': dict(check='corrected', note="'night of July 2' was not printed in this sentence ('On our arrival ... the First and Third Brigades were massed'); the report's date digits are damaged ('3d and 3d', 'contest of July 3').",
              set={'when.printed': 'On our arrival (after the two-hour halt that followed the 4 p. m. arrival)', 'when.description': "editorial: July 2 evening; the report's own date digits are OCR-damaged ('3d and 3d ultimo', 'the contest of July 3'); no hour printed in the sentence"}),
}
