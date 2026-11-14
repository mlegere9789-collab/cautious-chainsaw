"""More claims from the Official Records (Series I, vol. 27) that the first reading did not use: a field, an orchard or a wood the writer names and describes.

    python -I tools/bt/vegetation/gen_or27_more.py

Found by a second pass over the three parts for a vegetation noun beside a word of state (standing, thick, open, heavy, covered, cleared ...) and a place of the field, keeping
what the first reading's claims did not already hold; each passage was read in its report, and the quote is copied from the saved text (a misreading of the text layer kept).
verify_claims.py looks every quote up again in its report.
"""
import os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))
import srcs  # noqa: E402

OUT = os.path.join(HERE, 'claims_or27_more.json')

# (id, report, kind, tier, quote, says, feature, when, about, anchor, note)
C = [
    ('VC-OR-030', 'OR27-1-R039', 'crop', 'documented', 'where they were lying down concealed from view in a wheat-field',
     'Captain Cook, 1 July: marching by the flank near the Seminary the regiment was fired on by the enemy, about 30 rods off, lying down concealed from view in a wheat-field: the wheat stood high enough to hide a man lying down.',
     'a wheat-field near the Seminary on 1 July', {'from': '1863-07-01', 'to': '1863-07-01'}, {'crop': 'wheat', 'stage': 'standing'}, {'gz': 'Seminary Ridge', 'r_m': 600, 'class': 'field', 'area': True},
     'The field is not outlined: the claim bears on the fields about the Seminary. A rod is 5.5 yards.'),
    ('VC-OR-031', 'OR27-1-R028', 'orchard', 'documented', 'some five or six acres of orchard and wooded grounds, the rest of the ridge being cleared',
     'Hunt: on the ridge near the house and barn south of the Cashtown road there were some five or six acres of orchard and wooded ground, the rest of the ridge being cleared.', 'the orchard and wood by the house on the ridge north of the Seminary',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {}, {'farm': 'mcpherson', 'r_m': 350, 'class': 'orchard', 'k': 1}, 'Placed on the nearest orchard within 350 m of the McPherson farmstead.'),
    ('VC-OR-032', 'OR27-1-R071', 'orchard', 'documented', 'a house and large bam, with an apple orchard and some 5 acres of wood to the south of it; the rest of the ridge is cleared',
     'Wainwright: south of the point where the Cashtown pike crosses the ridge stood a house and large barn with an apple orchard and some 5 acres of wood to the south of it; the rest of the ridge was cleared; the first skirmish, where Reynolds fell, was round this house and wood.', 'an apple orchard and 5 acres of wood by the house on the ridge',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {'species_named': ['apple']}, {'farm': 'mcpherson', 'r_m': 350, 'class': 'orchard', 'k': 1}, 'The saved text reads "bam" for "barn". Placed on the nearest orchard within 350 m of the McPherson farmstead.'),
    ('VC-OR-033', 'OR27-1-R071', 'woodlot', 'documented', 'a house and large bam, with an apple orchard and some 5 acres of wood to the south of it; the rest of the ridge is cleared',
     'The same passage of Wainwright for the wood: some 5 acres of wood lay to the south of the house and orchard on the ridge, the rest of the ridge being cleared.', 'the 5 acres of wood south of the house on the ridge',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {'canopy': 'woods'}, {'farm': 'mcpherson', 'r_m': 350, 'class': 'woods', 'k': 1}, 'The saved text reads "bam" for "barn". Placed on the nearest wood within 350 m of the McPherson farmstead.'),
    ('VC-OR-034', 'OR27-1-R280', 'woodlot', 'documented', 'on the crest of a hill covered with heavy timber. The ground was of a rough and rocky nature',
     'Colonel Price: his regiment\'s position, some 200 or 300 yards northeast of the pike, was on the crest of a hill covered with heavy timber, the ground rough and rocky.', 'a hill of heavy timber east of the pike',
     {'from': '1863-07-02', 'to': '1863-07-03'}, {'canopy': 'heavy_timber', 'ground': 'rocky'}, {'gz': "Culp's Hill", 'r_m': 700, 'class': 'woods', 'area': True}, 'The sentence does not name the hill; the brigade stood on the right of the line (Culp\'s Hill and the ground about it), so the passage is carried as evidence for the neighbourhood.'),
    ('VC-OR-035', 'OR27-1-R262', 'crop', 'documented', 'I was ordered in a corn-field behind a stone wall, below the Evergreen Cemetery',
     'Major Ledig, 1 July evening: his regiment was ordered into a corn-field behind a stone wall below the Evergreen Cemetery.', 'a corn-field near Cemetery Hill on 1 July',
     {'from': '1863-07-01', 'to': '1863-07-01'}, {'crop': 'corn'}, {'gz': 'Cemetery Hill', 'r_m': 350, 'class': 'field', 'k': 1}, '"Below" is not a bearing: placed on the nearest field cell within 350 m of Cemetery Hill, so the crop of that cell is inferred, not documented.'),
    ('VC-OR-036', 'OR27-1-R057', 'ground', 'documented', 'across the open fields between my position and the highway from Gettysburg to Emmits- burg',
     'Colonel Gates, 3 July: the Confederate infantry, debouching from the orchard and woods on his right centre, crossed open fields between his position on Cemetery Ridge and the Emmitsburg road.', 'open fields between Cemetery Ridge and the Emmitsburg road',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'canopy': 'open'}, {'gz': 'The Angle', 'r_m': 600, 'class': 'field', 'area': True}, 'No crop is named.'),
    ('VC-OR-037', 'OR27-1-R334', 'orchard', 'documented', 'take position in a thick peach orchard',
     'Captain Ames, 2 July: at 3 p.m. he was ordered to move forward about 800 yards and take position in a thick peach orchard.', 'the thick peach orchard on the Emmitsburg road',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'orchard': 'thick'}, {'poly': 'LC-ORCH-0206'}, '"Thick" is the writer\'s word for the trees of the orchard; no spacing is given.'),
    ('VC-OR-038', 'OR27-2-R539', 'thicket', 'documented', 'under cover of a high ledge of rocks, thickly covered with stunted undergrowth',
     'General Wright, 2 July: the enemy passed a strong body of infantry under cover of a high ledge of rocks thickly covered with stunted undergrowth, which fell away from the gorge in rear of their batteries.', 'a rocky ledge thick with stunted undergrowth',
     {'from': '1863-07-02', 'to': '1863-07-02'}, {'understory': 'thick'}, None, 'Not placed: the ledge is not named (it lies between the Confederate right and the Union centre, west of Cemetery Ridge).'),
    ('VC-OR-039', 'OR27-2-R488', 'crop', 'documented', 'our left iBank being harassed by the enemy\'s sharpshooters, posted in a wheat-field and wood',
     'General Walker (the Stonewall brigade), 3 July, on the north side of the Hanover road: his left flank was harassed by sharpshooters posted in a wheat-field and wood.', 'a wheat-field and wood by the Hanover road on 3 July',
     {'from': '1863-07-03', 'to': '1863-07-03'}, {'crop': 'wheat'}, None, 'The saved text reads "iBank" for "flank". Not placed: east of the loaded ground.'),
]


def main():
    out, bad = [], []
    for cid, rep, kind, tier, quote, says, feat, when, about, anchor, note in C:
        r = srcs.verify('OR27', quote, report=rep)
        if not r.get('ok'):
            bad.append(cid)
            continue
        d = {'id': cid, 'src': 'OR27', 'report': rep, 'quote': quote, 'tier': tier, 'kind': kind, 'says': says, 'feature': feat, 'when': when, 'note': note}
        if about:
            d['about'] = about
        if anchor:
            d['anchor'] = anchor
        out.append(d)
    for b in bad:
        print('NOT FOUND:', b)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    print(len(out), 'claims written to', OUT)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
