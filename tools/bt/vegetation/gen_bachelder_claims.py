"""Claims from Bachelder's descriptions of the field (public-domain texts of the library): the covers and the trees he names, each quote found again in the saved text.

    python -I tools/bt/vegetation/gen_bachelder_claims.py

John B. Bachelder surveyed the field from 1863 and wrote its guides: the Descriptive Key to the painting of the repulse of Longstreet's assault (1870, with the 1904 reprint), Gettysburg: What to See
(1873, the first edition; 1889, the edition "ten years" later). The same passage often stands in several of them: each claim names the EARLIEST edition in which its quote is found (this script tries
them in that order and records which one matched). A guide is not a report of one day: what a passage says of "the time of the battle" is dated so; a description of the hill as it stood when
the guide was written is not (the claim says which). Quotes are copied from the saved text, an OCR misreading and a running head included. verify_claims.py looks every quote up again.
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import srcs  # noqa: E402

OUT = os.path.join(HERE, 'claims_library_bachelder.json')
ORDER = ['BACH-KEY-1864', 'BACH-REPULSE-1870', 'BACH-WHATTOSEE-1873', 'BACH-WHATTOSEE-1889', 'BACH-STORY-1904']
BATTLE = {'from': '1863-07-01', 'to': '1863-07-03'}
G = 'Bachelder\'s guide to the field. '

# (id, kind, tier, quote, says, feature, when, about, anchor, note)
C = [
    ('VC-LIB-026', 'woodlot', 'documented', 'The western side was denuded of timber the year before, which added materially to its advantages as an artillery position.',
     'Bachelder: the western side of Little Round Top had been denuded of timber the year before the battle, which helped it as an artillery position.', 'Little Round Top, west side',
     {'to': '1863-07-01', 'basis': 'the year before the battle (1862)'}, {'canopy': 'cleared', 'lrt': 'west_cleared'}, {'poly': 'LC-OPEN-0001'},
     G + 'It agrees with the cutting of the west slope the National Park Service reports name (VC-NPS-027, VC-NPSC-VISTA-CUTTING-p010-01) and is the earlier witness.'),
    ('VC-LIB-027', 'woodlot', 'documented', 'At the time of the battle the wood had been recently cut away, on its western face, which gave the rough, naked sides of this artillery crowned crest the appearance of an immense battlement',
     'Bachelder: at the time of the battle the wood on the western face of Little Round Top had been recently cut away, which left its rough, naked sides.', 'Little Round Top, west face',
     BATTLE, {'canopy': 'cleared', 'lrt': 'west_cleared'}, {'poly': 'LC-OPEN-0001'}, G + 'The sentence is about the western face only.'),
    ('VC-LIB-028', 'woodlot', 'documented', 'quite precipitous on its eastern face, and generally covered CULFS, WOLF, BENNER\'S, AND HOSPITAL HILLS. 13 with a heavy open growth of hardy timber',
     'Bachelder: Culp\'s Hill is precipitous on its eastern face and generally covered with a heavy open growth of hardy timber.', 'Culp\'s Hill timber',
     {'basis': 'the hill as Bachelder describes it; not dated to a day'}, {'canopy': 'hardy_timber', 'density': 'heavy_open'}, {'poly': 'LC-WOOD-0001'},
     G + 'The running head of the printed page stands inside the saved sentence. "Open growth" is read as widely spaced trees and sets no undergrowth value here.'),
    ('VC-LIB-029', 'woodlot', 'documented', 'In the midst of a healthy growth of fine old oak and hickory, many of the trees are battered and dying from the effects of the terrible musketry fire.',
     'Bachelder (1889): Culp\'s Hill carried a healthy growth of fine old oak and hickory, many of the trees battered and dying from the musketry fire of the battle.', 'Culp\'s Hill: oak and hickory',
     {'basis': 'the hill as it stood in 1889, with the trees of the battle'}, {'species_named': ['oak', 'hickory']}, {'poly': 'LC-WOOD-0001'},
     G + 'Names oak and hickory for the old growth; no share of either is given.'),
    ('VC-LIB-030', 'damage', 'documented', 'When the first edition of this work was written scores of bullet-scarred trees remained standing below the breastworks.',
     'Bachelder (footnote of 1889): when the first edition was written scores of bullet-scarred trees still stood below the breastworks of Culp\'s Hill.', 'Culp\'s Hill: bullet-scarred trees',
     {'basis': 'seen when the first edition was written (1873)'}, {'damage': 'scarred_timber'}, {'gz': "Culp's Hill", 'r_m': 520, 'class': 'woods', 'area': True}, G),
    ('VC-LIB-031', 'woodlot', 'documented', 'The ground rises northward gradually to Oak Hill, which at the time of the battle was covered with timber.',
     'Bachelder: Oak Hill was covered with timber at the time of the battle.', 'Oak Hill timber', BATTLE, {'canopy': 'timber'}, None,
     G + 'Oak Hill lies north of the ground the theatre loads: the passage is evidence and is not drawn.'),
    ('VC-LIB-032', 'ground', 'documented', 'The timber wit! which it was covered, has been cut away since the bat tie.',
     'Bachelder (1889): the timber that covered Oak Hill has been cut away since the battle.', 'Oak Hill timber cut after the battle', {'basis': 'after 1863'}, {}, None,
     G + 'The saved text reads "wit!" for "with" and "bat tie" for "battle".'),
    ('VC-LIB-033', 'ground', 'documented', 'At the time of the battle, that portion of the hill lying west of the village cemetery, E-12, 13, was an open field, and commanded an unobstructed view of the surrounding country.',
     'Bachelder: at the time of the battle the part of Cemetery Hill west of the village cemetery was an open field with an unobstructed view; by 1889 the National Cemetery there was covered with a heavy growth of ornamental trees.', 'Cemetery Hill, west of the village cemetery',
     BATTLE, {'canopy': 'open'}, {'gz': 'Cemetery Hill', 'r_m': 300, 'class': 'field', 'area': True}, G + 'No crop is named.'),
    ('VC-LIB-034', 'woodlot', 'documented', 'across this rocky knoll, which at the time was entirely covered with trees',
     'Bachelder (1889): the rocky knoll beside the Wheatfield, across which the successive Union lines stood, was entirely covered with trees at the time of the battle.', 'the wooded rocky knoll beside the Wheatfield',
     BATTLE, {'canopy': 'woods'}, {'gz': 'The Wheatfield', 'r_m': 350, 'class': 'woods', 'k': 1}, G + 'Placed on the nearest wood within 350 m of the Wheatfield point: the knoll is named, not outlined.'),
    ('VC-LIB-035', 'woodlot', 'documented', 'formed among the scatter- ing trees at the base of Little Kound Top',
     'Bachelder (1889): on 2 July Crawford\'s division formed among the scattering trees at the base of Little Round Top.', 'scattered trees at the base of Little Round Top',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'canopy': 'scattered'}, {'gz': 'Little Round Top', 'r_m': 420, 'class': 'any', 'area': True}, G + 'The saved text reads "Kound" for "Round" and hyphenates "scatter- ing".'),
    ('VC-LIB-036', 'ground', 'documented', 'through an opening which then existed between Benner\'s Hill and Culp\'s Hill, but which is now closed by the growth of trees',
     'Bachelder (1889): in 1863 there was an opening between Benner\'s Hill and Culp\'s Hill, which the growth of trees has since closed.', 'the opening between Benner\'s Hill and Culp\'s Hill',
     {'to': '1863-07-02', 'basis': 'the evening of 2 July'}, {'canopy': 'open'}, None, G + 'Not placed: no outline of the opening exists.'),
    ('VC-LIB-037', 'woodlot', 'documented', 'in the open grove on that part of Seminary Ridge lying directly opposite the Peach Orchard',
     'Bachelder: the battle of 2 July began in the open grove on the part of Seminary Ridge lying directly opposite the Peach Orchard.', 'the open grove on Seminary Ridge opposite the Peach Orchard',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'understory': 'open'}, {'gz': "Pitzer's Woods", 'r_m': 220, 'class': 'woods', 'k': 1}, G + '"Open grove" is read as a grove with open ground between its trees; placed on the nearest wood to Pitzer\'s Woods, so the undergrowth is marked as placed by a rule.'),
    ('VC-LIB-038', 'crop', 'documented', 'This crest is cleared and culti- vated on its eastern slope',
     'Bachelder: the eastern slope of Seminary Ridge was cleared and cultivated.', 'Seminary Ridge, eastern slope', BATTLE, {'canopy': 'open'}, {'gz': 'Seminary Ridge', 'r_m': 800, 'class': 'field', 'area': True}, G + 'No crop is named.'),
    ('VC-LIB-039', 'woodlot', 'documented', 'while the western side is generally covered with a growth of hardy timber, forming an admirable cover for troops',
     'Bachelder: the western side of Seminary Ridge was generally covered with a growth of hardy timber, an admirable cover for troops.', 'Seminary Ridge, western side', BATTLE, {'canopy': 'hardy_timber'}, {'gz': 'Seminary Ridge', 'r_m': 800, 'class': 'woods', 'area': True}, G),
    ('VC-LIB-040', 'thicket', 'documented', 'sought the cover of a rocky ravine filled with trees and undergrowth',
     'Bachelder: on 3 July Wilcox\'s men sought the cover of a rocky ravine filled with trees and undergrowth.', 'a rocky ravine of trees and undergrowth',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'understory': 'thick'}, None, G + 'Not placed: the ravine is not named (it may be the Plum Run bottom).'),
]


def main():
    out, bad = [], []
    for cid, kind, tier, quote, says, feat, when, about, anchor, note in C:
        got = None
        for key in ORDER:
            try:
                r = srcs.verify('WS9:' + key, quote)
            except Exception as e:   # a text that is not saved is a failed lookup, said as such
                continue
            if r.get('ok'):
                got = key
                break
        if got is None:
            bad.append(cid)
            continue
        d = {'id': cid, 'src': 'WS9:' + got, 'quote': quote, 'tier': tier, 'kind': kind, 'says': says, 'feature': feat, 'when': when, 'note': note}
        if about:
            d['about'] = about
        if anchor:
            d['anchor'] = anchor
        out.append(d)
    for b in bad:
        print('NOT FOUND in any edition:', b)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    import collections
    print(len(out), 'claims written;', dict(collections.Counter(c['src'] for c in out)))
    return 1 if bad else 0


# ---------------------------------------------------------------------------------------------------------------------------------------------------------------- other eyewitness books of the library
# (id, source, kind, tier, quote, says, feature, when, about, anchor, note); a later account says so in its note. Written to claims_library_more.json.
OUT2 = os.path.join(HERE, 'claims_library_more.json')
LATE = 'An account written later and relayed as printed; the original was not seen. '
C2 = [
    ('VC-LIB-041', 'HOSPSCENES-1864', 'crop', 'documented', 'Though late in the season, the harvest was just yielding to the sickle.',
     'The Patriot Daughters of Lancaster, travelling to Gettysburg in July 1863, wrote that, though late in the season, the harvest was just yielding to the sickle in the country through which they came.', 'the harvest beginning in the country about Gettysburg',
     {'from': '1863-07-08', 'to': '1863-07-16', 'basis': 'the narrative gives no day; the party was at the hospitals by the middle of July'}, {'stage': 'harvest_beginning'}, None,
     'A book of 1864 by the party. It says nothing of the crop: the grain of the district was wheat, oats and rye, cut in turn.'),
    ('VC-LIB-042', 'HOSPSCENES-1864', 'orchard', 'documented', 'the stately hills looked down on orchards laden with their crimson frnit',
     'The same party saw the hills looking down on orchards laden with crimson fruit in the country on the way to Gettysburg in July 1863.', 'fruit on the orchards of the country about Gettysburg',
     {'from': '1863-07-08', 'to': '1863-07-16', 'basis': 'the narrative gives no day'}, {'fruit': 'crimson'}, None, 'The saved text reads "frnit" for "fruit". The fruit is not named.'),
    ('VC-LIB-043', 'HOSPSCENES-1864', 'damage', 'documented', 'Houses demolished, fences destroyed, tall forest trees mowed down like so many stalks of hemp',
     'The same party wrote of the field after the battle: houses demolished, fences destroyed, tall forest trees mowed down like stalks of hemp.', 'tree damage on the field after the battle',
     {'from': '1863-07-08', 'to': '1863-07-16', 'basis': 'after the battle'}, {'damage': 'trees_felled_by_fire'}, None, 'A figure of speech about the field as a whole: no place and no share are given.'),
    ('VC-LIB-044', 'TPIERCE-1889', 'crop', 'documented', 'We see a man thrown high in the air and come down in a wheat field close by.',
     'Tillie Pierce, at the Weikert farm on the afternoon of 2 July, saw a man thrown by an exploding caisson come down in a wheat field close by.', 'a wheat field by the Weikert house',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'crop': 'wheat'}, {'farm': 'g_weikert', 'r_m': 260, 'class': 'field', 'k': 1},
     LATE + 'A girl of fifteen at the time, published in 1889. Placed on the nearest field cell within 260 m of the farmstead.'),
    ('VC-LIB-045', 'TPIERCE-1889', 'orchard', 'documented', 'The orchard and space around the buildings were covered with the shattered and dying, and the barn became more and more crowded.',
     'Tillie Pierce: on the evening of 2 July the orchard and the space round the buildings of the Weikert farm were covered with the wounded.', 'the orchard of the Weikert farm',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {}, {'farm': 'g_weikert', 'r_m': 220, 'class': 'orchard', 'k': 1}, LATE + 'Placed on the nearest orchard within 220 m of the farmstead.'),
    ('VC-LIB-050', 'OH-8TH-1889', 'orchard', 'documented', 'Our position was at first in an orchard, in the rdar of some farm buildings',
     'The history of the Eighth Ohio: on the morning of 2 July the regiment stood in an orchard in the rear of some farm buildings behind the line of batteries in Ziegler\'s Grove.', 'an orchard behind farm buildings by Ziegler\'s Grove',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {}, None, LATE + 'The saved text reads "rdar" for "rear". Not placed: the farm is not named (it may be the Brien farm).'),
    ('VC-LIB-046', 'OH-8TH-1889', 'woodlot', 'documented', 'posted among some scattered oak trees, on the brow of the ridge, being a part of Ziegler\'s i^rove',
     'The history of the Eighth Ohio: its line of batteries stood among scattered oak trees on the brow of the ridge, part of Ziegler\'s Grove, on 2 July.', 'oak trees of Ziegler\'s Grove',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'species_named': ['oak']}, {'gz': "Ziegler's Grove", 'r_m': 220, 'class': 'woods', 'k': 1}, LATE + 'Names oak for the grove; the trees were scattered.'),
    ('VC-LIB-047', 'OH-8TH-1889', 'woodlot', 'documented', 'the wood clad outline of Gulps\' Hill',
     'The history of the Eighth Ohio: from Ziegler\'s Grove on 2 July the outline of Culp\'s Hill was wood-clad.', 'Culp\'s Hill wood-clad',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'canopy': 'woods'}, {'poly': 'LC-WOOD-0001'}, LATE + 'The saved text reads "Gulps\'" for "Culp\'s".'),
    ('VC-LIB-048', 'MA-BURIAL-1863', 'damage', 'documented', 'The torn earth and the scarred or broken tree tell you of the flight and explosion of those fearful missiles',
     'The committee on the burial of the Massachusetts dead wrote in 1863 of the torn earth and the scarred or broken trees on the field.', 'scarred and broken trees on the field',
     {'basis': 'autumn 1863'}, {'damage': 'scarred_timber'}, None, 'The report of the committee, 1863; no place and no share are given.'),
    ('VC-LIB-049', 'VT-GB-1914', 'crop', 'documented', 'placed on a knoll in a wheat field 1,300 yards in front, suddenly opened fire',
     'The history of the Vermont brigade, quoting Wainwright: about three p.m. on 2 July two Confederate batteries on a knoll in a wheat field 1,300 yards in front of the left brow of Cemetery Hill suddenly opened fire.', 'a wheat field with a knoll, 1,300 yards in front of Cemetery Hill',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'crop': 'wheat'}, None, LATE + 'Not placed: the knoll is not named.'),
]


SAID = 'Printed in a later book or journal and relayed as printed; the original was not seen. '
C2 += [
    ('VC-LIB-051', 'MEADE-LL-v2', 'crop', 'documented', 'For four hundred yards of this distance there were woods on the north side, and a wheat field on the south side of the road.',
     'A description of the ground of the Third Corps quoted in the Life and Letters of General Meade: along four hundred yards of the cross-road from Plum Run toward the Peach Orchard there were woods on the north side and a wheat field on the south side.', 'woods north and a wheat field south of the Wheatfield Road',
     {'from': '1863-07-01', 'to': '1863-07-03'}, {'crop': 'wheat'}, {'poly': 'LC-FIELD-0001'}, SAID + 'The speaker is not named in the saved text. The road is the one on the northern side of the Wheatfield.'),
    ('VC-LIB-052', 'MN-1ST-1916', 'crop', 'documented', 'The crest of the ridge between Little Round Top and Cemetery Hill had been cleared for agriculture, and comprised several cultivated fields, occasional groves of small timber',
     'The history of the First Minnesota: the crest of the ridge between Little Round Top and Cemetery Hill had been cleared for agriculture and held several cultivated fields and occasional groves of small timber.', 'the crest of Cemetery Ridge: cultivated fields and small groves',
     {'from': '1863-07-01', 'to': '1863-07-03'}, {}, {'gz': 'Cemetery Ridge', 'r_m': 900, 'class': 'field', 'area': True}, SAID + 'No crop is named.'),
    ('VC-LIB-053', 'MN-1ST-1916', 'woodlot', 'documented', 'through a low ground of woods, a wheat- field, and then another piece of woods, towards Little Round Top',
     'The history of the First Minnesota: Birney\'s division was bent back through a low ground of woods, a wheat-field and another piece of woods toward Little Round Top.', 'woods, the Wheatfield, woods',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'crop': 'wheat'}, {'poly': 'LC-FIELD-0001'}, SAID + 'The Wheatfield is not named.'),
    ('VC-LIB-054', 'SHSP-05', 'crop', 'documented', 'advanced rapidly in line of battle across a cornfield which lay between us and the base of the hill',
     'A Confederate brigade (the Maryland Line) wrote that on the evening of 2 July it advanced across a cornfield that lay between it and the base of Culp\'s Hill, then waded Rock Creek.', 'a cornfield at the base of Culp\'s Hill',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'crop': 'corn'}, {'farm': 'culp', 'r_m': 500, 'class': 'field', 'k': 1}, SAID + 'Printed in the Southern Historical Society Papers. Placed on the nearest field cell within 500 m of the Culp farmstead: the passage does not say whose cornfield it was.'),
    ('VC-LIB-055', 'SHSP-05', 'woodlot', 'documented', 'The ground was rough, and the woods so thick that their generals did not realize till morning what they had gained.',
     'Howard, as quoted in the Southern Historical Society Papers: the ground at Culp\'s Hill was rough and the woods so thick that the Confederate generals did not realize until morning what they had gained.', 'Culp\'s Hill: thick woods in the night of 2 July',
     {'from': '1863-07-02', 'to': '1863-07-03'}, {'canopy': 'thick_woods'}, {'gz': "Culp's Hill", 'r_m': 520, 'class': 'woods', 'area': True}, SAID + 'Said of the night: how thick the woods were is not measured, and no undergrowth value is set from it. Bachelder calls the same hill a heavy open growth (VC-LIB-028): the two are carried as they are.'),
    ('VC-LIB-056', 'SHSP-05', 'damage', 'documented', 'the trees, as cut off, lopped down, or shivered, were still there; stumps and trees were perforated with holes where leaden balls had since been dug out',
     'A visitor to Culp\'s Hill, quoted in the Southern Historical Society Papers, saw trees cut off, lopped down or shivered, and stumps and trees perforated where bullets had since been dug out.', 'Culp\'s Hill: shivered and perforated trees',
     {'basis': 'seen some years after the battle'}, {'damage': 'scarred_timber'}, {'gz': "Culp's Hill", 'r_m': 520, 'class': 'woods', 'area': True}, SAID),
    ('VC-LIB-057', 'SHSP-04', 'woodlot', 'documented', 'the country was open and that I could march through an open woodland pas- ture around Round Top',
     'Hood\'s account (Southern Historical Society Papers): his scouts reported on 2 July that the country was open and that he could march through an open woodland pasture around Round Top.', 'open woodland pasture round the Round Tops',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {}, {'gz': 'Big Round Top', 'r_m': 1000, 'class': 'woods', 'area': True}, SAID + '"Open woodland pasture" is read as grazed woodland with open ground between the trees; no undergrowth value is set from it, and it is not what the park report says of the forest of Big Round Top.'),
    ('VC-LIB-058', 'ALEXANDER-1907', 'thicket', 'documented', 'opened fire from some undergrowth and brushwood along a small ravine',
     'Alexander (1907): on 3 July Perry\'s Florida brigade halted and opened fire from some undergrowth and brushwood along a small ravine.', 'undergrowth and brushwood along a small ravine',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'understory': 'thick'}, None, 'A memoir of 1907 by the Confederate artillery officer who watched. Not placed: the ravine is not named (the same ravine as in VC-LIB-040).'),
    ('VC-LIB-059', 'ALEXANDER-1907', 'woodlot', 'documented', 'Both flanks presented precipitous and rocky fronts, screened from artillery fire by forest growth',
     'Alexander (1907): the two flanks of the Union line, Culp\'s Hill and Round Top, presented precipitous, rocky fronts screened from artillery fire by forest growth.', 'forest growth on Culp\'s Hill and Round Top',
     {'from': '1863-07-01', 'to': '1863-07-03'}, {'canopy': 'forest'}, {'gz': "Culp's Hill", 'r_m': 520, 'class': 'woods', 'area': True}, 'A memoir of 1907. It speaks of both flanks: Culp\'s Hill and Round Top.'),
]


def main2():
    out, bad = [], []
    for cid, key, kind, tier, quote, says, feat, when, about, anchor, note in C2:
        try:
            r = srcs.verify('WS9:' + key, quote)
        except Exception:
            r = {'ok': False}
        if not r.get('ok'):
            bad.append(cid)
            continue
        d = {'id': cid, 'src': 'WS9:' + key, 'quote': quote, 'tier': tier, 'kind': kind, 'says': says, 'feature': feat, 'when': when, 'note': note}
        if about:
            d['about'] = about
        if anchor:
            d['anchor'] = anchor
        out.append(d)
    for b in bad:
        print('NOT FOUND:', b)
    json.dump(out, open(OUT2, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    print(len(out), 'claims written to', OUT2)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main() | main2())
