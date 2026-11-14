"""Reviewed cuts of the Massachusetts parse (work item union-ma).

A reviewed cut is the place where a person reading the OCR text of the leaf sees where an entry's name begins although no rule of ma_parse.py finds it
(the previous entry ends in initials or in a word without its period, the OCR split or damaged the name).  Each cut is located by the printed tokens of
the name: they must stand directly before the first dash of exactly one entry head of the unit (the parser asserts that).  Nothing in the text is changed:
the name stays the OCR tokens, the cut only says which tokens belong to it.  Every such row carries code H in the flag file.
"""
# (unit key, the name tokens as the OCR prints them, why)
NAME_CUTS = [
    ('u-ma-1st-massachusetts-infantry', 'George D. Wells', 'the entry above ends in "Officer U. S. A." (initials)'),
    ('u-ma-2nd-massachusetts-infantry', 'William Nichols, Jr.', 'the entry above ends in "Washington, D. C." (initials)'),
    ('u-ma-10th-massachusetts-infantry', 'Henry S. Briggs', 'a stray mark of the scan ("j", "I") stands between the sub-heading and the first entry'),
    ('u-ma-11th-massachusetts-infantry', 'John A, Douglass', 'the entry above ends in "Army of Potomac" without its period'),
    ('u-ma-13th-massachusetts-infantry', 'Andeaaon . -\\: : r r aid', 'the name is damaged beyond reading in the text layer; the printed tokens up to the first dash are taken whole'),
    ('u-ma-19th-massachusetts-infantry', 'Vertulan R. Stone', 'the entry above ends in "Georgetown, D. C." (initials)'),
    ('u-ma-28th-massachusetts-infantry', 'McLelland Moore', 'the entry above ends in "Officer U. S. A." (initials)'),
    ('u-ma-32nd-massachusetts-infantry', 'Francis J. Parker', 'the first entry follows the unit sketch, which ends in the word INFANTRY set as a heading'),
    ('u-ma-1st-company-massachusetts-sharpshooters', 'Littlefield.DavidM.', 'the OCR printed the surname, the comma and the given name as one token'),
    ('u-ma-15th-massachusetts-infantry', 'Charles Devens', 'the first entry follows the unit sketch, which ends in the word INFANTRY set as a heading'),
    ('u-ma-20th-massachusetts-infantry', 'John W. Nye', 'the entry above ends in "V. R. C." (initials)'),
    ('u-ma-11th-massachusetts-infantry', 'Poole William', 'the comma is lost in the text layer; the entry above ends in "as John Pickins." which the period rule would have taken for the surname'),
    # found by the reconciliation with the earlier roll files (rosters/data/NE/massachusetts): the earlier reading cuts these three heads whole
    ('u-ma-16th-massachusetts-infantry', 'Steams, Henry VV,', 'the initial W is printed as the two letters VV with a comma, which the comma rule takes for a surname'),
    ('u-ma-20th-massachusetts-infantry', 'ElishaM. White', 'the given name and the middle initial are one token that ends with a period, which the period rule takes for the end of the entry above'),
    ('u-ma-32nd-massachusetts-infantry', 'Waitt, John (alias Godsoe, John)', 'the head prints a second name in brackets; the closing bracket ends the cut of the comma rule'),
]


# Reviewed headings: a section heading the OCR damaged so that classify_heading (ma_parse.py) does not take it as a heading, with the code a person reads in it.
# Each is located by the exact text of the line (blanks collapsed) inside the section of the unit and must occur exactly once (the parser asserts that).  The code
# is what the printed heading says (a company letter, UNAS for UNASSIGNED); it is never the letter that "the sequence" would give.  Found by the reconciliation with
# the earlier roll files: without these two the rows of the heading and of the next headings' section stay under the company above.
# (unit key, the heading line as the OCR prints it, the code, why)
HEADINGS = [
    ('u-ma-10th-massachusetts-infantry', "COMPANY ''K'l", 'K', 'the letter K is legible; its closing quote is printed as an apostrophe and the letter l'),
    ('u-ma-19th-massachusetts-infantry', 'UX-\\SSIGXED', 'UNAS', 'the word UNASSIGNED with three letters damaged (U, S, S, I, G, E, D stand in order)'),
]
