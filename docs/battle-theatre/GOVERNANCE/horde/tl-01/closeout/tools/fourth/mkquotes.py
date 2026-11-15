"""resolve quote specs to exact strings of the builder's normalised view; prints them with their pages (written to quotes.json)"""
import sys, re, json, os
ROOT = '/home/user/cautious-chainsaw'
sys.path.insert(0, ROOT + '/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout'); sys.path.insert(0, ROOT + '/tools/bt')
import build as B, extra_sources as X
SPECS = {
 # key: (sid, start_regex, end_regex)   the quote runs from the start of the first match to the end of the first match of end_regex after it
 'hoke_date':   ('HOKE-1887', r'In the morning of this day . Friday, 26th', r'where it had remained'),
 'hoke_burn':   ('HOKE-1887', r'While on their way across the mountain they burned', r'about ten miles from Chambersburg\.'),
 'hoke_order':  ('HOKE-1887', r'they were burned by my order', r'on my own responsibility\.'),
 'hoke_nocol':  ('HOKE-1887', r'No column of our troops was sent to burn', r'Thaddeus Stevens'),
 'hoke_pettig': ('HOKE-1887', r'About half past nine o.clock in the morning a detachment from', r'a number of wagons, and it was supposed'),
 'hoke_pettig2':('HOKE-1887', r'Approaching the town, this detachment halted', r'encamped at Marsh Creek\.'),
 'hoke_buford': ('HOKE-1887', r'General Buford in command of a division of Federal cavalry passed through Gettysburg', r'\(Tuesday\)'),
 'hist_thu':    ('HISTORY-ADAMS-1886', r'Col\. Jennings and his command had reached', r'on Thursday'),
 'hist_735':    ('HISTORY-ADAMS-1886', r'On the 24th a regiment of Pennsylvania Volunteer', r'to Gettysburg\.'),
 'hist_sent':   ('HISTORY-ADAMS-1886', r'Jennings and his command were sent out on the', r'about forty men'),
 'hist_3pm':    ('HISTORY-ADAMS-1886', r'the advance g\^ard of the rebels, 200 strong', r'afternoon of the 26th,'),
 'hist_10':     ('HISTORY-ADAMS-1886', r'By ten o.clock the next day the rear of their army', r'toward the east\.'),
 'hist_overnight': ('HISTORY-ADAMS-1886', r'Ewell.s forces arrived Friday afternoon', r'on toward York\.'),
 'hist_guards': ('HISTORY-ADAMS-1886', r'Guards were posted about the public buildings', r'private houses\.'),
 'hist_sidewalks': ('HISTORY-ADAMS-1886', r'When permitted to stack arms', r'under their heads\.'),
 'hist_1030':   ('HISTORY-ADAMS-1886', r'June 30, at half past ten o.clock in the morning, Buford passed', r'in force'),
 'star_furn':   ('CA-sn83045462-1863-07-01-p2', r"At Stevens' Furnace, which", r'was destroyed\.'),
 'star_fri':    ('CA-sn83045462-1863-07-01-p2', r'The place was occupied on', r'light artillery\.'),
 'star_left':   ('CA-sn83045462-1863-07-01-p2', r'The next morning after the occupation the rebels', r'Har over\.'),
 'spy_iron':    ('CA-sn83021205-1863-07-02-p1', r'Hon\. Thad\. Stevens', r'tysburg have been destroyed by the rebels\. His loss is about'),
 'wni_fri':     ('CA-sn83045784-1863-07-02-p3', r'regi ment lefc Harrisburg on Thursday', r'went to Gettysburg\.'),
 'cht_fri':     ('CA-sn84031490-1863-06-29-p1', r'that CoL Jenning regiment left', r'went there\.'),
 'cht_140':     ('CA-sn84031490-1863-06-29-p1', r'The rebels captured a train of', r'near Rockville, Md\.'),
 'tri_175':     ('CA-sn83030213-1863-07-01-p1', r'Of the 170 wagons they captured near Rockville', r'Rockville'),
 'press_9':     ('CA-sn84031490-1863-07-03-p1', r'The Press has the following: Columbia', r'7 in the evening\.'),
 'star_camp':   ('CA-sn83045462-1863-07-01-p2', r'The Rebel troops, forty-five hundred strong', r'strong'),
 'nps_clr_sem': ('NPS-CLR-1STDAY', r'Arriving on June 30, General Buford used the cupola', r'McPherson Farm'),
 'nps_clr_schm': ('NPS-CLR-1STDAY', r'Schmucker Hall or Old Dorm \(1832\), the original seminary building', r'Union signal station'),
 'slentz_aff': ('NPS-HS-MCPHERSON', r"G e n l B u f o r d ' s com mand", r'f o r t h e b a t t l e \.'),
 'slentz_pet': ('NPS-HS-MCPHERSON', r"B u f o r d ' s C a v a l r y who", r'J u n e 3 0 1 8 6 3'),
 'hoke_steeple': ('HOKE-1887', r'In the evening of this day . Monday, June 29th, . some time after dark', r'to take observations\.'),
 'hoke_fires':  ('HOKE-1887', r'The line of the railroad could be traced by the numerous fires', r'innumerable lights were seen\.'),
 'hoke_stream': ('HOKE-1887', r'we saw a continuous stream of wagons driven hurriedly', r'through our street\.'),
 'hoke_rumble': ('HOKE-1887', r'A low, rumbling noise could be heard', r'moving trains\.'),
 'hoke_union1': ('HOKE-1887', r"At night the head of Stuart.s column rested at Union Mills", r'Westminster and Littlestown\.'),
 'hoke_union2': ('HOKE-1887', r"Stuart, who had bivouacked over night at Union Mills", r'Westminster and Littlestown,'),
 'spy_14mi':    ('CA-sn83021205-1863-07-08-p1', r"Gregg, at Caledonia iron works", r'miles west of Gettysburg'),
 'hoke_road':   ('HOKE-1887', r'I found the iron works above mentioned on the road aforesaid', r'ascend the South Mountain'),
 'hoke_arrive': ('HOKE-1887', r"In the afternoon of this day Early.s division reached Gettysburg", r'reached Gettysburg'),
 'hoke_time':   ('HOKE-1887', r'probably about one or two o.clock, I was awakened', r'awakened'),
 'hoke_pike':   ('HOKE-1887', r'turning east at the Public Square, drove on out the Gettysburg pike', r'sometimes driven at a trot\.'),
 'hoke_ewell':  ('HOKE-1887', r'These wagons proved to be part of', r'train'),
 'cmp_x':       ('CA-sn83045462-1863-07-01-p2', r'xxxxnotfoundxxxx', r'x'),
}
out = {}
for key, (sid, a, b) in SPECS.items():
    if key == 'cmp_x': continue
    X.register(B.LIB, B.FIXED_PAGE, B.LABEL, [sid])
    raw, nt, nm, rel, sha = B.lib_text(sid)
    ma = re.search(a, nt)
    if not ma:
        print('NOT FOUND start', key); continue
    mb = re.search(b, nt[ma.start():])
    if not mb:
        print('NOT FOUND end', key); continue
    q = nt[ma.start(): ma.start() + mb.end()]
    n = nt.count(q)
    gp, ph, nh = B.lib_page_generic(sid, raw, nm[ma.start()])
    fp = B.FIXED_PAGE.get(sid, (None,))[0]
    out[key] = dict(sid=sid, quote=q, count=n, generic_page=gp, fixed_page=fp, prev=ph and (ph[0], ph[2][:40]), next=nh and (nh[0], nh[2][:40]), raw_offset=nm[ma.start()])
    print('%-14s %-34s n=%d gp=%s fp=%s prev=%s next=%s len=%d' % (key, sid, n, gp, fp, ph and ph[0], nh and nh[0], len(q)))
    print('     ' + q[:260])
json.dump(out, open(ROOT + '/tmp/tl-01/run3/quotes.json', 'w'), ensure_ascii=False, indent=1)
