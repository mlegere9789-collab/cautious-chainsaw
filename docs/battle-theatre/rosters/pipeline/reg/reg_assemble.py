"""Officer-level files for the Regular Army units, the Delaware regiments, the commanders of the other REG units and the headquarters units.
Sources (all read as printed; nothing invented):
  OR   = Official Records Series I vol 27 part 1: 'Organization of the Army of the Potomac ... at the battle of Gettysburg' (No. 9, pp.155-168) and the index of reports
         (report numbers as printed in the volume's list of reports).  Text: IA warofrebellion012701rootrich (cached from the pilot).
  HEIT = Heitman, Historical Register 1903 (heitman_gettysburg_officers.csv made by heitman_gb.py).
  SEV  = Seville, History of the First Regiment Delaware Volunteers (1884), pp.79-90.
Every row is Present-Documented by PLAN rule 4 (named in an official report or a regimental history as present / commanding / hurt / killed there)
except where the evidence says otherwise.  The label is for the named officer only: it says nothing about the men of the unit."""
import csv, os, re, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from reg_common import *
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'docs', 'battle-theatre', 'rosters', 'data', 'REG')
ORORG = 'OR27-1-ORG'
ORREP = 'OR27-1-REPORTS'

# (unit_id, name as printed, rank as printed, evidence, source_id, locator)
OR_ROWS = [
 # Regular infantry, Fifth Corps Second Division (Ayres), First Brigade (Col. Hannibal Day)
 ('U-3US-1;U-3US-2', 'Henry W. Freedley', 'Capt.', 'organization table: 3d United States (six companies)', ORORG, 'OR 27/1 No.9, Fifth Army Corps, Second Division, First Brigade'),
 ('U-3US-1;U-3US-2', 'Richard G. Lay', 'Capt.', 'organization table: 3d United States (six companies)', ORORG, 'OR 27/1 No.9, Fifth Army Corps, Second Division, First Brigade'),
 ('U-3US-1;U-3US-2', 'Andrew Sheridan', 'Capt.', 'author of report No. 205, Third U. S. Infantry', ORREP, 'OR 27/1 report No.205'),
 ('U-4US', 'Julius W. Adams, jr.', 'Capt.', 'organization table: 4th United States (four companies); author of report No. 206', ORORG, 'OR 27/1 No.9, Fifth Army Corps, Second Division, First Brigade; report No.206'),
 ('U-6US', 'Levi C. Bootes', 'Capt.', 'organization table: 6th United States (five companies); author of report No. 207', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 1st Bde; report No.207'),
 ('U-6US', 'Hannibal Day', 'Col.', 'Colonel Sixth U. S. Infantry, commanding the First Brigade (Regulars), report No. 204', ORREP, 'OR 27/1 report No.204'),
 ('U-12US-1;U-12US-2', 'Thomas S. Dunn', 'Capt.', 'organization table: 12th United States (eight companies); author of report No. 208', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 1st Bde; report No.208'),
 ('U-14US', 'Grotius R. Giddings', 'Maj.', 'organization table: 14th United States (eight companies); author of report No. 210 (the 14th U.S. Infantry is not in the repository OOB)', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 1st Bde; report No.210'),
 ('U-14US', 'W. Harvey Brown', 'Capt.', 'author of report No. 209, Fourteenth U. S. Infantry', ORREP, 'OR 27/1 report No.209'),
 # Second Brigade (Col. Sidney Burbank)
 ('U-2US', 'Arthur T. Lee', 'Maj.', 'organization table: 2d United States (six companies); author of report No. 212', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde; report No.212'),
 ('U-2US', 'Samuel A. McKee', 'Capt.', 'organization table: 2d United States (six companies)', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde'),
 ('U-2US', 'Sidney Burbank', 'Col.', 'Colonel Second U. S. Infantry, commanding the Second Brigade (Regulars), report No. 211', ORREP, 'OR 27/1 report No.211'),
 ('U-7US', 'David P. Hancock', 'Capt.', 'organization table: 7th United States (four companies); author of report No. 213', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde; report No.213'),
 ('U-10US', 'William Clinton', 'Capt.', 'organization table: 10th United States (three companies); author of report No. 214', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde; report No.214'),
 ('U-11US', 'De Lancey Floyd-Jones', 'Maj.', 'organization table: 11th United States (six companies); author of report No. 215', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde; report No.215'),
 ('U-17US', 'J. Durell Greene', 'Lieut. Col.', 'organization table: 17th United States (seven companies); author of report No. 216', ORORG, 'OR 27/1 No.9 Fifth Corps 2d Div 2d Bde; report No.216'),
 # Regular cavalry, Reserve Brigade (Merritt)
 ('U-1US-CAV', 'Richard S. C. Lord', 'Capt.', 'organization table: 1st United States, Reserve Brigade', ORORG, 'OR 27/1 No.9 Cavalry Corps, First Division, Reserve Brigade'),
 ('U-2US-CAV', 'T. F. Rodenbough', 'Capt.', 'organization table: 2d United States, Reserve Brigade', ORORG, 'OR 27/1 No.9 Cavalry Corps, First Division, Reserve Brigade'),
 ('U-5US-CAV', 'Julius W. Mason', 'Capt.', 'organization table: 5th United States; author of report No. 341', ORORG, 'OR 27/1 No.9 Cavalry Corps, Reserve Brigade; report No.341'),
 ('U-6US-CAV', 'Samuel H. Starr', 'Maj.', 'organization table: 6th United States', ORORG, 'OR 27/1 No.9 Cavalry Corps, Reserve Brigade'),
 ('U-6US-CAV', 'Louis H. Carpenter', 'Lieut.', 'organization table: 6th United States', ORORG, 'OR 27/1 No.9 Cavalry Corps, Reserve Brigade'),
 ('U-6US-CAV', 'Nicholas Nolan', 'Lieut.', 'organization table: 6th United States; author of report No. 343', ORORG, 'OR 27/1 No.9 Cavalry Corps, Reserve Brigade; report No.343'),
 ('U-6US-CAV', 'George C. Cram', 'Capt.', 'author of report No. 342, Sixth U. S. Cavalry', ORREP, 'OR 27/1 report No.342'),
 # Regular batteries, as the organization table names them
 ('U-ART-B4US', 'James Stewart', 'Lieut.', 'organization table: 4th United States, Battery B, First Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 First Army Corps, Artillery Brigade'),
 ('U-ART-I1US', 'George A. Woodruff', 'Lieut.', 'organization table: 1st United States, Battery I, Second Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-I1US', 'Tully McCrea', 'Lieut.', 'organization table: 1st United States, Battery I', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-A4US', 'Alonzo H. Cushing', 'Lieut.', 'organization table: 4th United States, Battery A; Heitman lists him killed 3 July 1863 at Gettysburg', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-A4US', 'Frederick Fuger', 'Sergt.', 'organization table: 4th United States, Battery A', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-E4US-III', 'Francis W. Seeley', 'Lieut.', 'organization table: 4th United States, Battery K (the repository OOB lists this unit as Battery E, 4th US)', ORORG, 'OR 27/1 No.9 Third Army Corps, Artillery Brigade'),
 ('U-ART-E4US-III', 'Robert James', 'Lieut.', 'organization table: 4th United States, Battery K; author of report No. 186', ORORG, 'OR 27/1 No.9 Third Army Corps, Artillery Brigade; report No.186'),
 ('U-ART-D5US', 'Charles E. Hazlett', 'Lieut.', 'organization table: 5th United States, Battery D, Fifth Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Fifth Army Corps, Artillery Brigade'),
 ('U-ART-D5US', 'Benjamin F. Rittenhouse', 'Lieut.', 'organization table: 5th United States, Battery D', ORORG, 'OR 27/1 No.9 Fifth Army Corps, Artillery Brigade'),
 ('U-ART-D2US', 'Edward B. Williston', 'Lieut.', 'organization table: 2d United States, Battery D, Sixth Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Sixth Army Corps, Artillery Brigade'),
 ('U-ART-G2US', 'John H. Butler', 'Lieut.', 'organization table: 2d United States, Battery G', ORORG, 'OR 27/1 No.9 Sixth Army Corps, Artillery Brigade'),
 ('U-ART-F5US-VI', 'Leonard Martin', 'Lieut.', 'organization table: 5th United States, Battery F', ORORG, 'OR 27/1 No.9 Sixth Army Corps, Artillery Brigade'),
 ('U-ART-G4US', 'Bayard Wilkeson', 'Lieut.', 'organization table: 4th United States, Battery G, Eleventh Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Eleventh Army Corps, Artillery Brigade'),
 ('U-ART-G4US', 'Eugene A. Bancroft', 'Lieut.', 'organization table: 4th United States, Battery G; author of report No. 270', ORORG, 'OR 27/1 No.9 Eleventh Army Corps, Artillery Brigade; report No.270'),
 ('U-ART-G4US', 'Christopher F. Merkle', 'Lieut.', 'author of report No. 269, Battery G, Fourth U. S. Artillery', ORREP, 'OR 27/1 report No.269'),
 ('U-ART-F4US-XII', 'Sylvanus T. Rugg', 'Lieut.', 'organization table: 4th United States, Battery F, Twelfth Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Twelfth Army Corps, Artillery Brigade'),
 ('U-ART-K5US', 'David H. Kinzie', 'Lieut.', 'organization table: 5th United States, Battery K, Twelfth Corps Artillery Brigade', ORORG, 'OR 27/1 No.9 Twelfth Army Corps, Artillery Brigade'),
 ('U-ART-C4US', 'Evan Thomas', 'Lieut.', 'organization table: 4th United States, Battery C, First Regular Brigade, Artillery Reserve', ORORG, 'OR 27/1 No.9 Artillery Reserve, First Regular Brigade'),
 ('U-ART-C5US', 'Gulian V. Weir', 'Lieut.', 'organization table: 5th United States, Battery C; author of report No. 317', ORORG, 'OR 27/1 No.9 Artillery Reserve, First Regular Brigade; report No.317'),
 ('U-ART-F4US', 'Chandler P. Eakin', 'Lieut.', 'organization table names him with 1st United States, Battery H, First Regular Brigade (the repository OOB lists him under Battery F, 4th US: designation conflict, carried)', ORORG, 'OR 27/1 No.9 Artillery Reserve, First Regular Brigade'),
 ('U-ART-F4US', 'Philip D. Mason', 'Lieut.', 'organization table: 1st United States, Battery H (OOB designation conflict, see Eakin)', ORORG, 'OR 27/1 No.9 Artillery Reserve, First Regular Brigade'),
 # Horse artillery (Regular batteries)
 ('U-HAB-E4US', 'Samuel S. Elder', 'Lieut.', 'organization table: 4th United States, Battery E, First Brigade Horse Artillery (Robertson)', ORORG, 'OR 27/1 No.9 Cavalry Corps, Horse Artillery'),
 ('U-HAB-M2US', 'A. C. M. Pennington, jr.', 'Lieut.', 'organization table: 2d United States, Battery M', ORORG, 'OR 27/1 No.9 Cavalry Corps, Horse Artillery'),
 ('U-HAB-K1US', 'William M. Graham', 'Capt.', 'organization table: 1st United States, Battery K; author of report No. 373', ORORG, 'OR 27/1 No.9 Cavalry Corps, Horse Artillery; report No.373'),
 ('U-HAB-E1US', 'Alanson M. Randol', 'Capt.', 'organization table: 1st United States, Batteries E and G, Second Brigade Horse Artillery (Tidball)', ORORG, 'OR 27/1 No.9 Cavalry Corps, Horse Artillery'),
 ('U-HAB-A2US', 'John H. Calef', 'Lieut.', 'author of report No. 374, Battery A, Second U. S. Artillery (the organization table prints the battery as 3d US, OCR)', ORREP, 'OR 27/1 report No.374'),
 # Delaware
 ('U-2DE', 'William P. Baily', 'Col.', 'Colonel Second Delaware Infantry; author of report No. 93', ORREP, 'OR 27/1 report No.93'),
 ('U-2DE', 'Charles H. Christman', 'Capt.', 'organization table: 2d Delaware (commanding at the end of the battle)', ORORG, 'OR 27/1 No.9 Second Army Corps, First Division, Fourth Brigade'),
 ('U-1DE', 'Thomas A. Smyth', 'Col.', 'Colonel First Delaware Infantry, commanding the Second Brigade, Third Division; author of report No. 123', ORREP, 'OR 27/1 report No.123'),
 ('U-1DE', 'John T. Dent', 'Lieut.', 'First Delaware Infantry; author of report No. 125', ORREP, 'OR 27/1 report No.125'),
 # Maryland
 ('U-3MD', 'Joseph M. Sudsburg', 'Col.', 'Colonel Third Maryland Infantry; author of report No. 277', ORREP, 'OR 27/1 report No.277'),
 ('U-3MD', 'Gilbert P. Robinson', 'Lieut. Col.', 'Lieutenant Colonel Third Maryland Infantry; author of report No. 278', ORREP, 'OR 27/1 report No.278'),
 ('U-1MD-PHB', 'William P. Maulsby', 'Col.', 'Colonel First Potomac Home Brigade Maryland Infantry; author of report No. 283', ORREP, 'OR 27/1 report No.283'),
 ('U-1MD-EH', 'James Wallace', 'Col.', 'Colonel First Eastern Shore Maryland Infantry; author of report No. 284', ORREP, 'OR 27/1 report No.284'),
 ('U-1MD-CAV', 'James M. Deems', 'Lieut. Col.', 'organization table: 1st Maryland (eleven companies), First Brigade (Col. John B. McIntosh)', ORORG, 'OR 27/1 No.9 Cavalry Corps, Second Division, First Brigade'),
 ('U-Purnell-MD', 'Robert E. Duvall', 'Capt.', 'organization table: Purnell (Maryland) Legion, Company A (only Company A is organized in the Army of the Potomac)', ORORG, 'OR 27/1 No.9 Cavalry Corps, First Brigade (McIntosh)'),
 ('U-MD-BATT-A', 'James H. Rigby', 'Capt.', 'author of report No. 332, Battery A, Maryland Light Artillery (not in the repository OOB)', ORREP, 'OR 27/1 report No.332'),
 # Rhode Island
 ('U-2RI', 'Horatio Rogers, jr.', 'Col.', 'Colonel Second Rhode Island Infantry; author of report No. 233', ORREP, 'OR 27/1 report No.233'),
 ('U-ART-A1RI', 'William A. Arnold', 'Capt.', 'organization table: 1st Rhode Island Light, Battery A', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-B1RI', 'T. Fred. Brown', 'Lieut.', 'organization table: 1st Rhode Island Light, Battery B', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-B1RI', 'Walter S. Perrin', 'Lieut.', 'organization table: 1st Rhode Island Light, Battery B (Rhodes 1894 prints William S. Perrin: conflict carried)', ORORG, 'OR 27/1 No.9 Second Army Corps, Artillery Brigade'),
 ('U-ART-C1RI', 'Richard Waterman', 'Capt.', 'organization table: 1st Rhode Island Light, Battery C; author of report No. 241', ORORG, 'OR 27/1 No.9 Sixth Army Corps, Artillery Brigade; report No.241'),
 ('U-RI-BATT-G', 'George W. Adams', 'Capt.', 'organization table and report No. 242: 1st Rhode Island Light, Battery G (not in the repository OOB)', ORORG, 'OR 27/1 No.9 Sixth Army Corps, Artillery Brigade; report No.242'),
 ('U-RI-BATT-E', 'John K. Bucklyn', 'Lieut.', 'organization table: 1st Rhode Island Light, Battery E (not in the repository OOB)', ORORG, 'OR 27/1 No.9 Third Army Corps, Artillery Brigade'),
 ('U-RI-BATT-E', 'Benjamin Freeborn', 'Lieut.', 'organization table: Battery E; author of report No. 185 (not in the repository OOB)', ORORG, 'OR 27/1 No.9 Third Army Corps, Artillery Brigade; report No.185'),
 ('U-1RI-CAV', 'Alfred N. Duffie', 'Col.', 'Colonel First Rhode Island Cavalry, commanding Second Division and regiment; report No. 345 (not in the repository OOB)', ORREP, 'OR 27/1 report No.345'),
 ('U-1RI-CAV', 'Frank Allen', 'Capt.', 'author of report No. 346, First Rhode Island Cavalry (not in the repository OOB)', ORREP, 'OR 27/1 report No.346'),
 # West Virginia
 ('U-7WV', 'Jonathan H. Lockwood', 'Lieut. Col.', 'organization table: 7th West Virginia; author of report No. 122', ORORG, 'OR 27/1 No.9 Second Army Corps, Third Division, First Brigade; report No.122'),
 ('U-1WV-CAV', 'Nathaniel P. Richmond', 'Col.', 'organization table: 1st West Virginia (ten companies); commanding the First Brigade, Third Division; report No. 362', ORORG, 'OR 27/1 No.9 Cavalry Corps, Third Division; report No.362'),
 ('U-1WV-CAV', 'Charles E. Capehart', 'Maj.', 'organization table: 1st West Virginia; author of report No. 367', ORORG, 'OR 27/1 No.9 Cavalry Corps, Third Division; report No.367'),
 ('U-3WV-CAV', 'Seymour B. Conger', 'Capt.', 'organization table: 3d West Virginia (two companies)', ORORG, 'OR 27/1 No.9 Cavalry Corps, First Division, Second Brigade'),
 ('U-ART-CWV', 'Wallace Hill', 'Capt.', 'author of report No. 329, Battery C, First West Virginia Light Artillery', ORREP, 'OR 27/1 report No.329'),
 # Headquarters, provost, signal, engineers, ambulance, trains (no OOB entries exist for these)
 ('HQ-PROVOST', 'Marsena R. Patrick', 'Brig. Gen.', 'Provost-Marshal-General; author of report No. 25', ORREP, 'OR 27/1 No.9 General Headquarters; report No.25'),
 ('HQ-PROVOST', 'John S. Crocker', 'Col.', 'organization table: 93d New York (New York family unit; named here for the provost command)', ORORG, 'OR 27/1 No.9 General Headquarters, Provost-Marshal-General'),
 ('PROVOST-8US', 'Edwin W. H. Read', 'Capt.', 'organization table: 8th United States (eight companies), provost command (the 8th US Infantry is not in the repository OOB)', ORORG, 'OR 27/1 No.9 General Headquarters, Provost-Marshal-General'),
 ('HQ-PROVOST', 'R. Butler Price', 'Col.', 'organization table: 2d Pennsylvania Cavalry (Pennsylvania family unit)', ORORG, 'OR 27/1 No.9 General Headquarters, Provost-Marshal-General'),
 ('HQ-PROVOST', 'James Starr', 'Capt.', 'organization table: 6th Pennsylvania Cavalry, Companies E and I (Pennsylvania family unit)', ORORG, 'OR 27/1 No.9 General Headquarters, Provost-Marshal-General'),
 ('HQ-SIGNAL', 'Lemuel B. Norton', 'Capt.', 'Chief Signal Officer; author of report No. 17', ORREP, 'OR 27/1 No.9 General Headquarters, Signal Corps; report No.17'),
 ('HQ-SIGNAL', 'William J. L. Nicodemus', 'Capt.', 'Signal Officer; author of report No. 18', ORREP, 'OR 27/1 report No.18'),
 ('HQ-SIGNAL', 'Nahum Daniels', 'Capt.', 'Signal Officer; author of report No. 19', ORREP, 'OR 27/1 report No.19'),
 ('HQ-SIGNAL', 'William G. McCreary', 'Capt.', 'Signal Officer; author of report No. 20', ORREP, 'OR 27/1 report No.20'),
 ('HQ-SIGNAL', 'George A. Fisher', 'Lieut.', 'Acting Signal Officer; author of report No. 21', ORREP, 'OR 27/1 report No.21'),
 ('HQ-SIGNAL', 'Ephraim A. Briggs', 'Lieut.', 'Acting Signal Officer; author of report No. 22 (printed Ephrairn)', ORREP, 'OR 27/1 report No.22'),
 ('HQ-SIGNAL', 'Julius M. Swain', 'Lieut.', 'Acting Signal Officer; author of report No. 23', ORREP, 'OR 27/1 report No.23'),
 ('HQ-ENGINEER', 'Henry W. Benham', 'Brig. Gen.', 'commanding the Engineer Brigade; author of report No. 27', ORREP, 'OR 27/1 No.9 General Headquarters, Engineer Brigade; report No.27'),
 ('HQ-ENGINEER', 'George H. Mendell', 'Capt.', 'organization table: United States Battalion (Engineer Brigade) (not in the repository OOB)', ORORG, 'OR 27/1 No.9 General Headquarters, Engineer Brigade'),
 ('HQ-ENGINEER', 'Walter L. Cassin', 'Maj.', 'organization table: 15th New York (three companies), Engineer Brigade (New York family unit)', ORORG, 'OR 27/1 No.9 General Headquarters, Engineer Brigade'),
 ('HQ-ENGINEER', 'William H. Pettes', 'Col.', 'organization table: 50th New York, Engineer Brigade (New York family unit)', ORORG, 'OR 27/1 No.9 General Headquarters, Engineer Brigade'),
 ('HQ-GUARDS', 'Daniel P. Harm', 'Capt.', 'organization table: Oneida (New York) Cavalry, guards and orderlies (surname as printed in the OCR text; check the page image)', ORORG, 'OR 27/1 No.9 General Headquarters, Guards and Orderlies'),
 ('HQ-ARTILLERY', 'Henry J. Hunt', 'Brig. Gen.', 'Chief of Artillery; author of report No. 28', ORREP, 'OR 27/1 No.9 General Headquarters, Artillery; report No.28'),
 ('HQ-MEDICAL', 'Jonathan Letterman', 'Surg.', 'Medical Director, Army of the Potomac; author of report No. 16', ORREP, 'OR 27/1 report No.16'),
 ('HQ-QM-TRAINS', 'Rufus Ingalls', 'Brig. Gen.', 'Chief Quartermaster; author of report No. 24', ORREP, 'OR 27/1 report No.24'),
 ('HQ-ORDNANCE', 'John R. Edie', 'Lieut.', 'Acting Chief Ordnance Officer; author of report No. 26', ORREP, 'OR 27/1 report No.26'),
 ('HQ-AMBULANCE', 'James A. Bates', 'Capt.', 'Chief Ambulance Officer, Fifth Corps; author of report No. 188', ORREP, 'OR 27/1 report No.188'),
 ('HQ-AMBULANCE', 'Joseph C. Ayer', 'Lieut.', 'Chief Ambulance Officer, First Division (Fifth Corps); author of report No. 191', ORREP, 'OR 27/1 report No.191'),
 ('HQ-TRAINS', 'Charles Ewing', 'Maj.', 'Train Guard (4th New Jersey Infantry); author of report No. 335', ORREP, 'OR 27/1 report No.335'),
]

SEV = 'DE-SEVILLE-1884'
SEV_ROWS = [  # (name as printed, rank, company, label, evidence, locator)
 ('Edward P. Harris', 'Lieut. Col.', '', 'Present-Documented', 'commanded the regiment on 2 July; placed in arrest by General Hancock for withdrawing the right wing from the skirmish line; restored to command 4 July', 'Seville 1884 pp.82-89 (djvu txt)'),
 ('Thomas B. Hizar', 'Capt.', 'I', 'Present-Documented', 'commanded the regiment after Harris; wounded on 2 July', 'Seville 1884 pp.82-89'),
 ('M. W. B. Ellegood', 'Capt.', 'E', 'Present-Documented', 'killed on the skirmish line on 2 July', 'Seville 1884 pp.82-89'),
 ('William Smith', 'Lieut.', 'A', 'Present-Documented', 'commanded the regiment, killed (mortally wounded) in the charge on 3 July carrying a captured flag', 'Seville 1884 pp.82-89'),
 ('John T. Dent', 'Lieut.', 'G', 'Present-Documented', 'took command after Smith fell; later Major; author of the regiment report', 'Seville 1884 pp.82-89'),
 ('Andrew Wall', 'First Lieut.', '', 'Present-Documented', 'not on duty but present on the field, named in Dent report', 'Seville 1884 p.89'),
 ('James Parke Postles', 'Capt.', '', 'Present-Documented', 'acting assistant inspector general of the brigade; carried Hays order to burn the house and barn', 'Seville 1884 p.84; Smyth report'),
 ('William P. Seville', 'Lieut.', '', 'Present-Documented', 'acting assistant adjutant general of the brigade, named in Smyth report', 'Seville 1884 p.88 (Smyth report)'),
 ('John M. Dunn', 'Color-Sergeant', '', 'Present-Documented', 'led the regiment across the wall with the national flag', 'Seville 1884 p.89'),
 ('Thomas Seymour', 'Color-Sergeant', 'B', 'Present-Documented', 'color-sergeant cut in two by a shell; muster-out rolls list him killed at Gettysburg', 'Seville 1884 pp.89-90'),
 ('William Williams', 'Private', 'A', 'Present-Documented', 'captured a flag; muster-out rolls list him killed at Gettysburg', 'Seville 1884 pp.89-90'),
 ('B. McCarren', 'Private', 'C', 'Present-Documented', 'captured a flag', 'Seville 1884 p.89'),
 ('J. B. Mayberry', 'Private', 'F', 'Present-Documented', 'captured a flag', 'Seville 1884 p.89'),
 ('Adam Huhn', 'Corporal', 'A', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('James Simpson', 'Private', 'B', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('James Dougherty', 'Private', 'C', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('William D. Dorsey', 'Private', 'D', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('John Shulty', 'Private', 'D', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('Thomas P. Carey', 'Private', 'E', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('John Stein', 'Corporal', 'H', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('John S. Black', 'Private', 'K', 'Present-Documented', 'killed at Gettysburg (muster-out rolls)', 'Seville 1884 p.90'),
 ('Benjamin B. Sempler', 'Sergeant', 'E', 'Present-Documented', 'died afterwards of wounds received at Gettysburg', 'Seville 1884 p.90'),
 ('David M. Sempler', 'Sergeant', 'E', 'Present-Documented', 'died afterwards of wounds received at Gettysburg', 'Seville 1884 p.90'),
 ('Wellington G. Lloyd', 'Sergeant', 'G', 'Present-Documented', 'died afterwards of wounds received at Gettysburg', 'Seville 1884 p.90'),
 ('Woodall', 'Major', '', 'Absent-Documented', 'Seville says Major Woodall was absent, wounded, when the regiment entered the engagement at Gettysburg (given name not stated in the passage)', 'Seville 1884 p.82'),
]

SMITH_ROWS = [('William H. Brady', 'First Lieut.', 'I', 'Present-Documented', 'wounded at the battle of Gettysburg on 2 July 1863, soon returned to duty (Smith 1909, officer sketch)', 'Smith 1909 pp.28-29 (djvu txt)')]
ROSTER_FILES = {'u-3md', 'u-1md-eh', 'u-1md-phb', 'u-1md-cav', 'u-purnell-md', 'u-2ri', 'u-art-a1ri', 'u-art-b1ri', 'u-7wv', 'u-1wv-cav', 'u-3wv-cav', 'u-art-cwv'}
HEIT = os.path.join(OUT, 'heitman_gettysburg_officers.csv')


def surname_key(n):
    t = re.sub(r'[^A-Za-z ,]', '', n).lower()
    if ',' in t:
        s, g = t.split(',', 1)
        return s.strip() + ' ' + (g.strip()[:1])
    parts = t.split()
    return (parts[-1] if parts else '') + ' ' + (parts[0][:1] if parts else '')


def name_parts(n):
    """(surname, [given tokens]) from 'Surname, Given M.' or 'Given M. Surname' (case and punctuation ignored)."""
    n = re.sub(r"[^A-Za-z' ,\-]", ' ', n)
    if ',' in n:
        s, g = n.split(',', 1)
    else:
        parts = n.split()
        s, g = (parts[-1], ' '.join(parts[:-1])) if parts else ('', '')
    return s.strip().lower(), [x.lower() for x in g.replace(',', ' ').split() if x]


def names_compatible(a, b):
    sa, ga = name_parts(a)
    sb, gb = name_parts(b)
    if sa != sb:
        return False
    if not ga or not gb:
        return True
    fa, fb = ga[0], gb[0]
    if len(fa) == 1 or len(fb) == 1:
        if fa[0] != fb[0]:
            return False
    elif fa[:4] != fb[:4]:
        return False
    ma = [x for x in ga[1:] if x not in ('jr',)]
    mb = [x for x in gb[1:] if x not in ('jr',)]
    if ma and mb and ma[0][0] != mb[0][0]:
        return False
    return True


def row(uid, regiment, name, rank, label, basis, rs, src, loc, flags='', section='officers', remarks=''):
    return dict(unit_id=uid, regiment=regiment, company='', section=section, name_as_printed=name, rank_as_printed=rank, residence='', age='', date_in='', date_out='',
                remarks_as_printed=remarks, presence_label=label, presence_basis=basis, roll_status=rs, source_id=src, source_locator=loc, parse_flags=flags)


UNIT_NAMES = {
    'U-2US': '2nd United States Infantry', 'U-3US-1': '3rd United States Infantry (1st Battalion; regiment-level rows, battalion not resolved)',
    'U-3US-2': '3rd United States Infantry (2nd Battalion; regiment-level rows, battalion not resolved)', 'U-4US': '4th United States Infantry',
    'U-6US': '6th United States Infantry', 'U-7US': '7th United States Infantry', 'U-10US': '10th United States Infantry', 'U-11US': '11th United States Infantry',
    'U-12US-1': '12th United States Infantry (1st Battalion; regiment-level rows, battalion not resolved)', 'U-12US-2': '12th United States Infantry (2nd Battalion; regiment-level rows, battalion not resolved)',
    'U-17US': '17th United States Infantry', 'U-14US': '14th United States Infantry (not in the repository OOB)',
    'U-1US-CAV': '1st United States Cavalry', 'U-2US-CAV': '2nd United States Cavalry', 'U-5US-CAV': '5th United States Cavalry', 'U-6US-CAV': '6th United States Cavalry',
    'U-1DE': '1st Delaware Infantry', 'U-2DE': '2nd Delaware Infantry', 'U-1MD-PHB': '1st Maryland Potomac Home Brigade Infantry',
    'PROVOST-8US': '8th United States Infantry (provost command; not in the repository OOB)',
    'U-MD-BATT-A': 'Battery A, Maryland Light Artillery (Rigby; not in the repository OOB)',
    'U-RI-BATT-G': 'Battery G, 1st Rhode Island Light Artillery (not in the repository OOB)', 'U-RI-BATT-E': 'Battery E, 1st Rhode Island Light Artillery (not in the repository OOB)',
    'U-1RI-CAV': '1st Rhode Island Cavalry (not in the repository OOB)',
    'HQ-PROVOST': 'Provost Marshal General command', 'HQ-SIGNAL': 'Signal Corps', 'HQ-ENGINEER': 'Engineer Brigade', 'HQ-GUARDS': 'Headquarters guards and orderlies',
    'HQ-ARTILLERY': 'Chief of Artillery, headquarters', 'HQ-MEDICAL': 'Medical Director, headquarters', 'HQ-QM-TRAINS': 'Quartermaster, wagon trains',
    'HQ-ORDNANCE': 'Ordnance, headquarters', 'HQ-AMBULANCE': 'Ambulance corps', 'HQ-TRAINS': 'Train guard',
}


def main():
    for f in os.listdir(OUT):  # remove outputs of an earlier assemble run so nothing stale survives
        if f.endswith('.csv') and f[:-4] not in ROSTER_FILES and f != 'heitman_gettysburg_officers.csv':
            os.remove(os.path.join(OUT, f))
    per = collections.defaultdict(list)
    # existing roster CSVs (MD, RI, WV) get the OR commanders appended: handled by adding rows to their files if the officer is not already there
    for ids, name, rank, ev, src, loc in OR_ROWS:
        for uid in ids.split(';'):
            per[uid].append(row(uid, UNIT_NAMES.get(uid, ''), name, rank, 'Present-Documented', 'OFFICER-HISTORY: ' + ev, 'named-present', src, loc,
                                flags='battalion-unresolved' if uid in ('U-3US-1', 'U-3US-2', 'U-12US-1', 'U-12US-2') else '', section='officers'))
    # Heitman
    if os.path.exists(HEIT):
        for r in csv.DictReader(open(HEIT, encoding='utf-8')):
            if not r['unit_ids']:
                continue
            for uid in r['unit_ids'].split(';'):
                if uid.startswith('ART-'):
                    uid = 'REG-ART-' + uid[4:]
                lab = 'Present-Documented'
                ev = r['event']
                basis = 'OFFICER-HISTORY (Heitman): %s - %s' % (ev, r['evidence'][:150])
                if ev in ('wounded', 'killed', 'wounded and prisoner') or 'killed' in ev or 'wounded' in ev:
                    basis = 'CAS-REMARK (Heitman Part III/II): ' + r['evidence'][:150]
                per[uid].append(row(uid, UNIT_NAMES.get(uid, 'Regular Army artillery regiment (battery not stated by Heitman)' if uid.startswith('REG-ART') else ''), r['name'], r['rank_at_event'], lab, basis, 'named-present',
                                    'HEITMAN-1903', r['source'], flags='battalion-unresolved' if uid in ('U-3US-1', 'U-3US-2', 'U-12US-1', 'U-12US-2') else ('battery-unresolved' if uid.startswith('REG-ART') else ''), section='officers'))
    for name, rank, co, lab, ev, loc in SEV_ROWS:
        uid = 'U-1DE'
        per[uid].append(row(uid, UNIT_NAMES[uid], name, rank, lab, ('OFFICER-HISTORY: ' if lab.startswith('Present') else 'ABS-NOTATION: ') + ev, 'named-present' if lab.startswith('Present') else 'off-roll-before-battle', SEV, loc, section='officers' if rank not in ('Private', 'Corporal', 'Sergeant') else 'roll').copy() | {'company': co})
    for name, rank, co, lab, ev, loc in SMITH_ROWS:
        per['U-2DE'].append(dict(row('U-2DE', '2nd Delaware Infantry', name, rank, lab, 'CAS-REMARK: ' + ev, 'named-present', 'DE-SMITH-1909', loc), company=co))
    # write: per-unit CSVs.  Dedupe by (surname-initial key) keeping every distinct evidence as extra rows only when the source differs.
    stats = {}
    for uid, rows in per.items():
        # AUDIT 2026-10-30 (defect A1): the first version merged every pair of officers with the same surname and first initial and
        # silently dropped the second when the source was the same (two different men lost).  Merge only when the names are compatible.
        seen = collections.OrderedDict()
        for r in rows:
            k = None
            for k2 in seen:
                if names_compatible(k2, r['name_as_printed']):
                    k = k2
                    break
            if k is not None:
                prev = seen[k]
                if r['source_id'] not in prev['source_id']:
                    prev['source_id'] += '|' + r['source_id']
                    prev['source_locator'] += ' | ' + r['source_locator']
                    prev['presence_basis'] += ' || ' + r['presence_basis']
                continue
            seen[r['name_as_printed']] = r
        out = list(seen.values())
        path = os.path.join(OUT, slug(uid) + '.csv')
        # roster CSVs that already exist (MD/RI/WV/RI batteries): commanders go to a separate officers file so the parsed roll is never overwritten
        if slug(uid) in ROSTER_FILES:
            path = os.path.join(OUT, slug(uid) + '-officers.csv')
        write_csv(path, out)
        stats[uid] = (os.path.basename(path), len(out))
    return stats


if __name__ == '__main__':
    st = main()
    for k, v in sorted(st.items()):
        print(k, v)
