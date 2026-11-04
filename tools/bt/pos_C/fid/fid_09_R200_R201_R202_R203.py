"""Fidelity re-check batch 09: Conner R200, Woodward R201, Lamont R202, Ayres R203."""
OK = "0100 0096 0097 0098 0101 0102 0104 0107 0108 0109 0111 0113"
_C = "no date in these sentences; the report's opening sentence prints 'the engagement on July 3' (OCR digit risk: the heading of the same report prints 'No. 300' for No. 200), so July 2 and July 3 here rest on the sequence and on Rice/Woodward"
FIX = {
 '0093': dict(check='corrected', note="Date of the engagement is OCR-doubtful in this report (opening sentence prints 'July 3'; heading 'No. 300' for 200).",
              set={'ocr_uncertain': True, 'when.description': _C}),
 '0094': dict(check='corrected', note="Same date caveat as POS-C-0093.", set={'ocr_uncertain': True, 'when.description': _C}),
 '0044': dict(check='corrected', note="Same date caveat as POS-C-0093.", set={'ocr_uncertain': True, 'when.description': _C}),
 '0095': dict(check='corrected', note="Printed '2. .30 p. m.': a stray point, not a damaged digit; read as 2.30. Marked approximate. Other reports of the brigade say about 4 p.m. (conflict kept).",
              set={'when.approx': True, 'when.description': "OCR prints '2. .30' (stray point); read as 2.30"}),
 '0099': dict(check='corrected', note="The hour is printed '13 m.' (not a clock hour; OCR digit damage for 12 m. is likely) and '[noon]' was the compiler's bracket, not printed. No t_iso.",
              set={'when.printed': 'until 13 m., the 4th', 'when.t_iso': None, 'ocr_uncertain': True, 'when.description': "OCR glyph only: printed '13 m.'; noon (12 m.) is a likely reading but is not read from the page"}),
 '0103': dict(check='corrected', note="'(Union Mills per the corps itinerary)' came from Sykes' report; Ayres does not name the destination.",
              set={'activity': 'division left Liberty on June 30 and marched 23 miles (destination not named in this passage)'}),
 '0105': dict(check='corrected', note="road field is now the printed road name only.", set={'place.direction_or_road': 'Gettysburg and Hanover road'}),
 '0106': dict(check='corrected', note="'morning of July 2' is editorial; the sentence says the division was marched forward on the night of July 1-2 and formed in line; 'Later in the day' follows.",
              set={'place.direction_or_road': 'Gettysburg and Hanover road', 'when.printed': 'on the night of July 1 and 2 ... formed in line of battle (the next sentence begins: Later in the day)',
                   'when.description': "editorial: the hour of the formation is not printed"}),
 '0110': dict(check='corrected', note="'late afternoon' is a gloss; the passage says 'In the afternoon'.", set={'when.printed': 'In the afternoon', 'when.description': "'late' in the earlier ledger text was editorial"}),
 '0521': dict(check='corrected', note="'late afternoon' is a gloss; the passage says 'In the afternoon'.", set={'when.printed': 'In the afternoon', 'when.description': "'late' in the earlier ledger text was editorial"}),
 '0112': dict(check='corrected', note="'night of July 2' is a gloss; the passage says 'Subsequently ... massed' and that when the two brigades were withdrawn 'the fight was virtually over'.",
              set={'when.printed': 'Subsequently (when I withdrew the two brigades, the fight was virtually over)', 'when.description': "editorial: night of July 2; no hour printed"}),
}
