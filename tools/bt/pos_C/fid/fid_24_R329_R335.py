"""Fidelity re-check batch 24: Hill R329, Fitzhugh R330, Dow R331, Rigby R332, Parsons R333, Ames R334, Ewing R335."""
OK = "0413 0416 0418 0420 0421 0422 0429 0417 0423 0424 0426 0427 0350 0351 0471"
FIX = {
 '0411': dict(check='corrected', note="4.30 p.m. is the time the Third Brigade was ordered to the front (previous clause); the placing 'immediately' on arrival is not separately timed. Marked approximate.",
              set={'when.approx': True, 'when.description': "time of the order to the front 'about 4.30 p. m.'; the placing on Cemetery Hill followed on arrival and is not timed"}),
 '0414': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Baltimore turnpike'}),
 '0415': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Baltimore turnpike'}),
 '0419': dict(check='corrected', note="'relieved by McGilvery at 7.30 p.m.': the OCR prints '7.80 p. m.' (digit damaged; 7.30 is the reading by sequence, 'about 7 o'clock when the enemy retired').",
              set={'activity': "Dow's 6th Maine ordered by Tyler through Lt. Blucher about 6 p.m., went into position, fired about an hour and a half; relieved by McGilvery at '7.80' [OCR; read as 7.30] p.m.",
                   'ocr_uncertain': True}),
 '0428': dict(check='corrected', note="road field made verbatim ('the Baltimore turnpike').", set={'place.direction_or_road': 'Baltimore turnpike'}),
 '0425': dict(check='corrected', note="'(Round Top)' removed from place.printed: the passage says 'near the mountain'.", set={'place.printed': 'on the left, near the mountain'}),
}
