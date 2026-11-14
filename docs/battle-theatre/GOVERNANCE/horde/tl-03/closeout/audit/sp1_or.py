HR = r"(?:\d{1,2}(?:\.\d{2})? ?[ap]\. ?m\.?|o.clock|noon)"
SPECS = [
 {'rows': 'T1-116', 'scope': 'or', 'pat': 'Pleasonton.{0,160}(?:Taneytown|Gettysburg|Westminster).{0,160}(?:July 1|1st|first)', 'note': 'Pleasonton himself on Jul 1 (position of the person, not the headquarters)', 'max': 3},
 {'rows': 'T1-116', 'scope': 'or1', 'pat': '(?:Abbottstown|Berlin).{0,250}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)', 'note': "hours of Kilpatrick's Jul 1 march to Abbottstown and Berlin", 'max': 4},
 {'rows': 'T1-117', 'scope': 'or1', 'pat': "(?:Cooper|Stewart|Breck|Whittier|Stevens|Wilber|Reynolds)(?:'s)? (?:battery|section|sections).{0,220}(?:arrived|reached|came up|came into position|went into position).{0,120}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)", 'note': 'arrival hour of the First Corps batteries', 'max': 4},
 {'rows': 'T1-118', 'scope': 'or2', 'pat': 'Carter.{0,300}(?:opened|open fire|opened fire|commenced firing).{0,180}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)', 'note': "hour at which Carter's battalion opened", 'max': 3},
 {'rows': 'T1-118', 'scope': 'or2', 'pat': "Fry(?:'s)?.{0,60}battery.{0,300}(?:loss|lost|killed|wounded|casualt)", 'note': "any loss of Fry's battery", 'max': 3},
 {'rows': 'T1-119', 'scope': 'or2', 'pat': 'Brockenbrough.{0,300}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)', 'note': "hour of Brockenbrough's brigade on Jul 1", 'max': 3},
 {'rows': 'T1-120', 'scope': 'or1', 'pat': 'a little after (?:1|one) (?:o.clock|p\\. ?m)', 'note': 'Howard expected the corps a little after one', 'max': 3},
 {'rows': 'T1-120', 'scope': 'or1', 'pat': '(?:Schimmelfennig|Krzyzanowski|Dobke|Schurz|Third Division).{0,250}(?:arrived|entered|reached).{0,120}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)', 'note': 'hour at which the Third Division entered the town', 'max': 4},
 {'rows': 'T1-122', 'scope': 'or1', 'pat': "Paul(?:'s)? brigade.{0,250}(?:1 p\\. ?m|1\\.30|one o.clock|1 o.clock|2 p\\. ?m)", 'note': "hour of the move of Paul's brigade", 'max': 3},
 {'rows': 'T1-124', 'scope': 'or', 'pat': '(?:General Lee|commanding general).{0,150}(?:arrived|reached|came up|rode up).{0,100}(?:Gettysburg|the field).{0,100}(?:\\d{1,2}(?:\\.\\d{2})? ?[ap]\\. ?m\\.?|o.clock|noon)', 'note': "hour of Lee's arrival, Official Records", 'max': 3},
 {'rows': 'T1-127', 'scope': 'or1', 'pat': '(?:Cemetery Hill|cemetery).{0,300}(?:earthwork|breastwork|intrench).{0,200}(?:feet|foot|inches|yards)', 'note': 'dimensions of the dusk earthworks on Cemetery Hill', 'max': 3},
 {'rows': 'T1-131', 'scope': 'or2', 'pat': 'piecemeal', 'note': "the attack of Rodes' division called piecemeal", 'max': 4},
 {'rows': 'T1-135', 'scope': 'or', 'pat': '(?:Heard|Bache).{0,250}(?:hospital|wounded|seminary|college|court)', 'note': 'First Corps hospital officers Heard and Bache', 'max': 3},
]
