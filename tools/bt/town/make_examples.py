#!/usr/bin/env python3
"""Write docs/battle-theatre/town/evidence/EXAMPLES.jsonl: real rows in the format of the contract, every quote taken from a local text and located by the
validator's own matcher (so the offsets and pages are the ones the validator checks). The examples are formats to copy, not the evidence of a group: a group pass
writes its own rows (it may reuse these after reading the passages itself).

    python3 tools/bt/town/make_examples.py          # rewrite the file, then validate it
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
import validate_evidence as V  # noqa: E402

CTX = V.Ctx(ROOT)
OUT = os.path.join(CTX.evid, 'EXAMPLES.jsonl')
PCB = 'tmp/library/web/nps/NPS-CLI-PCB/NPS-CLI-PCB.txt'


def locate(path, quote):
    raw, skel, omap, marks = CTX.text(path)
    st = V.match_quote(skel, omap, quote)
    assert len(st) == 1, (path, quote[:60], st)
    pg = None
    for pos, n in marks:
        if pos <= st[0]:
            pg = n
    return st[0], pg


def cite(source, path, quote, part, page=None, mode_ocr=None):
    off, pg = locate(path, quote)
    d = {'source': source, 'part': part, 'page': pg if page is None else page, 'quote': quote, 'text_offset': off}
    if page is not None:
        d['page'] = page
    if page is None and pg is None:
        d['page'] = None
        d['page_note'] = 'the text has no page marks'
    return d


def main():
    rows = []
    n = {}

    def nid(g):
        n[g] = n.get(g, 0) + 1
        return '%s.%04d' % (g, 9000 + n[g])

    def B(g, bid, name, frm, **kw):
        r = {'row': nid(g), 'type': 'building', 'group': g, 'building': bid, 'name': name, 'declared_from': frm}
        r.update(kw)
        rows.append(r)
        return r['row']

    def F(g, bid, field, value, tier, kind, describes, c=None, **kw):
        r = {'row': nid(g), 'type': 'field', 'group': g, 'building': bid, 'field': field, 'value': value, 'tier': tier, 'evidence_kind': kind, 'describes': describes}
        if c:
            r.update(c)
        r.update(kw)
        rows.append(r)
        return r['row']

    def S(g, bid, where, query, outcome, note=''):
        r = {'row': nid(g), 'type': 'search', 'group': g, 'building': bid, 'where': where, 'query': query, 'outcome': outcome, 'at': '2026-11-14'}
        if note:
            r['note'] = note
        rows.append(r)
        return r['row']

    ERR = 'tmp/library/web/nps/NPS-CLI-ERR/NPS-CLI-ERR.txt'
    G1 = 'farms-emmitsburg-road'
    kl = 'STR-KLINGEL-HOUSE1'
    B(G1, kl, 'Daniel Klingel farm house', 'basemap', links={'structures': ['bld-klingle-farm'], 'basemap': [kl]})
    F(G1, kl, 'existed_july_1863', 'stood', 'documented', 'text', 'july_1863',
      cite('NPS-CLI-ERR', ERR, 'On July 2, men of Carr’s Union brigade fortified themselves within the house during Confederate attacks', 'Emmitsburg Road Ridge CLI, Buildings and Structures'))
    F(G1, kl, 'storeys', 2, 'inferred', 'text', 'after_battle_to_1869',
      cite('NPS-CLI-ERR', ERR, 'by the mid-1860s the farmhouse was a two-story log building with an attached kitchen on the rear', 'Emmitsburg Road Ridge CLI, Commemorative Period'),
      basis='early real estate advertisements of the mid-1860s, as the report states, describe a two-story log house; the same report dates the house to c.1850, so the two-story log block predates the battle; no statement of July 1863 itself is read')
    F(G1, kl, 'walls', {'material': 'log'}, 'inferred', 'text', 'after_battle_to_1869',
      cite('NPS-CLI-ERR', ERR, 'by the mid-1860s the farmhouse was a two-story log building with an attached kitchen on the rear', 'Emmitsburg Road Ridge CLI, Commemorative Period'),
      basis='a log house of the mid-1860s that the survey dates to c.1850; whether the log walls were weatherboarded in 1863 is not stated (the report says the log walls were exposed after the chinking was knocked out on 2 July)')
    fp = F(G1, kl, 'footprint', {'w': 26, 'd': 21, 'unit': 'ft'}, 'inferred', 'text', 'later',
           cite('NPS-CLI-ERR', ERR, 'The building is a two-story log construction that measures 26 by 21 feet on a stone foundation with a shingle covered roof', 'Emmitsburg Road Ridge CLI, Evaluation of Buildings'),
           basis='the main block of the c.1850 house as measured in the 2004 survey after the removal of the 1870s addition and of an undated lean-to; the lean-to may be earlier than 1863, so the 1863 outline is a probable, not a certain, reading')
    F(G1, kl, 'outbuildings', ['hog pen'], 'inferred', 'text', 'after_battle_to_1869',
      cite('NPS-CLI-ERR', ERR, 'Other features described on the property included a well at the door of the farmhouse, a spring, a hog pen, new fencing', 'Emmitsburg Road Ridge CLI, Commemorative Period'),
      basis='the mid-1860s advertisements name a hog pen; when it was built is not stated', detail='the same advertisements name a spring, a well, new fencing and an orchard')
    F(G1, kl, 'state', 'fortified', 'documented', 'text', 'july_1863',
      cite('NPS-CLI-ERR', ERR, 'On July 2, men of Carr’s Union brigade fortified themselves within the house during Confederate attacks, knocking out the chinking in the then exposed log walls', 'Emmitsburg Road Ridge CLI, Evaluation of Buildings'),
      state='fortified', window='day', transition='instant', detail='chinking knocked out of the log walls to fire from the house', **{'from': '1863-07-02', 'to': '1863-07-02'})
    F(G1, kl, 'state', 'other', 'documented', 'text', 'july_1863',
      cite('NPS-CLI-ERR', ERR, 'On July 3, the building was used to shield and screen Confederate artillery in the field just west of the house', 'Emmitsburg Road Ridge CLI, Evaluation of Buildings'),
      state='other', window='day', transition='none', detail='screened Confederate artillery in the field west of the house', **{'from': '1863-07-03', 'to': '1863-07-03'})
    F(G1, kl, 'roof', {'form': 'gable'}, 'plausible-procedural', 'none', 'undated', rule='GR-ROOF-GABLE-30')
    s1 = S(G1, kl, 'NPS-CLI-ERR', 'regular expression Klingle|Klingel followed within 300 characters of one sentence by window or windows, case-insensitive, whole text', 'not_found',
           'zero matches in the saved text (read 2026-11-14)')
    F(G1, kl, 'openings', None, 'open gap', 'none', 'undated', searched=[s1])

    # Henry Spangler farmstead (the farm the product's geometry STR-SPANGLER_H-* belongs to) and its burned barn
    hb = 'STR-SPANGLER_H-BARN1'
    B(G1, hb, 'Henry Spangler barn (burned in the battle)', 'basemap', links={'basemap': [hb], 'structures': ['bld-spangler-farm']}, see_also=['farms-culps-hill-baltimore-pike'])
    idA = F(G1, hb, 'identity', 'Henry Spangler farmstead: between the Confederate and Union battle lines on Seminary and Cemetery Ridges', 'documented', 'text', 'before_1863',
            cite('NPS-CLI-PCB', PCB, 'Henry Spangler Farmstead. (Contributing Site) This farmstead was located between the Confederate and Union battle lines on Seminary and Cemetery Ridges.', 'Pickett\'s Charge Battlefield CLI, Buildings and Structures'))
    F(G1, hb, 'state', 'burned', 'documented', 'text', 'july_1863',
      cite('NPS-CLI-PCB', PCB, 'from July 2-4, 1863. Because of its exposed position little permanent military occupation occurred. During the battle the barn was burned.', 'Pickett\'s Charge Battlefield CLI, Buildings and Structures'),
      state='burned', window='period', transition='instant', detail='the day of the fire is not stated; the passage dates the fighting at the farmstead to 2-4 July', **{'from': '1863-07-02', 'to': '1863-07-04'})

    # George Spangler farm (XI Corps hospital) and the identity conflict of the record bld-spangler-farm
    G2 = 'farms-culps-hill-baltimore-pike'
    gs = 'bld-spangler-farm'
    B(G2, gs, 'Spangler farm (record bld-spangler-farm: the details of the plan row are those of George Spangler\'s farm)', 'structures.json', links={'structures': [gs], 'hospitals': ['H-06']})
    c1 = F(G2, gs, 'identity', 'George Spangler farm on the Hospital Road: the 2nd Division, 11th Corps hospital', 'documented', 'text', 'july_1863',
           cite('NPS-COMMON-PRIDE-2', 'tmp/library/web/nps/NPS-COMMON-PRIDE-2/NPS-COMMON-PRIDE-2.txt', 'in charge of the 2nd Division, 11th Corps Union hospital at the George Spangler . farm', 'Common Pride, vol. 2'))
    c2 = F(G2, gs, 'identity', 'the geometry of the product for this record (STR-SPANGLER_H-*) is the Henry Spangler farmstead between Seminary and Cemetery Ridges, a different farm', 'documented', 'text', 'before_1863',
           cite('NPS-CLI-PCB', PCB, 'Henry Spangler Farmstead. (Contributing Site) This farmstead was located between the Confederate and Union battle lines on Seminary and Cemetery Ridges.', 'Pickett\'s Charge Battlefield CLI, Buildings and Structures'),
           conflicts=[{'with': 'PLACEHOLDER', 'nature': 'which farm the record and the hospital H-06 are drawn on'}])
    # make the conflict symmetric
    for r in rows:
        if r['row'] == c1:
            r['conflicts'] = [{'with': c2, 'nature': 'which farm the record and the hospital H-06 are drawn on'}]
        if r['row'] == c2:
            r['conflicts'] = [{'with': c1, 'nature': 'which farm the record and the hospital H-06 are drawn on'}]

    # McPherson barn
    G3 = 'farms-seminary-mcpherson-herr'
    mb = 'STR-MCPHERSON-BARN1'
    B(G3, mb, 'McPherson barn', 'basemap', links={'basemap': [mb], 'structures': ['bld-mcpherson-farm']})
    F(G3, mb, 'existed_july_1863', 'stood', 'documented', 'text', 'july_1863',
      cite('NPS-CLI-1STDAY', 'tmp/library/web/nps/NPS-CLI-1STDAY/NPS-CLI-1STDAY.txt', 'The McPherson Barn has been restored to its battle-era exterior appearance and is the only battleera building on park property within the 1st Corps battlefield.', 'First Day CLI, Buildings and Structures'),
      detail='the report calls the barn a battle-era building; its restored exterior is not evidence of the 1863 form without a text that dates each feature')

    # the court house: an Official Records report (page model or27: part = record id)
    G5 = 'town-public-buildings'
    ch = 'bld-courthouse'
    B(G5, ch, 'Adams County Courthouse', 'structures.json', links={'structures': [ch], 'basemap': ['STR-TOWN-COURTHOUSE']})
    F(G5, ch, 'tower_or_cupola', 'a cupola in the steeple of the court-house, reached by an observer', 'documented', 'text', 'july_1863',
      cite('OR27-1', 'tmp/library/or27/cu31924077699761_djvu.txt', 'From the cupola in the steeple of the court-house at Gettysburg I was an eye-witness of the movements of the rebel army', 'OR27-1-R033', page=272),
      detail='report of Col. Henry A. Morrow, 24th Michigan Infantry, a prisoner in the town; the day of each view is not given in this sentence (the next sentences name the attack of Friday afternoon)')

    # the college: Jacobs 1864 and a photograph
    G4 = 'town-college'
    ph = 'bld-pennsylvania-hall'
    B(G4, ph, 'Pennsylvania Hall, Pennsylvania College', 'structures.json', links={'structures': [ph], 'basemap': ['STR-TOWN-PENN_HALL']})
    JAC = 'tmp/library/ws9/JACOBS-1864__notesonrebelinva00jaco_djvu.txt'
    jq = 'During the day General Lee had reconnoitred our position from the College cupola'
    F(G4, ph, 'state', 'observation_post', 'inferred', 'text', 'july_1863',
      cite('JACOBS-1864', JAC, jq, 'The third day', page=41),
      basis='the paragraph follows the cannonade that began at seven minutes past 1 p.m. on the third day of the narrative, so "the day" is read as 3 July; the page prints no date in the sentence',
      state='observation_post', window='day', transition='none', detail='General Lee at the cupola of the College building', **{'from': '1863-07-03', 'to': '1863-07-03'})
    F(G4, ph, 'state', 'hospital', 'documented', 'text', 'july_1863',
      cite('JACOBS-1864', JAC, 'although, being a hospital, that edifice, by all principles of military honor, should have been free from every hostile use', 'The third day', page=41),
      state='hospital', window='unknown', transition='none', detail='a hospital when the cupola was used; the dates of the hospital are not given in this sentence', **{'from': None, 'to': None})
    img = 'tmp/photomatch/loc/ppmsca.35100_v.jpg'
    sha = V.hashlib.sha256(open(os.path.join(ROOT, img), 'rb').read()).hexdigest() if os.path.exists(os.path.join(ROOT, img)) else None
    imr = {'source': 'LOC-PHOTO', 'item': '2014646151 (ppmsca.35100), "Pennsylvania College, Gettysburg. August, 1863"', 'file': img,
           'observation': 'a long pedimented building with a square cupola rising above its roof, seen across a field; a two-storey house with a low hipped roof stands to its left; a post-and-rail style fence crosses the foreground',
           'viewed': True, 'caption_names_building': False}
    if sha:
        imr['sha256'] = sha
    F(G4, ph, 'tower_or_cupola', 'a square cupola above the roof of the pedimented building of the campus', 'inferred', 'image', 'after_battle_to_1869', image_ref=imr,
      basis='the photograph is titled Pennsylvania College and shows one pedimented building with a cupola; that this is Pennsylvania Hall rests on the building being the large one of the campus, which the HABS record pa0009 is to confirm')
    with open(OUT, 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    print('wrote', os.path.relpath(OUT, ROOT), len(rows), 'rows')


if __name__ == '__main__':
    main()
