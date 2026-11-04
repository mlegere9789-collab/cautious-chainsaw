"""Fidelity re-check batch 10: Day R204, Sheridan R205, Adams R206, Bootes R207, Dunn R208."""
OK = "0117 0118 0119 0120 0121 0124 0125 0126 0114 0115 0131 0132"
FIX = {
 '0116': dict(check='corrected', note="Narrowed: the note says only that Capt. Thatcher commanded skirmishers on the reconnaissance of July 4; it does not describe the brigade's movement.",
              set={'activity': "Day (brigade commander) commends Capt. Thatcher, 14th US, who commanded the skirmishers on the reconnaissance of July 4"}),
 '0523': dict(check='corrected', note="Narrowed to Sheridan's own regiment: the claim carried a clause from Adams (4th US, another report) and spoke of the whole brigade.",
              set={'activity': "3rd US (Day's brigade) marched at 5 p.m. on July 5 about 5 miles on the Emmitsburg road and encamped", 'place.printed': 'the Emmitsburg road, about 5 miles'}),
 '0122': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Hanover and Gettysburg road'}),
 '0123': dict(check='corrected', note="Date glyph damaged: 'On the morning of July 3' (the report's heading prints 'July 3, 3, and 4'); July 2 by sequence after 'The night of July 1'. The hour '4 o'clock' is clean.",
              set={'ocr_uncertain': True, 'when.description': "date glyph OCR-damaged ('July 3'); July 2 fixed by the sequence: the night of July 1 precedes in the same passage"}),
 '0127': dict(check='corrected', note="'1-J- miles' is an OCR-damaged fraction; the ledger had read it as 1 1/2.",
              set={'place.printed': "a position about 1-J- (OCR-damaged fraction, read as 1 1/2) miles beyond our camp"}),
 '0128': dict(check='corrected', note="road field 'Emmitsburg road' was the compiler's; the passage says 'line of march for Emmitsburg, Md.'.", set={'place.direction_or_road': None}),
 '0129': dict(check='corrected', note="Date glyph damaged ('the 3d'; heading 'No. 307' for 207); July 2 by sequence. '[sic, July 2]' was the compiler's bracket.",
              set={'when.printed': 'about 4.30 o\'clock on the morning of the 3d', 'ocr_uncertain': True, 'when.description': "date glyph OCR-damaged ('the 3d'); July 2 fixed by the report's account of the first day of engagement and Dunn/Giddings; hour 4.30 a.m. is clean"}),
 '0130': dict(check='corrected', note="No a.m./p.m. is printed; afternoon is inferred from the sequence (4.30 a.m. departure, then lay in line 'a considerable time').",
              set={'when.description': "meridian not printed: p.m. inferred from the sequence (the earlier 4.30 was the morning departure)"}),
 '0522': dict(check='corrected', note="Narrowed to what Dunn says: his battalion went with the brigade; Capt. Winthrop's company skirmished under Capt. Thatcher (14th US); the 12th and 14th formed one line supporting the 3rd, 4th and 6th.",
              set={'activity': "Dunn: on the morning of July 4 the 12th US battalion was ordered out with the brigade on a reconnaissance; Capt. Winthrop's company skirmished under Capt. Thatcher (14th US); the 12th and 14th US formed one line supporting the 3rd, 4th and 6th US; the line withdrew when the object was accomplished"}),
}
