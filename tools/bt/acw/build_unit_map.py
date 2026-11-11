#!/usr/bin/env python3
"""Links Gettysburg kit units (docs/battle-theatre/kit/kit_specs.json) to the ACW mod's uniform variants, using the mod's own tables (decoded Gettysburg_{Union,Confed}_Uniforms + unit_variant part lists).
EVERY link is a lead-derived inference (acw-leads ACW-L03/L04/L06/L07): the join is the regiment token at the end of the mod key (hc_us_1_inf_19IN -> US.19IN). It is not a historical source:
the mod's table says what the modders chose, not what the regiment wore (gap EG-FIG-0011). Unmatched units on either side are listed, never guessed.  python3 -I build_unit_map.py --uniforms D --variants F --kit F --manifest F --out F"""
import argparse, collections, json, re

def parts_of(strings):
    out = collections.defaultdict(list)
    for s in strings:
        if '/' not in s: continue
        p = s.replace('\\', '/').split('/')
        if len(p) >= 5 and p[0].lower() == 'variantmodels' and p[1].lower() == 'unitparts':
            slot = p[3].lower() if p[2].lower() in ('acw', 'euro') else p[2].lower()
            out[slot].append('/'.join(p[2:]))
    return dict(out)

def main():
    ap = argparse.ArgumentParser()
    for k in ('uniforms', 'variants', 'kit', 'manifest', 'out'): ap.add_argument('--' + k, required=True)
    a = ap.parse_args()
    kit = json.load(open(a.kit))['units']; variants = json.load(open(a.variants)); man = json.load(open(a.manifest)); cleared = {k for k in (m['group'] + '/' + m['variant'] for m in man['included'])}
    rows = []
    for side, f in (('US', 'Gettysburg_Union_Uniforms.json'), ('CS', 'Gettysburg_Confed_Uniforms.json')):
        d = json.load(open(a.uniforms.rstrip('/') + '/' + f))
        for art, grp, var, key in d['data']: rows.append(dict(side=side, art_carriage_variant=art, corps_group=grp, uniform_variant=var, mod_key=key, token=key.split('_')[-1]))
    by = collections.defaultdict(list)
    for r in rows: by[(r['side'], r['token'])].append(r)
    links = []; unmatched_kit = []; used = set()
    for uid, u in sorted(kit.items()):
        side, token = uid.split('.', 1)
        c = by.get((side, token), [])
        if not c: unmatched_kit.append(uid); continue
        for r in c: used.add(r['mod_key'])
        link = dict(kit_unit=uid, kit_name=u['name'], army=u['army'], branch=u['branch'], candidates=[])
        for r in c:
            roles = {}
            for k, ss in variants.items():
                if k.startswith(r['uniform_variant'] + '.') and k.endswith('.unit_variant'): roles[k[len(r['uniform_variant']) + 1:-len('.unit_variant')]] = parts_of(ss)
            torso_tex = sorted({x for ps in roles.values() for x in ps.get('torso', []) if x.lower().endswith('/texture')})
            swatch = sorted({m.group(1) + '/' + m.group(2) for t in torso_tex for m in [re.search(r'torso/([^/]+)/([^/]+)/texture$', t, re.I)] if m and m.group(1) + '/' + m.group(2) in cleared})
            link['candidates'].append(dict(mod_key=r['mod_key'], corps_group=r['corps_group'], uniform_variant=r['uniform_variant'], art_carriage_variant=r['art_carriage_variant'], roles=roles, base_game_slots=sorted({sl for ps in roles.values() for sl, xs in ps.items() if any(x.lower().startswith('euro/') for x in xs)}), cleared_swatches=swatch))
        link['ambiguous'] = len(c) > 1; link['label'] = 'lead-derived inference (join on regiment token; not a historical source)'; link['tier'] = 'plausible-procedural'; link['gap'] = 'EG-FIG-0011'
        links.append(link)
    unmatched_mod = sorted({r['mod_key'] for r in rows} - used)
    out = dict(schema='acw-unit-map-1', label='LEAD-DERIVED: the ACW mod tables are not historical evidence (acw-leads); every link below is an inference by regiment token and carries gap EG-FIG-0011', tier='plausible-procedural',
               mod_rows=len(rows), kit_units=len(kit), linked_kit_units=len(links), ambiguous_links=sum(1 for l in links if l['ambiguous']), unmatched_kit_units=unmatched_kit, unmatched_mod_keys_count=len(unmatched_mod), unmatched_mod_keys=unmatched_mod, links=links)
    json.dump(out, open(a.out, 'w'), indent=1); print('links', len(links), 'ambiguous', out['ambiguous_links'], 'unmatched kit', len(unmatched_kit), 'unmatched mod keys', len(unmatched_mod))
if __name__ == '__main__': main()
