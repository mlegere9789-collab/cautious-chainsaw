"""Turn the dated extract sheets of the National Park Service landscape inventories into vegetation claim records.

    python -I tools/bt/vegetation/gen_nps_claims.py [path/to/extracts.jsonl]

Input: GOVERNANCE/horde/ws-web/nps/extracts/extracts.jsonl (every quote there was cut from the saved NPS text by that task). This script only
SELECTS and RE-SHAPES rows; it does not trust them: verify_claims.py looks every quote up again in the saved text of the original report
(NPS:<ID>) and a claim whose quote is not found is dropped. Rows kept: the passage says something about the 1863 state of a field, crop,
orchard, woodlot, thicket, grove or single tree (`use_for_1863` = direct), plus the few later rows that say what was NOT there in 1863
or what is a replanting (those carry kind `ground` and say so; they are the reason a modern tree may not be drawn as an 1863 one).
The hand-written claim files claims_*.json are not touched.
"""
import os, sys, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
DEFAULT_IN = os.path.join(ROOT, 'docs', 'battle-theatre', 'GOVERNANCE', 'horde', 'ws-web', 'nps', 'extracts', 'extracts.jsonl')
OUT = os.path.join(HERE, 'claims_nps_extracts.json')

FARM_OF = {  # repository id of the extract sheet -> farm key of the structures layer (build_vegetation.FARMS)
    'bld-sherfy-farm': 'sherfy', 'FEN-sherfy-orchard': 'sherfy', 'bld-klingle-farm': 'klingel', 'bld-trostle-farm': 'trostle', 'bld-codori-farm': 'codori',
    'bld-mcmillan-farm': 'mcmillan', 'bld-bliss-farm': 'bliss', 'bld-rogers-house': 'rogers', 'bld-wentz-farm': 'wentz', 'bld-mcpherson-farm': 'mcpherson',
}
KEEP = re.compile(r'wheat|corn|oats|crop|field|meadow|pasture|orchard|wood|thicket|grove|oak|tree|vegetation|brush|scrub|timothy|grass|garden|hedgerow|willow|evergreen|shrub|hay', re.I)
DROP_FEATURE = re.compile(r'burial|breastwork|buildings? lost|barn$|house$|reinterment|memorial|tower|fence|wall|road|avenue|quarry', re.I)


# Rows that passed the keyword filter but are about fences, houses, hospitals, burials, ownership or a claimant's trade, not about what grew where (they belong to the structures
# layer or to nobody here); read one by one and left out. The list is the record of that reading.
EXCLUDE = set('''VC-NPSX-CLI-PCB-p049-09 VC-NPSX-CLI-PCB-p050-01 VC-NPSX-CLI-PCB-p073-03 VC-NPSX-CLI-PCB-p095-01 VC-NPSX-CLI-PCB-p117-01 VC-NPSX-CLI-ERR-p040-01 VC-NPSX-CLI-ERR-p063-02 VC-NPSX-CLI-1STDAY-p058-04 VC-NPSX-CLI-1STDAY-p060-10 VC-NPSX-CLR-1STDAY-p068-01 VC-NPSX-CLR-1STDAY-p349-02 VC-NPSX-CLR-1STDAY-p349-03 VC-NPSX-CLR-1STDAY-p463-01 VC-NPSX-CLR-1STDAY-p379-01 VC-NPSX-CLR-ROT-V1-p175-01 VC-NPSX-CLR-ROT-V1-p178-02 VC-NPSX-CLR-ROT-V1-p180-01 VC-NPSX-CLR-ROT-V1-p360-01 VC-NPSX-CLR-ROT-V1-p406-01 VC-NPSX-CLR-ROT-V2-p103-02 VC-NPSX-CLR-ROT-V2-p104-01 VC-NPSX-CLR-ROT-V2-p104-02 VC-NPSX-CLR-ROT-V2-p143-01 VC-NPSX-CLR-ROT-V1-p171-01 VC-NPSX-CLI-ERR-p079-02 VC-NPSX-CLI-ERR-p080-01 VC-NPSX-CLI-1STDAY-p038-02'''.split())


def kind_of(r):
    s = (r['feature'] + ' ' + r['claim']).lower()
    if re.search(r'orchard|fruit garden|fruit trees', s):
        return 'orchard'
    if re.search(r'thicket|scrub|brush|riparian|willow', s):
        return 'thicket'
    if re.search(r'woods|woodlot|grove|forest|oak', s):
        return 'woodlot'
    if re.search(r'large (oak|tree)|individual tree|witness tree', s):
        return 'tree'
    if re.search(r'wheat|corn|oats|timothy|crop|field|meadow|pasture|garden|hay|grass', s):
        return 'crop'
    return 'ground'


def when_of(r):
    sd = r.get('state_date') or ''
    m = re.match(r'(1863-07-0[1-4])', sd)
    if m:
        return {'from': m.group(1), 'to': m.group(1)}
    if sd.startswith('1863-07') or sd.startswith('1863'):
        return {'from': '1863-07-01', 'to': '1863-07-03', 'basis': 'the report dates the feature to the battle'}
    return {'basis': sd}


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    rows = [json.loads(l) for l in open(src, encoding='utf-8')]
    out, seen = [], set()
    for r in rows:
        if r.get('source_id') not in ('NPS-CLI-PCB', 'NPS-CLI-ERR', 'NPS-CLI-1STDAY', 'NPS-CLI-LRT', 'NPS-CLI-LANDSCAPE', 'NPS-CLR-1STDAY', 'NPS-CLR-LRT', 'NPS-CLR-ROT-V1', 'NPS-CLR-ROT-V2'):
            continue
        txt = r['feature'] + ' ' + r['claim']
        if not KEEP.search(txt):
            continue
        direct = r.get('use_for_1863') == 'direct'
        if not direct and not re.search(r'replant|not (part|there)|did not exist|non-?historic', txt, re.I):
            continue
        if direct and DROP_FEATURE.search(r['feature']) and not re.search(r'orchard|field|woods|crop', r['feature'], re.I):
            continue
        k = kind_of(r)
        tier = 'documented' if str(r.get('tier_proposed', '')).startswith('documented') else 'inferred'
        cid = 'VC-NPSX-' + r['xid'].replace('NPSX-', '')
        if cid in seen or cid in EXCLUDE:
            continue
        seen.add(cid)
        farm = next((FARM_OF[k2] for k2 in r.get('repo_keys') or [] if k2 in FARM_OF), None)
        c = {'id': cid, 'src': 'NPS:' + r['source_id'], 'quote': r['quote'], 'tier': tier, 'kind': k if direct else 'ground', 'says': r['claim'], 'feature': r['feature'],
             'when': when_of(r) if direct else {'basis': r.get('state_date')}, 'xid': r['xid'], 'pdf_page': r.get('pdf_page'), 'printed_page': r.get('printed_page')}
        if farm:
            c['anchor'] = {'farm': farm, 'r_m': 500, 'class': {'orchard': 'orchard', 'woodlot': 'woods', 'thicket': 'woods', 'crop': 'field'}.get(k), 'area': True}
        out.append(c)
    json.dump(out, open(OUT, 'w', encoding='utf-8'), indent=0, ensure_ascii=False)
    import collections
    print(len(out), 'claims written to', OUT, dict(collections.Counter(c['kind'] for c in out)))


if __name__ == '__main__':
    main()
