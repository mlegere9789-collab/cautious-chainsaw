"""The 41 units of the work item conf-nc and where each one stands in Moore's Roster of North Carolina Troops (1882).

Moore numbers the regiments by the State Troops numbers; the Official Records name the cavalry and artillery by their own numbers, so the table
below carries both.  Every row says which volume, which section (regiment or battalion number as Moore prints it) and, for a company of a
regiment or battalion that is one battery or one company of the Official Records table, which company letter.

  OR designation                    Moore section                         basis of the identification
  --------------------------------  ------------------------------------  ----------------------------------------------------------
  Nth North Carolina Infantry       Nth Regiment -- Infantry              the same number (Moore prints the State Troops number)
  2nd North Carolina Battalion      Second Battalion -- Infantry          the same name
  1st North Carolina Cavalry        Ninth Regiment -- Cavalry             Moore: "Ninth Regiment (First Cavalry)" (running heads)
  2nd North Carolina Cavalry        Nineteenth Regiment -- Cavalry        Moore: "Nineteenth Regiment (Second Cavalry)"
  4th North Carolina Cavalry        Fifty-Ninth Regiment -- Cavalry       Moore: "Fifty-Ninth Regiment (Fourth Cavalry)"
  5th North Carolina Cavalry        Sixty-Third Regiment -- Cavalry       Moore: "Sixty-Third Regiment (Fifth Cavalry)"
  Battery A, 1st N.C. Artillery     Tenth Regiment -- Artillery, Co. A    captain Basil C. Manly in both (OR table "Manly")
  Rowan Artillery                   Tenth Regiment -- Artillery, Co. D    captain James Reilly in both (OR table "Rowan, Reilly")
  Branch Artillery                  Fifth Battalion -- Light Artillery,   captain Alexander C. Latham in both (OR table "Branch, Latham");
                                    Co. F                                 Moore prints the battalion as "originally the Thirteenth Battalion"
  Charlotte Artillery               Tenth Regiment -- Artillery, Co. C    OR 27 pt. 2 index (printed p. 1009, 1012): "Charlotte Artillery. See North
                                                                          Carolina Troops, 1st Regiment, Battery C" and "Graham's (Joseph) Artillery. See North
                                                                          Carolina Troops, Confederate, 1st Regiment, Battery C"; Moore's Company C names men of
                                                                          Mecklenburg county (Charlotte) first

Each identification that rests on a captain's name or on the counties of the men is a Moore-side inference and is marked as such in the report; the Official Records
index lines that name the battery of the 1st North Carolina Artillery are quoted there with their offsets.  It never rests on memory.
"""

# key, designation, arm, volume, section number, section kind, company filter ('' = the whole section: field and staff and every company)
UNITS = [
    ('c-nc-1st-north-carolina-infantry', '1st North Carolina Infantry', 'infantry', '1', 1, 'regiment', ''),
    ('c-nc-2nd-north-carolina-infantry', '2nd North Carolina Infantry', 'infantry', '1', 2, 'regiment', ''),
    ('c-nc-3rd-north-carolina-infantry', '3rd North Carolina Infantry', 'infantry', '1', 3, 'regiment', ''),
    ('c-nc-4th-north-carolina-infantry', '4th North Carolina Infantry', 'infantry', '1', 4, 'regiment', ''),
    ('c-nc-5th-north-carolina-infantry', '5th North Carolina Infantry', 'infantry', '1', 5, 'regiment', ''),
    ('c-nc-6th-north-carolina-infantry', '6th North Carolina Infantry', 'infantry', '1', 6, 'regiment', ''),
    ('c-nc-7th-north-carolina-infantry', '7th North Carolina Infantry', 'infantry', '1', 7, 'regiment', ''),
    ('c-nc-1st-north-carolina-cavalry', '1st North Carolina Cavalry', 'cavalry', '1', 9, 'regiment', ''),
    ('c-nc-battery-a-1st-north-carolina-artillery', 'Battery A, 1st North Carolina Artillery', 'artillery', '1', 10, 'regiment', 'A'),
    ('c-nc-rowan-artillery', 'Rowan Artillery', 'artillery', '1', 10, 'regiment', 'D'),
    ('c-nc-11th-north-carolina-infantry', '11th North Carolina Infantry', 'infantry', '1', 11, 'regiment', ''),
    ('c-nc-12th-north-carolina-infantry', '12th North Carolina Infantry', 'infantry', '1', 12, 'regiment', ''),
    ('c-nc-13th-north-carolina-infantry', '13th North Carolina Infantry', 'infantry', '1', 13, 'regiment', ''),
    ('c-nc-14th-north-carolina-infantry', '14th North Carolina Infantry', 'infantry', '1', 14, 'regiment', ''),
    ('c-nc-16th-north-carolina-infantry', '16th North Carolina Infantry', 'infantry', '2', 16, 'regiment', ''),
    ('c-nc-18th-north-carolina-infantry', '18th North Carolina Infantry', 'infantry', '2', 18, 'regiment', ''),
    ('c-nc-2nd-north-carolina-cavalry', '2nd North Carolina Cavalry', 'cavalry', '2', 19, 'regiment', ''),
    ('c-nc-20th-north-carolina-infantry', '20th North Carolina Infantry', 'infantry', '2', 20, 'regiment', ''),
    ('c-nc-21st-north-carolina-infantry', '21st North Carolina Infantry', 'infantry', '2', 21, 'regiment', ''),
    ('c-nc-22nd-north-carolina-infantry', '22nd North Carolina Infantry', 'infantry', '2', 22, 'regiment', ''),
    ('c-nc-23rd-north-carolina-infantry', '23rd North Carolina Infantry', 'infantry', '2', 23, 'regiment', ''),
    ('c-nc-26th-north-carolina-infantry', '26th North Carolina Infantry', 'infantry', '2', 26, 'regiment', ''),
    ('c-nc-28th-north-carolina-infantry', '28th North Carolina Infantry', 'infantry', '2', 28, 'regiment', ''),
    ('c-nc-30th-north-carolina-infantry', '30th North Carolina Infantry', 'infantry', '2', 30, 'regiment', ''),
    ('c-nc-32nd-north-carolina-infantry', '32nd North Carolina Infantry', 'infantry', '2', 32, 'regiment', ''),
    ('c-nc-33rd-north-carolina-infantry', '33rd North Carolina Infantry', 'infantry', '2', 33, 'regiment', ''),
    ('c-nc-34th-north-carolina-infantry', '34th North Carolina Infantry', 'infantry', '2', 34, 'regiment', ''),
    ('c-nc-37th-north-carolina-infantry', '37th North Carolina Infantry', 'infantry', '3', 37, 'regiment', ''),
    ('c-nc-38th-north-carolina-infantry', '38th North Carolina Infantry', 'infantry', '3', 38, 'regiment', ''),
    ('c-nc-43rd-north-carolina-infantry', '43rd North Carolina Infantry', 'infantry', '3', 43, 'regiment', ''),
    ('c-nc-45th-north-carolina-infantry', '45th North Carolina Infantry', 'infantry', '3', 45, 'regiment', ''),
    ('c-nc-47th-north-carolina-infantry', '47th North Carolina Infantry', 'infantry', '3', 47, 'regiment', ''),
    ('c-nc-52nd-north-carolina-infantry', '52nd North Carolina Infantry', 'infantry', '3', 52, 'regiment', ''),
    ('c-nc-53rd-north-carolina-infantry', '53rd North Carolina Infantry', 'infantry', '3', 53, 'regiment', ''),
    ('c-nc-55th-north-carolina-infantry', '55th North Carolina Infantry', 'infantry', '3', 55, 'regiment', ''),
    ('c-nc-57th-north-carolina-infantry', '57th North Carolina Infantry', 'infantry', '3', 57, 'regiment', ''),
    ('c-nc-4th-north-carolina-cavalry', '4th North Carolina Cavalry', 'cavalry', '3', 59, 'regiment', ''),
    ('c-nc-5th-north-carolina-cavalry', '5th North Carolina Cavalry', 'cavalry', '4', 63, 'regiment', ''),
    ('c-nc-2nd-north-carolina-battalion', '2nd North Carolina Battalion', 'infantry', '4', 2, 'battalion', ''),
    ('c-nc-branch-artillery', 'Branch Artillery', 'artillery', '4', 5, 'battalion', 'F'),
    ('c-nc-charlotte-artillery', 'Charlotte Artillery', 'artillery', '1', 10, 'regiment', 'C'),
]

UNIT = {u[0]: u for u in UNITS}
IDENT = {   # unit key -> basis of the identification with the Moore section (quoted in the report)
    'c-nc-battery-a-1st-north-carolina-artillery': 'OR 27 pt. 2 index: "Manly\'s (B. C.) Artillery. See North Carolina Troops, Confederate, 1st Regiment, Battery A"; Moore: Tenth Regiment (First Artillery), Company A, Captain Basil C. Manly',
    'c-nc-charlotte-artillery': 'OR 27 pt. 2 index: "Charlotte Artillery. See North Carolina Troops, 1st Regiment, Battery C" and "Graham\'s (Joseph) Artillery. See North Carolina Troops, Confederate, 1st Regiment, Battery C"; Moore: Tenth Regiment (First Artillery), Company C (the men printed are chiefly of Mecklenburg county; the officers list holds one captain, Arthur B. Williams: the roll of this company is partial)',
    'c-nc-rowan-artillery': 'OR 27 pt. 2 index: "Reilly\'s (James) Artillery. See Rowan Artillery"; Moore: Tenth Regiment (First Artillery), Company D, Captain James Reilly (OCR Rellly); 168 of the men printed with a county are of Rowan county',
    'c-nc-branch-artillery': 'OR 27 pt. 2 index: "Latham\'s (A. C.) Artillery. See Branch Artillery"; Moore: Fifth Battalion Light Artillery ("originally the Thirteenth Battalion"), Company F, Captain Alexander C. Latham',
}
EARLIER = {   # earlier roll file of data/C-NCLA (the second reading used for the reconciliation)
    'c-nc-1st-north-carolina-infantry': 'C-1NC', 'c-nc-2nd-north-carolina-infantry': 'C-2NC', 'c-nc-3rd-north-carolina-infantry': 'C-3NC', 'c-nc-4th-north-carolina-infantry': 'C-4NC',
    'c-nc-5th-north-carolina-infantry': 'C-5NC', 'c-nc-6th-north-carolina-infantry': 'C-6NC', 'c-nc-7th-north-carolina-infantry': 'C-7NC', 'c-nc-11th-north-carolina-infantry': 'C-11NC',
    'c-nc-12th-north-carolina-infantry': 'C-12NC', 'c-nc-13th-north-carolina-infantry': 'C-13NC', 'c-nc-14th-north-carolina-infantry': 'C-14NC', 'c-nc-16th-north-carolina-infantry': 'C-16NC',
    'c-nc-18th-north-carolina-infantry': 'C-18NC', 'c-nc-20th-north-carolina-infantry': 'C-20NC', 'c-nc-21st-north-carolina-infantry': 'C-21NC', 'c-nc-22nd-north-carolina-infantry': 'C-22NC',
    'c-nc-23rd-north-carolina-infantry': 'C-23NC', 'c-nc-26th-north-carolina-infantry': 'C-26NC', 'c-nc-28th-north-carolina-infantry': 'C-28NC', 'c-nc-30th-north-carolina-infantry': 'C-30NC',
    'c-nc-32nd-north-carolina-infantry': 'C-32NC', 'c-nc-33rd-north-carolina-infantry': 'C-33NC', 'c-nc-34th-north-carolina-infantry': 'C-34NC', 'c-nc-37th-north-carolina-infantry': 'C-37NC',
    'c-nc-38th-north-carolina-infantry': 'C-38NC-S', 'c-nc-43rd-north-carolina-infantry': 'C-43NC', 'c-nc-45th-north-carolina-infantry': 'C-45NC', 'c-nc-47th-north-carolina-infantry': 'C-47NC',
    'c-nc-52nd-north-carolina-infantry': 'C-52NC', 'c-nc-53rd-north-carolina-infantry': 'C-53NC', 'c-nc-55th-north-carolina-infantry': 'C-55NC', 'c-nc-57th-north-carolina-infantry': 'C-57NC',
    'c-nc-2nd-north-carolina-battalion': 'C-2NC-B', 'c-nc-battery-a-1st-north-carolina-artillery': 'C-ART-Manly', 'c-nc-rowan-artillery': 'C-ART-Reilly',
}
