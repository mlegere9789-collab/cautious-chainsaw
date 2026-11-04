"""Specs for docs/battle-theatre/drill/drill_hardee.json and drill_compare.json (Hardee, Rifle and Light Infantry Tactics, 1861 printings,
compared with Casey, Infantry Tactics, 1862).

Method (same discipline as drill_data_inf.py):
  * every cited passage has one verbatim OCR phrase (<15 words, found by exact match in the whitespace-normalised OCR text), its OCR line,
    the printed page recovered from the running heads (confidence stated) and an own-words paraphrase;
  * Hardee is cited from HARDEE-1861b (Richmond, J. W. Randolph, 1861: legible running heads) and, where the OCR allows, a second witness phrase
    from HARDEE-1861a (Memphis 1861, complete in one volume, poor OCR, no usable page numbers);
  * a comparison ROW names the Hardee passage and the Casey passage by OCR line windows; the builder computes the letters-only similarity of the
    two windows and the content words that have no near match on the other side; the checker recomputes both.
      identical   = similarity >= 0.80, few unmatched real words and not too many unmatched OCR-garbled tokens (drill_paras.is_identical);
      differs     = at least one phrase that occurs in one window and not in the other (each verified in the OCR);
      absent_*    = a phrase in one manual, and a regular expression with zero hits in every OCR text of the other manual;
      unsettled   = the OCR does not allow a decision (stated).
  * paragraph numbers are the manual's own: Hardee's S.S. paras 128-310 correspond to Casey's S.S. paras 135-318 (Casey = Hardee + 7 to para 186, + 9 after
    the two inserted paragraphs 194-195); S.C., skirmisher paragraphs keep one numbering; Casey's S.B. paras = Hardee's + 6.

Window syntax: ('SS', lo, hi) = every numbered paragraph lo..hi of that section window (drill_paras.SECTIONS); ('L', first, last) = OCR lines
(Casey side: ('L', first, last, 'CASEY-1862-2') for volume 2).  A side may be a list of windows (their texts are joined).
"""
import drill_data_inf as INF

H, HA, C1, C2, NY = 'HARDEE-1861b', 'HARDEE-1861a', 'CASEY-1862-1', 'CASEY-1862-2', 'NY-GB-1900'

DOC = ("Hardee's Rifle and Light Infantry Tactics (War Department, adopted 29 March 1855; cited from the Richmond 1861 printing, vol. 1 Schools of the "
       "Soldier and Company and Instruction for Skirmishers, vol. 2 School of the Battalion, with the Memphis 1861 one-volume printing as a second "
       "OCR witness) and the passages of Casey's Infantry Tactics (1862) that are set against it in drill_compare.json. Same method as "
       "drill_infantry.json: manual id, printed page (from OCR running heads, confidence stated), verbatim OCR phrase (<15 words) checked by "
       "tools/bt/drill_check.py, own-words paraphrase. Items are tier=documented (primary manual text, OCR-verified); the OCR is raw and uncorrected, "
       "no page image was inspected.")

COMPARE_DOC = ("Item-by-item comparison of Hardee (1861 printings of the 1855 text) with Casey (1862), settling PDF gap G19 'Hardee vs Casey differences' "
               "for the loading and firing drill, the bayonet drill, the firings of company and battalion, the skirmisher instruction and the "
               "bugle/drum calls. Each row cites both manuals (item ids resolve in drill_hardee.json / drill_infantry.json), gives the OCR line windows of "
               "the two passages compared, and the machine-recomputed similarity. Statuses: identical (same wording apart from OCR noise), differs "
               "(phrases that occur on one side only), absent_hardee / absent_casey (present in one manual and a regex finds nothing in the other), "
               "unsettled (OCR does not allow a decision).")

# front matter without a printed page number
FM_B = lambda line, text, why: {'page': 'unnumbered (front matter)', 'confidence': 'none', 'basis_line': line, 'basis_text': text, 'relation': 'preceding', 'why': why}
NY363 = {'page': 363, 'confidence': 'medium', 'basis_line': 23603, 'basis_text': 'GETTYSBURG. 363', 'relation': 'preceding',
         'why': 'running head "NEw YORK AT GETTYSBURG. 363" (OCR line 23603) precedes the passage; the next legible head is not within 25 lines, so page 363 is likely but not certain'}


def R(id, topic, h, c, status, href, cref, says=None, **kw):
    d = {'id': id, 'topic': topic, 'h': h, 'c': c, 'status': status, 'href': href, 'cref': cref, 'says': says}
    d.update(kw)
    return d


# Bugle calls: (Casey number, Hardee number or None, name, regex for Hardee's (damaged) OCR line or None if illegible/missing, regex for Casey's OCR line)
CALLS_GENERAL = [
    (1, 1, 'Attention', r'Attention\.', r'Attention'),
    (2, None, 'Signal of execution', None, r'Signal of execution'),
    (3, 2, 'The general', r'The general\.', r'the general'),
    (4, 3, 'The assembly', r'The assembl', r'The assembly'),
    (5, 4, 'To the color', r'To the C\w+', r'To the color'),
    (6, 5, 'The recall', r'The recall', r'The recall'),
    (7, 6, 'Quick time', r'Quick time', r'Quick time'),
    (8, 7, 'Double quick time', r'Double quick t\w+', r'Double quich tim'),
    (9, 8, 'The charge', r'The charge', r'The charge'),
    (10, 9, 'The reveille', r'The reveille', r'The reveille'),
    (11, 10, 'Retreat', r'Retreat', r'Retreat'),
    (12, 11, 'Tattoo', r'Tattoo', r'Tattoo'),
    (13, 12, 'To extinguish lights', r'extinguish lights', r'To extinguish lights'),
    (14, 13, 'Assembly of the buglers', r'Assembly of the buglers', r'Assembly of the bugles'),
    (15, 14, 'Assembly of the guard', r'of the guar', r'Assembly of the guard'),
    (16, 15, 'Orders for orderly sergeants', r'Orders for order', r'Orders for orderly sergeants'),
    (17, 16, 'For officers to take their places in line after firing', r'For officers to take their', r'For officers to take their places in line after'),
    (18, 17, 'The disperse', r'The disperse', r'The disperse'),
    (19, 18, "Officers' call", r"Officers' call", r'Offi\S+ call'),
    (20, 19, 'Breakfast call', r'Breakfast call', r'Breakfast call'),
    (21, 20, 'Dinner call', r'Dinner call', r'Dinner call'),
    (22, 21, 'Sick call', r'Sick call', r'Sic\w+ call'),
    (23, 22, 'Fatigue call', r'Fatigue call', r'Fatigue call'),
    (24, 23, 'Church call', r'C\w*urch call', r'Church call'),
    (25, 24, 'Drill call', None, r'Drill call'),
    (26, 25, 'School call', r'School\s+rail', r'School call'),
]
CALLS_SKIRM = [
    (1, 1, 'Fix bayonet', r'F\S*\s+bagonet', r'Fix bayonet'),
    (2, 2, 'Unfix bayonet', r'nfi\.r\s+bayonet', r'Unfix bayonet'),
    (3, 3, 'Quick time', r'Quick time', r'Quich time'),
    (4, 4, 'Double quick time', r'Double \S+ time', r'Double quick time'),
    (5, None, 'The run', None, r'The run'),
    (6, 6, 'Deploy as skirmishers', r'Deplog as skirmishers', r'Deploy as s\w+'),
    (7, 7, 'Forward', r'Forirard', r'Forward'),
    (8, 8, 'In retreat', r'retreat', r'In retreat'),
    (9, 9, 'Halt', None, r'Ealt'),
    (10, 10, 'By the right flank', r'right flank', r'By the right flan'),
    (11, 11, 'By the left flank', r'left flank', r'By the left flank'),
    (12, 12, 'Commence firing', r'Com ineiice', r'Commence firing'),
    (13, 13, 'Cease firing', r'Cease Jiring', r'Cease firing'),
    (14, 14, 'Change direction to the right', r'Change direction to the right', r'Change direction to the right'),
    (15, 15, 'Change direction to the left', r'Change direction to the left', r'Change direction to the lefU'),
    (16, 16, 'Lie down', r'doivn', r'Lie down'),
    (17, 17, 'Rise up', None, r'Rise up'),
    (18, 18, 'Rally by fours', r'Rally by fours', r'Rally by fours'),
    (19, 19, 'Rally by sections', r'Rally by sections', r'Bally by sections'),
    (20, 20, 'Rally by platoons', r'Rally by platoons', r'Bally by platoons'),
    (21, 21, 'Rally on the reserve', r'on \S+ reserve', r'on the reserve'),
    (22, 22, 'Rally on the battalion', r'on \S+ battalion', r'on the battalion'),
    (23, 23, 'Assemble on the battalion', r'Assemble on the battalion', r'Assemble on the battalion'),
]


ROWS = [
    # ---------------------------------------------------------------- School of the Soldier, part II: general rules and the nine loading times
    R('CMP-S01', 'cadence', ('SS', 128, 131), ('SS', 135, 138), 'identical', 'S.S. paras 128-131', 'S.S. paras 135-138',
      'Every command of the manual of arms is one time, split into numbered motions; each motion runs at one ninetieth of a minute, except the cartridge, rammer and (un)fixing-bayonet motions, which have no fixed cadence '
      'and are done promptly and regularly; the last syllable of the command triggers motion one and the spoken two, three, four trigger the later motions.',
      rate='1/90 minute per motion; no fixed cadence for cartridge, rammer, bayonet motions'),
    R('CMP-S02', 'load_in_nine_times', ('SS', 156, 156), ('SS', 163, 163), 'differs', 'S.S. para 156 (time 1: Load)', 'S.S. para 163 (time 1: Load)',
      says_h='Time 1 "Load" (one time, one motion): left hand grasps the piece as high as the right elbow, piece brought vertical in front of the body, right hand shifted to the upper band, butt placed between the feet, barrel to the front, '
             'left hand seizes the piece near the muzzle (3 in. from the body), right hand to the cartridge box. Only one muzzle distance is given.',
      says_c='Same words as Hardee for time 1 (muzzle 3 in. from the body), then Casey adds a rifle-musket alternative: right hand shifted to just below the upper band and the muzzle 8 in. from the body.',
      only_c=['If the rifle musket is used the right hand will be shifted', 'The muzzle will be eight inches from the body.'],
      hextra={'seq': 1, 'command': 'Load', 'times_motions': 'one time, one motion',
              'piece': 'vertical in front of the body, butt between the feet, barrel to the front, muzzle 3 in. from the body',
              'hands': 'left near the muzzle (after shifting), right to the cartridge box'},
      diff='Casey adds the rifle-musket variant (right hand just below the upper band, muzzle 8 in. from the body); Hardee has no musket variant.'),
    R('CMP-S03', 'load_in_nine_times', ('SS', 157, 157), ('SS', 164, 164), 'identical', 'S.S. para 157 (time 2: Handle cartridge)', 'S.S. para 164 (time 2: Handle cartridge)',
      'Time 2 "Handle cartridge": the right hand seizes the cartridge with the thumb and next two fingers and places it between the teeth.',
      hph='fingers, and place it between the teeth.',
      hextra={'seq': 2, 'command': 'Handle cartridge', 'times_motions': 'one time, one motion', 'piece': 'unchanged (vertical, held by the left hand at the muzzle)', 'hands': 'right hand: cartridge to the teeth'}),
    R('CMP-S04', 'load_in_nine_times', ('SS', 158, 158), [('SS', 165, 165), ('SS', 194, 194)], 'differs', 'S.S. para 158 (time 3: Tear cartridge) and its footnote', 'S.S. para 165 (time 3) and para 194',
      says_h='Time 3 "Tear cartridge": paper torn to the powder, cartridge held upright between thumb and first two fingers in front of and near the muzzle, back of the hand to the front. A footnote says that whenever loading or firing is to be done the instructor has the cartridge boxes brought to the front.',
      says_c='Time 3 is worded the same, but the cartridge-box rule is no longer a footnote: it is numbered para 194 and applies when the boxes are slung on the waist-belt (a belt-slung box has to be shifted to the front before drill).',
      only_c=['are slung upon the waist-belt'], only_h=['the cartridge boxes to be brought to the front'],
      hextra={'seq': 3, 'command': 'Tear cartridge', 'times_motions': 'one time, one motion', 'piece': 'vertical, muzzle up, left hand at the muzzle', 'hands': 'right hand holds the torn cartridge upright in front of the muzzle'},
      diff='Hardee: unconditional footnote on the cartridge boxes; Casey: numbered paragraph conditioned on boxes slung upon the waist-belt.'),
    R('CMP-S05', 'load_in_nine_times', ('SS', 159, 159), ('SS', 166, 166), 'identical', 'S.S. para 159 (time 4: Charge cartridge)', 'S.S. para 166 (time 4: Charge cartridge)',
      'Time 4 "Charge cartridge": powder emptied into the barrel; the ball disengaged from the paper, inserted pointed end uppermost and pressed down with the right thumb; the right hand then seizes the head of the rammer, elbows near the body.',
      hextra={'seq': 4, 'command': 'Charge cartridge', 'times_motions': 'one time, one motion', 'piece': 'vertical, muzzle up', 'hands': 'right hand: powder in, ball in point up, then to the rammer head'}),
    R('CMP-S06', 'load_in_nine_times', ('SS', 160, 162), ('SS', 167, 169), 'identical', 'S.S. paras 160-162 (time 5: Draw rammer; three motions)', 'S.S. paras 167-169 (time 5: Draw rammer; three motions)',
      'Time 5 "Draw rammer" (one time, three motions): (1) half draw the rammer by extending the right arm, steady it with the left thumb, regrasp near the muzzle; (2) clear it from the pipes by extending the arm again; (3) turn it, small end passing near the left shoulder, and place its head on the ball.',
      hextra={'seq': 5, 'command': 'Draw rammer', 'times_motions': 'one time, three motions', 'piece': 'vertical, left hand at the muzzle', 'hands': 'right hand draws and turns the rammer; left thumb steadies'}),
    R('CMP-S07', 'load_in_nine_times', ('SS', 163, 163), ('SS', 170, 170), 'identical', 'S.S. para 163 (time 6: Ram cartridge)', 'S.S. para 170 (time 6: Ram cartridge)',
      'Time 6 "Ram cartridge": rammer inserted as far as the right hand and steadied with the left thumb; the right hand takes the small end and presses the ball home, elbows near the body.',
      hextra={'seq': 6, 'command': 'Ram cartridge', 'times_motions': 'one time, one motion', 'piece': 'vertical, rammer in the bore', 'hands': 'right hand on the small end of the rammer, left thumb steadying'}),
    R('CMP-S08', 'load_in_nine_times', ('SS', 164, 166), ('SS', 171, 173), 'identical', 'S.S. paras 164-166 (time 7: Return rammer; three motions)', 'S.S. paras 171-173 (time 7: Return rammer; three motions)',
      'Time 7 "Return rammer" (one time, three motions): (1) draw it half out and clear it from the bore; (2) turn it, head passing near the left shoulder, and insert it in the pipes; (3) force it home with the right little finger on its head while the left hand slides down the barrel without lowering the shoulder.',
      hextra={'seq': 7, 'command': 'Return rammer', 'times_motions': 'one time, three motions', 'piece': 'vertical', 'hands': 'right hand returns the rammer to the pipes; left hand slides down the barrel'}),
    R('CMP-S09', 'load_in_nine_times', ('SS', 167, 168), ('SS', 174, 175), 'identical', 'S.S. paras 167-168 (time 8: Prime; two motions)', 'S.S. paras 174-175 (time 8: Prime; two motions)',
      'Time 8 "Prime" (one time, two motions): (1) left hand raises the piece to eye height, half face right, right foot behind at a right angle, piece brought to the right side, small of the stock two inches below the right breast, barrel up, muzzle at eye level; '
      '(2) half cock, old cap removed, new cap taken from the pouch and pressed on the nipple.',
      hph='Half cock with the thumb of the right hand,',
      hextra={'seq': 8, 'command': 'Prime', 'times_motions': 'one time, two motions', 'piece': 'at the right side, barrel up, muzzle at eye height, hammer at half cock', 'hands': 'left at the lower band; right handles the cock and the cap'}),
    R('CMP-S10', 'load_in_nine_times', [('L', 1443, 1446), ('L', 1458, 1470)], ('SS', 176, 177), 'identical', 'S.S. paras 169-170 (time 9: Shoulder arms; two motions)', 'S.S. paras 176-177 (time 9: Shoulder arms; two motions)',
      'Time 9 "Shoulder arms" (one time, two motions): piece brought to the right shoulder and supported by the left hand, face to the front, right heel brought to the left; right hand takes the shoulder-arms grasp; the left hand is dropped quickly to the side.',
      hph='and support it there with the left hand, face to the',
      hextra={'seq': 9, 'command': 'Shoulder arms', 'times_motions': 'one time, two motions', 'piece': 'right shoulder', 'hands': 'right hand at the guard; left hand dropped to the side'}),
    R('CMP-S11', 'load_in_eight_times', [('L', 1413, 1413), ('L', 1447, 1455)], ('SS', 195, 195), 'identical', 'S.S. footnote to para 167 (Maynard primer, load in eight times)', 'S.S. para 195',
      'If Maynard\'s primer is used the command is "Load in eight times"; the eighth command is shoulder arms, executed from return rammer in one time and two motions (raise the piece with the left hand to shoulder arms, drop the left hand). The wording is the same in both manuals; only the place differs (Hardee: page-foot footnote split across a page break; Casey: numbered paragraph 195).',
      note='Wording identical; position differs (footnote in Hardee, numbered paragraph under "Remarks on Loading and Firing" in Casey); the cross-reference number differs (No. 145 vs No. 152).',
      hextra={'command': 'Load in eight times'}),
    R('CMP-S12', 'ready', ('SS', 171, 173), ('SS', 178, 180), 'identical', 'S.S. paras 171-173 (Ready; three motions)', 'S.S. paras 178-180 (Ready; three motions)',
      '"Ready" (one time, three motions): raise the piece, half face right, right foot to the rear at a right angle; bring the piece down with both hands, barrel up, butt below the right forearm, muzzle at eye height, left elbow against the side, right thumb on the cock; third motion cocks and re-seizes the small of the stock.',
      hextra={'command': 'Ready', 'times_motions': 'one time, three motions'}),
    R('CMP-S13', 'aim', ('SS', 174, 176), ('SS', 181, 183), 'identical', 'S.S. paras 174-176 (Aim)', 'S.S. paras 181-183 (Aim)',
      '"Aim": piece raised with both hands, butt against the right shoulder, left elbow down, right elbow as high as the shoulder, head inclined on the butt so the right eye sees the notch of the hausse (rear sight), the front sight and the object; left eye closed, finger on the trigger. '
      'In two ranks the front-rank men lower the right elbow a little and each rear-rank man steps about eight inches to the right toward the left heel of the man on his right, leaning forward.',
      hextra={'command': 'Aim', 'times_motions': 'one time, one motion'}),
    R('CMP-S14', 'fire', ('SS', 177, 177), ('SS', 184, 184), 'identical', 'S.S. para 177 (Fire)', 'S.S. para 184 (Fire)',
      '"Fire": press the forefinger against the trigger, fire without lowering or turning the head, and stay in that position.', hph='Press the forefinger against the trigger,', hextra={'command': 'Fire', 'times_motions': 'one time, one motion'}),
    R('CMP-S15', 'aim_remarks', ('SS', 178, 178), ('SS', 185, 185), 'identical', 'S.S. para 178', 'S.S. para 185',
      'Instructors check that the men aim at a distinct object, that the line of fire and the line of sight lie in one vertical plane, and have the firing practised on ground of different inclinations so that men learn to fire at objects above or below them.'),
    R('CMP-S16', 'load_after_fire', ('SS', 179, 182), ('SS', 188, 189), 'identical', 'S.S. paras 179-182 (Load after Fire; Shoulder arms)', 'S.S. paras 186-189 (Load after Fire; Shoulder arms)',
      'After "Fire", the command "Load" brings the piece down with both hands, faces the man to the front (a rear-rank man brings his right foot beside the left) and resumes the position of load; loading then continues by the nine-time commands. If no reload is wanted the command "Shoulder arms" follows.',
      note='Casey\'s OCR prints para 186 as "188" and lays a plate caption through the passage; the content is the same.'),
    R('CMP-S17', 'aim_remarks', None, ('L', 1950, 1961), 'absent_hardee', '-', 'S.S. plate note beside para 188 (Aim)',
      says_c='Casey prints, with the plate for the Aim position, a note that a man deployed as a skirmisher aims with the rear sight at high elevation. The note is damaged in the OCR ("rear sig...").',
      absent={'side': 'hardee', 'regex': r'rear\s+sig', 'max_count': 0, 'manuals': [H, HA]}, cph='to aim with rear sig',
      diff='Casey-only note on using the rear sight at high elevation when deployed as a skirmisher.'),
    R('CMP-S18', 'recover_arms', ('SS', 183, 184), ('SS', 190, 191), 'identical', 'S.S. paras 183-184 (Recover arms)', 'S.S. paras 190-191 (Recover arms)',
      '"Recover arms" (from Aim, to teach men to wait for the word Fire): at the first word take the finger off the trigger, at "arms" retake the position of the third motion of Ready.'),
    R('CMP-S19', 'shoulder_from_ready', ('SS', 185, 186), ('SS', 192, 193), 'identical', 'S.S. paras 185-186 (Shoulder arms from Ready)', 'S.S. paras 192-193 (Shoulder arms from Ready)',
      'From the position of Ready the command "Shoulder arms" half-cocks the piece (thumb on the cock, forefinger on the trigger) and brings it briskly to the right shoulder.'),
    R('CMP-S20', 'fix_bayonet', ('SS', 187, 190), ('SS', 196, 199), 'differs', 'S.S. paras 187-190 (Fix bayonet; three motions)', 'S.S. paras 196-199 (Fix bayonet; three motions)',
      says_h='"Fix bayonet" (one time, three motions): piece grasped at the height of the shoulder, lowered to the front with the butt between the feet and the muzzle three inches from the body, left hand reversed to the handle of the sabre-bayonet, which is drawn and fixed on the end of the barrel.',
      says_c='Same three motions, but Casey says "bayonet" and adds rifle-musket alternatives: the barrel inclined forward with the muzzle eight inches from the body, and the clasp turned once the bayonet is fixed.',
      only_c=['If the rifle musket be used the clasp will be turned as soon as'], only_h=['Draw the sabre-bayonet from the scabbard and fix it'],
      hextra={'command': 'Fix bayonet', 'times_motions': 'one time, three motions'},
      diff='Hardee: sabre-bayonet only. Casey: generic "bayonet" plus rifle-musket variants (muzzle 8 in., clasp).'),
    R('CMP-S21', 'charge_trail', ('SS', 191, 198), ('SS', 200, 207), 'identical', 'S.S. paras 191-198 (Shoulder arms; Charge bayonet; Trail arms)', 'S.S. paras 200-207 (Shoulder arms; Charge bayonet; Trail arms)',
      'After fixing: shoulder arms (two motions); "Charge bayonet" (two motions: half face right, feet square, piece brought down with the barrel uppermost, right hand at the hip, point as high as the eye); shoulder arms again; "Trail arms" (muzzle inclined to the front, butt about four inches from the ground, so that rear-rank bayonets do not touch the front rank).',
      note='Hardee names the weapon "sabre-bayonet" in the charge-bayonet text; Casey says "bayonet" there. The movements are the same.'),
    R('CMP-S22', 'unfix_bayonet', ('SS', 199, 203), ('SS', 208, 212), 'differs', 'S.S. paras 199-203 (Unfix bayonet; three motions)', 'S.S. paras 208-212 (Unfix bayonet; three motions)',
      says_h='"Unfix bayonet": first two motions as for fix bayonet except that the right thumb goes on the spring of the sabre-bayonet and the left hand embraces its handle and the barrel; third motion presses the spring, wrests the sabre-bayonet off, turns it edge to the front and returns it to the scabbard.',
      says_c='The same sabre-bayonet method, followed by a separate method for the rifle musket: turn the clasp with the left thumb, grasp the socket, then wrest the bayonet off point down by the shank of the socket and return it to the scabbard.',
      only_c=['If the rifle musket is used, at the end of the second command'],
      diff='Casey adds a complete rifle-musket (socket bayonet) unfixing method; Hardee has the sabre-bayonet method only.'),
    R('CMP-S23', 'manual_of_arms', ('SS', 132, 155), ('SS', 139, 162), 'identical', 'S.S. paras 132-155 (Support, Present, Order, Shoulder arms; position of order arms)', 'S.S. paras 139-162',
      'Positions and motions that precede the loading drill (support arms, present arms, order arms with its position, rest, shoulder arms): same text in both manuals.'),
    R('CMP-S24', 'manual_of_arms', ('SS', 204, 225), ('SS', 213, 234), 'identical', 'S.S. paras 204-225 (Secure arms, shift arms, arms at will, ground and raise arms)', 'S.S. paras 213-234',
      'The rest of the manual of arms after the bayonet drill (secure arms, right shoulder shift arms, arms at will, ground arms, raise arms): same text in both manuals.'),
    R('CMP-S25', 'inspection_of_arms', ('SS', 226, 229), ('SS', 235, 238), 'differs', 'S.S. paras 226-229 (Inspection of arms)', 'S.S. paras 235-238 (Inspection of arms)',
      says_h='"Inspection arms": with the sabre-bayonet in the scabbard the recruit seizes the piece, muzzle about three inches from the body, fixes the sabre-bayonet, draws the rammer to the bottom of the bore and retakes order arms; the instructor inspects each piece in turn.',
      says_c='The same inspection with "bayonet" for "sabre-bayonet", plus a parenthesis for the rifle musket: the muzzle about eight inches from the body.',
      only_c=['should the rifle musket be used, the muzzle will be about'], only_h=['carry the left hand re- versed to the sabre-bayonet'],
      diff='Casey adds the 8 in. muzzle for the rifle musket and drops "sabre" before bayonet.'),
    R('CMP-S26', 'spring_rammer', ('SS', 231, 236), ('SS', 240, 246), 'identical', 'S.S. paras 231-236 (Fix bayonet by itself; Spring rammer)', 'S.S. paras 240-246',
      '"Spring rammer": after firing, to ascertain whether the pieces were discharged, the instructor has the rammer put in the barrel and either springs it with the small end in his hand or has each recruit make it ring in the barrel; the recruit then returns the rammer and resumes order arms. Fix bayonet may be ordered by itself in place of inspection of arms.'),
    # ---------------------------------------------------------------- four times, at will, the squad firings
    R('CMP-S27', 'load_in_four_times', ('SS', 250, 255), ('SS', 259, 264), 'identical', 'S.S. paras 250-255 (Load in four times)', 'S.S. paras 259-264 (Load in four times)',
      'Load in four times, to prepare for loading at will and to teach the steps needing most care (charge cartridge, ram cartridge, prime): command "1. Load in four times. 2. Load."; the first time is executed at the end of the command and times two, three, four at the words two, three, four. '
      'Time 1 runs through charge cartridge, 2 through ram cartridge, 3 through prime, 4 is shoulder arms.',
      hextra={'command': 'Load in four times'}),
    R('CMP-S28', 'load_at_will', ('SS', 256, 258), ('SS', 265, 267), 'identical', 'S.S. paras 256-258 (Load at will)', 'S.S. paras 265-267 (Load at will)',
      'Loading at will is loading in four times run on without resting on any time, commanded "1. Load at will. 2. Load."; men are brought by degrees to load with the greatest promptitude, each without regulating himself by or waiting for his neighbour; the 1/90-minute cadence does not apply.',
      hextra={'command': 'Load at will'}),
    R('CMP-S29', 'fire_direct_squad', ('SS', 259, 264), ('SS', 268, 274), 'identical', 'S.S. paras 259-264 (direct fire; Cease firing)', 'S.S. paras 268-274 (direct fire; Cease firing)',
      'Direct fire by squad: "Fire by squad. Squad. Ready. Aim. Fire. Load."; the rear rank leans forward so its pieces project beyond the front rank; after "Load" the men load and return at once to Ready; firing is recommenced by "Squad. Aim. Fire. Load." and stopped by "Cease firing" (men load if unloaded, then shoulder).',
      hextra={'command': 'Fire by squad'}),
    R('CMP-S30', 'fire_oblique', ('SS', 266, 272), ('SS', 275, 281), 'identical', 'S.S. paras 266-272 (oblique firings)', 'S.S. paras 275-281 (oblique firings)',
      'Oblique fire uses the direct-fire commands with the caution "right oblique" or "left oblique" before Aim; front-rank men aim without moving the feet, each rear-rank man advances the foot about eight inches toward the heel of the man on his side of the file leader and leans forward; after Load each man loads as if isolated.'),
    R('CMP-S31', 'fire_by_file', ('SS', 273, 282), ('SS', 282, 292), 'identical', 'S.S. paras 273-283 (fire by file)', 'S.S. paras 282-292 (fire by file)',
      'Fire by file: the files fire successively without regulating on each other except for the first discharge; commands "Fire by file. Squad. Ready. Commence firing."; the right-hand file aims and fires, the next file aims as the first brings down pieces to reload; after the first fire front and rear rank need not fire together; "Cease firing" ends it.',
      hextra={'command': 'Fire by file'}),
    R('CMP-S32', 'fire_by_rank', ('SS', 284, 289), ('SS', 293, 298), 'identical', 'S.S. paras 284-289 (fire by rank)', 'S.S. paras 293-298 (fire by rank)',
      'Fire by rank: "Fire by rank. Squad. Ready. Rear rank. Aim. Fire. Load."; the rear rank fires first; when several of its men are at Ready the front rank is ordered "Front rank. Aim. Fire. Load." and the ranks alternate until "Cease firing".',
      hextra={'command': 'Fire by rank'}),
    R('CMP-S33', 'fire_kneeling', ('SS', 290, 297), ('SS', 299, 306), 'identical', 'S.S. paras 290-297 (fire and load kneeling)', 'S.S. paras 299-306 (fire and load kneeling)',
      'Fire and load kneeling (individual instruction, no times or motions): the man steps forward three paces, places the right knee on the ground and sits on the right heel, left forearm on the left thigh; cocks, aims and fires; then rises on the knee, carries the piece to the rear barrel down, butt on the ground, loads (ramming with both hands if needed), '
      'brings the piece forward, half-cocks, replaces the cap, rises and returns to the ranks.'),
    R('CMP-S34', 'fire_lying', ('SS', 299, 303), ('SS', 307, 312), 'identical', 'S.S. paras 299-303 (fire and load lying)', 'S.S. paras 307-312 (fire and load lying)',
      'Fire and load lying (individual, no times or motions): the man steps three paces forward, drops to both knees and lies flat on the belly, piece held nearly horizontal by the left hand near the lower band, butt and left elbow on the ground; cocks, aims on both elbows and fires; turns on the left side, draws a cartridge, rolls on the back, loads with the butt between the heels, '
      'turns again on the left side, removes the old cap and primes, then raises the piece vertically and rises.'),
    R('CMP-S35', 'bayonet_exercise', ('SS', 304, 309), ('SS', 313, 317), 'identical', 'S.S. paras 304-309 (Lesson VI, bayonet exercise)', 'S.S. paras 313-317 (Lesson VI, bayonet exercise)',
      'Bayonet exercise is confined to two movements, "Guard against infantry" and "Guard against cavalry", each in one time and two motions with the men in one rank at two paces interval; shoulder arms follows each. '
      'Guard against cavalry is the same with the right hand at the hip and the bayonet at eye height as in charge bayonet.'),
    # ---------------------------------------------------------------- School of the Company, lesson II: loadings and firings
    R('CMP-C01', 'company_loading', ('SC', 44, 46), ('SC', 44, 45), 'identical', 'S.C. paras 44-46 (loading in four times and at will, company)', 'S.C. paras 44-46',
      'In the company school loading in four times is repeated until it is steady, then loading at will; in priming the captain and covering sergeant half face right with the men and face front when the next man shoulders; the instructor works to have the loadings of the soldier school executed exactly.'),
    R('CMP-C02', 'rate_of_fire', ('SC', 47, 47), ('SC', 47, 47), 'identical', 'S.C. para 47', 'S.C. para 47',
      'Loading at will, being the loading of battle, takes priority once the men know the principles; the training standard is that every man load with cartridges and fire at least three rounds a minute with ease and regularity.',
      rate='>= 3 rounds/minute (drill standard)'),
    R('CMP-C03', 'fire_by_company', ('SC', 48, 51), ('SC', 48, 52), 'identical', 'S.C. paras 48-52 (fire by company)', 'S.C. paras 48-52 (fire by company)',
      'Fire by company: "1. Fire by company. 2. Commence firing."; the captain stands opposite the centre four paces behind the file closers and the covering sergeant retires to that line; at the second command the captain adds "Company. Ready. Aim. Fire. Load."; after the volley he recommences with "Company. Aim. Fire. Load.".',
      hextra={'command': 'Fire by company'}),
    R('CMP-C04', 'fire_by_company', ('L', 3795, 3816), ('L', 4549, 4571), 'identical', 'S.C. paras 53-56 (continuing; oblique aim; fire by file opening)', 'S.C. paras 53-56',
      'Company firing continues until the signal to cease firing is sounded; the captain may order aim to the right or left by saying right (or left) oblique before the word Aim; the company fire by file is commanded "1. Fire by file. 2. Company. 3. Ready. 4. Commence firing.", the third and fourth commands executed as in the soldier school.'),
    R('CMP-C05', 'fire_by_file', ('L', 3817, 3832), ('L', 4572, 4585), 'identical', 'S.C. para 57 (fire by file, company)', 'S.C. para 57 (fire by file, company)',
      'Company fire by file begins with the right file of the company; the next file takes aim as the first brings down pieces; after the first discharge each man reloads and fires without regulating on the others.'),
    R('CMP-C06', 'fire_by_rank', ('L', 3833, 3857), ('L', 4586, 4611), 'identical', 'S.C. paras 58-62 (fire by rank, company)', 'S.C. paras 58-62 (fire by rank, company)',
      'Company fire by rank: "Fire by rank. Company. Ready. Rear rank, Aim. Fire. Load."; the ranks alternate until the signal to cease firing; right/left oblique aim as for the fire by company.'),
    R('CMP-C07', 'cease_firing_signal', ('L', 3858, 3897), ('L', 4612, 4665), 'identical', 'S.C. paras 63-67 (signal to cease firing; bugle note or tap)', 'S.C. paras 63-67',
      'Company firing is stopped by sounding the signal to cease firing, the men stopping at the instant it begins as in the soldier school; a bugle note that always follows sends the captain and covering sergeant back to their places in line to rectify the alignment; in drill without powder the command cease firing replaces the signal and the command posts replaces the bugle note; '
      'the fire by file, being the one most used against an enemy, is given almost exclusive preference and the men are made to aim with care at a particular object.'),
    R('CMP-C08', 'fire_to_rear', ('L', 3898, 3956), ('L', 4666, 4717), 'identical', 'S.C. paras 68-76 (fire to the rear)', 'S.C. paras 68-76 (fire to the rear)',
      'Fire to the rear: "Face by the rear rank. Company. About face"; the captain steps out to the right file, the covering sergeant and file closers pass through his interval to the new rear, and after the about face the captain takes his interval in the new front rank; the fire by file then starts on the left of the company (now the right) and the fire by rank with the front rank (now the rear); "Face by the front rank. Company. About face" restores the front.'),
    R('CMP-C09', 'firing_instruction', ('SC', 77, 81), ('SC', 77, 81), 'identical', 'S.C. paras 77-81 (remarks on the firings)', 'S.C. paras 77-81',
      'The instructor recommends a short pause between Aim and Fire to give the men time to aim accurately, watches for faulty loading and sends such men back to individual instruction, urges composure in the firings and has the men keep the left heel in place in direct fire so the alignment is not deranged.'),
    R('CMP-C10', 'misfire_double_load', ('SC', 82, 83), ('SC', 82, 83), 'identical', 'S.C. paras 82-83 (misfires and double loads)', 'S.C. paras 82-83',
      'Misfire procedure: on uncocking the man watches for smoke from the tube; if none escapes the piece has not discharged and he picks and primes again instead of reloading; a second cartridge should be noticed in ramming by the height of the load; after cartridge firing arms are inspected for three cartridges in one piece and the ball screw is applied; '
      'if a cap missed fire and the tube is stopped with hard white powder, picking is skipped and a new cap substituted. No misfire rate is given in either manual.'),
    # ---------------------------------------------------------------- School of the Battalion (vol. 2) firings
    R('CMP-B01', 'battalion_firings', ('L', 9277, 9322), ('L', 493, 547, C2), 'identical', 'S.B. paras 31-38 (loading at will and the firings; which fires may be oblique)', 'S.B. paras 37-44',
      'The battalion school lists five fires: by company, by wing, by battalion, by file and by rank. Fire by company and by file are always direct; the others may be direct or oblique, the colonel giving the caution right (or left) oblique between Ready and Aim at every round. '
      'The right company of a division fires first and the left company waits until it sees one or two pieces at Ready; fire by file begins in all companies at once; the color guard does not fire but reserves itself for the color.'),
    R('CMP-B02', 'fire_by_company', ('L', 9323, 9372), ('L', 548, 598, C2), 'identical', 'S.B. paras 39-45 (fire by company)', 'S.B. paras 45-51',
      'Battalion fire by company: "1. Fire by company. 2. Commence firing."; the color and guard step back so the guard\'s front rank is in line with the battalion\'s rear rank; the odd-numbered companies fire first, the captains giving the company commands, then the even-numbered; the colonel stops the fire with the sounded signal to cease firing, after which captains and sergeants resume their places.'),
    R('CMP-B03', 'fire_by_wing', ('L', 9374, 9393), ('L', 599, 619, C2), 'identical', 'S.B. paras 46-48 (fire by wing; fire by battalion)', 'S.B. paras 52-54',
      'Fire by wing: "1. Fire by wing. 2. Right wing. 3. Ready. 4. Aim. 5. Fire. 6. Load."; the wings then fire alternately, recommencing with "Right wing. Aim. Fire. Load." and "Left wing. Aim. Fire. Load.". '
      'Fire by battalion uses the same commands with "1. Fire by battalion. 2. Battalion." in place of the first two. (the Hardee OCR of the wing paragraphs is badly damaged; the commands are legible in Casey and in the damaged Hardee lines.)',
      note='Hardee OCR of paras 46-47 is heavily damaged; the identity of wording rests on the legible parts and the matching command lists.'),
    R('CMP-B05', 'fire_by_file', ('L', 9394, 9411), ('L', 620, 636, C2), 'identical', 'S.B. paras 49-50 (fire by file)', 'S.B. paras 55-57',
      'Battalion fire by file: "1. Fire by file. 2. Battalion. 3. Ready. 4. Commence firing."; at the fourth command the fire begins on the right of each company (the colonel may have it begin on the right of each platoon) and proceeds as in the company school.'),
    R('CMP-B06', 'fire_by_rank', ('L', 9412, 9428), ('L', 637, 649, C2), 'identical', 'S.B. paras 51-52 (fire by rank)', 'S.B. paras 57-58',
      'Battalion fire by rank follows the company school: "Fire by rank. Battalion. Ready. Rear rank. Aim. Fire. Load."; the ranks alternate.'),
    R('CMP-B07', 'fire_to_rear', ('L', 9429, 9490), ('L', 650, 716, C2), 'identical', 'S.B. paras 53-62 (fire to the rear)', 'S.B. paras 59-68',
      'To fire to the rear the battalion faces by the rear rank (about face); the wings and companies keep their old designations, fire by file starts on the left company (now the right) and fire by rank with the former front rank (now the rear); "Face by the front rank" restores it; the fire by file is the one "most used in war" and is preferred in the preparatory exercises.'),
    R('CMP-B08', 'light_companies', None, ('L', 734, 740, C2), 'absent_hardee', '-', 'S.B. para 71',
      says_c='Casey\'s battalion school says the two companies designated as skirmishers do not fire when the line fires, except behind a breastwork or similar cover. (The War Department order of 11 August 1862 suspended the permanent two-company arrangement.)',
      absent={'side': 'hardee', 'regex': r'companies\s+of\s+skirmishers\s+will\s+not\s+fire', 'max_count': 0, 'manuals': [H, HA]}, cph='The companies of skirmishers will not fire when the line fires',
      diff='Casey designates two companies of skirmishers per battalion and tells them not to fire in the battalion fires; Hardee has no such company.'),
    # ---------------------------------------------------------------- Instruction for skirmishers
    R('CMP-K01', 'skirmishers_general', ('L', 6667, 6809), ('L', 7844, 7995), 'identical', 'Instruction for Skirmishers, general principles (Nos. 1-14)', 'Instruction for Skirmishers, general principles (Nos. 1-14)',
      'Skirmisher movements are not held to closed-rank precision; skirmishers cover the advance of the main corps; each body has a reserve (company reserves at 150 paces and the principal reserve at 400 paces, as the text sets the distances) that fills vacant places, furnishes cartridges, relieves the tired and is the rallying point; men of one group are five paces apart in open ground; all movements are made at quick or double-quick time, the run only in cases of urgent necessity; pieces are carried as each man finds convenient; movements are habitually indicated by the bugle (No. 10).'),
    R('CMP-K02', 'skirmishers_deploy', ('L', 6810, 7306), ('L', 7996, 8631), 'identical', 'Skirmishers, Article First: deployments, extend and close intervals, relieve (Nos. 15-69)', 'Skirmishers, Article I (Nos. 15-69)',
      'Deployment of a company as skirmishers forward or by the flank on a named file, extending and closing intervals, and relieving a deployed company: same commands, same movements, same paragraph numbers in both manuals (Casey adds plates).'),
    R('CMP-K03', 'skirmishers_march', ('L', 7307, 7521), ('L', 8632, 8878), 'identical', 'Skirmishers, Article Second: march to the front, in retreat, change direction, by the flank (Nos. 70-105)', 'Skirmishers, Article II (Nos. 70-105)',
      'Marching the deployed line: forward (guide habitually in the centre, "guide right" or "guide left" after the command forward when otherwise), in retreat, change of direction, march by the flank; same text and paragraph numbers in both manuals.'),
    R('CMP-K04', 'skirmishers_firing', ('L', 7522, 7760), ('L', 8879, 9119), 'identical', 'Skirmishers, Article Third: the firings (Nos. 106-126)', 'Skirmishers, Article III (Nos. 106-126)',
      'Skirmishers fire at a halt or while marching: at "commence firing" the front-rank man of a file halts, fires and reloads before moving, the rear-rank man marches 10-12 paces beyond, halts, fires and reloads in turn; at least one man of a file stays loaded; skirmishers are practised to load marching but halt an instant to charge cartridge and prime; to fire and load kneeling, lying and sitting; '
      'the piece is held upright before ramming so the powder reaches the bottom; the signal to cease firing is obeyed at once.'),
    R('CMP-K05', 'skirmishers_loading', ('L', 7652, 7671), ('L', 9020, 9045), 'identical', 'Skirmishers, Nos. 120-122 (loading while marching; kneeling, lying, sitting; opening the fire)', 'Skirmishers, Nos. 120-122',
      'Skirmishers are habituated to load while marching but halt an instant while charging cartridge and priming; they may fire and load kneeling, lying or sitting with latitude, upright before ramming; in opening the fire the men of one rank must not all fire at once and a file keeps one man loaded.'),
    R('CMP-K06', 'skirmishers_rally', ('L', 7761, 8181), ('L', 9120, 9529), 'differs', 'Skirmishers, Article Fourth: the rally (Nos. 127-177)', 'Skirmishers, Article IV (Nos. 127-)',
      says_h='The rally by fours, sections, platoons, on the reserve and on the battalion, with assembly on the reserve and on the centre; the paragraphs on rallying on the battalion (skirmishers and reserve unmask the battalion front and run round its flank) are printed in this article.',
      says_c='The same rallies, but Casey adds the commands to deploy again out of the rallied groups, sections and platoons ("deploy as skirmishers", "form sections", "form platoons") and moves the rally on the battalion to the School of the Battalion (vol. 2).',
      only_c=['If the captain desires again to deploy the sections'], only_h=['no matter what position the company to which they be- long may occupy'],
      diff='Casey adds re-deployment commands after a rally; the rally on the battalion is in Hardee\'s skirmisher instruction and in Casey\'s volume 2.'),
    R('CMP-K07', 'skirmishers_battalion', ('L', 8182, 8470), ('L', 9530, 9900), 'differs', 'Skirmishers, Article Fifth: deploy the battalion as skirmishers (Nos. 178-197)', 'Skirmishers, Article V (Nos. 178-193)',
      says_h='Deployment and rally of a whole battalion as skirmishers: the colonel gives orders to the lieutenant-colonel, adjutant and the (single) major, who is directed to take charge of the battalion reserve.',
      says_c='The same deployment, but the battalion has senior and junior majors and the two companies of skirmishers; the junior major takes the reserve when those companies are part of it, and Casey adds a paragraph on the assembly of the deployed companies.',
      only_c=['senior and junior majors, one of whom'], only_h=['adjutant, and also to the major, who will be directed to'],
      diff='Casey names senior and junior majors and adds the two skirmisher companies to the reserve arrangement.'),
    # ---------------------------------------------------------------- bugle and drum calls
    R('CMP-L01', 'bugle_general_calls', ('L', 8553, 8628), ('L', 10073, 10133), 'differs', 'Instruction for the chief bugler: General calls (p. 217)', 'Instruction for the drum-major: General calls on the bugle (p. 229)',
      says_h='25 general bugle calls are listed (attention, the general, the assembly, to the color, the recall, quick time, double quick time, the charge, reveille, retreat, tattoo, to extinguish lights, assembly of the buglers, assembly of the guard, orders for orderly sergeants, for officers to take their places in line after firing, the disperse, officers\' call, breakfast, dinner, sick, fatigue, church, drill and school call); the notation is not in the OCR text.',
      says_c='26 general bugle calls: the same 25 plus "Signal of execution" (to be given by the general commanding more than one brigade of the line) as call 2.',
      calls=CALLS_GENERAL, only_c=['Signal of execution'], absent={'side': 'hardee', 'regex': r'Signal\s+of\s+execution', 'max_count': 0, 'manuals': [H, HA]}, hph='Breakfast call.',
      diff='Casey has one more general bugle call (Signal of execution).'),
    R('CMP-L02', 'bugle_skirmisher_calls', ('L', 8629, 8683), ('L', 10134, 10193), 'identical', 'Instruction for the chief bugler: Calls for skirmishers (p. 218)', 'Calls on the bugle for skirmishers (p. 230)',
      'The bugle calls for skirmishers (fix and unfix bayonet, quick time, double quick time, deploy as skirmishers, forward, in retreat, halt, by the right and left flank, commence and cease firing, change direction right and left, lie down, rise up, rally by fours, by sections, by platoons, on the reserve and on the battalion, assemble on the battalion) and the note on the general, the assembly and to the color are the same list in both manuals; the damaged Hardee OCR leaves calls 5, 9 and 17 unreadable.',
      calls=CALLS_SKIRM),
    R('CMP-L03', 'bugle_skirmisher_calls', ('L', 8629, 8640), ('L', 10134, 10149), 'unsettled', 'Calls for skirmishers, call 5 (OCR numbering skips 4 to 6)', 'Calls on the bugle for skirmishers, call 5 "The run."',
      says_h='In Hardee\'s OCR the skirmisher calls are numbered 1, 2, 3, 4 and then 6; the line for call 5 is missing, so whether Hardee lists "The run" as a bugle call cannot be settled from this text.',
      says_c='Casey\'s fifth bugle call for skirmishers is "The run."; the call list is complete (23).',
      cph='5. The run.', hph='Double (/uick time.'),
    R('CMP-L04', 'drum_beats', None, ('L', 9983, 10072), 'absent_hardee', '-', 'Instruction for the drum-major: beats of the drum (pp. 227-228)',
      says_c='Casey prints drum beats for infantry: 15 general beats (the general, the assembly, to the color, the long roll, common time, quick time, double quick time, reveille, the troop, retreat, tattoo, to recall detachments, drummer\'s call, come for orders, the roll to cease firing) and 20 beats for skirmishers for use when no bugle is available.',
      absent={'side': 'hardee', 'regex': r'long\s+roll|beats\s+of\s+the\s+drum|beats\s+on\s+the\s+drum', 'max_count': 0, 'manuals': [H, HA]}, cph='Beats on the drum for skirmishers.',
      diff='Hardee (rifle and light infantry) has bugle calls only; Casey adds the drum beats and the drum-major\'s staff signals.'),
    R('CMP-L05', 'drum_major_signals', None, ('L', 10194, 10260), 'absent_hardee', '-', 'Signals of the drum-major (p. 231)',
      says_c='Casey adds staff signals by which the drum-major orders the principal beats and sounds (the general, the assembly, to the color, the long roll, common time and others).',
      absent={'side': 'hardee', 'regex': r'Signals\s+of\s+the\s+dr', 'max_count': 0, 'manuals': [H, HA]}, cph='Signals of the dram-major for the principal beats',
      diff='Hardee has no drum-major signals.'),
]

# ------------------------------------------------------------------------------------------------ extra Hardee items (not tied to a comparison row)
def S(id, topic, manual, ref, phrase, para, **kw):
    d = {'id': id, 'topic': topic, 'manual': manual, 'ref': ref, 'phrase': phrase, 'paraphrase': para}
    d.update(kw)
    return d


EXTRA_SPECS = [
    S('HAR-ED-01', 'edition', H, 'Front matter: title page', 'BREVET LIEUT.-COL. W. J. HARDEE,',
      'The Richmond printing (J. W. Randolph, 1861; steam presses of Evans and Cogswell, Charleston) is titled Rifle and Light Infantry Tactics, "prepared under the direction of the War Department" by Brevet Lieutenant-Colonel W. J. Hardee, vol. I = Schools of the Soldier and Company, Instruction for Skirmishers.',
      ocr_quality='minor-noise', verbatim2='RICHMOND. VA.', page_override=FM_B(74, 'HARDEE', 'title page carries no page number; the passage is the title page itself (OCR lines 38-96)')),
    S('HAR-ED-02', 'edition', H, 'Front matter: War Department order', 'March 29, 1855.',
      'The War Department order of 29 March 1855 (Secretary of War Jefferson Davis) adopts Hardee\'s system "for the instruction of the troops when acting as Light Infantry or Riflemen" and, under the Act of 12 May 1820, for the Militia when so employed. This is the order printed in the 1861 Richmond printing; it limits Hardee to light infantry and riflemen.',
      ocr_quality='clean', verbatim2='troops when acting as Light Infantry or Riflemen,', page_override=FM_B(100, 'March 29, 1855.', 'order printed on the unnumbered leaf after the title page (OCR lines 98-112)')),
    S('HAR-ED-03', 'edition', HA, 'Front matter: title page (Memphis printing)', 'MEMPHIS:',
      'The second copy is a Memphis printing of 1861 sold as the whole tactics "complete in one volume"; its OCR is poor and its running-head page numbers are mostly lost, so it is used only as a second witness for wording and paragraph numbers.',
      ocr_quality='noisy', verbatim2='COMPLETE m ONE VOLUME.', page_override=FM_B(31, 'MEMPHIS:', 'title page of the Memphis copy; no page number')),
    S('HAR-ED-04', 'commands', H, 'Instruction of the battalion: Commands (Nos. 62-69)', 'The command of execntlon, such as march or halt, or,',
      'Hardee distinguishes three kinds of command: caution (attention), preparatory (names the movement) and execution (such as march or halt, or in the manual of arms the part of the command that causes execution); preparatory commands are in italics and execution in capitals; a long preparatory command is split by a hyphen.',
      ocr_quality='minor-noise'),
    S('HAR-ED-05', 'bayonet_and_bugle', H, 'Instruction of the battalion, No. 51-52', 'The sabre bayonet should only be fixed when',
      'The sabre bayonet is fixed only when needed for attack or defence; the exercises and manoeuvres are done without it, and the chief of the battalion has the signal to fix bayonet sounded, at which the men fix bayonets without command. Every officer is to know the bugle signals and be able to sound them (No. 55).',
      ocr_quality='clean', verbatim2='with the bugle signals: and should, by practice, be enabled,'),
    S('HAR-ED-06', 'light_troops', H, 'Instruction for Skirmishers, No. 32', 'Light troops will carry their bayonets habitually in the scabbard',
      'Light troops carry their bayonets habitually in the scabbard (they fix them for the rally and the charge); Hardee\'s text speaks of "light troops" for skirmishers, a term Casey also keeps.',
      ocr_quality='clean'),
]

# Casey-side supplementary citations for the "which manual" question (not tied to a row)
CASEY_USE_SPECS = [
    S('HCS-U01', 'usage', C1, 'Front matter: War Department order of 11 August 1862', 'Washington, August 11, 1862.',
      'A War Department order dated 11 August 1862 (Secretary Stanton) adopts Casey\'s system, approved by the President, for the instruction of the infantry of the armies of the United States, whether regular, volunteer or militia, with two modifications: the permanent detachment of two companies as skirmishers is suspended and a revised ten-company order of posting is substituted.',
      ocr_quality='clean', verbatim2='Infantry of the Armies of the United States, whether', page_override=FM_B(105, 'Washington, August 11, 1862.', 'order printed on the unnumbered leaf before the preface')),
    S('HCS-U02', 'usage', C1, 'Preface', 'Both of these systems have been in use in our service',
      'Casey\'s preface says the two French-derived systems, Scott\'s (1831) and Hardee\'s (1845 chasseur ordonnance), have both been in use in the American service for some years, with Hardee\'s drill introduced alongside Scott\'s; he saw the need for one uniform system for all infantry.',
      ocr_quality='clean', page_override=INF.PREF),
    S('HCS-U03', 'usage', C1, 'Preface', 'for the review, correction and emendation of the translation of',
      'Casey states that in 1854 he presided over a War Department board that reviewed and corrected Hardee\'s translation; this ties Hardee\'s 1855 text (adopted 29 March 1855) to the board whose president later wrote the 1862 tactics.',
      ocr_quality='clean', page_override=INF.PREF),
    S('HCS-U04', 'usage', C1, 'Preface', 'to designate in each battalion two of its companies as light troops',
      'Casey\'s plan designates two companies of each battalion as light troops (picked men and marksmen) to cover the battalion as skirmishers; the 11 August 1862 order suspended this, so it is not in force for the infantry of 1863.',
      ocr_quality='clean', page_override=INF.PREF6),
    S('HCS-U05', 'usage', NY, 'New York at Gettysburg, address on the Forty-fourth New York (People\'s Ellsworth Regiment)', 'to Casey’s Tactics. Both com- panies proved themselves to be worthy',
      'A speaker on the 44th New York says two companies added to the regiment after its first year (one from the State Normal School at Albany) passed "from Caesar\'s Commentaries to Casey\'s Tactics": a regimental anecdote that the Union regiment drilled by Casey; it says nothing about other regiments or about when the manual changed.',
      ocr_quality='minor-noise', page_override=NY363),
]

NEGATIVE = [
    # rate / cartridge / range statements: re-counted by drill_check.py in the Hardee and Casey OCR texts
    {'claim': 'Hardee and Casey never mention buck and ball, buckshot or the buck-and-ball cartridge', 'regex': r'buck[- ]?\s?shot|buck and ball|buck-', 'texts': [H, HA, C1, C2], 'max_count': 0},
    {'claim': 'Hardee and Casey never mention fouling', 'regex': r'foul', 'texts': [H, HA, C1, C2], 'max_count': 0},
    {'claim': 'Neither manual gives an effective range or a firing distance in yards (the only yard figures are marching rates)', 'regex': r'effective\s+(range|distance)|yards?\s+(range|distance)|range\s+of\s+(the|a)\s+(piece|musket|rifle)|within\s+(range|reach)', 'texts': [H, HA, C1, C2], 'max_count': 0},
    {'claim': 'The only yard figures in Hardee are two marching rates (4,000 yards in about 25 minutes at double quick; about 1,100 yards in 7 minutes)', 'regex': r'yards', 'texts': [H], 'max_count': 2},
    {'claim': 'Neither manual describes the cartridge beyond the loading motions (no powder charge, weight or ball size)', 'regex': r'grains|drachm|calibre|caliber|windage', 'texts': [H, C1, C2], 'max_count': 0},
    {'claim': 'The words "missed fire" occur exactly once in each of Hardee (both printings) and Casey vol. 1 (S.C. para 83); no other drill passage uses them and no misfire rate is given', 'regex': r'missed fire', 'texts': [H, HA, C1], 'min_count': 1, 'max_count': 1},
    {'claim': 'Casey vol. 2 (School of the Battalion) has no passage on misfires', 'regex': r'missed fire|misfire', 'texts': [C2], 'max_count': 0},
]

# Search of the other downloaded texts for any statement about which manual a force used (usage question)
USAGE_SEARCH = {
    'regex': r"(hardee|casey|scott)[^a-z]{1,3}s?[^a-z]{0,3}(system|tactics|drill|manual|school)|(tactics|drill|manual of arms|school of the soldier)[^.]{0,60}(hardee|casey)|(hardee|casey)[^.]{0,60}(tactics|manual of arms)|rifle and light infantry",
    'texts': {'BL-3': 0, 'OR-27-1': 0, 'OR-27-2': 0, 'OR-27-3': 0, 'PA-GB-1904': 0, 'PA-GB-1914a': 0, 'PA-GB-1914b': 0, 'NY-GB-1900': 1, 'ME-GB-1898': 0,
              'MI-GB-1889': 0, 'FOX-1889': 0, 'OR-ATLAS': 0},
}

HD_USAGE = {
        'question': 'Which manual did each army use in 1863?',
        'union': {'verdict': 'PARTLY ESTABLISHED: the War Department adopted Casey for all infantry (regular, volunteer, militia) on 11 August 1862; whether each regiment had switched by July 1863 is not stated in these texts',
                  'evidence': ['HCS-U01', 'INF-HC-02', 'HCS-U02', 'HCS-U03', 'HCS-U04', 'HCS-U05'],
                  'caveat': 'The order says Casey is "adopted"; Casey\'s own preface says Scott\'s and Hardee\'s systems had both been in use. The only regimental statement in the downloaded texts is the 44th NY anecdote (one regiment).'},
        'confederate': {'verdict': 'NOT ESTABLISHED by the manuals or the other downloaded texts',
                        'evidence': ['HAR-ED-02', 'HAR-ED-01', 'HAR-ED-03'],
                        'caveat': 'The Hardee printings are Richmond (J. W. Randolph) and Memphis imprints dated 1861, and the order they reprint is the US War Department order of 29 March 1855 limited to light infantry and riflemen. '
                                  'A Southern printing shows the book was produced there in 1861, not that every Confederate regiment used it in 1863. Battles and Leaders vol. 3, the three OR vol. 27 parts and the state Gettysburg volumes contain no statement naming either manual (search recorded in usage_search).'},
    }

METHOD = ('identical = letters-only difflib similarity of the two OCR windows >= 0.80, at most max(5, 15 percent) real content words (>= 5 letters, in the ordinary vocabulary of the manuals) on either side without a near '
          'match on the other, and at most 35 percent unmatched OCR-garbled tokens (drill_paras.is_identical); differs = at least one verbatim phrase that occurs in one window and not in the other; '
          'absent_hardee/absent_casey = verbatim phrase in one manual and a regular expression with zero hits in every OCR text of the other; unsettled = OCR does not allow a decision. '
          'All numbers are recomputed by tools/bt/drill_check.py.')

G19 = ('Hardee (1855 text, 1861 printings) and Casey (1862) carry the same loading and firing drill: the nine times (Load, Handle, Tear, Charge, Draw rammer, Ram, Return rammer, Prime, Shoulder arms), '
       'load in four times and at will, Ready/Aim/Fire/Load, the fires by squad, oblique, file, rank, company, wing, battalion, kneeling and lying, the bayonet drill and the skirmisher firings agree in wording. '
       'Differences of substance: rifle-musket alternatives in Load (muzzle 8 in.), Fix bayonet, Unfix bayonet and Inspection (Casey only); "sabre-bayonet" in Hardee against "bayonet" in Casey; '
       'the cartridge-box note (footnote in Hardee, conditional numbered paragraph in Casey); a Casey plate note on the rear sight; re-deployment commands after a rally and senior/junior majors in the skirmisher instruction (Casey); '
       'the two light companies per battalion that do not fire with the line (Casey, suspended by the 11 August 1862 order); one more general bugle call (Signal of execution), the drum beats and the drum-major signals (Casey). '
       'Paragraph numbers differ (Casey S.S. = Hardee + 7 to para 186, then + 9 after the two inserted paras 194-195; Casey S.B. = Hardee + 6).')

EXTRA_DATA = {
    'scope_note': 'Hardee citations are from HARDEE-1861b (Richmond 1861, legible running heads); HARDEE-1861a (Memphis 1861) is the second witness (witness_a: the longest run of the phrase found verbatim there); Casey is cited from drill_infantry.json (INF-*) or the HCS-* items here.',
    'edition_note': 'HARDEE-1861b and HARDEE-1861a are two 1861 printings of the same 1855 text; the paragraph numbers agree (Load in nine times = No. 156 in both contents lists). Casey renumbers: Casey S.S. = Hardee + 7 (to Hardee 186 = Casey 193), + 9 after the inserted paras 194-195.',
    'sequences': {
        'load_in_nine_times': {'manual': H, 'where': 'School of the Soldier, Part II, Lesson II, paras 156-170',
                               'order': ['HAR-S%02d' % k for k in range(2, 11)],
                               'summary': ['Load', 'Handle cartridge', 'Tear cartridge', 'Charge cartridge', 'Draw rammer', 'Ram cartridge', 'Return rammer', 'Prime', 'Shoulder arms'],
                               'motions_per_time': [1, 1, 1, 1, 3, 1, 3, 2, 2],
                               'note': 'Same nine commands, same order and motions as Casey (paras 163-177); CMP-S02 records the one difference of substance (rifle-musket variant).'},
        'load_in_eight_times': {'order': ['HAR-S11'], 'note': 'Maynard-primer variant, printed as a footnote in Hardee.'},
        'load_in_four_times': {'order': ['HAR-S27']},
        'load_at_will': {'order': ['HAR-S28']},
        'firing_cycle_squad': {'order': ['HAR-S29', 'HAR-S12', 'HAR-S13', 'HAR-S14', 'HAR-S16']},
        'fires': {'squad_direct': ['HAR-S29'], 'oblique': ['HAR-S30'], 'by_file': ['HAR-S31'], 'by_rank': ['HAR-S32'], 'kneeling': ['HAR-S33'], 'lying': ['HAR-S34'],
                  'company': ['HAR-C03', 'HAR-C05', 'HAR-C06', 'HAR-C08'], 'battalion': ['HAR-B02', 'HAR-B03', 'HAR-B05', 'HAR-B06', 'HAR-B07'],
                  'skirmishers': ['HAR-K04', 'HAR-K05'], 'bayonet': ['HAR-S20', 'HAR-S21', 'HAR-S22', 'HAR-S35']},
    },
    'rate_misfire_cartridge_range': {
        'rate_of_fire': {'items': ['HAR-C02', 'HAR-S01'], 'finding': 'Only a training standard: every man able to load and fire at least three rounds a minute with ease and regularity (S.C. para 47), identical to Casey; manual-of-arms motions are timed at 1/90 minute except the cartridge, rammer and bayonet motions. No combat rate is printed.'},
        'misfire': {'items': ['HAR-C10', 'HAR-S26'], 'finding': 'Procedure only: pick and prime again if no smoke escapes on uncocking, judge a double charge by the height of the load, ball screw for three cartridges, new cap when the tube is stopped, spring the rammer to learn whether a piece discharged. No misfire rate.'},
        'fouling': 'No statement (regex count 0 in both Hardee printings and both Casey volumes).',
        'cartridge_and_buck_and_ball': 'Only the loading motions describe the cartridge (tear the paper, empty the powder, insert the ball point up); no powder charge, ball, weight or buckshot is printed in Hardee or Casey (regex counts 0). The buck-and-ball description is in the Ordnance Manual (drill_infantry.json INF-AMMO-01).',
        'effective_range': 'None printed. The only yard figures are marching rates (negative_findings).',
    },
    'bugle_and_drum_calls': {
        'hardee_general_bugle_calls': {'count_in_ocr': 25, 'items': ['HAR-L01'], 'note': 'Listed 1-25 in the OCR (call numbers partly garbled; the last is School call). The musical notation is not in the OCR text.'},
        'hardee_skirmisher_bugle_calls': {'count_numbered': 23, 'items': ['HAR-L02', 'HAR-L03'], 'note': 'Numbers 1-4 and 6-23 are in the OCR; call 5 is missing (Casey\'s call 5 is The run).'},
        'casey_extra': 'Casey has one more general bugle call (Signal of execution), the drum beats (15 general, 20 skirmisher) and the drum-major\'s staff signals; Hardee has none of these in either printing (CMP-L01, L04, L05).',
    },
    'skirmisher_instruction': {
        'structure': 'General principles (Nos. 1-14); Article First deployments (15-69); Article Second marches (70-105); Article Third firings (106-126); Article Fourth the rally (127-177); Article Fifth deploy the battalion (178-197); then the sabre manual, salute of the color, relieving sentinels, parade rest and the bugle calls.',
        'items': ['HAR-K01', 'HAR-K02', 'HAR-K03', 'HAR-K04', 'HAR-K05', 'HAR-K06', 'HAR-K07'],
    },
    'usage_1863': HD_USAGE,
    'pdf_claim_checks': [
        {'claim': 'PDF B.6.11: nine drill commands "load; handle cartridge; tear cartridge; charge cartridge; draw rammer; ram cartridge; return rammer; prime; shoulder arms"',
         'verdict': 'CONFIRMED for Hardee (1855 text, 1861 printings) as well as Casey: same list, order and motions (draw rammer and return rammer three motions, prime and shoulder arms two)',
         'evidence': ['HAR-S%02d' % k for k in range(2, 11)]},
        {'claim': 'PDF gap G19: Hardee vs Casey differences', 'verdict': 'SETTLED for the loading and firing drill: same wording apart from rifle-musket variants, the bayonet name, the cartridge-box note, plates and renumbering (drill_compare.json)',
         'evidence': ['HAR-S02', 'HAR-S04', 'HAR-S20', 'HAR-S22', 'HAR-S25']},
        {'claim': 'PDF forum claim: in combat only eight cycles occur because the ninth step happens only on the first load', 'verdict': 'NOT SUPPORTED by Hardee either: the only eight-time variant is the Maynard-primer one (HAR-S11); after Fire the command Load resumes the nine-time sequence (HAR-S16)', 'evidence': ['HAR-S11', 'HAR-S16']},
        {'claim': 'PDF rate 2-3 rounds a minute', 'verdict': 'Hardee gives the same training standard as Casey (at least three rounds a minute); no combat rate', 'evidence': ['HAR-C02']},
        {'claim': 'PDF gap: bugle calls', 'verdict': 'PARTLY SETTLED: names and order of 25 general and 23 skirmisher bugle calls are in Hardee (skirmisher call 5 lost to OCR); the notation is not in the OCR text and no page image was inspected', 'evidence': ['HAR-L01', 'HAR-L02', 'HAR-L03']},
        {'claim': 'PDF gap: skirmish practice', 'verdict': 'SETTLED as to the manual text: the skirmisher instruction (deploy, march, fire, rally, deploy the battalion) is in Hardee and, with small additions, in Casey', 'evidence': ['HAR-K01', 'HAR-K04', 'HAR-K05', 'HAR-K06']},
        {'claim': 'PDF: misfire rates, buck-and-ball effective range', 'verdict': 'NOT in Hardee or Casey (negative_findings)', 'evidence': ['HAR-C10']},
    ],
}
