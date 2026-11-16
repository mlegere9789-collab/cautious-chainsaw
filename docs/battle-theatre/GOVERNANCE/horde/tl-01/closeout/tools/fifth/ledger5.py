import json, os, re, subprocess, hashlib
ROOT='/home/user/cautious-chainsaw'
A=ROOT+'/docs/battle-theatre/GOVERNANCE/horde/tl-01/closeout/acquired_tl01.json'
# id, file, lccn, date, seq, phrase, PAD, PADX, paper, purpose
ITEMS=[
('ca5-star-0627-p2','star0627p2.jpg','sn83045462','1863-06-27',2,'train of thirteen freight cars',500,None,'Evening Star, Jun 27 1863, page 2','the Bulletin special of Jun 27 (3 o\'clock, thirteen freight cars, bridge and train destroyed): rows T1-014, T1-015'),
('ca5-star-0627-p2b','star0627p2b.jpg','sn83045462','1863-06-27',2,"encamped on Wolf's farm",120,700,'Evening Star, Jun 27 1863, page 2','Wolf\'s farm, a mile and a half from this side of the town: row T1-017'),
('ca5-star-0627-p1','star0627p1.jpg','sn83045462','1863-06-27',1,'at noon yesterday',250,None,'Evening Star, Jun 27 1863, page 1','report of the Baltimore American of the 26th: cavalry fully 1,000 strong took possession of Gettysburg at noon yesterday: row T1-014'),
('ca5-dnl-0629-p3','dnl0629p3.jpg','sn83026172','1863-06-29',3,'train of thirteen freight cars',500,None,'Daily National Intelligencer, Jun 29 1863, page 3','the Bulletin special (3 o\'clock, thirteen freight cars, Wolf\'s farm a mile and a half): rows T1-014, T1-015, T1-017'),
('ca5-dnl-0629-p3-wolf','dnl0629p3b.jpg','sn83026172','1863-06-29',3,'At midnight their pickets',200,800,'Daily National Intelligencer, Jun 29 1863, page 3','eight thousand strong, Gen. Robinson, pickets near Oxford, cars of the Pennsylvania Central: rows T1-015, T1-017, T1-018'),
('ca5-dnl-0629-p3c','dnl0629p3c.jpg','sn83026172','1863-06-29',3,'THE ENEMY APPROACHING YORK',150,900,'Daily National Intelligencer, Jun 29 1863, page 3','dateline of the Harrisburg dispatch of Jun 27 (5 P. M.): row T1-020'),
('ca5-dnl-0629-p3d','dnl0629p3d.jpg','sn83026172','1863-06-29',3,'a few minutes after twelve',100,900,'Daily National Intelligencer, Jun 29 1863, page 3','the rebel column under Early reached the Northern Central railroad a few minutes after twelve: row T1-020'),
('ca5-dnl-0629-p3f','dnl0629p3f.jpg','sn83026172','1863-06-29',3,'The rebels occupied York at',120,1800,'Daily National Intelligencer, Jun 29 1863, page 3','the rebels occupied York at five o\'clock this evening (Jun 27): row T1-032'),
('ca5-cht-0629-p1','cht0629p1.jpg','sn84031490','1863-06-29',1,'train of sixteen freight cars',500,None,'Chicago Daily Tribune, Jun 29 1863, page 1','the Bulletin special (3 o\'clock, sixteen freight cars, Wolf\'s farm half a mile): rows T1-014, T1-015, T1-017'),
('ca5-cht-0629-p1-thu','cht0629p1c.jpg','sn84031490','1863-06-29',1,'On Thursday night the rebel',250,700,'Chicago Daily Tribune, Jun 29 1863, page 1','the cars of the Northern and Pennsylvania Central railroads; Thursday night Cashtown to Fayetteville; a scout shot: rows T1-004, T1-013, T1-015'),
('ca5-cht-0629-p1-26th','cht0629p1b.jpg','sn84031490','1863-06-29',1,'Good authority says that yesterday',300,None,'Chicago Daily Tribune, Jun 29 1863, page 1','the 26th Pennsylvania militia on a reconnoissance, the cars off the track six miles this side of Gettysburg: row T1-007'),
('ca5-cht-0629-p1d','cht0629p1d.jpg','sn84031490','1863-06-29',1,'Their force is represented to be',150,900,'Chicago Daily Tribune, Jun 29 1863, page 1','8,000 strong under Gen. Robinson, pickets near Oxford: rows T1-017, T1-018'),
('ca5-cht-0629-p1e','cht0629p1e.jpg','sn84031490','1863-06-29',1,'reached the Northern',150,900,'Chicago Daily Tribune, Jun 29 1863, page 1','the rebel columns under Early reached the Northern Central Railroad about ten o\'clock: row T1-020'),
('ca5-tri-0629-p1','tri0629a2.jpg','sn83030213','1863-06-29',1,'ran all the cars',300,1000,'New-York Daily Tribune, Jun 29 1863, page 1','scout killed at Gettysburg, the cars on the Rock Creek bridge set on fire, Jennings\'s regiment routed, 40 taken: rows T1-010, T1-013, T1-015'),
('ca5-tri-0629-p1-dowling','tri0629b2.jpg','sn83030213','1863-06-29',1,'Michael Dowling was taken',250,900,'New-York Daily Tribune, Jun 29 1863, page 1','Michael Dowling taken by a party seven or eight hundred strong on the Chambersburg pike: row T1-010'),
('ca5-star-0629-p1','star0629p1.jpg','sn83045462','1863-06-29',1,'lost about three hundred men',250,None,'Evening Star, Jun 29 1863, page 1','Jennings\'s regiment lost about three hundred men in prisoners and stragglers: rows T1-010, T1-012'),
('ca5-star-0629-p2b','star0629p2b.jpg','sn83045462','1863-06-29',2,'WAGONS AND OVER ONE',100,1300,'Evening Star, Jun 29 1863, page 2','head of the article on the wagon train: one hundred and seventy-eight wagons and over one thousand mules: row T1-026'),
('ca5-star-0629-p2c','star0629p2c.jpg','sn83045462','1863-06-29',2,'at about half-past twelve',120,900,'Evening Star, Jun 29 1863, page 2','the head of the train met at about half-past twelve: row T1-026'),
('ca5-star-0629-p2d','star0629p2d.jpg','sn83045462','1863-06-29',2,'consisting of 150 wagons',200,900,'Evening Star, Jun 29 1863, page 2','a train of 150 wagons, each drawn by six mules, left Washington between seven and eight o\'clock on the morning of Jun 28: row T1-026'),
('ca5-cht-0703-p1','cht0703p1.jpg','sn84031490','1863-07-03',1,'moved forward to Hanover,',260,1000,'Chicago Daily Tribune, Jul 3 1863, page 1','the first lines of the Philadelphia Press special of Columbia, Jul 1 (the 5th New York ... charged upon in the rear by Stuart\'s rebel cavalry, about six thousand strong; 1,800): rows T1-044, T1-046'),
('ca5-cht-0630-p1','cht0630p1.jpg','sn84031490','1863-06-30',1,'crossed the Potomac at Seneca,',150,1000,'Chicago Daily Tribune, Jun 30 1863, page 1','Baltimore dispatch of Jun 28: a rebel force of 3,000 cavalry and seven pieces of artillery crossed the Potomac at Seneca last night and this morning took the Darnestown road: row T1-024'),
('ca5-star-0701-p2','star0701p2.jpg','sn83045462','1863-07-01',2,'arrived at Seneca Creek at 4',120,1000,'Evening Star, Jul 1 1863, page 2','Capt. Granger arrived at Seneca Creek at 4 o\'clock on Sunday morning and found himself surrounded by the whole of the forces: row T1-024'),
('ca5-dnl-0701-p2b','dnl0701p2b.jpg','sn83026172','1863-07-01',2,'crossed the Potomac near Seneca',150,1000,'Daily National Intelligencer, Jul 1 1863, page 2','the main body of the rebel cavalry that crossed the Potomac near Seneca on Sunday morning camped that night at Sandy Springs: row T1-024'),
('ca5-her-0702-p4','her0702p4.jpg','sn83030313','1863-07-02',4,'Reveille sounded in',260,1200,'New York Herald, Jul 2 1863, page 4','G. W. Hosmer\'s letter from the headquarters of the Twelfth Corps, June 28: reveille at three A. M. on Friday the 26th, on the march in the rain (head and first lines): row T1-003'),
('ca5-her-0702-p4b','her0702p4b.jpg','sn83030313','1863-07-02',4,'strongest possible',170,1300,'New York Herald, Jul 2 1863, page 4','the same letter: the day was cool, the roads were deep with soft mud, and the rain fell constantly: row T1-003'),
('ca5-star-0701-p1','star0701p1.jpg','sn83045462','1863-07-01',1,'there arrived one hundred',250,None,'Evening Star, Jul 1 1863, page 1','one hundred prisoners captured at Gettysburg arrived (at Carlisle): row T1-012'),
('ca5-star-0702-p1b','star0702p1b.jpg','sn83045462','1863-07-02',1,'captured a battle-flag,',200,900,'Evening Star, Jul 2 1863, page 1','official advices of Jul 1: a battle-flag, a lieutenant colonel, one captain and forty-five privates captured at Hanover: row T1-051'),
('ca5-star-0702-p1c','star0702p1c.jpg','sn83045462','1863-07-02',1,'yesterday afternoon at Haiiover Junction',250,900,'Evening Star, Jul 2 1863, page 1','Harrisburg dispatch of Jul 1: the enemy lost 400 in killed, wounded and prisoners, besides six pieces of artillery: row T1-051'),
('ca5-dnl-0701-p2','dnl0701p2.jpg','sn83026172','1863-07-01',2,'About four o’clock on Monday',300,None,'Daily National Intelligencer, Jul 1 1863, page 2','about four o\'clock on Monday afternoon the Federal scouts reported a rebel force advancing on Westminster: row T1-037'),
('ca5-dnl-0630-p3','dnl0630p3.jpg','sn83026172','1863-06-30',3,'number of wagons captured was',300,None,'Daily National Intelligencer, Jun 30 1863, page 3','the number of wagons captured was one hundred and seventy-eight, and one thousand mules: row T1-026'),
('ca5-spy-0703-p1','spy0703p1.jpg','sn83021205','1863-07-03',1,'reached there about 5',500,None,'Worcester Daily Spy, Jul 3 1863, page 1','Stuart reached Westminster about 5 o\'clock, advance guard about 300, rebels lost two lieutenants killed: row T1-037'),
('ca5-spy-0703-p1b','spy0703p1b.jpg','sn83021205','1863-07-03',1,'Our loss was two privates',150,900,'Worcester Daily Spy, Jul 3 1863, page 1','our loss two privates killed and twenty-eight taken prisoners (Westminster): row T1-037'),
('ca5-spy-0701-p1','spy0701p1.jpg','sn83021205','1863-07-01',1,'large body of iederal cavalry',250,None,'Worcester Daily Spy, Jul 1 1863, page 1','a large body of Federal cavalry reached Gettysburg (Inquirer special of Jun 30): row T1-045'),
('ca5-spy-0702-p1','spy0702p1.jpg','sn83021205','1863-07-02',1,'Gen. Buford drove u regiment',250,None,'Worcester Daily Spy, Jul 2 1863, page 1','Times special: during the forenoon Kilpatrick and Custer drove Stuart out of Hanover; Buford drove a regiment of infantry out of Gettysburg (north-easterly): rows T1-045, T1-046'),
('ca5-whig-0707-p2','whig0707p2.jpg','sn84024669','1863-07-07',2,'They advanced ou Tuesday to Hanover',650,None,'Richmond Whig, Jul 7 1863, page 2','Captain McIrvin\'s report: Stuart advanced to Hanover at 9 o\'clock on Tuesday, the battle raged furiously all day: rows T1-044, T1-046'),
('ca5-whig-0707-p2b','whig0707p2b.jpg','sn84024669','1863-07-07',2,'Stuart admits a loss',300,1100,'Richmond Whig, Jul 7 1863, page 2','Stuart admits a loss of 35 killed; prisoners heard artillery firing until 7 (the fraction): rows T1-046, T1-051'),
('ca5-whig-0707-p2c','whig0707p2c.jpg','sn84024669','1863-07-07',2,'until 74',100,900,'Richmond Whig, Jul 7 1863, page 2','the line with the small fraction after 7 (heavy artillery firing until 7 and a half): row T1-046'),
('ca5-her-0702-p10c','her0702p10c.jpg','sn83030313','1863-07-02',10,'General Rarly',100,1700,'New York Herald, Jul 2 1863, page 10','General Early took one hundred and twenty-six prisoners at Gettysburg: row T1-012'),
('ca5-wni-0702-p3','wni0702p3.jpg','sn83045784','1863-07-02',3,'On Friday morning the regiment',120,1500,'Weekly National Intelligencer, Jul 2 1863, page 3','the dispatch of Jun 27 with the word Friday plain (the crop of the fourth start, ca-wni-0702-jennings, had cut it): row T1-007'),
]
a=json.load(open(A))
have={i.get('id') for i in a['items']}
new=0
for (iid,fn,lccn,date,seq,phrase,pad,padx,paper,purpose) in ITEMS:
    if iid in have: continue
    env=dict(os.environ); env['DRY']='1'; env['PAD']=str(pad)
    if padx: env['PADX']=str(padx)
    out=subprocess.run(['python3','-I',ROOT+'/tmp/tl-01/run5/crop5.py',lccn,date,str(seq),phrase,'crops/zz.jpg'],capture_output=True,text=True,env=env,cwd=ROOT+'/tmp/tl-01/run5').stdout
    m=re.search(r'^URL (\S+)',out,re.M)
    path=ROOT+'/tmp/tl-01/run5/crops/'+fn
    raw=open(path,'rb').read()
    url=m.group(1) if m else None
    a['items'].append(dict(id=iid, archive_identifier='%s (Chronicling America, Library of Congress)'%lccn, url=url, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        fetched_at='2026-11-16 (one request, viewed in the fifth start of this close-out)', local_path='tmp/tl-01/run5/crops/'+fn, pages_viewed='viewed',
        purpose='%s: %s' % (paper, purpose)))
    new+=1
a['_doc']=a['_doc'].rstrip()+' Fifth start (2026-11-16): the items "ca5-*" are crops of page images of 1863 newspapers (IIIF regions of the Library of Congress image service, one request each, at least 1.2 s apart; the image id is built from the segment of the page record of the web-evidence workstream, horde/ws-web/ca/pages.jsonl); the crops are regenerated from the url; the files under tmp/tl-01/run5/crops are untracked scratch.'
json.dump(a,open(A,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('added',new,'items; total',len(a['items']))
bad=[i['id'] for i in a['items'] if str(i.get('id','')).startswith('ca5-') and not i.get('url')]
print('without url:',bad)
