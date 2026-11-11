import re, glob, json
T='/home/user/cautious-chainsaw/tmp/library/ws9/'
def load(pat):
    f=glob.glob(T+pat)[0]
    t=open(f,encoding='utf-8',errors='replace').read()
    t=re.sub(r'-\s*\n\s*','',t)   # join hyphenated line breaks
    return re.sub(r'\s+',' ',t)
def chk(file,q):
    return q in load(file)
Q=[ # (key, file glob, quote as printed (OCR kept), cite)
('J1','JACOBS-1864*','Thursday, June 25.','Jacobs 1864, p.14'),
('J2','JACOBS-1864*','Late on Thursday evening, however, 100 picked','Jacobs 1864, p.14'),
('J3','JACOBS-1864*','But the heavy rain of that night caused','Jacobs 1864, p.14'),
('J4','JACOBS-1864*','Being wet from the rain which had fallen during the most of the day','Jacobs 1864, p.16'),
('F1','FREMANTLE*','At 1 p. M. the rain began to descend in toiTents','Fremantle, p.274 (OCR: toiTents = torrents)'),
('F2','FREMANTLE*','Shortly after 9 p. m. the rain began to descend in torrents.','Fremantle, p.276'),
('F3','FREMANTLE*','thunder and lightning, torrents of rain','Fremantle, p.276'),
('F4','FREMANTLE*','We all got up at 3.30 A. m.','Fremantle, p.256'),
('F5','FREMANTLE*','arrived at 5 A. M. at the same commanding position','Fremantle, p.257'),
('F6','FREMANTLE*','Generals Lee, Hill, Longstreet, and Hood, in consultation','Fremantle, p.257'),
('F7','FREMANTLE*','saw him disposing of M\'Laws\'s division','Fremantle, p.257 (OCR reads the hour as "Y A. M." = 7 A. M.)'),
('F8','FREMANTLE*','A dead silence reigned till 4.45 p. m.','Fremantle, p.258'),
('F9','FREMANTLE*','Pickett being still in the rear','Fremantle, p.258'),
('F10','FREMANTLE*','Longstreet suddenly commenced a heavy cannonade on the right','Fremantle, p.259'),
('L1','LETTERMAN*','drenching rain which fell after the battle','Letterman 1866, p.156'),
('L2','LETTERMAN*','Before daylight on the morning of the 4th all the wounded within our lines','Letterman 1866, p.158'),
('L3','LETTERMAN*','were removed to the hospitals','Letterman 1866, p.158'),
('L4','LETTERMAN*','fourteen thousand one hundred and ninety-three','Letterman 1866, p.159'),
('L5','LETTERMAN*','six thousand eight hundred and two','Letterman 1866, p.160'),
('L6','LETTERMAN*','twenty thousand nine hundred and ninety-five','Letterman 1866, p.160'),
('A1','ALEXANDER*','About 11 A.M., his orders were issued.','Alexander 1907, p.391'),
('A2','ALEXANDER*','It was about 3 P.M. when Hood\'s division, in the advance, crossed the Emmitsburg road','Alexander 1907, p.394'),
('A3','ALEXANDER*','Thus, about 3.45 P.M., 36 guns were in action','Alexander 1907, p.395'),
('A4','ALEXANDER*','After this cannonade had continued for perhaps 30 minutes, Hood received the order to advance.','Alexander 1907, p.395'),
('A5','ALEXANDER*','When Stuart, at last, reported in person, late in the afternoon of the 2d','Alexander 1907, p.376'),
('W1','prior/BL-3*','At 3 o\'clock on the morning of the 2d','Law in Battles and Leaders vol. 3, p.319'),
('W2','prior/BL-3*','arrived there shortly before noon','Law, B&L 3, p.319'),
('W3','prior/BL-3*','It was now past 4 o\'clock in the afternoon','Law, B&L 3, p.320'),
('W4','prior/BL-3*','It was near 5 o\'clock p. M. when we advanced to the attack.','Law, B&L 3, p.323'),
('W5','prior/BL-3*','had been warmly engaged for about fifteen minutes','Law, B&L 3, p.323'),
('W6','prior/BL-3*','exposed it to a flank attack on the right by fresh troops (Vincent\'s brigade)','Law, B&L 3, p.324'),
('E1','EVERETT*','The Presidential party was accompanied by the Marine Band','Everett 1864 pamphlet, p.12'),
('E2','EVERETT*','from the Navy Yard at Washington','Everett 1864, p.12'),
('E3','EVERETT*','Music, by the Marine Band.','Everett 1864, p.25 (programme)'),
('E4','EVERETT*','The head of the column will move at precisely ten o\'clock','Everett 1864, p.24 (programme)'),
('E5','EVERETT*','for the purpose of saluthig the President of the United States','Everett 1864, p.24 (programme; OCR: saluthig = saluting)'),
('E6','EVERETT*','arrived at Gettysburg, by a special train','Everett 1864, p.20'),
('E7','EVERETT*','the President and Secretary of State were serenaded','Everett 1864, p.20'),
('E8','EVERETT*','Dedicatory Remarks, by the President of the United States.','Everett 1864, p.25 (programme)'),
('E9','EVERETT*','Dirge, sung by Choir selected for the occasion.','Everett 1864, p.25 (programme)'),
('E10','EVERETT*','that the nation shall, under God, have a new birth of freedom','Everett 1864 (Lincoln text, pp.82-85)'),
('S1','ADAMS-SENTINEL-1863-11-24*','clouded sky, giving assurance of lovely','Adams Sentinel 1863-11-24 (OCR before it reads: "dawned on Thursday With an tin-" = "unclouded")'),
('S2','ADAMS-SENTINEL-1863-11-24*','* Marine Band.','Adams Sentinel 1863-11-24, procession list'),
('S3','ADAMS-SENTINEL-1863-11-24*','Col. Anderson, Lieat Governor elect of Ohio, delivert-d an able address in the Presbyterian church.','Adams Sentinel 1863-11-24'),
('S4','ADAMS-SENTINEL-1863-11-24*','several of the Governors of the States, occupied seats in the pulpit.','Adams Sentinel 1863-11-24'),
('S5','ADAMS-SENTINEL-1863-11-24*','President Lincoln and party left late in the evening in a special car.','Adams Sentinel 1863-11-24'),
('S6','ADAMS-SENTINEL-1863-11-24*','President WDS serenaded twice during the evening','Adams Sentinel 1863-11-24 (OCR: WDS = was)'),
('S7','ADAMS-SENTINEL-1863-07-21*','now presents a sad appearance.','Adams Sentinel 1863-07-21'),
('S8','ADAMS-SENTINEL-1863-07-21*','necessary to post a number of batteries','Adams Sentinel 1863-07-21'),
('N1','prior/NY-GB-1902-v3*','In 1863 the One hundred and forty-sixth adopted the Zouave uniform.','New York at Gettysburg vol. 3, p.968'),
('B1','BACH-WHATTOSEE-1873*','A beautiful field of uncut wheat stood here in the morning','Bachelder 1873, p.83'),
]
if __name__=='__main__':
    bad=0
    for k,f,q,c in Q:
        ok=chk(f,q)
        if not ok: bad+=1; print('NOT FOUND',k,q)
    print('checked',len(Q),'bad',bad)
