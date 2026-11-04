"""Ledger E claims from New York at Gettysburg vol. 2, section NY2-S025 (pp. 806-844), which the OCR runs together: the 119th New York
dedication (address of Col. Theodore A. Dodge, the regiment's former officer, pp. 806-815), the 120th New York dedication (address of
Gen. George H. Sharpe, the regiment's first colonel, pp. 815-821; pp. 816-818 are badly damaged in the OCR, left margin lost) and the
121st New York (Sixth Corps, not an undrawn unit). Full section read 2026-10-30."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from positions_E_lib import add

S = 'NY2-S025'
U119 = 'us-11c-3d-krzyzanowski-119ny'
D = 'Col. Theodore A. Dodge (119th New York; dedication address)'
U120 = 'us-3c-2d-brewster-120ny'
SH = 'Gen. George H. Sharpe (first colonel of the 120th New York; dedication address, following "a careful paper lately prepared by Colonel Westbrook")'

# 119th New York, July 1
add(U119, 'movement', '(July 1, afternoon)', 'through yonder town out to the front; filed out into the orchard, then across the fields and fences to the monument', 'The 119th New York marched through the town out to the front with about 300 men under the colors, filed out into the orchard, rested a few minutes, then fell into line and advanced across the fields and fences to the monument spot (north of the town).',
    'NY2', S, "We marched through yonder town out here to the front", 'documented', author=D, date='1863-07-01',
    road='through the town to the front (street not named)', note='Road of approach to Gettysburg not given; only the passage through the town to the field. Strength "300 men under the colors".')
add(U119, 'engagement', 'a brief thirty minutes (July 1)', 'this spot (the monument, north of the town)', 'At the monument spot the enemy advanced on the 119th New York, and in a brief thirty minutes of deadly fire less than half the 300 (130) remained to answer the roll.',
    'NY2', S, "The enemy advanced upon us, and in a brief thirty minutes, so deadly was the fire", 'documented', author=D, date='1863-07-01',
    note='The monument location is in the commission caption of the inscription section (NY1 vol. 1 caption list); not restated in this address.')

# 120th New York (Excelsior Brigade, Brewster), July 2, from Sharpe's address pp. 819-821
add(U120, 'position', '(July 2, before 4 o’clock)', 'the Third Corps second position, thrown out in advance of the general line, with an angle at the Peach Orchard; the 120th on the left of Humphreys\' division', 'The 120th New York stood in the Third Corps second position (the line thrown forward from Cemetery Ridge toward the Emmitsburg Road, angle at the Peach Orchard), the left of Humphreys\' division line, Carr\'s brigade on its right holding the Emmitsburg Road.',
    'NY2', S, "His right held on to the Emmitsburg Road (that was Carr's Brigade)", 'documented', author=SH, date='1863-07-02', gaz='GZ-041',
    extra_quote="this undaunted left was the One hundred and twentieth Regiment",
    note="Sharpe quotes de Trobriand for the line; Sharpe was the regiment's own first colonel (on Meade's staff at the battle). OCR hyphen breaks ('Em- mitsburg', 'un- daunted') are the printed line breaks.")
add('us-3c-2d-carr', 'position', '(July 2, evening)', 'the Emmitsburg Road, the right of Humphreys\' division', "Carr's brigade formed the right of Humphreys' division holding on to the Emmitsburg Road while the 120th New York formed the left (Sharpe, quoting de Trobriand).",
    'NY2', S, "His right held on to the Emmitsburg Road (that was Carr's Brigade)", 'inferred', author=SH, date='1863-07-02', gaz='GZ-041',
    reasoning='Stated in the 120th New York address about another brigade, through a quotation of de Trobriand.', note='Not the brigade\'s own officers: tier inferred.')
add(U120, 'engagement', 'at 4 o’clock in the afternoon (July 2)', 'the Third Corps line in front of the Peach Orchard and the Emmitsburg Road', 'At 4 o\'clock in the afternoon of July 2 the bugle sounded for the advance of the Third Corps from the general line, and Longstreet\'s attack struck the corps, rolling up to the Peach Orchard and along the Emmitsburg Road to Codori\'s.',
    'NY2', S, "It was at 4 o’clock in the afternoon that the bugle sounded for the advance", 'documented', author=SH, t_iso='1863-07-02T16:00', date='1863-07-02')
add(U120, 'engagement', 'about 6 o’clock; until after 7 o’clock (July 2)', 'some fifty feet forward, behind a stone wall, left stark alone after the rest of the brigade and Burling\'s brigade were removed', 'About 6 o\'clock, when Graham\'s angle at the Peach Orchard broke and every other regiment of the brigade had been removed to support Graham, the 120th New York advanced some fifty feet to a stone wall, lay down, and held the line under Barksdale\'s advance until after 7 o\'clock, when another regiment took its place and it retired with Carr\'s brigade; Colonel Westbrook was wounded a second time in the withdrawal.',
    'NY2', S, "this regiment held the line until after 7 o’clock, when another regiment took its place", 'documented', author=SH, t_iso='1863-07-02T19:00', date='1863-07-02', approx=True,
    extra_quote="The One hundred and twentieth was left stark alone", note='Casualty remark: fewer than 100 men came unharmed out of the fire.')
add('us-3c-2d-brewster', 'movement', 'about 6 o’clock (July 2)', 'to the Peach Orchard, to support Graham', "To support Graham at the Peach Orchard, Burling's brigade and every regiment of Brewster's brigade except the 120th New York were removed, the last withdrawn being Burns with the Fourth Excelsior (73rd NY), who charged following Graham's lines, whose angle broke about 6 o'clock (Sharpe).",
    'NY2', S, "every regiment of our brigade, except our own, was removed", 'inferred', author=SH, date='1863-07-02', approx=True,
    reasoning='Stated in the 120th New York address about the rest of the brigade.', note='Not the brigade\'s own report: tier inferred. Agrees in outline with Brewster (OR).')
add('us-3c-2d-brewster-73ny', 'movement', 'about 6 o’clock (July 2)', 'forward toward the Peach Orchard, following the lines of Graham', "Burns with the Fourth Excelsior (73rd New York) was the last regiment withdrawn from Brewster's line to support Graham, charging the enemy with ringing cheers, following Graham's lines, whose angle broke about 6 o'clock (Sharpe).",
    'NY2', S, "the last withdrawn being Burns with the Fourth Excelsior", 'inferred', author=SH, date='1863-07-02', approx=True,
    reasoning='Stated in the 120th New York address about a sister regiment.', note='Not the regiment\'s own officers: tier inferred.')

# Army headquarters: Sharpe (Meade's staff) rode from Taneytown with the headquarters on the night of July 1-2; OCR of pp. 816-818 is badly damaged
add('us-aop-hq', 'march', 'before midnight (July 1); fourteen miles by 1 o’clock in the morning (July 2)', 'from Meade\'s tent (Taneytown) to the field: "fourteen miles by 1 o\'clock in the morning"', "Sharpe (Meade's staff) recalls that Meade, on Hancock's reply approving the Gettysburg line, mounted and rode with his staff: 'It was a moonlight night. We started before midnight,' covering fourteen miles by 1 o'clock in the morning (OCR of the sentence fragmentary).",
    'NY2', S, "It »\"as a moonlight night We started before midnight", 'inferred', author=SH, date='1863-07-01', t_iso=None, ocr_uncertain=True,
    reasoning="The OCR of pp. 816-818 lost the left margin; the sentence pieces 'We started before midnight' and 'of fourteen miles by i o'clock in the morning' are legible but their connecting words are not, so the claim is inferred and marked OCR-uncertain. The start point (Meade's tent at Taneytown) is read from the preceding fragments ('in a corner of General Meade's tent').",
    note="The '1 o'clock' is printed 'i o'clock' in the OCR; no t_iso stored because the sentence is broken. Meade's own report (OR) gives the arrival at Gettysburg about 1 a. m. July 2.", extra_quote="of fourteen miles by i o'clock in the morning")
print('done 11c_c')
