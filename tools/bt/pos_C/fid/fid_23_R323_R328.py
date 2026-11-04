"""Fidelity re-check batch 23: Thompson R323, Taft R325, Edgell R326, Norton R327, Ricketts R328."""
OK = "0390 0391 0395 0396 0397 0398 0399 0400 0402 0403 0404 0405 0406 0407 0408 0409 0410"
_T = "date glyph OCR-damaged in the opening sentence ('^^ +iVo 9,1 instant'); July 2 fixed by 'in action of the 2d instant' later in the same report; 'at about 5 p. m.' is in the same sentence"
FIX = {
 '0388': dict(check='corrected', note="The date of the opening sentence is OCR-damaged ('^^ +iVo 9,1 instant'); July 2 comes from the later phrase 'action of the 2d instant'. Marked ocr_uncertain.",
              set={'ocr_uncertain': True, 'when.description': _T}),
 '0389': dict(check='corrected', note="Audit finding confirmed (UNSUPPORTED_HERE): Capt. Irish, his wounding as McGilvery's aide, and 'consolidated with C' are not in Thompson's report; Irish as McGilvery's aide is in R318 p.884. The only support here is the report heading 'Batteries C and F' and the position Thompson describes. Narrowed to that; date glyph damaged as for POS-C-0388.",
              set={'activity': "Battery F, Pennsylvania Light Artillery, reported with Battery C under Capt. Thompson (report headed 'Batteries C and F'): same position at the angle where the right of the line was thrown back",
                   'ocr_uncertain': True, 'when.description': _T}),
 '0401': dict(check='corrected', note="road field made verbatim ('the Baltimore turnpike').", set={'place.direction_or_road': 'Baltimore turnpike'}),
}
