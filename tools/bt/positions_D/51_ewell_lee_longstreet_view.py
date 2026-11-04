"""D batch 51: II Corps statements made in Lee's report R426 and Longstreet's report R430 (partners of the Ewell conflicts in batch 50)."""
from positions_build import C

CLAIMS = [
    C('cs-2c-johnson', 'march', 'R430', a="Our march was greatly delayed on this day by Johnson's division, of the Second Corps, which came into the road from Shippensburg",
      w='July 1 (to 4 p. m. per Kershaw)', d='07-01', ap=True,
      pl='the Chambersburg-Gettysburg road, entered from Shippensburg', rd='the road from Shippensburg into the Chambersburg to Gettysburg road',
      act="Longstreet: Johnson's division of the Second Corps came into the road from Shippensburg on July 1 with the long wagon trains that followed it and greatly delayed the First Corps march.",
      cf='johnson_arrival_jul1',
      note="Kershaw (R432) prints that Anderson's and Johnson's divisions and Ewell's wagon train occupied the road until 4 p. m. Lee (R426) prints that Johnson reached Gettysburg at a late hour."),
    C('cs-2c-johnson', 'engagement', 'R426', a="re-enforced General Johnson with two brigades from Rodes' and one from Early's division",
      w='during the night (July 2-3)', d='07-03', ap=True,
      pl="Johnson's position on the wooded hill (Culp's Hill)", gz='GZ-002',
      act="Lee: during the night of July 2-3 Ewell reinforced Johnson with two brigades from Rodes' and one from Early's division.",
      cf='johnson_reinf_jul3'),
    C('cs-2c-johnson', 'movement', 'R426', a='rendering it necessary for him to retire to his original position about 1 p. m.',
      w='about 1 p. m. (July 3)', d='07-03', t='13:00', ap=True,
      pl='his original position', gz='GZ-002',
      act='Lee: after a prolonged struggle Johnson was unable to carry the crest of the hill and retired to his original position about 1 p. m. on July 3.',
      cf='johnson_evac_jul3',
      note='Ewell (R467) prints one sentence "till ordered out at noon next day" (Steuart) and another "about 1 p. m." for Johnson evacuating the works.'),
    C('cs-2c', 'departure', 'R426', a='did not leave Gettysburg until late in the forenoon of the following day',
      w='late in the forenoon (July 5)', d='07-05', ap=True,
      pl='Gettysburg (left in the retreat toward Fairfield and Hagerstown)', rd='Fairfield road',
      act="Lee: Ewell's corps, bringing up the rear in a heavy rain, did not leave Gettysburg until late in the forenoon of July 5.",
      cf='ii_corps_leave'),
]
