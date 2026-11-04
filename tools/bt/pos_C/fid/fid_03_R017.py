"""Fidelity re-check batch 03: Norton R017."""
OK = "0434 0436 0443 0455 0461 0503 0504"
FIX = {
 '0430': dict(check='corrected', note="'(from Poolesville on the 26th)': the preceding sentence prints 'On the 36th' (OCR damage, 26th by sequence 25th, 26th, 27th), so the 26th is an OCR reading; narrowed to say so.",
              set={'activity': "Norton: on June 27 the headquarters of the army moved to Frederick (the preceding sentence has it moving to Poolesville on the OCR-damaged '36th', read as 26th by sequence)"}),
 '0453': dict(check='corrected', note="t_iso 17:30 came from the previous sentence ('At 5.30 p. m. the enemy opened a terrific fire'); the sentence about the stations being broken up has no clock time.",
              set={'when.printed': None, 'when.t_iso': None, 'when.description': "time in a different sentence: 'At 5.30 p. m. the enemy opened a terrific fire' (July 2, previous sentence); the stations were broken up some time during the fight"}),
 '0456': dict(check='corrected', note="The sentence itself is undated; July 4 comes from the paragraph (it follows the 'On July 4, at 5.40 a. m.' entries and precedes the 'July 5.' heading).",
              set={'when.description': "date from the paragraph position: the sentence follows the July 4 entries and precedes the 'July 5' heading; it is not dated itself"}),
 '0477': dict(check='corrected', note="'Before 11 a. m.' is in the preceding sentence ('every desirable point of observation was occupied'); it is an upper bound, not a clock time of the Round Top station. The 3.30 p.m. sighting is in the next sentence.",
              set={'when.approx': True, 'when.description': "upper bound from the preceding sentence: 'Before 11 a. m. every desirable point of observation was occupied by a signal officer'; the Round Top sentence itself has no time"}),
}
