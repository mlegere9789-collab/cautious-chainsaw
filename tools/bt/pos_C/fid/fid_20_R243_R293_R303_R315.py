"""Fidelity re-check batch 20: Howard R243, Geary R293, Cobham R303, Tyler R315."""
OK = "0501 0276 0322 0323 0325 0326 0327 0329 0332 0333 0334 0335 0394 0336 0337 0338 0339 0342 0343 0352 0357"
FIX = {
 '0269': dict(check='corrected', note="'8.45o'clock' has no a.m./p.m.; a.m. inferred from the neighbouring 'About 8 a. m.' and 'At 9 a. m.' sentences.",
              set={'when.description': "meridian not printed: a.m. inferred from 'About 8 a. m.' (previous sentences) and 'At 9 a. m.' (next)"}),
 '0324': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Emmitsburg turnpike'}),
 '0328': dict(check='corrected', note="Distance printed 'li miles' (OCR-damaged fraction); the ledger had read it as 1 1/2.",
              set={'place.printed': 'behind the line of battle of the Third Corps, about li (OCR-damaged fraction) miles from Gettysburg'}),
 '0330': dict(check='corrected', note="road field made verbatim; the passage names 'a cross-road between the main road and the Baltimore turnpike'.",
              set={'place.direction_or_road': 'cross-road between the main road and the Baltimore turnpike'}),
 '0331': dict(check='corrected', note="'July 2 forenoon' is editorial (no hour in the sentence; the reporting at 10.30 a.m. is the previous sentence).",
              set={'when.printed': 'July 2 (after reporting about 10.30 a. m.)', 'when.description': "editorial: 'forenoon' is not printed; no hour in this sentence"}),
 '0340': dict(check='corrected', note="Narrowed: the passage says only that on riding along the lines on the morning of July 3 Tyler found that the infantry 'had constructed' a slight breastwork; when and by whom it was built is not stated (night of July 2-3 is an inference, not printed).",
              set={'activity': "on riding along the lines on the morning of July 3 Tyler found that the infantry had constructed a slight breastwork of available materials along the entire crest, and some shelter for the artillery (construction time not stated)"}),
 '0341': dict(check='corrected', note="'about 12 o'clock' has no meridian; noon is inferred from the sequence (quiet morning of July 3, then the cannonade).",
              set={'when.description': "meridian not printed: noon inferred from the sequence of July 3"}),
 '0347': dict(check='corrected', note="Narrowed: the casualty and ammunition figures (14 officers wounded, 216 privates killed/wounded/missing, about 11,653 rounds) are in a separate note dated July 4, 2 p.m. at the end of the record, with footnotes, not in the sentence about the 108 guns; and the note says 'officers wounded', not killed/wounded/missing.",
              set={'activity': "Tyler: the 108 guns of the Artillery Reserve on the field were all in position, their fire concentrated wherever the battle was hottest (the July 4, 2 p.m. note with the casualty and ammunition figures is now POS-C-0538)"}),
 '0359': dict(check='corrected', note="'on July 3 posted on the left of the Second Corps batteries (Hunt)' came from Hunt's report and is removed.",
              set={'activity': "Lt. Thomas's Battery C 4th US held the crest of the hill and did excellent service in repelling the attack on the centre"}),
 '0360': dict(check='corrected', note="'Lt. Mason took command (Hunt)' came from Hunt's report and is removed.",
              set={'activity': "Lt. Eakin's Battery H 1st US was ordered to Cemetery Hill, where Eakin was wounded soon after his guns went into battery"}),
}
