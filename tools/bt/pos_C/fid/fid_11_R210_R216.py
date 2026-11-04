"""Fidelity re-check batch 11: Giddings R210, Burbank R211, Lee R212, Hancock R213, Clinton R214, Floyd-Jones R215, Greene R216."""
OK = "0133 0135 0136 0137 0138 0140 0143 0144 0145 0146 0147 0148 0149 0150 0151 0152 0153 0154 0155"
FIX = {
 '0134': dict(check='corrected', note="'(regular)' removed: the passage says only 'the Second Brigade'.",
              set={'activity': "14th US ordered to the front at 4 p.m. as support to the Second Brigade, lay down on a crest under fire about twenty minutes, fell back and bivouacked to the left"}),
 '0139': dict(check='corrected', note="'July 2, forenoon' is editorial; the passage gives no hour (after an hour or more at the edge of the woods).",
              set={'when.printed': None, 'when.description': "editorial: forenoon of July 2 (arrival 'on the morning of July 2', then an hour or more in the woods); no hour printed"}),
 '0141': dict(check='corrected', note="Pattern 1/2: 'about 5.30 p. m.' is from Hancock (R213); Burbank prints only 'about 5 p. m.' (previous sentence, order to advance). '(Weed)' for 'the Third Brigade' was the compiler's.",
              set={'when.printed': 'There it remained until about 5 p. m. (previous sentence), then moved forward and deployed', 'when.description': "time in a different sentence: 'about 5 p. m.' (order to advance, POS-C-0140); the 5.30 p.m. in the earlier ledger text is Hancock's (R213)",
                   'activity': 'brigade deployed into line; moved left to occupy ground supposed to have been left by the Third Brigade, found it still occupied, moved right a short distance'}),
 '0142': dict(check='corrected', note="'July 2 evening, before dark' is editorial; no hour in the sentence ('nearly dark' appears later, POS-C-0143).",
              set={'when.printed': None, 'when.description': "editorial: July 2 after the 5 p.m. order; no hour printed in this sentence (the reforming 'nearly dark' is POS-C-0143)"}),
}
