"""Fidelity re-check batch 05: Griffin R190, Tilton R192."""
OK = "0033 0034 0036 0038 0039 0040 0041 0042"
FIX = {
 '0035': dict(check='corrected', note="Narrowed: the order of General Barnes attaches to being placed in order of battle, not to the advance.",
              set={'activity': "brigade advanced to the front and was placed, by order of General Barnes, in order of battle"}),
 '0037': dict(check='corrected', note="Narrowed: the passage refuses 'the right wing of my right battalion' (the 118th Pennsylvania), not the whole regiment.",
              set={'activity': "the right wing of the brigade's right battalion, the 118th Pennsylvania (Col. Gwyn), was refused to make a crotchet, since there was no infantry to its right"}),
 '0518': dict(check='downgraded', note="The line diagram is OCR-garbled ('220. Mass. IstM-ich. izeth. Penn.'); regiment numbers and the left-to-right order are the compiler's reading. Only the 118th as right battalion and the Second Brigade on the left are in running text.",
              set={'tier': 'inferred', 'reasoning': "Tilton's running text names the 118th Pennsylvania as the right battalion and the Second Brigade on the left; the garbled diagram line ('220. Mass. IstM-ich. izeth. Penn.') is read as 22d Mass., 1st Mich., 118th Pa. left to right. The numbers (OCR '220', 'izeth') and the order are the compiler's reading."}),
 '0519': dict(check='downgraded', note="Same garbled diagram as POS-C-0518; the position of the 1st Michigan between the 22nd Mass. and the 118th Pa. is the compiler's reading of the line.",
              set={'tier': 'inferred', 'reasoning': "The 1st Michigan is placed between the 22d Mass. and the 118th Pa. only by the compiler's reading of the garbled diagram line ('220. Mass. IstM-ich. izeth. Penn.'); Tilton's text names only the 118th (right battalion) and the Second Brigade (left)."}),
}
