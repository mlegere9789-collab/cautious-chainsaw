"""Fidelity re-check batch 04: Ingalls R024, Hunt R028, Newton R030, Birney R133."""
OK = "0459 0473 0441 0442 0454 0463 0497 0498"
FIX = {
 '0472': dict(check='corrected', note="Narrowed: Ingalls says the headquarters remained at Taneytown on July 1; he does not say that he himself was there on July 1 (he places himself there on June 30).",
              set={'activity': "Ingalls (Chief Quartermaster) arrived at Gettysburg on the morning of July 3; he was at Taneytown with army headquarters on June 30, and the headquarters remained there on July 1"}),
 '0358': dict(check='corrected', note="'July 2 evening' is not printed (the passage has the batteries forced back about 5.30 or 6 p. m., i.e. afternoon). The loss figures were from a second report (Tyler) and are removed.",
              set={'when.printed': 'July 2 (no hour in the sentence)', 'when.description': "editorial: the same passage has the Third Corps batteries forced back 'about 5.30 or 6 p. m.'; Turnbull's posting hour is not printed",
                   'activity': "Turnbull's Battery F and K, 3rd US (consolidated, six 12-pounders) was posted near the Emmitsburg road (Hunt)"}),
 '0514': dict(check='corrected', note="'July 2 evening' is not printed; same sentence as POS-C-0358 (afternoon fight, forced back about 5.30 or 6 p. m.).",
              set={'when.printed': 'July 2 (no hour in the sentence)', 'when.description': "editorial: the same passage has the Third Corps batteries forced back 'about 5.30 or 6 p. m.'; Turnbull's posting hour is not printed"}),
 '0412': dict(check='corrected', note="when.printed 'July 2 (morning-evening)' was the compiler's; the passage gives no hour for the Cemetery Hill arrangement (it follows the night-of-July-1 arrival of the commanding general and precedes the line being 'completed and well strengthened').",
              set={'when.printed': None, 'when.description': "editorial: July 2 dispositions made after the commanding general reached Gettysburg about 2 a.m. on the 2d; no hour printed for this arrangement"}),
 '0505': dict(check='corrected', note="'before dawn' is not printed. The passage says that on the evening of July 2 it was resolved to drive the enemy out at daylight, Knap's battery was placed on the hill, and the batteries opened at 4.30 a.m. on July 3.",
              set={'when.printed': None, 'when.description': "editorial: placed after the evening-of-July-2 decision 'to drive him out at daylight' and before the batteries opened at 4.30 a.m. on July 3 (same passage); no hour printed for Knap's battery"}),
 '0502': dict(check='corrected', note="The heading 'July 3' in the OCR is a damaged 'July 2': the report has a second heading 'July 3. - The dawn of day found the position of the First Corps' after the sundown events of the first paragraph.",
              set={'ocr_uncertain': True, 'when.description': "OCR glyph only: the paragraph heading prints 'July 3'; July 2 by sense, because a later heading 'July 3. - The dawn of day ...' follows the sundown events of this paragraph"}),
 '0516': dict(check='corrected', note="Hour digit damaged: the passage prints 'By about 13 o'clock'; read as 12 (impossible 13; 'Near 1 p. m.' follows). Marked ocr_uncertain.",
              set={'ocr_uncertain': True, 'when.description': "OCR glyph only: printed 'By about 13 o'clock'; 12 is a reading of the damaged digit, and 'Near 1 p. m. the enemy opened' follows"}),
 '0286': dict(check='corrected', note="Date was wrong in the ledger (2 July, 'a date to be read from the page'). The dispatch is headed 'Headquarters Third Army Corps, In the Field, July 4, 1863' and answers a circular 'of this date'.",
              set={'when.date': '1863-07-04', 'when.printed': 'Headquarters Third Army Corps, In the Field, July 4, 1863'}),
}
