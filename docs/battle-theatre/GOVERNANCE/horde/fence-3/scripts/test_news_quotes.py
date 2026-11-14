import sys
sys.path.insert(0, '/home/user/cautious-chainsaw/tmp/fence-3/scripts')
from cite import NPSW
T = [
 ('star_1119_p2', 'The weather is fine to-day'),
 ('star_1119_p1', 'Gov. Curtin, Gov. IMerpont, Gov. elect Brough'),
 ('star_1120_p2', 'morning opened bright and bean tiful'),
 ('star_1120_p2', 'The Band of the 5th New York Artillery ser enaded the President soon after his arrival'),
 ('star_1120_p2', 'During the evening a large number of per sons continued to linger round the residence'),
 ('star_1120_p2', "Gettysburg at 0# o'clock on Wednesday eve ning"),
 ('star_1120_p2', 'in the centre of the cemetery a quarter before noon'),
 ('star_1120_p2', 'probably as large if not a larger camber ol people that ever assembled before'),
 ('star_1120_p2', 'the mournful booming of minute guns smote upon the ear'),
 ('tribune_1120_p1', 'After supper the President was serenaded by the excellent band of the 5th New-York Artillery'),
 ('tribune_1120_p1', "The President's party arrived last evening"),
 ('tribune_1120_p1', 'occupied by civilians comprising about 15,000 people'),
 ('tribune_1120_p1', 'including men, women, and children'),
 ('tribune_1120_p1', 'At a quarter past 11 the head of the procession arived at the main stand'),
 ('tribune_1120_p1', 'The military escort comprised one squadron of cavalry'),
 ('tribune_1121_p2', 'The eventful morning has at last dawned'),
 ('tribune_1121_p2', 'is bright, and al nature has donned her best attire'),
 ('tribune_1121_p2', 'it is estimated that at least 15,000 rsons are in town'),
 ('tribune_1121_p2', 'Serenades seem to be the order of the evenlng'),
 ('tribune_1121_p2', "and some seven of the foreign ministers, arrived et about 5 o'clock"),
 ('tribune_1121_p2', 'the military formed around the inadequately sized platform'),
 ('tribune_1121_p2', 'Governor Curtin of Pennsylvania, Governor Beymour of New-York, Ex-Governor Tod of Obie'),
 ('tribune_1121_p2', 'Governor Coburn of Maine, Governor Morton of Indiana, Ex-Governor Wright of Indiana, Governor Bradford of Maryland'),
 ('tribune_1121_p2', 'Gov, Parker of New-Jersey, Ex-Gov, Dennison of Olio'),
 ('tribune_1121_p2', 'half circles around a common oeuter, on which it is proposed to erect a monument'),
 ('tribune_1121_p2', 'will be surroubded by a subetautial stone'),
 ('tribune_1121_p2', 'Rifle-pits line the whole length of the road'),
 ('tribune_1121_p2', 'Wooden fences are torn down and the stone ones strengthened and nsed as hreastworks'),
 ('tribune_1121_p2', 'Trees marked, limbs and brauches torn'),
 ('tribune_1121_p2', 'acres of land were purchased for the som of £3,150'),
 ('tribune_1121_p2', 'Totbesssivnssnnsnseressh 188'),
 ('tribune_1121_p2', 'The following is a list of the remains already interred In the Cemetery, with the States they represent'),
 ('tribune_1121_p2', 'Mr. Townsend of Rahway, N. J, who ls ths Buperintendent of the grounds'),
]
for tag, q in T:
    try:
        c = NPSW(tag, q)
        print('OK  ', tag, c['offset_start'], c['offset_end'], '|', q[:70])
    except SystemExit as e:
        print('FAIL', tag, '|', q[:80], '|', str(e)[:100])
