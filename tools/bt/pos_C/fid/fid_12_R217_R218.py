"""Fidelity re-check batch 12: Garrard R217, Crawford R218."""
OK = "0156 0160 0161 0162 0163 0164 0468 0165 0168 0169 0171 0172 0173 0174 0189 0190 0470"
FIX = {
 '0157': dict(check='corrected', note="Distance is OCR-damaged ('1^' = a fraction after 1); the ledger had read it as 'nearly 1 mile'.",
              set={'place.printed': "forward nearly 1^ (OCR-damaged fraction) miles to musketry range"}),
 '0158': dict(check='corrected', note="place.printed carried the compiler's identification '(the rocky ridge: the Little Round Top summit)'; the passage says 'Round Top ridge'.",
              set={'place.printed': 'Round Top ridge'}),
 '0159': dict(check='corrected', note="when.printed 'about 4-4.30 p. m.' was not in the passage; the only hour is 'about 4 p. m.' two sentences earlier.",
              set={'when.printed': None, 'when.description': "time in a different sentence: 'until about 4 p. m. At this time the brigade was moved rapidly forward' (nearly 1^ miles before the engagement); no 4.30 is printed"}),
 '0166': dict(check='corrected', note="road field made verbatim.", set={'place.direction_or_road': 'Gettysburg and Hanover turnpike'}),
 '0167': dict(check='corrected', note="'At 2 o'clock' has no a.m./p.m.; p.m. inferred from the preceding 'by noon'.",
              set={'when.description': "meridian not printed: p.m. inferred from the preceding sentence 'by noon had arrived'"}),
 '0170': dict(check='corrected', note="'late afternoon' is editorial; the sentence has no hour.",
              set={'when.printed': None, 'when.description': "editorial: July 2 after the 2 o'clock order; no hour printed (as night was approaching, POS-C-0171)"}),
 '0185': dict(check='corrected', note="'July 2 late afternoon' is editorial; no hour in the sentence.",
              set={'when.printed': None, 'when.description': "editorial: July 2 after the 2 o'clock order; no hour printed"}),
}
