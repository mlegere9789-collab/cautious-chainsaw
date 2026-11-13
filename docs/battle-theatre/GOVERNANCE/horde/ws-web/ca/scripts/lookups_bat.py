"""Lookups for battle-day items that the saved 1863 pages do not support (recorded as failed lookups, Law 4)."""
W = ('1863-06-26', '1863-09-30')
LOOKUPS = [
    dict(ids=['T3-049'], key='jennie-wade', what='Jennie (Ginnie) Wade killed in her sister\'s house in Baltimore Street on the morning of 3 July (a girl killed in the house while baking).',
         patterns=[r"Jennie Wade|Jenny Wade|Ginnie Wade|Virginia Wade|Miss Wade|Jennie Wads", r"(young )?(lady|girl|woman)\W+(\w+\W+){0,14}(killed|shot)\W+(\w+\W+){0,20}(baking|bread|kitchen|dough)"], window=W, state_date='1863-07-03',
         remains='no saved page of 26 June to 30 September 1863 names her; the first printings are expected later in the year and in the Gettysburg Compiler (not in the saved set)'),
    dict(ids=['T1-114', 'T3-167'], key='st-francis-xavier-sisters', what='St. Francis Xavier Catholic church as a hospital by noon on 1 July, and the Sisters of Charity from Emmitsburg nursing the wounded.',
         patterns=[r"Sisters of Charity\W+(\w+\W+){0,30}(Gettysburg|Emmitsburg)", r"(Gettysburg|Emmitsburg)\W+(\w+\W+){0,30}Sisters of Charity", r"St\.? Francis Xavier"], window=W, state_date='1863-07-01'),
    dict(ids=['T3-170'], key='greencastle-axes', what='Greencastle civilians attacking the wagon train wheels with axes at dawn on 5 July.',
         patterns=[r"Greencastle\W+(\w+\W+){0,40}(axes|hatchets)\b", r"\b(axes|hatchets)\b\W+(\w+\W+){0,40}Greencastle", r"(women|citizens|inhabitants)\W+(\w+\W+){0,12}(cut|chopped|hacked)\W+(\w+\W+){0,12}(spokes|wheels)"], window=('1863-07-05', '1863-07-31'), state_date='1863-07-05'),
    dict(ids=['T3-137', 'T1-140', 'T2-003', 'T3-013'], key='spangler-farm', what='The Spangler farm (XI Corps hospital) named as a hospital, or Brig. Gen. Armistead brought there on the evening of 3 July.',
         patterns=[r"Spangler", r"Armistead\W+(\w+\W+){0,30}(ambulance|hospital|brought|died|dead|mortally)"], window=('1863-07-03', '1863-09-30'), state_date='1863-07-03',
         remains='Armistead appears in the saved pages only as wounded in the charge; no page of the saved set places him at the Spangler farm'),
    dict(ids=['T3-153', 'T3-185'], key='townspeople-return', what='Gettysburg townspeople or farm families returning to their homes on 4-7 July (Klingle, Sherfy, Pierce).',
         patterns=[r"(Klingle|Klingel|Sherfy|Tillie Pierce)", r"(returned|returning) to (their|his|her) (homes?|farms?)\W+(\w+\W+){0,20}Gettysburg"], window=('1863-07-04', '1863-08-15'), state_date='1863-07-06'),
]
