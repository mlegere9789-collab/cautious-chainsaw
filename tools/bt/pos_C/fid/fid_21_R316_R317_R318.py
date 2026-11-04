"""Fidelity re-check batch 21: Gillett R316, Weir R317, McGilvery R318."""
OK = "0466 0353 0354 0355 0361 0365 0367 0381 0392"
FIX = {
 '0348': dict(check='corrected', note="'soon after midday' is not a clock time; t_iso 12:00 is a floor, now marked approximate.",
              set={'when.approx': True, 'when.description': "printed 'soon after midday'; 12:00 is the earliest reading, not a printed clock time"}),
 '0349': dict(check='corrected', note="'after about 2 p. m.' is the previous sentence ('About 2 p. m. the enemy commenced a heavy artillery fire'); this sentence has no hour.",
              set={'when.printed': 'As soon as the batteries and trains which were moving to the rear had passed', 'when.description': "time in a different sentence: 'About 2 p. m.' (cannonade began, POS-C-0466), July 3"}),
 '0356': dict(check='corrected', note="Audit finding confirmed: the minute digit is OCR-damaged ('1.3('); the claim's activity read 1.30. The meridian is not printed (p.m. inferred from the whole-line fire that followed on July 3).",
              set={'activity': "battery in park near General Tyler's headquarters until 1.3( o'clock (last digit OCR-damaged; meridian not printed), when the enemy opened fire along the whole line; the battery fell back out of range",
                   'ocr_uncertain': True, 'when.description': "OCR glyph only: '1.3(' - minute digit damaged, hour 1; meridian not printed (p.m. inferred from the cannonade that followed)"}),
 '0362': dict(check='corrected', note="'from about 4 p. m.' was the compiler's; the passage gives the 3.30 p.m. order (previous sentences) and 'marched immediately'.",
              set={'when.printed': 'marched immediately (after the order at about 3.30 p. m.)', 'when.description': "time in a different sentence: 'at about 3.30 p. m. on July 2' (POS-C-0361); no 4 p.m. is printed"}),
 '0363': dict(check='corrected', note="'a quarter to 6 o'clock' has no meridian; p.m. inferred from the sequence.",
              set={'when.description': "meridian not printed: p.m. inferred from the sequence (after the 3.30 p.m. order; 'just before sundown' follows)"}),
 '0364': dict(check='corrected', note="road field made verbatim; 'after about 6 p. m.' is editorial (the sentence follows the 'quarter to 6' retirement, no hour of its own).",
              set={'place.direction_or_road': 'the Gettysburg and Taneytown road', 'when.printed': 'In the meantime (after the quarter-to-6 retirement)', 'when.description': "editorial: after the retirement 'at about a quarter to 6 o'clock'; the Sixth Maine reported 'just before sundown'"}),
 '0366': dict(check='corrected', note="Narrowed: the passage says McGilvery 'had a slight earthwork thrown up' in front of the guns; the sentence follows the early-morning July 3 line-up but states no time of construction.",
              set={'activity': "McGilvery had a slight earthwork thrown up in front of the 39 guns (construction time not stated; sentence follows the early-morning July 3 line-up); batteries ordered to cover their men and not reply until ordered"}),
}
