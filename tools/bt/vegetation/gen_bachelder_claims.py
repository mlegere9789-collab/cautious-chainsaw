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
    ('VC-LIB-040', 'thicket', 'documented', 'sought the cover of a rocky ravine filled with trees and imdergrowth',
     'Bachelder: on 3 July Wilcox\'s men sought the cover of a rocky ravine filled with trees and undergrowth.', 'a rocky ravine of trees and undergrowth',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'understory': 'thick'}, None, G + 'The saved text reads "imdergrowth". Not placed: the ravine is not named (it may be the Plum Run bottom).'),
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


if __name__ == '__main__':
    sys.exit(main())
