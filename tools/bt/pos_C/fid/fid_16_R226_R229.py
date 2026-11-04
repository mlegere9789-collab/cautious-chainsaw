"""Fidelity re-check batch 16: Bartlett R226, Upton R227, Russell R228, Howe R229."""
OK = "0242 0243 0244 0245 0246 0239 0240 0241 0247 0248 0249 0251 0252 0254 0255 0256"
FIX = {
 '0250': dict(check='corrected', note="place.printed carried the compiler's gloss '(Round Top ridge)'; the passage says 'the steep hill to the left of the center of our line'.",
              set={'place.printed': 'the steep hill to the left of the center of our line'}),
 '0253': dict(check='corrected', note="The report prints 'at 1 a. m. on July 3'. The ledger's t_iso (July 2, 01:00) re-dated a printed day and used an hour that the other brigade reports (left July 1 between 9 and 10 p.m.) contradict; the date digit is OCR-doubtful. No t_iso.",
              set={'when.t_iso': None, 'ocr_uncertain': True, 'when.description': "OCR glyph only: printed 'July 3' (digit 2<->3 risk); the hour 1 a. m. is printed, but the day is not read from the page; Wright, Torbert, Upton and Nevin give departure on July 1 at 9-10 p.m."}),
}
