"""Fidelity re-check batch 13: McCandless R219, Fisher R220."""
OK = "0177 0178 0179 0180 0181 0187 0191 0192 0193 0194"
_D = "date glyph: the passage prints 'of the 3d instant' for the arrival; July 2 rests on the next clause (5 p.m. assignment before the evening attack) and on Crawford (R218), not on the printed digit"
FIX = {
 '0175': dict(check='corrected', note="Printed date is 'the 3d instant'; July 2 is the compiler's reading from context (OCR or the author's slip). Marked ocr_uncertain, not read from the glyph.",
              set={'ocr_uncertain': True, 'when.description': _D}),
 '0176': dict(check='corrected', note="Same date caveat as POS-C-0175: the 5 p.m. assignment is in the same sentence as the printed '3d instant'.",
              set={'ocr_uncertain': True, 'when.description': _D}),
 '0182': dict(check='corrected', note="'July 2 evening' is editorial; Col. Taylor is not named as the Bucktails' colonel in this report (Crawford names 'First Rifles (Bucktails), Colonel Taylor').",
              set={'when.printed': None, 'when.description': "editorial: July 2 after the 5 p.m. assignment (POS-C-0176); no hour printed",
                   'activity': "the second line (First Rifles = Bucktails, and the Second Regiment) deployed to the left, prolonging the first line; Col. Charles F. Taylor fell leading his regiment (Crawford R218 names Taylor as the First Rifles' colonel)"}),
 '0183': dict(check='corrected', note="'July 2 evening' is editorial.", set={'when.printed': None, 'when.description': "editorial: July 2 after the 5 p.m. assignment (POS-C-0176); no hour printed"}),
 '0184': dict(check='corrected', note="'July 2 evening' is editorial.", set={'when.printed': None, 'when.description': "editorial: July 2 after the 5 p.m. assignment (POS-C-0176); no hour printed"}),
 '0186': dict(check='corrected', note="'afternoon of July 2' is not printed; the sentence has no time (the next sentence says 'Soon after the close of the fight of the 2d').",
              set={'when.printed': None, 'when.description': "editorial: July 2, no hour printed in the sentence"}),
 '0188': dict(check='corrected', note="Narrowed: the passage says 'the ravine between the two hills' (the Little/Round Top names were the compiler's) and that Fisher threw up the wall after swinging the left flank of the two regiments around; it does not say the regiments built it.",
              set={'activity': "in the morning Fisher changed position, swinging the left flank of the two regiments that had not gone up the hill around to cover the ravine between the two hills, and threw up a stone wall across the entire ravine and up the hill"}),
}
