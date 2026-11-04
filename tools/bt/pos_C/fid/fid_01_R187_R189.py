"""Full-passage fidelity re-check, batch 01: Sykes (R187), Barnes (R189). Format: see positions_C_build.py."""
OK = "0001 0002 0003 0004 0005 0006 0007 0008 0009 0010 0011 0012 0013 0014 0015 0017 0464 0469 0018 0019 0021 0022 0024 0026 0027 0029 0031 0032 0043 0467"
FIX = {
 '0016': dict(check='corrected', note="Narrowed. The claim also carried 'the itinerary says the corps marched via Emmitsburg', a clause from the Aug 15 itinerary (second report text, see POS-C-0017); the anchor quote ('On the 5th, I began the march to Williamsport.') covers only the first half.",
              set={'activity': 'Sykes began the march to Williamsport on the 5th'}),
 '0020': dict(check='corrected', note="Date glyph is OCR-damaged ('On the Both.'); June 30 is fixed by the same passage (halt at Union Mills 'for the night', left 'the following morning, July 1'). The hour '4 a. m.' is in the same sentence and clean.",
              set={'when.description': "date glyph OCR-damaged ('Both'); June 30 fixed by the passage: halted at Union Mills for the night, left 'the following morning, July 1'"}),
 '0023': dict(check='corrected', note="Day-of-month glyph is OCR-damaged ('Jidy 3'). July 2 is fixed by the passage sequence (halt after midnight following July 1, brief rest of 2-3 hours, arrival 7 a.m.) and by Sykes/Griffin; the hour '7 o'clock in the morning' is clean.",
              set={'when.description': "date digit OCR-damaged ('Jidy 3'); July 2 fixed by the sequence in the same passage (halted after midnight July 1-2, rest of 2-3 hours, then 7 a.m.)"}),
 '0025': dict(check='corrected', note="when.printed carried the compiler's 'after midmorning' (not printed); replaced by the printed sentence.",
              set={'when.printed': 'These various movements occupied the time until long after midday', 'when.description': "editorial: after the 7 a.m. arrival plus 'an hour or more'; no clock time is printed for the orchard"}),
 '0028': dict(check='corrected', note="when.printed '4.30 to 6 p. m.' was not in this passage (4.30 comes from another report); the passage gives 'Between 4 and 6 o'clock' for the receipt of orders, a different sentence from the position. 'south of the Rose house per Tilton' is from a second report and is removed from place.printed.",
              set={'when.printed': 'Soon after (head of column entered the field)', 'when.description': "time in a different sentence: 'Between 4 and 6 o'clock in the afternoon' (orders received from Sykes, POS-C-0026)",
                   'place.printed': 'the edge of a thick wood, on the left of the ground assigned to the Third Corps'}),
 '0030': dict(check='corrected', note="Narrowed: the passage says the First Brigade was 'directed to relieve' the Third Brigade; the names Vincent/Rice and the completed relief are not in this sentence.",
              set={'activity': "the First Brigade (Col. Tilton) was directed on the following day (July 3) to relieve the Third Brigade at Little Round Top"}),
 '0055': dict(check='corrected', note="'all day' is not printed; the passage says detailed in the morning and rejoined the Second Brigade shortly after dark.",
              set={'activity': '9th Massachusetts (Col. Guiney) was detailed from the Second Brigade as skirmishers and deployed some distance in front of the line from the morning; it rejoined the Second Brigade after the fight'}),
}
