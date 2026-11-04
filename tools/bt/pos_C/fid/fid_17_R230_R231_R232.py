"""Fidelity re-check batch 17: Grant R230, Neill R231, Shaler R232."""
OK = "0257 0258 0259 0261 0262 0265 0266 0267 0268 0270 0271 0272 0273 0279 0280 0508"
FIX = {
 '0260': dict(check='corrected', note="Distance is an OCR-damaged fraction ('1^'); the ledger had read 1 1/2.",
              set={'place.printed': 'about 1^ (OCR-damaged fraction) miles forward'}),
 '0263': dict(check='corrected', note="'evening of July 2' is not printed in this sentence ('subsequently ordered'); it follows the July 2 arrival and precedes 'At midnight'.",
              set={'when.printed': None, 'when.description': "editorial: July 2 evening; no hour printed (between the arrival and 'At midnight')"}),
 '0264': dict(check='corrected', note="Error in the ledger: 'At midnight' after an arrival on the evening of July 2 is the midnight ending July 2, i.e. 1863-07-03T00:00, not 1863-07-02T00:00 (24 hours early).",
              set={'when.t_iso': '1863-07-03T00:00', 'when.date': '1863-07-03', 'when.description': "midnight at the end of July 2 (the narrative runs from the evening of July 2 to 'the morning of the 3d'); the date is not printed"}),
 '0274': dict(check='corrected', note="'11.15 o clock' has no a.m./p.m.; a.m. inferred from the sequence (9 a.m., 9.30 a.m., 11 a.m., 11.30 a.m.).",
              set={'when.description': "meridian not printed: a.m. inferred from the neighbouring a.m. entries of the same enclosure"}),
 '0275': dict(check='corrected', note="Activity was narrowed: the clause about the half-mile move 'at 7 (a.m. or p.m. not printed)' is POS-C-0277, and the passage does print 'At 7 a. m.'. '3.30 o'clock' has no meridian; p.m. inferred (terrific artillery fire, after the brigade was reformed about 3 p.m.).",
              set={'activity': "by direction of Wheaton the brigade was moved, under a terrific fire of artillery, to report to Newton; an order from Meade then directed it to remain in rear of the Third Corps position, reporting to Newton",
                   'when.description': "meridian not printed: p.m. inferred from the sequence (the enclosure has the brigade reformed about 3 p.m.; 'terrific fire of artillery')"}),
 '0277': dict(check='corrected', note="'[sic, July 4 morning?]' was the compiler's bracket. The passage prints 'At 7 a. m.' and then 'remained ... until 6 a. m. of the 4th instant'; as printed the meridian cannot be right for July 4 (7 a.m. would follow 6 a.m.), so the date/meridian is left open.",
              set={'when.printed': 'At 7 a. m. (as printed)', 'when.description': "printed '7 a. m.' follows the 3.30 move and precedes 'until 6 a. m. of the 4th': the meridian or the day looks misprinted; not resolved, no t_iso"}),
}
