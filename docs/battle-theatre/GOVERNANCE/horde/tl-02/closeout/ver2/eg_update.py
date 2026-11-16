"""Second-reading paragraphs for the older proposed register entries tl-02-EG-001, -003, -004 (once; marker SECOND-READING UPDATE 2026-11-15)."""
import os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
SH = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'tl-02')
MARK = 'SECOND-READING UPDATE 2026-11-15'
UPD = {
 '001': ('Hours added from sources that were already local: New York at Gettysburg vol. 1 has "between 8 and 9 a.m." for the notice given by the pickets in front of Gamble\'s brigade (a seventh scenario for first contact, in the same hour band as Pleasonton\'s); Jacobs 1864 puts the artillery into play at 10 a.m. (no battery named); Hunt (OR vol. 27 pt. 1 p.229) has Hall\'s battery ordered into action about 10.15 a.m.; Jacobs 1864 also gives 9 1/2 a.m. for the start of the skirmishing (already carried). All values stay selectable, no default. Detail: tl-02-CO-T1-082, -090, -094, -095.',
         'New York at Gettysburg vol. 1; Jacobs 1864 (page images of printed pages 21-23 read); Hunt (OR27-1-R028).'),
 '003': ('Jerome\'s own letter of 18 Oct 1865 to Maj. Gen. Hancock was found, printed in a 1989 U.S. Army War College study (DTIC ADA207999, a U.S. Government work): Jerome took his station in the steeple of the Theological Seminary "as early as seven A.M.", Buford came up and looked at the enemy through his glass, Jerome called his attention to an army corps advancing about two miles off and distinguished it as the First by its corps flag, and Reynolds, half an hour later, rode up and hailed Buford in the steeple. The study also names Pennsylvania Hall as the college building whose cupola held a Union signal station. Rows T1-086, T1-092, T1-093 and T1-111 rest on it (documented as Jerome\'s claim, second-hand print). STILL OPEN: the clock hour of the sighting and of Reynolds\' arrival (inferred about 09:30 if he met Buford at about ten); the ladder from the attic to the cupola (found only in a book of 2006 that is not public domain: a lead); the original of the letter (Bachelder Papers, U.S. Army Military History Institute; owner-only step: a request to that institute); Weld\'s field meeting as a rival scene; Jacobs\'s presence in the cupola and the Confederate use that evening. Detail: tl-02-CO-T1-092, -093, -111, -086.',
         'DTIC ADA207999 (text and page images); Brown 1896; New York at Gettysburg vol. 1; Bachelder 1873; Weld 1912; archive.org full-text searches of 2026-11-15 (lookups LF1-LF7).'),
 '004': ('Lull: New York at Gettysburg vol. 1 puts the end of the first fight at about 11 o\'clock and has "for three hours there was a lull"; Coulter (OR p.292) has the firing general along the line about 12.30; with Heth ("one hour or more") and McFarland ("perhaps an hour", then about noon) the end of the lull is carried as four selectable scenarios (about 12:00 McFarland; about 12:30 Heth and, as general firing, Coulter; about 14:00 New York 1900), no default. Herr\'s Ridge: Jacobs 1864 puts the artillery into play at 10 a.m. without naming a battery. Detail: tl-02-CO-T1-095, -113.',
         'New York at Gettysburg vol. 1; Jacobs 1864; Coulter (OR27-1-R044).'),
}
for k, (desc, ev) in UPD.items():
    p = os.path.join(SH, 'proposed-register', 'tl-02-EG-%s.md' % k)
    t = open(p, encoding='utf-8').read()
    if MARK in t:
        print(k, 'already'); continue
    t = re.sub(r'^(\| Description \| )(.*)( \|)$', lambda m: m.group(1) + m.group(2) + ' ' + MARK + ': ' + desc + m.group(3), t, count=1, flags=re.M)
    t = re.sub(r'^(\| Evidence searched \| )(.*)( \|)$', lambda m: m.group(1) + m.group(2) + ' ' + MARK + ': ' + ev + m.group(3), t, count=1, flags=re.M)
    open(p, 'w', encoding='utf-8', newline='\n').write(t)
    print(k, 'updated')
