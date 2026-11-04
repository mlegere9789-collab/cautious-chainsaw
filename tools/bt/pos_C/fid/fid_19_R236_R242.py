"""Fidelity re-check batch 19: Patterson R236, Moody R237, McCartney R238, Cowan R239, Harn R240, Waterman R241, Adams R242."""
OK = "0302 0300 0309 0310 0311 0312 0313 0314 0315 0316 0317 0318 0319 0321"
FIX = {
 '0299': dict(check='corrected', note="Date digit printed '3d' for the afternoon of arrival; July 2 is the compiler's reading from the sequence (the action 'about 5 o'clock in the evening' follows). '[sic, July 2]' was the compiler's bracket.",
              set={'when.printed': "about 3 o'clock on the afternoon of the 3d", 'when.description': "date digit OCR-doubtful ('the 3d'); July 2 by the sequence of the report (the action that evening, 'that night and during the day of the 3d'), not from the glyph"}),
 '0308': dict(check='corrected', note="place.printed carried the first report's wording ('on the left of the cemetery ... to relieve the First New Hampshire Battery' by Major Osborn) from a different report in the same record; narrowed to this passage.",
              set={'place.printed': 'near the cemetery, on the left and rear of Gettysburg'}),
 '0517': dict(check='corrected', note="Date glyph damaged ('On the 38th of June'); 28th fixed by the sequence in the same sentence (thence on the 29th, on the 30th). Marked ocr_uncertain.",
              set={'ocr_uncertain': True, 'when.description': "date glyph OCR-damaged ('38th'); June 28 fixed by the sequence 'thence, on the 29th ... on the 30th' in the same sentence"}),
 '0320': dict(check='corrected', note="place.printed carried the compiler's gloss '(Little Round Top)' for Hazlett's battery position.",
              set={'place.printed': "the right of Hazlett's battery, in reserve during the day; toward night moved 1 mile to the rear"}),
}
