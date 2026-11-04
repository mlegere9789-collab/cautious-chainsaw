"""Fidelity re-check batch 14: Martin R221, Gibbs R222, Sedgwick R223."""
OK = "0195 0196 0197 0198 0199 0201 0203 0205 0206 0207 0208 0209 0210 0221 0281 0282 0307 0223 0224"
_G = "date glyph OCR-damaged ('8d instant'); July 3 fixed by the sequence in the same report (battery not relieved until about dark July 2; the close of the engagement follows); hour '3 a. m.' is clean"
FIX = {
 '0200': dict(check='corrected', note="Date digit damaged ('8d'); the ledger bracket '[3d]' was the compiler's.",
              set={'when.printed': 'At 3 a. m. on the 8d instant (OCR)', 'when.description': _G}),
 '0202': dict(check='corrected', note="Date digit damaged ('8d'); the ledger bracket '[3d]' was the compiler's.",
              set={'when.printed': 'At 3 a. m. on the 8d instant (OCR)', 'when.description': _G}),
 '0204': dict(check='corrected', note="Date glyph damaged ('tlieSd instant'); July 3 by sequence and context.",
              set={'when.description': "date glyph OCR-damaged ('tlieSd instant'); read as the 3d by the sequence of the report, not from the glyph"}),
 '0507': dict(check='corrected', note="'(Newton having been given the First Corps)' is not in this sentence of Sedgwick's report and is removed.",
              set={'activity': 'Sedgwick: the Third Division was temporarily commanded by Brig. Gen. Wheaton'}),
 '0222': dict(check='corrected', note="'that night' attaches grammatically to Russell's and Torbert's brigades only; the Neill and Grant dispositions are stated in the next sentence without a time.",
              set={'activity': "Russell's and Torbert's brigades (Wright's division) held in reserve that night; Neill's brigade sent to the right (Slocum); Grant's posted on the extreme left (these two without a time in the sentence)"}),
 '0278': dict(check='corrected', note="'night of July 2' is not printed for Shaler; 'that night' belongs to the Russell/Torbert sentence.",
              set={'when.printed': None, 'when.description': "editorial: July 2 (the corps arrived that afternoon); no hour or night printed in the Shaler sentence"}),
}
