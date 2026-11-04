"""Fidelity re-check batch 22: Phillips R319, Milton R320, Hart R321, McMahon R322."""
OK = "0368 0369 0370 0465 0372 0373 0375 0378 0380 0383 0387 0379 0382 0384 0386"
FIX = {
 '0385': dict(check='corrected', note="The Pennsylvania battery's officer figure is OCR-damaged ('i officers and 100 men'); 4 is read from the stated total of 15 officers (4+4+3+4).",
              set={'activity': "First Volunteer Brigade batteries engaged: 15 officers and 368 men (5th Mass. 4 officers/100 men; 9th Mass. 4/100; 15th NY 3/68; C&F Pa. 'i' officers [OCR-damaged; 4 by the total]/100)", 'ocr_uncertain': True}),
 '0371': dict(check='corrected', note="Narrowed: 'built July 3' is not printed; the sentence says the guns were protected by a slight parapet under McGilvery's direction, following the daylight-of-the-3d move.",
              set={'activity': "slight parapet protected the 5th Mass. guns under McGilvery's direction (construction time not stated; sentence follows the daylight July 3 move)", 'when.printed': 'At daylight on the 3d (previous sentence)'}),
 '0374': dict(check='corrected', note="'about 5.30-6 p. m.' is not printed; the passage gives 'After an hour's slow firing' after the 4 p.m. start.",
              set={'when.printed': None, 'when.description': "editorial: after an hour's slow firing that began after 'until 4 p. m.' (POS-C-0373); no clock time printed for this position"}),
 '0376': dict(check='corrected', note="'(the left-center)' removed from place.printed; 'July 3 morning' rests on 'The next morning' (after the 9 p.m. park).",
              set={'place.printed': 'near position of first day'}),
 '0377': dict(check='corrected', note="'July 3, afternoon' is not printed; the sentence follows the noon retirement and the move to the right center. The end time is printed '10 ^. m. of the 5th' (meridian glyph damaged).",
              set={'when.printed': 'Remained in same position until about 10 ^. m. of the 5th (OCR)', 'ocr_uncertain': True, 'when.description': "editorial: July 3 after the 12 o'clock retirement; the meridian glyph of '10 ^. m.' is OCR-damaged (night of the 5th by context)"}),
 '0515': dict(check='corrected', note="'July 3, afternoon' is not printed (follows the 12 o'clock retirement in the same passage).",
              set={'when.printed': None, 'when.description': "editorial: July 3 after the 12 o'clock retirement (Milton, POS-C-0376); no hour printed"}),
}
